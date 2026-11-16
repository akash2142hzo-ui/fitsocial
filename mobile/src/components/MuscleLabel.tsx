import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { type } from "../theme/design";

// Original text fallbacks; no third-party artwork.
export const muscleLabels: Readonly<Record<string, string>> = {
  Biceps: "Front upper arm", Triceps: "Back upper arm", Chest: "Pectorals",
  Back: "Back muscles", Shoulders: "Deltoids", Legs: "Leg muscles",
  Core: "Abdominals", Forearms: "Forearm muscles", Cardio: "Cardio activity",
  "Full Body": "Whole body",
};
export function MuscleLabel({ category, size = 72 }: { category: string; size?: number }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tile, { width: size, minHeight: size }]}>
    <Text style={styles.label}>{muscleLabels[category] ?? category}</Text>
  </View>;
}
const styles = StyleSheet.create({
  tile: { width: 72, minHeight: 72, alignSelf: "flex-start", justifyContent: "center", padding: 8, borderRadius: 10, backgroundColor: colors.elevated },
  label: { ...type.caption, color: colors.secondaryText, flexShrink: 1 },
});
