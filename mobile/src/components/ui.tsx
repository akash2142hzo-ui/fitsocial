import { ComponentProps, ComponentRef, forwardRef, ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme/colors";
import { feedback, radii, sizing, spacing, type, ui } from "../theme/design";

export function Button({ label, onPress, secondary = false, danger = false, disabled = false, selected, expanded, accessibilityLabel, accessibilityHint, icon, pill = false }: {
  label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean;
  selected?: boolean; expanded?: boolean; accessibilityLabel?: string; accessibilityHint?: string; icon?: ReactNode;
  pill?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityHint={accessibilityHint} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    accessibilityState={{ disabled, selected, expanded }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, selected && styles.selected, pill && styles.pill, pill && selected && styles.pillSelected, focused && !disabled && styles.focused, pressed && !disabled && styles.dim, disabled && styles.disabled]}>
    {icon && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>}
    {pill && selected && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={styles.pillCheck}>{"\u2713"}</Text></View>}
    <Text style={[styles.buttonLabel, (secondary || selected) && styles.secondaryLabel, selected && styles.selectedLabel, pill && selected && styles.pillSelectedLabel, danger && { color: colors.error }]}>{label}</Text>
  </Pressable>;
}
// Reuse Button's native interaction and accessibility behavior for existing filters.
export function FilterPill(props: Omit<ComponentProps<typeof Button>, "secondary" | "pill">) {
  return <Button {...props} secondary pill />;
}
export function TextButton({ label, onPress, expanded, accessibilityLabel }: {
  label: string; onPress: () => void; expanded?: boolean; accessibilityLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ expanded }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onPress={onPress} style={({ pressed }) => [styles.textButton, focused && styles.focused, pressed && styles.dim]}>
    <Text style={styles.textButtonLabel}>{label}</Text>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={styles.chevron}>{expanded ? "\u2303" : "\u203a"}</Text></View>
  </Pressable>;
}
export function IconButton({ label, icon, onPress, selected, disabled = false }: { label: string; icon: ReactNode; onPress: () => void; selected?: boolean; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} accessibilityState={{ selected, disabled }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.iconButton, selected && styles.selected, focused && !disabled && styles.focused, pressed && !disabled && styles.dim, disabled && styles.disabled]}>
    <View style={styles.iconFrame} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>
  </Pressable>;
}
export function Banner({ label, onPress, icon }: { label: string; onPress: () => void; icon: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.banner, focused && styles.focused, pressed && styles.dim]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>
    <Text style={styles.bannerLabel}>{label}</Text>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={styles.chevron}>{"\u203a"}</Text></View>
  </Pressable>;
}
// Preserve native refs, keyboard behavior and caller focus handlers.
export const Input = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(function Input(
  { style, onFocus, onBlur, placeholderTextColor = colors.secondaryText, selectionColor = colors.accent, ...props }, ref,
) {
  const [focused, setFocused] = useState(false);
  return <TextInput {...props} ref={ref} placeholderTextColor={placeholderTextColor} selectionColor={selectionColor} style={[ui.input, style, focused && styles.inputFocused]}
    onFocus={(event) => { setFocused(true); onFocus?.(event); }}
    onBlur={(event) => { setFocused(false); onBlur?.(event); }} />;
});
export function Avatar({ initials, size = sizing.avatar }: { initials: string; size?: number }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.initials, size >= sizing.profileAvatar && styles.profileInitials]}>{initials}</Text>
  </View>;
}
export function Stats({ items, compact = false }: { items: readonly { value: string | number; label: string }[]; compact?: boolean }) {
  return <View style={[styles.stats, compact && styles.compactStats]}>{items.map(({ value, label }) => <View key={label} accessible accessibilityLabel={`${value} ${label}`} style={[styles.stat, compact && styles.compactStat]}>
    <Text style={type.metric}>{value}</Text><Text style={type.caption}>{label}</Text>
  </View>)}</View>;
}
export function Heading({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={[type.heading, { flexShrink: 1, maxWidth: "100%" }]}>{children}</Text>;
}
export function EmptyState({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) {
  return <View style={ui.card}><Heading>{title}</Heading>{detail && <Text style={type.caption}>{detail}</Text>}{children}</View>;
}
const styles = StyleSheet.create({
  textButton: { minWidth: sizing.touch, minHeight: sizing.touch, maxWidth: "100%", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignSelf: "flex-start", justifyContent: "center", alignItems: "center", flexDirection: "row", gap: spacing.sm, borderWidth: 2, borderColor: "transparent", borderRadius: radii.control },
  textButtonLabel: { ...type.button, color: colors.accent, flexShrink: 1 },
  chevron: { ...type.button, color: colors.accent },
  button: { minHeight: sizing.touch, minWidth: sizing.touch, borderWidth: 2, borderColor: "transparent", flexDirection: "row", gap: spacing.sm, borderRadius: radii.control, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, maxWidth: "100%" },
  secondary: { backgroundColor: colors.elevated, borderColor: colors.border },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.md },
  pillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillSelectedLabel: { color: colors.background },
  pillCheck: { ...type.button, color: colors.background },
  selected: { backgroundColor: colors.accentSurface, borderColor: colors.accent },
  focused: { borderColor: colors.text },
  iconButton: { minWidth: sizing.touch, minHeight: sizing.touch, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent", borderRadius: radii.control, backgroundColor: colors.surface },
  iconFrame: { minWidth: sizing.icon, minHeight: sizing.icon, alignItems: "center", justifyContent: "center" },
  banner: { minWidth: sizing.touch, minHeight: sizing.touch, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm,
    backgroundColor: colors.accentSurface, borderRadius: radii.control, borderWidth: 2, borderColor: "transparent" },
  bannerLabel: { ...type.button, color: colors.accent, flex: 1, flexShrink: 1 },
  selectedLabel: { color: colors.accent },
  inputFocused: { borderColor: colors.accent },
  disabled: { opacity: feedback.disabledOpacity },
  buttonLabel: { ...type.button, color: colors.background, textAlign: "center", flexShrink: 1 },
  secondaryLabel: { color: colors.text },
  dim: { opacity: feedback.pressedOpacity },
  avatar: { backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  initials: { ...type.label, color: colors.accent, fontWeight: "700" },
  profileInitials: { ...type.title, color: colors.accent },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingVertical: spacing.xs },
  stat: { flexGrow: 1, minWidth: 84, maxWidth: "100%", gap: spacing.xs },
  compactStat: { minWidth: 64, alignItems: "center" },
  compactStats: { gap: spacing.xs },
});
