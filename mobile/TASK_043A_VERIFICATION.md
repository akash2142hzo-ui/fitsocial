# TASK 043A — Custom local profile photos

## Result

Edit Profile now has a circular preview with a small pencil badge and a compact horizontal preset selector. Tapping the preview opens an Android-compatible modal menu with Choose from Gallery, Take Photo, conditional Remove Photo and Cancel. Modal Android Back dismisses the menu. Existing name, username, bio, location, Save and Cancel flows remain.

The existing Expo picker, camera permission, validation, native cache-copy and owned-file cleanup infrastructure is reused. Profile selection requests a square crop (`allowsEditing`, aspect 1:1) where the platform supports it; display always uses circular clipping and cover sizing. Feed post photo/video options remain unchanged. Camera permission is requested only after Take Photo; the system gallery picker grants access to selected files without requesting broad library/storage access. Picker/native permission failures are reported through concise, path-free feedback.

Photos remain local application state/file references. Selection edits only the profile draft; Save commits the photo to the local identity. Cancel/discard restores the previous saved photo/preset. Selecting a preset clears the draft photo; removing a saved photo does not release it until Save commits that change. No upload, cloud storage, permanent persistence, backend or authentication was added.

The saved local identity's photo is reused in personal Profile, its public author view, Feed composer entry, post composer, shared Feed/Home/profile PostCard authors and the local trainer discovery card. Fictional/sample users keep their own preset initials and never receive the local user's photo. Existing preset avatars remain available as selections and as missing-file fallbacks.

Save is blocked while a picker is pending and rechecks file accessibility before committing. Preview mount/foreground checks and image errors fall back safely to the preset. Known decode failures block Save until the user replaces/removes the photo or chooses a preset. Failure flags do not dirty an otherwise unchanged saved profile; stale failures cannot affect a newer selection. Canceled selection preserves prior values. Late native results after closing/discarding/navigating away are released rather than attached to another editor.

Profile photos use the existing photo limits: supported JPEG/PNG/WebP/HEIC/HEIF metadata, up to 10 MiB and 24 megapixels. These checks validate metadata/local readability, not content or moderation. Native copies avoid loading image bytes/base64 into JavaScript. Cached previews use Android resize/downsampling requests. Referenced-media cleanup now includes saved, draft and original profile photos, retaining needed files and releasing only unreferenced owned copies. Original gallery/camera files are never deleted by this code.

## Exact files changed by TASK 043A

Existing files extended:

1. `mobile/src/social/settingsState.ts` — optional local photo reference, pending/unavailable draft flags, validation and photo-aware dirty detection.
2. `mobile/src/social/socialState.ts` — guarded draft selection/removal/error actions, preset switching, Save/cancel behavior and photo commit.
3. `mobile/src/social/mediaPicker.ts` — square-crop profile-photo wrapper around the existing picker; post defaults preserved.
4. `mobile/src/social/useMediaCleanup.ts` — retain/release saved, draft and original profile photo references.
5. `mobile/src/social/trainerIdentity.ts` — local identity photo; sample identities explicitly have none.
6. `mobile/src/social/SettingsScreen.tsx` — compact photo editor integration, existing fields retained, pending Save guard and file-access preflight.
7. `mobile/src/social/ProfileScreen.tsx` — render saved local photo in the existing avatar position.
8. `mobile/src/social/PublicProfileScreen.tsx` — render the viewed identity's photo when present.
9. `mobile/src/social/PostComposer.tsx` — current-user photo in existing composer identity.
10. `mobile/src/social/SocialScreens.tsx` — shared post-author avatar and Feed composer photo binding.
11. `mobile/src/social/FeedControls.tsx` — optional photo for existing composer-entry avatar.
12. `mobile/src/social/TrainerDirectory.tsx` — optional identity photo in the existing trainer card.
13. `mobile/src/social/mediaPicker.test.ts` — profile crop options, native ownership, cancellation, denied permissions and missing-file adapter tests.

New files:

14. `mobile/src/social/ProfileAvatar.tsx` — circular photo/preset display, readability/foreground/decode fallback.
15. `mobile/src/social/ProfilePhotoEditor.tsx` — preview, photo-source menu, preset strip, guarded asynchronous selection and local-demo disclosure.
16. `mobile/src/social/ProfilePhotoState.test.ts` — commit/discard/preset/invalid/stale/error/reference/state-preservation tests.
17. `mobile/src/social/ProfilePhotoWorkflow.test.tsx` — actual App/editor/navigation/photo workflows with native adapters mocked.
18. `mobile/TASK_043A_VERIFICATION.md` — this report.

No dependencies, app/native configuration, Admin Studio, backend, database or cloud storage were changed. Existing unrelated/uncommitted work was preserved. Avatar bindings were updated in existing screens without redesigning their layout or changing media publishing. Nothing was staged, committed, pushed or deployed.

## Verification

- `npm.cmd run typecheck` — passed on final source.
- `npm.cmd run lint` — passed on final source. An intermediate React ref-callback lint finding was corrected before final checks.
- `npm.cmd test -- --watch=false --runTestsByPath src/social/ProfilePhotoWorkflow.test.tsx src/social/ProfilePhotoState.test.ts src/social/settingsState.test.ts src/social/profileState.test.ts src/social/mediaPicker.test.ts src/social/MediaWorkflow.test.tsx src/social/localMediaState.test.ts src/screens/mobileExperience.test.tsx src/navigation/PrototypeNavigator.test.tsx src/navigation/navigationState.test.ts` — passed: **268 tests, 10 suites**.
- `npm.cmd test -- --watch=false` — passed: **823 tests, 41 suites**, zero snapshots.
- `$env:EXPO_OFFLINE='1'; npx.cmd expo export --platform android --output-dir node_modules/.cache/task043a-export --no-minify` — passed on final source: 733 modules, Android Hermes `.hbc` bundle generated. Compiler execution used approved local access; output stays in ignored cache, not deployment.
- `git diff --check` — passed. Git reports LF/CRLF normalization warnings for edited `settingsState.ts`/`trainerIdentity.ts` and unrelated `colors.ts`; no whitespace errors.
- All 17 changed source/test files checked as valid UTF-8 without trailing whitespace.

New coverage includes gallery/camera choice and crop options, native cancellation/permission denial/errors, removal, presets, Save and Cancel/discard, pending/stale requests, original-file ownership, missing/expired/decode-failed image fallback, blocked invalid Save, photo reference lifetime, local-only identity isolation, shared avatar rendering, trainer onboarding/listing, foreground checks, navigation and Android Back contracts. Existing media/composer/settings/navigation/workout regressions remain passing.

## Native testing limitations

No physical Android/emulator or iOS test was performed. Tests mock native picker, file, image-rendering, AppState and Back delivery. They cannot prove OS permission dialogs, native crop availability/aspect behavior, camera availability, HEIC/WebP decoding, low-memory recovery, actual circular image quality, large-font layout or device performance. Device review should exercise gallery/camera cancel and denial, square crop and orientation, replacing/removing/canceling, cached-file expiry, preset switching, saved photos across the existing screens, and actual menu/hardware Back.

The current native app must already contain the media modules from TASK 039D. This task adds no native dependency/configuration; older binaries without those modules still require the previously documented rebuild. Photo state is not persisted across app-process restarts, and OS-managed cached files can disappear. Cache deletion is best effort; interrupted processes may leave owned files for OS cleanup. No public/online profile photo or upload capability is implied.
