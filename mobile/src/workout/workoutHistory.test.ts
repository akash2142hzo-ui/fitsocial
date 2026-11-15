import { initialNavigation, navigationReducer, tabs } from "../navigation/navigationState";
import { createInitialSocialState, socialReducer } from "../social/socialState";
import {
  Exercise, initialWorkout, summarizeHistory, summarizeWorkout, WorkoutState,
  workoutReducer as reduce,
} from "./workoutState";

function add(state: WorkoutState, exercise: Exercise, reps: string, weight = "") {
  let draft = reduce(state, { type: "selectExercise", exercise });
  draft = reduce(draft, { type: "edit", field: "reps", value: reps });
  draft = reduce(draft, { type: "edit", field: "weight", value: weight });
  return reduce(draft, { type: "addSet", revision: draft.revision });
}
const start = (state = initialWorkout) => reduce(reduce(state, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" });
const finish = (state: WorkoutState) => reduce(reduce(reduce(state, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "save" });
const discard = (state: WorkoutState) => reduce(reduce(state, { type: "requestEnd" }), { type: "discard" });

describe("temporary completed workout history", () => {
  it("starts empty with zero totals and excludes unfinished sessions", () => {
    const state = add(start(), "Squat", "8", "20");
    expect(state.history).toEqual([]);
    expect(summarizeHistory(state.history)).toMatchObject({ workoutCount: 0, setCount: 0, reps: 0, distinctExercises: 0 });
  });

  it("records exactly one snapshot on confirmed finish, including weights", () => {
    const active = add(add(start(), "Squat", "8", "20.25"), "Push-up", "10");
    expect(reduce(active, { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } })).toBe(active);
    const completed = finish(active);
    expect(completed.history).toEqual([{ id: 1, sets: active.sets, metrics: { startedAt: 1000, finishedAt: 1000, durationMs: 0, bodyWeightKg: null, estimatedKcal: null, met: 3.5 } }]);
    expect(completed.history[0].sets[0].weight).toBe(20.25);
    expect(completed.history[0].sets[1].weight).toBeNull();
    expect(reduce(completed, { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } })).toBe(completed);
    expect(finish(completed)).toBe(completed);
    expect(completed.history).toHaveLength(1);
  });

  it("copies set records so current session objects are not history records", () => {
    const active = add(start(), "Squat", "8");
    const completed = finish(active);
    expect(completed.history[0].sets).not.toBe(active.sets);
    expect(completed.history[0].sets[0]).not.toBe(active.sets[0]);
    expect(active.history).toEqual([]);
  });

  it("does not record empty, discarded, or cancelled sessions", () => {
    expect(finish(start()).history).toEqual([]);
    const active = add(start(), "Squat", "8");
    expect(discard(active).history).toEqual([]);
    const cancelled = reduce(reduce(active, { type: "requestEnd" }), { type: "cancelEnd" });
    expect(cancelled.history).toEqual([]);
    expect(cancelled.sets).toEqual(active.sets);
  });

  it("starting a new session keeps completed history and resets only session fields", () => {
    const completed = finish(add(start(), "Squat", "8", "0"));
    const next = start(completed);
    expect(next.status).toBe("active");
    expect(next.sets).toEqual([]);
    expect(next.history).toBe(completed.history);
    expect(next.nextWorkoutId).toBe(2);
    expect(next.history[0].sets[0].weight).toBe(0);
  });

  it("multiple completions have unique IDs, newest first, with accurate totals", () => {
    let state = add(add(add(start(), "Squat", "8", "20"), "Squat", "10", "0"), "Row", "12", "15");
    state = finish(state);
    state = finish(add(add(start(state), "Push-up", "5"), "Squat", "6", "10"));
    expect(state.history.map((entry) => entry.id)).toEqual([2, 1]);
    expect(summarizeHistory(state.history)).toMatchObject({ workoutCount: 2, setCount: 5, reps: 41, distinctExercises: 3 });
    expect(summarizeWorkout(state.history[0].sets)).toMatchObject({ setCount: 2, reps: 11, exerciseCount: 2 });
    expect(summarizeWorkout(state.history[1].sets)).toMatchObject({ setCount: 3, reps: 30, exerciseCount: 2 });
  });

  it("discarding a later workout preserves history without consuming a completion ID", () => {
    const completed = finish(add(start(), "Squat", "8"));
    const discarded = discard(add(start(completed), "Row", "10", "20"));
    expect(discarded.status).toBe("idle");
    expect(discarded.history).toBe(completed.history);
    expect(discarded.nextWorkoutId).toBe(2);
    expect(finish(add(start(discarded), "Lunge", "6")).history.map((entry) => entry.id)).toEqual([2, 1]);
  });

  it("counts only retained sets and ignores draft input when finishing", () => {
    let state = add(add(start(), "Squat", "8"), "Row", "10", "20");
    state = reduce(state, { type: "removeSet", id: 1 });
    state = reduce(state, { type: "edit", field: "reps", value: "999" });
    const completed = finish(state);
    expect(summarizeHistory(completed.history)).toMatchObject({ workoutCount: 1, setCount: 1, reps: 10, distinctExercises: 1 });
    expect(completed.history[0].sets[0].exercise).toBe("Row");
  });

  it("retains root-level history across all tabs and independent social actions", () => {
    const workout = finish(add(start(), "Squat", "8"));
    let root = { workout, navigation: navigationReducer(initialNavigation, { type: "openPrototype" }), social: createInitialSocialState() };
    for (const tab of tabs) {
      root = { ...root, navigation: navigationReducer(root.navigation, { type: "selectTab", tab: tab.id }) };
      expect(root.workout.history).toBe(workout.history);
    }
    root = { ...root, navigation: navigationReducer(root.navigation, { type: "selectTab", tab: "progress" }) };
    root = { ...root, social: socialReducer(root.social, { type: "setMembership", groupId: "morning", joined: true }) };
    expect(root.navigation).toMatchObject({ screen: "prototype", tab: "progress" });
    expect(summarizeHistory(root.workout.history).workoutCount).toBe(1);
    expect(root.social.joinedGroupIds).toEqual(["morning"]);
  });
});
