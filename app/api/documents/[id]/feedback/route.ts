export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { reprocessFromRaw, type PipelineNode } from '@/lib/ingest/pipeline';

// Summarizer prompt handled via analyzeDocumentWithGemini in agent or simple fallback

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { type = 'general', message = '', reprocess = true } = body || {};

    type StoredNode = PipelineNode & { embedding?: number[] };
    type StoredDoc = { id: string; title: string; raw?: { type: string; content: string; text?: string }; nodes?: StoredNode[]; metadata?: Record<string, unknown> };
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
        const geminiKey = process.env.GEMINI_API_KEY as string;
        const { nodes, fullSummary } = await reprocessFromRaw(doc.raw, geminiKey, { department: (doc.metadata as any)?.department, documentType: (doc.metadata as any)?.documentType });

        updated = {
          ...updated,
          $set: {
            nodes: nodes as StoredNode[],
            fullSummary: fullSummary,
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
