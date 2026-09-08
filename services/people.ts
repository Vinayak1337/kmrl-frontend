import { Person } from '@/types/docsetu';
import { mapBackendUserToPerson } from '@/adapters/userAdapter';
import { mapTeamToDepartment } from '@/adapters/documentAdapter';

export interface CreatePersonPayload {
	name: string;
	email: string;
	password?: string;
	team: string;
	role: 'ADMIN' | 'MANAGER' | 'MEMBER';
}

export async function listPeople(): Promise<Person[]> {
  const res = await fetch('/api/users', { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load people');
  const data = await res.json();
  if (!Array.isArray(data.users)) throw new Error('Invalid people response');
  return data.users.map(mapBackendUserToPerson);
}

export async function createPerson(payload: CreatePersonPayload): Promise<{ id: string }> {
	const body = {
		name: payload.name,
		email: payload.email,
		password: payload.password || 'DocSetuPass123!',
		role: payload.role === 'ADMIN' ? 'ADMIN' : 'MANAGER',
		department: mapTeamToDepartment(payload.team)
	};

	const res = await fetch('/api/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Failed to create team member');
	}

	const data = await res.json();
	return { id: data.id };
}
