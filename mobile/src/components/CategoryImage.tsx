import { ReactNode, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { categoryImageFor } from "../theme/categoryImages";
import { colors } from "../theme/colors";
import { radii } from "../theme/design";

export function CategoryImage({ category, fallback, compact = false, grid = false }: { category: string; fallback: ReactNode; compact?: boolean; grid?: boolean }) {
  const [failedCategory, setFailedCategory] = useState<string | null>(null);
  const asset = categoryImageFor(category, compact || grid ? "thumbnail" : "train");
  if (!asset || failedCategory === category) return <>{fallback}</>;
  return <View testID={`category-image-frame-${category}`} pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={[styles.frame, compact && styles.compact, grid && styles.grid]}>
    <Image testID={`category-image-${category}`} source={asset.source} resizeMode="contain"
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      onError={() => setFailedCategory(category)} style={styles.image} />
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: "100%", aspectRatio: 5 / 3, backgroundColor: colors.elevated, borderRadius: radii.card, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  grid: { width: "100%", aspectRatio: 1, flexShrink: 0, backgroundColor: colors.background },
  compact: { width: 104, height: 104, aspectRatio: 1, flexShrink: 0, backgroundColor: colors.background },
  image: { width: "100%", height: "100%" },
});
