# Frontend Sidebar Cleanup & Transfers Investigation Report

**Date:** 18 November 2026
**Scope:** `C:\Users\Mahes\Desktop\Design` only. The ERP at `localhost:5174` was treated as read-only and was not opened for editing. No backend, database, API, controller, service, entity or repository was touched.

---

## 1. Current Sidebar Inventory

Source of truth: `LIFECYCLE_GROUPS` and `DASHBOARD` in `src/config/navigation.js`. The sidebar renders `DASHBOARD` plus `LIFECYCLE_GROUPS` only; `MODULES` supplies module metadata and tabs.

| # | Parent / entry | Type | Child module | Base route |
|---|---|---|---|---|
| 1 | Dashboard | Standalone | Dashboard | `/dashboard` |
| 2 | Enquiry & Request Management | Direct route group | Enquiry & Request Management | `/customer-sales` |
| 3 | Project & Engineering | Group | Project Management | `/projects` |
| 4 | | | Design Planning | `/design-planning` |
| 5 | | | Conceptual Design | `/conceptual-design` |
| 6 | | | Mechanical Engineering Design | `/mechanical-design` |
| 7 | | | Simulation & Design Validation | `/engineering-analysis` |
| 8 | | | Engineering Analysis | `/analysis` |
| 9 | | | Manufacturing Design | `/manufacturing-design` |
| 10 | | | BOM & Cost Estimation | `/bom-cost` |
| 11 | | | Drawing & CAD Management | `/cad-management` |
| 12 | Engineering Approval & Release | Group | Design Review & Approval | `/design-review` |
| 13 | | | Engineering Change & Release | `/engineering-release` |
| 14 | | | Design Release & Production Handover | `/design-handover` |
| 15 | Administration | Group | Reports & Analytics | `/reports` |
| 16 | | | Settings | `/settings` |

**Totals:** 4 sidebar groups (one of which is a direct route), **15 module routes plus Dashboard (16 sidebar destinations)**. The Enquiry group also owns the legacy aliases `/customer-enquiries` and `/quotation-review`, which redirect into the current request workspace.

Route-backed module tabs are defined in `MODULES` (e.g. CAD has four tabs; Design Handover has five). They are unchanged.

---

## 2. Transfers Investigation

### Status: Case C — Hidden but Required

Transfers is **not** an active sidebar module and is **not** a deleted module. It is an internal, route-backed workflow target:

- Absent from `LIFECYCLE_GROUPS`, so it has no sidebar entry by design.
- Still registered in `src/App.jsx` (8 routes: register, purchase, production, tracking, history, new, edit, detail) and wrapped by `TransfersProvider`.
- Still the destination of BOM → Transfer and Drawing → Transfer conversions (`WorkflowConversionContext`, `TARGET_PATHS.transfer`).
- Still read by Project Management (`ProjectDetailPage`), Reports (`Module14ReportsPage`, `ReportsEngineeringTabs`) and the Dashboard transfer card.
- Holds real persisted data: `md-transfers-state-v1` contains **17 transfer records**; `md-workflow-conversions-v1` contains **21 conversion links**, including BOM-2026-001 → TRF-2026-015.
- `BomContext` also keeps its own smaller BOM transfer list (`md-bom-state-v1.transfers`, 5 records) used by BOM Revision & Release.

The earlier removal report explicitly preserved `TransfersContext` and all `/transfers` routes; only the navigation entry had been removed. Therefore the module was not restored to the sidebar.

### Runtime crash root cause

`TransfersModulePage.jsx` did:

```js
const MODULE = MODULES.find((module) => module.key === 'transfers');
...
if (!tab) return <Navigate to={MODULE.base} replace />;
```

Because `transfers` had no `MODULES` entry, `MODULE` was `undefined` and `MODULE.base` threw `TypeError: Cannot read properties of undefined (reading 'base')` before the page could render. The crash occurred on every `/transfers*` tab, including links opened from conversions, projects and reports.

### Fix applied

1. Added a `transfers` entry to `MODULES` in `src/config/navigation.js` (label, icon, five tabs matching the existing routes). It was **not** added to `LIFECYCLE_GROUPS`, so no sidebar entry appears. The entry supplies the page title, breadcrumbs and tab resolution that the page already assumed.
2. Added a defensive guard in `TransfersModulePage.jsx`: if the module metadata is ever missing again, the page redirects to `/dashboard` instead of throwing.
3. Corrected stale Dashboard/`dashboardData` links that pointed at non-existent transfer subpaths:
   - `/transfers/bom-transfer` → `/transfers`
   - `/transfers/transfer-history` → `/transfers/history`
   - `/transfers/manufacturing-package` → `/transfers/production` (released packages) and `/transfers/tracking` (packages awaiting acknowledgement)

**Final decision:** Transfers stays available as a hidden internal module with its full register, tabs, form and detail pages. It is not advertised in the sidebar, and no transfer record, conversion or history was removed or recreated.

---

## 3. Obsolete Frontend Files Identified

A static import-graph audit was run from `src/main.jsx` across every `src` file (relative imports, dynamic `import()` literals, CSS imports, barrel files). Initial result: **239 source files, 229 reachable, 10 unreachable**. Each unreachable file was then checked against the route table and by identifier search.

Ten files belonged to replaced pages whose URLs already redirect or which were superseded by newer workspaces:

| File | Former module / page | Evidence it is obsolete |
|---|---|---|
| `src/pages/approvals/ClientApprovalTab.jsx` | Design Review — old "Client Approval" tab | No import anywhere; `/design-review/client` redirects to `/design-review/releases`; current approvals tabs are register/engineering/manufacturing/history |
| `src/pages/customer-enquiries/CustomerEnquiriesPage.jsx` | Old customer enquiry register | Superseded by `EnquiryRequestModulePage`; `/customer-enquiries` redirects to `/customer-sales` |
| `src/pages/customer-enquiries/CustomerEnquiryDetailPage.jsx` | Old enquiry detail | Legacy detail URLs redirect via `LegacyEnquiryRedirect`; current detail is `RequestDetailPage` |
| `src/pages/customer-enquiries/CustomerEnquiryFormPage.jsx` | Old enquiry form | `/customer-enquiries/new` redirects to `/customer-sales/create`; current form is `RequestFormPage` |
| `src/pages/customer-sales/CustomerSalesModulePage.jsx` | Combined old sales workspace | Replaced by `EnquiryRequestModulePage`; `/customer-sales` renders the new workspace |
| `src/pages/projects/MilestonesTab.jsx` | Projects — old milestone tab | No import; `/projects/milestones` redirects to `/projects` |
| `src/pages/projects/ProjectStatusTab.jsx` | Projects — old status tab | No import; `/projects/project-status` redirects to `/projects` |
| `src/pages/projects/ProjectTeamTab.jsx` | Projects — old team tab | No import; `/projects/project-team` redirects to `/projects` |
| `src/pages/quotation-review/QuotationsPage.jsx` | Old quotation register | Quotation register now lives in the Enquiry & Request commercial tab; `/quotation-review` redirects to `/customer-sales/commercial` |
| `src/pages/reports/ReportsModulePage.jsx` | Old static Reports module | Replaced by `Module14ReportsPage`, which `/reports` renders |

### Retained despite living near obsolete files

| File | Reason retained |
|---|---|
| `src/pages/customer-enquiries/customerEnquiryUi.jsx` | Imported by `pages/enquiry-requests/RequestDetailPage.jsx` (`EnquiryTimeline`); active |
| `src/pages/quotation-review/QuotationDetailPage.jsx`, `QuotationFormPage.jsx` | Live routes `/quotation-review/:quotationId` and `/new`/`/edit`; linked from enquiry requests, projects and conversions |
| `src/context/CustomerEnquiryContext.jsx` | Still provides enquiry data used by the quotation workflow and legacy conversion links |
| `src/data/customerEnquiryData.js` | Still used by active quotation and enquiry components |
| `src/styles/customer-enquiry.css`, `quotation-review.css` | Class names still used by active enquiry/quotation UI (`ce-`, `qr-`); both remain imported in `main.jsx` |
| `src/data/reportsData.js` | Still reachable from active modules after the old report page was removed |

After deletion, the audit was repeated: **229 source files, 229 reachable, 0 unreachable.**

---

## 4. Files Removed

All removals were explicit paths (no folder globs). `src/pages/customer-sales/` became empty and was removed with `rmdir`.

1. `src/pages/approvals/ClientApprovalTab.jsx` — obsolete Design Review client tab.
2. `src/pages/customer-enquiries/CustomerEnquiriesPage.jsx` — superseded enquiry register.
3. `src/pages/customer-enquiries/CustomerEnquiryDetailPage.jsx` — superseded enquiry detail.
4. `src/pages/customer-enquiries/CustomerEnquiryFormPage.jsx` — superseded enquiry form.
5. `src/pages/customer-sales/CustomerSalesModulePage.jsx` — superseded combined sales page.
6. `src/pages/projects/MilestonesTab.jsx` — obsolete project tab.
7. `src/pages/projects/ProjectStatusTab.jsx` — obsolete project tab.
8. `src/pages/projects/ProjectTeamTab.jsx` — obsolete project tab.
9. `src/pages/quotation-review/QuotationsPage.jsx` — obsolete quotation register.
10. `src/pages/reports/ReportsModulePage.jsx` — obsolete static reports page.

No context, data file, hook, service, asset, route constant or localStorage handler was deleted. Routes for the legacy URLs remain as redirects, so old bookmarks still resolve.

---

## 5. Files Modified

| File | Change | Reason |
|---|---|---|
| `src/config/navigation.js` | Added the `transfers` module definition (base `/transfers`, five tabs) after Design Handover; deliberately not added to `LIFECYCLE_GROUPS`; uses the already-imported `ArrowRightLeft` icon. | Gives `/transfers*` the module metadata its page expects without restoring a sidebar entry. |
| `src/pages/transfers/TransfersModulePage.jsx` | Added `if (!MODULE) return <Navigate to={DASHBOARD.path} replace />;` before dereferencing `MODULE`. | Prevents the `reading 'base'` crash if navigation metadata is missing again. |
| `src/pages/Dashboard.jsx` | Transfer card action → `/transfers/history`; awaiting-acknowledgement CTA → `/transfers/tracking`. | Both previously pointed at non-existent `/transfers` subpaths. |
| `src/data/dashboardData.js` | Transfer summary tiles and handover activity target existing transfer routes (`/transfers`, `/transfers/history`, `/transfers/production`). | Same stale-route fix for data-driven links. |

No other file was edited.

---

## 6. Shared Files Preserved

- **Shared UI:** `src/components/common/*` — `DataTable` (standard actions menu, Preview injection, pins), `RecordPreview`, `RecordViewPage`, modals, badges, page layout.
- **Layout:** `Sidebar` and `Header` were not changed; the sidebar still derives solely from `LIFECYCLE_GROUPS`.
- **Contexts:** all providers in `App.jsx`, including `TransfersContext`, `DesignHandoverContext`, `WorkflowConversionContext`, `BomContext`, `CadContext`, `ApprovalsContext`, `EngineeringReleaseContext` and `SettingsContext`.
- **Workflow data:** `transfersData.js`, `designHandoverData.js`, `bomData.js`, `reportingAnalyticsData.js`, `dashboardData.js`, `settingsData.js`.
- **Conversions:** `WorkflowConversionContext` transfer target and BOM/Drawing conversion actions remain intact; BOM Revision & Release keeps its own transfer history table.
- **Legacy aliases:** `/customer-enquiries*`, `/quotation-review`, `/projects/project-team`, `/projects/milestones`, `/projects/project-status`, `/design-review/client`, `/approvals/*`, `/engineering-change` redirects were left in place.

Reason: each is referenced by at least one current sidebar module or by a valid internal workflow.

---

## 7. Current Module Verification

Runtime checks were performed in the running Vite app at `http://localhost:5173` by navigating each route and reading the rendered workspace and topbar title. The app was not modified except as listed above.

| Module / route | Result |
|---|---|
| `/dashboard` | Renders; sidebar shows the four groups and 15 module entries; no Transfers entry |
| `/customer-sales` | Renders Enquiry & Request Management |
| `/projects` | Renders Project Management |
| `/design-planning` | Renders Design Planning |
| `/conceptual-design` | Renders Conceptual Design |
| `/mechanical-design` | Renders Mechanical Engineering Design |
| `/engineering-analysis` | Renders Simulation & Design Validation |
| `/analysis` | Renders Engineering Analysis |
| `/manufacturing-design` | Renders Manufacturing Design |
| `/bom-cost` | Renders BOM & Cost Estimation |
| `/cad-management` | Renders Drawing & CAD Management |
| `/design-review` | Renders Design Review & Approval |
| `/engineering-release` | Renders Engineering Change & Release |
| `/design-handover` | Renders Design Release & Production Handover |
| `/reports` | Renders Reports & Analytics |
| `/settings` | Renders Settings |
| `/transfers` and `/purchase`, `/production`, `/tracking`, `/history` | Render with all five tabs and the transfer register (17 records); title "Engineering Release & Transfer" |
| `/transfers/new` | Renders the new-transfer form |
| `/transfers/TRF-2026-017` | Renders Transfer Details with actions (Validate Transfer, etc.) |
| BOM list Actions menu (`BOM-2026-001`) | Menu shows View BOM, Preview, Duplicate as Draft, Convert BOM |
| Convert BOM dialog | Shows "Create Purchase / Production Transfer"; existing conversion BOM-2026-001 → TRF-2026-015 appears in BOM history |

Sidebar inspection confirmed no "Transfer" entry, so the module was not restored to navigation. No page displayed a crash/error boundary.

### Active-module dependencies checked

- **BOM & Cost Estimation:** conversion history, transfer targets and BOM-owned transfer table intact.
- **Drawing & CAD:** conversion target `/transfers/:id` intact; drawing routes load.
- **Design Review & Approval:** client tab removal matches the existing redirect; approvals register/history load.
- **Engineering Change & Release:** unchanged; loads.
- **Design Release & Production Handover:** its own transfer history (`DesignHandoverContext`) and five tabs are separate from `/transfers` and remain intact.

---

## 8. Data Preservation

- No localStorage key was cleared, reset, migrated or renamed.
- No seed reset was invoked; no record was created during verification (the conversion dialog was cancelled).
- After the route sweep and a full page refresh, `md-transfers-state-v1` still held **17 transfers**, `md-workflow-conversions-v1` still held **21 links**, `md-bom-state-v1` still held 11 BOMs and 5 BOM transfers, and all other module stores retained their counts (projects 15, CAD files 14, drawings 13, approvals 15, etc.).
- Keys belonging to previously removed modules (`md-support-state-v1`, `md-manufacturing-readiness-state-v1`, `md-production-tracking-v1`, `md-fulfilment-state-v1`) remain untouched in storage; no active code reads them.

---

## 9. Build and Runtime Results

### Build

`npm run build` — **exit code 0**

- 2,355 modules transformed.
- `dist/assets/index-yKa2VOJt.css` — 365.85 kB (gzip 58.99 kB)
- `dist/assets/index-DQS2hBot.js` — 3,542.77 kB (gzip 837.79 kB)
- `dist/assets/occt-import-js-*.js/.wasm` emitted for the CAD viewer.
- Only the pre-existing large-chunk advisory and `occt-import-js` externalization notice were printed.

### Runtime

- All 16 sidebar destinations render with their correct titles.
- All five transfers tabs, the new-transfer form and a real transfer detail record render.
- BOM Actions menu, Preview and conversion dialog still work.
- Console after a clean reload of `/transfers/history`: only Vite connection/debug messages; **no application errors**.
- Records persisted across refresh.

### Remaining limitations / issues

- Verification was route-render level plus the BOM action/conversion check; every form, approval button and child action was not re-clicked.
- The Transfers module remains intentionally hidden from the sidebar; it is reachable only through conversions, project/report links, the dashboard card and direct URL.
- Some unrelated, pre-existing dashboard links still target old subpaths of **active** modules (for example `/cad-management/drawing-register` and `/bom-cost/bom-revisions`). They were not part of this cleanup and were left unchanged.
- With the old report page gone, `src/data/reportsData.js` remains reachable from active code but was not audited for internal dead fields; no file was deleted on suspicion alone.
- No automated test suite exists; no test suite was run.
