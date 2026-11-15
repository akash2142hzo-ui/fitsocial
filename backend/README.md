# Backend scaffold

The FastAPI bootstrap exposes only `GET /api/v1/health`. There are no product routes, database connections, or authenticated FitSocial sessions.

Use Python 3.13.x. Install the project and development extras intentionally through the selected environment manager; no dependencies are installed by this scaffold.

A standalone online provider-token validator exists in `app/core/token_validation.py`. It is not wired into an API route or the mobile prototype. When explicitly invoked with configuration, it calls the fixed Supabase HTTPS user endpoint; it does not implement FitSocial account/session authorization. Tests use mocked transports, not live Supabase requests.

## Configuration

Run backend commands from `backend/`; settings load `.env` relative to the working directory. Development and test environments can run without service credentials. See `.env.example` for the supported variable names.

Production requires `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, and a nonempty `SUPABASE_JWT_AUDIENCE` (default: `authenticated`). `SUPABASE_JWKS_URL` is derived from the HTTPS project origin; an explicitly supplied URL must match the derived endpoint. The issuer must match the same project's `/auth/v1` endpoint.

The legacy `SUPABASE_JWT_SECRET` is not supported; remove it from existing dotenv files. This configuration does not implement JWT verification or fetch JWKS. Signing algorithms, cache behavior, session revocation, and authorization remain subject to the authentication architecture and separate implementation approval.

`SUPABASE_PUBLISHABLE_KEY` is optional for the health bootstrap and required only to configure the standalone online validator. The example leaves it blank. Never substitute a service-role or secret key. Local JWKS cryptographic verification/caching is not implemented; the online validator delegates token acceptance to the provider before checking returned identity/claims.

## Offline checks

With the existing Python 3.13 environment and dependencies available, run from `backend/`:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider
..\.venv\Scripts\python.exe -B -m ruff check --no-cache app tests
```

On other platforms, invoke the corresponding environment's Python executable. Tests isolate local settings and use in-process clients/mocked provider transports. No database or Supabase connection is required. Passing tests does not establish production readiness or verify the unapplied SQL migrations.

## Dependency workflow

`requirements.lock` is generated from `pyproject.toml` with `pip-tools` and pins the resolved runtime and development dependency versions.

```powershell
python -m pip install -r requirements.lock
python -m pip check
```

Regenerate the lockfile only when `pyproject.toml` changes:

```powershell
python -m piptools compile --extra dev --output-file requirements.lock pyproject.toml
```
