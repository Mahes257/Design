/**
 * Module 14 — Reports & Analytics source model.
 *
 * Every value here is derived from records already held by Modules 01–13.
 * Nothing is written back, generated, estimated or fetched. A missing date,
 * owner or cost stays missing and is rendered as "Not recorded".
 */
import { ALL_PROJECT_STATUSES, PROJECT_DOMAINS, TODAY } from './projectData';

export const REPORT_TODAY = TODAY;
export const REPORT_DEPARTMENTS = PROJECT_DOMAINS;
export const PROJECT_STATUSES = ALL_PROJECT_STATUSES;

export const REPORT_TABS = [
  {
    key: 'dashboard',
    label: 'Analytics Dashboard',
    slug: 'dashboard',
    description: 'Cross-module KPIs, status distributions and activity calculated from Module 01–13 records.',
  },
  {
    key: 'project-progress',
    label: 'Project Progress Reports',
    slug: 'project-progress',
    description: 'Project status, dates, linked engineering records, handover and delay reporting.',
  },
  {
    key: 'design-status',
    label: 'Design Status Reports',
    slug: 'design-status',
    description: 'Mechanical design status, review decisions, releases, linked BOMs, CAD and drawing references.',
  },
  {
    key: 'cad-drawing',
    label: 'CAD & Drawing Reports',
    slug: 'cad-drawing',
    description: 'CAD repository, drawing register, format distribution, revisions, links and release status.',
  },
  {
    key: 'bom-cost',
    label: 'BOM & Cost Reports',
    slug: 'bom-cost',
    description: 'Actual BOM structure, material quantities and recorded cost estimates without inferred prices.',
  },
  {
    key: 'review-approval',
    label: 'Engineering Review & Approval Reports',
    slug: 'review-approval',
    description: 'Review stages, decisions, pending actions, release readiness and actual turnaround dates.',
  },
  {
    key: 'engineering-change',
    label: 'Engineering Change Reports',
    slug: 'engineering-change',
    description: 'Actual ECR and ECO records, open changes, approvals, revision impact and closure status.',
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing Reports',
    slug: 'manufacturing',
    description: 'Manufacturing definitions, inspection and process plans, handover and transfer preparation.',
  },
  {
    key: 'workload-delay',
    label: 'Workload & Delay Reports',
    slug: 'workload-delay',
    description: 'Recorded ownership, assigned tasks, overdue work, pending approvals and schedule variance.',
  },
];

export const STATUS_COLORS = {
  'Design In Progress': '#2563EB',
  'In Design': '#2563EB',
  'Under Planning': '#0EA5E9',
  Assigned: '#0EA5E9',
  Submitted: '#7C3AED',
  'Under Review': '#7C3AED',
  'Under Engineering Review': '#7C3AED',
  'Under Manufacturing Review': '#7C3AED',
  'Under Client Review': '#7C3AED',
  'Pending Client Submission': '#D97706',
  'Approval Pending': '#D97706',
  Pending: '#D97706',
  'Changes Requested': '#D97706',
  'Impact Assessment': '#D97706',
  Draft: '#94A3B8',
  'Not Started': '#94A3B8',
  'On Hold': '#94A3B8',
  Approved: '#16A34A',
  Released: '#0B7A68',
  Completed: '#0B7A68',
  Finalized: '#0B7A68',
  'ECO Approved': '#D97706',
  'Revision Updated': '#0EA5E9',
  Rejected: '#DC2626',
  Delayed: '#DC2626',
  'Revision Required': '#DC2626',
  Superseded: '#64748B',
  Withdrawn: '#64748B',
  Archived: '#64748B',
  Cancelled: '#64748B',
  'Not Required': '#CBD5E1',
  Ready: '#0B7A68',
  'In Preparation': '#D97706',
  Blocked: '#DC2626',
  Registered: '#64748B',
  'Preview Available': '#0B7A68',
  'Preview Unavailable': '#D97706',
  '2D drawing': '#2563EB',
  '3D / model': '#7C3AED',
  Document: '#64748B',
  ECR: '#2563EB',
  ECO: '#0B7A68',
  Open: '#D97706',
  Closed: '#64748B',
};

const PALETTE = [
  '#0B7A68',
  '#2563EB',
  '#7C3AED',
  '#D97706',
  '#0EA5E9',
  '#DC2626',
  '#16A34A',
  '#64748B',
  '#0E7490',
  '#C026D3',
  '#EA580C',
  '#475569',
];

const TEAL_SCALE = ['#0B7A68', '#159A85', '#2FAF97', '#5BC0A8', '#88D1C1', '#B7E4DA'];

export function formatReportDate(value, fallback = 'Not recorded') {
  if (!value) return fallback;
  const date = String(value).slice(0, 10);
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatReportNumber(value) {
  if (value == null || value === '') return '0';
  return Number(value).toLocaleString('en-IN');
}

export function formatReportCurrency(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return 'Not recorded';
  const amount = Number(value);
  if (Math.abs(amount) >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (Math.abs(amount) >= 100_000) return `₹${(amount / 100_000).toFixed(2)} L`;
  if (Math.abs(amount) >= 1_000) return `₹${(amount / 1_000).toFixed(1)}k`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatReportPercent(part, total) {
  if (!total) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

export function formatReportMonth(month) {
  if (!month) return '—';
  const [year, value] = month.split('-');
  const date = new Date(Number(year), Number(value) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function timestamp(value) {
  const date = dateOnly(value);
  const parsed = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortDateDesc(left, right, key) {
  return timestamp(right?.[key]) - timestamp(left?.[key]);
}

function maxDate(values = []) {
  return values.filter(Boolean).map(dateOnly).sort().at(-1) || '';
}

function daysBetween(start, end = REPORT_TODAY) {
  if (!start) return null;
  const left = timestamp(start);
  const right = timestamp(end);
  if (!left || !right) return null;
  return Math.max(0, Math.round((right - left) / 86_400_000));
}

export function daysFromToday(value) {
  return daysBetween(value, REPORT_TODAY);
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countBy(rows, accessor) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = typeof accessor === 'function' ? accessor(row) : row?.[accessor];
    if (value == null || value === '') return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function uniqueValues(rows, accessor) {
  return [...new Set(rows.map((row) => (typeof accessor === 'function' ? accessor(row) : row?.[accessor])).filter(Boolean))].sort();
}

export function seriesFromCounts(counts, { order = [], colors = PALETTE, keyPrefix = 'item' } = {}) {
  const keys = [
    ...order.filter((key) => counts.has(key)),
    ...[...counts.keys()].filter((key) => !order.includes(key)).sort(),
  ];
  return keys.map((key, index) => ({
    key: `${keyPrefix}-${key}`.replace(/\s+/g, '-').toLowerCase(),
    label: key,
    value: counts.get(key) || 0,
    color: STATUS_COLORS[key] || colors[index % colors.length],
  }));
}

export function statusSeries(rows, key, options = {}) {
  return seriesFromCounts(countBy(rows, key), options);
}

export function seriesFromObject(object, options = {}) {
  return seriesFromCounts(new Map(Object.entries(object)), options);
}

function reviewStageStates(review) {
  return review?.stageStates || {
    engineering: review?.engineering || { status: 'Not Required' },
    manufacturing: review?.manufacturing || { status: 'Not Required' },
    client: review?.client || { status: 'Not Required' },
  };
}

function reviewDecisionDate(review) {
  const stages = reviewStageStates(review);
  return maxDate([
    stages.engineering?.decidedAt,
    stages.manufacturing?.decidedAt,
    stages.client?.decidedAt,
    review?.finalApproval?.at,
    review?.release?.releaseDate,
  ]);
}

function isDesignReleased(design, review, release) {
  return Boolean(release) || design?.status === 'Released';
}

function latest(rows, key = 'updatedAt') {
  return [...rows].sort((left, right) => timestamp(right?.[key]) - timestamp(left?.[key]))[0] || null;
}

function byProjectAndDesign(rows, projectId, designId) {
  return rows.filter((row) => row.projectId === projectId && (!row.designId || !designId || row.designId === designId));
}

function findManufacturingLinks(definition, inspections, processPlans, drawings) {
  const drawing = drawings.find((row) => row.id === definition.linkedDrawingId)
    || drawings.find(
      (row) => row.projectId === definition.projectId
        && row.drawingNumber === definition.drawingNo
        && (!definition.drawingRevision || row.revision === definition.drawingRevision),
    )
    || drawings.find((row) => row.projectId === definition.projectId && row.partNumber === definition.partNumber);
  const inspection = inspections.find((row) => row.linkedDefinitionId === definition.id)
    || inspections.find(
      (row) => row.projectId === definition.projectId
        && row.partId === definition.partId
        && (!definition.drawingRevision || !row.drawingRevision || row.drawingRevision === definition.drawingRevision),
    )
    || inspections.find((row) => row.projectId === definition.projectId && row.partNumber === definition.partNumber);
  const processPlan = processPlans.find((row) => row.linkedDefinitionId === definition.id)
    || processPlans.find(
      (row) => row.projectId === definition.projectId
        && row.partId === definition.partId
        && (!definition.drawingRevision || !row.drawingRevision || row.drawingRevision === definition.drawingRevision),
    )
    || processPlans.find((row) => row.projectId === definition.projectId && row.partNumber === definition.partNumber);
  return { drawing, inspection, processPlan };
}

export function buildReportingData({
  projects = [],
  team = [],
  milestones = [],
  plans = [],
  tasks = [],
  designs = [],
  parts = [],
  assemblies = [],
  files = [],
  drawings = [],
  definitions = [],
  inspections = [],
  processPlans = [],
  boms = [],
  estimates = [],
  materials = [],
  quantities = [],
  reviews = [],
  changes = [],
  ecos = [],
  handovers = [],
  packages = [],
  handoverReleases = [],
  handoverTransfers = [],
  transfers = [],
} = {}) {
  const projectById = new Map(projects.map((row) => [row.id, row]));
  const designById = new Map(designs.map((row) => [row.id, row]));
  const drawingsById = new Map(drawings.map((row) => [row.id, row]));
  const reviewsByDesign = new Map();
  reviews.forEach((review) => {
    if (!review.designId) return;
    const list = reviewsByDesign.get(review.designId) || [];
    list.push(review);
    reviewsByDesign.set(review.designId, list);
  });

  const reviewForDesign = (design) => {
    if (!design?.id) return null;
    const candidates = [...(reviewsByDesign.get(design.id) || [])].sort((left, right) => sortDateDesc(left, right, 'submittedAt'));
    const submitted = candidates.filter((row) => row.status !== 'Draft');
    const pool = submitted.length ? submitted : candidates;
    return pool.find((row) => !row.designRevision || row.designRevision === design.revision) || pool[0] || null;
  };

  const handoverForProjectDesign = (projectId, designId) => {
    const candidates = byProjectAndDesign(handovers, projectId, designId).sort((left, right) => sortDateDesc(left, right, 'createdAt'));
    return candidates[0] || null;
  };

  const packageByHandover = new Map(packages.map((row) => [row.handoverId, row]));
  const releaseByHandover = new Map(handoverReleases.map((row) => [row.handoverId, row]));
  const transfersByHandover = new Map();
  handoverTransfers.forEach((row) => {
    const list = transfersByHandover.get(row.handoverId) || [];
    list.push(row);
    transfersByHandover.set(row.handoverId, list);
  });

  const projectName = (id) => projectById.get(id)?.name || id || '';
  const designNumber = (id) => designById.get(id)?.id || id || '';
  const departmentForProject = (id) => projectById.get(id)?.domain || '';

  const enrichedProjects = projects.map((project) => {
    const projectDesigns = designs.filter((row) => row.projectId === project.id);
    const projectDrawings = drawings.filter((row) => row.projectId === project.id);
    const projectBoms = boms.filter((row) => row.projectId === project.id);
    const projectReviews = reviews.filter((row) => row.projectId === project.id);
    const projectHandovers = handovers.filter((row) => row.projectId === project.id);
    const submittedProjectReviews = projectReviews.filter((row) => row.status !== 'Draft');
    const latestReview = latest(submittedProjectReviews.length ? submittedProjectReviews : projectReviews, 'submittedAt');
    const latestHandover = latest(projectHandovers, 'createdAt');
    const release = latestReview?.release || null;
    const stage = release?.status === 'Released'
      ? 'Released'
      : latestReview?.currentStage || latest(projectDesigns, 'updatedAt')?.status || project.status;
    const approvalStatus = latestReview?.status || 'Not started';
    const delayStatus = project.status === 'Completed'
      ? 'Completed'
      : project.delayed
        ? 'Delayed'
        : 'Not delayed';
    const completionDate = project.actualCompletionDate || project.completedAt || '';
    return {
      ...project,
      projectId: project.id,
      projectName: project.name,
      department: project.domain || 'Not recorded',
      owner: project.manager || 'Not recorded',
      customer: project.customer || 'Not recorded',
      startDate: project.start || '',
      targetDate: project.target || '',
      actualCompletionDate: completionDate,
      recordedProgress: numeric(project.progress),
      currentStage: stage || 'Not recorded',
      approvalStatus,
      relatedDesigns: projectDesigns,
      relatedBoms: projectBoms,
      relatedDrawings: projectDrawings,
      relatedCads: files.filter((row) => row.projectId === project.id),
      latestHandover,
      latestHandoverRelease: latestHandover ? releaseByHandover.get(latestHandover.id) || null : null,
      handoverStatus: latestHandover?.status || 'No handover',
      delayStatus,
      latestReview,
      searchText: [
        project.id,
        project.name,
        project.reference,
        project.customer,
        project.manager,
        project.domain,
        project.status,
        stage,
        approvalStatus,
        delayStatus,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const projectRows = enrichedProjects;
  const projectByIdRow = new Map(projectRows.map((row) => [row.id, row]));

  const designRows = designs.map((design) => {
    const project = projectByIdRow.get(design.projectId);
    const latestReview = reviewForDesign(design);
    const stages = reviewStageStates(latestReview);
    const releasedReview = [...(reviewsByDesign.get(design.id) || [])]
      .filter((row) => row.release && (!row.designRevision || row.designRevision === design.revision))
      .sort((left, right) => timestamp(right.release?.releaseDate) - timestamp(left.release?.releaseDate))[0] || null;
    const release = releasedReview?.release || (latestReview?.release || null);
    const designReviewRows = reviewsByDesign.get(design.id) || [];
    const designBoms = boms.filter((row) => row.designId === design.id);
    const designFiles = files.filter((row) => row.designId === design.id);
    const designDrawings = drawings.filter((row) => row.designId === design.id);
    const handover = handoverForProjectDesign(design.projectId, design.id);
    const revisionDates = (design.revisions || []).map((row) => row.date).filter(Boolean);
    const activityDates = (design.activity || []).map((row) => row.at).filter(Boolean);
    const lastUpdated = maxDate([design.updatedAt, ...revisionDates, ...activityDates]);
    const releaseStatus = release?.status
      || (design.status === 'Released' ? 'Released' : 'Not released');
    return {
      ...design,
      projectId: design.projectId,
      projectName: project?.name || projectName(design.projectId),
      department: design.domain || project?.department || 'Not recorded',
      owner: design.owner || 'Not recorded',
      engineer: design.engineer || 'Not recorded',
      designNumber: design.id,
      cadRef: design.cadRef || 'Not recorded',
      designName: design.name,
      revision: design.revision || '—',
      status: design.status || 'Not recorded',
      engineeringReviewStatus: stages.engineering?.status || 'Not started',
      manufacturingReviewStatus: stages.manufacturing?.status || 'Not started',
      clientApprovalStatus: stages.client?.status || 'Not required',
      finalApprovalStatus: designReviewRows.find((row) => row.status === 'Released')?.finalApproval?.decision
        || latestReview?.finalApproval?.decision
        || 'Not completed',
      finalApprovalReference: designReviewRows.find((row) => row.status === 'Released')?.id || latestReview?.id || '',
      reviewStatus: latestReview?.status || 'No review record',
      releaseStatus,
      release,
      releaseDate: release?.releaseDate || '',
      bomIds: designBoms.map((row) => row.id),
      boms: designBoms,
      cadFiles: designFiles,
      drawings: designDrawings,
      handover,
      created: design.created || '',
      lastUpdated,
      revisionHistory: [...(design.revisions || [])].sort((left, right) => timestamp(right.date) - timestamp(left.date)),
      latestReview,
      isReleased: isDesignReleased(design, latestReview, release),
      searchText: [
        design.id,
        design.cadRef,
        design.name,
        design.projectId,
        project?.name,
        design.owner,
        design.engineer,
        design.status,
        design.revision,
        latestReview?.status,
        releaseStatus,
        stages.engineering?.status,
        stages.manufacturing?.status,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });
  const designByIdRow = new Map(designRows.map((row) => [row.id, row]));

  const cadFileRows = files.map((file) => {
    const linkedDrawings = drawings.filter((row) => (row.cadFileIds || []).includes(file.id));
    const project = projectByIdRow.get(file.projectId);
    const design = designByIdRow.get(file.designId);
    const category = file.category || 'Not classified';
    const classification = category.includes('2D') ? '2D drawing'
      : /3D|Model|Assembly|Part|Reference/i.test(category) ? '3D / model'
        : 'Document';
    return {
      ...file,
      projectId: file.projectId,
      projectName: project?.name || projectName(file.projectId),
      department: project?.department || 'Not recorded',
      designId: file.designId,
      designNumber: design?.designNumber || designNumber(file.designId),
      drawingIds: linkedDrawings.map((row) => row.id),
      linkedDrawings,
      linkStatus: linkedDrawings.length ? 'Linked to drawing' : 'No drawing reference',
      classification,
      uploadedAt: file.uploadedAt || '',
      status: file.status || 'Not recorded',
      searchText: [
        file.id,
        file.fileName,
        file.fileType,
        file.category,
        file.projectId,
        project?.name,
        file.designId,
        design?.designNumber,
        file.partNumber,
        file.partName,
        file.revision,
        file.status,
        linkedDrawings.map((row) => row.drawingNumber).join(' '),
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const cadFileById = new Map(cadFileRows.map((row) => [row.id, row]));
  const drawingRows = drawings.map((drawing) => {
    const project = projectByIdRow.get(drawing.projectId);
    const design = designByIdRow.get(drawing.designId);
    const linkedFiles = (drawing.cadFileIds || []).map((id) => cadFileById.get(id)).filter(Boolean);
    return {
      ...drawing,
      projectId: drawing.projectId,
      projectName: project?.name || projectName(drawing.projectId),
      department: project?.department || 'Not recorded',
      designId: drawing.designId,
      designNumber: design?.designNumber || designNumber(drawing.designId),
      drawingNumber: drawing.drawingNumber || drawing.id,
      revision: drawing.revision || '—',
      approvalStatus: drawing.approvalStatus || 'Not recorded',
      releaseStatus: drawing.releaseStatus || 'Not released',
      drawingDate: drawing.drawingDate || '',
      linkedFiles,
      cadLinkStatus: linkedFiles.length ? `${linkedFiles.length} linked file${linkedFiles.length === 1 ? '' : 's'}` : 'No linked CAD file',
      searchText: [
        drawing.id,
        drawing.drawingNumber,
        drawing.title,
        drawing.drawingType,
        drawing.projectId,
        project?.name,
        drawing.designId,
        design?.designNumber,
        drawing.partNumber,
        drawing.revision,
        drawing.approvalStatus,
        drawing.releaseStatus,
        linkedFiles.map((row) => row.fileName).join(' '),
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const estimateByBom = new Map();
  estimates.forEach((estimate) => {
    const current = estimateByBom.get(estimate.bomId);
    if (!current || timestamp(estimate.date) > timestamp(current.date)) estimateByBom.set(estimate.bomId, estimate);
  });
  const estimatesByBom = new Map();
  estimates.forEach((estimate) => {
    const list = estimatesByBom.get(estimate.bomId) || [];
    list.push(estimate);
    estimatesByBom.set(estimate.bomId, list);
  });

  const bomRows = boms.map((bom) => {
    const project = projectByIdRow.get(bom.projectId);
    const design = designByIdRow.get(bom.designId);
    const estimate = estimateByBom.get(bom.id) || null;
    const linkedMaterialRows = materials.length
      ? materials.filter((row) => row.bomId === bom.id)
      : (bom.materials || []);
    const totalCost = estimate && estimate.totalCost != null && Number.isFinite(Number(estimate.totalCost))
      ? Number(estimate.totalCost)
      : null;
    const incompleteItems = (bom.items || []).filter(
      (item) => !item.partNumber || item.qty == null || item.qty === '' || !item.uom,
    ).length;
    const completenessNotes = [
      !bom.projectId ? 'project' : '',
      !bom.designId ? 'design' : '',
      !bom.revision ? 'revision' : '',
      !(bom.items || []).length ? 'BOM items' : '',
      incompleteItems ? `${incompleteItems} item(s) missing part / quantity / UOM` : '',
    ].filter(Boolean);
    return {
      ...bom,
      projectId: bom.projectId,
      projectName: project?.name || projectName(bom.projectId),
      department: project?.department || 'Not recorded',
      designId: bom.designId,
      designNumber: design?.designNumber || designNumber(bom.designId),
      assemblyId: bom.assemblyId || '',
      revision: bom.revision || '—',
      status: bom.status || 'Not recorded',
      revisionStatus: bom.status || 'Not recorded',
      itemCount: (bom.items || []).length,
      totalQuantity: (bom.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
      materialCount: linkedMaterialRows.length,
      completenessNotes,
      completeness: completenessNotes.length
        ? `Missing: ${completenessNotes.join('; ')}`
        : 'Core BOM fields present',
      estimate,
      estimates: estimatesByBom.get(bom.id) || [],
      totalCost,
      materialCost: estimate && Number.isFinite(Number(estimate.materialCost)) ? Number(estimate.materialCost) : null,
      manufacturingCost: estimate && Number.isFinite(Number(estimate.processCost)) ? Number(estimate.processCost) : null,
      costStatus: estimate ? estimate.status || 'Recorded' : 'No cost estimate',
      searchText: [
        bom.id,
        bom.name,
        bom.projectId,
        project?.name,
        bom.designId,
        design?.designNumber,
        bom.revision,
        bom.status,
        bom.items?.map((item) => `${item.partNumber} ${item.name} ${item.material}`).join(' '),
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });
  const bomById = new Map(bomRows.map((row) => [row.id, row]));

  const bomItemRows = boms.flatMap((bom) => {
    const project = projectByIdRow.get(bom.projectId);
    const design = designByIdRow.get(bom.designId);
    return (bom.items || []).map((item) => {
      const unitCost = numeric(item.unitCost);
      const materialCost = unitCost != null && unitCost > 0
        ? unitCost * (Number(item.qty) || 0)
        : null;
      return {
        ...item,
        rowKey: `${bom.id}-${item.id || item.itemNumber}`,
        bomId: bom.id,
        bomRevision: bom.revision,
        bomStatus: bom.status,
        projectId: bom.projectId,
        projectName: project?.name || projectName(bom.projectId),
        department: project?.department || 'Not recorded',
        designId: bom.designId,
        designNumber: design?.designNumber || designNumber(bom.designId),
        materialCost,
        totalCost: materialCost,
        searchText: [
          bom.id,
          item.partNumber,
          item.name,
          item.material,
          item.specification,
          item.referenceDrawing,
          bom.projectId,
          project?.name,
        ].filter(Boolean).join(' ').toLowerCase(),
      };
    });
  });

  const bomMaterialRows = [];
  const materialAggregate = new Map();
  boms.forEach((bom) => {
    const project = projectByIdRow.get(bom.projectId);
    const linkedMaterialRows = materials.length
      ? materials.filter((row) => row.bomId === bom.id)
      : (bom.materials || []);
    linkedMaterialRows.forEach((material) => {
      const code = material.materialCode || material.id || 'Unspecified material';
      const key = `${bom.id}-${code}-${material.unit || ''}`;
      const qty = Number(material.qty) || 0;
      const rate = numeric(material.rate);
      const current = materialAggregate.get(key) || {
        rowKey: key,
        bomId: bom.id,
        bomRevision: bom.revision,
        projectId: bom.projectId,
        projectName: project?.name || projectName(bom.projectId),
        department: project?.department || 'Not recorded',
        materialCode: code,
        unit: material.unit || '',
        quantity: 0,
        rate: rate != null && rate > 0 ? rate : null,
        amount: rate != null && rate > 0 ? 0 : null,
        partNumbers: new Set(),
      };
      current.quantity += qty;
      if (current.rate != null) current.amount = current.quantity * current.rate;
      if (material.partNumber) current.partNumbers.add(material.partNumber);
      materialAggregate.set(key, current);
    });
  });
  materialAggregate.forEach((row) => {
    bomMaterialRows.push({ ...row, partNumbers: [...row.partNumbers] });
  });

  const reviewRows = reviews.map((review) => {
    const project = projectByIdRow.get(review.projectId);
    const design = designByIdRow.get(review.designId);
    const stages = reviewStageStates(review);
    const decisionDate = reviewDecisionDate(review);
    const turnaroundDays = decisionDate ? daysBetween(review.submittedAt, decisionDate) : null;
    const waitingDays = daysBetween(review.submittedAt, decisionDate || REPORT_TODAY);
    const requiredStages = review.requiredStages || [];
    const pendingActions = [];
    if (requiredStages.includes('Engineering') && !['Approved', 'Not Required'].includes(stages.engineering?.status)) {
      pendingActions.push(`Engineering Review: ${stages.engineering?.status || 'Pending'}`);
    }
    if (requiredStages.includes('Manufacturing') && !['Approved', 'Not Required'].includes(stages.manufacturing?.status)) {
      pendingActions.push(`Manufacturing Review: ${stages.manufacturing?.status || 'Pending'}`);
    }
    if (requiredStages.includes('Client') && !['Approved', 'Not Required'].includes(stages.client?.status)) {
      pendingActions.push(`Client Approval: ${stages.client?.status || 'Pending'}`);
    }
    const allStagesApproved = requiredStages.every((stage) => {
      const key = stage.toLowerCase();
      return ['Approved', 'Not Required'].includes(stages[key]?.status);
    });
    if (!review.finalApproval && allStagesApproved) pendingActions.push('Final Approval: Not completed');
    const releaseReadiness = review.release?.status === 'Released'
      ? 'Released'
      : allStagesApproved && review.finalApproval
        ? 'Ready for release'
        : 'Not ready';
    return {
      ...review,
      projectId: review.projectId,
      projectName: project?.name || projectName(review.projectId),
      department: project?.department || 'Not recorded',
      designId: review.designId,
      designNumber: design?.designNumber || designNumber(review.designId),
      designRevision: review.designRevision || design?.revision || '—',
      engineeringReviewer: stages.engineering?.reviewer || review.engineeringReviewer || 'Not recorded',
      manufacturingReviewer: stages.manufacturing?.reviewer || review.manufacturingReviewer || 'Not recorded',
      clientReviewer: stages.client?.reviewer || review.clientReviewer || 'Not required',
      engineeringStatus: stages.engineering?.status || 'Not Required',
      manufacturingStatus: stages.manufacturing?.status || 'Not Required',
      clientApprovalStatus: stages.client?.status || 'Not Required',
      finalApprovalStatus: review.finalApproval?.decision || 'Not completed',
      decisionDate,
      turnaroundDays,
      waitingDays,
      pendingActions,
      releaseReadiness,
      currentStage: review.currentStage || review.status,
      status: review.status || 'Not recorded',
      approvalStatus: review.finalApproval?.decision || review.status || 'Not recorded',
      remarks: [
        stages.engineering?.comments,
        stages.manufacturing?.comments,
        stages.client?.comments,
        review.finalApproval?.comments,
      ].filter(Boolean).at(-1) || 'Not recorded',
      submittedAt: review.submittedAt || '',
      dueDate: review.dueDate || '',
      releaseId: review.release?.releaseId || '',
      owner: stages.engineering?.reviewer || review.engineeringReviewer || 'Not recorded',
      ownerNames: [
        stages.engineering?.reviewer || review.engineeringReviewer,
        stages.manufacturing?.reviewer || review.manufacturingReviewer,
      ].filter((value) => value && value !== 'Not required'),
      searchText: [
        review.id,
        review.projectId,
        project?.name,
        review.designId,
        design?.designNumber,
        review.deliverableNumber,
        review.deliverableName,
        review.deliverableType,
        review.status,
        review.currentStage,
        stages.engineering?.reviewer,
        stages.manufacturing?.reviewer,
        review.release?.releaseId,
        review.designRevision,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });
  const reviewById = new Map(reviewRows.map((row) => [row.id, row]));

  const ecrRows = changes.map((change) => {
    const project = projectByIdRow.get(change.projectId);
    const design = designByIdRow.get(change.designId);
    const linkedDesign = design || designByIdRow.get(project?.relatedDesigns?.[0]?.id);
    const closed = Boolean(change.closedAt) || ['Released', 'Rejected', 'Closed', 'Cancelled'].includes(change.status);
    const implementationStatus = change.status === 'Released'
      ? 'Released'
      : change.status === 'Revision Updated'
        ? 'Revision updated'
        : change.status === 'ECO Approved'
          ? 'ECO approved'
          : change.status === 'Rejected'
            ? 'Not implemented'
            : change.status === 'Impact Assessment' || change.status === 'ECR Submitted'
              ? 'Not started'
              : change.status || 'Not recorded';
    return {
      ...change,
      rowKey: change.id,
      changeType: 'ECR',
      id: change.id,
      projectId: change.projectId,
      projectName: project?.name || projectName(change.projectId),
      department: project?.department || 'Not recorded',
      designId: linkedDesign?.id || change.designId || '',
      designNumber: linkedDesign?.designNumber || designNumber(linkedDesign?.id) || 'Not recorded',
      affectedRevision: change.designRevision || change.currentRevision || '—',
      changeReason: change.changeReason || change.changeDescription || 'Not recorded',
      requestedBy: change.requestedBy || change.raisedBy || 'Not recorded',
      approvalStatus: change.approvalStatus || change.ecrDecision || 'Not recorded',
      implementationStatus,
      verificationStatus: change.revisionUpdated ? 'Revision update recorded' : 'Not recorded',
      closureStatus: closed ? 'Closed' : 'Open',
      createdDate: change.raisedAt || change.requestedDate || '',
      closedDate: change.closedAt || '',
      impactLevel: change.impactLevel || 'Not recorded',
      owner: change.requestedBy || change.raisedBy || 'Not recorded',
      searchText: [
        change.id,
        change.title,
        change.changeReason,
        change.projectId,
        project?.name,
        change.designId,
        change.bomId,
        change.drawingId,
        change.status,
        change.approvalStatus,
        change.requestedBy,
        change.raisedBy,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const ecoRows = ecos.map((eco) => {
    const project = projectByIdRow.get(eco.projectId);
    const linkedEcr = changes.find((row) => row.id === eco.sourceEcrId);
    const design = designByIdRow.get(eco.designId) || designByIdRow.get(linkedEcr?.designId);
    const closed = Boolean(eco.closedAt) || ['Released', 'ECO Rejected', 'Closed', 'Cancelled'].includes(eco.status);
    return {
      ...eco,
      rowKey: eco.id,
      changeType: 'ECO',
      projectId: eco.projectId,
      projectName: project?.name || projectName(eco.projectId),
      department: project?.department || 'Not recorded',
      designId: design?.id || '',
      designNumber: design?.designNumber || designNumber(design?.id) || 'Not recorded',
      affectedRevision: eco.currentRevision || eco.proposedRevision || '—',
      changeReason: eco.technicalImpact || eco.changeDescription || linkedEcr?.changeReason || 'Not recorded',
      requestedBy: eco.createdBy || linkedEcr?.requestedBy || 'Not recorded',
      approvalStatus: eco.approvalStatus || 'Not recorded',
      implementationStatus: eco.status === 'Released' ? 'Released' : eco.status || 'Not recorded',
      verificationStatus: eco.status === 'Released' ? 'Release recorded' : 'Not recorded',
      closureStatus: closed ? 'Closed' : 'Open',
      createdDate: eco.createdAt || eco.effectiveDate || '',
      closedDate: eco.closedAt || '',
      impactLevel: eco.changeCategory || linkedEcr?.impactLevel || 'Not recorded',
      owner: eco.assignedEngineer || eco.createdBy || 'Not recorded',
      sourceEcrId: eco.sourceEcrId || '',
      searchText: [
        eco.id,
        eco.sourceEcrId,
        eco.status,
        eco.projectId,
        project?.name,
        eco.technicalImpact,
        eco.changeDescription,
        eco.createdBy,
        eco.assignedEngineer,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });
  const changeRows = [...ecrRows, ...ecoRows].sort((left, right) => timestamp(right.createdDate) - timestamp(left.createdDate));
  const changeHistoryRows = [];
  changes.forEach((change) => {
    (change.history || []).forEach((entry) => {
      changeHistoryRows.push({
        rowKey: `${change.id}-${entry.id || entry.at}-${entry.action}`,
        changeId: change.id,
        projectId: change.projectId,
        action: entry.action || 'Activity recorded',
        stage: entry.stage || '',
        by: entry.by || 'Not recorded',
        at: entry.at || '',
        statusAfter: entry.statusAfter || entry.newStatus || '',
      });
    });
  });
  ecos.forEach((eco) => {
    (eco.history || []).forEach((entry) => {
      changeHistoryRows.push({
        rowKey: `${eco.id}-${entry.id || entry.at}-${entry.action}`,
        changeId: eco.id,
        projectId: eco.projectId,
        action: entry.action || 'Activity recorded',
        stage: entry.stage || '',
        by: entry.by || 'Not recorded',
        at: entry.at || '',
        statusAfter: entry.statusAfter || entry.newStatus || '',
      });
    });
  });
  changeHistoryRows.sort((left, right) => timestamp(right.at) - timestamp(left.at));

  const manufacturingRows = definitions.map((definition) => {
    const project = projectByIdRow.get(definition.projectId);
    const design = designByIdRow.get(definition.designId)
      || designByIdRow.get(project?.relatedDesigns?.[0]?.id);
    const links = findManufacturingLinks(definition, inspections, processPlans, drawings);
    const handover = handoverForProjectDesign(definition.projectId, design?.id);
    const packageRecord = handover ? packageByHandover.get(handover.id) : null;
    const releaseRecord = handover ? releaseByHandover.get(handover.id) : null;
    const handoverTransfer = handover ? (transfersByHandover.get(handover.id) || [])[0] || null : null;
    const quality = definition.qualityRequirements || links.inspection?.acceptanceCriteria || links.inspection?.criticalToQuality || 'Not recorded';
    const workInstructions = definition.workInstructions || links.processPlan?.workInstructions || 'Not recorded';
    return {
      ...definition,
      rowKey: definition.id,
      projectId: definition.projectId,
      projectName: project?.name || projectName(definition.projectId),
      department: project?.department || 'Not recorded',
      designId: design?.id || '',
      designNumber: design?.designNumber || designNumber(design?.id) || 'Not recorded',
      itemType: definition.partNumber ? 'Part / assembly' : 'Assembly',
      itemNumber: definition.partNumber || definition.assemblyId || 'Not recorded',
      manufacturingProcess: definition.category || definition.manufacturingMethod || 'Not recorded',
      inspectionRequirements: links.inspection?.name || 'No inspection record linked',
      qualityRequirements: quality,
      processPlan: links.processPlan?.name || 'No process plan linked',
      workInstructions,
      manufacturingReviewStatus: ['Approved', 'Released'].includes(definition.status)
        ? 'Approved'
        : definition.status || 'Not recorded',
      handoverId: handover?.id || '',
      handoverStatus: handover?.status || 'No handover',
      packageStatus: packageRecord?.status || 'No package',
      releaseStatus: releaseRecord?.status || 'Not released',
      transferId: handoverTransfer?.id || '',
      transferStatus: handoverTransfer?.status || 'No transfer',
      actualTransferDate: handoverTransfer?.actualTransferDate || '',
      inspection: links.inspection,
      processPlanRecord: links.processPlan,
      drawing: links.drawing,
      handover,
      searchText: [
        definition.id,
        definition.name,
        definition.projectId,
        project?.name,
        definition.partNumber,
        definition.partName,
        design?.designNumber,
        definition.category,
        definition.status,
        links.inspection?.name,
        links.processPlan?.name,
        handover?.id,
        handover?.status,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const handoverReadinessRows = handovers.map((handover) => {
    const project = projectByIdRow.get(handover.projectId);
    const design = designByIdRow.get(handover.designId);
    const packageRecord = packageByHandover.get(handover.id);
    const releaseRecord = releaseByHandover.get(handover.id);
    const handoverTransfer = (transfersByHandover.get(handover.id) || [])[0] || null;
    return {
      ...handover,
      rowKey: handover.id,
      projectName: project?.name || projectName(handover.projectId),
      department: project?.department || 'Not recorded',
      designNumber: design?.designNumber || designNumber(handover.designId),
      packageStatus: packageRecord?.status || 'No package',
      releaseStatus: releaseRecord?.status || 'Not released',
      transferId: handoverTransfer?.id || '',
      transferStatus: handoverTransfer?.status || 'No transfer',
      searchText: [
        handover.id,
        handover.projectId,
        project?.name,
        handover.designId,
        design?.designNumber,
        handover.status,
        packageRecord?.status,
        releaseRecord?.status,
        handoverTransfer?.status,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });

  const projectOwnerWorkload = [...countBy(projectRows, 'owner')].map(([owner, count]) => {
    const ownedProjects = projectRows.filter((row) => row.owner === owner);
    return {
      rowKey: owner,
      owner,
      projects: count,
      active: ownedProjects.filter((row) => !['Completed', 'Cancelled'].includes(row.status)).length,
      completed: ownedProjects.filter((row) => row.status === 'Completed').length,
      delayed: ownedProjects.filter((row) => row.delayStatus === 'Delayed').length,
      designs: designRows.filter((row) => row.owner === owner).length,
      pendingTasks: tasks.filter((row) => row.engineer === owner && row.status !== 'Completed').length,
    };
  }).sort((left, right) => right.projects - left.projects);

  const designOwnerWorkload = [...countBy(designRows, 'owner')].map(([owner, count]) => {
    const ownedDesigns = designRows.filter((row) => row.owner === owner);
    return {
      rowKey: owner,
      owner,
      designs: count,
      approved: ownedDesigns.filter((row) => ['Approved', 'Released'].includes(row.status)).length,
      inProgress: ownedDesigns.filter((row) => ['In Design', 'Under Review', 'Submitted'].includes(row.status)).length,
      changesRequested: ownedDesigns.filter((row) => ['Changes Requested', 'Revision Required', 'Rejected'].includes(row.status)).length,
      released: ownedDesigns.filter((row) => row.isReleased).length,
    };
  }).sort((left, right) => right.designs - left.designs);

  const reviewerMap = new Map();
  reviewRows.forEach((review) => {
    const reviewers = [review.engineeringReviewer, review.manufacturingReviewer].filter(
      (name) => name && name !== 'Not recorded' && name !== 'Not required',
    );
    [...new Set(reviewers)].forEach((reviewer) => {
      const current = reviewerMap.get(reviewer) || {
        rowKey: reviewer,
        reviewer,
        assigned: 0,
        pending: 0,
        approved: 0,
        changesRequested: 0,
      };
      current.assigned += 1;
      if (['Released', 'Rejected', 'Approved'].includes(review.status)) current.approved += 1;
      else current.pending += 1;
      if (review.status === 'Changes Requested') current.changesRequested += 1;
      reviewerMap.set(reviewer, current);
    });
  });
  const reviewerWorkload = [...reviewerMap.values()].sort((left, right) => right.assigned - left.assigned);

  const departmentMap = new Map();
  const departmentRow = (department) => {
    const name = department || 'Not recorded';
    if (!departmentMap.has(name)) {
      departmentMap.set(name, {
        rowKey: name,
        department: name,
        projects: 0,
        designs: 0,
        tasks: 0,
        openTasks: 0,
        overdueTasks: 0,
        pendingReviews: 0,
      });
    }
    return departmentMap.get(name);
  };
  projectRows.forEach((project) => {
    departmentRow(project.department).projects += 1;
  });
  designRows.forEach((design) => {
    departmentRow(design.department).designs += 1;
  });
  tasks.forEach((task) => {
    const department = task.discipline || projectByIdRow.get(task.projectId)?.department;
    const row = departmentRow(department);
    row.tasks += 1;
    if (task.status !== 'Completed') row.openTasks += 1;
    if (task.status !== 'Completed' && task.due && task.due < REPORT_TODAY) row.overdueTasks += 1;
  });
  reviewRows.forEach((review) => {
    if (!['Released', 'Rejected', 'Approved'].includes(review.status)) departmentRow(review.department).pendingReviews += 1;
  });
  const departmentWorkload = [...departmentMap.values()].sort((left, right) => right.projects - left.projects);

  const pendingTaskRows = tasks
    .filter((task) => task.status !== 'Completed')
    .map((task) => {
      const project = projectByIdRow.get(task.projectId);
      const design = designByIdRow.get(task.designId);
      const dueDays = daysBetween(task.due, REPORT_TODAY);
      return {
        ...task,
        rowKey: task.id,
        projectName: project?.name || projectName(task.projectId),
        department: task.discipline || project?.department || 'Not recorded',
        designNumber: design?.designNumber || designNumber(task.designId),
        owner: task.engineer || 'Not recorded',
        overdue: Boolean(task.due && task.due < REPORT_TODAY && task.status !== 'Completed'),
        daysPastDue: task.due && task.due < REPORT_TODAY ? dueDays : null,
        searchText: [task.id, task.name, task.projectId, project?.name, task.engineer, task.status].filter(Boolean).join(' ').toLowerCase(),
      };
    })
    .sort((left, right) => Number(right.overdue) - Number(left.overdue) || timestamp(left.due) - timestamp(right.due));

  const pendingApprovalRows = reviewRows
    .filter((review) => !['Released', 'Rejected', 'Draft'].includes(review.status))
    .sort((left, right) => timestamp(left.submittedAt) - timestamp(right.submittedAt));

  const projectScheduleRows = projectRows.map((project) => {
    const targetDays = project.targetDate ? daysBetween(REPORT_TODAY, project.targetDate) : null;
    const actualVariance = project.actualCompletionDate ? daysBetween(project.targetDate, project.actualCompletionDate) : null;
    return {
      ...project,
      rowKey: project.id,
      targetVarianceDays: targetDays,
      actualVarianceDays: actualVariance,
      completionState: project.actualCompletionDate
        ? actualVariance != null && actualVariance > 0 ? `Completed ${actualVariance} day(s) late` : 'Completed'
        : project.delayStatus === 'Delayed'
          ? 'Delayed; actual completion not recorded'
          : 'Actual completion not recorded',
    };
  });

  const designRevisionRows = designRows.flatMap((design) =>
    (design.revisionHistory || []).map((revision, index) => ({
      ...revision,
      rowKey: `${design.id}-${revision.revision}-${index}`,
      designId: design.id,
      designNumber: design.designNumber,
      projectId: design.projectId,
      projectName: design.projectName,
      department: design.department,
      owner: design.owner,
      status: revision.status || design.status,
    })),
  );

  const changeStatusCounts = countBy(changeRows, 'status');
  const changeTypeCounts = countBy(changeRows, 'changeType');
  const summary = {
    totalProjects: projectRows.length,
    activeProjects: projectRows.filter((row) => !['Completed', 'Cancelled'].includes(row.status)).length,
    completedProjects: projectRows.filter((row) => row.status === 'Completed').length,
    delayedProjects: projectRows.filter((row) => row.delayStatus === 'Delayed').length,
    totalDesigns: designRows.length,
    designsUnderReview: designRows.filter((row) => row.status === 'Under Review').length,
    approvedDesigns: designRows.filter((row) => ['Approved', 'Released'].includes(row.status)).length,
    releasedDesigns: designRows.filter((row) => row.isReleased).length,
    pendingEngineeringReviews: reviewRows.filter((row) => row.engineeringStatus === 'Under Review').length,
    pendingManufacturingReviews: reviewRows.filter((row) => ['Under Review', 'Pending'].includes(row.manufacturingStatus)).length,
    totalCadFiles: cadFileRows.length,
    totalDrawings: drawingRows.length,
    totalBoms: bomRows.length,
    totalManufacturingDefinitions: manufacturingRows.length,
    pendingEngineeringChanges: ecrRows.filter((row) => row.closureStatus === 'Open').length,
    releasedHandovers: handoverReleases.length,
    totalReviews: reviewRows.length,
    releasedReviews: reviewRows.filter((row) => row.status === 'Released').length,
    rejectedReviews: reviewRows.filter((row) => row.status === 'Rejected').length,
    pendingApprovals: pendingApprovalRows.length,
    totalInspections: inspections.length,
    totalProcessPlans: processPlans.length,
    totalHandovers: handovers.length,
    totalChangeRecords: changeRows.length,
    openChangeRecords: changeRows.filter((row) => row.closureStatus === 'Open').length,
    totalEstimatedCost: estimates.reduce(
      (sum, estimate) => sum + (estimate.totalCost != null && Number.isFinite(Number(estimate.totalCost)) ? Number(estimate.totalCost) : 0),
      0,
    ),
    estimatesMissingCost: estimates.filter((estimate) => estimate.totalCost == null || estimate.totalCost === '').length,
    pendingTasks: pendingTaskRows.length,
    overdueTasks: pendingTaskRows.filter((row) => row.overdue).length,
    openTasks: tasks.filter((row) => row.status !== 'Completed').length,
  };

  const model = {
    raw: {
      projects,
      team,
      milestones,
      plans,
      tasks,
      designs,
      parts,
      assemblies,
      files,
      drawings,
      definitions,
      inspections,
      processPlans,
      boms,
      estimates,
      materials,
      quantities,
      reviews,
      changes,
      ecos,
      handovers,
      packages,
      handoverReleases,
      handoverTransfers,
      transfers,
    },
    projects: projectRows,
    designs: designRows,
    cadFiles: cadFileRows,
    drawings: drawingRows,
    boms: bomRows,
    bomItems: bomItemRows,
    bomMaterials: bomMaterialRows,
    reviews: reviewRows,
    changes: changeRows,
    ecrRows,
    ecoRows,
    changeHistory: changeHistoryRows,
    manufacturing: manufacturingRows,
    handovers: handoverReadinessRows,
    designRevisions: designRevisionRows,
    workload: {
      projectOwners: projectOwnerWorkload,
      designOwners: designOwnerWorkload,
      reviewers: reviewerWorkload,
      departments: departmentWorkload,
      pendingTasks: pendingTaskRows,
      pendingApprovals: pendingApprovalRows,
      schedule: projectScheduleRows,
    },
    summary,
    counts: {
      changeStatus: changeStatusCounts,
      changeType: changeTypeCounts,
      designs: countBy(designRows, 'status'),
      reviews: countBy(reviewRows, 'status'),
      cadFormats: countBy(cadFileRows, 'fileType'),
      drawings: countBy(drawingRows, 'approvalStatus'),
      manufacturing: countBy(manufacturingRows, 'status'),
    },
  };
  return model;
}

export const EMPTY_REPORT_FILTERS = {
  search: '',
  project: 'All',
  department: 'All',
  status: 'All',
  approval: 'All',
  revision: 'All',
  owner: 'All',
  from: '',
  to: '',
  format: 'All',
  type: 'All',
  stage: 'All',
  delay: 'All',
  release: 'All',
  pendingStage: 'All',
  open: 'All',
  handover: 'All',
  range: 'all',
};

function inRange(value, from, to) {
  const date = dateOnly(value);
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function getField(row, key) {
  if (typeof key === 'function') return key(row);
  return row?.[key];
}

export function applyReportFilters(rows = [], filters = {}, config = {}) {
  const merged = { ...EMPTY_REPORT_FILTERS, ...filters };
  const {
    searchFields = ['searchText'],
    projectKey = 'projectId',
    departmentKey = 'department',
    statusKey = 'status',
    approvalKey = 'approvalStatus',
    revisionKey = 'revision',
    ownerKey = 'owner',
    formatKey = 'fileType',
    typeKey = 'changeType',
    stageKey = 'currentStage',
    delayKey = 'delayStatus',
    releaseKey = 'releaseStatus',
    pendingStageKey = '',
    openKey = 'closureStatus',
    handoverKey = 'handoverStatus',
    dateKey = '',
  } = config;
  const query = merged.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (query) {
      const haystack = searchFields.map((key) => getField(row, key) || '').join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (merged.project !== 'All' && getField(row, projectKey) !== merged.project) return false;
    if (merged.department !== 'All' && getField(row, departmentKey) !== merged.department) return false;
    if (merged.status !== 'All' && getField(row, statusKey) !== merged.status) return false;
    if (merged.approval !== 'All' && getField(row, approvalKey) !== merged.approval) return false;
    if (merged.revision !== 'All' && String(getField(row, revisionKey) || '') !== merged.revision) return false;
    if (merged.owner !== 'All') {
      const ownerValue = getField(row, ownerKey);
      if (Array.isArray(ownerValue) ? !ownerValue.includes(merged.owner) : ownerValue !== merged.owner) return false;
    }
    if (merged.format !== 'All' && getField(row, formatKey) !== merged.format) return false;
    if (merged.type !== 'All' && getField(row, typeKey) !== merged.type) return false;
    if (merged.stage !== 'All' && getField(row, stageKey) !== merged.stage) return false;
    if (merged.delay !== 'All' && getField(row, delayKey) !== merged.delay) return false;
    if (merged.release !== 'All' && getField(row, releaseKey) !== merged.release) return false;
    if (merged.pendingStage !== 'All') {
      const stageStatus = merged.pendingStage === 'Engineering'
        ? row.engineeringStatus || row.stageStates?.engineering?.status
        : row.manufacturingStatus || row.stageStates?.manufacturing?.status;
      const pendingStatuses = merged.pendingStage === 'Engineering' ? ['Under Review'] : ['Under Review', 'Pending'];
      if (!pendingStatuses.includes(stageStatus)) return false;
    }
    if (merged.open !== 'All' && getField(row, openKey) !== merged.open) return false;
    if (merged.handover !== 'All') {
      const handoverValues = [
        getField(row, handoverKey),
        row.packageStatus,
        row.releaseStatus,
        row.transferStatus,
      ].filter(Boolean);
      if (!handoverValues.includes(merged.handover)) return false;
    }
    if ((merged.from || merged.to) && dateKey && !inRange(getField(row, dateKey), merged.from, merged.to)) return false;
    return true;
  });
}

export function filterProjectScope(rows, filters, { dateKey = 'startDate', projectKey = 'projectId' } = {}) {
  return applyReportFilters(rows, filters, {
    dateKey,
    projectKey,
    statusKey: 'status',
    approvalKey: 'approvalStatus',
    revisionKey: 'revision',
    ownerKey: 'owner',
    departmentKey: 'department',
    delayKey: 'delayStatus',
  });
}

export function rangeDates(filters = {}) {
  const merged = { ...EMPTY_REPORT_FILTERS, ...filters };
  if (merged.range === 'all' || (!merged.range && !merged.from && !merged.to)) return { from: '', to: '' };
  if (merged.from || merged.to) return { from: merged.from, to: merged.to };
  const days = merged.range === '30d' ? 30 : merged.range === '90d' ? 90 : merged.range === '12m' ? 365 : null;
  if (!days) return { from: '', to: '' };
  const end = new Date(`${REPORT_TODAY}T00:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { from: start.toISOString().slice(0, 10), to: REPORT_TODAY };
}

function scopedRows(rows, filters, dateKey, departmentKey = 'department', departmentLookup = null) {
  const { from, to } = rangeDates(filters);
  return rows.filter((row) => {
    if (filters.project && filters.project !== 'All' && row.projectId !== filters.project) return false;
    const department = row[departmentKey] || (departmentLookup && row.projectId ? departmentLookup.get(row.projectId) : '');
    if (filters.department && filters.department !== 'All' && department !== filters.department) return false;
    if ((from || to) && dateKey) {
      const value = typeof dateKey === 'function' ? dateKey(row) : row[dateKey];
      if (!inRange(value, from, to)) return false;
    }
    return true;
  });
}

export function buildDashboardData(model, filters = {}) {
  const merged = { ...EMPTY_REPORT_FILTERS, ...filters };
  const departmentLookup = new Map(model.projects.map((row) => [row.projectId, row.department]));
  const projectRows = scopedRows(model.projects, merged, 'startDate');
  const designRows = scopedRows(model.designs, merged, 'created', 'department', departmentLookup);
  const reviewRows = scopedRows(model.reviews, merged, 'submittedAt', 'department', departmentLookup);
  const cadRows = scopedRows(model.cadFiles, merged, 'uploadedAt', 'department', departmentLookup);
  const drawingRows = scopedRows(model.drawings, merged, 'drawingDate', 'department', departmentLookup);
  const bomRows = scopedRows(model.boms, merged, 'date', 'department', departmentLookup);
  const manufacturingRows = scopedRows(model.manufacturing, merged, 'recordDate', 'department', departmentLookup);
  const cadFiles = cadRows;
  const changes = scopedRows(model.changes, merged, 'createdDate', 'department', departmentLookup);
  const handovers = scopedRows(model.handovers, merged, 'createdAt', 'department', departmentLookup);
  const handoverReleases = scopedRows(model.raw.handoverReleases || [], merged, 'date', 'department', departmentLookup);

  const scopeSummary = {
    totalProjects: projectRows.length,
    activeProjects: projectRows.filter((row) => !['Completed', 'Cancelled'].includes(row.status)).length,
    completedProjects: projectRows.filter((row) => row.status === 'Completed').length,
    delayedProjects: projectRows.filter((row) => row.delayStatus === 'Delayed').length,
    totalDesigns: designRows.length,
    designsUnderReview: designRows.filter((row) => row.status === 'Under Review').length,
    approvedDesigns: designRows.filter((row) => ['Approved', 'Released'].includes(row.status)).length,
    releasedDesigns: designRows.filter((row) => row.isReleased).length,
    pendingEngineeringReviews: reviewRows.filter((row) => row.engineeringStatus === 'Under Review').length,
    pendingManufacturingReviews: reviewRows.filter((row) => ['Under Review', 'Pending'].includes(row.manufacturingStatus)).length,
    totalCadFiles: cadFiles.length,
    totalDrawings: drawingRows.length,
    totalBoms: bomRows.length,
    totalManufacturingDefinitions: manufacturingRows.length,
    pendingEngineeringChanges: changes.filter((row) => row.changeType === 'ECR' && row.closureStatus === 'Open').length,
    releasedHandovers: handoverReleases.length,
    totalReviews: reviewRows.length,
    releasedReviews: reviewRows.filter((row) => row.status === 'Released').length,
    rejectedReviews: reviewRows.filter((row) => row.status === 'Rejected').length,
    pendingApprovals: reviewRows.filter((row) => !['Released', 'Rejected', 'Draft'].includes(row.status)).length,
    totalInspections: scopedRows(model.raw.inspections || [], merged, 'recordDate', 'department', departmentLookup).length,
    totalProcessPlans: scopedRows(model.raw.processPlans || [], merged, 'recordDate', 'department', departmentLookup).length,
    totalHandovers: handovers.length,
    totalChangeRecords: changes.length,
    openChangeRecords: changes.filter((row) => row.closureStatus === 'Open').length,
    pendingTasks: scopedRows(model.raw.tasks || [], merged, 'due', 'discipline', departmentLookup).filter((row) => row.status !== 'Completed').length,
    overdueTasks: scopedRows(model.raw.tasks || [], merged, 'due', 'discipline', departmentLookup).filter((row) => row.status !== 'Completed' && row.due && row.due < REPORT_TODAY).length,
  };

  const monthMap = new Map();
  const addMonth = (date, key, value = 1) => {
    const month = dateOnly(date).slice(0, 7);
    if (!month) return;
    const current = monthMap.get(month) || { month, projectStarts: 0, designRegistrations: 0, reviewSubmissions: 0, cadUploads: 0, drawingIssues: 0, changes: 0 };
    current[key] += value;
    monthMap.set(month, current);
  };
  projectRows.forEach((row) => addMonth(row.startDate, 'projectStarts'));
  designRows.forEach((row) => addMonth(row.created, 'designRegistrations'));
  reviewRows.forEach((row) => addMonth(row.submittedAt, 'reviewSubmissions'));
  cadFiles.forEach((row) => addMonth(row.uploadedAt, 'cadUploads'));
  drawingRows.forEach((row) => addMonth(row.drawingDate, 'drawingIssues'));
  changes.forEach((row) => addMonth(row.createdDate, 'changes'));
  const monthly = [...monthMap.values()].sort((left, right) => left.month.localeCompare(right.month));

  const costRows = bomRows
    .filter((row) => row.totalCost != null)
    .map((row) => ({ key: row.id, label: row.id, value: row.totalCost, color: STATUS_COLORS[row.status] || '#0B7A68' }));
  const estimateCount = bomRows.filter((row) => row.estimate).length;
  const totalEstimatedCost = bomRows.reduce((sum, row) => sum + (row.totalCost == null ? 0 : row.totalCost), 0);

  return {
    ...scopeSummary,
    projectRows,
    designRows,
    reviewRows,
    cadFiles,
    drawingRows,
    bomRows,
    manufacturingRows,
    changes,
    handovers,
    charts: {
      projectStatus: seriesFromCounts(countBy(projectRows, 'status'), { order: ALL_PROJECT_STATUSES }),
      designStatus: seriesFromCounts(countBy(designRows, 'status'), { order: ['Draft', 'In Design', 'Under Review', 'Submitted', 'Approved', 'Changes Requested', 'Revision Required', 'Released', 'Superseded'] }),
      reviewStatus: seriesFromCounts(countBy(reviewRows, 'status'), { keyPrefix: 'review' }),
      cadFormats: seriesFromCounts(countBy(cadFiles, 'fileType'), { keyPrefix: 'format' }),
      drawingStatus: seriesFromCounts(countBy(drawingRows, 'approvalStatus'), { keyPrefix: 'drawing' }),
      changeStatus: seriesFromCounts(countBy(changes, 'status'), { keyPrefix: 'change' }),
      delayStatus: seriesFromCounts(countBy(projectRows, 'delayStatus'), {
        order: ['Not delayed', 'Delayed', 'Completed'],
        keyPrefix: 'delay',
      }),
      monthly,
      cost: costRows,
      estimateCount,
      totalEstimatedCost,
      monthlyTotals: {
        projectStarts: projectRows.length,
        designRegistrations: designRows.length,
        reviewSubmissions: reviewRows.length,
        cadUploads: cadFiles.length,
        drawingIssues: drawingRows.length,
        changes: changes.length,
      },
    },
  };
}

export function optionsForTab(tabKey, model) {
  const options = {
    projects: [...model.projects].map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })).sort((left, right) => left.label.localeCompare(right.label)),
    departments: [...new Set(model.projects.map((row) => row.department).filter(Boolean))].sort(),
    statuses: [],
    approvals: [],
    revisions: [],
    owners: [],
    formats: [],
    types: [],
    stages: [],
    delays: [],
    releases: [],
    pendingStages: [
      { value: 'Engineering', label: 'Engineering Review' },
      { value: 'Manufacturing', label: 'Manufacturing Review' },
    ],
    opens: ['Open', 'Closed'],
    handovers: [],
  };
  const add = (target, values) => {
    options[target] = uniqueValues(values).sort();
  };
  if (tabKey === 'project-progress') {
    add('statuses', model.projects.map((row) => row.status));
    add('owners', model.projects.map((row) => row.owner));
    add('delays', model.projects.map((row) => row.delayStatus));
  } else if (tabKey === 'design-status') {
    add('statuses', model.designs.map((row) => row.status));
    add('approvals', model.designs.map((row) => row.reviewStatus));
    add('revisions', model.designs.map((row) => row.revision));
    add('owners', model.designs.map((row) => row.owner));
    add('releases', model.designs.map((row) => row.releaseStatus));
  } else if (tabKey === 'cad-drawing') {
    add('statuses', [...model.cadFiles, ...model.drawings].map((row) => row.status || row.approvalStatus));
    add('revisions', [...model.cadFiles, ...model.drawings].map((row) => row.revision));
    add('formats', [...model.cadFiles.map((row) => row.fileType), ...model.drawings.map((row) => row.format)]);
    add('owners', [...model.cadFiles.map((row) => row.uploadedBy), ...model.drawings.map((row) => row.preparedBy)]);
    add('releases', model.drawings.map((row) => row.releaseStatus));
  } else if (tabKey === 'bom-cost') {
    add('statuses', model.boms.map((row) => row.status));
    add('revisions', model.boms.map((row) => row.revision));
    add('owners', model.boms.map((row) => row.engineer));
  } else if (tabKey === 'review-approval') {
    add('statuses', model.reviews.map((row) => row.status));
    add('approvals', model.reviews.flatMap((row) => [row.engineeringStatus, row.manufacturingStatus, row.clientApprovalStatus]));
    add('revisions', model.reviews.map((row) => row.designRevision));
    add('owners', model.reviews.flatMap((row) => [row.engineeringReviewer, row.manufacturingReviewer]));
    add('stages', model.reviews.map((row) => row.currentStage));
  } else if (tabKey === 'engineering-change') {
    add('statuses', model.changes.map((row) => row.status));
    add('approvals', model.changes.map((row) => row.approvalStatus));
    add('types', model.changes.map((row) => row.changeType));
    add('owners', model.changes.map((row) => row.owner));
    add('revisions', model.changes.map((row) => row.affectedRevision));
  } else if (tabKey === 'manufacturing') {
    add('statuses', model.manufacturing.flatMap((row) => [row.status, row.manufacturingReviewStatus]));
    add('approvals', model.manufacturing.map((row) => row.manufacturingReviewStatus));
    add('owners', model.manufacturing.flatMap((row) => [row.engineer, row.createdBy]));
    add('revisions', model.manufacturing.map((row) => row.revision));
    add('handovers', model.handovers.flatMap((row) => [row.status, row.packageStatus, row.releaseStatus, row.transferStatus]));
  } else if (tabKey === 'workload-delay') {
    add('owners', [...model.workload.projectOwners.map((row) => row.owner), ...model.workload.designOwners.map((row) => row.owner), ...model.workload.reviewers.map((row) => row.reviewer)]);
  }
  return options;
}

export function toCsvColumns(columns) {
  return columns
    .filter((column) => !column.noExport)
    .map((column) => ({
      key: column.key,
      label: column.label,
      value: column.exportValue || ((row) => {
        if (column.export === false) return '';
        const raw = column.exportKey ? row[column.exportKey] : row[column.key];
        return raw == null || raw === '' ? 'Not recorded' : raw;
      }),
    }));
}
