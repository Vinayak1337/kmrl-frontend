import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

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

type FetchPageFn = (index: number) => Promise<AgentPage | null>;

function buildToolsSpec() {
  return [
    {
      type: 'function',
      function: {
        name: 'fetch_page',
        description: 'Fetch the next page of the document by its 1-based index. Use this repeatedly until you have enough context to produce a final structured summary.',
        parameters: {
          type: 'object',
          properties: {
            index: { type: 'number', description: '1-based page index to fetch' },
          },
          required: ['index'],
        },
      },
    },
  ];
}

function seedMessages(totalPages: number) {
  const sys = new SystemMessage(
    `You are a document analysis agent for KMRL. You must analyze a document page-by-page to produce a linked list of sections (nodes).

At each step, call the fetch_page tool to request the next page (1-based). Read pages sequentially. Stop when you have enough context.
When finished, return ONLY a compact JSON object with fields: {"nodes": [...], "overallSummary": "..."}.

Each node must include: pageRange {start, end}, content (representative text snippet), summary (2-5 sentences), keyPoints (3-7 bullets), actionableItems (0-5 bullets), images (array of {base64, mimeType}).
Ensure nodes chain logically in order. Avoid verbosity. Do not include explanation outside the JSON.
Available pages: ${totalPages}.`
  );
  const human = new HumanMessage(
    'Begin analysis. Start by calling fetch_page with index=1. Continue requesting further pages until you can produce the final JSON.'
  );
  return [sys, human];
}

export async function analyzeDocumentWithAgent(options: {
  pages: AgentPage[];
  openAIKey?: string;
  maxToolLoops?: number;
}): Promise<AgentResult> {
  const { pages, openAIKey } = options;
  const maxToolLoops = options.maxToolLoops ?? Math.max(3, Math.min(20, pages.length + 2));

  if (!openAIKey) {
    // Fallback: quick single-node result without network
    const first = pages[0];
    return {
      nodes: [
        {
          pageRange: { start: 1, end: Math.max(1, pages.length) },
          content: first?.text?.slice(0, 800) || '',
          summary: 'Document processed without LLM (no API key). Provide OPENAI_API_KEY for agent-based analysis.',
          keyPoints: [],
          actionableItems: [],
          images: first?.images?.slice(0, 2) || [],
        },
      ],
      overallSummary: 'Agent disabled due to missing OPENAI_API_KEY.',
    };
  }

  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0, apiKey: openAIKey });
  const llmWithTools = llm.bind({ tools: buildToolsSpec() });

  const getPage: FetchPageFn = async (i) => {
    const idx = Math.max(1, Math.min(pages.length, i));
    const pg = pages[idx - 1];
    if (!pg) return null;
    return pg;
  };

  const messages = seedMessages(pages.length);

  for (let iter = 0; iter < maxToolLoops; iter++) {
    const resp = (await llmWithTools.invoke(messages)) as AIMessage;

    type ToolCall = { id: string; type: string; function: { name: string; arguments: string } };
    const toolCalls = (resp as unknown as { tool_calls?: ToolCall[] }).tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      for (const call of toolCalls) {
        if (call.function?.name !== 'fetch_page') continue;
        let args: { index?: number } = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {}
        const pageIndex = typeof args.index === 'number' ? args.index : 1;
        const page = await getPage(pageIndex);
        const payload = page
          ? { index: page.index, text: page.text, images: page.images || [] }
          : { error: `Page ${pageIndex} not found` };
        messages.push(resp);
        messages.push(new ToolMessage({ content: JSON.stringify(payload), tool_call_id: call.id }));
      }
      continue;
    }

    // No tool calls — try to parse final JSON
    const content = Array.isArray(resp.content)
      ? (resp.content as Array<unknown>)
          .map((c) => (typeof (c as { text?: string })?.text === 'string' ? (c as { text?: string }).text as string : ''))
          .join('\n')
      : String(resp.content ?? '');
    let parsed: AgentResult | null = null;
    try {
      // Try direct JSON parse
      parsed = JSON.parse(content) as AgentResult;
    } catch {
      // Try to extract a JSON block
      const match = content.match(/\{[\s\S]*\}$/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as AgentResult;
        } catch {}
      }
    }
    if (parsed && Array.isArray(parsed.nodes)) {
      // Normalize nodes
      const nodes: AgentNode[] = parsed.nodes.map((n, i) => ({
        pageRange: n.pageRange || { start: i + 1, end: i + 1 },
        content: n.content || '',
        summary: n.summary || '',
        keyPoints: Array.isArray(n.keyPoints) ? n.keyPoints : [],
        actionableItems: Array.isArray(n.actionableItems) ? n.actionableItems : [],
        images: Array.isArray(n.images) ? n.images : [],
      }));
      return { nodes, overallSummary: parsed.overallSummary || '' };
    }

    // If couldn't parse, add a clarifying instruction and loop once more
    messages.push(
      new HumanMessage(
        'Return ONLY valid JSON for the final result in the required schema. Do not include explanations.'
      )
    );
  }

  // Fallback if tool loop exhausted
  const sample = pages[0]?.text || '';
  return {
    nodes: [
      {
        pageRange: { start: 1, end: Math.max(1, pages.length) },
        content: sample.slice(0, 800),
        summary: 'Agent did not return structured JSON in time. Please retry.',
        keyPoints: [],
        actionableItems: [],
        images: pages[0]?.images || [],
      },
    ],
    overallSummary: 'Agent timeout.',
  };
}
