import { useEffect, useRef } from "react";
import { LocalMedia } from "./localMedia";
import { releaseMedia } from "./mediaPicker";
import type { SocialState } from "./socialState";

export function referencedMedia(state: SocialState): Map<string, LocalMedia> {
  const entries = [state.composer, ...state.drafts, ...state.posts];
  const photos = [state.localProfile.photo, state.settingsDraft?.values.photo, state.settingsDraft?.original.photo];
  return new Map([...entries.flatMap((entry) => entry?.media ? [[entry.media.id, entry.media] as const] : []),
    ...photos.flatMap((photo) => photo ? [[photo.id, photo] as const] : [])]);
}

export function useMediaCleanup(state: SocialState) {
  const previous = useRef(new Map<string, LocalMedia>());
  useEffect(() => {
    const current = referencedMedia(state);
    for (const [id, media] of previous.current) if (!current.has(id)) releaseMedia(media);
    previous.current = current;
  }, [state]);
}
