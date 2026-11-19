import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CircleCheck,
  ClipboardList,
  Eye,
  FolderKanban,
  ListTodo,
  Lightbulb,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { usePlanning } from '../../context/PlanningContext';
import { useProjects } from '../../context/ProjectsContext';
import { ConvertRecordButton, useWorkflowConversions, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { formatDate } from '../../data/projectData';
import { customerOrDepartment } from '../../data/projectConversion';
import {
  MILESTONE_STATUS_TONES,
  PLAN_STATUSES,
  PLAN_STATUS_TONES,
  milestoneStats,
  overallPlanProgress,
  planTaskStats,
  priorityTone,
  taskStatusTone,
} from '../../data/planningData';

function Fact({ label, children }) {
  return (
    <div className={`fact${children ? '' : ' is-empty'}`}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{children || '—'}</span>
    </div>
  );
}

/**
 * Design Plans register — plan, project, ownership, schedule, live task counts
 * and milestone-derived readiness for every project design plan.
 */
export default function DesignPlansTab() {
  const navigate = useNavigate();
  const { plans, tasks, milestones, removePlan } = usePlanning();
  const { projects } = useProjects();
  const { targetsFor, openConversion } = useWorkflowConversions();

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewing, setViewing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const rows = useMemo(
    () =>
      plans.map((plan) => {
        const project = projects.find((row) => row.id === plan.projectId);
        const planTasks = tasks.filter(
          (task) => task.planId === plan.id || (!task.planId && task.projectId === plan.projectId),
        );
        const planMilestones = milestones.filter((row) => row.planId === plan.id);
        const taskStats = planTaskStats(planTasks);
        const milestoneProgress = milestoneStats(planMilestones);
        return {
          ...plan,
          projectName: project?.name || 'Unknown project',
          department:
            project?.department ||
            (project ? customerOrDepartment(project) : '—'),
          product: project?.product || '',
          projectManager: project?.manager || '',
          sourceRequestId: project?.sourceRequestId || '',
          planTasks,
          planMilestones,
          taskStats,
          milestoneProgress,
          progress: overallPlanProgress(taskStats, milestoneProgress),
        };
      }),
    [plans, tasks, milestones, projects],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
      if (statusFilter !== 'All' && row.status !== statusFilter) return false;
      if (!query) return true;
      return [
        row.id,
        row.name,
        row.projectId,
        row.projectName,
        row.owner,
        row.department,
        row.priority,
        row.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search, projectFilter, statusFilter]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((left, right) => {
      const read = (row) =>
        row[sortKey] ??
        (sortKey === 'taskCount' ? row.taskStats.total : undefined) ??
        '';
      const a = String(read(left));
      const b = String(read(right));
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return list;
  }, [filteredRows, sortKey, sortDirection]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const totalTasks = rows.reduce((total, row) => total + row.taskStats.total, 0);
  const completedTasks = rows.reduce((total, row) => total + row.taskStats.completed, 0);
  const overdueTasks = rows.reduce((total, row) => total + row.taskStats.overdue, 0);
  const readiness = rows.length
    ? Math.round(rows.reduce((total, row) => total + row.progress, 0) / rows.length)
    : 0;

  const kpis = [
    {
      key: 'plans',
      label: 'Design Plans',
      value: String(rows.length),
      sub: 'Project plans in the register',
      icon: ClipboardList,
      tone: 'teal',
    },
    {
      key: 'active',
      label: 'Active Plans',
      value: String(rows.filter((row) => row.status === 'Active').length),
      sub: 'Plans released for task execution',
      icon: Activity,
      tone: 'blue',
    },
    {
      key: 'tasks',
      label: 'Task Completion',
      value: `${completedTasks}/${totalTasks}`,
      sub: 'Completed plan tasks',
      icon: CircleCheck,
      tone: 'emerald',
    },
    {
      key: 'overdue',
      label: 'Overdue / Readiness',
      value: `${overdueTasks} · ${readiness}%`,
      sub: 'Overdue tasks · plan readiness',
      icon: TriangleAlert,
      tone: 'red',
    },
  ];

  const columns = [
    {
      key: 'id',
      label: 'Plan ID',
      sortable: true,
      width: 112,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'projectId',
      label: 'Project ID',
      sortable: true,
      width: 140,
      render: (row) => <span className="cell-id">{row.projectId}</span>,
    },
    {
      key: 'projectName',
      label: 'Project Name',
      sortable: true,
      width: 190,
      render: (row) => (
        <Link className="cell-link cell-clamp" to={`/projects/all-projects/${row.projectId}`}>
          {row.projectName}
        </Link>
      ),
    },
    {
      key: 'name',
      label: 'Plan Title',
      sortable: true,
      width: 215,
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.name}>
          {row.name}
        </span>
      ),
    },
    { key: 'owner', label: 'Design Owner', sortable: true, width: 135 },
    {
      key: 'department',
      label: 'Department',
      width: 140,
      render: (row) => <span className="cell-muted">{row.department || '—'}</span>,
    },
    {
      key: 'start',
      label: 'Planned Start',
      sortable: true,
      width: 115,
      render: (row) => <span className="cell-muted">{formatDate(row.start)}</span>,
    },
    {
      key: 'due',
      label: 'Target Completion',
      sortable: true,
      width: 125,
      render: (row) => <span className="cell-muted">{formatDate(row.due)}</span>,
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      width: 92,
      render: (row) => <StatusBadge status={row.priority} tone={priorityTone(row.priority)} />,
    },
    {
      key: 'taskCount',
      label: 'Tasks',
      sortable: true,
      width: 70,
      align: 'center',
      render: (row) => <strong>{row.taskStats.total}</strong>,
    },
    {
      key: 'completed',
      label: 'Completed',
      width: 92,
      align: 'center',
      render: (row) => <span className="cell-muted">{row.taskStats.completed}</span>,
    },
    {
      key: 'pending',
      label: 'Pending',
      width: 82,
      align: 'center',
      render: (row) => <span className="cell-muted">{row.taskStats.pending}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: 118,
      render: (row) => (
        <StatusBadge status={row.status} tone={PLAN_STATUS_TONES[row.status] || 'gray'} />
      ),
    },
  ];

  const draftCount = rows.filter((row) => row.status === 'Draft').length;

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
          <div className="toolbar-filters">
            <Select
              id="plan-filter-project"
              label="Project"
              options={[
                { value: 'All', label: 'All Projects' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: `${project.id} · ${project.name}`,
                })),
              ]}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            />
            <Select
              id="plan-filter-status"
              label="Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...PLAN_STATUSES.map((status) => ({ value: status, label: status })),
              ]}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
          </div>
        }
        right={
          <>
            <SearchInput
              id="design-plan-search"
              value={search}
              onChange={setSearch}
              placeholder="Search plan, project, owner..."
              ariaLabel="Search design plans"
            />
            <Button
              variant="secondary"
              icon={Plus}
              size="sm"
              onClick={() => navigate('/design-planning/design-plans/new')}
            >
              Create Design Plan
            </Button>
          </>
        }
        count={`${sortedRows.length} plan${sortedRows.length === 1 ? '' : 's'}${
          draftCount ? ` · ${draftCount} draft` : ''
        }`}
      />

      <section className="table-card planning-plan-table">
        <DataTable
          className="planning-plan-table"
          columns={columns}
          rows={sortedRows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          recordHref={(row) => `/design-planning/design-plans/${row.id}`}
          onRowClick={(row) => navigate(`/design-planning/design-plans/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'View plan', icon: Eye },
            { key: 'edit', label: 'Edit plan', icon: Pencil },
            ...(row.status === 'Draft'
              ? [{ key: 'continue', label: 'Continue draft', icon: PlayCircle }]
              : []),
            { key: 'tasks', label: 'Open tasks', icon: ListTodo },
            { key: 'project', label: 'View project', icon: FolderKanban },
            ...(targetsFor('plan', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Create design task', icon: Activity, divider: true }]
              : []),
            ...(row.status === 'Draft'
              ? [{ key: 'delete', label: 'Delete draft plan', icon: Trash2, danger: true, divider: true }]
              : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/design-planning/design-plans/${row.id}`);
            if (key === 'edit' || key === 'continue')
              navigate(`/design-planning/design-plans/${row.id}/edit`);
            if (key === 'tasks') navigate(`/design-planning/tasks-progress?plan=${row.id}`);
            if (key === 'project') navigate(`/projects/all-projects/${row.projectId}`);
            if (key === 'convert') openConversion('plan', row);
            if (key === 'delete') setPendingDelete(row);
          }}
          ariaLabel="Design plan register"
          emptyContent={
            <EmptyState
              icon={ClipboardList}
              title="No Design Plans Found"
              message="No design plan matches the current search or filter selection."
            />
          }
        />
      </section>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.name : 'Design Plan'}
        subtitle={viewing ? `${viewing.id} · ${viewing.projectId} · ${viewing.projectName}` : undefined}
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing?.status === 'Draft' && (
              <Button
                variant="secondary"
                icon={PlayCircle}
                onClick={() => navigate(`/design-planning/design-plans/${viewing.id}/edit`)}
              >
                Continue Draft
              </Button>
            )}
            <Button
              variant="secondary"
              icon={ListTodo}
              onClick={() => navigate(`/design-planning/tasks-progress?plan=${viewing.id}`)}
            >
              Open Tasks
            </Button>
            <Button
              variant="secondary"
              icon={Lightbulb}
              onClick={() => navigate(`/conceptual-design?plan=${viewing.id}`)}
            >
              Conceptual Design
            </Button>
            <ConvertRecordButton type="plan" record={viewing} size="sm" />
            <Button
              icon={Pencil}
              onClick={() => {
                const id = viewing.id;
                setViewing(null);
                navigate(`/design-planning/design-plans/${id}/edit`);
              }}
            >
              Edit Plan
            </Button>
          </>
        }
      >
        {viewing && (
          <>
            <WorkflowLinks type="plan" recordId={viewing.id} />
            <div className="req-view-badges">
              <StatusBadge
                status={viewing.status}
                tone={PLAN_STATUS_TONES[viewing.status] || 'gray'}
              />
              <StatusBadge status={viewing.priority} tone={priorityTone(viewing.priority)} />
              <span className="chip chip-mint">{viewing.projectId}</span>
              <span className="chip chip-mint">{viewing.taskStats.total} tasks</span>
              <span className="chip chip-mint">{viewing.planMilestones.length} milestones</span>
            </div>

            <h3 className="dash-section-title">Project Information</h3>
            <div className="fact-grid">
              <Fact label="Project ID">
                <Link className="cell-link" to={`/projects/all-projects/${viewing.projectId}`}>
                  {viewing.projectId}
                </Link>
              </Fact>
              <Fact label="Project Name">{viewing.projectName}</Fact>
              <Fact label="Source Request ID">{viewing.sourceRequestId}</Fact>
              <Fact label="Product">{viewing.product}</Fact>
              <Fact label="Customer / Department">{viewing.department}</Fact>
              <Fact label="Project Manager">{viewing.projectManager}</Fact>
            </div>

            <h3 className="dash-section-title">Plan Planning Details</h3>
            <div className="fact-grid">
              <Fact label="Design Owner">{viewing.owner}</Fact>
              <Fact label="Assigned Engineers">
                {(viewing.engineers || []).join(', ')}
              </Fact>
              <Fact label="Planned Start">{formatDate(viewing.start)}</Fact>
              <Fact label="Target Completion">{formatDate(viewing.due)}</Fact>
              <Fact label="Priority">{viewing.priority}</Fact>
              <Fact label="Milestone Progress">
                {viewing.milestoneProgress.completed}/{viewing.milestoneProgress.total} complete
              </Fact>
            </div>

            <h3 className="dash-section-title">Design Scope</h3>
            <div className="fact-stack">
              <Fact label="Design Objectives">{viewing.objectives}</Fact>
              <Fact label="Design Scope">{viewing.scope}</Fact>
              <Fact label="Functional Requirements">{viewing.functionalRequirements}</Fact>
              <Fact label="Technical Requirements">{viewing.technicalRequirements}</Fact>
              <Fact label="Design Constraints">{viewing.constraints}</Fact>
              <Fact label="Operating Conditions">{viewing.operatingConditions}</Fact>
              <Fact label="Expected Deliverables">{viewing.deliverables}</Fact>
              <Fact label="Assumptions">{viewing.assumptions}</Fact>
              <Fact label="Risks">{viewing.risks}</Fact>
              <Fact label="Dependencies">{viewing.dependencies}</Fact>
              <Fact label="Responsibilities">{viewing.responsibilities}</Fact>
              <Fact label="Remarks">{viewing.remarks || viewing.notes}</Fact>
              <Fact label="Supporting Attachments">
                {(viewing.attachments || []).map((file) => file.name).join(', ')}
              </Fact>
            </div>

            <h3 className="dash-section-title">Project Planning &amp; Tracking</h3>
            <div className="fact-grid">
              <Fact label="Overall Readiness">{viewing.progress}%</Fact>
              <Fact label="Task Progress">
                {viewing.taskStats.completed}/{viewing.taskStats.total} complete ·{' '}
                {viewing.taskStats.progress}%
              </Fact>
              <Fact label="Milestones">
                {viewing.milestoneProgress.completed}/{viewing.milestoneProgress.total} complete ·{' '}
                {viewing.milestoneProgress.progress}%
              </Fact>
              <Fact label="Overdue Tasks">{viewing.taskStats.overdue}</Fact>
              <Fact label="Pending Tasks">{viewing.taskStats.pending}</Fact>
              <Fact label="Overdue Milestones">{viewing.milestoneProgress.overdue}</Fact>
            </div>
            <div className="fact-stack">
              <Fact label="Upcoming Activities">
                {viewing.taskStats.upcoming.length
                  ? viewing.taskStats.upcoming
                      .map((task) => `${task.id} · ${task.name} (${formatDate(task.due)})`)
                      .join(', ')
                  : 'No upcoming activities'}
              </Fact>
              <Fact label="Pending Dependencies">
                {viewing.taskStats.pendingDependencies.length
                  ? viewing.taskStats.pendingDependencies
                      .map((task) => `${task.id} waits on ${task.dependencies.join(', ')}`)
                      .join('; ')
                  : 'No blocked dependencies'}
              </Fact>
              <Fact label="Responsible Engineers">
                {[...new Set(viewing.planTasks.map((task) => task.engineer).filter(Boolean))].join(', ')}
              </Fact>
            </div>

            <h3 className="dash-section-title">Milestones</h3>
            {viewing.planMilestones.length === 0 ? (
              <p className="dash-note">No milestones recorded for this plan yet.</p>
            ) : (
              <div className="plan-milestone-list">
                {viewing.planMilestones
                  .slice()
                  .sort((left, right) =>
                    String(left.plannedDate).localeCompare(String(right.plannedDate)),
                  )
                  .map((milestone) => (
                    <div key={milestone.id} className="plan-milestone-row">
                      <span className="cell-id">{milestone.id}</span>
                      <div className="plan-milestone-body">
                        <strong>{milestone.name}</strong>
                        <span>
                          Planned {formatDate(milestone.plannedDate)} · Actual{' '}
                          {milestone.actualDate ? formatDate(milestone.actualDate) : 'not recorded'} ·{' '}
                          {milestone.owner || 'Unassigned'}
                        </span>
                      </div>
                      <StatusBadge
                        status={milestone.status}
                        tone={MILESTONE_STATUS_TONES[milestone.status] || 'gray'}
                      />
                    </div>
                  ))}
              </div>
            )}

            <h3 className="dash-section-title">Linked Tasks</h3>
            {viewing.planTasks.length === 0 ? (
              <p className="dash-note">No tasks are linked to this design plan yet.</p>
            ) : (
              <ul className="plan-task-list">
                {viewing.planTasks.map((task) => (
                  <li key={task.id}>
                    <span className="cell-id">{task.id}</span>
                    <span className="plan-task-name">{task.name}</span>
                    <span className="cell-muted">{task.engineer}</span>
                    <span className="cell-muted">{formatDate(task.due)}</span>
                    <StatusBadge status={task.status} tone={taskStatusTone(task.status)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete design plan draft"
        subtitle={pendingDelete ? `${pendingDelete.id} · ${pendingDelete.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                if (pendingDelete) removePlan(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete Draft
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Only Draft plans can be deleted. Its milestones are removed with the plan; the project and
          linked tasks remain in their registers.
        </p>
      </Modal>
    </>
  );
}
