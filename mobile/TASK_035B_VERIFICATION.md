# Task 035B — FitPoints info and reward refinement

Date: 2026-11-16

## Changes

- Added a lime circled information icon beside Your FitPoints. It has an About FitPoints button label, descriptive hint, expanded state, keyboard focus/press feedback and a 44 dp effective touch area (24 dp visual plus 10 dp hit slop each side). The existing balance, colors, cards and grids are retained.
- The button opens a compact, height-bounded native Modal with a scrollable body, four decorative activity icons, clear Close control, accessibility modal semantics and accessibility escape support. Android Back is handled by the native Modal's onRequestClose; no app navigation or BackHandler logic was changed.
- Information title: How to earn FitPoints. Lists planned eligible workouts, daily progress tracking, weekly challenges, and sharing daily/weekly fitness progress to other social media. Explicitly states that sharing verification is unavailable. Required disclaimer: “FitPoints earning is coming soon. Current balances and rewards are examples.” No point amounts or integrations added.
- Replaced Training Theme with Exclusive Profile Frame, retaining 1,000 FP and Coming soon. Replaced its theme artwork with a local avatar/frame illustration. Profile Badge, merchandise illustrations, Shop previews, balance and existing demo restrictions are preserved. No real frame functionality added.

## Verification

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no warnings/errors.
- Focused Rewards/UI/navigation tests: PASS, 166 tests across 4 suites.
- Full mobile regression, `npm.cmd test -- --watch=false`: PASS, 699 tests across 32 suites.
- `git diff --check`: PASS; prior unrelated mobile line-ending notices only.
- Empty-baseline whitespace checks for all five task files: PASS, including previously untracked source files. Line endings match repository CRLF conventions.
- SHA-256 comparison: all 1,431 files outside these five paths match their pre-task baseline, including Admin Studio, navigation, other screens, configuration and existing reports.

Tests verify modal opening, all four planned activity descriptions, the exact disclaimer, no earning controls, explicit unavailability of sharing verification, close dismissal, onRequestClose dismissal, accessibility escape, reopening, expanded state and unchanged 1,250 FP balance. Reward assertions require Exclusive Profile Frame at 1,000 FP and reject Training Theme. Real-App integration verifies Rewards stays selected after info dismissal, Shop content remains present and Profile → Rewards continues working. Existing responsive grid, product preview, Android Back/navigation and regression coverage remain enabled.

Focused command:

```powershell
npm.cmd test -- --watch=false src/screens/RewardsScreen.test.tsx src/screens/mobileExperience.test.tsx src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts
```

## Exact files changed

1. `mobile/src/screens/RewardsScreen.tsx`
2. `mobile/src/components/RewardsArtwork.tsx`
3. `mobile/src/screens/RewardsScreen.test.tsx`
4. `mobile/src/screens/mobileExperience.test.tsx`
5. `mobile/TASK_035B_VERIFICATION.md` — new

No dependencies, backend, database, authentication, payments, social integrations, admin, navigation, social/workout reducers or earning/redemption logic changed. Only local presentation state controls the modal. No points are awarded or deducted. All unrelated changes preserved. Nothing staged, committed, pushed or deployed.

## Limitations

Physical Android/iOS modal rendering, TalkBack/VoiceOver focus handling, font scaling, hit testing and native hardware-Back event routing remain pending device review. Automated tests use mocked React Native hosts and explicitly invoke Modal.onRequestClose, the callback React Native routes Android Back to while a native modal is visible; they do not simulate a physical OS Back event. Existing App state/navigation bindings are exercised in integration tests. No native visual testing is claimed.
