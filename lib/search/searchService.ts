import { getCollection } from '@/lib/mongo';
import { JwtUser, buildDocumentAccessFilter } from '@/lib/auth';
import { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

export interface SearchOptions {
	query: string;
	session: JwtUser;
	team?: string;
	type?: string;
	documentId?: string;
	searchNodes?: boolean;
	limit?: number;
}

export interface DocumentSearchResult {
	documentId: string;
	title: string;
	summary: string;
	nodeCount: number;
	department?: string;
	documentType?: string;
	tags: string[];
	createdAt?: Date;
	score: number;
	matchReason?: string;
	type: 'document';
}

export interface ChunkSearchResult {
	documentId: string;
	documentTitle: string;
	nodeId: string;
	uid: string;
	title: string;
	nodeSummary: string;
	content: string;
	keyPoints: string[];
	actionableItems: string[];
	tags: string[];
	keywords: string[];
	pageRange: { start: number; end: number };
	score: number;
	matchingExcerpt?: string;
	type: 'node';
}

export interface SearchResponse {
	query: string;
	resultsFound: number;
	searchType: 'document-level' | 'node-level';
	results: Array<DocumentSearchResult | ChunkSearchResult>;
	message?: string;
}

function tokenize(str: string): string[] {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(t => t.length >= 2);
}

function computeRelevance(query: string, fields: { text: string; weight: number }[]): number {
	const queryTokens = tokenize(query);
	if (queryTokens.length === 0) return 0;

	const cleanQuery = query.toLowerCase().trim();
	let totalScore = 0;

	for (const { text, weight } of fields) {
		if (!text) continue;
		const cleanText = text.toLowerCase();

		// Exact phrase match gives a massive boost
		if (cleanText.includes(cleanQuery)) {
			totalScore += weight * 3;
		}

		// Token match scoring
		let matchedTokens = 0;
		for (const qt of queryTokens) {
			if (cleanText.includes(qt)) {
				matchedTokens++;
			}
		}
		if (matchedTokens > 0) {
			totalScore += (matchedTokens / queryTokens.length) * weight;
		}
	}

	return totalScore;
}

function extractSnippet(text: string, query: string, maxLen = 200): string {
	if (!text) return '';
	const tokens = tokenize(query);
	const lower = text.toLowerCase();
	let bestPos = -1;

	for (const t of tokens) {
		const pos = lower.indexOf(t);
		if (pos >= 0) {
			bestPos = pos;
			break;
		}
	}

	if (bestPos === -1) return text.slice(0, maxLen).trim() + (text.length > maxLen ? '...' : '');

	const start = Math.max(0, bestPos - 60);
	const end = Math.min(text.length, bestPos + maxLen - 60);
	const snippet = text.slice(start, end).trim();
	return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
}

/**
 * Unified lexical and relevance search across authorized documents and chunks.
 */
export async function searchDocumentsAndChunks(options: SearchOptions): Promise<SearchResponse> {
	const {
		query,
		session,
		team,
		type,
		documentId,
		searchNodes = false,
		limit = 10
	} = options;

	const cleanQuery = (query || '').trim();
	if (!cleanQuery) {
		return {
			query: '',
			resultsFound: 0,
			searchType: searchNodes ? 'node-level' : 'document-level',
			results: [],
			message: 'Empty query'
		};
	}

	// 1. Chunk / Section Level Search
	if (searchNodes) {
		const nodesColl = await getCollection<DocumentNodeRecord>(
			process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
		);

		const nodeAccessFilter = buildDocumentAccessFilter(session, 'nodes');
		const filter: Record<string, unknown> = { ...nodeAccessFilter };

		if (documentId) filter.docId = documentId;
		if (team && team !== 'All') filter.department = team;
		if (type && type !== 'All') filter.documentType = type.toLowerCase();

		// Fetch candidates matching filters
		const candidates = await nodesColl.find(filter).limit(500).toArray();

		// Build quick document title map
		const docsColl = await getCollection<DocumentRecord>();
		const docIds = Array.from(new Set(candidates.map(c => c.docId)));
		const docTitles = new Map<string, string>();

		if (docIds.length > 0) {
			const matchedDocs = await docsColl
				.find({ id: { $in: docIds } })
				.toArray();
			for (const d of matchedDocs) {
				docTitles.set(d.id, d.title);
			}
		}

		const scoredResults: ChunkSearchResult[] = [];

		for (const node of candidates) {
			const score = computeRelevance(cleanQuery, [
				{ text: node.title || '', weight: 10 },
				{ text: node.titleNormalized || '', weight: 8 },
				{ text: (node.keywords || []).join(' '), weight: 6 },
				{ text: node.summary || '', weight: 5 },
				{ text: (node.keyPoints || []).join(' '), weight: 4 },
				{ text: (node.actionableItems || []).join(' '), weight: 4 },
				{ text: node.content || '', weight: 2 },
				{ text: (node.meta?.searchableText as string) || '', weight: 3 }
			]);

			if (score > 0) {
				const docTitle = docTitles.get(node.docId) || 'Untitled Document';
				scoredResults.push({
					documentId: node.docId,
					documentTitle: docTitle,
					nodeId: node.nodeId,
					uid: node.uid,
					title: node.title || 'Section',
					nodeSummary: node.summary,
					content: node.content,
					keyPoints: node.keyPoints || [],
					actionableItems: node.actionableItems || [],
					tags: node.tags || [],
					keywords: node.keywords || [],
					pageRange: node.pageRange,
					score: Math.round(score * 10) / 10,
					matchingExcerpt: extractSnippet(node.content || node.summary, cleanQuery),
					type: 'node'
				});
			}
		}

		scoredResults.sort((a, b) => b.score - a.score);
		const top = scoredResults.slice(0, limit);

		return {
			query: cleanQuery,
			resultsFound: top.length,
			searchType: 'node-level',
			results: top,
			message: top.length === 0 ? 'No relevant sections found.' : `Found ${top.length} relevant sections`
		};
	}

	// 2. Document Level Search
	const docsColl = await getCollection<DocumentRecord>();
	const docAccessFilter = buildDocumentAccessFilter(session, 'documents');
	const filter: Record<string, unknown> = { ...docAccessFilter };

	if (documentId) filter.id = documentId;
	if (team && team !== 'All') filter['metadata.department'] = team;
	if (type && type !== 'All') filter['metadata.documentType'] = type.toLowerCase();

	const candidates = await docsColl.find(filter).limit(200).toArray();
	const scoredDocs: DocumentSearchResult[] = [];

	for (const doc of candidates) {
		const score = computeRelevance(cleanQuery, [
			{ text: doc.title, weight: 10 },
			{ text: (doc.keywords || []).join(' '), weight: 6 },
			{ text: doc.fullSummary || '', weight: 5 },
			{ text: (doc.metadata?.tags || []).join(' '), weight: 4 },
			{ text: (doc.metadata?.department || ''), weight: 3 },
			{ text: (doc.raw?.text || ''), weight: 2 }
		]);

		if (score > 0) {
			scoredDocs.push({
				documentId: doc.id,
				title: doc.title,
				summary: doc.fullSummary || '',
				nodeCount: doc.nodeCount || (Array.isArray(doc.nodes) ? doc.nodes.length : 0),
				department: doc.metadata?.department,
				documentType: doc.metadata?.documentType,
				tags: doc.metadata?.tags || [],
				createdAt: doc.metadata?.createdAt,
				score: Math.round(score * 10) / 10,
				matchReason: `Matched query terms in document content`,
				type: 'document'
			});
		}
	}

	scoredDocs.sort((a, b) => b.score - a.score);
	const top = scoredDocs.slice(0, limit);

	return {
		query: cleanQuery,
		resultsFound: top.length,
		searchType: 'document-level',
		results: top,
		message: top.length === 0 ? 'No relevant documents found.' : `Found ${top.length} relevant documents`
	};
}
