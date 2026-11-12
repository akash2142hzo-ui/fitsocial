# FitSocial Database Design

## 1. Database principles

- PostgreSQL is the application system of record.
- Every table uses a UUID primary key unless a strong reason requires otherwise.
- Store timestamps as `timestamptz` in UTC.
- Use foreign keys and database constraints for invariants.
- Prefer status columns and `deleted_at` for auditable lifecycle changes over destructive deletes.
- Keep Supabase Auth users in `auth.users`; application-owned profile data references the Auth UUID.
- RLS is enabled for relevant tables and tested independently from FastAPI authorization.

## 2. Core entities

### Identity and profiles

#### `profiles`

`id` (same UUID as `auth.users`), `username` (unique), `display_name`, `bio`, `avatar_media_id`, `account_visibility`, `status`, `created_at`, `updated_at`.

`account_visibility` is `public` or `private`. `status` supports active, deactivated, suspended, and deleted states.

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
auth.users 1--1 profiles
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
- Database migration authority: Alembic, Supabase migrations, or a documented division of responsibility.
