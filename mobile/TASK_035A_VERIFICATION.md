# Task 035A — Rewards + Shop UI redesign

Date: 2026-11-16

## Delivered

- Rewards uses the existing navigation header once, with a small muted gift decoration. Removed the redundant FitSocial Rewards heading and the Rewards-specific generic header warning. Profile Settings access is unchanged.
- Compact highlighted balance card: Your FitPoints, 1,250 FP, a decorative coin and one small Demo badge.
- Removed all Rewards membership progress, Starter/Silver copy and progress-bar UI. No account functionality changed.
- Two reward previews: Profile Badge — 500 FP and Training Theme — 1,000 FP, each with a relevant local icon and Coming soon label.
- FitSocial Shop previews: FitSocial Gym T-shirt and FitSocial Shaker Bottle, each with original native-shape placeholder artwork and Coming soon label. No images downloaded, external photos, prices, stock quantities or runtime-fetch dependencies added.
- Typed display-only reward/product fixtures and shared preview-card rendering provide a presentation boundary for future product data. No future API or commerce implementation was added.
- Both grids use two columns on normal phone/tablet widths, stack when measured content is below 280 dp or font scale exceeds 1.35, and allow untruncated text to grow. Stacked cards use content-driven height. The existing parent ScrollView handles both sections; no nested scrolling, segmented state or inert buttons.
- One short bottom disclosure states that points, rewards and products are examples and earning, redemption, checkout and purchases are unavailable. Noninteractive cards announce their Coming soon status; all artwork is hidden from accessibility.
- Removed Back to welcome only from Rewards. Existing guarded exit flows on other destinations, all five tabs, Profile shortcut, Android Back, workout-return banner and Settings access remain intact.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused Rewards/UI/navigation suite | PASS, 161 tests across 4 suites |
| `npm.cmd test -- --watch=false` | PASS, 694 tests across 32 suites |
| `git diff --check` | PASS; existing unrelated mobile line-ending notices only |
| Empty-baseline whitespace checks for task files | PASS, including new/untracked files |
| Unrelated-file preservation | PASS, all 1,417 files outside the six task paths match the pre-task SHA-256 baseline, including Admin Studio |

Focused command:

```powershell
npm.cmd test -- --watch=false src/screens/RewardsScreen.test.tsx src/screens/mobileExperience.test.tsx src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts
```

Eleven new Rewards tests verify the balance and single demo indicator, absence of membership/progress, both reward cards and point requirements, both product previews without prices/stock/remote images, explicit unavailable operations, no action handlers/buttons, hidden decorative artwork, two-column layout at 320/360/412/768 dp, single-column layout at 1.5x/2x font scale, and response to actual content-width changes. These tests verify rendered content and layout configuration, not native pixel geometry or scroll performance.

Updated real-App tests verify Profile → Rewards, Rewards → Profile, the preserved five-tab order and selected tab, hardware Back to Home, missing obsolete footer/header copy, and draft continuity while navigating through Rewards. Existing workout, composer, settings, social and navigation tests remain enabled.

## Exact files changed by this task

1. `mobile/src/screens/RewardsScreen.tsx`
2. `mobile/src/components/RewardsArtwork.tsx` — new
3. `mobile/src/navigation/PrototypeNavigator.tsx`
4. `mobile/src/screens/RewardsScreen.test.tsx` — new
5. `mobile/src/screens/mobileExperience.test.tsx`
6. `mobile/TASK_035A_VERIFICATION.md` — new

No Admin Studio, backend, database, authentication, payment, social/workout reducers, package manifests or lockfiles changed. All unrelated uncommitted work preserved. Nothing staged, committed, pushed or deployed.

## Remaining limitations

Physical Android/iOS rendering, TalkBack/VoiceOver, scroll smoothness, navigation-bar insets, large-font clipping and split-screen layout remain pending native-device review. ADB is installed, but `adb devices -l` failed before enumeration with a permission error creating `\\.android`; a temporary Android user-directory override did not resolve the host configuration issue. No native visual test or screenshot is claimed. Automated verification uses mocked React Native hosts with real App navigation/state bindings.

The merchandise artwork is illustrative placeholder design, not photography or a promise about a real product. All content remains fictional. No earning, redemption, checkout, purchases or live product data are available.
