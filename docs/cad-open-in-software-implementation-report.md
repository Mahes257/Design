# CAD Viewer — Open in CAD Software

Implementation report for the **Open in CAD Software** action in the Mechanical
Design ERP (`C:\Users\Mahes\Desktop\Design`, React + Vite, `localhost:5173`).

The reference ERP at `localhost:5174` was not read or modified.

---

## 1. Existing CAD file storage mechanism (inspected, unchanged)

| Layer | Behaviour |
| --- | --- |
| `src/context/CadContext.jsx` | CAD file records (metadata) are persisted in `localStorage` under `md-cad-state-v1`. |
| Bundled assets | Seeded records may reference a real file under `public/cad-samples/…` through `assetPath` (e.g. `CAD-2026-002` → `/cad-samples/drive-assembly.obj`). These are the actual original bytes served by Vite. |
| Uploaded files | `addFile` / `createFileVersion` call `URL.createObjectURL(file)` and keep `{ url, name, size, file }` in an **in-memory** `localFiles` map. This is session-only, by design; refreshing the page drops those bytes and the repository record keeps metadata only. |
| Metadata-only records | Several seeded records (`CAD-2026-005`, `CAD-2026-008`, `CAD-2026-010`) deliberately have `assetPath: ''` and no session upload. They are downloadable/previewable records with no bytes in this build. |
| Existing download | `CadViewerTab.download()` and `CadRepositoryTab.download()` create an `<a download>` pointing at `localFiles[id].url || file.assetPath`. |

The new feature reuses exactly this resolution order and never invents a path.

## 2. Supported file formats

Format capability is still derived from the **actual selected file extension**
(`extensionOf`) and the existing `previewCapability` table
(`src/data/cadCapability.js`). The new compatibility table adds:

DWG, DXF, DGN, STEP, STP, IGES, IGS, SLDPRT, SLDASM, SLDDRW, IPT, IAM, IDW,
CATPART, CATPRODUCT, PRT, ASM (Creo), F3D, STL, OBJ, 3MF.

Formats without a CAD-application mapping (SVG, PDF, PNG/JPG and other 2D media,
TXT/DOC and other documents) are handled explicitly: they show "No CAD
application is mapped to .EXT" instead of a fabricated application list.

## 3. Compatible applications considered

`src/data/cadApplications.js` (compatibility reference, not an installation
claim):

| Format | Applications |
| --- | --- |
| DWG | AutoCAD, BricsCAD, DraftSight, ZWCAD (native); FreeCAD (import) |
| DXF | AutoCAD, BricsCAD, DraftSight, LibreCAD, ZWCAD (native); FreeCAD (import) |
| DGN | MicroStation (native); AutoCAD (import) |
| STEP / STP | SolidWorks, Inventor, Solid Edge, CATIA, Fusion 360, FreeCAD (import) |
| IGES / IGS | SolidWorks, Inventor, Solid Edge, CATIA, Fusion 360, FreeCAD (import) |
| SLDPRT / SLDASM / SLDDRW | SolidWorks (native); eDrawings Viewer (view) |
| IPT / IAM | Inventor (native); Fusion 360 (import) |
| IDW | Inventor (native) |
| CATPART / CATPRODUCT | CATIA, 3DEXPERIENCE (native) |
| PRT / ASM | Creo Parametric (native) |
| F3D | Fusion 360 (native) |
| STL | SolidWorks, Inventor, Fusion 360, FreeCAD, CATIA (import) |
| OBJ | Fusion 360, FreeCAD, Blender (import) |
| 3MF | PrusaSlicer, Bambu Studio, Microsoft 3D Builder (import) |

Only the applications for the selected extension are displayed, each labelled
native / import / view-only.

## 4. Software detection approach implemented

**None of the fake-detection approaches were used.** A browser page cannot read
the Windows registry, enumerate installed programs or start an `.exe`, and no
CAD vendor documented here exposes a public URL protocol for opening an
arbitrary local file. Therefore:

- **Approach A (registered protocol) — evaluated, not implemented.** No verified
  public protocol could be confirmed for AutoCAD, Inventor, SolidWorks, Solid
  Edge, CATIA, Fusion, FreeCAD or eDrawings. Inventing a scheme name (e.g.
  `autocad://`) would be a fabricated integration, so none is registered or
  navigated to.
- **Approach B (native helper) — documented, not installed.** See section 10.
- **Approach C (Windows file association fallback) — implemented.** This is the
  only reliable mechanism available to a plain web page.

The UI therefore reports installation status as **not detected**, never as
"confirmed not installed", and never says a file was launched.

## 5. Direct-launch capabilities and limitations

- Direct launch from the browser: **not available**, and not claimed.
- The dialog states plainly: "Direct CAD application launch is unavailable in
  this browser", with the reason (no registry/program access, no executable
  start from a page) and a mention that automatic launch needs the optional
  desktop helper.
- No "Launching…" state exists because no launch path exists. The only success
  confirmation is for the download, which the page can actually observe.

## 6. Download/open fallback behaviour

The dialog:

1. Resolves the **exact selected record** (never the previous selection, never a
   converted preview): viewer selection (`selectedFile` / `selectedSample` /
   `selectedDrawing` attachment) or the clicked repository row.
2. Preserves the original filename and extension: session uploads use the
   stored original blob name; bundled records use `record.fileName`.
3. Downloads via `anchor.download` with the unchanged blob/asset URL — no
   conversion, no overwrite.
4. Explains the Windows step: download → open, or right-click → *Open with* a
   compatible application.
5. Shows the compatible-application chips for that extension.

Distinct states implemented:

| State | UI |
| --- | --- |
| File bytes present | Blue info block (launch unavailable) + application chips + enabled **Download Original File** |
| Record has no bytes (metadata-only / refreshed session upload) | Amber warning "Original file bytes are not available", download disabled, explanation to register/upload the file |
| Extension has no CAD mapping (SVG, PDF, TXT…) | "No CAD application is mapped to .EXT in this build" + download still available when bytes exist |
| Compatible applications known | Chips per app with native/import/view role |
| Unsupported/unknown extension | Same "no mapping" state, no fabricated list |

## 7. Where the action appears

- **CAD Viewer toolbar** — next to the 2D/3D mode switch, always bound to the
  current selection.
- **CAD Viewer Information panel** — one button in each of the file, sample and
  drawing info panels, bound to that panel's record.
- **CAD File Repository row actions** — "Open in CAD Software" between *View
  details* and *Download file*.
- **CAD File Details modal footer** — "Open in CAD Software" alongside Open in
  Viewer and Download.

The existing 2D viewer, 3D viewer, Three.js scene, model tree, camera/zoom
controls, wireframe/solid modes, download, repository, drawing management and
revision/release flows were left untouched.

## 8. Files changed

Created (2):

- `src/data/cadApplications.js` — format → application compatibility reference and helpers.
- `src/pages/cad/OpenInCadSoftware.jsx` — `OpenInCadDialog`, `OpenInCadSoftwareButton`, `resolveOriginalFile`, `downloadOriginalFile`.

Modified (3):

- `src/pages/cad/CadViewerTab.jsx` — exact-selection launch target, toolbar button, three info-panel buttons.
- `src/pages/cad/CadRepositoryTab.jsx` — row action, details-modal action, dialog mount.
- `src/styles/cad.css` — dialog/backdrop/chips/steps styling.

Deleted: none. No dependency was added.

## 9. Test results (executed at localhost:5173)

| Test | Result |
| --- | --- |
| Viewer initial load | Opened with the previously selected session file `CAD-2026-014` (SVG); an `Open in CAD Software` toolbar button was present. |
| 3D preview still works | Selected `CAD-2026-002` (OBJ): `canvas` present, Three.js toolbar visible, "OBJ · Three.js". |
| 2D preview still works | `?file=CAD-2026-001`: `svg` rendered, "2D Drawing" mode active, Fit/zoom controls present. |
| Correct selected file | Dialog for `CAD-2026-002` showed `ASM-MEC-041-100_Drive-Assembly.obj`, `CAD-2026-002 · .OBJ` — the selected row, not a previous one. |
| STEP sample | `?sample=sample-step` → `rounded-cube.step`, chips: SolidWorks, Inventor, Solid Edge, CATIA, Fusion 360, FreeCAD. |
| Format filtering | DWG `CAD-2026-008` → only DWG-compatible apps (AutoCAD, BricsCAD, DraftSight, ZWCAD, FreeCAD). |
| Format mapping unit check (in-page import) | DWG/DXF/STEP/STP/SLDPRT/SLDASM/IPT/IAM/CATPART/CATPRODUCT/IGS/STL/OBJ/3MF all map; uppercase `.STP`/`.CATPART` normalise; SVG/PDF/TXT return no mapping. |
| Filename + original bytes on download | Intercepted anchor: `download="ASM-MEC-041-100_Drive-Assembly.obj"`, `href="/cad-samples/drive-assembly.obj"` (original asset, not a preview). |
| Missing file bytes | `CAD-2026-014` (after session bytes were gone) and `CAD-2026-008` (metadata-only DWG): amber "Original file bytes are not available" block, download disabled. |
| Unsupported format | SVG record: "No CAD application is mapped to .SVG in this build…", download enabled. |
| Repository row action | Menu for `CAD-2026-008` contained View, Preview, **Open in CAD Software**, Download, Edit, New version, Delete. |
| No fake launch claim | Dialog always states direct launch is unavailable; no "launched/opened" message appears anywhere. |
| Existing functionality | Repository table, drawing management and viewer modes unchanged; no console errors during any of the above. |

## 10. Build result

`npm run build` → **exit code 0** (only the pre-existing large-chunk advisory).

## 11. Native helper requirements (documented, not implemented)

Reliable detection and direct launching would need an optional Windows companion.
Nothing of this has been installed or claimed by the app:

1. A small signed desktop helper installed by the user (per-machine or per-user).
2. Registration of a protocol handler (for example `md-cad:`) with
   `HKCU\Software\Classes\md-cad` pointing at the helper, or a loopback HTTP
   service on `127.0.0.1` with a per-session token.
3. Detection through supported Windows mechanisms only:
   `HKLM/HKCU\Software\Classes\.<ext>` associations, `…\Classes\Applications`,
   and `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths`.
4. A fixed allow-list mapping extension → executable name; the helper must
   reject arbitrary paths and must not build an executable path from the
   filename supplied by the browser.
5. Passing the downloaded file to the application with its documented
   command-line argument, without shell execution.
6. Explicit user confirmation the first time a launch is attempted.

Until such a helper exists and is installed, this feature intentionally stops at
the original-file download and the Windows association workflow.

## 12. Known limitations

- Session-uploaded files disappear on page refresh (existing behaviour), after
  which the action correctly reports missing bytes.
- Bundled sample assets are real files in `public/cad-samples`, but they are
  demonstration assets, not user uploads.
- Installation status can never be confirmed from the browser; the UI says
  "not detected" rather than "not installed".
- Drawing Management rows do not carry file bytes of their own; their drawings
  are opened through the CAD Viewer, where the action is available on the
  selected drawing.
