# Competition lifecycle update — draft PR manual setup

Baseline: deployed Stage 3 main `f291792`. New branch `codex/live-competition-lifecycle` is review-only: **do not merge, deploy, or change hosted Supabase in this task**. No hosted SQL was executed. The existing three migrations were already applied manually and must never be rewritten or rerun. Existing Cron schedules remain unchanged.

The owner reports a physical iPhone completed a full Stage 3 quiz, rejected a late join, and preserved final results through two refreshes. That does not establish mid-question Safari answer recovery or continued play with the host tab closed; both remain on the device checklist.

## Before any later manual application

Review both new files first. Use a disposable Supabase test project when possible. On the existing project, coordinate a maintenance/release window: the result/API contract changes, so the old Stage 3 frontend must not run games against the new backend while awaiting a separately approved frontend release. This draft task does not authorise that release.

In **Supabase Dashboard → existing el-zhady project → SQL Editor → New query**, using the trusted database-owner (`postgres`) role, run this read-only check:

```sql
select count(*) as running_quizzes
from public.live_quiz_sessions where status='running';
```

Expected **0**. If nonzero, finish/cancel active games through the existing host UI before proceeding. Do not force statuses through SQL. The migration also fails closed if an old quiz is running. Follow your normal backup/restore-point process before schema changes.

## Apply only the two NEW files, once each, in order

1. In a fresh owner SQL Editor query, paste the complete `supabase/migrations/20261103000100_competition_lifecycle.sql`, including `begin;` and `commit;`. Run **once**, expect successful completion (normally no rows returned).
2. Only after success, open another query and run the complete `supabase/migrations/20261103000200_question_bank_v2.sql` **once**. Expect success. It copies ten existing sourced claims into a new immutable version and adds ten newly sourced items; it never alters the original bank version.
3. Record the actual application date/operator/result in `supabase/MIGRATION_STATUS.md`. These two versions are **pending hosted application** in this PR. Never mark them applied from local tests alone. Do not rerun any successful file, any of the old `20261101000…` migrations, or the Cron setup. Do not run a blanket CLI `db push`; SQL Editor application and CLI migration history are separate.

If a file fails, stop and report its exact error rather than retrying unrelated scripts. These files use transactions. No new frontend variable, OAuth setting, key, password, Edge Function or hosting provider is required. Keep `el_zhady_private` OUT of exposed API schemas. Existing public build variables and Google/CAPTCHA configuration remain as before.

## Read-only checks after application

Run queries separately to inspect each result:

```sql
select to_regclass('public.live_competitions') as competition_table;
```

Expected `live_competitions`.

```sql
select s.version,s.published,count(q.id) as bank_size
from el_zhady_private.live_quiz_sets s
join el_zhady_private.live_quiz_questions q on q.set_version=s.version
where s.version='kz-1939-1953-bank-v2'
group by s.version,s.published;
```

Expected version `kz-1939-1953-bank-v2`, published true, **20** questions. This checks counts without disclosing keys.

```sql
select policyname,qual from pg_policies
where schemaname='public'
and tablename in ('competition_results','live_quiz_results');
```

Expected only admin SELECT policies calling `el_zhady_private.is_admin()` for those raw tables. Player results are now safe RPC projections, not raw table access.

```sql
select tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
order by tablename;
```

Expected safe room/participant/session/`live_competitions` tables; **neither `competition_results` nor `live_quiz_results`**. No private roster/question/answer/history table may appear.

```sql
select jobname,schedule,active,command from cron.job
where jobname in ('el-zhady-live-quiz-v1','el-zhady-live-quiz-log-cleanup');
```

The same two active jobs should remain, with the quiz job every `1 second` calling exactly `select el_zhady_private.tick_live_quizzes();`. **Do not recreate them.** The migration replaces the private tick implementation while preserving that job contract.

```sql
select status,return_message,start_time,end_time from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='el-zhady-live-quiz-v1')
order by start_time desc limit 5;
```

Expect recent succeeded runs. Then:

```sql
select el_zhady_private.live_quiz_scheduler_ready();
```

Expected true. Actual new-round gameplay still needs the matching frontend and hosted acceptance; these SQL checks do not prove physical-device gameplay.

## Behaviour and data changes to review

- New removal is temporary: no room read/submission access until an explicit manual code/name join while joining is still open. Refresh/reconnect never invokes join automatically. Block additionally records an identity-scoped room ban. Identical names do not share a ban; a new anonymous identity cannot be claimed blocked by the old identity's ban. **Existing old removals are migrated as blocks**, preserving Stage 3's original permanent-removal semantics.
- First start freezes one roster across one to three **quiz-only** rounds. New entry remains locked between rounds. Eligible existing identities reconnect; removed/blocked ones cannot re-enter after start. Every next-round start names its target ordinal, so retries of round 1 cannot accidentally start round 2.
- Closing is final even during a round: unfinished rounds are cancelled; connected/reconnecting/refreshed participants get the Kazakh closure notice and return home. Hosts can inspect a closed room and explicitly delete it. Cancellation uses this same final close path.
- Deletion physically removes room, participant membership, session, question snapshots, submitted answers and room result rows in explicit FK order. Before that, durable private history stores display-name/score snapshots. It has no room/participant/session foreign keys. Registered history stays owned by the original registered UID; guest rows have no permanent owner and never link by name or identity upgrade. Auth users, profiles and practice rows are untouched.
- Minimal retired code/UUID tombstones reserve old QR codes and make delete retries harmless. Creation request IDs remain as a minimal quota/idempotency ledger with null room IDs after deletion; retrying an old creation request cannot recreate a deleted room. These are intentional minimal audit records, not a soft-deleted full room.
- Completed competition totals appear in registered history once revealed, or after final closure/deletion for the person's own earned history. An unrevealed archived result never publishes its rank through history. Partial cancelled competitions preserve previously completed rounds' private history. Guests retain named archive records without gaining personal profiles.
- Existing completed Stage 3 matches are backfilled as already-revealed one-round competitions with their exact stored scores/ranks. A deliberate new host reveal is required for newly completed competitions.

## Later laptop/iPhone acceptance checklist

After separately authorised backend/frontend release:

1. Create a room; confirm the expected disabled title field and working **«Тағы бір бөлме дайындау»** flow. Select the 20-question bank and one or two quiz rounds. Other four game types stay unavailable.
2. Open **«QR-кодты үлкейту»**: full viewport, crisp black/white SVG, large code below. X/Escape returns to the same room on laptop; test phone layout too.
3. Join with registered and iPhone guest sessions. Remove someone: they lose access and stay removed through refresh, but can manually rejoin before start. Block them: the same identity cannot rejoin that room even with a changed name. Identical-name people remain independent. Explain that a fresh guest identity is different.
4. Start. Confirm late joins fail throughout and between rounds. Refresh after an accepted answer **during the question**: the accepted choice, same question/order and remaining time should recover on physical Safari. **Close the host tab during a question**: the phone must continue through its deadline and reveal. These two physical checks remain outstanding from Stage 3.
5. At a nonfinal round end, only the host sees its full standings and **«Келесі ойынды бастау»**. Players see the waiting message. Wait/refresh: the next round must not start automatically. Start it manually; roster stays fixed and the new ten-question draw remains stable.
6. At final completion players wait for **«Нәтижені көрсету»**. Only the host publishes results. Observe third → second → first, all tied places, and fewer than three places. Refresh after reveal: settled podium, no replay. Reduced motion goes directly to the settled podium. Only host sees the full table; players see podium plus their own result.
7. Close a room while a phone is inside, then while it is disconnected. Reconnect/reload its old room URL: closure notice and homepage. Delete the closed room with explicit confirmation: old code/QR fails, saved account history and practice remain.
8. Verify real Supabase RLS/PostgREST/Reconnection/Realtime and Cron behaviour; local fixture tests are not hosted Auth or physical-device evidence.

## Multi-game scoring decision

Currently all enabled rounds use the same quiz scale: 10 questions, correct=1000+0..100 server speed, wrong/unanswered0. Aggregate **correct counts and speed sums**, rank by correct count first then speed, exact ties share competition rank, and raw points are `1000*total_correct+total_speed`. Max is `11000 × quiz_rounds`; practice /100 is separate. Question draws may overlap between rounds/sessions, but never repeat within one round.

Mixed game kinds are rejected by the backend and disabled in the UI. Before enabling them, the owner must choose common-scale normalization, per-game weights, speed eligibility/caps and cross-game tie rules. Summing matching/ordering/map/classification raw scores with quiz thousands would be invalid; this PR does not do that. A separate reviewed scoring-policy migration and tests must precede mixed-game availability.
