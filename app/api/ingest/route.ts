import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAIEmbeddings } from '@langchain/openai';

import { getCollection } from '@/lib/mongo';

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/<style[\s\S]*?<\/style>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { html?: string; title?: string };
    const html = body.html || '';
    if (!html || html.trim().length === 0) {
      return NextResponse.json({ error: 'html is required' }, { status: 400 });
    }

    const textContent = stripHtml(html);

    // Summarize via Gemini if configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    let summary = '';
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Summarize the following document in 5-8 bullet points suitable for busy metro operations managers. Keep references to any safety directives or regulatory items.\n\n${textContent}`;
        const result = await model.generateContent(prompt as string);
        const response = await result.response;
        summary = response.text();
      } catch (e) {
        console.warn('Gemini summarization failed, continuing without summary', e);
        summary = '';
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

    const coll = await getCollection<{
      title: string | null;
      htmlContent: string;
      textContent: string;
      summary: string;
      embedding: number[] | null;
      createdAt: Date;
    }>();
    const doc: {
      title: string | null;
      htmlContent: string;
      textContent: string;
      summary: string;
      embedding: number[] | null;
      createdAt: Date;
    } = {
      title: body.title || null,
      htmlContent: html,
      textContent,
      summary,
      embedding, // may be null if no OPENAI_API_KEY
      createdAt: new Date(),
    };
    const result = await coll.insertOne(doc);

    return NextResponse.json({ id: result.insertedId.toString(), summary }, { status: 201 });
  } catch (e) {
    console.error('Ingest error', e);
    return NextResponse.json({ error: 'Failed to ingest document' }, { status: 500 });
  }
}
