# Task 030A ? Home precision redesign verification

Date: 2026-11-15

## Exact task files

1. `src/screens/PrototypeScreens.tsx` ? Home component, Home-only styles, and Home prop wiring/imports. Progress and all non-Home screen cases retain their behavior.
2. `src/navigation/PrototypeNavigator.tsx` ? Home-only header styles/conditional disclosure and conditional welcome footer. Non-Home presentation and bottom navigation unchanged.
3. `src/components/SkippingRopeIllustration.tsx` ? new original local decorative icon, used only by Home.
4. `src/screens/mobileExperience.test.tsx` ? updated Home copy/disclosure expectations and three focused tests.
5. `TASK_030A_VERIFICATION.md` ? this report.

Existing uncommitted Task 027A/028A/029A changes and assets were preserved. Git status was inspected before editing. No Train, Create, Feed, Profile, backend, database, shared theme/component implementation, social selector, reducer, model, dependency, or business-logic changes were made in this task. Shared navigator changes are conditional on Home. Nothing staged, committed, pushed or deployed.

## Before / after layout values

| Element | Before | After |
| --- | --- | --- |
| Screen horizontal padding | 16 | 16, preserved |
| Hero horizontal padding | 12 | 12, preserved |
| Hero vertical padding | 12 | 8 |
| Hero child gap | 8 | 4 |
| Hero radius | 12 | 12, preserved |
| Main hero heading | 16 / 22 line height, ?Make your next move.? | 14 / 20, weight 600, requested instruction |
| Greeting | 16 / 22, separate row | Removed |
| Instruction below hero | 12 / 18, conditional separate row | Removed; appears once inside hero |
| Workout status | 12 / 18 | 12 / 18, preserved |
| Start / Continue / Review button | 14 / 20, minimum 48-point target | Preserved |
| View Progress | Shared text button: 8 horizontal padding plus 2-point transparent border | Home-only flex action: no horizontal padding/border inset, 14 / 20, minimum 48 high and 44 wide |
| Progress / icon gap | No icon | 8 |
| Skipping-rope canvas | Absent | 48 x 48, nonshrinking |
| Home header title | 22 / 28, left aligned | 22 / 28, centered in full available width |
| Home header disclosure | Demo badge/text below title | Removed from header; local-reset disclosure appears in Following |
| Outer Home section gap | 12 | 12, preserved |

The content grid starts at screen inset 16 + hero inset 12 = 28 points on a normal phone layout. Hero heading, status, primary action bounds and Progress action share that left edge. The primary action retains centered button text. View Progress text has no extra shared TextButton inset. The centered max-width page behavior remains intact on wider displays.

All Home text uses existing native system sans-serif tokens. No fixed heights, line-count truncation or font-scaling limits are applied to hero text. Only the decorative canvas has a fixed size. Primary content uses flexbox; absolute coordinates are confined to icon geometry. Vertical whitespace is reduced through padding/gaps and removal of the greeting, duplicate instruction, Community preview and welcome footer. Final hero height depends on actual font metrics, state and text scaling.

## Home structure

- Home header: centered FitSocial title; existing Back route remains available when navigation history permits, on a separate flex row so it cannot shift the title. Other screens retain their demo header and welcome exit.
- Existing parent vertical ScrollView:
  - Hero: requested instruction; existing workout status; elapsed time when active; existing Start/Continue/Review action; flex row containing View Progress and decorative rope-skipping figure.
  - Existing saved-workout attachment/share action, activity chart and totals when applicable.
  - Following heading and short honest local-demo reset disclosure.
  - Up to two existing PostCards, or compact no-followed-posts card.
  - Open Feed action in both populated and empty states.
- Existing bottom navigation, unchanged.

There is no nested scrolling list, swipe handler or touch-move navigation. Existing PostCard sharing uses its existing modal-only scrolling preview. Post actions and author navigation use the existing callbacks.

## Following source and behavior

Home calls the existing `visiblePosts` selector with a shallow presentation-only state copy setting `filter: "following"` and `feedQuery: ""`, then takes the first two results. This reads actual local-persona outgoing follow edges, uses existing published posts and newest-first ordering, and never changes Feed's selected filter/search or social state. Incoming follower edges do not count. Initial state has no follows, so initial Home honestly shows ?No posts from followed accounts yet.? No relationships or posts are fabricated.

Following updates after existing profile Follow/Unfollow actions. Existing PostCard supplies author navigation, sample/fictional/unverified-trainer labels, likes, comments, share preview, workout attachments and achievements. Its rendering and social actions were not modified. The compact preview is limited to two posts; Open Feed navigates to the existing Feed and preserves its current filter/search.

## Media and artwork

The current Post model and PostCard have no image/video media fields or renderer. Home therefore adds no image/video thumbnails, remote requests, uploads or media features. Existing text, workout attachments and sample achievements render through PostCard.

The skipping-rope figure is original React Native View geometry: a lime rope loop, figure and handles on a 48-point canvas. No external artwork, font, request or dependency. Its wrapper uses pointerEvents="none", accessible=false, accessibilityElementsHidden and importantForAccessibility="no-hide-descendants". It occupies its own flex slot beside Progress, with an 8-point gap.

## Validation

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no warnings/errors in final run.
- `npm.cmd test -- --watch=false`: PASS ? 506 tests across 25 suites (baseline 503 / 25), no snapshots.
- `git diff --check`: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; this task did not edit those files.
- Task-start comparison: Progress function and bottom tab rendering/styles unchanged.
- Added tests cover: centered system-font title and padding/spacing settings; one safely wrapping instruction; minimum action targets and focus feedback; decorative rope size/accessibility; removed Home content; continued demo disclosure and welcome exit elsewhere; identical tab styles; actual follow filtering, incoming-edge exclusion, two-post newest-first cap, independent Feed search/filter, no state mutation on render, existing post interactions/disclosures, and follow/unfollow reflected through the real app.
- Existing Home start/continue/review/progress and navigation tests remain passing. Copy/disclosure expectations were updated to the requested Home behavior; existing functional checks were retained.

An initial lint run found temporary task-start comparison copies under the mobile folder. Those copies were removed; TypeScript, lint and the full suite were rerun successfully against the final source.

## Device verification and remaining checks

Android rendering: UNVERIFIED. iOS rendering: UNVERIFIED. No screenshot, emulator or physical-device rendering was tested during this task; native layout cannot be proved by renderer tests.

On-device review remains necessary for actual title centering, Android sans-serif appearance, rope recognition, narrow-screen/max-font wrapping, action/grid alignment, saved-workout and two-post scroll length, keyboard behavior when commenting, safe areas and normal scrolling without accidental tab navigation. The existing bottom navigation and safe-area behavior were preserved. Final visual acceptance requires owner review of actual device output.
