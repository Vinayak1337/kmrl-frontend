import { AuditEntry } from '@/types/docsetu';

export function humanizeAuditAction(action: string): string {
	switch (action.toUpperCase()) {
		case 'CREATE_USER':
			return 'Created team member';
		case 'UPDATE_USER':
			return 'Updated user permissions';
		case 'DELETE_USER':
			return 'De-provisioned user';
		case 'UPLOAD_DOCUMENT':
		case 'INGEST_DOCUMENT':
			return 'Ingested document';
		case 'DELETE_DOCUMENT':
			return 'Removed document';
		case 'TRANSLATE_SECTION':
			return 'Generated translation';
		case 'UPDATE_POLICY':
		case 'POLICY_CHANGE':
			return 'Updated access policy';
		case 'DOWNLOAD_DOCUMENT':
			return 'Exported document';
		case 'QUERY_INTELLIGENCE':
			return 'Cross-corpus query';
		default:
			return action.replace(/_/g, ' ').toLowerCase();
	}
}

export function mapBackendLogToAuditEntry(rawLog: any): AuditEntry {
	const actorName = rawLog.actor?.name || rawLog.actorName || rawLog.actorEmail || 'System';
	const actorEmail = rawLog.actor?.email || rawLog.actorEmail || '';

	let target = '-';
	if (rawLog.target?.name || rawLog.target?.email) {
		target = rawLog.target.name ? `${rawLog.target.name} (${rawLog.target.email})` : rawLog.target.email;
	} else if (typeof rawLog.details === 'object' && rawLog.details !== null) {
		target =
			(rawLog.details.documentTitle as string) ||
			(rawLog.details.title as string) ||
			(rawLog.details.email as string) ||
			(rawLog.details.name as string) ||
			'-';
	}

	return {
		id: rawLog.id || String(Math.random()),
		timestamp: rawLog.createdAt ? new Date(rawLog.createdAt) : new Date(),
		actorName,
		actorEmail,
		action: humanizeAuditAction(rawLog.action || 'ACTIVITY'),
		target,
		details: typeof rawLog.details === 'object' ? rawLog.details : undefined
	};
}

export const DEMO_AUDIT_ENTRIES: AuditEntry[] = [
	{
		id: 'aud-1',
		timestamp: new Date(Date.now() - 18 * 60 * 1000),
		actorName: 'Vinayak Sharma',
		actorEmail: 'vinayak@docsetu.internal',
		action: 'Updated access policy',
		target: 'Procurement Policies (Finance, Procurement)'
	},
	{
		id: 'aud-2',
		timestamp: new Date(Date.now() - 42 * 60 * 1000),
		actorName: 'Lavanya Nair',
		actorEmail: 'lavanya@docsetu.internal',
		action: 'Exported document',
		target: 'Facility Management Agreement & Service Schedules'
	},
	{
		id: 'aud-3',
		timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
		actorName: 'Vidhatri Menon',
		actorEmail: 'vidhatri@docsetu.internal',
		action: 'Ingested document',
		target: 'Procurement Policy & Approval Framework FY26'
	},
	{
		id: 'aud-4',
		timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
		actorName: 'Vinayak Sharma',
		actorEmail: 'vinayak@docsetu.internal',
		action: 'Created team member',
		target: 'Devika Pillai (Compliance)'
	},
	{
		id: 'aud-5',
		timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000),
		actorName: 'Arjun Kurup',
		actorEmail: 'arjun@docsetu.internal',
		action: 'Generated translation',
		target: 'Information Security SOP (Hindi)'
	}
];
