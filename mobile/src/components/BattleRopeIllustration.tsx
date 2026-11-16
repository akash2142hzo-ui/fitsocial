import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

type Point = readonly [number, number];
function Stroke({ from, to, thickness = 2, testID }: { from: Point; to: Point; thickness?: number; testID?: string }) {
  const dx = to[0] - from[0]; const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  return <View testID={testID} style={[styles.stroke, {
    left: (from[0] + to[0]) / 2 - length / 2, top: (from[1] + to[1]) / 2 - thickness / 2,
    height: thickness, borderRadius: thickness / 2,
    width: length, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
  }]} />;
}
function Rope({ width, alternate }: { width: number; alternate: boolean }) {
  const points: Point[] = Array.from({ length: 33 }, (_, index) => {
    const t = index / 32;
    // Separate perspective lanes and floor fittings prevent the waves crossing.
    // A tapered two-wave pulse stays beneath each hand instead of orbiting a shared axis.
    return [6 + t * (width - (alternate ? 56 : 58)),
      (alternate ? 55 : 39) - t * (alternate ? 17 : 11)
      + Math.sin(t * Math.PI * 4) * Math.sin(t * Math.PI) * (alternate ? -4 : 4)];
  });
  return <View testID={alternate ? "battle-rope-lower" : "battle-rope-upper"} style={StyleSheet.absoluteFill}>
    {points.slice(1).map((point, index) => <Stroke key={index} from={points[index]} to={point} />)}
  </View>;
}
// Original native vector geometry. Local coordinates stay inside this decorative canvas.
export function BattleRopeIllustration() {
  const [width, setWidth] = useState(144);
  const x = width - 22;
  return <View testID="home-battle-rope" pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.canvas}
    onLayout={({ nativeEvent }) => { if (nativeEvent.layout.width > 0) setWidth(nativeEvent.layout.width); }}>
    <Rope width={width} alternate={false} /><Rope width={width} alternate />
    <View testID="battle-rope-anchor" style={styles.anchor} />
    <View testID="battle-rope-man" style={StyleSheet.absoluteFill}>
      {/* Far arm/leg first, then the forward-leaning torso and near limbs. */}
      <Stroke from={[x - 3, 23]} to={[x - 15, 32]} thickness={4} />
      <Stroke from={[x - 15, 32]} to={[x - 28, 38]} thickness={3.5} testID="battle-rope-far-grip" />
      <Stroke from={[x + 2, 37]} to={[x + 10, 46]} thickness={6} />
      <Stroke from={[x + 10, 46]} to={[x + 14, 58]} thickness={4} />
      <Stroke from={[x + 10, 59]} to={[x + 18, 59]} thickness={3} />
      <View testID="battle-rope-head" style={[styles.head, { left: x - 13 }]} />
      <Stroke from={[x - 8, 16]} to={[x - 6, 22]} thickness={4} />
      <Stroke from={[x - 5, 23]} to={[x + 2, 37]} thickness={10} testID="battle-rope-torso" />
      <Stroke from={[x + 1, 37]} to={[x - 9, 46]} thickness={6} />
      <Stroke from={[x - 9, 46]} to={[x - 14, 58]} thickness={4} />
      <Stroke from={[x - 20, 59]} to={[x - 11, 59]} thickness={3} />
      <Stroke from={[x - 7, 23]} to={[x - 19, 24]} thickness={4.5} />
      <Stroke from={[x - 19, 24]} to={[x - 30, 28]} thickness={3.5} testID="battle-rope-near-grip" />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  canvas: { flex: 1, minWidth: 112, maxWidth: 192, height: 64, overflow: "hidden" },
  stroke: { position: "absolute", height: 2, borderRadius: 1, backgroundColor: colors.accent },
  head: { position: "absolute", top: 6, width: 9, height: 10, borderWidth: 2, borderRadius: 4, borderColor: colors.accent },
  anchor: { position: "absolute", left: 2, top: 36, width: 6, height: 23, borderWidth: 2, borderRadius: 2, borderColor: colors.accent },
});
