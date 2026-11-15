# Task 018A

The local catalog contains 395 entries. All original 120 IDs are preserved.
Entries include tracking metadata and search aliases (including DB, BB, RDL,
pushup and pullup), with the existing muscle/equipment filters.

Tracking supports external weight, bodyweight plus optional added kg, assisted
bodyweight plus optional assistance kg, and whole-second duration activities.
Blank added weight, explicit zero and positive added kg remain distinct. Legacy
records without tracking metadata retain their original external-weight semantics.
Timed entries carry zero reps internally for compatibility, but never contribute
to rep totals or rep-set counts. Activity seconds are separate from session time.

Every new workout starts with no selection. Add exercise opens the searchable
library; set inputs appear only after selection. Switching exercise clears only
unlogged inputs. Existing set bounds, validation and revision checks remain.

Finish freezes an independent unsaved snapshot. Save for this session adds it to
in-memory history exactly once. Share opens the composer without saving and still
requires Publish. Canceling a draft leaves the completed summary intact. Starting
over or leaving an unsaved summary opens a confirmation with Save, Keep reviewing
and Discard. Discard returns to idle; Start workout then begins a fresh session.
Saved history remains available when starting again. Reload/process death can
clear everything. No storage, account, upload or external service is connected.

Home uses native shapes and color surfaces rather than image assets. It shows
saved activity, actual relative timestamps, a review/continue/start action,
saved-workout totals and a community preview. Dates refresh every minute and on
foregrounding. Profile uses a smaller avatar and separates rep sets/activity seconds.
Other screens retain the shared compact design and five-tab navigation.

## Limitations

- Cardio is deliberately excluded: distance, pace and cardio energy assumptions
  need a separate model. Timed entries in this release are resistance/static holds.
- Calories retain the documented coarse 3.5 MET session estimate, including rest,
  with optional entered body weight. No intensity is inferred from set weights,
  reps or assistance. Duration under one minute has no estimate.
- Existing monotonic/wall-clock fallback and process-lifetime limitations remain.
- Dynamic Android inset integration still needs an approved dependency or native
  integration. Existing conservative padding and iOS SafeAreaView are retained.
- No native visual, keyboard, screen-reader or deep-sleep verification was performed.
- No downloaded assets were used. Optional original local artwork can be considered
  later; the current Home is intentionally image-free and needs no image dependency.

## Android checklist (not performed by Codex)

1. Fully reload the app. Open the demo and visit all five tabs; verify headings,
   bars and scrolling on a small screen with large fonts and system navigation modes.
2. Start in Train and Home. Confirm no exercise is selected and no set inputs show.
   Add exercise, search exact variations and aliases, use both filters and reset.
3. Log external-weight sets, bodyweight sets with blank/zero/positive added kg,
   and assisted sets with blank/zero/positive assistance. Check labels and removal.
4. Select Plank. Confirm seconds replace reps and no lifting-weight input appears.
   Log duration, change exercises, and confirm earlier entries remain intact.
5. Try invalid reps, negative/oversized weights, fractional/zero/over-86400 seconds
   and rapid Log set taps. Verify errors and duplicate protection.
6. End an empty session and discard it. Log a nonempty session, cancel End, then
   Finish. Confirm the timer freezes and Progress remains empty before Save.
7. Share the unsaved summary, cancel the composer, and confirm the summary remains.
   Share again and Publish. Compare all set modes, seconds, duration and estimated
   calories in the Feed; Progress must still contain no unsaved workout.
8. Start new workout from unsaved review and press Android Back. Test Keep reviewing,
   Save for this session and explicit Discard. Verify each action preserves the
   appropriate snapshot/history. Repeat while a post/comment draft exists.
9. Save a summary; verify exactly one entry in Progress and Profile. Start again;
   exercise selection must be blank and saved history must remain. Complete/save
   several mixed sessions and check totals and calorie coverage.
10. Check Home's last saved activity, relative timestamps and Review/Continue actions.
    Background/foreground and switch tabs during an active timer.
11. Check Profile bio, followers, posts, Progress and Groups. Exercise likes/comments,
    follows, group membership, text/sample attachments and draft preservation.
12. Check keyboard access to all inputs/actions, TalkBack labels, long names, expanded
    workout details, and temporary-data notices. Repeat platform checks on iOS.

See the Task 017A document for the underlying duration/calorie assumptions. Its
automatic-history workflow is superseded by the explicit Save flow described here.

## Changed files

Created:

- `TASK_018A_VERIFICATION.md`
- `src/workout/smartWorkout.test.ts`

Modified:

- `src/screens/PrototypeScreens.tsx`
- `src/screens/mobileExperience.test.tsx`
- `src/social/ProfileScreen.tsx`
- `src/social/feedPresentation.ts`
- `src/social/profileState.test.ts`
- `src/social/workoutSharing.test.ts`
- `src/workout/ExercisePicker.tsx`
- `src/workout/WorkoutAttachmentView.tsx`
- `src/workout/WorkoutLogger.tsx`
- `src/workout/WorkoutSummary.tsx`
- `src/workout/exerciseCatalog.test.ts`
- `src/workout/exerciseCatalog.ts`
- `src/workout/useWorkoutDuration.test.tsx`
- `src/workout/useWorkoutDuration.ts`
- `src/workout/workoutHistory.test.ts`
- `src/workout/workoutMetrics.test.ts`
- `src/workout/workoutPresentation.ts`
- `src/workout/workoutSharing.ts`
- `src/workout/workoutState.test.ts`
- `src/workout/workoutState.ts`
- `App.tsx`
- `README.md`
