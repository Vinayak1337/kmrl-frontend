export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { getMongo, getCollection } from '@/lib/mongo';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

interface SearchResult {
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
	type?: 'document' | 'node';
	uid?: string;
	pageRange?: string;
}

export async function GET(req: NextRequest) {
	try {
		// Require authentication
		const token = (await cookies()).get(AUTH_COOKIE)?.value;
		const session = token ? verifySession(token) : null;
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const url = new URL(req.url);
		const query =
			url.searchParams.get('query') || url.searchParams.get('q') || '';
		const department = url.searchParams.get('department');
		const documentType = url.searchParams.get('documentType');
		const searchNodes = url.searchParams.get('searchNodes') === 'true';
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

		if (!query.trim()) {
			return NextResponse.json({ results: [] }, { status: 200 });
		}

		const results: SearchResult[] = [];

		// First, try vector search if OpenAI is configured
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

				const vectorResults = await store.similaritySearchWithScore(
					query,
					limit * 2
				);

				for (const [doc, score] of vectorResults) {
					const meta = doc.metadata || {};

					// Apply filters
					if (department && meta.department !== department) continue;
					if (documentType && meta.documentType !== documentType) continue;
					if (searchNodes && meta.type !== 'document_node') continue;
					if (!searchNodes && meta.type === 'document_node') continue;

					const result: SearchResult = {
						id: meta.docId || '',
						title: meta.title || 'Untitled',
						summary: meta.summary || doc.pageContent.substring(0, 300) + '...',
						department: meta.department,
						documentType: meta.documentType,
						similarity: score,
						tags: meta.keywords ? meta.keywords.split(', ') : [],
						type: meta.type === 'document_node' ? 'node' : 'document',
						uid: meta.uid,
						pageRange: meta.pageRange
					};

					results.push(result);
				}
			} catch (error) {
				console.warn(
					'Vector search failed, falling back to text search:',
					error
				);
			}
		}

		// Fallback to traditional search if vector search failed or no results
		if (results.length === 0) {
			if (searchNodes) {
				// Search in nodes
				const nodesCollection = await getCollection<DocumentNodeRecord>(
					process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
				);

				const filter: any = {
					$text: { $search: query }
				};

				if (department) filter.department = department;
				if (documentType) filter.documentType = documentType;

				const nodes = await nodesCollection
					.find(filter, { score: { $meta: 'textScore' } })
					.sort({ score: { $meta: 'textScore' } })
					.limit(limit)
					.toArray();

				for (const node of nodes) {
					results.push({
						id: node.docId,
						title: node.title || `Section ${node.order}`,
						summary: node.summary || '',
						department: node.department,
						documentType: node.documentType,
						createdAt: node.createdAt,
						tags: node.tags || [],
						keywords: node.keywords || [],
						type: 'node',
						uid: node.uid,
						pageRange: `${node.pageRange.start}-${node.pageRange.end}`
					});
				}
			} else {
				// Search in documents
				const documentsCollection = await getCollection<DocumentRecord>();

				const filter: any = {
					$text: { $search: query }
				};

				if (department) filter['metadata.department'] = department;
				if (documentType) filter['metadata.documentType'] = documentType;

				const docs = await documentsCollection
					.find(filter, { score: { $meta: 'textScore' } })
					.sort({ score: { $meta: 'textScore' } })
					.limit(limit)
					.toArray();

				for (const doc of docs) {
					results.push({
						id: doc.id,
						title: doc.title,
						summary: doc.fullSummary || '',
						department: doc.metadata.department,
						documentType: doc.metadata.documentType,
						createdAt: doc.metadata.createdAt,
						nodeCount: doc.nodeCount,
						tags: doc.metadata.tags || [],
						keywords: doc.keywords || [],
						type: 'document'
					});
				}
			}
		}

		// Sort by relevance score if available
		results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

		return NextResponse.json(
			{
				results: results.slice(0, limit),
				total: results.length,
				query,
				searchMode: searchNodes ? 'nodes' : 'documents'
			},
			{ status: 200 }
		);
	} catch (e) {
		console.error('Search error', e);
		return NextResponse.json({ error: 'Search failed' }, { status: 500 });
	}
}
