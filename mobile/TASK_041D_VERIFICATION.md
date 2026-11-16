# TASK 041D — Premium personal level card

Replaced only the personal Profile's unboxed level indicator with a compact dark-green card using the existing accent surface, a 1 dp muted-lime border and 12 dp corners. The card shows a small decorative lime lightning symbol, Level 4, Active Mover, a small Demo badge and the existing thin illustrative XP bar. No glow, gradients, shadows or dependencies were added.

Level and Edit remain side by side at a shared 78 dp minimum height, with stretch alignment. Flexible widths, wrapping and unrestricted text heights remain available for smaller screens and larger fonts. The lightning icon can grow with text scaling rather than being constrained to a fixed width. Edit retains its existing local editor action, accessible label, focus/press feedback, pencil and lime styling.

XP remains illustrative: its accessibility description says demo only, not earned or saved, and separate from spendable FitPoints. Quick Access, My Posts, Settings and all other screens/flows were left unchanged.

## Exact changed files

1. `mobile/src/social/ProfileScreen.tsx` — level-card content/styles and matching Edit height/corners.
2. `mobile/src/screens/mobileExperience.test.tsx` — level/Edit sizing, green surface/border, lightning decoration and narrow-screen contract expectations.
3. `mobile/TASK_041D_VERIFICATION.md` — this report.

Unrelated/uncommitted changes were preserved. No backend, database, authentication, earning/progression logic, dependencies or unrelated screens were changed. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --watch=false --runTestsByPath src/screens/mobileExperience.test.tsx src/social/profileState.test.ts src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts src/social/settingsState.test.ts src/social/trainerState.test.ts` — passed: 237 tests, 6 suites. Covers level decoration/demo semantics, matched control sizing, Edit navigation/save/Back, mocked 320/360 dp layouts with 1.8 font scale, Quick Access/trainer/settings/post regressions and navigation.
- `git diff --check` — passed; Git reports an existing unrelated LF/CRLF normalization warning for `mobile/src/theme/colors.ts`.

## Limitations

No physical Android/emulator visual check was performed. Tests use mocked native rendering and do not calculate pixel layout. Device review is still needed for actual small-screen wrapping/clipping, font fallback for the monochrome lightning glyph and large accessibility fonts. The 78 dp baseline may grow for text accessibility; the existing controls can wrap onto separate lines at extremely narrow widths. Full regression and Hermes export were not rerun for this focused change; this task requested TypeScript, ESLint, relevant tests and whitespace checks.
