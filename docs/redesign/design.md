# DocSetu document desk

Thesis: a working document desk, where source material has priority and questions and follow-up work stay close to it. Warm paper, dark ink, muted forest green, ruled lists, generous reading widths, compact controls. Geist and tabular figures; 4px controls, square sections, no decorative status pills or nested card shells. Top navigation replaces the sidebar. Mobile uses a disclosure navigation and single-column reading order.

## Behavioral inventory

- `/`: public introduction and workspace/login navigation; illustrative content must be labeled.
- `/login`: POST `/api/auth/login`, demo credential fill, password visibility, validation, session cookie. Middleware protects workspace and redirects legacy dashboard routes.
- `/home`: documents and actions via existing services; global search and question panel.
- `/documents`: search, team/type/language filters, list/grid, ingest, document questions, confirmed deletion.
- `/documents/[id]`: overview, sections, actions, source, activity; split reader, section navigation, copy brief, translation, document chat, deletion.
- Ingestion: upload/paste, metadata, async processing, success navigation. POST `/api/documents/ingest`.
- `/intelligence`: history, questions, citations, reset via `/api/chat`. Drawer uses same contract with document scope.
- `/actions`: filters, local-storage status, source links and citation copy.
- `/people`: directory/search/create via `/api/users`; administrator route.
- `/access`: existing read-only policy matrix; actual permissions remain enforced by server.
- `/audit`: history/search/action filters via `/api/audit`; administrator route.
- `/request-deployment`, `/demo`, error and not-found pages retained.

## Audit findings

Existing UI repeats nested double-border cards, tiny uppercase text, saturated blue/purple accents, ornamental engine badges and fabricated aggregate statuses. Several service fallbacks already provide sample documents/people/actions; preserve these as explicitly identified samples. Do not introduce claims or activities. Existing actions status is browser-local, access is read-only, and these limits need factual copy. Existing API/provider/business logic is retained; document-scope event propagation and truthful errors may be corrected.

## Selected discipline

Read `gpt-taste` and `redesign-existing-projects`. Apply anti-template hierarchy, short wide landing headline, contrast, consistent typography, complete states, responsive verification. User requirements override cinematic GSAP, stock imagery, testimonial and marquee prescriptions, and the suggestion to invent organic-looking metrics. No additional aesthetic skills. Web Interface Guidelines govern keyboard controls, focus, labels, motion and overflow.

## Implementation notes

- Replaced the landing page, authentication, workspace shell, collection, document reader, conversations, ingestion, actions, directory, permissions, audit, and sample reader with one shared visual system.
- Removed unreachable legacy dashboard pages and their unused component system. Existing `/dashboard/*` links still redirect through middleware.
- Self-hosted Geist fonts under `public/fonts`; SIL license included. No new environment variables or provider changes.
- Document questions retain document scope and submit once. Workspace history excludes document conversations. Translation failures display an error instead of fabricated translated text.
- Ingestion preserves commas in text and persists the selected language. Test scripts now authenticate through the demo login, fail on errors, and remove documents they create.
- People creation offers the two roles the existing server supports. Browser-local action progress, sample fallbacks, and the read-only permissions reference are labeled factually.
- Collection filters and document reading state support URLs. Native dialogs provide focus containment, Escape handling, and focus restoration.

## Local verification

Production build, typecheck, lint, ingestion markdown validation, browser interaction tests, live ingestion cases, and the live ingestion/search/chat/feedback pipeline are required before the branch is pushed. Browser fixtures isolate error and administrative form states; the access-request test intercepts submission so it sends no email.

The Web Interface Guidelines review covered the changed route and shared component files. Resolved findings included native form labels, focus visibility and restoration, reduced motion, URL state, long-title wrapping, responsive navigation, confirmations for deletion and draft discard, source-faithful error copy, and self-hosted font loading. The React review covered effect cleanup, stable chat submission, stale search responses, shared conversation state, and client/server boundaries.

Existing format normalization and database permissions are retained. Live tests cover HTML and text ingestion; file chooser behavior also has an isolated browser test. Image OCR and binary Word extraction are existing backend limitations, not newly implemented features.
