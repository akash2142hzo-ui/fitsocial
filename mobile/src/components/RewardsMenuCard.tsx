import { GiftIcon } from "./GiftIcon";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { feedback, sizing, spacing, type, ui } from "../theme/design";

export function RewardsMenuCard({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel="Rewards & FitPoints"
    accessibilityHint="Earn points. Unlock rewards. Opens demo rewards."
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [ui.card, styles.card, focused && styles.focused, pressed && styles.pressed]}>
    <GiftIcon />
    <View style={styles.copy}><Text style={type.button}>Rewards & FitPoints</Text>
      <Text style={type.caption}>Earn points. Unlock rewards.</Text></View>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.chevron}>{"\u203a"}</Text>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: sizing.touch, borderWidth: 2, borderColor: "transparent" },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  focused: { borderColor: colors.text },
  pressed: { opacity: feedback.pressedOpacity },
  chevron: { ...type.heading, color: colors.muted },
});
