export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection, getMongo } from '@/lib/mongo';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';
import { ObjectId } from 'mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';

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

// Enhanced search using vector similarity when available
async function findRelevantNodes(
	query: string,
	docId?: string,
	topK: number = 5
): Promise<
	Array<{
		docId: string;
		title: string;
		node: {
			id: string;
			pageRange?: { start: number; end: number };
			summary?: string;
			content?: string;
			keyPoints?: string[];
			actionableItems?: string[];
			uid?: string;
		};
		score: number;
	}>
> {
	const candidates: Array<{
		docId: string;
		title: string;
		node: {
			id: string;
			pageRange?: { start: number; end: number };
			summary?: string;
			content?: string;
			keyPoints?: string[];
			actionableItems?: string[];
			uid?: string;
		};
		score: number;
	}> = [];

	// Get collections we'll need
	const collection = await getCollection<DocumentRecord>();

	// First, let's check if we have any documents at all
	const totalDocs = await collection.countDocuments();
	const nodesCollection = await getCollection<DocumentNodeRecord>(
		process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
	);
	const totalNodes = await nodesCollection.countDocuments();

	console.log(`Database stats: ${totalDocs} documents, ${totalNodes} nodes`);

	if (totalDocs === 0 && totalNodes === 0) {
		console.log('No documents found in database');
		return [];
	}

	// Try vector search first if OpenAI is configured
	const openaiKey = process.env.OPENAI_API_KEY;
	if (openaiKey) {
		try {
			const { db } = await getMongo();
			const collectionName = process.env.MONGODB_COLLECTION || 'documents';
			const collection = db.collection(collectionName);

			const indexName = process.env.MONGODB_VECTOR_INDEX || 'vector_index';
			const embeddings = new OpenAIEmbeddings({
				apiKey: openaiKey,
				model: 'text-embedding-3-small'
			});

			const store = new MongoDBAtlasVectorSearch(embeddings, {
				collection,
				indexName,
				textKey: 'textContent',
				embeddingKey: 'embedding'
			});

			// Search for relevant chunks
			const vectorResults = await store.similaritySearchWithScore(
				query,
				topK * 2
			);

			for (const [doc, score] of vectorResults) {
				const meta = doc.metadata || {};

				// Filter by document if specified
				if (docId && meta.docId !== docId) continue;

				// Skip document summaries in favor of nodes for chat
				if (meta.type === 'document_summary') continue;

				const node = {
					id: meta.nodeId || 'unknown',
					uid: meta.uid,
					pageRange: meta.pageRange
						? {
								start: parseInt(meta.pageRange.split('-')[0]) || 1,
								end: parseInt(meta.pageRange.split('-')[1]) || 1
						  }
						: undefined,
					summary: meta.summary || doc.pageContent.substring(0, 500),
					content: doc.pageContent,
					keyPoints: meta.keywords ? meta.keywords.split(', ') : [],
					actionableItems: []
				};

				candidates.push({
					docId: meta.docId || '',
					title: meta.title || 'Untitled',
					node,
					score: 1 - score // Convert distance to similarity
				});
			}

			if (candidates.length > 0) {
				return candidates.slice(0, topK);
			}
		} catch (error) {
			console.warn(
				'Vector search failed in chat, falling back to keyword search:',
				error
			);
		}
	}

	// Fallback to existing keyword-based search - this is crucial for corpus search!
	console.log('Vector search returned no results, using keyword fallback');

	try {
		if (docId) {
			// Document-specific search
			const doc = await collection.findOne({ id: docId });
			const nodesCollection = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);
			const nodes = await nodesCollection
				.find({ docId })
				.sort({ order: 1 })
				.limit(50)
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

				if (score > 0.1) {
					// Only include relevant matches
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
			}
		} else {
			// Cross-document corpus search
			console.log('Searching across all documents for corpus query');

			// Try MongoDB text search first
			try {
				const textSearchNodes = await nodesCollection
					.find(
						{ $text: { $search: query } },
						{ score: { $meta: 'textScore' } }
					)
					.sort({ score: { $meta: 'textScore' } })
					.limit(20)
					.toArray();

				console.log(`Text search found ${textSearchNodes.length} nodes`);

				// Get document titles for the nodes
				const docIds = [...new Set(textSearchNodes.map(n => n.docId))];
				const docs = await collection
					.find({ id: { $in: docIds } }, { projection: { id: 1, title: 1 } })
					.toArray();
				const docTitleMap = new Map(docs.map(d => [d.id, d.title]));

				for (const node of textSearchNodes) {
					candidates.push({
						docId: node.docId,
						title: docTitleMap.get(node.docId) || 'Untitled',
						node: {
							id: node.nodeId,
							uid: node.uid,
							pageRange: node.pageRange,
							summary: node.summary,
							content: node.content,
							keyPoints: node.keyPoints,
							actionableItems: node.actionableItems
						},
						score: (node as any).score || 0.5
					});
				}
			} catch (textSearchError) {
				console.log('MongoDB text search failed, using manual keyword search');

				// Fallback to manual search if text indexes aren't available
				const allNodes = await nodesCollection
					.find({})
					.sort({ createdAt: -1 })
					.limit(200) // Limit for performance
					.toArray();

				console.log(`Manual search scanning ${allNodes.length} nodes`);

				const docTitles = new Map<string, string>();
				for (const node of allNodes) {
					// Get document title if not cached
					if (!docTitles.has(node.docId)) {
						const doc = await collection.findOne(
							{ id: node.docId },
							{ projection: { title: 1 } }
						);
						docTitles.set(node.docId, doc?.title || 'Untitled');
					}

					const text = [
						node.title || '',
						node.summary || '',
						node.content || '',
						...(node.keyPoints || []),
						...(node.actionableItems || []),
						...(node.keywords || [])
					].join(' ');

					const score = scoreTextMatch(query, text);

					if (score > 0.05) {
						// Lower threshold for manual search
						candidates.push({
							docId: node.docId,
							title: docTitles.get(node.docId) || 'Untitled',
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
				}
			}
		}

		// Sort by score and return top results
		candidates.sort((a, b) => b.score - a.score);
		console.log(`Keyword search found ${candidates.length} candidates`);
		return candidates.slice(0, topK);
	} catch (fallbackError) {
		console.error('Fallback search failed:', fallbackError);
		return [];
	}
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

		// Special handling for document listing requests
		const isListRequest =
			/\b(list|show|what documents|all documents|available|documents do you have)\b/i.test(
				query
			);

		if (isListRequest && !docId) {
			console.log('Handling document list request');

			try {
				const docs = await collection
					.find(
						{},
						{
							projection: {
								id: 1,
								title: 1,
								fullSummary: 1,
								nodeCount: 1,
								'metadata.department': 1,
								'metadata.documentType': 1,
								'metadata.createdAt': 1
							}
						}
					)
					.sort({ 'metadata.createdAt': -1 })
					.limit(20)
					.toArray();

				if (docs.length > 0) {
					const docList = docs
						.map((doc, i) => {
							const dept = doc.metadata?.department
								? ` (${doc.metadata.department})`
								: '';
							const type = doc.metadata?.documentType
								? ` - ${doc.metadata.documentType}`
								: '';
							const summary =
								doc.fullSummary?.substring(0, 150) +
								(doc.fullSummary?.length > 150 ? '...' : '');
							return `**${i + 1}. ${doc.title}**${dept}${type}\n${
								summary || 'No summary available.'
							}`;
						})
						.join('\n\n');

					const reply = `📋 **Available Documents (${docs.length} total):**\n\n${docList}\n\n💡 *Ask me questions about any of these documents or request specific information!*`;

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
								citations: [],
								updatedAt: new Date()
							},
							$setOnInsert: { createdAt: new Date() }
						},
						{ upsert: true }
					);

					return NextResponse.json({ reply, citations: [], sessionId });
				}
			} catch (listError) {
				console.error('Failed to list documents:', listError);
			}
		}

		// Try enhanced vector and keyword search
		const candidates = await findRelevantNodes(query, docId, topK);
		console.log(
			`Found ${candidates.length} relevant nodes for query: "${query}"`
		);

		const top = candidates.slice(0, topK);

		// If no results found, provide a helpful message
		if (top.length === 0) {
			console.log('No documents found for query');

			// Check if this is because there are no documents at all
			const totalDocs = await collection.countDocuments();
			const totalNodes = await nodesCollection.countDocuments();

			let reply = '';
			if (totalDocs === 0 && totalNodes === 0) {
				reply =
					"🚀 **Welcome to KMRL Document Assistant!**\n\nI don't see any documents in the system yet. To get started:\n\n1. **Upload Documents**: Go to the dashboard and use the document upload feature\n2. **Supported Formats**: PDFs, Word documents, text files, and HTML\n3. **After Upload**: I'll be able to answer questions about your documents\n\n💡 *Try uploading some policy documents, manuals, or reports to begin using the corpus search!*";
			} else if (!docId) {
				reply = `📚 I searched through **${totalDocs} documents** and **${totalNodes} sections** but couldn't find information related to "${query}".\n\n**Try these approaches:**\n\n🔍 **Different Keywords**: Use terms like:\n• "safety procedures"\n• "operational guidelines" \n• "compliance requirements"\n• "maintenance protocols"\n\n💬 **Specific Questions**: Ask like:\n• "What are the safety requirements?"\n• "How do I handle emergencies?"\n• "What are the inspection procedures?"\n\n📋 **Document Summaries**: Ask for "summary of all documents" to see what's available.`;
			} else {
				reply =
					"I couldn't find relevant information in this document for your question. Try asking about the document's main topics or use different keywords.";
			}

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
						citations: [],
						updatedAt: new Date()
					},
					$setOnInsert: { createdAt: new Date() }
				},
				{ upsert: true }
			);

			return NextResponse.json({ reply, citations: [], sessionId });
		}

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
		const isQuestionAbout =
			/\b(what|how|when|where|why|who|tell me about|explain)\b/i.test(query);

		const geminiKey = process.env.GEMINI_API_KEY;
		if (geminiKey) {
			try {
				const genAI = new GoogleGenerativeAI(geminiKey);
				const model = genAI.getGenerativeModel({
					model: 'gemini-2.5-flash'
				});

				console.log(`Generating AI response for ${top.length} context blocks`);

				const system = `You are a knowledgeable assistant for Kochi Metro Rail Limited (KMRL).

INSTRUCTIONS:
- Answer based ONLY on the provided context
- Be concise but comprehensive (2-4 paragraphs maximum)
- Emphasize practical information: decisions, deadlines, compliance requirements, and actionable items
- Always cite your sources using [#N] format
- If the context doesn't fully answer the question, say what information is missing
- Use clear, professional language suitable for managers and staff

CITATION FORMAT: Reference context blocks as [#1], [#2], etc.`;

				let prompt = '';
				if (isSummaryRequest) {
					prompt = `${system}\n\nTASK: Provide an executive summary of the relevant information from the context blocks.\n\nContext:\n${contextBlocks}\n\nUser request: ${query}\n\nProvide a comprehensive summary with key points and cite all sources.`;
				} else if (isQuestionAbout) {
					prompt = `${system}\n\nTASK: Answer the user's question based on the provided context.\n\nContext:\n${contextBlocks}\n\nUser question: ${query}\n\nProvide a detailed answer and cite your sources.`;
				} else {
					prompt = `${system}\n\nTASK: Help the user by providing relevant information from the context.\n\nContext:\n${contextBlocks}\n\nUser input: ${query}\n\nProvide helpful information and cite your sources.`;
				}

				const result = await model.generateContent(prompt);
				reply = result?.response?.text?.() || '';
				console.log(`AI generated response length: ${reply.length}`);
			} catch (aiError) {
				console.error('AI response generation failed:', aiError);
			}
		}

		// Fallback response if AI didn't generate one
		if (!reply && top.length > 0) {
			console.log('Generating fallback response');
			if (isSummaryRequest) {
				const blocks = top
					.map((c, i) => {
						const pages = c.node.pageRange
							? `${c.node.pageRange.start}-${c.node.pageRange.end}`
							: 'unknown';
						const summaryText = c.node.summary?.trim().length
							? c.node.summary.trim()
							: c.node.content?.slice(0, 400) || 'No summary available.';
						return `[#${i + 1}] **${
							c.title
						}** (pages ${pages}):\n${summaryText}`;
					})
					.join('\n\n');
				reply = `Here's a summary of the ${top.length} most relevant documents:\n\n${blocks}`;
			} else {
				// For specific questions, provide more detailed information
				if (top.length === 1) {
					const focus = top[0];
					const pages = focus.node.pageRange
						? ` (pages ${focus.node.pageRange.start}-${focus.node.pageRange.end})`
						: '';
					reply = `Based on **${focus.title}**${pages}:\n\n${
						focus.node.summary ||
						focus.node.content?.substring(0, 500) ||
						'Information not available.'
					}`;

					if (focus.node.keyPoints && focus.node.keyPoints.length > 0) {
						reply += `\n\n**Key Points:**\n${focus.node.keyPoints
							.map(kp => `• ${kp}`)
							.join('\n')}`;
					}

					if (
						focus.node.actionableItems &&
						focus.node.actionableItems.length > 0
					) {
						reply += `\n\n**Action Items:**\n${focus.node.actionableItems
							.map(ai => `• ${ai}`)
							.join('\n')}`;
					}
				} else {
					// Multiple relevant documents
					const summaries = top
						.slice(0, 3)
						.map((c, i) => {
							const pages = c.node.pageRange
								? ` (pages ${c.node.pageRange.start}-${c.node.pageRange.end})`
								: '';
							return `[#${i + 1}] **${c.title}**${pages}: ${
								c.node.summary?.substring(0, 200) || 'Summary not available.'
							}`;
						})
						.join('\n\n');

					reply = `I found ${top.length} relevant documents. Here are the top matches:\n\n${summaries}`;
					if (top.length > 3) {
						reply += `\n\n*And ${top.length - 3} more documents...*`;
					}
				}
			}
		}

		// Final fallback if still no reply
		if (!reply) {
			reply =
				"I apologize, but I couldn't generate a proper response to your question. Please try rephrasing your query or ask about specific topics.";
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
		return NextResponse.json(
			{
				error: 'Chat failed',
				details: e instanceof Error ? e.message : 'Unknown error'
			},
			{ status: 500 }
		);
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
