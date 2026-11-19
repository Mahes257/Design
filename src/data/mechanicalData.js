/**
 * Local mock data for Module 05 — Mechanical Engineering Design.
 *
 * One shared design register covers all seven mechanical disciplines, one shared
 * part/assembly register serves every domain, and one shared calculation register
 * records inputs, assumptions and results. Frontend only: no API, no database.
 * Project, engineer and material references reuse the existing modules.
 */
import { PROJECTS, addDays, formatDate, TODAY } from './projectData';

export { TODAY, addDays, formatDate };

/* ------------------------------------------------------------------ domains */
export const DESIGN_DOMAINS = [
  { key: 'machine-design', label: 'Machine Design', short: 'Machine' },
  { key: 'product-design', label: 'Product Design', short: 'Product' },
  { key: 'fabrication-design', label: 'Fabrication Design', short: 'Fabrication' },
  { key: 'sheet-metal-design', label: 'Sheet Metal Design', short: 'Sheet Metal' },
  { key: 'piping-design', label: 'Piping Design', short: 'Piping' },
  { key: 'equipment-design', label: 'Equipment Design', short: 'Equipment' },
  { key: 'automotive-components', label: 'Automotive Components', short: 'Automotive' },
];

export const DOMAIN_LABELS = DESIGN_DOMAINS.map((domain) => domain.label);

export function domainForLabel(label) {
  return DESIGN_DOMAINS.find((domain) => domain.label === label) || DESIGN_DOMAINS[0];
}

export const DESIGN_DOMAIN_FILTERS = [{ key: 'all', label: 'All Designs' }, ...DESIGN_DOMAINS];

/* --------------------------------------------------------------- categories */
export const DESIGN_CATEGORIES = {
  'Machine Design': [
    'Mechanisms',
    'Shafts',
    'Gears',
    'Bearings',
    'Drives',
    'Frames',
    'Machine Assemblies',
  ],
  'Product Design': [
    'Product Architecture',
    'Components',
    'Enclosures',
    'Product Assemblies',
    'Design Iterations',
    'Product Specifications',
  ],
  'Fabrication Design': [
    'Structural Members',
    'Plate Components',
    'Weldments',
    'Fabrication Layouts',
    'Fabrication Details',
  ],
  'Sheet Metal Design': [
    'Sheet Metal Parts',
    'Bend Details',
    'Flat Patterns',
    'Bend Allowances',
    'Formed Components',
  ],
  'Piping Design': [
    'Piping Systems',
    'Routes',
    'Fittings',
    'Supports',
    'Layouts',
    'Line Details',
  ],
  'Equipment Design': [
    'Equipment Register',
    'Equipment Components',
    'Mechanical Arrangement',
    'Technical Specifications',
    'Equipment Datasheets',
  ],
  'Automotive Components': [
    'Components',
    'Assemblies',
    'Interfaces',
    'Packaging',
    'Technical Details',
  ],
};

export function categoriesForDomain(domain) {
  return DESIGN_CATEGORIES[domain] || DESIGN_CATEGORIES['Machine Design'];
}

/* ------------------------------------------------- domain-specific fields */
export const MATERIALS = [
  'IS 2062 E250 BR',
  'IS 2062 E350',
  'IS 4923 hollow section',
  'SS 304',
  'SS 316L',
  '20MnCr5',
  'EN8',
  'EN19',
  'LM6 aluminium',
  'Aluminium 6061-T6',
  'CRCA sheet',
  'GI sheet',
  'PP',
  'PTFE',
];

/** Field schemas keep domain forms relevant — unrelated fields are not shown. */
export const DOMAIN_TECH_FIELDS = {
  'Machine Design': [
    { key: 'componentType', label: 'Component Type', type: 'select', options: ['Mechanism', 'Shaft', 'Gear', 'Bearing', 'Drive', 'Frame', 'Machine assembly'] },
    { key: 'shaftDiameter', label: 'Shaft Diameter', type: 'number', unit: 'mm' },
    { key: 'shaftLength', label: 'Shaft Length', type: 'number', unit: 'mm' },
    { key: 'gearRatio', label: 'Gear Ratio', type: 'text', placeholder: 'e.g. 24:1' },
    { key: 'bearingType', label: 'Bearing Type', type: 'select', options: ['Deep groove ball', 'Taper roller', 'Cylindrical roller', 'Spherical roller', 'Needle roller', 'Not applicable'] },
    { key: 'loadInfo', label: 'Load Information', type: 'textarea', placeholder: 'Radial and axial loads, duty class and shock factor' },
    { key: 'rotationalSpeed', label: 'Rotational Speed', type: 'number', unit: 'rpm' },
    { key: 'material', label: 'Material', type: 'select', options: MATERIALS },
    { key: 'designNotes', label: 'Design Notes', type: 'textarea' },
  ],
  'Product Design': [
    { key: 'productType', label: 'Product Type', type: 'text', placeholder: 'e.g. Wall-mounted drive enclosure' },
    { key: 'productModel', label: 'Product Model', type: 'text', placeholder: 'e.g. ATV-630' },
    { key: 'componentCategory', label: 'Component Category', type: 'select', options: ['Architecture', 'Component', 'Enclosure', 'Assembly', 'Iteration', 'Specification'] },
    { key: 'enclosureMaterial', label: 'Enclosure Material', type: 'select', options: ['CRCA sheet', 'GI sheet', 'SS 304', 'Aluminium 6061-T6', 'Engineering polymer'] },
    { key: 'productDimensions', label: 'Product Dimensions', type: 'text', placeholder: 'e.g. 600 × 420 × 250 mm' },
    { key: 'designIteration', label: 'Design Iteration', type: 'text', placeholder: 'e.g. Iteration 3' },
    { key: 'productSpecifications', label: 'Product Specifications', type: 'textarea' },
  ],
  'Fabrication Design': [
    { key: 'structuralMember', label: 'Structural Member Type', type: 'select', options: ['ISMB', 'ISMC', 'ISA', 'SHS', 'RHS', 'Plate', 'Built-up section'] },
    { key: 'plateThickness', label: 'Plate Thickness', type: 'number', unit: 'mm' },
    { key: 'materialGrade', label: 'Material Grade', type: 'select', options: ['IS 2062 E250 BR', 'IS 2062 E350', 'SS 304', 'SS 316L'] },
    { key: 'weldType', label: 'Weld Type', type: 'select', options: ['Fillet', 'Full penetration butt', 'Partial penetration', 'Plug weld', 'Seam weld'] },
    { key: 'weldDetails', label: 'Weld Details', type: 'textarea', placeholder: 'Weld size, length, symbols and NDT requirement' },
    { key: 'fabricationMethod', label: 'Fabrication Method', type: 'select', options: ['CNC cutting', 'Plasma cutting', 'Laser cutting', 'Manual fabrication', 'Rolled section'] },
    { key: 'fabricationNotes', label: 'Fabrication Notes', type: 'textarea' },
  ],
  'Sheet Metal Design': [
    { key: 'sheetMaterial', label: 'Sheet Material', type: 'select', options: ['CRCA sheet', 'GI sheet', 'SS 304', 'SS 316L', 'Aluminium 6061-T6'] },
    { key: 'thickness', label: 'Thickness', type: 'number', unit: 'mm' },
    { key: 'bendAngle', label: 'Bend Angle', type: 'number', unit: 'deg' },
    { key: 'bendRadius', label: 'Bend Radius', type: 'number', unit: 'mm' },
    { key: 'bendAllowance', label: 'Bend Allowance', type: 'number', unit: 'mm' },
    { key: 'flatPatternDimensions', label: 'Flat Pattern Dimensions', type: 'text', placeholder: 'e.g. 1,840 × 1,120 mm' },
    { key: 'formedDimensions', label: 'Formed Dimensions', type: 'text', placeholder: 'e.g. 600 × 420 × 250 mm' },
  ],
  'Piping Design': [
    { key: 'lineNumber', label: 'Line Number', type: 'text', placeholder: 'e.g. CW-1001-2"-CS' },
    { key: 'pipeMaterial', label: 'Pipe Material', type: 'select', options: ['CS A106 Gr B', 'SS 316L', 'PP', 'PVC', 'GI'] },
    { key: 'nominalPipeSize', label: 'Nominal Pipe Size', type: 'select', options: ['1/2 in', '1 in', '2 in', '3 in', '4 in', '6 in', '8 in'] },
    { key: 'pipeSchedule', label: 'Pipe Schedule', type: 'select', options: ['SCH 10', 'SCH 40', 'SCH 80', 'SCH 160'] },
    { key: 'designPressure', label: 'Design Pressure', type: 'number', unit: 'bar' },
    { key: 'designTemperature', label: 'Design Temperature', type: 'number', unit: '°C' },
    { key: 'fittingType', label: 'Fitting Type', type: 'select', options: ['Elbow', 'Tee', 'Reducer', 'Flange', 'Gate valve', 'Butterfly valve'] },
    { key: 'supportType', label: 'Support Type', type: 'select', options: ['Pipe shoe', 'Hanger', 'Guide', 'Anchor', 'Trunnion'] },
    { key: 'fluidService', label: 'Fluid Service', type: 'text', placeholder: 'e.g. Cooling water' },
  ],
  'Equipment Design': [
    { key: 'equipmentTag', label: 'Equipment Tag', type: 'text', placeholder: 'e.g. LUB-2601' },
    { key: 'equipmentType', label: 'Equipment Type', type: 'select', options: ['Skid', 'Vessel', 'Pump unit', 'Heat exchanger', 'Filter unit', 'Fan assembly'] },
    { key: 'operatingConditions', label: 'Operating Conditions', type: 'textarea' },
    { key: 'designPressure', label: 'Design Pressure', type: 'number', unit: 'bar' },
    { key: 'designTemperature', label: 'Design Temperature', type: 'number', unit: '°C' },
    { key: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g. 45 L/min at 4 bar' },
    { key: 'equipmentMaterial', label: 'Equipment Material', type: 'select', options: MATERIALS },
    { key: 'datasheetReference', label: 'Datasheet Reference', type: 'text', placeholder: 'e.g. DS-LUB-2601 Rev A' },
  ],
  'Automotive Components': [
    { key: 'componentCategory', label: 'Component Category', type: 'select', options: ['Bracket', 'Housing', 'Fixture', 'Sub-frame', 'Trim component', 'Powertrain component'] },
    { key: 'vehicleApplication', label: 'Vehicle / Application Reference', type: 'text', placeholder: 'e.g. Two-wheeler sub-frame' },
    { key: 'interfaceType', label: 'Interface Type', type: 'select', options: ['Bolted', 'Welded', 'Clamped', 'Snap-fit', 'Bonded'] },
    { key: 'packagingDimensions', label: 'Packaging Dimensions', type: 'text', placeholder: 'e.g. 480 × 320 × 210 mm' },
    { key: 'operatingConditions', label: 'Operating Conditions', type: 'textarea' },
    { key: 'material', label: 'Material', type: 'select', options: MATERIALS },
    { key: 'technicalSpecifications', label: 'Technical Specifications', type: 'textarea' },
  ],
};

export function techFieldsForDomain(domain) {
  return DOMAIN_TECH_FIELDS[domain] || DOMAIN_TECH_FIELDS['Machine Design'];
}

/* ------------------------------------------------------------------ statuses */
export const DESIGN_STATUSES = [
  'Draft',
  'In Design',
  'Submitted',
  'Under Review',
  'Changes Requested',
  'Approved',
  'Released',
  'Superseded',
  'Archived',
];

export const PART_STATUSES = [
  'Draft',
  'In Design',
  'Under Review',
  'Approved',
  'Released',
  'Superseded',
  'Archived',
];

export const ASSEMBLY_STATUSES = PART_STATUSES;

export const CALC_STATUSES = [
  'Draft',
  'Pending Verification',
  'Verified',
  'Rejected',
  'Changes Requested',
  'Superseded',
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUS_TONES = {
  Draft: 'gray',
  'In Design': 'blue',
  Submitted: 'purple',
  'Under Review': 'purple',
  'Changes Requested': 'orange',
  Approved: 'green',
  Released: 'green',
  Superseded: 'gray',
  Archived: 'gray',
  'Pending Verification': 'orange',
  Verified: 'green',
  Rejected: 'red',
};

export function statusTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export const PRIORITY_TONES = {
  Critical: 'red',
  High: 'orange',
  Medium: 'blue',
  Low: 'gray',
};

export function priorityTone(priority) {
  return PRIORITY_TONES[priority] || 'gray';
}

/* -------------------------------------------------------------- categories */
export const PART_CATEGORIES = [
  'Machined part',
  'Fabricated part',
  'Sheet metal part',
  'Cast part',
  'Forged part',
  'Purchased part',
  'Piping component',
  'Standard fastener',
];

export const UOM_OPTIONS = ['nos', 'set', 'm', 'kg', 'pair'];

export const CALCULATION_TYPES = [
  'Shaft Design',
  'Gear Design',
  'Bearing Selection',
  'Torque Calculation',
  'Power Calculation',
  'Stress Calculation',
  'Deflection Calculation',
  'Factor of Safety',
  'Buckling Calculation',
  'Weld Strength',
  'Sheet Metal Bend Calculation',
  'Pressure / Pipe Calculation',
  'Thermal Calculation',
  'Weight Calculation',
  'Custom Calculation',
];

export const REVISIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ------------------------------------------------------------- mock designs */
function revisionEntry(revision, date, by, note) {
  return { revision, date, by, note };
}

export const DESIGNS = [
  {
    id: 'DES-2026-001',
    name: 'Conveyor drive gear train',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Gears',
    description:
      'Two-stage helical gear train for the 45 kW conveyor drive, packaged inside the existing guard envelope with a horizontal split housing.',
    scope:
      'Gear and shaft sizing, bearing selection, housing envelope and interface definition. Manufacturing drawings are handled in the fabrication package.',
    owner: 'R. Kulkarni',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    created: '2026-09-08',
    target: '2026-11-28',
    revision: 'C',
    priority: 'High',
    status: 'Approved',
    technicalNotes:
      'Gear pair 20MnCr5, case hardened 58 HRC. Bearing life 26,000 h at rated load. Housing split on the shaft centre line.',
    linkedPartIds: ['PRT-2026-002', 'PRT-2026-003', 'PRT-2026-004'],
    linkedAssemblyIds: ['ASM-2026-001', 'ASM-2026-002'],
    cadRef: 'CAD-041-014',
    tech: {
      componentType: 'Gear',
      shaftDiameter: 85,
      shaftLength: 640,
      gearRatio: '24:1',
      bearingType: 'Taper roller',
      loadInfo: 'Radial 18.5 kN, axial 4.2 kN at the output shaft; duty class M6 with 1.8 × starting torque.',
      rotationalSpeed: 1470,
      material: '20MnCr5',
      designNotes: 'Bearing bores line-bored after welding to hold 0.02 mm concentricity.',
    },
    revisions: [
      revisionEntry('A', '2026-09-08', 'D. Rao', 'First concept arrangement released for review.'),
      revisionEntry('B', '2026-10-02', 'D. Rao', 'Bearing size increased after the revised load case.'),
      revisionEntry('C', '2026-10-24', 'D. Rao', 'Housing split line moved for service access; approved.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Concept arrangement registered', by: 'D. Rao', at: '2026-09-08' },
      { id: 'ACT-2', label: 'Submitted for review', detail: 'Rev B issued to technical review', by: 'D. Rao', at: '2026-10-03' },
      { id: 'ACT-3', label: 'Approved', detail: 'Rev C approved by the technical reviewer', by: 'N. Joshi', at: '2026-10-24' },
    ],
  },
  {
    id: 'DES-2026-002',
    name: 'Motor mount bracket load path',
    projectId: 'PRJ-2026-029',
    domain: 'Machine Design',
    category: 'Frames',
    description:
      'Bracket arrangement carrying the 90 kW motor and isolating vibration from the drive package frame.',
    scope: 'Bracket geometry, mounting pad definition and natural frequency check. Casting detail follows in the fabrication package.',
    owner: 'R. Kulkarni',
    engineer: 'N. Joshi',
    reviewer: 'A. Iyer',
    created: '2026-10-12',
    target: '2026-12-15',
    revision: 'B',
    priority: 'High',
    status: 'In Design',
    technicalNotes: 'First natural frequency target ≥ 90 Hz. Isolator pads tuned to 12 Hz.',
    linkedPartIds: ['PRT-2026-017'],
    linkedAssemblyIds: [],
    cadRef: 'CAD-029-006',
    tech: {
      componentType: 'Frame',
      shaftDiameter: 0,
      shaftLength: 0,
      gearRatio: 'Not applicable',
      bearingType: 'Not applicable',
      loadInfo: 'Motor mass 310 kg with 1.5 × dynamic factor; isolator compression limited to 6 mm.',
      rotationalSpeed: 1480,
      material: 'IS 2062 E250 BR',
      designNotes: 'Bracket stiffened at the isolator pads to keep the first mode above the excitation frequency.',
    },
    revisions: [
      revisionEntry('A', '2026-10-12', 'N. Joshi', 'Initial bracket arrangement.'),
      revisionEntry('B', '2026-11-06', 'N. Joshi', 'Gusset added after the frequency check.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Bracket arrangement registered', by: 'N. Joshi', at: '2026-10-12' },
      { id: 'ACT-2', label: 'Revision B issued', detail: 'Gusset added to raise the first mode', by: 'N. Joshi', at: '2026-11-06' },
    ],
  },
  {
    id: 'DES-2026-003',
    name: 'Modular enclosure family',
    projectId: 'PRJ-2026-036',
    domain: 'Product Design',
    category: 'Enclosures',
    description:
      'IP54 enclosure platform built from three shared panels and a door frame, scalable across 600, 800 and 1,000 mm widths.',
    scope: 'Product architecture, panel split, gasket strategy and finish specification. Production flat patterns are issued separately.',
    owner: 'S. Menon',
    engineer: 'V. Sharma',
    reviewer: 'N. Joshi',
    created: '2026-10-09',
    target: '2026-12-05',
    revision: 'B',
    priority: 'High',
    status: 'Under Review',
    technicalNotes: 'Continuous gasket with 25 mm fastener pitch. Powder coat RAL 7035, 60–80 µm.',
    linkedPartIds: ['PRT-2026-011', 'PRT-2026-012', 'PRT-2026-013'],
    linkedAssemblyIds: ['ASM-2026-006'],
    cadRef: 'CAD-036-021',
    tech: {
      productType: 'Control panel enclosure',
      productModel: 'ENC-600/800/1000',
      componentCategory: 'Architecture',
      enclosureMaterial: 'CRCA sheet',
      productDimensions: '600 × 420 × 250 mm (base variant)',
      designIteration: 'Iteration 3',
      productSpecifications:
        'IP54, IK08 impact rating, 1.5 mm CRCA body, 2.0 mm door, cable entry from the bottom, DIN rail mounting.',
    },
    revisions: [
      revisionEntry('A', '2026-10-09', 'V. Sharma', 'Platform architecture released.'),
      revisionEntry('B', '2026-11-02', 'V. Sharma', 'Seam line revised after customer industrial design review.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Platform architecture registered', by: 'V. Sharma', at: '2026-10-09' },
      { id: 'ACT-2', label: 'Submitted for review', detail: 'Rev B issued for review', by: 'V. Sharma', at: '2026-11-02' },
    ],
  },
  {
    id: 'DES-2026-004',
    name: 'Wall-mount drive enclosure',
    projectId: 'PRJ-2026-022',
    domain: 'Product Design',
    category: 'Product Architecture',
    description:
      'Compact wall-mounted enclosure for a 7.5 kW drive with ventilation louvres, DIN rail and IP42 rating.',
    scope: 'Product envelope, mounting arrangement and ventilation strategy.',
    owner: 'S. Menon',
    engineer: 'V. Sharma',
    reviewer: 'N. Joshi',
    created: '2026-06-22',
    target: '2026-11-30',
    revision: 'A',
    priority: 'Medium',
    status: 'In Design',
    technicalNotes: 'Thermal margin 18% at 45 °C ambient with natural convection.',
    linkedPartIds: [],
    linkedAssemblyIds: [],
    cadRef: 'CAD-022-009',
    tech: {
      productType: 'Wall-mounted drive enclosure',
      productModel: 'WMD-75',
      componentCategory: 'Architecture',
      enclosureMaterial: 'GI sheet',
      productDimensions: '400 × 300 × 180 mm',
      designIteration: 'Iteration 2',
      productSpecifications: 'IP42, 1.5 mm GI body, louvred side panels, wall bracket rated for 28 kg.',
    },
    revisions: [revisionEntry('A', '2026-06-22', 'V. Sharma', 'Initial product architecture.')],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Product architecture registered', by: 'V. Sharma', at: '2026-06-22' },
    ],
  },
  {
    id: 'DES-2026-005',
    name: 'Feed system support frame',
    projectId: 'PRJ-2026-038',
    domain: 'Fabrication Design',
    category: 'Weldments',
    description:
      'Welded support frame for the package boiler feed system, designed for seismic zone III and site bolted assembly.',
    scope: 'Member sizing, weld detailing, gusset plates and foundation interface.',
    owner: 'A. Iyer',
    engineer: 'K. Pillai',
    reviewer: 'R. Kulkarni',
    created: '2026-08-04',
    target: '2026-12-05',
    revision: 'B',
    priority: 'Medium',
    status: 'Under Review',
    technicalNotes: 'All fillet welds 6 mm minimum; full penetration at lifting points and base plate.',
    linkedPartIds: ['PRT-2026-008', 'PRT-2026-009', 'PRT-2026-010'],
    linkedAssemblyIds: ['ASM-2026-005'],
    cadRef: 'CAD-038-013',
    tech: {
      structuralMember: 'ISMB',
      plateThickness: 12,
      materialGrade: 'IS 2062 E250 BR',
      weldType: 'Fillet',
      weldDetails: '6 mm fillet all round, weld map required, 10% radiography on butt welds.',
      fabricationMethod: 'CNC cutting',
      fabricationNotes: 'Prime and paint two coats epoxy, 75 µm DFT. Transport width limited to 2.4 m.',
    },
    revisions: [
      revisionEntry('A', '2026-08-04', 'K. Pillai', 'Frame layout released.'),
      revisionEntry('B', '2026-10-28', 'K. Pillai', 'Diagonal bracing added for seismic load.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Frame weldment registered', by: 'K. Pillai', at: '2026-08-04' },
      { id: 'ACT-2', label: 'Revision B issued', detail: 'Seismic bracing added', by: 'K. Pillai', at: '2026-10-28' },
    ],
  },
  {
    id: 'DES-2026-006',
    name: 'Press frame weldment',
    projectId: 'PRJ-2026-024',
    domain: 'Fabrication Design',
    category: 'Structural Members',
    description:
      'Welded press frame for a 200 t hydraulic press, checked for static strength and weld-toe fatigue.',
    scope: 'Frame members, corner details, weld map and manufacturing notes.',
    owner: 'N. Joshi',
    engineer: 'K. Pillai',
    reviewer: 'R. Kulkarni',
    created: '2026-03-24',
    target: '2026-09-30',
    revision: 'C',
    priority: 'High',
    status: 'Approved',
    technicalNotes: 'Weld toe fatigue checked with the hot-spot stress method; minimum life 2 × 10^6 cycles.',
    linkedPartIds: [],
    linkedAssemblyIds: [],
    cadRef: 'CAD-024-004',
    tech: {
      structuralMember: 'Built-up section',
      plateThickness: 25,
      materialGrade: 'IS 2062 E350',
      weldType: 'Full penetration butt',
      weldDetails: 'Full penetration at the corner joints, 8 mm fillet elsewhere, UT on 100% of butt welds.',
      fabricationMethod: 'Manual fabrication',
      fabricationNotes: 'Stress relieve after welding; machining of the bolster faces after stress relief.',
    },
    revisions: [
      revisionEntry('A', '2026-03-24', 'K. Pillai', 'Frame concept.'),
      revisionEntry('B', '2026-05-18', 'K. Pillai', 'Corner gussets enlarged after the fatigue check.'),
      revisionEntry('C', '2026-07-02', 'K. Pillai', 'Stress relief note added; approved.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Press frame registered', by: 'K. Pillai', at: '2026-03-24' },
      { id: 'ACT-2', label: 'Approved', detail: 'Rev C approved', by: 'R. Kulkarni', at: '2026-07-02' },
    ],
  },
  {
    id: 'DES-2026-007',
    name: 'Enclosure door and hinge set',
    projectId: 'PRJ-2026-036',
    domain: 'Sheet Metal Design',
    category: 'Bend Details',
    description: 'Door leaf, hinge brackets and latch cut-outs for the modular enclosure platform.',
    scope: 'Door bends, hinge geometry, gasket channel and latch cut-out definition.',
    owner: 'S. Menon',
    engineer: 'V. Sharma',
    reviewer: 'N. Joshi',
    created: '2026-10-18',
    target: '2026-12-10',
    revision: 'A',
    priority: 'High',
    status: 'In Design',
    technicalNotes: 'Door stiffener hemmed on all four sides; hinge pins stainless steel.',
    linkedPartIds: ['PRT-2026-012', 'PRT-2026-013'],
    linkedAssemblyIds: ['ASM-2026-006'],
    cadRef: 'CAD-036-022',
    tech: {
      sheetMaterial: 'CRCA sheet',
      thickness: 2,
      bendAngle: 90,
      bendRadius: 2,
      bendAllowance: 3.4,
      flatPatternDimensions: '1,240 × 720 mm',
      formedDimensions: '600 × 350 mm door leaf',
    },
    revisions: [revisionEntry('A', '2026-10-18', 'V. Sharma', 'Door and hinge detail released.')],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Door and hinge set registered', by: 'V. Sharma', at: '2026-10-18' },
    ],
  },
  {
    id: 'DES-2026-008',
    name: 'Drive enclosure flat pattern package',
    projectId: 'PRJ-2026-022',
    domain: 'Sheet Metal Design',
    category: 'Flat Patterns',
    description: 'Flat pattern set for the wall-mounted drive enclosure with bend tables and cut-out programs.',
    scope: 'Flat patterns, bend allowance table, laser cut-out program references.',
    owner: 'S. Menon',
    engineer: 'S. Menon',
    reviewer: 'N. Joshi',
    created: '2026-07-16',
    target: '2026-11-06',
    revision: 'B',
    priority: 'Medium',
    status: 'Released',
    technicalNotes: 'Bend allowance per 1.5 mm CRCA at 90° = 2.6 mm using a 2 mm die.',
    linkedPartIds: ['PRT-2026-011'],
    linkedAssemblyIds: ['ASM-2026-006'],
    cadRef: 'CAD-022-011',
    tech: {
      sheetMaterial: 'CRCA sheet',
      thickness: 1.5,
      bendAngle: 90,
      bendRadius: 2,
      bendAllowance: 2.6,
      flatPatternDimensions: '1,260 × 840 mm',
      formedDimensions: '400 × 300 × 180 mm',
    },
    revisions: [
      revisionEntry('A', '2026-07-16', 'S. Menon', 'Flat pattern issued.'),
      revisionEntry('B', '2026-09-08', 'S. Menon', 'Bend relief revised after the first article.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Flat pattern package registered', by: 'S. Menon', at: '2026-07-16' },
      { id: 'ACT-2', label: 'Released', detail: 'Rev B released to production', by: 'N. Joshi', at: '2026-09-10' },
    ],
  },
  {
    id: 'DES-2026-009',
    name: 'Cooling water skid routing',
    projectId: 'PRJ-2026-033',
    domain: 'Piping Design',
    category: 'Piping Systems',
    description: 'Cooling water routing across the utility skid with valve schedule and support selection.',
    scope: 'Line routing, isometric generation, support and valve schedule.',
    owner: 'P. Deshmukh',
    engineer: 'P. Deshmukh',
    reviewer: 'A. Iyer',
    created: '2026-09-02',
    target: '2026-12-18',
    revision: 'B',
    priority: 'Medium',
    status: 'Submitted',
    technicalNotes: 'Allowable pressure drop 0.5 bar across the skid; supports every 3 m.',
    linkedPartIds: ['PRT-2026-014', 'PRT-2026-015', 'PRT-2026-016'],
    linkedAssemblyIds: ['ASM-2026-007'],
    cadRef: 'CAD-033-017',
    tech: {
      lineNumber: 'CW-1001-2"-CS',
      pipeMaterial: 'CS A106 Gr B',
      nominalPipeSize: '2 in',
      pipeSchedule: 'SCH 40',
      designPressure: 6,
      designTemperature: 60,
      fittingType: 'Gate valve',
      supportType: 'Pipe shoe',
      fluidService: 'Cooling water',
    },
    revisions: [
      revisionEntry('A', '2026-09-02', 'P. Deshmukh', 'Initial routing.'),
      revisionEntry('B', '2026-10-30', 'P. Deshmukh', 'Route moved to clear the instrument air header.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Piping routing registered', by: 'P. Deshmukh', at: '2026-09-02' },
      { id: 'ACT-2', label: 'Submitted', detail: 'Rev B submitted to review', by: 'P. Deshmukh', at: '2026-10-31' },
    ],
  },
  {
    id: 'DES-2026-010',
    name: 'Fermentation utility line details',
    projectId: 'PRJ-2026-019',
    domain: 'Piping Design',
    category: 'Line Details',
    description: 'Line details and isometric package for the fermentation utility block.',
    scope: 'Isometric production, support details and material take-off reconciliation.',
    owner: 'P. Deshmukh',
    engineer: 'K. Pillai',
    reviewer: 'A. Iyer',
    created: '2026-03-02',
    target: '2026-08-28',
    revision: 'B',
    priority: 'Low',
    status: 'Approved',
    technicalNotes: 'P&ID revision C is the frozen basis of design.',
    linkedPartIds: [],
    linkedAssemblyIds: [],
    cadRef: 'CAD-019-008',
    tech: {
      lineNumber: 'PIP-2014-3"-SS',
      pipeMaterial: 'SS 316L',
      nominalPipeSize: '3 in',
      pipeSchedule: 'SCH 10',
      designPressure: 4,
      designTemperature: 95,
      fittingType: 'Elbow',
      supportType: 'Hanger',
      fluidService: 'Fermentation broth',
    },
    revisions: [
      revisionEntry('A', '2026-03-02', 'K. Pillai', 'Isometric basis issued.'),
      revisionEntry('B', '2026-06-20', 'K. Pillai', 'Support spacing corrected to 2.8 m.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Line detail package registered', by: 'K. Pillai', at: '2026-03-02' },
      { id: 'ACT-2', label: 'Approved', detail: 'Rev B approved', by: 'A. Iyer', at: '2026-06-22' },
    ],
  },
  {
    id: 'DES-2026-011',
    name: 'Lubrication unit arrangement',
    projectId: 'PRJ-2026-026',
    domain: 'Equipment Design',
    category: 'Equipment Register',
    description:
      'Skid-mounted lubrication unit with a 120 L reservoir, gear pump and duplex filter arrangement.',
    scope: 'Equipment arrangement, nozzle schedule, skid envelope and lifting points.',
    owner: 'A. Iyer',
    engineer: 'P. Deshmukh',
    reviewer: 'N. Joshi',
    created: '2026-08-12',
    target: '2026-11-20',
    revision: 'B',
    priority: 'Critical',
    status: 'Under Review',
    technicalNotes: 'Skid weight 6.4 t against a 6.5 t lifting limit. One lifting point at the centre of gravity.',
    linkedPartIds: [],
    linkedAssemblyIds: [],
    cadRef: 'CAD-026-006',
    tech: {
      equipmentTag: 'LUB-2601',
      equipmentType: 'Skid',
      operatingConditions: '45 L/min at 4 bar, ambient 0–45 °C, three-shift operation.',
      designPressure: 6,
      designTemperature: 80,
      capacity: '120 L reservoir · 45 L/min',
      equipmentMaterial: 'IS 2062 E250 BR',
      datasheetReference: 'DS-LUB-2601 Rev A',
    },
    revisions: [
      revisionEntry('A', '2026-08-12', 'P. Deshmukh', 'Equipment arrangement issued.'),
      revisionEntry('B', '2026-10-14', 'P. Deshmukh', 'Reservoir thickness revised after the weight review.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Lubrication unit registered', by: 'P. Deshmukh', at: '2026-08-12' },
      { id: 'ACT-2', label: 'Submitted for review', detail: 'Rev B issued for review', by: 'P. Deshmukh', at: '2026-10-15' },
    ],
  },
  {
    id: 'DES-2026-012',
    name: 'Fan hub assembly arrangement',
    projectId: 'PRJ-2026-014',
    domain: 'Equipment Design',
    category: 'Mechanical Arrangement',
    description: 'Fan hub, blade roots and bolted interface arrangement for the induced draft cooling tower.',
    scope: 'Hub arrangement, blade root interface and bolted joint definition.',
    owner: 'N. Joshi',
    engineer: 'A. Iyer',
    reviewer: 'R. Kulkarni',
    created: '2026-09-08',
    target: '2026-12-22',
    revision: 'A',
    priority: 'Medium',
    status: 'In Design',
    technicalNotes: 'Root bolts M16 grade 10.9 preloaded to 210 Nm; hub checked at 1.5 × operating speed.',
    linkedPartIds: ['PRT-2026-018'],
    linkedAssemblyIds: [],
    cadRef: 'CAD-014-003',
    tech: {
      equipmentTag: 'FAN-1401',
      equipmentType: 'Fan assembly',
      operatingConditions: '147 rpm, blade tip speed 42 m/s, ambient up to 40 °C.',
      designPressure: 0,
      designTemperature: 60,
      capacity: 'Air flow 210,000 m³/h',
      equipmentMaterial: 'Aluminium 6061-T6',
      datasheetReference: 'DS-FAN-1401 Rev 0',
    },
    revisions: [revisionEntry('A', '2026-09-08', 'A. Iyer', 'Hub arrangement issued.')],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Fan hub arrangement registered', by: 'A. Iyer', at: '2026-09-08' },
    ],
  },
  {
    id: 'DES-2026-013',
    name: 'Sub-frame locating interface',
    projectId: 'PRJ-2026-017',
    domain: 'Automotive Components',
    category: 'Interfaces',
    description: 'Locating and clamping interface for the two-wheeler sub-frame welding fixture.',
    scope: 'Locating scheme, clamp positions and datum flow definition.',
    owner: 'D. Rao',
    engineer: 'D. Rao',
    reviewer: 'A. Iyer',
    created: '2026-10-10',
    target: '2027-01-20',
    revision: 'A',
    priority: 'Low',
    status: 'Draft',
    technicalNotes: 'Datum flow A → B → C with 3-2-1 locating; clamp access checked against the robot envelope.',
    linkedPartIds: ['PRT-2026-017'],
    linkedAssemblyIds: [],
    cadRef: 'CAD-017-002',
    tech: {
      componentCategory: 'Fixture',
      vehicleApplication: 'Two-wheeler sub-frame',
      interfaceType: 'Clamped',
      packagingDimensions: '480 × 320 × 210 mm',
      operatingConditions: 'Manual load/unload, 45 s cycle, 18 cycles/hour.',
      material: 'EN8',
      technicalSpecifications: 'Locating pins hardened to 55 HRC, repeatability ±0.05 mm, pneumatic clamps at 6 bar.',
    },
    revisions: [revisionEntry('A', '2026-10-10', 'D. Rao', 'Draft interface definition.')],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Interface definition drafted', by: 'D. Rao', at: '2026-10-10' },
    ],
  },
  {
    id: 'DES-2026-014',
    name: 'Genset drive shaft packaging',
    projectId: 'PRJ-2026-031',
    domain: 'Automotive Components',
    category: 'Packaging',
    description: 'Drive shaft packaging and clearance study for the diesel genset application.',
    scope: 'Packaging envelope, clearance to the frame and interface definition.',
    owner: 'D. Rao',
    engineer: 'V. Sharma',
    reviewer: 'R. Kulkarni',
    created: '2026-05-02',
    target: '2026-10-30',
    revision: 'B',
    priority: 'Low',
    status: 'Changes Requested',
    technicalNotes: 'Tolerance stack-up revised after the frame supplier changed the mounting pad height.',
    linkedPartIds: [],
    linkedAssemblyIds: [],
    cadRef: 'CAD-031-005',
    tech: {
      componentCategory: 'Powertrain component',
      vehicleApplication: 'Diesel genset 250 kVA',
      interfaceType: 'Bolted',
      packagingDimensions: '1,120 × 320 × 260 mm',
      operatingConditions: '1,500 rpm continuous, ambient up to 50 °C.',
      material: 'EN19',
      technicalSpecifications: 'Coupling run-out ≤ 0.1 mm, balancing grade G6.3 at 1,500 rpm.',
    },
    revisions: [
      revisionEntry('A', '2026-05-02', 'V. Sharma', 'Packaging study issued.'),
      revisionEntry('B', '2026-08-19', 'V. Sharma', 'Clearance revised for the new frame pad height.'),
    ],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Packaging study registered', by: 'V. Sharma', at: '2026-05-02' },
      { id: 'ACT-2', label: 'Changes requested', detail: 'Review asked for a new tolerance stack-up', by: 'R. Kulkarni', at: '2026-08-26' },
    ],
  },
  {
    id: 'DES-2026-015',
    name: 'Legacy worm drive proposal',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Drives',
    description: 'Worm drive alternative developed during concept stage and superseded by the helical gear train.',
    scope: 'Concept-level arrangement only; superseded before detail design.',
    owner: 'R. Kulkarni',
    engineer: 'V. Sharma',
    reviewer: 'N. Joshi',
    created: '2026-09-05',
    target: '2026-10-10',
    revision: 'A',
    priority: 'Low',
    status: 'Superseded',
    technicalNotes: 'Thermal margin 8 °C at 45 °C ambient — below the 15% target; concept not carried forward.',
    linkedPartIds: [],
    linkedAssemblyIds: [],
    cadRef: 'CAD-041-015',
    tech: {
      componentType: 'Drive',
      shaftDiameter: 70,
      shaftLength: 420,
      gearRatio: '40:1',
      bearingType: 'Deep groove ball',
      loadInfo: 'Same duty as the selected helical drive.',
      rotationalSpeed: 1470,
      material: 'EN8',
      designNotes: 'Superseded by DES-2026-001.',
    },
    revisions: [revisionEntry('A', '2026-09-05', 'V. Sharma', 'Concept arrangement issued, later superseded.')],
    activity: [
      { id: 'ACT-1', label: 'Design created', detail: 'Worm drive concept registered', by: 'V. Sharma', at: '2026-09-05' },
      { id: 'ACT-2', label: 'Superseded', detail: 'Replaced by the helical gear train', by: 'R. Kulkarni', at: '2026-09-20' },
    ],
  },
];

/* --------------------------------------------------------------- mock parts */
export const PARTS = [
  {
    id: 'PRT-2026-001',
    partNumber: 'MEC-041-001',
    name: 'Gearbox housing',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Cast part',
    parentAssemblyId: 'ASM-2026-001',
    material: 'Cast iron FG260',
    materialGrade: 'FG260',
    dimensions: '620 × 410 × 360 mm',
    length: 620,
    width: 410,
    height: 360,
    diameter: 0,
    thickness: 0,
    weight: 128,
    uom: 'nos',
    quantity: 1,
    revision: 'C',
    owner: 'D. Rao',
    status: 'Approved',
    notes: 'Horizontal split housing with line-bored bearing seats.',
    cadRef: 'CAD-041-014',
    revisions: [
      revisionEntry('A', '2026-09-15', 'D. Rao', 'Housing detail created.'),
      revisionEntry('B', '2026-10-04', 'D. Rao', 'Bearing boss diameter increased.'),
      revisionEntry('C', '2026-10-24', 'D. Rao', 'Split line moved for service access.'),
    ],
  },
  {
    id: 'PRT-2026-002',
    partNumber: 'MEC-041-002',
    name: 'Input shaft',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Machined part',
    parentAssemblyId: 'ASM-2026-002',
    material: 'EN19',
    materialGrade: 'EN19',
    dimensions: 'Ø85 × 640 mm',
    length: 640,
    width: 0,
    height: 0,
    diameter: 85,
    thickness: 0,
    weight: 24,
    uom: 'nos',
    quantity: 1,
    revision: 'B',
    owner: 'D. Rao',
    status: 'Approved',
    notes: 'Keyed input with a taper roller bearing seat at each end.',
    cadRef: 'CAD-041-016',
    revisions: [
      revisionEntry('A', '2026-09-18', 'D. Rao', 'Shaft detail created.'),
      revisionEntry('B', '2026-10-02', 'D. Rao', 'Keyway width revised to 20 mm.'),
    ],
  },
  {
    id: 'PRT-2026-003',
    partNumber: 'MEC-041-003',
    name: 'Helical gear pair',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Machined part',
    parentAssemblyId: 'ASM-2026-002',
    material: '20MnCr5',
    materialGrade: '20MnCr5',
    dimensions: 'Ø310 × 120 mm',
    length: 120,
    width: 0,
    height: 0,
    diameter: 310,
    thickness: 0,
    weight: 46,
    uom: 'set',
    quantity: 1,
    revision: 'B',
    owner: 'V. Sharma',
    status: 'Approved',
    notes: 'Case hardened 58 HRC, AGMA 10 accuracy.',
    cadRef: 'CAD-041-017',
    revisions: [
      revisionEntry('A', '2026-09-20', 'V. Sharma', 'Gear pair created.'),
      revisionEntry('B', '2026-10-10', 'V. Sharma', 'Face width increased to 120 mm.'),
    ],
  },
  {
    id: 'PRT-2026-004',
    partNumber: 'MEC-041-004',
    name: 'Bearing set 32217',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Purchased part',
    parentAssemblyId: 'ASM-2026-002',
    material: 'Bearing steel',
    materialGrade: '100Cr6',
    dimensions: 'Ø150 × 36 mm',
    length: 36,
    width: 0,
    height: 0,
    diameter: 150,
    thickness: 0,
    weight: 3.1,
    uom: 'set',
    quantity: 2,
    revision: 'A',
    owner: 'D. Rao',
    status: 'Released',
    notes: 'Taper roller bearing, dynamic rating 275 kN.',
    cadRef: 'CAD-041-018',
    revisions: [revisionEntry('A', '2026-09-22', 'D. Rao', 'Purchased bearing specified.')],
  },
  {
    id: 'PRT-2026-005',
    partNumber: 'MEC-041-005',
    name: 'Idler roller',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Fabricated part',
    parentAssemblyId: 'ASM-2026-003',
    material: 'IS 2062 E250 BR',
    materialGrade: 'E250 BR',
    dimensions: 'Ø159 × 1,200 mm',
    length: 1200,
    width: 0,
    height: 0,
    diameter: 159,
    thickness: 6,
    weight: 38,
    uom: 'nos',
    quantity: 12,
    revision: 'A',
    owner: 'V. Sharma',
    status: 'Approved',
    notes: 'Balanced roller with a 6 mm wall tube.',
    cadRef: 'CAD-041-019',
    revisions: [revisionEntry('A', '2026-09-26', 'V. Sharma', 'Roller detail created.')],
  },
  {
    id: 'PRT-2026-006',
    partNumber: 'MEC-041-006',
    name: 'Support bracket',
    projectId: 'PRJ-2026-041',
    domain: 'Fabrication Design',
    category: 'Fabricated part',
    parentAssemblyId: 'ASM-2026-003',
    material: 'IS 2062 E250 BR',
    materialGrade: 'E250 BR',
    dimensions: '240 × 180 × 120 mm',
    length: 240,
    width: 180,
    height: 120,
    diameter: 0,
    thickness: 10,
    weight: 9.6,
    uom: 'nos',
    quantity: 24,
    revision: 'B',
    owner: 'K. Pillai',
    status: 'Under Review',
    notes: 'Bracket with two slotted holes for belt tracking adjustment.',
    cadRef: 'CAD-041-020',
    revisions: [
      revisionEntry('A', '2026-09-27', 'K. Pillai', 'Bracket created.'),
      revisionEntry('B', '2026-10-29', 'K. Pillai', 'Slot length increased for tracking travel.'),
    ],
  },
  {
    id: 'PRT-2026-007',
    partNumber: 'MEC-041-007',
    name: 'Conveyor belt 1200 EP',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    category: 'Purchased part',
    parentAssemblyId: 'ASM-2026-003',
    material: 'EP fabric / rubber',
    materialGrade: 'EP 630/3',
    dimensions: '1,200 × 8 mm × 42 m',
    length: 42000,
    width: 1200,
    height: 0,
    diameter: 0,
    thickness: 8,
    weight: 480,
    uom: 'nos',
    quantity: 1,
    revision: 'A',
    owner: 'R. Kulkarni',
    status: 'Approved',
    notes: 'Three-ply EP belt with 6 mm top cover.',
    cadRef: 'CAD-041-021',
    revisions: [revisionEntry('A', '2026-09-29', 'R. Kulkarni', 'Belt specification created.')],
  },
  {
    id: 'PRT-2026-008',
    partNumber: 'FAB-038-001',
    name: 'Base frame weldment',
    projectId: 'PRJ-2026-038',
    domain: 'Fabrication Design',
    category: 'Fabricated part',
    parentAssemblyId: 'ASM-2026-005',
    material: 'IS 2062 E250 BR',
    materialGrade: 'E250 BR',
    dimensions: '3,200 × 1,800 × 900 mm',
    length: 3200,
    width: 1800,
    height: 900,
    diameter: 0,
    thickness: 12,
    weight: 640,
    uom: 'nos',
    quantity: 1,
    revision: 'B',
    owner: 'K. Pillai',
    status: 'Under Review',
    notes: 'ISMB 200 frame with 12 mm base plates and lifting lugs.',
    cadRef: 'CAD-038-013',
    revisions: [
      revisionEntry('A', '2026-08-10', 'K. Pillai', 'Frame weldment created.'),
      revisionEntry('B', '2026-10-28', 'K. Pillai', 'Diagonal bracing added.'),
    ],
  },
  {
    id: 'PRT-2026-009',
    partNumber: 'FAB-038-002',
    name: 'Diagonal brace',
    projectId: 'PRJ-2026-038',
    domain: 'Fabrication Design',
    category: 'Fabricated part',
    parentAssemblyId: 'ASM-2026-005',
    material: 'IS 2062 E250 BR',
    materialGrade: 'E250 BR',
    dimensions: '1,950 × 80 × 80 mm',
    length: 1950,
    width: 80,
    height: 80,
    diameter: 0,
    thickness: 6,
    weight: 18,
    uom: 'nos',
    quantity: 4,
    revision: 'A',
    owner: 'K. Pillai',
    status: 'Approved',
    notes: 'SHS 80 × 80 × 6 brace with flattened ends.',
    cadRef: 'CAD-038-014',
    revisions: [revisionEntry('A', '2026-08-12', 'K. Pillai', 'Brace created.')],
  },
  {
    id: 'PRT-2026-010',
    partNumber: 'FAB-038-003',
    name: 'Base plate 12 mm',
    projectId: 'PRJ-2026-038',
    domain: 'Fabrication Design',
    category: 'Fabricated part',
    parentAssemblyId: 'ASM-2026-005',
    material: 'IS 2062 E250 BR',
    materialGrade: 'E250 BR',
    dimensions: '320 × 320 × 12 mm',
    length: 320,
    width: 320,
    height: 12,
    diameter: 0,
    thickness: 12,
    weight: 7.8,
    uom: 'nos',
    quantity: 8,
    revision: 'A',
    owner: 'K. Pillai',
    status: 'Approved',
    notes: 'Anchor bolt holes 4 × Ø22 on a 250 × 250 mm grid.',
    cadRef: 'CAD-038-015',
    revisions: [revisionEntry('A', '2026-08-12', 'K. Pillai', 'Base plate created.')],
  },
  {
    id: 'PRT-2026-011',
    partNumber: 'SMT-036-001',
    name: 'Enclosure side panel',
    projectId: 'PRJ-2026-036',
    domain: 'Sheet Metal Design',
    category: 'Sheet metal part',
    parentAssemblyId: 'ASM-2026-006',
    material: 'CRCA sheet',
    materialGrade: 'CRCA 1.5',
    dimensions: '1,180 × 420 × 1.5 mm',
    length: 1180,
    width: 420,
    height: 1.5,
    diameter: 0,
    thickness: 1.5,
    weight: 5.9,
    uom: 'nos',
    quantity: 2,
    revision: 'B',
    owner: 'V. Sharma',
    status: 'Approved',
    notes: 'Louvred side panel with a formed gasket channel.',
    cadRef: 'CAD-036-024',
    revisions: [
      revisionEntry('A', '2026-10-10', 'V. Sharma', 'Panel created.'),
      revisionEntry('B', '2026-11-02', 'V. Sharma', 'Louvre spacing revised.'),
    ],
  },
  {
    id: 'PRT-2026-012',
    partNumber: 'SMT-036-002',
    name: 'Enclosure door',
    projectId: 'PRJ-2026-036',
    domain: 'Sheet Metal Design',
    category: 'Sheet metal part',
    parentAssemblyId: 'ASM-2026-006',
    material: 'CRCA sheet',
    materialGrade: 'CRCA 2.0',
    dimensions: '600 × 350 × 2 mm',
    length: 600,
    width: 350,
    height: 2,
    diameter: 0,
    thickness: 2,
    weight: 6.4,
    uom: 'nos',
    quantity: 1,
    revision: 'A',
    owner: 'V. Sharma',
    status: 'In Design',
    notes: 'Door leaf with hemmed stiffeners and a quarter-turn latch cut-out.',
    cadRef: 'CAD-036-022',
    revisions: [revisionEntry('A', '2026-10-18', 'V. Sharma', 'Door leaf created.')],
  },
  {
    id: 'PRT-2026-013',
    partNumber: 'SMT-036-003',
    name: 'Hinge bracket',
    projectId: 'PRJ-2026-036',
    domain: 'Sheet Metal Design',
    category: 'Sheet metal part',
    parentAssemblyId: 'ASM-2026-006',
    material: 'SS 304',
    materialGrade: 'SS 304',
    dimensions: '80 × 45 × 2 mm',
    length: 80,
    width: 45,
    height: 2,
    diameter: 0,
    thickness: 2,
    weight: 0.3,
    uom: 'nos',
    quantity: 4,
    revision: 'A',
    owner: 'V. Sharma',
    status: 'Approved',
    notes: 'Stainless hinge bracket with a 6 mm pin.',
    cadRef: 'CAD-036-025',
    revisions: [revisionEntry('A', '2026-10-19', 'V. Sharma', 'Hinge bracket created.')],
  },
  {
    id: 'PRT-2026-014',
    partNumber: 'PIP-033-001',
    name: 'Pipe spool DN50',
    projectId: 'PRJ-2026-033',
    domain: 'Piping Design',
    category: 'Piping component',
    parentAssemblyId: 'ASM-2026-007',
    material: 'CS A106 Gr B',
    materialGrade: 'A106 Gr B',
    dimensions: 'DN50 × 2,400 mm',
    length: 2400,
    width: 0,
    height: 0,
    diameter: 60.3,
    thickness: 3.9,
    weight: 22,
    uom: 'nos',
    quantity: 6,
    revision: 'B',
    owner: 'P. Deshmukh',
    status: 'Under Review',
    notes: 'SCH 40 spool with two weld-neck flanges.',
    cadRef: 'CAD-033-017',
    revisions: [
      revisionEntry('A', '2026-09-05', 'P. Deshmukh', 'Spool created.'),
      revisionEntry('B', '2026-10-30', 'P. Deshmukh', 'Spool shortened to clear the header.'),
    ],
  },
  {
    id: 'PRT-2026-015',
    partNumber: 'PIP-033-002',
    name: 'Pipe support shoe',
    projectId: 'PRJ-2026-033',
    domain: 'Piping Design',
    category: 'Fabricated part',
    parentAssemblyId: 'ASM-2026-007',
    material: 'IS 2062 E250 BR',
    materialGrade: 'E250 BR',
    dimensions: '200 × 120 × 80 mm',
    length: 200,
    width: 120,
    height: 80,
    diameter: 0,
    thickness: 8,
    weight: 3.2,
    uom: 'nos',
    quantity: 9,
    revision: 'A',
    owner: 'K. Pillai',
    status: 'Approved',
    notes: 'Shoe with a 100 mm insulation allowance.',
    cadRef: 'CAD-033-018',
    revisions: [revisionEntry('A', '2026-09-06', 'K. Pillai', 'Support shoe created.')],
  },
  {
    id: 'PRT-2026-016',
    partNumber: 'PIP-033-003',
    name: 'Gate valve DN50',
    projectId: 'PRJ-2026-033',
    domain: 'Piping Design',
    category: 'Purchased part',
    parentAssemblyId: 'ASM-2026-007',
    material: 'Cast steel WCB',
    materialGrade: 'WCB',
    dimensions: 'DN50 · 200 mm face to face',
    length: 200,
    width: 0,
    height: 0,
    diameter: 50,
    thickness: 0,
    weight: 14,
    uom: 'nos',
    quantity: 2,
    revision: 'A',
    owner: 'P. Deshmukh',
    status: 'Approved',
    notes: 'Gate valve, 150# rating, flanged ends.',
    cadRef: 'CAD-033-019',
    revisions: [revisionEntry('A', '2026-09-07', 'P. Deshmukh', 'Valve specified.')],
  },
  {
    id: 'PRT-2026-017',
    partNumber: 'AUT-029-001',
    name: 'Motor mount bracket',
    projectId: 'PRJ-2026-029',
    domain: 'Automotive Components',
    category: 'Cast part',
    parentAssemblyId: '',
    material: 'LM6 aluminium',
    materialGrade: 'LM6',
    dimensions: '360 × 240 × 180 mm',
    length: 360,
    width: 240,
    height: 180,
    diameter: 0,
    thickness: 0,
    weight: 12.4,
    uom: 'nos',
    quantity: 1,
    revision: 'A',
    owner: 'N. Joshi',
    status: 'Draft',
    notes: 'Casting concept for the bracket; no parent assembly assigned yet.',
    cadRef: 'CAD-029-006',
    revisions: [revisionEntry('A', '2026-10-14', 'N. Joshi', 'Casting concept created.')],
  },
  {
    id: 'PRT-2026-018',
    partNumber: 'EQP-014-001',
    name: 'Fan hub forging',
    projectId: 'PRJ-2026-014',
    domain: 'Equipment Design',
    category: 'Forged part',
    parentAssemblyId: '',
    material: 'Aluminium 6061-T6',
    materialGrade: '6061-T6',
    dimensions: 'Ø620 × 140 mm',
    length: 140,
    width: 0,
    height: 0,
    diameter: 620,
    thickness: 0,
    weight: 58,
    uom: 'nos',
    quantity: 1,
    revision: 'A',
    owner: 'A. Iyer',
    status: 'In Design',
    notes: 'Forged hub with six bolted blade roots.',
    cadRef: 'CAD-014-003',
    revisions: [revisionEntry('A', '2026-09-12', 'A. Iyer', 'Forging concept created.')],
  },
];

/* ----------------------------------------------------------- mock assemblies */
export const ASSEMBLIES = [
  {
    id: 'ASM-2026-001',
    number: 'ASM-041-100',
    name: 'Conveyor drive assembly',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    parentAssemblyId: '',
    description: 'Top-level conveyor drive and belt assembly for the 120 t/h material handling line.',
    revision: 'C',
    owner: 'R. Kulkarni',
    status: 'Approved',
    notes: 'Top-level assembly; subassemblies are the drive and conveyor groups.',
    revisions: [
      revisionEntry('A', '2026-09-10', 'R. Kulkarni', 'Top-level assembly created.'),
      revisionEntry('C', '2026-10-26', 'R. Kulkarni', 'Structure confirmed after design approval.'),
    ],
  },
  {
    id: 'ASM-2026-002',
    number: 'ASM-041-110',
    name: 'Drive assembly',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    parentAssemblyId: 'ASM-2026-001',
    description: 'Motor, gear train, shafts and bearings inside the drive housing.',
    revision: 'B',
    owner: 'D. Rao',
    status: 'Approved',
    notes: 'Bolts directly onto the main frame of the top-level assembly.',
    revisions: [
      revisionEntry('A', '2026-09-12', 'D. Rao', 'Drive assembly created.'),
      revisionEntry('B', '2026-10-06', 'D. Rao', 'Bearing set updated to 32217.'),
    ],
  },
  {
    id: 'ASM-2026-003',
    number: 'ASM-041-120',
    name: 'Conveyor assembly',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    parentAssemblyId: 'ASM-2026-001',
    description: 'Idlers, support brackets and the belt run of the conveyor.',
    revision: 'B',
    owner: 'V. Sharma',
    status: 'In Design',
    notes: 'Belt tracking adjustment is still under review.',
    revisions: [
      revisionEntry('A', '2026-09-14', 'V. Sharma', 'Conveyor assembly created.'),
      revisionEntry('B', '2026-10-30', 'V. Sharma', 'Bracket slots revised for tracking travel.'),
    ],
  },
  {
    id: 'ASM-2026-004',
    number: 'ASM-041-111',
    name: 'Motor mount subassembly',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    parentAssemblyId: 'ASM-2026-002',
    description: 'Motor mounting plate and isolator pads inside the drive assembly.',
    revision: 'A',
    owner: 'D. Rao',
    status: 'Draft',
    notes: 'Awaiting the final motor datasheet before release.',
    revisions: [revisionEntry('A', '2026-10-18', 'D. Rao', 'Subassembly created.')],
  },
  {
    id: 'ASM-2026-005',
    number: 'ASM-038-200',
    name: 'Feed system support frame',
    projectId: 'PRJ-2026-038',
    domain: 'Fabrication Design',
    parentAssemblyId: '',
    description: 'Welded structural frame with base plates and diagonal bracing.',
    revision: 'B',
    owner: 'K. Pillai',
    status: 'Under Review',
    notes: 'Seismic bracing added in Rev B.',
    revisions: [
      revisionEntry('A', '2026-08-08', 'K. Pillai', 'Frame assembly created.'),
      revisionEntry('B', '2026-10-28', 'K. Pillai', 'Bracing added.'),
    ],
  },
  {
    id: 'ASM-2026-006',
    number: 'ASM-036-300',
    name: 'Control panel housing',
    projectId: 'PRJ-2026-036',
    domain: 'Sheet Metal Design',
    parentAssemblyId: '',
    description: 'Modular enclosure with panels, door and hinge set.',
    revision: 'B',
    owner: 'V. Sharma',
    status: 'Under Review',
    notes: 'Panel seam line awaiting customer sign-off.',
    revisions: [
      revisionEntry('A', '2026-10-11', 'V. Sharma', 'Housing assembly created.'),
      revisionEntry('B', '2026-11-02', 'V. Sharma', 'Seam line revised.'),
    ],
  },
  {
    id: 'ASM-2026-007',
    number: 'ASM-033-400',
    name: 'Utility skid piping assembly',
    projectId: 'PRJ-2026-033',
    domain: 'Piping Design',
    parentAssemblyId: '',
    description: 'Cooling water spools, supports and valves on the utility skid.',
    revision: 'B',
    owner: 'P. Deshmukh',
    status: 'In Design',
    notes: 'Valve schedule to be frozen with the P&ID revision D.',
    revisions: [
      revisionEntry('A', '2026-09-03', 'P. Deshmukh', 'Piping assembly created.'),
      revisionEntry('B', '2026-10-30', 'P. Deshmukh', 'Spool route revised.'),
    ],
  },
];

/* --------------------------------------------------------- mock calculations */
function input(key, label, value, unit) {
  return { key, label, value: String(value), unit };
}

function result(key, label, value, unit) {
  return { key, label, value: String(value), unit };
}

export const CALCULATIONS = [
  {
    id: 'CAL-2026-001',
    title: 'Input shaft torque and diameter check',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    linkedType: 'part',
    linkedId: 'PRT-2026-002',
    calcType: 'Shaft Design',
    description: 'Torque capacity and minimum diameter check for the gearbox input shaft at rated power.',
    inputs: [
      input('p', 'Rated power', 45, 'kW'),
      input('n', 'Rotational speed', 1470, 'rpm'),
      input('sf', 'Service factor', 1.8, '-'),
      input('tau', 'Allowable shear stress', 55, 'N/mm²'),
    ],
    assumptions:
      'Steady duty with 1.8 × starting torque; keyway stress concentration covered by the allowable shear stress; no axial load on the input shaft.',
    formulaRef: 'T = 9550 × P / n; d = (16 × T × SF / (π × τ))^(1/3) — standard torsion formula for a solid circular shaft.',
    results: [
      result('t', 'Rated torque', 292, 'N·m'),
      result('td', 'Design torque (with service factor)', 526, 'N·m'),
      result('d', 'Minimum shaft diameter', 36.3, 'mm'),
      result('dd', 'Selected shaft diameter', 85, 'mm'),
    ],
    resultUnits: 'N·m, mm',
    notes: 'Selected diameter includes the bearing seat and keyway allowance; final size governed by bearing bore.',
    preparedBy: 'D. Rao',
    verifiedBy: 'N. Joshi',
    calcDate: '2026-09-19',
    revision: 'B',
    verificationStatus: 'Verified',
    attachments: [
      { name: 'shaft-torque-check.pdf', size: 412 },
      { name: 'bearing-seat-detail.dwg', size: 1180 },
    ],
    verification: [
      { date: '2026-09-22', by: 'N. Joshi', decision: 'Verified', comment: 'Formula and unit consistency checked; selected diameter confirmed against the bearing bore.' },
    ],
    revisions: [
      revisionEntry('A', '2026-09-16', 'D. Rao', 'Initial torque check.'),
      revisionEntry('B', '2026-09-19', 'D. Rao', 'Service factor updated to 1.8 after the duty review.'),
    ],
  },
  {
    id: 'CAL-2026-002',
    title: 'Gear pair bending stress estimate',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    linkedType: 'part',
    linkedId: 'PRT-2026-003',
    calcType: 'Gear Design',
    description: 'Preliminary bending stress check for the output helical gear stage.',
    inputs: [
      input('ft', 'Tangential load', 14200, 'N'),
      input('b', 'Face width', 120, 'mm'),
      input('m', 'Normal module', 4, 'mm'),
      input('y', 'Lewis form factor', 0.42, '-'),
    ],
    assumptions: 'Load shared evenly across the face width; Lewis form factor taken for 25 teeth; dynamic factor not applied at this stage.',
    formulaRef: 'σ = Ft / (b × m × Y) — Lewis bending equation, applicable to preliminary spur and helical gear sizing.',
    results: [
      result('sb', 'Bending stress', 70.4, 'N/mm²'),
      result('sa', 'Allowable bending stress', 320, 'N/mm²'),
      result('fs', 'Factor of safety', 4.5, '-'),
    ],
    resultUnits: 'N/mm², -',
    notes: 'Preliminary only — final gear rating must be confirmed with the gear vendor and the AGMA rating procedure.',
    preparedBy: 'D. Rao',
    verifiedBy: '',
    calcDate: '2026-09-28',
    revision: 'A',
    verificationStatus: 'Pending Verification',
    attachments: [{ name: 'gear-load-case.pdf', size: 260 }],
    verification: [],
    revisions: [revisionEntry('A', '2026-09-28', 'D. Rao', 'Preliminary bending estimate issued.')],
  },
  {
    id: 'CAL-2026-003',
    title: 'Bearing life for output shaft',
    projectId: 'PRJ-2026-041',
    domain: 'Machine Design',
    linkedType: 'part',
    linkedId: 'PRT-2026-004',
    calcType: 'Bearing Selection',
    description: 'Basic rating life of the 32217 taper roller bearing at the output shaft load.',
    inputs: [
      input('c', 'Dynamic load rating', 275, 'kN'),
      input('p', 'Equivalent dynamic load', 21.6, 'kN'),
      input('n', 'Rotational speed', 61, 'rpm'),
      input('e', 'Life exponent', 3.33, '-'),
    ],
    assumptions: 'Equivalent load includes radial and axial components; lubricant film and contamination factors not applied.',
    formulaRef: 'L10 = (C / P)^p million revolutions; L10h = L10 × 10^6 / (60 × n) — ISO 281 basic rating life.',
    results: [
      result('l10', 'Basic rating life', 6120, 'million rev'),
      result('lh', 'Rating life in hours', 1672000, 'h'),
    ],
    resultUnits: 'million rev, h',
    notes: 'Life is well above the 26,000 h target; the thermal limit governs the final selection.',
    preparedBy: 'D. Rao',
    verifiedBy: 'N. Joshi',
    calcDate: '2026-10-04',
    revision: 'A',
    verificationStatus: 'Verified',
    attachments: [],
    verification: [
      { date: '2026-10-06', by: 'N. Joshi', decision: 'Verified', comment: 'Load and speed inputs match the duty sheet.' },
    ],
    revisions: [revisionEntry('A', '2026-10-04', 'D. Rao', 'Bearing life check issued.')],
  },
  {
    id: 'CAL-2026-004',
    title: 'Frame weld toe stress check',
    projectId: 'PRJ-2026-024',
    domain: 'Fabrication Design',
    linkedType: 'design',
    linkedId: 'DES-2026-006',
    calcType: 'Weld Strength',
    description: 'Weld toe stress at the press frame corner joint under the rated press load.',
    inputs: [
      input('f', 'Rated press load', 2000, 'kN'),
      input('l', 'Weld length', 1600, 'mm'),
      input('t', 'Throat thickness', 8, 'mm'),
      input('fa', 'Allowable weld stress', 110, 'N/mm²'),
    ],
    assumptions: 'Load shared equally between the two corner joints; fillet throat governs; fatigue assessed separately with the hot-spot method.',
    formulaRef: 'σw = F / (2 × L × a) — static fillet weld stress on the throat, applicable to symmetric corner joints.',
    results: [
      result('sw', 'Weld stress', 78.1, 'N/mm²'),
      result('fs', 'Factor of safety', 1.41, '-'),
    ],
    resultUnits: 'N/mm², -',
    notes: 'Static check only. Fatigue life is covered by the hot-spot stress study issued with the frame package.',
    preparedBy: 'K. Pillai',
    verifiedBy: 'R. Kulkarni',
    calcDate: '2026-06-14',
    revision: 'B',
    verificationStatus: 'Verified',
    attachments: [{ name: 'weld-map.pdf', size: 890 }],
    verification: [
      { date: '2026-06-18', by: 'R. Kulkarni', decision: 'Verified', comment: 'Weld lengths verified against the frame drawing.' },
    ],
    revisions: [
      revisionEntry('A', '2026-05-30', 'K. Pillai', 'Initial static weld check.'),
      revisionEntry('B', '2026-06-14', 'K. Pillai', 'Weld throat updated to 8 mm.'),
    ],
  },
  {
    id: 'CAL-2026-005',
    title: 'Sheet metal bend allowance — 1.5 mm CRCA',
    projectId: 'PRJ-2026-022',
    domain: 'Sheet Metal Design',
    linkedType: 'part',
    linkedId: 'PRT-2026-011',
    calcType: 'Sheet Metal Bend Calculation',
    description: 'Bend allowance and flat length for a 90° bend in 1.5 mm CRCA using a 2 mm die.',
    inputs: [
      input('t', 'Material thickness', 1.5, 'mm'),
      input('r', 'Inside bend radius', 2, 'mm'),
      input('a', 'Bend angle', 90, 'deg'),
      input('k', 'K-factor', 0.44, '-'),
    ],
    assumptions: 'K-factor 0.44 as measured on the shop press brake; bend relief present at both ends; material grain direction ignored.',
    formulaRef: 'BA = (π / 180) × A × (R + K × T) — standard bend allowance formula for air bending.',
    results: [
      result('ba', 'Bend allowance', 2.6, 'mm'),
      result('bd', 'Bend deduction', 0.9, 'mm'),
    ],
    resultUnits: 'mm',
    notes: 'First-article flat pattern confirmed the allowance within ±0.2 mm.',
    preparedBy: 'S. Menon',
    verifiedBy: 'N. Joshi',
    calcDate: '2026-07-20',
    revision: 'A',
    verificationStatus: 'Verified',
    attachments: [{ name: 'bend-table.xlsx', size: 180 }],
    verification: [
      { date: '2026-07-24', by: 'N. Joshi', decision: 'Verified', comment: 'Matched the first-article measurement.' },
    ],
    revisions: [revisionEntry('A', '2026-07-20', 'S. Menon', 'Bend allowance issued.')],
  },
  {
    id: 'CAL-2026-006',
    title: 'Cooling water pressure drop estimate',
    projectId: 'PRJ-2026-033',
    domain: 'Piping Design',
    linkedType: 'design',
    linkedId: 'DES-2026-009',
    calcType: 'Pressure / Pipe Calculation',
    description: 'Order-of-magnitude pressure drop across the cooling water skid at design flow.',
    inputs: [
      input('q', 'Flow rate', 18, 'm³/h'),
      input('d', 'Internal diameter', 52.5, 'mm'),
      input('l', 'Equivalent length', 46, 'm'),
      input('f', 'Friction factor', 0.022, '-'),
      input('rho', 'Density', 998, 'kg/m³'),
    ],
    assumptions: 'Equivalent length includes fittings and valves; incompressible flow at 30 °C; fouling factor not included.',
    formulaRef: 'Δp = f × (L / D) × (ρ × v² / 2) — Darcy–Weisbach for incompressible pipe flow.',
    results: [
      result('v', 'Velocity', 2.31, 'm/s'),
      result('dp', 'Pressure drop', 0.51, 'bar'),
    ],
    resultUnits: 'm/s, bar',
    notes: 'Marginally above the 0.5 bar allowance — route review under way in Rev B.',
    preparedBy: 'P. Deshmukh',
    verifiedBy: '',
    calcDate: '2026-10-12',
    revision: 'A',
    verificationStatus: 'Changes Requested',
    attachments: [{ name: 'line-list-CW.pdf', size: 320 }],
    verification: [
      { date: '2026-10-16', by: 'A. Iyer', decision: 'Changes Requested', comment: 'Include the valve pressure drop and re-run at the revised route length.' },
    ],
    revisions: [revisionEntry('A', '2026-10-12', 'P. Deshmukh', 'Initial pressure drop estimate.')],
  },
  {
    id: 'CAL-2026-007',
    title: 'Lubrication unit weight estimate',
    projectId: 'PRJ-2026-026',
    domain: 'Equipment Design',
    linkedType: 'design',
    linkedId: 'DES-2026-011',
    calcType: 'Weight Calculation',
    description: 'Dry and operating weight estimate for the lubrication skid against the lifting limit.',
    inputs: [
      input('sf', 'Steel frame mass', 1850, 'kg'),
      input('rv', 'Reservoir mass (empty)', 620, 'kg'),
      input('oil', 'Oil mass at full reservoir', 108, 'kg'),
      input('pm', 'Pump and filter mass', 340, 'kg'),
      input('misc', 'Instrumentation and piping', 120, 'kg'),
    ],
    assumptions: 'Dry weight excludes oil; operating weight includes a full reservoir; lifting accessories not included.',
    formulaRef: 'W = Σ component masses; operating weight adds the full fluid mass.',
    results: [
      result('dry', 'Dry weight', 2930, 'kg'),
      result('wet', 'Operating weight', 3038, 'kg'),
      result('margin', 'Margin to 6.5 t limit', 3462, 'kg'),
    ],
    resultUnits: 'kg',
    notes: 'Well inside the lifting limit after the reservoir thickness revision.',
    preparedBy: 'P. Deshmukh',
    verifiedBy: '',
    calcDate: '2026-10-20',
    revision: 'B',
    verificationStatus: 'Pending Verification',
    attachments: [],
    verification: [],
    revisions: [
      revisionEntry('A', '2026-09-30', 'P. Deshmukh', 'Initial weight estimate.'),
      revisionEntry('B', '2026-10-20', 'P. Deshmukh', 'Reservoir mass updated after the thickness change.'),
    ],
  },
  {
    id: 'CAL-2026-008',
    title: 'Motor bracket bolt preload check',
    projectId: 'PRJ-2026-029',
    domain: 'Automotive Components',
    linkedType: 'part',
    linkedId: 'PRT-2026-017',
    calcType: 'Custom Calculation',
    description: 'Preload and slip resistance check for the four M16 bracket bolts.',
    inputs: [
      input('t', 'Tightening torque', 210, 'N·m'),
      input('k', 'Nut factor', 0.2, '-'),
      input('n', 'Number of bolts', 4, '-'),
      input('mu', 'Friction coefficient', 0.15, '-'),
    ],
    assumptions: 'Torque-controlled tightening with a calibrated wrench; friction coefficient from the supplier data sheet.',
    formulaRef: 'F = T / (K × d); slip resistance = μ × F × n — preload from tightening torque.',
    results: [
      result('f', 'Preload per bolt', 65.6, 'kN'),
      result('slip', 'Slip resistance', 39.4, 'kN'),
    ],
    resultUnits: 'kN',
    notes: 'Draft — the bolt size may change with the casting redesign.',
    preparedBy: 'N. Joshi',
    verifiedBy: '',
    calcDate: '2026-10-16',
    revision: 'A',
    verificationStatus: 'Draft',
    attachments: [],
    verification: [],
    revisions: [revisionEntry('A', '2026-10-16', 'N. Joshi', 'Draft preload check.')],
  },
];

/* ------------------------------------------------------------------ helpers */
function nextNumeric(records, prefix) {
  const highest = records.reduce((max, record) => {
    const numeric = Number(String(record.id).split('-').pop());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}

export function nextDesignId(designs) {
  return nextNumeric(designs, 'DES-2026');
}

export function nextPartId(parts) {
  return nextNumeric(parts, 'PRT-2026');
}

/** Part numbers are unique across the shared register. */
export function isPartNumberUnique(parts, partNumber, excludeId = '') {
  const normalized = String(partNumber || '').trim().toUpperCase();
  if (!normalized) return false;
  return !parts.some(
    (part) =>
      part.id !== excludeId &&
      String(part.partNumber || '').trim().toUpperCase() === normalized,
  );
}

/** Return a unique variant of a part number, appending a numeric suffix. */
export function uniquePartNumber(parts, desired) {
  const base = String(desired || '').trim();
  if (!base || isPartNumberUnique(parts, base)) return base;
  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (!isPartNumberUnique(parts, candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export function nextAssemblyId(assemblies) {
  return nextNumeric(assemblies, 'ASM-2026');
}

export function nextCalculationId(calcs) {
  return nextNumeric(calcs, 'CAL-2026');
}

export function projectName(projects, projectId) {
  return projects.find((project) => project.id === projectId)?.name || 'Unassigned';
}

export function partLabel(parts, partId) {
  const part = parts.find((row) => row.id === partId);
  return part ? `${part.partNumber} · ${part.name}` : 'Not linked';
}

export function assemblyLabel(assemblies, assemblyId) {
  const assembly = assemblies.find((row) => row.id === assemblyId);
  return assembly ? `${assembly.number} · ${assembly.name}` : 'Not linked';
}

export function linkedRecordLabel(record, parts, assemblies, designs) {
  if (!record) return 'Not linked';
  if (record.linkedType === 'part') return partLabel(parts, record.linkedId);
  if (record.linkedType === 'assembly') return assemblyLabel(assemblies, record.linkedId);
  if (record.linkedType === 'design') {
    const design = designs.find((row) => row.id === record.linkedId);
    return design ? `${design.id} · ${design.name}` : 'Not linked';
  }
  return 'Not linked';
}

/** Child assemblies one level down. */
export function childAssemblies(assemblies, parentId) {
  return assemblies.filter((assembly) => assembly.parentAssemblyId === parentId);
}

/** Parts directly inside an assembly. */
export function assemblyParts(parts, assemblyId) {
  return parts.filter((part) => part.parentAssemblyId === assemblyId);
}

/** Ancestors of an assembly, top-down. */
export function assemblyPath(assemblies, assemblyId) {
  const path = [];
  let current = assemblies.find((assembly) => assembly.id === assemblyId);
  const guard = new Set();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current);
    current = assemblies.find((row) => row.id === current.parentAssemblyId);
  }
  return path;
}

/** A parent cannot be the assembly itself or any of its descendants. */
export function wouldCreateCycle(assemblies, assemblyId, parentId) {
  if (!parentId || !assemblyId) return false;
  if (parentId === assemblyId) return true;
  let current = assemblies.find((row) => row.id === parentId);
  const guard = new Set();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    if (current.parentAssemblyId === assemblyId) return true;
    current = assemblies.find((row) => row.id === current.parentAssemblyId);
  }
  return false;
}

/** Direct parts of an assembly plus every descendant assembly's parts. */
export function assemblyTreePartCount(assemblies, parts, assemblyId) {
  const own = assemblyParts(parts, assemblyId).length;
  return childAssemblies(assemblies, assemblyId).reduce(
    (total, child) => total + assemblyTreePartCount(assemblies, parts, child.id),
    own,
  );
}

export function assemblyTreePartIds(assemblies, parts, assemblyId) {
  const ids = assemblyParts(parts, assemblyId).map((part) => part.id);
  childAssemblies(assemblies, assemblyId).forEach((child) => {
    ids.push(...assemblyTreePartIds(assemblies, parts, child.id));
  });
  return ids;
}

export function designsForDomain(designs, domainKey) {
  if (!domainKey || domainKey === 'all') return designs;
  const domain = DESIGN_DOMAINS.find((row) => row.key === domainKey);
  if (!domain) return designs;
  return designs.filter((design) => design.domain === domain.label);
}

export function buildMechanicalKpis({ designs, parts, assemblies, calculations }) {
  return {
    designs: {
      total: designs.length,
      inProgress: designs.filter((design) => design.status === 'In Design').length,
      review: designs.filter((design) =>
        ['Submitted', 'Under Review'].includes(design.status),
      ).length,
      approved: designs.filter((design) => ['Approved', 'Released'].includes(design.status)).length,
    },
    parts: {
      total: parts.length,
      assemblies: assemblies.length,
      active: parts.filter((part) => ['Draft', 'In Design', 'Under Review'].includes(part.status))
        .length,
      pendingReview: parts.filter((part) => part.status === 'Under Review').length,
    },
    calculations: {
      total: calculations.length,
      draft: calculations.filter((calc) => calc.status === 'Draft').length,
      pending: calculations.filter((calc) => calc.verificationStatus === 'Pending Verification')
        .length,
      verified: calculations.filter((calc) => calc.verificationStatus === 'Verified').length,
    },
  };
}

export function designRevision(design) {
  return design.revisions?.length || 1;
}

export function buildDesignActivity(design, label, detail, by) {
  return {
    id: `ACT-${design.id}-${(design.activity?.length || 0) + 1}`,
    label,
    detail,
    by: by || 'Design Admin',
    at: TODAY,
  };
}

export function unlinkedProjectsSummary() {
  return PROJECTS.length;
}

/* ==========================================================================
   Module 05 — detailed design specification fields and revision helpers
   ========================================================================== */

/** Detailed design fields captured on the mechanical design form. */
export const DESIGN_SPEC_FIELDS = [
  { key: 'objectives', label: 'Design Objectives' },
  { key: 'functionalDescription', label: 'Functional Description' },
  { key: 'operatingConditions', label: 'Operating Conditions' },
  { key: 'designParameters', label: 'Design Parameters' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'tolerances', label: 'Tolerances' },
  { key: 'materialSelection', label: 'Material Selection' },
  { key: 'loadConditions', label: 'Load Conditions' },
  { key: 'performanceRequirements', label: 'Performance Requirements' },
  { key: 'designConstraints', label: 'Design Constraints' },
  { key: 'safetyConsiderations', label: 'Safety Considerations' },
  { key: 'assumptions', label: 'Assumptions' },
  { key: 'remarks', label: 'Remarks' },
];

export const DESIGN_SPEC_DEFAULTS = DESIGN_SPEC_FIELDS.reduce((accumulator, field) => {
  accumulator[field.key] = '';
  return accumulator;
}, {});

/** Detail design fields merged onto older persisted records. */
export function normalizeDesignRecord(design) {
  const revisions = Array.isArray(design.revisions) ? design.revisions : [];
  const lastRevision = revisions.length ? revisions[revisions.length - 1].date : design.created;
  return {
    ...DESIGN_SPEC_DEFAULTS,
    designPlanId: '',
    attachments: [],
    ...design,
    revisions,
    attachments: Array.isArray(design.attachments) ? design.attachments : [],
    updatedAt: design.updatedAt || lastRevision || design.created || '',
  };
}

/** Next revision letter for a design, part or assembly. */
export function nextRevision(current = 'A') {
  const value = String(current || 'A').toUpperCase();
  const next = String.fromCharCode(Math.min(90, value.charCodeAt(0) + 1));
  return REVISIONS.includes(next) ? next : String(REVISIONS[REVISIONS.length - 1]);
}

/** Statuses from which a design can still be submitted for validation. */
export const SUBMITTABLE_DESIGN_STATUSES = ['Draft', 'In Design', 'Changes Requested'];
