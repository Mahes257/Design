# 04 — Data, Storage and Attachment Audit

**Inspection date:** 17 November 2026  
**Method:** Source inspection of every React context, direct `localStorage`/`sessionStorage` reads, and live browser storage capture.

---

## 1. Storage architecture

The application is a **single-browser frontend prototype**:

- 19 React context providers wrap the route tree in `src/App.jsx`.
- Seeds are bundled JavaScript arrays in `src/data/*.js`.
- Each business context owns one `localStorage` key and writes the entire state object on change.
- There is no API, server database, authentication token, remote file store or service worker cache for records.
- No IndexedDB database exists.
- `sessionStorage` holds only the last opened project ID.
- UI preferences (`md-theme`, `md-sidebar-open`) are also in `localStorage`.

State survives a page refresh and browser restart **only to the extent that it fits in the key and was serialisable**. React state that is not in a persisted key (especially CAD file bytes) is lost.

---

## 2. Exact localStorage keys

Captured from the running app after the inspection route sweep.

| Key | Shape | Live counts observed | Written by | Read on startup |
|---|---|---|---:|---|---|
| `md-customer-enquiry-state-v1` | `{ enquiries: [] }` | 9 | `CustomerEnquiryContext` | Yes |
| `md-quotation-review-state-v1` | `{ quotations: [] }` | 10 | `QuotationReviewContext` | Yes |
| `md-project-state-v1` | `{ projects: [], team: [], milestones: [] }` | 15 projects, 17 team, 21 milestones | `ProjectsContext` | Yes |
| `md-planning-state-v1` | `{ plans: [], tasks: [] }` | 11 plans, 39 tasks | `PlanningContext` | Yes |
| `md-concept-state-v1` | `{ concepts: [], layoutFiles: [], studies: [], comparisons: [], proposals: [] }` | 15, 8, 6, 5, 3 | `ConceptContext` | Yes |
| `md-mechanical-state-v1` | `{ designs: [], parts: [], assemblies: [], calculations: [] }` | 18, 24, 9, 9 | `MechanicalContext` | Yes |
| `md-analysis-state-v1` | `{ analyses: [], reviews: [], reports: [] }` | 25, 17, 4 | `AnalysisContext` | Yes |
| `md-manufacturing-state-v1` | `{ definitions: [], inspections: [], processPlans: [] }` | 18, 10, 10 | `ManufacturingContext` | Yes |
| `md-bom-state-v1` | `{ boms: [], materials: [], quantities: [], labour: [], rates: [], estimates: [], transfers: [] }` | 11, 12, 8, 11, 11, 8, 5 | `BomContext` | Yes |
| `md-cad-state-v1` | `{ files: [], drawings: [], transmittals: [], handovers: [] }` | 14, 13, 6, 5 | `CadContext` | Yes |
| `md-approvals-state-v1` | `{ reviews: [] }` | 15 | `ApprovalsContext` | Yes |
| `md-engineering-release-state-v1` | `{ changes: [], releases: [] }` | 10, 2 | `EngineeringReleaseContext` | Yes |
| `md-transfers-state-v1` | `{ transfers: [] }` | 17 | `TransfersContext` | Yes |
| `md-support-state-v1` | `{ cases: [] }` | 17 | `SupportContext` | Yes |
| `md-manufacturing-readiness-state-v1` | `{ readiness: [], purchaseHandovers: [], productionHandovers: [] }` | 6, 2, 4 | `ManufacturingReadinessContext` | Yes |
| `md-production-tracking-v1` | `{ orders: [] }` | 2 | `ProductionTrackingContext` | Yes |
| `md-fulfilment-state-v1` | `{ quality: [], finishedGoods: [], dispatches: [], invoices: [], deliveries: [] }` | 2, 2, 2, 2, 2 | `FulfilmentContext` | Yes |
| `md-workflow-conversions-v1` | `{ links: [] }` | 21 links | `WorkflowConversionContext` | Yes |
| `md-settings-v1` | `{ values: {}, meta: {} }` | 18 configurable categories | `SettingsContext` | Yes |
| `md-reports-state-v1` | Array | 56 entries | **Nothing in source writes it** | **No** — orphaned |
| `md-theme` | `"light"` / `"dark"` | `light` restored after testing | Theme toggle | Yes |
| `md-sidebar-open` | `"1"` / `"0"` | Present | Sidebar toggle | Yes |

**Total observed live records:** approximately 325 records across contexts before including settings, theme and conversion links. Counts are seed records plus any previously persisted user edits.

### 2.1 Common record structure

Most records follow:

```js
{
  id: "ENQ-2026-045",
  projectId / linkedEnquiryId / bomId / drawingId: "...",
  status: "Draft | In Progress | Approved | Released | ...",
  revision: "A",
  created / updated / date: "2026-11-16",
  attachments: [{ name, type, size, assetPath }],
  history: [{ id, at, by, action, description }],
  ...moduleSpecificFields
}
```

IDs are generated locally by `nextId()` helpers. There is no central sequence table; numbering is derived from current array length or maximum suffix, so deleting records can create unusual gaps and some helpers can reuse a number.

The single test plan created during inspection was `DPL-2026-012`, and after deletion the plan list returned to 11 with `DPL-2026-011` as the highest ID.

---

## 3. sessionStorage and IndexedDB

| Mechanism | Key / database | Contents | Status |
|---|---|---|---|
| `sessionStorage` | `md-last-project-id` | Last selected project ID | IMPLEMENTED AND VERIFIED |
| IndexedDB | None | None | NOT IMPLEMENTED |
| Cache Storage | None | None | NOT IMPLEMENTED |
| Cookies | None used for application data | — | NOT IMPLEMENTED |

---

## 4. Seed data versus live data

| Source | Behaviour |
|---|---|
| `src/data/*.js` seed arrays | Bundled defaults used when a storage key is empty or invalid |
| Context initialiser | `loadPersisted()`/`loadPersistedState()` tries JSON parse, validates the expected array, otherwise falls back to seed |
| On change | Context writes the entire array to its key |
| Reset Seed Data buttons | Call context reset functions that replace the key with the bundled seed again |
| Corrupt JSON | Silently falls back to seed in most contexts; no user-visible recovery message |
| Storage quota / privacy mode | Write is usually wrapped in `try/catch`; the session continues in memory with no indication that changes will not persist |

### 4.1 Seed data is not marked as demo in most registers

Records such as `PRJ-2026-044`, `QTN-2026-024`, `ENQ-2026-045`, `DPL-2026-011`, `TSK-2139`, `DES-2026-018`, `ANL-2026-025`, `MFD-2026-018`, `BOM-2026-011`, `DRW-2026-013`, `REV-2026-015`, `TRF-2026-016/017` are realistic seeds and look like production records. There is no “demo” badge, and “Reset Seed Data” would delete any user changes to that module.

---

## 5. File and attachment handling

### 5.1 Capability by module

| Module / form | Original binary retained? | What is stored | Preview / download | Survives refresh? | Survives restart? |
|---|---|---|---|---|---|
| Customer enquiry documents | No | Name, type, size (and possibly mock asset path) | Metadata-only attachment list; no binary preview | Metadata yes | Metadata yes; file no |
| Project files | No | File count/name metadata | No binary open | Metadata yes | Metadata yes |
| Concept layout files | No | Name/metadata | No binary preview | Metadata yes | Metadata yes |
| Mechanical/CAD reference attachments | No | Metadata | No binary preview | Metadata yes | Metadata yes |
| Analysis evidence | No | Metadata; seed files have display names/sizes | Manifest download, not original file bytes | Metadata yes | Metadata yes |
| Manufacturing attachments | No | Metadata only; form label explicitly says “stored as local metadata only” | No binary preview | Metadata yes | Metadata yes |
| BOM attachments | No | Metadata | No binary preview | Metadata yes | Metadata yes |
| CAD file upload | **Only in memory** | Metadata in `md-cad-state-v1`; selected `File` + object URL in `localFiles` React state | Native browser preview while session lives; download uses object URL | **File bytes no; metadata yes** | **File bytes no; metadata yes** |
| Drawing attachment | No (selected file is converted to metadata) | Name/size/extension; `assetPath` blank for user files | Preview only if seeded `assetPath` exists | Metadata yes | Metadata yes |
| Design review attachments | No | Metadata | Attachment list only | Metadata yes | Metadata yes |
| Transfer supporting files | No | Metadata only | No binary preview | Metadata yes | Metadata yes |
| Engineering support files | No | Metadata only | No binary preview | Metadata yes | Metadata yes |

### 5.2 CAD binary lifecycle

`CadContext.addFile(record, file)`:

```js
const url = URL.createObjectURL(file);
setLocalFiles(prev => ({ ...prev, [record.id]: { url, name, size, file } }));
```

- The `File` object is held in React state, not storage.
- Object URLs are revoked on unmount/replacement.
- The saved CAD record stores `fileName`, type, size and metadata, but not bytes.
- Seed samples survive because they reference static files under `public/cad-samples/…` through `assetPath`.
- After refresh, a user-uploaded CAD record remains in the register but has no bytes. “Download file” then shows “No file bytes are attached to this record.”
- The form text warns: “Browser memory holds the file until refresh.”

### 5.3 Accepted CAD input

Maximum **25 MB**. Accepted extension list is documented in report 05. Browser preview support is narrower than upload support: preview is only implemented for SVG, PDF/images, and selected 3D meshes.

### 5.4 Attachment metadata shape

```js
{
  name: "ANL-2026-003_Weld-Evidence.pdf",
  type: "Analysis evidence",
  size: 508000,
  assetPath: ""
}
```

`assetPath` is populated only for bundled samples. There is no file hash, MIME sniffing, upload storage, ownership or virus scan.

---

## 6. Export and import

| Operation | Implementation | Result | Status |
|---|---|---|---|
| CSV export | `src/utils/exportCsv.js` creates a Blob and anchor download | Works client-side | IMPLEMENTED AND VERIFIED (utility/source); exports not all clicked |
| Validation-report evidence manifest | `ValidationReportsTab.jsx` builds a text Blob | Downloads manifest, not files | IMPLEMENTED BUT NOT VERIFIED |
| Validation report print | `window.print()` in `ValidationReportDetailPage.jsx` | Browser print dialog | IMPLEMENTED BUT NOT VERIFIED |
| CAD file download | Object URL or public `assetPath` | Works only with bytes | IMPLEMENTED AND VERIFIED for seed sample; fails for refreshed uploads |
| Import CSV/Excel | No importer found | — | NOT IMPLEMENTED |
| Import CAD conversion | No conversion/import pipeline | — | NOT IMPLEMENTED |

---

## 7. Data integrity and lifecycle risks

1. **No backend authority.** Any browser can edit its own copy; records are not shared between users or machines.
2. **No role enforcement.** Status fields, approvals and releases can be changed by anyone using the UI.
3. **Seed resets are destructive.** A single “Reset Seed Data” can remove local edits for that module without an export or backup.
4. **No attachment bytes.** Audit records can claim an attachment exists while the file is gone.
5. **Uploaded CAD rows outlive their bytes.** Refresh leaves a downloadable-looking row with no file.
6. **Orphan report state.** `md-reports-state-v1` is not read, so any report state previously stored there has no effect.
7. **Storage failures are silent.** Quota and privacy-mode failures are swallowed.
8. **IDs are array-derived.** Deletion can affect the next generated sequence; there is no server-side uniqueness guarantee.
9. **History is mutable local state.** Audit history lives in the same editable object and can be wiped by a seed reset.
10. **No concurrency control.** Two tabs editing the same key will overwrite each other on their next state write.

---

## 8. Evidence index

| Evidence | File |
|---|---|
| Provider tree | `src/App.jsx` |
| Persistence keys and loaders | `src/context/*.jsx` `STORAGE_KEY` constants |
| CAD in-memory file map | `src/context/CadContext.jsx` `addFile`, `localFiles` |
| CAD preview/download | `src/pages/cad/CadRepositoryTab.jsx`, `src/pages/cad/viewer/*` |
| CSV writer | `src/utils/exportCsv.js` |
| Report orphan | `src/pages/reports/ReportsModulePage.jsx` (no storage read), `md-reports-state-v1` |
| Settings storage | `src/context/SettingsContext.jsx` |
| Workflow links | `src/context/WorkflowConversionContext.jsx` |
