# Task 037A — Windows startup fix

Date: 2026-11-16

## Root cause

The custom launcher unconditionally used `windowsHide: true`, including interactive desktop startup. In this Windows environment that suppressed Electron's first native application window. The process could remain alive without a visible window, so absence of a window did not necessarily mean Electron had actually exited. The previous launcher had no entry/readiness messages to make that distinction clear.

Controlled Windows A/B launches using the same installed Electron executable, environment and built main process established:

| Entry argument | windowsHide | Result after startup |
| --- | --- | --- |
| `.` | true | Process running; native MainWindowHandle 0, empty title |
| Absolute `dist/electron/main.js` | true | Process running; native MainWindowHandle 0, empty title |
| `.` | false | Visible FitSocial Admin Studio window; native handle 1640242 |
| Absolute `dist/electron/main.js` | false | Visible FitSocial Admin Studio window; native handle 1705778 |

The installed Electron CLI (`node_modules/electron/cli.js`) also uses `windowsHide: false`. Thus package-directory resolution was not the reproduced root cause; package.json's existing `main: dist/electron/main.js` and generated entry were correct. The fix additionally uses an absolute main entry to match the known working direct invocation and remove working-directory ambiguity.

The tool host has `ELECTRON_RUN_AS_NODE=1`. The original launcher already removed it from the child's environment, so it was not the cause here. That protection remains, without changing the user's parent environment. The compiled main process correctly selected normal visible rendering unless explicitly passed `--smoke-test`.

## Fix

- Interactive launcher uses `windowsHide: false`; only explicit smoke runs remain hidden. No shell interpolation or detached/unreferenced child process is introduced.
- Launches the existing absolute `dist/electron/main.js` entry with inherited terminal streams and the app root as cwd. No package-script change was necessary: `npm start` still builds and invokes this launcher.
- Checks for missing build output, prints the resolved entry, catches dependency/spawn errors, reports nonzero child exits/signals and forwards the actual exit code. Terminal SIGINT/SIGTERM handlers forward termination to the child and are removed on close.
- Main process keeps a reference to the window, explicitly shows/focuses it after successful load and prints desktop readiness. Main-process startup/load errors retain terminal diagnostics and now show an interactive error dialog.
- Uses Electron's single-instance lock. A second interactive invocation restores/focuses the existing window instead of creating another one. Smoke runs have separate `.local-state/smoke/` Chromium state/instance locks, so they do not focus or interfere with an interactive app.
- Context isolation, sandboxing, Node integration restrictions, web security, custom asset allowlisting, permission/navigation/window/download denials and CSP remain intact. No renderer, fixture, business logic, API or mobile changes were made.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS — renderer/tests and Electron main process |
| `npm.cmd run lint` | PASS — no warnings/errors |
| `npm.cmd test` | PASS — 38 tests across 3 files, including all original 31 tests |
| Production asset build (`npm.cmd run build`, also run by start/smoke) | PASS — local compilation only |
| `npm.cmd run smoke` | PASS — exit 0, all 11 modules accessible, current navigation selection, renderer isolation, blocked remote/unknown assets and desktop layout checks |
| Visible Windows `npm.cmd start` | PASS — native app window displayed after normal build, with desktop-loaded log |
| Second `node scripts/launch.mjs` invocation | PASS — exit 0, original window retained, single-instance focus reported, no duplicate |
| Normal desktop window close | PASS — `npm start` exited 0; no Electron descendants from the verification launch remained |
| `git diff --check` | PASS — prior mobile line-ending notices only |
| New/previously untracked changed-file whitespace checks | PASS — empty-baseline Git checks for all five task files, recognizing CRLF per `.editorconfig` |

The successful visible lifecycle check recorded main PID 25036, nonzero native window handle 199608 and title “FitSocial Admin Studio — Demo”. It launched the actual npm start chain, inspected only its process tree, invoked the launcher a second time, then requested normal native window closure and verified shutdown. Temporary verification scripts/logs are under ignored `.npm-cache/`. Each A/B probe cleaned up only its own process tree. Pre-existing Electron processes were not terminated.

Seven new launcher regression tests check visible interactive settings, explicit entry/path handling, smoke flag forwarding, child-only removal of ELECTRON_RUN_AS_NODE, missing-build/dependency/spawn failures, child exit-code reporting and terminal termination handler cleanup. The first lifecycle harness run successfully displayed the app but could not retrieve a second process's exit code because of a PowerShell Process-handle caching issue; the harness was corrected to acquire handles before waiting, and the complete lifecycle check then passed. This did not require another application change.

## Exact files changed by Task 037A

1. `admin-desktop/scripts/launch.mjs`
2. `admin-desktop/electron/main.ts`
3. `admin-desktop/src/launcher.test.ts` — new
4. `admin-desktop/README.md`
5. `admin-desktop/TASK_037A_VERIFICATION.md` — new

`package.json`, lockfile, existing security policy, CSP, renderer modules and previous task reports were preserved. Generated `dist/electron/main.js` was regenerated from source by the build; dist output remains ignored, not a source edit. No dependencies added or changed. No mobile, backend, database or root files edited. All unrelated uncommitted work preserved. Nothing staged, committed, pushed, deployed or release-packaged; no installer or audit fix command run.

## Remaining limitations

- Visible Windows startup/second-launch/normal-close verification was performed in this environment. All modules were exercised through the real Electron smoke test; the user's prior manual verification of all eleven modules was not repeated manually module by module.
- Existing pre-fix Electron processes holding shared Chromium state caused cache-access warnings during interactive verification, but did not prevent the app loading. Those pre-existing processes were left untouched. README explains checking the specific stale app process rather than terminating all Electron applications.
- Smoke uses software offscreen rendering; interactive startup retains its normal hardware-accelerated configuration. No renderer security setting was disabled. No macOS/Linux, additional Windows/DPI setups, full screen-reader audit or real authentication/backend validation was performed.
- Ctrl+C/SIGTERM forwarding is regression-tested with a mocked child; the live lifecycle test used normal window close. This remains a local fictional-data prototype, with no production-readiness claim or live administration.

References: [Electron application entry point](https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app), [Node child-process options](https://nodejs.org/api/child_process.html). Root-cause evidence above comes from local Windows A/B execution, not an assumption that windowsHide affects every platform identically.
