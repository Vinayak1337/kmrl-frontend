# KMRL Frontend — Project Status (Phase 1–3)

This document tracks what’s done and what’s next across the current effort. It also recommends how to consolidate existing docs so everything stays accurate and easy to maintain.

## ✅ Completed

- UI/UX (Dashboard Upload)
  - Upload dialog refactored to shadcn components: Dialog, Button, Input, Select, Label, Alert, Badge.
  - Custom shadcn Select (Trigger/Content/Item) replaces native selects across dashboard.
  - Rich text editor toolbar uses shadcn Buttons; editor uses shadcn Textarea.
  - Light mode enforced globally and in modal; removed dark styling.

- Phase 1 (Upload plumbing)
  - `POST /api/upload` endpoint accepts documents (html/text/images/pdf/doc), validates payload and logs details.
  - No DB writes (as requested). Returned JSON confirms payload and page counts.
  - Hardened `GET /api/documents/ingest` listing to avoid undefined access and 500s.

- Phase 2 (Agent analysis with Gemini)
  - LangChain-free, SDK-native agent added for iterative page reading and final JSON:
    - Library: `@google/genai` via `lib/agent/geminiAgent.ts` (uses strict JSON action protocol).
    - API: `POST /api/documents/agent` accepts `{ html }` or `{ pages[] }`, chunks HTML to pages, feeds images as inline parts, returns `{ overallSummary, nodes[] }` with linked prev/next.
  - Dashboard wiring: after upload, runs the Gemini agent best-effort and shows a success summary (pages → nodes) in the upload alert.

## ✅ Completed (Phase 3)

- Persistence & schema
  - Processed documents persisted to MongoDB with linked-list nodes and raw payloads.
  - `POST /api/documents/ingest` writes processed docs; `GET /api/documents/ingest` fetches summaries or a full doc by `id`.

- Embeddings & search
  - Document- and node-level embeddings generated with OpenAI and stored.
  - `POST /api/search/vector` supports doc-level and node-level queries with filters.

- Query layer (Chat)
  - `POST /api/chat` implements RAG over documents or a specific document (via `docId`), using Gemini for responses and citations.
  - Dashboard includes a chat widget and per-document chat.

- Feedback loop
  - `POST /api/documents/{id}/feedback` stores feedback and triggers reprocessing using stored raw content; updates nodes, embeddings, and summary; appends to history.
  - Document view includes a feedback form.

- PDF page processing
  - PDFs are parsed page-by-page (pdfjs) and processed with a Gemini agent to build nodes.

## 📚 Doc Consolidation Plan

Summary of current docs and recommended actions:

- README.md — Keep
  - Purpose: Quickstart, project overview, scripts. Update minor version references if needed.

- FRONTEND.md — Keep (Roadmap/Architecture)
  - Purpose: Deeper, evolving frontend roadmap and structure. Link to status and ingestion docs.

- DOCUMENT_INGESTION_GUIDE.md — Merge with Agent
  - Action: Merge into a single "Ingestion & Agent Guide" that covers:
    - Upload → Agent → Persistence flow
    - API routes: `/api/upload`, `/api/documents/agent`, `/api/documents/ingest`
    - Data models and examples
  - Source candidates to merge: `docs/AI_INGESTION_PLAN.md`, `doc.md`.

- docs/AI_INGESTION_PLAN.md — Merge into above
  - Rationale: Planning doc overlaps with the current implementation details.

- doc.md — Merge into above or Move to docs/archive/
  - Rationale: Long-form tutorial overlapping ingestion/agent design; consolidate key parts.

- EMBEDDINGS_STATUS_REPORT.md — Fold into search/embedding section
  - Action: Create/Update a single "Search & Embeddings" section inside the Ingestion & Agent Guide; remove standalone status report afterward.

- WARP.md — Optional: fold "Common Development Commands" into README
  - Rationale: Avoid duplication. Keep WARP.md if your team likes a terminal-focused quickref.

- KMRL_PROBLEM_STATEMENT.md — Keep
  - Purpose: Context/background. Link it from FRONTEND.md.

- API_TESTING_GUIDE.md — Keep
  - Purpose: Tactical testing instructions; ensure endpoints include the new agent.

- AGENTS.md — Keep (internal repo guidelines)
  - Purpose: Project-side guidance for contributors. Not end-user documentation.

## ✳️ Proposed new structure (after consolidation)

- README.md (quickstart)
- FRONTEND.md (roadmap/architecture)
- INGESTION_AND_AGENT.md (merged guide for upload, agent, persistence, search)
- KMRL_PROBLEM_STATEMENT.md (background)
- API_TESTING_GUIDE.md (testing tips)
- docs/archive/ (old deep-dive material, if you want to keep historical docs)

## ✅ Environment keys in use

- `GEMINI_API_KEY` (preferred) or `GOOGLE_API_KEY` / `GOOGLE_GENAI_API_KEY`
- `OPENAI_API_KEY` (optional, for embeddings if used)
- Existing app secrets in `.env.local` continue to apply (auth, SMTP, DB).

## 🔁 How you can proceed

- Approve the consolidation plan and which files to archive/remove.
- I will:
  - Create `INGESTION_AND_AGENT.md` by merging the three ingestion docs.
  - Update README cross-links and remove duplicates (or move to docs/archive/).
  - Wire Phase 3 (persistence + embeddings) behind a feature flag.

---
Last updated: automated status as of current branch changes.

## 5-Layer Pipeline — Status

- Ingestion: Ready — `/api/upload` (validate), `/api/documents/ingest` (persist)
- Processing: Ready — PDF paged via pdfjs; Gemini agent; translation to English
- Indexing: Ready — MongoDB keyword retrieval over titles/summaries/nodes (embeddings disabled)
- User Query: Ready — Vector search + `/api/chat` RAG; dashboard chat UIs
- Feedback: Ready — Feedback API + reprocess + history tracking

## Workflow History (rolling)

- [Phase 3] Implement persistence, embeddings, chat, feedback, and PDF paged agent. Date: ${new Date().toISOString()}

## 🧪 Pipeline Test Plan

- Scripts
  - `npm run test:pipeline` — end-to-end: ingestion → search → chat → feedback
  - `npm run test:ingest` — ingestion-only multi-case coverage
- Requirements
  - Run server: `npm run dev` (or `npm run build && npm run start`)
  - Configure `.env.local` with `MONGODB_URI`, `MONGODB_DB_NAME`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `AUTH_SECRET`
- Expected
  - Ingestion: 201 with `documentId`, non-zero `nodeCount`
  - Search: resultsFound > 0 for relevant queries
  - Chat: English answer with citations like `[#1]`
  - Feedback: `{ ok: true }`, nodes updated, `metadata.updatedAt` set

## 📜 Test Run History

- Pending: Execute `npm run test:pipeline` locally; the script appends a timestamped result block here automatically.

## ▶️ What’s Next

- Wire Atlas Vector Search for scalable retrieval (replace client-side cosine).
- Add DOCX parsing (mammoth) for robust Word ingestion.
- Queue/background jobs for large docs to avoid timeouts.
- Add Playwright smoke tests for upload → detail, chat, and feedback flows.


## 🧪 Pipeline Test Run — 2025-09-23T08:15:32.896Z
- ingestion: error — Unauthorized
- vector-search: skipped — results=0
- chat: error — Unauthorized
- feedback: error — missing documentId from ingestion


## 🧪 Pipeline Test Run — 2025-09-23T08:15:44.007Z
- ingestion: error — Unexpected token '<', "<!DOCTYPE "... is not valid JSON
- vector-search: error — Unexpected token '<', "<!DOCTYPE "... is not valid JSON
- chat: error — Unexpected token '<', "<!DOCTYPE "... is not valid JSON
- feedback: error — missing documentId from ingestion


## 🧪 Pipeline Test Run — 2025-09-23T08:19:56.744Z
- ingestion: ok — docId=doc-1758615598845-c2FuaXR5, nodes=1
- vector-search: ok — results=1
- chat: error — Chat failed
- feedback: error — Failed to submit feedback


## 🧪 Pipeline Test Run — 2025-09-23T08:20:48.442Z
- ingestion: ok — docId=doc-1758615650499-c2FuaXR5, nodes=1
- vector-search: ok — results=2
- chat: error — Chat failed
- feedback: ok
