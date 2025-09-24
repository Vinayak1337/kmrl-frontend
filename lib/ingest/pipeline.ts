import { GoogleGenerativeAI } from '@google/generative-ai';
import {
	analyzeDocumentWithGemini,
	type AgentPage
} from '@/lib/agent/geminiAgent';
import { extractPdfPagesFromBase64 } from '@/lib/pdf';

export type PipelineNode = {
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
	keyPoints: string[];
	actionableItems: string[];
	criticalFlags?: string[];
	crossDepartments?: string[];
	needsImage?: boolean;
	nextNodeId?: string;
	prevNodeId?: string;
};

export function buildManagerFocusedPrompt(meta?: {
	department?: string;
	documentType?: string;
}): string {
	const dept = meta?.department
		? `Department: ${meta.department}`
		: 'Department: (unspecified)';
	const dtype = meta?.documentType
		? `Document Type: ${meta.documentType}`
		: 'Document Type: (unspecified)';
	return `You are a senior document analyst for Kochi Metro Rail Limited (KMRL).

Goal: Equip KMRL stakeholders with rapid, trustworthy, manager‑focused snapshots while preserving traceability to the source.

Context:\n- ${dept}\n- ${dtype}

Priorities:\n1) Extract decisions/actions.\n2) Emphasize compliance and deadlines.\n3) Highlight cross‑department dependencies.\n4) Surface risks (safety/compliance/service) and parameters/limits.

Language: English only (translate then summarize).

Output JSON only (no extra text):\n{\n  "nodes": [{\n    "pageRange": { "start": 1, "end": 3 },\n    "topicSummary": "Short label",\n    "detailedSummary": "3–6 sentences, manager-ready",\n    "keyPoints": ["parameter/limit", "policy change", "budget", "who is impacted"],\n    "actionableItems": [{ "owner": "<role|dept>", "action": "<what>", "due": "<date|window>", "impact": "<risk|benefit>" }],\n    "criticalFlags": ["safety", "compliance", "service"],\n    "crossDepartments": ["Engineering"],\n    "needsImage": false\n  }],\n  "overallSummary": "Deadlines, decisions, risks, impacted departments",\n  "documentType": "safety_circular | procurement | hr_policy | technical_specification | other",\n  "urgencyLevel": "high | medium | low",\n  "departments": ["Engineering", "Operations", "Safety", "Procurement", "HR", "Finance"]\n}`;
}

export async function processDocumentWithAI(
	text: string,
	images: Array<{ base64: string; mimeType: string }>,
	apiKey: string,
	meta?: { department?: string; documentType?: string }
): Promise<{ nodes: Partial<PipelineNode>[]; fullSummary: string }> {
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
	const prompt = buildManagerFocusedPrompt(meta);
	const parts: Array<{
		text?: string;
		inlineData?: { data: string; mimeType: string };
	}> = [];
	parts.push({ text: prompt });
	parts.push({ text: `Document Content (raw text):\n${text}` });
	for (const im of images || []) {
		if (im?.base64 && im?.mimeType) {
			parts.push({ inlineData: { data: im.base64, mimeType: im.mimeType } });
		}
	}
	const req: unknown = {
		contents: [
			{
				role: 'user',
				parts
			}
		],
		generationConfig: {
			responseMimeType: 'application/json' as unknown as never
		}
	};
	// Cast to unknown to avoid strict Part typing mismatches
	type GenContent = { response: { text: () => string } };
	const result = await (
		model as unknown as { generateContent: (r: unknown) => Promise<GenContent> }
	).generateContent(req);
	const responseText = result.response.text();
	try {
		const parsed = JSON.parse(responseText);
		interface ParsedNode {
			pageRange?: { start: number; end: number };
			detailedSummary?: string;
			topicSummary?: string;
			keyPoints?: string[];
			actionableItems?: Array<
				| string
				| { owner?: string; action?: string; due?: string; impact?: string }
			>;
			criticalFlags?: string[];
			crossDepartments?: string[];
			needsImage?: boolean;
		}
		const nodes = ((parsed.nodes as ParsedNode[]) || []).map(
			(node: ParsedNode, index: number) => ({
				pageRange: node.pageRange || { start: index + 1, end: index + 1 },
				content: text, // Use full text for now, AI will provide proper summaries
				topicSummary: node.topicSummary || undefined,
				summary: (node.detailedSummary || node.topicSummary || '').trim(),
				keyPoints: Array.isArray(node.keyPoints)
					? node.keyPoints.map(kp => String(kp).trim()).filter(Boolean)
					: [],
				actionableItems: Array.isArray(node.actionableItems)
					? node.actionableItems
							.map(ai => {
								if (typeof ai === 'string') return ai.trim();
								const owner = (ai.owner || '').trim();
								const act = (ai.action || '').trim();
								const due = (ai.due || '').trim();
								const imp = (ai.impact || '').trim();
								const parts = [
									owner ? `Owner: ${owner}` : '',
									act || '',
									due ? `Due: ${due}` : '',
									imp ? `Impact: ${imp}` : ''
								]
									.filter(Boolean)
									.join(' — ');
								return parts || '';
							})
							.filter(Boolean)
					: [],
				criticalFlags: node.criticalFlags || [],
				crossDepartments: node.crossDepartments || [],
				needsImage: Boolean(node.needsImage)
			})
		);
		return {
			nodes,
			fullSummary: parsed.overallSummary || 'Document processed successfully'
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
}

export async function createLinkedStructure(
	nodes: Partial<PipelineNode>[]
): Promise<PipelineNode[]> {
	const linked: PipelineNode[] = [];
	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];
		linked.push({
			id: `node-${index + 1}`,
			pageRange: node.pageRange || { start: index + 1, end: index + 1 },
			content: node.content || '',
			images: node.images || [],
			summary: node.summary || '',
			keyPoints: node.keyPoints || [],
			actionableItems: node.actionableItems || [],
			nextNodeId: index < nodes.length - 1 ? `node-${index + 2}` : undefined,
			prevNodeId: index > 0 ? `node-${index}` : undefined
		});
	}
	return linked;
}

export function heuristicChunkNodes(
	text: string,
	opts?: { per?: number }
): Partial<PipelineNode>[] {
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

export async function reprocessFromRaw(
	raw: { type: string; content: string; text?: string },
	apiKey: string,
	meta?: { department?: string; documentType?: string }
): Promise<{ nodes: PipelineNode[]; fullSummary: string }> {
	let linkedNodes: PipelineNode[] = [];
	let overallSummary = '';
	if (raw.type === 'pdf') {
		const { pages } = await extractPdfPagesFromBase64(raw.content);
		const MAX_PAGES = Number(process.env.INGEST_MAX_PDF_PAGES || 40);
		const limited = pages.slice(0, Math.max(1, MAX_PAGES));
		try {
			const agentPages: AgentPage[] = limited.map(p => ({
				index: p.index,
				text: p.text,
				images: []
			}));
			const agentResult = await analyzeDocumentWithGemini({
				pages: agentPages,
				apiKey
			});
			const partial = agentResult.nodes.map(n => ({
				pageRange: n.pageRange,
				content: n.content,
				summary: n.summary,
				keyPoints: n.keyPoints,
				actionableItems: n.actionableItems,
				images: (n.images || []).map(im => ({
					page: n.pageRange.start,
					base64: im.base64,
					mimeType: im.mimeType
				}))
			}));
			linkedNodes = await createLinkedStructure(partial);
			overallSummary = agentResult.overallSummary || '';
			const agentBad =
				/agent timeout/i.test(overallSummary || '') || linkedNodes.length <= 1;
			if (agentBad && limited.length > 1) {
				const perPageNodes = limited.map(p => ({
					pageRange: { start: p.index, end: p.index },
					content: p.text,
					summary: p.text
						.split(/(?<=[.!?])\s+/)
						.slice(0, 2)
						.join(' ')
						.slice(0, 500),
					keyPoints: [],
					actionableItems: []
				}));
				linkedNodes = await createLinkedStructure(perPageNodes);
				overallSummary = (raw.text || '').slice(0, 600);
			}
		} catch {
			if (limited.length > 1) {
				const perPageNodes = limited.map(p => ({
					pageRange: { start: p.index, end: p.index },
					content: p.text,
					summary: p.text
						.split(/(?<=[.!?])\s+/)
						.slice(0, 2)
						.join(' ')
						.slice(0, 500),
					keyPoints: [],
					actionableItems: []
				}));
				linkedNodes = await createLinkedStructure(perPageNodes);
				overallSummary = (raw.text || '').slice(0, 600);
			} else {
				const aiResult = await processDocumentWithAI(
					raw.text || '',
					[],
					apiKey,
					meta
				);
				linkedNodes = await createLinkedStructure(aiResult.nodes);
				overallSummary = aiResult.fullSummary;
			}
		}
	} else {
		const aiResult = await processDocumentWithAI(
			raw.text || raw.content,
			[],
			apiKey,
			meta
		);
		linkedNodes = await createLinkedStructure(aiResult.nodes);
		overallSummary = aiResult.fullSummary;
		if (
			linkedNodes.length <= 1 &&
			((raw.text || raw.content)?.length || 0) > 4000
		) {
			linkedNodes = await createLinkedStructure(
				heuristicChunkNodes(raw.text || raw.content, { per: 1800 })
			);
			overallSummary = (overallSummary || raw.text || raw.content).slice(
				0,
				600
			);
		}
	}
	return { nodes: linkedNodes, fullSummary: overallSummary };
}
