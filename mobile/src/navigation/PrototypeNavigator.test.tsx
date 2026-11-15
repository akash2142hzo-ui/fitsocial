import { act, ComponentProps } from "react";
import { Keyboard } from "react-native";
import { createRoot, Root } from "test-renderer";

import { createInitialSocialState, socialReducer } from "../social/socialState";
import { initialWorkout } from "../workout/workoutState";
import { PrototypeNavigator } from "./PrototypeNavigator";
import { destinations } from "./navigationState";

// Simulate a recycled native view retaining its offset across React remounts.
let mockScrollY = 0;
const mockScrollTo = jest.fn(({ y }: { y: number }) => { mockScrollY = y; });
jest.mock("react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const ScrollView = React.forwardRef(function MockScrollView(props: { children?: import("react").ReactNode }, ref) {
    React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return React.createElement("ScrollView", props, props.children);
  });
  return Object.defineProperties({}, {
    ...Object.getOwnPropertyDescriptors(jest.requireActual("react-native")),
    ScrollView: { value: ScrollView, enumerable: true },
    SafeAreaView: { value: "SafeAreaView", enumerable: true },
  });
});
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("../screens/PrototypeScreens", () => ({ PrototypeScreen: () => null }));

type Props = ComponentProps<typeof PrototypeNavigator>;
let root: Root;
let props: Props;
async function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  await act(async () => { root.render(<PrototypeNavigator {...props} />); });
}
async function nextFrame() {
  await act(async () => { jest.advanceTimersToNextFrame(); });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockScrollTo.mockClear();
  mockScrollY = 0;
  root = createRoot();
  props = {
    activeTab: "home", selectedTab: "home", canGoBack: false,
    onGoBack: jest.fn(), onOpenAuthor: jest.fn(), onSelectTab: jest.fn(), onExit: jest.fn(),
    workout: initialWorkout, onWorkoutAction: jest.fn(), onShareWorkout: jest.fn(),
    social: createInitialSocialState(), onSocialAction: jest.fn(),
  };
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  jest.useRealTimers();
});

it.each(destinations)("opens $label at the top despite a retained native offset", async ({ id }) => {
  await render({ activeTab: id === "home" ? "feed" : "home" });
  await nextFrame();
  mockScrollTo.mockClear();
  mockScrollY = 120;
  await render({ activeTab: id, authorId: id === "author" ? "maya" : undefined });
  await nextFrame();
  expect(mockScrollY).toBe(0);
  expect(mockScrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });
});

it("resets when opening a different author without changing tabs", async () => {
  await render({ activeTab: "author", authorId: "maya" });
  await nextFrame();
  mockScrollTo.mockClear();
  mockScrollY = 240;
  await render({ authorId: "leo" });
  await nextFrame();
  expect(mockScrollY).toBe(0);
  expect(mockScrollTo).toHaveBeenCalledTimes(1);
});

it("preserves the current scroll position during data edits and keyboard resizing", async () => {
  const keyboardListeners = new Map<string, () => void>();
  const listener = jest.spyOn(Keyboard, "addListener").mockImplementation((event, callback) => {
    keyboardListeners.set(event, callback as () => void);
    return { remove: jest.fn() };
  });
  try {
    await render({ activeTab: "profile" });
    await nextFrame();
    mockScrollTo.mockClear();
    mockScrollY = 120;
    await render({ social: { ...props.social, localBio: "Edited local bio" } });
    await act(async () => { keyboardListeners.get("keyboardDidShow")?.(); });
    await nextFrame();
    await act(async () => { keyboardListeners.get("keyboardDidHide")?.(); });
    await nextFrame();
    expect(mockScrollY).toBe(120);
    expect(mockScrollTo).not.toHaveBeenCalled();
  } finally {
    listener.mockRestore();
  }
});

it("cancels pending resets on rapid navigation and unmount", async () => {
  await render();
  await render({ activeTab: "profile" });
  mockScrollTo.mockClear();
  await nextFrame();
  expect(mockScrollTo).toHaveBeenCalledTimes(1);
  await render({ activeTab: "feed" });
  await act(async () => { root.unmount(); });
  mockScrollTo.mockClear();
  await nextFrame();
  expect(mockScrollTo).not.toHaveBeenCalled();
});


it("dismisses the keyboard and resets when saving or resuming a draft, without resets while typing", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss");
  try {
    let social = socialReducer(createInitialSocialState(), { type: "openComposer" });
    await render({ activeTab: "create", selectedTab: "create", social });
    await nextFrame();
    mockScrollTo.mockClear(); dismiss.mockClear(); mockScrollY = 220;
    social = socialReducer(social, { type: "editPost", text: "Keep the cursor visible" });
    await render({ social });
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    social = socialReducer(social, { type: "saveDraft" });
    await render({ social });
    expect(mockScrollY).toBe(0);
    expect(dismiss).toHaveBeenCalled();
    mockScrollTo.mockClear(); dismiss.mockClear(); mockScrollY = 220;
    social = socialReducer(social, { type: "resumeDraft", id: social.drafts[0].id });
    await render({ social });
    expect(mockScrollY).toBe(0);
    expect(dismiss).toHaveBeenCalled();
  } finally {
    dismiss.mockRestore();
  }
});
