/**
 * Local mock data for Module 02 — Project Management.
 * Frontend only: deterministic registers, no API and no persistence beyond the
 * in-session project context.
 */

export const PROJECT_DOMAINS = [
  'Machine Design',
  'Product Design',
  'Sheet Metal Design',
  'Piping Design',
  'Fabrication Design',
  'Equipment Design',
  'Automotive Components',
];

export const PROJECT_TYPES = [
  'New Design',
  'Variant / Derivative',
  'Reverse Engineering',
  'Prototype Development',
  'Retrofit / Upgrade',
];

export const PROJECT_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const PROJECT_ROLES = ['Project Manager', 'Design Engineer', 'Technical Reviewer', 'Team Member'];

export const DISCIPLINES = ['Mechanical', 'Analysis', 'Sheet Metal', 'Piping', 'Drafting', 'BOM'];

export const ENGINEERS = [
  'R. Kulkarni',
  'A. Iyer',
  'S. Menon',
  'P. Deshmukh',
  'D. Rao',
  'N. Joshi',
  'V. Sharma',
  'K. Pillai',
];

export const PROJECT_STATUSES = [
  'New Request',
  'Under Planning',
  'Design In Progress',
  'Under Review',
  'Approval Pending',
  'Approved',
  'Transferred',
  'Manufacturing In Progress',
  'Completed',
];

export const PROJECT_EXCEPTIONS = ['On Hold', 'Cancelled'];

export const ALL_PROJECT_STATUSES = [...PROJECT_STATUSES, ...PROJECT_EXCEPTIONS];

export const MILESTONE_STATUSES = ['Planned', 'On Track', 'At Risk', 'Overdue', 'Completed'];

export const DELIVERABLE_OPTIONS = [
  '3D CAD model',
  'GA drawing',
  'Manufacturing drawings',
  'Engineering BOM',
  'Design calculation report',
  'FEA / validation report',
  'Inspection specification',
  'Operation & maintenance manual',
];

const STATUS_TONES = {
  Draft: 'gray',
  'New Request': 'gray',
  'Under Planning': 'orange',
  'Design In Progress': 'blue',
  'Under Review': 'purple',
  'Approval Pending': 'orange',
  Approved: 'green',
  Transferred: 'green',
  'Manufacturing In Progress': 'blue',
  Completed: 'green',
  'On Hold': 'gray',
  Cancelled: 'red',
};

export const MILESTONE_TONES = {
  Planned: 'gray',
  'On Track': 'blue',
  'At Risk': 'orange',
  Overdue: 'red',
  Completed: 'green',
};

export function projectStatusTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export function milestoneStatusTone(status) {
  return MILESTONE_TONES[status] || 'gray';
}

/* ------------------------------------------------------------------ dates */
export function localIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const TODAY = localIso();

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localIso(date);
}

export function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return 0;
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.round((to - from) / 86400000);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* --------------------------------------------------------------- projects */
export const PROJECTS = [
  {
    id: 'PRJ-2026-041',
    name: 'Conveyor Drive Assembly',
    reference: 'GOD-CDA-26-07',
    customer: 'Godrej Material Handling',
    product: 'Belt Conveyor Drive Unit',
    description:
      'Design of a 45 kW belt conveyor drive assembly including gearbox housing, drive shaft, bearing arrangement and motor mount for a 120 t/h material handling line.',
    domain: 'Machine Design',
    scope:
      'Complete mechanical design from concept to manufacturing drawings, including shaft strength and bearing life calculations.',
    type: 'New Design',
    deliverables: ['3D CAD model', 'GA drawing', 'Manufacturing drawings', 'Engineering BOM'],
    priority: 'High',
    manager: 'R. Kulkarni',
    engineers: ['D. Rao', 'V. Sharma'],
    reviewer: 'N. Joshi',
    members: ['A. Iyer'],
    start: '2026-08-12',
    target: '2026-12-20',
    progress: 72,
    status: 'Design In Progress',
    delayed: false,
    archived: false,
    attachments: 6,
  },
  {
    id: 'PRJ-2026-038',
    name: 'Frame Support Structure',
    reference: 'TAT-FSS-26-03',
    customer: 'Tata Projects',
    product: 'Structural Frame & Supports',
    description:
      'Fabricated support frame for a package boiler feed system, designed for seismic zone III loading and site bolted assembly.',
    domain: 'Fabrication Design',
    scope: 'Structural layout, weld details, gusset plates and foundation interface drawings.',
    type: 'New Design',
    deliverables: ['GA drawing', 'Manufacturing drawings', 'FEA / validation report', 'Engineering BOM'],
    priority: 'Medium',
    manager: 'A. Iyer',
    engineers: ['A. Iyer', 'K. Pillai'],
    reviewer: 'R. Kulkarni',
    members: ['N. Joshi'],
    start: '2026-07-28',
    target: '2026-12-05',
    progress: 58,
    status: 'Under Review',
    delayed: false,
    archived: false,
    attachments: 4,
  },
  {
    id: 'PRJ-2026-036',
    name: 'Control Panel Housing',
    reference: 'SIE-CPH-26-11',
    customer: 'Siemens Energy',
    product: 'Control Panel Enclosure',
    description:
      'IP54 sheet metal enclosure for a motor control centre, including door hinges, cable entries and powder-coated finish.',
    domain: 'Sheet Metal Design',
    scope: 'Enclosure design, flat patterns, bend tables and DFM review with the fabricator.',
    type: 'Variant / Derivative',
    deliverables: ['3D CAD model', 'Manufacturing drawings', 'Inspection specification'],
    priority: 'High',
    manager: 'S. Menon',
    engineers: ['S. Menon', 'V. Sharma'],
    reviewer: 'N. Joshi',
    members: ['D. Rao'],
    start: '2026-06-15',
    target: '2026-11-28',
    progress: 44,
    status: 'Design In Progress',
    delayed: true,
    archived: false,
    attachments: 5,
  },
  {
    id: 'PRJ-2026-033',
    name: 'Utility Skid Piping',
    reference: 'THM-USP-26-05',
    customer: 'Thermax',
    product: 'Utility Piping Skid',
    description:
      'Piping skid for cooling water and compressed air utilities with isometrics, support details and valve schedule.',
    domain: 'Piping Design',
    scope: 'Line sizing, layout, isometrics, support selection and material take-off.',
    type: 'New Design',
    deliverables: ['GA drawing', 'Manufacturing drawings', 'Engineering BOM', 'Inspection specification'],
    priority: 'Medium',
    manager: 'P. Deshmukh',
    engineers: ['P. Deshmukh', 'K. Pillai'],
    reviewer: 'A. Iyer',
    members: ['R. Kulkarni'],
    start: '2026-05-20',
    target: '2026-12-30',
    progress: 81,
    status: 'Transferred',
    delayed: false,
    archived: false,
    attachments: 8,
  },
  {
    id: 'PRJ-2026-031',
    name: 'Drive Shaft Assembly',
    reference: 'KIR-DSA-26-02',
    customer: 'Kirloskar Oil Engines',
    product: 'Drive Shaft Assembly',
    description:
      'Drive shaft with keyed coupling, tolerance stack-up and heat treatment specification for a diesel genset application.',
    domain: 'Machine Design',
    scope: 'Shaft sizing, tolerance analysis, material and heat treatment specification.',
    type: 'Variant / Derivative',
    deliverables: ['3D CAD model', 'Manufacturing drawings', 'Design calculation report'],
    priority: 'Low',
    manager: 'D. Rao',
    engineers: ['D. Rao'],
    reviewer: 'R. Kulkarni',
    members: ['V. Sharma'],
    start: '2026-04-10',
    target: '2026-10-30',
    progress: 100,
    status: 'Completed',
    delayed: false,
    archived: false,
    attachments: 3,
  },
  {
    id: 'PRJ-2026-029',
    name: 'Motor Mount Bracket',
    reference: 'CUM-MMB-26-04',
    customer: 'Cummins India',
    product: 'Motor Mount Bracket',
    description:
      'Cast and machined motor mount bracket with vibration isolation pads for a 90 kW drive package.',
    domain: 'Machine Design',
    scope: 'Bracket design, natural frequency check, machining and inspection requirements.',
    type: 'New Design',
    deliverables: ['3D CAD model', 'FEA / validation report', 'Manufacturing drawings', 'Engineering BOM'],
    priority: 'High',
    manager: 'R. Kulkarni',
    engineers: ['R. Kulkarni', 'N. Joshi'],
    reviewer: 'A. Iyer',
    members: ['S. Menon'],
    start: '2026-09-22',
    target: '2026-12-15',
    progress: 36,
    status: 'Under Planning',
    delayed: true,
    archived: false,
    attachments: 2,
  },
  {
    id: 'PRJ-2026-026',
    name: 'Gearbox Lubrication Unit',
    reference: 'ELE-GLU-26-09',
    customer: 'Elecon Engineering',
    product: 'Gearbox Lubrication Unit',
    description:
      'Lubrication unit with oil pump, reservoir and instrumentation for a heavy-duty helical gearbox.',
    domain: 'Equipment Design',
    scope: 'Unit layout, pump selection, piping and instrumentation interface, assembly drawing.',
    type: 'New Design',
    deliverables: ['3D CAD model', 'GA drawing', 'Assembly drawing', 'Operation & maintenance manual'],
    priority: 'Critical',
    manager: 'A. Iyer',
    engineers: ['A. Iyer', 'P. Deshmukh'],
    reviewer: 'N. Joshi',
    members: ['D. Rao'],
    start: '2026-06-02',
    target: '2026-11-20',
    progress: 92,
    status: 'Approval Pending',
    delayed: false,
    archived: false,
    attachments: 7,
  },
  {
    id: 'PRJ-2026-024',
    name: 'Hydraulic Press Frame',
    reference: 'LNT-HPF-26-01',
    customer: 'Larsen & Toubro',
    product: 'Hydraulic Press Frame',
    description:
      'Welded press frame for a 200 t hydraulic press, designed to IS 800 and checked for fatigue at the weld toes.',
    domain: 'Fabrication Design',
    scope: 'Frame design, weld detailing, fatigue check and manufacturing drawing package.',
    type: 'New Design',
    deliverables: ['GA drawing', 'Manufacturing drawings', 'FEA / validation report', 'Inspection specification'],
    priority: 'High',
    manager: 'N. Joshi',
    engineers: ['N. Joshi', 'K. Pillai'],
    reviewer: 'R. Kulkarni',
    members: ['A. Iyer'],
    start: '2026-03-18',
    target: '2026-09-30',
    progress: 100,
    status: 'Completed',
    delayed: false,
    archived: false,
    attachments: 9,
  },
  {
    id: 'PRJ-2026-022',
    name: 'Sheet Metal Enclosure',
    reference: 'SCH-SME-26-06',
    customer: 'Schneider Electric',
    product: 'Sheet Metal Enclosure',
    description:
      'Modular enclosure for a wall-mounted drive, with ventilation louvres, DIN rail mounting and IP42 rating.',
    domain: 'Sheet Metal Design',
    scope: 'Enclosure design, CNC cut-out programs and bend documentation for production.',
    type: 'Variant / Derivative',
    deliverables: ['3D CAD model', 'Manufacturing drawings', 'Engineering BOM'],
    priority: 'Medium',
    manager: 'S. Menon',
    engineers: ['S. Menon', 'V. Sharma'],
    reviewer: 'N. Joshi',
    members: ['K. Pillai'],
    start: '2026-05-05',
    target: '2026-12-08',
    progress: 63,
    status: 'Manufacturing In Progress',
    delayed: false,
    archived: false,
    attachments: 5,
  },
  {
    id: 'PRJ-2026-019',
    name: 'Piping Isometric Package',
    reference: 'PRJ-PIP-26-02',
    customer: 'Praj Industries',
    product: 'Piping Isometric Package',
    description:
      'Isometric package for a fermentation utility block, including support details and BOM reconciliation.',
    domain: 'Piping Design',
    scope: 'Isometric production, support selection, material take-off and BOM reconciliation.',
    type: 'New Design',
    deliverables: ['GA drawing', 'Manufacturing drawings', 'Engineering BOM'],
    priority: 'Low',
    manager: 'P. Deshmukh',
    engineers: ['P. Deshmukh'],
    reviewer: 'A. Iyer',
    members: ['R. Kulkarni'],
    start: '2026-02-24',
    target: '2026-08-28',
    progress: 100,
    status: 'Completed',
    delayed: false,
    archived: false,
    attachments: 4,
  },
  {
    id: 'PRJ-2026-017',
    name: 'Assembly Fixture Design',
    reference: 'BAJ-AFD-26-08',
    customer: 'Bajaj Auto',
    product: 'Assembly Fixture',
    description:
      'Welding and assembly fixture for a two-wheeler sub-frame, with locating pins and pneumatic clamps.',
    domain: 'Machine Design',
    scope: 'Fixture concept, locating scheme, clamp selection and tolerance analysis.',
    type: 'Prototype Development',
    deliverables: ['3D CAD model', 'GA drawing', 'Design calculation report'],
    priority: 'Low',
    manager: 'D. Rao',
    engineers: ['D. Rao', 'K. Pillai'],
    reviewer: 'A. Iyer',
    members: ['S. Menon'],
    start: '2026-10-06',
    target: '2027-01-20',
    progress: 12,
    status: 'On Hold',
    delayed: false,
    archived: false,
    attachments: 2,
  },
  {
    id: 'PRJ-2026-014',
    name: 'Cooling Tower Fan Hub',
    reference: 'THM-CTF-26-12',
    customer: 'Thermax',
    product: 'Cooling Tower Fan Hub',
    description:
      'Fan hub and blade mounting assembly for an induced draft cooling tower, checked for fatigue and bolted joint integrity.',
    domain: 'Equipment Design',
    scope: 'Hub design, bolted joint analysis, fatigue estimate and assembly documentation.',
    type: 'New Design',
    deliverables: ['3D CAD model', 'FEA / validation report', 'Manufacturing drawings'],
    priority: 'Medium',
    manager: 'N. Joshi',
    engineers: ['N. Joshi', 'A. Iyer'],
    reviewer: 'R. Kulkarni',
    members: ['P. Deshmukh'],
    start: '2026-09-01',
    target: '2026-12-22',
    progress: 48,
    status: 'Under Planning',
    delayed: false,
    archived: false,
    attachments: 6,
  },
];

/* ------------------------------------------------------------ team roster */
export const TEAM_MEMBERS = [
  {
    id: 'TM-101',
    name: 'R. Kulkarni',
    role: 'Project Manager',
    discipline: 'Mechanical',
    projectId: 'PRJ-2026-041',
    responsibilities: 'Project planning, customer interface, design sign-off',
    allocation: 60,
  },
  {
    id: 'TM-102',
    name: 'D. Rao',
    role: 'Design Engineer',
    discipline: 'Mechanical',
    projectId: 'PRJ-2026-041',
    responsibilities: 'Gearbox housing, shaft and bearing design',
    allocation: 80,
  },
  {
    id: 'TM-103',
    name: 'S. Menon',
    role: 'Design Engineer',
    discipline: 'Sheet Metal',
    projectId: 'PRJ-2026-036',
    responsibilities: 'Enclosure design, flat pattern and DFM review',
    allocation: 70,
  },
  {
    id: 'TM-104',
    name: 'A. Iyer',
    role: 'Project Manager',
    discipline: 'Analysis',
    projectId: 'PRJ-2026-038',
    responsibilities: 'Frame project delivery, FEA review, client coordination',
    allocation: 50,
  },
  {
    id: 'TM-105',
    name: 'N. Joshi',
    role: 'Technical Reviewer',
    discipline: 'Analysis',
    projectId: 'PRJ-2026-038',
    responsibilities: 'Weld fatigue check and drawing verification',
    allocation: 30,
  },
  {
    id: 'TM-106',
    name: 'P. Deshmukh',
    role: 'Design Engineer',
    discipline: 'Piping',
    projectId: 'PRJ-2026-033',
    responsibilities: 'Line sizing, isometrics and support selection',
    allocation: 90,
  },
  {
    id: 'TM-107',
    name: 'R. Kulkarni',
    role: 'Project Manager',
    discipline: 'Mechanical',
    projectId: 'PRJ-2026-029',
    responsibilities: 'Bracket package planning and customer approvals',
    allocation: 40,
  },
  {
    id: 'TM-108',
    name: 'S. Menon',
    role: 'Technical Reviewer',
    discipline: 'Sheet Metal',
    projectId: 'PRJ-2026-022',
    responsibilities: 'Production drawing review and CNC program check',
    allocation: 35,
  },
  {
    id: 'TM-109',
    name: 'A. Iyer',
    role: 'Design Engineer',
    discipline: 'Analysis',
    projectId: 'PRJ-2026-026',
    responsibilities: 'Pump selection, bolted joint analysis and assembly detailing',
    allocation: 75,
  },
  {
    id: 'TM-110',
    name: 'N. Joshi',
    role: 'Project Manager',
    discipline: 'Mechanical',
    projectId: 'PRJ-2026-014',
    responsibilities: 'Fan hub delivery, fatigue study and manufacturing liaison',
    allocation: 45,
  },
  {
    id: 'TM-111',
    name: 'D. Rao',
    role: 'Team Member',
    discipline: 'Drafting',
    projectId: 'PRJ-2026-017',
    responsibilities: 'Fixture locating scheme and clamp layout',
    allocation: 25,
  },
  {
    id: 'TM-112',
    name: 'V. Sharma',
    role: 'Team Member',
    discipline: 'BOM',
    projectId: 'PRJ-2026-031',
    responsibilities: 'BOM release and purchased component reconciliation',
    allocation: 20,
  },
];

/* -------------------------------------------------------------- milestones */
export const MILESTONES = [
  { id: 'MS-4101', name: 'Kick-off & requirements freeze', projectId: 'PRJ-2026-041', owner: 'R. Kulkarni', planned: '2026-08-20', actual: '2026-08-21', progress: 100, status: 'Completed' },
  { id: 'MS-4102', name: 'Concept layout approval', projectId: 'PRJ-2026-041', owner: 'D. Rao', planned: '2026-09-18', actual: '2026-09-22', progress: 100, status: 'Completed' },
  { id: 'MS-4103', name: '3D model release', projectId: 'PRJ-2026-041', owner: 'D. Rao', planned: '2026-11-15', actual: '', progress: 70, status: 'On Track' },
  { id: 'MS-4104', name: 'GA drawing release', projectId: 'PRJ-2026-041', owner: 'V. Sharma', planned: '2026-12-02', actual: '', progress: 20, status: 'Planned' },
  { id: 'MS-4201', name: 'Structural analysis complete', projectId: 'PRJ-2026-038', owner: 'A. Iyer', planned: '2026-10-10', actual: '2026-10-14', progress: 100, status: 'Completed' },
  { id: 'MS-4202', name: 'Weld detail drawings', projectId: 'PRJ-2026-038', owner: 'K. Pillai', planned: '2026-11-12', actual: '', progress: 65, status: 'Overdue' },
  { id: 'MS-4203', name: 'Client design review', projectId: 'PRJ-2026-038', owner: 'A. Iyer', planned: '2026-11-28', actual: '', progress: 30, status: 'At Risk' },
  { id: 'MS-4301', name: 'Flat pattern approval', projectId: 'PRJ-2026-036', owner: 'S. Menon', planned: '2026-10-30', actual: '', progress: 55, status: 'Overdue' },
  { id: 'MS-4302', name: 'DFM review with fabricator', projectId: 'PRJ-2026-036', owner: 'S. Menon', planned: '2026-11-24', actual: '', progress: 25, status: 'At Risk' },
  { id: 'MS-4401', name: 'Isometric package handover', projectId: 'PRJ-2026-033', owner: 'P. Deshmukh', planned: '2026-11-05', actual: '2026-11-07', progress: 100, status: 'Completed' },
  { id: 'MS-4402', name: 'Production acknowledgement', projectId: 'PRJ-2026-033', owner: 'P. Deshmukh', planned: '2026-11-30', actual: '', progress: 60, status: 'On Track' },
  { id: 'MS-4501', name: 'Shaft drawing release', projectId: 'PRJ-2026-031', owner: 'D. Rao', planned: '2026-09-12', actual: '2026-09-11', progress: 100, status: 'Completed' },
  { id: 'MS-4601', name: 'Bracket concept freeze', projectId: 'PRJ-2026-029', owner: 'R. Kulkarni', planned: '2026-10-20', actual: '', progress: 40, status: 'Overdue' },
  { id: 'MS-4602', name: 'FEA validation report', projectId: 'PRJ-2026-029', owner: 'N. Joshi', planned: '2026-12-02', actual: '', progress: 15, status: 'Planned' },
  { id: 'MS-4701', name: 'Approval package submission', projectId: 'PRJ-2026-026', owner: 'A. Iyer', planned: '2026-11-10', actual: '2026-11-10', progress: 100, status: 'Completed' },
  { id: 'MS-4702', name: 'Manufacturing handover', projectId: 'PRJ-2026-026', owner: 'A. Iyer', planned: '2026-12-05', actual: '', progress: 35, status: 'On Track' },
  { id: 'MS-4801', name: 'Press frame package closed', projectId: 'PRJ-2026-024', owner: 'N. Joshi', planned: '2026-09-28', actual: '2026-09-30', progress: 100, status: 'Completed' },
  { id: 'MS-4901', name: 'Production drawings released', projectId: 'PRJ-2026-022', owner: 'S. Menon', planned: '2026-11-06', actual: '2026-11-08', progress: 100, status: 'Completed' },
  { id: 'MS-5001', name: 'Fixture concept review', projectId: 'PRJ-2026-017', owner: 'D. Rao', planned: '2026-11-22', actual: '', progress: 10, status: 'At Risk' },
  { id: 'MS-5101', name: 'Fatigue study complete', projectId: 'PRJ-2026-014', owner: 'N. Joshi', planned: '2026-11-25', actual: '', progress: 45, status: 'On Track' },
  { id: 'MS-5102', name: 'Manufacturing drawings', projectId: 'PRJ-2026-014', owner: 'K. Pillai', planned: '2026-12-10', actual: '', progress: 20, status: 'Planned' },
];

/* ------------------------------------------------------------- generators */
function hashString(value) {
  let hash = 0;
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash * 31 + String(value).charCodeAt(index)) >>> 0;
  }
  return hash;
}

const REQUIREMENT_TEMPLATES = {
  'Machine Design': [
    ['Functional duty and throughput requirement', 'Functional'],
    ['Load cases, safety factors and duty class', 'Structural'],
    ['Interface dimensions with mating equipment', 'Interface'],
    ['Lubrication and maintenance access', 'Maintainability'],
    ['Wear part material and surface treatment', 'Material'],
  ],
  'Sheet Metal Design': [
    ['Sheet thickness and material grade', 'Material'],
    ['Bend radius, relief and flat pattern rules', 'Manufacturability'],
    ['Surface finish and coating specification', 'Finish'],
    ['Enclosure fit-up and IP rating', 'Functional'],
    ['Cable entry and cut-out layout', 'Interface'],
  ],
  'Piping Design': [
    ['Line sizing and allowable pressure drop', 'Functional'],
    ['P&ID compliance and valve schedule', 'Compliance'],
    ['Support and expansion loop requirement', 'Structural'],
    ['Material and corrosion allowance', 'Material'],
    ['Isometric and material take-off deliverables', 'Deliverables'],
  ],
  'Fabrication Design': [
    ['Weld symbols and welding procedure', 'Manufacturability'],
    ['Fit-up and dimensional tolerances', 'Quality'],
    ['Surface preparation and painting system', 'Finish'],
    ['NDT and inspection requirements', 'Quality'],
    ['Transport and lifting point design', 'Logistics'],
  ],
  'Equipment Design': [
    ['Applicable design code and compliance', 'Compliance'],
    ['Nozzle / port orientation and access', 'Interface'],
    ['Thermal and pressure design margins', 'Structural'],
    ['Guard and safety requirement', 'Safety'],
    ['Nameplate and documentation set', 'Deliverables'],
  ],
};

const DEFAULT_REQUIREMENTS = [
  ['Performance and duty requirement', 'Functional'],
  ['Interface and envelope constraints', 'Interface'],
  ['Material and finish specification', 'Material'],
  ['Manufacturability and tolerance rules', 'Manufacturability'],
  ['Documentation and approval deliverables', 'Deliverables'],
];

const TASK_TEMPLATES = [
  ['Concept layout and scheme selection', 'Mechanical', 0],
  ['Detail part modelling and assembly', 'Mechanical', 1],
  ['Strength / FEA verification', 'Analysis', 2],
  ['Manufacturing drawing preparation', 'Drafting', 3],
  ['Engineering BOM release', 'BOM', 4],
];

const DOCUMENT_TEMPLATES = [
  ['GA drawing', 'Drawing', 'C', 2.4],
  ['Assembly drawing', 'Drawing', 'B', 1.8],
  ['Detail manufacturing drawing set', 'Drawing', 'A', 4.6],
  ['Engineering BOM', 'BOM', 'C', 0.6],
  ['Design calculation report', 'Report', 'B', 1.2],
  ['Inspection specification', 'Quality', 'A', 0.4],
];

const ACTIVITY_TEMPLATES = [
  ['Project created', 'Project registered in the design office'],
  ['Requirements captured', 'Customer specification reviewed and frozen'],
  ['Concept layout released', 'Internal concept review completed'],
  ['Drawing submitted for review', 'GA drawing issued to the review workflow'],
  ['Review decision recorded', 'Review comments closed out'],
  ['BOM transferred', 'Engineering BOM handed to purchase'],
];

export function buildProjectRequirements(project) {
  const templates = REQUIREMENT_TEMPLATES[project.domain] || DEFAULT_REQUIREMENTS;
  const seed = hashString(project.id);
  const statuses = ['Approved', 'In Review', 'In Design', 'Pending Review'];

  return templates.map(([title, category], index) => ({
    id: `REQ-${String(seed % 900 + index + 100)}`,
    title,
    category,
    priority: index === 0 ? 'Critical' : ['High', 'Medium', 'Low'][index % 3],
    status: project.progress === 100 ? 'Approved' : statuses[(seed + index) % statuses.length],
    owner: project.engineers[index % project.engineers.length] || project.manager,
  }));
}

export function buildProjectTasks(project) {
  const seed = hashString(project.id);
  return TASK_TEMPLATES.map(([title, discipline, offset], index) => ({
    id: `TSK-${String(seed % 800 + index + 200)}`,
    title,
    discipline,
    engineer: (project.engineers[index % project.engineers.length] || project.manager),
    due: addDays(project.target, offset * 7 - 14),
    status:
      project.progress === 100
        ? 'Approved'
        : ['In Design', 'In Review', 'Approved', 'Delayed'][(seed + index) % 4],
  }));
}

export function buildProjectDocuments(project) {
  const seed = hashString(project.id);
  return DOCUMENT_TEMPLATES.slice(0, 4 + (seed % 3)).map(([name, type, revision, size], index) => ({
    id: `DOC-${String(seed % 700 + index + 300)}`,
    name,
    type,
    revision,
    date: addDays(project.start, 20 + index * 11),
    size,
    status: index < 2 ? 'Released' : ['In Review', 'Draft', 'Approved'][(seed + index) % 3],
  }));
}

export function buildProjectActivity(project) {
  const recorded = (project.history || []).map((entry) => ({
    id: entry.id,
    label: entry.action,
    detail: entry.detail,
    type: 'project',
    time: `${String(entry.at || '').replace('T', ' ')} · ${entry.by || 'System'}`,
  }));
  if (recorded.length) return recorded.reverse();

  const seed = hashString(project.id);
  return ACTIVITY_TEMPLATES.map(([label, detail], index) => ({
    id: `ACT-${seed % 500 + index}`,
    label,
    detail,
    type: ['project', 'task', 'drawing', 'review', 'review', 'handover'][index],
    time: `${index * 3 + 1}d ago`,
  }));
}

/* ---------------------------------------------------------------- helpers */
export function nextProjectId(projects) {
  const year = new Date().getFullYear();
  const highest = projects.reduce((max, project) => {
    const match = /\/(\d+)$/.exec(project.id);
    const numeric = match ? Number(match[1]) : Number(project.id.split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `PRJ-${year}-${String(highest + 1).padStart(3, '0')}`;
}

export function lifecycleIndex(status) {
  return PROJECT_STATUSES.indexOf(status);
}

export function projectIsActive(project) {
  return (
    !['Completed', 'Cancelled', 'On Hold', 'Draft'].includes(project.status) && !project.archived
  );
}

export function projectIsDelayed(project) {
  return Boolean(project.delayed) && project.status !== 'Completed' && project.status !== 'Cancelled';
}

export function milestoneIsOverdue(milestone) {
  return !milestone.actual && milestone.planned < TODAY && milestone.status !== 'Completed';
}
