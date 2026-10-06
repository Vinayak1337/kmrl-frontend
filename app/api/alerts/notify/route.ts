export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { AlertError, recordAlertNotification } from '@/lib/alerts/service';

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await recordAlertNotification(session, body), { status: 201 });
  } catch (error) {
    if (error instanceof AlertError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[alerts] notify error:', error);
    return NextResponse.json({ error: 'Could not record the notification' }, { status: 500 });
  }
}
