# Task 034A — Replace Create Tab With Rewards

Date: 2026-11-16

## Result

- Exactly five primary tabs: Home | Train | Rewards | Feed | Profile.
- Rewards uses a shared native-shape gift icon: lime when active, existing muted styling when inactive. Touch targets, tab accessibility, focus/press feedback and safe areas are retained.
- Profile's Rewards & FitPoints shortcut and the Rewards tab open the existing RewardsScreen. Rewards is now a primary destination and selects its own tab; Profile remains accessible from its tab. Primary Rewards Back uses the existing Home fallback and draft/workout exit guards.
- Feed has a compact shared Create Post button near the top. The existing composer is a secondary route. Header and hardware Back return to Feed without discarding unfinished text. Back closes an open composer discard confirmation before leaving the screen.
- Text posts, sample achievements, publish validation, drafts, save/resume/discard, local demo limits and active workout state retain the existing implementations. No social or workout reducer changes, uploads, dependencies, backend features or real rewards actions were added.

## Verification

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS.
- `npm.cmd test -- --watch=false`: PASS, 683 tests across 31 suites (93.184 seconds).
- `git diff --check`: PASS; existing line-ending notices only.
- Updated navigation tests cover the five-tab order, Rewards as a primary route, and Feed → Create → Back with Feed selected.
- App tests cover both Rewards entries, Rewards → Profile, Rewards hardware Back, unfinished composer text across header/hardware Back and tabs, cancellation confirmation, save/resume/discard drafts, publishing text and sample achievements, and active workout continuity. Existing social interaction tests remain enabled.
- Physical Android/iOS visual and interaction testing remains pending. Automated App tests use mocked React Native hosts and the real app state/navigation bindings.
- The initial suite exposed stale expectations for the removed launcher/tab and discard-confirmation Back precedence. Expectations were updated to the requested navigation; Back now cancels confirmations before popping the composer route.

## Exact files changed in this task

1. `mobile/App.tsx`
2. `mobile/src/components/GiftIcon.tsx` (new; extracted reusable gift drawing)
3. `mobile/src/components/RewardsMenuCard.tsx`
4. `mobile/src/navigation/PrototypeNavigator.tsx`
5. `mobile/src/navigation/PrototypeNavigator.test.tsx`
6. `mobile/src/navigation/navigationState.ts`
7. `mobile/src/navigation/navigationState.test.ts`
8. `mobile/src/screens/mobileExperience.test.tsx`
9. `mobile/src/social/SocialScreens.tsx`
10. `mobile/src/social/profileState.test.ts`
11. `mobile/TASK_034A_VERIFICATION.md` (new)

The workspace already contained extensive uncommitted changes, including Task 033A. Those changes and prior verification reports were preserved. RewardsScreen and ProfileScreen required no edits for this task. Nothing staged, committed, pushed or deployed.
