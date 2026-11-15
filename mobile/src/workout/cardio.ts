export const cardioMetrics = {
  distanceKm: { label: "Distance (km)", max: 1000, integer: false },
  speedKmh: { label: "Speed (km/h)", max: 100, integer: false },
  inclinePercent: { label: "Incline (%)", max: 40, integer: false },
  resistance: { label: "Resistance level (machine units)", max: 100, integer: false },
  floors: { label: "Floors", max: 10000, integer: true },
  steps: { label: "Steps", max: 100000, integer: true },
} as const;
export type CardioMetric = keyof typeof cardioMetrics;
export type CardioValues = Partial<Record<CardioMetric, number>>;
export type CardioDraft = Partial<Record<CardioMetric, string>>;
export type CardioCategory = "Walking" | "Running" | "Cycling" | "Stairs" | "Rowing" | "Swimming" | "General";

// Input bounds are guardrails, not claims about capacity or exercise intensity.
export function validateCardio(draft: CardioDraft, supported: readonly CardioMetric[]):
  { valid: true; values: CardioValues } | { valid: false; error: string } {
  const values: CardioValues = {};
  for (const key of supported) {
    const text = draft[key]?.trim() ?? "";
    if (!text) continue;
    const field = cardioMetrics[key];
    if (!(field.integer ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/).test(text) || !Number.isFinite(Number(text)) || Number(text) > field.max) {
      return { valid: false, error: field.label + ": enter 0 to " + field.max + (field.integer ? " as a whole number." : " with up to 2 decimals.") };
    }
    values[key] = Number(text);
  }
  return { valid: true, values };
}
export function paceSecondsPerKm(durationSeconds: number | undefined, distanceKm: number | undefined): number | null {
  if (durationSeconds === undefined || distanceKm === undefined || !Number.isFinite(durationSeconds) || !Number.isFinite(distanceKm) || durationSeconds <= 0 || distanceKm <= 0) return null;
  const pace = durationSeconds / distanceKm;
  return Number.isFinite(pace) ? pace : null;
}
export function formatPace(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 1) return "<0:01 min/km";
  const rounded = Math.round(seconds);
  return Math.floor(rounded / 60) + ":" + String(rounded % 60).padStart(2, "0") + " min/km";
}
