# el-zhady

«Ел жады: Қазақстан, 1939–1953» — Kazakh-language university history website.

**Public deployed baseline:** https://owen1night.github.io/el-zhady/ — Stage 3 main `f291792`.

**Current work:** competition lifecycle update on `codex/live-competition-lifecycle`, for a draft PR only. Nothing from this update has been merged, deployed or applied to hosted Supabase. The museum identity, public history routes, Google/private profiles, genuine anonymous guest joining and GitHub Pages hosting remain intact. Independent practice, the other four activities and narrative/media collections remain unfinished.

The draft adds distinct removal/blocking, final close/deletion with saved history, projector QR expansion, one to three quiz-only rounds with a frozen roster, explicit next-round/final-result controls, protected host/player result views, a staged tied podium and a private 20-question bank with ten-question persisted draws.

## Local development and production preview

Node.js 22+ and npm:

```bash
cd /workspace/el-zhady
npm ci
npm run check
npm test
npm run build
npm run dev -- --port 5173
```

Use your own clone path if different. Exact production-build preview command:

```bash
npm run preview -- --port 4173
```

Open `http://localhost:4173` on the machine running it. This is local QA, not a public cloud preview or deployment. Missing/unreachable Supabase keeps public history readable and shows finite service errors; it never substitutes mock production profiles/results.

`check` runs TypeScript and public editorial-structure checks. `test` runs existing client/config/OAuth-subpath/Stage 2/3 baseline suites plus the new migration/upgrade/privacy/lifecycle suite in fresh disposable databases. `build` rejects private question prompts/IDs/seed markers in browser JS. No lint script exists.

For actual PostgreSQL connections, use the disposable loopback service described in [COMPETITION_VERIFICATION.md](COMPETITION_VERIFICATION.md):

```bash
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:competition
LIVE_QUIZ_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/postgres npm run test:competition:browser
```

`test:live:browser` aliases the current runner. Chromium uses `/usr/bin/chromium`, optional `CHROMIUM_EXECUTABLE_PATH`, or a Playwright-installed browser. Three separate contexts execute real SQL/RLS through test-only Auth/REST fixtures; these do not establish hosted Supabase/Google/Realtime/Cron or physical-device success. CI uses PostgreSQL 17 and Node22. Test fixtures never enter the application bundle or real project.

## Backend status and new manual setup

The owner reports the original three migrations successfully applied manually and existing Cron verified. **Never edit or rerun those applied files or recreate Cron jobs.** Current status: [supabase/MIGRATION_STATUS.md](supabase/MIGRATION_STATUS.md).

The draft requires only **two new migrations**, neither applied remotely by this task. [COMPETITION_SETUP.md](COMPETITION_SETUP.md) gives exact SQL Editor steps, the precheck for zero running quizzes, coordinated maintenance/matching frontend requirements, read-only schema/privacy/Cron checks and a laptop/iPhone checklist. Do not apply production changes merely because the draft CI passes; the API/result contract changes require a separately approved coordinated release.

Existing [SUPABASE_SETUP.md](SUPABASE_SETUP.md) and [STAGE3_SETUP.md](STAGE3_SETUP.md) are historical setup references. Keep `el_zhady_private` outside exposed schemas. Existing owner admin grants/Auth/CAPTCHA/OAuth settings remain; grant future admins only via guarded owner SQL using permanent Auth UIDs, never display names/metadata.

Copy `.env.example` to ignored `.env.local` for local authenticated work. Only public values belong in frontend/build configuration:

- `VITE_PUBLIC_SITE_URL`: `https://owen1night.github.io/el-zhady/`, never localhost.
- `VITE_SUPABASE_URL`: actual project HTTPS URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: public publishable or legacy anon key.
- `VITE_TURNSTILE_SITE_KEY`: public site key when CAPTCHA is enabled.

No service-role key, OAuth/CAPTCHA secret, database/admin password belongs in browser code, build variables or Git. Secrets remain managed by Supabase. This update needs no new variable, provider, backend host or visitor payment.

## Later release (not authorised by this draft task)

1. Review the PR/new SQL; follow COMPETITION_SETUP.md during a coordinated release window or on a disposable test project. Record actual application status. Do not run a blanket CLI `db push` against un-reconciled manual migration history.
2. Keep GitHub **Settings → Pages → Build and deployment → Source → GitHub Actions** and the four public Actions variables above. No private credential is needed for the static build.
3. Only after separate approval, merge to `main`. The existing `.github/workflows/pages.yml` deploys on main push/manual dispatch; PR CI does not deploy or migrate.
4. Monitor both jobs AND the public HTTPS health step, which checks the published commit marker and all25 built files against SHA-256. Then test actual Google/guest/QR/game/lifecycle/privacy/device flows. A static deployment check is not live-game acceptance.

Vite relative `base: './'`, bundled Kazakh fonts and hash routes preserve `/el-zhady/` refresh/navigation without server rewrites. OAuth returns to `/el-zhady/?code=…` and restores a safe hash destination. QR uses the configured real public URL. No alternate hosting provider is introduced.

## Documentation and boundaries

- [PROJECT_SPEC.md](PROJECT_SPEC.md), [REQUIREMENTS.md](REQUIREMENTS.md), [CONTENT_GUIDE.md](CONTENT_GUIDE.md): architecture, accurate completion states and content rules.
- [COMPETITION_CONTENT.md](COMPETITION_CONTENT.md): new bank claims and actually opened sources; [LIVE_QUIZ_CONTENT.md](LIVE_QUIZ_CONTENT.md): retained Stage 3 claims.
- [COMPETITION_SETUP.md](COMPETITION_SETUP.md), [COMPETITION_VERIFICATION.md](COMPETITION_VERIFICATION.md), [SECURITY.md](SECURITY.md): exact manual setup, real test limits and result/privacy/deletion decisions.
- `src/data/`: public editorial plans/types; `src/auth/`, `backend/`, `features/`, `live/`: actual integration/UI. `supabase/migrations/`: versioned SQL; `supabase/tests/` and `scripts/testing/`: dev-only fixtures.

Registered history and named guest archives use internal identity snapshots, never name matches. Deleting a closed room preserves completed earned history, profiles, Auth and practice; unfinished cancelled rounds do not become completed rankings. Quiz-only totals sum correct counts/speed on the same scale, separate from practice /100. Mixed games remain unavailable until normalization/weight/speed/tie decisions are reviewed. Question draws may overlap other rounds; private API projections do not make public seed SQL cheat-proof.

The owner reports physical iPhone full-quiz/late-join/final-refresh success. Mid-question Safari answer recovery and host-tab-closed continued play remain physical checks. Preferences/reset remain cosmetic; server persistence never depends on unload. Motion supports reduced motion and no automatic audio.
