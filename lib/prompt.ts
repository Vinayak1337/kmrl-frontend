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
    '  "entities": { "orgs": ["KMRL"], "places": ["Main Lobby"] },',
    '  "dates": ["2025-10-01 10:00"],',
    '  "actions": ["Participate in drill", "Evacuate calmly to nearest exit"]',
    '}'
  ].join('\n');
}

export function buildUserInstruction(htmlNote?: string): string {
  const note = htmlNote ? `Notes: ${htmlNote}\n` : '';
  return [
    note,
    'Return only the JSON object per schema above.'
  ].join('\n');
}
