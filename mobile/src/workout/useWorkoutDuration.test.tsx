import { act } from "react";
import { AppState, AppStateStatus, Text } from "react-native";
import { createRoot, Root } from "test-renderer";
import * as metrics from "./workoutMetrics";
import { useWorkoutDuration } from "./useWorkoutDuration";
import { initialWorkout, WorkoutState, workoutReducer as reduce } from "./workoutState";

let root: Root;
let reading: metrics.ClockSample;
let onStateChange: ((state: AppStateStatus) => void) | undefined;
const removeListener = jest.fn();
function Clock({ workout }: { workout: WorkoutState }) {
  return <Text testID="duration">{metrics.formatDuration(useWorkoutDuration(workout))}</Text>;
}
async function render(workout: WorkoutState) {
  await act(async () => { root.render(<Clock workout={workout} />); });
}
function displayed() {
  return root.container.queryAll((node) => node.props.testID === "duration", { matchDeepestOnly: true })[0].children.join("");
}
beforeEach(() => {
  jest.useFakeTimers();
  reading = { wallMs: 1000, monotonicMs: 0 };
  removeListener.mockClear();
  onStateChange = undefined;
  jest.spyOn(metrics, "sampleClock").mockImplementation(() => ({ ...reading }));
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
    onStateChange = callback;
    return { remove: removeListener };
  });
  root = createRoot();
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  jest.restoreAllMocks();
  jest.useRealTimers();
});
const start = () => reduce(reduce(initialWorkout, { type: "start", clock: { wallMs: 1000, monotonicMs: 0 } }), { type: "selectExercise", exercise: "Squat" });

it("refreshes approximately once a second using elapsed timestamps rather than counted ticks", async () => {
  await render(start());
  expect(displayed()).toBe("00:00");
  reading = { wallMs: 62_000, monotonicMs: 61_000 };
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(displayed()).toBe("01:01");
});
it("refreshes immediately after foregrounding without waiting for another timer tick", async () => {
  await render(start());
  await act(async () => { onStateChange?.("background"); });
  reading = { wallMs: 901_000, monotonicMs: 900_000 };
  await act(async () => { onStateChange?.("active"); });
  expect(displayed()).toBe("15:00");
});
it("recovers the full elapsed gap after its tab unmounts and remounts", async () => {
  const active = start();
  await render(active);
  await act(async () => { root.unmount(); });
  expect(removeListener).toHaveBeenCalledTimes(1);
  reading = { wallMs: 181_000, monotonicMs: 180_000 };
  root = createRoot();
  await render(active);
  expect(displayed()).toBe("03:00");
});
it("freezes after finishing and removes the active interval and foreground listener", async () => {
  let workout = reduce(start(), { type: "edit", field: "reps", value: "8" });
  workout = reduce(workout, { type: "addSet", revision: workout.revision });
  await render(workout);
  const completed = reduce(reduce(workout, { type: "requestEnd" }), { type: "finish", clock: { wallMs: 91_000, monotonicMs: 90_000 } });
  await render(completed);
  expect(displayed()).toBe("01:30");
  reading = { wallMs: 999_000, monotonicMs: 998_000 };
  jest.mocked(metrics.sampleClock).mockClear();
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(displayed()).toBe("01:30");
  expect(removeListener).toHaveBeenCalledTimes(1);
  expect(metrics.sampleClock).not.toHaveBeenCalled();
});
it("cleans up after discard and returns to zero", async () => {
  const active = start();
  await render(active);
  await render(reduce(reduce(active, { type: "requestEnd" }), { type: "discard" }));
  expect(displayed()).toBe("00:00");
  expect(removeListener).toHaveBeenCalledTimes(1);
  jest.mocked(metrics.sampleClock).mockClear();
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(metrics.sampleClock).not.toHaveBeenCalled();
});
