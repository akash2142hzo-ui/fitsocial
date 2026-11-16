# Task 033C - Scalable exercise illustration architecture

Date: 2026-11-15

## Exact files changed in this task

- `src/workout/exerciseIllustrationFamilies.ts` (new): explicit typed movement-family proposals.
- `src/workout/exerciseIllustrations.ts` (new): verified-local-asset schema, validated ID registry, resolver and coverage function.
- `src/workout/ExerciseIllustration.tsx` (new): compact decorative bundled-image renderer and neutral fallback.
- `src/workout/exerciseIllustrations.test.ts` (new): registry, coverage and review/family constraints.
- `src/workout/ExerciseIllustration.test.tsx` (new): rendering and error fallback.
- `src/workout/ExercisePicker.tsx`: import and render ExerciseIllustration by stable exercise.id in the existing Step 3 result row; no other change in this task.
- `src/workout/ExercisePicker.test.tsx`: add one Chest/Machine fallback/selection scenario; earlier assertions unchanged.
- `TASK_033C_COVERAGE.json` (new): complete current family/missing/unclassified coverage export.
- `TASK_033C_VERIFICATION.md` (new): this report.

Git status was inspected before editing. All pre-existing uncommitted changes were preserved. No images were created, generated, downloaded, renamed or edited. No dependencies, catalog records/IDs, workout calculations, reducers, filtering/search, navigation, logging, Step 1/2, other screens or backend were changed. No staging, commits, pushing or deployment.

## Coverage

| Measure | Current result |
| --- | ---: |
| Catalog exercises | 423 |
| Curated proposed families | 39 |
| Exercises assigned to proposals | 48 |
| Exercises awaiting family classification | 375 |
| Verified bundled movement assets | 0 |
| Exercises with verified illustrations | 0 |
| Exercises missing verified artwork | 423 |

This is a conservative first family-planning pass, not a claim that all exercises are classified or that 39 images cover the catalog. The remaining 375 IDs stay explicitly unclassified. All 423 remain usable on the existing neutral textual fallback. TASK_033C_COVERAGE.json lists every missing and unclassified stable ID, each family's movement/equipment/body position/review notes, and its current artwork coverage. It was exported from the actual illustrationCoverage() result. That function recomputes coverage from the current catalog and registry; proposals do not inflate illustrated counts.

The Task 033A asset audit remains applicable: existing anatomy/category, gym and battle-rope assets are not verified illustrations of these movements. No existing asset was silently approved or repurposed. All six Chest/Machine exercises are in separate proposals and still await their own verified artwork.

## Registry and sharing rules

The registry uses the existing ExerciseId union, never display-name inference. Proposed family IDs are a literal union derived from explicit declarations. Each proposal specifies equipment, body position, movement and review caveats. Membership is keyed by actual stable exercise IDs; no substring, primary-muscle, equipment-only or name similarity matching automatically assigns artwork.

VerifiedLocalIllustration accepts only React Native ImageRequireSource (numeric bundled require result), measured positive integer width/height, provenance, an optional typed family ID, and a nonempty tuple of per-exercise approvals. Each approval requires a valid catalog ID, reviewer, real ISO calendar date and visual-review notes. Production verifiedExerciseIllustrationAssets is deliberately empty. Future artwork belongs in that one central configuration using a literal static require() path; no dynamic path or URI is supported.

createExerciseIllustrationRegistry validates the metadata and builds an immutable partial ExerciseId map. It rejects unknown IDs, malformed dimensions/sources/review metadata, missing provenance, duplicate exercise approvals, duplicate registrations of a source, incompatible equipment/family membership, and sharing without a family. A single-exercise asset may cover an unclassified movement without forcing it into a broad family. Shared assets must have a family and a separate explicit approval for every member. An approved flat bench pose never automatically applies to paused bench, even when both are in a proposal. Adding only a family member does not change artwork coverage. Published entries/approvals are copied and frozen; all approvals for a shared source resolve to the same asset entry.

These checks enforce declared metadata and allowlists. They cannot prove that pixels match an exercise or that a numeric source came from require(); a human must inspect the actual local file, verify dimensions/format and provenance, and review each proposed exercise before adding it to the production configuration. Tests use synthetic Metro source IDs only; no test fixture is a real visual approval.

## Step 3 behavior and fallback

The only picker integration is ExerciseIllustration with exerciseId={exercise.id} alongside the existing result text. The original header, three progress segments, Back/Cancel, search, breadcrumbs, pagination, exercise descriptions, whole-card radio interaction, selection callback, card padding/minimum height/gaps, flex wrapping and typography remain unchanged.

Absent, unclassified, unknown and failed-image cases return no extra image element. The consistent neutral fallback is the already-visible exercise name and muscle/equipment labels. No empty 80 dp gutter, false movement diagram or anatomy substitute is inserted. Since current coverage is zero, current Step 3 appearance and card sizing remain unchanged.

When verified artwork is progressively added, the renderer uses a bundled Image with contain, a dark 80 x 42 dp frame (normal 20 + 4 + 18 two-line text height), and nonshrinking width in the existing wrapping row. It cannot stretch/crop artwork or impose more height than the normal two-line text block by itself. Existing responsive row wrapping and larger text can still increase card height as needed, and a narrow screen may wrap a verified thumbnail onto another row; no approved artwork is currently enabled. Images are decorative, hidden from screen readers and ignore pointer events, leaving the existing card as the only interactive selection target. A load error returns to text fallback without affecting selection. A different asset source can subsequently render after a failed source.

## Proposed family inventory

All entries below are proposals requiring artwork and per-member review, not approved shared images. Detailed caveats are in the source and JSON coverage export.

| Family ID | Equipment | Body position | Candidate stable exercise IDs |
| --- | --- | --- | --- |
| `machine-horizontal-chest-press` | Machine | seated | `machine-chest-press` |
| `machine-pec-deck-fly` | Machine | seated | `pec-deck-fly` |
| `machine-incline-chest-press` | Machine | supine-incline | `incline-machine-chest-press` |
| `machine-decline-chest-press` | Machine | supine-decline | `decline-machine-chest-press` |
| `machine-converging-chest-press` | Machine | seated | `converging-machine-chest-press` |
| `machine-single-arm-chest-press` | Machine | seated | `single-arm-machine-chest-press` |
| `barbell-flat-bench-press` | Barbell | supine-flat | `flat-barbell-bench-press`, `paused-barbell-bench-press` |
| `barbell-incline-bench-press` | Barbell | supine-incline | `incline-barbell-bench-press` |
| `barbell-decline-bench-press` | Barbell | supine-decline | `decline-barbell-bench-press` |
| `dumbbell-flat-bench-press` | Dumbbell | supine-flat | `flat-dumbbell-bench-press` |
| `dumbbell-incline-bench-press` | Dumbbell | supine-incline | `incline-dumbbell-bench-press` |
| `dumbbell-flat-fly` | Dumbbell | supine-flat | `dumbbell-chest-fly` |
| `bodyweight-standard-push-up` | Bodyweight | floor-support | `push-up`, `paused-push-up` |
| `cable-seated-row` | Cable | seated | `seated-cable-row`, `neutral-grip-cable-row` |
| `cable-wide-lat-pulldown` | Cable | seated | `wide-grip-lat-pulldown` |
| `barbell-bent-row` | Barbell | standing | `barbell-bent-over-row` |
| `bodyweight-overhand-pull-up` | Bodyweight | hanging | `pull-up` |
| `dumbbell-seated-shoulder-press` | Dumbbell | seated | `seated-dumbbell-shoulder-press` |
| `dumbbell-standing-shoulder-press` | Dumbbell | standing | `standing-dumbbell-shoulder-press` |
| `dumbbell-standing-hammer-curl` | Dumbbell | standing | `hammer-curl` |
| `barbell-standing-curl` | Barbell | standing | `barbell-biceps-curl` |
| `machine-preacher-curl` | Machine | seated | `preacher-curl` |
| `cable-rope-pushdown` | Cable | standing | `rope-triceps-pushdown` |
| `barbell-back-squat` | Barbell | standing | `barbell-back-squat`, `paused-back-squat`, `tempo-back-squat` |
| `bodyweight-squat` | Bodyweight | standing | `bodyweight-squat`, `paused-bodyweight-squat` |
| `machine-seated-leg-curl` | Machine | seated | `seated-leg-curl` |
| `machine-lying-leg-curl` | Machine | prone | `lying-leg-curl` |
| `barbell-romanian-deadlift` | Barbell | standing | `romanian-deadlift` |
| `bodyweight-glute-bridge` | Bodyweight | supine-flat | `glute-bridge` |
| `bodyweight-standing-calf-raise` | Bodyweight | standing | `standing-calf-raise` |
| `bodyweight-forearm-plank` | Bodyweight | floor-support | `plank`, `rkc-plank` |
| `bodyweight-dead-hang` | Bodyweight | hanging | `dead-hang` |
| `kettlebell-bilateral-swing` | Kettlebell | standing | `kettlebell-swing` |
| `outdoor-walking` | Outdoor | standing | `cardio-outdoor-walking`, `cardio-brisk-walking` |
| `outdoor-running` | Outdoor | standing | `cardio-outdoor-running`, `cardio-jogging` |
| `treadmill-walking` | Treadmill | standing | `cardio-treadmill-walking` |
| `treadmill-incline-walking` | Treadmill | standing | `cardio-incline-treadmill-walking` |
| `rowing-erg` | Rowing machine | seated | `cardio-rowing-machine` |
| `ski-erg` | Ski erg | standing | `cardio-ski-erg` |

## Progressive asset intake

1. Inspect a locally supplied image for the intended movement, equipment, grip, limb use, support angle and body position. Confirm full subject visibility, no embedded text and appropriate provenance. Do not assume family membership proves a match.
2. Add the verified file locally. Measure/decode its actual format and dimensions. Add a central verifiedExerciseIllustrationAssets record with static require(), those measured dimensions, provenance and a visual approval for each exact ID.
3. For shared artwork, choose a genuinely compatible proposal (or add a conservative new one) and approve each member separately. If the image differs materially for a variant, use a separate asset/approval; if uncertain, retain fallback.
4. Extend the mapping tests and regenerate coverage from illustrationCoverage(). Re-run type/lint/tests/diff checks and inspect native rendering. No exercise catalog or core picker changes are needed to add assets to existing supported movements.

## Validation

- TypeScript (`npm.cmd run typecheck`): PASS.
- ESLint (`npm.cmd run lint`): PASS, no errors or warnings.
- Focused registry/renderer/picker suites: PASS, 82 tests across 3 suites, 4.862 seconds.
- Full mobile suite (`npm.cmd test -- --watch=false`): PASS, 621 tests across 29 suites, 10.002 seconds (starting baseline 596 / 27).
- Git diff checks (`git diff --check`): PASS. Existing LF/CRLF notices concern earlier changes in SocialIcon.tsx and colors.ts, untouched in this task.

25 new cases were added across the two new suites and the existing picker suite.

Focused tests cover all catalog IDs falling back initially; unknown IDs; exact family membership/equipment and uniqueness; separation of six Chest/Machine movements and position/equipment variants; explicit single-ID mapping; no automatic family-wide image propagation; individually approved sharing; rejection of wrong family/equipment, duplicate approvals/sources, URI/invalid source/dimension/provenance metadata and incomplete/invalid-date reviews; immutable registry copies; specific unclassified exercise support; coverage consistency; contained/decorative rendering; failed-image fallback and different-source recovery. Integration tests verify all six Chest/Machine labels and normal selection with no unsupported image.

No existing tests were disabled, removed or weakened. No new screenshot accuracy claim was made.

## Remaining Android/iOS verification gaps

Native rendering is UNVERIFIED. No emulator/physical-device screenshot was captured. Synthetic image-source renderer tests prove structural behavior only, not real asset decoding, movement accuracy or native measurements. Before the first actual illustration is enabled, verify recognition, contain fitting, full subject visibility in the compact frame, right-side placement/row wrapping on narrow Android/iOS screens, long names at large accessibility text sizes, no unintended card-height growth, whole-card tapping, screen-reader decoration hiding, and failure fallback. The default text-only state remains unchanged. All artwork remains missing, but the typed intake/resolution/rendering path and tested neutral fallback are ready for progressive additions.
