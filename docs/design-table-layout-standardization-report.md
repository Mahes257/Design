# Table Layout Standardization Report

**Date:** 18 November 2026
**Scope:** Mechanical Design ERP (`C:\Users\Mahes\Desktop\Design`) only.
**Reference:** CRM Leads table behaviour at `http://localhost:5174/crm` (read-only visual reference).

## 1. Result

Every list table in the Design app now uses the CRM-style layout:

- the selection column (when present) and the first identifying column stay pinned to the left;
- the Actions column stays pinned to the right;
- only the middle columns scroll horizontally inside the existing `.table-wrap`;
- the header row is sticky inside the scroll container;
- pinned columns are opaque in every row state (default, hover, selected) and carry a subtle shadow/gutter separator;
- pagination, footer, filters, search, sorting, row selection and row-click navigation are unchanged.

No route, column, action, record, data flow or localStorage key was changed.

## 2. Modules and table screens inspected

All table markup in `src` was enumerated before implementation:

- **Shared component:** `src/components/common/DataTable.jsx`, used by **50 module files** (registers, management lists, planning/task lists, review and approval lists, release history, handover lists, transfer lists, report tables, dashboard task table, module page tables).
- **Inline `<table className="data-table">` list tables** in 10 module files (transfers, approvals, analysis, BOM, customer enquiries, CAD, simulation).
- **Key/value detail tables** (`mech-detail-table`, `mfg-mini-table` in detail pages, `bom-diff-table`, `cad-diff-table`) rendered inline in detail views.
- **Other table markup:** `settings-table` (settings configuration grids), `cd-matrix` (concept comparison matrix).

Existing table styles live in `src/styles/design-system.css` (`/* ===== 8. TABLE ===== */` plus per-module overrides in `mechanical.css`, `planning.css`, `transfers.css`, `reports.css`, `concept.css`, `enquiry-request.css`, `manufacturing.css`).

## 3. Shared components modified

### `src/components/common/DataTable.jsx`

- Renders `is-selectable` on the table and a `col-pin` class on the first data column header and cells.
- Existing `col-check` (selection) and `col-actions` (Actions) classes are reused as pin hooks — no markup restructure.
- Populates `aria-sort`, sorting, selection, `rowActions`, empty rows, `getRowId` and `onRowClick` exactly as before; the only additions are CSS hooks.

### `src/components/common/Dropdown.jsx`

- `Dropdown` accepts `portal`. When set, the menu is rendered into `document.body` with `position: fixed`, so a table's horizontal scroll container (`.table-wrap`) cannot clip it.
- The menu is re-positioned on scroll/resize, flips above the trigger when there is not enough room below, and is clamped inside the viewport with `max-height` + internal scrolling.
- Outside-click and Escape handling were extended to treat the portalled menu as "inside"; non-portalled dropdowns keep the old `useClickOutside` path unchanged.
- `ActionMenu` (the ⋮ row menu) passes `portal`, so every row menu in every module benefits without per-module changes.

### `src/styles/design-system.css` (new section `8b. LIST TABLE PINNING`)

- Theme variables for pinned cell backgrounds (`--pin-row-bg`, `--pin-row-hover`, `--pin-row-selected`) in light and dark themes, taken from the existing palette (`#ffffff` / `#f8fafc` / `#edf7f4`; `#1a1a2e` / `#212134` / `#162631`).
- `.data-table thead th { position: sticky; top: 0; z-index: 3 }`; pinned header cells at `z-index: 4`.
- `.col-check` pinned at `left: 0`, first data column pinned at `left: 0` or `left: 46px` when the selection column exists; `.col-actions` pinned at `right: 0`.
- Hover and selected row rules repaint pinned cells so scrolled content never shows through.
- A 14px opaque gutter (`::after`, `background: inherit`, `z-index: -1`) extends each left-pinned cell past its own edge, so middle-column text scrolling underneath stops at the pin boundary while the pinned cell's own text paints on top.
- `.dropdown-menu.is-portal { z-index: 1150 }` — above modals (`z-index: 100`), below toasts (`1200`).
- Opt-in classes for inline list tables: `.table-pin-left` (first column pinned) and `.table-fixed-cols` (first and last column pinned), including header cells and hover states.

## 4. Files changed

| File | Change |
|---|---|
| `src/components/common/DataTable.jsx` | Pin classes, `is-selectable` state, unchanged behaviour. |
| `src/components/common/Dropdown.jsx` | Portalled, viewport-clamped action menus. |
| `src/styles/design-system.css` | New `8b. LIST TABLE PINNING` section (pinned columns, sticky header, hover/selected repaint, gutter, opt-in classes, portal z-index). |
| `src/pages/transfers/TransferRegisterTab.jsx` | Approved deliverables table → `table-fixed-cols`. |
| `src/pages/transfers/TransferTrackingTab.jsx` | Project-wise summary table → `table-pin-left`. |
| `src/pages/approvals/ClientApprovalTab.jsx` | Client comments + client revision history tables → `table-pin-left`. |
| `src/pages/approvals/EngineeringReviewTab.jsx` | Analysis evidence table → `table-pin-left`. |
| `src/pages/analysis/ValidationReportsTab.jsx` | Report analysis evidence table → `table-pin-left`. |
| `src/pages/analysis/ValidationReportDetailPage.jsx` | Analysis records table → `table-pin-left`. |
| `src/pages/bom/BomDetailPage.jsx` | BOM items table (13 columns) → `table-fixed-cols`. |
| `src/pages/customer-enquiries/CustomerEnquiryDetailPage.jsx` | Customer documents table → `table-fixed-cols`. |
| `src/pages/cad/CadRepositoryTab.jsx` | CAD capability table → `table-pin-left`. |
| `src/pages/simulation/SimulationWorkspaceTab.jsx` | CAD repository picker table → `table-fixed-cols`. |

No data files, contexts, routes, navigation config, column definitions, action handlers or forms were modified.

## 5. Behaviour before and after

| Aspect | Before | After |
|---|---|---|
| Horizontal scroll | Whole table (identifier and Actions) scrolled out of view | Only middle columns scroll; identifier and Actions stay |
| Selection column | Scrolled with the table | Pinned at the extreme left |
| First identifying column | Scrolled with the table | Pinned next to the selection column |
| Actions column | Scrolled with the table | Pinned at the right edge |
| Row menu near the table edge | Clipped by `.table-wrap` overflow | Portalled menu, positioned inside the viewport, flips above when needed |
| Header | Static, scrolled with the table | Sticky inside the scroll container, stays above pinned cells |
| Row hover / selection | Row background only | Row background plus matching opaque pinned-cell backgrounds |
| Column widths, sorting, filters, search, pagination, row click | — | Unchanged |

## 6. Verification performed (running Design app on `http://127.0.0.1:5173`)

### Layout behaviour

- **Mechanical Design Register (`/mechanical-design/design-register`, 13 columns, selection + actions)**, 1100px viewport: `scrollWidth 1414` vs `clientWidth 973` → horizontal scrolling. Measured at `scrollLeft 0`, `200` and maximum (`441`): the selection cell stayed at the scroll container's left edge (`95px`), the Design ID column at `141px` (`+46px`), and the Actions column ended flush at the container's right edge (`1067–1068px`) in every position.
- Computed styles confirm `position: sticky`, `left: 46px` for the identifier, `right: 0` for Actions, and opaque backgrounds (`rgb(26, 26, 46)` in the active dark theme) on both.
- **Project Management (`/projects`, 14 columns, no selection)**: table `scrollWidth 2036` vs `clientWidth 982` (`maxScroll 1054`); Project ID pinned left, Actions pinned right at maximum scroll.
- **BOM detail (`/bom-cost/bom/BOM-2026-001`)**: inline 13-column BOM items table with `table-fixed-cols` — first cell (`Item No.`) and last cell (`Details` action) both computed `sticky` (`left: 0` / `right: 0`), `maxScroll 256`.
- **Few-column table (`/design-handover/validation`, 5 columns)**: `maxScroll 0`; the table fits, first column is sticky but never moves, layout is visually unchanged.

### Preserved functionality (Design Register)

- **Sorting:** clicking the *Created* header set `aria-sort="descending"` and reordered rows (`DES-2026-007` first).
- **Pagination:** page 2 → `Showing 11-15 of 15`, first row `DES-2026-008`; pinned classes still applied after the page change.
- **Search:** `Hydraulic` → `Showing 1-1 of 1` (`DES-2026-006`); `zzzz` → the module empty state ("No Designs Found … Clear Filters") rendered in a single full-width cell.
- **Row selection:** checkbox select/deselect produced 1 → 0 `is-selected` rows.
- **Row navigation:** clicking the pinned Design ID cell navigated to `/mechanical-design/design-register/DES-2026-007`.
- **Row actions:** the ⋮ menu rendered in `document.body` (`position: fixed`, `z-index 1150`), was **not** inside `.table-wrap`, was fully inside the viewport, and listed all seven actions (View / Edit / Create revision / Convert / Duplicate / View revision history / Archive).
- **Console:** no application runtime errors on the pages checked (only Vite/React debug and info messages).

### Build

`npm run build` → **exit code 0**. Only the pre-existing "chunks larger than 500 kB" advisory remains. Output written to `dist/`.

### Screenshots (actual captures, `docs/design-table-layout-evidence/`)

| File | Shows |
|---|---|
| `01-design-register-initial.png` | Design Register, 13 columns, initial view: checkbox + Design ID pinned left, Actions pinned right |
| `02-design-register-scrolled-left-pinned.png` | Same table scrolled horizontally: left columns fixed, middle columns moved |
| `03-design-register-scrolled-actions-pinned.png` | Same table scrolled to the end: Actions column still fixed at the right |
| `04-row-actions-menu-unclipped.png` | Portalled ⋮ row menu open over the table, not clipped by the scroll container |
| `05-projects-many-columns-scrolled.png` | Project register (14 columns) scrolled to the end |
| `06-design-handover-few-columns.png` | Release validation checklist (5 columns) — table fits, layout unchanged |
| `07-bom-items-fixed-columns.png` | Inline 13-column BOM items table with first and last columns pinned |

## 7. Tables that do not use the shared layout, and why

- **Transfers module tables** (`TransferRegisterTab`, `TransferTrackingTab`, `PurchaseTransferTab`, `ProductionTransferTab`, `TransferHistoryTab`) were given the pin classes, but the module page cannot currently render: `TransfersModulePage` throws `TypeError: Cannot read properties of undefined (reading 'base')` at `src/pages/transfers/TransfersModulePage.jsx:65` because `/transfers` has no entry in `src/config/navigation.js`. This is a pre-existing crash, unrelated to table layout, and was left untouched (fixing it would change navigation/module wiring, which this task excludes). The class additions are inert until that module is reachable.
- **Settings configuration tables** (`settings-table`, module access / restricted module grids): left as-is. They are configuration editors with their own theme-specific header and hover backgrounds and short, non-scrolling rows; forcing the shared pinned-cell backgrounds would fight their theme tokens.
- **Concept comparison matrix** (`cd-matrix`): a side-by-side scoring matrix rather than a record list; pinning its first column would change its purpose-built layout.
- **Key/value detail tables inside detail pages** (`mech-detail-table`, `mfg-mini-table`, `bom-diff-table`, `cad-diff-table`): two-column and diff tables inside forms/detail views. They keep their existing layout so detail pages are not redesigned. Tables that are genuine item lists inside those pages (BOM items, customer documents) were marked explicitly.

## 8. Limitations and not-checked items

- Only representative screens were opened (Design Register, Project register, BOM detail, Release validation, Design Handover); the remaining DataTable screens were not each opened individually — they inherit the shared component and CSS.
- The app was in the dark theme chosen in the browser; **light theme was not visually inspected**, though light-mode pinned colours are defined from the existing light tokens.
- No cross-browser testing (only the packaged Chromium).
- Pre-existing header truncation in registers that use `table-layout: fixed` (for example "SELECTED CONCEP…" in the Design Register) is unchanged; column widths were preserved as required rather than altered.
- A long identifier can still reach the pin boundary in those fixed-layout registers (for example a 96px Design ID column whose value is ~94px wide); widths were left untouched, and the pinned gutter keeps it separated from the scrolling columns.
- Portalled action menus were verified outside modals only. Their z-index (1150) is above the modal overlay (100).

## 9. Scope confirmation

Only `C:\Users\Mahes\Desktop\Design` was modified. The ERP at `http://localhost:5174` was not opened for editing, and no file outside this project was read or changed. No backend, database, route, navigation, module, record, column, action or localStorage key was changed by this work.
