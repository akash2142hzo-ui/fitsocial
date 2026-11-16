import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { assetForUrl, WINDOW_SECURITY } from "../electron/security.ts";

const assets = new Set(["/index.html", "/assets/app.js", "/assets/app.css"]);
const root = join(process.cwd(), "dist/renderer");

describe("Electron resource boundary", () => {
  it("serves only explicit renderer assets", () => {
    expect(assetForUrl("fitsocial-admin://app/index.html", root, assets)).toBe(join(root, "index.html"));
    expect(assetForUrl("fitsocial-admin://app/assets/app.js", root, assets)).toBe(join(root, "assets/app.js"));
  });
  it.each([
    "https://example.com/index.html", "file:///C:/Windows/win.ini", "fitsocial-admin://other/index.html",
    "fitsocial-admin://app/private.txt", "fitsocial-admin://app/assets/%2e%2e/%2e%2e/private.txt",
    "fitsocial-admin://app/%2e%2e%5cprivate.txt", "fitsocial-admin://app/%00", "fitsocial-admin://app/%zz",
    "fitsocial-admin://user:password@app/index.html", "fitsocial-admin://app:9000/index.html",
    "fitsocial-admin://app/index.html?secret=x", "fitsocial-admin://app/index.html#other", "not a URL",
  ])("rejects untrusted URL %s", (url) => expect(assetForUrl(url, root, assets)).toBeNull());
  it("requires isolation, sandboxing and no Node integration", () => {
    expect(WINDOW_SECURITY).toMatchObject({ nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false });
  });
  it("ships a restrictive offline CSP without inline script allowances", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("script-src 'self'");
    expect(html).not.toContain("unsafe-inline");
    expect(html).not.toContain("unsafe-eval");
  });
});
