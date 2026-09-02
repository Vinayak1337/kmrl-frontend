// Clean DocSetu Domain Models

export type TeamName =
	| 'Administration'
	| 'Finance'
	| 'Human Resources'
	| 'Legal'
	| 'Operations'
	| 'Procurement'
	| 'Engineering'
	| 'Compliance'
	| 'IT'
	| 'Other';

export type DocSetuDocumentType =
	| 'Policy'
	| 'Circular'
	| 'Contract'
	| 'Report'
	| 'Invoice'
	| 'Tender'
	| 'SOP'
	| 'Manual'
	| 'Notice'
	| 'Minutes'
	| 'Form'
	| 'Correspondence'
	| 'Technical Document'
	| 'Other';

export interface DocumentSection {
	id: string; // e.g. "section-1", maps internally to "node-1"
	rawId?: string; // internal node id e.g. "node-1"
	uid?: string; // e.g. "doc-123#node-1"
	order: number;
	title: string;
	pageRange: {
		start: number;
		end: number;
	};
	summary: string;
	summaryMd?: string;
	keyPoints: string[];
	actions: string[];
	criticalFlags: string[];
	affectedTeams: string[];
	sourceContent: string;
	images?: Array<{
		page?: number;
		base64?: string;
		mimeType: string;
		caption?: string;
	}>;
}

export interface DocumentAction {
	id: string;
	documentId: string;
	documentTitle: string;
	action: string;
	team: string;
	dueDate?: string;
	isUrgent?: boolean;
	type: 'action' | 'information';
	sectionId?: string;
	sectionTitle?: string;
}

export interface RiskItem {
	level: 'critical' | 'warning' | 'info';
	title: string;
	description?: string;
	affectedTeams?: string[];
}

export interface DocSetuDocument {
	id: string;
	title: string;
	team: string; // mapped from backend department
	type: DocSetuDocumentType | string; // mapped from backend documentType
	language: string;
	summary: string;
	briefMd?: string; // Executive markdown brief
	pageCount: number;
	sectionsCount: number;
	sections: DocumentSection[];
	actions: DocumentAction[];
	risks: RiskItem[];
	keyPoints: string[];
	effectiveDate?: string;
	owner?: string;
	affectedTeams: string[];
	status: 'ready' | 'processing' | 'error';
	uploadedAt: Date;
	rawUrl?: string;
	rawFormat?: string;
	tags: string[];
}

export interface Citation {
	index: number;
	docId: string;
	nodeId: string;
	sectionId?: string;
	title?: string;
	score?: number;
	pageRange?: { start?: number; end?: number };
	uid?: string;
}

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	citations?: Citation[];
	timestamp?: Date;
}

export interface ChatSession {
	sessionId: string;
	docId?: string | null;
	title?: string;
	lastMessage?: string;
	messages: ChatMessage[];
	updatedAt: Date;
}

export interface Person {
	id: string;
	name: string;
	email: string;
	team: string;
	role: 'ADMIN' | 'MANAGER' | 'MEMBER';
	accessSummary: string;
	createdAt?: Date;
	grants?: Array<{
		dept?: string;
		type?: string;
		actions?: string[];
	}>;
}

export interface AccessPolicy {
	documentType: DocSetuDocumentType | string;
	description: string;
	visibleToTeams: string[];
	adminOnly: boolean;
	canEditTeams?: string[];
}

export interface AuditEntry {
	id: string;
	timestamp: Date;
	actorName: string;
	actorEmail: string;
	action: string;
	target: string;
	details?: Record<string, unknown>;
}
