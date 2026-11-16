# TASK 044B — Super-slim personal Profile status row

Both Level and Edit now have identical 40 dp visual heights in a single horizontal row. Level contains a small lightning icon, `Lv. 4`, compact Active Mover text, the existing tiny Demo label and a 14 × 3 dp inline progress indicator. The separate heading/progress rows and vertical padding were removed. Edit remains lime with its pencil/label and is 70 dp wide.

The surrounding row reserves 48 dp and centers both visuals. Edit has 4 dp top/bottom hit slop, producing a 70 × 48 dp accessible touch region without increasing its visible height. The level is informational, not a new interactive control. Rank text flexes and fits a single line; compact status text scales up to 1.2 while full level/rank/demo/progress meaning remains in the accessibility description. Other Profile text/layout is unchanged.

Existing illustrative Level 4 and 40% progress remain unchanged. There is no real XP earning, progression calculation, persistence or FitPoints conversion to preserve or introduce. Edit still opens the existing editor through the same action.

## Exact changed files

1. `mobile/src/social/ProfileScreen.tsx` — only personal level/Edit markup, sizing, inline progress and hit target.
2. `mobile/src/screens/mobileExperience.test.tsx` — compact row geometry, inline progress/value, touch-region and narrow/large-text expectations; existing Edit/save/Back coverage retained.
3. `mobile/TASK_044B_VERIFICATION.md` — this report.

No public profiles, Quick Access, My Posts, Settings, navigation, dependencies or unrelated work were changed. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --watch=false --runTestsByPath src/screens/mobileExperience.test.tsx src/social/profileState.test.ts src/social/ProfilePhotoWorkflow.test.tsx --testTimeout=15000` — passed: 155 tests across 3 suites. Includes inline geometry/value, enlarged-text contracts, 48 dp Edit touch region, Edit/save/Back and existing profile/photo flows.
- The initial same-suite run at Jest's default 5-second per-test deadline passed 154 tests and timed out one unchanged public-profile test, without an assertion failure. The rerun above passed all cases with a larger deadline; no default test configuration or application behavior was changed to bypass the timeout.
- `git diff --check` — passed, with existing unrelated LF/CRLF warnings.

No physical Android visual test was performed. Tests use mocked native layout/dimensions, so real font fitting, screen-reader exploration and hit-region geometry still need device review. The compact status row deliberately caps visual text scaling; the rest of the Profile retains its existing scaling behavior.
