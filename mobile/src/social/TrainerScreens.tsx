import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Input, Avatar, Button, EmptyState, Heading, TextButton } from "../components/ui";
import { colors } from "../theme/colors";
import { type, ui } from "../theme/design";
import { AuthorNavigationProps, SocialProps } from "./SocialScreens";
import { identityFor } from "./trainerIdentity";
import { authors, LOCAL_AUTHOR_ID } from "./sampleData";
import { availabilityOptions, coachingModes, discoverTrainers, specializations, TrainerAction, TRAINER_ACKNOWLEDGMENT,
  TRAINER_DISCLOSURE, trainerLimits, TrainerTextField, validateTrainer } from "./trainerState";

const textFields: { field: TrainerTextField; label: string; multiline?: boolean }[] = [
  { field: "displayName", label: "Display name (required)" }, { field: "username", label: "Username (required)" }, { field: "bio", label: "Bio (optional)", multiline: true },
  { field: "experience", label: "Experience description (optional)", multiline: true },
  { field: "qualifications", label: "Self-reported qualifications (optional)", multiline: true }, { field: "location", label: "Broad location (optional)" },
];
export function TrainerSetup({ social, onSocialAction, onDone }: SocialProps & { onDone: () => void }) {
  const send = (action: TrainerAction) => onSocialAction({ type: "trainer", action });
  const draft = social.trainers.draft;
  if (!draft) return <EmptyState title="Trainer setup is not open."><TextButton label="Back to Profile" onPress={onDone} /></EmptyState>;
  const reserved = authors.filter((author) => author.id !== LOCAL_AUTHOR_ID).map((author) => social.trainers.profiles[author.id]?.username ?? author.username);
  return <View style={ui.stack}>
    <Text style={styles.status}>Self-declared trainer · Unverified</Text>
    <Text style={type.caption}>{TRAINER_DISCLOSURE}</Text>
    <Text style={type.caption}>Draft stays in memory as you switch screens. Use a city or region only; no address, phone or sensitive information.</Text>
    {textFields.map(({ field, label, multiline }) => <View key={field} style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <Input accessibilityLabel={"Trainer " + label + ", maximum " + trainerLimits[field] + " characters"}
        value={draft[field]} onChangeText={(value) => send({ type: "edit", field, value })} maxLength={trainerLimits[field] + 1}
        multiline={multiline} autoCapitalize={field === "username" ? "none" : "sentences"} autoCorrect={field !== "username"}
        placeholder={field === "location" ? "City or region" : label} placeholderTextColor={colors.muted}
        selectionColor={colors.accent} style={[ui.input, multiline && styles.multiline]} />
      <Text style={type.caption}>{draft[field].length}/{trainerLimits[field]}</Text>
    </View>)}
    <Heading>Specializations</Heading>
    <Text style={type.caption}>Choose 1–4</Text>
    <View style={ui.row}>{specializations.map((value) => <Button key={value} secondary label={value}
      selected={draft.specializations.includes(value)} onPress={() => send({ type: "specialization", value })} />)}</View>
    <Heading>Coaching mode</Heading>
    <View style={ui.row}>{coachingModes.map((value) => <Button key={value} secondary label={value} selected={draft.coachingMode === value} onPress={() => send({ type: "mode", value })} />)}</View>
    <Heading>Availability</Heading>
    <View style={ui.row}>{availabilityOptions.map((value) => <Button key={value} secondary label={value} selected={draft.availability === value} onPress={() => send({ type: "availability", value })} />)}</View>
    <Text style={type.caption}>A self-reported status. Contact and booking are not connected.</Text>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={TRAINER_ACKNOWLEDGMENT} accessibilityState={{ checked: draft.acknowledged }}
      onPress={() => send({ type: "acknowledge", value: !draft.acknowledged })} style={styles.acknowledgment}>
      <Text style={styles.status}>{draft.acknowledged ? "[x]" : "[ ]"}</Text><Text style={styles.ackText}>{TRAINER_ACKNOWLEDGMENT}</Text>
    </Pressable>
    {social.trainers.error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={type.error}>{social.trainers.error}</Text>}
    <Button label={social.trainers.profiles[LOCAL_AUTHOR_ID]?.enabled ? "Save trainer profile" : "Enable trainer profile"} onPress={() => {
      const error = validateTrainer(draft, reserved);
      send({ type: "save", authorId: LOCAL_AUTHOR_ID, reservedUsernames: reserved });
      if (!error) onDone();
    }} />
    <TextButton label="Back to Profile" onPress={onDone} />
  </View>;
}
export function TrainerDetails({ social, onSocialAction, authorId, onSetup }: SocialProps & { authorId: string; onSetup: () => void }) {
  const profile = social.trainers.profiles[authorId];
  const own = authorId === LOCAL_AUTHOR_ID;
  const send = (action: TrainerAction) => onSocialAction({ type: "trainer", action });
  function open() {
    const author = identityFor(social, authorId)!;
    send({ type: "open", authorId, displayName: author.name, username: author.username, bio: author.bio });
    if (!profile) send({ type: "edit", field: "location", value: social.localProfile.location });
    onSetup();
  }
  return <View style={styles.details}>
    {(own || profile?.enabled) && <Heading>Trainer profile</Heading>}
    {profile?.enabled && <>
      <Text style={styles.status}>{profile.sample ? "Sample · Unverified trainer" : "Unverified trainer"}</Text>
      <Text style={type.caption}>{TRAINER_DISCLOSURE}</Text>
      <Text style={type.body}>{profile.specializations.join(" · ")}</Text>
      <Text style={type.caption}>{profile.coachingMode}{profile.location ? " · " + profile.location : ""}</Text>
      <Text style={type.caption}>{profile.availability} · Self-reported; inquiries are not connected.</Text>
      <Text style={type.label}>Experience (self-reported)</Text><Text style={type.body}>{profile.experience || "Not provided"}</Text>
      <Text style={type.label}>Self-reported qualifications</Text><Text style={type.body}>{profile.qualifications || "Not provided"}</Text>
    </>}
    {own && <>
      {!social.trainers.disabling && <TextButton label={social.trainers.draft ? "Continue trainer setup" : profile?.enabled ? "Edit trainer profile" : "Become a trainer"} onPress={open} />}
      {profile?.enabled && !social.trainers.disabling && <TextButton label="Disable trainer status" onPress={() => send({ type: "requestDisable", authorId })} />}
      {social.trainers.disabling && <View style={ui.card}>
        <Heading>Disable trainer status?</Heading>
        <Text style={type.body}>Hide your trainer listing and label. Trainer details and drafts stay in memory; personal bio, posts, workouts and follows remain.</Text>
        <Button secondary label="Keep trainer status" onPress={() => send({ type: "cancelDisable", authorId })} />
        <Button secondary danger label="Confirm disable trainer status" onPress={() => send({ type: "confirmDisable", authorId })} />
      </View>}
    </>}
  </View>;
}
export function TrainerDiscovery({ social, onSocialAction, onOpenAuthor }: SocialProps & AuthorNavigationProps) {
  const state = social.trainers;
  const profiles = discoverTrainers(state);
  const filter = (field: "query" | "specialization" | "coachingMode", value: string) => onSocialAction({ type: "trainer", action: { type: "filter", field, value } });
  return <View style={ui.stack}>
    <Text style={type.caption}>Self-declared · Unverified. {TRAINER_DISCLOSURE}</Text>
    <Input accessibilityLabel="Search trainers by name, username or specialization" value={state.query} onChangeText={(value) => filter("query", value)}
      maxLength={80} placeholder="Search trainers" placeholderTextColor={colors.muted} selectionColor={colors.accent} style={ui.input} />
    <Text style={type.label}>Specialization</Text>
    <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={styles.filterRow}>
      {["All", ...specializations].map((value) => <Button key={value} secondary label={value} selected={state.specialization === value} accessibilityLabel={"Trainer specialization filter: " + value} onPress={() => filter("specialization", value)} />)}
    </ScrollView>
    <Text style={type.label}>Coaching mode</Text>
    <View style={ui.row}>{["All", ...coachingModes].map((value) => <Button key={value} secondary label={value} selected={state.coachingMode === value} accessibilityLabel={"Trainer coaching filter: " + value} onPress={() => filter("coachingMode", value)} />)}</View>
    <Text accessibilityLiveRegion="polite" style={type.caption}>{profiles.length} trainers</Text>
    {profiles.length === 0 && <EmptyState title="No matching trainers."><TextButton label="Reset trainer filters" onPress={() => { filter("query", ""); filter("specialization", "All"); filter("coachingMode", "All"); }} /></EmptyState>}
    {profiles.map((profile) => <View key={profile.authorId} style={styles.discoveryCard}>
      <View style={styles.identity}><Avatar initials={identityFor(social, profile.authorId)?.initials ?? "?"} /><View style={styles.identityText}>
        <Heading>{profile.displayName}</Heading><Text style={type.caption}>@{profile.username}</Text>
      </View></View>
      <Text style={styles.status}>{profile.sample ? "Sample · Unverified" : "Unverified"}</Text>
      <Text style={type.caption}>{profile.specializations.join(" · ")} · {profile.coachingMode}</Text>
      <TextButton label="View profile" accessibilityLabel={"View trainer profile: " + profile.displayName} onPress={() => onOpenAuthor(profile.authorId)} />
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 4 }, multiline: { minHeight: 96, maxHeight: 180, textAlignVertical: "top" },
  filterRow: { flexDirection: "row", gap: 8 },
  status: { ...type.label }, details: { gap: 8 },
  acknowledgment: { minHeight: 48, flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 8 }, ackText: { ...type.body, flex: 1 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 }, identityText: { flex: 1, minWidth: 0 },
  discoveryCard: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
