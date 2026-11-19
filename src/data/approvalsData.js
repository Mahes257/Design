/**
 * Module 11 — Design Review & Approval mock data.
 *
 * Frontend-only review records. Approval decisions here are local simulation
 * data: they do not grant backend authorization, legal approval or a real
 * Purchase / Production transfer.
 */
import { ASSEMBLIES, DESIGNS } from './mechanicalData';
import { PROJECTS, TODAY, addDays, formatDate } from './projectData';

export { TODAY, addDays, formatDate };

export const DELIVERABLE_TYPES = [
  'Engineering Drawing',
  'Engineering BOM',
  'Design Package',
  'Engineering Analysis',
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STAGES = ['Draft', 'Engineering Review', 'Manufacturing Review', 'Client Approval', 'Final Approval', 'Release'];
export const REVIEW_OUTCOMES = ['Pending', 'In Review', 'Approved', 'Rejected', 'Revision Required', 'Closed'];

export const REVIEW_STATUSES = [
  'Draft',
  'Under Engineering Review',
  'Under Manufacturing Review',
  'Pending Client Submission',
  'Submitted to Client',
  'Under Client Review',
  'Changes Requested',
  'Ready for Final Approval',
  'Approved',
  'Rejected',
  'Released',
];

export const STAGE_STATUSES = [
  'Not Required',
  'Pending',
  'Under Review',
  'Submitted',
  'Approved',
  'Changes Requested',
  'Rejected',
];

export const CLIENT_STATUSES = [
  'Not Required',
  'Not Submitted',
  'Submitted to Client',
  'Under Client Review',
  'Approved',
  'Rejected',
  'Changes Requested',
];

export const CHECKLIST_RESULTS = ['Pending', 'Pass', 'Fail', 'Not Applicable'];
export const CHECKLIST_SEVERITIES = ['—', 'Critical', 'High', 'Medium', 'Low'];

export const REVIEW_TYPES = ['Design Review', 'Engineering Review', 'Manufacturing Review', 'Final Release Review'];

export const REVIEW_PURPOSES = [
  'Design requirements verification',
  'Engineering technical review',
  'Manufacturing readiness review',
  'Final release approval',
  'Revision change verification',
  'Customer / project requirement review',
];

export const ENGINEERING_CHECKLIST_CATEGORIES = [
  {
    category: 'Design requirements compliance',
    criterion: 'Design requirements baseline verified',
    requirement: 'The submitted design matches the approved requirements baseline and stated operating envelope.',
  },
  {
    category: 'Functional requirements',
    criterion: 'Functional requirements demonstrated',
    requirement: 'Required functions, interfaces and duty cycles are addressed by the submitted design.',
  },
  {
    category: 'Geometry and dimensions',
    criterion: 'Geometry and dimensions checked',
    requirement: 'Critical dimensions, units, datums and drawing views agree with the design intent.',
  },
  {
    category: 'Material and specification',
    criterion: 'Materials and specifications verified',
    requirement: 'Material grades, finishes and specification references are stated and suitable.',
  },
  {
    category: 'Assembly and fit',
    criterion: 'Assembly and fits reviewed',
    requirement: 'Assembly sequence, fits, clearances and fastener access are feasible.',
  },
  {
    category: 'Interference and clearance',
    criterion: 'Interference and clearance checked',
    requirement: 'No unresolved interference exists and service clearances are maintained.',
  },
  {
    category: 'Structural / analysis evidence',
    criterion: 'Structural evidence reviewed',
    requirement: 'Stress, deflection or load evidence supports the submitted configuration.',
  },
  {
    category: 'Simulation and validation evidence',
    criterion: 'Simulation and validation evidence reviewed',
    requirement: 'Linked simulation or validation results are applicable to this exact revision.',
  },
  {
    category: 'Drawing completeness',
    criterion: 'Drawing package complete',
    requirement: 'Sheets, sections, dimensions, notes, title block and BOM references are complete.',
  },
  {
    category: 'Revision consistency',
    criterion: 'Revision identifiers consistent',
    requirement: 'Drawing, CAD, BOM and review records reference the same revision.',
  },
  {
    category: 'Technical documentation',
    criterion: 'Technical documentation sufficient',
    requirement: 'Calculations, specifications and supporting evidence required for approval are present.',
  },
];

export const MANUFACTURING_CHECKLIST_CATEGORIES = [
  {
    category: 'Manufacturability',
    criterion: 'Design is manufacturable',
    requirement: 'Geometry, features and access suit the intended manufacturing processes.',
  },
  {
    category: 'Material availability information',
    criterion: 'Material availability information entered',
    requirement: 'Record only verified material availability information; leave Pending when no verified source exists.',
  },
  {
    category: 'Process suitability',
    criterion: 'Processes are suitable',
    requirement: 'Machining, fabrication, forming, welding or other required processes are assessed.',
  },
  {
    category: 'Manufacturing tolerances',
    criterion: 'Tolerances are achievable',
    requirement: 'Dimensional and geometric tolerances can be met by the selected process and equipment.',
  },
  {
    category: 'Tooling requirements',
    criterion: 'Tooling requirements identified',
    requirement: 'Required fixtures, cutters, moulds or special tooling are identified and available.',
  },
  {
    category: 'Inspection and quality requirements',
    criterion: 'Inspection requirements defined',
    requirement: 'Inspection points, methods and acceptance criteria are recorded for critical characteristics.',
  },
  {
    category: 'Assembly feasibility',
    criterion: 'Assembly is feasible',
    requirement: 'Assembly sequence, component access and handling requirements are feasible.',
  },
  {
    category: 'Manufacturing documentation',
    criterion: 'Manufacturing documentation complete',
    requirement: 'Process notes, work instructions and manufacturing references are sufficient.',
  },
  {
    category: 'BOM completeness',
    criterion: 'BOM is complete',
    requirement: 'Make/buy items, quantities, materials and purchased references are complete for the revision.',
  },
  {
    category: 'Drawing and CAD consistency',
    criterion: 'Drawing and CAD agree',
    requirement: 'Drawing geometry, dimensions and revision agree with the linked CAD model.',
  },
  {
    category: 'Process planning completeness',
    criterion: 'Process planning complete',
    requirement: 'Operation sequence, equipment and quality gates are defined for production planning.',
  },
];

export const ENGINEERING_REVIEWERS = ['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'];
export const MANUFACTURING_REVIEWERS = ['V. Sharma', 'P. Deshmukh', 'K. Pillai'];
export const CLIENT_REVIEWERS = ['Client — A. Mehta', 'Client — P. Nair', 'Client — R. Shah'];
export const ADMIN_APPROVERS = ['Design Admin'];
export const REVIEWER_PERSONA = 'N. Joshi';

/** One conditional stage that either an authorized Client or an Admin can close. */
export const CLIENT_STAGE_LABEL = 'Client or Admin Approval';
export const CLIENT_STAGE_PENDING = 'Awaiting approval from Client or Admin.';

export function stageDisplayName(stage) {
  return stage === 'Client Approval' ? CLIENT_STAGE_LABEL : stage;
}

export function clientApprovalActor(review) {
  if (review?.clientApprovalActor?.role) return review.clientApprovalActor;
  const approval = (review?.approvals || [])
    .filter((row) => row.stage === 'Client Approval' && row.decision === 'Approve')
    .at(-1);
  if (approval?.actorRole) {
    return { role: approval.actorRole, reviewer: approval.reviewer, at: approval.at };
  }
  if (review?.stageStates?.client?.actorRole) {
    return {
      role: review.stageStates.client.actorRole,
      reviewer: review.stageStates.client.reviewer,
      at: review.stageStates.client.decidedAt,
    };
  }
  // Legacy records were approved through the client-only gate.
  if (review?.stageStates?.client?.status === 'Approved') {
    return { role: 'Client', reviewer: review.stageStates.client.reviewer, at: review.stageStates.client.decidedAt };
  }
  return null;
}

export function clientApprovalSummary(review) {
  if (!review?.clientRequired) return 'Not Required';
  const status = review.stageStates?.client?.status || 'Pending';
  const actor = clientApprovalActor(review);
  if (status === 'Approved') {
    return actor?.role ? `Approved by ${actor.role}` : `${CLIENT_STAGE_LABEL} – Approved`;
  }
  if (status === 'Rejected') return actor?.role ? `Rejected by ${actor.role}` : 'Rejected';
  if (status === 'Changes Requested') return actor?.role ? `Changes requested by ${actor.role}` : 'Changes Requested';
  return CLIENT_STAGE_PENDING;
}

export const ENGINEERS = ['R. Kulkarni', 'D. Rao', 'K. Pillai', 'V. Sharma', 'P. Deshmukh', 'A. Iyer', 'S. Menon', 'N. Joshi'];

const STATUS_TONES = {
  Draft: 'gray',
  'Under Engineering Review': 'orange',
  'Under Manufacturing Review': 'orange',
  'Pending Client Submission': 'orange',
  'Submitted to Client': 'blue',
  'Under Client Review': 'purple',
  'Changes Requested': 'red',
  'Ready for Final Approval': 'blue',
  Approved: 'green',
  Rejected: 'red',
  Released: 'green',
};

export function reviewStatusTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export function stageTone(status) {
  const tones = {
    Approved: 'green',
    Released: 'green',
    Rejected: 'red',
    'Changes Requested': 'red',
    'Under Review': 'purple',
    Submitted: 'orange',
    'Submitted to Client': 'orange',
    'Under Client Review': 'purple',
    Pending: 'orange',
    'Not Required': 'gray',
    'Not Submitted': 'gray',
  };
  return tones[status] || 'gray';
}

export function projectName(projects, projectId) {
  return (projects || PROJECTS).find((row) => row.id === projectId)?.name || projectId;
}

export function assemblyLabel(assemblyId) {
  const found = ASSEMBLIES.find((row) => row.id === assemblyId);
  return found ? `${found.number} · ${found.name}` : assemblyId || 'Not linked';
}

export function nextReviewId(records = []) {
  const numbers = records
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return `REV-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextRevision(revision) {
  const steps = ['A', 'B', 'C', 'D', 'E', 'F'];
  const index = steps.indexOf(revision);
  if (index === -1) return 'A';
  return steps[index + 1] || `${revision}1`;
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function requiredStagesFor(review) {
  return review?.requiredStages || [];
}

export function stageApproved(review, stageKey) {
  const status = review?.stageStates?.[stageKey]?.status;
  return status === 'Approved' || status === 'Not Required';
}

export function releaseSourceStatus(review, boms = [], drawings = []) {
  const bom = boms.find((row) => row.id === review?.bomId) || null;
  const drawing = drawings.find((row) => row.id === review?.drawingId) || null;
  const errors = [];

  if (!review?.bomId || !review?.bomRevision) {
    errors.push('A BOM revision is not linked to this review.');
  } else if (!bom) {
    errors.push('The linked BOM record no longer exists.');
  } else if (bom.revision !== review.bomRevision) {
    errors.push(`The BOM is now Rev ${bom.revision}; the reviewed Rev ${review.bomRevision} is no longer current.`);
  } else if (!['Approved', 'Released'].includes(bom.status)) {
    errors.push(`BOM ${bom.id} Rev ${bom.revision} is ${bom.status}; it must be approved or released.`);
  }

  if (!review?.drawingId || !review?.drawingRevision) {
    errors.push('A drawing revision is not linked to this review.');
  } else if (!drawing) {
    errors.push('The linked drawing record no longer exists.');
  } else if (drawing.revision !== review.drawingRevision) {
    errors.push(`The drawing is now Rev ${drawing.revision}; the reviewed Rev ${review.drawingRevision} is no longer current.`);
  } else if (!['Approved', 'Released'].includes(drawing.approvalStatus)) {
    errors.push(`Drawing ${drawing.drawingNumber} Rev ${drawing.revision} is ${drawing.approvalStatus}; it must be approved or released.`);
  }

  return {
    bom,
    drawing,
    bomReady: Boolean(bom && bom.revision === review?.bomRevision && ['Approved', 'Released'].includes(bom.status)),
    drawingReady: Boolean(drawing && drawing.revision === review?.drawingRevision && ['Approved', 'Released'].includes(drawing.approvalStatus)),
    ready: errors.length === 0,
    errors,
  };
}

export function isReleaseEligible(review, boms = [], drawings = []) {
  if (!review || review.status !== 'Approved' || review.release) return false;
  const stagesApproved = requiredStagesFor(review).every((stage) =>
    stage === 'Engineering'
      ? stageApproved(review, 'engineering')
      : stage === 'Manufacturing'
        ? stageApproved(review, 'manufacturing')
        : stage === 'Client'
          ? stageApproved(review, 'client')
          : false,
  );
  return stagesApproved && releaseSourceStatus(review, boms, drawings).ready;
}

export function finalApprovedBy(review) {
  if (review?.finalApproval?.approver) {
    return { by: review.finalApproval.approver, at: review.finalApproval.at, decision: review.finalApproval.decision };
  }
  const decisions = [
    review?.stageStates?.engineering?.status === 'Approved' ? { by: review.stageStates.engineering.reviewer, at: review.stageStates.engineering.decidedAt } : null,
    review?.stageStates?.manufacturing?.status === 'Approved' ? { by: review.stageStates.manufacturing.reviewer, at: review.stageStates.manufacturing.decidedAt } : null,
    review?.stageStates?.client?.status === 'Approved' ? { by: review.stageStates.client.reviewer, at: review.stageStates.client.decidedAt } : null,
  ].filter(Boolean);
  decisions.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return decisions.at(-1) || null;
}

export function deriveWorkflow(review) {
  if (review.status === 'Draft') return { status: 'Draft', currentStage: 'Draft' };
  const stages = requiredStagesFor(review);
  const engineering = review.stageStates?.engineering || {};
  const manufacturing = review.stageStates?.manufacturing || {};
  const client = review.stageStates?.client || {};

  const rejected =
    (stages.includes('Engineering') && engineering.status === 'Rejected') ||
    (stages.includes('Manufacturing') && manufacturing.status === 'Rejected') ||
    (stages.includes('Client') && client.status === 'Rejected');
  if (rejected) {
    return {
      status: 'Rejected',
      currentStage:
        stages.includes('Client') && client.status === 'Rejected'
          ? 'Client Approval'
          : stages.includes('Manufacturing') && manufacturing.status === 'Rejected'
            ? 'Manufacturing Review'
            : 'Engineering Review',
    };
  }

  const changes =
    (stages.includes('Engineering') && engineering.status === 'Changes Requested') ||
    (stages.includes('Manufacturing') && manufacturing.status === 'Changes Requested') ||
    (stages.includes('Client') && client.status === 'Changes Requested');
  if (changes) {
    return {
      status: 'Changes Requested',
      currentStage:
        stages.includes('Client') && client.status === 'Changes Requested'
          ? 'Client Approval'
          : stages.includes('Manufacturing') && manufacturing.status === 'Changes Requested'
            ? 'Manufacturing Review'
            : 'Engineering Review',
    };
  }

  if (review.release) return { status: 'Released', currentStage: 'Release' };
  if (stages.length === 0) return { status: 'Draft', currentStage: 'Draft' };

  const allApproved = stages.every((stage) =>
    stage === 'Engineering' ? engineering.status === 'Approved' : stage === 'Manufacturing' ? manufacturing.status === 'Approved' : client.status === 'Approved',
  );
  if (allApproved) {
    const finalDecision = review.finalApproval?.decision;
    if (finalDecision === 'Approved') return { status: 'Approved', currentStage: 'Release' };
    if (finalDecision === 'Rejected') return { status: 'Rejected', currentStage: 'Final Approval' };
    if (finalDecision === 'Revision Required') return { status: 'Changes Requested', currentStage: 'Final Approval' };
    return { status: 'Ready for Final Approval', currentStage: 'Final Approval' };
  }

  if (stages.includes('Client')) {
    if (client.status === 'Under Client Review') return { status: 'Under Client Review', currentStage: 'Client Approval' };
    if (client.status === 'Submitted to Client') return { status: 'Submitted to Client', currentStage: 'Client Approval' };
  }

  if (stages.includes('Manufacturing') && engineering.status === 'Approved' && manufacturing.status === 'Under Review') {
    return { status: 'Under Manufacturing Review', currentStage: 'Manufacturing Review' };
  }
  if (stages.includes('Manufacturing') && engineering.status === 'Approved' && manufacturing.status === 'Pending') {
    return { status: 'Under Manufacturing Review', currentStage: 'Manufacturing Review' };
  }
  if (engineering.status === 'Under Review') return { status: 'Under Engineering Review', currentStage: 'Engineering Review' };
  if (engineering.status === 'Pending') return { status: 'Under Engineering Review', currentStage: 'Engineering Review' };

  if (engineering.status === 'Approved' && (!stages.includes('Manufacturing') || manufacturing.status === 'Approved')) {
    if (stages.includes('Client') && client.status === 'Not Submitted') {
      return { status: 'Pending Client Submission', currentStage: 'Client Approval' };
    }
  }
  return { status: 'Under Engineering Review', currentStage: 'Engineering Review' };
}

function makeCategoryChecklist(groups, prefix, reviewer, { complete = false, failed = false, comments = '' } = {}) {
  return groups.map((group, index) => ({
    id: `${prefix}-${index + 1}`,
    category: group.category,
    item: group.criterion,
    criterion: group.criterion,
    requirement: group.requirement,
    observation: complete ? 'Verified against the submitted revision and linked evidence.' : '',
    result: failed && index === 0 ? 'Fail' : complete ? 'Pass' : 'Pending',
    severity: failed && index === 0 ? 'High' : '—',
    evidence: '',
    comments: failed && index === 0 ? comments : '',
    correctiveAction: failed && index === 0 ? 'Correct the finding and resubmit the exact revision for review.' : '',
    reviewer,
  }));
}

function normalizeReview(review) {
  const engineeringStatus = review?.stageStates?.engineering?.status;
  const manufacturingStatus = review?.stageStates?.manufacturing?.status;
  const engineeringComplete = ['Approved', 'Not Required'].includes(engineeringStatus);
  const engineeringFailed = ['Rejected', 'Changes Requested'].includes(engineeringStatus);
  const manufacturingComplete = ['Approved', 'Not Required'].includes(manufacturingStatus);
  const manufacturingFailed = ['Rejected', 'Changes Requested'].includes(manufacturingStatus);
  const reviewType = review.reviewType || (review.deliverableType === 'Engineering Analysis'
    ? 'Engineering Review'
    : review.deliverableType === 'Engineering BOM'
      ? 'Manufacturing Review'
      : 'Design Review');
  const reviewers = [...new Set([
    review.engineeringReviewer,
    review.requiredStages?.includes('Manufacturing') ? review.manufacturingReviewer : '',
    review.clientRequired ? review.clientReviewer : '',
  ].filter(Boolean))];
  const stageComplete = ['Approved', 'Not Required'].includes(review.stageStates?.engineering?.status)
    && (!review.requiredStages?.includes('Manufacturing') || ['Approved', 'Not Required'].includes(review.stageStates?.manufacturing?.status))
    && (!review.clientRequired || ['Approved', 'Not Required'].includes(review.stageStates?.client?.status));
  const approvedSeed = ['Approved', 'Released'].includes(review.status) && stageComplete;
  const finalApproval = review.finalApproval || (approvedSeed ? {
    decision: 'Approved',
    approver: finalApprovedBy(review)?.by || 'Design Authority',
    at: finalApprovedBy(review)?.at || review.submittedAt || TODAY,
    comments: 'Approved through the historical controlled review decision.',
    releaseRecommendation: 'Recommended for controlled release subject to linked BOM and drawing revision checks.',
  } : null);
  const design = DESIGNS.find((row) => row.projectId === review.projectId) || null;
  return {
    ...review,
    designId: review.designId || design?.id || '',
    designRevision: review.designRevision || design?.revision || review.revision || '',
    reviewType,
    reviewPurpose: review.reviewPurpose || review.reviewInstructions || 'Verify the submitted deliverable against applicable requirements.',
    requestedBy: review.requestedBy || review.submittedBy,
    assignedReviewers: review.assignedReviewers?.length ? review.assignedReviewers : reviewers,
    plannedReviewDate: review.plannedReviewDate || review.dueDate || review.reviewDate || review.submittedAt || TODAY,
    reviewNotes: review.reviewNotes || review.submissionNotes || '',
    finalApproval,
    engineeringChecklist: review.engineeringChecklist?.length >= ENGINEERING_CHECKLIST_CATEGORIES.length
      ? review.engineeringChecklist
      : makeCategoryChecklist(ENGINEERING_CHECKLIST_CATEGORIES, 'EC', review.engineeringReviewer, {
          complete: engineeringComplete,
          failed: engineeringFailed,
          comments: review.stageStates?.engineering?.comments || '',
        }),
    manufacturingChecklist: review.manufacturingChecklist?.length >= MANUFACTURING_CHECKLIST_CATEGORIES.length
      ? review.manufacturingChecklist
      : makeCategoryChecklist(MANUFACTURING_CHECKLIST_CATEGORIES, 'MC', review.manufacturingReviewer, {
          complete: manufacturingComplete,
          failed: manufacturingFailed,
          comments: review.stageStates?.manufacturing?.comments || '',
        }),
  };
}

export function withDerived(review) {
  const normalized = normalizeReview(review);
  return { ...normalized, ...deriveWorkflow(normalized) };
}

export function latestClientHistory(review) {
  return (review?.clientHistory || []).at(-1) || null;
}

export function resubmissionRows(reviews) {
  return reviews.flatMap((review) =>
    (review.resubmissions || []).map((row) => ({
      ...row,
      originalReviewId: review.id,
      deliverableNumber: review.deliverableNumber,
      deliverableType: review.deliverableType,
      projectId: review.projectId,
      assignedSubmitter: review.submittedBy,
      currentLinkedStatus: reviews.find((entry) => entry.id === row.linkedReviewId)?.status || row.currentStatus || '—',
    })),
  );
}

export function reviewStats(reviews) {
  const active = reviews.filter((row) => !['Draft', 'Released', 'Rejected', 'Approved'].includes(row.status));
  return {
    pending: active.length,
    inReview: reviews.filter((row) => ['Under Engineering Review', 'Under Manufacturing Review', 'Submitted to Client', 'Under Client Review', 'Ready for Final Approval'].includes(row.status)).length,
    changes: reviews.filter((row) => ['Changes Requested', 'Revision Required'].includes(row.status)).length,
    releases: reviews.filter((row) => row.status === 'Released').length,
  };
}

export function reviewOutcome(review) {
  if (review?.status === 'Draft') return 'Pending';
  if (review?.status === 'Released') return 'Closed';
  if (review?.status === 'Approved') return 'Approved';
  if (review?.status === 'Rejected') return 'Rejected';
  if (['Changes Requested', 'Revision Required'].includes(review?.status)) return 'Revision Required';
  return 'In Review';
}

/* ------------------------------------------------------------ seed helpers */
function attachment(name, type, size, assetPath = '') {
  return { name, type, size, assetPath };
}

function makeDesignChecklist(results = {}) {
  const items = [
    ['Design requirements reviewed', 'Approved requirement baseline and design brief checked'],
    ['Dimensions and specifications checked', 'Drawing dimensions, units and specifications verified'],
    ['Part and assembly references verified', 'Part numbers and parent assembly references match'],
    ['Drawing consistency checked', 'Views, sections, notes and title block are consistent'],
    ['Revision information verified', 'Revision, date and change note match the submission'],
    ['Supporting documentation reviewed', 'Calculations, analysis evidence and specifications reviewed'],
    ['Design constraints reviewed', 'Interfaces, envelope, material and standard constraints reviewed'],
  ];
  return items.map(([item, requirement], index) => ({
    id: `DC-${index + 1}`,
    item,
    requirement,
    reviewer: 'N. Joshi',
    result: results[index + 1] || 'Pending',
    comments: '',
    evidence: '',
  }));
}

function makeTechnicalChecklist(results = {}) {
  const items = [
    ['Requirements satisfied', 'Reviewed against the stated functional and technical requirements'],
    ['Calculation evidence available', 'Linked calculation references available for review'],
    ['Material specifications verified', 'Material and specification references checked'],
    ['Analysis evidence reviewed', 'Linked engineering analysis evidence reviewed'],
    ['Acceptance criteria checked', 'Acceptance criteria and assumptions recorded'],
    ['Outstanding technical issues documented', 'Open technical issues have an owner and action'],
  ];
  return items.map(([item, requirement], index) => ({
    id: `TC-${index + 1}`,
    item,
    requirement,
    reviewer: 'N. Joshi',
    result: results[index + 1] || 'Pending',
    comments: '',
    evidence: '',
  }));
}

function makeManufacturingChecklist(results = {}) {
  const items = [
    ['Manufacturability confirmed', 'Geometry and features suit the intended processes'],
    ['Tolerances and fits verified', 'Critical tolerances are achievable and complete'],
    ['Process suitability verified', 'Machining / fabrication / welding processes assessed'],
    ['Inspection requirements defined', 'Inspection points and acceptance criteria recorded'],
    ['Manufacturing constraints documented', 'Constraints and special requirements captured'],
    ['Unresolved issues documented', 'Open manufacturing issues have an owner and action'],
  ];
  return items.map(([item, requirement], index) => ({
    id: `MC-${index + 1}`,
    item,
    requirement,
    reviewer: 'V. Sharma',
    result: results[index + 1] || 'Pending',
    comments: '',
    evidence: '',
  }));
}

const DEFAULT_MANUFACTURING = {
  feasibility: 'Feasible with standard machining and fabrication processes; no new process development required.',
  accessibility: 'All features accessible with standard cutters and tooling; no restricted-access features identified.',
  assemblyFeasibility: 'Assembly sequence reviewed; component access and fastener hand-tool clearance acceptable.',
  constraints: 'Standard shop tolerance capability applies; heat treatment and surface finish are outsourced.',
  specialRequirements: 'First-off inspection of critical bores; material certificates required.',
  dimensionalTolerances: 'Critical bores ±0.02 mm; general tolerances per ISO 2768-m.',
  geometricTolerances: 'Datum scheme A-B-C, concentricity and perpendicularity called out on the drawing.',
  fits: 'Bearing seats H7/k6; shaft keyway fit JS9.',
  criticalDimensions: 'Bearing bore, shaft centreline height and mounting hole pattern.',
  toleranceNotes: 'No tolerance stack-up issue identified; all critical dimensions measurable.',
  drawingRefs: 'Refer to the submitted drawing revision only.',
  machining: 'Suitable for 3-axis CNC milling and turning with standard fixtures.',
  fabrication: 'Fabricated members cut and welded per drawing notes.',
  welding: 'Welds accessible; weld symbols and NDT requirements specified.',
  sheetMetal: 'Not applicable to this deliverable.',
  processes: ['CNC machining', 'Turning', 'Fabrication', 'First-off inspection'],
  equipment: ['3-axis vertical machining centre', 'CNC lathe', 'CMM'],
  processConstraints: 'Heat treatment occurs before final machining; plan the process sequence accordingly.',
  inspectionPoints: 'Incoming material, first-off dimensions, final inspection before dispatch.',
  criticalCharacteristics: 'Bearing bore diameter, shaft centre height, mounting hole spacing.',
  measurement: 'Micrometer, bore gauge, height gauge and CMM for critical characteristics.',
  acceptance: 'Drawing dimensions and the inspection plan acceptance criteria apply.',
  inspectionRefs: 'Inspection plan reference to be confirmed by Quality Control.',
  inspectionNotes: 'Inspection execution and quality results remain in the Quality Control module.',
};

const DEFAULT_TECHNICAL = {
  requirements: ['Functional and interface requirements from the project design basis'],
  linkedCalculations: ['CAL-2026-003 Rev B'],
  analysisRefs: ['ANL-2026-001'],
  stressEvidence: 'Recorded stress evidence is referenced from the linked calculation; values are not recomputed here.',
  thermalEvidence: 'Not applicable for this submission.',
  motionEvidence: 'Not applicable for this submission.',
  materialSpecs: 'Material grade, certificates and specification references checked against the drawing.',
  assumptions: 'Input conditions and assumptions are recorded in the linked calculation / analysis records.',
  acceptanceCriteria: 'Design basis acceptance criteria and applicable standard allowances apply.',
  attachments: [],
};

const SEED_REVIEW_SOURCES = {
  'REV-2026-001': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-001', drawingRevision: 'C' },
  'REV-2026-002': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-001', drawingRevision: 'C' },
  'REV-2026-003': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-001', drawingRevision: 'C' },
  'REV-2026-004': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-002', drawingRevision: 'B' },
  'REV-2026-005': { bomId: 'BOM-2026-003', bomRevision: 'A', drawingId: 'DRW-2026-005', drawingRevision: 'A' },
  'REV-2026-006': { bomId: 'BOM-2026-002', bomRevision: 'B', drawingId: 'DRW-2026-003', drawingRevision: 'B' },
  'REV-2026-007': { bomId: 'BOM-2026-008', bomRevision: 'A', drawingId: 'DRW-2026-007', drawingRevision: 'A' },
  'REV-2026-008': { bomId: 'BOM-2026-002', bomRevision: 'B', drawingId: 'DRW-2026-003', drawingRevision: 'B' },
  'REV-2026-009': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-002', drawingRevision: 'B' },
  'REV-2026-010': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-002', drawingRevision: 'B' },
  'REV-2026-011': { bomId: 'BOM-2026-001', bomRevision: 'C', drawingId: 'DRW-2026-001', drawingRevision: 'C' },
  'REV-2026-012': { bomId: 'BOM-2026-008', bomRevision: 'A', drawingId: 'DRW-2026-007', drawingRevision: 'A' },
};

function seedReview(config) {
  const source = SEED_REVIEW_SOURCES[config.id] || {};
  const requiredStages = config.requiredStages || ['Engineering', 'Manufacturing'];
  const clientRequired = requiredStages.includes('Client');
  const engineeringReviewer = config.engineeringReviewer || 'N. Joshi';
  const manufacturingReviewer = config.manufacturingReviewer || 'V. Sharma';
  const engineering = {
    status: requiredStages.includes('Engineering') ? 'Under Review' : 'Not Required',
    reviewer: engineeringReviewer,
    decision: '',
    decidedAt: '',
    comments: '',
    ...(config.engineering || {}),
  };
  const manufacturing = {
    status: requiredStages.includes('Manufacturing') ? 'Pending' : 'Not Required',
    reviewer: manufacturingReviewer,
    decision: '',
    decidedAt: '',
    comments: '',
    ...(config.manufacturing || {}),
  };
  const client = {
    status: clientRequired ? 'Not Submitted' : 'Not Required',
    reviewer: config.clientReviewer || CLIENT_REVIEWERS[0],
    decision: '',
    decidedAt: '',
    submittedAt: '',
    comments: '',
    requestedChanges: '',
    ...(config.client || {}),
  };

  const history = [
    {
      id: `${config.id}-H0`,
      at: config.submittedAt,
      stage: 'Review Register',
      action: 'Submitted for review',
      previousStatus: 'Draft',
      newStatus: 'Under Engineering Review',
      by: config.submittedBy,
      role: 'Submitter',
      comments: config.submissionNotes || 'Submitted for review.',
    },
  ];
  if (engineering.decidedAt) {
    history.push({
      id: `${config.id}-H1`,
      at: engineering.decidedAt,
      stage: 'Engineering Review',
      action: engineering.decision || 'Engineering decision',
      previousStatus: 'Under Engineering Review',
      newStatus: engineering.status,
      by: engineering.reviewer,
      role: 'Engineering Reviewer',
      comments: engineering.comments,
    });
  }
  if (manufacturing.decidedAt) {
    history.push({
      id: `${config.id}-H2`,
      at: manufacturing.decidedAt,
      stage: 'Manufacturing Review',
      action: manufacturing.decision || 'Manufacturing decision',
      previousStatus: 'Under Manufacturing Review',
      newStatus: manufacturing.status,
      by: manufacturing.reviewer,
      role: 'Manufacturing Reviewer',
      comments: manufacturing.comments,
    });
  }
  if (client.submittedAt) {
    history.push({
      id: `${config.id}-H3`,
      at: client.submittedAt,
      stage: 'Client Approval',
      action: 'Submitted to client',
      previousStatus: 'Pending Client Submission',
      newStatus: 'Submitted to Client',
      by: config.submittedBy,
      role: 'Submitter',
      comments: config.clientSubmission?.notes || 'Submitted for client review.',
    });
  }
  if (client.decidedAt) {
    history.push({
      id: `${config.id}-H4`,
      at: client.decidedAt,
      stage: 'Client Approval',
      action: client.decision || 'Client decision',
      previousStatus: 'Under Client Review',
      newStatus: client.status,
      by: client.reviewer,
      role: 'Client Reviewer',
      comments: client.comments,
    });
  }
  if (config.release) {
    history.push({
      id: `${config.id}-H5`,
      at: config.release.releaseDate,
      stage: 'Release',
      action: 'Released',
      previousStatus: 'Approved',
      newStatus: 'Released',
      by: config.release.releasedBy,
      role: 'Design Authority',
      comments: `Controlled release ${config.release.releaseId} for Rev ${config.revision}.`,
    });
  }

  const seedStagesComplete = engineering.status === 'Approved'
    && (!requiredStages.includes('Manufacturing') || manufacturing.status === 'Approved')
    && (!clientRequired || client.status === 'Approved');
  const record = {
    id: config.id,
    finalApproval: config.finalApproval || (seedStagesComplete && config.status !== 'Draft' ? {
      decision: 'Approved',
      approver: 'Design Authority',
      at: manufacturing.decidedAt || engineering.decidedAt || config.submittedAt,
      comments: 'Historical seed record approved after all mandatory stages were complete.',
      releaseRecommendation: config.release ? 'Released as a controlled local record.' : 'Recommended for controlled release subject to exact revision checks.',
    } : null),
    previousReviewId: config.previousReviewId || '',
    originalReviewId: config.originalReviewId || '',
    projectId: config.projectId,
    deliverableType: config.deliverableType,
    deliverableNumber: config.deliverableNumber,
    deliverableName: config.deliverableName,
    revision: config.revision,
    bomId: config.bomId || source.bomId || '',
    bomRevision: config.bomRevision || source.bomRevision || '',
    drawingId: config.drawingId || source.drawingId || '',
    drawingRevision: config.drawingRevision || source.drawingRevision || '',
    reviewDate: config.reviewDate || config.submittedAt || TODAY,
    partRef: config.partRef || '',
    priority: config.priority || 'High',
    submittedBy: config.submittedBy || 'R. Kulkarni',
    submittedAt: config.submittedAt || TODAY,
    dueDate: config.dueDate || addDays(TODAY, 10),
    engineeringReviewer,
    manufacturingReviewer,
    clientRequired,
    clientReviewer: client.reviewer,
    clientReference: config.clientReference || '',
    requiredStages,
    currentStage: 'Engineering Review',
    status: 'Under Engineering Review',
    stageStates: { engineering, manufacturing, client },
    designReview: {
      notes: config.designNotes || 'Drawing and specification package submitted for engineering review.',
      drawingReferences: config.drawingReferences || [config.deliverableNumber],
      notesExtra: 'Attached revision is the only revision under review. Earlier approvals do not carry forward.',
    },
    designChecklist: makeDesignChecklist(config.designResults),
    technicalChecklist: makeTechnicalChecklist(config.technicalResults),
    technical: { ...DEFAULT_TECHNICAL, ...(config.technical || {}) },
    manufacturingChecklist: makeManufacturingChecklist(config.manufacturingResults),
    manufacturing: { ...DEFAULT_MANUFACTURING, ...(config.manufacturingData || {}) },
    comments: config.comments || [],
    attachments: config.attachments || [],
    clientSubmission: {
      notes: config.clientSubmission?.notes || '',
      submittedAt: client.submittedAt || '',
      clientReviewer: client.reviewer,
      clientReference: config.clientReference || '',
      attachments: config.clientSubmission?.attachments || [],
    },
    clientHistory:
      config.clientHistory ||
      (client.submittedAt
        ? [
            {
              revision: config.revision,
              submittedAt: client.submittedAt,
              decision: client.decision || 'Pending client decision',
              comments: client.comments || 'Client review in progress.',
              resubmissionRef: '',
              previousRevision: '',
            },
          ]
        : []),
    clientComments: config.clientComments || [],
    history,
    approvals: [],
    release: config.release || null,
    resubmissions: config.resubmissions || [],
    submissionNotes: config.submissionNotes || '',
    reviewInstructions: config.reviewInstructions || 'Review the submitted revision against the applicable checklists and accepted evidence.',
  };
  const seeded = withDerived(record);
  if (config.status === 'Draft') return { ...seeded, status: 'Draft', currentStage: 'Draft' };
  return seeded;
}

const conveyorAttachment = attachment('DRG-MEC-041-001_RevC.svg', 'SVG', 5_946, '/cad-samples/conveyor-drive-ga.svg');
const frameAttachment = attachment('DRG-FAB-038-001_RevB.svg', 'SVG', 3_371, '/cad-samples/frame-fabrication.svg');
const pipingAttachment = attachment('DRG-PIP-033-001_RevA.pdf', 'PDF', 1_632, '/cad-samples/utility-skid-ga.pdf');
const gearboxDrawingAttachment = attachment('DRG-MEC-041-002_RevB.svg', 'SVG', 5_946, '/cad-samples/conveyor-drive-ga.svg');

export const REVIEWS = [
  seedReview({
    id: 'REV-2026-001',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Engineering Drawing',
    deliverableNumber: 'DRG-MEC-041-001',
    deliverableName: 'Conveyor drive assembly — general arrangement',
    revision: 'C',
    partRef: 'ASM-2026-001',
    priority: 'High',
    submittedBy: 'R. Kulkarni',
    submittedAt: '2026-11-10',
    dueDate: '2026-11-18',
    requiredStages: ['Engineering', 'Manufacturing', 'Client'],
    engineeringReviewer: 'N. Joshi',
    manufacturingReviewer: 'V. Sharma',
    clientReviewer: 'Client — A. Mehta',
    clientReference: 'CL-2026-041',
    drawingReferences: ['DRG-MEC-041-001 Rev C', 'DRG-MEC-041-002 Rev B'],
    submissionNotes: 'General arrangement and component drawing submitted together for the conveyor drive package.',
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass' },
    technical: {
      requirements: ['Conveyor drive layout and interface requirements', 'Bearing centre and motor mount envelope'],
      linkedCalculations: ['CALC-2026-003 Rev B'],
      analysisRefs: ['ANL-2026-001'],
      stressEvidence: 'Recorded stress evidence in CALC-2026-003 §4; no values recomputed here.',
      materialSpecs: 'Cast iron FG260 housing; purchased bearing set 32217 per supplier data sheet.',
      assumptions: 'Mounting pad restraint and bearing loads as recorded in ANL-2026-001.',
      acceptanceCriteria: 'Design basis DB-041 strength and deflection criteria.',
    },
    manufacturingData: {
      feasibility: 'Feasible with standard machining, fabrication and assembly processes.',
      criticalDimensions: 'Bearing bore, shaft centre height and mounting hole pattern.',
      drawingRefs: 'DRG-MEC-041-001 Rev C and DRG-MEC-041-002 Rev B.',
    },
    attachments: [conveyorAttachment, attachment('DRG-MEC-041-001_Load-Data.xlsx', 'Load data', 88_000)],
    comments: [
      {
        id: 'CMT-REV-001-1',
        author: 'D. Rao',
        role: 'Design Engineer',
        stage: 'Engineering Review',
        at: '2026-11-10T10:20:00',
        text: 'Submitted Rev C with the updated motor mount envelope and load-case matrix.',
        checklistItem: 'Supporting documentation reviewed',
        attachment: 'DRG-MEC-041-001_Load-Data.xlsx',
        responseStatus: 'Open',
      },
    ],
    reviewInstructions: 'Focus on drawing consistency, envelope interfaces and evidence references for the Rev C change.',
  }),
  seedReview({
    id: 'REV-2026-002',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Engineering BOM',
    deliverableNumber: 'BOM-2026-001',
    deliverableName: 'Conveyor drive assembly BOM',
    revision: 'C',
    partRef: 'ASM-2026-001',
    priority: 'High',
    submittedBy: 'R. Kulkarni',
    submittedAt: '2026-11-07',
    dueDate: '2026-11-16',
    requiredStages: ['Engineering', 'Manufacturing', 'Client'],
    engineeringReviewer: 'A. Iyer',
    manufacturingReviewer: 'V. Sharma',
    clientReviewer: 'Client — P. Nair',
    clientReference: 'CL-2026-042',
    drawingReferences: ['DRG-MEC-041-001 Rev C', 'BOM-2026-001 Rev C'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-09',
      comments: 'BOM quantities, purchased references and assembly mapping verified against the released drawing.',
    },
    manufacturing: {
      status: 'Under Review',
      reviewer: 'V. Sharma',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    technical: {
      requirements: ['BOM must match the released GA and component drawings', 'Purchased items need identifiable references'],
      linkedCalculations: ['CALC-2026-003 Rev B'],
      analysisRefs: ['ANL-2026-001'],
      materialSpecs: 'Material grades matched to part records and drawing notes.',
      acceptanceCriteria: 'All make/buy decisions and quantities agree with the approved design package.',
    },
    manufacturingData: {
      feasibility: 'Make/buy split aligns with current shop capability and approved suppliers.',
      processes: ['CNC machining', 'Fabrication', 'Assembly', 'Bought-out procurement'],
      criticalDimensions: 'Not applicable to the BOM itself; refer to linked drawing revisions.',
      drawingRefs: 'BOM-2026-001 Rev C linked to DRG-MEC-041-001 Rev C.',
    },
    attachments: [
      attachment('BOM-2026-001_RevC.xlsx', 'Engineering BOM', 144_000),
      attachment('BOM-2026-001_Purchased-List.pdf', 'Purchased list', 210_000),
    ],
    comments: [
      {
        id: 'CMT-REV-002-1',
        author: 'A. Iyer',
        role: 'Engineering Reviewer',
        stage: 'Engineering Review',
        at: '2026-11-09T14:10:00',
        text: 'Engineering review complete. Manufacturing to confirm the gear-motor purchased reference and inspection plan.',
        checklistItem: 'Part and assembly references verified',
        attachment: '',
        responseStatus: 'Open',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-003',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Design Package',
    deliverableNumber: 'DP-2026-041',
    deliverableName: 'Conveyor drive design package',
    revision: 'A',
    partRef: 'ASM-2026-001',
    priority: 'Critical',
    submittedBy: 'R. Kulkarni',
    submittedAt: '2026-10-24',
    dueDate: '2026-11-04',
    requiredStages: ['Engineering', 'Manufacturing'],
    engineeringReviewer: 'N. Joshi',
    manufacturingReviewer: 'P. Deshmukh',
    drawingReferences: ['DRG-MEC-041-001 Rev B', 'DRG-MEC-041-002 Rev A'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-10-27',
      comments: 'Design package and calculation references reviewed; package is technically complete for manufacturing review.',
    },
    manufacturing: {
      status: 'Changes Requested',
      decision: 'Request Changes',
      decidedAt: '2026-10-29',
      comments: 'Add a fixture and process note for the housing bore finishing operation before resubmission.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    attachments: [
      attachment('DP-2026-041_RevA_Package-Index.pdf', 'Package index', 320_000),
      attachment('DP-2026-041_Manufacturing-Note.docx', 'Design package', 96_000),
    ],
    comments: [
      {
        id: 'CMT-REV-003-1',
        author: 'P. Deshmukh',
        role: 'Manufacturing Reviewer',
        stage: 'Manufacturing Review',
        at: '2026-10-29T09:45:00',
        text: 'Request changes: add the housing bore finishing fixture and process sequence to the package.',
        checklistItem: 'Manufacturability confirmed',
        attachment: '',
        responseStatus: 'Open',
      },
    ],
    resubmissions: [
      {
        id: 'RS-REV-003-1',
        previousRevision: 'A',
        newRevision: 'B',
        at: '2026-11-06',
        by: 'R. Kulkarni',
        previousDecision: 'Changes Requested',
        currentStatus: 'Pending Client Submission',
        linkedReviewId: 'REV-2026-011',
        note: 'Fixture and process note added; resubmitted for all required stages.',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-004',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Engineering Analysis',
    deliverableNumber: 'ANL-2026-001',
    deliverableName: 'Gearbox housing static stress review',
    revision: 'B',
    partRef: 'MEC-041-001',
    priority: 'High',
    submittedBy: 'D. Rao',
    submittedAt: '2026-11-05',
    dueDate: '2026-11-15',
    requiredStages: ['Engineering', 'Manufacturing', 'Client'],
    engineeringReviewer: 'N. Joshi',
    manufacturingReviewer: 'V. Sharma',
    clientReviewer: 'Client — A. Mehta',
    clientReference: 'CL-2026-043',
    drawingReferences: ['DRG-MEC-041-002 Rev B', 'ANL-2026-001 Rev B'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-07',
      comments: 'Stress evidence and assumptions reviewed against the acceptance criteria. Solution is supported by the referenced calculation.',
    },
    manufacturing: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-09',
      comments: 'No manufacturing constraint changes required from the analysis conclusions.',
    },
    client: {
      status: 'Under Client Review',
      submittedAt: '2026-11-10',
      decision: '',
      comments: 'Client reviewing the evidence package.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    technical: {
      requirements: ['Verify housing strength under rated torque and belt pull', 'Maintain required factor of safety'],
      linkedCalculations: ['CALC-2026-003 Rev B'],
      analysisRefs: ['ANL-2026-001'],
      stressEvidence: 'Recorded stress evidence in CALC-2026-003 §4 and supplier data; no certified FEA rerun in this module.',
      thermalEvidence: 'Not applicable for this analysis submission.',
      motionEvidence: 'Not applicable for this analysis submission.',
      materialSpecs: 'Cast iron FG260; material properties referenced from the design basis.',
      assumptions: 'Housing treated as a single cast body; bolt preload reviewed separately.',
      acceptanceCriteria: 'Recorded stress below the allowable value with the design-basis factor of safety.',
    },
    clientComments: [
      {
        id: 'CC-REV-004-1',
        author: 'Client — A. Mehta',
        role: 'Client Reviewer',
        stage: 'Client Approval',
        at: '2026-11-11T11:30:00',
        text: 'Please confirm the load case used for the off-centre belt pull condition.',
        revision: 'B',
        responseStatus: 'Open',
      },
    ],
    clientHistory: [
      {
        revision: 'A',
        submittedAt: '2026-10-30',
        decision: 'Changes Requested',
        comments: 'Provide the revised load-case matrix and clarify the off-centre condition.',
        resubmissionRef: 'REV-2026-004',
        previousRevision: '',
      },
      {
        revision: 'B',
        submittedAt: '2026-11-10',
        decision: 'Pending client decision',
        comments: 'Updated load-case matrix submitted; client review in progress.',
        resubmissionRef: '',
        previousRevision: 'A',
      },
    ],
    attachments: [
      attachment('ANL-2026-001_Stress-Evidence.pdf', 'Analysis evidence', 412_000),
      attachment('ANL-2026-001_Load-Cases.xlsx', 'Load case matrix', 88_000),
    ],
    clientSubmission: {
      notes: 'Evidence package submitted for client review, including the revised load-case matrix.',
      attachments: [attachment('ANL-2026-001_Client-Summary.pdf', 'Client summary', 160_000)],
    },
  }),
  seedReview({
    id: 'REV-2026-005',
    projectId: 'PRJ-2026-036',
    deliverableType: 'Engineering Drawing',
    deliverableNumber: 'DRG-SMT-036-001',
    deliverableName: 'Control panel enclosure — sheet metal drawing',
    revision: 'A',
    partRef: 'ASM-2026-006',
    priority: 'Medium',
    submittedBy: 'V. Sharma',
    submittedAt: '2026-11-02',
    dueDate: '2026-11-12',
    requiredStages: ['Engineering', 'Manufacturing'],
    engineeringReviewer: 'A. Iyer',
    manufacturingReviewer: 'P. Deshmukh',
    drawingReferences: ['DRG-SMT-036-001 Rev A'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-06',
      comments: 'Flat pattern, bend deductions and enclosure interface dimensions checked.',
    },
    manufacturing: {
      status: 'Changes Requested',
      decision: 'Request Changes',
      decidedAt: '2026-11-12',
      comments: 'Add the bend relief detail and confirm the sheet grain direction note before resubmission.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    manufacturingData: {
      feasibility: 'Sheet metal fabrication is feasible; bend relief detail is incomplete.',
      machining: 'Not applicable.',
      fabrication: 'Laser cut and press brake forming.',
      welding: 'Spot welding for the mounting bracket.',
      sheetMetal: 'CRCA 1.5 mm sheet; bend radius and relief need confirmation.',
      processes: ['Laser cutting', 'Press brake forming', 'Spot welding', 'Powder coating'],
      equipment: ['Fibre laser', 'CNC press brake', 'Spot welder'],
      constraints: 'Bend sequence must respect the door opening and panel stiffeners.',
      inspectionPoints: 'Flat pattern dimensions, bend angles, door opening and powder-coat thickness.',
      inspectionRefs: 'Quality Control inspection plan to be issued after drawing approval.',
    },
    attachments: [attachment('DRG-SMT-036-001_RevA.pdf', 'Sheet metal drawing', 684_000)],
    comments: [
      {
        id: 'CMT-REV-005-1',
        author: 'P. Deshmukh',
        role: 'Manufacturing Reviewer',
        stage: 'Manufacturing Review',
        at: '2026-11-12T16:05:00',
        text: 'Add bend relief at the door aperture and confirm grain direction. Current note is ambiguous for the press brake operator.',
        checklistItem: 'Tolerances and fits verified',
        attachment: '',
        responseStatus: 'Open',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-006',
    projectId: 'PRJ-2026-038',
    deliverableType: 'Engineering BOM',
    deliverableNumber: 'BOM-2026-002',
    deliverableName: 'Conveyor frame assembly BOM',
    revision: 'B',
    partRef: 'ASM-2026-005',
    priority: 'High',
    submittedBy: 'K. Pillai',
    submittedAt: '2026-10-30',
    dueDate: '2026-11-10',
    requiredStages: ['Engineering', 'Manufacturing'],
    engineeringReviewer: 'S. Menon',
    manufacturingReviewer: 'V. Sharma',
    drawingReferences: ['DRG-FAB-038-001 Rev B'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-03',
      comments: 'BOM structure, material grades and quantities checked against the frame drawing.',
    },
    manufacturing: {
      status: 'Rejected',
      decision: 'Reject',
      decidedAt: '2026-11-05',
      comments: 'Rejected: anchor bolt specification conflicts with the foundation detail and cannot be procured as listed. Resubmit with the corrected standard.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    attachments: [attachment('BOM-2026-002_RevB.xlsx', 'Engineering BOM', 128_000)],
    comments: [
      {
        id: 'CMT-REV-006-1',
        author: 'V. Sharma',
        role: 'Manufacturing Reviewer',
        stage: 'Manufacturing Review',
        at: '2026-11-05T12:25:00',
        text: 'Anchor bolt grade conflicts with the foundation detail. Rejecting this revision; resubmission must use the corrected standard.',
        checklistItem: 'Manufacturability confirmed',
        attachment: '',
        responseStatus: 'Open',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-007',
    projectId: 'PRJ-2026-024',
    deliverableType: 'Design Package',
    deliverableNumber: 'DP-2026-024',
    deliverableName: 'Hydraulic press frame design package',
    revision: 'A',
    partRef: 'ASM-2026-004',
    priority: 'Critical',
    submittedBy: 'A. Iyer',
    submittedAt: '2026-10-26',
    dueDate: '2026-11-08',
    requiredStages: ['Engineering', 'Manufacturing'],
    engineeringReviewer: 'N. Joshi',
    manufacturingReviewer: 'V. Sharma',
    drawingReferences: ['DRG-FAB-024-081 Rev A', 'ANL-2026-003 Rev B'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-01',
      comments: 'Design package and weldment load-case evidence reviewed. Ready for manufacturing review.',
    },
    manufacturing: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-06',
      comments: 'Fabrication, welding and inspection requirements are feasible with the current shop capability.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    technical: {
      requirements: ['Press frame strength and stiffness', 'Weld details and foundation interface'],
      linkedCalculations: ['CALC-2026-004 Rev B'],
      analysisRefs: ['ANL-2026-003'],
      stressEvidence: 'Recorded weld strength evidence in CALC-2026-004; not recomputed here.',
      materialSpecs: 'IS 2062 E350 sections and plates; weld consumable specification per drawing.',
      assumptions: 'Foundation pinned feet and off-centre press load as recorded in ANL-2026-003.',
      acceptanceCriteria: 'Weld and base-metal stresses within allowable values per the design basis.',
    },
    manufacturingData: {
      feasibility: 'Fabrication and welding feasible; large fixture required for frame squareness.',
      specialRequirements: 'Weld procedure qualification and NDT of critical welds required.',
      criticalDimensions: 'Frame diagonal, press bed flatness and mounting hole pattern.',
      processes: ['Cutting', 'Fit-up', 'Welding', 'Stress relieving', 'Machining'],
      equipment: ['Plasma cutting table', 'Welding positioners', 'Large boring mill'],
      inspectionPoints: 'Fit-up, weld visual, NDT, post-machining dimensions.',
      criticalCharacteristics: 'Press bed flatness, frame squareness and weld integrity.',
      inspectionRefs: 'Quality Control inspection plan and NDT procedure.',
    },
    attachments: [
      attachment('DP-2026-024_Package-Index.pdf', 'Package index', 260_000),
      attachment('DP-2026-024_Fabrication-Notes.pdf', 'Fabrication notes', 340_000),
    ],
    comments: [
      {
        id: 'CMT-REV-007-1',
        author: 'V. Sharma',
        role: 'Manufacturing Reviewer',
        stage: 'Manufacturing Review',
        at: '2026-11-06T15:00:00',
        text: 'Manufacturing approval complete. Controlled release can be prepared by the design authority.',
        checklistItem: 'Manufacturability confirmed',
        attachment: '',
        responseStatus: 'Resolved',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-008',
    projectId: 'PRJ-2026-038',
    deliverableType: 'Engineering Drawing',
    deliverableNumber: 'DRG-FAB-038-001',
    deliverableName: 'Conveyor base frame — fabrication drawing',
    revision: 'B',
    partRef: 'ASM-2026-005',
    priority: 'High',
    submittedBy: 'K. Pillai',
    submittedAt: '2026-10-16',
    dueDate: '2026-10-28',
    requiredStages: ['Engineering', 'Manufacturing', 'Client'],
    engineeringReviewer: 'N. Joshi',
    manufacturingReviewer: 'V. Sharma',
    clientReviewer: 'Client — R. Shah',
    clientReference: 'CL-2026-038',
    drawingReferences: ['DRG-FAB-038-001 Rev B'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-10-18',
      comments: 'Member sizes, weld symbols and finish notes checked against the structural design.',
    },
    manufacturing: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-10-22',
      comments: 'Fabrication and inspection requirements accepted.',
    },
    client: {
      status: 'Approved',
      submittedAt: '2026-10-23',
      decidedAt: '2026-10-27',
      decision: 'Approved',
      comments: 'Client approved the fabrication drawing for controlled issue.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    manufacturingResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    attachments: [frameAttachment],
    clientHistory: [
      {
        revision: 'B',
        submittedAt: '2026-10-23',
        decision: 'Approved',
        comments: 'Client approved the fabrication drawing for controlled issue.',
        resubmissionRef: '',
        previousRevision: 'A',
      },
    ],
    release: {
      releaseId: 'REL-REV-2026-001',
      revision: 'B',
      approvedBy: 'Client — R. Shah',
      approvedAt: '2026-10-27',
      releaseDate: '2026-10-28',
      releasedBy: 'Design Authority',
      status: 'Released',
    },
    comments: [
      {
        id: 'CMT-REV-008-1',
        author: 'N. Joshi',
        role: 'Engineering Reviewer',
        stage: 'Engineering Review',
        at: '2026-10-18T11:15:00',
        text: 'Drawing approved. Weld notes match the structural design and fabrication standard.',
        checklistItem: 'Drawing consistency checked',
        attachment: '',
        responseStatus: 'Resolved',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-009',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Engineering Analysis',
    deliverableNumber: 'ANL-2026-002',
    deliverableName: 'Conveyor support bracket strength check',
    revision: 'A',
    partRef: 'MEC-041-003',
    priority: 'Medium',
    submittedBy: 'S. Menon',
    submittedAt: '',
    dueDate: '2026-11-25',
    requiredStages: ['Engineering', 'Manufacturing'],
    engineeringReviewer: 'K. Pillai',
    manufacturingReviewer: 'V. Sharma',
    status: 'Draft',
    drawingReferences: ['ANL-2026-002 Rev A'],
    attachments: [attachment('bracket-hand-check.pdf', 'Calculation report', 264_000)],
    submissionNotes: 'Draft analysis submission for the support bracket; awaiting evidence completion.',
  }),
  seedReview({
    id: 'REV-2026-010',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Engineering Drawing',
    deliverableNumber: 'DRG-MEC-041-002',
    deliverableName: 'Gearbox housing — component drawing',
    revision: 'B',
    partRef: 'MEC-041-001',
    priority: 'High',
    submittedBy: 'D. Rao',
    submittedAt: '2026-10-12',
    dueDate: '2026-10-22',
    requiredStages: ['Engineering', 'Manufacturing'],
    engineeringReviewer: 'A. Iyer',
    manufacturingReviewer: 'V. Sharma',
    drawingReferences: ['DRG-MEC-041-002 Rev B'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-10-16',
      comments: 'Bore tolerances and datum scheme verified against the bearing supplier data.',
    },
    manufacturing: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-10-20',
      comments: 'Machining and inspection requirements accepted.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    attachments: [gearboxDrawingAttachment],
    release: {
      releaseId: 'REL-REV-2026-002',
      revision: 'B',
      approvedBy: 'V. Sharma',
      approvedAt: '2026-10-20',
      releaseDate: '2026-10-21',
      releasedBy: 'Design Authority',
      status: 'Released',
    },
  }),
  seedReview({
    id: 'REV-2026-011',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Design Package',
    deliverableNumber: 'DP-2026-041',
    deliverableName: 'Conveyor drive design package',
    revision: 'B',
    partRef: 'ASM-2026-001',
    priority: 'Critical',
    submittedBy: 'R. Kulkarni',
    submittedAt: '2026-11-06',
    dueDate: '2026-11-20',
    requiredStages: ['Engineering', 'Manufacturing', 'Client'],
    engineeringReviewer: 'N. Joshi',
    manufacturingReviewer: 'P. Deshmukh',
    clientReviewer: 'Client — A. Mehta',
    clientReference: 'CL-2026-041',
    previousReviewId: 'REV-2026-003',
    originalReviewId: 'REV-2026-003',
    drawingReferences: ['DRG-MEC-041-001 Rev C', 'DRG-MEC-041-002 Rev B', 'DP-2026-041 Rev B'],
    engineering: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-08',
      comments: 'Rev B package reviewed. Fixture and process note included; engineering evidence unchanged.',
    },
    manufacturing: {
      status: 'Approved',
      decision: 'Approved',
      decidedAt: '2026-11-10',
      comments: 'Rev B manufacturing note accepted; fixture detail resolves the earlier request.',
    },
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass', 7: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass', 5: 'Pass', 6: 'Pass' },
    attachments: [
      attachment('DP-2026-041_RevB_Package-Index.pdf', 'Package index', 334_000),
      attachment('DP-2026-041_RevB_Manufacturing-Note.pdf', 'Manufacturing note', 180_000),
    ],
    reviewInstructions: 'Rev B resubmission. Confirm only the corrected manufacturing evidence while preserving the earlier engineering decision.',
    comments: [
      {
        id: 'CMT-REV-011-1',
        author: 'P. Deshmukh',
        role: 'Manufacturing Reviewer',
        stage: 'Manufacturing Review',
        at: '2026-11-10T10:00:00',
        text: 'Fixture and process note now included. Manufacturing approved; package can be submitted to the client.',
        checklistItem: 'Manufacturability confirmed',
        attachment: '',
        responseStatus: 'Resolved',
      },
    ],
  }),
  seedReview({
    id: 'REV-2026-012',
    projectId: 'PRJ-2026-024',
    deliverableType: 'Engineering Analysis',
    deliverableNumber: 'ANL-2026-003',
    deliverableName: 'Press frame weldment load case review',
    revision: 'B',
    partRef: 'FAB-024-081',
    priority: 'Critical',
    submittedBy: 'K. Pillai',
    submittedAt: '2026-11-11',
    dueDate: '2026-11-19',
    requiredStages: ['Engineering', 'Client'],
    engineeringReviewer: 'N. Joshi',
    clientReviewer: 'Client — P. Nair',
    clientReference: 'CL-2026-024',
    drawingReferences: ['ANL-2026-003 Rev B', 'DRG-FAB-024-081 Rev A'],
    designResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass' },
    technicalResults: { 1: 'Pass', 2: 'Pass', 3: 'Pass', 4: 'Pass' },
    technical: {
      requirements: ['Review press frame weldment load cases', 'Confirm off-centre loading condition'],
      linkedCalculations: ['CALC-2026-004 Rev B'],
      analysisRefs: ['ANL-2026-003'],
      stressEvidence: 'Weld strength calculation referenced; recorded evidence under review.',
      thermalEvidence: 'Not applicable.',
      motionEvidence: 'Not applicable.',
      materialSpecs: 'IS 2062 E350 weldment; consumables per fabrication standard.',
      assumptions: 'Foundation pinned feet; 150 mm off-centre press load.',
      acceptanceCriteria: 'Weld and base-metal stresses within allowable values.',
    },
    manufacturingData: {
      feasibility: 'Fabrication feasible; large weldment requires fixture control.',
      criticalDimensions: 'Frame squareness and press bed flatness.',
      processes: ['Fabrication', 'Welding', 'Stress relieving', 'Machining'],
      inspectionPoints: 'Weld visual and NDT of critical joints.',
    },
    attachments: [
      attachment('ANL-2026-003_Weld-Evidence.pdf', 'Analysis evidence', 508_000),
      attachment('ANL-2026-003_Load-Cases.xlsx', 'Load case matrix', 120_000),
    ],
    comments: [
      {
        id: 'CMT-REV-012-1',
        author: 'K. Pillai',
        role: 'Design Engineer',
        stage: 'Engineering Review',
        at: '2026-11-11T09:40:00',
        text: 'Rev B resubmitted with the clarified off-centre load case. Client approval is required for this analysis.',
        checklistItem: 'Analysis evidence reviewed',
        attachment: '',
        responseStatus: 'Open',
      },
    ],
  }),
];

export function newReviewChecklists() {
  return {
    designChecklist: makeDesignChecklist(),
    technicalChecklist: makeTechnicalChecklist(),
    engineeringChecklist: makeCategoryChecklist(ENGINEERING_CHECKLIST_CATEGORIES, 'EC', 'N. Joshi'),
    manufacturingChecklist: makeCategoryChecklist(MANUFACTURING_CHECKLIST_CATEGORIES, 'MC', 'V. Sharma'),
  };
}

/* ---------------------------------------------------------- seed exports */
export const APPROVAL_SEED = {
  reviews: REVIEWS,
};

export const REVIEW_TYPES_FOR_FILTER = ['All', ...DELIVERABLE_TYPES];

export const WORKFLOW_STEPS = [
  { key: 'register', label: 'Review Register' },
  { key: 'engineering', label: 'Engineering Review' },
  { key: 'manufacturing', label: 'Manufacturing Review' },
  { key: 'client', label: 'Client Approval' },
  { key: 'release', label: 'Release & History' },
];

export const DELIVERABLE_STAGE_DEFAULTS = {
  'Engineering Drawing': ['Engineering', 'Manufacturing'],
  'Engineering BOM': ['Engineering', 'Manufacturing'],
  'Design Package': ['Engineering', 'Manufacturing'],
  'Engineering Analysis': ['Engineering'],
};
