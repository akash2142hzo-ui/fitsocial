# Task 038E — Trainers discovery redesign

Date: 2026-11-16

## Delivered

- Trainers route displays Discover Trainers with a compact Demo indicator instead of the generic large header subtitle. Existing Back control, navigation stack, bottom tabs, safe areas and scroll container are retained. Subtitle: Find your kind of fitness guidance.
- Compact rounded search field includes a subtle icon, Search trainers or specialties placeholder, existing query accessibility label, submit-to-dismiss keyboard behavior and a conditional Clear trainer search button. Clearing search retains specialization/mode selections; resetting filters clears all three criteria.
- Every existing specialization and coaching mode, including All, Online, In person, Both and Not specified, remains available. Both filter groups now scroll horizontally, with compact 12-point pills inside minimum 44 dp touch targets, selected lime fill, dark inactive surfaces and selected-state/focus/press accessibility behavior.
- Reusable TrainerCard provides a circular initials avatar, wrapping display name/username, visible sample/unverified/self-declared status, specializations, actual coaching mode and compact View Profile cue. The whole card opens the existing author/trainer profile through the same callback/ID, with keyboard dismissal and press/focus feedback. No redundant nested profile button or dead action exists.
- Compact spacing, restrained borders and existing theme tokens improve hierarchy. Empty results show clear guidance and the working Reset trainer filters action. Names and text remain scalable and untruncated; cards have no fixed height.
- The exact TRAINER_DISCLOSURE remains visible: FitSocial has not verified this trainer's qualifications or experience. Local demo limitations remain visible. No ratings, reviews, certifications, experience claims, client counts, availability, prices or verified badges were invented.

## Integration and preserved behavior

TrainerDiscovery is extracted into TrainerDirectory.tsx and re-exported from TrainerScreens.tsx so existing consumers/routes do not change. Trainer setup and profile-details implementations are retained. Discovery still uses discoverTrainers and dispatches the same trainer filter actions. In particular, Both continues matching Online and In person according to the existing selector. No copy of trainer data or independent filter model was introduced.

Feed → Trainers → profile and Android Back use the existing navigation architecture. All five primary tabs, current scroll reset behavior and workout/session state remain intact. Unrelated Feed post cards, Home, Rewards, Profile implementations, Admin Studio and backend files were not modified.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused trainer/App/navigation tests | PASS, 198 tests across 5 suites |
| Full `npm.cmd test -- --watch=false` | PASS, 734 tests across 34 suites |
| `git diff --check` | PASS; prior unrelated colors.ts line-ending notice only |
| Empty-baseline whitespace checks | PASS for all five task files, including new/untracked files |
| Unrelated-file SHA-256 comparison | PASS, all 1,502 nonignored files outside these five paths match the pre-task baseline |

Focused command:

```powershell
npm.cmd test -- --watch=false src/social/TrainerDirectory.test.tsx src/social/trainerState.test.ts src/screens/mobileExperience.test.tsx src/navigation/navigationState.test.ts src/navigation/PrototypeNavigator.test.tsx
```

Eighteen new directory tests exercise original specialization options, all coaching modes, real reducer-backed query/filter updates, combined filters, no results/reset, search by username/specialty, query clearing and keyboard dismissal, horizontal filter configuration, touch targets, disclosures, accessible profile callback/metadata, press/focus feedback and long-name wrapping configuration.

Existing trainer selector/reducer tests remain unchanged. Existing App tests still verify Feed → Trainers, combined search/specialization/Online filters, trainer profile/follow interactions, Android Back retaining query and filter results, reset, local trainer enable/edit/disable behavior, and retention of trainer drafts, post drafts and active workout state. No tests were removed, skipped or weakened.

## Exact files changed

1. `mobile/src/social/TrainerDirectory.tsx` — new discovery UI and reusable chip/card components
2. `mobile/src/social/TrainerDirectory.test.tsx` — new tests
3. `mobile/src/social/TrainerScreens.tsx` — re-export discovery and remove now-unused imports
4. `mobile/src/navigation/PrototypeNavigator.tsx` — Trainers-only heading/demo presentation
5. `mobile/TASK_038E_VERIFICATION.md` — new report

No backend, database, authentication, trainer state/reducer/data, booking, payment, verification service, Feed post-card, Admin Studio, dependencies or package configuration changed. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or published.

## Visual verification status and limitations

Physical Android/iOS visual review, narrow-screen pixel layout, horizontal chip gestures, TalkBack/VoiceOver traversal, native keyboard/Back delivery, bottom-inset behavior and scrolling performance remain pending device testing. Automated tests use mocked native hosts and real state/navigation bindings; the long-name test verifies wrapping-friendly configuration, not native geometry. No screenshot, native performance result, real trainer verification, booking or backend readiness is claimed. The directory remains an in-memory demo with existing fictional examples and any locally configured trainer profile.
