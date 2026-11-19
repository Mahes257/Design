# CAD direct open — root cause, launch mechanisms, local bridge, FreeCAD and eDrawings verification

Implementation report for the shared **Open in CAD Software** flow used by Drawing & CAD
Management (CAD Viewer, CAD File Repository, Drawing Management, drawing attachments) and by
Engineering Analysis → Simulation Workspace.

Frontend: React + Vite at `http://localhost:5173`. Local helper: `tools/cad-bridge` (Node, Windows
registry detection, allowlisted launch). No database, backend, ERP module or unrelated route was
changed.

Date: 2026-11-18

---

## 1. Root cause of "Fusion-only" behaviour

A browser cannot enumerate installed Windows programs, read file associations, or start an
executable. Its only native route to a desktop application is a **registered custom URL protocol
handler**, and only Autodesk documents one for opening a CAD file
(`fusion360://host/?command=open&file=…`). Consequently:

| Application | Documented browser protocol | Behaviour before this work |
| --- | --- | --- |
| Autodesk Fusion | Yes (`fusion360://`) | Could launch — the only application with any mechanism |
| SolidWorks | No | No mechanism at all; the dialog could only offer a download |
| eDrawings | No | Same |
| AutoCAD | No | Same |
| FreeCAD | No | Same |
| Inventor / CATIA / Solid Edge / DraftSight / … | No | Same |

The bridge client existed in the frontend but **there was no helper process behind it**, so every
non-Fusion selection ended in "could not be launched". The permanent Fusion button also created a
second, independent launch path.

## 2. What was built

### 2.1 Local bridge (`tools/cad-bridge`)

```
GET  /cad-bridge/health
GET  /cad-bridge/capabilities   → installed applications resolved from the Windows registry
POST /cad-bridge/open           → launches ONE allowlisted application with ONE original file
```

- `server.mjs` — loopback HTTP service, detection, file materialisation, launch, validation.
- `catalogue.mjs` — allowlist: application id, real executable names, product match, extensions.
- Start with `npm run cad-bridge` (script added) or `node tools/cad-bridge/server.mjs`.
- Binds `127.0.0.1:47823`; not part of the Vite bundle; not auto-started.
- Instructions and API: `tools/cad-bridge/README.md`.

### 2.2 Detection (registry only — no guessed install folders)

Per application, in order:

1. `HKLM/HKCU\SOFTWARE\...\App Paths\<exe>` (64-bit, WOW6432Node, per-user);
2. `HKCR\Applications\<exe>\shell\open\command`;
3. `HKCR\.<ext>\OpenWithProgids` → ProgID → `HKCR\<ProgID>\shell\open\command` (first 12
   extensions), accepted only when the resolved program name matches the catalogue;
4. uninstall entries whose display name matches the product: `DisplayIcon`, `InstallLocation`,
   `InstallDir` and `UninstallString` are all used to locate the program, testing
   `<dir>\<exe>`, `<dir>\bin\<exe>` and `<dir>\program\bin\<exe>`.

If nothing resolves an existing `.exe`, the application is reported **not installed**.

### 2.3 Launch

`POST /cad-bridge/open` accepts only `applicationId`, `fileName`, optional `recordRef` and either
the original bytes (`file`, multipart) or an allowlisted `fileUrl`. Any `executable`, `command`,
`args` or `path` field is rejected. The extension must be in that application's list, the file is
written to a private temp folder keeping its filename, and the registry-resolved executable is
spawned with exactly that path (`spawn(exe, [file], {detached: true})`, no shell). `opened: true`
is returned only after a real spawn; spawn errors return the actual message.

### 2.4 Defects found and fixed while verifying FreeCAD and eDrawings

The first version still failed for applications that are actually installed on this computer.
Four real bugs:

1. **Detection missed it.** FreeCAD is installed at `D:\CAD\bin\FreeCAD.exe`, its uninstall key
   (`FreeCAD114`) has an **empty `InstallLocation`**, and the executable lives in the `bin`
   subfolder. The old uninstall branch only looked at `InstallLocation\<exe>` and skipped blank
   locations. Fixed by resolving `DisplayIcon`/`UninstallString`, adding `bin` candidates, and
   scanning more `OpenWithProgids` extensions. FreeCAD now reports
   *"Installed and available"*.
2. **The launch result panel disappeared.** The bridge row exposes `applicationId`, not `id`, so the
   result was tagged with `appId: undefined` and the "application launched" panel was hidden even
   though FreeCAD had started. Fixed by tagging the result with the catalogue id of the selected
   application.
3. **A failed bridge probe was cached for the whole browser session.** Starting the bridge after the
   first dialog open still showed "detection unavailable" until the page was reloaded. Fixed in
   `probeCadBridge`: only a successful probe is cached, so the next dialog open re-checks and picks
   up a bridge started later (verified: bridge stopped → dialog showed unavailable; bridge started
   → reopening the dialog connected and reported FreeCAD without pressing Check again).
4. **The registry scan was never repeated.** eDrawings 2026 was installed while the bridge was
   already running, so the cached scan from an earlier start still said "not installed" and the
   button reported eDrawings as unavailable. Fixed with a throttled re-scan: `GET /capabilities?
   refresh=1` (used by **Check again**) and a single re-scan before an open request is refused, so a
   freshly installed application works without restarting the helper. Bridge version 1.1.1.

### 2.5 Launch action state

The primary action is enabled only when a verified mechanism exists for the exact selection — the
bridge reports that application for this extension, or the vendor documents a protocol handler.
Otherwise it is disabled and the dialog explains why (install the app / start the bridge / download
the original), so no other application can ever be started in its place.

## 3. Application-specific mechanisms

| Application | Detection | Launch | Formats |
| --- | --- | --- | --- |
| FreeCAD | registry — verified here (`D:\CAD\bin\FreeCAD.exe`) | bridge, own id | STEP/STP, IGES/IGS, STL, OBJ, PLY, DXF, DWG, FCStd, BREP, 3MF, glTF/GLB, SVG |
| SolidWorks | registry (`SLDWORKS.exe`) | bridge only, no invented `solidworks://` | SLDPRT/SLDASM/SLDDRW native; STEP/IGES/STL/DXF/DWG import |
| eDrawings | registry — verified here (`C:\Program Files\Common Files\eDrawings2026\eDrawings.exe`, detected via `uninstall:eDrawings`) | bridge only, independent id | EPRT/EASM/EDRW native; SLD*, STEP, IGES, STL, OBJ, DXF/DWG, Inventor, CATIA, PRT/ASM (view) |
| AutoCAD | registry (`acad.exe`) | bridge only | DWG, DXF, DWT |
| Fusion 360 | registry (`Fusion360.exe`) **and** the preserved documented protocol | protocol or bridge when detected | F3D native; neutral/interchange import |
| Inventor, CATIA, Solid Edge, DraftSight, BricsCAD, ZWCAD, LibreCAD, QCAD, Rhino, Blender, Inkscape, Illustrator, CorelDRAW, Acrobat | registry | bridge only, per id | per catalogue |

Every request carries the selected `applicationId`; there is no fallback branch in the client or the
bridge. Selecting eDrawings can never start SolidWorks, and nothing silently starts Fusion.

## 4. Browser permission behaviour

- **Fusion protocol path:** a real user-gesture navigation to `fusion360://`; Chromium/Edge/Windows
  may prompt, remember the choice or block it. The ERP never renders a fake Allow button and cannot
  pre-approve anything; it reports only an observed handoff, an unconfirmed attempt, or an error.
- **Bridge path (FreeCAD, SolidWorks, eDrawings, AutoCAD, …):** the launch is a same-page `fetch` to
  `127.0.0.1`, followed by a local process start by the helper. **The browser has no
  external-application permission prompt on this path** because it is not opening a protocol; the
  helper is what restricts the action to the allowlisted program.
- Nothing launches when the dialog opens or when a card is selected; only the primary button click
  issues the request.

## 5. Original-file handling

The dialog passes only the selected record's original — a browser session upload or the stored
asset — never a converted preview. Session uploads travel as multipart bytes with the original
filename; stored assets travel as an `http(s)` URL the bridge fetches from an allowlisted origin.
Both become a temp file with the same filename and extension, and the original is never modified.
Verified during the FreeCAD test: the temp folder contains `rounded-cube.step` twice (once per
attempt), both with the exact original name and contents downloaded from the ERP asset.

## 6. Actual verification on this computer

### 6.1 Bridge API

| Check | Result |
| --- | --- |
| `GET /health` | `200`, service `mechanical-design-cad-bridge`, version `1.1.1` |
| `GET /capabilities?refresh=1` | `200`; reports **eDrawings** (25 extensions, `uninstall:eDrawings`) and **FreeCAD** (15 extensions, `app-paths`) |
| Unknown id (`notepad`) | `400` — not in the allowlist |
| `.txt` for SolidWorks | `415` with the permitted extensions |
| SolidWorks `.sldprt` (not installed here) | `409` — "not installed … or executable could not be resolved" |
| Foreign origin (`http://evil.example`) | `403` |
| `executable` field injection | `400` — executables/commands/arguments/paths rejected |
| CORS preflight | `204` with the allowed origin/methods/headers |
| Multipart original upload | Parsed and accepted (rejected only at the installed check for SolidWorks) |

### 6.2 FreeCAD end-to-end (real launch)

1. `check again` in the dialog → *"Local CAD bridge connected (Bridge 1.1.1) — 2 installed
   applications reported."*
2. FreeCAD card → *"Installed and available"*; selection → button `Open in FreeCAD`.
3. Click → bridge log: `[cad-bridge] launched freecad · rounded-cube.step · ref=sample-step`.
4. Windows process list immediately after: `freecad.exe` (PID 38724) started by the bridge.
5. Dialog → *"Opening the selected file in FreeCAD… The bridge started FreeCAD with the original
   file. The original file was handed over unchanged; this page cannot confirm that the
   application finished loading it."*
6. No fallback application started; the SolidWorks/eDrawings cards remained untouched.

The exact document rendering inside FreeCAD cannot be observed by the page, so the UI states the
handoff rather than claiming the model finished loading. Two supporting checks were made outside
the page:

- FreeCAD's own user configuration (`%APPDATA%\FreeCAD\v1-1\user.cfg`) records the bridge temp file
  `mechanical-design-cad-bridge/f94cd0fa…/rounded-cube.step` in its recent-files data, so FreeCAD
  did receive and register the launched file.
- The same materialised file was imported headlessly by the installed FreeCAD:
  `FreeCADCmd.exe` + `Import.insert(path)` → `BRIDGE_IMPORT_OBJECTS 1`. The original bytes are a
  valid STEP that this FreeCAD version opens.

- Windows UI Automation on the FreeCAD window reports the imported document tree:
  `Unnamed`, `Body`, and the preselected `Unnamed.Part__Feature.Edge7` — i.e. the STEP import
  produced real Part geometry in the running application, not an empty instance.

FreeCAD opens imported STEP/IGES content in a new, still unnamed document (window title
`* Unnamed - FreeCAD 1.1.4`), which is normal for its Import workflow — it is not a failed open.

### 6.3 eDrawings end-to-end (real launch)

eDrawings is installed at `C:\Program Files\Common Files\eDrawings2026\eDrawings.exe`
(uninstall key `{63784A34-…}`, `DisplayName: eDrawings`, `InstallLocation: C:\Program Files\Common
Files\eDrawings2026\`, empty `DisplayIcon`, `UninstallString: MsiExec.exe /I{63784A34-…}`).

1. **Check again** in the dialog → bridge connected, **2 installed applications reported**.
2. eDrawings card → *"Installed and available"*; selection → button `Open in eDrawings`
   (enabled, because the bridge reports eDrawings for `.step`).
3. Click `Open in eDrawings` → UI: *"Opening the selected file in eDrawings… The bridge started
   eDrawings with the original file. The original file was handed over unchanged; this page cannot
   confirm that the application finished loading it."*
4. Bridge log: `[cad-bridge] launched edrawings · rounded-cube.step · ref=sample-step`.
5. eDrawings was already running; the launch handed the file to that instance (one `eDrawings.exe`
   process remained, no second process), which is the best supported behaviour for a single-instance
   viewer.
6. eDrawings' own **recent document list** (`HKCU\Software\eDrawings\e2026\Recent Document List`)
   gained the new bridge temp path `…\mechanical-design-cad-bridge\cd4c254f…\rounded-cube.step`,
   proving the viewer actually loaded the handed-over original, not merely that a process started.
7. Unsupported format: `POST /open` with `applicationId: edrawings` and `notes.txt` → `415` listing
   the permitted extensions; nothing was launched.
8. Independence: SolidWorks was requested for the same `.step` → `409` (not installed here); the
   bridge did not substitute eDrawings, FreeCAD or Fusion. FreeCAD remained independently detected
   and launchable.

The eDrawings main window title stays `eDrawings` (it does not show the document name), so the
recent-document list is the reliable confirmation of a loaded file.

### 6.4 Test matrix

| Application | Detection | Browser handoff | Actual file opened |
| --- | --- | --- | --- |
| FreeCAD | **Pass** (registry, `D:\CAD\bin\FreeCAD.exe`) | **Pass** (bridge connected, request sent) | **Pass** — process started with the exact original; that exact temp file imports in FreeCAD (1 object) and is recorded in FreeCAD's recent files. GUI rendering not observable by the page. |
| SolidWorks | Not detected — not installed | Attempt correctly refused (`409` at the API; disabled action in the UI) | Not Tested — App Not Installed |
| eDrawings | **Pass** (registry, `C:\Program Files\Common Files\eDrawings2026\eDrawings.exe`) | **Pass** — `Open in eDrawings` sent the STEP; bridge launched it; no browser prompt involved | **Pass** — the viewer's recent-document list records the launched temp file (STEP). Unsupported `.txt` rejected with `415`. |
| AutoCAD | Not detected — not installed | Same | Not Tested — App Not Installed |
| Inventor / CATIA / Solid Edge / DraftSight | Not detected — not installed | Same | Not Tested — App Not Installed |
| Fusion 360 | Not detected (no registry entry, no `fusion360` handler on this PC) | Not Tested — App Not Installed | Not Tested — App Not Installed |

## 7. To use it on a workstation

1. Install the application; its installer writes the registry entries the bridge reads.
2. Start the bridge: `npm run cad-bridge` (keep the window open).
3. In the ERP: **Open in CAD Software** → select the app (it must read *Installed and available*) →
   **Open in [Application]**.

Other origin: `CAD_BRIDGE_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173" npm run cad-bridge`.

## 8. Screenshots (captured from the running application)

| File | Shows |
| --- | --- |
| `16-edrawings-launched-original-file.png` | eDrawings selected and installed, button `Open in eDrawings`, bridge reporting 2 installed applications. |
| `17-edrawings-launch-result.png` | Handoff result after the bridge started eDrawings with `rounded-cube.step`. |
| `14-freecad-installed-and-available.png` | FreeCAD card installed and selected, button `Open in FreeCAD`, bridge reporting 1 installed application. |
| `15-freecad-launched-original-file.png` | Real handoff result after the bridge started FreeCAD with `rounded-cube.step`. |
| `11-bridge-connected-no-installed-apps.png` | Earlier state before the detection fix: bridge connected, no applications found. |
| `12` / `13` | SolidWorks selected and the honest refusal while it was not installed. |
| `01`–`10` | Selection cards, SolidWorks/eDrawings/FreeCAD/AutoCAD selections, missing-application state, Simulation Workspace action/modal/context. |

## 9. Files created or modified

| File | Change |
| --- | --- |
| `tools/cad-bridge/catalogue.mjs` | **New.** Allowlisted ids, real executable names, product match, extensions. |
| `tools/cad-bridge/server.mjs` | **New.** Registry detection (App Paths, HKCR Applications, OpenWithProgids, uninstall `DisplayIcon`/`InstallLocation`/`UninstallString`/`bin`), capabilities, original-file materialisation, allowlisted launch, origin/extension/executable validation, temp pruning. |
| `tools/cad-bridge/README.md` | **New.** Start/stop, env vars, detection, API, security, status. |
| `package.json` | Added `"cad-bridge": "node tools/cad-bridge/server.mjs"`. |
| `src/data/cadLaunch.js` | Probe timeout 6 s (cold registry scan); negative probes no longer cached; forced probe sends `?refresh=1` so Check again re-reads the registry; `CAD_BRIDGE_START_COMMAND`; comments updated. |
| `src/pages/cad/OpenInCadSoftware.jsx` | Bridge-start guidance; disabled launch when no verified mechanism; result tagged with the catalogue application id (fixes the hidden handoff panel); launch note is now mechanism-aware (no browser prompt on the bridge path). |
| `src/styles/cad.css` | Style for the bridge guidance line. |
| `docs/cad-drawing-software-direct-open-report.md` | This report. |

No CAD/simulation workflow logic (previews, records, revisions, URL preview, downloads) was changed.

## 10. Build result

`npm run build` → **exit 0**, 2,365 modules, CSS 372.31 kB, JS 3,605.21 kB, WASM 7,604.03 kB. Only
the two pre-existing warnings (chunk > 500 kB, `occt-import-js` externalising `path`/`crypto`). No
console errors during the tests above.

## 11. Remaining limitations

- A local helper is required for every application except Fusion; without it only the download path
  is available.
- Applications must be installed and registry-registered; portable builds that write no registry
  entries are not detected (and are not launched).
- The bridge must run on `127.0.0.1:47823`; it is not auto-started and no installer was added.
- `opened: true` proves the process started with the exact file, not that the document finished
  loading. eDrawings keeps the window title as `eDrawings`; its recent-document list is what
  confirms the file was loaded.
- The bridge re-scans the registry on **Check again** and once before refusing an open; it does not
  watch for installations continuously, so a newly installed program appears on the next check.
- Formats outside an application's catalogue list are rejected with a clear message instead of being
  attempted.
- Siemens NX, Creo and similar tools are absent from the bridge allowlist because their executable
  names/arguments are not certain; add them only with verified values in
  `tools/cad-bridge/catalogue.mjs`.
