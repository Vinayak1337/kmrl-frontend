export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

function scoreTextMatch(query: string, text: string): number {
	const terms = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
	const body = (text || '').toLowerCase();
	const matches = Array.from(terms).filter(t => body.includes(t)).length;
	return matches / Math.max(1, terms.size);
}

export async function POST(request: NextRequest) {
	// Authentication is optional for search (make it public for testing)
	// const token = (await cookies()).get(AUTH_COOKIE)?.value;
	// const session = token ? verifySession(token) : null;

	try {
		const body = await request.json();
		const {
			query,
			limit = 5,
			searchNodes = false,
			department,
			documentType
		} = body;

		if (!query) {
			return NextResponse.json({ error: 'Query is required' }, { status: 400 });
		}

		// Embeddings disabled: perform keyword scoring across stored text

		// Get collection
		const collection = await getCollection<DocumentRecord>();

		// Build filter
		const filter: Record<string, unknown> = {};
		if (department) filter['metadata.department'] = department;
		if (documentType) filter['metadata.documentType'] = documentType;

		// For MongoDB Atlas Vector Search (if configured)
		// This would use the $vectorSearch operator
		// For now, we'll do client-side similarity search

		// Fetch documents
		const documents = await collection.find(filter).toArray();

		// Calculate similarities
		const results: Array<Record<string, unknown> & { similarity: number }> = [];

		if (searchNodes) {
			// Search node collection for granular results
			const nodesCollection = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);
			const nodes = await nodesCollection.find({}).limit(1000).toArray();
			// Build quick doc metadata map
			const docMeta = new Map<string, { title: string; tags: string[] }>();
			for (const node of nodes) {
				if (!docMeta.has(node.docId)) {
					const d =
						documents.find(x => x.id === node.docId) ||
						(await collection.findOne({ id: node.docId }, {
							projection: { title: 1, metadata: 1 }
						} as any));
					docMeta.set(node.docId, {
						title: d?.title || 'Untitled',
						tags: ((d?.metadata as any)?.tags || []) as string[]
					});
				}
				const meta = docMeta.get(node.docId)!;
				const text = [
					node.summary,
					node.content,
					...(node.keyPoints || []),
					...(node.actionableItems || []),
					...(node.criticalFlags || []),
					...(node.crossDepartments || []),
					...(meta.tags || []),
					...(node.keywords || [])
				].join(' ');
				const similarity = scoreTextMatch(query, text);
				results.push({
					documentId: node.docId,
					documentTitle: meta.title,
					nodeId: node.nodeId,
					nodeSummary: node.summary,
					keyPoints: node.keyPoints,
					actionableItems: node.actionableItems,
					tags: meta.tags || [],
					keywords: node.keywords || [],
					pageRange: node.pageRange,
					similarity,
					type: 'node'
				});
			}
		} else {
			// Search at document level
			for (const doc of documents as unknown as Array<{
				id: string;
				title: string;
				fullSummary: string;
				nodes?: Array<{ summary?: string }>;
				metadata?: {
					tags?: string[];
					department?: string;
					documentType?: string;
					createdAt?: string;
				};
				keywords?: string[];
			}>) {
				const text = [
					doc.title,
					doc.fullSummary,
					...((doc.metadata?.tags as string[] | undefined) || []),
					...(doc.nodes || []).map((n: { summary?: string }) => n.summary),
					...(doc.keywords || [])
				].join(' ');
				const similarity = scoreTextMatch(query, text);
				results.push({
					documentId: doc.id,
					title: doc.title,
					summary: doc.fullSummary,
					nodeCount: doc.nodes?.length || 0,
					department: doc.metadata?.department,
					documentType: doc.metadata?.documentType,
					createdAt: doc.metadata?.createdAt,
					tags: doc.metadata?.tags || [],
					keywords: doc.keywords || [],
					similarity,
					type: 'document'
				});
			}
		}

		// Sort by similarity and limit results
		results.sort((a, b) => b.similarity - a.similarity);
		const topResults = results
			.filter(r => typeof r.similarity === 'number' && r.similarity > 0)
			.slice(0, limit);

		return NextResponse.json({
			query,
			resultsFound: topResults.length,
			searchType: searchNodes ? 'node-level' : 'document-level',
			results: topResults,
			message:
				topResults.length === 0
					? 'No relevant documents found. Try a different query.'
					: `Found ${topResults.length} relevant results`
		});
	} catch (error) {
		console.error('Vector search error:', error);
		return NextResponse.json(
			{
				error: 'Failed to perform vector search',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// GET endpoint for search status
export async function GET() {
	try {
		const collection = await getCollection();

		const totalDocs = await collection.countDocuments();
		return NextResponse.json({
			status: 'ready',
			stats: {
				totalDocuments: totalDocs
			},
			configuration: { mode: 'keyword' }
		});
	} catch (error) {
		console.error('Search status error:', error);
		return NextResponse.json(
			{ error: 'Failed to get search status' },
			{ status: 500 }
		);
	}
}
