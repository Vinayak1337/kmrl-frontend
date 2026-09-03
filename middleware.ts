import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'kmrl_session';

/**
 * Edge-runtime safe JWT HS256 verifier using W3C Web Cryptography API.
 * Avoids Node.js stream / decompression dependencies in Edge runtime.
 */
async function verifyJwtEdge(token: string): Promise<Record<string, unknown> | null> {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const [headerB64, payloadB64, sigB64] = parts;

		const secret =
			process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'dev-secret-change-me';

		const key = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['verify']
		);

		const b64 = sigB64.replace(/-/g, '+').replace(/_/g, '/');
		const pad = b64.length % 4;
		const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
		const sigStr = atob(padded);
		const sigBuf = new Uint8Array(sigStr.length);
		for (let i = 0; i < sigStr.length; i++) sigBuf[i] = sigStr.charCodeAt(i);

		const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
		const valid = await crypto.subtle.verify('HMAC', key, sigBuf, data);
		if (!valid) return null;

		const payloadPad = payloadB64.length % 4;
		const paddedPayload = payloadPad ? payloadB64 + '='.repeat(4 - payloadPad) : payloadB64;
		const payloadJson = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
		const payload = JSON.parse(payloadJson) as Record<string, unknown>;

		if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
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
			const payload = await verifyJwtEdge(token);
			if (payload) {
				return NextResponse.redirect(new URL('/home', req.url));
			}
		}
		return NextResponse.next();
	}

	// 5. API routes verification
	if (pathname.startsWith('/api/')) {
		if (PUBLIC_API.has(pathname)) return NextResponse.next();
		if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		const payload = await verifyJwtEdge(token);
		if (!payload) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		return NextResponse.next();
	}

	// 6. For all workspace routes, require authenticated session
	if (!token) {
		const loginUrl = new URL('/login', req.url);
		loginUrl.searchParams.set('from', pathname);
		return NextResponse.redirect(loginUrl);
	}

	const payload = await verifyJwtEdge(token);
	if (!payload) {
		const loginUrl = new URL('/login', req.url);
		loginUrl.searchParams.set('from', pathname);
		return NextResponse.redirect(loginUrl);
	}

	const role = payload.role as string | undefined;

	// Admin-only sections: /people and /audit
	if ((pathname.startsWith('/people') || pathname.startsWith('/audit')) && role !== 'ADMIN') {
		return NextResponse.redirect(new URL('/home', req.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|css|js)).*)'
	]
};
