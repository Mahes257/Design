/**
 * Module 16 — Reports & Analytics insight model.
 *
 * Everything here is derived from the existing local module datasets. Nothing
 * is fetched, persisted or written back: report creation, editing and approval
 * workflows deliberately do not exist in this reporting workspace.
 */
import {
  ALL_PROJECT_STATUSES,
  ENGINEERS,
  MILESTONES,
  PROJECTS,
  PROJECT_DOMAINS,
  TODAY,
  addDays,
  daysBetween,
  formatDate,
  projectIsActive,
} from './projectData';
import { DESIGN_TASKS, TASK_STATUSES } from './planningData';
import {
  CAD_FILES,
  DRAWINGS,
  DRAWING_STATUSES,
} from './cadData';
import {
  BOMS,
  BOM_STATUSES,
  COST_ESTIMATES,
  COST_STATUSES,
  LABOUR_ESTIMATES,
  MATERIAL_REQUIREMENTS,
  materialByCode,
} from './bomData';
import { REVIEWS, REVIEW_STATUSES } from './approvalsData';
import { CHANGES, ECOS } from './engineeringReleaseData';
import { MONTHLY_PROGRESS } from './dashboardData';

export const REPORT_CATEGORIES = [
  {
    key: 'project-reports',
    label: 'Project Reports',
    description: 'Project status, completion, engineering domain and delivery timeline analytics.',
  },
  {
    key: 'design-progress',
    label: 'Design Progress',
    description: 'Task completion, design progress, workload and planned versus actual performance.',
  },
  {
    key: 'cad-drawing-reports',
    label: 'CAD / Drawing Reports',
    description: 'CAD repository, drawing revision, approval and release analytics.',
  },
  {
    key: 'bom-reports',
    label: 'BOM Reports',
    description: 'BOM coverage, item structure, materials, revisions and make/buy analytics.',
  },
  {
    key: 'cost-reports',
    label: 'Cost Reports',
    description: 'Engineering estimates, material and process cost, project comparison and trends.',
  },
  {
    key: 'approval-reports',
    label: 'Approval Reports',
    description: 'Review status, stage completion, pending reviews and turnaround analytics.',
  },
  {
    key: 'change-reports',
    label: 'Change Reports',
    description: 'ECR and ECO activity, project distribution, revision impact and change closure.',
  },
  {
    key: 'workload-delay-reports',
    label: 'Workload / Delay Reports',
    description: 'Engineer and project workload, overdue activities, delayed projects and schedule performance.',
  },
];

export const ANALYTICS_RANGES = [
  { value: '30d', label: 'Last 30 Days', days: 30 },
  { value: '3m', label: 'Last 3 Months', days: 92 },
  { value: '6m', label: 'Last 6 Months', days: 183 },
  { value: '12m', label: 'Last 12 Months', days: 365 },
  { value: 'all', label: 'All Time', days: null },
];

export const DEFAULT_FILTERS = {
  range: '12m',
  project: 'All',
  domain: 'All',
  engineer: 'All',
  status: 'All',
};

const CHANGE_CASES = [
  ...CHANGES.map((row) => ({
    ...row,
    caseType: 'Engineering Change Request (ECR)',
    assignedEngineer: row.raisedBy || '',
    requestedDate: row.raisedAt || '',
    drawingRevision: row.currentDrawingRevision || '',
    changeJustification: row.changeReason || '',
    approvedChangeDetails: row.decisionComments || '',
    updatedAt: row.revisionUpdatedAt || row.ecoApprovedAt || row.impactAssessedAt || row.raisedAt || '',
  })),
  ...ECOS.map((row) => ({
    ...row,
    caseType: 'Engineering Change Order (ECO)',
    assignedEngineer: row.assignedEngineer || row.createdBy || '',
    requestedDate: row.createdAt || '',
    drawingRevision: row.currentRevision || '',
    changeJustification: row.changeDescription || '',
    approvedChangeDetails: row.decisionComments || '',
    updatedAt: row.reviewedAt || row.createdAt || '',
  })),
];

const CHANGE_STATUSES = [...new Set(CHANGE_CASES.map((row) => row.status))].sort();

export const STATUS_OPTIONS = {
  'project-reports': ALL_PROJECT_STATUSES,
  'design-progress': TASK_STATUSES,
  'cad-drawing-reports': DRAWING_STATUSES,
  'bom-reports': BOM_STATUSES,
  'cost-reports': COST_STATUSES,
  'approval-reports': REVIEW_STATUSES,
  'change-reports': CHANGE_STATUSES,
  'workload-delay-reports': TASK_STATUSES,
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
];

const TEAL_SCALE = ['#0B7A68', '#159A85', '#2FAF97', '#5BC0A8', '#88D1C1', '#B7E4DA'];

function withTeal(data) {
  return data.map((item, index) => ({ ...item, color: TEAL_SCALE[index % TEAL_SCALE.length] }));
}

const LABEL_COLORS = {
  Completed: '#0B7A68',
  Approved: '#16A34A',
  Released: '#16A34A',
  Implemented: '#16A34A',
  Closed: '#64748B',
  'In Progress': '#2563EB',
  'Design In Progress': '#2563EB',
  'Manufacturing In Progress': '#2563EB',
  'In Implementation': '#2563EB',
  Assigned: '#0EA5E9',
  'Under Planning': '#0EA5E9',
  Submitted: '#7C3AED',
  'Under Review': '#7C3AED',
  'In Review': '#7C3AED',
  'Under Engineering Review': '#7C3AED',
  'Under Manufacturing Review': '#7C3AED',
  'Under Client Review': '#7C3AED',
  'Impact Assessment': '#D97706',
  'Approval Pending': '#D97706',
  'Pending Review': '#D97706',
  'Changes Requested': '#D97706',
  'Verification Pending': '#D97706',
  Delayed: '#DC2626',
  Blocked: '#DC2626',
  Rejected: '#DC2626',
  'On Hold': '#94A3B8',
  'Not Started': '#94A3B8',
  Draft: '#94A3B8',
  'Not Required': '#CBD5E1',
  Pending: '#D97706',
  'Make': '#0B7A68',
  Buy: '#2563EB',
  'Make / Buy': '#7C3AED',
  Transferred: '#0B7A68',
  'Approved for ECO': '#16A34A',
  ECR: '#2563EB',
  ECO: '#0B7A68',
};

const COMPLETION_BUCKETS = [
  { key: '0-25', label: '0–25%', test: (value) => value <= 25 },
  { key: '26-50', label: '26–50%', test: (value) => value > 25 && value <= 50 },
  { key: '51-75', label: '51–75%', test: (value) => value > 50 && value <= 75 },
  { key: '76-99', label: '76–99%', test: (value) => value > 75 && value < 100 },
  { key: '100', label: 'Completed', test: (value) => value === 100 },
];

const PROJECT_STATUS_FINAL = ['Completed', 'Cancelled'];
const REVIEW_FINAL = ['Approved', 'Rejected', 'Released'];
const CHANGE_CLOSED = ['Implemented', 'Closed', 'Rejected', 'Cancelled'];

const projectById = new Map(PROJECTS.map((project) => [project.id, project]));

function projectName(projectId) {
  return projectById.get(projectId)?.name || projectId;
}

function normalizeFilters(filters = {}) {
  return { ...DEFAULT_FILTERS, ...filters };
}

function rangeBounds(range) {
  const option = ANALYTICS_RANGES.find((item) => item.value === range) || ANALYTICS_RANGES[3];
  if (option.days == null) return { from: null, to: null, label: option.label, option };
  return {
    from: addDays(TODAY, -option.days),
    to: TODAY,
    label: option.label,
    option,
  };
}

function dateWithin(date, bounds) {
  if (!date) return false;
  if (!bounds.from) return true;
  return date >= bounds.from && date <= bounds.to;
}

function projectWithin(project, bounds) {
  if (!bounds.from) return true;
  return project.start <= bounds.to && project.target >= bounds.from;
}

function baseProjectIds(filters) {
  return new Set(
    PROJECTS.filter(
      (project) =>
        (filters.project === 'All' || project.id === filters.project) &&
        (filters.domain === 'All' || project.domain === filters.domain),
    ).map((project) => project.id),
  );
}

function engineerInProject(project, engineer) {
  if (engineer === 'All') return true;
  return [project.manager, project.reviewer, ...(project.engineers || []), ...(project.members || [])].includes(
    engineer,
  );
}

function filteredProjects(filters, bounds, { applyStatus = true } = {}) {
  const ids = baseProjectIds(filters);
  return PROJECTS.filter((project) => {
    if (!ids.has(project.id)) return false;
    if (!engineerInProject(project, filters.engineer)) return false;
    if (!projectWithin(project, bounds)) return false;
    if (applyStatus && filters.status !== 'All' && project.status !== filters.status) return false;
    return true;
  });
}

function filteredTasks(filters, bounds) {
  const ids = baseProjectIds(filters);
  return DESIGN_TASKS.filter((task) => {
    if (!ids.has(task.projectId)) return false;
    if (filters.engineer !== 'All' && task.engineer !== filters.engineer) return false;
    if (!dateWithin(task.due, bounds)) return false;
    if (filters.status !== 'All' && task.status !== filters.status) return false;
    return true;
  });
}

function filteredDrawings(filters, bounds) {
  const ids = baseProjectIds(filters);
  return DRAWINGS.filter((drawing) => {
    if (!ids.has(drawing.projectId)) return false;
    if (
      filters.engineer !== 'All' &&
      ![drawing.preparedBy, drawing.reviewedBy].includes(filters.engineer)
    ) {
      return false;
    }
    if (!dateWithin(drawing.drawingDate, bounds)) return false;
    if (filters.status !== 'All' && drawing.approvalStatus !== filters.status) return false;
    return true;
  });
}

function filteredCadFiles(filters, bounds) {
  const ids = baseProjectIds(filters);
  return CAD_FILES.filter((file) => {
    if (!ids.has(file.projectId)) return false;
    if (filters.engineer !== 'All' && file.uploadedBy !== filters.engineer) return false;
    return dateWithin(file.uploadedAt, bounds);
  });
}

function filteredBoms(filters, bounds) {
  const ids = baseProjectIds(filters);
  return BOMS.filter((bom) => {
    if (!ids.has(bom.projectId)) return false;
    if (filters.engineer !== 'All' && bom.engineer !== filters.engineer) return false;
    if (!dateWithin(bom.date, bounds)) return false;
    if (filters.status !== 'All' && bom.status !== filters.status) return false;
    return true;
  });
}

function filteredCostEstimates(filters, bounds) {
  const ids = baseProjectIds(filters);
  return COST_ESTIMATES.filter((estimate) => {
    if (!ids.has(estimate.projectId)) return false;
    if (filters.engineer !== 'All' && estimate.preparedBy !== filters.engineer) return false;
    if (!dateWithin(estimate.date, bounds)) return false;
    if (filters.status !== 'All' && estimate.status !== filters.status) return false;
    return true;
  });
}

function filteredReviews(filters, bounds) {
  const ids = baseProjectIds(filters);
  return REVIEWS.filter((review) => {
    if (!ids.has(review.projectId)) return false;
    if (
      filters.engineer !== 'All' &&
      ![review.submittedBy, review.engineeringReviewer, review.manufacturingReviewer].includes(
        filters.engineer,
      )
    ) {
      return false;
    }
    if (!dateWithin(review.submittedAt, bounds)) return false;
    if (filters.status !== 'All' && review.status !== filters.status) return false;
    return true;
  });
}

function filteredChanges(filters, bounds) {
  const ids = baseProjectIds(filters);
  return CHANGE_CASES.filter((changeCase) => {
    if (!ids.has(changeCase.projectId)) return false;
    if (filters.engineer !== 'All' && changeCase.assignedEngineer !== filters.engineer) {
      return false;
    }
    if (!dateWithin(changeCase.requestedDate, bounds)) return false;
    if (filters.status !== 'All' && changeCase.status !== filters.status) return false;
    return true;
  });
}

/* --------------------------------------------------------------- utilities */
export function formatCurrency(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)} Cr`;
  if (Math.abs(amount) >= 100_000) return `₹${(amount / 100_000).toFixed(1)} L`;
  if (Math.abs(amount) >= 1_000) return `₹${(amount / 1_000).toFixed(1)}k`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function percent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function seriesFromValues(values, order = []) {
  const counts = new Map();
  values.forEach((value) => {
    if (value == null || value === '') return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  const keys = [
    ...order.filter((key) => counts.has(key)),
    ...[...counts.keys()].filter((key) => !order.includes(key)).sort(),
  ];
  return keys.map((key, index) => ({
    key,
    label: key,
    value: counts.get(key),
    color: LABEL_COLORS[key] || PALETTE[index % PALETTE.length],
  }));
}

function seriesFromRows(rows, getter, order = []) {
  return seriesFromValues(rows.map(getter), order);
}

function monthLabel(key) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', {
    month: 'short',
    year: '2-digit',
  });
}

function monthlySeries(rows, dateGetter) {
  const counts = new Map();
  rows.forEach((row) => {
    const date = dateGetter(row);
    if (!date) return;
    const key = String(date).slice(0, 7);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, label: monthLabel(key), value }));
}

function matrixFromRows(rows, { groupBy, labelFor, seriesBy, seriesOrder = [] }) {
  const groups = new Map();
  rows.forEach((row) => {
    const groupKey = groupBy(row);
    const seriesKey = seriesBy(row);
    if (!groupKey || !seriesKey) return;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        label: labelFor(row),
        values: new Map(),
        total: 0,
      });
    }
    const group = groups.get(groupKey);
    group.values.set(seriesKey, (group.values.get(seriesKey) || 0) + 1);
    group.total += 1;
  });

  const present = new Set(rows.map(seriesBy).filter(Boolean));
  const seriesKeys = [
    ...seriesOrder.filter((key) => present.has(key)),
    ...[...present].filter((key) => !seriesOrder.includes(key)).sort(),
  ];

  return {
    series: seriesKeys.map((key, index) => ({
      key,
      label: key,
      color: LABEL_COLORS[key] || PALETTE[index % PALETTE.length],
    })),
    data: [...groups.values()]
      .sort((left, right) => right.total - left.total)
      .slice(0, 8)
      .map((group) => ({
        key: group.key,
        label: group.label,
        values: seriesKeys.map((key) => group.values.get(key) || 0),
        total: group.total,
      })),
  };
}

function taskCompletionTrend(tasks) {
  if (!tasks.length) return [];
  const months = [...new Set(tasks.map((task) => task.due.slice(0, 7)))].sort();
  return months.map((key) => {
    const due = tasks.filter((task) => task.due.slice(0, 7) <= key);
    const completed = due.filter((task) => task.status === 'Completed');
    return {
      key,
      month: monthLabel(key),
      planned: Math.round((due.length / tasks.length) * 100),
      actual: Math.round((completed.length / tasks.length) * 100),
    };
  });
}

function drawingRevisionTrend(drawings, bounds) {
  const revisions = drawings.flatMap((drawing) =>
    (drawing.revisions || []).filter((revision) => dateWithin(revision.date, bounds)),
  );
  return monthlySeries(revisions, (revision) => revision.date);
}

function bomMaterialTreemap(materials) {
  const values = new Map();
  materials.forEach((row) => {
    const label = materialByCode(row.materialCode)?.name || 'Other material';
    values.set(label, (values.get(label) || 0) + Number(row.qty || 0) * Number(row.rate || 0));
  });
  return [...values.entries()]
    .map(([label, value], index) => ({
      key: label,
      label,
      value,
      color: PALETTE[index % PALETTE.length],
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
}

function bomCompletionProgress(boms) {
  const groups = new Map();
  boms.forEach((bom) => {
    if (!groups.has(bom.projectId)) {
      groups.set(bom.projectId, { key: bom.projectId, label: projectName(bom.projectId), rows: [] });
    }
    groups.get(bom.projectId).rows.push(bom);
  });
  return [...groups.values()]
    .map((group, index) => {
      const completed = group.rows.filter((bom) => ['Approved', 'Released'].includes(bom.status)).length;
      return {
        key: group.key,
        label: group.label,
        value: Math.round((completed / group.rows.length) * 100),
        meta: `${completed} of ${group.rows.length} BOM${group.rows.length === 1 ? '' : 's'} approved or released`,
        color: TEAL_SCALE[index % TEAL_SCALE.length],
      };
    })
    .sort((left, right) => right.value - left.value);
}

function engineerProjectHeatmap(tasks) {
  const engineers = [...new Set(tasks.map((task) => task.engineer))].sort();
  const projectIds = [...new Set(tasks.map((task) => task.projectId))];
  const counts = new Map();
  tasks.forEach((task) => {
    const key = `${task.engineer}|${task.projectId}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const rows = engineers.map((engineer) => ({ key: engineer, label: engineer }));
  const columns = projectIds
    .map((projectId) => ({ key: projectId, label: projectName(projectId) }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const cells = rows.flatMap((row) =>
    columns.map((column) => ({
      row: row.key,
      column: column.key,
      value: counts.get(`${row.key}|${column.key}`) || 0,
    })),
  );
  return {
    rows,
    columns,
    cells,
    max: Math.max(...cells.map((cell) => cell.value), 1),
  };
}

function approvalFunnel(reviews) {
  const proceeded = (review, stage) => {
    const status = review.stageStates?.[stage]?.status;
    if (['Approved', 'Rejected', 'Changes Requested', 'Not Required'].includes(status)) return true;
    if (stage === 'engineering') {
      return !['Draft', 'Under Engineering Review'].includes(review.status);
    }
    if (stage === 'manufacturing') {
      return ['Pending Client Submission', 'Submitted to Client', 'Under Client Review', 'Approved', 'Rejected', 'Released'].includes(review.status);
    }
    return ['Approved', 'Released', 'Rejected'].includes(review.status);
  };
  const raw = [
    { key: 'submitted', label: 'Reviews in scope', value: reviews.length, color: '#64748B' },
    {
      key: 'engineering',
      label: 'Engineering decision',
      value: reviews.filter((review) => proceeded(review, 'engineering')).length,
      color: '#2563EB',
    },
    {
      key: 'manufacturing',
      label: 'Manufacturing decision',
      value: reviews.filter((review) => proceeded(review, 'manufacturing')).length,
      color: '#7C3AED',
    },
    {
      key: 'released',
      label: 'Approved / released',
      value: reviews.filter((review) => ['Approved', 'Released'].includes(review.status)).length,
      color: '#0B7A68',
    },
  ];
  let previous = Infinity;
  return raw.map((step) => {
    const value = Math.min(previous, step.value);
    previous = value;
    return { ...step, value };
  });
}

function changeActivityTimeline(changeCases) {
  const items = changeCases
    .map((row) => {
      const start = row.requestedDate;
      let end = String(row.updatedAt || '').slice(0, 10);
      if (!end || end < start) end = row.dueDate < start ? start : row.dueDate;
      const type = row.caseType.includes('ECO') ? 'ECO' : 'ECR';
      return {
        key: row.id,
        label: row.title,
        reference: row.id,
        start,
        end,
        status: row.status,
        type,
        color: type === 'ECO' ? '#0B7A68' : '#2563EB',
      };
    })
    .sort((left, right) => left.start.localeCompare(right.start));
  if (!items.length) return { data: [], bounds: null };
  return {
    data: items,
    bounds: {
      start: items.reduce((earliest, item) => (item.start < earliest ? item.start : earliest), items[0].start),
      end: items.reduce((latest, item) => (item.end > latest ? item.end : latest), items[0].end),
    },
  };
}

function pendingStage(review, stage) {
  const status = review?.stageStates?.[stage]?.status;
  return status && !['Approved', 'Not Required', 'Rejected', 'Changes Requested'].includes(status);
}

function plannedTaskProgress(task) {
  if (task.status === 'Completed') return 100;
  const duration = Math.max(daysBetween(task.start, task.due), 1);
  const elapsed = daysBetween(task.start, TODAY);
  return Math.max(0, Math.min(100, Math.round((elapsed / duration) * 100)));
}

function projectCompletion(tasks) {
  const grouped = new Map();
  tasks.forEach((task) => {
    const current = grouped.get(task.projectId) || { planned: 0, actual: 0, count: 0 };
    current.planned += plannedTaskProgress(task);
    current.actual += Number(task.progress) || 0;
    current.count += 1;
    grouped.set(task.projectId, current);
  });
  return [...grouped.entries()]
    .map(([projectId, value]) => ({
      key: projectId,
      label: projectName(projectId),
      planned: Math.round(value.planned / value.count),
      actual: Math.round(value.actual / value.count),
      count: value.count,
    }))
    .sort((left, right) => right.actual - left.actual)
    .slice(0, 6);
}

function milestoneTrend(milestones) {
  if (!milestones.length) return [];
  return MONTHLY_PROGRESS.map((point, index) => {
    const month = String(index + 4).padStart(2, '0');
    const monthEnd = `2026-${month}-28`;
    const planned = milestones.filter((milestone) => milestone.planned <= monthEnd).length;
    const actual = milestones.filter(
      (milestone) => milestone.actual && milestone.actual <= monthEnd,
    ).length;
    return {
      month: point.month,
      planned: Math.round((planned / milestones.length) * 100),
      actual: Math.round((actual / milestones.length) * 100),
    };
  });
}

function stageStatus(review, stage) {
  return review?.stageStates?.[stage]?.status || 'Not Required';
}

function turnaroundTrend(reviews) {
  const grouped = new Map();
  reviews.forEach((review) => {
    const decisions = ['engineering', 'manufacturing', 'client']
      .map((stage) => review?.stageStates?.[stage]?.decidedAt)
      .filter(Boolean)
      .sort();
    const decided = decisions.at(-1);
    if (!decided || !review.submittedAt) return;
    const days = Math.max(daysBetween(review.submittedAt, decided), 0);
    const key = decided.slice(0, 7);
    const current = grouped.get(key) || { total: 0, count: 0 };
    current.total += days;
    current.count += 1;
    grouped.set(key, current);
  });
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
      }),
      value: Number((value.total / value.count).toFixed(1)),
    }));
}

/* -------------------------------------------------------------------- KPIs */
export function buildReportKpis(filters = {}) {
  const normalized = normalizeFilters(filters);
  const bounds = rangeBounds(normalized.range);
  const projects = filteredProjects(normalized, bounds, { applyStatus: false });
  const projectIds = new Set(projects.map((project) => project.id));
  const reviews = REVIEWS.filter(
    (review) =>
      projectIds.has(review.projectId) &&
      dateWithin(review.submittedAt, bounds) &&
      (normalized.engineer === 'All' ||
        [review.submittedBy, review.engineeringReviewer, review.manufacturingReviewer].includes(
          normalized.engineer,
        )),
  );

  const total = projects.length;
  const active = projects.filter(projectIsActive).length;
  const completed = projects.filter((project) => project.status === 'Completed').length;
  const pending = reviews.filter((review) => !REVIEW_FINAL.includes(review.status));
  const engineeringPending = pending.filter((review) => pendingStage(review, 'engineering')).length;
  const manufacturingPending = pending.filter((review) =>
    pendingStage(review, 'manufacturing'),
  ).length;
  const domainCount = new Set(projects.map((project) => project.domain)).size;

  return [
    {
      key: 'projects',
      label: 'Total Projects',
      value: String(total),
      sub: `${domainCount} engineering domain${domainCount === 1 ? '' : 's'} in scope`,
      tone: 'teal',
    },
    {
      key: 'active',
      label: 'Active Projects',
      value: String(active),
      sub: `${projects.filter((project) => project.status === 'On Hold').length} on hold · ${
        projects.filter((project) => project.delayed).length
      } delayed`,
      tone: 'blue',
    },
    {
      key: 'completed',
      label: 'Completed Designs',
      value: String(completed),
      sub: total ? `${percent((completed / total) * 100)} of filtered projects` : 'No projects in scope',
      tone: 'green',
    },
    {
      key: 'approvals',
      label: 'Pending Approvals',
      value: String(pending.length),
      sub: `${engineeringPending} engineering · ${manufacturingPending} manufacturing`,
      tone: 'amber',
    },
  ];
}

export function statusOptionsFor(categoryKey) {
  return STATUS_OPTIONS[categoryKey] || [];
}

/* --------------------------------------------------------- category views */
function buildProjectView(filters, bounds) {
  const projects = filteredProjects(filters, bounds);
  const projectIds = new Set(projects.map((project) => project.id));
  const milestones = MILESTONES.filter((milestone) => projectIds.has(milestone.projectId));
  const statusData = seriesFromRows(projects, (project) => project.status, ALL_PROJECT_STATUSES);
  const domainData = withTeal(
    seriesFromRows(projects, (project) => project.domain, PROJECT_DOMAINS),
  );
  const completionData = COMPLETION_BUCKETS.map((bucket, index) => ({
    key: bucket.key,
    label: bucket.label,
    value: projects.filter((project) => bucket.test(project.progress)).length,
    color: TEAL_SCALE[index % TEAL_SCALE.length],
  })).filter((item) => item.value > 0);

  const timeline = [...projects]
    .sort((left, right) => left.start.localeCompare(right.start))
    .slice(0, 6)
    .map((project) => ({
      key: project.id,
      label: project.name,
      start: project.start,
      target: project.target,
      progress: project.progress,
      status: project.status,
    }));
  const timelineBounds = projects.length
    ? {
        start: projects.reduce(
          (earliest, project) => (project.start < earliest ? project.start : earliest),
          projects[0].start,
        ),
        end: projects.reduce(
          (latest, project) => (project.target > latest ? project.target : latest),
          projects[0].target,
        ),
      }
    : null;

  return {
    summary: [
      { label: 'Portfolio value', value: formatCount(projects.length), sub: 'projects in scope' },
      {
        label: 'Average progress',
        value: projects.length
          ? percent(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
          : '—',
        sub: 'completion across projects',
      },
      { label: 'Milestones', value: formatCount(milestones.length), sub: 'tracked delivery points' },
      {
        label: 'Delayed',
        value: formatCount(projects.filter((project) => project.delayed).length),
        sub: 'projects needing attention',
      },
    ],
    count: projects.length,
    countLabel: 'projects',
    cards: [
      {
        key: 'project-status',
        title: 'Project status distribution',
        subtitle: 'Portfolio mix by current project lifecycle state',
        type: 'donut',
        data: statusData,
        centerValue: projects.length,
        centerLabel: 'Projects',
      },
      {
        key: 'completion',
        title: 'Project completion overview',
        subtitle: 'Projects grouped by design completion band',
        type: 'bars',
        data: completionData,
      },
      {
        key: 'domain',
        title: 'Projects by engineering domain',
        subtitle: 'Demand across the engineering design disciplines',
        type: 'donut',
        data: domainData,
        centerValue: projects.length,
        centerLabel: 'Projects',
      },
      {
        key: 'progress-trend',
        title: 'Project progress trends',
        subtitle: 'Milestone-based planned versus actual portfolio completion, Apr–Nov 2026',
        type: 'percent-trend',
        data: milestoneTrend(milestones),
      },
      {
        key: 'timeline',
        title: 'Project timeline overview',
        subtitle: 'Design window and completion position for the first six projects',
        type: 'timeline',
        data: timeline,
        bounds: timelineBounds,
        span: 'wide',
      },
    ],
  };
}

function buildDesignView(filters, bounds) {
  const tasks = filteredTasks(filters, bounds);
  const statusData = seriesFromRows(tasks, (task) => task.status, TASK_STATUSES);
  const engineerData = withTeal(
    seriesFromValues(tasks.map((task) => task.engineer), ENGINEERS),
  );
  const projectGroups = new Map();
  tasks.forEach((task) => {
    const current = projectGroups.get(task.projectId) || { total: 0, count: 0 };
    current.total += Number(task.progress) || 0;
    current.count += 1;
    projectGroups.set(task.projectId, current);
  });
  const projectProgress = [...projectGroups.entries()]
    .map(([projectId, value], index) => ({
      key: projectId,
      label: projectName(projectId),
      value: Math.round(value.total / value.count),
      color: TEAL_SCALE[index % TEAL_SCALE.length],
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 7);
  const pendingTasks = tasks
    .filter((task) => task.status !== 'Completed')
    .sort((left, right) => left.due.localeCompare(right.due))
    .slice(0, 6)
    .map((task) => ({
      key: task.id,
      title: task.name,
      subtitle: `${projectName(task.projectId)} · ${task.engineer}`,
      meta: `Due ${formatDate(task.due)} · ${task.priority} priority`,
      status: task.status,
      progress: task.progress,
      overdue: task.due < TODAY,
    }));
  const comparison = projectCompletion(tasks);
  const completionTrend = taskCompletionTrend(tasks);
  const statusByProject = matrixFromRows(tasks, {
    groupBy: (task) => task.projectId,
    labelFor: (task) => projectName(task.projectId),
    seriesBy: (task) => task.status,
    seriesOrder: TASK_STATUSES,
  });
  const completed = tasks.filter((task) => task.status === 'Completed').length;
  const overdue = tasks.filter((task) => task.status !== 'Completed' && task.due < TODAY).length;

  return {
    summary: [
      { label: 'Tasks analysed', value: formatCount(tasks.length), sub: 'across the selected scope' },
      { label: 'Completed', value: formatCount(completed), sub: `${tasks.length ? percent((completed / tasks.length) * 100) : '0%'} completion` },
      { label: 'Open tasks', value: formatCount(tasks.length - completed), sub: 'still in the design workflow' },
      { label: 'Overdue', value: formatCount(overdue), sub: 'past the planned due date' },
    ],
    count: tasks.length,
    countLabel: 'design tasks',
    cards: [
      {
        key: 'project-progress',
        title: 'Design progress by project',
        subtitle: 'Average recorded task completion for projects with active design work',
        type: 'progress',
        data: projectProgress.map((item) => ({
          ...item,
          meta: `${projectGroups.get(item.key)?.count || 0} design task${projectGroups.get(item.key)?.count === 1 ? '' : 's'} in scope`,
        })),
        formatValue: percent,
      },
      {
        key: 'planned-actual',
        title: 'Planned vs actual completion trend',
        subtitle: 'Cumulative tasks due and completed by month across the filtered scope',
        type: 'percent-trend',
        data: completionTrend,
        span: 'wide',
      },
      {
        key: 'task-status-project',
        title: 'Task status mix by project',
        subtitle: 'Design task workflow states within each project',
        type: 'stacked',
        data: statusByProject.data,
        series: statusByProject.series,
        span: 'wide',
      },
      {
        key: 'pending-activities',
        title: 'Pending design activities',
        subtitle: 'Nearest design tasks that are not yet complete',
        type: 'list',
        data: pendingTasks,
        emptyMessage: 'No pending design activities in this filtered view.',
        span: 'wide',
      },
    ],
  };
}

function buildCadView(filters, bounds) {
  const drawings = filteredDrawings(filters, bounds);
  const files = filteredCadFiles(filters, bounds);
  const revisionCount = drawings.reduce(
    (sum, drawing) => sum + Math.max(drawing.revisions?.length || 0, 1),
    0,
  );
  const released = drawings.filter((drawing) => drawing.releaseStatus === 'Released').length;
  const pending = drawings.length - released;
  const revisionData = withTeal(
    seriesFromRows(drawings, (drawing) => `Rev ${drawing.revision}`, [
      'Rev A',
      'Rev B',
      'Rev C',
      'Rev D',
      'Rev E',
    ]),
  );
  const approvalData = seriesFromRows(
    drawings,
    (drawing) => drawing.approvalStatus,
    DRAWING_STATUSES,
  );
  const formatData = seriesFromRows(files, (file) => file.fileType);
  const releaseData = [
    { key: 'released', label: 'Released', value: released, color: '#0B7A68' },
    { key: 'pending', label: 'Pending release', value: pending, color: '#D97706' },
  ].filter((item) => item.value > 0);
  const revisionTrend = drawingRevisionTrend(drawings, bounds);
  const releaseProgress = [
    {
      key: 'release',
      label: 'Released drawings',
      value: drawings.length ? Math.round((released / drawings.length) * 100) : 0,
      meta: `${released} of ${drawings.length} controlled drawings released`,
      color: '#0B7A68',
    },
  ];

  return {
    summary: [
      { label: 'Drawings analysed', value: formatCount(drawings.length), sub: 'controlled drawing records' },
      { label: 'Controlled revisions', value: formatCount(revisionCount), sub: 'revision snapshots recorded' },
      { label: 'Released', value: formatCount(released), sub: 'approved for issue' },
      { label: 'Pending release', value: formatCount(pending), sub: 'still in the approval path' },
    ],
    count: files.length,
    countLabel: 'CAD files',
    cards: [
      {
        key: 'approval-status',
        title: 'Drawing approval status',
        subtitle: 'Where controlled drawings sit in the approval workflow',
        type: 'donut',
        data: approvalData,
        centerValue: drawings.length,
        centerLabel: 'Drawings',
      },
      {
        key: 'file-formats',
        title: 'CAD file format distribution',
        subtitle: 'Repository files by native or exchange format',
        type: 'donut',
        data: formatData,
        centerValue: files.length,
        centerLabel: 'Files',
      },
      {
        key: 'revision-trend',
        title: 'Drawing revision trend',
        subtitle: 'Revision snapshots recorded by month in the filtered drawing register',
        type: 'trend',
        data: revisionTrend,
        color: '#2563EB',
        formatValue: formatCount,
        span: 'wide',
      },
      {
        key: 'release-readiness',
        title: 'Drawing release completion',
        subtitle: 'Share of controlled drawings issued for use',
        type: 'progress',
        data: releaseProgress,
        formatValue: percent,
        span: 'wide',
      },
    ],
  };
}

function buildBomView(filters, bounds) {
  const boms = filteredBoms(filters, bounds);
  const bomIds = new Set(boms.map((bom) => bom.id));
  const items = boms.flatMap((bom) => bom.items || []);
  const materials = MATERIAL_REQUIREMENTS.filter((row) => bomIds.has(row.bomId));
  const materialData = seriesFromValues(
    materials.map((row) => materialByCode(row.materialCode)?.name || 'Other material'),
  );
  const revisionData = withTeal(
    seriesFromValues(
      boms.flatMap((bom) => (bom.revisions || []).map((revision) => `Rev ${revision.revision}`)),
    ),
  );
  const makeBuyData = seriesFromRows(items, (item) => item.makeBuy, ['Make', 'Buy', 'Make / Buy']);
  const projectData = withTeal(seriesFromValues(boms.map((bom) => projectName(bom.projectId))));
  const purchasedValue = items
    .filter((item) => item.makeBuy === 'Buy')
    .reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitCost || 0), 0);
  const projectItems = boms.flatMap((bom) =>
    (bom.items || []).map((item) => ({
      ...item,
      projectId: bom.projectId,
      projectLabel: projectName(bom.projectId),
    })),
  );
  const materialTreemap = bomMaterialTreemap(materials);
  const completionProgress = bomCompletionProgress(boms);
  const statusData = seriesFromRows(boms, (bom) => bom.status, BOM_STATUSES);
  const makeBuyMatrix = matrixFromRows(projectItems, {
    groupBy: (item) => item.projectId,
    labelFor: (item) => item.projectLabel,
    seriesBy: (item) => item.makeBuy,
    seriesOrder: ['Make', 'Buy', 'Make / Buy'],
  });

  return {
    summary: [
      { label: 'BOMs analysed', value: formatCount(boms.length), sub: 'engineering structures' },
      { label: 'Projects covered', value: formatCount(new Set(boms.map((bom) => bom.projectId)).size), sub: 'project scopes' },
      { label: 'Line items', value: formatCount(items.length), sub: 'make and buy components' },
      { label: 'Revisions', value: formatCount(boms.reduce((sum, bom) => sum + (bom.revisions?.length || 1), 0)), sub: 'recorded BOM revisions' },
    ],
    count: boms.length,
    countLabel: 'BOMs',
    cards: [
      {
        key: 'material-value-treemap',
        title: 'Material value distribution',
        subtitle: 'Material requirement value at recorded catalog rates across the filtered BOMs',
        type: 'treemap',
        data: materialTreemap,
        formatValue: formatCurrency,
        span: 'wide',
      },
      {
        key: 'make-buy-project',
        title: 'Make vs buy components by project',
        subtitle: 'Component sourcing mix recorded in the filtered BOM line items',
        type: 'stacked',
        data: makeBuyMatrix.data,
        series: makeBuyMatrix.series,
        span: 'wide',
      },
      {
        key: 'bom-status',
        title: 'BOM workflow status',
        subtitle: 'Current BOM lifecycle states across the selected structures',
        type: 'donut',
        data: statusData,
        centerValue: boms.length,
        centerLabel: 'BOMs',
      },
      {
        key: 'bom-completion',
        title: 'BOM completion by project',
        subtitle: 'Share of project BOMs approved or released',
        type: 'progress',
        data: completionProgress,
        formatValue: percent,
      },
    ],
  };
}

function buildCostView(filters, bounds) {
  const estimates = filteredCostEstimates(filters, bounds);
  const projectIds = new Set(estimates.map((estimate) => estimate.projectId));
  const materials = MATERIAL_REQUIREMENTS.filter((row) => projectIds.has(row.projectId));
  const labour = LABOUR_ESTIMATES.filter((row) => projectIds.has(row.projectId));
  const total = estimates.reduce((sum, row) => sum + Number(row.totalCost || 0), 0);
  const materialCost = estimates.reduce((sum, row) => sum + Number(row.materialCost || 0), 0);
  const purchasedCost = estimates.reduce((sum, row) => sum + Number(row.purchasedCost || 0), 0);
  const conversion = estimates.reduce(
    (sum, row) =>
      sum + Number(row.labourCost || 0) + Number(row.processCost || 0) + Number(row.otherCost || 0),
    0,
  );

  const projectData = [...estimates]
    .sort((left, right) => right.totalCost - left.totalCost)
    .map((estimate, index) => ({
      key: estimate.id,
      label: projectName(estimate.projectId),
      value: estimate.totalCost,
      color: TEAL_SCALE[index % TEAL_SCALE.length],
    }));

  const materialBreakdown = [...materials.reduce((map, row) => {
    const key = materialByCode(row.materialCode)?.name || 'Other material';
    map.set(key, (map.get(key) || 0) + Number(row.qty || 0) * Number(row.rate || 0));
    return map;
  }, new Map())].map(([label, value], index) => ({
    key: label,
    label,
    value,
    color: PALETTE[index % PALETTE.length],
  }));

  const labourBreakdown = [...labour.reduce((map, row) => {
    const current = map.get(row.process) || { labour: 0, process: 0 };
    current.labour += Number(row.hours || 0) * Number(row.labourRate || 0);
    current.process += Number(row.processRate || 0);
    map.set(row.process, current);
    return map;
  }, new Map())].map(([process, value]) => ({
    key: process,
    label: process,
    values: [value.labour, value.process],
  }));

  const projectComparison = [...estimates]
    .sort((left, right) => right.totalCost - left.totalCost)
    .slice(0, 6)
    .map((estimate) => ({
      key: estimate.id,
      label: projectName(estimate.projectId),
      values: [
        Number(estimate.materialCost || 0) + Number(estimate.purchasedCost || 0),
        Number(estimate.labourCost || 0) +
          Number(estimate.processCost || 0) +
          Number(estimate.otherCost || 0),
      ],
      meta: estimate.status,
    }));

  const monthly = [...estimates.reduce((map, estimate) => {
    const key = String(estimate.date).slice(0, 7);
    map.set(key, (map.get(key) || 0) + Number(estimate.totalCost || 0));
    return map;
  }, new Map())]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
      }),
      value,
    }));

  const costBreakdown = {
    series: [
      { key: 'material', label: 'Material', color: '#2563EB' },
      { key: 'purchased', label: 'Purchased', color: '#7C3AED' },
      { key: 'labour', label: 'Labour', color: '#0B7A68' },
      { key: 'process', label: 'Process + other', color: '#D97706' },
    ],
    data: [...estimates]
      .sort((left, right) => right.totalCost - left.totalCost)
      .map((estimate) => ({
        key: estimate.id,
        label: projectName(estimate.projectId),
        values: [
          Number(estimate.materialCost || 0),
          Number(estimate.purchasedCost || 0),
          Number(estimate.labourCost || 0),
          Number(estimate.processCost || 0) + Number(estimate.otherCost || 0),
        ],
        total: Number(estimate.totalCost || 0),
        meta: `${formatCurrency(estimate.totalCost)} total estimate`,
      })),
  };

  return {
    summary: [
      { label: 'Estimated value', value: formatCurrency(total), sub: 'filtered engineering estimates' },
      { label: 'Estimates', value: formatCount(estimates.length), sub: 'cost records' },
      { label: 'Material + purchased', value: formatCurrency(materialCost + purchasedCost), sub: 'direct cost content' },
      { label: 'Labour + process', value: formatCurrency(conversion), sub: 'conversion estimate' },
    ],
    count: estimates.length,
    countLabel: 'cost estimates',
    cards: [
      {
        key: 'cost-projects',
        title: 'Estimated cost by project',
        subtitle: 'Total mock engineering estimate recorded for each project',
        type: 'bars',
        data: projectData,
        formatValue: formatCurrency,
        span: 'wide',
      },
      {
        key: 'material-breakdown',
        title: 'Material cost breakdown',
        subtitle: 'Material requirement value at recorded catalog rates',
        type: 'donut',
        data: materialBreakdown,
        centerValue: formatCurrency(
          materialBreakdown.reduce((sum, item) => sum + item.value, 0),
        ),
        centerLabel: 'Material',
        formatValue: formatCurrency,
      },
      {
        key: 'cost-breakdown',
        title: 'Project cost composition',
        subtitle: 'Material, purchased, labour and process value recorded within each estimate',
        type: 'stacked',
        data: costBreakdown.data,
        series: costBreakdown.series,
        formatValue: formatCurrency,
        span: 'wide',
      },
      {
        key: 'cost-trend',
        title: 'Estimate value trend',
        subtitle:
          'Recorded estimate value by estimate date. The mock data has no approved budget baseline, so this is a value trend, not a variance calculation.',
        type: 'trend',
        data: monthly,
        color: '#0B7A68',
        formatValue: formatCurrency,
        span: 'wide',
      },
    ],
  };
}

function buildApprovalView(filters, bounds) {
  const reviews = filteredReviews(filters, bounds);
  const statusData = seriesFromRows(reviews, (review) => review.status, REVIEW_STATUSES);
  const engineeringData = seriesFromRows(
    reviews,
    (review) => stageStatus(review, 'engineering'),
    ['Approved', 'Under Review', 'Pending', 'Changes Requested', 'Rejected', 'Not Required'],
  );
  const manufacturingData = seriesFromRows(
    reviews,
    (review) => stageStatus(review, 'manufacturing'),
    ['Approved', 'Under Review', 'Pending', 'Changes Requested', 'Rejected', 'Not Required'],
  );
  const pendingReviews = reviews
    .filter(
      (review) =>
        !REVIEW_FINAL.includes(review.status) && pendingStage(review, 'engineering'),
    )
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 6)
    .map((review) => ({
      key: review.id,
      title: review.deliverableName,
      subtitle: `${projectName(review.projectId)} · ${review.deliverableType}`,
      meta: `Submitted ${formatDate(review.submittedAt)} · due ${formatDate(review.dueDate)}`,
      status: stageStatus(review, 'engineering'),
      overdue: review.dueDate < TODAY,
    }));
  const approved = reviews.filter((review) => REVIEW_FINAL.includes(review.status)).length;
  const engineeringPending = reviews.filter((review) => pendingStage(review, 'engineering')).length;
  const manufacturingPending = reviews.filter((review) =>
    pendingStage(review, 'manufacturing'),
  ).length;
  const trend = turnaroundTrend(reviews);
  const averageTurnaround = trend.length
    ? trend.reduce((sum, item) => sum + item.value, 0) / trend.length
    : null;
  const funnel = approvalFunnel(reviews);

  return {
    summary: [
      { label: 'Reviews analysed', value: formatCount(reviews.length), sub: 'deliverable reviews' },
      { label: 'Engineering pending', value: formatCount(engineeringPending), sub: 'awaiting engineering action' },
      { label: 'Manufacturing pending', value: formatCount(manufacturingPending), sub: 'awaiting shop review' },
      {
        label: 'Average turnaround',
        value: averageTurnaround == null ? '—' : `${averageTurnaround.toFixed(1)}d`,
        sub: 'submission to latest decision',
      },
    ],
    count: reviews.length,
    countLabel: 'reviews',
    cards: [
      {
        key: 'approval-status',
        title: 'Approval status distribution',
        subtitle: 'Deliverable reviews across the current approval workflow states',
        type: 'donut',
        data: statusData,
        centerValue: reviews.length,
        centerLabel: 'Reviews',
      },
      {
        key: 'approval-funnel',
        title: 'Approval workflow funnel',
        subtitle: 'Reviews reaching each recorded decision stage in the filtered scope',
        type: 'funnel',
        data: funnel,
        formatValue: formatCount,
        span: 'wide',
      },
      {
        key: 'turnaround-trend',
        title: 'Approval turnaround trends',
        subtitle: 'Average days from submission to the latest recorded stage decision',
        type: 'trend',
        data: trend,
        color: '#7C3AED',
        formatValue: (value) => `${value}d`,
        emptyMessage: 'No completed stage decisions exist for this filtered view.',
        span: 'wide',
      },
      {
        key: 'pending-engineering',
        title: 'Pending engineering reviews',
        subtitle: 'Reviews requiring an engineering decision, ordered by due date',
        type: 'list',
        data: pendingReviews,
        emptyMessage: 'No engineering reviews are pending in this filtered view.',
        span: 'wide',
      },
    ],
  };
}

function buildChangeView(filters, bounds) {
  const changeCases = filteredChanges(filters, bounds);
  const ecrs = changeCases.filter((row) => row.caseType.includes('ECR')).length;
  const ecos = changeCases.filter((row) => row.caseType.includes('ECO')).length;
  const open = changeCases.filter((row) => !CHANGE_CLOSED.includes(row.status)).length;
  const closed = changeCases.length - open;
  const typeData = [
    { key: 'ECR', label: 'ECR', value: ecrs, color: '#2563EB' },
    { key: 'ECO', label: 'ECO', value: ecos, color: '#0B7A68' },
  ].filter((item) => item.value > 0);
  const projectData = seriesFromValues(changeCases.map((row) => projectName(row.projectId)));
  const revisionData = seriesFromValues(
    changeCases.map((row) => `Rev ${row.drawingRevision || '—'}`),
  );
  const closureData = [
    { key: 'open', label: 'Open', value: open, color: '#D97706' },
    { key: 'closed', label: 'Resolved / closed', value: closed, color: '#0B7A68' },
  ].filter((item) => item.value > 0);
  const reasons = changeCases
    .map((row) => row.changeJustification || row.approvedChangeDetails || '')
    .filter(Boolean);
  const timeline = changeActivityTimeline(changeCases);
  const changeTrend = monthlySeries(changeCases, (row) => row.requestedDate);
  const projectMix = matrixFromRows(changeCases, {
    groupBy: (row) => row.projectId,
    labelFor: (row) => projectName(row.projectId),
    seriesBy: (row) => (row.caseType.includes('ECO') ? 'ECO' : 'ECR'),
    seriesOrder: ['ECR', 'ECO'],
  });

  return {
    summary: [
      { label: 'Changes tracked', value: formatCount(changeCases.length), sub: 'ECR and ECO records' },
      { label: 'ECRs', value: formatCount(ecrs), sub: 'engineering change requests' },
      { label: 'ECOs', value: formatCount(ecos), sub: 'approved change orders' },
      { label: 'Open', value: formatCount(open), sub: 'still in the change workflow' },
    ],
    count: changeCases.length,
    countLabel: 'change cases',
    cards: [
      {
        key: 'change-timeline',
        title: 'Change request activity timeline',
        subtitle: 'Recorded request-to-last-update span for each change case',
        type: 'change-timeline',
        data: timeline.data,
        bounds: timeline.bounds,
        legend: [
          { label: 'ECR', color: '#2563EB' },
          { label: 'ECO', color: '#0B7A68' },
        ],
        span: 'wide',
      },
      {
        key: 'changes-projects',
        title: 'ECR vs ECO activity by project',
        subtitle: 'Change request and change order mix across affected projects',
        type: 'stacked',
        data: projectMix.data,
        series: projectMix.series,
        span: 'wide',
      },
      {
        key: 'change-trend',
        title: 'Engineering change trend',
        subtitle: 'Change cases raised by request month',
        type: 'trend',
        data: changeTrend,
        color: '#2563EB',
        formatValue: formatCount,
        span: 'wide',
      },
      {
        key: 'open-closed',
        title: 'Open vs closed changes',
        subtitle: 'Closure position across the filtered change cases',
        type: 'donut',
        data: closureData,
        centerValue: changeCases.length,
        centerLabel: 'Changes',
        span: 'wide',
      },
    ],
  };
}

function buildWorkloadView(filters, bounds) {
  const tasks = filteredTasks(filters, bounds);
  const projects = filteredProjects(filters, bounds, { applyStatus: false });
  const engineerData = withTeal(
    seriesFromValues(tasks.map((task) => task.engineer), ENGINEERS),
  );
  const projectData = withTeal(
    seriesFromValues(tasks.map((task) => projectName(task.projectId))),
  );
  const disciplineData = seriesFromValues(tasks.map((task) => task.discipline));
  const overdueTasks = tasks
    .filter((task) => task.status !== 'Completed' && task.due < TODAY)
    .sort((left, right) => left.due.localeCompare(right.due))
    .slice(0, 6)
    .map((task) => ({
      key: task.id,
      title: task.name,
      subtitle: `${projectName(task.projectId)} · ${task.engineer}`,
      meta: `Due ${formatDate(task.due)} · ${task.priority} priority`,
      status: task.status,
      progress: task.progress,
      overdue: true,
    }));
  const delayedProjects = projects
    .filter((project) => project.delayed && !PROJECT_STATUS_FINAL.includes(project.status))
    .sort((left, right) => left.target.localeCompare(right.target))
    .map((project) => ({
      key: project.id,
      title: project.name,
      subtitle: `${project.domain} · ${project.manager}`,
      meta: `Target ${formatDate(project.target)} · ${project.status}`,
      progress: project.progress,
      status: project.status,
      overdue: project.target < TODAY,
    }));
  const open = tasks.filter((task) => task.status !== 'Completed').length;
  const overdue = tasks.filter((task) => task.status !== 'Completed' && task.due < TODAY).length;
  const comparison = projectCompletion(tasks);
  const heatmap = engineerProjectHeatmap(tasks);
  const delayTrend = monthlySeries(
    tasks.filter((task) => task.status !== 'Completed' && task.due < TODAY),
    (task) => task.due,
  );

  return {
    summary: [
      { label: 'Open activities', value: formatCount(open), sub: 'tasks still in progress' },
      { label: 'Overdue activities', value: formatCount(overdue), sub: 'past the planned due date' },
      { label: 'Engineers', value: formatCount(new Set(tasks.map((task) => task.engineer)).size), sub: 'with assigned design work' },
      { label: 'Delayed projects', value: formatCount(delayedProjects.length), sub: 'flagged in the project register' },
    ],
    count: tasks.length,
    countLabel: 'design tasks',
    cards: [
      {
        key: 'workload-heatmap',
        title: 'Engineer × project workload heatmap',
        subtitle: 'Assigned design task count for each engineer and project combination',
        type: 'heatmap',
        data: heatmap,
        formatValue: formatCount,
        span: 'wide',
      },
      {
        key: 'workload-distribution',
        title: 'Discipline workload distribution',
        subtitle: 'Task distribution across engineering disciplines',
        type: 'donut',
        data: disciplineData,
        centerValue: tasks.length,
        centerLabel: 'Tasks',
      },
      {
        key: 'engineer-workload',
        title: 'Engineer-wise workload',
        subtitle: 'Assigned design task count per engineer',
        type: 'bars',
        data: engineerData,
      },
      {
        key: 'delay-trend',
        title: 'Overdue activity trend',
        subtitle: 'Unfinished tasks past due, grouped by planned due month',
        type: 'trend',
        data: delayTrend,
        color: '#DC2626',
        formatValue: formatCount,
        emptyMessage: 'No overdue design activities in this filtered view.',
        span: 'wide',
      },
      {
        key: 'delayed-projects',
        title: 'Delayed projects',
        subtitle: 'Projects flagged as delayed in the engineering register',
        type: 'list',
        data: delayedProjects.slice(0, 6),
        emptyMessage: 'No delayed projects in this filtered view.',
        span: 'wide',
      },
      {
        key: 'overdue-activities',
        title: 'Overdue design activities',
        subtitle: 'Unfinished tasks past their planned due date',
        type: 'list',
        data: overdueTasks,
        emptyMessage: 'No overdue design activities in this filtered view.',
        span: 'wide',
      },
    ],
  };
}

export function buildReportAnalytics(categoryKey, filters = {}) {
  const normalized = normalizeFilters(filters);
  const bounds = rangeBounds(normalized.range);
  const builders = {
    'project-reports': buildProjectView,
    'design-progress': buildDesignView,
    'cad-drawing-reports': buildCadView,
    'bom-reports': buildBomView,
    'cost-reports': buildCostView,
    'approval-reports': buildApprovalView,
    'change-reports': buildChangeView,
    'workload-delay-reports': buildWorkloadView,
  };
  const view = (builders[categoryKey] || buildProjectView)(normalized, bounds);
  return {
    ...view,
    rangeLabel: bounds.label,
    filters: normalized,
  };
}

export {
  PROJECT_DOMAINS,
  ENGINEERS,
  formatDate,
  projectName,
};
