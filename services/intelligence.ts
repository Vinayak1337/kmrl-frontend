import { Citation, ChatMessage } from '@/types/docsetu';
import { mapTeamToDepartment } from '@/adapters/documentAdapter';

export interface AskParams {
	query: string;
	docId?: string;
	sessionId?: string;
	topK?: number;
	existingMessages?: ChatMessage[];
}

export interface AskResponse {
	reply: string;
	citations: Citation[];
	sessionId: string;
}

export interface TranslationPayload {
	language: string;
	summary: string;
	keyPoints?: string[];
	actionableItems?: string[];
}

export interface TranslationResponse {
	summary: string;
	keyPoints: string[];
	actionableItems: string[];
	language: string;
}

/**
 * Ask DocSetu cross-corpus or for a specific document
 */
export async function askDocSetu(params: AskParams): Promise<AskResponse> {
	const { query, docId, sessionId, topK = 5, existingMessages = [] } = params;

	const messages = [
		...existingMessages.map(m => ({ role: m.role, content: m.content })),
		{ role: 'user' as const, content: query }
	];

	const payload: Record<string, unknown> = {
		messages,
		topK
	};
	if (docId) payload.docId = docId;
	if (sessionId) payload.sessionId = sessionId;

	const res = await fetch('/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Intelligence query failed');
	}

	const data = await res.json();

	// Format citations to point to clean section format
	const rawCitations = Array.isArray(data.citations) ? data.citations : [];
	const citations: Citation[] = rawCitations.map((c: any) => ({
		index: c.index,
		docId: c.docId,
		nodeId: c.nodeId,
		sectionId: c.nodeId ? `section-${c.nodeId.replace(/\D/g, '') || '1'}` : undefined,
		title: c.title || `Section ${c.index}`,
		score: c.score,
		pageRange: c.pageRange,
		uid: c.uid
	}));

	return {
		reply: data.reply || 'No direct answer could be synthesized from the current source corpus.',
		citations,
		sessionId: data.sessionId || sessionId || `session-${Date.now()}`
	};
}

/**
 * Fetch chat history for document or general intelligence session
 */
export async function getChatHistory(
	docId?: string,
	sessionId?: string
): Promise<{ messages: ChatMessage[]; citations: Citation[]; sessionId: string | null }> {
	try {
		const params = new URLSearchParams();
		if (docId) params.set('docId', docId);
		if (sessionId) params.set('sessionId', sessionId);

		const res = await fetch(`/api/chat?${params.toString()}`, {
			credentials: 'include'
		});

		if (!res.ok) {
			return { messages: [], citations: [], sessionId: null };
		}

		const data = await res.json();
		const rawMessages = Array.isArray(data.messages) ? data.messages : [];
		const messages: ChatMessage[] = rawMessages.map((m: any) => ({
			role: m.role === 'user' ? 'user' : 'assistant',
			content: m.content || '',
			timestamp: m.timestamp ? new Date(m.timestamp) : undefined
		}));

		const rawCitations = Array.isArray(data.citations) ? data.citations : [];
		const citations: Citation[] = rawCitations.map((c: any) => ({
			index: c.index,
			docId: c.docId,
			nodeId: c.nodeId,
			title: c.title,
			score: c.score,
			pageRange: c.pageRange,
			uid: c.uid
		}));

		return {
			messages,
			citations,
			sessionId: data.sessionId || null
		};
	} catch {
		return { messages: [], citations: [], sessionId: null };
	}
}

/**
 * Translate document section or summary using Gemini translation service
 */
export async function translateContent(
	payload: TranslationPayload
): Promise<TranslationResponse> {
	const res = await fetch('/api/translate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(payload)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Translation request failed');
	}

	const data = await res.json();
	return {
		summary: data.summary || '',
		keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
		actionableItems: Array.isArray(data.actionableItems) ? data.actionableItems : [],
		language: payload.language
	};
}

/**
 * Natural-language / Semantic Search across indexed documents
 */
export async function searchDocuments(params: {
	query: string;
	team?: string;
	type?: string;
	limit?: number;
}): Promise<any[]> {
	const { query, team, type, limit = 10 } = params;

	const body: Record<string, unknown> = {
		query,
		limit,
		searchNodes: true
	};
	if (team && team !== 'All') {
		body.department = mapTeamToDepartment(team);
	}
	if (type && type !== 'All') {
		body.documentType = type.toLowerCase();
	}

	const res = await fetch('/api/search/vector', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		return [];
	}

	const data = await res.json();
	return data.results || [];
}
