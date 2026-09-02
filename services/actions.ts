import { DocumentAction } from '@/types/docsetu';
import { DEMO_DOCSETU_DOCUMENTS } from '@/adapters/documentAdapter';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Aggregates all extracted actions across indexed documents from canonical API
 */
export async function listAllActions(team?: string): Promise<DocumentAction[]> {
	try {
		const sp = new URLSearchParams();
		if (team && team !== 'All') sp.set('team', team);

		const res = await fetch(`/api/actions?${sp.toString()}`, {
			credentials: 'include'
		});

		if (!res.ok) {
			if (DEMO_MODE) {
				const fallback: DocumentAction[] = [];
				DEMO_DOCSETU_DOCUMENTS.forEach(d => fallback.push(...d.actions));
				return fallback;
			}
			return [];
		}

		const data = await res.json();
		const actions = Array.isArray(data.actions) ? data.actions : [];

		if (actions.length === 0 && DEMO_MODE) {
			const fallback: DocumentAction[] = [];
			DEMO_DOCSETU_DOCUMENTS.forEach(d => fallback.push(...d.actions));
			return fallback;
		}

		return actions;
	} catch (err) {
		console.warn('Failed to fetch actions from /api/actions', err);
		if (DEMO_MODE) {
			const fallback: DocumentAction[] = [];
			DEMO_DOCSETU_DOCUMENTS.forEach(d => fallback.push(...d.actions));
			return fallback;
		}
		return [];
	}
}
