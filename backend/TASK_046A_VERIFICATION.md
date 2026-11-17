# Task 046A - Account/session transaction gate

Date: 2026-11-17. Implemented and deliberately unwired. Offline checks and
assistant-executed fresh disposable PostgreSQL integration passed. Existing routes
are unchanged; this does not make the app secured or login-ready.

## Inspection and implementation

Reviewed the integration plan in `backend/TASK_045E_VERIFICATION.md` section 6,
`backend/pyproject.toml`, `backend/requirements.lock`, the existing settings,
validator/Bearer adapter, migration and disposable SQL contracts.

`backend/app/core/account_transaction.py` adds an optional FastAPI yield dependency
downstream of the existing Bearer adapter. Only its established
`ProviderValidatedIdentity` supplies subject/session. No actor headers, query
parameters, body values, raw JWT parsing or provisioning are introduced.

Each gate opens one fresh Psycopg async connection; there is no pool or cross-request
reuse. Baseline inspection requires idle state, effective/session role exactly
`fitsocial_runtime`, no elevated role flags/INHERIT/other memberships, no recovery
state and no persistent identity. Suspicious state is rejected, not silently reset.
Connection/query/lock/idle-transaction/request deadlines are 3s/3s/1s/10s/10s.

The explicit transaction is READ COMMITTED and READ ONLY. Bound
`set_config('request.jwt.claims', %s, true)` sets canonical sub-only JSON.
The validated subject and session UUID are separate SQL parameters for the existing
account lookup/denial helper. Active account plus exact boolean false is mandatory
before yielding and before every protected read. Expiry is rechecked after
acquisition and per read. Missing/inactive/revoked identity gives generic 401;
configuration/database errors, malformed account/helper results and NULL denial
give generic 503. Other application exceptions/cancellation propagate after cleanup.

The repository scope accepts trusted literal SQL and bound parameters, exposes no
public raw-connection API, and rejects other tasks or use after exit/failure.
Resource-specific authorization remains required. No product operation was added.

Success explicitly commits before exit. Error/cancellation attempts rollback with a
1s cleanup bound; failure/repeated cancellation still reaches synchronous libpq
`pgconn.finish()` in finally. Disconnect aborts any uncommitted transaction.
Connections are discarded after every outcome, never returned to another borrower.
Commit failure gives 503 without retry. This scope permits no persistent mutations.

The gate logs no errors, SQL parameters or DSNs. The Psycopg transaction context was
avoided because its rollback failure path can log raw exceptions. Psycopg's emitting
logger has context-local redaction for DEBUG/cancellation messages, arguments,
exception/stack text and pathname; unrelated tasks and log levels are preserved.
Client errors suppress upstream exception chaining. Future driver changes require
review of this log-safety contract.

## Approved dependency and installation evidence

The user approved Psycopg binary, lockfile regeneration, installation only in the
existing backend virtual environment, and one connection per transaction.
No driver existed in declared/locked dependencies or the interpreter: an
`importlib.util.find_spec` probe returned false for psycopg, psycopg_pool, asyncpg,
sqlalchemy and pg8000 (exit 0). No fake driver layer was built.

Manifest addition: `psycopg[binary]>=3.3,<4.0`. Lock additions only:
`psycopg[binary]==3.3.9`, `psycopg-binary==3.3.9`, and Windows transitive
`tzdata==2026.6`. All pre-existing locked versions are unchanged.

Actual commands from `backend/`:

```powershell
..\.venv\Scripts\pip-compile.exe --extra=dev --output-file=requirements.lock pyproject.toml
..\.venv\Scripts\python.exe -B -m piptools compile --extra=dev --output-file=requirements.lock pyproject.toml
..\.venv\Scripts\python.exe -B -m pip install -r requirements.lock --disable-pip-version-check --quiet
```

The launcher attempt failed before resolution, attempting to decode the executable
as requirements. The Python-module invocation resolved successfully, exit 0;
installation exited 0. No unrelated dependency upgrade occurred.

Initial test collection could not load the binary extension: Windows Application
Control blocked it. No host policy/settings/permissions changed. The documented
pure-Python Psycopg implementation successfully loaded libpq from the already
verified native tool directory. Only verification-process environment selection was
needed, with no additional install or persistent/global setting. The binary package
is installed but its execution is not verified in this managed session.

Sources:
- https://www.psycopg.org/psycopg3/docs/basic/install.html
- https://www.psycopg.org/psycopg3/docs/advanced/async.html

## Actual offline checks: mocked orchestration, not RLS evidence

All commands below ran from `backend/`. `$pgBin` denotes the previously supplied
and verified native bin directory, whose private value is omitted. In actual calls
the known directory was supplied literally. Environment selection was child-process
only, not persistent app/Windows configuration.

```powershell
$env:PSYCOPG_IMPL = 'python'
$env:PATH = $pgBin + ';' + $env:PATH
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider tests ../supabase/tests/test_authenticated_runner.py ../supabase/tests/test_retained_diagnostic.py
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests ../supabase/tests/run_account_gate_integration.py
..\.venv\Scripts\ruff.exe check --no-cache app tests ../supabase/tests/run_account_gate_integration.py
..\.venv\Scripts\python.exe -B -m pip check
```

Final results: **298 passed in 5.38s**, exit 0; mypy no issues in 13 source
files; Ruff passed; pip check reported no broken requirements. This includes
192 pre-existing backend cases, 36 new gate cases, and 70 affected runner/diagnostic
cases. Existing health behavior tests pass. Gate coverage includes parameter
bindings, denial/null/malformed results, wrong-role/replica/contaminated/nonidle
state, expiry delay, connection/commit/rollback errors, repeated cancellation,
task/scope escape, logger/response leakage and real ASGI dependency ordering with
forged actor input. No live provider was invoked. These driver mocks are control-flow
evidence, not actual SQL/rollback/RLS evidence. Initial lint/type findings were fixed
before these final checks. The separate known Windows listener-API limitation is
not changed or silently skipped by a weakened assertion.

## Assistant-executed real disposable PostgreSQL evidence

`supabase/tests/run_account_gate_integration.py` accepts only `--pg-bin`, not an
existing database address/DSN/data directory. It uses the existing authenticated
native runner: fresh private cluster, loopback-only, available nondefault port,
SCRAM authentication and held-process/PID/data/start/server identity checks before
SQL. It replays existing migration/fixtures only into this newly created cluster,
runs the existing SQL matrix and tests the actual gate through Psycopg/libpq.
Cleanup remains verified-owned-server-only. Windows tests explicitly use a Selector
loop; no production event-loop policy or existing route was changed.

Actual command, with the same child-process environment above:

```powershell
..\.venv\Scripts\python.exe -B ../supabase/tests/run_account_gate_integration.py --pg-bin $pgBin
```

Actual assistant-executed runs succeeded, including a final run after logging fixes:
**exit 0**, PostgreSQL 17.6, pure-Python Psycopg with real libpq.

```text
OWNERSHIP VERIFIED: process, PID/data/start and SCRAM SQL match
PASS: disposable preflight (11 true checks)
PASS: migration replay, catalog inventory and privilege assertions
PASS: actual runtime login, RLS, denial helpers and same-backend reuse
PASS: interleaved physical connections and committed-revocation visibility
PASS: real Psycopg runtime gate, bound A/B isolation and closed scopes
PASS: missing/inactive accounts and revoked/expired/mismatched revocations deny
PASS: real privileged login is rejected before actor/protected queries
PASS: real SQL failure/cancellation abort, close and next-request isolation
PASS: gate observes committed revocation in ongoing and fresh transactions
CLEANED: verified owned postmaster stopped; private temporary cluster removed
PASS: disposable account/session gate integration; hosted checks remain separate
```

Additional executable assertions cover SQL-punctuation values passed as parameters,
READ COMMITTED/read-only settings, distinct physical runtime connections, closed
scopes/connections, division-by-zero and statement-timeout 503s, cancelled query
closure and next-request isolation. Earlier SQL matrix assertions test identity reset
on physical connection reuse; this application gate deliberately has no pool/reuse.

This is separate from the user's successful external Task 045E run, recorded with
explicit attribution in `backend/TASK_045E_VERIFICATION.md`. The earlier retained
server was never adopted, contacted, stopped or removed.

## Remaining prerequisites and limits

Hosted Supabase API/schema exposure, deployed runtime role/RLS/grant/TLS/authentication
verification, pooler affinity/reset/cancellation, primary routing/failover and the
default binary-driver path remain unverified. Local SQL does not establish those
properties. Windows async deployment needs a compatible Selector event loop before
route wiring. Fresh-connection cost/concurrency limits require capacity review;
there is no pool. No automatic retry or product authorization policy was introduced.

Account provisioning, account lifecycle enforcement beyond this read gate, durable
logout/revocation writes/provider coordination, retention and secure mobile session
storage remain separate work. The gate relies on the deployed privilege foundation
and trusted repository SQL; runtime SQL injection could substitute identity.
READ COMMITTED checks observe revocations committed before their check, not future
concurrent changes after that check. Persistent mutation support/acknowledgement
semantics require separate design and tests.

No hosted connection, existing database migration, permission change, unrelated
file/photo change, mobile/route change, staging, commit, push or deployment occurred.
