# Backend scaffold

The FastAPI application is intentionally empty. Product modules, authentication, database access, and API routes will be added only after the architecture baseline is accepted.

Use Python 3.13.x. Install the project and development extras intentionally through the selected environment manager; no dependencies are installed by this scaffold.

The current bootstrap exposes only `GET /api/v1/health`. It does not connect to PostgreSQL or Supabase.

## Configuration

Run backend commands from `backend/`; settings load `.env` relative to the working directory. Development and test environments can run without service credentials. See `.env.example` for the supported variable names.

Production requires `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, and a nonempty `SUPABASE_JWT_AUDIENCE` (default: `authenticated`). `SUPABASE_JWKS_URL` is derived from the HTTPS project origin; an explicitly supplied URL must match the derived endpoint. The issuer must match the same project's `/auth/v1` endpoint.

The legacy `SUPABASE_JWT_SECRET` is not supported; remove it from existing dotenv files. This configuration does not implement JWT verification or fetch JWKS. Signing algorithms, cache behavior, session revocation, and authorization remain subject to the authentication architecture and separate implementation approval.

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
