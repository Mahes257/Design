# Full-page Preview / View Details standardisation

Mechanical Design ERP frontend (`C:\Users\Mahes\Desktop\Design`, React + Vite,
`http://localhost:5173`). No backend, database, API or `localhost:5174` change was made.

Date: 2026-11-18

## 1. Active sidebar inventory (source of truth)

`src/config/navigation.js` → `LIFECYCLE_GROUPS`:

| Sidebar group | Module | Base route | Record registers inside the module |
| --- | --- | --- | --- |
| Enquiry & Request Management | Enquiry & Request Management | `/customer-sales` | Request Register, Technical Assessment, Quotation & Commercial (quotations) |
| Project & Engineering | Project Management | `/projects` | Projects, Project Details & Progress (project register) |
| Project & Engineering | Design Planning | `/design-planning` | Design Plans, Design Tasks |
| Project & Engineering | Conceptual Design | `/conceptual-design` | Concept Register |
| Project & Engineering | Mechanical Engineering Design | `/mechanical-design` | Design Register, Parts, Assemblies, Design Calculations |
| Project & Engineering | Simulation & Design Validation | `/engineering-analysis` | Simulation Workspace (model files + observations), Simulation & Validation Reports |
| Project & Engineering | Engineering Analysis | `/analysis` | Analysis Register, Review & Verification, Analysis Reports |
| Project & Engineering | Manufacturing Design | `/manufacturing-design` | Manufacturing Definition, Inspection & Quality, Process Planning |
| Project & Engineering | BOM & Cost Estimation | `/bom-cost` | Engineering BOMs, Material BOM, Quantity Calculation, Cost Estimates |
| Project & Engineering | Drawing & CAD Management | `/cad-management` | CAD File Repository, Drawing Register, Revision & Release |
| Engineering Approval & Release | Design Review & Approval | `/design-review` | Review Register, Engineering Review, Manufacturing Review, Release History |
| Engineering Approval & Release | Engineering Change & Release | `/engineering-release` | ECR Register, ECO Management, Revision & Release History |
| Engineering Approval & Release | Design Release & Production Handover | `/design-handover` | Handover Register, Final Package, Release Validation, Send to Production, Transfer History |
| Administration | Reports & Analytics | `/reports` | report views (no individual record register) |
| Administration | Settings | `/settings` | configuration sections (not records) |

`/transfers` is routed but intentionally not a sidebar module; its registers are reached from BOM/drawing
conversions and reporting.

## 2. Modules that already had full-page details pages

These existed before this change and were inspected, kept and reused (only their register Preview
wiring changed):

| Record | Route | Page |
| --- | --- | --- |
| Request | `/customer-sales/requests/:requestId` | `RequestDetailPage` |
| Quotation | `/quotation-review/:quotationId` | `QuotationDetailPage` |
| Project | `/projects/all-projects/:projectId` | `ProjectDetailPage` |
| Mechanical design | `/mechanical-design/design-register/:designId` | `DesignDetailPage` |
| Design calculation | `/mechanical-design/design-calculations/:calcId` | `CalculationDetailPage` |
| Analysis | `/analysis/:analysisId` | `AnalysisDetailPage` |
| Analysis review | `/analysis/review/:reviewId` | `ReviewDetailPage` (analysis) |
| Analysis report | `/analysis/:analysisId/report` | `AnalysisReportPage` |
| Validation report (simulation) | `/engineering-analysis/reports/:reportId` | `SimulationValidationReportDetailPage` |
| Validation report (legacy) | `/engineering-analysis/legacy-reports/:reportId` | `ValidationReportDetailPage` |
| Manufacturing definition / inspection / process | `/manufacturing-design/:kind/:recordId` | `ManufacturingDetailPage` |
| BOM | `/bom-cost/bom/:bomId` | `BomDetailPage` |
| Drawing | `/cad-management/drawings/:drawingId` | `DrawingDetailPage` |
| Design review | `/design-review/review/:reviewId` | `ApprovalReviewDetailPage` |
| Design handover | `/design-handover/:handoverId` | `HandoverDetailPage` |
| Transfer | `/transfers/:transferId` | `TransferDetailPage` |
| Concept details | `/conceptual-design/concept-details?concept=CON-…` | `ConceptDetailsTab` (full page) |
| ECO details | `/engineering-release/ecr-eco?eco=ECO-…` | `EcrEcoTab` (full page) |

The supplied reference (`/mechanical-design/design-register/DES-2026-001`) was used as the visual
standard: breadcrumb → title + ID + status + actions → reference/hero strip → information sections →
related records → history.

## 3. Preview / details pages implemented in this change

Record types that previously opened only a modal (or a table-bound panel) now have their own
dedicated full-page route, built with real context data by route ID:

| New record page | Route | Notes |
| --- | --- | --- |
| Design Plan | `/design-planning/design-plans/:planId` | plan, project, scope, schedule, milestones, linked tasks |
| Design Task | `/design-planning/design-tasks/:taskId` | task, plan, design, project, dependencies, comments |
| Part | `/mechanical-design/parts-assemblies/parts/:partId` | material/geometry, quantity, revision notes, parent assembly |
| Assembly | `/mechanical-design/parts-assemblies/assemblies/:assemblyId` | structure summary, direct parts/subassemblies |
| CAD file | `/cad-management/repository/:fileId` | file metadata, version control, engineering refs, preview/download actions |
| Engineering change request | `/engineering-release/ecr/:changeId` | ECR, impact assessment, linked ECO, history |
| Cost estimate | `/bom-cost/estimate/:estimateId` | estimate + its stored cost lines |
| Material requirement | `/bom-cost/material/:materialId` | requirement, quantity × rate, owning BOM |
| Quantity calculation | `/bom-cost/quantity/:calcId` | base/required/allowance/final quantity, owning BOM |

## 4. Register → details route mapping (Preview and View)

Both **View** and **Preview** now open the same full-page route for every register. Preview is
resolved by the shared `DataTable` through a `recordHref` resolver; the module's own View action
navigates to the same route, so no duplicate page exists.

| Register table | Record ID | Details route |
| --- | --- | --- |
| Request Register | `REQ-…` | `/customer-sales/requests/:id` |
| Projects / Project Details | `PRJ-…` | `/projects/all-projects/:id` |
| Design Plans | `DPL-…` | `/design-planning/design-plans/:id` |
| Design Tasks | `TSK-…` | `/design-planning/design-tasks/:id` |
| Concept Register | `CON-…` | `/conceptual-design/concept-details?concept=:id` |
| Design Register | `DES-…` | `/mechanical-design/design-register/:id` |
| Parts | `PRT-…` | `/mechanical-design/parts-assemblies/parts/:id` |
| Assemblies | `ASM-…` | `/mechanical-design/parts-assemblies/assemblies/:id` |
| Design Calculations | `CAL-…` | `/mechanical-design/design-calculations/:id` |
| Analysis Register / Analysis Reports | `ANL-…` | `/analysis/:id` |
| Review & Verification | review id | `/analysis/review/:id` |
| Validation reports | `VDR-…` / analysis id | `/engineering-analysis/reports/:id`, `/engineering-analysis/legacy-reports/:id`, `/engineering-analysis/register/:analysisId` |
| Manufacturing Definition / Inspection / Process | `MFD-…` etc. | `/manufacturing-design/{definition\|inspection\|process}/:id` |
| Engineering BOMs | `BOM-…` | `/bom-cost/bom/:id` |
| Material BOM | `MREQ-…` | `/bom-cost/material/:id` |
| Quantity Calculation | `QC-…` | `/bom-cost/quantity/:id` |
| Cost Estimates | `CST-…` | `/bom-cost/estimate/:id` |
| CAD File Repository | `CAD-…` | `/cad-management/repository/:id` |
| Drawing Management + attachments | `DRW-…` / `DRG-…` | `/cad-management/drawings/:id` (attachment opens its drawing) |
| BOM Revision & Release | `BOM-…` | `/bom-cost/bom/:id` |
| Review Register | `REV-…` | `/design-review/review/:id` |
| ECR Register | `ECR-…` | `/engineering-release/ecr/:id` |
| ECO Management | `ECO-…` | `/engineering-release/ecr-eco?eco=:id` |
| Handover Register | handover id | `/design-handover/:id` |
| Transfer Register / Tracking / History | `TRF-…` | `/transfers/:id` |

Actions in the three-dot menu keep their existing order: **View → Preview → Edit → module
conversions → divider → Delete/Archive**. Preview is inserted by the shared DataTable directly after
View; destructive items remain last behind a divider. No module action was removed or renamed.

## 5. Actual data sources

| Module | Context / data file |
| --- | --- |
| Requests, quotations | `EnquiryRequestContext`, `QuotationReviewContext` |
| Projects | `ProjectsContext` (`PROJECTS`) |
| Design plans, tasks, milestones | `PlanningContext` (`DESIGN_PLANS`, `DESIGN_TASKS`, `MILESTONES`) |
| Concepts | `ConceptContext` |
| Designs, parts, assemblies, calculations | `MechanicalContext` (`DESIGNS`, `PARTS`, `ASSEMBLIES`, `CALCULATIONS`) |
| Analysis, reviews, reports | `AnalysisContext`, `SimulationContext` |
| Manufacturing | `ManufacturingContext` |
| BOMs, materials, quantities, estimates | `BomContext` (`BOMS`, `MATERIAL_REQUIREMENTS`, `QUANTITY_CALCULATIONS`, `COST_ESTIMATES`) |
| CAD files, drawings | `CadContext` (`files`, `drawings`, `localFiles`) |
| Reviews / release history | `ApprovalsContext` |
| ECR / ECO / releases | `EngineeringReleaseContext` |
| Handovers | `DesignHandoverContext` |
| Transfers | `TransfersContext` |

Every page resolves its record with `records.find(row => row.id === routeParam)`. No page holds a
sample record, and the change preserves the existing `localStorage` persistence keys in each
provider. Unknown IDs render a dedicated **Not found** state with a Back to Register action; they
never fall back to another record.

## 6. Shared components

Reused unchanged: `PageLayout`, `PageHeader`, `Breadcrumb`, `RecordViewHero`, `Card`, `Button`,
`StatusBadge`, `DataTable`, `ActionMenu`, `EmptyState`, module `Fact`/`ActivityList` helpers.

Created:

- `src/components/common/RecordDetails.jsx`
  - `RecordDetailsPage` — header + hero + section cards + attachments + related records + history +
    footer, all fed by the module page.
  - `RecordNotFound` — honest invalid/deleted-record state.
  - `remainingFields()` — renders any real populated scalar field a page did not list explicitly, so
    no stored value is hidden and none is invented.
- `src/components/common/RecordDetails.jsx` is the only new shared layout; the existing
  `RecordViewPage`/`RecordViewHero` remain the frame for older module pages, so the visual language
  is shared rather than duplicated.

`DataTable` gained a single optional prop, `recordHref(row)`. When present, the Preview item
navigates to the record's page; otherwise it falls back to the row's open behaviour (and the quick
dialog stays only for child tables that represent no standalone record). Sorting, filtering,
pagination, pinned columns and the actions menu were not otherwise changed.

## 7. Files modified

- `src/components/common/DataTable.jsx` — Preview resolves `recordHref` and navigates.
- `src/App.jsx` — imports and nine new detail routes.
- `src/pages/planning/DesignPlansTab.jsx` — View/row click navigate; `recordHref`.
- `src/pages/planning/DesignTasksTab.jsx` — View/row click navigate; `recordHref`.
- `src/pages/mechanical/PartsAssembliesTab.jsx` — part/assembly View and row click navigate; `recordHref` on both tables.
- `src/pages/mechanical/DesignRegisterTab.jsx`, `DesignCalculationsTab.jsx` — `recordHref`.
- `src/pages/projects/AllProjectsTab.jsx`, `src/pages/enquiry-requests/RequestRegisterTab.jsx` — `recordHref`.
- `src/pages/analysis/AnalysisRegisterTab.jsx`, `AnalysisReportsTab.jsx`, `ReviewVerificationTab.jsx`, `ValidationReportsTab.jsx` — `recordHref`.
- `src/pages/manufacturing/ManufacturingDefinitionTab.jsx`, `InspectionRequirementsTab.jsx`, `ProcessPlanningTab.jsx` — `recordHref`.
- `src/pages/bom/BomManagementTab.jsx` — BOM `recordHref`; material and quantity View/row click navigate; `recordHref`.
- `src/pages/bom/CostPlanningTab.jsx` — estimate View/row click navigate; `recordHref`.
- `src/pages/bom/RevisionReleaseTab.jsx` — `recordHref`.
- `src/pages/cad/CadRepositoryTab.jsx` — file View/row click navigate; `recordHref`.
- `src/pages/cad/DrawingManagementTab.jsx` — `recordHref` on the register, classification and attachment tables.
- `src/pages/approvals/ReviewRegisterTab.jsx` — `recordHref`.
- `src/pages/engineering-release/ChangeRegisterTab.jsx` — ECR View/row click navigate; `recordHref`.
- `src/pages/engineering-release/EcrEcoTab.jsx` — `recordHref` to the ECO page.
- `src/pages/conceptual/ConceptDevelopmentTab.jsx` — `recordHref` and row click to the concept details page.
- `src/pages/design-handover/HandoverRegisterTab.jsx` — `recordHref`.
- `src/pages/simulation/SimulationReportsTab.jsx` — `recordHref`.
- `src/pages/transfers/TransferHistoryTab.jsx`, `TransferTrackingTab.jsx` — `recordHref`.

## 8. Files created

- `src/components/common/RecordDetails.jsx`
- `src/pages/planning/DesignPlanDetailPage.jsx`
- `src/pages/planning/DesignTaskDetailPage.jsx`
- `src/pages/mechanical/PartDetailPage.jsx`
- `src/pages/mechanical/AssemblyDetailPage.jsx`
- `src/pages/cad/CadFileDetailPage.jsx`
- `src/pages/engineering-release/EcrDetailPage.jsx`
- `src/pages/bom/CostEstimateDetailPage.jsx`
- `src/pages/bom/BomRecordDetailPages.jsx` (`MaterialDetailPage`, `QuantityDetailPage`)
- `docs/full-page-preview-standardization-report.md`
- `docs/full-page-preview-evidence/*.png`

## 9. Existing detail pages preserved

All pages listed in §2 are unchanged and still resolve their own records: the design register
reference page, project, BOM, drawing, analysis, analysis report, review, handover, transfer,
manufacturing and validation-report pages were opened during verification and showed their own real
data. Existing edit routes (`…/edit`) and conversion dialogs are untouched; the ECR, ECO, review and
release workflows still run through their existing providers.

## 10. Modules / registers where a record page does not apply

| Surface | Why no record page |
| --- | --- |
| Reports & Analytics | Views are computed aggregations over many records; there is no single report record. Tables stay as report tables. |
| Settings | `/settings/:sectionKey` already renders a full-page configuration section; those are settings, not records. |
| Simulation Workspace model files / observations | Rows are working files and observation notes inside a validation session, not standalone register records. Their existing editors stay. |
| Release & revision history rows (approvals, BOM, CAD) | Each row is a historical revision/decision entry; View opens the entry's detail panel and, where the row carries one, links to the underlying record page. Inventing a route per historical revision would duplicate the controlled record. |
| Purchase requisitions and Production manufacturing packages (`/transfers` sub-tabs) | These are workflow drafts owned by a transfer/package, not standalone records in a register; their existing dialogs remain. |
| Dashboard tiles | Dashboard is an overview, not a register; its cards are unchanged. |

## 11. Runtime testing (actual browser, `localhost:5173`)

Verified by navigating and reading the rendered page in the running app:

- **Design Plans register** — three-dot menu for `DPL-2026-001` showed View plan, Preview, Edit plan,
  Open tasks, View project, Create design task; **Preview navigated to**
  `/design-planning/design-plans/DPL-2026-001` and the page showed the plan's own ID, project,
  owner, schedule, scope sections, milestones and linked tasks.
- **Back to Design Plans** returned to `/design-planning`; browser **Back** returned to the register
  from the project details page.
- **Design task** `TSK-2101` → correct title, ID, assignment and schedule sections.
- **Part** `PRT-2026-001` → MEC-041-001, material, dimensions, quantity, parent assembly
  `ASM-041-100`, and real revision history (Rev A/B/C notes by D. Rao).
- **Assembly** `ASM-2026-001` → ASM-041-100, project, structure summary with direct parts and
  subassemblies.
- **CAD file** `CAD-2026-001` → file identification, revision/version, engineering references,
  units/preview capability, related records (project, referencing drawing `DRG-MEC-041-001`) and
  upload history; header actions for viewer, Open in CAD Software and download.
- **ECR** `ECR-2026-001` → title, decision, linked ECO `ECO-2026-002`, affected records sections.
- **Cost estimate** `CST-2026-001` → product, BOM, project and cost breakdown.
- **Material requirement** `MREQ-2026-001` → material, 128 kg, rate and owning BOM `BOM-2026-001`.
- **Quantity calculation** `QC-2026-001` → component, final quantity, owning BOM.
- **Existing pages** still render: `DES-2026-001` (design reference), `DRW-2026-001` (drawing),
  `REV-2026-001` (design review), `TRF-2026-001` (transfer), `PRJ-2026-019` (project opened from
  Preview).
- **Invalid ID** `/design-planning/design-plans/DPL-9999` → "Design plan not found" with the record
  ID in the message and a Back to Design Plans action; no other record was substituted.
- **Edit** `/design-planning/design-plans/DPL-2026-001/edit` → Edit Design Plan form with the plan's
  values and its save action.
- No console errors or failed requests were logged during these navigations (Vite connect/debug and
  the React DevTools notice only).

Not executed, and therefore not claimed as verified: every register menu in every module was not
clicked one by one. The Preview behaviour lives in the single shared `DataTable`, and it was
exercised on Design Plans and Projects; the remaining tables were verified by route and by direct
navigation of their detail pages.

## 12. Build result

`npm run build` → **exit 0**, 2,365 modules transformed, only the two pre-existing advisories
(chunk > 500 kB, `occt-import-js` browser externalisation of `path`/`crypto`).

## 13. Screenshot evidence

Saved from the running app in `docs/full-page-preview-evidence/`:

- `01-design-plan-register-actions-menu.png` — Design Plans register with the three-dot menu
  (View plan, Preview, Edit plan, Open tasks, View project, Create design task).
- `02-design-plan-preview-full-page.png` — the full-page record opened by Preview, with breadcrumb,
  record ID, status and Back/Edit actions.
- `06-design-plan-full-record.png` — record summary strip and populated information sections.
- `07-part-details-page.png` — part record page with identification, parent assembly and CAD reference.
- `08-cad-file-details-page.png` — CAD file record page with header actions and file identification.
- `09-ecr-details-page.png` — ECR record page with decision, linked ECO and affected records.
- `10-project-details-from-preview.png` — project page opened from its register Preview.
- `11-browser-back-to-register.png` — browser Back returning to the project register.
- `12-cad-related-records-and-history.png` — related records section on the CAD file page.

Screenshots were taken with the sidebar collapsed (and, for one earlier capture, a page zoom out) so
the record content fits the capture panel; no UI was mocked or edited for the captures.

## 14. Remaining limitations

- The module-specific child tables inside older detail pages (BOM items, milestones, attachments,
  release rows) keep their existing row actions and their own detail panels; they are not separate
  registers and were deliberately not given duplicate pages.
- Existing quick-preview dialog markup remains in some module tabs and in `RecordPreview`; those
  dialogs are no longer reachable from the registers whose View/Preview now navigates, but the
  component is still used by child tables that have no record route.
- Images/screenshots were captured in the packaged Chromium at roughly 900 px width; the ERP's hero
  meta strip and wide tables can require horizontal space on narrow screens (pre-existing layout
  behaviour of the shared table/hero components).
- Not every module's conversion, approval and delete path was executed end-to-end during this pass;
  they were left untouched and their buttons remain wired to the existing providers.
