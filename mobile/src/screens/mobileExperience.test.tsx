import { act } from "react";
import { Alert, BackHandler, Keyboard, StyleSheet, useWindowDimensions } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import App from "../../App";
import { expo } from "../../app.json";
import { PrototypeScreen } from "./PrototypeScreens";
import { WorkoutLogger } from "../workout/WorkoutLogger";
import { initialWorkout, LoggedSet } from "../workout/workoutState";
import { LOCAL_AUTHOR_ID } from "../social/sampleData";
import { BattleRopeIllustration } from "../components/BattleRopeIllustration";
import { HomeHeader } from "../components/HomeHeader";
import { FeedScreen } from "../social/SocialScreens";
import { createInitialSocialState, FeedFilter } from "../social/socialState";
import { Button, IconButton, TextButton } from "../components/ui";
import { ProfileScreen } from "../social/ProfileScreen";
import { colors } from "../theme/colors";
import { sizing } from "../theme/design";

// Exercise real app state and screen bindings. Native layout, keyboard and bars still need a device.
jest.mock("react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const ScrollView = React.forwardRef(function MockScrollView(props: { children?: import("react").ReactNode }, ref) {
    React.useImperativeHandle(ref, () => ({ scrollTo: jest.fn() }));
    return React.createElement("ScrollView", props, props.children);
  });
  const TextInput = React.forwardRef(function MockTextInput(props: object, ref) {
    React.useImperativeHandle(ref, () => ({ focus: jest.fn(), blur: jest.fn() }));
    return React.createElement("TextInput", props);
  });
  return Object.defineProperties({}, {
    ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
    View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true },
    Image: { value: "Image", enumerable: true },
    useWindowDimensions: { value: jest.fn(() => ({ width: 360, height: 800, scale: 1, fontScale: 1 })), enumerable: true },
    SafeAreaView: { value: "SafeAreaView", enumerable: true },
    KeyboardAvoidingView: { value: "KeyboardAvoidingView", enumerable: true },
    Pressable: { value: "Pressable", enumerable: true },
    ScrollView: { value: ScrollView, enumerable: true }, TextInput: { value: TextInput, enumerable: true },
    Modal: { value: ({ visible, children, ...props }: import("react-native").ModalProps) => visible ? React.createElement("Modal", props, children) : null, enumerable: true },
  });
});
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

let root: Root;
let back: (() => boolean | null | undefined) | undefined;
function textOf(node: TestNode): string {
  return typeof node === "string" ? node : node.children.map(textOf).join("");
}
const text = () => textOf(root.container);
function expectElapsed(value: string) {
  const timers = root.container.queryAll((node) => node.type === "Text" && node.props.testID === "active-session-timer");
  if (timers.length) {
    expect(timers).toHaveLength(1); expect(textOf(timers[0])).toBe(value);
    expect(timers[0].props.accessibilityLabel).toBe("Elapsed workout time " + value);
  } else expect(text()).toContain(value + " elapsed");
}

function button(label: string) {
  const matches = root.container.queryAll((node) => (node.props.accessibilityRole === "button" || node.props.accessibilityRole === "tab")
    && (node.props.accessibilityLabel === label || textOf(node) === label));
  if (matches.length !== 1) throw new Error("Expected one button: " + label + "; found " + matches.length);
  return matches[0];
}
async function tap(label: string) { await act(async () => { button(label).props.onPress(); }); }
async function tapStartingWith(label: string) {
  const matches = root.container.queryAll((node) => (node.props.accessibilityRole === "button" || node.props.accessibilityRole === "radio") && String(node.props.accessibilityLabel).startsWith(label));
  expect(matches).toHaveLength(1);
  await act(async () => { matches[0].props.onPress(); });
}
async function browseExercises(category: string) {
  await tap("Muscle category: " + category);
  await tap("Continue to equipment");
  await tap("Equipment option: All equipment");
  await tap("Continue to exercises");
}
async function input(labelStartsWith: string, value: string) {
  const field = root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith(labelStartsWith))[0];
  if (!field) throw new Error("Missing field: " + labelStartsWith);
  await act(async () => { field.props.onChangeText(value); });
}
async function searchFeed(value: string) {
  if (!root.container.queryAll((node) => node.type === "TextInput" && node.props.accessibilityLabel === "Search feed posts").length) await tap("Search Feed");
  await input("Search feed posts", value);
}
async function advance(ms: number) { await act(async () => { jest.advanceTimersByTime(ms); }); }
async function startAndLog() {
  await tap("Train, workouts");
  await tap("Open training settings");
  await input("Body weight", "70");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Chest");
  await input("Search exercise names", "Flat Barbell Bench Press");
  await tapStartingWith("Flat Barbell Bench Press,");
  await input("Repetitions", "8");
  await input("Lifted weight", "20.5");
  await tap("Log set");
}
beforeEach(async () => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 360, height: 800, scale: 1, fontScale: 1 });
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 14, 12));
  jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => {
    back = () => callback({ type: "hardwareBackPress", timeStamp: Date.now() }); return { remove: jest.fn() };
  });
  root = createRoot();
  await act(async () => { root.render(<App />); });
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it("shows a compact public identity, real demo counts, illustrative level and shared posts with Back", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  await tapStartingWith("View Maya R., fictional demo profile.");
  for (const label of ["1 Posts", "0 Followers", "0 Following"]) expect(root.container.queryAll((node) => node.props.accessibilityLabel === label)).toHaveLength(1);
  for (const value of ["@maya_moves_demo", "Morning walks and small wins.", "Level 4", "Active Mover", "Illustrative XP · Not earned or saved", "WORKOUT ACHIEVEMENT"]) expect(text()).toContain(value);
  expect(text()).not.toContain("Separate from spendable FitPoints");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Illustrative XP · Not earned or saved. XP is separate from spendable FitPoints.")).toHaveLength(1);
  expect(text()).not.toContain("Back to welcome");
  expect(text()).not.toContain("Self-reported qualifications");
  expect(root.container.queryAll((node) => node.type === "View" && node.props.testID === "social-post-card")).toHaveLength(1);
  const profile = root.container.queryAll((node) => node.type === "View" && node.props.testID === "public-profile")[0];
  expect(StyleSheet.flatten(profile.props.style).gap).toBe(8);
  const card = root.container.queryAll((node) => node.props.testID === "public-profile-card")[0];
  expect(card.parent).toBe(profile);
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, gap: 8, minWidth: 0 });
  expect(card.queryAll((node) => node.props.testID === "social-post-card")).toHaveLength(0);
  expect(card.queryAll((node) => node.props.testID === "public-profile-posts-heading")).toHaveLength(0);
  expect(root.container.queryAll((node) => node.props.testID === "public-profile-posts-heading")[0].parent).toBe(profile);
  const post = root.container.queryAll((node) => node.type === "View" && node.props.testID === "social-post-card")[0];
  expect(post.parent).toBe(profile);
  expect(StyleSheet.flatten(post.props.style).padding).toBe(StyleSheet.flatten(card.props.style).padding);
  expect(StyleSheet.flatten(button("Follow locally").parent!.props.style).flexDirection).toBe("row");
  const level = root.container.queryAll((node) => node.type === "View" && node.props.testID === "demo-account-level")[0];
  expect(level.parent).toBe(card);
  expect(StyleSheet.flatten(level.props.style).backgroundColor).toBe(colors.background);
  for (const id of ["public-profile-identity", "public-profile-actions"]) expect(card.queryAll((node) => node.props.testID === id)).toHaveLength(1);
  expect(card.queryAll((node) => node.props.testID === "public-profile-name")).toHaveLength(1);
  expect(StyleSheet.flatten(level.props.style).padding).toBe(12);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "progressbar")[0].props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  await tap("Follow locally"); expect(text()).toContain("Following");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Followers")).toHaveLength(1);
  expect(button("Unfollow locally").props.accessibilityState.selected).toBe(true);
  await tap("Trainer Info");
  expect(text()).toContain("FitSocial has not verified this trainer's qualifications or experience.");
  expect(text()).toContain("Self-reported qualifications");
  await tap("Close Trainer Info"); expect(text()).not.toContain("Self-reported qualifications");
  await tap("Trainer Info");
  await act(async () => { root.container.queryAll((node) => node.type === "Modal")[0].props.onRequestClose(); });
  expect(text()).not.toContain("Self-reported qualifications"); expect(text()).toContain("Active Mover");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Create Post")).toBeDefined();
  await tapStartingWith("View Maya R., fictional demo profile."); expect(button("Unfollow locally").props.accessibilityState.selected).toBe(true);
  await tap("Unfollow locally"); expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 Followers")).toHaveLength(1);
});

it("omits trainer controls on ordinary public profiles and shows their text posts", async () => {
  await act(async () => { root.render(<ProfileScreen authorId="sam" social={createInitialSocialState()} onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onNavigate={jest.fn()} history={[]} />); });
  expect(text()).toContain("Walks, weekend movement and community conversations.");
  expect(text()).toContain("Weekend check-in:");
  expect(text()).not.toContain("Trainer Info"); expect(text()).not.toContain("Unverified trainer");
  const actions = root.container.queryAll((node) => node.props.testID === "public-profile-actions")[0];
  expect(actions.children).toHaveLength(1);
  expect(actions.parent!.props.testID).toBe("public-profile-card");
  expect(root.container.queryAll((node) => node.props.testID === "demo-account-level")[0].parent).toBe(actions.parent);
  expect(StyleSheet.flatten(button("Follow locally").props.style({ pressed: false })).flex).toBe(1);
});

it("keeps public header columns, buttons and level aligned without fixed text widths", async () => {
  const social = createInitialSocialState();
  const longName = "Maya with a longer display name and fitness focus";
  const longBio = "Movement, strength and community at my own pace. ".repeat(4).slice(0, 160);
  social.trainers.profiles.maya = { ...social.trainers.profiles.maya, location: "Hyderabad and surrounding region", displayName: longName, bio: longBio };
  await act(async () => { root.render(<ProfileScreen authorId="maya" social={social} onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onNavigate={jest.fn()} history={[]} />); });
  const byId = (id: string) => root.container.queryAll((node) => node.props.testID === id)[0];
  const identity = byId("public-profile-identity");
  expect(StyleSheet.flatten(identity.props.style)).toMatchObject({ flexDirection: "row", gap: 12 });
  expect(StyleSheet.flatten(identity.props.style).flexWrap).toBeUndefined();
  const counts = identity.children[1]; expect(typeof counts).not.toBe("string");
  if (typeof counts === "string") throw new Error("Missing profile statistics");
  expect(StyleSheet.flatten(counts.props.style)).toMatchObject({ flex: 1, minWidth: 0, flexDirection: "row" });
  for (const stat of counts.children) {
    if (typeof stat === "string") throw new Error("Missing statistic");
    expect(StyleSheet.flatten(stat.props.style)).toMatchObject({ flex: 1, minWidth: 0, alignItems: "center" });
    const texts = stat.queryAll((node) => node.type === "Text");
    expect(texts.map((node) => StyleSheet.flatten(node.props.style).fontSize)).toEqual([16, 11]);
    expect(texts.every((node) => node.props.numberOfLines === undefined && node.props.allowFontScaling !== false)).toBe(true);
  }
  const name = byId("public-profile-name");
  expect(textOf(name)).toBe(longName + "Trainer · Unverified");
  expect(StyleSheet.flatten(name.props.style).flexWrap).toBe("wrap");
  expect(StyleSheet.flatten(name.queryAll((node) => node.type === "Text")[0].props.style).flexShrink).toBe(1);
  const badge = name.queryAll((node) => node.type === "Text")[1];
  expect(StyleSheet.flatten(badge.props.style)).toMatchObject({ fontSize: 10, lineHeight: 14, flexShrink: 1 });
  const bioChildren = name.parent!.children.filter((node) => typeof node !== "string");
  expect(textOf(bioChildren[1])).toBe(longBio);
  for (const node of [name.queryAll((entry) => entry.type === "Text")[0], bioChildren[1]]) {
    expect(node.props.numberOfLines).toBeUndefined(); expect(node.props.allowFontScaling).not.toBe(false);
    expect(StyleSheet.flatten(node.props.style).height).toBeUndefined();
    expect(StyleSheet.flatten(node.props.style).maxHeight).toBeUndefined();
  }
  const card = byId("public-profile-card");
  expect(StyleSheet.flatten(card.props.style).overflow).toBeUndefined();
  expect(StyleSheet.flatten(card.props.style).height).toBeUndefined();
  expect(StyleSheet.flatten(card.props.style).maxHeight).toBeUndefined();
  expect(textOf(bioChildren[2])).toBe("Hyderabad and surrounding region");
  expect(byId("public-profile-location").children).toHaveLength(2);
  const actions = byId("public-profile-actions");
  expect(StyleSheet.flatten(actions.props.style)).toMatchObject({ flexDirection: "row", alignItems: "stretch", gap: 8 });
  for (const label of ["Follow locally", "Trainer Info"]) {
    expect(StyleSheet.flatten(button(label).props.style({ pressed: false }))).toMatchObject({ flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 });
  }
  expect(StyleSheet.flatten(button("Follow locally").props.style({ pressed: false })).backgroundColor).toBe(colors.accent);
  expect(StyleSheet.flatten(button("Trainer Info").props.style({ pressed: false })).backgroundColor).toBe(colors.elevated);
  await act(async () => { button("Trainer Info").props.onFocus(); });
  expect(StyleSheet.flatten(button("Trainer Info").props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(StyleSheet.flatten(button("Trainer Info").props.style({ pressed: true })).opacity).toBeLessThan(1);
  expect(StyleSheet.flatten(byId("public-profile-level-heading").props.style).flexDirection).toBe("row");
  const progress = root.container.queryAll((node) => node.props.accessibilityRole === "progressbar")[0];
  expect(StyleSheet.flatten(progress.props.style)).toMatchObject({ height: 4, marginVertical: 4 });
});

it("keeps welcome authentication disabled and exposes exactly five accessible tabs", async () => {
  expect(button("Authentication placeholder. Sign-in and account creation are not available.").props.disabled).toBe(true);
  await tap("Explore the local demo without signing in");
  const tabs = root.container.queryAll((node) => node.props.accessibilityRole === "tab");
  expect(tabs.map(textOf)).toEqual(["Home", "Train", "Rewards", "Feed", "Profile"]);
  expect(text()).not.toContain("Not saved or uploaded");
  expect(text()).not.toContain("Local demo. Changes reset when the app closes.");
  expect(text()).toContain("No saved workout today");
  expect(text()).toContain("Choose an exercise and make your first entry.");
});
it("opens Rewards from its own tab with all five tabs preserved", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile");
  expect(text()).not.toContain("Rewards & FitPoints");
  await tap("Rewards");
  expect(text()).toContain("Your FitPoints");
  expect(text()).toContain("1,250 FP");
  expect(text()).toContain("FitSocial Shop");
  expect(text()).toContain("Profile Badge");
  expect(text()).toContain("Exclusive Profile Frame");
  expect(text()).not.toContain("Training Theme");
  expect(text()).not.toContain("Membership progress");
  expect(text()).not.toContain("FitSocial Rewards");
  expect(text()).not.toContain("Back to welcome");
  expect(text()).not.toContain("Not saved or uploaded");
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Demo")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab").map(textOf))
    .toEqual(["Home", "Train", "Rewards", "Feed", "Profile"]);
  expect(button("Rewards").props.accessibilityState.selected).toBe(true);
  await tap("Profile");
  expect(text()).not.toContain("Your FitPoints");
  expect(text()).not.toContain("Rewards & FitPoints");
  await tap("Rewards");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).not.toContain("FitSocial Rewards");
  expect(button("Home").props.accessibilityState.selected).toBe(true);
});
it("keeps Rewards selected while opening and dismissing earning info and awards no points", async () => {
  await tap("Explore the local demo without signing in"); await tap("Rewards");
  await tap("About FitPoints"); expect(text()).toContain("How to earn FitPoints");
  await tap("Close FitPoints information"); expect(text()).not.toContain("How to earn FitPoints");
  await tap("About FitPoints");
  // React Native Modal routes Android Back to onRequestClose instead of the app BackHandler.
  await act(async () => { root.container.queryAll((node) => node.type === "Modal")[0].props.onRequestClose(); });
  expect(text()).not.toContain("How to earn FitPoints");
  expect(button("Rewards").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("1,250 FP"); expect(text()).toContain("FitSocial Shop");
  await tap("Profile"); await tap("Rewards");
  expect(text()).toContain("Exclusive Profile Frame"); expect(text()).toContain("1,250 FP");
});
it("opens reward and Shop previews and dismisses Back before leaving Rewards", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile"); await tap("Rewards");
  for (const label of ["Profile Badge, 500 FP, Coming soon", "Exclusive Profile Frame, 1,000 FP, Coming soon", "FitSocial Gym T-shirt, illustrative product, Coming soon", "FitSocial Shaker Bottle, illustrative product, Coming soon"]) {
    await tap(label); expect(button("Close preview")).toBeDefined();
    await act(async () => { root.container.queryAll((node) => node.type === "Modal")[0].props.onRequestClose(); });
    expect(button("Rewards").props.accessibilityState.selected).toBe(true);
    expect(text()).toContain("1,250 FP"); expect(text()).toContain("FitSocial Shop");
  }
  await tap("Profile Badge, 500 FP, Coming soon"); await tap("Close preview");
  await tap("Profile"); expect(text()).not.toContain("Rewards & FitPoints");
  await tap("Rewards");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Home").props.accessibilityState.selected).toBe(true);
});
it("keeps Feed gear-free, composer shortcuts working and shared Home post styling consistent", async () => {
  await tap("Explore the local demo without signing in");
  const homeCard = root.container.queryAll((node) => node.type === "View" && node.props.testID === "social-post-card")[0];
  const homeStyle = StyleSheet.flatten(homeCard.props.style);
  const firstPost = textOf(homeCard);
  await tap("Feed");
  const feedCard = root.container.queryAll((node) => node.type === "View" && node.props.testID === "social-post-card")[0];
  expect(StyleSheet.flatten(feedCard.props.style)).toEqual(homeStyle);
  expect(textOf(feedCard)).toBe(firstPost);
  expect(text()).not.toContain("Not saved or uploaded");
  expect(text()).toContain("Share your progress...");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Open feed settings")).toHaveLength(0);
  await tap("Profile"); await tap("Open Settings"); expect(text()).toContain("Privacy & Safety");
  await act(async () => { expect(back?.()).toBe(true); }); await tap("Feed"); expect(button("For You")).toBeDefined();
  await tap("Create Post shortcut"); await input("Post text", "Compact composer draft");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Draft in progress");
  await tap("Create Post");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Compact composer draft")).toHaveLength(1);
});
it("keeps Feed header and tabs persistent across embedded discovery and rapid switching", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  await searchFeed("maya");
  await tap("Trainers");
  expect(button("Trainers").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("Find your kind of fitness guidance");
  expect(text()).not.toContain("Discover Trainers"); expect(text()).not.toContain("Back to welcome");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Back to previous screen")).toHaveLength(0);
  await input("Search trainers", "maya"); await tap("Trainer specialization filter: Mobility");
  await tap("View trainer profile: Maya R."); await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Trainers").props.accessibilityState.selected).toBe(true);
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "maya")).toHaveLength(1);
  await tap("Groups"); expect(text()).toContain("Sample groups");
  await tap("Join Morning movers locally"); expect(button("Leave Morning movers locally")).toBeDefined();
  for (const label of ["For You", "Trainers", "Groups", "For You"]) await tap(label);
  expect(text()).toContain("1 matching post");
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  await tap("Trainers"); await tap("Profile"); await tap("Feed");
  expect(button("Trainers").props.accessibilityState.selected).toBe(true);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Home").props.accessibilityState.selected).toBe(true);
});
it("preserves workout entries and composer drafts through rapid bottom-tab changes", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await tap("Feed"); await tap("Create Post"); await input("Post text", "Draft across transitions");
  await tap("Back to previous screen");
  for (const label of ["Rewards", "Profile", "Feed", "Home", "Train, workouts"]) await tap(label);
  expect(text()).toContain("8 reps");
  await tap("Feed"); await tap("Create Post");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Draft across transitions")).toHaveLength(1);
});
it("keeps two composer cards and header Post available when the keyboard changes visibility", async () => {
  const listeners = new Map<string, () => void>();
  jest.spyOn(Keyboard, "addListener").mockImplementation((event, callback) => { listeners.set(event, callback as () => void); return { remove: jest.fn() }; });
  await act(async () => { root.unmount(); root = createRoot(); root.render(<App />); });
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("Create Post");
  await input("Post text", "Typing with the keyboard open");
  await act(async () => { listeners.get("keyboardDidShow")?.(); });
  expect(button("Publish to local feed. Not uploaded or saved.").props.disabled).toBe(false);
  expect(button("Hide keyboard")).toBeDefined();
  for (const id of ["post-composer-card", "post-actions-card"]) expect(root.container.queryAll((node) => node.type === "View" && node.props.testID === id)).toHaveLength(1);
  expect(root.container.queryAll((node) => node.type === "KeyboardAvoidingView").length).toBeGreaterThan(0);
  expect(root.container.queryAll((node) => node.props.keyboardShouldPersistTaps === "handled" && node.props.keyboardDismissMode === "on-drag").length).toBeGreaterThan(0);
  await act(async () => { listeners.get("keyboardDidHide")?.(); });
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Typing with the keyboard open")).toHaveLength(1);
});
it("preserves composer text through header and Android Back, Rewards and Profile", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("Create Post");
  expect(button("Feed").props.accessibilityState.selected).toBe(true);
  await input("Post text", "Draft survives Back");
  await tap("Back to previous screen"); expect(button("Create Post")).toBeDefined();
  await tap("Rewards"); expect(text()).toContain("Your FitPoints");
  await tap("Profile"); await tap("Rewards");
  expect(button("Rewards").props.accessibilityState.selected).toBe(true);
  await tap("Feed"); await tap("Create Post");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Draft survives Back")).toHaveLength(1);
  await tap("Discard post");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).not.toContain("Discard unfinished post draft?");
  expect(button("Save draft")).toBeDefined();
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Create Post")).toBeDefined();
  await tap("Create Post"); await tap("Save draft");
  expect(text()).toContain("Draft survives Back");
});
it("shows keyboard focus on bottom tabs without changing their navigation or selected state", async () => {
  await tap("Explore the local demo without signing in");
  await act(async () => { button("Feed").props.onFocus(); });
  expect(StyleSheet.flatten(button("Feed").props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(button("Home").props.accessibilityState.selected).toBe(true);
  await tap("Feed"); expect(button("Feed").props.accessibilityState.selected).toBe(true);
  await act(async () => { button("Feed").props.onBlur(); });
  expect(StyleSheet.flatten(button("Feed").props.style({ pressed: false })).borderColor).toBe("transparent");
});
it("keeps Settings in the Profile flow without an emoji or floating app gear", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile");
  const settings = button("Open Settings");
  expect(StyleSheet.flatten(settings.props.style({ pressed: false })).position).not.toBe("absolute");
  expect(text()).not.toContain("\u2699");
  await tap("Open Settings"); expect(text()).toContain("Privacy & Safety");
});
it("starts a timed workout from Home and continues it across tabs", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Start workout");
  expectElapsed("00:00");
  expect(text()).toContain("Calories"); expect(text()).toContain("Add weight to estimate");
  await advance(61_000);
  await tap("Home");
  expect(text()).toContain("Workout in progress");
  expect(text()).toContain("01:01");
  await tap("Continue workout");
  expect(text()).toContain("01:01");
});
it("keeps Home Start, Continue, Review and Progress usable with the bundled battle-rope image", async () => {
  await tap("Explore the local demo without signing in");
  async function verifyHero() {
    const photos = root.container.queryAll((node) => node.type === "Image");
    expect(photos).toHaveLength(1);
    expect(photos[0].props.resizeMode).toBe("contain");
    expect(photos[0].props.source).toBe(require("../../assets/photos/battle-rope-cropped.png"));
    expect(text()).toContain("Choose an exercise and make your first entry.");
    expect(text()).not.toContain("Make your next move.");
  }
  await verifyHero(); await tap("Start workout");
  await advance(61_000); await tap("Home"); await verifyHero();
  await tap("Continue workout"); expectElapsed("01:01");
  await tap("Add exercise"); await browseExercises("Chest");
  await input("Search exercise names", "Push-up"); await tapStartingWith("Push-up,");
  await input("Repetitions", "8"); await tap("Log set");
  await tap("End workout"); await tap("Finish workout");
  await tap("Home"); await verifyHero(); await tap("Review workout");
  expect(text()).toContain("Workout complete");
  expect(text()).toContain("Not saved");
  await tap("Home"); await verifyHero(); await tap("View Progress");
  expect(text()).toContain("No completed workouts yet.");
});
it("keeps Home Interest navigation explicit without swipe handlers", async () => {
  await tap("Explore the local demo without signing in");
  expect(textOf(button("Open Feed"))).not.toContain("Sample");
  expect(root.container.queryAll((node) => typeof node.props.onTouchMove === "function" || typeof node.props.onSwipe === "function")).toHaveLength(0);
  expect(button("Home").props.accessibilityState.selected).toBe(true);
  await tap("Open Feed"); expect(button("Feed").props.accessibilityState.selected).toBe(true);
});
it("searches a long exercise name, logs and removes its set using accessible controls", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Chest");
  await input("Search exercise names", "Incline Smith Machine Bench Press");
  const choice = root.container.queryAll((node) => node.props.accessibilityRole === "radio"
    && String(node.props.accessibilityLabel).startsWith("Incline Smith Machine Bench Press"))[0];
  await act(async () => { choice.props.onPress(); });
  await input("Repetitions", "12");
  await input("Lifted weight", "0");
  await tap("Log set");
  expect(text()).toContain("12 reps");
  expect(text()).toContain("0 kg");
  await tap("Remove Incline Smith Machine Bench Press set 1");
  expect(text()).toContain("No exercises logged yet");
});
it("shows identical frozen workout metrics in Train, Progress and posts while keeping the Profile menu compact", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await advance(1_800_000);
  await tap("End workout");
  expect(text()).toContain("Discard removes this session");
  await tap("Finish workout");
  expect(text()).toContain("Not saved");
  await tap("Save for this session");
  expect(text()).toContain("Duration 30:00");
  expect(text()).toContain("Estimated calories: 123 kcal");
  await advance(60_000);
  expect(text()).toContain("Duration 30:00");
  await tap("Profile");
  expect(text()).not.toContain("30:00");
  expect(text()).not.toContain("123 kcal");
  await tap("View Progress");
  expect(text()).toContain("30:00");
  expect(text()).toContain("Calorie estimates available for 1 of 1 workouts");
  await tap("View workout 1 recorded activity details. Duration 30:00");
  expect(text()).toContain("8 reps");
  expect(text()).toContain("20.5 kg");
  await tap("Share workout 1");
  expect(text()).toContain("Estimated calories: 123 kcal");
  const publish = button("Publish to local feed. Not uploaded or saved.");
  await act(async () => { publish.props.onPress(); publish.props.onPress(); });
  expect(text()).toContain("Feed");
  expect(text()).toContain("30:00");
  expect(text()).toContain("Estimated calories: 123 kcal");
  await tap("Profile");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(1);
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("Calorie estimates available for 1 of 1 workouts");
});
it("preserves composer and active workout state, and confirms Android Back before discarding", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("Feed"); await tap("Create Post");
  await input("Post text", "Keep this draft");
  await tap("Profile");
  await tap("Feed"); await tap("Create Post");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Keep this draft")).toHaveLength(1);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Create Post")).toBeDefined();
  await tap("Create Post");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Keep this draft")).toHaveLength(1);
  await tap("Discard post");
  await tap("Discard drafts");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("End workout?");
  await tap("Keep logging");
  expect(text()).toContain("8 reps");
  await tap("End workout");
  await tap("Discard workout");
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("No completed workouts yet.");
});

it("keeps likes, comments, profiles, follows, bio edits and group membership interactive", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Feed");
  await tapStartingWith("Like Maya R.'s post.");
  expect(root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("Unlike Maya R.'s post. 2 likes."))).toHaveLength(1);
  await tap("Show 1 comments");
  await tap("Comment");
  expect(text()).toContain("Write a comment before submitting.");
  await input("Comment on Maya", "Local encouragement");
  await tap("Comment");
  expect(text()).toContain("Local encouragement");
  await tapStartingWith("View Maya R., fictional demo profile.");
  expect(text()).toContain("Fictional profile");
  await tap("Follow locally");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Followers")).toHaveLength(1);
  await tap("Profile");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Following")).toHaveLength(1);
  await tap("Edit profile");
  await input("Local bio", "My updated bio");
  await tap("Save profile");
  await tap("Home");
  await tap("Profile");
  expect(text()).toContain("My updated bio");
  await tap("Groups");
  expect(text()).toContain("128 sample members");
  await tap("Join Morning movers locally");
  expect(text()).toContain("129 demo total");
  await tap("Feed");
  await tap("Groups");
  expect(button("Leave Morning movers locally").props.accessibilityState.selected).toBe(true);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Create Post")).toBeDefined();
});

it("keeps composer validation and explicit publishing for text and sample attachments", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Feed"); await tap("Create Post");
  expect(button("Publish to local feed. Not uploaded or saved.").props.disabled).toBe(true);
  expect(button("Publish to local feed. Not uploaded or saved.").props.accessibilityHint).toContain("Write a post before submitting.");
  await input("Post text", "x".repeat(501));
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Keep a post to 500 characters or fewer.");
  await input("Post text", "A local thought");
  await tap("Add achievement");
  await tap("Sample: Showing up");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("A local thought");
  expect(text()).toContain("WORKOUT ACHIEVEMENT");
  await tap("Profile");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(1);
});

it("finishes a very short session with exact zero duration and no positive calorie estimate", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  expect(text()).toContain("Duration 00:00");
  expect(text()).toContain("Calories unavailable \u2014 workout under 1 minute");
  expect(text()).not.toContain("Estimated calories:");
});

it("shares without saving, keeps Progress empty, and later saves the same summary explicitly", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Share workout");
  await tap("Publish to local feed. Not uploaded or saved.");
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("No completed workouts yet.");
  await tap("Train, workouts");
  expect(text()).toContain("Not saved");
  await tap("Start new workout");
  expect(text()).toContain("Unsaved workout");
  await tap("Keep reviewing");
  await tap("Save for this session");
  expect(text()).toContain("Saved for this session only");
  await tap("Start new workout");
  expect(button("Add exercise")).toBeDefined();
  expect(root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Repetitions"))).toHaveLength(0);
  await tap("Profile");
  await tap("View Progress");
  expect(text()).not.toContain("No completed workouts yet.");
});

it("uses duration and assistance inputs and protects unsaved review on Android Back", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Core");
  await input("Search exercise names", "Plank");
  await tapStartingWith("Plank,");
  expect(root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Lifted weight"))).toHaveLength(0);
  await input("Activity duration", "60");
  await tap("Log set");
  expect(text()).toContain("60 seconds");
  await tap("Change exercise");
  await browseExercises("Back");
  await input("Search exercise names", "Assisted Pull-up");
  await tapStartingWith("Assisted Pull-up,");
  await input("Repetitions", "8");
  await input("Assistance weight", "30");
  await tap("Log set");
  expect(text()).toContain("30 kg assistance");
  await tap("End workout");
  await tap("Finish workout");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Unsaved workout");
  await tap("Discard unsaved workout");
  expect(text()).toContain("Your next workout");
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("No completed workouts yet.");
});

it("logs treadmill metrics, saves and shares cardio without displaying rep sets", async () => {
  await tap("Explore the local demo without signing in");
  expect(text()).not.toContain("Your activity");
  await tap("Train, workouts");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Cardio");
  await input("Search exercise names", "Incline Treadmill Walking");
  await tapStartingWith("Incline Treadmill Walking,");
  expect(root.container.queryAll((node) => node.type === "TextInput" && /Repetitions|Lifted weight|Added weight|Assistance weight/.test(String(node.props.accessibilityLabel)))).toHaveLength(0);
  await input("Activity duration", "1500");
  await input("Speed (km/h)", "4.5");
  await input("Incline (%)", "8");
  await input("Distance (km)", "0");
  await tap("Log activity");
  expect(text()).toContain("25 min");
  expect(text()).toContain("8% incline");
  expect(text()).toContain("0 km");
  await tap("End workout");
  await tap("Finish workout");
  await tap("Home");
  expect(text()).not.toContain("Your activity");
  await tap("Review workout");
  await tap("Save for this session");
  await tap("Share workout");
  await tap("Publish to local feed. Not uploaded or saved.");
  await tap("View workout 1 recorded activity details. Duration 00:00");
  expect(text()).toContain("25 min");
  expect(text()).not.toContain("rep sets");
  await tap("Home");
  expect(text()).not.toContain("No saved workouts in the last seven days.");
  expect(root.container.queryAll((node) => /: 1 saved workouts$/.test(String(node.props.accessibilityLabel)))).toHaveLength(1);
});

it("requires external lifted weight and rejects zero for a loaded dumbbell movement", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Chest");
  await input("Search exercise names", "Incline Dumbbell Bench Press");
  await tapStartingWith("Incline Dumbbell Bench Press,");
  await input("Repetitions", "8");
  await tap("Log set");
  expect(text()).toContain("Enter lifted weight in kg before logging.");
  await input("Lifted weight", "0");
  await tap("Log set");
  expect(text()).toContain("Enter a positive lifted weight");
  await input("Lifted weight", "12.5");
  await tap("Log set");
  expect(text()).toContain("12.5 kg");
});

it("keeps an empty Home focused on starting and community without zero-only history sections", async () => {
  await tap("Explore the local demo without signing in");
  expect(button("Start workout")).toBeDefined();
  expect(button("Open Feed")).toBeDefined();
  expect(button("View Progress")).toBeDefined();
  expect(text()).not.toContain("Your activity");
  expect(text()).not.toContain("Last saved workout");
  expect(text()).not.toContain("workout time");
  expect(root.container.queryAll((node) => /saved workouts$/.test(String(node.props.accessibilityLabel)))).toHaveLength(0);
});

it("shows complete chart headings and saved sections only after explicit Save", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Home");
  expect(text()).toContain("Workout ready to review");
  expect(button("Review workout")).toBeDefined();
  expect(text()).not.toContain("Your activity");
  await tap("Review workout");
  await tap("Save for this session");
  await tap("Home");
  expect(text()).toContain("Your activity");
  expect(text()).toContain("Last 7 days");
  expect(text()).toContain("Last saved workout");
  expect(text()).toContain("workout time");
  expect(root.container.queryAll((node) => /: 1 saved workouts$/.test(String(node.props.accessibilityLabel)))).toHaveLength(1);
});

it("uses the header gear for optional settings and keeps body weight collapsed until requested", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  expect(button("Open training settings").props.accessibilityState.expanded).toBe(false);
  expect(root.container.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
  const actions = root.container.queryAll((node) => node.props.accessibilityRole === "button").map((node) => node.props.accessibilityLabel);
  expect(actions.indexOf("Open training settings")).toBeLessThan(actions.indexOf("Start workout"));
  await tap("Open training settings");
  await input("Body weight", "70");
  await tap("Open training settings");
  expect(root.container.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
  await tap("Start workout");
  expectElapsed("00:00");
  expect(text()).not.toContain("SESSION TIME");
  await tap("Edit workout body weight");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "70")).toHaveLength(1);
});

it("keeps invalid body weight visible and still allows a blank weight to start", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  await tap("Open training settings");
  await input("Body weight", "1000");
  await tap("Open training settings");
  await tap("Start workout");
  expect(text()).toContain("Enter body weight from 1 to 500 kg");
  expect(button("Open training settings").props.accessibilityState.expanded).toBe(true);
  await input("Body weight", "");
  await tap("Start workout");
  expect(button("Add exercise")).toBeDefined();
  expect(text()).toContain("Calories"); expect(text()).toContain("Add weight to estimate");
});

it("shows validation on submission and never counts selected exercises or unlogged reps", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Chest");
  await input("Search exercise names", "Flat Barbell Bench Press");
  await tapStartingWith("Flat Barbell Bench Press,");
  const reps = root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Repetitions"))[0];
  expect(reps.props.value).toBe("");
  expect(reps.props.placeholder).toBe("Reps");
  expect(button("Log set").props.disabled).toBe(true);
  expect(text()).not.toContain("Weight required. Enter positive");
  await input("Repetitions", "8");
  expect(text()).toContain("No exercises logged yet");
  expect(text()).not.toContain("rep sets");
  await tap("Log set");
  expect(text()).toContain("Enter lifted weight in kg before logging.");
  await input("Lifted weight", "40");
  expect(text()).not.toContain("Enter lifted weight in kg before logging.");
  await tap("Log set");
  await input("Repetitions", "8");
  await input("Lifted weight", "45");
  await tap("Log set");
  expect(button("Remove Flat Barbell Bench Press set 1")).toBeDefined();
  expect(button("Remove Flat Barbell Bench Press set 2")).toBeDefined();
  expect(text()).toContain("40 kg");
  expect(text()).toContain("45 kg");
  expect(text()).not.toContain("No exercises logged yet");
});

it("keeps estimate assumptions accessible through the compact timer disclosure", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  await tap("About calorie estimates");
  expect(text()).toContain("Actual calories vary; not a medical measurement.");
  await tap("About calorie estimates");
  expect(text()).toContain("Available after 1 min");
  expect(text()).not.toContain("Actual calories vary; not a medical measurement.");
});

async function openTrainerDetails() {
  if (!button("Trainer Profile").props.accessibilityState.expanded) await tap("Trainer Profile");
}

async function acknowledgeTrainer() {
  const checkbox = root.container.queryAll((node) => node.props.accessibilityRole === "checkbox")[0];
  await act(async () => { checkbox.props.onPress(); });
}

it("opts into an unverified trainer extension, posts with the same identity and disables safely", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Profile");
  await openTrainerDetails(); await tap("Become a trainer");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "checkbox")[0].props.accessibilityState.checked).toBe(false);
  await tap("Enable trainer profile");
  expect(text()).toContain("Acknowledge that your qualifications have not been verified.");
  await input("Trainer Display name", "Taylor Demo");
  await input("Trainer Username", "taylor_demo");
  await input("Trainer Bio", "Local trainer bio");
  await input("Trainer Experience", "My self-reported experience");
  await tap("Strength training");
  await tap("Online");
  await acknowledgeTrainer();
  await tap("Enable trainer profile");
  await openTrainerDetails();
  expect(text()).toContain("Unverified trainer");
  expect(text()).toContain("Taylor Demo");
  expect(text()).toContain("@taylor_demo");
  await tap("Feed"); await tap("Create Post");
  await input("Post text", "Same account, local trainer post");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("@taylor_demo");
  await tap("Trainers");
  await input("Search trainers", "taylor");
  await tap("View trainer profile: Taylor Demo");
  expect(text()).toContain("Same account, local trainer post");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("1 trainers");
  await tap("Profile");
  await openTrainerDetails(); await tap("Edit trainer profile");
  await input("Trainer Experience", "Updated self-report");
  await acknowledgeTrainer();
  await tap("Save trainer profile");
  await openTrainerDetails();
  expect(text()).toContain("Updated self-report");
  await tap("Disable trainer status");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).not.toContain("Disable trainer status?");
  expect(text()).toContain("Unverified trainer");
  await tap("Disable trainer status");
  await tap("Confirm disable trainer status");
  expect(text()).not.toContain("Unverified trainer");
  expect(text()).toContain("Local trainer bio");
  expect(text()).toContain("Same account, local trainer post");
  expect(button("Become a trainer")).toBeDefined();
  await tap("Feed");
  await tap("Trainers");
  expect(text()).toContain("No matching trainers.");
});

it("discovers clearly fictional trainers, follows their existing profiles and preserves filters on Back", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Feed");
  await tap("Trainers");
  expect(text()).toContain("Sample \u00b7 Unverified");
  await input("Search trainers", "maya_moves");
  await tap("Trainer specialization filter: Mobility");
  await tap("Trainer coaching filter: Online");
  expect(text()).toContain("1 trainers");
  await tap("View trainer profile: Maya R.");
  expect(text()).toContain("Trainer · Unverified");
  await tap("Trainer Info");
  expect(text()).toContain("FitSocial has not verified this trainer's qualifications or experience.");
  expect(text()).toContain("No qualifications supplied. Fictional example only.");
  await tap("Close Trainer Info");
  await tap("Follow locally");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Followers")).toHaveLength(1);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("1 trainers");
  await input("Search trainers", "no such trainer");
  expect(text()).toContain("No matching trainers.");
  await tap("Reset trainer filters");
  expect(text()).toContain("2 trainers");
});

it("keeps trainer drafts, workout state and normal post drafts during navigation", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Start workout");
  await tap("Profile");
  await openTrainerDetails(); await tap("Become a trainer");
  await input("Trainer Experience", "Unfinished trainer draft");
  await tap("Bodyweight");
  await act(async () => { expect(back?.()).toBe(true); });
  await openTrainerDetails(); await tap("Continue trainer setup");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Unfinished trainer draft")).toHaveLength(1);
  expect(button("Bodyweight").props.accessibilityState.selected).toBe(true);
  await tap("Feed"); await tap("Create Post");
  await input("Post text", "Keep my ordinary post draft");
  await tap("Profile");
  await openTrainerDetails(); await tap("Continue trainer setup");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Unfinished trainer draft")).toHaveLength(1);
  await tap("Train, workouts");
  expect(button("Add exercise")).toBeDefined();
  await tap("Feed"); await tap("Create Post");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Keep my ordinary post draft")).toHaveLength(1);
});


it("preserves input focus callbacks and exposes a visible focus border", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Start workout");
  await tap("Add exercise");
  await browseExercises("Chest");
  const field = () => root.container.queryAll((node) => node.type === "TextInput" && node.props.accessibilityLabel === "Search exercise names")[0];
  const before = StyleSheet.flatten(field().props.style).borderColor;
  await act(async () => { field().props.onFocus({ nativeEvent: {} }); });
  expect(StyleSheet.flatten(field().props.style).borderColor).not.toBe(before);
  await act(async () => { field().props.onBlur({ nativeEvent: {} }); });
  expect(StyleSheet.flatten(field().props.style).borderColor).toBe(before);
});

it("hides a zero-only activity chart while preserving older saved history", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Save for this session");
  await advance(8 * 24 * 60 * 60 * 1000);
  await tap("Home");
  expect(text()).toContain("Last saved workout");
  expect(text()).not.toContain("Your activity");
});

it("keeps selected primary follow controls readable and announced", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Feed");
  await tap("Trainers");
  await tap("View trainer profile: Maya R.");
  await tap("Follow locally");
  const control = button("Unfollow locally");
  expect(control.props.accessibilityState.selected).toBe(true);
  const label = control.children.find((child) => typeof child !== "string");
  expect(label && typeof label !== "string" && StyleSheet.flatten(label.props.style).color).toBe("#C6F26B");
});


it("shows Shared instead of another share action across Train, Home, Progress and Profile", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Share workout");
  await input("Post text", "Only once");
  const publish = button("Publish to local feed. Not uploaded or saved.");
  await act(async () => { publish.props.onPress(); publish.props.onPress(); });
  expect(text()).toContain("Shared workout 1");
  await tap("Train, workouts");
  expect(text()).toContain("Not saved");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Share workout")).toHaveLength(0);
  expect(text()).toContain("Shared");
  await tap("Save for this session");
  await tap("Home");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Share workout")).toHaveLength(0);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Workout 1 shared to local Feed")).toHaveLength(1);
  await tap("View Progress");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Share workout 1")).toHaveLength(0);
  expect(text()).toContain("Shared");
  await tap("Profile");
  expect(text()).toContain("Only once");
  expect(text()).toContain("Shared workout 1");
  await tap("Feed"); await tap("Create Post");
  await tap("Open Drafts");
  expect(text()).not.toContain("Pending share");
});

it("parks and resumes a workout caption across navigation without saving or publishing it", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Share workout");
  await input("Post text", "Continue this caption later");
  await tap("Save draft");
  expect(text()).toContain("Drafts");
  expect(text()).toContain("Not published");
  expect(text()).toContain("Demo only \u00b7 Posts and drafts aren't permanently saved.");
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("No completed workouts yet.");
  await tap("Train, workouts");
  expect(text()).toContain("Not saved");
  expect(button("Resume workout draft")).toBeDefined();
  await tap("Resume workout draft");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Continue this caption later")).toHaveLength(1);
  await tap("View workout 1 recorded activity details. Duration 00:00");
  expect(text()).toContain("20.5 kg");
  await tap("Save draft");
  await tap("Feed");
  expect(text()).not.toContain("Continue this caption later");
  await tap("Feed"); await tap("Create Post");
  expect(button("Resume draft-1")).toBeDefined();
  await tap("Resume draft-1");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Continue this caption later");
  await tap("Train, workouts");
  expect(text()).toContain("Not saved");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Workout 1 shared to local Feed")).toHaveLength(1);
});

it("confirms parked text draft discard and preserves it on cancel and Android Back", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Feed"); await tap("Create Post");
  await input("Post text", "Keep until confirmed");
  await tap("Save draft");
  await tap("Discard draft-1");
  expect(text()).toContain("Discard this draft?");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Keep until confirmed");
  await tap("Discard draft-1");
  await tap("Keep draft");
  expect(text()).toContain("Keep until confirmed");
  await tap("Discard draft-1");
  await tap("Discard draft");
  expect(text()).toContain("No drafts yet.");
  expect(text()).not.toContain("Keep until confirmed");
  await tap("New text post");
  await input("Post text", "A normal resumed post");
  await tap("Save draft");
  await tap("Resume draft-2");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("A normal resumed post");
});

it("lists only completed workouts as pending and cancelling a share leaves it pending", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("Feed"); await tap("Create Post");
  await tap("Open Drafts");
  expect(text()).not.toContain("Pending share");
  await tap("Continue editing");
  await tap("Discard post");
  await tap("Discard drafts");
  await tap("Train, workouts");
  await tap("End workout");
  await tap("Finish workout");
  await tap("Share workout");
  await tap("Discard post");
  await tap("Discard drafts");
  await tap("Feed"); await tap("Create Post");
  await tap("Open Drafts");
  expect(text()).toContain("Pending share");
  await tap("Share pending workout 1");
  expect(text()).toContain("already open");
  await tap("Continue editing");
  await tap("Save draft");
  await tap("Share pending workout 1");
  expect(text()).toContain("Workout 1");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Shared workout 1");
});


it("retains a parked workout snapshot after the unsaved Train summary is explicitly discarded", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Share workout");
  await input("Post text", "Independent snapshot");
  await tap("Save draft");
  await tap("Train, workouts");
  await tap("Start new workout");
  await tap("Discard unsaved workout");
  await tap("Feed"); await tap("Create Post");
  await tap("Resume draft-1");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Independent snapshot")).toHaveLength(1);
  await tap("View workout 1 recorded activity details. Duration 00:00");
  expect(text()).toContain("20.5 kg");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Shared workout 1");
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("No completed workouts yet.");
});

it("shares two identical completed sessions separately without reviving the first share action", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("End workout");
  await tap("Finish workout");
  await tap("Save for this session");
  await tap("Share workout");
  await tap("Publish to local feed. Not uploaded or saved.");
  await tap("Train, workouts");
  await tap("Start new workout");
  await tap("Add exercise");
  await browseExercises("Chest");
  await input("Search exercise names", "Flat Barbell Bench Press");
  await tapStartingWith("Flat Barbell Bench Press,");
  await input("Repetitions", "8");
  await input("Lifted weight", "20.5");
  await tap("Log set");
  await tap("End workout");
  await tap("Finish workout");
  await tap("Save for this session");
  await tap("Share workout");
  await tap("Publish to local feed. Not uploaded or saved.");
  await tap("Profile");
  expect(text()).toContain("Shared workout 1");
  expect(text()).toContain("Shared workout 2");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(2);
  await tap("Profile");
  await tap("View Progress");
  expect(root.container.queryAll((node) => /^Workout [12] shared to local Feed$/.test(String(node.props.accessibilityLabel)))).toHaveLength(2);
  expect(root.container.queryAll((node) => /^Share workout [12]$/.test(String(node.props.accessibilityLabel)))).toHaveLength(0);
});


it("cancels guided selection without altering logged sets or unlogged strength inputs", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await input("Repetitions", "12"); await input("Lifted weight", "45");
  await tap("Change exercise"); await browseExercises("Cardio");
  await input("Search exercise names", "Incline Treadmill Walking");
  await tap("Cancel exercise selection");
  expect(button("Remove Flat Barbell Bench Press set 1")).toBeDefined();
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "12")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "45")).toHaveLength(1);
  await tap("Change exercise"); await browseExercises("Cardio");
  await input("Search exercise names", "Incline Treadmill Walking"); await tapStartingWith("Incline Treadmill Walking,");
  expect(button("Remove Flat Barbell Bench Press set 1")).toBeDefined();
  expect(root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Repetitions"))).toHaveLength(0);
  await input("Activity duration", "60"); await input("Distance (km)", "0.1"); await tap("Log activity");
  expect(button("Remove Incline Treadmill Walking activity 1")).toBeDefined();
  expect(button("Remove Flat Barbell Bench Press set 1")).toBeDefined();
});

it("preserves cardio drafts on cancel and when selecting the same activity again", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts"); await tap("Start workout"); await tap("Add exercise");
  await browseExercises("Cardio");
  await input("Search exercise names", "Treadmill Running");
  await tapStartingWith("Treadmill Running,");
  await input("Activity duration", "300"); await input("Distance (km)", "0.5");
  await input("Speed (km/h)", "6"); await input("Incline (%)", "4");
  await tap("Change exercise"); await browseExercises("Chest"); await tap("Cancel exercise selection");
  for (const value of ["300", "0.5", "6", "4"]) {
    expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === value)).toHaveLength(1);
  }
  await tap("Change exercise"); await tap("Continue to equipment"); await tap("Continue to exercises");
  await input("Search exercise names", "Treadmill Running");
  await tapStartingWith("Treadmill Running,"); await tap("Log activity");
  expect(button("Remove Treadmill Running activity 1")).toBeDefined();
  expect(text()).toContain("0.5 km");
  expect(text()).toContain("4% incline");
  expect(text()).toContain("10:00 min/km");
});

it("relocates Following to Home and opens existing discovery from Feed with safe Back", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  for (const label of ["Trainers", "Groups"]) {
    await tap(label); await act(async () => { expect(back?.()).toBe(true); });
    expect(button("Feed").props.accessibilityState.selected).toBe(true);
  }
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "button" && ["Following", "My Posts"].includes(node.props.accessibilityLabel))).toHaveLength(0);
  await tap("Home"); await tap("Following"); expect(text()).toContain("Your following feed is quiet.");
  expect(button("Start workout")).toBeDefined();
  await tap("For You"); await tapStartingWith("View Maya R., fictional demo profile."); await tap("Follow locally");
  await act(async () => { expect(back?.()).toBe(true); });
  await tap("Following"); expect(text()).toContain("Made a little time to move today.");
  expect(text()).not.toContain("Training notebook:");
  await tapStartingWith("View Maya R., fictional demo profile."); await tap("Unfollow locally");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Following").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("Your following feed is quiet.");
  await tap("Feed"); expect(text()).toContain("Weekend check-in:");
});

it("keeps saved drafts out of feeds and publishes into For You and My Posts from Following", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("Profile");
  expect(text()).toContain("No posts yet."); await tap("Create a post");
  await input("Post text", "Discovery draft to publish"); await tap("Save draft");
  await tap("Feed");
  expect(text()).not.toContain("Discovery draft to publish");
  expect(text()).toContain("Fictional sample community.");
  await tap("For You"); expect(text()).not.toContain("Discovery draft to publish");
  await tap("Home"); await tap("Following"); await tap("Feed"); await tap("Create Post"); await tap("Resume draft-1");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("Discovery draft to publish");
  await tap("Profile"); expect(text()).toContain("Discovery draft to publish");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(1);
  await tap("Home"); await tap("Following"); expect(text()).not.toContain("Discovery draft to publish");
});

it.each<[FeedFilter, string, string]>([
  ["all", "No posts to discover yet.", "Create post"],
  ["following", "No posts to discover yet.", "Create post"],
  ["local", "No posts to discover yet.", "Create post"],
])("provides an actionable %s empty state", async (filter, title, action) => {
  const create = jest.fn(); const trainers = jest.fn();
  await act(async () => { root.render(<FeedScreen social={{ ...createInitialSocialState(), posts: [], filter }}
    onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onCreatePost={create} onOpenTrainers={trainers} onOpenGroups={jest.fn()} />); });
  expect(text()).toContain(title);
  await tap(action); expect(create).toHaveBeenCalledTimes(1);
});

async function openSettings() {
  await tap("Profile"); await tap("Open Settings");
}

it("shows an accessible calorie information button without body weight and preserves logging", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts"); await tap("Start workout");
  const control = button("About calorie estimates");
  expect(control.props.accessibilityRole).toBe("button");
  expect(control.props.accessibilityHint).toContain("how calories are estimated");
  expect(control.props.accessibilityState.expanded).toBe(false);
  await tap("About calorie estimates");
  expect(text()).toContain("3.5 MET");
  expect(text()).toContain("at least one minute");
  expect(text()).toContain("Actual calories vary; not a medical measurement.");
  await tap("Add exercise"); await browseExercises("Forearms");
  await input("Search exercise names", "Dead Hang"); await tapStartingWith("Dead Hang,");
  await input("Activity duration", "30"); await tap("Log set");
  expect(button("Remove Dead Hang set 1")).toBeDefined();
  expect(root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Repetitions"))).toHaveLength(0);
  await advance(60_000);
  expect(text()).toContain("Add weight to estimate");
  expect(text()).not.toContain("Estimated calories:");
  await tap("About calorie estimates");
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  expect(button("Remove Dead Hang set 1")).toBeDefined();
});

it("shows an open personal header, slim level/edit controls and four quick-access tiles", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile");
  const byId = (id: string) => root.container.queryAll((node) => node.props.testID === id)[0];
  const card = byId("personal-profile-header");
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({ gap: 8, minWidth: 0 });
  for (const key of ["backgroundColor", "borderWidth", "padding"]) expect(StyleSheet.flatten(card.props.style)[key]).toBeUndefined();
  expect(root.container.queryAll((node) => ["personal-profile-card", "personal-profile-activity"].includes(node.props.testID))).toHaveLength(0);
  const controlRow = byId("personal-profile-controls");
  expect(button("Edit profile").parent).toBe(controlRow);
  expect(StyleSheet.flatten(controlRow.props.style)).toMatchObject({ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8 });
  expect(StyleSheet.flatten(button("Edit profile").props.style({ pressed: false }))).toMatchObject({ height: 40, width: 70, backgroundColor: colors.accent, paddingHorizontal: 6, borderRadius: 8, flexShrink: 0 });
  expect(textOf(card)).toContain("@fitsocial_demo"); expect(textOf(card)).toContain("Moving at my pace.");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "header" && textOf(node) === "My Profile")).toHaveLength(1);
  expect(button("Open Settings").parent!.queryAll((node) => node.props.accessibilityRole === "header" && textOf(node) === "My Profile")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Demo")).toHaveLength(1);
  for (const removed of ["Rewards & FitPoints", "Demo identity", "Not saved or uploaded", "Back to welcome"]) expect(text()).not.toContain(removed);
  const level = byId("personal-profile-level"); expect(level.parent).toBe(controlRow);
  expect(textOf(level)).toContain("Lv. 4"); expect(textOf(level)).toContain("Active Mover"); expect(level.queryAll((node) => node.props.accessibilityRole === "progressbar")[0].props.accessibilityLabel).toContain("Not earned or saved");
  expect(StyleSheet.flatten(level.props.style)).toMatchObject({ height: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, flex: 1, minWidth: 0, backgroundColor: colors.accentSurface, borderWidth: 1, borderColor: "rgba(198,242,107,0.28)", borderRadius: 8 });
  const lightning = level.queryAll((node) => node.type === "Text" && textOf(node) === "\u26a1\ufe0e")[0];
  expect(StyleSheet.flatten(lightning.props.style)).toMatchObject({ fontSize: 14, color: colors.accent });
  expect(lightning.props.accessibilityElementsHidden).toBe(true);
  const progress = level.queryAll((node) => node.props.accessibilityRole === "progressbar")[0];
  expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  expect(StyleSheet.flatten(progress.props.style)).toMatchObject({ width: 14, height: 3 });
  expect(progress.parent).toBe(level);
  expect(level.children).toHaveLength(5);
  expect(button("Edit profile").props.hitSlop).toEqual({ top: 4, bottom: 4, left: 0, right: 0 });
  expect(level.queryAll((node) => String(node.props.accessibilityLabel).includes("XP is separate from spendable FitPoints"))).toHaveLength(1);
  const activity = byId("personal-profile-quick-access"); expect(activity.parent).toBe(card.parent);
  expect(StyleSheet.flatten(activity.props.style)).toMatchObject({ gap: 8, minWidth: 0 });
  expect(StyleSheet.flatten(activity.props.style).backgroundColor).toBeUndefined();
  const tileRows = activity.queryAll((node) => node.props.testID === "personal-profile-tile-row");
  expect(tileRows).toHaveLength(2);
  expect(tileRows.map((node) => node.queryAll((entry) => entry.type === "Pressable").length)).toEqual([2, 2]);
  for (const tileRow of tileRows) expect(StyleSheet.flatten(tileRow.props.style)).toMatchObject({ flexDirection: "row", alignItems: "stretch", gap: 8 });
  expect(textOf(activity)).not.toContain("No saved workouts yet");
  const rows = activity.queryAll((node) => node.type === "Pressable");
  expect(rows.map((node) => node.props.accessibilityLabel)).toEqual(["View Progress", "Groups", "View drafts (0)", "Trainer Profile"]);
  for (const row of rows) expect(StyleSheet.flatten(row.props.style({ pressed: false }))).toMatchObject({ minHeight: 52, flex: 1, minWidth: 0, flexDirection: "row", gap: 8, backgroundColor: colors.surface, borderColor: colors.border });
  for (const row of rows) {
    const icon = row.queryAll((node) => node.type === "Text")[0];
    expect(StyleSheet.flatten(icon.props.style)).toMatchObject({ fontSize: 16, width: 20, color: colors.accent });
  }
  await act(async () => { button("Groups").props.onFocus(); });
  expect(StyleSheet.flatten(button("Groups").props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(StyleSheet.flatten(button("Groups").props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { button("Groups").props.onBlur(); });
  expect(textOf(activity)).toContain("Progress"); expect(textOf(activity)).toContain("Groups"); expect(textOf(activity)).toContain("Drafts (0)"); expect(textOf(activity)).toContain("Trainer");
  expect(text()).not.toContain("Your Activity");
  expect(textOf(button("Edit profile"))).toContain("Edit");
  const personal = root.container.queryAll((node) => node.props.testID === "personal-profile")[0];
  const sections = personal.children.filter((node) => typeof node !== "string");
  expect(sections[0]).toBe(card); expect(sections[1].props.testID).toBe("personal-profile-quick-access"); expect(textOf(sections[2])).toContain("My Posts");
  expect(card.queryAll((node) => node.props.testID === "social-post-card")).toHaveLength(0);
  await tap("Open Settings");
  const settingSections = root.container.queryAll((node) => node.props.accessibilityRole === "header").map(textOf);
  expect(settingSections).toEqual(["Settings", "Account", "Appearance", "Privacy & Safety", "Notifications", "Storage & Data", "About", "Account Management"]);
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Edit profile")).toBeDefined();
});

it("opens activity destinations, retains drafts and returns to the personal Profile with Android Back", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile");
  await tap("Groups"); expect(text()).toContain("Sample groups");
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Open Settings")).toBeDefined();
  await tap("Create a post"); await input("Post text", "Draft from my Profile"); await tap("Save draft");
  await tap("Profile"); await tap("View drafts (1)"); await tap("Resume draft-1");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Draft from my Profile")).toHaveLength(1);
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Open Settings")).toBeDefined();
  expect(button("Trainer Profile").props.accessibilityState.expanded).toBe(false);
  await tap("Trainer Profile"); expect(button("Become a trainer")).toBeDefined();
  await tap("Trainer Profile"); expect(root.container.queryAll((node) => node.props.testID === "personal-trainer-details")).toHaveLength(0);
  await tap("Trainer Profile"); await tap("Become a trainer");
  expect(text()).toContain("FitSocial has not verified this trainer's qualifications or experience.");
  await input("Trainer Experience", "Activity row trainer draft");
  await act(async () => { expect(back?.()).toBe(true); }); await openTrainerDetails(); await tap("Continue trainer setup");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Activity row trainer draft")).toHaveLength(1);
});

it.each([320, 360])("keeps the personal controls flexible at %i dp with large system text", async (width) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width, height: 640, scale: 1, fontScale: 1.8 });
  await tap("Explore the local demo without signing in"); await tap("Profile");
  const identity = root.container.queryAll((node) => node.props.testID === "personal-profile-identity")[0];
  expect(StyleSheet.flatten(identity.props.style)).toMatchObject({ flexDirection: "row", alignItems: "center", gap: 12 });
  const avatar = identity.queryAll((node) => node.type === "View" && StyleSheet.flatten(node.props.style)?.width === 66)[0];
  expect(StyleSheet.flatten(avatar.props.style)).toMatchObject({ width: 66, height: 66, borderRadius: 33 });
  const stats = identity.queryAll((node) => node.props.accessibilityLiveRegion === "polite")[0];
  expect(StyleSheet.flatten(stats.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  for (const stat of stats.children) {
    if (typeof stat === "string") throw new Error("Missing statistic");
    expect(StyleSheet.flatten(stat.props.style)).toMatchObject({ flex: 1, minWidth: 0, alignItems: "center" });
  }
  const controls = root.container.queryAll((node) => node.props.testID === "personal-profile-controls")[0];
  const level = root.container.queryAll((node) => node.props.testID === "personal-profile-level")[0];
  const tileRows = root.container.queryAll((node) => node.props.testID === "personal-profile-tile-row");
  expect(tileRows).toHaveLength(2);
  for (const row of tileRows) {
    const tiles = row.queryAll((node) => node.type === "Pressable"); expect(tiles).toHaveLength(2);
    for (const tile of tiles) {
      const style = StyleSheet.flatten(tile.props.style({ pressed: false }));
      expect(style).toMatchObject({ flex: 1, minWidth: 0, minHeight: 52 });
      expect(style.height).toBeUndefined(); expect(style.overflow).toBeUndefined();
      const label = tile.queryAll((node) => node.type === "Text")[1];
      expect(label.props.numberOfLines).toBeUndefined(); expect(label.props.allowFontScaling).not.toBe(false);
    }
  }
  expect(StyleSheet.flatten(controls.props.style)).toMatchObject({ minHeight: 48, flexDirection: "row", alignItems: "center" });
  expect(StyleSheet.flatten(controls.props.style).flexWrap).toBeUndefined();
  for (const panel of [level, button("Edit profile")]) {
    const style = StyleSheet.flatten(typeof panel.props.style === "function" ? panel.props.style({ pressed: false }) : panel.props.style);
    expect(style.height).toBe(40); expect(style.overflow).toBeUndefined();
    for (const label of panel.queryAll((node) => node.type === "Text")) {
      expect(label.props.numberOfLines ?? 1).toBe(1); expect(label.props.allowFontScaling).not.toBe(false);
      expect(label.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.2);
    }
  }
  const editStyle = StyleSheet.flatten(button("Edit profile").props.style({ pressed: false }));
  expect(editStyle.width).toBe(70);
  expect(editStyle.height + button("Edit profile").props.hitSlop.top + button("Edit profile").props.hitSlop.bottom).toBe(48);
  await act(async () => { button("Edit profile").props.onFocus(); });
  expect(StyleSheet.flatten(button("Edit profile").props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(StyleSheet.flatten(button("Edit profile").props.style({ pressed: true })).opacity).toBeLessThan(1);
  await tap("Edit profile"); expect(button("Save profile")).toBeDefined();
  await input("Local bio", "Compact profile edit"); await tap("Save profile");
  await act(async () => { expect(back?.()).toBe(true); }); expect(text()).toContain("Compact profile edit");
  expect(button("Open Settings")).toBeDefined();
});

it("keeps long personal names and bios complete without fixed-height clipping", async () => {
  const social = createInitialSocialState();
  social.localProfile.displayName = "A long personal display name for a fitness explorer";
  social.localBio = "Moving at my own pace and making room for community. ".repeat(4).slice(0, 160);
  await act(async () => { root.render(<ProfileScreen social={social} onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onNavigate={jest.fn()} history={[]} />); });
  const card = root.container.queryAll((node) => node.props.testID === "personal-profile-header")[0];
  for (const value of [social.localProfile.displayName, social.localBio]) {
    const text = card.queryAll((node) => node.type === "Text" && textOf(node) === value)[0];
    expect(text).toBeDefined(); expect(text.props.numberOfLines).toBeUndefined(); expect(text.props.allowFontScaling).not.toBe(false);
    expect(StyleSheet.flatten(text.props.style).height).toBeUndefined();
  }
  expect(StyleSheet.flatten(card.props.style).height).toBeUndefined(); expect(StyleSheet.flatten(card.props.style).overflow).toBeUndefined();
});

it("keeps empty Profile social counts near identity and omits progress descriptions from the menu", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile");
  for (const label of ["0 Posts", "0 Followers", "0 Following"]) expect(root.container.queryAll((node) => node.props.accessibilityLabel === label)).toHaveLength(1);
  expect(text()).not.toContain("local posts"); expect(text()).not.toContain("local followers");
  expect(text()).toContain("No posts yet."); expect(text()).not.toContain("No saved workouts yet.");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 saved workouts")).toHaveLength(0);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "00:00 total time")).toHaveLength(0);
  expect(button("Edit profile")).toBeDefined(); expect(button("Open Settings")).toBeDefined();
  await tap("View Progress"); expect(text()).toContain("No completed workouts yet.");
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Open Settings")).toBeDefined();
});

it("counts publications and follows in Profile while excluding drafts and samples", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("Create Post");
  await input("Post text", "Published profile preview"); await tap("Publish to local feed. Not uploaded or saved.");
  await tap("Feed"); await tap("Create Post"); await input("Post text", "Unpublished profile draft"); await tap("Save draft");
  await tap("Feed"); await tapStartingWith("View Maya R., fictional demo profile."); await tap("Follow locally");
  await tap("Profile");
  for (const label of ["1 Posts", "0 Followers", "1 Following"]) expect(root.container.queryAll((node) => node.props.accessibilityLabel === label)).toHaveLength(1);
  expect(text()).toContain("Published profile preview"); expect(text()).not.toContain("Unpublished profile draft");
  expect(text()).not.toContain("Made a little time to move today.");
  expect(button("View drafts (1)")).toBeDefined();
  const post = root.container.queryAll((node) => node.type === "View" && node.props.testID === "social-post-card")[0];
  expect(post.parent!.props.testID).toBe("personal-profile");
});

it("keeps the activity menu compact with saved history and links directly to Progress", async () => {
  const navigate = jest.fn();
  await act(async () => { root.render(<ProfileScreen social={createInitialSocialState()} onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onNavigate={navigate}
    history={[{ id: 1, sets: [{ id: 1, exerciseId: "push-up", exercise: "Push-up", reps: 10, weight: null }] }]} />); });
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 saved workouts")).toHaveLength(0);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "00:00 total time")).toHaveLength(0);
  expect(text()).not.toContain("estimated calories");
  await tap("View Progress"); expect(navigate).toHaveBeenCalledWith("progress");
});

it("gives shared native controls consistent focus, pressed, selected and disabled states", async () => {
  const press = jest.fn();
  await act(async () => { root.render(<Button label="Native action" secondary selected accessibilityHint="Native hint" onPress={press} />); });
  let control = button("Native action");
  expect(StyleSheet.flatten(control.props.style({ pressed: false }))).toMatchObject({ minHeight: sizing.touch, minWidth: sizing.touch, borderColor: colors.accent });
  expect(control.props.accessibilityState.selected).toBe(true);
  expect(control.props.accessibilityHint).toBe("Native hint");
  await act(async () => { control.props.onFocus(); });
  control = button("Native action");
  expect(StyleSheet.flatten(control.props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(StyleSheet.flatten(control.props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { control.props.onBlur(); });
  expect(StyleSheet.flatten(button("Native action").props.style({ pressed: false })).borderColor).toBe(colors.accent);
  await tap("Native action"); expect(press).toHaveBeenCalledTimes(1);
  await act(async () => { root.render(<Button label="Unavailable action" disabled onPress={press} />); });
  control = button("Unavailable action"); expect(control.props.disabled).toBe(true);
  expect(control.props.accessibilityState.disabled).toBe(true);
  expect(StyleSheet.flatten(control.props.style({ pressed: true })).opacity).toBeLessThan(1);
});

it("gives text and icon buttons visible native focus with accessible labels", async () => {
  for (const element of [<TextButton key="text" label="Secondary action" onPress={jest.fn()} />, <IconButton key="icon" label="Secondary action" icon={null} onPress={jest.fn()} />]) {
    await act(async () => { root.render(element); });
    await act(async () => { button("Secondary action").props.onFocus(); });
    let control = button("Secondary action");
    expect(StyleSheet.flatten(control.props.style({ pressed: false }))).toMatchObject({ minHeight: sizing.touch, minWidth: sizing.touch, borderColor: colors.text });
    expect(StyleSheet.flatten(control.props.style({ pressed: true })).opacity).toBeLessThan(1);
    await act(async () => { control.props.onBlur(); }); control = button("Secondary action");
    expect(StyleSheet.flatten(control.props.style({ pressed: false })).borderColor).toBe("transparent");
  }
});

it("saves a future privacy preference with explicit non-enforcement and unchanged discovery", async () => {
  await tap("Explore the local demo without signing in"); await openSettings();
  expect(text()).toContain("Privacy & Safety"); expect(text()).toContain("Login & Security");
  expect(text()).toContain("No production services connected.");
  expect(text()).toContain("Coming soon");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "button" && /Sign in|Sign out/.test(String(node.props.accessibilityLabel)))).toHaveLength(0);
  await tap("Edit future privacy preference");
  expect(text()).toContain("This does not make your account private or publish anything online.");
  await tap("Future visibility preference: Private");
  expect(button("Future visibility preference: Private").props.accessibilityState.selected).toBe(true);
  await tap("Save future preference");
  expect(text()).toContain("Future preference: Private. Local only; no enforcement effect.");
  await tap("Feed"); expect(text()).toContain("Weekend check-in:");
  expect(text()).toContain("Made a little time to move today.");
  await openSettings(); await tap("Edit future privacy preference");
  expect(button("Future visibility preference: Private").props.accessibilityState.selected).toBe(true);
});

it("protects future preference edits on hardware Back and keeps saved values on cancel", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Edit future privacy preference");
  await tap("Future visibility preference: Public");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Discard settings edits?"); await tap("Keep editing");
  expect(button("Future visibility preference: Public").props.accessibilityState.selected).toBe(true);
  await tap("Cancel edits"); await tap("Discard edits");
  expect(text()).toContain("Future preference: Not set.");
  expect(button("Profile").props.accessibilityState.selected).toBe(true);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab")).toHaveLength(5);
});

it("searches discovery, preserves the query through profiles and clears empty results", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  await searchFeed("maya");
  expect(text()).toContain("1 matching post");
  expect(text()).toContain("Made a little time to move today.");
  expect(text()).not.toContain("Weekend check-in:");
  await tapStartingWith("View Maya R., fictional demo profile.");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "maya")).toHaveLength(1);
  await searchFeed("nothing matches here");
  expect(text()).toContain("No matching posts.");
  await tap("Clear feed search");
  expect(text()).not.toContain("No matching posts.");
  expect(text()).toContain("Weekend check-in:");
});

it("opens saved Drafts directly from My Posts without publishing them", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("Create Post");
  await input("Post text", "Parked discovery draft"); await tap("Save draft");
  await tap("Feed"); await tap("Profile");
  expect(text()).not.toContain("Parked discovery draft");
  await tap("Profile"); await tapStartingWith("View drafts (");
  expect(text()).toContain("Drafts"); expect(text()).toContain("Parked discovery draft");
  expect(button("Resume draft-1")).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab").map(textOf)).toEqual(["Home", "Train", "Rewards", "Feed", "Profile"]);
});

it("publishes visibly after an unmatched feed search and retains local interactions", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  await searchFeed("no result"); await tap("Feed"); await tap("Create Post");
  await input("Post text", "Search-safe publication"); await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Search-safe publication");
  expect(text()).not.toContain("No matching posts.");
  await tap("Profile");
  await tapStartingWith("Like ");
  expect(root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("Unlike "))).toHaveLength(1);
  await tap("Show 0 comments"); await input("Comment on ", "Local encouragement"); await tap("Add local comment");
  expect(text()).toContain("Local encouragement");
  expect(button("Hide 1 comments")).toBeDefined();
});
it("opens grouped Settings under Profile with honest static states and five tabs", async () => {
  await tap("Explore the local demo without signing in"); await openSettings();
  for (const section of ["Edit Profile", "Fitness Preferences", "Login & Security", "Appearance", "Privacy & Safety", "Notifications", "Storage & Data", "About FitSocial", "Account Management"]) expect(text()).toContain(section);
  expect(text()).toContain("No production services connected.");
  expect(text()).toContain("0.1.0");
  const staticRows = root.container.queryAll((node) => node.props.testID === "settings-static-row");
  expect(staticRows).toHaveLength(12);
  for (const row of staticRows) {
    expect(row.props.onPress).toBeUndefined(); expect(row.props.accessibilityRole).not.toBe("button");
    expect(row.queryAll((node) => node.props.testID === "settings-row-chevron")).toHaveLength(0);
  }
  expect(button("Profile").props.accessibilityState.selected).toBe(true);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab")).toHaveLength(5);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Open Settings")).toBeDefined();
});
it.each([280, 320])("keeps grouped Settings honest and flexible at %i dp with large system text", async (width) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width, height: 640, scale: 1, fontScale: 1.8 });
  await tap("Explore the local demo without signing in"); await openSettings();
  const overview = root.container.queryAll((node) => node.props.testID === "settings-overview")[0];
  const header = root.container.queryAll((node) => node.props.testID === "settings-header")[0];
  expect(header.queryAll((node) => node.type === "Text").map(textOf)).toEqual(["\u2190", "Settings", "Local demo"]);
  expect(text()).not.toContain("Back to welcome"); expect(text()).not.toContain("Not saved or uploaded");
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Local demo")).toHaveLength(1);
  const groups = overview.queryAll((node) => node.props.testID === "settings-group");
  expect(groups).toHaveLength(7);
  const actions = overview.queryAll((node) => node.props.testID === "settings-action-row");
  expect(actions.map((node) => node.props.accessibilityLabel)).toEqual(["Edit local profile", "Measurements and units", "Edit future privacy preference"]);
  expect(overview.queryAll((node) => node.props.testID === "settings-row-chevron")).toHaveLength(actions.length);
  const staticRows = overview.queryAll((node) => node.props.testID === "settings-static-row");
  const staticRow = (prefix: string) => staticRows.find((node) => String(node.props.accessibilityLabel).startsWith(prefix))!;
  expect(staticRow("App Theme").props.accessibilityLabel).toBe("App Theme. Dark");
  expect(staticRow("Text Size").props.accessibilityLabel).toBe("Text Size. Default. Uses system text scaling");
  expect(staticRow("About FitSocial").props.accessibilityLabel).toBe(`About FitSocial. ${expo.version}`);
  for (const label of ["Login & Security", "Account Privacy", "Blocked Accounts", "Social Notifications", "Workout Reminders", "Trainer Notifications"]) {
    expect(staticRow(label).props.accessibilityLabel).toBe(label + ". Coming soon");
  }
  const deletion = staticRow("Delete Account");
  expect(deletion.props.onPress).toBeUndefined();
  expect(deletion.props.accessibilityLabel).toContain("Unavailable");
  const deleteLabel = deletion.queryAll((node) => node.type === "Text" && textOf(node) === "Delete Account")[0];
  expect(StyleSheet.flatten(deleteLabel.props.style).color).toBe(colors.error);
  for (const row of [...staticRows, ...actions]) {
    const style = StyleSheet.flatten(typeof row.props.style === "function" ? row.props.style({ pressed: false }) : row.props.style);
    expect(style.minHeight).toBe(52); expect(style.height).toBeUndefined(); expect(style.overflow).toBeUndefined();
    for (const label of row.queryAll((node) => node.type === "Text")) {
      expect(label.props.numberOfLines).toBeUndefined(); expect(label.props.allowFontScaling).not.toBe(false);
    }
  }
  expect(overview.queryAll((node) => node.props.accessibilityRole === "switch")).toHaveLength(0);
  for (const omitted of ["Privacy Policy", "Terms of Service", "Help & Support", "Community Guidelines", "Clear cache", "Cloud backup"]) expect(textOf(overview)).not.toContain(omitted);
  expect(textOf(overview)).toContain("No production services connected.");
  expect(textOf(overview)).toContain("Local only; no enforcement effect.");
  await act(async () => { button("Edit local profile").props.onFocus(); });
  expect(StyleSheet.flatten(button("Edit local profile").props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(StyleSheet.flatten(button("Edit local profile").props.style({ pressed: true })).opacity).toBeLessThan(1);
  await tap("Back to previous screen"); expect(button("Open Settings")).toBeDefined();
  await openSettings(); await tap("Feed"); expect(button("Create Post")).toBeDefined();
});
it("saves profile identity and avatar consistently in Profile, My Posts and comments", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("Create Post");
  await input("Post text", "A post with a stable author"); await tap("Publish to local feed. Not uploaded or saved.");
  await openSettings(); await tap("Edit local profile");
  await input("Profile display name", "Taylor Local"); await input("Profile username", "taylor_local");
  await input("Local bio", "My saved bio"); await input("Profile broad location", "Hyderabad");
  await tap("Save profile"); await tap("Back to previous screen");
  for (const value of ["Taylor Local", "@taylor_local", "My saved bio", "Hyderabad", "TL"]) expect(text()).toContain(value);
  await tap("Feed"); await tap("Profile");
  expect(text()).toContain("Taylor Local"); expect(text()).toContain("@taylor_local");
  await tap("Show 0 comments"); await input("Comment on Taylor Local", "Still the same author"); await tap("Add local comment");
  expect(text()).toContain("Still the same author");
  await tapStartingWith("View Taylor Local, fictional demo profile.");
  expect(text()).toContain("@taylor_local");
  expect(root.container.queryAll((node) => node.props.testID === "public-profile")).toHaveLength(1);
  expect(text()).toContain("My saved bio"); expect(text()).toContain("Hyderabad");
  await tap("Back to previous screen");
  expect(button("Open Settings")).toBeDefined();
});
it("validates edits and confirms cancel, toolbar Back and hardware Back", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Edit local profile");
  await input("Profile display name", ""); await tap("Save profile"); expect(text()).toContain("Enter a display name.");
  await tap("Cancel edits"); expect(text()).toContain("Discard settings edits?");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Save profile")).toBeDefined();
  await input("Profile display name", "Uncommitted"); await tap("Back to previous screen"); await tap("Keep editing");
  await act(async () => { expect(back?.()).toBe(true); }); await tap("Discard edits");
  expect(button("Edit local profile")).toBeDefined();
  await tap("Back to previous screen"); expect(text()).not.toContain("Uncommitted");
});
it("protects dirty settings when changing tabs and cancels a pending navigation on Keep editing", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Edit local profile");
  await input("Profile display name", "Keep this name"); await tap("Feed");
  expect(text()).toContain("Discard settings edits?"); await tap("Keep editing"); await tap("Save profile");
  expect(button("Edit local profile")).toBeDefined();
  await tap("Edit local profile"); await input("Profile display name", "Discard this name"); await tap("Feed"); await tap("Discard edits");
  expect(button("For You")).toBeDefined(); await tap("Profile");
  expect(text()).toContain("Keep this name"); expect(text()).not.toContain("Discard this name");
});
it("uses personal weight for new workouts while preserving session overrides", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Measurements and units");
  await input("Personal height", "175"); await input("Personal body weight", "72.5"); await tap("Save preferences");
  expect(text()).toContain("175 cm · 72.5 kg · Metric");
  await tap("Train, workouts"); await tap("Start workout"); await tap("Edit workout body weight");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "72.5")).toHaveLength(1);
  await input("Body weight", "80"); await tap("Save workout body weight");
  await openSettings(); await tap("Measurements and units"); await input("Personal body weight", "90"); await tap("Save preferences");
  await tap("Train, workouts"); await tap("Edit workout body weight");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "80")).toHaveLength(1);
  await tap("Add exercise"); await browseExercises("Chest"); await input("Search exercise names", "Push-up"); await tapStartingWith("Push-up,");
  await input("Repetitions", "10"); await tap("Log set"); await advance(60000);
  await tap("End workout"); await tap("Finish workout"); await tap("Save for this session");
  const calories = text().match(/Estimated calories: \d+ kcal/)?.[0]; expect(calories).toBeTruthy();
  await openSettings(); await tap("Measurements and units"); await input("Personal body weight", "100"); await tap("Save preferences");
  await tap("Train, workouts"); expect(text()).toContain(calories!);
  await tap("Start new workout"); await tap("Edit workout body weight");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "100")).toHaveLength(1);
});

it("closes unchanged editors directly and protects Settings edits before returning to Profile", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Edit local profile");
  await tap("Cancel edits"); expect(button("Edit local profile")).toBeDefined();
  await tap("Measurements and units"); await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Measurements and units")).toBeDefined();
  await tap("Edit local profile"); await input("Profile display name", "Unsaved before exit");
  await tap("Back to previous screen"); expect(text()).toContain("Discard settings edits?");
  await tap("Keep editing"); expect(button("Save profile")).toBeDefined();
  await tap("Back to previous screen"); await tap("Discard edits");
  expect(button("Edit local profile")).toBeDefined();
  await tap("Back to previous screen"); expect(button("Open Settings")).toBeDefined();
  expect(text()).not.toContain("Unsaved before exit");
});


it("keeps Home on a compact grid with a centered title and decorative battle-rope image", async () => {
  await tap("Explore the local demo without signing in");
  const instruction = "Choose an exercise and make your first entry.";
  const labels = root.container.queryAll((node) => node.type === "Text" && textOf(node) === instruction);
  expect(labels).toHaveLength(1);
  expect(labels[0].props.accessibilityRole).toBe("header");
  expect(StyleSheet.flatten(labels[0].props.style)).toMatchObject({ fontSize: 14, lineHeight: 20, fontFamily: "System" });
  expect(labels[0].props.numberOfLines).toBeUndefined();
  expect(labels[0].props.allowFontScaling).not.toBe(false);
  const hero = root.container.queryAll((node) => node.type === "View" && node.children.some((child) => typeof child !== "string" && child.type === "Text" && textOf(child) === instruction))[0];
  expect(StyleSheet.flatten(hero.props.style)).toMatchObject({ paddingHorizontal: 12, paddingVertical: 8, gap: 4 });
  expect(StyleSheet.flatten(hero.props.style).height).toBeUndefined();
  const title = root.container.queryAll((node) => node.type === "Text" && textOf(node) === "FitSocial")[0];
  expect(StyleSheet.flatten(title.props.style)).toMatchObject({ textAlign: "center", fontFamily: "System" });
  const scroll = root.container.queryAll((node) => node.props.contentContainerStyle && StyleSheet.flatten(node.props.contentContainerStyle).padding === 16);
  expect(scroll.length).toBeGreaterThan(0);
  for (const label of ["Start workout", "View Progress"]) {
    expect(StyleSheet.flatten(button(label).props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
  }
  const progress = button("View Progress");
  expect(StyleSheet.flatten(progress.props.style({ pressed: false })).position).not.toBe("absolute");
  await act(async () => { progress.props.onFocus(); });
  expect(StyleSheet.flatten(button("View Progress").props.style({ pressed: false })).backgroundColor).toBe(colors.accentSurface);
  const rope = root.container.queryAll((node) => node.type === "View" && node.props.testID === "home-battle-rope");
  expect(rope).toHaveLength(1);
  expect(StyleSheet.flatten(rope[0].props.style)).toMatchObject({ flex: 3, minWidth: 0, aspectRatio: 691 / 345 });
  expect(rope[0].props).toMatchObject({ pointerEvents: "none", accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
  for (const removed of ["Back to welcome", "Good to see you.", "Make your next move.", "Community", "Not saved or uploaded"]) expect(text()).not.toContain(removed);
  expect(text()).toContain("Interest");
  expect(text()).not.toContain("Fictional sample community.");
  expect(root.container.queryAll((node) => node.type === "Image")).toHaveLength(1);
  const tabsBefore = root.container.queryAll((node) => node.props.accessibilityRole === "tab").map((node) => StyleSheet.flatten(node.props.style({ pressed: false })));
  await tap("Open Feed");
  expect(text()).toContain("Fictional sample community.");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Back to welcome")).toHaveLength(0);
  const tabsAfter = root.container.queryAll((node) => node.props.accessibilityRole === "tab").map((node) => StyleSheet.flatten(node.props.style({ pressed: false })));
  expect(tabsAfter).toEqual(tabsBefore);
});

it("shows the two newest discovery Home posts independently of follows and Feed filters without changing social state", async () => {
  const social = createInitialSocialState();
  social.filter = "local"; social.feedQuery = "no matching search phrase";
  social.follows = [{ followerId: "maya", followingId: LOCAL_AUTHOR_ID }];
  const onSocialAction = jest.fn(); const onOpenAuthor = jest.fn(); const onNavigate = jest.fn();
  const renderHome = async () => { await act(async () => { root.render(<PrototypeScreen activeTab="home" workout={initialWorkout}
    onWorkoutAction={jest.fn()} onShareWorkout={jest.fn()} social={social} onSocialAction={onSocialAction} onOpenAuthor={onOpenAuthor} onNavigate={onNavigate} />); }); };
  await renderHome();
  expect(text()).toContain("Interest");
  expect(text()).toContain("Made a little time to move today.");
  expect(text()).toContain("Training notebook:");
  social.follows = [{ followerId: LOCAL_AUTHOR_ID, followingId: "maya" }, { followerId: LOCAL_AUTHOR_ID, followingId: "alex" }];
  const before = JSON.stringify(social);
  await renderHome();
  expect(JSON.stringify(social)).toBe(before);
  expect(onSocialAction).not.toHaveBeenCalled();
  const authors = root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("View ") && String(node.props.accessibilityLabel).includes("fictional demo profile"));
  expect(authors).toHaveLength(2);
  expect(authors[0].props.accessibilityLabel).toContain("Maya R.");
  expect(authors[1].props.accessibilityLabel).toContain("Alex T.");
  expect(text()).toContain("Made a little time to move today.");
  expect(text()).toContain("Training notebook:");
  expect(text()).not.toContain("Trying a new routine this week.");
  expect(text()).not.toContain("Weekend check-in:");
  expect(text()).toContain("Fictional");
  expect(text()).toContain("WORKOUT ACHIEVEMENT");
  await tapStartingWith("Like Maya R.'s post.");
  expect(onSocialAction).toHaveBeenCalledWith({ type: "toggleLike", postId: "sample-maya" });
  await tapStartingWith("View Maya R., fictional demo profile.");
  expect(onOpenAuthor).toHaveBeenCalledWith("maya");
  await tap("Open Feed"); expect(onNavigate).toHaveBeenCalledWith("feed");
  social.follows = [];
  await renderHome();
  expect(text()).toContain("Interest");
  expect(text()).toContain("Made a little time to move today.");
  expect(text()).toContain("Training notebook:");
});

it("preserves Home Following selection across Feed navigation while For You remains discoverable", async () => {
  await tap("Explore the local demo without signing in"); await tap("Following");
  expect(text()).toContain("Your following feed is quiet.");
  await tap("Open Feed"); expect(button("For You").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("Made a little time to move today.");
  await tap("Home"); expect(button("Following").props.accessibilityState.selected).toBe(true);
  await tap("For You"); expect(text()).toContain("Training notebook:");
});

it.each([false, true])("balances Home header slots with back availability %s and shows honest notification information", async (canGoBack) => {
  const onGoBack = jest.fn(); const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await act(async () => { root.render(<HomeHeader canGoBack={canGoBack} onGoBack={onGoBack} />); });
  const slot = (id: string) => root.container.queryAll((node) => node.type === "View" && node.props.testID === id)[0];
  expect(StyleSheet.flatten(slot("home-header-left").props.style)).toEqual(StyleSheet.flatten(slot("home-header-right").props.style));
  expect(StyleSheet.flatten(slot("home-header-left").props.style)).toMatchObject({ width: 48, minHeight: 48, flexShrink: 0 });
  expect(StyleSheet.flatten(slot("home-header").props.style)).toMatchObject({ flexDirection: "row", paddingHorizontal: 16, gap: 8 });
  const title = root.container.queryAll((node) => node.type === "Text" && textOf(node) === "FitSocial")[0];
  expect(StyleSheet.flatten(title.props.style)).toMatchObject({ flex: 1, minWidth: 0, textAlign: "center" });
  expect(title.props.numberOfLines).toBeUndefined();
  const bell = button("Notifications");
  expect(StyleSheet.flatten(bell.props.style({ pressed: false }))).toMatchObject({ minWidth: 48, minHeight: 48 });
  expect(text()).toBe("FitSocial"); // No unread count or fake notification data.
  await act(async () => { bell.props.onFocus(); });
  expect(StyleSheet.flatten(button("Notifications").props.style({ pressed: false })).borderColor).toBe(colors.text);
  await tap("Notifications");
  expect(alert).toHaveBeenCalledWith("Notifications coming soon", "Notifications are unavailable in this local demo. No device permissions are requested.", [{ text: "OK" }]);
  if (canGoBack) { await tap("Back to previous screen"); expect(onGoBack).toHaveBeenCalledTimes(1); }
  else expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Back to previous screen")).toHaveLength(0);
});

it("keeps the Home bell out of other screens and retains its tab navigation", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await tap("Explore the local demo without signing in");
  await tap("Notifications");
  expect(button("Home").props.accessibilityState.selected).toBe(true);
  await tap("Feed");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "button" && node.props.accessibilityLabel === "Notifications")).toHaveLength(0);
  await tap("Home"); expect(button("Notifications")).toBeDefined();
});

it("shows a compact discovery empty state and working Feed route without inventing media", async () => {
  const social = createInitialSocialState(); social.posts = [];
  const navigate = jest.fn(); const send = jest.fn(); const before = JSON.stringify(social);
  await act(async () => { root.render(<PrototypeScreen activeTab="home" workout={initialWorkout}
    onWorkoutAction={jest.fn()} onShareWorkout={jest.fn()} social={social} onSocialAction={send} onOpenAuthor={jest.fn()} onNavigate={navigate} />); });
  expect(text()).toContain("Interest"); expect(text()).toContain("No discovery posts yet.");
  expect(text()).not.toContain("Fictional sample community.");
  expect(root.container.queryAll((node) => node.type === "Video" || (node.type === "Image" && node.props.testID !== "home-battle-rope-image"))).toHaveLength(0);
  await tap("Open Feed"); expect(navigate).toHaveBeenCalledWith("feed");
  expect(send).not.toHaveBeenCalled(); expect(JSON.stringify(social)).toBe(before);
});

it("retains the unused vector source with two separated ropes at responsive widths", async () => {
  await tap("Explore the local demo without signing in");
  await tap("View Progress"); expect(text()).toContain("Recent workouts");
  await act(async () => { root.render(<BattleRopeIllustration />); });
  const byId = (id: string) => root.container.queryAll((node) => node.type === "View" && node.props.testID === id)[0];
  for (const width of [112, 192]) {
    await act(async () => { byId("home-battle-rope").props.onLayout({ nativeEvent: { layout: { width } } }); });
    const upper = byId("battle-rope-upper").queryAll((node) => node.type === "View" && StyleSheet.flatten(node.props.style)?.backgroundColor === colors.accent);
    const lower = byId("battle-rope-lower").queryAll((node) => node.type === "View" && StyleSheet.flatten(node.props.style)?.backgroundColor === colors.accent);
    expect(upper).toHaveLength(32); expect(lower).toHaveLength(32);
    // Corresponding rope samples remain separated rather than crossing like a double helix.
    for (let index = 0; index < upper.length; index++) {
      expect(StyleSheet.flatten(lower[index].props.style).top - StyleSheet.flatten(upper[index].props.style).top).toBeGreaterThan(5);
    }
    const endpoint = (node: TestNode, end: boolean) => {
      if (typeof node === "string") throw new Error("Expected stroke");
      const style = StyleSheet.flatten(node.props.style);
      const angle = parseFloat(style.transform[0].rotate);
      const sign = end ? 1 : -1;
      return [style.left + style.width / 2 + sign * Math.cos(angle) * style.width / 2,
        style.top + style.height / 2 + sign * Math.sin(angle) * style.width / 2];
    };
    for (const [rope, gripId] of [[upper, "battle-rope-near-grip"], [lower, "battle-rope-far-grip"]] as const) {
      const ropeHand = endpoint(rope[rope.length - 1], true);
      const grip = endpoint(byId(gripId), true);
      expect(ropeHand[0]).toBeCloseTo(grip[0]); expect(ropeHand[1]).toBeCloseTo(grip[1]);
    }
    const torso = StyleSheet.flatten(byId("battle-rope-torso").props.style);
    expect(torso.height).toBe(10); // Body volume, rather than a two-point stick torso.
    expect(parseFloat(torso.transform[0].rotate)).toBeGreaterThan(0);
    expect(parseFloat(torso.transform[0].rotate)).toBeLessThan(Math.PI / 2);
    expect(upper.map((node) => StyleSheet.flatten(node.props.style).top)).not.toEqual(lower.map((node) => StyleSheet.flatten(node.props.style).top));
    expect(StyleSheet.flatten(byId("battle-rope-anchor").props.style)).toMatchObject({ left: 2, borderColor: colors.accent });
    const man = byId("battle-rope-man");
    const head = man.queryAll((node) => node.type === "View" && node.props.testID === "battle-rope-head")[0];
    expect(StyleSheet.flatten(head.props.style)).toMatchObject({ left: width - 35, borderColor: colors.accent });
    for (const segment of [...upper, ...lower]) {
      const style = StyleSheet.flatten(segment.props.style);
      expect(style.left).toBeGreaterThanOrEqual(0); expect(style.left + style.width).toBeLessThan(width);
      expect(style.top).toBeGreaterThanOrEqual(0); expect(style.top).toBeLessThan(64);
    }
  }
});


it("uses the local transparent battle-rope asset on Home without the vector or changes to Progress", async () => {
  await tap("Explore the local demo without signing in");
  const images = root.container.queryAll((node) => node.type === "Image" && node.props.testID === "home-battle-rope-image");
  expect(images).toHaveLength(1);
  expect(images[0].props).toMatchObject({ source: require("../../assets/photos/battle-rope-cropped.png"), resizeMode: "contain",
    pointerEvents: "none", accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
  expect(StyleSheet.flatten(images[0].props.style)).toMatchObject({ width: "100%", height: "100%" });
  expect(root.container.queryAll((node) => node.props.testID === "battle-rope-man")).toHaveLength(0);
  const frame = root.container.queryAll((node) => node.type === "View" && node.props.testID === "home-battle-rope")[0];
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ flex: 3, minWidth: 0, aspectRatio: 691 / 345 });
  expect(StyleSheet.flatten(frame.props.style).backgroundColor).toBeUndefined();
  await tap("View Progress"); expect(text()).toContain("Recent workouts");
  expect(root.container.queryAll((node) => node.props.testID === "home-battle-rope-image")).toHaveLength(0);
});


it.each([264, 304, 337, 376, 696])("fits the Home hero image proportionally at inner row width %s", async (innerWidth) => {
  await tap("Explore the local demo without signing in");
  const progress = StyleSheet.flatten(button("View Progress").props.style({ pressed: false }));
  const canvas = root.container.queryAll((node) => node.type === "View" && node.props.testID === "home-battle-rope")[0];
  const image = StyleSheet.flatten(canvas.props.style);
  const row = root.container.queryAll((node) => node.type === "View" && node.children.some((child) => typeof child !== "string" && child.props.testID === "home-battle-rope"))[0];
  const rowStyle = StyleSheet.flatten(row.props.style);
  expect(rowStyle).toMatchObject({ flexDirection: "row", alignItems: "center", gap: 8 });
  expect(progress).toMatchObject({ flex: 2, minWidth: 44, minHeight: 48, justifyContent: "center" });
  expect(image).toMatchObject({ flex: 3, minWidth: 0, aspectRatio: 691 / 345 });
  expect(image.height).toBeUndefined(); expect(image.maxWidth).toBeUndefined();
  expect(image.position).toBeUndefined(); expect(image.transform).toBeUndefined(); expect(image.marginLeft).toBeUndefined();
  const available = innerWidth - rowStyle.gap;
  const buttonWidth = available * progress.flex / (progress.flex + image.flex);
  const imageWidth = available * image.flex / (progress.flex + image.flex);
  const imageHeight = imageWidth / image.aspectRatio;
  expect(buttonWidth).toBeGreaterThanOrEqual(44);
  expect(buttonWidth + rowStyle.gap + imageWidth).toBeCloseTo(innerWidth);
  expect(imageWidth / available).toBeCloseTo(0.6);
  expect(imageHeight).toBeCloseTo(imageWidth * 345 / 691);
  expect(StyleSheet.flatten(canvas.props.style).overflow).not.toBe("hidden");
});


it("places Home social tabs and posts below the Interest heading without changing the workout area", async () => {
  await tap("Explore the local demo without signing in");
  const heading = root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Interest");
  expect(heading).toHaveLength(1);
  expect(heading[0].props.accessibilityRole).toBe("header");
  expect(StyleSheet.flatten(heading[0].props.style)).toMatchObject({ fontFamily: "System", fontSize: 24, fontWeight: "700", lineHeight: 32 });
  expect(heading[0].props.allowFontScaling).not.toBe(false);
  expect(heading[0].props.numberOfLines).toBeUndefined();
  const stack = root.container.queryAll((node) => node.type === "View" && node.children.some((child) => typeof child !== "string" && child.type === "Text" && textOf(child) === "Interest"))[0];
  expect(StyleSheet.flatten(stack.props.style).gap).toBe(12);
  const index = stack.children.findIndex((child) => typeof child !== "string" && child.type === "Text" && textOf(child) === "Interest");
  expect(textOf(stack.children[index + 1])).toBe("For YouFollowing");
  const firstPost = stack.children[index + 2];
  expect(textOf(firstPost)).toContain("Made a little time to move today.");
  expect(textOf(firstPost)).toContain("Fictional");
  expect(text()).not.toContain("Local demo. Changes reset when the app closes.");
  expect(text()).not.toContain("Fictional sample community.");
  await tapStartingWith("Like Maya R.'s post.");
  expect(button("Unlike Maya R.'s post. 2 likes.")).toBeDefined();
});


it("renders the visual Train hub with four muscle cards, empty activity and one settings gear", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  for (const label of ["READY TO TRAIN?", "Make today count.", "Choose your workout", "Your activity", "Recent workouts"]) expect(text()).toContain(label);
  expect(text()).toContain("Your workout history will appear here after your first session.");
  for (const removed of ["My Plans", "Quick Start", "Personal Records", "Back to welcome", "Workout settings", "Not saved or uploaded"]) expect(text()).not.toContain(removed);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Open training settings")).toHaveLength(1);
  const cards = root.container.queryAll((node) => node.props.accessibilityRole === "button" && String(node.props.accessibilityLabel).startsWith("Choose "));
  expect(cards).toHaveLength(4);
  for (const card of cards) expect(StyleSheet.flatten(card.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 Workouts this week")).toHaveLength(1);
  const days = root.container.queryAll((node) => node.type === "View" && /^train-day-\d$/.test(String(node.props.testID)));
  expect(days).toHaveLength(7);
  for (const day of days) expect(StyleSheet.flatten(day.props.style).backgroundColor).toBeUndefined();
  expect(button("Start workout")).toBeDefined(); expect(button("See all muscle groups")).toBeDefined();
  await tap("Open training settings"); expect(text()).toContain("Workout preferences");
  expect(button("Open training settings").props.accessibilityState.expanded).toBe(true);
  await tap("Open training settings"); expect(text()).not.toContain("Workout preferences");
  expect(button("Train, workouts").props.accessibilityState.selected).toBe(true);
});

it("cancels a Train muscle card without starting a session and selects through the existing picker", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  await tap("Choose Chest, Pectorals");
  expect(text()).toContain("Step 2 of 3"); expect(text()).toContain("Chest");
  await tap("Cancel exercise selection"); expect(button("Start workout")).toBeDefined();
  await tap("Choose Chest, Pectorals"); await tap("Equipment option: Barbell"); await tap("Continue to exercises");
  await input("Search exercise names", "Flat Barbell Bench Press");
  await tapStartingWith("Flat Barbell Bench Press,");
  expectElapsed("00:00"); expect(text()).toContain("Flat Barbell Bench Press");
  expect(button("Log set")).toBeDefined(); expect(button("End workout")).toBeDefined();
});

it("continues an active workout from the training hub without resetting timer or entries", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog(); await advance(61_000);
  await tap("Training hub");
  expectElapsed("01:01"); expect(button("Continue workout")).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 Workouts this week")).toHaveLength(1);
  await tap("Continue workout");
  expectElapsed("01:01"); expect(text()).toContain("20.5 kg");
  expect(button("End workout")).toBeDefined();
});

it("shows actual saved weekly totals and read-only workout details in the Train hub", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await tap("End workout"); await tap("Finish workout"); await tap("Save for this session");
  await tap("Training hub");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Workouts this week")).toHaveLength(1);
  const activeDays = root.container.queryAll((node) => node.type === "View" && /^train-day-\d$/.test(String(node.props.testID)) && StyleSheet.flatten(node.props.style).backgroundColor === colors.accent);
  expect(activeDays).toHaveLength(1);
  await tap("View saved workout 1");
  expect(text()).toContain("Saved workout 1"); expect(text()).toContain("20.5 kg"); expect(text()).toContain("8 reps");
  expect(root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("Remove Flat Barbell"))).toHaveLength(0);
  await tap("Back to training hub"); expect(button("View saved workout 1")).toBeDefined();
  await tap("Start workout"); expect(text()).toContain("No exercises logged yet");
});

it("keeps an unsaved review accessible in the hub and blocks Quick Start until resolved", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await tap("End workout"); await tap("Finish workout"); await tap("Training hub");
  expect(button("Review workout")).toBeDefined();
  expect(text()).toContain("Review or save your current workout before starting another.");
  expect(root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("Choose "))).toHaveLength(0);
  expect(text()).toContain("Your workout history will appear here after your first session.");
  await tap("Review workout"); expect(button("Save for this session")).toBeDefined(); expect(text()).toContain("20.5 kg");
});


it("keeps Android workout confirmations visible while viewing saved Train details", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await tap("End workout"); await tap("Finish workout"); await tap("Save for this session");
  await tap("Start new workout"); await tap("Training hub"); await tap("View saved workout 1");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("End workout?"); expect(button("Discard workout")).toBeDefined();
  await tap("Keep logging");
  await tap("Back to training hub"); await tap("Continue workout");
  expect(button("End workout")).toBeDefined(); expect(text()).toContain("No exercises logged yet");
});


it.each([
  ["Biceps", "Front upper arm", "highlight-biceps-left"],
  ["Triceps", "Back upper arm", "highlight-triceps-left"],
  ["Chest", "Pectorals", "highlight-pectorals-left"],
  ["Back", "Back muscles", "highlight-back-trapezius"],
])("uses the %s Train image, retains its anatomical error fallback and preselected picker", async (muscle, anatomy, highlightId) => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  const card = button(`Choose ${muscle}, ${anatomy}`);
  const images = card.queryAll((node) => node.type === "Image");
  expect(images).toHaveLength(1); expect(images[0].props.resizeMode).toBe("contain");
  const frame = card.queryAll((node) => node.type === "View" && node.props.testID === `category-image-frame-${muscle}`)[0];
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ width: "100%", aspectRatio: 5 / 3 });
  await act(async () => { images[0].props.onError(); });
  const artwork = root.container.queryAll((node) => node.type === "View" && node.props.testID === `train-muscle-art-${muscle}`)[0];
  expect(StyleSheet.flatten(artwork.props.style)).toMatchObject({ width: "100%", aspectRatio: 5 / 3 });
  expect(artwork.props).toMatchObject({ pointerEvents: "none", accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
  expect(artwork.queryAll((node) => node.props.testID === highlightId)).toHaveLength(1);
  expect(StyleSheet.flatten(card.props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { card.props.onFocus(); });
  expect(StyleSheet.flatten(button(`Choose ${muscle}, ${anatomy}`).props.style({ pressed: false })).borderColor).toBe(colors.accent);
  await tap(`Choose ${muscle}, ${anatomy}`);
  expect(text()).toContain("Step 2 of 3"); expect(text()).toContain(muscle);
  expect(button("Continue to exercises")).toBeDefined();
  await tap("Cancel exercise selection"); expect(button("Start workout")).toBeDefined();
});

it("opens all ten existing muscle categories from See all and preserves selection workflow", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts"); await tap("See all muscle groups");
  expect(text()).toContain("Step 1 of 3");
  for (const muscle of ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Legs", "Core", "Full Body", "Cardio"]) expect(button("Muscle category: " + muscle)).toBeDefined();
  await tap("Muscle category: Legs"); await tap("Continue to equipment"); expect(text()).toContain("Legs");
  await tap("Cancel exercise selection"); expect(button("Start workout")).toBeDefined();
});

it("starts from empty Train history and opens the existing Progress destination", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  await tap("View training progress"); expect(text()).toContain("Recent workouts");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Make today count.");
  await tap("Start your first workout"); expectElapsed("00:00"); expect(button("Add exercise")).toBeDefined();
});

it("keeps Train text in explicit system sans-serif roles with native font scaling enabled", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  const texts = root.container.queryAll((node) => node.type === "Text" && !!textOf(node));
  for (const node of texts) {
    expect(StyleSheet.flatten(node.props.style).fontFamily).toBe("System");
    expect(node.props.allowFontScaling).not.toBe(false);
  }
  const hero = root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Make today count.")[0];
  expect(StyleSheet.flatten(hero.props.style)).toMatchObject({ fontSize: 22, lineHeight: 28, fontWeight: "700" });
  await tap("Feed"); expect(text()).toContain("Fictional sample community.");
});


it("keeps the approved Train grid, readable captions and all four bundled images when navigating See all", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  for (const [muscle, source] of [
    ["Biceps", require("../../assets/muscles/train/biceps.jpg")], ["Triceps", require("../../assets/muscles/train/triceps.jpg")],
    ["Chest", require("../../assets/muscles/train/chest.jpg")], ["Back", require("../../assets/muscles/train/back.jpg")],
  ] as const) {
    const card = root.container.queryAll((node) => node.props.testID === `train-muscle-card-${muscle}`)[0];
    expect(StyleSheet.flatten(card.props.style({ pressed: false }))).toMatchObject({ flex: 1, padding: 12, borderRadius: 12 });
    const image = card.queryAll((node) => node.type === "Image")[0]; expect(image.props.source).toBe(source);
    expect(card.queryAll((node) => node.props.testID === `category-image-viewport-${muscle}`)).toHaveLength(0);
    expect(StyleSheet.flatten(image.props.style)).toMatchObject({ width: "100%", height: "100%" });
    expect(image.props.resizeMode).toBe("contain");
    expect(card.queryAll((node) => node.type === "Text" && textOf(node) === muscle)).toHaveLength(1);
  }
  await tap("See all muscle groups");
  for (const category of ["Chest", "Triceps", "Back", "Biceps", "Forearms", "Legs", "Cardio", "Shoulders", "Core", "Full Body"]) {
    const card = button("Muscle category: " + category);
    expect(card.queryAll((node) => node.type === "Image")).toHaveLength(1);
  }
  await tap("Cancel exercise selection"); expect(text()).toContain("Make today count.");
});


it("keeps all four Train image frames equal and uses matching 5:3 source crops without side letterboxing", async () => {
  await tap("Explore the local demo without signing in"); await tap("Train, workouts");
  const audit: Record<string, { preparedSize: number[]; cropBox: number[] }> = require("../../assets/muscles/train/preparation.json");
  const frames = ["Biceps", "Triceps", "Chest", "Back"].map((category) => root.container.queryAll((node) => node.type === "View" && node.props.testID === `category-image-frame-${category}`)[0]);
  for (const frame of frames) {
    expect(StyleSheet.flatten(frame.props.style)).toEqual(StyleSheet.flatten(frames[0].props.style));
    const image = frame.queryAll((node) => node.type === "Image")[0];
    expect(image.props.resizeMode).toBe("contain");
    expect(StyleSheet.flatten(image.props.style)).toMatchObject({ width: "100%", height: "100%" });
  }
  for (const record of Object.values(audit)) {
    expect(record.preparedSize).toEqual([800, 480]);
    expect((record.cropBox[2] - record.cropBox[0]) / (record.cropBox[3] - record.cropBox[1])).toBeCloseTo(5 / 3);
  }
  await tap("See all muscle groups");
  const texts = root.container.queryAll((node) => node.type === "Text" && !!textOf(node));
  for (const node of texts) { expect(StyleSheet.flatten(node.props.style).fontFamily).toBe("System"); expect(node.props.allowFontScaling).not.toBe(false); }
  await tap("Muscle category: Back"); await tap("Continue to equipment");
  expect(text()).toContain("Back"); expect(button("Continue to exercises")).toBeDefined();
});


it("renders one compact active session card and places both workout actions above the logged section", async () => {
  await tap("Explore the local demo without signing in"); await tap("Start workout");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "header" && textOf(node) === "Workout")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Open training settings")).toHaveLength(0);
  expect(text()).toContain("SESSION IN PROGRESS"); expect(text()).toContain("Elapsed time"); expectElapsed("00:00");
  expect(text()).toContain("Calories"); expect(text()).toContain("Add weight to estimate");
  expect(text()).toContain("No exercises logged yet"); expect(text()).toContain("Tap Add exercise to begin.");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 logged entries")).toHaveLength(1);
  const card = root.container.queryAll((node) => node.type === "View" && node.props.testID === "active-session-card"); expect(card).toHaveLength(1);
  expect(StyleSheet.flatten(card[0].props.style)).toMatchObject({ padding: 12, borderRadius: 12, gap: 8 });
  const timer = root.container.queryAll((node) => node.props.testID === "active-session-timer")[0];
  expect(StyleSheet.flatten(timer.props.style)).toMatchObject({ fontSize: 30, color: colors.accent, fontVariant: ["tabular-nums"] });
  const add = StyleSheet.flatten(button("Add exercise").props.style({ pressed: false }));
  const end = StyleSheet.flatten(button("End workout").props.style({ pressed: false }));
  expect(add).toMatchObject({ minHeight: 48, backgroundColor: colors.accent }); expect(end).toMatchObject({ minHeight: 48, backgroundColor: colors.elevated });
  expect(text().indexOf("Add exercise")).toBeLessThan(text().indexOf("Logged exercises"));
  expect(text().indexOf("End workout")).toBeLessThan(text().indexOf("Logged exercises"));
  await advance(61000); expectElapsed("01:01");
  await tap("About calorie estimates"); expect(text()).toContain("3.5 MET");
  await tap("End workout"); expect(text()).toContain("End workout?"); expect(button("Finish workout").props.disabled).toBe(true);
  await tap("Keep logging"); expectElapsed("01:01");
});

it("retains Add exercise after selection and shows actual entry counts through log and remove", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  expect(button("Add exercise")).toBeDefined(); expect(button("Change exercise")).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 logged entries")).toHaveLength(1);
  expect(text()).toContain("20.5 kg");
  await tap("Add exercise"); expect(text()).toContain("Choose muscle group");
  await tap("Cancel exercise selection");
  await tap("Remove Flat Barbell Bench Press set 1");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 logged entries")).toHaveLength(1);
  expect(text()).toContain("No exercises logged yet");
  await tap("Training hub"); expect(text()).toContain("Choose your workout");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "header" && textOf(node) === "Train")).toHaveLength(1);
  await tap("Continue workout"); expect(button("Add exercise")).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "header" && textOf(node) === "Workout")).toHaveLength(1);
});


it.each([1, 2])("keeps equal action cells with wrapping support at font scale %s", async (fontScale) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 360, height: 800, scale: 1, fontScale });
  await tap("Explore the local demo without signing in"); await tap("Start workout");
  const actions = root.container.queryAll((node) => node.type === "View" && node.props.testID === "active-workout-actions");
  expect(actions).toHaveLength(1); expect(StyleSheet.flatten(actions[0].props.style)).toMatchObject({ flexDirection: "row", flexWrap: "wrap", gap: 10 });
  const cells = actions[0].children.filter((node) => typeof node !== "string");
  expect(cells).toHaveLength(2);
  for (const cell of cells) {
    if (typeof cell === "string") throw new Error("Expected action cell");
    expect(StyleSheet.flatten(cell.props.style)).toMatchObject({ flexGrow: 1, flexBasis: 136 * fontScale, minWidth: 0, maxWidth: "100%" });
  }
  const endButtons = root.container.queryAll((node) => node.props.accessibilityRole === "button" && node.props.accessibilityLabel === "End workout");
  expect(endButtons).toHaveLength(1);
  for (const label of ["Add exercise", "End workout"]) expect(StyleSheet.flatten(button(label).props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(48);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 Exercises completed")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 Total sets")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 Total reps")).toHaveLength(1);
  await tap("End workout"); expect(button("Finish workout").props.disabled).toBe(true); await tap("Keep logging"); expectElapsed("00:00");
});

it("renders mixed modes and unusually large logged values without mutation or duplicate totals", async () => {
  const sets: LoggedSet[] = [
    { id: 11, exerciseId: "flat-barbell-bench-press", exercise: "Flat Barbell Bench Press", tracking: "external", reps: 1000, weight: 1000 },
    { id: 12, exerciseId: "flat-barbell-bench-press", exercise: "Flat Barbell Bench Press", tracking: "external", reps: 987654321, weight: 123456789.125 },
    { id: 13, exerciseId: "push-up", exercise: "Push-up", tracking: "bodyweight", reps: 20, weight: null },
    { id: 14, exerciseId: "plank", exercise: "Plank", tracking: "duration", reps: 0, weight: null, durationSeconds: 90 },
    { id: 15, exerciseId: "incline-treadmill-walking", exercise: "Incline Treadmill Walking", tracking: "cardio", reps: 0, weight: null, durationSeconds: 120, cardio: { distanceKm: 2.5, speedKmh: 12 }, cardioCategory: "Walking" },
    { id: 16, exerciseId: "assisted-pull-up", exercise: "Assisted Pull-up", tracking: "assisted", reps: 6, weight: 30 },
  ];
  const workout = { ...initialWorkout, status: "active" as const, sets, clock: { wallMs: Date.now() - 60000, monotonicMs: null } };
  const before = JSON.stringify(workout); const send = jest.fn();
  await act(async () => { root.render(<WorkoutLogger workout={workout} onWorkoutAction={send} onShareWorkout={jest.fn()} social={createInitialSocialState()} />); });
  for (const label of ["5 Exercises completed", "6 Total sets", "987655347 Total reps"]) expect(root.container.queryAll((node) => node.props.accessibilityLabel === label)).toHaveLength(1);
  const bench = root.container.queryAll((node) => node.props.testID === "logged-exercise-Flat Barbell Bench Press")[0];
  expect(textOf(bench)).toContain("2 logged sets");
  for (const value of ["1000 reps", "1000 kg", "987654321 reps", "123456789.125 kg", "No additional weight", "90 seconds", "2 min", "2.5 km", "12 km/h", "30 kg assistance"]) expect(text()).toContain(value);
  const timed = root.container.queryAll((node) => node.props.testID === "logged-set-14")[0]; expect(textOf(timed)).not.toContain("reps"); expect(textOf(timed)).not.toContain("kg");
  const remove = button("Remove Flat Barbell Bench Press set 2");
  expect(textOf(remove)).toBe(""); expect(StyleSheet.flatten(remove.props.style({ pressed: false }))).toMatchObject({ minWidth: 48, minHeight: 48 });
  await tap("Remove Flat Barbell Bench Press set 2"); expect(send).toHaveBeenCalledWith({ type: "removeSet", id: 12 }); expect(send).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(workout)).toBe(before);
});

it("removes only the targeted set and updates distinct-exercise totals through real app state", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await input("Repetitions", "12"); await input("Lifted weight", "99"); await tap("Log set");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Exercises completed")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "2 Total sets")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "20 Total reps")).toHaveLength(1);
  await tap("Remove Flat Barbell Bench Press set 1");
  expect(text()).toContain("99 kg"); expect(text()).not.toContain("20.5 kg");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Total sets")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "12 Total reps")).toHaveLength(1);
  await tap("End workout"); await tap("Finish workout"); expect(text()).toContain("Workout complete");
  await tap("Save for this session"); expect(text()).toContain("Saved for this session only");
});


it("adds valid session weight, blocks invalid drafts and updates calories without resetting the timer", async () => {
  await tap("Explore the local demo without signing in"); await tap("Start workout");
  expect(button("Add workout body weight")).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Open training settings")).toHaveLength(0);
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  await tap("Add workout body weight"); expect(text()).toContain("Body weight (kg)");
  for (const invalid of ["", "0", "-1", "NaN", "Infinity", "501", "70.123"]) {
    await input("Body weight", invalid); await tap("Save workout body weight");
    expect(text()).toContain("Enter body weight from 1 to 500 kg");
    expect(button("Save workout body weight")).toBeDefined(); expect(text()).toContain("Add weight to estimate");
  }
  await input("Body weight", "70.25"); await tap("Save workout body weight");
  expect(text()).toContain("Body weight70.25 kg"); expect(text()).not.toContain("Enter body weight");
  await advance(60000); expectElapsed("01:00"); expect(text()).toContain("Estimated: 4 kcal");
  await tap("Edit workout body weight"); await input("Body weight", "140.5");
  expect(text()).toContain("Estimated: 4 kcal");
  await tap("Save workout body weight"); expect(text()).toContain("Estimated: 8 kcal"); expectElapsed("01:00");
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
});

it("cancels new and existing session weight drafts without publishing changes", async () => {
  await tap("Explore the local demo without signing in"); await tap("Start workout");
  await tap("Add workout body weight"); await input("Body weight", "80"); await tap("Cancel workout body weight");
  expect(button("Add workout body weight")).toBeDefined(); expect(text()).toContain("Add weight to estimate");
  await tap("Add workout body weight"); await input("Body weight", "75"); await tap("Save workout body weight");
  await tap("Edit workout body weight"); await input("Body weight", "90"); await tap("Cancel workout body weight");
  expect(text()).toContain("Body weight75 kg"); expect(text()).not.toContain("Body weight90 kg");
  await tap("Edit workout body weight");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "75")).toHaveLength(1);
});

it("retains hub/Profile settings access, keeps profile defaults separate and collapses disclosure on reentry", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Measurements and units");
  await input("Personal body weight", "65"); await tap("Save preferences");
  await tap("Train, workouts"); expect(button("Open training settings")).toBeDefined(); await tap("Start workout");
  expect(text()).toContain("Body weight65 kg");
  await tap("Edit workout body weight"); await input("Body weight", "75"); await tap("Save workout body weight");
  await tap("About calorie estimates"); expect(text()).toContain("3.5 MET");
  await tap("Training hub"); expect(button("Open training settings")).toBeDefined();
  await tap("Continue workout"); expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  expect(text()).toContain("Body weight75 kg");
  await openSettings(); await tap("Measurements and units");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "65")).toHaveLength(1);
});


it("collapses the calorie disclosure for a new workout in the same logger", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  await tap("About calorie estimates"); expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(true);
  await tap("End workout"); await tap("Finish workout"); await tap("Save for this session"); await tap("Start new workout");
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  expect(text()).not.toContain("Actual calories vary; not a medical measurement.");
  expectElapsed("00:00"); expect(button("Add exercise")).toBeDefined();
});


it("keeps compact calorie prerequisites, committed weight and the full disclosure", async () => {
  await tap("Explore the local demo without signing in"); await tap("Start workout");
  const status = () => textOf(root.container.queryAll((node) => node.props.testID === "active-calorie-status")[0]);
  expect(status()).toBe("Add weight to estimate");
  expect(text()).not.toContain("Add body weight for estimates");
  await tap("Add workout body weight"); await input("Body weight", "70"); await tap("Save workout body weight");
  expect(status()).toBe("Available after 1 min"); expectElapsed("00:00");
  await advance(59000); expect(status()).toBe("Available after 1 min");
  await advance(1000); expect(status()).toBe("Estimated: 4 kcal"); expectElapsed("01:00");
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  await tap("About calorie estimates");
  expect(text()).toContain("Estimated using 3.5 MET, body weight and total session time, including rests. May not reflect cardio or mixed sessions. Actual calories vary; not a medical measurement.");
  expect(text()).toContain("Optional body weight and at least one minute of elapsed time are required. Reps and lifted weight are not used.");
  await tap("About calorie estimates"); expect(text()).not.toContain("Actual calories vary; not a medical measurement.");
  expect(button("Edit workout body weight")).toBeDefined();
});

it.each([1, 2, 3])("allows narrow calorie/weight rows and long values to wrap at font scale %s", async (fontScale) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 280, height: 640, scale: 1, fontScale });
  await tap("Explore the local demo without signing in"); await tap("Start workout");
  const metrics = root.container.queryAll((node) => node.props.testID === "active-session-metrics")[0];
  expect(StyleSheet.flatten(metrics.props.style)).toMatchObject({ paddingHorizontal: 4, gap: 12 });
  for (const id of ["active-calories-row", "active-body-weight-row"]) {
    const row = root.container.queryAll((node) => node.props.testID === id)[0];
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexDirection: "row", alignItems: "center" });
    const labels = row.children.filter((node): node is Exclude<TestNode, string> => typeof node !== "string" && !!node.props.style)
      .find((node) => StyleSheet.flatten(node.props.style).flexWrap === "wrap");
    expect(labels).toBeDefined(); expect(StyleSheet.flatten(labels!.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  }
  for (const kind of ["flame", "scale"]) {
    const icon = root.container.queryAll((node) => node.props.testID === `session-${kind}-icon`)[0];
    expect(icon.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
  }
  expect(StyleSheet.flatten(button("Add workout body weight").props.style({ pressed: false })).minHeight).toBe(48);
  await tap("Add workout body weight"); await input("Body weight", "499.99"); await tap("Save workout body weight");
  await advance(60000); expect(text()).toContain("Estimated: 29 kcal"); expect(text()).toContain("499.99 kg");
  const texts = metrics.queryAll((node) => node.type === "Text");
  for (const node of texts) {
    expect(node.props.allowFontScaling).not.toBe(false); expect(node.props.numberOfLines).toBeUndefined();
    const style = StyleSheet.flatten(node.props.style);
    expect(style.fontFamily).toBe("System"); expect(style.height).toBeUndefined(); expect(style.maxHeight).toBeUndefined();
  }
  expect(StyleSheet.flatten(button("Edit workout body weight").props.style({ pressed: false })).minHeight).toBe(48);
  expect(StyleSheet.flatten(button("About calorie estimates").props.style({ pressed: false })).minHeight).toBe(48);
});


it("switches the lifting unit without reinterpreting existing kg sets, including history and Progress", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  expect(text()).toContain("Total weight"); expect(button("Weight unit: kg").props.accessibilityState.selected).toBe(true);
  const field = () => root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Lifted weight"))[0];
  await input("Lifted weight", "20.5"); await input("Repetitions", "8"); await tap("Weight unit: lb");
  expect(field().props.value).toBe("45.19"); expect(field().props.accessibilityLabel).toContain("pounds");
  expect(button("Weight unit: lb").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("45.19 lb"); expect(text()).not.toContain("20.5 lb");
  for (let i = 0; i < 5; i++) { await tap("Weight unit: kg"); expect(field().props.value).toBe("20.5"); await tap("Weight unit: lb"); }
  await tap("Log set"); expect(field().props.value).toBe("");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "2 Total sets")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "16 Total reps")).toHaveLength(1);
  await advance(60000); expectElapsed("01:00"); expect(text()).toContain("Estimated: 4 kcal"); expect(text()).toContain("Body weight70 kg");
  await tap("End workout"); await tap("Finish workout"); await tap("Save for this session");
  expect(text()).toContain("45.19 lb"); await tap("Training hub"); await tap("View saved workout 1");
  expect(text()).toContain("45.19 lb"); expect(text()).not.toContain("20.5 lb");
  await tap("Home"); await tap("View Progress"); await tapStartingWith("View workout 1 recorded activity details.");
  expect(text()).toContain("45.19 lb"); expect(text()).toContain("16 reps");
});

it("edits pounds and renders physically equivalent kg without changing the body-weight editor", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog(); await tap("Weight unit: lb");
  await input("Lifted weight", "45"); await input("Repetitions", "6"); await tap("Weight unit: kg");
  const field = () => root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Lifted weight"))[0];
  expect(field().props.value).toBe("20.41"); await tap("Log set"); expect(text()).toContain("20.41 kg");
  await tap("Weight unit: lb"); expect(text()).toContain("45 lb"); expect(text()).not.toContain("20.41 lb");
  await tap("Edit workout body weight");
  const body = root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Body weight (kg)"))[0];
  expect(body.props.value).toBe("70"); expect(text()).toContain("Body weight (kg)"); await tap("Cancel workout body weight");
});

it("preserves blank/invalid lifting drafts and selected-unit validation in the active form", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog(); await tap("Weight unit: lb");
  await input("Repetitions", "8"); await tap("Log set"); expect(text()).toContain("Enter lifted weight in lb before logging.");
  for (const value of ["NaN", "-1", "1e2", "2204.63", "2.345"]) {
    await input("Lifted weight", value); await tap("Log set"); expect(text()).toContain("Enter 0 to 2,204.62 lb");
    await tap("Weight unit: kg"); expect(button("Weight unit: lb").props.accessibilityState.selected).toBe(true);
    expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 Total sets")).toHaveLength(1);
  }
  await input("Lifted weight", ""); await tap("Weight unit: kg"); expect(button("Weight unit: kg").props.accessibilityState.selected).toBe(true);
  await tap("Weight unit: lb"); await input("Lifted weight", "50"); await tap("Log set"); expect(text()).toContain("50 lb");
});

it.each([1, 2, 3])("keeps the unit toggle touchable and form flexible at font scale %s", async (fontScale) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 280, height: 640, scale: 1, fontScale });
  await tap("Explore the local demo without signing in"); await startAndLog();
  const unit = () => button("Weight unit: lb");
  expect(StyleSheet.flatten(unit().props.style({ pressed: false }))).toMatchObject({ minWidth: 44, borderRadius: 999 });
  expect(StyleSheet.flatten(unit().props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
  await act(async () => { unit().props.onFocus(); }); expect(StyleSheet.flatten(unit().props.style({ pressed: false })).outlineColor).toBe(colors.text);
  await act(async () => { unit().props.onBlur(); });
  expect(StyleSheet.flatten(unit().props.style({ pressed: true })).opacity).toBeLessThan(1);
  await tap("Weight unit: lb");
  const selectedSegment = unit().queryAll((node) => node.props.testID === "weight-unit-segment-lb")[0];
  expect(StyleSheet.flatten(selectedSegment.props.style).backgroundColor).toBe(colors.accent);
  const label = unit().queryAll((node) => node.type === "Text")[0];
  expect(StyleSheet.flatten(label.props.style).color).toBe(colors.background); expect(label.props.allowFontScaling).not.toBe(false);
  const input = root.container.queryAll((node) => node.type === "TextInput" && String(node.props.accessibilityLabel).startsWith("Lifted weight"))[0];
  expect(input.props.keyboardType).toBe("decimal-pad");
  const cells = root.container.queryAll((node) => ["workout-reps-column", "workout-weight-column"].includes(String(node.props.testID)));
  expect(cells).toHaveLength(2);
  for (const cell of cells) expect(StyleSheet.flatten(cell.props.style)).toMatchObject({ minWidth: 0, gap: 8 });
  const fields = cells.map((cell) => cell.queryAll((node) => node.type === "TextInput")[0]);
  expect(StyleSheet.flatten(fields[0].props.style).height).toBe(StyleSheet.flatten(fields[1].props.style).height);
  expect(button("Log set")).toBeDefined();
});


it("uses a compact rounded visual pill inside separate 44-point unit touch targets", async () => {
  await tap("Explore the local demo without signing in"); await startAndLog();
  const track = root.container.queryAll((node) => node.props.testID === "weight-unit-track")[0];
  expect(StyleSheet.flatten(track.props.style)).toMatchObject({ top: 6, bottom: 6, left: 4, right: 4, borderRadius: 999, backgroundColor: colors.elevated });
  expect(track.props).toMatchObject({ pointerEvents: "none", accessible: false, accessibilityElementsHidden: true });
  for (const value of ["kg", "lb"]) {
    const control = button("Weight unit: " + value);
    const touch = StyleSheet.flatten(control.props.style({ pressed: false }));
    expect(touch.minHeight).toBe(44); expect(touch.minWidth).toBe(44); expect(touch.width).toBe(44);
    const segment = control.queryAll((node) => node.props.testID === "weight-unit-segment-" + value)[0];
    const visual = StyleSheet.flatten(segment.props.style);
    expect(visual).toMatchObject({ width: 40, minHeight: 32, borderRadius: 999 });
    expect(visual.height).toBeUndefined(); expect(visual.maxHeight).toBeUndefined();
    const label = control.queryAll((node) => node.type === "Text")[0];
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontSize: 12, lineHeight: 16, fontWeight: "500", fontFamily: "System" });
    expect(label.props.allowFontScaling).not.toBe(false); expect(label.props.numberOfLines).toBeUndefined();
  }
  expect(button("Weight unit: kg").props.accessibilityState.selected).toBe(true);
  expect(StyleSheet.flatten(button("Weight unit: kg").queryAll((node) => node.props.testID === "weight-unit-segment-kg")[0].props.style).backgroundColor).toBe(colors.accent);
});


it.each([
  [248, 1, false, 248], [328, 1, false, 328], [360, 1, true, 174], [379, 1, true, 183.5],
  [360, 2, false, 360], [248, 3, false, 248],
])("measures a %s dp input form at scale %s for equal columns or safe stacking", async (width, scale, columns, expectedWidth) => {
  jest.mocked(useWindowDimensions).mockReturnValue({ width: width + 32, height: 800, scale: 1, fontScale: scale });
  await tap("Explore the local demo without signing in"); await startAndLog();
  const get = (id: string) => root.container.queryAll((node) => node.props.testID === id)[0];
  const measure = async (node: TestNode, width: number, height: number) => {
    if (typeof node === "string") throw new Error("Expected a layout node");
    await act(async () => { node.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height } } }); });
  };
  await measure(get("workout-input-form"), width, 100);
  const reps = get("workout-reps-header").queryAll((node) => node.type === "Text")[0];
  const weight = get("workout-weight-header").queryAll((node) => node.type === "Text" && textOf(node) === "Total weight")[0];
  expect(weight.props.numberOfLines).toBe(1); expect(weight.props.adjustsFontSizeToFit).toBe(true);
  await measure(reps, 84 * scale, 18 * scale); await measure(weight, 72 * scale, 18 * scale);
  const toggle = root.container.queryAll((node) => node.props.accessibilityLabel === "Weight unit")[0];
  await measure(toggle, 88 * scale, 44 * scale);
  expect(StyleSheet.flatten(get("workout-input-form").props.style)).toMatchObject({ flexDirection: columns ? "row" : "column", gap: 12, flexWrap: "nowrap" });
  for (const id of ["workout-reps-column", "workout-weight-column"]) {
    expect(StyleSheet.flatten(get(id).props.style).width).toBe(expectedWidth);
  }
  const inputs = ["workout-reps-column", "workout-weight-column"].map((id) => get(id).queryAll((node) => node.type === "TextInput")[0]);
  expect(StyleSheet.flatten(inputs[0].props.style).height).toBe(StyleSheet.flatten(inputs[1].props.style).height);
  expect(StyleSheet.flatten(inputs[0].props.style).height).toBeGreaterThanOrEqual(48);
  if (columns) expect(StyleSheet.flatten(get("workout-reps-header").props.style).minHeight).toBe(StyleSheet.flatten(get("workout-weight-header").props.style).minHeight);
  const layout = StyleSheet.flatten(get("workout-weight-header").props.style);
  expect(layout.flexDirection).toBe(width >= 72 * scale + 4 + 88 * scale ? "row" : "column");
  await input("Lifted weight", "20.5"); await input("Repetitions", "8"); await tap("Weight unit: lb"); await tap("Log set");
  expect(text()).toContain("45.19 lb");
});


it("renders Resistance Band Pull-Apart at the reported font scale without sibling key collisions", async () => {
  const errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
  const warnings = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.mocked(useWindowDimensions).mockReturnValue({ width: 360, height: 800, scale: 1, fontScale: 0.8999999761581421 });
  await tap("Explore the local demo without signing in"); await tap("Start workout"); await tap("Add exercise");
  await browseExercises("Shoulders"); await input("Search exercise names", "band");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "radio" && node.props.accessibilityLabel === "Resistance Band Pull-Apart, Shoulders, Resistance band")).toHaveLength(1);
  await tap("Clear search");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "radio" && node.props.accessibilityLabel === "Seated Dumbbell Shoulder Press, Shoulders, Dumbbell")).toHaveLength(1);
  await input("Search exercise names", "band pull apart");
  await tapStartingWith("Resistance Band Pull-Apart,");
  expect(text()).toContain("Resistance Band Pull-Apart"); expect(button("Log set")).toBeDefined();
  await input("Repetitions", "8"); await input("Lifted weight", "5"); await tap("Log set");
  expect(button("Remove Resistance Band Pull-Apart set 1")).toBeDefined();
  await tap("Weight unit: lb"); expect(text()).toContain("11.02 lb");
  const logs = [...errors.mock.calls, ...warnings.mock.calls].map((args) => args.join(" ")).join("\n");
  expect(logs).not.toMatch(/same key|unique.*key|duplicate.*key/i);
  errors.mockRestore(); warnings.mockRestore();
});
