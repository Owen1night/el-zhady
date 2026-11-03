# Competition update verification

2026-11-03. Branch `codex/live-competition-lifecycle`, based on deployed main `f291792`. **Draft PR only: no hosted SQL, merge or deployment.** Existing migrations remain byte-identical. Local fixture Auth/REST is not hosted Supabase identity verification.

## Actual local evidence

- Type/content checks and production build passed. Public narrative collections remain empty. Bundle guard checks the original and new seed markers/UUID prefixes plus all twenty private prompts.
- Existing client/Stage 2/Stage 3 SQL suites and the new competition suite pass in default isolated PGlite databases. Stage 3 regression suites intentionally retain their historical schema baseline; the new suite applies the additional migrations and also tests upgrading populated Stage 3 data.
- Real PostgreSQL 17 on disposable loopback port55433: remove versus block; explicit rejoin/retry identity; another room/identical name unaffected; late joins and unlock blocked through transitions; fixed roster; concurrent target-specific starts/reveal/delete; ten distinct stable sampled questions and varying fresh draws; source-private reads; host-only reports; raw legacy/live result-table denial before AND after reveal; publication membership excludes result tables; no early own history; ties including two at rank3; shared quiz-scale totals; guest upgrade/name isolation; final closure; physical deletion with registered/guest archives, legacy history, Auth and practice retained; old creation request cannot resurrect deleted room. Populated Stage 3 upgrade preserves already-earned results/ranks and prior bans.
- PostgreSQL smoke: two actual quiz rounds → between-round waiting → awaiting reveal → shared podium → close/delete → history preserved. No real project was contacted. Early test assertions were corrected to scope history to the tested room and wait for native-dialog unmount. The prepare-another-room browser check was moved before intentionally closing the host tab, since sessionStorage is tab-local; that disabled-field flow was not a product bug. A redundant refetch of the deleted room was removed from the delete handler.
- Browser integration runner `npm run test:competition:browser` uses three Chromium contexts and actual isolated PostgreSQL with routed test-only Auth/REST and a controlled server clock. The browser runner passed remove/manual rejoin/block, full first quiz + second-round transition/final wait, saved-answer refresh after a lost acknowledgement, no-host progression, player table absence, host final publication, shared third→second→first with tied third and fewer places, settled refresh/reduced motion, full-viewport QR X/Escape desktop/mobile, live/reconnected/refreshed close, delete with saved history, preserved admin new-room flow, and 360px overflow checks. Screenshots for QR, question, own result and tied podium were visually inspected in ignored `work/competition-browser/`. Hosted WebSocket Realtime and actual Cron execution are not simulated as verified services; visible-page polling and owner tick calls exercise recovery/state logic.

## Test boundaries and outstanding device checks

Owner-reported **physical iPhone Stage 3**: full quiz completion, rejected late join, final results preserved through two refreshes. Do not expand that into claims of mid-question accepted-answer recovery or host-tab-closed continued play. Those two checks remain on the physical-device checklist, alongside the new lifecycle/QR/reveal cases in COMPETITION_SETUP.md.

No assistant-run physical iPhone/Android, hosted Auth/Google/CAPTCHA/PostgREST/Realtime/Cron test, classroom load test or live deployment is claimed. Public SQL seeds remain reviewable, not cheat-proof. Mixed game scoring is deliberately unresolved and unavailable; quiz-only aggregation is specified and checked. No independent practice scores are populated.

## Reproduce

```bash
npm ci
npm run check
npm test
npm run build
# Create an isolated PostgreSQL 17 service on loopback only:
docker run --rm -d --name el-zhady-competition-test \
  -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55433:5432 postgres:17-alpine
docker exec el-zhady-competition-test pg_isready -U postgres
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:competition
# Install a local Chromium if /usr/bin/chromium is absent:
npx playwright install chromium
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:competition:browser
docker stop el-zhady-competition-test
```

The harness rejects non-loopback/other-port/other-database connection URLs and creates/drops a randomly named temporary database. Trust auth is strictly for that disposable service. `test:live:browser` now aliases the current competition runner; the original Stage 3 browser source remains a historical reference. Fixtures and owner test clocks never enter the application bundle. No SQL from test bootstrap/fixtures should ever be pasted into the real project.
