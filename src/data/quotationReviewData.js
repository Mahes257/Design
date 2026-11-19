import {
  CUSTOMER_ENQUIRIES,
  ENGINEERING_CONTACTS,
  SALES_CONTACTS,
  TODAY,
} from './customerEnquiryData';
import { ENGINEERS, PROJECT_PRIORITIES, addDays } from './projectData';

export const QUOTATION_STATUSES = [
  'Draft',
  'Technical Review',
  'Changes Requested',
  'Technically Accepted',
  'Ready for Sales',
  'Customer Submitted',
  'Accepted',
  'Rejected',
  'Expired',
];

export const QUOTATION_REVISIONS = ['A', 'B', 'C', 'D', 'E'];

export const FEASIBILITY_OPTIONS = [
  'Feasible',
  'Feasible with conditions',
  'Not feasible',
];

export const QUOTATION_PRIORITIES = PROJECT_PRIORITIES;

export const QUOTATION_STATUS_TONES = {
  Draft: 'gray',
  'Technical Review': 'purple',
  'Changes Requested': 'red',
  'Technically Accepted': 'green',
  'Ready for Sales': 'blue',
  'Customer Submitted': 'orange',
  Accepted: 'green',
  Rejected: 'red',
  Expired: 'gray',
};

export const QUOTATION_PRIORITY_TONES = {
  Critical: 'red',
  High: 'orange',
  Medium: 'blue',
  Low: 'gray',
};

export const QUOTATION_WORKFLOW = [
  {
    key: 'enquiry',
    number: '01',
    title: 'Customer Enquiry',
    detail: 'Confirm the linked enquiry and technical requirement basis.',
  },
  {
    key: 'review',
    number: '02',
    title: 'Technical Review',
    detail: 'Assess design and manufacturing feasibility before release.',
  },
  {
    key: 'preparation',
    number: '03',
    title: 'Quotation Preparation',
    detail: 'Prepare the technical configuration, assumptions and estimates.',
  },
  {
    key: 'acceptance',
    number: '04',
    title: 'Customer Acceptance',
    detail: 'Record the customer decision. Only accepted quotations convert.',
  },
];

const TRANSITIONS = {
  Draft: ['Technical Review'],
  'Technical Review': ['Technically Accepted', 'Changes Requested'],
  'Changes Requested': ['Technical Review'],
  'Technically Accepted': ['Ready for Sales'],
  'Ready for Sales': ['Customer Submitted'],
  'Customer Submitted': ['Accepted', 'Rejected', 'Expired'],
  Accepted: [],
  Rejected: [],
  Expired: [],
};

const ACTION_LABELS = {
  'Technical Review': 'Start Technical Review',
  'Technically Accepted': 'Accept Technical Basis',
  'Changes Requested': 'Request Changes',
  'Ready for Sales': 'Release to Sales',
  'Customer Submitted': 'Mark Customer Submitted',
  Accepted: 'Record Customer Acceptance',
  Rejected: 'Record Rejection',
  Expired: 'Mark Expired',
};

const HISTORY_ACTIONS = {
  'Technical Review': 'Technical review started',
  'Technically Accepted': 'Technical basis accepted',
  'Changes Requested': 'Changes requested',
  'Ready for Sales': 'Released to sales',
  'Customer Submitted': 'Quotation submitted to customer',
  Accepted: 'Customer accepted quotation',
  Rejected: 'Customer rejected quotation',
  Expired: 'Quotation expired',
};

const EDITABLE_STATUSES = [
  'Draft',
  'Technical Review',
  'Changes Requested',
  'Technically Accepted',
  'Ready for Sales',
];

const STAGE_INDEX = {
  Draft: 2,
  'Technical Review': 1,
  'Changes Requested': 1,
  'Technically Accepted': 2,
  'Ready for Sales': 2,
  'Customer Submitted': 3,
  Accepted: 3,
  Rejected: 3,
  Expired: 3,
};

const PROJECT_DOMAIN_BY_CATEGORY = {
  'Conveyor System': 'Machine Design',
  'Hydraulic Equipment': 'Equipment Design',
  'Pressure Equipment': 'Equipment Design',
  'Sheet Metal Enclosure': 'Sheet Metal Design',
  'Piping / Skid': 'Piping Design',
  'Rotating Equipment': 'Machine Design',
  'Special Purpose Machine': 'Machine Design',
  'Mechanical Assembly': 'Machine Design',
};

export const PROJECT_DELIVERABLES = [
  '3D CAD model',
  'GA drawing',
  'Manufacturing drawings',
  'Engineering BOM',
  'Design calculation report',
];

export function quotationStatusTone(status) {
  return QUOTATION_STATUS_TONES[status] || 'gray';
}

export function quotationPriorityTone(priority) {
  return QUOTATION_PRIORITY_TONES[priority] || 'gray';
}

export function formatRevision(revision) {
  return revision ? `Rev ${revision}` : 'Rev —';
}

export function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || value === '' || value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatEffort(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'Not estimated';
  return `${number.toLocaleString('en-IN')} h`;
}

export function projectDomainForCategory(category) {
  return PROJECT_DOMAIN_BY_CATEGORY[category] || 'Machine Design';
}

export function suggestedProjectName(record) {
  if (!record) return 'New Design Project';
  if (record.enquirySubject) return record.enquirySubject;
  if (record.productConfiguration) {
    return record.productConfiguration.split('·')[0].trim();
  }
  return 'New Design Project';
}

export function quotationStats(records = []) {
  const count = (status) => records.filter((record) => record.status === status).length;
  return {
    total: records.length,
    draft: count('Draft'),
    technicalReview: count('Technical Review'),
    changesRequested: count('Changes Requested'),
    technicallyAccepted: count('Technically Accepted'),
    readyForSales: count('Ready for Sales'),
    customerSubmitted: count('Customer Submitted'),
    accepted: count('Accepted'),
    rejected: count('Rejected'),
    expired: count('Expired'),
    inReview: count('Technical Review') + count('Changes Requested'),
    awaitingCustomer: count('Ready for Sales') + count('Customer Submitted'),
    converted: records.filter((record) => Boolean(record.convertedProjectId)).length,
  };
}

export function nextQuotationId(records = []) {
  const year = new Date().getFullYear();
  const highest = records.reduce((max, record) => {
    const match = String(record.id || record.quotationRef || '').match(/^QTN-\d{4}-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `QTN-${year}-${String(highest + 1).padStart(3, '0')}`;
}

export function quotationReadiness(record) {
  const designAssessed = FEASIBILITY_OPTIONS.includes(record?.designFeasibility);
  const manufacturingAssessed = FEASIBILITY_OPTIONS.includes(record?.manufacturingFeasibility);
  const effort = Number(record?.engineeringEffort);

  const checks = [
    {
      key: 'enquiry',
      label: 'Linked to a customer enquiry',
      pass: Boolean(record?.linkedEnquiryId),
    },
    {
      key: 'configuration',
      label: 'Product / machine configuration defined',
      pass: Boolean(record?.productConfiguration?.trim()),
    },
    {
      key: 'specs',
      label: 'Preliminary technical specifications recorded',
      pass: Boolean(record?.preliminarySpecifications?.trim()),
    },
    {
      key: 'design',
      label: 'Design feasibility assessed',
      pass: designAssessed,
    },
    {
      key: 'manufacturing',
      label: 'Manufacturing feasibility assessed',
      pass: manufacturingAssessed,
    },
    {
      key: 'feasibility',
      label: 'No feasibility blocker recorded',
      pass:
        designAssessed &&
        manufacturingAssessed &&
        record?.designFeasibility !== 'Not feasible' &&
        record?.manufacturingFeasibility !== 'Not feasible',
    },
    {
      key: 'materials',
      label: 'Material assumptions documented',
      pass: Boolean(record?.materialAssumptions?.trim()),
    },
    {
      key: 'bom',
      label: 'Preliminary BOM reference recorded',
      pass: Boolean(record?.preliminaryBomRef?.trim()),
    },
    {
      key: 'effort',
      label: 'Engineering effort estimated',
      pass: Number.isFinite(effort) && effort > 0,
    },
    {
      key: 'costs',
      label: 'Preliminary material and manufacturing costs recorded',
      pass:
        Number.isFinite(Number(record?.materialCost)) &&
        Number.isFinite(Number(record?.manufacturingCost)) &&
        record?.materialCost !== '' &&
        record?.manufacturingCost !== '' &&
        record?.materialCost != null &&
        record?.manufacturingCost != null,
    },
    {
      key: 'delivery',
      label: 'Target delivery estimate recorded',
      pass: Boolean(record?.targetDeliveryEstimate),
    },
    {
      key: 'reviewer',
      label: 'Technical reviewer assigned',
      pass: Boolean(record?.review?.assignedReviewer),
    },
  ];

  return {
    ready: checks.every((check) => check.pass),
    checks,
    blockers: checks.filter((check) => !check.pass).map((check) => check.label),
  };
}

export function statusActions(record) {
  if (!record) return [];
  const readiness = quotationReadiness(record);
  return (TRANSITIONS[record.status] || []).map((value) => {
    let disabledReason = '';
    if (value === 'Technically Accepted' && !readiness.ready) {
      disabledReason = `Complete the technical review: ${readiness.blockers.join(' · ')}`;
    }
    if (value === 'Changes Requested' && !record.review?.assignedReviewer) {
      disabledReason = 'Assign a technical reviewer before requesting changes.';
    }
    return {
      value,
      label: ACTION_LABELS[value] || value,
      disabled: Boolean(disabledReason),
      reason: disabledReason,
    };
  });
}

export function quotationTransitionError(record, nextStatus, payload = {}) {
  if (!record) return 'Quotation not found.';
  if (!(TRANSITIONS[record.status] || []).includes(nextStatus)) {
    return `A ${record.status} quotation cannot move directly to ${nextStatus}.`;
  }

  const note = String(payload.note || '').trim();
  const reviewer = String(payload.reviewer || record.review?.assignedReviewer || '').trim();

  if (['Technical Review', 'Technically Accepted', 'Changes Requested'].includes(nextStatus)) {
    if (!reviewer) return 'Assign a technical reviewer before recording the review.';
  }

  if (nextStatus === 'Technically Accepted') {
    const readiness = quotationReadiness({
      ...record,
      review: { ...record.review, assignedReviewer: reviewer },
    });
    if (!readiness.ready) {
      return `Technical review is incomplete: ${readiness.blockers.join(' · ')}`;
    }
  }

  if (nextStatus === 'Changes Requested' && !note) {
    return 'Add review comments describing the requested changes.';
  }

  if (nextStatus === 'Rejected' && !note) {
    return 'Add a reason for the customer rejection.';
  }

  return '';
}

export function isQuotationEditable(record) {
  return Boolean(record && EDITABLE_STATUSES.includes(record.status));
}

export function isQuotationConvertible(record) {
  return Boolean(record && record.status === 'Accepted' && !record.convertedProjectId);
}

export function quotationStageIndex(record) {
  return STAGE_INDEX[record?.status] ?? 0;
}

export function createEmptyQuotationForm(enquiry = null) {
  return {
    linkedEnquiryId: enquiry?.id || '',
    quotationDate: TODAY,
    revision: 'A',
    priority: enquiry?.priority || 'Medium',
    targetDeliveryEstimate: enquiry?.targetDeliveryDate || '',
    productConfiguration: enquiry?.subject || '',
    preliminarySpecifications: enquiry
      ? [enquiry.description, enquiry.specs?.application, enquiry.specs?.capacity]
          .filter(Boolean)
          .join('\n\n')
      : '',
    designFeasibility: '',
    designFeasibilityNotes: '',
    manufacturingFeasibility: '',
    manufacturingFeasibilityNotes: '',
    materialAssumptions: enquiry?.specs?.materials || '',
    preliminaryBomRef: '',
    engineeringEffort: '',
    materialCost: '',
    manufacturingCost: '',
    technicalComments: '',
    reviewer: '',
    reviewAssignedOn: TODAY,
    salesContact: enquiry?.salesContact || SALES_CONTACTS[0],
    engineeringOwner: enquiry?.engineeringContact || ENGINEERING_CONTACTS[0],
  };
}

export function quotationToForm(record) {
  if (!record) return createEmptyQuotationForm();
  return {
    linkedEnquiryId: record.linkedEnquiryId || '',
    quotationDate: record.quotationDate || TODAY,
    revision: record.revision || 'A',
    priority: record.priority || 'Medium',
    targetDeliveryEstimate: record.targetDeliveryEstimate || '',
    productConfiguration: record.productConfiguration || '',
    preliminarySpecifications: record.preliminarySpecifications || '',
    designFeasibility: record.designFeasibility || '',
    designFeasibilityNotes: record.designFeasibilityNotes || '',
    manufacturingFeasibility: record.manufacturingFeasibility || '',
    manufacturingFeasibilityNotes: record.manufacturingFeasibilityNotes || '',
    materialAssumptions: record.materialAssumptions || '',
    preliminaryBomRef: record.preliminaryBomRef || '',
    engineeringEffort:
      record.engineeringEffort === 0 || record.engineeringEffort == null
        ? ''
        : String(record.engineeringEffort),
    materialCost:
      record.materialCost === 0 || record.materialCost == null ? '' : String(record.materialCost),
    manufacturingCost:
      record.manufacturingCost === 0 || record.manufacturingCost == null
        ? ''
        : String(record.manufacturingCost),
    technicalComments: record.technicalComments || '',
    reviewer: record.review?.assignedReviewer || '',
    reviewAssignedOn: record.review?.assignedOn || TODAY,
    salesContact: record.salesContact || SALES_CONTACTS[0],
    engineeringOwner: record.engineeringOwner || ENGINEERING_CONTACTS[0],
  };
}

export function hydrateQuotation(record) {
  if (!record?.id) return null;
  return {
    ...record,
    quotationRef: record.quotationRef || record.id,
    revision: record.revision || 'A',
    status: QUOTATION_STATUSES.includes(record.status) ? record.status : 'Draft',
    review: {
      assignedReviewer: '',
      assignedOn: '',
      reviewedOn: '',
      outcome: '',
      comments: '',
      ...(record.review || {}),
    },
    history: Array.isArray(record.history) ? record.history : [],
    engineeringEffort: Number(record.engineeringEffort) || 0,
    materialCost: Number(record.materialCost) || 0,
    manufacturingCost: Number(record.manufacturingCost) || 0,
    convertedProjectId: record.convertedProjectId || '',
  };
}

/* ------------------------------------------------------------------ seeds */
function seedHistory(id, at, action, by, detail, status) {
  return { id, at, action, by, detail, status };
}

function seedQuotation({
  id,
  enquiryId,
  revision,
  status,
  quotationDate,
  targetDeliveryEstimate,
  productConfiguration,
  preliminarySpecifications,
  designFeasibility,
  designFeasibilityNotes,
  manufacturingFeasibility,
  manufacturingFeasibilityNotes,
  materialAssumptions,
  preliminaryBomRef,
  engineeringEffort,
  materialCost,
  manufacturingCost,
  technicalComments,
  reviewer,
  reviewAssignedOn,
  reviewedOn,
  reviewOutcome,
  reviewComments,
  customerReference = '',
  submittedToCustomerAt = '',
  decisionAt = '',
  history,
  createdAt,
  updatedAt,
}) {
  const enquiry = CUSTOMER_ENQUIRIES.find((item) => item.id === enquiryId);
  return {
    id,
    quotationRef: id,
    revision,
    status,
    linkedEnquiryId: enquiryId,
    enquirySubject: enquiry?.subject || '',
    customerName: enquiry?.customerName || '',
    customerContact: enquiry?.contactName || '',
    customerEmail: enquiry?.contactEmail || '',
    customerCategory: enquiry?.category || '',
    quotationDate,
    targetDeliveryEstimate,
    priority: enquiry?.priority || 'Medium',
    salesContact: enquiry?.salesContact || 'R. Kulkarni',
    engineeringOwner: enquiry?.engineeringContact || 'N. Joshi',
    productConfiguration,
    preliminarySpecifications,
    designFeasibility,
    designFeasibilityNotes,
    manufacturingFeasibility,
    manufacturingFeasibilityNotes,
    materialAssumptions,
    preliminaryBomRef,
    engineeringEffort,
    materialCost,
    manufacturingCost,
    technicalComments,
    review: {
      assignedReviewer: reviewer,
      assignedOn: reviewAssignedOn,
      reviewedOn,
      outcome: reviewOutcome,
      comments: reviewComments,
    },
    customerReference,
    submittedToCustomerAt,
    decisionAt,
    convertedProjectId: '',
    history,
    createdAt,
    updatedAt,
  };
}

const SEED_QUOTATIONS = [
  seedQuotation({
    id: 'QTN-2026-021',
    enquiryId: 'ENQ-2026-039',
    revision: 'A',
    status: 'Draft',
    quotationDate: '2026-11-13',
    targetDeliveryEstimate: '2027-02-10',
    productConfiguration:
      'Cooling tower fan hub — reverse-engineered replacement hub, 2.2 m fan interface, four-off supply.',
    preliminarySpecifications:
      'Replacement fan hubs for four cooling towers. Dimensional reference from customer sample, machined shaft interface and dynamic balance to customer requirements.',
    designFeasibility: '',
    designFeasibilityNotes: '',
    manufacturingFeasibility: '',
    manufacturingFeasibilityNotes: '',
    materialAssumptions: 'Cast iron hub, machined steel shaft interface, wooden shipping crate.',
    preliminaryBomRef: '',
    engineeringEffort: 0,
    materialCost: 0,
    manufacturingCost: 0,
    technicalComments:
      'Draft technical basis. Awaiting customer sample hub and dimensional reference before feasibility sign-off.',
    reviewer: '',
    reviewAssignedOn: '',
    reviewedOn: '',
    reviewOutcome: '',
    reviewComments: '',
    history: [
      seedHistory(
        'H-QT-021-01',
        '2026-11-13T10:20',
        'Quotation draft created',
        'R. Kulkarni',
        'Draft linked to ENQ-2026-039. Technical assessment not started.',
        'Draft',
      ),
    ],
    createdAt: '2026-11-13T10:20',
    updatedAt: '2026-11-13T10:20',
  }),
  seedQuotation({
    id: 'QTN-2026-020',
    enquiryId: 'ENQ-2026-042',
    revision: 'A',
    status: 'Technical Review',
    quotationDate: '2026-11-09',
    targetDeliveryEstimate: '2027-02-20',
    productConfiguration:
      '200 t hydraulic press frame — fabricated structural frame with cylinder interface and future 250 t upgrade capability.',
    preliminarySpecifications:
      'Fabricated IS2062 E350 frame, machined load pads, 4,200 × 2,200 × 3,600 mm envelope. Design to IS 800 and customer structural basis, including weld inspection and load test.',
    designFeasibility: 'Feasible with conditions',
    designFeasibilityNotes:
      'Frame architecture is feasible. Cylinder interface drawing must be frozen before detailed design; future 250 t upgrade requires local stiffener additions.',
    manufacturingFeasibility: 'Feasible',
    manufacturingFeasibilityNotes:
      'Fabrication can be completed at the existing heavy-fab vendor. Machining of load pads fits the vendor envelope.',
    materialAssumptions:
      'IS2062 E350 plates, machined load pads, structural weld consumables and surface protection per customer specification.',
    preliminaryBomRef: 'BOM-2026-042-A',
    engineeringEffort: 640,
    materialCost: 2850000,
    manufacturingCost: 1240000,
    technicalComments:
      'Structural scheme accepted for review. Manufacturing input confirms the press frame can be fabricated in two match-marked subassemblies.',
    reviewer: 'D. Rao',
    reviewAssignedOn: '2026-11-10',
    reviewedOn: '',
    reviewOutcome: '',
    reviewComments: '',
    history: [
      seedHistory(
        'H-QT-020-01',
        '2026-11-09T09:40',
        'Quotation draft created',
        'A. Iyer',
        'Technical quotation preparation started against ENQ-2026-042.',
        'Draft',
      ),
      seedHistory(
        'H-QT-020-02',
        '2026-11-10T10:15',
        'Technical review started',
        'D. Rao',
        'D. Rao assigned for structural and manufacturing feasibility review.',
        'Technical Review',
      ),
      seedHistory(
        'H-QT-020-03',
        '2026-11-12T15:30',
        'Technical assumptions updated',
        'D. Rao',
        'Feasibility conditions and preliminary BOM reference recorded.',
        'Technical Review',
      ),
    ],
    createdAt: '2026-11-09T09:40',
    updatedAt: '2026-11-12T15:30',
  }),
  seedQuotation({
    id: 'QTN-2026-015',
    enquiryId: 'ENQ-2026-041',
    revision: 'B',
    status: 'Changes Requested',
    quotationDate: '2026-11-08',
    targetDeliveryEstimate: '2026-12-30',
    productConfiguration:
      'IP54 control panel enclosure — 12 off wall-mounted enclosures with cable glands and removable mounting plates.',
    preliminarySpecifications:
      '800 × 600 × 300 mm CRCA enclosure, 2 mm sheet, IP54 gasket, powder-coated finish. Customer cut-out drawing revision B forms the interface basis.',
    designFeasibility: 'Feasible',
    designFeasibilityNotes:
      'Enclosure and cut-out layout are feasible with the current sheet-metal process.',
    manufacturingFeasibility: 'Feasible with conditions',
    manufacturingFeasibilityNotes:
      'Finish and gasket selection depend on the confirmed RAL shade and anti-corrosion primer requirement.',
    materialAssumptions:
      '2 mm CRCA sheet, IP54 gasket, stainless hardware and powder coating. Primer assumed unless customer confirms otherwise.',
    preliminaryBomRef: 'BOM-2026-041-B',
    engineeringEffort: 180,
    materialCost: 840000,
    manufacturingCost: 260000,
    technicalComments:
      'Technical basis is feasible. Review cannot close until paint shade and primer requirement are confirmed by the customer.',
    reviewer: 'P. Deshmukh',
    reviewAssignedOn: '2026-11-09',
    reviewedOn: '2026-11-11',
    reviewOutcome: 'Changes Requested',
    reviewComments:
      'Confirm RAL shade and anti-corrosion primer before accepting the enclosure finish basis. Update the BOM with the approved gasket and hardware make.',
    history: [
      seedHistory(
        'H-QT-015-01',
        '2026-11-08T11:10',
        'Quotation draft created',
        'S. Menon',
        'Quotation prepared for ENQ-2026-041 with revision B cut-out drawing.',
        'Draft',
      ),
      seedHistory(
        'H-QT-015-02',
        '2026-11-09T09:35',
        'Technical review started',
        'P. Deshmukh',
        'Enclosure and finish basis assigned for review.',
        'Technical Review',
      ),
      seedHistory(
        'H-QT-015-03',
        '2026-11-11T16:20',
        'Changes requested',
        'P. Deshmukh',
        'Paint shade and anti-corrosion primer remain unresolved; BOM make-down required.',
        'Changes Requested',
      ),
    ],
    createdAt: '2026-11-08T11:10',
    updatedAt: '2026-11-11T16:20',
  }),
  seedQuotation({
    id: 'QTN-2026-017',
    enquiryId: 'ENQ-2026-043',
    revision: 'A',
    status: 'Technically Accepted',
    quotationDate: '2026-11-13',
    targetDeliveryEstimate: '2027-01-20',
    productConfiguration:
      'Automated conveyor drive package — two VFD-controlled drives for a warehouse sortation line.',
    preliminarySpecifications:
      'Two conveyor drives at 45 t/h and 1.5 m/s belt speed, 415 V / 50 Hz, PROFINET interface with Siemens PLC and VFD standard. Factory acceptance test with load simulation.',
    designFeasibility: 'Feasible',
    designFeasibilityNotes:
      'Drive architecture and frame envelope fit the existing sortation line. Motor and VFD selection meets the continuous duty profile.',
    manufacturingFeasibility: 'Feasible',
    manufacturingFeasibilityNotes:
      'Fabricated frames, drive assembly and factory testing fit the current workshop and vendor plan.',
    materialAssumptions:
      'Fabricated MS frame with PU powder coat, IEC 60034 motors, Siemens VFD and PROFINET interface. Seaworthy wooden crates.',
    preliminaryBomRef: 'BOM-2026-043-A',
    engineeringEffort: 420,
    materialCost: 1960000,
    manufacturingCost: 540000,
    technicalComments:
      'Customer clarification on fieldbus protocol and VFD make is closed. Technical basis is accepted for sales release.',
    reviewer: 'N. Joshi',
    reviewAssignedOn: '2026-11-13',
    reviewedOn: '2026-11-14',
    reviewOutcome: 'Technically Accepted',
    reviewComments:
      'Design and manufacturing feasibility confirmed. Release the technical basis to sales for customer submission.',
    history: [
      seedHistory(
        'H-QT-017-01',
        '2026-11-13T10:05',
        'Quotation draft created',
        'R. Kulkarni',
        'Quotation linked to ENQ-2026-043 and forwarded for technical review.',
        'Draft',
      ),
      seedHistory(
        'H-QT-017-02',
        '2026-11-13T11:20',
        'Technical review started',
        'N. Joshi',
        'Drive package assigned to N. Joshi for technical review.',
        'Technical Review',
      ),
      seedHistory(
        'H-QT-017-03',
        '2026-11-14T14:10',
        'Technical basis accepted',
        'N. Joshi',
        'Drive architecture, BOM basis and delivery plan accepted; released to sales.',
        'Technically Accepted',
      ),
    ],
    createdAt: '2026-11-13T10:05',
    updatedAt: '2026-11-14T14:10',
  }),
  seedQuotation({
    id: 'QTN-2026-018',
    enquiryId: 'ENQ-2026-040',
    revision: 'B',
    status: 'Accepted',
    quotationDate: '2026-11-10',
    targetDeliveryEstimate: '2027-01-10',
    productConfiguration:
      'Utility skid piping package — carbon steel and stainless steel lines with supports, valves and site interfaces.',
    preliminarySpecifications:
      'Skid 6,200 × 2,400 × 2,800 mm, cooling water 45 m³/h and instrument air 120 Nm³/h. ASME B31.3 lines, hydrotest and dye-penetrant inspection.',
    designFeasibility: 'Feasible',
    designFeasibilityNotes:
      'Piping layout and support scheme fit the customer skid envelope. Alternate valve make is technically acceptable.',
    manufacturingFeasibility: 'Feasible',
    manufacturingFeasibilityNotes:
      'Fabrication, hydrotest and skid assembly can be completed within the required delivery window.',
    materialAssumptions:
      'ASTM A106 Gr B carbon steel and ASTM A312 TP316L stainless steel, with approved valve make and skid-mounted supports.',
    preliminaryBomRef: 'BOM-2026-040-B',
    engineeringEffort: 320,
    materialCost: 2650000,
    manufacturingCost: 980000,
    technicalComments:
      'Technical basis accepted. Customer accepted the controlled revision B scope and delivery estimate.',
    reviewer: 'N. Joshi',
    reviewAssignedOn: '2026-11-06',
    reviewedOn: '2026-11-08',
    reviewOutcome: 'Technically Accepted',
    reviewComments:
      'Piping, material and manufacturing basis accepted. Release revision B to sales for customer submission.',
    customerReference: 'TC/PO/2026/1184',
    submittedToCustomerAt: '2026-11-11',
    decisionAt: '2026-11-14',
    history: [
      seedHistory(
        'H-QT-018-01',
        '2026-11-10T11:05',
        'Quotation draft created',
        'P. Deshmukh',
        'Revision B prepared against ENQ-2026-040 and submitted for technical review.',
        'Draft',
      ),
      seedHistory(
        'H-QT-018-02',
        '2026-11-10T11:30',
        'Technical review started',
        'N. Joshi',
        'Piping and material review opened for revision B.',
        'Technical Review',
      ),
      seedHistory(
        'H-QT-018-03',
        '2026-11-11T09:15',
        'Technical basis accepted',
        'N. Joshi',
        'Piping and skid manufacturing basis technically accepted.',
        'Technically Accepted',
      ),
      seedHistory(
        'H-QT-018-04',
        '2026-11-11T15:40',
        'Released to sales',
        'N. Joshi',
        'Revision B technical package released for customer submission.',
        'Ready for Sales',
      ),
      seedHistory(
        'H-QT-018-05',
        '2026-11-11T16:30',
        'Quotation submitted to customer',
        'P. Deshmukh',
        'Customer reference TC/PO/2026/1184 recorded.',
        'Customer Submitted',
      ),
      seedHistory(
        'H-QT-018-06',
        '2026-11-14T10:20',
        'Customer accepted quotation',
        'P. Deshmukh',
        'Customer accepted revision B. Project initiation is now available.',
        'Accepted',
      ),
    ],
    createdAt: '2026-11-10T11:05',
    updatedAt: '2026-11-14T10:20',
  }),
  seedQuotation({
    id: 'QTN-2026-014',
    enquiryId: 'ENQ-2026-037',
    revision: 'A',
    status: 'Rejected',
    quotationDate: '2026-10-22',
    targetDeliveryEstimate: '2026-12-05',
    productConfiguration:
      'Stainless steel operator enclosure — two hygienic enclosures with hinged doors and sealed edges.',
    preliminarySpecifications:
      '1,100 × 700 × 350 mm SS304 2B enclosure, food-grade gasket and IP65 sealing. Dimensional and finish inspection before dispatch.',
    designFeasibility: 'Feasible',
    designFeasibilityNotes:
      'Hygienic enclosure design is feasible with the existing sheet-metal and finishing process.',
    manufacturingFeasibility: 'Feasible',
    manufacturingFeasibilityNotes:
      'SS304 fabrication and gasket fit-up can be completed within the delivery window.',
    materialAssumptions:
      'SS304 2B sheet, food-grade gasket, sealed hinge hardware and protective film packaging.',
    preliminaryBomRef: 'BOM-2026-037-A',
    engineeringEffort: 140,
    materialCost: 420000,
    manufacturingCost: 160000,
    technicalComments:
      'Technical basis accepted, but the customer deferred the order and the quotation was rejected for this cycle.',
    reviewer: 'P. Deshmukh',
    reviewAssignedOn: '2026-10-23',
    reviewedOn: '2026-10-24',
    reviewOutcome: 'Technically Accepted',
    reviewComments:
      'Hygienic design and manufacturing basis accepted. Forward to sales for customer decision.',
    customerReference: 'AL/ENQ/2026/091',
    submittedToCustomerAt: '2026-10-26',
    decisionAt: '2026-10-30',
    history: [
      seedHistory(
        'H-QT-014-01',
        '2026-10-22T10:40',
        'Quotation draft created',
        'S. Menon',
        'Quotation prepared against ENQ-2026-037.',
        'Draft',
      ),
      seedHistory(
        'H-QT-014-02',
        '2026-10-23T09:10',
        'Technical review started',
        'P. Deshmukh',
        'Hygienic enclosure basis assigned for review.',
        'Technical Review',
      ),
      seedHistory(
        'H-QT-014-03',
        '2026-10-24T14:00',
        'Technical basis accepted',
        'P. Deshmukh',
        'Enclosure design and manufacturing basis accepted.',
        'Technically Accepted',
      ),
      seedHistory(
        'H-QT-014-04',
        '2026-10-26T11:15',
        'Quotation submitted to customer',
        'S. Menon',
        'Customer reference AL/ENQ/2026/091 recorded.',
        'Customer Submitted',
      ),
      seedHistory(
        'H-QT-014-05',
        '2026-10-30T16:40',
        'Customer rejected quotation',
        'S. Menon',
        'Customer deferred the order to the next quarter; quotation rejected for this cycle.',
        'Rejected',
      ),
    ],
    createdAt: '2026-10-22T10:40',
    updatedAt: '2026-10-30T16:40',
  }),
  seedQuotation({
    id: 'QTN-2026-012',
    enquiryId: 'ENQ-2026-037',
    revision: 'B',
    status: 'Expired',
    quotationDate: '2026-10-28',
    targetDeliveryEstimate: '2027-01-15',
    productConfiguration:
      'Stainless operator enclosure — alternate revision B with revised door hardware and dispatch plan.',
    preliminarySpecifications:
      '1,100 × 700 × 350 mm SS304 enclosure with alternate hinge and gasket arrangement. IP65 sealing and food-grade finish retained.',
    designFeasibility: 'Feasible with conditions',
    designFeasibilityNotes:
      'Alternate hinge arrangement requires customer fit-up confirmation before release.',
    manufacturingFeasibility: 'Feasible',
    manufacturingFeasibilityNotes:
      'Revised hardware is available from the approved supplier.',
    materialAssumptions:
      'SS304 2B sheet, alternate food-grade gasket and hinge set, protective film packaging.',
    preliminaryBomRef: 'BOM-2026-037-B',
    engineeringEffort: 160,
    materialCost: 455000,
    manufacturingCost: 175000,
    technicalComments:
      'Alternate revision did not receive customer confirmation before validity expiry.',
    reviewer: 'P. Deshmukh',
    reviewAssignedOn: '2026-10-29',
    reviewedOn: '2026-10-30',
    reviewOutcome: 'Changes Requested',
    reviewComments:
      'Customer fit-up confirmation on the alternate hinge arrangement was not received. Revision not released.',
    customerReference: 'AL/ENQ/2026/091-R2',
    submittedToCustomerAt: '2026-11-01',
    decisionAt: '2026-11-12',
    history: [
      seedHistory(
        'H-QT-012-01',
        '2026-10-28T09:30',
        'Quotation draft created',
        'S. Menon',
        'Alternate revision B prepared against ENQ-2026-037.',
        'Draft',
      ),
      seedHistory(
        'H-QT-012-02',
        '2026-10-29T11:20',
        'Technical review started',
        'P. Deshmukh',
        'Alternate hinge and gasket arrangement assigned for review.',
        'Technical Review',
      ),
      seedHistory(
        'H-QT-012-03',
        '2026-10-30T15:10',
        'Changes requested',
        'P. Deshmukh',
        'Customer fit-up confirmation required before the alternate hinge can be released.',
        'Changes Requested',
      ),
      seedHistory(
        'H-QT-012-04',
        '2026-11-01T10:45',
        'Quotation submitted to customer',
        'S. Menon',
        'Alternate revision B submitted for customer review.',
        'Customer Submitted',
      ),
      seedHistory(
        'H-QT-012-05',
        '2026-11-12T17:00',
        'Quotation expired',
        'S. Menon',
        'Validity expired without customer confirmation.',
        'Expired',
      ),
    ],
    createdAt: '2026-10-28T09:30',
    updatedAt: '2026-11-12T17:00',
  }),
].map(hydrateQuotation);

export const QUOTATION_REVIEWS = SEED_QUOTATIONS;

export function defaultConversionDates(record) {
  const start = TODAY;
  const target = record?.targetDeliveryEstimate || addDays(TODAY, 90);
  return { start, target };
}

export { ENGINEERS };
