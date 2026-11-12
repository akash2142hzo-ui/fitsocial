# FitSocial Architecture

## 1. Architectural stance

FitSocial will use a **modular monolith**: one FastAPI deployable, one PostgreSQL database, and explicit internal modules. This keeps transactions and operations simple while preserving boundaries that can later be extracted only if real scale or ownership needs justify it. Microservices are not part of the initial design.

The mobile app is a React Native application built with Expo and TypeScript. It communicates with the backend over versioned REST APIs. Supabase supplies authentication and object storage; PostgreSQL is the system of record for application data.

## 2. Proposed repository structure

```text
fitsocial/
├── mobile/
│   ├── app/                         # Expo Router routes/screens
│   ├── src/
│   │   ├── components/              # Shared presentational components
│   │   ├── features/                # Feature-owned screens, hooks, and API clients
│   │   ├── navigation/
│   │   ├── state/
│   │   ├── lib/                     # API client, auth, storage, validation
│   │   ├── theme/
│   │   └── types/
│   ├── assets/
│   ├── tests/
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application factory/entry point
│   │   ├── core/                    # Settings, security, errors, logging
│   │   ├── db/                      # Session, migrations integration, repositories
│   │   ├── api/
│   │   │   ├── deps.py              # Auth and request dependencies
│   │   │   └── v1/                  # Versioned route registration
│   │   └── modules/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── exercises/
│   │       ├── workouts/
│   │       ├── progress/
│   │       ├── social/
│   │       ├── communities/
│   │       ├── media/
│   │       └── moderation/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── security/
│   ├── alembic/
│   ├── pyproject.toml
│   └── .env.example
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── config.toml
├── docs/                            # Optional future ADRs and runbooks
├── .github/workflows/
├── .gitignore
├── README.md
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
└── ROADMAP.md
```

The tree is a proposed target structure, not an instruction to implement all directories now.

## 3. Runtime boundaries

### Mobile

- Owns presentation, local form state, optimistic UI only where safe, and API orchestration.
- Never decides whether a record is authorized to be shown.
- Stores only short-lived session material using platform-secure storage.
- Uses the API for application data and signed URLs or controlled upload flows for media.

### FastAPI modular monolith

- Owns business rules, authorization, validation, transactions, feed queries, moderation, and audit events.
- Modules communicate through typed service interfaces and repositories, not direct cross-module database assumptions.
- Routes remain thin; domain/application services contain use cases.
- All protected routes require validated identity and explicit authorization checks.

### Supabase Auth

- Owns identity lifecycle, password handling, token issuance, and session refresh.
- Backend validates JWT signature, issuer, audience, expiry, and subject.
- Application user profile is linked to the Supabase Auth user ID.

### Supabase Storage

- Stores avatars, post media, community media, and other approved image objects.
- Uploads use a controlled bucket policy and preferably short-lived signed upload URLs.
- Backend validates MIME type, size, extension, image dimensions, and ownership before finalizing a reference.
- Original filenames are not used as storage keys; generated opaque keys are required.

## 4. Authorization model

1. Authenticate the request with a Supabase access token.
2. Load the application user and account state.
3. Apply object-level authorization in the relevant module.
4. Apply relationship rules: visibility, follow approval, community membership, block state, and moderation state.
5. Return only fields allowed for that caller.

PostgreSQL Row Level Security should be enabled for tables exposed through Supabase or direct client access. The backend must still enforce authorization; RLS is defense in depth, not a substitute for application policy. A service-role key must never be shipped in the mobile app and should be used only in tightly controlled server-side operations, if needed.

## 5. Visibility policy

Visibility is evaluated at query time:

- **Private:** owner only, plus authorized moderators when policy permits.
- **Followers:** owner and accepted followers, subject to private-account and block rules.
- **Public:** any non-blocked viewer unless removed or restricted.
- **Community:** members of the relevant community, plus administrators/moderators as defined by policy.

For follower-visible content, the relationship must be an accepted follow at read time; a pending request is not sufficient. For community content, the viewer must have an active membership at read time. A block suppresses access in both directions regardless of public visibility, and suspended/deactivated/deleted accounts cannot create or access ordinary user content. List endpoints must filter inaccessible rows before pagination and counts. Object IDs must not be treated as authorization. Tests must cover direct reads, list reads, nested comments/media, feed queries, relationship transitions, and state changes.

## 6. Data and transaction principles

- PostgreSQL transactions cover multi-row state changes.
- Foreign keys, unique constraints, check constraints, and soft-delete/status fields protect invariants.
- UTC timestamps are stored consistently.
- Cursor pagination is preferred for feeds and activity.
- Indexes follow actual access paths: author/created time, visibility, membership, follow state, and report status.
- Migrations are reviewed and applied through CI/CD; production schema changes are backward-compatible where possible.

## 7. API and error conventions

- REST under `/api/v1`.
- JSON responses use stable resource names and ISO-8601 timestamps.
- Validation errors return field-level details.
- Authorization failures avoid leaking whether a private object exists.
- Errors include a request ID; logs contain structured context without tokens or sensitive body data.
- Idempotency keys are required for retry-prone creation operations where duplicate side effects would be harmful.

## 8. Observability and operations

- `/health/live` checks process health; `/health/ready` checks required dependencies.
- Structured JSON logs with request ID, actor ID when safe, route, status, and latency.
- Audit events cover moderation, verification, account status, visibility changes, and security-sensitive actions.
- Metrics: request latency/errors, auth failures, upload rejection, report backlog, database pool saturation, and job failures.
- Backups, restore testing, migration rollback strategy, incident response, and retention need operational ownership before launch.
- Account deletion is a coordinated workflow across Supabase Auth, profiles, owned content, media storage, sessions, and audit records; it must be implemented as an idempotent server-side operation with a defined retention policy rather than as a client-side row delete.

## 9. Technical risks

- Supabase Auth and a separate FastAPI authorization layer can drift unless token validation and policy tests are centralized.
- Feed queries can become expensive as follows and memberships grow; indexes, cursor pagination, and query plans are required.
- Image processing and abuse prevention can add operational complexity; begin with bounded images and asynchronous processing only when needed.
- User-generated content and verification introduce legal, moderation, and privacy obligations.
- PostgreSQL RLS configuration is powerful but easy to misconfigure; policy tests and migration review are mandatory.
- Health and measurement data may trigger additional regulatory or privacy expectations depending on launch geography.

## 10. Unresolved architecture decisions

- Managed Supabase PostgreSQL versus another PostgreSQL deployment.
- ORM/query approach and migration ownership between Alembic and Supabase migrations.
- Background job mechanism for image processing, notifications, and moderation workflows.
- Error tracking and metrics provider, with a privacy-preserving self-hosted option considered first.
- Exact media transformations and malware/content scanning approach.
