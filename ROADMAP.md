# FitSocial Development Roadmap

The roadmap is incremental. Each milestone ends with reviewable behavior, tests, and documented operational decisions. No milestone should silently add deferred features.

## Milestone 0 - Architecture and product approval

- Review PRD, architecture, schema, API boundaries, risks, and open questions.
- Confirm launch geography, age policy, privacy/deletion requirements, and visibility defaults.
- Select PostgreSQL hosting/migration ownership and observability approach.
- Define initial release acceptance thresholds and moderation ownership.

**Exit:** Approved architecture baseline and signed-off unresolved decisions.

## Milestone 1 - Repository and delivery foundation

- Create the mobile/backend/supabase structure.
- Add formatting, linting, type checking, test runners, and CI.
- Add configuration loading and safe `.env.example` files.
- Add FastAPI health endpoints and Expo shell.
- Add development database and migration workflow without production secrets.

**Exit:** Clean CI, repeatable local setup, health checks, and empty application shells.

## Milestone 2 - Authentication, profiles, and authorization foundation

- Integrate Supabase Auth on Android.
- Validate JWTs in FastAPI and create profile bootstrap flow.
- Implement profile/account privacy, deactivation state, and secure session storage.
- Establish policy helpers, error conventions, request IDs, and audit events.
- Add authorization and RLS tests before feature expansion.

**Exit:** A user can sign in and manage a profile; unauthorized access tests pass.

## Milestone 3 - Exercises, plans, and workout tracking

- Add exercise catalogue and seed process.
- Implement plans, plan exercises, workout sessions, sets, validation, and completion transaction.
- Build mobile logging flow with offline-safe draft behavior if approved.
- Add unit/integration/security tests for ownership and visibility.

**Exit:** A user can create a plan, record a workout, complete it, and retrieve authorized history.

## Milestone 4 - Progress tracking

- Add weight and approved measurement types with units and validation.
- Add chronological history and simple summaries.
- Confirm privacy defaults and test cross-user access denial.

**Exit:** A user can record and review progress without medical interpretation or leakage.

## Milestone 5 - Profiles, posts, follows, and chronological feed

- Implement follows, private-account approval, blocks, posts, comments, likes, and media references.
- Implement feed query with cursor pagination and database query-plan review.
- Add empty/loading/retry/error states and moderation entry points in mobile.

**Exit:** Followed and joined-community content appears chronologically with enforced visibility.

## Milestone 6 - Communities and official verification

- Implement community discovery, creation, membership, roles, and admin moderation.
- Add verification request evidence handling and staff review workflow.
- Add audit records and badge display with revocation support.

**Exit:** Community lifecycle and verification controls are tested and reviewable.

## Milestone 7 - Safety, media hardening, and beta readiness

- Complete reports, blocking, moderator actions, rate limits, upload validation, and cleanup jobs.
- Add abuse monitoring, audit review, backup/restore test, and incident runbook.
- Perform privacy/security review and Android device testing.

**Exit:** Beta gate passes security, privacy, reliability, accessibility, and moderation criteria.

## Milestone 8 - Controlled beta and launch

- Release to a limited Android cohort.
- Monitor API latency/errors, crashes, report backlog, storage use, and support issues.
- Fix high-severity findings, validate restore procedures, and publish privacy/help content.
- Define post-launch prioritization from observed usage; do not introduce recommendations or deferred features by default.

**Exit:** Launch decision based on measured thresholds and outstanding-risk acceptance.

## Cross-cutting quality gates

- No secrets committed; CI secret scanning enabled.
- Every protected endpoint has positive and negative authorization tests.
- Database migrations are reversible or have a documented forward-recovery plan.
- User-visible errors are actionable and do not expose sensitive details.
- Accessibility and privacy checks are part of feature acceptance, not a final cleanup.

