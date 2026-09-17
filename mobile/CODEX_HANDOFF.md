# Codex handoff — DocSetu mobile

## Local continuation — 17 September 2026

The branch has now been checked out and run on the connected Vivo I2207 (Android 15). See the latest section in `VERIFICATION.md`. Local API testing uses a separate `docsetu_mobile_verification` database and backend port 3100, with credentials kept outside the repository. The configured OpenCode provider currently returns HTTP 403 restricting its free tier to OpenCode; source-based fallback is verified, model synthesis is still blocked. Android keyboard avoidance, scrolling safe areas, page-count grammar, native system-theme support and the missing development client are corrected. A repeatable live bearer workflow test is available as root `npm run test:mobile:pipeline`.

## Request and current status (original handoff)

Build a React Native + Expo mobile counterpart to `Vinayak1337/kmrl-frontend`, emphasizing interactive DMS UX and minimal explanatory copy. User requested image-first mock-ups, Appllama design guidance, a locked design MD, branded assets, backend changes as needed, and a new branch. The user rejected the initial UI as generic; a second image-first design pass is implemented. The latest instruction is to stop further implementation, push all work, and hand off to Codex. Do not merge or deploy automatically.

Branch: `feat/docsetu-expo-mobile`. Based on main commit `71b72509899d1da9a58e2c9cde4dc651a5cc317c`. The mobile app is independent under `mobile/`; the Next.js website/backend remains at root. No production deployment or store build has been made.

## Read first

1. Root `AGENTS.md` and `design.md`.
2. `mobile/design.md`: mandatory mobile design contract; revised direction supersedes the initial mock-ups.
3. `mobile/design/mockups/revision-workspace.png`: revised generated design board. The three earlier images are retained as history.
4. `mobile/design/screenshots/`: actual browser-rendered screens, including Documents light/dark, Reader, Ask start/answer and narrow upload.
5. `mobile/README.md`: run/build instructions, API mapping and explicit limitations.
6. `mobile/VERIFICATION.md`: passed checks and remaining release gates.
7. This file, then `mobile/src/api.ts`, `store.ts`, `domain.ts` and the routes you change.

## Implemented

- Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript, Expo Router.
- Four tabs: Documents, Ask, Actions, Workspace; native stack/modal routes above tabs.
- Search/type filters, virtualized paginated documents, pull-to-refresh, account-scoped saved IDs, press-in prefetch.
- Reader with summary/key points/flags, sections, unchanged extracted source, original-file export, share, bookmark, feedback and admin deletion.
- Global and per-document chat/history, Markdown replies, pending/error handling, failed draft preservation, source citations that open the exact node; source summary translation and copy.
- Add document via native file picker, camera or pasted text; metadata/language, preview, size validation, dirty draft protection, explicit retry, success→reader.
- Source-linked actions with private local completion marks.
- System/light/dark theme, account/access screen, administrator people/grant management and audit log.
- Native tokens in SecureStore; tiny preferences in AsyncStorage; TanStack Query server state; Zustand client state; late responses rejected across session changes.
- Explicit sample workspace for credential-free review. Never substitutes for a failed live request.
- App icon, adaptive/monochrome icons, favicon, light/dark splash; EAS profiles and independent lockfile.
- CI workflow, focused domain/auth tests and three Playwright workflow tests.

## Backend changes

- `POST /api/mobile/auth` returns signed seven-day bearer token and user, reusing the web credential verifier (`lib/authenticate.ts`).
- `middleware.ts` validates bearer HS256/expiry, bridges the verified identity into existing cookie-based handlers, and rejects invalid bearer tokens without cookie fallback.
- Shared `lib/authSecret.ts`: production requires AUTH_SECRET or NEXT_AUTH_SECRET, no production fallback.
- Ingest route now enforces team/type ingest grants; feedback checks document access and limits reprocessing to ADMIN.
- Root TypeScript/ESLint excludes mobile; FRONTEND.md and design.md updated.
- Existing AI/provider implementation was preserved. Do not assume older prose mentioning Muse Spark 1.3 matches current code (current wrapper was 1.2 when inspected).

## Design decisions and feedback

Appllama skill read and applied: https://github.com/Appllama/appllama-skills/blob/main/skills/appllama-app-design-skill/SKILL.md . Its paid reference MCP was unavailable. Taste mobile image guidance was also read: https://github.com/Leonxlnx/taste-skill/blob/main/skills/imagegen-frontend-mobile/SKILL.md . No claim that the full Appllama simulator/motion checklist has passed.

The revision adds a forest briefing with functional Ask/Saved shortcuts, folded document format cues, an editorial reader with numbered key points, and an Ask introduction with concise starters and evidence trays. Keep the existing warm-paper/forest identity and native sans typography. The generated board's serif lettering and sample content are not production requirements. No fabricated counts, charts, source excerpts, or model results. User has not given final approval of this revised implementation; obtain their visual feedback before another large redesign.

Remaining visual refinement candidates: compact library header further if desired; long type labels can truncate inside small decorative covers; evaluate large text, dark reader/chat and screen-reader semantics on actual devices. Do not spend another long session endlessly refining mock-ups before giving the user runnable output.

## Verification completed

- Root `npm run typecheck`, `npm run lint` (0 errors, 6 existing warnings), `npm run build`: passed.
- `node --import tsx --test scripts/test-mobile-auth.ts`: 4 passed.
- Mobile `npm run typecheck`, `npm test`: passed (4 domain tests).
- Expo exports for web, iOS and Android: passed after the final code changes.
- Playwright: 3 workflows passed after final code changes, including Ask shortcut, saved/read/Ask/citation, action completion/theme, 360px empty search/dirty draft, controlled HTTP authentication/upload retry/session expiry.
- Rendered screenshots inspected; overlapping Add action, clipped tab labels, oversized briefing and cover width were improved.
- Build export is JavaScript/assets only, not a native APK/IPA.

## Remaining work, in order

1. Check out the branch and run locally. Start with the explicit sample workspace; show the user the current app early.
2. Deploy or run this branch's backend with a dedicated test MongoDB/Prisma workspace and existing AI configuration. Configure mobile EXPO_PUBLIC_API_URL. Existing main production does not have the new native login endpoint.
3. Test actual account login, PDF/text ingestion→database persistence→reader→AI answer→exact source, role/access boundaries, feedback, people management and deletion. Browser HTTP fixtures are not live integration proof.
4. Run iOS/Android simulator or device checks: camera/file pickers, permission denial, file sharing, SecureStore restart, keyboard, back/edge gestures, deep links, interrupted network requests, large text, screen readers and dark themes.
5. Create a signed development/preview build with the user's Expo project. Measure startup and sustained frame rate on a slow supported device. No 60fps claim has been validated.
6. Decide separately whether to add OCR, synchronized actions, offline content or immediate session revocation. These are not implemented.

## Explicit product limits

- Image/camera ingestion stores the image, with NO OCR. App explains this; pasted text and text PDFs are searchable inputs.
- Bookmarks store IDs only. Document content is not available offline. Action completion is device/account-local, not shared approval workflow.
- Existing action API returns recent records with a 200-node limit.
- Existing stateless JWT grants can remain valid until token expiry; immediate revocation/refresh rotation is not present.
- Web preview uses in-memory bearer tokens. Live cross-origin browser use needs an API proxy/CORS configuration; native clients do not use browser CORS.
- No credentials, real account, live DB/provider test, Expo project ID, signing setup, APK/IPA or deployment was available/created.

## Commands

```sh
# Root
npm ci
npx prisma generate
npm run typecheck
npm run lint
npm run build
node --import tsx --test scripts/test-mobile-auth.ts

# Separate mobile dependencies
cd mobile
npm ci
cp .env.example .env
npx expo start
npm run typecheck
npm test
EXPO_OFFLINE=1 npx expo export --platform all
npx playwright install chromium
npm run test:ui
# With your Expo project/account configured:
npx eas-cli build --platform android --profile preview
```

## Prior environment notes

The interrupted Work session lost its original worktree metadata and root dependency symlink target, while files survived. Git metadata was reconstructed from the verified GitHub base commit/tree; root dependencies were reinstalled and checks rerun. Use a fresh normal clone in Codex; this is not an application issue.

Direct git transport was unavailable, so publishing used GitHub Git-object APIs. Image uploads were slow. Temporary scripts, browser binaries and dependencies are intentionally not committed. All required source, assets, lockfile, screenshots, mock-ups and docs are in this branch.

The prior container could not run agent-browser's daemon or download Playwright's normal browser. It used a local @sparticuz/chromium binary with CHROMIUM_EXECUTABLE_PATH=/tmp/chromium and LD_LIBRARY_PATH=/tmp/chromium-libs. A normal Codex environment should use Playwright's supported Chromium install. Test webServer is started by Playwright; avoid relying on a long-running server from another isolated tool process.

## What the user should provide

No additional source files are needed beyond this branch. Supply development backend environment values and test credentials through local environment/secrets, never committed files. Native builds need the user's Expo account/project and, for iOS distribution, Apple provisioning. A simulator/device or screenshots of desired UX would help close the remaining validation/design gaps.
