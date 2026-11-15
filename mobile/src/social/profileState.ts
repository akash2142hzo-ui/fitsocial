import { CompletedWorkout, summarizeHistory } from "../workout/workoutState";
import { LOCAL_AUTHOR_ID } from "./sampleData";
import { SocialState } from "./socialState";

export function postsForAuthor(state: SocialState, authorId: string) {
  return state.posts.filter((post) => post.authorId === authorId && (authorId !== LOCAL_AUTHOR_ID || post.origin === "local"));
}
export function followStats(state: SocialState, authorId: string) {
  return {
    followers: state.follows.filter((edge) => edge.followingId === authorId).length,
    following: state.follows.filter((edge) => edge.followerId === authorId).length,
    followedLocally: state.follows.some((edge) => edge.followerId === LOCAL_AUTHOR_ID && edge.followingId === authorId),
  };
}
export function personalProfileStats(state: SocialState, history: readonly CompletedWorkout[]) {
  return { ...summarizeHistory(history), postCount: postsForAuthor(state, LOCAL_AUTHOR_ID).length, ...followStats(state, LOCAL_AUTHOR_ID) };
}
