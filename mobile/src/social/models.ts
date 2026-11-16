import { WorkoutAttachment } from "../workout/workoutSharing";
import type { LocalMedia } from "./localMedia";

export type Author = {
  id: string;
  name: string;
  username: string;
  initials: string;
  bio: string;
  fictional: true;
};
export type Achievement = {
  id: string;
  title: string;
  detail: string;
  sample: true;
};
export type Post = {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
  origin: "sample" | "local";
  achievementId: string | null;
  workout?: WorkoutAttachment;
  media?: LocalMedia;
};
export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: number;
  origin: "sample" | "local";
};
export type Like = { postId: string; authorId: string };
export type Follow = { followerId: string; followingId: string };
export type FitnessGroup = {
  id: string;
  name: string;
  description: string;
  sampleMemberCount: number;
  fictional: true;
};
