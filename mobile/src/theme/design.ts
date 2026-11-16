import { Platform, StyleSheet } from "react-native";
import { colors } from "./colors";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 16, xxl: 24 };
export const sizing = { touch: 48, icon: 20, avatar: 32, profileAvatar: 56, radius: 12 };
export const radii = { control: 12, card: 12, hero: 12, pill: 999, modal: 20 };
export const feedback = { pressedOpacity: 0.72, disabledOpacity: 0.45 };
export const fontFamily = Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" });
export const type = StyleSheet.create({
  title: { fontFamily, color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: "700" },
  heading: { fontFamily, color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "600" },
  body: { fontFamily, color: colors.text, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily, color: colors.muted, fontSize: 12, lineHeight: 18 },
  label: { fontFamily, color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  button: { fontFamily, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  metric: { fontFamily, color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: "700", fontVariant: ["tabular-nums"] },
  error: { fontFamily, color: colors.error, fontSize: 12, lineHeight: 18 },
});
export const ui = StyleSheet.create({
  stack: { gap: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  between: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.md, gap: spacing.sm },
  input: { fontFamily, color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: radii.control, minHeight: sizing.touch, padding: spacing.md, fontSize: 14, lineHeight: 20 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
