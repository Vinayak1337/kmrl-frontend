export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentNodeRecord } from '@/types/documents';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    type StoredDoc = { id: string };
    const collection = await getCollection<StoredDoc>();
    const result = await (collection as unknown as { deleteOne: (f: Partial<StoredDoc>) => Promise<{ deletedCount: number }> }).deleteOne({ id });
    try {
      const nodes = await getCollection<DocumentNodeRecord>(process.env.MONGODB_NODES_COLLECTION || 'document_nodes');
      // Best-effort cleanup of node documents for this document
      await (nodes as unknown as { deleteMany: (f: Partial<DocumentNodeRecord>) => Promise<void> }).deleteMany?.({ docId: id });
    } catch {}
    if (!result?.deletedCount) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Delete error', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
