# Task 023A - one-time workout sharing and resumable drafts

## Files changed

All paths below are relative to mobile/.

Modified:
- App.tsx
- src/social/socialState.ts
- src/social/SocialScreens.tsx
- src/social/ProfileScreen.tsx
- src/screens/PrototypeScreens.tsx
- src/screens/mobileExperience.test.tsx
- src/workout/workoutSharing.ts
- src/workout/WorkoutLogger.tsx
- src/navigation/PrototypeNavigator.tsx
- src/navigation/PrototypeNavigator.test.tsx

Created:
- src/social/WorkoutShareAction.tsx
- src/social/drafts.test.ts
- TASK_023A_VERIFICATION.md

Existing unrelated workspace changes were preserved. Many source files were already untracked before this task, so git diff alone does not describe this task's edits.

## State model and lifecycle

The workout reducer already assigns monotonic local completed-workout IDs and preserves its counter when completed summaries are discarded. This task does not change that reducer, its Save behavior, formulas or exercise catalog.

Social state now has an active composer with a stable draft ID, a parked drafts array, a separate nextDraftId counter, a Drafts presentation flag, and a targeted discard-confirmation ID. Drafts remain separate from posts, so published post counts and author profiles exclude drafts. Existing comment drafts remain independent.

- Opening Create preserves the existing direct-composer behavior when there are no parked drafts. An existing Drafts view or parked drafts remain discoverable on return.
- Open Drafts shows the active composer and parked drafts without replacing either. Profile also exposes a draft count and entry point.
- Save draft parks the current caption and attachment, closes the composer, and opens Drafts. This operation neither publishes nor saves workout history.
- Resume moves the selected draft back to the composer, keeping its ID, caption, sample attachment or workout snapshot. Editing and saving again updates that draft rather than duplicating it.
- An active composer blocks resuming/sharing another draft, with a clear instruction to save, publish or discard it first. No existing draft is silently overwritten.
- Workout share re-entry resumes the existing draft for that source ID. It does not recreate its attachment from possibly changed input.
- Targeted discard requires confirmation. Keep draft and Android Back cancel it. Discarding one parked draft preserves the active composer and all other parked drafts. Cancelling a composer preserves parked drafts.
- The existing exit/all-drafts confirmation includes parked drafts and explicitly states their count when relevant. Only an explicit confirmation removes them.
- Successful publication consumes the active draft and opens Feed. A validation, capacity, timestamp or stale-version failure does not publish or mark shared.

Draft IDs use their own monotonic counter, leaving local post/comment identity allocation unchanged. No auth, persistence or cross-device behavior was added.

## Publication and duplicate prevention

publishedWorkoutPost derives successful publication from local posts by local author ID and attachment source/workoutId. There is no second shared flag that can drift from the Feed. Current posts have no deletion operation, so this remains the source of truth for the running process.

App guards the share entry point. The social reducer independently rejects share entry for an already-published source and checks the source again before publication. Existing version guards reject repeated/stale publish taps, including after parking and resuming a draft. Empty/invalid/cancelled/saved drafts never establish a published record.

Distinct session IDs remain separately shareable even with identical sets and totals. Existing draft and publication checks use IDs, never content equality.

Workout attachments clone and freeze the attachment object, sets array, each set, nested cardio measurements, totals and metrics. Source history/session objects remain independent and unfrozen. Published posts receive another independent snapshot. A parked draft can still be resumed and published after its unsaved Train summary was explicitly discarded.

## UI and navigation

- Exactly five primary tabs remain Home, Train, Create, Feed and Profile.
- Home, Train summary and Progress use one shared WorkoutShareAction: Share workout for unshared sessions, Resume workout draft for an existing draft, and compact Shared status after successful publication. Shared has no active share action and an accessible source-workout label.
- Create has a discoverable Drafts control, active/parked draft cards, resume, save, new-text-post and confirmed discard actions, plus a simple empty state. Caption previews distinguish drafts from published posts.
- Pending share lists unique completed current/history sessions without a draft or successful publication. Active unfinished sessions are excluded. It never creates a draft, saves history or publishes automatically.
- Feed and personal profile display Shared workout with the source ID only for published workout posts. Drafts do not appear as posts. Existing trainer identity, unverified disclosures, normal posts, likes, comments, follows and groups remain functional.
- Create explains that Share publishes to FitSocial's local demo Feed and that drafts/local posts are lost when the app process resets.
- Saving, opening Drafts and resuming dismiss the keyboard and reset the existing page scroll. Typing does neither. Composer identity keys prevent sample-option state leaking between drafts.
- Existing Task 022A shared cards, typography, controls and spacing are reused; no extra navigation tab, dependency, animation or third-party share action was introduced.

## Verification

Final checks (all passed):

- npm.cmd run typecheck: tsc --noEmit, exit 0.
- npm.cmd run lint: ESLint, exit 0, no errors or warnings.
- npm.cmd test -- --silent: 19/19 suites, 377/377 tests passed, 0 snapshots, 7.467 seconds.
- Baseline preserved: 353 tests; added: 24 meaningful regressions. No remaining automated check failures.

 All 353 pre-existing tests were retained without weakening assertions or increasing timeouts. New tests cover source-ID publication guards, failed publication, stale taps, cancellation, draft save/resume/edit/discard, snapshot isolation/freezing, normal/sample/trainer posts, independent workout Save, process-local reset, navigation consistency, keyboard/scroll transitions, unsaved-summary discard, and separately sharing identical sessions.

## Known limitations

Everything is in memory. Process reset/reload loses drafts, local published posts and their publication markers. IDs are scoped to that running app instance; no permanent or cross-device guarantee exists. The existing 50-local-post limit remains, and an unpublished draft stays editable/resumable if it is reached.

Only one composer is active at a time. To resume another draft, first save, publish or explicitly discard the active one. Pending share uses currently available completed summaries and saved history; explicitly discarded summaries are not retained unless a draft or published snapshot already captured them. Saving a social draft does not save workout history.

Native layout, TalkBack focus/announcements, keyboard/IME behavior and Android/iOS system insets still require physical-device verification. No emulator, phone deployment, networking, new storage/dependencies, backend/Supabase changes, environment changes, staging, commits or pushes were used.

## Android physical-device checklist

1. Complete a workout, Share, caption and Publish. Tap Publish rapidly; verify one local post. Check Shared and absence of another active share action in Train, Home and Progress; confirm the same published details on Profile.
2. Complete another identical workout. Verify it can be independently shared once and both source IDs remain distinct.
3. Cancel a workout composer, cancel the discard confirmation, then explicitly discard. Verify the workout stays unshared and Save workout remains independent.
4. Save text and workout drafts; navigate among tabs; resume and edit captions. Confirm snapshot sets/cardio/metrics are unchanged, drafts are not Feed posts, and the process-reset disclosure is visible.
5. Keep an active draft while trying another share or resume. Verify the warning and preservation of both drafts. Save the active draft and then resume the other.
6. Discard a parked draft: test Keep draft, Android Back, and explicit confirmation. Confirm other drafts, published posts, likes/comments and saved history remain. Test the all-drafts exit confirmation separately.
7. Park an unsaved workout-share draft; explicitly discard its Train summary; resume/publish the captured draft. Verify Progress stays empty until a workout is explicitly saved.
8. Check Pending share excludes the active unfinished workout and already-published/drafted sources. Verify the empty Drafts state after discarding all drafts.
9. Publish a resumed normal post and trainer post; check correct author identity and Unverified trainer disclosure, plus local likes/comments and profile counts.
10. At large text sizes with TalkBack, inspect wrapping, control labels, selected tabs, warnings, confirmation focus, keyboard dismissal on Save draft/Resume, and scroll preservation while typing. Check gesture and three-button navigation insets.
11. Reset the app process: confirm no local drafts/posts or shared markers survive; no cross-device/persistent-storage claim appears. Also verify notch/home-indicator and keyboard behavior on a physical iOS device when available.
