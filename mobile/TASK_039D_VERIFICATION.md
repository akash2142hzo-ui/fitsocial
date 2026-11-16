# TASK 039D — Local photo and video attachment foundation

## Result

Implemented one optional local media attachment per post/draft within the existing two-card composer. Photo, video and camera icons have 44 dp minimum targets. The caption, 500-character validation, header Post action, sample achievement, Drafts, Save Draft, Discard Post and existing navigation remain in place.

The system library picker selects photos or videos. Camera opens explicit photo/video capture choices and requests camera access only when capture is chosen. Cancellation preserves the previous attachment; permission denial and native errors show generic, path-free messages. Choosing again replaces the attachment. Images use contain sizing and Android image downsampling; videos use genuine native playback, initially paused/muted, with controls. Feed/Home videos open a closeable preview on demand rather than initializing a decoder for every post. Android modal Back closes that preview.

Publishing adds a file reference only to the existing in-memory local post model and shared PostCard. Captions and achievements coexist with media. The text-only Share preview never exports media or its URI. No upload, public sharing, cloud integration, backend, moderation or commerce functionality was added.

## Dependencies and native configuration

The dependency/native-build requirement was reported before installation and implementation. Installed SDK 58 compatible packages using Expo's installer:

- `expo-image-picker` 58.0.10: system library selection and native camera capture.
- `expo-video` 58.0.14: actual native video playback.
- `expo-file-system` 58.0.13: declared directly (previously transitive), for metadata and native file-to-file copying/deletion.
- `expo-image-loader` 58.0.3 is a transitive picker dependency.

`app.json` adds explicit camera/photo/microphone usage descriptions, blocks broad Android external-storage/media-library permissions, and disables background playback/Picture in Picture. No broad library permission request is made in application code. Capture audio permissions are managed by the platform capture flow; microphone usage is configured for video capture. Native configuration introspection confirmed the usage descriptions, permission-removal directives and absence of iOS background modes. This is not a compiled manifest/device permission test.

Rebuild and reinstall the native development app after these additions: run `npm run android` from `mobile/` on an Android development host. iOS requires a macOS/Xcode build, such as `npx expo run:ios`. A JavaScript reload of an older development binary cannot install native modules or update permission descriptions. Native picker loading is deferred; an unavailable module reports an error, and video module/decoder failures fall back safely.

## Prototype limits and lifetime

- One media attachment; a photo and video cannot both be attached to the same draft.
- Photo: at most 10 MiB and 24 megapixels. Accepted MIME metadata: JPEG, PNG, WebP, HEIC, HEIF.
- Video: at most 50 MiB, 60 seconds and 1920 × 1080 total pixels (portrait equivalent supported). Accepted MIME metadata: MP4 or QuickTime. Actual codec support depends on the OS/device; playback errors produce an unavailable state.
- Positive, finite native file size/dimensions and video duration are required. Unknown/unsupported metadata is rejected. Camera recording requests a 60-second cap and moderate native quality; returned files are validated again because camera applications may ignore hints.
- Limits apply to the returned native picker file. The system picker may import/transcode a source before returning it; this prototype cannot bound that OS-managed work or inspect every codec/container.
- Metadata checks are not content verification or moderation. No file bytes, base64 or video buffers are read into JavaScript. Accepted files are copied within native storage into an app-owned cache folder.
- Drafts/posts and their references are in memory only. Save/resume/navigation preserve valid references during this app session; process termination resets the demo state. Cache files may expire at any time. There is no permanent persistence promise or Android activity/process-death recovery.
- File readability is checked on preview mount, foreground return and before UI publication. Image/player errors mark an attachment unavailable. Missing media does not crash the post or erase its caption. Remove/replace is available in the composer; unavailable media blocks publishing until resolved.
- Replacing/removing/discarding releases unreferenced owned copies on a best-effort basis. Save/resume/publish transfers keep referenced files. Late picker results after leaving the composer are released. Original library files are never deleted. OS cache eviction remains the fallback for interrupted copies/process termination or failed deletion; no background cleanup task was added.
- No autoplay, looping, background audio, external playback, PiP, fullscreen takeover or new animation was introduced. Native players are released on unmount. Existing keyboard avoidance, scrolling and reduced-motion navigation remain unchanged.

## Exact task files changed

Existing files extended:

1. `mobile/App.tsx` — register ownership-aware media cleanup.
2. `mobile/app.json` — native picker/video plugins and permission configuration.
3. `mobile/package.json` — three direct Expo media dependencies.
4. `mobile/package-lock.json` — corresponding locked packages.
5. `mobile/src/social/models.ts` — optional local post media reference.
6. `mobile/src/social/socialState.ts` — guarded media selection, availability, draft and publish handling.
7. `mobile/src/social/PostComposer.tsx` — toolbar/preview, pending state and publish preflight.
8. `mobile/src/social/SocialScreens.tsx` — shared PostCard media and draft attachment indicators.
9. `mobile/src/social/feedPresentation.ts` — generic attachment notice in text-only share preview.

New files:

10. `mobile/src/social/localMedia.ts` — media types, limits and metadata validation.
11. `mobile/src/social/mediaPicker.ts` — native selection/capture, copying, readability and owned-file release.
12. `mobile/src/social/MediaAttachments.tsx` — compact toolbar, previews and video modal.
13. `mobile/src/social/NativeVideoPreview.tsx` — paused native video rendering/lifecycle.
14. `mobile/src/social/useMediaCleanup.ts` — reference tracking across composer, drafts and posts.
15. `mobile/src/social/mediaPicker.test.ts` — native adapter/metadata failure-path tests with mocks.
16. `mobile/src/social/localMediaState.test.ts` — reducer, reference and draft tests.
17. `mobile/src/social/MediaWorkflow.test.tsx` — actual App/composer/Feed/Home navigation integration with native adapters mocked.
18. `mobile/TASK_039D_VERIFICATION.md` — this report.

Ignored local dependency/build-check cache output is not application source. No Admin Studio, backend, authentication or database files were changed. A SHA-256 comparison confirmed all 1,557 pre-existing files outside this task's edit set remained unchanged. Existing unrelated uncommitted work was preserved. Nothing was staged, committed, pushed, deployed or published.

## Verification results

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Relevant new tests — 37 passed across three suites, included in the full run.
- `npm test -- --watch=false` — **794 passed, 39 suites passed**, no snapshots. The 757 existing tests remain passing, including composer character limits, achievements, drafts/cancellation, navigation, social interactions and workout regression coverage.
- New coverage: photo/video selection, capture permission denial/cancellation, size/type/duration/resolution limits, partial-copy errors, owned-file deletion, replacement/removal, unavailable/expired references, stale picker callbacks, caption/achievement preservation, media-only publishing, Save Draft/resume/discard, hardware Back retention, shared Feed/Home rendering, video modal close/Android Back and native-player background/error contracts.
- `npm ls expo-image-picker expo-video expo-file-system --depth=0` — installed direct versions resolved successfully.
- `EXPO_OFFLINE=1 npx expo install --check` — dependencies up to date using local SDK metadata; Expo warns that offline dependency validation is less reliable than an online check.
- `npx expo config --type introspect --json` — passed; checked generated permission directives and iOS usage/background configuration.
- Android Metro/Hermes smoke export: `npx expo export --platform android --output-dir node_modules/.cache/task039d-export --no-minify` — passed, 731 modules and a Hermes bundle generated. An initial sandbox compiler permission failure was resolved by rerunning with approved execution access. This was an ignored local build check, not a release or deployment.
- `git diff --check` — passed. Task files, including new/untracked files, also checked against an empty baseline for whitespace errors and normalized to repository CRLF conventions.

## Native testing status and remaining limitations

**Physical Android/iOS visual testing and actual device media selection/capture/playback remain pending.** `adb devices -l` failed to initialize because of a host directory permission error; no emulator/device session was available. iOS native testing is unavailable on this Windows host. No native app build/install was performed.

Tests exercise the real reducers, App navigation and shared rendering, with native pickers/files/video/AppState/Back delivery mocked. They do not prove camera availability, OS permission dialogs, codecs/audio, rotated video presentation, safe areas, keyboard-open sizing, actual Android system-picker Back behavior or performance on a lower-end device. Follow-up device checks must cover these plus canceled capture, cache eviction, long/large-file rejection, draft return and video close/Back in the updated native build.

No real online media support is implied. Production sharing would require a separate authenticated upload/storage design, server validation, consent/privacy controls, moderation and lifecycle policies; none are connected here.
