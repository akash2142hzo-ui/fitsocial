# Task 034E - Duplicate React keys

Date: 2026-11-16

## Root cause

WorkoutLogger's weight header rendered two sibling elements (the weight Text and WeightUnitToggle) with identical key={labelKey}. That string was fontScale + ':' + workout.exercise. At the reported Android scale/exercise both became 0.8999999761581421:Resistance Band Pull-Apart. The floating value is font scale, not an exercise score. This was introduced by the measurement-remount keys in Task 034D. No duplicate exercise record caused this warning.

## Exact files changed

- src/workout/WorkoutLogger.tsx: derive stable catalog ID and give label/control distinct role-qualified keys.
- src/screens/mobileExperience.test.tsx: regression at the exact reported scale, with search, selection, logging, unit switching and console-warning checks.
- TASK_034E_VERIFICATION.md: this report.

Before: weight label and switch both used `${fontScale}:${workout.exercise}`.
After: `${labelIdentity}:weight-label` and `${labelIdentity}:weight-unit-toggle`; Reps label uses `${labelIdentity}:reps-label`. labelIdentity is the existing stable exercise ID (band-pull-apart for this exercise). The font-scale measurement cache remains separate from React keys. Native onLayout still observes layout/font changes. No random values, list indexes, scores or names form these React keys.

## Audit and preservation

Inspected Git status and searched mobile source list rendering (.map, key, FlatList, SectionList and keyExtractor). The picker already uses exercise.id, logged entries use set.id, and grouped summaries render one group per exercise. No FlatList/SectionList/keyExtractor implementation was found. Static illustration segments/test-fixture index keys were unrelated and left unchanged. The catalog has one Resistance Band Pull-Apart entry, ID band-pull-apart; existing full-catalog uniqueness tests remain enabled. No records were deleted or deduplicated, and ordering/filtering/calculations/selection/layout are unchanged. All prior uncommitted work was preserved. No node_modules/backend edits, staging, commits, pushing or deployment.

## Regression

At fontScale 0.8999999761581421, select Shoulders, search band and confirm exactly one matching Pull-Apart control. Clear search and confirm another shoulder exercise remains. Search band pull apart, select the exact exercise, log 8 reps at 5 kg, verify the remove control targets the correct exercise/set, switch to lb and verify 11.02 lb. Capture console error/warn and reject same-key/unique-key/duplicate-key messages throughout the flow.

## Validation

TypeScript: PASS. ESLint: PASS. Full mobile suite: 679 tests across 31 suites PASS (11.92 seconds). Git diff --check: PASS; existing LF/CRLF notices concern earlier work in SocialIcon.tsx and colors.ts, untouched here.

## Runtime gaps

Physical Android/iOS rendering remains unverified. The reproduced component flow passes in the mobile renderer; check the owner's Expo/native build at the reported font scale and after changing exercise/font size. No physical-device log or screenshot was captured. No tests were disabled or weakened.
