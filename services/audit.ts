import { AuditEntry } from '@/types/docsetu';
import { mapBackendLogToAuditEntry, DEMO_AUDIT_ENTRIES } from '@/adapters/auditAdapter';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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
	try {
		const sp = new URLSearchParams();
		if (params.page !== undefined) sp.set('page', String(params.page));
		if (params.action) sp.set('action', params.action);
		if (params.actor) sp.set('actor', params.actor);
		if (params.from) sp.set('from', params.from);
		if (params.to) sp.set('to', params.to);

		const res = await fetch(`/api/audit?${sp.toString()}`, {
			credentials: 'include'
		});

		if (!res.ok) {
			if (DEMO_MODE) {
				return { entries: DEMO_AUDIT_ENTRIES, total: DEMO_AUDIT_ENTRIES.length };
			}
			return { entries: [], total: 0 };
		}

		const data = await res.json();
		const rawLogs = Array.isArray(data.logs) ? data.logs : [];
		if (rawLogs.length === 0 && DEMO_MODE) {
			return { entries: DEMO_AUDIT_ENTRIES, total: DEMO_AUDIT_ENTRIES.length };
		}

		return {
			entries: rawLogs.map(mapBackendLogToAuditEntry),
			total: data.total || rawLogs.length
		};
	} catch {
		if (DEMO_MODE) {
			return { entries: DEMO_AUDIT_ENTRIES, total: DEMO_AUDIT_ENTRIES.length };
		}
		return { entries: [], total: 0 };
	}
}
