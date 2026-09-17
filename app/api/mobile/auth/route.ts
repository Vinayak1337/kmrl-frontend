import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/authenticate';
import { signSession } from '@/lib/auth';

export const runtime = 'nodejs';

/** Native-only transport; existing web login continues using HttpOnly cookies. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const user = await authenticate(body.email, body.password);
    if (!user) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    const expiresIn = 60 * 60 * 24 * 7;
    return NextResponse.json({ token: signSession(user, { expiresIn }), user,
      expiresAt: Date.now() + expiresIn * 1000 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    console.error('Native sign-in failed');
    return NextResponse.json({ error: 'Sign-in is unavailable. Please try again.' }, { status: 503 });
  }
}
