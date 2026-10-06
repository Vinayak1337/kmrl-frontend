export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { listDeadlineAlerts } from '@/lib/alerts/service';

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const alerts = await listDeadlineAlerts(session);
    return NextResponse.json({ alerts, total: alerts.length, documents: new Set(alerts.map(a => a.documentId)).size, emailDelivery: 'pending' });
  } catch (error) {
    console.error('[alerts] list error:', error);
    return NextResponse.json({ error: 'Could not load deadlines' }, { status: 500 });
  }
}
