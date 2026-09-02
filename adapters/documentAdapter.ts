import {
	DocSetuDocument,
	DocumentSection,
	DocumentAction,
	RiskItem,
	DocSetuDocumentType,
	TeamName
} from '@/types/docsetu';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

// Standard Modern Business Teams Taxonomy
export const VALID_TEAMS: TeamName[] = [
	'Administration',
	'Finance',
	'Human Resources',
	'Legal',
	'Operations',
	'Procurement',
	'Engineering',
	'Compliance',
	'IT',
	'Other'
];

// Modern Document Taxonomy
export const VALID_DOC_TYPES: DocSetuDocumentType[] = [
	'Policy',
	'Circular',
	'Contract',
	'Report',
	'Invoice',
	'Tender',
	'SOP',
	'Manual',
	'Notice',
	'Minutes',
	'Form',
	'Correspondence',
	'Technical Document',
	'Other'
];

/**
 * Maps legacy department keys to clean modern Teams
 */
export function mapDepartmentToTeam(dept?: string | null): TeamName {
	if (!dept) return 'Other';
	const clean = dept.trim().toUpperCase().replace(/[\s-]+/g, '_');

	switch (clean) {
		case 'LEGAL':
		case 'LAW':
			return 'Legal';
		case 'FINANCE':
		case 'ACCOUNTS':
		case 'COMMERCIAL':
			return 'Finance';
		case 'PROCUREMENT':
		case 'PURCHASE':
		case 'STORES':
			return 'Procurement';
		case 'HR':
		case 'HUMAN_RESOURCES':
		case 'PERSONNEL':
			return 'Human Resources';
		case 'OPERATIONS':
		case 'TRAFFIC':
		case 'SERVICES':
			return 'Operations';
		case 'ENGINEERING':
		case 'TECHNICAL':
		case 'ROLLING_STOCK':
		case 'TRACTION':
		case 'MAINTENANCE':
		case 'SIGNALLING':
		case 'TELECOM':
		case 'CIVIL':
		case 'ELECTRICAL':
			return 'Engineering';
		case 'COMPLIANCE':
		case 'AUDIT':
		case 'SAFETY':
		case 'QUALITY':
			return 'Compliance';
		case 'IT':
		case 'TECHNOLOGY':
		case 'SYSTEMS':
			return 'IT';
		case 'ADMIN':
		case 'ADMINISTRATION':
		case 'MANAGEMENT':
		case 'EXECUTIVE':
			return 'Administration';
		default: {
			// Title case if already legible
			const normalized = dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
			const match = VALID_TEAMS.find(t => t.toLowerCase() === normalized.toLowerCase());
			return match || 'Other';
		}
	}
}

/**
 * Maps modern Team to backend department string
 */
export function mapTeamToDepartment(team?: string | null): string {
	if (!team) return 'OTHER';
	return team.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Maps legacy backend documentType keys to clean DocSetu taxonomy
 */
export function mapDocTypeToTaxonomy(type?: string | null): DocSetuDocumentType {
	if (!type) return 'Policy';
	const clean = type.trim().toLowerCase().replace(/[\s-]+/g, '_');

	switch (clean) {
		case 'safety_circular':
		case 'circular':
		case 'office_order':
			return 'Circular';
		case 'contract':
		case 'agreement':
		case 'amc':
		case 'mou':
			return 'Contract';
		case 'sop':
		case 'procedure':
		case 'standard_operating_procedure':
			return 'SOP';
		case 'manual':
		case 'guideline':
		case 'handbook':
			return 'Manual';
		case 'report':
		case 'incident_report':
		case 'review':
		case 'quarterly_report':
			return 'Report';
		case 'invoice':
		case 'bill':
		case 'voucher':
			return 'Invoice';
		case 'tender':
		case 'rfp':
		case 'bid':
			return 'Tender';
		case 'minutes':
		case 'mom':
		case 'meeting_notes':
			return 'Minutes';
		case 'notice':
		case 'bulletin':
			return 'Notice';
		case 'form':
		case 'template':
			return 'Form';
		case 'correspondence':
		case 'letter':
		case 'memo':
			return 'Correspondence';
		case 'technical_specification':
		case 'spec':
		case 'technical_document':
			return 'Technical Document';
		case 'policy':
		case 'rules':
		case 'regulation':
		default:
			return 'Policy';
	}
}

/**
 * Extract due dates from unstructured action item text
 */
export function extractDueDates(text: string): string | undefined {
	const rx =
		/\b(?:\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},?\s*\d{2,4}|\b\d{4}-\d{2}-\d{2}|\b\d{1,2}\/\d{1,2}\/\d{2,4}|\b(?:by|before)\s+(?:EOD|\w+day|\d{1,2}\s+\w+)\b/i;
	const match = text.match(rx);
	return match ? match[0] : undefined;
}

/**
 * Maps a single DocumentNodeRecord to DocSetu DocumentSection
 */
export function mapBackendNodeToSection(
	node: DocumentNodeRecord,
	index: number
): DocumentSection {
	const actions = (node.actionableItems || []).map(a => a.trim()).filter(Boolean);
	const keyPoints = (node.keyPoints || []).map(k => k.trim()).filter(Boolean);
	const criticalFlags = (node.criticalFlags || []).map(f => f.trim()).filter(Boolean);
	const affectedTeams = (node.crossDepartments || []).map(mapDepartmentToTeam);

	// Fallback title generation if no title normalized
	const sectionTitle =
		node.title ||
		(node.titleNormalized
			? node.titleNormalized.charAt(0).toUpperCase() + node.titleNormalized.slice(1)
			: `Section ${node.order || index + 1}`);

	return {
		id: `section-${node.order || index + 1}`,
		rawId: node.nodeId || `node-${index + 1}`,
		uid: node.uid || `${node.docId}#${node.nodeId || index + 1}`,
		order: node.order || index + 1,
		title: sectionTitle,
		pageRange: node.pageRange || { start: 1, end: 1 },
		summary: node.summary || '',
		summaryMd: node.summaryMd,
		keyPoints,
		actions,
		criticalFlags,
		affectedTeams,
		sourceContent: node.content || '',
		images: node.images || []
	};
}

/**
 * Extracts first-class DocumentAction objects from sections
 */
export function extractActionsFromSections(
	sections: DocumentSection[],
	docId: string,
	docTitle: string,
	docTeam: string
): DocumentAction[] {
	const actions: DocumentAction[] = [];

	sections.forEach(sec => {
		sec.actions.forEach((actText, idx) => {
			const dueDate = extractDueDates(actText);
			const isUrgent =
				sec.criticalFlags.length > 0 ||
				/urgent|immediate|statutory|mandatory|asap|penalty/i.test(actText);
			const isInfo = /no action required|for information|remains under|informative/i.test(
				actText
			);

			actions.push({
				id: `${docId}-${sec.id}-act-${idx + 1}`,
				documentId: docId,
				documentTitle: docTitle,
				action: actText,
				team: sec.affectedTeams[0] || docTeam,
				dueDate,
				isUrgent,
				type: isInfo ? 'information' : 'action',
				sectionId: sec.id,
				sectionTitle: sec.title
			});
		});
	});

	return actions;
}

/**
 * Maps legacy DocumentRecord to clean DocSetuDocument
 */
export function mapBackendDocToDocSetu(
	rawDoc: Partial<DocumentRecord> & Record<string, unknown>
): DocSetuDocument {
	const id = String(rawDoc.id || (rawDoc._id ? String(rawDoc._id) : '') || '');
	const title = String(rawDoc.title || 'Untitled Document');
	const meta = (rawDoc.metadata || {}) as Record<string, unknown>;
	const team = mapDepartmentToTeam(String(meta.department || rawDoc.department || ''));
	const type = mapDocTypeToTaxonomy(String(meta.documentType || rawDoc.documentType || ''));
	const language = String(rawDoc.language || 'English');
	const summary = String(rawDoc.fullSummary || rawDoc.summary || '');
	const briefMd = String(rawDoc.overallMd || rawDoc.summaryMd || summary);
	const pageCount = Number(rawDoc.totalPages) || 1;
	const tags = Array.isArray(meta.tags)
		? (meta.tags as string[])
		: Array.isArray(rawDoc.tags)
		? (rawDoc.tags as string[])
		: [];

	// Map embedded nodes to sections
	const rawNodes = Array.isArray(rawDoc.nodes) ? (rawDoc.nodes as DocumentNodeRecord[]) : [];
	const sections: DocumentSection[] = rawNodes.map((n, idx: number) =>
		mapBackendNodeToSection(n, idx)
	);

	const sectionsCount =
		typeof rawDoc.nodeCount === 'number' && rawDoc.nodeCount > 0
			? rawDoc.nodeCount
			: sections.length;

	// Extract actions
	const actions = extractActionsFromSections(sections, id, title, team);

	// Aggregate key points
	const keyPoints = Array.from(
		new Set(
			sections
				.flatMap(s => s.keyPoints)
				.concat(Array.isArray(rawDoc.keywords) ? rawDoc.keywords : [])
		)
	).slice(0, 10);

	// Aggregate affected teams
	const affectedTeams = Array.from(
		new Set([team, ...sections.flatMap(s => s.affectedTeams)])
	).filter(Boolean);

	// Aggregate risks
	const risks: RiskItem[] = [];
	sections.forEach(s => {
		if (s.criticalFlags && s.criticalFlags.length > 0) {
			s.criticalFlags.forEach(f => {
				risks.push({
					level: 'critical',
					title: f,
					description: `Surfaced in ${s.title} (Pages ${s.pageRange.start}-${s.pageRange.end})`,
					affectedTeams: s.affectedTeams
				});
			});
		}
	});

	const uploadedAt = rawDoc.metadata?.createdAt
		? new Date(rawDoc.metadata.createdAt as string | number | Date)
		: rawDoc.createdAt
		? new Date(rawDoc.createdAt as string | number | Date)
		: new Date();

	return {
		id,
		title,
		team,
		type,
		language,
		summary,
		briefMd,
		pageCount,
		sectionsCount,
		sections,
		actions,
		risks,
		keyPoints,
		owner: team,
		affectedTeams,
		status: 'ready',
		uploadedAt,
		rawUrl: rawDoc.raw?.url,
		rawFormat: rawDoc.originalFormat || 'PDF',
		tags
	};
}

/**
 * Standard Demo Corpus for showcasing DocSetu generality
 * Used as fallback data when connecting to a fresh or empty deployment
 */
export const DEMO_DOCSETU_DOCUMENTS: DocSetuDocument[] = [
	{
		id: 'doc-procurement-fy26',
		title: 'Procurement Policy & Approval Framework FY26',
		team: 'Procurement',
		type: 'Policy',
		language: 'English',
		summary:
			'Updated organizational procurement limits, dual-sign-off authorization matrix, and vendor evaluation rules for contracts exceeding ₹25 Lakhs.',
		briefMd: `### Executive Document Brief
This policy sets revised financial authority thresholds and formalizes competitive bidding requirements for capital expenditures across all business units.

* **What this is**: Organization-wide standard for purchasing, vendor onboarding, and purchase order limits.
* **Why it matters**: Aligns delegation of financial powers with FY26 budgetary governance and mandatory multi-tier approvals.
* **Key changes**: Departmental head approval cap increased to ₹10 Lakhs; CFO and Managing Committee sign-off required above ₹25 Lakhs.
* **Who it affects**: Procurement, Finance, and all unit managers commissioning vendor work.`,
		pageCount: 31,
		sectionsCount: 5,
		status: 'ready',
		uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		effectiveDate: '1 October 2026',
		owner: 'Procurement',
		affectedTeams: ['Procurement', 'Finance', 'Legal'],
		tags: ['Procurement', 'Governance', 'Thresholds', 'FY26'],
		keyPoints: [
			'Approval threshold for Unit Heads capped at ₹10 Lakhs',
			'Dual sign-off (Finance + Procurement) mandatory for tenders > ₹25 Lakhs',
			'Three independent vendor quotes required for all non-emergency purchases',
			'Annual performance audit required for registered suppliers'
		],
		risks: [
			{
				level: 'critical',
				title: 'Approval Threshold Revision',
				description:
					'Finance and Procurement operational guidelines must be reconciled before the 1 October cutoff.',
				affectedTeams: ['Finance', 'Procurement']
			}
		],
		actions: [
			{
				id: 'act-1',
				documentId: 'doc-procurement-fy26',
				documentTitle: 'Procurement Policy & Approval Framework FY26',
				action: 'Approval workflow in ERP must be updated to new delegation matrix',
				team: 'Procurement',
				dueDate: '30 Sep 2026',
				isUrgent: true,
				type: 'action',
				sectionTitle: 'Approval Thresholds'
			},
			{
				id: 'act-2',
				documentId: 'doc-procurement-fy26',
				documentTitle: 'Procurement Policy & Approval Framework FY26',
				action: 'Finance sign-off checklist to be published for all department heads',
				team: 'Finance',
				dueDate: '15 Oct 2026',
				isUrgent: false,
				type: 'action',
				sectionTitle: 'Vendor Evaluation'
			},
			{
				id: 'act-3',
				documentId: 'doc-procurement-fy26',
				documentTitle: 'Procurement Policy & Approval Framework FY26',
				action: 'Existing active purchase orders continue under previous delegation',
				team: 'Administration',
				dueDate: undefined,
				isUrgent: false,
				type: 'information',
				sectionTitle: 'Transitional Provisions'
			}
		],
		sections: [
			{
				id: 'section-1',
				rawId: 'node-1',
				order: 1,
				title: 'Purpose & Scope',
				pageRange: { start: 1, end: 4 },
				summary:
					'Defines the regulatory boundaries, applicability across operating subsidiaries, and baseline compliance definitions for all material acquisitions.',
				keyPoints: [
					'Applies to direct, indirect, and service acquisitions',
					'Establishes zero-tolerance standard for undeclared conflicts of interest'
				],
				actions: ['Distribute policy acknowledgment link to all procurement officers'],
				criticalFlags: [],
				affectedTeams: ['Procurement', 'Legal'],
				sourceContent:
					'SECTION 1: PURPOSE AND SCOPE\n1.1 This Procurement Governance Framework establishes the rules and standards governing the procurement of goods, works, and commercial services across all business units of the organization. 1.2 All employees authorized to initiate or approve purchase requisitions are bound by these principles.'
			},
			{
				id: 'section-2',
				rawId: 'node-2',
				order: 2,
				title: 'Delegation of Financial Powers',
				pageRange: { start: 5, end: 11 },
				summary:
					'Detailed financial thresholds across Operational Managers, Vice Presidents, Chief Financial Officer, and the Executive Committee.',
				keyPoints: [
					'Tier 1: Up to ₹2.5 Lakhs — Unit Manager approval',
					'Tier 2: ₹2.5 Lakhs to ₹10 Lakhs — Department Head approval',
					'Tier 3: ₹10 Lakhs to ₹25 Lakhs — Joint Procurement & Finance concurrence',
					'Tier 4: Above ₹25 Lakhs — Managing Committee and Board sanction'
				],
				actions: ['Reconfigure authorization roles in enterprise accounting system by 30 Sep'],
				criticalFlags: ['Statutory threshold modification effective from 1 October'],
				affectedTeams: ['Finance', 'Procurement', 'IT'],
				sourceContent:
					'SECTION 2: DELEGATION OF FINANCIAL POWERS\n2.1 Purchases up to ₹2,50,000 may be sanctioned by the designated Unit Manager. 2.2 Requisitions between ₹2,50,000 and ₹10,00,000 require Department Head clearance. 2.3 Purchases exceeding ₹25,00,000 require dual authorization by the CFO and Committee.'
			},
			{
				id: 'section-3',
				rawId: 'node-3',
				order: 3,
				title: 'Vendor Evaluation & Anti-Collusion Guidelines',
				pageRange: { start: 12, end: 19 },
				summary:
					'Minimum standards for technical and commercial evaluation, anti-collusion certifications, and blacklisting criteria.',
				keyPoints: [
					'Minimum 3 bids required for open competitive tenders',
					'Sole-source procurement strictly prohibited except for certified proprietary OEM components'
				],
				actions: ['Update master supplier diligence questionnaire'],
				criticalFlags: [],
				affectedTeams: ['Legal', 'Procurement'],
				sourceContent:
					'SECTION 3: VENDOR EVALUATION\n3.1 Every purchase exceeding ₹5,00,000 shall be subject to competitive quotation. 3.2 Single-source exceptions must obtain prior written exemption stating technical indispensability.'
			}
		]
	},
	{
		id: 'doc-facility-mgmt-2026',
		title: 'Facility Management Agreement & Service Schedules',
		team: 'Legal',
		type: 'Contract',
		language: 'English',
		summary:
			'Master services agreement governing security, janitorial, and electro-mechanical maintenance with critical renewal notification dates.',
		briefMd: `### Executive Document Brief
Comprehensive facility management contract specifying monthly SLA parameters, penalty clauses for downtime, and mandatory renewal deadlines.

* **What this is**: Tripartite services contract with Crestline Facilities Ltd.
* **Why it matters**: Governs all operational building services, power management, and HVAC maintenance.
* **Key changes**: Added carbon emission reporting requirement; renewal window opens 60 days before expiration.
* **Who it affects**: Legal, Operations, and Administration.`,
		pageCount: 42,
		sectionsCount: 4,
		status: 'ready',
		uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
		effectiveDate: '15 November 2025',
		owner: 'Legal',
		affectedTeams: ['Legal', 'Operations', 'Administration'],
		tags: ['Vendor Agreement', 'SLA', 'Facility', 'Renewal'],
		keyPoints: [
			'Renewal notice must be dispatched 60 days before contract expiry (by 18 Sep 2026)',
			'HVAC uptime target pegged at 99.5% with staggered penalty credits',
			'Quarterly ESG compliance certificate submission required'
		],
		risks: [
			{
				level: 'warning',
				title: 'Renewal Notice Deadline Approaching',
				description:
					'Formal renewal notice required by 18 Sep 2026 to prevent automatic contract termination or default rate hike.',
				affectedTeams: ['Legal', 'Operations']
			}
		],
		actions: [
			{
				id: 'act-fm-1',
				documentId: 'doc-facility-mgmt-2026',
				documentTitle: 'Facility Management Agreement & Service Schedules',
				action: 'Issue formal renewal extension or market tender notice before deadline',
				team: 'Legal',
				dueDate: '18 Sep 2026',
				isUrgent: true,
				type: 'action',
				sectionTitle: 'Term and Termination'
			},
			{
				id: 'act-fm-2',
				documentId: 'doc-facility-mgmt-2026',
				documentTitle: 'Facility Management Agreement & Service Schedules',
				action: 'Conduct quarterly reconciliation of HVAC outage penalties',
				team: 'Operations',
				dueDate: '30 Sep 2026',
				isUrgent: false,
				type: 'action',
				sectionTitle: 'Service Level Agreements'
			}
		],
		sections: [
			{
				id: 'section-1',
				rawId: 'node-1',
				order: 1,
				title: 'Term, Renewal, and Default Notice',
				pageRange: { start: 1, end: 8 },
				summary:
					'Contract duration spans 24 months with explicit notice windows required for renewal negotiations or termination.',
				keyPoints: [
					'Contract expires 15 November 2026',
					'Renewal notification required in writing at least 60 calendar days prior (18 September 2026)'
				],
				actions: ['Dispatch renewal declaration or notice to market by 18 Sep'],
				criticalFlags: ['Renewal deadline requires action this month'],
				affectedTeams: ['Legal', 'Operations'],
				sourceContent:
					'CLAUSE 4: TERM AND RENEWAL\n4.1 This Agreement takes effect on the Effective Date and shall remain in force for twenty-four (24) months. 4.2 Either party may renew upon written notice issued no later than sixty (60) days prior to expiration.'
			}
		]
	},
	{
		id: 'doc-infosec-sop-2026',
		title: 'Information Security & Access Governance SOP',
		team: 'Compliance',
		type: 'SOP',
		language: 'English',
		summary:
			'Standard operating procedure for access revocation, multifactor enforcement, quarterly privileged account auditing, and incident notification.',
		briefMd: `### Executive Document Brief
Operational procedure defining identity access management, role segregation, and mandatory timelines for de-provisioning departing staff.

* **What this is**: Security standard operating procedure across all enterprise applications.
* **Why it matters**: Ensures SOC2 and ISO 27001 regulatory compliance and audit traceability.
* **Key changes**: Reduced credential revocation SLA from 24 hours to 4 hours upon HR separation notice.
* **Who it affects**: IT, Compliance, and Human Resources.`,
		pageCount: 18,
		sectionsCount: 3,
		status: 'ready',
		uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
		effectiveDate: '1 August 2026',
		owner: 'Compliance',
		affectedTeams: ['Compliance', 'IT', 'Human Resources'],
		tags: ['Security', 'SOP', 'Access Control', 'Compliance'],
		keyPoints: [
			'Revocation of enterprise credentials required within 4 hours of separation',
			'Quarterly access audit reports must be signed off by department managers',
			'MFA mandatory for all remote workspace access'
		],
		risks: [],
		actions: [
			{
				id: 'act-sec-1',
				documentId: 'doc-infosec-sop-2026',
				documentTitle: 'Information Security & Access Governance SOP',
				action: 'Complete Q3 privileged access review and archive sign-offs',
				team: 'IT',
				dueDate: '25 Sep 2026',
				isUrgent: false,
				type: 'action',
				sectionTitle: 'Privileged Access Audits'
			}
		],
		sections: [
			{
				id: 'section-1',
				rawId: 'node-1',
				order: 1,
				title: 'Credential Lifecycle & Deprovisioning',
				pageRange: { start: 1, end: 6 },
				summary:
					'Establishes explicit timelines for provisioning new staff credentials and enforcing rapid termination upon HR notification.',
				keyPoints: [
					'Maximum 4-hour window for credential disabling upon formal HR notification',
					'Central log archiving of all de-provisioning requests'
				],
				actions: ['Verify automated HR offboarding webhook trigger in identity provider'],
				criticalFlags: [],
				affectedTeams: ['IT', 'Human Resources'],
				sourceContent:
					'SECTION 3: CREDENTIAL DEPROVISIONING\n3.1 All active accounts associated with departing personnel shall be disabled within four (4) hours of receipt of formal HR notice.'
			}
		]
	}
];
