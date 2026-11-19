# 02 — Route, Page and Tab Inventory

**Application:** Mechanical Design ERP  
**Inspection date:** 17 November 2026  
**Method:** Static route-table extraction from `src/App.jsx` and `src/config/navigation.js`, then runtime navigation at 1440×900.

---

## 1. Route model

| Measure | Value |
|---|---:|
| `MODULES` definitions | 20 |
| Sidebar module destinations | 18 + Dashboard |
| Modules with route-backed tabs | **16** |
| Route-backed module tabs | **56** |
| Source `<Route>` declarations | 147 lines |
| Runtime leaf route patterns | **149** (141 literal paths + 8 report-tab paths; lifecycle placeholders currently 0) |
| Catch-all route | `/ *` → `/dashboard` |
| Detail/form routes | 55 |
| Redirect routes | 15 |

All module tabs are URL-backed. Clicking a tab changes the path, and a direct URL load opens the same tab. The first tab of each module uses the module base path; subsequent tabs append a slug.

---

## 2. Complete tab inventory (56 tabs)

Runtime result: **all 56 paths loaded at 1440×900 without a page-level error boundary or blank page**.

| # | Module | Tab label | Path | Data source | Route status |
|---:|---|---|---|---|---|
| 1 | Customer & Sales | Customer Enquiry / Requirement | `/customer-sales` | Live `CustomerEnquiryContext` | IMPLEMENTED AND VERIFIED |
| 2 | Customer & Sales | Quotation & Technical Review | `/customer-sales/quotations` | Live `QuotationReviewContext` | IMPLEMENTED AND VERIFIED |
| 3 | Project Management | Projects | `/projects` | Live `ProjectsContext` | IMPLEMENTED AND VERIFIED |
| 4 | Project Management | Project Details & Progress | `/projects/project-details` | Live `ProjectsContext` | IMPLEMENTED AND VERIFIED |
| 5 | Design Planning | Design Plans | `/design-planning` | Live `PlanningContext` | IMPLEMENTED AND VERIFIED |
| 6 | Design Planning | Tasks & Progress | `/design-planning/tasks-progress` | Live `PlanningContext` | IMPLEMENTED AND VERIFIED |
| 7 | Conceptual Design | Concept Register | `/conceptual-design` | Live `ConceptContext` | IMPLEMENTED AND VERIFIED |
| 8 | Conceptual Design | Concept Details | `/conceptual-design/concept-details` | Live `ConceptContext` | IMPLEMENTED AND VERIFIED |
| 9 | Mechanical Design | Design Register | `/mechanical-design/design-register` | Live `MechanicalContext` | IMPLEMENTED AND VERIFIED |
| 10 | Mechanical Design | Parts & Assemblies | `/mechanical-design/parts-assemblies` | Live `MechanicalContext` | IMPLEMENTED AND VERIFIED |
| 11 | Mechanical Design | Design Calculations | `/mechanical-design/design-calculations` | Live `MechanicalContext` | IMPLEMENTED AND VERIFIED |
| 12 | Engineering Analysis | Analysis Register | `/engineering-analysis/register` | Live `AnalysisContext` | IMPLEMENTED AND VERIFIED |
| 13 | Engineering Analysis | Review & Verification | `/engineering-analysis/review` | Live `AnalysisContext` | IMPLEMENTED AND VERIFIED |
| 14 | Engineering Analysis | Validation Reports | `/engineering-analysis/reports` | Live `AnalysisContext` | IMPLEMENTED AND VERIFIED |
| 15 | Manufacturing Design | Manufacturing Definition | `/manufacturing-design/definition` | Live `ManufacturingContext` | IMPLEMENTED AND VERIFIED |
| 16 | Manufacturing Design | Inspection & Quality Requirements | `/manufacturing-design/inspection` | Live `ManufacturingContext` | IMPLEMENTED AND VERIFIED |
| 17 | Manufacturing Design | Process Planning & Instructions | `/manufacturing-design/process` | Live `ManufacturingContext` | IMPLEMENTED AND VERIFIED |
| 18 | BOM & Cost | BOM Management | `/bom-cost/bom` | Live `BomContext` | IMPLEMENTED AND VERIFIED |
| 19 | BOM & Cost | Cost Planning & Estimation | `/bom-cost/cost` | Live `BomContext` | IMPLEMENTED AND VERIFIED |
| 20 | BOM & Cost | BOM Revision & Release | `/bom-cost/releases` | Live `BomContext` | IMPLEMENTED AND VERIFIED |
| 21 | CAD | CAD File Repository | `/cad-management/repository` | Live `CadContext` + session file handles | IMPLEMENTED AND VERIFIED |
| 22 | CAD | Drawing Management | `/cad-management/drawings` | Live `CadContext` | IMPLEMENTED AND VERIFIED |
| 23 | CAD | CAD Viewer | `/cad-management/viewer` | Live `CadContext` + Three.js/SVG/iframe | IMPLEMENTED AND VERIFIED |
| 24 | CAD | Revision & Release Management | `/cad-management/releases` | Live `CadContext` | IMPLEMENTED AND VERIFIED |
| 25 | Design Review | Review Register | `/design-review` | Live `ApprovalsContext` | IMPLEMENTED AND VERIFIED |
| 26 | Design Review | Engineering Review | `/design-review/engineering` | Live `ApprovalsContext` | IMPLEMENTED AND VERIFIED |
| 27 | Design Review | Manufacturing Review | `/design-review/manufacturing` | Live `ApprovalsContext` | IMPLEMENTED AND VERIFIED |
| 28 | Design Review | Client Approval | `/design-review/client` | Live `ApprovalsContext` (simulated client) | IMPLEMENTED AND VERIFIED |
| 29 | Design Review | Release History | `/design-review/releases` | Live `ApprovalsContext` | IMPLEMENTED AND VERIFIED |
| 30 | Engineering Release | Change Register | `/engineering-release` | Live `EngineeringReleaseContext` | IMPLEMENTED AND VERIFIED |
| 31 | Engineering Release | ECR / ECO | `/engineering-release/ecr-eco` | Live `EngineeringReleaseContext` | IMPLEMENTED AND VERIFIED |
| 32 | Engineering Release | Engineering Release | `/engineering-release/release` | Live `EngineeringReleaseContext` | IMPLEMENTED AND VERIFIED |
| 33 | Transfers | Transfer Register | `/transfers` | Live `TransfersContext` | IMPLEMENTED AND VERIFIED |
| 34 | Transfers | Purchase Transfer | `/transfers/purchase` | Live `TransfersContext` | IMPLEMENTED AND VERIFIED |
| 35 | Transfers | Production Transfer | `/transfers/production` | Live `TransfersContext` | IMPLEMENTED AND VERIFIED |
| 36 | Transfers | Transfer Tracking | `/transfers/tracking` | Live `TransfersContext` | IMPLEMENTED AND VERIFIED |
| 37 | Transfers | Transfer History | `/transfers/history` | Live `TransfersContext` | IMPLEMENTED AND VERIFIED |
| 38 | Readiness | Manufacturing Readiness | `/manufacturing-readiness` | Live `ManufacturingReadinessContext` | IMPLEMENTED AND VERIFIED |
| 39 | Readiness | Purchase Handover Tracking | `/manufacturing-readiness/purchase` | Live readiness context | IMPLEMENTED AND VERIFIED |
| 40 | Readiness | Production Handover Tracking | `/manufacturing-readiness/production` | Live readiness context | IMPLEMENTED AND VERIFIED |
| 41 | Execution Tracking | Material & Inventory Status | `/manufacturing-tracking` | Derived read-only view | IMPLEMENTED AND VERIFIED |
| 42 | Execution Tracking | Production Progress | `/manufacturing-tracking/production` | Live `ProductionTrackingContext` | IMPLEMENTED AND VERIFIED |
| 43 | Execution Tracking | Inspection & Testing Status | `/manufacturing-tracking/inspection` | Derived from readiness/quality | IMPLEMENTED AND VERIFIED |
| 44 | Execution Tracking | Manufacturing Support & As-Built | `/manufacturing-tracking/support` | Derived from support cases | IMPLEMENTED AND VERIFIED |
| 45 | Delivery Tracking | Finished Goods Status | `/delivery-tracking` | Live `FulfilmentContext` | IMPLEMENTED AND VERIFIED |
| 46 | Delivery Tracking | Dispatch Tracking | `/delivery-tracking/dispatch` | Live `FulfilmentContext` | IMPLEMENTED AND VERIFIED |
| 47 | Delivery Tracking | Invoice Tracking | `/delivery-tracking/invoice` | Live `FulfilmentContext` | IMPLEMENTED AND VERIFIED |
| 48 | Delivery Tracking | Service & Warranty Tracking | `/delivery-tracking/service` | **Static service seed** (DLV-2026-031…041) | IMPLEMENTED BUT NOT VERIFIED — data not live |
| 49 | Reports | Project Reports | `/reports/project-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 50 | Reports | Design Progress | `/reports/design-progress` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 51 | Reports | CAD / Drawing Reports | `/reports/cad-drawing-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 52 | Reports | BOM Reports | `/reports/bom-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 53 | Reports | Cost Reports | `/reports/cost-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 54 | Reports | Approval Reports | `/reports/approval-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 55 | Reports | Change Reports | `/reports/change-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |
| 56 | Reports | Workload / Delay Reports | `/reports/workload-delay-reports` | Static `reportsData.js` | IMPLEMENTED BUT NOT VERIFIED — static |

### 2.1 Modules without tabs

| Module | Path | Why no tabs |
|---|---|---|
| Customer Enquiry alias | `/customer-enquiries` | Redirect alias; UI lives under Customer & Sales |
| Quotation Review alias | `/quotation-review` | Redirect alias; UI lives under Customer & Sales |
| Support | `/manufacturing-support` | Single-register workspace |
| Settings | `/settings` | Category grid → category detail/edit pages |

---

## 3. Non-tab route inventory

### 3.1 Dashboard, root and fallback

| Pattern | Screen / behaviour | Status |
|---|---|---|
| `/` | Redirect to `/dashboard` | IMPLEMENTED AND VERIFIED |
| `/dashboard` | Static dashboard | **BROKEN** — static data and invalid CTAs |
| `*` | Redirect to `/dashboard` | IMPLEMENTED AND VERIFIED |

### 3.2 Customer & Sales routes

| Pattern | Screen | Status |
|---|---|---|
| `/customer-sales` | Enquiry register | IMPLEMENTED AND VERIFIED |
| `/customer-sales/quotations` | Quotation register | IMPLEMENTED AND VERIFIED |
| `/customer-enquiries` | Redirect to `/customer-sales` | IMPLEMENTED AND VERIFIED |
| `/customer-enquiry` | Redirect to `/customer-sales` | IMPLEMENTED AND VERIFIED |
| `/customer-enquiries/new` | New enquiry form | IMPLEMENTED BUT NOT VERIFIED |
| `/customer-enquiries/:enquiryId/edit` | Edit enquiry | IMPLEMENTED BUT NOT VERIFIED |
| `/customer-enquiries/:enquiryId` | Enquiry overview | IMPLEMENTED AND VERIFIED |
| `/customer-enquiries/:enquiryId/requirements` | Requirement detail tab | IMPLEMENTED AND VERIFIED |
| `/customer-enquiries/:enquiryId/documents` | Documents tab | IMPLEMENTED AND VERIFIED |
| `/customer-enquiries/:enquiryId/clarifications` | Clarifications tab | IMPLEMENTED AND VERIFIED |
| `/customer-enquiries/:enquiryId/history` | Enquiry history tab | IMPLEMENTED AND VERIFIED |
| `/quotation-review` | Redirect to `/customer-sales/quotations` | IMPLEMENTED AND VERIFIED |
| `/quotation-review/new` | New quotation | IMPLEMENTED BUT NOT VERIFIED |
| `/quotation-review/:quotationId/edit` | Edit quotation | IMPLEMENTED BUT NOT VERIFIED |
| `/quotation-review/:quotationId` | Quotation overview | IMPLEMENTED AND VERIFIED |
| `/quotation-review/:quotationId/feasibility` | Technical feasibility | IMPLEMENTED AND VERIFIED |
| `/quotation-review/:quotationId/cost-estimate` | Preliminary cost estimate | IMPLEMENTED AND VERIFIED |
| `/quotation-review/:quotationId/review` | Quotation review | IMPLEMENTED AND VERIFIED |
| `/quotation-review/:quotationId/history` | Quotation history | IMPLEMENTED AND VERIFIED |

### 3.3 Project Management routes

| Pattern | Screen | Status |
|---|---|---|
| `/projects` | Project register | IMPLEMENTED AND VERIFIED |
| `/projects/project-details` | Project detail index | IMPLEMENTED AND VERIFIED |
| `/projects/new-project` | Create project | IMPLEMENTED BUT NOT VERIFIED |
| `/projects/:projectId` | Project detail workspace | IMPLEMENTED AND VERIFIED |
| `/projects/all-projects/:projectId` | Alternate project detail path | IMPLEMENTED AND VERIFIED |
| `/projects/all-projects` | Redirect to `/projects` | IMPLEMENTED AND VERIFIED |
| `/projects/project-team` | Redirect to `/projects` | IMPLEMENTED AND VERIFIED |
| `/projects/milestones` | Redirect to `/projects` | IMPLEMENTED AND VERIFIED |
| `/projects/project-status` | Redirect to `/projects` | IMPLEMENTED AND VERIFIED |

### 3.4 Design Planning routes

| Pattern | Screen | Status |
|---|---|---|
| `/design-planning` | Design plans | IMPLEMENTED AND VERIFIED |
| `/design-planning/tasks-progress` | Tasks and progress | IMPLEMENTED AND VERIFIED |
| `/design-planning/design-plans/new` | Create design plan | IMPLEMENTED BUT NOT VERIFIED |
| `/design-planning/design-plans/:planId/edit` | Edit design plan | IMPLEMENTED BUT NOT VERIFIED |
| `/design-planning/design-tasks/new` | Create design task | IMPLEMENTED BUT NOT VERIFIED |
| `/design-planning/design-tasks/:taskId/edit` | Edit design task | IMPLEMENTED BUT NOT VERIFIED |
| `/design-planning/:submodule` | Unknown slug redirect to base | IMPLEMENTED AND VERIFIED |

### 3.5 Conceptual Design routes

| Pattern | Screen | Status |
|---|---|---|
| `/conceptual-design` | Concept register | IMPLEMENTED AND VERIFIED |
| `/conceptual-design/concept-details` | Concept detail workspace | IMPLEMENTED AND VERIFIED |
| `/conceptual-design/concept-creation` | Create concept | IMPLEMENTED BUT NOT VERIFIED |
| `/conceptual-design/concept-creation/:conceptId/edit` | Edit concept | IMPLEMENTED BUT NOT VERIFIED |
| `/conceptual-design/:submodule` | Unknown slug redirect to base | IMPLEMENTED AND VERIFIED |

### 3.6 Mechanical Engineering Design routes

| Pattern | Screen | Status |
|---|---|---|
| `/mechanical-design` | Base → Design Register | IMPLEMENTED AND VERIFIED |
| `/mechanical-design/design-register` | Design register | IMPLEMENTED AND VERIFIED |
| `/mechanical-design/parts-assemblies` | Parts and assemblies | IMPLEMENTED AND VERIFIED |
| `/mechanical-design/design-calculations` | Calculations register | IMPLEMENTED AND VERIFIED |
| `/mechanical-design/design-register/new` | New design item | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/design-register/:designId/edit` | Edit design | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/design-register/:designId` | Design detail | IMPLEMENTED AND VERIFIED |
| `/mechanical-design/parts-assemblies/parts/new` | New part | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/parts-assemblies/parts/:partId/edit` | Edit part | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/parts-assemblies/assemblies/new` | New assembly | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/parts-assemblies/assemblies/:assemblyId/edit` | Edit assembly | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/design-calculations/new` | New calculation | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/design-calculations/:calcId/edit` | Edit calculation | IMPLEMENTED BUT NOT VERIFIED |
| `/mechanical-design/design-calculations/:calcId` | Calculation detail | IMPLEMENTED AND VERIFIED |
| `/mechanical-design/:submodule` | Unknown slug renders module base | IMPLEMENTED AND VERIFIED |

### 3.7 Engineering Analysis routes

| Pattern | Screen | Status |
|---|---|---|
| `/engineering-analysis` | Analysis register | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/register` | Analysis register | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/review` | Review and verification | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/reports` | Validation reports | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/register/new` | New analysis | IMPLEMENTED BUT NOT VERIFIED |
| `/engineering-analysis/register/:analysisId/edit` | Edit analysis | IMPLEMENTED BUT NOT VERIFIED |
| `/engineering-analysis/register/:analysisId` | Analysis detail | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/review/:reviewId` | Review detail | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/reports/new` | New validation report | IMPLEMENTED BUT NOT VERIFIED |
| `/engineering-analysis/reports/:reportId/edit` | Edit validation report | IMPLEMENTED BUT NOT VERIFIED |
| `/engineering-analysis/reports/:reportId` | Validation report detail | IMPLEMENTED AND VERIFIED |
| `/engineering-analysis/:submodule` | Unknown slug renders module base | IMPLEMENTED AND VERIFIED |

### 3.8 Manufacturing Design routes

| Pattern | Screen | Status |
|---|---|---|
| `/manufacturing-design` | Manufacturing definitions | IMPLEMENTED AND VERIFIED |
| `/manufacturing-design/definition` | Definitions | IMPLEMENTED AND VERIFIED |
| `/manufacturing-design/inspection` | Inspection plans | IMPLEMENTED AND VERIFIED |
| `/manufacturing-design/process` | Process plans | IMPLEMENTED AND VERIFIED |
| `/manufacturing-design/:kind/new` | New definition/inspection/process (kind-gated) | IMPLEMENTED BUT NOT VERIFIED |
| `/manufacturing-design/:kind/:recordId/edit` | Edit record by kind | IMPLEMENTED BUT NOT VERIFIED |
| `/manufacturing-design/:kind/:recordId` | Record detail | IMPLEMENTED AND VERIFIED |
| `/manufacturing-design/:submodule` | Unknown slug renders module base | IMPLEMENTED AND VERIFIED |

### 3.9 BOM & Cost routes

| Pattern | Screen | Status |
|---|---|---|
| `/bom-cost` | BOM Management | IMPLEMENTED AND VERIFIED |
| `/bom-cost/bom` | BOM Management | IMPLEMENTED AND VERIFIED |
| `/bom-cost/bom/new` | Create engineering BOM | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/bom/:bomId/edit` | Edit BOM | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/bom/:bomId` | BOM detail | IMPLEMENTED AND VERIFIED |
| `/bom-cost/cost` | Cost planning | IMPLEMENTED AND VERIFIED |
| `/bom-cost/estimate/new` | New cost estimate | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/estimate/:estimateId/edit` | Edit cost estimate | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/material/new` | New material requirement | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/material/:materialId/edit` | Edit material requirement | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/quantity/new` | New quantity calculation | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/quantity/:calcId/edit` | Edit quantity calculation | IMPLEMENTED BUT NOT VERIFIED |
| `/bom-cost/releases` | BOM revision and release | IMPLEMENTED AND VERIFIED |
| `/bom-cost/:submodule` | Unknown slug redirects to base | IMPLEMENTED AND VERIFIED |

### 3.10 CAD routes

| Pattern | Screen | Status |
|---|---|---|
| `/cad-management` | CAD File Repository | IMPLEMENTED AND VERIFIED |
| `/cad-management/repository` | CAD File Repository | IMPLEMENTED AND VERIFIED |
| `/cad-management/drawings` | Drawing Management | IMPLEMENTED AND VERIFIED |
| `/cad-management/viewer` | CAD Viewer | IMPLEMENTED AND VERIFIED |
| `/cad-management/releases` | Revision & Release Management | IMPLEMENTED AND VERIFIED |
| `/cad-management/files/new` | Register CAD file | IMPLEMENTED BUT NOT VERIFIED |
| `/cad-management/drawings/new` | Create drawing record | IMPLEMENTED BUT NOT VERIFIED |
| `/cad-management/drawings/:drawingId/edit` | Edit drawing | IMPLEMENTED BUT NOT VERIFIED |
| `/cad-management/:submodule` | Unknown slug redirects to base | IMPLEMENTED AND VERIFIED |

### 3.11 Design Review routes

| Pattern | Screen | Status |
|---|---|---|
| `/design-review` | Review register | IMPLEMENTED AND VERIFIED |
| `/design-review/engineering` | Engineering review queue | IMPLEMENTED AND VERIFIED |
| `/design-review/manufacturing` | Manufacturing review queue | IMPLEMENTED AND VERIFIED |
| `/design-review/client` | Client approval queue | IMPLEMENTED AND VERIFIED |
| `/design-review/releases` | Release history | IMPLEMENTED AND VERIFIED |
| `/design-review/new` | New design review | IMPLEMENTED BUT NOT VERIFIED |
| `/design-review/review/:reviewId/edit` | Edit draft review | IMPLEMENTED BUT NOT VERIFIED |
| `/design-review/review/:reviewId` | Review detail | IMPLEMENTED AND VERIFIED |
| `/approvals/*` | Redirect to `/design-review` | IMPLEMENTED AND VERIFIED |

### 3.12 Engineering Release routes

| Pattern | Screen | Status |
|---|---|---|
| `/engineering-release` | Change register | IMPLEMENTED AND VERIFIED |
| `/engineering-release/ecr-eco` | ECR / ECO workspace | IMPLEMENTED AND VERIFIED |
| `/engineering-release/release` | Engineering release workspace | IMPLEMENTED AND VERIFIED |
| `/engineering-change` | Redirect to `/engineering-release` | IMPLEMENTED AND VERIFIED |

### 3.13 Transfer routes

| Pattern | Screen | Status |
|---|---|---|
| `/transfers` | Transfer register | IMPLEMENTED AND VERIFIED |
| `/transfers/purchase` | Purchase transfer | IMPLEMENTED AND VERIFIED |
| `/transfers/production` | Production transfer | IMPLEMENTED AND VERIFIED |
| `/transfers/tracking` | Transfer tracking | IMPLEMENTED AND VERIFIED |
| `/transfers/history` | Transfer history | IMPLEMENTED AND VERIFIED |
| `/transfers/new` | New transfer | IMPLEMENTED BUT NOT VERIFIED |
| `/transfers/:transferId/edit` | Edit transfer (eligibility-gated) | IMPLEMENTED BUT NOT VERIFIED |
| `/transfers/:transferId` | Transfer detail | IMPLEMENTED AND VERIFIED |

### 3.14 Support routes

| Pattern | Screen | Status |
|---|---|---|
| `/manufacturing-support` | Case register | IMPLEMENTED AND VERIFIED |
| `/manufacturing-support/new` | New engineering case | IMPLEMENTED BUT NOT VERIFIED |
| `/manufacturing-support/:caseId/edit` | Edit case | IMPLEMENTED BUT NOT VERIFIED |
| `/manufacturing-support/:caseId` | Case detail | IMPLEMENTED AND VERIFIED |

### 3.15 Readiness, execution and delivery routes

| Pattern | Screen | Status |
|---|---|---|
| `/manufacturing-readiness` | Readiness register | IMPLEMENTED AND VERIFIED |
| `/manufacturing-readiness/purchase` | Purchase handover tracking | IMPLEMENTED AND VERIFIED |
| `/manufacturing-readiness/production` | Production handover tracking | IMPLEMENTED AND VERIFIED |
| `/manufacturing-tracking` | Material and inventory | IMPLEMENTED AND VERIFIED |
| `/manufacturing-tracking/production` | Production progress | IMPLEMENTED AND VERIFIED |
| `/manufacturing-tracking/inspection` | Inspection and testing | IMPLEMENTED AND VERIFIED |
| `/manufacturing-tracking/support` | Support and as-built | IMPLEMENTED AND VERIFIED |
| `/delivery-tracking` | Finished goods | IMPLEMENTED AND VERIFIED |
| `/delivery-tracking/dispatch` | Dispatch tracking | IMPLEMENTED AND VERIFIED |
| `/delivery-tracking/invoice` | Invoice tracking | IMPLEMENTED AND VERIFIED |
| `/delivery-tracking/service` | Service and warranty | IMPLEMENTED BUT NOT VERIFIED — static records |

### 3.16 Reports and Settings routes

| Pattern | Screen | Status |
|---|---|---|
| `/reports` | Project Reports (default) | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/project-reports` | Project Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/design-progress` | Design Progress | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/cad-drawing-reports` | CAD / Drawing Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/bom-reports` | BOM Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/cost-reports` | Cost Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/approval-reports` | Approval Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/change-reports` | Change Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/reports/workload-delay-reports` | Workload / Delay Reports | IMPLEMENTED BUT NOT VERIFIED — static |
| `/settings` | Settings category grid | IMPLEMENTED AND VERIFIED |
| `/settings/:sectionKey` | Settings category detail | IMPLEMENTED AND VERIFIED |
| `/settings/:sectionKey/edit` | Settings category edit form | IMPLEMENTED BUT NOT VERIFIED |

---

## 4. Dynamic route families and guards

| Family | Behaviour |
|---|---|
| `/mechanical-design/:submodule` | Renders module page; unknown tab falls back to first tab/base |
| `/engineering-analysis/:submodule` | Renders module page; unknown tab falls back to register |
| `/manufacturing-design/:submodule` | Renders module page; unknown tab falls back to definition |
| `/bom-cost/:submodule` | Unknown slug resets URL to `/bom-cost` and BOM tab |
| `/cad-management/:submodule` | Unknown slug resets URL to `/cad-management` and repository tab |
| `/design-planning/:submodule` | Redirect to `/design-planning` |
| `/conceptual-design/:submodule` | Redirect to `/conceptual-design` |
| `/transfers/:transferId` | Treats any unmatched segment as a transfer ID; missing ID shows “Transfer not found” |
| `/manufacturing-support/:caseId` | Treats any unmatched segment as a case ID; missing ID shows “Case not found” |
| `/projects/:projectId` | Treats any unmatched segment as project ID |
| `/settings/:sectionKey` | Unknown key falls back to `/settings` overview |

These last-segment wildcard routes are the cause of two user-facing dead links: `/transfers/transfer-history` and `/transfers/manufacturing-package` are interpreted as transfer IDs, and `/manufacturing-support/engineering-change-requests` is interpreted as a case ID.

---

## 5. Runtime route sweep

### 5.1 Desktop 1440×900

| Sweep | Result |
|---|---|
| All 56 tab routes | Loaded; tab title and content matched route; no page-level crash |
| Major forms | 24 form routes loaded; fields extracted |
| Detail routes | Project, enquiry, quotation tabs, design, calculation, analysis, review, report, BOM, drawing, transfer, case all loaded |
| Settings | Overview and all 18 configurable category pages loaded |
| Redirects | `/`, aliases, project redirects, `/approvals/*`, `/engineering-change` verified |
| Non-existent paths | Catch-all returns Dashboard |
| Console | Only Three.js NaN geometry warnings on OBJ sample; no other console errors observed |

### 5.2 Tablet and mobile

A representative cross-module subset was loaded at 820×1000 and 390×844. All 56 tabs were **not** individually re-measured at those widths. See `09-Responsive-UI-Testing.md` for exact coverage and limitations.

---

## 6. Legitimate redirects and their UX effect

| Route | Redirect target | Assessment |
|---|---|---|
| `/` | `/dashboard` | Correct |
| `/customer-enquiries` | `/customer-sales` | Correct alias |
| `/customer-enquiry` | `/customer-sales` | Correct alias |
| `/quotation-review` | `/customer-sales/quotations` | Correct alias |
| `/projects/all-projects` | `/projects` | Valid fallback, but Dashboard uses it as “open project” and lands on register |
| `/projects/project-team` | `/projects` | Valid fallback |
| `/projects/milestones` | `/projects` | Valid fallback |
| `/projects/project-status` | `/projects` | Valid fallback |
| `/approvals/*` | `/design-review` | Backward-compatibility alias |
| `/engineering-change` | `/engineering-release` | Backward-compatibility alias |
| Unknown `/settings/:key` | `/settings` | Silent fallback |
| Unknown `/cad-management/:slug` | `/cad-management` | Silent fallback |
| Unknown `/bom-cost/:slug` | `/bom-cost` | Silent fallback |

---

## 7. Broken or misrouted destinations

These paths are generated by source code and lead to the wrong screen or an error screen.

| Source | Path | Actual result | Status |
|---|---|---|---|
| `Dashboard.jsx` | `/settings/project-templates` | URL resets to `/settings`; no template screen exists | **BROKEN** |
| `Dashboard.jsx`, `dashboardData.js` | `/cad-management/drawing-register` | URL resets to `/cad-management`; repository opens | **BROKEN** |
| `dashboardData.js` | `/cad-management/revision-control` | Resets to `/cad-management`; revision screen not opened | **BROKEN** |
| `dashboardData.js` | `/cad-management/cad-repository` | Resets to CAD base; not the requested repository deep link | **BROKEN** |
| `Dashboard.jsx`, `dashboardData.js` | `/transfers/transfer-history` | “Transfer not found” | **BROKEN** |
| `Dashboard.jsx`, `dashboardData.js` | `/transfers/manufacturing-package` | “Transfer not found” | **BROKEN** |
| `dashboardData.js` | `/transfers/bom-transfer` | “Transfer not found” | **BROKEN** |
| `dashboardData.js` | `/manufacturing-support/engineering-change-requests` | “Case not found” | **BROKEN** |
| `dashboardData.js` | `/bom-cost/bom-revisions` | Resets to `/bom-cost`; no revision deep link | **BROKEN** |
| `dashboardData.js` | `/bom-cost/cost-estimation` | Resets to `/bom-cost`; no estimate deep link | **BROKEN** |
| `Dashboard.jsx` | `/design-planning/tasks-progress` | Works, but “Today’s calendar” count is hard-coded 0 | IMPLEMENTED BUT NOT VERIFIED |
| `Dashboard.jsx` | `/projects/all-projects` | Redirects to `/projects` register rather than opening a project | **BROKEN** as “open project” action |
| `ProjectsModulePage.jsx` | `/settings/project-templates` | Resets to `/settings` | **BROKEN** |

**Runtime evidence:** `/transfers/transfer-history` → “Engineering Release & Transfer … Transfer not found”; `/manufacturing-support/engineering-change-requests` → “Case not found”; `/cad-management/drawing-register` → `/cad-management`.

---

## 8. Route conclusions

- Every declared screen is reachable; there are no 404 pages by design because the catch-all redirects to Dashboard.
- The route table is broader than the visible navigation because forms, detail pages and five sub-tabs per review area are separate paths.
- The main routing defect is not missing implementation but **incorrect destination strings** in the Dashboard and projects page.
- The ten all-encompassing `:param` fallbacks can silently reinterpret a stale slug as a record ID, producing “not found” screens or incorrect base-page redirects.
