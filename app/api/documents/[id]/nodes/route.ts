export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentNodeRecord } from '@/types/documents';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || '0');
    const page = Number(searchParams.get('page') || '0');

    const nodesColl = await getCollection<DocumentNodeRecord>(process.env.MONGODB_NODES_COLLECTION || 'document_nodes');
    const cursor = nodesColl.find({ docId: id }).sort({ order: 1 });
    if (limit > 0) cursor.skip(Math.max(0, page) * limit).limit(limit);
    const nodes = await cursor.toArray();

    const total = await nodesColl.countDocuments({ docId: id });
    return NextResponse.json({ docId: id, total, nodes });
  } catch (e) {
    console.error('Fetch nodes error', e);
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
  }
}

