# FitSocial Admin Studio

Separate Windows desktop prototype built with Electron, React and strict TypeScript. It uses fictional, in-memory fixtures only. No one is signed in. No production API, database, storage, credentials, mobile state, administrative writes, notification delivery, payments or real rewards are connected. Existing backend architecture is a proposal; this UI does not establish backend readiness.

## Run locally

Use Node 24 and npm, matching the repository's `.nvmrc` and mobile conventions. From `admin-desktop/` in PowerShell:

```powershell
npm.cmd ci
npm.cmd start
```

`npm start` is the same command; use `npm.cmd start` if PowerShell blocks the npm `.ps1` shim. Keep the terminal open while using the app. Startup prints the resolved main entry and a desktop-loaded message. Close the app window to exit. Re-running the launcher focuses the existing app rather than opening a duplicate window.

After an existing build, launch without rebuilding using:

```powershell
node scripts/launch.mjs
```

The launcher starts the installed Electron executable with the absolute `dist/electron/main.js` entry, inherited terminal output and visible Windows process settings. It removes `ELECTRON_RUN_AS_NODE` only from the child's environment. Smoke mode alone uses hidden software rendering and separate local Chromium state.

Electron downloads its platform runtime on first use if needed. A network-restricted installation may require explicitly downloading that dependency first:

```powershell
$env:electron_config_cache = Join-Path (Get-Location) '.npm-cache/electron'
node node_modules/electron/install.js
```

`start` compiles local assets and launches the desktop application. It does not run a web server or connect services. Close and restart after editing. There is no installer, signing, auto-update or release packaging configuration. `build` creates ignored local JavaScript/CSS output only; it does not package a release.

## Windows startup troubleshooting

- **Build output missing:** run `npm.cmd start` to rebuild both renderer and main-process files. Do not run renderer HTML directly or edit generated `dist/` files.
- **No visible window with the old launcher:** its unconditional `windowsHide: true` could suppress Electron's first native window on Windows. The current launcher uses `false` for interactive startup. Check the terminal for the resolved entry and any nonzero exit/signal report. An already-running current instance is restored/focused.
- **A stale pre-fix process holds Chromium cache files:** close any existing Admin Studio window first. If it has no window, inspect the specific Electron process/path in Task Manager before ending it. Do not end all Electron processes; other applications may use Electron. This app keeps local state in `.local-state/`, and smoke tests use `.local-state/smoke/`.
- **Direct-launch diagnostic:** from `admin-desktop/`, use the already-installed runtime below. This bypasses the custom launcher; it does not download dependencies. Unlike the custom launcher, the direct CLI inherits `ELECTRON_RUN_AS_NODE`, so remove that variable from this terminal first if present.

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
.\node_modules\.bin\electron.cmd .\dist\electron\main.js
```

- **Startup error or renderer load failure:** keep the launching terminal open and read the error. Main-process load failures also display an error dialog during interactive startup. Check that dependency installation completed and rebuild before retrying. Do not work around errors by disabling sandboxing, context isolation, web security or CSP.
- **Smoke capture fails on a restricted execution host:** `npm.cmd run smoke` uses hidden software offscreen rendering; the host must permit Electron child processes. Passing smoke checks does not substitute for visible desktop verification.

## Prototype coverage

Overview includes sample metrics, an accessible weekly chart, review shortcuts and fictional activity. Users, Content Moderation, Trainers, Shop, Orders, Rewards, Notifications, Analytics, Team and Settings have distinct sample records with local search, empty results and clear read-only disclosures. Team invites are visibly unavailable. Search and navigation reset on restart; no business data is persisted. Electron's local Chromium preferences and cache stay under ignored `.local-state/`.

Reusable Sidebar, Panel, MetricCard, Status, Icon and DataTable components share compact dark/lime theme tokens. Navigation uses native keyboard-operable buttons, current-page semantics, heading focus and a skip link. Tables include captions, column/row headers and keyboard-accessible horizontal overflow. Search fields have labels and result announcements. The window minimum is 900 × 640; the layout reflows below 1150 pixels, with an additional narrow-screen fallback for browser inspection. Long content remains scrollable.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run smoke
```

Vitest/Testing Library checks every module, keyboard selection, heading focus, local search/empty recovery, disabled invites, and URL/CSP/security boundaries. `smoke` opens a hidden real Electron window, exercises all modules and security checks, captures `dist/overview-1440.png` and `dist/overview-900.png`, then exits. It has no privileged renderer bridge. Screenshots and build/dependency caches are ignored.

See [future secure architecture](SECURITY_ARCHITECTURE.md), [Task 036A verification](TASK_036A_VERIFICATION.md) and [Task 037A startup verification](TASK_037A_VERIFICATION.md) for evidence and limitations. FitSocial mobile files are not imported or modified by this application.
