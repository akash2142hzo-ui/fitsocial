import { CompletedWorkout, summarizeHistory } from "./workoutState";

// Presentation-only calendar subset; existing workout calculations remain unchanged.
export function trainingWeek(history: readonly CompletedWorkout[], now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const workouts = history.filter(({ metrics }) => metrics && Number.isFinite(metrics.finishedAt)
    && metrics.finishedAt >= start.getTime() && metrics.finishedAt <= now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start); day.setDate(day.getDate() + index);
    const end = new Date(day); end.setDate(end.getDate() + 1);
    return { date: day.getTime(), count: workouts.filter(({ metrics }) => metrics!.finishedAt >= day.getTime() && metrics!.finishedAt < end.getTime()).length };
  });
  return { start: start.getTime(), totals: summarizeHistory(workouts), days };
}
