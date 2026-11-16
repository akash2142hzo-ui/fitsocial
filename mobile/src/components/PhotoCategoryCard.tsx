import { useState } from "react";
import { ImageSourcePropType, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { feedback, radii, sizing, spacing, type } from "../theme/design";
import { CinematicPhoto } from "./CinematicPhoto";

export function PhotoCategoryCard({ label, source, selected, onPress }: {
  label: string; source: ImageSourcePropType; selected: boolean; onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Muscle category: ${label}`}
    accessibilityState={{ selected }} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.card, selected && styles.selected, focused && styles.focused, pressed && styles.pressed]}>
    <CinematicPhoto source={source} />
    <Text style={styles.label}>{label}</Text>
    {selected && <Text style={styles.selectedLabel}>Selected</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { flexBasis: 140, flexGrow: 1, minWidth: sizing.touch, minHeight: 96, maxWidth: "100%",
    padding: spacing.lg, gap: spacing.xs, justifyContent: "flex-end", overflow: "hidden",
    borderRadius: radii.card, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
  label: { ...type.heading, flexShrink: 1 },
  selectedLabel: { ...type.label, color: colors.accent },
  selected: { borderColor: colors.accent },
  focused: { borderColor: colors.text },
  pressed: { opacity: feedback.pressedOpacity },
});
