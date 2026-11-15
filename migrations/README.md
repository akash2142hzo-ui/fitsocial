# Database migrations

V1 uses Supabase SQL migrations. Future executable migration files belong only in `supabase/migrations/<timestamp>_<description>.sql`, following one Supabase migration history. This root directory is a documentation pointer, not an alternative migration root; do not add an Alembic history.

The same Supabase project hosts Auth and application PostgreSQL. `DATABASE.md` section 12 contains the proposed internal account/revocation schema and exact role/security contract for review. Role provisioning, ownership transfer and Auth primary-key references must be checked against an approved isolated Supabase environment before accepting executable migrations. Do not assume hosted administrator credentials are unrestricted superuser credentials.

No migration files, CLI installation, database connection or schema application is authorized by Task 003A. Once approved separately, migrations must replay on an empty isolated application schema, preserve Supabase-managed objects, and run integration tests through the actual restricted runtime login. Supabase CLI reset/apply/push operations require their own environment-specific authorization; never run them against production as part of inspection.

Task 005A separately authorizes local SQL preparation only. The first migration
is `supabase/migrations/20261112000100_security_foundation.sql`; its exact limited
contract is `DATABASE.md` section 12.7. It is not applied or PostgreSQL-verified.
Read-only preflight/smoke scripts and the hosted integration checklist are in
`supabase/tests/`. None has been executed against a database. No CLI configuration,
database credential provisioning or live schema operation is authorized here.
