import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const sizing = { touch: 48, icon: 24, avatar: 40, profileAvatar: 72, radius: 12 };
export const radii = { control: 12, card: 12, modal: 20 };
export const feedback = { pressedOpacity: 0.72, disabledOpacity: 0.45 };
export const type = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, lineHeight: 30, fontWeight: "700" },
  heading: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: "600" },
  body: { color: colors.text, fontSize: 15, lineHeight: 23 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  label: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  metric: { color: colors.text, fontSize: 20, lineHeight: 28, fontWeight: "700", fontVariant: ["tabular-nums"] },
  error: { color: colors.error, fontSize: 13, lineHeight: 20 },
});
export const ui = StyleSheet.create({
  stack: { gap: spacing.lg },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  between: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: radii.control, minHeight: sizing.touch, padding: spacing.md, fontSize: 16, lineHeight: 24 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
