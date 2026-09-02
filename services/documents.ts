import { DocSetuDocument, DocumentSection } from '@/types/docsetu';
import type { DocumentNodeRecord } from '@/types/documents';
import {
	mapBackendDocToDocSetu,
	mapBackendNodeToSection,
	mapTeamToDepartment,
	DEMO_DOCSETU_DOCUMENTS
} from '@/adapters/documentAdapter';

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

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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
			if (DEMO_MODE) {
				return {
					documents: DEMO_DOCSETU_DOCUMENTS,
					total: DEMO_DOCSETU_DOCUMENTS.length,
					page: 0,
					pageSize: 20
				};
			}
			return { documents: [], total: 0, page: 0, pageSize: 20 };
		}

		const data = await res.json();
		const rawDocs = Array.isArray(data.documents) ? data.documents : [];

		if (rawDocs.length === 0 && (!team || team === 'All') && (!type || type === 'All')) {
			if (DEMO_MODE) {
				return {
					documents: DEMO_DOCSETU_DOCUMENTS,
					total: DEMO_DOCSETU_DOCUMENTS.length,
					page: 0,
					pageSize: 20
				};
			}
			return { documents: [], total: 0, page: 0, pageSize: 20 };
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
		console.warn('listDocuments network failure', err);
		if (DEMO_MODE) {
			return {
				documents: DEMO_DOCSETU_DOCUMENTS,
				total: DEMO_DOCSETU_DOCUMENTS.length,
				page: 0,
				pageSize: 20
			};
		}
		return { documents: [], total: 0, page: 0, pageSize: 20 };
	}
}

/**
 * Fetch a single document by ID including its sections and extracted actions
 */
export async function getDocument(id: string): Promise<DocSetuDocument> {
	const demoDoc = DEMO_MODE ? DEMO_DOCSETU_DOCUMENTS.find(d => d.id === id) : undefined;

	try {
		const res = await fetch(`/api/documents/ingest?id=${encodeURIComponent(id)}`, {
			credentials: 'include'
		});

		if (!res.ok) {
			if (demoDoc) return demoDoc;
			throw new Error('Document not found');
		}

		const data = await res.json();
		return mapBackendDocToDocSetu(data);
	} catch (err) {
		if (demoDoc) return demoDoc;
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
	const demoDoc = DEMO_MODE ? DEMO_DOCSETU_DOCUMENTS.find(d => d.id === id) : undefined;

	try {
		const res = await fetch(
			`/api/documents/${encodeURIComponent(id)}/nodes?page=${page}&limit=${limit}`,
			{ credentials: 'include' }
		);

		if (!res.ok) {
			if (demoDoc) {
				return { sections: demoDoc.sections, total: demoDoc.sections.length };
			}
			return { sections: [], total: 0 };
		}

		const data = await res.json();
		const rawNodes = Array.isArray(data.nodes) ? (data.nodes as DocumentNodeRecord[]) : [];
		const sections = rawNodes.map((n, idx: number) =>
			mapBackendNodeToSection(n, page * limit + idx)
		);

		return {
			sections,
			total: Number(data.total) || sections.length
		};
	} catch {
		if (demoDoc) {
			return { sections: demoDoc.sections, total: demoDoc.sections.length };
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
