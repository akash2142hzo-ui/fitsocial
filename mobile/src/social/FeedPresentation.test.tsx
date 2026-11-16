import { FeedNavigationTabs } from "./FeedControls";
import { act } from "react";
import { StyleSheet, Text } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import { FeedScreen } from "./SocialScreens";
import { createInitialSocialState } from "./socialState";
import { FEED_AD_PLACEMENT, isSponsoredPosition, SponsoredContent } from "./SponsoredContent";
import { colors } from "../theme/colors";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true },
  TextInput: { value: "TextInput", enumerable: true }, Pressable: { value: "Pressable", enumerable: true },
  Modal: { value: ({ visible, children }: import("react-native").ModalProps) => visible ? children : null, enumerable: true },
}));
let root: Root;
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
beforeEach(() => { root = createRoot(); });
afterEach(async () => { await act(async () => { root.unmount(); }); });
const send = jest.fn(); const create = jest.fn(); const trainers = jest.fn(); const groups = jest.fn();
async function feed(filter: "all" | "following" | "local" = "all") {
  await act(async () => { root.render(<><FeedNavigationTabs onForYou={() => send({ type: "setFilter", filter: "all" })} onTrainers={trainers} onGroups={groups} /><FeedScreen social={{ ...createInitialSocialState(), filter }} onSocialAction={send} onCreatePost={create} onOpenGroups={groups} onOpenTrainers={trainers} onOpenAuthor={jest.fn()} /></>); });
}
function button(label: string) {
  const nodes = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
  expect(nodes).toHaveLength(1); return nodes[0];
}
beforeEach(() => jest.clearAllMocks());

it("shows only For You, Trainers and Groups navigation even when the shared filter is Following", async () => {
  await feed("following");
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  for (const label of ["For You", "Trainers", "Groups"]) {
    const tab = button(label);
    const style = StyleSheet.flatten(tab.props.style({ pressed: false }));
    expect(style.minHeight).toBeGreaterThanOrEqual(44); expect(style.backgroundColor).toBeUndefined();
    const labelNode = tab.queryAll((node) => node.type === "Text")[0];
    expect(StyleSheet.flatten(labelNode.props.style).color).toBe(label === "For You" ? colors.accent : colors.muted);
  }
  expect(root.container.queryAll((node) => node.type === "Pressable" && ["Following", "My Posts"].includes(node.props.accessibilityLabel))).toHaveLength(0);
  await act(async () => { button("For You").props.onPress(); });
  expect(send).toHaveBeenCalledWith({ type: "setFilter", filter: "all" });
});

it("offers two working compact composer targets, search and discovery links", async () => {
  await feed();
  expect(textOf(root.container)).toContain("Share your progress...");
  for (const label of ["Create Post", "Create Post shortcut"]) {
    expect(StyleSheet.flatten(button(label).props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
    await act(async () => { button(label).props.onPress(); });
  }
  expect(create).toHaveBeenCalledTimes(2);
  const plus = button("Create Post shortcut");
  expect(StyleSheet.flatten(plus.props.style({ pressed: false }))).toMatchObject({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" });
  const glyph = plus.queryAll((node) => node.type === "Text")[0];
  expect(textOf(glyph)).toBe("+");
  expect(StyleSheet.flatten(glyph.props.style)).toMatchObject({ fontSize: 30, lineHeight: 36, color: colors.accent });
  await act(async () => { button("Trainers").props.onPress(); button("Groups").props.onPress(); });
  expect(trainers).toHaveBeenCalledTimes(1); expect(groups).toHaveBeenCalledTimes(1);
  expect(root.container.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
  await act(async () => { button("Search Feed").props.onPress(); });
  const search = root.container.queryAll((node) => node.type === "TextInput" && node.props.accessibilityLabel === "Search feed posts")[0];
  expect(StyleSheet.flatten(search.props.style).minHeight).toBe(44);
  await act(async () => { search.props.onChangeText("mobility"); });
  expect(send).toHaveBeenCalledWith({ type: "searchFeed", query: "mobility" });
  expect(textOf(root.container)).toContain("Fictional sample community.");
});

it("has compact shared organic cards with preserved local actions and disclosure", async () => {
  await feed();
  const cards = root.container.queryAll((node) => node.type === "View" && node.props.testID === "social-post-card");
  expect(cards).toHaveLength(createInitialSocialState().posts.length);
  const card = cards[0]; expect(StyleSheet.flatten(card.props.style).borderWidth).toBe(1);
  expect(textOf(card)).toContain("Fictional"); expect(textOf(card)).toContain("WORKOUT ACHIEVEMENT");
  const actions = card.queryAll((node) => node.type === "Pressable" && /^(Like|Show|Preview sharing)/.test(String(node.props.accessibilityLabel)));
  expect(actions).toHaveLength(3);
  for (const action of actions) expect(StyleSheet.flatten(action.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
});

it("keeps ad placements disabled and never calls a future renderer by default", async () => {
  expect(FEED_AD_PLACEMENT.enabled).toBe(false);
  for (let index = 0; index < 20; index++) expect(isSponsoredPosition(index, 20)).toBe(false);
  const renderNativeAd = jest.fn(() => <Text>TEST ONLY</Text>);
  await act(async () => { root.render(<SponsoredContent renderNativeAd={renderNativeAd} />); });
  expect(renderNativeAd).not.toHaveBeenCalled(); expect(textOf(root.container)).toBe("");
  await act(async () => { root.render(<SponsoredContent enabled />); }); expect(textOf(root.container)).toBe("");
  await feed(); expect(root.container.queryAll((node) => node.props.testID === "sponsored-content")).toHaveLength(0);
});

it("plans only a between-post position, with no slot after the final or before the first post", () => {
  const config = { enabled: true, afterPostCount: 3 };
  expect(isSponsoredPosition(2, 4, config)).toBe(true);
  expect(isSponsoredPosition(2, 3, config)).toBe(false);
  expect(isSponsoredPosition(0, 4, { enabled: true, afterPostCount: 0 })).toBe(false);
  expect(isSponsoredPosition(1, 4, { enabled: true, afterPostCount: 1.5 })).toBe(false);
});

it("labels explicitly supplied test-only sponsored content separately from organic actions", async () => {
  await act(async () => { root.render(<SponsoredContent enabled renderNativeAd={() => <Text>TEST ONLY: SDK content boundary</Text>} />); });
  expect(textOf(root.container)).toContain("Sponsored");
  expect(root.container.queryAll((node) => node.type === "Pressable")).toHaveLength(0);
});
