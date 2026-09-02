import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session || session.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const page = Math.max(0, parseInt(searchParams.get('page') || '0'));
		const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '25')));
		const actionFilter = searchParams.get('action');
		const actorFilter = searchParams.get('actor');

		const where: Record<string, any> = {};
		if (actionFilter && actionFilter !== 'All') {
			where.action = actionFilter;
		}
		if (actorFilter) {
			where.actorId = actorFilter;
		}

		const [total, rawAudits] = await Promise.all([
			prisma.userAudit.count({ where }),
			prisma.userAudit.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: page * pageSize,
				take: pageSize
			})
		]);

		// Populate actor user names and emails
		const actorIds = Array.from(new Set(rawAudits.map(a => a.actorId)));
		const actors = await prisma.user.findMany({
			where: { id: { in: actorIds } },
			select: { id: true, name: true, email: true }
		});
		const actorMap = new Map<string, { name: string; email: string }>();
		actors.forEach(u => actorMap.set(u.id, { name: u.name, email: u.email }));

		const logs = rawAudits.map(entry => {
			const actor = actorMap.get(entry.actorId);
			return {
				id: entry.id,
				actorId: entry.actorId,
				actorName: actor?.name || 'Admin',
				actorEmail: actor?.email || '',
				targetUserId: entry.targetUserId,
				action: entry.action,
				details: entry.details,
				createdAt: entry.createdAt
			};
		});

		return NextResponse.json({ logs, total, page, pageSize }, { status: 200 });
	} catch (error) {
		console.error('Audit log fetch error:', error);
		return NextResponse.json(
			{ error: 'Failed to retrieve audit logs' },
			{ status: 500 }
		);
	}
}
