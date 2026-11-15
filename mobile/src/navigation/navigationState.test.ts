import { initialNavigation, navigationReducer, selectedPrimaryTab, tabs } from "./navigationState";

describe("local prototype navigation", () => {
  it("has Home, Train, Create, Feed and Profile as the five primary destinations", () => {
    expect(tabs.map((tab) => tab.label)).toEqual(["Home", "Train", "Create", "Feed", "Profile"]);
  });
  it("starts at welcome and ignores tab changes before entering the demo", () => {
    expect(navigationReducer(initialNavigation, { type: "selectTab", tab: "feed" }))
      .toBe(initialNavigation);
    expect(navigationReducer(initialNavigation, { type: "back" })).toBe(initialNavigation);
  });

  it.each(tabs)("opens $label and returns through Home to welcome", ({ id }) => {
    const demo = navigationReducer(initialNavigation, { type: "openPrototype" });
    expect(demo).toEqual({ screen: "prototype", tab: "home" });
    const selected = navigationReducer(demo, { type: "selectTab", tab: id });
    expect(selected).toEqual({ screen: "prototype", tab: id });
    const back = navigationReducer(selected, { type: "back" });
    expect(back).toEqual(id === "home" ? initialNavigation : demo);
    if (id !== "home") {
      expect(navigationReducer(back, { type: "back" })).toEqual(initialNavigation);
    }
  });

  it("returns directly to welcome and starts a fresh demo at Home", () => {
    const selected = navigationReducer(
      navigationReducer(initialNavigation, { type: "openPrototype" }),
      { type: "selectTab", tab: "groups" },
    );
    const welcome = navigationReducer(selected, { type: "exitPrototype" });
    expect(welcome).toEqual(initialNavigation);
    expect(navigationReducer(welcome, { type: "openPrototype" }))
      .toEqual({ screen: "prototype", tab: "home" });
  });
});

describe("secondary destinations and author profiles", () => {
  it.each([
    ["home", "progress"], ["profile", "progress"], ["feed", "groups"], ["profile", "groups"], ["profile", "settings"],
  ] as const)("returns from %s / %s to its entry tab", (entry, destination) => {
    const initial = navigationReducer(initialNavigation, { type: "openPrototype" });
    const parent = navigationReducer(initial, { type: "selectTab", tab: entry });
    const child = navigationReducer(parent, { type: "selectTab", tab: destination });
    expect(child).toMatchObject({ tab: destination });
    expect(selectedPrimaryTab(child)).toBe(entry);
    expect(navigationReducer(child, { type: "back" })).toEqual(parent);
  });
  it("opens an author profile from Feed and returns without changing the selected tab", () => {
    const feed = navigationReducer(navigationReducer(initialNavigation, { type: "openPrototype" }), { type: "selectTab", tab: "feed" });
    const author = navigationReducer(feed, { type: "openAuthor", authorId: "maya" });
    expect(author).toMatchObject({ screen: "prototype", tab: "author", authorId: "maya" });
    expect(selectedPrimaryTab(author)).toBe("feed");
    expect(navigationReducer(author, { type: "openAuthor", authorId: "maya" })).toBe(author);
    expect(navigationReducer(author, { type: "back" })).toEqual(feed);
    expect(navigationReducer(author, { type: "selectTab", tab: "profile" })).toEqual({ screen: "prototype", tab: "profile" });
  });
  it("does not open profiles or secondary pages before entering the prototype", () => {
    expect(navigationReducer(initialNavigation, { type: "openAuthor", authorId: "maya" })).toBe(initialNavigation);
    expect(navigationReducer(initialNavigation, { type: "selectTab", tab: "progress" })).toBe(initialNavigation);
  });
});
