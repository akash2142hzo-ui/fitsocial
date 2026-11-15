import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { elapsedDuration, sampleClock } from "./workoutMetrics";
import { WorkoutState } from "./workoutState";

export function useWorkoutDuration(workout: WorkoutState) {
  const [now, setNow] = useState(sampleClock);
  useEffect(() => {
    if (workout.status !== "active") return;
    const update = () => setNow(sampleClock());
    update();
    const interval = setInterval(update, 1000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, [workout.status, workout.clock]);
  return workout.status === "active" ? elapsedDuration(workout.clock, now)
    : workout.status === "completed" ? workout.completed?.metrics?.durationMs ?? null : 0;
}
