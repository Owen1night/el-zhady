# Mixed challenges — DRAFT, not applied remotely

Review the PR/code/scoring first. Production remains PR #4. All five earlier migrations were already applied manually. **Do not rerun them or change/recreate Cron. Do not run a blanket `db push`.** This draft task does not authorise hosted SQL, merging or deployment. Tests use fresh isolated databases only.

PR #5 (menus/identities/readings) is independently releasable with no SQL. The mixed frontend builds on it. For a later separately approved mixed release, coordinate maintenance with the matching frontend: old UI cannot play map/order tasks or expose the new host control. Finish/close every running or between-round competition through the host UI first. Use a disposable Supabase project for hosted acceptance before the real project when possible. Never point the isolated test harness at hosted Supabase.

## Read-only precheck for a future authorised setup window

Supabase Dashboard → existing **el-zhady** project → SQL Editor → New query, trusted owner role:

```sql
select count(*) as running_quizzes
from public.live_quiz_sessions where status='running';
select count(*) as active_competitions
from public.live_competitions where status in ('running','between_rounds');
```

Both counts must be **0**. Otherwise finish/cancel through the host controls and stop setup. The engine migration independently refuses an active competition.

## Only the two new files, once each, after review/approval

1. Full `supabase/migrations/20261103000300_mixed_live_engine.sql`, including begin/commit, in a fresh owner SQL Editor query. Expected successful completion, normally no rows returned. Stop on any error.
2. Only after success, full `supabase/migrations/20261103000400_mixed_bank_v3.sql` once. Expected success. It creates a new version with 50 tasks; it does not edit the old seed files or existing earned results.
3. Record the actual owner/operator result in `supabase/MIGRATION_STATUS.md`; isolated tests do not establish hosted application. Reconcile manual migration history before any future CLI migration workflow.

Installation adds columns/private reservations and replaces selected functions. It does not delete rooms, participants or earned results. The `configure_competition` function still contains its existing later-use deletion of extra **unstarted configured rounds**; installation merely defines that function. Runtime room deletion also clears reservation rows through FK cascades. No new Cron job/setting, frontend key, OAuth provider, Edge Function or backend host is needed. Keep the private schema unexposed.

## Read-only postchecks

```sql
select to_regprocedure('public.end_live_question(uuid,uuid,uuid)') as early_timeout_rpc;
select relrowsecurity from pg_class
where oid='el_zhady_private.room_question_draws'::regclass;
select has_function_privilege('anon','public.end_live_question(uuid,uuid,uuid)','execute') as anon_role_can_execute;
select game_kind,count(*) as tasks,count(distinct content_key) as distinct_tasks
from el_zhady_private.live_quiz_questions
where set_version='kz-1939-1953-mixed-v3'
group by game_kind order by game_kind;
```

Expected existing RPC signature, RLS true, unauthenticated `anon` role execute false, and map **10/10**, quiz **30/30**, timeline **10/10**. Supabase anonymous **signed-in identities** use `authenticated`; they may reach the RPC but fail its server `is_admin()` check. A function privilege is not admin authorisation.

Run the result-policy and Realtime checks from COMPETITION_SETUP.md: raw result tables stay admin-only, and neither results nor private tables appear in publication. Inspect the same two existing Cron jobs and five recent scheduler successes/readiness using that guide; **do not reschedule anything**. The tick entrypoint and one-second schedule are unchanged.

After separately approved frontend release, verify actual public commit/assets, then host on laptop and guest on physical iPhone via the room QR. Check quiz → map → timeline, alternate marker/list/keyboard controls, accepted-answer refresh in every game, no host-tab dependency, early finish while one person answered/another did not, duplicate/stale button retries, full next timers, manual waits and final reveal/privacy. Test reduced motion. Local Chromium fixtures are not this hosted acceptance.
