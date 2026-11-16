import type { BrowserWindow } from "electron";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Explicit opt-in local verification only. No IPC or renderer test bridge exposed.
export async function runSmoke(window: BrowserWindow) {
  const check = async (script: string) => {
    if (!await window.webContents.executeJavaScript(script)) throw new Error(`Smoke assertion failed: ${script}`);
  };
  await check(`new Promise(resolve => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (document.querySelector('h1')) { clearInterval(timer); resolve(true); }
      else if (Date.now() - started > 10000) { clearInterval(timer); resolve(false); }
    }, 30);
  })`);
  await check(`document.querySelector('h1').textContent === 'Overview' && document.querySelectorAll('nav button').length === 11`);
  await check(`typeof window.require === 'undefined' && typeof window.process === 'undefined'`);
  await writeFile(join(import.meta.dirname, "../overview-1440.png"), (await window.webContents.capturePage()).toPNG());
  for (const label of ["Users", "Content Moderation", "Trainers", "Shop", "Orders", "Rewards", "Notifications", "Analytics", "Team", "Settings", "Overview"]) {
    await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.startsWith(${JSON.stringify(label)})).click()`);
    await check(`new Promise(resolve => setTimeout(() => resolve(document.querySelector('h1').textContent === ${JSON.stringify(label)}), 50))`);
    await check(`document.querySelectorAll('nav [aria-current="page"]').length === 1`);
  }
  window.setSize(900, 720);
  await check(`new Promise(resolve => setTimeout(() => resolve(document.documentElement.scrollWidth <= window.innerWidth), 150))`);
  await writeFile(join(import.meta.dirname, "../overview-900.png"), (await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('nav button')).find(b => b.textContent === 'Users').click()`);
  await check(`new Promise(resolve => setTimeout(() => resolve(document.querySelector('table') && document.documentElement.scrollWidth <= window.innerWidth), 100))`);
  await writeFile(join(import.meta.dirname, "../users-900.png"), (await window.webContents.capturePage()).toPNG());
  await check(`fetch('https://example.com').then(() => false, () => true)`);
  await check(`fetch('fitsocial-admin://app/not-an-asset').then(r => !r.ok, () => true)`);
  console.log("Electron smoke PASS: 11 modules, selection, renderer isolation, denied network/unknown assets, 1440/900 layouts; screenshots in dist/.");
}
