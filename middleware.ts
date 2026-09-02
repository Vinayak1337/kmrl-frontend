import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'kmrl_session';

function getSecretKey(): Uint8Array {
	const secret =
		process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'dev-secret-change-me';
	return new TextEncoder().encode(secret);
}

export default async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	const token = req.cookies.get(AUTH_COOKIE)?.value;

	// 1. Backward Compatibility Redirects from legacy /dashboard/* routes
	if (pathname === '/dashboard') {
		return NextResponse.redirect(new URL('/home', req.url));
	}
	if (pathname === '/dashboard/documents') {
		return NextResponse.redirect(new URL('/documents', req.url));
	}
	if (pathname.startsWith('/dashboard/users')) {
		return NextResponse.redirect(new URL('/people', req.url));
	}
	if (pathname.startsWith('/dashboard/audit')) {
		return NextResponse.redirect(new URL('/audit', req.url));
	}
	if (pathname.startsWith('/dashboard/policy')) {
		return NextResponse.redirect(new URL('/access', req.url));
	}
	if (pathname.startsWith('/dashboard/')) {
		const docId = pathname.replace('/dashboard/', '');
		if (docId) {
			return NextResponse.redirect(new URL(`/documents/${docId}`, req.url));
		}
		return NextResponse.redirect(new URL('/home', req.url));
	}

	// 2. Public API allowlist
	const PUBLIC_API = new Set<string>([
		'/api/auth/login',
		'/api/auth/logout',
		'/api/auth/session',
		'/api/requests',
		'/api/status',
		'/api/upload',
		'/api/ingest',
		'/api/user'
	]);

	// 3. Public landing page
	if (pathname === '/') {
		return NextResponse.next();
	}

	// 4. Authenticated users hitting login or request-deployment get redirected to /home
	if (pathname === '/login' || pathname === '/request-deployment') {
		if (token) {
			try {
				await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
				return NextResponse.redirect(new URL('/home', req.url));
			} catch {
				// Invalid token -> allow login
			}
		}
		return NextResponse.next();
	}

	// 5. API routes verification
	if (pathname.startsWith('/api/')) {
		if (PUBLIC_API.has(pathname)) return NextResponse.next();
		if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		try {
			await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
			return NextResponse.next();
		} catch {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	// 6. For all workspace routes, require authenticated session
	if (!token) {
		const loginUrl = new URL('/login', req.url);
		loginUrl.searchParams.set('from', pathname);
		return NextResponse.redirect(loginUrl);
	}

	try {
		const { payload } = await jwtVerify(token, getSecretKey(), {
			algorithms: ['HS256']
		});
		const role = payload.role as string | undefined;

		// Admin-only sections: /people and /audit
		if ((pathname.startsWith('/people') || pathname.startsWith('/audit')) && role !== 'ADMIN') {
			return NextResponse.redirect(new URL('/home', req.url));
		}

		return NextResponse.next();
	} catch {
		const loginUrl = new URL('/login', req.url);
		loginUrl.searchParams.set('from', pathname);
		return NextResponse.redirect(loginUrl);
	}
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|css|js)).*)'
	]
};
