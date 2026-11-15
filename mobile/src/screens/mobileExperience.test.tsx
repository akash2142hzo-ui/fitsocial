import { act } from "react";
import { BackHandler, StyleSheet } from "react-native";
import { createRoot, Root, TestNode } from "test-renderer";
import App from "../../App";
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
    SafeAreaView: { value: "SafeAreaView", enumerable: true },
    KeyboardAvoidingView: { value: "KeyboardAvoidingView", enumerable: true },
    Pressable: { value: "Pressable", enumerable: true },
    ScrollView: { value: ScrollView, enumerable: true }, TextInput: { value: TextInput, enumerable: true },
    Modal: { value: ({ visible, children }: { visible: boolean; children: import("react").ReactNode }) => visible ? children : null, enumerable: true },
  });
});
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

let root: Root;
let back: (() => boolean | null | undefined) | undefined;
function textOf(node: TestNode): string {
  return typeof node === "string" ? node : node.children.map(textOf).join("");
}
const text = () => textOf(root.container);
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
async function advance(ms: number) { await act(async () => { jest.advanceTimersByTime(ms); }); }
async function startAndLog() {
  await tap("Train, workouts");
  await tap("Workout settings");
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

it("keeps welcome authentication disabled and exposes exactly five accessible tabs", async () => {
  expect(button("Authentication placeholder. Sign-in and account creation are not available.").props.disabled).toBe(true);
  await tap("Explore the local demo without signing in");
  const tabs = root.container.queryAll((node) => node.props.accessibilityRole === "tab");
  expect(tabs.map(textOf)).toEqual(["Home", "Train", "Create", "Feed", "Profile"]);
  expect(text()).toContain("Not saved or uploaded");
  expect(text()).toContain("No saved workout today");
  expect(text()).toContain("Choose an exercise and make your first entry.");
});
it("starts a timed workout from Home and continues it across tabs", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Start workout");
  expect(text()).toContain("00:00 elapsed");
  expect(text()).toContain("Calories unavailable \u2014 add body weight");
  await advance(61_000);
  await tap("Home");
  expect(text()).toContain("Workout in progress");
  expect(text()).toContain("01:01");
  await tap("Continue workout");
  expect(text()).toContain("01:01");
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
  expect(text()).toContain("No entries yet.");
});
it("shows identical frozen time and calorie estimates in Train, Progress, Profile and a published workout", async () => {
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
  expect(text()).toContain("30:00");
  expect(text()).toContain("123 kcal");
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
  await tap("My Posts");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(1);
  await tap("Profile");
  await tap("View Progress");
  expect(text()).toContain("Calorie estimates available for 1 of 1 workouts");
});
it("preserves composer and active workout state, and confirms Android Back before discarding", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  await tap("Create");
  await input("Post text", "Keep this draft");
  await tap("Profile");
  await tap("Create");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Keep this draft")).toHaveLength(1);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Discard unfinished post and comment drafts?");
  await tap("Keep editing");
  await tap("Cancel");
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
  expect(text()).toContain("Share a small win");
});

it("keeps composer validation and explicit publishing for text and sample attachments", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Create");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Write a post before submitting.");
  await input("Post text", "x".repeat(501));
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Keep a post to 500 characters or fewer.");
  await input("Post text", "A local thought");
  await tap("Attach sample achievement");
  await tap("Sample: Showing up");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("A local thought");
  expect(text()).toContain("SAMPLE ACHIEVEMENT");
  await tap("My Posts");
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

it("puts Start before optional settings and keeps body weight collapsed until requested", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  expect(button("Workout settings").props.accessibilityState.expanded).toBe(false);
  expect(root.container.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
  const actions = root.container.queryAll((node) => node.props.accessibilityRole === "button").map((node) => node.props.accessibilityLabel);
  expect(actions.indexOf("Start workout")).toBeLessThan(actions.indexOf("Workout settings"));
  await tap("Workout settings");
  await input("Body weight", "70");
  await tap("Workout settings");
  expect(root.container.queryAll((node) => node.type === "TextInput")).toHaveLength(0);
  await tap("Start workout");
  expect(text()).toContain("00:00 elapsed");
  expect(text()).not.toContain("SESSION TIME");
  await tap("Workout settings");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "70")).toHaveLength(1);
});

it("keeps invalid body weight visible and still allows a blank weight to start", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Train, workouts");
  await tap("Workout settings");
  await input("Body weight", "1000");
  await tap("Workout settings");
  await tap("Start workout");
  expect(text()).toContain("Enter body weight from 1 to 500 kg");
  expect(button("Workout settings").props.accessibilityState.expanded).toBe(true);
  await input("Body weight", "");
  await tap("Start workout");
  expect(button("Add exercise")).toBeDefined();
  expect(text()).toContain("Calories unavailable \u2014 add body weight");
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
  expect(text()).toContain("No entries yet.");
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
  expect(text()).not.toContain("No entries yet.");
});

it("keeps estimate assumptions accessible through the compact timer disclosure", async () => {
  await tap("Explore the local demo without signing in");
  await startAndLog();
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  await tap("About calorie estimates");
  expect(text()).toContain("Actual calories vary; not a medical measurement.");
  await tap("About calorie estimates");
  expect(text()).toContain("General estimate; may not reflect cardio.");
});

async function acknowledgeTrainer() {
  const checkbox = root.container.queryAll((node) => node.props.accessibilityRole === "checkbox")[0];
  await act(async () => { checkbox.props.onPress(); });
}

it("opts into an unverified trainer extension, posts with the same identity and disables safely", async () => {
  await tap("Explore the local demo without signing in");
  await tap("Profile");
  await tap("Become a trainer");
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
  expect(text()).toContain("Unverified trainer");
  expect(text()).toContain("Taylor Demo");
  expect(text()).toContain("@taylor_demo");
  await tap("Create");
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
  await tap("Edit trainer profile");
  await input("Trainer Experience", "Updated self-report");
  await acknowledgeTrainer();
  await tap("Save trainer profile");
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
  expect(text()).toContain("Unverified trainer");
  expect(text()).toContain("FitSocial has not verified this trainer's qualifications or experience.");
  expect(text()).toContain("No qualifications supplied. Fictional example only.");
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
  await tap("Become a trainer");
  await input("Trainer Experience", "Unfinished trainer draft");
  await tap("Bodyweight");
  await act(async () => { expect(back?.()).toBe(true); });
  await tap("Continue trainer setup");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Unfinished trainer draft")).toHaveLength(1);
  expect(button("Bodyweight").props.accessibilityState.selected).toBe(true);
  await tap("Create");
  await input("Post text", "Keep my ordinary post draft");
  await tap("Profile");
  await tap("Continue trainer setup");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "Unfinished trainer draft")).toHaveLength(1);
  await tap("Train, workouts");
  expect(button("Add exercise")).toBeDefined();
  await tap("Create");
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
  expect(label && typeof label !== "string" && StyleSheet.flatten(label.props.style).color).toBe("#C9F270");
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
  await tap("Create");
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
  expect(text()).toContain("lost when the app process resets");
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
  await tap("Create");
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
  await tap("Create");
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
  await tap("Create");
  await tap("Open Drafts");
  expect(text()).not.toContain("Pending share");
  await tap("Continue editing");
  await tap("Cancel");
  await tap("Discard drafts");
  await tap("Train, workouts");
  await tap("End workout");
  await tap("Finish workout");
  await tap("Share workout");
  await tap("Cancel");
  await tap("Discard drafts");
  await tap("Create");
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
  await tap("Create");
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
  await tap("My Posts");
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

it("updates Following from profile follows, keeps disclosures and returns safely from discovery", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("Fictional sample community");
  expect(text()).toContain("Sam K.");
  expect(text()).toContain("Unverified trainer");
  await tap("Following");
  expect(text()).toContain("Your following feed is quiet.");
  await tap("Discover trainers");
  expect(text()).toContain("Unverified");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Following").props.accessibilityState.selected).toBe(true);
  await tap("For You"); await tapStartingWith("View Maya R., fictional demo profile.");
  expect(text()).toContain("FitSocial has not verified");
  await tap("Follow locally");
  await act(async () => { expect(back?.()).toBe(true); });
  await tap("Following");
  expect(text()).toContain("Made a little time to move today.");
  expect(text()).not.toContain("Weekend check-in:");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(1);
  await tapStartingWith("View Maya R., fictional demo profile."); await tap("Unfollow locally");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(text()).toContain("Your following feed is quiet.");
  await tap("Groups");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Following").props.accessibilityState.selected).toBe(true);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab").map(textOf)).toEqual(["Home", "Train", "Create", "Feed", "Profile"]);
});

it("keeps saved drafts out of feeds and publishes into For You and My Posts from Following", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed"); await tap("My Posts");
  expect(text()).toContain("No published posts yet."); await tap("Create post");
  await input("Post text", "Discovery draft to publish"); await tap("Save draft");
  await tap("Feed");
  expect(text()).not.toContain("Discovery draft to publish");
  expect(text()).toContain("No published posts yet.");
  await tap("For You"); expect(text()).not.toContain("Discovery draft to publish");
  await tap("Following"); await tap("Create"); await tap("Resume draft-1");
  await tap("Publish to local feed. Not uploaded or saved.");
  expect(button("For You").props.accessibilityState.selected).toBe(true);
  expect(text()).toContain("Discovery draft to publish");
  await tap("My Posts"); expect(text()).toContain("Discovery draft to publish");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "Preview sharing this post. Nothing will be sent.")).toHaveLength(1);
  await tap("Following"); expect(text()).not.toContain("Discovery draft to publish");
});

it.each<[FeedFilter, string, string]>([
  ["all", "No posts to discover yet.", "Create post"],
  ["following", "Your following feed is quiet.", "Discover trainers"],
  ["local", "No published posts yet.", "Create post"],
])("provides an actionable %s empty state", async (filter, title, action) => {
  const create = jest.fn(); const trainers = jest.fn();
  await act(async () => { root.render(<FeedScreen social={{ ...createInitialSocialState(), posts: [], filter }}
    onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onCreatePost={create} onOpenTrainers={trainers} onOpenGroups={jest.fn()} />); });
  expect(text()).toContain(title);
  await tap(action); expect(filter === "following" ? trainers : create).toHaveBeenCalledTimes(1);
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
  expect(text()).toContain("Calories unavailable");
  expect(text()).not.toContain("Estimated calories:");
  await tap("About calorie estimates");
  expect(button("About calorie estimates").props.accessibilityState.expanded).toBe(false);
  expect(button("Remove Dead Hang set 1")).toBeDefined();
});

it("keeps empty Profile social counts near identity and avoids zero-only progress metrics", async () => {
  await tap("Explore the local demo without signing in"); await tap("Profile");
  for (const label of ["0 Posts", "0 Followers", "0 Following"]) expect(root.container.queryAll((node) => node.props.accessibilityLabel === label)).toHaveLength(1);
  expect(text()).not.toContain("local posts"); expect(text()).not.toContain("local followers");
  expect(text()).toContain("No posts yet."); expect(text()).toContain("No saved workouts yet.");
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "0 saved workouts")).toHaveLength(0);
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "00:00 total time")).toHaveLength(0);
  expect(button("Edit profile")).toBeDefined(); expect(button("Open Settings")).toBeDefined();
  await tap("View Progress"); expect(text()).toContain("No completed workouts yet.");
  await act(async () => { expect(back?.()).toBe(true); }); expect(button("Open Settings")).toBeDefined();
});

it("counts publications and follows in Profile while excluding drafts and samples", async () => {
  await tap("Explore the local demo without signing in"); await tap("Create");
  await input("Post text", "Published profile preview"); await tap("Publish to local feed. Not uploaded or saved.");
  await tap("Create"); await input("Post text", "Unpublished profile draft"); await tap("Save draft");
  await tap("Feed"); await tapStartingWith("View Maya R., fictional demo profile."); await tap("Follow locally");
  await tap("Profile");
  for (const label of ["1 Posts", "0 Followers", "1 Following"]) expect(root.container.queryAll((node) => node.props.accessibilityLabel === label)).toHaveLength(1);
  expect(text()).toContain("Published profile preview"); expect(text()).not.toContain("Unpublished profile draft");
  expect(text()).not.toContain("Made a little time to move today.");
  expect(button("View drafts (1)")).toBeDefined();
});

it("keeps untimed saved workout totals meaningful and links directly to Progress", async () => {
  const navigate = jest.fn();
  await act(async () => { root.render(<ProfileScreen social={createInitialSocialState()} onSocialAction={jest.fn()} onOpenAuthor={jest.fn()} onNavigate={navigate}
    history={[{ id: 1, sets: [{ id: 1, exerciseId: "push-up", exercise: "Push-up", reps: 10, weight: null }] }]} />); });
  expect(root.container.queryAll((node) => node.props.accessibilityLabel === "1 saved workouts")).toHaveLength(1);
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
  expect(text()).toContain("Account & Privacy"); expect(text()).toContain("Security & Login");
  expect(text()).toContain("Accounts and login are not available in this local demo.");
  expect(text()).toContain("Coming later.");
  for (const label of ["Sign in", "Sign out"]) expect(button(`${label}, unavailable in local demo`).props.accessibilityState.disabled).toBe(true);
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
  await input("Search feed posts", "maya");
  expect(text()).toContain("1 matching post");
  expect(text()).toContain("Made a little time to move today.");
  expect(text()).not.toContain("Weekend check-in:");
  await tapStartingWith("View Maya R., fictional demo profile.");
  await act(async () => { expect(back?.()).toBe(true); });
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "maya")).toHaveLength(1);
  await input("Search feed posts", "nothing matches here");
  expect(text()).toContain("No matching posts.");
  await tap("Clear feed search");
  expect(text()).not.toContain("No matching posts.");
  expect(text()).toContain("Weekend check-in:");
});

it("opens saved Drafts directly from My Posts without publishing them", async () => {
  await tap("Explore the local demo without signing in"); await tap("Create");
  await input("Post text", "Parked discovery draft"); await tap("Save draft");
  await tap("Feed"); await tap("My Posts");
  expect(text()).not.toContain("Parked discovery draft");
  await tap("Open feed drafts");
  expect(text()).toContain("Drafts"); expect(text()).toContain("Parked discovery draft");
  expect(button("Resume draft-1")).toBeDefined();
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab").map(textOf)).toEqual(["Home", "Train", "Create", "Feed", "Profile"]);
});

it("publishes visibly after an unmatched feed search and retains local interactions", async () => {
  await tap("Explore the local demo without signing in"); await tap("Feed");
  await input("Search feed posts", "no result"); await tap("Create");
  await input("Post text", "Search-safe publication"); await tap("Publish to local feed. Not uploaded or saved.");
  expect(text()).toContain("Search-safe publication");
  expect(text()).not.toContain("No matching posts.");
  await tap("My Posts");
  await tapStartingWith("Like ");
  expect(root.container.queryAll((node) => String(node.props.accessibilityLabel).startsWith("Unlike "))).toHaveLength(1);
  await tap("Show 0 comments"); await input("Comment on ", "Local encouragement"); await tap("Add local comment");
  expect(text()).toContain("Local encouragement");
  expect(button("Hide 1 comments")).toBeDefined();
});
it("opens Settings under Profile with honest disabled features and five tabs", async () => {
  await tap("Explore the local demo without signing in"); await openSettings();
  for (const section of ["Edit profile", "Privacy", "Fitness preferences", "Account & security", "Notifications", "About FitSocial"]) expect(text()).toContain(section);
  expect(text()).toContain("Available when accounts launch.");
  expect(text()).toContain("0.1.0");
  for (const label of ["Public", "Private", "Sign-in methods", "Password management", "Account recovery", "Delete account", "Social interactions", "Workout reminders", "Trainer activity"]) {
    expect(button(`${label}, unavailable in local demo`).props.accessibilityState.disabled).toBe(true);
  }
  expect(button("Profile").props.accessibilityState.selected).toBe(true);
  expect(root.container.queryAll((node) => node.props.accessibilityRole === "tab")).toHaveLength(5);
  await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Open Settings")).toBeDefined();
});
it("saves profile identity and avatar consistently in Profile, My Posts and comments", async () => {
  await tap("Explore the local demo without signing in"); await tap("Create");
  await input("Post text", "A post with a stable author"); await tap("Publish to local feed. Not uploaded or saved.");
  await openSettings(); await tap("Edit local profile");
  await input("Profile display name", "Taylor Local"); await input("Profile username", "taylor_local");
  await input("Local bio", "My saved bio"); await input("Profile broad location", "Hyderabad");
  await tap("Avatar: Strong");
  expect(button("Avatar: Strong").props.accessibilityState.selected).toBe(true);
  await tap("Save profile"); await tap("Back to previous screen");
  for (const value of ["Taylor Local", "@taylor_local", "My saved bio", "Hyderabad", "ST"]) expect(text()).toContain(value);
  await tap("Feed"); await tap("My Posts");
  expect(text()).toContain("Taylor Local"); expect(text()).toContain("@taylor_local");
  await tap("Show 0 comments"); await input("Comment on Taylor Local", "Still the same author"); await tap("Add local comment");
  expect(text()).toContain("Still the same author");
  await tapStartingWith("View Taylor Local, fictional demo profile.");
  expect(text()).toContain("@taylor_local");
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
  await tap("Train, workouts"); await tap("Start workout"); await tap("Workout settings");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "72.5")).toHaveLength(1);
  await input("Body weight", "80");
  await openSettings(); await tap("Measurements and units"); await input("Personal body weight", "90"); await tap("Save preferences");
  await tap("Train, workouts"); await tap("Workout settings");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "80")).toHaveLength(1);
  await tap("Add exercise"); await browseExercises("Chest"); await input("Search exercise names", "Push-up"); await tapStartingWith("Push-up,");
  await input("Repetitions", "10"); await tap("Log set"); await advance(60000);
  await tap("End workout"); await tap("Finish workout"); await tap("Save for this session");
  const calories = text().match(/Estimated calories: \d+ kcal/)?.[0]; expect(calories).toBeTruthy();
  await openSettings(); await tap("Measurements and units"); await input("Personal body weight", "100"); await tap("Save preferences");
  await tap("Train, workouts"); expect(text()).toContain(calories!);
  await tap("Start new workout"); await tap("Workout settings");
  expect(root.container.queryAll((node) => node.type === "TextInput" && node.props.value === "100")).toHaveLength(1);
});

it("closes unchanged editors directly and protects Settings edits before exiting the demo", async () => {
  await tap("Explore the local demo without signing in"); await openSettings(); await tap("Edit local profile");
  await tap("Cancel edits"); expect(button("Edit local profile")).toBeDefined();
  await tap("Measurements and units"); await act(async () => { expect(back?.()).toBe(true); });
  expect(button("Measurements and units")).toBeDefined();
  await tap("Edit local profile"); await input("Profile display name", "Unsaved before exit");
  await tap("Back to welcome"); expect(text()).toContain("Discard settings edits?");
  await tap("Keep editing"); expect(button("Save profile")).toBeDefined();
  await tap("Back to welcome"); await tap("Discard edits");
  expect(button("Explore the local demo without signing in")).toBeDefined();
  await tap("Explore the local demo without signing in"); await tap("Profile");
  expect(text()).not.toContain("Unsaved before exit");
});
