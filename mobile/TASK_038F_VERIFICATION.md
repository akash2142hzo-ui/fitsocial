# Task 038F — Unified Feed sections and content transitions

Date: 2026-11-16

## Unified Feed

- Feed keeps its existing title and Demo badge, with For You / Trainers / Groups fixed beneath the header outside the scrolling/animated content. Selected text/underline follows the active section.
- Feed tab selection changes an App-owned presentation value rather than pushing a secondary navigation route. Existing TrainerDiscovery and GroupsScreen render directly beneath the shared tabs. Trainer cards/search/chips/filter logic and group demo membership behavior are reused without redesign or duplicated records.
- Embedded sections have no extra Trainers/Groups page header, Back control or Back to welcome footer. For You no longer owns a second tab row. Trainer qualification/fictional-content disclosures remain visible.
- Feed selection survives trainer-profile Back and primary-tab changes. Existing trainer filters and Feed queries stay in authoritative social state. Nonempty For You search reopens on remount. Per-section scroll offsets are recorded/restored when switching Feed sections; existing route-entry scroll reset behavior is preserved.
- Android Back from a trainer profile pops the existing stack back to the selected embedded section. Back from an embedded section without a detail stack first selects For You; subsequent Back follows existing draft/workout guards and primary navigation. Opening the composer selects For You so existing publication/cancellation return flows remain coherent.
- Existing secondary discovery routes remain available for non-Feed entry points such as Profile → Groups; selecting a discovery tab inside Feed does not use those routes or create another stack. There is no group-detail/messaging screen in the existing prototype, and none was invented.

## Motion

- Added one reusable ContentTransition using React Native Animated/useAnimatedValue; no dependency added.
- Feed section changes use a 200 ms horizontal fade-slide, directed by section order. Global route changes use 220 ms content-only transitions: subtle 8 dp primary movement and 18 dp nested-screen movement, with direction reversed when stack depth decreases. Header and bottom navigation remain outside the motion wrapper.
- Opacity stays between 0.94 and 1, avoiding a blank outgoing/incoming interval. Content updates immediately; no outgoing screen clone, timer-delayed navigation or transition-induced keyed remount is used. The navigator's unnecessary ScrollView key was removed. Rapid changes cancel the previous animation/native values before starting the latest transition.
- Existing nested routes, including trainer/author profiles, settings, composer and progress, receive the route transition. Inline expanded workout activity details use a 12 dp content reveal; collapsed wrappers use display:none to reserve no additional card space. Their existing inline close/Back behavior is not replaced by a fabricated detail route.
- Reduced motion defaults to enabled until the accessibility preference is known. A live reduceMotionChanged event stops motion; failed queries keep motion off. A stale preference query cannot override a newer accessibility event. Only opacity and translation use the native driver. No animation is added to individual cards/filter changes.
- Existing reducers retain all workout entries, social drafts, trainer filters, search and membership data. Normal conditional navigation still mounts the active page; this task does not cache hidden screen trees. Empty local search-expansion state may reset on remount, while queries and filters persist. The motion wrapper itself preserves child state when only its transition key changes.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused motion/App/navigator run | PASS, 143 tests across 3 suites before the final additional regression cases |
| Final full `npm.cmd test -- --watch=false` | PASS, 743 tests across 35 suites |
| `git diff --check` | PASS, prior unrelated colors.ts line-ending notice only |
| Empty-baseline whitespace checks | PASS for all twelve task files, including untracked files |
| Unrelated-file SHA-256 comparison | PASS, all 1,508 nonignored files outside these paths match the pre-task baseline |

Focused command:

```powershell
npm.cmd test -- --watch=false src/navigation/ContentTransition.test.tsx src/screens/mobileExperience.test.tsx src/navigation/PrototypeNavigator.test.tsx
```

New/updated tests cover persistent Feed tabs/header, embedded Trainer/Groups content, no obsolete embedded Back/footer, selected state after profile Back, trainer search/specialization persistence, For You query persistence, demo group membership, rapid section switching, bottom-tab selection retention and Back-to-For You before Home. Existing Feed presentation tests compose the now-hosted navigation row separately from the organic-content component.

Seven motion tests verify native-driver/200 ms options, child state/mount preservation, interruption of rapid changes, reduced-motion preference and live updates, stale-query protection, query failure fallback, reverse section direction, and hidden collapsed detail layout. A new App regression cycles primary tabs rapidly with a logged active workout and an unfinished composer, verifying both survive. Existing workout, trainer, draft, Rewards, discovery, navigation and disabled-ad tests remain enabled.

## Native testing status

Attempted `adb devices -l` using a temporary Android SDK home. ADB failed before device enumeration: `Cannot mkdir '\\.android': Permission denied`. Therefore no emulator or physical-device transition run was possible through this host. No Android/iOS screenshot, frame-rate, scroll-stability or native keyboard/Back guarantee is claimed.

Remaining native checks: actual Android Back delivery, animation pacing/direction, chip scrolling, keyboard/focus restoration, reduced-motion settings toggled on-device, section offset restoration/clamping, bottom safe-area behavior, large fonts and lower-end Android performance. Animated timing/stop behavior is unit-tested with mocks; React Native's native animation engine is not simulated by those tests.

## Exact changed files

1. `mobile/App.tsx`
2. `mobile/src/navigation/navigationState.ts` — FeedSection type only; reducer/stack unchanged
3. `mobile/src/navigation/PrototypeNavigator.tsx`
4. `mobile/src/navigation/ContentTransition.tsx` — new
5. `mobile/src/navigation/ContentTransition.test.tsx` — new
6. `mobile/src/screens/PrototypeScreens.tsx`
7. `mobile/src/social/SocialScreens.tsx` — remove its embedded navigation row
8. `mobile/src/social/FeedControls.tsx` — active section support
9. `mobile/src/workout/WorkoutAttachmentView.tsx` — inline detail content transition only
10. `mobile/src/screens/mobileExperience.test.tsx`
11. `mobile/src/social/FeedPresentation.test.tsx`
12. `mobile/TASK_038F_VERIFICATION.md` — new

TrainerDirectory/cards, Home/Rewards/Profile layouts, social/workout reducers, disabled ad configuration, backend, database, authentication, payments, Admin Studio, dependencies and package configuration are unchanged. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or published.
