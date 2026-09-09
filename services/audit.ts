import { AuditEntry } from '@/types/docsetu';
import { mapBackendLogToAuditEntry } from '@/adapters/auditAdapter';


export interface AuditFilterParams {
	page?: number;
	action?: string;
	actor?: string;
	from?: string;
	to?: string;
}

export async function listAuditEntries(
	params: AuditFilterParams = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.action) sp.set('action', params.action);
  if (params.actor) sp.set('actor', params.actor);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  const res = await fetch(`/api/audit?${sp}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load audit history');
  const data = await res.json();
  if (!Array.isArray(data.logs)) throw new Error('Invalid audit response');
  return { entries: data.logs.map(mapBackendLogToAuditEntry), total: data.total ?? data.logs.length };
}
