import { Achievement, Author, Comment, FitnessGroup, Like, Post } from "./models";

// Fictional examples only. The local persona is not an authenticated identity.
export const LOCAL_AUTHOR_ID = "demo-persona";
export const authors: readonly Author[] = [
  { id: LOCAL_AUTHOR_ID, name: "You \u00b7 demo persona", username: "fitsocial_demo", initials: "YOU", bio: "Moving at my pace. Here for the small wins.", fictional: true },
  { id: "maya", name: "Maya R.", username: "maya_moves_demo", initials: "MR", bio: "Morning walks and small wins.", fictional: true },
  { id: "alex", name: "Alex T.", username: "alex_trains_demo", initials: "AT", bio: "Trying new routines. Cheering on friends.", fictional: true },
  { id: "sam", name: "Sam K.", username: "sam_steps_demo", initials: "SK", bio: "Walks, weekend movement and community conversations.", fictional: true },
];
export const achievements: readonly Achievement[] = [
  { id: "sample-session", title: "Showing up", detail: "Sample achievement: 3 exercises and 9 sets. Not from your workout logger.", sample: true },
  { id: "sample-milestone", title: "A week of movement", detail: "Sample achievement: 3 sessions in a fictional week. Not your activity.", sample: true },
];
export const samplePosts: readonly Post[] = [
  { id: "sample-maya", authorId: "maya", text: "Made a little time to move today. Counting the small wins!", createdAt: Date.UTC(2026, 10, 14, 6), origin: "sample", achievementId: "sample-session" },
  { id: "sample-alex", authorId: "alex", text: "Trying a new routine this week. Here is to showing up at our own pace.", createdAt: Date.UTC(2026, 10, 13, 8), origin: "sample", achievementId: null },
  { id: "sample-alex-learning", authorId: "alex", text: "Training notebook: I record the exercise, reps and how the session felt. Looking back helps me notice patterns beyond the weight on the bar. What do you like to track?", createdAt: Date.UTC(2026, 10, 14, 5), origin: "sample", achievementId: null },
  { id: "sample-sam-community", authorId: "sam", text: "Weekend check-in: a walk, a stretch break or a rest day all have a place here. What kind of movement are you making time for?", createdAt: Date.UTC(2026, 10, 13, 9), origin: "sample", achievementId: null },
];
export const sampleComments: readonly Comment[] = [
  { id: "sample-comment", postId: "sample-maya", authorId: "alex", text: "Cheering you on!", createdAt: Date.UTC(2026, 10, 14, 7), origin: "sample" },
];
export const sampleLikes: readonly Like[] = [{ postId: "sample-maya", authorId: "alex" }];
export const groups: readonly FitnessGroup[] = [
  { id: "morning", name: "Morning movers", description: "Start the day with a little movement.", sampleMemberCount: 128, fictional: true },
  { id: "strength", name: "Strength circle", description: "Talk routines. Share wins. Encourage each other.", sampleMemberCount: 86, fictional: true },
];
