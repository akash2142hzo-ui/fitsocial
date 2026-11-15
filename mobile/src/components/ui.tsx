import { ComponentRef, forwardRef, ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme/colors";
import { feedback, radii, sizing, spacing, type, ui } from "../theme/design";

export function Button({ label, onPress, secondary = false, danger = false, disabled = false, selected, expanded, accessibilityLabel, accessibilityHint, icon }: {
  label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean;
  selected?: boolean; expanded?: boolean; accessibilityLabel?: string; accessibilityHint?: string; icon?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityHint={accessibilityHint} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    accessibilityState={{ disabled, selected, expanded }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, selected && styles.selected, focused && !disabled && styles.focused, pressed && !disabled && styles.dim, disabled && styles.disabled]}>
    {icon && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>}
    <Text style={[styles.buttonLabel, (secondary || selected) && styles.secondaryLabel, selected && styles.selectedLabel, danger && { color: colors.error }]}>{label}</Text>
  </Pressable>;
}
export function TextButton({ label, onPress, expanded, accessibilityLabel }: {
  label: string; onPress: () => void; expanded?: boolean; accessibilityLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ expanded }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onPress={onPress} style={({ pressed }) => [styles.textButton, focused && styles.focused, pressed && styles.dim]}>
    <Text style={styles.textButtonLabel}>{label}</Text>
  </Pressable>;
}
export function IconButton({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.iconButton, focused && styles.focused, pressed && styles.dim]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>
  </Pressable>;
}
// Preserve native refs, keyboard behavior and caller focus handlers.
export const Input = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(function Input(
  { style, onFocus, onBlur, ...props }, ref,
) {
  const [focused, setFocused] = useState(false);
  return <TextInput {...props} ref={ref} style={[ui.input, style, focused && styles.inputFocused]}
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
  textButton: { minWidth: sizing.touch, minHeight: sizing.touch, maxWidth: "100%", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, alignSelf: "flex-start", justifyContent: "center", borderWidth: 2, borderColor: "transparent", borderRadius: radii.control },
  textButtonLabel: { ...type.label, color: colors.muted },
  button: { minHeight: sizing.touch, minWidth: sizing.touch, borderWidth: 2, borderColor: "transparent", flexDirection: "row", gap: spacing.sm, borderRadius: radii.control, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, maxWidth: "100%" },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.accentSurface, borderColor: colors.accent },
  focused: { borderColor: colors.text },
  iconButton: { minWidth: sizing.touch, minHeight: sizing.touch, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent", borderRadius: radii.control, backgroundColor: colors.surface },
  selectedLabel: { color: colors.accent },
  inputFocused: { borderColor: colors.accent },
  disabled: { opacity: feedback.disabledOpacity },
  buttonLabel: { color: colors.background, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  secondaryLabel: { color: colors.text },
  dim: { opacity: feedback.pressedOpacity },
  avatar: { backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  initials: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  profileInitials: { ...type.title, color: colors.accent },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingVertical: spacing.sm },
  stat: { flexGrow: 1, minWidth: 84, maxWidth: "100%", gap: spacing.xs },
  compactStat: { minWidth: 64, alignItems: "center" },
  compactStats: { gap: spacing.xs },
});
