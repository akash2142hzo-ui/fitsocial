import { createTrainerState, TrainerAction, trainerReducer, TrainerState } from "./trainerState";
import { initialFitness, initialProfile, LocalProfile, FitnessPreferences, FutureVisibility, SettingsDraft, SettingsValues, validateSettings } from "./settingsState";
import { Comment, Follow, Like, Post } from "./models";
import { achievements, authors, groups, LOCAL_AUTHOR_ID, sampleComments, sampleLikes, samplePosts } from "./sampleData";
import { CompletedWorkout } from "../workout/workoutState";
import { createWorkoutAttachment, WorkoutAttachment } from "../workout/workoutSharing";
import { identityFor } from "./trainerIdentity";
import { LocalMedia, mediaValidationError } from "./localMedia";

export const COMMENT_LIMIT = 300;
export const MAX_COMMENTS_PER_POST = 100;
export const POST_LIMIT = 500;
export const MAX_LOCAL_POSTS = 50;
export const BIO_LIMIT = 160;
export type Composer = { id: string; text: string; achievementId: string | null; workout: WorkoutAttachment | null; error: string | null; media?: LocalMedia; mediaPending?: string };
type CommentDraft = { text: string; error: string | null };
export type FeedFilter = "all" | "following" | "local";
export type SocialState = {
  localProfile: LocalProfile;
  fitness: FitnessPreferences;
  futureVisibility: FutureVisibility;
  settingsDraft: SettingsDraft | null;
  trainers: TrainerState;
  posts: Post[];
  comments: Comment[];
  likes: Like[];
  expandedComments: string[];
  expandedAuthors: string[];
  commentDrafts: Record<string, CommentDraft>;
  filter: FeedFilter;
  feedQuery: string;
  version: number;
  nextId: number;
  composer: Composer | null;
  drafts: Composer[];
  nextDraftId: number;
  viewingDrafts: boolean;
  discardDraftId: string | null;
  discardPrompt: "composer" | "all" | "draft" | null;
  joinedGroupIds: string[];
  shareNotice: string | null;
  localBio: string;
  follows: Follow[];
};
export function createInitialSocialState(): SocialState {
  return {
    localProfile: { ...initialProfile }, fitness: { ...initialFitness }, futureVisibility: "Not set", settingsDraft: null,
    trainers: createTrainerState(),
    posts: samplePosts.map((post) => ({ ...post })),
    comments: sampleComments.map((comment) => ({ ...comment })),
    likes: sampleLikes.map((like) => ({ ...like })),
    expandedComments: [], expandedAuthors: [], commentDrafts: {}, filter: "all", feedQuery: "", version: 0, nextId: 1,
    composer: null, drafts: [], nextDraftId: 1, viewingDrafts: false, discardDraftId: null, discardPrompt: null, joinedGroupIds: [], shareNotice: null,
    localBio: authors.find((author) => author.id === LOCAL_AUTHOR_ID)!.bio, follows: [],
  };
}
export type SocialAction =
  | { type: "openSettingsEditor"; section: SettingsDraft["section"] }
  | { type: "editSettings"; field: Exclude<keyof SettingsValues, "photo">; value: string }
  | { type: "beginProfilePhoto"; token: string }
  | { type: "finishProfilePhoto"; token: string; photo?: LocalMedia; error?: string }
  | { type: "removeProfilePhoto" }
  | { type: "profilePhotoError"; error: string; photoId?: string }
  | { type: "profilePhotoAvailable"; photoId: string }
  | { type: "saveSettings" | "closeSettingsEditor" | "confirmSettingsDiscard" | "keepSettingsEditing" }
  | { type: "trainer"; action: TrainerAction }
  | { type: "toggleLike" | "toggleComments"; postId: string }
  | { type: "toggleAuthor"; authorId: string }
  | { type: "setFilter"; filter: FeedFilter }
  | { type: "searchFeed"; query: string }
  | { type: "editComment"; postId: string; text: string }
  | { type: "addComment"; postId: string; version: number; at: number }
  | { type: "openComposer" | "cancelDiscard" | "confirmDiscard" }
  | { type: "saveDraft" | "openDrafts" | "continueComposer" | "newTextDraft" }
  | { type: "resumeDraft" | "requestDiscardDraft"; id: string }
  | { type: "editPost"; text: string }
  | { type: "beginMedia"; draftId: string; token: string }
  | { type: "finishMedia"; draftId: string; token: string; media?: LocalMedia; error?: string }
  | { type: "removeMedia"; draftId: string }
  | { type: "mediaUnavailable"; id: string }
  | { type: "selectAchievement"; achievementId: string | null }
  | { type: "publishPost"; version: number; at: number }
  | { type: "requestDiscard"; target: "composer" | "all" }
  | { type: "setMembership"; groupId: string; joined: boolean }
  | { type: "shareWorkout"; workout: CompletedWorkout }
  | { type: "editBio"; text: string }
  | { type: "setFollow"; authorId: string; following: boolean };

export function validateSocialText(text: string, limit: number, label: string): string | null {
  if (!text.trim()) return `Write ${label} before submitting.`;
  if (text.length > limit) return `Keep ${label} to ${limit} characters or fewer.`;
  return null;
}
const toggleId = (ids: string[], id: string) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
export const validTimestamp = (at: number) => Number.isFinite(at) && at >= 0 && at <= 8640000000000000;
export function postCounts(state: SocialState, postId: string) {
  return {
    likes: state.likes.filter((like) => like.postId === postId).length,
    comments: state.comments.filter((comment) => comment.postId === postId).length,
    liked: state.likes.some((like) => like.postId === postId && like.authorId === LOCAL_AUTHOR_ID),
  };
}
export function visiblePosts(state: SocialState) {
  const terms = state.feedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const followed = new Set(state.follows.filter((edge) => edge.followerId === LOCAL_AUTHOR_ID).map((edge) => edge.followingId));
  // Published records only. Sorting a filtered copy never reorders the reducer's posts.
  return state.posts.filter((post) => state.filter === "all"
    || (state.filter === "following" ? followed.has(post.authorId) : post.authorId === LOCAL_AUTHOR_ID && post.origin === "local"))
    .filter((post) => {
      const author = identityFor(state, post.authorId);
      const searchable = [post.text, author?.name, author?.username,
        ...(post.workout?.sets.map((set) => set.exercise) ?? [])].join(" ").toLowerCase();
      return terms.every((term) => searchable.includes(term));
    })
    .sort((a, b) => {
      const time = (validTimestamp(b.createdAt) ? b.createdAt : -1) - (validTimestamp(a.createdAt) ? a.createdAt : -1);
      return time || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
}
function update(state: SocialState, patch: Partial<SocialState>): SocialState {
  return { ...state, ...patch, version: state.version + 1 };
}
export function hasSocialDraft(state: SocialState) {
  return state.composer !== null || state.drafts.length > 0 || Object.values(state.commentDrafts).some((draft) => draft.text.length > 0);
}
// Publication is the source of truth; neither a draft nor a cancelled composer counts.
export function publishedWorkoutPost(state: SocialState, workoutId: number) {
  return state.posts.find((post) => post.origin === "local" && post.authorId === LOCAL_AUTHOR_ID
    && post.workout?.source === "local-workout" && post.workout.workoutId === workoutId);
}
export function workoutDraft(state: SocialState, workoutId: number) {
  return [state.composer, ...state.drafts].find((draft) => draft?.workout?.workoutId === workoutId) ?? undefined;
}
// Shared by the publish reducer and the disabled state of the composer action.
export function postValidationError(state: SocialState): string | null {
  if (!state.composer) return "Open a post draft first.";
  if (state.composer.mediaPending) return "Wait for media selection to finish.";
  if (state.composer.media) {
    const error = mediaValidationError(state.composer.media);
    if (error) return error;
  }
  return ((state.composer.workout || state.composer.media) && !state.composer.text.trim() && state.composer.text.length <= POST_LIMIT
        ? null : validateSocialText(state.composer.text, POST_LIMIT, "a post"))
        ?? (state.posts.filter((post) => post.origin === "local").length >= MAX_LOCAL_POSTS ? "This demo has reached its 50-post limit." : null);
}
export function socialReducer(state: SocialState, action: SocialAction): SocialState {
  if (state.discardPrompt && action.type !== "cancelDiscard" && action.type !== "confirmDiscard") return state;
  switch (action.type) {
    case "openSettingsEditor": {
      if (state.settingsDraft) return state;
      const values = { ...state.localProfile, ...state.fitness, bio: state.localBio, futureVisibility: state.futureVisibility };
      return update(state, { settingsDraft: { section: action.section, original: { ...values }, values, error: null, confirming: false } });
    }
    case "editSettings": {
      const draft = state.settingsDraft;
      if (!draft || draft.confirming) return state;
      const profileFields = ["displayName", "username", "bio", "location", "avatar"];
      const allowed = draft.section === "profile" ? profileFields : draft.section === "fitness" ? ["heightCm", "bodyWeightKg", "units"] : ["futureVisibility"];
      if (!allowed.includes(action.field)) return state;
      return update(state, { settingsDraft: { ...draft, values: { ...draft.values, [action.field]: action.value, ...(action.field === "avatar" ? { photo: null } : {}) }, ...(action.field === "avatar" ? { photoPending: undefined, photoUnavailableId: undefined } : {}), error: null } });
    }
    case "beginProfilePhoto": {
      const draft = state.settingsDraft;
      if (draft?.section !== "profile" || draft.confirming || draft.photoPending) return state;
      return update(state, { settingsDraft: { ...draft, photoPending: action.token, error: null } });
    }
    case "finishProfilePhoto": {
      const draft = state.settingsDraft;
      if (draft?.section !== "profile" || draft.confirming || draft.photoPending !== action.token) return state;
      const valid = action.photo?.kind === "photo" && !mediaValidationError(action.photo);
      return update(state, { settingsDraft: { ...draft, photoPending: undefined, ...(valid ? { photoUnavailableId: undefined } : {}),
        values: valid ? { ...draft.values, photo: action.photo } : draft.values,
        error: action.error ?? (action.photo && !valid ? "Choose a supported profile photo." : null) } });
    }
    case "removeProfilePhoto": {
      const draft = state.settingsDraft;
      if (draft?.section !== "profile" || draft.confirming) return state;
      return update(state, { settingsDraft: { ...draft, values: { ...draft.values, photo: null }, photoPending: undefined, photoUnavailableId: undefined, error: null } });
    }
    case "profilePhotoError": {
      const draft = state.settingsDraft;
      if (draft?.section !== "profile" || draft.confirming || action.photoId && draft.values.photo?.id !== action.photoId) return state;
      return update(state, { settingsDraft: { ...draft, error: action.error, ...(action.photoId ? { photoUnavailableId: action.photoId } : {}) } });
    }
    case "profilePhotoAvailable": {
      const draft = state.settingsDraft;
      if (draft?.section !== "profile" || draft.confirming || draft.values.photo?.id !== action.photoId || draft.photoUnavailableId !== action.photoId) return state;
      return update(state, { settingsDraft: { ...draft, photoUnavailableId: undefined,
        error: draft.error?.startsWith("Profile photo is unavailable.") ? null : draft.error } });
    }
    case "confirmSettingsDiscard": return state.settingsDraft ? update(state, { settingsDraft: { ...state.settingsDraft, confirming: true, photoPending: undefined } }) : state;
    case "keepSettingsEditing": return state.settingsDraft ? update(state, { settingsDraft: { ...state.settingsDraft, confirming: false } }) : state;
    case "closeSettingsEditor": return update(state, { settingsDraft: null });
    case "saveSettings": {
      const draft = state.settingsDraft;
      if (!draft || draft.confirming || draft.photoPending) return state;
      const error = validateSettings(draft, authors.filter((author) => author.id !== LOCAL_AUTHOR_ID).map((author) => state.trainers.profiles[author.id]?.username ?? author.username));
      if (error) return update(state, { settingsDraft: { ...draft, error } });
      const value = draft.values;
      if (draft.section === "privacy") return update(state, { futureVisibility: value.futureVisibility, settingsDraft: null });
      if (draft.section === "fitness") return update(state, { fitness: { heightCm: value.heightCm.trim(), bodyWeightKg: value.bodyWeightKg.trim(), units: "Metric" }, settingsDraft: null });
      const localProfile = { displayName: value.displayName.trim(), username: value.username.trim(), location: value.location.trim(), avatar: value.avatar, photo: value.photo ?? null };
      const profile = state.trainers.profiles[LOCAL_AUTHOR_ID];
      return update(state, { localProfile, localBio: value.bio.trim(), settingsDraft: null,
        trainers: profile ? { ...state.trainers, profiles: { ...state.trainers.profiles, [LOCAL_AUTHOR_ID]: { ...profile, displayName: localProfile.displayName, username: localProfile.username, location: localProfile.location, bio: value.bio.trim() } } } : state.trainers });
    }
    case "trainer": {
      const event = action.action;
      if ("authorId" in event && event.authorId !== LOCAL_AUTHOR_ID) return state;
      const safeEvent = event.type === "save" ? { ...event, reservedUsernames: authors.filter((entry) => entry.id !== LOCAL_AUTHOR_ID).map((entry) => state.trainers.profiles[entry.id]?.username ?? entry.username) } : event;
      const trainers = trainerReducer(state.trainers, safeEvent);
      if (trainers === state.trainers) return state;
      const profile = trainers.profiles[LOCAL_AUTHOR_ID];
      return update(state, { trainers, ...(event.type === "save" && !trainers.draft ? { localBio: profile.bio,
        localProfile: { ...state.localProfile, displayName: profile.displayName, username: profile.username, location: profile.location } } : {}) });
    }
    case "editBio":
      return action.text.length <= BIO_LIMIT ? update(state, { localBio: action.text, trainers: state.trainers.profiles[LOCAL_AUTHOR_ID]
        ? { ...state.trainers, profiles: { ...state.trainers.profiles, [LOCAL_AUTHOR_ID]: { ...state.trainers.profiles[LOCAL_AUTHOR_ID], bio: action.text } } } : state.trainers }) : state;
    case "setFollow": {
      if (action.authorId === LOCAL_AUTHOR_ID || !authors.some((author) => author.id === action.authorId)) return state;
      const following = state.follows.some((edge) => edge.followerId === LOCAL_AUTHOR_ID && edge.followingId === action.authorId);
      if (following === action.following) return state;
      return update(state, { follows: action.following
        ? [...state.follows, { followerId: LOCAL_AUTHOR_ID, followingId: action.authorId }]
        : state.follows.filter((edge) => !(edge.followerId === LOCAL_AUTHOR_ID && edge.followingId === action.authorId)) });
    }
    case "shareWorkout": {
      if (!Number.isInteger(action.workout.id) || action.workout.id < 1 || action.workout.sets.length === 0) return state;
      if (publishedWorkoutPost(state, action.workout.id)) return state;
      if (state.composer?.workout?.workoutId === action.workout.id) {
        return state.viewingDrafts || state.shareNotice ? update(state, { viewingDrafts: false, shareNotice: null }) : state;
      }
      if (state.composer) return update(state, { shareNotice: "A post draft is already open. Save it as a draft, publish or discard it first, then return to Train or Progress and share your workout again." });
      const existing = state.drafts.find((draft) => draft.workout?.workoutId === action.workout.id);
      if (existing) return update(state, { composer: existing, drafts: state.drafts.filter((draft) => draft.id !== existing.id), viewingDrafts: false, shareNotice: null });
      return update(state, { composer: { id: `draft-${state.nextDraftId}`, text: "", achievementId: null, workout: createWorkoutAttachment(action.workout), error: null },
        nextDraftId: state.nextDraftId + 1, viewingDrafts: false, shareNotice: null });
    }
    case "setMembership": {
      if (!groups.some((group) => group.id === action.groupId) || state.joinedGroupIds.includes(action.groupId) === action.joined) return state;
      return update(state, { joinedGroupIds: action.joined
        ? [...state.joinedGroupIds, action.groupId]
        : state.joinedGroupIds.filter((id) => id !== action.groupId) });
    }
    case "openDrafts": return update(state, { viewingDrafts: true, shareNotice: null,
      ...(state.composer ? { composer: { ...state.composer, mediaPending: undefined } } : {}) });
    case "continueComposer": return state.composer ? update(state, { viewingDrafts: false, shareNotice: null }) : state;
    case "saveDraft":
      if (!state.composer || state.composer.mediaPending) return state;
      return update(state, { drafts: [...state.drafts.filter((draft) => draft.id !== state.composer!.id), { ...state.composer, error: null }],
        composer: null, viewingDrafts: true, shareNotice: null });
    case "resumeDraft": {
      const draft = state.drafts.find((entry) => entry.id === action.id);
      if (!draft) return state;
      if (state.composer) return update(state, { shareNotice: "A post draft is already open. Save it as a draft or discard it before resuming another." });
      if (draft.workout && publishedWorkoutPost(state, draft.workout.workoutId)) return state;
      return update(state, { composer: draft, drafts: state.drafts.filter((entry) => entry.id !== action.id), viewingDrafts: false, shareNotice: null });
    }
    case "requestDiscardDraft":
      return state.drafts.some((draft) => draft.id === action.id)
        ? update(state, { discardPrompt: "draft", discardDraftId: action.id }) : state;
    case "newTextDraft":
      if (state.composer) return update(state, { viewingDrafts: false });
      return update(state, { composer: { id: `draft-${state.nextDraftId}`, text: "", achievementId: null, workout: null, error: null },
        nextDraftId: state.nextDraftId + 1, viewingDrafts: false, shareNotice: null });
    case "openComposer":
      return state.composer ? state : state.drafts.length || state.viewingDrafts
        ? update(state, { viewingDrafts: true })
        : update(state, { composer: { id: `draft-${state.nextDraftId}`, text: "", achievementId: null, workout: null, error: null },
          nextDraftId: state.nextDraftId + 1, viewingDrafts: false, shareNotice: null });
    case "editPost":
      return state.composer ? update(state, { composer: { ...state.composer, text: action.text, error: null } }) : state;
    case "beginMedia":
      return state.composer?.id === action.draftId && !state.composer.mediaPending && !state.viewingDrafts
        ? update(state, { composer: { ...state.composer, mediaPending: action.token, error: null } }) : state;
    case "finishMedia": {
      const composer = state.composer;
      if (!composer || composer.id !== action.draftId || composer.mediaPending !== action.token) return state;
      const error = action.media ? mediaValidationError(action.media) : action.error;
      return update(state, { composer: { ...composer, mediaPending: undefined, error: error ?? null,
        ...(!error && action.media ? { media: { ...action.media } } : {}) } });
    }
    case "removeMedia":
      return state.composer?.id === action.draftId && !state.composer.mediaPending
        ? update(state, { composer: { ...state.composer, media: undefined, error: null } }) : state;
    case "mediaUnavailable": {
      const mark = (media: LocalMedia | undefined) => media?.id === action.id ? { ...media, unavailable: true } : media;
      const entries = [state.composer, ...state.drafts, ...state.posts];
      if (!entries.some((entry) => entry?.media?.id === action.id && !entry.media.unavailable)) return state;
      return update(state, { composer: state.composer ? { ...state.composer, media: mark(state.composer.media) } : null,
        drafts: state.drafts.map((draft) => ({ ...draft, media: mark(draft.media) })),
        posts: state.posts.map((post) => ({ ...post, media: mark(post.media) })) });
    }
    case "selectAchievement":
      if (!state.composer || state.composer.workout || (action.achievementId !== null && !achievements.some((entry) => entry.id === action.achievementId))) return state;
      return update(state, { composer: { ...state.composer, achievementId: action.achievementId, error: null } });
    case "publishPost": {
      if (!state.composer || action.version !== state.version || !validTimestamp(action.at)) return state;
      if (state.composer.workout && publishedWorkoutPost(state, state.composer.workout.workoutId)) return state;
      const error = postValidationError(state);
      if (error) return update(state, { composer: { ...state.composer, error } });
      return update(state, {
        posts: [{ id: `local-post-${state.nextId}`, authorId: LOCAL_AUTHOR_ID, text: state.composer.text.trim(),
          createdAt: action.at, origin: "local", achievementId: state.composer.achievementId,
          ...(state.composer.media ? { media: { ...state.composer.media } } : {}),
          ...(state.composer.workout ? { workout: createWorkoutAttachment({ id: state.composer.workout.workoutId, sets: state.composer.workout.sets,
            metrics: state.composer.workout.metrics }) } : {}),
        }, ...state.posts],
        drafts: state.drafts.filter((draft) => draft.id !== state.composer!.id
          && !(state.composer!.workout && draft.workout?.workoutId === state.composer!.workout.workoutId)),
        composer: null, viewingDrafts: false, nextId: state.nextId + 1, shareNotice: null, filter: "all", feedQuery: "",
      });
    }
    case "requestDiscard":
      if (action.target === "composer" ? !state.composer : !hasSocialDraft(state)) return state;
      return update(state, { discardPrompt: action.target,
        ...(state.composer ? { composer: { ...state.composer, mediaPending: undefined } } : {}) });
    case "cancelDiscard": return state.discardPrompt ? update(state, { discardPrompt: null, discardDraftId: null }) : state;
    case "confirmDiscard":
      if (!state.discardPrompt) return state;
      if (state.discardPrompt === "draft") return update(state, {
        drafts: state.drafts.filter((draft) => draft.id !== state.discardDraftId), discardPrompt: null, discardDraftId: null, shareNotice: null,
      });
      return update(state, { composer: null, discardPrompt: null, discardDraftId: null, shareNotice: null,
        ...(state.discardPrompt === "all" ? { commentDrafts: {}, drafts: [] } : {}) });
    case "setFilter": return update(state, { filter: action.filter });
    case "searchFeed": return { ...state, feedQuery: action.query.slice(0, 80) };
    case "toggleAuthor":
      return authors.some((author) => author.id === action.authorId)
        ? update(state, { expandedAuthors: toggleId(state.expandedAuthors, action.authorId) }) : state;
    case "toggleComments":
      return state.posts.some((post) => post.id === action.postId)
        ? update(state, { expandedComments: toggleId(state.expandedComments, action.postId) }) : state;
    case "toggleLike": {
      if (!state.posts.some((post) => post.id === action.postId)) return state;
      const liked = postCounts(state, action.postId).liked;
      return update(state, { likes: liked
        ? state.likes.filter((like) => !(like.postId === action.postId && like.authorId === LOCAL_AUTHOR_ID))
        : [...state.likes, { postId: action.postId, authorId: LOCAL_AUTHOR_ID }] });
    }
    case "editComment":
      if (!state.posts.some((post) => post.id === action.postId)) return state;
      return update(state, { commentDrafts: { ...state.commentDrafts, [action.postId]: { text: action.text, error: null } } });
    case "addComment": {
      if (action.version !== state.version || !validTimestamp(action.at)
        || !state.posts.some((post) => post.id === action.postId)) return state;
      const text = state.commentDrafts[action.postId]?.text ?? "";
      const error = validateSocialText(text, COMMENT_LIMIT, "a comment")
        ?? (postCounts(state, action.postId).comments >= MAX_COMMENTS_PER_POST ? "This local post has reached its 100-comment limit." : null);
      if (error) return update(state, { commentDrafts: { ...state.commentDrafts, [action.postId]: { text, error } } });
      return update(state, {
        comments: [...state.comments, { id: `local-comment-${state.nextId}`, postId: action.postId,
          authorId: LOCAL_AUTHOR_ID, text: text.trim(), createdAt: action.at, origin: "local" }],
        nextId: state.nextId + 1,
        commentDrafts: { ...state.commentDrafts, [action.postId]: { text: "", error: null } },
      });
    }
  }
}
