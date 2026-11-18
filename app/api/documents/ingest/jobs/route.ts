import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { canIngestDocument } from '@/lib/documentPermissions';
import { createJob, currentUser, dispatchJob, markDispatchFailed, validJobPayload } from '@/lib/ingest/jobs';
import type { IngestPayload } from '@/lib/ingest/handleIngest';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: IngestPayload;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid document' }, { status: 400 }); }
  if (!validJobPayload(body)) return NextResponse.json({ error: 'Choose one supported document under 3.2 MB.' }, { status: 400 });
  const user = await currentUser(session.sub);
  if (!user || !canIngestDocument(user, body.department, body.documentType)) return NextResponse.json({ error: 'You do not have permission to add this document type to this team.' }, { status: 403 });
  const job = await createJob(user.sub, body);
  try { await dispatchJob(job.id); } catch { await markDispatchFailed(job.id); }
  return NextResponse.json({ id: job.id }, { status: 202 });
}
