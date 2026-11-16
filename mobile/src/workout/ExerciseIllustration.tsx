import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { radii } from "../theme/design";
import { illustrationForExercise } from "./exerciseIllustrations";

export function ExerciseIllustration({ exerciseId }: { exerciseId: string }) {
  const resolved = illustrationForExercise(exerciseId);
  const [failedSource, setFailedSource] = useState<number | null>(null);
  // Neutral fallback is the existing exercise name + equipment text in the card.
  // Do not reserve blank space, substitute anatomy, or imply a demonstrated movement.
  if (!resolved || resolved.asset.source === failedSource) return null;
  return <View testID={`exercise-illustration-${exerciseId}`} pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame}>
    <Image source={resolved.asset.source} resizeMode="contain" style={styles.image}
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      onError={() => setFailedSource(resolved.asset.source)} />
  </View>;
}
const styles = StyleSheet.create({
  // Width uses the existing right-side row space. Height matches the normal two-line
  // 20 + 4 + 18 text block, so artwork cannot impose a taller result card.
  frame: { width: 80, height: 42, flexShrink: 0, borderRadius: radii.card, overflow: "hidden", backgroundColor: colors.surface },
  image: { width: "100%", height: "100%" },
});
