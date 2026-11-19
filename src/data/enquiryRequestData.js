/**
 * Module 01 — Enquiry & Request Management.
 *
 * One register for four request sources (Customer, R&D / PDE, Service,
 * Inter-Department), with source-specific requirement fields, a technical
 * assessment workflow and a customer-only quotation / commercial review.
 *
 * Frontend only. Records hydrate from (and persist through) the module's
 * context; nothing is sent to a server.
 */
import {
  CUSTOMER_ENQUIRIES,
  ENGINEERING_CONTACTS,
  PRODUCT_CATEGORIES,
  TODAY,
  formatDate,
  formatStamp,
} from './customerEnquiryData';

export const REQUEST_SOURCES = ['Customer', 'R&D / PDE', 'Service', 'Inter-Department'];

export const SOURCE_META = {
  Customer: {
    label: 'Customer',
    referenceLabel: 'Customer Reference',
    requesterLabel: 'Customer',
    tone: 'blue',
    description: 'Customer enquiry, RFQ or requirement received from a customer contact.',
  },
  'R&D / PDE': {
    label: 'R&D / PDE',
    referenceLabel: 'R&D / PDE Reference',
    requesterLabel: 'Requesting Team',
    tone: 'purple',
    description: 'Development request raised by the R&D or Product Design Engineering team.',
  },
  Service: {
    label: 'Service',
    referenceLabel: 'Service Reference',
    requesterLabel: 'Service Location / Customer',
    tone: 'orange',
    description: 'Service or warranty request for an existing product, equipment or delivery.',
  },
  'Inter-Department': {
    label: 'Inter-Department',
    referenceLabel: 'Department Reference',
    requesterLabel: 'Requesting Department',
    tone: 'green',
    description: 'Internal engineering request raised by another department.',
  },
};

export const REQUEST_CATEGORIES = [
  ...PRODUCT_CATEGORIES,
  'Development / Prototype',
  'Retrofit / Upgrade',
  'Tooling / Fixture',
  'Process Equipment',
  'Other',
];

export const REQUEST_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const REQUEST_STATUSES = [
  'Draft',
  'Submitted',
  'Under Initial Review',
  'Clarification Required',
  'Under Feasibility Assessment',
  'Returned for Clarification',
  'Accepted',
  'Rejected',
  'Quotation in Progress',
  'Submitted to Customer',
  'Quotation Accepted',
  'Quotation Rejected',
  'Converted to Project',
  'Closed',
];

export const REQUEST_STATUS_TONES = {
  Draft: 'gray',
  Submitted: 'blue',
  'Under Initial Review': 'purple',
  'Clarification Required': 'orange',
  'Under Feasibility Assessment': 'purple',
  'Returned for Clarification': 'orange',
  Accepted: 'green',
  Rejected: 'red',
  'Quotation in Progress': 'blue',
  'Submitted to Customer': 'orange',
  'Quotation Accepted': 'green',
  'Quotation Rejected': 'red',
  'Converted to Project': 'green',
  Closed: 'gray',
};

/** Statuses in which the request may still be edited. */
export const LOCKED_STATUSES = ['Converted to Project', 'Closed'];

/** Statuses in which a request may be deleted. */
export const DELETABLE_STATUSES = ['Draft', 'Rejected'];

export const TECHNICAL_REVIEWERS = [
  ...ENGINEERING_CONTACTS,
  'V. Sharma',
  'K. Pillai',
  'S. Menon',
];

export const REQUESTING_TEAMS = ['R&D', 'PDE', 'R&D / PDE Combined', 'Product Engineering'];
export const DEVELOPMENT_TYPES = [
  'New Development',
  'Product Improvement',
  'Variant / Derivative',
  'Prototype',
  'Research Study',
  'Technology Evaluation',
];
export const DEPARTMENTS = [
  'Purchase',
  'Production',
  'Quality',
  'Maintenance',
  'Marketing & Sales',
  'Planning',
  'Stores',
  'Management',
];
export const FEASIBILITY_OPTIONS = {
  technical: ['Feasible', 'Feasible with conditions', 'Not feasible'],
  resources: ['Available', 'Partially available', 'Not available'],
  complexity: ['Low', 'Medium', 'High', 'Very high'],
};

export const CLARIFICATION_STATUSES = ['Not Required', 'Open', 'Responded', 'Closed'];

export const QUOTATION_STAGES = [
  'Draft',
  'Technical Review',
  'Commercial Review',
  'Submitted to Customer',
  'Accepted',
  'Rejected',
];

export const QUOTATION_STAGE_TONES = {
  Draft: 'gray',
  'Technical Review': 'purple',
  'Commercial Review': 'blue',
  'Submitted to Customer': 'orange',
  Accepted: 'green',
  Rejected: 'red',
};

export const REQUEST_DOCUMENT_CATEGORIES = [
  'Customer Drawing',
  'Technical Specification',
  'Reference Document',
  'Supporting Document',
  'Service Report',
  'Commercial Document',
];

export const ATTACHMENT_SIZE_LIMIT_NOTICE =
  'Local demo storage keeps document metadata in this browser. File content is not uploaded.';

/* ------------------------------------------------------------------ */
/* Source-specific form definitions                                    */
/* ------------------------------------------------------------------ */

const field = (key, label, options = {}) => ({
  key,
  label,
  type: 'text',
  required: false,
  full: false,
  ...options,
});

export const SOURCE_FIELDS = {
  Customer: [
    field('customerName', 'Customer Name', { required: true }),
    field('contactPerson', 'Customer Contact Person', { required: true }),
    field('customerEmail', 'Customer Email', { type: 'email' }),
    field('customerPhone', 'Customer Phone', { type: 'tel' }),
    field('customerReference', 'Customer Reference / RFQ Number'),
    field('existingProjectRef', 'Existing Customer Project Reference'),
    field('customerRequirement', 'Customer Requirement', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
      placeholder: 'Requirement as confirmed by the customer, including duty and scope.',
    }),
  ],
  'R&D / PDE': [
    field('requestingTeam', 'Requesting Team', {
      type: 'select',
      required: true,
      options: REQUESTING_TEAMS,
    }),
    field('rdReference', 'R&D / PDE Reference Number', { required: true }),
    field('developmentType', 'Development Type', {
      type: 'select',
      required: true,
      options: DEVELOPMENT_TYPES,
    }),
    field('researchObjective', 'Research Objective', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
    }),
    field('technicalRequirements', 'Technical Requirements', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
    }),
    field('expectedOutcome', 'Expected Outcome', {
      type: 'textarea',
      full: true,
      rows: 3,
    }),
  ],
  Service: [
    field('serviceReference', 'Service Request Reference', { required: true }),
    field('serviceLocation', 'Customer / Service Location', { required: true }),
    field('existingProduct', 'Existing Product / Equipment', { required: true }),
    field('deliveryReference', 'Existing Project / Delivery Reference'),
    field('serialNumber', 'Product Serial Number'),
    field('issueDescription', 'Issue / Complaint Description', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
    }),
    field('technicalSupport', 'Required Technical Support', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
    }),
  ],
  'Inter-Department': [
    field('requestingDepartment', 'Requesting Department', {
      type: 'select',
      required: true,
      options: DEPARTMENTS,
    }),
    field('requesterName', 'Requester Name', { required: true }),
    field('departmentReference', 'Department Reference Number', { required: true }),
    field('requiredByDepartment', 'Required By Department', {
      type: 'select',
      required: true,
      options: DEPARTMENTS,
    }),
    field('relatedProjectProduct', 'Related Project / Product'),
    field('requirementDescription', 'Requirement Description', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
    }),
    field('justification', 'Business / Production Justification', {
      type: 'textarea',
      required: true,
      full: true,
      rows: 3,
    }),
  ],
};

/** Every source-specific key, used to keep values when the source changes. */
export const ALL_SOURCE_KEYS = [
  ...new Set(Object.values(SOURCE_FIELDS).flatMap((fields) => fields.map((row) => row.key))),
];

/** Register requester label for a record. */
export function requesterLabel(record) {
  if (!record) return '—';
  const fields = record.sourceFields || {};
  switch (record.source) {
    case 'Customer':
      return fields.customerName || record.requester || '—';
    case 'R&D / PDE':
      return fields.requestingTeam || record.requester || '—';
    case 'Service':
      return fields.serviceLocation || record.requester || '—';
    case 'Inter-Department':
      return fields.requestingDepartment || record.requester || '—';
    default:
      return record.requester || '—';
  }
}

/** Source reference (RFQ / R&D / service / department reference). */
export function sourceReference(record) {
  const fields = record?.sourceFields || {};
  return (
    fields.customerReference ||
    fields.rdReference ||
    fields.serviceReference ||
    fields.departmentReference ||
    ''
  );
}

export function sourceTone(source) {
  return SOURCE_META[source]?.tone || 'gray';
}

export function requestStatusTone(status) {
  return REQUEST_STATUS_TONES[status] || 'gray';
}

/* ------------------------------------------------------------------ */
/* Form helpers                                                        */
/* ------------------------------------------------------------------ */

export function createEmptyRequestForm(overrides = {}) {
  const sourceFields = {};
  ALL_SOURCE_KEYS.forEach((key) => {
    sourceFields[key] = '';
  });

  return {
    title: '',
    source: 'Customer',
    category: REQUEST_CATEGORIES[0],
    requestDate: TODAY,
    requiredDate: '',
    priority: 'Medium',
    description: '',
    productReference: '',
    projectReference: '',
    remarks: '',
    assignedTo: TECHNICAL_REVIEWERS[0],
    sourceFields,
    documents: [],
    ...overrides,
  };
}

export function requestToForm(record) {
  if (!record) return createEmptyRequestForm();
  return {
    title: record.title || '',
    source: record.source || 'Customer',
    category: record.category || REQUEST_CATEGORIES[0],
    requestDate: record.requestDate || TODAY,
    requiredDate: record.requiredDate || '',
    priority: record.priority || 'Medium',
    description: record.description || '',
    productReference: record.productReference || '',
    projectReference: record.projectReference || '',
    remarks: record.remarks || '',
    assignedTo: record.assignedTo || TECHNICAL_REVIEWERS[0],
    sourceFields: { ...createEmptyRequestForm().sourceFields, ...(record.sourceFields || {}) },
    documents: record.documents || [],
  };
}

export function nextRequestId(records = []) {
  const max = records.reduce((highest, record) => {
    const match = String(record.id || '').match(/^REQ-(\d{4})-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[2]));
  }, 0);
  return `REQ-2026-${String(max + 1).padStart(3, '0')}`;
}

/** Validate a request form. `mode` is 'draft' (minimal) or 'full'. */
export function validateRequestForm(form, mode = 'full') {
  const errors = {};
  if (!form.title?.trim()) errors.title = 'Request title is required.';
  if (!REQUEST_SOURCES.includes(form.source)) errors.source = 'Select a request source.';
  if (!form.category) errors.category = 'Select a request category.';
  if (!form.requestDate) errors.requestDate = 'Request date is required.';
  if (!form.requiredDate) errors.requiredDate = 'Required date is required.';

  if (form.requestDate && form.requiredDate && form.requiredDate < form.requestDate) {
    errors.requiredDate = 'Required date must be on or after the request date.';
  }

  if (mode === 'full') {
    if (!form.description?.trim()) errors.description = 'Request description is required.';
    (SOURCE_FIELDS[form.source] || []).forEach((definition) => {
      const value = String(form.sourceFields?.[definition.key] ?? '').trim();
      if (definition.required && !value) {
        errors[definition.key] = `${definition.label} is required.`;
      }
    });
    const email = String(form.sourceFields?.customerEmail || '').trim();
    if (form.source === 'Customer' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.customerEmail = 'Enter a valid email address.';
    }
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/* Technical assessment helpers                                        */
/* ------------------------------------------------------------------ */

export const ASSESSMENT_FEASIBILITY_FIELDS = [
  { key: 'technical', label: 'Technical Feasibility', type: 'select', options: FEASIBILITY_OPTIONS.technical, required: true },
  { key: 'resources', label: 'Resource Availability', type: 'select', options: FEASIBILITY_OPTIONS.resources, required: true },
  { key: 'complexity', label: 'Design Complexity', type: 'select', options: FEASIBILITY_OPTIONS.complexity, required: true },
  { key: 'materials', label: 'Material / Component Requirements', type: 'textarea', required: true, full: true, rows: 2 },
  { key: 'effort', label: 'Estimated Effort', type: 'text', required: true, placeholder: 'e.g. 120 engineering hours over 4 weeks' },
  { key: 'risks', label: 'Technical Risks', type: 'textarea', full: true, rows: 2 },
  { key: 'comments', label: 'Feasibility Comments', type: 'textarea', full: true, rows: 3 },
];

export function emptyAssessment() {
  return {
    reviewer: '',
    reviewDate: '',
    reviewComments: '',
    clarificationRequired: 'No',
    clarificationQuestions: '',
    clarificationResponse: '',
    clarificationStatus: 'Not Required',
    clarificationRaisedAt: '',
    clarificationRespondedAt: '',
    clarificationDocuments: [],
    feasibility: {
      technical: '',
      resources: '',
      complexity: '',
      materials: '',
      effort: '',
      risks: '',
      comments: '',
    },
    decision: '',
    decisionBy: '',
    decisionDate: '',
    decisionComments: '',
    decisionHistory: [],
  };
}

export function hydrateAssessment(assessment) {
  const base = emptyAssessment();
  if (!assessment) return base;
  return {
    ...base,
    ...assessment,
    feasibility: { ...base.feasibility, ...(assessment.feasibility || {}) },
    decisionHistory: Array.isArray(assessment.decisionHistory)
      ? assessment.decisionHistory
      : [],
    clarificationDocuments: Array.isArray(assessment.clarificationDocuments)
      ? assessment.clarificationDocuments
      : [],
  };
}

/** Mandatory checks before a request can be accepted. */
export function assessmentChecks(record) {
  const assessment = hydrateAssessment(record?.assessment);
  const value = (key) => String(assessment[key] ?? '').trim();
  const feasibility = assessment.feasibility || {};
  return [
    { key: 'reviewer', label: 'Technical reviewer assigned', pass: Boolean(value('reviewer')) },
    { key: 'reviewDate', label: 'Review date recorded', pass: Boolean(value('reviewDate')) },
    { key: 'comments', label: 'Initial review comments recorded', pass: Boolean(value('reviewComments')) },
    {
      key: 'clarification',
      label: 'No clarification response outstanding',
      pass: assessment.clarificationStatus !== 'Open',
    },
    { key: 'technical', label: 'Technical feasibility assessed', pass: Boolean(feasibility.technical) },
    { key: 'resources', label: 'Resource availability assessed', pass: Boolean(feasibility.resources) },
    { key: 'complexity', label: 'Design complexity assessed', pass: Boolean(feasibility.complexity) },
    {
      key: 'materials',
      label: 'Material / component requirements recorded',
      pass: Boolean(String(feasibility.materials || '').trim()),
    },
    {
      key: 'effort',
      label: 'Estimated effort recorded',
      pass: Boolean(String(feasibility.effort || '').trim()),
    },
  ];
}

export function assessmentReadiness(record) {
  const checks = assessmentChecks(record);
  const blockers = checks.filter((check) => !check.pass).map((check) => check.label);
  return { ready: blockers.length === 0, checks, blockers };
}

export const TECHNICAL_DECISIONS = ['Accepted', 'Rejected', 'Returned for Clarification'];

/** Request status produced by each technical decision. */
export function decideRequestStatus(decision) {
  return {
    Accepted: 'Accepted',
    Rejected: 'Rejected',
    'Returned for Clarification': 'Returned for Clarification',
  }[decision] || '';
}

/**
 * Returns an error message when a decision may not be recorded, so a request
 * can never be approved just because its assessment form was opened or saved.
 */
export function decisionError(record, decision, comments) {
  if (!record) return 'Request not found.';
  if (!TECHNICAL_DECISIONS.includes(decision)) return 'Select a technical decision.';
  if (['Converted to Project', 'Closed'].includes(record.status)) {
    return `${record.status} requests cannot be re-decided.`;
  }
  if (!['Under Initial Review', 'Under Feasibility Assessment', 'Returned for Clarification', 'Clarification Required'].includes(record.status)) {
    return `A decision can only be recorded while the request is under technical assessment. Current status: ${record.status}.`;
  }

  const assessment = hydrateAssessment(record.assessment);
  if (decision === 'Accepted') {
    const readiness = assessmentReadiness(record);
    if (!readiness.ready) {
      return `Complete the mandatory assessment first: ${readiness.blockers.join(', ')}.`;
    }
    if (assessment.clarificationStatus === 'Open') {
      return 'A request with an open clarification cannot be accepted.';
    }
  }
  if (!assessment.reviewer) return 'Assign a technical reviewer before recording a decision.';
  if (!assessment.reviewDate) return 'Record the review date before a decision.';
  if (decision !== 'Accepted' && !String(comments || '').trim()) {
    return decision === 'Rejected'
      ? 'A rejection reason is required.'
      : 'Explain what clarification is required before returning the request.';
  }
  return '';
}

/* ------------------------------------------------------------------ */
/* Conversion eligibility                                              */
/* ------------------------------------------------------------------ */

export function requiresQuotation(record) {
  return record?.source === 'Customer';
}

export function conversionEligibility(record) {
  if (!record) return { eligible: false, reason: 'Request not found.' };
  if (record.linkedProjectId) {
    return {
      eligible: false,
      reason: `Already converted to project ${record.linkedProjectId}.`,
      linkedProjectId: record.linkedProjectId,
    };
  }
  if (['Rejected', 'Closed', 'Draft'].includes(record.status)) {
    return { eligible: false, reason: `${record.status} requests cannot create a project.` };
  }
  if (requiresQuotation(record)) {
    if (record.status !== 'Quotation Accepted') {
      return {
        eligible: false,
        reason: 'Only an accepted customer quotation is eligible for project creation.',
      };
    }
    return { eligible: true, reason: 'Accepted quotation is ready for project creation.' };
  }
  if (record.status !== 'Accepted') {
    return {
      eligible: false,
      reason:
        record.status === 'Quotation in Progress' || record.status === 'Submitted to Customer'
          ? 'The request must be technically accepted before project creation.'
          : `The request must be technically accepted first (current status: ${record.status}).`,
    };
  }
  return { eligible: true, reason: 'Accepted request is ready for project creation.' };
}

/* ------------------------------------------------------------------ */
/* Quotation / commercial helpers                                      */
/* ------------------------------------------------------------------ */

export function emptyCommercial() {
  return {
    cost: {
      reference: '',
      estimatedCost: '',
      materialCost: '',
      engineeringCost: '',
      otherCost: '',
      bomReference: '',
      notes: '',
    },
    technical: {
      quotationNumber: '',
      revision: 'A',
      date: '',
      scope: '',
      specifications: '',
      delivery: '',
      terms: '',
      documents: [],
    },
    commercialReview: {
      reviewer: '',
      price: '',
      taxes: '',
      paymentTerms: '',
      deliveryTerms: '',
      validity: '',
      remarks: '',
      status: 'Not Started',
    },
    submission: { date: '', reference: '', by: '', document: '', remarks: '' },
    acceptance: { decision: '', date: '', poReference: '', remarks: '', documents: [] },
    stage: 'Draft',
    stageHistory: [],
  };
}

export function hydrateCommercial(commercial) {
  const base = emptyCommercial();
  if (!commercial) return null;
  return {
    ...base,
    ...commercial,
    cost: { ...base.cost, ...(commercial.cost || {}) },
    commercialReview: { ...base.commercialReview, ...(commercial.commercialReview || {}) },
    submission: { ...base.submission, ...(commercial.submission || {}) },
    technical: {
      ...base.technical,
      ...(commercial.technical || {}),
      documents: Array.isArray(commercial.technical?.documents)
        ? commercial.technical.documents
        : [],
    },
    acceptance: {
      ...base.acceptance,
      ...(commercial.acceptance || {}),
      documents: Array.isArray(commercial.acceptance?.documents)
        ? commercial.acceptance.documents
        : [],
    },
    stageHistory: Array.isArray(commercial.stageHistory) ? commercial.stageHistory : [],
  };
}

export function mergeCommercial(current, patch = {}) {
  const base = hydrateCommercial(current) || emptyCommercial();
  return {
    ...base,
    ...patch,
    cost: { ...base.cost, ...(patch.cost || {}) },
    technical: {
      ...base.technical,
      ...(patch.technical || {}),
      documents: patch.technical?.documents ?? base.technical.documents,
    },
    commercialReview: {
      ...base.commercialReview,
      ...(patch.commercialReview || {}),
    },
    submission: { ...base.submission, ...(patch.submission || {}) },
    acceptance: {
      ...base.acceptance,
      ...(patch.acceptance || {}),
      documents: patch.acceptance?.documents ?? base.acceptance.documents,
    },
    stageHistory: base.stageHistory,
  };
}

export function quotationEligibility(record) {
  if (!record) return { eligible: false, reason: 'Request not found.' };
  if (!requiresQuotation(record)) {
    return {
      eligible: false,
      reason: `${record.source} requests do not require a customer quotation.`,
    };
  }
  const allowed = [
    'Accepted',
    'Quotation in Progress',
    'Submitted to Customer',
    'Quotation Accepted',
    'Quotation Rejected',
    'Converted to Project',
  ];
  if (!allowed.includes(record.status)) {
    return {
      eligible: false,
      reason: 'The customer request must be technically accepted before quotation work.',
    };
  }
  return { eligible: true, reason: 'Customer request is ready for quotation.' };
}

export function nextQuotationNumber(requests = [], existingQuotations = []) {
  const numbers = [
    ...existingQuotations.map((row) => row.quotationRef || row.id),
    ...requests.map((row) => row.commercial?.technical?.quotationNumber),
  ].filter(Boolean);

  const max = numbers.reduce((highest, value) => {
    const match = String(value).match(/^QTN-(\d{4})-(\d+)/);
    if (!match) return highest;
    return Math.max(highest, Number(match[2]));
  }, 0);

  return `QTN-2026-${String(max + 1).padStart(3, '0')}`;
}

/** Validate the current quotation stage before it advances. */
export function quotationStageError(commercial, stage) {
  const value = (input) => String(input ?? '').trim();
  const technical = commercial?.technical || {};
  const review = commercial?.commercialReview || {};
  const submission = commercial?.submission || {};

  if (stage === 'Technical Review') {
    if (!value(technical.quotationNumber)) return 'Record the quotation number.';
    if (!value(technical.scope)) return 'Describe the product / scope being quoted.';
    if (!value(technical.specifications)) return 'Record the technical specifications.';
  }
  if (stage === 'Commercial Review') {
    if (!value(technical.delivery)) return 'Record delivery expectations.';
    if (!value(technical.terms)) return 'Record the technical terms.';
  }
  if (stage === 'Submitted to Customer') {
    if (!value(review.price) || Number(review.price) <= 0) return 'Enter the quoted price.';
    if (!value(review.reviewer)) return 'Assign a commercial reviewer.';
    if (!value(review.paymentTerms)) return 'Record the payment terms.';
    if (!value(review.deliveryTerms)) return 'Record the delivery terms.';
    if (!value(review.validity)) return 'Record the quotation validity period.';
    if (!value(submission.date)) return 'Record the submission date.';
    if (!value(submission.reference)) return 'Record the submission reference.';
    if (!value(submission.by)) return 'Record who submitted the quotation.';
  }
  return '';
}

/* ------------------------------------------------------------------ */
/* Hydration, legacy migration and seed data                           */
/* ------------------------------------------------------------------ */

function historyEntry(id, at, action, by, detail, status) {
  return { id, at, action, by, detail, status };
}

function seedDocument(id, name, category, type, size, uploadedAt, uploadedBy, notes = '') {
  return { id, name, category, type, size, uploadedAt, uploadedBy, notes };
}

export function hydrateRequest(record) {
  if (!record?.id) return null;
  const sourceFields = {};
  ALL_SOURCE_KEYS.forEach((key) => {
    sourceFields[key] = record.sourceFields?.[key] ?? '';
  });

  return {
    ...record,
    title: record.title || '',
    source: REQUEST_SOURCES.includes(record.source) ? record.source : 'Customer',
    category: record.category || REQUEST_CATEGORIES[0],
    priority: REQUEST_PRIORITIES.includes(record.priority) ? record.priority : 'Medium',
    status: REQUEST_STATUSES.includes(record.status) ? record.status : 'Draft',
    requestDate: record.requestDate || TODAY,
    requiredDate: record.requiredDate || '',
    description: record.description || '',
    productReference: record.productReference || '',
    projectReference: record.projectReference || '',
    remarks: record.remarks || '',
    assignedTo: record.assignedTo || '',
    sourceFields,
    documents: Array.isArray(record.documents) ? record.documents : [],
    history: Array.isArray(record.history) ? record.history : [],
    assessment: hydrateAssessment(record.assessment),
    commercial: hydrateCommercial(record.commercial),
    linkedProjectId: record.linkedProjectId || '',
    conversion: record.conversion || null,
    createdAt: record.createdAt || TODAY,
    updatedAt: record.updatedAt || record.createdAt || TODAY,
  };
}

const LEGACY_STATUS_MAP = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  'Under Technical Review': 'Under Initial Review',
  'Clarification Required': 'Clarification Required',
  'Ready for Quotation': 'Accepted',
  'Quotation Prepared': 'Quotation in Progress',
  Closed: 'Closed',
};

/** Map an existing customer enquiry record into a request record. */
export function requestFromEnquiry(enquiry) {
  if (!enquiry?.id) return null;
  const status = LEGACY_STATUS_MAP[enquiry.status] || 'Draft';
  const accepted = ['Accepted', 'Quotation in Progress'].includes(status);
  const clarified = enquiry.clarifications?.find((row) => row.status === 'Open');
  const lastResponded = [...(enquiry.clarifications || [])].reverse().find((row) => row.response);

  const assessment = emptyAssessment();
  assessment.reviewer = enquiry.engineeringContact || '';
  assessment.reviewDate = String(enquiry.updatedAt || enquiry.enquiryDate || '').slice(0, 10);
  assessment.reviewComments =
    [...(enquiry.history || [])].reverse().find((row) => row.action === 'Technical review started')
      ?.detail || '';
  assessment.clarificationRequired = (enquiry.clarifications || []).length ? 'Yes' : 'No';
  assessment.clarificationStatus = clarified
    ? 'Open'
    : lastResponded
      ? 'Responded'
      : 'Not Required';
  assessment.clarificationQuestions = clarified?.question || lastResponded?.question || '';
  assessment.clarificationResponse = lastResponded?.response || '';
  if (accepted) {
    Object.assign(assessment.feasibility, {
      technical: 'Feasible',
      resources: 'Available',
      complexity: 'Medium',
      materials: enquiry.specs?.materials || 'Confirmed during technical review.',
      effort: 'Engineering effort confirmed during technical review.',
      risks: '',
      comments: 'Technical requirement reviewed and accepted for quotation.',
    });
    assessment.decision = 'Accepted';
    assessment.decisionBy = enquiry.engineeringContact || 'N. Joshi';
    assessment.decisionDate = String(enquiry.updatedAt || enquiry.enquiryDate || '').slice(0, 10);
    assessment.decisionComments = 'Accepted after technical review of the customer requirement.';
    assessment.decisionHistory = [
      {
        id: `${enquiry.id}-DEC-01`,
        decision: 'Accepted',
        by: assessment.decisionBy,
        at: assessment.decisionDate,
        comments: assessment.decisionComments,
      },
    ];
  }

  const commercial =
    status === 'Quotation in Progress'
      ? {
          ...emptyCommercial(),
          technical: {
            ...emptyCommercial().technical,
            quotationNumber: enquiry.quotationRef || '',
            date: String(enquiry.updatedAt || '').slice(0, 10),
            scope: enquiry.subject,
            specifications: Object.values(enquiry.specs || {})
              .filter(Boolean)
              .slice(0, 3)
              .join(' · '),
            terms: 'Technical basis accepted with this enquiry.',
          },
          stage: 'Commercial Review',
          legacyQuotationId: enquiry.quotationRef || '',
          stageHistory: [
            {
              id: `${enquiry.id}-QS-01`,
              stage: 'Commercial Review',
              at: enquiry.updatedAt,
              by: enquiry.salesContact || 'Sales',
              note: `Existing quotation ${enquiry.quotationRef} prepared in the quotation register.`,
            },
          ],
        }
      : null;

  return hydrateRequest({
    id: enquiry.id,
    legacyEnquiryId: enquiry.id,
    title: enquiry.subject || 'Customer requirement',
    source: 'Customer',
    category: enquiry.category,
    priority: enquiry.priority,
    status,
    requestDate: enquiry.enquiryDate,
    requiredDate: enquiry.targetDeliveryDate,
    description: enquiry.description || '',
    productReference: enquiry.specs?.application || '',
    projectReference: '',
    remarks: enquiry.specs?.notes || '',
    assignedTo: enquiry.engineeringContact || '',
    requester: enquiry.customerName,
    sourceFields: {
      customerName: enquiry.customerName || '',
      contactPerson: enquiry.contactName || '',
      customerEmail: enquiry.contactEmail || '',
      customerPhone: enquiry.contactPhone || '',
      customerReference: enquiry.quotationRef || '',
      existingProjectRef: '',
      customerRequirement:
        [
          enquiry.description,
          enquiry.specs?.capacity ? `Capacity: ${enquiry.specs.capacity}` : '',
          enquiry.specs?.operatingConditions
            ? `Conditions: ${enquiry.specs.operatingConditions}`
            : '',
        ]
          .filter(Boolean)
          .join('\n') || '',
    },
    documents: (enquiry.documents || []).map((doc) => ({ ...doc })),
    assessment,
    commercial,
    history: (enquiry.history || []).map((entry) => ({ ...entry })),
    createdAt: enquiry.createdAt || enquiry.enquiryDate,
    updatedAt: enquiry.updatedAt || enquiry.enquiryDate,
  });
}

const NEW_SOURCE_SEEDS = [
  {
    id: 'REQ-2026-001',
    title: 'High-speed gripper for pick-and-place cell',
    source: 'R&D / PDE',
    category: 'Development / Prototype',
    priority: 'High',
    status: 'Accepted',
    requestDate: '2026-11-04',
    requiredDate: '2027-01-15',
    description:
      'Develop a lightweight high-speed gripper for the new pick-and-place cell. Cycle time target is 0.6 s including approach and release, with repeatability of ±0.1 mm at the tool centre point.',
    productReference: 'P&P-CELL-GEN3',
    projectReference: '',
    remarks: 'Prototype build planned in the R&D workshop before production release.',
    assignedTo: 'D. Rao',
    requester: 'R&D',
    sourceFields: {
      requestingTeam: 'R&D',
      rdReference: 'RND-2026-014',
      developmentType: 'New Development',
      researchObjective:
        'Validate a low-inertia gripper concept that supports a 0.6 s pick-and-place cycle without losing positional repeatability.',
      technicalRequirements:
        'Payload 1.2 kg, repeatability ±0.1 mm, compressed air 6 bar supply, tool change under 60 s, IP54 protection.',
      expectedOutcome:
        'Working prototype, test report and a design package suitable for a production variant.',
      customerReference: '',
    },
    assessment: {
      reviewer: 'N. Joshi',
      reviewDate: '2026-11-06',
      reviewComments:
        'Concept reviewed with the R&D team. Target cycle time is achievable with a parallel-jaw design and lightweight jaws.',
      clarificationRequired: 'No',
      clarificationStatus: 'Not Required',
      feasibility: {
        technical: 'Feasible',
        resources: 'Available',
        complexity: 'High',
        materials: 'Aluminium 6061 jaws with hardened steel contact inserts; standard pneumatic cylinder.',
        effort: '140 engineering hours over 5 weeks',
        risks: 'Repeatability at high speed depends on jaw mass and gripper mounting stiffness.',
        comments: 'Proceed with a prototype build after the design review milestone.',
      },
      decision: 'Accepted',
      decisionBy: 'N. Joshi',
      decisionDate: '2026-11-07',
      decisionComments: 'Accepted for prototype development and project initiation.',
      decisionHistory: [
        {
          id: 'REQ-2026-001-DEC-01',
          decision: 'Accepted',
          by: 'N. Joshi',
          at: '2026-11-07',
          comments: 'Accepted for prototype development and project initiation.',
        },
      ],
    },
    history: [
      historyEntry('REQ-2026-001-H1', '2026-11-04T09:20', 'Request created', 'R&D', 'R&D development request captured.', 'Draft'),
      historyEntry('REQ-2026-001-H2', '2026-11-04T10:05', 'Request submitted', 'R&D', 'Submitted to mechanical design for assessment.', 'Submitted'),
      historyEntry('REQ-2026-001-H3', '2026-11-06T11:10', 'Initial review started', 'N. Joshi', 'Gripper concept and cycle time reviewed.', 'Under Initial Review'),
      historyEntry('REQ-2026-001-H4', '2026-11-07T15:40', 'Request accepted', 'N. Joshi', 'Accepted for prototype development and project initiation.', 'Accepted'),
    ],
    createdAt: '2026-11-04T09:20',
    updatedAt: '2026-11-07T15:40',
  },
  {
    id: 'REQ-2026-002',
    title: 'Gearbox oil leakage on installed conveyor drive',
    source: 'Service',
    category: 'Retrofit / Upgrade',
    priority: 'Critical',
    status: 'Under Feasibility Assessment',
    requestDate: '2026-11-12',
    requiredDate: '2026-11-28',
    description:
      'Customer reports oil leakage from the gearbox output shaft seal on two installed conveyor drives. Engineering support is required to define a permanent sealing modification and a site retrofit procedure.',
    productReference: 'CD-450 Conveyor Drive',
    projectReference: 'PRJ-2025-018',
    remarks: 'Site visit scheduled with the service team; drives are in continuous duty.',
    assignedTo: 'P. Deshmukh',
    requester: 'Service',
    sourceFields: {
      serviceReference: 'SRV-2026-221',
      serviceLocation: 'Customer plant — Pune, Line 2',
      existingProduct: 'CD-450 Conveyor Drive',
      deliveryReference: 'DLV-2025-047',
      serialNumber: 'CD450-1187 / CD450-1189',
      issueDescription:
        'Oil seepage observed at the output shaft seal after approximately 9,000 running hours. Two drives affected; one shows oil contamination on the drive guard.',
      technicalSupport:
        'Root cause review, revised seal arrangement and a retrofit procedure that can be executed during a planned shutdown.',
    },
    documents: [
      seedDocument(
        'DOC-REQ-2026-002-01',
        'Service-Report-Consumer-Line2.pdf',
        'Service Report',
        'application/pdf',
        682000,
        '2026-11-12T09:40',
        'Service Team',
        'Site observation report with photographs.',
      ),
    ],
    assessment: {
      reviewer: 'N. Joshi',
      reviewDate: '2026-11-13',
      reviewComments:
        'Failure mode appears consistent with seal hardening under continuous duty. Feasibility review opened with the service team.',
      clarificationRequired: 'No',
      clarificationStatus: 'Not Required',
      feasibility: {
        technical: 'Feasible',
        resources: 'Partially available',
        complexity: 'Medium',
        materials: 'Revised Viton lip seal, shaft sleeve and gasket set.',
        effort: '',
        risks: 'Retrofit must fit the existing shutdown window; a spare seal kit is required.',
        comments: '',
      },
      decision: '',
      decisionBy: '',
      decisionDate: '',
      decisionComments: '',
      decisionHistory: [],
    },
    history: [
      historyEntry('REQ-2026-002-H1', '2026-11-12T09:45', 'Request created', 'Service Team', 'Service complaint captured from site report.', 'Draft'),
      historyEntry('REQ-2026-002-H2', '2026-11-12T10:20', 'Request submitted', 'Service Team', 'Sent to mechanical design for technical support.', 'Submitted'),
      historyEntry('REQ-2026-002-H3', '2026-11-13T08:50', 'Initial review started', 'N. Joshi', 'Failure mode and retrofit scope reviewed.', 'Under Initial Review'),
      historyEntry('REQ-2026-002-H4', '2026-11-13T16:10', 'Feasibility assessment started', 'N. Joshi', 'Seal arrangement and site retrofit assessed.', 'Under Feasibility Assessment'),
    ],
    createdAt: '2026-11-12T09:45',
    updatedAt: '2026-11-13T16:10',
  },
  {
    id: 'REQ-2026-003',
    title: 'Welding fixture for new frame line',
    source: 'Inter-Department',
    category: 'Tooling / Fixture',
    priority: 'Medium',
    status: 'Clarification Required',
    requestDate: '2026-11-08',
    requiredDate: '2026-12-20',
    description:
      'Production requires a welding fixture for the new frame weldment so that frame squareness and hole positions are repeatable across the shift. The fixture will be used with the existing positioner.',
    productReference: 'FRM-220 Frame Weldment',
    projectReference: '',
    remarks: 'Production has offered to provide the first three weldments for trial fit-up.',
    assignedTo: 'R. Kulkarni',
    requester: 'Production',
    sourceFields: {
      requestingDepartment: 'Production',
      requesterName: 'S. Kulkarni',
      departmentReference: 'PROD-REQ-2026-072',
      requiredByDepartment: 'Production',
      relatedProjectProduct: 'FRM-220 Frame Weldment',
      requirementDescription:
        'A locating and clamping fixture for the frame weldment, suitable for the existing 2-tonne positioner, with quick-release clamps and hardened locators.',
      justification:
        'Current free-hand tack welding causes rework on hole alignment and frame squareness, delaying the assembly line.',
    },
    assessment: {
      reviewer: 'K. Pillai',
      reviewDate: '2026-11-10',
      reviewComments:
        'Fixture concept is understood; the positioner interface and locator wear allowance need confirmation before feasibility is completed.',
      clarificationRequired: 'Yes',
      clarificationStatus: 'Open',
      clarificationQuestions:
        'Confirm the positioner mounting interface drawing and whether locators should be hardened or replaceable inserts.',
      clarificationResponse: '',
      clarificationRaisedAt: '2026-11-10',
      feasibility: {
        technical: '',
        resources: '',
        complexity: '',
        materials: '',
        effort: '',
        risks: '',
        comments: '',
      },
      decision: '',
      decisionBy: '',
      decisionDate: '',
      decisionComments: '',
      decisionHistory: [],
    },
    history: [
      historyEntry('REQ-2026-003-H1', '2026-11-08T14:05', 'Request created', 'Production', 'Inter-department request captured.', 'Draft'),
      historyEntry('REQ-2026-003-H2', '2026-11-08T14:40', 'Request submitted', 'Production', 'Submitted to mechanical design.', 'Submitted'),
      historyEntry('REQ-2026-003-H3', '2026-11-10T09:15', 'Initial review started', 'K. Pillai', 'Fixture requirement reviewed with production.', 'Under Initial Review'),
      historyEntry('REQ-2026-003-H4', '2026-11-10T11:35', 'Clarification raised', 'K. Pillai', 'Positioner interface and locator wear allowance.', 'Clarification Required'),
    ],
    createdAt: '2026-11-08T14:05',
    updatedAt: '2026-11-10T11:35',
  },
];

/** Seed records for a first run: migrated customer enquiries + new sources. */
export function seedRequests(legacyEnquiries = CUSTOMER_ENQUIRIES) {
  return [
    ...NEW_SOURCE_SEEDS.map(hydrateRequest),
    ...legacyEnquiries.map(requestFromEnquiry).filter(Boolean),
  ];
}

export { formatDate, formatStamp };
