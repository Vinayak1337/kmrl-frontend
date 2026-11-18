import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { dispatchJob, findJob, markDispatchFailed, retryJob } from '@/lib/ingest/jobs';

export const runtime = 'nodejs';
async function owner() { const token = (await cookies()).get(AUTH_COOKIE)?.value; return token ? verifySession(token)?.sub : undefined; }
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const user = await owner(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params; const job = await findJob(id, user);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  // Local development has no broker; a later status request can recover a lost process.
  if (!process.env.VERCEL && (job.status === 'queued' || (job.status === 'processing' && job.leaseUntil && job.leaseUntil < new Date()))) await dispatchJob(id);
  return NextResponse.json({ id: job.id, status: job.status, documentId: job.status === 'completed' ? job.documentId : undefined, error: job.error }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(_request: Request, context: Context) {
  const user = await owner(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  if (!await findJob(id, user)) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (!await retryJob(id, user)) return NextResponse.json({ error: 'This job cannot be retried yet.' }, { status: 409 });
  try { await dispatchJob(id); } catch { await markDispatchFailed(id); }
  return NextResponse.json({ id }, { status: 202 });
}
