# Task 031C ? Workout category JPG integration

Date: 2026-11-15

## Exact task files

1. `src/theme/categoryImages.ts` (new): exhaustive canonical category-to-static-require mapping and verified intrinsic dimensions.
2. `src/components/CategoryImage.tsx` (new): reusable decorative, contain-fitted category artwork with runtime fallback.
3. `src/workout/TrainMusclePicker.tsx`: use CategoryImage in the four existing cards, retaining existing anatomical artwork as its error fallback.
4. `src/components/CategoryCard.tsx`: use the same image mapping in the existing ten-category picker; retain MuscleLabel fallback.
5. `src/workout/ExercisePicker.test.tsx`: exact ten image mapping/navigation tests and retained fallback coverage.
6. `src/screens/mobileExperience.test.tsx`: four Train image/error-fallback checks and one additional grid/See all integration test.
7. `TASK_031C_VERIFICATION.md` (new): this report.

Git status was inspected first. Existing uncommitted work was preserved. No source JPG was edited, renamed, replaced or deleted. Other assets, Home, Create, Feed, Profile, bottom navigation, battle-rope artwork, header, Train hero/activity/history layout, catalog IDs, filters, workout state, calculations, backend and authentication were not modified. No dependency, download, staging, commit, push or deployment.

## Asset directory and actual JPEG validation

Directory: `mobile/assets/photos/`.

All ten requested files exist. Each was inspected with the already-installed Python Pillow decoder using Image.open, actual format assertion (`JPEG`), verify(), then reopen/load() for complete pixel decoding. Extension alone was not used as validation. All files passed. A contact sheet and individual source inspections confirmed category-appropriate highlighted anatomy/activity and embedded category captions. Missing files: NONE. Invalid files: NONE.

Width/height ratios below are intrinsic source ratios, not the shared display-slot ratio.

| Canonical category | Exact source file | Dimensions | Width / height | Validation |
| --- | --- | --- | --- | --- |
| Chest | chest.jpg | 2943 x 4096 | 0.718506 | JPEG verify + full decode PASS |
| Triceps | triceps.jpg | 2667 x 4096 | 0.651123 | JPEG verify + full decode PASS |
| Back | back.jpg | 2648 x 4006 | 0.661008 | JPEG verify + full decode PASS |
| Biceps | biceps.jpg | 2681 x 4096 | 0.654541 | JPEG verify + full decode PASS |
| Forearms | forearms.jpg | 2633 x 4096 | 0.642822 | JPEG verify + full decode PASS |
| Legs | legs.jpg | 2884 x 3898 | 0.739867 | JPEG verify + full decode PASS |
| Cardio | cardio.jpg | 2736 x 4026 | 0.679583 | JPEG verify + full decode PASS |
| Shoulders | shoulders.jpg | 3040 x 4094 | 0.742550 | JPEG verify + full decode PASS |
| Core | abs.jpg | 2833 x 4096 | 0.691650 | JPEG verify + full decode PASS |
| Full Body | full_body.jpg | 2664 x 4096 | 0.650391 | JPEG verify + full decode PASS |

The JPGs were supplied locally by the project owner for this integration. No third-party image was fetched or substituted. No independent claim about their original generation tool or redistribution license is made.

## Central mapping and fitting

All ten sources use literal React Native require() paths in categoryImages.ts. The mapping is type-checked against PickerCategory. Core maps to abs.jpg and Full Body maps to full_body.jpg. There are no computed require paths, remote URLs, exercise-record edits or category aliases.

The approved Train layout is preserved: the same two equal columns, four initially visible cards, 12-point padding/radius, 8-point gaps, 5:3 image frames and readable native category captions below the images. All ten images are available in the existing complete picker. Its compact image slots are consistently 120 x 72 points (also 5:3), retaining the earlier 72-point artwork height and existing controls.

The sources are portrait images with category text already embedded near the bottom. Filling landscape slots with cover would remove important anatomy, so all images use contain. A shared nested artwork viewport fits the first 85% of each source vertically, preserving its intrinsic scale and centering it in the 5:3 dark slot. The source image itself renders at its original aspect ratio, with the embedded title footer extending below an overflow-hidden viewport. This masks only the redundant image footer while keeping the existing native caption, avoiding two visible category titles or tiny embedded text as the sole readable label.

The footer boundary was inspected across all ten sources: embedded white titles begin below 86% of source height (approximately 86.5?89.8% in the inspection sample). Full-body/leg anatomy and the highlighted muscle regions remain above the cutoff. No asset pixels are changed. Fitting uses intrinsic width/height metadata and proportional styles, without screenshot-derived dimensions, stretching, negative offsets, transforms, or cover cropping. Some dark horizontal letterboxing is intentional because the source artwork is portrait.

Both the shared frame and image are hidden from screen readers; the outer frame ignores pointer events. Existing card button names, focus/pressed feedback and minimum touch targets remain. Runtime onError restores the original anatomical Train diagram or specific muscle-label picker fallback. An unmapped category also returns its provided fallback. All current requested assets are valid, so no category is intentionally left on a fallback.

## Navigation and tests

Existing behavior is preserved:

- The four Train cards open the existing picker with Biceps, Triceps, Chest or Back preselected.
- See all opens all ten canonical categories.
- Every category selects normally and proceeds through available equipment to matching exercises.
- Images do not select an exercise, start a workout or change saved state by themselves.
- Card captions, category IDs, ordering, selected states, search, equipment matching and workout calculations are unchanged.

Validation results:

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, no warnings/errors reported.
- npm.cmd test -- --watch=false: PASS ? 548 tests across 26 suites (baseline 537 / 26).
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited in this task.
- Asset existence / actual JPEG format / verify / complete load: PASS for all ten.

Eleven tests added: ten independent exact category/file mapping and navigation cases, plus a Train grid/See all integration case. Existing four Train artwork tests now verify normal images and explicitly trigger image failure before checking the retained anatomical fallback and navigation. Existing all-category fallback mapping assertions also run after simulated decode errors. Previous absence-of-image expectations were updated to assert the required ten images; ordering, provisional selection, accessibility and touch-target assertions were retained. No tests were skipped or functional behavior assertions weakened.

## Android/iOS verification gaps

Android rendering: UNVERIFIED in this task. iOS rendering: UNVERIFIED. No native device screenshot was captured. Host JPEG decoding and renderer tests do not establish native visual approval.

Device review is still needed for image decoding/loading at native resolution, anatomical framing, footer masking, rounded clipping, dark letterboxing, readable captions and picker fit at narrow Android widths and large text settings. The originals are approximately 2.6?3K by 3.9?4.1K; loading/performance on a lower-memory device was not measured. The shared proportional viewport and unchanged Train card dimensions are covered by automated style checks, not a native layout measurement. The prior Android serif-rendering report remains outside this image-only task and is not claimed resolved.
