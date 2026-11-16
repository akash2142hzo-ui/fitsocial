import { act } from "react";
import { View } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import { ActivityChart } from "./ActivityChart";
import { CinematicPhoto } from "./CinematicPhoto";
import { PhotoCategoryCard } from "./PhotoCategoryCard";
import { TrainingIllustration } from "./TrainingIllustration";
import { Button } from "./ui";
import { photography } from "../theme/photography";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true },
  Image: { value: "Image", enumerable: true }, Pressable: { value: "Pressable", enumerable: true },
}));
let root: Root;
beforeEach(() => { root = createRoot(); });
afterEach(async () => { await act(async () => { root.unmount(); }); });
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }

it("retains photo failure coverage independently of Home and leaves sibling actions accessible", async () => {
  const onPress = jest.fn();
  await act(async () => { root.render(<View><CinematicPhoto source={photography.home} /><Button label="Continue" onPress={onPress} /></View>); });
  const photo = root.container.queryAll((node) => node.type === "Image")[0];
  expect(photo.props.pointerEvents).toBe("none"); expect(photo.props.accessible).toBe(false);
  expect(photo.props.importantForAccessibility).toBe("no-hide-descendants");
  await act(async () => { photo.props.onError(); });
  expect(root.container.queryAll((node) => node.type === "Image")).toHaveLength(0);
  const buttons = root.container.queryAll((node) => node.props.accessibilityRole === "button");
  expect(buttons).toHaveLength(1);
  await act(async () => { buttons[0].props.onPress(); }); expect(onPress).toHaveBeenCalledTimes(1);
});

it("shows real daily counts and marks Today without assigning it fabricated activity", async () => {
  const now = new Date(2026, 10, 15, 12).getTime();
  const finishedAt = new Date(2026, 10, 14, 12).getTime();
  const history = [{ id: 1, sets: [], metrics: { startedAt: finishedAt - 60000, finishedAt, durationMs: 60000, bodyWeightKg: null, estimatedKcal: null, met: 3.5 } }];
  await act(async () => { root.render(<ActivityChart history={history} now={now} />); });
  const days = root.container.queryAll((node) => /: \d+ saved workouts$/.test(String(node.props.accessibilityLabel)));
  expect(days).toHaveLength(7);
  expect(days.filter((node) => /: 1 saved workouts$/.test(String(node.props.accessibilityLabel)))).toHaveLength(1);
  expect(days[6].props.accessibilityLabel).toBe("Today, " + new Date(now).toLocaleDateString() + ": 0 saved workouts");
  expect(textOf(days[6])).toContain("Today");
  await act(async () => { root.render(<ActivityChart history={[]} now={now} />); });
  expect(textOf(root.container)).toBe("");
});

it("renders gym illustrations as static decorative native shapes without images or controls", async () => {
  await act(async () => { root.render(<TrainingIllustration />); });
  expect(root.container.queryAll((node) => node.type === "Image" || node.props.accessibilityRole)).toHaveLength(0);
  const decoration = root.container.queryAll((node) => node.props.pointerEvents === "none");
  expect(decoration).toHaveLength(1);
  expect(decoration[0].props.accessibilityElementsHidden).toBe(true);
  expect(decoration[0].props.importantForAccessibility).toBe("no-hide-descendants");
});
it("preserves all retained photo-card failure and accessibility checks outside the active picker", async () => {
  const onPress = jest.fn();
  const sources = Array.from({ length: 10 }, (_, index) => index === 9 ? photography.cardio : photography.strength);
  await act(async () => { root.render(<View>{sources.map((source, index) => <PhotoCategoryCard key={index} label={String(index)} source={source} selected={false} onPress={onPress} />)}</View>); });
  const photos = root.container.queryAll((node) => node.type === "Image");
  expect(photos).toHaveLength(10);
  for (const [index, photo] of photos.entries()) {
    expect(photo.props.source).toBe(sources[index]);
    expect(photo.props.pointerEvents).toBe("none"); expect(photo.props.accessible).toBe(false);
    expect(photo.props.accessibilityElementsHidden).toBe(true);
    expect(photo.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(photo.props.accessibilityRole).toBeUndefined();
  }
  await act(async () => { for (const photo of photos) photo.props.onError(); });
  expect(root.container.queryAll((node) => node.type === "Image")).toHaveLength(0);
  const controls = root.container.queryAll((node) => node.props.accessibilityRole === "button");
  expect(controls).toHaveLength(10);
  await act(async () => { for (const control of controls) control.props.onPress(); });
  expect(onPress).toHaveBeenCalledTimes(10);
});
