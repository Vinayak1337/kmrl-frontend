#!/usr/bin/env tsx
/**
 * End-to-end sanity test for the 5-layer pipeline.
 * - Auth cookie synthesized via JWT
 * - Ingestion -> indexing
 * - Vector search
 * - Chat (RAG)
 * - Feedback + reprocess
 *
 * Usage: API_URL=http://localhost:3000 npx tsx scripts/test-pipeline.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { signSession, AUTH_COOKIE } from '../lib/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

type StepResult = { name: string; status: 'ok' | 'skipped' | 'error'; details?: string };

async function run() {
  const results: StepResult[] = [];
  const timestamp = new Date().toISOString();

  // Create auth cookie for an admin user
  const token = signSession({
    sub: 'admin-automation',
    email: 'admin@kmrl.local',
    name: 'Automation Admin',
    role: 'ADMIN',
    grants: [{ dept: 'ALL', type: 'ALL', actions: ['read', 'write'] }],
  });
  const headersBase: Record<string, string> = { 'Content-Type': 'application/json', Cookie: `${AUTH_COOKIE}=${token}` };

  // 1) Ingestion (HTML) -> persist
  let documentId: string | null = null;
  try {
    const payload = {
      documents: [
        {
          type: 'html',
          filename: 'sanity-ingest.html',
          content: '<h1>Test Policy</h1><p>All staff must complete fire safety training by Jan 31, 2025.</p>',
        },
      ],
      department: 'Safety',
      documentType: 'policy',
      tags: ['sanity', 'automation'],
    };
    const res = await fetch(`${API_URL}/api/documents/ingest`, { method: 'POST', headers: headersBase, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'ingest failed');
    documentId = data.documentId || null;
    results.push({ name: 'ingestion', status: 'ok', details: `docId=${documentId}, nodes=${data.nodeCount}` });
  } catch (e: any) {
    results.push({ name: 'ingestion', status: 'error', details: e?.message || String(e) });
  }

  // 2) Vector search
  try {
    const res = await fetch(`${API_URL}/api/search/vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // public endpoint, no auth needed
      body: JSON.stringify({ query: 'fire safety training', limit: 5, searchNodes: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'search failed');
    const found = Number(data?.resultsFound || 0);
    results.push({ name: 'vector-search', status: found > 0 ? 'ok' : 'skipped', details: `results=${found}` });
  } catch (e: any) {
    results.push({ name: 'vector-search', status: 'error', details: e?.message || String(e) });
  }

  // 3) Chat (RAG) – requires OPENAI + GEMINI
  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: headersBase,
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What is the deadline for fire safety training?' },
        ],
        docId: documentId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'chat failed');
    const reply = String(data?.reply || '').slice(0, 120);
    results.push({ name: 'chat', status: reply ? 'ok' : 'skipped', details: `reply=${reply}` });
  } catch (e: any) {
    results.push({ name: 'chat', status: 'error', details: e?.message || String(e) });
  }

  // 4) Feedback + reprocess – requires GEMINI
  try {
    if (!documentId) throw new Error('missing documentId from ingestion');
    const res = await fetch(`${API_URL}/api/documents/${documentId}/feedback`, {
      method: 'POST',
      headers: headersBase,
      body: JSON.stringify({ type: 'correction', message: 'Add mention of quarterly drills.', reprocess: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'feedback failed');
    results.push({ name: 'feedback', status: 'ok' });
  } catch (e: any) {
    results.push({ name: 'feedback', status: 'error', details: e?.message || String(e) });
  }

  // 5) Update PROJECT_STATUS.md with a run entry
  try {
    const statusPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'PROJECT_STATUS.md');
    const md = fs.readFileSync(statusPath, 'utf8');
    const summary = results.map(r => `- ${r.name}: ${r.status}${r.details ? ` — ${r.details}` : ''}`).join('\n');
    const block = `\n\n## 🧪 Pipeline Test Run — ${timestamp}\n${summary}\n`;
    fs.writeFileSync(statusPath, md + block);
    results.push({ name: 'status-update', status: 'ok' });
  } catch (e: any) {
    results.push({ name: 'status-update', status: 'error', details: e?.message || String(e) });
  }

  // Print concise summary
  const ok = results.filter(r => r.status === 'ok').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  console.log(`\nSummary: ok=${ok}, skipped=${skipped}, error=${errors}`);
  for (const r of results) console.log(` - ${r.name}: ${r.status}${r.details ? ` — ${r.details}` : ''}`);

  // Exit non-zero if critical phases failed
  if (results.find(r => ['ingestion'].includes(r.name) && r.status !== 'ok')) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });

