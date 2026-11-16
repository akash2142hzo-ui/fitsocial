import { app, BrowserWindow, dialog, protocol, session } from "electron";
import { mkdirSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { APP_ORIGIN, assetForUrl, WINDOW_SECURITY } from "./security.js";

const smoke = process.argv.includes("--smoke-test");
if (smoke) app.disableHardwareAcceleration();
// Smoke runs must not share Chromium state or the interactive instance lock.
const localState = join(import.meta.dirname, "../../.local-state", smoke ? "smoke" : "");
mkdirSync(localState, { recursive: true });
app.setPath("userData", localState);
app.setPath("sessionData", localState);
app.setAppLogsPath(join(localState, "logs"));
protocol.registerSchemesAsPrivileged([{ scheme: "fitsocial-admin", privileges: { standard: true, secure: true } }]);
let mainWindow: BrowserWindow | null = null;

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function createWindow() {
  const root = join(import.meta.dirname, "../renderer");
  const assets = new Set(["/index.html", ...readdirSync(join(root, "assets")).map((name) => `/assets/${name}`)]);
  const localAsset = (url: string) => assetForUrl(url, root, assets);
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on("will-download", (event) => event.preventDefault());
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !localAsset(details.url) }));
  protocol.handle("fitsocial-admin", async (request) => {
    const file = localAsset(request.url);
    if (request.method !== "GET" || !file) return new Response("Not found", { status: 404 });
    const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
    try {
      return new Response(await readFile(file), { headers: { "Content-Type": types[extname(file)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" } });
    } catch { return new Response("Not found", { status: 404 }); }
  });
  const window = new BrowserWindow({
    width: 1440, height: 1000, minWidth: 900, minHeight: 640,
    title: "FitSocial Admin Studio — Demo", backgroundColor: "#0e1013", show: !smoke,
    autoHideMenuBar: true, webPreferences: { ...WINDOW_SECURITY, devTools: !smoke, offscreen: smoke, backgroundThrottling: !smoke },
  });
  mainWindow = window;
  window.on("closed", () => { mainWindow = null; });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-redirect", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  await window.loadURL(`${APP_ORIGIN}/index.html`);
  if (!smoke) {
    focusMainWindow();
    console.log("[Admin Studio] Desktop window loaded. Close the window to exit.");
  }
  if (smoke) {
    const { runSmoke } = await import("./smoke.js");
    await runSmoke(window);
    app.exit(0);
  }
}

if (!app.requestSingleInstanceLock()) {
  console.log("[Admin Studio] An instance is already running; focusing its window.");
  app.quit();
} else {
  app.on("second-instance", () => { if (!smoke) focusMainWindow(); });
  app.whenReady().then(createWindow).catch((error: unknown) => {
    console.error("Admin Studio could not start:", error);
    if (!smoke) dialog.showErrorBox("FitSocial Admin Studio could not start", `${error instanceof Error ? error.message : String(error)}\n\nSee the launching terminal for details. Rebuild with npm start.`);
    app.exit(1);
  });
}
app.on("window-all-closed", () => app.quit());
