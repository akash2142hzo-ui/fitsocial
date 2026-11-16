import { ImageRequireSource } from "react-native";
import { exerciseCatalog, ExerciseId } from "./exerciseCatalog";
import { IllustrationFamilyId, proposedIllustrationFamilies } from "./exerciseIllustrationFamilies";

export type IllustrationApproval = Readonly<{
  exerciseId: ExerciseId;
  reviewedBy: string;
  reviewedOn: string; // YYYY-MM-DD
  visualNotes: string; // Equipment, body position and movement checked for this ID.
}>;
export type VerifiedLocalIllustration = Readonly<{
  source: ImageRequireSource; // Bundled static require() only; never a URI object.
  width: number;
  height: number;
  provenance: string;
  familyId?: IllustrationFamilyId;
  approvals: readonly [IllustrationApproval, ...IllustrationApproval[]];
}>;
export type ExerciseIllustrationRegistry = Readonly<Partial<Record<ExerciseId, Readonly<{
  assetKey: string;
  asset: VerifiedLocalIllustration;
}>>>>;

const catalogById = new Map(exerciseCatalog.map((entry) => [entry.id, entry]));
const familiesById = new Map(proposedIllustrationFamilies.map((entry) => [entry.id, entry]));
const familyByExercise = new Map<string, IllustrationFamilyId>(proposedIllustrationFamilies.flatMap((entry) =>
  entry.exerciseIds.map((id) => [id, entry.id] as const)));
export function proposedFamilyForExercise(id: string): IllustrationFamilyId | null {
  return familyByExercise.get(id) ?? null;
}

// Validation checks metadata/allowlists, not the accuracy of pixels. A human must
// inspect the actual file separately for EVERY approval. Family membership is never enough.
export function createExerciseIllustrationRegistry(assets: Readonly<Record<string, VerifiedLocalIllustration>>): ExerciseIllustrationRegistry {
  const registry: Partial<Record<ExerciseId, { assetKey: string; asset: VerifiedLocalIllustration }>> = {};
  const sources = new Set<number>();
  for (const [assetKey, original] of Object.entries(assets)) {
    if (!assetKey.trim() || typeof original.source !== "number" || !Number.isInteger(original.source) || original.source <= 0
      || !Number.isInteger(original.width) || original.width <= 0 || !Number.isInteger(original.height) || original.height <= 0
      || !original.provenance.trim() || !original.approvals.length) throw new Error(`Invalid local illustration: ${assetKey}`);
    if (sources.has(original.source)) throw new Error(`Register a shared source once: ${assetKey}`);
    sources.add(original.source);
    const family = original.familyId ? familiesById.get(original.familyId) : undefined;
    if ((original.familyId && !family) || (original.approvals.length > 1 && !family)) throw new Error(`Sharing requires an explicit family: ${assetKey}`);
    const approvals = original.approvals.map((approval) => {
      const exercise = catalogById.get(approval.exerciseId);
      const date = new Date(`${approval.reviewedOn}T00:00:00Z`);
      if (!exercise || !approval.reviewedBy.trim() || !approval.visualNotes.trim()
        || !/^\d{4}-\d{2}-\d{2}$/.test(approval.reviewedOn) || !Number.isFinite(date.getTime())
        || date.toISOString().slice(0, 10) !== approval.reviewedOn) throw new Error(`Invalid exercise approval: ${assetKey}`);
      if (family && (familyByExercise.get(approval.exerciseId) !== family.id || exercise.equipment !== family.equipment)) {
        throw new Error(`Exercise is outside the proposed equipment/movement family: ${approval.exerciseId}`);
      }
      return Object.freeze({ ...approval });
    });
    const asset = Object.freeze({ ...original, approvals: Object.freeze(approvals) }) as VerifiedLocalIllustration;
    const resolved = Object.freeze({ assetKey, asset });
    for (const approval of approvals) {
      if (registry[approval.exerciseId]) throw new Error(`Duplicate exercise approval: ${approval.exerciseId}`);
      registry[approval.exerciseId] = resolved;
    }
  }
  return Object.freeze(registry);
}

// No verified movement artwork is bundled yet (Task 033A audit). Add static
// require() sources here, measured dimensions, provenance and per-ID visual reviews.
// A family proposal alone must never resolve to an image or a category anatomy asset.
export const verifiedExerciseIllustrationAssets: Readonly<Record<string, VerifiedLocalIllustration>> = {};
export const exerciseIllustrationRegistry = createExerciseIllustrationRegistry(verifiedExerciseIllustrationAssets);
export function illustrationForExercise(id: string, registry: ExerciseIllustrationRegistry = exerciseIllustrationRegistry) {
  return catalogById.has(id) && Object.prototype.hasOwnProperty.call(registry, id)
    ? registry[id as ExerciseId] ?? null : null;
}

export function illustrationCoverage(registry: ExerciseIllustrationRegistry = exerciseIllustrationRegistry) {
  const missingExerciseIds = exerciseCatalog.filter((entry) => !illustrationForExercise(entry.id, registry)).map((entry) => entry.id);
  const unclassifiedExerciseIds = exerciseCatalog.filter((entry) => !familyByExercise.has(entry.id)).map((entry) => entry.id);
  return {
    totalExercises: exerciseCatalog.length,
    illustratedExercises: exerciseCatalog.length - missingExerciseIds.length,
    missingExerciseIds,
    unclassifiedExerciseIds,
    families: proposedIllustrationFamilies.map((family) => ({
      ...family,
      illustratedExerciseIds: family.exerciseIds.filter((id) => illustrationForExercise(id, registry)),
      missingExerciseIds: family.exerciseIds.filter((id) => !illustrationForExercise(id, registry)),
    })),
  };
}
