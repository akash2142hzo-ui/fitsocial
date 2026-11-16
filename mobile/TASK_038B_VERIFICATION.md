# Task 038B — Compact Feed, shared Home posts and disabled ad boundary

Date: 2026-11-16

## Delivered

- Feed retains its title, replaces the generic demo header subtitle with a small Demo badge and offers a working Settings icon using the existing settings destination/Back stack. Other screen headers are unchanged.
- For You / Following / My Posts use a horizontal, background-free row of selected-state filter buttons, lime text and thin underline for the current filter, muted inactive text, visible focus feedback and minimum 44 dp targets. Buttons retain existing accessible labels/selected state and dispatch the original filter actions. They are filter controls, separate from the five bottom navigation tabs.
- Compact composer entry combines the current local avatar, Share your fitness journey... placeholder, draft-in-progress hint and a lime + Post shortcut. Both targets open/continue the original composer. No media picker or upload capability was added.
- Search remains directly accessible as a compact 44 dp field with the original search label/action, clear-search behavior and result count. Trainers and Groups remain clearly labelled shared TextButton links. Fictional-community disclosure remains visible in a small plain caption.
- Existing PostCard now uses a bordered compact surface, 32 dp avatar, name/username row, subtle timestamp, readable post text, preserved sample/local/trainer disclosures, compact achievement accent strip and balanced Like / Comment / Share actions. All existing counts, handlers, comment drafts and share preview remain. No engagement figures were invented. The inspected PostCard had no report control/reducer action; no existing reporting path was removed or replaced with a fake action.
- Home already rendered PostCard, so it automatically receives exactly the same post presentation. Profile also reuses that component. No Home layout, hero, workout navigation, progress chart, selectors or business logic was changed. Workout attachments continue using their existing expandable component with all metrics/disclosures intact.
- Existing parent ScrollView, safe-area handling, bottom navigation and footer behavior are retained. Controls support text growth, wrapping and focus. No animations, external media, new dependencies or business-state changes.

## Reused and new components

- Reused PostCard on Feed, Home and Profile; no duplicate post implementation.
- Reused shared Avatar, Input, TextButton, IconButton, Button, EmptyState, SocialIcon and WorkoutAttachmentView; existing social selectors/reducers supply every count, filter, draft and mutation.
- Added FeedFilterTabs and FeedComposerEntry in FeedControls.tsx, scoped to Feed.
- Added SponsoredContent, FeedAdPlacement and isSponsoredPosition as a future display boundary, not an advertising integration.

## Disabled ad placement architecture

FEED_AD_PLACEMENT is frozen and disabled by default. Its configurable afterPostCount is 3. If future integration enables it, a single candidate position is strictly between the third and fourth visible posts, only on unsearched For You. It never precedes the first or follows the final post. No Home, Profile, workout, composer or other sensitive-flow call site exists.

SponsoredContent returns null unless explicitly enabled AND given a renderer that supplies content. Feed supplies no renderer. Therefore changing the placement flag alone cannot display a pretend ad. Disabled slots have no visible blank reserved area. No SDK, production/test ad IDs, network request, consent tracking, impression logging or click handlers were installed. The reusable outer container applies a visible Sponsored label and spacing/border, has no parent Pressable or organic actions, and leaves future advertising interactions to the actual native SDK adapter. Test-only supplied content exists solely inside automated tests.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused component/App/navigation tests | PASS, 161 tests across 4 suites |
| Full `npm.cmd test -- --watch=false` | PASS, 718 tests across 33 suites |
| `git diff --check` | PASS, prior unrelated line-ending notices only |
| Empty-baseline whitespace checks | PASS for all seven task files, including new/untracked files |
| SHA-256 preservation check | PASS, all 1,460 nonignored files outside the seven task paths match the pre-task baseline |

Focused command:

```powershell
npm.cmd test -- --watch=false src/social/FeedPresentation.test.tsx src/screens/mobileExperience.test.tsx src/navigation/navigationState.test.ts src/navigation/PrototypeNavigator.test.tsx
```

New tests check filter action/selection and compact styling; both composer targets; compact search and discovery callbacks; compact organic cards, disclosures and action targets; disabled ads/no renderer invocation; a strictly between-post candidate; required Sponsored labelling for explicitly supplied test content; and absence of organic actions in the sponsored boundary. A real-App test compares the first Home/Feed card's rendered content and style, checks Settings → Android Back → Feed, and verifies draft preservation through + Post → composer → Back → main composer entry.

Existing tests continue covering all filter modes, follows, search/empty/clear behavior, Trainers/Groups/author navigation, text/sample achievement publication, drafts/save/resume/discard, likes/comments, share previews, Home discovery, Android Back, active workouts and all five bottom tabs. Header tests now expect the compact fictional-community disclosure instead of the removed large generic Feed subtitle.

## Future AdMob requirements — not implemented

1. Select and review a maintained native Google Mobile Ads adapter compatible with the actual Expo/React Native versions; obtain approval before adding native dependencies/build configuration. Use dedicated SDK test modes/devices during integration; do not test against live inventory. Implement ad loading/error/no-fill/unmount cleanup and prevent duplicate requests. This wrapper alone is not a NativeAdView or a completed SDK integration.
2. Render SDK assets within the native ad container, register asset views and leave click/impression handling to the SDK. Preserve required attribution and AdChoices, asset dimensions/aspect ratios, and native accessibility. Do not wrap the whole card/whitespace in an invented click handler. The current Sponsored caption/spacing must be validated against native policy before enablement. [Native rendering](https://developers.google.com/admob/android/native/advanced), [native ad policy](https://support.google.com/admob/answer/6329638).
3. Implement the platform privacy/consent flow before requesting ads, including consent-status refresh, required forms, privacy-options access and request eligibility checks. Handle denial, errors, age-related restrictions and applicable regional requirements; assess data collection and store privacy disclosures. [Android UMP](https://developers.google.com/admob/android/privacy), [iOS UMP](https://developers.google.com/admob/ios/privacy). Review current Apple tracking/ATT and Google Play advertising/data-safety obligations separately against the selected SDK and intended audience; this task does not implement or certify compliance.
4. Keep the feature off until native device, accessibility, consent, policy and invalid-traffic reviews pass. Test placement density, scroll stability and interaction separation on small phones and large text. Keep clear Sponsored/Ad attribution, preserve space around organic action targets, and never use overlays or workout/composer placements. Provide a release-controlled kill switch and appropriate app/ad-unit configuration in the future integration; no IDs belong in this foundation task.

## Exact files changed

1. `mobile/src/social/SocialScreens.tsx`
2. `mobile/src/social/FeedControls.tsx` — new
3. `mobile/src/social/SponsoredContent.tsx` — new
4. `mobile/src/social/FeedPresentation.test.tsx` — new
5. `mobile/src/navigation/PrototypeNavigator.tsx`
6. `mobile/src/screens/mobileExperience.test.tsx`
7. `mobile/TASK_038B_VERIFICATION.md` — new

No backend, authentication, database, production API, real ads, uploads, package manifest/lockfile, Admin Studio or social/workout reducer changes. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or published.

## Native visual status and limitations

Physical Android/iOS visual review, screen-reader traversal, exact wrapping at all DPI/font settings, safe-area insets, native keyboard behavior and scroll performance remain pending. Automated tests use mocked React Native hosts and real App navigation/state bindings; passing tests do not prove native pixel geometry or performance. No native screenshots, live-ad requests or policy certification are claimed. Current compact filter controls preserve selected-button accessibility semantics rather than adding navigation destinations.
