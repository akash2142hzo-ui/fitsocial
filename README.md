# FitSocial

FitSocial currently contains a local-only Expo/React Native prototype, a health-only FastAPI bootstrap, and security architecture and SQL prepared for future integration. It is not production-ready.

## Mobile prototype

Five tabs: Home, Train, Rewards, Feed and Profile. Create Post is a secondary screen. The prototype supports guided selection from 423 exercise records, strength/cardio logging, session history, workout sharing, drafts, discovery/search, fictional trainer/community examples, and local profile/settings preferences.

Mobile session state stays in memory; selected media uses disposable local cache files. Process restart clears session state. There is no real login, backend integration, permanent session persistence, online publication, notification delivery or enforced account privacy. Public/Private is a future preference with no access-control effect. Fictional examples and demo interactions are labeled.

## Repository

| Path | Purpose |
| --- | --- |
| `mobile/` | Native prototype, shared components, local state and colocated tests |
| `backend/` | FastAPI health endpoint, configuration and isolated provider-validator tests |
| `supabase/migrations/` | Prepared, unapplied SQL; not permission to run migrations |
| `supabase/tests/` | SQL inspection scripts and a future hosted verification checklist |
| `migrations/` | Documentation pointer to the single Supabase migration history |
| `docs/` | Authentication/security plans and documentation index |
| `tests/` | Pointer to component-specific test locations |

## Development checks

Use Node 24 and Python 3.13, as declared in the manifests. With dependencies already available, run from `mobile/`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --silent
```

From `backend/`, use the supported virtual environment:

```powershell
..\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider
```

Use equivalent launchers/environment paths on other platforms. These checks do not require a device, Supabase project or database connection. Backend tests mock provider transports; the standalone online validator is not wired into API authentication or the mobile app.

See [setup](SETUP.md), [mobile development](mobile/README.md) and [backend development](backend/README.md) for configuration and limitations. Historical `mobile/TASK_*_VERIFICATION.md` reports retain their original evidence; passing unit tests does not replace native-device or production validation.

## Security and first-push review

Keep real environment files, credential/signing material, dependencies, caches and build outputs untracked. Example environment files contain placeholders only. `.gitignore` does not remove files already tracked or erase Git history.

Review the staged diff and commit identity before a first private GitHub push. Agent/Codex checkpoint refs are local tooling state; do not mirror-push them. This repository contains no configured deployment or claim of production security. See [Task 025A cleanup verification](docs/TASK_025A_VERIFICATION.md) for the maintenance audit and staging plan.

The intended backend and security contracts are documented in [architecture](ARCHITECTURE.md), [database design](DATABASE.md), [API plans](API.md) and [authentication architecture](docs/authentication-architecture.md). They describe future requirements rather than implemented account privacy or mobile authentication.
