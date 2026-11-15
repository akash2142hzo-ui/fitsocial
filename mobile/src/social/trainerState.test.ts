import { createTrainerState, discoverTrainers, trainerReducer as reduce, trainerLimits, TrainerDraft, TrainerState, validateTrainer } from "./trainerState";
import { createInitialSocialState, socialReducer, SocialState } from "./socialState";
import { LOCAL_AUTHOR_ID, authors } from "./sampleData";
import { identityFor } from "./trainerIdentity";
import { initialNavigation, navigationReducer, selectedPrimaryTab, tabs } from "../navigation/navigationState";

function open(state = createTrainerState()) {
  return reduce(state, { type: "open", authorId: LOCAL_AUTHOR_ID, displayName: "Demo Coach", username: "demo_coach", bio: "Local bio" });
}
const draft = (): TrainerDraft => ({ ...open().draft!, specializations: ["Strength training"], acknowledged: true });
const save = (state: TrainerState = { ...open(), draft: draft() }) => reduce(state, { type: "save", authorId: LOCAL_AUTHOR_ID, reservedUsernames: [] });
function activate(state = createInitialSocialState()): SocialState {
  state = socialReducer(state, { type: "trainer", action: { type: "open", authorId: LOCAL_AUTHOR_ID, displayName: "Demo Coach", username: "demo_coach", bio: "Local bio" } });
  state = socialReducer(state, { type: "trainer", action: { type: "specialization", value: "Strength training" } });
  state = socialReducer(state, { type: "trainer", action: { type: "acknowledge", value: true } });
  return socialReducer(state, { type: "trainer", action: { type: "save", authorId: LOCAL_AUTHOR_ID, reservedUsernames: [] } });
}
it("starts with fictional samples, no local trainer, and an unchecked acknowledgment", () => {
  const initial = createTrainerState();
  expect(initial.profiles[LOCAL_AUTHOR_ID]).toBeUndefined();
  expect(discoverTrainers(initial)).toHaveLength(2);
  expect(discoverTrainers(initial).every((profile) => profile.sample && profile.enabled)).toBe(true);
  expect(open().draft?.acknowledged).toBe(false);
  expect(save(open()).profiles[LOCAL_AUTHOR_ID]).toBeUndefined();
});
it("requires explicit acknowledgment and at least one specialization", () => {
  expect(validateTrainer({ ...draft(), acknowledged: false }, [])).toContain("Acknowledge");
  expect(validateTrainer({ ...draft(), specializations: [] }, [])).toContain("1 to 4");
  expect(validateTrainer({ ...draft(), specializations: ["Unlisted"] }, [])).not.toBeNull();
  expect(validateTrainer({ ...draft(), specializations: ["Mobility", "Mobility"] }, [])).not.toBeNull();
  expect(validateTrainer(draft(), [])).toBeNull();
});
it.each(Object.keys(trainerLimits) as (keyof typeof trainerLimits)[])("enforces the %s text limit", (field) => {
  expect(validateTrainer({ ...draft(), [field]: "x".repeat(trainerLimits[field] + 1) }, [])).not.toBeNull();
});
it.each(["", "ab", "coach name", "coach@example", "coach<script>", "coach\nname"])("rejects invalid username %s", (username) => {
  expect(validateTrainer({ ...draft(), username }, [])).not.toBeNull();
});
it("validates names and username uniqueness and sanitizes controls without HTML execution", () => {
  expect(validateTrainer({ ...draft(), displayName: "\u0000  " }, [])).not.toBeNull();
  expect(validateTrainer(draft(), ["DEMO_COACH"])).toContain("already used");
  const state = save({ ...open(), draft: { ...draft(), bio: "  <b>plain text</b>\u0000\r\nNext  ", experience: "user\u202e claim" } });
  expect(state.profiles[LOCAL_AUTHOR_ID].bio).toBe("<b>plain text</b>\nNext");
  expect(state.profiles[LOCAL_AUTHOR_ID].experience).toBe("user claim");
});
it("activates once, copies selection arrays, and preserves draft edits across reopen", () => {
  const editing = { ...open(), draft: draft() };
  const enabled = save(editing);
  expect(enabled.profiles[LOCAL_AUTHOR_ID]).toMatchObject({ enabled: true, sample: false, authorId: LOCAL_AUTHOR_ID });
  expect(enabled.profiles[LOCAL_AUTHOR_ID].specializations).not.toBe(editing.draft.specializations);
  expect(save(enabled)).toBe(enabled);
  const pending = reduce(open(enabled), { type: "edit", field: "experience", value: "Unsaved experience" });
  expect(open(pending)).toBe(pending);
  expect(pending.draft?.acknowledged).toBe(false);
});
it("caps and toggles specializations and edits coaching and availability safely", () => {
  let state = open();
  for (const value of ["Bodyweight", "Mobility", "Running", "Cycling", "Endurance"]) state = reduce(state, { type: "specialization", value });
  expect(state.draft?.specializations).toHaveLength(4);
  expect(state.error).toContain("up to 4");
  state = reduce(state, { type: "specialization", value: "Running" });
  expect(state.draft?.specializations).toHaveLength(3);
  state = reduce(state, { type: "mode", value: "Both" });
  state = reduce(state, { type: "availability", value: "Open to inquiries" });
  expect(state.draft).toMatchObject({ coachingMode: "Both", availability: "Open to inquiries" });
});
it("requires disable confirmation and retains saved details and draft text", () => {
  const enabled = save();
  expect(reduce(enabled, { type: "confirmDisable", authorId: LOCAL_AUTHOR_ID })).toBe(enabled);
  const pending = open(enabled);
  const prompt = reduce(pending, { type: "requestDisable", authorId: LOCAL_AUTHOR_ID });
  expect(reduce(prompt, { type: "cancelDisable", authorId: LOCAL_AUTHOR_ID }).profiles).toBe(enabled.profiles);
  const disabled = reduce(prompt, { type: "confirmDisable", authorId: LOCAL_AUTHOR_ID });
  expect(disabled.profiles[LOCAL_AUTHOR_ID]).toMatchObject({ enabled: false, username: "demo_coach" });
  expect(disabled.draft?.displayName).toBe("Demo Coach");
  expect(discoverTrainers(disabled).some((profile) => profile.authorId === LOCAL_AUTHOR_ID)).toBe(false);
});
it.each(["Maya", "maya_moves", "Mobility"])("searches trainer names, usernames and specialties: %s", (query) => {
  const result = discoverTrainers(reduce(createTrainerState(), { type: "filter", field: "query", value: query }));
  expect(result.map((entry) => entry.authorId)).toEqual(["maya"]);
});
it("combines specialization and coaching filters, includes Both appropriately, and handles no matches", () => {
  let state = reduce(createTrainerState(), { type: "filter", field: "specialization", value: "Strength training" });
  state = reduce(state, { type: "filter", field: "coachingMode", value: "Online" });
  expect(discoverTrainers(state).map((row) => row.authorId)).toEqual(["alex"]);
  state = reduce(state, { type: "filter", field: "query", value: "no such trainer" });
  expect(discoverTrainers(state)).toEqual([]);
});
it("preserves post identity, drafts, follows and bio across enabling and disabling", () => {
  let initial = socialReducer(createInitialSocialState(), { type: "openComposer" });
  initial = socialReducer(initial, { type: "editPost", text: "Same social identity" });
  initial = socialReducer(initial, { type: "setFollow", authorId: "maya", following: true });
  const enabled = activate(initial);
  expect(enabled.composer).toBe(initial.composer);
  expect(enabled.follows).toBe(initial.follows);
  expect(enabled.posts).toBe(initial.posts);
  expect(identityFor(enabled, LOCAL_AUTHOR_ID)).toMatchObject({ id: LOCAL_AUTHOR_ID, username: "demo_coach", name: "Demo Coach", bio: "Local bio" });
  const published = socialReducer(enabled, { type: "publishPost", version: enabled.version, at: 1000 });
  expect(published.posts[0].authorId).toBe(LOCAL_AUTHOR_ID);
  const disabled = socialReducer(socialReducer(published, { type: "trainer", action: { type: "requestDisable", authorId: LOCAL_AUTHOR_ID } }), { type: "trainer", action: { type: "confirmDisable", authorId: LOCAL_AUTHOR_ID } });
  expect(disabled.posts).toBe(published.posts);
  expect(disabled.localBio).toBe("Local bio");
  expect(identityFor(disabled, LOCAL_AUTHOR_ID)?.username).toBe("demo_coach");
  expect(disabled.follows).toBe(initial.follows);
});
it("prevents overwriting another identity and checks reserved usernames inside the social reducer", () => {
  const initial = createInitialSocialState();
  expect(socialReducer(initial, { type: "trainer", action: { type: "requestDisable", authorId: "maya" } })).toBe(initial);
  const state = activate();
  let edit = socialReducer(state, { type: "trainer", action: { type: "open", authorId: LOCAL_AUTHOR_ID, displayName: "ignored", username: "ignored", bio: state.localBio } });
  edit = socialReducer(edit, { type: "trainer", action: { type: "edit", field: "username", value: authors[1].username } });
  edit = socialReducer(edit, { type: "trainer", action: { type: "acknowledge", value: true } });
  edit = socialReducer(edit, { type: "trainer", action: { type: "save", authorId: LOCAL_AUTHOR_ID, reservedUsernames: [] } });
  expect(edit.trainers.error).toContain("already used");
  expect(edit.trainers.profiles[LOCAL_AUTHOR_ID].username).toBe("demo_coach");
});
it("keeps five tabs and returns discovery/author/setup screens to their entry routes", () => {
  expect(tabs).toHaveLength(5);
  const feed = navigationReducer(navigationReducer(initialNavigation, { type: "openPrototype" }), { type: "selectTab", tab: "feed" });
  const trainers = navigationReducer(feed, { type: "selectTab", tab: "trainers" });
  const author = navigationReducer(trainers, { type: "openAuthor", authorId: "maya" });
  expect(selectedPrimaryTab(author)).toBe("feed");
  expect(navigationReducer(author, { type: "back" })).toEqual(trainers);
  expect(navigationReducer(trainers, { type: "back" })).toEqual(feed);
  const profile = navigationReducer(feed, { type: "selectTab", tab: "profile" });
  expect(navigationReducer(navigationReducer(profile, { type: "selectTab", tab: "trainerSetup" }), { type: "back" })).toEqual(profile);
});

it("keeps trainer workout posts on the existing author ID with unchanged attachments and social actions", () => {
  const workout = { id: 1, sets: [{ id: 1, exerciseId: "push-up", exercise: "Push-up" as const, reps: 8, weight: null }] };
  let state = socialReducer(activate(), { type: "shareWorkout", workout });
  state = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 });
  const post = state.posts[0];
  expect(post).toMatchObject({ authorId: LOCAL_AUTHOR_ID, workout: { workoutId: 1, sets: workout.sets } });
  state = socialReducer(state, { type: "toggleLike", postId: post.id });
  state = socialReducer(state, { type: "editComment", postId: post.id, text: "Local encouragement" });
  state = socialReducer(state, { type: "addComment", postId: post.id, version: state.version, at: 1001 });
  expect(state.likes.some((like) => like.postId === post.id)).toBe(true);
  expect(state.comments.find((comment) => comment.postId === post.id)?.authorId).toBe(LOCAL_AUTHOR_ID);
  expect(state.posts[0].workout).toEqual(post.workout);
});

it("keeps ordinary bio edits and later trainer editing consistent", () => {
  const edited = socialReducer(activate(), { type: "editBio", text: "Updated ordinary bio" });
  expect(edited.trainers.profiles[LOCAL_AUTHOR_ID].bio).toBe("Updated ordinary bio");
  const opened = socialReducer(edited, { type: "trainer", action: { type: "open", authorId: LOCAL_AUTHOR_ID, displayName: "Demo Coach", username: "demo_coach", bio: edited.localBio } });
  expect(opened.trainers.draft?.bio).toBe("Updated ordinary bio");
  expect(identityFor(opened, LOCAL_AUTHOR_ID)?.bio).toBe("Updated ordinary bio");
});
