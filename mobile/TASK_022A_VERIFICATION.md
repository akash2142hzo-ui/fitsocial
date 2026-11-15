# Task 022A: precision UI and interaction polish

## Prioritized audit (source inspection before editing)

1. **High ? selected control contrast:** shared Button applied a dark selected background without changing primary button text from charcoal. Corrected selected text to lime; selected state remains announced. Reproduce with a selected Button that has no secondary flag.
2. **High ? empty activity visualization:** Home gated charts on any saved history, so workouts older than seven days produced a zero-only chart. ActivityChart now returns nothing when the displayed period has no saved workouts; older history remains visible.
3. **Medium ? form focus and keyboard progression:** text fields had no shared visible focus border; timed duration fields offered Next and attempted to focus an absent weight field. Added shared native Input focus treatment and Done/blur for timed duration. Native refs and caller focus/blur handlers are forwarded.
4. **Medium ? hierarchy and alignment:** header used 20-point horizontal padding while pages used 16; demo text competed in the same wrapping row as the title. Header now uses the page inset and groups title/disclosure vertically, with Back alongside. Existing safe-area handling is retained.
5. **Medium ? inconsistent rhythm and feedback:** social/workout gaps included 6/10/14-point values; picker controls lacked pressed feedback and selected filter borders. Aligned touched layouts to 4-point multiples, strengthened selected filters, and separated shared pressed/disabled opacity.
6. **Medium ? form/trust clarity:** trainer fields did not identify optional text; trainer details and personal information lacked a section boundary. Added field requirements and Trainer profile heading. Unverified disclosures remain; disclosure text uses neutral readable color rather than an action accent.
7. **Native verification gap ? system insets:** Android uses status-bar height plus a fixed 48-point bottom reserve; iOS uses core SafeAreaView. Exact edge-to-edge, gesture/three-button navigation and keyboard behavior cannot be established by source inspection. Retained these assumptions pending physical verification instead of guessing an inset or adding a dependency.

## Exact files changed by this task

Modified:
- src/theme/design.ts
- src/components/ui.tsx
- src/components/ActivityChart.tsx
- src/navigation/PrototypeNavigator.tsx
- src/workout/WorkoutLogger.tsx
- src/workout/ExercisePicker.tsx
- src/workout/WorkoutAttachmentView.tsx
- src/social/SocialScreens.tsx
- src/social/TrainerScreens.tsx
- src/social/ProfileScreen.tsx
- src/screens/mobileExperience.test.tsx

Created:
- TASK_022A_VERIFICATION.md

Paths are relative to mobile/. Existing unrelated workspace modifications were preserved. Many mobile source files were already untracked before this task; repository diff statistics alone do not enumerate this task's edits.

## Shared system

Existing charcoal/lime colors, type scale, 48-point control minimum height, icon scale, surfaces and separators retained. Added control/card/modal radius tokens and distinct feedback opacity tokens. Shared cards use 16-point padding; inputs/buttons use a 12-point radius. Text buttons now have a 48-point minimum width as well as height. Input extends the existing shared UI module and introduces no dependency. Focus uses a lime border without changing layout or showing validation early.

## Screen coverage

- Welcome: inspected; existing scrollable layout, disabled authentication placeholder and demo disclosure preserved.
- Home: existing next-action hierarchy, saved-history gating and real local metrics retained; zero-only seven-day visualization now hidden even with older saved history.
- Train: clearer required reps/duration/external-weight labels, optional weight labels retained, shared focus, timed Done behavior, 8-point field gaps. Session controls, timer, grouped entries and finish/save/share/discard actions retained.
- Exercise library: shared focused search, consistent padding/radius, selected filter border and pressed feedback on controls/results.
- Summary/attachments: 12-point radius/padding and 8-point gaps on workout attachments; shared button/card improvements propagate to review and confirmation screens.
- Feed/Create/Groups: consistent spacing and input focus; author links gain pressed feedback; previews open without animation, avoiding a reduced-motion dependency. Local comments, membership, publishing, sample attachments and modal Back dismissal retained.
- Trainers: required name/username and optional text labels; larger multiline minimum height, consistent spacing, shared focus, neutral Unverified disclosure and explicit Trainer profile section. Search/filter and self-reported trust rules retained.
- Profile: bio input adopts shared focus; trainer section separates trainer information; existing local history totals and Progress/Groups entry points retained.
- Progress: inspected; real saved-history aggregation and existing empty-state action preserved, shared components inherit polish.

## Accessibility and safe areas

Five primary tabs remain Home, Train, Create, Feed, Profile; selected accessibility state and visible indicator remain. Progress, Groups and Trainers remain secondary destinations. Titles/disclosure can wrap; header and content now align. Scroll resets, keyboard dismissal, Android Back handling and Back to welcome access remain. Focus is visible without suppressing scaling, and TextButton hit areas meet 48 by 48 minimums. No new motion, fake loading or delayed interactions.

Safe-area architecture was not replaced. Large text, horizontal filter discoverability, native focus scrolling, hardware keyboard focus, TalkBack announcements, modal accessibility isolation and Android/iOS system insets require native verification. JS tests establish state/props contracts, not rendered geometry or full screen-reader behavior. Taller shared cards and longer required labels may increase scrolling on small screens.

## Preserved contracts and risk

No workout formulas, catalog IDs, reducer contracts, post identity, trainer validation/trust rules, auth, persistence, networking or backend files changed. No dependencies, environment changes, commits, staging, emulator launch or device installation. Existing keyboard avoidance, hardware Back, saved-only totals, draft retention, unlogged-value exclusion and optional calorie estimation are covered by the existing suite. The new Input forwards native refs and callbacks; native IME/focus behavior still needs phone verification.

## Verification

- npm.cmd run typecheck: passed (tsc --noEmit).
- npm.cmd run lint: passed, zero errors and zero warnings after removing duplicate imports.
- Full suite: 353 tests across 18 suites, including all 350 baseline tests and 3 new regressions (focus border restoration, older-history zero-chart suppression, selected follow accessibility/readability).
- Initial overlapping test run: 349 passed, 1 existing test timed out at its unchanged 5-second timeout. Subsequent full run: 353/353 passed. No assertion or timeout was weakened. Final rerun result recorded below.
- PowerShell blocked npm.ps1; checks used npm.cmd without changing execution policy.

## Physical Android checklist

1. Check gesture and three-button navigation: status bar, five tabs, bottom reserve and last scroll item remain clear.
2. At small screen width and maximum font size, inspect header/Back, tab labels, trainer filters, post author rows, required labels and confirmation buttons.
3. Start strength, bodyweight and cardio workouts; verify numeric keyboards, focus border, Next/Done, Hide keyboard and scrolling to focused fields. Confirm optional values stay unrecorded when empty.
4. Log/remove grouped entries; finish/save/share/discard; navigate away/back during a running timer; verify history totals and no chart before Save or for a zero-only week.
5. Publish/comment/follow/join locally; keep and discard drafts; open share preview and dismiss with Close and hardware Back.
6. Enable/edit/disable trainer status; check acknowledgment, Unverified labels, filters and draft retention.
7. With TalkBack and reduced motion enabled, check selected tabs/filters, error announcements, author actions, modal focus and accessible dismissal. Use Back to welcome with unsaved workout/post drafts.

Also verify iOS notch/home-indicator and keyboard avoidance when a physical iOS device is available. No emulator or device was launched for this task.

Final isolated rerun: 18/18 suites passed, 353/353 tests passed, 0 snapshots; 9.107 seconds. No remaining automated check failures.
