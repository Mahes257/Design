/**
 * Module 02 — Request-to-Project conversion mapping.
 *
 * One source request produces exactly one project draft. The mapping copies
 * every available request field and leaves anything missing empty rather than
 * inventing values.
 */
import { requesterLabel, sourceReference } from './enquiryRequestData';
import { PROJECT_TYPES, TODAY, addDays } from './projectData';

const ATTACHMENT_GROUPS = {
  'Customer Drawing': 'customer-drawings',
  'Technical Specification': 'specifications',
  'Reference Document': 'pdf',
  'Supporting Document': 'supporting',
  'Service Report': 'pdf',
  'Commercial Document': 'pdf',
};

const TYPE_BY_SOURCE = {
  Customer: 'New Design',
  'R&D / PDE': 'New Design',
  Service: 'Retrofit / Upgrade',
  'Inter-Department': 'New Design',
};

const TYPE_BY_DEVELOPMENT = {
  'New Development': 'New Design',
  'Product Improvement': 'Variant / Derivative',
  'Variant / Derivative': 'Variant / Derivative',
  Prototype: 'Prototype Development',
  'Research Study': 'Prototype Development',
  'Technology Evaluation': 'Prototype Development',
};

/** Project type derived from the request source, category and development type. */
export function projectTypeForRequest(request) {
  if (!request) return 'New Design';
  const development = request.sourceFields?.developmentType;
  if (development && TYPE_BY_DEVELOPMENT[development]) return TYPE_BY_DEVELOPMENT[development];
  if (String(request.category || '').includes('Retrofit')) return 'Retrofit / Upgrade';
  if (String(request.category || '').includes('Development')) return 'Prototype Development';
  return PROJECT_TYPES.includes(TYPE_BY_SOURCE[request.source])
    ? TYPE_BY_SOURCE[request.source]
    : 'New Design';
}

/** Domain derived from the request category (same rules used earlier). */
export function projectDomainForRequest(request) {
  switch (request?.category) {
    case 'Sheet Metal Enclosure':
      return 'Sheet Metal Design';
    case 'Piping / Skid':
      return 'Piping Design';
    case 'Development / Prototype':
      return 'Product Design';
    default:
      return 'Machine Design';
  }
}

function requirementBasis(request) {
  const fields = request.sourceFields || {};
  return (
    fields.customerRequirement ||
    fields.researchObjective ||
    fields.issueDescription ||
    fields.requirementDescription ||
    ''
  );
}

function technicalBasis(request) {
  const fields = request.sourceFields || {};
  return (
    fields.technicalRequirements ||
    fields.technicalSupport ||
    fields.requirementDescription ||
    fields.customerRequirement ||
    ''
  );
}

function customerName(request) {
  const fields = request.sourceFields || {};
  if (request.source === 'Customer') return fields.customerName || '';
  if (request.source === 'Service') return fields.serviceLocation || '';
  return '';
}

function departmentName(request) {
  const fields = request.sourceFields || {};
  if (request.source === 'Inter-Department') return fields.requestingDepartment || '';
  if (request.source === 'R&D / PDE') return fields.requestingTeam || '';
  return '';
}

export function projectAttachmentsFromRequest(request) {
  return (request?.documents || []).map((doc) => ({
    category: ATTACHMENT_GROUPS[doc.category] || 'supporting',
    name: doc.name,
    size: doc.size || 0,
  }));
}

/** The project draft record created immediately when a request is converted. */
export function projectDraftFromRequest(request, projectId) {
  const fields = request.sourceFields || {};
  const assessment = request.assessment || {};
  const now = new Date();
  const stamp = `${TODAY}T${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;

  return {
    id: projectId,
    name: request.title,
    reference: sourceReference(request) || request.projectReference || '',
    customer: customerName(request),
    department: departmentName(request),
    product: request.productReference || request.category || '',
    type: projectTypeForRequest(request),
    domain: projectDomainForRequest(request),
    priority: request.priority || 'Medium',
    description: request.description || '',
    scope: requirementBasis(request),
    technicalRequirements: technicalBasis(request),
    constraints: assessment.feasibility?.risks || '',
    expectedDeliverables: '',
    start: TODAY,
    target: request.requiredDate || addDays(TODAY, 90),
    manager: 'R. Kulkarni',
    reviewer: assessment.reviewer || request.assignedTo || 'N. Joshi',
    analysisEngineer: 'A. Iyer',
    manufacturingEngineer: 'K. Pillai',
    engineers: [assessment.reviewer || request.assignedTo].filter(Boolean),
    members: [],
    deliverables: [],
    attachments: (request.documents || []).length,
    attachmentFiles: projectAttachmentsFromRequest(request),
    status: 'Draft',
    progress: 0,
    delayed: false,
    archived: false,
    cprReference: '',
    cprStatus: 'Not Started',
    cprOwner: '',
    cprReviewDate: '',
    cprNotes: '',
    sourceEnquiryId: request.legacyEnquiryId || (request.source === 'Customer' ? request.id : ''),
    sourceQuotationId: request.commercial?.technical?.quotationNumber || '',
    sourceQuotationInternalId: '',
    sourceQuotationRevision: request.commercial?.technical?.revision || '',
    sourceRequestId: request.id,
    sourceRequestSource: request.source,
    sourceRequestCategory: request.category || '',
    sourceRequestReference: sourceReference(request) || '',
    sourceRequestRequester: requesterLabel(request),
    sourceRequestContact: fields.contactPerson || fields.requesterName || '',
    sourceRequestEmail: fields.customerEmail || '',
    sourceRequestPhone: fields.customerPhone || '',
    sourceRequestDate: request.requestDate || '',
    sourceRequestRequiredDate: request.requiredDate || '',
    sourceRequestStatus: request.status,
    sourceRemarks: request.remarks || '',
    sourceRequestAttachments: projectAttachmentsFromRequest(request),
    convertedAt: stamp,
    history: [
      {
        id: `${projectId}-H1`,
        at: stamp,
        by: 'Design Admin',
        action: 'Project draft created from request',
        detail: `${request.id} (${request.source}) converted into project draft ${projectId}. Status Draft.`,
      },
    ],
  };
}

/** Find the project already created or drafted from a request. */
export function projectForRequest(projects = [], requestId) {
  if (!requestId) return null;
  return projects.find((project) => project.sourceRequestId === requestId) || null;
}

/** Customer column fallback for internal requests. */
export function customerOrDepartment(project) {
  if (!project) return '—';
  return project.customer || project.department || 'Internal';
}

/** Current stage label for the register. Existing project statuses only. */
export function currentStageLabel(project) {
  if (!project) return '—';
  if (project.status === 'Draft') return 'Draft — not started';
  const map = {
    'New Request': 'Project Initiation',
    'Under Planning': 'Design Planning',
    'Design In Progress': 'Mechanical Engineering Design',
    'Under Review': 'Design Review & Approval',
    'Approval Pending': 'Design Review & Approval',
    Approved: 'Design Review & Approval',
    Transferred: 'Design Release & Production Handover',
    'Manufacturing In Progress': 'Manufacturing Design',
    Completed: 'Completed',
    'On Hold': 'On Hold',
    Cancelled: 'Cancelled',
  };
  return map[project.status] || 'Project Initiation';
}

/**
 * The eleven engineering design stages. Status is derived from real linked
 * records only — a stage is never completed by this application.
 */
export const PROJECT_STAGES = [
  {
    key: 'planning',
    label: 'Design Planning',
    module: 'Design Planning',
    description: 'Plan deliverables, reviewers, tasks and the engineering schedule.',
  },
  {
    key: 'conceptual',
    label: 'Conceptual Design',
    module: 'Conceptual Design',
    description: 'Develop and select the concept that satisfies the approved requirements.',
  },
  {
    key: 'mechanical',
    label: 'Mechanical Engineering Design',
    module: 'Mechanical Engineering Design',
    description: 'Detail parts, assemblies and the supporting engineering calculations.',
  },
  {
    key: 'validation',
    label: 'Simulation & Design Validation',
    module: 'Engineering Analysis',
    description: 'Verify the design through simulation and recorded validation evidence.',
  },
  {
    key: 'analysis',
    label: 'Engineering Analysis',
    module: 'Engineering Analysis',
    description: 'Complete engineering analysis and record the verified results.',
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing Design',
    module: 'Manufacturing Design',
    description: 'Define manufacturing, process and inspection requirements.',
  },
  {
    key: 'bom',
    label: 'BOM & Cost Estimation',
    module: 'BOM & Cost Estimation',
    description: 'Build, review and release the engineering BOM and cost basis.',
  },
  {
    key: 'cad',
    label: 'Drawing & CAD Management',
    module: 'Drawing & CAD Management',
    description: 'Produce the controlled drawings and CAD files for the design.',
  },
  {
    key: 'review',
    label: 'Design Review & Approval',
    module: 'Design Review & Approval',
    description: 'Complete engineering, manufacturing and final design approval.',
  },
  {
    key: 'change',
    label: 'Engineering Change & Release',
    module: 'Engineering Change & Release',
    description: 'Raise and approve engineering changes against released revisions.',
  },
  {
    key: 'release',
    label: 'Design Release & Production Handover',
    module: 'Engineering Release & Transfer',
    description: 'Release the exact revision and hand it over to production.',
  },
];

const COMPLETED_RECORD_STATES = new Set([
  'Completed',
  'Closed',
  'Released',
  'Transferred',
  'Handed Over',
  'Distributed',
]);

const APPROVED_RECORD_STATES = new Set([
  'Approved',
  'Verified',
  'Accepted',
  'Passed',
  'Approved for Release',
]);

const REVIEW_RECORD_STATES = new Set([
  'Under Review',
  'Pending Review',
  'In Review',
  'Submitted',
  'Submitted for Review',
  'Awaiting Review',
  'Awaiting Approval',
  'For Review',
  'Ready for Final Approval',
  'Pending Client Submission',
  'Under Client Review',
]);

const ON_HOLD_RECORD_STATES = new Set(['On Hold', 'Hold', 'Blocked']);
const REJECTED_RECORD_STATES = new Set(['Rejected', 'Cancelled']);

/** Map a record's own status into the stage status vocabulary. */
export function projectStageRecordState(status) {
  if (COMPLETED_RECORD_STATES.has(status)) return 'Completed';
  if (APPROVED_RECORD_STATES.has(status)) return 'Approved';
  if (REJECTED_RECORD_STATES.has(status)) return 'Rejected';
  if (ON_HOLD_RECORD_STATES.has(status)) return 'On Hold';
  if (REVIEW_RECORD_STATES.has(status)) return 'Under Review';
  return 'In Progress';
}

/** Aggregate linked record states without advancing the workflow on its own. */
export function projectStageStatus(records = []) {
  if (!records.length) return 'Not Started';
  const states = records.map((record) =>
    projectStageRecordState(record.status || record.approvalStatus || record.verificationStatus),
  );
  if (states.every((state) => state === 'Completed')) return 'Completed';
  if (states.every((state) => state === 'Completed' || state === 'Approved')) return 'Approved';
  if (states.every((state) => state === 'Rejected')) return 'Rejected';
  if (states.every((state) => state === 'On Hold')) return 'On Hold';
  if (states.includes('Under Review')) return 'Under Review';
  return 'In Progress';
}

/** Exact detail route for a linked stage record. */
export function projectStageRecordPath(stageKey, record) {
  const id = encodeURIComponent(record.id);
  switch (stageKey) {
    case 'planning':
      return `/design-planning/design-plans/${id}`;
    case 'conceptual':
      return `/conceptual-design/concept-details?concept=${id}`;
    case 'mechanical':
      return `/mechanical-design/design-register/${id}`;
    case 'validation':
    case 'analysis':
      return `/analysis/${id}`;
    case 'manufacturing':
      return `/manufacturing-design/${record.kind || 'definition'}/${id}`;
    case 'bom':
      return `/bom-cost/bom/${id}`;
    case 'cad':
      return `/cad-management/drawings/${id}`;
    case 'review':
      return `/design-review/review/${id}`;
    case 'change':
      return `/engineering-release/ecr/${id}`;
    case 'release':
      return `/transfers/${id}`;
    default:
      return '/projects';
  }
}

/** Existing register for a stage with no linked records. */
export function projectStageModulePath(stageKey) {
  switch (stageKey) {
    case 'planning':
      return '/design-planning';
    case 'conceptual':
      return '/conceptual-design/concept-details';
    case 'mechanical':
      return '/mechanical-design/design-register';
    case 'validation':
    case 'analysis':
      return '/analysis';
    case 'manufacturing':
      return '/manufacturing-design/definition';
    case 'bom':
      return '/bom-cost/bom';
    case 'cad':
      return '/cad-management/drawings';
    case 'review':
      return '/design-review';
    case 'change':
      return '/engineering-release/ecr-eco';
    case 'release':
      return '/transfers/production';
    default:
      return '/projects';
  }
}

/** Stage rows for a project, using linked records and their own statuses. */
export function buildProjectStages(project, records = {}) {
  if (!project) return [];
  const list = (rows) => (Array.isArray(rows) ? rows : []);
  const sources = {
    planning: list(records.plans),
    conceptual: list(records.concepts),
    mechanical: list(records.designs),
    validation: list(records.analyses).filter((row) =>
      ['Under Review', 'Verified', 'Rejected'].includes(row.verificationStatus),
    ),
    analysis: list(records.analyses),
    manufacturing: list(records.manufacturing),
    bom: list(records.boms),
    cad: list(records.drawings),
    review: list(records.reviews),
    change: list(records.changes),
    release: list(records.transfers),
  };

  return PROJECT_STAGES.map((stage) => {
    const rows = sources[stage.key] || [];
    const stageRecords = rows.map((row) => {
      const status = row.status || row.approvalStatus || row.verificationStatus || 'Recorded';
      return {
        id: row.id,
        status,
        state: projectStageRecordState(status),
        title: row.title || row.name || row.drawingTitle || '',
        kind: row.kind || '',
      };
    });
    const settled = stageRecords.filter((record) =>
      ['Approved', 'Completed'].includes(record.state),
    ).length;
    return {
      ...stage,
      records: stageRecords,
      linked: stageRecords.length,
      settled,
      progress: stageRecords.length ? Math.round((settled / stageRecords.length) * 100) : 0,
      status: projectStageStatus(stageRecords),
    };
  });
}
