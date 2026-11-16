# Task 031F ? Step 1 image fitting

Date: 2026-11-15

## Exact files changed

1. `src/components/CategoryImage.tsx`: change only the compact picker frame to 104 x 104, prevent shrinking and use the existing near-black background token.
2. `src/components/CategoryCard.tsx`: request a matching 104-point fallback and replace the obsolete 90-point minimum with the shared touch-target minimum, leaving actual row height to content.
3. `src/workout/ExercisePicker.test.tsx`: updated requested frame/row expectations and eleven new fitting/spacing cases.
4. `TASK_031F_VERIFICATION.md`: this report.

Git status was inspected before edits. All earlier uncommitted changes were preserved. No source/prepared image, crop script, image mapping, Train card/layout, header, other picker step, category ID, filter, selection action, Continue behavior, navigation, workout calculation, Home, Feed, Create, Profile, backend, database, bottom navigation or dependency changes. Nothing staged, committed, pushed or deployed.

## Diagnosis / cropping root cause

The existing picker already used resizeMode=contain and preserved intrinsic aspect ratio. It did not use cover. Its Image filled a 64 x 64 square frame, and the existing ten category sources were correct. No hidden footer mask, negative margin or image transform was present. The default 5:3 frame used by Train was overridden to a square by the picker-specific style, so Train's landscape crops were not accidentally being selected for Step 1.

The concrete fitting limitation was the small 64-point frame. A portrait subject has less visible width than its square contain frame: Full Body's 442:768 source displayed at approximately 36.83 x 64, while Cardio displayed at 48.75 x 64. This can look narrow or poorly fitted despite correct containment. The thumbnail did not explicitly prohibit shrinking; the corrected compact frame now does.

At 104 x 104, the same complete Full Body source displays at approximately 59.85 x 104, and Cardio at 79.22 x 104. Both dimensions increase 62.5%, without stretching. No source-artwork clipping by cover was found in the inspected code. Physical-device clipping itself was not reproduced during this task, so the source inspection is a diagnosis of the sizing limitation, not a claim of a reproduced Android engine fault.

All ten prepared JPEGs were decoded and visually inspected in a centered 104-point host preview. Chest, back, both deltoids, biceps, triceps, forearms, leg muscles, complete abdominal highlights, full figure and running figure were visible in their corresponding images. The complete figure means the complete supplied illustration/target region; upper-body sources are intentionally upper-body views, not full people.

These are opaque RGB JPEGs with no alpha channel. Their dark margins were inspected from image content and edge pixels, not from an alpha bounding box. Most background-edge samples are near-black charcoal, around RGB 9?20, with occasional anatomy touching an edge. The existing body-preserving crops already remove embedded category captions and excessive footer areas. Their remaining negative space is part of the subject composition; further trimming was not necessary and could cut off limbs/figure context. No corrected asset was needed or created in 031F.

## Final presentation and row sizing

| Element | Before | After |
| --- | --- | --- |
| Step 1 thumbnail frame | 64 x 64 | 104 x 104 |
| Thumbnail shrinking | Implicit default | Explicit flexShrink: 0 |
| Image | Width/height 100%, contain | Unchanged |
| Frame alignment | Center/center | Unchanged |
| Picker frame background | Elevated gray #1F2329 | Existing near-black #0E1013, closer to source edges |
| Radius | 12 | 12 |
| Row padding | 12 | 12 |
| Image/label gap | 12 | 12 |
| Row spacing | 8 | 8 |
| Row minimum | 90 | Shared 48-point touch minimum; content controls actual size |
| Normal content-driven row | Approximately 90 | Approximately 130 = 104 + 12 + 12 + 1 + 1 |
| Fallback tile | 64 minimum | 104 minimum, same readable category-specific fallback |

The row has no fixed height or maxHeight. Its label/selection column has flex: 1 and minWidth: 0 and is vertically centered by the row. The chevron stays on the right in normal flex flow. Large text can wrap and increase row height. A 320-point screen leaves 288 points after existing page margins; after the thumbnail, padding, borders, gaps and chevron, 122 points remain for the label column. This is an arithmetic sizing check, not a native text-layout measurement.

The 104-square frame uses contain and explicit Image width/height 100%. The entire bitmap is centered, its intrinsic ratio is preserved, and no runtime crop viewport or image transform is used. Rounded corner clipping remains consistent; anatomy was inspected in the host preview. Decorative artwork remains hidden from assistive technology and the existing category button labels/states/touch handling are unchanged.

Non-compact CategoryImage usage is unchanged: the four Train cards still select their existing 800 x 480 landscape sources and keep their approved 5:3 frames and elevated background.

## Assets and proportional fitting

All picker assets are unchanged under `assets/muscles/`; their owner-supplied originals remain under `assets/photos/`. All ten canonical mappings are unchanged, including Core -> abs.jpg and Full Body -> full_body.jpg.

| Category | Picker source | Dimensions before = after | Intrinsic width/height | Contained size in 104-square frame |
| --- | --- | --- | --- | --- |
| Chest | chest.jpg | 753 x 768 | 0.980469 | 101.97 x 104.00 |
| Back | back.jpg | 726 x 768 | 0.945312 | 98.31 x 104.00 |
| Shoulders | shoulders.jpg | 768 x 720 | 1.066667 | 104.00 x 97.50 |
| Biceps | biceps.jpg | 710 x 768 | 0.924479 | 96.15 x 104.00 |
| Triceps | triceps.jpg | 683 x 768 | 0.889323 | 92.49 x 104.00 |
| Forearms | forearms.jpg | 556 x 768 | 0.723958 | 75.29 x 104.00 |
| Legs | legs.jpg | 581 x 768 | 0.756510 | 78.68 x 104.00 |
| Cardio | cardio.jpg | 585 x 768 | 0.761719 | 79.22 x 104.00 |
| Core | abs.jpg | 750 x 768 | 0.976562 | 101.56 x 104.00 |
| Full Body | full_body.jpg | 442 x 768 | 0.575521 | 59.85 x 104.00 |

No JPG is forcibly stretched to a square. The square is the consistent frame; natural portrait/landscape letterboxing is retained where needed to show the full subject.

## Validation results

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, no warnings/errors reported.
- npm.cmd test -- --watch=false: PASS ? 564 tests across 27 suites (baseline 553 / 27), 12.767 seconds.
- python mobile/scripts/prepare_category_images.py --check: PASS ? all ten picker and four Train JPEG pairs decode, dimensions and crop bounds match, and source/prepared SHA-256 audits match. This command did not regenerate assets.
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited for this task.

Added ten category-by-category fitting cases checking the square size, contain mode, fixed nonshrinking frame, both image dimensions, centering, near-black background and aspect-preserving containment math. Added a Step 1 row-spacing/flexible-label/narrow-width case. Existing exact asset mapping, all-category selection/equipment navigation, Continue, fallback, focus and Train preservation tests remain enabled and passing. Old size assertions were updated to the newly requested 104-point behavior; no functional assertions or test timeouts were weakened.

## Remaining Android/iOS verification gaps

Android appearance: UNVERIFIED in this task. iOS appearance: UNVERIFIED. Host decoding and the 104-point preview do not replace native visual verification. No physical-device or simulator screenshot was captured.

The owner should verify all ten categories in the newly loaded Expo/native build: complete muscle/figure visibility, centered containment, no unexpected native clipping, matching dark backgrounds, right-chevron alignment, labels at normal and large text sizes, smooth Step 1 scrolling, selected/Continue behavior and return navigation. The larger frame deliberately produces taller content-driven rows; there is no arbitrary small row-height constraint that can squeeze or clip the image. Full Body remains naturally narrower than a torso crop because it preserves the full figure.
