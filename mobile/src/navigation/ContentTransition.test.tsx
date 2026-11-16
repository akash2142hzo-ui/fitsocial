import { act, useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import { ContentTransition } from "./ContentTransition";

jest.mock("react-native", () => {
  const actual = jest.requireActual<typeof import("react-native")>("react-native");
  return Object.defineProperties({}, {
    ...Object.getOwnPropertyDescriptors(actual),
    Animated: { value: { ...actual.Animated, View: "AnimatedView" }, enumerable: true },
    Text: { value: "Text", enumerable: true }, Pressable: { value: "Pressable", enumerable: true },
  });
});

let root: Root;
let preference: ((value: boolean) => void) | undefined;
let mounted: number;
const stop = jest.fn(); const start = jest.fn();
function Probe() {
  const [count, setCount] = useState(0);
  useEffect(() => { mounted++; }, []);
  return <Pressable onPress={() => setCount(count + 1)}><Text>{count}</Text></Pressable>;
}
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
async function render(key: string) { await act(async () => { root.render(<ContentTransition transitionKey={key} duration={200} order="a,b,c"><Probe /></ContentTransition>); }); }

beforeEach(() => {
  root = createRoot(); mounted = 0; stop.mockClear(); start.mockClear();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, callback) => {
    preference = (value) => callback(value); return { remove: jest.fn() };
  });
  jest.spyOn(Animated, "timing").mockReturnValue({ start, stop, reset: jest.fn() });
  jest.spyOn(Animated, "parallel").mockReturnValue({ start, stop, reset: jest.fn() });
});
afterEach(async () => { await act(async () => { root.unmount(); }); jest.restoreAllMocks(); });

it("animates only content with native-driven short timings and keeps child input state mounted", async () => {
  await render("a"); expect(Animated.timing).not.toHaveBeenCalled();
  await act(async () => { root.container.queryAll((node) => node.type === "Pressable")[0].props.onPress(); });
  await render("b");
  expect(Animated.timing).toHaveBeenCalledTimes(2);
  for (const call of jest.mocked(Animated.timing).mock.calls) expect(call[1]).toMatchObject({ duration: 200, useNativeDriver: true });
  expect(mounted).toBe(1); expect(textOf(root.container)).toBe("1");
});

it("interrupts rapid section switches instead of accumulating animation sequences", async () => {
  await render("a"); await render("b"); const stops = stop.mock.calls.length;
  await render("c"); await render("a");
  expect(stop.mock.calls.length).toBeGreaterThan(stops);
  expect(start).toHaveBeenCalledTimes(3); expect(mounted).toBe(1);
});

it("skips motion when reduced motion is enabled and stops an in-flight animation when enabled live", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await render("a"); await render("b"); expect(Animated.timing).not.toHaveBeenCalled();
  await act(async () => { preference?.(false); }); await render("c");
  expect(start).toHaveBeenCalledTimes(1);
  const stops = stop.mock.calls.length;
  await act(async () => { preference?.(true); });
  expect(stop.mock.calls.length).toBeGreaterThan(stops);
  await render("a"); expect(start).toHaveBeenCalledTimes(1);
});

it("does not let a stale preference query override a newer reduce-motion event", async () => {
  let resolve: (value: boolean) => void = () => {};
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(new Promise<boolean>((done) => { resolve = done; }));
  await render("a");
  await act(async () => { preference?.(true); resolve(false); });
  await render("b"); expect(Animated.timing).not.toHaveBeenCalled();
});

it("fails safely to no motion when the accessibility preference cannot be read", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockRejectedValue(new Error("Unavailable"));
  await render("a"); await render("b"); expect(Animated.timing).not.toHaveBeenCalled();
});

it("reverses the small slide when returning to an earlier Feed section", async () => {
  await render("a"); await render("b");
  const offset = jest.mocked(Animated.timing).mock.calls[1][0] as Animated.Value;
  const set = jest.spyOn(offset, "setValue");
  await render("a"); expect(set).toHaveBeenCalledWith(-10);
});

it("reserves no space and starts no animation for collapsed inline details", async () => {
  await act(async () => { root.render(<ContentTransition transitionKey="closed" visible={false}><Probe /></ContentTransition>); });
  const view = root.container.queryAll((node) => node.type === "AnimatedView")[0];
  expect(view.props.style).toEqual({ display: "none" });
  expect(Animated.timing).not.toHaveBeenCalled();
});
