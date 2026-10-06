export type DeadlineTier = 'overdue' | 'within5' | 'within15' | 'within30' | 'later';
export type DeadlineAlert = {
  id: string;
  documentId: string;
  documentTitle: string;
  sectionId: string;
  sectionTitle: string;
  pageStart?: number;
  pageEnd?: number;
  date: string;
  dateText: string;
  requirement: string;
  daysLeft: number;
  tier: DeadlineTier;
  authorities: Array<{ email: string; label?: string }>;
  notifications: Array<{ recipients: string[]; createdAt: string; sentBy: string }>;
};

export async function listDeadlineAlerts(): Promise<{ alerts: DeadlineAlert[]; documents: number }> {
  const res = await fetch('/api/alerts', { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load deadlines');
  const data = await res.json();
  if (!Array.isArray(data.alerts)) throw new Error('Invalid deadlines response');
  return { alerts: data.alerts, documents: data.documents ?? 0 };
}

export async function notifyAuthorities(alertId: string, recipients: string[], note: string) {
  const res = await fetch('/api/alerts/notify', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId, recipients, note }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not record the notification');
  return data as { recorded: string[]; duplicates: string[]; delivery: 'email-pending' };
}

export const TIER_LABEL: Record<DeadlineTier, string> = {
  overdue: 'Overdue', within5: 'Within 5 days', within15: 'Within 15 days', within30: 'Within 30 days', later: '30+ days',
};

export function daysLabel(days: number) {
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}
