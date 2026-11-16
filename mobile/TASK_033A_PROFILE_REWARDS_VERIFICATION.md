# Task 033A — Profile Rewards Navigation

Date: 2026-11-16

## Delivered

- Own Profile has a compact rounded Rewards & FitPoints card immediately below profile information, with the requested subtitle, lime native-shape gift icon and small chevron.
- Uses shared dark-theme card, typography, spacing, colors, touch sizing and press/focus feedback. Decorative icon and chevron are hidden from assistive technology; the card has a button label and navigation hint.
- Added one Rewards secondary destination using the existing navigation stack and header Back button. All five primary tabs remain intact; Profile stays selected while viewing Rewards.
- Static Rewards screen includes FitSocial Rewards, a sample 1,250 FitPoints balance, sample membership progress, two sample rewards and “Demo — rewards unavailable”. No earning, redemption, purchases, backend integration or dependencies added.

## Verification

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no errors or warnings.
- `npm.cmd test -- --watch=false`: PASS, 682 tests across 31 suites.
- App integration test exercises Profile → Rewards → header Back → Profile, then Rewards → Android Back handler → Profile. Checks demo content, five visible tabs and Profile selection.
- Navigation reducer test checks Rewards retains Profile as parent and restores its prior route on Back.
- `git diff --check`: PASS. Git reports line-ending conversion notices, with no whitespace errors.
- Diff review confirms edits are confined to Rewards UI, its route, Profile entry and navigation tests. Existing uncommitted work was retained. Existing TASK_033A_VERIFICATION.md was left untouched because it describes a different task.
- Native visual rendering and physical-device interaction were not tested; navigation verification uses the actual App with mocked React Native host components.

## Files changed by this task

1. `mobile/src/components/RewardsMenuCard.tsx` (new)
2. `mobile/src/screens/RewardsScreen.tsx` (new)
3. `mobile/src/social/ProfileScreen.tsx`
4. `mobile/src/screens/PrototypeScreens.tsx`
5. `mobile/src/navigation/navigationState.ts`
6. `mobile/src/navigation/navigationState.test.ts`
7. `mobile/src/screens/mobileExperience.test.tsx`
8. `mobile/TASK_033A_PROFILE_REWARDS_VERIFICATION.md` (new)

Nothing committed or pushed.
