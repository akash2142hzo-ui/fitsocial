import { act } from "react";
import { Keyboard, StyleSheet } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import { ComposerHeader, canPublishPost } from "./PostComposer";
import { CreatePostScreen } from "./SocialScreens";
import { createInitialSocialState, MAX_LOCAL_POSTS, postValidationError, SocialAction, SocialState, socialReducer } from "./socialState";
import { initialWorkout } from "../workout/workoutState";
import { createWorkoutAttachment } from "../workout/workoutSharing";
import { LOCAL_AUTHOR_ID } from "./sampleData";
import { colors } from "../theme/colors";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true },
  TextInput: { value: "TextInput", enumerable: true }, Pressable: { value: "Pressable", enumerable: true },
}));
let root: Root; let current: SocialState;
const back = jest.fn();
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
function draw() { root.render(<><ComposerHeader social={current} onSocialAction={send} onBack={back} />
  <CreatePostScreen social={current} onSocialAction={send} workout={initialWorkout} onShareWorkout={jest.fn()} /></>); }
function send(action: SocialAction) { current = socialReducer(current, action); draw(); }
async function render() { await act(async () => { draw(); }); }
function button(label: string) {
  const nodes = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
  expect(nodes).toHaveLength(1); return nodes[0];
}
async function tap(label: string) { await act(async () => { button(label).props.onPress(); }); }
function field() { return root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Post text"))[0]; }
async function type(value: string) { await act(async () => { field().props.onChangeText(value); }); }
const post = () => button("Publish to local feed. Not uploaded or saved.");
beforeEach(() => { root = createRoot(); current = socialReducer(createInitialSocialState(), { type: "openComposer" }); back.mockClear(); });
afterEach(async () => { await act(async () => { root.unmount(); }); jest.restoreAllMocks(); });

it("renders one compact header action and an open writing area with truthful demo identity", async () => {
  await render();
  expect(textOf(post())).toBe("Post"); expect(post().props.disabled).toBe(true);
  expect(field().props.placeholder).toBe("What's your fitness story today?");
  expect(field().props.multiline).toBe(true);
  expect(StyleSheet.flatten(field().props.style)).toMatchObject({ borderWidth: 0, backgroundColor: "transparent", minHeight: 104 });
  expect(textOf(root.container)).toContain("Demo");
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Demo only \u00b7 Posts and drafts aren't permanently saved.")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Cancel")).toHaveLength(0);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Back to previous screen")).toHaveLength(1);
  expect(StyleSheet.flatten(post().props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
});

it.each(["", "  ", "x".repeat(501)])("disables invalid ordinary text and never publishes it (length %s)", async (value) => {
  await render(); await type(value); const records = current.posts;
  expect(post().props.disabled).toBe(true); expect(postValidationError(current)).not.toBeNull();
  await act(async () => { post().props.onPress(); }); expect(current.posts).toBe(records);
  expect(current.composer?.text).toBe(value);
});

it("updates the live counter, accepts 500 characters and publishes once using reducer version guards", async () => {
  await render(); await type("x".repeat(500));
  expect(textOf(root.container)).toContain("500/500"); expect(post().props.disabled).toBe(false);
  const original = current.posts.length; const handler = post().props.onPress;
  await act(async () => { handler(); handler(); });
  expect(current.posts).toHaveLength(original + 1); expect(current.posts[0].origin).toBe("local");
  expect(current.composer).toBeNull();
});

it("selects and removes only sample achievements without losing text or inventing workout data", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss");
  await render(); await type("My local story"); await tap("Add achievement");
  expect(dismiss).toHaveBeenCalled(); await tap("Sample: Showing up");
  expect(current.composer).toMatchObject({ text: "My local story", achievementId: "sample-session", workout: null });
  expect(textOf(root.container)).toContain("Sample achievement");
  await tap("Add achievement"); expect(button("Sample: Showing up").props.accessibilityState.selected).toBe(true);
  await tap("No attachment"); expect(current.composer?.achievementId).toBeNull();
  await tap("Add achievement"); await tap("Sample: Showing up"); await tap("Remove sample achievement");
  expect(current.composer?.text).toBe("My local story"); expect(current.composer?.achievementId).toBeNull();
});

it("saves/resumes drafts and preserves safe discard confirmation and Back", async () => {
  await render(); await type("Keep my draft"); await tap("Back to previous screen");
  expect(back).toHaveBeenCalledTimes(1); expect(current.composer?.text).toBe("Keep my draft");
  await tap("Save draft"); expect(current.drafts[0].text).toBe("Keep my draft"); expect(post().props.disabled).toBe(true);
  await tap(`Resume ${current.drafts[0].id}`); expect(field().props.value).toBe("Keep my draft");
  await tap("Discard post"); expect(current.discardPrompt).toBe("composer"); expect(post().props.disabled).toBe(true);
  await tap("Keep editing"); expect(field().props.value).toBe("Keep my draft");
});

it("retains the workout-caption exception and duplicate workout restriction", async () => {
  // Test fixture only; normal app attachments still come from completed workouts.
  current.composer = { ...current.composer!, workout: createWorkoutAttachment({ id: 91, sets: [] }) };
  await render(); expect(canPublishPost(current)).toBe(true); expect(post().props.disabled).toBe(false);
  const draft = current.composer!; await tap("Publish to local feed. Not uploaded or saved.");
  current = { ...current, composer: draft }; await render(); expect(post().props.disabled).toBe(true);
});

it("disables Post at the existing local-post cap without changing records", async () => {
  const base = current.posts[0];
  current.posts = Array.from({ length: MAX_LOCAL_POSTS }, (_, index) => ({ ...base, id: `fixture-${index}`, origin: "local", authorId: LOCAL_AUTHOR_ID }));
  await render(); await type("Past the demo cap");
  expect(post().props.disabled).toBe(true); expect(textOf(root.container)).toContain("50-post limit");
  const records = current.posts; await act(async () => { post().props.onPress(); }); expect(current.posts).toBe(records);
});

function card(id: string) {
  const nodes = root.container.queryAll((node) => node.type === "View" && node.props.testID === id);
  expect(nodes).toHaveLength(1); return nodes[0];
}

it("groups the editor and actions into exactly two padded charcoal cards with Post outside", async () => {
  await render();
  const editor = card("post-composer-card"); const actions = card("post-actions-card");
  for (const node of [editor, actions]) expect(StyleSheet.flatten(node.props.style)).toMatchObject({ backgroundColor: colors.surface, borderWidth: 1, padding: 16 });
  expect(editor.queryAll((node) => node.type === "TextInput")).toHaveLength(1);
  expect(textOf(editor)).toContain("0/500");
  expect(actions.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
  expect(textOf(actions)).toContain("Attach a workout milestone");
  expect(editor.queryAll((node) => node.props.accessibilityLabel === "Publish to local feed. Not uploaded or saved.")).toHaveLength(0);
  expect(actions.queryAll((node) => node.props.accessibilityLabel === "Publish to local feed. Not uploaded or saved.")).toHaveLength(0);
});

it("balances icon-labelled draft buttons and gives Discard a separate full-width destructive outline", async () => {
  await render();
  const row = card("draft-action-row");
  expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexDirection: "row", gap: 12 });
  for (const label of ["Open Drafts", "Save draft"]) {
    const action = button(label);
    expect(StyleSheet.flatten(action.props.style({ pressed: false }))).toMatchObject({ flex: 1, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" });
    expect(action.queryAll((node) => node.type === "View" && node.props.accessibilityElementsHidden)).toHaveLength(1);
  }
  const discard = button("Discard post");
  expect(StyleSheet.flatten(discard.props.style({ pressed: false }))).toMatchObject({ alignSelf: "stretch", backgroundColor: "transparent", borderWidth: 1, borderColor: "#684447", minHeight: 44 });
  expect(StyleSheet.flatten(discard.queryAll((node) => node.type === "Text")[0].props.style).color).toBe("#CC9292");
  expect(row.queryAll((node) => node.props.accessibilityLabel === "Discard post")).toHaveLength(0);
});

it("returns from the existing drafts view without losing current text or the attached sample", async () => {
  await render(); await type("Draft navigation preserves this"); await tap("Add achievement"); await tap("Sample: Showing up");
  await tap("Open Drafts"); expect(current.viewingDrafts).toBe(true); expect(post().props.disabled).toBe(true);
  await tap("Continue editing");
  expect(field().props.value).toBe("Draft navigation preserves this");
  expect(current.composer?.achievementId).toBe("sample-session");
  expect(textOf(card("post-actions-card"))).toContain("Fictional sample");
});

it("requires confirmation and discards only the current post while retaining saved drafts and publications", async () => {
  await render(); await type("Saved earlier"); await tap("Save draft"); await tap("New text post"); await type("Unsaved current post");
  const posts = current.posts; const saved = current.drafts;
  await tap("Discard post"); expect(current.composer?.text).toBe("Unsaved current post"); expect(current.discardPrompt).toBe("composer");
  await tap("Keep editing"); expect(field().props.value).toBe("Unsaved current post");
  await tap("Discard post"); await tap("Discard drafts");
  expect(current.composer).toBeNull(); expect(current.drafts).toBe(saved); expect(current.posts).toBe(posts);
});
