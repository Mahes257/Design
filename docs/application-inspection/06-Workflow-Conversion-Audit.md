# 06 — Workflow Conversion Audit

**Inspection date:** 17 November 2026  
**Primary source:** `src/context/WorkflowConversionContext.jsx`  
**Persistence key:** `md-workflow-conversions-v1`  
**Observed links:** 21 persisted conversion links

---

## 1. Conversion model

A “conversion” creates a **new local record**, copies/transforms selected fields, updates the source where applicable, and appends a link:

```js
{
  id: "CV-<timestamp>-<n>",
  at: "2026-11-16T...",
  by: "N. Joshi",
  sourceType: "enquiry",
  sourceId: "ENQ-2026-045",
  targetType: "quotation",
  targetId: "QTN-2026-024",
  label: "Enquiry converted to quotation"
}
```

Links are persisted separately from the records. Every conversion checks `hasTarget(sourceType, sourceId, targetType)` (`links.some(...)`) and cannot be repeated for the same source/target type.

### 1.1 Conversion UI

- `ConvertRecordButton` appears only when `targetsFor(type, record).length > 0`.
- Button text is the first enabled target, otherwise “Convert”.
- Dialog lists every allowed destination as a radio option.
- Ineligible targets are disabled and show the reason.
- Confirm is disabled if no enabled target is selected.
- On success the dialog offers “Open destination record”.
- On failure the dialog displays an inline error.
- Detail pages with links render a **Workflow Links** card with incoming (“From”) and outgoing (“To”) links.

**Runtime verification:** the project `PRJ-2026-044` dialog showed **Create Design Plan disabled** with reason **“A design plan is already linked to this project.”** and Confirm disabled. Cancel/close worked.

---

## 2. Complete conversion matrix (16 paths)

| # | Source → Destination | Action label | Eligibility | Generated ID | Status |
|---:|---|---|---|---|---|
| 1 | Customer Enquiry → Quotation | Create Quotation | Status `Ready for Quotation` or `Quotation Prepared`; no linked quotation; no existing link | `nextId('QTN', quotations)` | IMPLEMENTED BUT NOT VERIFIED (new conversion) |
| 2 | Quotation → Project | Convert to Project | Status `Accepted`; no `convertedProjectId`; no link | `ProjectsContext.nextProjectId()` | IMPLEMENTED BUT NOT VERIFIED |
| 3 | Project → Design Plan | Create Design Plan | No existing plan link | `DPL-2026-<max suffix + 1>` | IMPLEMENTED BUT NOT VERIFIED |
| 4 | Design Plan → Design Task | Create Design Task | No existing task link | `TSK-<2100 + tasks.length + 1>` | IMPLEMENTED BUT NOT VERIFIED |
| 5 | Concept → Mechanical Design | Open Mechanical Design | Concept status `Selected`; no design link | `nextDesignId()` | IMPLEMENTED BUT NOT VERIFIED |
| 6 | Mechanical Design → Analysis | Create Engineering Analysis | No existing analysis link | `nextAnalysisId()` | IMPLEMENTED BUT NOT VERIFIED |
| 7 | Mechanical Design → Design Review | Submit Design Package for Review | Design status `Completed` or `Released`; no review link | `nextReviewId()` | IMPLEMENTED BUT NOT VERIFIED |
| 8 | Analysis → Manufacturing Definition | Create Manufacturing Definition | Verification status `Verified`; no manufacturing link | `nextMfgId('definition')` | IMPLEMENTED BUT NOT VERIFIED |
| 9 | Manufacturing Definition → BOM | Create BOM | Status `Approved` or `Released`; no BOM link | `nextBomId()` | IMPLEMENTED BUT NOT VERIFIED |
| 10 | BOM → Drawing Record | Create Drawing Record | BOM `Released`; no drawing link | `nextDrawingId()` | IMPLEMENTED BUT NOT VERIFIED |
| 11 | BOM → Transfer | Create Purchase / Production Transfer | BOM `Released`; no transfer link | `nextTransferId()` | IMPLEMENTED BUT NOT VERIFIED |
| 12 | BOM → Design Review | Submit Design Package for Review | BOM `Approved` or `Released`; no review link | `nextReviewId()` | IMPLEMENTED BUT NOT VERIFIED |
| 13 | Drawing → Transfer | Create Purchase / Production Transfer | Drawing `approvalStatus === 'Released'`; no transfer link | `nextTransferId()` | IMPLEMENTED BUT NOT VERIFIED |
| 14 | Drawing → Design Review | Submit Drawing for Review | Drawing approval `Approved` or `Released`; no review link | `nextReviewId()` | IMPLEMENTED BUT NOT VERIFIED |
| 15 | Design Review → Engineering Change | Raise Engineering Change (ECR) | Review `Approved` or `Released`; no change link; **controlled BOM and drawing must exist for the project** | `nextChangeId()` | IMPLEMENTED BUT NOT VERIFIED |
| 16 | Transfer → Engineering Support | Raise Production Query | Transfer status in `Ready for Transfer`, `Handed Over`, `Awaiting Acknowledgement`, `Acknowledged`, `In Production`; no support link | `nextCaseId('Production Query')` | IMPLEMENTED BUT NOT VERIFIED |

**No conversion exists from:** task, support case, engineering change, delivery, manufacturing readiness, production order, inspection, dispatch, invoice or service record.

---

## 3. Per-conversion field copying and defaults

### 3.1 Enquiry → Quotation

| Direction | Fields |
|---|---|
| Copied | Customer/enquiry identity, category/config, engineering owner, priority, target delivery, technical requirements/specifications |
| Defaults | Status `Draft`, revision from target form, quotation date today |
| Transformed | Source enquiry status changes to `Quotation Prepared`; `quotationRef` set on enquiry |
| Not copied | Source documents binaries, clarifications |
| Link | `enquiry → quotation` |

`createEmptyQuotationForm(source)` builds the new form; `addQuotation` allocates the QTN ID.

### 3.2 Quotation → Project

| Direction | Fields |
|---|---|
| Copied | Customer, product configuration, description, technical specifications, material assumptions, priority, target delivery, linked enquiry ID, quotation reference/revision |
| Defaults | Status `New Request`, domain from category, manager `R. Kulkarni`, analysis engineer `A. Iyer`, manufacturing engineer `K. Pillai`, reviewer from quotation review or `N. Joshi`, start today, target +90 days, progress 0 |
| Transformed | Full project narrative composed from quotation; team members generated |
| Not copied | Attachments, commercial line items, cost values |
| Link | `quotation → project` |

Team: up to three unique members (`Project Manager`, `Technical Reviewer`, `Design Engineer`) with new `TM-*` IDs, 40–50% allocation. Quotation is marked converted with `convertedProjectId`.

### 3.3 Project → Design Plan

| Direction | Fields |
|---|---|
| Copied | Project ID, project name → plan name, manager → owner |
| Defaults | Status `Draft`, start today, due +90 days, notes “Created from project …” |
| Not copied | Project deliverables, milestones, attachments, team |
| Link | `project → plan` |

Plan name is `${source.name} Design Plan`; plan number is maximum existing suffix + 1.

### 3.4 Design Plan → Design Task

| Direction | Fields |
|---|---|
| Copied | Project ID, plan owner → engineer, start/due if present |
| Defaults | Discipline `Machine Design`, priority `Medium`, status `Not Started`, effort 24 h, progress 0, dependencies `[]` |
| Transformed | Task name strips trailing “Design Plan” and adds “Design Task”; first design in the project is linked if available |
| Not copied | Plan notes (only referenced in task notes) |
| Link | `plan → task` |

**ID risk:** `TSK-${2100 + tasks.length + 1}` depends on array length, not maximum ID. Deleting a task can cause an ID collision/reuse.

### 3.5 Concept → Mechanical Design

| Direction | Fields |
|---|---|
| Copied | Project, concept name, description, preliminary specifications/objectives, material selection, technical notes, created-by owner |
| Defaults | Category `Mechanisms`, domain `Machine Design`, reviewer `N. Joshi`, priority `Medium`, status `In Design`, revision `A`, target +60 days |
| Transformed | Concept status set to `In Design` |
| Not copied | Concept advantages/limitations, layout files, comparisons, proposals |
| Link | `concept → design` |

### 3.6 Design → Analysis

| Direction | Fields |
|---|---|
| Copied | Project, name/title, description, engineer, priority, material, drawing revision, load information |
| Defaults | Category `Stress & Strength`, type `Static stress check`, reviewer `N. Joshi`, status `Draft`, revision `A`, target +30 days, load case `LC-<suffix>`, strength criterion `Yield`, acceptance `FoS >= 2.0` |
| Not copied | Part/assembly geometry, attachment binaries, actual results |
| Link | `design → analysis` |

### 3.7 Design / BOM / Drawing → Design Review

| Direction | Fields |
|---|---|
| Copied | Project, linked BOM/drawing IDs and revisions, deliverable name/number, part reference, priority, submitter |
| Defaults | Revision `A`, status `Draft`, current stage `Draft`, engineering reviewer `N. Joshi`, manufacturing reviewer `V. Sharma`, required stages `Engineering` + `Manufacturing`, client not required, due +14 days |
| Checklists | Fresh 7-item design, 6-item technical and 6-item manufacturing checklists, all `Pending` |
| Not copied | Source attachment binaries; only references are recorded |
| Link | `bom/drawing/design → review` |

When source is a BOM with no linked drawing, review type is `Design Package`; when a drawing exists, it is `Engineering Drawing`.

### 3.8 Analysis → Manufacturing Definition

| Direction | Fields |
|---|---|
| Copied | Project, analysis ID, engineer, title/name, part/assembly reference, drawing number/revision, material |
| Defaults | Kind `definition`, revision `A`, status `Draft`, category `Fabrication`, process `Machining`, inspection type `Incoming inspection`, due +30 days |
| Transformed | Part number from linked part, or sanitised source title if no part |
| Not copied | Analysis evidence binaries; only the analysis ID is referenced |
| Link | `analysis → manufacturing` |

### 3.9 Manufacturing Definition → BOM

| Direction | Fields |
|---|---|
| Copied | Project, assembly, engineer, definition name, material, description |
| Defaults | Revision `A`, status `Draft`, one BOM item, qty 1, UOM `nos`, make/buy `Make`, unit cost 0, reviewer `N. Joshi` |
| Not copied | Inspection/process plan details, manufacturing attachments |
| Link | `manufacturing → bom` |

The BOM is intentionally a one-line starter item; it does not synthesise a multi-level BOM.

### 3.10 BOM → Drawing Record

| Direction | Fields |
|---|---|
| Copied | Project, assembly, first BOM item part number/name, engineer/reviewer, BOM reference |
| Defaults | Drawing number `DRW-<source numeric suffix>-A`, title `${BOM name} Assembly Drawing`, type `Assembly Drawing`, format `SVG`, revision `A`, status `Draft` |
| Not copied | Geometry, CAD bytes, BOM item list (only first item identity), BOM cost |
| Link | `bom → drawing` |

**Critical:** this creates a drawing metadata shell. It does **not** create an SVG file, drawing views or geometry. `attachments: []` and `cadFileIds: []`.

### 3.11 BOM / Drawing → Transfer

| Direction | Fields |
|---|---|
| Copied | Source ID, project, deliverable type/number/name, revision, review/release reference, BOM items/material requirements, drawing reference |
| Defaults | `destinations: ['Purchase']`, purchase included, production excluded, status `Draft`, manual status `Draft`, priority `High`, initiator `N. Joshi`, transfer date today |
| Not copied | Manufacturing package content, binaries, client data |
| Link | `bom/drawing → transfer` |

**Defect/limitation:** the label says “Create Purchase / Production Transfer”, but the generated record hard-codes **Purchase only**. Production must be added later through the transfer workflow; this is not explained in the confirmation.

### 3.12 Review → Engineering Change

| Direction | Fields |
|---|---|
| Copied | Project, review ID/reason, affected parts from controlled BOM, affected assembly, BOM/drawing IDs and current revisions |
| Defaults | Proposed BOM/drawing/revision `B`, impact level `Medium`, reviewer/raised-by `N. Joshi`, first release false |
| Gate | `boms.find(projectId && Approved|Released)` and `drawings.find(projectId && not Superseded|Withdrawn)` must both exist |
| Failure | “A controlled BOM and drawing are required before raising an ECR.” |
| Not copied | Review comments/checklists/attachments |
| Link | `review → change` |

The proposed revision is always `B`, even if the controlled record is already Rev B or later. That is a real revision-numbering defect.

### 3.13 Transfer → Support Case

| Direction | Fields |
|---|---|
| Copied | Project, priority, BOM/drawing reference, revision, production/transfer reference, part number |
| Defaults | Case type `Production Query`, status `Assigned`, assigned engineer `N. Joshi`, requested by “Production — Assembly bay”, requested today, due +10 days, initial technical question/clarification |
| Not copied | Transfer attachments/comments |
| Link | `transfer → support` |

---

## 4. Duplicate prevention and failure behaviour

| Control | Implementation | Assessment |
|---|---|---|
| Exact same source/target repeat | `hasTarget()` link check | Prevents repeat in the UI |
| Existing linked quotation | `linkedEnquiryId` or `quotationRef` check | Additional guard |
| Existing quote→project | `convertedProjectId` check | Additional guard |
| Existing source flags | Concept/quote status changes | Secondary guard |
| Button state | Disabled radio + disabled Confirm | Verified on project |
| Server uniqueness | None | **NOT IMPLEMENTED** |
| Atomicity/rollback | None | Multi-step conversion can partially succeed |
| Concurrent tabs | None | Last write wins |
| Link ID uniqueness | `CV-${Date.now()}-${length+1}` | Date-based; possible collision under same-millisecond actions |

Failure paths return `{ error }` and show it in the conversion dialog; context errors such as “This record has already been converted” are surfaced. There is no automatic retry, transaction, or compensating delete.

---

## 5. Outgoing and incoming links

`WorkflowLinks` filters the global persisted link array:

```js
incoming = links.filter(link => link.targetType === type && link.targetId === recordId)
outgoing = links.filter(link => link.sourceType === type && link.sourceId === recordId)
```

The card is hidden when both lists are empty. It renders:
- direction (`From`/`To`),
- linked record ID,
- type label,
- conversion label and timestamp.

Observed persisted state contains **21 links** spanning enquiry, quotation, project, plan, concept, design, analysis, manufacturing, BOM, review and transfer. This proves conversions have been executed in this browser profile previously, but it does not prove every one of the 16 paths was exercised.

---

## 6. Test results

| Test | Result |
|---|---|
| Load conversion eligibility for `PRJ-2026-044` | Pass — plan target disabled, reason displayed |
| Confirm disabled when no eligible target | Pass |
| Cancel/close dialog | Pass |
| Link card rendering on records with links | Pass (observed on detail records) |
| Duplicate prevention source code | Pass by inspection |
| Execute a new conversion end-to-end | **Not tested** — avoided creating unnecessary records |
| Failure rollback | **Not verified** — no rollback exists in code |
| Concurrent-tab consistency | **Not tested** — no locking exists |

**Overall status:** conversion engine is **IMPLEMENTED BUT NOT VERIFIED** for new writes; link display and disabled/duplicate gates are **IMPLEMENTED AND VERIFIED**.

---

## 7. Defects and gaps

| # | Defect | Evidence | Impact |
|---:|---|---|---|
| W1 | “Purchase / Production Transfer” creates Purchase only | `destinations: ['Purchase']` in conversion | Misleading label; production handover absent |
| W2 | ECR proposed revision always `B` | `proposedBomRevision: 'B'`, `proposedDrawingRevision: 'B'` | Invalid change against Rev B+ baselines |
| W3 | Task IDs depend on array length | `TSK-${2100 + tasks.length + 1}` | ID reuse after deletion |
| W4 | Plan/task IDs are local sequences | `DPL` max suffix; task length | Duplicate risk across browsers / deleted tasks |
| W5 | No transaction/rollback | Multi-step provider calls | Partial conversions possible |
| W6 | Link store can diverge from record store | Separate localStorage keys | Orphan links/targets after deletion |
| W7 | No server-side uniqueness | localStorage only | Two users can create same IDs |
| W8 | No conversion audit beyond local links | Link array only | No immutable audit trail |
| W9 | BOM→drawing produces metadata shell | `attachments: []`, `cadFileIds: []` | Looks like a drawing but has no drawing file |
