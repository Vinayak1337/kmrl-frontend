import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE, signSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'MANAGER',
      permissions: user.permissions ?? [],
      department: user.department ?? null,
      docTypes: user.docTypes ?? [],
    });

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

