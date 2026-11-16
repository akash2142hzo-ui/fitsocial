import { initialNavigation, navigationReducer, tabs } from "../navigation/navigationState";
import { CompletedWorkout, initialWorkout, workoutReducer } from "../workout/workoutState";
import { postMetaLabel } from "./feedPresentation";
import { followStats, personalProfileStats, postsForAuthor } from "./profileState";
import { authors, LOCAL_AUTHOR_ID } from "./sampleData";
import { BIO_LIMIT, createInitialSocialState, socialReducer as reduce } from "./socialState";

const history: CompletedWorkout[] = [
  { id: 1, sets: [{ id: 1, exerciseId: "bodyweight-squat", exercise: "Squat", reps: 8, weight: null }] },
  { id: 2, sets: [{ id: 1, exerciseId: "dumbbell-row", exercise: "Row", reps: 12, weight: 20 }] },
];
describe("temporary personal profiles", () => {
  it("derives completed workout statistics and excludes fictional sample posts", () => {
    const state = createInitialSocialState();
    expect(personalProfileStats(state, history)).toMatchObject({ workoutCount: 2, setCount: 2, reps: 20, distinctExercises: 2, postCount: 0 });
    expect(postsForAuthor(state, LOCAL_AUTHOR_ID)).toEqual([]);
    expect(postsForAuthor(state, "maya").map((post) => post.id)).toEqual(["sample-maya"]);
  });
  it("includes newly created local posts on Profile regardless of Feed filter", () => {
    let state = reduce(createInitialSocialState(), { type: "openComposer" });
    state = reduce(state, { type: "editPost", text: "My local post" });
    state = reduce(state, { type: "publishPost", version: state.version, at: 0 });
    state = reduce(state, { type: "setFilter", filter: "all" });
    expect(postsForAuthor(state, LOCAL_AUTHOR_ID)).toEqual([state.posts[0]]);
    expect(personalProfileStats(state, []).postCount).toBe(1);
  });
  it("edits the local bio, accepts empty text and enforces the bound", () => {
    const initial = createInitialSocialState();
    const edited = reduce(initial, { type: "editBio", text: "My local bio" });
    expect(edited.localBio).toBe("My local bio");
    expect(initial.localBio).not.toBe(edited.localBio);
    expect(reduce(edited, { type: "editBio", text: "" }).localBio).toBe("");
    expect(reduce(edited, { type: "editBio", text: "x".repeat(BIO_LIMIT) }).localBio).toHaveLength(BIO_LIMIT);
    expect(reduce(edited, { type: "editBio", text: "x".repeat(BIO_LIMIT + 1) })).toBe(edited);
    expect(authors.find((author) => author.id === LOCAL_AUTHOR_ID)?.bio).toBe(initial.localBio);
  });
  it("keeps active workouts, drafts, bio and follow state across primary and secondary navigation", () => {
    let workout = workoutReducer(workoutReducer(initialWorkout, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" });
    workout = workoutReducer(workout, { type: "edit", field: "reps", value: "8" });
    workout = workoutReducer(workout, { type: "addSet", revision: workout.revision });
    let social = reduce(createInitialSocialState(), { type: "openComposer" });
    social = reduce(social, { type: "editPost", text: "Unfinished post" });
    social = reduce(social, { type: "editComment", postId: "sample-maya", text: "Unfinished comment" });
    social = reduce(social, { type: "editBio", text: "My bio" });
    social = reduce(social, { type: "setFollow", authorId: "maya", following: true });
    let root = { workout, social, navigation: navigationReducer(initialNavigation, { type: "openPrototype" }) };
    for (const tab of tabs) root = { ...root, navigation: navigationReducer(root.navigation, { type: "selectTab", tab: tab.id }) };
    root = { ...root, navigation: navigationReducer(root.navigation, { type: "selectTab", tab: "progress" }) };
    root = { ...root, navigation: navigationReducer(root.navigation, { type: "back" }) };
    expect(root.workout).toBe(workout);
    expect(root.workout.sets).toHaveLength(1);
    expect(root.social).toBe(social);
    expect(root.social.composer?.text).toBe("Unfinished post");
    expect(root.social.commentDrafts["sample-maya"].text).toBe("Unfinished comment");
    expect(root.social.localBio).toBe("My bio");
    expect(followStats(root.social, "maya").followedLocally).toBe(true);
  });
  it("opens or continues the existing composer without replacing a draft", () => {
    const empty = createInitialSocialState();
    const opened = reduce(empty, { type: "openComposer" });
    const drafted = reduce(opened, { type: "editPost", text: "Keep this" });
    expect(reduce(drafted, { type: "openComposer" })).toBe(drafted);
    expect(navigationReducer({ screen: "prototype", tab: "home" }, { type: "selectTab", tab: "create" })).toEqual({ screen: "prototype", tab: "create", parentTab: "home", backStack: [{ tab: "home" }] });
  });
  it("keeps applied bio edits and follows when unrelated post drafts are discarded", () => {
    let state = reduce(createInitialSocialState(), { type: "editBio", text: "Applied locally" });
    state = reduce(state, { type: "setFollow", authorId: "maya", following: true });
    state = reduce(state, { type: "openComposer" });
    state = reduce(state, { type: "editPost", text: "Discard this draft" });
    state = reduce(reduce(state, { type: "requestDiscard", target: "all" }), { type: "confirmDiscard" });
    expect(state.composer).toBeNull();
    expect(state.localBio).toBe("Applied locally");
    expect(followStats(state, "maya").followedLocally).toBe(true);
  });
});
describe("local follow relationships", () => {
  it("follows and unfollows with accurate follower/following counts and no duplicate edges", () => {
    const initial = createInitialSocialState();
    const follow = { type: "setFollow" as const, authorId: "maya", following: true };
    let state = reduce(initial, follow);
    expect(reduce(state, follow)).toBe(state);
    expect(followStats(state, "maya")).toEqual({ followers: 1, following: 0, followedLocally: true });
    expect(followStats(state, LOCAL_AUTHOR_ID).following).toBe(1);
    state = reduce(state, { type: "setFollow", authorId: "alex", following: true });
    expect(followStats(state, LOCAL_AUTHOR_ID).following).toBe(2);
    state = reduce(state, { type: "setFollow", authorId: "maya", following: false });
    expect(followStats(state, "maya").followers).toBe(0);
    expect(followStats(state, LOCAL_AUTHOR_ID).following).toBe(1);
    expect(initial.follows).toEqual([]);
  });
  it("rejects self-follow and nonexistent profiles", () => {
    const state = createInitialSocialState();
    expect(reduce(state, { type: "setFollow", authorId: LOCAL_AUTHOR_ID, following: true })).toBe(state);
    expect(reduce(state, { type: "setFollow", authorId: "missing", following: true })).toBe(state);
  });
});
describe("profile presentation labels", () => {
  it("labels sample and local origins concisely without a broken separator", () => {
    expect(postMetaLabel("sample")).toBe("Sample");
    expect(postMetaLabel("local")).toBe("Local");
    expect(postMetaLabel("sample")).not.toContain("?");
    expect(new Set(authors.map((author) => author.username)).size).toBe(authors.length);
  });
});
