import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, isDocumentAccessible } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { dispatchJob, markDispatchFailed, queueCorrection } from '@/lib/ingest/jobs';
import type { DocumentRecord } from '@/types/documents';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid feedback.' }, { status: 400 });
  }
  const { type = 'general', message = '', reprocess = true } = body;
  if (typeof message !== 'string' || message.length > 1000 || typeof type !== 'string' || type.length > 80 || typeof reprocess !== 'boolean') {
    return NextResponse.json({ error: 'Enter a feedback message of up to 1,000 characters.' }, { status: 400 });
  }

  try {
    const docs = await getCollection<DocumentRecord>();
    const doc = await docs.findOne({ id }, { projection: { metadata: 1 } });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (!isDocumentAccessible(session, doc) || (reprocess && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (reprocess) {
      const result = await queueCorrection(session.sub, id, undefined, message.trim() || undefined);
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      if (result.status === 202) {
        try { await dispatchJob(result.id); } catch { await markDispatchFailed(result.id); }
        return NextResponse.json({ ok: true, reprocessed: false, jobId: result.id }, { status: 202 });
      }
    }

    await docs.updateOne({ id }, {
      $push: { feedback: { id: randomUUID(), type, message, createdAt: new Date(), createdBy: session.sub, status: 'recorded' } },
    });
    return NextResponse.json({ ok: true, reprocessed: false });
  } catch (error) {
    console.error('[feedback] failed to submit feedback', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
