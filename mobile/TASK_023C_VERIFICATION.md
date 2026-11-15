# Task 023C — discovery Feed and social content polish

## Latest completion — November 15, 2026

The workspace already contained the three Feed sections, fictional sample content, stable newest-first ordering, follow filtering, compact secondary discovery actions, publication handling and their tests. This pass inspected Feed cards, social models/reducer, fixtures, trainer identity/filtering, Groups, composer/drafts, workout attachments, app routing and keyboard/scroll behavior. It retained those implementations and all 452 baseline tests.

Files modified in this pass (no files created):

- `src/social/socialState.ts`: added bounded, in-memory feed search and combined it with the existing section selector. Successful publication clears search so the newly published post is visible. Search does not increment the mutation version used by publication/comment duplicate guards.
- `src/social/SocialScreens.tsx`: added accessible search, matching-result counts, clear search, a distinct search empty state and a direct Drafts action in My Posts. The existing Create route opens first, then the existing openDrafts action shows drafts without publishing anything.
- `src/social/feedDiscovery.test.ts`: six additional tests covering text/name/username search, combined filters, draft exclusion, current identity, exercise-name search with unchanged attachment data, publication visibility and query limits/version behavior.
- `src/screens/mobileExperience.test.tsx`: three additional real-app tests covering search/profile Back/clear recovery, direct Drafts navigation with five tabs, and publication followed by local like/comment interactions.
- `TASK_023C_VERIFICATION.md`: current validation and device checks.

Search matches all whitespace-separated terms, case-insensitively, across post text, the current author display name/username and attached workout exercise names. It searches published records only, inside the selected For You / Following / My Posts section, without changing newest-first ordering or stored records. Queries are limited to 80 characters and retained in existing in-memory social state through navigation. Search does not dismiss the keyboard or reset scroll on each keystroke; submit and Clear dismiss it. Existing parent keyboard avoidance and drag dismissal remain in use.

Final checks from `mobile`: `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd test -- --silent`. TypeScript and ESLint passed; **461 tests across 23 suites passed** (452 retained plus nine new tests). These totals supersede the earlier historical totals below.

No dependencies, network requests, persistence, backend/database/authentication changes, environment changes, workout model/calculation edits, commits, staging, pushes, emulator launches or phone installations were introduced.

Additional physical Android checks:

- Search For You by text, name, username and a published workout's exercise. Check chronological order, singular/plural result counts, no-match guidance and Clear recovery.
- Search, open an author, then use hardware Back. Verify the query and section remain. Switch to Following/My Posts and confirm search stays scoped to that section.
- Search with the keyboard open. Verify typing retains focus, Submit/Clear dismiss it, and the existing Hide keyboard and hardware Back paths work.
- In My Posts, tap Drafts with a saved draft and with an active composer. Confirm the Drafts screen opens, no publication occurs, pending workout shares remain available, and resume/discard still work.
- Publish after an unmatched search. Confirm For You opens with cleared search and the new post appears once. Like/comment and expand an attached workout; verify unchanged values and duplicate publication guards.

Native Android/iOS layout, large text, insets, keyboard and TalkBack/VoiceOver focus still require physical verification. Automated tests mock native views. Search is literal in-memory term matching, without fuzzy matching, hashtags, recommendations, online visibility or remote pagination. Existing fictional sample interactions remain labeled demo data.

## Files created / modified

Created:
- `src/social/feedDiscovery.test.ts`
- `TASK_023C_VERIFICATION.md`

Modified:
- `src/social/socialState.ts` — Following filter, author-scoped My Posts, deterministic presentation order, publication returns to For You.
- `src/social/sampleData.ts` — two additional fictional posts and one fictional community identity.
- `src/social/SocialScreens.tsx` — three primary filters, secondary discovery actions, actionable empty states, visible display names, fictional/demo context and unverified trainer labels.
- `src/navigation/PrototypeNavigator.tsx` — filter changes dismiss the keyboard and reset the parent Feed scroll.
- `src/social/socialState.test.ts`, `src/social/drafts.test.ts`, `src/social/workoutSharing.test.ts` — replace hardcoded two-sample post totals with fixture-derived totals; original assertions and scenarios retained.
- `src/screens/mobileExperience.test.tsx` — rename Yours interactions to My Posts, and add app-level discovery, follow/unfollow, draft/publication, navigation and empty-state coverage.

The workspace had unrelated modified and untracked files before this task. These were preserved. Only mobile files were edited for this task.

## Feed filtering and ordering

The existing social model remains in place. Internal `all` and `local` filter keys remain stable, displayed as For You and My Posts; `following` is the only new filter key.

- For You: all published records in the current process, including fictional examples and the user's published text/workout posts. No recommendation algorithm or invented personalization.
- Following: posts whose author ID matches a follow edge from the local persona. Other personas' follow edges are ignored. Filtering existing posts rather than joining/concatenating per follow prevents duplicate results.
- My Posts: only local-origin published records owned by the local persona. Origin alone does not imply ownership.

All three use the same newest-first selector. Equal timestamps sort by stable post ID in code-point order; invalid timestamps sort last. Sorting uses a filtered copy and does not mutate stored records. A compact Newest first label makes ordering explicit.

## Sample content

Four fixed, authored examples cover a workout achievement, a discussion about routine, a trainer's training-notebook idea, and a community movement check-in. Existing Maya and Alex author IDs and post IDs remain unchanged; Sam adds a fictional community member without a trainer profile. Sam is reachable through the post's author profile action and can be followed there.

The Feed explicitly labels the community fictional and engagement as demo interactions. Individual sample cards retain Sample / Fictional labels; sample achievement attachments remain clearly marked. Existing sample likes/comments are retained as demo fixtures, with counts still derived from actual in-memory records. No verified badge, credentials, real-user claims, new medical guidance, stock popularity totals, remote data or recommendation service were added.

## Cards and follow integration

Cards retain compact separators, avatars, relative timestamps, readable text, collapsible workout attachments, likes, comments and preview-only sharing. Display names now appear above usernames. Enabled trainer authors have an Unverified trainer label, also included in the accessible profile action. Profile screens retain the full existing trainer disclosure.

Existing follow/unfollow actions update the same follow relationships immediately; the selector recomputes when returning to Feed. Following persists as the selected filter through author, Trainers and Groups navigation. Empty Following provides a Discover trainers action; a followed author without posts also yields the quiet-feed state. Empty My Posts and For You provide Create post actions.

Trainers and Groups remain secondary Feed actions, separate from the three primary filters. The five primary bottom tabs remain Home, Train, Create, Feed and Profile. Existing selected states, 48-point touch targets, typography and charcoal/lime controls are reused. Filter changes dismiss the keyboard and reset scroll without clearing comment drafts. The existing parent keyboard avoidance and Android navigation handlers remain in use.

## Draft / publishing compatibility

The selector reads only `posts`, never active or parked composers. Save, resume, edit, confirmed discard, pending workout shares and duplicate publication protection remain in the existing reducer. A successful publish selects For You and navigates through the existing app flow so the new post is visible even if the user previously selected Following. The same record also appears under My Posts; it does not appear in Following through self-follow.

Shared workout status, frozen attachment snapshots, collapsible workout details and existing workout calculations remain unchanged. No catalog IDs were edited. No backend, Supabase, auth, persistence, dependencies or network requests were added. No commit, push, emulator or physical-device launch was performed.

## Checks

Run from `mobile`:
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test -- --silent`

All checks passed: TypeScript, ESLint with zero warnings, and 412 tests across 22 suites. All 398 baseline test scenarios are retained, with fixture counts and renamed filter interactions updated for the requested content/UI. Fourteen additional tests cover filtering, follow/unfollow, stable identities, publication visibility, draft exclusion, deterministic ordering, disclosures, empty actions and navigation. Existing workout/share/interaction tests passed in the full suite.

## Known limitations

All content and interactions remain local and reset when the process restarts. For You is chronological discovery, not personalized recommendations. Sample timestamps are fixed; relative labels become calendar dates as time passes and refresh on render. There is no live timestamp timer or remote pagination. Native keyboard, layout, TalkBack focus and physical Back behavior need device verification; component tests mock native views.

## Physical Android verification checklist

- Open Feed. Confirm For You, Following and My Posts, clear selected feedback, Newest first and fictional/demo context. Check small screens and large text for readable wrapping and 48-point targets.
- Inspect achievement, discussion, educational and community posts. Confirm display names, usernames, relative/calendar times, fictional labels and Unverified trainer labels.
- Select Following with no follows. Open Discover trainers, then use hardware Back. Confirm Following remains selected.
- Open Maya's author profile from For You. Confirm the full Unverified disclosure, follow locally and return to Following. Confirm only Maya's posts appear once.
- Follow Alex and Sam from their profiles. Confirm Following shows the union of their existing posts once each, newest first. Unfollow and verify removal immediately after returning to Feed.
- Like/unlike and open comments. Type a comment, switch filters and return; confirm the draft survives. Submit once and check the count. Test the keyboard, scrolling, Hide keyboard and hardware Back.
- Open My Posts with no publications. Use Create post, save a draft and confirm it is absent from all feeds. Resume/edit and test confirmed discard / Keep draft.
- With Following selected, publish a text post. Confirm Feed opens on For You with the post visible, and My Posts contains it once. Following must exclude it.
- Complete a workout, share through Create, save/resume its draft and publish once. Confirm For You/My Posts, Shared status, existing duplicate prevention and expandable workout details.
- Open Trainers and Groups from Feed and return using toolbar/hardware Back. Confirm filter selection and five bottom tabs remain predictable.
- With TalkBack, check filter selected states, names/usernames, unverified disclosure, author navigation, Like/Unlike, comment expansion and empty-state actions.
