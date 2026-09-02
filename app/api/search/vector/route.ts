export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { searchDocumentsAndChunks } from '@/lib/search/searchService';
import { getCollection } from '@/lib/mongo';

export async function POST(request: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			query,
			limit = 10,
			searchNodes = false,
			department,
			documentType,
			documentId
		} = body || {};

		if (!query || typeof query !== 'string' || !query.trim()) {
			return NextResponse.json({ error: 'Query is required' }, { status: 400 });
		}

		const result = await searchDocumentsAndChunks({
			query,
			session,
			team: department,
			type: documentType,
			documentId,
			searchNodes: Boolean(searchNodes),
			limit: Math.max(1, Math.min(50, Number(limit) || 10))
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error('Search error:', error);
		return NextResponse.json(
			{
				error: 'Failed to perform search',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// Status check
export async function GET() {
	try {
		const collection = await getCollection();
		const totalDocs = await collection.countDocuments();
		return NextResponse.json({
			status: 'ready',
			stats: {
				totalDocuments: totalDocs
			},
			configuration: { mode: 'lexical-relevance' }
		});
	} catch (error) {
		console.error('Search status error:', error);
		return NextResponse.json(
			{ error: 'Failed to get search status' },
			{ status: 500 }
		);
	}
}
