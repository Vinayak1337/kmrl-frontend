export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';
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
		pageRange?: { start?: number; end?: number };
		score?: number;
	}>;
	createdAt: Date;
	updatedAt: Date;
};

function scoreTextMatch(query: string, text: string): number {
	const terms = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
	const body = (text || '').toLowerCase();
	const matches = Array.from(terms).filter(t => body.includes(t)).length;
	return matches / Math.max(1, terms.size);
}

export async function POST(req: NextRequest) {
	// Require auth for chat (dashboard feature)
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await req.json();
		const sessionId: string = body.sessionId || `${session.sub}-${Date.now()}`;
		const clientMessages: ChatMessage[] = Array.isArray(body.messages)
			? body.messages
			: [];
		const docId: string | undefined = body.docId || undefined;
		const topK: number = Math.max(1, Math.min(10, Number(body.topK) || 5));

		const historyCollection = await getCollection<ChatHistoryRecord>(
			process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
		);
		const historyFilter: Record<string, unknown> = {
			userId: session.sub,
			docId: docId || null
		};
		if (sessionId) historyFilter.sessionId = sessionId;
		const existingHistory = await historyCollection
			.find(historyFilter)
			.sort({ updatedAt: -1 })
			.limit(1)
			.next();
		const historyMessages = existingHistory?.messages || [];
		const mergedMessages = [...historyMessages, ...clientMessages];
		const lastUser = [...mergedMessages].reverse().find(m => m.role === 'user');
		const query = lastUser?.content?.trim() || '';
		if (!query)
			return NextResponse.json(
				{ error: 'No user query provided' },
				{ status: 400 }
			);

		const collection = await getCollection<DocumentRecord>();

		// Fetch candidate nodes via keyword retrieval
		type NodeForChat = {
			id: string;
			pageRange?: { start: number; end: number };
			summary?: string;
			content?: string;
			keyPoints?: string[];
			actionableItems?: string[];
			uid?: string;
		};
		type Candidate = {
			docId: string;
			title: string;
			node: NodeForChat;
			score: number;
		};
		const candidates: Candidate[] = [];

		if (docId) {
			// Fetch nodes from node collection (preferred)
			const doc = await collection.findOne({ id: docId });
			const nodesCollection = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);
			const nodes = await nodesCollection
				.find({ docId })
				.sort({ order: 1 })
				.limit(500)
				.toArray();
			for (const node of nodes) {
				const text = [
					node.summary,
					node.content,
					...(node.keyPoints || []),
					...(node.actionableItems || []),
					...(node.keywords || [])
				].join(' ');
				const score = scoreTextMatch(query, text);
				candidates.push({
					docId,
					title: doc?.title || 'Untitled',
					node: {
						id: node.nodeId,
						uid: node.uid,
						pageRange: node.pageRange,
						summary: node.summary,
						content: node.content,
						keyPoints: node.keyPoints,
						actionableItems: node.actionableItems
					},
					score
				});
			}
			// Fallback to embedded nodes if present
			if (candidates.length === 0 && doc?.nodes) {
				for (const node of doc.nodes as any[]) {
					const text = [
						node.summary,
						node.content,
						...((node.keyPoints || []) as string[]),
						...((node.actionableItems || []) as string[]),
						...((node.keywords || []) as string[])
					].join(' ');
					const score = scoreTextMatch(query, text);
					const mapped: NodeForChat = {
						id: node.id || node.nodeId || 'node',
						uid: node.uid || `${doc.id}#${node.nodeId || node.id || 'node'}`,
						pageRange: node.pageRange,
						summary: node.summary,
						content: node.content,
						keyPoints: node.keyPoints,
						actionableItems: node.actionableItems
					};
					candidates.push({
						docId: doc.id,
						title: doc.title,
						node: mapped,
						score
					});
				}
			}
		} else {
			// Search recent nodes across documents
			const nodesCollection = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);
			const nodes = await nodesCollection
				.find({})
				.sort({ createdAt: -1 })
				.limit(500)
				.toArray();
			// Small doc title cache
			const docTitles = new Map<string, string>();
			for (const node of nodes) {
				if (!docTitles.has(node.docId)) {
					const d = await collection.findOne(
						{ id: node.docId },
						{ projection: { title: 1 } as any }
					);
					if (d) docTitles.set(node.docId, d.title);
				}
				const title = docTitles.get(node.docId) || 'Untitled';
				const text = [
					node.summary,
					node.content,
					...(node.keyPoints || []),
					...(node.actionableItems || []),
					...(node.keywords || [])
				].join(' ');
				const score = scoreTextMatch(query, text);
				candidates.push({
					docId: node.docId,
					title,
					node: {
						id: node.nodeId,
						uid: node.uid,
						pageRange: node.pageRange,
						summary: node.summary,
						content: node.content,
						keyPoints: node.keyPoints,
						actionableItems: node.actionableItems
					},
					score
				});
			}
			// Fallback to embedded nodes if node collection is empty
			if (candidates.length === 0) {
				const docs = await collection.find({}).limit(100).toArray();
				for (const d of docs) {
					for (const node of (d.nodes || []) as any[]) {
						const text = [
							node.summary,
							node.content,
							...((node.keyPoints || []) as string[])
						].join(' ');
						const score = scoreTextMatch(query, text);
						const mapped: NodeForChat = {
							id: node.id || node.nodeId || 'node',
							uid: node.uid || `${d.id}#${node.nodeId || node.id || 'node'}`,
							pageRange: node.pageRange,
							summary: node.summary,
							content: node.content,
							keyPoints: node.keyPoints,
							actionableItems: node.actionableItems
						};
						candidates.push({
							docId: d.id,
							title: d.title,
							node: mapped,
							score
						});
					}
				}
			}
		}

		candidates.sort((a, b) => b.score - a.score);
		const top = candidates.slice(0, topK);

		const contextBlocks = top
			.map(
				(c, i) =>
					`[#${i + 1}] Doc: ${c.title} | Node: ${c.node.id} | Pages ${
						c.node.pageRange?.start
					}-${c.node.pageRange?.end}
Summary: ${c.node.summary}
KeyPoints: ${(c.node.keyPoints || []).join('; ')}
Actionable: ${(c.node.actionableItems || []).join('; ')}`
			)
			.join('\n\n');

		let reply = '';
		const isSummaryRequest = /\b(summariz|summary|summarise|summaries)\b/i.test(
			query
		);
		const geminiKey = process.env.GEMINI_API_KEY;
		if (geminiKey) {
			try {
				const genAI = new GoogleGenerativeAI(geminiKey);
				const model = genAI.getGenerativeModel({
					model: 'gemini-2.0-flash-001'
				});
				const system = `You are a manager-focused assistant for KMRL.\n- Answer in English.\n- Emphasize decisions, deadlines, compliance, parameters, and cross-department impacts.\n- If information is insufficient, state what is missing.\n- Cite sources as [#N] referencing the context blocks.`;
				const prompt = isSummaryRequest
					? `${system}\n\nYou have been asked to provide a concise executive summary of the relevant documents. Use plain English, be concise (3-6 short paragraphs), and cite sources as [#N] from the context blocks.\n\nContext:\n${contextBlocks}\n\nUser request:\n${query}`
					: `${system}\n\nContext:\n${contextBlocks}\n\nUser question:\n${query}`;
				const result = await model.generateContent(prompt);
				reply = result?.response?.text?.() || '';
			} catch {}
		}

		if (!reply && top.length > 0) {
			if (isSummaryRequest) {
				const blocks = top
					.map((c, i) => {
						const pages = c.node.pageRange
							? `${c.node.pageRange.start}-${c.node.pageRange.end}`
							: 'unknown';
						const summaryText = c.node.summary?.trim().length
							? c.node.summary.trim()
							: c.node.content?.slice(0, 800) || 'No summary available.';
						return `[#${i + 1}] ${c.title} (pages ${pages}):\n${summaryText}`;
					})
					.join('\n\n');
				reply = `Executive summary of top ${top.length} matches:\n\n${blocks}`;
			} else {
				const focus = top[0];
				reply = `From [#1]: ${focus.node.summary || 'No summary available.'}`;
			}
		}

		const citations = top.map((c, i) => ({
			index: i + 1,
			docId: c.docId,
			nodeId: c.node.id,
			score: c.score,
			title: c.title,
			pageRange: c.node.pageRange,
			uid: c.node.uid
		}));

		const finalMessages: ChatMessage[] = [
			...mergedMessages,
			{ role: 'assistant', content: reply }
		];
		await historyCollection.updateOne(
			{ sessionId, userId: session.sub, docId: docId ?? undefined },
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
		console.error('Chat error', e);
		return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
	}
}

export async function GET(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const { searchParams } = new URL(req.url);
		const sessionId = searchParams.get('sessionId');
		const docId = searchParams.get('docId');
		const historyCollection = await getCollection<ChatHistoryRecord>(
			process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
		);
		const filter: Record<string, unknown> = { userId: session.sub };
		if (sessionId) filter.sessionId = sessionId;
		if (docId !== null) filter.docId = docId || null;
		const record = await historyCollection
			.find(filter)
			.sort({ updatedAt: -1 })
			.limit(1)
			.next();
		if (!record)
			return NextResponse.json({ messages: [], sessionId: sessionId || null });
		const response: Record<string, unknown> = {
			sessionId: record.sessionId,
			docId: record.docId || null,
			messages: record.messages,
			updatedAt: record.updatedAt
		};
		if ((record as any).citations) {
			response.citations = (record as any).citations;
		}
		return NextResponse.json(response);
	} catch (err) {
		console.error('Chat history error', err);
		return NextResponse.json(
			{ error: 'Failed to load history' },
			{ status: 500 }
		);
	}
}

export async function DELETE(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session)
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const { searchParams } = new URL(req.url);
		const sessionId = searchParams.get('sessionId');
		const docId = searchParams.get('docId');
		const historyCollection = await getCollection<ChatHistoryRecord>(
			process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
		);
		const filter: Record<string, unknown> = { userId: session.sub };
		if (sessionId) filter.sessionId = sessionId;
		if (docId !== null) filter.docId = docId || null;
		await historyCollection.deleteMany(filter);
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('Chat history delete error', err);
		return NextResponse.json(
			{ error: 'Failed to delete history' },
			{ status: 500 }
		);
	}
}
