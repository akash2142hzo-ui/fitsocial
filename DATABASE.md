# FitSocial Database Design

## 1. Database principles

- PostgreSQL is the application system of record.
- Every table uses a UUID primary key unless a strong reason requires otherwise.
- Store timestamps as `timestamptz` in UTC.
- Use foreign keys and database constraints for invariants.
- Prefer status columns and `deleted_at` for auditable lifecycle changes over destructive deletes.
- V1 uses PostgreSQL in the same Supabase project as Auth. Internal `app_accounts` holds security-critical state linked to `auth.users.id`; profiles remain separate.
- Supabase SQL migrations under `supabase/migrations/` are the sole migration authority; no Alembic history.
- RLS is enabled for relevant tables and tested independently from FastAPI authorization.

## 2. Core entities

### Identity and profiles

#### `app_accounts` (internal security state)

Separate from presentation/profile data. See section 12 for the proposed minimum schema, privileges, provisioning and deletion contract. Only an active internal account can pass the FitSocial account-state check; a missing row denies access and must not be created implicitly by ordinary authentication.

#### `profiles`

`id` (same subject UUID, referencing `app_accounts.id`), `username` (unique), `display_name`, `bio`, `avatar_media_id`, `account_visibility`, `created_at`, `updated_at`.

`account_visibility` is `public` or `private`. Security-critical active/deactivated/suspended/deleted state belongs only to `app_accounts`, not an editable profile field. Final profile-field exposure remains unresolved.

#### `follows`

`follower_id`, `followed_id`, `status` (`pending`, `accepted`, `rejected`), `requested_at`, `responded_at`, timestamps. Unique pair constraint prevents duplicate relationships. Private accounts require approval; blocks are modeled only in `blocks` and take precedence over follows. Add a check constraint preventing self-follows.

#### `blocks`

`blocker_id`, `blocked_id`, `created_at`, unique pair constraint. Application queries exclude blocked relationships in both directions where policy requires.

## 3. Exercise and workout entities

#### `exercises`

Canonical catalogue: `name`, `description`, `instructions`, `muscle_groups`, `equipment`, `source`, `status`, timestamps. Staff-managed records are distinct from personal custom exercises if custom exercises are approved later.

#### `workout_plans`

`owner_id`, `name`, `description`, `visibility` (`public`, `followers`, `private`), `status`, timestamps. Plans may be archived without losing historical sessions. A plan's visibility is independent from the visibility of sessions created from it.

#### `workout_plan_exercises`

`plan_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_weight`, `rest_seconds`, notes. Unique `(plan_id, position)`.

#### `workout_sessions`

`owner_id`, optional `plan_id`, `started_at`, `completed_at`, `visibility`, notes, `status`, timestamps. Visibility is evaluated for every read.

#### `workout_session_exercises`

`session_id`, `exercise_id`, `position`, notes. Unique `(session_id, position)`.

#### `workout_sets`

`session_exercise_id`, `set_number`, `reps`, `weight_value`, `weight_unit`, `duration_seconds`, `distance_value`, `distance_unit`, `completed`, timestamps. Check constraints ensure non-negative values and at least one meaningful measurement where required.

`set_number` is unique within a session exercise. Session exercises and sets cannot be mutated by a user who does not own the parent session. A session must not become visible through a plan or exercise relationship that the session owner did not authorize.

## 4. Progress entities

#### `body_measurements`

`owner_id`, `measurement_type` (`weight` or a controlled/user-defined type), `value`, `unit`, `recorded_at`, `visibility`, notes, timestamps. Exact supported measurement types and visibility defaults remain product decisions.

#### `progress_media` (optional later)

Not required for the first schema. If approved, it must reference controlled media objects and use the same visibility policy as the associated progress record.

## 5. Social entities

#### `posts`

`author_id`, `body`, `visibility` (`public`, `followers`, `community`), optional `community_id`, `status`, `created_at`, `updated_at`, `deleted_at`. A community-scoped post must reference an active membership at creation and read time. A non-community post must have a null `community_id`; a database check constraint should enforce this pairing.

#### `post_media`

`post_id`, `media_id`, `position`, timestamps. Media ownership and post authorization are checked together.

#### `comments`

`post_id`, `author_id`, `body`, `status`, timestamps, `deleted_at`. Parent comments are intentionally omitted from the initial design unless threaded discussion is approved.

#### `post_likes`

`post_id`, `user_id`, `created_at`, unique pair constraint. Counts should be derived or maintained transactionally, never trusted from a client.

## 6. Community entities

#### `communities`

`creator_id`, `name`, `slug` (unique), `type` (`college`, `gym`, `city`, `interest`), `description`, `rules`, `visibility` (`public`, `private`), `verification_status` (`not_requested`, `pending`, `verified`, `rejected`, `revoked`), optional `avatar_media_id`, `status`, timestamps. Only college and gym communities may transition to a verified state.

#### `community_memberships`

`community_id`, `user_id`, `role` (`member`, `moderator`, `admin`), `status` (`pending`, `active`, `rejected`, `removed`), `requested_at`, `responded_at`, timestamps. Unique pair constraint and a check constraint preventing duplicate ownership assumptions. Private communities use `pending` until an authorized administrator approves membership; public communities may create `active` membership directly.

#### `community_verification_requests`

`community_id`, `requester_id`, evidence metadata, `status` (`pending`, `approved`, `rejected`, `withdrawn`), reviewer ID, review reason, submitted/reviewed timestamps. Evidence must not be stored in public fields; access is restricted and audited. Enforce at most one open request per community and require a staff reviewer for approval/rejection.

## 7. Media and moderation entities

#### `media_objects`

`owner_id`, `bucket`, opaque `storage_key`, `media_type`, `byte_size`, width/height, `status` (`pending`, `ready`, `rejected`, `deleted`), checksum, timestamps. Storage keys are never derived from user input. Only `ready` media may be attached to a published resource; attachment ownership and resource authorization must be checked transactionally.

#### `reports`

`reporter_id`, target type and target ID, reason, details, `status`, assigned moderator, resolution, timestamps. A polymorphic target is acceptable initially only with strict target validation and indexes; separate target columns can be introduced if query safety requires it.

#### `moderation_actions`

`moderator_id`, target type/ID, action, reason, duration, metadata, created_at. Append-only audit record.

#### `audit_events`

Actor, event type, target, request ID, safe metadata, and timestamp. Never store access tokens, passwords, or unnecessary personal content.

## 8. Relationship summary

```text
auth.users 1--0..1 app_accounts 1--0..1 profiles
profiles 1--N follows (as follower and followed)
profiles 1--N workout_plans
workout_plans 1--N workout_plan_exercises N--1 exercises
profiles 1--N workout_sessions
workout_sessions 1--N workout_session_exercises N--1 exercises
workout_session_exercises 1--N workout_sets
profiles 1--N body_measurements
profiles 1--N posts
posts 1--N comments
posts 1--N post_likes
posts 1--N post_media N--1 media_objects
profiles N--N communities through community_memberships
communities 1--N community_verification_requests
reports and moderation_actions reference validated targets
```

## 9. Required indexes and constraints

- Unique username and community slug.
- Unique relationship pairs for follows, blocks, memberships, and likes.
- Unique `set_number` within each session exercise and at most one open verification request per community.
- `(author_id, created_at desc)` on posts and `(owner_id, recorded_at desc)` on measurements.
- Membership and follow indexes supporting feed visibility checks.
- Report status/created time index for moderation queues.
- Partial indexes for active memberships, accepted follows, visible posts, and pending verification requests.
- Foreign keys with deliberate delete behavior; do not cascade user deletion into audit records without a retention decision.
- Check constraints for visibility enums, non-negative weights/reps/durations, valid statuses, ordered positions, self-relationship rejection, and post/community pairing.

## 10. Data lifecycle and privacy

- Define account export, deletion, deactivation, soft-delete, and moderation retention before launch.
- Account deletion must revoke sessions, prevent further login, detach or anonymize user-owned content according to the approved retention policy, remove owned media, and preserve only legally required audit/moderation records. The API contract must not promise irreversible deletion until this policy is approved.
- Remove or anonymize personal references only after legal and audit requirements are understood.
- Media deletion must remove both database references and storage objects, with retryable cleanup.
- Backups contain personal data and require access controls, retention, and restore testing.

## 11. Schema decisions still required

- Exact unit model and conversion rules.
- Whether custom exercises are included in v1.
- Whether visibility applies to plans and progress in the same three-state model.
- Whether posts need edit history.
- Whether reporting uses a normalized target table rather than polymorphic references.
- Detailed product-table constraints and deletion ordering after the internal security contract is reviewed. Supabase SQL migrations are the approved migration authority.

## 12. Task 003A: proposed V1 database security contract

**Approved:** same-project Supabase PostgreSQL/Auth, Supabase SQL migrations, and separate internal account state. Task 005A authorizes local preparation of the two security tables, restricted bootstrap and read-only denial helper; section 12.7 is the precise first-migration contract and takes precedence over the broader proposals below. Other administrative, write-helper, worker and retention contracts remain proposals. Nothing has been applied to a database; RLS and hosted failover remain unverified.

### 12.1 Minimum objects and constraints

Use a private `app_private` schema, excluded from exposed Data API schemas and Realtime publications. Do not put these tables in a client-facing schema. All timestamps are `timestamptz`, not null unless stated; all identifiers are server-derived UUIDs. The same valid subject UUID links provider identity, `app_accounts.id`, and a later profile. No dependency on non-public `auth.sessions` structures is proposed.

| Object | Proposed columns and invariants | Foreign keys and indexes |
|---|---|---|
| `app_accounts` | `id uuid` primary key; `status text` restricted to `active`, `deactivated`, `suspended`, `deleted`; `created_at`, `updated_at` default to database time, with `updated_at >= created_at`. Insert must explicitly select initial status; no permissive active default. Only approved administrative operations change status. | `id` references the stable `auth.users.id` primary key, `ON DELETE RESTRICT`, no identifier updates. Primary-key lookup is sufficient for the V1 per-request check. |
| `revoked_sessions` | `session_id uuid` primary key; `account_id uuid`; `revoked_at` default database time; `token_expires_at` records the greatest verified expiry observed for this revoked session. Require `token_expires_at >= revoked_at` for a first insertion; idempotent retries preserve earliest revocation time and never decrease the stored expiry. A stored row denies that session regardless of its recorded expiry. | `account_id` references `app_accounts.id`, `ON DELETE RESTRICT`; index `account_id` for account lifecycle operations. No FK to Supabase-managed session internals. The primary key supplies the mandatory indexed point lookup. |

Retention is deliberately not driven by `token_expires_at` alone: it is an observed lower bound on possible session-token lifetimes, not proof that no later token exists. No expiry-based RLS filter may hide a revocation row. The initial schema has no automatic cleanup job or runtime delete grant.

Coordinated logout additionally needs `auth_outbox` before any logout endpoint is enabled: `session_id uuid` primary key and `ON DELETE RESTRICT` FK to `revoked_sessions.session_id`; fixed operation `revoke_session`; state limited to `pending`, `running`, `succeeded`, `needs_attention`; nonnegative `attempts` default zero; `created_at`, `available_at`; nullable `lease_until` and `completed_at`. Running requires a lease; succeeded requires completion time. Index `(state, available_at)` for bounded job claiming. The account is obtained through the revocation FK, not duplicated in caller-controlled payloads. No arbitrary JSON job payload, JWT, refresh token, credential or upstream response is stored. The provider operation must be established before this outbox can be executable; two security tables alone do not complete logout.

### 12.2 Account lifecycle and Auth synchronization

- **Creation proposal:** a separately credentialed provisioning/admin process explicitly inserts one row after confirming an existing Auth identity through a trusted provider operation. The FK independently requires the Auth UUID to exist. Insert is idempotent on `id` and must never overwrite an existing state, reactivate a disabled account, or turn an authentication request into provisioning. For a small approved cohort, controlled manual provisioning is acceptable; automated signup synchronization is a later bounded task. No Auth signup trigger is required for the minimum proposal.
- **Missing account:** valid online provider validation plus no `app_accounts` row still denies protected access. A missing profile does not replace or invalidate the independent internal-account decision. Provisioning failure leaves access denied and retryable through the controlled process.
- **Suspension/deactivation:** update internal status transactionally using the administrative path; subsequent account-state reads reject it independently of token expiry or provider state. Existing authorized work is not retroactively cancelled. Provider bans do not automatically set or clear internal state; online rejection still denies access. Re-enablement is an explicit administrative action, never an Auth metadata or login side effect.
- **Deletion:** mark internal state `deleted` first and keep access denied while provider deletion, owned data/media cleanup and approved retention actions are coordinated. A normal request cannot undo this state. `ON DELETE RESTRICT` intentionally prevents an out-of-band Auth deletion from silently cascading through internal state, pending outbox work or records still requiring retention.
- **Final erasure remains gated:** a separately reviewed coordinator must resolve pending provider work and approved data/audit retention, then remove dependent rows and the internal account before deleting the Auth user; the gap remains denied because the account row is absent. It must retain durable retry/deletion fencing until Auth deletion is confirmed, so neither a failure nor provisioning automation recreates access. That coordinator/fence is not part of the two-table schema, and must be designed before promising complete account deletion. Dashboard/admin deletion can fail on the FK until this process completes; do not disable constraints to work around it.
- App roles do not read or write `auth.users` directly. Schema migrations reference only its stable primary key. Do not change Supabase-managed Auth roles or session internals. [Supabase user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data) explains supported Auth primary-key references and warns that signup triggers can block signup if they fail; any later trigger needs separate review and tests.

### 12.3 Exact proposed roles and grants

The following names and grants are a review proposal, not provisioned roles. All custom roles are `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, with no privilege-bearing role membership unless explicitly specified. Do not assume `NOINHERIT` prevents `SET ROLE`; test both effective inheritance and switching paths.

| Role | Login/ownership | Exact proposed authority on the minimum objects |
|---|---|---|
| Supabase migration principal | Existing controlled project administrator used only by the Supabase migration workflow | Creates/version-controls application roles, schema, tables, policies and reviewed functions; assigns application object ownership to `fitsocial_owner`. No credentials in API/worker configuration. Actual hosted ability to create roles and transfer ownership is a required deployment capability check, not an assumption. |
| `fitsocial_owner` | `NOLOGIN`; owns `app_private` and its tables, not the narrow runtime functions | DDL owner only; no API/worker membership. Enable and force RLS on every protected application table. Owner authority is a privileged trust boundary, not ordinary request access. |
| `fitsocial_runtime` | `LOGIN`; owns no objects | Database `CONNECT`, `app_private` `USAGE`; `SELECT` only on `app_accounts`; `EXECUTE` only on the reviewed `actor_subject`, `session_is_denied`, and later `revoke_current_session`/`session_revocation_status` entry points. No direct revocation/outbox SELECT or DML; no account INSERT/UPDATE/DELETE. No access to Auth tables, future product tables or other app functions by implication. |
| `fitsocial_security_admin` | Separate `LOGIN`; owns no objects | Database `CONNECT`, schema `USAGE`; `SELECT` and `INSERT` on `app_accounts`, `UPDATE(status, updated_at)` only. Full-account access is an explicit role-specific RLS policy, not `BYPASSRLS`. No DELETE, revocation clearing, outbox mutation or schema creation. Used only by controlled provisioning/suspension tooling, not ordinary requests. Administrative actions need redacted audit evidence; no broad staff UI is included. |
| `fitsocial_guard` | `NOLOGIN`; owns only reviewed security-definer entry points | Schema `USAGE`; SELECT/INSERT and `UPDATE(token_expires_at)` on `revoked_sessions`, SELECT/INSERT on `auth_outbox` when that object is approved; EXECUTE on `actor_subject`. Role-specific RLS allows exactly those operations across required rows. No account modification, DELETE, DDL or Auth access. No application/worker login is a member. |
| `fitsocial_auth_worker` | Separate `LOGIN`; owns no objects; created only with the approved outbox workflow | Database `CONNECT`, schema `USAGE`; SELECT on `auth_outbox` and `revoked_sessions`; UPDATE only of outbox `state`, `attempts`, `available_at`, `lease_until`, `completed_at`. Explicit role-specific read/update policies; no INSERT/DELETE, account mutation or revocation modification. Provider administration credentials belong only to this worker's secret store after the exact provider operation is approved. |

Revoke application-object privileges from `PUBLIC`, `anon`, `authenticated`, `service_role`, and other nonparticipating roles; grant no access to `authenticator`. Do not change platform-wide grants on Supabase-owned objects. Application-role creation in trusted schemas, `TRUNCATE`, `REFERENCES`, `TRIGGER`, ownership and role administration are denied unless expressly listed above; only the controlled migration principal receives required cross-schema reference authority. Revoke default `PUBLIC EXECUTE` on application functions in their creation transaction. Define owner-specific default privileges to keep future tables/functions closed. Sequence grants are unnecessary for these UUID-primary-key objects.

Supabase documents `postgres` as an administrative role and `service_role` as an RLS-bypassing API role; its hosted project administrator is not an unrestricted PostgreSQL superuser. Use a dedicated runtime database login, never a service API key as a database identity or the project `postgres` password for requests. Inspect actual memberships, role attributes, ownership and pooler support in an approved isolated environment. [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles), [hosted privilege limits](https://supabase.com/docs/guides/database/postgres/roles-superuser).

`FORCE ROW LEVEL SECURITY` can subject a plain owner to row policy checks, but the owner can alter/disable policies; superusers and `BYPASSRLS` roles bypass them. Therefore FORCE is supplementary, never evidence that owner/privileged connections are safe for users. Withholding grants does not contain a superuser or an RLS-bypassing role that already has object access. Keep those credentials and memberships outside all request paths. [PostgreSQL row-security semantics](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

### 12.4 RLS identity and function contracts

- Use one canonical transaction-local `request.jwt.claims` JSON object containing only `sub`, set with parameterized local `set_config` after online validation. `actor_subject()` is an invoker-security, read-only reader with no table privileges: invalid/missing/empty/non-UUID context returns no actor or raises, never a default identity. No fallback to legacy settings, caller metadata or session-level claims. Grant its EXECUTE only where explicitly needed by reviewed policies/functions.
- The runtime account SELECT policy exposes only `id = actor_subject()`; it deliberately allows reading that row's non-active status so the application can deny it. Missing identity or missing account never means active. No runtime write policies. The admin role has the explicitly scoped account policies listed above. Product tables later require an active account plus resource rules, but must not create recursive account-table policy dependencies.
- Runtime revocation access is through the point-lookup `session_is_denied(session_id)` security-definer function only. It derives the actor from the canonical setting and returns denied for missing/invalid context, any matching revoked session, or a matching row whose owner unexpectedly differs. A successful authoritative lookup with valid context and no row is the only non-revoked result. Errors/timeouts are not converted to false. This avoids treating an RLS-hidden row belonging to another account as an absent revocation.
- A later `revoke_current_session(session_id, token_expires_at)` entry point derives the actor internally, inserts/upserts its revocation and creates the outbox intent in one transaction; an existing row associated with another account is an error. It cannot un-revoke, change ownership, shorten retention, or execute arbitrary operations. An idempotent retry succeeds for an already revoked own session and does not falsely confirm provider completion. It must not require that the session is currently unrevoked, or logout coordination retries would be impossible.
- A later `session_revocation_status(session_id)` guard entry point may expose only the actor's own local/provider completion state through the matching revocation/outbox rows. It returns no raw rows or provider data and must conceal another account's operation. Complete logout can be reported only from confirmed local commit and outbox `succeeded`, never from local insertion alone. Worker-only updates record provider completion; API workers do not receive provider-admin credentials.
- The backend supplies the session UUID/expiry only from the exact online-validated token; neither is a client-selected resource parameter. PostgreSQL does not independently prove this subject/session pairing from the subject-only setting, and no unstable `auth.sessions` dependency is assumed. Arbitrary SQL under the runtime credential can impersonate a subject or misuse these functions; that trust limitation remains explicit.
- These guard functions need **separate security-definer approval before executable migrations**. Fix trusted name resolution, schema-qualify every object, prohibit dynamic SQL, restrict argument types/operations, revoke generic invocation and ensure only `fitsocial_guard` policies grant their internal reads/writes. Owner/migration credentials must not own the runtime callable functions as a convenient bypass. Missing deployment capability or unreviewed helper means no protected endpoint.

### 12.5 Revocation consistency and retention

- Each protected request performs online provider validation, then a short explicit `READ COMMITTED` primary transaction with the canonical actor, account-state read and indexed session-denial lookup before resource queries. No replicas or positive-validity cache. A successful empty result is meaningful only after valid identity setup and successful lookup. Pool/context failures deny protected work; discard connections whose cleanup cannot be confirmed.
- A revocation becomes effective at confirmed durable commit. A lookup whose statement snapshot starts after that commit must observe it; already-authorized work is not cancelled. Concurrent duplicate logout uses the unique session key, never overwrites an owner, retains earliest revocation time and greatest observed token expiry, and deduplicates its outbox row. Failures roll back both local changes; lost commit acknowledgements are unknown until an authoritative retry confirms state.
- Tokens refreshed before or during provider revocation can share the same `session_id` and expire later than the logout token. The denylist remains effective for all such tokens; online provider acceptance does not override a local revocation. In-flight/new refreshes and provider timeouts cannot justify deleting the row. Auth success is not proof that local logout was undone.
- **Conservative MVP proposal:** disable automated revocation/outbox deletion. This is a temporary engineering safeguard, not an approved indefinite personal-data retention policy. Before public launch, approve a bounded lifecycle: provider session/refresh revocation must be confirmed; establish a trustworthy maximum lifetime for any token minted before that confirmation (including refresh races and configured lifetime changes); retain through the later of greatest observed expiry and that bound, plus clock skew. Pending/unknown provider outcomes, missing lifetime evidence, or active deletion/audit holds prohibit cleanup. A reviewed maintenance operation, not runtime or the outbox worker, would perform any later purge.
- Outbox workers claim bounded batches with transactional locking/leases, perform provider calls outside database transactions, and record confirmed success separately. Completion must compare the claimed attempt/lease so an expired worker cannot overwrite a newer claim. Calls must be idempotent because a crash can occur after provider success but before acknowledgement. Failed/unknown outcomes retry with bounded backoff and remain pending or `needs_attention`; they never reopen backend access or report complete logout. Exact provider per-session revocation, lease/retry constants and alert ownership must be approved before activating this worker. Do not store a bearer token to work around an unverified provider API contract.
- Same-project Supabase hosting does not establish the existing RPO 0/synchronous-failover requirement. Obtain evidence for the selected hosted topology, fencing and acknowledged-commit preservation; otherwise the release claim remains blocked. Do not silently replace that requirement with backups, asynchronous replicas or an ordinary successful SQL commit.

### 12.6 Required integration tests and remaining approvals

Tests must use real isolated PostgreSQL/Supabase with connections authenticated as the actual `fitsocial_runtime` login, not solely `SET ROLE` under an owner connection. Supplementary tests cover the admin, guard and worker paths. Required cases:

1. Supabase migrations replay from an empty application schema; constraints reject invalid statuses, missing Auth/account references, duplicate session IDs, conflicting ownership and invalid timestamps. Internal accounts exist without profiles.
2. Online-valid token plus absent/disabled account denies access; provisioning cannot reactivate or overwrite existing rows; suspended/deleted state remains authoritative despite successful provider validation.
3. A cannot read B's account or enumerate revocations/outbox. Guard lookup detects an unexpected owner mismatch instead of treating a hidden row as absent. Runtime direct DML and unauthorized helper calls fail.
4. Missing/malformed context denies; pool-size-one commit/rollback/cancellation reuse cannot carry A into B or an anonymous transaction; interleaved concurrent requests retain separate identities; setup/cleanup failures discard connections.
5. Runtime cannot assume owner/guard/admin/worker/Supabase bypass roles, disable RLS, create shadow objects, truncate tables or exploit PUBLIC/default privileges. Both ENABLE and FORCE are present; separately demonstrate why owner/superuser connections are not accepted as proof of runtime isolation.
6. The actual connection path reaches the primary. Barrier-controlled lookup/revocation races prove post-commit rejection and documented pre-commit behavior. Duplicate logout is idempotent; revocation/outbox changes roll back together; refreshed tokens remain denied beyond the first token's expiry.
7. Review and test function name resolution, malformed arguments, identity substitution limits and restricted execution. Worker leases survive crashes, provider failure never marks success, and worker privileges cannot clear revocations or alter accounts.
8. Auth deletion is restricted while dependencies exist; incomplete deletion never re-provisions access. Later approved erasure and retry/fencing tests must precede a complete-deletion claim. Cleanup is absent until retention evidence and permissions are approved.
9. Validate actual hosted role/ownership provisioning and effective grants; separately test the existing synchronous durability/failover requirement before claiming RPO 0. Mocked HTTP tests do not establish any of these database properties.

| Still unresolved | Recommended resolution before the corresponding implementation/release |
|---|---|
| Exact role/grant/helper contract proposed above | Review and approve the matrix and narrow guard functions; prove Supabase permits the ownership and role separation in an isolated environment before migrations are accepted. |
| Provider session revocation without durable bearer-token storage | Verify the supported provider administrative operation and scope. Do not activate logout/outbox processing until durable retries can perform that operation safely. |
| Maximum token lifetime, refresh races and deletion/retention policy | Keep cleanup disabled during development; approve a finite evidence-based retention/deletion coordinator and fence before public launch. Do not guess TTL or legal retention periods. |
| RPO 0 on the selected hosted Supabase plan | Obtain provider/topology evidence and test approved failover. If unavailable, explicitly revisit the release requirement with the founder rather than claim compliance. |
| Provisioning automation, worker retry/lease limits, operator audit/alerts | Start with controlled cohort provisioning, not lazy login creation or an Auth trigger; approve bounded operational workflows before broader signup/logout. |
| Profile exposure and staff/moderation authority | Keep profiles out of this minimum schema and approve field/action policies before their launch. |

Future migrations belong only in `supabase/migrations/`, following the [Supabase migration workflow](https://supabase.com/docs/guides/deployment/database-migrations). The root `migrations/` directory remains a pointer; no parallel migration history or live schema change is authorized by this proposal.

### 12.7 Task 005A: first-migration contract

Local SQL: `supabase/migrations/20261112000100_security_foundation.sql`. Review and
verification procedure: `supabase/tests/README.md`. This scope creates only the
two tables, three roles, two functions and SELECT policies; no account provisioning,
logout, write helper, admin role, outbox or worker is included.

- Bootstrap runs as the controlled Supabase `postgres` migration principal in
  database `postgres`. It creates the Auth primary-key FK before transferring the
  private schema/tables to NOLOGIN `fitsocial_owner`. It grants owner and guard
  membership only to the trusted migration principal. Runtime is not a member
  of any role; NOINHERIT alone is not the isolation mechanism. Existing app role
  names/schema abort the migration instead of silently adopting unknown objects.
  Existing all-table publications also block bootstrap; no platform publication
  is modified to work around exposure of private security state.
- Runtime is LOGIN with no password provisioned, non-owner, NOSUPERUSER,
  NOBYPASSRLS, NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOINHERIT. Its explicit
  grants are CONNECT, app_private USAGE, app_accounts SELECT, and EXECUTE on the
  two functions. No direct revocation reads, column writes or security-state
  mutation. Runtime credential provisioning is separate; no credentials in SQL.
- Guard is NOLOGIN with the same restrictive attributes. Its only explicit data
  privileges are SELECT on both tables under named all-row guard SELECT policies.
  Reading accounts is required so missing/non-active accounts deny independently
  inside the helper. Unlike the broader future matrix, no guard INSERT/UPDATE or
  outbox access exists. No API login is a member of guard. Schema CREATE is
  temporarily granted solely for ownership transfer, then revoked before commit.
- `actor_subject()` is STABLE, SECURITY INVOKER, owned by fitsocial_owner; EXECUTE
  is limited to runtime/guard. The canonical transaction-local JSON has only a
  string sub. Missing/invalid context, extra fields, nil UUID or context over 256
  bytes yields NULL. Runtime account SELECT uses that UUID; no valid actor means
  no rows. Reading one's disabled status is allowed solely for explicit rejection.
- `session_is_denied(uuid)` is STABLE, SECURITY DEFINER, owned by fitsocial_guard,
  with EXECUTE granted only to runtime (plus owner's inherent function authority).
  It is deliberately not STRICT: missing/nil session, missing/malformed actor,
  absent or non-active account returns true. An active account plus any matching
  revoked session returns true regardless of stored expiry or owner mismatch;
  only a successful lookup with no row returns false. It never returns NULL.
  Database errors propagate; future callers must deny on errors/NULL, never catch
  and continue. It supplies no independently authenticated session/subject binding:
  the backend must pass the session from the exact provider-validated token.
- Both functions fix search_path to pg_catalog, pg_temp; all relation/function
  references are qualified, with no dynamic SQL or caller-derived identifiers.
  The guard additionally pins row_security=on and has no bypass/owner shortcut.
  No raw input appears in custom exception messages. Errors from PostgreSQL must
  still be safely handled without logging raw parameters or upstream errors.
- All protected tables enable and force RLS. Runtime has only its self-account
  SELECT policy; guard has only the two required SELECT policies. No write policy.
  Revoke generic function EXECUTE and application-object access in the creation
  transaction. New owner/guard function defaults revoke PUBLIC EXECUTE; existing
  Supabase-managed database/schema/extension PUBLIC privileges are preserved and
  explicitly outside the application-object grant claim. Owner can alter RLS and
  postgres/BYPASSRLS remains privileged; those credentials never enter request paths.
- Supported PostgreSQL ownership and definer patterns justify preparing this
  migration, not claiming hosted verification. Read-only preflight checks the
  actual principal's CREATE ROLE, schema CREATE and Auth key reference capability;
  role membership/ownership transfer and actual RLS still need approved isolated
  replay/testing. Any failure rolls back the whole migration, never broadens grants.

The [PostgreSQL ownership rules](https://www.postgresql.org/docs/current/sql-altertable.html),
[secure definer pattern](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY),
and [Supabase platform privilege guidance](https://supabase.com/kb/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c)
support this separation. Do not globally revoke platform PUBLIC access or grant
application roles Auth-schema access to work around deployment restrictions.
No database enforcement, protected endpoint or RPO 0 claim follows from local SQL.
