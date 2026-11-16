import { createInitialSocialState, socialReducer, SocialState } from "./socialState";
import { LocalMedia } from "./localMedia";
import { referencedMedia } from "./useMediaCleanup";
import { formatSharePreview } from "./feedPresentation";

const media: LocalMedia = { id: "test-media", uri: "file:///cache/test.jpg", kind: "photo", mimeType: "image/jpeg", sizeBytes: 2000, width: 800, height: 600 };
let state: SocialState;
function select(value = media) {
  state = socialReducer(state, { type: "beginMedia", draftId: state.composer!.id, token: "request" });
  state = socialReducer(state, { type: "finishMedia", draftId: state.composer!.id, token: "request", media: value });
}
beforeEach(() => { state = socialReducer(createInitialSocialState(), { type: "openComposer" }); });
it("preserves captions and sample achievements while publishing one independent local media reference", () => {
  state = socialReducer(state, { type: "editPost", text: "Local progress" });
  state = socialReducer(state, { type: "selectAchievement", achievementId: "sample-session" }); select();
  state = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 });
  expect(state.posts[0]).toMatchObject({ text: "Local progress", origin: "local", achievementId: "sample-session", media });
  expect(state.posts[0].media).not.toBe(media); expect(state.composer).toBeNull();
  expect(formatSharePreview(state.posts[0])).not.toContain(media.uri);
  expect(formatSharePreview(state.posts[0])).toContain("not uploaded or exported");
});
it("supports media-only posts but preserves the 500-character rule and ordinary empty-post rejection", () => {
  const empty = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 }); expect(empty.composer?.error).toContain("Write");
  select(); const attached = state;
  state = socialReducer(state, { type: "editPost", text: "x".repeat(501) });
  state = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 }); expect(state.composer?.error).toContain("500");
  state = socialReducer(attached, { type: "publishPost", version: attached.version, at: 1000 });
  expect(state.composer).toBeNull(); expect(state.posts[0].media).toEqual(media);
});
it("retains references across Save Draft, resume, drafts navigation and publishing, and clears them on confirmed discard", () => {
  select(); const id = state.composer!.id;
  state = socialReducer(state, { type: "saveDraft" }); expect(referencedMedia(state).has(media.id)).toBe(true);
  expect(state.drafts[0].media).toEqual(media);
  state = socialReducer(state, { type: "resumeDraft", id }); expect(state.composer?.media).toEqual(media);
  state = socialReducer(state, { type: "openDrafts" }); state = socialReducer(state, { type: "continueComposer" });
  expect(state.composer?.media).toEqual(media);
  state = socialReducer(state, { type: "requestDiscard", target: "composer" }); expect(referencedMedia(state).size).toBe(1);
  state = socialReducer(state, { type: "cancelDiscard" }); expect(state.composer?.media).toEqual(media);
  state = socialReducer(state, { type: "requestDiscard", target: "composer" }); state = socialReducer(state, { type: "confirmDiscard" });
  expect(referencedMedia(state).size).toBe(0);
});
it("keeps the current attachment on cancellation/failure, permits replacement and removal", () => {
  select(); const draftId = state.composer!.id;
  for (const error of [undefined, "Selection unavailable"]) {
    state = socialReducer(state, { type: "beginMedia", draftId, token: "next" });
    state = socialReducer(state, { type: "finishMedia", draftId, token: "next", error }); expect(state.composer?.media).toEqual(media);
  }
  select({ ...media, id: "replacement" }); expect(referencedMedia(state).has(media.id)).toBe(false);
  state = socialReducer(state, { type: "removeMedia", draftId }); expect(state.composer?.media).toBeUndefined();
});
it("blocks publishing/saving while selection is pending and rejects stale or mismatched picker callbacks", () => {
  const draftId = state.composer!.id;
  state = socialReducer(state, { type: "beginMedia", draftId, token: "current" }); const pending = state;
  expect(socialReducer(state, { type: "saveDraft" })).toBe(pending);
  expect(socialReducer(state, { type: "finishMedia", draftId, token: "stale", media })).toBe(pending);
  expect(socialReducer(state, { type: "finishMedia", draftId: "other", token: "current", media })).toBe(pending);
  state = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 }); expect(state.composer?.error).toContain("Wait");
  state = socialReducer(state, { type: "openDrafts" }); expect(state.composer?.mediaPending).toBeUndefined();
  expect(socialReducer(state, { type: "finishMedia", draftId, token: "current", media })).toBe(state);
});
it("marks expired references safely and blocks posting until removal or replacement", () => {
  select(); state = socialReducer(state, { type: "mediaUnavailable", id: media.id });
  state = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 }); expect(state.composer?.error).toContain("unavailable");
  const marked = state; expect(socialReducer(state, { type: "mediaUnavailable", id: media.id })).toBe(marked);
  state = socialReducer(state, { type: "removeMedia", draftId: state.composer!.id });
  state = socialReducer(state, { type: "editPost", text: "Caption survives" });
  state = socialReducer(state, { type: "publishPost", version: state.version, at: 1000 }); expect(state.posts[0].text).toBe("Caption survives");
});
it("rejects malformed incoming metadata without replacing an existing attachment", () => {
  select(); select({ ...media, sizeBytes: Infinity }); expect(state.composer?.media).toEqual(media);
  expect(state.composer?.error).toContain("size");
});
it("removes a saved draft's media only after confirmation and never persists refs into a new app session", () => {
  select(); const id = state.composer!.id;
  state = socialReducer(state, { type: "saveDraft" });
  state = socialReducer(state, { type: "requestDiscardDraft", id }); expect(referencedMedia(state).size).toBe(1);
  state = socialReducer(state, { type: "confirmDiscard" }); expect(referencedMedia(state).size).toBe(0);
  expect(referencedMedia(createInitialSocialState()).size).toBe(0);
});
