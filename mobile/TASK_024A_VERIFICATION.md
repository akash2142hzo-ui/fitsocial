# Task 024A — Native Train and Profile refinement

## Scope and audit

The mobile workspace contained 471 baseline tests across 23 suites and substantial unrelated changes. This task changes only mobile presentation, picker discovery metadata and associated tests. Existing reducers, calorie/timer formulas, workout prescriptions, social state, settings, navigation routes and publication guards remain in place.

Sources of the reported issues:

- `WorkoutLogger.tsx` used the shared muted TextButton for calorie information, so its appearance matched supporting copy. It also hid the explanation control until body weight was supplied.
- `exercisePickerModel.ts` collapsed the catalog's distinct Biceps and Triceps metadata into Arms. The 423-entry catalog has no primary Forearms label or secondary muscle metadata.
- `ProfileScreen.tsx` combined workout totals, post totals and a prose follower summary; social information was separated from the avatar and zero-value fitness metrics were shown on empty profiles.
- Shared native controls had pressed/disabled treatments, but no explicit button focus styling. Text inputs already had a focus border.

## Astryx review and interpretation

Reviewed before implementation:

- [README and principles](https://github.com/meta/astryx/blob/main/README.md)
- [Design conventions](https://github.com/meta/astryx/wiki/Design-Conventions)
- [API and accessibility conventions](https://github.com/meta/astryx/wiki/API-Conventions#accessibility)
- [Core component patterns](https://github.com/meta/astryx/blob/main/packages/core/README.md)
- [MIT license](https://github.com/meta/astryx/blob/main/LICENSE)

Adopted consistent token roles, intentional spacing between related groups, reusable interaction-state treatments, semantic labels and states, restrained emphasis, and meaningful focus feedback. These are native interpretations: no Astryx source/assets were copied and no Astryx, react-dom, StyleX or web-only dependency was installed. FitSocial's charcoal/lime palette, native Pressable/Text/View components and existing tokens remain authoritative. No motion was added, so there is no new animation requiring reduced-motion handling.

## Files modified / created

Modified:

- `src/components/ui.tsx`: shared button focus borders, outlined secondary/selected states, minimum touch dimensions, optional decorative icon/accessibility hint, shared IconButton, grouped accessible statistics and compact spacing, larger initials for profile avatars.
- `src/theme/design.ts`: profile avatar size token.
- `src/workout/WorkoutLogger.tsx`: compact icon button for calorie explanation, accessible expansion/hint, explanation available even without body weight.
- `src/workout/exerciseCatalog.ts`: exported literal ExerciseId type only; no row, ID, metric, alias, equipment, tracking or prescription changes.
- `src/workout/exercisePickerModel.ts`: Biceps/Triceps categories and explicit supplementary ID associations, including Forearms; equipment derives from the same filtered set.
- `src/workout/ExercisePicker.tsx`: shows an Also targets label when the chosen category supplements the record's primary metadata.
- `src/social/ProfileScreen.tsx`: social-first identity/statistics, top-right gear, readable published-post list, independent compact Progress section and meaningful empty states.
- `src/workout/exercisePickerModel.test.ts`, `src/workout/ExercisePicker.test.tsx`, `src/screens/mobileExperience.test.tsx`: retained baseline scenarios, updated assertions for the requested category/stat-label changes and added regression coverage.

Created: `TASK_024A_VERIFICATION.md`.

## Calorie information

The active session shows a 48-point minimum secondary button with an information glyph and the existing About calorie estimates label. Its native accessibility state exposes expanded/collapsed status and a hint explains the action. Expanding shows the existing 3.5-MET disclaimer plus the optional-weight and one-minute minimum requirements; collapsing does not alter logging state. The shared button provides stable-layout focus borders and pressed feedback. The icon is decorative to assistive technology.

No estimate is invented when body weight/time is unavailable. Repetitions and lifted weight remain excluded from the formula. Timers, body-weight validation and calculation constants are unchanged.

## Deterministic picker mapping

Categories: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Legs, Core, Full Body, Cardio.

Existing primary metadata still drives every record's original category; Biceps and Triceps now remain separate. Forearms uses a small typed association table keyed by literal stable catalog IDs, not substring/name inference:

| Existing stable ID | Additional picker categories |
| --- | --- |
| `hammer-curl` | Forearms |
| `cross-body-hammer-curl` | Forearms |
| `zottman-curl` | Forearms |
| `cable-hammer-curl` | Forearms |
| `cable-reverse-curl` | Forearms |
| `barbell-reverse-curl` | Forearms |
| `dead-hang` | Forearms |
| `band-hammer-curl` | Biceps, Forearms |
| `suspension-trainer-biceps-curl` | Biceps |
| `band-triceps-pushdown` | Triceps |
| `band-overhead-triceps-extension` | Triceps |
| `suspension-trainer-triceps-extension` | Triceps |

Neutral/pronated curl variants provide forearm elbow-flexor work; Dead Hang provides sustained grip work. These are explicit exercise associations rather than new exercise prescriptions. Original Biceps/Core/Full body metadata remains visible. Forearm Side Plank stays Core; its name alone does not make it a forearm exercise.

Multi-target exercises may be discoverable in more than one category, always through the same original object and stable ID. No category list duplicates an entry. All 423 originals remain covered, and all ten categories have results. This table is targeted discovery metadata, not an exhaustive anatomical muscle model.

Search remains alias-aware and equipment remains an intersection with actual matching records. Forearms supports existing Barbell, Dumbbell, Cable, Resistance band and Bodyweight equipment. Back/Cancel, selection feedback, empty recovery, cardio and duration/bodyweight tracking remain unchanged. Reopening seeds the selected exercise's primary category as before.

## Profile and shared controls

Profile presents a prominent letter avatar, real Posts / Followers / Following counts, saved identity, bio and top-right Settings gear. Counts derive from published author-owned records and existing follow edges, excluding drafts/sample posts for the personal profile. Fictional profiles remain labeled; the app header and About retain local-demo/data-loss disclosure.

Edit profile, Groups and Drafts remain reachable. Progress has its own compact surface and history shortcut. Empty profiles show useful text rather than zero-only fitness metrics. Saved workout count, elapsed time and calorie totals appear only when meaningful; unavailable/zero elapsed totals are omitted. Detailed activity and additional workout totals remain available through Progress. Trainer management, opt-in, disclosures and editor remain intact.

Published content stays a readable list: the existing data is mostly text and real workout summaries, so no artificial photo grid, thumbnails or redundant grid/list switch was introduced. Existing PostCard expansion/interactions and workout snapshots are reused.

Button/TextButton/IconButton share minimum 48-point targets, consistent radii, visible focus and pressed feedback. Selected secondary buttons add a lime border; disabled controls retain native disabled semantics. No decorative effects, shadows or animation libraries were added.

## Verification

Run from `mobile`:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test -- --silent`

All 471 baseline test scenarios remain. Assertions naming Arms or prose local-follower labels were updated to the explicitly requested Biceps/Triceps categories and exact social labels; the same selection/navigation/follow scenarios remain and additional assertions were added. Catalog coverage still verifies 423 original objects exactly once in their primary partition, while new tests verify supplementary category coverage without duplicate results.

New coverage includes calorie information without weight, expansion/hint/disclaimer, minimum-duration explanation, continued timed grip logging, explicit biceps/triceps/forearms matching, equipment/search combinations, multi-muscle associations, category-specific Back and selection, real profile counts/draft exclusion, empty Profile/Progress, untimed history, and focus/pressed/selected/disabled native controls. Existing trainer, settings identity, cardio, sharing, drafts, feed search and five-tab regressions remain in the full suite.

An initial full run hit a timeout in the existing trainer opt-in integration test during a slow run. No timeout or assertion was relaxed. A subsequent complete run passed all 485 tests across 23 suites. After the final compact-spacing and import cleanup, TypeScript and ESLint passed without warnings, and the full suite again passed: **485 tests across 23 suites**, with zero failures.

## Limitations and physical Android checklist

Native layout and focus behavior have not been verified on a device. Automated tests mock native views and inspect native props/styles; they do not prove rendering, font scaling, safe-area geometry or TalkBack navigation. No emulator or phone deployment was launched.

- Start Train with and without body weight. Check the information icon/button, pressed feedback, expanded announcement, concise explanation, one-minute eligibility and no invented calories.
- Keep the calorie explanation open while logging strength, bodyweight, timed and cardio entries. Confirm values, timer and logged sets remain intact.
- Open the picker and verify all ten categories, no Arms category, distinct Biceps/Triceps, and nonempty Forearms equipment/results. Search reverse curls, hammer curls and Dead Hang; confirm supplementary metadata and duration-only fields for Dead Hang.
- Change category/equipment, use toolbar and physical Back, cancel and reselect the same exercise. Confirm search/selection behavior and existing workout drafts/sets survive.
- Check Profile at narrow widths and large font sizes: avatar, wrapping Posts/Followers/Following counts, name/bio, top-right gear, buttons and Progress hierarchy must remain readable without clipping.
- Publish text and workout posts, park drafts, follow/unfollow fictional authors and return to Profile. Verify actual counts, text previews, fictional labels, likes/comments, expanded workout details and absence of fake imagery.
- Edit personal/trainer identity; verify consistent names/avatars, stable author ownership, unverified labels and Settings navigation.
- Open empty and populated Progress, inspect historical values, return with hardware Back, and test Save/Share duplicate guards.
- Use a hardware keyboard and TalkBack to check button focus borders, labels/hints, expanded and selected states, disabled controls, count grouping and keyboard-safe scrolling. Check iOS safe areas/VoiceOver separately when available.

No backend/database/authentication, persistence, app network calls, dependencies, permissions, environment/secret changes, staging, commits or pushes were introduced.
