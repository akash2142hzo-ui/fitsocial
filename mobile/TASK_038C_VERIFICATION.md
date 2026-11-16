# Task 038C — Feed navigation and shared social cards

Date: 2026-11-16

## Delivered

- Feed has only For You / Trainers / Groups in its compact underline navigation row. For You uses the existing discovery selector; Trainers and Groups open their existing secondary destinations with the current navigation stack. Redundant discovery links were removed. The five primary navigation tabs are unchanged.
- Home's existing Interest area now offers For You / Following. Following uses the existing `social.filter` selection and `visiblePosts` follow-edge logic, not an independent feed state. It shows published posts from followed authors and an honest empty state when no matches exist. The shared selection survives author-navigation Back. Home workout content, actions, metrics and routes are unchanged.
- Profile's own post section is clearly titled My Posts and uses `visiblePosts` with the existing local-post filter. It ignores Feed search and Home Following selection, without duplicating post data. Existing drafts, empty-state composer access, post interactions and author navigation remain. Other authors' profiles retain their existing author-specific selector.
- Feed always projects For You from the same social records, regardless of Home's Following selection. Existing reducer/state fields remain intact; selecting For You can set the shared selection back to all. No social reducer or model changed.
- Composer entry now reads Share your progress... with a small avatar and icon-only + shortcut. Both existing accessible composer targets, draft hints and callbacks remain.
- Feed search starts collapsed behind Search Feed. Opening exposes the real search input. Query data remains in existing state, persists through author navigation and field collapse, and retains results/clear controls. A preserved nonempty query reopens the input on Feed remount. The demo disclosure and search button share one compact toolbar row, reducing space before the first post.
- Shared PostCard uses a stronger name, small username/timestamp line, compact avatar and visible sample/local/trainer disclosure. Achievements use a native-shape trophy and WORKOUT ACHIEVEMENT label on the existing olive panel, with sample statistics and their important fictional-activity caveat. No activity/counts were invented. Like and Comment show compact icon/count controls with their full existing accessible action labels; Share remains a local preview. Removing the visible Comment word prevents its awkward wrapping. The action row stays horizontal.
- Home, Feed and Profile reuse the same PostCard. No duplicate post implementation, media upload, animation, API, production integration or new dependency was introduced.
- SponsoredContent, disabled placement configuration and future Sponsored labelling are unchanged. No fake ads or blank ad blocks appear; organic actions remain separate from the unused future ad boundary.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused Feed/App tests | Covered by final full run; 127 tests across the two targeted suites |
| Full `npm.cmd test -- --watch=false` | PASS, 716 tests across 33 suites |
| `git diff --check` | PASS; prior unrelated colors.ts line-ending notice only |
| Empty-baseline whitespace checks | PASS for all eight task files, including untracked files |
| Unrelated-file SHA-256 check | PASS, all 1,473 nonignored files outside these eight paths match the pre-task baseline |

Final full-suite coverage includes:

- New Feed navigation labels, thin selected underline/contrasting labels, no Following/My Posts controls in Feed, and no duplicate Trainers/Groups controls.
- Working discovery routes with Android Back returning to Feed.
- Following selection on Home, follow/unfollow immediately reflected in its posts, empty state, selection preserved after author Back, and workout actions still present.
- Profile My Posts, publishing/local post interactions and draft save/resume/discard through Profile's existing drafts entry.
- Both composer entry targets, draft text retained through Back, text/sample-achievement publishing, cancellation and preview-only sharing.
- Collapsed search, expansion, real query dispatch, query persistence through profiles, matching/empty/clear behavior and publishing after an unmatched search.
- Shared Home/Feed card rendering and style, sample/trainer disclosures, current Like/Comment counts and handlers, disabled ad rendering/renderer invocation, and between-post-only future placement planning.
- Existing workout, Rewards, Settings, navigation and remaining regression suites.

Tests were updated to use the relocated Home/Profile controls rather than the removed Feed filters. The old three parameterized Feed-filter styling cases were replaced by one navigation test covering all three new controls; this accounts for the net reduction from 718 to 716 tests. Existing functional flows remain exercised. An old assertion that a post immediately followed the Home Interest heading was updated to verify the new social tabs followed by the first post. No tests were skipped or disabled.

## Exact changed files

1. `mobile/src/social/FeedControls.tsx`
2. `mobile/src/social/SocialScreens.tsx`
3. `mobile/src/social/ProfileScreen.tsx`
4. `mobile/src/social/SocialIcon.tsx`
5. `mobile/src/screens/PrototypeScreens.tsx`
6. `mobile/src/screens/mobileExperience.test.tsx`
7. `mobile/src/social/FeedPresentation.test.tsx`
8. `mobile/TASK_038C_VERIFICATION.md` — new

No Admin Studio, backend, authentication, database, social reducer, navigation reducer, ad configuration/SDK, package manifest or lockfile changes. Existing post records, follow edges, counts, draft data and workout state remain authoritative. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or published.

## Native testing and limitations

Physical Android/iOS visual review, TalkBack/VoiceOver, exact text wrapping at all widths/font scales, native keyboard/Back delivery and scrolling performance remain pending. Automated tests use mocked native hosts and real App state/navigation bindings; passing tests do not certify pixel layout or native performance. No native screenshot or actual advertising/upload functionality is claimed. Profile uses an in-place My Posts section rather than inventing a separate post-detail route; its existing composer, author and share-preview navigation is preserved.
