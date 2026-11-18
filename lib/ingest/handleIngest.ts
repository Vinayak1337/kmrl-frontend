import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { enrichChunks, aiNodeFor, aiNodeTitle } from '@/lib/ingest/enrich';
import type { JwtUser } from '@/lib/auth';
import { getCollection, getMongo, ensureDocumentIndexes, ensureNodeIndexes } from '@/lib/mongo';
import { prisma } from '@/lib/prisma';
import { ExtractionError, normalizeExtractedContent, RawDocumentInput } from '@/lib/ingest/normalization';
import { chunkDocument, sourceSectionTitle } from '@/lib/ingest/chunker';
import { validateChunkCoverage } from '@/lib/ingest/validation';
import { buildPersistedChunk, buildPersistedDocument, ChunkEnrichmentData } from '@/lib/ingest/builder';
import { classificationSuggestion } from '@/lib/ingest/classification';
import type { EnrichmentContext, ManagerAnalysisJSON } from '@/lib/prompt';
import { VALID_LANGUAGES } from '@/lib/languages';
import { stripSummaryHeading } from '@/adapters/documentAdapter';
import { canIngestDocument } from '@/lib/documentPermissions';
import type { AnalysisProgress, ClassificationValues, DocumentRecord, DocumentNodeRecord, IngestStage } from '@/types/documents';

export interface IngestPayload {
	language?: string;
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

export async function ingestDocuments(session: JwtUser, body: IngestPayload, options?: { documentId?: string; onStage?: (stage: IngestStage, analysis?: AnalysisProgress) => Promise<void>; correction?: { jobId: string; before: ClassificationValues; value: ClassificationValues; note?: string } }): Promise<NextResponse> {
	const startTime = Date.now();
	try {
		if (!canIngestDocument(session, body.department, body.documentType)) {
			return NextResponse.json({ error: 'You do not have permission to add this document type to this team.' }, { status: 403 });
		}

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

		if (options?.documentId && rawDocs.length !== 1) return NextResponse.json({ error: 'Stable document ID requires exactly one document' }, { status: 400 });

		await ensureDocumentIndexes();
		await ensureNodeIndexes();

		const docsCollection = await getCollection<DocumentRecord>();
		const nodesCollection = await getCollection<DocumentNodeRecord>(
			process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
		);

		const results = [];

		for (let i = 0; i < rawDocs.length; i++) {
			const rawDoc = rawDocs[i];
			const docId = options?.documentId || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
			if (options?.documentId && !options.correction) {
				const existing = await docsCollection.findOne({ id: docId });
				if (existing) {
					const count = await nodesCollection.countDocuments({ docId });
					if (existing.nodeCount === count && count > 0) {
						return NextResponse.json({ success: true, documentId: docId, title: existing.title, summary: existing.fullSummary, nodeCount: count, department: existing.metadata?.department, documentType: existing.metadata?.documentType }, { status: 201 });
					}
					return NextResponse.json({ error: 'Existing document is incomplete; manual repair required' }, { status: 409 });
				}
			}
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
			await options?.onStage?.('extracting');
			console.log(`[ingest] EXTRACTION_STARTED | docId=${docId}`);
			let normalized;
			try {
				normalized = await normalizeExtractedContent({
					type: rawDoc.type,
					content: rawDoc.content,
					filename,
					title
				});
			} catch (err) {
				if (err instanceof ExtractionError) {
					return NextResponse.json({ error: err.message, stage: 'EXTRACTION' }, { status: 422 });
				}
				throw err;
			}
			console.log(
				`[ingest] EXTRACTION_COMPLETED | docId=${docId} | pages=${normalized.pageCount} | chars=${normalized.fullText.length}`
			);

			// 3. CHUNKING
			await options?.onStage?.('organizing');
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
			await options?.onStage?.('analyzing');
			console.log(`[ingest] AI_STARTED | docId=${docId}`);
			const context: EnrichmentContext = { department, documentType };
			if (options?.correction) context.correction = { tags, note: options.correction.note };
			const reportPages = normalized.format === 'pdf' ? options?.onStage : undefined;
			const aiAnalysis: ManagerAnalysisJSON | null = await enrichChunks(
				rawChunks, context, options?.correction ? 'correction' : 'ingest',
				options?.correction ? startTime + 270_000 : undefined,
				reportPages && (progress => reportPages('analyzing', { ...progress, totalPages: normalized.pageCount })
					.catch(error => { console.warn('[ingest] could not publish page progress', error); })),
			);
			if (options?.correction && (!aiAnalysis?.overallMd || !rawChunks.every((chunk, index) => aiNodeFor(aiAnalysis.nodes, chunk, index, rawChunks.length)?.summaryMd))) {
				return NextResponse.json({ error: 'The model did not rebuild every section. Please retry the correction.' }, { status: 422 });
			}
			console.log(
				`[ingest] AI_COMPLETED | docId=${docId} | status=${aiAnalysis ? 'enriched' : 'heuristic'}`
			);

			// 5. BUILD PERSISTED CHUNKS
			const aiNodes = aiAnalysis?.nodes || [];
			const persistedChunks: DocumentNodeRecord[] = rawChunks.map((chunk, idx) => {
				// Match chunk with AI node by page range or index
				const aiNode = aiNodeFor(aiNodes, chunk, idx, rawChunks.length);

				const enrichment: ChunkEnrichmentData = {
					title: aiNodeTitle(aiNode) || sourceSectionTitle(chunk.text),
					summary: aiNode?.summaryMd
						? aiNode.summaryMd.replace(/[#*_`]+/g, ' ').replace(/\s+/g, ' ').trim()
						: sentenceSummary(chunk.text),
					summaryMd: aiNode?.summaryMd,
					keyPoints: Array.isArray(aiNode?.keyPoints) && aiNode.keyPoints.length > 0
						? aiNode.keyPoints
						: extractKeyPointsHeuristic(chunk.text),
					keyPointsMd: aiNode?.keyPointsMd,
					actionableItems: Array.isArray(aiNode?.actionableItems)
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
					? stripSummaryHeading(aiAnalysis.overallMd).replace(/[#*_`]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600)
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

			persistedDoc.classificationSuggestion = classificationSuggestion(aiAnalysis);

			if (body.language && VALID_LANGUAGES.includes(body.language)) {
				persistedDoc.language = body.language;
			}

			// 7. PERSISTENCE WITH COMPENSATING CLEANUP
			await options?.onStage?.('saving');
			console.log(`[ingest] PERSIST_STARTED | docId=${docId}`);
			if (options?.correction) {
				const correction = options.correction;
				const { client } = await getMongo();
				const at = new Date();
				const applied = await client.withSession(mongoSession => mongoSession.withTransaction(async () => {
					const result = await docsCollection.updateOne({ id: docId, classificationReprocessId: correction.jobId }, {
						$set: {
							totalPages: persistedDoc.totalPages,
							nodeCount: persistedDoc.nodeCount,
							fullSummary: persistedDoc.fullSummary,
							overallMd: persistedDoc.overallMd,
							keywords: persistedDoc.keywords,
							searchableText: persistedDoc.searchableText,
							classificationSuggestion: persistedDoc.classificationSuggestion,
							classificationAppliedId: correction.jobId,
							'raw.text': normalized.fullText,
							...(department ? { 'metadata.department': department } : {}),
							...(documentType ? { 'metadata.documentType': documentType } : {}),
							'metadata.tags': tags,
							'metadata.updatedAt': at,
						},
						$unset: { nodes: '', classificationReprocessId: '', ...(!department ? { 'metadata.department': '' } : {}), ...(!documentType ? { 'metadata.documentType': '' } : {}) },
						$push: { classificationHistory: { at, by: session.sub, before: correction.before, after: correction.value, ...(correction.note ? { note: correction.note } : {}) } },
					}, { session: mongoSession });
					if (!result.matchedCount) return false;
					await nodesCollection.bulkWrite(persistedChunks.map(chunk => ({
						replaceOne: { filter: { docId, uid: chunk.uid }, replacement: chunk, upsert: true },
					})), { session: mongoSession });
					await nodesCollection.deleteMany({ docId, uid: { $nin: persistedChunks.map(chunk => chunk.uid) } }, { session: mongoSession });
					return true;
				}));
				return NextResponse.json({ success: applied, documentId: docId, nodeCount: persistedChunks.length }, { status: applied ? 200 : 409 });
			} else if (options?.documentId) {
				// A transaction makes the stable id and all nodes visible together. A retry
				// never deletes records belonging to a concurrent or completed attempt.
				const { client } = await getMongo();
				const mongoSession = client.startSession();
				try {
					await mongoSession.withTransaction(async () => {
						const stableKey = new ObjectId(createHash('sha256').update(docId).digest('hex').slice(0, 24));
						await docsCollection.insertOne({ ...persistedDoc, _id: stableKey }, { session: mongoSession });
						if (persistedChunks.length) await nodesCollection.insertMany(persistedChunks, { session: mongoSession });
					});
				} catch (error) {
					const existing = await docsCollection.findOne({ id: docId });
					const count = existing ? await nodesCollection.countDocuments({ docId }) : 0;
					if (existing && count > 0 && existing.nodeCount === count) {
						return NextResponse.json({ success: true, documentId: docId, title: existing.title, summary: existing.fullSummary, nodeCount: count, department: existing.metadata?.department, documentType: existing.metadata?.documentType }, { status: 201 });
					}
					throw error;
				} finally { await mongoSession.endSession(); }
			} else {
				let inserted = false;
				try {
					await docsCollection.insertOne(persistedDoc);
					inserted = true;
					if (persistedChunks.length) await nodesCollection.insertMany(persistedChunks);
				} catch (persistErr) {
					if (inserted) {
						await nodesCollection.deleteMany({ docId });
						await docsCollection.deleteOne({ id: docId });
					}
					throw persistErr;
				}
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
