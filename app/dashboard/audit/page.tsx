import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

type SearchParams = {
  page?: string;
  action?: string;
  actor?: string; // actor email (exact)
  target?: string; // target email (exact)
  from?: string; // ISO date
  to?: string;   // ISO date
};

export const dynamic = 'force-dynamic';

export default async function AuditPage(props: unknown) {
  const { searchParams } = (props as { searchParams?: SearchParams });
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session || session.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);
  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;

  const where: {
    action?: string;
    createdAt?: { gte?: Date; lte?: Date };
    actorId?: string;
    targetUserId?: string;
  } = {};
  const action = (searchParams?.action || '').trim();
  if (action) where.action = action;

  const fromStr = (searchParams?.from || '').trim();
  const toStr = (searchParams?.to || '').trim();
  if (fromStr || toStr) {
    const range: { gte?: Date; lte?: Date } = {};
    if (fromStr) range.gte = new Date(fromStr);
    if (toStr) range.lte = new Date(toStr);
    where.createdAt = range;
  }

  // Eager resolve actor/target emails to IDs (exact match)
  const actorEmail = (searchParams?.actor || '').toLowerCase().trim();
  if (actorEmail) {
    const actorUser = await prisma.user.findUnique({ where: { email: actorEmail }, select: { id: true } });
    if (!actorUser) {
      return renderPage([], 0, page, PAGE_SIZE, searchParams);
    }
    where.actorId = actorUser.id;
  }
  const targetEmail = (searchParams?.target || '').toLowerCase().trim();
  if (targetEmail) {
    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true } });
    if (!targetUser) {
      return renderPage([], 0, page, PAGE_SIZE, searchParams);
    }
    where.targetUserId = targetUser.id;
  }

  const [total, logs] = await Promise.all([
    prisma.userAudit.count({ where }),
    prisma.userAudit.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE }),
  ]);

  // Load actor/target display info
  const ids = Array.from(new Set(logs.flatMap(l => [l.actorId, l.targetUserId]).filter(Boolean))) as string[];
  const users = ids.length > 0 ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  return renderPage(logs.map(l => ({
    ...l,
    actor: userMap.get(l.actorId) || null,
    target: userMap.get(l.targetUserId) || null,
  })), total, page, PAGE_SIZE, searchParams);
}

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && v.trim()) sp.set(k, v);
  });
  return sp.toString();
}

type HydratedLog = {
  id: string;
  actorId: string;
  targetUserId: string;
  action: string;
  details: unknown | null;
  createdAt: Date;
  actor: { id: string; name: string; email: string } | null;
  target: { id: string; name: string; email: string } | null;
};

function renderPage(
  logs: HydratedLog[],
  total: number,
  page: number,
  pageSize: number,
  searchParams?: SearchParams,
) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  const params = searchParams || {};

  return (
    <div className="light-scope min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">Back to Dashboard</Link>
        </div>

        {/* Filters */}
        <form className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Action</label>
              <input name="action" defaultValue={params.action || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="CREATE_USER" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Actor Email</label>
              <input name="actor" defaultValue={params.actor || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="admin@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Target Email</label>
              <input name="target" defaultValue={params.target || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">From</label>
              <input type="date" name="from" defaultValue={params.from || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">To</label>
              <input type="date" name="to" defaultValue={params.to || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" type="submit">Apply</button>
            <Link href="/dashboard/audit" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Reset</Link>
          </div>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.actor ? `${log.actor.name} <${log.actor.email}>` : log.actorId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.target ? `${log.target.name} <${log.target.email}>` : log.targetUserId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <code className="text-xs">{log.details ? JSON.stringify(log.details) : '-'}</code>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-gray-500 text-sm" colSpan={5}>No results.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} total</div>
          <div className="flex gap-2">
            {prevPage && (
              <Link
                href={`/dashboard/audit?${buildQuery({ ...params, page: String(prevPage) })}`}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {nextPage && (
              <Link
                href={`/dashboard/audit?${buildQuery({ ...params, page: String(nextPage) })}`}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
