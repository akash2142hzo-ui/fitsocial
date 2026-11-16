import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";

try {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const entry = join(root, "dist/electron/main.js");
  if (!existsSync(entry) || !existsSync(join(root, "dist/renderer/index.html"))) {
    throw new Error("Built app is missing. Run npm start to build and launch Admin Studio.");
  }
  const require = createRequire(import.meta.url);
  const runtime = require("electron");
  const args = process.argv.slice(2);
  const environment = { ...process.env };
  // IDE hosts may set this for helpers; our child must run in desktop mode.
  delete environment.ELECTRON_RUN_AS_NODE;
  console.log("[Admin Studio] Launching", entry);
  const child = spawn(runtime, [entry, ...args], {
    cwd: root,
    env: environment,
    stdio: "inherit",
    // On Windows, hiding a GUI subprocess can suppress its first native window.
    windowsHide: args.includes("--smoke-test"),
  });
  const forwardSignal = (signal) => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  };
  const interrupt = () => forwardSignal("SIGINT");
  const terminate = () => forwardSignal("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  child.on("error", (error) => {
    console.error("[Admin Studio] Electron launch failed:", error.message);
    process.exitCode = 1;
  });
  child.on("close", (code, signal) => {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
    if (code !== 0) console.error(`[Admin Studio] Electron exited with ${signal ? `signal ${signal}` : `code ${code}`}. See the startup errors above.`);
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error("[Admin Studio] Startup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
