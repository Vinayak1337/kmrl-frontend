import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { JwtUser } from './auth';

/** One credential verifier for web cookies and native bearer sessions. */
export async function authenticate(email: unknown, password: unknown): Promise<JwtUser | null> {
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() ||
    email.length > 254 || !password || password.length > 1024) return null;
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  const raw = user as unknown as { grants?: JwtUser['grants'] };
  return {
    sub: user.id, email: user.email, name: user.name, role: user.role as JwtUser['role'],
    department: user.department ?? null, permissions: [], docTypes: [],
    grants: Array.isArray(raw.grants) ? raw.grants : [],
  };
}
