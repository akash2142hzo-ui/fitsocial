import { act } from "react";
import { Alert, AppState, BackHandler, StyleSheet, useWindowDimensions } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import App from "../../App";
import { LocalMedia } from "./localMedia";
import { mediaIsReadable, MediaResult, pickLocalMedia, releaseMedia } from "./mediaPicker";

jest.mock("./mediaPicker", () => ({ pickLocalMedia: jest.fn(), mediaIsReadable: jest.fn(), releaseMedia: jest.fn() }));
const mockPlayer = { pause: jest.fn(), addListener: jest.fn((_event: string, _listener: (event: { status: string }) => void) => ({ remove: jest.fn() })), status: "readyToPlay",
  loop: true, muted: false, staysActiveInBackground: true, allowsExternalPlayback: true };
jest.mock("expo-video", () => ({
  VideoView: "VideoView",
  useVideoPlayer: jest.fn((_source, setup) => { setup(mockPlayer); return mockPlayer; }),
}));
jest.mock("react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const ScrollView = React.forwardRef(function MockScrollView(props: { children?: import("react").ReactNode }, ref) {
    React.useImperativeHandle(ref, () => ({ scrollTo: jest.fn() }));
    return React.createElement("ScrollView", props, props.children);
  });
  return Object.defineProperties({}, { ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
    View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true },
    TextInput: { value: "TextInput", enumerable: true }, Pressable: { value: "Pressable", enumerable: true },
    useWindowDimensions: { value: jest.fn(), enumerable: true },
    SafeAreaView: { value: "SafeAreaView", enumerable: true },
    ScrollView: { value: ScrollView, enumerable: true },
    Modal: { value: "Modal", enumerable: true },
  });
});
const photo: LocalMedia = { id: "media-photo", uri: "file:///cache/demo-photo.jpg", kind: "photo", mimeType: "image/jpeg", sizeBytes: 2000, width: 800, height: 600 };
const video: LocalMedia = { ...photo, id: "media-video", uri: "file:///cache/demo-video.mp4", kind: "video", mimeType: "video/mp4", durationMs: 5000 };
let root: Root; let back: (() => boolean | null | undefined) | undefined;
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
function button(label: string) {
  const nodes = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
  expect(nodes).toHaveLength(1); return nodes[0];
}
async function tap(label: string) { await act(async () => { button(label).props.onPress(); }); }
function field() { return root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Post text"))[0]; }
function previews() { return root.container.queryAll((node) => node.props.testID === "local-media-preview"); }
async function write(value: string) { await act(async () => { field().props.onChangeText(value); }); }
async function composer() { await tap("Feed"); await tap("Create Post"); }
beforeEach(async () => {
  jest.clearAllMocks(); jest.useFakeTimers(); mockPlayer.status = "readyToPlay";
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 360, height: 800, scale: 1, fontScale: 1 });
  jest.mocked(mediaIsReadable).mockReturnValue(true); jest.mocked(pickLocalMedia).mockResolvedValue({ media: photo });
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => {
    back = () => callback({ type: "hardwareBackPress", timeStamp: Date.now() }); return { remove: jest.fn() };
  });
  root = createRoot(); await act(async () => { root.render(<App />); });
  await tap("Explore the local demo without signing in");
});
afterEach(async () => { await act(async () => root.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

it("keeps compact media controls inside the first card with 44 dp touch targets and previews a photo without cropping", async () => {
  await composer();
  const card = root.container.queryAll((node) => node.props.testID === "post-composer-card")[0];
  expect(card.queryAll((node) => node.props.testID === "media-toolbar")).toHaveLength(1);
  for (const label of ["Choose local photo", "Choose local video", "Open camera capture options"]) {
    expect(StyleSheet.flatten(button(label).props.style({ pressed: false }))).toMatchObject({ minWidth: 44, minHeight: 44 });
  }
  await write("Gym progress"); await tap("Choose local photo");
  expect(pickLocalMedia).toHaveBeenCalledWith("photo"); expect(field().props.value).toBe("Gym progress"); expect(previews()).toHaveLength(1);
  const image = root.container.queryAll((node) => node.props.accessibilityLabel === "Selected local demo photo" && node.props.resizeMode === "contain")[0];
  expect(image.props.resizeMode).toBe("contain"); expect(StyleSheet.flatten(image.props.style).aspectRatio).toBe(800 / 600);
  await tap("Remove local media"); expect(previews()).toHaveLength(0); expect(releaseMedia).toHaveBeenCalledWith(photo);
  expect(field().props.value).toBe("Gym progress");
});
it("publishes media and caption only locally, shares the same preview on Feed and Home and preserves social actions", async () => {
  await composer(); await write("Local gym photo"); await tap("Choose local photo");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(button("Feed").props.accessibilityState.selected).toBe(true); expect(previews()).toHaveLength(1);
  expect(textOf(root.container)).toContain("Local gym photo"); expect(textOf(root.container)).toContain("Not uploaded");
  expect(releaseMedia).not.toHaveBeenCalled();
  const like = root.container.queryAll((node) => node.type === "Pressable" && String(node.props.accessibilityLabel).startsWith("Like "))[0];
  await act(async () => like.props.onPress()); expect(previews()).toHaveLength(1);
  await tap("Home"); expect(previews()).toHaveLength(1); expect(textOf(root.container)).toContain("Local gym photo");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab").map(textOf)).toEqual(["Home", "Train", "Rewards", "Feed", "Profile"]);
  const author = root.container.queryAll((node) => node.type === "Pressable" && String(node.props.accessibilityLabel).startsWith("View You"))[0];
  await act(async () => author.props.onPress());
  expect(root.container.queryAll((node) => node.props.testID === "public-profile")).toHaveLength(1);
  expect(previews()).toHaveLength(1); expect(textOf(root.container)).toContain("Local gym photo");
  await tap("Back to previous screen"); expect(button("Home").props.accessibilityState.selected).toBe(true);
});
it("retains photo refs across hardware Back, Save Draft and resume, and releases them only on confirmed discard", async () => {
  await composer(); await write("Keep this caption"); await tap("Choose local photo");
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Create Post")).toBeDefined(); expect(releaseMedia).not.toHaveBeenCalled();
  await tap("Create Post"); expect(previews()).toHaveLength(1); expect(field().props.value).toBe("Keep this caption");
  await tap("Save draft"); expect(textOf(root.container)).toContain("Local photo attached"); expect(releaseMedia).not.toHaveBeenCalled();
  await tap("Resume draft-1"); expect(previews()).toHaveLength(1);
  await tap("Discard post"); await act(async () => { expect(back?.()).toBe(true); }); expect(previews()).toHaveLength(1);
  await tap("Discard post"); await tap("Discard drafts"); expect(releaseMedia).toHaveBeenCalledWith(photo);
});
it("handles cancellation and permission errors without losing the previous attachment, text or achievement", async () => {
  await composer(); await write("Keep everything"); await tap("Choose local photo");
  await tap("Add achievement"); await tap("Sample: Showing up");
  jest.mocked(pickLocalMedia).mockResolvedValue({}); await tap("Choose local video"); expect(previews()).toHaveLength(1);
  jest.mocked(pickLocalMedia).mockResolvedValue({ error: "Camera access was not granted." });
  const alert = jest.spyOn(Alert, "alert"); await tap("Open camera capture options");
  expect(pickLocalMedia).toHaveBeenCalledTimes(2);
  await act(async () => { alert.mock.calls[0][2]?.find((entry) => entry.text === "Record video")?.onPress?.(); });
  expect(pickLocalMedia).toHaveBeenLastCalledWith("cameraVideo"); expect(textOf(root.container)).toContain("Camera access was not granted.");
  expect(field().props.value).toBe("Keep everything"); expect(textOf(root.container)).toContain("Showing up"); expect(previews()).toHaveLength(1);
});
it("rejects late picker results after Back without attaching to another draft or leaking the new copy", async () => {
  await composer(); let resolve!: (result: MediaResult) => void;
  jest.mocked(pickLocalMedia).mockReturnValue(new Promise((done) => { resolve = done; }));
  await tap("Choose local photo"); expect(button("Save draft").props.disabled).toBe(true);
  expect(button("Publish to local feed. Not uploaded or saved.").props.disabled).toBe(true);
  await act(async () => { expect(back?.()).toBe(true); });
  await act(async () => { resolve({ media: photo }); }); expect(releaseMedia).toHaveBeenCalledWith(photo);
  await tap("Create Post"); expect(previews()).toHaveLength(0); expect(button("Save draft").props.disabled).toBe(false);
});
it("shows an accessible fallback on file loss, retains captions and safely prevents publishing until removal", async () => {
  await composer(); await write("Caption stays"); await tap("Choose local photo");
  jest.mocked(mediaIsReadable).mockReturnValue(false);
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(textOf(root.container)).toContain("Local attachment unavailable"); expect(field().props.value).toBe("Caption stays");
  expect(button("Publish to local feed. Not uploaded or saved.").props.disabled).toBe(true);
  await tap("Remove local media"); expect(button("Publish to local feed. Not uploaded or saved.").props.disabled).toBe(false);
});
it("renders genuine paused video controls, pauses in the background, and loads Feed playback on demand with Android Back dismissal", async () => {
  jest.mocked(pickLocalMedia).mockResolvedValue({ media: video }); await composer(); await tap("Choose local video");
  const views = () => root.container.queryAll((node) => node.type === "VideoView");
  expect(views()).toHaveLength(1); expect(views()[0].props).toMatchObject({ nativeControls: true, contentFit: "contain", allowsPictureInPicture: false, fullscreenOptions: { enable: false } });
  expect(mockPlayer).toMatchObject({ muted: true, loop: false, staysActiveInBackground: false, allowsExternalPlayback: false });
  expect(mockPlayer.pause).toHaveBeenCalled();
  // Native AppState delivery is mocked; verify the registered callback contract.
  const appState = jest.spyOn(AppState, "addEventListener");
  await tap("Save draft"); await tap("Resume draft-1");
  const pauses = mockPlayer.pause.mock.calls.length;
  await act(async () => { for (const [, callback] of appState.mock.calls) callback("background"); });
  expect(mockPlayer.pause.mock.calls.length).toBeGreaterThan(pauses);
  await tap("Publish to local feed. Not uploaded or saved."); expect(views()).toHaveLength(0);
  await tap("Preview local video"); expect(views()).toHaveLength(1);
  const modal = root.container.queryAll((node) => node.type === "Modal")[0];
  await act(async () => modal.props.onRequestClose()); expect(views()).toHaveLength(0);
  expect(button("Feed").props.accessibilityState.selected).toBe(true);
  await tap("Preview local video"); await tap("Close video preview"); expect(views()).toHaveLength(0);
  await tap("Home"); expect(views()).toHaveLength(0); expect(button("Preview local video")).toBeDefined();
});
it("replaces one attachment, releases the previous owned copy and preserves text", async () => {
  await composer(); await write("Caption survives replacement"); await tap("Choose local photo");
  const replacement = { ...photo, id: "replacement", uri: "file:///cache/replacement.jpg" };
  jest.mocked(pickLocalMedia).mockResolvedValue({ media: replacement }); await tap("Choose local photo");
  expect(previews()).toHaveLength(1); expect(field().props.value).toBe("Caption survives replacement");
  expect(releaseMedia).toHaveBeenCalledWith(photo); expect(releaseMedia).not.toHaveBeenCalledWith(replacement);
});
it("handles camera chooser cancellation without requesting native permissions", async () => {
  await composer(); const alert = jest.spyOn(Alert, "alert"); await tap("Open camera capture options");
  await act(async () => { alert.mock.calls[0][2]?.find((entry) => entry.text === "Cancel")?.onPress?.(); });
  expect(pickLocalMedia).not.toHaveBeenCalled(); await tap("Open camera capture options"); expect(alert).toHaveBeenCalledTimes(2);
});
it("detects cache expiry on foreground and image decoding failure in a published post", async () => {
  const events = jest.spyOn(AppState, "addEventListener");
  await composer(); await tap("Choose local photo"); jest.mocked(mediaIsReadable).mockReturnValue(false);
  await act(async () => { for (const [, callback] of events.mock.calls) callback("active"); });
  expect(textOf(root.container)).toContain("Local attachment unavailable");
  await tap("Remove local media"); jest.mocked(mediaIsReadable).mockReturnValue(true); await tap("Choose local photo");
  await tap("Publish to local feed. Not uploaded or saved.");
  const image = root.container.queryAll((node) => node.props.accessibilityLabel === "Selected local demo photo" && node.props.resizeMode === "contain")[0];
  await act(async () => image.props.onError()); expect(textOf(root.container)).toContain("expired from this device");
  expect(button("Feed").props.accessibilityState.selected).toBe(true);
});
it("handles an unsupported native video codec with a safe removable fallback", async () => {
  jest.mocked(pickLocalMedia).mockResolvedValue({ media: video }); await composer(); await tap("Choose local video");
  const [, callback] = mockPlayer.addListener.mock.calls.at(-1)!;
  await act(async () => callback({ status: "error" }));
  expect(textOf(root.container)).toContain("Local attachment unavailable");
  expect(button("Publish to local feed. Not uploaded or saved.").props.disabled).toBe(true);
  await tap("Remove local media"); expect(previews()).toHaveLength(0);
});
