export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

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
		const messages: ChatMessage[] = Array.isArray(body.messages)
			? body.messages
			: [];
		const docId: string | undefined = body.docId || undefined;
		const topK: number = Math.max(1, Math.min(10, Number(body.topK) || 5));

		const lastUser = [...messages].reverse().find(m => m.role === 'user');
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
					...(node.actionableItems || [])
				].join(' ');
				const score = scoreTextMatch(query, text);
				candidates.push({
					docId,
					title: doc?.title || 'Untitled',
					node: {
						id: node.nodeId,
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
						...((node.actionableItems || []) as string[])
					].join(' ');
					const score = scoreTextMatch(query, text);
					const mapped: NodeForChat = {
						id: node.id || node.nodeId || 'node',
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
					...(node.actionableItems || [])
				].join(' ');
				const score = scoreTextMatch(query, text);
				candidates.push({
					docId: node.docId,
					title,
					node: {
						id: node.nodeId,
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
					}-${c.node.pageRange?.end}\nSummary: ${c.node.summary}\nKeyPoints: ${(
						c.node.keyPoints || []
					).join('; ')}\nActionable: ${(c.node.actionableItems || []).join(
						'; '
					)}`
			)
			.join('\n\n');

		let reply = '';
		const geminiKey = process.env.GEMINI_API_KEY;
		if (geminiKey) {
			try {
				const genAI = new GoogleGenerativeAI(geminiKey);
				const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
				const system = `You are a manager-focused assistant for KMRL.\n- Answer in English.\n- Emphasize decisions, deadlines, compliance, parameters, and cross-department impacts.\n- If information is insufficient, state what is missing.\n- Cite sources as [#N] referencing the context blocks.`;
				const prompt = `${system}\n\nContext:\n${contextBlocks}\n\nUser question:\n${query}`;
				const result = await model.generateContent(prompt);
				reply = result?.response?.text?.() || '';
			} catch {}
		}

		if (!reply && top.length > 0) {
			// Fallback heuristic reply in test mode
			const focus = top[0];
			reply = `From [#1]: ${focus.node.summary || 'No summary available.'}`;
		}

		const citations = top.map((c, i) => ({
			index: i + 1,
			docId: c.docId,
			nodeId: c.node.id,
			score: c.score
		}));

		return NextResponse.json({ reply, citations });
	} catch (e) {
		console.error('Chat error', e);
		return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
	}
}
