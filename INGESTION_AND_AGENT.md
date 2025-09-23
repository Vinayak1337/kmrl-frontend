# Ingestion & Agent Guide

This guide documents the end-to-end flow for uploading documents, analyzing them with the Gemini agent, and retrieving structured results. It also outlines the planned persistence and search phases.

## Overview

Flow (current):
- Upload via dashboard → POST `/api/upload` (validation + logging)
- AI processing → POST `/api/documents/ingest` persists to MongoDB: linked-list nodes with summaries, actions, metadata, embeddings
- Optional agent analysis (ad hoc) → POST `/api/documents/agent` (Gemini) returns nodes without persistence
- Retrieval → GET `/api/documents/ingest` returns summaries or full document by `id`
- Chat → POST `/api/chat` answers questions over all docs or a specific document using keyword-based retrieval (no embeddings)
- Feedback → POST `/api/documents/{id}/feedback` stores feedback and reprocesses the document

## Environment

- `GEMINI_API_KEY` (preferred) or `GOOGLE_API_KEY` / `GOOGLE_GENAI_API_KEY`: Gemini for analysis and chat
- `OPENAI_API_KEY`: Embeddings for search and RAG
- `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_COLLECTION`: Persistence
- Existing app secrets in `.env.local` for auth/DB

## API Endpoints

### Upload (Phase 1)
- POST `/api/upload`
  - Auth required
  - Body: `{ documents: Array<{ type: 'html'|'text'|'pdf'|'doc'|'image', content: string, filename: string, department?: string, documentType?: string, tags?: string[] }> }`
  - Behavior: Validates payload, logs each doc with a rough page count (`[upload] filename | type=... | pages=1 | size=N chars`) and returns a summary JSON. No DB writes.

Example:
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  --cookie "kmrl_session=..." \
  -d '{
    "documents": [
      {"type":"html","content":"<h1>Title</h1>","filename":"doc.html"},
      {"type":"text","content":"plain text","filename":"note.txt"}
    ]
  }'
```

### Agent Analysis (Gemini)
- POST `/api/documents/agent`
  - Auth required
  - Body:
    - Single HTML: `{ title?: string, html: string }` (auto-chunked into ~3500-char pages; base64 images extracted and included)
    - Pre-paged: `{ title?: string, pages: [{ text?: string, html?: string, images?: [{ base64, mimeType }] }] }`
  - Response: `{ success: true, title, totalPages, overallSummary, nodes: Node[] }`

`Node` shape (example):
```json
{
  "id": "node-1",
  "pageRange": { "start": 1, "end": 2 },
  "content": "Representative text snippet",
  "images": [{ "page": 1, "base64": "...", "mimeType": "image/png" }],
  "summary": "Focused summary",
  "keyPoints": ["point 1", "point 2"],
  "actionableItems": ["task 1"],
  "nextNodeId": "node-2",
  "prevNodeId": null
}
```

Example (HTML):
```bash
curl -X POST http://localhost:3000/api/documents/agent \
  -H "Content-Type: application/json" \
  --cookie "kmrl_session=..." \
  -d '{
    "title": "Safety Circular",
    "html": "<h1>Safety</h1><p>Content...</p>\n<img src=\"data:image/png;base64,....\" />"
  }'
```

### Retrieval (Summaries)
- GET `/api/documents/ingest`
  - Auth required
  - Query: `id?`, `department?`, `type?`, `limit=10`
  - Returns summary rows with defensive defaults (no crash on missing fields): `{ id, title, summary, nodeCount, createdAt, department, documentType, tags }`

## Data Model (Persistence)

```ts
// Document-level
type ProcessedDocument = {
  id: string;
  title: string;
  originalFormat: string; // 'html' | 'text' | 'image' | 'pdf' | 'doc'
  totalPages: number;
  language: string;
  nodes: DocumentNode[];
  fullSummary: string;
  metadata: {
    createdAt: Date;
    uploadedBy: string;
    department?: string;
    documentType?: string;
    tags?: string[];
  };
  embedding?: number[]; // optional (Phase 3)
  raw?: { type: string; content: string; text?: string };
};

// Node-level
type DocumentNode = {
  id: string;
  pageRange: { start: number; end: number };
  content: string;
  images: Array<{ page: number; base64: string; mimeType: string; caption?: string }>;
  summary: string;
  keyPoints: string[];
  actionableItems: string[];
  embedding?: number[]; // optional (Phase 3)
  nextNodeId?: string;
  prevNodeId?: string;
};
```

## Search & Chat

- Embeddings
  - Document-level: combine full summary + node summaries into a vector
  - Node-level: combine content + summary + key points + actions
  - Default: OpenAI `text-embedding-3-small` (or swap to Google embeddings)

- Text Search API
  - POST `/api/search/vector` with `{ query, limit, searchNodes, department?, documentType? }`
  - Returns ranked results using keyword scoring across titles, summaries, and nodes; includes document metadata and optional node details.

- Chat
  - POST `/api/chat` with `{ messages, docId? }`
  - Uses keyword retrieval to select top nodes and Gemini to answer with citations; always answers in English.

## Feedback Loop

- Submit feedback on a document page: `POST /api/documents/{id}/feedback` with `{ type, message, reprocess: true }`
- Triggers reprocessing using stored raw content → updates nodes, embeddings, and document summary
- History entries are appended for traceability

## Dashboard UX

- Upload dialog (shadcn) handles both file and editor flows
- After upload, an agent run is triggered and the alert shows pages → nodes summary
- Light mode enforced globally and in modal

---
Last updated after Phase 3 (persistence, vector search, chat, feedback) wiring.
