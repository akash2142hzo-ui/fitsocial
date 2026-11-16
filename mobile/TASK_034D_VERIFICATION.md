# Task 034D - Measured workout input alignment and compact unit switch

Date: 2026-11-16

## Exact files changed for this task

- `src/workout/WorkoutLogger.tsx`: native form/label/switch measurement, measured two-column/stacked input layout, aligned label rows, equal input heights, smaller unit visuals and independent touch regions.
- `src/workout/workoutInputLayout.ts` (new): pure UI geometry helpers.
- `src/workout/workoutInputLayout.test.ts` (new): geometry and fit/fallback tests.
- `src/screens/mobileExperience.test.tsx`: update toggle-only visual expectations without weakening touch/conversion checks; add six measured form-width/scaling cases.
- `TASK_034D_VERIFICATION.md`: this report.

Git status was inspected first. Existing uncommitted work was preserved. No conversion, validation, workout reducer/state, calculations, stored records, Log Set action, other screen, picker, asset, dependency or backend changed. No staging, commits or pushes.

## Diagnosis

The previous control occupied at least 100 dp of a flexible half-width field. The weight caption used flex shrinking and wrapping, while the Reps and weight header heights could differ. A viewport/font-based flex basis did not establish that the measured weight label plus the switch fit inside a column. A 100 dp switch could therefore squeeze Total weight into multiple lines and push the Weight input below Reps.

This diagnosis is from the source layout and supplied problem description. No physical screenshot was captured by this task.

## Width and height calculations

The input form measures its actual local content width W with onLayout. No screen width or screenshot pixel value is used. The label glyph bounds and toolbar bounds are measured by native onLayout too. Measurement is invalidated by exercise/font-scale changes; label/control remount keys ensure fresh native measurements even if text happens to be identical. Inputs themselves do not remount.

The column gap G is 12 dp. Candidate column width C = (W - G) / 2. Two columns are used only when C >= max(measured Reps caption width, measured weight caption width + 4 dp minimum gap + measured switch TOUCH width). Both fields receive the same numeric C; 2*C + 12 = W. The inline weight header uses space-between so the caption stays left and the switch ends at the field's right edge, with at least 4 dp gap.

When either header cannot fit C, both fields stack at the same full width W. Within the full-width weight header, the switch stays beside the single-line caption when that combined budget fits W. Otherwise it moves to its own line. Before measurement, a conservative stacked layout avoids assuming space exists.

Representative calculations using simulated measured captions Reps=84 dp, Total weight=72 dp, touch switch=88 dp at normal text size:

| Actual form W | Candidate C=(W-12)/2 | Weight header need=72+4+88 | Arrangement | Actual field width |
| ---: | ---: | ---: | --- | ---: |
| 248 | 118 | 164 | Stacked | 248 |
| 288 | 138 | 164 | Stacked | 288 |
| 328 | 158 | 164 | Stacked | 328 |
| 340 | 164 | 164 | Two columns | 164 each |
| 360 | 174 | 164 | Two columns | 174 each |
| 379 | 183.5 | 164 | Two columns | 183.5 each |

These are explicit test inputs, not measurements of the owner's phone. Native font metrics determine the real switch point; the fit rule is not a fixed device breakpoint. A narrow device may legitimately use full-width stacked inputs because fitting the complete single-line label plus nonoverlapping touch areas in half its width is mathematically impossible.

In two-column mode both headers use minHeight=max(measured Reps caption height, measured weight caption height, measured switch touch height), with centered content. Both fields use the same 8 dp label-to-input gap. Their input height is max(48, ceil(20*fontScale + 2*12 + 2*1)), using the current shared 20 dp input line height, 12 dp padding and 1 dp borders. Heights at scales 1/1.5/2/3 are 48/56/66/86 dp. Android's extra font padding is disabled on these two inputs so the shared formula applies consistently; their keyboard types, values, validation, refs and callbacks are untouched. Timed/cardio input sizing remains as before.

Total weight retains the existing 12 sp caption typography. It is single-line and uses native adjustsFontSizeToFit as a last resort for a label too wide for the entire fallback field; ordinary inline layouts are selected from measured fit, not from truncating text. It does not disable font scaling. All normal content remains in flex layout, without negative margins, arbitrary spacer offsets or absolute positioning.

## Switch geometry and accessibility

At ordinary text size, visible width=80 dp, height=32 dp. Each visible segment is exactly 40 dp: half the track. Each outer Pressable is exactly 44 dp wide and at least 44 dp high, in disjoint adjacent intervals [0,44] and [44,88]. The 88 dp reserved toolbar, not merely the 80 dp artwork, participates in the fit calculation.

The track's horizontal inset is touchWidth - segmentWidth = 44 - 40 = 4 dp at each OUTER edge. Its vertical inset is (touchHeight - visibleHeight)/2 = (44 - 32)/2 = 6 dp. The first visible segment aligns to the end of its hit box and the second to the start, producing contiguous [4,44] and [44,84] visible halves inside the full [4,84] track. There is no horizontal hitSlop and no overlapping touch region. The label gap and header height reserve space for the entire touch box, away from inputs/other controls.

The decorative track alone uses absolute background geometry computed from these dimensions; primary content is flex. It ignores touches and is hidden from screen readers. Selected lime/dark text and unselected charcoal/light text remain. Track and segments are fully rounded, radius 999. Text is medium 12 sp / 16 dp line height. Focus uses an outline that does not alter width; pressed and accessible selected-state behavior are preserved.

Actual unit glyph dimensions are measured. At accessibility sizes, segmentWidth=max(40, ceil(measured glyph width+8)), visibleHeight=max(32, ceil(measured glyph height+8)); touch dimensions are at least 44. Both visible halves remain equal. Thus the normal-size 80x32 target can grow when accessibility text requires it, rather than clipping or capping scaling. Before glyph measurement a conservative two-character em budget is used. The parent uses the resulting actual toolbar measurement and can stack the inputs/header as necessary.

## Validation results

- TypeScript (`npm.cmd run typecheck`): PASS.
- ESLint (`npm.cmd run lint`): PASS, no errors/warnings.
- Focused layout, screen and conversion suites: PASS, 159 tests across 3 suites, 42.07 seconds.
- Full mobile suite (`npm.cmd test -- --watch=false`): PASS, 678 tests across 31 suites, 36.259 seconds (starting baseline 658 tests / 30 suites).
- Git diff checks (`git diff --check`): PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts concern earlier work; neither was edited in this task.

20 new test cases were added: 14 pure geometry cases and 6 measured-form UI scenarios. Earlier toggle assertions follow the new dimensions and preserve the accessibility/selection/conversion requirements.

Focused tests cover explicit form widths 248/328/360/379 dp and font scales 1/2/3, native-layout event simulation, equal field widths/heights, aligned two-column headers, single-line weight label configuration, fallback header arrangement, nonoverlapping 44 dp hit geometry, exact visible halves/insets, focus/pressed feedback and continued conversion/Log Set behavior. Pure geometry tests additionally cover fractional widths, exact fit threshold, no measurements yet, measured glyph growth and scaled input heights. Existing kg/lb conversion, invalid draft, canonical kg history/Progress, timer/calorie and logged-set tests remain enabled. No tests were removed or weakened.

## Remaining device-verification gaps

Android/iOS native rendering remains UNVERIFIED. Renderer tests simulate onLayout sizes and inspect resulting styles; they do not measure actual native glyphs or prove a physical screenshot matches the intended layout. Verify the owner's Expo/native build for measured breakpoint behavior, native single-line font fitting, first-layout/reflow on rotation and font-scale changes, label baselines/input edges, equal native input heights, outline visibility, 44 dp touch areas, keyboard/caret behavior and readable large-text fallback. Normal-size switch dimensions are 80x32; larger accessibility text deliberately permits a bigger control and stacked arrangement. No emulator or physical-device render was tested in this task.
