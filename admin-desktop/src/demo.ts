export const modules = [
  { id: "overview", label: "Overview", section: "Workspace" },
  { id: "users", label: "Users", section: "Workspace" },
  { id: "moderation", label: "Content Moderation", section: "Workspace" },
  { id: "trainers", label: "Trainers", section: "Workspace" },
  { id: "shop", label: "Shop", section: "Commerce" },
  { id: "orders", label: "Orders", section: "Commerce" },
  { id: "rewards", label: "Rewards", section: "Commerce" },
  { id: "notifications", label: "Notifications", section: "Manage" },
  { id: "analytics", label: "Analytics", section: "Manage" },
  { id: "team", label: "Team", section: "Manage" },
  { id: "settings", label: "Settings", section: "Manage" },
] as const;
export type ModuleId = typeof modules[number]["id"];
export type DemoRow = { id: string; name: string; detail: string; status: string; value: string };
type DemoModule = { description: string; columns: [string, string, string]; rows: DemoRow[]; note: string };

// Fictional fixtures only. No imported mobile state, identifiers, people or services.
export const demoModules: Record<Exclude<ModuleId, "overview">, DemoModule> = {
  users: {
    description: "A fictional community directory. Explore records without changing accounts.",
    columns: ["Demo member", "State", "Joined"],
    rows: [
      { id: "demo-user-1", name: "Avery Stone", detail: "avery_demo · Fictional member", status: "Active", value: "12 Nov 2026" },
      { id: "demo-user-2", name: "Robin Vale", detail: "robin_demo · Fictional member", status: "Review", value: "11 Nov 2026" },
      { id: "demo-user-3", name: "Casey Reed", detail: "casey_demo · Fictional member", status: "Active", value: "09 Nov 2026" },
    ], note: "Account suspension, identity lookup and personal data access are unavailable.",
  },
  moderation: {
    description: "Sample reports awaiting a human review. No live content is loaded.",
    columns: ["Demo report", "Queue", "Reason"],
    rows: [
      { id: "demo-report-1", name: "A training tip post", detail: "REP-001 · Fictional report", status: "Review", value: "Misleading claim" },
      { id: "demo-report-2", name: "A repeated comment", detail: "REP-002 · Fictional report", status: "Pending", value: "Potential spam" },
      { id: "demo-report-3", name: "A community discussion", detail: "REP-003 · Fictional report", status: "Reviewed", value: "Sample resolved case" },
    ], note: "Removing content, resolving reports and contacting members are unavailable.",
  },
  trainers: {
    description: "Fictional trainer applications. Sample states do not establish verification.",
    columns: ["Demo trainer", "Application", "Specialty"],
    rows: [
      { id: "demo-trainer-1", name: "Morgan West", detail: "TR-001 · Fictional application", status: "Pending", value: "Strength" },
      { id: "demo-trainer-2", name: "Jordan Lake", detail: "TR-002 · Fictional application", status: "Review", value: "Mobility" },
    ], note: "Credential verification, approvals and trainer permissions are unavailable.",
  },
  shop: {
    description: "An illustrative catalog for planning. Nothing is offered for sale.",
    columns: ["Demo product", "Catalog state", "Sample price"],
    rows: [
      { id: "demo-product-1", name: "Studio training tee", detail: "SKU-DEMO-01 · Fictional product", status: "Preview", value: "₹799" },
      { id: "demo-product-2", name: "Everyday gym bottle", detail: "SKU-DEMO-02 · Fictional product", status: "Draft", value: "₹499" },
    ], note: "Catalog writes, inventory management, checkout and purchases are unavailable.",
  },
  orders: {
    description: "Fictional order examples with no customer or payment information.",
    columns: ["Demo order", "Sample state", "Sample total"],
    rows: [
      { id: "demo-order-1", name: "Order DEMO-1042", detail: "Fictional order · No payment collected", status: "Pending", value: "₹799" },
      { id: "demo-order-2", name: "Order DEMO-1041", detail: "Fictional order · No payment collected", status: "Preview", value: "₹499" },
    ], note: "Fulfillment, refunds, payment processing and customer exports are unavailable.",
  },
  rewards: {
    description: "Preview a fictional FitPoints catalog. These points have no monetary value.",
    columns: ["Demo reward", "Availability", "Sample points"],
    rows: [
      { id: "demo-reward-1", name: "Profile badge", detail: "Cosmetic sample · No redemption", status: "Preview", value: "500 FitPoints" },
      { id: "demo-reward-2", name: "Training theme", detail: "Cosmetic sample · No redemption", status: "Preview", value: "1,000 FitPoints" },
    ], note: "Point grants, deductions, earning and redemption are unavailable.",
  },
  notifications: {
    description: "Sample message ideas. No audience is selected and nothing can be sent.",
    columns: ["Demo message", "State", "Channel"],
    rows: [
      { id: "demo-message-1", name: "Welcome to your next chapter", detail: "Fictional onboarding message", status: "Draft", value: "In-app concept" },
      { id: "demo-message-2", name: "Your weekly movement recap", detail: "Fictional engagement message", status: "Draft", value: "Push concept" },
    ], note: "Sending, scheduling, audience targeting and notification delivery are unavailable.",
  },
  analytics: {
    description: "Static illustrative metrics for 09–15 Nov 2026. No telemetry is collected.",
    columns: ["Demo metric", "Window", "Sample value"],
    rows: [
      { id: "demo-metric-1", name: "Weekly active members", detail: "Illustrative activity total", status: "Sample", value: "842" },
      { id: "demo-metric-2", name: "Workout completion", detail: "Illustrative completion rate", status: "Sample", value: "72%" },
      { id: "demo-metric-3", name: "Community posts", detail: "Illustrative publishing total", status: "Sample", value: "156" },
    ], note: "Live analytics, tracking, report generation and exports are unavailable.",
  },
  team: {
    description: "A fictional roster illustrating future least-privilege roles. No role is enforced here.",
    columns: ["Demo teammate", "Sample role", "Scope concept"],
    rows: [
      { id: "demo-team-1", name: "Taylor North", detail: "Fictional teammate · Not signed in", status: "Owner", value: "Team governance" },
      { id: "demo-team-2", name: "Riley Birch", detail: "Fictional teammate · Not signed in", status: "Moderator", value: "Content review" },
      { id: "demo-team-3", name: "Quinn Brook", detail: "Fictional teammate · Not signed in", status: "Analyst", value: "Aggregate reports" },
    ], note: "Only an authenticated owner may invite teammates in the future design. Invites, role edits and access changes are unavailable.",
  },
  settings: {
    description: "Foundation status and proposed controls. This prototype is not authenticated.",
    columns: ["Control", "Status", "Boundary"],
    rows: [
      { id: "demo-setting-1", name: "Production connection", detail: "No API, database or storage access", status: "Disconnected", value: "Local fixtures only" },
      { id: "demo-setting-2", name: "MFA & server-side RBAC", detail: "Future requirement · Not implemented", status: "Planned", value: "Admin API" },
      { id: "demo-setting-3", name: "Audit logging", detail: "Future requirement · Not implemented", status: "Planned", value: "Server only" },
    ], note: "No credentials, configuration secrets, authentication or editable production settings exist in this application.",
  },
};

export function filterRows(rows: DemoRow[], query: string): DemoRow[] {
  const normalized = query.trim().toLocaleLowerCase();
  return rows.filter((row) => [row.name, row.detail, row.status, row.value].some((value) => value.toLocaleLowerCase().includes(normalized)));
}
