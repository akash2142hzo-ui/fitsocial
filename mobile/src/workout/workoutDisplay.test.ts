import { entryDisplay } from "./workoutDisplay";
import { LoggedSet } from "./workoutState";

const entry: LoggedSet = { id: 1, exerciseId: "cardio-incline-treadmill-walking", exercise: "Incline Treadmill Walking", tracking: "cardio", reps: 0, weight: null, durationSeconds: 1500, cardio: { speedKmh: 4.5, inclinePercent: 8 } };
it("formats compact cardio units without changing the recorded snapshot", () => {
  const before = JSON.stringify(entry);
  expect(entryDisplay(entry)).toBe("25 min \u00b7 4.5 km/h \u00b7 8% incline");
  expect(JSON.stringify(entry)).toBe(before);
});
it.each([[45, "45 sec"], [60, "1 min"], [61, "1 min 1 sec"], [3600, "60 min"]])("preserves duration precision for %s seconds", (seconds, label) => {
  expect(entryDisplay({ ...entry, durationSeconds: seconds, cardio: {} })).toBe(label);
});
it("preserves explicit zero versus missing values and distinguishes resistance units", () => {
  expect(entryDisplay({ ...entry, cardio: { distanceKm: 0, resistance: 0 } })).toBe("25 min \u00b7 0 km \u00b7 0 resistance level");
  expect(entryDisplay({ ...entry, durationSeconds: undefined, cardio: {} })).toBe("Time unavailable");
});
it("keeps legacy, added and assisted weight labels intact", () => {
  const set: LoggedSet = { id: 1, exerciseId: "push-up", exercise: "Push-up", reps: 8, weight: 0 };
  expect(entryDisplay(set)).toContain("0 kg");
  expect(entryDisplay({ ...set, tracking: "bodyweight" })).toContain("0 kg added");
  expect(entryDisplay({ ...set, tracking: "assisted", weight: 30 })).toContain("30 kg assistance");
  expect(entryDisplay({ ...set, tracking: "bodyweight", weight: null })).toContain("No additional weight");
});
it("retains derived running pace", () => {
  expect(entryDisplay({ ...entry, cardioCategory: "Running", cardio: { distanceKm: 5 } })).toContain("5:00 min/km");
});
