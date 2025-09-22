export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { getMongo } from '@/lib/mongo';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || url.searchParams.get('q') || '';
    if (!query.trim()) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'Embeddings not configured' }, { status: 500 });
    }

    const { db } = await getMongo();
    const collectionName = process.env.MONGODB_COLLECTION || 'documents';
    const collection = db.collection(collectionName);

    const indexName = process.env.MONGODB_VECTOR_INDEX || 'vector_index';
    const embeddings = new OpenAIEmbeddings({ apiKey: openaiKey, model: 'text-embedding-3-small' });

    const store = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName,
      textKey: 'textContent',
      embeddingKey: 'embedding',
    });

    const docs = await store.similaritySearch(query, 5);

    type DocMeta = { summary?: string; title?: string };
    const results = docs.map((d): { id: string | null; textContent: string; summary: string | null; title: string | null } => {
      const meta: DocMeta = (d.metadata || {}) as DocMeta;
      return {
        id: null as string | null,
        textContent: d.pageContent || '',
        summary: meta.summary || null,
        title: meta.title || null,
      };
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch (e) {
    console.error('Search error', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
