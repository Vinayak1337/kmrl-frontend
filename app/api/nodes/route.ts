export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentNodeRecord } from '@/types/documents';

// GET /api/nodes?title=...&docId?=...&firstOnly=true
export async function GET(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const { searchParams } = new URL(req.url);
		const title = searchParams.get('title');
		const docId = searchParams.get('docId') || undefined;
		const firstOnly = (searchParams.get('firstOnly') || 'true') !== 'false';
		const limit = Number(searchParams.get('limit') || (firstOnly ? '1' : '10'));

		const filter: Record<string, unknown> = {};
		if (title) {
			const normalized = title.toLowerCase().replace(/\s+/g, ' ').trim();
			// Prefer normalized field, fallback to exact title if not backfilled
			(filter as any)['$or'] = [
				{ titleNormalized: normalized },
				{ title: title }
			];
		}
		if (docId) filter['docId'] = docId;

		const coll = await getCollection<DocumentNodeRecord>(
			process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
		);
		const nodes = await coll
			.find(filter)
			.sort({ order: 1 })
			.limit(Math.max(1, limit))
			.toArray();
		return NextResponse.json({ results: nodes, total: nodes.length });
	} catch (e) {
		console.error('Nodes query error', e);
		return NextResponse.json(
			{ error: 'Failed to query nodes' },
			{ status: 500 }
		);
	}
}
