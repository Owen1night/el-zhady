# el-zhady

«Ел жады: Қазақстан, 1939–1953» — Kazakh-language university history website. The original repository heading is retained.

Existing public foundation: **https://owen1night.github.io/el-zhady/** (URL supplied by the owner). Stage 2 adds reviewable Supabase authentication, private profiles and live-room infrastructure. **Stage 2 is not merged or deployed.** Its backend has not been configured or tested against a hosted project. Public history pages stay available without accounts or a backend connection. Historical content, images/maps/videos, practice games and competition gameplay remain unfinished and labelled; there are no invented results.

## Local development and verification

Use Node.js 22+ (CI uses Node 22) and npm:

```bash
cd /workspace/el-zhady
npm ci
npm run check
npm test
npm run build
npm run dev -- --port 5173
```

On your own clone, replace the `cd` path. To inspect the production build locally:

```bash
cd /workspace/el-zhady && npm run preview -- --port 4173
```

Open `http://localhost:4173` on the machine running the server. This is local QA, not a cloud-forwarded link or a new public deployment. The existing Pages URL above is the public foundation.

`check` runs TypeScript and editorial structure checks. `npm test` runs client rules and isolated PostgreSQL migration/RLS/RPC tests using PGlite; `npm run test:db` prints the database suite directly. Test-only identities/results are never used by the application. There is no browser mock backend, no local profile/result fallback and no lint script. See VERIFICATION.md for actual evidence and limits.

## Stage 2 configuration — finish before hosted acceptance

Follow **SUPABASE_SETUP.md** for exact steps: create/select the actual project, apply the versioned migration, enable Google and anonymous Auth, set URL allowlists, configure CAPTCHA/rate limits, set the public build variables, and grant your own permanent User UID admin through trusted SQL. No project or Google setup is assumed to exist.

`.env.example` documents only public values. Copy to ignored `.env.local` for development and set actual values:

- `VITE_PUBLIC_SITE_URL`: actual HTTPS site root with repository subpath and trailing slash. Defaults to the owner-provided public URL above; never derived from localhost.
- `VITE_SUPABASE_URL`: actual HTTPS Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: actual public publishable key (or legacy `anon` key). **Never** use a secret/service-role key.
- `VITE_TURNSTILE_SITE_KEY`: optional public site key, required if Supabase CAPTCHA is enabled. The CAPTCHA secret belongs only in Supabase.

No Google client secret, database password, service-role key or admin password belongs in frontend environment files, GitHub build variables or Git. Missing/invalid configuration shows an honest service-unavailable state for account/lobby features; all public sections remain accessible. Configuration changes require a new build.

## GitHub Pages — preserve existing hosting

The repository is `Owen1night/el-zhady`, default branch `main`. Vite `base: './'` emits relative assets; hash navigation prevents refreshed-route 404s under `/el-zhady/`. OAuth uses the existing index at `/el-zhady/?code=...` and restores a whitelisted hash destination; no server callback route or rewrite is needed.

The existing `.github/workflows/pages.yml` deploys only on a push to `main` or explicit manual dispatch. Pull-request CI in `.github/workflows/checks.yml` installs, type/content checks, tests the database security contract and builds with Node 22. **Do not merge or manually dispatch Pages for this Stage 2 branch yet.** The PR is for review and setup first; no other hosting provider is introduced.

For a later explicitly approved release:

1. In GitHub **Settings → Pages → Build and deployment → Source**, retain **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, set the four public build variables above using the actual project. Never add privileged backend credentials. A variable change alone does not deploy the branch.
3. Run checks and hosted acceptance steps in SUPABASE_SETUP.md, review the PR, and merge only after release approval. The push to `main` triggers the existing deployment workflow. Do not force-push or overwrite unrelated changes.
4. Wait for successful build AND deployment jobs. Inspect the actual returned HTTPS URL, its JS/CSS/fonts, hash-route refresh, OAuth redirect, guest entry and live lobby updates. Test QR using a phone. A successful local build is not publication evidence.

## Files and product boundaries

- PROJECT_SPEC.md — architecture, routes and product decisions.
- REQUIREMENTS.md — historical assessment plus Stage 2 status, with hosted work pending.
- CONTENT_GUIDE.md — historical source/attribution rules; no public answer keys.
- SUPABASE_SETUP.md — exact external setup and secure admin designation.
- SECURITY.md — RLS, identity, privacy, RPC, scoring and abuse boundaries.
- VERIFICATION.md — checks actually run and unresolved integration/device tests.
- `supabase/migrations/` — reviewed versioned SQL; `supabase/tests/` — test-only PostgreSQL/Auth-boundary harness.
- `src/auth/`, `src/backend/`, `src/features/` — actual Supabase integration and account/lobby UI.
- `src/data/` — public historical schemas, empty collections and editorial plans.

Permanent accounts get an editable display name, five honest practice score slots (20 each, 100 total) and separate competition history. Guests join through real anonymous Auth, with no Google/email requirement or permanent profile. Result identity uses internal IDs, never a name match. Clearing browser data/changing devices can lose automatic guest recovery.

The header monitor control retains presentation mode. Existing local storage contains only display preferences/visited sections; those are not grades. Auth storage holds Supabase's session for refresh recovery. Temporary OAuth destination and admin idempotency IDs are client state, not a substitute for server persistence. Admin room creation/lock/unlock/remove/close are protected by database logic. No fake Start button, live gameplay, client scoring or sample production results have been added.
