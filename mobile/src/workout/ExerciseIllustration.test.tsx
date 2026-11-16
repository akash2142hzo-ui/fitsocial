import { act } from "react";
import { StyleSheet } from "react-native";
import { createRoot, Root } from "test-renderer";
import { ExerciseIllustration } from "./ExerciseIllustration";
import * as registry from "./exerciseIllustrations";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  View: { value: "View", enumerable: true }, Image: { value: "Image", enumerable: true },
}));
let root: Root;
beforeEach(() => { root = createRoot(); });
afterEach(async () => { await act(async () => { root.unmount(); }); jest.restoreAllMocks(); });
const synthetic = (source = 101) => ({ assetKey: "fixture", asset: { source, width: 320, height: 168,
  provenance: "Synthetic test data, not bundled artwork", approvals: [{ exerciseId: "machine-chest-press" as const,
    reviewedBy: "Fixture", reviewedOn: "2026-11-15", visualNotes: "Synthetic fixture only" }] as const } });

it("uses the existing card text fallback without adding height or blank space", async () => {
  for (const exerciseId of ["machine-chest-press", "pec-deck-fly", "unknown"]) {
    await act(async () => { root.render(<ExerciseIllustration exerciseId={exerciseId} />); });
    expect(root.container.children).toHaveLength(0);
  }
});

it("contains a verified bundled source in a compact noninteractive decorative frame", async () => {
  jest.spyOn(registry, "illustrationForExercise").mockReturnValue(synthetic());
  await act(async () => { root.render(<ExerciseIllustration exerciseId="machine-chest-press" />); });
  const image = root.container.queryAll((node) => node.type === "Image")[0];
  expect(image.props.source).toBe(101); expect(image.props.resizeMode).toBe("contain");
  expect(image.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
  const frame = root.container.queryAll((node) => node.props.testID === "exercise-illustration-machine-chest-press")[0];
  expect(frame.props.pointerEvents).toBe("none");
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ width: 80, height: 42, flexShrink: 0 });
  expect(StyleSheet.flatten(frame.props.style).position).toBeUndefined();
});

it("returns to neutral fallback on image failure and can load a different source later", async () => {
  const resolve = jest.spyOn(registry, "illustrationForExercise").mockReturnValue(synthetic());
  await act(async () => { root.render(<ExerciseIllustration exerciseId="machine-chest-press" />); });
  const image = root.container.queryAll((node) => node.type === "Image")[0];
  await act(async () => { image.props.onError(); }); expect(root.container.children).toHaveLength(0);
  resolve.mockReturnValue(synthetic(102));
  await act(async () => { root.render(<ExerciseIllustration exerciseId="pec-deck-fly" />); });
  expect(root.container.queryAll((node) => node.type === "Image")[0].props.source).toBe(102);
  resolve.mockReturnValue(null);
  await act(async () => { root.render(<ExerciseIllustration exerciseId="unknown" />); });
  expect(root.container.children).toHaveLength(0);
});
