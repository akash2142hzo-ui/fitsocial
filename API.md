# FitSocial API Contract (Proposed)

## 1. Conventions

- Base URL: `https://<api-host>/api/v1`
- Transport: HTTPS only.
- Format: JSON unless an endpoint explicitly returns a signed media response.
- Authentication: `Authorization: Bearer <supabase-access-token>`.
- IDs: UUID strings.
- Times: ISO-8601 UTC.
- Pagination: cursor-based where collections can grow.
- Mutating retries: use `Idempotency-Key` for operations that can create duplicate side effects.
- Every response may include `request_id` for support correlation.

Example error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields are invalid.",
    "fields": {"reps": "Must be greater than or equal to zero."}
  },
  "request_id": "uuid"
}
```

Authorization failures should not reveal whether an inaccessible private object exists. Use consistent `401`, `403`, and `404` semantics after policy review.

## 2. Health and session context

| Method | Path | Purpose |
|---|---|---|
| GET | `/health/live` | Process liveness |
| GET | `/health/ready` | Dependency readiness |
| GET | `/me` | Current application profile and account state |

Supabase Auth owns sign-up, password reset, token refresh, and logout flows. The API does not proxy passwords.

## 3. Users and social graph

| Method | Path | Purpose |
|---|---|---|
| GET/PATCH | `/users/me` | Read/update current profile |
| GET | `/users/{user_id}` | Read caller-authorized public profile |
| POST/DELETE | `/users/{user_id}/follow` | Follow, unfollow, or create a follow request |
| POST | `/users/{user_id}/follow/accept` | Followed private-account owner accepts a pending request |
| POST | `/users/{user_id}/follow/reject` | Followed private-account owner rejects a pending request |
| GET | `/users/me/follow-requests` | Review pending requests |
| POST/DELETE | `/users/{user_id}/block` | Block/unblock a user |

Follow and block operations must be idempotent and must enforce self-target and account-state rules.

## 4. Exercises and workouts

| Method | Path | Purpose |
|---|---|---|
| GET | `/exercises` | Search canonical exercises |
| GET | `/exercises/{exercise_id}` | Read exercise details |
| GET/POST | `/workout-plans` | List/create plans |
| GET/PATCH/DELETE | `/workout-plans/{plan_id}` | Manage an owned plan |
| POST | `/workout-plans/{plan_id}/duplicate` | Copy an accessible plan |
| GET/POST | `/workout-sessions` | List/create workout sessions |
| GET/PATCH | `/workout-sessions/{session_id}` | Read/update an authorized session |
| POST | `/workout-sessions/{session_id}/complete` | Atomically complete a session |
| GET | `/workout-history` | Cursor-paginated authorized history |

The API validates exercise references, set values, ordering, ownership, and visibility. Completion must be safe to retry.

## 5. Progress

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/progress/measurements` | List/create authorized measurements |
| GET/PATCH/DELETE | `/progress/measurements/{measurement_id}` | Manage owned measurement |
| GET | `/progress/summary` | Chronological, non-diagnostic progress summary |

The response must not expose measurements outside the caller's visibility policy.

## 6. Posts, feed, likes, and comments

| Method | Path | Purpose |
|---|---|---|
| GET | `/feed` | Chronological posts from followed users with accepted follow state and joined communities with active membership |
| GET/POST | `/posts` | List authorized posts/create a post |
| GET/PATCH/DELETE | `/posts/{post_id}` | Manage/read an authorized post |
| PUT/DELETE | `/posts/{post_id}/like` | Like/unlike a post |
| GET/POST | `/posts/{post_id}/comments` | List/create accessible comments |
| DELETE | `/comments/{comment_id}` | Delete own or authorized moderated comment |

Feed filtering happens before pagination. No recommendation score or ranking field is returned.

## 7. Communities

| Method | Path | Purpose |
|---|---|---|
| GET | `/communities` | Discover/search communities |
| POST | `/communities` | Create a community |
| GET/PATCH | `/communities/{community_id}` | Read/update authorized community |
| POST/DELETE | `/communities/{community_id}/membership` | Join/leave or request membership |
| POST | `/communities/{community_id}/membership/{user_id}/approve` | Admin approves a pending membership |
| POST | `/communities/{community_id}/membership/{user_id}/reject` | Admin rejects a pending membership |
| PATCH | `/communities/{community_id}/members/{user_id}/role` | Admin changes a member role |
| GET | `/communities/{community_id}/members` | List according to membership policy |
| POST | `/communities/{community_id}/verification-requests` | Submit verification request |
| GET | `/communities/{community_id}/moderation` | Admin/moderator queue |
| POST | `/staff/communities/{community_id}/verification-requests/{request_id}/decision` | Staff approves or rejects a verification request |

Verification approval is a staff-only operation and should be a separate protected route or internal admin surface, not a client-controlled status update.

## 8. Media

| Method | Path | Purpose |
|---|---|---|
| POST | `/media/upload-intents` | Request a bounded upload target |
| POST | `/media/{media_id}/complete` | Confirm upload and run validation/finalization |
| DELETE | `/media/{media_id}` | Delete owned unused/authorized media |

The server controls allowed buckets, size, content type, dimensions, and expiry. Clients never submit arbitrary storage keys or service credentials.

Only the media owner (or an explicitly authorized server-side moderation flow) can finalize an upload. Media must be `ready` before it is attached to a post, profile, or community, and attachment plus ownership checks must be atomic.

## 9. Moderation

| Method | Path | Purpose |
|---|---|---|
| POST | `/reports` | Report a validated target |
| GET | `/moderation/reports` | Authorized moderator queue |
| POST | `/moderation/reports/{report_id}/actions` | Resolve report and record action |
| POST | `/moderation/users/{user_id}/suspend` | Authorized account action |

Moderator endpoints require role checks, reason fields, audit events, and protection from self-escalation.

## 10. Account lifecycle

| Method | Path | Purpose |
|---|---|---|
| POST | `/users/me/deactivate` | Idempotently deactivate the current account |
| POST | `/users/me/delete-request` | Start the approved account-deletion workflow |
| GET | `/users/me/deletion-status` | Read deletion workflow status |

The final deletion/retention policy is unresolved. Until it is approved, the API must not claim immediate irreversible deletion. The workflow must revoke sessions, block normal access, coordinate Supabase Auth and application data, and retain only approved audit/moderation records.

## 11. API implementation rules

- Pydantic request/response schemas are module-owned.
- Repositories do not accept caller-controlled authorization predicates.
- Services receive the authenticated actor and explicitly evaluate policy.
- Avoid returning ORM objects directly.
- Rate-limit authentication-adjacent and abuse-prone routes.
- Add OpenAPI examples only for non-sensitive sample data.
- Contract tests must cover visibility, private accounts, blocks, community membership, moderator access, and malformed input.

## 12. Deferred endpoints

No endpoints for competitions, leaderboards, AI coaching, recommendations, direct messaging, or payments should be added until their product and architecture decisions are approved.
