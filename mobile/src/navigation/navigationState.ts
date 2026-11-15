export const tabs = [
  { id: "home", label: "Home", title: "Your space to move." },
  { id: "workouts", label: "Train", title: "Build your rhythm." },
  { id: "create", label: "Create", title: "New post" },
  { id: "feed", label: "Feed", title: "Better with your people." },
  { id: "profile", label: "Profile", title: "Your profile" },
] as const;

export type PrimaryTabId = (typeof tabs)[number]["id"];
export type TabId = PrimaryTabId | "progress" | "groups" | "author" | "trainers" | "trainerSetup" | "settings";
export const destinations = [
  ...tabs,
  { id: "settings", label: "Settings", title: "Your preferences" },
  { id: "trainers", label: "Trainers", title: "Discover trainers" },
  { id: "trainerSetup", label: "Trainer profile", title: "Self-declared trainer" },
  { id: "progress", label: "Progress", title: "Every step adds up." },
  { id: "groups", label: "Groups", title: "Find your circle." },
  { id: "author", label: "Profile", title: "Community profile" },
] as const;
type Route = { tab: TabId; authorId?: string; parentTab?: PrimaryTabId };

export type NavigationState =
  | { screen: "welcome" }
  | ({ screen: "prototype"; backStack?: Route[] } & Route);

export type NavigationAction =
  | { type: "openPrototype" }
  | { type: "selectTab"; tab: TabId }
  | { type: "openAuthor"; authorId: string }
  | { type: "back" }
  | { type: "exitPrototype" };

export const initialNavigation: NavigationState = { screen: "welcome" };

export function selectedPrimaryTab(state: NavigationState): PrimaryTabId {
  if (state.screen === "welcome") return "home";
  return tabs.some((tab) => tab.id === state.tab) ? state.tab as PrimaryTabId : state.parentTab ?? "home";
}
function snapshot(state: Extract<NavigationState, { screen: "prototype" }>): Route {
  return { tab: state.tab, ...(state.authorId ? { authorId: state.authorId } : {}), ...(state.parentTab ? { parentTab: state.parentTab } : {}) };
}

// Presentation state only. Entering the demo never creates an authenticated session.
export function navigationReducer(
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  switch (action.type) {
    case "openPrototype":
      return { screen: "prototype", tab: "home" };
    case "selectTab":
      if (state.screen !== "prototype" || action.tab === "author") return state;
      if (action.tab === "progress" || action.tab === "groups" || action.tab === "trainers" || action.tab === "trainerSetup" || action.tab === "settings") {
        if (state.tab === action.tab) return state;
        return { screen: "prototype", tab: action.tab, parentTab: selectedPrimaryTab(state), backStack: [...state.backStack ?? [], snapshot(state)] };
      }
      return { screen: "prototype", tab: action.tab };
    case "openAuthor":
      if (state.screen !== "prototype" || !action.authorId || (state.tab === "author" && state.authorId === action.authorId)) return state;
      return { screen: "prototype", tab: "author", authorId: action.authorId,
        parentTab: selectedPrimaryTab(state), backStack: [...state.backStack ?? [], snapshot(state)] };
    case "back":
      if (state.screen === "welcome") return state;
      if (state.backStack?.length) {
        const trail = state.backStack.slice(0, -1);
        return { screen: "prototype", ...state.backStack[state.backStack.length - 1], ...(trail.length ? { backStack: trail } : {}) };
      }
      return state.tab === "home"
        ? initialNavigation
        : { screen: "prototype", tab: "home" };
    case "exitPrototype":
      return initialNavigation;
  }
}
