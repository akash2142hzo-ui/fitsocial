# Development Setup and Configuration

This document describes the planned development prerequisites. No dependencies or system settings were changed while producing the architecture package.

## 1. Tool inventory observed

| Tool | Observed state | Use |
|---|---|---|
| Node.js/npm/npx | Available | Expo/React Native tooling |
| Python 3.14 | Available | FastAPI backend |
| Git | Available | Version control |
| Android platform tools / `adb` | Available | Device and emulator communication |
| Docker | Not available | Optional local PostgreSQL/Supabase containers |
| Android Studio | Not verified | Required for Android SDK, emulator, and native build support |

The project is empty at this stage. Version pinning should be agreed before scaffolding; do not assume the locally installed versions are the support policy.

## 2. Required installations

### Required for the initial Android/mobile workflow

1. **Node.js LTS and npm** - runs Expo, TypeScript, linting, tests, and package scripts.
2. **JDK version supported by the selected Expo/React Native release** - required for Android builds.
3. **Android Studio** - supplies Android SDK, build tools, emulator, and device debugging.
4. **Android SDK platform/build tools** - exact API level will be pinned when the Expo SDK is selected.
5. **Python version selected by backend support policy** - runs FastAPI and its tooling.
6. **PostgreSQL access** - a managed development database or local PostgreSQL; production must not use a developer database.
7. **Supabase project** - Auth, Storage, and PostgreSQL integration.

### Useful but optional

- Docker Desktop for repeatable local database and service dependencies. It is not required if a managed development PostgreSQL/Supabase project is used.
- A database client such as `psql` for operational inspection.
- An Android emulator or physical Android device.

Install through official installers and the project package managers. Do not install dependencies globally unless the chosen tool explicitly requires it. Exact package versions belong in `package.json` and `pyproject.toml` after architecture approval.

## 3. Environment files

Create local files from the examples after scaffolding:

- `mobile/.env.local`
- `backend/.env`
- `backend/.env.test`

Add all of them to `.gitignore`. Commit only `.env.example` files containing placeholders.

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
```

These are the supported backend variables. `SUPABASE_JWKS_URL` is optional: it is derived from `SUPABASE_URL`; if supplied, it must exactly match that project's `/auth/v1/.well-known/jwks.json` endpoint. The project URL must be an HTTPS origin, and `SUPABASE_JWT_ISSUER`, when supplied, must match its `/auth/v1` endpoint. A trailing slash on the project URL is normalized.

Production requires nonempty `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, and `SUPABASE_JWT_AUDIENCE` (default: `authenticated`). A JWKS URL cannot be configured without the project URL. `SUPABASE_JWT_SECRET` is unsupported and must be removed from local dotenv files. Unrelated process environment variables are ignored; unknown dotenv entries are rejected.

This is configuration validation only. JWT verification, JWKS retrieval/caching, algorithm selection, rate limiting, CORS, media settings, and privileged provider operations are not implemented. Do not add their future environment variables to the current dotenv file. The authentication architecture remains the authority for their later implementation.

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
- Add secret scanning to CI before the first application commit.

## 8. Recommended baseline versions for initial scaffolding

These are the verified baseline for the initial scaffold. The manifests will pin compatible major/minor ranges, while lockfiles will be generated only when dependencies are intentionally installed.

- **Expo SDK:** 58
- **React Native:** 0.88.x, as paired by Expo SDK 58
- **React:** 19.3.x, as paired by Expo SDK 58
- **Node.js:** 24 LTS
- **JDK:** 17, subject to the selected Expo/Android Gradle Plugin matrix
- **Android compile SDK:** API 37
- **Android target SDK:** API 36
- **Python:** 3.13.x
- **FastAPI:** current stable release compatible with the selected Python version, pinned after scaffolding with its transitive Starlette/Pydantic compatibility
- **Pydantic:** 2.x, pinned through FastAPI's supported compatibility range
- **PostgreSQL:** 18.x, using the latest supported minor release available from the chosen provider
- **TypeScript:** current version supported by the selected Expo SDK, pinned in `mobile/package.json`

The requested mobile versions are compatible according to the Expo SDK 58 and React Native 0.88 compatibility guidance. Node 24 is newer than the React Native 0.88 minimum and must be validated in CI with the selected Expo tooling. Android compile SDK 37 with target SDK 36 is intentional: compile SDK controls build APIs, while target SDK controls runtime behavior and release policy. Python 3.13 and PostgreSQL 18 are the backend baselines. No dependencies have been installed.

## 9. Local development sequence after approval

1. Pin Node, Expo, React Native, Python, and Android API versions.
2. Scaffold `mobile/` and `backend/` package manifests.
3. Create development Supabase project and isolated database.
4. Add `.env.example` files and configuration validation.
5. Run migrations and seed only non-sensitive exercise data.
6. Start the backend and verify liveness/readiness endpoints.
7. Start Expo and verify authentication against the development project.
8. Add CI before implementing product modules.
