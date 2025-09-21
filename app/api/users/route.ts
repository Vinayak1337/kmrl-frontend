import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
// Using JSON grants in DB

import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    const session = token ? verifySession(token) : null;
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: 'ADMIN' | 'MANAGER';
      department?: string | null;
      grants?: Array<{ dept?: string; type?: string; actions?: string[] }>;
    };

    const errors: string[] = [];
    if (!body.name || !body.name.trim()) errors.push('name is required');
    if (!body.email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(body.email)) errors.push('valid email is required');
    if (!body.password || body.password.length < 6) errors.push('password must be >= 6 chars');
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'MANAGER';

    if (errors.length) return NextResponse.json({ errors }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: body.email!.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password!, 10);
    const isAdmin = role === 'ADMIN';
    const sanitizedGrants = (body.grants || [])
      .map((g) => ({
        dept: typeof g.dept === 'string' ? g.dept.toUpperCase() : undefined,
        type: typeof g.type === 'string' ? g.type.toUpperCase() : undefined,
        actions: Array.isArray(g.actions) ? g.actions.filter(Boolean) : [],
      }))
      .filter((g) => g.dept && g.type && g.actions.length);

    const user = await prisma.user.create({
      data: {
        name: body.name!.trim(),
        email: body.email!.toLowerCase(),
        passwordHash,
        role,
        department: body.department?.trim() || null,
        grants: isAdmin ? [] : sanitizedGrants,
      },
    });

    // Audit log
    await prisma.userAudit.create({
      data: {
        actorId: session.sub,
        targetUserId: user.id,
        action: 'CREATE_USER',
        details: { role, department: user.department, grants: sanitizedGrants },
      },
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    console.error('Create user error', error);
    return NextResponse.json({ error: 'Unable to create user' }, { status: 500 });
  }
}

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      grants: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ users }, { status: 200 });
}
