import { AccessPolicy } from '@/types/docsetu';

export const DEFAULT_ACCESS_POLICIES: AccessPolicy[] = [
	{
		documentType: 'Policy',
		description: 'Organizational operating standards, guidelines, and frameworks',
		visibleToTeams: ['Administration', 'Finance', 'Legal', 'Operations', 'Procurement', 'HR', 'Compliance', 'IT'],
		adminOnly: false,
		canEditTeams: ['Administration', 'Compliance']
	},
	{
		documentType: 'Contract',
		description: 'Vendor agreements, supplier master contracts, SLAs, and NDAs',
		visibleToTeams: ['Legal', 'Procurement', 'Finance', 'Administration'],
		adminOnly: false,
		canEditTeams: ['Legal', 'Procurement']
	},
	{
		documentType: 'Circular',
		description: 'Executive notices, regulatory circulars, and board directives',
		visibleToTeams: ['Administration', 'Compliance', 'Finance', 'Operations'],
		adminOnly: false,
		canEditTeams: ['Administration']
	},
	{
		documentType: 'SOP',
		description: 'Standard operating procedures, safety rules, and technical playbooks',
		visibleToTeams: ['Operations', 'Engineering', 'Compliance', 'IT'],
		adminOnly: false,
		canEditTeams: ['Engineering', 'Compliance']
	},
	{
		documentType: 'Report',
		description: 'Audit findings, quarterly reviews, and operational post-mortems',
		visibleToTeams: ['Administration', 'Compliance', 'Finance'],
		adminOnly: false,
		canEditTeams: ['Compliance']
	},
	{
		documentType: 'Invoice',
		description: 'Billing instruments, payment receipts, and tax records',
		visibleToTeams: ['Finance', 'Procurement'],
		adminOnly: false,
		canEditTeams: ['Finance']
	},
	{
		documentType: 'Minutes',
		description: 'Executive committee and supervisory board meeting notes',
		visibleToTeams: ['Administration'],
		adminOnly: true,
		canEditTeams: ['Administration']
	}
];

export async function getAccessPolicies(): Promise<AccessPolicy[]> {
	return DEFAULT_ACCESS_POLICIES;
}
