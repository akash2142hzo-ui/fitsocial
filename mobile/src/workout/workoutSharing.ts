import { cloneLoggedSet, CompletedWorkout, LoggedSet, summarizeWorkout } from "./workoutState";
import { WorkoutMetrics } from "./workoutMetrics";

export type WorkoutAttachment = {
  readonly source: "local-workout";
  readonly workoutId: number;
  readonly sets: readonly Readonly<LoggedSet>[];
  readonly metrics?: WorkoutMetrics;
  readonly totals: { readonly exerciseCount: number; readonly setCount: number; readonly reps: number; readonly durationSeconds?: number; readonly repSetCount?: number };
};

export function createWorkoutAttachment(workout: CompletedWorkout): WorkoutAttachment {
  const sets = Object.freeze(workout.sets.map((set) => {
    const copy = cloneLoggedSet(set);
    if (copy.cardio) Object.freeze(copy.cardio);
    return Object.freeze(copy);
  }));
  const { exerciseCount, setCount, reps, durationSeconds, repSetCount } = summarizeWorkout(sets);
  return Object.freeze({ source: "local-workout", workoutId: workout.id, sets, totals: Object.freeze({ exerciseCount, setCount, reps, durationSeconds, repSetCount }),
    ...(workout.metrics ? { metrics: Object.freeze({ ...workout.metrics }) } : {}) });
}

// History lookup; App also allows the explicitly finished, unsaved summary to be shared.
export function findShareableWorkout(history: readonly CompletedWorkout[], id: number) {
  return history.find((workout) => workout.id === id && workout.sets.length > 0);
}
