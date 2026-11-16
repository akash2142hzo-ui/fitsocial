import { act } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import { RewardsScreen } from "./RewardsScreen";

jest.mock("react-native", () => Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
  Modal: { value: ({ visible, children, ...props }: import("react-native").ModalProps) => visible ? jest.requireActual<typeof import("react")>("react").createElement("Modal", props, children) : null, enumerable: true },
  SafeAreaView: { value: "SafeAreaView", enumerable: true },
  ScrollView: { value: "ScrollView", enumerable: true },
  Pressable: { value: "Pressable", enumerable: true },
  Text: { value: "Text", enumerable: true },
  View: { value: "View", enumerable: true },
  useWindowDimensions: { value: jest.fn(() => ({ width: 360, height: 800, scale: 1, fontScale: 1 })), enumerable: true },
}));

let root: Root;
function textOf(node: TestNode): string { return typeof node === "string" ? node : node.children.map(textOf).join(""); }
const text = () => textOf(root.container);
function grid(id: string) {
  const nodes = root.container.queryAll((node) => node.type === "View" && node.props.testID === id);
  expect(nodes).toHaveLength(1);
  return nodes[0];
}
async function render(width = 360, fontScale = 1) {
  jest.mocked(useWindowDimensions).mockReturnValue({ width, height: 800, scale: 1, fontScale });
  await act(async () => { root.render(<RewardsScreen />); });
}
beforeEach(() => { root = createRoot(); });
afterEach(async () => { await act(async () => { root.unmount(); }); });

it("highlights the sample FitPoints balance with one small demo indicator and no membership tiers", async () => {
  await render();
  expect(text()).toContain("Your FitPoints"); expect(text()).toContain("1,250 FP");
  expect(root.container.queryAll((node) => node.type === "View" && node.props.accessibilityLabel === "Sample balance, 1,250 FitPoints")).toHaveLength(1);
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Demo")).toHaveLength(1);
  for (const removed of ["Membership progress", "Starter", "Silver", "FitSocial Rewards"]) expect(text()).not.toContain(removed);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "progressbar")).toHaveLength(0);
});

it("renders both reward previews with their FitPoints requirements and unavailable status", async () => {
  await render();
  for (const label of ["Profile Badge, 500 FP, Coming soon", "Exclusive Profile Frame, 1,000 FP, Coming soon"]) {
    const cards = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
    expect(cards).toHaveLength(1); expect(cards[0].props.accessible).toBe(true);
    expect(cards[0].props.accessibilityRole).toBe("button");
    expect(typeof cards[0].props.onPress).toBe("function");
  }
  expect(text()).not.toContain("Training Theme");
  expect(grid("reward-preview-grid").children).toHaveLength(2);
});

it("renders two local product illustrations without prices, stock or checkout controls", async () => {
  await render();
  expect(text()).toContain("FitSocial Shop");
  for (const name of ["FitSocial Gym T-shirt", "FitSocial Shaker Bottle"]) {
    expect(root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === `${name}, illustrative product, Coming soon`)).toHaveLength(1);
  }
  expect(grid("shop-preview-grid").children).toHaveLength(2);
  expect(text()).not.toMatch(/[₹$€£]|in stock|sold out/i);
  expect(root.container.queryAll((node) => node.type === "Image" || node.props.source?.uri)).toHaveLength(0);
});

it("keeps earning, redemption, checkout and purchases explicitly unavailable without inert buttons", async () => {
  await render();
  expect(text()).toContain("FitPoints, rewards and products are examples. Earning, redemption, checkout and purchases are unavailable.");
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "button").map((node) => node.props.accessibilityLabel)).toEqual(["About FitPoints", "Profile Badge, 500 FP, Coming soon", "Exclusive Profile Frame, 1,000 FP, Coming soon", "FitSocial Gym T-shirt, illustrative product, Coming soon", "FitSocial Shaker Bottle, illustrative product, Coming soon"]);
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "Coming soon")).toHaveLength(4);
  const decorations = root.container.queryAll((node) => node.type === "View" && node.props.pointerEvents === "none");
  expect(decorations).toHaveLength(4);
  for (const decoration of decorations) expect(decoration.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" });
});

it.each([320, 360, 412, 768])("keeps two-column previews at normal text size in a %s dp window", async (width) => {
  await render(width);
  for (const id of ["reward-preview-grid", "shop-preview-grid"]) expect(StyleSheet.flatten(grid(id).props.style).flexDirection).toBe("row");
});

it.each([1.5, 2])("stacks cards for font scale %s without truncating readable content", async (fontScale) => {
  await render(360, fontScale);
  for (const id of ["reward-preview-grid", "shop-preview-grid"]) expect(StyleSheet.flatten(grid(id).props.style).flexDirection).toBe("column");
  for (const node of root.container.queryAll((node) => node.type === "Text")) {
    expect(node.props.allowFontScaling).not.toBe(false);
    expect(node.props.numberOfLines).toBeUndefined();
  }
});

it("responds to measured narrow content width rather than assuming a full-width window", async () => {
  await render(768);
  const page = root.container.queryAll((node) => node.type === "View" && typeof node.props.onLayout === "function")[0];
  await act(async () => { page.props.onLayout({ nativeEvent: { layout: { width: 250 } } }); });
  expect(StyleSheet.flatten(grid("shop-preview-grid").props.style).flexDirection).toBe("column");
  await act(async () => { page.props.onLayout({ nativeEvent: { layout: { width: 720 } } }); });
  expect(StyleSheet.flatten(grid("shop-preview-grid").props.style).flexDirection).toBe("row");
});

function infoButton(label: string) {
  const nodes = root.container.queryAll((node) => node.type === "Pressable" && node.props.accessibilityLabel === label);
  expect(nodes).toHaveLength(1); return nodes[0];
}
async function openInfo() { await act(async () => { infoButton("About FitPoints").props.onPress(); }); }

it("opens earning information with four planned activities, explicit disclaimer and no earning actions", async () => {
  await render();
  expect(text()).not.toContain("How to earn FitPoints");
  const info = infoButton("About FitPoints");
  const visual = StyleSheet.flatten(info.props.style({ pressed: false }));
  expect(visual.width).toBeGreaterThanOrEqual(44);
  expect(visual.height).toBeGreaterThanOrEqual(44);
  await openInfo();
  expect(infoButton("About FitPoints").props.accessibilityState.expanded).toBe(true);
  for (const copy of ["How to earn FitPoints", "Complete eligible workouts.", "Track daily fitness progress.", "Complete weekly challenges.",
    "Share daily or weekly fitness progress to other social media platforms. Sharing verification is not available.",
    "FitPoints earning is coming soon. Current balances and rewards are examples."]) expect(text()).toContain(copy);
  expect(root.container.queryAll((node) => node.type === "Pressable").map((node) => node.props.accessibilityLabel))
    .toEqual(["About FitPoints", "Profile Badge, 500 FP, Coming soon", "Exclusive Profile Frame, 1,000 FP, Coming soon", "FitSocial Gym T-shirt, illustrative product, Coming soon", "FitSocial Shaker Bottle, illustrative product, Coming soon", "Close FitPoints information"]);
  expect(text()).toContain("1,250 FP");
});

it.each(["close", "Android Back", "accessibility escape"])("dismisses information with %s without awarding points or leaving the screen", async (method) => {
  await render(); await openInfo();
  await act(async () => {
    if (method === "close") infoButton("Close FitPoints information").props.onPress();
    else if (method === "Android Back") root.container.queryAll((node) => node.type === "Modal")[0].props.onRequestClose();
    else root.container.queryAll((node) => node.type === "View" && node.props.accessibilityViewIsModal)[0].props.onAccessibilityEscape();
  });
  expect(text()).not.toContain("How to earn FitPoints");
  expect(infoButton("About FitPoints").props.accessibilityState.expanded).toBe(false);
  expect(text()).toContain("1,250 FP"); expect(text()).toContain("Exclusive Profile Frame");
  expect(text()).toContain("FitSocial Gym T-shirt"); expect(text()).toContain("FitSocial Shaker Bottle");
  await openInfo(); expect(text()).toContain("How to earn FitPoints");
});

it("keeps a 44 dp target around a minimal 36 dp dark-square info icon beside the balance", async () => {
  await render();
  const button = infoButton("About FitPoints");
  expect(StyleSheet.flatten(button.props.style({ pressed: false }))).toMatchObject({ width: 44, height: 44, borderColor: "transparent" });
  const visual = root.container.queryAll((node) => node.type === "View" && node.props.testID === "fitpoints-info-visual");
  expect(visual).toHaveLength(1);
  expect(StyleSheet.flatten(visual[0].props.style)).toMatchObject({ width: 36, height: 36, borderRadius: 10 });
  expect(StyleSheet.flatten(visual[0].props.style).borderWidth).toBeUndefined();
  expect(textOf(visual[0])).toBe("\u2139");
  expect(text()).not.toContain("\u24d8");
  const balanceRows = root.container.queryAll((node) => node.type === "View" && node.children.some((child) => typeof child !== "string" && child.props.testID === "fitpoints-info-button"));
  expect(balanceRows).toHaveLength(1);
  expect(balanceRows[0].children.some((child) => typeof child !== "string" && child.props.accessibilityLabel === "Sample balance, 1,250 FitPoints")).toBe(true);
  expect(root.container.queryAll((node) => node.type === "Text" && textOf(node) === "F")).toHaveLength(0);
  expect(text()).toContain("Gear up. Stand out."); expect(text()).not.toContain("Training essentials");
});

const previews = [
  ["Profile Badge, 500 FP, Coming soon", "Sample requirement: 500 FP", "A distinctive badge concept", true],
  ["Exclusive Profile Frame, 1,000 FP, Coming soon", "Sample requirement: 1,000 FP", "A lime-accented frame concept", true],
  ["FitSocial Gym T-shirt, illustrative product, Coming soon", "FitSocial Gym T-shirt", "A minimal FitSocial training tee concept", false],
  ["FitSocial Shaker Bottle, illustrative product, Coming soon", "FitSocial Shaker Bottle", "A FitSocial shaker concept", false],
] as const;

it.each(previews)("opens %s with demo details and press/focus feedback", async (label, requirement, description, reward) => {
  await render();
  const card = infoButton(label);
  const restingBorder = StyleSheet.flatten(card.props.style({ pressed: false })).borderColor;
  expect(StyleSheet.flatten(card.props.style({ pressed: true })).opacity).toBeLessThan(1);
  await act(async () => { card.props.onFocus(); });
  expect(StyleSheet.flatten(infoButton(label).props.style({ pressed: false })).borderColor).not.toBe(restingBorder);
  await act(async () => { infoButton(label).props.onPress(); });
  const modal = root.container.queryAll((node) => node.type === "Modal")[0];
  expect(modal.props.animationType).toBe("none");
  expect(textOf(modal)).toContain(requirement); expect(textOf(modal)).toContain(description);
  expect(textOf(modal)).toContain("Coming soon");
  expect(textOf(modal)).toContain(reward ? "Redemption is unavailable." : "Checkout and purchases are unavailable.");
  expect(modal.queryAll((node) => node.type === "Pressable").map((node) => node.props.accessibilityLabel)).toEqual(["Close preview"]);
});

it.each(previews)("closes %s by Close and Android Back without processing points or purchases", async (label) => {
  await render();
  for (const method of ["close", "back", "escape"]) {
    await act(async () => { infoButton(label).props.onPress(); });
    await act(async () => {
      if (method === "close") infoButton("Close preview").props.onPress();
      else if (method === "back") root.container.queryAll((node) => node.type === "Modal")[0].props.onRequestClose();
      else root.container.queryAll((node) => node.type === "View" && node.props.accessibilityViewIsModal)[0].props.onAccessibilityEscape();
    });
    expect(root.container.queryAll((node) => node.type === "Modal")).toHaveLength(0);
    expect(text()).toContain("1,250 FP"); expect(text()).toContain("FitSocial Shop");
    expect(text()).not.toMatch(/[₹$€£]|order confirmed|redeemed|payment complete/i);
  }
});
