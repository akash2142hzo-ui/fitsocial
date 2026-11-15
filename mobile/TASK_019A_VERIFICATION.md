# Task 019A

The catalog contains 423 entries: the previous 395 plus 28 cardio activities.
All existing IDs remain unchanged. Cardio includes walking/treadmill, running,
cycling/spin/air bike, elliptical, stairs, rowing, jump rope, swimming and stroke
variations, hiking, HIIT, aerobics, dance cardio, ski erg and trail running.

## Tracking and validation

External-weight exercises require explicit kg and positive whole reps. Recorded
zero is allowed only for catalog entries using machines, cables, Smith machines
or resistance bands, where an unloaded/resistance setting can be meaningful.
Blank is never converted to zero. Previous records remain readable without
retroactive validation or changes. Bodyweight added kg and assistance kg remain
optional and retain distinct labels. Timed holds require seconds without reps/kg.

Cardio requires 1–86,400 whole seconds. Optional metrics start blank and preserve
explicit zero. Only catalog-supported fields are shown and recorded:

- Walking/running: distance; treadmill additionally speed and incline.
- Cycling: distance; stationary cycling/spin additionally machine resistance.
- Stairs: floors and steps; rowing/swimming: distance (rower resistance optional).
- Elliptical: distance/resistance; ski erg: distance; HIIT/jump rope/dance/aerobics:
  duration only. These activities do not pretend to have exact intensity.

Bounds: distance 0–1,000 km; speed 0–100 km/h; incline 0–40%; resistance 0–100
machine units; floors 0–10,000; steps 0–100,000. Floors/steps require integers;
other optional metrics accept at most two decimal places. Bounds are input
guardrails, not statements about fitness capacity. Machine units are not kg and
are not comparable between different machines. Pace is derived only for running
with positive duration and positive recorded distance, and shown in min/km.

Cardio contributes no reps or rep sets. Its manually logged activity time remains
separate from the timestamp-based session elapsed time. Neither time is added to
the other. All summaries, including local share previews, use the same formatting.
Nested cardio values are copied at completion and sharing boundaries. Finish,
explicit temporary Save, unsaved Share and discard protections remain intact.

Calories retain the general 3.5 MET × entered body kg × elapsed session hours
formula, including rest. This coarse resistance assumption may not reflect cardio
or mixed sessions; the visible disclaimer says so. Speed, incline, resistance,
reps and lifted kg do not infer intensity or affect the estimate. Optional body
weight and minimum-duration rules remain. Frozen estimates are never recomputed.

## Home, header and assets

Home has a compact greeting, restrained geometric hero, saved activity, relative
timestamps, totals and a community preview. The seven-day chart uses saved history
only, grouped by device-local calendar date. Future, undated and older entries are
excluded. Empty history shows zero bars and an explicit empty message. Each day
has an accessibility label with its full date and count. Dates refresh each minute
and when foregrounding. Unsaved completions do not appear in the chart.

The shared header shows a small FitSocial wordmark on Home and the destination
name elsewhere. Duplicate scrolling headings were removed. The five tabs, Back
handling, scroll resets and existing platform padding are retained.

Photo research used the official [Pexels license](https://www.pexels.com/license/)
and the [candidate page](https://www.pexels.com/photo/an-empty-gym-9545907/).
The download was blocked by environment socket permissions (WinError 10013).
No photo was downloaded, bundled or hotlinked. The native geometric fallback is
used. Source/author/license review metadata and the pending visual rights check
are recorded in `assets/asset-manifest.json`. Manual image approval requires
checking people, logos and trademarks after obtaining the image. No endorsement
is implied. There are no runtime photo URLs or new image dependencies.

## Remaining limitations

There is no GPS, sensor tracking, auto-distance, calorie-intensity inference,
persistent storage or network-backed data. Cardio metrics are manually entered.
The calorie method is coarse. Exact dynamic Android insets still need an approved
dependency or native integration; prior conservative Android padding/iOS safe areas
remain. Native visual, keyboard, TalkBack/VoiceOver, locked-device clock behavior
and system-bar verification were not performed. No emulator was launched.

## Android checklist (manual verification outstanding)

1. Fully reload and open the demo. Visit all five tabs and secondary destinations.
   Confirm compact headers, visible content, Back actions and one temporary notice.
2. Select an external-weight exercise. Try blank kg, zero dumbbell kg and valid kg.
   Check that a machine can explicitly record zero, and blank never becomes zero.
3. Verify added kg and assistance kg are optional, distinctly labeled, and remain
   distinct from calorie body weight. Check timed holds show only activity seconds.
4. Add exercise and Change exercise should both be visibly lime and comfortable
   to tap. Search aliases (including Assault Bike), use Cardio/equipment filters,
   select long names and confirm changing exercises preserves logged entries.
5. Log Incline Treadmill Walking: 1,500 seconds, 4.5 km/h, 8% incline, optional
   distance. Check blank versus zero and reject negative/oversized/malformed values.
6. Log Outdoor Running with duration and distance. Check derived pace. Blank/zero
   distance must produce no pace. Check cycling resistance, stair floors/steps,
   rowing and swimming distance. HIIT must not show invented intensity fields.
7. Mix strength, holds and cardio; remove entries and test rapid duplicate taps.
   Compare rep totals, rep sets, logged activity time and elapsed session time.
8. Finish without saving; check the frozen summary and empty history/chart. Share
   without saving, cancel/reopen the composer, then explicitly Publish. Expand the
   Feed preview: verify speed, incline, distance, pace and correct assistance labels.
9. Save once. Compare Progress, Home, Profile and Feed details. Start another session
   and confirm previous snapshots and estimates remain unchanged. Test discard and
   Android Back protections with both active workouts and unfinished social drafts.
10. Check the seven-day chart with no history and saved sessions. Compare visible
    counts to history, check day labels with TalkBack and verify foreground refresh.
11. Exercise likes, comments, follows, local bio edits and Groups. Check small screens,
    large fonts, keyboard scrolling, decimals, system navigation modes and cutouts.
    Repeat platform-specific checks on iOS. All data may clear on reload/close.

Validation: TypeScript and ESLint passed; 304 tests passed across 16 suites,
including 42 additions. Component tests use mocked native views, not a device.

## Files changed

Created:

- `TASK_019A_VERIFICATION.md`
- `assets/asset-manifest.json`
- `src/components/ActivityChart.tsx`
- `src/workout/activityChart.ts`
- `src/workout/cardio.test.ts`
- `src/workout/cardio.ts`

Modified:

- `src/navigation/PrototypeNavigator.tsx`
- `src/screens/PrototypeScreens.tsx`
- `src/screens/mobileExperience.test.tsx`
- `src/social/ProfileScreen.tsx`
- `src/social/feedPresentation.test.ts`
- `src/social/feedPresentation.ts`
- `src/social/workoutSharing.test.ts`
- `src/workout/ExercisePicker.tsx`
- `src/workout/WorkoutAttachmentView.tsx`
- `src/workout/WorkoutLogger.tsx`
- `src/workout/WorkoutSummary.tsx`
- `src/workout/exerciseCatalog.test.ts`
- `src/workout/exerciseCatalog.ts`
- `src/workout/smartWorkout.test.ts`
- `src/workout/workoutMetrics.ts`
- `src/workout/workoutSharing.ts`
- `src/workout/workoutState.test.ts`
- `src/workout/workoutState.ts`
- `README.md`
