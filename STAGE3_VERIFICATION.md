> Release update, 2026-11-03: owner-reported hosted application of both new migrations and successful Cron verification is recorded in `supabase/MIGRATION_STATUS.md`. The owner has now authorised PR #3 release after green checks. The historical local test record below is unchanged; hosted gameplay/physical devices remain untested by the assistant. Pages now verifies the public HTTPS release marker and every built file against SHA-256 on the deployment runner; its actual run result is reported at release completion.

# Stage 3 verification record

Date: 2026-11-01. Branch: `codex/stage-3-live-quiz`, based on remote main `b30452e`. Stage 2 migration's SHA-256 remains `55eae585c14a9708ff556a26d51c752ec456aa550f3e4930f397903bb8588ba9`. No hosted migration was executed; no merge or deployment was performed.

## Actually performed locally

- Type/content checks: `npm run check` passed. Public historical entity collections remain empty; the separate sourced live quiz does not silently increase assessment counters.
- `npm test` passed: existing client/config/OAuth-subpath/Stage 2 security suites plus the new live SQL suite, using fresh isolated PGlite databases by default.
- Real PostgreSQL 17 (`postgres:17-alpine`) on **loopback port 55433**, separate connection transactions: `LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:live`. New migrations and content loaded into a new disposable database alongside the unchanged Stage 2 migration. No production/project DB was contacted.
- New SQL cases: RLS/private-table denial even to browser admins; metadata cannot grant admin; outsider reads; anonymous identity; configured scheduler/no-roster start rejection; exact scheduler-job predicate using a catalog-shape fixture; simultaneous starts; frozen host-excluding roster and question snapshot; current-only questions/stable shuffled options; no early key/explanation/source/score leak; no early admin review; invalid/future question/option rejection; deadline equality; duplicate/conflicting first submissions and accepted retries; wrong/unanswered scores; server speed formula; forged scores/direct writes denied; refresh recovery; removed-user reads/submits denied, including a blocked-read/concurrent-removal race; immutable completion; simultaneous finalization and repeated ticks; correct-count-first and exact tied third; cancellation; separate registered/guest/legacy history; no guest-name/identity-upgrade linking; untouched practice.
- `npm run test:live:browser` with the same loopback URL: **three separate Chromium contexts**, desktop host 1920×1080 and registered/anonymous participants at 360×800 with touch emulation. The app's real Supabase SDK/React UI calls a test-only routed REST transport that executes the actual PostgreSQL RPCs under separate UID/role transactions. Auth identities are fixtures. The test clocks advance the real SQL schedule without waiting 203 wall-clock seconds. Owner-only tick calls stand in for Cron; no production clock input exists.
- Browser session: admin room creation/configuration/code/real-public-URL QR; full ten-question run; tap + keyboard submission; a response lost *after SQL commit* recovers the saved choice; participant refresh; leaving confirmation; host tab closed for two questions then restored; enlarged presentation viewport; timed reveals, final podium/table, admin report, separate persisted registered history; reduced-motion CSS; no horizontal overflow at all ten 360px questions and checked reveal/final/history and desktop final; confirmed cancellation without a podium; no browser page exceptions.
- Production build: `npm run build` passed with relative assets. Its bundle guard rejects the private seed marker, stable question IDs and all ten private prompts in JS assets. Field names needed for post-deadline reveals are permitted.
- Visual inspection: desktop and mobile full-page screenshots for countdown/question/reveal/final were captured in ignored `work/stage3-browser/`. The museum colours/type are retained. A missing screen-reader-only style discovered in inspection was fixed; phase changes bring the active quiz content into view. The first npm dependency-install attempt used an unwritable default cache; the install succeeded using `/tmp/el-zhady-npm-cache`. A browser assertion initially counted admin details before their asynchronous response; its wait was corrected. A focus assertion also initially checked `:focus-visible` immediately after touch input; the test now enters keyboard modality with Tab before checking keyboard focus. The complete browser suite then passed. Final verification commands/results are reflected in the PR.

## Boundaries — not claimed tested

- **No hosted Stage 3 Supabase integration**, migration execution, PostgREST schema cache, real JWT verification/Auth issuance, Google consent/redirect, CAPTCHA, hosted WebSocket Realtime or actual `pg_cron` execution. Local fixtures do not establish those services work. Scheduler predicate tests are not scheduler execution tests.
- No physical iPhone/Android testing by the assistant. Chromium touch emulation is not Safari/WebKit nor a physical device. The owner reports Stage 2 physical-iPhone guest QR and other working flows; this does not prove Stage 3 gameplay on devices.
- No new public deployment or preview. The existing public Stage 2 URL is preserved. No Stage 3 source is on main unless a later separate release is authorised.
- No load/security audit for large classes or distributed abuse. Room joining retains Stage 2 UID quotas, CAPTCHA integration, capacity, internal IDs and removal. Server receipt includes network/lock delay, so speed points are not a perfect measure of knowledge or reflexes.
- Public repository seed SQL can be read by determined participants. Private API projections/shuffling are not a guarantee against cheating; no claim otherwise is made.
- Narrative assessment content, media/map and all independent practice/four other games remain unfinished. Live competition raw points never fill practice /100 slots.

## Reproduce the independent-connection test

On a machine with Docker, Node 22+ and npm (use your normal local Docker command):

```bash
npm ci
docker run --rm -d --name el-zhady-stage3-test \
  -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55433:5432 postgres:17-alpine
# Wait for pg_isready; trust auth is only for this disposable loopback test service.
docker exec el-zhady-stage3-test pg_isready -U postgres
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:live
# Chromium: use /usr/bin/chromium if present, otherwise first:
npx playwright install chromium
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:live:browser
docker stop el-zhady-stage3-test
```

Optional `CHROMIUM_EXECUTABLE_PATH` selects your installed Chromium. The harness rejects non-loopback URLs, other ports/databases, creates/drops a randomly named disposable database and never accepts a hosted Supabase connection. Do not use trust authentication for any real database. Tests/fixture routing/clock helpers are dev-only and outside `src/`; there is no production mock persistence fallback.
