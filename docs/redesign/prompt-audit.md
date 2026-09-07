# Original brief and conversation commitments audit

Rechecked 8 September 2026. This compares the user's original request and the assistant's user-facing commitments with the evidence produced, rather than treating a changed-file list as proof of completion. Later instructions select local testing with the working administrator account; the manager preset is not a gate for this audit.

## Requirement comparison

| Original requirement / commitment | Result and evidence |
| --- | --- |
| Start from clean `redesign/docsetu-light` at `9637aab`; work on a new branch | Initial branch/clean-tree check recorded before creating `redesign/docsetu-new-ui`. Work and commits remain on that branch. |
| Never modify/merge/force-push main or deploy production | No main mutation, merge, or production promotion was performed. PR #19 remains a draft. |
| Use gpt-taste and redesign-existing-projects; install only missing skills | Both selected; only missing gpt-taste and Web Interface Guidelines added. Existing CLI/browser capabilities reused. No taste tools added as runtime dependencies. |
| One original coherent design, not a reskin | Document-desk thesis established before implementation; new top navigation, ledger collections, reading surfaces, shared dialogs/conversation, typography and palette. Cinematic/template prescriptions explicitly subordinated to the factual, restrained brief. |
| Audit routes, API contracts, and states before rebuilding | Behavioral inventory recorded before implementation, then exercised with real local/preview flows and isolated browser checks. |
| Landing, login/demo, home, documents and every reader tab | Captured and checked. Reader Overview, Sections, Actions, Source, Activity and split view exercised, including URL/back behavior and original source text. Administrator demo works. |
| Ingestion, translation, intelligence/document chat, actions | Live ingestion, cited question, Hindi translation, source retention, action extraction and local action persistence checked. The new stricter funnel also checks history and actual reprocessing. |
| People, access, audit and route navigation | Desktop/mobile captures and navigation checks; people form contract tested without creating a permanent user. Role redirects tested with isolated sessions. Access remains a read-only reference. |
| Loading, empty, error, disabled, success, accessible controls | 13 browser tests cover the main interaction states, long titles/mobile overflow, dialog Escape/focus restoration, failure handling, confirmations and pending controls. This is representative coverage, not an exhaustive assertion about every possible input/error combination. |
| Preserve stable backend/key-free provider | Active ingestion/chat/translation/reprocessing imports point to OpenCode Zen. Direct live test verifies the exact free model request and no API-key/Authorization header. |
| Factual end-user copy; no invented metrics, activity or internal configuration | Interface copy and sample labels reviewed. Uploaded source prose may contain technical terms or claims; it is preserved as source material. Existing fallback and read-only limits are documented. |
| Reusable design system; no duplicate dead UI system | Shared CSS/components used. Unreachable dashboard/UI implementations removed after checking their compatibility redirects. Root `design.md` now supplies the detailed extension contract and is referenced by AGENTS.md. |
| Local lint/type/tests/build before pushing | Initial runs passed with six existing lint warnings. This audit reruns local types/lint/browser/provider/funnel checks and builds before committing. |
| Exact latest preview status/logs and 1440px/390px QA | The implementation commit `7cc8a39535189bbd4eb603da8c9db0408be541fd` matched Ready deployment `dpl_Ho7538e31exkGWun56Enx5g1Lh39`. Twelve routes at both sizes were captured with no recorded browser errors, failed requests, font failures or page overflow. A mobile spacing defect was fixed and the new exact preview rechecked. Later instructions switch this audit's functional testing to localhost. |
| Logical commits, push, draft PR, evidence report | UI, tests and preview corrections committed and pushed; draft PR #19 contains status and screenshots. `docs/redesign/verification.md` and the local review report contain earlier evidence. |

## Corrections to earlier reporting

1. **Test exit behavior was overstated.** The earlier pipeline script only made ingestion failures fatal. It could accept an empty chat or merely accepted feedback and still exit zero. The rewritten script fails on every required assertion, validates source/citation/deadline/reprocessing, and cleans up its fixture. Deliberate chat failure and `reprocessed: false` tests both now exit nonzero and clean up.
2. **“Vector search” was imprecise.** That is a legacy endpoint name. Current retrieval is authorized lexical relevance, not vector embeddings. Provider integration does not make the retrieval layer semantic vector search.
3. **HTTP success was insufficient proof of model execution.** Ingestion/reprocessing and chat retain source-based fallbacks. The separate live provider test now observes the outbound model and headers and validates the response. The funnel test rejects the current chat-summary fallback. Reprocessing success proves regenerated source chunks, not guaranteed model enrichment.
4. **A design thesis was not a full extension specification.** The earlier `docs/redesign/design.md` was an inventory and rationale. Root `design.md` now documents the actual tokens, measurements, components, recipes, responsive behavior, accessibility, motion, copy, prohibitions and future-agent acceptance rules.
5. **The manager credential was not an administrator-workflow blocker.** Per the user's correction, local testing uses the functioning administrator demo. The old manager preset still has invalid credentials; it was not silently reset or claimed to work.

## Remaining limits, not new completed features

- Binary Word extraction and image OCR are existing backend limitations. Their full extraction quality was not established by the HTML/text ingestion tests. Do not describe every advertised file format as verified.
- Feedback-triggered reprocessing rereads the source. A correction message is recorded but does not automatically edit source content or become an instruction to rewrite it.
- The ingestion and chat fallback paths mean an available document/answer can outlive a provider outage. A successful UI state alone is not evidence of current provider availability.
- Action progress is browser-local. The permissions matrix is a reference, not an editor. Existing data services can supply labeled samples.
- The access-request form was tested with intercepted submission; no real request email was sent without user authorization.
- Six pre-existing lint warnings and existing dependency deprecations remain. They are not introduced errors, but the project is not warning-free.

## Reproducible local checks

Start the app locally with its existing environment and working administrator demo, then run:

```sh
npm run typecheck
npm run lint
npm run test:ui
npm run test:provider
TEST_REPORT_PATH=/tmp/docsetu-funnel-audit.json npm run test:pipeline
```

The provider test makes a real OpenCode request. The funnel test uses localhost by default, creates a labeled temporary fixture, and deletes it in cleanup. It covers ingestion → source/chunk persistence → retrieval → cited answer → history → Hindi translation → actions → feedback reprocessing → cleanup. It does not send email or reset credentials. Stop the running Next server before `npm run build` to avoid concurrent `.next` writes.

## This audit's observed results

- Direct provider check: exact `muse-spark-1.3-contributor-free` request, correct response, no API-key or Authorization header.
- Local typecheck and 13 browser tests passed. Lint reported zero errors and six existing warnings.
- All nine functional funnel assertions passed, including reprocessing and fixture cleanup. Server logs confirmed model-enriched initial ingestion; the cited chat was not the summary fallback.
- **Degraded stage:** feedback reprocessing exhausted its model retries (one HTTP 500, then timeouts) and regenerated source chunks using its existing heuristic fallback. Therefore this run proves functional reprocessing, but must not be described as successful AI enrichment at every stage. Provider availability is intermittent.
- Negative harness checks: a chat failure and a response with `reprocessed: false` each produced a failing exit code and still deleted the fixture.

A targeted follow-up using the same manager-enrichment prompt returned structured nodes successfully through Muse Spark. This confirms the configured structured-generation path works, while preserving the record of the failed reprocessing attempt. The final local production build passed. No application/provider configuration changed in this audit; additions are documentation and stronger test scripts.
