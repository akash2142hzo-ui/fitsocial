import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProfileAvatar } from "./ProfileAvatar";
import { LocalMedia } from "./localMedia";
import { colors } from "../theme/colors";
import { feedback, radii, spacing, type } from "../theme/design";
import { FeedSection } from "../navigation/navigationState";

function FilterTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.tab, focused && styles.focused, pressed && styles.pressed]}>
    <Text style={[styles.tabLabel, selected && styles.selected]}>{label}</Text>
    <View accessible={false} style={[styles.underline, selected && styles.activeUnderline]} />
  </Pressable>;
}
export function SocialAreaTabs({ items }: { items: readonly { label: string; selected: boolean; onPress: () => void }[] }) {
  return <View accessibilityLabel="Social sections" style={styles.tabs}>
    {items.map((item) => <FilterTab key={item.label} {...item} />)}
  </View>;
}
export function FeedNavigationTabs({ value = "forYou", onForYou, onTrainers, onGroups }: { value?: FeedSection; onForYou: () => void; onTrainers: () => void; onGroups: () => void }) {
  return <SocialAreaTabs items={[
    { label: "For You", selected: value === "forYou", onPress: onForYou },
    { label: "Trainers", selected: value === "trainers", onPress: onTrainers },
    { label: "Groups", selected: value === "groups", onPress: onGroups },
  ]} />;
}

export function FeedComposerEntry({ initials, photo, draft, onPress }: { initials: string; photo?: LocalMedia | null; draft: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  const [postFocused, setPostFocused] = useState(false);
  return <View style={styles.composer}>
    <Pressable accessibilityRole="button" accessibilityLabel="Create Post" accessibilityHint={draft ? "Continue your existing demo draft" : "Open the local demo composer"}
      onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.composerEntry, focused && styles.focused, pressed && styles.pressed]}>
      <ProfileAvatar initials={initials} photo={photo} size={28} /><View style={styles.placeholder}><Text style={styles.placeholderText}>Share your progress...</Text>
        {draft && <Text style={type.caption}>Draft in progress</Text>}</View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Create Post shortcut" onPress={onPress}
      onFocus={() => setPostFocused(true)} onBlur={() => setPostFocused(false)}
      style={({ pressed }) => [styles.postButton, postFocused && styles.focused, pressed && styles.pressed]}><Text accessible={false} maxFontSizeMultiplier={1} style={styles.postLabel}>+</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderColor: "transparent", justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xs, paddingTop: spacing.sm },
  tabLabel: { ...type.button, fontSize: 13, color: colors.muted, textAlign: "center", flexShrink: 1 },
  selected: { color: colors.accent },
  underline: { height: 2, marginTop: spacing.sm, width: "100%", backgroundColor: "transparent" },
  activeUnderline: { backgroundColor: colors.accent },
  focused: { borderColor: colors.text },
  pressed: { opacity: feedback.pressedOpacity },
  composer: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.xs, paddingVertical: 2, backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border },
  composerEntry: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.xs, borderWidth: 1, borderColor: "transparent", borderRadius: radii.control },
  placeholder: { flex: 1, minWidth: 0 },
  placeholderText: { ...type.caption, color: colors.muted },
  postButton: { minWidth: 44, minHeight: 44, paddingHorizontal: spacing.sm, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "transparent", borderRadius: radii.control },
  postLabel: { ...type.button, color: colors.accent, fontSize: 30, lineHeight: 36, fontWeight: "400", textAlign: "center", includeFontPadding: false },
});
