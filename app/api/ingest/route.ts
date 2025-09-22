export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAIEmbeddings } from '@langchain/openai';

import { getCollection } from '@/lib/mongo';
import { parseHtmlForIngestion } from '@/lib/html';
import { buildSystemPrompt, buildUserInstruction, type AiAnalysis } from '@/lib/prompt';
type GeminiPart = { text?: string } | { inlineData: { data: string; mimeType: string } };
type IngestDoc = {
  title: string | null;
  htmlContent: string;
  textContent: string;
  summary: string;
  embedding: number[] | null;
  ai: AiAnalysis | null;
  imageCount: number;
  metadata: { title: string | null; summary: string };
  createdAt: Date;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { html?: string; title?: string };
    const html = body.html || '';
    if (!html || html.trim().length === 0) {
      return NextResponse.json({ error: 'html is required' }, { status: 400 });
    }

    const { textContent, images } = parseHtmlForIngestion(html);

    // Summarize via Gemini if configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    let summary = '';
    let analysis: AiAnalysis | null = null;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const systemPrompt = buildSystemPrompt();
        const userInstruction = buildUserInstruction();
        const parts: GeminiPart[] = [
          { text: systemPrompt },
          { text: userInstruction },
          { text: `Full HTML (for reference):\n${html}` },
          { text: `Plain text: ${textContent}` },
        ];
        // Add up to 8 images, max ~2.5MB each to keep within limits
        const MAX_IMAGES = Number(process.env.INGEST_MAX_IMAGES || 8);
        const MAX_BYTES = Number(process.env.INGEST_MAX_IMAGE_BYTES || 2_500_000);
        let imageCount = 0;
        for (const img of images) {
          if (imageCount >= MAX_IMAGES) break;
          if (!img.base64 || !img.mimeType) continue;
          if (img.bytes > MAX_BYTES) continue;
          parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
          imageCount++;
        }

        // Build a single prompt string with all text content
        const prompt = parts
          .map(part => {
            if ('text' in part && part.text) return part.text;
            return ''; // Skip image parts for now
          })
          .filter(Boolean)
          .join('\n\n');
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        try {
          analysis = JSON.parse(text) as AiAnalysis;
          summary = analysis.overall_summary || '';
        } catch {
          analysis = null;
          summary = text;
        }
      } catch (e) {
        console.warn('Gemini summarization failed, continuing without summary', e);
        summary = '';
        analysis = null;
      }
    }

    // Embedding via OpenAI (optional)
    let embedding: number[] | null = null;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const embedder = new OpenAIEmbeddings({ apiKey: openaiKey, model: 'text-embedding-3-small' });
      const contentForEmbedding = `${textContent}\n\n${summary}`.trim();
      embedding = await embedder.embedQuery(contentForEmbedding);
    }

    const coll = await getCollection<IngestDoc>();
    const doc: IngestDoc = {
      title: body.title || null,
      htmlContent: html,
      textContent,
      summary,
      embedding, // may be null if no OPENAI_API_KEY
      ai: analysis, // structured partitions if available
      imageCount: images.length,
      metadata: { title: body.title || null, summary },
      createdAt: new Date(),
    };
    const result = await coll.insertOne(doc);

    return NextResponse.json({ id: result.insertedId.toString(), summary, ai: analysis }, { status: 201 });
  } catch (e) {
    console.error('Ingest error', e);
    return NextResponse.json({ error: 'Failed to ingest document' }, { status: 500 });
  }
}
