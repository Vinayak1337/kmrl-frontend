import { DocumentRecord, DocumentNodeRecord } from '@/types/documents';
import { DocumentChunk } from './chunker';
import { NormalizedDocument } from './normalization';

const STOPWORDS = new Set<string>([
	'the', 'and', 'for', 'that', 'with', 'from', 'this', 'have', 'will', 'your',
	'into', 'over', 'under', 'shall', 'should', 'would', 'could', 'about', 'them',
	'they', 'been', 'being', 'were', 'also', 'than', 'then', 'there', 'here',
	'such', 'only', 'must', 'more', 'most', 'very', 'much', 'many', 'some', 'any',
	'each', 'per', 'onto', 'upon', 'within', 'without', 'which', 'when', 'where'
]);

export function extractKeywords(text: string, maxKeywords = 15): string[] {
	const tokens = (text || '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(t => t.length >= 4 && !STOPWORDS.has(t));

	const counts = new Map<string, number>();
	for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);

	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxKeywords)
		.map(([t]) => t);
}

export function normalizeTitle(title?: string): string {
	if (!title) return '';
	return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface ChunkEnrichmentData {
	title?: string;
	topic?: string;
	summary?: string;
	summaryMd?: string;
	keyPoints?: string[];
	keyPointsMd?: string;
	actionableItems?: string[];
	actionsMd?: string;
	criticalFlags?: string[];
	crossDepartments?: string[];
	meta?: Record<string, unknown>;
	keywords?: string[];
}

export function extractActionsHeuristic(text: string): string[] {
	const actionRegex = /\b(ensure|must|shall|review|submit|approve|notify|inspect|verify|audit|implement|update|dispatch|complete)\b/i;
	const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim());
	return sentences.filter(s => actionRegex.test(s) && s.length >= 20 && s.length <= 250).slice(0, 5);
}

export function extractKeyPointsHeuristic(text: string): string[] {
	const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
	const bullets = lines
		.filter(l => /^[-*•\d+.]\s+/.test(l))
		.map(l => l.replace(/^[-*•\d+.]\s+/, '').trim())
		.filter(l => l.length >= 15 && l.length <= 250);
	if (bullets.length > 0) return bullets.slice(0, 6);

	const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 25);
	return sentences.slice(0, 4);
}

/**
 * Builds a canonical DocumentNodeRecord for document_nodes collection.
 * Shared by both initial ingestion and feedback / reprocessing.
 */
export function buildPersistedChunk(
	chunk: DocumentChunk,
	docId: string,
	totalChunks: number,
	docMeta: { department?: string; documentType?: string; tags?: string[] },
	enrichment?: ChunkEnrichmentData
): DocumentNodeRecord {
	const nodeId = chunk.chunkId;
	const uid = `${docId}#${nodeId}`;
	const rawText = chunk.text || '';

	const title =
		enrichment?.title ||
		enrichment?.topic ||
		(enrichment?.summary || '').split(/[.!?]/)[0]?.slice(0, 80) ||
		`Section ${chunk.order}`;

	const titleNormalized = normalizeTitle(title);
	const summary = (enrichment?.summary || rawText.slice(0, 300)).trim();
	const keyPoints =
		Array.isArray(enrichment?.keyPoints) && enrichment.keyPoints.length > 0
			? enrichment.keyPoints.filter(Boolean)
			: extractKeyPointsHeuristic(rawText);

	const actionableItems =
		Array.isArray(enrichment?.actionableItems) && enrichment.actionableItems.length > 0
			? enrichment.actionableItems.filter(Boolean)
			: extractActionsHeuristic(rawText);

	const criticalFlags = Array.isArray(enrichment?.criticalFlags) ? enrichment.criticalFlags.filter(Boolean) : [];
	const crossDepartments = Array.isArray(enrichment?.crossDepartments) ? enrichment.crossDepartments.filter(Boolean) : [];

	const extractedKeywords = extractKeywords(
		[title, summary, keyPoints.join(' '), actionableItems.join(' '), rawText.slice(0, 1000)].join(' ')
	);
	const keywords = Array.from(new Set([...(enrichment?.keywords || []), ...extractedKeywords]));

	// Build unified searchable text representation
	const searchableText = [
		title,
		titleNormalized,
		summary,
		keyPoints.join(' '),
		actionableItems.join(' '),
		criticalFlags.join(' '),
		crossDepartments.join(' '),
		keywords.join(' '),
		docMeta.department || '',
		docMeta.documentType || '',
		(docMeta.tags || []).join(' '),
		rawText
	]
		.join(' ')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

	return {
		uid,
		docId,
		nodeId,
		order: chunk.order,
		title,
		titleNormalized,
		pageRange: { start: chunk.pageStart, end: chunk.pageEnd },
		sourcePages: chunk.sourcePages,
		content: rawText,
		images: (chunk.images || []).map(im => ({
			base64: im.base64,
			mimeType: im.mimeType,
			page: chunk.pageStart
		})),
		summary,
		summaryMd: enrichment?.summaryMd || summary,
		keyPointsMd: enrichment?.keyPointsMd,
		actionsMd: enrichment?.actionsMd,
		keyPoints,
		actionableItems,
		criticalFlags,
		crossDepartments,
		keywords,
		meta: {
			...enrichment?.meta,
			searchableText
		},
		nextNodeId: chunk.nextChunkId,
		prevNodeId: chunk.previousChunkId,
		nodeCount: totalChunks,
		department: docMeta.department,
		documentType: docMeta.documentType,
		tags: docMeta.tags || [],
		createdAt: new Date()
	};
}

/**
 * Builds a canonical DocumentRecord for documents collection.
 */
export function buildPersistedDocument(params: {
	id: string;
	title: string;
	normalized: NormalizedDocument;
	nodeCount: number;
	overallSummary: string;
	overallMd?: string;
	department?: string;
	documentType?: string;
	tags?: string[];
	uploadedBy: string;
	chunks: DocumentNodeRecord[];
}): DocumentRecord {
	const {
		id,
		title,
		normalized,
		nodeCount,
		overallSummary,
		overallMd,
		department,
		documentType,
		tags = [],
		uploadedBy,
		chunks
	} = params;

	const allKeywords = Array.from(
		new Set(chunks.flatMap(c => c.keywords || []).concat(extractKeywords(overallSummary)))
	).slice(0, 30);

	const searchableText = [
		title,
		normalizeTitle(title),
		overallSummary,
		overallMd || '',
		department || '',
		documentType || '',
		tags.join(' '),
		allKeywords.join(' '),
		chunks.map(c => c.title + ' ' + c.summary).join(' ')
	]
		.join(' ')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

	return {
		id,
		title,
		originalFormat: normalized.format,
		totalPages: normalized.pageCount,
		language: 'en',
		nodeCount,
		fullSummary: overallSummary,
		overallMd: overallMd || overallSummary,
		keywords: allKeywords,
		searchableText,
		metadata: {
			createdAt: new Date(),
			uploadedBy,
			department,
			documentType,
			tags
		},
		raw: {
			type: normalized.format,
			content: normalized.rawContent,
			text: normalized.fullText
		}
	};
}
