# Task 031D ? Muscle image and compact picker fix

Date: 2026-11-15

## Findings and root-cause assessment

All ten original assets in `assets/photos/` are real, completely decodable JPEGs. Each was checked with Pillow format detection, verify(), reopen/load(), EXIF orientation and visual inspection. All have orientation 1. The images show the intended highlighted muscles/activity; none is an unrelated black fragment or an obvious mixed-up collage tile. Their dark areas are source backgrounds plus embedded caption/footer areas, not failed JPEG decoding.

No larger original muscle collage was available in the workspace. Recovery from a collage was not needed: all ten individual source images contain usable anatomy. No missing muscle content was generated, filled in or invented. Existing source crops such as headless upper-body views remain upper-body views; the supplied files cannot establish whether a larger original composition once existed.

Two implementation issues were identified:

1. The footer-masking renderer introduced in 031C used a nested viewport with percentage height, an inferred width from aspectRatio/maxWidth, a percentage-width Image and overflow clipping. This was too fragile for native layout; it made the displayed anatomy depend on native resolution of nested dimensions. Source JPEG decoding and style-only tests did not validate that on Android. This masking approach has been removed entirely.
2. The picker thumbnail was 120 x 72, and label/selection were separate children in a wrapping row. On compact widths the selection could wrap below the thumbnail, increasing row height. The original high-resolution portrait art also included caption/footer space, making the subject less legible in a small landscape viewport.

These are confirmed source/code findings and plausible contributors to the reported Android black rectangles/fragments. The exact Android failure was not reproduced in a native runtime during this task, so this report does not claim a conclusively reproduced single platform root cause.

## Asset correction

Original files remain intact in `assets/photos/`. New display copies are in `assets/muscles/`, using the same category filenames. Their source-pixel crop boxes were reviewed visually before use. The crops remove embedded words and unnecessary footer/background areas while keeping the intended muscle anatomy. Forearms, Legs and Cardio retain their small source icons where excluding them would require an unnecessarily tight crop near limbs/feet; no embedded category words remain. There are no partial caption glyphs at the crop edges.

Each crop is proportionally downsampled with Lanczos, capped at 768 pixels on its longest side, and encoded as RGB JPEG, quality 95, no chroma subsampling. Anatomy is not stretched. No painted background, synthetic extension or invented content was added. Dark negative space remains where needed for the original body outline; it is not an artificial rectangular crop of a blank collage area.

The script `scripts/prepare_category_images.py` reproduces this transformation with --write and validates it without modifying files with --check. `assets/muscles/preparation.json` records the source dimensions, crop rectangle, prepared dimensions and both SHA-256 values. A check rerun confirmed original hashes and bundled-file hashes match the audit. Total source bytes: 11,187,932; total prepared JPEG bytes: 1,456,531.

Crop coordinates are source pixels, left/top inclusive and right/bottom exclusive. The complete dimension/crop mapping is:

| Canonical category | Filename | Original dimensions | Source crop box | Prepared dimensions |
| --- | --- | --- | --- | --- |
| Chest | chest.jpg | 2943 x 4096 | (0, 0, 2943, 3000) | 753 x 768 |
| Back | back.jpg | 2648 x 4006 | (0, 0, 2648, 2800) | 726 x 768 |
| Shoulders | shoulders.jpg | 3040 x 4094 | (0, 0, 3040, 2850) | 768 x 720 |
| Biceps | biceps.jpg | 2681 x 4096 | (0, 0, 2681, 2900) | 710 x 768 |
| Triceps | triceps.jpg | 2667 x 4096 | (0, 0, 2667, 3000) | 683 x 768 |
| Forearms | forearms.jpg | 2633 x 4096 | (100, 0, 2633, 3500) | 556 x 768 |
| Legs | legs.jpg | 2884 x 3898 | (180, 0, 2700, 3330) | 581 x 768 |
| Cardio | cardio.jpg | 2736 x 4026 | (100, 120, 2600, 3400) | 585 x 768 |
| Core | abs.jpg | 2833 x 4096 | (0, 0, 2833, 2900) | 750 x 768 |
| Full Body | full_body.jpg | 2664 x 4096 | (480, 0, 2230, 3040) | 442 x 768 |

All original and prepared files passed actual JPEG format, verify(), complete decode and dimension checks. Prepared images were inspected both at larger preview size and contained inside 72 x 72 desktop thumbnail previews. No category needs a replacement source based on this inspection. Native image appearance remains a separate verification requirement below.

## Rendering and compact rows

- Static require() mapping remains centralized in categoryImages.ts and now points to prepared files under assets/muscles/. Canonical names, including Core -> abs.jpg and Full Body -> full_body.jpg, are unchanged.
- CategoryImage renders a single Image directly inside its frame. Both image dimensions are explicit percentages of the known frame: width 100%, height 100%. resizeMode remains contain.
- The nested crop viewport, runtime footer fraction, implicit image height and runtime anatomy clipping are removed. Only the frame's normal rounded corner clipping remains.
- Picker thumbnail frame is exactly 72 x 72, with aspectRatio 1 and the existing charcoal background.
- Picker row is full width with a 98-point minimum height: 72 image + 12 top padding + 12 bottom padding + two 1-point borders. Horizontal padding and image/text gap are 12.
- Category and Selected text occupy one flexible column with minWidth 0; selecting a category cannot move a separate selection block below the image. There is no fixed row/text height, so large accessibility text can grow the row.
- Existing pressed/focus/selected accessibility state, touch targets and image error fallbacks remain.
- Train's approved two-column cards retain their 5:3 frames, padding, captions and behavior. They receive the corrected images through the same component/mapping. No Train page redesign or other app screen changes.

## Exact files changed

Code/tests:

- `src/components/CategoryImage.tsx`
- `src/components/CategoryCard.tsx`
- `src/theme/categoryImages.ts`
- `src/workout/ExercisePicker.test.tsx`
- `src/screens/mobileExperience.test.tsx`

New preparation/verification files:

- `scripts/prepare_category_images.py`
- `assets/muscles/preparation.json`
- `TASK_031D_VERIFICATION.md`

New prepared JPEG files:

- `assets/muscles/chest.jpg`
- `assets/muscles/back.jpg`
- `assets/muscles/shoulders.jpg`
- `assets/muscles/biceps.jpg`
- `assets/muscles/triceps.jpg`
- `assets/muscles/forearms.jpg`
- `assets/muscles/legs.jpg`
- `assets/muscles/cardio.jpg`
- `assets/muscles/abs.jpg`
- `assets/muscles/full_body.jpg`

No original image was overwritten. Git status was inspected before editing and all earlier uncommitted work was retained. No exercise ID, catalog, filter, navigation, workout calculation, Home, Feed, Profile, backend, authentication, dependency or battle-rope change. No staging, commit, push or deployment.

## Validation

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, no warnings/errors reported.
- npm.cmd test -- --watch=false: PASS ? 550 tests across 26 suites (baseline 548 / 26).
- python mobile/scripts/prepare_category_images.py --check: PASS ? all ten original/prepared JPEG pairs decoded, crop/output dimensions and SHA-256 audit matched.
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited in this task.

The ten existing exact image-mapping/navigation cases now target the corrected static sources, with all functional checks retained. Two regression tests were added: direct Image sizing plus 72-square/98-row geometry and selected-text containment; and all ten mapping metadata dimensions against the checked JPEG crop audit. The Train grid test now checks the direct, fully sized contain image and absence of the obsolete crop viewport. Existing error fallback, category matching, selection, search, equipment, workout and social tests remain passing. No tests skipped or assertions relaxed to accept broken images.

## Remaining native verification

Android rendering: UNVERIFIED in this task. iOS rendering: UNVERIFIED. Desktop decoding/thumbnail inspection and automated renderer tests are not proof of native visual approval. The earlier environment could not initialize ADB and has no usable emulator executable; no device screenshot was captured here.

A freshly bundled Android build must be checked with the new assets/muscles paths, rather than an older cached bundle. Verify all ten categories in See all, muscle visibility at 72 x 72, no black rectangles or cropped fragments, no caption duplication, row height and selection behavior on a narrow phone, image-load performance, font scaling, scroll clearance and the four Train cards. Repeat on iOS. Full-body and cardio artwork retain their natural slimmer silhouettes with contain; their aspect ratio is never artificially widened. Exact platform root-cause confirmation and owner visual acceptance remain pending these device checks.
