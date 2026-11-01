# el-zhady

«Ел жады: Қазақстан, 1939–1953» — Kazakh-language university history website. Existing Stage 2 site: **https://owen1night.github.io/el-zhady/**.

**Stage 3 is a review branch, not merged/deployed.** It adds one complete ten-question live quiz: server timing/scoring, registered + anonymous participation, host screen, reveals/leaderboards/podium, reconnect, cancellation and persisted competition history. Other four activities, independent practice and narrative historical/media collections remain unfinished and labelled. Live points do not populate practice /100. The owner reports Stage 2 login/profile/admin/join/physical-iPhone QR/lock flows working; Stage 3 hosted acceptance is still pending.

## Local development / preview

Node.js 22+ and npm:

```bash
cd /workspace/el-zhady
npm ci
npm run check
npm test
npm run build
npm run dev -- --port 5173
```

Use your own clone path instead of `/workspace/el-zhady` if different. Exact production-build preview command:

```bash
npm run preview -- --port 4173
```

Open `http://localhost:4173` **on that machine**. This is local preview, not a cloud-forwarded/public URL. Missing Supabase config keeps all historical sections readable and shows an honest service notice for account/room features. No local mock profiles/results are substituted.

`check` runs types + public editorial structure checks. `test` runs client/OAuth/config rules and fresh isolated SQL/RLS/RPC tests (PGlite by default). `build` also checks the browser bundle excludes the ten private prompts, seed IDs and marker. No lint script exists. For real multi-connection PostgreSQL and three-context Chromium tests, see [STAGE3_VERIFICATION.md](STAGE3_VERIFICATION.md). CI uses an isolated PostgreSQL 17 service for the live SQL races, Node 22 and the existing four public build variables.

## Backend configuration

Stage 2 setup is documented in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). The initial migration was manually applied **once**, as reported by the owner. **Do not rerun or edit it.** Stage 3 needs only its two new migrations plus Supabase Cron; exact one-time SQL Editor steps, verification queries and a laptop/iPhone acceptance checklist are in [STAGE3_SETUP.md](STAGE3_SETUP.md). No hosted access was available to apply/verify these changes. Pages never applies migrations.

Copy `.env.example` to ignored `.env.local` for local authenticated development; use only public values:

- `VITE_PUBLIC_SITE_URL`: actual HTTPS public root `https://owen1night.github.io/el-zhady/`, never localhost.
- `VITE_SUPABASE_URL`: your project's HTTPS URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: public publishable or legacy anon key, never secret/service-role.
- `VITE_TURNSTILE_SITE_KEY`: public CAPTCHA site key if enabled in Supabase.

Google/CAPTCHA secrets stay in Supabase. No OAuth secret, database password or admin/service-role key belongs in browser code or build variables. Existing permanent admin grants remain valid. See SUPABASE_SETUP.md for secure owner SQL designation; do not grant by name or metadata.

## Later deployment — not authorised by this Stage 3 task

1. Review this PR and the new SQL. Follow STAGE3_SETUP.md for the two new migrations and successful one-second Cron job; retain Stage 2 Auth/CAPTCHA/redirect configuration. Record manual application status.
2. Keep GitHub **Settings → Pages → Build and deployment → Source → GitHub Actions**. Keep the four public values in **Settings → Secrets and variables → Actions → Variables**.
3. Run checks, complete hosted acceptance, and obtain separate release approval. Only then merge to `main`; the existing `.github/workflows/pages.yml` deploys on main push/manual dispatch. This task does neither.
4. Wait for build **and** deployment success. Check the actual HTTPS page/assets, refreshed hash navigation, Google callback `/el-zhady/?code=…`, QR guest entry, multiplayer and saved history on actual devices. A local build is not deployment evidence.

Vite `base: './'`, bundled Kazakh fonts and hash routes preserve `/el-zhady/` hosting without refreshed-route 404s. QR uses the configured public URL. No new hosting provider or visitor payment/account requirement for history/guest competition is introduced.

## Structure

- [PROJECT_SPEC.md](PROJECT_SPEC.md): architecture, routes and timing/scoring decisions.
- [REQUIREMENTS.md](REQUIREMENTS.md): assessment and Stage 2/3 completion status.
- [CONTENT_GUIDE.md](CONTENT_GUIDE.md) / [LIVE_QUIZ_CONTENT.md](LIVE_QUIZ_CONTENT.md): source rules and actually opened question references.
- [SECURITY.md](SECURITY.md): identity, RLS, private keys, disclosure and race boundaries.
- [STAGE3_SETUP.md](STAGE3_SETUP.md) / [STAGE3_VERIFICATION.md](STAGE3_VERIFICATION.md): manual setup and actual test limits.
- `src/data/`: public editorial types/plans; `src/auth/`, `backend/`, `features/`: Stage 2 flows; `src/live/`: live quiz UI/typed projections only.
- `supabase/migrations/`: versioned production SQL; `supabase/manual/`: owner Cron setup; `supabase/tests/`, `scripts/testing/`: isolated dev-only tests.

Browser storage preserves display preferences and Auth sessions, not authoritative scores. Reset clears only preferences. PostgreSQL stores competition answers/results immediately; guest recovery depends on retaining that browser's Auth session. The header monitor control enlarges presentation text. Motion respects reduced motion and never delays answer submission; no automatic audio.
