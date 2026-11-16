import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

// Original decorative geometry, not an exercise demonstration or downloaded asset.
export function TrainingIllustration({ variant = "strength", compact = false }: { variant?: "strength" | "cardio" | "bodyweight"; compact?: boolean }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={[styles.frame, compact && styles.compact]}>
    <View style={[styles.canvas, compact && styles.compactCanvas]}>
    <View style={styles.floor} />
    {variant === "strength" ? <View style={styles.dumbbell}>
      <View style={styles.bar} /><View style={[styles.plate, { left: 16 }]} /><View style={[styles.plate, { right: 16 }]} />
      <View style={[styles.end, { left: 8 }]} /><View style={[styles.end, { right: 8 }]} />
    </View> : variant === "cardio" ? <>
      <View style={styles.wheel} /><View style={styles.frameBar} /><View style={styles.seatPost} />
      <View style={styles.seat} /><View style={styles.handlePost} /><View style={styles.handle} />
    </> : <>
      <View style={styles.mat} /><View style={styles.matRoll} /><View style={styles.matLine} />
    </>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: 112, height: 76, flexShrink: 0 },
  canvas: { width: 112, height: 76 },
  compact: { width: 56, height: 38 },
  compactCanvas: { position: "absolute", left: -28, top: -19, transform: [{ scale: 0.5 }] },
  floor: { position: "absolute", bottom: 4, left: 4, right: 4, height: 2, backgroundColor: colors.border },
  dumbbell: { position: "absolute", left: 6, top: 8, width: 100, height: 54, transform: [{ rotate: "-12deg" }] },
  bar: { position: "absolute", top: 24, left: 4, right: 4, height: 6, borderRadius: 3, backgroundColor: colors.secondaryText },
  plate: { position: "absolute", top: 7, width: 14, height: 40, borderRadius: 4, backgroundColor: colors.accent },
  end: { position: "absolute", top: 14, width: 8, height: 26, borderRadius: 3, backgroundColor: colors.secondaryText },
  wheel: { position: "absolute", width: 38, height: 38, borderWidth: 5, borderColor: colors.accent, borderRadius: 19, left: 14, bottom: 8 },
  frameBar: { position: "absolute", width: 54, height: 5, left: 33, top: 45, backgroundColor: colors.secondaryText, transform: [{ rotate: "-28deg" }] },
  seatPost: { position: "absolute", height: 29, width: 4, left: 55, top: 21, backgroundColor: colors.secondaryText },
  seat: { position: "absolute", width: 23, height: 5, borderRadius: 3, left: 44, top: 18, backgroundColor: colors.accent },
  handlePost: { position: "absolute", height: 40, width: 4, left: 84, top: 17, backgroundColor: colors.secondaryText, transform: [{ rotate: "12deg" }] },
  handle: { position: "absolute", width: 20, height: 5, borderRadius: 3, left: 81, top: 15, backgroundColor: colors.accent },
  mat: { position: "absolute", left: 12, top: 34, width: 88, height: 26, borderRadius: 8, backgroundColor: colors.accentSurface, borderWidth: 2, borderColor: colors.accent },
  matRoll: { position: "absolute", left: 10, top: 27, width: 22, height: 34, borderRadius: 11, borderWidth: 4, borderColor: colors.accent, backgroundColor: colors.surface },
  matLine: { position: "absolute", left: 43, right: 21, top: 46, height: 2, backgroundColor: colors.secondaryText },
});
