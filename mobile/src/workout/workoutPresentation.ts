import { CompletedWorkout } from "./workoutState";

export function todayWorkoutCount(history: readonly CompletedWorkout[], nowMs: number) {
  if (!Number.isFinite(nowMs)) return 0;
  const today = new Date(nowMs).toDateString();
  return history.filter(({ metrics }) => metrics && new Date(metrics.finishedAt).toDateString() === today).length;
}

export function relativeWorkoutTime(at: number | undefined, now: number): string {
  if (at === undefined || !Number.isFinite(at) || !Number.isFinite(now) || at < 0) return "Time unavailable";
  const age = now - at;
  if (age < 0) return new Date(at).toLocaleDateString();
  if (age < 60_000) return "Just now";
  if (age < 3_600_000) return String(Math.floor(age / 60_000)) + " min ago";
  if (age < 86_400_000) return String(Math.floor(age / 3_600_000)) + " hours ago";
  const days = Math.floor(age / 86_400_000);
  return String(days) + (days === 1 ? " day ago" : " days ago");
}
