# 01 — Complete Module Inventory

**Application:** Mechanical Design ERP (`C:\Users\Mahes\Desktop\Design`)  
**Inspection date:** 17 November 2026  
**Inspection type:** Read-only source and runtime inspection  
**Runtime:** Vite development server at `http://localhost:5173`  
**Production build:** `npm run build` — PASS (exit 0)  
**Source of truth:** `src/config/navigation.js`, `src/App.jsx`, React contexts, and the running application. Earlier documentation was not trusted.

---

## 1. Executive snapshot

| Measure | Actual value | Evidence |
|---|---:|---|
| Module definitions in navigation | **20** | `MODULES` array in `src/config/navigation.js` |
| Sidebar module entries | **18** | `LIFECYCLE_GROUPS` / `SIDEBAR_ITEMS`; Customer & Sales is one grouped entry |
| Dashboard entries | **1** | `DASHBOARD` in `src/config/navigation.js` |
| Alias modules without their own sidebar item | **2** | `customer-enquiries`, `quotation-review` |
| Modules with horizontal tabs | **16** | All module definitions with `tabs.length > 0` |
| Route-backed module tabs | **56** | Sum of `tabs` in `MODULES` |
| Modules without tabs | **4** | `customer-enquiries`, `quotation-review`, `support`, `settings` |
| Runtime route patterns | **149** | 141 literal paths + 8 report-tab paths + 0 lifecycle placeholders |
| React context providers | **19** | Provider tree in `src/App.jsx` |
| Persistent storage | `localStorage` + `sessionStorage` only | No IndexedDB, no backend, no server database |
| Authentication / roles | **NOT IMPLEMENTED** | Hard-coded “Design Admin” persona; no auth provider or route guard |
| Lifecycle placeholder routes | **0** | `LIFECYCLE_PLACEHOLDERS` filters all 10 entries out in `src/data/lifecycleData.js` |
| Generic module route family | **0 effective routes** | `GENERIC_MODULES` is empty because every `MODULES` key is in `BESPOKE_MODULES` |

---

## 2. Navigation hierarchy actually rendered

```text
Sidebar
├── Dashboard                         /dashboard
├── Customer & Sales                  /customer-sales
│   ├── Customer Enquiry / Requirement
│   └── Quotation & Technical Review
├── Project & Engineering
│   ├── Project Management            /projects
│   ├── Design Planning               /design-planning
│   ├── Conceptual Design             /conceptual-design
│   ├── Mechanical Engineering Design /mechanical-design
│   ├── Engineering Analysis          /engineering-analysis
│   ├── Manufacturing Design          /manufacturing-design
│   ├── BOM & Cost Estimation         /bom-cost
│   └── Drawing & CAD Management      /cad-management
├── Engineering Approval & Release
│   ├── Design Review & Approval      /design-review
│   ├── Engineering Change & Release  /engineering-release
│   └── Engineering Release & Transfer /transfers
├── Manufacturing Preparation
│   └── Manufacturing Readiness & Handover /manufacturing-readiness
├── Manufacturing Execution Tracking
│   ├── Manufacturing Execution Tracking   /manufacturing-tracking
│   └── Manufacturing Support & As-Built   /manufacturing-support
├── Delivery & Service Tracking
│   └── Delivery & Service Tracking        /delivery-tracking
└── Administration
    ├── Reports & Analytics            /reports
    └── Settings                       /settings
```

The two alias keys `customer-enquiries` and `quotation-review` exist only to provide base paths and record-type metadata. Their old base URLs redirect into Customer & Sales. They are not separate sidebar entries.

---

## 3. Module inventory

Status is the module-level primary status. Feature-level statuses and evidence are in reports 02–10.

| # | Module | Base route | Sidebar | Tabs | Purpose / record types | Live records observed | Primary status |
|---:|---|---|:---:|---:|---|---|---|
| 01 | Dashboard | `/dashboard` | Yes | 0 | Portfolio overview, tasks, approvals, CAD and transfer summaries | Static dashboard dataset only | **BROKEN** |
| 02 | Customer & Sales | `/customer-sales` | Yes (group) | 2 | Customer requirements and quotation technical review | Enquiries 9; quotations 10 | **IMPLEMENTED BUT NOT VERIFIED** |
| 03 | Customer Enquiry / Requirement | `/customer-enquiries` | No (alias) | 0 | Enquiry register, detail, documents and clarifications | Same 9 enquiry records | **IMPLEMENTED BUT NOT VERIFIED** |
| 04 | Quotation & Technical Review | `/quotation-review` | No (alias) | 0 | Feasibility, preliminary cost, review and quotation history | Same 10 quotation records | **IMPLEMENTED BUT NOT VERIFIED** |
| 05 | Project Management | `/projects` | Yes | 2 | Project register, detail, team, milestones and progress | Projects 15; team 17; milestones 21 | **IMPLEMENTED BUT NOT VERIFIED** |
| 06 | Design Planning | `/design-planning` | Yes | 2 | Design plans and assigned design tasks | Plans 11; tasks 39 | **IMPLEMENTED BUT NOT VERIFIED** |
| 07 | Conceptual Design | `/conceptual-design` | Yes | 2 | Concept register, development, comparison and selection | Concepts 15; layout files 8; studies 6; comparisons 5; proposals 3 | **IMPLEMENTED BUT NOT VERIFIED** |
| 08 | Mechanical Engineering Design | `/mechanical-design` | Yes | 3 | Design register, parts/assemblies and calculations | Designs 18; parts 24; assemblies 9; calculations 9 | **IMPLEMENTED BUT NOT VERIFIED** |
| 09 | Engineering Analysis | `/engineering-analysis` | Yes | 3 | Analysis register, verification review and validation reports | Analyses 25; verification reviews 17; validation reports 4 | **IMPLEMENTED BUT NOT VERIFIED** |
| 10 | Manufacturing Design | `/manufacturing-design` | Yes | 3 | Manufacturing definitions, inspection requirements, process plans | Definitions 18; inspection plans 10; process plans 10 | **IMPLEMENTED BUT NOT VERIFIED** |
| 11 | BOM & Cost Estimation | `/bom-cost` | Yes | 3 | Engineering BOM, material/quantity/cost planning, BOM release | BOMs 11; materials 12; quantity calcs 8; labour 11; rates 11; estimates 8 | **IMPLEMENTED BUT NOT VERIFIED** |
| 12 | Drawing & CAD Management | `/cad-management` | Yes | 4 | CAD repository, drawings, browser viewers, revisions and transmittals | CAD files 14; drawings 13; transmittals 6; handovers 5 | **IMPLEMENTED BUT NOT VERIFIED** |
| 13 | Design Review & Approval | `/design-review` | Yes | 5 | Engineering, manufacturing and client review; controlled release | Review records 15 | **IMPLEMENTED BUT NOT VERIFIED** |
| 14 | Engineering Change & Release | `/engineering-release` | Yes | 3 | ECR/ECO register, impact assessment and engineering release | Changes 10; releases 2 | **IMPLEMENTED BUT NOT VERIFIED** |
| 15 | Engineering Release & Transfer | `/transfers` | Yes | 5 | Purchase/production handover, validation, acknowledgement and history | Transfers 17 | **IMPLEMENTED BUT NOT VERIFIED** |
| 16 | Manufacturing Support & As-Built | `/manufacturing-support` | Yes | 0 | Production queries, deviations, ECRs and as-built engineering records | Cases 17 | **IMPLEMENTED BUT NOT VERIFIED** |
| 17 | Manufacturing Readiness & Handover | `/manufacturing-readiness` | Yes | 3 | Readiness records and Purchase/Production handover tracking | Readiness 6; purchase handovers 2; production handovers 4 | **IMPLEMENTED BUT NOT VERIFIED** |
| 18 | Manufacturing Execution Tracking | `/manufacturing-tracking` | Yes | 4 | Read-only material, production, inspection and support tracking | Production orders 2; other tabs read linked modules | **IMPLEMENTED BUT NOT VERIFIED** |
| 19 | Delivery & Service Tracking | `/delivery-tracking` | Yes | 4 | Finished goods, dispatch, invoices and service/warranty | Quality 2; finished goods 2; dispatches 2; invoices 2; deliveries 2 | **IMPLEMENTED BUT NOT VERIFIED** |
| 20 | Reports & Analytics | `/reports` | Yes | 8 | Project, progress, CAD, BOM, cost, approval, change and workload analytics | Static `reportsData.js` | **IMPLEMENTED BUT NOT VERIFIED** |
| 21 | Settings | `/settings` | Yes | 0 | Engineering rules, approval matrix, finance, numbering, documents and access | 18 configurable categories, 80 sections, 301 fields | **IMPLEMENTED BUT NOT VERIFIED** |

> Rows 03 and 04 are navigation aliases, which is why 21 record-bearing areas appear above although navigation defines **20 modules**. The sidebar renders **18 module links plus Dashboard**.

---

## 4. What each module actually owns

| Module | Registers / owned records | Primary forms | Own storage key |
|---|---|---|---|
| Customer & Sales | Enquiries, quotations | Enquiry form, quotation form, enquiry detail tabs | `md-customer-enquiry-state-v1`, `md-quotation-review-state-v1` |
| Projects | Projects, team members, milestones | New project, project detail setup, team/milestone modals | `md-project-state-v1` |
| Design Planning | Plans, tasks | Design plan form, task form | `md-planning-state-v1` |
| Conceptual Design | Concepts, layout files, studies, comparisons, proposals | Concept creation/edit | `md-concept-state-v1` |
| Mechanical | Designs, parts, assemblies, calculations | Design/part/assembly/calculation forms | `md-mechanical-state-v1` |
| Analysis | Analyses, verification reviews, validation reports | Analysis form, validation report form | `md-analysis-state-v1` |
| Manufacturing Design | Definitions, inspection plans, process plans | Kind-specific manufacturing form | `md-manufacturing-state-v1` |
| BOM & Cost | BOMs, material requirements, quantity calculations, labour, rates, estimates | BOM, material, quantity and estimate forms | `md-bom-state-v1` |
| CAD | Files, drawings, transmittals, handovers | CAD metadata, drawing record | `md-cad-state-v1` |
| Design Review | Reviews, approvals, releases, decision history | New review, checklist/decision dialogs | `md-approvals-state-v1` |
| Engineering Release | Changes, releases | New change and change detail actions | `md-engineering-release-state-v1` |
| Transfers | Transfers and destination workflows | New transfer, validation, handover/acknowledgement dialogs | `md-transfers-state-v1` |
| Support | Engineering cases | Case form, case actions | `md-support-state-v1` |
| Readiness | Readiness, Purchase handovers, Production handovers | Three create dialogs | `md-manufacturing-readiness-state-v1` |
| Execution tracking | Production orders | New production order, progress update | `md-production-tracking-v1` |
| Delivery | Quality, finished goods, dispatch, invoice, delivery | Five create dialogs plus status selects | `md-fulfilment-state-v1` |
| Reports | No writable report records | None | Static import; `md-reports-state-v1` is orphaned |
| Settings | 18 configuration categories | Category edit form and list editors | `md-settings-v1` |
| Dashboard | None | None | Static import; no live context use |

---

## 5. Important structural findings

### 5.1 The application is a browser-only prototype

- There is no API client, server, database, authentication or authorization layer.
- All 19 providers hydrate from bundled seed arrays and persist selected state to `localStorage`.
- “Design Admin” is a hard-coded persona in the UI.
- Uploaded binaries are not persisted; only CAD selected files receive a temporary `URL.createObjectURL` handle during the session.

Evidence: `src/App.jsx`; context files in `src/context/`; no `fetch` data layer; no login route.

### 5.2 The Dashboard is disconnected from live module state

`src/pages/Dashboard.jsx` imports only `src/data/dashboardData.js` and never calls a module context. It therefore reports:

| Dashboard metric | Dashboard value | Live value observed |
|---|---:|---:|
| Projects | 12 | 15 |
| Design tasks | 25 | 39 |
| CAD files | 148 | 14 |
| Draft drawings | 32 | Derived drawing data |
| Released drawings | 96 | Derived drawing data |
| Pending approvals | 6 | 15 review records |
| Transfers shown | 4 pending / 11 acknowledged / 1 failed / 7 packages | 17 transfer records |

Several dashboard destination paths are also invalid (see 02 §7), so the module is classified **BROKEN**.

### 5.3 Two module models coexist

- `MODULES` describes 20 record modules and 56 tabs.
- `LIFECYCLE_GROUPS` controls the sidebar and groups 18 destinations.
- `LIFECYCLE_PLACEHOLDERS` is now an empty list after all its former entries were mapped to real modules.
- `GENERIC_MODULES` is empty, so there are no generic placeholder module screens in the running route table.

### 5.4 Review, release and transfer are deliberately decoupled

A controlled release created in Design Review does **not** create a Transfer automatically and does **not** call Purchase or Production. The release dialog states this explicitly. Transfer creation is a separate record with its own validation, or a workflow conversion initiated from released BOM/drawing records.

### 5.5 Settings are configuration-only

Only `SettingsModulePage.jsx` calls `useSettings()`. No other module reads settings. Approval thresholds, numbering rules, workflow sequences and notification preferences therefore do not affect module behavior.

### 5.6 Reports are static

`src/pages/reports/ReportsModulePage.jsx` reads from `src/data/reportsData.js`. The report data is not derived from the live contexts. `md-reports-state-v1` exists in browser storage as an orphan array (56 entries) and is not read by source code.

---

## 6. Module-level conclusions

- **18 modules are reachable from the sidebar**, plus Dashboard. All module base routes and all 56 tab routes render without a page-level crash at 1440×900.
- The **core data model is implemented** for enquiry through delivery, but most write workflows were not executed end-to-end to avoid creating unnecessary records. They are therefore **IMPLEMENTED BUT NOT VERIFIED**, not “verified”.
- The strongest verified areas are: route rendering, register/search/filter/sort/pagination, empty-form validation, CAD sample rendering, workflow-link display and responsive shell behavior.
- The largest gaps are: no backend/auth, static Dashboard and Reports, settings with no operational effect, browser-memory-only CAD uploads, incomplete link destinations, and no true file attachment storage.

---

## 7. Evidence index

| Evidence | File |
|---|---|
| Module and tab definitions | `src/config/navigation.js` |
| Route table and provider tree | `src/App.jsx` |
| Sidebar grouping and labels | `LIFECYCLE_GROUPS` in `src/config/navigation.js` |
| Empty lifecycle placeholders | `src/data/lifecycleData.js` |
| Dashboard data source | `src/pages/Dashboard.jsx`, `src/data/dashboardData.js` |
| Report data source | `src/pages/reports/ReportsModulePage.jsx`, `src/data/reportsData.js` |
| Settings consumers | `src/context/SettingsContext.jsx`, `src/pages/settings/SettingsModulePage.jsx` |
| Persistence keys | `src/context/*.jsx` `STORAGE_KEY` constants |
