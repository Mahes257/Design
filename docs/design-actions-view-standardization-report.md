# Mechanical Design ERP — Table Actions & Standardized View Pages

Implementation report for the shared three-dot Actions menu, the quick Preview
dialog and the standardized View Details page pattern across the Mechanical
Design ERP (`C:\Users\Mahes\Desktop\Design`, React + Vite, `localhost:5173`).

Reference pages were inspected read-only:

- `http://localhost:5174/crm` — table layout, pinned first/last columns, horizontal scrolling, row action placement.
- `http://localhost:5174/quotations/13/view` — View Details hierarchy (breadcrumb, title + status, header actions, reference strip, tabs, section cards, key/value grids).

The reference ERP was not modified in any way.

---

## 1. Module and table inventory

Counts are `<DataTable>` usages found in each module's page folder. Every one of
these tables now renders the shared Actions column and the shared Actions menu.

| Module | Route base | Page files with tables | Tables |
| --- | --- | --- | --- |
| Enquiry & Request Management | `/customer-sales` | 1 | 1 |
| Quotation & Technical Review | `/quotation-review` | 1 | 1 |
| Project Management | `/projects` | 4 | 9 |
| Design Planning | `/design-planning` | 2 | 2 |
| Conceptual Design | `/conceptual-design` | 2 | 2 |
| Mechanical Engineering Design | `/mechanical-design` | 4 | 6 |
| Engineering Analysis | `/analysis` | 4 | 5 |
| Simulation & Design Validation | `/engineering-analysis` | 3 | 4 |
| Manufacturing Design | `/manufacturing-design` | 3 | 3 |
| BOM & Cost Estimation | `/bom-cost` | 3 | 16 |
| Drawing & CAD Management | `/cad-management` | 3 | 10 |
| Design Review & Approval | `/design-review` | 2 | 10 |
| Engineering Change & Release | `/engineering-release` | 4 | 7 |
| Design Release & Production Handover | `/design-handover` | 5 | 6 |
| Transfers (routed, not in sidebar) | `/transfers` | 5 | 16 |
| Reports & Analytics | `/reports` | 1 | 1 |
| Dashboard | `/dashboard` | 1 | 2 |
| Generic module shell | module base | 1 | 1 |

Total: 42 page files, 92 tables. Secondary related-record grids inside detail
pages (milestones, team, revisions, attachments, BOM items, stage checklists)
are included because they use the same shared table.

`<table>` elements that are not `DataTable` lists (settings grids, the concept
comparison matrix, key/value detail tables, diff tables) are not registers and
keep their existing presentation.

## 2. List pages updated

No module needed a rewrite. The standardization was made once in the shared
`DataTable`, so all 92 tables received it at the same time:

- Actions column always last, pinned right during horizontal scrolling.
- Actions menu order normalized to **View → Preview → Edit → module conversions → divider → Delete/Archive**.
- `Preview` was added to every table. It opens the shared preview dialog for the
  exact row that was clicked.
- Destructive entries (`danger: true`, e.g. Delete/Archive/Cancel) are always
  moved to the end of the menu, behind a divider, regardless of how a module
  declared them.
- Existing module actions keep their own labels and handlers; nothing was
  removed or renamed in a module's business actions.

## 3. View pages updated

A shared summary strip (`RecordViewHero`) was added under the page header so
these pages now follow the quotation reference's reference/status/key-fact
layer:

| View page | Route |
| --- | --- |
| Mechanical Design View | `/mechanical-design/design-register/:designId` |
| Project View | `/projects/:projectId` |
| BOM View | `/bom-cost/bom/:bomId` |
| Drawing View | `/cad-management/drawings/:drawingId` |
| Engineering Analysis View | `/analysis/:analysisId` |
| Manufacturing View | `/manufacturing-design/:kind/:recordId` |
| Design Calculation View | `/mechanical-design/design-calculations/:calcId` |
| Simulation Validation Report View | `/engineering-analysis/reports/:reportId` |

Pages that already implemented an equivalent module-specific summary block were
left intact rather than duplicated: Quotation View (`qr-detail-hero`), Request
View (`er-detail-hero`), Design Review View (`approvals-detail-hero`), Handover
View (`dh-detail-status`) and Transfer View (dedicated detail component).

Every View page continues to show its own real fields, status, tabs, related
tables, attachments and history — no quotation fields were copied into other
modules and no placeholder values were introduced.

## 4. CRM reference behaviour inspected

- First column (and selection column) stays fixed while middle columns scroll.
- Actions column stays fixed at the right edge while middle columns scroll.
- Header and body stay aligned because both the `thead` and `tbody` cells are sticky.
- Row action menu is anchored to the last column and must not be clipped by the table's scroll container.

Adopted: the pinned column boundaries. The previous opaque 14px pin gutter was
clipping the first characters of the neighbouring column when the table was at
rest. It is now enabled only while the table is actually horizontally scrolled,
and the identifying column has a separator, a small amount of extra breathing
room and a 12px record-ID type size so `DES-2026-001` is fully readable.

## 5. Quotation View page layout inspected

Structure observed and mirrored: breadcrumb → title with status → header actions
(Back to List / Edit / Preview / More) → reference and key-fact strip → tabs →
card sections with label/value grids → related tables → footer actions.

The shared shell reuses the existing Design ERP primitives (`PageLayout`,
`PageHeader`, `Breadcrumb`, `Card`, `StatusBadge`) rather than introducing a
second design language, so the Design theme is unchanged.

## 6. Three-dot action availability by module

| Module | View | Preview | Edit | Conversions | Delete / Archive |
| --- | --- | --- | --- | --- | --- |
| Request register | Yes | Yes | Yes (locked statuses labelled) | Convert to project / quotation entry points | Delete when status allows and no project is linked |
| Quotations | Yes | Yes | Yes | Convert to project (accepted only) | Not offered — no delete operation exists in the quotation data layer |
| Projects | Yes | Yes | Yes | Create design plan | Delete draft; Archive otherwise |
| Design plans | Panel view | Yes | Yes | Create design task | Delete draft plan |
| Design tasks | Yes | Yes | Yes | — | Existing task actions |
| Concepts | Concept details page | Yes | Yes | Open mechanical design | Delete concept |
| Mechanical designs | Yes | Yes | Yes | Engineering analysis, design review submission | Archive design |
| Design calculations | Yes | Yes | Yes | — | Existing calculation actions |
| Parts & assemblies | Existing part/assembly panels | Yes | Yes | — | Existing actions |
| Engineering analysis | Yes | Yes | Yes | Manufacturing definition | Archive |
| Validation reports (simulation) | Yes | Yes | Yes | — | Existing report actions |
| Manufacturing records | Yes | Yes | Yes | BOM | Existing record actions |
| BOMs | Yes | Yes | Yes (editable statuses) | Drawing, transfer, design review | Delete draft/in-progress BOM (confirmation with BOM number) |
| Drawings | Yes | Yes | Yes (draft/changes requested) | Design review, transfer | Delete draft drawing |
| Design reviews | Yes | Yes | Yes (draft) | Engineering change, handover | Existing review actions |
| Engineering changes | Yes | Yes | Yes | Release flow actions | Existing draft actions |
| Handovers | Yes | Yes | Yes | Send to production | Delete draft |
| Transfers | Yes | Yes | Yes | Raise production query | Cancel transfer (not delete) |

Actions that are not permitted for a record are not rendered at all — no
disabled or fake entries were added to make tables look identical.

## 7. Existing conversion actions preserved

Conversions are the ones already implemented in
`src/context/WorkflowConversionContext.jsx`. The menu simply calls the existing
`openConversion(type, record)` entry point, so the existing confirmation dialog,
eligibility checks, duplicate prevention and status gates are unchanged.

Eligibility rules currently enforced by that provider:

- Enquiry → Quotation: status Ready for Quotation/Quotation Prepared, no existing quotation.
- Quotation → Project: status Accepted, not already converted.
- Project → Design plan: no plan linked yet.
- Design plan → Design task: no task linked yet.
- Concept → Mechanical design: concept Selected, no design linked.
- Design → Analysis / Design review: analysis always available unless linked; review needs Completed/Released.
- Analysis → Manufacturing definition: verification Verified.
- Manufacturing → BOM: Approved/Released.
- BOM → Drawing / Transfer / Review: Released (review also allows Approved).
- Drawing → Transfer / Review: Released (review also allows Approved).
- Review → Engineering change: review Approved/Released.
- Any → Transfer: released BOM or drawing.

Opening the menu does not create anything. A conversion runs only after the
user picks the action and confirms in the existing conversion dialog. Blocked
conversions show their reason inside that dialog.

## 8. Delete eligibility and restrictions

Delete entries are only rendered where the module already exposes a delete
operation and the record's status allows it. Existing confirmation dialogs are
reused; each one names the record (e.g. BOM-2026-004) and explains the
restriction. Released/approved engineering records are archived or superseded
rather than deleted, and no related records are cascade-deleted.

Modules with no delete primitive in their context (quotations, analysis,
reviews) show no Delete action.

## 9. Shared components reused or modified

Created:

- `src/components/common/RecordPreview.jsx` — `RecordPreviewDialog` plus
  `useRecordPreview`. Renders the real record's populated fields (identity and
  workflow fields first), its status, and an "Open full details" action.
- `src/components/common/RecordViewPage.jsx` — `RecordViewPage` shell and
  `RecordViewHero` summary strip for View Details pages.

Modified:

- `src/components/common/DataTable.jsx` — `standardActions()`, automatic
  Preview entry, normalized destructive ordering, preview dialog wiring,
  horizontal-scroll state for the pin gutter.
- `src/components/common/index.js` — exports.
- `src/styles/design-system.css` — record preview, record view hero, pin
  boundary fixes.

Reused unchanged: `Dropdown`/`ActionMenu` (already portalled), `Modal`,
`StatusBadge`, `PageHeader`, `PageLayout`, `Breadcrumb`, `Card`, `Button`,
each module's existing delete/confirmation dialogs and the existing workflow
conversion dialog.

## 10. Files modified and created

Created (2):

- `src/components/common/RecordPreview.jsx`
- `src/components/common/RecordViewPage.jsx`

Modified (11):

- `src/components/common/DataTable.jsx`
- `src/components/common/index.js`
- `src/styles/design-system.css`
- `src/pages/mechanical/DesignDetailPage.jsx`
- `src/pages/mechanical/CalculationDetailPage.jsx`
- `src/pages/projects/ProjectDetailPage.jsx`
- `src/pages/bom/BomDetailPage.jsx`
- `src/pages/cad/DrawingDetailPage.jsx`
- `src/pages/analysis/AnalysisDetailPage.jsx`
- `src/pages/manufacturing/ManufacturingDetailPage.jsx`
- `src/pages/simulation/ValidationReportDetailPage.jsx`

Deleted: none.

## 11. Test results (executed)

Checked in the running app at `http://localhost:5173`:

- Design Register actions menu for `DES-2026-002` renders, in order:
  View design, Preview, Edit design, Submit for validation, Create revision,
  Convert design, Duplicate design, View revision history, divider, Archive design.
- Project register menu renders: View project, Preview, Edit project, View
  workflow, Create design plan, Duplicate project, Archive project.
- Preview on `DES-2026-002` opened a dialog titled `DES-2026-002` showing the
  record's real values (Record ID, Name, Project, Project Name, Status, Revision,
  Priority, Engineer) and a footer with Close / Open full details.
- Conversion action opened the existing workflow conversion dialog for
  `DES-2026-002`, showing "Create Engineering Analysis" enabled and "Submit
  Design Package for Review" blocked with its reason; the dialog was cancelled,
  no record was created.
- Delete confirmation opened for draft BOM `BOM-2026-004` with the record
  identifier in the dialog; cancelled, no record was deleted.
- BOM register menu included Preview between View and Edit and kept Delete last.
- First column stayed pinned and the Actions column stayed pinned while the
  Design Register was scrolled to its maximum horizontal offset, and while the
  Project register was scrolled to maximum (886px) offset.
- View pages rendered the new summary strip with real data:
  - Design `DES-2026-002` (project, owner, engineer, reviewer, target, CAD ref)
  - Project `PRJ-2026-029`
  - BOM `BOM-2026-001` (released, Rev C, 6 items)
  - Manufacturing `MFD-2026-001`
  - Analysis `ANL-2026-001`
- No console errors were logged during these navigations and interactions.
- `npm run build` completed with exit code 0 (only the pre-existing
  chunk-size advisory).

Not executed (stated as a limitation, not a pass):

- Every one of the 92 tables was not clicked through individually; the change is
  in the shared component they all render.
- No conversion was confirmed end-to-end and no record was deleted, so that no
  ERP data or localStorage state was altered during verification.
- Each module's edit form was not re-submitted; Edit links were verified by route.
- Not verified in dark theme or browsers other than the packaged Chromium.

## 12. Build result

`npm run build` — exit code 0.

## 13. Screenshot evidence

Saved from the running Design app in `docs/design-actions-view-evidence/`:

- `01-design-register-actions-column.png` — register with pinned first column and Actions column.
- `02-actions-menu-view-preview-edit-convert.png` — expanded menu (View, Preview, Edit, conversions, divider, Archive).
- `03-preview-modal.png` — Preview dialog for the selected design.
- `04-design-view-details-page.png` — standardized Design View page header + summary strip.
- `05-view-details-information-sections.png` — View page information sections (captured zoomed out so the sections fit one screenshot).
- `06-first-column-pinned-horizontal-scroll.png` — first column pinned while scrolled.
- `07-actions-column-pinned-horizontal-scroll.png` — Actions column pinned while scrolled.
- `08-conversion-actions-eligibility.png` — conversion dialog with eligibility and blocked reason.
- `09-delete-confirmation.png` — delete confirmation naming the record.

## 14. Remaining limitations

- Design Plans, Design Tasks, Parts, Assemblies and CAD files have no dedicated
  detail route in this app. Their View/Preview opens the existing panel or the
  shared preview; no detail pages were invented for them.
- Quotations, Engineering Analysis and Design Reviews have no delete operation
  in their data layer, so they intentionally show no Delete action.
- The Transfers module pages still crash at `TransfersModulePage.jsx:65`
  (`Cannot read properties of undefined (reading 'base')`) because `transfers`
  has no entry in `src/config/navigation.js`. This is pre-existing and was not
  changed; its tables therefore could not be exercised in the browser.
- Detail-page related tables keep their module-specific row actions; the shared
  Preview is available there, but module record View/Edit semantics differ by design.
- The right-pinned Actions column overlays middle columns at rest on tables whose
  natural width exceeds the viewport; this is the intended CRM-style behaviour.
