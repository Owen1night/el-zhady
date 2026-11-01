# Stage 2 security model

Frontend: static GitHub Pages; only public Supabase project URL/key and optional CAPTCHA site key. OAuth uses Supabase-managed Google secrets and PKCE, returning to `/el-zhady/`. No service-role key, OAuth secret, database password or admin password is used by browser code. A user's Auth session token is sensitive and is stored by Supabase Auth in this browser for normal refresh recovery; treat the site as any authenticated web application and keep untrusted HTML/scripts out. React escapes display names; no raw HTML rendering is used.

## Data boundaries

- `public.profiles`: permanent account's own row only; no email/admin column. Writes through `save_profile`, always `auth.uid()`.
- `public.practice_results`: permanent account's own rows only; 5 activity IDs, each capped at 20. Browser has no write grants. Not yet populated by real gameplay.
- `public.rooms`, `public.room_participants`, `public.competition_results`: only permitted room members and authorised admins can read. Result owners with registered membership may also read their own historical result. These tables contain safe lobby fields, never Auth UUIDs/emails. Display-name snapshots preserve guest results independently of future account names.
- `el_zhady_private.memberships`: Auth UUID → participant UUID, room, guest/registered kind, removal flag. Never exposed or published. Unique room/Auth UID prevents duplicate joins. Same-name people have distinct participant IDs and visible suffixes. Identity kind is a join-time snapshot; upgrading an Auth user never retroactively turns a guest result into permanent history.
- `el_zhady_private.admins`: provisioned only through trusted SQL by the project owner. RLS/default deny plus revoked grants prevent student/guest changes. Authority depends on this table AND permanent identity; metadata is never an authority source.
- `el_zhady_private.room_requests` / `join_limits`: idempotency and per-identity quotas; browser cannot mutate them.
- `el_zhady_private.answer_keys`: reserved for future trusted scoring, empty now, no browser access. No public answer-key table or score-write RPC exists.

Every app table has RLS. Exposed tables grant only SELECT to `authenticated` with restrictive policies; `anon` has no access. Supabase anonymous users use the `authenticated` role, so policies/functions additionally check `auth.users.is_anonymous`. Role name alone never grants registered-user rights. Helpers use security-definer access to avoid recursive RLS on memberships; every privileged function pins an empty search path and qualifies object names. Only required RPC/helper execution is granted. There is no arbitrary SQL/external command RPC.

Supabase's Auth service is the trusted identity issuer. Tests substitute its UID boundary in an isolated PostgreSQL engine; that is not a live Auth/JWT verification test. Do not expose the test bootstrap or private schema on hosted Supabase.

## Mutations and scoring

Joining checks rate, name/code, room status, removal, lock and capacity, under per-user advisory and per-room row locks. Existing active membership can reconnect to a locked/full room; closed rooms reject join attempts. `get_lobby` still lets permitted existing members read a closed room's status/results. Removal revokes future member reads and retry access without deleting stored results. A user already saw prior room data; revocation cannot erase their memory/screenshots.

Failed join errors return typed JSON after updating the quota, so a rollback cannot erase the failed-attempt count. Creating rooms requires an admin, a UUID request ID scoped to that admin, a valid title and an hourly quota. Client persists the request ID/payload before the request; timeout/reload retries reuse it. Lock/unlock/remove/close set state idempotently. Refreshing a lobby fetches existing membership; it never creates a new identity or membership.

Scoring is deliberately absent. Only trusted server/service-role context can write capped result rows; RLS/grants deny even a registered student direct score inserts/updates. A later scorer must validate submitted answers server-side, load private keys and write authoritative results. Do not implement client-provided scores or publish correct-answer keys. Admins manage rooms, not private student profiles/practice records. Service-role capability must remain outside this repository/frontend.

## Realtime and reliability

Only the safe lobby tables are published. Postgres Changes reads are subject to Supabase authentication and table RLS. Realtime causes a fresh authorised `get_lobby` fetch; the UI does not trust the event as the authoritative room snapshot. The client polls every 15 seconds while visible, refreshes on online/focus and sends a throttled heartbeat every 25 seconds. Recent activity is labelled as activity, not guaranteed online presence. Removed users may miss the removal event after losing RLS access; the next fetch/poll detects denial and clears the lobby. WebSocket/auth refresh/reconnect still needs hosted acceptance testing.

Network/Auth operations have 12-second bounds and readable retry/error states. Public content does not depend on a working backend. Supabase Auth is the only persistence for identities; PostgreSQL is the only persistence for profiles/rooms/results. Existing local preferences, the OAuth destination and admin request tokens are not substitutes for backend data. No local mock backend is used. PGlite is a dev-only SQL test dependency, not browser persistence.

## Deployment and abuse limits

See SUPABASE_SETUP.md. Before public guest usage, configure Auth's anonymous/IP quotas and CAPTCHA on both Supabase and the frontend. Database quotas limit each UID and cannot prevent unlimited identities, coordinated distributed abuse or offensive but syntactically valid display names; hosts can remove participants and lock rooms. No false claim of comprehensive anti-abuse protection is made.

GitHub Pages remains static; only its approved main-branch workflow deploys. The owner has now explicitly authorised Stage 2 merge/deployment after review and passing checks. PR CI and Pages validate all four public build variables without printing their values. No migration is run by the release workflow; the owner reports the initial migration already applied manually. RLS, provider setup, CAPTCHA, two-session Realtime and physical mobile tests remain acceptance gates before opening Stage 2 publicly.
