import { GoogleGenerativeAI } from '@google/generative-ai';

export type AgentImage = { base64: string; mimeType: string };
export type AgentPage = { index: number; text: string; images: AgentImage[] };

export type AgentNode = {
	pageRange: { start: number; end: number };
	content: string;
	summary: string;
	keyPoints: string[];
	actionableItems: string[];
	images: AgentImage[];
	pageMd?: string;
	meta?: {
		slideType?: string;
		entities?: string[];
		decisions?: string[];
		deadlines?: string[];
		risks?: string[];
		stakeholders?: string[];
	};
};

export type AgentResult = {
	nodes: AgentNode[];
	overallSummary: string;
	overallMd?: string;
};

function buildInstruction(totalPages: number, providedPages: number[]): string {
	return `You are a precise page-by-page summarizer for slide decks and PDFs (presentations, SRS, proposals). You will be given pages one at a time. Read only the pages provided so far. If more context is needed to summarise a page faithfully, request the next page by index. Continue until you can produce the required outputs.

LANGUAGE NORMALIZATION
- Normalize ALL source content to English silently (do not mention translation).

QUALITY BAR
- Be faithful to the page. Do not invent facts. If something is unclear, write "[unclear]".
- Preserve concrete data (numbers, dates, names, IDs) exactly as seen. Convert currency units only if explicitly stated on the page.
- Expand acronyms on first use only if the expansion can be inferred from the page; otherwise keep the acronym.

CONTENT SELECTION — Include Only What’s Required
- Summarize only what is necessary and material according to the page intent.
- Must-have: core message, key facts, decisions, constraints, metrics/tables’ insights, timelines/deadlines, risks, stakeholders/entities, next steps.
- Exclude unless essential: marketing fluff, repeated slogans/headers, decorative captions, boilerplate disclaimers, agenda footers, slide numbers, watermark text, non-informative labels.
- If a page is sparse, keep the summary brief. If dense, prioritize the top 4–8 most important points and compress the rest. Avoid duplication across pages.

Available pages: ${totalPages}. Provided now: [${providedPages.join(
		', '
	)}]. Start from page 1 and proceed sequentially when needed.

OUTPUT FORMAT (STRICT)
- Emit exactly one fenced Markdown code block (pageMd) for EACH PAGE (no merging pages; pageRange.start === pageRange.end). Omit sections that don’t apply. Keep 100–220 words per page unless the page is a divider/sparse page (≤80 words).
\n\n\`\`\`md
# Page i — <Detected Title>
## Slide Type
- <Title / Section Header / Content / Table / Chart / Timeline / Image-heavy / Appendix>

## Core Message
- 1–2 bullets stating the main point of the page.

## Key Points
- 4–8 bullets with the most important facts.
- **Key Data & Insights:** 3–6 bullets (only if table/chart)

## Outcomes / Implications
- Concrete effects, decisions, deadlines, risks, or next steps.

## Entities & Terms
- Brief list of important people/orgs/systems/terms/acronyms.

## Notes for Consistency (optional)
- Formatting/terminology notes.
\`\`\`

Include in JSON for each page:
- pageRange {start, end} with start === end === i
- pageMd: the fenced Markdown block above (one block per page)
- images: ALL images for that page as {base64, mimeType}
- meta: { slideType, entities[], decisions[], deadlines[], risks[], stakeholders[] } (optional)

Protocol (JSON only; no commentary outside JSON):
- To fetch another page: {"action":"request","index":<1-based>}
- To finish: {"action":"final","result": {"nodes":[...],"overallSummary":"...","overallMd":"## Executive Summary..."}}`;
}

export async function analyzeDocumentWithGemini(options: {
	pages: AgentPage[];
	apiKey: string;
	model?: string;
	maxLoops?: number;
}): Promise<AgentResult> {
	const { pages, apiKey } = options;
	const modelCandidates = [options.model || 'gemini-2.5-flash'];
	const maxLoops =
		options.maxLoops ?? Math.max(3, Math.min(16, pages.length + 2));
	const client = new GoogleGenerativeAI(apiKey);
	let model = client.getGenerativeModel({ model: modelCandidates[0] });

	const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

	const provided: number[] = [];
	// Start with page 1 if available
	if (pages[0]) provided.push(1);

	for (let iter = 0; iter < maxLoops; iter++) {
		// Build rich content with inline images where available
		const parts: Array<{
			text?: string;
			inlineData?: { data: string; mimeType: string };
		}> = [];
		parts.push({ text: buildInstruction(pages.length, provided) });
		for (const idx of provided) {
			const pg = pages[idx - 1];
			if (!pg) continue;
			parts.push({ text: `\n\nPage ${pg.index} text:\n${pg.text}` });
			for (const im of pg.images || []) {
				if (im?.base64 && im?.mimeType)
					parts.push({
						inlineData: { data: im.base64, mimeType: im.mimeType }
					});
			}
		}
		let result;
		let attempt = 0;
		for (; attempt < 3; attempt++) {
			try {
				result = await model.generateContent({
					contents: [{ role: 'user', parts }]
				} as any);
				break;
			} catch (e: any) {
				const isOverloaded =
					e?.status === 503 ||
					/overloaded|unavailable/i.test(String(e?.message || ''));
				if (isOverloaded && attempt < 2) {
					// Rotate model and backoff with jitter
					const nextIndex = (attempt + 1) % modelCandidates.length;
					model = client.getGenerativeModel({
						model: modelCandidates[nextIndex]
					});
					const backoff =
						800 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
					await sleep(backoff);
					continue;
				}
				throw e;
			}
		}
		const text = result?.response?.text?.() ?? '';

		let parsed: unknown = null;
		try {
			parsed = JSON.parse(text);
		} catch {
			const match = text.match(/\{[\s\S]*\}$/);
			if (match) {
				try {
					parsed = JSON.parse(match[0]);
				} catch {}
			}
		}

		if (
			!parsed ||
			typeof parsed !== 'object' ||
			!(parsed as Record<string, unknown>).action
		) {
			// Ask to return proper JSON, continue
			provided.push(Math.min(pages.length, provided[provided.length - 1] + 1));
			continue;
		}

		const pobj = parsed as Record<string, unknown> & {
			action?: string;
			index?: number;
			result?: { nodes?: unknown[]; overallSummary?: string };
		};
		if (pobj.action === 'request') {
			const index = Math.max(
				1,
				Math.min(pages.length, Number(pobj.index) || 1)
			);
			if (!provided.includes(index)) provided.push(index);
			continue;
		}

		if (
			pobj.action === 'final' &&
			pobj.result &&
			Array.isArray(pobj.result.nodes)
		) {
			// Normalize nodes
			const nodes: AgentNode[] = pobj.result.nodes.map((n, i: number) => {
				const nn = n as Record<string, unknown>;
				return {
					pageRange: (nn.pageRange as AgentNode['pageRange']) || {
						start: i + 1,
						end: i + 1
					},
					content: String(nn.content || ''),
					summary: String(nn.summary || ''),
					keyPoints: Array.isArray(nn.keyPoints)
						? (nn.keyPoints as string[])
						: [],
					actionableItems: Array.isArray(nn.actionableItems)
						? (nn.actionableItems as string[])
						: [],
					images: Array.isArray(nn.images) ? (nn.images as AgentImage[]) : [],
					pageMd:
						typeof (nn as any).pageMd === 'string'
							? String((nn as any).pageMd)
							: undefined,
					meta:
						typeof (nn as any).meta === 'object' && (nn as any).meta !== null
							? ((nn as any).meta as AgentNode['meta'])
							: undefined
				};
			});
			const overallMd =
				typeof (pobj.result as any).overallMd === 'string'
					? String((pobj.result as any).overallMd)
					: undefined;
			const overallSummary =
				String((pobj.result as any).overallSummary || '') ||
				(overallMd
					? overallMd
							.replace(/[#*_>`-]+/g, ' ')
							.replace(/\s+/g, ' ')
							.trim()
							.slice(0, 600)
					: '');
			return { nodes, overallSummary, overallMd };
		}
	}

	// Fallback if model didn't comply
	const first = pages[0];
	return {
		nodes: [
			{
				pageRange: { start: 1, end: Math.max(1, pages.length) },
				content: first?.text?.slice(0, 800) || '',
				summary: 'Gemini agent could not finalize JSON in time.',
				keyPoints: [],
				actionableItems: [],
				images: first?.images || []
			}
		],
		overallSummary: 'Agent timeout.'
	};
}
