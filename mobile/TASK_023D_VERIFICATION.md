# Task 023D — Profile Settings and fitness preferences

## Latest completion — November 15, 2026

This pass inspected the existing personal/trainer profiles, canonical social identity, Settings editor/reducer and validation, workout weight default integration, design tokens, navigation guards and regression tests. Most of Task 023D was already implemented in this working tree. All 461 baseline tests were retained without changing their assertions.

Files modified in this pass (no files created):

- `src/social/settingsState.ts`: added a typed future visibility preference and a privacy editor section with validation.
- `src/social/socialState.ts`: stores the future preference only in memory, supports draft/save/cancel using existing Settings actions, and restricts edits to fields belonging to the current section. Saving this preference does not change posts, identity, trainer state, fitness values, follows, comments or drafts.
- `src/social/SettingsScreen.tsx`: added Account & Privacy and Security & Login headings, an explicitly non-enforcing Public/Private preference editor, disabled Sign in/Sign out controls, the requested login disclosure and Coming later notification copy. Existing disabled Public/Private controls describe unavailable account visibility; the separate future preference editor is functional.
- `src/social/settingsState.test.ts`: eight added cases cover both future preferences, non-enforcement and reference preservation, cancel/validation/section isolation, and valid measurement bounds/decimals/blank values.
- `src/screens/mobileExperience.test.tsx`: two added app tests cover selected preference feedback, disclosures, unavailable login controls, unchanged Feed visibility, reopened saved preferences, hardware Back, cancel/discard and five tabs.
- `TASK_023D_VERIFICATION.md`: current completion notes and device checks.

Settings now contains Edit profile, Account & Privacy, Fitness preferences, Notifications, Security & Login and About FitSocial. Existing capitalization and secondary captions remain where needed for continuity. The Profile gear, secondary route, keyboard-safe parent scroll and guarded Back/cancel flow are reused.

The future visibility preference starts at Not set. Selecting Public or Private changes only the draft until Save future preference. The editor explicitly states that this does not make an account private, publish anything online or enforce access controls. Changed Back/cancel uses the existing discard confirmation; unchanged Back closes directly. No role or authorization behavior exists.

Existing saved personal weight defaults into new sessions only through the existing app integration. Idle overrides and active session values are preserved; historical workouts/attachments and calorie formulas remain unchanged. Height is optional profile data, not a calculation input. Metric units remain supported; Imperial is unavailable.

Profile photos remain unavailable: installed dependencies provide no approved image-library picker, and no new package or native permission was added. Existing local letter-avatar choices provide the placeholder. Display name, username and bio still update canonical author rendering while retaining stable IDs and trainer attributes.

Final validation: TypeScript passed, ESLint passed with no warnings, and **471 tests across 23 suites passed** (461 retained plus ten new tests). The totals here supersede historical validation below.

Additional physical Android checks:

- Open the Profile gear and check all six section headings, five tabs, readable wrapping and touch targets.
- Open Future account preference, select Private, save and reopen. Confirm the selected state and the local-only/no-enforcement explanation. Feed/profile posts must remain visible.
- Change the preference and try toolbar Back, hardware Back and Cancel. Check Keep editing, Discard edits, saved-value preservation and navigation guards.
- Verify Sign in/Sign out, password/recovery and notification controls remain disabled, and no login, image-library or push permission prompt appears.
- Repeat existing profile/trainer identity, fitness-boundary, active-session override, history/attachment preservation and draft/share checks below. Check keyboard, large text, TalkBack and insets on a physical device.

No emulator/device verification was performed. No backend, database, authentication, persistence, network calls, dependencies, permissions, environment changes, commits, staging, pushes or deployments were introduced.

## Files created / modified

Created:
- `src/social/settingsState.ts` — profile/preference types, validation, letter-avatar choices and dirty detection.
- `src/social/SettingsScreen.tsx` — settings sections, shared editor, save/cancel/discard and disabled future controls.
- `src/social/settingsState.test.ts` — state and validation regressions.
- `TASK_023D_VERIFICATION.md` — implementation and physical verification notes.

Modified:
- `App.tsx` — settings navigation guards and new-workout personal weight defaults.
- `src/navigation/navigationState.ts`, `src/navigation/navigationState.test.ts` — secondary Settings route under Profile and back-navigation coverage.
- `src/navigation/PrototypeNavigator.tsx` — reset scroll/dismiss keyboard for editor and confirmation transitions.
- `src/screens/PrototypeScreens.tsx` — settings screen binding.
- `src/screens/mobileExperience.test.tsx` — settings interactions and existing bio-edit scenario moved to the unified saved editor.
- `src/social/ProfileScreen.tsx` — accessible gear, unified Edit profile entry, saved name/location and chosen avatar.
- `src/social/socialState.ts` — local identity/preferences/draft state and trainer synchronization.
- `src/social/trainerIdentity.ts` — canonical local identity for all author renderings.
- `src/social/SocialScreens.tsx` — Feed/Create avatars use the shared identity.
- `src/social/TrainerScreens.tsx` — new trainer setup inherits the saved broad location.
- `src/workout/WorkoutLogger.tsx` — clarify that Train weight is session-specific.

Unrelated existing workspace changes were preserved. No non-mobile files were edited for this task.

## Settings navigation and structure

Profile has a 48-point accessible gear labelled Open Settings. Settings is a secondary route, retaining Profile as its selected parent and preserving all five primary tabs. The existing safe-area, scroll, keyboard-avoidance and bottom navigation components remain in use.

The screen contains Edit profile, Privacy, Fitness preferences, Account & security, Notifications, and About FitSocial. Profile's former inline bio editor is replaced by a shortcut to the same Settings profile editor, avoiding a second editing UI. Successful saves return to the settings section list; Back returns to Profile.

Unchanged editor Cancel/Back closes immediately. Changed Cancel, toolbar Back and hardware Back ask before discarding. Hardware Back during confirmation keeps editing. Primary-tab or welcome navigation is deferred until Discard edits; Keep editing clears the pending navigation. Settings changes remain in drafts until explicitly saved. Editor/confirmation changes reset scroll and dismiss the keyboard.

## Functional local preferences

Editable identity: display name, username, optional bio, optional broad location and local letter avatar. Required values cannot be blank. Limits are 50/24/160/80 characters respectively. Usernames require 3–24 letters, numbers or underscores and cannot match another demo author's username, ignoring case. Unsupported control characters are rejected. Optional text can be cleared. Validation appears inline as an accessible alert.

Avatar choices use existing native initials rendering: Initials derives letters from the display name; Move, Strong and Outdoors use MV, ST and OD. There are no image files, upload requests or photo-library permissions.

Fitness preferences support optional height (50–250 cm) and body weight (1–500 kg), up to two decimals. Blank clears a measurement. Body weight reuses the existing workout validator. Metric is the supported measurement preference; imperial is explicitly disabled because current logger fields and calculations use metric units. Height is profile information and is not used in calorie calculations.

Personal body weight is the saved default for a new session. A nonblank weight entered in idle Train takes precedence; an active session keeps its own value even when Settings changes. Starting again after a saved workout uses the current personal default. Clearing weight in an active session remains supported. The existing workout reducer owns session validation and immutable completion snapshots; formulas, reducer logic, catalog and stable IDs were not changed.

## Identity synchronization

Existing `localBio` remains the bio source. `localProfile` supplies the local author's editable display name, username, broad location and avatar. All current author rendering uses `identityFor`; posts, comments, follows and sharing retain their stable author IDs and publication records.

Saving Settings synchronizes shared identity fields into an existing trainer extension without changing enabled state, specializations, qualifications or Unverified disclosures. Saving trainer setup synchronizes those fields back to the local profile. Enabling a new trainer profile inherits saved location. Profile, Feed, My Posts, comment names, Home author summaries, composer identity and trainer cards resolve the same identity.

## Unavailable features and About

Public/Private are disabled with “Available when accounts launch.” They do not hide posts or enforce authorization. Sign-in methods, password management, recovery and account deletion are disabled, with no credential fields. Social interactions, workout reminders and trainer activity notifications are disabled; no notification permissions are requested.

About reads FitSocial's version from the existing `app.json` metadata and explains local demo status, process-lifetime data, absent accounts, server privacy enforcement and cross-device storage. No version or policy link was invented.

## Validation

Required commands from `mobile`:
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test -- --silent`

TypeScript and ESLint passed without warnings. The full suite passed with 449 tests across 23 suites. After the final default-avatar refinement, TypeScript, ESLint and the 29 settings-state tests were checked again. All 412 baseline scenarios are retained. The previous bio-edit integration scenario now uses Edit profile and Save profile. Added coverage includes navigation, identity updates, avatars, required/length/username validation, numeric validation, trainer compatibility, disabled controls, save/cancel/discard, deferred navigation, personal-weight defaults, active overrides and historical estimate preservation.

## Known limitations

Everything remains in memory and is lost on process restart. Avatars are letters; real photos and imperial units are unavailable. Privacy/auth/account/notification features are informational, with disabled controls. Personal weight and session weight are intentionally separate once a workout begins, so changing personal preferences does not retroactively update sessions or snapshots. Native layout, keyboard behavior, TalkBack focus and physical Back still require device verification.

No backend, database, Supabase, migration, authentication, persistence, network, dependency or native-permission implementation was added. No commits, pushes, emulator launch or physical deployment were performed.

## Physical Android verification checklist

- Open Profile and activate the gear. Verify Settings opens with Profile selected and exactly five bottom tabs. Check all six sections, small-screen scrolling, font scaling and contrast.
- Open Edit profile. Change name, username, bio and broad location. Try blank required fields, duplicate usernames, invalid characters and over-limit text. Confirm visible errors and correction/save behavior.
- Choose each avatar, save and return to Profile. Check the same name, username and initials in Feed/My Posts, comments, composer, Home and an enabled trainer profile. Confirm Unverified remains visible.
- Cancel an unchanged editor; it should close directly. Change a field, then try Cancel, toolbar Back and hardware Back. Keep editing must preserve input; Discard edits must retain saved identity.
- With dirty edits, select Feed or Back to welcome. Confirm navigation waits for Discard edits. Keep editing must cancel the pending destination, including after a later save.
- Check keyboard avoidance and scroll reset when entering/saving/cancelling an editor or opening confirmation. Verify focused fields, buttons and validation remain reachable.
- Save height and body weight, including decimal and blank values. Verify rejected bounds. Confirm Metric is selected and Imperial unavailable.
- Start a workout without an idle weight override; check the saved personal weight default. Override session weight, change personal preferences and return; the session override must remain.
- Complete/save a workout, change personal weight, and inspect its summary/shared attachment. Old values and estimates must stay fixed. Start a new workout and confirm the latest personal default.
- Test strength, bodyweight, duration and cardio logging, guided exercise selection, finish/save and workout sharing for regressions.
- Verify Public/Private, account/security and notification controls are disabled and labelled unavailable. No credential, photo-library or notification permission prompt should appear.
- Check About version against app metadata and temporary-data/privacy disclosures. Restarting the process should clear local changes as described.
- With TalkBack, check the gear label, section headings, field labels, selected avatars/units, disabled announcements, validation alerts and discard-confirmation navigation.
