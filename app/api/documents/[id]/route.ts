export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { prisma } from '@/lib/prisma';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const { id } = await ctx.params;
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	// Only ADMIN role can permanently delete documents
	if (session.role !== 'ADMIN') {
		return NextResponse.json(
			{ error: 'Forbidden. Admin role required to delete documents.' },
			{ status: 403 }
		);
	}

	try {
		const collection = await getCollection<DocumentRecord>();
		const existing = await collection.findOne({ id });
		if (!existing) {
			return NextResponse.json({ error: 'Document not found' }, { status: 404 });
		}

		await collection.deleteOne({ id });

		try {
			const nodes = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);
			await nodes.deleteMany({ docId: id });
		} catch {}

		// Cascade: delete associated chat sessions
		try {
			const chatSessions = await getCollection(
				process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions'
			);
			await chatSessions.deleteMany({ docId: id });
		} catch {}

		// Audit log deletion
		try {
			const isHex24 = /^[0-9a-fA-F]{24}$/.test(session.sub);
			let actorObjectId = isHex24 ? session.sub : null;
			if (!actorObjectId) {
				const admin = await prisma.user.findFirst({ select: { id: true } });
				actorObjectId = admin?.id || '000000000000000000000001';
			}
			await prisma.userAudit.create({
				data: {
					actorId: actorObjectId,
					targetUserId: actorObjectId,
					action: 'DELETE_DOCUMENT',
					details: {
						documentId: id,
						title: existing.title
					}
				}
			});
		} catch {}

		return NextResponse.json({ ok: true });
	} catch (e) {
		console.error('Delete error', e);
		return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
	}
}
