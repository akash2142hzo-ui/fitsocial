import { CompletedWorkout, initialWorkout, LoggedSet, workoutReducer } from "../workout/workoutState";
import { LOCAL_AUTHOR_ID, samplePosts } from "./sampleData";
import { identityFor } from "./trainerIdentity";
import { createInitialSocialState, hasSocialDraft, MAX_LOCAL_POSTS, POST_LIMIT, publishedWorkoutPost,
  SocialState, socialReducer as reduce, workoutDraft } from "./socialState";

const at = Date.UTC(2026, 10, 14, 12);
function workout(id = 1): CompletedWorkout {
  return { id, sets: [{ id: 1, exerciseId: "push-up", exercise: "Push-up", tracking: "bodyweight", reps: 8, weight: null }] };
}
function share(id = 1, state = createInitialSocialState()) {
  return reduce(state, { type: "shareWorkout", workout: workout(id) });
}
function publish(state: SocialState) {
  return reduce(state, { type: "publishPost", version: state.version, at });
}
function textDraft(state = createInitialSocialState(), text = "A text draft") {
  return reduce(reduce(state, { type: "newTextDraft" }), { type: "editPost", text });
}

it("uses successful publication as the only shared marker and blocks re-entry", () => {
  const draft = share();
  expect(publishedWorkoutPost(draft, 1)).toBeUndefined();
  const posted = publish(draft);
  expect(publishedWorkoutPost(posted, 1)).toBe(posted.posts[0]);
  expect(posted.drafts).toEqual([]);
  expect(reduce(posted, { type: "shareWorkout", workout: workout() })).toBe(posted);
  expect(reduce(posted, { type: "publishPost", version: posted.version, at })).toBe(posted);
  expect(posted.posts.filter((post) => post.workout?.workoutId === 1)).toHaveLength(1);
});

it("guards publication independently of the share entry point", () => {
  const draft = share();
  const posted = publish(draft);
  const staleComposer = { ...posted, composer: draft.composer };
  expect(publish(staleComposer)).toBe(staleComposer);
  expect(staleComposer.posts).toHaveLength(samplePosts.length + 1);
});

it("rejects repeated/stale taps after draft save and resume", () => {
  const draft = share();
  const action = { type: "publishPost" as const, version: draft.version, at };
  const saved = reduce(draft, { type: "saveDraft" });
  const resumed = reduce(saved, { type: "resumeDraft", id: saved.drafts[0].id });
  expect(reduce(resumed, action)).toBe(resumed);
  const posted = publish(resumed);
  expect(reduce(posted, { ...action, version: resumed.version })).toBe(posted);
});

it("cancelled sharing leaves the workout shareable", () => {
  const draft = share();
  const cancelled = reduce(reduce(draft, { type: "requestDiscard", target: "composer" }), { type: "confirmDiscard" });
  expect(publishedWorkoutPost(cancelled, 1)).toBeUndefined();
  expect(share(1, cancelled).composer?.workout?.workoutId).toBe(1);
});

it("saving a workout draft is idempotent and never marks shared or publishes", () => {
  const draft = reduce(share(), { type: "editPost", text: "My caption" });
  const saved = reduce(draft, { type: "saveDraft" });
  expect(saved.composer).toBeNull();
  expect(saved.viewingDrafts).toBe(true);
  expect(hasSocialDraft(saved)).toBe(true);
  expect(saved.posts).toBe(draft.posts);
  expect(publishedWorkoutPost(saved, 1)).toBeUndefined();
  expect(reduce(saved, { type: "saveDraft" })).toBe(saved);
  expect(saved.drafts).toHaveLength(1);
});

it("re-sharing a parked workout resumes its original caption/snapshot without duplicates", () => {
  const original = reduce(share(), { type: "editPost", text: "Original caption" });
  const saved = reduce(original, { type: "saveDraft" });
  const resumed = reduce(saved, { type: "shareWorkout", workout: { ...workout(), sets: [{ ...workout().sets[0], reps: 999 }] } });
  expect(resumed.composer).toEqual(original.composer);
  expect(resumed.composer?.workout?.sets[0].reps).toBe(8);
  expect(resumed.drafts).toEqual([]);
  expect(reduce(resumed, { type: "shareWorkout", workout: workout() })).toBe(resumed);
  const posted = publish(resumed);
  expect(posted.posts[0].text).toBe("Original caption");
  expect(posted.posts[0].workout).toEqual(original.composer?.workout);
  expect(posted.posts[0].workout).not.toBe(original.composer?.workout);
});

it("deeply isolates and freezes cardio sets, totals and metrics in a draft snapshot", () => {
  const set: LoggedSet = { id: 1, exerciseId: "treadmill-running", exercise: "Treadmill Running", tracking: "cardio", reps: 0, weight: null,
    durationSeconds: 60, cardio: { distanceKm: 1 } };
  const completed = { id: 1, sets: [set], metrics: { startedAt: at, finishedAt: at + 60000, durationMs: 60000, bodyWeightKg: 70, estimatedKcal: 4, met: 3.5 } };
  const state = reduce(createInitialSocialState(), { type: "shareWorkout", workout: completed });
  const snapshot = state.composer!.workout!;
  set.durationSeconds = 999;
  completed.metrics.durationMs = 999;
  expect(snapshot.sets[0].durationSeconds).toBe(60);
  expect(snapshot.metrics?.durationMs).toBe(60000);
  for (const value of [snapshot, snapshot.sets, snapshot.sets[0], snapshot.sets[0].cardio, snapshot.totals, snapshot.metrics]) {
    expect(Object.isFrozen(value)).toBe(true);
  }
});

it("resumes and edits text/sample-attachment drafts independently", () => {
  const first = reduce(textDraft(), { type: "selectAchievement", achievementId: "sample-session" });
  let state = reduce(first, { type: "saveDraft" });
  state = reduce(textDraft(state, "Another draft"), { type: "saveDraft" });
  expect(state.drafts).toHaveLength(2);
  state = reduce(state, { type: "resumeDraft", id: first.composer!.id });
  expect(state.composer).toEqual(first.composer);
  state = reduce(state, { type: "editPost", text: "Edited and published" });
  state = publish(state);
  expect(state.posts[0]).toMatchObject({ text: "Edited and published", achievementId: "sample-session", authorId: LOCAL_AUTHOR_ID });
  expect(state.drafts).toHaveLength(1);
  expect(state.drafts[0].text).toBe("Another draft");
});

it("never overwrites an active draft when resuming or sharing another", () => {
  const parked = reduce(share(), { type: "saveDraft" });
  const editing = textDraft(parked);
  const blocked = reduce(editing, { type: "resumeDraft", id: parked.drafts[0].id });
  expect(blocked.composer).toBe(editing.composer);
  expect(blocked.drafts).toBe(editing.drafts);
  expect(blocked.shareNotice).toContain("already open");
  expect(share(2, blocked).composer).toBe(editing.composer);
});

it("confirms saved draft discard, freezes edits during confirmation, and can cancel", () => {
  const state = reduce(share(), { type: "saveDraft" });
  const id = state.drafts[0].id;
  expect(reduce(state, { type: "confirmDiscard" })).toBe(state);
  const prompt = reduce(state, { type: "requestDiscardDraft", id });
  expect(reduce(prompt, { type: "newTextDraft" })).toBe(prompt);
  expect(reduce(prompt, { type: "resumeDraft", id })).toBe(prompt);
  const cancelled = reduce(prompt, { type: "cancelDiscard" });
  expect(cancelled.drafts).toBe(state.drafts);
  const discarded = reduce(reduce(cancelled, { type: "requestDiscardDraft", id }), { type: "confirmDiscard" });
  expect(discarded.drafts).toEqual([]);
  expect(discarded.posts).toBe(state.posts);
  expect(publishedWorkoutPost(discarded, 1)).toBeUndefined();
  expect(share(1, discarded).composer).not.toBeNull();
});

it("discarding one parked draft preserves the active draft and other parked drafts", () => {
  let state = reduce(share(1), { type: "saveDraft" });
  const id = state.drafts[0].id;
  state = reduce(share(2, state), { type: "saveDraft" });
  state = textDraft(state);
  const discarded = reduce(reduce(state, { type: "requestDiscardDraft", id }), { type: "confirmDiscard" });
  expect(discarded.composer).toBe(state.composer);
  expect(discarded.drafts).toEqual([state.drafts[1]]);
  const composerDiscarded = reduce(reduce(state, { type: "requestDiscard", target: "composer" }), { type: "confirmDiscard" });
  expect(composerDiscarded.drafts).toBe(state.drafts);
});

it("exit discard removes all unfinished drafts only after confirmation", () => {
  let state = reduce(share(), { type: "saveDraft" });
  state = textDraft(state);
  state = reduce(state, { type: "editComment", postId: "sample-maya", text: "Comment draft" });
  const prompt = reduce(state, { type: "requestDiscard", target: "all" });
  expect(reduce(prompt, { type: "cancelDiscard" }).drafts).toBe(state.drafts);
  const discarded = reduce(prompt, { type: "confirmDiscard" });
  expect(hasSocialDraft(discarded)).toBe(false);
  expect(discarded.posts).toBe(state.posts);
  expect(discarded.comments).toBe(state.comments);
  expect(discarded.likes).toBe(state.likes);
  expect(discarded.nextDraftId).toBe(state.nextDraftId);
});

it("separately publishes distinct workouts with identical exercises and totals", () => {
  const first = publish(share(1));
  const second = publish(share(2, first));
  expect(second.posts.filter((post) => post.workout)).toHaveLength(2);
  expect(publishedWorkoutPost(second, 1)?.id).not.toBe(publishedWorkoutPost(second, 2)?.id);
  expect(publishedWorkoutPost(second, 1)?.workout?.totals).toEqual(publishedWorkoutPost(second, 2)?.workout?.totals);
});

it("keeps failed validation/capacity/timestamp attempts unshared and resumable", () => {
  let state = reduce(share(), { type: "editPost", text: "x".repeat(POST_LIMIT + 1) });
  state = publish(state);
  expect(state.composer?.error).toBeTruthy();
  expect(publishedWorkoutPost(state, 1)).toBeUndefined();
  state = reduce(state, { type: "saveDraft" });
  state = reduce(state, { type: "resumeDraft", id: state.drafts[0].id });
  state = reduce(state, { type: "editPost", text: "Valid" });
  expect(reduce(state, { type: "publishPost", version: state.version, at: NaN })).toBe(state);
  const full = { ...state, posts: Array.from({ length: MAX_LOCAL_POSTS }, (_, index) => ({
    id: `existing-${index}`, authorId: LOCAL_AUTHOR_ID, text: "Existing", origin: "local" as const, achievementId: null, createdAt: at,
  })) };
  expect(publish(full).composer?.error).toContain("limit");
  expect(publishedWorkoutPost(publish(full), 1)).toBeUndefined();
});

it("keeps trainer identity and unverified status when publishing a resumed normal post", () => {
  let state = createInitialSocialState();
  state = reduce(state, { type: "trainer", action: { type: "open", authorId: LOCAL_AUTHOR_ID, displayName: "Demo Coach", username: "demo_coach", bio: "Bio" } });
  state = reduce(state, { type: "trainer", action: { type: "specialization", value: "Mobility" } });
  state = reduce(state, { type: "trainer", action: { type: "acknowledge", value: true } });
  state = reduce(state, { type: "trainer", action: { type: "save", authorId: LOCAL_AUTHOR_ID, reservedUsernames: [] } });
  state = reduce(textDraft(state), { type: "saveDraft" });
  state = reduce(state, { type: "resumeDraft", id: state.drafts[0].id });
  state = publish(state);
  expect(state.posts[0].authorId).toBe(LOCAL_AUTHOR_ID);
  expect(identityFor(state, state.posts[0].authorId)?.username).toBe("demo_coach");
  expect(state.trainers.profiles[LOCAL_AUTHOR_ID].enabled).toBe(true);
  expect(state.trainers.profiles[LOCAL_AUTHOR_ID]).not.toHaveProperty("verified", true);
});

it("publishing and parking drafts never save workouts, and Save remains independently idempotent", () => {
  let session = workoutReducer(initialWorkout, { type: "start", clock: { wallMs: at, monotonicMs: 0 } });
  session = workoutReducer(session, { type: "selectExercise", exercise: "Push-up" });
  session = workoutReducer(session, { type: "edit", field: "reps", value: "8" });
  session = workoutReducer(session, { type: "addSet", revision: session.revision });
  session = workoutReducer(session, { type: "requestEnd" });
  session = workoutReducer(session, { type: "finish", clock: { wallMs: at + 60000, monotonicMs: 60000 } });
  const original = JSON.stringify(session);
  let social = reduce(createInitialSocialState(), { type: "shareWorkout", workout: session.completed! });
  social = reduce(social, { type: "saveDraft" });
  social = reduce(social, { type: "resumeDraft", id: social.drafts[0].id });
  social = publish(social);
  expect(JSON.stringify(session)).toBe(original);
  expect(session.history).toEqual([]);
  const saved = workoutReducer(session, { type: "save" });
  expect(saved.history).toEqual([session.completed]);
  expect(workoutReducer(saved, { type: "save" })).toBe(saved);
  expect(publishedWorkoutPost(social, saved.completed!.id)).toBeDefined();
});

it("ignores missing draft targets and creates independent process-local state", () => {
  const state = createInitialSocialState();
  expect(reduce(state, { type: "resumeDraft", id: "missing" })).toBe(state);
  expect(reduce(state, { type: "requestDiscardDraft", id: "missing" })).toBe(state);
  expect(reduce(state, { type: "continueComposer" })).toBe(state);
  const shared = publish(share(1, state));
  const fresh = createInitialSocialState();
  expect(fresh.drafts).toEqual([]);
  expect(fresh.drafts).not.toBe(state.drafts);
  expect(publishedWorkoutPost(shared, 1)).toBeDefined();
  expect(publishedWorkoutPost(fresh, 1)).toBeUndefined();
  expect(workoutDraft(fresh, 1)).toBeUndefined();
});
