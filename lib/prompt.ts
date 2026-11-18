import { CLASSIFICATION_DEPARTMENTS, CLASSIFICATION_TYPES } from '@/lib/ingest/classification';
export type Partition =
	| { type: 'text'; content: string; summary?: string }
	| { type: 'image'; description?: string; ocrText?: string };

export type AiAnalysis = {
	version: string;
	title?: string;
	overall_summary: string;
	key_points: string[];
	partitions: Partition[];
	entities?: { people?: string[]; places?: string[]; orgs?: string[] };
	dates?: string[];
	actions?: string[];
};

// Unified manager-focused JSON schema (LLM returns JSON only)
export type ManagerNodeJSON = {
	/** Number of the input chunk this node describes. */
	chunk?: number;
	pageRange?: { start: number; end: number };
	// Representative snippet (plain text)
	content?: string;
	// Optional plain summary for backward compatibility
	summary?: string;
	// Markdown variants for UI rendering
	summaryMd?: string; // 2–5 sentences in MD
	keyPointsMd?: string; // bullet list in MD
	actionsMd?: string; // bullet list or table in MD
	// Plain lists for compatibility
	keyPoints?: string[];
	actionableItems?: Array<
		string | { owner?: string; action?: string; due?: string; impact?: string }
	>;
	// Optional signals
	criticalFlags?: string[];
	crossDepartments?: string[];
	needsImage?: boolean;
	images?: Array<{ base64: string; mimeType: string }>;
	meta?: {
		slideType?: string;
		entities?: string[];
		decisions?: string[];
		deadlines?: string[];
		risks?: string[];
		stakeholders?: string[];
	};
};

export type ManagerAnalysisJSON = {
	nodes: ManagerNodeJSON[];
	overallMd: string; // executive summary in MD
	documentType?: string; // e.g., safety_circular | procurement | hr_policy | technical_specification | other
	urgencyLevel?: 'high' | 'medium' | 'low';
	departments?: string[];
	tags?: string[];
};

export type EnrichmentContext = {
  department?: string;
  documentType?: string;
  correction?: { tags: string[]; note?: string };
};

export function reviewerContext(meta?: EnrichmentContext) {
  if (!meta?.correction) return '';
  return `Reviewer correction (use as context for the analysis, and verify factual claims against the source): ${JSON.stringify({
    department: meta.department,
    documentType: meta.documentType,
    ...meta.correction,
  })}`;
}

// Centralized manager-focused prompt asking for Markdown fields inside JSON
export function buildManagerMdPrompt(meta?: EnrichmentContext): string {
	const dept = meta?.department
		? `Uploader’s department: ${meta.department}`
		: 'Department: (unspecified)';
	const dtype = meta?.documentType
		? `Uploader’s document type: ${meta.documentType}`
		: 'Document Type: (unspecified)';
	return [
		'You are a senior document analyst for DocSetu.',
		reviewerContext(meta),
		'',
		'Goal: Equip DocSetu stakeholders with rapid, trustworthy, manager‑focused snapshots while preserving traceability to specific pages.',
		'',
		`Context:\n- ${dept}\n- ${dtype}`,
		'',
		'Priorities (in order):',
		'1) Extract decisions/actions and concrete deadlines.',
		'2) Emphasize compliance risks (CMRS/MoHUA) and parameters/limits (with units).',
		'3) Highlight cross‑department dependencies and owners.',
		'',
		'Language: English only (translate then summarise).',
		'',
		'Return JSON ONLY (no prose, no code fences). JSON schema:',
		'{',
		'  "nodes": [{',
		'    "chunk": 1,',
		'    "pageRange": { "start": 1, "end": 1 },',
		'    "content": "short representative snippet (plain text, from these pages)",',
		'    "summaryMd": "### Section title\nSummary in 2–5 sentences (actionable, no fluff)",',
		'    "keyPointsMd": "- fact or parameter\n- KPI or budget\n- who is impacted",',
		'    "actionsMd": "- Owner: <dept|role> — <action> — Due: <YYYY-MM-DD or window> — Impact: <risk|benefit>",',
		'    "keyPoints": ["plain bullet", "..."],',
		'    "actionableItems": ["Owner: Engineering — Inspect...", { "owner": "HR", "action": "Schedule training" }],',
		'    "criticalFlags": ["safety", "compliance"],',
		'    "crossDepartments": ["Engineering", "Operations"],',
		'    "needsImage": false',
		'  }],',
		'  "overallMd": "## Executive Summary\nMain decisions, deadlines, risks, and impacted departments (1–2 short paragraphs).",',
		`  "documentType": "${CLASSIFICATION_TYPES.join(' | ')}",`,
		'  "urgencyLevel": "high | medium | low",',
		`  "departments": ${JSON.stringify(CLASSIFICATION_DEPARTMENTS)},`,
		'  "tags": ["short topic", "..."]',
		'}',
		'',
		'Rules:',
		'- Output MUST be valid JSON parseable by JSON.parse.',
		'- No commentary, no Markdown outside JSON fields.',
		'- The input is split into numbered chunks marked [Chunk N | pages a-b]. Return exactly one node per chunk, in order, with "chunk" set to N and pageRange copied from the marker.',
		'- Do NOT summarise the entire document in every node—each node must describe only its own chunk.',
		'- Keep every date exactly as written in the source and include it in the matching action (e.g. "Due: 14 November 2026").',
		'- If the source is not in English, still write the summaries in English but keep names, numbers and dates unchanged.',
		'- Only extract actions that the source assigns or requires. Keep both action fields empty when the section contains descriptions, evaluation, recommendations, or proposed future work without an assigned obligation.',
		'- Infer documentType from the source, using only the allowed set. Omit it if unclear. Do not copy upload metadata as evidence.',
		'- Use departments from the provided list only; put the primary owner first; omit if unclear.'
	].join('\n');
}

export function buildSystemPrompt(): string {
	return [
		'You are an expert document analysis AI. You receive:',
		'- The full HTML of a document (text + formatting).',
		'- A list of embedded images (provided separately).',
		'',
		'Task:',
		'1) Read the text and images together.',
		'2) Produce a structured JSON object ONLY (no prose) that partitions the output into text and image items, includes a clear overall summary, and bullet key points. DO NOT include Markdown or HTML in the JSON values.',
		'3) If images contain text, capture it as ocrText; otherwise describe salient content succinctly in description.',
		'4) Keep the output compact, factual, and non-speculative. If unsure, omit.',
		'',
		'JSON schema:',
		'{',
		'  "version": "string",',
		'  "title": "string | optional",',
		'  "overall_summary": "string",',
		'  "key_points": ["string", ...],',
		'  "partitions": [',
		'    { "type": "text", "content": "string", "summary": "string | optional" },',
		'    { "type": "image", "description": "string | optional", "ocrText": "string | optional" }',
		'  ],',
		'  "entities": { "people": ["string"], "places": ["string"], "orgs": ["string"] } | optional,',
		'  "dates": ["ISO or natural dates"] | optional,',
		'  "actions": ["imperatives or obligations"] | optional',
		'}',
		'',
		'Rules:',
		'- Output MUST be valid JSON parseable by JSON.parse.',
		'- Do not include trailing commas.',
		'- Do not include explanations or code fences.',
		'',
		'Small example output:',
		'{',
		'  "version": "1.0",',
		'  "title": "Fire Drill Procedure",',
		'  "overall_summary": "Quarterly fire drill with alarm at 10:00; evacuate calmly to nearest exit; use posted floor plan.",',
		'  "key_points": [',
		'    "Quarterly drill; mandatory for employees.",',
		'    "Alarm at 10:00; do not use elevators.",',
		'    "Evacuation routes shown in floor plan image."',
		'  ],',
		'  "partitions": [',
		'    { "type": "text", "content": "All employees must participate in the quarterly fire drill. Alarm at 10:00. Evacuate to nearest exit." },',
		'    { "type": "image", "description": "Floor plan showing exits near south hallway and main lobby." }',
		'  ],',
		'  "entities": { "orgs": ["Safety Department"], "places": ["Main Lobby"] },',
		'  "dates": ["2025-10-01 10:00"],',
		'  "actions": ["Participate in drill", "Evacuate calmly to nearest exit"]',
		'}'
	].join('\n');
}

export function buildUserInstruction(htmlNote?: string): string {
	const note = htmlNote ? `Notes: ${htmlNote}\n` : '';
	return [note, 'Return only the JSON object per schema above.'].join('\n');
}
