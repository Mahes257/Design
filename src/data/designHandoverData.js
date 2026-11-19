/**
 * Module 13 — Design Release & Production Handover.
 *
 * These helpers build release validation and the export manifest from records
 * that already exist in the design modules. No source document, approval or
 * ERP transfer record is created here.
 */
import { TODAY, formatDate } from './projectData';

export const HANDOVER_STATUSES = [
  'Draft',
  'Validation Failed',
  'Ready for Release',
  'Released',
  'Export Prepared',
];

export const PACKAGE_STATUSES = ['Draft', 'Prepared', 'Released'];
export const VALIDATION_RESULTS = ['Pass', 'Fail', 'Not Applicable', 'Pending'];
export const TRANSFER_METHODS = [
  'Manual Export — JSON manifest',
  'Manual file handover',
  'Secure file share',
  'Other manual method',
];
export const TRANSFER_STATUSES = [
  'Ready for Export',
  'Integration Pending',
  'Export Failed',
];

/**
 * Categories 1–15 required by Module 13. A category is mandatory unless the
 * process explicitly treats the evidence as optional.
 */
export const PACKAGE_CATEGORIES = [
  {
    key: 'mechanical-design',
    label: 'Approved Mechanical Design',
    sourceModule: 'Mechanical Engineering Design',
    sourceRecordType: 'Design record',
    mandatory: true,
    description: 'The controlled design selected for this handover.',
  },
  {
    key: 'design-revision',
    label: 'Released Design Revision',
    sourceModule: 'Mechanical Engineering Design',
    sourceRecordType: 'Design revision',
    mandatory: true,
    description: 'The exact design revision handed over for release.',
  },
  {
    key: 'cad-models',
    label: 'Final CAD Models',
    sourceModule: 'Drawing & CAD Management',
    sourceRecordType: 'CAD file',
    mandatory: true,
    description: 'Current native or neutral CAD model files held in the CAD repository.',
  },
  {
    key: 'drawings',
    label: 'Engineering Drawings',
    sourceModule: 'Drawing & CAD Management',
    sourceRecordType: 'Drawing record',
    mandatory: true,
    description: 'Manufacturing and assembly drawing records with their revisions.',
  },
  {
    key: 'bom',
    label: 'BOM and BOM Revision',
    sourceModule: 'BOM & Cost Estimation',
    sourceRecordType: 'BOM',
    mandatory: true,
    description: 'The released or approved BOM linked to the design package.',
  },
  {
    key: 'material-specifications',
    label: 'Material Specifications',
    sourceModule: 'BOM & Cost Estimation',
    sourceRecordType: 'BOM item material reference',
    mandatory: false,
    description: 'Material references already recorded against BOM items.',
  },
  {
    key: 'manufacturing-definitions',
    label: 'Manufacturing Definitions',
    sourceModule: 'Manufacturing Design',
    sourceRecordType: 'Manufacturing definition',
    mandatory: true,
    description: 'Approved manufacturing definitions for the selected project.',
  },
  {
    key: 'inspections',
    label: 'Inspection and Quality Requirements',
    sourceModule: 'Manufacturing Design',
    sourceRecordType: 'Inspection plan',
    mandatory: true,
    description: 'Inspection requirements and acceptance criteria.',
  },
  {
    key: 'process-plans',
    label: 'Process Plans and Work Instructions',
    sourceModule: 'Manufacturing Design',
    sourceRecordType: 'Process plan',
    mandatory: true,
    description: 'Controlled process plans and route instructions.',
  },
  {
    key: 'simulation-reports',
    label: 'Simulation and Validation Reports',
    sourceModule: 'Simulation & Design Validation',
    sourceRecordType: 'Validation report',
    mandatory: false,
    description: 'Validation evidence produced in the simulation workspace.',
  },
  {
    key: 'analysis-reports',
    label: 'Engineering Analysis Reports',
    sourceModule: 'Engineering Analysis',
    sourceRecordType: 'Analysis report',
    mandatory: false,
    description: 'Approved or verified engineering analysis reports.',
  },
  {
    key: 'engineering-review-records',
    label: 'Engineering Review Records',
    sourceModule: 'Design Review & Approval',
    sourceRecordType: 'Engineering review',
    mandatory: true,
    description: 'The engineering review selected for the handover.',
  },
  {
    key: 'manufacturing-review-records',
    label: 'Manufacturing Review Records',
    sourceModule: 'Design Review & Approval',
    sourceRecordType: 'Manufacturing review',
    mandatory: true,
    description: 'The manufacturing review selected for the handover.',
  },
  {
    key: 'approval-evidence',
    label: 'Approval Evidence',
    sourceModule: 'Design Review & Approval',
    sourceRecordType: 'Final approval',
    mandatory: true,
    description: 'Controlled final approval evidence linked to the review.',
  },
  {
    key: 'change-records',
    label: 'Approved Engineering Change Records',
    sourceModule: 'Engineering Change & Release',
    sourceRecordType: 'ECR / engineering release',
    mandatory: false,
    description: 'Approved or released changes affecting the design package.',
  },
];

export const PACKAGE_CATEGORY_BY_KEY = Object.fromEntries(
  PACKAGE_CATEGORIES.map((category) => [category.key, category]),
);

const STATUS_TONES = {
  Draft: 'gray',
  'Validation Failed': 'red',
  'Ready for Release': 'blue',
  Released: 'green',
  'Export Prepared': 'purple',
  Prepared: 'green',
  'Ready for Export': 'green',
  'Integration Pending': 'orange',
  'Export Failed': 'red',
  Pass: 'green',
  Fail: 'red',
  'Not Applicable': 'gray',
  Pending: 'orange',
};

export function handoverStatusTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export function formatHandoverDate(value) {
  return value ? formatDate(value) : '—';
}

export function nextReference(prefix, rows = [], startAt = 0) {
  const numbers = rows
    .map((row) => Number(String(row?.id || row?.reference || '').split('-').pop()))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(startAt, numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-2026-${String(next).padStart(3, '0')}`;
}

export function selectedPackageItems(packageRecord, categoryKey) {
  return (packageRecord?.items || []).filter((item) => item.category === categoryKey);
}

export function packageCompleteness(packageRecord) {
  const missingMandatory = PACKAGE_CATEGORIES
    .filter((category) => category.mandatory)
    .filter((category) => selectedPackageItems(packageRecord, category.key).length === 0);
  const selectedMandatory = PACKAGE_CATEGORIES.filter(
    (category) => category.mandatory && selectedPackageItems(packageRecord, category.key).length > 0,
  ).length;
  const selectedOptional = PACKAGE_CATEGORIES.filter(
    (category) => !category.mandatory && selectedPackageItems(packageRecord, category.key).length > 0,
  ).length;
  const mandatoryTotal = PACKAGE_CATEGORIES.filter((category) => category.mandatory).length;
  return {
    selectedMandatory,
    mandatoryTotal,
    selectedOptional,
    missingMandatory,
    percent: Math.round((selectedMandatory / mandatoryTotal) * 100),
  };
}

export function reviewStageStatus(review, stage) {
  return review?.stageStates?.[stage]?.status || '';
}

export function reviewIsApproved(review, stage) {
  if (!review) return false;
  const stageStatus = reviewStageStatus(review, stage);
  if (stage === 'engineering') return stageStatus === 'Approved' || stageStatus === 'Not Required';
  if (stage === 'manufacturing') return stageStatus === 'Approved' || stageStatus === 'Not Required';
  return false;
}

export function finalApprovalRecord(review) {
  return review?.finalApproval?.decision === 'Approved'
    ? review.finalApproval
    : ['Approved', 'Released'].includes(review?.status) &&
        review?.stageStates?.engineering?.status === 'Approved' &&
        (!review.requiredStages?.includes('Manufacturing') ||
          review?.stageStates?.manufacturing?.status === 'Approved')
      ? {
          decision: 'Approved',
          approver: review.finalApproval?.approver || review.reviewer || 'Design Authority',
          at: review.finalApproval?.at || review.release?.releaseDate || review.submittedAt || '',
          releaseId: review.release?.releaseId || '',
        }
      : null;
}

export function openEngineeringChanges(changes = [], projectId) {
  const resolved = ['Released', 'Change Closed', 'Rejected', 'Cancelled'];
  return changes.filter((change) => {
    if (change.projectId !== projectId) return false;
    if (resolved.includes(change.status)) return false;
    // An approved change whose revision update is already recorded has been
    // appropriately resolved for this handover, even before a later release.
    if (change.approvalStatus === 'Approved' && change.revisionUpdated) return false;
    return true;
  });
}

function row(key, label, mandatory, result, evidence, remarks = '') {
  return { key, label, mandatory, result, evidence, remarks };
}

/**
 * Evaluate the 16 Module 13 checks from current records. This function never
 * approves anything: it only reports whether existing evidence satisfies each
 * rule.
 */
export function evaluateValidation({
  handover,
  packageRecord,
  project,
  design,
  boms = [],
  definitions = [],
  inspections = [],
  processPlans = [],
  reviews = [],
  changes = [],
}) {
  const selected = (categoryKey) => selectedPackageItems(packageRecord, categoryKey);
  const bom = boms.find((record) => record.id === handover?.bomId);
  const engineeringReview = reviews.find((record) => record.id === handover?.engineeringReviewId);
  const manufacturingReview = reviews.find((record) => record.id === handover?.manufacturingReviewId);
  const finalReview = reviews.find((record) => record.id === handover?.finalApprovalId);
  const completeness = packageCompleteness(packageRecord);
  const projectInspections = inspections.filter((record) => record.projectId === handover?.projectId);
  const projectPlans = processPlans.filter((record) => record.projectId === handover?.projectId);
  const projectDefinitions = definitions.filter((record) => record.projectId === handover?.projectId);
  const openChanges = openEngineeringChanges(changes, handover?.projectId);

  const results = [];
  results.push(row('project', 'Project reference exists', true, project ? 'Pass' : 'Fail', project ? `${project.id} · ${project.name}` : 'No project reference.', project ? '' : 'Select a valid project.'));
  results.push(row('design', 'Mechanical design reference exists', true, design ? 'Pass' : 'Fail', design ? `${design.id} · ${design.name}` : 'No design selected.', design ? '' : 'Select a design record.'));
  results.push(row('revision', 'Selected design revision exists', true, design && handover?.designRevision ? 'Pass' : 'Fail', design ? `${design.id} Rev ${handover?.designRevision || design.revision}` : 'No controlled revision selected.', design ? '' : 'Select a design revision.'));
  results.push(row('cad', 'Required CAD files are linked', true, selected('cad-models').length ? 'Pass' : 'Fail', selected('cad-models').map((item) => item.label).join(', ') || 'No CAD model selected in the package.', selected('cad-models').length ? '' : 'Add actual CAD files to the final design package.'));
  results.push(row('drawings', 'Required drawings are available', true, selected('drawings').length ? 'Pass' : 'Fail', selected('drawings').map((item) => item.label).join(', ') || 'No drawing selected in the package.', selected('drawings').length ? '' : 'Add released or approved drawings to the package.'));
  results.push(row('bom', 'BOM exists', true, bom ? 'Pass' : 'Fail', bom ? `${bom.id} · ${bom.name}` : 'The selected BOM was not found.', bom ? '' : 'Select an existing BOM.'));
  results.push(row('bom-revision', 'BOM revision is selected', true, bom && handover?.bomRevision ? 'Pass' : 'Fail', bom ? `${bom.id} Rev ${handover?.bomRevision || bom.revision}` : 'No BOM revision.', bom && handover?.bomRevision ? '' : 'Select the exact BOM revision.'));
  results.push(row('manufacturing', 'Manufacturing definition is available', true, selected('manufacturing-definitions').length || projectDefinitions.length ? 'Pass' : 'Fail', selected('manufacturing-definitions').map((item) => item.label).join(', ') || `${projectDefinitions.length} available definition(s) not selected.`, selected('manufacturing-definitions').length ? '' : 'Select a manufacturing definition in the package.'));
  results.push(row(
    'inspection',
    'Inspection requirements are available where applicable',
    true,
    projectInspections.length === 0 ? 'Not Applicable' : selected('inspections').length ? 'Pass' : 'Fail',
    projectInspections.length === 0 ? 'No inspection plan exists for this project.' : selected('inspections').map((item) => item.label).join(', ') || 'Inspection plans exist but none is selected.',
    projectInspections.length === 0 || selected('inspections').length ? '' : 'Select the applicable inspection plan.',
  ));
  results.push(row(
    'process-plan',
    'Process plan is available where applicable',
    true,
    projectPlans.length === 0 ? 'Not Applicable' : selected('process-plans').length ? 'Pass' : 'Fail',
    projectPlans.length === 0 ? 'No process plan exists for this project.' : selected('process-plans').map((item) => item.label).join(', ') || 'Process plans exist but none is selected.',
    projectPlans.length === 0 || selected('process-plans').length ? '' : 'Select the applicable process plan.',
  ));
  results.push(row('engineering-review', 'Engineering review is approved', true, reviewIsApproved(engineeringReview, 'engineering') ? 'Pass' : 'Fail', engineeringReview ? `${engineeringReview.id} · engineering stage ${reviewStageStatus(engineeringReview, 'engineering') || 'not recorded'}` : 'No engineering review selected.', reviewIsApproved(engineeringReview, 'engineering') ? '' : 'Select an engineering review with an approved engineering stage.'));
  results.push(row('manufacturing-review', 'Manufacturing review is approved', true, reviewIsApproved(manufacturingReview, 'manufacturing') ? 'Pass' : 'Fail', manufacturingReview ? `${manufacturingReview.id} · manufacturing stage ${reviewStageStatus(manufacturingReview, 'manufacturing') || 'not recorded'}` : 'No manufacturing review selected.', reviewIsApproved(manufacturingReview, 'manufacturing') ? '' : 'Select a manufacturing review with an approved manufacturing stage.'));
  const finalApproval = finalApprovalRecord(finalReview);
  results.push(row('final-approval', 'Final design approval is completed', true, finalApproval ? 'Pass' : 'Fail', finalApproval ? `${finalReview.id} · approved by ${finalApproval.approver || 'Design Authority'}${finalApproval.at ? ` on ${formatHandoverDate(finalApproval.at)}` : ''}` : finalReview ? `${finalReview.id} has no completed final approval.` : 'No final approval record selected.', finalApproval ? '' : 'Complete and select the controlled final approval.'));
  results.push(row('changes', 'Required engineering changes are closed or resolved', true, openChanges.length ? 'Fail' : 'Pass', openChanges.length ? openChanges.map((change) => `${change.id} · ${change.status}`).join(', ') : 'No open engineering change remains for this project.', openChanges.length ? 'Close or release the outstanding engineering change before release.' : ''));
  const revisionBlocked = !design || ['Draft', 'Changes Requested', 'Superseded', 'Rejected'].includes(design.status);
  results.push(row('revision-issue', 'No unresolved mandatory revision issue remains', true, revisionBlocked ? 'Fail' : 'Pass', design ? `${design.id} Rev ${design.revision} · ${design.status}` : 'No design revision.', revisionBlocked ? 'The selected design revision is not in a releasable state.' : ''));
  const packagePrepared = packageRecord && ['Prepared', 'Released'].includes(packageRecord.status) && completeness.missingMandatory.length === 0;
  results.push(row('package', 'Final design package is prepared', true, packagePrepared ? 'Pass' : 'Fail', packageRecord ? `${packageRecord.id} v${packageRecord.version} · ${packageRecord.status}; ${completeness.selectedMandatory}/${completeness.mandatoryTotal} mandatory categories selected.` : 'No final design package exists.', packagePrepared ? '' : completeness.missingMandatory.length ? `Missing mandatory categor${completeness.missingMandatory.length === 1 ? 'y' : 'ies'}: ${completeness.missingMandatory.map((category) => category.label).join(', ')}.` : 'Mark the package Prepared after all mandatory categories are linked.'));

  return {
    checkedAt: TODAY,
    checkedBy: handover?.owner || 'Design Admin',
    packageId: packageRecord?.id || '',
    packageVersion: packageRecord?.version || '',
    results,
  };
}

export function validationBlocking(validation) {
  return (validation?.results || []).some((item) => item.mandatory && item.result === 'Fail');
}

export function validationSummary(validation) {
  const rows = validation?.results || [];
  return {
    pass: rows.filter((item) => item.result === 'Pass').length,
    fail: rows.filter((item) => item.result === 'Fail').length,
    notApplicable: rows.filter((item) => item.result === 'Not Applicable').length,
    pending: rows.filter((item) => item.result === 'Pending').length,
    mandatoryFailures: rows.filter((item) => item.mandatory && item.result === 'Fail').length,
    total: rows.length,
  };
}

export function pendingValidationRows() {
  return [
    ['project', 'Project reference exists', true],
    ['design', 'Mechanical design reference exists', true],
    ['revision', 'Selected design revision exists', true],
    ['cad', 'Required CAD files are linked', true],
    ['drawings', 'Required drawings are available', true],
    ['bom', 'BOM exists', true],
    ['bom-revision', 'BOM revision is selected', true],
    ['manufacturing', 'Manufacturing definition is available', true],
    ['inspection', 'Inspection requirements are available where applicable', true],
    ['process-plan', 'Process plan is available where applicable', true],
    ['engineering-review', 'Engineering review is approved', true],
    ['manufacturing-review', 'Manufacturing review is approved', true],
    ['final-approval', 'Final design approval is completed', true],
    ['changes', 'Required engineering changes are closed or resolved', true],
    ['revision-issue', 'No unresolved mandatory revision issue remains', true],
    ['package', 'Final design package is prepared', true],
  ].map(([key, label, mandatory]) => ({
    key,
    label,
    mandatory,
    result: 'Pending',
    evidence: 'Validation has not been run for the current records.',
    remarks: 'Run release validation to evaluate this item.',
  }));
}

export function buildReleaseManifest({
  handover,
  packageRecord,
  project,
  design,
  release,
  catalogs = [],
  preparedBy = 'Design Admin',
}) {
  return {
    manifestFormat: 'VISHAK DESIGN HANDOVER MANIFEST',
    manifestVersion: '1.0',
    generatedAt: `${TODAY}T${new Date().toTimeString().slice(0, 8)}`,
    generatedBy: preparedBy,
    integration: {
      target: 'ERP Production',
      mode: 'Manual export',
      verifiedIntegration: false,
      transferStatus: 'Integration Pending',
      note: 'No verified design-package import endpoint exists in the inspected ERP Production module. This manifest is for manual handover.',
    },
    handover: {
      id: handover.id,
      projectId: handover.projectId,
      projectName: project?.name || handover.projectId,
      designId: handover.designId,
      designRevision: handover.designRevision,
      designName: design?.name || '',
      itemType: handover.itemType,
      itemId: handover.itemId,
      owner: handover.owner,
      targetDate: handover.targetDate,
      notes: handover.notes,
    },
    package: {
      id: packageRecord?.id || '',
      version: packageRecord?.version || '',
      status: packageRecord?.status || '',
      preparedBy: packageRecord?.preparedBy || '',
      preparedDate: packageRecord?.preparedDate || '',
      categories: PACKAGE_CATEGORIES.map((category) => ({
        key: category.key,
        label: category.label,
        mandatory: category.mandatory,
        sourceModule: category.sourceModule,
        sourceRecordType: category.sourceRecordType,
        available: (catalogs.find((entry) => entry.key === category.key)?.sources || []).length,
        selected: selectedPackageItems(packageRecord, category.key).map((item) => ({
          sourceId: item.sourceId,
          label: item.label,
          revision: item.revision || '',
          status: item.status || '',
          sourceModule: item.sourceModule || category.sourceModule,
        })),
      })),
    },
    release: release
      ? {
          reference: release.id,
          date: release.date,
          releasedBy: release.releasedBy,
          status: release.status,
          packageId: release.packageId,
          packageVersion: release.packageVersion,
        }
      : null,
    sourceReferences: (packageRecord?.items || []).map((item) => ({
      category: item.category,
      sourceId: item.sourceId,
      label: item.label,
      revision: item.revision || '',
      status: item.status || '',
    })),
    manualHandoverInstructions: [
      'Download and retain this manifest with the released design package.',
      'Attach the manifest to the controlled manual handover record.',
      'Enter the Production acknowledgement reference only after it is received.',
      'Do not describe this manual export as a completed direct ERP transfer.',
    ],
  };
}

export { TODAY };
