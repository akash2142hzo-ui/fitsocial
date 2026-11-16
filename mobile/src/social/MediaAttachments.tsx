import { Component, lazy, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Image, Keyboard, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { feedback, radii, spacing, type } from "../theme/design";
import { LocalMedia } from "./localMedia";
import { mediaIsReadable, MediaSource, pickLocalMedia, releaseMedia } from "./mediaPicker";
import type { SocialProps } from "./SocialScreens";

const VideoPreview = lazy(() => {
  // Keep a missing native video module inside the preview's error boundary.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return Promise.resolve(require("./NativeVideoPreview") as typeof import("./NativeVideoPreview"));
});
let requestSequence = 0;
function selectionToken(draftId: string) { return `${draftId}-media-${++requestSequence}`; }
class VideoFallback extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? <Text style={type.caption}>Video preview unavailable in this build.</Text> : this.props.children; }
}

function MediaIcon({ kind }: { kind: "photo" | "video" | "camera" }) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.icon}>
    {kind === "video" ? <><View style={styles.videoBody} /><View style={styles.videoLens} /></>
      : <><View style={[styles.photoBody, kind === "camera" && styles.cameraBody]} />
        <View style={kind === "camera" ? styles.cameraLens : styles.photoSun} />
        {kind === "photo" && <Text style={styles.mountain}>{"\u2303"}</Text>}</>}
  </View>;
}

export function MediaToolbar({ social, onSocialAction: send }: SocialProps) {
  const composer = social.composer!;
  const alive = useRef(true);
  const pending = useRef<string | null>(null);
  const choosingCamera = useRef(false);
  const [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (pending.current) send({ type: "finishMedia", draftId: composer.id, token: pending.current });
    };
  }, [composer.id, send]);
  async function choose(source: MediaSource) {
    if (!alive.current || pending.current) return;
    Keyboard.dismiss();
    const token = selectionToken(composer.id);
    pending.current = token;
    send({ type: "beginMedia", draftId: composer.id, token });
    const result = await pickLocalMedia(source);
    if (!alive.current) {
      if (result.media) releaseMedia(result.media);
      return;
    }
    pending.current = null;
    send({ type: "finishMedia", draftId: composer.id, token, ...result });
  }
  function camera() {
    if (pending.current || choosingCamera.current) return;
    Keyboard.dismiss(); choosingCamera.current = true;
    const dismiss = () => { choosingCamera.current = false; };
    Alert.alert("Camera", "Capture one local demo attachment.", [
      { text: "Take photo", onPress: () => { dismiss(); void choose("cameraPhoto"); } },
      { text: "Record video", onPress: () => { dismiss(); void choose("cameraVideo"); } },
      { text: "Cancel", style: "cancel", onPress: dismiss },
    ], { cancelable: true, onDismiss: dismiss });
  }
  return <View testID="media-toolbar" style={styles.toolbar}>
    {(["photo", "video", "camera"] as const).map((kind) => <Pressable key={kind} accessibilityRole="button"
      accessibilityLabel={kind === "photo" ? "Choose local photo" : kind === "video" ? "Choose local video" : "Open camera capture options"}
      accessibilityHint="One local demo attachment. Nothing is uploaded. Choosing again replaces the current attachment."
      disabled={!!composer.mediaPending} accessibilityState={{ disabled: !!composer.mediaPending }}
      onFocus={() => setFocused(kind)} onBlur={() => setFocused(null)}
      onPress={() => { if (!composer.mediaPending) { if (kind === "camera") camera(); else void choose(kind); } }}
      style={({ pressed }) => [styles.tool, focused === kind && styles.focused, pressed && styles.pressed, !!composer.mediaPending && styles.disabled]}>
      <MediaIcon kind={kind} />
    </Pressable>)}
    <Text style={styles.toolbarHint} accessibilityLiveRegion="polite">{composer.mediaPending ? "Opening media…" : "Local media"}</Text>
  </View>;
}

export function MediaPreview({ media, onSocialAction: send, editable = false, busy = false, draftId }: {
  media: LocalMedia; onSocialAction: SocialProps["onSocialAction"]; editable?: boolean; busy?: boolean; draftId?: string;
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const unavailable = useCallback(() => send({ type: "mediaUnavailable", id: media.id }), [media.id, send]);
  useEffect(() => {
    const check = () => { if (!media.unavailable && !mediaIsReadable(media)) unavailable(); };
    check();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") check(); });
    return () => subscription.remove();
  }, [media, unavailable]);
  return <View testID="local-media-preview" style={styles.preview}>
    {media.unavailable ? <Text accessibilityRole="alert" style={type.caption}>Local attachment unavailable. {editable ? "Remove or replace it to continue." : "It may have expired from this device."}</Text>
      : media.kind === "photo" ? <Image accessibilityLabel="Selected local demo photo" source={{ uri: media.uri }} resizeMode="contain" resizeMethod="resize"
        style={[styles.image, { aspectRatio: media.width / media.height }]} onError={unavailable} />
        : editable ? <VideoFallback key={media.id} onError={unavailable}><Suspense fallback={<Text style={type.caption}>Loading local video preview…</Text>}>
          <VideoPreview key={media.id} media={media} onError={unavailable} />
        </Suspense></VideoFallback>
          : <Pressable accessibilityRole="button" accessibilityLabel="Preview local video" accessibilityHint="Opens paused playback on this device. Nothing is uploaded."
            onPress={() => setVideoOpen(true)} style={({ pressed }) => [styles.videoEntry, pressed && styles.pressed]}>
            <MediaIcon kind="video" /><Text style={type.button}>Preview video</Text>
            <Text style={type.caption}>{Math.ceil((media.durationMs ?? 0) / 1000)}s · Local only</Text>
          </Pressable>}
    <View style={styles.footer}><Text style={styles.caption}>{media.kind === "video" ? "Video" : "Photo"} · Local only · Not uploaded</Text>
      {editable && <Pressable accessibilityRole="button" accessibilityLabel="Remove local media" disabled={busy} accessibilityState={{ disabled: busy }}
        onPress={() => { if (!busy && draftId) send({ type: "removeMedia", draftId }); }}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed, busy && styles.disabled]}><Text style={styles.removeText}>Remove</Text></Pressable>}
    </View>
    {!editable && media.kind === "video" && videoOpen && <Modal visible transparent animationType="none" onRequestClose={() => setVideoOpen(false)}>
      <SafeAreaView style={styles.overlay}><View accessibilityViewIsModal onAccessibilityEscape={() => setVideoOpen(false)} style={styles.sheet}>
        <View style={styles.footer}><Text accessibilityRole="header" style={styles.caption}>Local video · Not uploaded</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close video preview" onPress={() => setVideoOpen(false)} style={styles.remove}><Text style={styles.removeText}>Close</Text></Pressable></View>
        {!media.unavailable ? <VideoFallback key={media.id} onError={unavailable}><Suspense fallback={<Text style={type.caption}>Loading local video preview…</Text>}>
          <VideoPreview media={media} onError={unavailable} />
        </Suspense></VideoFallback> : <Text style={type.caption}>Local video unavailable. It may have expired from this device.</Text>}
      </View></SafeAreaView>
    </Modal>}
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  tool: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: "transparent" },
  focused: { borderColor: colors.text }, pressed: { opacity: feedback.pressedOpacity }, disabled: { opacity: feedback.disabledOpacity },
  toolbarHint: { ...type.caption, flexShrink: 1, marginLeft: spacing.xs },
  icon: { width: 24, height: 24 },
  photoBody: { position: "absolute", left: 2, top: 3, width: 20, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.accent },
  photoSun: { position: "absolute", right: 6, top: 7, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  mountain: { position: "absolute", left: 4, bottom: -2, fontSize: 25, color: colors.accent },
  cameraBody: { top: 6, height: 15 }, cameraLens: { position: "absolute", left: 9, top: 10, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.accent },
  videoBody: { position: "absolute", left: 1, top: 5, width: 15, height: 15, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 4 },
  videoLens: { position: "absolute", right: 1, top: 8, width: 6, height: 9, borderWidth: 1.5, borderColor: colors.accent, borderRadius: 2 },
  preview: { gap: spacing.xs, padding: spacing.sm, borderRadius: radii.control, backgroundColor: colors.elevated, overflow: "hidden" },
  videoEntry: { minHeight: 90, alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radii.control, backgroundColor: colors.background },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  image: { width: "100%", maxHeight: 240, backgroundColor: colors.background },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, caption: { ...type.caption, flex: 1, minWidth: 0, fontSize: 11 },
  remove: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  removeText: { ...type.caption, color: colors.accent },
});
