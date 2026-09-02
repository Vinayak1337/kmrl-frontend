export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { normalizeExtractedContent } from '@/lib/ingest/normalization';
import { chunkDocument } from '@/lib/ingest/chunker';
import { validateChunkCoverage } from '@/lib/ingest/validation';
import { buildPersistedChunk, ChunkEnrichmentData } from '@/lib/ingest/builder';
import { buildManagerMdPrompt, ManagerAnalysisJSON } from '@/lib/prompt';
import { callGeminiWithRetry } from '@/lib/ai/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

async function runGeminiEnrichment(
	text: string,
	apiKey: string,
	meta?: { department?: string; documentType?: string }
): Promise<ManagerAnalysisJSON | null> {
	try {
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
		const prompt = buildManagerMdPrompt(meta);

		const result = await callGeminiWithRetry(
			() =>
				model.generateContent({
					contents: [
						{
							role: 'user',
							parts: [{ text: prompt }, { text: `Document Content:\n${text.slice(0, 35000)}` }]
						}
					],
					generationConfig: {
						responseMimeType: 'application/json' as unknown as never
					}
				} as any),
			{ operationName: 'Feedback Reprocess Enrichment' }
		);

		const respText = result.response.text();
		return JSON.parse(respText) as ManagerAnalysisJSON;
	} catch (err) {
		console.warn('[feedback] Gemini reprocessing enrichment failed, using heuristic fallback', err);
		return null;
	}
}

export async function POST(
	req: NextRequest,
	ctx: { params: Promise<{ id: string }> }
) {
	const { id } = await ctx.params;
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await req.json();
		const { type = 'general', message = '', reprocess = true } = body || {};

		const docsColl = await getCollection<DocumentRecord>();
		const doc = await docsColl.findOne({ id });
		if (!doc) {
			return NextResponse.json({ error: 'Document not found' }, { status: 404 });
		}

		const feedback = {
			id: `fb-${Date.now()}`,
			type: String(type),
			message: String(message || ''),
			createdAt: new Date(),
			createdBy: session.sub,
			status: reprocess ? 'reprocess-completed' : 'recorded'
		};

		// Reprocess document using recovered raw source content
		if (reprocess && doc.raw && doc.raw.content && doc.raw.type) {
			try {
				const apiKey = process.env.GEMINI_API_KEY;
				console.log(`[feedback] REPROCESS_STARTED | docId=${id} | rawType=${doc.raw.type}`);

				// 1. Re-normalize from raw content
				const normalized = await normalizeExtractedContent({
					type: doc.raw.type,
					content: doc.raw.content,
					filename: doc.title,
					title: doc.title
				});

				// 2. Re-chunk
				const rawChunks = chunkDocument(normalized, id);
				console.log(`[feedback] RECHUNK_COMPLETED | docId=${id} | chunkCount=${rawChunks.length}`);

				// 2.5 Validate chunk coverage before proceeding
				const validation = validateChunkCoverage(normalized, rawChunks);
				if (!validation.valid) {
					console.error(`[feedback] CHUNK_VALIDATION_FAILED | docId=${id} | errors=${validation.errors.join('; ')}`);
					return NextResponse.json(
						{
							error: 'Reprocess chunk validation failed',
							errors: validation.errors,
							metrics: validation.metrics
						},
						{ status: 422 }
					);
				}

				// 3. AI Enrichment
				let aiAnalysis: ManagerAnalysisJSON | null = null;
				if (apiKey && normalized.fullText.trim().length > 0) {
					aiAnalysis = await runGeminiEnrichment(normalized.fullText, apiKey, {
						department: doc.metadata?.department,
						documentType: doc.metadata?.documentType
					});
				}

				// 4. Build canonical persisted chunks
				const aiNodes = aiAnalysis?.nodes || [];
				const newChunks: DocumentNodeRecord[] = rawChunks.map((chunk, idx) => {
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
							: chunk.text.slice(0, 300),
						summaryMd: aiNode?.summaryMd,
						keyPoints: Array.isArray(aiNode?.keyPoints) ? aiNode.keyPoints : [],
						keyPointsMd: aiNode?.keyPointsMd,
						actionableItems: Array.isArray(aiNode?.actionableItems)
							? aiNode.actionableItems.map(a =>
									typeof a === 'string' ? a : `${a.owner ? a.owner + ': ' : ''}${a.action || ''}`
							  )
							: [],
						actionsMd: aiNode?.actionsMd,
						criticalFlags: aiNode?.criticalFlags,
						crossDepartments: aiNode?.crossDepartments
					};

					return buildPersistedChunk(
						chunk,
						id,
						rawChunks.length,
						{
							department: doc.metadata?.department,
							documentType: doc.metadata?.documentType,
							tags: doc.metadata?.tags || []
						},
						enrichment
					);
				});

				// 5. Safe swap: insert new chunks, delete old chunks
				const nodesColl = await getCollection<DocumentNodeRecord>(
					process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
				);

				if (newChunks.length > 0) {
					await nodesColl.deleteMany({ docId: id });
					await nodesColl.insertMany(newChunks);
				}

				// 6. Update document record
				const overallSummary =
					(aiAnalysis?.overallMd
						? aiAnalysis.overallMd.replace(/[#*_`]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600)
						: null) ||
					newChunks.map(c => c.summary).slice(0, 2).join(' ') ||
					doc.fullSummary;

				const overallMd = aiAnalysis?.overallMd || doc.overallMd;

				await docsColl.updateOne(
					{ id },
					{
						$set: {
							nodeCount: newChunks.length,
							fullSummary: overallSummary,
							overallMd,
							'metadata.updatedAt': new Date()
						},
						$push: {
							feedback: feedback as any,
							history: {
								id: `ev-${Date.now()}`,
								type: 'reprocessed',
								by: session.sub,
								at: new Date(),
								feedbackId: feedback.id
							} as any
						}
					}
				);

				console.log(`[feedback] REPROCESS_COMPLETED | docId=${id} | newChunks=${newChunks.length}`);
				return NextResponse.json({ ok: true, reprocessed: true, nodeCount: newChunks.length });
			} catch (reprocessErr) {
				console.error('[feedback] Reprocessing execution error:', reprocessErr);
				// Still record feedback
			}
		}

		// Just record feedback
		await docsColl.updateOne(
			{ id },
			{
				$push: { feedback: feedback as any }
			}
		);

		return NextResponse.json({ ok: true, reprocessed: false });
	} catch (e) {
		console.error('Feedback error:', e);
		return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
	}
}
