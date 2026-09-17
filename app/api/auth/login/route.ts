export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/authenticate';

import { AUTH_COOKIE, signSession } from '@/lib/auth';
// grants computed directly from DB JSON

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await authenticate(email, password);
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const token = signSession(user);

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Unable to login at this time' }, { status: 500 });
  }
}
