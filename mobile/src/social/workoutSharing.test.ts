import { samplePosts } from "./sampleData";
import { createWorkoutAttachment, findShareableWorkout } from "../workout/workoutSharing";
import { Exercise, initialWorkout, WorkoutState, workoutReducer as workoutReduce } from "../workout/workoutState";
import { createInitialSocialState, POST_LIMIT, postCounts, socialReducer as reduce } from "./socialState";

const at = Date.UTC(2026, 10, 14, 12);
function log(state: WorkoutState, exercise: Exercise, reps: string, weight: string) {
  let next = workoutReduce(state, { type: "selectExercise", exercise });
  next = workoutReduce(next, { type: "edit", field: "reps", value: reps });
  next = workoutReduce(next, { type: "edit", field: "weight", value: weight });
  return workoutReduce(next, { type: "addSet", revision: next.revision });
}
function completedSession() {
  let state = workoutReduce(workoutReduce(initialWorkout, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" });
  state = log(state, "Incline Dumbbell Bench Press", "8", "12.5");
  state = log(state, "Incline Dumbbell Bench Press", "10", "15");
  state = log(state, "Push-up", "12", "");
  return workoutReduce(workoutReduce(workoutReduce(state, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "save" });
}
describe("sharing completed local workouts", () => {
  it("finds only completed nonempty history entries", () => {
    const state = completedSession();
    expect(findShareableWorkout([], 1)).toBeUndefined();
    expect(findShareableWorkout(state.history, 99)).toBeUndefined();
    expect(findShareableWorkout([{ id: 2, sets: [] }], 2)).toBeUndefined();
    expect(findShareableWorkout(state.history, 1)).toBe(state.history[0]);
  });
  it("attaches actual names, sets, reps, weights and totals, with independent copies", () => {
    const workout = completedSession().history[0];
    const attachment = createWorkoutAttachment(workout);
    expect(attachment.source).toBe("local-workout");
    expect(attachment.workoutId).toBe(1);
    expect(attachment.totals).toEqual({ exerciseCount: 2, setCount: 3, reps: 30, durationSeconds: 0, repSetCount: 3 });
    expect(attachment.sets).toEqual(workout.sets);
    expect(attachment.sets).not.toBe(workout.sets);
    expect(attachment.sets[0]).not.toBe(workout.sets[0]);
    expect(attachment.sets.map((set) => set.weight)).toEqual([12.5, 15, null]);
    expect(attachment.sets[0].exerciseId).toBe("incline-dumbbell-bench-press");
  });
  it("opens the existing composer without publishing or adding fictional achievements", () => {
    const workout = completedSession().history[0];
    const initial = createInitialSocialState();
    const state = reduce(initial, { type: "shareWorkout", workout });
    expect(state.composer).toMatchObject({ text: "", achievementId: null, workout: createWorkoutAttachment(workout) });
    expect(state.posts).toBe(initial.posts);
    expect(reduce(state, { type: "selectAchievement", achievementId: "sample-session" })).toBe(state);
    expect(reduce(state, { type: "shareWorkout", workout })).toBe(state);
  });
  it.each(["", " My workout today "])("publishes once with optional caption %s", (caption) => {
    const workoutState = completedSession();
    const originalHistory = JSON.stringify(workoutState.history);
    const sharing = reduce(createInitialSocialState(), { type: "shareWorkout", workout: workoutState.history[0] });
    const draft = reduce(sharing, { type: "editPost", text: caption });
    const publish = { type: "publishPost" as const, version: draft.version, at };
    const posted = reduce(draft, publish);
    expect(posted.posts).toHaveLength(samplePosts.length + 1);
    expect(posted.posts[0]).toMatchObject({ text: caption.trim(), origin: "local", achievementId: null, workout: createWorkoutAttachment(workoutState.history[0]) });
    expect(posted.posts[0].workout).not.toBe(draft.composer?.workout);
    expect(reduce(posted, publish)).toBe(posted);
    expect(JSON.stringify(workoutState.history)).toBe(originalHistory);
  });
  it("rejects oversized workout captions and retains the attached workout", () => {
    const sharing = reduce(createInitialSocialState(), { type: "shareWorkout", workout: completedSession().history[0] });
    const draft = reduce(sharing, { type: "editPost", text: "x".repeat(POST_LIMIT + 1) });
    const rejected = reduce(draft, { type: "publishPost", version: draft.version, at });
    expect(rejected.posts).toHaveLength(samplePosts.length);
    expect(rejected.composer?.workout).toEqual(sharing.composer?.workout);
    expect(rejected.composer?.error).toBeTruthy();
  });
  it("cancels sharing only after confirmation and keeps the workout history", () => {
    const workoutState = completedSession();
    const sharing = reduce(createInitialSocialState(), { type: "shareWorkout", workout: workoutState.history[0] });
    const prompted = reduce(sharing, { type: "requestDiscard", target: "composer" });
    expect(reduce(prompted, { type: "cancelDiscard" }).composer).toEqual(sharing.composer);
    const cancelled = reduce(prompted, { type: "confirmDiscard" });
    expect(cancelled.composer).toBeNull();
    expect(cancelled.posts).toHaveLength(samplePosts.length);
    expect(workoutState.history).toHaveLength(1);
    expect(workoutReduce(workoutState, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }).history).toBe(workoutState.history);
  });
  it("does not replace an existing text draft or another workout attachment", () => {
    const workout = completedSession().history[0];
    const text = reduce(reduce(createInitialSocialState(), { type: "openComposer" }), { type: "editPost", text: "Unfinished" });
    const blocked = reduce(text, { type: "shareWorkout", workout });
    expect(blocked.composer).toBe(text.composer);
    expect(blocked.shareNotice).toContain("draft is already open");
    const first = reduce(createInitialSocialState(), { type: "shareWorkout", workout });
    const another = reduce(first, { type: "shareWorkout", workout: { ...workout, id: 2 } });
    expect(another.composer).toBe(first.composer);
  });
  it("keeps like and comment behavior on published workout posts", () => {
    let state = reduce(createInitialSocialState(), { type: "shareWorkout", workout: completedSession().history[0] });
    state = reduce(state, { type: "publishPost", version: state.version, at });
    const postId = state.posts[0].id;
    state = reduce(state, { type: "toggleLike", postId });
    state = reduce(state, { type: "editComment", postId, text: "Nice work!" });
    state = reduce(state, { type: "addComment", postId, version: state.version, at });
    expect(postCounts(state, postId)).toEqual({ likes: 1, comments: 1, liked: true });
    expect(state.posts[0].workout?.totals.setCount).toBe(3);
  });
});
