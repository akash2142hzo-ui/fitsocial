// @vitest-environment node
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ spawn: vi.fn(), exists: vi.fn(), runtime: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
vi.mock("node:fs", () => ({ existsSync: mocks.exists }));
vi.mock("node:module", () => ({ createRequire: () => mocks.runtime }));

let child: EventEmitter & { exitCode: number | null; signalCode: string | null; kill: ReturnType<typeof vi.fn> };
let originalArgs: string[];
let originalExitCode: typeof process.exitCode;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  originalArgs = process.argv;
  originalExitCode = process.exitCode;
  process.argv = ["node", "scripts/launch.mjs"];
  child = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null, kill: vi.fn() });
  mocks.spawn.mockReturnValue(child);
  mocks.exists.mockReturnValue(true);
  mocks.runtime.mockReturnValue("C:\\Demo path with spaces\\electron.exe");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  child.emit("close", 0, null);
  process.argv = originalArgs;
  process.exitCode = originalExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const launch = () => vi.importActual("../scripts/launch.mjs");

describe("Windows desktop launcher", () => {
  it("launches the explicit main entry visibly, preserving spaces without a shell", async () => {
    vi.stubEnv("ELECTRON_RUN_AS_NODE", "1");
    await launch();
    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    const [runtime, args, options] = mocks.spawn.mock.calls[0];
    expect(runtime).toBe("C:\\Demo path with spaces\\electron.exe");
    expect(args[0].replaceAll("\\", "/")).toMatch(/\/admin-desktop\/dist\/electron\/main.js$/);
    expect(options).toMatchObject({ windowsHide: false, stdio: "inherit" });
    expect(options.shell).toBeUndefined();
    expect(options.detached).toBeUndefined();
    expect(options.env.ELECTRON_RUN_AS_NODE).toBeUndefined();
    expect(process.env.ELECTRON_RUN_AS_NODE).toBe("1");
  });
  it("keeps only explicit smoke runs hidden and forwards their flag", async () => {
    process.argv.push("--smoke-test");
    await launch();
    expect(mocks.spawn.mock.calls[0][1][1]).toBe("--smoke-test");
    expect(mocks.spawn.mock.calls[0][2].windowsHide).toBe(true);
  });
  it("reports missing build output without spawning", async () => {
    mocks.exists.mockReturnValue(false);
    await launch();
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("[Admin Studio] Startup failed:", expect.stringContaining("npm start"));
    expect(process.exitCode).toBe(1);
  });
  it("reports dependency resolution errors", async () => {
    mocks.runtime.mockImplementationOnce(() => { throw new Error("Runtime missing"); });
    await launch();
    expect(console.error).toHaveBeenCalledWith("[Admin Studio] Startup failed:", "Runtime missing");
    expect(process.exitCode).toBe(1);
  });
  it("reports spawn failures and preserves an unsuccessful exit", async () => {
    await launch();
    child.emit("error", new Error("Access denied"));
    expect(console.error).toHaveBeenCalledWith("[Admin Studio] Electron launch failed:", "Access denied");
    child.emit("close", null, null);
    expect(process.exitCode).toBe(1);
  });
  it("reports and forwards the actual child exit code", async () => {
    await launch(); child.emit("close", 7, null);
    expect(process.exitCode).toBe(7);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("code 7"));
  });
  it("forwards terminal termination to the child and removes handlers after close", async () => {
    const previous = process.listeners("SIGTERM");
    await launch();
    const handler = process.listeners("SIGTERM").find((listener) => !previous.includes(listener));
    expect(handler).toBeDefined();
    handler!("SIGTERM");
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    child.emit("close", null, "SIGTERM");
    expect(process.listeners("SIGTERM")).toEqual(previous);
    expect(process.exitCode).toBe(1);
  });
});
