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
