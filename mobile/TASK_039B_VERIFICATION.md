# Task 039B — Create Post composer redesign

Date: 2026-11-16

## Delivered

- Create Post uses one fixed compact header: Back arrow, Create Post title and a small lime Post action. Removed the generic Create header/demo subtitle, redundant body Cancel link, bottom Publish button and Create-only Back to welcome footer. Header remains outside the keyboard-resizing scroll content.
- Post is disabled for empty/whitespace-only ordinary posts, over-limit content, the existing 50-local-post cap, already-published workout attachments, draft-list views and discard confirmation. Its explicit local-demo accessibility label is retained. Valid posting dispatches the existing publishPost action/version/timestamp and returns to Feed through the existing App behavior.
- Factored the reducer's unchanged text/workout-caption/post-cap validation expression into postValidationError, shared by reducer and UI. Original version, timestamp, duplicate-workout and state mutation guards remain in the reducer. No publication rules were weakened or replaced with client-only checks.
- Compact identity row uses existing local/demo name, username and initials with a small Demo indicator. No authenticated identity is invented.
- Open writing area has no textarea border/background, uses What's your fitness story today?, preserves multiline typing, existing bounded input height, selection color and font scaling, and shows a live character counter. The existing 500-character publication limit remains enforced. The input retains the prior one-over-limit allowance to show validation feedback; it cannot publish 501 characters.
- Add achievement is a compact trophy/supporting-text/plus row. Inline sample choices preserve selection semantics, show the existing fictional details and retain typed text. Attached samples have a compact preview and supported Remove control. Actual workout attachments retain their existing read-only metrics/details and optional-caption exception.
- Compact Drafts, Save Draft and Discard post controls retain original actions. Draft-list Resume/Discard/New text post and pending-workout share actions use compact targets. Discard post invokes the existing confirmation flow rather than silently deleting input. Back retains the existing local in-progress draft; Android Back retains existing stack/discard-confirmation behavior. No duplicate composer route added.
- One concise disclosure says posts/drafts are local, not uploaded and cleared when the app process closes. Confirmation messages, sample-achievement provenance and workout metric caveats remain where necessary.
- All compact actions have minimum 44 dp targets, accessible labels/states, keyboard focus and restrained press feedback. Existing KeyboardAvoidingView, scroll/tap behavior, bottom-bar handling and reduced-motion-aware route transitions are reused. No extra animations, media uploads, service connections or dependencies.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused composer/App/draft/state tests | PASS, 177 tests across 4 suites |
| Full `npm.cmd test -- --watch=false` | PASS, 752 tests across 36 suites |
| `git diff --check` | PASS, existing unrelated colors.ts line-ending notice only |
| Empty-baseline whitespace checks | PASS for all seven task files, including new/untracked files |
| Unrelated-file SHA-256 comparison | PASS, all 1,535 nonignored files outside these paths match their pre-task baseline |

Focused command:

```powershell
npm.cmd test -- --watch=false src/social/PostComposer.test.tsx src/screens/mobileExperience.test.tsx src/social/drafts.test.ts src/social/socialState.test.ts
```

Nine new composer cases verify the single header action, disabled initial posting, open field/placeholder, demo disclosure, empty/whitespace/501-character rejection without writes, live 500-character count and valid publish, version-guarded double submission, sample selection/removal with text retention, keyboard dismissal, draft save/resume, Back retention, safe discard/keep-editing, optional workout caption, duplicate workout rejection and the existing post cap. Test-only workout/cap fixtures do not add runtime demo records.

Existing real-App tests continue covering Feed → composer → Feed, text and sample publication, drafts and pending shares, cancellation/discard prompts, Android Back, keyboard bindings, active workouts and Feed state. Tests now use Discard post in place of the removed Cancel link, Add achievement in place of the old attachment button, the new concise persistence disclosure, and disabled-state/hint assertions for initial empty content. No tests skipped or disabled.

## Exact files changed

1. `mobile/src/social/PostComposer.tsx` — new header, body and compact action components
2. `mobile/src/social/PostComposer.test.tsx` — new tests
3. `mobile/src/social/SocialScreens.tsx` — reuse composer body, compact draft controls and one disclosure
4. `mobile/src/social/socialState.ts` — extract the existing validation expression for shared use
5. `mobile/src/navigation/PrototypeNavigator.tsx` — Create-only header/footer presentation
6. `mobile/src/screens/mobileExperience.test.tsx` — updated UI expectations and action labels
7. `mobile/TASK_039B_VERIFICATION.md` — new report

No backend, authentication, database, payment, real upload, Admin Studio, package/dependency, workout state or unrelated screen-layout changes. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or published.

## Native visual testing and limitations

Physical Android/iOS visual review, keyboard-open geometry, multiline caret scrolling, small-screen/large-font wrapping, screen-reader traversal, native hit testing and hardware Back delivery remain pending device testing. Automated tests use mocked native hosts with real reducer/App navigation bindings; keyboard dismissal callbacks are tested, not physical keyboard behavior. No native screenshot or performance guarantee is claimed. Drafts and publications remain in memory and disappear on app-process reset.
