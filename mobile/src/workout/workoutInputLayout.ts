// Presentation geometry only. All widths are measured in the form's own coordinates.
export const INPUT_COLUMN_GAP = 12;
export const WEIGHT_LABEL_GAP = 4;
export type MeasuredSize = { width: number; height: number };
export function weightToggleGeometry(fontScale: number, measuredText?: MeasuredSize) {
  const scale = Math.max(1, fontScale || 1);
  // Until native labels are measured, budget one em per character for the two-letter units.
  const text = measuredText ?? { width: 24 * scale, height: 16 * scale };
  const segmentWidth = Math.max(40, Math.ceil(text.width + 8));
  const visualHeight = Math.max(32, Math.ceil(text.height + 8));
  const touchWidth = Math.max(44, segmentWidth);
  const touchHeight = Math.max(44, visualHeight);
  return { segmentWidth, visualWidth: segmentWidth * 2, visualHeight, touchWidth, touchHeight,
    horizontalInset: touchWidth - segmentWidth, verticalInset: (touchHeight - visualHeight) / 2 };
}
export function workoutInputLayout(contentWidth: number, reps: MeasuredSize | null, weight: MeasuredSize | null,
  toggle: MeasuredSize, fontScale: number) {
  const columnWidth = Math.max(0, (contentWidth - INPUT_COLUMN_GAP) / 2);
  const ready = contentWidth > 0 && reps !== null && weight !== null;
  const requiredWeightWidth = (weight?.width ?? Infinity) + WEIGHT_LABEL_GAP + toggle.width;
  const twoColumns = ready && columnWidth >= Math.max(reps.width, requiredWeightWidth);
  const fieldWidth = twoColumns ? columnWidth : contentWidth;
  return { columnWidth, twoColumns, fieldWidth, inlineWeightHeader: ready && fieldWidth >= requiredWeightWidth,
    headerHeight: Math.max(reps?.height ?? 0, weight?.height ?? 0, toggle.height),
    // Shared input tokens: scaled 20 dp line, 12 dp padding per side, 1 dp border per side.
    inputHeight: Math.max(48, Math.ceil(20 * Math.max(1, fontScale || 1) + 2 * 12 + 2)) };
}
