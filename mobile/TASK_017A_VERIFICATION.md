# Task 017A verification

The mobile UI uses shared charcoal/lime colors, typography, spacing, buttons,
inputs, avatars and statistics. One navigator notice identifies temporary data;
sample posts, fictional profiles and sample group counts retain concise labels.
Destructive confirmations and input validation remain explicit.

## Workout measurements

Start and finish actions carry explicit wall-clock and monotonic samples. The
live display reads timestamp differences roughly once per second, immediately on
foregrounding, and freshly when its screen remounts. It does not accumulate ticks.
Finish copies the final duration and estimate into history; sharing and publishing
copy those values. No duration is added on discard. Zero-duration entries remain
valid completed workouts but have no calorie estimate.

Calories use **3.5 MET × entered body weight in kg × elapsed hours**, including
rests. This is a coarse general resistance-training assumption, not measured
intensity, net exercise energy or a medical measurement. Reps and lifted weights
do not affect it. Actual expenditure can differ substantially. Body weight is
optional, accepts 1–500 kg with up to two decimals, and has no default. Each new
session clears the previous session's body weight. Inputs below one minute of
duration produce no estimate. The one-minute threshold is a conservative display
rule, not a physiological threshold. Duration and kcal remain unrounded internally;
the UI floors time to seconds and rounds available kcal for display.

Wall timestamps provide history dates. Monotonic time protects elapsed duration
from device-clock changes within one running process. Where unavailable, wall time
is used and negative differences clamp to zero; forward wall-clock adjustments
cannot be distinguished from elapsed time. OS deep-sleep clock behavior has not
been verified. No timer or history continuity is promised across process restarts.
History totals state how many completed sessions have calorie estimates, so a
partial sum is not presented as coverage of all sessions.

The installed dependencies have no public cross-platform safe-area inset API.
Existing iOS native SafeAreaView and conservative Android status/navigation-bar
padding are retained. Exact edge-to-edge, cutout, gesture-bar and three-button
navigation spacing require device checks; a dynamic inset solution would require
an approved dependency or additional native integration. No private RN APIs are used.

## Android verification checklist (not performed by Codex)

1. Reload the running app from Expo. On Welcome, confirm **Explore the local demo**
   is prominent and sign-in remains disabled. Open the demo; check all five tabs.
2. Check Home with no workouts: no fabricated progress, one community sample and
   shortcuts to Train, Progress and Feed. Start a workout from Home, then continue
   it after switching tabs.
3. In Train, leave body weight blank: calories must be unavailable. Try zero,
   negative, nonnumeric and over-500 values; correct or clear them. Enter 70 kg.
4. Search **Incline Smith Machine Bench Press**. Exercise muscle/equipment filters,
   no-results/reset, and Show more. Select exercises with long names.
5. Log multiple exercises and sets using blank lifted kg, zero kg and decimal kg.
   Check numeric validation, rapid double taps and the accessible Remove controls.
6. Keep the session active for over a minute; switch to Feed/Profile and back.
   Background the app for several minutes, return, and compare elapsed time with
   a separate clock. Repeat with the phone briefly locked. If changing device time
   is convenient, verify elapsed time resists it while the process stays alive.
7. Open End workout or press Android Back. Keep logging must preserve sets/time.
   Discard must require confirmation and add no history. An empty session cannot
   finish. Finish a logged session and check the frozen duration and calorie label.
8. Open Progress from Home and Profile. Check workout count, time, sets, reps,
   exercise entries/distinct exercises and calorie coverage. Expand logged sets.
   Start another workout with a different body weight; earlier values must stay fixed.
9. Share a completed workout from Train, Home or Progress. Check the attachment,
   optional caption, Cancel/discard and history preservation. Publish explicitly;
   rapid taps must create one post. Compare Feed duration/calories with Progress.
10. Exercise Feed filters, like/unlike, expandable comments, invalid comments, local
    share preview and author profiles. Follow/unfollow and tab switching must retain
    local state. Check sample/local labels and the one temporary-data notice.
11. Edit the local bio; verify immediate edits, character limit and Profile statistics.
    Join/leave Groups; verify clearly labeled sample counts and local membership.
12. Create a draft, switch tabs and return. Verify text/attachments survive and Back
    asks before discarding. Repeat with an active workout and unfinished comments.
13. With the keyboard open, scroll and reach submit/cancel controls. Check decimal
    keyboard behavior, Hide keyboard, and Android Back dismissal.
14. Repeat navigation after scrolling each screen: headings must start fully visible.
    Test a small display, enlarged fonts, TalkBack, long captions and usernames.
15. Check top/bottom bars with gesture and three-button navigation and cutouts.
    Repeat keyboard, safe-area, scrolling and accessibility checks on iOS separately.
16. Reload the app: temporary data may clear, with no sign-in, upload or persistence.

Automated component tests use mocked native views. They verify app state and
bindings, not actual native layout, system bars, keyboard movement or screen readers.

## Files changed

Created:

- `TASK_017A_VERIFICATION.md`
- `src/components/ui.tsx`
- `src/screens/mobileExperience.test.tsx`
- `src/theme/design.ts`
- `src/workout/WorkoutSummary.tsx`
- `src/workout/useWorkoutDuration.test.tsx`
- `src/workout/useWorkoutDuration.ts`
- `src/workout/workoutMetrics.test.ts`
- `src/workout/workoutMetrics.ts`
- `src/workout/workoutPresentation.ts`

Modified:

- `src/navigation/PrototypeNavigator.tsx`
- `src/screens/PrototypeScreens.tsx`
- `src/screens/WelcomeScreen.tsx`
- `src/social/ProfileScreen.tsx`
- `src/social/SocialIcon.tsx`
- `src/social/SocialScreens.tsx`
- `src/social/feedPresentation.test.ts`
- `src/social/feedPresentation.ts`
- `src/social/profileState.test.ts`
- `src/social/sampleData.ts`
- `src/social/socialState.ts`
- `src/social/workoutSharing.test.ts`
- `src/theme/colors.ts`
- `src/workout/ExercisePicker.tsx`
- `src/workout/WorkoutAttachmentView.tsx`
- `src/workout/WorkoutLogger.tsx`
- `src/workout/exerciseCatalog.test.ts`
- `src/workout/workoutHistory.test.ts`
- `src/workout/workoutSharing.ts`
- `src/workout/workoutState.test.ts`
- `src/workout/workoutState.ts`
- `README.md`
