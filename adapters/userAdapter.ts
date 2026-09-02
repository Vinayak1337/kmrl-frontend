import { Person, TeamName } from '@/types/docsetu';
import { mapDepartmentToTeam } from './documentAdapter';

export function mapBackendUserToPerson(user: any): Person {
	const role: 'ADMIN' | 'MANAGER' | 'MEMBER' =
		user.role === 'ADMIN' ? 'ADMIN' : user.role === 'MANAGER' ? 'MANAGER' : 'MEMBER';

	const team: TeamName = mapDepartmentToTeam(user.department);

	const grants = Array.isArray(user.grants) ? user.grants : [];

	let accessSummary = 'Standard Member';
	if (role === 'ADMIN') {
		accessSummary = 'Full organization access';
	} else if (grants.length > 0) {
		const uniqueTypes = new Set(grants.map((g: any) => g.type || g.documentType).filter(Boolean));
		accessSummary = `${uniqueTypes.size || grants.length} document categories`;
	} else if (role === 'MANAGER') {
		accessSummary = `${team} team access`;
	}

	return {
		id: user.id || '',
		name: user.name || 'Unnamed User',
		email: user.email || '',
		team,
		role,
		accessSummary,
		createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
		grants
	};
}

export const DEMO_PEOPLE: Person[] = [
	{
		id: 'usr-1',
		name: 'Vidhatri Menon',
		email: 'vidhatri@docsetu.internal',
		team: 'Legal',
		role: 'MEMBER',
		accessSummary: '8 document categories',
		createdAt: new Date('2026-01-15')
	},
	{
		id: 'usr-2',
		name: 'Lavanya Nair',
		email: 'lavanya@docsetu.internal',
		team: 'Finance',
		role: 'MANAGER',
		accessSummary: '11 document categories',
		createdAt: new Date('2026-01-10')
	},
	{
		id: 'usr-3',
		name: 'Vinayak Sharma',
		email: 'vinayak@docsetu.internal',
		team: 'Administration',
		role: 'ADMIN',
		accessSummary: 'Full organization access',
		createdAt: new Date('2025-12-01')
	},
	{
		id: 'usr-4',
		name: 'Arjun Kurup',
		email: 'arjun@docsetu.internal',
		team: 'Procurement',
		role: 'MANAGER',
		accessSummary: '6 document categories',
		createdAt: new Date('2026-02-01')
	},
	{
		id: 'usr-5',
		name: 'Devika Pillai',
		email: 'devika@docsetu.internal',
		team: 'Compliance',
		role: 'MEMBER',
		accessSummary: '4 document categories',
		createdAt: new Date('2026-02-18')
	}
];
