import { act } from "react";
import { createRoot, Root, TestNode } from "test-renderer";
import { ExercisePicker } from "./ExercisePicker";
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
    SafeAreaView: { value: "SafeAreaView", enumerable: true },
    KeyboardAvoidingView: { value: "KeyboardAvoidingView", enumerable: true },
    Pressable: { value: "Pressable", enumerable: true },
    ScrollView: { value: ScrollView, enumerable: true }, TextInput: { value: TextInput, enumerable: true },
    Modal: { value: (props: { visible: boolean; children: import("react").ReactNode }) => props.visible ? React.createElement("Modal", props, props.children) : null, enumerable: true },
  });
});
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));


let root: Root;
let select: jest.Mock;
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
const text = () => textOf(root.container);
function button(label: string) {
  const matches = root.container.queryAll((node) => ["button", "radio"].includes(String(node.props.accessibilityRole)) && (node.props.accessibilityLabel === label || textOf(node) === label));
  expect(matches).toHaveLength(1); return matches[0];
}
async function tap(label: string) { await act(async () => { button(label).props.onPress(); }); }
async function search(value: string) {
  const input = root.container.queryAll((node) => node.type === "TextInput")[0];
  await act(async () => { input.props.onChangeText(value); });
}
async function hardwareBack() {
  const modal = root.container.queryAll((node) => node.type === "Modal")[0];
  await act(async () => { modal.props.onRequestClose(); });
}
async function exercises(category = "Chest", equipment = "All equipment") {
  await tap("Muscle category: " + category); await tap("Continue to equipment");
  await tap("Equipment option: " + equipment); await tap("Continue to exercises");
}
beforeEach(async () => {
  root = createRoot(); select = jest.fn();
  await act(async () => { root.render(<ExercisePicker selected={null} onSelect={select} />); });
  await tap("Add exercise");
});
afterEach(async () => { await act(async () => { root.unmount(); }); });
it("starts with ten accessible categories and an inactive Continue until selected", async () => {
  expect(text()).toContain("Step 1 of 3");
  expect(button("Continue to equipment").props.disabled).toBe(true);
  for (const value of ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Legs", "Core", "Full Body", "Cardio"]) expect(button("Muscle category: " + value)).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Muscle category: Arms")).toHaveLength(0);
  await tap("Muscle category: Biceps");
  expect(button("Muscle category: Biceps").props.accessibilityState.selected).toBe(true);
  expect(button("Continue to equipment").props.disabled).toBe(false);
});
it("shows relevant equipment, matching results and empty search recovery", async () => {
  await exercises("Chest", "Dumbbells");
  expect(text()).toContain("Step 3 of 3");
  await search("incline DB");
  expect(button("Incline Dumbbell Bench Press, Chest, Dumbbell")).toBeDefined();
  expect(text()).not.toContain("Flat Barbell Bench Press");
  await search("no matching record");
  expect(text()).toContain("No matching exercises.");
  await tap("Clear search");
  expect(text()).not.toContain("No matching exercises.");
  await tap("Change equipment: Dumbbells");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Equipment option: Pool")).toHaveLength(0);
  expect(button("Equipment option: Dumbbells").props.accessibilityState.selected).toBe(true);
});
it("hardware Back preserves choices and search then cancels at the first step", async () => {
  await exercises("Chest", "Barbell"); await search("incline");
  await hardwareBack(); expect(text()).toContain("Step 2 of 3");
  expect(button("Equipment option: Barbell").props.accessibilityState.selected).toBe(true);
  await hardwareBack(); expect(text()).toContain("Step 1 of 3");
  expect(button("Muscle category: Chest").props.accessibilityState.selected).toBe(true);
  await tap("Continue to equipment"); await tap("Continue to exercises");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "incline")).toHaveLength(1);
  await hardwareBack(); await hardwareBack(); await hardwareBack();
  expect(text()).not.toContain("Step 1 of 3"); expect(select).not.toHaveBeenCalled();
});
it("resets unavailable equipment when changing category and supports cardio selection", async () => {
  await exercises("Chest", "Barbell");
  await tap("Change category: Chest"); await tap("Muscle category: Cardio"); await tap("Continue to equipment");
  expect(button("Equipment option: All equipment").props.accessibilityState.selected).toBe(true);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Equipment option: Barbell")).toHaveLength(0);
  await tap("Equipment option: Treadmill"); await tap("Continue to exercises"); await search("Incline Treadmill Walking");
  await tap("Incline Treadmill Walking, Cardio, Treadmill");
  expect(select).toHaveBeenCalledWith("Incline Treadmill Walking");
  expect(root.container.queryAll((node) => node.type === "Modal")).toHaveLength(0);
});
it("cancels without sending a selection and preserves original checked state on Change", async () => {
  await tap("Cancel exercise selection"); expect(select).not.toHaveBeenCalled();
  await act(async () => { root.render(<ExercisePicker selected="Push-up" onSelect={select} />); });
  await tap("Change exercise"); await exercises("Chest", "Bodyweight"); await search("Push-up");
  expect(button("Push-up, Chest, Bodyweight").props.accessibilityState.checked).toBe(true);
  await tap("Back to equipment"); await tap("Cancel exercise selection"); expect(select).not.toHaveBeenCalled();
});
it("reopens from the current exercise after cancelling different filters", async () => {
  await tap("Cancel exercise selection");
  await act(async () => { root.render(<ExercisePicker selected="Push-up" onSelect={select} />); });
  await tap("Change exercise"); await exercises("Cardio", "Treadmill");
  await search("running"); await tap("Cancel exercise selection");
  await tap("Change exercise");
  expect(button("Muscle category: Chest").props.accessibilityState.selected).toBe(true);
  await tap("Continue to equipment");
  expect(button("Equipment option: Bodyweight").props.accessibilityState.selected).toBe(true);
  await tap("Continue to exercises");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "")).toHaveLength(1);
  expect(select).not.toHaveBeenCalled();
});
it("starts Add exercise fresh after cancelling and keeps navigation outside the scrolling results", async () => {
  await exercises("Back", "Barbell"); await tap("Show more exercises");
  const scroll = root.container.queryAll((node) => node.type === "ScrollView")[0];
  expect(scroll.queryAll((node) => node.props.accessibilityLabel === "Cancel exercise selection")).toHaveLength(0);
  await tap("Cancel exercise selection"); await tap("Add exercise");
  expect(button("Continue to equipment").props.disabled).toBe(true);
  expect(select).not.toHaveBeenCalled();
});
it("responds to accessibility escape without selecting an exercise", async () => {
  await exercises("Legs");
  const page = root.container.queryAll((node) => typeof node.props.onAccessibilityEscape === "function")[0];
  await act(async () => { page.props.onAccessibilityEscape(); });
  expect(root.container.queryAll((node) => node.type === "Modal")).toHaveLength(0);
  expect(select).not.toHaveBeenCalled();
});

it("recovers empty results by clearing equipment and search within the chosen category", async () => {
  await exercises("Chest", "Dumbbells"); await search("no matching record");
  await tap("Show all Chest exercises");
  expect(text()).not.toContain("No matching exercises.");
  expect(button("Change category: Chest")).toBeDefined();
  expect(button("Change equipment: All equipment")).toBeDefined();
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "")).toHaveLength(1);
  expect(select).not.toHaveBeenCalled();
});

it("retains compatible equipment when changing category", async () => {
  await exercises("Chest", "Dumbbells");
  await tap("Change category: Chest"); await tap("Muscle category: Biceps");
  await tap("Continue to equipment");
  expect(button("Equipment option: Dumbbells").props.accessibilityState.selected).toBe(true);
  await tap("Continue to exercises"); await search("incline");
  expect(button("Incline Dumbbell Curl, Biceps, Dumbbell")).toBeDefined();
});

it("exposes every result through pagination without duplicate exercise controls", async () => {
  await exercises("Legs");
  while (root.container.queryAll((node) => node.props.accessibilityLabel === "Show more exercises").length) {
    await tap("Show more exercises");
  }
  const rows = root.container.queryAll((node) => node.props.accessibilityRole === "radio");
  expect(rows.length).toBeGreaterThan(8);
  expect(new Set(rows.map((node) => node.props.accessibilityLabel)).size).toBe(rows.length);
  expect(text()).toContain(`showing ${rows.length}`);
  for (const row of rows) expect(row.props.accessibilityHint).toBe("Select exercise and return to workout logging");
  expect(select).not.toHaveBeenCalled();
});

it.each([
  ["Biceps", "Dumbbells", "incline", "Incline Dumbbell Curl, Biceps, Dumbbell"],
  ["Triceps", "Cables", "rope pushdown", "Rope Triceps Pushdown, Triceps, Cable"],
  ["Forearms", "Barbell", "reverse", "Barbell Reverse Curl, Biceps, Barbell"],
])("selects a %s exercise with equipment and search and returns to logging", async (category, equipment, query, label) => {
  await exercises(category, equipment); await search(query);
  expect(button(label)).toBeDefined();
  if (category === "Forearms") expect(text()).toContain("Also targets Forearms");
  await hardwareBack(); expect(button("Equipment option: " + equipment).props.accessibilityState.selected).toBe(true);
  await tap("Continue to exercises");
  await tap(label); expect(select).toHaveBeenCalledTimes(1);
  expect(select).toHaveBeenCalledWith(label.split(",")[0]);
  expect(root.container.queryAll((node) => node.type === "Modal")).toHaveLength(0);
});
