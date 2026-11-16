import { trainingWeek } from "./trainDashboardPresentation";
import { CompletedWorkout, LoggedSet } from "./workoutState";

const reps: LoggedSet = { id: 1, exerciseId: "push-up", exercise: "Push-up", tracking: "bodyweight", reps: 8, weight: null };
const timed: LoggedSet = { id: 2, exerciseId: "plank", exercise: "Plank", tracking: "duration", reps: 0, weight: null, durationSeconds: 60 };
function record(id: number, finishedAt: number, sets = [reps]): CompletedWorkout {
  return { id, sets, metrics: { startedAt: finishedAt - 60_000, finishedAt, durationMs: null, bodyWeightKg: null, estimatedKcal: null, met: 3.5 } };
}
it("uses a local Monday boundary and excludes older, future and undated saves without mutating history", () => {
  const now = new Date(2026, 10, 15, 12).getTime(); // Sunday.
  const monday = new Date(2026, 10, 9).getTime();
  const history = [record(1, monday), record(2, monday - 1), record(3, now + 1), { id: 4, sets: [reps] }, record(5, NaN)];
  const before = JSON.stringify(history);
  const week = trainingWeek(history, now);
  expect(week.start).toBe(monday); expect(week.totals.workoutCount).toBe(1);
  expect(JSON.stringify(history)).toBe(before);
});
it("counts actual logged entries, rep-mode reps and distinct exercises using existing summaries", () => {
  const now = new Date(2026, 10, 15, 12).getTime();
  const result = trainingWeek([record(1, now, [reps, timed]), record(2, now, [reps])], now);
  expect(result.totals).toMatchObject({ workoutCount: 2, setCount: 3, reps: 16, distinctExercises: 2, estimatedKcal: null });
});
it("rolls over at Monday midnight rather than using a rolling seven-day count", () => {
  const monday = new Date(2026, 10, 16).getTime();
  expect(trainingWeek([record(1, monday - 1)], monday).totals.workoutCount).toBe(0);
  expect(trainingWeek([record(1, monday)], monday).totals.workoutCount).toBe(1);
});
it("returns honest zero totals for an empty week without fabricated duration or energy", () => {
  expect(trainingWeek([], Date.now()).totals).toMatchObject({ workoutCount: 0, setCount: 0, reps: 0, distinctExercises: 0, estimatedKcal: null });
});


it("builds a Monday-to-Sunday strip from local date boundaries with real saved counts only", () => {
  const monday = new Date(2026, 10, 9).getTime(); const sunday = new Date(2026, 10, 15, 12).getTime();
  const week = trainingWeek([record(1, monday), record(2, monday + 60_000), record(3, sunday), record(4, sunday + 1), record(5, monday - 1)], sunday);
  expect(week.days.map((day) => day.count)).toEqual([2, 0, 0, 0, 0, 0, 1]);
  expect(week.days[0].date).toBe(monday);
  expect(week.days.reduce((total, day) => total + day.count, 0)).toBe(week.totals.workoutCount);
  for (const [index, day] of week.days.entries()) {
    const expected = new Date(monday); expected.setDate(expected.getDate() + index);
    expect(day.date).toBe(expected.getTime()); expect(new Date(day.date).getHours()).toBe(0);
  }
});
it("keeps future weekdays empty during the current week and handles a month boundary", () => {
  const now = new Date(2026, 2, 2, 12).getTime();
  const week = trainingWeek([record(1, now), record(2, new Date(2026, 2, 3).getTime())], now);
  expect(week.days.map((day) => day.count)).toEqual([1, 0, 0, 0, 0, 0, 0]);
});
