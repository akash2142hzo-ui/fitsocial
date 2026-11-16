import { formatWeightValue, parseWeightDraft, POUNDS_PER_KILOGRAM, weightDraftDisplay, weightFromKg, weightToKg } from "./weightUnits";
import { cloneLoggedSet, formatLoggedSet, initialWorkout, summarizeHistory, summarizeWorkout, validateSet, WorkoutState, workoutReducer as reduce } from "./workoutState";
import { createWorkoutAttachment } from "./workoutSharing";
import { entryDisplay } from "./workoutDisplay";

const clock = { wallMs: 1000, monotonicMs: 0 };
function start(exercise: NonNullable<WorkoutState["exercise"]> = "Flat Barbell Bench Press") {
  return reduce(reduce(initialWorkout, { type: "start", clock }), { type: "selectExercise", exercise });
}
function enter(state: WorkoutState, weight: string) {
  return reduce(reduce(state, { type: "edit", field: "reps", value: "8" }), { type: "edit", field: "weight", value: weight });
}
function log(state: WorkoutState) { return reduce(state, { type: "addSet", revision: state.revision }); }

it.each([0, 0.01, 1, 12.5, 20.5, 1000])("converts %s kg and lb with the specified factor", (kg) => {
  expect(weightFromKg(kg, "lb")).toBe(kg * 2.2046226218);
  expect(weightToKg(weightFromKg(kg, "lb"), "lb")).toBeCloseTo(kg, 12);
  expect(weightFromKg(kg, "kg")).toBe(kg); expect(weightToKg(kg, "kg")).toBe(kg);
});
it("converts a typed 45 lb at full precision, rounding only its display", () => {
  const parsed = parseWeightDraft({ text: "45", unit: "lb" });
  expect(parsed.valid && parsed.kg).toBe(45 / POUNDS_PER_KILOGRAM);
  expect(formatWeightValue(45 / POUNDS_PER_KILOGRAM, "kg")).toBe("20.41");
  expect(formatWeightValue(45 / POUNDS_PER_KILOGRAM, "lb")).toBe("45");
});
it.each(["", "   "])("keeps an empty %j input distinct from zero", (text) => {
  for (const unit of ["kg", "lb"] as const) expect(parseWeightDraft({ text, unit })).toEqual({ valid: true, kg: null });
  expect(weightDraftDisplay(text, null, "lb")).toBe(text);
});
it.each(["-1", "NaN", "Infinity", "1e309", "1e2", "2.345", "1,5", ".", "+2", "5 lb", "2204.63"])("rejects invalid lb %s safely", (text) => {
  expect(parseWeightDraft({ text, unit: "lb" }).valid).toBe(false);
  expect(validateSet("8", text, { required: true, allowZero: false, unit: "lb" }).valid).toBe(false);
});
it("keeps the same physical upper bound and two-decimal entry conventions", () => {
  expect(parseWeightDraft({ text: "1000", unit: "kg" })).toEqual({ valid: true, kg: 1000 });
  expect(parseWeightDraft({ text: "1000.01", unit: "kg" }).valid).toBe(false);
  expect(parseWeightDraft({ text: "2204.62", unit: "lb" }).valid).toBe(true);
  expect(parseWeightDraft({ text: " .5 ", unit: "lb" })).toEqual({ valid: true, kg: .5 / POUNDS_PER_KILOGRAM });
  expect(parseWeightDraft({ text: "5.", unit: "lb" }).valid).toBe(true);
});
it("switches an entered kg value repeatedly without changing canonical data or the original edit", () => {
  let state = enter(start(), "20.50"); const original = state.weightDraft;
  for (let i = 0; i < 100; i++) {
    state = reduce(state, { type: "setWeightUnit", unit: "lb" });
    expect(weightDraftDisplay(state.weight, state.weightDraft, state.weightUnit)).toBe("45.19");
    expect(state.weight).toBe("20.50"); expect(state.weightDraft).toBe(original);
    state = reduce(state, { type: "setWeightUnit", unit: "kg" });
    expect(weightDraftDisplay(state.weight, state.weightDraft, state.weightUnit)).toBe("20.50");
  }
  expect(log(state).sets[0].weight).toBe(20.5);
});
it("retains exact lb-origin kilograms through 100 switches and finish/save/share", () => {
  let state = enter(reduce(start(), { type: "setWeightUnit", unit: "lb" }), "45");
  const canonical = state.weight;
  for (let i = 0; i < 100; i++) {
    state = reduce(state, { type: "setWeightUnit", unit: "kg" });
    expect(weightDraftDisplay(state.weight, state.weightDraft, state.weightUnit)).toBe("20.41");
    state = reduce(state, { type: "setWeightUnit", unit: "lb" });
  }
  expect(state.weight).toBe(canonical); state = log(state);
  expect(state.sets[0].weight).toBe(45 / POUNDS_PER_KILOGRAM);
  expect(state.sets[0].weightInputUnit).toBe("lb");
  expect(formatLoggedSet(state.sets[0], "kg")).toBe("8 reps \u00b7 20.41 kg");
  expect(formatLoggedSet(state.sets[0], "lb")).toBe("8 reps \u00b7 45 lb");
  expect(cloneLoggedSet(state.sets[0]).weight).toBe(state.sets[0].weight);
  state = reduce(reduce(state, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 61000, monotonicMs: 60000 } });
  state = reduce(state, { type: "save" });
  expect(state.history[0].sets[0].weight).toBe(45 / POUNDS_PER_KILOGRAM);
  expect(createWorkoutAttachment(state.history[0]).sets[0].weight).toBe(45 / POUNDS_PER_KILOGRAM);
  expect(summarizeHistory(state.history)).toMatchObject({ workoutCount: 1, setCount: 1, reps: 8 });
});
it("treats editing converted display text as a new intentional value in the selected unit", () => {
  let state = enter(start(), "20.5"); state = reduce(state, { type: "setWeightUnit", unit: "lb" });
  state = enter(state, "50"); expect(log(state).sets[0].weight).toBe(50 / POUNDS_PER_KILOGRAM);
});
it("leaves invalid drafts visible and blocks a unit change instead of reinterpreting them", () => {
  const state = enter(start(), "NaN"); const attempted = reduce(state, { type: "setWeightUnit", unit: "lb" });
  expect(attempted.weight).toBe("NaN"); expect(attempted.weightUnit).toBe("kg"); expect(attempted.error).toContain("Enter 0 to 1,000 kg");
  expect(log(attempted).sets).toHaveLength(0);
});
it("preserves blank, zero, positive-only, optional added weight and assistance rules", () => {
  let state = reduce(start(), { type: "setWeightUnit", unit: "lb" });
  expect(log(enter(state, "")).error).toBe("Enter lifted weight in lb before logging.");
  expect(log(enter(state, "0")).sets).toHaveLength(0);
  state = reduce(start("Machine Chest Press"), { type: "setWeightUnit", unit: "lb" });
  expect(log(enter(state, "0")).sets[0].weight).toBe(0);
  state = reduce(start("Push-up"), { type: "setWeightUnit", unit: "lb" });
  expect(log(enter(state, "")).sets[0].weight).toBeNull();
  expect(formatLoggedSet(log(enter(state, "10")).sets[0], "lb")).toContain("10 lb added");
  state = reduce(start("Assisted Pull-up"), { type: "setWeightUnit", unit: "lb" });
  expect(entryDisplay(log(enter(state, "30")).sets[0], "lb")).toContain("30 lb assistance");
});
it("preserves legacy kg values and totals regardless of presentation units", () => {
  const set = log(enter(start(), "20.5")).sets[0]; const json = JSON.stringify(set);
  expect(formatLoggedSet(set)).toContain("20.5 kg"); expect(entryDisplay(set, "lb")).toContain("45.19 lb");
  expect(JSON.stringify(set)).toBe(json); expect(set.weight).toBe(20.5);
  expect(summarizeWorkout([set])).toMatchObject({ exerciseCount: 1, setCount: 1, reps: 8 });
});
it("does not round away tiny positive loads or cap unchanged unusually large legacy values", () => {
  let state = enter(reduce(start(), { type: "setWeightUnit", unit: "lb" }), "0.01");
  state = reduce(state, { type: "setWeightUnit", unit: "kg" });
  expect(Number(weightDraftDisplay(state.weight, state.weightDraft, "kg"))).toBeGreaterThan(0);
  expect(log(state).sets[0].weight).toBe(0.01 / POUNDS_PER_KILOGRAM);
  expect(formatLoggedSet(log(state).sets[0])).toContain("<0.01 kg");
  expect(formatLoggedSet({ ...log(state).sets[0], weightInputUnit: undefined, weight: 123456789.125 })).toContain("123456789.125 kg");
});
it("keeps active unit choice across selection, ignores changes during confirmation and resets new sessions to kg", () => {
  let state = reduce(start(), { type: "setWeightUnit", unit: "lb" });
  state = reduce(state, { type: "selectExercise", exercise: "Push-up" }); expect(state.weightUnit).toBe("lb");
  expect(state.weightDraft).toBeNull(); state = log(enter(state, "10"));
  const confirming = reduce(state, { type: "requestEnd" }); expect(reduce(confirming, { type: "setWeightUnit", unit: "kg" })).toBe(confirming);
  state = reduce(reduce(confirming, { type: "finish", clock: { wallMs: 61000, monotonicMs: 60000 } }), { type: "save" });
  state = reduce(state, { type: "start", clock: { wallMs: 62000, monotonicMs: 61000 } }); expect(state.weightUnit).toBe("kg");
});
it("does not let a stale Log Set action bypass revision protection after a unit switch", () => {
  const draft = enter(start(), "20"); const old = { type: "addSet" as const, revision: draft.revision };
  const switched = reduce(draft, { type: "setWeightUnit", unit: "lb" });
  expect(reduce(switched, old)).toBe(switched); expect(log(switched).sets[0].weight).toBe(20);
});
