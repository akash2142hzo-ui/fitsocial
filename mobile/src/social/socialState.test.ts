import { LOCAL_AUTHOR_ID, samplePosts } from "./sampleData";
import { COMMENT_LIMIT, MAX_COMMENTS_PER_POST, MAX_LOCAL_POSTS, POST_LIMIT, createInitialSocialState, hasSocialDraft, postCounts, socialReducer as reduce, visiblePosts } from "./socialState";

const at = Date.UTC(2026, 10, 14, 12);
const postId = "sample-maya";
describe("local social feed", () => {
  it("likes and unlikes without removing someone else's fictional like", () => {
    const state = createInitialSocialState();
    const liked = reduce(state, { type: "toggleLike", postId });
    expect(postCounts(liked, postId)).toMatchObject({ likes: 2, liked: true });
    const unliked = reduce(liked, { type: "toggleLike", postId });
    expect(unliked.likes).toEqual(state.likes);
    expect(state.likes).toHaveLength(1);
  });
  it("adds local comments with accurate counts and clears only that draft", () => {
    const state = reduce(createInitialSocialState(), { type: "editComment", postId, text: " Nice work! " });
    const result = reduce(state, { type: "addComment", postId, at, version: state.version });
    expect(postCounts(result, postId).comments).toBe(2);
    expect(result.comments.at(-1)).toMatchObject({ text: "Nice work!", authorId: LOCAL_AUTHOR_ID, origin: "local", createdAt: at });
    expect(result.commentDrafts[postId].text).toBe("");
  });
  it.each(["", "   ", "x".repeat(COMMENT_LIMIT + 1)])("rejects an invalid comment", (text) => {
    const state = reduce(createInitialSocialState(), { type: "editComment", postId, text });
    const result = reduce(state, { type: "addComment", postId, at, version: state.version });
    expect(result.comments).toEqual(state.comments);
    expect(result.commentDrafts[postId].error).toBeTruthy();
  });
  it("rejects a duplicate comment submission from the same rendered draft", () => {
    const state = reduce(createInitialSocialState(), { type: "editComment", postId, text: "Great!" });
    const action = { type: "addComment" as const, postId, at, version: state.version };
    const result = reduce(state, action);
    expect(reduce(result, action)).toBe(result);
  });
  it("expands profiles and comments, preserving text on collapse", () => {
    let state = reduce(createInitialSocialState(), { type: "toggleComments", postId });
    state = reduce(state, { type: "editComment", postId, text: "Draft" });
    state = reduce(state, { type: "toggleComments", postId });
    expect(state.expandedComments).toEqual([]);
    expect(state.commentDrafts[postId].text).toBe("Draft");
    expect(reduce(state, { type: "toggleAuthor", authorId: "maya" }).expandedAuthors).toEqual(["maya"]);
  });
  it("supports the empty local-post view and ignores nonexistent targets", () => {
    const state = reduce(createInitialSocialState(), { type: "setFilter", filter: "local" });
    expect(visiblePosts(state)).toEqual([]);
    expect(reduce(state, { type: "toggleLike", postId: "missing" })).toBe(state);
    expect(reduce(state, { type: "toggleAuthor", authorId: "missing" })).toBe(state);
    expect(reduce(state, { type: "editComment", postId: "missing", text: "No" })).toBe(state);
  });
  it("accepts exactly the comment character limit and preserves other post drafts", () => {
    let state = reduce(createInitialSocialState(), { type: "editComment", postId: "sample-alex", text: "Other draft" });
    state = reduce(state, { type: "editComment", postId, text: "x".repeat(COMMENT_LIMIT) });
    const result = reduce(state, { type: "addComment", postId, at, version: state.version });
    expect(result.comments.at(-1)?.text).toHaveLength(COMMENT_LIMIT);
    expect(result.commentDrafts["sample-alex"].text).toBe("Other draft");
  });
  it("bounds comments without corrupting existing records", () => {
    let state = createInitialSocialState();
    while (postCounts(state, postId).comments < MAX_COMMENTS_PER_POST) {
      state = reduce(state, { type: "editComment", postId, text: "A local comment" });
      state = reduce(state, { type: "addComment", postId, at, version: state.version });
    }
    const full = reduce(state, { type: "editComment", postId, text: "One too many" });
    const result = reduce(full, { type: "addComment", postId, at, version: full.version });
    expect(postCounts(result, postId).comments).toBe(MAX_COMMENTS_PER_POST);
    expect(result.commentDrafts[postId].error).toContain("limit");
    expect(new Set(result.comments.map((comment) => comment.id)).size).toBe(result.comments.length);
  });
  it("creates independent fixtures for each app instance", () => {
    const first = createInitialSocialState();
    const second = createInitialSocialState();
    expect(first).toEqual(second);
    expect(first.posts).not.toBe(second.posts);
    expect(first.posts[0]).not.toBe(second.posts[0]);
    expect(first.comments).not.toBe(second.comments);
  });
});

function compose(text: string) {
  return reduce(reduce(createInitialSocialState(), { type: "openComposer" }), { type: "editPost", text });
}
describe("local post composer", () => {
  it("publishes a trimmed post first, with the chosen fictional achievement", () => {
    const draft = reduce(compose(" My small win "), { type: "selectAchievement", achievementId: "sample-session" });
    const result = reduce(draft, { type: "publishPost", version: draft.version, at });
    expect(result.posts[0]).toMatchObject({ text: "My small win", authorId: LOCAL_AUTHOR_ID, origin: "local", achievementId: "sample-session", createdAt: at });
    expect(result.composer).toBeNull();
    expect(postCounts(result, result.posts[0].id)).toEqual({ likes: 0, comments: 0, liked: false });
    expect(visiblePosts(reduce(result, { type: "setFilter", filter: "local" }))).toEqual([result.posts[0]]);
  });
  it.each(["", "  \n ", "x".repeat(POST_LIMIT + 1)])("rejects empty or oversized posts", (text) => {
    const state = compose(text);
    const result = reduce(state, { type: "publishPost", version: state.version, at });
    expect(result.posts).toEqual(state.posts);
    expect(result.composer?.error).toBeTruthy();
  });
  it("accepts exactly the post character limit", () => {
    const state = compose("x".repeat(POST_LIMIT));
    expect(reduce(state, { type: "publishPost", version: state.version, at }).posts).toHaveLength(samplePosts.length + 1);
  });
  it("rejects attachment-only posts and unknown achievement IDs", () => {
    const state = reduce(compose(""), { type: "selectAchievement", achievementId: "sample-session" });
    expect(reduce(state, { type: "selectAchievement", achievementId: "unknown" })).toBe(state);
    expect(reduce(state, { type: "publishPost", version: state.version, at }).posts).toEqual(state.posts);
  });
  it("prevents duplicate publishes and stale requests after reopening the composer", () => {
    const state = compose("First post");
    const action = { type: "publishPost" as const, version: state.version, at };
    const result = reduce(state, action);
    expect(reduce(result, action)).toBe(result);
    const reopened = reduce(result, { type: "openComposer" });
    expect(reduce(reopened, action)).toBe(reopened);
    expect(reopened.posts).toHaveLength(samplePosts.length + 1);
  });
  it("requires confirmation to discard, and keep editing preserves the draft", () => {
    const state = compose("Unfinished");
    expect(hasSocialDraft(state)).toBe(true);
    expect(reduce(state, { type: "confirmDiscard" })).toBe(state);
    const prompted = reduce(state, { type: "requestDiscard", target: "composer" });
    expect(reduce(prompted, { type: "cancelDiscard" }).composer).toEqual(state.composer);
    expect(reduce(prompted, { type: "editPost", text: "Blocked" })).toBe(prompted);
    expect(reduce(prompted, { type: "publishPost", version: prompted.version, at })).toBe(prompted);
    const discarded = reduce(prompted, { type: "confirmDiscard" });
    expect(discarded.composer).toBeNull();
    expect(discarded.posts).toEqual(state.posts);
    expect(hasSocialDraft(discarded)).toBe(false);
  });
  it("keeps comment drafts when cancelling only a post, and discards all on exit confirmation", () => {
    const state = reduce(compose("Post draft"), { type: "editComment", postId, text: "Comment draft" });
    const postDiscarded = reduce(reduce(state, { type: "requestDiscard", target: "composer" }), { type: "confirmDiscard" });
    expect(postDiscarded.commentDrafts[postId].text).toBe("Comment draft");
    expect(hasSocialDraft(postDiscarded)).toBe(true);
    const allDiscarded = reduce(reduce(postDiscarded, { type: "requestDiscard", target: "all" }), { type: "confirmDiscard" });
    expect(hasSocialDraft(allDiscarded)).toBe(false);
    expect(allDiscarded.comments).toEqual(state.comments);
    expect(allDiscarded.likes).toEqual(state.likes);
  });
  it("retains the current draft when opening the composer twice", () => {
    const state = compose("Keep this draft");
    expect(reduce(state, { type: "openComposer" })).toBe(state);
  });
  it.each([NaN, Infinity, -1, 8640000000000001])("ignores invalid timestamps %s", (invalidAt) => {
    const state = compose("Hello");
    expect(reduce(state, { type: "publishPost", version: state.version, at: invalidAt })).toBe(state);
    const comment = reduce(state, { type: "editComment", postId, text: "Hello" });
    expect(reduce(comment, { type: "addComment", postId, version: comment.version, at: invalidAt })).toBe(comment);
  });
  it("bounds local posts and retains an unpublished draft when full", () => {
    let state = createInitialSocialState();
    for (let i = 0; i < MAX_LOCAL_POSTS; i++) {
      state = reduce(reduce(state, { type: "openComposer" }), { type: "editPost", text: `Post ${i}` });
      state = reduce(state, { type: "publishPost", version: state.version, at });
    }
    state = reduce(reduce(state, { type: "openComposer" }), { type: "editPost", text: "One too many" });
    const result = reduce(state, { type: "publishPost", version: state.version, at });
    expect(result.posts.filter((post) => post.origin === "local")).toHaveLength(MAX_LOCAL_POSTS);
    expect(result.composer?.text).toBe("One too many");
    expect(result.composer?.error).toContain("limit");
    expect(new Set(result.posts.map((post) => post.id)).size).toBe(result.posts.length);
  });
});

describe("local fitness groups", () => {
  it("joins and leaves groups independently, with idempotent membership changes", () => {
    const initial = createInitialSocialState();
    const join = { type: "setMembership" as const, groupId: "morning", joined: true };
    let state = reduce(initial, join);
    expect(state.joinedGroupIds).toEqual(["morning"]);
    expect(reduce(state, join)).toBe(state);
    state = reduce(state, { type: "setMembership", groupId: "strength", joined: true });
    state = reduce(state, { type: "setMembership", groupId: "morning", joined: false });
    expect(state.joinedGroupIds).toEqual(["strength"]);
    expect(initial.joinedGroupIds).toEqual([]);
    expect(reduce(state, { type: "setMembership", groupId: "missing", joined: true })).toBe(state);
  });
  it("preserves membership while using feed features or discarding a post draft", () => {
    let state = reduce(compose("Draft"), { type: "setMembership", groupId: "morning", joined: true });
    state = reduce(state, { type: "toggleLike", postId });
    state = reduce(reduce(state, { type: "requestDiscard", target: "composer" }), { type: "confirmDiscard" });
    expect(state.joinedGroupIds).toEqual(["morning"]);
    expect(postCounts(state, postId).liked).toBe(true);
  });
});
