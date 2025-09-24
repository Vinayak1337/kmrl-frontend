// API service functions for dashboard

export interface DocumentToUpload {
	type: 'html' | 'text' | 'pdf' | 'doc' | 'image';
	content: string;
	filename: string;
	department?: string;
	documentType?: string;
	tags?: string[];
}

export interface SearchFilters {
	department?: string;
	documentType?: string;
	searchNodes?: boolean;
}

export interface SearchResult {
	id: string;
	title: string;
	summary: string;
	department?: string;
	documentType?: string;
	createdAt?: Date;
	similarity?: number;
	nodeCount?: number;
	tags?: string[];
	keywords?: string[];
}

export interface DashboardStats {
	totalDocuments: number;
	processedToday: number;
	pendingReview: number;
	alerts: number;
	nodesCount: number;
}

// Upload documents to ingestion API
export async function uploadDocuments(
	documents: DocumentToUpload[],
	options?: {
		pages?: Array<{
			index: number;
			text?: string;
			images?: Array<{ base64: string; mimeType: string }>;
		}>;
	}
): Promise<unknown> {
	// Persist via ingestion API with metadata
	const top = documents[0] || ({} as DocumentToUpload);
	const body = {
		documents: documents.map(d => ({
			type: d.type,
			content: d.content,
			filename: d.filename
		})),
		department: top.department,
		documentType: top.documentType,
		tags: top.tags,
		pages: options?.pages
	};
	const response = await fetch('/api/documents/ingest', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.error || 'Ingestion failed');
	}
	return response.json();
}

// Analyze a document via the Gemini agent
export async function analyzeDocumentViaAgent(payload: {
	title?: string;
	html?: string;
	pages?: Array<{
		text?: string;
		html?: string;
		images?: Array<{ base64: string; mimeType: string }>;
	}>;
}): Promise<{
	nodes: unknown[];
	overallSummary: string;
	totalPages: number;
	title: string;
}> {
	const res = await fetch('/api/documents/agent', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Agent analysis failed');
	}
	return res.json();
}

// Search documents using vector search
export async function searchDocuments(
	query: string,
	filters?: SearchFilters
): Promise<SearchResult[]> {
	const response = await fetch('/api/search/vector', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			query,
			limit: 20,
			searchNodes: filters?.searchNodes || false,
			department: filters?.department,
			documentType: filters?.documentType
		})
	});

	if (!response.ok) {
		throw new Error('Search failed');
	}

	const data = await response.json();

	// Transform results to match interface
	return (data.results || []).map((r: Record<string, unknown>) => ({
		id: r.documentId || r.id,
		title: r.title || r.documentTitle || 'Untitled',
		summary: r.summary || r.nodeSummary || '',
		department: r.department,
		documentType: r.documentType,
		createdAt: r.createdAt ? new Date(r.createdAt as string) : undefined,
		similarity: r.similarity,
		nodeCount: r.nodeCount,
		tags: r.tags,
		keywords: Array.isArray(r.keywords) ? (r.keywords as string[]) : []
	}));
}

// Get recent documents
export async function getRecentDocuments(
	limit: number = 5
): Promise<SearchResult[]> {
	const response = await fetch(`/api/documents/ingest?limit=${limit}`, {
		method: 'GET',
		credentials: 'include'
	});

	if (!response.ok) {
		return [];
	}

	const data = await response.json();

	return (data.documents || [])
		.slice(0, Math.max(0, limit))
		.map((doc: Record<string, unknown>) => ({
			id: doc.id,
			title: doc.title,
			summary: doc.summary,
			department: doc.department,
			documentType: doc.documentType,
			createdAt: doc.createdAt ? new Date(doc.createdAt as string) : undefined,
			nodeCount: doc.nodeCount,
			tags: doc.tags,
			keywords: Array.isArray(doc.keywords) ? (doc.keywords as string[]) : []
		}));
}

// Get dashboard stats from real backend
export async function getDashboardStats(): Promise<DashboardStats> {
	try {
		const response = await fetch('/api/status', {
			method: 'GET',
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch stats');
		}

		const data = await response.json();

		// Get real stats from backend - no mock data
		return {
			totalDocuments: data.services?.mongodb?.stats?.totalDocuments || 0,
			processedToday: data.services?.mongodb?.stats?.processedToday || 0,
			pendingReview: data.services?.mongodb?.stats?.pendingReview || 0,
			alerts: data.services?.mongodb?.stats?.alerts || 0,
			nodesCount: data.services?.mongodb?.stats?.totalNodes || 0
		};
	} catch (error) {
		console.error('Error fetching stats:', error);
		// Return zeros, not fake data
		return {
			totalDocuments: 0,
			processedToday: 0,
			pendingReview: 0,
			alerts: 0,
			nodesCount: 0
		};
	}
}

// Get document by ID
export async function getDocument(
	id: string
): Promise<Record<string, unknown>> {
	const response = await fetch(`/api/documents/ingest?id=${id}`, {
		method: 'GET',
		credentials: 'include'
	});

	if (!response.ok) {
		throw new Error('Document not found');
	}

	return response.json();
}
