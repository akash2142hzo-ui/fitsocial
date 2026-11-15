import { authors, LOCAL_AUTHOR_ID, samplePosts } from "./sampleData";
import { createInitialSocialState, FeedFilter, socialReducer as reduce, visiblePosts } from "./socialState";
import { identityFor } from "./trainerIdentity";
import { initialWorkout, workoutReducer } from "../workout/workoutState";
import { createWorkoutAttachment } from "../workout/workoutSharing";

it("shows all published community content newest first without mutating stored order", () => {
  const state = createInitialSocialState();
  const original = [...state.posts];
  const posts = visiblePosts(state);
  expect(posts).toHaveLength(samplePosts.length);
  expect(posts.map((post) => post.id)).toEqual(["sample-maya", "sample-alex-learning", "sample-sam-community", "sample-alex"]);
  expect(state.posts).toEqual(original);
  expect(posts.every((post) => state.posts.includes(post))).toBe(true);
});
it("uses only the local persona's follow edges and updates without duplicating posts", () => {
  let state = reduce(createInitialSocialState(), { type: "setFilter", filter: "following" });
  state = { ...state, follows: [{ followerId: "sam", followingId: "maya" }] };
  expect(visiblePosts(state)).toEqual([]);
  state = reduce(state, { type: "setFollow", authorId: "alex", following: true });
  expect(visiblePosts(state).map((post) => post.id)).toEqual(["sample-alex-learning", "sample-alex"]);
  expect(reduce(state, { type: "setFollow", authorId: "alex", following: true })).toBe(state);
  state = reduce(state, { type: "setFollow", authorId: "alex", following: false });
  expect(visiblePosts(state)).toEqual([]);
});
it("filters My Posts by identity and local publication, not origin alone", () => {
  const initial = createInitialSocialState();
  const own = { ...initial.posts[0], id: "own", authorId: LOCAL_AUTHOR_ID, origin: "local" as const };
  const state = { ...initial, filter: "local" as const, posts: [own, { ...own, id: "foreign", authorId: "sam" }, { ...own, id: "sample", origin: "sample" as const }] };
  expect(visiblePosts(state)).toEqual([own]);
});
it.each<FeedFilter>(["all", "following", "local"])("excludes active and parked drafts from %s", (filter) => {
  let state = reduce(createInitialSocialState(), { type: "newTextDraft" });
  state = reduce(state, { type: "editPost", text: "Unpublished parked text" });
  state = reduce(state, { type: "saveDraft" });
  state = reduce(state, { type: "newTextDraft" });
  state = reduce(state, { type: "editPost", text: "Unpublished active text" });
  state = reduce(state, { type: "setFilter", filter });
  expect(visiblePosts(state).every((post) => post.origin === "sample")).toBe(true);
  expect(state.drafts).toHaveLength(1);
  expect(state.composer?.text).toBe("Unpublished active text");
});
it("shows a newly published post in For You and My Posts, not Following", () => {
  let state = reduce(createInitialSocialState(), { type: "setFilter", filter: "following" });
  state = reduce(state, { type: "newTextDraft" });
  state = reduce(state, { type: "editPost", text: "Published now" });
  state = reduce(state, { type: "publishPost", version: state.version, at: Date.UTC(2026, 10, 15) });
  expect(state.filter).toBe("all");
  expect(visiblePosts(state)[0].text).toBe("Published now");
  expect(visiblePosts(reduce(state, { type: "setFilter", filter: "local" }))).toEqual([state.posts[0]]);
  expect(visiblePosts(reduce(state, { type: "setFilter", filter: "following" }))).toEqual([]);
});
it("orders tied timestamps by stable ID and puts invalid timestamps last", () => {
  const state = createInitialSocialState();
  const base = state.posts[0];
  const posts = [{ ...base, id: "z" }, { ...base, id: "invalid", createdAt: NaN }, { ...base, id: "a" }];
  expect(visiblePosts({ ...state, posts }).map((post) => post.id)).toEqual(["a", "z", "invalid"]);
});
it("keeps fictional author identity and unverified trainer identity attached to original IDs", () => {
  const state = createInitialSocialState();
  expect(new Set(authors.map((author) => author.id)).size).toBe(authors.length);
  for (const post of samplePosts) {
    expect(identityFor(state, post.authorId)).toMatchObject({ id: post.authorId, fictional: true });
  }
  expect(state.trainers.profiles.alex).toMatchObject({ authorId: "alex", enabled: true, sample: true });
  expect(state.trainers.profiles.sam).toBeUndefined();
});

it("searches post text, display names and usernames without changing chronological order", () => {
  const state = createInitialSocialState();
  expect(visiblePosts({ ...state, feedQuery: "  ALEX  " }).map((post) => post.id)).toEqual(["sample-alex-learning", "sample-alex"]);
  expect(visiblePosts({ ...state, feedQuery: "maya_moves_demo" }).map((post) => post.id)).toEqual(["sample-maya"]);
  expect(visiblePosts({ ...state, feedQuery: "TRAINING notebook" }).map((post) => post.id)).toEqual(["sample-alex-learning"]);
  expect(visiblePosts({ ...state, feedQuery: " \n " })).toEqual(visiblePosts(state));
  expect(visiblePosts({ ...state, feedQuery: "unmatched phrase" })).toEqual([]);
});

it("combines search with follow and ownership filters", () => {
  let state = reduce(createInitialSocialState(), { type: "searchFeed", query: "alex" });
  state = reduce(state, { type: "setFilter", filter: "following" });
  expect(visiblePosts(state)).toEqual([]);
  state = reduce(state, { type: "setFollow", authorId: "alex", following: true });
  expect(visiblePosts(state)).toHaveLength(2);
  state = reduce(state, { type: "setFilter", filter: "local" });
  expect(visiblePosts(state)).toEqual([]);
  expect(state.feedQuery).toBe("alex");
});

it("matches the current local identity and keeps drafts out of search", () => {
  let state = reduce(createInitialSocialState(), { type: "newTextDraft" });
  state = reduce(state, { type: "editPost", text: "Secret draft" });
  expect(visiblePosts({ ...state, feedQuery: "Secret draft" })).toEqual([]);
  state = reduce(state, { type: "publishPost", version: state.version, at: Date.UTC(2026, 10, 15) });
  state = { ...state, localProfile: { ...state.localProfile, displayName: "Taylor Local", username: "taylor_demo" } };
  expect(visiblePosts({ ...state, feedQuery: "Taylor Local" })).toEqual([state.posts[0]]);
  expect(visiblePosts({ ...state, feedQuery: "taylor_demo" })).toEqual([state.posts[0]]);
});

it("searches attached exercise names without changing frozen workout data", () => {
  let workout = workoutReducer(initialWorkout, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } });
  workout = workoutReducer(workout, { type: "selectExercise", exercise: "Push-up" });
  workout = workoutReducer(workout, { type: "edit", field: "reps", value: "10" });
  workout = workoutReducer(workout, { type: "addSet", revision: workout.revision });
  const attachment = createWorkoutAttachment({ id: 1, sets: workout.sets });
  const state = createInitialSocialState();
  const post = { ...state.posts[0], id: "attached", workout: attachment };
  const before = JSON.stringify(attachment);
  expect(visiblePosts({ ...state, posts: [post], feedQuery: "push-up" })).toEqual([post]);
  expect(JSON.stringify(attachment)).toBe(before);
  expect(post.workout).toBe(attachment);
});

it("clears stale search on publication so the new post is visible", () => {
  let state = reduce(createInitialSocialState(), { type: "searchFeed", query: "not a match" });
  state = reduce(state, { type: "newTextDraft" });
  state = reduce(state, { type: "editPost", text: "New local post" });
  state = reduce(state, { type: "publishPost", version: state.version, at: Date.UTC(2026, 10, 15) });
  expect(state.feedQuery).toBe("");
  expect(visiblePosts(state)[0].text).toBe("New local post");
});

it("bounds search without invalidating post or comment submission versions", () => {
  const state = createInitialSocialState();
  const searched = reduce(state, { type: "searchFeed", query: "x".repeat(100) });
  expect(searched.feedQuery).toHaveLength(80);
  expect(searched.version).toBe(state.version);
  expect(searched.posts).toBe(state.posts);
});
