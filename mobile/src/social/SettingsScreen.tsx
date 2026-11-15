import { Keyboard, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, Heading, Input, TextButton } from "../components/ui";
import { appName } from "../appInfo";
import { colors } from "../theme/colors";
import { spacing, type, ui } from "../theme/design";
import { expo } from "../../app.json";
import { SocialProps } from "./SocialScreens";
import { avatarInitials, avatarOptions, profileLimits, settingsDirty } from "./settingsState";

export function SettingsScreen({ social, onSocialAction: send }: SocialProps) {
  const draft = social.settingsDraft;
  function cancel() {
    Keyboard.dismiss();
    send({ type: draft && settingsDirty(draft) ? "confirmSettingsDiscard" : "closeSettingsEditor" });
  }
  if (draft?.confirming) return <View style={ui.stack}>
    <Heading>Discard settings edits?</Heading>
    <Text style={type.body}>Your saved profile and preferences will stay unchanged.</Text>
    <Button label="Keep editing" onPress={() => send({ type: "keepSettingsEditing" })} />
    <Button secondary danger label="Discard edits" onPress={() => send({ type: "closeSettingsEditor" })} />
  </View>;
  if (draft) return <View style={ui.stack}>
    <Heading>{draft.section === "profile" ? "Edit profile" : draft.section === "privacy" ? "Future account preference" : "Fitness preferences"}</Heading>
    {draft.section === "privacy" ? <>
      <Text style={type.body}>Local-only future account preference. This does not make your account private or publish anything online.</Text>
      <Text style={type.caption}>No access controls are enforced in this local demo. Posts and interactions stay unchanged.</Text>
      <View style={ui.row}>{(["Public", "Private"] as const).map((value) => <Button key={value} secondary label={value}
        accessibilityLabel={`Future visibility preference: ${value}`} selected={draft.values.futureVisibility === value}
        onPress={() => send({ type: "editSettings", field: "futureVisibility", value })} />)}</View>
    </> : draft.section === "profile" ? <>
      <Avatar initials={avatarInitials(draft.values)} />
      {(["displayName", "username", "bio", "location"] as const).map((field) => <View key={field} style={styles.field}>
        <Text style={type.label}>{field === "displayName" ? "Display name, required" : field === "username" ? "Username, required" : field === "bio" ? "Bio, optional" : "Broad location, optional"}</Text>
        <Input accessibilityLabel={field === "bio" ? "Local bio" : field === "displayName" ? "Profile display name" : field === "username" ? "Profile username" : "Profile broad location"}
          value={draft.values[field]} maxLength={profileLimits[field] + 1} multiline={field === "bio"}
          autoCapitalize={field === "username" ? "none" : "sentences"} autoCorrect={field !== "username"}
          onChangeText={(value) => send({ type: "editSettings", field, value })} />
      </View>)}
      <Heading>Avatar</Heading>
      <View style={ui.row}>{avatarOptions.map((avatar) => <Button key={avatar} secondary label={avatar} accessibilityLabel={`Avatar: ${avatar}`}
        selected={draft.values.avatar === avatar} onPress={() => send({ type: "editSettings", field: "avatar", value: avatar })} />)}</View>
      <Text style={type.caption}>Local letter avatars. Photo uploads are unavailable.</Text>
    </> : <>
      <Text style={type.caption}>Personal measurements. Body weight defaults into new sessions; Train can override it for that session. Saved workouts never change.</Text>
      <View style={styles.field}><Text style={type.label}>Height (cm), optional</Text>
        <Input accessibilityLabel="Personal height in centimeters" keyboardType="decimal-pad" maxLength={8} value={draft.values.heightCm}
          onChangeText={(value) => send({ type: "editSettings", field: "heightCm", value })} /></View>
      <View style={styles.field}><Text style={type.label}>Body weight (kg), optional</Text>
        <Input accessibilityLabel="Personal body weight in kilograms" keyboardType="decimal-pad" maxLength={8} value={draft.values.bodyWeightKg}
          onChangeText={(value) => send({ type: "editSettings", field: "bodyWeightKg", value })} /></View>
      <Text style={type.caption}>Height: 50–250 cm. Weight: 1–500 kg. Up to two decimals; blank clears a measurement.</Text>
      <Button secondary selected label="Metric · cm / kg / km" onPress={() => send({ type: "editSettings", field: "units", value: "Metric" })} />
      <Unavailable label="Imperial units" />
      <Text style={type.caption}>Imperial units are unavailable. Workout inputs use metric units.</Text>
    </>}
    {draft.error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={type.error}>{draft.error}</Text>}
    <View style={ui.row}>
      <Button label={draft.section === "profile" ? "Save profile" : draft.section === "privacy" ? "Save future preference" : "Save preferences"} onPress={() => { Keyboard.dismiss(); send({ type: "saveSettings" }); }} />
      <TextButton label="Cancel edits" onPress={cancel} />
    </View>
  </View>;
  return <View style={ui.stack}>
    <Text style={type.caption}>Changes stay on this device for this app session.</Text>
    <View style={styles.section}><Heading>Edit profile</Heading>
      <TextButton label="Name, username, bio and avatar" accessibilityLabel="Edit local profile" onPress={() => send({ type: "openSettingsEditor", section: "profile" })} />
    </View>
    <View style={styles.section}><Heading>Account &amp; Privacy</Heading>
      <Text style={type.caption}>Future preference: {social.futureVisibility}. Local only; no enforcement effect.</Text>
      <TextButton label="Future account preference" accessibilityLabel="Edit future privacy preference" onPress={() => send({ type: "openSettingsEditor", section: "privacy" })} />
      <Text style={type.caption}>Available when accounts launch.</Text>
      <View style={ui.row}><Unavailable label="Public" /><Unavailable label="Private" /></View>
      <Text style={type.caption}>Account visibility is not enforced in this local demo.</Text>
    </View>
    <View style={styles.section}><Heading>Fitness preferences</Heading>
      <Text style={type.caption}>{social.fitness.heightCm ? `${social.fitness.heightCm} cm` : "Height not set"} · {social.fitness.bodyWeightKg ? `${social.fitness.bodyWeightKg} kg` : "Weight not set"} · Metric</Text>
      <TextButton label="Measurements and units" onPress={() => send({ type: "openSettingsEditor", section: "fitness" })} />
    </View>
    <View style={styles.section}><Heading>Security &amp; Login</Heading>
      <Text style={type.caption}>Account &amp; security controls. Accounts and login are not available in this local demo.</Text>
      {["Sign in", "Sign-in methods", "Password management", "Account recovery", "Sign out", "Delete account"].map((label) => <Unavailable key={label} label={label} />)}
    </View>
    <View style={styles.section}><Heading>Notifications</Heading>
      <Text style={type.caption}>Coming later. Notifications are unavailable. No device permissions are requested.</Text>
      {["Social interactions", "Workout reminders", "Trainer activity"].map((label) => <Unavailable key={label} label={label} />)}
    </View>
    <View style={styles.section}><Heading>About {appName}</Heading>
      <Text style={type.body}>{appName} · {expo.version}</Text>
      <Text style={type.caption}>Local demo. Data is temporary and resets when the app process restarts. No authenticated accounts, server privacy enforcement or cross-device storage.</Text>
    </View>
  </View>;
}
function Unavailable({ label }: { label: string }) {
  return <Button secondary disabled label={`${label} · Unavailable`} accessibilityLabel={`${label}, unavailable in local demo`} onPress={() => undefined} />;
}
const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  section: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
