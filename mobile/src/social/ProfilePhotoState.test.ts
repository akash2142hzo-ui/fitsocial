import { LocalMedia } from "./localMedia";
import { settingsDirty } from "./settingsState";
import { createInitialSocialState, socialReducer as reduce, SocialState } from "./socialState";
import { LOCAL_AUTHOR_ID } from "./sampleData";
import { identityFor } from "./trainerIdentity";
import { referencedMedia } from "./useMediaCleanup";

const photo: LocalMedia = { id: "profile-photo", uri: "file:///cache/profile.jpg", kind: "photo", mimeType: "image/jpeg", sizeBytes: 2000, width: 600, height: 600 };
function open(state = createInitialSocialState()) { return reduce(state, { type: "openSettingsEditor", section: "profile" }); }
function select(state: SocialState, value = photo) {
  return reduce(reduce(state, { type: "beginProfilePhoto", token: "pick" }), { type: "finishProfilePhoto", token: "pick", photo: value });
}
it("keeps photo edits separate until Save, excludes other identities, and discards uncommitted changes", () => {
  const edited = select(open());
  expect(settingsDirty(edited.settingsDraft)).toBe(true); expect(edited.localProfile.photo).toBeNull();
  expect(reduce(edited, { type: "closeSettingsEditor" }).localProfile.photo).toBeNull();
  const saved = reduce(edited, { type: "saveSettings" });
  expect(saved.localProfile.photo).toEqual(photo); expect(identityFor(saved, LOCAL_AUTHOR_ID)?.photo).toEqual(photo);
  for (const id of ["maya", "alex", "sam"]) expect(identityFor(saved, id)?.photo).toBeUndefined();
  expect(settingsDirty(open(saved).settingsDraft)).toBe(false);
});
it("retains saved/original/new photo references until they are actually discarded or replaced", () => {
  const saved = reduce(select(open()), { type: "saveSettings" });
  const next = { ...photo, id: "replacement", uri: "file:///cache/replacement.jpg" };
  const edited = select(open(saved), next);
  expect([...referencedMedia(edited).keys()]).toEqual(expect.arrayContaining([photo.id, next.id]));
  expect(referencedMedia(reduce(edited, { type: "closeSettingsEditor" })).has(next.id)).toBe(false);
  const replaced = reduce(edited, { type: "saveSettings" });
  expect(referencedMedia(replaced).has(photo.id)).toBe(false); expect(replaced.localProfile.photo).toEqual(next);
});
it("clears a custom photo when choosing a preset and removes only the committed photo on Save", () => {
  const saved = reduce(select(open()), { type: "saveSettings" });
  const preset = reduce(open(saved), { type: "editSettings", field: "avatar", value: "Strong" });
  expect(preset.settingsDraft?.values.photo).toBeNull(); expect(preset.localProfile.photo).toEqual(photo);
  expect(reduce(preset, { type: "saveSettings" }).localProfile).toMatchObject({ avatar: "Strong", photo: null });
  const removed = reduce(open(saved), { type: "removeProfilePhoto" });
  expect(reduce(removed, { type: "closeSettingsEditor" }).localProfile.photo).toEqual(photo);
  expect(reduce(removed, { type: "saveSettings" }).localProfile.photo).toBeNull();
});
it("guards pending Save and stale picker results after preset switching, discard confirmation and closing", () => {
  const pending = reduce(open(), { type: "beginProfilePhoto", token: "pick" });
  expect(reduce(pending, { type: "saveSettings" })).toBe(pending);
  for (const state of [reduce(pending, { type: "confirmSettingsDiscard" }), reduce(pending, { type: "closeSettingsEditor" }), reduce(pending, { type: "editSettings", field: "avatar", value: "Move" })]) {
    expect(reduce(state, { type: "finishProfilePhoto", token: "pick", photo })).toBe(state);
  }
  const canceled = reduce(pending, { type: "finishProfilePhoto", token: "pick" });
  expect(settingsDirty(canceled.settingsDraft)).toBe(false); expect(canceled.settingsDraft?.photoPending).toBeUndefined();
});
it.each([{ ...photo, kind: "video" as const }, { ...photo, uri: "https://example.invalid/photo.jpg" }, { ...photo, sizeBytes: 11 * 1024 * 1024 }])("rejects invalid profile photo metadata", (value) => {
  const state = select(open(), value);
  expect(state.settingsDraft?.values.photo).toBeNull(); expect(state.settingsDraft?.error).toBeTruthy();
});
it("retains photo data across fitness and privacy edits", () => {
  let state = reduce(select(open()), { type: "saveSettings" });
  state = reduce(state, { type: "openSettingsEditor", section: "fitness" });
  state = reduce(state, { type: "editSettings", field: "bodyWeightKg", value: "70" });
  state = reduce(state, { type: "saveSettings" }); expect(state.localProfile.photo).toEqual(photo);
  state = reduce(state, { type: "openSettingsEditor", section: "privacy" });
  state = reduce(state, { type: "editSettings", field: "futureVisibility", value: "Private" });
  state = reduce(state, { type: "saveSettings" }); expect(state.localProfile.photo).toEqual(photo);
});
it("blocks known image failures without dirtying saved data and ignores failures for an older photo", () => {
  const saved = reduce(select(open()), { type: "saveSettings" });
  const unavailable = reduce(open(saved), { type: "profilePhotoError", photoId: photo.id, error: "Photo unavailable" });
  expect(settingsDirty(unavailable.settingsDraft)).toBe(false);
  expect(reduce(unavailable, { type: "saveSettings" }).settingsDraft?.error).toContain("unavailable");
  const next = { ...photo, id: "replacement", uri: "file:///cache/replacement.jpg" };
  const replaced = select(unavailable, next);
  expect(replaced.settingsDraft?.photoUnavailableId).toBeUndefined();
  expect(reduce(replaced, { type: "profilePhotoError", photoId: photo.id, error: "Late failure" })).toBe(replaced);
  expect(reduce(replaced, { type: "saveSettings" }).localProfile.photo).toEqual(next);
});
it("recovers only the matching successfully decoded photo and preserves unrelated field validation", () => {
  const failed = reduce(select(open()), { type: "profilePhotoError", photoId: photo.id, error: "Profile photo is unavailable. Choose another photo." });
  expect(reduce(failed, { type: "profilePhotoAvailable", photoId: "old-image" })).toBe(failed);
  const recovered = reduce(failed, { type: "profilePhotoAvailable", photoId: photo.id });
  expect(recovered.settingsDraft?.photoUnavailableId).toBeUndefined(); expect(recovered.settingsDraft?.error).toBeNull();
  expect(reduce(recovered, { type: "saveSettings" }).localProfile.photo).toEqual(photo);
  const invalidName = reduce(reduce(failed, { type: "editSettings", field: "displayName", value: "" }), { type: "saveSettings" });
  const stillInvalid = reduce(invalidName, { type: "profilePhotoAvailable", photoId: photo.id });
  expect(stillInvalid.settingsDraft?.error).toBe("Enter a display name.");
  expect(reduce(stillInvalid, { type: "saveSettings" }).settingsDraft).not.toBeNull();
  const closed = reduce(failed, { type: "closeSettingsEditor" });
  expect(reduce(closed, { type: "profilePhotoAvailable", photoId: photo.id })).toBe(closed);
});
