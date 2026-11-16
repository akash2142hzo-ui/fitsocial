import { act } from "react";
import { AppState, BackHandler, Keyboard, StyleSheet, useWindowDimensions } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import App from "../../App";
import { LocalMedia } from "./localMedia";
import { mediaIsReadable, MediaResult, pickProfilePhoto, releaseMedia } from "./mediaPicker";

jest.mock("./mediaPicker", () => ({ pickProfilePhoto: jest.fn(), pickLocalMedia: jest.fn(), mediaIsReadable: jest.fn(), releaseMedia: jest.fn() }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const ScrollView = React.forwardRef(function MockScrollView(props: { children?: import("react").ReactNode }, ref) {
    React.useImperativeHandle(ref, () => ({ scrollTo: jest.fn() }));
    return React.createElement("ScrollView", props, props.children);
  });
  return Object.defineProperties({}, { ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
    View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true }, Image: { value: "Image", enumerable: true },
    TextInput: { value: "TextInput", enumerable: true }, Pressable: { value: "Pressable", enumerable: true }, SafeAreaView: { value: "SafeAreaView", enumerable: true },
    KeyboardAvoidingView: { value: "KeyboardAvoidingView", enumerable: true },
    ScrollView: { value: ScrollView, enumerable: true },
    useWindowDimensions: { value: jest.fn(() => ({ width: 360, height: 800, scale: 1, fontScale: 1 })), enumerable: true },
    Modal: { value: ({ visible, children, ...props }: import("react-native").ModalProps) => visible ? React.createElement("Modal", props, children) : null, enumerable: true },
  });
});
const photo: LocalMedia = { id: "photo-a", uri: "file:///cache/photo-a.jpg", kind: "photo", mimeType: "image/jpeg", sizeBytes: 2000, width: 600, height: 600 };
const second = { ...photo, id: "photo-b", uri: "file:///cache/photo-b.jpg" };
let root: Root; let back: (() => boolean | null | undefined) | undefined;
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
function button(label: string) {
  const matches = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
  expect(matches).toHaveLength(1); return matches[0];
}
async function tap(label: string) { await act(async () => { button(label).props.onPress(); }); }
async function write(prefix: string, value: string) {
  const input = root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith(prefix))[0];
  await act(async () => input.props.onChangeText(value));
}
async function edit() { await tap("Profile"); await tap("Edit profile"); }
async function choose(label = "Choose from Gallery") { await tap(label); }
async function saveAndReturn() { await tap("Save profile"); await tap("Back to previous screen"); }
function photos() { return root.container.queryAll((node) => node.type === "Image" && node.props.accessibilityLabel === "Local profile photo"); }
beforeEach(async () => {
  jest.clearAllMocks(); jest.useFakeTimers();
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 360, height: 800, scale: 1, fontScale: 1 });
  jest.mocked(mediaIsReadable).mockReturnValue(true); jest.mocked(pickProfilePhoto).mockResolvedValue({ media: photo });
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => {
    back = () => callback({ type: "hardwareBackPress", timeStamp: Date.now() }); return { remove: jest.fn() };
  });
  root = createRoot(); await act(async () => root.render(<App />)); await tap("Explore the local demo without signing in");
});
afterEach(async () => { await act(async () => root.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

it.each([280, 320])("keeps a compact photo card and balanced edit controls at %i dp without preset controls", async (width) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width, height: 640, scale: 1, fontScale: 1.8 });
  await edit();
  const card = root.container.queryAll((node) => node.props.testID === "profile-photo-editor")[0];
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({ padding: 12, borderRadius: 12, minWidth: 0 });
  expect(root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("Avatar:"))).toHaveLength(0);
  expect(textOf(root.container)).not.toContain("Local preview only");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Remove Photo")).toHaveLength(0);
  for (const label of ["Choose from Gallery", "Take Photo"]) expect(StyleSheet.flatten(button(label).props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
  for (const label of ["Save profile", "Cancel edits"]) expect(StyleSheet.flatten(button(label).parent!.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  const actions = root.container.queryAll((node) => node.props.testID === "profile-settings-actions")[0];
  expect(StyleSheet.flatten(actions.props.style)).toMatchObject({ flexDirection: "row", gap: 8 });
  const inputs = root.container.queryAll((node) => node.type === "TextInput"); expect(inputs).toHaveLength(4);
  for (const input of inputs) {
    expect(StyleSheet.flatten(input.props.style).borderRadius).toBe(10);
    expect(StyleSheet.flatten(input.props.style).minHeight).toBeGreaterThanOrEqual(44);
  }
  expect(root.container.queryAll((node) => node.type === "KeyboardAvoidingView")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.keyboardShouldPersistTaps === "handled" && node.props.keyboardDismissMode === "on-drag")).toHaveLength(1);
  await choose(); expect(photos()).toHaveLength(1);
  expect(StyleSheet.flatten(button("Remove Photo").props.style({ pressed: false })).minHeight).toBe(44);
  await tap("Remove Photo"); expect(photos()).toHaveLength(0);
  await tap("Cancel edits"); await tap("Back to previous screen"); expect(button("Open Settings")).toBeDefined();
});
it("retains edit actions and keyboard avoidance while the keyboard is shown, then restores bottom navigation", async () => {
  const listeners = new Map<string, () => void>();
  jest.spyOn(Keyboard, "addListener").mockImplementation((event, callback) => { listeners.set(event, callback as () => void); return { remove: jest.fn() }; });
  await act(async () => { root.unmount(); root = createRoot(); root.render(<App />); });
  await tap("Explore the local demo without signing in"); await edit(); await write("Local bio", "Typing in profile settings");
  await act(async () => listeners.get("keyboardDidShow")?.());
  expect(button("Save profile").props.disabled).toBe(false); expect(button("Cancel edits")).toBeDefined();
  expect(button("Hide keyboard")).toBeDefined();
  expect(root.container.queryAll((node) => node.type === "KeyboardAvoidingView")).toHaveLength(1);
  await act(async () => listeners.get("keyboardDidHide")?.());
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab")).toHaveLength(5);
  await saveAndReturn(); expect(textOf(root.container)).toContain("Typing in profile settings");
});

it("selects a gallery photo, saves it and reuses only the local identity's avatar across Profile, Feed, composer, Home and public view", async () => {
  await edit(); expect(photos()).toHaveLength(0); await choose();
  expect(pickProfilePhoto).toHaveBeenCalledWith("photo"); expect(photos()).toHaveLength(1);
  expect(photos()[0].props.resizeMode).toBe("cover");
  await saveAndReturn(); expect(photos()[0].props.source.uri).toBe(photo.uri);
  expect(releaseMedia).not.toHaveBeenCalled();
  await tap("Feed"); expect(photos()).toHaveLength(1);
  const sample = root.container.queryAll((node) => node.props.testID === "social-post-card")[0];
  expect(sample.queryAll((node) => node.props.accessibilityLabel === "Local profile photo")).toHaveLength(0);
  await tap("Create Post"); expect(photos()).toHaveLength(1);
  await write("Post text", "Same local avatar"); await tap("Publish to local feed. Not uploaded or saved.");
  expect(photos()).toHaveLength(2); await tap("Home"); expect(photos()).toHaveLength(1);
  const author = root.container.queryAll((node) => node.type === "Pressable" && String(node.props.accessibilityLabel).startsWith("View You"))[0];
  await act(async () => author.props.onPress()); expect(photos().every((node) => node.props.source.uri === photo.uri)).toBe(true);
  expect(root.container.queryAll((node) => node.props.testID === "public-profile")).toHaveLength(1);
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Home")).toBeDefined();
});

it("discards a replacement on Cancel Edits and preserves the saved photo", async () => {
  await edit(); await choose(); await saveAndReturn(); await edit();
  jest.mocked(pickProfilePhoto).mockResolvedValue({ media: second }); await choose("Take Photo");
  expect(pickProfilePhoto).toHaveBeenLastCalledWith("cameraPhoto"); expect(photos()[0].props.source.uri).toBe(second.uri);
  await tap("Cancel edits"); expect(textOf(root.container)).toContain("Discard settings edits?"); await tap("Discard edits");
  expect(releaseMedia).toHaveBeenCalledWith(second); expect(releaseMedia).not.toHaveBeenCalledWith(photo);
  await tap("Back to previous screen"); expect(photos()[0].props.source.uri).toBe(photo.uri);
});

it("removes photos only on Save and returns to the existing initials fallback", async () => {
  await edit(); await choose(); await saveAndReturn(); await edit(); await choose("Remove Photo");
  expect(photos()).toHaveLength(0); expect(releaseMedia).not.toHaveBeenCalledWith(photo);
  await tap("Cancel edits"); await tap("Discard edits"); await tap("Back to previous screen"); expect(photos()).toHaveLength(1);
  await edit(); await choose("Remove Photo"); await saveAndReturn(); expect(photos()).toHaveLength(0);
  expect(releaseMedia).toHaveBeenCalledWith(photo);
  await edit(); jest.mocked(pickProfilePhoto).mockResolvedValue({ media: second }); await choose(); await tap("Remove Photo");
  expect(photos()).toHaveLength(0);
  await saveAndReturn(); expect(textOf(root.container)).toContain("YOU"); expect(releaseMedia).toHaveBeenCalledWith(second);
});

it("keeps gallery/camera cancellation and permission failures recoverable without replacing the photo", async () => {
  await edit(); expect(pickProfilePhoto).not.toHaveBeenCalled();
  jest.mocked(pickProfilePhoto).mockResolvedValue({}); await choose(); expect(photos()).toHaveLength(0);
  for (const [source, error] of [["Choose from Gallery", "Gallery access was denied."], ["Take Photo", "Camera access was not granted."]] as const) {
    jest.mocked(pickProfilePhoto).mockResolvedValue({ error }); await choose(source); expect(textOf(root.container)).toContain(error);
  }
  jest.mocked(pickProfilePhoto).mockRejectedValue(new Error("private native file path")); await choose();
  expect(textOf(root.container)).toContain("Photo could not be opened."); expect(textOf(root.container)).not.toContain("private native");
  jest.mocked(pickProfilePhoto).mockResolvedValue({ media: photo }); await choose();
  await saveAndReturn(); expect(photos()[0].props.source.uri).toBe(photo.uri);
});

it("blocks saving expired photos and falls back safely on image decoding failure or foreground cache loss", async () => {
  await edit(); await choose(); jest.mocked(mediaIsReadable).mockReturnValue(false); await tap("Save profile");
  expect(button("Save profile")).toBeDefined(); expect(textOf(root.container)).toContain("Profile photo is unavailable");
  await tap("Remove Photo"); await saveAndReturn(); expect(photos()).toHaveLength(0);
  jest.mocked(mediaIsReadable).mockReturnValue(true); await edit(); await choose(); await saveAndReturn();
  await act(async () => photos()[0].props.onError()); expect(photos()).toHaveLength(0);
  const events = jest.spyOn(AppState, "addEventListener"); await edit();
  jest.mocked(mediaIsReadable).mockReturnValue(false);
  await act(async () => { for (const [, callback] of events.mock.calls) callback("active"); });
  expect(photos()).toHaveLength(0); expect(textOf(root.container)).toContain("Profile photo is unavailable");
});
it("blocks Save after an image decoding error until removal", async () => {
  await edit(); await choose(); await act(async () => photos()[0].props.onError());
  expect(photos()).toHaveLength(0); await tap("Save profile");
  expect(button("Save profile")).toBeDefined(); expect(textOf(root.container)).toContain("Profile photo is unavailable");
  await tap("Remove Photo"); await saveAndReturn(); expect(textOf(root.container)).toContain("YOU");
});
it("clears a temporary profile-photo failure only after the same image loads successfully", async () => {
  const events = jest.spyOn(AppState, "addEventListener");
  await edit(); await choose();
  await act(async () => photos()[0].props.onError()); expect(photos()).toHaveLength(0);
  await act(async () => { for (const [, callback] of events.mock.calls) callback("active"); });
  expect(photos()).toHaveLength(1);
  await act(async () => photos()[0].props.onLoad?.());
  await tap("Save profile");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Save profile")).toHaveLength(0);
  await tap("Back to previous screen"); expect(photos()[0].props.source.uri).toBe(photo.uri);
});

it("disables Save during picking and releases late results after leaving an unchanged editor", async () => {
  await edit(); let resolve!: (result: MediaResult) => void;
  jest.mocked(pickProfilePhoto).mockReturnValue(new Promise((done) => { resolve = done; }));
  await choose(); expect(button("Save profile").props.disabled).toBe(true); expect(button("Choose from Gallery").props.disabled).toBe(true);
  await tap("Cancel edits"); await tap("Edit local profile");
  await act(async () => resolve({ media: photo }));
  expect(releaseMedia).toHaveBeenCalledWith(photo); expect(photos()).toHaveLength(0); expect(button("Save profile").props.disabled).toBe(false);
});
it("preserves the photo through trainer onboarding and shows it only on the local trainer listing", async () => {
  await edit(); await choose(); await saveAndReturn(); await tap("Trainer Profile"); await tap("Become a trainer");
  await tap("Strength training");
  const checkbox = root.container.queryAll((node) => node.props.accessibilityRole === "checkbox")[0];
  await act(async () => checkbox.props.onPress()); await tap("Enable trainer profile");
  expect(photos()).toHaveLength(1); await tap("Feed"); await tap("Trainers");
  const cards = root.container.queryAll((node) => node.props.testID === "trainer-directory-card");
  expect(cards).toHaveLength(3);
  expect(cards.filter((node) => node.queryAll((child) => child.props.accessibilityLabel === "Local profile photo").length > 0)).toHaveLength(1);
});
