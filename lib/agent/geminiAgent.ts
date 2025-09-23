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
};

export type AgentResult = {
  nodes: AgentNode[];
  overallSummary: string;
};

function buildInstruction(totalPages: number, providedPages: number[]): string {
  return `You are a KMRL document analysis agent.
Analyze page-by-page. Only some pages are provided per turn.
Available pages: ${totalPages}. Provided now: [${providedPages.join(', ')}].

Manager focus:
- Extract decisions, deadlines, compliance items (e.g., CMRS/MoHUA), and parameters/limits.
- Call out cross-department dependencies and risks (safety/compliance/service).
- Group consecutive pages with the same topic into one node.
- Always write in English.

For each node, return:
- pageRange {start, end}
- content: representative snippet
- summary: 3–6 sentences, manager-ready
- keyPoints: 3–8 bullets (facts, parameters, KPIs)
- actionableItems: 0–5 bullets as strings like "Owner: <role|dept> — <action> — Due: <date> — Impact: <risk|benefit>"
- images: up to 4 images as {base64, mimeType} if present

Protocol (JSON only):
- To fetch another page: {"action":"request","index":<1-based>}
- To finish: {"action":"final","result": {"nodes":[...],"overallSummary":"..."}}
No commentary.`;
}

function pageToParts(page: AgentPage): Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> {
  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
  parts.push({ text: `Page ${page.index} text:\n${page.text}` });
  for (const img of page.images.slice(0, 4)) {
    if (img.base64 && img.mimeType) parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
  }
  return parts;
}

export async function analyzeDocumentWithGemini(options: {
  pages: AgentPage[];
  apiKey: string;
  model?: string;
  maxLoops?: number;
}): Promise<AgentResult> {
  const { pages, apiKey } = options;
  const modelName = options.model || 'gemini-2.0-flash-001';
  const maxLoops = options.maxLoops ?? Math.max(3, Math.min(16, pages.length + 2));
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: modelName });

  const provided: number[] = [];
  // Start with page 1 if available
  if (pages[0]) provided.push(1);

  for (let iter = 0; iter < maxLoops; iter++) {
    let promptStr = buildInstruction(pages.length, provided) + '\n\n';
    for (const idx of provided) {
      const pg = pages[idx - 1];
      if (!pg) continue;
      promptStr += `Page ${pg.index} text:\n${pg.text}\n\n`;
    }
    const result = await model.generateContent(promptStr);
    const text = result?.response?.text?.() ?? '';

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}$/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    if (!parsed || typeof parsed !== 'object' || !(parsed as Record<string, unknown>).action) {
      // Ask to return proper JSON, continue
      provided.push(Math.min(pages.length, provided[provided.length - 1] + 1));
      continue;
    }

    const pobj = parsed as Record<string, unknown> & { action?: string; index?: number; result?: { nodes?: unknown[]; overallSummary?: string } };
    if (pobj.action === 'request') {
      const index = Math.max(1, Math.min(pages.length, Number(pobj.index) || 1));
      if (!provided.includes(index)) provided.push(index);
      continue;
    }

    if (pobj.action === 'final' && pobj.result && Array.isArray(pobj.result.nodes)) {
      // Normalize nodes
      const nodes: AgentNode[] = pobj.result.nodes.map((n, i: number) => {
        const nn = n as Record<string, unknown>;
        return {
          pageRange: (nn.pageRange as AgentNode['pageRange']) || { start: i + 1, end: i + 1 },
          content: String(nn.content || ''),
          summary: String(nn.summary || ''),
          keyPoints: Array.isArray(nn.keyPoints) ? (nn.keyPoints as string[]) : [],
          actionableItems: Array.isArray(nn.actionableItems) ? (nn.actionableItems as string[]) : [],
          images: Array.isArray(nn.images) ? (nn.images as AgentImage[]).slice(0, 4) : [],
        };
      });
      return { nodes, overallSummary: String(pobj.result.overallSummary || '') };
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
        images: first?.images?.slice(0, 2) || [],
      },
    ],
    overallSummary: 'Agent timeout.',
  };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
