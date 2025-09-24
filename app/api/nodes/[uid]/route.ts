export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentNodeRecord } from '@/types/documents';

export async function GET(req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  const { uid } = await ctx.params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const neighbors = searchParams.get('neighbors') === 'true';

  try {
    const coll = await getCollection<DocumentNodeRecord>(process.env.MONGODB_NODES_COLLECTION || 'document_nodes');
    const node = await coll.findOne({ uid });
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!neighbors) return NextResponse.json({ node });

    const [prev, next] = await Promise.all([
      node.prevNodeId ? coll.findOne({ docId: node.docId, nodeId: node.prevNodeId }) : Promise.resolve(null),
      node.nextNodeId ? coll.findOne({ docId: node.docId, nodeId: node.nextNodeId }) : Promise.resolve(null),
    ]);
    return NextResponse.json({ node, prev, next });
  } catch (e) {
    console.error('Get node error', e);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}

