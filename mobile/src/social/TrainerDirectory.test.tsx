import { act } from "react";
import { Keyboard, StyleSheet } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import { TrainerDiscovery } from "./TrainerDirectory";
import { createInitialSocialState, socialReducer, SocialAction, SocialState } from "./socialState";
import { coachingModes, specializations, TRAINER_DISCLOSURE } from "./trainerState";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  View: { value: "View", enumerable: true }, Text: { value: "Text", enumerable: true },
  TextInput: { value: "TextInput", enumerable: true }, Pressable: { value: "Pressable", enumerable: true },
  ScrollView: { value: "ScrollView", enumerable: true },
}));
let root: Root;
let current: SocialState;
const open = jest.fn();
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
const text = () => textOf(root.container);
function dispatch(action: SocialAction) { current = socialReducer(current, action); draw(); }
function draw() { root.render(<TrainerDiscovery social={current} onSocialAction={dispatch} onOpenAuthor={open} />); }
async function render() { await act(async () => { draw(); }); }
function button(label: string) {
  const nodes = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
  expect(nodes).toHaveLength(1); return nodes[0];
}
async function tap(label: string) { await act(async () => { button(label).props.onPress(); }); }
function search() { return root.container.queryAll((node) => node.type === "TextInput")[0]; }
async function query(value: string) { await act(async () => { search().props.onChangeText(value); }); }
beforeEach(() => { root = createRoot(); current = createInitialSocialState(); open.mockClear(); });
afterEach(async () => { await act(async () => { root.unmount(); }); jest.restoreAllMocks(); });

it("displays concise safety copy, fictional status and all original filter options in horizontal rows", async () => {
  await render();
  expect(text()).toContain("Find your kind of fitness guidance"); expect(text()).toContain(TRAINER_DISCLOSURE);
  expect(text()).toContain("Sample · Unverified · Self-declared");
  const rows = root.container.queryAll((node) => node.type === "ScrollView");
  expect(rows).toHaveLength(2);
  for (const row of rows) expect(row.props).toMatchObject({ horizontal: true, keyboardShouldPersistTaps: "handled" });
  for (const value of ["All", ...specializations]) expect(button(`Trainer specialization filter: ${value}`)).toBeDefined();
  for (const value of ["All", ...coachingModes]) expect(button(`Trainer coaching filter: ${value}`)).toBeDefined();
  for (const node of root.container.queryAll((node) => node.type === "Pressable")) expect(StyleSheet.flatten(node.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
});

it("searches names, usernames and specialties; clearing preserves other filters and dismisses keyboard", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss");
  await render(); expect(search().props.placeholder).toBe("Search trainers or specialties");
  expect(StyleSheet.flatten(search().props.style).minHeight).toBe(44);
  await query("maya_moves"); expect(text()).toContain("1 trainers"); expect(text()).not.toContain("Alex T.");
  await tap("Trainer specialization filter: Mobility"); await tap("Clear trainer search");
  expect(current.trainers.query).toBe(""); expect(current.trainers.specialization).toBe("Mobility");
  expect(dismiss).toHaveBeenCalled();
  await query("mobility"); expect(text()).toContain("Maya R.");
  await act(async () => { search().props.onSubmitEditing(); }); expect(dismiss).toHaveBeenCalled();
});

it.each(["All", ...coachingModes])("preserves %s coaching-mode semantics", async (mode) => {
  await render(); await tap(`Trainer coaching filter: ${mode}`);
  expect(current.trainers.coachingMode).toBe(mode);
  expect(button(`Trainer coaching filter: ${mode}`).props.accessibilityState.selected).toBe(true);
  const expected = mode === "All" || mode === "Online" ? 2 : mode === "Not specified" ? 0 : 1;
  expect(text()).toContain(`${expected} trainers`);
});

it("combines query, specialization and mode and resets every filter from a useful empty state", async () => {
  await render(); await query("maya"); await tap("Trainer specialization filter: Mobility"); await tap("Trainer coaching filter: Online");
  expect(text()).toContain("1 trainers");
  await tap("Trainer coaching filter: In person"); expect(text()).toContain("No matching trainers.");
  await tap("Reset trainer filters");
  expect(current.trainers).toMatchObject({ query: "", specialization: "All", coachingMode: "All" });
  expect(text()).toContain("2 trainers");
});

it.each(specializations)("retains working specialization %s", async (value) => {
  await render(); await tap(`Trainer specialization filter: ${value}`);
  expect(current.trainers.specialization).toBe(value);
  expect(button(`Trainer specialization filter: ${value}`).props.accessibilityState.selected).toBe(true);
});

it("uses the whole card as the existing profile action with press/focus feedback and truthful metadata", async () => {
  await render(); const card = button("View trainer profile: Maya R.");
  expect(textOf(card)).toContain("@maya_moves_demo"); expect(textOf(card)).toContain("Mobility");
  expect(textOf(card)).toContain("Online"); expect(textOf(card)).toContain("View Profile");
  expect(card.props.accessibilityHint).toContain("Self-declared and unverified");
  const resting = StyleSheet.flatten(card.props.style({ pressed: false })).borderColor;
  expect(StyleSheet.flatten(card.props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { card.props.onFocus(); });
  expect(StyleSheet.flatten(button("View trainer profile: Maya R.").props.style({ pressed: false })).borderColor).not.toBe(resting);
  await tap("View trainer profile: Maya R."); expect(open).toHaveBeenCalledWith("maya");
  expect(text()).not.toMatch(/rating|reviews|clients|₹|book now|verified trainer/i);
});

it("allows long names and scaled text to wrap without fixed card heights or truncation", async () => {
  const name = "A fictional trainer with a deliberately long display name";
  current.trainers.profiles.maya = { ...current.trainers.profiles.maya, displayName: name };
  await render(); const card = button(`View trainer profile: ${name}`);
  expect(StyleSheet.flatten(card.props.style({ pressed: false })).height).toBeUndefined();
  for (const node of card.queryAll((node) => node.type === "Text")) {
    expect(node.props.numberOfLines).toBeUndefined(); expect(node.props.allowFontScaling).not.toBe(false);
  }
});
