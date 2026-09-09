# DocSetu design language

This is the design contract for additions to DocSetu. Read it before designing a route, component, interaction, or public page. Extend the existing product; do not invent a new visual identity for each feature. This document describes the implemented interface, not an alternative redesign proposal.

## 1. Thesis and taste

**A working document desk.** Source material has priority. Questions, evidence, and follow-up work stay close to the document they concern.

Use warm paper, dark ink, muted forest green, ruled lists, and clear reading surfaces. The product should feel like a serious records workspace: calm, precise, legible, and useful. Most of the screen is canvas and content; color and borders establish meaning. Dense metadata belongs below the primary task, not above it.

- Prefer a ledger, a reading pane, or a simple form to a collection of cards.
- Use asymmetry when content roles differ: a broad document area and a narrower context column.
- Use whitespace to separate tasks; do not insert empty sections to make a page look impressive.
- Show actual documents, statuses, dates, sources, and actions. Label samples explicitly.
- Make one task visually primary in each local context. A shell-wide Add document action may coexist with the page's action.
- Keep descriptions short. Show the actual state rather than a decorative illustration of activity.

The selected Taste discipline contributes hierarchy, typographic restraint, contrast, and resistance to generic templates. Its cinematic motion, testimonials, stock imagery, and random layout prescriptions do **not** apply here. The user's factual, restrained product brief takes priority. Future agents must not rerandomize the established design or combine competing aesthetic skills.

## 2. Canonical sources and reuse

| Concern | Existing implementation |
| --- | --- |
| Colors, type, layout, controls, responsive rules | `styles/globals.css` |
| Self-hosted fonts and skip link | `app/layout.tsx`, `public/fonts/` |
| Wordmark and document glyph | `components/brand/DocSetuBrand.tsx` |
| Authenticated top navigation and account menu | `components/shell/WorkspaceShell.tsx` |
| Focus-managed native dialog | `components/workspace/Modal.tsx` |
| Shared full-page and dialog conversation | `components/workspace/Conversation.tsx` |
| Search and question entry | `components/shell/Omnibox.tsx` |
| Upload/paste flow | `components/documents/DocumentIngestModal.tsx` |
| Markdown content | `components/markdown/MarkdownRenderer.tsx`, `.doc-content` |
| Data contracts and adapters | `services/`, `adapters/`, `types/` |

Reuse these components and semantic CSS classes before adding alternatives. Do not recreate the removed `components/UI` or legacy dashboard system. New workspace pages belong in `app/(workspace)/`; the group layout supplies the shell. `/dashboard/*` URLs are compatibility redirects.

When a new need cannot use an existing pattern, extend the shared pattern with a narrow variant. Do not change a global selector solely to fix one page. If the shared contract changes, update this document and inspect affected existing pages.

## 3. Color tokens

Use `var(--token)` in shared CSS or the matching Tailwind semantic utility. Do not copy hex values into each feature. All main surfaces use the light color scheme.

| Token | Value | Purpose |
| --- | --- | --- |
| `--canvas` / `--background` | `#f6f5f0` | Page background, quiet composer surface |
| `--surface` | `#fffefa` | Reading paper, forms, dialogs, header |
| `--surface-muted` | `#eeeee6` | Hover fills, quiet secondary areas |
| `--text-primary` / `--foreground` | `#252c28` | Headings and source content |
| `--text-secondary` | `#515a52` | Supporting prose |
| `--text-tertiary` | `#687168` | Metadata, helper text, placeholders |
| `--border-color` | `#d7dbd1` | Default rules and control borders |
| `--border-subtle` | `#e6e8df` | Low-emphasis separation |
| `--border-strong` | `#a9b3a6` | Focus-adjacent controls and overlays |
| `--accent` | `#294f43` | Primary action, active navigation, links |
| `--accent-hover` | `#1e3d33` | Primary action hover |
| `--accent-subtle` | `#e5ebe1` | Search callout and contextual emphasis |
| `--success` | `#356244` | Verified successful state |
| `--warning` | `#91621a` | Review or deadline attention |
| `--danger` | `#b13c30` | Errors and destructive meaning |

Tailwind examples: `bg-canvas`, `bg-surface`, `text-text-primary`, `text-text-secondary`, `border-border-default`, `text-accent`. The CSS mapping is in `@theme inline`.

Existing special treatments are constrained: the landing exhibit uses `#e9ede3`, the highlighted source passage uses `#e8edcf`, and destructive buttons use darker `#a7372b` / hover `#85291f` for contrast. Reuse those treatments in their original contexts; do not turn them into a new feature palette. Status must have text or an icon as well as color. Never use warning color merely to make a list more interesting.

## 4. Typography

Use self-hosted **Geist Sans** for the interface and **Geist Mono** for compact indices, page references, and dates where useful. Font variables are `--font-geist-sans` and `--font-geist-mono`, mapped to `--font-sans` and `--font-mono`. The font license is `public/fonts/OFL.txt`. Do not introduce remote font requests or a second display family.

| Role | Existing scale |
| --- | --- |
| Base UI | 14px, line-height 1.6 |
| Workspace page title | 34px, weight 500, line-height 1.2; 28px on mobile |
| Section title | 18px, weight 550, tracking around -0.025em |
| Record title | 15–18px, weight 550, clear multiline wrapping |
| Source prose | 15px, line-height 1.8 |
| Conversation prose | 14px |
| Button and text link | 13px, weight 550 |
| Supporting copy | 12–14px |
| Metadata | 10–12px; never essential instructions at tiny sizes |
| Eyebrow | 11px, weight 600, tracking 0.09em, uppercase |
| Public hero | `clamp(42px, 5.8vw, 82px)`, weight 500, line-height 1.06 |

Use sentence case. Headings use balanced wrapping; paragraphs use pretty wrapping. Negative tracking is restrained and concentrated in headings. Metadata may use tabular numerals. Avoid uppercase paragraphs, large bold marketing slogans inside the workspace, or one-word lines caused by narrow containers.

Long document titles must wrap without moving actions off-screen. Summary snippets may be clamped in collections; the reader must retain full source text. Keep a separating space when a desktop `<br />` is hidden on mobile so words do not join.

## 5. Geometry and spacing

Use a small spacing rhythm: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48px. Existing layouts also have optical values such as 34px heading separation and 52px column gaps; reuse the existing class instead of normalizing the entire stylesheet.

- Workspace content: max-width 1328px; desktop padding 42px vertically and 4% horizontally.
- Header/navigation: max-width 1440px. Header top row is 76px high; navigation has an active 2px underline.
- Public pages: max-width 1600px with 5.5% horizontal padding; public form max-width 900px.
- Page heading: title/description at left, primary page action at right; 24px gap and 34px bottom margin.
- Home: flexible primary column and 300px follow-up column, 52px gap; narrower desktop uses 260px context and 30px gap.
- Standard section/list rows: roughly 20–28px vertical padding and a single 1px bottom rule.
- Inputs: 44px high, 10px 12px padding. Standard buttons: minimum 40px high.
- Controls: 4px radius. Dialogs: 6px radius. Reading surfaces and ledger sections remain square.

Do not wrap every section in a border and then wrap its children in more borders. A reading surface can have one outer rule; a collection usually needs row rules only. Shadows belong to overlays and the small illustrative landing document. Ordinary records stay flat.

## 6. Page recipes

### Workspace page

Use `.desk-page` as the direct page wrapper under the existing shell. Use `.page-heading` with an optional meaningful `.eyebrow`, one `h1`, a short description, and the page action. Follow with filters, content, and local status feedback. Do not add another navigation shell.

```tsx
<div className="desk-page">
  <header className="page-heading">
    <div>
      <p className="eyebrow">Workspace records</p>
      <h1>Review queue</h1>
      <p>Documents waiting for a recorded review.</p>
    </div>
    <button className="button button-primary" onClick={openReviewDialog}>
      Start review
    </button>
  </header>
  <ReviewList reviews={reviews} />
</div>
```

This is a composition example, not permission to invent review data or a new API. Implement the real handler, service, and all states for an actual feature.

### Collection or directory

Use the collection/search toolbar, labeled filters, result count, and ruled records. Primary record names are links. Secondary actions are buttons with distinct labels. Keep metadata below the primary text. List/grid selection is a real view control, not decoration. Persist filters and pagination in URL state where useful. Deletion opens confirmation and handles access errors.

Use existing collections as the reference: `/documents` for source records, `/people` for people, `/audit` for chronological activity. On small screens, table-like columns become stacked labeled fields.

### Reader and evidence

Follow `/documents/[id]`: breadcrumb, identity and metadata, controls, view tabs, then a broad reading surface with secondary context. The source is authoritative. Overview, Sections, Actions, Source, Activity, and split view must preserve their meanings. A summary is not the original source. Keep document ID and section references in links, questions, and URL state. Never invent events or deadlines when a field is absent; use a factual empty value.

### Conversation

Use `Conversation` for both `/intelligence` and `AiSidePanel`. Messages are typographic blocks separated by rules, not colorful speech bubbles. Keep source references next to the answer, with document title and pages. The composer stays easy to find. Preserve the question on failure; avoid double submissions; show progress only while a request is pending. Document questions must carry `docId`. Global and document histories must remain separate.

### Forms and dialogs

Use `Modal` rather than implementing a visual overlay from a `div`. Standard width is 520px; wide is 740px; both are bounded by viewport minus 32px. Maximum height is viewport minus 40px, with contained scrolling. Header/body padding is 24px. Keep field labels visible. Group related fields in `.form-columns` only when they fit; long public forms become a single column on mobile.

Use `.button`, `.button-primary`, `.button-danger`, `.icon-button`, and `.text-link` according to purpose. Destructive confirmation names the affected record and provides a safe cancel action. Ingestion uses source → details → actual processing → success; no fabricated percentages or timers. Closing a dirty ingestion draft prompts before discard.

### Public page

Use a concise wide introduction, a labeled illustrative document, a short explanation of actual workflows, and workspace access. Do not add testimonials, customer logos, fabricated metrics, stock-office imagery, or a repetitive feature-card grid. The slight paper rotation on the current landing page is a local illustrative device, not a motif for every feature.

## 7. Responsive behavior

The principal breakpoints are **1100px** and **760px**. Verify at 1440×1000 and 390×844, with an intermediate width when a layout changes.

At 1100px, reduce context-column width and optional workspace identity. At 760px, use the existing mobile disclosure navigation, a 68px header row, 5% workspace side padding, and single-column content. Header account access remains available. Labels beside compact shell actions may hide, but accessible names must remain.

Page-heading controls stack below the title. Reader content stacks in reading order. Document/action tab strips may scroll within their own region; the page must not overflow. Narrow directories hide column headers and expose local field labels. Conversation guidance can hide while messages, references, and the composer remain usable. Do not hide functionality simply to make a screenshot fit.

Use `minmax(0, 1fr)` and `min-width: 0` in flexible layouts, `overflow-wrap: anywhere` for arbitrary source content, and contained overflow for source tables/code. Check long filenames, email addresses, translated text, and many tabs. Preserve zoom and natural vertical scrolling.

## 8. Accessibility and interaction

- Use links for navigation and buttons for actions. Preserve modifier-click navigation.
- Every field has a visible label; every icon-only control has an accessible name. Decorative icons are hidden from assistive technology.
- Use the existing 2px accent focus outline with 4px offset. Composite controls use `:focus-within`; never remove focus without a replacement.
- Preserve the skip link and a unique `main-content` target. Use one page `h1` and a logical heading hierarchy.
- Native dialogs must contain focus, support Escape when safe, and restore focus to the trigger. Busy dialogs must communicate why closing is disabled.
- Use correct input types, names, autocomplete, and native validation. Errors explain how to recover and appear near the relevant task.
- Announce asynchronous success/loading with status semantics and errors with alert semantics. Do not rely on color alone.
- New controls should offer at least a 40px hit target, preferably 44px for touch; match existing compact metadata controls only when necessary.
- Maintain readable contrast. Never lower an active control's contrast to make it look subtle.

Motion uses roughly 160ms color/background/border/opacity transitions and a restrained 1px pressed state. Do not use `transition: all`, scroll hijacking, parallax, perpetual ambient animation, or cinematic page entrances. Honor `prefers-reduced-motion`. A loading indicator represents an actual request, not invented progress.

## 9. Copy, data, and states

Product copy is concise, factual, and written for the person doing the work. Prefer “Add document,” “Read source,” “Try again,” and “No documents to show.” Avoid “revolutionize,” “unlock,” “next-generation,” “AI-powered,” and “seamless.” Do not place framework names, provider names, prompts, environment variables, or implementation notes in the product interface. Original uploaded document text is not interface copy and must not be rewritten to remove its technical terms.

Every addition needs loading, empty, error/retry, disabled/pending, and success states where applicable. Empty and failed are different states. Persisted data must determine success. Await clipboard/network operations before reporting success. Display truthful dates with locale-aware formatting. Confirm irreversible removal and protect unsaved form work.

Preserve current limits explicitly: action status is browser-local, the access matrix is a read-only reference, and existing services can return labeled sample data. Never present those samples as live customer activity. Do not claim server persistence, notifications, permissions, or metrics that the underlying contract does not provide.

## 10. AI workflow contract for future features

This is implementation guidance, not text to display to end users.

The active provider wrapper is `lib/ai/opencodeZen.ts`. It requests model `muse-spark-1.2-contributor-free` at `https://opencode.ai/zen/v1/responses`, using an `x-opencode-session` UUID, with no API-key or Authorization header. Preserve this key-free configuration unless the user explicitly changes it. Do not substitute a paid/key-required provider because legacy dependencies or comments mention another service.

The existing funnel is: authenticated ingestion → normalize and chunk → enrich and persist → authorized lexical retrieval → grounded answer with citations → history/actions/translation → optional feedback-triggered reprocessing. The `/api/search/vector` path is a legacy name; it currently uses lexical relevance, not vector embeddings. Feedback reprocessing rereads source; it does not apply a submitted correction to the source text.

Ingestion, reprocessing, and chat have existing source-based fallbacks. A 200/201 response alone does not prove the model answered. Validate the provider directly and distinguish model synthesis from fallback behavior in engineering reports. Translation errors must not be relabeled as completed translation. Never render prompts, provider diagnostics, or synthetic benchmark data as product content.

## 11. Adding a feature: agent checklist

1. Identify the nearest existing route recipe and the real API contract. Read this document and the relevant shared component.
2. Define the primary action, source of truth, role requirements, and all asynchronous states before styling.
3. Reuse tokens, font variables, controls, and page composition. Add only the smallest necessary shared variant.
4. Connect real data, preserve source references, and make state linkable where appropriate. Check stale requests and double submission.
5. Review keyboard focus, labels, contrast, long content, scrolling, and 1440px/390px behavior in a running browser.
6. Run the relevant tests, typecheck, lint, and production build for code changes. For AI changes, also run `npm run test:provider` and `npm run test:pipeline` against the intended local environment; they make live requests and the funnel test deletes its own fixture.
7. Compare rendered results with `docs/redesign/screenshots/` and the current adjacent pages. Explain any intentional variation.
8. Update this design contract if the shared language changes. Record what was actually verified and any remaining limits. Follow the user's source-control and deployment instructions; do not merge or promote production without authorization.

Reject the change if it introduces nested card scaffolding, another font/palette, decorative pills, invented counts, vague headings, gratuitous gradients/glass, sidebar duplication, hidden mobile actions, uncited document claims, or success messages without successful operations.

## 12. Visual references

- [Collection desktop](docs/redesign/screenshots/documents-desktop.png)
- [Collection mobile](docs/redesign/screenshots/documents-mobile.png)
- [Reader desktop](docs/redesign/screenshots/reader-desktop.png)
- [Reader mobile](docs/redesign/screenshots/reader-mobile.png)
- [Ingestion dialog](docs/redesign/screenshots/ingestion-dialog.png)

These are examples of hierarchy and composition, not pixel templates to force onto unrelated content. The shared stylesheet and components are the executable source of truth; this document explains how to extend them consistently.
