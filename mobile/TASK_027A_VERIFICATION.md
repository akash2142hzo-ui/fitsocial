# Task 027A - Premium dark UI foundation

Date: November 15, 2026. Local presentation refinement; awaiting review.

## Five-line architecture summary

1. `App.tsx` owns in-memory workout, social and navigation state and guarded transitions.
2. `src/navigation/PrototypeNavigator.tsx` renders five tabs, secondary destinations, safe areas, scrolling and keyboard handling.
3. `src/screens/PrototypeScreens.tsx`, `src/workout/` and `src/social/` render existing screen flows from that state.
4. `src/components/ui.tsx` supplies shared controls; `src/theme/colors.ts` and `src/theme/design.ts` remain the design-system source.
5. Existing Task 026C photographs are bundled presentation assets with separate decorative components; no new assets or services are introduced here.

## Initial state and baseline

Repository: `.`. Branch: `master`.
Initial `git status --short`:

```text
 M mobile/assets/asset-manifest.json
 M mobile/src/screens/PrototypeScreens.tsx
 M mobile/src/screens/mobileExperience.test.tsx
 M mobile/src/workout/ExercisePicker.test.tsx
 M mobile/src/workout/ExercisePicker.tsx
?? mobile/assets/photos/
?? mobile/src/components/CinematicPhoto.tsx
?? mobile/src/components/PhotoCategoryCard.tsx
?? mobile/src/theme/photography.ts
?? "tatus --short"
```

The pre-existing changes were preserved. Task 027A adds presentation edits to
Home, ExercisePicker and mobileExperience tests without reverting Task 026C.
No staging, commit, push, dependency installation, asset download or deployment
was performed. No backend, Supabase, database, authentication or migration files
were changed.

Before edits, `npm.cmd test` passed 487 tests across 23 suites, including the
485-test Task 024A baseline and the two Task 026C additions.

## Typography investigation

Searched runtime source, app configuration and direct dependencies for explicit
font families, serif assignments, global Text overrides and custom font loading.
There was no serif assignment, custom font integration or missing-font reference.
Installed React Native source uses Android `Typeface.DEFAULT` when no family is
specified (`ReactTypefaceUtils.kt`) and iOS `UIFont systemFontOfSize` defaults
(`RCTFont.mm`). A serif fallback caused by a missing bundled font is therefore
not supported by the repository evidence.

The verified code-level inconsistency was a mixture of shared and local text
sizes/weights with implicit font-family selection. These now use shared platform
sans-serif typography: `sans-serif` on Android and `System` on iOS. This is a
consistency improvement, not proof of the cause of the reported serif appearance.
The exact rendering cause remains unconfirmed without reproducing the reviewed
screen/build on its device. No custom fonts, font downloads, global Text overrides,
font-scaling limits or font-loading behavior were added.

## Files changed by Task 027A

- `mobile/src/theme/colors.ts`
- `mobile/src/theme/design.ts`
- `mobile/src/components/ui.tsx`
- `mobile/src/components/ui.test.tsx` (new)
- `mobile/src/navigation/PrototypeNavigator.tsx`
- `mobile/src/screens/PrototypeScreens.tsx`
- `mobile/src/screens/mobileExperience.test.tsx`
- `mobile/src/social/ProfileScreen.tsx`
- `mobile/src/social/SettingsScreen.tsx`
- `mobile/src/social/SocialIcon.tsx`
- `mobile/src/social/SocialScreens.tsx`
- `mobile/src/social/TrainerScreens.tsx`
- `mobile/src/workout/ExercisePicker.tsx`
- `mobile/TASK_027A_VERIFICATION.md` (new; this report)

The asset manifest, photo files, photography components, exercise picker tests and
other pre-existing files were not edited as part of this task.

## Tokens and shared components

The requested palette is centralized in `colors.ts`: background `#0E1013`, card
`#171A1F`, elevated `#1F2329`, border `#2A2F37`, lime `#C6F26B`, primary text
`#F4F6F8`, secondary text `#A3ABB5`, muted `#6B7480`, danger `#FF5C5C` and success
`#4ADE80`. Existing `muted` usage remains an alias for readable secondary text;
the darker `mutedText` token is reserved for nonessential decoration. The stronger
existing input border and accent surface remain available for control contrast.

Existing spacing remains 4/8/12/16/24/32. Cards remain radius 12; Home hero uses
radius 16 and filters use pill radius 999. Typography is title 24 bold, heading
18 semibold, body 15, caption 13 and button 15 semibold, with explicit system
sans-serif families. Metric and icon roles retain their distinct sizes.

Existing `Button` supplies primary and secondary variants rather than adding
duplicate PrimaryButton/SecondaryButton wrappers. Secondary actions use elevated
surfaces and readable control borders; selected follow controls retain their
accent-surface treatment. Existing `TextButton` supplies the ghost variant, now
with lime text and a decorative chevron/disclosure indicator. `IconButton` now
accepts selected and disabled state and provides an icon frame. Existing Input,
Avatar, Heading, Stats and EmptyState remain in use.

`FilterPill` is a thin reuse of Button interaction behavior with lime/dark selected
colors and a decorative visible check. `Banner` presents the existing active
workout return action with its existing workout icon, short label and chevron.
Neither component owns navigation, filtering or workout state.

## Screen application and behavior preservation

Home and Progress inherit updated typography/actions, including View Progress and
workout details; Home receives the hero radius. Train inherits shared actions and
uses pills for existing equipment choices. Create, Feed and Groups inherit shared
controls and consistent social typography; Feed's three existing filters use
pills. Feed action icons now have visible keyboard focus. Profile Groups uses a
ghost navigation action. Trainer setup/discovery and Settings use pills for
existing option/filter groups and inherit the shared navigation treatments.
The navigator uses the banner for Return to Train and shared text buttons for
Back, Back to welcome and Hide keyboard.

All callbacks, action payloads, conditional rendering gates and reducer contracts
are preserved. No changes were made to the 423 exercise records or IDs, workout
calculations, tracking modes, saving/history, share guards, search, drafts,
trainer disclosures, settings values, five-tab definitions or Back confirmations.
No photos or exercise demonstrations were added.

## Accessibility and validation

Shared controls retain 48-point minimum targets, native roles/labels, focus
borders and pressed feedback. Icon buttons expose disabled/selected state.
Filter selection is indicated by a check as well as colors and accessibility
state. Chevrons/checks/icons are decorative and hidden from accessibility services.
Labels can shrink/wrap; controls use minimum heights, not fixed content heights.
Native font scaling, editable-input refs/callbacks, keyboard avoidance and safe
area logic remain intact.

- TypeScript: `npm.cmd run typecheck` passed.
- ESLint: `npm.cmd run lint` passed without warnings.
- Full suite: `npm.cmd test` passed **495 tests across 24 suites**.
- Eight new shared-control tests cover primary/secondary behavior, scalable
  labels, focus/disabled states, pill selection, icon semantics, ghost disclosures,
  banner action, font styles and essential text pairs at 4.5:1 contrast or better.
- Existing UI integration, picker, navigation and domain suites remained passing.
- One existing follow-control test asserted literal old lime `#C9F270`; its
  expected color was updated to requested lime `#C6F26B`. The selected-state and
  color assertions remain in place. No tests were removed, skipped or weakened.
- Initial validation also exposed type errors in new test helper types; these
  were corrected before the final passing runs.
- `git diff --check` passed after the code changes.

## Native gaps and Task 027B recommendation

Android and iOS native rendering/interaction are **unverified**. Renderer tests
cannot confirm actual font rasterization, OEM glyph appearance, layout, safe-area
insets, keyboard resizing, hardware Back, TalkBack/VoiceOver or image contrast.
Verify representative screens on both platforms at narrow widths and large text
sizes, including long trainer filters, banners, keyboard-visible forms and all
existing confirmation flows. The native safe-area/Back implementations are
preserved, but this is not a device certification.

Remaining visual variations include the intentional 28-point Welcome display,
11-point bottom-tab labels, 20-point metrics and existing Unicode/native-shape
icons. Some full-card pressables and the set-removal action retain their local
interaction styling; no entire screen was redesigned. Existing photography
scrims and crop behavior remain unchanged from Task 026C.

Recommended Task 027B: reproduce the reported serif appearance on the exact build,
perform Android/iOS screenshot and large-text/accessibility review, then make
small evidence-based layout/icon refinements using these existing tokens and
controls. Keep new features, assets, business logic and service work out of scope.
