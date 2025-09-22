# AI Ingestion & Retrieval Plan (Modular)

This document describes the modular implementation to ingest CKEditor HTML (with base64 images), analyze via LLM, index in MongoDB with vector embeddings, and retrieve via semantic search. It also records current status and gaps.

## Current Status (as of this commit)
- Ingestion API: `POST /api/ingest`
  - Accepts `html` and optional `title`.
  - Parses HTML text + extracts base64 images (new `lib/html.ts`).
  - Calls Gemini 2.5 Flash with a strict system prompt (new `lib/prompt.ts`).
  - Requests structured JSON analysis with partitions (text/image), key points, entities.
  - Falls back to plain summary if JSON parsing fails.
  - Computes OpenAI embeddings (`text-embedding-3-small`) on `textContent + summary` if `OPENAI_API_KEY` exists.
  - Stores `htmlContent, textContent, summary, embedding, ai (structured), imageCount` in Mongo.
- Search API: `GET /api/search?q=...`
  - Uses LangChain `MongoDBAtlasVectorSearch` on `embedding`.
  - Returns `textContent` and attempts to include metadata (summary/title) when available.
- Runtime: `ingest` and `search` routes configured for Node.js runtime.
- Frontend: Dashboard contains a custom textarea “editor” with simulated upload progress; CKEditor not yet wired to `/api/ingest`.

Gaps vs. goal:
- CKEditor integration (loading states are claimed added, but currently unused here).
- Strict, example-driven system prompt added; need to finalize examples per UX.
- MongoDB Atlas Vector index must exist (`embedding` field, correct dims).
- Retrieval response shape: may include `ai` partitions and/or summary for UI.

## Architecture Overview
- `lib/html.ts`: HTML parsing utilities (text stripping + base64 image extraction).
- `lib/prompt.ts`: System prompt builder and output schema with examples.
- `app/api/ingest/route.ts`: Ingestion pipeline endpoint.
- `app/api/search/route.ts`: Vector search endpoint.
- `lib/mongo.ts`: Mongo connection helpers.

## Implementation Steps (Modular)

1) CKEditor → Backend wiring
- Add CKEditor (React) component in `app/dashboard` (or a separate route) that produces an HTML string including base64 images.
- On submit: `POST /api/ingest` with `{ html, title }`.
- Show progress states: uploading → processing → indexing → complete (re-use existing progress UI).

2) HTML parsing & constraints
- Use `parseHtmlForIngestion(html)` to produce `{ textContent, images }`.
- Enforce limits (env-configurable):
  - `INGEST_MAX_IMAGES` (default 8)
  - `INGEST_MAX_IMAGE_BYTES` (default 2.5MB)
  - Reject or skip images exceeding limits; log counts and reasons.
- Ensure `textContent` is reasonable (e.g., truncate/clip at ~200k chars if needed to avoid LLM or embed limits).

3) System prompt & analysis
- Use `buildSystemPrompt()` + `buildUserInstruction()` to guide Gemini output:
  - Strict JSON only.
  - Schema includes `overall_summary`, `key_points`, `partitions` (text/image with `ocrText`/`description`), optional `entities`, `dates`, `actions`.
  - Provide examples in prompt (already in code; expand with domain-specific samples if needed).
- Compose multimodal call:
  - Parts: [system prompt, instruction, HTML (text), plain text, images (inlineData)].
  - Cap images by limits above.
- Parse result with `JSON.parse`; fallback to plain text summary on failure.

4) Persistence & schema
- Store document with fields:
  - `title: string | null`
  - `htmlContent: string`
  - `textContent: string`
  - `summary: string`
  - `ai: AiAnalysis | null` (structured partitions)
  - `imageCount: number`
  - `embedding: number[] | null`
  - `createdAt: Date`
- Consider moving large HTML or images to object storage for production; keep references.

5) Embeddings & indexing
- Embed `textContent + summary` using `OpenAIEmbeddings` (or swap in Gemini/Open-source later).
- MongoDB Atlas Search index (vector) on `embedding` with correct `numDimensions` (e.g., 1536 for `text-embedding-3-small`).
- Index name via `MONGODB_VECTOR_INDEX` (default `vector_index`).

6) Retrieval API shape
- `/api/search`: returns top-k documents with:
  - `id`, `title`, `summary`, `score?`, and optionally `ai.partitions` (first N text snippets) if desired for preview.
- Client renders results: summary-first, with option to expand to partitions or original HTML.

7) Observability & resilience
- Log image skips by reason (too large, too many, bad data URI).
- Timeouts for LLM calls; handle retries backoff.
- Guardrail: if JSON parse fails, store raw text summary; set `ai=null` and continue.
- Validate envs at boot (Mongo URI/DB/collection, optional keys for LLM/embeddings).

## Edge Cases & Handling
- Oversized images: skip individual images exceeding `INGEST_MAX_IMAGE_BYTES`; still process others.
- Too many images: cap at `INGEST_MAX_IMAGES`.
- Non-base64 or remote images: currently ignoring non-data URIs; optionally fetch remote images later.
- Corrupt base64: skip; continue ingestion.
- Empty or tiny docs: short summary; embedding may be skipped.
- LLM JSON formatting errors: robust fallback to plain summary; store raw text.
- Long HTML: clip text for embeddings; still provide full HTML to Gemini if within limits; otherwise clip.
- Missing API keys: continue without summary and/or embedding; still persist raw.
- Mongo index missing: ingestion still works; search returns error until index exists.

## Environment Variables
- `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_COLLECTION`
- `MONGODB_VECTOR_INDEX` (default `vector_index`)
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_KEY`)
- `OPENAI_API_KEY` (for embeddings)
- `INGEST_MAX_IMAGES` (default 8)
- `INGEST_MAX_IMAGE_BYTES` (default 2500000)

## Manual Test Plan
1) Ingest simple HTML without images → expect summary, embedding stored.
2) Ingest HTML with 1–3 base64 images → expect `ai.partitions` with at least one image partition and a coherent `overall_summary`.
3) Ingest with one oversized image (> limit) and one valid → valid included; oversized skipped; ingestion OK.
4) Ingest with malformed base64 → skipped; ingestion OK.
5) Search with query terms → results ordered by semantic similarity; summaries present.
6) Disable `OPENAI_API_KEY` → ingestion OK; search will return error until embeddings enabled.

## Frontend Wiring Tasks
- Replace custom textarea editor with CKEditor 5 React component.
- Ensure CKEditor exports HTML with base64 images (using appropriate plugins).
- Wire submit to `POST /api/ingest` and show live progress states already present.
- Display ingestion response: summary + optional `ai.key_points` and `partitions` preview.
- Add a “View original” that renders `htmlContent` safely.

## Follow-ups
- Add `/api/documents/:id` route to fetch full record (including `ai` partitions, html).
- Add pagination and filter to `/api/search` and include similarity scores.
- Expand prompt examples for KMRL domain docs (safety notices, circulars, SOPs).
- Optional: OCR pipeline before LLM for robust `ocrText` on scanned images.
- Optional: store images externally and dedupe via hash.

