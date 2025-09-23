export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { OpenAIEmbeddings } from '@langchain/openai';
import { analyzeDocumentWithGemini, type AgentPage } from '@/lib/agent/geminiAgent';
import { extractPdfPagesFromBase64 } from '@/lib/pdf';

// Summarizer prompt handled via analyzeDocumentWithGemini in agent or simple fallback

async function embed(text: string, apiKey?: string): Promise<number[] | null> {
  if (!apiKey) return null;
  try {
    const e = new OpenAIEmbeddings({ apiKey, model: 'text-embedding-3-small' });
    return await e.embedQuery(text);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { type = 'general', message = '', reprocess = true } = body || {};

    type StoredNode = { id: string; pageRange: { start: number; end: number }; content: string; images: Array<{ base64?: string; mimeType?: string }>; summary: string; keyPoints: string[]; actionableItems: string[]; embedding?: number[]; nextNodeId?: string; prevNodeId?: string };
    type StoredDoc = { id: string; title: string; raw?: { type: string; content: string; text?: string }; nodes?: StoredNode[] };
    const coll = await getCollection<StoredDoc>();
    const doc = await coll.findOne({ id });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const feedback = {
      id: `fb-${Date.now()}`,
      type: String(type),
      message: String(message || ''),
      createdAt: new Date(),
      createdBy: session.sub,
      status: reprocess ? 'reprocess-requested' : 'recorded',
    };

    let updated: { $push: { feedback: typeof feedback; history?: unknown }; $set?: Partial<StoredDoc> & Record<string, unknown> } = { $push: { feedback } };

    if (reprocess && doc.raw && doc.raw.content && doc.raw.type) {
      try {
        const geminiKey = process.env.GEMINI_API_KEY;
        let nodes: StoredNode[] = [];
        let overallSummary = '';
        const openAIKey = process.env.OPENAI_API_KEY;

        if (geminiKey && doc.raw.type === 'pdf') {
          try {
            const { pages } = await extractPdfPagesFromBase64(doc.raw.content);
            const agentPages: AgentPage[] = pages.map((p) => ({ index: p.index, text: p.text, images: [] }));
            const agentResult = await analyzeDocumentWithGemini({ pages: agentPages, apiKey: geminiKey });
            nodes = agentResult.nodes.map((n, i) => ({
              id: `node-${i + 1}`,
              pageRange: n.pageRange,
              content: n.content || '',
              images: n.images || [],
              summary: n.summary || '',
              keyPoints: n.keyPoints || [],
              actionableItems: n.actionableItems || [],
            }));
            overallSummary = agentResult.overallSummary || '';
          } catch {}
        }

        if (!nodes.length) {
          // Fallback to simple re-summarization from existing raw text
          const text = String(doc.raw.text || '');
          nodes = [{ id: 'node-1', pageRange: { start: 1, end: 1 }, content: text.slice(0, 1000), images: [], summary: 'Auto-refresh from feedback.', keyPoints: [], actionableItems: [] }];
          overallSummary = text.substring(0, 500);
        }

        // Re-embed nodes (optional)
        for (const [i, node] of nodes.entries()) {
          const vec = await embed([node.content, node.summary, ...(node.keyPoints || []), ...(node.actionableItems || [])].join(' '), openAIKey);
          node.embedding = vec || undefined;
          node.nextNodeId = i < nodes.length - 1 ? `node-${i + 2}` : undefined;
          node.prevNodeId = i > 0 ? `node-${i}` : undefined;
        }
        const docEmbedding = await embed(`${overallSummary} ${nodes.map((n) => n.summary).join(' ')}`, openAIKey);

        updated = {
          ...updated,
          $set: {
            nodes,
            fullSummary: overallSummary,
            embedding: docEmbedding || null,
            'metadata.updatedAt': new Date(),
          },
          $push: {
            ...updated.$push,
            history: {
              id: `ev-${Date.now()}`,
              type: 'reprocessed',
              by: session.sub,
              at: new Date(),
              feedbackId: feedback.id,
            },
          },
        };
      } catch (e) {
        // On any failure, keep feedback only
      }
    }

    await (coll as unknown as { updateOne: (f: Partial<StoredDoc>, u: typeof updated) => Promise<void> }).updateOne({ id }, updated);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Feedback error', e);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
