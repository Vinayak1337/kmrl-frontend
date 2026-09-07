import { DocumentAction } from '@/types/docsetu';
import { MOCK_ACTIONS } from '@/lib/dummy/mockData';

/**
 * Aggregates all extracted actions across indexed documents
 */
export async function listAllActions(team?: string): Promise<DocumentAction[]> {
	try {
		const sp = new URLSearchParams();
		if (team && team !== 'All') sp.set('team', team);

		const res = await fetch(`/api/actions?${sp.toString()}`, {
			credentials: 'include'
		});

		if (!res.ok) {
			return filterActions(MOCK_ACTIONS, team);
		}

		const data = await res.json();
		const actions = Array.isArray(data.actions) ? data.actions : [];

		if (actions.length === 0) {
			return filterActions(MOCK_ACTIONS, team);
		}

		return actions;
	} catch (err) {
		console.warn('Failed to fetch actions from /api/actions, using mock data fallback', err);
		return filterActions(MOCK_ACTIONS, team);
	}
}

function filterActions(actions: DocumentAction[], team?: string): DocumentAction[] {
	if (!team || team === 'All') return actions;
	return actions.filter(a => (a.team || a.owner || '').toLowerCase().includes(team.toLowerCase()));
}
