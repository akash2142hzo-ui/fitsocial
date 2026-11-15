import { LOCAL_AUTHOR_ID } from "./sampleData";
import { createInitialSocialState, socialReducer as reduce, visiblePosts } from "./socialState";
import { avatarInitials, avatarOptions, settingsDirty } from "./settingsState";
import { identityFor } from "./trainerIdentity";

function profile() { return reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "profile" }); }
it("saves profile identity without changing author or publication IDs", () => {
  let state = profile();
  for (const [field, value] of [["displayName", "  Taylor Demo  "], ["username", "taylor_demo"], ["bio", "Moving daily"], ["location", "Hyderabad"], ["avatar", "Move"]] as const) {
    state = reduce(state, { type: "editSettings", field, value });
  }
  const posts = state.posts;
  expect(settingsDirty(state.settingsDraft)).toBe(true);
  state = reduce(state, { type: "saveSettings" });
  expect(state.settingsDraft).toBeNull();
  expect(identityFor(state, LOCAL_AUTHOR_ID)).toMatchObject({ id: LOCAL_AUTHOR_ID, name: "Taylor Demo", username: "taylor_demo", bio: "Moving daily", initials: "MV", location: "Hyderabad" });
  expect(state.posts).toBe(posts);
});
it.each([
  ["displayName", "   "], ["displayName", "x".repeat(51)], ["username", ""], ["username", "bad space"], ["username", "MAYA_MOVES_DEMO"],
  ["username", "a".repeat(25)], ["bio", "x".repeat(161)], ["location", "x".repeat(81)], ["avatar", "Unknown"],
] as const)("rejects invalid %s", (field, value) => {
  const state = reduce(profile(), { type: "editSettings", field, value });
  const next = reduce(state, { type: "saveSettings" });
  expect(next.settingsDraft?.error).toBeTruthy();
  expect(next.localProfile).toBe(state.localProfile);
});
it("allows optional values to be cleared and respects all text length limits", () => {
  let state = profile();
  for (const [field, value] of [["displayName", "x".repeat(50)], ["username", "x".repeat(24)], ["bio", ""], ["location", ""]] as const) state = reduce(state, { type: "editSettings", field, value });
  state = reduce(state, { type: "saveSettings" });
  expect(state.settingsDraft).toBeNull();
  expect(state.localBio).toBe("");
});
it("confirms discard and blocks edits and saving while confirming", () => {
  let state = profile();
  expect(settingsDirty(state.settingsDraft)).toBe(false);
  state = reduce(state, { type: "editSettings", field: "displayName", value: "Unsaved" });
  state = reduce(state, { type: "confirmSettingsDiscard" });
  expect(reduce(state, { type: "saveSettings" })).toBe(state);
  expect(reduce(state, { type: "editSettings", field: "bio", value: "Blocked" })).toBe(state);
  expect(reduce(state, { type: "keepSettingsEditing" }).settingsDraft?.values.displayName).toBe("Unsaved");
  const discarded = reduce(state, { type: "closeSettingsEditor" });
  expect(discarded.localProfile.displayName).not.toBe("Unsaved");
  expect(discarded.settingsDraft).toBeNull();
});
it.each(avatarOptions)("supports the %s letter avatar", (avatar) => {
  const state = reduce(reduce(profile(), { type: "editSettings", field: "avatar", value: avatar }), { type: "saveSettings" });
  expect(avatarInitials(state.localProfile).length).toBeGreaterThan(0);
  expect(state.localProfile.avatar).toBe(avatar);
});
it.each(["0", "49", "251", "1e2", "170.123", "NaN"])("rejects invalid personal height %s", (value) => {
  const draft = reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "fitness" });
  const next = reduce(reduce(draft, { type: "editSettings", field: "heightCm", value }), { type: "saveSettings" });
  expect(next.settingsDraft?.error).toBeTruthy();
});
it.each(["0", "501", "-70", "70.123", "NaN"])("rejects invalid personal weight %s", (value) => {
  const draft = reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "fitness" });
  const next = reduce(reduce(draft, { type: "editSettings", field: "bodyWeightKg", value }), { type: "saveSettings" });
  expect(next.settingsDraft?.error).toBeTruthy();
});
it("saves metric preferences and keeps identity unchanged", () => {
  let state = reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "fitness" });
  state = reduce(state, { type: "editSettings", field: "heightCm", value: "175.5" });
  state = reduce(state, { type: "editSettings", field: "bodyWeightKg", value: "72.5" });
  state = reduce(state, { type: "saveSettings" });
  expect(state.fitness).toEqual({ heightCm: "175.5", bodyWeightKg: "72.5", units: "Metric" });
  state = reduce(state, { type: "openSettingsEditor", section: "fitness" });
  expect(reduce(state, { type: "editSettings", field: "displayName", value: "Wrong editor" })).toBe(state);
});
it("updates an existing trainer profile while preserving enabled state and training attributes", () => {
  const initial = createInitialSocialState();
  const trainer = { ...initial.trainers.profiles.alex, authorId: LOCAL_AUTHOR_ID, sample: false, qualifications: "Self-reported only" };
  let state = reduce({ ...initial, trainers: { ...initial.trainers, profiles: { ...initial.trainers.profiles, [LOCAL_AUTHOR_ID]: trainer } } }, { type: "openSettingsEditor", section: "profile" });
  state = reduce(state, { type: "editSettings", field: "displayName", value: "New identity" });
  state = reduce(state, { type: "saveSettings" });
  expect(state.trainers.profiles[LOCAL_AUTHOR_ID]).toMatchObject({ displayName: "New identity", enabled: true, qualifications: "Self-reported only", authorId: LOCAL_AUTHOR_ID });
  expect(state.trainers.profiles[LOCAL_AUTHOR_ID].specializations).toEqual(trainer.specializations);
});

it.each(["Public", "Private"] as const)("saves %s as a future preference without enforcing visibility", (value) => {
  const initial = createInitialSocialState();
  let state = reduce(initial, { type: "openSettingsEditor", section: "privacy" });
  state = reduce(state, { type: "editSettings", field: "futureVisibility", value });
  expect(state.futureVisibility).toBe("Not set");
  expect(settingsDirty(state.settingsDraft)).toBe(true);
  state = reduce(state, { type: "saveSettings" });
  expect(state.futureVisibility).toBe(value);
  expect(state.settingsDraft).toBeNull();
  expect(visiblePosts(state)).toEqual(visiblePosts(initial));
  for (const key of ["posts", "comments", "likes", "follows", "trainers", "drafts", "localProfile", "fitness"] as const) expect(state[key]).toBe(initial[key]);
});

it("cancels future privacy edits without changing the saved preference", () => {
  let state = reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "privacy" });
  state = reduce(state, { type: "editSettings", field: "futureVisibility", value: "Private" });
  state = reduce(state, { type: "confirmSettingsDiscard" });
  expect(reduce(state, { type: "saveSettings" })).toBe(state);
  state = reduce(state, { type: "closeSettingsEditor" });
  expect(state.futureVisibility).toBe("Not set");
});

it("rejects invalid future preferences and edits from another settings section", () => {
  let state = reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "privacy" });
  expect(reduce(state, { type: "editSettings", field: "displayName", value: "Wrong section" })).toBe(state);
  expect(reduce(state, { type: "editSettings", field: "bodyWeightKg", value: "80" })).toBe(state);
  state = reduce(state, { type: "editSettings", field: "futureVisibility", value: "Invalid" });
  const next = reduce(state, { type: "saveSettings" });
  expect(next.settingsDraft?.error).toBeTruthy();
  expect(next.futureVisibility).toBe("Not set");
  for (const section of ["profile", "fitness"] as const) {
    const other = reduce(createInitialSocialState(), { type: "openSettingsEditor", section });
    expect(reduce(other, { type: "editSettings", field: "futureVisibility", value: "Private" })).toBe(other);
  }
});

it.each([["50", "1"], ["250", "500"], ["175.25", "72.55"], ["", ""]])("accepts height %s and weight %s at supported bounds", (heightCm, bodyWeightKg) => {
  let state = reduce(createInitialSocialState(), { type: "openSettingsEditor", section: "fitness" });
  state = reduce(state, { type: "editSettings", field: "heightCm", value: heightCm });
  state = reduce(state, { type: "editSettings", field: "bodyWeightKg", value: bodyWeightKg });
  state = reduce(state, { type: "saveSettings" });
  expect(state.settingsDraft).toBeNull();
  expect(state.fitness).toEqual({ heightCm, bodyWeightKg, units: "Metric" });
});
