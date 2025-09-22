import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

async function requireAdmin() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session || session.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id },
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
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ user }, { status: 200 });
}

type UpdateData = {
  name?: string;
  email?: string;
  department?: string | null;
  role?: 'ADMIN' | 'MANAGER';
  grants?: Array<{ dept: string; type: string; actions: string[] }>;
  passwordHash?: string;
};

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await ctx.params;

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: 'ADMIN' | 'MANAGER';
    department?: string | null;
    grants?: Array<{ dept?: string; type?: string; actions?: string[] }>;
  };

  const data: UpdateData = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.email === 'string') data.email = body.email.toLowerCase();
  if (typeof body.department === 'string') data.department = body.department.trim();
  if (body.role === 'ADMIN' || body.role === 'MANAGER') data.role = body.role;
  if (Array.isArray(body.grants)) {
    const grants = body.grants
      .map((g) => {
        const dept = typeof g.dept === 'string' ? g.dept.toUpperCase() : '';
        const type = typeof g.type === 'string' ? g.type.toUpperCase() : '';
        const actions = Array.isArray(g.actions) ? g.actions.filter(Boolean) : [];
        return { dept, type, actions };
      })
      .filter((g) => g.dept && g.type && g.actions.length) as Array<{ dept: string; type: string; actions: string[] }>;
    data.grants = grants;
  }
  if (typeof body.password === 'string' && body.password.length >= 6) {
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  // If role becomes ADMIN, enforce full permission
  if (data.role === 'ADMIN') {
    data.grants = [];
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    await prisma.userAudit.create({
      data: {
        actorId: session.sub,
        targetUserId: id,
        action: 'UPDATE_USER',
        details: { changes: Object.keys(data) },
      },
    });
    return NextResponse.json({ id: updated.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await ctx.params;

  try {
    await prisma.user.delete({ where: { id } });
    await prisma.userAudit.create({
      data: {
        actorId: session.sub,
        targetUserId: id,
        action: 'DELETE_USER',
      },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 400 });
  }
}
