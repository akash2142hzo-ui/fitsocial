# TASK 041C — Open personal profile and Quick Access

## Result

Replaced the personal Profile's surrounding identity/activity cards with an open header and a two-column tile grid:

- Single `My Profile` heading with the existing Settings gear at the top right. The bottom tab remains `Profile`.
- Circular 66 dp avatar beside equal flexible Posts/Followers/Following columns. Existing display name, username, bio, optional location and counts are preserved. Text wraps without fixed heights or line truncation.
- Slim `Level 4 · Active Mover` indicator and thin 3 dp illustrative XP bar beside a small lime Edit button with a pencil. Controls have 48 dp minimum height and can grow/wrap for narrow screens or larger text. Edit retains its existing accessible label and local editor action.
- One small visible Demo badge. The progress accessibility label explicitly says the XP is illustrative, not earned or saved, and separate from spendable FitPoints. Removed the extra visible XP disclaimer line. No earning, progression, persistence or reward behavior was added.
- Quick Access has Progress/Groups and Drafts/Trainer in two rows of equal-width tiles. Tiles use subtle charcoal surfaces/borders, 52 dp minimum heights, consistent lime icons, readable labels, focus borders and press feedback. Draft count includes saved drafts plus the current composer, as before.
- Trainer expands the existing TrainerDetails beneath the grid. Onboarding, editing, draft continuation, disable confirmation and all existing safety disclosures remain available. No trainer information is fabricated or verified.
- My Posts follows Quick Access, outside the header/grid. Empty-state Create a post, shared post cards and all media/social/publishing behavior remain unchanged.

## Exact files changed by TASK 041C

1. `mobile/src/social/ProfileScreen.tsx` — open header, 66 dp avatar, slim demo-level/lime Edit row and two-column Quick Access; reuse existing trainer details and destination actions. Public-view delegation retained unchanged.
2. `mobile/src/navigation/PrototypeNavigator.tsx` — change only the personal Profile heading text to My Profile; keep its existing Settings entry and tab label.
3. `mobile/src/screens/mobileExperience.test.tsx` — replace stacked-card assertions with open-header/two-row tile assertions, check focus/press feedback, My Posts order, 66 dp avatar, lime Edit and narrow/large-text contracts. Existing navigation/editor/trainer/post tests retained.
4. `mobile/TASK_041C_VERIFICATION.md` — this report.

No public profile component, Feed, Home, Rewards, Settings implementation, Admin Studio, backend, authentication, database, dependencies, native configuration or post/media components were edited. Unrelated/uncommitted work was preserved. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test -- --watch=false --runTestsByPath src/screens/mobileExperience.test.tsx src/social/profileState.test.ts src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts src/social/settingsState.test.ts src/social/trainerState.test.ts` — passed: 237 tests across 6 suites.
- `npm.cmd test -- --watch=false` — passed: 802 tests across 39 suites; zero snapshots.
- `$env:EXPO_OFFLINE='1'; npx.cmd expo export --platform android --output-dir node_modules/.cache/task041c-export --no-minify` — passed: 731 modules, Android Hermes `.hbc` bundle. Compiler execution used approved local access. Output remains ignored cache, not deployment.
- `git diff --check` — passed; Git emits the existing unrelated LF/CRLF normalization warning for `mobile/src/theme/colors.ts`.
- Changed source files checked as valid UTF-8 without trailing whitespace.

Relevant coverage includes open identity/one heading/settings gear, demo level, Edit Profile save/validation/discard guards, Quick Access tile geometry and feedback, Progress/Groups/Drafts/Trainer actions, draft counts/retention, trainer enable/edit/disable and disclosures, empty/populated posts, Create Post, shared photo/video regressions, five tabs and Android Back. Mocked 320/360 dp widths with 1.8 font scale exercise flexible controls and tile-label contracts.

## Limitations

No Android device/emulator visual test or screenshot pixel comparison was performed. The test renderer does not calculate native layout; mocked widths/font scale verify rendering/style and interaction contracts, not actual no-clipping/no-overlap positioning. Device review should cover narrow screens, larger fonts, long/translated labels, safe areas, keyboard behavior, icon rendering and native hardware Back. Controls/tiles can grow for accessibility, and level/Edit can stack when insufficient width remains. Existing session-only state and local-media limitations are unchanged.
