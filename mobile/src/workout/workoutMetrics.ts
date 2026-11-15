export type ClockSample = { wallMs: number; monotonicMs: number | null };
export type WorkoutMetrics = {
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly durationMs: number | null;
  readonly bodyWeightKg: number | null;
  readonly estimatedKcal: number | null;
  readonly met: number;
};

// Product assumption for general resistance training, including rest: 3.5 MET.
// This is a coarse session-wide estimate, not measured intensity or net exercise energy.
// kcal = MET * body weight (kg) * elapsed hours. Reps and lifted kg are never inputs.
// Rest periods, individual physiology and exercise selection can change actual expenditure.
export const RESISTANCE_MET = 3.5;
export const MIN_ESTIMATE_DURATION_MS = 60_000;
export const CALORIE_DISCLAIMER = "Estimated using 3.5 MET, body weight and total session time, including rests. May not reflect cardio or mixed sessions. Actual calories vary; not a medical measurement.";

export function sampleClock(): ClockSample {
  const monotonic = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : null;
  return { wallMs: Date.now(), monotonicMs: monotonic !== null && Number.isFinite(monotonic) && monotonic >= 0 ? monotonic : null };
}
export function validClock(sample: ClockSample) {
  return Number.isFinite(sample.wallMs) && sample.wallMs >= 0 && sample.wallMs <= 8_640_000_000_000_000
    && (sample.monotonicMs === null || (Number.isFinite(sample.monotonicMs) && sample.monotonicMs >= 0));
}
export function elapsedDuration(start: ClockSample | null, now: ClockSample): number | null {
  if (!start || !validClock(start) || !validClock(now)) return null;
  // Same-process monotonic readings resist wall-clock adjustments. No timer ticks are accumulated.
  const difference = start.monotonicMs !== null && now.monotonicMs !== null
    ? now.monotonicMs - start.monotonicMs : now.wallMs - start.wallMs;
  return Number.isFinite(difference) ? Math.max(0, difference) : null;
}
export function validateBodyWeight(input: string): { valid: true; kg: number | null } | { valid: false; error: string } {
  const text = input.trim();
  if (!text) return { valid: true, kg: null };
  if (!/^\d{1,3}(?:\.\d{0,2})?$/.test(text) || !Number.isFinite(Number(text)) || Number(text) < 1 || Number(text) > 500) {
    return { valid: false, error: "Enter body weight from 1 to 500 kg, with up to two decimal places, or leave blank." };
  }
  return { valid: true, kg: Number(text) };
}
export function estimateCalories(bodyWeightKg: number | null, durationMs: number | null): number | null {
  if (bodyWeightKg === null || !Number.isFinite(bodyWeightKg) || bodyWeightKg < 1 || bodyWeightKg > 500
    || durationMs === null || !Number.isFinite(durationMs) || durationMs < MIN_ESTIMATE_DURATION_MS) return null;
  const kcal = RESISTANCE_MET * bodyWeightKg * durationMs / 3_600_000;
  return Number.isFinite(kcal) ? kcal : null;
}
export function finishMetrics(start: ClockSample, end: ClockSample, bodyWeightKg: number | null): WorkoutMetrics {
  const durationMs = elapsedDuration(start, end);
  return { startedAt: start.wallMs, finishedAt: end.wallMs, durationMs, bodyWeightKg,
    estimatedKcal: estimateCalories(bodyWeightKg, durationMs), met: RESISTANCE_MET };
}
export function formatDuration(durationMs: number | null | undefined): string {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) return "Time unavailable";
  const seconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(seconds / 3600);
  return [hours > 0 ? String(hours).padStart(2, "0") : null,
    String(Math.floor(seconds / 60) % 60).padStart(2, "0"), String(seconds % 60).padStart(2, "0")].filter((value) => value !== null).join(":");
}
export function formatCalories(kcal: number | null | undefined): string {
  return kcal == null || !Number.isFinite(kcal) || kcal <= 0 ? "Unavailable" : `${kcal < 1 ? "<1" : Math.round(kcal)} kcal`;
}
export function calorieStatus(bodyWeightKg: number | null, durationMs: number | null | undefined, kcal: number | null | undefined) {
  if (bodyWeightKg === null) return "Calories unavailable \u2014 add body weight";
  if (durationMs == null || !Number.isFinite(durationMs)) return "Calories unavailable \u2014 time unavailable";
  if (durationMs < MIN_ESTIMATE_DURATION_MS) return "Calories unavailable \u2014 workout under 1 minute";
  return `Estimated calories: ${formatCalories(kcal)}`;
}
