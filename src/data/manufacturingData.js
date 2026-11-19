/**
 * Local mock data for Module 08 — Manufacturing Design.
 *
 * Three registers share one reference model:
 *   1. Manufacturing Definition  (per category: machining, fabrication, welding,
 *      sheet metal, tolerances & fits)
 *   2. Inspection & Quality Requirements (requirements, points, characteristics,
 *      measurement, acceptance, plan history)
 *   3. Process Planning & Instructions (sequence, instructions, equipment, special
 *      instructions, technical notes, package release)
 *
 * Demonstration data only. Manufacturing Design records *references* to projects,
 * parts, assemblies and drawings owned by other modules; it never duplicates the
 * master records and never records production or inspection results.
 */
import { PROJECTS, TODAY, addDays, formatDate } from './projectData';
import { PARTS, assemblyLabel } from './mechanicalData';
import { ANALYSES } from './analysisData';

export { TODAY, addDays, formatDate };

/* ---------------------------------------------------------------- categories */
export const MANUFACTURING_CATEGORIES = [
  { key: 'machining', label: 'Machining' },
  { key: 'fabrication', label: 'Fabrication' },
  { key: 'welding', label: 'Welding' },
  { key: 'sheet-metal', label: 'Sheet Metal' },
  { key: 'tolerances', label: 'Tolerances & Fits' },
];

export const MANUFACTURING_CATEGORY_LABELS = MANUFACTURING_CATEGORIES.map((row) => row.label);

export const MANUFACTURING_CATEGORY_FILTERS = [
  { key: 'all', label: 'All Records' },
  ...MANUFACTURING_CATEGORIES,
];

export function categoryForLabel(label) {
  return MANUFACTURING_CATEGORIES.find((row) => row.label === label) || MANUFACTURING_CATEGORIES[0];
}

/* ------------------------------------------------- category-specific fields */
export const CATEGORY_FIELDS = {
  Machining: [
    { key: 'machinedFeatures', label: 'Machined Features', type: 'textarea' },
    { key: 'dimensions', label: 'Dimensions', type: 'text' },
    { key: 'machiningNotes', label: 'Machining Notes', type: 'textarea' },
    { key: 'processInformation', label: 'Process Information', type: 'text' },
    {
      key: 'surfaceFinish',
      label: 'Surface Finish',
      type: 'select',
      options: ['Ra 0.8 µm', 'Ra 1.6 µm', 'Ra 3.2 µm', 'Ra 6.3 µm', 'Ra 12.5 µm'],
    },
    { key: 'partReferences', label: 'Part References', type: 'text' },
  ],
  Fabrication: [
    { key: 'cuttingDetails', label: 'Cutting Details', type: 'textarea' },
    { key: 'formingDetails', label: 'Forming Details', type: 'textarea' },
    { key: 'fitUpDetails', label: 'Fit-up Details', type: 'textarea' },
    { key: 'structuralComponents', label: 'Structural Components', type: 'text' },
    { key: 'fabricationNotes', label: 'Fabrication Notes', type: 'textarea' },
  ],
  Welding: [
    { key: 'weldSymbols', label: 'Weld Symbols', type: 'text' },
    { key: 'jointDetails', label: 'Joint Details', type: 'textarea' },
    { key: 'weldingReferences', label: 'Welding References', type: 'text' },
    { key: 'wpsReferences', label: 'Welding Procedure References', type: 'text' },
    { key: 'inspectionNotes', label: 'Inspection Notes', type: 'textarea' },
  ],
  'Sheet Metal': [
    { key: 'sheetThickness', label: 'Sheet Thickness', type: 'number', unit: 'mm' },
    { key: 'flatPatternRef', label: 'Flat Pattern Reference', type: 'text' },
    { key: 'bendTables', label: 'Bend Tables', type: 'text' },
    { key: 'formingDetails', label: 'Forming Details', type: 'textarea' },
    { key: 'materialSpecifications', label: 'Material Specifications', type: 'text' },
  ],
  'Tolerances & Fits': [
    { key: 'dimensionalTolerances', label: 'Dimensional Tolerances', type: 'textarea' },
    { key: 'geometricTolerances', label: 'Geometric Tolerances', type: 'textarea' },
    { key: 'fits', label: 'Fits', type: 'textarea' },
    {
      key: 'surfaceFinish',
      label: 'Surface Finish',
      type: 'select',
      options: ['Ra 0.8 µm', 'Ra 1.6 µm', 'Ra 3.2 µm', 'Ra 6.3 µm', 'Ra 12.5 µm'],
    },
    { key: 'criticalDimensions', label: 'Critical Dimensions', type: 'text' },
  ],
};

export function fieldsForCategory(label) {
  return CATEGORY_FIELDS[label] || CATEGORY_FIELDS.Machining;
}

/* ------------------------------------------------------------ reference data */
export const ENGINEERS = [
  'D. Rao',
  'S. Menon',
  'K. Pillai',
  'R. Kulkarni',
  'V. Sharma',
  'P. Deshmukh',
  'A. Iyer',
  'N. Joshi',
];

export const REVIEWERS = ['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'];

export const INSPECTION_TYPES = [
  'Incoming inspection',
  'In-process inspection',
  'Final inspection',
  'Dimensional inspection',
  'Visual inspection',
  'NDT / Weld inspection',
  'Functional check',
];

export const PROCESS_TYPES = [
  'Machining',
  'Fabrication',
  'Welding',
  'Sheet metal',
  'Assembly',
  'Surface treatment',
  'Mixed process',
];

export const RECORD_STATUSES = [
  'Draft',
  'In Preparation',
  'Under Review',
  'Revision Required',
  'Approved',
  'Released',
  'Superseded',
  'Rejected',
];

const STATUS_TONES = {
  Draft: 'gray',
  'In Preparation': 'blue',
  'Under Review': 'orange',
  'Revision Required': 'red',
  Approved: 'green',
  Released: 'green',
  Superseded: 'purple',
  Rejected: 'red',
};

export function statusTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export const DRAWING_REVISIONS = ['A', 'B', 'C', 'D'];

export const RECORD_KINDS = {
  definition: { label: 'Manufacturing Definition', singular: 'Manufacturing Record', base: 'definition', prefix: 'MFD' },
  inspection: { label: 'Inspection & Quality Requirements', singular: 'Inspection Plan', base: 'inspection', prefix: 'INS' },
  process: { label: 'Process Planning & Instructions', singular: 'Process Plan', base: 'process', prefix: 'PPR' },
};

/* --------------------------------------------------------------- reference helpers */
export function partForNumber(partNumber) {
  return PARTS.find((row) => row.partNumber === partNumber) || null;
}

export function partLabel(parts, partId) {
  const part = (parts || PARTS).find((row) => row.id === partId);
  return part ? `${part.partNumber} · ${part.name}` : 'Not linked';
}

export function drawingForPart(part) {
  return part ? `DRG-${part.partNumber}` : '—';
}

export function projectName(projects, projectId) {
  const project = (projects || PROJECTS).find((row) => row.id === projectId);
  return project?.name || '—';
}

export function assemblyForRecord(assemblies, record) {
  return assemblyLabel(assemblies || [], record?.assemblyId || '');
}

/** Release readiness for a process-plan manufacturing package. */
export function packageReadiness(record, definitions = [], inspections = []) {
  if (!record || record.kind !== 'process') return { ready: true, issues: [] };
  const issues = [];
  const definition = definitions.find((row) => row.id === record.linkedDefinitionId);
  const inspection = inspections.find((row) => row.id === record.linkedInspectionId);
  if (!record.linkedDefinitionId || !definition) {
    issues.push('Link the approved manufacturing definition.');
  } else if (!['Approved', 'Released'].includes(definition.status)) {
    issues.push('The manufacturing definition must be approved or released.');
  }
  if (!record.linkedInspectionId || !inspection) {
    issues.push('Link the approved inspection plan.');
  } else if (!['Approved', 'Released'].includes(inspection.status)) {
    issues.push('The inspection plan must be approved or released.');
  }
  if (!record.release?.packageId) {
    issues.push('Record the manufacturing package ID.');
  }
  return { ready: issues.length === 0, issues };
}

export const EDITABLE_STATUSES = ['Draft', 'In Preparation', 'Revision Required', 'Rejected'];
export const LOCKED_STATUSES = ['Approved', 'Released', 'Superseded'];

export function isEditable(record) {
  return Boolean(record) && EDITABLE_STATUSES.includes(record.status);
}

export function isLocked(record) {
  return Boolean(record) && LOCKED_STATUSES.includes(record.status);
}

export function nextMfgId(kind, records = []) {
  const prefix = RECORD_KINDS[kind]?.prefix || 'MFD';
  const numbers = records
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return `${prefix}-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextRevision(revision) {
  const index = DRAWING_REVISIONS.indexOf(revision);
  if (index === -1) return 'A';
  return DRAWING_REVISIONS[index + 1] || `${revision}1`;
}

export function mfgKpis(records = []) {
  return {
    total: records.length,
    inProgress: records.filter((row) => row.status === 'In Preparation').length,
    pending: records.filter((row) => row.status === 'Under Review').length,
    released: records.filter((row) => row.status === 'Released').length,
  };
}

/* --------------------------------------------------------------- seed builders */
const STATUS_PATH = {
  Draft: ['Draft'],
  'In Preparation': ['Draft', 'In Preparation'],
  'Under Review': ['Draft', 'In Preparation', 'Under Review'],
  'Revision Required': ['Draft', 'In Preparation', 'Under Review', 'Revision Required'],
  Approved: ['Draft', 'In Preparation', 'Under Review', 'Approved'],
  Released: ['Draft', 'In Preparation', 'Under Review', 'Approved', 'Released'],
  Superseded: ['Draft', 'In Preparation', 'Under Review', 'Approved', 'Released', 'Superseded'],
  Rejected: ['Draft', 'In Preparation', 'Under Review', 'Rejected'],
};

function shift(date, days) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

const STATUS_NOTES = {
  Draft: 'Record created as a draft.',
  'In Preparation': 'Manufacturing definition in preparation.',
  'Under Review': 'Submitted for engineering review.',
  'Revision Required': 'Reviewer requested changes before approval.',
  Approved: 'Approved for manufacturing release.',
  Released: 'Released to production as part of the manufacturing package.',
  Superseded: 'Superseded by a later controlled revision.',
  Rejected: 'Rejected at review; rework required.',
};

function buildStatusHistory(status, by, date) {
  const path = STATUS_PATH[status] || ['Draft'];
  return path.map((entry, index) => ({
    id: `SH-${index + 1}`,
    status: entry,
    at: shift(date, index * 4),
    by: index === path.length - 1 ? by : index === path.length - 2 ? 'N. Joshi' : by,
    note: STATUS_NOTES[entry],
  }));
}

function buildReviews(status, reviewer, date, revision) {
  if (!['Under Review', 'Revision Required', 'Approved', 'Released', 'Superseded', 'Rejected'].includes(status)) {
    return [];
  }
  const decision =
    status === 'Under Review'
      ? 'Pending decision'
      : status === 'Revision Required'
        ? 'Changes requested'
        : status === 'Rejected'
          ? 'Rejected'
          : status === 'Superseded'
            ? 'Approved (superseded later)'
            : 'Approved';
  const comments =
    decision === 'Pending decision'
      ? 'Submitted for manufacturing review.'
      : decision === 'Changes requested'
        ? 'Clarify datum scheme and inspection access before resubmission.'
        : decision === 'Rejected'
          ? 'Tolerance stack does not meet the design intent; rework required.'
          : 'Reviewed against drawing, analysis references and shop capability.';
  return [
    {
      id: `RV-${revision}-1`,
      revision,
      reviewer,
      date: shift(date, 12),
      decision,
      comments,
    },
  ];
}

const CATEGORY_DEFAULTS = {
  Machining: {
    machinedFeatures: 'Main bore, bearing seats, mounting face and dowel holes.',
    dimensions: 'Per drawing sheet 2 and 3; bore centres dimensioned from datum A.',
    machiningNotes: 'Finish machine after stress relieving; protect ground surfaces during handling.',
    processInformation: 'CNC machining centre, two setups, coolant through spindle.',
    surfaceFinish: 'Ra 1.6 µm',
    partReferences: 'Refer to part drawing and engineering analysis references.',
  },
  Fabrication: {
    cuttingDetails: 'Plate and section cut list per drawing; thermal cut edges ground before fit-up.',
    formingDetails: 'Cold forming within minimum bend radius; no flame straightening without approval.',
    fitUpDetails: 'Tack weld in free state, check diagonals before final welding.',
    structuralComponents: 'Base frame, cross members and diagonal bracing.',
    fabricationNotes: 'Maintain camber allowance during fabrication; record fit-up checks.',
  },
  Welding: {
    weldSymbols: 'Fillet 6 mm and full penetration butt welds per drawing.',
    jointDetails: 'Butt joints with backing strip; fillet joints at gusset connections.',
    weldingReferences: 'Weld map sheet 4; welder qualification per approved WPS.',
    wpsReferences: 'WPS-001 / WPS-004 (GMAW), qualified procedure only.',
    inspectionNotes: 'Visual and dimensional check before NDT; weld map references recorded.',
  },
  'Sheet Metal': {
    sheetThickness: '2',
    flatPatternRef: 'FP-SMT-036-001 Rev B',
    bendTables: 'Bend deduction table BT-2.0-CRCA; K-factor 0.44.',
    formingDetails: 'Form on CNC press brake; bend sequence per setup sheet.',
    materialSpecifications: 'CRCA sheet, 2.0 mm, zinc-coated per drawing note.',
  },
  'Tolerances & Fits': {
    dimensionalTolerances: 'General tolerance ISO 2768-m; critical dimensions individually toleranced.',
    geometricTolerances: 'Flatness 0.2, parallelism 0.1, position Ø0.3 M on datum pattern.',
    fits: 'H7/h6 bearing seats; H8/f7 dowel locations; transition fits at split faces.',
    surfaceFinish: 'Ra 3.2 µm',
    criticalDimensions: 'Bore centres, mounting face height and dowel pitch.',
  },
};

function baseRecord(kind, id, row) {
  const part = partForNumber(row.partNumber);
  const projectId = part?.projectId || 'PRJ-2026-041';
  const project = PROJECTS.find((entry) => entry.id === projectId);
  const revision = row.revision || 'A';
  const recordDate = row.recordDate;
  return {
    id,
    kind,
    name: row.name,
    projectId,
    projectName: project?.name || '',
    designId: row.designId || '',
    partId: part?.id || '',
    partNumber: part?.partNumber || row.partNumber,
    material: row.material || part?.material || '',
    assemblyId: part?.parentAssemblyId || '',
    drawingNo: drawingForPart(part),
    drawingRevision: part?.revision || revision,
    engineer: row.engineer,
    reviewer: row.reviewer || 'N. Joshi',
    recordDate,
    dueDate: row.dueDate,
    status: row.status,
    revision,
    description: row.description || '',
    attachments: row.attachments || [],
    reviews: buildReviews(row.status, row.reviewer || 'N. Joshi', recordDate, revision),
    statusHistory: buildStatusHistory(row.status, row.engineer, recordDate),
    createdBy: row.engineer,
    updatedBy: row.updatedBy || row.engineer,
    createdAt: recordDate,
    updatedAt: shift(recordDate, 8),
  };
}

function makeDefinition(row, index) {
  const id = `MFD-2026-${String(index + 1).padStart(3, '0')}`;
  const base = baseRecord('definition', id, row);
  const verifiedAnalysis = ANALYSES.find(
    (analysis) =>
      analysis.verificationStatus === 'Verified' &&
      analysis.projectId === base.projectId &&
      analysis.linkedId === base.partId,
  );
  return {
    ...base,
    category: row.category,
    technical: { ...CATEGORY_DEFAULTS[row.category], ...(row.technical || {}) },
    manufacturingMethod: row.manufacturingMethod || '',
    manufacturingNotes: row.manufacturingNotes || row.description || '',
    criticalFeatures: row.criticalFeatures || '',
    requiredCapabilities: row.requiredCapabilities || '',
    specialProcesses: row.specialProcesses || '',
    equipmentToolingRefs: row.equipmentToolingRefs || '',
    linkedBomId: row.linkedBomId || '',
    linkedDrawingId: row.linkedDrawingId || '',
    analysisId: row.analysisId || verifiedAnalysis?.id || '',
    linkedInspectionId: row.linkedInspectionId || '',
  };
}

function makeInspection(row, index) {
  const id = `INS-2026-${String(index + 1).padStart(3, '0')}`;
  const points = row.points || [];
  const base = baseRecord('inspection', id, row);
  const linkedDefinition = MANUFACTURING_DEFINITIONS.find(
    (definition) =>
      definition.projectId === base.projectId && definition.partId === base.partId,
  );
  return {
    ...base,
    description:
      row.description ||
      `${row.inspectionType} plan for ${row.partNumber}, covering inspection points, critical characteristics and measurement requirements.`,
    inspectionType: row.inspectionType,
    characteristic: row.characteristic || points[0]?.feature || row.characteristics?.[0]?.name || '',
    dimension: row.dimension || row.characteristics?.[0]?.dimension || '',
    tolerance: row.tolerance || row.characteristics?.[0]?.toleranceRef || '',
    unit: row.unit || points[0]?.unit || row.measurement?.unit || 'mm',
    inspectionMethod: row.inspectionMethod || points[0]?.method || row.measurement?.method || '',
    instrument: row.instrument || row.measurement?.equipment || '',
    frequency: row.frequency || points[0]?.frequency || '',
    acceptanceCriteria: row.acceptanceCriteria || row.acceptance?.description || '',
    criticalToQuality:
      row.criticalToQuality || (row.characteristics?.[0]?.criticality === 'Critical' ? 'Yes' : 'No'),
    evidenceRef: row.evidenceRef || `DRG-${row.partNumber}`,
    requirementNotes: row.requirementNotes || '',
    linkedBomId: row.linkedBomId || '',
    linkedDrawingId: row.linkedDrawingId || '',
    technical: { applicablePart: row.partNumber, drawingRef: `DRG-${row.partNumber}` },
    linkedDefinitionId: row.linkedDefinitionId ?? linkedDefinition?.id ?? '',
    points: points.map((point, pointIndex) => ({
      id: point.id || `IP-${String(pointIndex + 1).padStart(2, '0')}`,
      feature: point.feature,
      method: point.method,
      unit: point.unit || 'mm',
      frequency: point.frequency || '100%',
    })),
    characteristics: (row.characteristics || []).map((entry) => ({
      name: entry.name,
      criticality: entry.criticality || 'Critical',
      dimension: entry.dimension,
      toleranceRef: entry.toleranceRef,
    })),
    measurement: {
      method: row.measurement?.method || 'Dimensional measurement',
      equipment: row.measurement?.equipment || 'Calibrated micrometer / bore gauge',
      unit: row.measurement?.unit || 'mm',
      instructions: row.measurement?.instructions || 'Measure at the marked locations and record readings against the plan.',
    },
    acceptance: {
      min: row.acceptance?.min ?? '',
      max: row.acceptance?.max ?? '',
      description: row.acceptance?.description || 'Measured values must fall within the drawing limits.',
      standard: row.acceptance?.standard || 'ISO 2768-m',
    },
    planHistory: [
      {
        revision: row.revision || 'A',
        by: row.engineer,
        date: row.recordDate,
        note: 'Initial inspection plan issued for manufacturing.',
        status: row.status,
      },
    ],
  };
}

function makeProcess(row, index) {
  const id = `PPR-2026-${String(index + 1).padStart(3, '0')}`;
  const revision = row.revision || 'A';
  const inspectionRef = row.inspectionRef || '';
  const firstOp = row.firstOperation || 'Review drawing, material and work order';
  const base = baseRecord('process', id, row);
  const linkedDefinition = MANUFACTURING_DEFINITIONS.find(
    (definition) =>
      definition.projectId === base.projectId && definition.partId === base.partId,
  );
  return {
    ...base,
    linkedDefinitionId: row.linkedDefinitionId ?? linkedDefinition?.id ?? '',
    linkedBomId: row.linkedBomId || '',
    linkedDrawingId: row.linkedDrawingId || '',
    operationNotes: row.operationNotes || '',
    description:
      row.description ||
      `${row.processType} process plan for ${row.partNumber}, defining the operation sequence, instructions and equipment requirements.`,
    processType: row.processType,
    linkedInspectionId: inspectionRef,
    sequence: [
      {
        opNo: '10',
        name: firstOp,
        description: `Verify ${row.partNumber} Rev ${revision} and material identification before starting.`,
        workstation: 'WS-01 Stores / Prep',
        sequence: '1',
        duration: '0.5 h',
        tooling: '',
        setup: '',
        parameters: '',
        safetyQuality: '',
        inspectionCheckpoint: '',
      },
      {
        opNo: '20',
        name: row.mainOperation || 'Main manufacturing operation',
        description: row.mainDescription || 'Execute the operation per the drawing and process instructions.',
        workstation: row.workstation || 'WS-03 Machining',
        sequence: '2',
        duration: row.duration || '2.0 h',
        tooling: '',
        setup: '',
        parameters: '',
        safetyQuality: '',
        inspectionCheckpoint: '',
      },
      {
        opNo: '30',
        name: 'Final check and pack',
        description: `Complete in-process checks and route to ${inspectionRef || 'inspection'} for verification.`,
        workstation: 'WS-07 Inspection',
        sequence: '3',
        duration: '0.5 h',
        tooling: '',
        setup: '',
        parameters: '',
        safetyQuality: '',
        inspectionCheckpoint: '',
      },
    ],
    instructions: [
      {
        id: 'PI-01',
        operation: '10 · Preparation',
        details: 'Confirm drawing revision, material certificate and work order before loading.',
        requirements: 'Record drawing revision and material heat number on the route card.',
        refs: `${inspectionRef || 'Inspection plan'} · drawing sheet 1`,
      },
      {
        id: 'PI-02',
        operation: '20 · Manufacturing',
        details: row.mainDescription || 'Follow the operation sheet and drawing notes for the feature set.',
        requirements: 'Hold dimensions to the drawing; record measured values on the route card.',
        refs: 'Operation sheet OP-20 · drawing sheets 2–3',
      },
    ],
    equipment: [
      {
        name: row.equipmentName || 'CNC machining centre',
        type: row.equipmentType || 'Machining',
        specification: '3-axis, 8,000 rpm, coolant through spindle',
        capacity: '800 × 500 × 500 mm envelope',
        special: 'Calibrated tool presetter required.',
      },
      {
        name: 'Workshop measuring set',
        type: 'Inspection',
        specification: 'Micrometer 0–150 mm, bore gauge set, height gauge',
        capacity: 'Up to 1,000 mm',
        special: 'Calibration valid at time of use.',
      },
    ],
    special: {
      safety: 'Isolate machine before setup; use lifting aids for parts above 20 kg.',
      notes: row.specialNote || 'No deviation without engineering approval.',
      handling: 'Protect finished surfaces with soft slings and edge protection.',
      restrictions: 'Do not rework weld or heat-treated features without an approved deviation.',
    },
    notes: {
      description: row.description || 'Process plan issued for manufacturing reference.',
      engineeringRef: row.engineeringRef || 'Mechanical design register reference',
      drawingRef: `DRG-${row.partNumber} Rev ${revision}`,
      additional: 'Manufacturing holds no authority to change drawing-defined requirements.',
    },
    release: {
      packageId: row.packageId || '',
      releaseStatus: row.status === 'Released' ? 'Released' : row.status === 'Superseded' ? 'Superseded' : 'Not released',
      releaseDate: row.status === 'Released' ? shift(row.recordDate, 20) : '',
      inspectionRef,
      processRevision: revision,
    },
  };
}

/* -------------------------------------------------------------------- seeds */
const DEF_SEEDS = [
  {
    category: 'Machining',
    name: 'Gearbox housing bore and face machining',
    partNumber: 'MEC-041-001',
    status: 'Released',
    engineer: 'D. Rao',
    dueDate: '2026-11-20',
    recordDate: '2026-09-24',
    description: 'Machining definition for the split housing bore, bearing seats and mounting face.',
    technical: { surfaceFinish: 'Ra 0.8 µm', partReferences: 'MEC-041-001 Rev C · housing drawing sheet 3' },
    linkedInspectionId: 'INS-2026-001',
  },
  {
    category: 'Machining',
    name: 'Input shaft turning and journal grinding',
    partNumber: 'MEC-041-002',
    status: 'Approved',
    engineer: 'D. Rao',
    dueDate: '2026-11-28',
    recordDate: '2026-09-29',
    description: 'Turning and grinding definition for journals, keyway and threaded end.',
    technical: { machinedFeatures: 'Journals Ø85 k6, keyway 20 N9, threaded end M64×2.', surfaceFinish: 'Ra 0.4 µm on journals' },
  },
  {
    category: 'Machining',
    name: 'Helical gear pair hard finishing',
    partNumber: 'MEC-041-003',
    status: 'In Preparation',
    engineer: 'V. Sharma',
    dueDate: '2026-12-06',
    recordDate: '2026-10-12',
    description: 'Hard finishing definition for the gear pair after heat treatment.',
    technical: { processInformation: 'Gear grinder, profile grinding, 2 setups', machiningNotes: 'Grind after case hardening; maintain lead and profile tolerance.' },
  },
  {
    category: 'Fabrication',
    name: 'Base frame weldment fabrication',
    partNumber: 'FAB-038-001',
    status: 'Released',
    engineer: 'K. Pillai',
    dueDate: '2026-11-18',
    recordDate: '2026-09-18',
    description: 'Fabrication definition for the frame members, base plates and diagonal bracing.',
    technical: { structuralComponents: 'ISMC 200 frame, 12 mm base plates, 80×80 diagonal braces.', fitUpDetails: 'Check diagonals within 3 mm before final welding.' },
    linkedInspectionId: 'INS-2026-004',
  },
  {
    category: 'Fabrication',
    name: 'Diagonal brace cutting and fit-up',
    partNumber: 'FAB-038-002',
    status: 'Under Review',
    engineer: 'K. Pillai',
    dueDate: '2026-12-02',
    recordDate: '2026-10-20',
    description: 'Cutting and fit-up requirements for the four diagonal braces.',
    technical: { cuttingDetails: 'Cut at 45° with 2 mm fit-up allowance; grind thermal cut edges.', fabricationNotes: 'Tack in place before final weld sequence.' },
  },
  {
    category: 'Fabrication',
    name: 'Base plate drilling and leveling',
    partNumber: 'FAB-038-003',
    status: 'Draft',
    engineer: 'S. Menon',
    dueDate: '2026-12-12',
    recordDate: '2026-11-04',
    description: 'Drilling and leveling requirements for the eight foundation plates.',
  },
  {
    category: 'Welding',
    name: 'Gearbox housing weld repair procedure',
    partNumber: 'MEC-041-001',
    status: 'Approved',
    engineer: 'S. Menon',
    dueDate: '2026-11-25',
    recordDate: '2026-09-30',
    description: 'Controlled weld repair definition for localised casting defects.',
    technical: { weldSymbols: 'Repair cavity build-up, no structural weld symbol.', wpsReferences: 'WPS-002 (SMAW) · repair procedure RP-04' },
  },
  {
    category: 'Welding',
    name: 'Conveyor frame fillet weld schedule',
    partNumber: 'FAB-038-001',
    status: 'Released',
    engineer: 'K. Pillai',
    dueDate: '2026-11-15',
    recordDate: '2026-09-22',
    description: 'Fillet weld sizes, sequence and weld map references for the base frame.',
    technical: { jointDetails: '6 mm fillet at cross member connections; 8 mm at base plates.', weldingReferences: 'Weld map WM-038-01 sheet 2' },
    linkedInspectionId: 'INS-2026-004',
  },
  {
    category: 'Welding',
    name: 'Pipe support shoe weldment',
    partNumber: 'PIP-033-002',
    status: 'Revision Required',
    engineer: 'P. Deshmukh',
    dueDate: '2026-12-01',
    recordDate: '2026-10-09',
    description: 'Weld definition for the pipe support shoe and stiffener.',
    technical: { inspectionNotes: 'Reviewer requested NDT access and weld map clarification.' },
  },
  {
    category: 'Sheet Metal',
    name: 'Enclosure side panel flat pattern',
    partNumber: 'SMT-036-001',
    status: 'Released',
    engineer: 'V. Sharma',
    dueDate: '2026-11-22',
    recordDate: '2026-09-25',
    description: 'Flat pattern and bend definition for the enclosure side panel.',
    technical: { sheetThickness: '1.5', flatPatternRef: 'FP-SMT-036-001 Rev B' },
    linkedInspectionId: 'INS-2026-006',
  },
  {
    category: 'Sheet Metal',
    name: 'Enclosure door bend program',
    partNumber: 'SMT-036-002',
    status: 'Under Review',
    engineer: 'V. Sharma',
    dueDate: '2026-12-04',
    recordDate: '2026-10-18',
    description: 'Bend program and hem definition for the enclosure door.',
    technical: { bendTables: 'Bend deduction table BT-2.0-CRCA; hem 6 mm.', materialSpecifications: 'CRCA 2.0 mm, zinc coated' },
  },
  {
    category: 'Sheet Metal',
    name: 'Hinge bracket blanking and forming',
    partNumber: 'SMT-036-003',
    status: 'Superseded',
    engineer: 'S. Menon',
    dueDate: '2026-10-30',
    recordDate: '2026-09-12',
    description: 'Blanking and forming definition superseded by the revised bracket drawing.',
    technical: { sheetThickness: '2', materialSpecifications: 'SS 304, 2.0 mm' },
  },
  {
    category: 'Tolerances & Fits',
    name: 'Gearbox bearing seat fits and tolerances',
    partNumber: 'MEC-041-001',
    status: 'Approved',
    engineer: 'A. Iyer',
    dueDate: '2026-11-26',
    recordDate: '2026-10-01',
    description: 'Fit selection and geometric tolerances for bearing seats and split faces.',
    technical: { fits: 'Bearing seats H7/k6 and H7/h6; dowel location H8/f7.', criticalDimensions: 'Bore centres 260 ±0.05, seat width 48 ±0.05' },
  },
  {
    category: 'Tolerances & Fits',
    name: 'Frame flatness and hole position tolerances',
    partNumber: 'FAB-038-001',
    status: 'In Preparation',
    engineer: 'K. Pillai',
    dueDate: '2026-12-08',
    recordDate: '2026-10-22',
    description: 'Flatness, hole position and mounting face tolerance definition for the base frame.',
    technical: { geometricTolerances: 'Flatness 0.5 over 3,200 mm; position Ø1.0 M on datum pattern.', dimensionalTolerances: 'Mounting hole pitch ±0.5 mm; general ISO 2768-m.' },
  },
  {
    category: 'Tolerances & Fits',
    name: 'Shaft keyway and journal tolerance stack',
    partNumber: 'MEC-041-002',
    status: 'Rejected',
    engineer: 'D. Rao',
    dueDate: '2026-11-10',
    recordDate: '2026-09-26',
    description: 'Tolerance stack across keyway, journal and coupling interface.',
    technical: { fits: 'Keyway 20 N9; coupling fit H7/js6.', criticalDimensions: 'Journal Ø85 k6, keyway depth 7.5 +0.2/0' },
  },
];

const INS_SEEDS = [
  {
    name: 'Gearbox housing final dimensional inspection',
    inspectionType: 'Final inspection',
    partNumber: 'MEC-041-001',
    status: 'Released',
    engineer: 'D. Rao',
    dueDate: '2026-11-21',
    recordDate: '2026-09-26',
    linkedDefinitionId: 'MFD-2026-001',
    points: [
      { feature: 'Main bore Ø180 H7', method: 'Bore gauge', unit: 'mm', frequency: '100%' },
      { feature: 'Bearing seat width 48 ±0.05', method: 'Height gauge', unit: 'mm', frequency: '100%' },
      { feature: 'Dowel hole position', method: 'CMM', unit: 'mm', frequency: 'First-off + 10%' },
    ],
    characteristics: [
      { name: 'Main bore diameter', criticality: 'Critical', dimension: 'Ø180 H7', toleranceRef: 'Drawing sheet 3 / ISO 286-2' },
      { name: 'Seat width', criticality: 'Major', dimension: '48 ±0.05', toleranceRef: 'Drawing sheet 3' },
    ],
    measurement: { method: 'Dimensional measurement', equipment: 'Bore gauge, height gauge, CMM', unit: 'mm', instructions: 'Measure at three sections per bore and record the minimum and maximum readings.' },
    acceptance: { min: '179.96', max: '180.04', description: 'Bore and seat dimensions must meet drawing limits at all measured sections.', standard: 'ISO 286-2' },
  },
  {
    name: 'Input shaft in-process inspection',
    inspectionType: 'In-process inspection',
    partNumber: 'MEC-041-002',
    status: 'Approved',
    engineer: 'D. Rao',
    dueDate: '2026-11-30',
    recordDate: '2026-10-03',
    points: [
      { feature: 'Journal Ø85 k6', method: 'Micrometer', unit: 'mm', frequency: '100%' },
      { feature: 'Keyway width 20 N9', method: 'Plug gauge', unit: 'mm', frequency: '100%' },
      { feature: 'Thread M64×2', method: 'Thread gauge', unit: 'mm', frequency: '100%' },
    ],
    characteristics: [
      { name: 'Journal diameter', criticality: 'Critical', dimension: 'Ø85 k6', toleranceRef: 'Drawing sheet 2' },
      { name: 'Keyway width', criticality: 'Major', dimension: '20 N9', toleranceRef: 'Drawing sheet 2' },
    ],
    measurement: { method: 'Contact measurement', equipment: 'Micrometer 75–100 mm, plug gauges', unit: 'mm', instructions: 'Measure journals at two planes 90° apart; record temperature if outside 20 ±5 °C.' },
    acceptance: { min: '85.002', max: '85.023', description: 'Journals within k6 limits; keyway gauge must enter fully.', standard: 'ISO 286-2 / drawing' },
  },
  {
    name: 'Gear tooth profile inspection plan',
    inspectionType: 'Dimensional inspection',
    partNumber: 'MEC-041-003',
    status: 'Under Review',
    engineer: 'V. Sharma',
    dueDate: '2026-12-09',
    recordDate: '2026-10-24',
    points: [
      { feature: 'Tooth profile and lead', method: 'Gear measuring centre', unit: 'µm', frequency: 'Sample 3 teeth' },
      { feature: 'Base tangent length', method: 'Gear tooth micrometer', unit: 'mm', frequency: '100%' },
    ],
    characteristics: [
      { name: 'Profile total deviation', criticality: 'Critical', dimension: 'Fα ≤ 8 µm', toleranceRef: 'Gear data sheet' },
    ],
    measurement: { method: 'Gear metrology', equipment: 'Gear measuring centre', unit: 'µm', instructions: 'Evaluate profile, lead and pitch deviations against the gear data sheet.' },
    acceptance: { min: '', max: '8', description: 'Profile and lead deviations within the documented gear quality limits.', standard: 'ISO 1328 grade 6' },
  },
  {
    name: 'Base frame weld visual and dimensional inspection',
    inspectionType: 'NDT / Weld inspection',
    partNumber: 'FAB-038-001',
    status: 'Released',
    engineer: 'K. Pillai',
    dueDate: '2026-11-19',
    recordDate: '2026-09-21',
    linkedDefinitionId: 'MFD-2026-004',
    points: [
      { feature: 'All fillet welds — visual', method: 'Visual examination', unit: '—', frequency: '100%' },
      { feature: 'Frame diagonals and flatness', method: 'Measuring tape / laser level', unit: 'mm', frequency: '100%' },
      { feature: 'Butt weld root — DPT', method: 'Dye penetrant', unit: '—', frequency: '10% of butt welds' },
    ],
    characteristics: [
      { name: 'Fillet weld leg length', criticality: 'Critical', dimension: '6 mm / 8 mm', toleranceRef: 'Weld map WM-038-01' },
      { name: 'Frame diagonal difference', criticality: 'Major', dimension: '≤ 3 mm', toleranceRef: 'Fabrication drawing note 4' },
    ],
    measurement: { method: 'Visual, dimensional and DPT', equipment: 'Weld gauge, laser level, DPT kit', unit: 'mm', instructions: 'Inspect before painting; record weld map references and any repaired areas.' },
    acceptance: { min: '5', max: '9', description: 'Weld leg lengths within the specified range; no linear indication above acceptance level.', standard: 'ISO 5817 level C' },
  },
  {
    name: 'Base plate hole position check',
    inspectionType: 'Dimensional inspection',
    partNumber: 'FAB-038-003',
    status: 'In Preparation',
    engineer: 'S. Menon',
    dueDate: '2026-12-14',
    recordDate: '2026-11-05',
    points: [{ feature: 'Foundation hole pattern', method: 'CMM', unit: 'mm', frequency: '100%' }],
    characteristics: [{ name: 'Hole pitch', criticality: 'Critical', dimension: '320 ±0.5', toleranceRef: 'Drawing sheet 2' }],
    measurement: { method: 'Coordinate measurement', equipment: 'CMM', unit: 'mm', instructions: 'Measure hole centres from datum A/B and report position deviation.' },
    acceptance: { min: '319.5', max: '320.5', description: 'Hole pitch within ±0.5 mm; position deviation within Ø1.0 mm.', standard: 'Drawing / ISO 2768-m' },
  },
  {
    name: 'Enclosure side panel incoming check',
    inspectionType: 'Incoming inspection',
    partNumber: 'SMT-036-001',
    status: 'Approved',
    engineer: 'V. Sharma',
    dueDate: '2026-11-24',
    recordDate: '2026-09-28',
    linkedDefinitionId: 'MFD-2026-010',
    points: [
      { feature: 'Overall blank size', method: 'Steel rule / tape', unit: 'mm', frequency: 'Sample 5 per lot' },
      { feature: 'Bend angles', method: 'Digital angle gauge', unit: '°', frequency: 'Sample 5 per lot' },
    ],
    characteristics: [{ name: 'Panel width', criticality: 'Major', dimension: '1,180 ±1.0', toleranceRef: 'Flat pattern FP-SMT-036-001' }],
    measurement: { method: 'Dimensional check', equipment: 'Steel rule, angle gauge', unit: 'mm', instructions: 'Check first article and a 5-piece sample; record deviations on the incoming sheet.' },
    acceptance: { min: '1179', max: '1181', description: 'Blank size and bend angles within flat pattern limits; no coating damage.', standard: 'Drawing / flat pattern', },
  },
  {
    name: 'Enclosure door final inspection',
    inspectionType: 'Final inspection',
    partNumber: 'SMT-036-002',
    status: 'Draft',
    engineer: 'S. Menon',
    dueDate: '2026-12-16',
    recordDate: '2026-11-08',
    points: [{ feature: 'Door flatness and hinge position', method: 'Surface plate / height gauge', unit: 'mm', frequency: '100%' }],
    characteristics: [{ name: 'Door flatness', criticality: 'Major', dimension: '≤ 1.0 mm', toleranceRef: 'Drawing note 6' }],
    measurement: { method: 'Dimensional check', equipment: 'Surface plate, height gauge', unit: 'mm', instructions: 'Support the door freely and measure flatness across the diagonal.' },
    acceptance: { min: '', max: '1.0', description: 'Flatness within 1.0 mm; hinge holes aligned with the frame.', standard: 'Drawing note 6' },
  },
  {
    name: 'Pipe support shoe weld inspection',
    inspectionType: 'NDT / Weld inspection',
    partNumber: 'PIP-033-002',
    status: 'Revision Required',
    engineer: 'P. Deshmukh',
    dueDate: '2026-12-03',
    recordDate: '2026-10-13',
    points: [{ feature: 'Shoe-to-pipe fillet welds', method: 'Visual + DPT', unit: '—', frequency: '100%' }],
    characteristics: [{ name: 'Fillet weld throat', criticality: 'Critical', dimension: '5 mm', toleranceRef: 'Weld detail sheet 3' }],
    measurement: { method: 'Visual and penetrant testing', equipment: 'Weld gauge, DPT kit', unit: 'mm', instructions: 'Reviewer requested NDT access and weld map references be clarified.' },
    acceptance: { min: '4.5', max: '6', description: 'Weld throat within range; no surface-breaking indications.', standard: 'ISO 5817 level C' },
  },
  {
    name: 'Idler roller surface and bore check',
    inspectionType: 'Incoming inspection',
    partNumber: 'MEC-041-005',
    status: 'Under Review',
    engineer: 'R. Kulkarni',
    dueDate: '2026-12-10',
    recordDate: '2026-10-29',
    points: [
      { feature: 'Roller outside diameter Ø159', method: 'Micrometer', unit: 'mm', frequency: '100%' },
      { feature: 'Bore and bearing seat', method: 'Bore gauge', unit: 'mm', frequency: '100%' },
      { feature: 'Surface runout', method: 'Dial indicator on centres', unit: 'mm', frequency: '100%' },
    ],
    characteristics: [{ name: 'Roller runout', criticality: 'Critical', dimension: '≤ 0.15 mm', toleranceRef: 'Roller drawing sheet 2' }],
    measurement: { method: 'Contact and runout measurement', equipment: 'Micrometer, bore gauge, dial indicator', unit: 'mm', instructions: 'Support on centres and rotate one full turn to record runout.' },
    acceptance: { min: '', max: '0.15', description: 'Runout within 0.15 mm TIR; bore and diameter within drawing limits.', standard: 'Drawing sheet 2' },
  },
];

const PPR_SEEDS = [
  {
    name: 'Gearbox housing machining process plan',
    processType: 'Machining',
    partNumber: 'MEC-041-001',
    status: 'Released',
    engineer: 'D. Rao',
    dueDate: '2026-11-23',
    recordDate: '2026-09-27',
    inspectionRef: 'INS-2026-001',
    packageId: 'PKG-2026-041-001',
    firstOperation: 'Review casting, drawing and stress-relief certificate',
    mainOperation: 'Machine bore, faces and bearing seats',
    mainDescription: 'Rough and finish machine the housing in two setups; maintain datum A alignment.',
    workstation: 'WS-03 Boring mill',
    duration: '6.0 h',
    equipmentName: 'CNC horizontal boring mill',
    equipmentType: 'Machining',
    specialNote: 'Casting must be stress relieved before finish machining.',
    description: 'Routing for the split housing from casting to final inspection.',
  },
  {
    name: 'Input shaft turning process plan',
    processType: 'Machining',
    partNumber: 'MEC-041-002',
    status: 'Approved',
    engineer: 'D. Rao',
    dueDate: '2026-12-02',
    recordDate: '2026-10-04',
    inspectionRef: 'INS-2026-002',
    packageId: 'PKG-2026-041-002',
    firstOperation: 'Verify bar stock heat number and cutting allowance',
    mainOperation: 'Turn journals, keyway and thread',
    mainDescription: 'Turn between centres; cut keyway after turning and grind journals after heat treatment.',
    workstation: 'WS-02 CNC lathe',
    duration: '4.0 h',
    equipmentName: 'CNC lathe',
    equipmentType: 'Machining',
    specialNote: 'Grind journals only after stress relief and straightening check.',
  },
  {
    name: 'Base frame fabrication and welding plan',
    processType: 'Fabrication',
    partNumber: 'FAB-038-001',
    status: 'Released',
    engineer: 'K. Pillai',
    dueDate: '2026-11-17',
    recordDate: '2026-09-20',
    inspectionRef: 'INS-2026-004',
    packageId: 'PKG-2026-038-001',
    firstOperation: 'Cut list and member identification',
    mainOperation: 'Fit up, weld and straighten base frame',
    mainDescription: 'Assemble on the leveling jig, tack in free state, weld per sequence and check diagonals.',
    workstation: 'WS-04 Fabrication bay',
    duration: '12.0 h',
    equipmentName: 'Welding positioner and jigs',
    equipmentType: 'Fabrication',
    specialNote: 'Do not flame straighten without engineering approval.',
    engineeringRef: 'Fabrication design register FAB-038-001',
  },
  {
    name: 'Base plate machining plan',
    processType: 'Machining',
    partNumber: 'FAB-038-003',
    status: 'In Preparation',
    engineer: 'S. Menon',
    dueDate: '2026-12-15',
    recordDate: '2026-11-06',
    inspectionRef: 'INS-2026-005',
    firstOperation: 'Verify plate size and flatness before setup',
    mainOperation: 'Mill faces and drill foundation holes',
    mainDescription: 'Machine both faces parallel and drill the hole pattern from a common datum.',
    workstation: 'WS-03 Machining',
    duration: '1.5 h',
    equipmentName: 'CNC vertical machining centre',
    equipmentType: 'Machining',
  },
  {
    name: 'Enclosure side panel sheet metal plan',
    processType: 'Sheet metal',
    partNumber: 'SMT-036-001',
    status: 'Released',
    engineer: 'V. Sharma',
    dueDate: '2026-11-26',
    recordDate: '2026-09-29',
    inspectionRef: 'INS-2026-006',
    packageId: 'PKG-2026-036-001',
    firstOperation: 'Uncoil, level and blank panel',
    mainOperation: 'Bend, punch and deburr side panel',
    mainDescription: 'Use the flat pattern and bend table; punch openings after forming to avoid distortion.',
    workstation: 'WS-05 Sheet metal',
    duration: '1.0 h',
    equipmentName: 'CNC press brake and turret punch',
    equipmentType: 'Sheet metal',
    specialNote: 'Protect coating during handling; use nylon-covered tools.',
  },
  {
    name: 'Enclosure door forming plan',
    processType: 'Sheet metal',
    partNumber: 'SMT-036-002',
    status: 'Under Review',
    engineer: 'V. Sharma',
    dueDate: '2026-12-07',
    recordDate: '2026-10-21',
    inspectionRef: 'INS-2026-007',
    firstOperation: 'Verify sheet thickness and coating condition',
    mainOperation: 'Form door pan and hem edges',
    mainDescription: 'Form the pan in two hits with the hem last; check diagonals after forming.',
    workstation: 'WS-05 Sheet metal',
    duration: '0.75 h',
    equipmentName: 'CNC press brake',
    equipmentType: 'Sheet metal',
  },
  {
    name: 'Pipe support shoe weld plan',
    processType: 'Welding',
    partNumber: 'PIP-033-002',
    status: 'Revision Required',
    engineer: 'P. Deshmukh',
    dueDate: '2026-12-05',
    recordDate: '2026-10-14',
    inspectionRef: 'INS-2026-008',
    firstOperation: 'Check material certificates and weld consumables',
    mainOperation: 'Fit up and weld shoe to pipe',
    mainDescription: 'Tack the shoe, check alignment and complete fillet welds per WPS.',
    workstation: 'WS-04 Welding bay',
    duration: '2.5 h',
    equipmentName: 'GMAW welding set',
    equipmentType: 'Welding',
    specialNote: 'Reviewer requested NDT access and weld map references be clarified.',
  },
  {
    name: 'Conveyor drive assembly plan',
    processType: 'Assembly',
    partNumber: 'MEC-041-001',
    status: 'Approved',
    engineer: 'R. Kulkarni',
    dueDate: '2026-12-11',
    recordDate: '2026-10-26',
    inspectionRef: 'INS-2026-001',
    packageId: 'PKG-2026-041-003',
    firstOperation: 'Stage parts and verify inspection clearance',
    mainOperation: 'Assemble drive, align and check backlash',
    mainDescription: 'Assemble the housing, shaft and gear pair; check bearing preload and gear backlash.',
    workstation: 'WS-06 Assembly',
    duration: '8.0 h',
    equipmentName: 'Assembly stand and lifting gear',
    equipmentType: 'Assembly',
    specialNote: 'Inspection clearance required before final closure.',
    engineeringRef: 'Gearbox assembly drawing ASM-041-100',
  },
  {
    name: 'Idler roller machining and assembly plan',
    processType: 'Machining',
    partNumber: 'MEC-041-005',
    status: 'Superseded',
    engineer: 'R. Kulkarni',
    dueDate: '2026-11-02',
    recordDate: '2026-09-15',
    inspectionRef: 'INS-2026-009',
    firstOperation: 'Cut tube and prepare ends',
    mainOperation: 'Machine bearing seats and assemble roller',
    mainDescription: 'Machine both ends from a common setup to control runout; press bearing housings.',
    workstation: 'WS-02 CNC lathe',
    duration: '3.0 h',
    equipmentName: 'CNC lathe with steady rest',
    equipmentType: 'Machining',
    specialNote: 'Superseded by the revised roller drawing; do not use for new work.',
  },
];

export const MANUFACTURING_DEFINITIONS = DEF_SEEDS.map(makeDefinition);
export const INSPECTION_REQUIREMENTS = INS_SEEDS.map(makeInspection);
export const PROCESS_PLANS = PPR_SEEDS.map(makeProcess);

export const ALL_MANUFACTURING_RECORDS = [
  ...MANUFACTURING_DEFINITIONS,
  ...INSPECTION_REQUIREMENTS,
  ...PROCESS_PLANS,
];

export function recordsForKind(state, kind) {
  if (!state) return [];
  if (kind === 'definition') return state.definitions || [];
  if (kind === 'inspection') return state.inspections || [];
  if (kind === 'process') return state.processPlans || [];
  return [];
}
