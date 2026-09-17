# Verification — 17 September 2026

## Passed

| Check | Result |
| --- | --- |
| Root TypeScript | Pass |
| Root ESLint | No errors; six existing unused-variable warnings outside the new app |
| Next.js production build | Pass, including `/api/mobile/auth` |
| Native authentication/access tests | 4 passed: bearer bridge, invalid/expired/wrong-algorithm rejection, public authentication route, scoped ingestion |
| Mobile TypeScript | Pass |
| Mobile domain tests | 4 passed: exact citations, workspace URL validation, ingestion validation, explicit sample provenance |
| Expo export | Web, iOS and Android JavaScript bundles generated |
| Playwright critical workflows | 3 passed at 390×844 and 360×800 |

Browser flows cover sample browsing, Ask shortcut, saving, reader, question→exact source, action completion, appearance switching, empty search, dirty upload cancellation, and a failed upload followed by a successful retry. Controlled HTTP fixtures exercise the real client's bearer header and session-expiry clearing. These fixtures do not prove database persistence or live model availability.

## Visual review

The first design was rejected by the user as too generic. The revised image board (`design/mockups/revision-workspace.png`) was generated and inspected before the second implementation pass. The library now has a functional briefing, folded document covers, a reachable Add action, and a more distinct content hierarchy. The reader uses a paper summary, numbered key points and exact source navigation. Ask has a clear scope, concise starters and evidence trays. The system sans-serif typeface is intentional; generated serif typography was not adopted.

Rendered browser captures in `design/screenshots/` were inspected. Found and fixed clipped document-cover labels, excessive library briefing height, tab label clipping, an overlapping Add action, and a screenshot taken before the appearance picker had closed. Both light and dark themes were inspected. The generated board is directional; screenshots represent implementation.

## Remaining release checks

No iOS simulator, Android emulator, physical phone, Expo signing project, live database credentials, or provider credentials were supplied. No APK/IPA or store release was produced. Before distributing:

1. Deploy this branch's backend with the existing database/provider configuration and a production `AUTH_SECRET`; point `EXPO_PUBLIC_API_URL` at it.
2. Verify real sign-in, PDF/text ingestion, persisted conversations, exact citations, role grants, administration and deletion with a dedicated test workspace.
3. On iOS and Android, check camera/file permission denial and success, original-file sharing, SecureStore restoration, keyboard avoidance, safe areas, native back/edge gestures, interrupted requests, large text and screen readers.
4. Build a signed release and measure frame rate and startup on the slowest supported device. Browser screenshots and JS exports cannot establish native 60fps performance.

Image ingestion saves originals but has no OCR. Action completion and bookmarks are device-local. Existing stateless sessions do not provide immediate server revocation after a grant change. These are explicit limits documented in the app/README, not silently simulated features.

Appllama's full-motion simulator verification remains open until a native runtime is available. The skill was applied for hierarchy, navigation, state handling, semantic themes and restrained motion; its paid reference MCP was not connected.
