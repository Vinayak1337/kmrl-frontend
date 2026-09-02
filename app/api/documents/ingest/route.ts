export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, buildDocumentAccessFilter, isDocumentAccessible } from '@/lib/auth';
import { getCollection, ensureDocumentIndexes, ensureNodeIndexes } from '@/lib/mongo';
import { prisma } from '@/lib/prisma';
import { normalizeExtractedContent, RawDocumentInput } from '@/lib/ingest/normalization';
import { chunkDocument } from '@/lib/ingest/chunker';
import { validateChunkCoverage } from '@/lib/ingest/validation';
import { buildPersistedChunk, buildPersistedDocument, ChunkEnrichmentData } from '@/lib/ingest/builder';
import { buildManagerMdPrompt, ManagerAnalysisJSON } from '@/lib/prompt';
import { callGeminiWithRetry } from '@/lib/ai/gemini';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

interface IngestPayload {
	documents?: RawDocumentInput[];
	html?: string;
	title?: string;
	department?: string;
	documentType?: string;
	tags?: string[];
}

function sentenceSummary(text: string, maxChars = 320): string {
	const cleaned = (text || '').replace(/\s+/g, ' ').trim();
	if (!cleaned) return '';
	const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
	let out = '';
	for (const s of parts) {
		if ((out + ' ' + s).length > maxChars) break;
		out = out ? `${out} ${s}` : s;
		if (out.length >= 100) break;
	}
	return out || cleaned.slice(0, maxChars);
}

function extractKeyPointsHeuristic(text: string): string[] {
	const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
	const bullets = lines
		.filter(l => /^[-*•\d+.]\s+/.test(l))
		.map(l => l.replace(/^[-*•\d+.]\s+/, '').trim())
		.filter(l => l.length >= 15 && l.length <= 250);
	if (bullets.length > 0) return bullets.slice(0, 6);

	// Fallback to top sentences
	const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 25);
	return sentences.slice(0, 4);
}

function extractActionsHeuristic(text: string): string[] {
	const actionRegex = /\b(ensure|must|shall|review|submit|approve|notify|inspect|verify|audit|implement|update|dispatch|complete)\b/i;
	const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim());
	return sentences.filter(s => actionRegex.test(s) && s.length >= 20 && s.length <= 200).slice(0, 5);
}

async function runGeminiEnrichment(
	text: string,
	images: Array<{ base64: string; mimeType: string }>,
	apiKey: string,
	meta?: { department?: string; documentType?: string }
): Promise<ManagerAnalysisJSON | null> {
	try {
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
		const prompt = buildManagerMdPrompt(meta);

		const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
			{ text: prompt },
			{ text: `Document Content:\n${text.slice(0, 35000)}` }
		];

		for (const im of (images || []).slice(0, 4)) {
			if (im?.base64 && im?.mimeType && im.mimeType.startsWith('image/')) {
				parts.push({ inlineData: { data: im.base64, mimeType: im.mimeType } });
			}
		}

		const result = await callGeminiWithRetry(
			() =>
				model.generateContent({
					contents: [{ role: 'user', parts }],
					generationConfig: {
						responseMimeType: 'application/json' as unknown as never
					}
				} as any),
			{ operationName: 'Ingestion Gemini Enrichment' }
		);

		const respText = result.response.text();
		return JSON.parse(respText) as ManagerAnalysisJSON;
	} catch (err) {
		console.warn('[ingest] Gemini enrichment call failed, using heuristic extraction', err);
		return null;
	}
}

export async function POST(request: NextRequest) {
	const startTime = Date.now();
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = (await request.json()) as IngestPayload;

		// Normalize raw documents from payload
		let rawDocs: RawDocumentInput[] = [];
		if (Array.isArray(body.documents) && body.documents.length > 0) {
			rawDocs = body.documents;
		} else if (body.html) {
			rawDocs = [{ type: 'html', content: body.html, filename: body.title || 'document.html' }];
		}

		if (rawDocs.length === 0) {
			return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
		}

		await ensureDocumentIndexes();
		await ensureNodeIndexes();

		const docsCollection = await getCollection<DocumentRecord>();
		const nodesCollection = await getCollection<DocumentNodeRecord>(
			process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
		);

		const apiKey = process.env.GEMINI_API_KEY;
		const results = [];

		for (let i = 0; i < rawDocs.length; i++) {
			const rawDoc = rawDocs[i];
			const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
			const filename = rawDoc.filename || body.title || `doc-${i + 1}`;
			const title = body.title || filename.replace(/\.[^/.]+$/, '');
			const department = body.department || undefined;
			const documentType = body.documentType || undefined;
			const tags = Array.isArray(body.tags) ? body.tags : [];

			// 1. Telemetry: INGEST_ACCEPTED & FILE_DECODED
			console.log(
				`[ingest] INGEST_ACCEPTED | docId=${docId} | filename=${filename} | type=${rawDoc.type}`
			);
			console.log(
				`[ingest] FILE_DECODED | docId=${docId} | rawLength=${rawDoc.content?.length || 0} chars`
			);

			// 2. EXTRACTION
			console.log(`[ingest] EXTRACTION_STARTED | docId=${docId}`);
			const normalized = await normalizeExtractedContent({
				type: rawDoc.type,
				content: rawDoc.content,
				filename,
				title
			});
			console.log(
				`[ingest] EXTRACTION_COMPLETED | docId=${docId} | pages=${normalized.pageCount} | chars=${normalized.fullText.length}`
			);

			// 3. CHUNKING
			console.log(`[ingest] CHUNKING_STARTED | docId=${docId}`);
			const rawChunks = chunkDocument(normalized, docId);
			console.log(
				`[ingest] CHUNKING_COMPLETED | docId=${docId} | chunkCount=${rawChunks.length}`
			);

			// 3.5 CHUNK VALIDATION
			const validation = validateChunkCoverage(normalized, rawChunks);
			if (!validation.valid) {
				console.error(
					`[ingest] CHUNK_VALIDATION_FAILED | docId=${docId} | errors=${validation.errors.join('; ')}`
				);
				return NextResponse.json(
					{
						error: 'Chunk validation failed',
						stage: 'CHUNKING',
						errors: validation.errors,
						metrics: validation.metrics
					},
					{ status: 422 }
				);
			}

			// 4. AI ENRICHMENT
			console.log(`[ingest] AI_STARTED | docId=${docId}`);
			let aiAnalysis: ManagerAnalysisJSON | null = null;
			if (apiKey && normalized.fullText.trim().length > 0) {
				aiAnalysis = await runGeminiEnrichment(
					normalized.fullText,
					rawChunks.flatMap(c => c.images || []),
					apiKey,
					{ department, documentType }
				);
			}
			console.log(
				`[ingest] AI_COMPLETED | docId=${docId} | status=${aiAnalysis ? 'enriched' : 'heuristic'}`
			);

			// 5. BUILD PERSISTED CHUNKS
			const aiNodes = aiAnalysis?.nodes || [];
			const persistedChunks: DocumentNodeRecord[] = rawChunks.map((chunk, idx) => {
				// Match chunk with AI node by page range or index
				const aiNode =
					aiNodes.find(
						n =>
							n.pageRange &&
							n.pageRange.start <= chunk.pageEnd &&
							n.pageRange.end >= chunk.pageStart
					) || aiNodes[idx];

				const enrichment: ChunkEnrichmentData = {
					title: aiNode?.content ? undefined : `Section ${chunk.order}`,
					summary: aiNode?.summaryMd
						? aiNode.summaryMd.replace(/[#*_`]+/g, ' ').replace(/\s+/g, ' ').trim()
						: sentenceSummary(chunk.text),
					summaryMd: aiNode?.summaryMd,
					keyPoints: Array.isArray(aiNode?.keyPoints) && aiNode.keyPoints.length > 0
						? aiNode.keyPoints
						: extractKeyPointsHeuristic(chunk.text),
					keyPointsMd: aiNode?.keyPointsMd,
					actionableItems: Array.isArray(aiNode?.actionableItems) && aiNode.actionableItems.length > 0
						? aiNode.actionableItems.map(a => (typeof a === 'string' ? a : `${a.owner ? a.owner + ': ' : ''}${a.action || ''}`))
						: extractActionsHeuristic(chunk.text),
					actionsMd: aiNode?.actionsMd,
					criticalFlags: aiNode?.criticalFlags,
					crossDepartments: aiNode?.crossDepartments
				};

				return buildPersistedChunk(chunk, docId, rawChunks.length, { department, documentType, tags }, enrichment);
			});

			// 6. BUILD PERSISTED DOCUMENT
			const overallSummary =
				(aiAnalysis?.overallMd
					? aiAnalysis.overallMd.replace(/[#*_`]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600)
					: null) ||
				persistedChunks.map(c => c.summary).slice(0, 2).join(' ') ||
				sentenceSummary(normalized.fullText, 400);

			const overallMd =
				aiAnalysis?.overallMd ||
				`### Executive Summary\n\n${overallSummary}\n\n### Key Sections\n` +
					persistedChunks.map(c => `* **${c.title}** (Pages ${c.pageRange.start}-${c.pageRange.end}): ${c.summary}`).join('\n');

			const persistedDoc = buildPersistedDocument({
				id: docId,
				title,
				normalized,
				nodeCount: persistedChunks.length,
				overallSummary,
				overallMd,
				department,
				documentType,
				tags,
				uploadedBy: session.sub,
				chunks: persistedChunks
			});

			// 7. PERSISTENCE WITH COMPENSATING CLEANUP
			console.log(`[ingest] PERSIST_STARTED | docId=${docId}`);
			try {
				if (persistedChunks.length > 0) {
					await nodesCollection.insertMany(persistedChunks);
					console.log(`[ingest] CHUNKS_WRITTEN | docId=${docId} | count=${persistedChunks.length}`);
				}
				await docsCollection.insertOne(persistedDoc);
				console.log(`[ingest] DOCUMENT_WRITTEN | docId=${docId}`);
			} catch (persistErr) {
				console.error(`[ingest] PERSIST_FAILED | docId=${docId} - executing rollback`, persistErr);
				await nodesCollection.deleteMany({ docId });
				await docsCollection.deleteOne({ id: docId });
				throw persistErr;
			}

			// 8. AUDIT LOG
			try {
				const isHex24 = /^[0-9a-fA-F]{24}$/.test(session.sub);
				let actorObjectId = isHex24 ? session.sub : null;
				if (!actorObjectId) {
					const existingUser = await prisma.user.findFirst({ select: { id: true } });
					actorObjectId = existingUser?.id || '000000000000000000000001';
				}
				await prisma.userAudit.create({
					data: {
						actorId: actorObjectId,
						targetUserId: actorObjectId,
						action: 'INGEST_DOCUMENT',
						details: {
							documentId: docId,
							title,
							nodeCount: persistedChunks.length,
							department,
							documentType
						}
					}
				});
			} catch (auditErr) {
				console.warn('[ingest] userAudit log error:', auditErr);
			}

			console.log(
				`[ingest] INGEST_COMPLETED | docId=${docId} | duration=${Date.now() - startTime}ms`
			);

			results.push({
				documentId: docId,
				title,
				summary: overallSummary,
				nodeCount: persistedChunks.length,
				department,
				documentType
			});
		}

		if (results.length === 1) {
			return NextResponse.json(
				{
					success: true,
					...results[0]
				},
				{ status: 201 }
			);
		}

		return NextResponse.json(
			{
				success: true,
				documentsProcessed: results.length,
				summaries: results
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('[ingest] Ingestion pipeline failure:', error);
		return NextResponse.json(
			{
				error: 'Failed to ingest document',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// GET endpoint to retrieve documents
export async function GET(request: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { searchParams } = new URL(request.url);
		const documentId = searchParams.get('id');
		const department = searchParams.get('department');
		const documentType = searchParams.get('type');
		const limit = parseInt(searchParams.get('limit') || '20');
		const page = parseInt(searchParams.get('page') || '0');
		const pageSize = parseInt(searchParams.get('pageSize') || '20');

		const docsCollection = await getCollection<DocumentRecord>();

		// 1. Single Document Retrieval
		if (documentId) {
			const document = await docsCollection.findOne({ id: documentId });
			if (!document) {
				return NextResponse.json({ error: 'Document not found' }, { status: 404 });
			}

			// IDOR Security Check: enforce user department grants
			if (!isDocumentAccessible(session, document)) {
				return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
			}

			// Attach nodes from document_nodes collection
			try {
				const nodesCollection = await getCollection<DocumentNodeRecord>(
					process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
				);
				const nodes = await nodesCollection
					.find({ docId: documentId })
					.sort({ order: 1 })
					.toArray();
				(document as any).nodes = nodes;
				if (!document.nodeCount) (document as any).nodeCount = nodes.length;
			} catch {}

			return NextResponse.json(document, { status: 200 });
		}

		// 2. Listing Documents with RBAC
		const accessFilter = buildDocumentAccessFilter(session, 'documents');
		const filter: Record<string, any> = { ...accessFilter };
		if (department && department !== 'All') filter['metadata.department'] = department;
		if (documentType && documentType !== 'All') filter['metadata.documentType'] = documentType.toLowerCase();

		const totalCount = await docsCollection.countDocuments(filter);
		const effectivePageSize = pageSize > 0 ? pageSize : limit;
		const skip = Math.max(0, page) * Math.max(1, effectivePageSize);

		const documents = await docsCollection
			.find(filter)
			.sort({ 'metadata.createdAt': -1 })
			.skip(skip)
			.limit(effectivePageSize)
			.toArray();

		const summaries = documents.map(doc => ({
			id: doc.id,
			title: doc.title || 'Untitled',
			summary: doc.fullSummary || '',
			nodeCount: doc.nodeCount || (Array.isArray(doc.nodes) ? doc.nodes.length : 0),
			createdAt: doc.metadata?.createdAt || null,
			department: doc.metadata?.department || null,
			documentType: doc.metadata?.documentType || null,
			tags: doc.metadata?.tags || []
		}));

		return NextResponse.json({
			documents: summaries,
			total: summaries.length,
			totalCount,
			page: isNaN(page) ? 0 : page,
			pageSize: effectivePageSize
		});
	} catch (error) {
		console.error('[ingest] Document retrieval error:', error);
		return NextResponse.json(
			{
				error: 'Failed to retrieve documents',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
