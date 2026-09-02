export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { searchDocumentsAndChunks, ChunkSearchResult } from '@/lib/search/searchService';
import { ObjectId } from 'mongodb';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type ChatHistoryRecord = {
	_id?: ObjectId;
	sessionId: string;
	userId: string;
	docId?: string;
	messages: ChatMessage[];
	citations?: Array<{
		index: number;
		docId: string;
		nodeId: string;
		title?: string;
		sectionTitle?: string;
		pageRange?: { start?: number; end?: number };
		score?: number;
		uid?: string;
	}>;
	createdAt: Date;
	updatedAt: Date;
};

export async function POST(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await req.json();
		const sessionId: string = body.sessionId || `${session.sub}-${Date.now()}`;
		const clientMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
		const docId: string | undefined = body.docId || undefined;
		const topK: number = Math.max(1, Math.min(10, Number(body.topK) || 5));

		const historyCollection = await getCollection<ChatHistoryRecord>(
			process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
		);

		const historyFilter: Record<string, any> = {
			userId: session.sub,
			sessionId
		};
		if (docId) historyFilter.docId = docId;

		const existingHistory = await historyCollection.findOne(historyFilter);
		const historyMessages: ChatMessage[] = existingHistory?.messages || [];

		// Deduplicate client messages against history to prevent compounding duplication
		let newMessages: ChatMessage[] = [];
		if (clientMessages.length > historyMessages.length) {
			newMessages = clientMessages.slice(historyMessages.length);
		} else if (clientMessages.length > 0 && historyMessages.length === 0) {
			newMessages = clientMessages;
		} else if (clientMessages.length > 0) {
			const last = clientMessages[clientMessages.length - 1];
			if (last.role === 'user' && historyMessages[historyMessages.length - 1]?.content !== last.content) {
				newMessages = [last];
			}
		}

		const mergedMessages = [...historyMessages, ...newMessages];
		const lastUser = [...mergedMessages].reverse().find(m => m.role === 'user');
		const query = lastUser?.content?.trim() || '';

		if (!query) {
			return NextResponse.json({ error: 'No user query provided' }, { status: 400 });
		}

		// Retrieve candidate chunks using canonical search service
		const searchResult = await searchDocumentsAndChunks({
			query,
			session,
			documentId: docId,
			searchNodes: true,
			limit: topK
		});

		const topChunks = (searchResult.results as ChunkSearchResult[]) || [];

		// Build evidence-rich context blocks with raw chunk text
		const contextBlocks = topChunks
			.map(
				(c, i) =>
					`[#${i + 1}] Document: "${c.documentTitle}" | Section: "${c.title}" (Pages ${c.pageRange.start}-${c.pageRange.end})
Content:
${c.content}
Key Points: ${(c.keyPoints || []).join('; ')}`
			)
			.join('\n\n---\n\n');

		let reply = '';
		const geminiKey = process.env.GEMINI_API_KEY;

		if (geminiKey) {
			try {
				const genAI = new GoogleGenerativeAI(geminiKey);
				const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
				const systemInstruction = `You are a manager-focused document intelligence assistant for DocSetu / KMRL.
- Answer in English clearly and factually based on the provided context blocks.
- Highlight concrete decisions, deadlines, compliance guidelines, and responsible owners.
- GROUND your response in the provided context blocks.
- Explicitly cite your sources using [#N] corresponding to the context blocks.
- If the context blocks do not contain sufficient evidence to answer the question, clearly state what information is missing.`;

				const prompt = `${systemInstruction}

Context Blocks:
${contextBlocks || '(No matching context blocks found)'}

Conversation History:
${mergedMessages.slice(-6, -1).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

User Question:
${query}

Assistant Answer:`;

				const result = await model.generateContent(prompt);
				reply = result?.response?.text?.() || '';
			} catch (llmErr) {
				console.warn('[chat] Gemini synthesis failed, falling back to summary', llmErr);
			}
		}

		if (!reply) {
			if (topChunks.length > 0) {
				const focus = topChunks[0];
				reply = `Based on [#1] (${focus.documentTitle} - ${focus.title}):\n\n${focus.nodeSummary || focus.content.slice(0, 300)}`;
			} else {
				reply = 'No relevant information could be found in the authorized document corpus to answer this question.';
			}
		}

		const citations = topChunks.map((c, i) => ({
			index: i + 1,
			docId: c.documentId,
			nodeId: c.nodeId,
			score: c.score,
			title: c.documentTitle,
			sectionTitle: c.title,
			pageRange: c.pageRange,
			uid: c.uid
		}));

		const finalMessages: ChatMessage[] = [
			...mergedMessages,
			{ role: 'assistant', content: reply }
		];

		await historyCollection.updateOne(
			{ sessionId, userId: session.sub },
			{
				$set: {
					sessionId,
					userId: session.sub,
					docId: docId ?? undefined,
					messages: finalMessages,
					citations,
					updatedAt: new Date()
				},
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);

		return NextResponse.json({ reply, citations, sessionId });
	} catch (e) {
		console.error('Chat error:', e);
		return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
	}
}

export async function GET(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const { searchParams } = new URL(req.url);
		const sessionId = searchParams.get('sessionId');
		const docId = searchParams.get('docId');

		const historyCollection = await getCollection<ChatHistoryRecord>(
			process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
		);

		const filter: Record<string, any> = { userId: session.sub };
		if (sessionId) filter.sessionId = sessionId;
		if (docId) filter.docId = docId;

		const record = await historyCollection.findOne(filter);

		if (!record) {
			return NextResponse.json({ messages: [], sessionId: sessionId || null });
		}

		return NextResponse.json({
			sessionId: record.sessionId,
			docId: record.docId || null,
			messages: record.messages || [],
			citations: record.citations || [],
			updatedAt: record.updatedAt
		});
	} catch (err) {
		console.error('Chat history error:', err);
		return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const { searchParams } = new URL(req.url);
		const sessionId = searchParams.get('sessionId');
		const docId = searchParams.get('docId');

		const historyCollection = await getCollection<ChatHistoryRecord>(
			process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
		);

		const filter: Record<string, any> = { userId: session.sub };
		if (sessionId) filter.sessionId = sessionId;
		if (docId) filter.docId = docId;

		await historyCollection.deleteMany(filter);
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Chat history delete error:', err);
		return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
	}
}
