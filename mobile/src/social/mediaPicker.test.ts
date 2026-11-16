import * as picker from "expo-image-picker";
import { LocalMedia, PHOTO_LIMIT_BYTES, VIDEO_LIMIT_BYTES, mediaValidationError } from "./localMedia";
import { mediaIsReadable, pickLocalMedia, pickProfilePhoto, releaseMedia } from "./mediaPicker";

const mockFiles = new Map<string, number>();
const mockCopy = jest.fn(); const mockDelete = jest.fn();
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache/" },
  Directory: class {
    uri: string;
    constructor(base: string, name: string) { this.uri = base + name + "/"; }
    create() {}
  },
  File: class {
    uri: string;
    constructor(base: string | { uri: string }, name?: string) { this.uri = typeof base === "string" ? base : base.uri + name; }
    get exists() { return mockFiles.has(this.uri); }
    get size() { return mockFiles.get(this.uri) ?? 0; }
    get name() { return this.uri.split("/").pop()!; }
    get parentDirectory() { return { uri: this.uri.slice(0, this.uri.lastIndexOf("/") + 1) }; }
    async copy(target: { uri: string }) { const size = this.size; const copiedSize = await mockCopy(target.uri); mockFiles.set(target.uri, typeof copiedSize === "number" ? copiedSize : size); }
    delete() { mockDelete(); mockFiles.delete(this.uri); }
  },
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn(), requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(), UIImagePickerControllerQualityType: { Medium: 1 },
}));
const photo = { uri: "file:///library/photo.jpg", type: "image", mimeType: "image/jpeg", width: 800, height: 600 };
const video = { ...photo, uri: "file:///library/video.mp4", type: "video", mimeType: "video/mp4", duration: 45_000, width: 1920, height: 1080 };
function result(asset = photo) { return { canceled: false, assets: [asset] } as picker.ImagePickerResult; }
const library = jest.mocked(picker.launchImageLibraryAsync); const camera = jest.mocked(picker.launchCameraAsync);
beforeEach(() => {
  jest.clearAllMocks(); mockFiles.clear(); mockFiles.set(photo.uri, 2000); mockFiles.set(video.uri, 5000);
  library.mockResolvedValue(result()); camera.mockResolvedValue(result());
  jest.mocked(picker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true } as picker.CameraPermissionResponse);
});

it("selects one photo through the system picker with no broad storage request or JS file decoding", async () => {
  const selected = await pickLocalMedia("photo");
  expect(selected.media).toMatchObject({ kind: "photo", mimeType: "image/jpeg", sizeBytes: 2000, width: 800, height: 600 });
  expect(selected.media?.uri).not.toBe(photo.uri); expect(mockCopy).toHaveBeenCalledTimes(1);
  expect(library).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ["images"], base64: false, exif: false, allowsEditing: false, allowsMultipleSelection: false }));
  expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled(); expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(mediaIsReadable(selected.media!)).toBe(true);
});
it("requests a square crop only for profile photos and preserves owned native copying", async () => {
  const result = await pickProfilePhoto("photo");
  expect(library).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], base64: false, exif: false }));
  expect(result.media?.uri).not.toBe(photo.uri); expect(mockCopy).toHaveBeenCalledTimes(1);
  expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled(); expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  await pickProfilePhoto("cameraPhoto");
  expect(camera).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"] }));
  expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
});
it("awaits native copy completion before verifying or releasing the destination", async () => {
  let finish!: () => void;
  mockCopy.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  let settled = false;
  const pending = pickProfilePhoto("photo").then((value) => { settled = true; return value; });
  await Promise.resolve(); await Promise.resolve();
  expect(mockCopy).toHaveBeenCalledTimes(1); expect(settled).toBe(false); expect(mockDelete).not.toHaveBeenCalled();
  finish(); const selected = await pending;
  expect(selected.error).toBeUndefined(); expect(mediaIsReadable(selected.media!)).toBe(true);
});
it.each(["photo", "cameraPhoto"] as const)("copies a temporary content URI from %s into owned cache without persisting URI permissions", async (source) => {
  const uri = "content://com.android.providers.media/document/image%3A12";
  mockFiles.set(uri, 2000);
  library.mockResolvedValue(result({ ...photo, uri })); camera.mockResolvedValue(result({ ...photo, uri }));
  const selected = await pickProfilePhoto(source);
  expect(selected.media).toMatchObject({ sizeBytes: 2000, kind: "photo" });
  expect(selected.media?.uri).toMatch(/^file:\/\/\/cache\/fitsocial-demo-media\//);
  expect(mockFiles.has(uri)).toBe(true); expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
  releaseMedia(selected.media!); expect(mockFiles.has(uri)).toBe(true);
});
it("uses the completed cache file's real size when an Android provider omits its size", async () => {
  const uri = "content://provider/temporary-photo";
  mockFiles.set(uri, 0); library.mockResolvedValue(result({ ...photo, uri })); mockCopy.mockResolvedValueOnce(3456);
  const selected = await pickProfilePhoto("photo"); expect(selected.media?.sizeBytes).toBe(3456);
  expect(mediaIsReadable(selected.media!)).toBe(true);
});
it.each([0, PHOTO_LIMIT_BYTES + 1])("rejects and releases an unknown-size provider copy with %i bytes", async (size) => {
  const uri = "content://provider/unknown-size";
  mockFiles.set(uri, 0); library.mockResolvedValue(result({ ...photo, uri })); mockCopy.mockResolvedValueOnce(size);
  const selected = await pickProfilePhoto("photo"); expect(selected.error).toBeTruthy(); expect(selected.media).toBeUndefined();
  expect(mockDelete).toHaveBeenCalledTimes(1); expect(mockFiles.has(uri)).toBe(true);
});
it("rejects a truncated copy after completion rather than accepting a mismatched file", async () => {
  mockCopy.mockResolvedValueOnce(100);
  const selected = await pickProfilePhoto("photo"); expect(selected.error).toContain("could not be copied");
  expect(mockDelete).toHaveBeenCalledTimes(1); expect(mockFiles.has(photo.uri)).toBe(true);
});
it("preserves encoded temporary file URIs and reports expired content access without private paths", async () => {
  const uri = "file:///library/cropped%20photo.jpg";
  mockFiles.set(uri, 2000); library.mockResolvedValue(result({ ...photo, uri }));
  expect((await pickProfilePhoto("photo")).media?.sizeBytes).toBe(2000);
  library.mockResolvedValue(result({ ...photo, uri: "content://provider/expired" }));
  const failure = await pickProfilePhoto("photo"); expect(failure.error).toContain("accessible"); expect(failure.error).not.toContain("content://");
});
it("handles profile gallery denial, camera denial, cancellation and missing files without exposing native details", async () => {
  library.mockRejectedValueOnce(new Error("permission denied: private library path"));
  const denied = await pickProfilePhoto("photo"); expect(denied.error).toContain("permissions"); expect(denied.error).not.toContain("private");
  jest.mocked(picker.requestCameraPermissionsAsync).mockResolvedValueOnce({ granted: false } as picker.CameraPermissionResponse);
  expect((await pickProfilePhoto("cameraPhoto")).error).toContain("not granted"); expect(camera).not.toHaveBeenCalled();
  library.mockResolvedValueOnce({ canceled: true, assets: null }); expect(await pickProfilePhoto("photo")).toEqual({});
  mockFiles.delete(photo.uri); expect((await pickProfilePhoto("photo")).error).toContain("accessible");
  expect(mockCopy).not.toHaveBeenCalled();
});
it("selects bounded local video with verified duration without loading bytes", async () => {
  library.mockResolvedValue(result(video)); const selected = await pickLocalMedia("video");
  expect(selected.media).toMatchObject({ kind: "video", durationMs: 45_000, sizeBytes: 5000 });
  expect(library).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ["videos"], videoMaxDuration: 60 }));
});
it("treats canceled selection as no state change", async () => {
  library.mockResolvedValue({ canceled: true, assets: null }); expect(await pickLocalMedia("photo")).toEqual({});
  expect(mockCopy).not.toHaveBeenCalled();
});
it("requests camera permission only for capture and handles denial without opening the camera", async () => {
  jest.mocked(picker.requestCameraPermissionsAsync).mockResolvedValue({ granted: false } as picker.CameraPermissionResponse);
  expect((await pickLocalMedia("cameraPhoto")).error).toContain("not granted"); expect(camera).not.toHaveBeenCalled();
});
it("supports photo/video capture and camera cancellation", async () => {
  expect((await pickLocalMedia("cameraPhoto")).media?.kind).toBe("photo");
  camera.mockResolvedValue(result(video)); expect((await pickLocalMedia("cameraVideo")).media?.kind).toBe("video");
  camera.mockResolvedValue({ canceled: true, assets: null }); expect(await pickLocalMedia("cameraVideo")).toEqual({});
  expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(3);
});
it.each([
  ["oversized photo", photo, PHOTO_LIMIT_BYTES + 1, "10 MiB"],
  ["oversized video", video, VIDEO_LIMIT_BYTES + 1, "50 MiB"],
  ["empty file", photo, 0, "size"],
  ["long video", { ...video, duration: 60_001 }, 5000, "60 seconds"],
  ["unknown duration", { ...video, duration: null }, 5000, "duration"],
  ["oversized resolution", { ...video, width: 3840, height: 2160 }, 5000, "1080p"],
  ["unsupported type", { ...photo, mimeType: "image/gif" }, 2000, "supported"],
  ["unknown type", { ...photo, mimeType: undefined }, 2000, "supported"],
] as const)("rejects %s before copying", async (_name, asset, size, message) => {
  mockFiles.set(asset.uri, size); library.mockResolvedValue(result(asset as typeof photo));
  expect((await pickLocalMedia(asset.type === "video" ? "video" : "photo")).error).toContain(message);
  expect(mockCopy).not.toHaveBeenCalled();
});
it("handles missing files, remote sources, picker failures and permission errors without exposing paths", async () => {
  mockFiles.delete(photo.uri); expect((await pickLocalMedia("photo")).error).toContain("accessible");
  library.mockResolvedValue(result({ ...photo, uri: "https://example.invalid/photo.jpg" }));
  expect((await pickLocalMedia("photo")).error).toContain("locally");
  library.mockRejectedValue(new Error("private native failure detail"));
  const failure = await pickLocalMedia("photo"); expect(failure.error).toContain("updated native app build"); expect(failure.error).not.toContain("private");
  jest.mocked(picker.requestCameraPermissionsAsync).mockRejectedValue(new Error("denied"));
  expect((await pickLocalMedia("cameraPhoto")).error).toContain("permissions");
});
it("releases only owned copies and detects cache expiry", async () => {
  const { media } = await pickLocalMedia("photo"); expect(media).toBeDefined();
  releaseMedia({ ...media!, uri: photo.uri }); expect(mockDelete).not.toHaveBeenCalled(); expect(mockFiles.has(photo.uri)).toBe(true);
  releaseMedia(media!); expect(mockDelete).toHaveBeenCalledTimes(1); expect(mediaIsReadable(media!)).toBe(false);
  releaseMedia(media!); expect(mockDelete).toHaveBeenCalledTimes(1);
});
it("cleans a partial owned copy on failure without exposing native error details", async () => {
  mockCopy.mockImplementationOnce((uri: string) => { mockFiles.set(uri, 100); throw new Error("private native copy detail"); });
  const result = await pickLocalMedia("photo");
  expect(result.error).toContain("could not be opened"); expect(result.error).not.toContain("private");
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockFiles.has(photo.uri)).toBe(true);
});
it("rejects mismatched or multiple picker results", async () => {
  library.mockResolvedValue(result(video)); expect((await pickLocalMedia("photo")).error).toContain("one supported");
  library.mockResolvedValue({ canceled: false, assets: [photo, photo] } as picker.ImagePickerResult);
  expect((await pickLocalMedia("photo")).error).toContain("one supported"); expect(mockCopy).not.toHaveBeenCalled();
});
it("rejects invalid metadata even when provided directly to validation", () => {
  const media: LocalMedia = { id: "test", uri: photo.uri, kind: "photo", mimeType: "image/jpeg", sizeBytes: 2000, width: 800, height: 600 };
  expect(mediaValidationError(media)).toBeNull();
  for (const width of [0, NaN, Infinity, -1]) expect(mediaValidationError({ ...media, width })).not.toBeNull();
  expect(mediaValidationError({ ...media, unavailable: true })).toContain("unavailable");
});
