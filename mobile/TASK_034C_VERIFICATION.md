# Task 034C - Compact rounded weight unit toggle

Date: 2026-11-16

## Exact files changed in this task

- `src/workout/WorkoutLogger.tsx`: WeightUnitToggle markup and unit-specific styles only.
- `src/screens/mobileExperience.test.tsx`: selected-color assertion follows the smaller visible segment; touch-target checks remain and strengthen to 50 x 44; add font-scale 3 coverage and a compact-pill test.
- `TASK_034C_VERIFICATION.md`: this report.

Git status was inspected before editing. Earlier uncommitted work was preserved. No Reps input, Log Set, form-cell styles, label-row alignment styles, conversion utility, reducer, validation/calculations, other screen, asset, dependency, backend or navigation changes. Nothing staged, committed, pushed or deployed.

## Visual and touch sizing

The two native pressable segments each have 50 dp minimum width and 44 dp minimum height, making a normal-size 100 x 44 dp interaction region. A decorative charcoal track inset by 3 dp vertically produces a 100 x 38 dp visible pill. Both the track and visible segments use radius 999. The selected visible segment uses the existing lime accent and dark text; the unselected segment exposes the charcoal track. The existing Total weight label remains to the left of the control through the unchanged flex label row.

The visible segments have a 38 dp minimum height and natural content sizing, while their outer pressables preserve touch targets without overlapping hitSlop. The track alone uses absolute background geometry; text and touch targets remain in normal flex layout. The track ignores touches and is hidden from screen readers. Existing accessible labels, selected state, focus ring, pressed opacity and conversion callbacks remain.

Toggle text reuses the shared system sans-serif button style with local 13 sp / 18 line-height and weight 500. No text line limit, disabled scaling, fixed text height or maximum control width is imposed. At larger accessibility text sizes the toggle may grow beyond the nominal 100 x 38 visual target; the already-existing responsive form cells/label wrapping can accommodate that instead of clipping. No changes to Reps or Log Set were needed.

## Validation

- TypeScript (`npm.cmd run typecheck`): PASS.
- ESLint (`npm.cmd run lint`): PASS, no warnings/errors.
- Relevant screen and conversion/state suites: PASS, 139 tests across 2 suites, 7.559 seconds.
- Git diff checks (`git diff --check`): PASS. Existing LF/CRLF notices concern SocialIcon.tsx and colors.ts from earlier work, untouched in this task.

Coverage checks both segment touch targets, rounded track/selection geometry, medium 13 sp system text, focus/pressed feedback, selected lime/dark colors, no text clamping and mock font scales 1/2/3 on a 280 dp screen. All existing conversion, no-rounding-drift, input validation, canonical kg, history/Progress, calorie and Log Set tests in these suites pass. No tests were disabled or weakened.

The interrupted prior Task 034B recheck finished successfully before this change (656 tests / 30 suites). This task ran the requested relevant suites after the toggle-only edits; that earlier full run is not claimed as a full run of the new styles.

## Device verification

Android/iOS rendering remains UNVERIFIED. Tests inspect styles and behavior rather than native layout measurements. Check the owner's Expo/native build for the visible 38 dp pill, rounded selection, right alignment beside Total weight, touch/focus feedback and large-text growth without overlap on narrow screens. No physical-device screenshot or emulator verification was performed.
