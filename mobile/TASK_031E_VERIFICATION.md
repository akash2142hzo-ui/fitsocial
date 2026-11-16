# Task 031E ? Train category and Step 1 polish

Date: 2026-11-15

## Scope and exact files changed

Code and tests:

- `src/theme/categoryImages.ts`: four dedicated Train sources; canonical thumbnail mapping unchanged.
- `src/components/CategoryImage.tsx`: select the Train crop or existing picker crop, with 64-square compact frames.
- `src/components/CategoryCard.tsx`: 90-point minimum rows and decorative right chevron.
- `src/components/MuscleLabel.tsx`: optional fallback size, default unchanged; Step 1 requests 64.
- `src/workout/ExercisePicker.test.tsx`: compact-row, chevron, fallback and sizing expectations.
- `src/screens/mobileExperience.test.tsx`: Train landscape sources, equal-frame/crop and navigation coverage.
- `src/theme/trainingTypography.test.ts` (new): both native platform font-token branches.
- `scripts/prepare_category_images.py`: reproducible 5:3 Train crop preparation and validation.

New assets/audit:

- `assets/muscles/train/chest.jpg`
- `assets/muscles/train/back.jpg`
- `assets/muscles/train/biceps.jpg`
- `assets/muscles/train/triceps.jpg`
- `assets/muscles/train/preparation.json`
- `TASK_031E_VERIFICATION.md` (new): this report.

Git status was inspected before edits. Earlier uncommitted work and all original source images were preserved. The existing ten Step 1 image crops and their dimensions remain the same. No Home, Create, Feed, Profile, backend, database, bottom-tab, exercise-ID, category-filter, workout-calculation or navigation changes. Train hero/activity/history and Steps 2/3 layouts are unchanged. No generated image content, download, dependency, staging, commit, push or deployment.

## Image investigation and correction

All source/prepared images were decoded and their dimensions, actual JPEG format, crop rectangles and SHA-256 audits checked with the existing Pillow-based preparation script. These JPEGs are opaque RGB images, so there is no alpha bounding box to trim. Their visible margins must be evaluated from the actual dark background and anatomy, not transparency.

The large horizontal gaps in Train were primarily contain-fit letterboxing: portrait crops with aspect ratios around 0.89?0.98 were displayed in a 1.667-wide frame. Depending on category, this left approximately 41?47% of the slot width outside the image. Simply changing padding or stretching would not fix that correctly.

Four dedicated landscape variants now focus on the complete highlighted target regions. Every source crop is mathematically 5:3 before resizing, and every final Train JPG is 800 x 480. Native contain therefore fills the existing 5:3 frame without horizontal letterboxing or cropping at runtime. Original muscle anatomy is not distorted. Upper-body context outside the target region, such as a raised fist or lower abdomen, may be outside the crop; the highlighted biceps, triceps, pectorals and back regions remain visible. No cover mode, synthetic extension, new image generation or forced transform is used.

The new crops were visually inspected at phone-card preview size. Dark source backgrounds remain natural and consistent, with the existing charcoal card/frame background. Category names remain readable native text beneath the images; no baked-in duplicate labels were added. The four cards retain equal flex widths, equal image aspect ratios, equal padding/radius and the existing two-column structure.

Original/final dimensions:

| Category | Original source filename | Full source dimensions | Existing picker JPG (before = after) | New Train JPG |
| --- | --- | --- | --- | --- |
| Chest | chest.jpg | 2943 x 4096 | 753 x 768 | 800 x 480 |
| Back | back.jpg | 2648 x 4006 | 726 x 768 | 800 x 480 |
| Shoulders | shoulders.jpg | 3040 x 4094 | 768 x 720 | Not on the four-card grid |
| Biceps | biceps.jpg | 2681 x 4096 | 710 x 768 | 800 x 480 |
| Triceps | triceps.jpg | 2667 x 4096 | 683 x 768 | 800 x 480 |
| Forearms | forearms.jpg | 2633 x 4096 | 556 x 768 | Not on the four-card grid |
| Legs | legs.jpg | 2884 x 3898 | 581 x 768 | Not on the four-card grid |
| Cardio | cardio.jpg | 2736 x 4026 | 585 x 768 | Not on the four-card grid |
| Core | abs.jpg | 2833 x 4096 | 750 x 768 | Not on the four-card grid |
| Full Body | full_body.jpg | 2664 x 4096 | 442 x 768 | Not on the four-card grid |

Train source-pixel crop bounds (right/bottom exclusive):

| Category | Source crop box | Final dimensions |
| --- | --- | --- |
| Chest | (1, 700, 2941, 2464) | 800 x 480 |
| Back | (1, 1100, 2646, 2687) | 800 x 480 |
| Biceps | (0, 700, 2680, 2308) | 800 x 480 |
| Triceps | (1, 950, 2666, 2549) | 800 x 480 |

The preparation script verifies every crop is within its source and has an exact 5:3 ratio before proportional resizing. Its audit records source and prepared SHA-256 values. All ten canonical thumbnail mappings remain intact, including Core -> abs.jpg and Full Body -> full_body.jpg; Train variants use the same category keys. Static require() paths remain centralized, with no remote or computed asset paths.

## Before / after sizing

| Element | Before | After |
| --- | --- | --- |
| Train columns | Two equal flex columns | Unchanged |
| Train image frame | 5:3, width 100% | Unchanged; source now also 5:3 |
| Train padding / radius / image-label gap | 12 / 12 / 8 | Unchanged |
| Train image fitting | Contain portrait, wide side gutters | Contain matching landscape, no ratio-induced gutters |
| Picker thumbnail | 72 x 72 | 64 x 64 |
| Picker minimum row | 98 | 90 |
| Picker horizontal padding | 12 | 12 |
| Picker image-label gap | 12 | 12 |
| Picker row gap | 8 | 8 |
| Picker label | Flexible column, center aligned by row | Unchanged; right chevron added in normal flex flow |
| Fallback tile used by Step 1 | 72 minimum | 64 minimum; default elsewhere stays 72 |

The row minimum is 64 image + 12 top + 12 bottom + two 1-point borders = 90 points, within the 80?92 target. No fixed row/text height is imposed. Labels and Selected text can wrap/grow with font scaling, and the row remains a single normal flex row. A 12-point decorative chevron slot sits on the right; it has no independent touch action. The whole row retains its existing button action and exceeds 44 points. Absolute positioning is not used for normal content.

## Typography investigation: source, correction status and limits

The owner confirmed the screenshots came from Expo Go or a development build, not a browser preview.

The actual source of all font-family assignments is `src/theme/design.ts`: Platform.select sets Android to sans-serif and iOS to System. Traced Train card captions, picker category/Selected labels, section headings, step captions, Back/Cancel controls, Continue buttons and inputs through type.body/label/heading/caption/button and ui.input. The surrounding Train title/hero also use these tokens. No serif family, custom TTF/OTF, useFonts loader, global Text defaults or project native font override was found. Existing prepared JPGs and new Train crops have no embedded category words used in place of native labels.

Both native Platform.select branches are now exercised in tests instead of relying on Jest's default iOS platform alone. They resolve all shared text/button/input roles to Android sans-serif and iOS System. Train and Step 1 rendered-text assertions verify explicit font-family assignments and enabled accessibility scaling. No font sizes or line heights were changed to disguise the issue.

Observed-device root cause: NOT DETERMINED. There is no demonstrated incorrect family assignment in the checked source to correct. A speculative font replacement would not establish a fix, so the valid explicit system-family configuration was retained. The reported serif-looking appearance in the owner's Expo runtime remains unresolved until its loaded bundle and native resolved typeface can be inspected. Tests do not prove physical glyph appearance, and this task does not claim the font issue is fixed on Android.

ADB inspection outside the restricted process succeeded, but `adb devices -l` listed no connected devices. Consequently no Expo target or native typeface was available for inspection, and no Android screenshot was captured. This is the current native-verification status, superseding the earlier sandbox-only ADB initialization failure.

## Validation

- TypeScript: PASS.
- ESLint: PASS, no warnings/errors in the final run.
- Full mobile tests: PASS ? 553 tests across 27 suites, 36.795 seconds.
- python mobile/scripts/prepare_category_images.py --check: PASS ? ten existing thumbnail pairs and four new Train landscape pairs decoded; dimensions, bounds, 5:3 Train ratios and SHA-256 audit matched.
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited for this task.

The pre-task baseline was 550 tests / 26 suites. Added three cases across one new typography suite and the existing mobile integration suite: two platform font branches, plus equal Train frame/crop ratio and Step 1 navigation. Existing row/fallback expectations now assert the requested 64/90 sizes and chevron. The ten mapping/navigation tests, four Train error-fallback tests and existing workout/social tests remain enabled and unchanged in behavior.

The first full run passed 552 tests but an existing Welcome test exceeded its unchanged five-second timeout during an unusually slow 109.79-second run. No timeout or assertion was loosened; the entire validation command was rerun. An initial lint warning in the new font test was corrected by using Jest's module-loading API.

## Remaining Android/iOS verification gaps

Native Android and iOS visual verification: NOT PERFORMED. No connected Android target was available; iOS rendering was unavailable. The host crop preview is not a native screenshot or owner approval.

Remaining checks: all four Train crop regions at actual phone size, equal card balance, 64-square thumbnail recognition, 90-point normal-font rows, large-text growth, chevron alignment, Step 1 scrolling, and the exact system font/glyphs in the owner's loaded Expo build. The Android font report specifically remains unresolved. No screenshot-based visual approval is claimed.
