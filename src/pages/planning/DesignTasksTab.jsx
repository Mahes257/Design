import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRightLeft,
  CircleCheck,
  Download,
  Eye,
  Filter,
  ListTodo,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  Button,
  DataTable,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { usePlanning } from '../../context/PlanningContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { ConvertRecordButton, useWorkflowConversions, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  DESIGN_DISCIPLINES,
  TASK_STATUSES,
  priorityTone,
  taskCategoryModule,
  taskIsOverdue,
  taskStatusTone,
} from '../../data/planningData';
import exportCsv from '../../utils/exportCsv';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const EMPTY_FILTERS = {
  projectId: 'All',
  discipline: 'All',
  status: 'All',
  priority: 'All',
  engineer: 'All',
  dueFrom: '',
  dueTo: '',
};

function Fact({ label, children }) {
  return (
    <div className={`fact${children ? '' : ' is-empty'}`}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{children || '—'}</span>
    </div>
  );
}

/* ==========================================================================
   Design Tasks — full task register with dependencies and workflow status.
   ========================================================================== */
export default function DesignTasksTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, plans, updateTask, removeTask } = usePlanning();
  const { projects } = useProjects();

  const planFilter = searchParams.get('plan') || '';
  const activePlan = plans.find((plan) => plan.id === planFilter) || null;

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('due');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewing, setViewing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { designs } = useMechanical();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const projectName = (id) => projects.find((project) => project.id === id)?.name || 'Unassigned';
  const designName = (id) => designs.find((design) => design.id === id)?.name || 'Design record';
  const taskName = (id) => tasks.find((task) => task.id === id)?.name || id;

  const rows = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        projectName: projectName(task.projectId),
        designName: designName(task.designId),
        planName: plans.find((plan) => plan.id === task.planId)?.name || '',
        overdue: taskIsOverdue(task),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, projects, designs, plans],
  );

  const kpis = [
    {
      key: 'total',
      label: 'Total Tasks',
      value: String(rows.length),
      sub: 'Across every active project',
      icon: ListTodo,
      tone: 'teal',
    },
    {
      key: 'progress',
      label: 'In Progress',
      value: String(rows.filter((row) => row.status === 'In Progress').length),
      sub: 'Actively being designed',
      icon: Activity,
      tone: 'blue',
    },
    {
      key: 'review',
      label: 'Under Review',
      value: String(
        rows.filter((row) => ['Under Review', 'Submitted'].includes(row.status)).length,
      ),
      sub: 'Submitted for technical review',
      icon: CircleCheck,
      tone: 'purple',
    },
    {
      key: 'blocked',
      label: 'Blocked / Overdue',
      value: String(rows.filter((row) => row.status === 'Blocked' || row.overdue).length),
      sub: 'Needs attention this week',
      icon: ShieldAlert,
      tone: 'red',
    },
  ];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (planFilter && row.planId !== planFilter) return false;
      if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
      if (filters.discipline !== 'All' && row.discipline !== filters.discipline) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (filters.priority !== 'All' && row.priority !== filters.priority) return false;
      if (filters.engineer !== 'All' && row.engineer !== filters.engineer) return false;
      if (filters.dueFrom && row.due < filters.dueFrom) return false;
      if (filters.dueTo && row.due > filters.dueTo) return false;
      if (!query) return true;
      return [
        row.id,
        row.name,
        row.projectName,
        row.designId,
        row.designName,
        row.discipline,
        row.engineer,
        row.status,
        row.dependencies.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search, filters, planFilter]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((left, right) => {
      const a = String(left[sortKey] ?? '');
      const b = String(right[sortKey] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return list;
  }, [filteredRows, sortKey, sortDirection]);

  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;

  const hasFilters =
    Boolean(search) || Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key]);

  const resetAll = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const columns = [
    {
      key: 'id',
      label: 'Task ID',
      sortable: true,
      width: 96,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'name',
      label: 'Task Name',
      sortable: true,
      width: 215,
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'projectName',
      label: 'Project ID',
      width: 165,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    {
      key: 'planId',
      label: 'Plan ID',
      width: 120,
      render: (row) =>
        row.planId ? <span className="cell-id">{row.planId}</span> : <span className="cell-muted">Not linked</span>,
    },
    {
      key: 'designId',
      label: 'Design Record',
      width: 175,
      render: (row) =>
        row.designId ? (
          <span className="cell-project">
            <Link className="cell-link" to={`/mechanical-design/design-register/${row.designId}`}>
              {row.designId}
            </Link>
            <span className="cell-muted">{row.designName}</span>
          </span>
        ) : (
          <span className="cell-muted">Not linked</span>
        ),
    },
    {
      key: 'discipline',
      label: 'Task Category',
      width: 140,
      render: (row) => {
        const module = taskCategoryModule(row.discipline);
        return (
          <Link className="chip chip-mint" to={module.path} title={module.label}>
            {row.discipline}
          </Link>
        );
      },
    },
    { key: 'engineer', label: 'Assigned Engineer', width: 135 },
    {
      key: 'module',
      label: 'Engineering Module',
      width: 170,
      render: (row) => {
        const module = taskCategoryModule(row.discipline);
        return (
          <Link className="cell-link" to={module.path}>
            {module.label}
          </Link>
        );
      },
    },
    {
      key: 'start',
      label: 'Start Date',
      sortable: true,
      width: 96,
      render: (row) => <span className="cell-muted">{formatDate(row.start)}</span>,
    },
    {
      key: 'due',
      label: 'Due Date',
      sortable: true,
      width: 96,
      render: (row) => (
        <span className={`cell-muted${row.overdue ? ' is-overdue' : ''}`}>
          {formatDate(row.due)}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      width: 84,
      render: (row) => <StatusBadge status={row.priority} tone={priorityTone(row.priority)} />,
    },
    {
      key: 'dependencies',
      label: 'Dependencies',
      width: 115,
      render: (row) =>
        row.dependencies.length === 0 ? (
          <span className="cell-muted">—</span>
        ) : (
          <span className="dependency-chips">
            {row.dependencies.map((dependency) => (
              <span key={dependency} className="dep-chip" title={taskName(dependency)}>
                {dependency}
              </span>
            ))}
          </span>
        ),
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      width: 132,
      render: (row) => (
        <span className="progress-cell">
          <span className="progress-track">
            <span
              className={`progress-fill tone-${
                row.status === 'Completed'
                  ? 'green'
                  : row.status === 'Blocked' || row.overdue
                    ? 'red'
                    : 'teal'
              }`}
              style={{ width: `${row.progress}%` }}
            />
          </span>
          <span className="progress-value">{row.progress}%</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 152,
      render: (row) => (
        <select
          className="inline-status-select"
          aria-label={`Update status for ${row.id}`}
          value={row.status}
          onChange={(event) => {
            const status = event.target.value;
            const progress =
              status === 'Completed'
                ? 100
                : ['Not Started', 'Assigned'].includes(status)
                  ? 0
                  : row.progress;
            updateTask(row.id, { status, progress });
          }}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      ),
    },
  ];

  const csvColumns = [
    { key: 'id', label: 'Task ID' },
    { key: 'name', label: 'Task Name' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectName', label: 'Project' },
    { key: 'designId', label: 'Design Record' },
    { key: 'designName', label: 'Design Name' },
    { key: 'discipline', label: 'Task Category' },
    { key: 'engineer', label: 'Assigned Engineer' },
    {
      key: 'module',
      label: 'Engineering Module',
      value: (row) => taskCategoryModule(row.discipline).label,
    },
    { key: 'start', label: 'Start Date', value: (row) => formatDate(row.start) },
    { key: 'due', label: 'Due Date', value: (row) => formatDate(row.due) },
    { key: 'priority', label: 'Priority' },
    { key: 'dependencies', label: 'Dependencies', value: (row) => row.dependencies.join(' ') },
    { key: 'progress', label: 'Progress %' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <>
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </KpiGrid>

      <Toolbar
        left={
          <>
            {planFilter && (
              <Button variant="ghost" icon={X} onClick={() => setSearchParams({})}>
                Plan filter: {activePlan ? `${planFilter} · ${activePlan.name}` : planFilter} — clear
              </Button>
            )}
            <Button
              variant="ghost"
              icon={Filter}
              className={filtersOpen ? 'is-active' : ''}
              aria-expanded={filtersOpen}
              onClick={() => {
                setDraftFilters(filters);
                setFiltersOpen((value) => !value);
              }}
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {hasFilters && (
              <Button variant="ghost" icon={X} onClick={resetAll}>
                Clear
              </Button>
            )}
            <Button variant="ghost" icon={RefreshCw} onClick={resetAll}>
              Refresh
            </Button>
          </>
        }
        right={
          <>
            <SearchInput
              id="design-task-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search task, project, engineer..."
              ariaLabel="Search design tasks"
            />
            <Dropdown
              trigger={({ open, toggle }) => (
                <Button variant="ghost" icon={Download} onClick={toggle} aria-expanded={open}>
                  Export
                </Button>
              )}
            >
              {({ close }) => (
                <DropdownItem
                  icon={Download}
                  onClick={() => {
                    exportCsv('design-tasks', csvColumns, sortedRows);
                    close();
                  }}
                >
                  Export CSV
                </DropdownItem>
              )}
            </Dropdown>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <Select
              id="task-filter-project"
              label="Project"
              options={[
                { value: 'All', label: 'All Projects' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: `${project.id} · ${project.name}`,
                })),
              ]}
              value={draftFilters.projectId}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))
              }
            />
            <Select
              id="task-filter-discipline"
              label="Task Category"
              options={[
                { value: 'All', label: 'All Categories' },
                ...DESIGN_DISCIPLINES.map((discipline) => ({
                  value: discipline,
                  label: discipline,
                })),
              ]}
              value={draftFilters.discipline}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, discipline: event.target.value }))
              }
            />
            <Select
              id="task-filter-status"
              label="Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...TASK_STATUSES.map((status) => ({ value: status, label: status })),
              ]}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            />
            <Select
              id="task-filter-priority"
              label="Priority"
              options={[
                { value: 'All', label: 'All Priorities' },
                ...['Critical', 'High', 'Medium', 'Low'].map((priority) => ({
                  value: priority,
                  label: priority,
                })),
              ]}
              value={draftFilters.priority}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, priority: event.target.value }))
              }
            />
            <Select
              id="task-filter-engineer"
              label="Assigned Engineer"
              options={[
                { value: 'All', label: 'All Engineers' },
                ...ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
              ]}
              value={draftFilters.engineer}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, engineer: event.target.value }))
              }
            />
            <Input
              id="task-filter-from"
              label="Due From"
              type="date"
              value={draftFilters.dueFrom}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, dueFrom: event.target.value }))
              }
            />
            <Input
              id="task-filter-to"
              label="Due To"
              type="date"
              value={draftFilters.dueTo}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, dueTo: event.target.value }))
              }
            />
            <div className="filter-actions">
              <Button
                onClick={() => {
                  setFilters(draftFilters);
                  setPage(1);
                  setFiltersOpen(false);
                }}
              >
                Apply Filters
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraftFilters(EMPTY_FILTERS);
                  resetAll();
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="table-card">
        <DataTable
          columns={columns}
          rows={pageRows}
          className="planning-task-table"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          recordHref={(row) => `/design-planning/design-tasks/${row.id}`}
          onRowClick={(row) => navigate(`/design-planning/design-tasks/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'View task', icon: Eye },
            { key: 'edit', label: 'Edit task', icon: Pencil },
            ...(targetsFor('task', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Convert task', icon: ArrowRightLeft, divider: true }]
              : []),
            { key: 'delete', label: 'Delete task', icon: Trash2, danger: true, divider: true },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/design-planning/design-tasks/${row.id}`);
            if (key === 'edit') navigate(`/design-planning/design-tasks/${row.id}/edit`);
            if (key === 'convert') openConversion('task', row);
            if (key === 'delete') setPendingDelete(row);
          }}
          ariaLabel="Design task register"
          emptyContent={
            <EmptyState
              icon={ListTodo}
              title="No Design Tasks Found"
              message="No tasks match the current search or filter selection."
              action={
                hasFilters && (
                  <Button variant="ghost" icon={X} onClick={resetAll}>
                    Clear Filters
                  </Button>
                )
              }
            />
          }
        />

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          pageInfo={pageInfo}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.name : 'Design Task'}
        subtitle={viewing ? `${viewing.id} · ${viewing.projectId} · ${viewing.projectName}` : undefined}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setViewing(null)}>
              Close
            </Button>
            <ConvertRecordButton type="task" record={viewing} />
            <Button
              icon={Pencil}
              onClick={() => {
                const id = viewing.id;
                setViewing(null);
                navigate(`/design-planning/design-tasks/${id}/edit`);
              }}
            >
              Edit Task
            </Button>
          </>
        }
      >
        {viewing && (
          <>
            <WorkflowLinks type="task" recordId={viewing.id} />
            <div className="req-view-badges">
              <StatusBadge status={viewing.status} tone={taskStatusTone(viewing.status)} />
              <StatusBadge status={viewing.priority} tone={priorityTone(viewing.priority)} />
              <span className="chip chip-mint">{viewing.discipline}</span>
              {viewing.overdue && <span className="chip chip-overdue">Overdue</span>}
            </div>
            <div className="fact-grid">
              <Fact label="Task ID">{viewing.id}</Fact>
              <Fact label="Project">
                {viewing.projectId} · {viewing.projectName}
              </Fact>
              <Fact label="Design Record">
                {viewing.designId ? (
                  <Link
                    className="cell-link"
                    to={`/mechanical-design/design-register/${viewing.designId}`}
                  >
                    {viewing.designId} · {viewing.designName}
                  </Link>
                ) : (
                  'Not linked'
                )}
              </Fact>
              <Fact label="Assigned Engineer">{viewing.engineer}</Fact>
              <Fact label="Task Category">{viewing.discipline}</Fact>
              <Fact label="Engineering Module">
                <Link className="cell-link" to={taskCategoryModule(viewing.discipline).path}>
                  {taskCategoryModule(viewing.discipline).label}
                </Link>
              </Fact>
              <Fact label="Estimated Effort">{viewing.effort} h</Fact>
              <Fact label="Start Date">{formatDate(viewing.start)}</Fact>
              <Fact label="Due Date">{formatDate(viewing.due)}</Fact>
              <Fact label="Progress">{viewing.progress}%</Fact>
              <Fact label="Dependencies">
                {viewing.dependencies.length > 0
                  ? viewing.dependencies
                      .map((dependency) => `${dependency} · ${taskName(dependency)}`)
                      .join(', ')
                  : 'None'}
              </Fact>
              <Fact label="Design Plan">
                {viewing.planId ? `${viewing.planId} · ${viewing.planName}` : 'Not linked'}
              </Fact>
              <Fact label="Supporting Team">
                {(viewing.supportingTeam || []).join(', ')}
              </Fact>
            </div>
            <div className="fact-stack">
              <Fact label="Task Notes">{viewing.notes}</Fact>
              <Fact label="Completion Notes">{viewing.completionNotes}</Fact>
              <Fact label="Attachments">
                {(viewing.attachments || []).map((file) => file.name).join(', ')}
              </Fact>
              <Fact label="Comments">
                {(viewing.comments || [])
                  .map((comment) => `${comment.by || 'Team'}: ${comment.text}`)
                  .join(' | ')}
              </Fact>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Design Task"
        subtitle={pendingDelete ? `${pendingDelete.id} · ${pendingDelete.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                if (pendingDelete) removeTask(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Removing the task also removes it from the schedule and workload calculations. Other tasks
          that depend on it keep their dependency reference.
        </p>
      </Modal>
    </>
  );
}

export { Fact };
