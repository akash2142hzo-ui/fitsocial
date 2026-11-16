import { useEffect, useRef, useState } from "react";
import { AppState, Image, View } from "react-native";
import { Avatar } from "../components/ui";
import { LocalMedia } from "./localMedia";
import { mediaIsReadable } from "./mediaPicker";

export function ProfileAvatar({ initials, size = 32, photo, onUnavailable, onAvailable }: {
  initials: string; size?: number; photo?: LocalMedia | null; onUnavailable?: (id: string) => void; onAvailable?: (id: string) => void;
}) {
  const [unavailableId, setUnavailableId] = useState<string | null>(null);
  const report = useRef(onUnavailable);
  useEffect(() => { report.current = onUnavailable; }, [onUnavailable]);
  useEffect(() => {
    if (!photo) return;
    const check = () => {
      const available = photo.kind === "photo" && mediaIsReadable(photo);
      setUnavailableId(available ? null : photo.id);
      if (!available) report.current?.(photo.id);
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") check(); });
    return () => subscription.remove();
  }, [photo]);
  if (!photo || photo.kind !== "photo" || unavailableId === photo.id) return <Avatar initials={initials} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
    <Image accessibilityLabel="Local profile photo" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      source={{ uri: photo.uri }} resizeMode="cover" resizeMethod="resize" style={{ width: size, height: size }}
      onLoad={() => onAvailable?.(photo.id)}
      onError={() => { setUnavailableId(photo.id); report.current?.(photo.id); }} />
  </View>;
}
