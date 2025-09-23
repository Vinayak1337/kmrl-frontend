export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { parseHtmlForIngestion } from '@/lib/html';
import { type AgentPage } from '@/lib/agent/documentAgent';
import { analyzeDocumentWithGemini } from '@/lib/agent/geminiAgent';

type Body = {
  title?: string;
  pages?: Array<{ text?: string; html?: string; images?: Array<{ base64: string; mimeType: string }> }>;
  html?: string; // optional single HTML; will be chunked
};

function chunkText(input: string, chars = 3000): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < input.length) {
    chunks.push(input.slice(i, i + chars));
    i += chars;
  }
  return chunks.length ? chunks : [''];
}

export async function POST(request: NextRequest) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as Body;
    let pages: AgentPage[] = [];

    if (Array.isArray(body.pages) && body.pages.length > 0) {
      pages = body.pages.map((p, i) => ({
        index: i + 1,
        text: p.text || (p.html ? parseHtmlForIngestion(p.html).textContent : ''),
        images: Array.isArray(p.images) ? p.images.slice(0, 4) : [],
      }));
    } else if (typeof body.html === 'string' && body.html.trim()) {
      const parsed = parseHtmlForIngestion(body.html);
      const textChunks = chunkText(parsed.textContent, 3500);
      // Distribute images across first few chunks
      const imgs = parsed.images.map((im) => ({ base64: im.base64, mimeType: im.mimeType }));
      const per = Math.max(1, Math.ceil(imgs.length / Math.max(1, textChunks.length)));
      pages = textChunks.map((t, i) => ({ index: i + 1, text: t, images: imgs.slice(i * per, i * per + per) }));
    } else {
      return NextResponse.json({ error: 'Provide pages[] or html' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const result = await analyzeDocumentWithGemini({ pages, apiKey: String(geminiKey) });

    // Link nodes sequentially
    const nodes = result.nodes.map((n, i) => ({
      id: `node-${i + 1}`,
      pageRange: n.pageRange,
      content: n.content,
      images: n.images?.map((im) => ({ page: n.pageRange.start, base64: im.base64, mimeType: im.mimeType })) || [],
      summary: n.summary,
      summaryMd: (n as any).pageMd || undefined,
      keyPoints: n.keyPoints,
      actionableItems: n.actionableItems,
      meta: (n as any).meta || undefined,
      nextNodeId: i < result.nodes.length - 1 ? `node-${i + 2}` : undefined,
      prevNodeId: i > 0 ? `node-${i}` : undefined,
    }));

    console.log(`[agent] analyzed '${body.title || 'untitled'}' | pages=${pages.length} | nodes=${nodes.length}`);

    return NextResponse.json(
      {
        success: true,
        title: body.title || 'Untitled Document',
        totalPages: pages.length,
        overallSummary: result.overallSummary,
        nodes,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('Agent ingestion error', e);
    return NextResponse.json({ error: 'Agent ingestion failed' }, { status: 500 });
  }
}
