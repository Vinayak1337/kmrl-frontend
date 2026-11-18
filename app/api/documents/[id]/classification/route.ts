export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, isDocumentAccessible } from '@/lib/auth';
import { getCollection, getMongo } from '@/lib/mongo';
import { classificationView, validateClassification } from '@/lib/ingest/classification';
import type { DocumentRecord, DocumentNodeRecord, ClassificationValues } from '@/types/documents';

async function currentSession() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return token ? verifySession(token) : null;
}
function nodeSearch(node: DocumentNodeRecord, value: ClassificationValues) {
  return [node.title, node.titleNormalized, node.summary, ...(node.keyPoints || []), ...(node.actionableItems || []), ...(node.criticalFlags || []), ...(node.crossDepartments || []), ...(node.keywords || []), value.department, value.documentType, ...value.tags, node.content].filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}
function documentSearch(doc: DocumentRecord, nodes: DocumentNodeRecord[], value: ClassificationValues) {
  return [doc.title, doc.fullSummary, doc.overallMd, value.department, value.documentType, ...value.tags, ...(doc.keywords || []), ...nodes.map(n => `${n.title || ''} ${n.summary || ''}`)].filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Context) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = await (await getCollection<DocumentRecord>()).findOne({ id }, {
    projection: { metadata: 1, classificationSuggestion: 1, classificationHistory: 1 },
  });
  if (!doc || !isDocumentAccessible(session, doc)) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  return NextResponse.json({ ...classificationView(doc), canEdit: session.role === 'ADMIN' });
}

export async function PATCH(request: NextRequest, ctx: Context) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload: unknown = await request.json().catch(() => null);
  const { id } = await ctx.params;
  try {
    const { client } = await getMongo();
    const docs = await getCollection<DocumentRecord>();
    const nodes = await getCollection<DocumentNodeRecord>(process.env.MONGODB_NODES_COLLECTION || 'document_nodes');
    const mongoSession = client.startSession();
    try {
      return await mongoSession.withTransaction(async () => {
        const doc = await docs.findOne({ id }, { session: mongoSession });
        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        const current = classificationView(doc);
        const value = validateClassification(payload, current.effective);
        if (!value) return NextResponse.json({ error: 'Choose valid classification values and up to 20 tags of 60 characters each.' }, { status: 400 });
        if (JSON.stringify(value) === JSON.stringify(current.effective)) {
          return NextResponse.json({ ...current, canEdit: true });
        }

        const storedNodes = await nodes.find({ docId: id }, { session: mongoSession }).toArray();
        const existingNodes = storedNodes.length ? storedNodes : (doc.nodes || []);
        const entry = { by: session.sub, at: new Date(), before: current.effective, after: value };
        const metadata = {
          department: value.department ?? undefined,
          documentType: value.documentType ?? undefined,
          tags: value.tags,
        };
        if (storedNodes.length) {
          await nodes.bulkWrite(storedNodes.map(node => ({
            updateOne: {
              filter: { docId: id, _id: node._id },
              update: { $set: { ...metadata, 'meta.searchableText': nodeSearch(node, value) } },
            },
          })), { session: mongoSession });
        }
        await docs.updateOne({ id }, {
          $set: {
            'metadata.department': metadata.department,
            'metadata.documentType': metadata.documentType,
            'metadata.tags': metadata.tags,
            'metadata.updatedAt': entry.at,
            searchableText: documentSearch(doc, existingNodes, value),
            ...(doc.nodes ? {
              nodes: doc.nodes.map(node => ({
                ...node, ...metadata, meta: { ...node.meta, searchableText: nodeSearch(node, value) },
              })),
            } : {}),
          },
          $push: { classificationHistory: entry },
        }, { session: mongoSession });

        return NextResponse.json({
          effective: value, suggestion: current.suggestion, history: [...current.history, entry], canEdit: true,
        });
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (error) {
    console.error('[classification] transaction failed', error);
    return NextResponse.json({ error: 'Failed to update classification' }, { status: 500 });
  }
}
