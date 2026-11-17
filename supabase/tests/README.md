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

## Task 045C: offline disposable verification runner

Current status through Task 046A: the authenticated native matrix passed in a
user-executed external run, and the backend gate passed assistant-executed fresh
disposable PostgreSQL integration. See `backend/TASK_045E_VERIFICATION.md` and
`backend/TASK_046A_VERIFICATION.md` for attributed evidence and exact commands.
`run_account_gate_integration.py --pg-bin $pgBin` exercises the actual gate in a
new owned cluster only. The blocked results below describe earlier task stages;
the separate Windows-API listener method remains blocked and is not declared fixed.
Hosted Supabase checks remain separate.

`run_disposable_security.py` prepares executable real-PostgreSQL checks without
adding a Python database driver, changing the migration or accepting any database
URL. **Execution is currently blocked:** no local PostgreSQL/container tooling was
available during Task 045C. The new SQL is prepared source, not parsed/executed SQL
or RLS evidence. See `backend/TASK_045C_VERIFICATION.md` for actual checks/results.

With an existing local Docker engine and an already cached, reviewed Linux
`postgres:17` image, run from the repository root:

```powershell
.\.venv\Scripts\python.exe -B supabase/tests/run_disposable_security.py --check
.\.venv\Scripts\python.exe -B supabase/tests/run_disposable_security.py --run
```

Neither command installs tools or pulls an image. `--check` is read-only. `--run`
creates only a new randomly named/labeled container, selects the cached image by
its inspected SHA-256 ID, and sets `--pull never`. Only the default local Docker
socket context is allowed; remote TCP/SSH contexts and host/context environment
overrides are not used. There is no DSN, existing-container or existing-cluster
argument. The image ID is printed for future reproducibility; a local image tag
alone is not proof of image provenance.

The container has network `none`, an empty listening-address setting, no published
ports or host mounts, a read-only root filesystem and tmpfs database/socket/temp
directories. Runtime login uses the actual `fitsocial_runtime` role through the
container's Unix socket with passwordless local trust; it never provisions a
credential. That trust policy is only for this inaccessible throwaway instance,
never a deployment recommendation. Cleanup removes only the exact newly created
container after checking its unique ownership label, including any anonymous
volumes tied to that new container. No existing container/volume is adopted or
removed. An interrupted/failed cleanup requires operator inspection of containers
with the `fitsocial.verification` label; do not prune the Docker engine globally.

Verification order:

1. `security_disposable_bootstrap.sql`: minimal real Auth FK table and platform
   role names, with deliberately broad allowed default grants. These are not the
   Supabase Auth service or a faithful hosted-role simulation.
2. Original preflight (all 11 booleans must be true), original pre-migration
   catalog inventory, unchanged first migration, original post-migration inventory.
3. `security_disposable_catalog_assertions.sql`: fail on wrong role flags,
   memberships, ownership, RLS/helper metadata, effective/column/PUBLIC privileges,
   function defaults, private publications or a configured private API schema.
4. `security_disposable_fixtures.sql`: synthetic active A/B, all three inactive
   statuses, Auth-only identity, revoked/expired/mismatched sessions and constraints.
   A supplementary owner query illustrates FORCE RLS; actual runtime tests below
   provide the restricted-login evidence rather than that owner query.
5. Original smoke plus `security_disposable_runtime.sql`, both as the actual
   runtime login: malformed/missing identity, cross-account reads, active/absent/
   inactive accounts, session denial, prohibited statements and temporary-shadow
   resistance. Only `insufficient_privilege` satisfies prohibited-operation tests.
6. Same physical runtime backend reused after commit, rollback, division-by-zero
   failure and statement cancellation; the backend PID must stay unchanged.
7. Two simultaneous actual runtime connections interleave A/B transactions, then
   verify a separate admin commit becomes visible to A's READ COMMITTED lookup.
8. Final catalog assertions and owned-container cleanup. Errors abort the run;
   failures are stage labels/exit codes rather than raw SQL/connection details.

The runtime can read its own inactive status, which the helper must deny. TEMP
objects are intentionally allowed; persistent schema creation/mutation is denied.
The runner tests database transaction-local reuse, not a nonexistent application
pool's cleanup/discard implementation or a hosted pooler's transaction affinity.
Subject context is trusted backend input: runtime SQL can set another subject,
so this suite cannot prove independent authentication or subject/session binding.

Hosted checks remain mandatory: actual restricted-admin bootstrap/FK/ownership
capabilities, real effective platform grants/memberships, Data API exposed schemas
(an absent `pgrst.db_schemas` setting is inconclusive), Realtime publications,
runtime direct/pooler login and TLS, primary routing, cancellation/connection-loss
cleanup and failover/RPO 0. No local result verifies Supabase Auth integration,
Storage policies, account provisioning, product authorization or durable logout.

## Task 045D continuation: native Windows mode

The runner now has `--backend native --pg-bin <local-bin-directory>` in addition
to its existing default Docker mode. Both transports call the same SQL and
interleaved-connection matrix; no migration or SQL assertion was weakened.
Native database execution is still blocked in this session. The corrected tools
directory contains matching PostgreSQL 17.6 binaries, but a real loopback ownership
probe returns invalid Windows TCP state metadata. See
`backend/TASK_045D_VERIFICATION.md` for actual results, including the one failing
platform-capability test. No native PostgreSQL pass is claimed.

When the actual binaries and OS ownership capability are available, from the
repository root (keep the actual private directory in a local shell variable):

```powershell
.\.venv\Scripts\python.exe -B supabase/tests/run_disposable_security.py --backend native --pg-bin $pgBin --check
.\.venv\Scripts\python.exe -B supabase/tests/run_disposable_security.py --backend native --pg-bin $pgBin --run
```

`$pgBin` must identify the extracted PostgreSQL 17 `bin` directory, not a data
directory. All four tools must report the same 17.x version. Native check mode
runs only version probes and a new temporary loopback socket ownership probe;
it does not initialize/connect to a database. Invalid Windows listener metadata
blocks before cluster creation, not after connecting to an unknown listener.

Native run mode exclusively creates a unique OS-temporary cluster, reserves an
available nondefault port, and launches its own explicit postmaster process.
It binds only `127.0.0.1`, disables Unix sockets, limits HBA trust to the synthetic
postgres/runtime roles and local database over IPv4 loopback, and rejects other
HBA traffic. It provisions no passwords and installs no service/firewall rule.
This short-lived local trust is not equivalent to the Docker network namespace
or a production authentication policy; other local users are outside its threat
boundary and the instance must contain only synthetic test data.

Before each client/command and reused-session query it validates the owned process
handle/PID, data directory, selected port and listener ownership, with a unique
server-side run marker checked on every SQL call. Ambient PG connection/options/
service/password settings and default psql startup files are not used. It never
accepts an existing cluster, database URL or arbitrary host/port.

Cleanup invokes fast shutdown only for the validated owned postmaster, waits for
it, requires the PID file/listener to disappear, then checks the unique directory
marker, containment and absence of redirected entries before removing its temporary
tree. Uncertain ownership/cleanup fails closed and retains resources for inspection;
it never kills processes by name or deletes arbitrary data directories. Abrupt
termination still needs manual review of the particular test-owned resource.
The unit safety tests exercise refusal and simulated cleanup paths; real PostgreSQL
startup/shutdown/resource-removal evidence remains pending.

The latest native capability error includes API status, state and whether an owner
PID was present. API buffer growth is retried a bounded number of times; access
errors, zero owner PIDs and invalid states never become successful ownership.
`diagnose_listener_ownership.ps1` supplies an independent .NET/P/Invoke own-socket
diagnostic without Python or PostgreSQL. Its syntax parses, but this session's
effective Restricted execution policy blocks running script files; do not change
that policy or add a bypass flag for this task. An inline independent probe under
normal access already reproduced the same state-0 failure.

The smallest manual follow-up is the native `--check` command above in an ordinary
non-administrator PowerShell outside this managed agent session. Set `$pgBin`
locally and share only sanitized stage/status output. This changes no Windows
settings and starts no database. A pass outside the session would identify an
execution-context limitation; the same failure would require further host/API
diagnosis, not relaxed ownership assertions.

The user has now confirmed that the same error occurs outside the managed session.
`reproduce_listener_lifecycle.py` is a standalone stdlib reproduction that requires
no administrator token, PowerShell script-policy change or PostgreSQL. Run from
the repository root with an existing Windows Python:

```powershell
python -B supabase/tests/reproduce_listener_lifecycle.py
```

It samples the bound socket before `listen()`, explicitly calls `listen()`, then
samples immediately and after delays. It checks known PID/address/port, native
layout/byte ordering, captures only matching `netstat` evidence and confirms an
actual connect/accept/echo using only its owned socket. Outputs omit private paths,
actual PIDs and unrelated endpoints. On this host, the echo succeeds but both API
classes still report state 0, so the reproduction correctly exits 2. Independent
.NET/P/Invoke reproduces the same lifecycle behavior; no premature-listen or
decoder defect is demonstrated. The runner and ownership assertion remain unchanged.

## Task 045E: separate authenticated ownership method

Native mode additionally accepts `--ownership authenticated`. It does not query or
reinterpret the state-0 Windows API. Default native Windows-API mode and Docker
mode remain separate supported interfaces; neither is declared fixed by this work.
For this task use only the explicit authenticated method, which uses no trust auth:

```powershell
python -B supabase/tests/run_disposable_security.py --backend native --ownership authenticated --pg-bin $pgBin --check
python -u -B supabase/tests/run_disposable_security.py --backend native --ownership authenticated --pg-bin $pgBin --run
```

The check verifies existing 17.x binaries and a non-administrator token, not live
database ownership. Run creates a unique temporary directory outside the repo,
replaces and reads back its exact current-process-user/SYSTEM DACL, initializes
with SCRAM and a private password file, and requires SCRAM on the client too
(`PGREQUIREAUTH`). A passfile alone is insufficient: a trust server must not be
accepted at a colliding port. Credentials never appear in argv/output. Authentication
setup on the disposable runtime role changes only its temporary password, not grants.

The independent ownership chain combines the retained launched process, matching
PID-file PID/data/port/start time and authenticated SQL checking directory, port,
loopback address, server start time and unique run marker. Partial PID files are
waited for, startup is bounded, and a mismatch never adopts another listener.
The same SQL matrix is used by both transports. Cleanup requires the independent
chain before shutdown, rejects redirected paths and retains evidence on uncertain
startup/ownership/interruption rather than killing a process by port/name.

Actual execution remains blocked earlier than SQL: native `initdb` failed creating
its restricted token (Windows error 87), then failed restricted-token re-execution
(error 3). No postmaster was launched and no migration/security script ran. One
private evidence directory is deliberately retained, with no cleartext password.
See `backend/TASK_045E_VERIFICATION.md` for full evidence, checks, limitations and
the concrete backend transaction/authorization integration plan. No startup,
ownership handshake, RLS or hosted compatibility pass is implied by offline tests.

## Read-only retained-identity diagnosis

If an external authenticated run reports an identity mismatch, do not immediately
start another run or stop the retained server. `diagnose_retained_identity.py`
selects exactly one marked retained candidate in the original terminal's temporary
directory, checks complete PID metadata and query-only live-process evidence,
requires the retained SCRAM credentials, and reads identity in a read-only session.
It never invokes runner adoption, shutdown or deletion, and cannot recreate the
original launch handle after the runner exits. Missing/ambiguous/inaccessible
evidence produces only an unavailable label, with no connection attempted.

From the original non-administrator terminal and repository root:

```powershell
python -B supabase/tests/diagnose_retained_identity.py --pg-bin $pgBin
```

Only sanitized field labels/statuses are printed. Path normalization and timestamp
precision/timezone observations are diagnostic hints, never alternative acceptance
criteria. Share the JSON, not raw files or credentials. The current session cannot
see the external retained server, so the actual mismatch remains undiagnosed here.
Do not rerun the matrix until that output establishes the failed comparison and
any justified fix is reviewed/tested. See the latest section of
`backend/TASK_045E_VERIFICATION.md` for exact evidence and test scope.

Discovery/parsing now reports exact stages with `not found`, `access denied`,
`invalid format`, `unsupported version` or `ambiguous candidates`; unexpected type
or API argument errors retain their stage instead of becoming a combined
"unavailable". Both producer and companion use `tempfile.gettempdir()`, whose
selection can differ with TMPDIR/TEMP/TMP and execution context. The producer
currently writes only an unversioned `token` manifest; it does not record its
original temporary parent. No directory-environment difference is assumed proven.

To select the exact retained directory privately in the external terminal:

```powershell
python -B supabase/tests/diagnose_retained_identity.py --pg-bin $pgBin --select-run
```

At the hidden-input prompt, paste the retained **run root** containing `owner.json`,
`client-passwords` and `data`, not its data subdirectory. The path is not an argv
value or console output. A noninteractive input stream is rejected rather than
falling back to echo. Explicit selection can use the original run's temporary
parent, but still requires the producer's marker/name protocol, local unredirected
resources, complete PID metadata, readable correctly scoped credentials and all
existing process/authenticated identity checks. It never widens permissions or
automatically adopts, terminates or cleans a server. Share only the status JSON.

## References

- [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Supabase Auth primary-key linkage](https://supabase.com/docs/guides/auth/managing-user-data)
- [Hosted Auth schema delegation limits](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema-9e32e7)
- [Platform PUBLIC privileges](https://supabase.com/kb/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c)
- [Supabase function security](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL ownership transfer](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL secure definer functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
