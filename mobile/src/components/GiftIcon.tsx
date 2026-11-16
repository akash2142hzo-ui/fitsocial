import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export function GiftIcon({ color = colors.accent }: { color?: string }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame}>
    <View style={[styles.bow, styles.left, { borderColor: color }]} /><View style={[styles.bow, styles.right, { borderColor: color }]} />
    <View style={[styles.box, { borderColor: color }]} /><View style={[styles.lid, { borderColor: color }]} />
    <View style={[styles.ribbon, { backgroundColor: color }]} />
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: 24, height: 26 },
  box: { position: "absolute", left: 3, top: 12, width: 18, height: 13, borderWidth: 2, borderRadius: 2 },
  lid: { position: "absolute", left: 1, top: 8, width: 22, height: 6, borderWidth: 2, borderRadius: 2 },
  ribbon: { position: "absolute", left: 11, top: 9, width: 2, height: 15 },
  bow: { position: "absolute", top: 2, width: 10, height: 8, borderWidth: 2, borderRadius: 5 },
  left: { left: 3, transform: [{ rotate: "25deg" }] },
  right: { right: 3, transform: [{ rotate: "-25deg" }] },
});
