# Task 032B ? Active actions and logged-set cards

Date: 2026-11-15

## Exact files changed

1. `src/workout/WorkoutLogger.tsx` ? wrapping top action row and three actual-state summary tiles; remove bottom End button.
2. `src/workout/WorkoutSummary.tsx` ? active-only cardGroups renderer with grouped headers, structured values and icon removal controls. Default saved/review rendering remains unchanged.
3. `src/screens/mobileExperience.test.tsx` ? update the superseded End-after-logged-section order assertion; add action-scale, mixed-mode/value-preservation and targeted-removal tests.
4. `TASK_032B_VERIFICATION.md` ? this report.

Git status and current logger/list/formatting helpers were inspected before editing. All previous uncommitted changes were preserved. No Home, Train landing, category images/picker, Create, Feed, Profile, navigation, bottom tabs, backend, authentication, dependency, reducer, input validation, saved data or workout calculation change. No staging, commit, push or deployment.

## Layout calculations

Add exercise and End workout are siblings in one normal-flow action row near the top, following the unchanged session card. The row has flexDirection row, flexWrap wrap and a 10-point gap. Each cell has flexGrow 1, flexShrink 1, minWidth 0 and maxWidth 100%. Its preferred basis is 136 * max(1, fontScale), using React Native useWindowDimensions so accessibility scale changes update presentation without replacing session state.

For available content width P, normal-size buttons share (P - 10) / 2 when P >= 2 * basis + 10. Below that threshold they wrap and each uses the available width. For example, P=288 and scale=1 gives two 139-point cells; at scale=2 the preferred basis is 272, so a 328-point content area wraps them into full-width rows. These are native flex contracts, not hardcoded phone widths. No fixed button/text heights or line truncation are applied.

Both existing shared buttons keep at least 48-point targets, centered text, native system sans-serif and accessibility scaling. Add stays lime; End uses the existing charcoal secondary style and border. There is exactly one End action, and the old bottom copy is removed. Confirmation replaces normal controls as before.

The logged summary uses three wrapping charcoal tiles with lime tabular values, 12-point padding and 8-point gaps. Each exercise group uses the shared 12-point card padding/radius, an existing subtle dumbbell/chart icon, exercise heading and actual logged-set count. Rows have subtle separators, a set/activity number, wrapping field values and a 48-point remove target. Text areas use flexible width/minWidth 0; no ellipsis, shrinking font-size limits or value truncation were added.

Screen margins remain 16 points, section gaps remain the existing 12?16, and outer scrolling/keyboard/tab/safe-area clearance are unchanged. Absolute positioning is confined to the tiny cross glyph inside its icon frame, not normal content.

## Summary calculations and data integrity

All three values come directly from the existing summarizeWorkout(workout.sets):

- Exercises completed: exerciseCount, the number of distinct canonical exercise groups with at least one actual logged entry. There is no new exercise-completion flag; selected exercises and draft inputs do not count.
- Total sets: setCount, every logged record counted exactly once, including timed/cardio entries.
- Total reps: reps, existing repetition-mode sum. Timed/cardio durations are not converted into reps.

The empty workout honestly shows zero for all three and keeps its existing empty-state card. No calculator or reducer was modified.

All row values are sourced from the unchanged entryDisplay helper. Its existing separator divides the visual fields without recalculating their contents; the full original formatted value remains in the accessible row label. External reps/weight, bodyweight added/unrecorded weight, assistance, seconds, cardio duration, distance, speed, incline, resistance, floors, steps and pace retain existing formatter behavior and units. No stored values, exercise IDs or array ordering are mutated. Unusually large test values remain fully rendered; they are not clamped to input-validation limits during display.

## Remove and workflow preservation

The active renderer replaces visible Remove text/chevron controls with the shared IconButton and a small cross glyph. Existing descriptive labels are retained, such as Remove Flat Barbell Bench Press set 2; labels include exercise, entry type and group-local index. Each icon has at least a 48 x 48 target and shared focus/pressed feedback. The callback still passes the stored set.id, not the displayed index. There was no remove confirmation to change. Remove controls remain absent during end confirmation.

End still dispatches only requestEnd. Finish, Keep logging, Discard, Save, Share, current draft inputs, revision guards and read-only completed records retain their existing behavior. Add still opens the same picker; selected-exercise/Change controls and forms remain below the top action row. The timer hook/start clock, calorie estimates/status/disclosure and header/Training hub navigation are untouched.

Only cardGroups=true callers get the new set layout; the only such caller is the active logger. Default list consumers in completed review, saved details and other screens retain their previous markup/behavior.

## Validation results

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, no warnings/errors reported.
- npm.cmd test -- --watch=false: PASS ? 574 tests across 27 suites (baseline 570 / 27), 63.739 seconds.
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts concern earlier work; neither was edited here.

Four cases were added: two action/font-scale variants, mixed-mode multiple-exercise/large-value rendering with mutation checks, and real reducer removal followed by Finish/Save. They verify equal wrapping cells and 48-point targets; single End control; empty zero totals; 5 distinct exercises / 6 sets without double counting; actual large reps/weight; bodyweight, timed, cardio and assisted units; an icon-only remove action targeting ID 12; surviving set values and updated totals through real app state; and working End confirmation/save behavior.

The previous Task 032A assertion requiring End below Logged exercises was reversed to the new explicitly requested order. Its timer, calories, empty-state, button-style and confirmation checks remain. Existing workout, input validation, quantitative timer/calorie, picker, sharing, social and navigation tests all pass. No tests, assertions or timeout limits were disabled or weakened.

## Physical-device verification gaps

Android/iOS visual verification: NOT PERFORMED in this task. No native screenshot was captured. Component tests do not measure native layout or prove visual approval.

Check the owner's Expo/native build for equal button widths at normal font scale, stacking at narrow widths and large text, centered readable labels, summary-tile wrapping, large-number wrapping without overflow, long exercise names, unit visibility, precise remove targeting/touch feedback, keyboard/scroll interaction and bottom safe-area clearance. The pre-existing device font-appearance report remains outside this layout-only change; the same explicit system-sans configuration is retained.
