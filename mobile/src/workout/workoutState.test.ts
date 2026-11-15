import {
  Exercise, initialWorkout, MAX_SETS_PER_EXERCISE, summarizeWorkout,
  validateSet, WorkoutState, workoutReducer as reduce,
} from "./workoutState";

const start = () => reduce(reduce(initialWorkout, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" });
function add(state: WorkoutState, reps = "8", weight = (state.exercise === "Overhead press" || state.exercise === "Row") ? "20" : "") {
  const draft = reduce(reduce(state, { type: "edit", field: "reps", value: reps }),
    { type: "edit", field: "weight", value: weight });
  return reduce(draft, { type: "addSet", revision: draft.revision });
}

describe("set input validation", () => {
  it.each([
    ["1", "", 1, null], ["1000", "1000", 1000, 1000],
    ["8", "0", 8, 0], ["12", "12.25", 12, 12.25],
    [" 8 ", " 2.5 ", 8, 2.5], ["8", "   ", 8, null],
    ["8", ".5", 8, 0.5], ["8", "5.", 8, 5],
  ])("accepts reps %s and kg %s", (reps, weight, expectedReps, expectedWeight) => {
    expect(validateSet(String(reps), String(weight)))
      .toEqual({ valid: true, reps: expectedReps, weight: expectedWeight });
  });
  it.each(["", " ", "0", "-1", "1.5", "1e2", "NaN", "Infinity", "1001", "1,000", "+2", "8 reps"])
    ("rejects invalid repetitions %s", (reps) => {
      expect(validateSet(reps, "").valid).toBe(false);
    });
  it.each(["-1", "NaN", "Infinity", "1e309", "1000.01", "1001", "2.345", "1,5", ".", "+2", "5 kg"])
    ("rejects invalid weight %s", (weight) => {
      expect(validateSet("8", weight).valid).toBe(false);
    });
});

describe("in-memory workout lifecycle", () => {
  it("starts blank and cannot restart an active workout", () => {
    const state = add(start());
    expect(start().sets).toEqual([]);
    expect(reduce(reduce(state, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" })).toBe(state);
  });
  it("adds multiple sets and distinct exercises with stable IDs", () => {
    let state = add(add(start(), "8", "20"), "10", "0");
    state = add(reduce(state, { type: "selectExercise", exercise: "Row" }), "12", "15");
    expect(state.sets.map((set) => set.id)).toEqual([1, 2, 3]);
    expect(state.sets.map((set) => set.exercise)).toEqual(["Squat", "Squat", "Row"]);
    expect(state.reps).toBe("");
    expect(state.weight).toBe("");
  });
  it("preserves draft on reselect and clears only unlogged inputs on exercise change", () => {
    const state = reduce(add(start()), { type: "edit", field: "reps", value: "9" });
    expect(reduce(state, { type: "selectExercise", exercise: "Squat" })).toBe(state);
    const switched = reduce(state, { type: "selectExercise", exercise: "Row" });
    expect(switched.reps).toBe("");
    expect(switched.sets).toEqual(state.sets);
  });
  it("rejects a rapid duplicate submission of the same draft", () => {
    const draft = reduce(start(), { type: "edit", field: "reps", value: "8" });
    const action = { type: "addSet" as const, revision: draft.revision };
    const logged = reduce(draft, action);
    expect(reduce(logged, action)).toBe(logged);
    expect(logged.sets).toHaveLength(1);
  });
  it("does not append invalid inputs and exposes an actionable error", () => {
    const state = add(start(), "0", "NaN");
    expect(state.sets).toEqual([]);
    expect(state.error).toContain("repetitions");
  });
  it("removes exactly the selected set and recalculates summaries", () => {
    const state = add(add(start(), "8", "20"), "12");
    const removed = reduce(state, { type: "removeSet", id: 1 });
    expect(removed.sets).toEqual([state.sets[1]]);
    expect(summarizeWorkout(removed.sets)).toMatchObject({ setCount: 1, reps: 12, exerciseCount: 1 });
    expect(reduce(removed, { type: "removeSet", id: 2 }).sets).toEqual([]);
    expect(state.sets).toHaveLength(2);
  });
  it("summarizes counts without confusing optional weight with zero", () => {
    const state = add(reduce(add(add(start(), "8", "20"), "10", "0"),
      { type: "selectExercise", exercise: "Push-up" }), "12");
    const summary = summarizeWorkout(state.sets);
    expect(summary).toMatchObject({ setCount: 3, reps: 30, exerciseCount: 2 });
    expect(summary.groups.map((group) => group.reps)).toEqual([18, 12]);
    expect(summary.groups[0].sets[1].weight).toBe(0);
    expect(summary.groups[1].sets[0].weight).toBeNull();
    expect(summarizeWorkout([])).toMatchObject({ groups: [], reps: 0, setCount: 0, exerciseCount: 0 });
  });
  it("requires confirmation for discard, and cancel keeps sets and draft", () => {
    const state = reduce(add(start()), { type: "edit", field: "reps", value: "9" });
    expect(reduce(state, { type: "discard" })).toBe(state);
    const prompt = reduce(state, { type: "requestEnd" });
    expect(prompt.confirming).toBe(true);
    expect(reduce(prompt, { type: "cancelEnd" })).toEqual(state);
    expect(reduce(prompt, { type: "discard" })).toEqual(initialWorkout);
  });
  it("cannot finish without confirmation or without logged sets", () => {
    const state = add(start());
    expect(reduce(state, { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } })).toBe(state);
    const emptyPrompt = reduce(start(), { type: "requestEnd" });
    expect(reduce(emptyPrompt, { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } })).toBe(emptyPrompt);
  });
  it("finishes with a retained summary, drops draft and rejects further edits", () => {
    const state = reduce(add(start()), { type: "edit", field: "reps", value: "9" });
    const completed = reduce(reduce(state, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } });
    expect(completed.status).toBe("completed");
    expect(completed.sets).toEqual(state.sets);
    expect(completed.reps).toBe("");
    expect(reduce(completed, { type: "removeSet", id: 1 })).toBe(completed);
    expect(reduce(completed, { type: "edit", field: "reps", value: "99" })).toBe(completed);
    expect(reduce(reduce(completed, { type: "save" }), { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } })).toEqual({
      ...initialWorkout, status: "active", clock: completed.clock, history: [completed.completed], nextWorkoutId: completed.nextWorkoutId,
    });
  });
  it("blocks set changes while the end confirmation is visible", () => {
    const prompt = reduce(add(start()), { type: "requestEnd" });
    expect(reduce(prompt, { type: "removeSet", id: 1 })).toBe(prompt);
    expect(reduce(prompt, { type: "edit", field: "reps", value: "7" })).toBe(prompt);
    expect(reduce(prompt, { type: "addSet", revision: prompt.revision })).toBe(prompt);
  });
  it("enforces per-exercise and total session limits", () => {
    let state = start();
    for (const exercise of ["Squat", "Push-up", "Row", "Lunge", "Overhead press"] as Exercise[]) {
      state = reduce(state, { type: "selectExercise", exercise });
      for (let i = 0; i < MAX_SETS_PER_EXERCISE; i++) state = add(state);
      const rejected = add(state);
      expect(rejected.sets).toHaveLength(state.sets.length);
      expect(rejected.error).toContain("Limit reached");
    }
    expect(state.sets).toHaveLength(100);
  });
});
