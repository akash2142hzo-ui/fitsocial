# Task 031G ? Two-column Step 1 grid

Date: 2026-11-15

## Exact files changed

- `src/components/CategoryCard.tsx`: vertical near-square card, bold label and selected checkmark.
- `src/components/CategoryImage.tsx`: optional grid presentation using existing thumbnail sources and a responsive square frame; Train/default presentation unchanged.
- `src/workout/ExercisePicker.tsx`: five two-card rows in Step 1, requested heading, separate bottom Continue area and Step 1 scroll allocation.
- `src/workout/ExercisePicker.test.tsx`: update superseded row assertions and add responsive-width cases; retain mapping, fitting, accessibility and navigation checks.
- `TASK_031G_VERIFICATION.md`: this report.

Git status was inspected first. All prior uncommitted work was preserved. No image assets, category IDs/order, filters, workout state/calculations, Home, Train landing, Create, Feed, Profile, backend, bottom navigation or dependencies changed. No staging, commit, push or deployment.

## Grid dimensions and spacing

The existing page has 16-point horizontal padding and a 720-point maximum content width. Let P be its available inner width. Each row contains two flex:1 cards with minWidth:0 and an 8-point gap, so card width is (P - 8) / 2. No screen width is read or hardcoded; the native flex layout performs this calculation using available space.

Examples of inner widths checked in tests:

| Inner width P | Card width |
| --- | --- |
| 288 | 140 |
| 328 | 160 |
| 400 | 196 |
| 720 | 356 |

All five rows use an 8-point horizontal gap; the enclosing grid uses an 8-point vertical gap. The existing category order is preserved: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Legs, Core, Full Body, Cardio.

Cards use 8-point padding, a 1-point border, 12-point radius and a 4-point image/caption gap. The image frame fills the inner card width with aspectRatio 1. Captions use existing system-sans heading typography, 16/22, bold 700, with a 24-point minimum caption area. Neither the caption nor overall card has a fixed height or disabled text scaling. At a 140-point card width, image height is 122 and normal total height approximately 168, so the image occupies about 73% of the card. Overall proportions are near-square; larger text can increase card height. On wider layouts, image share grows naturally rather than clipping the caption.

All ten existing prepared muscle JPGs remain on the exact existing canonical mapping. Grid mode explicitly uses thumbnail sources, not the four Train landscape variants. Images remain contain-fitted, centered and proportionate on the existing near-black background. No crop, transform or generated content was added. Runtime image errors still use muscle-specific fallbacks in a square area. Train retains its previous non-grid image component behavior and layout.

## Selection

The existing picker supports one selected category, not multi-select. This behavior is unchanged. A card tap calls the same chooseCategory function. Selected cards show the existing lime border plus a decorative lime checkmark beside the bold caption; the accessible button still announces its canonical category and accessibilityState.selected. Keyboard focus and pressed feedback remain. Selecting a different card replaces the selection, and choosing a category does not start a workout or select an exercise.

The earlier horizontal row/chevron and visible Selected label are replaced by the requested card/check presentation. Screen-reader selection state remains explicit. Touch targets remain at least the shared 48-point minimum.

## Header and Continue positioning

Back and Cancel remain in the existing non-scrolling modal navigation header. The Step 1 heading is Choose muscle group; Step 1 of 3 and its progress indicator remain above the grid in scroll content.

There is exactly one Continue to equipment button in Step 1. It is now inside a normal-flow bottom action area, a sibling after the ScrollView within the existing full-height KeyboardAvoidingView. Step 1's ScrollView has flex:1 and consumes the remaining height; the action area does not overlay it and is not absolutely positioned. Continue therefore does not depend on the grid's scroll offset.

The button keeps its existing 48-point minimum touch height and disabled-until-category-selected rule. Footer horizontal padding is 16, top padding 8, and bottom clearance reuses the project's conservative Android 48-point clearance / iOS 8-point padding convention. The surrounding native SafeAreaView handles iOS safe areas. The modal is above the app's existing tab boundary; no tab bar or navigation component was modified.

Step 1 scroll content has 16-point bottom padding and is laid out above the separate action area. The last row can scroll fully into view without being behind Continue. No second Continue or nested scrolling grid was introduced. Steps 2 and 3 retain their existing headers, content, Continue/search/filter/selection behavior and layout. The footer is rendered only in Step 1.

## Validation

- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, no warnings/errors reported.
- npm.cmd test -- --watch=false: PASS ? 568 tests across 27 suites (baseline 564 / 27), 12.777 seconds.
- python mobile/scripts/prepare_category_images.py --check: PASS; all ten thumbnail and four Train image files and their source/dimension/hash audits remain valid and unchanged.
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts are informational; neither was edited for this task.

Existing full-width-row/104-frame assertions were updated to the newly requested grid behavior. Image containment, exact mapping, fallback, selected state, focus and category/equipment navigation assertions remain. The former row-spacing case now checks all five two-card rows, exact category order, last-row containment in the scroll area, one footer Continue outside scrolling, disabled/enabled rules and transition to unchanged Step 2. Four responsive-width cases were added. No functional assertions, tests or timeout limits were disabled or weakened.

## Remaining device verification

Android/iOS native rendering: UNVERIFIED. No physical-device or simulator screenshot was captured. Tests prove component structure and layout contracts, not final native measurements or visual acceptance.

Check on narrow Android phones and iOS devices: two equal columns, near-square proportions, labels at large text sizes, complete anatomy with contain, selected checkmark visibility, full last-row scrolling and actual navigation/gesture-bar safe-area clearance. The conservative Android footer padding may exceed the actual inset; verify on the owner's Expo/native build. Continue's separate normal-flow placement avoids overlap structurally, but physical safe-area behavior must still be checked. No claim of native visual approval or resolution of the earlier device font report is made.
