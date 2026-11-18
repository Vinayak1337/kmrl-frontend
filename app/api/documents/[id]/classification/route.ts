import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, isDocumentAccessible } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { classificationView } from '@/lib/ingest/classification';
import { correctionStatus, dispatchJob, markDispatchFailed, queueCorrection } from '@/lib/ingest/jobs';
import { correctionTargets, deriveCorrectionScope, updateClassification } from '@/lib/ingest/corrections';
import type { DocumentRecord } from '@/types/documents';

export const runtime = 'nodejs';
export const maxDuration = 300;
const noStore = { 'Cache-Control': 'no-store' };
type Context = { params: Promise<{ id: string }> };

async function currentSession() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_request: NextRequest, ctx: Context) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = await (await getCollection<DocumentRecord>()).findOne({ id }, {
    projection: { metadata: 1, classificationSuggestion: 1, classificationHistory: 1, classificationReprocessId: 1, 'nodes.nodeId': 1, 'nodes.title': 1, 'nodes.pageRange': 1 },
  });
  if (!doc || !isDocumentAccessible(session, doc)) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  const canEdit = session.role === 'ADMIN';
  const [processing, targets] = await Promise.all([
    canEdit && doc.classificationReprocessId ? correctionStatus(doc.classificationReprocessId) : null,
    canEdit ? correctionTargets(doc, id) : undefined,
  ]);
  if (!process.env.VERCEL && processing?.status === 'queued') await dispatchJob(processing.id);
  return NextResponse.json({ ...classificationView(doc), canEdit, processing, targets }, { headers: noStore });
}

export async function PATCH(request: NextRequest, ctx: Context) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = await request.json().catch(() => null);
  if (payload?.note) return NextResponse.json({ error: 'Use Save correction to rebuild a summary.' }, { status: 400 });
  const { id } = await ctx.params;
  try {
    const result = await updateClassification(id, session.sub, payload);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ...result.current, canEdit: true }, { headers: noStore });
  } catch (error) {
    console.error('[classification] could not save metadata', error);
    return NextResponse.json({ error: 'Could not save classification.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Context) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await ctx.params;
  const payload = await request.json().catch(() => null);
  const note = typeof payload?.note === 'string' ? payload.note.trim() : '';
  if (!note || note.length > 1000) return NextResponse.json({ error: 'Enter a correction note of up to 1,000 characters.' }, { status: 400 });
  try {
    const doc = await (await getCollection<DocumentRecord>()).findOne({ id }, {
      projection: { 'nodes.nodeId': 1, 'nodes.title': 1, 'nodes.pageRange': 1 },
    });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    const targets = await correctionTargets(doc, id);
    const scope = deriveCorrectionScope(note, payload.target, targets);
    if (!scope) return NextResponse.json({ error: 'Name a page number or choose a section or the document brief.' }, { status: 422 });
    const result = await queueCorrection(session.sub, id, undefined, note, scope);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    if (result.status === 200) return NextResponse.json({ ...result.current, canEdit: true, targets }, { headers: noStore });
    try { await dispatchJob(result.id); } catch { await markDispatchFailed(result.id); }
    return NextResponse.json({
      ...result.current, canEdit: true, targets, processing: await correctionStatus(result.id),
    }, { status: 202, headers: noStore });
  } catch (error) {
    console.error('[classification] correction could not be scheduled', error);
    return NextResponse.json({ error: 'Could not schedule the correction.' }, { status: 500 });
  }
}
