import { act, ReactElement } from "react";
import { Platform, StyleSheet } from "react-native";
import { createRoot, Root } from "test-renderer";
import { Banner, Button, FilterPill, IconButton, TextButton } from "./ui";
import { colors } from "../theme/colors";
import { fontFamily, radii, type, ui } from "../theme/design";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  Pressable: { value: "Pressable", enumerable: true },
  Text: { value: "Text", enumerable: true },
  View: { value: "View", enumerable: true },
}));

let root: Root;
beforeEach(() => { root = createRoot(); });
afterEach(async () => { await act(async () => { root.unmount(); }); });
async function render(element: ReactElement) { await act(async () => { root.render(element); }); }
function control() {
  const controls = root.container.queryAll((node) => node.props.accessibilityRole === "button");
  expect(controls).toHaveLength(1);
  return controls[0];
}
function labelStyle(label: string) {
  const text = root.container.queryAll((node) => node.type === "Text" && node.children.includes(label))[0];
  expect(text.props.allowFontScaling).not.toBe(false);
  expect(text.props.numberOfLines).toBeUndefined();
  return StyleSheet.flatten(text.props.style);
}

it.each([false, true])("keeps primary/secondary actions accessible, scalable and focusable (secondary=%s)", async (secondary) => {
  const onPress = jest.fn();
  const label = "A long action label that must wrap without clipping";
  await render(<Button label={label} secondary={secondary} onPress={onPress} />);
  expect(control().props.accessibilityLabel).toBe(label);
  const style = StyleSheet.flatten(control().props.style({ pressed: false }));
  expect(style.minHeight).toBeGreaterThanOrEqual(48);
  expect(style.minWidth).toBeGreaterThanOrEqual(44);
  expect(style.height).toBeUndefined();
  expect(style.backgroundColor).toBe(secondary ? colors.elevated : colors.accent);
  expect(labelStyle(label)).toMatchObject({ fontFamily, fontSize: 14, color: secondary ? colors.text : colors.background });
  await act(async () => { control().props.onFocus(); });
  expect(StyleSheet.flatten(control().props.style({ pressed: false })).borderColor).toBe(colors.text);
  expect(StyleSheet.flatten(control().props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { control().props.onPress(); }); expect(onPress).toHaveBeenCalledTimes(1);
  await render(<Button label={label} secondary={secondary} disabled onPress={onPress} />);
  expect(control().props.disabled).toBe(true);
  expect(control().props.accessibilityState.disabled).toBe(true);
  expect(StyleSheet.flatten(control().props.style({ pressed: false })).opacity).toBeLessThan(1);
});

it("announces filter selection with a visible check and keeps decorations out of the control tree", async () => {
  const onPress = jest.fn();
  await render(<FilterPill label="Following" selected={false} onPress={onPress} />);
  expect(control().props.accessibilityState.selected).toBe(false);
  expect(StyleSheet.flatten(control().props.style({ pressed: false })).borderRadius).toBe(radii.pill);
  expect(labelStyle("Following").color).toBe(colors.text);
  await act(async () => { control().props.onPress(); }); expect(onPress).toHaveBeenCalledTimes(1);
  await render(<FilterPill label="Following" selected onPress={onPress} />);
  expect(control().props.accessibilityState.selected).toBe(true);
  expect(control().props.accessibilityLabel).toBe("Following");
  expect(StyleSheet.flatten(control().props.style({ pressed: false })).backgroundColor).toBe(colors.accent);
  expect(labelStyle("Following").color).toBe(colors.background);
  const checks = root.container.queryAll((node) => node.props.importantForAccessibility === "no-hide-descendants");
  expect(checks).toHaveLength(1);
  expect(checks[0].props.accessible).toBe(false);
  expect(checks[0].props.accessibilityElementsHidden).toBe(true);
  expect(checks[0].children).toHaveLength(1);
});

it("preserves disclosure state and label on ghost actions with a decorative chevron", async () => {
  const onPress = jest.fn();
  await render(<TextButton label="View workout details" accessibilityLabel="View recorded activity details" expanded onPress={onPress} />);
  expect(control().props.accessibilityLabel).toBe("View recorded activity details");
  expect(control().props.accessibilityState.expanded).toBe(true);
  expect(labelStyle("View workout details").color).toBe(colors.accent);
  await act(async () => { control().props.onPress(); }); expect(onPress).toHaveBeenCalledTimes(1);
  expect(root.container.queryAll((node) => node.props.accessibilityElementsHidden)).toHaveLength(1);
});

it("exposes selected and disabled states on icon buttons without adding icon controls", async () => {
  await render(<IconButton label="Open Settings" icon={null} selected disabled onPress={jest.fn()} />);
  expect(control().props.accessibilityLabel).toBe("Open Settings");
  expect(control().props.disabled).toBe(true);
  expect(control().props.accessibilityState).toMatchObject({ selected: true, disabled: true });
  expect(StyleSheet.flatten(control().props.style({ pressed: false }))).toMatchObject({ minWidth: 48, minHeight: 48, borderColor: colors.accent });
  expect(root.container.queryAll((node) => node.props.accessibilityElementsHidden)).toHaveLength(1);
});

it("keeps an active workout banner one accessible action with a wrapping status label", async () => {
  const onPress = jest.fn();
  const label = "Workout active · Return to Train";
  await render(<Banner label={label} icon={null} onPress={onPress} />);
  expect(control().props.accessibilityLabel).toBe(label);
  expect(labelStyle(label).flexShrink).toBe(1);
  expect(StyleSheet.flatten(control().props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(44);
  await act(async () => { control().props.onFocus(); });
  expect(StyleSheet.flatten(control().props.style({ pressed: false })).borderColor).toBe(colors.text);
  await act(async () => { control().props.onPress(); }); expect(onPress).toHaveBeenCalledTimes(1);
  expect(root.container.queryAll((node) => node.props.accessibilityElementsHidden)).toHaveLength(2);
});

it("uses platform sans-serif typography for text roles and editable input", () => {
  expect(fontFamily).toBe(Platform.OS === "ios" ? "System" : "sans-serif");
  for (const role of Object.values(type)) expect(StyleSheet.flatten(role)?.fontFamily).toBe(fontFamily);
  expect(StyleSheet.flatten(ui.input)?.fontFamily).toBe(fontFamily);
});

it("keeps essential text color pairs above 4.5:1 contrast", () => {
  function luminance(hex: string) {
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  for (const [text, background] of [[colors.text, colors.elevated], [colors.secondaryText, colors.elevated],
    [colors.background, colors.accent], [colors.accent, colors.accentSurface], [colors.error, colors.surface]]) {
    const values = [luminance(text), luminance(background)].sort((a, b) => b - a);
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
