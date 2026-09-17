# DocSetu mobile

A React Native + Expo app for the existing DocSetu workspace. The website remains at the repository root; the independently installed mobile app is here. Read [design.md](design.md) before changing UI. The revised design board and original image mock-ups are in [design/mockups](design/mockups); rendered verification captures are in [design/screenshots](design/screenshots).

## Run

Use Node 22.13+ (Node 24 recommended).

```sh
cd mobile
npm ci
cp .env.example .env
npx expo start
```

Open in a compatible Expo Go client, Android emulator, iOS simulator, or development build. The project uses Expo SDK 57, React Native 0.86.3 and React 19.2.3. Dependencies are pinned by `package-lock.json`; install native libraries with `npx expo install`.

- `npm run web`: browser UI preview; choose **Explore sample workspace** to inspect all core screens without credentials.
- `npm run android` / `npm run ios`: launch on an available device/simulator.
- Set `EXPO_PUBLIC_API_URL` to an HTTPS deployment of **this branch's backend**. The production main branch does not yet contain `/api/mobile/auth`.
- For local native development, point to the computer's LAN address (`http://192.168.x.x:3000`), not the phone's localhost. Android emulator can use `http://10.0.2.2:3000`. Plain HTTP is accepted only in development.
- Sign in with an existing administrator-provisioned DocSetu account. No credentials or API keys ship in the application.
- The web preview does not persist bearer tokens. Cross-origin live web use requires an explicit same-origin API proxy or a deployment-specific CORS configuration; native HTTP clients do not have browser CORS restrictions.

## Build

```sh
npm run typecheck
npm test
npm run export
# Android internal APK; requires your Expo account/project setup:
npx eas-cli build --platform android --profile preview
# iOS internal distribution requires Apple provisioning:
npx eas-cli build --platform ios --profile preview
```

`eas.json` includes development, internal preview, and production profiles. Set the public API URL in the corresponding EAS environment. No Expo project ID, signing credentials, or store account is invented. Exporting JS bundles does not create an APK/IPA or publish an app.

## Features and storage

| Screen | Behavior |
| --- | --- |
| Documents | Server search/type filters, paginated virtualized list, pull to refresh, saved-document list with access rechecks |
| Reader | Overview, key points, flags, extracted sections, unchanged source, original-file export, bookmark, system share, admin-only deletion |
| Ask | Global/document-specific persisted history, bounded requests, preserved failed questions, exact node citations, no automatic mutation retries |
| Add document | System file picker, camera capture, pasted text, metadata/language, source preview, validation, protected drafts, retry without losing input |
| Source | Exact cited node, page range, selectable text, clipboard, summary translation, contextual questions |
| Actions | Source-linked recent actions, account-scoped device-local completion marks |
| Workspace | Account, light/dark/system theme, access grants, sign-out |
| People | Administrator directory, create/edit/delete, resource grants, optional password reset |
| Activity | Administrator audit log, pagination and refresh |

Camera/image ingestion preserves an image record. The existing backend has no OCR in its image normalizer; the app states this before submission and does not fabricate text or a completed extraction. Native photo capture and file sharing need device verification. Pasted text or text-based PDFs are the appropriate inputs for searchable ingestion. Files are capped at 2.5 MB to allow base64 payload overhead on common hosting limits.

Saved document **IDs** and action marks are stored locally, scoped by workspace + user. Document contents are not persisted for offline reading. Completion marks are not approvals and do not synchronize to colleagues. Action retrieval currently follows the existing API's recent 200-node limit. The demo is explicitly selected, never a failure fallback, and never uploads or edits live records.

## Backend integration

- `POST /api/mobile/auth` reuses the web credential verifier and returns a signed, seven-day token. Native uses SecureStore (Keychain/Keystore), not AsyncStorage, for it.
- Middleware validates HS256 signatures and expiry, then supplies the verified identity to existing cookie-based API handlers. Route-level RBAC remains authoritative. Invalid bearer tokens cannot fall through to a different cookie identity.
- Production requires `AUTH_SECRET` (or existing `NEXT_AUTH_SECRET`). The insecure default exists only in development; set the same secret across instances. Existing Mongo/Prisma and AI environment configuration remains in the root deployment documentation.
- Ingestion now checks team/type `ingest` grants. Feedback now checks document access; source reprocessing requires administrator access. Mobile feedback records an issue with `reprocess: false`.
- Sessions retain the existing stateless JWT semantics: grant changes/deletion are not immediately reflected in an already-issued token. Re-sign-in refreshes claims; immediate server revocation/refresh-token rotation is not implemented in this branch.
- Logout clears memory/query caches and removes the native token. Late responses from a previous session are rejected. Failed requests remain errors; they never show sample documents.

| App operation | Existing API |
| --- | --- |
| Document list/read/upload | `/api/documents/ingest` |
| Exact evidence | `/api/nodes/:uid` |
| Questions/history | `/api/chat` |
| Translation | `/api/translate` |
| Document deletion/feedback | `/api/documents/:id`, `/api/documents/:id/feedback` |
| Actions | `/api/actions` |
| People/access administration | `/api/users`, `/api/users/:id` |
| Audit | `/api/audit` |

## Verification

```sh
# Repository root
node --import tsx --test scripts/test-mobile-auth.ts
npm run typecheck
npm run lint
npm run build

# mobile/
npm test
npm run typecheck
EXPO_OFFLINE=1 npx expo export --platform all
npx playwright install chromium
npm run test:ui
```

`test:ui` builds the web bundle and starts a local static preview. Its HTTP test fixtures verify the real client's request/response handling, bearer transport, upload retry, citations and session expiry; they are **not** live database/AI-provider tests. `CHROMIUM_EXECUTABLE_PATH` may point to a compatible installed Chromium.

See [VERIFICATION.md](VERIFICATION.md) for actual results and remaining device/release checks. Generated assets reuse the existing DocSetu vector mark. Run `npm run assets` to recreate icons, adaptive foreground, monochrome icon, favicons and light/dark splash assets.
