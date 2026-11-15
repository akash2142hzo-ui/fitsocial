import { CardioMetric, formatPace, paceSecondsPerKm } from "./cardio";
import { formatLoggedSet, LoggedSet } from "./workoutState";

// Presentation only. Keep recorded values and session-duration calculations unchanged.
export function entryDisplay(set: Readonly<LoggedSet>): string {
  if (set.tracking !== "cardio") return formatLoggedSet(set);
  const seconds = set.durationSeconds;
  const parts = [seconds === undefined ? "Time unavailable" : seconds < 60 ? seconds + " sec"
    : Math.floor(seconds / 60) + " min" + (seconds % 60 ? " " + seconds % 60 + " sec" : "")];
  const units: Record<CardioMetric, string> = { distanceKm: "km", speedKmh: "km/h", inclinePercent: "% incline", resistance: "resistance level", floors: "floors", steps: "steps" };
  for (const key of Object.keys(units) as CardioMetric[]) {
    const value = set.cardio?.[key];
    if (value !== undefined) parts.push(String(value) + (key === "inclinePercent" ? "" : " ") + units[key]);
  }
  if (set.cardioCategory === "Running") {
    const pace = formatPace(paceSecondsPerKm(seconds, set.cardio?.distanceKm));
    if (pace) parts.push(pace);
  }
  return parts.join(" \u00b7 ");
}
