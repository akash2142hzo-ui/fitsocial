# Task 039C — Two-card Create Post layout

Date: 2026-11-16

## Delivered

- Active composer now has two main charcoal cards, with subtle rounded borders, 16 dp internal padding and 12 dp separation. The existing screen's 16 dp horizontal margins and header Post action remain unchanged.
- First card groups demo identity, avatar/username, editable multiline field and live bottom-right character counter. Placeholder remains What's your fitness story today? Writing height is a practical 104 dp minimum with the existing 240 dp maximum; text entry, validation, font scaling, keyboard behavior and controlled draft content are preserved.
- Second card groups the trophy/Add achievement row with Attach a workout milestone subtitle and compact plus, existing inline sample options and a removable preview explicitly marked Fictional sample.
- Below a subtle divider, Drafts (existing count) and Save Draft are equally sized rounded buttons with original native-shape paper/save icons. Targets have minimum 44 dp dimensions, shared padding, focus and press feedback, and wrapping labels for large text.
- Discard Post sits below that row as a full-width outlined button, using restrained muted red text/icon and border instead of lime. It dispatches the existing composer-only discard request; no content is removed before confirmation. Keep editing retains text, and confirmed discard does not erase saved drafts or publications.
- Existing disabled styling and accessibility states remain on Post and compact actions; the new draft-action component also supports disabled appearance/press guarding. Valid active-draft actions are not arbitrarily disabled.
- Exact notice below cards: “Demo only · Posts and drafts aren't permanently saved.” It replaces the previous disclosure once, including in the existing draft-management view. No upload, persistent storage or achievement verification claim is introduced.
- Existing workout-caption attachments remain read-only in their prior sharing flow; this task adds no real workout milestone integration. Ordinary achievement selection remains fictional sample data only.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused composer/App/draft/state tests | PASS, 182 tests across 4 suites |
| Full `npm.cmd test -- --watch=false` | PASS, 757 tests across 36 suites |
| `git diff --check` | PASS; prior unrelated colors.ts line-ending notice only |
| Empty-baseline whitespace checks | PASS for all five task files, including untracked files |
| Unrelated-file SHA-256 comparison | PASS, all 1,551 nonignored files outside these five paths match their pre-task baseline |

Focused command:

```powershell
npm.cmd test -- --watch=false src/social/PostComposer.test.tsx src/screens/mobileExperience.test.tsx src/social/drafts.test.ts src/social/socialState.test.ts
```

New/updated checks verify both card groupings, charcoal surface/padding/borders, Post outside both cards, text/counter in the first card, attachment/actions in the second, equal-width icon buttons with minimum touch dimensions, separate destructive outline, drafts access/return with text and attachment intact, explicit sample preview and confirmation before discarding current content. Confirmed discard preserves saved drafts and published records.

A real-App keyboard-visibility test verifies both cards, enabled header Post, KeyboardAvoidingView and handled-tap/drag-dismiss scroll configuration remain available as keyboard show/hide events occur, without losing typed text. This verifies wiring/configuration, not physical keyboard geometry.

Existing tests retain coverage of 0/500/501-character validation, Post enable/disable, local publication/version guards, local-post cap, draft save/resume, sample selection/removal, workout-caption exception, Android Back, Feed return, cancellation, active workouts and unchanged bottom navigation. No tests removed or disabled.

## Exact changed files

1. `mobile/src/social/PostComposer.tsx`
2. `mobile/src/social/PostComposer.test.tsx`
3. `mobile/src/social/SocialScreens.tsx` — disclosure text only
4. `mobile/src/screens/mobileExperience.test.tsx`
5. `mobile/TASK_039C_VERIFICATION.md` — new

No navigation, header Post implementation, social/workout reducer, backend, authentication, database, real achievement integration, media uploads, Admin Studio, dependency or package configuration changes. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or published.

## Remaining limitations and native status

Physical Android/iOS visual review, actual keyboard-open geometry, multiline caret scrolling, small-screen/large-font wrapping, native hit testing, accessibility traversal and hardware Back delivery remain pending device testing. Tests use mocked native hosts with real App/reducer bindings; no native screenshot, exact pixel layout or performance claim is made. Existing publication/draft persistence remains in-memory only.
