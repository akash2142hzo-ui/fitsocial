import { StyleSheet, Text, View } from "react-native";
import { fontFamily, sizing } from "../theme/design";

// Generic native shapes and Unicode symbols; no third-party icon assets.
export function SocialIcon({ name, color }: { name: "heart" | "heartFilled" | "comment" | "share" | "plus" | "trophy"; color: string }) {
  return <View style={styles.frame} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === "trophy" ? <><View style={[styles.cup, { borderColor: color }]} /><View style={[styles.stem, { backgroundColor: color }]} /><View style={[styles.foot, { backgroundColor: color }]} /></> : name === "comment" ? <>
      <View style={[styles.bubble, { borderColor: color }]} />
      <View style={[styles.tail, { borderColor: color }]} />
    </> : <Text allowFontScaling={false} style={[styles.glyph, { color }]}>{name === "heart" ? "\u2661" : name === "heartFilled" ? "\u2665" : name === "share" ? "\u2197" : "+"}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  cup: { position: "absolute", top: 4, width: 16, height: 12, borderWidth: 1.5, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  stem: { position: "absolute", top: 16, width: 2, height: 5 },
  foot: { position: "absolute", top: 21, width: 12, height: 2, borderRadius: 1 },
  frame: { width: sizing.icon + 8, height: sizing.icon + 8, alignItems: "center", justifyContent: "center" },
  glyph: { fontFamily, fontSize: 27, lineHeight: 32, fontWeight: "400" },
  bubble: { position: "absolute", width: 21, height: 18, borderWidth: 1.8, borderRadius: 7, top: 3, left: 3 },
  tail: { position: "absolute", width: 7, height: 7, borderLeftWidth: 1.8, borderBottomWidth: 1.8, bottom: 3, left: 5 },
});
