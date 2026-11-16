import type { ImagePickerOptions } from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";
import { LocalMedia, mediaValidationError } from "./localMedia";

export type MediaSource = "photo" | "video" | "cameraPhoto" | "cameraVideo";
export type MediaResult = { media: LocalMedia; error?: never } | { media?: never; error?: string };
let sequence = 0;
function cacheDirectory() { return new Directory(Paths.cache, "fitsocial-demo-media"); }

export function mediaIsReadable(media: LocalMedia): boolean {
  try {
    const file = new File(media.uri);
    return !mediaValidationError(media) && file.exists && file.size === media.sizeBytes;
  } catch { return false; }
}

// Only our own copied cache files may be removed. Never delete picker/library originals.
export function releaseMedia(media: LocalMedia) {
  try {
    const directory = cacheDirectory();
    const file = new File(media.uri);
    if (file.parentDirectory.uri === directory.uri && /^attachment-\d+-\d+\.(jpg|png|webp|heic|heif|mp4|mov)$/.test(file.name) && file.exists) file.delete();
  } catch { /* OS cache cleanup remains the fallback; never log local paths. */ }
}

export async function pickLocalMedia(source: MediaSource, profilePhoto = false): Promise<MediaResult> {
  let owned: LocalMedia | undefined;
  try {
    // Load only on user intent so an older native build can still open the composer.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require("expo-image-picker") as typeof import("expo-image-picker");
    const camera = source === "cameraPhoto" || source === "cameraVideo";
    const kind = source === "video" || source === "cameraVideo" ? "video" : "photo";
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { error: "Camera access was not granted. You can still choose media from your library." };
    }
    // The system library picker grants access only to selected files. No broad storage request.
    const options: ImagePickerOptions = {
      mediaTypes: kind === "photo" ? ["images"] : ["videos"], allowsMultipleSelection: false,
      allowsEditing: profilePhoto && kind === "photo", ...(profilePhoto && kind === "photo" ? { aspect: [1, 1] as [number, number] } : {}), base64: false, exif: false, quality: 1, videoMaxDuration: 60,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return {};
    const asset = result.assets?.[0];
    if (!asset || result.assets.length !== 1 || asset.type !== (kind === "photo" ? "image" : "video")) return { error: "Choose one supported photo or video." };
    const contentUri = asset.uri.startsWith("content://");
    if ((!asset.uri.startsWith("file://") && !contentUri) || asset.uri.includes("\0") || (!contentUri && asset.uri.includes(".."))) return { error: profilePhoto ? "Choose a local photo from Gallery or Camera." : "This attachment could not be opened locally." };
    const original = new File(asset.uri);
    if (!original.exists) return { error: "This attachment is no longer accessible. Please choose it again." };
    const sourceSize = original.size;
    // Android providers can omit a usable size. The cache copy is authoritative in that case.
    const unknownProviderSize = contentUri && (!Number.isFinite(sourceSize) || sourceSize <= 0);
    const mimeType = asset.mimeType?.toLowerCase() ?? "";
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/quicktime": "mov" } as Record<string, string>)[mimeType];
    if (!extension) return { error: "Choose a supported local photo or video." };
    const directory = cacheDirectory();
    const id = `attachment-${Date.now()}-${++sequence}`;
    const copy = new File(directory, `${id}.${extension}`);
    const candidate: LocalMedia = {
      id, uri: copy.uri, kind, mimeType,
      sizeBytes: sourceSize, width: asset.width, height: asset.height,
      ...(kind === "video" ? { durationMs: asset.duration ?? undefined } : {}),
    };
    // Validate dimensions/type/duration before copying; validate unknown provider sizes afterward.
    const error = mediaValidationError(unknownProviderSize ? { ...candidate, sizeBytes: 1 } : candidate);
    if (error) return { error: profilePhoto && error.includes("size could not be verified") ? "Photo is empty or unavailable. Choose another photo." : error };
    directory.create({ intermediates: true, idempotent: true });
    owned = candidate;
    // SDK 58 copy() is asynchronous. Checking/deleting before it settles races native I/O.
    await original.copy(copy); // Native file/content-provider stream; no JS file bytes.
    const copied = new File(copy.uri);
    if (!copied.exists || (!unknownProviderSize && copied.size !== sourceSize)) {
      releaseMedia(owned); return { error: profilePhoto ? "Photo could not be copied. Choose it again or try another photo." : "The attachment could not be copied safely. Please choose it again." };
    }
    owned = { ...candidate, sizeBytes: copied.size };
    const copiedError = mediaValidationError(owned);
    if (copiedError || !mediaIsReadable(owned)) { releaseMedia(owned); return { error: profilePhoto && copiedError?.includes("size could not be verified") ? "Photo is empty or unavailable. Choose another photo." : copiedError ?? "This local file is unavailable. Please choose it again." }; }
    return { media: owned };
  } catch {
    if (owned) releaseMedia(owned);
    return { error: profilePhoto ? "Photo could not be opened. Check permissions and choose it again." : "Media could not be opened. Check permissions and use the updated native app build, then try again." };
  }
}

export function pickProfilePhoto(source: "photo" | "cameraPhoto"): Promise<MediaResult> {
  return pickLocalMedia(source, true);
}
