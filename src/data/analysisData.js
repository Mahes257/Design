/**
 * Local mock data for Module 06 — Engineering Analysis.
 *
 * One shared analysis register covers all seven analysis categories, one shared
 * review workspace handles verification, and validation reports reference the
 * analysis records they consolidate. Frontend only: no API, no database.
 *
 * IMPORTANT: every record here is demonstration data. Values that would be
 * engineering results are stored as *references to evidence* (report, model or
 * calculation IDs) rather than invented certified numbers, and nothing in this
 * module claims to have independently validated a design.
 */
import { PROJECTS, TODAY, addDays, formatDate } from './projectData';

export { TODAY, addDays, formatDate };

/* ------------------------------------------------------------ categories */
export const ANALYSIS_CATEGORIES = [
  { key: 'structural', label: 'Structural', short: 'Structural' },
  { key: 'stress-strain', label: 'Stress and Strain', short: 'Stress' },
  { key: 'thermal', label: 'Thermal', short: 'Thermal' },
  { key: 'motion-kinematic', label: 'Motion/Kinematic', short: 'Motion' },
  { key: 'vibration', label: 'Vibration', short: 'Vibration' },
  { key: 'fluid-flow', label: 'Fluid Flow', short: 'Fluid' },
  { key: 'fatigue', label: 'Fatigue', short: 'Fatigue' },
  { key: 'other', label: 'Other Engineering Analysis', short: 'Other' },
];

/**
 * Earlier records used a different category vocabulary. They are mapped onto
 * the current categories when the store loads so existing analyses, filters
 * and evidence fields keep working without losing data.
 */
export const LEGACY_CATEGORY_MAP = {
  'Stress & Strength': 'Stress and Strain',
  FEA: 'Structural',
  'Thermal Analysis': 'Thermal',
  'Motion / Kinematics': 'Motion/Kinematic',
  'Vibration / Dynamics': 'Vibration',
  Fatigue: 'Fatigue',
  'Tolerance Analysis': 'Other Engineering Analysis',
};

export function normalizeCategory(label) {
  return LEGACY_CATEGORY_MAP[label] || (ANALYSIS_CATEGORIES.some((c) => c.label === label) ? label : 'Other Engineering Analysis');
}

export const ANALYSIS_CATEGORY_LABELS = ANALYSIS_CATEGORIES.map((category) => category.label);

export const ANALYSIS_CATEGORY_FILTERS = [
  { key: 'all', label: 'All Analyses' },
  ...ANALYSIS_CATEGORIES,
];

export function categoryForLabel(label) {
  return ANALYSIS_CATEGORIES.find((category) => category.label === label) || ANALYSIS_CATEGORIES[0];
}

/* ---------------------------------------------------------- analysis types */
export const ANALYSIS_TYPES = [
  'Static stress check',
  'Strength verification',
  'Structural verification',
  'Steady-state thermal',
  'Transient thermal',
  'Motion study',
  'Kinematic study',
  'Static structural FEA',
  'Modal FEA',
  'Vibration response',
  'Dynamic load study',
  'Fatigue life screening',
  'Tolerance stack-up',
  'Pressure drop calculation',
  'Flow verification',
  'Other engineering analysis',
];

/** Where the recorded result came from — shown wherever results are displayed. */
export const RESULT_SOURCES = [
  {
    value: 'Manual calculation',
    label: 'Manually entered calculation',
    note: 'Typed or referenced by the engineer from a hand or spreadsheet calculation.',
  },
  {
    value: 'Application-calculated',
    label: 'Application-calculated value',
    note: 'Produced by another application feature and linked here as evidence.',
  },
  {
    value: 'Imported external simulation',
    label: 'Imported external simulation result',
    note: 'Generated outside this ERP and referenced as an external evidence file.',
  },
  {
    value: 'External solver reference',
    label: 'External solver reference (not run here)',
    note: 'Solver output recorded as a reference only; no solver is integrated in this workspace.',
  },
];

export const REVIEW_DECISIONS = [
  { value: 'Approve', label: 'Approve', status: 'Verified' },
  { value: 'Reject', label: 'Reject', status: 'Rejected' },
  { value: 'Return for Correction', label: 'Return for Correction', status: 'Changes Requested' },
  { value: 'Hold', label: 'Hold', status: 'On Hold' },
];

export const REVIEW_CHECKS = [
  { key: 'inputVerification', label: 'Input Verification' },
  { key: 'assumptionVerification', label: 'Assumption Verification' },
  { key: 'methodologyReview', label: 'Methodology Review' },
  { key: 'calculationVerification', label: 'Calculation Verification' },
  { key: 'resultReview', label: 'Result Review' },
  { key: 'acceptanceCriteriaCheck', label: 'Acceptance Criteria' },
];

export function decisionStatus(decision) {
  return REVIEW_DECISIONS.find((entry) => entry.value === decision)?.status || '';
}

export function resultSourceLabel(value) {
  return RESULT_SOURCES.find((source) => source.value === value)?.label || 'Not recorded';
}

export function resultSourceNote(value) {
  return (
    RESULT_SOURCES.find((source) => source.value === value)?.note ||
    'No result source recorded; treat all values as unverified references.'
  );
}

/* ------------------------------------------------- category-specific fields */
/**
 * Extra technical fields shown only for the selected category. These are record
 * fields for evidence and references — the module never computes them.
 */
export const CATEGORY_FIELDS = {
  'Stress & Strength': [
    { key: 'loadCaseId', label: 'Load Case ID', type: 'text', placeholder: 'e.g. LC-041-03' },
    { key: 'loadType', label: 'Load Type', type: 'select', options: ['Static', 'Dynamic', 'Impact', 'Thermal', 'Combined'] },
    { key: 'appliedLoad', label: 'Applied Load', type: 'text', placeholder: 'e.g. 18 kN at bracket face' },
    { key: 'stressValue', label: 'Stress Value (recorded evidence)', type: 'text', placeholder: 'Reference only, e.g. see CALC-041-007 §4' },
    { key: 'allowableStressRef', label: 'Allowable Stress Reference', type: 'text', placeholder: 'e.g. IS 800 / design standard clause' },
    { key: 'factorOfSafetyRef', label: 'Factor of Safety Reference', type: 'text', placeholder: 'e.g. FoS requirement in design basis DB-041' },
    { key: 'strengthCriteria', label: 'Strength Criteria', type: 'select', options: ['Yield', 'Ultimate', 'Fatigue limit', 'Deflection limit', 'Project specific'] },
    { key: 'calcReportRef', label: 'Calculation Report Reference', type: 'text', placeholder: 'e.g. CAL-2026-004 Rev B' },
  ],
  'Thermal Analysis': [
    { key: 'operatingTemperature', label: 'Operating Temperature', type: 'number', unit: '°C' },
    { key: 'minTemperature', label: 'Minimum Temperature', type: 'number', unit: '°C' },
    { key: 'maxTemperature', label: 'Maximum Temperature', type: 'number', unit: '°C' },
    { key: 'heatSourceRef', label: 'Heat Source Reference', type: 'text', placeholder: 'e.g. gearbox heat rejection sheet' },
    { key: 'thermalBoundaryConditions', label: 'Thermal Boundary Conditions', type: 'textarea', placeholder: 'Ambient, convection and radiation assumptions as recorded' },
    { key: 'thermalMaterialRef', label: 'Thermal Material Reference', type: 'text', placeholder: 'e.g. material data sheet MD-08' },
    { key: 'reportRef', label: 'Report Reference', type: 'text', placeholder: 'e.g. THM-038-01 Rev A' },
  ],
  'Motion / Kinematics': [
    { key: 'mechanismRef', label: 'Mechanism Reference', type: 'text', placeholder: 'e.g. conveyor drive mechanism' },
    { key: 'motionType', label: 'Motion Type', type: 'select', options: ['Rotary', 'Linear', 'Reciprocating', 'Intermittent', 'Combined'] },
    { key: 'inputSpeed', label: 'Input Speed', type: 'number', unit: 'rpm' },
    { key: 'angularDisplacement', label: 'Angular Displacement', type: 'number', unit: 'deg' },
    { key: 'linearDisplacement', label: 'Linear Displacement', type: 'number', unit: 'mm' },
    { key: 'motionStudyRef', label: 'Motion Study Reference', type: 'text', placeholder: 'e.g. motion study MS-041-02' },
    { key: 'resultDocRef', label: 'Result Document Reference', type: 'text', placeholder: 'e.g. motion result document' },
  ],
  FEA: [
    { key: 'feaModelRef', label: 'FEA Model Reference', type: 'text', placeholder: 'e.g. model FEA-M-041-B' },
    { key: 'meshType', label: 'Mesh Type', type: 'select', options: ['Tetrahedral', 'Hexahedral', 'Shell', 'Beam', 'Mixed'] },
    { key: 'meshSize', label: 'Mesh Size', type: 'number', unit: 'mm' },
    { key: 'elementCount', label: 'Element Count', type: 'number' },
    { key: 'boundaryConditionRef', label: 'Boundary Condition Reference', type: 'text', placeholder: 'e.g. BC sheet BC-041-02' },
    { key: 'solverName', label: 'Solver Name / Version', type: 'text', placeholder: 'e.g. solver name and version' },
    { key: 'resultFileRef', label: 'Result File Reference', type: 'text', placeholder: 'e.g. result file reference (file stays in CAD/solver tool)' },
    { key: 'feaReportRef', label: 'FEA Report Reference', type: 'text', placeholder: 'e.g. FEA-041-03 Rev B' },
  ],
  'Vibration / Dynamics': [
    { key: 'vibrationCaseId', label: 'Vibration Case ID', type: 'text', placeholder: 'e.g. VC-041-01' },
    { key: 'operatingSpeed', label: 'Operating Speed', type: 'number', unit: 'rpm' },
    { key: 'frequencyRange', label: 'Frequency Range', type: 'text', placeholder: 'e.g. 5–200 Hz' },
    { key: 'excitationRef', label: 'Excitation Reference', type: 'text', placeholder: 'e.g. motor excitation data' },
    { key: 'dampingRef', label: 'Damping Reference', type: 'text', placeholder: 'e.g. damping assumption note' },
    { key: 'dynamicAnalysisRef', label: 'Dynamic Analysis Reference', type: 'text', placeholder: 'e.g. DYN-041-01' },
    { key: 'reportRef', label: 'Report Reference', type: 'text' },
  ],
  Fatigue: [
    { key: 'loadCycleType', label: 'Load Cycle Type', type: 'select', options: ['Fully reversed', 'Pulsating', 'Random', 'Variable amplitude'] },
    { key: 'numberOfCycles', label: 'Number of Cycles', type: 'number' },
    { key: 'loadSpectrumRef', label: 'Load Spectrum Reference', type: 'text', placeholder: 'e.g. duty cycle sheet DC-041' },
    { key: 'fatigueMethodRef', label: 'Fatigue Method Reference', type: 'text', placeholder: 'e.g. S-N method reference (recorded)' },
    { key: 'expectedLifeRef', label: 'Expected Life Reference', type: 'text', placeholder: 'e.g. life target in design basis' },
    { key: 'validationEvidence', label: 'Validation Evidence', type: 'textarea', placeholder: 'Test reports, supplier data or references used as evidence' },
  ],
  'Tolerance Analysis': [
    { key: 'toleranceScheme', label: 'Tolerance Scheme', type: 'text', placeholder: 'e.g. stack-up scheme TS-041-02' },
    { key: 'dimensionRef', label: 'Dimension Reference', type: 'text', placeholder: 'e.g. drawing DWG-041-014 dim 12' },
    { key: 'nominalDimension', label: 'Nominal Dimension', type: 'number', unit: 'mm' },
    { key: 'upperTolerance', label: 'Upper Tolerance', type: 'number', unit: 'mm' },
    { key: 'lowerTolerance', label: 'Lower Tolerance', type: 'number', unit: 'mm' },
    { key: 'stackupMethodRef', label: 'Stack-up Method Reference', type: 'text', placeholder: 'e.g. worst-case / RSS method note' },
    { key: 'toleranceReportRef', label: 'Tolerance Report Reference', type: 'text' },
  ],
};

/* Current categories reuse the closest evidence-field set; the legacy labels
   remain aliases so old records keep their field layouts. */
CATEGORY_FIELDS.Structural = CATEGORY_FIELDS['Stress & Strength'];
CATEGORY_FIELDS['Stress and Strain'] = CATEGORY_FIELDS['Stress & Strength'];
CATEGORY_FIELDS.Thermal = CATEGORY_FIELDS['Thermal Analysis'];
CATEGORY_FIELDS['Motion/Kinematic'] = CATEGORY_FIELDS['Motion / Kinematics'];
CATEGORY_FIELDS.Vibration = CATEGORY_FIELDS['Vibration / Dynamics'];
CATEGORY_FIELDS['Fluid Flow'] = [
  { key: 'flowMedia', label: 'Flow Medium', type: 'text', placeholder: 'e.g. hydraulic oil ISO VG46' },
  { key: 'flowRate', label: 'Flow Rate', type: 'number', unit: 'L/min' },
  { key: 'pressureDrop', label: 'Pressure Drop (recorded evidence)', type: 'text', placeholder: 'Reference only, e.g. see CALC-041-009' },
  { key: 'pipeSize', label: 'Pipe / Passage Size', type: 'text', placeholder: 'e.g. DN25, 25 mm ID' },
  { key: 'flowMethodRef', label: 'Flow Method Reference', type: 'text', placeholder: 'e.g. Darcy–Weisbach note' },
  { key: 'flowReportRef', label: 'Flow Report Reference', type: 'text' },
];
CATEGORY_FIELDS['Other Engineering Analysis'] = [
  { key: 'basisRef', label: 'Analysis Basis Reference', type: 'text', placeholder: 'e.g. design basis DB-041 clause 6' },
  { key: 'methodRef', label: 'Method Reference', type: 'text', placeholder: 'e.g. calculation method note' },
  { key: 'evidenceRef', label: 'Evidence Reference', type: 'text', placeholder: 'e.g. report or spreadsheet reference' },
];

export function fieldsForCategory(label) {
  const normalized = normalizeCategory(label);
  return CATEGORY_FIELDS[normalized] || CATEGORY_FIELDS['Stress & Strength'];
}

/* ------------------------------------------------------------- statuses */
export const ANALYSIS_STATUSES = [
  'Draft',
  'In Progress',
  'Submitted',
  'Pending Review',
  'Under Review',
  'Changes Requested',
  'On Hold',
  'Verified',
  'Rejected',
  'Superseded',
  'Archived',
];

export const REVIEW_STATUSES = [
  'Pending Review',
  'Assigned',
  'Under Review',
  'Changes Requested',
  'Verified',
  'Rejected',
  'Cancelled',
];

export const REPORT_STATUSES = [
  'Draft',
  'Pending Review',
  'Under Review',
  'Changes Requested',
  'Approved',
  'Superseded',
  'Archived',
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const REVISIONS = ['A', 'B', 'C', 'D', 'E'];

const STATUS_TONES = {
  Draft: 'gray',
  'In Progress': 'blue',
  Submitted: 'orange',
  'Pending Review': 'orange',
  'Under Review': 'purple',
  'Changes Requested': 'red',
  'On Hold': 'orange',
  Verified: 'green',
  Approved: 'green',
  Rejected: 'red',
  Cancelled: 'gray',
  Superseded: 'gray',
  Archived: 'gray',
  Assigned: 'blue',
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

/** The reviewer persona used for the "assigned to me" queue. */
export const CURRENT_REVIEWER = 'N. Joshi';

/* ---------------------------------------------------------- shared refs */
export const ANALYSIS_PROJECTS = PROJECTS;
export const ANALYSIS_ENGINEERS = ['R. Kulkarni', 'D. Rao', 'S. Menon', 'A. Iyer', 'P. Deshmukh', 'V. Sharma'];
export const ANALYSIS_REVIEWERS = ['N. Joshi', 'K. Pillai', 'V. Sharma', 'A. Iyer'];

export function projectName(projects, projectId) {
  return projects?.find((project) => project.id === projectId)?.name || '—';
}

export function projectOf(projects, projectId) {
  return projects?.find((project) => project.id === projectId) || null;
}

/** Resolve a part/assembly id to a readable component label. */
export function componentLabel(linkedType, linkedId, parts = [], assemblies = []) {
  if (!linkedId) return 'Not linked';
  if (linkedType === 'assembly') {
    const assembly = assemblies.find((row) => row.id === linkedId);
    return assembly ? `${assembly.number} · ${assembly.name}` : linkedId;
  }
  if (linkedType === 'part') {
    const part = parts.find((row) => row.id === linkedId);
    return part ? `${part.partNumber} · ${part.name}` : linkedId;
  }
  return linkedId;
}

/* -------------------------------------------------------------- helpers */
export function analysisKpis(rows) {
  const total = rows.length;
  const inProgress = rows.filter((row) =>
    ['In Progress', 'Under Review'].includes(row.verificationStatus),
  ).length;
  const pending = rows.filter((row) =>
    ['Submitted', 'Pending Review'].includes(row.verificationStatus),
  ).length;
  const verified = rows.filter((row) => row.verificationStatus === 'Verified').length;
  return { total, inProgress, pending, verified };
}

function nextSequence(records = []) {
  const numbers = records
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
}

export function nextAnalysisId(analyses = []) {
  return `ANL-2026-${String(nextSequence(analyses)).padStart(3, '0')}`;
}

export function nextReviewId(reviews = []) {
  return `RVW-2026-${String(nextSequence(reviews)).padStart(3, '0')}`;
}

export function nextReportId(reports = []) {
  return `RPT-VAL-2026-${String(nextSequence(reports)).padStart(3, '0')}`;
}

export function nextRevision(revision) {
  const index = REVISIONS.indexOf(revision);
  return REVISIONS[Math.min(index + 1, REVISIONS.length - 1)] || 'A';
}

/** Is the record still editable by its owner? */
export function isAnalysisEditable(analysis) {
  return ['Draft', 'In Progress', 'Changes Requested'].includes(analysis.verificationStatus);
}

/** Can the record be submitted for review? */
export function canSubmitAnalysis(analysis) {
  return ['Draft', 'In Progress', 'Changes Requested'].includes(analysis.verificationStatus);
}

/** Only verified analyses count as verified evidence in a report. */
export function isVerifiedEvidence(analysis) {
  return analysis?.verificationStatus === 'Verified';
}

export function missingEvidence(analysis) {
  return !analysis.attachments || analysis.attachments.length === 0;
}

export function projectValidationSummary(projectId, analyses, reports) {
  const rows = analyses.filter((analysis) => analysis.projectId === projectId);
  const verified = rows.filter((row) => row.verificationStatus === 'Verified');
  const pending = rows.filter((row) =>
    ['Submitted', 'Pending Review', 'Under Review'].includes(row.verificationStatus),
  );
  const changes = rows.filter((row) => row.verificationStatus === 'Changes Requested');
  const missing = rows.filter((row) => missingEvidence(row));
  const projectReports = reports.filter((report) => report.projectId === projectId);
  const latest = [...projectReports].sort((left, right) =>
    `${right.reportDate}${right.revision}`.localeCompare(`${left.reportDate}${left.revision}`),
  )[0];
  return {
    total: rows.length,
    verified: verified.length,
    pending: pending.length,
    changes: changes.length,
    missing: missing.length,
    reports: projectReports.length,
    latestRevision: latest ? `Rev ${latest.revision}` : 'No report yet',
    reportList: projectReports,
  };
}

export function evidenceRows(analyses) {
  return analyses.flatMap((analysis) =>
    (analysis.attachments || []).map((attachment) => ({
      id: `${analysis.id}-${attachment.name}`,
      analysisId: analysis.id,
      analysisTitle: analysis.title,
      analysisType: analysis.analysisType,
      projectId: analysis.projectId,
      linkedType: analysis.linkedType,
      linkedId: analysis.linkedId,
      drawingRevision: analysis.drawingRevision,
      name: attachment.name,
      type: attachment.type || 'Document',
      uploadedBy: attachment.uploadedBy || analysis.engineer,
      uploadedAt: attachment.uploadedAt || analysis.created,
      verificationStatus: analysis.verificationStatus,
    })),
  );
}

/* ------------------------------------------------------------- analyses */
const seedDesigns = {
  drive: { linkedType: 'assembly', linkedId: 'ASM-2026-001' },
  driveFrame: { linkedType: 'assembly', linkedId: 'ASM-2026-002' },
  gearbox: { linkedType: 'part', linkedId: 'PRT-2026-001' },
  shaft: { linkedType: 'part', linkedId: 'PRT-2026-002' },
  bearing: { linkedType: 'part', linkedId: 'PRT-2026-004' },
  frame: { linkedType: 'assembly', linkedId: 'ASM-2026-003' },
  panel: { linkedType: 'assembly', linkedId: 'ASM-2026-004' },
  piping: { linkedType: 'assembly', linkedId: 'ASM-2026-005' },
  roller: { linkedType: 'part', linkedId: 'PRT-2026-005' },
  bracket: { linkedType: 'part', linkedId: 'PRT-2026-006' },
  weldment: { linkedType: 'part', linkedId: 'PRT-2026-008' },
  sheet: { linkedType: 'part', linkedId: 'PRT-2026-010' },
};

function attachment(name, type, size, uploadedBy, uploadedAt) {
  return { name, type, size, uploadedBy, uploadedAt };
}

export const ANALYSES = [
  /* ---- Stress & Strength -------------------------------------------- */
  {
    id: 'ANL-2026-001',
    title: 'Gearbox housing static stress review',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.gearbox,
    drawingRevision: 'Rev C',
    category: 'Stress & Strength',
    analysisType: 'Strength verification',
    description:
      'Consolidate the recorded stress evidence for the gearbox housing under the specified load cases and check it against the project strength criteria.',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    inputConditions: 'Rated torque, belt pull and support reactions as listed in the design basis DB-041.',
    material: 'Cast iron FG260',
    assumptions: 'Housing treated as a single cast body; bolt preload effects reviewed separately.',
    boundaryConditions: 'Feet restrained at mounting pads; bearing loads applied at bore centrelines.',
    acceptanceCriteria: 'Recorded stress below the allowable value in the design basis, with the required factor of safety.',
    resultSummary:
      'Stress evidence recorded in CAL-2026-003 Rev B and the supplier report; values are not recomputed by this workspace.',
    attachments: [
      attachment('stress-evidence-CAL-003.pdf', 'Calculation report', 412_000, 'D. Rao', '2026-09-18'),
      attachment('load-case-matrix.xlsx', 'Load case matrix', 88_000, 'D. Rao', '2026-09-18'),
    ],
    verificationStatus: 'Verified',
    priority: 'High',
    created: '2026-09-16',
    target: '2026-10-02',
    revision: 'B',
    notes: 'Verified evidence only. No design release is implied by this record.',
    tech: {
      loadCaseId: 'LC-041-03',
      loadType: 'Combined',
      appliedLoad: '18 kN belt pull at shaft centreline',
      stressValue: 'Recorded in CAL-2026-003 §4 (reference only)',
      allowableStressRef: 'Design basis DB-041 clause 4.2',
      factorOfSafetyRef: 'FoS requirement DB-041 table 3',
      strengthCriteria: 'Yield',
      calcReportRef: 'CAL-2026-003 Rev B',
    },
    revisions: [
      { revision: 'A', date: '2026-09-16', by: 'D. Rao', note: 'Analysis record created.' },
      { revision: 'B', date: '2026-09-25', by: 'D. Rao', note: 'Added load case matrix and report reference.' },
    ],
    activity: [
      { id: 'ACT-ANL-001-1', label: 'Analysis created', detail: 'Record registered for stress review', by: 'D. Rao', at: '2026-09-16' },
      { id: 'ACT-ANL-001-2', label: 'Submitted for review', detail: 'Evidence package sent to N. Joshi', by: 'D. Rao', at: '2026-09-26' },
      { id: 'ACT-ANL-001-3', label: 'Verified', detail: 'Evidence checked against acceptance criteria', by: 'N. Joshi', at: '2026-09-30' },
    ],
  },
  {
    id: 'ANL-2026-002',
    title: 'Conveyor support bracket strength check',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.bracket,
    drawingRevision: 'Rev B',
    category: 'Stress & Strength',
    analysisType: 'Static stress check',
    description: 'Check the support bracket against the recorded belt tension and bracket loading.',
    engineer: 'S. Menon',
    reviewer: 'K. Pillai',
    inputConditions: 'Belt tension 9.5 kN per side, bracket self weight, installation preload.',
    material: 'IS 2062 E250 BR',
    assumptions: 'Bolted connection assumed rigid for the hand check; weld capacity checked separately.',
    boundaryConditions: 'Base plate fixed at four bolt locations.',
    acceptanceCriteria: 'Hand-check utilisation within the allowance stated in the project design basis.',
    resultSummary: 'Hand-check record attached; utilisation figure is recorded evidence, not recomputed here.',
    attachments: [attachment('bracket-hand-check.pdf', 'Calculation report', 264_000, 'S. Menon', '2026-10-04')],
    verificationStatus: 'Pending Review',
    priority: 'Medium',
    created: '2026-10-01',
    target: '2026-10-18',
    revision: 'A',
    notes: 'Awaiting reviewer confirmation of the load combination used.',
    tech: {
      loadCaseId: 'LC-041-07',
      loadType: 'Static',
      appliedLoad: '9.5 kN per belt side',
      stressValue: 'Hand-check record attached (reference only)',
      allowableStressRef: 'IS 800 working stress allowance',
      factorOfSafetyRef: 'Project requirement DB-041 table 3',
      strengthCriteria: 'Yield',
      calcReportRef: 'Bracket hand check Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-10-01', by: 'S. Menon', note: 'Initial analysis record.' }],
    activity: [
      { id: 'ACT-ANL-002-1', label: 'Analysis created', detail: 'Bracket strength evidence registered', by: 'S. Menon', at: '2026-10-01' },
      { id: 'ACT-ANL-002-2', label: 'Submitted for review', detail: 'Sent to K. Pillai', by: 'S. Menon', at: '2026-10-04' },
    ],
  },
  {
    id: 'ANL-2026-003',
    title: 'Press frame weldment load case review',
    projectId: 'PRJ-2026-024',
    ...seedDesigns.weldment,
    drawingRevision: 'Rev C',
    category: 'Stress & Strength',
    analysisType: 'Strength verification',
    description: 'Review the recorded weldment load cases for the hydraulic press frame.',
    engineer: 'K. Pillai',
    reviewer: 'V. Sharma',
    inputConditions: 'Press force, off-centre loading and frame self weight from the design basis.',
    material: 'IS 2062 E350',
    assumptions: 'Weld throat treated per the fabrication note; no residual stress modelling.',
    boundaryConditions: 'Frame feet pinned at foundation level.',
    acceptanceCriteria: 'Recorded stresses within the allowable values for the weld and base metal.',
    resultSummary: 'Evidence recorded in the weld strength calculation; not re-verified in this workspace.',
    attachments: [
      attachment('frame-weld-strength.pdf', 'Calculation report', 508_000, 'K. Pillai', '2026-08-22'),
      attachment('load-case-photos.zip', 'Site record', 1_240_000, 'K. Pillai', '2026-08-22'),
    ],
    verificationStatus: 'Under Review',
    priority: 'High',
    created: '2026-08-18',
    target: '2026-09-05',
    revision: 'B',
    notes: 'Reviewer requested clarification on the off-centre case.',
    tech: {
      loadCaseId: 'LC-024-02',
      loadType: 'Combined',
      appliedLoad: '1,600 kN press force, 150 mm off centre',
      stressValue: 'Recorded in weld strength calculation §3',
      allowableStressRef: 'Weld allowable per fabrication standard',
      factorOfSafetyRef: 'Design basis DB-024 clause 6',
      strengthCriteria: 'Ultimate',
      calcReportRef: 'CAL-2026-004 Rev B',
    },
    revisions: [
      { revision: 'A', date: '2026-08-18', by: 'K. Pillai', note: 'Initial record.' },
      { revision: 'B', date: '2026-08-24', by: 'K. Pillai', note: 'Added site load case photographs.' },
    ],
    activity: [
      { id: 'ACT-ANL-003-1', label: 'Analysis created', detail: 'Weldment review opened', by: 'K. Pillai', at: '2026-08-18' },
      { id: 'ACT-ANL-003-2', label: 'Submitted for review', detail: 'Sent to V. Sharma', by: 'K. Pillai', at: '2026-08-25' },
    ],
  },
  {
    id: 'ANL-2026-004',
    title: 'Drive shaft keyway stress screening',
    projectId: 'PRJ-2026-031',
    ...seedDesigns.shaft,
    drawingRevision: 'Rev B',
    category: 'Stress & Strength',
    analysisType: 'Static stress check',
    description: 'Record the keyway stress screening evidence for the drive shaft.',
    engineer: 'R. Kulkarni',
    reviewer: 'N. Joshi',
    inputConditions: 'Torque from the duty calculation, key geometry and shaft material data.',
    material: 'EN19',
    assumptions: 'Stress concentration taken from the referenced table; no local FEA performed here.',
    boundaryConditions: 'Shaft supported at both bearing centres.',
    acceptanceCriteria: 'Recorded keyway stress below the allowable for the shaft material.',
    resultSummary: 'Screening reference attached; no independent validation claimed.',
    attachments: [attachment('keyway-screening-note.pdf', 'Technical note', 176_000, 'R. Kulkarni', '2026-07-12')],
    verificationStatus: 'Changes Requested',
    priority: 'Medium',
    created: '2026-07-08',
    target: '2026-07-30',
    revision: 'A',
    notes: 'Reviewer asked for the stress concentration source to be cited.',
    tech: {
      loadCaseId: 'LC-031-01',
      loadType: 'Static',
      appliedLoad: 'Drive torque per CAL-2026-001',
      stressValue: 'Screening note §2 (reference only)',
      allowableStressRef: 'EN19 material data sheet',
      factorOfSafetyRef: 'Design basis DB-031',
      strengthCriteria: 'Yield',
      calcReportRef: 'CAL-2026-001 Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-07-08', by: 'R. Kulkarni', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-004-1', label: 'Analysis created', detail: 'Keyway screening registered', by: 'R. Kulkarni', at: '2026-07-08' },
      { id: 'ACT-ANL-004-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'R. Kulkarni', at: '2026-07-12' },
      { id: 'ACT-ANL-004-3', label: 'Changes requested', detail: 'Stress concentration source missing', by: 'N. Joshi', at: '2026-07-16' },
    ],
  },

  /* ---- Thermal ------------------------------------------------------- */
  {
    id: 'ANL-2026-005',
    title: 'Gearbox steady-state thermal review',
    projectId: 'PRJ-2026-026',
    ...seedDesigns.gearbox,
    drawingRevision: 'Rev B',
    category: 'Thermal Analysis',
    analysisType: 'Steady-state thermal',
    description: 'Record the thermal conditions used for the lubrication unit review.',
    engineer: 'P. Deshmukh',
    reviewer: 'K. Pillai',
    inputConditions: 'Ambient 35 °C, oil sump heat rejection and duty cycle from the project data sheet.',
    material: 'Cast iron FG260',
    assumptions: 'Steady state at rated duty; radiation treated as a lumped coefficient.',
    boundaryConditions: 'Convection on external surfaces; fixed sump temperature as recorded.',
    acceptanceCriteria: 'Recorded operating temperature within the lubricant limit.',
    resultSummary: 'Thermal run data recorded in the supplier report; not re-solved here.',
    attachments: [attachment('thermal-run-report.pdf', 'Thermal report', 690_000, 'P. Deshmukh', '2026-06-28')],
    verificationStatus: 'Verified',
    priority: 'Medium',
    created: '2026-06-20',
    target: '2026-07-10',
    revision: 'B',
    notes: 'Sample evidence only.',
    tech: {
      operatingTemperature: '72',
      minTemperature: '28',
      maxTemperature: '88',
      heatSourceRef: 'Gearbox heat rejection sheet HS-026',
      thermalBoundaryConditions: 'External convection 8 W/m²K, ambient 35 °C (recorded assumption).',
      thermalMaterialRef: 'Material data sheet MD-08',
      reportRef: 'THM-026-01 Rev B',
    },
    revisions: [
      { revision: 'A', date: '2026-06-20', by: 'P. Deshmukh', note: 'Initial record.' },
      { revision: 'B', date: '2026-06-30', by: 'P. Deshmukh', note: 'Added supplier thermal run report.' },
    ],
    activity: [
      { id: 'ACT-ANL-005-1', label: 'Analysis created', detail: 'Thermal record opened', by: 'P. Deshmukh', at: '2026-06-20' },
      { id: 'ACT-ANL-005-2', label: 'Submitted for review', detail: 'Sent to K. Pillai', by: 'P. Deshmukh', at: '2026-07-01' },
      { id: 'ACT-ANL-005-3', label: 'Verified', detail: 'Thermal evidence accepted', by: 'K. Pillai', at: '2026-07-06' },
    ],
  },
  {
    id: 'ANL-2026-006',
    title: 'Control panel enclosure thermal load',
    projectId: 'PRJ-2026-036',
    ...seedDesigns.panel,
    drawingRevision: 'Rev A',
    category: 'Thermal Analysis',
    analysisType: 'Steady-state thermal',
    description: 'Record internal heat load and ventilation assumptions for the enclosure.',
    engineer: 'S. Menon',
    reviewer: 'N. Joshi',
    inputConditions: 'Drive heat losses, panel ventilation rate and ambient conditions.',
    material: 'CRCA sheet',
    assumptions: 'Ventilation assumed continuous; filter blockage not modelled.',
    boundaryConditions: 'External surface convection at still-air coefficient.',
    acceptanceCriteria: 'Recorded internal temperature within the component rating.',
    resultSummary: 'Heat load sheet attached as evidence; no simulation performed in this module.',
    attachments: [attachment('panel-heat-load.xlsx', 'Heat load sheet', 74_000, 'S. Menon', '2026-09-12')],
    verificationStatus: 'Pending Review',
    priority: 'Medium',
    created: '2026-09-08',
    target: '2026-09-26',
    revision: 'A',
    notes: '',
    tech: {
      operatingTemperature: '41',
      minTemperature: '22',
      maxTemperature: '46',
      heatSourceRef: 'Panel heat loss schedule HS-036',
      thermalBoundaryConditions: 'Still air, filtered ventilation (recorded).',
      thermalMaterialRef: 'CRCA thermal data sheet',
      reportRef: 'Heat load sheet Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-09-08', by: 'S. Menon', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-006-1', label: 'Analysis created', detail: 'Enclosure thermal record opened', by: 'S. Menon', at: '2026-09-08' },
      { id: 'ACT-ANL-006-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'S. Menon', at: '2026-09-12' },
    ],
  },
  {
    id: 'ANL-2026-007',
    title: 'Cooling water line thermal expansion note',
    projectId: 'PRJ-2026-033',
    ...seedDesigns.piping,
    drawingRevision: 'Rev B',
    category: 'Thermal Analysis',
    analysisType: 'Transient thermal',
    description: 'Record the thermal expansion assumptions for the cooling water line.',
    engineer: 'V. Sharma',
    reviewer: 'K. Pillai',
    inputConditions: 'Design temperature range and support spacing from the line list.',
    material: 'CS A106 Gr B',
    assumptions: 'Expansion loop flexibility per the isometric note.',
    boundaryConditions: 'Anchors at skid tie-in and exchanger nozzle.',
    acceptanceCriteria: 'Recorded expansion movement within the loop allowance.',
    resultSummary: 'Expansion note attached; no piping stress software run in this module.',
    attachments: [],
    verificationStatus: 'In Progress',
    priority: 'High',
    created: '2026-10-06',
    target: '2026-10-28',
    revision: 'A',
    notes: 'Support flexibility evidence still to be attached.',
    tech: {
      operatingTemperature: '65',
      minTemperature: '5',
      maxTemperature: '80',
      heatSourceRef: 'Line list LL-033',
      thermalBoundaryConditions: 'Anchored at both ends, guided supports between.',
      thermalMaterialRef: 'A106 material data sheet',
      reportRef: '',
    },
    revisions: [{ revision: 'A', date: '2026-10-06', by: 'V. Sharma', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-007-1', label: 'Analysis created', detail: 'Thermal expansion note started', by: 'V. Sharma', at: '2026-10-06' },
    ],
  },

  /* ---- Motion -------------------------------------------------------- */
  {
    id: 'ANL-2026-008',
    title: 'Conveyor drive motion study review',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.drive,
    drawingRevision: 'Rev C',
    category: 'Motion / Kinematics',
    analysisType: 'Motion study',
    description: 'Record the motion study evidence for the conveyor drive.',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    inputConditions: 'Motor speed, reduction ratio and pulley diameters.',
    material: 'Assembly (mixed materials)',
    assumptions: 'Belt slip neglected; steady acceleration profile.',
    boundaryConditions: 'Drive fixed at motor mount; belt tension applied at pulleys.',
    acceptanceCriteria: 'Recorded belt speed and travel within the process requirement.',
    resultSummary: 'Motion study output recorded; results are not regenerated in this workspace.',
    attachments: [attachment('motion-study-MS-041-01.pdf', 'Motion study', 950_000, 'D. Rao', '2026-09-05')],
    verificationStatus: 'Verified',
    priority: 'Medium',
    created: '2026-08-30',
    target: '2026-09-12',
    revision: 'A',
    notes: '',
    tech: {
      mechanismRef: 'Conveyor drive mechanism CD-041',
      motionType: 'Rotary',
      inputSpeed: '1475',
      angularDisplacement: '360',
      linearDisplacement: '1200',
      motionStudyRef: 'MS-041-01 Rev A',
      resultDocRef: 'Motion result sheet MRS-041',
    },
    revisions: [{ revision: 'A', date: '2026-08-30', by: 'D. Rao', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-008-1', label: 'Analysis created', detail: 'Motion study record opened', by: 'D. Rao', at: '2026-08-30' },
      { id: 'ACT-ANL-008-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'D. Rao', at: '2026-09-07' },
      { id: 'ACT-ANL-008-3', label: 'Verified', detail: 'Motion evidence accepted', by: 'N. Joshi', at: '2026-09-11' },
    ],
  },
  {
    id: 'ANL-2026-009',
    title: 'Idler roller rotation and travel check',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.roller,
    drawingRevision: 'Rev A',
    category: 'Motion / Kinematics',
    analysisType: 'Kinematic study',
    description: 'Record the kinematic check for idler roller rotation at belt speed.',
    engineer: 'S. Menon',
    reviewer: 'V. Sharma',
    inputConditions: 'Belt speed and roller diameter from the conveyor datasheet.',
    material: 'IS 2062 E250 BR',
    assumptions: 'No slip between belt and roller.',
    boundaryConditions: 'Roller journalled in fixed bearings.',
    acceptanceCriteria: 'Recorded roller speed within the bearing rating.',
    resultSummary: 'Kinematic note attached (reference only).',
    attachments: [attachment('roller-kinematics.pdf', 'Technical note', 142_000, 'S. Menon', '2026-10-09')],
    verificationStatus: 'Under Review',
    priority: 'Low',
    created: '2026-10-05',
    target: '2026-10-22',
    revision: 'A',
    notes: '',
    tech: {
      mechanismRef: 'Conveyor idler bank IB-041',
      motionType: 'Rotary',
      inputSpeed: '0.8',
      angularDisplacement: '360',
      linearDisplacement: '0',
      motionStudyRef: 'Kinematic note KN-041-02',
      resultDocRef: 'Roller travel sheet',
    },
    revisions: [{ revision: 'A', date: '2026-10-05', by: 'S. Menon', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-009-1', label: 'Analysis created', detail: 'Roller kinematics registered', by: 'S. Menon', at: '2026-10-05' },
      { id: 'ACT-ANL-009-2', label: 'Submitted for review', detail: 'Sent to V. Sharma', by: 'S. Menon', at: '2026-10-09' },
    ],
  },
  {
    id: 'ANL-2026-010',
    title: 'Motor mount adjustment travel study',
    projectId: 'PRJ-2026-029',
    ...seedDesigns.driveFrame,
    drawingRevision: 'Rev B',
    category: 'Motion / Kinematics',
    analysisType: 'Motion study',
    description: 'Record the belt-tensioning adjustment travel available in the motor mount.',
    engineer: 'A. Iyer',
    reviewer: 'K. Pillai',
    inputConditions: 'Adjustment slot length and belt installation allowance.',
    material: 'IS 2062 E250 BR',
    assumptions: 'Manual adjustment, no dynamic repositioning.',
    boundaryConditions: 'Mount fixed after tensioning.',
    acceptanceCriteria: 'Recorded travel range covers belt installation and take-up.',
    resultSummary: 'Travel sketch attached as evidence.',
    attachments: [],
    verificationStatus: 'Draft',
    priority: 'Low',
    created: '2026-10-12',
    target: '2026-11-02',
    revision: 'A',
    notes: 'Awaiting sketch attachment before submission.',
    tech: {
      mechanismRef: 'Motor mount MM-029',
      motionType: 'Linear',
      inputSpeed: '0',
      angularDisplacement: '0',
      linearDisplacement: '45',
      motionStudyRef: '',
      resultDocRef: '',
    },
    revisions: [{ revision: 'A', date: '2026-10-12', by: 'A. Iyer', note: 'Initial record.' }],
    activity: [{ id: 'ACT-ANL-010-1', label: 'Analysis created', detail: 'Adjustment travel study started', by: 'A. Iyer', at: '2026-10-12' }],
  },

  /* ---- FEA ----------------------------------------------------------- */
  {
    id: 'ANL-2026-011',
    title: 'Gearbox housing static structural FEA',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.gearbox,
    drawingRevision: 'Rev C',
    category: 'FEA',
    analysisType: 'Static structural FEA',
    description: 'Record the FEA model, mesh and solver details for the housing study.',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    inputConditions: 'Bearing loads from the shaft analysis and mounting reactions.',
    material: 'Cast iron FG260',
    assumptions: 'Linear elastic material; bonded bearing bores.',
    boundaryConditions: 'Mounting pads fixed; bearing loads applied at bore centres.',
    acceptanceCriteria: 'Reported stress below the allowable in the design basis.',
    resultSummary:
      'Results live in the solver report FEA-041-03; this record stores references only and does not re-run the solve.',
    attachments: [
      attachment('FEA-041-03-report.pdf', 'FEA report', 2_480_000, 'D. Rao', '2026-09-22'),
      attachment('mesh-quality-summary.xlsx', 'Mesh summary', 96_000, 'D. Rao', '2026-09-22'),
    ],
    verificationStatus: 'Verified',
    priority: 'High',
    created: '2026-09-15',
    target: '2026-10-04',
    revision: 'B',
    notes: 'Solver files remain with Drawing & CAD / solver tools.',
    tech: {
      feaModelRef: 'FEA-M-041-B',
      meshType: 'Tetrahedral',
      meshSize: '8',
      elementCount: '184320',
      boundaryConditionRef: 'BC-041-02',
      solverName: 'Recorded solver name/version in report §2',
      resultFileRef: 'FEA-041-03 result set (external)',
      feaReportRef: 'FEA-041-03 Rev B',
    },
    revisions: [
      { revision: 'A', date: '2026-09-15', by: 'D. Rao', note: 'Initial FEA record.' },
      { revision: 'B', date: '2026-09-23', by: 'D. Rao', note: 'Added mesh quality summary.' },
    ],
    activity: [
      { id: 'ACT-ANL-011-1', label: 'Analysis created', detail: 'FEA record registered', by: 'D. Rao', at: '2026-09-15' },
      { id: 'ACT-ANL-011-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'D. Rao', at: '2026-09-24' },
      { id: 'ACT-ANL-011-3', label: 'Verified', detail: 'Model and evidence references accepted', by: 'N. Joshi', at: '2026-09-29' },
    ],
  },
  {
    id: 'ANL-2026-012',
    title: 'Support frame modal FEA screening',
    projectId: 'PRJ-2026-038',
    ...seedDesigns.frame,
    drawingRevision: 'Rev B',
    category: 'FEA',
    analysisType: 'Modal FEA',
    description: 'Record the modal screening model for the feed system support frame.',
    engineer: 'K. Pillai',
    reviewer: 'V. Sharma',
    inputConditions: 'Frame mass, equipment mass and support stiffness.',
    material: 'IS 2062 E250 BR',
    assumptions: 'Welded connections modelled as bonded contacts.',
    boundaryConditions: 'Base plates fixed at anchor locations.',
    acceptanceCriteria: 'First mode above the excitation frequency range.',
    resultSummary: 'Modal result summary attached; not independently validated.',
    attachments: [attachment('modal-screening-report.pdf', 'FEA report', 1_120_000, 'K. Pillai', '2026-08-14')],
    verificationStatus: 'Rejected',
    priority: 'High',
    created: '2026-08-05',
    target: '2026-08-30',
    revision: 'A',
    notes: 'Reviewer rejected the model due to missing equipment mass justification.',
    tech: {
      feaModelRef: 'FEA-M-038-A',
      meshType: 'Shell',
      meshSize: '25',
      elementCount: '48210',
      boundaryConditionRef: 'BC-038-01',
      solverName: 'Recorded in report §1',
      resultFileRef: 'Modal result set (external)',
      feaReportRef: 'FEA-038-01 Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-08-05', by: 'K. Pillai', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-012-1', label: 'Analysis created', detail: 'Modal screening registered', by: 'K. Pillai', at: '2026-08-05' },
      { id: 'ACT-ANL-012-2', label: 'Submitted for review', detail: 'Sent to V. Sharma', by: 'K. Pillai', at: '2026-08-15' },
      { id: 'ACT-ANL-012-3', label: 'Rejected', detail: 'Equipment mass justification missing', by: 'V. Sharma', at: '2026-08-20' },
    ],
  },
  {
    id: 'ANL-2026-013',
    title: 'Enclosure door stiffening FEA note',
    projectId: 'PRJ-2026-036',
    ...seedDesigns.sheet,
    drawingRevision: 'Rev A',
    category: 'FEA',
    analysisType: 'Static structural FEA',
    description: 'Record the shell model used to screen door stiffening options.',
    engineer: 'S. Menon',
    reviewer: 'N. Joshi',
    inputConditions: 'Door weight, hinge reactions and manual operating load.',
    material: 'CRCA sheet',
    assumptions: 'Shell elements with mid-surface geometry.',
    boundaryConditions: 'Hinge line fixed; latch point restrained laterally.',
    acceptanceCriteria: 'Recorded deflection within the enclosure specification.',
    resultSummary: 'Screening model referenced; not a certified result.',
    attachments: [],
    verificationStatus: 'In Progress',
    priority: 'Medium',
    created: '2026-10-10',
    target: '2026-11-04',
    revision: 'A',
    notes: 'Mesh convergence evidence still to be attached.',
    tech: {
      feaModelRef: 'FEA-M-036-A',
      meshType: 'Shell',
      meshSize: '6',
      elementCount: '0',
      boundaryConditionRef: 'BC-036-01',
      solverName: '',
      resultFileRef: '',
      feaReportRef: '',
    },
    revisions: [{ revision: 'A', date: '2026-10-10', by: 'S. Menon', note: 'Initial record.' }],
    activity: [{ id: 'ACT-ANL-013-1', label: 'Analysis created', detail: 'Door stiffening model registered', by: 'S. Menon', at: '2026-10-10' }],
  },
  {
    id: 'ANL-2026-014',
    title: 'Hydraulic press frame FEA evidence pack',
    projectId: 'PRJ-2026-024',
    ...seedDesigns.weldment,
    drawingRevision: 'Rev C',
    category: 'FEA',
    analysisType: 'Static structural FEA',
    description: 'Consolidate the FEA evidence pack for the press frame review.',
    engineer: 'K. Pillai',
    reviewer: 'V. Sharma',
    inputConditions: 'Press force and off-centre loading per design basis.',
    material: 'IS 2062 E350',
    assumptions: 'Mixed mesh, welded connections bonded.',
    boundaryConditions: 'Feet fixed at foundation level.',
    acceptanceCriteria: 'Reported stress within the allowable for base and weld metal.',
    resultSummary: 'Evidence pack recorded; consolidated values remain in the FEA report.',
    attachments: [attachment('press-frame-FEA-pack.pdf', 'FEA report', 3_260_000, 'K. Pillai', '2026-09-02')],
    verificationStatus: 'Under Review',
    priority: 'Critical',
    created: '2026-08-26',
    target: '2026-09-18',
    revision: 'B',
    notes: '',
    tech: {
      feaModelRef: 'FEA-M-024-B',
      meshType: 'Mixed',
      meshSize: '12',
      elementCount: '263400',
      boundaryConditionRef: 'BC-024-02',
      solverName: 'Recorded in report §2',
      resultFileRef: 'Press frame result set (external)',
      feaReportRef: 'FEA-024-02 Rev B',
    },
    revisions: [
      { revision: 'A', date: '2026-08-26', by: 'K. Pillai', note: 'Initial record.' },
      { revision: 'B', date: '2026-09-02', by: 'K. Pillai', note: 'Added consolidated evidence pack.' },
    ],
    activity: [
      { id: 'ACT-ANL-014-1', label: 'Analysis created', detail: 'FEA evidence pack opened', by: 'K. Pillai', at: '2026-08-26' },
      { id: 'ACT-ANL-014-2', label: 'Submitted for review', detail: 'Sent to V. Sharma', by: 'K. Pillai', at: '2026-09-03' },
    ],
  },

  /* ---- Vibration ----------------------------------------------------- */
  {
    id: 'ANL-2026-015',
    title: 'Cooling tower fan hub vibration review',
    projectId: 'PRJ-2026-014',
    ...seedDesigns.shaft,
    drawingRevision: 'Rev B',
    category: 'Vibration / Dynamics',
    analysisType: 'Vibration response',
    description: 'Record the vibration case data for the fan hub.',
    engineer: 'A. Iyer',
    reviewer: 'N. Joshi',
    inputConditions: 'Operating speed, blade pass frequency and measured site vibration record.',
    material: 'EN8',
    assumptions: 'Balancing grade per the fan datasheet.',
    boundaryConditions: 'Hub mounted on the fan shaft taper.',
    acceptanceCriteria: 'Recorded vibration within the acceptance band in the specification.',
    resultSummary: 'Site vibration record attached; no dynamic simulation run here.',
    attachments: [attachment('fan-hub-vibration-record.pdf', 'Measurement record', 320_000, 'A. Iyer', '2026-05-18')],
    verificationStatus: 'Verified',
    priority: 'Medium',
    created: '2026-05-10',
    target: '2026-05-30',
    revision: 'A',
    notes: '',
    tech: {
      vibrationCaseId: 'VC-014-01',
      operatingSpeed: '375',
      frequencyRange: '5–120 Hz',
      excitationRef: 'Motor and blade pass excitation sheet',
      dampingRef: 'Datasheet damping assumption',
      dynamicAnalysisRef: 'Site measurement record',
      reportRef: 'VIB-014-01 Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-05-10', by: 'A. Iyer', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-015-1', label: 'Analysis created', detail: 'Vibration case registered', by: 'A. Iyer', at: '2026-05-10' },
      { id: 'ACT-ANL-015-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'A. Iyer', at: '2026-05-20' },
      { id: 'ACT-ANL-015-3', label: 'Verified', detail: 'Measurement record accepted', by: 'N. Joshi', at: '2026-05-26' },
    ],
  },
  {
    id: 'ANL-2026-016',
    title: 'Drive train torsional vibration screening',
    projectId: 'PRJ-2026-031',
    ...seedDesigns.drive,
    drawingRevision: 'Rev B',
    category: 'Vibration / Dynamics',
    analysisType: 'Dynamic load study',
    description: 'Record the torsional vibration screening for the drive train.',
    engineer: 'R. Kulkarni',
    reviewer: 'K. Pillai',
    inputConditions: 'Motor torque curve and driven inertia.',
    material: 'Assembly (mixed materials)',
    assumptions: 'Two-mass model for screening only.',
    boundaryConditions: 'Motor and load inertias connected by the shaft stiffness.',
    acceptanceCriteria: 'Recorded torsional frequency away from the operating range.',
    resultSummary: 'Screening sheet attached; not a validated dynamic analysis.',
    attachments: [attachment('torsional-screening.xlsx', 'Screening sheet', 68_000, 'R. Kulkarni', '2026-07-22')],
    verificationStatus: 'Pending Review',
    priority: 'Medium',
    created: '2026-07-18',
    target: '2026-08-08',
    revision: 'A',
    notes: '',
    tech: {
      vibrationCaseId: 'VC-031-02',
      operatingSpeed: '1475',
      frequencyRange: '10–80 Hz',
      excitationRef: 'Motor torque curve MT-031',
      dampingRef: 'Assumed 2% damping',
      dynamicAnalysisRef: 'Two-mass screening sheet',
      reportRef: '',
    },
    revisions: [{ revision: 'A', date: '2026-07-18', by: 'R. Kulkarni', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-016-1', label: 'Analysis created', detail: 'Torsional screening registered', by: 'R. Kulkarni', at: '2026-07-18' },
      { id: 'ACT-ANL-016-2', label: 'Submitted for review', detail: 'Sent to K. Pillai', by: 'R. Kulkarni', at: '2026-07-22' },
    ],
  },
  {
    id: 'ANL-2026-017',
    title: 'Utility skid piping vibration check',
    projectId: 'PRJ-2026-033',
    ...seedDesigns.piping,
    drawingRevision: 'Rev A',
    category: 'Vibration / Dynamics',
    analysisType: 'Vibration response',
    description: 'Record the vibration review inputs for the utility skid piping.',
    engineer: 'V. Sharma',
    reviewer: 'V. Sharma',
    inputConditions: 'Pump operating speed and support spacing.',
    material: 'CS A106 Gr B',
    assumptions: 'Pump excitation taken from the vendor sheet.',
    boundaryConditions: 'Supports treated as rigid for the screening.',
    acceptanceCriteria: 'Recorded vibration within the piping specification.',
    resultSummary: 'Vendor excitation sheet attached only.',
    attachments: [],
    verificationStatus: 'Changes Requested',
    priority: 'High',
    created: '2026-09-01',
    target: '2026-09-24',
    revision: 'A',
    notes: 'Reviewer requested support stiffness evidence.',
    tech: {
      vibrationCaseId: 'VC-033-01',
      operatingSpeed: '1450',
      frequencyRange: '5–100 Hz',
      excitationRef: 'Pump vendor sheet VS-033',
      dampingRef: '',
      dynamicAnalysisRef: '',
      reportRef: '',
    },
    revisions: [{ revision: 'A', date: '2026-09-01', by: 'V. Sharma', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-017-1', label: 'Analysis created', detail: 'Piping vibration record opened', by: 'V. Sharma', at: '2026-09-01' },
      { id: 'ACT-ANL-017-2', label: 'Submitted for review', detail: 'Sent to K. Pillai', by: 'V. Sharma', at: '2026-09-06' },
      { id: 'ACT-ANL-017-3', label: 'Changes requested', detail: 'Support stiffness evidence missing', by: 'K. Pillai', at: '2026-09-12' },
    ],
  },

  /* ---- Fatigue ------------------------------------------------------- */
  {
    id: 'ANL-2026-018',
    title: 'Shaft fatigue life screening',
    projectId: 'PRJ-2026-031',
    ...seedDesigns.shaft,
    drawingRevision: 'Rev B',
    category: 'Fatigue',
    analysisType: 'Fatigue life screening',
    description: 'Record the fatigue screening basis for the drive shaft.',
    engineer: 'R. Kulkarni',
    reviewer: 'N. Joshi',
    inputConditions: 'Duty cycle, torque amplitude and shaft material S-N reference.',
    material: 'EN19',
    assumptions: 'Constant amplitude screening; no multiaxial correction.',
    boundaryConditions: 'Shaft rotating bending as recorded.',
    acceptanceCriteria: 'Recorded life above the design target in the design basis.',
    resultSummary: 'Screening note attached; not a certified life prediction.',
    attachments: [attachment('shaft-fatigue-screening.pdf', 'Screening note', 210_000, 'R. Kulkarni', '2026-08-11')],
    verificationStatus: 'Verified',
    priority: 'High',
    created: '2026-08-04',
    target: '2026-08-25',
    revision: 'A',
    notes: '',
    tech: {
      loadCycleType: 'Fully reversed',
      numberOfCycles: '2000000',
      loadSpectrumRef: 'Duty cycle DC-031',
      fatigueMethodRef: 'S-N method reference (recorded)',
      expectedLifeRef: 'Design basis DB-031 life target',
      validationEvidence: 'Supplier material S-N data sheet.',
    },
    revisions: [{ revision: 'A', date: '2026-08-04', by: 'R. Kulkarni', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-018-1', label: 'Analysis created', detail: 'Fatigue screening registered', by: 'R. Kulkarni', at: '2026-08-04' },
      { id: 'ACT-ANL-018-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'R. Kulkarni', at: '2026-08-12' },
      { id: 'ACT-ANL-018-3', label: 'Verified', detail: 'Screening basis accepted', by: 'N. Joshi', at: '2026-08-18' },
    ],
  },
  {
    id: 'ANL-2026-019',
    title: 'Support bracket fatigue review',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.bracket,
    drawingRevision: 'Rev B',
    category: 'Fatigue',
    analysisType: 'Fatigue life screening',
    description: 'Record the fatigue review basis for the support bracket.',
    engineer: 'S. Menon',
    reviewer: 'K. Pillai',
    inputConditions: 'Belt tension variation and bracket stress range reference.',
    material: 'IS 2062 E250 BR',
    assumptions: 'Variable amplitude reduced to an equivalent constant range.',
    boundaryConditions: 'Bolted base as recorded.',
    acceptanceCriteria: 'Recorded life above the maintenance interval target.',
    resultSummary: 'Assessment sheet attached (reference only).',
    attachments: [attachment('bracket-fatigue-assessment.pdf', 'Assessment note', 188_000, 'S. Menon', '2026-10-02')],
    verificationStatus: 'Pending Review',
    priority: 'Medium',
    created: '2026-09-28',
    target: '2026-10-20',
    revision: 'A',
    notes: '',
    tech: {
      loadCycleType: 'Variable amplitude',
      numberOfCycles: '500000',
      loadSpectrumRef: 'Duty cycle sheet DC-041',
      fatigueMethodRef: 'Equivalent constant amplitude',
      expectedLifeRef: 'Maintenance interval target',
      validationEvidence: 'Site strain record summary.',
    },
    revisions: [{ revision: 'A', date: '2026-09-28', by: 'S. Menon', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-019-1', label: 'Analysis created', detail: 'Bracket fatigue review registered', by: 'S. Menon', at: '2026-09-28' },
      { id: 'ACT-ANL-019-2', label: 'Submitted for review', detail: 'Sent to K. Pillai', by: 'S. Menon', at: '2026-10-02' },
    ],
  },
  {
    id: 'ANL-2026-020',
    title: 'Gear tooth bending fatigue screening',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.gearbox,
    drawingRevision: 'Rev C',
    category: 'Fatigue',
    analysisType: 'Fatigue life screening',
    description: 'Record the gear tooth bending fatigue screening basis.',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    inputConditions: 'Tangential load, gear geometry and material bending fatigue reference.',
    material: '20MnCr5',
    assumptions: 'ISO bending stress method conventions, no dynamic factor refinement.',
    boundaryConditions: 'Gear pair as modelled in the drive assembly.',
    acceptanceCriteria: 'Recorded bending fatigue margin above the project target.',
    resultSummary: 'Screening record referenced; values are not recomputed by the module.',
    attachments: [],
    verificationStatus: 'Draft',
    priority: 'High',
    created: '2026-10-13',
    target: '2026-11-06',
    revision: 'A',
    notes: 'Fatigue screening report still to be attached.',
    tech: {
      loadCycleType: 'Pulsating',
      numberOfCycles: '10000000',
      loadSpectrumRef: 'Gear duty cycle GC-041',
      fatigueMethodRef: 'ISO bending screening reference',
      expectedLifeRef: 'Project gear life target',
      validationEvidence: '',
    },
    revisions: [{ revision: 'A', date: '2026-10-13', by: 'D. Rao', note: 'Initial record.' }],
    activity: [{ id: 'ACT-ANL-020-1', label: 'Analysis created', detail: 'Gear fatigue screening started', by: 'D. Rao', at: '2026-10-13' }],
  },

  /* ---- Tolerance ----------------------------------------------------- */
  {
    id: 'ANL-2026-021',
    title: 'Bearing bore tolerance stack-up',
    projectId: 'PRJ-2026-041',
    ...seedDesigns.gearbox,
    drawingRevision: 'Rev C',
    category: 'Tolerance Analysis',
    analysisType: 'Tolerance stack-up',
    description: 'Record the stack-up evidence for the bearing bore and shaft fit.',
    engineer: 'D. Rao',
    reviewer: 'K. Pillai',
    inputConditions: 'Drawing tolerances, bearing tolerance class and fit selection.',
    material: 'Cast iron FG260',
    assumptions: 'Worst-case arithmetic stack-up as recorded.',
    boundaryConditions: 'Not applicable — dimensional study.',
    acceptanceCriteria: 'Stack-up result within the selected fit clearance range.',
    resultSummary: 'Stack-up sheet attached; the module does not recalculate limits.',
    attachments: [attachment('bore-stackup-TS-041-02.xlsx', 'Stack-up sheet', 84_000, 'D. Rao', '2026-09-19')],
    verificationStatus: 'Verified',
    priority: 'Medium',
    created: '2026-09-12',
    target: '2026-09-30',
    revision: 'A',
    notes: '',
    tech: {
      toleranceScheme: 'TS-041-02',
      dimensionRef: 'DWG-041-014 dim 12',
      nominalDimension: '150',
      upperTolerance: '0.04',
      lowerTolerance: '0',
      stackupMethodRef: 'Worst-case arithmetic (recorded)',
      toleranceReportRef: 'Stack-up sheet Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-09-12', by: 'D. Rao', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-021-1', label: 'Analysis created', detail: 'Bore stack-up registered', by: 'D. Rao', at: '2026-09-12' },
      { id: 'ACT-ANL-021-2', label: 'Submitted for review', detail: 'Sent to K. Pillai', by: 'D. Rao', at: '2026-09-20' },
      { id: 'ACT-ANL-021-3', label: 'Verified', detail: 'Stack-up evidence accepted', by: 'K. Pillai', at: '2026-09-25' },
    ],
  },
  {
    id: 'ANL-2026-022',
    title: 'Enclosure panel gap tolerance review',
    projectId: 'PRJ-2026-036',
    ...seedDesigns.panel,
    drawingRevision: 'Rev A',
    category: 'Tolerance Analysis',
    analysisType: 'Tolerance stack-up',
    description: 'Record the panel gap stack-up for the enclosure assembly.',
    engineer: 'S. Menon',
    reviewer: 'N. Joshi',
    inputConditions: 'Panel bend tolerances, frame squareness and door gap requirement.',
    material: 'CRCA sheet',
    assumptions: 'RSS stack-up approach as recorded in the scheme note.',
    boundaryConditions: 'Not applicable — dimensional study.',
    acceptanceCriteria: 'Recorded gap range within the enclosure specification.',
    resultSummary: 'Scheme note attached; no recalculation performed here.',
    attachments: [attachment('panel-gap-scheme.pdf', 'Stack-up note', 156_000, 'S. Menon', '2026-10-08')],
    verificationStatus: 'Superseded',
    priority: 'Low',
    created: '2026-09-25',
    target: '2026-10-15',
    revision: 'A',
    notes: 'Superseded by the revised enclosure scheme.',
    tech: {
      toleranceScheme: 'TS-036-01',
      dimensionRef: 'DWG-036-007 dim 6',
      nominalDimension: '3',
      upperTolerance: '1',
      lowerTolerance: '-1',
      stackupMethodRef: 'RSS (recorded)',
      toleranceReportRef: 'Panel gap scheme Rev A',
    },
    revisions: [{ revision: 'A', date: '2026-09-25', by: 'S. Menon', note: 'Initial record.' }],
    activity: [
      { id: 'ACT-ANL-022-1', label: 'Analysis created', detail: 'Panel gap review registered', by: 'S. Menon', at: '2026-09-25' },
      { id: 'ACT-ANL-022-2', label: 'Superseded', detail: 'Replaced by revised enclosure scheme', by: 'S. Menon', at: '2026-10-08' },
    ],
  },
];

/* --------------------------------------------------------------- reviews */
function reviewHistory(entries) {
  return entries.map((entry, index) => ({
    id: `RH-${index + 1}`,
    previousStatus: entry.from,
    newStatus: entry.to,
    action: entry.action,
    user: entry.user,
    at: entry.at,
    comments: entry.comments || '',
  }));
}

export const REVIEWS = [
  {
    id: 'RVW-2026-001',
    analysisId: 'ANL-2026-002',
    submittedBy: 'S. Menon',
    reviewer: 'K. Pillai',
    submittedDate: '2026-10-04',
    dueDate: '2026-10-18',
    priority: 'Medium',
    status: 'Pending Review',
    comments: '',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['bracket-hand-check.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'S. Menon', at: '2026-10-04T10:20:00', comments: 'Bracket evidence attached.' },
    ]),
  },
  {
    id: 'RVW-2026-002',
    analysisId: 'ANL-2026-006',
    submittedBy: 'S. Menon',
    reviewer: 'N. Joshi',
    submittedDate: '2026-09-12',
    dueDate: '2026-09-26',
    priority: 'Medium',
    status: 'Pending Review',
    comments: '',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['panel-heat-load.xlsx'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'S. Menon', at: '2026-09-12T09:05:00', comments: 'Heat load sheet attached.' },
    ]),
  },
  {
    id: 'RVW-2026-003',
    analysisId: 'ANL-2026-016',
    submittedBy: 'R. Kulkarni',
    reviewer: 'K. Pillai',
    submittedDate: '2026-07-22',
    dueDate: '2026-08-08',
    priority: 'Medium',
    status: 'Pending Review',
    comments: '',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['torsional-screening.xlsx'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'R. Kulkarni', at: '2026-07-22T14:40:00', comments: 'Screening sheet attached.' },
    ]),
  },
  {
    id: 'RVW-2026-004',
    analysisId: 'ANL-2026-019',
    submittedBy: 'S. Menon',
    reviewer: 'K. Pillai',
    submittedDate: '2026-10-02',
    dueDate: '2026-10-20',
    priority: 'Medium',
    status: 'Pending Review',
    comments: '',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['bracket-fatigue-assessment.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'S. Menon', at: '2026-10-02T11:15:00', comments: 'Assessment note attached.' },
    ]),
  },
  {
    id: 'RVW-2026-005',
    analysisId: 'ANL-2026-003',
    submittedBy: 'K. Pillai',
    reviewer: 'V. Sharma',
    submittedDate: '2026-08-25',
    dueDate: '2026-09-05',
    priority: 'High',
    status: 'Under Review',
    comments: 'Reviewing the off-centre load case; requested clarification from the engineer.',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['frame-weld-strength.pdf', 'load-case-photos.zip'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'K. Pillai', at: '2026-08-25T09:30:00', comments: 'Full evidence pack attached.' },
      { from: 'Pending Review', to: 'Under Review', action: 'Review started', user: 'V. Sharma', at: '2026-08-27T15:10:00', comments: 'Checking off-centre case.' },
    ]),
  },
  {
    id: 'RVW-2026-006',
    analysisId: 'ANL-2026-009',
    submittedBy: 'S. Menon',
    reviewer: 'V. Sharma',
    submittedDate: '2026-10-09',
    dueDate: '2026-10-22',
    priority: 'Low',
    status: 'Under Review',
    comments: '',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['roller-kinematics.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'S. Menon', at: '2026-10-09T08:50:00', comments: 'Kinematic note attached.' },
      { from: 'Pending Review', to: 'Under Review', action: 'Review started', user: 'V. Sharma', at: '2026-10-11T10:00:00', comments: '' },
    ]),
  },
  {
    id: 'RVW-2026-007',
    analysisId: 'ANL-2026-014',
    submittedBy: 'K. Pillai',
    reviewer: 'V. Sharma',
    submittedDate: '2026-09-03',
    dueDate: '2026-09-18',
    priority: 'Critical',
    status: 'Under Review',
    comments: '',
    decision: '',
    decisionDate: '',
    evidenceRefs: ['press-frame-FEA-pack.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'K. Pillai', at: '2026-09-03T16:05:00', comments: 'Consolidated FEA evidence pack.' },
      { from: 'Pending Review', to: 'Under Review', action: 'Review started', user: 'V. Sharma', at: '2026-09-06T09:45:00', comments: '' },
    ]),
  },
  {
    id: 'RVW-2026-008',
    analysisId: 'ANL-2026-004',
    submittedBy: 'R. Kulkarni',
    reviewer: 'N. Joshi',
    submittedDate: '2026-07-12',
    dueDate: '2026-07-30',
    priority: 'Medium',
    status: 'Changes Requested',
    comments: 'Please cite the stress concentration source used in the keyway screening before resubmission.',
    decision: 'Changes Requested',
    decisionDate: '2026-07-16',
    evidenceRefs: ['keyway-screening-note.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'R. Kulkarni', at: '2026-07-12T12:00:00', comments: '' },
      { from: 'Pending Review', to: 'Changes Requested', action: 'Changes requested', user: 'N. Joshi', at: '2026-07-16T11:30:00', comments: 'Stress concentration source missing.' },
    ]),
  },
  {
    id: 'RVW-2026-009',
    analysisId: 'ANL-2026-017',
    submittedBy: 'V. Sharma',
    reviewer: 'K. Pillai',
    submittedDate: '2026-09-06',
    dueDate: '2026-09-24',
    priority: 'High',
    status: 'Changes Requested',
    comments: 'Support stiffness evidence is required, and the damping assumption must be stated.',
    decision: 'Changes Requested',
    decisionDate: '2026-09-12',
    evidenceRefs: [],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'V. Sharma', at: '2026-09-06T10:10:00', comments: '' },
      { from: 'Pending Review', to: 'Changes Requested', action: 'Changes requested', user: 'K. Pillai', at: '2026-09-12T14:25:00', comments: 'Support stiffness and damping evidence missing.' },
    ]),
  },
  {
    id: 'RVW-2026-010',
    analysisId: 'ANL-2026-012',
    submittedBy: 'K. Pillai',
    reviewer: 'V. Sharma',
    submittedDate: '2026-08-15',
    dueDate: '2026-08-30',
    priority: 'High',
    status: 'Rejected',
    comments: 'Model does not justify the equipment mass used. Resubmit with the updated mass breakdown.',
    decision: 'Rejected',
    decisionDate: '2026-08-20',
    evidenceRefs: ['modal-screening-report.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'K. Pillai', at: '2026-08-15T09:00:00', comments: '' },
      { from: 'Pending Review', to: 'Rejected', action: 'Rejected', user: 'V. Sharma', at: '2026-08-20T16:40:00', comments: 'Equipment mass justification missing.' },
    ]),
  },
  {
    id: 'RVW-2026-011',
    analysisId: 'ANL-2026-001',
    submittedBy: 'D. Rao',
    reviewer: 'N. Joshi',
    submittedDate: '2026-09-26',
    dueDate: '2026-10-02',
    priority: 'High',
    status: 'Verified',
    comments: 'Load cases, material and acceptance criteria checked. Evidence references are complete.',
    decision: 'Verified',
    decisionDate: '2026-09-30',
    evidenceRefs: ['stress-evidence-CAL-003.pdf', 'load-case-matrix.xlsx'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'D. Rao', at: '2026-09-26T11:00:00', comments: '' },
      { from: 'Pending Review', to: 'Verified', action: 'Verified', user: 'N. Joshi', at: '2026-09-30T10:15:00', comments: 'Evidence references complete.' },
    ]),
  },
  {
    id: 'RVW-2026-012',
    analysisId: 'ANL-2026-005',
    submittedBy: 'P. Deshmukh',
    reviewer: 'K. Pillai',
    submittedDate: '2026-07-01',
    dueDate: '2026-07-10',
    priority: 'Medium',
    status: 'Verified',
    comments: 'Thermal assumptions and supplier report checked against the acceptance criteria.',
    decision: 'Verified',
    decisionDate: '2026-07-06',
    evidenceRefs: ['thermal-run-report.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'P. Deshmukh', at: '2026-07-01T09:30:00', comments: '' },
      { from: 'Pending Review', to: 'Verified', action: 'Verified', user: 'K. Pillai', at: '2026-07-06T13:20:00', comments: 'Assumptions consistent with the run report.' },
    ]),
  },
  {
    id: 'RVW-2026-013',
    analysisId: 'ANL-2026-008',
    submittedBy: 'D. Rao',
    reviewer: 'N. Joshi',
    submittedDate: '2026-09-07',
    dueDate: '2026-09-12',
    priority: 'Medium',
    status: 'Verified',
    comments: 'Motion study reference and boundary conditions checked.',
    decision: 'Verified',
    decisionDate: '2026-09-11',
    evidenceRefs: ['motion-study-MS-041-01.pdf'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'D. Rao', at: '2026-09-07T10:40:00', comments: '' },
      { from: 'Pending Review', to: 'Verified', action: 'Verified', user: 'N. Joshi', at: '2026-09-11T15:00:00', comments: 'Study reference verified.' },
    ]),
  },
  {
    id: 'RVW-2026-014',
    analysisId: 'ANL-2026-011',
    submittedBy: 'D. Rao',
    reviewer: 'N. Joshi',
    submittedDate: '2026-09-24',
    dueDate: '2026-10-04',
    priority: 'High',
    status: 'Verified',
    comments: 'Mesh summary and solver report references are consistent with the model record.',
    decision: 'Verified',
    decisionDate: '2026-09-29',
    evidenceRefs: ['FEA-041-03-report.pdf', 'mesh-quality-summary.xlsx'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'D. Rao', at: '2026-09-24T09:15:00', comments: '' },
      { from: 'Pending Review', to: 'Verified', action: 'Verified', user: 'N. Joshi', at: '2026-09-29T11:45:00', comments: 'References consistent.' },
    ]),
  },
  {
    id: 'RVW-2026-015',
    analysisId: 'ANL-2026-021',
    submittedBy: 'D. Rao',
    reviewer: 'K. Pillai',
    submittedDate: '2026-09-20',
    dueDate: '2026-09-30',
    priority: 'Medium',
    status: 'Verified',
    comments: 'Stack-up sheet checked against the fit requirement.',
    decision: 'Verified',
    decisionDate: '2026-09-25',
    evidenceRefs: ['bore-stackup-TS-041-02.xlsx'],
    history: reviewHistory([
      { from: 'Draft', to: 'Pending Review', action: 'Submitted for review', user: 'D. Rao', at: '2026-09-20T14:00:00', comments: '' },
      { from: 'Pending Review', to: 'Verified', action: 'Verified', user: 'K. Pillai', at: '2026-09-25T10:05:00', comments: 'Within fit allowance.' },
    ]),
  },
];

/* ------------------------------------------------------- validation reports */
export const VALIDATION_REPORTS = [
  {
    id: 'RPT-VAL-2026-001',
    title: 'Conveyor drive validation report',
    projectId: 'PRJ-2026-041',
    product: 'Conveyor drive assembly',
    description:
      'Consolidated validation evidence for the conveyor drive assembly, referencing the verified stress, motion, FEA and tolerance analyses.',
    analysisIds: ['ANL-2026-001', 'ANL-2026-008', 'ANL-2026-011', 'ANL-2026-021'],
    preparedBy: 'D. Rao',
    reviewer: 'N. Joshi',
    reportDate: '2026-10-06',
    revision: 'B',
    summary:
      'The selected analyses cover the structural, motion, FEA and tolerance evidence for the drive assembly. All four records are verified in the analysis register.',
    openIssues: 'Gear tooth fatigue screening (ANL-2026-020) is still a draft and is therefore outstanding evidence.',
    recommendations: 'Complete the gear fatigue screening before design release review.',
    status: 'Approved',
    approvalRef: 'APR-2026-041-002',
    attachments: [attachment('validation-report-041.pdf', 'Validation report', 780_000, 'D. Rao', '2026-10-06')],
    revisions: [
      { revision: 'A', date: '2026-09-30', by: 'D. Rao', note: 'Initial draft report.' },
      { revision: 'B', date: '2026-10-06', by: 'D. Rao', note: 'Added tolerance evidence and reviewer comments.' },
    ],
    activity: [
      { id: 'ACT-RPT-001-1', label: 'Report created', detail: 'Draft report prepared', by: 'D. Rao', at: '2026-09-30' },
      { id: 'ACT-RPT-001-2', label: 'Submitted for review', detail: 'Sent to N. Joshi', by: 'D. Rao', at: '2026-10-02' },
      { id: 'ACT-RPT-001-3', label: 'Approved', detail: 'Approval reference APR-2026-041-002', by: 'N. Joshi', at: '2026-10-06' },
    ],
  },
  {
    id: 'RPT-VAL-2026-002',
    title: 'Feed frame structural validation summary',
    projectId: 'PRJ-2026-038',
    product: 'Feed system support frame',
    description:
      'Validation summary for the feed frame covering the weldment stress review and the modal screening record.',
    analysisIds: ['ANL-2026-003', 'ANL-2026-012'],
    preparedBy: 'K. Pillai',
    reviewer: 'V. Sharma',
    reportDate: '2026-09-09',
    revision: 'A',
    summary:
      'Stress evidence is under review and the modal screening was rejected; neither record is verified, so the report contains outstanding evidence only.',
    openIssues: 'Modal model requires an updated equipment mass breakdown before resubmission.',
    recommendations: 'Hold validation sign-off until the modal screening is reworked.',
    status: 'Pending Review',
    approvalRef: '',
    attachments: [],
    revisions: [{ revision: 'A', date: '2026-09-09', by: 'K. Pillai', note: 'Initial report.' }],
    activity: [
      { id: 'ACT-RPT-002-1', label: 'Report created', detail: 'Draft report prepared', by: 'K. Pillai', at: '2026-09-09' },
      { id: 'ACT-RPT-002-2', label: 'Submitted for review', detail: 'Sent to V. Sharma', by: 'K. Pillai', at: '2026-09-10' },
    ],
  },
  {
    id: 'RPT-VAL-2026-003',
    title: 'Enclosure thermal and tolerance summary',
    projectId: 'PRJ-2026-036',
    product: 'Control panel housing',
    description:
      'Working validation summary for the enclosure thermal load record and the revised panel gap tolerance scheme.',
    analysisIds: ['ANL-2026-006', 'ANL-2026-013', 'ANL-2026-022'],
    preparedBy: 'S. Menon',
    reviewer: 'N. Joshi',
    reportDate: '2026-10-12',
    revision: 'A',
    summary:
      'Thermal evidence is pending review, the door stiffening study is in progress and the earlier tolerance scheme is superseded. No verified evidence is available yet.',
    openIssues: 'Need a verified tolerance scheme revision and the door stiffening evidence.',
    recommendations: 'Reissue the tolerance scheme before consolidating this report.',
    status: 'Draft',
    approvalRef: '',
    attachments: [attachment('enclosure-summary-notes.pdf', 'Working notes', 120_000, 'S. Menon', '2026-10-12')],
    revisions: [{ revision: 'A', date: '2026-10-12', by: 'S. Menon', note: 'Initial draft.' }],
    activity: [{ id: 'ACT-RPT-003-1', label: 'Report created', detail: 'Draft started', by: 'S. Menon', at: '2026-10-12' }],
  },
  {
    id: 'RPT-VAL-2026-004',
    title: 'Shaft fatigue validation record',
    projectId: 'PRJ-2026-031',
    product: 'Drive shaft assembly',
    description: 'Validation record for the shaft fatigue screening, superseded by the revised duty cycle.',
    analysisIds: ['ANL-2026-018'],
    preparedBy: 'R. Kulkarni',
    reviewer: 'N. Joshi',
    reportDate: '2026-08-20',
    revision: 'A',
    summary: 'Fatigue screening was verified, but the duty cycle has since changed; this report is superseded.',
    openIssues: 'Duty cycle revision requires a new fatigue screening.',
    recommendations: 'Create a new report revision once the screening is repeated.',
    status: 'Superseded',
    approvalRef: 'APR-2026-031-001',
    attachments: [],
    revisions: [{ revision: 'A', date: '2026-08-20', by: 'R. Kulkarni', note: 'Initial report.' }],
    activity: [
      { id: 'ACT-RPT-004-1', label: 'Report approved', detail: 'Approval reference APR-2026-031-001', by: 'N. Joshi', at: '2026-08-22' },
      { id: 'ACT-RPT-004-2', label: 'Superseded', detail: 'Duty cycle revised', by: 'R. Kulkarni', at: '2026-09-01' },
    ],
  },
];

export const REPORT_SECTIONS = [
  'Report Information',
  'Project Selection',
  'Analysis Record Selection',
  'Evidence Summary',
  'Validation Summary',
  'Open Issues & Recommendations',
  'Supporting Attachments',
  'Review Assignment',
];

export const REVIEW_VIEWS = [
  { key: 'pending', label: 'Pending Reviews' },
  { key: 'assigned', label: 'Assigned Reviews' },
  { key: 'verification', label: 'Verification Queue' },
  { key: 'changes', label: 'Changes Requested' },
  { key: 'verified', label: 'Verified Analyses' },
  { key: 'history', label: 'Review History' },
];

export const REPORT_VIEWS = [
  { key: 'all', label: 'All Validation Reports' },
  { key: 'new', label: 'New Validation Report' },
  { key: 'summary', label: 'Project Validation Summary' },
  { key: 'evidence', label: 'Analysis Evidence' },
  { key: 'revisions', label: 'Report Revision History' },
  { key: 'approved', label: 'Approved Reports' },
];

/** Review queue helper used by the Review & Verification workspace. */
export function reviewsForView(reviews, view) {
  switch (view) {
    case 'pending':
      return reviews.filter((review) => review.status === 'Pending Review');
    case 'assigned':
      return reviews.filter(
        (review) =>
          review.reviewer === CURRENT_REVIEWER &&
          ['Pending Review', 'Assigned', 'Under Review'].includes(review.status),
      );
    case 'verification':
      return reviews.filter((review) => ['Assigned', 'Under Review'].includes(review.status));
    case 'changes':
      return reviews.filter((review) => review.status === 'Changes Requested');
    case 'verified':
      return reviews.filter((review) => review.status === 'Verified');
    case 'history':
    default:
      return reviews;
  }
}
