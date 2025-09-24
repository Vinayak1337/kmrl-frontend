/*
 Small validation script for MD-based summarization/classification and node linking.

 Usage:
  - Mock mode (no server/LLM):
      tsx scripts/check-ingestion-md.ts

  - Live mode (hits your running Next server + real LLM):
      TEST_LIVE=1 SERVER_URL=http://localhost:3000 SESSION="<jwt>" GEMINI_API_KEY=... tsx scripts/check-ingestion-md.ts

  - Live PDF mode (ingest a PDF instead of HTML):
      TEST_LIVE=1 TEST_PDF=1 SERVER_URL=http://localhost:3000 SESSION="<jwt>" GEMINI_API_KEY=... tsx scripts/check-ingestion-md.ts
      # optionally override PDF path
      SAMPLE_PDF_PATH="/absolute/path/to/file.pdf" ...

 Optional classification hints (used if provided, otherwise the backend should infer):
      DEPARTMENT="Operations" DOCUMENT_TYPE="presentation" ...

 In live mode, it will POST to /api/documents/ingest and then GET the created document
 to verify presence of Markdown fields, classification, node linking, and title lookup.
*/

/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';

import { parseHtmlForIngestion } from '@/lib/html';
import { type ManagerAnalysisJSON } from '@/lib/prompt';

type NodeLike = {
	pageRange?: { start: number; end: number };
	content?: string;
	summary?: string;
	summaryMd?: string;
	keyPoints?: string[];
	keyPointsMd?: string;
	actionsMd?: string;
};

type DocLike = {
	id?: string;
	title?: string;
	fullSummary?: string;
	overallMd?: string;
	nodes?: NodeLike[];
	metadata?: { department?: string | null; documentType?: string | null };
};

function validate(doc: DocLike) {
	const issues: string[] = [];
	if (!doc.overallMd && !(doc.fullSummary && doc.fullSummary.length > 20)) {
		issues.push('Missing overallMd (and weak fullSummary)');
	}
	if (!Array.isArray(doc.nodes) || doc.nodes.length === 0) {
		issues.push('No nodes produced');
	} else {
		const badNodes = doc.nodes.filter(
			n =>
				!(n.summaryMd && n.summaryMd.length > 20) &&
				!(n.summary && n.summary.length > 20)
		);
		if (badNodes.length > 0)
			issues.push(`Nodes without adequate summary: ${badNodes.length}`);
		const missingBullets = doc.nodes.filter(
			n =>
				!(n.keyPointsMd && n.keyPointsMd.includes('- ')) &&
				!(Array.isArray(n.keyPoints) && n.keyPoints.length >= 3)
		);
		if (missingBullets.length > 0)
			issues.push(`Nodes without key points: ${missingBullets.length}`);
	}
	const dept = doc.metadata?.department ?? null;
	const dtype = doc.metadata?.documentType ?? null;
	if (!dept || !dtype)
		issues.push('Missing classification (department/documentType)');
	return { ok: issues.length === 0, issues };
}

type ServerNode = NodeLike & {
	uid?: string;
	nodeId?: string;
	order?: number;
	title?: string;
	images?: Array<{
		page?: number;
		base64: string;
		mimeType: string;
		caption?: string;
	}>;
	nextNodeId?: string;
	prevNodeId?: string;
};

function validateLinking(nodes: ServerNode[]): string[] {
	const issues: string[] = [];
	if (!Array.isArray(nodes) || nodes.length === 0) return issues;
	// sort by order just in case and validate forward/backward links
	const sorted = [...nodes].sort((a, b) => (a.order || 0) - (b.order || 0));
	for (let i = 0; i < sorted.length; i++) {
		const n = sorted[i];
		const expectedPrev = i > 0 ? `node-${sorted[i - 1].order || i}` : undefined;
		const expectedNext =
			i < sorted.length - 1
				? `node-${sorted[i + 1].order || i + 2}`
				: undefined;
		// Basic pageRange sanity
		if (
			!n.pageRange ||
			n.pageRange.start < 1 ||
			n.pageRange.end < n.pageRange.start
		) {
			issues.push(`Invalid pageRange on node order=${n.order}`);
		}
		// Link sanity (best-effort; some flows may not strictly set exact ids)
		if (
			i > 0 &&
			n.prevNodeId &&
			expectedPrev &&
			n.prevNodeId !== expectedPrev
		) {
			// Not fatal; record as a soft issue
			issues.push(
				`prevNodeId mismatch at order=${n.order} got=${n.prevNodeId} expected~=${expectedPrev}`
			);
		}
		if (
			i < sorted.length - 1 &&
			n.nextNodeId &&
			expectedNext &&
			n.nextNodeId !== expectedNext
		) {
			issues.push(
				`nextNodeId mismatch at order=${n.order} got=${n.nextNodeId} expected~=${expectedNext}`
			);
		}
		// Image-to-pageRange mapping (if page present)
		const outOfRange = (n.images || []).filter(
			im =>
				typeof im.page === 'number' &&
				(im.page! < (n.pageRange?.start || 1) ||
					im.page! > (n.pageRange?.end || n.pageRange?.start || 1))
		);
		if (outOfRange.length > 0) {
			issues.push(
				`Images out-of-range for node order=${n.order}: ${outOfRange.length}`
			);
		}
	}
	return issues;
}

function getEnvBool(name: string, def = false): boolean {
	const v = process.env[name];
	if (v === undefined) return def;
	return v === '1' || v?.toLowerCase() === 'true' || v === 'yes';
}

async function liveMode(html: string) {
	const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
	const SESSION = process.env.SESSION || '';
	if (!SESSION) {
		console.error('SESSION env var (JWT cookie) is required for live mode.');
		process.exitCode = 1;
		return;
	}
	const TEST_PDF = getEnvBool('TEST_PDF', false);
	const DEPARTMENT = process.env.DEPARTMENT || undefined;
	const DOCUMENT_TYPE = process.env.DOCUMENT_TYPE || undefined;

	let body: Record<string, unknown> = {};
	if (TEST_PDF) {
		// Read PDF & base64 encode
		const pdfPath =
			process.env.SAMPLE_PDF_PATH ||
			path.join(process.cwd(), 'SIH2025-IDEA-Presentation-Format.pdf');
		if (!fs.existsSync(pdfPath)) {
			console.error(`PDF file not found at: ${pdfPath}`);
			process.exitCode = 1;
			return;
		}
		const buf = fs.readFileSync(pdfPath);
		const base64 = buf.toString('base64');
		body = {
			documents: [
				{ type: 'pdf', content: base64, filename: path.basename(pdfPath) }
			],
			department: DEPARTMENT,
			documentType: DOCUMENT_TYPE
		};
	} else {
		body = {
			documents: [{ type: 'html', content: html, filename: 'sample1.html' }],
			department: DEPARTMENT,
			documentType: DOCUMENT_TYPE
		};
	}
	const res = await fetch(`${SERVER_URL}/api/documents/ingest`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Cookie: `kmrl_session=${SESSION}`
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		console.error('Ingestion failed:', err);
		process.exitCode = 1;
		return;
	}
	const created = (await res.json()) as { documentId?: string };
	if (!created.documentId) {
		console.error('No documentId returned. Response:', created);
		process.exitCode = 1;
		return;
	}
	const getRes = await fetch(
		`${SERVER_URL}/api/documents/ingest?id=${created.documentId}`,
		{
			headers: { Cookie: `kmrl_session=${SESSION}` }
		}
	);
	const doc = (await getRes.json()) as DocLike;
	const { ok, issues } = validate(doc);
	if (!ok) {
		console.error('Validation FAILED:', issues);
		process.exitCode = 1;
	} else {
		console.log('Validation PASSED:');
		console.log(` - Nodes: ${doc.nodes?.length}`);
		console.log(` - Department: ${doc.metadata?.department}`);
		console.log(` - DocumentType: ${doc.metadata?.documentType}`);
	}

	// Additional link & title validations
	const nodes = (doc.nodes || []) as ServerNode[];
	if (nodes.length > 0) {
		const linkIssues = validateLinking(nodes);
		if (linkIssues.length > 0) {
			console.warn('Linking warnings:', linkIssues);
		} else {
			console.log('Linking checks PASSED');
		}

		// Attempt title-based lookup for the first node with a non-empty title
		const SERVER_NODES = `${SERVER_URL}/api/nodes`;
		const firstTitled = nodes.find(
			n => typeof n.title === 'string' && n.title.trim().length > 0
		);
		if (firstTitled?.title) {
			// General firstOnly lookup (may return a different doc if duplicates exist)
			const q1 = await fetch(
				`${SERVER_NODES}?title=${encodeURIComponent(
					firstTitled.title
				)}&firstOnly=true`,
				{
					headers: { Cookie: `kmrl_session=${SESSION}` }
				}
			).catch(() => null);
			if (q1 && q1.ok) {
				const data = await q1.json();
				console.log(
					`Title lookup (global firstOnly) returned ${
						Array.isArray(data.results) ? data.results.length : 0
					} result(s)`
				);
			}
			// Doc-scoped lookup to ensure we can fetch our own first match
			const q2 = await fetch(
				`${SERVER_NODES}?title=${encodeURIComponent(
					firstTitled.title
				)}&docId=${encodeURIComponent(
					doc.id || created.documentId || ''
				)}&firstOnly=true`,
				{
					headers: { Cookie: `kmrl_session=${SESSION}` }
				}
			).catch(() => null);
			if (q2 && q2.ok) {
				const data = await q2.json();
				const r0 = Array.isArray(data.results) ? data.results[0] : undefined;
				if (r0?.uid && r0?.docId === (doc.id || created.documentId)) {
					console.log('Doc-scoped title lookup PASSED');
				} else {
					console.warn(
						'Doc-scoped title lookup returned unexpected document or empty result'
					);
				}
			}
		} else {
			console.warn('No titled node found for title-lookup test');
		}
	}
}

async function mockMode(html: string) {
	const parsed = parseHtmlForIngestion(html);
	const snippet = parsed.textContent
		.split(/\n+/)
		.slice(0, 2)
		.join(' ')
		.slice(0, 200);
	const mock: ManagerAnalysisJSON = {
		overallMd: `## Executive Summary\n- Key outcome here\n- Deadlines and owners`,
		nodes: [
			{
				pageRange: { start: 1, end: 1 },
				content: snippet,
				summaryMd: '### Intro\nThis section summarises the scope and key asks.',
				keyPointsMd:
					'- KPI: 99.8% on-time\n- Budget: INR 3 Cr\n- Impact: Operations',
				actionsMd:
					'- Owner: Operations — Prepare SOP — Due: 2025-03-31 — Impact: service'
			}
		],
		documentType: 'technical_specification',
		departments: ['Engineering']
	};

	const doc: DocLike = {
		id: 'mock-doc',
		title: 'Mock',
		overallMd: mock.overallMd,
		fullSummary: 'Mock summary',
		nodes: mock.nodes,
		metadata: {
			department: mock.departments?.[0] || null,
			documentType: mock.documentType || null
		}
	};

	const { ok, issues } = validate(doc);
	if (!ok) {
		console.error('Mock validation FAILED:', issues);
		process.exitCode = 1;
	} else {
		console.log('Mock validation PASSED');
	}
}

async function main() {
	const samplePath = path.join(process.cwd(), 'test-samples', 'sample1.html');
	const html = fs.readFileSync(samplePath, 'utf8');
	const LIVE = process.env.TEST_LIVE === '1';
	if (LIVE) await liveMode(html);
	else await mockMode(html);
}

main().catch(e => {
	console.error(e);
	process.exitCode = 1;
});
