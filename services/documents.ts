import { DocSetuDocument, DocumentSection } from '@/types/docsetu';
import type { DocumentNodeRecord } from '@/types/documents';
import {
	mapBackendDocToDocSetu,
	mapBackendNodeToSection,
	mapTeamToDepartment
} from '@/adapters/documentAdapter';

export interface DocumentListParams {
	page?: number;
	pageSize?: number;
	team?: string;
	type?: string;
	search?: string;
	language?: string;
}

export interface DocumentListResponse {
	documents: DocSetuDocument[];
	total: number;
	page: number;
	pageSize: number;
}

export interface IngestDocumentPayload {
	language?: string;
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
  const { page = 0, pageSize = 20, team, type, search, language } = params;
  const url = new URL('/api/documents/ingest', window.location.origin);
  url.searchParams.set('page', String(page));
  url.searchParams.set('pageSize', String(pageSize));
  if (team && team !== 'All') url.searchParams.set('department', mapTeamToDepartment(team));
  if (type && type !== 'All') url.searchParams.set('type', type.toLowerCase());
  if (search?.trim()) url.searchParams.set('q', search.trim());
  if (language && language !== 'All') url.searchParams.set('language', language);
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load documents');
  const data = await res.json();
  if (!Array.isArray(data.documents)) throw new Error('Invalid document response');
  return {
    documents: data.documents.map(mapBackendDocToDocSetu),
    total: data.totalCount ?? data.documents.length,
    page: data.page ?? page,
    pageSize: data.pageSize ?? pageSize,
  };
}

/** Fetch a persisted document; missing or inaccessible records remain errors. */
export async function getDocument(id: string): Promise<DocSetuDocument> {
  const res = await fetch(`/api/documents/ingest?id=${encodeURIComponent(id)}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Document unavailable');
  return mapBackendDocToDocSetu(await res.json());
}

/** Fetch paginated sections without substituting sample source text. */
export async function getDocumentSections(id: string, page = 0, limit = 20): Promise<{ sections: DocumentSection[]; total: number }> {
  const res = await fetch(`/api/documents/${encodeURIComponent(id)}/nodes?page=${page}&limit=${limit}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load document sections');
  const data = await res.json();
  if (!Array.isArray(data.nodes)) throw new Error('Invalid sections response');
  return {
    sections: data.nodes.map((node: DocumentNodeRecord, index: number) => mapBackendNodeToSection(node, page * limit + index)),
    total: data.total ?? data.nodes.length,
  };
}

/**
 * Ingest / Upload a new document into DocSetu
 */
export async function uploadDocument(payload: IngestDocumentPayload): Promise<{ id: string }> {
	const content = payload.fileContent || payload.text || '';
	const format = payload.format || (payload.fileContent ? 'pdf' : 'text');

	const body = {
		title: payload.title,
	language: payload.language,
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
	const id = data.documentId || data.id;
	if (!id) throw new Error('The server did not return a document reference.');
	return { id };
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
