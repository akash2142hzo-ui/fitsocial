# Task 031A ? Compact Train dashboard

Date: 2026-11-15

## Exact files changed in this task

1. `src/workout/TrainScreen.tsx` (new): Train-only hub/logger/detail presentation state and dashboard UI.
2. `src/workout/trainDashboardPresentation.ts` (new): local calendar-week subset of saved workouts; delegates totals to existing summarizeHistory.
3. `src/workout/trainDashboardPresentation.test.ts` (new): weekly boundaries, mixed entry types, missing/future dates, empty data and immutability tests.
4. `src/workout/WorkoutLogger.tsx`: export the existing WorkoutSettings component for reuse, without altering its implementation or workout logic.
5. `src/workout/ExercisePicker.tsx`: optional Quick Start trigger presentation that opens existing category/equipment/exercise steps. Default logger picker behavior preserved.
6. `src/screens/PrototypeScreens.tsx`: bind only the Train route to TrainScreen, passing the existing workout/social props.
7. `src/navigation/PrototypeNavigator.tsx`: one Train-only settings icon using the existing Settings route; omit the welcome footer on Train. Other screen headers/footers and tab-bar styles/behavior unchanged.
8. `src/screens/mobileExperience.test.tsx`: six additional integration tests; no existing assertions disabled or relaxed.
9. `TASK_031A_VERIFICATION.md` (new): this report.

Git status and current navigation, logger, picker, saved history, metrics and shared components were inspected first. All earlier uncommitted Home, social, theme, asset and workout presentation changes were preserved. No backend, database, authentication, dependency, persistent storage, workout reducer/calculation or social behavior changes. Nothing staged, committed, pushed or deployed.

## Supported UI and behavior

Train retains its title and visible demo disclosure, adds one accessible settings icon on the right with a shared 48-point hit target, and removes Back to welcome only on Train. The settings icon opens the existing Settings screen and returns through existing navigation. The Welcome screen and other exit paths remain available.

The idle Train landing screen is a compact dashboard:

- Start card: Start workout, or Continue workout with the existing live timer when an active session is viewed in the hub. Unsaved completion shows Review workout instead of allowing accidental replacement.
- Existing optional workout body-weight settings remain accessible before starting.
- This Week: real saved-workout summary or an honest empty state.
- My Plans: text stating that plans and scheduling are unavailable; no fake plan or creation controls.
- Quick Start: all ten existing muscle/activity categories as shared compact filter chips. Selecting a chip opens the existing equipment step with that category. Search, filtering, back/cancel and exercise selection remain the existing picker flow. Cancel does not start a workout; selecting an exercise dispatches existing start/select actions and opens the logger. Active sessions are reused, not restarted. Unsaved completed sessions require review/save before Quick Start.
- Recent Workouts: the three most recent saved records in existing history order, with a working read-only details view composed of existing WorkoutMeasurements and WorkoutSetList. More saved history can be revealed in place. Empty history displays a truthful message.
- Personal Records are deferred and omitted; no record claims or new PR calculations.

The logger has an in-flow Training hub action. Existing active/completed sessions continue directly into the logger when Train is entered from another tab, preserving Home Start/Continue/Review and existing review/share/confirmation flows. Their hub is reachable through Training hub. This is intentional continuity, not a forced session restart or hidden state change. Dashboard/detail presentation state is local and temporary.

Existing workout confirmation UI takes priority over hub/details, including Android Back while reviewing a saved record during an active workout. Details do not expose removal/edit controls. Back to training hub returns to the saved list.

## Data sources and calculations

- Workout state: existing WorkoutState and workout actions, unchanged.
- Timer: existing useWorkoutDuration and formatDuration; no accumulated tick counter or replacement clock.
- Saved records: workout.history only. Active, unsaved completed and social-share snapshots do not contribute to saved history statistics.
- Week: local device calendar, Monday 00:00 through current time. Inclusion uses recorded metrics.finishedAt, not workout ID or a fabricated date. Undated, invalid and future finish timestamps are excluded. Undated records remain visible in Recent Workouts with Time unavailable.
- Four weekly values: saved workout count, logged entry count (rep sets plus timed/cardio entries), rep-mode repetition count, and distinct exercise count. The existing summarizeHistory computes all totals after the presentation-only date filter. Timed entries are not misreported as reps.
- No weekly calorie, duration, volume, streak or PR claim is added. Missing measurements in details use existing unavailable-value presentation.
- Category/equipment options and matching: existing pickerCategories, equipmentForCategory, guidedExercises and catalog metadata/IDs.
- My Plans has no data source because plans/scheduling are unsupported.

Weekly dates refresh every minute and when the app returns to foreground; actual active timer behavior uses the existing workout hook. All data retains the existing session-only lifetime.

## Layout

Existing dark theme, lime accent, system sans-serif tokens and shared controls are reused. The navigator retains 16-point screen margins and existing maximum page width. Shared cards use 12-point padding/radius and section stacks use 12-point gaps. No decorative images, animations, large hero, new typography system or new library.

Weekly statistics use four flexible columns at normal phone widths, an 8-point gap and a wrapping row. Labels can wrap; containers do not fix text heights or disable dynamic scaling. The layout can wrap columns when space requires it. Start, continue, review, details, settings and Quick Start controls retain shared 48-point minimum targets, exceeding the 44-point requirement.

## Validation

The user's stated baseline was 512 tests / 25 suites; the preserved Task 030F working tree actually contained 518 tests / 25 suites. All 518 passed after the initial implementation, before new tests were added.

Final results:

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no warnings/errors reported.
- `npm.cmd test -- --watch=false`: PASS ? 528 tests across 26 suites (10 added tests: four calendar/summary tests and six integration tests).
- `git diff --check`: PASS. Existing LF-to-CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited for this task.

Focused integration checks cover empty hub rendering, ten chip targets, unavailable plans, one settings action and return route, removed Train welcome footer, cancellation without starting, selection through existing equipment/search, timer/entry preservation on Continue, actual weekly values, read-only details and return navigation, unsaved-review protection, and visible Android workout confirmations from details. Existing Home, social, workout calculations, full picker, sharing and navigation tests remain passing.

## Remaining limitations / device verification

Android rendering: UNVERIFIED. iOS rendering: UNVERIFIED. No emulator or physical-device rendering was performed. Renderer tests exercise Android Back callbacks but do not establish native visual appearance or native system back-stack behavior for local detail views.

On-device checks remain for compactness at small widths, four-column wrapping and maximum font sizes, keyboard/search behavior in Quick Start, settings return, scroll position when switching hub/logger/details, date changes across time zones/DST, safe areas and tab-bar clearance. Local details provide an explicit Back to training hub action; native hardware Back retains the existing app-level workout-safety/navigation behavior rather than introducing a new persistent route stack. Weekly boundary tests use local dates; physical-device time-zone switching was not tested.

Active/completed sessions intentionally enter the existing logger directly; use Training hub to inspect the dashboard during those states. Plans, scheduling, records and durable history remain unavailable. Final owner visual acceptance is pending.
