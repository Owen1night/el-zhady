# Isolated laptop + physical iPhone Safari playtest (PR #6)

Application source: PR #6 commit `465574fcc86f44b9d166c998c28a2e0d00a73b25`. This utility branch adds only review/setup files; it does not edit the PR application, migrations, Cron or production workflows. This is a proposed isolated deployment recipe, NOT a deployed test site or configured Supabase project. No hosted SQL/Cron is executed by the recipe's CI check. Both PRs remain draft/unmerged.

## Recommended path

Use **one fresh empty Supabase test project + one separate public GitHub Pages test repository**, e.g. `Owen1night/el-zhady-playtest`. This keeps HTTPS, Safari, real anonymous Auth, real RLS/Realtime and a host-independent scheduler. It uses the same providers; no alternate hosting provider or paid Supabase branching is required. Check you have an available free project slot; stop if not, instead of upgrading just for this test.

A localhost URL, the production URL with a test backend, and the automated Playwright fixture are not substitutes for this physical two-device test. The current headless runner terminates after its scripted scenario; its per-browser routed API does not provide an iPhone-accessible server.

## 1. Separate frontend repository, no production edits

Create an **empty public** repository named `el-zhady-playtest` (no initial README). On your laptop, in a new folder, clone this utility branch, pin it to the reviewed utility commit if desired, then change **this clone's** origin:

```bash
git clone --branch codex/isolated-playtest-guide https://github.com/Owen1night/el-zhady.git el-zhady-playtest
cd el-zhady-playtest
git remote rename origin source-read-only
git remote set-url --push source-read-only DISABLED
git remote add origin https://github.com/Owen1night/el-zhady-playtest.git
git switch -c playtest
cp playtest/isolated-pages.yml .github/workflows/pages.yml
git add .github/workflows/pages.yml
git commit -m "Use manual isolated Pages workflow in test repository"
git push origin HEAD:main
```

This pushes to the new test repository, not `Owen1night/el-zhady`. The replacement Pages workflow runs **only on manual dispatch**, not on this push. Do not copy it over the original repository's production workflow.

In the **new test repository**, Settings → Pages → Build and deployment → Source: **GitHub Actions**. Do not change production Pages settings or its Actions variables.

Expected test frontend URL for this exact repository name is `https://owen1night.github.io/el-zhady-playtest/`. It is not claimed live until deployed and checked.

## 2. New isolated Supabase project, owner setup only

Create a **new empty** project, clearly named `el-zhady-playtest`. Check its project reference is different from the existing el-zhady production reference. Do not clone production users, profiles, rooms, scores or private credentials. Keep `el_zhady_private` out of exposed API schemas.

The following is a **future manual owner setup**, not work performed by this task. In SQL Editor of the NEW EMPTY TEST PROJECT ONLY, the test backend needs all seven pinned migrations once, in order. Stop on any failure; never rerun a successful file:

1. [20261101000100_stage2_foundation.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261101000100_stage2_foundation.sql)
2. [20261101000200_live_quiz.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261101000200_live_quiz.sql)
3. [20261101000300_live_quiz_content_v1.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261101000300_live_quiz_content_v1.sql)
4. [20261103000100_competition_lifecycle.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261103000100_competition_lifecycle.sql)
5. [20261103000200_question_bank_v2.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261103000200_question_bank_v2.sql)
6. [20261103000300_mixed_live_engine.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261103000300_mixed_live_engine.sql)
7. [20261103000400_mixed_bank_v3.sql](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/migrations/20261103000400_mixed_bank_v3.sql)

The first five are already installed in production and MUST NOT be rerun there. They are needed here solely because the new isolated database starts empty. Do not paste test bootstrap/clock overrides into Supabase. Do not use a blanket CLI `db push` against production.

Only on the **new test project**, enable Supabase Cron/pg_cron and run the pinned [scheduler setup](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/supabase/manual/enable_live_quiz_cron.sql) once. This creates test-project jobs, not production jobs. Verify both active, recent successful one-second ticks and readiness true using [STAGE3_SETUP.md checks](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/STAGE3_SETUP.md). Verify map10 / quiz30 / timeline10 distinct tasks and result privacy using [MIXED_SETUP.md](https://github.com/Owen1night/el-zhady/blob/465574fcc86f44b9d166c998c28a2e0d00a73b25/MIXED_SETUP.md). Do not change production Cron. If one-second scheduling is unavailable, stop; one-minute timing cannot test these games.

## 3. Test-project Auth

- Enable anonymous sign-ins on the **test** project. Guests need no Google/email.
- For the simplest short controlled test, leave CAPTCHA **off on this fresh test project only**, leave the test Turnstile variable blank, and retain default Auth rate limits. Production CAPTCHA remains unchanged. For wider test access, configure a separate matching Turnstile widget/secret on the test project and its public site key; never disable production CAPTCHA.
- Set the test project's Site URL and allowed redirect to the exact test frontend root above, including trailing slash.
- Create a separate Google **Web application OAuth client** for the test project, using the provider callback URL shown by that project's Supabase Google panel as its authorised redirect URI. Keep any secret only in test Supabase. The Google consent/testing account must be allowed. Do not alter the existing production OAuth client's callbacks or production Supabase settings. There is no need to add an email/password UI.

References: [Supabase Google redirect setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Cron](https://supabase.com/docs/guides/cron/quickstart), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 4. Public build variables in the NEW test repository

Settings → Secrets and variables → Actions → **Variables**:

| Variable | Value |
|---|---|
| `PLAYTEST_SUPABASE_URL` | New test project's HTTPS Project URL |
| `PLAYTEST_SUPABASE_PUBLISHABLE_KEY` | New test project's public `sb_publishable_…` key |
| `PRODUCTION_SUPABASE_PROJECT_REF` | Existing production project's public reference/ID, to reject accidental use |
| `PLAYTEST_TURNSTILE_SITE_KEY` | Blank/absent while test-project CAPTCHA is off; otherwise its matching public site key |

No service-role key, OAuth secret, database password or admin password belongs in these variables. No private credential needs to be shared in chat.

The preparation script refuses the production repository and a backend with the supplied production reference. It derives the HTTPS site root from the new repository. It namespaces test Auth/PKCE/progress/notice keys, because Pages paths under the same owner share a browser origin; production sessions must not be overwritten. It adds a visible ISOLATED PLAYTEST banner.

The existing production deployment preflight/health script pins the production URL. The test workflow therefore uses its separate strict staging preflight and temporarily retargets only the checked-out verifier to this test URL. It does not weaken the original production workflow or change PR #6's source. App game/score/SQL code remains the pinned PR revision; only storage namespaces and the test banner differ.

## 5. Manually deploy only the TEST repository

In the new test repository, Actions → **Deploy isolated playtest** → Run workflow on `main`. Check the repository name in the UI before running.

Wait for build/deploy AND public HTTPS commit/asset verification to succeed. The verifier checks HTTP200, the deployed commit marker and SHA-256 matches. Open the actual URL reported by that test run on the laptop and iPhone; check the banner's backend reference matches the **test** project.

This recipe has not yet been exercised against your external test project. Its CI checks guards, storage transformations and a complete transformed frontend/verification-manifest build with nonfunctional fixture configuration. It does not contact a backend, verify external Auth/SQL/Cron, or deploy a website.

## 6. First permanent host login and TEST admin grant

Laptop: open the test URL, use Google, create a display name. In the **TEST project → Authentication → Users**, confirm your new account is permanent (not anonymous), copy its test-project Auth UID. It is different from a production project's account.

Only as owner in the TEST SQL Editor, after replacing the placeholder:

```sql
do $$
declare v_user uuid := 'REPLACE_WITH_TEST_AUTH_UID';
begin
  if not exists(select 1 from auth.users where id=v_user and is_anonymous is false) then
    raise exception 'A permanent authenticated account is required';
  end if;
  insert into el_zhady_private.admins(user_id) values(v_user)
    on conflict(user_id) do nothing;
end $$;
```

Refresh the test site and open `#/admin`. Never grant by display name or a guest UID. Do not execute this grant in production.

## 7. Physical laptop + iPhone acceptance

1. Laptop host: create a new test room, save suggested **quiz → map → timeline**, enlarge its QR. The printed link MUST start with the test repository URL, not `/el-zhady/` or localhost.
2. iPhone: scan QR, open in **Safari**, enter code/name and join as a guest without Google/email. Refresh once in the same browsing context; membership should recover. Optionally join a second, separate laptop private-browser guest and leave it unanswered to check zero scores. Closing private tabs/clearing browser data can lose guest recovery.
3. Host starts the quiz. Confirm three-second countdown. On an early question, let the iPhone choose an answer and wait for **«Жауап серверде сақталды»**. Refresh the phone and confirm the same accepted choice.
4. While the timer still has time, host clicks **«Сұрақты аяқтау»**. Submissions close on the server; host and phone see the **normal five-second reveal** on their next update. The saved choice remains and scores normally; a wrong answer remains zero, and an unanswered extra guest gets zero. The earlier accepted speed score must not be recalculated from the shortened window.
5. Repeat on the next question with a quick double-click. Expect one reveal followed by one next question, never a skipped/double-finished question. The next quiz window is still **15 seconds**, map25, timeline40. First displayed remaining time can be slightly lower due to network/poll delay; the configured server interval must be full.
6. The manual double-click tests device behaviour; the existing PR #6 CI separately tests direct duplicate/stale RPCs after advancement, expiry equality and concurrent answer/timeout requests. Neither visual timing alone nor one disabled UI click proves those server races.
7. Finish quiz: phone must wait between rounds until host explicitly starts **map**. Select locations using both markers and list; accepted choice survives refresh. Try early finish here too.
8. Host explicitly starts **timeline**. Use up/down controls, then **«Ретті жіберу»**; refresh after acceptance. Check normal ordered reveal and unchanged next40-second window after early finish.
9. Finish all three. Guests wait until host **«Нәтижені көрсету»**. Verify podium/own result only, no full player table, and stable settled result after refresh. Host sees full standings. Every kind has max11,000; total max33,000, separate from practice /100.
10. In another new room, finish one question by natural expiry. The reveal and next timer should match early-finish behaviour. For host-independent timing, close/reopen the host tab while guests continue; the isolated Cron scheduler must continue. A recorded successful Cron setup alone is not gameplay evidence.

Record browser/device/iOS version, expected vs actual, and any visible error message. No tokens, keys or private network headers need to be sent. A successful local or CI test is not physical Safari acceptance.

## Independence and cleanup

PR #5 can ship independently with the current production backend and no new SQL. This kit does not merge PR #5 or PR #6. Once testing is finished, remove the test Pages deployment/repository if unwanted and pause/delete only the clearly identified disposable test project. Never clean up the production project. No teardown is performed by this task.
