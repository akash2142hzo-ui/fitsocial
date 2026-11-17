# Task 045B - Offline-tested Bearer authentication adapter

Date: 2026-11-17. This is an unwired HTTP boundary, not a secured application or
login-ready release. All paths below are relative to the repository root unless
the command block explicitly specifies the working directory.

## Baseline and scope

- Inspected `backend/app/core/token_validation.py`,
  `backend/app/core/config.py`, `backend/app/main.py`, backend tests,
  `backend/pyproject.toml` and backend setup/check instructions before editing.
- No applicable `AGENTS.md` was found during baseline inspection; the repository
  search was repeated for this task.
- Initial Git status: ten untracked category photos in `mobile/assets/photos/`,
  no tracked changes and no staged changes. Photo SHA-256 hashes were read before
  implementation and compared at completion; the ten originals were preserved.
- No live provider request, database access, migration, dependency/credential
  change, mobile change, staging, commit, push or deployment was performed.

## Files and implementation

- Added `backend/app/core/bearer_auth.py`.
  `BearerAuthentication` is a callable FastAPI dependency accepting an injected
  `TokenValidator` protocol implementation. `bearer_authentication` is the default
  reusable instance. Future code can import it and use
  `Depends(bearer_authentication)`; no application route does so in this task.
- Added `backend/tests/test_bearer_auth.py`: 112 offline parameterized cases.
  Routes used by these tests exist only in in-process test applications.
- Updated `backend/README.md` with dependency usage and its security boundary.
- Added this verification document.

The adapter reads raw ASGI Authorization header entries, rejects duplicates
before selecting any value, and accepts a case-insensitive Bearer scheme followed
by one or more ASCII spaces and exactly one JWT-shaped ASCII credential. It does
not trim or normalize the token. Leading/trailing whitespace, tabs, controls,
non-ASCII bytes, quotes, comma-combined credentials, additional credentials and
malformed three-segment token syntax are rejected. Credentials exceeding the
existing validator's 8192-byte limit are rejected before invoking it; the exact
limit is accepted by the parser. This validates syntax, not a JWT signature.

Missing/invalid headers never load settings or invoke the validator. Query
parameters, cookies and caller-supplied user/actor/session headers cannot supply
credentials or establish identity. Successful calls return the validator's exact
identity object, with the extracted token passed unchanged to `validate`.

Invalid headers and `InvalidTokenError` map to HTTP 401 with
`{"detail":"Invalid authentication"}` and `WWW-Authenticate: Bearer`.
`TokenValidationUnavailableError`, settings `ValidationError`, and configuration
I/O/encoding failures map to HTTP 503 with
`{"detail":"Authentication unavailable"}`. The latter has no Bearer challenge.
Expected exception chains are suppressed; underlying messages are not copied or
logged. Unrelated programming exceptions propagate rather than being mislabeled
as invalid credentials. The adapter adds no logging and changes no global error
handler, provider validator, settings or existing route.

## Offline evidence

The new tests exercise:

- Dependency injection through FastAPI and real in-process ASGI header handling,
  including duplicate identical, empty and conflicting Authorization entries.
- All ASCII control bytes (0-31 and DEL) in scheme separators and tokens,
  non-ASCII bytes, combined credentials, malformed syntax and size boundaries.
- Missing credentials despite token-shaped query/cookie values or actor headers;
  every rejected-header case records zero validator invocations.
- Accepted mixed-case schemes, ASCII-space separators, unchanged case-sensitive
  token forwarding and identity object preservation despite forged actor input.
- Generic 401/503 mappings, invalid settings, configuration I/O/encoding failures,
  the real unconfigured validator and mocked real-validator upstream failure.
- Captured debug-level logs and responses/headers contain no synthetic token,
  key, upstream host or private-path markers on the tested success/error paths.
  Mapped validator exception messages/formatted tracebacks suppress contaminated
  underlying exception text. No real credentials or private paths are fixtures.
- Unexpected programming errors remain exceptions, not 401 responses.
- Existing health response stays 200 with `{"status":"ok"}`, even with an invalid
  Authorization header. OpenAPI still exposes only `/api/v1/health`; the test
  identity route is absent from the actual application.

Tests isolate process settings and use temporary working directories, injected
fakes or `httpx2.MockTransport`/`httpx2.ASGITransport`. No socket-based client or
database connection is needed. Existing provider tests continue to use mocks.

Exact final commands, run from `backend/` with the existing Python environment:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider
..\.venv\Scripts\python.exe -B -m ruff check --no-cache app tests
..\.venv\Scripts\python.exe -B -m mypy --no-incremental app tests
```

Actual final results:

- pytest: exit 0, **192 passed in 1.97s** (80 existing + 112 new cases).
- Ruff: exit 0, **All checks passed!**
- mypy: exit 0, **Success: no issues found in 10 source files**.

The first sandboxed invocation of each command exited 1 because access to the
existing environment's base interpreter was denied. Approved retries used that
same installed interpreter; nothing was installed. An initial Ruff run found two
overlong test lines, and an initial mypy run found an untyped ASGI header return.
These were corrected before the final checks above. Intermediate pytest runs
passed 190 and 191 cases before additional isolation/redaction coverage was added.

Final repository checks from the repository root: `git diff --check` passed;
`git status --short` and `git diff --name-only` were inspected. Only the README
and the three task additions differ from the baseline. The ten untracked photos
retain their original hashes and untracked status. Nothing is staged.

## Limitations and prerequisites

- Existing application routes remain unchanged and do not enforce this adapter.
  No demonstration endpoint, login UI, product authorization or persistence was
  added. Provider acceptance does not establish access to FitSocial resources.
- Provider validation remains online when explicitly used outside tests; this
  task does not verify live project configuration, signing compatibility,
  credentials, latency, availability or rate limits. Default settings are loaded
  lazily through the existing cached settings accessor, not managed by this task.
- Database roles, grants, RLS, helper behavior and transaction/pool identity
  isolation need actual restricted-login verification in an approved isolated
  environment. Task 005A SQL remains unapplied/unverified by this task.
- Explicit account provisioning, authoritative active-account enforcement,
  primary-database session-denial checks and resource/relationship authorization
  must precede protected product access. No lazy account creation is introduced.
- Secure mobile session storage, refresh coordination and token lifecycle are
  unimplemented. Durable logout needs local revocation, provider coordination,
  retry/outbox handling and the required durability/failover evidence.
- Storage permissions, abuse prevention, account deletion and retention remain
  separate work. Production TLS, total HTTP header limits, rate limiting,
  debug-disabled generic server errors and deployment-wide log redaction still
  require review. Captured test logs do not certify external proxies, telemetry
  or third-party logging. Unexpected exceptions remain the application's error
  handling responsibility; no blanket catch conceals them as authentication
  failures.
