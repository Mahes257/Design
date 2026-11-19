# Unused Modules Removal Report

**Date:** 17 November 2026  
**Scope:** Remove the three unused navigation groups and four child modules from the React frontend without changing retained modules, workflows, or stored application data.

## Result

The following navigation groups and child modules are removed from the sidebar, route table, breadcrumbs, module metadata, workflow conversion targets, dashboard links, reports, and module-owned source files.

| Removed group | Removed child module | Base route |
|---|---|---|
| Manufacturing Preparation | Manufacturing Readiness & Handover (`manufacturing-readiness`) | `/manufacturing-readiness` |
| Manufacturing Execution Tracking | Manufacturing Execution Tracking (`manufacturing-tracking`) | `/manufacturing-tracking` |
| Manufacturing Execution Tracking | Manufacturing Support & As-Built (`support`) | `/manufacturing-support` |
| Delivery & Service Tracking | Delivery & Service Tracking (`delivery-tracking`) | `/delivery-tracking` |

No empty groups, placeholder routes, navigation entries, or module actions remain for these modules.

## Removed Routes

- `/manufacturing-support`
- `/manufacturing-support/new`
- `/manufacturing-support/:caseId/edit`
- `/manufacturing-support/:caseId`
- `/manufacturing-readiness`
- `/manufacturing-readiness/purchase`
- `/manufacturing-readiness/production`
- `/manufacturing-tracking`
- `/manufacturing-tracking/production`
- `/manufacturing-tracking/inspection`
- `/manufacturing-tracking/support`
- `/delivery-tracking`
- `/delivery-tracking/dispatch`
- `/delivery-tracking/invoice`
- `/delivery-tracking/service`

The former lifecycle placeholder route mapping was also removed. It had no active placeholder entries at the time of removal, but its page, data module, styles, imports, and `findPageMeta` fallback were still present.

## Deleted Files

### Page folders (all files module-owned)

- `src/pages/support/` — 4 files, including:
  - `SupportModulePage.jsx`
  - `CaseFormPage.jsx`
  - `CaseDetailPage.jsx`
  - `supportUi.jsx`
- `src/pages/manufacturing-readiness/` — 5 files, including:
  - `ManufacturingReadinessModulePage.jsx`
  - `ReadinessTab.jsx`
  - `PurchaseHandoverTab.jsx`
  - `ProductionHandoverTab.jsx`
  - `readinessUi.jsx`
- `src/pages/manufacturing-tracking/` — 7 files, including:
  - `ManufacturingTrackingModulePage.jsx`
  - `ProductionOrdersTab.jsx`
  - the module's remaining tab and UI files
- `src/pages/delivery-tracking/` — 8 files, including:
  - `DeliveryTrackingModulePage.jsx`
  - `QualityFinishedGoodsTab.jsx`
  - `DispatchDeliveryTab.jsx`
  - the module's remaining tab and UI files
- `src/pages/lifecycle/LifecyclePlaceholderPage.jsx`

### Contexts

- `src/context/SupportContext.jsx`
- `src/context/ProductionTrackingContext.jsx`
- `src/context/FulfilmentContext.jsx`
- `src/context/ManufacturingReadinessContext.jsx`

### Data and styles

- `src/data/supportData.js`
- `src/data/manufacturingTrackingData.js`
- `src/data/deliveryTrackingData.js`
- `src/data/manufacturingReadinessData.js`
- `src/data/lifecycleData.js`
- `src/styles/support.css`
- `src/styles/lifecycle.css`

### Support-only screenshots

- `support-desktop.png`
- `support-detail-desktop.png`
- `support-form-desktop.png`

## Modified Files

| File | Change |
|---|---|
| `src/config/navigation.js` | Removed four module definitions, all three lifecycle groups, unused icons, lifecycle placeholder imports, and the placeholder breadcrumb lookup. |
| `src/App.jsx` | Removed page imports, four bespoke route registrations, removed route imports, lifecycle placeholder mapping, and the support, production-tracking, fulfilment, and readiness providers. |
| `src/context/WorkflowConversionContext.jsx` | Removed the support-case conversion type, route helper, target detection, conversion action, and `useSupport` dependency. Transfers and all other conversions remain. |
| `src/data/reportsData.js` | Replaced the dependency on `supportData.js` with engineering change request/order data from `engineeringReleaseData.js`. |
| `src/data/dashboardData.js` | Changed the affected activity link from `/manufacturing-support/engineering-change-requests` to the retained `/engineering-release/ecr-eco` route. |
| `src/data/settingsData.js` | Removed “Manufacturing Support” from the default restricted-module description. |
| `src/main.jsx` | Removed `support.css` and `lifecycle.css` imports. |
| `src/data/mockDesignData.js` | Removed the dead support quick-action set and its unused icon import. |
| `src/data/reportingAnalyticsData.js` | Removed readiness, purchase-handover, and production-handover inputs, charts, counts, columns, and report fields. |
| `src/pages/reports/Module14ReportsPage.jsx` | Removed the readiness context import, data input, and hook dependency. |
| `src/pages/reports/ReportsDashboard.jsx` | Removed the manufacturing-readiness chart card and CSV summary rows. |
| `src/pages/reports/ReportsEngineeringTabs.jsx` | Removed readiness chart, readiness table columns, and readiness description copy. |
| `src/pages/reports/ReportsProjectTabs.jsx` | Removed the manufacturing-readiness project column, KPI, and description copy. |

The reports changes were required because report screens consumed the removed readiness dataset. Reports remain available; only the removed module's readiness views and fields were removed.

## Removed References

- Four sidebar module entries and three parent groups.
- All listed route registrations and page imports.
- `BESPOKE_MODULES` entries for the four modules.
- Support, production tracking, fulfilment, and manufacturing readiness providers.
- Readiness source data from the reports analytics model and report UI.
- Support conversion from the shared workflow conversion menu.
- Dead support quick actions and support-only screenshots.
- Lifecycle placeholder data, page, style, imports, and metadata fallback.

## Preserved Shared Code and Data

The following retained areas were not removed because they serve other workflows:

- `DesignHandoverContext` and all `/design-handover` routes.
- `TransfersContext` and all `/transfers` routes.
- Engineering Change & Release, BOM, CAD, approvals, projects, planning, manufacturing design, reports, settings, and all other retained modules.
- Review/approval “Manufacturing readiness review” stage terminology, which belongs to the approvals workflow rather than the removed module.
- Design handover readiness checks and styles (`dh-readiness-*`), which belong to the retained handover workflow.
- Generic transfers and package readiness data.

No localStorage key was cleared, reset, or migrated. Records previously stored under `md-support-state-v1`, `md-manufacturing-readiness-state-v1`, `md-production-tracking-v1`, and `md-fulfilment-state-v1` remain untouched in the browser; the removed modules no longer read or write them.

## Reference Search

A source search was run for the removed module identifiers, context names, data files, style imports, route paths, and display names. No remaining frontend references were found for:

- `manufacturing-support`
- `manufacturing-readiness`
- `manufacturing-tracking`
- `delivery-tracking`
- `ManufacturingReadinessContext` / `useManufacturingReadiness`
- `SupportContext` / `useSupport`
- `ProductionTrackingContext`
- `FulfilmentContext`
- `supportData` / `manufacturingTrackingData` / `deliveryTrackingData` / `lifecycleData`
- `LifecyclePlaceholderPage` / `LIFECYCLE_PLACEHOLDERS`
- `support.css` / `lifecycle.css`

Unrelated uses of the word “readiness” remain where they belong to retained workflows, such as design release, approvals, quotation review, and transfer package validation. Historical audit documents under `docs/application-inspection/` and `docs/e2e-review/` still describe the pre-removal application; they were left as historical records and are not loaded by the frontend.

## Verification

### Build

`npm run build` completed successfully.

- Exit code: `0`
- Modules transformed: `2351`
- Output CSS: `dist/assets/index-VkeECQVB.css`
- Output JS: `dist/assets/index-CALH3d1E.js`
- Only the existing large-chunk and `occt-import-js` browser-externalization warnings were reported.

### Runtime checks performed

- Opened `/dashboard` on the running Vite app.
- Confirmed the sidebar contains only Dashboard, Enquiry & Request Management, Project & Engineering, Engineering Approval & Release, and Administration. None of the three removed groups or four removed children are present.
- Opened `/reports`; the report workspace loads, and the removed readiness card/column is absent.
- Opened `/engineering-release/ecr-eco`, the replacement dashboard activity target; it loads without an error screen.
- Navigated directly to `/manufacturing-support`, `/manufacturing-readiness`, `/manufacturing-tracking`, and `/delivery-tracking`; each falls back to `/dashboard`.
- Checked the browser console after reload. No application runtime errors appeared. A transient Vite HMR connection message occurred during file edits and reconnected.

### Not checked

- Every individual child route and form action was not clicked after removal; the source route audit confirms they are absent.
- Retained modules were not exhaustively regression-tested beyond loading the dashboard, reports, and the replacement engineering-release route.
- Browser storage contents were inspected only indirectly; no storage key was read, written, cleared, or migrated by this cleanup.
- No automated test suite exists or was run.
