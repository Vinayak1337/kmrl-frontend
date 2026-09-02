export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { searchDocumentsAndChunks } from '@/lib/search/searchService';

export async function GET(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const url = new URL(req.url);
		const query = url.searchParams.get('query') || url.searchParams.get('q') || '';
		const searchNodes = url.searchParams.get('searchNodes') === 'true';
		const limit = Number(url.searchParams.get('limit') || '5');

		if (!query.trim()) {
			return NextResponse.json({ results: [] }, { status: 200 });
		}

		const result = await searchDocumentsAndChunks({
			query,
			session,
			searchNodes,
			limit
		});

		return NextResponse.json(result, { status: 200 });
	} catch (e) {
		console.error('Search error', e);
		return NextResponse.json({ error: 'Search failed' }, { status: 500 });
	}
}
