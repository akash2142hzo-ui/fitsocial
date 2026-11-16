import { join } from "node:path";

export const APP_ORIGIN = "fitsocial-admin://app";
export const WINDOW_SECURITY = Object.freeze({
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  webviewTag: false,
});

// Only explicit build assets are exposed; no generic filesystem or network proxy.
export function assetForUrl(rawUrl: string, root: string, assetPaths: ReadonlySet<string>): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "fitsocial-admin:" || url.hostname !== "app" || url.port || url.username || url.password || url.search || url.hash) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (!assetPaths.has(pathname) || pathname.includes("\\") || pathname.includes("\0") || pathname.split("/").includes("..")) return null;
    return join(root, pathname.slice(1));
  } catch { return null; }
}
