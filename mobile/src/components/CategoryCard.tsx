import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { feedback, radii, sizing, spacing, type } from "../theme/design";
import { CategoryImage } from "./CategoryImage";
import { MuscleLabel } from "./MuscleLabel";

export function CategoryCard({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Muscle category: ${label}`}
    accessibilityState={{ selected }} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.card, selected && styles.selected, focused && styles.focused, pressed && styles.pressed]}>
    <CategoryImage category={label} grid fallback={<View style={styles.fallback}><MuscleLabel category={label} /></View>} />
    <View style={styles.caption}>
      <Text style={styles.label}>{label}</Text>
      {selected && <View testID={`category-selected-${label}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.check} />}
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: sizing.touch, padding: spacing.sm,
    gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.surface },
  fallback: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  caption: { minHeight: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { ...type.heading, fontWeight: "700", flexShrink: 1, textAlign: "center" },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSurface },
  focused: { borderColor: colors.text }, pressed: { opacity: feedback.pressedOpacity },
  check: { width: 7, height: 12, borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.accent, transform: [{ rotate: "45deg" }], marginHorizontal: spacing.xs, flexShrink: 0 },
});
