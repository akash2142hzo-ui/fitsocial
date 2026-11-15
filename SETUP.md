# Development Setup and Configuration

This document distinguishes the current local prototype from future service and deployment work. The mobile prototype runs without accounts, a backend connection, persistent storage, or enforced privacy. Backend product authentication and database integration remain planned; the standalone provider validator is not connected to an API route.

## 1. Historical tool inventory

| Tool | Observed state | Use |
|---|---|---|
| Node.js/npm/npx | Available | Expo/React Native tooling |
| Python 3.14 | Available | FastAPI backend |
| Git | Available | Version control |
| Android platform tools / `adb` | Available | Device and emulator communication |
| Docker | Not available | Optional local PostgreSQL/Supabase containers |
| Android Studio | Not verified | Required for Android SDK, emulator, and native build support |

This inventory was recorded during architecture planning, not detected at each run. The project is now scaffolded and has automated tests. Current runtime requirements are defined by `.nvmrc`, `mobile/package.json` and `backend/pyproject.toml`: Node 24 and Python 3.13. A separately installed Python 3.14 does not satisfy the backend's declared Python range. Use the existing supported virtual environment rather than assuming the default `python` is suitable.

## 2. Required installations

### Required for the initial Android/mobile workflow

1. **Node.js LTS and npm** - runs Expo, TypeScript, linting, tests, and package scripts.
2. **JDK version supported by the selected Expo/React Native release** - required for Android builds.
3. **Android Studio** - supplies Android SDK, build tools, emulator, and device debugging.
4. **Android SDK platform/build tools** - compile SDK 37 and target SDK 36 are configured in `mobile/app.json`.
5. **Python 3.13.x** - runs FastAPI and its tooling.

Mobile type/lint/unit checks do not require an Android SDK or a live service. PostgreSQL access and a Supabase project are only needed for separately approved future integration work; they are not prerequisites for the local mobile demo or mocked backend tests. Production must not use a developer database.

### Useful but optional

- Docker Desktop for repeatable local database and service dependencies. It is not required if a managed development PostgreSQL/Supabase project is used.
- A database client such as `psql` for operational inspection.
- An Android emulator or physical Android device.

Install through official installers and the project package managers only when installation is authorized. Do not install dependencies globally unless the chosen tool explicitly requires it. Dependency ranges are in the manifests; `mobile/package-lock.json` and `backend/requirements.lock` record resolved versions. Do not regenerate them as incidental cleanup.

## 3. Environment files

Optional local files can be created from the examples when service configuration is needed:

- `mobile/.env.local`
- `backend/.env`
- `backend/.env.test`

They are already excluded by `.gitignore`. Commit only `.env.example` files containing placeholders. The current mobile prototype does not consume the future service variables below.

## 4. Mobile variables

```text
EXPO_PUBLIC_API_BASE_URL=https://api.example.invalid
EXPO_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-anon-key>
```

The mobile app may contain only publishable configuration. It must never contain a Supabase service-role key, database password, signing secret, or other privileged credential.

## 5. Backend variables

```text
APP_ENV=development
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/<database>
SUPABASE_URL=https://project-ref.supabase.co
SUPABASE_JWKS_URL=https://project-ref.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://project-ref.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_PUBLISHABLE_KEY=
```

These are the supported backend variables. The publishable key is optional for health-only operation and used only by the standalone online provider validator; leave it blank for offline operation. Never use a service-role or secret key. `SUPABASE_JWKS_URL` is optional: it is derived from `SUPABASE_URL`; if supplied, it must exactly match that project's `/auth/v1/.well-known/jwks.json` endpoint. The project URL must be an HTTPS origin, and `SUPABASE_JWT_ISSUER`, when supplied, must match its `/auth/v1` endpoint. A trailing slash on the project URL is normalized.

Production requires nonempty `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, and `SUPABASE_JWT_AUDIENCE` (default: `authenticated`). A JWKS URL cannot be configured without the project URL. `SUPABASE_JWT_SECRET` is unsupported and must be removed from local dotenv files. Unrelated process environment variables are ignored; unknown dotenv entries are rejected.

Configuration validation does not itself authenticate requests. The standalone validator delegates token acceptance to the configured provider's fixed HTTPS user endpoint when explicitly invoked, then checks identity/claims; it is not wired into an API route, mobile login or FitSocial authorization. Local cryptographic JWT verification, JWKS retrieval/caching, rate limiting, CORS, media settings and privileged provider operations remain unimplemented. Do not add their future environment variables to the current dotenv file. The authentication architecture remains the authority for later implementation.

## 6. Test variables

Use an isolated database and test Supabase project or local test doubles:

```text
APP_ENV=test
DATABASE_URL=postgresql+psycopg://<test-user>:<test-password>@<test-host>:5432/<test-database>
SUPABASE_URL=https://test-project-ref.supabase.co
SUPABASE_JWKS_URL=https://test-project-ref.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://test-project-ref.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
```

Tests must not use production data, production credentials, or a developer's personal account.

Development and test settings can omit all service configuration to run the health-only scaffold offline. `.env` is loaded relative to the backend working directory; `.env.test` is not automatically selected. The unit tests isolate local dotenv files and process configuration. The examples above describe future isolated service configuration, not a requirement to create or contact services now.

## 7. Secret handling

- Store secrets in local untracked files or the CI/CD secret store.
- Use least-privilege keys and rotate them after suspected exposure.
- Do not print tokens, passwords, signed URLs, or full request bodies in logs.
- Do not paste secrets into issues, pull requests, documentation, or chat.
- Arrange a reviewed secret scan before publishing repository history; CI integration remains separate work.

## 8. Declared project versions

The current manifests and lockfiles are the source of truth. The following records the project baseline; no package compatibility or security database was contacted for this maintenance task.

- **Expo SDK:** 58
- **React Native:** 0.88.x, as paired by Expo SDK 58
- **React:** 19.3.x, as paired by Expo SDK 58
- **Node.js:** 24 LTS
- **JDK:** 17, subject to the selected Expo/Android Gradle Plugin matrix
- **Android compile SDK:** API 37
- **Android target SDK:** API 36
- **Python:** 3.13.x
- **FastAPI:** declared in `backend/pyproject.toml` and pinned in `backend/requirements.lock` with its transitive dependencies
- **Pydantic:** 2.x, pinned through FastAPI's supported compatibility range
- **PostgreSQL:** 18.x, using the latest supported minor release available from the chosen provider
- **TypeScript:** declared in `mobile/package.json` and resolved in `mobile/package-lock.json`

The installed direct mobile versions match the declared ranges and lockfile. CI and native-device validation remain separate work. Android compile SDK 37 with target SDK 36 is intentional: compile SDK controls build APIs, while target SDK controls runtime behavior and release policy. Python 3.13 is the backend runtime baseline; PostgreSQL 18 remains the architecture target, not evidence of an applied or connected database.

## 9. Current offline checks

With the existing dependencies available, run from `mobile/`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --silent
```

From `backend/`, using the existing supported environment:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider
..\.venv\Scripts\python.exe -B -m ruff check --no-cache app tests
```

Use the equivalent environment Python path and `npm` launcher on other platforms. Backend tests isolate dotenv settings and use in-process clients/mocked transports; no live credentials or service connection are required. The bootstrap exposes only `/api/v1/health`. A standalone provider validator does not make product authentication available.

Supabase SQL under `supabase/migrations/` is prepared source, not an applied schema. Database connections, migration execution, login integration, emulator/device deployment and CI setup require separate work and authorization. The security architecture documents define the intended future behavior, not production readiness of this local prototype.
