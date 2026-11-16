import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui";
import { colors } from "../theme/colors";
import { feedback, spacing, type } from "../theme/design";
import { ProfileAvatar } from "./ProfileAvatar";
import { pickProfilePhoto, releaseMedia } from "./mediaPicker";
import { avatarInitials } from "./settingsState";
import type { SocialProps } from "./SocialScreens";
import { mediaValidationError } from "./localMedia";

let requestSequence = 0;
export function ProfilePhotoEditor({ social, onSocialAction: send }: SocialProps) {
  const mounted = useRef(false);
  const request = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current = null; };
  }, []);
  const draft = social.settingsDraft;
  if (draft?.section !== "profile") return null;
  const busy = !!draft.photoPending;
  async function choose(source: "photo" | "cameraPhoto") {
    if (!mounted.current || request.current) return;
    const token = `profile-photo-${++requestSequence}`;
    request.current = token;
    send({ type: "beginProfilePhoto", token });
    try {
      const result = await pickProfilePhoto(source);
      if (!mounted.current || request.current !== token) { if (result.media) releaseMedia(result.media); return; }
      if (result.media && (result.media.kind !== "photo" || mediaValidationError(result.media))) {
        releaseMedia(result.media);
        send({ type: "finishProfilePhoto", token, error: "Choose a supported profile photo." }); return;
      }
      send({ type: "finishProfilePhoto", token, photo: result.media, error: result.error });
    } catch {
      if (mounted.current && request.current === token) send({ type: "finishProfilePhoto", token, error: "Photo could not be opened. Check gallery or camera access and try again." });
    } finally { if (request.current === token) request.current = null; }
  }
  return <View testID="profile-photo-editor" style={styles.card}>
    <View style={styles.previewRow}>
      <ProfileAvatar initials={avatarInitials(draft.values)} photo={draft.values.photo} size={64}
        onAvailable={(photoId) => send({ type: "profilePhotoAvailable", photoId })}
        onUnavailable={(photoId) => send({ type: "profilePhotoError", photoId, error: "Profile photo is unavailable. Remove it or choose another photo." })} />
      <View style={styles.copy}>
        <View style={styles.heading}>
          <Text style={styles.label}>Profile photo</Text>
          {!!draft.values.photo && <Pressable accessibilityRole="button" accessibilityLabel="Remove Photo" disabled={busy} accessibilityState={{ disabled: busy }}
            onPress={() => send({ type: "removeProfilePhoto" })} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={({ pressed }) => [styles.remove, focused && styles.focused, pressed && styles.pressed]}><Text style={styles.removeLabel}>Remove photo</Text></Pressable>}
        </View>
        <View style={styles.actions}>
          <View style={styles.actionSlot}><Button secondary label="Gallery" accessibilityLabel="Choose from Gallery" disabled={busy} onPress={() => { void choose("photo"); }} /></View>
          <View style={styles.actionSlot}><Button secondary label="Camera" accessibilityLabel="Take Photo" disabled={busy} onPress={() => { void choose("cameraPhoto"); }} /></View>
        </View>
        {busy && <Text accessibilityLiveRegion="polite" style={styles.status}>Opening photo picker...</Text>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 0 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  heading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  label: { ...type.label, color: colors.text, flexShrink: 1 },
  actions: { flexDirection: "row", gap: spacing.xs, alignItems: "stretch" },
  actionSlot: { flex: 1, minWidth: 0 },
  remove: { minHeight: 44, minWidth: 44, paddingHorizontal: spacing.xs, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 8 },
  removeLabel: { ...type.caption, fontSize: 11, lineHeight: 16 },
  status: { ...type.caption, fontSize: 11, lineHeight: 16 },
  focused: { borderColor: colors.text }, pressed: { opacity: feedback.pressedOpacity },
});
