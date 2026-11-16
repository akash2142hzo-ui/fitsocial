# Task 034B - kg / lb workout weight support

Validation completed: 2026-11-16 (work began 2026-11-15)

## Exact files changed in this task

- `src/workout/weightUnits.ts` (new): typed units, exact conversion constant, weight-draft parsing and display formatting.
- `src/workout/WeightUnitContext.ts` (new): read-only display context with kg fallback.
- `src/workout/workoutState.ts`: unit/draft state, guarded unit-switch action, selected-input-unit validation and canonical kg logging; optional input-origin metadata for display; unit-aware logged-set formatter.
- `src/workout/workoutDisplay.ts`: pass the display unit through existing non-cardio entry formatting.
- `src/workout/WorkoutSummary.tsx`: use display-unit context/override for all shared set rows and accessible descriptions.
- `src/workout/WorkoutLogger.tsx`: Total weight label, compact kg/lb control, converted editable display and units in accessibility labels; optional added/assistance modes use the same toggle.
- `src/navigation/PrototypeNavigator.tsx`: provide the current lifting display unit around screen content, without adding host layout or changing navigation.
- `src/workout/weightUnits.test.ts` (new): 30 conversion/state/integrity/validation tests.
- `src/screens/mobileExperience.test.tsx`: five additional UI/navigation/layout test cases; existing assertions unchanged.
- `TASK_034B_VERIFICATION.md`: this report.

Git status was inspected before editing. All existing uncommitted work was preserved. No new dependencies, backend/database changes, new persistence, exercise-catalog edits, picker changes or unrelated redesign. Nothing staged, committed, pushed or deployed.

## UI and preference scope

The active external-weight label is Total weight. The kg/lb segmented control sits beside it, with selected lime fill/dark text, accessible selected state, focus/pressed feedback and at least 44 x 44 dp segment targets. Shared system sans-serif styles and existing colors are reused. Added weight and assistance retain their correct meaning with the same unit control. The input keeps decimal-pad, existing refs/focus, maxLength and Log set behavior.

Label areas use a 44 dp minimum with centered content so Reps and weight fields align with the control. Flexible field bases scale with fontScale (112 * max(1, fontScale)) and cap at available width; they can wrap onto separate rows on narrow/large-text screens. No absolute placement, fixed screen-width assumptions, disabled text scaling or clipped label limits were introduced. No changes to workout actions, cards, timer or calorie-editor layout.

Each new workout defaults to kg. The selected unit stays in existing in-memory workout state across exercise changes, tabs, review and saving; starting another session resets to kg. It is not a Profile Settings preference and is not persisted separately. Body weight for calorie estimates and Profile measurements remain explicitly kg, with their existing validation and disclosure.

## Canonical weights and precision

Conversion factor: exactly 1 kg = 2.2046226218 lb in the shared utility. LoggedSet.weight, completed snapshots, history and shared attachments always store kg, including existing records. No migration or reinterpretation of prior kg values occurs.

WorkoutState.weight remains a kilogram draft for valid input. A separate weightDraft retains the original typed text and its input unit. A unit switch changes only presentation preference/revision, never the canonical value or original edit. Converted display text is rounded, but it is never round-tripped into the canonical weight unless the user deliberately edits it. Repeated unit switches cannot accumulate conversion/display rounding drift. The existing addSet validation parses the original typed draft and records the full-precision converted kg value; it does not validate or save rounded display text.

Ordinary display/edit conversions use up to two decimals without trailing zeros. Very small positive converted editable values use up to eight decimals instead of displaying zero; their original valid draft remains the source for logging. Very small positive read-only values below 0.01 are labeled <0.01 rather than zero. No unusually large legacy numeric values are clamped or changed. Existing kg-origin displayed values retain their original numeric representation, including old fixtures with extra precision.

A pounds-entered set optionally records weightInputUnit: lb as input-origin/display metadata. This does NOT change the unit of its numeric weight: weight is still kg. This flag lets the default kg formatter round converted quantities appropriately (45 lb -> displayed 20.41 kg) while keeping old kg-origin values unchanged. Existing clone/finish/save/share paths preserve the flag and exact numeric value through normal copying.

## Validation and behavior

The original kg conventions remain: decimal point syntax, up to two typed decimals, physical range 0-1000 kg, whole reps 1-1000, required external load, exercise-specific zero support, blank optional load distinguished from zero, and session/per-exercise limits. Pounds input follows the same syntax/precision with the same physical maximum (2204.62 lb accepted, 2204.63 lb rejected). No negative, NaN, infinite, exponential, comma or overprecision input can be logged.

Empty input stays empty through switches; required-input errors use the selected unit. Nonblank invalid drafts remain visible and block switching units until corrected or cleared. They are not silently cleared, converted to zero or reinterpreted. Bodyweight/assisted modes keep their original optional/zero semantics. The existing revision guard still prevents duplicate/stale Log set actions; a successful unit switch invalidates an old rendered revision.

Rep/set/history totals, duration, calorie calculations and workout completion requirements are unchanged. Unit choice does not affect body-weight kg or calorie estimates. There are currently no weight-volume or weight-record progress calculations to convert; existing progress totals count workouts/reps/time/calories, unchanged.

## Consistent display

formatLoggedSet and entryDisplay accept a unit, default kg. Shared WorkoutSetList reads the unit context (or an explicit active-logger override) and uses the same formatter for visible text and accessible descriptions. This covers active logged sets, completed review, saved Train details, Progress details, and shared workout attachments without changing individual screen layouts. Missing/zero/added/assistance labels and timed/cardio fields remain correct. Old set numbers remain kg internally even when displayed in lb.

The navigator provider adds no native View and introduces no navigation behavior. Read-only text/export previews using the default formatter remain explicitly labeled canonical kg; they are not mislabeled lb. Profile body measurements, distance, pace and calorie units are not changed by this lifting toggle.

## Validation results

- TypeScript (`npm.cmd run typecheck`): PASS.
- ESLint (`npm.cmd run lint`): PASS, no warnings/errors.
- New conversion/state suite: PASS, 30 tests, 2.026 seconds.
- Focused app/weight suites after the empty-input error-unit correction: PASS, 137 tests across 2 suites, 20.525 seconds.
- Full mobile suite (`npm.cmd test -- --watch=false`): PASS, 656 tests across 30 suites, 11.862 seconds (starting baseline 621 tests / 29 suites).
- Git diff checks (`git diff --check`): PASS. Git emits pre-existing LF/CRLF notices for SocialIcon.tsx and colors.ts; neither file was edited in this task.

35 new tests were added. All existing tests remain enabled and passing.

New utility/state tests cover both conversions at the specified factor; blank/invalid input; limits and two-decimal conventions; 100 repeated switches in both input directions with exact unchanged canonical values; editing after conversion; full precision through finish/save/history/share; legacy kg interpretation; added/assistance/zero/blank semantics; tiny and unusual legacy values; unchanged summaries; new-session default; confirmation guard and stale revisions.

New UI cases cover entered-value conversion and repeated toggles; exact selected-unit labels, full workflow through saved Train and Progress details; actual calorie/timer and body-weight continuity; pounds edits logged then displayed in kg; invalid/empty drafts and error units; compact control focus/pressed feedback, decimal keyboard, 44 dp targets and flexible fields at mocked 280 dp/font scales 1 and 2. Earlier tests, including unusually large logged-value assertions, remain enabled and unchanged.

## Remaining Android/iOS verification gaps

Native Android/iOS appearance is UNVERIFIED. No physical device/emulator screenshots were captured. Check actual Expo/native builds for label/toggle alignment, larger accessibility text wrapping, decimal-keyboard behavior, caret position during unit switches, focus and screen-reader selected-state feedback, touch targets, and saved/Progress displayed units. Renderer tests inspect structure/styles and state, not native text measurement or keyboard insets. Two-decimal read-only conversion is approximate for display; full precision remains stored. The toggle applies to lifting load only; body-weight lb entry and a persisted app-wide unit preference are outside this task.
