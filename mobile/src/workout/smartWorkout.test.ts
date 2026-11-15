import { exerciseCatalog, searchExercises } from "./exerciseCatalog";
import { initialWorkout, WorkoutState, workoutReducer as reduce, summarizeWorkout, formatLoggedSet, validateDuration } from "./workoutState";
import { createInitialSocialState, socialReducer } from "../social/socialState";
import { formatSharePreview } from "../social/feedPresentation";
import { personalProfileStats } from "../social/profileState";
import { relativeWorkoutTime } from "./workoutPresentation";
import { backIntent, exitIntent } from "../social/navigationSafety";

const clock = { wallMs: 1000, monotonicMs: 0 };
const start = () => reduce(initialWorkout, { type: "start", clock });
function log(name: NonNullable<WorkoutState["exercise"]>, value = "8", kg = "", previous = start()) {
  let state = reduce(previous, { type: "selectExercise", exercise: name });
  state = reduce(state, { type: "edit", field: name === "Plank" ? "durationInput" : "reps", value });
  state = reduce(state, { type: "edit", field: "weight", value: kg });
  return reduce(state, { type: "addSet", revision: state.revision });
}
function finish(state = log("Flat Barbell Bench Press", "8", "20")) {
  return reduce(reduce(state, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 61000, monotonicMs: 60000 } });
}
it("starts empty, refuses accidental sets, and allows safe empty discard", () => {
  const state = start();
  expect(state.exercise).toBeNull();
  expect(state.sets).toEqual([]);
  expect(reduce(state, { type: "addSet", revision: state.revision }).error).toContain("Choose");
  expect(reduce(reduce(state, { type: "requestEnd" }), { type: "discard" })).toEqual(initialWorkout);
});
it("preserves earlier sets when changing exercises and clears unlogged inputs", () => {
  const first = log("Push-up");
  const changed = reduce(first, { type: "selectExercise", exercise: "Plank" });
  expect(changed.sets).toBe(first.sets);
  expect(changed.reps).toBe("");
  expect(changed.durationInput).toBe("");
});
it.each([
  ["Flat Barbell Bench Press", "external", "20", "20 kg"],
  ["Push-up", "bodyweight", "", "No additional weight"],
  ["Push-up", "bodyweight", "0", "0 kg added"],
  ["Weighted Pull-up", "bodyweight", "12.5", "12.5 kg added"],
  ["Assisted Pull-up", "assisted", "", "Assistance not recorded"],
  ["Assisted Pull-up", "assisted", "30", "30 kg assistance"],
] as const)("records %s with %s semantics", (name, tracking, kg, label) => {
  const state = log(name, "8", kg);
  expect(state.sets[0]).toMatchObject({ tracking, reps: 8 });
  expect(formatLoggedSet(state.sets[0])).toContain(label);
});
it.each(["-1", "Infinity", "1e2", "1001", "2.345"])("rejects invalid assistance kg %s", (kg) => {
  expect(log("Assisted Pull-up", "8", kg).sets).toHaveLength(0);
});
it.each(["0", "-1", "1.5", "86401", "Infinity", "", "1e2"])("rejects invalid duration %s", (seconds) => {
  expect(validateDuration(seconds).valid).toBe(false);
  expect(log("Plank", seconds).sets).toHaveLength(0);
});
it("records duration without fake repetitions or weight, and computes mixed totals", () => {
  const mixed = log("Plank", "45", "99", log("Push-up", "10"));
  expect(mixed.sets[1]).toMatchObject({ tracking: "duration", reps: 0, weight: null, durationSeconds: 45 });
  expect(summarizeWorkout(mixed.sets)).toMatchObject({ reps: 10, repSetCount: 1, durationSeconds: 45, setCount: 2 });
  expect(formatLoggedSet(mixed.sets[1])).toBe("45 seconds");
});
it("keeps legacy weight semantics without reinterpreting old bodyweight records", () => {
  expect(formatLoggedSet({ id: 1, exerciseId: "push-up", exercise: "Push-up", reps: 10, weight: 20 })).toBe("10 reps \u00b7 20 kg");
});
it("finishes without saving and explicitly saves exactly once with an independent snapshot", () => {
  const active = log("Push-up", "10", "5");
  const done = finish(active);
  expect(done.history).toHaveLength(0);
  expect(done.completed?.sets).toEqual(active.sets);
  expect(done.completed?.sets).not.toBe(active.sets);
  const saved = reduce(done, { type: "save" });
  expect(saved.history).toEqual([done.completed]);
  expect(reduce(saved, { type: "save" })).toBe(saved);
  expect(personalProfileStats(createInitialSocialState(), saved.history).workoutCount).toBe(1);
});
it("requires confirmation before dropping an unsaved summary and preserves saved history", () => {
  const done = finish();
  expect(reduce(done, { type: "discardCompleted" })).toBe(done);
  const prompt = reduce(done, { type: "start", clock });
  expect(prompt).toMatchObject({ status: "completed", confirming: true, history: [] });
  expect(reduce(prompt, { type: "cancelEnd" }).completed).toBe(done.completed);
  const discarded = reduce(prompt, { type: "discardCompleted" });
  expect(discarded).toMatchObject({ status: "idle", completed: null, history: [] });
  const saved = reduce(done, { type: "save" });
  const next = reduce(saved, { type: "start", clock });
  expect(next.history).toBe(saved.history);
  expect(next.exercise).toBeNull();
});
it("shares unsaved mixed workouts without saving and preserves every tracking field through publish", () => {
  const workout = finish(log("Plank", "30", "", log("Assisted Pull-up", "8", "30")));
  let social = socialReducer(createInitialSocialState(), { type: "shareWorkout", workout: workout.completed! });
  social = socialReducer(social, { type: "publishPost", version: social.version, at: 62000 });
  expect(workout.history).toEqual([]);
  expect(social.posts[0].workout?.sets).toEqual(workout.completed?.sets);
  expect(social.posts[0].workout?.metrics).toEqual(workout.completed?.metrics);
  const preview = formatSharePreview(social.posts[0]);
  expect(preview).toContain("30 kg assistance");
  expect(preview).toContain("30 seconds");
  expect(preview).not.toContain("30 kg added");
});
it("cancels sharing without changing an unsaved summary", () => {
  const done = finish();
  let social = socialReducer(createInitialSocialState(), { type: "shareWorkout", workout: done.completed! });
  social = socialReducer(social, { type: "requestDiscard", target: "composer" });
  social = socialReducer(social, { type: "confirmDiscard" });
  expect(social.composer).toBeNull();
  expect(done.completed).not.toBeNull();
  expect(done.history).toEqual([]);
});
it("supports aliases together with catalog filters and retains original IDs", () => {
  expect(searchExercises({ query: "incline DB", muscle: "Chest", equipment: "Dumbbell" }).some((row) => row.id === "incline-dumbbell-bench-press")).toBe(true);
  expect(searchExercises({ query: "RDL", equipment: "Barbell" }).some((row) => row.id === "romanian-deadlift")).toBe(true);
  expect(exerciseCatalog).toHaveLength(423);
  expect(exerciseCatalog.slice(0, 120).every((row) => row.id && row.tracking && row.aliases.length > 0)).toBe(true);
});
it.each([[1000, 1000, "Just now"], [1000, 121000, "2 min ago"], [1000, 7201000, "2 hours ago"], [1000, 172801000, "2 days ago"], [undefined, 1000, "Time unavailable"]] as const)("formats actual relative history time", (at, now, label) => {
  expect(relativeWorkoutTime(at, now)).toBe(label);
});
it("protects unsaved review through the same Back and exit confirmation decisions", () => {
  const done = finish();
  const context = { socialDraft: false, socialConfirming: false, workoutActive: done.status === "active" || !!(done.completed && !done.saved), workoutConfirming: false };
  expect(backIntent(context)).toBe("confirmWorkout");
  expect(exitIntent(context)).toBe("confirmWorkout");
});
