import { generateWithMuseSpark } from '@/lib/ai/opencodeZen';

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

/**
 * Analyzes document pages using OpenCode Zen - Muse Spark 1.3 free model
 * Fully preserves interface compatibility with analyzeDocumentWithGemini
 */
export async function analyzeDocumentWithGemini(options: {
	pages: AgentPage[];
	apiKey?: string;
	model?: string;
	maxLoops?: number;
}): Promise<AgentResult> {
	const { pages } = options;

	if (!pages || pages.length === 0) {
		return {
			nodes: [],
			overallSummary: 'No pages provided for analysis.'
		};
	}

	const systemInstruction = `You are a manager-focused technical document analysis agent for DocSetu.
You will be given the text of document pages.
Analyze the document page-by-page and return ONLY valid JSON matching this schema:
{
  "overallSummary": "Executive summary of the whole document (3-5 sentences).",
  "overallMd": "## Executive Summary\\nKey highlights and strategic impact...",
  "nodes": [
    {
      "pageRange": { "start": 1, "end": 1 },
      "content": "A representative excerpt of the text on this page",
      "summary": "Concise summary of this page (2-4 sentences)",
      "keyPoints": ["3-6 core takeaways or facts"],
      "actionableItems": ["0-4 specific compliance tasks, sign-offs, or deadlines"],
      "meta": {
        "slideType": "Policy / Technical / Financial / Circular / Agreement",
        "decisions": ["Any decisions made or required"],
        "deadlines": ["Any explicit dates or timelines mentioned"],
        "risks": ["Potential risks or compliance liabilities"],
        "stakeholders": ["Responsible teams or entities"]
      }
    }
  ]
}
CRITICAL:
1. Return ONLY the JSON object. Do not include markdown code fences or conversational text.
2. Preserve exact dates, numbers, currency values (e.g., ₹25 Lakhs), and acronyms.
3. Every page must have a corresponding node in order.`;

	const pagesContext = pages
		.map(p => `--- PAGE ${p.index} ---\n${p.text}`)
		.join('\n\n');

	try {
		const res = await generateWithMuseSpark({
			instructions: systemInstruction,
			input: `Total pages: ${pages.length}\n\nDocument Content:\n${pagesContext}`
		});

		const raw = res.text.trim();
		let parsed: any = null;

		try {
			parsed = JSON.parse(raw);
		} catch {
			const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
			if (match && match[1]) {
				try {
					parsed = JSON.parse(match[1]);
				} catch {}
			}
		}

		if (parsed && Array.isArray(parsed.nodes)) {
			const nodes: AgentNode[] = parsed.nodes.map((n: any, i: number) => {
				const pg = pages[i] || pages[pages.length - 1];
				return {
					pageRange: n.pageRange || { start: i + 1, end: i + 1 },
					content: String(n.content || pg?.text?.slice(0, 500) || ''),
					summary: String(n.summary || ''),
					keyPoints: Array.isArray(n.keyPoints) ? n.keyPoints : [],
					actionableItems: Array.isArray(n.actionableItems) ? n.actionableItems : [],
					images: pg?.images || [],
					pageMd: typeof n.pageMd === 'string' ? n.pageMd : undefined,
					meta: typeof n.meta === 'object' && n.meta !== null ? n.meta : undefined
				};
			});

			return {
				nodes,
				overallSummary: String(parsed.overallSummary || ''),
				overallMd: String(parsed.overallMd || '')
			};
		}
	} catch (err) {
		console.warn('[analyzeDocumentWithGemini] Muse Spark analysis failed, using structured heuristic fallback:', err);
	}

	// Graceful heuristic fallback if LLM request times out
	const nodes: AgentNode[] = pages.map((pg, i) => {
		const lines = pg.text.split('\n').map(l => l.trim()).filter(Boolean);
		const keyPoints = lines.slice(0, 4);
		return {
			pageRange: { start: i + 1, end: i + 1 },
			content: pg.text.slice(0, 600),
			summary: lines[0] ? `${lines[0]} - Section covering ${lines.slice(1, 3).join(', ')}.` : 'Section content extracted from document.',
			keyPoints: keyPoints.length > 0 ? keyPoints : ['Document section indexed successfully.'],
			actionableItems: lines.filter(l => /\b(must|shall|review|submit|approve|ensure)\b/i.test(l)).slice(0, 3),
			images: pg.images || []
		};
	});

	return {
		nodes,
		overallSummary: `Document processed with ${pages.length} section(s). All sections indexed and available for semantic search and compliance tracking.`
	};
}
