# TASK 040A — Public profile redesign

Implemented a compact public profile for the author route, including the local persona when opened from a post or trainer discovery. The personal Profile tab retains its existing editing, rewards, progress and trainer-management controls.

The public screen shows the username in the navigation header, leading Back control, avatar, display name, counts derived from existing posts/follow edges, bio and available broad location. Follow/Following uses the existing session-local reducer and accessible selected state. Buttons retain 48 dp touch targets within a wrapping row. Compact charcoal surfaces and lime details use existing theme tokens. The public flow no longer includes the welcome exit link or duplicate large headings. Scroll container, route stack and five bottom tabs are preserved.

Trainer accounts alone expose Trainer Info. Its scrollable modal retains the exact platform non-verification disclosure, specialties, coaching mode, location, self-reported availability/inquiry limitation, experience and qualifications. It closes through its button, accessibility escape or Android Modal onRequestClose; the next Back uses the existing app route handler. Personal trainer management remains in the personal Profile tab.

The Level 4 / Active Mover card and 40% XP bar are explicitly illustrative demo values, not achievements attributed to the user. They have no earning, calculation, conversion or persistence logic. Future eligible-activity progression requires a separate implementation. Spendable FitPoints remain separate and untouched.

Posts immediately follow this information using the unchanged shared PostCard from Feed/Home, including text, sample achievements, workout attachments, local photo/video previews, likes, comments and share previews. No upload or publishing behavior was introduced.

## Exact files changed by this task

- `mobile/src/social/PublicProfileScreen.tsx` — new compact public view and trainer details modal.
- `mobile/src/social/ProfileScreen.tsx` — delegate public views while retaining the personal screen.
- `mobile/src/screens/PrototypeScreens.tsx` — mark author routes as public, including the local author.
- `mobile/src/navigation/PrototypeNavigator.tsx` — compact public username header, leading Back and omit public welcome exit.
- `mobile/src/screens/mobileExperience.test.tsx` — public layout/counts/bio/XP/follow/posts/trainer dismissal/Back coverage; update existing expectations for trainer details and the local public view.
- `mobile/src/social/MediaWorkflow.test.tsx` — Home → public profile local media rendering and return navigation.
- `mobile/TASK_040A_VERIFICATION.md` — this report.

These files extend existing uncommitted work. No Admin Studio, backend, database, authentication, dependency or native configuration files were edited by this task. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --watch=false` — passed: 796 tests, 39 suites, zero snapshots.
- `npm.cmd test -- --watch=false --runTestsByPath src/screens/mobileExperience.test.tsx src/social/MediaWorkflow.test.tsx src/social/profileState.test.ts src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts` — passed: 178 tests, 5 suites. Includes final compact spacing/progress assertions, follow state/count changes, bio/location, trainer/non-trainer controls, disclosure preservation, Close/native-modal Back, route Back, shared achievement/text/media posts and local-public-profile navigation.
- `EXPO_OFFLINE=1 npx.cmd expo export --platform android --output-dir node_modules/.cache/task040a-export --no-minify` — passed: 732 modules, Android Hermes `.hbc` bundle generated. The first attempt hit sandbox compiler permission denial; the approved retry succeeded. Output stays in ignored local cache; this is not deployment.
- `git diff --check` — passed; Git reports an existing LF/CRLF normalization warning for unrelated `colors.ts`.

Intermediate runs exposed outdated Settings/trainer-detail expectations and a temporary text-encoding mismatch introduced during newline normalization. Expectations now reflect the public view and trainer sheet; source encoding was restored. Both final runs above passed after these corrections.

## Limitations

No physical Android device/emulator visual or touch test was performed. Responsive wrapping, constrained modal height and scroll behavior are implemented, but small-screen, large-font, keyboard, safe-area and native hardware Back delivery need device review. Tests use mocked native rendering/Back/modal delivery and do not establish pixel positioning or device performance. Native media selection/playback limitations from TASK 039D still apply. XP is static demo presentation only; social state still lasts only for the current demo session.
