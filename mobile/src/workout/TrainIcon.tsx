import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export function TrainIcon({ kind }: { kind: "dumbbell" | "chart" }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame}>
    {kind === "dumbbell" ? <View style={styles.weights}>
      <View style={styles.end} /><View style={styles.plate} /><View style={styles.bar} /><View style={styles.plate} /><View style={styles.end} />
    </View> : <View style={styles.chart}>
      <View style={[styles.column, { height: 8 }]} /><View style={[styles.column, { height: 14 }]} /><View style={[styles.column, { height: 20 }]} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: 32, height: 24, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  weights: { flexDirection: "row", alignItems: "center" },
  end: { width: 3, height: 10, borderRadius: 1, backgroundColor: colors.accent },
  plate: { width: 4, height: 20, borderRadius: 1, backgroundColor: colors.accent },
  bar: { width: 14, height: 3, backgroundColor: colors.accent },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  column: { width: 4, borderRadius: 1, backgroundColor: colors.accent },
});
