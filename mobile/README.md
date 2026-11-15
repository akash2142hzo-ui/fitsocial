# Mobile prototype

This Expo/React Native app opens on the dark FitSocial welcome screen. Choose
**Explore the local demo** to use five tabs: Home, Train, Create, Feed, and
Profile. Progress is accessible from Home and Profile; Groups from Feed and
Profile. Sample content is labeled separately from local workout and social entries.

Navigation uses in-memory React state with the existing dependencies. Android
Back returns secondary screens to their entry tab, then through Home to welcome.
Active workouts and unfinished drafts require confirmation before disposal.
Reopening the demo starts at Home.

The demo does not sign anyone in, persist data, or make backend calls. Workout
logging and social interactions run in memory. Authentication remains a disabled
placeholder. Reloading or closing the process may clear all entries.

The mobile package targets Node.js 24 LTS, Expo SDK 58, React Native 0.88.x, React 19.3.x, Android compile SDK 37, and target SDK 36.

From `mobile/`, run `npm run typecheck`, `npm run lint`, and
`npm test -- --watch=false`. On Windows PowerShell, use `npm.cmd` if `npm.ps1`
is blocked by the local execution policy. The navigation tests cover tab
selection, back behavior, and returning to welcome; device appearance and native
Back dispatch still need Android verification.

Workout duration and calorie assumptions, platform limitations, and the detailed
Android checklist are documented in [Task 017A verification](TASK_017A_VERIFICATION.md).
Task 018A adds 395 exercises, tracking modes and explicit temporary saving:
Finish freezes a review summary; **Save for this session** adds it to history.
Sharing can happen without saving. See [Task 018A verification](TASK_018A_VERIFICATION.md)
for that task's workflow, limitations and Android checklist.

Task 019A expands the catalog to 423 entries with cardio-specific inputs and a
seven-day saved-activity chart. External-weight entries now require explicit kg.
See [Task 019A verification](TASK_019A_VERIFICATION.md) for that task's behavior,
validation, photo-download limitation and Android checklist.

Task 020A refines the existing UI without changing workout data or calculations.
See [Task 020A verification](TASK_020A_VERIFICATION.md) for visual changes,
regression results and the Android checklist.

Task 021A adds optional self-declared trainer profiles and Feed trainer discovery.
Profiles remain **Unverified**; setup requires explicit acknowledgment. No account
or authorization role is created. See [Task 021A verification](TASK_021A_VERIFICATION.md)
for the model, trust boundaries, regression results and Android checklist.

## Current prototype

The catalog contains 423 entries, including cardio. Train uses the guided category,
equipment and exercise picker; Biceps, Triceps and Forearms are separate discovery
categories, with explicit supplementary associations and unchanged catalog IDs.
Calorie information explains the existing estimate and its limitations.

Feed provides For You, Following and My Posts with in-memory search. Fictional
examples remain labeled, and locally published posts retain real workout snapshots.
Drafts, pending shares and publication duplicate guards remain session-only.
Trainers and Groups are secondary destinations, not additional bottom tabs.

Profile separates Posts / Followers / Following from fitness Progress. Its gear
opens Settings for local identity, letter avatars, measurements and a future account
visibility preference. Public/Private has no enforcement effect and publishes
nothing online. Personal weight can default into new workouts; active session
overrides and historical estimates stay unchanged. Imperial units, photo uploads,
login and notifications remain unavailable; no new device permission is requested.

See [Task 023B](TASK_023B_VERIFICATION.md), [Task 023C](TASK_023C_VERIFICATION.md),
[Task 023D](TASK_023D_VERIFICATION.md) and [Task 024A](TASK_024A_VERIFICATION.md)
for implementation history and device checklists. Reports record checks at the time
of each task; they are not evidence of physical-device or production validation.
