# 03 — Forms, Fields, Buttons and Actions Audit

**Inspection date:** 17 November 2026  
**Method:** Source inspection of each form page plus live field extraction at 1440×900. Every label below was read from the rendered form DOM, not from earlier documentation.

Status rule used in this report:

- **IMPLEMENTED AND VERIFIED** — rendered and the stated behaviour was executed and observed.
- **IMPLEMENTED BUT NOT VERIFIED** — form/control renders and source contains the handler, but the successful write was not executed during this inspection.
- **BROKEN** — observed failure or incorrect result.
- **NOT IMPLEMENTED** — no control or handler exists.

---

## 1. Form inventory

| # | Form | Route | Sections / groups | Captured fields | Status |
|---:|---|---|---|---:|---|
| 1 | New / Edit Customer Enquiry | `/customer-enquiries/new`, `/:id/edit` | Customer, dates, technical requirement, commercial, notes | 25 | IMPLEMENTED BUT NOT VERIFIED (validation verified) |
| 2 | New / Edit Quotation | `/quotation-review/new`, `/:id/edit` | Enquiry source, commercial, technical basis, feasibility, cost, review | 21 | IMPLEMENTED BUT NOT VERIFIED (validation verified) |
| 3 | Create Project | `/projects/new-project` | Project, CPR, engineering, team, deliverables, attachments | 51 labels (9 static/table/file labels) | IMPLEMENTED BUT NOT VERIFIED (validation verified) |
| 4 | Create / Edit Design Plan | `/design-planning/design-plans/new` | Plan details | 7 | **IMPLEMENTED AND VERIFIED** (creation tested) |
| 5 | Create / Edit Design Task | `/design-planning/design-tasks/new` | Task, schedule, effort, notes | 12 | IMPLEMENTED BUT NOT VERIFIED |
| 6 | Create / Edit Concept | `/conceptual-design/concept-creation` | Project, requirements, objectives, specs, materials, notes, files | 15 | IMPLEMENTED BUT NOT VERIFIED |
| 7 | New / Edit Design Item | `/mechanical-design/design-register/new` | Design basis, ownership, dates, description, technical, links, attachments | 30 | IMPLEMENTED BUT NOT VERIFIED |
| 8 | New / Edit Part | `/mechanical-design/parts-assemblies/parts/new` | Identification, dimensions, material, ownership, notes | 23 | IMPLEMENTED BUT NOT VERIFIED |
| 9 | New / Edit Assembly | `/mechanical-design/parts-assemblies/assemblies/new` | Identification, parent, owner, description | 10 | IMPLEMENTED BUT NOT VERIFIED |
| 10 | New / Edit Calculation | `/mechanical-design/design-calculations/new` | Basis, reference, method, results, verification, files | 17 | IMPLEMENTED BUT NOT VERIFIED |
| 11 | New / Edit Analysis | `/engineering-analysis/register/new` | Scope, component, load case, technical evidence, ownership | 29 | IMPLEMENTED BUT NOT VERIFIED |
| 12 | New / Edit Validation Report | `/engineering-analysis/reports/new` | Report, linked analyses, summary, files, sign-off | 12 | IMPLEMENTED BUT NOT VERIFIED |
| 13 | New Manufacturing Definition | `/manufacturing-design/definition/new` | Record, responsibility, part, category, machining, process, files | 22 | IMPLEMENTED BUT NOT VERIFIED |
| 14 | New Inspection Plan | `/manufacturing-design/inspection/new` | Record, part, definition link, measurement, limits, acceptance | 22 | IMPLEMENTED BUT NOT VERIFIED |
| 15 | New Process Plan | `/manufacturing-design/process/new` | Record, links, process, safety, handling, technical, package | 25 | IMPLEMENTED BUT NOT VERIFIED |
| 16 | Create Engineering BOM | `/bom-cost/bom/new` | Header, ownership, dates, items, attachment | 9 plus item editor | IMPLEMENTED BUT NOT VERIFIED |
| 17 | New Cost Estimate | `/bom-cost/estimate/new` | Source, ownership, cost components, notes | 13 | IMPLEMENTED BUT NOT VERIFIED |
| 18 | New Material Requirement | `/bom-cost/material/new` | Source, material, quantity, rate, notes | 7 | IMPLEMENTED BUT NOT VERIFIED |
| 19 | New Quantity Calculation | `/bom-cost/quantity/new` | Source, component, quantities, allowance, owner | 11 | IMPLEMENTED BUT NOT VERIFIED |
| 20 | Register CAD File | `/cad-management/files/new` | Metadata, upload, classification | 10 plus file input | IMPLEMENTED BUT NOT VERIFIED |
| 21 | Create / Edit Drawing | `/cad-management/drawings/new` | Drawing, classification, ownership, links, attachment | 17 plus file input | IMPLEMENTED BUT NOT VERIFIED |
| 22 | New / Edit Design Review | `/design-review/new` | Deliverable, revisions, reviewers, stages, instructions, files | 24 | IMPLEMENTED BUT NOT VERIFIED |
| 23 | New Transfer | `/transfers/new` | Header, deliverable, destinations, files, notes | 13 | IMPLEMENTED BUT NOT VERIFIED |
| 24 | New / Edit Engineering Case | `/manufacturing-support/new` | Project, references, production observation, query, files, comment | 24 | IMPLEMENTED BUT NOT VERIFIED |

---

## 2. Complete field inventory

Format: **Field label** `(control)`. All controls listed are part of the rendered form. “Dynamic” means the options are derived from project/module records rather than a fixed list.

### 2.1 Customer Enquiry (25)

Product / machine category `(select, fixed categories)`, Requirement subject `(text)`, Customer name `(text)`, Enquiry priority `(select: Low/Medium/High/Critical)`, Assigned sales contact `(select)`, Assigned engineering contact `(select)`, Contact name `(text)`, Contact email `(email)`, Contact phone `(tel)`, Enquiry date `(date)`, Expected response date `(date)`, Target delivery date `(date)`, Expected quantity `(number)`, Unit `(select)`, Customer requirement description `(textarea)`, Application / duty `(text)`, Capacity / rating `(text)`, Dimensions / envelope `(textarea)`, Operating conditions `(textarea)`, Materials / finish `(text)`, Standards / codes `(text)`, Utilities / services `(text)`, Inspection / testing `(text)`, Packaging / transport `(text)`, Engineering notes `(textarea)`.

**Required by source:** subject, customer, contact name, contact email (format), enquiry date, expected response date, target delivery date, quantity > 0, application/duty, dimensions/envelope, operating conditions. **Automatic:** enquiry ID and status are allocated on save; sales/engineering contacts default to seed users; dates default to seed/today values where the editing record is absent.

### 2.2 Quotation (21)

Customer Enquiry ID `(select, dynamic)`, Quotation Revision `(select)`, Quotation Date `(date)`, Priority `(select)`, Sales Contact `(select)`, Engineering Owner `(select)`, Product / Machine Configuration `(textarea)`, Preliminary Technical Specifications `(textarea)`, Design Feasibility `(select)`, Manufacturing Feasibility `(select)`, Design Feasibility Notes `(textarea)`, Manufacturing Feasibility Notes `(textarea)`, Material Assumptions `(textarea)`, Preliminary BOM Reference `(text)`, Technical Comments `(textarea)`, Estimated Engineering Effort (hours) `(number)`, Target Delivery Estimate `(date)`, Preliminary Material Cost (INR) `(number)`, Preliminary Manufacturing Cost (INR) `(number)`, Review Assignment `(select)`, Review Assigned On `(date)`.

**Required:** enquiry, technical configuration/specification, priority/date per source. Empty technical review submission reported 3 invalid fields and the banner “Complete the technical basis before starting technical review.” Enquiry selection auto-populates customer, category and requirement fields via `createQuotationFromEnquiry`/context.

### 2.3 Create Project (51 rendered labels)

Project Name `(text)`, Project Reference `(text)`, Customer `(text)`, Product / Machine Name `(text)`, Enquiry ID `(text)`, Accepted Quotation ID `(text)`, Project Status `(select)`, Project Description `(textarea)`, CPR Reference `(text)`, CPR Status `(select)`, CPR Owner `(select)`, CPR Review Date `(date)`, CPR Details / Notes `(textarea)`, Engineering Domain `(select)`, Project Type `(select)`, Priority `(select)`, Project Scope `(textarea)`, Technical Requirements `(textarea)`, Engineering Constraints `(textarea)`, Expected Deliverables `(textarea)`, Planned Start Date `(date)`, Target Completion Date `(date)`, Project Manager `(select)`, Technical Reviewer `(select)`, Analysis Engineer `(select)`, Manufacturing Engineer `(select)`.

Team rows expose eight name inputs: R. Kulkarni, A. Iyer, S. Menon, P. Deshmukh, D. Rao, N. Joshi, V. Sharma, K. Pillai.

Deliverable rows: Concept Design, 2D Drawings, 3D CAD Models, Engineering Calculations, Analysis Reports, Manufacturing Drawings, Engineering BOM, Cost Estimation, Technical Documentation. Six “Choose Files” inputs exist across team/deliverable/attachment groups.

**Required:** project name and at least one other mandatory project field; empty submit produced 2 invalid fields and the message “Complete the required project fields before saving.” ID generation is delegated to `ProjectsContext.nextProjectId()`.

### 2.4 Design Plan (7)

Project ID `(select, dynamic)`, Plan Name `(text)`, Plan Owner `(select)`, Status `(select)`, Start Date `(date)`, Due Date `(date)`, Plan Notes `(textarea)`.

**Verified:** empty defaults were accepted and created `DPL-2026-012`; the test plan was then deleted through the UI and the plan count returned from 12 to 11. This is a validation gap, not a success story: project selection and plan name have no effective mandatory guard on this path.

### 2.5 Design Task (12)

Project ID `(select)`, Linked Design Record `(select)`, Task Name `(text)`, Task Category `(select)`, Assigned Engineer `(select)`, Priority `(select)`, Status `(select)`, Start Date `(date)`, Due Date `(date)`, Estimated Effort (hours) `(number)`, linked task-reference input (seed value `TSK-2139 · Industrial Hydraulic Power Unit – Development Design Task`), Notes `(textarea)`.

### 2.6 Concept (15)

Project Reference `(select)`, Concept Name `(text)`, Product / Machine Category `(text)`, Design Approach `(select)`, Created By `(select)`, Status `(select)`, Customer Requirements `(textarea)`, Design Objectives `(textarea)`, Preliminary Specifications `(textarea)`, Preliminary Material Selection `(textarea)`, Description `(textarea)`, Advantages `(textarea)`, Limitations `(textarea)`, Technical Feasibility Notes `(textarea)`, Choose files `(file)`.

**Validation:** project and creator are required; save failure banner “Complete the required concept fields before saving.”

### 2.7 Design Item (30)

Project `(select)`, Selected Concept `(select)`, Engineering Domain `(select)`, Design Category `(select)`, Design Name `(text)`, Priority `(select)`, Design Status `(select)`, Revision `(select)`, Design Owner `(select)`, Assigned Engineer `(select)`, Technical Reviewer `(select)`, Created Date `(date)`, Target Date `(date)`, Description `(textarea)`, Design Scope `(textarea)`, Technical Notes `(textarea)`.

Conditional component fields: Component Type, Shaft Diameter (mm), Shaft Length (mm), Gear Ratio, Bearing Type, Load Information, Rotational Speed (rpm), Material, Design Notes.

Links: Linked Part IDs `(multi-select)`, Linked Assembly IDs `(multi-select)`, CAD Reference (reference only) `(text)`, Choose files `(file)`.

### 2.8 Part (23)

Part Number, Part Name, Project `(select)`, Engineering Domain `(select)`, Part Category `(select)`, Parent Assembly `(select)`, Material `(select)`, Material Grade, Dimensions, Length (mm), Width (mm), Height (mm), Diameter (mm), Thickness (mm), Weight (kg), Unit of Measurement `(select)`, Quantity, Design Owner `(select)`, Design Status `(select)`, Revision `(select)`, Technical Notes `(textarea)`, CAD Reference `(text)`, Choose files `(file)`.

### 2.9 Assembly (10)

Assembly Number, Assembly Name, Project `(select)`, Engineering Domain `(select)`, Parent Assembly `(select)`, Owner `(select)`, Status `(select)`, Revision `(select)`, Assembly Description `(textarea)`, Technical Notes `(textarea)`.

### 2.10 Calculation (17)

Project `(select)`, Engineering Domain `(select)`, Calculation Type `(select)`, Calculation Title, Calculation Description `(textarea)`, Reference Type `(select)`, Linked Record `(select)`, Assumptions `(textarea)`, Formula / Method Reference `(textarea)`, Result Units, Engineer Notes `(textarea)`, Prepared By `(select)`, Verified By `(select)`, Calculation Date `(date)`, Revision `(select)`, Verification Status `(select)`, Choose files `(file)`.

### 2.11 Analysis (29)

Priority `(select)`, Analysis Title, Analysis Description `(textarea)`, Created Date `(date)`, Target Date `(date)`, Revision `(select)`, Project `(select)`, Component Reference Type `(select)`, Part `(select, dynamic by project)`, Drawing Revision `(select)`, Analysis Category `(select)`, Analysis Type `(select)`, Load Case ID, Load Type `(select)`, Applied Load, Stress Value (recorded evidence), Allowable Stress Reference, Factor of Safety Reference, Strength Criteria `(select)`, Calculation Report Reference, Input Conditions `(textarea)`, Material, Assumptions `(textarea)`, Boundary Conditions `(textarea)`, Acceptance Criteria `(textarea)`, Result Summary `(textarea)`, Technical Notes `(textarea)`, Choose evidence files `(file)`, Assigned Engineer `(select)`, Technical Reviewer `(select)`.

**Dependencies:** part options depend on selected project and component reference type; drawing revision depends on part. **Validation:** target date cannot precede created date; part/assembly, drawing revision, engineer and reviewer are required. Save banner: “Complete the required analysis fields before saving.”

### 2.12 Validation Report (12)

Report Date `(date)`, Report Title, Product / Machine, Report Revision `(select)`, Report Description `(textarea)`, Project `(select)`, analysis selector `(checkbox list; verified only option)`, Validation Summary `(textarea)`, Open Issues `(textarea)`, Recommendations `(textarea)`, Choose report files `(file)`, Prepared By `(select)`, Technical Reviewer `(select)`.

**Required:** title, project, preparer, reviewer, at least one selected analysis. Error “Select at least one existing analysis record.”

### 2.13 Manufacturing Definition (22)

Record Date, Record Name, Description, Record Revision, Due Date, Project, Responsible Engineer, Part Number, Assembly, Material / Stock, Verified Analysis Reference, Linked Inspection Plan, Technical Reviewer, Category, Machined Features, Dimensions, Machining Notes, Process Information, Surface Finish, Part References, file input (“stored as local metadata only”).

### 2.14 Inspection Plan (22)

Record Date, Record Name, Description, Record Revision, Due Date, Project, Responsible Engineer, Part Number, Assembly, Material / Stock, Manufacturing Definition, Technical Reviewer, Inspection Type, Measurement Method, Measuring Equipment, Measurement Unit, Measurement Instructions, Minimum Limit, Maximum Limit, Reference Standard, Acceptance Description, file input.

### 2.15 Process Plan (25)

Record Date, Record Name, Description, Record Revision, Due Date, Project, Responsible Engineer, Part Number, Assembly, Material / Stock, Manufacturing Definition, Inspection Plan, Technical Reviewer, Process Type, Safety Instructions, Special Manufacturing Notes, Handling Requirements, Technical Restrictions, Technical Description, Engineering Reference, Drawing Reference, Additional Notes, Package ID, Inspection Plan Reference, file input.

### 2.16 Engineering BOM (9 + item editor)

BOM Date, BOM Name, Description, Project, Product / Assembly, Responsible Engineer, Assigned Reviewer, Target Release Date, Add Attachment.

The page also renders a BOM line editor (part number, name, description, quantity, UOM, material, part revision, make/buy, unit cost, assembly). **Required:** name, project, assembly. Edit mode exposes only Draft/In Progress/Changes Requested statuses.

### 2.17 Cost Estimate (13)

Estimate Date, Project, BOM Number, Product / Assembly (static derived), Prepared By, Currency, Estimate Status, Material Cost, Purchased Component Cost, Labour Cost, Process Cost, Other Estimated Charges, Estimate Notes.

**Dependencies:** BOM options depend on project; selecting a BOM auto-populates product and cost figures. **Required:** project, BOM, product.

### 2.18 Material Requirement (7)

Project, BOM Number, Material Code, Linked Part Number, Required Quantity, Estimated Unit Rate, Notes. **Validation:** project, editable BOM, material, quantity > 0; locked BOM error “This BOM is locked. Select an editable BOM or create a new revision first.”

### 2.19 Quantity Calculation (11)

Project, BOM Number, Part Number, Component, Base Quantity, Required Quantity, Unit, Allowance / Wastage (%), Final Quantity, Responsible Engineer, Engineer Notes.

**Dependencies:** required quantity and allowance auto-calculate final quantity with two decimals. **Validation:** project, editable BOM, component, part number, base > 0, required > 0.

### 2.20 Register CAD File (10 + upload)

File Name, File Category, Project, Part Number, Part Name, Parent Assembly, Revision, Uploaded By, Description, Remarks, plus local file chooser.

**Restrictions:** maximum **25 MB**; accepted list in §4 of report 05. A draft can be saved with a filename only, but registering requires a selected local file. File bytes are held in browser memory until refresh.

### 2.21 Drawing Record (17 + attachment)

Drawing Number, Drawing Title, Drawing Type, Drawing Format, Revision, Drawing Date, Prepared By, Reviewed By, Drawing Description, Project, Part Number, Part Name, Assembly, BOM Reference, Manufacturing Design Reference, Related CAD Files, Select Attachment.

**Validation:** drawing number required and unique, title, project, part number, part name. Attachment extensions restricted to the previewable drawing set; error names the rejected extension.

### 2.22 Design Review (24)

Review ID, Project, Deliverable Type, Deliverable Number, Deliverable Name, Revision, Part / Assembly Reference, BOM Revision, Drawing Revision, Review Priority, Submitted By, Submission Date, Review Date, Review Due Date, Assigned Engineering Reviewer, Assigned Manufacturing Reviewer, Client Approval Required.

Stage explanatory rows: Engineering Review (required), Manufacturing Review, Client Approval (conditional). Review Instructions `(textarea)`, Attach submission files `(file, metadata only)`.

**Validation:** project, deliverable type/number, revision, BOM revision, drawing revision, submitted by, review date, review due date, engineering reviewer. “Fix the highlighted fields before continuing.” Save as draft or submit.

### 2.23 New Transfer (13)

Transfer Date, Transfer Priority, Transfer Initiated By, Transfer Notes, Deliverable Type, Deliverable Number, Additional attachment references `(textarea)`, Supporting files `(file, metadata only)`, destination cards Purchase and Production, Technical Notes.

**Dependencies:** deliverable number options derive from released BOM/drawing sources. Destination selection drives validation rows. **Required before validation:** source, at least one destination, date/priority/initiator. Save Draft is allowed before validation; Create Transfer is blocked by mandatory validation failures.

### 2.24 Engineering Case (24)

Project, Title, Priority, Work Order Reference, Part Number, Product / Assembly, Related Drawing Number, Drawing Revision, Related BOM Number, BOM Revision, Requested By, Assigned Engineer, Requested Date, Due Date, Description, Production Observation, Technical Question, Query Category, Required Clarification, Production Reference, Record local file metadata `(file)`, Reference-only attachment `(file)`, Initial comment.

**Validation:** save produces “Complete the required fields before saving.” Edit/save path supports draft and non-draft saves.

---

## 3. Create/Edit modal forms

| Modal | Fields / behaviour | Status |
|---|---|---|
| Delete Design Plan confirmation | Confirmation text, Cancel, Delete | **IMPLEMENTED AND VERIFIED** (test plan deleted, count restored) |
| Project → Design Plan conversion | Target radio; disabled reason “A design plan is already linked to this project.”; Confirm disabled | **IMPLEMENTED AND VERIFIED** (disabled path) |
| New Engineering Change Request | Project*, Change Title*, Change Reason*, Affected Parts/Assemblies*, Affected BOM*, Affected Drawing*, Current/Proposed BOM Revision, Current/Proposed Drawing Revision, Current/Proposed Revision, Impact Level, Change Impact*, First-time release checkbox; Cancel / Create ECR | IMPLEMENTED BUT NOT VERIFIED (rendered, Cancel tested) |
| New Manufacturing Readiness Record | Project*, BOM Reference*, Manufacturing Package Reference, Package Revision, Package Status, Engineering Notes; Cancel / Create | IMPLEMENTED BUT NOT VERIFIED |
| New Purchase Handover Tracking | Ready Engineering Package*, Material Specification Package*, Handover Date, Purchase Progress Reference, Handover Notes | IMPLEMENTED BUT NOT VERIFIED |
| New Production Handover Tracking | Ready Engineering Package*, Production Transfer Reference, Manufacturing Instructions*, Handover Date, Readiness Status, Handover Notes | IMPLEMENTED BUT NOT VERIFIED |
| New Production Order | Approved Handover*, Planned Quantity*, Production Owner*, Start Date, Planned Completion, Remarks | IMPLEMENTED BUT NOT VERIFIED |
| New Finished Goods | Approved Quality Record*, Remarks | IMPLEMENTED BUT NOT VERIFIED |
| New Quality Inspection | Completed Production Order*, Accepted Quantity*, Rejected Quantity, Inspector*, Inspection Remarks | IMPLEMENTED BUT NOT VERIFIED |
| New Dispatch | Finished Goods*, Customer*, Quantity*, Dispatch Date, Transport Details, Delivery Address*, Dispatch Remarks | IMPLEMENTED BUT NOT VERIFIED |
| New Invoice | Dispatch*, Invoice Date, Amount*, Tax Rate (%) | IMPLEMENTED BUT NOT VERIFIED |
| New Delivery | Dispatch*, Delivery Date | IMPLEMENTED BUT NOT VERIFIED |
| Prepare Purchase/Production Handover | Receiving owner, Handover date, Prepared by, Handover notes | IMPLEMENTED BUT NOT VERIFIED |
| Acknowledgement | Status (Acknowledged/Remarks/Rejected/Hold), Owner, Date, Comments; comments required unless Acknowledged | IMPLEMENTED BUT NOT VERIFIED |
| Add Transfer Comment | Stage, Author, Role, Comment text, Attachment reference | IMPLEMENTED BUT NOT VERIFIED |
| Release review | Source summary, exact BOM/drawing revisions, errors; release confirmation | IMPLEMENTED BUT NOT VERIFIED |
| Resubmit review | New revision, submitted by, notes; resets stages/checklists | IMPLEMENTED BUT NOT VERIFIED |
| Client submission | Client reviewer, notes | IMPLEMENTED BUT NOT VERIFIED (simulation) |
| Client decision | Decision, comments, requested changes | IMPLEMENTED BUT NOT VERIFIED (simulation) |
| Add review comment | Stage, checklist item, comment, attachment | IMPLEMENTED BUT NOT VERIFIED |
| Delete/Archive confirmations | Standard Cancel/confirm pattern | IMPLEMENTED BUT NOT VERIFIED |

---

## 4. Validation evidence

| Test | Input | Observed result | Status |
|---|---|---|---|
| Empty enquiry submit | No values | 11 fields marked invalid; “Complete all required customer, date and technical fields before submitting.” | **IMPLEMENTED AND VERIFIED** (error path) |
| Empty project save | No values | 2 fields invalid; “Complete the required project fields before saving.” | **IMPLEMENTED AND VERIFIED** (error path) |
| Empty quotation technical review | No values | 3 invalid fields; “Complete the technical basis before starting technical review.” | **IMPLEMENTED AND VERIFIED** (error path) |
| Empty design plan | Defaults only | Plan created successfully | **BROKEN validation** (record removed after test) |
| Duplicate drawing number | Existing number | Source blocks with “This drawing number already exists in the register.” | IMPLEMENTED BUT NOT VERIFIED at runtime |
| Invalid drawing attachment | Unsupported extension | Source rejects with “[EXT] cannot be attached here.” | IMPLEMENTED BUT NOT VERIFIED at runtime |
| Locked BOM material/quantity edit | Released BOM | Source blocks with locked-BOM message | IMPLEMENTED BUT NOT VERIFIED at runtime |
| Review rejection without comment | Reject/Request Changes | Source requires a reason | IMPLEMENTED BUT NOT VERIFIED at runtime |
| Client rejection without comment | Reject/Request Changes | Source requires a reason | IMPLEMENTED BUT NOT VERIFIED at runtime |
| Transfer create with failed mandatory check | Blocking validation | Source blocks creation; toast “Validation failed. Transfer creation is blocked.” | IMPLEMENTED BUT NOT VERIFIED at runtime |
| Archive with no restore path | Archived design/project | Archive action exists; no unarchive action found | **BROKEN lifecycle** |

---

## 5. Buttons and actions

### 5.1 Global and module-header actions

| Action | Location | What it does | Conditions / data | Status |
|---|---|---|---|---|
| Create / Add (`New Enquiry`, `New Quotation`, `Create Project`, etc.) | Module header | Opens form route | Module-specific | IMPLEMENTED AND VERIFIED (navigation) |
| Refresh | Module toolbars | Recomputes/refreshes local view; some only show a toast | None | IMPLEMENTED BUT NOT VERIFIED |
| Export CSV | Registers/report pages | Serialises current sorted/filtered rows to CSV download | Current table rows | IMPLEMENTED BUT NOT VERIFIED (source verified) |
| Reset Seed Data | Many module registers | Restores that module’s seed array, discarding local edits | No business guard | IMPLEMENTED BUT NOT VERIFIED (dangerous, not executed) |
| Filter | List toolbars | Opens/uses filter controls | Module fields | IMPLEMENTED AND VERIFIED on enquiry/project/report/CAD |
| Search | List toolbars | Client-side substring filter | Loaded rows | IMPLEMENTED AND VERIFIED |
| Sort | Column headers | Toggles ascending/descending | Sortable columns | IMPLEMENTED AND VERIFIED on project table and others |
| Pagination | Table footer | Changes page/page size | Filtered rows | IMPLEMENTED AND VERIFIED on project table |
| Theme toggle | Header | Switches `md-theme` and root class | Stored preference | IMPLEMENTED AND VERIFIED |
| Sidebar collapse/mobile menu | Layout | Opens/closes off-canvas sidebar | Viewport | IMPLEMENTED AND VERIFIED |
| Notifications | Header | Static notification modal | Hard-coded zero count | **BROKEN** (not data-driven) |
| Sign out | User menu | Local menu action only; no authentication | — | NOT IMPLEMENTED as real auth |

### 5.2 Register row actions

| Module | Row actions observed / present in source | Conditions | Status |
|---|---|---|---|
| Enquiries | View enquiry, Edit enquiry, Create quotation | Quotation conversion only when eligible | IMPLEMENTED AND VERIFIED (menu/eligibility) |
| Quotations | View quotation, Edit quotation | — | IMPLEMENTED AND VERIFIED (menu) |
| Projects | Open project; Edit; conversion dialog; archive | Conversion disabled if plan linked | IMPLEMENTED AND VERIFIED (conversion disabled path); archive unverified |
| Design plans | View, Edit, Delete | Delete confirmation | IMPLEMENTED AND VERIFIED (delete test) |
| Design tasks | View/Edit and status/progress actions | — | IMPLEMENTED BUT NOT VERIFIED |
| Concepts | View, Edit, Select/Compare, duplicate/proposal actions | Concept must be selected for design conversion | IMPLEMENTED BUT NOT VERIFIED |
| Designs | View, Edit, Duplicate, Archive, workflow conversion | Complete/Released needed for review conversion | IMPLEMENTED BUT NOT VERIFIED |
| Parts/assemblies | View, Edit, Duplicate, Add/remove part to assembly, Archive | Parent assembly context | IMPLEMENTED BUT NOT VERIFIED |
| Calculations | View, Edit, Duplicate, Submit for verification, Archive | Verification status | IMPLEMENTED BUT NOT VERIFIED |
| Analyses | View, Edit, Duplicate, Create manufacturing definition | Verified analysis needed for conversion | IMPLEMENTED BUT NOT VERIFIED |
| Validation reports | View, Edit draft, Duplicate, Submit, Approve, Evidence, Revisions, Export/Print, Archive | Draft/approval state | IMPLEMENTED BUT NOT VERIFIED |
| Manufacturing records | View, Edit, Submit/Approve, create linked record | Kind and status dependent | IMPLEMENTED BUT NOT VERIFIED |
| BOMs | View, Edit, Submit for review, Delete draft, New revision, Release, Compare | Released/locked records gated | IMPLEMENTED BUT NOT VERIFIED |
| CAD files | View details, Open in viewer, Download, Edit metadata, Delete | Preview availability determines viewer item | IMPLEMENTED AND VERIFIED (viewer/download source); mutation unverified |
| Drawings | View details, Open viewer, Edit, Submit for review, Submit for design review, Delete draft | Approval status; release requires approved current revision | IMPLEMENTED BUT NOT VERIFIED |
| Reviews | View details, View revision, Attachments, Raise engineering change, Edit draft, Submit | Approved review needed for ECR | IMPLEMENTED BUT NOT VERIFIED |
| Releases | Create controlled release / view details / history / exact revision | Release eligibility requires all stages + matching approved BOM & drawing | IMPLEMENTED BUT NOT VERIFIED |
| Changes | Open ECR/ECO, view engineering release | Released change only | IMPLEMENTED BUT NOT VERIFIED |
| Transfers | View, Edit, Validate, Prepare handover, Acknowledge, Comment, Cancel, Delete? | Destination status and validation | IMPLEMENTED BUT NOT VERIFIED |
| Cases | Open, Edit, Comment, Close | Closed case cannot be re-closed | IMPLEMENTED BUT NOT VERIFIED |
| Readiness | Manage readiness package; New Readiness Record | Project/BOM required | IMPLEMENTED BUT NOT VERIFIED |
| Purchase handover | Manage Purchase handover; New Purchase Handover | Ready package required | IMPLEMENTED BUT NOT VERIFIED |
| Production handover | Manage Production handover; New Production Handover | Ready package and instructions required | IMPLEMENTED BUT NOT VERIFIED |
| Production orders | Update production progress; New Production Order | Approved handover required | IMPLEMENTED BUT NOT VERIFIED |
| Quality/finished goods | Open quality inspection, New Quality Inspection, New Finished Goods | Completed order / approved quality | IMPLEMENTED BUT NOT VERIFIED |
| Dispatch/invoice/delivery | Actions for DLV records, New Dispatch/Invoice/Delivery | Dispatch depends on finished goods; invoice/delivery depend on dispatch | IMPLEMENTED BUT NOT VERIFIED |
| Service history | View customer service history | Static DLV seed records | IMPLEMENTED BUT NOT VERIFIED — static |
| Reports | Filter, Export CSV, toggle tabs | Static data | IMPLEMENTED AND VERIFIED (filter) |
| Settings | Edit category, Save, Reset, Add/edit/reorder list rows | Category fields and list rows | IMPLEMENTED BUT NOT VERIFIED |

### 5.3 Action failure behaviour

- Forms use inline field errors plus a top-of-form banner and optional toast.
- Row actions that cannot proceed show a toast with the source error (for example locked BOM, missing eligibility, duplicate conversion).
- Missing record detail shows an in-page “not found” panel rather than a 404 page.
- CSV export failures are not handled; export is synchronous and component-toast only.
- `window.print()` is used only by the validation-report detail page; other “print” expectations are not implemented.
- No action uses a network request, so there is no server failure state.

---

## 6. Search, filter, sort and pagination inventory

| Area | Search | Filters | Sort | Pagination | Status |
|---|---|---|---|---|---|
| Enquiries | Global text search | Status, priority, category, owner | Columns | Yes | IMPLEMENTED AND VERIFIED (search + priority filter) |
| Quotations | Text search | Status, priority, customer | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Projects | Text search | Status, domain, priority | Project name and others | Yes | IMPLEMENTED AND VERIFIED (sort + page 2) |
| Design plans/tasks | Text search | Status, owner, priority | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Concepts | Search | Status, project | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Mechanical registers | Search | Project, status, domain/category | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Analysis | Search | Type, status, project | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Manufacturing | Search | Kind/status/project | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| BOM | Search | Status, project, revision | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| CAD | Search | Category, project, format, approval/release | Columns | Yes | IMPLEMENTED AND VERIFIED (list controls) |
| Reviews | Search | Project, stage, type, status | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Transfers | Search | Project, destination, status | Columns | Yes | IMPLEMENTED BUT NOT VERIFIED |
| Reports | Global date range + project filter | Per-report filters | Sort on tables | Some tables | IMPLEMENTED AND VERIFIED (project filter changed portfolio 12→1) |
| Settings | Category search? | Category grid by section | — | — | IMPLEMENTED AND VERIFIED (rendering) |

**Verified list evidence**

- Enquiry search `ENQ-2026-045` → 1 row, “Showing 1-1 of 1”.
- Priority filter `High` with cleared search → “Showing 1-3 of 3”.
- Project table sort on `PROJECT NAME` changed ascending → descending.
- Project pagination page 2 → “Showing 6-10 of 15”.

---

## 7. Confirmed form/action defects

1. **Empty Design Plan is accepted** — no effective required-field block; test record was created, then deleted.
2. **Dashboard CTA destinations are wrong** — template, CAD, transfer and project links (see 02 §7).
3. **No real file input persistence** — most forms record metadata only; CAD keeps bytes only in memory.
4. **No import** — the only bulk data operation is CSV export; there is no CSV/Excel import.
5. **No auth** — the identity is hard-coded; Save/Approve/Release are not tied to a signed-in user.
6. **Archive has no restore** — archive actions exist, no unarchive route/action found.
