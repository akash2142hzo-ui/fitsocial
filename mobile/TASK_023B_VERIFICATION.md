# Task 023B — guided exercise selection

## Latest verification — November 15, 2026

This pass inspected the existing guided picker, catalog metadata, Train routing, logger, reducer, cardio fields, design tokens, and regression tests. The working tree already contained the implementation described below. Unrelated changes were retained.

Files modified in this pass:

- `src/workout/ExercisePicker.tsx`: added an empty-result recovery button that clears search/equipment within the chosen category, a visible Selected label, and an accessible selection hint.
- `src/workout/ExercisePicker.test.tsx`: added tests for recovery, retaining compatible equipment on category changes, and pagination without duplicate exercise controls.
- `TASK_023B_VERIFICATION.md`: recorded current validation and additional device checks.

Pre-edit suite: 449 tests across 23 suites passed. Final suite: **452 tests across 23 suites passed**. TypeScript (`npm.cmd run typecheck`) and ESLint (`npm.cmd run lint`) passed. No existing tests were removed. These totals supersede the earlier validation totals below.

Additional physical Android checks:

- With a category, specific equipment, and an unmatched search, tap Show all [category] exercises. Confirm the category remains, equipment becomes All equipment, search clears, and results return without changing the workout.
- Reselect an existing exercise and verify its visible Selected label and TalkBack checked state. Confirm selection returns to logging and retains the current exercise draft.

No native device or emulator verification was performed. All edits in this pass are inside the mobile project; no dependencies, catalog records/IDs, reducers, calculations, storage, backend, database, authentication, migrations, network calls, commits, pushes, or deployments were introduced.

## Files changed in this task

- `src/workout/ExercisePicker.tsx`: fixed navigation above the scrolling content; modal accessibility scope includes navigation; reopening seeds category and equipment from the current exercise and clears abandoned search/filter choices.
- `src/workout/ExercisePicker.test.tsx`: added reopening, fresh Add, fixed navigation placement, and accessibility escape coverage.
- `src/screens/mobileExperience.test.tsx`: added real app coverage for cardio drafts surviving cancellation and reselecting the same activity, followed by logging and derived pace verification.
- `TASK_023B_VERIFICATION.md`: implementation notes and device checklist.

The workspace already contained the guided picker, its model, model tests, five picker tests, and a real app test preserving strength sets when switching to cardio before this task's edits. These were inspected and retained. Existing unrelated changes were preserved.

## Guided picker

Add exercise and Change exercise in the Train logger open a three-step modal: category, equipment, exercise. Categories are compact wrapping controls with selected states and an explicit Continue action. Category Continue is disabled until selected. A three-segment lime progress indicator and step label show progress. Controls reuse the charcoal/lime design tokens and 48-point minimum touch targets. Back and Cancel remain above the scroll area, including when more results are loaded.

The exercise step combines category, equipment, and alias-aware search. It shows original names, muscle, equipment, and cardio activity category where present. Empty results provide guidance, clear search, and editable filters. Results load in batches of eight through Show more; records are neither copied into a new catalog nor assigned new IDs.

## Catalog mapping

`exercisePickerModel.ts` maps existing metadata only: Chest, Back, Shoulders, Core remain direct; Biceps/Triceps become Arms; Quads/Hamstrings/Glutes/Calves become Legs; Full body displays as Full Body; Cardio remains an activity category. All 423 catalog records belong to exactly one picker category and retain their original object identity and stable ID.

Equipment options are the intersection of catalog equipment order and equipment actually present in the chosen category. All equipment removes that constraint. Display pluralization does not change stored metadata. Separate Smith machine, kettlebell, pool, outdoor, and other existing labels remain available where supported rather than being arbitrarily merged into Other.

## State and navigation

Picker steps, filters, search, and pagination live only in component memory. Going backward preserves choices and search. Choosing a category retains compatible equipment or falls back to All equipment. Android modal `onRequestClose` goes from exercises to equipment to categories, then closes; Cancel and accessibility escape close directly. Reopening starts at categories, seeded from the current exercise, or unselected for Add exercise.

Only choosing an exercise invokes the existing `selectExercise` action. Opening, filtering, Back, and Cancel send no workout actions. The existing reducer retains logged sets, active status, timer, and history on selection; a different selection clears only the existing unlogged exercise draft. Reselecting the current exercise remains a reducer no-op, preserving its draft.

Cardio still uses the logger's duration and supported distance, speed, incline, resistance, floors, and steps inputs. Pace remains derived from duration/distance. Timed activities retain their duration flow. No catalog, reducer, calculation, storage, dependency, backend, authentication, database, or migration changes were made. No network calls, commits, pushes, emulator launches, or deployments were performed.

## Validation

Commands run from `mobile`: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test -- --silent`. The `.cmd` launcher is required in this shell because PowerShell blocks `npm.ps1` under its execution policy.

Pre-edit verification: 394 tests across 21 suites passed, already exceeding the supplied 377-test baseline. Existing tests were retained. Final verification: TypeScript passed, ESLint passed, and all 398 tests across 21 suites passed.

Coverage includes category selected/disabled states, relevant equipment, combined search/filters, empty-state recovery, all 423 IDs and original catalog references, cardio selection, backward navigation, Android modal close handling, cancellation, accessibility labels/escape, unchanged strength sets, cardio drafts, and existing workout/social regressions.

## Limitations

Native layout, TalkBack focus, keyboard behavior, insets, and real Android hardware Back need physical verification. Automated tests mock native views and call modal close handlers. Search stays scoped to the chosen category/equipment. Pace is derived rather than directly editable and displayed for Running activities, matching the existing logger. Picker choices are not persisted between app processes.

## Physical Android verification checklist

- Start Train; open Add exercise. Confirm all eight categories, disabled Continue, lime selected feedback, and visible progression.
- Choose Chest then Dumbbells. Confirm only relevant equipment and exercises; search for incline, clear search, and try a query with no results.
- Load more results and scroll to the bottom. Confirm Back and Cancel remain visible; check narrow screens, large fonts, and portrait/landscape layouts.
- Return through equipment and category with toolbar Back and physical Back. Confirm choices/search survive and incompatible equipment resets to All equipment.
- Log a strength set, enter another unlogged draft, open Change exercise, change filters, and cancel. Confirm set, draft, timer, and active session remain intact.
- Select cardio after a strength set. Confirm the strength set remains and duration plus only supported cardio fields appear, without reps/weight fields.
- Log treadmill running duration, distance, speed, and incline; check displayed pace. Check supported resistance, floors, and steps on applicable catalog activities.
- Enter a cardio draft, cancel Change exercise, reopen, and reselect the same activity. Confirm all entered values survive and log correctly.
- Press physical Back at step one. Confirm only the picker closes and the workout remains active. Repeat with the keyboard open.
- With TalkBack, verify category/equipment selection announcements, exercise checked states, step/result announcements, filter labels, reachable Back/Cancel controls, and focus returning to the logger after dismissal.
- Finish/save the mixed workout and inspect existing summary/share flows for regressions.
