import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock3,
  DraftingCompass,
  Eye,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  Pencil,
  PieChart,
  Plus,
  SearchX,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiGrid,
  PageHeader,
  PageLayout,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  StatCard,
  Toolbar,
} from '../components/common';
import { BarList, DonutChart } from '../components/dashboard/Charts';
import { useApprovals } from '../context/ApprovalsContext';
import { useCad } from '../context/CadContext';
import { usePlanning } from '../context/PlanningContext';
import { useProjects } from '../context/ProjectsContext';
import { formatDate } from '../data/projectData';
import './dashboard.css';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const PROJECT_STATUS_COLORS = {
  'New Request': '#94A3B8',
  'Under Planning': '#F59E0B',
  'Design In Progress': '#2563EB',
  'Under Review': '#7C3AED',
  'Approval Pending': '#D97706',
  Approved: '#16A34A',
  Transferred: '#0D9488',
  'Manufacturing In Progress': '#0891B2',
  Completed: '#15803D',
  'On Hold': '#64748B',
  Cancelled: '#DC2626',
};

const REVIEW_STATUS_COLORS = {
  Draft: '#94A3B8',
  'Under Engineering Review': '#2563EB',
  'Under Manufacturing Review': '#0891B2',
  'Pending Client Submission': '#F59E0B',
  'Submitted to Client': '#D97706',
  'Under Client Review': '#7C3AED',
  'Changes Requested': '#EA580C',
  'Ready for Final Approval': '#0D9488',
  Approved: '#16A34A',
  Rejected: '#DC2626',
  Released: '#15803D',
};

const DRAWING_STATUS_COLORS = {
  Draft: '#94A3B8',
  Submitted: '#F59E0B',
  'Under Review': '#2563EB',
  'Changes Requested': '#EA580C',
  Approved: '#16A34A',
  Released: '#15803D',
  Superseded: '#7C3AED',
  Withdrawn: '#DC2626',
};

const OPEN_REVIEW_STATUSES = [
  'Draft',
  'Under Engineering Review',
  'Under Manufacturing Review',
  'Pending Client Submission',
  'Submitted to Client',
  'Under Client Review',
  'Changes Requested',
  'Ready for Final Approval',
];

/** Statuses that are in flight and therefore shown as "current" work. */
const CURRENT_STATUSES = [
  'Under Planning',
  'Design In Progress',
  'Under Review',
  'Approval Pending',
  'Approved',
  'Transferred',
  'Manufacturing In Progress',
];

/** Statuses (or the delayed flag) that genuinely need attention. */
const PENDING_STATUSES = ['New Request', 'Under Planning', 'Under Review', 'Approval Pending', 'On Hold'];

const PENDING_ACTIVITY = {
  'New Request': 'Project intake not started',
  'Under Planning': 'Design plan and task allocation pending',
  'Under Review': 'Submitted design awaiting review',
  'Approval Pending': 'Awaiting approval decision',
  'On Hold': 'On hold — decision required to resume',
};

const DONE_STATUSES = ['Completed', 'Cancelled'];

function countBy(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function monthLabel(monthKey) {
  const date = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

/** Monthly counts over the months present in the data, oldest first. */
function monthlySeries(rows, dateOf, filter) {
  const months = [
    ...new Set(
      rows
        .filter((row) => (filter ? filter(row) : true))
        .map((row) => dateOf(row)?.slice(0, 7))
        .filter(Boolean),
    ),
  ].sort();

  return months.map((month) => ({
    key: month,
    label: monthLabel(month),
    value: rows.filter((row) => (filter ? filter(row) : true) && dateOf(row)?.slice(0, 7) === month).length,
    color: '#0B7A68',
  }));
}

function paginate(rows, page, pageSize) {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;
  return { totalCount, totalPages, currentPage, pageRows, pageInfo };
}

function progressTone(status) {
  if (status === 'Completed') return 'green';
  if (status === 'Delayed' || status === 'On Hold') return 'red';
  return 'teal';
}

/**
 * Overall dashboard — analytics first.
 *
 * Order is fixed: header → KPI cards → project analytics → pending-work
 * analytics → drawing analytics → timeline analytics → the three table
 * sections (current projects, pending projects, drawings). Every figure is
 * derived from the live project, planning, drawing and approval contexts.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks } = usePlanning();
  const { drawings } = useCad();
  const { reviews } = useApprovals();

  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('All');
  const [projectSort, setProjectSort] = useState({ key: 'id', direction: 'asc' });
  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState(5);

  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(5);

  const [drawingSearch, setDrawingSearch] = useState('');
  const [drawingStatus, setDrawingStatus] = useState('All');
  const [drawingSort, setDrawingSort] = useState({ key: 'drawingNumber', direction: 'asc' });
  const [drawingPage, setDrawingPage] = useState(1);
  const [drawingPageSize, setDrawingPageSize] = useState(5);

  /* ------------------------------------------------------------------ data */
  const liveProjects = useMemo(() => projects.filter((project) => !project.archived), [projects]);

  const activeProjects = useMemo(
    () => liveProjects.filter((project) => !DONE_STATUSES.includes(project.status)),
    [liveProjects],
  );

  const currentProjects = useMemo(
    () => liveProjects.filter((project) => CURRENT_STATUSES.includes(project.status)),
    [liveProjects],
  );

  const pendingProjects = useMemo(
    () =>
      liveProjects.filter(
        (project) => PENDING_STATUSES.includes(project.status) || project.delayed === true,
      ),
    [liveProjects],
  );

  const completedCount = liveProjects.filter((project) => project.status === 'Completed').length;

  const releasedDrawings = drawings.filter((drawing) => drawing.approvalStatus === 'Released').length;
  const openReviews = reviews.filter((review) => OPEN_REVIEW_STATUSES.includes(review.status));
  const averageProgress = activeProjects.length
    ? Math.round(
        activeProjects.reduce((sum, project) => sum + (Number(project.progress) || 0), 0) /
          activeProjects.length,
      )
    : 0;

  const pendingTasks = tasks.filter((task) => !['Completed', 'Cancelled'].includes(task.status));

  /* ------------------------------------------------------------------ KPIs */
  const kpis = [
    {
      key: 'total-projects',
      icon: FolderKanban,
      label: 'Total Projects',
      value: String(liveProjects.length),
      sub: 'All project records',
      tone: 'teal',
      to: '/projects/all-projects',
    },
    {
      key: 'active-projects',
      icon: TrendingUp,
      label: 'Active Projects',
      value: String(activeProjects.length),
      sub: 'Not completed or cancelled',
      tone: 'blue',
      to: '/projects/all-projects',
    },
    {
      key: 'pending-projects',
      icon: Clock3,
      label: 'Pending Projects',
      value: String(pendingProjects.length),
      sub: 'Awaiting action or delayed',
      tone: 'orange',
      to: '/projects/project-status',
    },
    {
      key: 'completed-projects',
      icon: FileCheck2,
      label: 'Completed Projects',
      value: String(completedCount),
      sub: 'Design work closed',
      tone: 'green',
      to: '/projects/all-projects',
    },
    {
      key: 'total-drawings',
      icon: DraftingCompass,
      label: 'Total Drawings',
      value: String(drawings.length),
      sub: 'Drawing register',
      tone: 'blue',
      to: '/cad-management/drawing-register',
    },
    {
      key: 'released-drawings',
      icon: FileCheck2,
      label: 'Released Drawings',
      value: String(releasedDrawings),
      sub: 'Controlled releases',
      tone: 'green',
      to: '/cad-management/releases',
    },
    {
      key: 'pending-reviews',
      icon: ClipboardList,
      label: 'Pending Reviews',
      value: String(openReviews.length),
      sub: 'Design approval queue',
      tone: 'purple',
      to: '/design-review',
    },
    {
      key: 'progress',
      icon: BarChart3,
      label: 'Design Progress',
      value: `${averageProgress}%`,
      sub: `Average across ${activeProjects.length} active projects`,
      tone: 'teal',
      to: '/projects/project-status',
    },
  ];

  /* ---------------------------------------------------------------- charts */
  const projectStatusChart = countBy(liveProjects, (project) => project.status).map((row) => ({
    key: row.label,
    label: row.label,
    value: row.value,
    color: PROJECT_STATUS_COLORS[row.label] || '#0B7A68',
  }));

  const projectDomainChart = countBy(liveProjects, (project) => project.domain).map((row) => ({
    key: row.label,
    ...row,
    color: '#0B7A68',
  }));

  const projectProgressChart = [...activeProjects]
    .sort((left, right) => (right.progress || 0) - (left.progress || 0))
    .slice(0, 7)
    .map((project) => ({
      key: project.id,
      label: project.id,
      value: Number(project.progress) || 0,
      color: '#0B7A68',
    }));

  const taskStatusChart = countBy(tasks, (task) => task.status)
    .sort((left, right) => right.value - left.value)
    .map((row) => ({ key: row.label, ...row, color: '#0B7A68' }));

  const reviewStatusChart = countBy(reviews, (review) => review.status).map((row) => ({
    key: row.label,
    label: row.label,
    value: row.value,
    color: REVIEW_STATUS_COLORS[row.label] || '#0B7A68',
  }));

  const drawingStatusChart = countBy(drawings, (drawing) => drawing.approvalStatus).map((row) => ({
    key: row.label,
    label: row.label,
    value: row.value,
    color: DRAWING_STATUS_COLORS[row.label] || '#0B7A68',
  }));

  const drawingTypeChart = countBy(drawings, (drawing) => drawing.drawingType).map((row) => ({
    key: row.label,
    ...row,
    color: '#0B7A68',
  }));

  const drawingRevisionChart = countBy(drawings, (drawing) => `Rev ${drawing.revision}`).map((row) => ({
    key: row.label,
    ...row,
    color: '#0B7A68',
  }));

  const projectStartSeries = monthlySeries(liveProjects, (project) => project.start);
  const drawingReleaseSeries = monthlySeries(drawings, (drawing) => drawing.releasedAt);

  /* --------------------------------------------------------- current table */
  const projectStatusOptions = [
    { value: 'All', label: 'All statuses' },
    ...[...new Set(liveProjects.map((project) => project.status))]
      .sort()
      .map((status) => ({ value: status, label: status })),
  ];

  const filteredCurrentProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    return currentProjects.filter((project) => {
      if (projectStatus !== 'All' && project.status !== projectStatus) return false;
      if (!query) return true;
      return [
        project.id,
        project.name,
        project.customer,
        project.department,
        project.manager,
        project.product,
        project.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [currentProjects, projectSearch, projectStatus]);

  const sortedCurrentProjects = useMemo(() => {
    const rows = [...filteredCurrentProjects];
    rows.sort((left, right) => {
      const a = String(left[projectSort.key] ?? '');
      const b = String(right[projectSort.key] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return projectSort.direction === 'asc' ? result : -result;
    });
    return rows;
  }, [filteredCurrentProjects, projectSort]);

  const currentPageData = paginate(sortedCurrentProjects, projectPage, projectPageSize);

  /* --------------------------------------------------------- pending table */
  const filteredPendingProjects = useMemo(() => {
    const query = pendingSearch.trim().toLowerCase();
    if (!query) return pendingProjects;
    return pendingProjects.filter((project) =>
      [project.id, project.name, project.manager, project.customer, project.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [pendingProjects, pendingSearch]);

  const pendingPageData = paginate(filteredPendingProjects, pendingPage, pendingPageSize);

  /* -------------------------------------------------------- drawings table */
  const drawingStatusOptions = [
    { value: 'All', label: 'All statuses' },
    ...[...new Set(drawings.map((drawing) => drawing.approvalStatus))]
      .sort()
      .map((status) => ({ value: status, label: status })),
  ];

  const projectNameById = useMemo(() => {
    const map = new Map();
    liveProjects.forEach((project) => map.set(project.id, project.name));
    return map;
  }, [liveProjects]);

  const filteredDrawings = useMemo(() => {
    const query = drawingSearch.trim().toLowerCase();
    return drawings.filter((drawing) => {
      if (drawingStatus !== 'All' && drawing.approvalStatus !== drawingStatus) return false;
      if (!query) return true;
      return [
        drawing.drawingNumber,
        drawing.title,
        drawing.projectId,
        projectNameById.get(drawing.projectId),
        drawing.drawingType,
        drawing.approvalStatus,
        drawing.revision,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [drawings, drawingSearch, drawingStatus, projectNameById]);

  const sortedDrawings = useMemo(() => {
    const rows = [...filteredDrawings];
    rows.sort((left, right) => {
      const a = String(left[drawingSort.key] ?? '');
      const b = String(right[drawingSort.key] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return drawingSort.direction === 'asc' ? result : -result;
    });
    return rows;
  }, [filteredDrawings, drawingSort]);

  const drawingPageData = paginate(sortedDrawings, drawingPage, drawingPageSize);

  /* --------------------------------------------------------------- columns */
  const currentColumns = [
    { key: 'id', label: 'Project No.', width: 126, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'name', label: 'Project Name', sortable: true, render: (row) => <span className="cell-strong">{row.name}</span> },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => <span className="cell-muted">{row.customer || row.department || '—'}</span>,
    },
    { key: 'manager', label: 'Project Manager', width: 132, sortable: true },
    {
      key: 'progress',
      label: 'Progress',
      width: 150,
      sortable: true,
      render: (row) => (
        <span className="progress-cell">
          <span className="progress-track">
            <span
              className={`progress-fill tone-${progressTone(row.status)}`}
              style={{ width: `${Math.min(Number(row.progress) || 0, 100)}%` }}
            />
          </span>
          <span className="progress-value">{Number(row.progress) || 0}%</span>
        </span>
      ),
    },
    {
      key: 'target',
      label: 'Target Date',
      width: 120,
      sortable: true,
      render: (row) => <span className="cell-muted">{formatDate(row.target)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 148,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const pendingColumns = [
    { key: 'id', label: 'Project No.', width: 126, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'name', label: 'Project Name', render: (row) => <span className="cell-strong">{row.name}</span> },
    { key: 'stage', label: 'Current Stage', width: 140, render: (row) => <span className="cell-muted">{row.status}</span> },
    {
      key: 'activity',
      label: 'Pending Activity',
      render: (row) =>
        PENDING_ACTIVITY[row.status] || (row.delayed ? 'Past target date — needs attention' : '—'),
    },
    { key: 'manager', label: 'Assigned To', width: 132, render: (row) => <span className="cell-person">{row.manager || '—'}</span> },
    {
      key: 'start',
      label: 'Pending Since',
      width: 120,
      render: (row) => <span className="cell-muted">{formatDate(row.start)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const drawingColumns = [
    {
      key: 'drawingNumber',
      label: 'Drawing Number',
      width: 150,
      sortable: true,
      render: (row) => <span className="cell-id">{row.drawingNumber}</span>,
    },
    {
      key: 'title',
      label: 'Drawing Title',
      sortable: true,
      render: (row) => <span className="cell-strong">{row.title}</span>,
    },
    {
      key: 'projectId',
      label: 'Project',
      width: 150,
      sortable: true,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{projectNameById.get(row.projectId) || '—'}</span>
        </span>
      ),
    },
    {
      key: 'revision',
      label: 'Revision',
      width: 92,
      align: 'center',
      sortable: true,
      render: (row) => <span className="chip">Rev {row.revision}</span>,
    },
    { key: 'drawingType', label: 'Drawing Type', width: 170, sortable: true },
    {
      key: 'approvalStatus',
      label: 'Status',
      width: 132,
      sortable: true,
      render: (row) => <StatusBadge status={row.approvalStatus} />,
    },
    {
      key: 'drawingDate',
      label: 'Last Updated',
      width: 120,
      sortable: true,
      render: (row) => <span className="cell-muted">{formatDate(row.drawingDate)}</span>,
    },
  ];

  const toggleProjectSort = (key) =>
    setProjectSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  const toggleDrawingSort = (key) =>
    setDrawingSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={[{ label: 'Dashboard' }]} />}
      header={
        <PageHeader
          icon={LayoutDashboard}
          title="Mechanical Design Dashboard"
          subtitle="Portfolio analytics across projects, pending work, drawings and approvals. Every figure is read from the live registers."
          actions={
            <>
              <Button icon={Plus} onClick={() => navigate('/projects/new-project')}>
                New Project
              </Button>
              <Button
                variant="secondary"
                icon={SlidersHorizontal}
                onClick={() => navigate('/settings/project-templates')}
              >
                Project Templates
              </Button>
              <Button
                variant="secondary"
                icon={ClipboardList}
                onClick={() => navigate('/design-planning/tasks-progress')}
              >
                View All Tasks
              </Button>
            </>
          }
        />
      }
    >
      {/* 1 — KPI summary cards */}
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
            onClick={() => navigate(kpi.to)}
          />
        ))}
      </KpiGrid>

      {/* 2 — Project analytics */}
      <div className="dash3-chart-grid">
        <Card
          icon={PieChart}
          title="Project Status Distribution"
          subtitle="Live projects by current workflow status"
          actions={
            <button type="button" className="dash-link" onClick={() => navigate('/projects/project-status')}>
              Project Status <ArrowRight aria-hidden="true" />
            </button>
          }
        >
          {projectStatusChart.length > 0 ? (
            <DonutChart
              data={projectStatusChart}
              centerValue={liveProjects.length}
              centerLabel="Projects"
              ariaLabel="Projects by status"
            />
          ) : (
            <p className="dash3-chart-note">No projects are recorded yet.</p>
          )}
        </Card>

        <Card icon={BarChart3} title="Projects by Domain" subtitle="Engineering disciplines across the portfolio">
          {projectDomainChart.length > 0 ? (
            <BarList data={projectDomainChart} ariaLabel="Projects by engineering domain" />
          ) : (
            <p className="dash3-chart-note">No project domains are recorded yet.</p>
          )}
        </Card>
      </div>

      <div className="dash3-chart-grid">
        <Card icon={TrendingUp} title="Project Progress Overview" subtitle="Design completion of the most advanced active projects">
          {projectProgressChart.length > 0 ? (
            <BarList
              data={projectProgressChart}
              ariaLabel="Design progress by project"
              formatValue={(value) => `${value}%`}
            />
          ) : (
            <p className="dash3-chart-note">No active projects are in progress.</p>
          )}
        </Card>

        <Card icon={Clock3} title="Pending Project Work" subtitle="Projects waiting on planning, review or a decision">
          <div className="summary-grid">
            <div className="summary-card tone-teal">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Pending Projects
              </span>
              <span className="summary-value">{pendingProjects.length}</span>
              <span className="summary-foot">Needs action</span>
            </div>
            <div className="summary-card tone-blue">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Pending Tasks
              </span>
              <span className="summary-value">{pendingTasks.length}</span>
              <span className="summary-foot">Open design tasks</span>
            </div>
            <div className="summary-card tone-red">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Open Reviews
              </span>
              <span className="summary-value">{openReviews.length}</span>
              <span className="summary-foot">Approval queue</span>
            </div>
            <div className="summary-card tone-green">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Completed Projects
              </span>
              <span className="summary-value">{completedCount}</span>
              <span className="summary-foot">Closed</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3 — Pending work analytics */}
      <div className="dash3-chart-grid">
        <Card
          icon={ClipboardList}
          title="Design Tasks by Status"
          subtitle="Every design task in the planning register, by workflow state"
          actions={
            <button type="button" className="dash-link" onClick={() => navigate('/design-planning/tasks-progress')}>
              Tasks & Progress <ArrowRight aria-hidden="true" />
            </button>
          }
        >
          {taskStatusChart.length > 0 ? (
            <BarList data={taskStatusChart} ariaLabel="Design tasks by status" />
          ) : (
            <p className="dash3-chart-note">No design tasks are recorded yet.</p>
          )}
        </Card>

        <Card
          icon={FileCheck2}
          title="Approval Queue by Status"
          subtitle="Design reviews currently held at each approval stage"
          actions={
            <button type="button" className="dash-link" onClick={() => navigate('/design-review')}>
              Design Review <ArrowRight aria-hidden="true" />
            </button>
          }
        >
          {reviewStatusChart.length > 0 ? (
            <DonutChart
              data={reviewStatusChart}
              centerValue={reviews.length}
              centerLabel="Reviews"
              ariaLabel="Design reviews by status"
            />
          ) : (
            <p className="dash3-chart-note">No design reviews are recorded yet.</p>
          )}
        </Card>
      </div>

      {/* 4 — Drawing analytics */}
      <div className="dash3-chart-grid">
        <Card
          icon={DraftingCompass}
          title="Drawing Status Distribution"
          subtitle="Released, approved and in-review drawings"
          actions={
            <button
              type="button"
              className="dash-link"
              onClick={() => navigate('/cad-management/drawing-register')}
            >
              Drawing Register <ArrowRight aria-hidden="true" />
            </button>
          }
        >
          {drawingStatusChart.length > 0 ? (
            <DonutChart
              data={drawingStatusChart}
              centerValue={drawings.length}
              centerLabel="Drawings"
              ariaLabel="Drawings by approval status"
            />
          ) : (
            <p className="dash3-chart-note">No drawings are registered yet.</p>
          )}
        </Card>

        <Card icon={BarChart3} title="Drawings by Type" subtitle="Drawing register split by drawing type">
          {drawingTypeChart.length > 0 ? (
            <BarList data={drawingTypeChart} ariaLabel="Drawings by type" />
          ) : (
            <p className="dash3-chart-note">No drawings are registered yet.</p>
          )}
        </Card>
      </div>

      <div className="dash3-chart-grid">
        <Card icon={Pencil} title="Drawing Revisions" subtitle="Drawings at each controlled revision">
          {drawingRevisionChart.length > 0 ? (
            <BarList data={drawingRevisionChart} ariaLabel="Drawings by revision" />
          ) : (
            <p className="dash3-chart-note">No drawing revisions are recorded yet.</p>
          )}
        </Card>

        <Card icon={CalendarDays} title="Drawings Released by Month" subtitle="Controlled drawing releases over time">
          {drawingReleaseSeries.length > 0 ? (
            <BarList data={drawingReleaseSeries} ariaLabel="Drawings released per month" />
          ) : (
            <p className="dash3-chart-note">No drawing releases are recorded yet.</p>
          )}
        </Card>
      </div>

      {/* 5 — Timeline analytics */}
      <div className="dash3-chart-grid">
        <Card icon={CalendarDays} title="Projects Started by Month" subtitle="Project intake across the recorded portfolio">
          {projectStartSeries.length > 0 ? (
            <BarList data={projectStartSeries} ariaLabel="Projects started per month" />
          ) : (
            <p className="dash3-chart-note">No project start dates are recorded.</p>
          )}
        </Card>

        <Card icon={TrendingUp} title="Portfolio Completion" subtitle="Completed and active projects in the live portfolio">
          <div className="summary-grid">
            <div className="summary-card tone-green">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Completed
              </span>
              <span className="summary-value">{completedCount}</span>
              <span className="summary-foot">Closed projects</span>
            </div>
            <div className="summary-card tone-blue">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Active
              </span>
              <span className="summary-value">{activeProjects.length}</span>
              <span className="summary-foot">In flight</span>
            </div>
            <div className="summary-card tone-teal">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Avg. Progress
              </span>
              <span className="summary-value">{averageProgress}%</span>
              <span className="summary-foot">Across active projects</span>
            </div>
            <div className="summary-card tone-blue">
              <span className="summary-top">
                <span className="summary-dot" aria-hidden="true" />
                Drawings Released
              </span>
              <span className="summary-value">{releasedDrawings}</span>
              <span className="summary-foot">Of {drawings.length} registered</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 6 — Current projects table */}
      <Card
        icon={FolderKanban}
        title="Current Projects"
        subtitle="Projects that are actively moving through the design workflow"
        className="dash3-table-card"
        bodyClassName="dash3-table-body"
        actions={
          <button type="button" className="dash-link" onClick={() => navigate('/projects/all-projects')}>
            All Projects <ArrowRight aria-hidden="true" />
          </button>
        }
      >
        <div className="dash3-table-tools">
          <Toolbar
            left={
              <Select
                id="dash3-project-status"
                label=""
                options={projectStatusOptions}
                value={projectStatus}
                onChange={(event) => {
                  setProjectStatus(event.target.value);
                  setProjectPage(1);
                }}
              />
            }
            right={
              <SearchInput
                id="dash3-project-search"
                value={projectSearch}
                onChange={(value) => {
                  setProjectSearch(value);
                  setProjectPage(1);
                }}
                placeholder="Search project, customer, manager..."
                ariaLabel="Search current projects"
              />
            }
            count={currentPageData.pageInfo}
          />
        </div>

        <DataTable
          columns={currentColumns}
          rows={currentPageData.pageRows}
          sortKey={projectSort.key}
          sortDirection={projectSort.direction}
          onSort={toggleProjectSort}
          onRowClick={(row) => navigate(`/projects/${row.id}`)}
          rowActions={() => [{ key: 'view', label: 'Open project', icon: Eye }]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/projects/${row.id}`);
          }}
          ariaLabel="Current projects"
          emptyContent={
            <EmptyState
              icon={SearchX}
              title="No current projects"
              message="No projects match the current search or status filter."
            />
          }
        />

        <Pagination
          page={currentPageData.currentPage}
          totalPages={currentPageData.totalPages}
          pageSize={projectPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          pageInfo={currentPageData.pageInfo}
          onPageChange={setProjectPage}
          onPageSizeChange={(size) => {
            setProjectPageSize(size);
            setProjectPage(1);
          }}
        />
      </Card>

      {/* 7 — Pending projects table */}
      <Card
        icon={Clock3}
        title="Pending Projects"
        subtitle="Projects waiting on planning, review, approval or a decision"
        className="dash3-table-card"
        bodyClassName="dash3-table-body"
        actions={
          <button type="button" className="dash-link" onClick={() => navigate('/projects/project-status')}>
            Project Status <ArrowRight aria-hidden="true" />
          </button>
        }
      >
        <div className="dash3-table-tools">
          <Toolbar
            right={
              <SearchInput
                id="dash3-pending-search"
                value={pendingSearch}
                onChange={(value) => {
                  setPendingSearch(value);
                  setPendingPage(1);
                }}
                placeholder="Search pending project, activity..."
                ariaLabel="Search pending projects"
              />
            }
            count={pendingPageData.pageInfo}
          />
        </div>

        <DataTable
          columns={pendingColumns}
          rows={pendingPageData.pageRows}
          onRowClick={(row) => navigate(`/projects/${row.id}`)}
          rowActions={() => [
            { key: 'view', label: 'Open project', icon: Eye },
            { key: 'edit', label: 'Edit project', icon: Pencil },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/projects/${row.id}`);
            if (key === 'edit') navigate(`/projects/new-project/${row.id}`);
          }}
          ariaLabel="Pending projects"
          emptyContent={
            <EmptyState
              icon={Clock3}
              title="Nothing pending"
              message="No project is currently waiting for action."
            />
          }
        />

        <Pagination
          page={pendingPageData.currentPage}
          totalPages={pendingPageData.totalPages}
          pageSize={pendingPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          pageInfo={pendingPageData.pageInfo}
          onPageChange={setPendingPage}
          onPageSizeChange={(size) => {
            setPendingPageSize(size);
            setPendingPage(1);
          }}
        />
      </Card>

      {/* 8 — Drawings table */}
      <Card
        icon={DraftingCompass}
        title="Drawings"
        subtitle="Drawing register with revision, type and approval status"
        className="dash3-table-card"
        bodyClassName="dash3-table-body"
        actions={
          <button
            type="button"
            className="dash-link"
            onClick={() => navigate('/cad-management/drawing-register')}
          >
            Drawing Register <ArrowRight aria-hidden="true" />
          </button>
        }
      >
        <div className="dash3-table-tools">
          <Toolbar
            left={
              <Select
                id="dash3-drawing-status"
                label=""
                options={drawingStatusOptions}
                value={drawingStatus}
                onChange={(event) => {
                  setDrawingStatus(event.target.value);
                  setDrawingPage(1);
                }}
              />
            }
            right={
              <SearchInput
                id="dash3-drawing-search"
                value={drawingSearch}
                onChange={(value) => {
                  setDrawingSearch(value);
                  setDrawingPage(1);
                }}
                placeholder="Search drawing, project, type..."
                ariaLabel="Search drawings"
              />
            }
            count={drawingPageData.pageInfo}
          />
        </div>

        <DataTable
          columns={drawingColumns}
          rows={drawingPageData.pageRows}
          sortKey={drawingSort.key}
          sortDirection={drawingSort.direction}
          onSort={toggleDrawingSort}
          onRowClick={(row) => navigate(`/cad-management/drawings/${row.id}`)}
          rowActions={() => [{ key: 'view', label: 'Open drawing', icon: Eye }]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/cad-management/drawings/${row.id}`);
          }}
          ariaLabel="Drawings"
          emptyContent={
            <EmptyState
              icon={DraftingCompass}
              title="No drawings"
              message="No drawings match the current search or status filter."
            />
          }
        />

        <Pagination
          page={drawingPageData.currentPage}
          totalPages={drawingPageData.totalPages}
          pageSize={drawingPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          pageInfo={drawingPageData.pageInfo}
          onPageChange={setDrawingPage}
          onPageSizeChange={(size) => {
            setDrawingPageSize(size);
            setDrawingPage(1);
          }}
        />
      </Card>
    </PageLayout>
  );
}
