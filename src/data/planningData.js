/**
 * Local mock data for Module 03 — Design Planning.
 *
 * Requirements, design tasks and discipline allocations all reference the same
 * Project IDs as Module 02 (`PRJ-2026-0xx`), so every screen agrees with the
 * project register. Frontend only — nothing leaves the browser.
 */
import { PROJECTS, addDays, daysBetween, formatDate, TODAY } from './projectData';
import { DESIGNS } from './mechanicalData';

export { TODAY, addDays, daysBetween, formatDate };

/* ------------------------------------------------------------- vocabulary */
export const DESIGN_DISCIPLINES = [
  'Machine Design',
  'Product Design',
  'Fabrication',
  'Sheet Metal',
  'Piping',
  'Equipment',
  'Automotive',
  'Analysis',
  'Manufacturing Engineering',
];

export const TASK_STATUSES = [
  'Not Started',
  'Assigned',
  'In Progress',
  'Submitted',
  'Under Review',
  'Changes Requested',
  'On Hold',
  'Completed',
  'Blocked',
  'Cancelled',
];

export const TASK_STATUS_TONES = {
  'Not Started': 'gray',
  Assigned: 'blue',
  'In Progress': 'blue',
  Submitted: 'purple',
  'Under Review': 'purple',
  'Changes Requested': 'orange',
  'On Hold': 'orange',
  Completed: 'green',
  Blocked: 'red',
  Cancelled: 'gray',
};

export const REQUIREMENT_CATEGORIES = [
  'Functional',
  'Performance',
  'Interface',
  'Material',
  'Manufacturability',
  'Compliance',
  'Quality',
  'Safety',
  'Maintainability',
  'Deliverables',
];

export const REQUIREMENT_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const REQUIREMENT_STATUSES = [
  'Draft',
  'In Review',
  'Approved',
  'Changes Requested',
  'Closed',
];

export const REQUIREMENT_STATUS_TONES = {
  Draft: 'gray',
  'In Review': 'purple',
  Approved: 'green',
  'Changes Requested': 'red',
  Closed: 'gray',
};

export const PRIORITY_TONES = {
  Critical: 'red',
  High: 'orange',
  Medium: 'blue',
  Low: 'gray',
};

export const SCOPE_SECTIONS = [
  { key: 'included', label: 'Included Scope' },
  { key: 'excluded', label: 'Excluded Scope' },
  { key: 'assumptions', label: 'Project Assumptions' },
  { key: 'constraints', label: 'Engineering Constraints' },
  { key: 'deliverables', label: 'Expected Deliverables' },
  { key: 'dependencies', label: 'Technical Dependencies' },
];

export function taskStatusTone(status) {
  return TASK_STATUS_TONES[status] || 'gray';
}

export function requirementStatusTone(status) {
  return REQUIREMENT_STATUS_TONES[status] || 'gray';
}

export function priorityTone(priority) {
  return PRIORITY_TONES[priority] || 'gray';
}

/* ---------------------------------------------------------------- helpers */
function hashString(value) {
  let hash = 0;
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash * 31 + String(value).charCodeAt(index)) >>> 0;
  }
  return hash;
}

function progressFor(status) {
  const table = {
    'Not Started': 0,
    Assigned: 0,
    'In Progress': 45,
    Submitted: 85,
    'Under Review': 80,
    'Changes Requested': 65,
    Completed: 100,
    Blocked: 25,
  };
  return table[status] ?? 0;
}

/* ----------------------------------------------------------- requirements */
const REQUIREMENT_LIBRARY = [
  {
    title: 'Rated throughput and duty cycle',
    category: 'Functional',
    description:
      'The equipment must sustain the rated throughput over three-shift operation without derating or operator intervention.',
    specification:
      'Rated capacity 120 t/h at 1.6 m/s belt speed; duty class M6 (ISO 5048); design life 20 years at 6,000 h/year.',
    acceptance:
      'Duty calculation sheet reviewed and signed off; no component loaded above 80% of its rated capacity.',
  },
  {
    title: 'Drive efficiency and power budget',
    category: 'Performance',
    description:
      'The drive train must meet the allocated power budget at full load across the working speed range.',
    specification:
      'Overall drive efficiency ≥ 94% at rated load; installed power ≤ 45 kW; starting torque margin 1.8 × full load.',
    acceptance: 'Efficiency calculation and motor selection sheet approved by the technical reviewer.',
  },
  {
    title: 'Mating interface envelope and bolt pattern',
    category: 'Interface',
    description:
      'The assembly must bolt onto the existing foundation and mate with adjacent equipment without site modification.',
    specification:
      'Interface per customer GA drawing Rev B; 8 × M24 grade 8.8 on a 480 × 320 mm pattern; datum A-B-C as marked.',
    acceptance: 'Dimensional check against the customer drawing; zero interference in the assembly model.',
  },
  {
    title: 'Structural material grade and traceability',
    category: 'Material',
    description:
      'All primary structure must use weldable structural steel with full mill traceability for every heat number.',
    specification:
      'IS 2062 E250 BR plates, IS 4923 hollow sections; mill test certificates required for all heat numbers.',
    acceptance: 'MTC file complete and material recorded in the engineering BOM with heat numbers.',
  },
  {
    title: 'Fabrication and weld procedure compliance',
    category: 'Manufacturability',
    description:
      'The design must be fabricable within the approved vendor process capability without special tooling.',
    specification:
      'Minimum 6 mm fillet welds, full penetration at lifting points, weld symbols to IS 813, weld map required.',
    acceptance: 'DFM review closed with the fabricator; weld map issued with the drawing package.',
  },
  {
    title: 'Applicable design codes and standards',
    category: 'Compliance',
    description:
      'The design must comply with the codes named by the customer and the applicable statutory requirements.',
    specification:
      'IS 800:2007 for steel design, IS 3177 for hoisting duty, factory inspectorate approval for guards.',
    acceptance: 'Code compliance matrix signed by the technical reviewer and attached to the release package.',
  },
  {
    title: 'Inspection and NDT coverage',
    category: 'Quality',
    description:
      'Critical welds and machined surfaces must be inspectable at the stated coverage without rework.',
    specification:
      '100% dye penetrant on lifting lugs, 10% radiography on butt welds, full dimensional report on first article.',
    acceptance: 'Inspection plan approved; NDT reports archived with the released drawing set.',
  },
  {
    title: 'Guard and access safety requirement',
    category: 'Safety',
    description:
      'All rotating, hot and pinch points must be guarded, and service access must be safe for two technicians.',
    specification:
      'Fixed guards to IS 14271 with tool-operated fasteners; minimum 800 mm service access; emergency stop reachable.',
    acceptance: 'Safety review checklist signed off and guard drawings released with the assembly.',
  },
  {
    title: 'Service access and wear part replacement',
    category: 'Maintainability',
    description:
      'Wear parts must be replaceable without removing the drive assembly or breaking pipe connections.',
    specification:
      'Bearing and seal replacement within 4 hours by two technicians; lifting eye rated for the heaviest sub-assembly.',
    acceptance: 'Maintenance procedure validated during the assembly design review.',
  },
  {
    title: 'Documentation and drawing deliverable set',
    category: 'Deliverables',
    description:
      'The customer requires a complete as-designed documentation package at handover.',
    specification:
      '3D native model, GA drawing, manufacturing drawing set, engineering BOM, calculation report, O&M manual.',
    acceptance: 'Transmittal acknowledged by the customer for every document in the package.',
  },
  {
    title: 'Thermal margin at site ambient',
    category: 'Performance',
    description:
      'Continuous operation must stay inside temperature limits at the maximum site ambient condition.',
    specification:
      'Site ambient 45 °C; lubricant sump ≤ 75 °C; thermal rating margin ≥ 15% above calculated heat load.',
    acceptance: 'Thermal rating calculation reviewed and accepted by the customer’s engineer.',
  },
  {
    title: 'Utility and instrumentation connections',
    category: 'Interface',
    description:
      'Utility tie-in points must match the plant interface schedule without adapters or field fabrication.',
    specification:
      'Cooling water 2 in NB at 4 bar; instrument air 1/2 in NB at 6 bar; cable entries from the bottom.',
    acceptance: 'Interface schedule cross-checked against the latest plant drawing revision.',
  },
];

const REQUIREMENT_PROJECTS = PROJECTS.slice(0, 9);

export const REQUIREMENTS = REQUIREMENT_PROJECTS.flatMap((project, projectIndex) =>
  [0, 1, 2].map((slot) => {
    const template = REQUIREMENT_LIBRARY[(projectIndex * 3 + slot) % REQUIREMENT_LIBRARY.length];
    const seed = hashString(`${project.id}-${slot}`);
    const statusPool =
      project.progress === 100
        ? ['Approved', 'Closed', 'Approved']
        : project.progress > 70
          ? ['Approved', 'In Review', 'Changes Requested']
          : project.progress > 40
            ? ['In Review', 'Approved', 'Draft']
            : ['Draft', 'In Review', 'Draft'];
    const engineer =
      project.engineers[(projectIndex + slot) % project.engineers.length] || project.manager;

    return {
      id: `REQ-${String(1001 + projectIndex * 3 + slot)}`,
      projectId: project.id,
      title: template.title,
      category: template.category,
      description: template.description,
      specification: template.specification,
      acceptance: template.acceptance,
      priority:
        slot === 0 && ['Critical', 'High'].includes(project.priority)
          ? 'Critical'
          : REQUIREMENT_PRIORITIES[(seed + slot) % REQUIREMENT_PRIORITIES.length],
      engineer,
      due: addDays(project.target, -(12 + slot * 9)),
      status: statusPool[slot % statusPool.length],
    };
  }),
);

/* --------------------------------------------------------------- tasks */
const TASK_LIBRARY = {
  'Machine Design': [
    ['Concept layout and scheme selection', 12, 48],
    ['Detail part modelling and assembly', 18, 64],
    ['Shaft, bearing and fastener sizing', 10, 36],
    ['Housing and mount detail drawings', 14, 44],
  ],
  'Product Design': [
    ['Form and fit study for the enclosure family', 9, 32],
    ['Material and finish selection matrix', 7, 24],
    ['Part detailing for tooling release', 12, 40],
  ],
  Fabrication: [
    ['Structural frame detailing', 16, 56],
    ['Weld detail and fit-up drawings', 12, 42],
    ['Gusset, base plate and lifting lug design', 9, 30],
  ],
  'Sheet Metal': [
    ['Enclosure layout and cut-out schedule', 11, 38],
    ['Flat pattern and bend documentation', 9, 30],
    ['Hinge, latch and gasket detailing', 7, 22],
  ],
  Piping: [
    ['Line routing and isometric generation', 15, 50],
    ['Support selection and detailing', 10, 34],
    ['Valve schedule and material take-off', 8, 28],
  ],
  Equipment: [
    ['Equipment arrangement layout', 13, 44],
    ['Nozzle and port orientation detailing', 10, 34],
    ['Skid assembly and transport drawing', 12, 40],
  ],
  Automotive: [
    ['Mounting bracket design study', 10, 34],
    ['Clearance and packaging study', 8, 26],
    ['Durability load case definition', 6, 22],
  ],
  Analysis: [
    ['FEA mesh and boundary condition setup', 8, 30],
    ['Stress and deflection study', 12, 38],
    ['Fatigue and bolted joint check', 9, 30],
  ],
  'Manufacturing Engineering': [
    ['DFM review with the fabricator', 6, 20],
    ['Process routing and sequence plan', 7, 24],
    ['Inspection and gauging plan', 5, 18],
  ],
};

const DISCIPLINE_BY_DOMAIN = {
  'Machine Design': ['Machine Design', 'Analysis', 'Manufacturing Engineering', 'Product Design'],
  'Fabrication Design': ['Fabrication', 'Analysis', 'Manufacturing Engineering', 'Machine Design'],
  'Sheet Metal Design': ['Sheet Metal', 'Manufacturing Engineering', 'Product Design', 'Analysis'],
  'Piping Design': ['Piping', 'Equipment', 'Manufacturing Engineering', 'Analysis'],
  'Equipment Design': ['Equipment', 'Piping', 'Analysis', 'Manufacturing Engineering'],
  'Automotive Components': ['Automotive', 'Analysis', 'Product Design', 'Manufacturing Engineering'],
};

const ENGINEER_BY_DISCIPLINE = {
  'Machine Design': ['D. Rao', 'V. Sharma'],
  'Product Design': ['A. Iyer', 'V. Sharma'],
  Fabrication: ['K. Pillai', 'R. Kulkarni'],
  'Sheet Metal': ['S. Menon', 'V. Sharma'],
  Piping: ['P. Deshmukh', 'K. Pillai'],
  Equipment: ['A. Iyer', 'K. Pillai'],
  Automotive: ['R. Kulkarni', 'D. Rao'],
  Analysis: ['N. Joshi', 'A. Iyer'],
  'Manufacturing Engineering': ['S. Menon', 'K. Pillai'],
};

const TASK_STATUS_CYCLE = [
  'Completed',
  'In Progress',
  'Under Review',
  'Blocked',
  'Assigned',
  'Submitted',
  'Changes Requested',
  'Not Started',
  'In Progress',
  'Under Review',
  'Assigned',
  'Completed',
];

const TASK_PROJECTS = PROJECTS.slice(0, 8);

export const DESIGN_TASKS = TASK_PROJECTS.flatMap((project, projectIndex) => {
  const disciplines = DISCIPLINE_BY_DOMAIN[project.domain] || DESIGN_DISCIPLINES;
  const seed = hashString(project.id);

  return disciplines.map((discipline, index) => {
    const linkedDesign = DESIGNS.find((design) => design.projectId === project.id);
    const library = TASK_LIBRARY[discipline] || TASK_LIBRARY.Analysis;
    const [name, duration, effort] = library[(projectIndex + index) % library.length];
    const status =
      project.progress === 100
        ? 'Completed'
        : TASK_STATUS_CYCLE[(seed + projectIndex * 2 + index) % TASK_STATUS_CYCLE.length];
    const engineers = ENGINEER_BY_DISCIPLINE[discipline] || ['A. Iyer'];
    const start = addDays(project.target, -(64 - index * 12) - (seed % 5));
    const due = addDays(start, duration);
    const id = `TSK-${String(2001 + projectIndex * 4 + index)}`;

    return {
      id,
      name,
      projectId: project.id,
      designId: linkedDesign?.id || '',
      discipline,
      engineer: engineers[(seed + index) % engineers.length],
      start,
      due,
      priority: REQUIREMENT_PRIORITIES[(seed + index) % REQUIREMENT_PRIORITIES.length],
      dependencies: index === 0 ? [] : [`TSK-${String(2001 + projectIndex * 4 + index - 1)}`],
      progress: progressFor(status),
      status,
      effort,
      notes: '',
    };
  });
}).concat([
  {
    id: 'TSK-2101',
    name: 'Fixture locating scheme study',
    projectId: 'PRJ-2026-017',
    designId: DESIGNS.find((design) => design.projectId === 'PRJ-2026-017')?.id || '',
    discipline: 'Automotive',
    engineer: 'R. Kulkarni',
    start: addDays('2026-10-12', 4),
    due: addDays('2026-10-12', 24),
    priority: 'High',
    dependencies: [],
    progress: 45,
    status: 'In Progress',
    effort: 42,
    notes: 'Locating scheme for the sub-frame fixture, checked against datum flow.',
  },
  {
    id: 'TSK-2102',
    name: 'Clamp and actuator packaging check',
    projectId: 'PRJ-2026-017',
    designId: DESIGNS.find((design) => design.projectId === 'PRJ-2026-017')?.id || '',
    discipline: 'Automotive',
    engineer: 'D. Rao',
    start: addDays('2026-10-12', 18),
    due: addDays('2026-10-12', 38),
    priority: 'Medium',
    dependencies: ['TSK-2101'],
    progress: 0,
    status: 'Assigned',
    effort: 30,
    notes: '',
  },
  {
    id: 'TSK-2103',
    name: 'Hub fatigue load spectrum',
    projectId: 'PRJ-2026-014',
    designId: DESIGNS.find((design) => design.projectId === 'PRJ-2026-014')?.id || '',
    discipline: 'Analysis',
    engineer: 'N. Joshi',
    start: addDays('2026-09-08', 20),
    due: addDays('2026-09-08', 44),
    priority: 'Critical',
    dependencies: [],
    progress: 62,
    status: 'Changes Requested',
    effort: 46,
    notes: 'Spectrum reissued after the customer corrected the wind load case.',
  },
  {
    id: 'TSK-2104',
    name: 'Press frame weld fatigue check',
    projectId: 'PRJ-2026-024',
    designId: DESIGNS.find((design) => design.projectId === 'PRJ-2026-024')?.id || '',
    discipline: 'Analysis',
    engineer: 'N. Joshi',
    start: addDays('2026-03-24', 14),
    due: addDays('2026-03-24', 36),
    priority: 'High',
    dependencies: [],
    progress: 100,
    status: 'Completed',
    effort: 40,
    notes: 'Hot-spot stress approach agreed with the reviewer.',
  },
]);

/* ----------------------------------------------------------- design plans */
export const PLAN_STATUSES = ['Draft', 'Active', 'On Hold', 'Completed'];

export const PLAN_STATUS_TONES = {
  Draft: 'gray',
  Active: 'green',
  'On Hold': 'orange',
  Completed: 'blue',
};

const PLAN_STATUS_CYCLE = ['Active', 'Active', 'On Hold', 'Draft', 'Active', 'Completed', 'Active', 'Draft'];

export const DESIGN_PLANS = TASK_PROJECTS.map((project, index) => {
  const projectTasks = DESIGN_TASKS.filter((task) => task.projectId === project.id);
  const start = projectTasks.reduce(
    (earliest, task) => (!earliest || task.start < earliest ? task.start : earliest),
    project.start,
  );
  const due = projectTasks.reduce(
    (latest, task) => (!latest || task.due > latest ? task.due : latest),
    project.target,
  );

  return {
    id: `DPL-2026-${String(index + 1).padStart(3, '0')}`,
    name: `${project.name} Design Plan`,
    projectId: project.id,
    owner: project.manager,
    start,
    due,
    status: PLAN_STATUS_CYCLE[index % PLAN_STATUS_CYCLE.length],
    notes: `Engineering design plan for ${project.customer}. Tasks are linked to ${project.id} across the design workflow.`,
  };
});

export function nextPlanId(plans) {
  const highest = plans.reduce((max, plan) => {
    const numeric = Number(String(plan.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `DPL-2026-${String(highest + 1).padStart(3, '0')}`;
}

/** Conceptual link from a task category to the engineering workspace it feeds. */
export const TASK_CATEGORY_MODULES = {
  'Machine Design': { label: 'Mechanical Engineering Design', path: '/mechanical-design' },
  'Product Design': { label: 'Mechanical Engineering Design', path: '/mechanical-design' },
  Fabrication: { label: 'Manufacturing Design', path: '/manufacturing-design' },
  'Sheet Metal': { label: 'Mechanical Engineering Design', path: '/mechanical-design' },
  Piping: { label: 'Mechanical Engineering Design', path: '/mechanical-design' },
  Equipment: { label: 'Mechanical Engineering Design', path: '/mechanical-design' },
  Automotive: { label: 'Mechanical Engineering Design', path: '/mechanical-design' },
  Analysis: { label: 'Engineering Analysis', path: '/engineering-analysis' },
  'Manufacturing Engineering': { label: 'Manufacturing Design', path: '/manufacturing-design' },
};

export function taskCategoryModule(category) {
  return TASK_CATEGORY_MODULES[category] || TASK_CATEGORY_MODULES['Machine Design'];
}

/* ------------------------------------------------------- allocations */
export const DISCIPLINE_ALLOCATIONS = [
  { id: 'DA-101', engineer: 'D. Rao', discipline: 'Machine Design', projectId: 'PRJ-2026-041', role: 'Lead designer', allocation: 70 },
  { id: 'DA-102', engineer: 'V. Sharma', discipline: 'Machine Design', projectId: 'PRJ-2026-041', role: 'Detail designer', allocation: 45 },
  { id: 'DA-103', engineer: 'A. Iyer', discipline: 'Product Design', projectId: 'PRJ-2026-036', role: 'Design engineer', allocation: 40 },
  { id: 'DA-104', engineer: 'K. Pillai', discipline: 'Fabrication', projectId: 'PRJ-2026-038', role: 'Fabrication designer', allocation: 65 },
  { id: 'DA-105', engineer: 'R. Kulkarni', discipline: 'Fabrication', projectId: 'PRJ-2026-024', role: 'Reviewer', allocation: 30 },
  { id: 'DA-106', engineer: 'S. Menon', discipline: 'Sheet Metal', projectId: 'PRJ-2026-036', role: 'Lead designer', allocation: 60 },
  { id: 'DA-107', engineer: 'V. Sharma', discipline: 'Sheet Metal', projectId: 'PRJ-2026-022', role: 'Detail designer', allocation: 35 },
  { id: 'DA-108', engineer: 'P. Deshmukh', discipline: 'Piping', projectId: 'PRJ-2026-033', role: 'Piping designer', allocation: 75 },
  { id: 'DA-109', engineer: 'K. Pillai', discipline: 'Piping', projectId: 'PRJ-2026-019', role: 'Isometric checker', allocation: 25 },
  { id: 'DA-110', engineer: 'A. Iyer', discipline: 'Equipment', projectId: 'PRJ-2026-026', role: 'Equipment lead', allocation: 55 },
  { id: 'DA-111', engineer: 'P. Deshmukh', discipline: 'Equipment', projectId: 'PRJ-2026-014', role: 'Support designer', allocation: 20 },
  { id: 'DA-112', engineer: 'R. Kulkarni', discipline: 'Automotive', projectId: 'PRJ-2026-017', role: 'Fixture lead', allocation: 35 },
  { id: 'DA-113', engineer: 'D. Rao', discipline: 'Automotive', projectId: 'PRJ-2026-017', role: 'Packaging engineer', allocation: 20 },
  { id: 'DA-114', engineer: 'N. Joshi', discipline: 'Analysis', projectId: 'PRJ-2026-038', role: 'Analyst', allocation: 50 },
  { id: 'DA-115', engineer: 'A. Iyer', discipline: 'Analysis', projectId: 'PRJ-2026-026', role: 'Analyst', allocation: 30 },
  { id: 'DA-116', engineer: 'S. Menon', discipline: 'Manufacturing Engineering', projectId: 'PRJ-2026-022', role: 'DFM engineer', allocation: 25 },
  { id: 'DA-117', engineer: 'K. Pillai', discipline: 'Manufacturing Engineering', projectId: 'PRJ-2026-033', role: 'Process engineer', allocation: 20 },
  { id: 'DA-118', engineer: 'V. Sharma', discipline: 'Product Design', projectId: 'PRJ-2026-029', role: 'Design engineer', allocation: 30 },
];

/* --------------------------------------------------------------- scope */
const SCOPE_TEMPLATES = {
  'Machine Design': {
    included: [
      'Complete mechanical design of the drive assembly from concept to manufacturing drawings',
      'Shaft, bearing, key and fastener sizing with supporting calculations',
      '3D CAD model, GA drawing and detail manufacturing drawing set',
      'Engineering BOM with purchased component specifications',
    ],
    excluded: [
      'Structural civil works and foundation design',
      'Electrical panel, cabling and motor winding design',
      'Site installation, commissioning and alignment',
    ],
    assumptions: [
      'Customer supplies the motor and coupling with a confirmed shaft interface drawing',
      'Site ambient stays within 0–45 °C and the foundation is level within 2 mm/m',
      'Design review comments are returned within five working days',
    ],
    constraints: [
      'Envelope limited to 1,450 × 900 × 1,100 mm by the existing machine guard',
      'No welded joints on the main housing — bolted split required for service',
      'Preferred materials restricted to the approved vendor stock list',
    ],
    deliverables: [
      '3D CAD model (native + STEP)',
      'GA drawing at 1:10 with interface dimensions',
      'Manufacturing drawing set',
      'Design calculation report',
      'Engineering BOM',
    ],
    dependencies: [
      'Customer interface drawing approval',
      'Gearbox selection from the approved vendor',
      'Foundation bolt layout from the civil contractor',
    ],
  },
  'Sheet Metal Design': {
    included: [
      'Enclosure layout, panel split and door arrangement',
      'Flat patterns, bend tables and cut-out programs for production',
      'Hinge, latch, gasket and cable entry detailing',
      'Surface finish and coating specification',
    ],
    excluded: ['Powder coating process trials', 'Electrical component layout and wiring', 'Site installation'],
    assumptions: [
      'Fabricator has 2 kW fibre laser and 100 t press brake capability',
      'Standard sheet thickness available in 1.5, 2.0 and 2.5 mm',
    ],
    constraints: [
      'Bend radius minimum 1 × thickness for all internal corners',
      'IP54 sealing requirement at every panel joint',
      'Standard 600 mm module width for the enclosure family',
    ],
    deliverables: [
      '3D sheet metal model',
      'Flat pattern DXF set',
      'Bend and weld documentation',
      'GA drawing',
      'Inspection specification',
    ],
    dependencies: [
      'Component layout freeze from electrical engineering',
      'Coating shade approval from the customer',
    ],
  },
  'Piping Design': {
    included: [
      'Line routing, isometric generation and support selection',
      'Valve and instrument schedule with tag numbers',
      'Material take-off reconciled with the engineering BOM',
      'Support detail drawings and layout drawings',
    ],
    excluded: ['Stress analysis of critical lines (separate scope)', 'Insulation and painting execution', 'Site spool fabrication'],
    assumptions: [
      'P&ID revision C is the frozen basis of design',
      'Plot space and pipe rack allocation are confirmed by the plant',
    ],
    constraints: [
      'Maximum allowable pressure drop 0.5 bar across the skid',
      'Utility tie-in elevations fixed by the plant interface schedule',
      'No field welding inside the skid boundary',
    ],
    deliverables: ['Isometric drawing set', 'Support detail drawings', 'Valve schedule', 'Material take-off', 'Layout drawing'],
    dependencies: ['Frozen P&ID', 'Equipment nozzle orientation approval', 'Pipe rack allocation from plant engineering'],
  },
  Fabrication: {
    included: [
      'Structural frame layout, member sizing and connection design',
      'Weld detailing, weld map and fit-up drawings',
      'Lifting and transport point design with calculations',
      'Surface preparation and painting specification',
    ],
    excluded: ['Foundation and anchor bolt design', 'Erection at site', 'NDT execution (vendor scope)'],
    assumptions: [
      'Fabricator holds valid WPS/PQR for the specified weld procedures',
      'Standard rolled sections available in IS 2062 E250 BR',
    ],
    constraints: [
      'Maximum transport width 2.4 m without escort',
      'Weld access minimum 45 mm from any stiffener',
      'Galvanising excluded — painted system only',
    ],
    deliverables: ['GA drawing', 'Fabrication drawing set', 'Weld map', 'Lifting plan', 'Engineering BOM'],
    dependencies: ['Civil anchor bolt layout', 'Vendor WPS approval', 'Transport route survey'],
  },
  Equipment: {
    included: [
      'Equipment arrangement, nozzle orientation and support design',
      'Skid layout with maintenance access and lifting points',
      'Assembly drawing and nameplate schedule',
      'Operation and maintenance manual',
    ],
    excluded: ['Pressure part design and code stamping', 'Instrumentation and control philosophy', 'Site erection'],
    assumptions: ['Site utilities available at the skid battery limit', 'Customer provides the process data sheet'],
    constraints: [
      'Skid footprint limited to 3.2 × 2.1 m',
      'Maximum lifting weight 6.5 t including the skid',
      'All service points accessible from one side',
    ],
    deliverables: ['Skid GA drawing', 'Assembly drawing', 'Nozzle schedule', 'O&M manual', 'Engineering BOM'],
    dependencies: ['Process data sheet approval', 'Instrument list from the automation vendor'],
  },
};

const DEFAULT_SCOPE = SCOPE_TEMPLATES['Machine Design'];

/* ---------------------------------------------------------- generators */
export function buildProjectScope(project) {
  const template = SCOPE_TEMPLATES[project.domain] || DEFAULT_SCOPE;
  const scope = {};

  SCOPE_SECTIONS.forEach((section) => {
    scope[section.key] = (template[section.key] || []).map((text, index) => ({
      id: `SC-${project.id}-${section.key}-${index}`,
      text,
    }));
  });

  return scope;
}

export function buildAllScopes() {
  return PROJECTS.reduce((accumulator, project) => {
    accumulator[project.id] = buildProjectScope(project);
    return accumulator;
  }, {});
}

export function nextRequirementId(requirements) {
  const highest = requirements.reduce((max, requirement) => {
    const numeric = Number(String(requirement.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 1000);
  return `REQ-${highest + 1}`;
}

export function nextTaskId(tasks) {
  const highest = tasks.reduce((max, task) => {
    const numeric = Number(String(task.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 2000);
  return `TSK-${highest + 1}`;
}

export function nextAllocationId(allocations) {
  const highest = allocations.reduce((max, allocation) => {
    const numeric = Number(String(allocation.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 100);
  return `DA-${highest + 1}`;
}

/** Working days between two dates (inclusive of the start day). */
export function durationDays(start, due) {
  return daysBetween(start, due) + 1;
}

export function taskIsOverdue(task) {
  return task.status !== 'Completed' && task.due < TODAY;
}

/** Engineer workload derived from the task register (40 h/week capacity). */
export function buildWorkload(tasks) {
  const weeklyCapacity = 160;
  const byEngineer = new Map();

  tasks.forEach((task) => {
    const current = byEngineer.get(task.engineer) || {
      engineer: task.engineer,
      discipline: task.discipline,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      openEffort: 0,
    };

    current.assigned += 1;
    if (task.status === 'In Progress') current.inProgress += 1;
    if (task.status === 'Completed') current.completed += 1;
    if (taskIsOverdue(task)) current.overdue += 1;
    if (task.status !== 'Completed') current.openEffort += task.effort || 0;
    current.discipline = task.discipline;
    byEngineer.set(task.engineer, current);
  });

  return [...byEngineer.values()]
    .map((row) => ({
      ...row,
      workload: Math.min(150, Math.round((row.openEffort / weeklyCapacity) * 100)),
    }))
    .sort((left, right) => right.workload - left.workload);
}

/* ==========================================================================
   Module 03 — design scope, milestones and tracking helpers
   ========================================================================== */

/** Plan priorities reuse the project priority vocabulary. */
export const PLAN_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const MILESTONE_STATUSES = ['Planned', 'In Progress', 'Completed', 'Delayed', 'Cancelled'];

export const MILESTONE_STATUS_TONES = {
  Planned: 'gray',
  'In Progress': 'blue',
  Completed: 'green',
  Delayed: 'red',
  Cancelled: 'gray',
};

/** Standard engineering milestones offered when adding a plan milestone. */
export const MILESTONE_TEMPLATES = [
  {
    name: 'Requirements Finalization',
    description: 'Functional and technical requirements frozen and signed off.',
  },
  {
    name: 'Concept Selection',
    description: 'Preferred concept selected against the evaluation matrix.',
  },
  {
    name: 'Mechanical Design Completion',
    description: 'Detailed part and assembly design completed for review.',
  },
  {
    name: 'Simulation & Validation Completion',
    description: 'Simulation models solved and results accepted by the reviewer.',
  },
  {
    name: 'Engineering Analysis Completion',
    description: 'Structural, thermal or fatigue calculations completed.',
  },
  {
    name: 'Manufacturing Design Completion',
    description: 'DFM review closed and manufacturing drawings issued.',
  },
  { name: 'BOM Completion', description: 'Engineering BOM released with cost estimates.' },
  {
    name: 'CAD and Drawing Completion',
    description: 'Drawing set released to the CAD register.',
  },
  {
    name: 'Design Review Completion',
    description: 'Cross-functional design review closed with approval.',
  },
  {
    name: 'Final Design Release',
    description: 'Design released to production with handover package.',
  },
];

const MILESTONE_STEP_DAYS = [7, 20, 38, 52, 64, 74, 82, 90, 100, 110];

/** Demo milestones for the seeded plans, dated inside each plan window. */
export const MILESTONES = DESIGN_PLANS.flatMap((plan, planIndex) =>
  MILESTONE_TEMPLATES.slice(0, 6 + (planIndex % 3)).map((template, index) => {
    const plannedDate = addDays(plan.start, MILESTONE_STEP_DAYS[index] || 7 * (index + 1));
    const done = plan.status === 'Completed' && index < 3;
    return {
      id: `MS-2026-${String(planIndex * 10 + index + 1).padStart(3, '0')}`,
      planId: plan.id,
      projectId: plan.projectId,
      name: template.name,
      description: template.description,
      plannedDate,
      actualDate: done ? plannedDate : '',
      owner: plan.owner,
      status: done ? 'Completed' : 'Planned',
      remarks: '',
      createdAt: plan.start,
      updatedAt: plan.start,
    };
  }),
);

export function nextMilestoneId(milestones = []) {
  const year = new Date().getFullYear();
  const highest = milestones.reduce((max, milestone) => {
    const numeric = Number(String(milestone.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `MS-${year}-${String(highest + 1).padStart(3, '0')}`;
}

/** Fields added by Module 03 that older persisted plans may not have. */
export const PLAN_DEFAULTS = {
  priority: 'Medium',
  engineers: [],
  responsibilities: '',
  objectives: '',
  scope: '',
  functionalRequirements: '',
  technicalRequirements: '',
  constraints: '',
  operatingConditions: '',
  deliverables: '',
  assumptions: '',
  risks: '',
  dependencies: '',
  remarks: '',
  attachments: [],
};

export function normalizePlan(plan) {
  return { ...PLAN_DEFAULTS, ...plan, engineers: plan.engineers || [] };
}

/** Completed / pending / overdue task counts — derived from task records only. */
export function planTaskStats(planTasks = []) {
  const tasks = Array.isArray(planTasks) ? planTasks : [];
  const completed = tasks.filter((task) => task.status === 'Completed').length;
  const cancelled = tasks.filter((task) => task.status === 'Cancelled').length;
  const pending = tasks.length - completed - cancelled;
  const inProgress = tasks.filter((task) =>
    ['In Progress', 'Under Review', 'Submitted', 'Changes Requested', 'Assigned'].includes(
      task.status,
    ),
  ).length;
  const overdueTasks = tasks.filter((task) => taskIsOverdue(task));
  const upcoming = tasks
    .filter(
      (task) =>
        !['Completed', 'Cancelled'].includes(task.status) && task.due && task.due >= TODAY,
    )
    .sort((left, right) => String(left.due).localeCompare(String(right.due)))
    .slice(0, 5);
  const pendingDependencies = tasks.filter(
    (task) =>
      !['Completed', 'Cancelled'].includes(task.status) &&
      (task.dependencies || []).some((dependencyId) => {
        const dependency = tasks.find((row) => row.id === dependencyId);
        return dependency && dependency.status !== 'Completed';
      }),
  );
  return {
    total: tasks.length,
    completed,
    pending,
    cancelled,
    inProgress,
    overdue: overdueTasks.length,
    overdueTasks,
    upcoming,
    pendingDependencies,
    progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

/** Milestone counts and progress — recorded statuses only, never inferred. */
export function milestoneStats(milestones = []) {
  const rows = Array.isArray(milestones) ? milestones : [];
  const completed = rows.filter((milestone) => milestone.status === 'Completed').length;
  const overdue = rows.filter(
    (milestone) =>
      milestone.status !== 'Completed' &&
      milestone.status !== 'Cancelled' &&
      milestone.plannedDate &&
      milestone.plannedDate < TODAY,
  ).length;
  return {
    total: rows.length,
    completed,
    open: rows.length - completed,
    overdue,
    progress: rows.length ? Math.round((completed / rows.length) * 100) : 0,
  };
}

/** Overall design plan readiness: completed plan records over all plan records. */
export function overallPlanProgress(taskStats, milestoneStatsValue) {
  const total = (taskStats?.total || 0) + (milestoneStatsValue?.total || 0);
  if (!total) return 0;
  const done = (taskStats?.completed || 0) + (milestoneStatsValue?.completed || 0);
  return Math.round((done / total) * 100);
}

/** Dependency graph check used by the task form (self-reference and cycles). */
export function dependencyCreatesCycle(tasks, taskId, dependencyIds) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visit = (currentId, trail) => {
    if (currentId === taskId) return true;
    if (trail.has(currentId)) return false;
    trail.add(currentId);
    const current = byId.get(currentId);
    if (!current) return false;
    return (current.dependencies || []).some((nextId) => visit(nextId, trail));
  };
  return dependencyIds.some((dependencyId) => {
    if (dependencyId === taskId) return true;
    return visit(dependencyId, new Set());
  });
}
