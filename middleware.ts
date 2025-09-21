import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'kmrl_session';

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = new Set<string>(['/', '/login', '/request-deployment']);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const role = payload.role as string | undefined;

    // Admin-only sections
    if ((pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/audit')) && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Doc-type gated sections (example: policy workspace)
    if (pathname.startsWith('/dashboard/policy')) {
      const docTypes = Array.isArray((payload as any).docTypes) ? (payload as any).docTypes as string[] : [];
      if (role !== 'ADMIN' && !docTypes.includes('policy')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    // Invalid token -> redirect to login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    // Run on all paths except API and Next internals
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|css|js)).*)',
  ],
};
