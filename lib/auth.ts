import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

export const AUTH_COOKIE = 'kmrl_session';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'dev-secret-change-me';
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production');
  }
  return secret;
}

export type JwtUser = {
  sub: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER';
  permissions?: string[]; // legacy, may be undefined
  department?: string | null;
  docTypes?: string[]; // legacy, may be undefined
  grants?: Array<{ dept: string; type: string; actions: string[] }>;
};

export function signSession(payload: JwtUser, options?: { expiresIn?: number }) {
  const secret: Secret = getAuthSecret();
  const expiresIn = options?.expiresIn ?? 60 * 60 * 24 * 7;
  const signOptions: SignOptions = { expiresIn };
  const token = jwt.sign(payload as object, secret, signOptions);
  return token;
}

export function verifySession(token: string): JwtUser | null {
  try {
    const secret = getAuthSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtUser & { iat?: number; exp?: number };
    return {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissions: decoded.permissions || [],
      department: decoded.department ?? null,
      docTypes: decoded.docTypes || [],
      grants: decoded.grants || [],
    };
  } catch {
    return null;
  }
}
