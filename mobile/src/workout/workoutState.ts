import { CardioDraft, CardioMetric, CardioValues, cardioMetrics, validateCardio, paceSecondsPerKm, formatPace } from "./cardio";
import { exerciseCatalog, ExerciseName, exercises, TrackingType } from "./exerciseCatalog";
import { ClockSample, finishMetrics, formatDuration, validClock, validateBodyWeight, WorkoutMetrics } from "./workoutMetrics";
export { exercises } from "./exerciseCatalog";
export type Exercise = ExerciseName;
export const MAX_SETS_PER_EXERCISE = 20;
export const MAX_SESSION_SETS = 100;
export type LoggedSet = { id: number; exerciseId: string; exercise: Exercise; reps: number; weight: number | null; tracking?: TrackingType; durationSeconds?: number; cardio?: Readonly<CardioValues>; cardioCategory?: string };
export type CompletedWorkout = {
  readonly id: number;
  readonly sets: readonly Readonly<LoggedSet>[];
  // Untimed fixtures have no metrics; never invent duration or energy for them.
  readonly metrics?: WorkoutMetrics;
};
export type WorkoutState = {
  status: "idle" | "active" | "completed";
  confirming: boolean;
  sets: LoggedSet[];
  exercise: Exercise | null;
  reps: string;
  weight: string;
  revision: number;
  nextId: number;
  error: string | null;
  history: readonly CompletedWorkout[];
  nextWorkoutId: number;
  completed: CompletedWorkout | null;
  saved: boolean;
  durationInput: string;
  cardioDraft: CardioDraft;
  clock: ClockSample | null;
  bodyWeightInput: string;
  bodyWeightError: string | null;
};
export const initialWorkout: WorkoutState = {
  status: "idle", confirming: false, sets: [], exercise: null,
  reps: "", weight: "", revision: 0, nextId: 1, error: null,
  history: [], nextWorkoutId: 1,
  completed: null, saved: false, durationInput: "", cardioDraft: {}, clock: null, bodyWeightInput: "", bodyWeightError: null,
};

export function validateSet(repsInput: string, weightInput: string, options?: { required: boolean; allowZero: boolean }):
  | { valid: true; reps: number; weight: number | null }
  | { valid: false; error: string } {
  const reps = repsInput.trim();
  const weight = weightInput.trim();
  if (options?.required && !weight) return { valid: false, error: "Enter lifted weight in kg before logging." };
  if (options && !options.allowZero && weight !== "" && Number(weight) === 0) return { valid: false, error: "Enter a positive lifted weight for this exercise. Blank is not zero." };
  if (!/^\d{1,4}$/.test(reps) || Number(reps) < 1 || Number(reps) > 1000) {
    return { valid: false, error: "Enter whole repetitions from 1 to 1,000." };
  }
  if (weight !== "" && (!/^(?:\d{1,4}(?:\.\d{0,2})?|\.\d{1,2})$/.test(weight)
    || !Number.isFinite(Number(weight)) || Number(weight) > 1000)) {
    return { valid: false, error: "Enter 0 to 1,000 kg, with up to two decimal places, or leave weight blank. Use a decimal point." };
  }
  return { valid: true, reps: Number(reps), weight: weight === "" ? null : Number(weight) };
}

export type WorkoutAction =
  | { type: "start" | "finish"; clock: ClockSample }
  | { type: "editCardio"; field: CardioMetric; value: string }
  | { type: "editBodyWeight"; value: string }
  | { type: "selectExercise"; exercise: Exercise }
  | { type: "edit"; field: "reps" | "weight" | "durationInput"; value: string }
  | { type: "addSet"; revision: number }
  | { type: "removeSet"; id: number }
  | { type: "requestEnd" | "cancelEnd" | "discard" | "save" | "discardCompleted" };

export function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  if (action.type === "start") {
    if (state.status === "active") return state;
    if (state.completed && !state.saved) return { ...state, confirming: true };
    const bodyWeightInput = state.status === "completed" ? "" : state.bodyWeightInput;
    const bodyWeight = validateBodyWeight(bodyWeightInput);
    if (!bodyWeight.valid) return { ...state, bodyWeightError: bodyWeight.error };
    if (!validClock(action.clock)) return { ...state, error: "Workout time is unavailable. Try starting again." };
    return {
      ...initialWorkout, status: "active", history: state.history, nextWorkoutId: state.nextWorkoutId,
      clock: { ...action.clock }, bodyWeightInput,
    };
  }
  if (state.status === "completed") {
    if (action.type === "save") return state.saved || !state.completed ? state : {
      ...state, saved: true, confirming: false, history: [state.completed, ...state.history],
    };
    if (action.type === "requestEnd") return state.saved ? state : { ...state, confirming: true };
    if (action.type === "cancelEnd") return { ...state, confirming: false };
    if (action.type === "discardCompleted" && state.confirming && !state.saved) return {
      ...initialWorkout, history: state.history, nextWorkoutId: state.nextWorkoutId,
    };
    return state;
  }
  if (action.type === "editBodyWeight") {
    if (state.confirming) return state;
    const checked = validateBodyWeight(action.value);
    return { ...state, bodyWeightInput: action.value, bodyWeightError: checked.valid ? null : checked.error };
  }
  if (state.status !== "active") return state;
  if (action.type === "requestEnd") return { ...state, confirming: true, error: null };
  if (action.type === "cancelEnd") return { ...state, confirming: false };
  if (action.type === "discard") return state.confirming ? {
    ...initialWorkout, history: state.history, nextWorkoutId: state.nextWorkoutId,
  } : state;
  if (action.type === "finish") {
    if (!state.confirming || state.sets.length === 0) return state;
    const bodyWeight = validateBodyWeight(state.bodyWeightInput);
    if (!bodyWeight.valid) return { ...state, confirming: false, bodyWeightError: bodyWeight.error };
    if (!state.clock || !validClock(action.clock)) return { ...state, error: "Workout time is unavailable. Retry finishing or keep logging." };
    return {
      ...state, status: "completed", confirming: false, reps: "", weight: "", revision: state.revision + 1,
      // Record completion atomically, once. History does not share editable set objects.
      completed: { id: state.nextWorkoutId, sets: state.sets.map(cloneLoggedSet),
        metrics: finishMetrics(state.clock, action.clock, bodyWeight.kg) }, saved: false,
      nextWorkoutId: state.nextWorkoutId + 1,
    };
  }
  if (state.confirming) return state;
  switch (action.type) {
    case "selectExercise":
      if (!exercises.includes(action.exercise) || action.exercise === state.exercise) return state;
      return { ...state, exercise: action.exercise, reps: "", weight: "", durationInput: "", cardioDraft: {}, error: null, revision: state.revision + 1 };
    case "editCardio":
      return { ...state, cardioDraft: { ...state.cardioDraft, [action.field]: action.value }, error: null, revision: state.revision + 1 };
    case "edit":
      return { ...state, [action.field]: action.value, error: null, revision: state.revision + 1 };
    case "removeSet":
      return { ...state, sets: state.sets.filter((set) => set.id !== action.id), error: null, revision: state.revision + 1 };
    case "addSet": {
      // A second tap from the same rendered form cannot submit the same draft twice.
      if (action.revision !== state.revision) return state;
      if (!state.exercise) return { ...state, error: "Choose an exercise first." };
      const definition = exerciseCatalog.find((entry) => entry.name === state.exercise)!;
      const input = (definition.tracking === "duration" || definition.tracking === "cardio")
        ? validateDuration(state.durationInput) : validateSet(state.reps, state.weight, { required: definition.tracking === "external", allowZero: definition.tracking !== "external" || definition.allowZeroWeight });
      if (!input.valid) return { ...state, error: input.error };
      const cardio = validateCardio(state.cardioDraft, definition.supportedMetrics);
      if (!cardio.valid) return { ...state, error: cardio.error };
      if (state.sets.length >= MAX_SESSION_SETS
        || state.sets.filter((set) => set.exercise === state.exercise).length >= MAX_SETS_PER_EXERCISE) {
        return { ...state, error: "Limit reached: 20 entries per exercise and 100 entries per workout." };
      }
      return {
        ...state,
        sets: [...state.sets, { id: state.nextId, exerciseId: exerciseCatalog.find((exercise) => exercise.name === state.exercise)!.id,
          exercise: state.exercise, reps: input.reps, weight: input.weight, tracking: definition.tracking,
          ...((definition.tracking === "duration" || definition.tracking === "cardio") && "durationSeconds" in input && typeof input.durationSeconds === "number" ? { durationSeconds: input.durationSeconds } : {}),
          ...(definition.tracking === "cardio" ? { cardio: { ...cardio.values }, cardioCategory: definition.cardioCategory } : {}) }],
        nextId: state.nextId + 1, revision: state.revision + 1, reps: "", weight: "", durationInput: "", cardioDraft: {}, error: null,
      };
    }
  }
  return state;
}

export function summarizeWorkout(sets: readonly LoggedSet[]) {
  const groups = exercises.map((exercise) => {
    const entries = sets.filter((set) => set.exercise === exercise);
    return { exercise, sets: entries, reps: entries.reduce((sum, set) => sum + set.reps, 0) };
  }).filter((group) => group.sets.length > 0);
  return {
    groups, exerciseCount: groups.length, setCount: sets.length,
    durationSeconds: sets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0),
    repSetCount: sets.filter((set) => set.tracking !== "duration" && set.tracking !== "cardio").length,
    reps: sets.reduce((sum, set) => sum + (set.tracking === "duration" || set.tracking === "cardio" ? 0 : set.reps), 0),
  };
}

export function summarizeHistory(history: readonly CompletedWorkout[]) {
  const sets = history.flatMap((workout) => workout.sets);
  const measured = history.filter((workout) => workout.metrics?.estimatedKcal != null);
  return {
    workoutCount: history.length,
    setCount: sets.length,
    durationSeconds: sets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0),
    repSetCount: sets.filter((set) => set.tracking !== "duration" && set.tracking !== "cardio").length,
    reps: sets.reduce((sum, set) => sum + (set.tracking === "duration" || set.tracking === "cardio" ? 0 : set.reps), 0),
    distinctExercises: new Set(sets.map((set) => set.exercise)).size,
    exerciseCount: history.reduce((total, workout) => total + summarizeWorkout(workout.sets).exerciseCount, 0),
    durationMs: history.reduce((total, workout) => total + (workout.metrics?.durationMs ?? 0), 0),
    estimatedKcal: measured.length ? measured.reduce((total, workout) => total + workout.metrics!.estimatedKcal!, 0) : null,
    estimatedWorkoutCount: measured.length,
  };
}

export function validateDuration(input: string): { valid: true; reps: number; weight: null; durationSeconds: number } | { valid: false; error: string } {
  if (!/^\d{1,5}$/.test(input.trim()) || Number(input) < 1 || Number(input) > 86400) return { valid: false, error: "Enter whole seconds from 1 to 86,400." };
  return { valid: true, reps: 0, weight: null, durationSeconds: Number(input) };
}
// Legacy sets without a mode retain their original external-weight meaning.
export function formatLoggedSet(set: Readonly<LoggedSet>) {
  if (set.tracking === "cardio") {
    const details = ["Activity time " + formatDuration(set.durationSeconds === undefined ? undefined : set.durationSeconds * 1000)];
    for (const key of Object.keys(cardioMetrics) as CardioMetric[]) {
      const value = set.cardio?.[key];
      if (value !== undefined) details.push(cardioMetrics[key].label + ": " + value);
    }
    if (set.cardioCategory === "Running") {
      const pace = formatPace(paceSecondsPerKm(set.durationSeconds, set.cardio?.distanceKm));
      if (pace) details.push("Pace " + pace);
    }
    return details.join(" \u00b7 ");
  }
  if (set.tracking === "duration") return String(set.durationSeconds) + " seconds";
  const mode = set.tracking ?? "external";
  const weight = set.weight === null ? (mode === "bodyweight" ? "No additional weight" : mode === "assisted" ? "Assistance not recorded" : "weight not recorded")
    : String(set.weight) + (mode === "bodyweight" ? " kg added" : mode === "assisted" ? " kg assistance" : " kg");
  return String(set.reps) + " reps \u00b7 " + weight;
}

export function cloneLoggedSet(set: Readonly<LoggedSet>): LoggedSet {
  return { ...set, ...(set.cardio ? { cardio: { ...set.cardio } } : {}) };
}

export function formatWorkoutTotals(sets: readonly LoggedSet[]): string {
  const summary = summarizeWorkout(sets);
  const parts = [String(summary.exerciseCount) + " exercises"];
  if (summary.repSetCount) parts.push(String(summary.repSetCount) + " rep sets", String(summary.reps) + " reps");
  const timed = sets.filter((set) => set.tracking === "cardio" || set.tracking === "duration").length;
  if (timed) parts.push(String(timed) + " timed activities", String(summary.durationSeconds) + " logged activity seconds");
  return parts.join(" \u00b7 ");
}
