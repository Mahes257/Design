/**
 * Local mock data for Module 11 — Purchase & Production Transfer.
 *
 * Every transfer, handover, requisition, acknowledgement and CPP / CPR / TV /
 * CPO record here is a frontend demonstration record. Nothing is sent to the
 * ERP Purchase or Production modules and no procurement or manufacturing
 * transaction is created.
 *
 * Approved deliverable fixtures link to Module 10 review/release references
 * where one exists. BOM/package releases without a live Module 10 record use
 * clearly identified reference fixtures from the design release register.
 */
import { PROJECTS, TODAY, addDays, formatDate } from './projectData';

export { PROJECTS, TODAY, addDays, formatDate };

export const DESTINATIONS = ['Purchase', 'Production'];

export const TRANSFER_STATUSES = [
  'Draft',
  'Validation Pending',
  'Invalid',
  'Ready for Transfer',
  'Awaiting Handover',
  'Awaiting Acknowledgement',
  'Partially Acknowledged',
  'Acknowledged',
  'Completed (Mock)',
  'On Hold',
  'Cancelled',
  'Failed',
];

export const VALIDATION_RESULTS = ['Valid', 'Invalid', 'Warning', 'Not Applicable'];

export const PURCHASE_STATUSES = [
  'Not Prepared',
  'Draft',
  'Ready for Handover',
  'Handover Recorded',
  'Acknowledgement Pending',
  'Acknowledged',
  'Requisition Raised (Mock)',
  'In Purchase Processing (Mock)',
  'Partially Processed (Mock)',
  'Completed (Mock)',
  'On Hold',
  'Cancelled',
];

export const PRODUCTION_STATUSES = [
  'Not Prepared',
  'Draft',
  'Ready for Handover',
  'Handover Recorded',
  'Acknowledgement Pending',
  'Acknowledged',
  'In Production Processing (Mock)',
  'Completed (Mock)',
  'On Hold',
  'Cancelled',
];

export const ACK_STATUSES = ['Acknowledged', 'Acknowledged with Remarks', 'Rejected', 'On Hold'];
export const WORKFLOW_STAGES = ['CPP', 'CPR', 'TV', 'CPO'];
export const WORKFLOW_STATUSES = ['Not Started', 'Draft', 'Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
export const READINESS_STATUSES = ['Not Started', 'In Progress', 'Ready', 'Blocked', 'Not Applicable'];
export const PACKAGE_STATUSES = ['Draft', 'In Progress', 'Validated', 'Ready for Handover', 'Blocked'];
export const TRANSFER_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const TRANSFER_PEOPLE = ['N. Joshi', 'R. Kulkarni', 'A. Iyer', 'S. Menon', 'V. Sharma', 'P. Deshmukh', 'K. Pillai'];
export const PURCHASE_OWNERS = ['Purchase — Sourcing cell', 'Purchase — Procurement desk', 'Purchase — Vendor development'];
export const PRODUCTION_OWNERS = ['Production — Assembly bay', 'Production — Fabrication shop', 'Production — Machining cell'];

const TONES = {
  Draft: 'gray',
  'Validation Pending': 'orange',
  Invalid: 'red',
  'Ready for Transfer': 'blue',
  'Awaiting Handover': 'orange',
  'Awaiting Acknowledgement': 'orange',
  'Partially Acknowledged': 'purple',
  Acknowledged: 'green',
  'Completed (Mock)': 'green',
  'On Hold': 'orange',
  Cancelled: 'gray',
  Failed: 'red',
  Valid: 'green',
  Warning: 'orange',
  'Not Applicable': 'gray',
  'Not Prepared': 'gray',
  'Ready for Handover': 'blue',
  'Handover Recorded': 'blue',
  'Acknowledgement Pending': 'orange',
  'Requisition Raised (Mock)': 'purple',
  'In Purchase Processing (Mock)': 'blue',
  'Partially Processed (Mock)': 'purple',
  'In Production Processing (Mock)': 'blue',
  'Not Started': 'gray',
  'In Progress': 'blue',
  Pending: 'orange',
  Ready: 'green',
  Blocked: 'red',
  Completed: 'green',
  'Acknowledged with Remarks': 'green',
  Rejected: 'red',
  'Ready for Transfer': 'blue',
  'In Progress': 'blue',
};

export function transferStatusTone(status) {
  return TONES[status] || 'gray';
}

function liveProjects() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('md-project-state-v1') : null;
    const rows = raw ? JSON.parse(raw)?.projects : null;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function projectExists(projectId) {
  return PROJECTS.some((row) => row.id === projectId) || liveProjects().some((row) => row.id === projectId);
}

export function projectName(projectId) {
  return PROJECTS.find((row) => row.id === projectId)?.name
    || liveProjects().find((row) => row.id === projectId)?.name
    || projectId;
}

export function projectLabel(projectId) {
  return `${projectId} · ${projectName(projectId)}`;
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function destinationLabel(destinations = []) {
  if (destinations.length === 2) return 'Both';
  return destinations[0] || '—';
}

export function isDestinationSelected(record, destination) {
  return Boolean(record?.destinations?.includes(destination));
}

const attachment = (name, type, size, assetPath = '') => ({ name, type, size, assetPath });

const bomItems041 = [
  { id: 'BI-001-01', partNumber: 'MEC-041-001', description: 'Gearbox housing — cast iron FG260', qty: 1, unit: 'nos', category: 'Make', materialReference: 'MAT-CS-002 · FG260', drawingReference: 'DRG-MEC-041-002 Rev B', purchaseNotes: 'Casting supplied to the released machining drawing.' },
  { id: 'BI-001-02', partNumber: 'MEC-041-002', description: 'Input shaft — EN19', qty: 1, unit: 'nos', category: 'Make', materialReference: 'MAT-AS-001 · EN19', drawingReference: 'DRG-MEC-031-051 Rev B', purchaseNotes: 'Bar stock allowance included in the material requirement.' },
  { id: 'BI-001-03', partNumber: 'MEC-041-003', description: 'Gear pair — 20MnCr5', qty: 1, unit: 'nos', category: 'Make', materialReference: 'MAT-AS-002 · 20MnCr5', drawingReference: 'DRG-MEC-041-001 Rev C', purchaseNotes: 'Manufactured pair; heat treatment note on drawing.' },
  { id: 'BI-001-04', partNumber: 'MEC-041-004', description: 'Bearing set 32217', qty: 2, unit: 'set', category: 'Buy', materialReference: 'MAT-BR-001 · 100Cr6', drawingReference: 'DRG-MEC-041-001 Rev C', purchaseNotes: 'Approved make only; supplier data sheet required.' },
  { id: 'BI-001-05', partNumber: 'MEC-041-007', description: 'Conveyor belt 1200 EP', qty: 44.1, unit: 'm', category: 'Buy', materialReference: 'EP fabric / rubber', drawingReference: 'DRG-MEC-041-001 Rev C', purchaseNotes: '5% splicing allowance included in BOM quantity.' },
  { id: 'BI-001-06', partNumber: 'PUR-041-011', description: 'Gear motor 45 kW', qty: 1, unit: 'nos', category: 'Buy', materialReference: 'Supplier catalogue reference', drawingReference: 'DRG-MEC-041-001 Rev C', purchaseNotes: 'Flange-mounted, 1,450 rpm; approved equivalent permitted.' },
];

const materials041 = [
  { id: 'MREQ-2026-001', materialCode: 'MAT-CS-002', description: 'Cast iron FG260 casting', specification: 'Grey cast iron, stress relieved', qty: 128, unit: 'kg', requiredDate: '2026-12-08', supplier: 'Approved casting vendor — mock reference', remarks: 'Housing casting with machining allowance.' },
  { id: 'MREQ-2026-002', materialCode: 'MAT-AS-001', description: 'EN19 round bar', specification: 'Quenched and tempered, Ø90 mm', qty: 26, unit: 'kg', requiredDate: '2026-12-05', supplier: 'Approved steel stockist — mock reference', remarks: 'Shaft blank allowance.' },
  { id: 'MREQ-2026-003', materialCode: 'MAT-AS-002', description: '20MnCr5 forged bar', specification: 'Case hardening grade, Ø75 mm', qty: 48, unit: 'kg', requiredDate: '2026-12-10', supplier: 'Approved forging vendor — mock reference', remarks: 'Gear pair material.' },
];

const bomItems038 = [
  { id: 'BI-002-01', partNumber: 'FAB-038-001', description: 'Conveyor base frame — weldment', qty: 1, unit: 'nos', category: 'Make', materialReference: 'MAT-CS-001 · IS 2062 E250 BR', drawingReference: 'DRG-FAB-038-001 Rev B', purchaseNotes: 'Fabrication package controlled by Production.' },
  { id: 'BI-002-04', partNumber: 'PUR-038-021', description: 'Anchor bolt set M24', qty: 32, unit: 'set', category: 'Buy', materialReference: 'IS 1367', drawingReference: 'DRG-FAB-038-001 Rev B', purchaseNotes: 'Galvanised anchor bolts with nuts and washers.' },
];

const materials038 = [
  { id: 'MREQ-2026-004', materialCode: 'MAT-CS-001', description: 'Structural steel sections and plate', specification: 'IS 2062 E250 BR', qty: 640, unit: 'kg', requiredDate: '2026-12-01', supplier: 'Approved steel stockist — mock reference', remarks: 'Frame members, gussets and base plates.' },
  { id: 'MREQ-2026-005', materialCode: 'MAT-CS-001', description: 'Base plate 12 mm', specification: 'IS 2062 E250 BR', qty: 86, unit: 'kg', requiredDate: '2026-12-01', supplier: 'Approved steel stockist — mock reference', remarks: 'Eight foundation plates.' },
];

const bomItems029 = [
  { id: 'BI-006-01', partNumber: 'MEC-041-006', description: 'Motor mount bracket', qty: 1, unit: 'nos', category: 'Make', materialReference: 'MAT-AL-001 · LM6', drawingReference: 'DRG-MEC-029-061 Rev A', purchaseNotes: 'Machined bracket; fixture reference in process plan.' },
  { id: 'BI-006-02', partNumber: 'PUR-029-061', description: 'Mounting bolt M16×60', qty: 8, unit: 'nos', category: 'Buy', materialReference: 'Grade 8.8', drawingReference: 'DRG-MEC-029-061 Rev A', purchaseNotes: 'Bolt with washer, zinc plated.' },
];

const source = (config) => ({
  sourceReferenceNote: 'Reference fixture from the controlled design release register.',
  attachments: [],
  bomItems: [],
  materials: [],
  ...config,
});

export const SOURCE_DELIVERABLES = [
  source({
    id: 'SRC-2026-001',
    projectId: 'PRJ-2026-041',
    deliverableType: 'BOM',
    deliverableNumber: 'BOM-2026-001',
    deliverableName: 'Conveyor drive assembly BOM',
    revision: 'C',
    reviewId: 'REV-2026-101',
    releaseId: 'REL-BOM-2026-001',
    releaseDate: '2026-11-03',
    sourceModule: 'Module 08 / Module 10 release register',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: false,
    assembly: 'ASM-2026-001 · Conveyor drive assembly',
    bomRevision: 'C',
    totalItems: 6,
    buyItems: 3,
    makeItems: 3,
    bomItems: bomItems041,
    materials: materials041,
    attachments: [attachment('BOM-2026-001_RevC.xlsx', 'XLSX', 144_000), attachment('BOM-2026-001_Purchased-List.pdf', 'PDF', 210_000)],
  }),
  source({
    id: 'SRC-2026-002',
    projectId: 'PRJ-2026-038',
    deliverableType: 'BOM',
    deliverableNumber: 'BOM-2026-002',
    deliverableName: 'Conveyor frame assembly BOM',
    revision: 'B',
    reviewId: 'REV-2026-104',
    releaseId: 'REL-BOM-2026-002',
    releaseDate: '2026-10-30',
    sourceModule: 'Module 08 / Module 10 release register',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: false,
    assembly: 'ASM-2026-005 · Conveyor base frame',
    bomRevision: 'B',
    totalItems: 4,
    buyItems: 1,
    makeItems: 3,
    bomItems: bomItems038,
    materials: materials038,
    attachments: [attachment('BOM-2026-002_RevB.xlsx', 'XLSX', 128_000)],
  }),
  source({
    id: 'SRC-2026-003',
    projectId: 'PRJ-2026-038',
    deliverableType: 'Drawing',
    deliverableNumber: 'DRG-FAB-038-001',
    deliverableName: 'Conveyor base frame — fabrication drawing',
    revision: 'B',
    reviewId: 'REV-2026-008',
    releaseId: 'REL-REV-2026-001',
    releaseDate: '2026-10-28',
    sourceModule: 'Module 10 — Design Review & Approval',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: true,
    drawingType: 'Fabrication Drawing',
    cadFileId: 'CAD-2026-004',
    bomNumber: 'BOM-2026-002',
    bomRevision: 'B',
    manufacturingPackageId: 'MFG-2026-002',
    packageRevision: 'B',
    purchaseNote: 'Procurement of anchor bolts and steel stock only.',
    attachments: [attachment('DRG-FAB-038-001_RevB.svg', 'SVG', 3_371, '/cad-samples/frame-fabrication.svg')],
    bomItems: bomItems038,
    materials: materials038,
  }),
  source({
    id: 'SRC-2026-004',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Drawing',
    deliverableNumber: 'DRG-MEC-041-002',
    deliverableName: 'Gearbox housing — component drawing',
    revision: 'B',
    reviewId: 'REV-2026-010',
    releaseId: 'REL-REV-2026-002',
    releaseDate: '2026-10-21',
    sourceModule: 'Module 10 — Design Review & Approval',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: true,
    drawingType: 'Component Drawing',
    cadFileId: 'CAD-2026-003',
    bomNumber: 'BOM-2026-001',
    bomRevision: 'C',
    manufacturingPackageId: 'MFG-2026-003',
    packageRevision: 'A',
    purchaseNote: 'Casting and bought-out bearing set per approved BOM Rev C.',
    attachments: [attachment('DRG-MEC-041-002_RevB.svg', 'SVG', 5_946, '/cad-samples/conveyor-drive-ga.svg')],
    bomItems: bomItems041,
    materials: materials041,
  }),
  source({
    id: 'SRC-2026-005',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Drawing',
    deliverableNumber: 'DRG-MEC-041-001',
    deliverableName: 'Conveyor drive assembly — general arrangement',
    revision: 'C',
    reviewId: 'REV-2026-001',
    releaseId: 'REL-REV-2026-003',
    releaseDate: '2026-11-12',
    sourceModule: 'Module 10 — Design Review & Approval',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: true,
    drawingType: 'General Arrangement Drawing',
    cadFileId: 'CAD-2026-001',
    bomNumber: 'BOM-2026-001',
    bomRevision: 'C',
    manufacturingPackageId: 'MFG-2026-001',
    packageRevision: 'A',
    purchaseNote: 'Only purchased drive components listed in BOM Rev C.',
    attachments: [attachment('DRG-MEC-041-001_RevC.svg', 'SVG', 5_946, '/cad-samples/conveyor-drive-ga.svg')],
    bomItems: bomItems041,
    materials: materials041,
  }),
  source({
    id: 'SRC-2026-006',
    projectId: 'PRJ-2026-033',
    deliverableType: 'Drawing',
    deliverableNumber: 'DRG-PIP-033-001',
    deliverableName: 'Utility skid piping — general arrangement',
    revision: 'A',
    reviewId: 'REV-2026-102',
    releaseId: 'REL-REV-2026-004',
    releaseDate: '2026-11-06',
    sourceModule: 'Module 09 / Module 10 release register',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: true,
    drawingType: 'Piping Drawing',
    cadFileId: 'CAD-2026-007',
    bomNumber: 'BOM-2026-004',
    bomRevision: 'A',
    manufacturingPackageId: 'MFG-2026-004',
    packageRevision: 'A',
    purchaseNote: 'Pipe, valves, flanges and gasket material only.',
    attachments: [attachment('DRG-PIP-033-001_RevA.pdf', 'PDF', 1_632, '/cad-samples/utility-skid-ga.pdf')],
    bomItems: [
      { id: 'BI-004-01', partNumber: 'PIP-033-001', description: 'Pipe spool DN50', qty: 6, unit: 'nos', category: 'Make', materialReference: 'MAT-PI-001 · CS A106 Gr B', drawingReference: 'DRG-PIP-033-001 Rev A', purchaseNotes: 'Pipe stock for six spools.' },
      { id: 'BI-004-03', partNumber: 'PUR-033-041', description: 'Gate valve DN50', qty: 2, unit: 'nos', category: 'Buy', materialReference: 'CS ASTM A216 WCB', drawingReference: 'DRG-PIP-033-001 Rev A', purchaseNotes: 'PN16, flanged ends.' },
    ],
    materials: [
      { id: 'MREQ-2026-008', materialCode: 'MAT-PI-001', description: 'Seamless pipe DN50', specification: 'CS A106 Gr B, SCH 40', qty: 18, unit: 'm', requiredDate: '2026-12-12', supplier: 'Approved pipe stockist — mock reference', remarks: 'Spool fabrication material.' },
    ],
  }),
  source({
    id: 'SRC-2026-007',
    projectId: 'PRJ-2026-041',
    deliverableType: 'Manufacturing Package',
    deliverableNumber: 'MFG-2026-001',
    deliverableName: 'Conveyor drive assembly manufacturing package',
    revision: 'A',
    reviewId: 'REV-2026-001',
    releaseId: 'REL-REV-2026-003',
    releaseDate: '2026-11-12',
    sourceModule: 'Module 10 — Design Review & Approval',
    releaseOwner: 'Design Authority',
    purchaseEligible: false,
    productionEligible: true,
    drawingType: 'Manufacturing Package',
    cadFileId: 'CAD-2026-001',
    bomNumber: 'BOM-2026-001',
    bomRevision: 'C',
    manufacturingPackageId: 'MFG-2026-001',
    packageRevision: 'A',
    drawingReferences: ['DRG-MEC-041-001 Rev C', 'DRG-MEC-041-002 Rev B'],
    attachments: [attachment('MFG-2026-001_Package.pdf', 'PDF', 824_000, '/cad-samples/utility-skid-ga.pdf')],
  }),
  source({
    id: 'SRC-2026-008',
    projectId: 'PRJ-2026-038',
    deliverableType: 'Manufacturing Package',
    deliverableNumber: 'MFG-2026-002',
    deliverableName: 'Conveyor base frame manufacturing package',
    revision: 'B',
    reviewId: 'REV-2026-008',
    releaseId: 'REL-REV-2026-001',
    releaseDate: '2026-10-28',
    sourceModule: 'Module 10 — Design Review & Approval',
    releaseOwner: 'Design Authority',
    purchaseEligible: false,
    productionEligible: true,
    drawingType: 'Manufacturing Package',
    cadFileId: 'CAD-2026-004',
    bomNumber: 'BOM-2026-002',
    bomRevision: 'B',
    manufacturingPackageId: 'MFG-2026-002',
    packageRevision: 'B',
    drawingReferences: ['DRG-FAB-038-001 Rev B'],
    attachments: [attachment('MFG-2026-002_Fabrication-Package.pdf', 'PDF', 1_240_000)],
  }),
  source({
    id: 'SRC-2026-009',
    projectId: 'PRJ-2026-029',
    deliverableType: 'BOM',
    deliverableNumber: 'BOM-2026-006',
    deliverableName: 'Motor mount bracket BOM',
    revision: 'A',
    reviewId: 'REV-2026-103',
    releaseId: 'REL-BOM-2026-003',
    releaseDate: '2026-10-08',
    sourceModule: 'Module 08 / Module 10 release register',
    releaseOwner: 'Design Authority',
    purchaseEligible: true,
    productionEligible: false,
    assembly: 'Motor mount bracket',
    bomRevision: 'A',
    totalItems: 2,
    buyItems: 1,
    makeItems: 1,
    bomItems: bomItems029,
    materials: [
      { id: 'MREQ-2026-010', materialCode: 'MAT-AL-001', description: 'Aluminium LM6 casting', specification: 'Machined bracket casting', qty: 14, unit: 'kg', requiredDate: '2026-11-30', supplier: 'Approved casting vendor — mock reference', remarks: 'One casting required.' },
    ],
    attachments: [attachment('BOM-2026-006_RevA.xlsx', 'XLSX', 96_000)],
  }),
];

export function sourceFor(record) {
  const seeded = SOURCE_DELIVERABLES.find((row) => row.id === record?.sourceId);
  if (seeded) return seeded;
  if (!record?.sourceId || !record?.deliverableType) return null;
  return {
    id: record.sourceId,
    projectId: record.projectId,
    deliverableType: record.deliverableType,
    deliverableNumber: record.deliverableNumber,
    deliverableName: record.deliverableName,
    revision: record.revision,
    reviewId: record.reviewId,
    releaseId: record.releaseId,
    releaseDate: record.releaseDate,
    sourceModule: record.sourceModule,
    purchaseEligible: (record.destinations || []).includes('Purchase'),
    productionEligible: (record.destinations || []).includes('Production'),
    attachments: record.attachments || [],
    bomItems: record.contents?.bomItems || [],
    materials: record.contents?.materialRequirements || [],
    drawingType: record.deliverableType === 'Drawing' ? record.deliverableName : '',
    bomNumber: record.deliverableType === 'BOM' ? record.deliverableNumber : '',
    bomRevision: record.deliverableType === 'BOM' ? record.revision : '',
  };
}

export function sourceForDeliverable(deliverableNumber, revision) {
  return SOURCE_DELIVERABLES.find(
    (row) => row.deliverableNumber === deliverableNumber && (!revision || row.revision === revision),
  ) || null;
}

export const ELIGIBLE_SOURCES = SOURCE_DELIVERABLES.filter((row) => row.releaseId && row.reviewId);

export function sourceEligibleFor(sourceRow, destinations = []) {
  if (!sourceRow || !sourceRow.releaseId || !sourceRow.reviewId) return false;
  if (!destinations.length) return false;
  return destinations.every((destination) =>
    destination === 'Purchase' ? sourceRow.purchaseEligible : destination === 'Production' ? sourceRow.productionEligible : false,
  );
}

export function sourceEligibilityMessage(sourceRow, destinations = []) {
  if (!sourceRow) return 'Select an approved and released deliverable.';
  const missing = destinations.filter((destination) =>
    destination === 'Purchase' ? !sourceRow.purchaseEligible : destination === 'Production' ? !sourceRow.productionEligible : true,
  );
  if (!destinations.length) return 'Select at least one destination.';
  if (missing.length) return `${sourceRow.deliverableNumber} Rev ${sourceRow.revision} is not eligible for ${missing.join(' / ')} transfer.`;
  return '';
}

function validationRow(key, label, scope, mandatory, result, note) {
  return { key, label, scope, mandatory, result, note };
}

export function makeValidation(sourceRow, destinations = [], { checkedAt = TODAY, checkedBy = 'N. Joshi', extra = [] } = {}) {
  const results = [];
  const hasRelease = Boolean(sourceRow?.releaseId);
  const hasApproval = Boolean(sourceRow?.reviewId);
  const purchase = destinations.includes('Purchase');
  const production = destinations.includes('Production');

  results.push(validationRow('approval', 'Source approval exists', 'Common', true, hasApproval ? 'Valid' : 'Invalid', hasApproval ? `${sourceRow.reviewId} is the linked approval reference.` : 'No source review reference is recorded.'));
  results.push(validationRow('release', 'Source release exists', 'Common', true, hasRelease ? 'Valid' : 'Invalid', hasRelease ? `${sourceRow.releaseId} released ${formatDate(sourceRow.releaseDate)}.` : 'No controlled release exists for this deliverable.'));
  results.push(validationRow('project', 'Project reference is valid', 'Common', true, sourceRow?.projectId && projectExists(sourceRow.projectId) ? 'Valid' : 'Invalid', sourceRow ? projectLabel(sourceRow.projectId) : 'No project selected.'));
  results.push(validationRow('number', 'Deliverable number is available', 'Common', true, sourceRow?.deliverableNumber ? 'Valid' : 'Invalid', sourceRow?.deliverableNumber || 'No deliverable number recorded.'));
  results.push(validationRow('revision', 'Exact revision is identified', 'Common', true, sourceRow?.revision ? 'Valid' : 'Invalid', sourceRow?.revision ? `Exact revision Rev ${sourceRow.revision}.` : 'No revision recorded.'));
  results.push(validationRow('attachments', 'Required attachments are available', 'Common', sourceRow?.deliverableType !== 'BOM', sourceRow?.attachments?.length ? 'Valid' : 'Warning', sourceRow?.attachments?.length ? `${sourceRow.attachments.length} supporting reference(s) recorded.` : 'No attachment references recorded; confirm the source release package separately.'));
  results.push(validationRow('destination', 'Transfer destination is selected', 'Common', true, destinations.length ? 'Valid' : 'Invalid', destinations.length ? `Selected: ${destinations.join(' and ')}.` : 'Select Purchase, Production or both.'));
  results.push(validationRow('unresolved', 'No unresolved approval or revision issue exists', 'Common', true, hasRelease ? 'Valid' : 'Invalid', hasRelease ? 'Source release is controlled and the exact revision is locked.' : 'Resolve the source approval/release before handover.'));

  if (purchase) {
    const hasBom = Boolean(sourceRow?.bomItems?.length);
    results.push(validationRow('purchase-bom', 'Approved BOM exists', 'Purchase', sourceRow?.deliverableType === 'BOM', hasBom ? 'Valid' : 'Invalid', hasBom ? `${sourceRow.deliverableType === 'BOM' ? sourceRow.deliverableNumber : sourceRow.bomNumber} · ${sourceRow.bomItems.length} BOM items.` : 'No approved BOM items are linked.'));
    results.push(validationRow('purchase-revision', 'BOM revision matches the released revision', 'Purchase', true, hasBom ? 'Valid' : 'Invalid', hasBom ? `BOM ${sourceRow.bomRevision || sourceRow.revision} matches the source release reference.` : 'BOM revision cannot be verified.'));
    results.push(validationRow('purchase-material', 'Material quantities are available where required', 'Purchase', sourceRow?.deliverableType === 'BOM', sourceRow?.materials?.length ? 'Valid' : sourceRow?.deliverableType === 'BOM' ? 'Invalid' : 'Not Applicable', sourceRow?.materials?.length ? `${sourceRow.materials.length} material requirement(s) prepared.` : 'No material quantities are recorded for this source.'));
    results.push(validationRow('purchase-components', 'Purchased component references are available where applicable', 'Purchase', false, sourceRow?.bomItems?.some((item) => item.category === 'Buy') ? 'Valid' : 'Warning', sourceRow?.bomItems?.some((item) => item.category === 'Buy') ? 'Buy item references are present.' : 'No buy items identified; confirm that any purchased references are intentional.'));
  }

  if (production) {
    const productionReady = sourceRow?.deliverableType === 'Drawing' || sourceRow?.deliverableType === 'Manufacturing Package';
    results.push(validationRow('production-drawing', 'Drawing is approved and released', 'Production', true, productionReady ? 'Valid' : 'Invalid', productionReady ? `${sourceRow.drawingReferences?.[0] || sourceRow.deliverableNumber} is released for production.` : 'Production handover requires an approved and released drawing.'));
    results.push(validationRow('production-revision', 'Drawing revision matches the released revision', 'Production', true, productionReady ? 'Valid' : 'Invalid', productionReady ? `Exact drawing revision Rev ${sourceRow.revision}.` : 'Drawing revision cannot be verified.'));
    results.push(validationRow('production-package', 'Manufacturing package is available where required', 'Production', sourceRow?.deliverableType === 'Drawing', sourceRow?.manufacturingPackageId ? 'Valid' : sourceRow?.deliverableType === 'Manufacturing Package' ? 'Valid' : 'Invalid', sourceRow?.manufacturingPackageId ? `${sourceRow.manufacturingPackageId} Rev ${sourceRow.packageRevision || 'A'} referenced.` : 'No manufacturing package reference is recorded.'));
    results.push(validationRow('production-instructions', 'Manufacturing instructions and technical references are available', 'Production', false, sourceRow?.attachments?.length || sourceRow?.deliverableType === 'Manufacturing Package' ? 'Valid' : 'Warning', 'Process, inspection and technical references must be included in the handover package.'));
  }

  return {
    checkedAt,
    checkedBy,
    results: [...results, ...extra],
  };
}

export function validationBlocking(validation) {
  return (validation?.results || []).some((row) => row.mandatory && row.result === 'Invalid');
}

export function validationSummary(validation) {
  const rows = validation?.results || [];
  return {
    valid: rows.filter((row) => row.result === 'Valid').length,
    invalid: rows.filter((row) => row.result === 'Invalid').length,
    warnings: rows.filter((row) => row.result === 'Warning').length,
    notApplicable: rows.filter((row) => row.result === 'Not Applicable').length,
  };
}

export function actionLabelForValidation(validation) {
  if (!validation) return 'Validate Transfer';
  return validationBlocking(validation) ? 'Validation Failed' : 'Validated';
}

export function deriveTransferStatus(record) {
  if (!record) return 'Draft';
  if (record.cancellation) return 'Cancelled';
  if (record.failure) return 'Failed';
  if (record.manualStatus === 'On Hold') return 'On Hold';
  if (record.manualStatus === 'Draft') return 'Draft';
  if (['Completed (Mock)', 'Acknowledged'].includes(record.manualStatus)) return record.manualStatus;
  if (!record.validation) return record.manualStatus || 'Validation Pending';
  if (validationBlocking(record.validation)) return 'Invalid';

  const destinations = record.destinations || [];
  if (!destinations.length) return 'Draft';
  const sides = destinations.map((destination) => (destination === 'Purchase' ? record.purchase : record.production));
  if (sides.some((side) => side?.handover)) {
    const acknowledged = destinations.filter((destination) => {
      const side = destination === 'Purchase' ? record.purchase : record.production;
      return ['Acknowledged', 'Acknowledged with Remarks'].includes(side?.acknowledgement?.status);
    });
    if (acknowledged.length === destinations.length) return 'Acknowledged';
    if (acknowledged.length > 0) return 'Partially Acknowledged';
    return 'Awaiting Acknowledgement';
  }
  return 'Ready for Transfer';
}

export function withDerivedStatus(record) {
  return { ...record, status: deriveTransferStatus(record) };
}

export function nextTransferId(records = []) {
  const numbers = records
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return `TRF-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextRequisitionId(transfers = []) {
  const numbers = transfers.flatMap((row) => row.purchase?.requisitions || []).map((row) => Number(String(row.id).split('-').pop())).filter(Number.isFinite);
  return `REQ-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

let workflowSequence = 0;
export function nextWorkflowReference(stageKey) {
  workflowSequence += 1;
  return `${stageKey}-2026-${String(workflowSequence).padStart(3, '0')}`;
}

export function workflowTemplate(projectId, transferId, bomNumber, revision, status = 'Not Started', offset = 0) {
  return WORKFLOW_STAGES.map((stage, index) => ({
    id: `${transferId}-${stage}`,
    stage,
    reference: `${stage}-2026-${String(offset + index + 1).padStart(3, '0')}`,
    projectId,
    transferId,
    bomNumber,
    revision,
    status: index === 0 ? status : index === 1 && status === 'Completed' ? 'Completed' : 'Not Started',
    owner: index % 2 ? 'Purchase — Procurement desk' : 'Purchase — Sourcing cell',
    targetDate: addDays('2026-11-10', (index + 1) * 7),
    completionDate: index === 0 && status === 'Completed' ? '2026-11-18' : '',
    remarks: index === 0 ? 'Mock tracking record prepared from the engineering handover.' : 'Awaiting upstream stage.',
    attachments: index === 0 ? ['REQ-2026-001'] : [],
  }));
}

function historyEntry(id, index, config) {
  return {
    id: `TH-${id}-${index}`,
    at: config.at,
    stage: config.stage,
    action: config.action,
    previousStatus: config.previousStatus || '',
    newStatus: config.newStatus || '',
    by: config.by || 'N. Joshi',
    role: config.role || 'Transfer Coordinator',
    comments: config.comments || '',
  };
}

export function makePackage(sourceRow, config = {}) {
  const drawingRefs = sourceRow?.drawingReferences || (sourceRow?.deliverableType === 'Drawing' ? [`${sourceRow.deliverableNumber} Rev ${sourceRow.revision}`] : []);
  return {
    id: config.id || sourceRow?.manufacturingPackageId || 'MFG-2026-001',
    revision: config.revision || sourceRow?.packageRevision || 'A',
    projectId: sourceRow?.projectId,
    drawingReferences: drawingRefs,
    drawingRevision: sourceRow?.revision || '',
    bomNumber: sourceRow?.bomNumber || '',
    status: config.status || 'Draft',
    preparedBy: config.preparedBy || 'V. Sharma',
    updatedAt: config.updatedAt || '2026-11-08',
    manufacturingInstructions: config.manufacturingInstructions || ['Machine housing bore to drawing datum scheme.', 'Deburr all edges and preserve bore surface finish.'],
    processPlanning: config.processPlanning || 'CNC machining → deburr → inspection → assembly.',
    machining: config.machining || 'Housing bore and mounting face machined in one setup.',
    fabrication: config.fabrication || 'Not applicable to this package.',
    welding: config.welding || 'No structural welding on this package.',
    sheetMetal: config.sheetMetal || 'No sheet-metal parts in this package.',
    tolerances: config.tolerances || 'General tolerance ISO 2768-m; fit tolerances as stated on the drawing.',
    inspection: config.inspection || 'First-piece inspection, bore diameter, mounting hole pattern and surface finish.',
    technicalNotes: config.technicalNotes || 'Use the exact released drawing revision. Do not substitute a superseded revision.',
    attachments: config.attachments || ['DRG-MEC-041-001_RevC.svg', 'MFG-2026-001_Process-Plan.pdf'],
    readiness: config.readiness || [
      { key: 'drawing-release', label: 'Drawing release confirmed', status: 'Ready' },
      { key: 'drawing-revision', label: 'Drawing revision verified', status: 'Ready' },
      { key: 'package', label: 'Manufacturing package available', status: 'Ready' },
      { key: 'process', label: 'Required process instructions available', status: 'Ready' },
      { key: 'material', label: 'Material references available, where applicable', status: 'Ready' },
      { key: 'inspection', label: 'Inspection requirements documented', status: 'Ready' },
      { key: 'attachments', label: 'Technical attachments available', status: 'Ready' },
      { key: 'handover', label: 'Production handover validated', status: 'In Progress' },
    ],
    validation: config.validation || null,
    documents: config.documents || [],
  };
}

function purchaseSide(config = {}) {
  return {
    included: true,
    status: config.status || 'Not Prepared',
    requisitions: config.requisitions || [],
    workflow: config.workflow || [],
    handover: config.handover || null,
    acknowledgement: config.acknowledgement || null,
    comments: config.comments || [],
    progress: config.progress || { requisition: 'Not Started', handover: 'Not Started', acknowledgement: 'Pending', workflow: 'Not Started', mockPurchase: 'Not Started', outstanding: '', remarks: '' },
    ...config,
  };
}

function productionSide(config = {}) {
  return {
    included: true,
    status: config.status || 'Not Prepared',
    package: config.package || null,
    handover: config.handover || null,
    acknowledgement: config.acknowledgement || null,
    comments: config.comments || [],
    progress: config.progress || { drawingRelease: 'Not Started', packagePreparation: 'Not Started', handover: 'Not Started', acknowledgement: 'Pending', readiness: 'Not Started', mockProduction: 'Not Started', outstanding: '', remarks: '' },
    ...config,
  };
}

function handover(idPrefix, config) {
  return {
    id: config.id || `${idPrefix}-HO-2026-${config.sequence || '001'}`,
    date: config.date || TODAY,
    owner: config.owner,
    preparedBy: config.preparedBy || 'N. Joshi',
    notes: config.notes || '',
    documents: config.documents || [],
    snapshot: config.snapshot || {},
  };
}

function ack(status, owner, date, comments = '', previousStatus = 'Pending') {
  return { status, owner, date, comments, previousStatus, newStatus: status };
}

function transferRecord(config) {
  const sourceRow = config.source;
  const destinations = config.destinations;
  const now = {
    ...config,
    id: config.id,
    sourceId: sourceRow.id,
    projectId: sourceRow.projectId,
    deliverableType: sourceRow.deliverableType,
    deliverableNumber: sourceRow.deliverableNumber,
    deliverableName: sourceRow.deliverableName,
    revision: sourceRow.revision,
    reviewId: sourceRow.reviewId,
    releaseId: sourceRow.releaseId,
    sourceModule: sourceRow.sourceModule,
    releaseDate: sourceRow.releaseDate,
    destinations,
    destination: destinationLabel(destinations),
    validation: config.validation || null,
    attachments: sourceRow.attachments,
    comments: config.comments || [],
    revisionHistory: config.revisionHistory || [],
    cancellation: config.cancellation || null,
    failure: config.failure || null,
    manualStatus: config.manualStatus || '',
    purchase: destinations.includes('Purchase') ? purchaseSide(config.purchase || {}) : { ...purchaseSide({ status: 'Not Prepared' }), included: false, requisitions: [], workflow: [], handover: null, acknowledgement: null },
    production: destinations.includes('Production') ? productionSide(config.production || {}) : { ...productionSide({ status: 'Not Prepared' }), included: false, package: null, handover: null, acknowledgement: null },
  };
  now.contents = {
    bomItems: sourceRow.bomItems || [],
    materialRequirements: sourceRow.materials || [],
    drawingReferences: sourceRow.drawingReferences || (sourceRow.deliverableType === 'Drawing' ? [`${sourceRow.deliverableNumber} Rev ${sourceRow.revision}`] : []),
    manufacturingPackage: sourceRow.manufacturingPackageId || (sourceRow.deliverableType === 'Manufacturing Package' ? `${sourceRow.deliverableNumber} Rev ${sourceRow.revision}` : ''),
    technicalNotes: config.notes || 'Controlled handover of the exact released revision. Do not substitute a different revision.',
    attachments: sourceRow.attachments,
  };
  return withDerivedStatus(now);
}

const SRC = Object.fromEntries(SOURCE_DELIVERABLES.map((row) => [row.id, row]));

const req001 = {
  id: 'REQ-2026-001', sourceId: 'SRC-2026-001', projectId: 'PRJ-2026-041', bomNumber: 'BOM-2026-001', bomRevision: 'C',
  materialCode: 'MAT-CS-002', description: 'Cast iron FG260 casting', specification: 'Grey cast iron, stress relieved', qty: 128, unit: 'kg', requiredDate: '2026-12-08', supplier: 'Approved casting vendor — mock reference', remarks: 'Housing casting allowance.', status: 'Prepared', createdAt: '2026-11-05', verifiedAt: '2026-11-06', raisedAt: '2026-11-07',
};
const req002 = {
  id: 'REQ-2026-002', sourceId: 'SRC-2026-001', projectId: 'PRJ-2026-041', bomNumber: 'BOM-2026-001', bomRevision: 'C',
  materialCode: 'MAT-AS-001', description: 'EN19 round bar', specification: 'Quenched and tempered, Ø90 mm', qty: 26, unit: 'kg', requiredDate: '2026-12-05', supplier: 'Approved steel stockist — mock reference', remarks: 'Shaft blank allowance.', status: 'Requisition Raised (Mock)', createdAt: '2026-11-05', verifiedAt: '2026-11-06', raisedAt: '2026-11-07',
};
const req003 = {
  id: 'REQ-2026-003', sourceId: 'SRC-2026-009', projectId: 'PRJ-2026-029', bomNumber: 'BOM-2026-006', bomRevision: 'A',
  materialCode: 'MAT-AL-001', description: 'Aluminium LM6 casting', specification: 'Machined bracket casting', qty: 14, unit: 'kg', requiredDate: '2026-11-30', supplier: '', remarks: 'Draft requisition prepared from BOM Rev A.', status: 'Draft', createdAt: '2026-10-12', verifiedAt: '', raisedAt: '',
};
const req004 = {
  id: 'REQ-2026-004', sourceId: 'SRC-2026-006', projectId: 'PRJ-2026-033', bomNumber: 'BOM-2026-004', bomRevision: 'A',
  materialCode: 'MAT-PI-001', description: 'Seamless pipe DN50', specification: 'CS A106 Gr B, SCH 40', qty: 18, unit: 'm', requiredDate: '2026-12-12', supplier: 'Approved pipe stockist — mock reference', remarks: 'Spool fabrication material.', status: 'Validated', createdAt: '2026-11-08', verifiedAt: '2026-11-09', raisedAt: '',
};

export const TRANSFERS = [
  transferRecord({
    id: 'TRF-2026-001', source: SRC['SRC-2026-001'], destinations: ['Purchase'], priority: 'High', initiatedBy: 'R. Kulkarni', transferDate: '2026-11-04',
    notes: 'Approved BOM Rev C handed to Purchase for material and bought-out procurement. Mock handover only.',
    validation: makeValidation(SRC['SRC-2026-001'], ['Purchase'], { checkedAt: '2026-11-04', checkedBy: 'N. Joshi' }),
    manualStatus: 'Completed (Mock)',
    purchase: purchaseSide({
      status: 'Completed (Mock)',
      requisitions: [req001, req002],
      workflow: workflowTemplate('PRJ-2026-041', 'TRF-2026-001', 'BOM-2026-001', 'C', 'Completed', 1),
      handover: handover('PUR', { sequence: '001', date: '2026-11-07', owner: 'Purchase — Sourcing cell', preparedBy: 'N. Joshi', notes: 'BOM and requisition pack handed over for mock procurement.', documents: ['BOM-2026-001_RevC.xlsx', 'REQ-2026-001', 'REQ-2026-002'], snapshot: { revision: 'C', releaseId: 'REL-BOM-2026-001', bomRevision: 'C' } }),
      acknowledgement: ack('Acknowledged', 'Purchase — Sourcing cell', '2026-11-08', 'BOM and requisition pack received by Purchase (mock).'),
      comments: [{ id: 'PC-001', author: 'N. Joshi', role: 'Transfer Coordinator', at: '2026-11-08T10:15:00', stage: 'Purchase', text: 'Purchase acknowledgement recorded locally. No ERP transaction was created.' }],
      progress: { requisition: 'Prepared', handover: 'Recorded', acknowledgement: 'Acknowledged', workflow: 'Completed (Mock)', mockPurchase: 'Completed (Mock)', outstanding: 'None', remarks: 'Procurement execution remains with the ERP Purchase module.' },
    }),
    history: [
      historyEntry('TRF-2026-001', 1, { at: '2026-11-04T09:10:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Ready for Transfer', by: 'R. Kulkarni', comments: 'BOM Rev C selected.' }),
      historyEntry('TRF-2026-001', 2, { at: '2026-11-04T09:12:00', stage: 'Validation', action: 'Transfer validated', previousStatus: 'Ready for Transfer', newStatus: 'Ready for Transfer', by: 'N. Joshi', comments: 'All common and Purchase checks passed.' }),
      historyEntry('TRF-2026-001', 3, { at: '2026-11-07T14:00:00', stage: 'Purchase', action: 'Purchase handover recorded', previousStatus: 'Ready for Transfer', newStatus: 'Awaiting Acknowledgement', by: 'N. Joshi', comments: 'PUR-HO-2026-001.' }),
      historyEntry('TRF-2026-001', 4, { at: '2026-11-08T10:15:00', stage: 'Purchase', action: 'Mock acknowledgement recorded', previousStatus: 'Awaiting Acknowledgement', newStatus: 'Acknowledged', by: 'Purchase — Sourcing cell', role: 'Purchase Owner', comments: 'Received (mock).' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-002', source: SRC['SRC-2026-003'], destinations: ['Purchase', 'Production'], priority: 'High', initiatedBy: 'K. Pillai', transferDate: '2026-10-29',
    notes: 'Released fabrication drawing and manufacturing package sent to both destinations independently.',
    validation: makeValidation(SRC['SRC-2026-003'], ['Purchase', 'Production'], { checkedAt: '2026-10-29', checkedBy: 'A. Iyer' }),
    purchase: purchaseSide({
      status: 'In Purchase Processing (Mock)',
      requisitions: [],
      workflow: workflowTemplate('PRJ-2026-038', 'TRF-2026-002', 'BOM-2026-002', 'B', 'Completed', 5),
      handover: handover('PUR', { sequence: '002', date: '2026-10-30', owner: 'Purchase — Procurement desk', preparedBy: 'A. Iyer', notes: 'Anchor bolt procurement reference handed over; steel stock remains with Production.', documents: ['DRG-FAB-038-001_RevB.svg', 'BOM-2026-002_RevB.xlsx'], snapshot: { revision: 'B', releaseId: 'REL-REV-2026-001', bomRevision: 'B' } }),
      acknowledgement: ack('Acknowledged with Remarks', 'Purchase — Procurement desk', '2026-10-31', 'Handover received; steel stock handled by Production (mock remark).'),
      comments: [{ id: 'PC-002', author: 'A. Iyer', role: 'Design Engineer', at: '2026-10-31T16:20:00', stage: 'Purchase', text: 'Purchase acknowledgement is independent of the Production acknowledgement.' }],
      progress: { requisition: 'Not Applicable', handover: 'Recorded', acknowledgement: 'Acknowledged with Remarks', workflow: 'In Progress', mockPurchase: 'In Purchase Processing (Mock)', outstanding: 'Confirm CPP/CPR references.', remarks: 'Only purchased anchor bolts require procurement follow-up.' },
    }),
    production: productionSide({
      status: 'Acknowledgement Pending',
      package: makePackage(SRC['SRC-2026-003'], { id: 'MFG-2026-002', revision: 'B', status: 'Ready for Handover', preparedBy: 'V. Sharma', updatedAt: '2026-10-28', attachments: ['DRG-FAB-038-001_RevB.svg', 'MFG-2026-002_Fabrication-Package.pdf'], documents: [
        { number: 'DRG-FAB-038-001', name: 'Conveyor base frame fabrication drawing', category: 'Released Drawings', revision: 'B', source: 'Module 10 release', releaseStatus: 'Released', attachment: 'DRG-FAB-038-001_RevB.svg' },
        { number: 'MFG-2026-002', name: 'Fabrication and inspection package', category: 'Manufacturing Instructions', revision: 'B', source: 'Module 11 package', releaseStatus: 'Available', attachment: 'MFG-2026-002_Fabrication-Package.pdf' },
        { number: 'INS-FAB-038', name: 'Weld and dimensional inspection requirements', category: 'Inspection Requirements', revision: 'B', source: 'Manufacturing Design', releaseStatus: 'Available', attachment: '' },
      ] }),
      handover: handover('PRD', { sequence: '002', date: '2026-10-30', owner: 'Production — Fabrication shop', preparedBy: 'A. Iyer', notes: 'Fabrication drawing and package handed to Production. Acknowledgement pending.', documents: ['DRG-FAB-038-001_RevB.svg', 'MFG-2026-002_Fabrication-Package.pdf'], snapshot: { revision: 'B', releaseId: 'REL-REV-2026-001', packageId: 'MFG-2026-002', packageRevision: 'B' } }),
      acknowledgement: null,
      comments: [],
      progress: { drawingRelease: 'Released', packagePreparation: 'Ready for Handover', handover: 'Recorded', acknowledgement: 'Pending', readiness: 'Ready', mockProduction: 'Handover recorded — acknowledgement pending', outstanding: 'Production acknowledgement required.', remarks: 'Engineering handover readiness only; production execution remains external.' },
    }),
    revisionHistory: [{ id: 'RH-002-1', previousRevision: 'A', newRevision: 'B', at: '2026-09-22', releaseId: 'REL-REV-2026-001', status: 'Current transfer', changeDescription: 'Weld details and member sizes revised before controlled release.' }],
    history: [
      historyEntry('TRF-2026-002', 1, { at: '2026-10-29T11:30:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Ready for Transfer', by: 'K. Pillai', comments: 'Destinations: Purchase and Production.' }),
      historyEntry('TRF-2026-002', 2, { at: '2026-10-29T11:35:00', stage: 'Validation', action: 'Transfer validated', previousStatus: 'Ready for Transfer', newStatus: 'Ready for Transfer', by: 'A. Iyer', comments: 'Drawing Rev B and package Rev B verified.' }),
      historyEntry('TRF-2026-002', 3, { at: '2026-10-30T09:10:00', stage: 'Purchase', action: 'Purchase handover recorded', previousStatus: 'Ready for Transfer', newStatus: 'Awaiting Acknowledgement', by: 'A. Iyer', comments: 'PUR-HO-2026-002.' }),
      historyEntry('TRF-2026-002', 4, { at: '2026-10-30T09:20:00', stage: 'Production', action: 'Production handover recorded', previousStatus: 'Awaiting Acknowledgement', newStatus: 'Awaiting Acknowledgement', by: 'A. Iyer', comments: 'PRD-HO-2026-002.' }),
      historyEntry('TRF-2026-002', 5, { at: '2026-10-31T16:20:00', stage: 'Purchase', action: 'Mock acknowledgement recorded', previousStatus: 'Awaiting Acknowledgement', newStatus: 'Partially Acknowledged', by: 'Purchase — Procurement desk', role: 'Purchase Owner', comments: 'Purchase acknowledged; Production remains pending.' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-003', source: SRC['SRC-2026-005'], destinations: ['Production'], priority: 'High', initiatedBy: 'R. Kulkarni', transferDate: '2026-11-12',
    notes: 'GA Rev C released and handed to Production with the assembly manufacturing package.',
    validation: makeValidation(SRC['SRC-2026-005'], ['Production'], { checkedAt: '2026-11-12', checkedBy: 'N. Joshi' }),
    manualStatus: 'Completed (Mock)',
    production: productionSide({
      status: 'Completed (Mock)',
      package: makePackage(SRC['SRC-2026-005'], { id: 'MFG-2026-001', revision: 'A', status: 'Ready for Handover', preparedBy: 'V. Sharma', updatedAt: '2026-11-12', attachments: ['DRG-MEC-041-001_RevC.svg', 'MFG-2026-001_Process-Plan.pdf'], documents: [
        { number: 'DRG-MEC-041-001', name: 'Conveyor drive assembly GA', category: 'Released Drawings', revision: 'C', source: 'Module 10 release', releaseStatus: 'Released', attachment: 'DRG-MEC-041-001_RevC.svg' },
        { number: 'MFG-2026-001', name: 'Assembly process plan', category: 'Process Documents', revision: 'A', source: 'Module 11 package', releaseStatus: 'Available', attachment: 'MFG-2026-001_Process-Plan.pdf' },
      ] }),
      handover: handover('PRD', { sequence: '003', date: '2026-11-12', owner: 'Production — Assembly bay', preparedBy: 'N. Joshi', notes: 'Assembly drawing and manufacturing package handed over locally.', documents: ['DRG-MEC-041-001_RevC.svg', 'MFG-2026-001_Process-Plan.pdf'], snapshot: { revision: 'C', releaseId: 'REL-REV-2026-003', packageId: 'MFG-2026-001', packageRevision: 'A' } }),
      acknowledgement: ack('Acknowledged', 'Production — Assembly bay', '2026-11-13', 'Assembly package received (mock).'),
      comments: [],
      progress: { drawingRelease: 'Released', packagePreparation: 'Ready for Handover', handover: 'Recorded', acknowledgement: 'Acknowledged', readiness: 'Ready', mockProduction: 'Completed (Mock)', outstanding: 'None', remarks: 'Mock handover complete. Actual production execution is external.' },
    }),
    revisionHistory: [{ id: 'RH-003-1', previousRevision: 'B', newRevision: 'C', at: '2026-11-12', releaseId: 'REL-REV-2026-003', status: 'Current transfer', changeDescription: 'Motor mount envelope and bearing-centre dimensions updated in Rev C.' }],
    history: [
      historyEntry('TRF-2026-003', 1, { at: '2026-11-12T10:05:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Ready for Transfer', by: 'R. Kulkarni', comments: 'Exact drawing revision Rev C.' }),
      historyEntry('TRF-2026-003', 2, { at: '2026-11-12T10:10:00', stage: 'Production', action: 'Production handover recorded', previousStatus: 'Ready for Transfer', newStatus: 'Awaiting Acknowledgement', by: 'N. Joshi', comments: 'PRD-HO-2026-003.' }),
      historyEntry('TRF-2026-003', 3, { at: '2026-11-13T09:00:00', stage: 'Production', action: 'Mock acknowledgement recorded', previousStatus: 'Awaiting Acknowledgement', newStatus: 'Acknowledged', by: 'Production — Assembly bay', role: 'Production Owner', comments: 'Received (mock).' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-004', source: SRC['SRC-2026-004'], destinations: ['Purchase', 'Production'], priority: 'Medium', initiatedBy: 'D. Rao', transferDate: '2026-10-22',
    notes: 'Component drawing Rev B handed to Purchase and Production independently.',
    validation: makeValidation(SRC['SRC-2026-004'], ['Purchase', 'Production'], { checkedAt: '2026-10-22', checkedBy: 'N. Joshi' }),
    purchase: purchaseSide({
      status: 'On Hold',
      requisitions: [],
      handover: handover('PUR', { sequence: '004', date: '2026-10-23', owner: 'Purchase — Vendor development', preparedBy: 'D. Rao', notes: 'Casting and bearing procurement pack handed over.', documents: ['DRG-MEC-041-002_RevB.svg'], snapshot: { revision: 'B', releaseId: 'REL-REV-2026-002', bomRevision: 'C' } }),
      acknowledgement: ack('On Hold', 'Purchase — Vendor development', '2026-10-24', 'Supplier reference for bearing set still under clarification (mock).'),
      comments: [{ id: 'PC-004', author: 'D. Rao', role: 'Design Engineer', at: '2026-10-24T12:10:00', stage: 'Purchase', text: 'Purchase has placed this handover on hold pending a supplier reference.' }],
      progress: { requisition: 'Not Applicable', handover: 'Recorded', acknowledgement: 'On Hold', workflow: 'Not Started', mockPurchase: 'On Hold', outstanding: 'Purchase supplier reference clarification.', remarks: 'Production acknowledgement is tracked separately.' },
    }),
    production: productionSide({
      status: 'Acknowledged',
      package: makePackage(SRC['SRC-2026-004'], { id: 'MFG-2026-003', revision: 'A', status: 'Ready for Handover', preparedBy: 'V. Sharma', updatedAt: '2026-10-22', attachments: ['DRG-MEC-041-002_RevB.svg'], documents: [
        { number: 'DRG-MEC-041-002', name: 'Gearbox housing component drawing', category: 'Released Drawings', revision: 'B', source: 'Module 10 release', releaseStatus: 'Released', attachment: 'DRG-MEC-041-002_RevB.svg' },
        { number: 'MFG-2026-003', name: 'Machining package and inspection requirements', category: 'Inspection Requirements', revision: 'A', source: 'Module 11 package', releaseStatus: 'Available', attachment: '' },
      ] }),
      handover: handover('PRD', { sequence: '004', date: '2026-10-23', owner: 'Production — Machining cell', preparedBy: 'D. Rao', notes: 'Component drawing and machining package handed over.', documents: ['DRG-MEC-041-002_RevB.svg'], snapshot: { revision: 'B', releaseId: 'REL-REV-2026-002', packageId: 'MFG-2026-003', packageRevision: 'A' } }),
      acknowledgement: ack('Acknowledged', 'Production — Machining cell', '2026-10-24', 'Machining package received (mock).'),
      comments: [],
      progress: { drawingRelease: 'Released', packagePreparation: 'Ready for Handover', handover: 'Recorded', acknowledgement: 'Acknowledged', readiness: 'Ready', mockProduction: 'In Production Processing (Mock)', outstanding: '', remarks: 'Production acknowledgement is independent of Purchase.' },
    }),
    history: [
      historyEntry('TRF-2026-004', 1, { at: '2026-10-22T14:10:00', stage: 'Validation', action: 'Transfer validated', previousStatus: 'Ready for Transfer', newStatus: 'Ready for Transfer', by: 'N. Joshi', comments: 'Common and destination checks passed.' }),
      historyEntry('TRF-2026-004', 2, { at: '2026-10-23T09:00:00', stage: 'Purchase', action: 'Purchase handover recorded', previousStatus: 'Ready for Transfer', newStatus: 'Awaiting Acknowledgement', by: 'D. Rao', comments: 'PUR-HO-2026-004.' }),
      historyEntry('TRF-2026-004', 3, { at: '2026-10-23T09:15:00', stage: 'Production', action: 'Production handover recorded', previousStatus: 'Awaiting Acknowledgement', newStatus: 'Awaiting Acknowledgement', by: 'D. Rao', comments: 'PRD-HO-2026-004.' }),
      historyEntry('TRF-2026-004', 4, { at: '2026-10-24T12:10:00', stage: 'Purchase', action: 'Acknowledgement placed On Hold', previousStatus: 'Awaiting Acknowledgement', newStatus: 'Partially Acknowledged', by: 'Purchase — Vendor development', role: 'Purchase Owner', comments: 'Mock supplier reference clarification.' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-005', source: SRC['SRC-2026-007'], destinations: ['Production'], priority: 'High', initiatedBy: 'R. Kulkarni', transferDate: '2026-11-13',
    notes: 'Released manufacturing package handed to Production; acknowledgement pending.',
    validation: makeValidation(SRC['SRC-2026-007'], ['Production'], { checkedAt: '2026-11-13', checkedBy: 'N. Joshi' }),
    production: productionSide({
      status: 'Acknowledgement Pending',
      package: makePackage(SRC['SRC-2026-007'], { id: 'MFG-2026-001', revision: 'A', status: 'Ready for Handover', preparedBy: 'V. Sharma', updatedAt: '2026-11-12', attachments: ['DRG-MEC-041-001_RevC.svg', 'MFG-2026-001_Process-Plan.pdf'], documents: [
        { number: 'DRG-MEC-041-001', name: 'Conveyor drive assembly GA', category: 'Released Drawings', revision: 'C', source: 'Module 10 release', releaseStatus: 'Released', attachment: 'DRG-MEC-041-001_RevC.svg' },
        { number: 'MFG-2026-001', name: 'Assembly process plan', category: 'Process Documents', revision: 'A', source: 'Module 11 package', releaseStatus: 'Available', attachment: 'MFG-2026-001_Process-Plan.pdf' },
      ] }),
      handover: handover('PRD', { sequence: '005', date: '2026-11-13', owner: 'Production — Assembly bay', preparedBy: 'N. Joshi', notes: 'Package handed over for engineering readiness review.', documents: ['MFG-2026-001_Process-Plan.pdf'], snapshot: { revision: 'A', releaseId: 'REL-REV-2026-003', packageId: 'MFG-2026-001', packageRevision: 'A' } }),
      acknowledgement: null,
      comments: [],
      progress: { drawingRelease: 'Released', packagePreparation: 'Ready for Handover', handover: 'Recorded', acknowledgement: 'Pending', readiness: 'Ready', mockProduction: 'Handover recorded — acknowledgement pending', outstanding: 'Production acknowledgement required.', remarks: 'Awaiting acknowledgement from Production (mock).' },
    }),
    history: [
      historyEntry('TRF-2026-005', 1, { at: '2026-11-13T08:30:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Ready for Transfer', by: 'R. Kulkarni', comments: 'Manufacturing package Rev A.' }),
      historyEntry('TRF-2026-005', 2, { at: '2026-11-13T08:35:00', stage: 'Validation', action: 'Transfer validated', previousStatus: 'Ready for Transfer', newStatus: 'Ready for Transfer', by: 'N. Joshi', comments: 'Package and drawing references verified.' }),
      historyEntry('TRF-2026-005', 3, { at: '2026-11-13T10:00:00', stage: 'Production', action: 'Production handover recorded', previousStatus: 'Ready for Transfer', newStatus: 'Awaiting Acknowledgement', by: 'N. Joshi', comments: 'PRD-HO-2026-005.' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-006', source: SRC['SRC-2026-009'], destinations: ['Purchase'], priority: 'Medium', initiatedBy: 'N. Joshi', transferDate: '2026-10-10',
    notes: 'Approved motor mount bracket BOM held after validation; handover preparation is pending.',
    validation: makeValidation(SRC['SRC-2026-009'], ['Purchase'], { checkedAt: '2026-10-10', checkedBy: 'N. Joshi' }),
    purchase: purchaseSide({
      status: 'Ready for Handover',
      requisitions: [req003],
      workflow: workflowTemplate('PRJ-2026-029', 'TRF-2026-006', 'BOM-2026-006', 'A', 'Draft', 9),
      handover: null,
      acknowledgement: null,
      comments: [],
      progress: { requisition: 'Draft', handover: 'Not Started', acknowledgement: 'Pending', workflow: 'Draft', mockPurchase: 'Not Prepared', outstanding: 'Complete the requisition draft and prepare handover.', remarks: 'Transfer is ready; Purchase handover has not been recorded.' },
    }),
    history: [
      historyEntry('TRF-2026-006', 1, { at: '2026-10-10T15:30:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Ready for Transfer', by: 'N. Joshi', comments: 'BOM Rev A selected.' }),
      historyEntry('TRF-2026-006', 2, { at: '2026-10-10T15:35:00', stage: 'Validation', action: 'Transfer validated', previousStatus: 'Ready for Transfer', newStatus: 'Ready for Transfer', by: 'N. Joshi', comments: 'Purchase checks passed with no warnings.' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-007', source: SRC['SRC-2026-006'], destinations: ['Purchase', 'Production'], priority: 'Medium', initiatedBy: 'P. Deshmukh', transferDate: '2026-11-07',
    notes: 'Draft transfer for released piping GA and package. Validation not yet completed.',
    validation: null,
    manualStatus: 'Draft',
    purchase: purchaseSide({ status: 'Draft', requisitions: [req004], progress: { requisition: 'Draft', handover: 'Not Started', acknowledgement: 'Pending', workflow: 'Not Started', mockPurchase: 'Draft', outstanding: 'Validate the transfer before handover.', remarks: 'Requisition is a draft only.' } }),
    production: productionSide({ status: 'Draft', package: makePackage(SRC['SRC-2026-006'], { id: 'MFG-2026-004', revision: 'A', status: 'Draft', preparedBy: 'P. Deshmukh', updatedAt: '2026-11-07', attachments: ['DRG-PIP-033-001_RevA.pdf'], readiness: [
      { key: 'drawing-release', label: 'Drawing release confirmed', status: 'Ready' },
      { key: 'drawing-revision', label: 'Drawing revision verified', status: 'Ready' },
      { key: 'package', label: 'Manufacturing package available', status: 'In Progress' },
      { key: 'process', label: 'Required process instructions available', status: 'Not Started' },
      { key: 'material', label: 'Material references available, where applicable', status: 'Ready' },
      { key: 'inspection', label: 'Inspection requirements documented', status: 'Not Started' },
      { key: 'attachments', label: 'Technical attachments available', status: 'Ready' },
      { key: 'handover', label: 'Production handover validated', status: 'Not Started' },
    ] }), progress: { drawingRelease: 'Released', packagePreparation: 'In Progress', handover: 'Not Started', acknowledgement: 'Pending', readiness: 'In Progress', mockProduction: 'Not Started', outstanding: 'Complete and validate the package.', remarks: 'Draft only; no handover recorded.' } }),
    history: [historyEntry('TRF-2026-007', 1, { at: '2026-11-07T11:20:00', stage: 'Transfer Register', action: 'Draft saved', previousStatus: '', newStatus: 'Draft', by: 'P. Deshmukh', comments: 'Destination Purchase and Production selected; validation outstanding.' })],
  }),
  transferRecord({
    id: 'TRF-2026-008', source: SRC['SRC-2026-004'], destinations: ['Purchase'], priority: 'Low', initiatedBy: 'D. Rao', transferDate: '2026-10-25',
    notes: 'Purchase transfer cancelled before handover because the procurement route changed.',
    validation: makeValidation(SRC['SRC-2026-004'], ['Purchase'], { checkedAt: '2026-10-25', checkedBy: 'D. Rao' }),
    manualStatus: 'Cancelled',
    cancellation: { reason: 'Procurement route changed to a consolidated buy through the frame package; this separate handover was cancelled before issue.', by: 'D. Rao', at: '2026-10-26T10:20:00' },
    purchase: purchaseSide({ status: 'Cancelled', progress: { requisition: 'Not Applicable', handover: 'Not Started', acknowledgement: 'Pending', workflow: 'Not Started', mockPurchase: 'Cancelled', outstanding: '', remarks: 'Cancelled before handover; source release retained.' } }),
    history: [
      historyEntry('TRF-2026-008', 1, { at: '2026-10-25T13:00:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Ready for Transfer', by: 'D. Rao', comments: 'Purchase-only handover prepared.' }),
      historyEntry('TRF-2026-008', 2, { at: '2026-10-26T10:20:00', stage: 'Transfer Register', action: 'Transfer cancelled', previousStatus: 'Ready for Transfer', newStatus: 'Cancelled', by: 'D. Rao', comments: 'Procurement route changed.' }),
    ],
  }),
  transferRecord({
    id: 'TRF-2026-009', source: SRC['SRC-2026-008'], destinations: ['Production'], priority: 'High', initiatedBy: 'K. Pillai', transferDate: '2026-10-29',
    notes: 'Production transfer failed readiness validation because the package revision did not match the released drawing.',
    validation: makeValidation(SRC['SRC-2026-008'], ['Production'], { checkedAt: '2026-10-29', checkedBy: 'A. Iyer', extra: [validationRow('production-package-revision', 'Manufacturing package revision matches the released drawing', 'Production', true, 'Invalid', 'Package Rev A was presented against drawing Rev B. The handover was stopped.')] }),
    manualStatus: 'Failed',
    failure: { reason: 'Manufacturing package revision mismatch: package Rev A presented for drawing Rev B. Correct the package and create a new transfer.', by: 'A. Iyer', at: '2026-10-29T16:40:00' },
    production: productionSide({ status: 'On Hold', package: makePackage(SRC['SRC-2026-008'], { id: 'MFG-2026-002', revision: 'A', status: 'Blocked', preparedBy: 'V. Sharma', updatedAt: '2026-10-29', attachments: ['MFG-2026-002_Fabrication-Package.pdf'], readiness: [
      { key: 'drawing-release', label: 'Drawing release confirmed', status: 'Ready' },
      { key: 'drawing-revision', label: 'Drawing revision verified', status: 'Ready' },
      { key: 'package', label: 'Manufacturing package available', status: 'Blocked' },
      { key: 'process', label: 'Required process instructions available', status: 'In Progress' },
      { key: 'material', label: 'Material references available, where applicable', status: 'Ready' },
      { key: 'inspection', label: 'Inspection requirements documented', status: 'Ready' },
      { key: 'attachments', label: 'Technical attachments available', status: 'In Progress' },
      { key: 'handover', label: 'Production handover validated', status: 'Blocked' },
    ] }), progress: { drawingRelease: 'Released', packagePreparation: 'Blocked', handover: 'Not Started', acknowledgement: 'Pending', readiness: 'Blocked', mockProduction: 'Failed', outstanding: 'Correct package revision and create a new transfer.', remarks: 'Preserved for history; do not delete.' } }),
    history: [
      historyEntry('TRF-2026-009', 1, { at: '2026-10-29T15:20:00', stage: 'Transfer Register', action: 'Transfer created', previousStatus: '', newStatus: 'Validation Pending', by: 'K. Pillai', comments: 'Package Rev A selected for drawing Rev B.' }),
      historyEntry('TRF-2026-009', 2, { at: '2026-10-29T16:40:00', stage: 'Validation', action: 'Validation failed', previousStatus: 'Validation Pending', newStatus: 'Failed', by: 'A. Iyer', comments: 'Package revision mismatch.' }),
    ],
  }),
];

export function transferStats(transfers = TRANSFERS) {
  const live = transfers.filter((row) => !['Cancelled', 'Failed'].includes(row.status));
  const handovers = live.filter((row) => row.purchase?.handover || row.production?.handover);
  const requisitions = transfers.flatMap((row) => row.purchase?.requisitions || []);
  const productionOpen = live.filter(
    (row) =>
      row.destinations?.includes('Production') &&
      row.production?.handover &&
      !['Completed (Mock)'].includes(row.production?.status) &&
      !['Rejected', 'On Hold'].includes(row.production?.acknowledgement?.status),
  );
  const releasedDrawings = SOURCE_DELIVERABLES.filter((row) => row.deliverableType === 'Drawing' && row.releaseId && row.productionEligible);
  return {
    packagesTransferred: handovers.length,
    requisitionsRaised: requisitions.filter((row) => ['Prepared', 'Validated', 'Requisition Raised (Mock)'].includes(row.status)).length,
    productionOpen: productionOpen.length,
    releasedDrawings: releasedDrawings.length,
  };
}

export function transferDashboard(transfers = TRANSFERS) {
  const total = transfers.length;
  const purchaseTransfers = transfers.filter((row) => row.destinations?.includes('Purchase')).length;
  const productionTransfers = transfers.filter((row) => row.destinations?.includes('Production')).length;
  const pending = transfers.reduce(
    (count, row) =>
      count +
      (row.purchase?.included && !['Acknowledged', 'Acknowledged with Remarks'].includes(row.purchase?.acknowledgement?.status) && row.purchase?.handover ? 1 : 0) +
      (row.production?.included && !['Acknowledged', 'Acknowledged with Remarks'].includes(row.production?.acknowledgement?.status) && row.production?.handover ? 1 : 0),
    0,
  );
  const acknowledgedTransfers = transfers.filter((row) => (row.destinations || []).every((destination) => {
    const side = destination === 'Purchase' ? row.purchase : row.production;
    return ['Acknowledged', 'Acknowledged with Remarks'].includes(side?.acknowledgement?.status);
  })).length;
  const onHold = transfers.filter((row) => row.status === 'On Hold' || row.purchase?.acknowledgement?.status === 'On Hold' || row.production?.acknowledgement?.status === 'On Hold').length;
  const completed = transfers.filter((row) => row.status === 'Completed (Mock)' || row.status === 'Acknowledged').length;
  const distribution = TRANSFER_STATUSES.map((status) => ({ label: status, value: transfers.filter((row) => row.status === status).length })).filter((row) => row.value > 0);
  const projects = [...new Set(transfers.map((row) => row.projectId))].map((projectId) => ({
    projectId,
    project: projectName(projectId),
    total: transfers.filter((row) => row.projectId === projectId).length,
    purchase: transfers.filter((row) => row.projectId === projectId && row.destinations?.includes('Purchase')).length,
    production: transfers.filter((row) => row.projectId === projectId && row.destinations?.includes('Production')).length,
    pending: transfers.filter((row) => row.projectId === projectId && row.status === 'Awaiting Acknowledgement').length,
  }));
  return { total, purchaseTransfers, productionTransfers, pending, acknowledgedTransfers, onHold, completed, distribution, projects };
}
