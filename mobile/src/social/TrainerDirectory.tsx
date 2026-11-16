import { ProfileAvatar } from "./ProfileAvatar";
import { LocalMedia } from "./localMedia";
import { useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Input, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, radii, spacing, type } from "../theme/design";
import type { AuthorNavigationProps, SocialProps } from "./SocialScreens";
import { identityFor } from "./trainerIdentity";
import { coachingModes, discoverTrainers, specializations, TRAINER_DISCLOSURE, TrainerProfile } from "./trainerState";

function DiscoveryChip({ label, accessibilityLabel, selected, onPress }: { label: string; accessibilityLabel: string; selected: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.chipTarget, focused && styles.focused, pressed && styles.pressed]}>
    <View style={[styles.chip, selected && styles.selectedChip]}><Text style={[styles.chipText, selected && styles.selectedText]}>{label}</Text></View>
  </Pressable>;
}

export function TrainerCard({ profile, initials, photo, onPress }: { profile: TrainerProfile; initials: string; photo?: LocalMedia | null; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable testID="trainer-directory-card" accessibilityRole="button" accessibilityLabel={`View trainer profile: ${profile.displayName}`}
    accessibilityHint={`${profile.sample ? "Fictional sample. " : ""}Self-declared and unverified. ${profile.specializations.join(", ")}. Coaching mode: ${profile.coachingMode}.`}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.card, focused && styles.focused, pressed && styles.pressed]}>
    <View style={styles.identity}><ProfileAvatar initials={initials} photo={photo} size={40} /><View style={styles.identityText}>
      <Text style={styles.name}>{profile.displayName}</Text><Text style={styles.username}>@{profile.username}</Text>
      <Text style={styles.unverified}>{profile.sample ? "Sample \u00b7 Unverified" : "Unverified"}{" \u00b7 Self-declared"}</Text>
    </View></View>
    <Text style={styles.specialties}>{profile.specializations.join(" \u00b7 ")}</Text>
    <View style={styles.footer}><Text style={styles.mode}>{profile.coachingMode}</Text><Text style={styles.profileLink}>View Profile {"\u203a"}</Text></View>
  </Pressable>;
}

export function TrainerDiscovery({ social, onSocialAction, onOpenAuthor }: SocialProps & AuthorNavigationProps) {
  const state = social.trainers;
  const profiles = discoverTrainers(state);
  const filter = (field: "query" | "specialization" | "coachingMode", value: string) => onSocialAction({ type: "trainer", action: { type: "filter", field, value } });
  function reset() { filter("query", ""); filter("specialization", "All"); filter("coachingMode", "All"); Keyboard.dismiss(); }
  return <View style={styles.directory}>
    <Text style={styles.subtitle}>Find your kind of fitness guidance</Text>
    <Text style={styles.disclosure}>Self-declared trainers. {TRAINER_DISCLOSURE} Listings and interactions are local demo examples.</Text>
    <View style={styles.search}>
      <Text accessible={false} style={styles.searchIcon}>{"\u2315"}</Text>
      <Input accessibilityLabel="Search trainers by name, username or specialization" value={state.query} onChangeText={(value) => filter("query", value)}
        maxLength={80} placeholder="Search trainers or specialties" autoCorrect={false} autoCapitalize="none" returnKeyType="search"
        onSubmitEditing={Keyboard.dismiss} style={styles.searchInput} />
      {!!state.query && <Pressable accessibilityRole="button" accessibilityLabel="Clear trainer search" onPress={() => { filter("query", ""); Keyboard.dismiss(); }}
        style={({ pressed }) => [styles.clearTarget, pressed && styles.pressed]}><Text style={styles.clearGlyph}>{"\u00d7"}</Text></Pressable>}
    </View>
    <View style={styles.filterGroup}><Text style={styles.filterLabel}>Specialization</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" accessibilityLabel="Trainer specialization filters" contentContainerStyle={styles.chipRow}>
        {["All", ...specializations].map((value) => <DiscoveryChip key={value} label={value} selected={state.specialization === value}
          accessibilityLabel={`Trainer specialization filter: ${value}`} onPress={() => filter("specialization", value)} />)}
      </ScrollView>
    </View>
    <View style={styles.filterGroup}><Text style={styles.filterLabel}>Coaching mode</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" accessibilityLabel="Trainer coaching filters" contentContainerStyle={styles.chipRow}>
        {["All", ...coachingModes].map((value) => <DiscoveryChip key={value} label={value} selected={state.coachingMode === value}
          accessibilityLabel={`Trainer coaching filter: ${value}`} onPress={() => filter("coachingMode", value)} />)}
      </ScrollView>
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{profiles.length} trainers</Text>
    {profiles.length === 0 && <View style={styles.empty}>
      <Text accessible={false} style={styles.emptyIcon}>{"\u2315"}</Text>
      <Text accessibilityRole="header" style={type.heading}>No matching trainers.</Text>
      <Text style={type.caption}>Try another name, specialty or coaching mode.</Text>
      <TextButton label="Reset trainer filters" onPress={reset} />
    </View>}
    {profiles.map((profile) => <TrainerCard key={profile.authorId} profile={profile} photo={identityFor(social, profile.authorId)?.photo} initials={identityFor(social, profile.authorId)?.initials ?? "?"}
      onPress={() => { Keyboard.dismiss(); onOpenAuthor(profile.authorId); }} />)}
  </View>;
}

const styles = StyleSheet.create({
  directory: { gap: spacing.sm },
  subtitle: { ...type.caption },
  disclosure: { ...type.caption, fontSize: 11, lineHeight: 16 },
  search: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.control, borderWidth: 1, borderColor: colors.border, paddingLeft: spacing.md },
  searchIcon: { ...type.heading, color: colors.muted, fontSize: 22 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: spacing.sm, borderWidth: 0, backgroundColor: "transparent", fontSize: 13 },
  clearTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  clearGlyph: { ...type.heading, color: colors.muted, fontSize: 22 },
  filterGroup: { gap: 0 },
  filterLabel: { ...type.label, fontSize: 11, lineHeight: 16 },
  chipRow: { flexDirection: "row", gap: spacing.xs, paddingRight: spacing.xs },
  chipTarget: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", borderRadius: radii.pill },
  chip: { backgroundColor: colors.surface, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipText: { ...type.label, color: colors.muted, fontSize: 12 },
  selectedChip: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedText: { color: colors.background },
  focused: { borderColor: colors.text },
  pressed: { opacity: feedback.pressedOpacity },
  resultCount: { ...type.caption, fontSize: 11 },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, minWidth: 0, minHeight: 44 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identityText: { flex: 1, minWidth: 0, gap: 1 },
  name: { ...type.heading },
  username: { ...type.caption, fontSize: 11, lineHeight: 16 },
  unverified: { ...type.caption, fontSize: 11, lineHeight: 16 },
  specialties: { ...type.body, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  mode: { ...type.caption },
  profileLink: { ...type.button, color: colors.accent, fontSize: 12, lineHeight: 18 },
  empty: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  emptyIcon: { ...type.title, color: colors.muted },
});
