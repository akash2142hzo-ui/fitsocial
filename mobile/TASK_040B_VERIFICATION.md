# TASK 040B — Public profile header layout polish

## Result

Focused header polish on top of TASK 040A:

- Avatar and statistics stay in one row. Three equal flexible columns replace minimum widths that could force wrapping. Counts share 16/22 typography; labels share 11/16 typography and centered alignment. Text can wrap and keeps system font scaling.
- Display name and subtle `Trainer · Unverified` badge are grouped. Bio follows directly; optional broad location follows with a small decorative location marker. Fictional/demo identity labeling remains visible in small muted text beneath this group.
- Follow and Trainer Info share an equal-width, stretched row, 48 dp minimum height, identical padding and corner radius. Follow retains lime styling, selected Following styling and the existing local reducer action. Trainer Info retains dark secondary styling. Focus, press, selected and expanded accessibility states are preserved. Non-trainers have no trainer control; the local persona has no self-follow control.
- Level 4 and Active Mover share a flexible title row with a small Demo badge at the right. A 4 dp XP bar has 4 dp vertical margins. Visible copy is exactly `Illustrative XP · Not earned or saved`. Its accessibility description additionally states that XP is separate from spendable FitPoints. XP remains a static illustration; no earning, persistence or conversion exists.
- Header sections use the existing content grid and 8 dp section gaps. Trainer details, safety disclosures, modal dismissal, navigation and post rendering are unchanged. No shared post-card or bottom-tab code was edited.

## Exact files changed by TASK 040B

1. `mobile/src/social/PublicProfileScreen.tsx` — header layout/styles and local equal-width action component; existing trainer sheet/post rendering retained.
2. `mobile/src/screens/mobileExperience.test.tsx` — compact header, equal column/button sizing, name/bio/location ordering, badge typography, XP copy/accessibility, focus/press feedback and non-trainer assertions. Existing follow, trainer-sheet and Android Back integration coverage retained; public trainer badge expectation updated.
3. `mobile/TASK_040B_VERIFICATION.md` — this report.

Existing uncommitted changes, including TASK 040A, were preserved. No Admin Studio, backend, database, authentication, dependencies or native configuration were changed. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --watch=false --runTestsByPath src/screens/mobileExperience.test.tsx src/social/profileState.test.ts src/social/MediaWorkflow.test.tsx src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts` — passed: 179 tests across 5 suites.
- `npm.cmd test -- --watch=false` — passed: 797 tests across 39 suites, zero snapshots. Includes profile interactions, trainer disclosure/dismissal, Android Back contracts, shared media posts, navigation and workout regressions.
- `$env:EXPO_OFFLINE='1'; npx.cmd expo export --platform android --output-dir node_modules/.cache/task040b-export --no-minify` — passed: 732 modules, Android Hermes `.hbc` bundle generated. Compiler execution used approved local access; output is ignored cache, not a deployment.
- `git diff --check` — passed. Git reports an unrelated existing LF/CRLF normalization warning for `mobile/src/theme/colors.ts`.

## Limitations

No screenshot image was attached in this turn; the companion-page snapshot contained no document view. Implementation was checked against the requested layout and current source, not a pixel comparison with the referenced screenshot.

No Android device/emulator visual test was performed. Automated checks establish flexible sizing, wrapping styles, consistent typography/control geometry and existing interaction contracts using mocked native rendering. They cannot prove actual small-screen/large-font pixel layout, touch behavior, native modal focus or hardware Back delivery. Device review should cover narrow Android screens, increased font size, long names/locations and trainer-sheet scrolling. Existing local media/native limitations remain unchanged.
