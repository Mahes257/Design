export const ENQUIRY_STATUSES = [
  'Draft',
  'Submitted',
  'Under Technical Review',
  'Clarification Required',
  'Ready for Quotation',
  'Quotation Prepared',
  'Closed',
];

export const ENQUIRY_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const PRODUCT_CATEGORIES = [
  'Conveyor System',
  'Hydraulic Equipment',
  'Pressure Equipment',
  'Sheet Metal Enclosure',
  'Piping / Skid',
  'Rotating Equipment',
  'Special Purpose Machine',
  'Mechanical Assembly',
];

export const SALES_CONTACTS = ['R. Kulkarni', 'A. Iyer', 'S. Menon', 'P. Deshmukh'];

export const ENGINEERING_CONTACTS = [
  'N. Joshi',
  'D. Rao',
  'P. Deshmukh',
  'R. Kulkarni',
  'A. Iyer',
];

export const DOCUMENT_CATEGORIES = [
  'Customer Drawing',
  'Technical Specification',
  'Reference Document',
  'Site / Operating Data',
  'Commercial Document',
];

export const QUANTITY_UNITS = ['Nos', 'Sets', 'kg', 'm', 'Lot'];

export const TODAY = '2026-11-16';

export const EMPTY_SPECS = {
  application: '',
  capacity: '',
  dimensions: '',
  operatingConditions: '',
  materials: '',
  standards: '',
  utilities: '',
  inspection: '',
  packaging: '',
  notes: '',
};

export const SPEC_FIELDS = [
  { key: 'application', label: 'Application / duty' },
  { key: 'capacity', label: 'Capacity / rating' },
  { key: 'dimensions', label: 'Dimensions / envelope' },
  { key: 'operatingConditions', label: 'Operating conditions' },
  { key: 'materials', label: 'Materials / finish' },
  { key: 'standards', label: 'Standards / codes' },
  { key: 'utilities', label: 'Utilities / services' },
  { key: 'inspection', label: 'Inspection / testing' },
  { key: 'packaging', label: 'Packaging / transport' },
  { key: 'notes', label: 'Engineering notes' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value) {
  if (!value) return '—';
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return String(value);
  return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`;
}

export function formatStamp(value) {
  if (!value) return '—';
  const [date, time] = String(value).split('T');
  return `${formatDate(date)}${time ? ` · ${time}` : ''}`;
}

export function formatBytes(bytes) {
  const number = Number(bytes) || 0;
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
  return `${(number / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusTone(status) {
  const tones = {
    Draft: 'gray',
    Submitted: 'blue',
    'Under Technical Review': 'purple',
    'Clarification Required': 'orange',
    'Ready for Quotation': 'green',
    'Quotation Prepared': 'green',
    Closed: 'gray',
  };
  return tones[status] || 'gray';
}

export function priorityTone(priority) {
  return { Critical: 'red', High: 'orange', Medium: 'blue', Low: 'gray' }[priority] || 'gray';
}

export function createEmptyEnquiryForm() {
  return {
    subject: '',
    customerName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    enquiryDate: TODAY,
    expectedResponseDate: '',
    targetDeliveryDate: '',
    category: PRODUCT_CATEGORIES[0],
    quantity: '',
    unit: 'Sets',
    priority: 'Medium',
    salesContact: SALES_CONTACTS[0],
    engineeringContact: ENGINEERING_CONTACTS[0],
    description: '',
    quotationRef: '',
    specs: { ...EMPTY_SPECS },
  };
}

export function nextEnquiryId(records = []) {
  const year = 2026;
  const max = records.reduce((highest, record) => {
    const match = String(record.id || '').match(/^ENQ-(\d{4})-(\d+)$/);
    if (!match) return highest;
    return Math.max(highest, Number(match[2]));
  }, 0);
  return `ENQ-${year}-${String(max + 1).padStart(3, '0')}`;
}

function history(id, at, action, by, detail, status) {
  return { id, at, action, by, detail, status };
}

function document(id, name, category, type, size, uploadedAt, uploadedBy, notes = '') {
  return { id, name, category, type, size, uploadedAt, uploadedBy, notes };
}

function clarification(id, topic, question, raisedOn, raisedBy, status, response = '', respondedBy = '', respondedOn = '') {
  return { id, topic, question, raisedOn, raisedBy, status, response, respondedBy, respondedOn };
}

const SEED_ENQUIRIES = [
  {
    id: 'ENQ-2026-043',
    subject: 'Automated conveyor drive for warehouse line',
    customerName: 'Godrej Material Handling',
    contactName: 'Sandeep Kulkarni',
    contactEmail: 'sandeep.kulkarni@godrej.example',
    contactPhone: '+91 98200 41218',
    enquiryDate: '2026-11-10',
    expectedResponseDate: '2026-11-18',
    targetDeliveryDate: '2027-01-20',
    category: 'Conveyor System',
    quantity: '2',
    unit: 'Sets',
    priority: 'High',
    status: 'Ready for Quotation',
    salesContact: 'R. Kulkarni',
    engineeringContact: 'N. Joshi',
    description:
      'Customer requires two automated conveyor drives with variable frequency control for a new warehouse sortation line. Drives must integrate with the existing control architecture and be suitable for 24/7 duty.',
    quotationRef: '',
    specs: {
      application: 'Warehouse sortation line · 24/7 continuous duty',
      capacity: '45 t/h throughput · 1.5 m/s belt speed',
      dimensions: 'Drive envelope 2,400 × 1,100 × 1,450 mm per unit',
      operatingConditions: '0–45 °C ambient · dusty environment · indoor installation',
      materials: 'Fabricated MS frame, PU powder coat; drive components per supplier standard',
      standards: 'IS 800 general steelwork; IEC 60034 motors; customer electrical specification',
      utilities: '415 V / 50 Hz / 3 phase · clean compressed air at 6 bar',
      inspection: 'Factory acceptance test with no-load and load simulation',
      packaging: 'Seaworthy wooden crate; each drive separately protected',
      notes: 'Customer requested compatibility with existing Siemens PLC and VFD network.',
    },
    documents: [
      document('DOC-ENQ-043-01', 'GD-MH-Conveyor-Line-Layout.pdf', 'Customer Drawing', 'application/pdf', 1843200, '2026-11-10T10:20', 'Sandeep Kulkarni', 'Customer layout marked for drive locations.'),
      document('DOC-ENQ-043-02', 'Drive-Duty-Requirement.xlsx', 'Technical Specification', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 48320, '2026-11-10T10:22', 'Sandeep Kulkarni'),
    ],
    clarifications: [
      clarification('CL-ENQ-043-01', 'VFD network protocol', 'Confirm the required fieldbus protocol and preferred VFD make.', '2026-11-11', 'N. Joshi', 'Responded', 'Customer confirmed PROFINET and approved the current Siemens drive standard.', 'R. Kulkarni', '2026-11-12'),
    ],
    history: [
      history('H-043-01', '2026-11-10T10:25', 'Enquiry created', 'R. Kulkarni', 'Captured from customer enquiry pack.', 'Draft'),
      history('H-043-02', '2026-11-10T11:10', 'Enquiry submitted', 'R. Kulkarni', 'Forwarded to engineering for technical review.', 'Submitted'),
      history('H-043-03', '2026-11-11T09:15', 'Technical review started', 'N. Joshi', 'Requirement and drive layout reviewed.', 'Under Technical Review'),
      history('H-043-04', '2026-11-11T14:30', 'Clarification raised', 'N. Joshi', 'VFD network protocol and approved drive standard.', 'Clarification Required'),
      history('H-043-05', '2026-11-12T16:05', 'Clarification responded', 'R. Kulkarni', 'PROFINET confirmed; customer standard accepted.', 'Under Technical Review'),
      history('H-043-06', '2026-11-13T09:40', 'Ready for quotation', 'N. Joshi', 'Technical requirements complete; no open clarifications.', 'Ready for Quotation'),
    ],
    createdAt: '2026-11-10T10:25',
    updatedAt: '2026-11-13T09:40',
  },
  {
    id: 'ENQ-2026-042',
    subject: '200T hydraulic press frame',
    customerName: 'Tata Projects',
    contactName: 'Ananya Iyer',
    contactEmail: 'ananya.iyer@tataprojects.example',
    contactPhone: '+91 98330 22190',
    enquiryDate: '2026-11-07',
    expectedResponseDate: '2026-11-21',
    targetDeliveryDate: '2027-02-15',
    category: 'Hydraulic Equipment',
    quantity: '1',
    unit: 'Sets',
    priority: 'Critical',
    status: 'Under Technical Review',
    salesContact: 'A. Iyer',
    engineeringContact: 'D. Rao',
    description:
      'Design and supply a 200-tonne hydraulic press frame for a precast concrete plant. The frame must support the customer cylinder package and allow a future 250-tonne upgrade without replacing the main structure.',
    quotationRef: '',
    specs: {
      application: 'Precast concrete pressing station',
      capacity: '200 t working force; 250 t future upgrade capability',
      dimensions: '4,200 × 2,200 × 3,600 mm overall frame envelope',
      operatingConditions: 'Indoor plant · 5–50 °C · two shifts per day',
      materials: 'IS2062 E350 fabricated plate; machined load pads',
      standards: 'IS 800, IS 9595 and customer structural design basis',
      utilities: 'Customer hydraulic power unit; 415 V control supply',
      inspection: 'Weld inspection, dimensional check and load test witness',
      packaging: 'Knock-down shipping with match-marked members',
      notes: 'Cylinder interface drawing is awaited from the customer.',
    },
    documents: [
      document('DOC-ENQ-042-01', '200T-Press-General-Arrangement.pdf', 'Customer Drawing', 'application/pdf', 2560000, '2026-11-07T12:40', 'Ananya Iyer'),
      document('DOC-ENQ-042-02', 'Loading-and-Duty-Basis.docx', 'Technical Specification', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 78600, '2026-11-07T12:42', 'Ananya Iyer'),
    ],
    clarifications: [],
    history: [
      history('H-042-01', '2026-11-07T12:45', 'Enquiry created', 'A. Iyer', 'Received from Tata Projects technical team.', 'Draft'),
      history('H-042-02', '2026-11-07T15:20', 'Enquiry submitted', 'A. Iyer', 'Sent for structural and manufacturing review.', 'Submitted'),
      history('H-042-03', '2026-11-08T10:10', 'Technical review started', 'D. Rao', 'Structural review in progress; cylinder interface under review.', 'Under Technical Review'),
    ],
    createdAt: '2026-11-07T12:45',
    updatedAt: '2026-11-08T10:10',
  },
  {
    id: 'ENQ-2026-041',
    subject: 'IP54 control panel enclosure',
    customerName: 'Siemens Energy',
    contactName: 'Meera Menon',
    contactEmail: 'meera.menon@siemens-energy.example',
    contactPhone: '+91 98450 78120',
    enquiryDate: '2026-11-05',
    expectedResponseDate: '2026-11-19',
    targetDeliveryDate: '2026-12-28',
    category: 'Sheet Metal Enclosure',
    quantity: '12',
    unit: 'Nos',
    priority: 'High',
    status: 'Clarification Required',
    salesContact: 'S. Menon',
    engineeringContact: 'P. Deshmukh',
    description:
      'Supply twelve wall-mounted IP54 control panel enclosures with cable entry glands and removable mounting plates. Finish to match the existing plant equipment colour standard.',
    quotationRef: '',
    specs: {
      application: 'Wall-mounted electrical control enclosure',
      capacity: 'Not applicable · structural and environmental enclosure',
      dimensions: '800 × 600 × 300 mm per enclosure',
      operatingConditions: 'Indoor, 0–45 °C, humid environment; IP54 required',
      materials: '2 mm CRCA sheet steel with powder-coated finish',
      standards: 'IEC 60529 IP54; customer sheet-metal specification',
      utilities: 'Not applicable',
      inspection: 'Dimensional inspection and IP54 gasket fit check',
      packaging: 'Individual protective wrap with edge protection',
      notes: 'Panel cut-out drawing revision B is attached.',
    },
    documents: [
      document('DOC-ENQ-041-01', 'Panel-Cutout-Rev-B.pdf', 'Customer Drawing', 'application/pdf', 1240000, '2026-11-05T09:25', 'Meera Menon'),
    ],
    clarifications: [
      clarification('CL-ENQ-041-01', 'Paint shade confirmation', 'Confirm the RAL paint shade and whether an anti-corrosion primer is required.', '2026-11-09', 'P. Deshmukh', 'Open'),
    ],
    history: [
      history('H-041-01', '2026-11-05T09:30', 'Enquiry created', 'S. Menon', 'Enquiry received with panel cut-out drawing.', 'Draft'),
      history('H-041-02', '2026-11-05T10:15', 'Enquiry submitted', 'S. Menon', 'Released to design for technical review.', 'Submitted'),
      history('H-041-03', '2026-11-06T09:45', 'Technical review started', 'P. Deshmukh', 'Enclosure and finish review opened.', 'Under Technical Review'),
      history('H-041-04', '2026-11-09T11:30', 'Clarification raised', 'P. Deshmukh', 'Paint shade and primer requirement require customer confirmation.', 'Clarification Required'),
    ],
    createdAt: '2026-11-05T09:30',
    updatedAt: '2026-11-09T11:30',
  },
  {
    id: 'ENQ-2026-040',
    subject: 'Utility skid piping package',
    customerName: 'Thermax',
    contactName: 'Rohit Deshmukh',
    contactEmail: 'rohit.deshmukh@thermax.example',
    contactPhone: '+91 98220 66714',
    enquiryDate: '2026-10-30',
    expectedResponseDate: '2026-11-13',
    targetDeliveryDate: '2027-01-10',
    category: 'Piping / Skid',
    quantity: '1',
    unit: 'Lot',
    priority: 'Medium',
    status: 'Quotation Prepared',
    salesContact: 'P. Deshmukh',
    engineeringContact: 'N. Joshi',
    description:
      'Fabricate and supply a utility skid piping package including carbon steel and stainless steel lines, supports and valves. The package will be integrated with the customer utility skid at site.',
    quotationRef: 'QTN-2026-018',
    specs: {
      application: 'Utility distribution skid for process plant',
      capacity: 'Cooling water 45 m³/h; instrument air 120 Nm³/h',
      dimensions: 'Skid 6,200 × 2,400 × 2,800 mm (bounded by customer interface)',
      operatingConditions: 'Outdoor canopy; 0–50 °C; monsoon exposure',
      materials: 'ASTM A106 Gr B carbon steel; ASTM A312 TP316L stainless steel',
      standards: 'ASME B31.3; customer piping specification',
      utilities: 'Cooling water, instrument air and nitrogen interfaces',
      inspection: 'Hydrotest, dye penetrant and dimensional survey',
      packaging: 'Skid-mounted, sealed flange protection, lifting points marked',
      notes: 'Quotation issued with alternate valve make note.',
    },
    documents: [
      document('DOC-ENQ-040-01', 'Utility-Skid-Piping-Rev-1.pdf', 'Customer Drawing', 'application/pdf', 3120000, '2026-10-30T14:10', 'Rohit Deshmukh'),
      document('DOC-ENQ-040-02', 'Piping-Material-Specification.pdf', 'Technical Specification', 'application/pdf', 880000, '2026-10-30T14:12', 'Rohit Deshmukh'),
    ],
    clarifications: [],
    history: [
      history('H-040-01', '2026-10-30T14:20', 'Enquiry created', 'P. Deshmukh', 'Piping package enquiry received.', 'Draft'),
      history('H-040-02', '2026-10-31T09:10', 'Enquiry submitted', 'P. Deshmukh', 'Sent to engineering for review.', 'Submitted'),
      history('H-040-03', '2026-11-01T10:05', 'Technical review started', 'N. Joshi', 'Piping and material review started.', 'Under Technical Review'),
      history('H-040-04', '2026-11-06T16:20', 'Ready for quotation', 'N. Joshi', 'Technical basis accepted and released to sales.', 'Ready for Quotation'),
      history('H-040-05', '2026-11-10T11:05', 'Quotation prepared', 'P. Deshmukh', 'QTN-2026-018 issued against this enquiry.', 'Quotation Prepared'),
    ],
    createdAt: '2026-10-30T14:20',
    updatedAt: '2026-11-10T11:05',
  },
  {
    id: 'ENQ-2026-039',
    subject: 'Cooling tower fan hub retrofit',
    customerName: 'Kirloskar Oil Engines',
    contactName: 'Vikram Joshi',
    contactEmail: 'vikram.joshi@kirloskar.example',
    contactPhone: '+91 98230 44061',
    enquiryDate: '2026-11-12',
    expectedResponseDate: '2026-11-24',
    targetDeliveryDate: '2027-01-30',
    category: 'Rotating Equipment',
    quantity: '4',
    unit: 'Nos',
    priority: 'Medium',
    status: 'Submitted',
    salesContact: 'R. Kulkarni',
    engineeringContact: 'A. Iyer',
    description:
      'Reverse-engineer and manufacture replacement fan hubs for four cooling towers. Customer will provide an existing hub for dimensional reference at kick-off.',
    quotationRef: '',
    specs: {
      application: 'Cooling tower fan hub retrofit',
      capacity: '2.2 m fan diameter · 147 rpm operating speed',
      dimensions: 'Hub interface to be measured from customer sample',
      operatingConditions: 'Outdoor, humid, continuous operation',
      materials: 'Cast iron hub with machined steel shaft interface',
      standards: 'Customer dimensional and balance requirements',
      utilities: 'Not applicable',
      inspection: 'Dimensional report and dynamic balance certificate',
      packaging: 'Wooden crate with shaft protection',
      notes: 'Customer sample hub required before detailed design.',
    },
    documents: [],
    clarifications: [],
    history: [
      history('H-039-01', '2026-11-12T15:40', 'Enquiry created', 'R. Kulkarni', 'Retrofit requirement captured.', 'Draft'),
      history('H-039-02', '2026-11-12T16:15', 'Enquiry submitted', 'R. Kulkarni', 'Submitted for engineering review.', 'Submitted'),
    ],
    createdAt: '2026-11-12T15:40',
    updatedAt: '2026-11-12T16:15',
  },
  {
    id: 'ENQ-2026-038',
    subject: 'Motor mount bracket for test rig',
    customerName: 'Cummins India',
    contactName: 'Prashant Kale',
    contactEmail: 'prashant.kale@cummins.example',
    contactPhone: '+91 98500 21034',
    enquiryDate: '2026-11-14',
    expectedResponseDate: '2026-11-25',
    targetDeliveryDate: '2026-12-20',
    category: 'Mechanical Assembly',
    quantity: '6',
    unit: 'Nos',
    priority: 'Low',
    status: 'Draft',
    salesContact: 'A. Iyer',
    engineeringContact: 'D. Rao',
    description: '',
    quotationRef: '',
    specs: {
      ...EMPTY_SPECS,
      application: 'Motor mounting for internal test rig',
      dimensions: 'To be finalised with customer sample',
    },
    documents: [],
    clarifications: [],
    history: [
      history('H-038-01', '2026-11-14T09:20', 'Enquiry created', 'A. Iyer', 'Initial enquiry details captured.', 'Draft'),
    ],
    createdAt: '2026-11-14T09:20',
    updatedAt: '2026-11-14T09:20',
  },
  {
    id: 'ENQ-2026-037',
    subject: 'Stainless steel operator enclosure',
    customerName: 'Alfa Laval India',
    contactName: 'Nikhil Sathe',
    contactEmail: 'nikhil.sathe@alfalaval.example',
    contactPhone: '+91 98220 77518',
    enquiryDate: '2026-10-18',
    expectedResponseDate: '2026-10-28',
    targetDeliveryDate: '2026-12-05',
    category: 'Sheet Metal Enclosure',
    quantity: '2',
    unit: 'Nos',
    priority: 'Medium',
    status: 'Closed',
    salesContact: 'S. Menon',
    engineeringContact: 'P. Deshmukh',
    description:
      'Fabricate two stainless steel operator enclosures for a food-processing line, including hinged doors and hygienic sealed edges.',
    quotationRef: 'QTN-2026-014',
    specs: {
      application: 'Hygienic operator interface enclosure',
      capacity: 'Not applicable',
      dimensions: '1,100 × 700 × 350 mm per enclosure',
      operatingConditions: 'Wash-down area, 0–40 °C, humidity up to 95%',
      materials: 'SS304 2B finish, food-grade gasket',
      standards: 'Customer hygienic design standard; IP65',
      utilities: 'Not applicable',
      inspection: 'Dimensional, finish and gasket sealing check',
      packaging: 'Individually wrapped with protective film',
      notes: 'Closed after quotation; customer deferred order to next quarter.',
    },
    documents: [
      document('DOC-ENQ-037-01', 'Operator-Enclosure-Reference.pdf', 'Customer Drawing', 'application/pdf', 960000, '2026-10-18T11:00', 'Nikhil Sathe'),
    ],
    clarifications: [],
    history: [
      history('H-037-01', '2026-10-18T11:05', 'Enquiry created', 'S. Menon', 'Enquiry received from Alfa Laval.', 'Draft'),
      history('H-037-02', '2026-10-19T10:30', 'Enquiry submitted', 'S. Menon', 'Submitted for technical review.', 'Submitted'),
      history('H-037-03', '2026-10-21T15:20', 'Technical review started', 'P. Deshmukh', 'Hygienic enclosure requirements reviewed.', 'Under Technical Review'),
      history('H-037-04', '2026-10-23T09:50', 'Ready for quotation', 'P. Deshmukh', 'Technical requirements accepted.', 'Ready for Quotation'),
      history('H-037-05', '2026-10-27T14:10', 'Quotation prepared', 'S. Menon', 'QTN-2026-014 issued.', 'Quotation Prepared'),
      history('H-037-06', '2026-11-03T17:30', 'Enquiry closed', 'S. Menon', 'Customer deferred the order; enquiry closed for this cycle.', 'Closed'),
    ],
    createdAt: '2026-10-18T11:05',
    updatedAt: '2026-11-03T17:30',
  },
];

export const CUSTOMER_ENQUIRIES = SEED_ENQUIRIES;

export function enquiryStats(records = []) {
  const count = (status) => records.filter((record) => record.status === status).length;
  return {
    total: records.length,
    underTechnicalReview: count('Under Technical Review'),
    clarificationRequired: count('Clarification Required'),
    readyForQuotation: count('Ready for Quotation'),
    quotationPrepared: count('Quotation Prepared'),
    draft: count('Draft'),
    submitted: count('Submitted'),
    closed: count('Closed'),
  };
}

export function quotationReadiness(record) {
  const openClarifications = (record?.clarifications || []).filter(
    (item) => item.status === 'Open',
  ).length;

  const checks = [
    { key: 'customer', label: 'Customer and contact identified', pass: Boolean(record?.customerName?.trim() && (record?.contactName?.trim() || record?.contactEmail?.trim() || record?.contactPhone?.trim())) },
    { key: 'description', label: 'Requirement description captured', pass: Boolean(record?.description?.trim()) },
    { key: 'quantity', label: 'Expected quantity recorded', pass: Number(record?.quantity) > 0 },
    { key: 'delivery', label: 'Target delivery date recorded', pass: Boolean(record?.targetDeliveryDate) },
    { key: 'dimensions', label: 'Dimensions / envelope defined', pass: Boolean(record?.specs?.dimensions?.trim()) },
    { key: 'conditions', label: 'Operating conditions defined', pass: Boolean(record?.specs?.operatingConditions?.trim()) },
    { key: 'clarifications', label: 'No open technical clarifications', pass: openClarifications === 0 },
  ];

  const blockers = checks.filter((check) => !check.pass).map((check) => check.label);

  return {
    ready: blockers.length === 0,
    checks,
    blockers,
    openClarifications,
  };
}

export function nextStatusActions(record) {
  if (!record) return [];

  const gate = quotationReadiness(record);
  switch (record.status) {
    case 'Draft':
      return [{ value: 'Submitted', label: 'Submit Enquiry', description: 'Send the captured enquiry for technical review.', disabled: false }];
    case 'Submitted':
      return [{ value: 'Under Technical Review', label: 'Start Technical Review', description: 'Accept the enquiry into the engineering review queue.', disabled: false }];
    case 'Under Technical Review':
      return [
        {
          value: 'Ready for Quotation',
          label: 'Ready for Quotation',
          description: gate.ready
            ? 'The technical basis is complete and can be handed to sales for quotation.'
            : 'Complete the readiness checks and close clarifications before releasing to quotation.',
          disabled: !gate.ready,
          reason: gate.blockers.join(' · '),
        },
      ];
    case 'Clarification Required':
      return [];
    case 'Ready for Quotation':
      return [
        { value: 'Quotation Prepared', label: 'Mark Quotation Prepared', description: 'Record the quotation reference issued against this enquiry.', disabled: false },
        { value: 'Closed', label: 'Close Enquiry', description: 'Close without proceeding to quotation.', disabled: false, danger: true },
      ];
    case 'Quotation Prepared':
      return [
        { value: 'Closed', label: 'Close Enquiry', description: 'Close after the quotation has been issued.', disabled: false, danger: true },
      ];
    default:
      return [];
  }
}

export function transitionError(record, nextStatus, { quotationRef } = {}) {
  if (!record) return 'Enquiry not found.';
  if (record.status === nextStatus) return 'The enquiry is already in this status.';
  const actions = nextStatusActions(record);
  const action = actions.find((item) => item.value === nextStatus);
  if (!action) return `${record.status} cannot move directly to ${nextStatus}.`;
  if (action.disabled) {
    return action.reason || 'This transition is not available yet.';
  }
  if (nextStatus === 'Ready for Quotation') {
    const gate = quotationReadiness(record);
    if (!gate.ready) return `Quotation readiness is incomplete: ${gate.blockers.join(', ')}.`;
  }
  if (nextStatus === 'Quotation Prepared' && !(quotationRef || record.quotationRef || '').trim()) {
    return 'A quotation reference is required before the enquiry can be marked Quotation Prepared.';
  }
  return '';
}

export function hydrateEnquiry(record) {
  if (!record?.id) return null;
  return {
    ...record,
    specs: { ...EMPTY_SPECS, ...(record.specs || {}) },
    documents: Array.isArray(record.documents) ? record.documents : [],
    clarifications: Array.isArray(record.clarifications) ? record.clarifications : [],
    history: Array.isArray(record.history) ? record.history : [],
  };
}
