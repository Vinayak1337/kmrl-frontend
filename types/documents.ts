// Shared data contracts for Mongo persistence
// Keep aligned with ingestion and API routes

export type ImageBlob = {
	page?: number;
	base64?: string;
	url?: string;
	mimeType: string;
	caption?: string;
};

export type DocumentMetadata = {
	createdAt: Date;
	uploadedBy: string;
	department?: string;
	documentType?: string;
	tags?: string[];
	inferred?: {
		department?: string | null;
		documentType?: string | null;
		source?: 'gemini' | 'rule' | 'manual';
	};
	updatedAt?: Date;
};

export type DocumentRecord = {
	id: string; // stable external id e.g. doc-...
	title: string;
	originalFormat: 'html' | 'text' | 'image' | 'pdf' | 'doc' | string;
	totalPages: number;
	language: string;
	// For compatibility, documents may embed nodes; prefer reading from node collection.
	nodes?: DocumentNodeRecord[];
	nodeCount?: number;
	fullSummary: string; // legacy plain summary
	overallMd?: string; // executive MD summary (markdown)
	keywords?: string[]; // aggregated from nodes
	metadata: DocumentMetadata;
	raw?: {
		type: string;
		content?: string;
		text?: string;
		url?: string;
		publicId?: string;
	};
};

export type DocumentNodeRecord = {
	// Unique identity
	uid: string; // `${docId}#${nodeId}` unique
	docId: string;
	nodeId: string; // e.g. node-1
	order: number; // 1-based position

	// Content
	title?: string; // short label/topic if available
	titleNormalized?: string; // lowercased, collapsed whitespace for stable lookup
	pageRange: { start: number; end: number };
	sourcePages?: number[]; // explicit page numbers composing this node
	content: string; // raw text slice for traceability
	images: ImageBlob[];
	summary: string;
	summaryMd?: string;
	keyPointsMd?: string;
	actionsMd?: string;
	keyPoints: string[];
	actionableItems: string[];
	keywords?: string[]; // searchable keywords/phrases extracted from content
	criticalFlags?: string[];
	crossDepartments?: string[];
	needsImage?: boolean;
	meta?: {
		slideType?: string;
		entities?: string[];
		decisions?: string[];
		deadlines?: string[];
		risks?: string[];
		stakeholders?: string[];
	};

	// Links
	nextNodeId?: string;
	prevNodeId?: string;

	// Convenience denorms
	nodeCount?: number; // total nodes within doc
	department?: string;
	documentType?: string;
	tags?: string[];
	createdAt?: Date;
};
