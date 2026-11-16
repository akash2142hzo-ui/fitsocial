# Task 031H ? Forearms and Legs symbol removal

Date: 2026-11-15

## Exact modified files

- assets/muscles/forearms.jpg ? background symbol removed; remains JPEG, 556 x 768.
- assets/muscles/legs.jpg ? background symbol removed; remains JPEG, 581 x 768.
- assets/muscles/preparation.json ? only these two preparedSha256 entries updated to match the edited files; dimensions and source hashes unchanged.
- TASK_031H_VERIFICATION.md ? this report and prompt record.

No UI, typography, card geometry, borders, selection, navigation or workout logic changed. Original images in assets/photos remain untouched. SHA-256 comparison confirmed every other bundled muscle JPG, including Core, Triceps, Full Body and all four Train landscape variants, is byte-identical to its task-start version. Existing uncommitted work was preserved. Nothing staged, committed or pushed.

## Editing and invariants

Used the built-in image_gen editing tool through the imagegen skill. Both full-image edit outputs were inspected, but only their repaired background patches were used. A local System.Drawing composite copied these patches into the original decoded JPGs with an eight-pixel feather at patch boundaries. Forearms patch bounds: (224,656)-(352,768). Legs patch bounds: (224,640)-(368,768). No generated anatomy pixels were used. The original anatomy, pose, highlighted regions and crop remain; both images retain their resolution, aspect ratio and filename.

JPEGs were saved at quality 100. Re-encoding introduces small nonzero pixel differences outside the patches; pixel identity is not claimed. Across the upper anatomy region (rows 0?619), mean absolute RGB differences were Forearms [0.113,0.156,0.610] and Legs [0.190,0.237,0.906] on a 0?255 scale. Visual inspection found no anatomical/compositional change. Both edited patch regions contain zero lime-colored pixels under the validation threshold.

Final inspection: both decorative symbols are absent and restored dark backgrounds blend with the surroundings. No remaining symbol fragment or visible patch edge was observed at full-size inspection.

## Validation

- Actual JPEG decode and unchanged dimensions: PASS.
- Other muscle image SHA-256 preservation: PASS.
- python mobile/scripts/prepare_category_images.py --check: PASS for all ten picker assets and four Train assets, including updated checksum audit.
- npm.cmd run typecheck: PASS.
- npm.cmd run lint: PASS, no warnings/errors reported.
- npm.cmd test -- --watch=false: PASS ? 568 tests across 27 suites.
- git diff --check: PASS. Existing LF/CRLF notices for SocialIcon.tsx and colors.ts concern earlier work, not this task.

## Limitations

Final assets were inspected on the host; Android/iOS screenshots were not captured. Verify after reloading the current Expo/native bundle so cached JPGs do not obscure the update. JPEG re-encoding means anatomy pixels are visually preserved, not mathematically identical.

These are curated edits to bundled prepared assets. The original owner-supplied source files deliberately remain untouched; rerunning the preparation script with --write would restore the old source symbols. The non-mutating --check validates the current cleaned assets. Preserving cleanup through a future regeneration would require retaining/reapplying these two approved background edits; no preparation-code change was made under this asset-only scope.

## Final prompt set (built-in tool, not CLI)

Forearms:

Edit this exact supplied forearms image only. Remove ONLY the small lime-green outline decorative forearm/hand icon at the bottom beneath the fist (approximately x230-340 y665-760). Restore that small area to the seamless surrounding near-black charcoal background. Do not regenerate, redraw, recolor, crop, reposition or change ANY anatomy, highlighted muscle, fist, texture, lighting, or other pixels. Preserve the existing composition, resolution 556 x 768 and aspect ratio. No text, no new symbols. Save the edited image and provide its local file path.

Legs:

Edit this exact supplied legs image only. Remove ONLY the small lime-green outline decorative leg icon at bottom center between the shoes (approximately x235-350 y650-768). Restore only this area to the seamless surrounding near-black charcoal background. Do not regenerate, redraw, recolor, crop, reposition or change ANY anatomy, highlighted muscles, knees, calves, shoes, texture, lighting or any other content. Preserve existing resolution 581 x 768 and aspect ratio. No text or new symbols. Save the edited image and provide its local file path.
