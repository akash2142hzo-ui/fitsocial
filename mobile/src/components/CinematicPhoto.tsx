import { useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

// Only the decorative layer is hidden; sibling content stays interactive and accessible.
export function CinematicPhoto({ source }: { source: ImageSourcePropType }) {
  const [failedSource, setFailedSource] = useState<ImageSourcePropType | null>(null);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.background}>
    {failedSource !== source && <Image source={source} resizeMode="cover" fadeDuration={0}
      pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill} onError={() => setFailedSource(source)} />}
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" style={styles.overlay} />
  </View>;
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, backgroundColor: colors.background },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(17, 19, 21, 0.78)" },
});
