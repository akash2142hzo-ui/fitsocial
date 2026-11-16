# Task 032D - Compact calorie and body-weight UI

Date: 2026-11-15

## Exact files changed for this task

- `src/workout/WorkoutLogger.tsx`
- `src/screens/mobileExperience.test.tsx`
- `TASK_032D_VERIFICATION.md`

Git status was inspected before editing. Existing uncommitted changes were preserved. No other screen, shared theme, navigation, exercise picker, logged-set component, reducer, validation helper, calculation, dependency, persistence or backend was changed. Nothing staged, committed, pushed or deployed.

## Before and after

Before: Calories repeated a long unavailable/estimated sentence and a second caption (either Add body weight for estimates or General estimate; may not reflect cardio). The weight action/value used a separate unstructured line.

After: two compact rows with local decorative flame/scale shapes, an inline label/status group on the left and the existing information or weight action on the right. Label/status groups wrap naturally when needed. A hairline separator separates body weight from calories. The complete disclosure is kept behind the information action; no repeated general-estimate paragraph appears in the default card.

The existing 12 dp session-card padding and timer layout are unchanged. The metrics-only wrapper adds the 4 dp spacing token horizontally for an effective 16 dp inset from the card edge. Its row gap is 12 dp, icon-to-content gap 8 dp, and label/status gaps are 8 dp horizontally / 4 dp on wrapping. Text uses existing 14/20 body and 12/18 caption tokens with the configured platform system sans-serif family. Text containers have no fixed height, line clamps or disabled scaling; flex shrink and maximum widths permit natural wrapping. The information and shared Add/Edit controls retain 48 dp minimum touch targets. Icons are hidden from screen readers and use native Views, without downloads, emoji, extra dependencies or images.

## Display states and behavior

- No validated weight: Calories / Add weight to estimate and the existing + Add weight action. Missing weight retains priority when time is also below one minute, matching the previous prerequisite ordering.
- Validated weight, less than 60 seconds: Calories / Available after 1 min.
- Validated weight, eligible elapsed time: Calories / Estimated: <existing formatted value> kcal. The word Estimated remains visible in the compact row.
- Validated weight with unavailable time: Calories / Time unavailable. No fabricated numeric estimate.
- Weight row: Body weight, current numeric kg value when available, and Edit; otherwise + Add weight.

The inline editor still uses the existing shared Input and Save/Cancel components. Draft changes do not update committed workout weight until Save; Cancel leaves it unchanged. The same 1-500 kg, finite, positive, up-to-two-decimal validator and the existing editBodyWeight action are used. The displayed workout-only/Profile-default explanation remains within the editor. The inline entry expands only while editing; the row action can close it without saving, like Cancel.

The existing estimateCalories, formatCalories and minimum-duration constant supply the presentation. The timer hook, formula, prerequisites, reducer, frozen metrics, Profile defaults, workout action buttons, logged entries, save/end/share flows and navigation were not changed.

The original information button retains its accessible label/hint, expanded state, focus feedback and toggle. The same complete CALORIE_DISCLAIMER plus prerequisite sentence is rendered in the existing inline disclosure only when expanded. The session-keyed collapsed-on-entry/new-session behavior is unchanged. This implementation uses the requested compact disclosure rather than a new modal.

## Validation

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no warnings/errors.
- `npm.cmd test -- --watch=false`: PASS, 582 tests across 27 suites, 67.158 seconds (starting baseline: 578 tests / 27 suites).
- Focused screen suite before the final small wrapping-style refinement: PASS, 102 tests. The final full run includes those same tests and the refinement.
- `git diff --check`: PASS. Git emits existing LF/CRLF notices for SocialIcon.tsx and colors.ts; those files were not edited in this task.

Four new test cases were added (one state/disclosure workflow and three parameterized accessibility-layout cases).

Focused coverage includes exact missing-weight, 59-second and 60-second states; the existing 70 kg -> 4 kcal estimate at 60 seconds; full original disclosure and closing it; weight Add/Edit and preserved draft validation, Save/Cancel, Profile-default separation and timer continuity. New parameterized checks use a 280 dp mocked width at font scales 1, 2 and 3 with 499.99 kg, checking flexible label containers, no fixed text height/clamps, system font tokens, hidden decorative icons and 48 dp controls.

Earlier active-session expectations were updated to the new labels without removing workflow assertions. Completed-workout calorie wording and its tests remain unchanged. No tests were disabled or weakened.

## Remaining device-verification gaps

Android/iOS rendering is UNVERIFIED. Renderer tests inspect the layout contract but do not execute native text measurement or prove wrapping/visual acceptance. Verify the owner's Expo/native build on a narrow Android phone and iOS with large accessibility text: short status wrapping, kg values, information/Add/Edit focus and touch areas, native flame/scale appearance, inline editor keyboard/scroll clearance, and expanded disclaimer readability. The existing inline disclosure intentionally increases the card height while open. No physical-device screenshot or emulator verification was performed for this task.
