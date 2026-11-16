import { INPUT_COLUMN_GAP, weightToggleGeometry, workoutInputLayout } from "./workoutInputLayout";
const reps = { width: 84, height: 18 }, weight = { width: 72, height: 18 }, toggle = { width: 88, height: 44 };
it("reserves an 80 x 32 visible track with equal halves and nonoverlapping 44 dp targets", () => {
  const g = weightToggleGeometry(1);
  expect(g).toEqual({ segmentWidth: 40, visualWidth: 80, visualHeight: 32, touchWidth: 44, touchHeight: 44, horizontalInset: 4, verticalInset: 6 });
  expect(2 * g.touchWidth - 2 * g.horizontalInset).toBe(g.visualWidth);
  expect(g.segmentWidth * 2).toBe(g.visualWidth);
  // Touch intervals [0,44] and [44,88] are adjacent; neither invades the label.
  expect(g.touchWidth).toBeGreaterThanOrEqual(g.segmentWidth);
});
it.each([248, 288, 328, 340, 360, 379, 720])("calculates columns from measured %s dp, using the true combined header budget", (width) => {
  const result = workoutInputLayout(width, reps, weight, toggle, 1);
  expect(result.columnWidth).toBe((width - INPUT_COLUMN_GAP) / 2);
  expect(result.twoColumns).toBe(result.columnWidth >= 164);
  expect(result.fieldWidth).toBe(result.twoColumns ? result.columnWidth : width);
  if (result.twoColumns) expect(result.fieldWidth * 2 + 12).toBe(width);
  expect(result.inputHeight).toBe(48); expect(result.headerHeight).toBe(44);
});
it.each([1, 1.5, 2, 3])("adapts to actual measured unit glyphs and scaled input text at %s", (scale) => {
  const g = weightToggleGeometry(scale, { width: 14 * scale, height: 16 * scale });
  expect(g.segmentWidth).toBeGreaterThanOrEqual(14 * scale + 8);
  expect(g.visualHeight).toBeGreaterThanOrEqual(16 * scale + 8);
  expect(g.touchWidth).toBeGreaterThanOrEqual(44); expect(g.touchHeight).toBeGreaterThanOrEqual(44);
  expect(g.visualWidth).toBe(g.segmentWidth * 2);
  const result = workoutInputLayout(248, { width: 84 * scale, height: 18 * scale }, { width: 72 * scale, height: 18 * scale }, { width: g.touchWidth * 2, height: g.touchHeight }, scale);
  expect(result.twoColumns).toBe(false); expect(result.fieldWidth).toBe(248);
  expect(result.inputHeight).toBeGreaterThanOrEqual(20 * scale + 26);
});
it("stacks without assuming a viewport width before native measurements arrive", () => {
  const result = workoutInputLayout(0, null, null, toggle, 1);
  expect(result.twoColumns).toBe(false); expect(result.inlineWeightHeader).toBe(false);
});
it("uses a separate header line if the scaled label and toggle cannot fit the full field", () => {
  const result = workoutInputLayout(248, { width: 252, height: 54 }, { width: 216, height: 54 }, { width: 100, height: 56 }, 3);
  expect(result.twoColumns).toBe(false); expect(result.inlineWeightHeader).toBe(false);
});
