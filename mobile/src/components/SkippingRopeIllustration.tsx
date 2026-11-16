import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

// Original local icon geometry. Absolute positions are confined to this decorative canvas.
export function SkippingRopeIllustration() {
  return <View testID="home-skipping-rope" pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.canvas}>
    <View style={styles.rope} />
    <View style={styles.head} /><View style={styles.body} />
    <View style={[styles.arm, styles.leftArm]} /><View style={[styles.arm, styles.rightArm]} />
    <View style={[styles.leg, styles.leftLeg]} /><View style={[styles.leg, styles.rightLeg]} />
    <View style={[styles.handle, { left: 4 }]} /><View style={[styles.handle, { right: 4 }]} />
  </View>;
}
const styles = StyleSheet.create({
  canvas: { width: 48, height: 48, flexShrink: 0 },
  rope: { position: "absolute", left: 2, top: 4, width: 44, height: 44, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 22, borderTopColor: "transparent" },
  head: { position: "absolute", left: 21, top: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  body: { position: "absolute", left: 23, top: 12, width: 3, height: 16, borderRadius: 2, backgroundColor: colors.accent },
  arm: { position: "absolute", top: 15, width: 18, height: 2, backgroundColor: colors.accent },
  leftArm: { left: 6, transform: [{ rotate: "-24deg" }] },
  rightArm: { right: 5, transform: [{ rotate: "24deg" }] },
  leg: { position: "absolute", top: 26, width: 3, height: 12, borderRadius: 2, backgroundColor: colors.accent },
  leftLeg: { left: 20, transform: [{ rotate: "25deg" }] },
  rightLeg: { left: 26, transform: [{ rotate: "-25deg" }] },
  handle: { position: "absolute", top: 17, width: 2, height: 7, borderRadius: 1, backgroundColor: colors.accent },
});
