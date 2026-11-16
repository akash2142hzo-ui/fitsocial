import { useEffect } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import type { LocalMedia } from "./localMedia";

export default function NativeVideoPreview({ media, onError }: { media: LocalMedia; onError: () => void }) {
  const player = useVideoPlayer({ uri: media.uri }, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.staysActiveInBackground = false;
    instance.allowsExternalPlayback = false;
    instance.pause();
  });
  useEffect(() => {
    if (player.status === "error") onError();
    const errors = player.addListener("statusChange", ({ status }) => { if (status === "error") onError(); });
    const background = AppState.addEventListener("change", (state) => { if (state !== "active") player.pause(); });
    return () => { errors.remove(); background.remove(); };
  }, [player, onError]);
  // The hook disposes its native player on unmount. Nothing auto-plays or loops.
  return <View style={styles.frame}>
    <VideoView accessibilityLabel="Local demo video preview. Use playback controls to play." player={player}
      nativeControls contentFit="contain" allowsPictureInPicture={false} allowsVideoFrameAnalysis={false}
      fullscreenOptions={{ enable: false }}
      style={[styles.video, { aspectRatio: media.width / media.height }]} />
  </View>;
}
const styles = StyleSheet.create({ frame: { overflow: "hidden" }, video: { width: "100%", maxHeight: 240 } });
