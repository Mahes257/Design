/**
 * Module 12 — Engineering Change & Release mock data.
 *
 * Change decisions and releases are browser-local simulation records. Released
 * BOM and drawing masters are referenced by snapshot and are never rewritten
 * from this module.
 */
import { TODAY, addDays, formatDate } from './projectData';

export { TODAY, addDays, formatDate };

export const CHANGE_STATUSES = [
  'Draft',
  'ECR Submitted',
  'Impact Assessment',
  'ECR Approved',
  'ECR Rejected',
  'ECO Created',
  'ECO Review',
  'ECO Approved',
  'ECO Rejected',
  'Change Implementation',
  'Revision Updated',
  'Change Closed',
  'Released',
  'Pending ECO Approval',
  'Rejected',
];

export const ECR_STATUSES = [
  'Draft',
  'ECR Submitted',
  'Impact Assessment',
  'ECR Approved',
  'ECR Rejected',
  'ECO Created',
  'ECO Review',
  'ECO Approved',
  'ECO Rejected',
  'Change Implementation',
  'Revision Updated',
  'Change Closed',
  'Released',
];

export const ECO_STATUSES = [
  'ECO Created',
  'ECO Review',
  'ECO Approved',
  'ECO Rejected',
  'Change Implementation',
  'Revision Updated',
  'Change Closed',
  'Released',
];

export const ECO_REVIEW_STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected'];

export const CHANGE_CATEGORIES = [
  'Design Correction',
  'Performance Improvement',
  'Material Change',
  'Dimensional Change',
  'Manufacturing Improvement',
  'Safety / Compliance',
  'Customer Requirement',
  'Other',
];

export const CHANGE_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'];

export const IMPACT_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const HANDOVER_STATUSES = ['Not Required', 'Prepared', 'Acknowledged', 'On Hold', 'Rejected'];

export const CHANGE_REVIEWERS = ['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'];

const STATUS_TONES = {
  Draft: 'gray',
  'ECR Submitted': 'blue',
  'Impact Assessment': 'purple',
  'ECR Approved': 'green',
  'ECR Rejected': 'red',
  'ECO Created': 'gray',
  'ECO Review': 'orange',
  'Pending ECO Approval': 'orange',
  'ECO Approved': 'blue',
  'ECO Rejected': 'red',
  'Change Implementation': 'purple',
  'Revision Updated': 'blue',
  'Change Closed': 'green',
  Released: 'green',
  Rejected: 'red',
  'Under Review': 'orange',
  Pending: 'orange',
  Approved: 'green',
  'Not Required': 'gray',
  Prepared: 'blue',
  Acknowledged: 'green',
  'On Hold': 'orange',
};

export function engineeringTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export function nextChangeId(changes = []) {
  const numbers = changes
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter(Number.isFinite);
  return `ECR-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextReleaseId(releases = []) {
  const numbers = releases
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter(Number.isFinite);
  return `ERL-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextEcoId(ecos = []) {
  const numbers = ecos
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter(Number.isFinite);
  return `ECO-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextRevision(revision) {
  const steps = ['A', 'B', 'C', 'D', 'E', 'F'];
  const index = steps.indexOf(String(revision || '').toUpperCase());
  if (index === -1) return 'A';
  return steps[index + 1] || `${revision}1`;
}

/** Snapshot and readiness checks for transferring a change's approved revision. */
export function releaseEligibility(change, boms = [], drawings = [], releases = []) {
  const reasons = [];
  if (!change) return { eligible: false, reasons: ['Change record not found.'], bom: null, drawing: null };

  const existingRelease = releases.find((row) => row.changeId === change.id);
  if (existingRelease) reasons.push(`Already released as ${existingRelease.id}.`);
  if (change.approvalStatus !== 'Approved') reasons.push('ECO approval is required.');
  if (!change.revisionUpdated) reasons.push('Apply the approved revision update before release.');
  if (!change.proposedBomRevision || !change.proposedDrawingRevision || !change.proposedRevision) {
    reasons.push('Proposed BOM, drawing and change revisions are required.');
  }

  const bom = boms.find((row) => row.id === change.bomId) || null;
  const drawing = drawings.find((row) => row.id === change.drawingId) || null;

  if (!bom) reasons.push('The affected BOM was not found.');
  else if (!['Approved', 'Released'].includes(bom.status)) {
    reasons.push(`BOM ${bom.id} is ${bom.status}; only an approved or released BOM can provide a transfer baseline.`);
  }

  if (!drawing) reasons.push('The affected drawing was not found.');
  else if (!['Approved', 'Released'].includes(drawing.approvalStatus)) {
    reasons.push(`Drawing ${drawing.drawingNumber} is ${drawing.approvalStatus}; only an approved or released drawing can provide a transfer baseline.`);
  }

  const bomAdvanced = change.revisionUpdated && bom && bom.revision === change.proposedBomRevision;
  const drawingAdvanced = change.revisionUpdated && drawing && drawing.revision === change.proposedDrawingRevision;

  if (change.firstRelease) {
    if (bom && change.proposedBomRevision !== bom.revision) {
      reasons.push('A first-time release must use the currently approved BOM revision.');
    }
    if (drawing && change.proposedDrawingRevision !== drawing.revision) {
      reasons.push('A first-time release must use the currently approved drawing revision.');
    }
  } else {
    if (bom && !bomAdvanced && change.currentBomRevision !== bom.revision) {
      reasons.push(`The BOM is now Rev ${bom.revision}; the change baseline is Rev ${change.currentBomRevision}.`);
    }
    if (drawing && !drawingAdvanced && change.currentDrawingRevision !== drawing.revision) {
      reasons.push(`The drawing is now Rev ${drawing.revision}; the change baseline is Rev ${change.currentDrawingRevision}.`);
    }
    if (change.currentRevision === change.proposedRevision) {
      reasons.push('A revision change must propose a different revision.');
    }
  }


  return { eligible: reasons.length === 0, reasons, bom, drawing, existingRelease, bomAdvanced, drawingAdvanced };
}

export function changeStats(changes, releases) {
  return {
    total: changes.length,
    open: changes.filter((row) => !['Released', 'Rejected', 'ECR Rejected', 'Change Closed'].includes(row.status)).length,
    pendingEco: changes.filter((row) => ['ECO Review', 'Pending ECO Approval', 'ECO Approved', 'Change Implementation'].includes(row.status)).length,
    ready: changes.filter((row) => row.approvalStatus === 'Approved' && row.revisionUpdated && !releases.some((release) => release.changeId === row.id)).length,
    released: releases.length,
  };
}

const history = (id, at, stage, action, by, comments, statusAfter) => ({
  id: `${id}-H-${stage.replace(/\s+/g, '-').toLowerCase()}-${at}`,
  at,
  stage,
  action,
  by,
  comments,
  statusAfter,
});

export const CHANGES = [
  {
    id: 'ECR-2026-001',
    projectId: 'PRJ-2026-041',
    title: 'Gearbox bearing seat update',
    changeReason: 'Bearing supplier changed the seat tolerance recommendation after a field durability review. The housing bore and associated drawing dimensions require correction.',
    affectedParts: 'MEC-041-001 · Gearbox housing',
    affectedAssemblies: 'ASM-2026-001 · Conveyor drive assembly',
    bomId: 'BOM-2026-001',
    drawingId: 'DRW-2026-002',
    currentRevision: 'C',
    proposedRevision: 'D',
    currentBomRevision: 'C',
    proposedBomRevision: 'D',
    currentDrawingRevision: 'B',
    proposedDrawingRevision: 'C',
    impactLevel: 'High',
    impact: 'Bearing bore tolerance changes affect machining, inspection and the purchased bearing interface. Items 1 and 4 of the BOM remain structurally unchanged but require a new quantity and inspection note.',
    assessmentNotes: 'Machining and quality reviewed the revised tolerance stack. No change to the assembly envelope. Existing released Rev C BOM and Rev B drawing remain preserved.',
    approvalStatus: 'Approved',
    status: 'Revision Updated',
    reviewer: 'N. Joshi',
    decisionComments: 'Approved after manufacturing confirmed the revised bore tolerance and inspection method.',
    firstRelease: false,
    revisionUpdated: true,
    raisedBy: 'D. Rao',
    raisedAt: '2026-11-01',
    impactAssessedAt: '2026-11-04',
    ecoApprovedAt: '2026-11-07',
    revisionUpdatedAt: '2026-11-11',
    releaseId: '',
    history: [
      history('ECR-2026-001', '2026-11-01', 'ECR', 'Change request raised', 'D. Rao', 'Bearing seat tolerance change requested.', 'ECR Submitted'),
      history('ECR-2026-001', '2026-11-04', 'Impact Assessment', 'Impact assessment completed', 'N. Joshi', 'Affected BOM and drawing revisions identified.', 'Impact Assessment'),
      history('ECR-2026-001', '2026-11-07', 'ECO Approval', 'ECO approved', 'N. Joshi', 'Manufacturing review accepted the revised tolerance.', 'ECO Approved'),
      history('ECR-2026-001', '2026-11-11', 'Revision Update', 'Proposed revisions recorded', 'D. Rao', 'BOM Rev D and drawing Rev C prepared for release. Released masters remain unchanged.', 'Revision Updated'),
    ],
  },
  {
    id: 'ECR-2026-002',
    projectId: 'PRJ-2026-038',
    title: 'Conveyor frame bracket revision',
    changeReason: 'The client requested an additional mounting bracket and revised hole spacing for the frame support structure.',
    affectedParts: 'FAB-038-001 · Base frame',
    affectedAssemblies: 'ASM-2026-005 · Feed system support frame',
    bomId: 'BOM-2026-002',
    drawingId: 'DRW-2026-003',
    currentRevision: 'B',
    proposedRevision: 'C',
    currentBomRevision: 'B',
    proposedBomRevision: 'C',
    currentDrawingRevision: 'B',
    proposedDrawingRevision: 'C',
    impactLevel: 'Medium',
    impact: 'Adds one fabricated bracket and changes the mounting hole pattern. Supplier scope and material quantity are affected.',
    assessmentNotes: 'Fabrication confirmed the new bracket is within the existing press-brake envelope. No change to the released Rev B source records.',
    approvalStatus: 'Approved',
    status: 'ECO Approved',
    reviewer: 'A. Iyer',
    decisionComments: 'Approved for revision preparation. The new bracket must be included in the next BOM revision.',
    firstRelease: false,
    revisionUpdated: false,
    raisedBy: 'K. Pillai',
    raisedAt: '2026-11-03',
    impactAssessedAt: '2026-11-05',
    ecoApprovedAt: '2026-11-09',
    revisionUpdatedAt: '',
    releaseId: '',
    history: [
      history('ECR-2026-002', '2026-11-03', 'ECR', 'Change request raised', 'K. Pillai', 'Client mounting bracket change requested.', 'ECR Submitted'),
      history('ECR-2026-002', '2026-11-05', 'Impact Assessment', 'Impact assessment completed', 'A. Iyer', 'Affected BOM and drawing quantities documented.', 'Impact Assessment'),
      history('ECR-2026-002', '2026-11-09', 'ECO Approval', 'ECO approved', 'A. Iyer', 'Approved for revision preparation.', 'ECO Approved'),
    ],
  },
  {
    id: 'ECR-2026-003',
    projectId: 'PRJ-2026-041',
    title: 'Conveyor drive first controlled release',
    changeReason: 'The conveyor drive package is complete and requires its first controlled engineering release for purchase and production.',
    affectedParts: 'MEC-041-001 · Gearbox housing',
    affectedAssemblies: 'ASM-2026-001 · Conveyor drive assembly',
    bomId: 'BOM-2026-001',
    drawingId: 'DRW-2026-001',
    currentRevision: '—',
    proposedRevision: 'C',
    currentBomRevision: '—',
    proposedBomRevision: 'C',
    currentDrawingRevision: '—',
    proposedDrawingRevision: 'C',
    impactLevel: 'Low',
    impact: 'No prior engineering release exists for this change record. This is an initial release of the approved Rev C BOM and drawing baseline.',
    assessmentNotes: 'First-time release path verified. The released source revisions are referenced exactly and no previous release is overwritten.',
    approvalStatus: 'Approved',
    status: 'Revision Updated',
    reviewer: 'N. Joshi',
    decisionComments: 'First-time release approved against the existing controlled source revisions.',
    firstRelease: true,
    revisionUpdated: true,
    raisedBy: 'R. Kulkarni',
    raisedAt: '2026-11-02',
    impactAssessedAt: '2026-11-03',
    ecoApprovedAt: '2026-11-06',
    revisionUpdatedAt: '2026-11-08',
    releaseId: '',
    history: [
      history('ECR-2026-003', '2026-11-02', 'ECR', 'First-time release requested', 'R. Kulkarni', 'No prior engineering release exists.', 'ECR Submitted'),
      history('ECR-2026-003', '2026-11-03', 'Impact Assessment', 'First-release impact assessed', 'N. Joshi', 'Current approved BOM and drawing revisions identified.', 'Impact Assessment'),
      history('ECR-2026-003', '2026-11-06', 'ECO Approval', 'ECO approved', 'N. Joshi', 'First controlled release approved.', 'ECO Approved'),
      history('ECR-2026-003', '2026-11-08', 'Revision Update', 'First-release revision recorded', 'R. Kulkarni', 'Rev C recorded without overwriting a previous release.', 'Revision Updated'),
    ],
  },
  {
    id: 'ECR-2026-004',
    projectId: 'PRJ-2026-036',
    title: 'Enclosure access panel seam change',
    changeReason: 'The enclosure assembly requires a revised panel seam and bend relief to support the updated door hinge.',
    affectedParts: 'SMT-036-001 · Enclosure side panel',
    affectedAssemblies: 'ASM-2026-006 · Control panel housing',
    bomId: 'BOM-2026-003',
    drawingId: 'DRW-2026-005',
    currentRevision: 'A',
    proposedRevision: 'B',
    currentBomRevision: 'A',
    proposedBomRevision: 'B',
    currentDrawingRevision: 'A',
    proposedDrawingRevision: 'B',
    impactLevel: 'Medium',
    impact: 'Bend sequence, panel seam and hinge interface require manufacturing review. Current source revisions are still under review.',
    assessmentNotes: 'Impact assessment in progress. BOM and drawing must be approved before release eligibility can pass.',
    approvalStatus: 'Pending',
    status: 'Impact Assessment',
    reviewer: 'S. Menon',
    decisionComments: '',
    firstRelease: false,
    revisionUpdated: false,
    raisedBy: 'V. Sharma',
    raisedAt: '2026-11-06',
    impactAssessedAt: '2026-11-09',
    ecoApprovedAt: '',
    revisionUpdatedAt: '',
    releaseId: '',
    history: [
      history('ECR-2026-004', '2026-11-06', 'ECR', 'Change request raised', 'V. Sharma', 'Panel seam and hinge change requested.', 'ECR Submitted'),
      history('ECR-2026-004', '2026-11-09', 'Impact Assessment', 'Impact assessment saved', 'S. Menon', 'Awaiting source review completion.', 'Impact Assessment'),
    ],
  },
  {
    id: 'ECR-2026-005',
    projectId: 'PRJ-2026-033',
    title: 'Utility skid fastener standardization',
    changeReason: 'Standardize the utility skid fasteners to reduce the purchased item count and align with the site maintenance standard.',
    affectedParts: 'PIP-033-001 · Pipe spool DN50',
    affectedAssemblies: 'ASM-2026-007 · Utility skid piping assembly',
    bomId: 'BOM-2026-004',
    drawingId: 'DRW-2026-004',
    currentRevision: 'A',
    proposedRevision: 'B',
    currentBomRevision: 'A',
    proposedBomRevision: 'B',
    currentDrawingRevision: 'A',
    proposedDrawingRevision: 'B',
    impactLevel: 'Low',
    impact: 'Purchased fastener references change; piping geometry and support locations are unaffected.',
    assessmentNotes: '',
    approvalStatus: 'Pending',
    status: 'ECR Submitted',
    reviewer: 'K. Pillai',
    decisionComments: '',
    firstRelease: false,
    revisionUpdated: false,
    raisedBy: 'P. Deshmukh',
    raisedAt: '2026-11-10',
    impactAssessedAt: '',
    ecoApprovedAt: '',
    revisionUpdatedAt: '',
    releaseId: '',
    history: [history('ECR-2026-005', '2026-11-10', 'ECR', 'Change request raised', 'P. Deshmukh', 'Fastener standardization requested.', 'ECR Submitted')],
  },
  {
    id: 'ECR-2026-006',
    projectId: 'PRJ-2026-024',
    title: 'Press frame weld detail amendment',
    changeReason: 'An alternative weld detail was proposed for the press frame side plate.',
    affectedParts: 'FAB-024-081 · Press frame side plate',
    affectedAssemblies: 'ASM-2026-004 · Motor mount subassembly',
    bomId: 'BOM-2026-008',
    drawingId: 'DRW-2026-007',
    currentRevision: 'A',
    proposedRevision: 'B',
    currentBomRevision: 'A',
    proposedBomRevision: 'B',
    currentDrawingRevision: 'A',
    proposedDrawingRevision: 'B',
    impactLevel: 'High',
    impact: 'The proposed detail was not supported by the qualified weld procedure and would change the inspection requirement.',
    assessmentNotes: 'Rejected because the weld procedure qualification does not cover the proposed detail and the source revisions remain draft.',
    approvalStatus: 'Rejected',
    status: 'Rejected',
    reviewer: 'N. Joshi',
    decisionComments: 'Rejected: provide a qualified weld procedure and revised inspection evidence before raising a new change request.',
    firstRelease: false,
    revisionUpdated: false,
    raisedBy: 'A. Iyer',
    raisedAt: '2026-11-04',
    impactAssessedAt: '2026-11-06',
    ecoApprovedAt: '',
    revisionUpdatedAt: '',
    releaseId: '',
    history: [
      history('ECR-2026-006', '2026-11-04', 'ECR', 'Change request raised', 'A. Iyer', 'Alternative weld detail proposed.', 'ECR Submitted'),
      history('ECR-2026-006', '2026-11-06', 'Impact Assessment', 'Impact assessment completed', 'N. Joshi', 'Weld qualification gap identified.', 'Impact Assessment'),
      history('ECR-2026-006', '2026-11-08', 'ECO Approval', 'ECO rejected', 'N. Joshi', 'Provide a qualified weld procedure and revised inspection evidence.', 'Rejected'),
    ],
  },
  {
    id: 'ECR-2026-007',
    projectId: 'PRJ-2026-038',
    title: 'Frame finish specification update',
    changeReason: 'The frame finish system was updated from a two-coat to a three-coat system for the site environment.',
    affectedParts: 'FAB-038-001 · Base frame',
    affectedAssemblies: 'ASM-2026-005 · Feed system support frame',
    bomId: 'BOM-2026-002',
    drawingId: 'DRW-2026-003',
    currentRevision: 'B',
    proposedRevision: 'C',
    currentBomRevision: 'B',
    proposedBomRevision: 'C',
    currentDrawingRevision: 'B',
    proposedDrawingRevision: 'C',
    impactLevel: 'Medium',
    impact: 'Adds a primer coat and updates the paint specification note. Fabrication geometry is unchanged.',
    assessmentNotes: 'Paint supplier and production confirmed the three-coat process. Released Rev B sources are preserved in the release snapshot.',
    approvalStatus: 'Approved',
    status: 'Released',
    reviewer: 'A. Iyer',
    decisionComments: 'Approved and released for purchase and production handover.',
    firstRelease: false,
    revisionUpdated: true,
    raisedBy: 'K. Pillai',
    raisedAt: '2026-10-28',
    impactAssessedAt: '2026-10-30',
    ecoApprovedAt: '2026-11-03',
    revisionUpdatedAt: '2026-11-06',
    releaseId: 'ERL-2026-001',
    history: [
      history('ECR-2026-007', '2026-10-28', 'ECR', 'Change request raised', 'K. Pillai', 'Finish system update requested.', 'ECR Submitted'),
      history('ECR-2026-007', '2026-10-30', 'Impact Assessment', 'Impact assessment completed', 'A. Iyer', 'Paint specification and process impact reviewed.', 'Impact Assessment'),
      history('ECR-2026-007', '2026-11-03', 'ECO Approval', 'ECO approved', 'A. Iyer', 'Three-coat finish approved.', 'ECO Approved'),
      history('ECR-2026-007', '2026-11-06', 'Revision Update', 'Proposed revisions recorded', 'K. Pillai', 'Rev C prepared without changing released Rev B.', 'Revision Updated'),
      history('ECR-2026-007', '2026-11-10', 'Engineering Release', 'Released ERL-2026-001', 'Design Authority', 'Purchase and Production handover prepared.', 'Released'),
    ],
  },
];

export const ENGINEERING_RELEASES = [
  {
    id: 'ERL-2026-001',
    changeId: 'ECR-2026-007',
    projectId: 'PRJ-2026-038',
    changeReason: 'Frame finish specification update',
    releaseType: 'Revision Change',
    firstRelease: false,
    currentRevision: 'B',
    proposedRevision: 'C',
    bom: {
      id: 'BOM-2026-002',
      name: 'Conveyor frame assembly BOM',
      currentRevision: 'B',
      releasedRevision: 'B',
      approvedRevision: 'C',
      sourceStatus: 'Approved',
    },
    drawing: {
      id: 'DRW-2026-003',
      number: 'DRG-FAB-038-001',
      title: 'Conveyor base frame — fabrication drawing',
      currentRevision: 'B',
      releasedRevision: 'B',
      approvedRevision: 'C',
      sourceStatus: 'Released',
    },
    manufacturingPackage: 'MFG-2026-002 Rev C · Fabrication and inspection package',
    approvalStatus: 'Approved',
    approvedBy: 'A. Iyer',
    approvedAt: '2026-11-03',
    releasedBy: 'Design Authority',
    releasedAt: '2026-11-10',
    notes: 'Released source Rev B records remain preserved. Handover references the approved proposed Rev C snapshot.',
    purchaseHandover: {
      required: true,
      status: 'Acknowledged',
      reference: 'PUR-HO-2026-011',
      date: '2026-11-12',
      owner: 'Purchase — Sourcing cell',
      notes: 'Mock purchase acknowledgement recorded locally.',
    },
    productionHandover: {
      required: true,
      status: 'Prepared',
      reference: 'PRD-HO-2026-009',
      date: '2026-11-13',
      owner: 'Production — Fabrication bay',
      notes: 'Production handover prepared; acknowledgement pending.',
    },
  },
];

export const PROJECT_CHANGE_SOURCES = {
  'PRJ-2026-041': { bomId: 'BOM-2026-001', drawingId: 'DRW-2026-001' },
  'PRJ-2026-038': { bomId: 'BOM-2026-002', drawingId: 'DRW-2026-003' },
  'PRJ-2026-036': { bomId: 'BOM-2026-003', drawingId: 'DRW-2026-005' },
  'PRJ-2026-033': { bomId: 'BOM-2026-004', drawingId: 'DRW-2026-004' },
  'PRJ-2026-031': { bomId: 'BOM-2026-005', drawingId: 'DRW-2026-006' },
  'PRJ-2026-029': { bomId: 'BOM-2026-006', drawingId: 'DRW-2026-009' },
  'PRJ-2026-026': { bomId: 'BOM-2026-007', drawingId: 'DRW-2026-010' },
  'PRJ-2026-024': { bomId: 'BOM-2026-008', drawingId: 'DRW-2026-007' },
};

/* ------------------------------------------------- ECR / ECO normalization */

/** Add the Module 12 register fields without discarding older persisted records. */
export function normalizeChange(record) {
  const status = record.status || 'Draft';
  const legacyBeyondImpact = [
    'ECR Approved',
    'ECO Created',
    'ECO Review',
    'Pending ECO Approval',
    'ECO Approved',
    'ECO Rejected',
    'Change Implementation',
    'Revision Updated',
    'Change Closed',
    'Released',
    'Rejected',
  ].includes(status);
  return {
    ...record,
    status,
    changeDescription: record.changeDescription || record.impact || record.changeReason || '',
    changeCategory: record.changeCategory || 'Other',
    changePriority: record.changePriority || record.impactLevel || 'Medium',
    requestedBy: record.requestedBy || record.raisedBy || '',
    requestedDate: record.requestedDate || record.raisedAt || '',
    supportingDocuments: Array.isArray(record.supportingDocuments)
      ? record.supportingDocuments
      : record.supportingDocuments
        ? [record.supportingDocuments]
        : [],
    impactedDrawings: Array.isArray(record.impactedDrawings)
      ? record.impactedDrawings
      : record.drawingId
        ? [record.drawingId]
        : [],
    impactedManufacturingDocuments: Array.isArray(record.impactedManufacturingDocuments)
      ? record.impactedManufacturingDocuments
      : [],
    initialAssessment: record.initialAssessment || record.assessmentNotes || record.impact || '',
    designId: record.designId || '',
    designRevision: record.designRevision || record.currentRevision || '',
    sourceReviewId: record.sourceReviewId || '',
    ecrDecision: record.ecrDecision || (legacyBeyondImpact ? 'Approved' : 'Pending'),
    ecrApprovedBy: record.ecrApprovedBy || '',
    ecrApprovedAt: record.ecrApprovedAt || '',
    ecrDecisionComments: record.ecrDecisionComments || '',
    ecoId: record.ecoId || '',
    revisionUpdates: Array.isArray(record.revisionUpdates) ? record.revisionUpdates : [],
    closedAt: record.closedAt || '',
  };
}

export function normalizeEco(record) {
  return {
    ...record,
    status: record.status || 'ECO Created',
    approvalStatus: record.approvalStatus || 'Pending',
    technicalImpact: record.technicalImpact || '',
    manufacturingImpact: record.manufacturingImpact || '',
    bomImpact: record.bomImpact || '',
    drawingImpact: record.drawingImpact || '',
    costImpact: record.costImpact || '',
    riskValidation: record.riskValidation || '',
    implementationNotes: record.implementationNotes || '',
    assignedEngineer: record.assignedEngineer || '',
    effectiveDate: record.effectiveDate || '',
    supportingDocuments: Array.isArray(record.supportingDocuments) ? record.supportingDocuments : [],
    impactedDrawingIds: Array.isArray(record.impactedDrawingIds) ? record.impactedDrawingIds : [],
    manufacturingDocumentRefs: Array.isArray(record.manufacturingDocumentRefs) ? record.manufacturingDocumentRefs : [],
    history: Array.isArray(record.history) ? record.history : [],
    closedAt: record.closedAt || '',
  };
}

/** Seed ECOs strictly from the revision/approval status already stored on seeded ECRs. */
export function buildSeedEcos(changes = []) {
  const ecoStatus = (change) => {
    if (change.status === 'Rejected') return 'ECO Rejected';
    if (change.status === 'Pending ECO Approval') return 'ECO Review';
    if (['ECO Approved', 'Revision Updated', 'Released'].includes(change.status)) return change.status;
    return '';
  };
  return changes
    .filter((change) => Boolean(ecoStatus(change)))
    .sort((a, b) => String(a.raisedAt).localeCompare(String(b.raisedAt)))
    .map((change, index) => {
      const status = ecoStatus(change);
      const rejected = status === 'ECO Rejected';
      const history = (change.history || [])
        .filter((entry) => ['ECO Approval', 'Revision Update', 'Engineering Release'].includes(entry.stage))
        .map((entry) => ({
          id: `EH-${change.id}-ECO-${entry.id}`,
          at: entry.at,
          stage: entry.stage,
          action: entry.action,
          by: entry.by,
          comments: entry.comments,
          statusAfter: entry.statusAfter,
        }));
      return normalizeEco({
        id: `ECO-2026-${String(index + 1).padStart(3, '0')}`,
        sourceEcrId: change.id,
        projectId: change.projectId,
        designId: change.designId || '',
        affectedParts: change.affectedParts || '',
        affectedAssemblies: change.affectedAssemblies || '',
        currentRevision: change.currentRevision || '',
        proposedRevision: change.proposedRevision || '',
        changeDescription: change.changeDescription || change.changeReason || '',
        technicalImpact: change.impact || '',
        manufacturingImpact: change.assessmentNotes || '',
        bomImpact: `${change.bomId || 'BOM'} · ${change.currentBomRevision || '—'} → ${change.proposedBomRevision || '—'}`,
        drawingImpact: `${change.drawingId || 'Drawing'} · ${change.currentDrawingRevision || '—'} → ${change.proposedDrawingRevision || '—'}`,
        costImpact: '',
        riskValidation: change.assessmentNotes || '',
        implementationNotes: '',
        assignedEngineer: change.raisedBy || '',
        status,
        approvalStatus: rejected ? 'Rejected' : ['ECO Approved', 'Revision Updated', 'Released'].includes(status) ? 'Approved' : 'Pending',
        effectiveDate: change.ecoApprovedAt || '',
        createdBy: change.reviewer || change.raisedBy || '',
        createdAt: change.impactAssessedAt || change.raisedAt || '',
        reviewedBy: change.reviewer || '',
        reviewedAt: change.ecoApprovedAt || '',
        decisionComments: change.decisionComments || '',
        impactedBomId: change.bomId || '',
        impactedDrawingIds: change.impactedDrawings?.length ? change.impactedDrawings : change.drawingId ? [change.drawingId] : [],
        proposedBomRevision: change.proposedBomRevision || '',
        proposedDrawingRevision: change.proposedDrawingRevision || '',
        manufacturingDocumentRefs: change.impactedManufacturingDocuments || [],
        supportingDocuments: change.supportingDocuments || [],
        history,
      });
    });
}

export const ECOS = buildSeedEcos(CHANGES);
