# Stage 2 setup and acceptance record

The public Stage 2 site is `https://owen1night.github.io/el-zhady/`. Stage 2 was merged/deployed before the current Stage 3 task. Stage 3 remains a review branch; do not merge/deploy it. Its two new migrations and Cron instructions are in STAGE3_SETUP.md. These Stage 2 reference steps must not trigger a repeat of completed setup.

## Current reported setup — do not repeat the migration

On 2026-11-01 the owner reported that the initial migration was applied successfully **once through Supabase SQL Editor**, the exact site/redirect URL above is configured, anonymous and Google Auth are enabled, Google is in Testing with the owner's account added, Turnstile is enabled, and all four public GitHub Actions variables are saved. Google/CAPTCHA secrets remain only in Supabase. The owner subsequently reported permanent login/profile persistence, admin room creation, registered joining, physical-iPhone anonymous QR joining and locked-room rejection working. The existing admin grant is therefore owner-reported working; do not create a duplicate grant.

This is the owner's setup report, not an independently inspected database/provider configuration. See `supabase/MIGRATION_STATUS.md`. **Do not rerun the initial migration.** Its repository SQL remains unchanged. CLI migration-history reconciliation is still necessary before any future `db push`; the current release workflow never applies database migrations. The setup sections below are reference instructions for a fresh project, not a request to repeat completed setup.

The release preflight in both PR CI and Pages validates all four public variable values without printing them. Successful preflight establishes build configuration presence/shape, not Google consent, CAPTCHA, RLS or Realtime functionality. The owner-reported Stage 2 acceptance above is distinct from independently verified Stage 3 hosted gameplay, which is still pending. Never provide private credentials to the assistant.

## 1. Create/select the backend project

1. In the Supabase dashboard, create a dedicated project for this site, choosing your organisation, region and a strong database password. A free plan is sufficient for initial testing, subject to its usage limits. Keep the database password in your password manager; it must never enter frontend code, GitHub variables or this repository.
2. Record the actual **project reference**, **Project URL** and **publishable key** from the project's Connect/API settings. The modern key begins `sb_publishable_`. A legacy `anon` JWT is also supported. Never supply `sb_secret_`, `service_role`, a database password or a Google client secret to this app.
3. The Data API's exposed schemas must **not** include `el_zhady_private`. The default `public` / `graphql_public` setup may remain; all app tables in `public` have RLS and explicit grants. The private schema contains identities, admin grants, request limits and future answer keys.
4. If reusing an existing project, inspect it for schema/table collisions first. The migration intentionally fails on collisions instead of changing unrelated tables. Do not drop existing data to force it through.

## 2. Versioned migration — already applied manually for this project

**Current project: already applied manually, per the owner. Do not execute it again.** The commands in this section are for a fresh project only. Review `supabase/migrations/20261101000100_stage2_foundation.sql`. It creates the app tables, RLS, grants, security-definer RPCs and Realtime publication entries. It does not create sample rooms, scores, admin passwords or answer keys.

Preferred tracked deployment from the repository root, with the Supabase CLI installed or available through npx:

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_ACTUAL_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`init` creates the CLI configuration if it does not exist; do not overwrite an existing configuration. Replace only the project-ref placeholder. Authenticate interactively and enter the database password when prompted; never put credentials in command arguments or commit them. CLI tokens/passwords stay outside source control. If the CLI generates local state, keep `.temp/` ignored. Commit legitimate non-secret config changes separately after review.

Alternative: paste the **entire reviewed migration**, including `begin` / `commit`, into the project's SQL Editor and run it once as the project database owner. Record that operation. If later switching to CLI deployment, reconcile the migration history using the CLI's migration repair workflow **before** `db push`; do not execute this initial migration twice or mark unexecuted migrations applied. The PGlite test bootstrap is test-only and must NEVER run on hosted Supabase.

In Database / Publications, verify `supabase_realtime` includes only the app's safe tables `rooms`, `room_participants`, `competition_results` (alongside any unrelated pre-existing tables). The migration adds these when that publication exists. If absent, enable them through Supabase Realtime's publication controls. Do not publish `profiles`, `practice_results` or anything in `el_zhady_private`.

## 3. Configure Supabase Auth

In **Authentication → URL Configuration**:

- **Site URL:** `https://owen1night.github.io/el-zhady/`
- **Redirect URLs:** add the exact same URL, including `/el-zhady/` and trailing slash.
- Do not substitute the domain root or a callback path that GitHub Pages cannot serve. The app uses PKCE and returns to the existing index as `?code=...`; its hash navigation restores the intended section.
- Avoid broad production redirect wildcards. For development OAuth, use an explicitly allowed HTTPS staging URL and matching `VITE_PUBLIC_SITE_URL`; a local verifier stored on a different origin cannot complete the production callback. Unit tests do not require an external OAuth provider.

In **Authentication → Sign In / Providers**:

1. Enable **Anonymous Sign-Ins**. These supply genuine Supabase guest identities. Joining must work without Google or email.
2. Configure **Google**, as described below.
3. Disable email/password sign-ups for this stage. There is no email/password form. Do not enable an unconfigured email delivery flow. Future verified email/password support needs a separate reviewed change and delivery setup.
4. Leave manual identity linking disabled unless you explicitly review a later linking feature. This app never calls `linkIdentity` or attaches guest results by display name. Even if an Auth identity is explicitly upgraded outside the app, a membership recorded as `guest` is excluded from permanent-account history.

## 4. Configure Google OAuth (server-side secrets only)

1. In Google Cloud Console, select/create the intended project and configure **Google Auth Platform / OAuth consent screen** (branding, support contact, audience). If the app is in Testing, add the actual test accounts. For wider use, complete Google's publishing/verification requirements as applicable.
2. In **Clients / Credentials**, create an **OAuth client ID → Web application**.
3. Add the exact **Supabase provider callback URL shown in Supabase's Google provider panel** as an authorised redirect URI. It normally has the form `https://YOUR_ACTUAL_PROJECT_REF.supabase.co/auth/v1/callback`. Copy the real value from the dashboard, especially with a custom Auth domain. This is the Google-to-Supabase callback; the GitHub Pages URL is the separate Supabase-to-site redirect.
4. Copy the Google client ID and client secret into **Supabase Authentication → Providers → Google**, enable it, and save. These values are not frontend variables; the client secret must never be in GitHub Actions variables, `.env.local`, JS, SQL migrations or Git history.
5. After the reviewed Stage 2 build is deployed later, test sign-in from a phone-compatible redirect flow and a fresh desktop session. First login asks for a display name; later login loads the same private profile. Cancel login and verify guest joining remains available. Test a complete redirect starting and ending on the same allowed origin.

## 5. Abuse controls before opening guest rooms publicly

The backend enforces 10 join attempts/minute/identity, room capacity 50, random eight-character room codes, membership uniqueness, removed-member rejection and at most 5 new rooms/hour/admin. These controls are not a defence against someone creating unlimited new anonymous identities.

In Supabase Auth, keep/enforce anonymous sign-up and auth endpoint rate limits (including per-IP limits). Enable **CAPTCHA protection**, choose Turnstile (or adapt the UI for another provider), create a free Turnstile widget with your actual GitHub Pages/staging hostname, and put its **secret key only into Supabase's CAPTCHA settings**. Put only the matching **site key** into `VITE_TURNSTILE_SITE_KEY`. When set, the app requires a fresh CAPTCHA token before creating a new guest identity. Existing signed-in or guest sessions are reused. If CAPTCHA is enabled remotely but the frontend site key is missing, guest creation will fail honestly instead of bypassing CAPTCHA.

Do not enable CAPTCHA on one side only. External Turnstile loading and Supabase's verification must be tested. More advanced IP quotas/moderation can be added later behind protected backend logic; current database quotas are per identity and cannot guarantee resistance to coordinated abuse. Supabase plan limits and anonymous-user retention should be monitored. Deleting an anonymous Auth user can remove its membership recovery, while saved public result snapshots remain.

## 6. Public build configuration

For local non-secret configuration, copy `.env.example` to ignored `.env.local` and set:

```dotenv
VITE_PUBLIC_SITE_URL=https://owen1night.github.io/el-zhady/
VITE_SUPABASE_URL=https://YOUR_ACTUAL_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ACTUAL_PUBLIC_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY=YOUR_ACTUAL_PUBLIC_SITE_KEY_IF_ENABLED
```

These placeholders are documentation, not configured credentials. Never paste a secret/service-role key even temporarily: every `VITE_` variable can enter public JS. The client refuses secret-prefixed keys and legacy JWTs whose role is not `anon`, but you must still keep secrets out of the build environment entirely.

For a later reviewed deployment: GitHub repository **Settings → Secrets and variables → Actions → Variables**, create `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional `VITE_TURNSTILE_SITE_KEY`, and `VITE_PUBLIC_SITE_URL` with the actual values. The Pages workflow reads these public variables. Adding variables does not deploy the branch. The owner has now approved this release after review and passing checks; PR CI and Pages both validate the same four public values before building. A blank backend configuration keeps public sections working and displays an honest unavailable state for accounts/lobbies.

## 7. Securely designate your account as admin

First sign in using your permanent Google account after provider configuration and the later approved build. In **Supabase → Authentication → Users**, identify your own verified account and copy its exact **User UID**. Do not grant rights by display name, and do not use an anonymous UID.

In the **Supabase SQL Editor**, as the database owner, replace the single UUID placeholder below:

```sql
do $$
declare v_user uuid := 'REPLACE_WITH_YOUR_ACTUAL_USER_UUID';
begin
  if not exists(select 1 from auth.users where id = v_user and is_anonymous is false) then
    raise exception 'A permanent authenticated account is required';
  end if;
  insert into el_zhady_private.admins(user_id) values (v_user)
    on conflict (user_id) do nothing;
end $$;
```

Return to the app and refresh/retry the session check, then open `#/admin`. `my_access()` checks the private grant every time; user-editable metadata is ignored. No admin password, frontend secret, special display name or browser checkbox grants authority. To revoke, execute `delete from el_zhady_private.admins where user_id = 'ACTUAL_UUID';` through the same trusted SQL channel. Existing browser UI may remain until refresh, but every privileged request checks the current grant and is denied immediately after revocation.

## 8. Hosted acceptance checks still required

After setup and a separately approved deployment/staging build:

- Run the migration once; review Security Advisor and RLS/grants. Confirm private schema is not exposed.
- Create a Google profile, sign out/in and reuse it. Verify private profile/practice reads under a second permanent account.
- Grant only your own permanent UID admin through SQL; verify a student and an anonymous user cannot self-grant, create/control rooms, write scores or access answer keys.
- In one browser session, create a room in advance. Check its actual published join URL and QR. In a separate incognito/browser session, join as a guest without Google/email. Join as a registered user in another session.
- Refresh the guest lobby; retry joining; verify exactly one participant per room/identity. Join with duplicate display names and verify distinct suffixes.
- Observe Realtime joins, last-activity updates, lock/unlock, removal and close. Disable the WebSocket and confirm 15-second polling/retry; test normal refresh/reconnect. A removed participant must lose further room reads.
- Confirm private profile/history and room payloads contain no other user's email. Guest scores remain name snapshots and never attach to an account by name; scoring is not yet implemented, so production results should remain empty.
- Test unreachable service, denied Google consent and expired auth; public sections and guest entry remain reachable, no endless spinners.
- Test physical iPhone Safari and Android Chrome. Current browser emulation and isolated SQL tests do not establish device or hosted integration success.
