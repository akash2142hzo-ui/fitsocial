# First security migration verification

Task 005A prepares SQL locally only. Nothing in this directory has been executed
against PostgreSQL. These scripts are not evidence of working RLS, migrations,
Supabase compatibility or RPO 0. No Supabase CLI configuration is created here.

## Supported bootstrap contract

The intended migration principal is Supabase's controlled `postgres` role in the
`postgres` database, never an API worker. PostgreSQL supports role creation,
owner-role membership and object ownership transfer. Create the Auth foreign key
as that migration principal, then transfer the application tables; do not try to
delegate Auth schema access to the application owner. Existing reserved app role
names or schema cause migration failure, not adoption or replacement.
An existing FOR ALL TABLES publication also blocks bootstrap rather than silently
publishing private security state. The migration does not alter publications.

`fitsocial_owner` owns only the private schema/tables and invoker identity reader;
`fitsocial_guard` owns only the read-only denial function. Both are NOLOGIN,
NOINHERIT, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOREPLICATION.
The trusted `postgres` principal receives owner/guard membership for bootstrap
and later migrations; role creation can also confer creator/admin membership.
No application role is granted membership in any other role, and neither owner
nor guard is granted to runtime or Supabase API roles. Inspect the actual
membership catalog, including any platform-added membership, rather than assume
the explicit GRANT statements describe every edge.

`fitsocial_runtime` is LOGIN with the same restrictive attributes, no memberships
and no password provisioned. It receives database CONNECT, private-schema USAGE,
account SELECT, and EXECUTE on the two functions only. Guard receives private
schema USAGE and SELECT on both tables. Guard's CREATE privilege exists only
inside the migration for function ownership transfer and is revoked before
commit. No provisioning/admin/worker role or write function is created.

Do not store a database password in SQL. A separate approved operation must
provision runtime credentials and test the chosen direct/pooler login path.
Keep owner/migration credentials out of API workers. Existing PUBLIC privileges
on Supabase-managed schemas, database TEMP/CONNECT and extensions are preserved;
application-object grants are restricted independently. In particular, custom
roles can inherit platform privileges via PUBLIC: audit them before deployment.

## Before any approved application

1. Separately approve an isolated development environment and migration apply.
   Run `security_preflight.sql` first as the intended migration principal. It is
   read-only and emits capability booleans, not credentials or account data.
   All checks must pass; errors or false results block application. The smallest
   hosted read-only check needed now is that script. It cannot prove a later
   ownership transfer; only an approved isolated migration replay can do that.
2. Confirm `app_private` is absent from Data API exposed schemas and Realtime
   publications, and inspect existing default privileges/role memberships. Do not
   fix unexpected platform grants by globally revoking Supabase privileges.
3. The migration is one explicit transaction with bounded lock/statement timeouts.
   Review compatibility with the selected migration runner's transaction handling.
   A role/FK/ownership/grant failure must abort the whole transaction; do not rerun
   statements piecemeal, skip errors, or replace the owner with runtime/postgres.
4. Replay on an empty isolated application schema, inspect final catalog state
   and compare it with the migration. No passwords or real bearer tokens in
   commands, screenshots, source, logs or fixtures.

## After application: real restricted-role tests

Use connections authenticated as `fitsocial_runtime`, not only `SET ROLE` under
postgres. `security_runtime_readonly.sql` is a small smoke check, not the complete
integration suite. It uses transaction-local synthetic malformed identity only.

- Verify role attributes, every membership/SET ROLE path, table/function owners,
  fixed function settings, enabled/forced RLS, schema access, direct and
  column-level grants, and function ACLs. anon/authenticated/service_role and
  PUBLIC must not have application-object access. Runtime cannot create objects
  in app_private, alter RLS, TRUNCATE, write either table or read revoked_sessions.
- In a separately approved disposable fixture setup, create Auth identities A/B,
  active/disabled internal accounts and revoked sessions using controlled
  administrative credentials. Do not use production records or broaden runtime
  grants for fixture insertion. A sees only A's account; disabled state is readable
  for rejection, and the guard denies it. Missing account denies as well.
- With an active account, an unrevoked verified session returns false; a revoked
  session returns true even after its stored expiry or when its stored account
  differs. Null/nil session or missing/malformed subject returns true. Invalid
  UUID arguments, permission errors, DB failures and cancellations must propagate
  as failures, never be converted by application code to authorization success.
- Reject bad statuses/timestamps, duplicate sessions and absent Auth/account
  references. Verify FK deletion restrictions and that no automated cleanup,
  public table publication, lazy account creation or security-state writes exist.
- Test pool-size-one connection reuse after commit, rollback, failure and
  cancellation, then interleaved A/B requests on multiple connections. Use only
  parameterized transaction-local `set_config`, with context and protected reads
  on the same explicit READ COMMITTED transaction/connection. Cleanup failure
  discards the connection. Test actual pooler transaction affinity separately.
- Test helper resolution against temporary shadow objects and altered caller
  search_path. Pinning pg_catalog then pg_temp and qualifying relations must
  prevent substitution; no caller argument is interpolated as SQL.
- Barrier-controlled primary reads must observe committed revocation. The later
  protected-request gate must combine provider validation, account state and
  denial lookup, treat NULL/error as failure, and accept only exact boolean false
  from a successful denial lookup. No endpoint is supplied by this migration.

This read-only helper does not implement logout, provider revocation, outbox,
retention cleanup, provisioning or deletion coordination. Those remain separate
tasks. Hosted primary connection, acknowledged-commit preservation, synchronous
failover and fencing require actual topology evidence/testing before claiming
the existing RPO 0 requirement; successful SQL replay does not establish it.

## References

- [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Supabase Auth primary-key linkage](https://supabase.com/docs/guides/auth/managing-user-data)
- [Hosted Auth schema delegation limits](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7)
- [Platform PUBLIC privileges](https://supabase.com/kb/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c)
- [Supabase function security](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL ownership transfer](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL secure definer functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
