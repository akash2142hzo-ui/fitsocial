import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { demoModules, modules, filterRows } from "./demo";

afterEach(cleanup);

describe("Admin Studio demo", () => {
  it("discloses the fictional, unauthenticated environment and all eleven modules", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Overview");
    expect(within(screen.getByRole("navigation")).getAllByRole("button")).toHaveLength(11);
    expect(screen.getByText("Fictional data only. No production connection or administrative actions.")).toBeTruthy();
    expect(screen.getByText("Not authenticated")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Sample weekly activity" })).toBeTruthy();
  });

  it.each(modules.filter((module) => module.id !== "overview"))("navigates to $label with scoped demo records and heading focus", async ({ id, label }) => {
    const user = userEvent.setup();
    render(<App />);
    const button = within(screen.getByRole("navigation")).getByRole("button", { name: new RegExp(`^${label}`) });
    await user.click(button);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(label);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
    expect(button.getAttribute("aria-current")).toBe("page");
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    const fixture = demoModules[id as keyof typeof demoModules];
    expect(screen.getByRole("table").textContent).toContain(fixture.rows[0].name);
    expect(screen.getByText(fixture.note)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Delete|^Approve|^Send|^Redeem/ })).toBeNull();
  });

  it("filters locally, recovers from empty results and resets search on module changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = within(screen.getByRole("navigation"));
    await user.click(nav.getByRole("button", { name: "Users" }));
    const search = screen.getByRole("searchbox", { name: "Search Users demo records" });
    await user.type(search, "avery");
    expect(screen.getByRole("status").textContent).toBe("1 of 3 demo records");
    expect(screen.queryByText("Robin Vale")).toBeNull();
    await user.clear(search); await user.type(search, "not-a-member");
    expect(screen.getByRole("heading", { name: "No matching demo records" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("status").textContent).toBe("3 of 3 demo records");
    await user.type(search, "avery");
    await user.click(nav.getByRole("button", { name: "Orders" }));
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("Order DEMO-1042")).toBeTruthy();
  });

  it("supports keyboard navigation and keeps invitations disabled", async () => {
    const user = userEvent.setup();
    render(<App />);
    const team = within(screen.getByRole("navigation")).getByRole("button", { name: "Team" });
    team.focus(); await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Team");
    expect((screen.getByRole("button", { name: "Invite teammate — unavailable" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Future invitations require owner authorization/)).toBeTruthy();
  });

  it("opens overview queue shortcuts without applying administrative changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Content reports/ }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Content Moderation");
    await user.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Overview" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Overview");
  });

  it("searches trimmed text across columns without mutating fixtures", () => {
    const rows = demoModules.users.rows;
    expect(filterRows(rows, "  REVIEW  ").map((row) => row.name)).toEqual(["Robin Vale"]);
    expect(filterRows(rows, "")).toHaveLength(3);
    expect(rows).toHaveLength(3);
  });
});
