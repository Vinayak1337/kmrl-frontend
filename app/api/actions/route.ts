export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, buildDocumentAccessFilter } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { DocumentRecord, DocumentNodeRecord } from '@/types/documents';
import { extractDueDates, mapDepartmentToTeam } from '@/adapters/documentAdapter';

export async function GET(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const team = searchParams.get('team');
		const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '100')));

		const nodesColl = await getCollection<DocumentNodeRecord>(
			process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
		);

		const nodeAccessFilter = buildDocumentAccessFilter(session, 'nodes');
		const filter: Record<string, any> = {
			...nodeAccessFilter,
			'actionableItems.0': { $exists: true }
		};

		if (team && team !== 'All') {
			filter.department = team;
		}

		const nodes = await nodesColl
			.find(filter)
			.sort({ createdAt: -1 })
			.limit(limit)
			.toArray();

		// Fetch document titles
		const docsColl = await getCollection<DocumentRecord>();
		const docIds = Array.from(new Set(nodes.map(n => n.docId)));
		const docTitles = new Map<string, string>();

		if (docIds.length > 0) {
			const docs = await docsColl
				.find({ id: { $in: docIds } }, { projection: { id: 1, title: 1 } } as any)
				.toArray();
			for (const d of docs) {
				docTitles.set(d.id, d.title);
			}
		}

		const actions: Array<{
			id: string;
			documentId: string;
			documentTitle: string;
			action: string;
			team: string;
			dueDate?: string;
			isUrgent: boolean;
			type: 'action' | 'information';
			sectionId: string;
			sectionTitle: string;
			pageStart?: number;
			pageEnd?: number;
		}> = [];

		for (const node of nodes) {
			const docTitle = docTitles.get(node.docId) || 'Untitled Document';
			const nodeTeam = mapDepartmentToTeam(node.department);
			const nodeActions = Array.isArray(node.actionableItems) ? node.actionableItems : [];

			nodeActions.forEach((actText, idx) => {
				const text = String(actText || '').trim();
				if (!text) return;

				const dueDate = extractDueDates(text);
				const isUrgent =
					(node.criticalFlags && node.criticalFlags.length > 0) ||
					/urgent|immediate|statutory|mandatory|asap|penalty|critical/i.test(text);
				const isInfo = /no action required|for information|remains under|informative/i.test(text);

				actions.push({
					id: `${node.docId}-${node.nodeId}-act-${idx + 1}`,
					documentId: node.docId,
					documentTitle: docTitle,
					action: text,
					team: (node.crossDepartments && node.crossDepartments[0]) || nodeTeam,
					dueDate,
					isUrgent: Boolean(isUrgent),
					type: isInfo ? 'information' : 'action',
					sectionId: node.nodeId,
					sectionTitle: node.title || `Section ${node.order}`,
					pageStart: node.pageRange?.start,
					pageEnd: node.pageRange?.end
				});
			});
		}

		return NextResponse.json({ actions, total: actions.length }, { status: 200 });
	} catch (err) {
		console.error('Actions retrieval error:', err);
		return NextResponse.json(
			{ error: 'Failed to retrieve actions' },
			{ status: 500 }
		);
	}
}
