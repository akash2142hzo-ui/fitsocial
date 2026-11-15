# Task 020A visual refinement

Scope: mobile presentation and relevant tests only. Workout reducers, catalog,
tracking metadata, calorie math, history, social reducers and navigation state
were left unchanged. No requests, downloads, dependencies or persistent storage
were added. No emulator/device verification was performed.

## Audit and implementation

The principal density problems were unconditional empty history/chart/statistics
on Home; always-expanded optional settings; a large timer card; persistent
validation instructions; repeated header rows; and repeated boxed secondary actions.
The implementation keeps existing data and interactions while refining visibility,
shared spacing/typography, touch targets and action hierarchy.

- Home: smaller native geometric hero, one primary workout action, and a connected
  tappable community preview. Chart, last saved workout and statistics require
  actual saved history. Active and unsaved sessions keep Continue/Review actions.
- Chart: standalone **Your activity** heading, separate **Last 7 days** caption,
  40-point plot height, counts and weekday labels. Zero bars remain zero. Calendar
  aggregation and per-day accessibility descriptions are unchanged.
- Train idle: Start workout comes first without an oversized introductory card.
  Optional body weight lives in collapsed Workout settings. Values stay in the
  existing app state; validation errors keep settings visible until corrected.
- Train active: compact elapsed-time row, concise field labels, no persistent
  numeric-validation paragraph, and explicit errors on relevant interactions.
  Add exercise remains solid lime; Change exercise uses a lime outline/accent
  surface, keeping Log set/activity the principal solid action during logging.
- Entries: grouped exercise headings, compact rows, readable cardio units, and
  accessible Remove controls. Empty/zero-only metrics are hidden. Selected exercises,
  placeholders and unlogged inputs still do not contribute to totals.
- Summary: Save appears before the potentially long exercise list. Share is secondary
  while unsaved, then becomes primary after Save; New workout stays secondary.
  Save-once and unsaved-discard safeguards retain their existing implementation.
- Progress: statistics require saved history; zero logged-activity duration is hidden.
  Elapsed session time and manually logged activity time remain distinct.
- Profile/Feed/Create/Groups: shared compact type/surfaces, a small Edit bio action,
  reduced padding, unboxed workout-detail actions and a shorter caption editor.
  Existing fields, disclosure labels, comments, follows, groups and drafts remain.
- Header: one concise temporary-data notice shares the compact title row. Back to
  welcome moves into the scrollable page footer and still uses the same protected
  exit callback. Secondary Back remains in the header. Scroll reset and keyboard
  handling are preserved. The Expo developer overlay was not changed.

Calorie assumptions remain visible in concise form, with the full existing
disclaimer available through About calorie estimates. No calorie calculations or
historical estimates were changed. Body weight remains optional.

## Validation

- TypeScript passed.
- ESLint passed without warnings.
- 318 automated tests passed across 17 suites, including 14 new cases.
- Existing tests were updated for intentional visibility, settings and copy changes;
  none were deleted. Automated views are mocked and do not verify native pixels.

## Android checklist (manual verification outstanding)

1. Fully reload the app. Open the demo. Confirm the compact wordmark/title and
   temporary-data notice sit below the status bar and the five tabs remain usable.
2. With no saved history, verify no chart, zero-only statistics or empty Last saved
   workout section appears. Start workout and the community preview should be clear.
3. Open Train: Start must be visible before Workout settings. Expand/collapse settings;
   try blank, valid and invalid body weight. Errors must remain visible and blank
   body weight must allow starting. Verify entered values survive tab switches.
4. Start a workout. Check the compact elapsed row, Continue from Home, settings and
   calorie-details disclosure. Background/resume and verify the timer still updates.
5. Add/change exercises in every mode. Check strength required kg, optional added
   kg and assistance, seconds for holds, and cardio-specific optional fields.
   Validation instructions should not fill the screen before an error occurs.
6. Type reps and kg without logging: no entries or totals should change. Log two
   sets of the same exercise; verify grouping, values, removal and rapid taps.
7. Log treadmill duration/speed/incline. Verify compact units such as
   **25 min · 4.5 km/h · 8% incline**, explicit zero, omitted metrics and running pace.
   Check long names and wrapped rows without losing Remove controls.
8. End/Keep logging, Finish, Share without Save, Cancel, Save once and New workout.
   Confirm Save is prominent before long details, the saved label appears, and
   unsaved summaries still require confirmation before disposal.
9. Open Home after Save: last workout, relative date, duration, exercise count,
   available calories and real activity chart must appear. Check **Your activity**
   is complete, day values are readable, and unsaved/discarded sessions are excluded.
10. Check Progress and Profile statistics against the same saved history. Exercise
    bio editing, posts, Feed filters, likes/comments, follows, Groups and Create.
11. Scroll to Back to welcome; verify it still asks before abandoning active workouts
    or drafts. Check secondary Back, Android Back and heading visibility on every route.
12. Repeat on a small screen, enlarged fonts and TalkBack. With the keyboard open,
    reach inputs, Log, End, Publish and Cancel. Check gesture navigation, three-button
    navigation and cutouts. Repeat safe-area and keyboard checks on iOS.

## Limitations

Actual Android/iOS pixels, font wrapping, keyboard resizing and screen readers need
device verification. Existing conservative Android system-bar padding and native
iOS SafeAreaView remain; exact dynamic Android insets still need approved native
integration or a dependency. The chart uses saved, temporary data only. No attempt
was made to style around Expo development overlays or promise persistence.

## Files changed

Created:

- `TASK_020A_VERIFICATION.md`
- `src/workout/workoutDisplay.test.ts`
- `src/workout/workoutDisplay.ts`

Modified:

- `src/components/ActivityChart.tsx`
- `src/components/ui.tsx`
- `src/navigation/PrototypeNavigator.tsx`
- `src/screens/PrototypeScreens.tsx`
- `src/screens/WelcomeScreen.tsx`
- `src/screens/mobileExperience.test.tsx`
- `src/social/ProfileScreen.tsx`
- `src/social/SocialScreens.tsx`
- `src/theme/design.ts`
- `src/workout/ExercisePicker.tsx`
- `src/workout/WorkoutAttachmentView.tsx`
- `src/workout/WorkoutLogger.tsx`
- `src/workout/WorkoutSummary.tsx`
- `README.md`
