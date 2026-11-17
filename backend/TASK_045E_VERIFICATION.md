# Task 045E - Local security verification and authorization preparation

Date: 2026-11-17. **User-executed external authenticated native matrix passed.**
The assistant did not execute or independently observe that successful run.
Earlier failed identity comparisons are historical evidence, superseded for the
new disposable run by the user's successful result below.
Earlier managed-session initialization failures remain recorded below as history.
No original migration, SQL assertion, backend route, dependency or credential
configuration was changed. No hosted connection, existing database operation,
Windows elevation/settings change, staging, commit, push or deployment occurred.
The app is not secured, login-ready or production-ready by this work.

## Latest user-executed external PostgreSQL evidence

The user reported executing the authenticated native disposable runner externally
in non-administrator PowerShell and supplied exit code **0** with these results:

```text
PASS: disposable preflight (11 true checks)
PASS: migration replay, catalog inventory and privilege assertions
PASS: actual runtime login, RLS, denial helpers and same-backend reuse
PASS: interleaved physical connections and committed-revocation visibility
CLEANED: verified owned postmaster stopped; private temporary cluster removed
PASS: local PostgreSQL foundation checks; hosted checks remain separate
```

Attribution: **user-executed external evidence**, not assistant-executed tests.
This records real disposable-PostgreSQL matrix results as reported by the user;
the assistant did not inspect the external process, database or cleanup itself.
It does not validate a backend driver/gate/pool, hosted Supabase APIs, pooler,
primary routing, failover, provisioning, mobile sessions or durable logout.
The earlier retained server is separate and was not adopted, stopped or removed.

## Earlier authenticated address mismatch investigation

External read-only diagnostic exit 1 reported only address mismatch; identity,
configuration, path and timing comparisons matched. The original launch handle
remains unavailable; inspected process metadata is not authority to adopt/stop
the retained server. No retained server was contacted or changed in this work.

The runner queried `inet_server_addr()::text` but compared its result to exactly
`127.0.0.1`. PostgreSQL 17 documents that this explicit cast includes the netmask,
so the intended IPv4 endpoint produces `127.0.0.1/32`, which fails that comparison.
This is a demonstrated SQL/consumer representation defect, consistent with the
external observation. No raw external address was supplied or read here; this
does not independently establish the retained server's complete ownership.
Source: https://www.postgresql.org/docs/17/functions-net.html (host/text functions).

Focused fix: query `host(inet_server_addr())`, retaining exact Python equality to
`127.0.0.1`. No generic is-loopback acceptance or arbitrary prefix stripping was
introduced. IPv6 `::1`, IPv4-mapped IPv6, other 127/8 hosts, wildcard/nonloopback
addresses and malformed strings remain rejected. Listening configuration remains
exactly `127.0.0.1`; the per-operation SQL guard still compares the actual inet
value to `'127.0.0.1'::inet`. Exact start-time checks and the original process
handle chain remain unchanged. The companion uses the same corrected query.

Actual commands from backend/:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_disposable_runner.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\ruff.exe check --no-cache app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/diagnose_retained_identity.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/diagnose_retained_identity.py ../supabase/tests/test_retained_diagnostic.py
```

Broader run: 282 passed, 1 failed in 4.72s. The existing real Windows listener
inventory test fails closed with `API=0; state=0; owner_pid_present=True`, the
previously documented Windows API capability failure; no assertion was weakened.
Focused run: 262 passed. Ruff passed; mypy passed (14 source files).
Regression coverage checks the corrected SQL expression, exact SQL guard and
acceptance/rejection cases. These tests do not execute PostgreSQL SQL or prove RLS.

The runner CLI was inspected: native authenticated fresh disposable execution is
`python -B .\supabase\tests\run_disposable_security.py --backend native
--ownership authenticated --pg-bin $pgBin --run` from repository root. This creates
a new test-owned cluster, does not adopt retained resources and requires fresh
ownership confirmation before matrix execution/cleanup. The external command is
ready for rerun; it was not executed here. Retained evidence needs separate
ownership review before any shutdown/removal. No SQL security assertions ran here;
hosted API/pooler/failover and other Supabase-specific checks remain pending.

## Earlier location-validation investigation

The external diagnostic returned `{"run directory":"unsupported location"}`
with exit 2. That old result combined a nonabsolute path, a UNC/device path and
an unsupported/unavailable drive type; it cannot establish which occurred.
No external path or raw evidence was supplied, and no cause is assumed harmless.

The runner uses `tempfile.mkdtemp` beneath its resolved Python temporary parent,
then resolves the new root. Explicit diagnostic selection does not require the
current temporary parent. No demonstrated temp-parent rule mismatch exists.
Ordinary spaces, balanced straight single/double quotes, trailing separators and
forward slashes all pass fixture regressions. Literal input is not evaluated as
PowerShell, nor are environment expressions expanded. Unmatched/typographic
quotes, invalid literal characters and empty/control-character input now receive
specific sanitized reasons. Location rejection distinguishes an absolute
drive-qualified path requirement, network/device paths, unavailable drive type,
unavailable drive root and unsupported network/optical drives. No private values
are included. Root, data, manifest and run-marker protections remain; parent
symlink/junction checks now also reject redirected ancestors before evidence reads.

Exact read-only external CLI remains `python -B
.\supabase\tests\diagnose_retained_identity.py --pg-bin $pgBin --select-run`,
using the previously verified bin directory locally. At the hidden prompt paste
only the full run-root path, optionally surrounded by matching straight quotes.
Do not paste a command, variable, table row, candidate number or the data subfolder.
Selection is not ownership proof, and ambiguous candidates must not be guessed.

Actual offline checks from `backend/` (same exact commands recorded below):
pytest **250 passed in 5.71s**; Ruff passed; mypy passed (14 source files).
These include literal Windows input, each drive rejection and redirected-parent
regressions. Fixtures and injected drive results are not external filesystem or
PostgreSQL evidence. No retained directory was opened by a live diagnostic, no
database connection/cluster/matrix/process stop/permission change/deletion occurred.
The failed external location's precise cause remains pending its revised status.

## Earlier discovery/parsing investigation and private selection

The user reported external diagnostic output:

```json
{"another field (retained evidence access/parsing)": "unavailable"}
```

That earlier catch-all could represent an OSError, ValueError, TypeError or KeyError
at multiple stages. It did **not** prove that no retained directory existed or that
automatic discovery was the failing operation. Its precise external cause remains
unestablished; no raw private evidence is accessible here to identify it retroactively.

### Producer/companion comparison and focused fix

- Both use `tempfile.gettempdir()` and resolve it. Different processes/terminals may
  select different temporary parents due to TMPDIR, TEMP, TMP, defaults or cached
  selection; an actual external difference is a hypothesis, not an established cause.
- The producer writes `owner.json` as UTF-8 with exactly one `token` key and a
  32-character hexadecimal identifier. The directory prefix contains that marker's
  first twelve characters. The revised companion accepts this exact current legacy
  manifest protocol. Explicit version tags are reported unsupported, not guessed.
- The producer's `client-passwords` has two scoped loopback/postgres records (admin
  and runtime) whose port matches PID metadata. Diagnostic readability and syntax
  checks never print their values or consider file presence authentication proof.
- The producer protects its private directory/files with process-user/SYSTEM ACLs.
  The companion previously used file-existence helpers that could suppress permission
  failures, then collapsed later failures into one result. It now uses explicit
  metadata/reads, separates missing from denied/invalid data, and never changes ACLs.
- Automatic discovery uses only one level of the current temporary directory and
  the exact task prefix; there is no drive scan. Multiple usable candidates, or a
  usable candidate plus another denied/invalid uncertain candidate, are not guessed.
- Expected I/O/format failures now report the stage and precise status. Internal
  type/value/missing-field/API-argument failures retain their active stage without
  printing exception messages or evidence values. Process API status is distinguished
  from missing files and malformed JSON. The combined "access/parsing unavailable"
  result has been removed.

Actual local revised diagnostic result, **exit 2**, is now:

```json
{"manifest": "access denied"}
```

This concerns the previously retained managed-session artifact. It does not establish
that the user's external artifact has the same permissions problem. No permission
was widened, evidence changed or privileged access requested to make it readable.

### Exact private directory selection

Added `--select-run`. It uses a hidden `getpass` prompt, never a command-line argument
or printed path, and refuses noninteractive input rather than echoing. The selected
directory may be under a different original temporary parent, but must be absolute,
local, unredirected and match the producer's manifest/name protocol. It must contain
complete PID metadata and readable correctly scoped credentials. All original
process and SCRAM/read-only identity checks still apply. Selecting a folder does
not adopt it, mark ownership confirmed, authorize shutdown or remove any resource.

Use the same external non-administrator context as the run, from the repository
root, with the already verified tool directory held locally in `$pgBin`:

```powershell
python -B .\supabase\tests\diagnose_retained_identity.py --pg-bin $pgBin --select-run
```

The concrete user-facing command supplies the known bin directory directly; its
private value stays out of this report. At the hidden prompt, paste the exact
retained run root containing `owner.json`, `client-passwords` and `data`. Do not
select the PostgreSQL bin directory or the `data` subdirectory. Share only JSON
statuses and the exit code. If access is denied, keep the evidence intact rather
than changing permissions or running as administrator.

### Actual checks and scope

```powershell
# From backend/
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\ruff.exe check --no-cache app tests ../supabase/tests/diagnose_retained_identity.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/diagnose_retained_identity.py ../supabase/tests/test_retained_diagnostic.py
```

- pytest: **233 passed in 2.53s**, exit 0: 192 backend cases, 21 authenticated-runner
  cases, 20 focused discovery/format/permission/selection/redaction cases.
- Ruff: **All checks passed!**, exit 0.
- Strict mypy: **no issues in 14 source files**, exit 0; initial test-only stdlib
  import-visibility findings were corrected without changing runtime behavior.
- Tests cover matching current manifests, missing/denied parents/files, malformed
  JSON/encoding/PID/credential data, unsupported versions, ambiguity including a
  denied second candidate, hidden-input selection across temporary parents,
  noninteractive no-echo refusal, unrelated directory refusal and staged type-error
  redaction. Fixtures are synthetic and no real process/database is accessed.
- CLI help confirms `--select-run`. Its local noninteractive invocation returns a
  precise interactive-input status instead of requesting/echoing a directory.
- Git whitespace/status and baseline fingerprints were reviewed. Only the companion,
  its tests, README and this report changed; runner/SQL/app/credentials/photos did not.

No new cluster, matrix rerun, server stop, retained-resource deletion or SQL operation
occurred. The external identity mismatch is still not assigned to a field. The next
step is the sanitized diagnostic result from the selected original run; acceptance
criteria remain unchanged. Earlier test results and failures below remain history.

## Earlier external identity-mismatch investigation

The user supplied this external non-administrator run result:

```text
AVAILABLE: native PostgreSQL 17.6 (authenticated ownership method)
FAILED: authenticated server identity mismatch; retained
Runner exit code: 2
```

No new cluster run was performed to reproduce it. No server/process was stopped,
adopted or removed, and no retained resource was modified during this investigation.

### Accessible evidence and what can be concluded

A read-only enumeration in this session found exactly one marked task directory:
the earlier initializer-failure evidence. It has no PID metadata, client password
file or server log. The externally launched server's retained directory is not
accessible in this execution context. No actual external failed field can therefore
be named yet. In particular, data directory, port and start time are **hypotheses,
not diagnosed failures**.

The source shows that the generic message follows parsing an authenticated JSON
object and comparing its fields; malformed JSON has a different failure path.
Both startup and cleanup call this check, so the generic message cannot identify
which phase or which comparison failed. Field values/types, Windows path aliases,
separately sampled timestamp precision and process behavior remain to be inspected.
The time comparison already uses whole Unix epoch seconds, not formatted local
times, so a timezone defect is not assumed. A one-second difference remains a
failure; no tolerance was introduced.

Given the supplied complete output, **no SQL security assertions executed**: the
runner calls the matrix only after startup prints ownership verification/startup
success and returns. Neither those messages nor any matrix PASS appears. The
authenticated identity SELECT is SQL, but it is not a database security assertion
or migration replay. If the provided console output omitted stages, that conclusion
must be reassessed from the full sanitized stage list.

### Focused diagnostic changes, not a speculative ownership fix

- `run_disposable_security.py`: extracted the same individual identity comparisons
  into a pure method and added failed **labels only** to future mismatch errors.
  All prior predicates remain required; no data/start/port equality was relaxed.
  Labels distinguish data directory, port, start time and other identity fields.
- `diagnose_retained_identity.py`: new read-only external-context diagnostic.
  It selects exactly one appropriately marked task directory with PID metadata and
  retained credentials in that terminal's OS-temporary directory. Ambiguity, absent
  evidence, redirected entries or access failures block selection.
- The diagnostic opens only a query-limited process inspection handle, verifies
  executable and PID/start-time plausibility, then requires the retained SCRAM
  credentials for a read-only session. It uses a fixed SELECT for identity and
  timestamp observations, checks that process/PID metadata did not change, and
  prints only comparison labels/statuses. No raw identity value, path, credential,
  PID or timestamp is printed or saved.
- Path lexical normalization and timestamp timezone/whole-second observations are
  diagnostic hints only. They do not substitute for the original comparisons or
  authorize a server. The diagnostic does not possess the original launched-process
  handle, does not set `ownership_confirmed`, and never calls cleanup or shutdown,
  even if every observed field currently matches.
- Regression checks verify failed-label redaction and continued refusal of an
  adjacent start second. Diagnostic tests reject ambiguous/unavailable evidence
  without opening a process or adopting a resource. These are offline checks,
  not real retained-server or RLS evidence.

### Actual commands and results

Local diagnostic attempt, with the verified tool directory passed privately:

```powershell
python -B supabase/tests/diagnose_retained_identity.py --pg-bin $pgBin
```

Actual **exit 2**, before any process inspection or SQL connection:

```json
{"another field (retained evidence selection)": "unavailable; retained resources untouched"}
```

From `backend/`, using the existing verified non-administrator Python 3.13 token
and its previously authorized filesystem sandbox override where needed:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\ruff.exe check --no-cache app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/diagnose_retained_identity.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/diagnose_retained_identity.py ../supabase/tests/test_retained_diagnostic.py
```

- Final focused pytest: **215 passed in 4.13s**, exit 0: 192 backend cases, 21 authenticated
  runner cases and two diagnostic cases. This intentionally does not repeat the
  unrelated, known-failing Windows API probe; its earlier failure is not resolved
  or hidden by this focused result.
- Strict mypy: **14 source files, no issues**, exit 0.
- Ruff: **All checks passed!**, exit 0 after diagnostic formatting corrections.
- Git whitespace/status/diff and relative-path hash comparison were reviewed.
  All unrelated source, original SQL and photos remain unchanged; nothing staged.

The live external diagnostic branch cannot be verified here because its evidence
is inaccessible. No migration, ownership-policy or acceptance fix is claimed from
this diagnostic instrumentation alone. Earlier broader test results below are
historical, not a second result for the current focused suite.

### Exact next command: diagnosis only, not another run

In the **same external non-administrator terminal context** that created the
retained server, from the repository root:

```powershell
python -B .\supabase\tests\diagnose_retained_identity.py --pg-bin $pgBin
```

`$pgBin` holds the verified directory locally; its private value stays out of this
report. The user is given the concrete copy/paste invocation directly. Share only
the sanitized JSON and exit code, not raw PID,
password, owner or server-log files. `match`/`mismatch` results identify current
comparisons; `unavailable` means evidence access/selection or authenticated reading
could not be completed. Do not remove retained resources to resolve ambiguity.

No external `--run` rerun is recommended yet: the actual failed comparison and
its cause remain unestablished. A subsequent demonstrated defect must receive a
focused correction/regression check before rerunning the matrix. Hosted Supabase
checks remain pending and no existing unrelated database was contacted here.

## 1. Baseline and contracts

Reviewed Tasks 045B/C/D and their reports, the runner and lifecycle reproduction,
the original migration and SQL checks, backend validator/adapter/settings/tests,
and `DATABASE.md` section 12.7 plus the active authentication/transaction contracts
in `docs/authentication-architecture.md`. No applicable AGENTS.md was found in the
repository or inspected ancestors. Section 12.7's narrow two-table/read-only-helper
contract takes precedence over proposed future admin/write/worker capabilities.

Initial Git state contained previous user-owned changes and untracked files from
045B/C/D plus ten untracked category photos, with nothing staged. A session-memory
SHA-256 manifest covered **299 pre-existing nonignored files**, keyed only by
repository-relative names. No baseline file with private information was created.
Existing PostgreSQL tools were located from the already supplied local directory;
all four version probes report **17.6**. That private directory is not recorded here.

The original migration was not edited. Repository documents call it unapplied, but
external deployment/sharing/immutability cannot be independently established under
the no-hosted-access boundary. Any future SQL correction must preserve it and use
an additive migration unless its deployment history is established separately.
No SQL defect was demonstrated in this task, so no correction was invented.

## 2. Changes made

- `supabase/tests/run_disposable_security.py`: added native
  `--ownership authenticated`, keeping `windows-api` and Docker interfaces.
  Added exact private resource ACL setup/readback, temporary SCRAM credentials,
  authenticated identity confirmation, interruption/evidence handling and safe
  runtime-password setup callback after disposable migration replay.
- `supabase/tests/test_authenticated_runner.py`: **20 new checks** for identity
  mismatches/confirmation, actual private ACLs and paths with spaces, credentials,
  stale metadata/exited handles, uncertain shutdown, interrupted/timed-out startup,
  evidence/password cleanup and successful test-owned cleanup orchestration.
- `supabase/tests/reproduce_listener_lifecycle.py`: one typing-only correction to
  field-name access; no change to its ownership assertion or observed behavior.
- `supabase/tests/README.md`: documented the separate method and current blocker.
- This report: actual results and the scoped authorization integration plan.

No database driver, application pool, provisioning system, product route, login UI,
mobile or Admin Studio behavior was added. SQL files and existing backend tests/source
remain byte-for-byte unchanged. Docker lifecycle remains unchanged and was not run.

## 3. Ownership design, reasoning and limits

The known Windows API state-0 issue was not retried as the implementation strategy.
It remains a separate failing method; unknown states are not accepted as LISTEN.

The new method's intended evidence chain is:

1. Run non-administrator; retain the handle returned from directly launching the
   selected `postgres.exe`. Never adopt an arbitrary PID, port or data directory.
2. Allocate a unique OS-temporary directory outside the repo, deliberately using
   a name containing spaces. Match a per-run marker, absolute parent containment
   and no redirected entries. Generate separate high-entropy admin/runtime secrets.
3. Replace the complete DACL with only the current **process token's** user and
   SYSTEM, protect inheritance and read back principal count, types, rights and
   child inheritance before writing credentials. No user/system-wide ACL changes.
4. Hold an exclusive IPv4 loopback socket to select an available nondefault port;
   release it only immediately before launch. Availability is not ownership proof.
   A competing process can still win that gap: never stop/adopt it or fall back
   to the default port. Each runner has unique resources/secrets, so runs do not
   share credentials, directories or identity markers.
5. Initialize with `--auth=scram-sha-256` and a private password file; then remove
   that initialization file even on failure. HBA accepts only test roles/database
   over `127.0.0.1/32` with SCRAM, rejecting other traffic; sockets are disabled.
   No password value is in argv. A private per-run passfile supplies client secrets.
6. Require client SCRAM via `PGREQUIREAUTH=scram-sha-256`, not just a password file.
   This rejects an unrelated trust-authenticated endpoint before accepting SQL.
   Ambient PG host/options/service/password configuration is cleared. Connections
   have explicit loopback host, port, database and role, bounded timeouts and no
   psqlrc/password prompt. Local synthetic tests do not claim production TLS.
7. Match PID-file PID to the retained live process, data directory, selected port
   and launch-window timestamp. Wait for complete/ready metadata rather than
   interpreting a partial file as success. Startup has a 25-second deadline, with
   individual subprocess/connect/query bounds; failed startup never becomes a pass.
8. Authenticate with the new secret and confirm SQL-reported directory, address,
   port, postmaster start time, expected role/database, listening configuration and
   run marker. Recheck the original process after SQL. Reject any disagreement.
   Subsequent statements verify run/start/port markers on the same authenticated
   endpoint; runtime never gains privileged setting-read permission.
9. Before shutdown, re-establish that combined identity, stop only the validated
   postmaster, wait for its exit and require PID-file disappearance. Validate only
   this run's directory/marker and reject links/junctions before deletion. Preserve
   evidence on uncertainty. No kill-by-port/name or unrelated database connection.

SCRAM/passfile and initdb behavior follow the official
[initdb documentation](https://www.postgresql.org/docs/17/app-initdb.html),
[password-file documentation](https://www.postgresql.org/docs/17/libpq-pgpass.html)
and [require_auth contract](https://www.postgresql.org/docs/17/libpq-connect.html).
The credentials are only for synthetic disposable roles, never existing services.

Threat/coverage limits: the current user and SYSTEM remain trusted, as they can
read the private secrets/control the process. This is not containment of a malicious
same-user process or privileged host. A retained handle/live check and start-time
matching address stale PID files/reuse; a PID file alone is never sufficient.
Interrupted initialization may leave bootstrap children, so its resources are
retained. A launch interrupted before its handle is saved also retains resources.
No live SQL ownership confirmation occurred here; only the design/orchestration
checks and actual file-ACL readback have evidence so far.

## 4. Actual native commands, failure and cleanup

All native attempts used an ordinary non-administrator system Python 3.14.7 for
stdlib-only orchestration. Both it and the backend Python 3.13.17 reported
`IsAdministrator=False`. Backend compatibility remains pinned to Python 3.13.
To reach the existing 3.13 interpreter, tests used the already-authorized filesystem
sandbox override after ordinary launcher access failed. No RunAs, administrator
token, Windows policy or firewall change was requested or used.

From the repository root, with `$pgBin` holding the already supplied private path:

```powershell
python -B supabase/tests/run_disposable_security.py --backend native --ownership authenticated --pg-bin $pgBin --check
python -u -B supabase/tests/run_disposable_security.py --backend native --ownership authenticated --pg-bin $pgBin --run
```

Capability check: **exit 0**, existing PostgreSQL 17.6 tools and non-admin token.
This does not mean live database ownership has been established.

First real run: **exit 2** at `initialize private SCRAM cluster` (child exit 1).
No postmaster, migration or application SQL was launched. Its empty pre-start
resources were removed. The old cleanup text incorrectly claimed server shutdown
despite no server having been launched; that reporting defect was corrected.

A focused diagnostic change retained private initializer output, and one new
attempt captured the exact failure. Second real run: **exit 2**, same initdb stage,
now retaining evidence rather than discarding it. Sanitized underlying errors:

```text
initdb: error: could not create restricted token: error code 87
initdb: error: could not re-execute with restricted token: error code 3
initdb: error: could not create directory <owned path withheld>: File exists
```

The first two errors are the primary execution blocker; the directory message is
an additional initialization symptom, not evidence of targeting an existing user
database. The data directory was under a brand-new uniquely owned parent. Tool help
confirmed `--pwfile`/`--no-instructions` support and the required BKI file exists.
Whether this is Windows/build/binary compatibility or managed-host execution policy
is not established. It is not a migration failure: no migration statement ran.
The unchanged failing startup path was stopped after capturing evidence.

Actual retained resources: **one task-created temporary evidence directory**, with
`owner.json` and `initdb-output.txt` and no data directory, cleartext password or
postmaster PID file. All **three resources** (directory plus two files) received
exact current-process-user/SYSTEM ACLs with successful native readback. Exact
paths/names, SIDs and raw initializer output are deliberately withheld.

Recovery: keep this private initializer evidence for host/runtime diagnosis. It is
not an application database and must not be started/reused. Any later removal
must verify its marker/name-prefix/OS-temporary parent and lack of PID metadata,
then remove only that one task-created resource. Do not prune temp directories or
stop any process found at a port. No server-stop action was necessary in this run.

Practical alternative environment: an ordinary **non-administrator terminal outside
the managed execution host**, using the same extracted tools and the explicit
authenticated command above. This is a new ownership strategy, so it does not
repeat the already-failed Windows-API check. It requires no install/configuration
change and may avoid the initializer execution restriction; success is not assumed.
If the same restricted-token failure occurs there, resolve the binary/host issue
through vendor/runtime diagnosis before another attempt; do not bypass token
restriction or use administrator execution. No environment change was made here.

## 5. SQL security coverage and defects

| Required SQL coverage | Actual state |
| --- | --- |
| Role flags, grants and memberships | Unexecuted |
| Runtime cannot bypass RLS, assume roles or alter protected objects | Unexecuted |
| Missing/malformed subject denial | Unexecuted |
| A/B row isolation | Unexecuted |
| Missing/inactive account denial | Unexecuted |
| Revoked/expired/mismatched-owner session denial | Unexecuted |
| Commit/rollback/cancellation and physical-connection reuse | Unexecuted |
| Helper owner/EXECUTE/search_path | Unexecuted |
| PUBLIC, column/schema and publication exposure | Unexecuted |
| Runtime read/write restrictions, FK/check/unique constraints | Unexecuted |

**SQL security assertions passed: 0; failed: 0.** The matrix never started; nothing
was reported as a skipped pass. The SQL harness has no aggregate assertion counter,
so no prepared-assertion count is invented. Initializer failure is a setup failure,
not a SQL assertion failure. Even eventual psql reuse tests would prove PostgreSQL
transaction behavior, not a future application pool or hosted pooler.

Focused demonstrated defects/fixes:

- Adding grants with icacls left explicit ACL entries for other principals. Native
  replacement/readback now requires exactly the process user and SYSTEM. Actual
  retained-root/file readback and a real directory-with-spaces regression pass.
- Failed initialization initially lost diagnostics/claimed a shutdown. Evidence is
  retained; pre-start cleanup now explicitly says no server was launched. Regression
  checks cover retention, secret-file removal and accurate cleanup reporting.
- Timeout/interruption before acquiring a postmaster handle must not imply safe
  deletion. Initializer/launch uncertainty now retains resources; tests cover both.
- Strict mypy exposed a pre-existing ctypes-field tuple-unpacking issue in the
  diagnostic. Indexing the field name fixes typing without changing behavior.
- A root-directory Ruff invocation misclassified existing backend imports. Correct
  checks run from `backend/`; unrelated imports were not rewritten to satisfy the
  wrong invocation. New-code formatting findings were corrected.

No migration/contract policy defect was established. Permissions/RLS were not
broadened, disabled or altered to force a pass. The old state-0 API failure remains
visible and is not masked with skip/xfail or declared fixed by the new method.

## 6. Concrete backend authorization integration plan

This is a design/acceptance plan, not implemented enforcement. Current application
behavior is still health-only; the Bearer dependency remains unwired. Proposed
separate work: a read-only account/session transaction gate with no product route.

### Trusted input and connection boundary

- Use only `ProviderValidatedIdentity` returned by `BearerAuthentication` after
  `OnlineTokenValidator` acceptance. Its UUID `subject` is bound to the provider's
  returned user; `session_id`, issued/expiry times and required claims have been
  checked. None authorizes FitSocial access yet. Do not derive identity from user
  headers, body/query/path IDs, user metadata or a locally parsed unaccepted JWT.
- Hold that immutable subject/session pair for the request. Recheck expiry before
  starting protected work after acquisition delays; use bounded request deadlines.
- In a separately reviewed dependency task, select compatible Psycopg 3 async
  connection/pool packages and update the lock intentionally. None is installed
  here. `AsyncConnectionPool` is a candidate, with explicit lifespan open/close,
  bounded acquisition/query/reset and no implicit startup at import time. Official
  [pool lifecycle documentation](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)
  describes context/reset behavior; it is not proof of the application's cleanup.
- API workers receive only restricted runtime credentials. Never use postgres,
  owner, guard, service-role or provisioning credentials in request paths. Verify
  effective role attributes/memberships and primary routing on configured connections;
  do not infer that a username string or NOINHERIT alone guarantees isolation.

### One verified request, one explicit transaction

1. Authenticate before acquiring a database connection. An invalid Bearer request
   must acquire zero connections. Infrastructure/configuration failure denies work.
2. Acquire one healthy runtime connection; reject/discard unexpected nonempty
   persistent `request.jwt.claims`, non-idle state or wrong role. Do not silently
   erase suspicious session identity and continue under another user.
3. Begin explicit short **READ COMMITTED** primary transaction. Serialize all work
   on that request-owned connection; never share it with another asynchronous task.
4. Parameterize canonical normalized subject JSON with `set_config(..., true)`.
   Session identity remains the verified UUID argument to the denial helper, not an
   extra JSON field: the current actor reader accepts only `sub`. No raw JWT,
   role flags, second caller-controlled identity or new canonical GUC is introduced.
5. Read the actor's account state and call the denial helper in that same transaction.
   Only active account plus exact boolean false permits an authorized repository
   operation. Repository entry requires the initialized transaction object, not
   direct pool access; product ownership/relationship checks remain additional work.
6. Commit successful work before reporting confirmed mutation success; rollback on
   errors/timeouts/cancellation. No background task borrows the request transaction.
   Release only after proven idle/clean state; discard on cleanup failure/uncertainty.

Illustrative SQL shape for future driver binding (not executed/added to the app):

```sql
SELECT pg_catalog.set_config('request.jwt.claims', %s, true);
SELECT id, status FROM app_private.app_accounts WHERE id = %s;
SELECT app_private.session_is_denied(%s::uuid);
```

Bindings are server-produced `{"sub": normalized_verified_subject}`, that same UUID
and the exact verified session UUID. They are driver parameters, never interpolated
SQL or client authorization predicates. Database subject context is trusted backend
input, not independent JWT verification; SQL injection under runtime remains a
serious identity-substitution risk.

### Denial, failure and release behavior

| Condition | Proposed behavior |
| --- | --- |
| Missing/non-active internal account | Generic 401; no implicit creation/reactivation |
| Denial helper returns true | Same generic 401; do not reveal revocation reason |
| Helper returns exact false and account active | Gate may yield scoped transaction; resource authorization still required |
| NULL/unexpected result, missing schema/helper, query/pool/primary failure | Generic 503; no empty-result interpretation as success |
| Resource policy denial | Future endpoint's non-disclosing 403/404 policy, separately specified |
| Lost commit acknowledgement | Unknown outcome/503; do not blindly retry mutations |

Cancellation cleanup must itself have a bounded protected execution path. Rollback
must complete or the connection must close/discard; merely calling rollback in a
cancelled task is not proof. Verify driver transaction status and identity baseline
without leaving an implicit transaction open. Repeated cancellation, rollback/reset
failure and broken sockets must never return the connection to another borrower.
Log only safe stage/correlation/error-class/SQLSTATE metadata; never log driver
exceptions containing connection strings, query parameters, tokens or private paths.
Preserve the adapter's generic provider 401 versus availability 503 distinctions.

### Provisioning, logout and pooler prerequisites

Account provisioning is a separate trusted administrative responsibility after Auth
identity confirmation, idempotent without overwriting disabled status. The first
migration supplies no provisioning/admin write role, outbox or logout coordinator.
A missing account denies until that separate capability exists; profile completion
does not substitute for internal security state.

Durable logout requires reviewed revocation writes and provider retry/outbox
coordination, safe administrative API scope, verified token lifetime/retention,
idempotency/leases and the required acknowledged-commit/failover guarantees. The
read-only denial helper neither implements nor proves those operations. No cleanup
may treat stored token expiry as proof a session can no longer issue tokens.

Direct PostgreSQL behavior does not establish Supabase pooler transaction affinity,
role login, TLS, cancellation/reset semantics, primary routing or prepared-statement
compatibility. Test the exact deployed path separately before protected release.

### Acceptance checks for the next implementation task

After a real restricted-login SQL baseline and separate driver review:

1. Invalid/provider-unavailable Bearer requests never touch the pool; forged actor
   fields cannot affect SQL bindings. Verified subject/session/expiry are preserved.
2. Real runtime login has required flags/no escalation; owner/migration connections
   cannot enter the request gate. Replica/wrong-role/contaminated sessions deny.
3. Active A/unrevoked session yields only A; active B sees B. Auth-only/missing and
   every inactive status deny; revoked/expired/mismatched-owner registry rows deny.
4. Null/helper error/timeout/schema drift fail closed. Generic errors/log captures
   reveal neither secrets nor why authentication was rejected.
5. Pool size one: A then B then anonymous after commit, rollback, setup failure and
   cancellation; no identity leak. Interleaved multi-connection A/B remains isolated.
6. Cancel during setup/query/commit/rollback/reset; broken connection and repeated
   cancellation discard uncertain state. Protected access before setup, after close,
   via autocommit or another task/connection is rejected.
7. Verify actual bound parameters and same connection throughout the transaction;
   no side-effect provisioning, revocation write, product route or positive-validity
   cache appears. Treat unit fakes as orchestration evidence, never RLS evidence.
8. Preserve health behavior and run the real deployed pooler-path tests separately.

## 7. Exact automated checks and final scope

Run from `backend/` using the existing non-administrator Python 3.13.17 environment:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_disposable_runner.py ../supabase/tests/test_authenticated_runner.py
..\.venv\Scripts\ruff.exe check --no-cache app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_disposable_runner.py ../supabase/tests/reproduce_listener_lifecycle.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_disposable_security.py ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_disposable_runner.py ../supabase/tests/reproduce_listener_lifecycle.py
```

- Final pytest: **exit 1; 232 passed, 1 failed in 7.29s**. All **192 backend cases**
  and **20 new authenticated-runner cases** pass. The prior common runner suite has
  20 passes and its **one pre-existing real Windows API state-0 failure**. It remains
  visible; no test was skipped/xfail-masked to make a green report.
- Ruff: **exit 0; All checks passed!** after new-code formatting corrections.
- Strict mypy: **exit 0; no issues in 14 source files**. The diagnostic tuple typing
  fix is included. Initial lint/type findings and focused fixes are described above.
- Focused first ownership suite passed 11 cases, then expanded to cover observed
  defects. These unit tests and actual ACL readback are not database security proof.
- Git whitespace, final status/diff and relative-name hash comparison were reviewed.
  All unrelated baseline files/photos remain unchanged; nothing is staged.
- No unrelated mobile suites were rerun because no shared/mobile code changed.

Supabase-specific evidence remains entirely pending: hosted restricted-admin role/
FK/ownership capabilities; effective platform memberships/PUBLIC grants; exposed
Data API schemas and Realtime publications; runtime direct/pooler login/TLS and
transaction affinity; primary routing and failover/RPO 0. Local SQL would not prove
these, and this task did not even reach that local SQL stage.

**Next smallest implementation task:** once a working isolated environment yields
the real SQL baseline, implement only the read-only restricted account/session
transaction gate and its real pool-isolation tests, under a separate driver/lockfile
review. Leave it unwired to product routes. Immediate execution prerequisite is
the authenticated run in a working non-admin context, not another unchanged retry
of the Windows TCP-state probe or an invented security pass.
