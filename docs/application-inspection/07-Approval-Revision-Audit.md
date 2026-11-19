# 07 — Approval and Revision Audit

**Inspection date:** 17 November 2026  
**Primary sources:** `src/context/ApprovalsContext.jsx`, `src/data/approvalsData.js`, `src/context/BomContext.jsx`, `src/context/CadContext.jsx`, `src/context/EngineeringReleaseContext.jsx`  
**Live records:** 15 design reviews; 11 BOMs; 13 drawings; 10 engineering changes; 2 engineering releases

---

## 1. Approval workflow

### 1.1 Stages

| Stage key | Label | Required? | Reviewer default |
|---|---|---|---|
| `engineering` | Engineering Review | **Always required** | N. Joshi |
| `manufacturing` | Manufacturing Review | Required when selected in `requiredStages` | V. Sharma |
| `client` | Client Approval | Conditional, controlled by “Client Approval Required” | Client — e.g. P. Nair |

### 1.2 Implemented state transitions

```text
Draft
  └─ submitReview ──> Under Engineering Review
        ├─ Approve ──> Under Manufacturing Review (if required)
        │                 ├─ Approve ──> Pending Client Submission (if client required)
        │                 │                 └─ submit to client ──> Submitted to Client
        │                 │                       └─ startClientReview ──> Under Client Review
        │                 │                             └─ Approve ──> Approved
        │                 └─ Reject / Request Changes ──> Rejected / Changes Requested
        └─ Reject / Request Changes ──> Rejected / Changes Requested
```

- Engineering approval automatically moves the workflow to Manufacturing when that stage is required; otherwise it moves to client submission or final approval.
- Manufacturing cannot approve unless Engineering is `Approved`.
- Client approval cannot be recorded unless all internal required stages are `Approved`.
- Rejection and “Request Changes” require a non-empty comment.
- Client rejection and changes also require a comment.
- Client submission is only allowed from the internal-ready state; client review start is a separate simulated action.
- No editing of a review is allowed once it leaves Draft through the edit route; source redirects locked records away from the form.

**Status:** state machine **IMPLEMENTED BUT NOT VERIFIED** for successful decisions; validation and state guards were verified by source inspection but no approval records were mutated during this inspection.

---

## 2. Engineering checklist (7 items)

Source: `makeDesignChecklist()` in `src/data/approvalsData.js`.

| ID | Item | Requirement |
|---|---|---|
| DC-1 | Design requirements reviewed | Approved requirement baseline and design brief checked |
| DC-2 | Dimensions and specifications checked | Drawing dimensions, units and specifications verified |
| DC-3 | Part and assembly references verified | Part numbers and parent assembly references match |
| DC-4 | Drawing consistency checked | Views, sections, notes and title block are consistent |
| DC-5 | Revision information verified | Revision, date and change note match submission |
| DC-6 | Supporting documentation reviewed | Calculations, analysis evidence and specifications reviewed |
| DC-7 | Design constraints reviewed | Interfaces, envelope, material and standard constraints reviewed |

Each item has `result` (default Pending), `comments`, `evidence`, reviewer and ID.

## 3. Technical checklist (6 items)

| ID | Item |
|---|---|
| TC-1 | Requirements satisfied |
| TC-2 | Calculation evidence available |
| TC-3 | Material specifications verified |
| TC-4 | Analysis evidence reviewed |
| TC-5 | Acceptance criteria checked |
| TC-6 | Outstanding technical issues documented |

## 4. Manufacturing checklist (6 items)

| ID | Item |
|---|---|
| MC-1 | Manufacturability confirmed |
| MC-2 | Tolerances and fits verified |
| MC-3 | Process suitability verified |
| MC-4 | Inspection requirements defined |
| MC-5 | Manufacturing constraints documented |
| MC-6 | Unresolved issues documented |

Checklist results, comments and evidence are editable through `updateChecklistResult`. There is no independent reviewer identity check.

---

## 5. Approval history

Every transition appends to `review.history`:

```js
{
  id: "EV-REV-2026-015-...",
  at: "2026-11-16T10:00:00.001",
  stage: "Engineering Review",
  action: "Approve",
  previousStatus: "Under Engineering Review",
  newStatus: "Under Manufacturing Review",
  by: "N. Joshi",
  role: "Engineering Reviewer",
  comments: "..."
}
```

Additional arrays:
- `approvals[]` — one entry per engineering/manufacturing/client decision;
- `comments[]` — review comments with stage, checklist item, attachment reference and response status;
- `clientHistory[]` — client submission/decision per revision;
- `clientComments[]` — client-specific comments and response status;
- `resubmissions[]` — previous revision, new revision, previous decision, linked replacement review.

**Status:** history display **IMPLEMENTED AND VERIFIED** (Release History / decision history tabs rendered); mutation **IMPLEMENTED BUT NOT VERIFIED**.

---

## 6. Resubmission and revision creation

`resubmitReview(id, { revision, by, notes })`:

- Allowed only for `Changes Requested` or `Rejected`.
- New revision is supplied or generated by `nextRevision`.
- The new revision must differ from the current revision.
- A **new review record** is created, preserving the old one.
- New review fields:
  - `previousReviewId`, `originalReviewId`;
  - status `Under Engineering Review`;
  - all checklists reset to Pending, comments/evidence cleared;
  - engineering Under Review; manufacturing Pending or Not Required; client Not Submitted or Not Required;
  - approvals/comments/client history cleared;
  - new due date +14 days.
- Old review gets a `resubmissions[]` entry pointing to the replacement.
- Prior decisions remain on the old review, providing an audit trail.

**Status:** IMPLEMENTED BUT NOT VERIFIED (not exercised).

---

## 7. Controlled release gate (Design Review)

`isReleaseEligible(review, boms, drawings)` requires all of:

1. `review.status === 'Approved'`;
2. no existing `review.release`;
3. every required stage approved or Not Required;
4. linked BOM exists and `bom.revision === review.bomRevision`;
5. BOM status is `Approved` or `Released`;
6. linked drawing exists and `drawing.revision === review.drawingRevision`;
7. drawing approval status is `Approved` or `Released`.

Failure reasons are specific, for example:
- “A BOM revision is not linked to this review.”
- “The BOM is now Rev B; the reviewed Rev A is no longer current.”
- “Drawing … is Draft; it must be approved or released.”
- “Only a fully approved revision with all required stages complete can be released.”

On success:

- Creates `REL-REV-2026-###`.
- Snapshots approved BOM/drawing revisions.
- Records final approver and approval date.
- Calls `releaseBom()` if the BOM is Approved.
- Calls `releaseDrawing()` if the drawing is Approved.
- Sets review status Released and appends a Release history event.
- **Does not create a Purchase/Production transfer** and **does not call** the Transfers module.

**Status:** gate logic IMPLEMENTED; release execution **IMPLEMENTED BUT NOT VERIFIED** (not executed to avoid mutating controlled seeds).

### 7.1 Release History runtime

- `/design-review/releases` rendered all five internal sections: Approved Releases, Rejected Reviews, Decision History, Revision History and Eligible Reviews.
- At inspection time no review was safely eligible for creating a new controlled release from the available data; the action was not forced.
- The page correctly states that the release is a **local controlled release record only**, not a Purchase or Production transfer.

---

## 8. BOM approval and revision rules

### 8.1 BOM review

- Submittable from editable statuses or `Withdrawn`.
- Submit sets `Under Review`; it snapshots current items into the revision entry.
- `recordBomDecision` only while Under Review.
- `Approved` → status Approved, approval appended.
- `Reject` → `Withdrawn`.
- `Request Changes` → `Changes Requested`, revision status remains Under Review until resubmitted.
- Comments required for non-approval.

### 8.2 BOM release

- Only `Approved` can release.
- Release clones the approved item set.
- Current revision status becomes `Released`; all other revision entries become `Superseded`.
- `releaseRef` generated if absent.
- Release is a simulated handover; it does not create the Transfer module record.

**Status:** IMPLEMENTED BUT NOT VERIFIED.

### 8.3 BOM revisions

- New revision allowed from Approved, Released or Superseded.
- Next revision uses `A→B→C→D→E→F→A1`.
- Previous revision entry becomes `Superseded` and its item snapshot is preserved.
- New revision starts Draft with a cloned item set and no approvals/release reference.
- BOM is locked against item edits once Approved/Released/Superseded.
- Revision comparison verified:
  - BOM-2026-001 base Rev B → target Rev C;
  - result “+1 added, −0 removed, 0 modified”;
  - added `PUR-041-011 Gear motor 45 kW … Buy`.

## 9. Drawing approval and revisions

- Submit only from Draft or Changes Requested.
- Review decision only for Submitted/Under Review.
- Approve → Approved; Request Changes → Changes Requested; Reject → Withdrawn.
- Release requires Approved.
- Revision creation allowed from Approved/Released/Superseded.
- Prior revision becomes `Superseded`; new revision Draft with copied metadata.
- Revision history and exact revisions are retained.
- Comparison is **metadata-only**; explicit “No geometry or pixel comparison.”
- Runtime: `DRG-MEC-041-001` Rev B → Rev C produced **3 metadata changes**.

## 10. Mechanical design revisions

- Design, part, assembly and calculation forms expose a revision select.
- On edit, if the revision field changes, the form appends a revision history entry.
- Initial records receive an “Initial … record created” entry.
- Calculation verification status can move to `Superseded`.
- There is **no dedicated revision comparison** view for mechanical designs, parts, assemblies or calculations.
- There is no enforced revision-number sequence on the edit form; the user can select a value.

**Status:** revision fields/history IMPLEMENTED BUT NOT VERIFIED; comparison NOT IMPLEMENTED.

---

## 11. Engineering Change (ECR / ECO)

### 11.1 Implemented workflow

```text
ECR Submitted
  └─ save impact ──> Impact Assessment
        └─ submit ECO ──> Pending ECO Approval
              ├─ Approve ──> ECO Approved
              │      └─ apply revision update ──> Revision Updated
              │             └─ releaseChange ──> Released
              └─ Reject ──> Rejected
```

Rules:

- `saveImpact` only before ECO submission; requires impact text, affected parts, proposed BOM revision, proposed drawing revision.
- `submitForEco` requires completed impact.
- `approveEco` only from Pending ECO Approval.
- `rejectEco` requires a reason.
- `applyRevisionUpdate` requires approved ECO, not already released; proposed revision must differ unless first release; requires proposed BOM/drawing revisions.
- `releaseChange` requires release eligibility and at least one destination plus a manufacturing package reference.
- Released changes are locked.
- Only Draft changes can be deleted, but normal ECR creation starts at `ECR Submitted`, so the delete path is effectively unusable for newly created ECRs.

### 11.2 Engineering release eligibility

`releaseEligibility(change, boms, drawings, releases)` checks:

- no existing release for the change;
- `approvalStatus === 'Approved'`;
- `revisionUpdated === true`;
- proposed BOM, drawing and change revisions present;
- affected BOM and drawing exist and are Approved/Released;
- first release uses current approved baseline revisions;
- revision change baseline matches current BOM/drawing revision;
- proposed revision differs from current.

On release:

- Creates release ID and snapshots source BOM/drawing revisions.
- Records Purchase/Production handover placeholders.
- Preserves source records unchanged.
- Does not itself hand over to the separate Transfers module.
- Local only.

**Status:** ECR/ECO logic IMPLEMENTED BUT NOT VERIFIED; no change was advanced.

### 11.3 ECR numbering defect

Workflow-conversion-created ECRs always propose revision **B**, regardless of the controlled baseline (`proposedBomRevision: 'B'`, `proposedDrawingRevision: 'B'`). A change against an already Rev B/C controlled record can therefore fail or propose an invalid revision.

---

## 12. Revision comparison inventory

| Area | Comparison exists? | Scope | Runtime evidence |
|---|---|---|---|
| BOM revisions | Yes | BOM item add/remove/modify | Rev B→C: 1 added, 0 removed, 0 modified |
| CAD drawings | Yes | Metadata fields only | Rev B→C: 3 metadata changes; no geometry |
| Design review revisions | History only | Stage decisions and resubmissions | Not executed |
| Engineering changes | History only | Impact/revision/release events | Not executed |
| Mechanical designs | **No compare view** | Revision history entries only | — |
| Analyses | Revisions field only | No compare view | — |
| Manufacturing records | Revision field only | No compare view | — |

## 13. Previous-revision preservation

| Record type | Preservation method |
|---|---|
| Review | Old review retained; resubmission creates a new review ID |
| BOM | `revisions[]` entries with item snapshots; prior status Superseded |
| Drawing | `revisions[]` entries with metadata snapshots; prior status Superseded |
| Mechanical | `revisions[]` entries appended when revision changes |
| Analysis | `revisions[]` array on record |
| Engineering change | History events and snapshot in engineering release |

There is no immutable document vault. Revisions are arrays inside the same mutable localStorage object.

---

## 14. Approval/revision defects and risks

| # | Defect | Evidence | Severity |
|---:|---|---|---|
| A1 | Client approval is explicitly simulated | UI toasts “Client review started (local simulation)” and “recorded locally (simulation)” | High |
| A2 | No identity/role enforcement | Hard-coded `REVIEWER_PERSONA`; any browser user can decide | High |
| A3 | Approval history is mutable local data | Stored inside review object in localStorage | High |
| A4 | Release does not create a downstream transfer | Explicit UI statement; separate Transfer module | Medium |
| A5 | ECR proposals always revision B | `WorkflowConversionContext` | High |
| A6 | No mechanical/analysis revision comparison | No compare UI | Medium |
| A7 | Drawing comparison ignores geometry | Explicit UI note | Medium |
| A8 | Checklist items can be edited without decision controls | `updateChecklistResult` has no stage guard | Medium |
| A9 | Released/approved record edit routes silently redirect | Source guards; no explanation modal observed | Medium |
| A10 | Archived records cannot be restored | No unarchive action in projects/mechanical | Medium |
| A11 | Engineering Release and Design Review maintain separate release records | Different contexts/ids | Medium |
| A12 | Release role is not evidenced | Release uses Design Authority label, not a verified user | High |

---

## 15. Evidence index

| Evidence | File |
|---|---|
| Review stage state machine | `src/context/ApprovalsContext.jsx` |
| Checklists and release gate | `src/data/approvalsData.js` |
| Review tabs and dialogs | `src/pages/approvals/*.jsx` |
| BOM decisions/revisions/release | `src/context/BomContext.jsx` |
| Drawing decisions/revisions/release | `src/context/CadContext.jsx` |
| ECR/ECO and release rules | `src/context/EngineeringReleaseContext.jsx`, `src/data/engineeringReleaseData.js` |
| Workflow ECR conversion | `src/context/WorkflowConversionContext.jsx` |
