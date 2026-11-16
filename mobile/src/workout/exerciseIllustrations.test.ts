import { exerciseCatalog, ExerciseId } from "./exerciseCatalog";
import { proposedIllustrationFamilies } from "./exerciseIllustrationFamilies";
import { createExerciseIllustrationRegistry, illustrationCoverage, illustrationForExercise, proposedFamilyForExercise, VerifiedLocalIllustration } from "./exerciseIllustrations";

// Synthetic Metro IDs only. No real image is being approved by these fixtures.
const approval = (exerciseId: ExerciseId) => ({ exerciseId, reviewedBy: "Test fixture", reviewedOn: "2026-11-15", visualNotes: "Synthetic metadata, not visual certification" });
const asset = (overrides: Partial<VerifiedLocalIllustration> = {}): VerifiedLocalIllustration => ({
  source: 101, width: 320, height: 168, provenance: "Synthetic test fixture only",
  familyId: "barbell-flat-bench-press", approvals: [approval("flat-barbell-bench-press")], ...overrides,
});

it("keeps every existing exercise on neutral fallback until artwork is explicitly approved", () => {
  const coverage = illustrationCoverage();
  expect(coverage.totalExercises).toBe(423); expect(coverage.illustratedExercises).toBe(0);
  expect(coverage.missingExerciseIds).toEqual(exerciseCatalog.map((entry) => entry.id));
  for (const entry of exerciseCatalog) expect(illustrationForExercise(entry.id)).toBeNull();
  for (const id of ["unknown", "Machine Chest Press", "Chest", "__proto__", "toString"]) expect(illustrationForExercise(id)).toBeNull();
});

it("keeps proposed families explicit, unique and consistent with catalog equipment", () => {
  const ids: string[] = [];
  expect(new Set(proposedIllustrationFamilies.map((family) => family.id)).size).toBe(proposedIllustrationFamilies.length);
  for (const family of proposedIllustrationFamilies) {
    expect(family.movement.trim()).not.toBe(""); expect(family.bodyPosition).toBeTruthy(); expect(family.reviewNotes.trim()).not.toBe("");
    for (const id of family.exerciseIds) {
      expect(exerciseCatalog.find((entry) => entry.id === id)?.equipment).toBe(family.equipment);
      expect(proposedFamilyForExercise(id)).toBe(family.id); ids.push(id);
    }
  }
  expect(new Set(ids).size).toBe(ids.length);
  expect(illustrationCoverage().unclassifiedExerciseIds).toEqual(exerciseCatalog.filter((entry) => !ids.includes(entry.id)).map((entry) => entry.id));
  expect(proposedFamilyForExercise("not-in-catalog")).toBeNull();
});

it("separates all six Chest/Machine movements and incompatible position/equipment variants", () => {
  const ids = ["machine-chest-press", "pec-deck-fly", "incline-machine-chest-press", "decline-machine-chest-press", "converging-machine-chest-press", "single-arm-machine-chest-press"];
  expect(new Set(ids.map(proposedFamilyForExercise)).size).toBe(6);
  for (const id of ids) expect(proposedFamilyForExercise(id)).not.toBeNull();
  expect(proposedFamilyForExercise("flat-barbell-bench-press")).not.toBe(proposedFamilyForExercise("flat-dumbbell-bench-press"));
  expect(proposedFamilyForExercise("seated-leg-curl")).not.toBe(proposedFamilyForExercise("lying-leg-curl"));
  expect(proposedFamilyForExercise("cardio-treadmill-walking")).not.toBe(proposedFamilyForExercise("cardio-incline-treadmill-walking"));
});

it("maps only explicit approved stable IDs, never all members of a proposed family", () => {
  const registry = createExerciseIllustrationRegistry({ bench: asset() });
  expect(illustrationForExercise("flat-barbell-bench-press", registry)?.assetKey).toBe("bench");
  expect(illustrationForExercise("paused-barbell-bench-press", registry)).toBeNull();
  expect(illustrationForExercise("incline-barbell-bench-press", registry)).toBeNull();
  expect(illustrationForExercise("pec-deck-fly", registry)).toBeNull();
  expect(illustrationCoverage(registry).illustratedExercises).toBe(1);
  expect(illustrationCoverage(registry).families.find((family) => family.id === "barbell-flat-bench-press")?.missingExerciseIds).toEqual(["paused-barbell-bench-press"]);
});

it("permits sharing only with per-exercise approval inside an explicit compatible family", () => {
  const registry = createExerciseIllustrationRegistry({ bench: asset({ approvals: [approval("flat-barbell-bench-press"), approval("paused-barbell-bench-press")] }) });
  expect(illustrationForExercise("flat-barbell-bench-press", registry)).toBe(illustrationForExercise("paused-barbell-bench-press", registry));
  expect(illustrationCoverage(registry).illustratedExercises).toBe(2);
  expect(() => createExerciseIllustrationRegistry({ bench: asset({ familyId: undefined, approvals: [approval("flat-barbell-bench-press"), approval("paused-barbell-bench-press")] }) })).toThrow("Sharing requires");
  for (const id of ["incline-barbell-bench-press", "flat-dumbbell-bench-press", "pec-deck-fly"] as const) {
    expect(() => createExerciseIllustrationRegistry({ bench: asset({ approvals: [approval(id)] }) })).toThrow("outside the proposed");
  }
});

it("supports a specific unclassified exercise without silently assigning a family", () => {
  const registry = createExerciseIllustrationRegistry({ specific: asset({ familyId: undefined, approvals: [approval("arnold-press")] }) });
  expect(illustrationForExercise("arnold-press", registry)?.assetKey).toBe("specific");
  expect(proposedFamilyForExercise("arnold-press")).toBeNull();
  expect(illustrationForExercise("seated-dumbbell-shoulder-press", registry)).toBeNull();
});

it("rejects duplicate approvals, sources and invalid stable IDs", () => {
  expect(() => createExerciseIllustrationRegistry({ a: asset(), b: asset({ source: 102 }) })).toThrow("Duplicate exercise");
  expect(() => createExerciseIllustrationRegistry({ a: asset(), b: asset({ familyId: undefined, approvals: [approval("pec-deck-fly")] }) })).toThrow("Register a shared source once");
  expect(() => createExerciseIllustrationRegistry({ a: asset({ approvals: [approval("flat-barbell-bench-press"), approval("flat-barbell-bench-press")] }) })).toThrow("Duplicate exercise");
  expect(() => createExerciseIllustrationRegistry({ a: asset({ familyId: undefined, approvals: [approval("unknown" as ExerciseId)] }) })).toThrow("Invalid exercise approval");
});

it.each([
  { source: { uri: "https://example.invalid/exercise.png" } }, { source: 0 }, { source: NaN },
  { width: 0 }, { width: Infinity }, { height: -1 }, { height: 1.5 }, { provenance: " " }, { approvals: [] },
])("rejects remote/invalid source, dimension or provenance metadata: %j", (invalid) => {
  expect(() => createExerciseIllustrationRegistry({ a: asset(invalid as Partial<VerifiedLocalIllustration>) })).toThrow("Invalid local illustration");
});

it.each([
  { reviewedBy: "" }, { visualNotes: "" }, { reviewedOn: "invalid" }, { reviewedOn: "2026-02-30" },
])("requires a complete per-exercise visual-review record: %j", (invalid) => {
  expect(() => createExerciseIllustrationRegistry({ a: asset({ approvals: [{ ...approval("flat-barbell-bench-press"), ...invalid }] }) })).toThrow("Invalid exercise approval");
});

it("copies and freezes published registry entries so drafts cannot alter approved mappings", () => {
  const draft = asset(); const registry = createExerciseIllustrationRegistry({ bench: draft });
  expect(Object.isFrozen(registry)).toBe(true);
  const resolved = illustrationForExercise("flat-barbell-bench-press", registry)!;
  expect(resolved.asset).not.toBe(draft); expect(Object.isFrozen(resolved.asset)).toBe(true);
  expect(Object.isFrozen(resolved.asset.approvals[0])).toBe(true);
});
