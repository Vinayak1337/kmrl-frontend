export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import {
	getCollection,
	ensureDocumentIndexes,
	ensureNodeIndexes
} from '@/lib/mongo';
import {
	analyzeDocumentWithGemini,
	type AgentPage
} from '@/lib/agent/geminiAgent';
import {
	extractPdfPagesFromBase64,
	extractPdfPagesWithImagesFromBase64,
	fetchCloudinaryPdfPageImages
} from '@/lib/pdf';
import { prisma } from '@/lib/prisma';
import {
	buildManagerMdPrompt,
	type ManagerAnalysisJSON,
	type ManagerNodeJSON
} from '@/lib/prompt';

// Types for document processing (internal shape before persistence)
type DocumentNode = {
	id: string;
	pageRange: { start: number; end: number };
	content: string;
	images: Array<{
		page: number;
		base64: string;
		mimeType: string;
		caption?: string;
	}>;
	topicSummary?: string;
	summary: string;
	// Markdown friendly fields for rendering
	summaryMd?: string;
	keyPointsMd?: string;
	actionsMd?: string;
	keyPoints: string[];
	actionableItems: string[];
	criticalFlags?: string[];
	crossDepartments?: string[];
	needsImage?: boolean;
	meta?: {
		slideType?: string;
		entities?: string[];
		decisions?: string[];
		deadlines?: string[];
		risks?: string[];
		stakeholders?: string[];
	};
	nextNodeId?: string;
	prevNodeId?: string;
};
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

type IngestRequest = {
	documents?: Array<{
		type: 'pdf' | 'image' | 'text' | 'html' | 'doc';
		content: string;
		filename?: string;
	}>;
	html?: string;
	title?: string;
	department?: string;
	documentType?: string;
	tags?: string[];
	// Optional pre-parsed pages (client-provided), including images in base64
	pages?: Array<{
		index: number;
		text?: string;
		images?: Array<{ base64: string; mimeType: string }>;
	}>;
};

type DocumentInput = {
	type: 'pdf' | 'image' | 'text' | 'html' | 'doc';
	content: string;
	filename?: string;
};

async function extractContentFromDocument(doc: DocumentInput): Promise<{
	text: string;
	images: Array<{ base64: string; mimeType: string; page?: number }>;
	pageCount: number;
}> {
	switch (doc.type) {
		case 'html': {
			const htmlContent = doc.content;
			const textContent = htmlContent
				.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
			const images: Array<{ base64: string; mimeType: string }> = [];
			const imgRegex = /<img[^>]+src=\"data:([^;]+);base64,([^\"]+)\"/g;
			let match;
			while ((match = imgRegex.exec(htmlContent)) !== null) {
				images.push({ base64: match[2], mimeType: match[1] });
			}
			return { text: textContent, images, pageCount: 1 };
		}
		case 'text':
			return { text: doc.content, images: [], pageCount: 1 };
		case 'image':
			return {
				text: '',
				images: [{ base64: doc.content, mimeType: 'image/png' }],
				pageCount: 1
			};
		case 'pdf': {
			try {
				const { pages, pageCount } = await extractPdfPagesFromBase64(
					doc.content
				);
				const text = pages
					.map(p => `\n\n[Page ${p.index}] ${p.text}`)
					.join(' ')
					.trim();
				return { text, images: [], pageCount };
			} catch (e) {
				console.warn('PDF extraction failed; storing raw only', e);
				return { text: '', images: [], pageCount: 0 };
			}
		}
		case 'doc':
			console.warn(
				`Document type ${doc.type} requires additional processing libraries`
			);
			return { text: doc.content, images: [], pageCount: 1 };
		default:
			return { text: doc.content || '', images: [], pageCount: 1 };
	}
}

function mdToPlain(md?: string): string {
	if (!md) return '';
	return md
		.replace(/^#{1,6}\s+/gm, '') // headings
		.replace(/[*_`>]+/g, '') // formatting
		.replace(/^\s*[-*]\s+/gm, '• ') // bullets
		.replace(/\s+/g, ' ') // collapse
		.trim();
}

// Build a short, clean 2–3 sentence summary from raw text
function sentenceSummary(
	text: string,
	opts?: { maxSentences?: number; minChars?: number; maxChars?: number }
): string {
	const maxSentences = Math.max(1, Math.min(4, opts?.maxSentences || 3));
	const minChars = Math.max(40, opts?.minChars || 80);
	const maxChars = Math.max(140, opts?.maxChars || 280);
	const cleaned = (text || '')
		.replace(/\s+/g, ' ')
		.replace(/\(.*?\)/g, '')
		.trim();
	const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
	let out = '';
	for (const s of parts) {
		const candidate = (out ? out + ' ' : '') + s.trim();
		if (candidate.length > maxChars) break;
		out = candidate;
		if (
			out.length >= minChars &&
			out.split(/(?<=[.!?])\s+/).length >= Math.min(parts.length, maxSentences)
		)
			break;
	}
	if (!out) out = parts.slice(0, maxSentences).join(' ').slice(0, maxChars);
	// Remove stray numeric-only artifacts
	out = out.replace(/^\s*\d+\s*$/m, '').trim();
	return out;
}

function normalizeTitle(title?: string): string | undefined {
	if (!title) return undefined;
	return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set<string>([
	'the',
	'and',
	'for',
	'that',
	'with',
	'from',
	'this',
	'have',
	'will',
	'your',
	'into',
	'over',
	'under',
	'shall',
	'should',
	'would',
	'could',
	'about',
	'them',
	'they',
	'been',
	'being',
	'were',
	'also',
	'than',
	'then',
	'there',
	'here',
	'such',
	'only',
	'must',
	'more',
	'most',
	'very',
	'much',
	'many',
	'some',
	'any',
	'each',
	'per',
	'onto',
	'upon',
	'within',
	'without'
]);

function extractKeywords(
	summary: string,
	keyPoints: string[],
	actions: string[]
): string[] {
	const text = [summary, ...keyPoints, ...actions].join(' ').toLowerCase();
	const tokens = text
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(t => t.length >= 4 && !STOPWORDS.has(t));
	const counts = new Map<string, number>();
	for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
	return Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 15)
		.map(([t]) => t);
}

function sliceByPageRange(
	aggregateText: string,
	range: { start: number; end: number }
): string {
	// aggregateText uses markers built in extractContentFromDocument: "\n\n[Page i] <text>"
	const startTag = `\n\n[Page ${range.start}]`;
	const endTag = `\n\n[Page ${range.end + 1}]`;
	const startIdx = aggregateText.indexOf(startTag);
	if (startIdx < 0) return aggregateText; // fallback to full
	const endIdx = aggregateText.indexOf(endTag);
	if (endIdx < 0) return aggregateText.slice(startIdx);
	return aggregateText.slice(startIdx, endIdx);
}

function autoGenerateSummary(text: string): string {
	const cleanedText = text.replace(/\s+/g, ' ').trim();
	const sentences = cleanedText
		.split(/(?<=[.!?])\s+/)
		.filter(s => s.length > 10 && !/^\d+$/.test(s.trim()));
	if (sentences.length === 0) return cleanedText.slice(0, 500); // Fallback to raw snippet

	let summary = '';
	let currentLength = 0;
	// Lower min length to allow shorter texts to get a summary
	const minLength = 80;
	const maxLength = 300;

	for (const sentence of sentences) {
		if (currentLength + sentence.length + 1 <= maxLength) {
			summary += (summary.length > 0 ? ' ' : '') + sentence;
			currentLength += sentence.length + 1;
		} else if (currentLength < minLength) {
			// If we haven't reached minLength, add even if it exceeds maxLength slightly
			summary += (summary.length > 0 ? ' ' : '') + sentence;
			currentLength += sentence.length + 1;
		} else {
			break;
		}
	}
	return summary.trim() || cleanedText.slice(0, 500); // Ensure it's not empty
}

function autoGenerateNodeSummary(
	text: string,
	opts?: { maxChars?: number; minChars?: number }
): string {
	const maxChars = Math.max(140, Math.min(360, opts?.maxChars || 320));
	const minChars = Math.max(90, Math.min(maxChars - 30, opts?.minChars || 180));

	const cleanedText = text
		.replace(/\[Page \d+\]\s*/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (!cleanedText) return '';

	const sentences = cleanedText
		.split(/(?<=[.!?])\s+/)
		.map(s => s.trim())
		.filter(s => s.length > 10 && !/^\d+$/.test(s));

	if (sentences.length === 0) {
		return sentenceSummary(cleanedText, {
			maxSentences: 3,
			minChars,
			maxChars
		});
	}

	if (sentences.length === 1) {
		return sentences[0].slice(0, maxChars);
	}

	const wordFreq = new Map<string, number>();
	for (const sentence of sentences) {
		const words = sentence.toLowerCase().match(/[a-z0-9]+/g);
		if (!words) continue;
		for (const word of words) {
			if (word.length < 3 || STOPWORDS.has(word)) continue;
			wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
		}
	}

	const KEYWORD_BOOST =
		/(?:deadline|due|risk|issue|approval|action|ensure|must|should|compliance|policy|budget|revenue|safety|maintenance|progress|increase|decrease|delay|schedule|plan|target|deadline|inspection|audit|meeting|payment|penalty|training|implementation|status|approval)/i;

	type ScoredSentence = { sentence: string; index: number; score: number };
	const scored: ScoredSentence[] = sentences.map((sentence, index) => {
		const words = sentence.toLowerCase().match(/[a-z0-9]+/g) || [];
		let score = 0;
		for (const word of words) {
			if (word.length < 3 || STOPWORDS.has(word)) continue;
			score += wordFreq.get(word) || 0;
		}
		if (KEYWORD_BOOST.test(sentence)) score += 1.5;
		if (/[0-9]/.test(sentence)) score += 0.75;
		if (sentence.length < 45) score *= 0.65;
		return { sentence, index, score };
	});

	const maxSentences = Math.min(3, sentences.length);
	const baseCount = Math.max(2, Math.ceil(sentences.length / 4));
	const topCount = Math.min(maxSentences, baseCount);

	const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
	const selectedMap = new Map<number, ScoredSentence>();
	for (const item of sortedByScore) {
		if (selectedMap.size >= topCount) break;
		selectedMap.set(item.index, item);
	}

	// ensure we include some context from the start/end if not already chosen
	if (!selectedMap.has(0) && scored[0]) {
		selectedMap.set(0, scored[0]);
	}
	if (!selectedMap.has(scored.length - 1) && scored[scored.length - 1]) {
		selectedMap.set(scored.length - 1, scored[scored.length - 1]);
	}

	const selected = Array.from(selectedMap.values()).sort(
		(a, b) => a.index - b.index
	);

	let summary = '';
	for (const { sentence } of selected) {
		if (!sentence) continue;
		const candidate = summary ? `${summary} ${sentence}` : sentence;
		if (candidate.length > maxChars) {
			if (summary.length >= minChars) break;
			if (summary) {
				const remaining = maxChars - summary.length - 1;
				if (remaining > 40) {
					summary = `${summary} ${sentence
						.slice(0, remaining)
						.trim()}...`.trim();
				}
			} else {
				summary = sentence.slice(0, maxChars).trim();
			}
			break;
		}
		summary = candidate;
	}

	if (summary.length < minChars) {
		for (const item of [...scored]
			.sort((a, b) => a.index - b.index)
			.filter(entry => !selectedMap.has(entry.index))) {
			const candidate = summary ? `${summary} ${item.sentence}` : item.sentence;
			if (candidate.length > maxChars) {
				if (summary) break;
				summary = candidate.slice(0, maxChars).trim();
				break;
			}
			summary = candidate;
			if (summary.length >= minChars) break;
		}
	}

	if (!summary || summary.length < 60) {
		return sentenceSummary(cleanedText, {
			maxSentences: 3,
			minChars,
			maxChars
		}).trim();
	}

	return summary.trim();
}

function isBadAiSummary(summary: string, content: string): boolean {
	if (!summary || summary.length < 20) return true;

	const cleanedSummary = summary.trim().replace(/\s+/g, ' ');
	const cleanedContent = content.trim().replace(/\s+/g, ' ');

	if (/^\d+\.?\d*$/.test(cleanedSummary)) return true; // Is a number

	// If the summary is just a prefix of the content, it's not a real summary.
	// This is the most common failure mode for summarization of narrative text.
	if (cleanedContent.startsWith(cleanedSummary) && cleanedSummary.length > 0) {
		// Allow very short prefixes (likely a title), but reject longer ones.
		return cleanedSummary.length > 30;
	}

	return false;
}

async function processDocumentWithAI(
	text: string,
	images: Array<{ base64: string; mimeType: string }>,
	apiKey: string,
	meta?: { department?: string; documentType?: string }
): Promise<{
	nodes: Partial<DocumentNode>[];
	fullSummary: string;
	overallMd?: string;
	documentType?: string;
	departments?: string[];
}> {
	const genAI = new GoogleGenerativeAI(apiKey);
	const modelCandidates = ['gemini-2.5-flash'];
	let modelIndex = 0;
	let model = genAI.getGenerativeModel({ model: modelCandidates[modelIndex] });
	const prompt = buildManagerMdPrompt(meta);
	try {
		const parts: Array<{
			text?: string;
			inlineData?: { data: string; mimeType: string };
		}> = [];
		parts.push({ text: prompt });
		parts.push({ text: `\nPrimary text content:\n${text.slice(0, 60_000)}` });
		for (const img of images) {
			parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
		}
		const generationConfig = { responseMimeType: 'application/json' as const };
		const sleep = (ms: number) =>
			new Promise(resolve => setTimeout(resolve, ms));
		let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				result = await model.generateContent({
					contents: [{ role: 'user', parts }],
					generationConfig
				});
				break;
			} catch (error) {
				if (
					error &&
					typeof error === 'object' &&
					('status' in error || 'message' in error) &&
					(attempt < modelCandidates.length - 1 || attempt < 2)
				) {
					modelIndex = (modelIndex + 1) % modelCandidates.length;
					model = genAI.getGenerativeModel({
						model: modelCandidates[modelIndex]
					});
					const backoff =
						600 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
					await sleep(backoff);
					continue;
				}
				throw error;
			}
		}
		if (!result) throw new Error('Model did not return a result');
		const responseText = result.response.text?.() || '';
		try {
			const parsed = JSON.parse(responseText) as ManagerAnalysisJSON;
			const nodes = (Array.isArray(parsed.nodes) ? parsed.nodes : []).map(
				(node: ManagerNodeJSON, index: number): Partial<DocumentNode> => {
					const pageRange = node.pageRange || {
						start: index + 1,
						end: index + 1
					};
					return {
						pageRange,
						content: node.content || '',
						summary: mdToPlain(node.summaryMd || node.summary || ''),
						summaryMd: node.summaryMd || undefined,
						keyPointsMd: node.keyPointsMd || undefined,
						actionsMd: node.actionsMd || undefined,
						keyPoints: Array.isArray(node.keyPoints)
							? node.keyPoints.map(k => String(k).trim()).filter(Boolean)
							: [],
						actionableItems: Array.isArray(node.actionableItems)
							? node.actionableItems
									.map(ai => {
										if (typeof ai === 'string') return ai.trim();
										const owner = (ai.owner || '').trim();
										const action = (ai.action || '').trim();
										const due = (ai.due || '').trim();
										const impact = (ai.impact || '').trim();
										return [
											owner ? `Owner: ${owner}` : '',
											action,
											due ? `Due: ${due}` : '',
											impact ? `Impact: ${impact}` : ''
										]
											.filter(Boolean)
											.join(' — ');
									})
									.filter(Boolean)
							: [],
						criticalFlags: Array.isArray(node.criticalFlags)
							? node.criticalFlags
							: [],
						crossDepartments: Array.isArray(node.crossDepartments)
							? node.crossDepartments
							: [],
						needsImage: Boolean(node.needsImage),
						meta: node.meta
					};
				}
			);
			const overallMd = parsed.overallMd || '';
			const cleanedOverall = overallMd ? mdToPlain(overallMd) : '';
			let fullSummary = cleanedOverall.slice(0, 1000);
			if (!fullSummary || isBadAiSummary(fullSummary, text)) {
				fullSummary = sentenceSummary(text, {
					maxSentences: 4,
					minChars: 120,
					maxChars: 360
				});
				if (isBadAiSummary(fullSummary, text)) {
					fullSummary = autoGenerateSummary(text);
				}
			}
			return {
				nodes,
				fullSummary,
				overallMd,
				documentType: parsed.documentType,
				departments: parsed.departments
			};
		} catch {
			return {
				nodes: [
					{
						pageRange: { start: 1, end: 1 },
						content: text,
						summary: responseText,
						keyPoints: [],
						actionableItems: []
					}
				],
				fullSummary: responseText.substring(0, 500)
			};
		}
	} catch (error) {
		console.error('AI processing error:', error);
		return {
			nodes: [
				{
					pageRange: { start: 1, end: 1 },
					content: text,
					summary: 'AI unavailable; using raw content.',
					keyPoints: [],
					actionableItems: []
				}
			],
			fullSummary: text.substring(0, 500)
		};
	}
}

async function createLinkedStructure(
	nodes: Partial<DocumentNode>[]
): Promise<DocumentNode[]> {
	const linked: DocumentNode[] = [];
	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];
		linked.push({
			id: `node-${index + 1}`,
			pageRange: node.pageRange || { start: index + 1, end: index + 1 },
			content: node.content || '',
			images: node.images || [],
			summary: node.summary || '',
			summaryMd: node.summaryMd,
			keyPointsMd: node.keyPointsMd,
			actionsMd: node.actionsMd,
			keyPoints: node.keyPoints || [],
			actionableItems: node.actionableItems || [],
			nextNodeId: index < nodes.length - 1 ? `node-${index + 2}` : undefined,
			prevNodeId: index > 0 ? `node-${index}` : undefined
		});
	}
	return linked;
}

function heuristicChunkNodes(
	text: string,
	opts?: { per?: number }
): Partial<DocumentNode>[] {
	const per = Math.max(800, Math.min(3000, opts?.per || 1600));
	const chunks: string[] = [];
	const parts = text
		.split(/\n{2,}/g)
		.map(p => p.trim())
		.filter(Boolean);
	let buf = '';
	for (const p of parts) {
		if ((buf + '\n\n' + p).length > per && buf) {
			chunks.push(buf.trim());
			buf = p;
		} else {
			buf = buf ? buf + '\n\n' + p : p;
		}
	}
	if (buf) chunks.push(buf.trim());
	if (chunks.length === 0) chunks.push(text.slice(0, per));
	return chunks.map((c, i) => ({
		pageRange: { start: i + 1, end: i + 1 },
		content: c,
		summary: c
			.split(/(?<=[.!?])\s+/)
			.slice(0, 2)
			.join(' ')
			.slice(0, 500),
		keyPoints: [],
		actionableItems: []
	}));
}

export async function POST(request: NextRequest) {
	// Require authentication
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = (await request.json()) as IngestRequest;

		// Check for Gemini API key
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{ error: 'GEMINI_API_KEY is not configured' },
				{ status: 500 }
			);
		}

		// Ensure indexes exist (idempotent)
		await ensureDocumentIndexes();
		await ensureNodeIndexes();

		// Handle legacy single HTML document
		if (body.html && !body.documents) {
			body.documents = [
				{
					type: 'html',
					content: body.html,
					filename: body.title || 'untitled.html'
				}
			];
		}

		if (!body.documents || body.documents.length === 0) {
			return NextResponse.json(
				{ error: 'No documents provided for ingestion' },
				{ status: 400 }
			);
		}

		// Process all documents
		const processedDocuments: DocumentRecord[] = [];

		for (const doc of body.documents) {
			// Extract content from document
			const { text, images, pageCount } = await extractContentFromDocument(doc);

			if (!text && images.length === 0 && doc.type !== 'pdf') {
				console.warn(`Document ${doc.filename} has no extractable content`);
				continue;
			}

			// Choose processing path
			let linkedNodes: DocumentNode[] = [];
			let overallSummary = '';
			let aiDocType: string | undefined;
			let aiDepartments: string[] | undefined;
			let aiOverallMd: string | undefined;

			let aggregatedPdfImages:
				| Array<{ page?: number; base64: string; mimeType: string }>
				| undefined;
			if (doc.type === 'pdf') {
				// Extract pages once for robust fallback
				// Prefer server-side page images when available (requires 'canvas' dependency). Fallback to text-only if canvas not present.
				let limitedWithImages: Array<{
					index: number;
					text: string;
					images: Array<{ base64: string; mimeType: string }>;
				}> = [];
				try {
					const { pages: richPages } =
						await extractPdfPagesWithImagesFromBase64(doc.content, {
							scale: 2,
							imagesPerPage: 1
						});
					limitedWithImages = richPages;
				} catch {
					const { pages } = await extractPdfPagesFromBase64(doc.content);
					limitedWithImages = pages.map(p => ({
						index: p.index,
						text: p.text,
						images: []
					}));
					// Cloudinary fallback for page images when canvas not available
					const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
					if (cloudName && pages.length > 0) {
						try {
							const imgs = await fetchCloudinaryPdfPageImages({
								base64Pdf: doc.content,
								cloudName,
								pageCount: pages.length,
								width: 1600
							});
							if (
								imgs.pages &&
								imgs.pages.length > 0 &&
								typeof fetch === 'function'
							) {
								const imageMap = new Map<
									number,
									Array<{ base64: string; mimeType: string }>
								>();
								await Promise.all(
									imgs.pages.map(async im => {
										if (!im?.url) return;
										try {
											const response = await fetch(im.url);
											if (!response.ok) return;
											const arrayBuffer = await response.arrayBuffer();
											const base64 =
												Buffer.from(arrayBuffer).toString('base64');
											const entry = imageMap.get(im.index) || [];
											entry.push({
												base64,
												mimeType: im.mimeType || 'image/png'
											});
											imageMap.set(im.index, entry);
										} catch (err) {
											console.warn('Cloudinary image fetch failed', err);
										}
									})
								);
								if (imageMap.size > 0) {
									limitedWithImages = pages.map(p => ({
										index: p.index,
										text: p.text,
										images: imageMap.get(p.index) || []
									}));
								}
							}
						} catch (err) {
							console.warn('Cloudinary fallback failed', err);
						}
					}
				}
				const MAX_PAGES = Number(process.env.INGEST_MAX_PDF_PAGES || 40);
				const limited = limitedWithImages.slice(0, Math.max(1, MAX_PAGES));
				aggregatedPdfImages = limited.flatMap(p =>
					(p.images || [])
						.filter(im => typeof im.base64 === 'string' && im.base64.length > 0)
						.map(im => ({
							page: p.index,
							base64: im.base64,
							mimeType: im.mimeType
						}))
				);

				// Try agentic analysis first
				try {
					// Prefer client-provided page images/text if present
					const provided: Array<{
						index: number;
						text?: string;
						images?: Array<{ base64: string; mimeType: string }>;
					}> = Array.isArray((body as IngestRequest).pages)
						? ((body as IngestRequest).pages as Array<{
								index: number;
								text?: string;
								images?: Array<{ base64: string; mimeType: string }>;
						  }>)
						: [];
					const byIndex = new Map<
						number,
						{
							text?: string;
							images?: Array<{ base64: string; mimeType: string }>;
						}
					>();
					provided.forEach(pg => {
						byIndex.set(pg.index, {
							text: pg.text,
							images: Array.isArray(pg.images) ? pg.images : []
						});
					});

					const agentPages: AgentPage[] = limited.map(p => {
						const override = byIndex.get(p.index);
						return {
							index: p.index,
							text: override?.text || p.text || '',
							images:
								(override?.images && override.images.length
									? override.images
									: p.images
								)?.map(im => ({ base64: im.base64, mimeType: im.mimeType })) ||
								[]
						};
					});
					const agentResult = await analyzeDocumentWithGemini({
						pages: agentPages,
						apiKey
					});
					const aggregateText = limited
						.map(p => `\n\n[Page ${p.index}] ${p.text}`)
						.join(' ');
					const partial = agentResult.nodes.map(n => ({
						pageRange: n.pageRange,
						content:
							n.content && n.content.length > 0
								? n.content
								: sliceByPageRange(aggregateText, n.pageRange),
						summary: n.summary,
						summaryMd: (n as any).pageMd,
						keyPoints: n.keyPoints,
						actionableItems: n.actionableItems,
						meta: (n as any).meta,
						images: (n.images || []).map(im => ({
							page: n.pageRange.start,
							base64: im.base64,
							mimeType: im.mimeType
						}))
					}));
					linkedNodes = await createLinkedStructure(partial);
					overallSummary = agentResult.overallSummary || '';
					// If agent provided MD executive summary, store it
					if (agentResult.overallMd) {
						// Attach to processedDoc later via aiOverallMd variable
						aiOverallMd = agentResult.overallMd;
					}

					// If agent failed to properly structure (single node) but we have multiple pages, fallback to per-page nodes
					const agentBad =
						/agent timeout/i.test(overallSummary || '') ||
						linkedNodes.length <= 1;
					if (agentBad && limited.length > 1) {
						// Better fallback: run manager-focused summarizer over aggregate text to get Markdown fields
						try {
							const aggregateText = limited
								.map(p => `\n\n[Page ${p.index}] ${p.text}`)
								.join(' ');
							const aiResult = await processDocumentWithAI(
								aggregateText,
								[{ base64: doc.content, mimeType: 'application/pdf' }],
								apiKey,
								{ department: body.department, documentType: body.documentType }
							);
							if (Array.isArray(aiResult.nodes) && aiResult.nodes.length > 0) {
								linkedNodes = await createLinkedStructure(aiResult.nodes);
								overallSummary =
									aiResult.fullSummary || (aggregateText || '').slice(0, 600);
							} else {
								// Fallback to per-page node shells with images
								const perPageNodes = limited.map(p => ({
									pageRange: { start: p.index, end: p.index },
									content: p.text,
									images: (p.images || []).map(im => ({
										page: p.index,
										base64: im.base64,
										mimeType: im.mimeType
									})),
									summary: p.text
										.split(/(?<=[.!?])\s+/)
										.slice(0, 2)
										.join(' ')
										.slice(0, 500),
									keyPoints: [],
									actionableItems: []
								}));
								linkedNodes = await createLinkedStructure(perPageNodes);
								overallSummary = aggregateText.slice(0, 600);
							}
						} catch {
							const perPageNodes = limited.map(p => ({
								pageRange: { start: p.index, end: p.index },
								content: p.text,
								images: (p.images || []).map(im => ({
									page: p.index,
									base64: im.base64,
									mimeType: im.mimeType
								})),
								summary: p.text
									.split(/(?<=[.!?])\s+/)
									.slice(0, 2)
									.join(' ')
									.slice(0, 500),
								keyPoints: [],
								actionableItems: []
							}));
							linkedNodes = await createLinkedStructure(perPageNodes);
							overallSummary = text.slice(0, 600);
						}
					}
				} catch (e) {
					console.warn(
						'Gemini agent failed for PDF; falling back to summarization/per-page nodes',
						e
					);
					// If multiple pages, construct per-page nodes to retain navigation
					if (limited.length > 1) {
						const perPageNodes = limited.map(p => ({
							pageRange: { start: p.index, end: p.index },
							content: p.text,
							images: (p.images || []).map(im => ({
								page: p.index,
								base64: im.base64,
								mimeType: im.mimeType
							})),
							summary: p.text
								.split(/(?<=[.!?])\s+/)
								.slice(0, 2)
								.join(' ')
								.slice(0, 500),
							keyPoints: [],
							actionableItems: []
						}));
						linkedNodes = await createLinkedStructure(perPageNodes);
						overallSummary = text.slice(0, 600);
					} else {
						const aiResult = await processDocumentWithAI(
							text,
							[{ base64: doc.content, mimeType: 'application/pdf' }],
							apiKey,
							{
								department: body.department,
								documentType: body.documentType
							}
						);
						linkedNodes = await createLinkedStructure(aiResult.nodes);
						overallSummary = aiResult.fullSummary;
						aiDocType = aiResult.documentType;
						aiDepartments = aiResult.departments;
						aiOverallMd = aiResult.overallMd;
						if (aiResult.overallMd) {
							// attach MD on document level if present
							// will be saved below in processedDoc
						}
					}
				}
			} else {
				// Default summarization + structuring
				const aiResult = await processDocumentWithAI(text, images, apiKey, {
					department: body.department,
					documentType: body.documentType
				});
				linkedNodes = await createLinkedStructure(aiResult.nodes);
				overallSummary = aiResult.fullSummary;
				aiDocType = aiResult.documentType;
				aiDepartments = aiResult.departments;
				aiOverallMd = aiResult.overallMd;
				if (linkedNodes.length <= 1 && (text?.length || 0) > 4000) {
					linkedNodes = await createLinkedStructure(
						heuristicChunkNodes(text, { per: 1800 })
					);
					overallSummary = (overallSummary || text).slice(0, 600);
				}
			}

			// Assign images to appropriate nodes based on page numbers (best-effort)
			// Prefer PDF images extracted per-page when available
			const imgSource = doc.type === 'pdf' ? aggregatedPdfImages || [] : images;
			if (imgSource.length > 0 && linkedNodes.length > 0) {
				for (const img of imgSource) {
					const page = img.page || 1;
					const target = linkedNodes.find(
						n =>
							page >= (n.pageRange?.start || 1) &&
							page <= (n.pageRange?.end || n.pageRange?.start || 1)
					);
					if (target) {
						target.images.push({
							page,
							base64: img.base64,
							mimeType: img.mimeType,
							caption: target.images.length ? undefined : `Image ${page}`
						});
					}
				}
			}

			// Create processed document with raw storage
			// Determine classification (prefer user-input, else inferred)
			const chosenDepartment =
				body.department || (aiDepartments && aiDepartments[0]) || undefined;
			const chosenDocType = body.documentType || aiDocType || undefined;

			const processedDoc: DocumentRecord = {
				id: `doc-${Date.now()}-${Buffer.from(doc.filename || 'doc')
					.toString('base64')
					.substring(0, 8)}`,
				title: doc.filename || body.title || 'Untitled Document',
				originalFormat: doc.type,
				totalPages: pageCount,
				language: 'en',
				// Do not embed nodes; will persist separately. Attach count for UI.
				nodeCount: linkedNodes.length,
				fullSummary: overallSummary,
				overallMd: aiOverallMd,
				keywords: Array.from(
					new Set(
						linkedNodes.flatMap(node => {
							const maybeRecord =
								node as unknown as Partial<DocumentNodeRecord>;
							if (Array.isArray(maybeRecord.keywords)) {
								return maybeRecord.keywords as string[];
							}
							return extractKeywords(
								node.summary || node.content || '',
								node.keyPoints || [],
								node.actionableItems || []
							);
						})
					)
				)
					.filter(k => typeof k === 'string' && k.trim().length > 0)
					.map(k => k.trim())
					.slice(0, 30),
				metadata: {
					createdAt: new Date(),
					uploadedBy: session.sub,
					department: chosenDepartment,
					documentType: chosenDocType,
					tags: body.tags || [],
					inferred:
						!body.department || !body.documentType
							? {
									department: body.department
										? null
										: (aiDepartments && aiDepartments[0]) || null,
									documentType: body.documentType ? null : aiDocType || null,
									source: 'gemini'
							  }
							: undefined
				},
				raw: {
					type: doc.type,
					content: doc.content,
					text
				}
			};

			processedDocuments.push(processedDoc);

			// Prepare node documents for this document
			const nodesForDoc: DocumentNodeRecord[] = linkedNodes.map(
				(n, idx): DocumentNodeRecord => {
					const order = idx + 1;
					const nodeId = n.id || `node-${order}`;
					const uid = `${processedDoc.id}#${nodeId}`;
					// derive a short title for search/navigation
					const title =
						(n.meta?.slideType && n.meta.slideType.trim()) ||
						(n.topicSummary && n.topicSummary.trim()) ||
						n.summaryMd
							?.split('\n')
							.find(l => l.trim().length > 0)
							?.replace(/^#+\s*/, '')
							?.slice(0, 80) ||
						(n.summary || '').split(/[.!?]/)[0]?.slice(0, 80) ||
						`Section ${order}`;
					const keywords = extractKeywords(
						n.summary || n.content || '',
						n.keyPoints || [],
						n.actionableItems || []
					);
					const normalized = normalizeTitle(title);
					const sourcePages = Array.from(
						{
							length:
								(n.pageRange?.end || order) - (n.pageRange?.start || order) + 1
						},
						(_, k) => (n.pageRange?.start || order) + k
					);
					return {
						uid,
						docId: processedDoc.id,
						nodeId,
						order,
						title,
						titleNormalized: normalized,
						pageRange: n.pageRange || { start: order, end: order },
						sourcePages,
						content: n.content || '',
						images: (n.images || []).map(im => ({
							page: (im as any).page,
							base64: im.base64,
							url: (im as any).url,
							mimeType: im.mimeType,
							caption: im.caption
						})),
						summary: n.summary || '',
						summaryMd: n.summaryMd,
						keyPointsMd: n.keyPointsMd,
						actionsMd: n.actionsMd,
						keyPoints: n.keyPoints || [],
						actionableItems: n.actionableItems || [],
						keywords,
						criticalFlags: n.criticalFlags || [],
						crossDepartments: n.crossDepartments || [],
						needsImage: n.needsImage || false,
						meta: n.meta,
						nextNodeId: n.nextNodeId,
						prevNodeId: n.prevNodeId,
						nodeCount: linkedNodes.length,
						department: processedDoc.metadata.department,
						documentType: processedDoc.metadata.documentType,
						tags: processedDoc.metadata.tags,
						createdAt: processedDoc.metadata.createdAt
					};
				}
			);

			// Persist node docs for this processed document (idempotent per request)
			const nodesCollection = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);
			if (nodesForDoc.length > 0) {
				await nodesCollection.insertMany(nodesForDoc);
			}
		}

		// Store in MongoDB
		const collection = await getCollection<DocumentRecord>();

		if (processedDocuments.length === 1) {
			// Single document
			const result = await collection.insertOne(processedDocuments[0]);
			// Audit log (best-effort)
			try {
				await prisma.userAudit.create({
					data: {
						actorId: session.sub,
						targetUserId: session.sub, // document is stored in Mongo; use actor again for linkage
						action: 'DOCUMENT_INGESTED',
						details: {
							documentId: processedDocuments[0].id,
							title: processedDocuments[0].title,
							nodeCount: processedDocuments[0].nodeCount || 0,
							department: processedDocuments[0].metadata.department,
							documentType: processedDocuments[0].metadata.documentType
						}
					}
				});
			} catch {}
			return NextResponse.json(
				{
					success: true,
					documentId: result.insertedId.toString(),
					summary: processedDocuments[0].fullSummary,
					nodeCount: processedDocuments[0].nodeCount || 0,
					documentType: processedDocuments[0].metadata.documentType,
					department: processedDocuments[0].metadata.department
				},
				{ status: 201 }
			);
		} else {
			// Multiple documents
			const result = await collection.insertMany(processedDocuments);
			return NextResponse.json(
				{
					success: true,
					documentsProcessed: Object.keys(result.insertedIds).length,
					documentIds: Object.values(result.insertedIds).map(id =>
						id.toString()
					),
					summaries: processedDocuments.map(d => ({
						id: d.id,
						title: d.title,
						summary: d.fullSummary,
						nodeCount: d.nodeCount || 0,
						documentType: d.metadata.documentType,
						department: d.metadata.department
					}))
				},
				{ status: 201 }
			);
		}
	} catch (error) {
		console.error('Document ingestion error:', error);
		return NextResponse.json(
			{
				error: 'Failed to ingest documents',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// GET endpoint to retrieve processed documents
export async function GET(request: NextRequest) {
	// Require authentication
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
		const limit = parseInt(searchParams.get('limit') || '10');
		const page = parseInt(searchParams.get('page') || '0');
		const pageSize = parseInt(searchParams.get('pageSize') || '0');

		const collection = await getCollection<DocumentRecord>();

		if (documentId) {
			// Retrieve specific document
			const document = await collection.findOne({ id: documentId });
			if (!document) {
				return NextResponse.json(
					{ error: 'Document not found' },
					{ status: 404 }
				);
			}
			// Attach nodes from node collection to maintain API contract
			try {
				const nodesCollection = await getCollection<DocumentNodeRecord>(
					process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
				);
				const nodes = await nodesCollection
					.find({ docId: documentId })
					.sort({ order: 1 })
					.toArray();
				(document as any).nodes = nodes as any;
				if (!document.nodeCount) (document as any).nodeCount = nodes.length;
			} catch {}
			return NextResponse.json(document);
		}

		// Build query filter
		const filter: Record<string, unknown> = {};
		if (department) filter['metadata.department'] = department;
		if (documentType) filter['metadata.documentType'] = documentType;

		// Enforce permission-based visibility for MANAGER role
		if (session.role !== 'ADMIN') {
			const grants = Array.isArray(session.grants) ? session.grants : [];
			if (grants.length === 0) {
				// No access
				return NextResponse.json({
					documents: [],
					total: 0,
					totalCount: 0,
					page: 0,
					pageSize: pageSize || limit
				});
			}
			const toTitle = (s: string) =>
				s
					.toLowerCase()
					.replace(
						/(^|[_\s-])(\w)/g,
						(_, p1, c) => (p1 ? ' ' : '') + c.toUpperCase()
					);
			const or: Array<Record<string, string>> = [];
			grants
				.filter(
					g =>
						g.dept &&
						g.type &&
						Array.isArray((g as any).actions) &&
						(g as any).actions.includes('read')
				)
				.forEach(g => {
					const deptVariants = [g.dept, g.dept.toLowerCase(), toTitle(g.dept)];
					const typeVariants = [g.type, g.type.toLowerCase()];
					for (const dv of deptVariants) {
						for (const tv of typeVariants) {
							or.push({
								'metadata.department': dv,
								'metadata.documentType': tv
							});
						}
					}
				});
			if (or.length > 0) {
				(filter as any)['$or'] = or;
			} else {
				return NextResponse.json({
					documents: [],
					total: 0,
					totalCount: 0,
					page: 0,
					pageSize: pageSize || limit
				});
			}
		}

		// Count for pagination
		const totalCount = await collection.countDocuments(filter);

		// Retrieve multiple documents
		const cursor = collection.find(filter).sort({ 'metadata.createdAt': -1 });
		if (pageSize > 0) {
			cursor
				.skip(Math.max(0, page) * Math.max(1, pageSize))
				.limit(Math.max(1, pageSize));
		} else {
			cursor.limit(limit);
		}
		const documents = await cursor.toArray();

		// Return summary view for list (defensive: handle partial/legacy docs)
		const summaries = documents.map(doc => {
			const anyDoc = doc as unknown as {
				id?: string;
				_id?: { toString?: () => string };
				title?: string;
				fullSummary?: string;
				nodes?: unknown[];
				nodeCount?: number;
				metadata?: {
					createdAt?: Date;
					department?: string;
					documentType?: string;
					tags?: string[];
				};
			};
			const nodes = Array.isArray(anyDoc?.nodes)
				? (anyDoc.nodes as unknown[])
				: [];
			const metadata = (anyDoc?.metadata ?? {}) as {
				createdAt?: Date;
				department?: string;
				documentType?: string;
				tags?: string[];
			};
			return {
				id: anyDoc?.id ?? anyDoc?._id?.toString?.() ?? '',
				title: anyDoc?.title ?? 'Untitled',
				summary: anyDoc?.fullSummary ?? '',
				nodeCount:
					typeof anyDoc?.nodeCount === 'number'
						? anyDoc.nodeCount
						: nodes.length,
				createdAt: metadata.createdAt ?? null,
				department: metadata.department ?? null,
				documentType: metadata.documentType ?? null,
				tags: Array.isArray(metadata.tags) ? metadata.tags : []
			};
		});

		return NextResponse.json({
			documents: summaries,
			total: summaries.length,
			totalCount,
			page: isNaN(page) ? 0 : page,
			pageSize: pageSize || limit
		});
	} catch (error) {
		console.error('Document retrieval error:', error);
		return NextResponse.json(
			{
				error: 'Failed to retrieve documents',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
