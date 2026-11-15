import { formatLoggedSet, formatWorkoutTotals, summarizeWorkout } from "../workout/workoutState";
import { CALORIE_DISCLAIMER, calorieStatus, formatDuration } from "../workout/workoutMetrics";
import { Author, Post } from "./models";
import { achievements, authors } from "./sampleData";

export function postMetaLabel(origin: Post["origin"]): string {
  return origin === "sample" ? "Sample" : "Local";
}

export function formatPostTimestamp(at: number, now = Date.now()): string {
  if (!Number.isFinite(at) || at < 0 || at > 8_640_000_000_000_000) return "Time unavailable";
  const delta = now - at;
  if (delta >= 0 && delta < 60_000) return "Now";
  if (delta >= 60_000 && delta < 3_600_000) return String(Math.floor(delta / 60_000)) + "m";
  if (delta >= 3_600_000 && delta < 86_400_000) return String(Math.floor(delta / 3_600_000)) + "h";
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(new Date(at).getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}) });
}

// Display-only text for an on-device preview. This never invokes a share service.
export function formatSharePreview(post: Post, identity?: Author): string {
  const author = identity ?? authors.find((entry) => entry.id === post.authorId);
  const lines = [
    "FitSocial · local sharing preview",
    "Nothing is sent, uploaded, or saved.",
    `${author?.name ?? "Demo author"} · fictional demo profile`,
    post.origin === "sample" ? "Fictional sample post" : "Your local post",
    new Date(post.createdAt).toISOString(),
  ];
  if (post.text) lines.push(post.text);
  if (post.workout) {
    const attachment = post.workout;
    lines.push(`Actual completed local workout ${attachment.workoutId}`);
    lines.push(formatWorkoutTotals(attachment.sets));
    lines.push(`Duration ${formatDuration(attachment.metrics?.durationMs)}`);
    lines.push(calorieStatus(attachment.metrics?.bodyWeightKg ?? null, attachment.metrics?.durationMs, attachment.metrics?.estimatedKcal));
    if (attachment.metrics?.estimatedKcal != null) lines.push(CALORIE_DISCLAIMER);
    for (const group of summarizeWorkout(attachment.sets).groups) {
      lines.push(group.exercise);
      group.sets.forEach((set, index) => lines.push(
        `${set.tracking === "cardio" ? "Activity" : "Set"} ${index + 1}: ${formatLoggedSet(set)}`,
      ));
    }
  } else {
    const achievement = achievements.find((entry) => entry.id === post.achievementId);
    if (achievement) lines.push(`Fictional sample: ${achievement.title}`, achievement.detail);
  }
  return lines.join("\n\n");
}
