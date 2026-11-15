import { StyleSheet, Text, View } from "react-native";
import { sizing } from "../theme/design";

// Generic native shapes and Unicode symbols; no third-party icon assets.
export function SocialIcon({ name, color }: { name: "heart" | "heartFilled" | "comment" | "share" | "plus"; color: string }) {
  return <View style={styles.frame} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === "comment" ? <>
      <View style={[styles.bubble, { borderColor: color }]} />
      <View style={[styles.tail, { borderColor: color }]} />
    </> : <Text style={[styles.glyph, { color }]}>{name === "heart" ? "\u2661" : name === "heartFilled" ? "\u2665" : name === "share" ? "\u2197" : "+"}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: sizing.icon + 4, height: sizing.icon + 4, alignItems: "center", justifyContent: "center" },
  glyph: { fontSize: 27, lineHeight: 28, fontWeight: "400" },
  bubble: { position: "absolute", width: 21, height: 18, borderWidth: 1.8, borderRadius: 7, top: 3, left: 3 },
  tail: { position: "absolute", width: 7, height: 7, borderLeftWidth: 1.8, borderBottomWidth: 1.8, bottom: 3, left: 5 },
});
