import { equipmentCategories, exerciseCatalog, muscleGroups, searchExercises } from "./exerciseCatalog";
import { Exercise, initialWorkout, workoutReducer as reduce } from "./workoutState";

describe("local exercise catalog", () => {
  it("contains 423 exercises with unique stable IDs and normalized names", () => {
    expect(exerciseCatalog).toHaveLength(423);
    expect(new Set(exerciseCatalog.map((exercise) => exercise.id)).size).toBe(423);
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
    expect(new Set(exerciseCatalog.map((exercise) => normalize(exercise.name))).size).toBe(423);
    for (const exercise of exerciseCatalog) {
      expect(exercise.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(exercise.name.trim()).toBe(exercise.name);
      expect(muscleGroups).toContain(exercise.muscle);
      expect(equipmentCategories).toContain(exercise.equipment);
    }
  });
  it.each([
    ["incline-barbell-bench-press", "Incline Barbell Bench Press"],
    ["incline-dumbbell-bench-press", "Incline Dumbbell Bench Press"],
    ["incline-smith-bench-press", "Incline Smith Machine Bench Press"],
    ["flat-barbell-bench-press", "Flat Barbell Bench Press"],
    ["flat-dumbbell-bench-press", "Flat Dumbbell Bench Press"],
  ])("includes required exercise %s", (id, name) => {
    expect(exerciseCatalog.find((exercise) => exercise.id === id)?.name).toBe(name);
  });
  it("covers every listed primary muscle and equipment category", () => {
    expect(new Set(exerciseCatalog.map((exercise) => exercise.muscle)).size).toBe(muscleGroups.length);
    expect(new Set(exerciseCatalog.map((exercise) => exercise.equipment)).size).toBe(equipmentCategories.length);
  });
  it("matches multiple case-insensitive words regardless of spacing or order", () => {
    expect(searchExercises({ query: "  DUMBBELL   incline " }).map((exercise) => exercise.name))
      .toEqual(expect.arrayContaining(["Incline Dumbbell Bench Press", "Incline Dumbbell Curl"]));
    expect(searchExercises({ query: "push-up" }).some((exercise) => exercise.id === "push-up")).toBe(true);
    expect(searchExercises({ query: "  " })).toHaveLength(423);
  });
  it("combines name, muscle and equipment filters", () => {
    expect(searchExercises({ query: "incline", muscle: "Chest", equipment: "Smith machine" }).map((exercise) => exercise.id))
      .toEqual(["incline-smith-bench-press"]);
    const rows = searchExercises({ muscle: "Back", equipment: "Cable" });
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.every((exercise) => exercise.muscle === "Back" && exercise.equipment === "Cable")).toBe(true);
    expect(searchExercises({ muscle: "Hamstrings", equipment: "Medicine ball" })).toEqual([]);
    expect(searchExercises({ query: "no-such-exercise" })).toEqual([]);
  });
  it("selects catalog exercises and logs stable IDs without changing numeric validation", () => {
    let state = reduce(reduce(initialWorkout, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" });
    state = reduce(state, { type: "selectExercise", exercise: "Incline Dumbbell Bench Press" });
    state = reduce(state, { type: "edit", field: "reps", value: "8" });
    state = reduce(state, { type: "edit", field: "weight", value: "12.5" });
    state = reduce(state, { type: "addSet", revision: state.revision });
    expect(state.sets[0]).toMatchObject({ exerciseId: "incline-dumbbell-bench-press", exercise: "Incline Dumbbell Bench Press", reps: 8, weight: 12.5 });
    const invalid = reduce(state, { type: "selectExercise", exercise: "Unknown" as Exercise });
    expect(invalid).toBe(state);
    const next = reduce(state, { type: "selectExercise", exercise: "Barbell Back Squat" });
    expect(next.sets).toEqual(state.sets);
    expect(next.reps).toBe("");
    expect(next.history).toBe(state.history);
  });
});
