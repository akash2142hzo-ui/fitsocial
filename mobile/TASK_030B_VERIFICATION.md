# Task 030B ? Home refinements verification

Date: 2026-11-15

## Exact files changed for this task

- `src/components/HomeHeader.tsx` (new): Home-only balanced header and notification bell.
- `src/components/BattleRopeIllustration.tsx` (new): original responsive local vector geometry.
- `src/navigation/PrototypeNavigator.tsx`: render HomeHeader only on Home; preserve existing non-Home header.
- `src/screens/PrototypeScreens.tsx`: Home uses battle ropes and Interest discovery preview.
- `src/screens/mobileExperience.test.tsx`: adapt Home expectations to the requested semantics and add focused coverage.
- `TASK_030B_VERIFICATION.md` (new): this report.

Git status and existing components/selectors were inspected first. Earlier uncommitted work, including the former SkippingRopeIllustration source, was preserved. That former illustration is no longer used by Home. No shared theme, other screen implementation, backend, database, reducer, model, dependency or feed selector was edited. No staging, commit, push or deployment.

## Header and notifications

Home has 16-point horizontal header padding, an 8-point gap on each side of the flexible title, and equal nonshrinking 48-point left/right slots. The left slot contains the existing Back action when navigation history permits and reserves the same width when absent. The right slot contains the bell. The title's midpoint is therefore exactly the midpoint of the available screen width, independent of Back availability. The title uses existing system sans-serif 22/28 typography, allows wrapping and text scaling, and has no fixed height or line limit.

The bell is original 24-point lime native geometry inside the existing focusable IconButton with a 48 x 48 minimum touch target and accessible label ?Notifications?. Its geometry is decorative and hidden from screen readers. No unread count is displayed.

Inspection found only unavailable Settings notification controls, not an implemented notification destination. Tapping the bell opens the native informational alert:

- Title: ?Notifications coming soon?
- Message: ?Notifications are unavailable in this local demo. No device permissions are requested.?
- Dismissal: OK (plus native platform alert behavior).

No notification state, storage, permissions, push delivery, ads or backend were introduced. The bell renders only on Home. Other headers keep their demo disclosure and navigation.

## Battle-rope illustration and layout

The hero keeps its 12-point horizontal padding, 8-point vertical padding, 4-point child gaps and 12-point radius. Screen padding stays 16. Instruction remains 14/20 system sans-serif, workout status 12/18, and workout/progress action text 14/20. Start/Continue/Review behavior is unchanged. Progress remains a flex action with minimum 48-point height and 44-point width, visible focus feedback and the original Progress route.

The bottom row uses normal flex layout and an 8-point gap. The old 48 x 48 skipping-rope icon is replaced by a 64-point-high decorative battle-rope canvas that flexes with available width (minimum 112, maximum 192). View Progress and the illustration occupy separate sibling slots. Text can wrap and grow vertically; the illustration cannot overlay the button.

The original lime vector geometry depicts a broad-shouldered standing man on the right, bent arms gripping two ropes, and a wide athletic stance. Two opposite-phase wave paths extend leftward toward a shared anchor, in the direction of View Progress. Each rope comprises 32 short rounded native line segments. Canvas width is measured through onLayout, and rope/figure coordinates update locally. No dependency, external artwork, SVG renderer, image request, font or downloaded asset is required. Absolute coordinates are confined to the decorative canvas, not the primary UI.

The canvas has pointerEvents="none", accessible=false, accessibilityElementsHidden and importantForAccessibility="no-hide-descendants". No decorative content enters the accessibility tree. Its extra 16 points of height accommodate recognizable waves/stance while retaining a compact hero.

## Interest data source and media

The Home heading is now ?Interest?. Home reuses `visiblePosts` with a shallow state copy specifying `filter: "all"` (the existing For You/discovery mode) and an empty search query, then takes the two newest posts. Feed state, its current filter/search, follow relationships and original post ordering are not mutated. The preview includes existing published fitness community posts, including fictional samples, without requiring a follow relationship. It is the existing discovery selection, not a personalized recommendation system.

The existing PostCard is reused without changes, retaining sample/fictional/unverified-trainer labels, text, workout attachments, achievements and existing social actions. Home also explicitly discloses ?Local demo. Changes reset when the app closes. Fictional sample community.? If no posts exist, it shows ?No discovery posts yet.? with a compact explanation and Open Feed action. Open Feed remains available for populated previews and preserves Feed's filter/search, including Following.

The current post model/renderer has no image or video support. No media capability, uploads or remote content were invented. Home uses the existing parent scroll view; no nested scrolling feed or swipe navigation was added.

## Validation results

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS, no warnings or errors reported.
- `npm.cmd test -- --watch=false`: PASS ? 511 tests across 25 suites; baseline 506 across 25.
- `git diff --check`: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited by this task.
- Comparison against task-start source: bottom navigation rendering and styles unchanged; Progress implementation and non-Home route bindings unchanged.

Focused coverage includes:

- Equal 48-point header slots with Back present and absent; full-width title centering styles and 16-point padding.
- Bell hit target, focus feedback, accessible action, truthful alert, no unread count, and absence on other screens.
- Existing Home compact grid, hero wrapping settings, minimum targets, disclosures and unchanged tab styles.
- Two opposite-phase rope paths, left anchor, right-side figure, geometry bounds at 112- and 192-point widths, decorative accessibility, and working Progress navigation.
- Discovery selection independent of follows and Feed filter/search, two-post newest-first cap, no social-state mutation on render, existing card interactions and disclosures, and honest empty state.
- Actual Feed Following behavior and filter persistence remain covered after Home/profile navigation.

Earlier Home Following/skipping-rope assertions were updated to the new requested discovery/battle-rope behavior, retaining functional, accessibility and state-preservation checks. Existing tests were not disabled or loosened.

## Remaining device-verification gaps

Android rendering: UNVERIFIED in this task. iOS rendering: UNVERIFIED. Automated native-renderer tests passed; no emulator or physical device was used for these changes.

Owner review on a device is still needed for battle-rope recognizability, bell appearance and native alert presentation, visual title centering with/without Back, maximum text-size and narrow-screen wrapping, Progress/canvas separation, interest-card scroll length, keyboard interaction and platform safe areas. No annotated screenshot was attached to this turn; figure-right/ropes-left placement follows the written direction. The bottom tab bar and existing safe-area handling remain unchanged.
