# FitSocial Product Requirements Document

## 1. Document status

- **Product:** FitSocial (working name)
- **Status:** Architecture review draft
- **Initial platform:** Android
- **Audience:** Product, design, mobile, backend, QA, and operations teams
- **Scope:** Initial production-oriented foundation; competitions, leaderboards, and AI are explicitly out of scope

## 2. Vision and goals

FitSocial is a fitness-focused social network that combines reliable workout tracking with privacy-aware sharing and community participation. The first release should make it easy to record a workout, show meaningful progress, share fitness updates, and find people and communities with similar interests.

### Goals

1. Provide dependable workout, exercise, set, rep, weight, duration, and progress tracking.
2. Let users create personalised workout plans and reuse them.
3. Offer a chronological social feed based on followed users and joined communities.
4. Give users explicit control over workout and account visibility.
5. Support community creation by anyone while providing a verification path for authentic college and gym communities.
6. Establish moderation, reporting, blocking, authorization, and audit foundations before public launch.

### Non-goals for the initial release

- Competitions, leaderboards, rankings, or prizes.
- AI-generated plans, coaching, recommendations, or computer-vision features.
- Algorithmic feed ranking or engagement optimization.
- Paid subscriptions, advertising, or marketplace functionality.
- iOS release as an initial target.
- Direct messaging unless separately approved.

## 3. Users and primary use cases

### Personas

- **Individual athlete:** Records workouts, tracks progress, and shares milestones.
- **Beginner:** Uses plans and exercise guidance while controlling what is public.
- **Coach or gym member:** Creates and shares structured plans and participates in a gym community.
- **Community member:** Joins a college, gym, city, or interest community.
- **Community administrator:** Moderates membership and community content.
- **Organization representative:** Requests official verification for a college or gym community.
- **Moderator:** Reviews reports and applies platform safety actions.

### Core journeys

1. Sign up, complete a profile, and configure account privacy.
2. Browse exercises, create a plan, start a workout, and record sets.
3. Review workout history, weight, measurements, and progress trends.
4. Publish a fitness-related post with optional image and visibility.
5. Follow a user, join a community, and view a chronological feed.
6. Create a community, manage membership, and request official verification.
7. Report content or a user, block an account, and receive clear status feedback.

## 4. Functional requirements

### Authentication and account

- Email/password authentication through Supabase Auth; provider expansion is a later decision.
- Session refresh and logout must work across app restarts.
- Backend validates Supabase JWTs on every protected request.
- Users can edit profile, username, bio, avatar, and account privacy.
- Users can deactivate their account; deletion and retention policy require a final legal decision.
- Private accounts require follow approval before follower-only content is visible.

### Exercise and workouts

- Maintain a canonical exercise catalogue with muscle group, equipment, instructions, and status.
- Users can browse and search exercises.
- Users can create, edit, duplicate, archive, and use personal workout plans.
- A workout session can contain exercises and ordered sets.
- A set can record reps, weight, duration, distance, and completion state as applicable.
- Users can record notes and completion timestamps.
- Workout records have `public`, `followers`, or `private` visibility.
- Visibility is enforced in API queries and database policies, not only in the client.

### Progress

- Record body weight and user-defined measurements with timestamp and unit.
- Show history and simple chronological trends.
- Do not infer medical advice or publish health claims.
- Users control whether progress records are private, follower-visible, or public.

### Profiles and social

- Profiles show approved public information, posts, and public activity.
- Users can follow and unfollow accounts.
- Private accounts can approve or reject follow requests.
- Users can create posts with text and optional image.
- Posts support public, followers-only, and community-scoped visibility as appropriate.
- Users can like and comment on accessible posts and delete their own content.
- Feed contains posts from followed users and joined communities, ordered newest first.
- No recommendation or ranking algorithm is permitted in the initial release.

### Communities

- Any authenticated user can create a community with name, type, description, rules, and optional image.
- Supported community types: college, gym, city, and interest.
- Public communities can be discovered and joined; private communities may require approval.
- Community administrators can manage membership, roles, rules, and content moderation.
- A college or gym community can request official verification.
- Verification status is granted only by authorized staff after evidence review.
- Official status is displayed with a clear, non-transferable badge and audit trail.

### Safety and moderation

- Users can report posts, comments, profiles, communities, and media.
- Users can block accounts; blocked relationships suppress relevant discovery and interaction.
- Moderators can review reports, hide or remove content, suspend accounts, and record reasons.
- All sensitive moderation and verification actions are auditable.
- Rate limits and abuse monitoring protect authentication, posting, following, comments, reports, and uploads.

## 5. Non-functional requirements

- **Security:** Least privilege, server-side authorization, validated input, safe media handling, and no client-trusted access decisions.
- **Privacy:** Data minimization, explicit visibility, private account support, and documented deletion/retention behavior.
- **Reliability:** Database transactions for workout completion, follow state changes, moderation actions, and verification decisions.
- **Performance target:** P95 API response under 500 ms for ordinary reads at the initial scale, excluding media transfer.
- **Scalability:** Modular boundaries and indexed queries should support growth without splitting into microservices.
- **Observability:** Structured logs, request IDs, error tracking, health checks, and audit events.
- **Accessibility:** Clear labels, touch targets, contrast, screen-reader semantics, and keyboard navigation where applicable.
- **Testability:** Unit, integration, API authorization, database policy, and Android end-to-end coverage.

## 6. Success measures

- A new user can record and retrieve a complete workout without data loss.
- Unauthorized users cannot retrieve private, follower-only, blocked, or unapproved content.
- Feed results are chronological and explainable.
- Moderation reports have an accountable status and audit history.
- Uploads are type/size validated and cannot be executed as application content.
- Core mobile crash-free sessions and API error rates meet release thresholds set before beta.

## 7. Acceptance principles

Every feature must include:

1. Authenticated and unauthenticated behavior.
2. Owner, follower, community member, moderator, and blocked-user authorization cases where relevant.
3. Input validation and error states.
4. Empty, loading, offline, retry, and destructive-action confirmation states.
5. Audit and privacy impact assessment for data that is shared or moderated.

## 8. Open product decisions

- Exact minimum age and age-gating requirements.
- Supported sign-in providers beyond email/password.
- Whether public profiles expose workout history or only explicitly shared posts.
- Whether progress records support follower/public visibility in v1 or remain private.
- Community membership model for each community type.
- Verification evidence, reviewer roles, service-level target, renewal, and revocation policy.
- Content retention, account deletion, export, and legal hold requirements.
- Launch geography, privacy notices, consent, and applicable health-data classification.

