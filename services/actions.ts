import { DocumentAction } from '@/types/docsetu';

export async function listAllActions(team?: string): Promise<DocumentAction[]> {
  const params = new URLSearchParams();
  if (team && team !== 'All') params.set('team', team);
  const res = await fetch(`/api/actions?${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load actions');
  const data = await res.json();
  if (!Array.isArray(data.actions)) throw new Error('Invalid actions response');
  return data.actions;
}
