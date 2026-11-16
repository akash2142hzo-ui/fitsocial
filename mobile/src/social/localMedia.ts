export type LocalMedia = {
  id: string;
  uri: string;
  kind: "photo" | "video";
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  durationMs?: number;
  unavailable?: boolean;
};

export const PHOTO_LIMIT_BYTES = 10 * 1024 * 1024;
export const VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;
export const VIDEO_LIMIT_MS = 60_000;
const photoTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const videoTypes = ["video/mp4", "video/quicktime"];

// Metadata validation, not a claim of content inspection or moderation.
export function mediaValidationError(media: LocalMedia): string | null {
  if (media.unavailable) return "This local attachment is unavailable. Remove or replace it to post.";
  if (!media.id || !media.uri.startsWith("file://") || media.uri.includes("..")
    || !(media.kind === "photo" ? photoTypes : media.kind === "video" ? videoTypes : []).includes(media.mimeType)) {
    return "Choose a supported local photo or video.";
  }
  if (!Number.isFinite(media.sizeBytes) || media.sizeBytes <= 0) return "The attachment size could not be verified.";
  if (media.sizeBytes > (media.kind === "photo" ? PHOTO_LIMIT_BYTES : VIDEO_LIMIT_BYTES)) {
    return media.kind === "photo" ? "Choose a photo up to 10 MiB." : "Choose a video up to 50 MiB.";
  }
  if (![media.width, media.height].every((value) => Number.isFinite(value) && value > 0)
    || media.width * media.height > (media.kind === "photo" ? 24_000_000 : 1920 * 1080)) {
    return media.kind === "photo" ? "Choose a photo up to 24 megapixels." : "Choose a video up to 1080p resolution.";
  }
  if (media.kind === "video" && (!Number.isFinite(media.durationMs) || media.durationMs! <= 0 || media.durationMs! > VIDEO_LIMIT_MS)) {
    return "Choose a video with a verified duration of up to 60 seconds.";
  }
  return null;
}
