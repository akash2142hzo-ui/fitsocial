import { exerciseCatalog } from "./exerciseCatalog";
import { additionalPickerCategories, categoriesForExercise, categoryForMuscle, equipmentForCategory, equipmentLabel, guidedExercises, pickerCategories } from "./exercisePickerModel";

it("partitions all 423 original records exactly once without changing stable IDs or metadata", () => {
  const entries = pickerCategories.flatMap((category) => guidedExercises(category).filter((entry) => categoryForMuscle[entry.muscle] === category));
  expect(entries).toHaveLength(423);
  expect(new Set(entries.map((entry) => entry.id)).size).toBe(423);
  for (const entry of exerciseCatalog) expect(entries.find((value) => value.id === entry.id)).toBe(entry);
  expect(categoryForMuscle.Biceps).toBe("Biceps");
  expect(categoryForMuscle.Triceps).toBe("Triceps");
  for (const muscle of ["Quads", "Hamstrings", "Glutes", "Calves"] as const) expect(categoryForMuscle[muscle]).toBe("Legs");
});
it.each(pickerCategories)("derives only available equipment for %s", (category) => {
  const expected = new Set(guidedExercises(category).map((entry) => entry.equipment));
  expect(new Set(equipmentForCategory(category))).toEqual(expected);
  for (const equipment of equipmentForCategory(category)) expect(guidedExercises(category, equipment).length).toBeGreaterThan(0);
});
it("combines category, equipment and alias-aware search", () => {
  expect(guidedExercises("Chest", "Dumbbell", "incline DB").map((entry) => entry.id)).toEqual(["incline-dumbbell-bench-press", "incline-dumbbell-fly"]);
  expect(guidedExercises("Biceps", "Dumbbell", "incline").map((entry) => entry.id)).toEqual(["incline-dumbbell-curl"]);
  expect(guidedExercises("Triceps", "Dumbbell", "overhead").every((entry) => entry.muscle === "Triceps")).toBe(true);
  expect(guidedExercises("Chest", "Bodyweight", "barbell")).toEqual([]);
  expect(guidedExercises("Chest", "Pool")).toEqual([]);
  expect(equipmentLabel("All")).toBe("All equipment");
});

it("covers all original IDs with no duplicates inside any category, including nonempty Forearms", () => {
  const entries = pickerCategories.flatMap((category) => {
    const matches = guidedExercises(category);
    expect(matches.length).toBeGreaterThan(0);
    expect(new Set(matches.map((entry) => entry.id)).size).toBe(matches.length);
    for (const entry of matches) expect(exerciseCatalog.find((original) => original.id === entry.id)).toBe(entry);
    return matches;
  });
  expect(new Set(entries.map((entry) => entry.id))).toEqual(new Set(exerciseCatalog.map((entry) => entry.id)));
  for (const id of Object.keys(additionalPickerCategories)) expect(exerciseCatalog.some((entry) => entry.id === id)).toBe(true);
});

it("uses explicit multi-muscle associations without interpreting names as target metadata", () => {
  const hammer = exerciseCatalog.find((entry) => entry.id === "hammer-curl")!;
  expect(categoriesForExercise(hammer)).toEqual(["Biceps", "Forearms"]);
  expect(categoriesForExercise({ ...hammer, name: "Forearm Side Plank", id: "unassociated", muscle: "Core" })).toEqual(["Core"]);
  expect(guidedExercises("Forearms").some((entry) => entry.id === "forearm-side-plank")).toBe(false);
  expect(guidedExercises("Full Body").some((entry) => entry.id === "band-hammer-curl")).toBe(true);
  expect(guidedExercises("Biceps").some((entry) => entry.id === "band-hammer-curl")).toBe(true);
  expect(guidedExercises("Triceps").some((entry) => entry.id === "band-triceps-pushdown")).toBe(true);
});

it("combines Forearms equipment and aliases while retaining timed bodyweight grip activity", () => {
  expect(guidedExercises("Forearms", "Cable", "reverse").map((entry) => entry.id)).toEqual(["cable-reverse-curl"]);
  expect(guidedExercises("Forearms", "Dumbbell", "hammer").map((entry) => entry.id)).toEqual(["hammer-curl", "cross-body-hammer-curl"]);
  expect(guidedExercises("Forearms", "Bodyweight").map((entry) => [entry.id, entry.tracking])).toEqual([["dead-hang", "duration"]]);
  expect(guidedExercises("Forearms", "Pool")).toEqual([]);
});
it("keeps every cardio record and supported metric intact", () => {
  const entries = guidedExercises("Cardio");
  expect(entries.length).toBeGreaterThan(0);
  expect(entries).toEqual(exerciseCatalog.filter((entry) => entry.tracking === "cardio"));
  expect(entries.every((entry) => entry.cardioCategory && entry.muscle === "Cardio")).toBe(true);
});
