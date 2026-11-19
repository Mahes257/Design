# 05 — CAD, Drawing and Conversion Audit

**Inspection date:** 17 November 2026  
**Source files:** `src/pages/cad/*`, `src/pages/cad/viewer/*`, `src/context/CadContext.jsx`, `src/data/cadData.js`  
**Runtime:** Vite dev server, browser at 1440×900, Chromium

---

## 1. Capability summary

| Capability | Implemented? | Verified? | Status |
|---|---|---|---|
| Register CAD metadata | Yes | Form rendered, not saved | IMPLEMENTED BUT NOT VERIFIED |
| Upload file into browser session | Yes, max 25 MB | Source + UI behaviour | IMPLEMENTED BUT NOT VERIFIED |
| Persist uploaded file bytes | **No** | Object URL only | **BROKEN** |
| 2D SVG viewer | Yes | Yes, seeded multi-sheet sample | IMPLEMENTED AND VERIFIED |
| PDF viewer | Browser-native iframe | Yes, seeded PDF | IMPLEMENTED AND VERIFIED |
| Raster image viewer | Source-supported | No image sample available | IMPLEMENTED BUT NOT VERIFIED |
| Three.js OBJ viewer | Yes | Yes, but console geometry warnings | IMPLEMENTED BUT NOT VERIFIED |
| Three.js STL viewer | Yes | Yes, clean console | IMPLEMENTED AND VERIFIED |
| GLB / GLTF / PLY viewer | Source loaders present | No sample available | IMPLEMENTED BUT NOT VERIFIED |
| DWG / DXF preview | **No** | No CAD engine | NOT IMPLEMENTED |
| STEP / IGES / SolidWorks preview | **No** | No tessellation pipeline | NOT IMPLEMENTED |
| CAD format conversion | **No** | No converter | NOT IMPLEMENTED |
| Drawing revision comparison | Yes, metadata only | Yes | IMPLEMENTED AND VERIFIED (metadata scope) |
| Drawing release | Yes, local state | Not executed | IMPLEMENTED BUT NOT VERIFIED |
| Drawing transmittals | Yes, local register | Register rendered | IMPLEMENTED BUT NOT VERIFIED |
| CAD file download | Seed assets only; session uploads | Verified source/error path | IMPLEMENTED BUT NOT VERIFIED |

---

## 2. Accepted input formats and restrictions

Source: `src/pages/cad/CadFileFormPage.jsx`

```js
const MAX_BYTES = 25 * 1024 * 1024;
```

Maximum size: **25 MB per file**.

Accepted extensions:

| Group | Extensions | Viewer treatment |
|---|---|---|
| Vector 2D | `svg` | Parsed SVG, interactive layers/zoom/pan |
| PDF | `pdf` | Browser PDF iframe |
| Raster images | `png`, `jpg`, `jpeg`, `bmp`, `gif`, `webp` | Browser `<img>` with zoom/pan |
| Mesh 3D | `obj`, `stl`, `glb`, `gltf`, `ply` | Three.js loaders |
| Native CAD — stored only | `dwg`, `dxf`, `dgn`, `step`, `stp`, `iges`, `igs`, `sldprt`, `sldasm`, `sat`, `brep` | No preview; download only |
| Exchange/document — stored only | `dae`, `3ds`, `doc`, `docx`, `xls`, `xlsx`, `csv`, `txt` | No verified preview |

Rejected extension message: **“`[EXT]` is not accepted. Choose a CAD, drawing, image or document file.”**  
Oversize message: **“This file is `[size]`. The browser session limit is 25 MB.”**

`file.type` is not trusted; the extension drives capability selection. There is no MIME check, malware scan, checksum or server validation.

---

## 3. 2D viewer

Source: `src/pages/cad/viewer/Viewer2D.jsx`

| Feature | Behaviour | Status |
|---|---|---|
| SVG rendering | SVG markup injected into a transformed container | IMPLEMENTED AND VERIFIED |
| Image rendering | `<img>` transformed by pan/zoom | IMPLEMENTED BUT NOT VERIFIED (no sample) |
| PDF rendering | `<iframe>` using browser PDF engine | IMPLEMENTED AND VERIFIED |
| Zoom | 25%–400%, toolbar +/− | IMPLEMENTED AND VERIFIED (SVG) |
| Pan | Drag with pointer events | IMPLEMENTED AND VERIFIED (SVG) |
| Fit / Reset | Resets zoom and pan | IMPLEMENTED AND VERIFIED (SVG) |
| Fullscreen | Fullscreen API with error toast fallback | IMPLEMENTED BUT NOT VERIFIED |
| Layer list | SVG IDs/groups of interest become toggles | IMPLEMENTED AND VERIFIED (9 layers) |
| Multi-sheet | Sheet selector for seeded multi-sheet files | IMPLEMENTED AND VERIFIED |
| Download | Anchor download of source URL/asset path | IMPLEMENTED BUT NOT VERIFIED |
| PDF zoom/page controls | Handled by browser PDF engine, not app toolbar | NOT IMPLEMENTED (by design) |

### 3.1 Runtime evidence — SVG `CAD-2026-001`

- File: `HPU-APX-ASSY-001 Industrial Hydraulic Power Unit — General Arrangement`
- Sheet 1: **96** SVG child elements
- Sheet 2: **84** SVG child elements
- Layer list: **9** named layers
- Sheet switching changed the rendered element count
- Zoom, pan, fit and reset were exercised without an error
- No console error

---

## 4. 3D viewer

Source: `src/pages/cad/viewer/Viewer3D.jsx`

| Feature | Behaviour | Status |
|---|---|---|
| Three.js scene | WebGLRenderer, PerspectiveCamera, OrbitControls | IMPLEMENTED AND VERIFIED |
| OBJ loading | `OBJLoader().parse(text)` | IMPLEMENTED BUT NOT VERIFIED — NaN warnings |
| STL loading | `STLLoader().parse(buffer)` | IMPLEMENTED AND VERIFIED |
| PLY loading | `PLYLoader().parse(buffer)` | IMPLEMENTED BUT NOT VERIFIED (no sample) |
| GLB/GLTF loading | `GLTFLoader().load(url)` | IMPLEMENTED BUT NOT VERIFIED (no sample) |
| Orbit / pan / wheel zoom | OrbitControls | IMPLEMENTED AND VERIFIED |
| Model tree | One row per mesh/component with visibility toggle | IMPLEMENTED AND VERIFIED |
| Component selection | Raycaster on pointer-up, emissive highlight | IMPLEMENTED AND VERIFIED (selection action available; highlight not visually verified) |
| Standard views | ISO, FRONT, TOP, RIGHT | IMPLEMENTED AND VERIFIED (FRONT activated) |
| Wireframe | Material wireframe toggle | IMPLEMENTED AND VERIFIED |
| Zoom in/out | Camera dolly | IMPLEMENTED AND VERIFIED |
| Fit / Reset camera | Bounding-box camera fit | IMPLEMENTED AND VERIFIED |
| Fullscreen | Fullscreen API | IMPLEMENTED BUT NOT VERIFIED |
| Mesh stats | “N meshes · N triangles” | IMPLEMENTED AND VERIFIED |
| Measurement | None | NOT IMPLEMENTED |
| Section plane | None | NOT IMPLEMENTED |
| Explode view | None | NOT IMPLEMENTED |
| Annotations | None | NOT IMPLEMENTED |
| Model export/conversion | None | NOT IMPLEMENTED |

### 4.1 Runtime evidence — OBJ `CAD-2026-002`

- Three.js canvas: **526 × 575**
- Model tree: `Base_Plate`, `Housing`, `Bearing_Boss`, `Drive_Shaft`, `Motor_Mount`
- Stats: **“5 meshes · 142 triangles”**
- Wireframe toggled
- FRONT view activated
- Console produced repeated Three.js geometry warnings:
  - `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`
  - `THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values.`
- These warnings occurred three times each. The mesh still rendered, but bounding-box camera fitting and future geometry analysis are not reliable for this sample.

**Status:** the OBJ path is **IMPLEMENTED BUT NOT VERIFIED** because the sample loads with invalid geometry bounds.

### 4.2 Runtime evidence — STL `CAD-2026-003`

- File: `Gearbox housing`
- Stats: **“1 meshes · 154 triangles”**
- Model tree: `Gearbox housing`
- Three.js canvas rendered
- **No console errors** after loading and navigating

**Status:** **IMPLEMENTED AND VERIFIED** for this sample.

### 4.3 Unverified 3D formats

GLB, GLTF and PLY have loader code but no seeded/sample file was available. They must not be described as verified. No test file was fabricated during this inspection.

---

## 5. PDF and unsupported-file behaviour

### 5.1 PDF — `CAD-2026-007`

- Iframe source: `/cad-samples/utility-skid-ga.pdf`
- Native browser PDF engine loaded the document
- UI note: “PDF rendered by the browser's built-in PDF engine. Page navigation and zoom are handled by that engine, not by this toolbar.”
- **Status: IMPLEMENTED AND VERIFIED**

### 5.2 STEP — `CAD-2026-005`

- Screen: “Preview unavailable for STEP”
- Reason displayed: “STEP/STP needs an OpenCascade WASM tessellation pipeline. That pipeline is not included in this frontend build.”
- “Download original file” action shown
- **Status: NOT IMPLEMENTED for preview; download path IMPLEMENTED BUT NOT VERIFIED**

### 5.3 DWG / DXF / DGN / IGES / SolidWorks

- Register rows show `preview: false` / stored-only.
- No viewer route or renderer exists.
- User sees stored-only badges and a download action.
- **Status: NOT IMPLEMENTED for preview or conversion.**

---

## 6. Is there real CAD format conversion?

**No.**

What exists:

1. **Display-mode selection** — a file’s extension picks SVG/PDF/image/3D/no-preview mode. This is not conversion.
2. **Drawing record creation from a BOM** — creates a new metadata record with `format: 'SVG'`, no geometry, no file bytes.
3. **Submit for review** — creates a review workflow record.
4. **Download original** — serves the original bytes/asset, not a converted file.
5. **Revision creation** — copies prior metadata into a new revision; does not regenerate geometry or a native CAD file.

Not present:

- OBJ/STL/STEP/IGES/DWG/DXF → another format export
- Mesh tessellation from B-rep
- Thumbnail generation
- PDF/DXF re-export
- Server-side conversion queue
- Converted-file storage
- Retention of original plus converted output

**Status: NOT IMPLEMENTED.**

---

## 7. Drawing lifecycle rules

Source: `src/context/CadContext.jsx`, `src/data/cadData.js`

### 7.1 Creation and submission

- Drawing number must be unique in the register.
- New drawings start `Draft` / `Not released`.
- Submit allowed only from `Draft` or `Changes Requested`.
- Submitting sets `Under Review` and marks the current revision `Under Review`.
- Review decision allowed only for `Submitted` or `Under Review`.
- Decisions: `Approved`, `Request Changes`, `Reject`.
- Reject maps to `Withdrawn`.
- Comments are required for changes/rejection.

### 7.2 Release gate

`releaseDrawing` requires:

- exact drawing record exists;
- `approvalStatus === 'Approved'`;
- release sets status `Released`, `releaseStatus: 'Released'`, `releasedAt`, `releaseBy`, `releaseRef`;
- current revision becomes `Released`.

There is one drawing record per revision chain; `createRevision` marks the previous revision `Superseded` and creates a new `Draft` revision with a copied metadata snapshot.

### 7.3 Revision numbering

`nextRevision()` uses `A → B → C → D → E → F → A1` (then `B1`, etc.). It does not support numeric-only or customer-specific schemes.

### 7.4 Revision comparison

Source: `src/pages/cad/CadRevisionReleaseTab.jsx`, `diffRows`.

- Compare control selects a drawing, base revision and target revision.
- Compares **metadata fields** only.
- Explicit scope text: **“No geometry or pixel comparison.”**
- Runtime test:
  - Default drawing `DRW-2026-013` had only Rev A → 0 metadata changes.
  - Selecting `DRG-MEC-041-001` auto-selected Rev B → Rev C and reported **3 metadata changes**.
- **Status: IMPLEMENTED AND VERIFIED** for metadata comparison; geometry comparison **NOT IMPLEMENTED**.

### 7.5 Transmittals and handovers

- Transmittal register supports create/issue/cancel/delete with statuses.
- 6 transmittals; IDs `TRN-2026-001` … `TRN-2026-006`.
- Handover requires an **approved or released** drawing and the **current revision**.
- 5 handovers observed.
- No external transmission, email, portal or acknowledgement by a supplier.
- **Status: IMPLEMENTED BUT NOT VERIFIED** for writes; local record only.

---

## 8. CAD register and viewer runtime summary

| Route | Runtime result |
|---|---|
| `/cad-management/repository` | 14 file rows; formats and preview badges rendered |
| `/cad-management/drawings` | 13 drawing rows; preview availability badges |
| `/cad-management/viewer` | File selector and viewer shell rendered |
| `/cad-management/releases` | Revision register 17, comparison 3, change history 29, review/approval 2, transmittals 6, released history 5, handover 5 |
| `/cad-management/files/new` | Metadata form + 25 MB upload restriction |
| `/cad-management/drawings/new` | Drawing record form + attachment restriction |

### 8.1 Download failure behaviour

If a row has neither a session object URL nor a seeded `assetPath`, clicking Download produces:

> “No file bytes are attached to this record. Use the upload form to attach a local file.”

For unsupported formats, the viewer explains the missing renderer and offers the original download.

---

## 9. CAD-specific defects

| # | Defect | Evidence | Impact | Severity |
|---:|---|---|---|---|
| C1 | Uploaded CAD file bytes are session-only | `CadContext.addFile` object URL + React state; warning in form | Register looks complete after refresh but file is gone | High |
| C2 | OBJ geometry produces NaN bounding box/sphere | Three.js console warnings on `CAD-2026-002` | Camera fit/measurement unreliable; geometry quality suspect | Medium |
| C3 | No CAD format conversion | No converter module; all “convert” actions are workflow records | User expectation of STEP/DWG conversion is unmet | High |
| C4 | No native CAD preview | DWG/DXF/STEP/IGES/SolidWorks stored-only | Cannot review native vendor files in browser | High |
| C5 | GLB/GLTF/PLY not runtime-tested | No sample | Claim of support is source-only | Medium |
| C6 | Raster image viewer not runtime-tested | No sample | Claim of support is source-only | Low |
| C7 | Drawing comparison is metadata-only | Explicit UI note | Cannot detect visual/geometry changes | Medium |
| C8 | Handover/transmittal are local mock records | No external transport | No real supplier/customer delivery | High |
| C9 | No checksum/duplicate-file detection | Metadata-only registration | Duplicate binaries can be registered | Low |
| C10 | No file retention/backup | Local browser storage only | Loss on profile reset/device change | High |

---

## 10. Evidence index

| Evidence | File |
|---|---|
| Format allowlist, 25 MB, upload behaviour | `src/pages/cad/CadFileFormPage.jsx` |
| Preview capabilities and unsupported reasons | `src/data/cadData.js` |
| 2D viewer | `src/pages/cad/viewer/Viewer2D.jsx` |
| 3D viewer and loaders | `src/pages/cad/viewer/Viewer3D.jsx` |
| Viewer routing | `src/pages/cad/CadViewerTab.jsx` |
| File registration and in-memory bytes | `src/context/CadContext.jsx` |
| Drawing revision/release/transmittal UI | `src/pages/cad/CadRevisionReleaseTab.jsx`, `DrawingManagementTab.jsx` |
| Revision comparison | `src/pages/cad/CadRevisionReleaseTab.jsx` |
