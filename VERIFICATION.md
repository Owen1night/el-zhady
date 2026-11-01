# Verification — 2026-11-01

Earlier entries below are the historical Stage 1 record, not current setup instructions. The latest Stage 2 record at the end supersedes older deployment/configuration status. Current setup instructions are in SUPABASE_SETUP.md.

## Repository inspection and preservation

Inspected `/workspace` and the existing `/workspace/el-zhady` checkout before writing. The checkout contained its Git history/remote and only `README.md` with `# el-zhady`. Kept the repository, remote, branch and README heading. No existing application was overwritten. At the end of the initial stage, no commits had been pushed and no repository or hosting access settings had been changed. See the follow-up below for the subsequent branch push.

## Commands actually run

- Dependency installation completed with npm and produced `package-lock.json`. The first sandboxed attempt could not reach the proxy; installation succeeded with network-enabled execution.
- `npm run check` — passed TypeScript and editorial structure checks.
- `npm test` — passed. Also directly ran the test module with `node --import tsx src/lib/public-url.test.ts`; both named cases passed (public URL gating and nested unsourced-answer rejection).
- `npm run build` — passed; Vite emitted `dist/` with relative assets, bundled Kazakh-capable fonts and font-license copies.
- `git diff --check` — passed.
- Runtime used for these checks: Node 24.19.0, npm 11.9.0. README and CI target Node 22; Node 22 was not executed in this environment.

The initial `tsx` CLI invocation failed because its IPC socket was blocked (`EPERM`). Changed scripts to `node --import tsx`, avoiding that socket; final commands passed.

## Browser checks actually performed

Used installed Chromium through Playwright. Inspected full-page desktop (1440px), mobile (360px) and presentation (1920px) screenshots. Screenshots freeze finite entrance animations at their final state. These are browser-emulated viewports, not physical devices.

- All 11 routes rendered at 1440, 768, 390 and 360 CSS pixels with no horizontal page overflow.
- All 11 routes also checked at 360px in presentation mode, without horizontal overflow.
- One main heading per section; unknown hash route shows a working recovery link.
- Mobile menu opens, exposes all 11 sections, navigates on touch, closes with Escape and restores focus.
- Keyboard skip link focuses main content without changing the hash route.
- Tab wrapping keeps focus inside the navigation dialog; dialogs open/close and fit at 360px.
- All five activity **planning** dialogs open and close. These are not game tests and no playable game completion is claimed.
- Period buttons update pressed state and planning text.
- Presentation preference survives reload. Confirmed reset clears this app's previous visited list and presentation preference; the current Results visit is recorded again. Visits are labelled as navigation history, not grades.
- Blocked localStorage test shows the session-only fallback message without crashing.
- Unconfigured share dialog displays an honest notice; no QR, localhost public link or invented public URL appears.
- Reduced-motion emulation disables the cover animation and smooth scrolling.
- Served the actual production `dist/` from a plain static server under `/repository-name/`. Direct load and refresh of `/repository-name/#/timeline` worked. All 11 production sections worked at 360px; no failed asset requests or JavaScript page errors were observed.
- Visible shell buttons on the 11 production pages measured at least 44×44 CSS pixels.
- 1920px presentation screenshot checked; main descriptive text enlarges to 20px.

Browser testing found a missing accessible name on the collapsed menu and focus escaping at the end of a dialog tab sequence. Added an explicit menu label and dialog focus wrapping. Final browser runs passed with no page errors. A preliminary browser script also had an assertion typo; it was corrected before the final run.

## Limits and unfinished work

No physical iPhone/Safari or Android/Chrome test, WebKit run, screen-reader audit, HDMI hardware test or public-host check was performed. WebKit's binary was not installed. No QR scan against a real deployment URL has been tested. No historical links, images, map or videos can be checked yet because those collections are deliberately empty.

The first-stage shell is complete; historical research, ten real theses, thirty distinct facts, at least eleven heroes and additional postwar figures, three working videos, historical images/maps, five playable games, per-game results, combined score and actual game-progress persistence remain unfinished. Historical verification is **zero**. Runtime/schema checks do not verify history.

A GitHub CLI authentication check did not succeed in the default sandbox. No publication was attempted and no public URL is claimed. The Pages workflow is prepared but has not run on GitHub. The share/QR configuration remains blank until a real deployment is checked. Follow README.md to publish and then configure the actual URL.

## Delivery-folder limitation

The complete source and documentation remain in `/workspace/el-zhady`. Optional downloadable packaging could not be created: the designated `/codex/browser/projectless/0001-build-the-foundation-of-a-kazakh-language-univer/output` path does not exist in this managed environment and its `/codex` parent is read-only. A scoped filesystem-permission retry returned the same read-only error. No downloadable archive or output-folder link is claimed. This limitation does not affect source files, browser checks or the successful build.

## Follow-up: branch preservation and cloud preview

The previously uncommitted foundation was committed as `fee0b37` on new branch `codex/el-zhady-foundation` and pushed successfully to `origin`. No merge into `main` and no GitHub Pages deployment was performed. Follow-up documentation records the new branch rather than the original `work` branch.

Started the actual production preview with `npm run preview -- --port 4173 --strictPort`, bound to `0.0.0.0`. A real HTTP request inside the environment returned HTTP 200 with the built application HTML. The available cloud tools, document sessions and runtime helpers exposed no supported inbound Web preview forwarding operation; no connected document sessions were found. No public preview URL is claimed or marked checked. A generated cloud Web preview URL is still required to verify laptop access.


## Stage 2 — current review branch

Baseline inspected: latest remote main `3dbcde5` on 2026-11-01; all existing source and project/content/requirements/deployment documents read before changes. New branch `codex/stage-2-auth-lobbies`. The owner supplied the existing public foundation URL `https://owen1night.github.io/el-zhady/`. Stage 2 has not been merged, deployed or applied to a hosted backend. No Pages settings or existing production assets were changed by this work.

### Configuration inspection

Tool discovery found no Supabase integration. The current cloud status reported no configured secret bindings/runtime variables/outbound identities for Supabase. No Supabase/Google OAuth environment-variable names were present; the checkout had only `.env.example`, no configured `.env.local`, Supabase project or migration history. No credential values were printed or invented. New frontend config accepts public publishable keys or legacy anon keys and refuses secret/service-role keys. Google secrets remain a dashboard setup task.

### Commands and actual outcomes

- Dependency install/lockfile update succeeded: Supabase JS is an application dependency; PGlite is dev/test-only.
- `npm run check`: TypeScript and editorial structure checks pass. Historical collections are still empty and unverified.
- `npm test`: client and database test files pass. Direct runs of `node --import tsx src/lib/stage2.test.ts` and `npm run test:db` also print the named cases. The Stage 2 client suite has 7 cases; the SQL suite has a parent plus 13 subtests. Original 2 source/public-URL tests remain.
- `npm run build`: succeeds with relative assets and separate Supabase vendor chunk. A preliminary type error in a test result annotation was corrected. Preliminary dynamic-import/chunk-size warnings were resolved through static validation import and a vendor chunk.
- `git diff --check`: passes.
- Runtime: Node 24.19.0 locally; PR CI targets Node 22. CI outcome is reported in the final handoff; do not infer it from local success.

### Isolated PostgreSQL tests (real SQL engine, substituted Auth boundary)

Executed the entire versioned migration in PGlite PostgreSQL, not a mocked data store in the application. The test bootstrap creates test-only Auth UIDs/roles; it does not run Supabase Auth, verify real JWTs, expose PostgREST, publish Realtime or touch a hosted project. Test fixtures/results never enter production UI/build data.

Passed: RLS on every app table; unauthenticated RPC denial; profile creation/reuse and private visibility; metadata/admin self-escalation denial; denial of anonymous profile/practice/admin privileges even with an accidentally granted anonymous admin row; admin room-create retry idempotency; invalid code/name/nonexistent/locked/full/closed room rejection; duplicate join prevention; homonyms with distinct participant IDs/suffixes; outsider table/RPC denial; safe lobby payload without Auth IDs/emails; membership read recovery while joining is locked; only trusted server result writes; private practice reads; rejection of client table/score/answer-key writes; guest history not linked by names or later identity upgrade; removal revoking subsequent reads/rejoins; idempotent close/removal; persistent failed-attempt quota and hourly room quota preserving retry access.

These validate actual database constraints, grants, RLS and RPC behavior. True multi-connection concurrency/race behavior and hosted Auth/PostgREST/Realtime integration remain unverified; SQL locking/uniqueness was additionally reviewed in the migration.

### Browser checks actually performed

Installed Chromium through Playwright; desktop 1440px and mobile 360px emulation, with two isolated browser contexts. Served actual built assets under `/el-zhady/` on an internal QA server, not as a public preview. All 16 public/account routes rendered with one main heading, no horizontal overflow, no failed JS/CSS/font assets and no JavaScript page errors. Inspected full-page desktop and mobile join screenshots plus the retained museum home screenshot.

Checked public sections remain open with no backend config; join code prefills/restores on refresh; account/admin/private results are not fabricated; no email/password sign-up inputs exist; unconfigured Google/join actions are explicitly unavailable; touch menu links and Escape work; practice permanent-account requirement is visible; callback errors are removed from browser history under `/el-zhady/` and the join/public routes remain reachable.

A separate test-only build used the reserved `service.invalid` address and a dummy publishable-shaped key. Browser interception supplied ONLY network failures/hangs, never successful fake users/rooms/profiles/results. Checked OAuth cancellation/error leaves guest joining enabled, failed anonymous-Auth requests show Kazakh error/Retry, and a never-responding request exits loading after about 12 seconds (observed 12.25 s initially and 12.43 s in the final run). Public timeline/videos remained open independently. This tests error handling, not an external service. A portable AbortController deadline avoids relying on newer mobile Safari AbortSignal helpers.

Code review also corrected Retry buttons accidentally acting as form submits and ensured Escape cannot close an in-flight confirmation independently of its React state. Final browser rechecks passed; one submit and one Retry each emitted exactly one anonymous Auth request.

### Tests that could not run / remaining blockers

No real Supabase project URL/public key, Google provider configuration or hosted migration was available. Therefore: actual Google first/subsequent sign-in/sign-out, anonymous token persistence across real refreshes/devices, hosted profile UI CRUD, live admin/lobby controls, real QR scanning, true two-client Realtime/polling reconnection, live CAPTCHA verification, production RLS/PostgREST integration and a final hosted network privacy audit could not run. Two isolated browser contexts above were NOT a live multiplayer test. Physical iPhone Safari/Android Chrome, WebKit and HDMI hardware were not tested. Do not mark these integration/device requirements complete.

SUPABASE_SETUP.md gives exact project/migration/Auth/Google/URL/CAPTCHA/build-variable/admin steps and hosted acceptance cases. SECURITY.md records the authority and privacy model and per-identity abuse-control limits. No external services, admin grant or scoring service is claimed configured. No Stage 2 merge/deployment has been performed.
