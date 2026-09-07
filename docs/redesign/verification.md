# Redesign verification

## Local results

- `npm run build`: pass.
- `npm run typecheck`: pass.
- `npm run lint`: zero errors; six pre-existing warnings in `hooks/useSpeechRecognition.ts`, two PDF test scripts, and `shims/google-generative-ai.ts`.
- `npm run test:md`: pass.
- `npm run test:ui`: 13/13 pass against both development and production servers.
- `npm run test:ingest`: 4/4 live cases pass (HTML, multi-page text, procurement, multiple documents); created documents cleaned up.
- `npm run test:pipeline`: ingestion, vector search, chat, feedback, and report output pass; created document cleaned up.
- Live Hindi translation: successful locally and on the Vercel preview. OpenCode Zen Muse Spark configuration remains unchanged and requires no API key.

## Preview inspection

Initial preview: `https://kmrl-frontend-e4j8vqivn-vinayak1337s-projects.vercel.app`, deployment `dpl_CohvR658bP7YfU44dSMqYq5Nj99p`, commit `d8e366d2990f76a9674a2e77c8dd8da5fb552fd1`.
Vercel API metadata matched the branch commit and reported Ready; build logs were inspected.

Captured and checked `/`, `/login`, `/request-deployment`, `/home`, `/documents`, `/documents/doc-1788806292125-lx9dj`, `/intelligence`, `/actions`, `/people`, `/access`, `/audit`, and `/demo` at 1440×1000 and 390×844. Full-page captures also cover scrolling content. No document overflow, page errors, console errors, or failed requests were recorded in the completed run. Fonts loaded successfully.

Checked all document tabs, split reader, translation dialog, real demo login, search/empty/reset behavior, ingestion metadata and discard confirmation, mobile navigation, and the people dialog. Browser regression tests cover document-scoped chat submission, translation errors, source retention, upload/paste contents, deletion errors, actions persistence, role restrictions, and access-request success without sending email.

The visual review found hidden desktop line breaks joining words on mobile in public headings. This commit adds spaces before those breaks. The latest commit's preview must be rechecked after pushing; the PR and final completion report record that final deployment.

## Review images

The workspace screens are unchanged by the heading-spacing correction and were captured from the verified initial preview:

- [Collection desktop](screenshots/documents-desktop.png)
- [Collection mobile](screenshots/documents-mobile.png)
- [Reader desktop](screenshots/reader-desktop.png)
- [Reader mobile](screenshots/reader-mobile.png)
- [Ingestion dialog](screenshots/ingestion-dialog.png)

## Existing limits

Actions progress is browser-local. Permissions are a read-only reference. The existing services may show labeled samples if live data is unavailable. Binary Word extraction and image OCR remain backend limitations; live ingestion coverage here is HTML and text. Dependency installation reports deprecations in existing transitive dependencies. No production deployment or merge was performed.
