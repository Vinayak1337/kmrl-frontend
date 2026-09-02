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

export function buildDocumentAccessFilter(
  session: JwtUser,
  target: 'documents' | 'nodes' = 'documents'
): Record<string, unknown> {
  if (session.role === 'ADMIN') {
    return {};
  }
  const grants = Array.isArray(session.grants) ? session.grants : [];
  const readGrants = grants.filter(
    (g) => g.dept && g.type && Array.isArray(g.actions) && g.actions.includes('read')
  );
  if (readGrants.length === 0) {
    return { _id: '__NO_ACCESS__' };
  }

  const toTitle = (s: string) =>
    s.toLowerCase().replace(/(^|[_\s-])(\w)/g, (_, p1, c) => (p1 ? ' ' : '') + c.toUpperCase());

  const or: Array<Record<string, string>> = [];
  const deptField = target === 'documents' ? 'metadata.department' : 'department';
  const typeField = target === 'documents' ? 'metadata.documentType' : 'documentType';

  for (const g of readGrants) {
    const deptVariants = Array.from(new Set([g.dept, g.dept.toLowerCase(), toTitle(g.dept), g.dept.toUpperCase()]));
    const typeVariants = Array.from(new Set([g.type, g.type.toLowerCase(), g.type.toUpperCase()]));
    for (const dv of deptVariants) {
      for (const tv of typeVariants) {
        or.push({
          [deptField]: dv,
          [typeField]: tv,
        });
      }
    }
  }
  return or.length > 0 ? { $or: or } : { _id: '__NO_ACCESS__' };
}

export function isDocumentAccessible(
  session: JwtUser,
  doc: { metadata?: { department?: string; documentType?: string }; department?: string; documentType?: string }
): boolean {
  if (session.role === 'ADMIN') return true;
  const dept = (doc.metadata?.department || doc.department || '').toLowerCase().trim();
  const dtype = (doc.metadata?.documentType || doc.documentType || '').toLowerCase().trim();
  if (!dept && !dtype) return false;

  const grants = Array.isArray(session.grants) ? session.grants : [];
  return grants.some((g) => {
    if (!g.dept || !g.type || !Array.isArray(g.actions) || !g.actions.includes('read')) {
      return false;
    }
    const gDept = g.dept.toLowerCase().trim();
    const gType = g.type.toLowerCase().trim();
    const deptMatch = !dept || gDept === dept || dept.includes(gDept) || gDept.includes(dept);
    const typeMatch = !dtype || gType === dtype || dtype.includes(gType) || gType.includes(dtype);
    return deptMatch && typeMatch;
  });
}

