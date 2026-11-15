import { CompletedWorkout } from "./workoutState";

// Calendar-day boundaries use the device's local timezone, including DST transitions.
export function sevenDayActivity(history: readonly CompletedWorkout[], now: number) {
  if (!Number.isFinite(now) || Math.abs(now) > 8_640_000_000_000_000) return [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today); start.setDate(start.getDate() - 6 + index);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const entries = history.filter(({ metrics }) => metrics && metrics.finishedAt >= start.getTime() && metrics.finishedAt < end.getTime() && metrics.finishedAt <= now);
    return { date: start.getTime(), count: entries.length, durationMs: entries.reduce((sum, workout) => sum + (workout.metrics?.durationMs ?? 0), 0) };
  });
}
