import { TODAY } from './projectData';

/**
 * Module 06 — Simulation & Design Validation data.
 *
 * The application has no numerical solver. Reports created here are manual
 * inspection / design validation reports; uploaded files are viewed as CAD
 * geometry only and are never treated as calculated results.
 */

export const MODEL_FORMATS = ['stl', 'obj', 'glb', 'gltf', 'ply'];

/** Formats Three.js can genuinely render in this build. */
export function modelSupport(fileName = '') {
  const extension = String(fileName).split('.').pop().toLowerCase();
  if (!String(fileName).includes('.')) {
    return { supported: false, extension: '', reason: 'The file has no extension, so its format cannot be determined.' };
  }
  if (MODEL_FORMATS.includes(extension)) {
    return { supported: true, extension, mode: '3d', reason: '' };
  }
  const cad = ['step', 'stp', 'iges', 'igs', 'sldprt', 'sldasm', 'x_t', 'ipt', 'catpart', '3mf'];
  if (cad.includes(extension)) {
    return {
      supported: false,
      extension,
      reason: `${extension.toUpperCase()} is a CAD interchange/solid format and has no browser-side loader in this build. Export an STL, OBJ, GLB or PLY mesh to inspect it here.`,
    };
  }
  return {
    supported: false,
    extension,
    reason: `The .${extension} format is not supported by the built-in 3D viewer. Supported formats: STL, OBJ, GLB, GLTF and PLY.`,
  };
}

export const MAX_MODEL_BYTES = 60 * 1024 * 1024;

export const OBSERVATION_CATEGORIES = [
  'Geometry / Interference',
  'Dimension / Tolerance',
  'Fit & Clearance',
  'Material / Surface',
  'Assembly / Access',
  'Drawing / Documentation',
  'Safety / Compliance',
  'Other',
];

export const SEVERITIES = ['Critical', 'Major', 'Minor', 'Observation'];
export const OBSERVATION_STATUSES = ['Open', 'In Review', 'Resolved', 'Accepted as-is'];

export const REPORT_STATUSES = ['Draft', 'Under Review', 'Corrections Required', 'Validated', 'Rejected'];
export const REPORT_DECISIONS = ['Validated', 'Corrections Required', 'Rejected'];
export const ISSUE_STATUSES = ['Open', 'In Progress', 'Resolved', 'Accepted'];

export const VALIDATION_CATEGORIES = [
  'Design Geometry Inspection',
  'Interference / Clearance Review',
  'Dimensional Verification',
  'Structural Analysis',
  'Stress Analysis',
  'Thermal Analysis',
  'Vibration Analysis',
  'Motion Analysis',
  'Other Engineering Validation',
];

export const VALIDATION_TYPES = [
  'Manual Inspection / Design Validation',
  'Dimensional Inspection',
  'Fit & Clearance Check',
  'Visual / Geometry Inspection',
  'External Simulation Result Review',
  'Other',
];

export const VALIDATION_RESULTS = ['', 'Pass', 'Pass with observations', 'Fail', 'Not concluded'];

export const REPORT_WORKFLOW = [
  'Mechanical Engineering Design',
  'Simulation Workspace',
  '3D Inspection',
  'Observation Recording',
  'Validation Report',
  'Engineering Analysis',
];

export function severityTone(severity = '') {
  if (severity === 'Critical') return 'red';
  if (severity === 'Major') return 'orange';
  if (severity === 'Minor') return 'blue';
  return 'gray';
}

export function reportStatusTone(status = '') {
  if (status === 'Validated') return 'green';
  if (status === 'Under Review') return 'purple';
  if (status === 'Corrections Required') return 'orange';
  if (status === 'Rejected') return 'red';
  return 'gray';
}

export function observationStatusTone(status = '') {
  if (status === 'Resolved') return 'green';
  if (status === 'In Review') return 'purple';
  if (status === 'Accepted as-is') return 'gray';
  return 'orange';
}

export function formatBytes(bytes = 0) {
  const size = Number(bytes) || 0;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function nextId(prefix, list = [], width = 3) {
  const numbers = list
    .map((row) => String(row.id || '').match(/(\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(width, '0')}`;
}

export function nextModelId(list) {
  return nextId('MDL-2026', list);
}
export function nextObservationId(list) {
  return nextId('OBS-2026', list);
}
export function nextValidationReportId(list) {
  return nextId('VDR-2026', list);
}

const attachment = (name, size, type, by, at) => ({ name, size, type: type || 'file', by, at });

export const SIMULATION_MODELS = [
  {
    id: 'MDL-2026-001',
    projectId: 'PRJ-2026-041',
    designId: 'DES-2026-001',
    revision: 'C',
    fileName: 'conveyor-drive-assembly_rev-C.stl',
    format: 'stl',
    size: 8_420_000,
    uploadedBy: 'D. Rao',
    uploadedAt: '2026-10-28',
    parts: 'Conveyor drive assembly',
    assemblyId: 'ASM-2026-001',
    metadata: {
      units: 'mm',
      scale: '1:1',
      sourceTool: 'SolidWorks 2026 export',
      coordinateSystem: 'Assembly origin at shaft centreline',
      notes: 'Tessellated mesh exported for inspection; dimensions must be verified against the released drawing.',
    },
    notes: 'Model used for the October drive assembly inspection.',
    observations: ['OBS-2026-001', 'OBS-2026-002'],
  },
  {
    id: 'MDL-2026-002',
    projectId: 'PRJ-2026-036',
    designId: 'DES-2026-003',
    revision: 'B',
    fileName: 'control-panel-housing_rev-B.glb',
    format: 'glb',
    size: 3_140_000,
    uploadedBy: 'K. Pillai',
    uploadedAt: '2026-10-12',
    parts: 'Control panel housing',
    assemblyId: '',
    metadata: {
      units: 'mm',
      scale: '1:1',
      sourceTool: 'Blender glTF export',
      coordinateSystem: 'World origin at base centre',
      notes: 'Door hinges and gland plate openings visible in the mesh.',
    },
    notes: '',
    observations: ['OBS-2026-003'],
  },
  {
    id: 'MDL-2026-003',
    projectId: 'PRJ-2026-038',
    designId: 'DES-2026-005',
    revision: 'A',
    fileName: 'feed-frame_step-file.step',
    format: 'step',
    size: 12_800_000,
    uploadedBy: 'V. Sharma',
    uploadedAt: '2026-09-18',
    parts: 'Feed system support frame',
    assemblyId: '',
    metadata: {
      units: 'mm',
      scale: '1:1',
      sourceTool: 'STEP AP214 export from CATIA',
      coordinateSystem: 'Not defined',
      notes: 'Reference only — this build cannot render STEP geometry in the browser.',
    },
    notes: 'Uploaded to test the unsupported-format handling.',
    observations: [],
  },
];

export const SIMULATION_OBSERVATIONS = [
  {
    id: 'OBS-2026-001',
    title: 'Bearing cover bolt holes misaligned with housing',
    description:
      'The four M10 cover bolt holes appear offset from the housing bosses when the bearing cover is overlaid on the mesh.',
    projectId: 'PRJ-2026-041',
    designId: 'DES-2026-001',
    revision: 'C',
    modelId: 'MDL-2026-001',
    partId: 'PRT-2026-001',
    assemblyId: 'ASM-2026-001',
    component: 'Gearbox housing — bearing cover interface',
    category: 'Geometry / Interference',
    severity: 'Major',
    location: 'Drive-end bearing cover, bolt circle Ø145 mm',
    screenshot: attachment('cover-bolt-misalignment.png', 184_000, 'image/png', 'D. Rao', '2026-10-29'),
    attachment: null,
    status: 'Open',
    remarks: 'Confirm against drawing DRW-041-021 Rev C before changing the model.',
    reportedBy: 'D. Rao',
    reportedAt: '2026-10-29',
    history: [
      { id: 'OBSH-001-1', action: 'Recorded', by: 'D. Rao', at: '2026-10-29', note: 'Observation recorded during 3D inspection.' },
    ],
  },
  {
    id: 'OBS-2026-002',
    title: 'Maintenance clearance to motor mount below target',
    description:
      'Measured roughly 38 mm between the coupling guard and motor mount, below the 50 mm service clearance target.',
    projectId: 'PRJ-2026-041',
    designId: 'DES-2026-001',
    revision: 'C',
    modelId: 'MDL-2026-001',
    partId: '',
    assemblyId: 'ASM-2026-001',
    component: 'Coupling guard / motor mount',
    category: 'Assembly / Access',
    severity: 'Minor',
    location: 'Non-drive end, coupling guard',
    screenshot: null,
    attachment: null,
    status: 'In Review',
    remarks: 'Value read from the mesh, not a measured result — verify on the released drawing.',
    reportedBy: 'D. Rao',
    reportedAt: '2026-10-30',
    history: [
      { id: 'OBSH-002-1', action: 'Recorded', by: 'D. Rao', at: '2026-10-30', note: 'Observation recorded during 3D inspection.' },
      { id: 'OBSH-002-2', action: 'Status changed', by: 'N. Joshi', at: '2026-11-02', note: 'In Review' },
    ],
  },
  {
    id: 'OBS-2026-003',
    title: 'Gland plate opening smaller than cable entry schedule',
    description:
      'The bottom gland plate opening in the mesh is 180 × 60 mm while the cable schedule requires 220 × 80 mm.',
    projectId: 'PRJ-2026-036',
    designId: 'DES-2026-003',
    revision: 'B',
    modelId: 'MDL-2026-002',
    partId: '',
    assemblyId: '',
    component: 'Control panel housing — gland plate',
    category: 'Dimension / Tolerance',
    severity: 'Critical',
    location: 'Bottom face, gland plate cut-out',
    screenshot: null,
    attachment: attachment('cable-entry-schedule.pdf', 320_000, 'application/pdf', 'K. Pillai', '2026-10-14'),
    status: 'Open',
    remarks: 'Raised with the electrical department; the opening must match the cable schedule.',
    reportedBy: 'K. Pillai',
    reportedAt: '2026-10-14',
    history: [
      { id: 'OBSH-003-1', action: 'Recorded', by: 'K. Pillai', at: '2026-10-14', note: 'Observation recorded during 3D inspection.' },
    ],
  },
];

const reportIssue = (id, fields) => ({
  id,
  title: '',
  description: '',
  component: '',
  severity: 'Minor',
  evidence: '',
  rootCause: '',
  correction: '',
  status: 'Open',
  ...fields,
});

export const VALIDATION_DOCUMENTS = [
  {
    id: 'VDR-2026-001',
    title: 'Conveyor drive assembly — 3D inspection validation report',
    projectId: 'PRJ-2026-041',
    designId: 'DES-2026-001',
    revision: 'C',
    modelId: 'MDL-2026-001',
    reportType: 'Manual Inspection / Design Validation',
    component: 'ASM-2026-001 · Conveyor drive assembly',
    objective:
      'Inspect the released Rev C assembly mesh for interference, service access and drawing consistency before engineering analysis.',
    problemDescription:
      'The inspection set out to confirm the bearing cover bolting and the coupling guard clearance against the released assembly drawing.',
    observedIssue:
      'Bearing cover bolt holes are misaligned with the housing bosses and the coupling guard clearance is below the service target.',
    severity: 'Major',
    expectedResult: 'All interfaces aligned to the released drawing with at least 50 mm service clearance.',
    actualObservation:
      'Four bolt holes offset by roughly 6 mm; coupling guard clearance measured about 38 mm on the mesh.',
    rootCause: 'Bearing cover pattern was revised independently of the housing model; guard geometry was not updated after the motor mount change.',
    correction: 'Update the bearing cover pattern to the housing boss pitch and move the guard mounting outward by 15 mm.',
    screenshots: [attachment('cover-bolt-misalignment.png', 184_000, 'image/png', 'D. Rao', '2026-11-03')],
    attachments: [attachment('inspection-notes-rev-C.pdf', 420_000, 'application/pdf', 'D. Rao', '2026-11-03')],
    reviewerComments: 'Evidence is sufficient for a manual inspection report. No numerical simulation is claimed.',
    validationResult: 'Fail',
    reportDate: '2026-11-03',
    preparedBy: 'D. Rao',
    reviewedBy: 'N. Joshi',
    observationIds: ['OBS-2026-001', 'OBS-2026-002'],
    issues: [
      reportIssue('VDR-2026-001-I1', {
        title: 'Bearing cover bolt pattern misaligned',
        description: 'Cover holes do not line up with the housing bosses.',
        component: 'Gearbox housing — drive-end bearing cover',
        severity: 'Major',
        evidence: 'cover-bolt-misalignment.png',
        rootCause: 'Cover pattern revised independently of the housing model.',
        correction: 'Match the cover pattern to the housing boss pitch on Rev D.',
        status: 'Open',
      }),
      reportIssue('VDR-2026-001-I2', {
        title: 'Coupling guard service clearance below target',
        description: 'Measured 38 mm on the mesh against a 50 mm target.',
        component: 'Coupling guard / motor mount',
        severity: 'Minor',
        evidence: 'Mesh measurement, inspection notes section 4.',
        rootCause: 'Guard geometry not updated after the motor mount change.',
        correction: 'Shift the guard mounting outward by 15 mm.',
        status: 'In Progress',
      }),
    ],
    status: 'Under Review',
    observations: 'This report documents manual 3D inspection only. No FEA, CFD or other numerical results were produced by this application.',
    decisionHistory: [],
    activity: [
      { id: 'ACT-VDR-001-1', label: 'Report created', detail: 'Manual inspection report drafted from two observations', by: 'D. Rao', at: '2026-11-03' },
      { id: 'ACT-VDR-001-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'D. Rao', at: '2026-11-03' },
    ],
  },
  {
    id: 'VDR-2026-002',
    title: 'Control panel housing gland plate validation',
    projectId: 'PRJ-2026-036',
    designId: 'DES-2026-003',
    revision: 'B',
    modelId: 'MDL-2026-002',
    reportType: 'Manual Inspection / Design Validation',
    component: 'Control panel housing',
    objective: 'Confirm the gland plate opening against the electrical cable entry schedule.',
    problemDescription: 'Cable entry schedule was issued after the housing model was frozen at Rev B.',
    observedIssue: 'Gland plate cut-out is smaller than the required cable entry.',
    severity: 'Critical',
    expectedResult: 'Opening of at least 220 × 80 mm to suit the cable schedule.',
    actualObservation: 'Opening modelled at 180 × 60 mm.',
    rootCause: 'Schedule change was not propagated to the housing model.',
    correction: 'Enlarge the opening to 220 × 80 mm and re-issue the housing drawing.',
    screenshots: [],
    attachments: [attachment('cable-entry-schedule.pdf', 320_000, 'application/pdf', 'K. Pillai', '2026-10-16')],
    reviewerComments: '',
    validationResult: '',
    reportDate: '2026-10-16',
    preparedBy: 'K. Pillai',
    reviewedBy: 'V. Sharma',
    observationIds: ['OBS-2026-003'],
    issues: [
      reportIssue('VDR-2026-002-I1', {
        title: 'Gland plate opening undersized',
        description: '180 × 60 mm modelled against 220 × 80 mm required.',
        component: 'Control panel housing — gland plate',
        severity: 'Critical',
        evidence: 'cable-entry-schedule.pdf',
        rootCause: 'Schedule change after model freeze.',
        correction: 'Enlarge opening and re-issue drawing.',
        status: 'Open',
      }),
    ],
    status: 'Draft',
    observations: 'Manual dimensional check against the cable schedule; no numerical simulation performed.',
    decisionHistory: [],
    activity: [
      { id: 'ACT-VDR-002-1', label: 'Report created', detail: 'Draft manual inspection report', by: 'K. Pillai', at: '2026-10-16' },
    ],
  },
];

export { TODAY };
