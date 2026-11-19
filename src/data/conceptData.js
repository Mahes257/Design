/**
 * Local mock data for Module 04 — Conceptual Design.
 *
 * Every record references the same Project IDs as Module 02 (`PRJ-2026-0xx`),
 * so the concept workspace agrees with the project register. Frontend only:
 * nothing leaves the browser.
 */
import { PROJECTS, addDays, formatDate, TODAY } from './projectData';

export { TODAY, addDays, formatDate };

/* ------------------------------------------------------------- vocabulary */
export const DESIGN_APPROACHES = [
  'Function-first / mechanism-led',
  'Modular / platform-based',
  'Fabricated weldment',
  'Sheet metal enclosure',
  'Casting / machined',
  'Equipment skid',
  'Retrofit adaptation',
  'Reverse engineered',
  'Hybrid / combined',
];

export const CONCEPT_STATUSES = [
  'Draft',
  'In Development',
  'Under Evaluation',
  'Shortlisted',
  'Selected',
  'Rejected',
  'On Hold',
];

export const CONCEPT_STATUS_TONES = {
  Draft: 'gray',
  'In Development': 'blue',
  'Under Evaluation': 'purple',
  Shortlisted: 'orange',
  Selected: 'green',
  Rejected: 'red',
  'On Hold': 'gray',
};

export function conceptStatusTone(status) {
  return CONCEPT_STATUS_TONES[status] || 'gray';
}

/* ------------------------------------------------------- preliminary layout */
export const LAYOUT_CATEGORIES = [
  {
    key: 'reference-images',
    label: 'Reference Images',
    hint: 'Site photos, competitor products and reference machines',
    accepts: 'image/*',
    icon: 'image',
  },
  {
    key: 'pdf-drawings',
    label: 'PDF Drawings',
    hint: 'Customer GA drawings and reference PDFs',
    accepts: '.pdf,application/pdf',
    icon: 'pdf',
  },
  {
    key: 'preliminary-layouts',
    label: 'Preliminary Layouts',
    hint: 'Concept layouts, envelopes and arrangement sketches',
    accepts: '.pdf,.dwg,.dxf,.step,.stp',
    icon: 'layout',
  },
  {
    key: 'supporting-documents',
    label: 'Supporting Documents',
    hint: 'Calculations, standards and vendor data',
    accepts: '.pdf,.xlsx,.docx,.csv',
    icon: 'doc',
  },
];

export function layoutCategoryLabel(key) {
  return LAYOUT_CATEGORIES.find((category) => category.key === key)?.label || key;
}

/* ------------------------------------------------------------ feasibility */
export const FEASIBILITY_AREAS = [
  {
    key: 'technical',
    label: 'Technical Feasibility',
    hint: 'Can the concept meet the functional duty within the available technology?',
  },
  {
    key: 'operational',
    label: 'Operational Feasibility',
    hint: 'Operation, service access, duty cycle and site conditions',
  },
  {
    key: 'material',
    label: 'Material Feasibility',
    hint: 'Material grades, availability, lead time and substitutes',
  },
  {
    key: 'cost',
    label: 'Preliminary Cost Feasibility',
    hint: 'Order-of-magnitude cost against the project budget',
  },
];

export const FEASIBILITY_RATINGS = [
  'Feasible',
  'Feasible with conditions',
  'Not feasible',
  'Not assessed',
];

export const FEASIBILITY_RATING_TONES = {
  Feasible: 'green',
  'Feasible with conditions': 'orange',
  'Not feasible': 'red',
  'Not assessed': 'gray',
};

export const FEASIBILITY_STATUSES = [
  'Pending',
  'Under Study',
  'Feasible',
  'Conditionally Feasible',
  'Not Feasible',
];

export const FEASIBILITY_STATUS_TONES = {
  Pending: 'gray',
  'Under Study': 'blue',
  Feasible: 'green',
  'Conditionally Feasible': 'orange',
  'Not Feasible': 'red',
};

export function feasibilityRatingTone(rating) {
  return FEASIBILITY_RATING_TONES[rating] || 'gray';
}

export function feasibilityStatusTone(status) {
  return FEASIBILITY_STATUS_TONES[status] || 'gray';
}

/* -------------------------------------------------------------- selection */
export const DEFAULT_CRITERIA = [
  { id: 'c-functional', label: 'Functional Suitability', weight: 14 },
  { id: 'c-technical', label: 'Technical Feasibility', weight: 14 },
  { id: 'c-material', label: 'Material Suitability', weight: 8 },
  { id: 'c-performance', label: 'Performance', weight: 12 },
  { id: 'c-maintenance', label: 'Maintainability', weight: 8 },
  { id: 'c-complexity', label: 'Design Complexity', weight: 10 },
  { id: 'c-safety', label: 'Safety Considerations', weight: 8 },
  { id: 'c-cost', label: 'Estimated Cost', weight: 10 },
  { id: 'c-manufacturing', label: 'Manufacturing Feasibility', weight: 10 },
  { id: 'c-risks', label: 'Design Risks', weight: 6 },
];

/* --------------------------------------------------------------- proposal */
export const PROPOSAL_STATUSES = [
  'Draft',
  'Submitted for Review',
  'Under Review',
  'Approved for Concept',
  'Revision Requested',
  'Withdrawn',
];

export const PROPOSAL_STATUS_TONES = {
  Draft: 'gray',
  'Submitted for Review': 'purple',
  'Under Review': 'purple',
  'Approved for Concept': 'green',
  'Revision Requested': 'orange',
  Withdrawn: 'gray',
};

export function proposalStatusTone(status) {
  return PROPOSAL_STATUS_TONES[status] || 'gray';
}

export const PROPOSAL_NOTICE =
  'Concept approval confirms the concept direction only. It is not final engineering approval, drawing release or production release — those gates stay with Design Review & Approval.';

/* ------------------------------------------------------------ mock data */
export const CONCEPTS = [
  {
    id: 'CON-2026-001',
    projectId: 'PRJ-2026-041',
    name: 'Twin helical gearbox drive',
    approach: 'Modular / platform-based',
    description:
      'Platform gearbox with a twin helical stage and a foot-mounted motor, packaged inside the existing drive envelope so the platform can be reused for the 30 kW variant.',
    advantages:
      'Higher efficiency than a worm drive, proven platform parts, lower spare-part variety and a shorter detail-design phase.',
    limitations:
      'Needs a larger housing casting and the first article lead time is eight weeks.',
    technicalNotes:
      'Preliminary ratio 24:1 in two stages; bearings sized for 45 kW at 1.8 × starting torque; housing split horizontally for service.',
    createdBy: 'D. Rao',
    createdAt: '2026-09-02',
    status: 'Selected',
  },
  {
    id: 'CON-2026-002',
    projectId: 'PRJ-2026-041',
    name: 'Integrated worm drive',
    approach: 'Casting / machined',
    description:
      'Compact worm-and-wheel unit integrated into the conveyor head shaft, removing the separate coupling and reducing the footprint.',
    advantages: 'Smallest envelope of the three options and only two main parts to assemble.',
    limitations:
      'Lower efficiency at the required ratio, heat rejection is marginal and the casting pattern is single-source.',
    technicalNotes:
      'Worm wheel in phosphor bronze; thermal check indicates 8 °C margin at 45 °C ambient — below the 15% target.',
    createdBy: 'V. Sharma',
    createdAt: '2026-09-05',
    status: 'Rejected',
  },
  {
    id: 'CON-2026-003',
    projectId: 'PRJ-2026-041',
    name: 'Belt-driven remote motor',
    approach: 'Function-first / mechanism-led',
    description:
      'Motor relocated outside the hot zone and connected through a guarded timing-belt reduction, leaving the gearbox as a simple right-angle unit.',
    advantages: 'Motor service is much easier and the drive is isolated from conveyor heat.',
    limitations: 'Adds a belt guard, a tensioning device and a second maintenance item.',
    technicalNotes:
      'HTD 14M belt, 3:1 reduction, guard to IS 14271; belt life estimated at 18,000 h at rated load.',
    createdBy: 'A. Iyer',
    createdAt: '2026-09-09',
    status: 'Shortlisted',
  },
  {
    id: 'CON-2026-004',
    projectId: 'PRJ-2026-036',
    name: 'Single-piece folded enclosure',
    approach: 'Sheet metal enclosure',
    description:
      'Enclosure folded from one 2 mm CRCA sheet with a single seam at the rear, minimising welds and finishing operations.',
    advantages: 'Fewest parts and the fastest assembly; excellent paint coverage.',
    limitations:
      'Requires a 2 m press brake and the flat pattern wastes 14% more sheet than the modular option.',
    technicalNotes:
      'Bend radius 2 mm minimum; IP54 gasket groove formed in a single hit; flat pattern 1,840 × 1,120 mm.',
    createdBy: 'S. Menon',
    createdAt: '2026-10-06',
    status: 'Under Evaluation',
  },
  {
    id: 'CON-2026-005',
    projectId: 'PRJ-2026-036',
    name: 'Modular panel system',
    approach: 'Modular / platform-based',
    description:
      'Enclosure built from three common panels plus a door frame, so width changes only affect the top, bottom and rear panels.',
    advantages:
      'Reusable across the 600/800/1,000 mm variants, standard tooling only and better nesting yield.',
    limitations: 'More fasteners and a visible joint line at the panel seams.',
    technicalNotes:
      'IP54 achieved with a continuous gasket and 25 mm fastener pitch; DFM reviewed with the fabricator.',
    createdBy: 'V. Sharma',
    createdAt: '2026-10-09',
    status: 'Selected',
  },
  {
    id: 'CON-2026-006',
    projectId: 'PRJ-2026-029',
    name: 'Cast aluminium bracket',
    approach: 'Casting / machined',
    description:
      'Single-piece LM6 cast bracket with machined mounting pads and integral ribs for the vibration isolators.',
    advantages: 'Lowest part count, good damping and no weld fatigue detail.',
    limitations: 'Pattern cost is high for a low-volume build and porosity risk at the rib junctions.',
    technicalNotes:
      'First natural frequency target ≥ 90 Hz; casting draft 1.5°; machined pads flat within 0.1 mm.',
    createdBy: 'R. Kulkarni',
    createdAt: '2026-10-14',
    status: 'Under Evaluation',
  },
  {
    id: 'CON-2026-007',
    projectId: 'PRJ-2026-029',
    name: 'Fabricated steel bracket',
    approach: 'Fabricated weldment',
    description:
      'Bracket fabricated from 10 mm E250 plates with two gussets, then machined at the mounting faces.',
    advantages: 'Cheap tooling, local fabrication and easy to modify during prototyping.',
    limitations: 'Weld fatigue at the gusset toes needs verification and the part is 38% heavier.',
    technicalNotes:
      'Fillet welds 6 mm, full penetration at the base; fatigue check to IS 800 detail category 80.',
    createdBy: 'K. Pillai',
    createdAt: '2026-10-16',
    status: 'Shortlisted',
  },
  {
    id: 'CON-2026-008',
    projectId: 'PRJ-2026-026',
    name: 'Gear pump with integral reservoir',
    approach: 'Equipment skid',
    description:
      'Skid-mounted lubrication unit with an integral 120 L reservoir, gear pump and duplex filter inside one frame.',
    advantages: 'Single lift point, short pipe runs and a proven pump platform.',
    limitations: 'Reservoir access for cleaning is tight and the skid weight is close to the limit.',
    technicalNotes:
      'Pump 45 L/min at 4 bar; reservoir sized for 3 minutes of circulation; drain and breather on one side.',
    createdBy: 'A. Iyer',
    createdAt: '2026-08-18',
    status: 'Selected',
  },
  {
    id: 'CON-2026-009',
    projectId: 'PRJ-2026-033',
    name: 'Rack-mounted utility piping',
    approach: 'Retrofit adaptation',
    description:
      'Utility lines re-routed onto the existing plant rack with new tie-in spools at the skid battery limit.',
    advantages: 'No new structural steel and the layout follows the existing plant route.',
    limitations: 'Shutdown window for tie-in is only 36 hours and expansion loops are constrained.',
    technicalNotes:
      'Cooling water 2 in NB, air 1/2 in NB; allowable pressure drop 0.5 bar; supports every 3 m.',
    createdBy: 'P. Deshmukh',
    createdAt: '2026-09-24',
    status: 'In Development',
  },
  {
    id: 'CON-2026-010',
    projectId: 'PRJ-2026-014',
    name: 'Forged hub with bolted blades',
    approach: 'Casting / machined',
    description:
      'Forged aluminium hub with bolted blade roots so individual blades can be replaced without removing the fan.',
    advantages: 'Blade replacement in the field and better fatigue performance at the root.',
    limitations: 'More machining operations and a longer hub lead time.',
    technicalNotes:
      'Root bolts M16 grade 10.9 preloaded to 210 Nm; hub checked for 1.5 × operating speed.',
    createdBy: 'N. Joshi',
    createdAt: '2026-10-21',
    status: 'Under Evaluation',
  },
];

export const LAYOUT_FILES = [
  {
    id: 'LAY-2026-001',
    projectId: 'PRJ-2026-041',
    conceptId: 'CON-2026-001',
    category: 'reference-images',
    name: 'existing-drive-installation.jpg',
    type: 'JPEG image',
    size: 2480,
    version: 'R0',
    uploadedBy: 'D. Rao',
    uploadedAt: '2026-09-03',
    detail: '3024 × 2016 px · site photo',
  },
  {
    id: 'LAY-2026-002',
    projectId: 'PRJ-2026-041',
    conceptId: 'CON-2026-001',
    category: 'reference-images',
    name: 'competitor-gearbox-detail.png',
    type: 'PNG image',
    size: 1180,
    version: 'R0',
    uploadedBy: 'V. Sharma',
    uploadedAt: '2026-09-04',
    detail: '1920 × 1080 px · reference photo',
  },
  {
    id: 'LAY-2026-003',
    projectId: 'PRJ-2026-041',
    conceptId: 'CON-2026-001',
    category: 'pdf-drawings',
    name: 'customer-interface-ga-rev-b.pdf',
    type: 'PDF document',
    size: 3620,
    version: 'B',
    uploadedBy: 'R. Kulkarni',
    uploadedAt: '2026-09-02',
    detail: '6 pages · A1 sheets',
  },
  {
    id: 'LAY-2026-004',
    projectId: 'PRJ-2026-041',
    conceptId: 'CON-2026-003',
    category: 'preliminary-layouts',
    name: 'belt-drive-layout-concept-3.pdf',
    type: 'PDF document',
    size: 1450,
    version: 'R1',
    uploadedBy: 'A. Iyer',
    uploadedAt: '2026-09-12',
    detail: '2 pages · 1:10 layout',
  },
  {
    id: 'LAY-2026-005',
    projectId: 'PRJ-2026-036',
    conceptId: 'CON-2026-005',
    category: 'preliminary-layouts',
    name: 'modular-panel-envelope.dwg',
    type: 'AutoCAD drawing',
    size: 2870,
    version: 'R0',
    uploadedBy: 'S. Menon',
    uploadedAt: '2026-10-11',
    detail: 'Model space · 6 layouts',
  },
  {
    id: 'LAY-2026-006',
    projectId: 'PRJ-2026-036',
    conceptId: 'CON-2026-004',
    category: 'supporting-documents',
    name: 'sheet-nesting-study.xlsx',
    type: 'Excel workbook',
    size: 640,
    version: 'R0',
    uploadedBy: 'V. Sharma',
    uploadedAt: '2026-10-12',
    detail: '3 sheets · nesting yield 86%',
  },
  {
    id: 'LAY-2026-007',
    projectId: 'PRJ-2026-029',
    conceptId: 'CON-2026-006',
    category: 'pdf-drawings',
    name: 'vibration-isolator-datasheet.pdf',
    type: 'PDF document',
    size: 980,
    version: 'A',
    uploadedBy: 'R. Kulkarni',
    uploadedAt: '2026-10-15',
    detail: '4 pages · vendor datasheet',
  },
  {
    id: 'LAY-2026-008',
    projectId: 'PRJ-2026-026',
    conceptId: 'CON-2026-008',
    category: 'supporting-documents',
    name: 'pump-performance-curve.pdf',
    type: 'PDF document',
    size: 720,
    version: 'A',
    uploadedBy: 'A. Iyer',
    uploadedAt: '2026-08-20',
    detail: '1 page · 45 L/min at 4 bar',
  },
];

function emptyAreas() {
  return FEASIBILITY_AREAS.reduce((accumulator, area) => {
    accumulator[area.key] = { rating: 'Not assessed', notes: '' };
    return accumulator;
  }, {});
}

export const FEASIBILITY_STUDIES = [
  {
    id: 'FSB-2026-001',
    projectId: 'PRJ-2026-041',
    conceptId: 'CON-2026-001',
    areas: {
      technical: {
        rating: 'Feasible',
        notes:
          'Two-stage helical arrangement meets the 24:1 ratio inside the 1,450 mm envelope. Bearing life 26,000 h at rated load.',
      },
      operational: {
        rating: 'Feasible',
        notes: 'Oil level and breather accessible from the walkway side; no special tools for service.',
      },
      material: {
        rating: 'Feasible',
        notes: 'Housing casting available from two approved foundries; gears in 20MnCr5 are standard stock.',
      },
      cost: {
        rating: 'Feasible with conditions',
        notes:
          'Unit cost 6% above target at first article; falls within budget from the third unit once the pattern is amortised.',
      },
    },
    risks: 'Casting porosity at the bearing bosses and an eight-week pattern lead time.',
    constraints: 'Existing foundation bolt pattern cannot be changed; drive envelope fixed by the machine guard.',
    assumptions: 'Customer confirms the 45 kW motor and 1,470 rpm input speed before detail design starts.',
    status: 'Feasible',
    reviewer: 'R. Kulkarni',
    reviewComments:
      'Concept is technically sound. Proceed to layout once the motor datasheet is frozen and the casting supplier is nominated.',
    reviewedOn: '2026-09-18',
    updatedAt: '2026-09-18',
  },
  {
    id: 'FSB-2026-002',
    projectId: 'PRJ-2026-036',
    conceptId: 'CON-2026-005',
    areas: {
      technical: {
        rating: 'Feasible',
        notes: 'Modular joint maintains IP54 with a continuous gasket and 25 mm fastener pitch.',
      },
      operational: { rating: 'Feasible', notes: 'Door swing and cable entry unchanged from the current enclosure.' },
      material: {
        rating: 'Feasible',
        notes: '1.5 and 2.0 mm CRCA available ex-stock; 2.5 mm needs a two-week order.',
      },
      cost: {
        rating: 'Feasible with conditions',
        notes: '9% cheaper than the folded option at 50 units, but only if the three panels are nested together.',
      },
    },
    risks: 'Visible seam line may not be accepted by the customer’s industrial design team.',
    constraints: 'Standard 600 mm module width and existing hinge positions must be retained.',
    assumptions: 'Fabricator holds the 2 m press brake and laser capacity assumed in the DFM review.',
    status: 'Conditionally Feasible',
    reviewer: 'N. Joshi',
    reviewComments:
      'Feasible on cost and manufacture. Obtain customer sign-off on the seam line before releasing the layout.',
    reviewedOn: '2026-10-20',
    updatedAt: '2026-10-20',
  },
  {
    id: 'FSB-2026-003',
    projectId: 'PRJ-2026-029',
    conceptId: 'CON-2026-007',
    areas: {
      technical: { rating: 'Feasible with conditions', notes: 'Weld fatigue at the gusset toes needs a hot-spot check.' },
      operational: { rating: 'Feasible', notes: 'No change to the isolation pads or access.' },
      material: { rating: 'Feasible', notes: '10 mm E250 plate is available from the approved stockist.' },
      cost: { rating: 'Not assessed', notes: 'Fabrication quote pending from two vendors.' },
    },
    risks: 'Weld fatigue life below the 20-year target if the gusset detail is not revised.',
    constraints: 'Bracket must fit the existing 480 × 320 mm bolt pattern.',
    assumptions: 'Fatigue load spectrum from the FEA group is representative of site duty.',
    status: 'Under Study',
    reviewer: 'A. Iyer',
    reviewComments: 'Hold the concept selection until the fatigue check and fabrication quotes are returned.',
    reviewedOn: '',
    updatedAt: '2026-10-22',
  },
  {
    id: 'FSB-2026-004',
    projectId: 'PRJ-2026-026',
    conceptId: 'CON-2026-008',
    areas: {
      technical: { rating: 'Feasible', notes: 'Gear pump and duplex filter fit the 3.2 × 2.1 m skid with service access.' },
      operational: { rating: 'Feasible', notes: 'Reservoir drain and breather accessible from one side.' },
      material: { rating: 'Feasible', notes: 'Pump, filter and instrumentation all on the approved vendor list.' },
      cost: { rating: 'Feasible', notes: 'Within 2% of the budget estimate at the current scope.' },
    },
    risks: 'Skid weight at 6.4 t leaves only 100 kg margin against the lifting limit.',
    constraints: 'Maximum transport width 2.4 m and lifting weight 6.5 t.',
    assumptions: 'Site utilities are available at the skid battery limit.',
    status: 'Feasible',
    reviewer: 'R. Kulkarni',
    reviewComments: 'Approved for concept layout. Confirm final skid weight after the reservoir thickness review.',
    reviewedOn: '2026-09-02',
    updatedAt: '2026-09-02',
  },
];

function scoreSet(values) {
  return values;
}

export const COMPARISONS = [
  {
    id: 'CMP-2026-001',
    projectId: 'PRJ-2026-041',
    criteria: DEFAULT_CRITERIA.map((criterion) => ({ ...criterion })),
    scores: {
      'CON-2026-001': scoreSet({
        'c-technical': 9,
        'c-cost': 6,
        'c-manufacturing': 8,
        'c-material': 8,
        'c-maintenance': 7,
        'c-performance': 9,
      }),
      'CON-2026-002': scoreSet({
        'c-technical': 6,
        'c-cost': 7,
        'c-manufacturing': 5,
        'c-material': 6,
        'c-maintenance': 8,
        'c-performance': 5,
      }),
      'CON-2026-003': scoreSet({
        'c-technical': 7,
        'c-cost': 5,
        'c-manufacturing': 7,
        'c-material': 8,
        'c-maintenance': 4,
        'c-performance': 7,
      }),
    },
    selectedConceptId: 'CON-2026-001',
    summary:
      'The twin helical gearbox scores highest on technical suitability and performance while keeping manufacturing and material risk low. The remote-motor option is easier to service but adds a belt guard and a second maintenance item, and the worm drive falls short on thermal margin.',
    decidedBy: 'R. Kulkarni',
    decidedOn: '2026-09-20',
    status: 'Selection recorded',
  },
  {
    id: 'CMP-2026-002',
    projectId: 'PRJ-2026-036',
    criteria: DEFAULT_CRITERIA.map((criterion) => ({ ...criterion })),
    scores: {
      'CON-2026-004': scoreSet({
        'c-technical': 8,
        'c-cost': 5,
        'c-manufacturing': 6,
        'c-material': 6,
        'c-maintenance': 8,
        'c-performance': 7,
      }),
      'CON-2026-005': scoreSet({
        'c-technical': 8,
        'c-cost': 8,
        'c-manufacturing': 9,
        'c-material': 8,
        'c-maintenance': 7,
        'c-performance': 7,
      }),
    },
    selectedConceptId: 'CON-2026-005',
    summary:
      'The modular panel system wins on cost, manufacturability and material yield, and reuses the same platform across all three enclosure widths. The seam line is accepted subject to customer sign-off.',
    decidedBy: 'S. Menon',
    decidedOn: '2026-10-21',
    status: 'Selection recorded',
  },
  {
    id: 'CMP-2026-003',
    projectId: 'PRJ-2026-029',
    criteria: DEFAULT_CRITERIA.map((criterion) => ({ ...criterion })),
    scores: {
      'CON-2026-006': scoreSet({
        'c-technical': 8,
        'c-cost': 4,
        'c-manufacturing': 6,
        'c-material': 5,
        'c-maintenance': 9,
        'c-performance': 8,
      }),
      'CON-2026-007': scoreSet({
        'c-technical': 7,
        'c-cost': 9,
        'c-manufacturing': 8,
        'c-material': 8,
        'c-maintenance': 8,
        'c-performance': 6,
      }),
    },
    selectedConceptId: '',
    summary: '',
    decidedBy: '',
    decidedOn: '',
    status: 'In comparison',
  },
];

export const PROPOSALS = [
  {
    id: 'PROP-2026-001',
    projectId: 'PRJ-2026-041',
    conceptId: 'CON-2026-001',
    revision: 'B',
    technicalSummary:
      'Platform twin-helical gearbox rated 45 kW at 1,470 rpm input, 24:1 reduction, horizontal split housing with a foot-mounted motor inside the existing guard envelope.',
    scope:
      'Concept-level arrangement, envelope and interface definition, preliminary gear and bearing selection, and the concept cost estimate. Detail design, drawing release and manufacturing documentation are excluded.',
    assumptions:
      'Motor datasheet confirmed at 45 kW / 1,470 rpm; foundation bolt pattern unchanged; casting supplier nominated before detail design.',
    attachments: [
      { name: 'concept-layout-rev-b.pdf', size: 1620 },
      { name: 'preliminary-gear-selection.xlsx', size: 480 },
      { name: 'concept-cost-estimate.pdf', size: 360 },
    ],
    status: 'Submitted for Review',
    preparedBy: 'D. Rao',
    submittedOn: '2026-09-25',
    updatedAt: '2026-09-25',
  },
  {
    id: 'PROP-2026-002',
    projectId: 'PRJ-2026-026',
    conceptId: 'CON-2026-008',
    revision: 'A',
    technicalSummary:
      'Skid-mounted lubrication unit: 120 L reservoir, 45 L/min gear pump at 4 bar, duplex filter and instrumentation on a single fabricated frame with one lifting point.',
    scope:
      'Concept layout, pump and filter selection, nozzle schedule and skid envelope. Piping detail, structural calculations and O&M documentation follow in detailed design.',
    assumptions:
      'Utilities available at the skid battery limit; skid weight stays below 6.5 t after the reservoir thickness review.',
    attachments: [
      { name: 'lubrication-unit-concept-layout.pdf', size: 1180 },
      { name: 'pump-data-sheet.pdf', size: 720 },
    ],
    status: 'Approved for Concept',
    preparedBy: 'A. Iyer',
    submittedOn: '2026-09-05',
    updatedAt: '2026-09-12',
  },
  {
    id: 'PROP-2026-003',
    projectId: 'PRJ-2026-036',
    conceptId: 'CON-2026-005',
    revision: 'A',
    technicalSummary:
      'Modular IP54 enclosure built from three shared panels and a door frame, with a continuous gasket and 25 mm fastener pitch, scalable across 600/800/1,000 mm widths.',
    scope: 'Concept arrangement, panel split, gasket strategy and DFM findings. Flat patterns and production drawings are excluded.',
    assumptions: 'Fabricator holds 2 m press brake capacity; customer accepts the visible seam line.',
    attachments: [{ name: 'modular-panel-concept.pdf', size: 940 }],
    status: 'Draft',
    preparedBy: 'V. Sharma',
    submittedOn: '',
    updatedAt: '2026-10-22',
  },
];

/* ---------------------------------------------------------------- helpers */
export function nextId(records, prefix) {
  const highest = records.reduce((max, record) => {
    const numeric = Number(String(record.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}

export function projectLabel(project) {
  return project ? `${project.id} · ${project.name}` : 'Unassigned';
}

export function conceptsForProject(concepts, projectId) {
  return concepts.filter((concept) => concept.projectId === projectId);
}

export function weightedScore(criteria, scores, conceptId) {
  const conceptScores = scores[conceptId] || {};
  const totalWeight = criteria.reduce((total, criterion) => total + (Number(criterion.weight) || 0), 0);
  if (!totalWeight) return 0;
  const earned = criteria.reduce(
    (total, criterion) =>
      total + (Number(conceptScores[criterion.id]) || 0) * (Number(criterion.weight) || 0),
    0,
  );
  // Scores are 0–10; normalise to a 0–100 weighted score.
  return Math.round((earned / (totalWeight * 10)) * 1000) / 10;
}

export function buildComparisonRows(criteria, scores, concepts) {
  return concepts
    .map((concept) => ({ concept, score: weightedScore(criteria, scores, concept.id) }))
    .sort((left, right) => right.score - left.score);
}

export function conceptIsOpen(concept) {
  return !['Rejected', 'On Hold', 'Selected'].includes(concept.status);
}

export function buildConceptKpis(concepts) {
  return {
    total: concepts.length,
    selected: concepts.filter((concept) => concept.status === 'Selected').length,
    evaluation: concepts.filter((concept) =>
      ['In Development', 'Under Evaluation', 'Shortlisted'].includes(concept.status),
    ).length,
    projects: new Set(concepts.map((concept) => concept.projectId)).size,
  };
}

export function defaultStudy(projectId, conceptId) {
  return {
    id: '',
    projectId,
    conceptId,
    areas: emptyAreas(),
    risks: '',
    constraints: '',
    assumptions: '',
    status: 'Pending',
    reviewer: '',
    reviewComments: '',
    reviewedOn: '',
    updatedAt: '',
  };
}

export { emptyAreas };

export const CONCEPT_PROJECT_OPTIONS = PROJECTS.map((project) => ({
  value: project.id,
  label: `${project.id} · ${project.name}`,
}));

/* ==========================================================================
   Module 04 — concept review, alternatives and selection gating
   ========================================================================== */

export const CONCEPT_COMPLEXITIES = ['Low', 'Medium', 'High', 'Very High'];

export const REVIEW_STATUSES = [
  'Not Submitted',
  'Submitted for Review',
  'Under Review',
  'Approved',
  'Rejected',
  'Returned for Modification',
];

export const REVIEW_STATUS_TONES = {
  'Not Submitted': 'gray',
  'Submitted for Review': 'purple',
  'Under Review': 'purple',
  Approved: 'green',
  Rejected: 'red',
  'Returned for Modification': 'orange',
};

export const REVIEW_DECISIONS = ['Approved', 'Rejected', 'Returned for Modification'];

export function reviewStatusTone(status) {
  return REVIEW_STATUS_TONES[status] || 'gray';
}

/** Fields added by Module 04 to concepts created or edited here. */
export const CONCEPT_DEFAULTS = {
  designPlanId: '',
  owner: '',
  functionalRequirements: '',
  operatingConditions: '',
  materialOptions: '',
  designConstraints: '',
  sizeConstraints: '',
  expectedPerformance: '',
  complexity: 'Medium',
  technicalAssumptions: '',
  risks: '',
  remarks: '',
  originConceptId: '',
  review: {
    status: 'Not Submitted',
    reviewer: '',
    reviewDate: '',
    decision: '',
    reason: '',
    comments: '',
    corrections: '',
    history: [],
  },
};

function normalizeReview(review) {
  return { ...CONCEPT_DEFAULTS.review, ...(review || {}), history: review?.history || [] };
}

/** Concept with every Module 04 field present, including review defaults. */
export function normalizeConceptRecord(concept) {
  return { ...CONCEPT_DEFAULTS, ...concept, review: normalizeReview(concept?.review) };
}

/** A concept may be selected only once its review is approved. */
export function conceptIsApproved(concept) {
  return normalizeReview(concept?.review).status === 'Approved';
}

/** Review status shown in the register and on the concept workspace. */
export function conceptReviewStatus(concept) {
  return normalizeReview(concept?.review).status;
}

/** Selection status shown in the register, derived from the project comparison. */
export function conceptSelectionStatus(concept, comparison) {
  if (comparison?.selectedConceptId === concept?.id) return 'Selected';
  if (conceptIsApproved(concept)) return 'Approved — awaiting selection';
  const status = normalizeReview(concept?.review).status;
  return status === 'Not Submitted' ? 'Not selected' : `Not selected · ${status}`;
}

export function nextRevisionLetter(revision = 'A') {
  const current = String(revision || 'A').toUpperCase();
  return String.fromCharCode(Math.min(90, current.charCodeAt(0) + 1));
}

/** Duplicate a concept as a new revision record without overwriting history. */
export function revisionCopy(concept, newId) {
  const revision = nextRevisionLetter(concept.revision);
  const entry = {
    revision,
    date: TODAY,
    by: concept.owner || concept.createdBy || 'Design Admin',
    note: `New revision created from ${concept.id} (Rev ${concept.revision || 'A'}).`,
  };
  return normalizeConceptRecord({
    ...concept,
    id: newId,
    revision,
    revisions: [...(concept.revisions || []), entry],
    status: 'Draft',
    originConceptId: concept.id,
    createdAt: TODAY,
    review: {
      status: 'Not Submitted',
      reviewer: '',
      reviewDate: '',
      decision: '',
      reason: '',
      comments: '',
      corrections: '',
      history: [],
    },
  });
}
