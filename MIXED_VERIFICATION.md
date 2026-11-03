# Mixed draft verification and limits

Production baseline: `e60d7d4`, unchanged by this work. Draft first slice: PR #5 / `codex/learning-and-player-labels`; mixed branch: `codex/mixed-live-challenges` builds on it. Review/release the first slice independently; nothing here deploys automatically from a PR.

## Actually performed

- TypeScript, public reference validation, production build, old/new private-bank bundle guards, generated new-seed consistency and whitespace checks.
- All 54 original/new assertions in the full PostgreSQL 17 regression run passed before the final upgrade addition. The additional mixed tests then passed: copied bank IDs cannot defeat room uniqueness, shortage rolls back the entire draw, and a populated completed PR #4 room preserves exact earned results/private history through the new engine/bank migration. Final CI reports the current full total.
- PostgreSQL is a disposable loopback-only Docker service. Independent connections test duplicate start/end, answer-versus-timeout and existing room/privacy races. PGlite also ran the initial mixed suite, but its serialized connections alone are not concurrency evidence.
- Three Chromium contexts (host 1920px, guest and registered 360px touch) execute actual isolated SQL/RLS via test-only routed Auth/REST and a controlled server clock. A full quiz → map → keyboard timeline competition passed all 30 early timeouts plus stale-target retries, full next durations, accepted-answer refresh in every kind, manual starts/waits/reveal, private player tables, podium refresh and no overflow/page errors. Question/reveal screenshots were inspected. Public reading/menu/timeline/atlas checks run separately.
- Initial test failures were fixed: an SQL variable/table alias ambiguity; missing selected-answer null handling; a browser fixture read session timing before the async start committed. The latter was a test sequencing issue. No failed hosted action or hidden persistence fallback occurred.

## Reproduce

Node 22+:

```bash
npm ci
npm run check
npm run check:mixed-content
npm test
npm run build
```

`npm test` without a database URL uses fresh PGlite databases; to reproduce independent PostgreSQL races and browsers:

```bash
docker run --rm -d --name el-zhady-mixed-test \
  -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55433:5432 postgres:17-alpine
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm test
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:mixed:browser
npm run test:learning:browser
docker stop el-zhady-mixed-test
```

Use `/usr/bin/chromium`, `CHROMIUM_EXECUTABLE_PATH`, or install Playwright Chromium; the runner prefers the supplied executable/system browser. Isolated test databases are created/dropped, never the hosted project. Browser fixtures/tokens/clocks do not ship in `src`/`dist`.

## Not established

No new hosted migration/Realtime/Cron execution, Google OAuth, physical iPhone Safari/Android, latency calibration or production release is claimed. Polling recovery is exercised; actual hosted WebSocket delivery remains acceptance work. No public PR preview host exists. The PR CI uploads `playtest-preview-screenshots` (seven-day retention) for visual review without deploying. Local test QR links deliberately use the configured public URL; fixture room codes do not exist on production and cannot be used for phone acceptance. Use a reviewed disposable hosted project or a later authorised release for physical testing.

Narratives are sourced drafts awaiting academic/Kazakh review, not full assessment completion. The public seed SQL remains inspectable in GitHub; private RPC/RLS and bundle exclusions do not make public-repository answer authoring cheat-proof.
