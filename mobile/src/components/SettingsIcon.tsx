import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { sizing } from "../theme/design";

// Original native shapes avoid platform-dependent emoji rendering.
export function SettingsIcon() {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.frame}>
    {[0, 45, 90, 135].map((angle) => <View key={angle} style={[styles.teeth, { transform: [{ rotate: `${angle}deg` }] }]} />)}
    <View style={styles.ring} /><View style={styles.hub} />
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: sizing.icon, height: sizing.icon, alignItems: "center", justifyContent: "center" },
  teeth: { position: "absolute", width: 7, height: 24, borderRadius: 2, backgroundColor: colors.text },
  ring: { position: "absolute", width: 19, height: 19, borderRadius: 10, backgroundColor: colors.text },
  hub: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.surface },
});
