import { DocSetuDocument, DocumentSection } from '@/types/docsetu';
import type { DocumentNodeRecord } from '@/types/documents';
import {
	mapBackendDocToDocSetu,
	mapBackendNodeToSection,
	mapTeamToDepartment
} from '@/adapters/documentAdapter';
import { MOCK_DOCUMENTS, MOCK_NODES } from '@/lib/dummy/mockData';

export interface DocumentListParams {
	page?: number;
	pageSize?: number;
	team?: string;
	type?: string;
	search?: string;
}

export interface DocumentListResponse {
	documents: DocSetuDocument[];
	total: number;
	page: number;
	pageSize: number;
}

export interface IngestDocumentPayload {
	title: string;
	team: string;
	type: string;
	tags?: string[];
	fileContent?: string; // base64 or text
	fileName?: string;
	format?: 'pdf' | 'text' | 'image' | 'html' | 'doc';
	text?: string;
}

/**
 * Fetch list of documents with metadata, pagination, and team/type filters
 */
export async function listDocuments(
	params: DocumentListParams = {}
): Promise<DocumentListResponse> {
	const { page = 0, pageSize = 20, team, type, search } = params;

	try {
		const url = new URL('/api/documents/ingest', window.location.origin);
		url.searchParams.set('page', String(page));
		url.searchParams.set('pageSize', String(pageSize));
		if (team && team !== 'All') {
			url.searchParams.set('department', mapTeamToDepartment(team));
		}
		if (type && type !== 'All') {
			url.searchParams.set('type', type.toLowerCase());
		}

		const res = await fetch(url.toString(), {
			method: 'GET',
			credentials: 'include'
		});

		if (!res.ok) {
			return filterAndPaginateMockDocs(params);
		}

		const data = await res.json();
		const rawDocs = Array.isArray(data.documents) ? data.documents : [];

		if (rawDocs.length === 0) {
			return filterAndPaginateMockDocs(params);
		}

		let documents: DocSetuDocument[] = rawDocs.map(mapBackendDocToDocSetu);

		// Client-side search filter if query supplied
		if (search && search.trim()) {
			const q = search.toLowerCase().trim();
			documents = documents.filter(
				(d: DocSetuDocument) =>
					d.title.toLowerCase().includes(q) ||
					d.summary.toLowerCase().includes(q) ||
					d.team.toLowerCase().includes(q) ||
					d.tags.some((t: string) => t.toLowerCase().includes(q))
			);
		}

		return {
			documents,
			total: data.totalCount || documents.length,
			page: data.page || page,
			pageSize: data.pageSize || pageSize
		};
	} catch (err) {
		console.warn('listDocuments network failure, using fallback mock documents', err);
		return filterAndPaginateMockDocs(params);
	}
}

function filterAndPaginateMockDocs(params: DocumentListParams): DocumentListResponse {
	const { page = 0, pageSize = 20, team, type, search } = params;
	let docs = [...MOCK_DOCUMENTS];

	if (team && team !== 'All') {
		docs = docs.filter(d => d.team.toLowerCase() === team.toLowerCase() || d.department?.toLowerCase() === team.toLowerCase());
	}
	if (type && type !== 'All') {
		docs = docs.filter(d => (d.documentType || d.type || '').toLowerCase() === type.toLowerCase());
	}
	if (search && search.trim()) {
		const q = search.toLowerCase().trim();
		docs = docs.filter(
			d =>
				d.title.toLowerCase().includes(q) ||
				d.summary.toLowerCase().includes(q) ||
				d.tags.some(t => t.toLowerCase().includes(q))
		);
	}

	const total = docs.length;
	const start = page * pageSize;
	const paginated = docs.slice(start, start + pageSize);

	return {
		documents: paginated,
		total,
		page,
		pageSize
	};
}

/**
 * Fetch a single document by ID including its sections and extracted actions
 */
export async function getDocument(id: string): Promise<DocSetuDocument> {
	const mockDoc = MOCK_DOCUMENTS.find(d => d.id === id);

	try {
		const res = await fetch(`/api/documents/ingest?id=${encodeURIComponent(id)}`, {
			credentials: 'include'
		});

		if (!res.ok) {
			if (mockDoc) return mockDoc;
			throw new Error('Document not found');
		}

		const data = await res.json();
		return mapBackendDocToDocSetu(data);
	} catch (err) {
		if (mockDoc) return mockDoc;
		throw err;
	}
}

/**
 * Fetch paginated sections for a document
 */
export async function getDocumentSections(
	id: string,
	page: number = 0,
	limit: number = 20
): Promise<{ sections: DocumentSection[]; total: number }> {
	const mockNodes = MOCK_NODES[id] || [];
	const mockSections: DocumentSection[] = mockNodes.map((n, idx) => ({
		id: n.id,
		order: n.order || idx + 1,
		title: n.title,
		pageRange: { start: n.pageRange.start, end: n.pageRange.end },
		content: n.content,
		summary: n.summary,
		keyPoints: n.keyPoints,
		actions: n.actionableItems,
		criticalFlags: [],
		affectedTeams: [],
		sourceContent: n.content,
		isUrgent: n.isUrgent,
		dueDate: n.dueDate ? (typeof n.dueDate === 'string' ? n.dueDate : n.dueDate.toISOString()) : undefined
	}));

	try {
		const res = await fetch(
			`/api/documents/${encodeURIComponent(id)}/nodes?page=${page}&limit=${limit}`,
			{ credentials: 'include' }
		);

		if (!res.ok) {
			if (mockSections.length > 0) {
				return { sections: mockSections, total: mockSections.length };
			}
			return { sections: [], total: 0 };
		}

		const data = await res.json();
		const rawNodes = Array.isArray(data.nodes) ? (data.nodes as DocumentNodeRecord[]) : [];
		if (rawNodes.length === 0 && mockSections.length > 0) {
			return { sections: mockSections, total: mockSections.length };
		}

		const sections = rawNodes.map((n, idx: number) =>
			mapBackendNodeToSection(n, page * limit + idx)
		);

		return {
			sections,
			total: Number(data.total) || sections.length
		};
	} catch {
		if (mockSections.length > 0) {
			return { sections: mockSections, total: mockSections.length };
		}
		return { sections: [], total: 0 };
	}
}

/**
 * Ingest / Upload a new document into DocSetu
 */
export async function uploadDocument(payload: IngestDocumentPayload): Promise<{ id: string }> {
	const content = payload.fileContent || payload.text || '';
	const format = payload.format || (payload.fileContent ? 'pdf' : 'text');

	const body = {
		title: payload.title,
		department: mapTeamToDepartment(payload.team),
		documentType: payload.type.toLowerCase(),
		tags: payload.tags || [],
		documents: [
			{
				type: format,
				content,
				filename: payload.fileName || `${payload.title}.txt`
			}
		]
	};

	const res = await fetch('/api/documents/ingest', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({}));
		throw new Error(error.error || 'Document ingestion failed');
	}

	const data = await res.json();
	return { id: data.documentId || data.id || 'doc-new' };
}

/**
 * Delete a document from DocSetu
 */
export async function deleteDocument(id: string): Promise<boolean> {
	const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	if (!res.ok) {
		throw new Error('Failed to delete document');
	}

	return true;
}
