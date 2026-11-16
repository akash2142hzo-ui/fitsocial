# TASK 043B — Profile editor cleanup and photo copy fix

## Findings and fix

The reported message comes from the post-copy readability check in `mediaPicker.ts`. The code called `original.copy(copy)` and immediately checked the destination. In the installed `expo-file-system` **58.0.13**, `File.copy()` returns `Promise<void>`; its Android implementation runs asynchronously. A destination can therefore be absent/incomplete when that check runs, producing “The attachment could not be copied safely…” before copying finishes. The previous unit mock copied synchronously and hid this race.

Evidence inspected locally, without modifying dependencies:

- `mobile/node_modules/expo-file-system/src/internal/NativeFileSystem.types.ts` — asynchronous File `copy()` signature.
- `mobile/node_modules/expo-file-system/android/src/main/java/expo/modules/filesystem/FileSystemModule.kt` — `AsyncFunction("copy")` coroutine.
- `mobile/node_modules/expo-file-system/android/src/main/java/expo/modules/filesystem/FileSystemPath.kt` — suspended copy on `Dispatchers.IO`.
- `mobile/node_modules/expo-file-system/android/src/main/java/expo/modules/filesystem/unifiedfile/ContentProviderFile.kt` — native content-provider stream/readability/size handling.

This establishes a code-level race consistent with the exact reported error. **No physical-device reproduction or native trace was performed.**

The fix awaits native copy completion before destination validation or cleanup. File integrity checks were retained: a known source size must match the completed destination; empty, oversized, missing and invalid media are rejected and owned partial copies are released. Metadata is re-read from a fresh destination File instance.

A separate URI defect was also corrected: selected Android `content://` URIs were rejected before copying. They now pass unchanged to the installed native File API/ContentResolver and are copied immediately into owned cache using the temporary selection grant. No manual decoding of provider identifiers, persistent URI permissions or broad library permission request was added. Returned media always points to the validated `file://` cache copy, not the temporary provider URI.

When a content provider omits a usable source size, static metadata is checked first and the completed cache file supplies the real size. Existing byte/dimension/type/duration limits are enforced afterward; no placeholder size is returned or saved. Unsupported remote URIs remain rejected. Errors remain path-free and actionable; copy failures are not silently accepted or merely hidden.

## UI result

- Removed the Initials/Move/Strong/Outdoors selector and repeated local-preview disclaimer.
- One compact charcoal photo card contains the circular preview, Profile photo label, equal Gallery/Camera controls and conditional subtle Remove photo action. Remove retains a 44 dp minimum target; picker buttons retain accessible 48 dp targets.
- Existing saved photos and local identity propagation remain unchanged. Removing a photo restores the existing letter/initials fallback. Legacy preset state is retained internally for compatibility, but no preset selection UI is exposed.
- Display Name, Username, Bio and Broad Location retain their existing validation and edit behavior. Profile form gaps are 8 dp, label gaps 4 dp; inputs use consistent 10 dp corners and 44 dp minimum heights. Bio has a compact multiline area.
- Save Profile and Cancel Edits use equal-width slots and distinct primary/secondary styling. Existing pending-picker guards, Save preflight, Cancel/discard, late-result cleanup, keyboard avoidance, scrolling and bottom navigation remain intact.

## Exact files changed by TASK 043B

1. `mobile/src/social/mediaPicker.ts` — await native copy; handle selected content URIs; verify completed cache metadata and retain safe cleanup/limits; concise photo errors.
2. `mobile/src/social/ProfilePhotoEditor.tsx` — compact photo card with direct Gallery/Camera/Remove actions; remove presets, repeated disclosure and redundant action-sheet UI.
3. `mobile/src/social/SettingsScreen.tsx` — compact profile fields, consistent input styling, balanced Save/Cancel and updated photo recovery wording.
4. `mobile/src/social/settingsState.ts` — recovery wording refers to photo replacement/removal rather than removed preset UI; validation semantics preserved.
5. `mobile/src/social/mediaPicker.test.ts` — realistic asynchronous native-copy mock and delayed-copy, content URI, unknown size, partial/oversized copy, encoded-file URI and access-expiry tests.
6. `mobile/src/social/ProfilePhotoWorkflow.test.tsx` — direct photo actions, initial fallback, no presets/disclaimer, Save/Cancel/removal/recovery, narrow-width form and keyboard visibility contracts.
7. `mobile/src/screens/mobileExperience.test.tsx` — remove obsolete preset-selection steps; verify saved profile identity using its actual initials.
8. `mobile/TASK_043B_VERIFICATION.md` — this report.

No backend, authentication, database, cloud upload, permanent storage, Admin Studio, dependencies or native configuration were changed. Shared media copy behavior was corrected without changing publishing workflows. Unrelated/uncommitted work was preserved. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed on final source.
- `npm.cmd run lint` — passed on final source.
- Relevant 10-suite run: `npm.cmd test -- --watch=false --runTestsByPath src/social/ProfilePhotoWorkflow.test.tsx src/social/ProfilePhotoState.test.ts src/social/settingsState.test.ts src/social/profileState.test.ts src/social/mediaPicker.test.ts src/social/MediaWorkflow.test.tsx src/social/localMediaState.test.ts src/screens/mobileExperience.test.tsx src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts` — **279 tests passed**.
- Final focused rerun after error-copy cleanup: `npm.cmd test -- --watch=false --runTestsByPath src/social/mediaPicker.test.ts src/social/ProfilePhotoWorkflow.test.tsx` — **39 tests passed, 2 suites**.
- `npm.cmd test -- --watch=false` — **834 tests passed, 41 suites**, zero snapshots, on final source.
- `git diff --check` — passed; Git emits LF/CRLF normalization warnings for `settingsState.ts`, prior `trainerIdentity.ts` work and unrelated `colors.ts`, with no whitespace errors.
- Seven task source/test files checked as valid UTF-8 without trailing whitespace.

Coverage includes gallery/camera selection and cancellation, permission denial, awaited copy completion, temporary content URI grants, provider size handling, truncated/empty/oversized copies, owned-file cleanup, circular previews/fallback, removal, Save/Cancel/discard, field validation, shared identity/photo rendering, missing/failed images, error recovery and existing post media regressions. Mocked 280/320 dp widths with 1.8 font scale verify flexible form structure. Keyboard show/hide simulation verifies Save/Cancel availability, retained avoidance/scroll contracts and restoration of five bottom tabs. Intermediate type-narrowing and test keyboard-mock issues were corrected before final passing checks.

## Limitations

No physical Android/emulator/iOS testing or screenshot pixel comparison was performed. Tests mock native picker, filesystem, image, keyboard and Back delivery; they do not prove device permission dialogs, crop behavior, provider grants, native decoding, actual keyboard geometry, safe areas or pixel-level no-clipping. Device follow-up must cover gallery/camera capture/cancel/denial, cropped/encoded and provider-backed photos, Save/Cancel/removal and keyboard-open editing.

Some providers do not expose a usable source length; those selections must be copied before the byte limit can be checked, so provider/native disk work before rejection is not bounded by that post-copy check. Copying stays native without JavaScript byte buffers. Process interruption, revoked grants or OS cache eviction can still make files unavailable; the UI offers removal/reselection and existing fallback behavior. Photos remain cache-backed and session-only, with no permanent persistence or upload claim.
