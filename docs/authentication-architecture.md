# FitSocial Secure Authentication Architecture

## 1. Status and scope

- **Stage:** 6 design only
- **Status:** Proposed; implementation requires explicit approval
- **Scope:** Supabase Auth client flow, asymmetric JWT verification, authenticated request context, authorization boundaries, security controls, and tests
- **Out of scope:** Authentication implementation, database migrations, Supabase project creation, product features, social authorization implementation, and production connectivity

This design builds on the approved modular monolith. Authentication establishes who is calling the API. Authorization separately decides what that caller may do or see.

## 2. Security goals and non-goals

### Goals

1. Accept only access tokens issued by the configured Supabase project.
2. Verify asymmetric JWT signatures using Supabase-published JWKS keys.
3. Avoid distributing or depending on the legacy `SUPABASE_JWT_SECRET`.
4. Bind every protected request to the verified JWT subject (`sub`).
5. Make key rotation, unknown keys, network failures, and revoked keys fail closed without misclassifying infrastructure failures as bad credentials; application cache limits do not establish an end-to-end provider revocation guarantee.
6. Prevent access-token, refresh-token, credential, and authorization-data leakage.
7. Keep mobile session handling in platform-protected storage.

### Non-goals

- The backend will not proxy passwords or implement its own password store.
- The backend will not accept a client-supplied user ID as identity proof.
- The backend will not use a Supabase service-role key for ordinary user requests.
- JWT verification will not itself decide ownership, privacy, membership, or moderator permissions.

## 3. Trust boundaries

```text
User
  |
  | credentials / session actions
  v
Supabase Auth  ---- issues access + refresh tokens
  |
  | access token over HTTPS
  v
FitSocial mobile app  ---- stores session using Android secure storage
  |
  | Authorization: Bearer <access token>
  v
FitSocial FastAPI API
  |
  | HTTPS JWKS fetch, public keys only
  v
Supabase JWKS endpoint
```

- Supabase Auth is the issuer and identity lifecycle authority.
- The mobile app is an untrusted token bearer. It may present a token but cannot make it valid.
- FastAPI is the policy enforcement point for API requests.
- PostgreSQL application data and RLS are authorization defenses, not identity issuers.
- The JWKS endpoint publishes public verification keys; it must never be treated as a source of private signing material.

## 4. Mobile authentication flow

### 4.1 Registration

1. The user submits email and password through the Supabase client SDK.
2. Supabase Auth validates the request, applies provider/password policy, and creates or confirms the identity.
3. The client handles email-confirmation state if confirmation is enabled.
4. After a valid session exists, the client calls the backend bootstrap endpoint (future `/api/v1/me` or an explicitly approved profile-bootstrap route).
5. The backend derives the user identity from the verified access token and creates/loads the application profile using that subject.

The mobile app must not send a user ID as proof of the newly created identity. Any profile identifier in a request is a target/resource identifier, never the actor identity.

### 4.2 Login

1. The user submits credentials to Supabase Auth through the client SDK.
2. Supabase returns an access token and refresh token according to the configured session policy.
3. The client stores the session using Android Keystore-backed secure storage through the selected Expo secure-storage integration.
4. API calls send only the current access token in the HTTPS `Authorization` header.
5. On a `401` caused by token expiry, the client performs one serialized refresh attempt through Supabase Auth, updates secure storage, and retries the original request once.
6. If refresh fails, the client clears the local session and returns the user to the login flow.

Credentials must never be sent to the FitSocial API, logged, placed in URLs, or stored in ordinary AsyncStorage, Redux persistence, files, screenshots, clipboard history, or analytics events.

### 4.3 Session restoration

- On app startup, load the session from secure storage through the Supabase client library.
- Treat the local session as untrusted until Supabase/Auth client validation and expiry handling succeed.
- Do not use a locally decoded JWT to authorize UI or API access.
- The API remains authoritative for every protected operation.

### 4.4 Logout and revocation

- User logout runs the coordinated logout workflow below, then clears local secure storage.
- The client must clear in-memory access tokens and pending retry state.
- Logout should be initiated on refresh failure, account deactivation, account deletion, or an explicit security event.

These are three separate controls:

1. **Account suspension/deactivation:** The backend checks the application account status after JWT verification on every protected request. A suspended, deactivated, or deleted account is rejected even when its JWT signature and claims remain valid. This is an account-level control and applies to all sessions for that account.
2. **Logout and refresh-token revocation:** Supabase sign-out and refresh-token revocation prevent session restoration or issuance of new access tokens according to the provider’s session policy. Revoking refresh capability alone does not immediately invalidate an already-issued access token: that JWT remains cryptographically verifiable until its `exp` time unless the backend performs the session-status check below.
3. **Immediate access-token/session revocation:** The backend checks the shared revoked-session registry keyed by the verified `session_id` on every protected request. JWT signature validation alone cannot provide this guarantee.

The immediate-revocation mechanism is mandatory for the first protected authentication release. It must not be described as instantaneous until the registry, write path, durability guarantee, and failure behavior are deployed and verified.

#### Logout coordination

Logout has two independently confirmed effects: Supabase refresh-token/session revocation and backend access-token revocation. They are not one atomic transaction. The preferred order is:

1. **Authenticate the logout request.** Validate the access token, including issuer, audience, expiry, required `session_id`, and account status. Derive the target session only from the verified claims; never accept a client-supplied session identifier. Logout is not a resource-authorization operation: an existing revocation row is treated as an idempotent backend-success state so a client can retry coordination without reopening protected access.
2. **Insert the session into the PostgreSQL revoked-session registry.** In the same database transaction, record a durable pending-revocation intent for the corresponding Supabase session if the selected retry mechanism requires one.
3. **Commit the transaction.** Do not report backend revocation until the registry commit succeeds under the required synchronous durability policy. If insertion or commit fails, return a failure/incomplete outcome and do not claim immediate backend revocation or Supabase revocation.
4. **Ensure subsequent protected requests reject the session.** The committed registry row is the backend revocation point; every later primary status read rejects the session. This does not cancel requests that were already authorized and executing.
5. **Revoke the corresponding Supabase refresh/session capability.** Use the approved server-controlled Auth operation, and record success only from an explicit successful response. A timeout or lost connection is unknown, not success.
6. **Report complete logout only when both operations succeed.** Local token and secure-storage cleanup may occur regardless of remote outcome, but cleanup must not be presented as either remote revocation.

- If registry insertion or commit fails, the backend must not claim immediate access-token revocation. Supabase revocation must not be reported as complete unless it was independently confirmed.
- If registry insertion commits but Supabase revocation fails or is unknown, the session remains blocked for API access. A durable, retryable pending intent is required so Supabase revocation is retried after the request ends; the client must not be told that refresh capability was revoked.
- If a later retry confirms Supabase revocation, the operation may transition to complete. If the retry mechanism cannot confirm success, the logout remains incomplete even though API access is already blocked.
- Retries use idempotent operations, bounded backoff, deduplication by `session_id`, and durable state that survives process and instance failure. A durable outbox/job record written in the same transaction as the registry row is the preferred pattern; an in-memory task or best-effort post-response callback is insufficient.
- No sensitive session, token, or provider response data is exposed in logs or client responses. Logs contain only a redacted operation identifier, outcome category, and retry state.

### 4.5 PostgreSQL session-revocation registry

The authoritative registry is a shared PostgreSQL table reached by every FastAPI instance. It is not a process-local set, a read replica, or a cache. A distributed cache may be added later as a performance optimization only if it cannot cause a revoked session to be accepted; it is not part of this design. This registry is mandatory for v1.

The registry is a revoked-session table with an indexed unique `session_id` key, `revoked_at`, and `token_expires_at`. A successful primary read that finds no row means that the verified session is not revoked. This denylist shape avoids an active row for every session, but it does not permit the API to treat a failed, timed-out, or unavailable read as “not revoked.”

- The registry key is the verified JWT `session_id`; every protected endpoint requires `session_id` to be present and a valid UUID. Missing or malformed `session_id` is an authentication failure. Clients cannot create, activate, update, or clear registry records.
- Every protected request performs a short, primary-database status read after JWT and account validation and before authorization. No positive “session is valid” result may be cached or reused across requests.
- A found, unexpired revocation record is rejected with generic `401`. A successful read with no matching record permits the request to continue. The response must not reveal whether a session was revoked.
- Revocation is an idempotent insert/upsert keyed by `session_id`, recording the revocation time and the token’s `exp` (plus the configured clock-skew allowance). The transaction must commit successfully before the operation reports success.
- “Immediate” means that every authorization check whose registry read begins after the revocation transaction commits observes the committed revocation and rejects the session. It does not mean that a request which already completed its registry read, or was already authorized and executing, is cancelled.
- Concurrent requests are therefore ordered by the registry read and revocation commit. A request whose read began before the commit may finish under the authorization decision it already obtained; a later read must reject. The API must not hold a long transaction or claim that revocation rolls back work already performed.
- Use PostgreSQL `READ COMMITTED` (or stricter) for the short registry read so each read gets a current primary snapshot. Do not use a long-lived transaction, a stale snapshot, or a read replica for this decision. Backend instances share the same primary/authoritative database state.
- Database errors, connection-pool exhaustion, timeouts, failover uncertainty, or inability to establish session status return `503 Service Unavailable` and deny protected access. They must never be interpreted as an absent revocation row.
- **Mandatory architectural requirement, not yet verified:** acknowledged revocation commits must target zero tolerated data loss (RPO 0) under the approved failover model. This is a required design property, not a verified guarantee until the actual PostgreSQL HA topology, configuration, failure detection, promotion, fencing, and recovery procedures are selected and tested.
- **Synchronous commit:** PostgreSQL must use a synchronous commit mode and synchronous standby/quorum policy that ensures the registry commit is durably acknowledged by the required independent failure domain before the client receives success. Asynchronous replicas alone do not satisfy this requirement because promotion could lose an acknowledged revocation and temporarily allow access.
- **Safe promotion and split-brain prevention:** promotion requires an authoritative lease/consensus or equivalent fencing mechanism, a single-writer decision, and confirmation that the promoted standby contains every acknowledged registry commit. The former primary must be fenced or prevented from accepting writes before the new writer is exposed. A standby missing an acknowledged revocation must never be promoted as authoritative; if commit position, writer ownership, or fencing is uncertain, protected checks and revocation writes fail closed with `503`.
- Database failover must preserve the registry’s committed rows under the selected and tested durability policy. Revocation callers must treat a lost connection before commit as unsuccessful/unknown and retry the idempotent operation rather than report success. A lost connection after the server may have committed remains unknown until a subsequent authoritative read confirms the row; it must not be reported as failure or success prematurely.
- Connection pooling must use transaction-scoped work, parameterized queries, bounded acquisition/query timeouts, and rollback-on-release. No session-specific state, authorization decision, or transaction-local setting may leak to the next borrower.
- Retain each revocation row until `token_expires_at` plus the permitted clock-skew allowance; if multiple access tokens can share a `session_id`, use the latest associated expiration. Cleanup is a bounded, retryable job that deletes only rows past that retention point and never runs on the request path. Cleanup failure does not permit access and is observable for operations.
- Every protected request adds one indexed primary point read. This is an intentional consistency and availability cost for immediate revocation; capacity planning must size the primary, synchronous replication path, pool, indexes, and connection limits for that read. Do not introduce a positive-result cache to reduce this cost. If measured load is unacceptable, the team must choose a different strongly consistent design and re-approve the revocation guarantee rather than weaken it implicitly.
- Registry access uses only verified, server-derived claims. The registry does not replace account-status and resource-authorization checks.
- Removing this registry would change the security guarantee and is not permitted for v1; account checks, refresh-token revocation, and token expiry provide only the weaker guarantee described above.

## 5. JWT verification design

### 5.1 JWKS endpoint and configuration

Configured per environment:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
```

`SUPABASE_JWT_SECRET` is not part of this design and must not be required for asymmetric verification.

The JWKS URL should be derived and validated from the configured Supabase project URL rather than accepted from a client request. If an explicit URL override is retained for tests, it must be server-side configuration only and must be allowlisted.

### 5.2 Verification sequence

For a protected request:

1. Read the `Authorization` header.
2. Require the exact `Bearer <compact-jwt>` shape; reject missing, duplicated, malformed, or oversized values.
3. Parse only the protected header and claims needed for verification, without trusting them yet.
4. Require a supported asymmetric algorithm:
   - `ES256` by default;
   - `RS256` only through explicit server configuration after compatibility with the actual provider configuration is verified.
5. Reject `none`, all HMAC algorithms (`HS256`, etc.), `EdDSA`, algorithm/key-type mismatches, and all other unexpected algorithms. The configured algorithm allowlist is server-side and must not be changed by a request.
6. Require a non-empty string `kid`; reject missing, whitespace-only, or oversized values before network access. Enforce a bounded byte length, match the identifier exactly, and never interpret it as a URL or path.
7. Resolve only the JWK whose `kid` exactly matches the token header from the in-memory cache.
8. If that exact `kid` is unknown, allow at most one eligible shared JWKS refresh attempt, subject to the per-project cooldown and failure backoff in section 5.4, then retry that exact lookup once. A request may join an in-flight attempt rather than start another. Apply section 5.6 when refresh is suppressed or unavailable; never guess or fall back to another key.
9. Convert the JWK to a verification key using a maintained JWT library; do not implement cryptography manually.
10. Verify the signature and claims together.
    - An invalid signature using an already-known key returns generic `401` and never triggers a JWKS refresh.
11. Validate:
    - exact configured issuer;
    - expiration (`exp`) and required current-time semantics;
    - `nbf` when present, with a small documented clock-skew allowance;
    - `iat` as a valid timestamp that is not materially in the future beyond the same clock-skew allowance;
    - audience against the configured audience, accepting a matching string or a matching member of an audience array;
    - required subject (`sub`) as a valid Supabase user UUID;
    - `role` exactly equal to `authenticated`;
    - `is_anonymous` exactly equal to the JSON boolean `false` for protected FitSocial endpoints;
    - `session_id` as a valid UUID for every protected endpoint;
    - token type/use claims if the selected Supabase token format provides them and policy requires them.
12. Reject `role=service_role`, `role=anon`, any other role, and tokens without the required authenticated role. Service-role and anon tokens are never accepted as mobile user authentication.
13. Do not trust `user_metadata`, `app_metadata`, or other client-controlled/custom metadata for privileges, roles, ownership, or moderation decisions.
14. Reject a missing, malformed, string-valued, or otherwise non-boolean `is_anonymous` claim for protected endpoints. Do not infer `false` from a missing claim, and do not assume that PostgreSQL’s `authenticated` role excludes anonymous identities.
15. Reject `is_anonymous=true` identities. Anonymous access, if ever introduced, requires a separate explicitly public route policy and must never satisfy `require_authenticated_user`.
16. Load the application account by `sub`.
17. Reject missing, suspended, deactivated, or deleted accounts according to account policy.
18. Query the shared PostgreSQL revocation registry using the verified `session_id`; reject revoked sessions and return `503` when status cannot be determined safely.
19. Return an immutable authenticated-user context to downstream dependencies.

Signature verification must not be split from claim verification. A valid signature from the wrong issuer or audience is not an authenticated FitSocial request.

### 5.3 ES256 and RS256

- ES256 is the enabled-by-default V1 verifier algorithm; this does not assert which algorithm the actual Supabase project uses.
- Enable RS256 only through explicit server configuration after provider compatibility is verified. The actual project's signing algorithm remains unresolved.
- HS256, other HMAC algorithms, EdDSA, and `none` are not enabled or accepted.
- The verifier must support each enabled algorithm only when the selected JWK explicitly declares the corresponding algorithm and key type.
- `ES256` requires an EC P-256 verification key.
- `RS256` requires an RSA verification key.
- Algorithm selection comes from a strict server-side allowlist and the JWK metadata; it is never selected by a client-controlled configuration value. A token using an algorithm that does not match the JWK key type is rejected.
- Tests must exercise both algorithms with test-only generated keys and must reject cross-algorithm substitution.

### 5.4 JWKS cache

Use a process-local snapshot scoped to the configured project/JWKS URL, with exact `kid` lookup. The application cache and Supabase's upstream caches are separate layers.

#### Application freshness and age

- Normal application freshness is **600 seconds**. Maximum application cache age is **900 seconds total**, not an additional 900-second stale interval after freshness expires.
- Measure application elapsed age and refresh scheduling with a monotonic clock. Cache hits and failed refreshes never reset age.
- Retain the last valid snapshot after refresh failure without extending its lifetime. A known key may be used after normal freshness expires only within the permitted application stale interval; at or beyond the maximum age, usable trust must be re-established or protected access fails closed with `503`.
- A successful application fetch may still return an upstream-cached representation. A new download is not evidence that the origin key set was regenerated or that a provider revocation has propagated.
- **Unresolved before implementation:** whether upstream response age can be reliably established, and the final cache-age accounting policy after considering upstream caching. The 600/900-second values define application policy targets; they do not settle representation-age accounting or establish an end-to-end revocation bound. Do not assume that HTTP `Age` headers exist, are sufficient, or permit bypassing/reliably detecting upstream caching.
- No response header may extend the application limits. Any shorter freshness or mandatory revalidation behavior must be accounted for in the final upstream-age policy rather than silently ignored.

#### Supabase upstream caching limitation

Supabase documents a **10-minute edge cache** for its JWKS discovery endpoint and notes that client libraries may cache keys in memory for **another 10 minutes**. Its signing-key guidance describes a **20-minute** multi-level cache cycle, potentially longer with custom setups, and advises ensuring all application caches have picked up a standby key before rotation. Following that guidance, allow at least **20 minutes** around key creation/revocation before relying on propagation; this is a minimum operational planning allowance, not a provider completion guarantee. See [Supabase signing keys: public key discovery and caching](https://supabase.com/docs/guides/auth/signing-keys#public-key-discovery-and-caching).

FitSocial's custom backend has its own cache, not an assumed Supabase-client cache. The provider's guidance does not establish an exact combined bound for this backend; elapsed waiting alone does not confirm propagation. In particular, **900 seconds of application cache age is not a 15-minute end-to-end signing-key revocation guarantee**. A forced refresh may still encounter upstream-cached keys. Do not invent HTTP-header semantics, instantaneous origin revalidation, or guaranteed propagation deadlines.

#### Refresh eligibility and concurrency

- An unknown `kid` permits **at most one eligible shared refresh attempt** per verification request, then one exact lookup. It does not entitle each caller to a separate HTTP request.
- Apply a per-project cooldown of at least **10 seconds** between ordinary refresh starts in each worker. After consecutive failures, use **10, 20, 40, then 60 seconds** of backoff, plus nonnegative additive jitter. Successful validated refresh resets failure backoff; it does not disable the ordinary cooldown.
- Use single-flight refresh per configured project per worker process. Recheck snapshot generation before starting a fetch; concurrent callers share the result and wait only for a bounded duration. Cancellation of one waiter must not cancel the shared fetch. Release coordination state on success, failure, or timeout.
- These controls are process-local: they prevent concurrent and sequential amplification within a worker, not one fleet-wide request. Capacity review must account for the number of workers.
- Do not create unbounded per-`kid` cache or retry state from attacker-controlled identifiers. A recent successful snapshot and refresh outcome can bound repeated absent-key lookups during cooldown; section 5.6 defines the response distinction.
- Missing, whitespace-only, oversized, or otherwise invalid `kid` values never initiate network access. An already-known key's invalid signature never initiates refresh. No legacy-secret fallback is permitted.

#### Resource limits

- Limit the JWKS response to **64 KiB after decompression**, enforcing the bound while reading, and to **16 keys**. Reject over-limit documents rather than truncating them.
- Reject duplicate `kid` values; never choose arbitrarily between duplicate entries.
- Use a **2-second connect timeout** and a **5-second total fetch deadline**, covering response streaming. Do not enable automatic HTTP retries.
- Reject unusable responses without publishing a partial snapshot or extending the last valid snapshot's age. Publish a validated replacement atomically.
- Do not persist private key material. Record bounded metrics for cache outcomes, refreshes, throttling, and failures without raw attacker-controlled identifiers or tokens.

### 5.5 Rotation and revoked keys

- During normal rotation, the cache may contain multiple currently published public keys. Select by `kid`.
- A refreshed JWKS replaces the trusted key set for future verification; it must not append unbounded historical keys.
- When a key is absent from a successfully validated replacement snapshot, remove it from future lookups immediately in that worker. Stale fallback must not resurrect a key from an older snapshot after a successful replacement. A response still containing a key does not prove that provider revocation has not occurred; the response may be upstream-cached.
- Reject tokens whose key has been removed from the trusted snapshot. An independently cached verifier cannot promise instantaneous signing-key revocation or a 15-minute end-to-end bound; application age limits do not eliminate upstream cache delay.
- A signing-key revocation invalidates tokens signed by that key once the verifier no longer trusts the key. User-session revocation is separate: it invalidates a user session or refresh capability and may require an application account/session check, provider revocation behavior, or a server-side denylist. Revoking a user session does not necessarily revoke the signing key, and revoking a signing key does not identify which user sessions must be ended.
- Emergency invalidation requires operator-controlled disabling of the affected `kid` for the configured project, cache invalidation, and trusted refresh coordination across every serving worker. A disabled `kid` must never become trusted again merely because a later JWKS response contains it; disabling remains authoritative until an explicit authorized decision clears it.
- Every serving worker must confirm the required invalidation state before serving protected traffic, including after startup or restart. Workers without confirmed state must not serve protected traffic. Do not claim fleet-wide invalidation until every serving worker has applied it or unconfirmed workers have been removed from service. The operational distribution and confirmation mechanism remains unresolved and must be selected and tested before this guarantee is claimed.
- Check disabled-key state before cache use and when publishing refreshed snapshots so a late refresh cannot undo invalidation. If usable trust cannot be established, fail closed; never use the disabled key as an outage fallback. The procedure must be audited and tested operationally.
- Do not serve indefinitely stale JWKS data during an outage. If the key cannot be confirmed after the bounded stale window, fail closed.
- Do not log tokens, raw attacker-controlled `kid` values, or upstream errors when rotation or revocation fails.

The final age policy, reliable upstream-age evidence, actual provider metadata compatibility, and emergency invalidation mechanism remain unresolved. Supabase's documented waiting guidance is not a guaranteed custom-backend propagation deadline. Token lifetime remains a separate existing decision.

### 5.6 Network failures

- Existing valid cached keys may be used only inside the documented bounded cache window.
- If an eligible shared refresh succeeds but the exact `kid` remains absent, reject with generic `401`. During cooldown, a recent successful snapshot obtained within that cooldown may supply the same absent-key result without another fetch; this can temporarily reject a newly introduced key. If refresh is unavailable or suppressed by failure backoff and there is no usable trusted key or recent successful absence result, return generic `503`. Neither case may accept an unverified or alternate key.
- An expired cache with no successful refresh is an authentication failure, not a successful request.
- If no valid cached key is available and the JWKS service is unavailable, return `503 Service Unavailable`; do not make an authentication infrastructure outage appear to be invalid credentials.
- Return a generic `401` for invalid/missing credentials and a generic `503` for unavailable authentication infrastructure. Do not reveal whether a `401` problem was signature, key lookup, issuer, audience, or claim state.
- Include `WWW-Authenticate: Bearer` on `401` responses and `Cache-Control: no-store` on authentication-error responses, including `503`. Never expose tokens, raw attacker-controlled `kid` values, or upstream errors in responses or logs.
- Record structured internal metrics/error codes without recording tokens or sensitive claims.

## 6. FastAPI authenticated-user dependency

Proposed future interfaces:

```python
class AuthenticatedUser:
    auth_subject: UUID
    account_id: UUID
    account_status: str
    token_issued_at: datetime | None
    token_expires_at: datetime

async def require_authenticated_user(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    ...
```

Rules:

- The dependency is the only supported source of the request actor.
- Route handlers receive `AuthenticatedUser` through dependency injection.
- A path/body/query `user_id` is treated as a resource target and must never override the authenticated actor.
- The dependency must not return a user context when verification is incomplete.
- The context should contain only normalized identity and account-state data needed by authorization.
- Avoid placing raw JWT claims in logs or broad request state.
- Public health and readiness endpoints must not require this dependency.

## 7. PostgreSQL RLS and database authorization

FastAPI’s verified identity does not automatically flow through a separate PostgreSQL connection. PostgreSQL/Supabase RLS will not see the original mobile JWT unless the application explicitly establishes database session context or uses a database access path designed to preserve that identity.

### Option A: transaction-local verified claims with a non-RLS-bypassing role

For each request, after JWT verification and before application queries:

1. Begin a database transaction.
2. Use a restricted database role that does not have `BYPASSRLS` and is not a table owner that bypasses the intended policies.
3. Set transaction-local, server-derived claims such as the verified subject and account ID using a safe parameterized mechanism.
4. Execute all queries that depend on RLS within that same transaction and connection.
5. Roll back or commit, then discard the transaction-local context.

The claims must come only from the verified `AuthenticatedUser`; clients must not set them. Connection pooling must prevent context leakage between requests, and tests must prove isolation when requests execute concurrently. A failed transaction setup must fail closed.

### Option B: explicit server-side authorization predicates

Repositories include authorization predicates directly in every query, for example owner, active relationship, block, membership, moderation, and resource visibility conditions. The actor ID is bound from `AuthenticatedUser`, never from request data. This is easier to reason about in a modular monolith and remains required even if RLS is added as defense in depth.

### Comparison and privileged connections

- Option A can centralize row policy enforcement in PostgreSQL, but requires careful transaction scoping, pool hygiene, policy testing, and operational handling of connection failures.
- Option B keeps policy logic visible in application repositories and is appropriate for complex relationship checks, but every read/write path must use the shared policy helpers and query review process.
- The recommended approach is explicit server-side authorization predicates as the primary control, with Option A/RLS as defense in depth where its transaction semantics can be proven.
- A privileged or `BYPASSRLS` database connection can read or change rows regardless of user policy. It must not be used as if it were user-scoped access, and it must not receive client-controlled identity claims. If privileged access is unavoidable for migrations or tightly controlled service operations, isolate it from request handling, restrict credentials, audit use, and require explicit authorization predicates for any user-derived operation.
- Supabase RLS does not automatically receive the original mobile JWT through a separate FastAPI database connection. Passing a client JWT to PostgreSQL without a deliberate, verified context design is not sufficient and can create confused-deputy or identity-spoofing risks.

### RLS and authorization tests

Test transaction-local context isolation between concurrent requests, rollback/connection reuse, non-RLS-bypassing role configuration, and rejection of any attempt to set context from client input. Test that privileged connections cannot be reached through ordinary request repositories.

## 8. Authorization architecture

Authentication and authorization remain separate layers:

```text
Bearer token
  -> JWT verifier
  -> AuthenticatedUser
  -> account status check
  -> resource policy / relationship policy
  -> repository query with server-owned predicates
```

### Ownership

- Create/update/delete operations derive `owner_id` from `AuthenticatedUser.account_id`.
- A client-provided owner ID is ignored or rejected.
- Reads use an explicit policy query that combines object owner, status, deletion, and caller identity.
- Repositories must not accept caller-controlled SQL predicates or “is_admin” flags.

### Private profiles and follower-only content

- Public profile fields may be returned only after account status, block, and moderation checks.
- Private profile content requires owner access or an accepted follow relationship.
- Pending/rejected follow requests do not grant access.
- A block takes precedence over public visibility, follows, and membership where the approved policy requires suppression.

### Private and follower-only workouts

- `private`: owner only, with narrowly defined authorized moderation access.
- `followers`: owner or accepted follower at read time, subject to block/account status.
- `public`: any eligible non-blocked viewer.
- Plan visibility and session visibility are evaluated independently.
- Nested exercises, sets, notes, history, counts, and media inherit the parent resource policy; an accessible child ID cannot bypass the parent policy.

### Communities

- Public discovery does not imply membership.
- Private-community content requires active membership at read time.
- Pending, rejected, removed, and suspended memberships do not grant content access.
- Community admin/moderator checks use database-backed membership role and active status.
- Role changes, approvals, removals, and verification decisions require explicit policy checks and audit events.

### Administrator and moderator permissions

- Platform staff roles must be server-controlled and not accepted from JWT custom metadata or client payloads without a trusted issuance/governance design.
- Community roles are scoped to a specific community.
- Moderation actions require active staff/community permissions, target validation, reason, and audit event.
- Prevent self-escalation, privilege changes by peers unless explicitly allowed, and actions against the actor’s own staff role.

## 9. Mobile and token security

### Storage

- Store access/refresh session material only through Android Keystore-backed secure storage exposed by the selected Expo integration.
- Do not use plain AsyncStorage for refresh tokens.
- Do not log or persist the `Authorization` header.
- Clear secure storage on logout, refresh-token rejection, account deletion, and security reset.
- Do not include tokens in deep links, push payloads, crash reports, analytics, or screenshots.

### Refresh handling

- Keep one refresh operation in flight per user/session.
- On concurrent `401` responses, queue requests behind the refresh rather than racing refresh-token rotation.
- Retry a failed request at most once.
- If refresh fails or the refresh token is reused/rejected, clear local credentials and require login.
- Never retry non-idempotent mutations automatically unless an idempotency key and operation policy permit it.

### Logout and session revocation

- Local logout is immediate and clears local material.
- The coordinated Supabase/backend logout workflow is attempted, but local cleanup must occur even if the network is unavailable.
- Logout/refresh-token revocation prevents future refresh according to Supabase policy but does not immediately invalidate an already-issued JWT.
- The shared PostgreSQL registry described in section 4.5 is mandatory for v1; its `session_id` check runs before protected authorization.
- The registry must be shared across backend instances, use the authoritative primary rather than a read replica or positive-validity cache, retain revocation entries through token expiry plus clock skew, and fail closed with `503` on database failure.
- Logout is complete only when both Supabase revocation and backend registry insertion are independently confirmed; partial or unknown outcomes remain incomplete and retryable.
- Account suspension/deactivation must block API access independently of token expiry.

## 10. Abuse and transport controls

- Supabase Auth remains responsible for credential verification, password policy, email confirmation, and provider-level brute-force protections.
- The backend should rate-limit protected API requests, token-failure bursts, profile bootstrap, and other abuse-prone endpoints.
- Rate limiting must use a server-controlled identity/IP strategy and avoid treating a client-supplied user ID as identity.
- Use HTTPS in all non-local environments; reject or redirect cleartext deployments at the edge.
- CORS should use an explicit allowlist of approved origins. Never combine wildcard origins with credentials.
- Native Android API calls should use the configured HTTPS API base URL; no insecure cleartext exception should be added.

## 11. Error and logging policy

### Client responses

- Missing or malformed credentials: `401`.
- Invalid signature, issuer, audience, expiry, a key confirmed absent under section 5.6, a disabled key, or other invalid/missing authentication: generic `401`. Unknown-key infrastructure failures follow the `503` rules rather than automatically becoming `401`.
- Unavailable JWKS/authentication infrastructure when no valid cached key is available: generic `503 Service Unavailable`.
- Unable to establish session status because the authoritative revocation database is unavailable: generic `503 Service Unavailable`.
- Logout with either Supabase revocation or backend registry insertion incomplete: a non-success/incomplete outcome; never claim both effects succeeded.
- Logout registry insertion or commit failure: do not claim immediate backend revocation; return a failure/incomplete outcome without exposing session details.
- Authenticated but insufficient authorization: `403`.
- Use `404 Not Found` where private-resource concealment is appropriate and approved by the resource policy.
- Never distinguish “user does not exist,” “token is expired,” “key is revoked,” and “audience is wrong” in public messages.
- Include `WWW-Authenticate: Bearer` for `401` and `Cache-Control: no-store` for authentication errors, including `503`. Public errors must not expose tokens, raw attacker-controlled `kid` values, or upstream errors.

### Logs and metrics

Never log:

- access or refresh tokens;
- `Authorization` headers;
- passwords;
- JWT signatures;
- raw attacker-controlled `kid` values or upstream error messages/bodies;
- full email addresses unless operationally justified;
- private profile, workout, or measurement contents.

Allowed structured metadata includes request ID, route, status, failure category, issuer configuration identifier, latency, and rate-limit outcome. Use bounded server-controlled key references or safe derived correlation identifiers when needed; never log raw attacker-controlled `kid` values. Hash or truncate identifiers where correlation is sufficient and bound metric cardinality.

## 12. Threat considerations

| Threat | Control |
|---|---|
| Forged JWT | Strict ES256 verification; RS256 only when explicitly enabled after provider compatibility verification |
| Algorithm confusion | Fixed asymmetric allowlist and JWK key-type validation |
| Wrong project token | Exact issuer and audience validation |
| Expired/not-yet-valid token | `exp` and `nbf` validation with bounded clock skew |
| Unknown signing key | At most one eligible shared refresh, cooldown/backoff, then exact lookup and fail-closed `401`/`503` mapping |
| Signing-key rotation | `kid` selection, bounded cache, refresh metrics, no legacy-secret fallback |
| Revoked signing key | Bounded application cache, atomic key-set replacement, persistent operator disabling across serving workers; no end-to-end provider propagation deadline claimed |
| Stolen refresh token | Secure storage, serialized refresh, provider rotation/reuse handling, logout cleanup |
| Stolen access token | Short token lifetime, HTTPS, no logging, account-status checks, and the mandatory shared session-revocation registry |
| Revoked access-token session | Shared PostgreSQL `session_id` registry checked on every protected request; primary-only read and fail closed on registry failure |
| IDOR | Actor derived only from verified `sub`; object-level policy queries |
| Private-data enumeration | Filter before pagination and generic `401/403/404` policy |
| Brute force | Supabase Auth controls plus endpoint/IP/device rate limits |
| CORS abuse | Explicit origin allowlist and no wildcard credentials |
| Log leakage | Redaction middleware/structured logging rules and tests |
| JWKS outage | Bounded cached-key use and fail-closed behavior outside the window |
| Mobile extraction | Keystore-backed storage, release hardening, no token analytics or logs |

No design eliminates the risk of a compromised device, malicious accessibility service, rooted device, or stolen active token. These risks require operational monitoring, token lifetime decisions, and incident response.

## 13. Test architecture

### JWT verifier unit tests

Use generated test-only ES256 and RS256 key pairs and a local in-memory/fake JWKS provider:

- valid ES256 token;
- valid RS256 token only when explicitly enabled after compatibility verification; reject it when disabled;
- invalid signature;
- unsupported `alg`, including HS256, EdDSA, and `none`, rejected before network access;
- strict algorithm/key-type/curve matching and malformed supported JWK parameters;
- exact metadata compatibility tests against approved public provider fixtures before enabling an algorithm;
- missing, whitespace-only, non-string, and oversized `kid` rejected immediately without refresh;
- unknown `kid`;
- at most one eligible shared refresh for an unknown key, then exact lookup and `401` if a successful result still lacks it;
- unknown-key cooldown absence results versus unavailable trust returning `503`;
- no refresh after invalid signature with an already-known key;
- refresh still missing key;
- JWKS unavailable with no valid cached key returns `503`;
- expired `exp`;
- future `nbf`;
- invalid future `iat` beyond clock skew;
- incorrect issuer;
- incorrect audience;
- audience accepted as a matching string and matching array member;
- invalid `role`;
- `service_role`, `anon`, and missing `authenticated` role are rejected;
- missing, malformed, string-valued, or `true` `is_anonymous` is rejected;
- `is_anonymous=false` is required for protected endpoints;
- invalid `session_id`;
- missing or malformed `session_id` on every protected endpoint;
- missing/invalid `sub`;
- malformed compact JWT;
- oversized authorization header;
- 2-second connect timeout and 5-second total fetch deadline, including slow streaming;
- no automatic HTTP retries; malformed response and HTTP failure retain the last valid snapshot without resetting age;
- 64-KiB decompressed response limit, decompression expansion, 16-key limit, and duplicate `kid` rejection;
- monotonic 600-second freshness and 900-second total application-age boundaries; cache hits and failed refreshes do not reset age;
- a bounded stale known key can survive a failed refresh only inside the permitted window; maximum age without usable refreshed trust returns `503`;
- upstream-cached successful responses are not treated as proof of origin freshness or a 15-minute revocation guarantee;
- upstream-age accounting and restrictive cache directives tested once their final policy is approved;
- per-project single-flight behavior under concurrent cold starts and unknown-key requests;
- bounded waiter deadlines, one-waiter cancellation isolation, and coordination release after failure;
- at least 10-second cooldown and 10/20/40/60-second failure backoff with additive jitter;
- sequential random-`kid` floods cannot bypass refresh budgets or grow unbounded per-identifier state;
- rotation with old and new `kid`;
- atomic snapshot replacement; removed keys cannot return through stale fallback;
- disabled keys remain rejected even when a later response advertises them;
- invalidation racing with refresh, worker restart, and partial distribution; unconfirmed workers do not serve protected traffic;
- no fallback to `SUPABASE_JWT_SECRET`.

### FastAPI dependency tests

- no `Authorization` header;
- wrong scheme;
- empty bearer value;
- verifier failure maps to generic `401`;
- inability to establish usable JWKS trust maps to generic `503`, not detailed upstream errors;
- `401` includes `WWW-Authenticate: Bearer`; authentication errors include `Cache-Control: no-store`;
- authentication responses/logs never expose tokens, raw attacker-controlled `kid`, or upstream errors;
- verified subject produces the expected `AuthenticatedUser`;
- suspended/deactivated/deleted application account is rejected;
- revoked session is rejected from the shared registry;
- session-status database failure returns `503`;
- protected requests reject missing or malformed `session_id`;
- a request already authorized before revocation is not claimed to be cancelled;
- a registry read that begins after revocation commit rejects the session;
- concurrent authorization and revocation requests have the documented read/commit ordering;
- primary-only reads are used and replica/stale snapshots are not accepted;
- failover uncertainty returns `503` rather than treating the session as active;
- revocation success is not reported until its transaction commits;
- acknowledged revocations survive the approved synchronous failover model;
- asynchronous-only replication cannot satisfy the acknowledged-revocation guarantee;
- cleanup does not delete a revocation before token expiry plus clock skew;
- logout reports complete success only when Supabase and backend outcomes are both confirmed;
- logout partial failure retries idempotently without claiming the missing effect succeeded;
- logout writes a durable retry intent with the registry row in one transaction;
- durable retry survives process and backend-instance failure;
- logout logs and responses do not expose session identifiers, tokens, or provider response data;
- client-supplied user ID cannot replace the verified subject;
- sensitive token material is absent from logs.

### Authorization integration tests

With test repositories/database doubles or an isolated test database:

- owner can access owned private resource;
- another user cannot access it;
- accepted follower can access follower-only content;
- pending/rejected follower cannot;
- public resource is hidden from blocked users;
- active community member can access community content;
- pending/removed member cannot;
- community moderator cannot exercise platform-staff-only permissions;
- inactive role cannot moderate;
- direct child-resource IDs cannot bypass parent visibility;
- list endpoints filter before pagination and counts.
- transaction-local RLS context is isolated between concurrent requests;
- a non-RLS-bypassing role cannot read rows outside its verified context;
- privileged database connections cannot be reached through ordinary request paths.

### Mobile integration tests

- registration/login success and confirmation-required state;
- session restoration from secure storage;
- access-token refresh once on `401`;
- concurrent `401` requests share one refresh;
- refresh failure clears session;
- logout clears secure storage offline and online;
- tokens never appear in analytics, logs, URLs, or error UI.

## 14. Proposed future configuration

Names only; no values or credentials are introduced by this design:

```text
SUPABASE_URL
SUPABASE_JWKS_URL
SUPABASE_JWT_ISSUER
SUPABASE_JWT_AUDIENCE
JWT_ALLOWED_ALGORITHMS
JWKS_CACHE_TTL_SECONDS
JWKS_MAX_STALE_SECONDS
JWKS_EMERGENCY_INVALIDATION_VERSION
JWKS_CONNECT_TIMEOUT_SECONDS
JWKS_READ_TIMEOUT_SECONDS
JWT_CLOCK_SKEW_SECONDS
AUTH_RATE_LIMIT_WINDOW_SECONDS
AUTH_RATE_LIMIT_MAX_REQUESTS
```

`SUPABASE_JWT_SECRET` must not be added to the production authentication design.

The proposed `JWKS_CACHE_TTL_SECONDS` value is 600. Despite its name, `JWKS_MAX_STALE_SECONDS` denotes the 900-second maximum total application cache age, not 900 additional stale seconds. Final age accounting remains blocked on the upstream-age decisions in section 5.4; these proposed controls are not implemented configuration guarantees.

## 15. Dependencies and implementation boundaries

### Mobile

- Existing Supabase client integration will be selected for React Native/Expo.
- Android secure storage integration must use platform-protected storage.
- No auth dependency should expose service-role credentials or embed backend secrets.

### Backend

- A maintained JWT/JWK library must support ES256 and RS256, issuer/audience/expiry validation, and JWK conversion.
- An HTTP client with timeouts and safe response limits is required for JWKS retrieval.
- The existing `httpx2` development dependency is for Starlette TestClient; it is not itself the production JWKS trust mechanism.
- Any new runtime dependency requires compatibility review, lockfile regeneration, and security review.

## 16. Unresolved decisions before implementation

1. Supabase Auth provider configuration beyond email/password.
2. Email confirmation and password-reset UX.
3. Exact access-token lifetime and refresh-token rotation settings.
4. Actual PostgreSQL HA topology, synchronous standby/quorum, synchronous commit mode, fencing/lease mechanism, promotion automation, and failure testing required to verify the mandatory RPO 0 architecture.
5. Supabase Auth provider configuration for the approved server-controlled session/refresh-token revocation operation.
6. Durable retry/outbox storage and worker ownership, retry limits, backoff, and terminal-alert policy for Supabase revocation.
7. Actual Supabase project's signing algorithm; ES256 is the verifier default and RS256 requires explicit configuration after provider compatibility verification.
8. Whether upstream response age can be reliably established, final cache-age accounting after upstream caching, and provider observability; no end-to-end revocation deadline is established by the application limits.
9. JWT `aud` value(s) issued by the selected Supabase project.
10. Whether the backend creates an application profile lazily or through an explicit bootstrap transaction.
11. Rate-limit storage mechanism for the modular monolith and multi-instance deployment.
12. Production CORS origins and edge TLS policy.
13. Secure-storage package selection and Android backup behavior.
14. Staff-role source of truth and emergency revocation process.
15. Account deletion/session invalidation behavior and retention policy.
16. Operational mechanism for distributing and confirming emergency invalidation across every serving worker, including worker admission/restart behavior.
17. Exact provider compatibility for supported JWK metadata, including algorithm declaration, key type, curve, and any signing-use metadata required by the selected verifier.

## 17. Approval gate

Implementation must not begin until the team approves:

- JWT library, final JWKS age accounting against upstream caching, and provider metadata compatibility; the bounded refresh/resource policy is documented but not implemented;
- actual project signing algorithm and any explicitly enabled RS256 support, issuer, audience, and token lifetime;
- operational emergency invalidation distribution/confirmation mechanism and fail-closed admission of serving workers;
- mandatory v1 session-revocation model, including `session_id` validation, logout coordination, RPO 0 durability, and synchronous failover promotion;
- secure mobile storage package;
- production CORS and rate-limit policy;
- staff-role source of truth;
- the full test matrix above.

### Official references

- [Supabase JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts)
- [FastAPI security overview](https://fastapi.tiangolo.com/tutorial/security/)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
