-- Run once, as the trusted project database owner, AFTER the two Stage 3 migrations.
-- Enable Supabase Cron/pg_cron through Dashboard -> Integrations -> Cron first.
-- This is scheduler setup, NOT a rerun of any schema/content migration.
select cron.schedule(
  'el-zhady-live-quiz-v1',
  '1 second',
  'select el_zhady_private.tick_live_quizzes();'
);
-- Repeating this exact named schedule updates the same job rather than duplicating it.
-- Limit only this job's run-history growth; do not delete unrelated job history.
select cron.schedule(
  'el-zhady-live-quiz-log-cleanup',
  '17 3 * * *',
  $$delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='el-zhady-live-quiz-v1') and end_time<now()-interval '2 days';$$
);
