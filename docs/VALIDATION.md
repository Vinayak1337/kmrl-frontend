# Validating Manager Markdown Summaries

This script verifies that ingestion + agent produce structured, manager‑friendly Markdown summaries and classification.

## Requirements

- Node.js runtime for `tsx`
- Optional: running app with a valid `kmrl_session` cookie for live validation

## Commands

Mock mode (no server/LLM):

```
npm run test:md
```

Live mode (hits your running server + real LLM):

```
TEST_LIVE=1 \
SERVER_URL=http://localhost:3000 \
SESSION="<kmrl_session JWT>" \
npm run test:md
```

The script:

- Ingests `test-samples/sample1.html` via `/api/documents/ingest` (leaving classification empty to test inference)
- Retrieves the created document via `/api/documents/ingest?id=<docId>`
- Validates that:
  - Document includes `overallMd` or a sufficiently long `fullSummary`
  - Nodes exist and each has `summaryMd` (or a sufficiently long `summary`)
  - Key points are present
  - Classification exists: `metadata.department` and `metadata.documentType`

## Notes

- The multi-turn agent (`lib/agent/geminiAgent.ts`) requests additional pages when needed and returns, per pageRange, a single fenced Markdown block (`pageMd`), which is stored as `nodes[].summaryMd`. Images are returned separately per page as base64 and persisted in `nodes[].images`.
- The single-shot summarizer prompt (`lib/prompt.ts` → `buildManagerMdPrompt`) also produces `overallMd` and node-level MD fields when used.
- The document detail page (`app/dashboard/[id]/page.tsx`) prefers rendering `overallMd` and `summaryMd` when present; otherwise it falls back to plain summaries.

