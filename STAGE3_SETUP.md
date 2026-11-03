> Release update, 2026-11-03: the owner reports both new migrations successfully applied and Cron verified (two active jobs, five recent successful one-second quiz ticks, readiness true). **Do not repeat the migration or Cron setup below on this project.** PR #3 merge/deployment is now authorised after green checks. The original implementation-stage instructions below are retained for reference; current application status is in `supabase/MIGRATION_STATUS.md`. Real multi-device gameplay acceptance is still pending.

# Stage 3 — one-time backend setup and later release

Stage 3 is a review branch only. **Do not merge or deploy it yet.** The deployed Stage 2 site remains https://owen1night.github.io/el-zhady/. The owner reports Stage 2 Google/profile/admin/registered join and physical-iPhone guest QR/locked-room flows working. Those are owner-reported results, not new Stage 3 hosted verification.

No hosted database credentials/access were supplied. No hosted SQL, migration, Cron job, Auth setting or deployment was changed during Stage 3 implementation. Never send private credentials to the assistant or put them in GitHub build variables.

## 1. Apply only the two new migrations, once each

Do this on the existing Supabase project as its trusted owner when preparing hosted acceptance. Review the SQL/PR first. A database backup/restore point according to your normal project process is sensible before schema changes.

1. Open **Supabase Dashboard → your existing project → SQL Editor → New query**.
2. Copy the complete contents of `supabase/migrations/20261101000200_live_quiz.sql`, including `begin;` and `commit;`. Run it **once**. Confirm success before continuing.
3. Open a fresh query. Copy all of `supabase/migrations/20261101000300_live_quiz_content_v1.sql`. Run it **once**. It installs the ten sourced questions in the private schema, not a browser-readable table.
4. Record the date/operator and successful versions in `supabase/MIGRATION_STATUS.md`. These new versions are **not** claimed applied in this PR.

**Never run `20261101000100_stage2_foundation.sql` again.** It was applied manually once. This PR leaves its bytes unchanged. Do not paste the test bootstrap, test clock overrides or browser fixtures into Supabase. The new SQL files use transactions; if one fails, stop and inspect that error rather than rerunning unrelated files. For a successful file, do not execute it again. Manual SQL Editor execution does not automatically reconcile Supabase CLI migration history. Do not run a blanket `supabase db push`; repair only versions confirmed applied after checking the linked project/history, following the existing migration-status guidance.

Check the objects without reading answers:

```sql
select to_regclass('public.live_quiz_sessions') as sessions,
       to_regclass('public.live_quiz_results') as results;
select version, title, published from el_zhady_private.live_quiz_sets;
select set_version, count(*) as question_count
from el_zhady_private.live_quiz_questions group by set_version;
```

Expected: both public table names, version `kz-1939-1953-v1`, published true and count 10. These owner SQL checks are not public endpoints. **Do not expose `el_zhady_private` through API settings.** Keep only the same exposed schemas as Stage 2.

## 2. Enable host-independent timing with Supabase Cron

1. In **Supabase Dashboard → Integrations → Cron**, enable Supabase Cron (`pg_cron`) if not already enabled. This stays inside the existing Supabase project. No extra hosting provider, secret, Edge Function or paid service is introduced.
2. The project must support second-based Cron schedules (Supabase documents PostgreSQL 15.1.1.61+). If `1 second` is rejected, stop at that backend capability error; do not substitute a one-minute timer or pretend the game is ready.
3. In owner SQL Editor, run `supabase/manual/enable_live_quiz_cron.sql`. It schedules the exact named job `el-zhady-live-quiz-v1` every second and a daily cleanup of only that job's old execution logs. Repeating the exact *named schedule* updates that job; it does not mean rerunning any migration.
4. Verify the named job is active and actually succeeds. Wait a few seconds, then run:

```sql
select jobid, jobname, schedule, active, database, command
from cron.job where jobname in
  ('el-zhady-live-quiz-v1','el-zhady-live-quiz-log-cleanup');
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='el-zhady-live-quiz-v1')
order by start_time desc limit 5;
select el_zhady_private.live_quiz_scheduler_ready();
```

Expected: active main job, command exactly `select el_zhady_private.tick_live_quizzes();`, the current project database, recent `succeeded` executions, readiness true. Do not share logs containing unrelated/private project data. If failed, inspect that job's error in Cron History and correct it before classroom use. The app refuses to start without the active exact job, but readiness is a configuration check, **not proof of healthy future runs**. Monitor Cron/DB load; defaults target small classroom rooms, not large simultaneous events.

[Supabase Cron](https://supabase.com/docs/guides/cron) and [quickstart](https://supabase.com/docs/guides/cron/quickstart) were opened during implementation. One-second jobs create many log rows; the supplied daily cleanup retains about two days for this dedicated job only.

## 3. Existing Auth / Pages configuration

Retain all Stage 2 settings and four public GitHub Actions variables: `VITE_PUBLIC_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`. No new public variable is required. Google secrets and CAPTCHA secrets stay only in Supabase. Keep Site URL / OAuth allowed redirect `https://owen1night.github.io/el-zhady/`. Hash routes and relative Vite assets are unchanged. Never publish a service-role key, database password or OAuth secret.

The owner's permanent admin account already works according to their report. No new admin grant is necessary. For future delegation, use the guarded **7. Securely designate your account as admin** SQL in SUPABASE_SETUP.md with that person's permanent Auth User UID; never grant by display name, email match, metadata or browser input. Anonymous users cannot gain admin through this UI.

## 4. Acceptance and a later authorised release

Do not merge this PR merely because CI passes. New migrations, real Cron execution and hosted multi-device acceptance remain owner tasks. After explicit release approval, the existing main-branch Pages workflow publishes the frontend. Migration installation alone does not deploy Stage 3; current Stage 2 remains compatible with the added tables/functions when no new live session is running. Do not start Stage 3 sessions while serving the old Stage 2 frontend.

Short laptop + iPhone checklist after the separately approved release:

1. Laptop: Google login as the existing admin, open `#/admin`, create a room. Open it, choose the live quiz, save selection. Confirm Start is disabled until another person joins. Copy the actual `https://owen1night.github.io/el-zhady/#/join?code=…` URL / show QR. Enable the header monitor mode; keep the quiz area visible on HDMI.
2. Separate signed-in browser: join by code. Physical iPhone Safari: scan QR, enter a different or identical display name, complete CAPTCHA if asked, join **without Google**. Both names/suffixes should appear. Check Android Chrome separately if available.
3. Start: host does not get answer controls; newcomers are locked out. Observe 3s countdown, ten 15s full-text questions and 5s explanations/leaderboards. Submit one answer per question. Attempt a second click; it must not replace the accepted answer.
4. Refresh a participant after answering: the accepted choice remains. Refresh/close the host tab for a question: phones and backend continue. Reopen host room; current phase/time recovers. Disconnect a phone briefly; missed questions get zero without shifting the schedule.
5. In-app navigation opens the Kazakh saved-points warning. Cancel navigation, then optionally leave and return with the same browser session. Check source links, touch/keyboard focus, large text and reduced motion.
6. Finish: complete table and all top-three ties are visible. Refresh: same results. Registered profile shows separate live points/correct count/speed/rank; practice stays `— / 100`. Guest results remain under their snapshots and never attach by name.
7. Prepare another room to test removal and confirmed cancellation. Removed session loses access; cancelled session is labelled and has no completed podium/history. Review per-question details as admin; participants must not see that report.
8. Check Cron History shows successful runs and the final results exist even if every browser is closed at the end. Do not count hosted acceptance complete until this has actually been observed.

This task does **not** perform the later release. STAGE3_VERIFICATION.md distinguishes local evidence from remaining hosted/physical tests.
