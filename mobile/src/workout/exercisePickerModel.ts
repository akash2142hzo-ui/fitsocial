import { Equipment, equipmentCategories, ExerciseDefinition, ExerciseId, MuscleGroup, searchExercises } from "./exerciseCatalog";

export const pickerCategories = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Legs", "Core", "Full Body", "Cardio"] as const;
export type PickerCategory = (typeof pickerCategories)[number];
export type PickerEquipment = Equipment | "All";

// Presentation groups only; catalog records and their original metadata stay unchanged.
export const categoryForMuscle: Readonly<Record<MuscleGroup, PickerCategory>> = {
  Chest: "Chest", Back: "Back", Shoulders: "Shoulders", Biceps: "Biceps", Triceps: "Triceps",
  Quads: "Legs", Hamstrings: "Legs", Glutes: "Legs", Calves: "Legs", Core: "Core",
  "Full body": "Full Body", Cardio: "Cardio",
};
// Explicit supplementary associations, never name matching or changes to primary muscle metadata.
// Neutral/pronated curls train forearm elbow flexors; Dead Hang trains sustained grip.
// Band/suspension entries retain their original Full body group and gain targeted discovery.
export const additionalPickerCategories = {
  "hammer-curl": ["Forearms"],
  "cross-body-hammer-curl": ["Forearms"],
  "zottman-curl": ["Forearms"],
  "cable-hammer-curl": ["Forearms"],
  "cable-reverse-curl": ["Forearms"],
  "barbell-reverse-curl": ["Forearms"],
  "dead-hang": ["Forearms"],
  "band-hammer-curl": ["Biceps", "Forearms"],
  "suspension-trainer-biceps-curl": ["Biceps"],
  "band-triceps-pushdown": ["Triceps"],
  "band-overhead-triceps-extension": ["Triceps"],
  "suspension-trainer-triceps-extension": ["Triceps"],
} as const satisfies Partial<Record<ExerciseId, readonly PickerCategory[]>>;
export function categoriesForExercise(entry: ExerciseDefinition): readonly PickerCategory[] {
  const additional: Partial<Record<string, readonly PickerCategory[]>> = additionalPickerCategories;
  return [categoryForMuscle[entry.muscle], ...(additional[entry.id] ?? [])];
}
export function equipmentForCategory(category: PickerCategory): readonly Equipment[] {
  const available = new Set(guidedExercises(category).map((entry) => entry.equipment));
  return equipmentCategories.filter((equipment) => available.has(equipment));
}
export function guidedExercises(category: PickerCategory, equipment: PickerEquipment = "All", query = "") {
  return searchExercises({ equipment, query }).filter((entry) => categoriesForExercise(entry).includes(category));
}
export function equipmentLabel(equipment: PickerEquipment): string {
  switch (equipment) {
    case "All": return "All equipment";
    case "Dumbbell": return "Dumbbells";
    case "Machine": return "Machines";
    case "Cable": return "Cables";
    case "Resistance band": return "Resistance bands";
    default: return equipment;
  }
}
