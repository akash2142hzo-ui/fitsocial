import { cardioMetrics, CardioMetric, formatPace, paceSecondsPerKm, validateCardio } from "./cardio";
import { exerciseCatalog, searchExercises } from "./exerciseCatalog";
import { formatLoggedSet, formatWorkoutTotals, initialWorkout, summarizeWorkout, WorkoutState, workoutReducer as reduce } from "./workoutState";
import { createWorkoutAttachment } from "./workoutSharing";
import { createInitialSocialState, socialReducer } from "../social/socialState";
import { formatSharePreview } from "../social/feedPresentation";
import { sevenDayActivity } from "./activityChart";

const clock = { wallMs: 1000, monotonicMs: 0 };
function choose(name: NonNullable<WorkoutState["exercise"]>, previous?: WorkoutState) {
  const active = previous ?? reduce(initialWorkout, { type: "start", clock });
  return reduce(active, { type: "selectExercise", exercise: name });
}
function cardio(name: NonNullable<WorkoutState["exercise"]>, values: Partial<Record<CardioMetric, string>> = {}, previous?: WorkoutState) {
  let state = reduce(choose(name, previous), { type: "edit", field: "durationInput", value: "1500" });
  for (const key of Object.keys(values) as CardioMetric[]) state = reduce(state, { type: "editCardio", field: key, value: values[key]! });
  return reduce(state, { type: "addSet", revision: state.revision });
}
function strength(name: NonNullable<WorkoutState["exercise"]>, kg: string) {
  let state = reduce(choose(name), { type: "edit", field: "reps", value: "8" });
  state = reduce(state, { type: "edit", field: "weight", value: kg });
  return reduce(state, { type: "addSet", revision: state.revision });
}
it.each(["Flat Barbell Bench Press", "Incline Dumbbell Bench Press", "Smith Machine Squat", "Seated Cable Row"] as const)("requires explicit external weight for %s", (name) => {
  expect(strength(name, "").sets).toEqual([]);
  expect(strength(name, "").error).toContain("weight");
  expect(strength(name, "20").sets).toHaveLength(1);
});
it("allows meaningful recorded zero only for unloaded machines/resistance settings", () => {
  expect(strength("Machine Chest Press", "0").sets[0].weight).toBe(0);
  expect(strength("Flat Barbell Bench Press", "0").sets).toEqual([]);
  expect(strength("Push-up", "").sets[0].weight).toBeNull();
  expect(strength("Push-up", "0").sets[0].weight).toBe(0);
  expect(formatLoggedSet(strength("Assisted Pull-up", "30").sets[0])).toContain("30 kg assistance");
});
it("provides unique cardio IDs, categories, meaningful equipment and searchable aliases", () => {
  const entries = exerciseCatalog.filter((row) => row.tracking === "cardio");
  expect(entries).toHaveLength(28);
  expect(new Set(entries.map((row) => row.id)).size).toBe(28);
  expect(entries.every((row) => row.cardioCategory && row.aliases.length > 0)).toBe(true);
  expect(searchExercises({ query: "assault bike", muscle: "Cardio" }).map((row) => row.name)).toEqual(["Air Bike"]);
  expect(searchExercises({ equipment: "Treadmill", muscle: "Cardio" })).toHaveLength(3);
});
it.each(Object.keys(cardioMetrics) as CardioMetric[])("preserves blank/zero and checks bounds for %s", (key) => {
  expect(validateCardio({ [key]: "" }, [key])).toEqual({ valid: true, values: {} });
  expect(validateCardio({ [key]: "0" }, [key])).toEqual({ valid: true, values: { [key]: 0 } });
  expect(validateCardio({ [key]: String(cardioMetrics[key].max) }, [key]).valid).toBe(true);
  expect(validateCardio({ [key]: String(cardioMetrics[key].max + 1) }, [key]).valid).toBe(false);
});
it.each(["-1", "NaN", "Infinity", "1e2", ".", "1,5", "1.234"])("rejects malformed optional values %s", (value) => {
  expect(validateCardio({ distanceKm: value }, ["distanceKm"]).valid).toBe(false);
});
it("rejects fractional step/floor counts and ignores unsupported fields", () => {
  expect(validateCardio({ steps: "1.5" }, ["steps"]).valid).toBe(false);
  expect(validateCardio({ floors: "2.5" }, ["floors"]).valid).toBe(false);
  expect(cardio("HIIT Cardio", { inclinePercent: "8" }).sets[0].cardio).toEqual({});
});
it("records treadmill speed, incline and distance without reps or lifted weight", () => {
  const entry = cardio("Incline Treadmill Walking", { speedKmh: "4.5", inclinePercent: "8", distanceKm: "1.88" }).sets[0];
  expect(entry).toMatchObject({ tracking: "cardio", reps: 0, weight: null, durationSeconds: 1500, cardio: { speedKmh: 4.5, inclinePercent: 8, distanceKm: 1.88 } });
  expect(formatLoggedSet(entry)).toContain("Incline (%): 8");
  expect(formatLoggedSet(entry)).not.toContain("reps");
  expect(formatLoggedSet(entry)).not.toContain(" kg");
});
it.each(["Outdoor Cycling", "Rowing Machine", "Swimming", "Hiking", "Ski Erg"] as const)("records distance for %s", (name) => {
  expect(cardio(name, { distanceKm: "5.25" }).sets[0].cardio?.distanceKm).toBe(5.25);
});
it("records machine resistance and stair metrics with clear units", () => {
  expect(formatLoggedSet(cardio("Stationary Cycling", { resistance: "10" }).sets[0])).toContain("machine units");
  expect(cardio("Stair Climber", { floors: "12", steps: "300" }).sets[0].cardio).toEqual({ floors: 12, steps: 300 });
});
it.each(["0", "-1", "1.2", "86401", "Infinity", ""])("requires positive whole-second cardio duration %s", (value) => {
  const state = reduce(choose("Outdoor Running"), { type: "edit", field: "durationInput", value });
  expect(reduce(state, { type: "addSet", revision: state.revision }).sets).toEqual([]);
});
it("derives running pace only from positive distance and duration", () => {
  expect(paceSecondsPerKm(1500, 5)).toBe(300);
  expect(formatPace(300)).toBe("5:00 min/km");
  expect(formatLoggedSet(cardio("Outdoor Running", { distanceKm: "5" }).sets[0])).toContain("Pace 5:00 min/km");
  expect(paceSecondsPerKm(1500, 0)).toBeNull();
  expect(paceSecondsPerKm(1500, undefined)).toBeNull();
  expect(paceSecondsPerKm(0, 5)).toBeNull();
  expect(paceSecondsPerKm(NaN, 5)).toBeNull();
  expect(paceSecondsPerKm(60, Infinity)).toBeNull();
});
it("keeps rep totals, activity time and session time separate in mixed workouts", () => {
  const state = cardio("Outdoor Running", { distanceKm: "5" }, strength("Push-up", ""));
  expect(summarizeWorkout(state.sets)).toMatchObject({ reps: 8, repSetCount: 1, durationSeconds: 1500, setCount: 2 });
  expect(formatWorkoutTotals(state.sets)).toContain("1 rep sets");
  expect(formatWorkoutTotals(cardio("Outdoor Running").sets)).not.toContain("reps");
  expect(formatWorkoutTotals(cardio("Outdoor Running").sets)).not.toContain("sets");
});
it("deep-copies cardio values through Finish, Save, composer and Publish", () => {
  let active = cardio("Outdoor Running", { distanceKm: "5" });
  active = reduce(active, { type: "editBodyWeight", value: "70" });
  const done = reduce(reduce(active, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 61000, monotonicMs: 60000 } });
  expect(done.history).toEqual([]);
  expect(done.completed?.sets[0].cardio).not.toBe(active.sets[0].cardio);
  const saved = reduce(done, { type: "save" });
  expect(saved.history[0].metrics?.durationMs).toBe(60000);
  const attachment = createWorkoutAttachment(saved.history[0]);
  expect(attachment.sets[0].cardio).not.toBe(saved.history[0].sets[0].cardio);
  let social = socialReducer(createInitialSocialState(), { type: "shareWorkout", workout: saved.history[0] });
  const draft = social.composer!.workout!;
  social = socialReducer(social, { type: "publishPost", version: social.version, at: 62000 });
  expect(social.posts[0].workout?.sets[0].cardio).toEqual({ distanceKm: 5 });
  expect(social.posts[0].workout?.sets[0].cardio).not.toBe(draft.sets[0].cardio);
  expect(social.posts[0].workout?.metrics).toEqual(saved.history[0].metrics);
  expect(formatSharePreview(social.posts[0])).toContain("Pace 5:00 min/km");
});
it("does not infer intensity or revise historical kcal from cardio optional metrics", () => {
  const finish = (speed: string) => {
    let state = cardio("Treadmill Walking", { speedKmh: speed, inclinePercent: "8" });
    state = reduce(state, { type: "editBodyWeight", value: "70" });
    return reduce(reduce(state, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 61000, monotonicMs: 60000 } }).completed!;
  };
  expect(finish("4").metrics?.estimatedKcal).toBe(finish("12").metrics?.estimatedKcal);
});
describe("seven-day saved activity", () => {
  const now = new Date(2026, 10, 14, 12).getTime();
  const workout = (id: number, finishedAt: number) => ({ id, sets: [], metrics: { startedAt: finishedAt - 60000, finishedAt, durationMs: 60000, bodyWeightKg: null, estimatedKcal: null, met: 3.5 } });
  it("renders seven empty calendar days with no fabricated activity", () => {
    expect(sevenDayActivity([], now)).toHaveLength(7);
    expect(sevenDayActivity([], now).every((day) => day.count === 0)).toBe(true);
  });
  it("aggregates saved workouts by local date and excludes future, old and untimed entries", () => {
    const start = new Date(2026, 10, 8).getTime();
    const history = [workout(1, now), workout(2, now - 1000), workout(3, start), workout(4, start - 1), workout(5, now + 1000), { id: 6, sets: [] }];
    const days = sevenDayActivity(history, now);
    expect(days[0].count).toBe(1);
    expect(days[6]).toMatchObject({ count: 2, durationMs: 120000 });
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(3);
  });
  it("handles invalid clocks", () => { expect(sevenDayActivity([], NaN)).toEqual([]); });
});
