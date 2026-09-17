# DocSetu mobile design contract

Locked 17 September 2026 after visual review of three generated references in `design/mockups/`: Documents → Reader → Ask. This extends the root DocSetu design contract for native touch interaction. It is the mandatory reference for every mobile screen.

## Intent

A document desk in your pocket. Find, understand, verify, act. Prefer content and familiar controls over explanations. Minimal interface text must never remove labels, evidence, errors, or document content.

## Reviewed references

- `design/mockups/documents.png`: approved hierarchy, ruled rows, search, compact filters, reachable Add document action.
- `design/mockups/reader.png`: approved overview/sections/source separation, generous reading surface, fixed contextual Ask action.
- `design/mockups/ask.png`: approved question/answer/evidence hierarchy and bottom composer. Correct the generated logo drift by using the existing DocSetu folded-page glyph everywhere. Use the same system-safe frame in implementation; rendered device shells are not UI assets.
- The images contain labelled sample records, not live records. Do not copy sample claims into production responses.

## Revision: a recognizable document workspace

The revised board was generated and inspected before implementation. Keep the native sans-serif type family; the generated serif headings are not part of the contract. A compact forest briefing on Documents connects directly to Ask and Saved, with the actual saved count. Hide it during search/filtering so retrieval takes priority. Folded document covers are format cues, not invented source previews. Reader has a cover/title lockup, paper summary with a margin rule, numbered key points and a persistent Ask action. Ask uses a short forest introduction, clearly labelled scope, three question starters and an evidence tray beneath answers. Do not copy generated sample counts, dates, excerpts, or claims of accuracy.

Hero uses forest #294F43 / #203E32 in light/dark with ivory foreground and muted sage supporting text. It is a single purposeful content region, never a repeated card wrapper. Keep the search and first document visible on a standard phone. Default to concise labels; source text remains complete and selectable. Shared controls and account/action surfaces inherit the same spacing and themes.

## Tokens

| Role           | Light   | Dark    |
| -------------- | ------- | ------- |
| Canvas         | #F6F5F0 | #151C18 |
| Surface        | #FFFEFA | #1E2822 |
| Muted surface  | #EEEEE6 | #29352D |
| Ink            | #252C28 | #F2F3EB |
| Secondary      | #687168 | #ADB9AE |
| Accent         | #294F43 | #ACCEB7 |
| On accent      | #FFFEFA | #183426 |
| Accent surface | #E5EBE1 | #293E32 |
| Rule           | #D7DBD1 | #3A493E |
| Danger         | #B13C30 | #FFB4A7 |
| Warning        | #91621A | #E7C580 |

Use system fonts for native Dynamic Type and platform familiarity. Titles 32/38 semibold, reader titles 28/34, section titles 20/26, body 16/25, metadata 13/19, compact labels 12/16. No essential text below 12. Spacing: 4/8/12/16/20/24/32/40. Side padding 24, reduced to 20 on narrow devices. Radii: 8 for small controls, 16 for inputs/callouts/buttons, 24 for modal surfaces. All rounded native views use continuous corners. Flat lists with single rules, never card stacks inside card stacks.

## Navigation and screen recipes

- Four peer tabs: Documents, Ask, Actions, Workspace. Persistent labels, one active accent. Tab taps do not slide.
- Documents is the default landing: title, search, type filters, recent/saved switch, virtualized paginated rows, reachable Add document. Search/filter empty states offer Clear filters. Pull to refresh and explicit pagination retry.
- Reader pushes above tabs, with native Back. Overview, Sections, Source switch locally. Source is verbatim extracted text; summaries and translations remain labelled projections. Exact citation links open the cited node, not an arbitrary section. Share uses the system share sheet. Deletion requires a named confirmation and server success.
- Ask has document-specific and global contexts, separated history, concise starter questions, a keyboard-aware composer, visible pending/error states, preserved failed drafts, source links under replies. Do not invent source excerpts or pretend heuristic fallback is AI synthesis.
- Add document is a modal: choose File / Camera / Paste, preview source, set title/team/type/language, submit, then open the persisted record. No fake progress percentages. Preserve the draft on failure; protect dismiss/back when dirty or submitting. Only request camera permission at capture time.
- Actions uses a readable ruled list with source links and local completion markers. Label the device-only persistence scope. Never imply shared approvals, push reminders or server workflow completion.
- Workspace groups account, theme, access and admin tools in familiar setting rows. People/audit are admin-only, with server authorization remaining authoritative. Forms keep labels visible and password fields private.
- Sign-in is a guarded route. Restoring a session holds splash; successful sign-in replaces login. No sign-up flow is invented for an admin-provisioned product.

## Interaction and states

Touch targets >=48 logical pixels (minimum 44 for native bar controls). Use native stack gestures, native modals and system pickers. Press feedback on press-in; selection/success haptics only when the action warrants it. No continual animations, animated list entrances or decorative effects. Honor Reduce Motion, system theme and font scaling. Long titles wrap; no horizontal page overflow. Safe areas come from the device. Input focus and keyboard must not cover submit/composer actions.

Each network surface has loading, empty, error with retry, pending and success states. Never replace a failed live request with demo data. Requests are bounded, queries are cancelable, mutations never retry automatically, double submits are blocked. Session expiry removes private cached data. Saved IDs and action markers are account-scoped and device-local; document contents are not persisted offline. Offline tells the user what happened without inventing successful uploads.

## Implementation and verification

Expo Router, React Native, TypeScript, TanStack Query, Zustand, FlashList, SecureStore, native pickers and haptics. `src/ui.tsx` and `src/theme.ts` are the shared executable visual system. Extend them instead of introducing per-screen colors.

Check rendered screens against references at 390×844 and 360×800, light/dark, long content, failed/empty responses, navigation/back, forms, reader→citation and sign-out. Browser verification of React Native Web establishes layout and API behavior only. Native camera/picker, secure storage, keyboard movement, edge swipe/hardware back, Dynamic Type and release frame rate require iOS/Android hardware or a simulator and must be reported separately.

## Design sources

- [Appllama app design skill](https://github.com/Appllama/appllama-skills/blob/main/skills/appllama-app-design-skill/SKILL.md): native navigation, semantic themes, purposeful motion, complete state cycles. Skill read; paid MCP reference library was not connected.
- [Taste mobile image skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/imagegen-frontend-mobile/SKILL.md): screen-first mock-ups, consistent palette, readable type and review before lock.
- [Google Drive upload interaction](https://support.google.com/drive/answer/2424368?hl=en&co=GENIE.Platform%3DAndroid): explicit Add → source picker, adapted to the existing ingestion contract.
- Built-in image generation produced the three references. Prompt direction: warm paper/forest single accent; Documents→Reader→Ask; no gradients, fabricated counts, tiny text or nested cards. Full visual requirements above are authoritative where generated pixels differ.

### Android device corrections

The shared `Screen` uses Android keyboard height avoidance. Sign-in and Workspace keep their top safe-area padding outside the scroll content so text cannot scroll over the status bar. Preserve these behaviors when adding forms. Native builds include `expo-system-ui` for automatic system appearance.
