import { DocSetuDocument, DocumentNode, DocumentAction } from '@/types/docsetu';

export const MOCK_DOCUMENTS: DocSetuDocument[] = [
	{
		id: 'doc-kmrl-sop-402',
		title: 'KMRL Track & Signaling Maintenance SOP 2026',
		filename: 'KMRL-SOP-402-Signaling-Track.pdf',
		department: 'Operations',
		team: 'Operations',
		type: 'SOP',
		documentType: 'sop',
		language: 'English',
		totalPages: 24,
		pageCount: 24,
		nodesCount: 6,
		sectionsCount: 6,
		sections: [],
		actions: [],
		risks: [],
		keyPoints: ['Track inspections restricted to non-revenue window', 'Point machine throw resistance limit: under 450 kgf'],
		affectedTeams: ['Operations', 'Safety'],
		status: 'ready',
		uploadedAt: new Date('2026-08-14T09:30:00Z'),
		createdAt: new Date('2026-08-14T09:30:00Z'),
		updatedAt: new Date('2026-09-02T14:15:00Z'),
		summary:
			'Operational guidelines and safety interlocks for track inspection, point machine servicing, and CBTC wayside signaling maintenance across Phase 1 and 1A corridors.',
		tags: ['Signaling', 'Track Safety', 'CBTC', 'Interlocks', 'Preventive Maintenance']
	},
	{
		id: 'doc-kmrl-concession-eda',
		title: 'Commercial Retail Concession Agreement - Edapally Station',
		filename: 'KMRL-CRE-Edapally-Concession-2024.pdf',
		department: 'Legal',
		team: 'Legal',
		type: 'Contract',
		documentType: 'contract',
		language: 'English',
		totalPages: 18,
		pageCount: 18,
		nodesCount: 5,
		sectionsCount: 5,
		sections: [],
		actions: [],
		risks: [],
		keyPoints: ['Expiry Date: 15 November 2026', 'Renewal Notice Deadline: 18 September 2026'],
		affectedTeams: ['Legal', 'Finance'],
		status: 'ready',
		uploadedAt: new Date('2026-07-20T11:00:00Z'),
		createdAt: new Date('2026-07-20T11:00:00Z'),
		updatedAt: new Date('2026-08-28T16:45:00Z'),
		summary:
			'Commercial real estate lease and retail concession contract detailing revenue sharing terms, utility recovery charges, security deposit guarantees, and renewal notice clauses.',
		tags: ['Concession', 'Edapally', 'Lease', 'Revenue Share', 'Renewal']
	},
	{
		id: 'doc-kmrl-procure-fy26',
		title: 'Procurement Policy & Financial Delegation Matrix FY26',
		filename: 'KMRL-Procurement-Policy-Matrix-FY26.pdf',
		department: 'Procurement',
		team: 'Procurement',
		type: 'Policy',
		documentType: 'policy',
		language: 'English',
		totalPages: 42,
		pageCount: 42,
		nodesCount: 8,
		sectionsCount: 8,
		sections: [],
		actions: [],
		risks: [],
		keyPoints: ['Requisitions up to ₹2.5 Lakhs: Single approval from Unit Manager', 'Capex exceeding ₹25 Lakhs: Board notification required'],
		affectedTeams: ['Procurement', 'Finance', 'Administration'],
		status: 'ready',
		uploadedAt: new Date('2026-06-10T08:00:00Z'),
		createdAt: new Date('2026-06-10T08:00:00Z'),
		updatedAt: new Date('2026-09-01T10:20:00Z'),
		summary:
			'Defines tender limits, e-procurement thresholds, two-packet bidding rules, single-source emergency exemptions, and dual approval requirements for capital expenditures over ₹25 Lakhs.',
		tags: ['Tenders', 'Financial Limits', 'Approvals', 'Vendor Vetting', 'Compliance']
	},
	{
		id: 'doc-kmrl-cmrs-audit',
		title: 'CMRS Safety Inspection & Statutory Compliance Circular',
		filename: 'CMRS-KMRL-Phase1-Inspection-Circular.pdf',
		department: 'Safety',
		team: 'Safety',
		type: 'Circular',
		documentType: 'circular',
		language: 'English',
		totalPages: 14,
		pageCount: 14,
		nodesCount: 4,
		sectionsCount: 4,
		sections: [],
		actions: [],
		risks: [],
		keyPoints: ['Fire suppression readiness certification required', 'Third rail earthing checks mandatory'],
		affectedTeams: ['Safety', 'Operations', 'Engineering'],
		status: 'ready',
		uploadedAt: new Date('2026-08-01T13:45:00Z'),
		createdAt: new Date('2026-08-01T13:45:00Z'),
		updatedAt: new Date('2026-09-05T09:00:00Z'),
		summary:
			'Directives issued following the annual Commission of Railway Safety (CMRS) audit, covering fire suppression readiness, third rail earthing checks, and emergency evacuation drills.',
		tags: ['CMRS', 'Statutory', 'Fire Safety', 'Third Rail', 'Evacuation Drill']
	},
	{
		id: 'doc-kmrl-hvac-overhaul',
		title: 'Rolling Stock HVAC & Saloon Environmental Maintenance Guide',
		filename: 'KMRL-RollingStock-HVAC-Manual-Rev3.pdf',
		department: 'Engineering',
		team: 'Engineering',
		type: 'Manual',
		documentType: 'manual',
		language: 'English',
		totalPages: 32,
		pageCount: 32,
		nodesCount: 7,
		sectionsCount: 7,
		sections: [],
		actions: [],
		risks: [],
		keyPoints: ['Monthly RF impedance sweep across all fixed track balises', 'Air filter replacement every 3 months'],
		affectedTeams: ['Engineering', 'Operations'],
		status: 'ready',
		uploadedAt: new Date('2026-05-18T10:00:00Z'),
		createdAt: new Date('2026-05-18T10:00:00Z'),
		updatedAt: new Date('2026-08-15T11:30:00Z'),
		summary:
			'Overhaul schedule for roof-mounted air conditioning units, refrigerant gas leak testing protocols, air purification filter cycles, and inverter compressor diagnostics.',
		tags: ['Rolling Stock', 'HVAC', 'Refrigerant', 'Overhaul', 'Air Quality']
	},
	{
		id: 'doc-kmrl-substation-backup',
		title: 'Traction Substation Emergency Power Synchronization Protocol',
		filename: 'KMRL-TSS-Power-Sync-Protocol.pdf',
		department: 'Electrical',
		team: 'Engineering',
		type: 'SOP',
		documentType: 'sop',
		language: 'English',
		totalPages: 16,
		pageCount: 16,
		nodesCount: 4,
		sectionsCount: 4,
		sections: [],
		actions: [],
		risks: [],
		keyPoints: ['Generator synchronisation within 12-second tolerance', 'SCADA telemetry acknowledgments mandatory'],
		affectedTeams: ['Engineering', 'Operations'],
		status: 'ready',
		uploadedAt: new Date('2026-07-05T14:20:00Z'),
		createdAt: new Date('2026-07-05T14:20:00Z'),
		updatedAt: new Date('2026-08-30T17:10:00Z'),
		summary:
			'Sequence of switching operations during 110kV grid dropouts, secondary diesel generator synchronisation limits (12-second tolerance), and SCADA telemetry acknowledgments.',
		tags: ['Traction Power', 'Substation', 'Generator Sync', 'SCADA', 'Grid Isolation']
	}
];

export const MOCK_NODES: Record<string, DocumentNode[]> = {
	'doc-kmrl-sop-402': [
		{
			id: 'node-sop-1',
			docId: 'doc-kmrl-sop-402',
			order: 1,
			title: 'Section 1: Daily Track Patrol & Point Machine Verification',
			pageRange: { start: 1, end: 4 },
			content:
				'Daily patrol teams must execute visual and laser clearance scans along designated corridor sectors between 01:00 AM and 04:30 AM (non-revenue hours). Point machine throw resistance must not exceed 450 kgf, and toe clearance must remain within 115mm ± 2mm.',
			summary:
				'Mandates nocturnal foot patrols between 01:00 AM and 04:30 AM. Specifies physical measurement criteria for point machine throw resistance (< 450 kgf) and toe gap tolerances.',
			keyPoints: [
				'Track inspections restricted to non-revenue window (01:00 AM to 04:30 AM).',
				'Point machine throw resistance limit: strictly under 450 kgf.',
				'Toe clearance tolerance: 115mm ± 2mm verified via calibrated gauge.',
				'Mandatory radio confirmation with Central OCC before corridor track occupation.'
			],
			actionableItems: [
				'Log daily laser gauge scan results into Asset Management Portal before 06:00 AM.',
				'Replace point machine hydraulic lubrication pack if throw force exceeds 400 kgf.'
			],
			isUrgent: false
		},
		{
			id: 'node-sop-2',
			docId: 'doc-kmrl-sop-402',
			order: 2,
			title: 'Section 2: Wayside CBTC Transponder & Balise Inspection',
			pageRange: { start: 5, end: 9 },
			content:
				'Wayside Eurobalises and Communication-Based Train Control (CBTC) transponders must undergo monthly RF impedance checks. Attenuation loss along feeder co-axial runs exceeding 3.2 dB/100m warrants immediate transceiver replacement.',
			summary:
				'Details monthly RF diagnostic requirements for trackside CBTC balises. Establishes a maximum RF attenuation loss ceiling of 3.2 dB per 100 meters.',
			keyPoints: [
				'Monthly RF impedance sweep across all fixed track balises.',
				'Feeder cable attenuation must remain under 3.2 dB per 100m.',
				'Physical inspection of mounting bracket bolt torque (85 Nm).'
			],
			actionableItems: [
				'Schedule bi-weekly telemetry diagnostic sweep for Aluva to Muttom sector.',
				'Verify wayside enclosure IP67 silicone weather seals ahead of monsoon season.'
			],
			isUrgent: true,
			dueDate: new Date('2026-09-22T18:00:00Z')
		}
	],
	'doc-kmrl-procure-fy26': [
		{
			id: 'node-procure-1',
			docId: 'doc-kmrl-procure-fy26',
			order: 1,
			title: 'Section 1: Financial Delegation Matrix & Approving Authority',
			pageRange: { start: 1, end: 6 },
			content:
				'Delegation of financial powers across KMRL departments: Unit Managers can approve operational requisitions up to ₹2.5 Lakhs. Department Heads (General Managers) hold authority up to ₹10 Lakhs. Operational expenditure between ₹10 Lakhs and ₹25 Lakhs requires joint CFO sign-off. Any capital expenditure exceeding ₹25 Lakhs requires Managing Director sanction and Board audit notification.',
			summary:
				'Sets the four-tier financial approval framework: Unit Managers (₹2.5L), GMs (₹10L), Joint CFO (₹25L), and Board/MD (> ₹25L).',
			keyPoints: [
				'Requisitions up to ₹2.5 Lakhs: Single approval from Unit Manager.',
				'Requisitions ₹2.5L – ₹10L: Sanctioned by General Manager.',
				'Requisitions ₹10L – ₹25L: Dual sign-off required (Department Head + CFO).',
				'Capex exceeding ₹25 Lakhs: Formal Board notification and Managing Director sanction.'
			],
			actionableItems: [
				'Audit ERP purchase authorization workflow rules against FY26 Matrix.',
				'Enforce two-packet bidding on all open tenders valued above ₹50 Lakhs.'
			],
			isUrgent: false
		}
	],
	'doc-kmrl-concession-eda': [
		{
			id: 'node-concession-1',
			docId: 'doc-kmrl-concession-eda',
			order: 1,
			title: 'Clause 4: Lease Term, Escalation & Renewal Notice',
			pageRange: { start: 6, end: 8 },
			content:
				'The initial concession term expires on 15 November 2026. A 5% annual escalation applies to minimum guaranteed monthly royalty. To prevent automatic termination or forfeiture of preferential negotiation rights, the concessionaire or KMRL must issue formal written renewal notice at least 60 days prior to expiry (no later than 18 September 2026).',
			summary:
				'Defines expiry date (15 November 2026) and the critical 60-day renewal notification window closing on 18 September 2026.',
			keyPoints: [
				'Expiry Date: 15 November 2026.',
				'Renewal Notice Deadline: 18 September 2026 (60 days prior).',
				'Annual royalty escalation fixed at 5% compound rate.',
				'Security deposit of ₹15 Lakhs valid until 90 days past lease expiration.'
			],
			actionableItems: [
				'Dispatch formal lease extension option letter to concessionaire by 18 September 2026.',
				'Verify updated bank guarantee confirmation from issuing nationalized bank.'
			],
			isUrgent: true,
			dueDate: new Date('2026-09-18T17:00:00Z')
		}
	]
};

export const MOCK_ACTIONS: DocumentAction[] = [
	{
		id: 'act-001',
		documentId: 'doc-kmrl-concession-eda',
		documentTitle: 'Commercial Retail Concession Agreement - Edapally Station',
		docId: 'doc-kmrl-concession-eda',
		docTitle: 'Commercial Retail Concession Agreement - Edapally Station',
		action: 'Issue formal written lease extension / renewal notice to retail concessionaire',
		team: 'Legal',
		owner: 'Legal & Commercial Dept',
		dueDate: '18 Sep 2026',
		isUrgent: true,
		type: 'action',
		sourceSection: 'Clause 4, Page 7',
		status: 'PENDING'
	},
	{
		id: 'act-002',
		documentId: 'doc-kmrl-procure-fy26',
		documentTitle: 'Procurement Policy & Financial Delegation Matrix FY26',
		docId: 'doc-kmrl-procure-fy26',
		docTitle: 'Procurement Policy & Financial Delegation Matrix FY26',
		action: 'Verify ERP approval limits for Capex requisitions exceeding ₹25 Lakhs threshold',
		team: 'Finance',
		owner: 'Finance & Systems',
		dueDate: '30 Sep 2026',
		isUrgent: true,
		type: 'action',
		sourceSection: 'Section 1, Page 3',
		status: 'PENDING'
	},
	{
		id: 'act-003',
		documentId: 'doc-kmrl-cmrs-audit',
		documentTitle: 'CMRS Safety Inspection & Statutory Compliance Circular',
		docId: 'doc-kmrl-cmrs-audit',
		docTitle: 'CMRS Safety Inspection & Statutory Compliance Circular',
		action: 'Submit verified Q3 fire suppression and third rail earthing certification',
		team: 'Safety',
		owner: 'Safety Directorate',
		dueDate: '25 Sep 2026',
		isUrgent: true,
		type: 'action',
		sourceSection: 'Directive 2, Page 5',
		status: 'IN_PROGRESS'
	},
	{
		id: 'act-004',
		documentId: 'doc-kmrl-sop-402',
		documentTitle: 'KMRL Track & Signaling Maintenance SOP 2026',
		docId: 'doc-kmrl-sop-402',
		docTitle: 'KMRL Track & Signaling Maintenance SOP 2026',
		action: 'Complete Aluva–Muttom CBTC balise impedance sweep and bracket torque audit',
		team: 'Operations',
		owner: 'Signaling Wing',
		dueDate: '22 Sep 2026',
		isUrgent: false,
		type: 'action',
		sourceSection: 'Section 2, Page 6',
		status: 'PENDING'
	},
	{
		id: 'act-005',
		documentId: 'doc-kmrl-substation-backup',
		documentTitle: 'Traction Substation Emergency Power Synchronization Protocol',
		docId: 'doc-kmrl-substation-backup',
		docTitle: 'Traction Substation Emergency Power Synchronization Protocol',
		action: 'Conduct bi-monthly diesel generator 12-second synchronization test',
		team: 'Engineering',
		owner: 'Electrical Directorate',
		dueDate: '05 Oct 2026',
		isUrgent: false,
		type: 'action',
		sourceSection: 'Section 3, Page 9',
		status: 'RESOLVED'
	}
];

export const MOCK_AUDIT_LOGS = [
	{
		id: 'aud-101',
		action: 'DOCUMENT_INGESTED',
		user: 'K. R. Nair (General Manager, Ops)',
		details: 'Ingested KMRL Track & Signaling Maintenance SOP 2026 (24 pages, 6 nodes indexed)',
		timestamp: '2026-09-06T14:32:00Z',
		ipAddress: '10.20.4.11'
	},
	{
		id: 'aud-102',
		action: 'AI_INTELLIGENCE_QUERY',
		user: 'Priya V. (Finance Officer)',
		details: 'Queried: "What capital expenditure thresholds require Board sanction?" Citations: [#1]',
		timestamp: '2026-09-06T11:18:00Z',
		ipAddress: '10.20.8.45'
	},
	{
		id: 'aud-103',
		action: 'COMPLIANCE_STATUS_UPDATE',
		user: 'S. Chandran (Safety Director)',
		details: 'Marked Substation Backup Generator load certificate as RESOLVED',
		timestamp: '2026-09-05T16:04:00Z',
		ipAddress: '10.20.2.19'
	},
	{
		id: 'aud-104',
		action: 'ACCESS_GRANTED',
		user: 'System Administrator',
		details: 'Granted MEMBER role clearance for Rolling Stock Operations team',
		timestamp: '2026-09-04T09:25:00Z',
		ipAddress: '127.0.0.1'
	}
];
