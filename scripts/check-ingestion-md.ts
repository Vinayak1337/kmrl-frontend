/*
 Small validation script for MD-based summarization and classification.

 Usage:
  - Mock mode (no server/LLM):
      tsx scripts/check-ingestion-md.ts

  - Live mode (hits your running Next server + real LLM):
      TEST_LIVE=1 SERVER_URL=http://localhost:3000 SESSION="<jwt>" GEMINI_API_KEY=... tsx scripts/check-ingestion-md.ts

 In live mode, it will POST to /api/documents/ingest and then GET the created document
 to verify presence of MD fields and classification.
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
      (n) => !(n.summaryMd && n.summaryMd.length > 20) && !(n.summary && n.summary.length > 20)
    );
    if (badNodes.length > 0) issues.push(`Nodes without adequate summary: ${badNodes.length}`);
    const missingBullets = doc.nodes.filter(
      (n) => !(n.keyPointsMd && n.keyPointsMd.includes('- ')) && !(Array.isArray(n.keyPoints) && n.keyPoints.length >= 3)
    );
    if (missingBullets.length > 0) issues.push(`Nodes without key points: ${missingBullets.length}`);
  }
  const dept = doc.metadata?.department ?? null;
  const dtype = doc.metadata?.documentType ?? null;
  if (!dept || !dtype) issues.push('Missing classification (department/documentType)');
  return { ok: issues.length === 0, issues };
}

async function liveMode(html: string) {
  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
  const SESSION = process.env.SESSION || '';
  if (!SESSION) {
    console.error('SESSION env var (JWT cookie) is required for live mode.');
    process.exitCode = 1;
    return;
  }
  const body = {
    documents: [{ type: 'html', content: html, filename: 'sample1.html' }],
    // Leave department/documentType empty to test inference
  };
  const res = await fetch(`${SERVER_URL}/api/documents/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `kmrl_session=${SESSION}` },
    body: JSON.stringify(body),
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
  const getRes = await fetch(`${SERVER_URL}/api/documents/ingest?id=${created.documentId}`, {
    headers: { Cookie: `kmrl_session=${SESSION}` },
  });
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
}

async function mockMode(html: string) {
  const parsed = parseHtmlForIngestion(html);
  const snippet = parsed.textContent.split(/\n+/).slice(0, 2).join(' ').slice(0, 200);
  const mock: ManagerAnalysisJSON = {
    overallMd: `## Executive Summary\n- Key outcome here\n- Deadlines and owners` ,
    nodes: [
      {
        pageRange: { start: 1, end: 1 },
        content: snippet,
        summaryMd: '### Intro\nThis section summarises the scope and key asks.',
        keyPointsMd: '- KPI: 99.8% on-time\n- Budget: INR 3 Cr\n- Impact: Operations',
        actionsMd: '- Owner: Operations — Prepare SOP — Due: 2025-03-31 — Impact: service',
      },
    ],
    documentType: 'technical_specification',
    departments: ['Engineering'],
  };

  const doc: DocLike = {
    id: 'mock-doc',
    title: 'Mock',
    overallMd: mock.overallMd,
    fullSummary: 'Mock summary',
    nodes: mock.nodes,
    metadata: { department: mock.departments?.[0] || null, documentType: mock.documentType || null },
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

main().catch((e) => { console.error(e); process.exitCode = 1; });

