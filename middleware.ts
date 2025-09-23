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

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  // Public API allowlist and public pages
  const PUBLIC_API = new Set<string>([
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/session',
    '/api/requests',
    '/api/status',  // Public status endpoint
    '/api/search/vector',  // Public vector search for testing
  ]);

  // If hitting login or request-deployment and already authenticated, bounce to dashboard
  if (pathname === '/login' || pathname === '/request-deployment') {
    if (token) {
      try {
        await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } catch {
        // invalid token -> proceed to login/request-deployment
      }
    }
    return NextResponse.next();
  }

  // Allow home for anyone
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allowlist API routes
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API.has(pathname)) return NextResponse.next();
    // For all other API routes, require session
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
      // Optionally apply admin checks for specific APIs here
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // For all other routes, require session
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
      const grants = Array.isArray((payload as any).grants) ? (payload as any).grants as Array<{ type?: string; actions?: string[] }> : [];
      const canReadPolicy = grants.some(g => (g.type || '').toUpperCase() === 'POLICY' && (g.actions || []).includes('read'));
      if (role !== 'ADMIN' && !canReadPolicy) {
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
    // Include API and pages; exclude Next internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|css|js)).*)',
  ],
};
