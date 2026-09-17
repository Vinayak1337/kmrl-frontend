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

## Local Vivo continuation — 17 September 2026

Physical device: Vivo I2207, Android 15, 1080×2400, connected over USB. Expo Go SDK 57 was installed and the app launched from Metro on port 8081. Backend runs locally on port 3100 with a separate `docsetu_mobile_verification` database; existing production records were not used for test mutations. Test credentials remain outside the repository.

Verified in Expo Go on the device:

- Sample Documents → Reader → Ask → exact Source; native Back and tab navigation.
- Light and dark layouts, appearance selection, sign-out confirmation.
- Live native sign-in; pasted text upload → persisted reader → question → exact source. The fallback notice correctly identifies the reply as a source-based extract.
- Session restoration after force-stop/relaunch using SecureStore; light preference survives restart.
- Native camera launch, capture, return to image preview and explicit no-OCR notice; unsaved image draft confirmation on Back. Native file picker opens and cancels back to the draft.
- Keyboard appearance revealed a hidden Android composer. Fixed `KeyboardAvoidingView` to use Android height avoidance and verified the input and Send stay above the keyboard. Shared form screens receive the same correction.
- Scrolling Workspace revealed content under the status bar. Sign-in and Workspace now place top safe-area padding outside their scroll content.
- Single-page documents now say “1 page”.

Automated checks rerun successfully: mobile typecheck and four domain tests; three Playwright workflows; root typecheck, lint (same six existing warnings), production build and four mobile auth tests. Added `npm run test:mobile:pipeline`, exercised against the dedicated database: native login, invalid bearer rejection, administrator person creation, manager access/ingest/deletion denial, document persistence, source citations, history, feedback, audit and fixture cleanup all passed. This test permits an explicitly identified fallback and logs the generation mode; it does not assert provider availability.

`npm run test:provider` failed with HTTP 403: the existing OpenCode free tier restricts use to OpenCode. No provider was changed. Live model synthesis and translation remain blocked by this external provider response. The successful live answer above used `generation=fallback`.

Native dependencies missing from the handoff were added: `expo-system-ui` for system appearance and `expo-dev-client` for the existing development-build profile. Local builds use Java 17; Android Studio's bundled Java 25 failed the Worklets CMake configuration.

Release gates still open: signed distribution/release performance profiling, iOS device coverage, large-text and screen-reader coverage, comprehensive interrupted-network testing, full-motion review and remaining permission/sharing cases. A device screenshot or a debug APK does not establish release-level frame rate.

Standalone Android development APK: built successfully with Java 17 and installed as `com.docsetu.mobile` on the Vivo. Launched through `docsetu://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081` with ADB port forwarding. Output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk` (ignored build artifact). This is a debug-signed development build requiring Metro, not a distribution or performance-certified build.
