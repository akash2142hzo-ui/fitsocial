import { ProfilePhotoEditor } from "./ProfilePhotoEditor";
import { mediaIsReadable } from "./mediaPicker";
import { ReactNode, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, FilterPill, Heading, IconButton, Input, TextButton } from "../components/ui";
import { appName } from "../appInfo";
import { colors } from "../theme/colors";
import { feedback, spacing, type, ui } from "../theme/design";
import { expo } from "../../app.json";
import { SocialProps } from "./SocialScreens";
import { profileLimits, settingsDirty } from "./settingsState";

export function SettingsScreen({ social, onSocialAction: send }: SocialProps) {
  const draft = social.settingsDraft;
  function save() {
    Keyboard.dismiss();
    if (draft?.section === "profile" && draft.values.photo && !mediaIsReadable(draft.values.photo)) {
      send({ type: "profilePhotoError", photoId: draft.values.photo.id, error: "Profile photo is unavailable. Remove it or choose another photo." }); return;
    }
    send({ type: "saveSettings" });
  }
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
  if (draft) return <View testID="settings-editor" style={draft.section === "profile" ? styles.profileEditor : ui.stack}>
    <Heading>{draft.section === "profile" ? "Edit profile" : draft.section === "privacy" ? "Future account preference" : "Fitness preferences"}</Heading>
    {draft.section === "privacy" ? <>
      <Text style={type.body}>Local-only future account preference. This does not make your account private or publish anything online.</Text>
      <Text style={type.caption}>No access controls are enforced in this local demo. Posts and interactions stay unchanged.</Text>
      <View style={ui.row}>{(["Public", "Private"] as const).map((value) => <FilterPill key={value} label={value}
        accessibilityLabel={`Future visibility preference: ${value}`} selected={draft.values.futureVisibility === value}
        onPress={() => send({ type: "editSettings", field: "futureVisibility", value })} />)}</View>
    </> : draft.section === "profile" ? <>
      <ProfilePhotoEditor social={social} onSocialAction={send} />
      {(["displayName", "username", "bio", "location"] as const).map((field) => <View key={field} style={styles.profileField}>
        <Text style={type.label}>{field === "displayName" ? "Display name, required" : field === "username" ? "Username, required" : field === "bio" ? "Bio, optional" : "Broad location, optional"}</Text>
        <Input accessibilityLabel={field === "bio" ? "Local bio" : field === "displayName" ? "Profile display name" : field === "username" ? "Profile username" : "Profile broad location"}
          value={draft.values[field]} maxLength={profileLimits[field] + 1} multiline={field === "bio"}
          style={[styles.profileInput, field === "bio" && styles.bioInput]}
          autoCapitalize={field === "username" ? "none" : "sentences"} autoCorrect={field !== "username"}
          onChangeText={(value) => send({ type: "editSettings", field, value })} />
      </View>)}
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
      <SettingRow label="Imperial units" icon="U" status="Coming soon" />
      <Text style={type.caption}>Imperial units are unavailable. Workout inputs use metric units.</Text>
    </>}
    {draft.error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={type.error}>{draft.error}</Text>}
    {draft.section === "profile" ? <View testID="profile-settings-actions" style={styles.profileActions}>
      <View style={styles.actionSlot}><Button label="Save profile" disabled={!!draft.photoPending} onPress={save} /></View>
      <View style={styles.actionSlot}><Button secondary label="Cancel edits" onPress={cancel} /></View>
    </View> : <View style={ui.row}>
      <Button label={draft.section === "privacy" ? "Save future preference" : "Save preferences"} disabled={!!draft.photoPending} onPress={save} />
      <TextButton label="Cancel edits" onPress={cancel} />
    </View>}
  </View>;
  return <View testID="settings-overview" style={styles.overview}>
    <SettingsGroup title="Account">
      <SettingRow label="Edit Profile" accessibilityLabel="Edit local profile" icon={"\u270e"} onPress={() => send({ type: "openSettingsEditor", section: "profile" })} />
      <SettingRow label="Fitness Preferences" accessibilityLabel="Measurements and units" icon={"\u2197"}
        detail={`${social.fitness.heightCm ? social.fitness.heightCm + " cm" : "Height not set"} \u00b7 ${social.fitness.bodyWeightKg ? social.fitness.bodyWeightKg + " kg" : "Weight not set"} \u00b7 Metric`}
        onPress={() => send({ type: "openSettingsEditor", section: "fitness" })} />
      <SettingRow label="Login & Security" icon={"\u25c7"} status="Coming soon" />
    </SettingsGroup>
    <SettingsGroup title="Appearance">
      <SettingRow label="App Theme" icon={"\u25d0"} status="Dark" />
      <SettingRow label="Text Size" icon="Aa" status="Default" detail="Uses system text scaling" />
    </SettingsGroup>
    <SettingsGroup title="Privacy & Safety">
      <SettingRow label="Account Privacy" icon={"\u25c8"} status="Coming soon" />
      <SettingRow label="Local Privacy Preference" accessibilityLabel="Edit future privacy preference" icon={"\u25cb"}
        detail={`Future preference: ${social.futureVisibility}. Local only; no enforcement effect.`}
        onPress={() => send({ type: "openSettingsEditor", section: "privacy" })} />
      <SettingRow label="Blocked Accounts" icon={"\u2298"} status="Coming soon" />
    </SettingsGroup>
    <SettingsGroup title="Notifications">
      <SettingRow label="Social Notifications" icon={"\u2661"} status="Coming soon" />
      <SettingRow label="Workout Reminders" icon={"\u25f7"} status="Coming soon" />
      <SettingRow label="Trainer Notifications" icon={"\u25c7"} status="Coming soon" />
    </SettingsGroup>
    <SettingsGroup title="Storage & Data">
      <SettingRow label="Storage & Media" icon={"\u25a7"} status="Local only" detail="Local media previews. No uploads." />
      <SettingRow label="Your Data" icon={"\u25a4"} status="Session only" detail="Demo state resets with the app process. No backup or export." />
    </SettingsGroup>
    <SettingsGroup title="About">
      <SettingRow label={`About ${appName}`} icon="i" status={expo.version} />
    </SettingsGroup>
    <SettingsGroup title="Account Management" danger>
      <SettingRow label="Delete Account" icon={"\u00d7"} status="Unavailable" detail="Requires an authenticated account." danger />
    </SettingsGroup>
    <Text style={styles.footer}>Local preferences last for this session. No production services connected.</Text>
  </View>;
}

export function SettingsHeader({ onBack }: { onBack: () => void }) {
  return <View testID="settings-header" style={styles.header}>
    <IconButton label="Back to previous screen" onPress={onBack} icon={<Text style={styles.backArrow}>{"\u2190"}</Text>} />
    <Text accessibilityRole="header" style={styles.title}>Settings</Text>
    <Text style={styles.demo}>Local demo</Text>
  </View>;
}

function SettingsGroup({ title, children, danger = false }: { title: string; children: ReactNode; danger?: boolean }) {
  return <View testID="settings-group" style={styles.group}>
    <Text accessibilityRole="header" style={[styles.groupTitle, danger && styles.danger]}>{title}</Text>
    <View style={styles.groupCard}>{children}</View>
  </View>;
}

function SettingRow({ label, accessibilityLabel, icon, status, detail, onPress, danger = false }: {
  label: string; accessibilityLabel?: string; icon: string; status?: string; detail?: string; onPress?: () => void; danger?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const content = <>
    <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, danger && styles.danger]}>{icon}</Text>
    <View style={styles.rowContent}><Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>{!!detail && <Text style={styles.detail}>{detail}</Text>}</View>
    {!!status && <Text style={styles.status}>{status}</Text>}
    {!!onPress && <Text testID="settings-row-chevron" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevron}>{"\u203a"}</Text>}
  </>;
  if (!onPress) return <View testID="settings-static-row" accessible accessibilityLabel={[label, status, detail].filter(Boolean).join(". ")} style={styles.row}>{content}</View>;
  return <Pressable testID="settings-action-row" accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityHint={detail}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.row, focused && styles.focused, pressed && styles.pressed]}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  profileEditor: { gap: spacing.sm, minWidth: 0 },
  profileField: { gap: spacing.xs, minWidth: 0 },
  profileInput: { minHeight: 44, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bioInput: { minHeight: 72, maxHeight: 120, textAlignVertical: "top" },
  profileActions: { flexDirection: "row", alignItems: "stretch", gap: spacing.sm },
  actionSlot: { flex: 1, minWidth: 0 },
  field: { gap: spacing.sm },
  overview: { gap: spacing.md, minWidth: 0 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.sm, minHeight: 52 },
  backArrow: { ...type.heading, fontSize: 22, lineHeight: 26 },
  title: { ...type.heading, flex: 1, minWidth: 0 },
  demo: { ...type.caption, fontSize: 10, lineHeight: 14, flexShrink: 1, backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  group: { gap: spacing.xs, minWidth: 0 },
  groupTitle: { ...type.label, paddingHorizontal: spacing.xs },
  groupCard: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, borderWidth: 1, borderColor: "transparent", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, borderRadius: 6 },
  icon: { ...type.label, fontSize: 16, lineHeight: 20, color: colors.accent, minWidth: 22, flexShrink: 0, textAlign: "center" },
  rowContent: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { ...type.body, fontSize: 13, lineHeight: 18 },
  detail: { ...type.caption, fontSize: 11, lineHeight: 16 },
  status: { ...type.caption, fontSize: 11, lineHeight: 16, textAlign: "right", maxWidth: "38%", flexShrink: 1 },
  chevron: { ...type.body, color: colors.muted },
  focused: { borderColor: colors.text },
  pressed: { opacity: feedback.pressedOpacity },
  danger: { color: colors.error },
  footer: { ...type.caption, fontSize: 11, lineHeight: 16 },
});
