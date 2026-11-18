import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { after } from 'next/server';
import { send } from '@vercel/queue';
import { getCollection, getMongo } from '@/lib/mongo';
import { prisma } from '@/lib/prisma';
import { canIngestDocument } from '@/lib/documentPermissions';
import type { JwtUser } from '@/lib/auth';
import { getAuthSecret } from '@/lib/authSecret';
import { ingestDocuments, type IngestPayload } from '@/lib/ingest/handleIngest';

import { classificationView, validateClassification } from '@/lib/ingest/classification';
import type { ClassificationValues, DocumentRecord } from '@/types/documents';

const COLLECTION = 'ingest_jobs';
const LEASE_MS = 6 * 60 * 1000;
const TTL_MS = 24 * 60 * 60 * 1000;
const FILE_LIMIT = 3.2 * 1024 * 1024;
type Job = { id: string; owner: string; documentId: string; status: 'queued' | 'processing' | 'failed' | 'completed'; payload?: IngestPayload; correction?: { value: ClassificationValues; note?: string }; error?: string; leaseUntil?: Date; leaseToken?: string; expiresAt: Date; createdAt: Date };

let indexesReady: Promise<unknown> | undefined;
async function jobs() {
  const collection = await getCollection<Job>(COLLECTION);
  indexesReady ??= collection.createIndexes([
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    { key: { id: 1 }, unique: true },
  ]).catch(error => {
    indexesReady = undefined;
    throw error;
  });
  await indexesReady;
  return collection;
}

export async function currentUser(id: string): Promise<JwtUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return { sub: user.id, email: user.email, name: user.name, role: user.role as JwtUser['role'], department: user.department, grants: Array.isArray(user.grants) ? user.grants as JwtUser['grants'] : [] };
}

export function validJobPayload(body: IngestPayload): boolean {
  const docs = body?.documents;
  if (!Array.isArray(docs) || docs.length !== 1) return false;
  const doc = docs[0];
  if (!doc || typeof doc.content !== 'string' || !doc.content || !['pdf', 'text', 'html', 'image', 'doc'].includes(doc.type)) return false;
  const optionalFields = [body.title, body.language, body.department, body.documentType, doc.filename];
  if (optionalFields.some(value => value !== undefined && typeof value !== 'string')) return false;
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.some(tag => typeof tag !== 'string'))) return false;
  const size = doc.type === 'text' || doc.type === 'html' ? Buffer.byteLength(doc.content) : Buffer.byteLength(doc.content, 'base64');
  return size <= FILE_LIMIT && Buffer.byteLength(JSON.stringify(body)) <= 4_500_000;
}

function deliverySignature(id: string) {
  return createHmac('sha256', getAuthSecret()).update(`docsetu-ingest:${id}`).digest('hex');
}

export function verifyJobDelivery(message: unknown): message is { id: string; signature: string } {
  if (!message || typeof message !== 'object') return false;
  const { id, signature } = message as Record<string, unknown>;
  if (typeof id !== 'string' || typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(deliverySignature(id), 'hex'));
}

export async function createJob(owner: string, payload: IngestPayload) {
  const now = new Date();
  const job: Job = { id: randomUUID(), owner, documentId: `doc-${randomUUID()}`, status: 'queued', payload, createdAt: now, expiresAt: new Date(now.getTime() + TTL_MS) };
  await (await jobs()).insertOne(job);
  return job;
}
export async function correctionStatus(id: string) {
  const job = await (await jobs()).findOne({ id, correction: { $exists: true }, expiresAt: { $gt: new Date() } }, {
    projection: { id: 1, status: 1, error: 1, correction: 1, _id: 0 },
  });
  return job ? { id: job.id, status: job.status, error: job.error, target: job.correction?.value, note: job.correction?.note } : {
    id, status: 'failed' as const, error: 'This run expired. Save your correction again.',
  };
}

export async function queueCorrection(owner: string, documentId: string, payload: unknown, note: string | undefined) {
  const collection = await jobs();
  const docs = await getCollection<DocumentRecord>();
  const { client } = await getMongo();
  return client.withSession(session => session.withTransaction(async () => {
    const doc = await docs.findOne({ id: documentId }, { session });
    if (!doc) return { status: 404, error: 'Document not found' } as const;
    const current = classificationView(doc);
    const value = payload === undefined ? current.effective : validateClassification(payload, current.effective);
    if (!value) return { status: 400, error: 'Choose valid classification values and up to 20 tags of 60 characters each.' } as const;
    if (doc.classificationReprocessId) {
      const active = await collection.findOne({
        id: doc.classificationReprocessId, expiresAt: { $gt: new Date() }, status: { $in: ['queued', 'processing'] },
      }, { session });
      if (active) return { status: 409, error: 'A correction is already rebuilding this document.' } as const;
    }
    if (payload !== undefined && !note && JSON.stringify(value) === JSON.stringify(current.effective)) return { status: 200, current } as const;
    if (!doc.raw?.type || !doc.raw.content) {
      return { status: 422, error: 'The original source is unavailable. Upload the original to rebuild this document.' } as const;
    }
    const now = new Date();
    const id = randomUUID();
    const correction = { value, ...(note ? { note } : {}) };
    await docs.updateOne({ id: documentId }, { $set: { classificationReprocessId: id } }, { session });
    await collection.insertOne({ id, owner, documentId, status: 'queued', correction, createdAt: now, expiresAt: new Date(now.getTime() + TTL_MS) }, { session });
    return { status: 202, current, id, correction } as const;
  }));
}

export async function findJob(id: string, owner: string) {
  return (await jobs()).findOne({ id, owner, expiresAt: { $gt: new Date() } }, { projection: { payload: 0 } });
}
export async function dispatchJob(id: string) {
  if (process.env.VERCEL) {
    await send('document-ingest', { id, signature: deliverySignature(id) }, { retentionSeconds: 86400 });
  } else {
    after(async () => { try { await processJob(id); } catch (error) { console.error('[ingest job] local delivery failed', error); } });
  }
}
export async function retryJob(id: string, owner: string) {
  const collection = await jobs();
  const result = await collection.updateOne({ id, owner, status: 'failed', expiresAt: { $gt: new Date() } }, { $set: { status: 'queued' }, $unset: { error: '' } });
  return result.modifiedCount === 1;
}
export async function markDispatchFailed(id: string) {
  await (await jobs()).updateOne({ id, status: 'queued' }, { $set: { status: 'failed', error: 'Could not schedule processing. Please try again.' } });
}
export async function processJob(id: string) {
  const collection = await jobs();
  const token = randomUUID();
  const now = new Date();
  const job = await collection.findOneAndUpdate({ id, expiresAt: { $gt: now }, $or: [{ status: 'queued' }, { status: 'processing', leaseUntil: { $lt: now } }] }, { $set: { status: 'processing', leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS) } }, { returnDocument: 'after' });
  if (!job) {
    const existing = await collection.findOne({ id, status: 'processing', expiresAt: { $gt: now } });
    if (existing) throw new Error('Job is already being processed');
    return;
  }
  try {
    const user = await currentUser(job.owner);
    let response: Response;
    if (job.correction) {
      const doc = await (await getCollection<DocumentRecord>()).findOne({ id: job.documentId });
      if (doc?.classificationAppliedId === id) {
        response = new Response(null, { status: 200 });
      } else if (user?.role !== 'ADMIN' || doc?.classificationReprocessId !== id || !doc.raw?.content) {
        response = Response.json({ error: 'The source or permission to rebuild this document is no longer available.' }, { status: 403 });
      } else {
        const { value, note } = job.correction;
        response = await ingestDocuments(user, {
          title: doc.title, language: doc.language,
          department: value.department ?? undefined, documentType: value.documentType ?? undefined, tags: value.tags,
          documents: [{ type: doc.raw.type, content: doc.raw.content, filename: doc.title }],
        }, { documentId: job.documentId, correction: { jobId: id, before: classificationView(doc).effective, value, note } });
      }
    } else if (!user || !job.payload || !canIngestDocument(user, job.payload.department, job.payload.documentType)) {
      response = Response.json({ error: 'You no longer have permission to add this document.' }, { status: 403 });
    } else {
      response = await ingestDocuments(user, job.payload, { documentId: job.documentId });
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      await collection.updateOne({ id, leaseToken: token }, { $set: { status: 'failed', error: response.status < 500 && typeof data.error === 'string' ? data.error : 'The document could not be processed. Please try again.' }, $unset: { leaseToken: '', leaseUntil: '' } });
      return;
    }
    await collection.updateOne({ id, leaseToken: token }, { $set: { status: 'completed' }, $unset: { payload: '', leaseToken: '', leaseUntil: '', error: '' } });
  } catch (error) {
    // Leave the lease in place: another delivery can recover after it expires.
    throw error;
  }
}
