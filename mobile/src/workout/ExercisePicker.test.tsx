import { act } from "react";
import { createRoot, Root, TestNode } from "test-renderer";
import { ExercisePicker } from "./ExercisePicker";
import { Platform, StyleSheet } from "react-native";
import { equipmentForCategory, equipmentLabel, pickerCategories } from "./exercisePickerModel";
import { colors } from "../theme/colors";
import { categoryImageFor } from "../theme/categoryImages";
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
it("keeps bundled image categories ordered, decorative and provisional until selection", async () => {
  const labels = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Legs", "Core", "Full Body", "Cardio"];
  const categories = root.container.queryAll((node) => node.props.accessibilityRole === "button" && String(node.props.accessibilityLabel).startsWith("Muscle category: "));
  expect(categories.map((node) => node.props.accessibilityLabel)).toEqual(labels.map((label) => "Muscle category: " + label));
  const photos = root.container.queryAll((node) => node.type === "Image");
  expect(photos).toHaveLength(10);
  for (const category of categories) {
    const art = category.queryAll((node) => node.props.pointerEvents === "none");
    expect(art).toHaveLength(1);
    expect(art[0].props.accessible).toBe(false);
    expect(art[0].props.accessibilityElementsHidden).toBe(true);
    expect(art[0].props.importantForAccessibility).toBe("no-hide-descendants");
    expect(art[0].props.accessibilityRole).toBeUndefined();
  }
  expect(button("Continue to equipment").props.disabled).toBe(true);
  for (const label of labels) {
    await tap("Muscle category: " + label);
    expect(text()).toContain("Step 1 of 3");
    expect(select).not.toHaveBeenCalled();
    const control = button("Muscle category: " + label);
    expect(control.props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(control.props.style({ pressed: false })).borderColor).toBe(colors.accent);
    expect(StyleSheet.flatten(control.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(48);
    expect(button("Continue to equipment").props.disabled).toBe(false);
  }
  await tap("Continue to equipment");
  expect(text()).toContain("Step 2 of 3"); expect(select).not.toHaveBeenCalled();
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

 it("maps every category to a distinct muscle-specific fallback without generic gym artwork", async () => {
  const images = root.container.queryAll((node) => node.type === "Image");
  expect(images).toHaveLength(10);
  await act(async () => { for (const image of images) image.props.onError(); });
  expect(root.container.queryAll((node) => node.type === "Image")).toHaveLength(0);
  const expected: Record<string, string> = {
    Chest: "Pectorals", Back: "Back muscles", Shoulders: "Deltoids",
    Biceps: "Front upper arm", Triceps: "Back upper arm", Forearms: "Forearm muscles",
    Legs: "Leg muscles", Core: "Abdominals", "Full Body": "Whole body", Cardio: "Cardio activity",
  };
  for (const [category, label] of Object.entries(expected)) {
    const control = button("Muscle category: " + category);
    expect(textOf(control)).toContain(label);
    const tile = control.queryAll((node) => node.props.pointerEvents === "none")[0];
    expect(StyleSheet.flatten(tile.props.style)).toMatchObject({ width: 72, minHeight: 72 });
  }
 });


const expectedImages = [
  ["Chest", require("../../assets/muscles/chest.jpg")],
  ["Triceps", require("../../assets/muscles/triceps.jpg")],
  ["Back", require("../../assets/muscles/back.jpg")],
  ["Biceps", require("../../assets/muscles/biceps.jpg")],
  ["Forearms", require("../../assets/muscles/forearms.jpg")],
  ["Legs", require("../../assets/muscles/legs.jpg")],
  ["Cardio", require("../../assets/muscles/cardio.jpg")],
  ["Shoulders", require("../../assets/muscles/shoulders.jpg")],
  ["Core", require("../../assets/muscles/abs.jpg")],
  ["Full Body", require("../../assets/muscles/full_body.jpg")],
] as const;
it.each(expectedImages)("bundles the exact %s image and preserves category/equipment navigation", async (category, source) => {
  const control = button("Muscle category: " + category);
  const images = control.queryAll((node) => node.type === "Image");
  expect(images).toHaveLength(1);
  expect(images[0].props.source).toBe(source); expect(images[0].props.resizeMode).toBe("contain");
  expect(images[0].props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
  const frame = control.queryAll((node) => node.type === "View" && node.props.testID === `category-image-frame-${category}`)[0];
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ width: "100%", aspectRatio: 1, borderRadius: 12 });
  expect(textOf(control).split(category)).toHaveLength(2); // One native category caption.
  await tap("Muscle category: " + category); expect(control.props.accessibilityLabel).toBe("Muscle category: " + category);
  expect(button("Muscle category: " + category).props.accessibilityState.selected).toBe(true);
  await tap("Continue to equipment"); expect(text()).toContain(category);
  await tap("Equipment option: All equipment"); await tap("Continue to exercises");
  expect(text()).toContain("Step 3 of 3"); expect(root.container.queryAll((node) => node.props.accessibilityRole === "radio").length).toBeGreaterThan(0);
  expect(select).not.toHaveBeenCalled();
});


it("uses equal flexible cards with bold labels and a visible selected check", async () => {
  await tap("Muscle category: Full Body");
  const control = button("Muscle category: Full Body");
  const card = StyleSheet.flatten(control.props.style({ pressed: false }));
  expect(card).toMatchObject({ flex: 1, minWidth: 0, padding: 8, gap: 4, borderRadius: 12, borderColor: colors.accent });
  expect(card.height).toBeUndefined();
  const frame = control.queryAll((node) => node.type === "View" && node.props.testID === "category-image-frame-Full Body")[0];
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ width: "100%", aspectRatio: 1, flexShrink: 0 });
  const directImages = frame.children.filter((node) => typeof node !== "string" && node.type === "Image");
  expect(directImages).toHaveLength(1);
  expect(typeof directImages[0] === "string" ? null : StyleSheet.flatten(directImages[0].props.style)).toMatchObject({ width: "100%", height: "100%" });
  const label = control.queryAll((node) => node.type === "Text" && textOf(node) === "Full Body")[0];
  expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontSize: 16, fontWeight: "700" });
  expect(label.props.allowFontScaling).not.toBe(false);
  expect(control.queryAll((node) => node.props.testID === "category-selected-Full Body")).toHaveLength(1);
  await tap("Muscle category: Chest");
  expect(button("Muscle category: Full Body").props.accessibilityState.selected).toBe(false);
  expect(button("Muscle category: Chest").props.accessibilityState.selected).toBe(true);
  expect(button("Muscle category: Chest").queryAll((node) => node.props.testID === "category-selected-Chest")).toHaveLength(1);
});

it("matches prepared image metadata to the checked JPEG crop audit for all ten categories", () => {
  const audit: Record<string, { preparedSize: number[] }> = require("../../assets/muscles/preparation.json");
  const expected = {
    Chest: ["chest", 753, 768], Back: ["back", 726, 768], Shoulders: ["shoulders", 768, 720],
    Biceps: ["biceps", 710, 768], Triceps: ["triceps", 683, 768], Forearms: ["forearms", 556, 768],
    Legs: ["legs", 581, 768], Cardio: ["cardio", 585, 768], Core: ["abs", 750, 768], "Full Body": ["full_body", 442, 768],
  } as const;
  for (const [category, [filename, width, height]] of Object.entries(expected)) {
    expect(categoryImageFor(category)).toMatchObject({ width, height });
    expect(audit[filename].preparedSize).toEqual([width, height]);
    expect(Math.max(width, height)).toBeLessThanOrEqual(768);
  }
});


it.each(expectedImages)("fits the complete %s artwork inside a responsive centered square grid frame", (category) => {
  const control = button("Muscle category: " + category);
  const frame = control.queryAll((node) => node.type === "View" && node.props.testID === `category-image-frame-${category}`)[0];
  const style = StyleSheet.flatten(frame.props.style);
  expect(style).toMatchObject({ width: "100%", aspectRatio: 1, flexShrink: 0,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderRadius: 12 });
  const image = frame.queryAll((node) => node.type === "Image")[0];
  expect(image.props.resizeMode).toBe("contain");
  const imageStyle = StyleSheet.flatten(image.props.style);
  expect(imageStyle).toMatchObject({ width: "100%", height: "100%" });
  expect(imageStyle.transform).toBeUndefined(); expect(imageStyle.marginLeft).toBeUndefined();
  const asset = categoryImageFor(category)!;
  const scale = Math.min(104 / asset.width, 104 / asset.height);
  expect(asset.width * scale).toBeLessThanOrEqual(104);
  expect(asset.height * scale).toBeLessThanOrEqual(104);
  expect((asset.width * scale) / (asset.height * scale)).toBeCloseTo(asset.width / asset.height);
});

it("keeps five two-card rows in order and one persistent Continue outside the grid scroll view", async () => {
  const order = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Legs", "Core", "Full Body", "Cardio"];
  const rows = root.container.queryAll((node) => node.type === "View" && /^muscle-grid-row-/.test(String(node.props.testID)));
  expect(rows).toHaveLength(5);
  for (const [index, row] of rows.entries()) {
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexDirection: "row", gap: 8 });
    const cards = row.queryAll((node) => node.props.accessibilityRole === "button");
    expect(cards.map((node) => node.props.accessibilityLabel)).toEqual(order.slice(index * 2, index * 2 + 2).map((name) => "Muscle category: " + name));
  }
  const scroll = root.container.queryAll((node) => node.type === "ScrollView")[0];
  expect(scroll.queryAll((node) => node.props.testID === "muscle-grid-row-4")).toHaveLength(1);
  expect(scroll.queryAll((node) => node.props.accessibilityLabel === "Continue to equipment")).toHaveLength(0);
  expect(StyleSheet.flatten(scroll.props.style).flex).toBe(1);
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({ padding: 16, paddingBottom: 16 });
  const footer = root.container.queryAll((node) => node.props.testID === "muscle-grid-actions")[0];
  expect(StyleSheet.flatten(footer.props.style).position).toBeUndefined();
  expect(footer.queryAll((node) => node.props.accessibilityLabel === "Continue to equipment")).toHaveLength(1);
  expect(button("Continue to equipment").props.disabled).toBe(true);
  await tap("Muscle category: Cardio"); expect(button("Continue to equipment").props.disabled).toBe(false);
  await tap("Continue to equipment"); expect(text()).toContain("Step 2 of 3");
  expect(root.container.queryAll((node) => node.props.testID === "muscle-grid-actions")).toHaveLength(0);
  expect(button("Continue to exercises")).toBeDefined();
});

it.each([288, 328, 400, 720])("divides an available %s-point grid width equally without screen assumptions", (available) => {
  const width = (available - 8) / 2;
  expect(width * 2 + 8).toBe(available);
  const row = root.container.queryAll((node) => node.props.testID === "muscle-grid-row-0")[0];
  const cards = row.queryAll((node) => node.props.accessibilityRole === "button");
  expect(StyleSheet.flatten(cards[0].props.style({ pressed: false }))).toEqual(StyleSheet.flatten(cards[1].props.style({ pressed: false })));
  expect(width).toBeGreaterThanOrEqual(48);
});


it("keeps Step 2 compact with category context, navigation and three progress segments", async () => {
  await tap("Muscle category: Chest"); await tap("Continue to equipment");
  expect(text()).toContain("Step 2 of 3 \u00b7 Chest");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "header" && textOf(node) === "Choose equipment")).toHaveLength(1);
  expect(text()).not.toContain("Available equipment");
  expect(button("Back to categories")).toBeDefined(); expect(button("Cancel exercise selection")).toBeDefined();
  const progress = root.container.queryAll((node) => node.type === "View" && node.props.accessibilityElementsHidden === true
    && node.children.length === 3)[0];
  expect(progress).toBeDefined();
  const segments = progress.children.filter((node) => typeof node !== "string");
  expect(segments.map((node) => typeof node === "string" ? null : StyleSheet.flatten(node.props.style).backgroundColor))
    .toEqual([colors.accent, colors.accent, colors.border]);
  const chips = root.container.queryAll((node) => node.props.testID === "equipment-options")[0];
  expect(StyleSheet.flatten(chips.props.style)).toMatchObject({ flexDirection: "row", flexWrap: "wrap", gap: 8 });
  expect(StyleSheet.flatten(chips.props.style).width).toBeUndefined();
});

it("retains consistent equipment pill sizing, selected check and focus/pressed feedback", async () => {
  await tap("Muscle category: Chest"); await tap("Continue to equipment");
  const option = () => button("Equipment option: Dumbbells");
  const idle = StyleSheet.flatten(option().props.style({ pressed: false }));
  expect(idle).toMatchObject({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.elevated, borderColor: colors.border, maxWidth: "100%" });
  expect(idle.height).toBeUndefined(); expect(idle.width).toBeUndefined(); expect(idle.flexBasis).toBeUndefined();
  expect(StyleSheet.flatten(option().props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { option().props.onFocus(); });
  expect(StyleSheet.flatten(option().props.style({ pressed: false })).borderColor).toBe(colors.text);
  await act(async () => { option().props.onBlur(); });
  expect(StyleSheet.flatten(option().props.style({ pressed: false })).borderColor).toBe(colors.border);
  await tap("Equipment option: Dumbbells");
  expect(StyleSheet.flatten(option().props.style({ pressed: false })).backgroundColor).toBe(colors.accent);
  const label = option().queryAll((node) => node.type === "Text" && textOf(node) === "Dumbbells")[0];
  expect(StyleSheet.flatten(label.props.style)).toMatchObject({ fontSize: 14, fontFamily: "System", color: colors.background, flexShrink: 1 });
  expect(label.props.allowFontScaling).not.toBe(false); expect(label.props.numberOfLines).toBeUndefined();
  expect(option().queryAll((node) => node.type === "Text" && textOf(node) === "\u2713")).toHaveLength(1);
  expect(button("Equipment option: All equipment").props.accessibilityState.selected).toBe(false);
});

it.each(pickerCategories)("preserves all %s equipment options, single selection and enabled Continue", async (category) => {
  await tap("Muscle category: " + category); await tap("Continue to equipment");
  const expected = ["All", ...equipmentForCategory(category)] as const;
  const options = () => root.container.queryAll((node) => node.props.accessibilityRole === "button" && String(node.props.accessibilityLabel).startsWith("Equipment option: "));
  expect(options().map((node) => node.props.accessibilityLabel)).toEqual(expected.map((value) => "Equipment option: " + equipmentLabel(value)));
  expect(button("Equipment option: All equipment").props.accessibilityState.selected).toBe(true);
  expect(button("Continue to exercises").props.disabled).toBe(false);
  for (const value of expected) {
    await tap("Equipment option: " + equipmentLabel(value));
    const selected = options().filter((node) => node.props.accessibilityState.selected);
    expect(selected).toHaveLength(1); expect(selected[0].props.accessibilityLabel).toBe("Equipment option: " + equipmentLabel(value));
    expect(button("Continue to exercises").props.disabled).toBe(false); expect(select).not.toHaveBeenCalled();
  }
  await tap("Continue to exercises"); expect(text()).toContain("Step 3 of 3");
  expect(button("Change equipment: " + equipmentLabel(expected[expected.length - 1]))).toBeDefined();
  expect(root.container.queryAll((node) => node.props.testID === "equipment-actions")).toHaveLength(0);
});

it("places one equipment Continue outside scrolling chips in the existing safe-area boundary", async () => {
  await tap("Muscle category: Full Body"); await tap("Continue to equipment");
  const scroll = root.container.queryAll((node) => node.type === "ScrollView")[0];
  expect(StyleSheet.flatten(scroll.props.style).flex).toBe(1);
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({ padding: 16, paddingBottom: 16 });
  expect(scroll.queryAll((node) => node.props.testID === "equipment-options")).toHaveLength(1);
  expect(scroll.queryAll((node) => node.props.accessibilityLabel === "Continue to exercises")).toHaveLength(0);
  const footer = root.container.queryAll((node) => node.props.testID === "equipment-actions")[0];
  expect(StyleSheet.flatten(footer.props.style)).toMatchObject({ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === "android" ? 48 : 8 });
  expect(StyleSheet.flatten(footer.props.style).position).toBeUndefined();
  expect(footer.queryAll((node) => node.props.accessibilityLabel === "Continue to exercises")).toHaveLength(1);
  expect(StyleSheet.flatten(button("Continue to exercises").props.style({ pressed: false })).minHeight).toBe(48);
  const safe = root.container.queryAll((node) => node.type === "SafeAreaView")[0];
  expect(safe.queryAll((node) => node.props.testID === "equipment-actions")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
});

it("preserves Step 2 Back and Cancel without sending a workout selection", async () => {
  await tap("Muscle category: Legs"); await tap("Continue to equipment"); await tap("Equipment option: Barbell");
  await tap("Back to categories"); expect(text()).toContain("Step 1 of 3");
  expect(button("Muscle category: Legs").props.accessibilityState.selected).toBe(true);
  await tap("Continue to equipment"); expect(button("Equipment option: Barbell").props.accessibilityState.selected).toBe(true);
  await tap("Cancel exercise selection"); expect(select).not.toHaveBeenCalled();
  expect(root.container.queryAll((node) => node.type === "Modal")).toHaveLength(0);
});


it("keeps all six Chest/Machine results on textual fallback with unchanged card selection", async () => {
  await exercises("Chest", "Machines");
  const names = ["Machine Chest Press", "Pec Deck Fly", "Incline Machine Chest Press", "Decline Machine Chest Press", "Converging Machine Chest Press", "Single-Arm Machine Chest Press"];
  const rows = root.container.queryAll((node) => node.props.accessibilityRole === "radio");
  expect(rows.map((node) => node.props.accessibilityLabel)).toEqual(names.map((name) => `${name}, Chest, Machine`));
  for (const row of rows) {
    expect(row.queryAll((node) => node.type === "Image")).toHaveLength(0);
    expect(textOf(row)).toContain("Chest / Machine");
    expect(StyleSheet.flatten(row.props.style({ pressed: false }))).toMatchObject({ minHeight: 48, padding: 12, gap: 4 });
    expect(row.props.accessibilityHint).toBe("Select exercise and return to workout logging");
  }
  await tap("Single-Arm Machine Chest Press, Chest, Machine");
  expect(select).toHaveBeenCalledTimes(1); expect(select).toHaveBeenCalledWith("Single-Arm Machine Chest Press");
  expect(root.container.queryAll((node) => node.type === "Modal")).toHaveLength(0);
});
