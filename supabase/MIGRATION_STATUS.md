# Initial migration status

- Version: `20261101000100`
- File: `migrations/20261101000100_stage2_foundation.sql`
- Status: **applied manually through Supabase SQL Editor, as reported by the owner on 2026-11-01**.
- Owner reports one successful execution. **Do not rerun this migration on that project.**
- Repository-copy SHA-256 (computed locally): `55eae585c14a9708ff556a26d51c752ec456aa550f3e4930f397903bb8588ba9`.
- No direct database access was provided; execution, the database copy/checksum and remote CLI migration history have not been independently inspected.
- No migration or privileged SQL was executed against hosted Supabase by this release work. Automated tests execute the SQL only inside fresh isolated test databases.
- Before future CLI migrations: reconcile the initial version's migration history through the trusted Supabase CLI repair workflow after verifying the target project. Do not use `db push` to recreate already-applied objects, and do not mark unexecuted future migrations as applied.
- The GitHub Pages workflow builds static assets only; it never runs database migrations.


## Stage 3 manual application — owner report on 2026-11-03

| Version | File | Status |
| --- | --- | --- |
| `20261101000200` | `migrations/20261101000200_live_quiz.sql` | Owner reports successful manual application on the existing el-zhady project; no rerun |
| `20261101000300` | `migrations/20261101000300_live_quiz_content_v1.sql` | Owner reports successful manual application on the existing el-zhady project; no rerun |

The owner reports both Stage 3 migrations succeeded on the existing project. The owner also verified both Cron jobs active, the five most recent quiz scheduler runs succeeded about one second apart, and `live_quiz_scheduler_ready()` returned true. This is the owner's hosted verification report, not independent SQL execution or inspection by the assistant. No migration or Cron setup was rerun by the assistant.

**Do not rerun any of the three applied migrations or the Cron setup.** The Stage 2 migration remains unchanged. Manual SQL Editor execution does not establish CLI migration-history reconciliation; verify the linked project/history before any future CLI workflow. On 2026-11-03 the owner authorised marking PR #3 ready, merging after green checks/no blockers, and deploying/verifying GitHub Pages. Live multiplayer/physical-device acceptance remains separate from the owner's Cron check.
