# FitSocial Secure Authentication Architecture

## 1. Status and scope

- **Stage:** Architecture plus V1 online-validation foundation
- **Implementation status:** reusable online-validation foundation only; no protected endpoint, FitSocial account-state check, or PostgreSQL revocation integration is implemented by this task. Other authentication flows remain design-only.
- **Status:** Online-validation foundation approved; remaining authentication implementation requires separate approval
- **Scope:** Supabase Auth client flow, V1 online token validation, authenticated request context, authorization boundaries, security controls, and tests; superseded local JWT/JWKS design retained as history
- **Out of scope:** Protected endpoint wiring, database migrations, Supabase project creation, product features, mobile authentication, social authorization implementation, and production connectivity

This design builds on the approved modular monolith. Authentication establishes who is calling the API. Authorization separately decides what that caller may do or see.

## 2. Security goals and non-goals

### Goals

1. Accept only access tokens issued by the configured Supabase project.
2. Request Supabase Auth server-side validation for each V1 authentication attempt; do not cache successful decisions or rely on locally decoded, unverified claims.
3. Avoid distributing or depending on the legacy `SUPABASE_JWT_SECRET`.
4. Bind every protected request to the verified JWT subject (`sub`).
5. Fail closed on provider rejection or inability to establish trusted identity. V1 does not manage a local JWKS cache or claim an independently verified provider revocation deadline.
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
  | HTTPS GET /auth/v1/user, exact user bearer token + project publishable key
  v
Supabase Auth server
```

- Supabase Auth is the issuer and identity lifecycle authority.
- The mobile app is an untrusted token bearer. It may present a token but cannot make it valid.
- FastAPI is the policy enforcement point for API requests.
- PostgreSQL application data and RLS are authorization defenses, not identity issuers.
- V1 delegates cryptographic token validation to the fixed project's Auth server; local JWKS fetching and caching are superseded. The former public-key trust boundary remains documented in section 5 for history.

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

The registry is a revoked-session table with an indexed unique `session_id` key, `revoked_at`, and `token_expires_at`. Task 003A proposes `app_private.revoked_sessions` with an internal account FK and reviewed point-lookup helper; see `DATABASE.md` section 12 for the draft contract. A successful primary lookup under that contract with valid identity and no row means the verified session is not revoked. An RLS-hidden row or failed lookup must not be mistaken for absence. This denylist shape avoids an active row for every session, but it does not permit the API to treat a failed, timed-out, or unavailable read as “not revoked.”

- The registry key is the verified JWT `session_id`; every protected endpoint requires `session_id` to be present and a valid UUID. Missing or malformed `session_id` is an authentication failure. Clients cannot create, activate, update, or clear registry records.
- Every protected request performs a short, primary-database status read after JWT and account validation and before authorization. No positive “session is valid” result may be cached or reused across requests.
- A found revocation record is rejected with generic `401`; recorded expiry must not hide the row while refreshed-token retention remains unresolved. A successful authoritative lookup with no matching row and valid identity permits processing to continue. The response must not reveal whether a session was revoked.
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
- Retain each revocation row through the latest possible associated token expiration plus permitted clock skew, not merely the expiry observed at logout. The Task 003A proposal disables automated cleanup until provider revocation, maximum token lifetime/refresh races, and a finite retention policy establish a safe bound. A later reviewed cleanup job must be bounded, retryable and outside request paths; pending/unknown provider outcomes prohibit purge. Cleanup failure never permits access. See `DATABASE.md` section 12.5; indefinite personal-data retention is not approved by this development safeguard.
- Every protected request adds one indexed primary point read. This is an intentional consistency and availability cost for immediate revocation; capacity planning must size the primary, synchronous replication path, pool, indexes, and connection limits for that read. Do not introduce a positive-result cache to reduce this cost. If measured load is unacceptable, the team must choose a different strongly consistent design and re-approve the revocation guarantee rather than weaken it implicitly.
- Registry access uses only verified, server-derived claims. The registry does not replace account-status and resource-authorization checks.
- Removing this registry would change the security guarantee and is not permitted for v1; account checks, refresh-token revocation, and token expiry provide only the weaker guarantee described above.

## 5. Token validation: active V1 and superseded design history

### 5.0 Active V1: Supabase Auth online validation

**Decision:** replace mandatory local JWKS verification with provider-side validation on every attempt. Do not cache successful validation decisions, and do not fall back to local verification when the provider is unavailable. Sections 5.1-5.6 below are preserved superseded design history, not additional V1 requirements. Their unresolved upstream-age assumptions are not implemented as guessed defaults.

#### Supported request and response contract

- Use the configured HTTPS project origin and fixed `GET /auth/v1/user` path. Send the exact submitted access token in `Authorization: Bearer <token>` and the configured project publishable key in `apikey`. Never accept a provider URL or identity from the caller.
- The response is a User JSON object, not a JWT claims object or a `{user: ...}` wrapper. Use its UUID `id` and string `aud`; ignore unrelated personal information and metadata. A successful response alone does not expose issuer, token expiry, or session claims.
- The [official Python get_user documentation](https://supabase.com/docs/reference/python/auth-getuser) describes server-side access-token validation. The [Supabase Auth UserGet implementation](https://github.com/supabase/auth/blob/master/internal/api/user.go) returns the authenticated User object and checks its request audience; [Auth bearer validation](https://github.com/supabase/auth/blob/master/internal/api/auth.go) verifies the submitted token before loading the user. The [JWT HTTP example](https://supabase.com/docs/guides/auth/jwts#verifying-with-a-shared-secret-signing-key) documents the bearer/API-key headers. Online validation is also available for asymmetric tokens; this does not introduce a legacy signing secret into FitSocial.
- Require HTTP 200 and a well-formed User object. Generic local invalid-authentication errors represent provider 401/403. Other statuses, including unexpected 400, redirects, 429, and server errors, represent unavailable validation rather than successful authentication. Never relay upstream bodies or errors. Provider/gateway invalid-key 401 responses can be indistinguishable from token rejection without a more specific stable error contract; diagnose configuration privately, never by exposing responses to clients.

#### Required claims and identity binding

- A size/shape check rejects malformed input before network access. Only after the provider accepts the exact submitted token may the component parse its JWT header/payload for additional FitSocial policy checks. Parsing is not a substitute for signature verification: provider acceptance is the cryptographic trust prerequisite, and token `sub` must match the returned User `id`.
- Pin `iss` exactly to the configured project issuer and require the configured audience as the JWT string audience or an array member; require the User response audience to match as well. Require `typ=JWT`, UUID `sub` and `session_id`, `role=authenticated`, and boolean `is_anonymous=false`. An explicitly anonymous provider User is also rejected. Do not derive privileges from `user_metadata` or `app_metadata`.
- Require finite numeric `exp` and `iat`, reject booleans/string timestamps, expired tokens, future `iat`, and `iat >= exp`. Validate `nbf` when present. This foundation uses zero additional local clock-skew allowance; provider acceptance never waives the local checks. See the [official required/optional claim types](https://supabase.com/docs/guides/auth/jwt-fields#required-claims).
- The provider verifies signing keys and supported algorithms. The old local ES256/RS256 allowlist, mandatory `kid` lookup, JWKS age evidence, refresh budget, and disabled-key distribution are not active backend machinery in this V1 path. Confirm the actual project's signing configuration before deployment; this component does not pretend to verify that project setting locally.
- Return only immutable provider-validated identity/session/lifetime data. This result is not a fully authorized `AuthenticatedUser`: FitSocial account-state, primary-database session-revocation, transaction context, and resource authorization remain mandatory before any protected endpoint succeeds. No protected endpoint is introduced by this foundation.

#### Transport, configuration, and operational limits

- Require `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, nonempty `SUPABASE_JWT_AUDIENCE`, and `SUPABASE_PUBLISHABLE_KEY` to use the component. The key is a masked settings value; it is not a signing secret or a caller token. Missing configuration fails closed. Existing health-only scaffold configuration remains usable without provider credentials.
- Use the existing `httpx2` package as a runtime dependency, retaining its locked version. TLS verification stays enabled; disable redirects and environment-derived proxies. Use a 2-second connect timeout and a 5-second overall attempt deadline, without automatic retries.
- Limit compact tokens to 8 KiB and User responses to 64 KiB. Request uncompressed JSON and reject unexpected content encoding rather than trusting decompression to stay bounded. Reject duplicate JSON fields and malformed response structures.
- No decision cache and no reusable cookie/session state across validation attempts. Request `Cache-Control: no-store` is a cache directive, not evidence of origin freshness; V1 relies on the provider's documented online-validation contract, not a fabricated JWKS freshness signal.
- Timeouts, network failures, or malformed provider responses produce a generic unavailable-validation error, intended for 503 in a later HTTP adapter. Invalid credentials/required claims produce a generic invalid-authentication error, intended for 401 with `WWW-Authenticate: Bearer`. Authentication-error responses require `Cache-Control: no-store`. This task adds no adapter or endpoint.
- More latency, provider load/rate-limit exposure, and Auth availability dependence are explicit V1 trade-offs. Do not claim immediate FitSocial session revocation from this call; preserve section 4.5 independently. No live project compatibility or release readiness is established by mocked tests.

### Superseded local JWT/JWKS policy (sections 5.1-5.6)

The following historical policy must not be wired as a V1 fallback or treated as an additional active requirement. It remains available for a separately approved future reconsideration.

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
16. After JWT verification succeeds, construct an immutable context from the verified claims, then initialize the protected database transaction and canonical subject context described in section 7. Load the application account by `sub` inside that transaction.
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
- Construct immutable normalized identity from verified JWT claims before opening a protected database transaction. Account-state checks may enrich the final immutable context inside that transaction; they must not replace the verified subject with caller-supplied identity.
- The context should contain only normalized identity and account-state data needed by authorization.
- Avoid placing raw JWT claims in logs or broad request state.
- Public health and readiness endpoints must not require this dependency.

## 7. PostgreSQL RLS and database authorization

FastAPI’s verified identity does not automatically flow through a separate PostgreSQL connection. PostgreSQL/Supabase RLS will not see the original mobile JWT unless the application explicitly establishes database session context or uses a database access path designed to preserve that identity.

### V1 protected transaction and identity propagation

Explicit FastAPI authorization and PostgreSQL RLS are independent required security layers. The following is the approved design direction, not an implemented or verified database guarantee:

1. FastAPI completes online provider validation and required-claim checks under section 5.0 before opening a protected database transaction. Construct an immutable identity context from the validated identity; never derive the actor from path, body, query, or untrusted metadata.
2. Acquire one runtime-role connection and begin one explicit, short `READ COMMITTED` transaction per protected request. The connection and transaction are owned by that request and must not be shared between concurrent asynchronous requests.
3. Install only the canonical verified subject UUID as identity context using parameterized transaction-local `set_config` with its local argument set to `true`. The proposed Task 003A canonical source is `request.jwt.claims` containing only the normalized `sub` UUID, read through the reviewed invoker-security `actor_subject()` contract. Do not install the raw JWT, arbitrary claims, a second caller-provided account identifier, or privilege flags.
4. A reviewed identity reader must accept only that canonical source and a valid subject UUID. Missing, empty, malformed, or invalid identity context denies protected access. Do not fall back to another session setting or assume an installed Supabase helper uses the same source without inspection.
5. Identity installation, account-state and existing primary-database session-status checks, and every protected repository query use the same connection and transaction. Resource authorization follows those checks. This preserves the mandatory revocation checks in section 4.5; it does not introduce a session-status cache or a replica read.
6. Commit successful work before reporting a mutation as complete. Roll back on application errors, timeouts, or cancellation. Return a connection to the pool only after successful cleanup; cleanup failure or uncertain connection state requires connection discard. A lost commit acknowledgement remains an uncertain outcome, not permission to retry mutations blindly.

### Pooling, repository boundaries, and failure behavior

- No session-level identity settings are permitted. Transaction-local settings revert at transaction end, which is insufficient if a previous session-level identity existed; the pool baseline must contain no persistent actor context. Unexpected pre-existing identity state must cause connection rejection/discard rather than reuse under another user.
- Repository functions require an initialized identity transaction, not unrestricted pool access. Reject protected queries outside that boundary, including implicit/autocommit queries, database work after transaction close, or work accidentally launched in a separate asynchronous task/session. Database policies must independently deny access when valid identity is absent.
- Do not reuse a request transaction for background work. Commit, rollback, failed setup, cancellation, and connection reuse must all preserve user isolation. No session-specific authorization decision may survive into the next borrower.
- A failed identity setup, database connection failure, pool timeout, or inability to establish authorization denies protected work. Infrastructure failures use a controlled availability error, not an empty/anonymous context that continues processing.
- The pool must preserve connection affinity throughout each transaction. Pooling implementation and behavior must be tested against the deployed connection model; never assume connection reset or async isolation merely because a pool library is present.

### Roles, ownership, and RLS enforcement

- The ordinary runtime application role is non-owner, non-superuser, and has no `BYPASSRLS`. Its effective memberships and role-switching paths must not provide owner or bypass privileges. JWT role claims never select a PostgreSQL role.
- Migration/owner credentials are separate and must never be available to ordinary API workers. Runtime request paths must not borrow migration connections or escalate to an owner role.
- Enable and `FORCE ROW LEVEL SECURITY` on protected tables. `FORCE` does not make superuser or `BYPASSRLS` access safe and does not replace runtime/owner separation. Owners can change policy definitions, so migration credentials remain a separate trust boundary.
- Use least-privilege schema, table, column, sequence, and function grants as needed. Runtime must not be able to alter policies, create shadow objects in trusted lookup schemas, or use whole-table operations such as `TRUNCATE` to evade row policy enforcement. `DATABASE.md` section 12.3 proposes exact owner/runtime/admin/guard/worker roles and grants for review, including restricted definer entry points; they are not yet provisioned or approved merely by being documented.

### Explicit application authorization and policy boundaries

Repositories include server-owned authorization predicates in every query, covering owner, active relationships, blocks, membership, moderation, and visibility. Actor identity is bound from the verified context, never from request data. RLS remains independently enforced if an application predicate is accidentally omitted; application policy is not removed because RLS exists.

Protected policies must require valid identity, including when granting public-content reads. Existing-row access and proposed inserted/updated rows need distinct checks so a user cannot change ownership or reparent workout exercises/sets into another user's session. Nested records inherit parent authorization. Profile ownership must not grant arbitrary access to sensitive columns or moderation state; final field exposure and moderation access remain unresolved.

Relationship-based policies must avoid recursive policy evaluation, hidden evidence that silently weakens block/membership checks, and permissive-policy combinations that accidentally override mandatory restrictions. Final SQL policies and schema are not specified by this document.

### Trust limitations and privileged helpers

- Transaction-local claims are assertions made by the backend, not independent database authentication of the original JWT. PostgreSQL does not verify the JWT merely because FastAPI installed a subject setting.
- Arbitrary SQL execution under the runtime credential can potentially change identity context and impersonate another user. RLS with backend-set claims is not a containment guarantee for SQL injection or a compromised runtime credential. Parameterized queries and preventing arbitrary SQL execution remain mandatory.
- Task 005A authorizes local SQL preparation of the read-only `session_is_denied(uuid)` helper only, under the precise contract in `DATABASE.md` section 12.7: non-login/non-bypass `fitsocial_guard` owner, SELECT-only data privileges with explicit guard RLS policies, fixed `pg_catalog, pg_temp` search path, qualified relations, runtime-only EXECUTE, denied on missing/invalid actor or session and missing/non-active account, any matching revoked row denied, database errors propagated. Actual hosted enforcement remains unverified. Other `SECURITY DEFINER` helpers still need separate security review; no write helper or privileged bypass is authorized.
- Background workers and scheduled jobs require separately defined, narrowly scoped authorization. User-scoped work must re-establish an authorized actor and current permissions; service maintenance requires explicitly approved operation-specific privileges. Workers must not inherit a request's closed transaction or use migration credentials as a shortcut. Maintenance-worker permissions remain unresolved.

### Hosting consistency and unverified status

Approved V1 uses PostgreSQL in the same Supabase project as Auth and Supabase SQL migrations exclusively. Separate internal `app_accounts` is the authoritative FitSocial security state; profiles are presentation data, not an alternative account-state source. The same-database FK targets `auth.users.id`, with deliberate deletion restrictions described in `DATABASE.md` section 12.2. Task 005A defines the first-migration roles and read-only helper in section 12.7; broader helper approvals, provisioning/erasure coordination, and actual hosted capability tests remain gates. No Alembic or competing migration history is authorized.

The existing online validator returns provider-validated subject/session/expiry data, not an application account. The later database gate must read the matching internal account, reject missing/non-active state, and check the same validated session against the primary registry before returning authorized identity. Online provider success never auto-creates/reactivates an internal account or supplies migration/admin credentials.

Actual RLS behavior cannot be claimed until tested against real, isolated PostgreSQL using the runtime role and effective privileges intended for deployment. Documentation, mocked repositories, and successful tests under an owner/superuser connection do not establish runtime RLS enforcement.

### RLS and authorization tests

The required PostgreSQL tests in section 13 must prove transaction-local isolation, commit/rollback and connection reuse, role restrictions, failure cleanup, and worker authorization. They must verify that privileged connections cannot be reached through ordinary request repositories.

## 8. Authorization architecture

Authentication and authorization remain separate layers:

```text
Bearer token
  -> online provider validator + required-claim checks
  -> immutable verified identity context
  -> initialized READ COMMITTED identity transaction
  -> account status check
  -> existing primary-database session-status check
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

For active V1, forged/expired/wrong-project tokens are handled by online provider acceptance plus the bound local claim checks in section 5.0. Provider outages fail closed and decisions are never cached. JWKS-specific controls in the historical table below are superseded; database/session, privacy, and application-authorization controls remain required.

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

### Active V1 online-validation foundation tests

Use synthetic compact tokens and mocked provider responses only. Require positive validation with exact request URL/headers, a fresh call on every attempt, rejection after a previously successful attempt, provider 401/403, unexpected statuses/redirects, network errors, total timeout, malformed/oversized User responses, response/subject mismatch, and missing/invalid issuer, audience, expiry, issued-at, optional not-before, role, anonymous flag, and session UUID. Verify generic safe exceptions, no raw provider errors, and no endpoint changes. These tests establish component behavior, not live Supabase compatibility or completed account/revocation authorization.

### Superseded local JWT/JWKS verifier tests

The following local-verifier matrix is design history and is not an active V1 implementation gate. Its claim-validation cases are retained in the active online foundation where applicable.

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

Application policy tests may use repository doubles. The RLS/identity tests below require real isolated PostgreSQL using the intended runtime role; doubles do not prove database enforcement:

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
- missing, empty, malformed, and invalid-UUID context denies protected reads and writes;
- user A cannot read, update, or delete user B's private records, including direct workout exercise/set IDs;
- ownership changes and child reparenting into another user's workout are denied;
- both commit and rollback clear transaction identity; a pool-size-one test forces A, B, then missing-context reuse without leakage;
- deliberately interleaved concurrent A/B requests retain their own transaction identities;
- exceptions, cancellation, timeouts, and broken connections trigger cleanup or discard; cleanup failure never returns a connection to the pool;
- unexpected session-level identity state is rejected rather than reused;
- protected queries outside an initialized identity transaction, or after it closes, are rejected;
- runtime effective privileges are non-owner, non-superuser, and non-`BYPASSRLS`; role memberships cannot enable escalation;
- protected tables have enabled and forced RLS, and runtime cannot disable policies, truncate protected tables, or assume the migration/owner role;
- separately approved definer helpers resist identity substitution, unsafe name resolution, and unauthorized invocation;
- background jobs execute only explicitly authorized user-scoped or maintenance operations and are denied adjacent unauthorized operations;
- relationship policies do not recurse, miss required block/membership evidence, or grant access through permissive-policy combinations;
- database failures deny protected work; uncertain commit outcomes are not reported as confirmed success or blindly retried.

### Mobile integration tests

- registration/login success and confirmation-required state;
- session restoration from secure storage;
- access-token refresh once on `401`;
- concurrent `401` requests share one refresh;
- refresh failure clears session;
- logout clears secure storage offline and online;
- tokens never appear in analytics, logs, URLs, or error UI.

## 14. Proposed future configuration

Active V1 uses the existing project URL/issuer/audience and the new `SUPABASE_PUBLISHABLE_KEY` settings field. The following JWKS-specific names and cache values are superseded history, not active configuration requirements. The existing JWKS URL derivation remains backward-compatible scaffold configuration and is not used by the online component.

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

- Active V1 uses the existing `httpx2` HTTP client, promoted from development to runtime, for provider requests with bounded timeouts and response limits. No JWT/JWK or cryptography package is required by the online component; standard-library payload parsing occurs only after provider acceptance and identity binding.
- JWT/JWK library selection and JWKS retrieval/cache implementation are superseded local-verifier work, not active V1 dependencies.
- Any new runtime dependency requires compatibility review, lockfile regeneration, and security review.

## 16. Unresolved decisions before implementation

1. Supabase Auth provider configuration beyond email/password.
2. Email confirmation and password-reset UX.
3. Exact access-token lifetime and refresh-token rotation settings.
4. Actual PostgreSQL HA topology, synchronous standby/quorum, synchronous commit mode, fencing/lease mechanism, promotion automation, and failure testing required to verify the mandatory RPO 0 architecture.
5. Supabase Auth provider configuration for the approved server-controlled session/refresh-token revocation operation.
6. Durable retry/outbox storage and worker ownership, retry limits, backoff, and terminal-alert policy for Supabase revocation.
7. Actual Supabase project's signing configuration and live compatibility of online validation; no local algorithm-selection machinery is implemented for V1.
8. Superseded local-JWKS research: reliable upstream response age, final cache accounting, and provider observability. This does not block the approved online foundation; it remains unresolved if local verification is reconsidered.
9. JWT `aud` value(s) issued by the selected Supabase project.
10. Review the explicit internal-account provisioning proposal in `DATABASE.md` section 12.2; no lazy authentication-side account creation. Profile completion is separate, and any future signup automation needs its own approval.
11. Rate-limit storage mechanism for the modular monolith and multi-instance deployment.
12. Production CORS origins and edge TLS policy.
13. Secure-storage package selection and Android backup behavior.
14. Staff-role source of truth and emergency revocation process.
15. Account deletion/session invalidation behavior and retention policy.
16. Superseded local-JWKS work: operational emergency key-invalidation distribution/confirmation. It is not an active online-component dependency.
17. Superseded local-JWKS work: exact provider JWK metadata compatibility. Do not claim it was resolved by switching to online validation.
18. Same-project Supabase PostgreSQL/Auth and Supabase SQL migrations are decided. Task 005A permits local executable SQL preparation; hosted capability preflight, approved isolated replay and FK/ownership verification remain required before deployment acceptance. Final deletion coordination remains separate.
19. The Task 005A first-migration role/grant contract in `DATABASE.md` section 12.7 is prepared locally; hosted preflight, isolated replay and effective-membership/runtime tests remain required. Broader admin/worker grants in section 12.3 remain proposals.
20. Task 005A covers only the read-only denial helper. Separately review later revocation/status write/coordinator helpers; no logout, outbox or worker is implemented by this migration.
21. Approve the outbox-worker operation, provider revocation API, leases/retries and maintenance retention/deletion permissions; the worker has no authority to clear revocations or mutate accounts.
22. Profile-field exposure and narrowly defined moderation access rules.

## 17. Approval gate

The online-validation foundation is approved separately and exposes no protected endpoint. Before a fully protected authentication release, the team must resolve and approve:

- live provider/project compatibility, fixed issuer/audience configuration, token lifetime, provider availability/rate-limit handling, and safe error integration;
- mandatory v1 session-revocation model, including `session_id` validation, logout coordination, RPO 0 durability, and synchronous failover promotion;
- secure mobile storage package;
- production CORS and rate-limit policy;
- staff-role source of truth;
- the Task 003A schema/FK/deletion, role/grant and separately reviewed definer-function proposals, worker/retention contract, actual hosted capabilities and unresolved profile/moderation access; same-project hosting and Supabase migration ownership are decided, while runtime RLS remains unverified;
- the full test matrix above.

### Official references

- [Supabase JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase JWTs](https://supabase.com/docs/guides/auth/jwts)
- [FastAPI security overview](https://fastapi.tiangolo.com/tutorial/security/)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
