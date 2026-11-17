# Task 045C - Disposable database security verification

Date: 2026-11-17. **Real database execution is BLOCKED.** No PostgreSQL instance
was created, no SQL was executed, and no RLS/security claim is verified by this
task. The completed runner/scripts are ready for a future isolated replay but
have not yet been exercised end to end against PostgreSQL.

All paths in this document are repository-relative. No local credential values,
private machine paths, connection strings or existing database names are recorded.

## Inspection and preservation

Inspected the unchanged first migration,
`supabase/migrations/20261112000100_security_foundation.sql`, and the unchanged
original scripts `security_preflight.sql`, `security_catalog_inspection.sql` and
`security_runtime_readonly.sql` in `supabase/tests/`. Reviewed their README,
`DATABASE.md` sections 12.3-12.7 and existing backend tooling/check configuration.
Task 005A's narrow section 12.7 contract takes precedence over future role/write/
worker proposals. No applicable repository AGENTS.md was found; ancestor
instructions had also been checked during the baseline review.

Initial work was preserved: the Task 045B README change and three untracked 045B
files remain; all ten untracked category photos remain untracked with their
original SHA-256 hashes. The migration and all three original SQL scripts were
left untouched. No app source, dependency, environment, credential, Git index,
existing database or service was changed.

Tool discovery used `Get-Command` for `docker`, `podman`, `psql`, `postgres`,
`initdb`, `pg_ctl` and `supabase`, reporting availability booleans only. None was
available on PATH. Standard PostgreSQL, Docker and Podman installation-location
probes also returned false. No PostgreSQL driver/testcontainer/parser package was
found in the existing backend distribution metadata. This is a bounded inventory,
not proof that no unregistered binary exists anywhere on the computer. No tools
or images were installed/downloaded and no daemon or hosted endpoint was contacted.

## Prepared files and safeguards

Added under `supabase/tests/`:

- `run_disposable_security.py`: standard-library orchestration using an existing
  local Docker socket and cached PostgreSQL 17 image. No database driver required.
- `security_disposable_bootstrap.sql`: minimal real Auth UUID FK target and named
  platform roles; deliberately seeds allowed broad default grants for the unchanged
  migration to revoke. This is not the hosted Supabase Auth schema/service.
- `security_disposable_catalog_assertions.sql`: automatic metadata/effective-grant
  assertions, supplementing the original inspection's manual inventory.
- `security_disposable_fixtures.sql`: synthetic identities/accounts/revocations and
  check/unique/FK/deletion-restriction assertions.
- `security_disposable_runtime.sql`: actual restricted-login behavioral matrix,
  including physical-connection reuse and temporary-object shadowing.

Updated `supabase/tests/README.md` with execution instructions, lifecycle and
hosted limitations. Added this document. Original SQL/migration behavior and
Task 045B implementation are unchanged.

The runner accepts only `--check` or `--run`; no DSN, existing database/container,
host, password or connection-profile argument exists. It selects only the default
local Docker socket context, disregards host/context environment overrides, and
rejects TCP/SSH/nonlocal pipe endpoints. The pre-existing cached `postgres:17`
image is inspected and selected by SHA-256 ID with `--pull never`. Future runs
print that ID for reproducibility; image trust/provenance still needs review.

`--run` creates a randomly named/labeled container with no network, listening
address, published ports or host mounts. Root filesystem is read-only; PostgreSQL
data, sockets and temporary data use tmpfs. No persistent database volume is
adopted. Local socket trust allows an actual runtime login without setting any
password or provisioning credentials; it is not a production authentication
recommendation. The runner checks the final server process before connecting,
avoiding the image entrypoint's temporary initialization server.

Cleanup verifies the unique label before removing only the newly created container
and its associated anonymous volumes. No global prune or existing-resource deletion
is used. Abrupt termination/engine failure can prevent cleanup; inspect only the
`fitsocial.verification`-labeled disposable containers and never prune unrelated
resources. Raw subprocess/SQL error output is withheld; failure reports identify
the stage and exit status. Capability/verification failure returns exit code 2.

## Required verification coverage - prepared, NOT executed

| Requirement | Executable checks prepared | Actual database result |
| --- | --- | --- |
| Owner/guard/runtime attributes and memberships | Exact login/security flags, every membership edge touching app roles, trusted postgres owner/guard memberships, table/schema/function ownership | BLOCKED |
| Runtime cannot bypass RLS/escalate/change persistent schemas | Actual runtime login, prohibited SET ROLE/session authorization/role changes, schema/table/function creation, schema rename, RLS alteration, TRUNCATE and DML; row_security=off must raise insufficient_privilege | BLOCKED |
| Missing/malformed identity fails closed | No actor, no account rows and denial for missing, empty, invalid JSON/type/UUID, nil UUID, extra-field and oversized context | BLOCKED |
| Account A cannot read B | A and B each see exactly their own account; direct other-ID filtering returns no rows | BLOCKED |
| Missing/inactive accounts and revoked sessions deny | Active/unrevoked allows only the denial-helper result; all three inactive statuses, Auth-only/missing accounts, null/nil session, expired and mismatched-owner revocations deny | BLOCKED |
| Transaction identity cannot leak on reuse | Single physical backend/PID after commit, rollback, deliberate failure and timeout cancellation; two simultaneous A/B connections with interleaved statements and subsequent anonymous reuse | BLOCKED |
| Helper execution/search_path restricted | Exact invoker/definer/owner/stable/non-strict metadata, fixed settings, effective EXECUTE matrix, no platform/PUBLIC execution and temporary shadow-object attacks | BLOCKED |
| PUBLIC/platform exposure | Expanded ACL defaults, table/column/effective privileges, owner/guard function defaults, persistent-schema CREATE restrictions, private publication mappings/tables and known Data API schema settings | BLOCKED; hosted service configuration remains separate |

The runner first requires all 11 original preflight booleans, inventories catalogs
before/after replay, applies the unchanged migration, and executes original smoke
plus the new matrix. Runtime evidence uses `session_user = current_user =
fitsocial_runtime`, not SET ROLE under postgres. A supplementary owner query
demonstrates FORCE behavior without being used as runtime isolation evidence.
Two persistent runtime sessions also verify a separately committed synthetic
revocation becomes visible to an already-open READ COMMITTED transaction.

Expected behavior follows the existing contract:

- Runtime may read its own inactive account status so the application can reject
  it. The denial helper must still return true. A missing account never provisions
  or enables access.
- Any matching revocation denies, including expired records or an account mismatch.
  Only exact false after a successful active-account lookup indicates not denied.
- TEMP objects remain permitted; persistent schema creation/mutation is denied.
  Qualified helper references must resist caller search_path/temporary shadows.
- Runtime can set the trusted subject context itself. The database does not
  independently authenticate subjects or bind them to sessions; backend token
  validation and parameterized transaction initialization remain mandatory.
- Existing PUBLIC database TEMP/CONNECT and platform privileges are not globally
  revoked. Application isolation is asserted separately; unexpectedly broad
  persistent-schema privileges fail rather than being repaired automatically.

## Actual commands and results

Commands below were run from `backend/`, using the existing environment with
approved access to its base interpreter. No dependency installation was needed.

```powershell
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --check
..\.venv\Scripts\python.exe -B ..\supabase\tests\run_disposable_security.py --run
```

Both printed `BLOCKED: local Docker executable is unavailable` and returned
**exit code 2**, confirmed from PowerShell `$LASTEXITCODE`. They stopped before
container/image inspection or creation. No database test passed or failed: none
could start. A first tool wrapper reported exit 1 for the check; a direct
PowerShell exit-code capture confirmed the runner's actual code is 2.

```powershell
..\.venv\Scripts\python.exe -B -m ruff check --no-cache app tests ../supabase/tests/run_disposable_security.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider
```

- Ruff: exit 0, **All checks passed!**
- mypy: exit 0, **Success: no issues found in 11 source files**.
- Existing backend regression suite: exit 0, **192 passed in 1.76s**.
  These health/settings/Bearer/provider-mock tests are not SQL or RLS evidence.
- Initial lint/type findings in the new runner were corrected before these final
  checks. Python lint/type checks do not parse psql/PLpgSQL or validate container
  startup. SQL was manually reviewed only; neither syntax nor behavior is proven.

From the repository root, `git diff --check` passed; `git status --short` and
`git diff --name-only` were inspected. Explicit diff checks confirmed the original
migration/preflight/catalog/smoke files and unrelated tracked source were unchanged.
Photo hashes were compared with the baseline and all ten matched. Nothing is staged.

## Remaining local and hosted acceptance work

1. Run this exact matrix in the fresh offline container after existing tooling
   becomes available; record image ID, PostgreSQL version and actual stage results.
   Resolve any runner/SQL failures there without weakening role grants or policies.
   No mocked substitute is acceptable for this blocked real-database evidence.
2. In a separately authorized isolated Supabase project, verify actual restricted
   postgres capabilities, FK/ownership transfers, role creation/membership options,
   default ACLs/extensions and platform-added grants. A stock local superuser and
   minimal Auth FK table cannot prove hosted bootstrap compatibility.
3. Confirm real Data API exposed schemas and Realtime configuration externally to
   SQL. Missing `pgrst.db_schemas` is inconclusive; service/dashboard configuration
   can differ from database settings. Re-run catalog publication/grant inspection.
4. Verify actual runtime direct/pooler authentication and TLS, primary routing,
   transaction affinity and clean backend reuse. The prepared psql tests exercise
   PostgreSQL connection semantics, not an application pool/discard implementation
   or the hosted pooler. Broken connections, setup/cleanup failure and true external
   cancellation need integration tests when that layer exists.
5. Test acknowledged-commit preservation, synchronous failover/fencing and the
   existing RPO 0 requirement against the selected hosted topology. A local
   READ COMMITTED revocation check cannot prove durability across failover.
6. Account provisioning, account/session enforcement, secure mobile session storage,
   durable provider logout/revocation/outbox, retention/deletion, Storage policies
   and product authorization remain separate prerequisites. Nothing here secures
   the app or makes login/product access ready.
