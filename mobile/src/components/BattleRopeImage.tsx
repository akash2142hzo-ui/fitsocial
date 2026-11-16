import { Image, StyleSheet, View } from "react-native";

// Exact nonzero-alpha crop of the owner-supplied PNG: 691 x 345.
// Native aspectRatio derives height from the flex-allocated width, without screenshot dimensions.
export function BattleRopeImage() {
  return <View testID="home-battle-rope" pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.canvas}>
    <Image testID="home-battle-rope-image" source={require("../../assets/photos/battle-rope-cropped.png")} resizeMode="contain"
      pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={styles.image} />
  </View>;
}
const styles = StyleSheet.create({
  canvas: { flex: 3, minWidth: 0, aspectRatio: 691 / 345 },
  image: { width: "100%", height: "100%" },
});
