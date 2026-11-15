import { initialNavigation, navigationReducer, tabs } from "../navigation/navigationState";
import { createInitialSocialState, socialReducer } from "../social/socialState";
import { formatSharePreview } from "../social/feedPresentation";
import { personalProfileStats } from "../social/profileState";
import { createWorkoutAttachment } from "./workoutSharing";
import { ClockSample, elapsedDuration, estimateCalories, finishMetrics, formatCalories, formatDuration,
  calorieStatus, MIN_ESTIMATE_DURATION_MS, RESISTANCE_MET, sampleClock, validateBodyWeight } from "./workoutMetrics";
import { initialWorkout, summarizeHistory, WorkoutState, workoutReducer as reduce } from "./workoutState";
import { todayWorkoutCount } from "./workoutPresentation";

const base = Date.UTC(2026, 10, 14, 12);
const clock = (elapsed = 0): ClockSample => ({ wallMs: base + elapsed, monotonicMs: 1000 + elapsed });
function logged(weight = "70", previous = initialWorkout) {
  let state = reduce(reduce(previous, { type: "start", clock: clock() }), { type: "selectExercise", exercise: "Squat" });
  state = reduce(state, { type: "editBodyWeight", value: weight });
  state = reduce(state, { type: "edit", field: "reps", value: "8" });
  return reduce(state, { type: "addSet", revision: state.revision });
}
function complete(weight = "70", elapsed = 1_800_000, previous?: WorkoutState) {
  const state = logged(weight, previous);
  return reduce(reduce(reduce(state, { type: "requestEnd" }), { type: "finish", clock: clock(elapsed) }), { type: "save" });
}
describe("timestamp-based workout duration", () => {
  it("starts at zero with a copy of the supplied wall and monotonic clocks", () => {
    const start = clock();
    const state = reduce(reduce(initialWorkout, { type: "start", clock: start }), { type: "selectExercise", exercise: "Squat" });
    expect(state.clock).toEqual(start);
    expect(state.clock).not.toBe(start);
    expect(elapsedDuration(state.clock, clock())).toBe(0);
  });
  it("uses timestamp differences after tab switching and a background-sized time gap", () => {
    const workout = logged();
    let route = navigationReducer(initialNavigation, { type: "openPrototype" });
    for (const tab of tabs) route = navigationReducer(route, { type: "selectTab", tab: tab.id });
    expect(route).toMatchObject({ tab: "profile" });
    expect(elapsedDuration(workout.clock, clock(3_721_234))).toBe(3_721_234);
  });
  it("ignores forward and backward wall-clock adjustments when monotonic time exists", () => {
    expect(elapsedDuration(clock(), { ...clock(90_123), wallMs: base - 86_400_000 })).toBe(90_123);
    expect(elapsedDuration(clock(), { ...clock(90_123), wallMs: base + 86_400_000 })).toBe(90_123);
  });
  it("falls back to wall time without a monotonic source and clamps reversed clocks", () => {
    expect(elapsedDuration({ ...clock(), monotonicMs: null }, { ...clock(5000), monotonicMs: null })).toBe(5000);
    expect(elapsedDuration({ ...clock(), monotonicMs: null }, { wallMs: base - 1000, monotonicMs: null })).toBe(0);
    expect(elapsedDuration(clock(), { ...clock(), monotonicMs: 0 })).toBe(0);
  });
  it.each([NaN, Infinity, -1, 8_640_000_000_000_001])("rejects invalid wall timestamps %s", (wallMs) => {
    const invalid = { wallMs, monotonicMs: 0 };
    expect(reduce(reduce(initialWorkout, { type: "start", clock: invalid }), { type: "selectExercise", exercise: "Squat" }).status).toBe("idle");
    expect(elapsedDuration(clock(), invalid)).toBeNull();
    const prompt = reduce(logged(), { type: "requestEnd" });
    const rejected = reduce(prompt, { type: "finish", clock: invalid });
    expect(rejected.status).toBe("active");
    expect(rejected.history).toHaveLength(0);
    expect(rejected.error).toContain("time");
  });
  it.each([NaN, Infinity, -1])("rejects invalid monotonic readings %s", (monotonicMs) => {
    expect(elapsedDuration(clock(), { wallMs: base, monotonicMs })).toBeNull();
  });
  it("freezes exact final duration once and resets timing for a later session", () => {
    const done = complete("70", 90_123.5);
    expect(done.history[0].metrics).toMatchObject({ startedAt: base, finishedAt: base + 90_123.5, durationMs: 90_123.5 });
    expect(reduce(done, { type: "finish", clock: clock(999_999) })).toBe(done);
    const next = reduce(done, { type: "start", clock: clock(500_000) });
    expect(next.history).toBe(done.history);
    expect(next.bodyWeightInput).toBe("");
    expect(elapsedDuration(next.clock, clock(502_000))).toBe(2000);
  });
  it("keeps elapsed time during end confirmation and cancel, and discards without a snapshot", () => {
    const active = logged();
    const prompt = reduce(active, { type: "requestEnd" });
    const cancelled = reduce(prompt, { type: "cancelEnd" });
    expect(cancelled.clock).toEqual(active.clock);
    expect(elapsedDuration(cancelled.clock, clock(75_000))).toBe(75_000);
    const discarded = reduce(prompt, { type: "discard" });
    expect(discarded.history).toHaveLength(0);
    expect(discarded.clock).toBeNull();
  });
  it("retains zero-duration workouts without a positive calorie estimate", () => {
    expect(complete("70", 0).history[0].metrics).toMatchObject({ durationMs: 0, estimatedKcal: null });
    expect(finishMetrics(clock(), clock(), null).durationMs).toBe(0);
  });
  it("samples installed runtime clocks without requiring monotonic availability", () => {
    const reading = sampleClock();
    expect(Number.isFinite(reading.wallMs)).toBe(true);
    expect(reading.monotonicMs === null || Number.isFinite(reading.monotonicMs)).toBe(true);
  });
});
describe("optional body weight and conservative MET estimate", () => {
  it.each([["", null], ["  ", null], ["1", 1], ["70.25", 70.25], [" 80 ", 80], ["500", 500]] as const)("accepts %s", (input, kg) => {
    expect(validateBodyWeight(input)).toEqual({ valid: true, kg });
  });
  it.each(["0", "-5", "0.5", "500.01", "1000", "NaN", "Infinity", "1e2", "70kg", "70,5", "70.123", "+70", ".", ".5"])("rejects body weight %s", (input) => {
    expect(validateBodyWeight(input).valid).toBe(false);
  });
  it("validates weight before starting and blocks invalid estimates on finish", () => {
    const invalid = reduce(initialWorkout, { type: "editBodyWeight", value: "-1" });
    expect(reduce(invalid, { type: "start", clock: clock() }).status).toBe("idle");
    const active = reduce(logged(), { type: "editBodyWeight", value: "NaN" });
    const rejected = reduce(reduce(active, { type: "requestEnd" }), { type: "finish", clock: clock(60_000) });
    expect(rejected.status).toBe("active");
    expect(rejected.history).toHaveLength(0);
    expect(rejected.bodyWeightError).toContain("body weight");
  });
  it("uses the documented session-wide formula without rounding duration or kcal internally", () => {
    expect(RESISTANCE_MET).toBe(3.5);
    expect(estimateCalories(70, 1_800_000)).toBe(122.5);
    expect(estimateCalories(70.25, 1_800_123.5)).toBeCloseTo(3.5 * 70.25 * 1_800_123.5 / 3_600_000, 10);
  });
  it("does not infer intensity or calorie expenditure from repetitions and lifted kilograms", () => {
    const normal = complete("70");
    let heavy = reduce(logged("70"), { type: "edit", field: "reps", value: "100" });
    heavy = reduce(heavy, { type: "edit", field: "weight", value: "100" });
    heavy = reduce(heavy, { type: "addSet", revision: heavy.revision });
    heavy = reduce(reduce(heavy, { type: "requestEnd" }), { type: "finish", clock: clock(1_800_000) });
    expect(heavy.completed?.metrics?.estimatedKcal).toBe(normal.history[0].metrics?.estimatedKcal);
  });
  it.each([null, 0, -1, NaN, Infinity, 59_999])("leaves insufficient duration %s unavailable", (duration) => {
    expect(estimateCalories(70, duration)).toBeNull();
  });
  it.each([null, 0, -1, NaN, Infinity, 501])("never substitutes a default for missing or invalid weight %s", (weight) => {
    expect(estimateCalories(weight, 3_600_000)).toBeNull();
  });
  it("starts estimating at one minute and clearly distinguishes unavailable display states", () => {
    expect(estimateCalories(70, MIN_ESTIMATE_DURATION_MS)).toBeCloseTo(4.08333333);
    expect(calorieStatus(null, 90_000, null)).toBe("Calories unavailable \u2014 add body weight");
    expect(calorieStatus(70, 0, null)).toContain("under 1 minute");
    expect(calorieStatus(70, null, null)).toContain("time unavailable");
    expect(calorieStatus(70, 1_800_000, 122.5)).toBe("Estimated calories: 123 kcal");
    expect(formatCalories(null)).toBe("Unavailable");
    expect(formatCalories(0)).toBe("Unavailable");
    expect(formatCalories(0.5)).toBe("<1 kcal");
  });
  it("preserves body weight and calorie snapshots across later workouts and profile edits", () => {
    const first = complete("70");
    const before = JSON.stringify(first.history);
    const second = complete("100", 3_600_000, first);
    const social = socialReducer(createInitialSocialState(), { type: "editBio", text: "Changed bio" });
    expect(second.history[0].metrics?.estimatedKcal).toBe(350);
    expect(second.history[1].metrics?.estimatedKcal).toBe(122.5);
    expect(JSON.stringify(first.history)).toBe(before);
    const stats = personalProfileStats(social, second.history);
    expect(stats).toMatchObject({ durationMs: 5_400_000, estimatedKcal: 472.5, estimatedWorkoutCount: 2 });
  });
  it("aggregates only available estimates and reports partial coverage", () => {
    const first = complete("");
    const second = complete("70", 1_800_000, first);
    expect(summarizeHistory(second.history)).toEqual({ workoutCount: 2, setCount: 2, reps: 16,
      distinctExercises: 1, exerciseCount: 2, durationSeconds: 0, repSetCount: 2, durationMs: 3_600_000, estimatedKcal: 122.5, estimatedWorkoutCount: 1 });
    expect(summarizeHistory([]).estimatedKcal).toBeNull();
    expect(summarizeHistory(first.history).estimatedKcal).toBeNull();
  });
  it("keeps duration and calorie snapshots consistent through composer, publish and preview", () => {
    const workout = complete().history[0];
    const attachment = createWorkoutAttachment(workout);
    expect(attachment.metrics).toEqual(workout.metrics);
    expect(attachment.metrics).not.toBe(workout.metrics);
    const draft = socialReducer(createInitialSocialState(), { type: "shareWorkout", workout });
    const action = { type: "publishPost" as const, version: draft.version, at: base + 2_000_000 };
    const published = socialReducer(draft, action);
    expect(published.posts[0].workout?.metrics).toEqual(workout.metrics);
    expect(published.posts[0].workout?.metrics).not.toBe(draft.composer?.workout?.metrics);
    expect(socialReducer(published, action)).toBe(published);
    const preview = formatSharePreview(published.posts[0]);
    expect(preview).toContain("Duration 30:00");
    expect(preview).toContain("Estimated calories: 123 kcal");
    expect(preview).toContain("3.5 MET");
  });
});
describe("compact time and history presentation", () => {
  it.each([[0, "00:00"], [999, "00:00"], [61_234, "01:01"], [3_661_999, "01:01:01"], [360_000_000, "100:00:00"],
    [null, "Time unavailable"], [NaN, "Time unavailable"], [-1, "Time unavailable"]] as const)("formats %s", (duration, expected) => {
    expect(formatDuration(duration)).toBe(expected);
  });
  it("counts today's actual completed history without counting untimed fixtures or other days", () => {
    const done = complete();
    expect(todayWorkoutCount(done.history, base)).toBe(1);
    expect(todayWorkoutCount(done.history, base + 86_400_000)).toBe(0);
    expect(todayWorkoutCount([{ id: 1, sets: [] }], base)).toBe(0);
    expect(todayWorkoutCount(done.history, NaN)).toBe(0);
  });
});
