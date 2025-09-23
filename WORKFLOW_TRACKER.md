# Workflow Tracker — 5-Layer Pipeline

> Source of truth for workflow status, endpoints, and run history. Keep updated as features evolve.

## Layers & Endpoints

- Ingestion: `/api/upload` (validate), `/api/documents/ingest` (persist)
- Processing: Gemini agent (page-wise for PDF), summarization with English translation
- Indexing: Embeddings (OpenAI) at document and node level, stored in MongoDB
- User Query: `/api/search/vector` (ranking), `/api/chat` (RAG with citations)
- Feedback: `/api/documents/{id}/feedback` (store + trigger reprocess)

## Data Contracts

- ProcessedDocument: see `INGESTION_AND_AGENT.md` (includes `raw` payload)
- Node: pageRange, content, summary, keyPoints, actionableItems, images[]; linked via `nextNodeId`/`prevNodeId`

## Status

- Ingestion: ready
- Processing: ready (PDF per-page via pdfjs; Gemini agent)
- Indexing: ready (OpenAI embeddings)
- User Query: ready (vector search + chat)
- Feedback: ready (submit + reprocess + history)

## History (append-only)

- ${new Date().toISOString()} — Phase 3 wired: persistence, embeddings, chat, feedback, PDF agent.

## Manual Verification Steps

- Upload HTML via dashboard; confirm agent analysis alert.
- POST `/api/documents/ingest` with HTML/text/PDF; confirm 201, Mongo insert, `nodes` populated.
- GET `/api/documents/ingest?limit=5`; confirm summaries.
- POST `/api/search/vector` with a query; confirm results > 0 when embeddings exist.
- Open `/dashboard/[id]`; navigate nodes, try chat (doc-scoped), submit feedback and verify `reprocess` succeeds.

