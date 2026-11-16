# TASK 040C — Card-based public profile

## Result

The public identity, avatar/statistics, name/trainer badge, bio/location, demo identity, actions and illustrative level now share one rounded charcoal card. Its subtle neutral border, 16 dp radius, 12 dp padding and 8 dp gaps use the existing palette and spacing. No shadows, bright outline or decorative artwork were added. The card shares the existing post cards' horizontal content padding and outer grid.

Level 4 / Active Mover is a compact nested section on the darker background surface. It retains the thin progress bar, Demo badge, `Illustrative XP · Not earned or saved` statement and accessible distinction from spendable FitPoints. The level labels can shrink/wrap within their row. No XP, FitPoints, persistence, earning, redemption or calculation behavior was added.

Posts and shared PostCard instances remain outside the profile card. Post content, text/achievement/workout/media previews, likes, comments and sharing code are unchanged. Existing equal-width actions, 48 dp minimum targets, selected/focused states, non-trainer behavior, trainer disclosures/sheet dismissal, navigation stack, Android Back handlers and five tabs are retained.

Names/bios remain complete with font scaling enabled and without line limits or fixed heights. The name/badge group wraps; statistics retain equal flexible columns; card and bio containers have no fixed minimum width that would force horizontal overflow. The trainer badge uses the elevated dark surface for subtle separation inside the new card.

## Exact files changed by TASK 040C

1. `mobile/src/social/PublicProfileScreen.tsx` — main profile-card wrapper, nested level surface, subtle badge surface, flexible level labels and Posts-heading test identifier. Existing trainer sheet and post rendering retained.
2. `mobile/src/screens/mobileExperience.test.tsx` — verify card hierarchy, Posts outside the card, consistent card/post padding, nested level styling, trainer/non-trainer structure and long name/160-character bio preservation with wrapping/font-scaling contracts. Existing follow, Trainer Info, media and Back tests continue to run.
3. `mobile/TASK_040C_VERIFICATION.md` — this report.

Existing unrelated/uncommitted work, including TASK 040A/B, was preserved. No Admin Studio, backend, database, authentication, shared post-card, navigation, dependency or native configuration files were edited. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --watch=false --runTestsByPath src/screens/mobileExperience.test.tsx src/social/profileState.test.ts src/social/MediaWorkflow.test.tsx src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts` — passed: 179 tests, 5 suites. Includes Follow/Following and counts, Trainer Info/disclosures/close/native-modal Back, profile route Back, text/achievement/media post rendering and bottom navigation.
- `npm.cmd test -- --watch=false` — passed: 797 tests, 39 suites, zero snapshots.
- `$env:EXPO_OFFLINE='1'; npx.cmd expo export --platform android --output-dir node_modules/.cache/task040c-export --no-minify` — passed: 732 modules, Android Hermes `.hbc` bundle generated. Compiler execution used approved local access; generated output stays in ignored cache and was not deployed.
- `git diff --check` — passed; Git emits the pre-existing unrelated LF/CRLF normalization warning for `mobile/src/theme/colors.ts`.

## Limitations

No Android device/emulator visual test was performed. Tests use mocked native rendering, modal and Back delivery. They verify hierarchy, styles, full long-text rendering and preserved interaction contracts, not actual pixel layout. Narrow-screen/large-font/translated-text layout, touch interaction, safe areas, trainer-sheet scrolling and native hardware Back delivery still need device review. Existing local-media limitations remain unchanged.
