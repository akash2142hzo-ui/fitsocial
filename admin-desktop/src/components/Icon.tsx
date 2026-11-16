import type { ModuleId } from "../demo";

const paths: Record<ModuleId, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  moderation: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6",
  trainers: "M5 4h14v5a7 7 0 0 1-14 0z M5 6H2v3a4 4 0 0 0 4 4 M19 6h3v3a4 4 0 0 1-4 4 M12 16v5 M8 21h8",
  shop: "M4 8h16l1 13H3z M8 8V6a4 4 0 0 1 8 0v2",
  orders: "M6 3h12v19l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h3",
  rewards: "M3 8h18v5H3z M5 13v9h14v-9 M12 8v14 M12 8S3 8 5 4c2-4 7 4 7 4s9 0 7-4c-2-4-7 4-7 4",
  notifications: "M18 8a6 6 0 0 0-12 0c0 9-3 9-3 9h18s-3 0-3-9 M10 21h4",
  analytics: "M3 3v18h18 M7 16v-5 M12 16V7 M17 16V4",
  team: "M4 21v-3a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3 M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 10h3 M19 10h3",
  settings: "M9 3h6l1 4 4 1v8l-4 1-1 4H9l-1-4-4-1V8l4-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
};
export function Icon({ name }: { name: ModuleId }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
