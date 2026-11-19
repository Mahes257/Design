import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, ListTodo, Pencil, PlayCircle } from 'lucide-react';
import { Button, StatusBadge } from '../../components/common';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { usePlanning } from '../../context/PlanningContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  MILESTONE_STATUS_TONES,
  PLAN_STATUS_TONES,
  planTaskStats,
  priorityTone,
  taskStatusTone,
} from '../../data/planningData';

/**
 * Design Plan details — full-page record for one plan ID.
 *
 * The plan, its milestones and its linked tasks come from PlanningContext; the
 * project reference comes from ProjectsContext. Nothing is derived from another
 * plan and no schedule value is invented.
 */
export default function DesignPlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { plans, tasks, milestones } = usePlanning();
  const { projects } = useProjects();

  const plan = plans.find((row) => row.id === planId);

  const linked = useMemo(() => {
    if (!plan) return { tasks: [], milestones: [] };
    return {
      tasks: tasks.filter(
        (task) => task.planId === plan.id || (!task.planId && task.projectId === plan.projectId),
      ),
      milestones: milestones.filter((row) => row.planId === plan.id),
    };
  }, [plan, tasks, milestones]);

  if (!plan) {
    return (
      <RecordNotFound
        icon={ClipboardList}
        title="Design plan not found"
        message={`No design plan with ID ${planId} exists in the current register.`}
        backTo="/design-planning"
        backLabel="Back to Design Plans"
      />
    );
  }

  const project = projects.find((row) => row.id === plan.projectId);
  const stats = planTaskStats(linked.tasks);

  const used = [
    'id', 'name', 'projectId', 'owner', 'engineers', 'start', 'due', 'priority', 'status',
    'objectives', 'scope', 'functionalRequirements', 'technicalRequirements', 'constraints',
    'operatingConditions', 'deliverables', 'assumptions', 'risks', 'dependencies',
    'responsibilities', 'remarks', 'notes', 'attachments',
  ];

  const sections = [
    {
      title: 'Project & Ownership',
      icon: ClipboardList,
      fields: [
        { label: 'Project ID', value: plan.projectId },
        { label: 'Project Name', value: project?.name || 'Unknown project' },
        { label: 'Customer / Department', value: project?.customer || project?.department || '—' },
        { label: 'Product', value: project?.product || '—' },
        { label: 'Project Manager', value: project?.manager || '—' },
        { label: 'Design Owner', value: plan.owner },
        { label: 'Assigned Engineers', value: (plan.engineers || []).join(', ') || '—' },
        { label: 'Source Request', value: project?.sourceRequestId || 'Not linked' },
      ],
    },
    {
      title: 'Schedule & Status',
      icon: ClipboardList,
      fields: [
        { label: 'Planned Start', value: formatDate(plan.start) },
        { label: 'Target Completion', value: formatDate(plan.due) },
        { label: 'Priority', value: plan.priority },
        { label: 'Status', value: plan.status },
        { label: 'Tasks', value: `${stats.completed}/${stats.total} complete` },
        { label: 'Milestones', value: `${linked.milestones.length} recorded` },
        { label: 'Overdue Tasks', value: String(stats.overdue) },
        { label: 'Pending Dependencies', value: String(stats.pendingDependencies.length) },
      ],
    },
    {
      title: 'Design Scope',
      icon: ClipboardList,
      fields: [
        { label: 'Objectives', value: plan.objectives, wide: true },
        { label: 'Scope', value: plan.scope, wide: true },
        { label: 'Functional Requirements', value: plan.functionalRequirements, wide: true },
        { label: 'Technical Requirements', value: plan.technicalRequirements, wide: true },
        { label: 'Design Constraints', value: plan.constraints, wide: true },
        { label: 'Operating Conditions', value: plan.operatingConditions, wide: true },
        { label: 'Expected Deliverables', value: plan.deliverables, wide: true },
        { label: 'Assumptions', value: plan.assumptions, wide: true },
        { label: 'Risks', value: plan.risks, wide: true },
        { label: 'Dependencies', value: plan.dependencies, wide: true },
        { label: 'Responsibilities', value: plan.responsibilities, wide: true },
        { label: 'Remarks', value: plan.remarks || plan.notes, wide: true },
      ],
    },
  ];

  const extra = remainingFields(plan, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: ClipboardList, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Design Planning', to: '/design-planning' },
        { label: 'Design Plans', to: '/design-planning' },
        { label: plan.id },
      ]}
      icon={ClipboardList}
      title={plan.name}
      subtitle={`${plan.id} · ${plan.projectId} · ${plan.status}`}
      recordRef={plan.id}
      status={<StatusBadge status={plan.status} tone={PLAN_STATUS_TONES[plan.status] || 'gray'} />}
      chips={
        <>
          <StatusBadge status={plan.priority} tone={priorityTone(plan.priority)} />
          <span className="chip">{plan.projectId}</span>
          <span className="chip">{linked.tasks.length} tasks</span>
        </>
      }
      meta={[
        ['Plan ID', plan.id],
        ['Project', `${plan.projectId} · ${project?.name || 'Unknown project'}`],
        ['Design Owner', plan.owner],
        ['Planned Start', formatDate(plan.start)],
        ['Target Completion', formatDate(plan.due)],
        ['Priority', plan.priority],
      ]}
      backTo="/design-planning"
      backLabel="Back to Design Plans"
      actions={
        <>
          {plan.status === 'Draft' && (
            <Button
              variant="secondary"
              icon={PlayCircle}
              onClick={() => navigate(`/design-planning/design-plans/${plan.id}/edit`)}
            >
              Continue Draft
            </Button>
          )}
          <Button
            icon={Pencil}
            onClick={() => navigate(`/design-planning/design-plans/${plan.id}/edit`)}
          >
            Edit Plan
          </Button>
        </>
      }
      sections={sections}
      attachments={(plan.attachments || []).map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))}
      related={[
        { label: 'Project', value: `${plan.projectId} · ${project?.name || 'Unknown project'}` },
        { label: 'Source Request', value: project?.sourceRequestId || 'Not linked' },
      ]}
      note="Design plans are stored in this browser. The plan schedule, tasks and milestones are read from the same Planning context the register uses."
      footer={
        <Button
          variant="secondary"
          icon={ListTodo}
          onClick={() => navigate(`/design-planning/tasks-progress?plan=${plan.id}`)}
        >
          Open Linked Tasks
        </Button>
      }
    >
      <div className="card">
        <div className="cad-card-head">
          <div>
            <h3>Milestones</h3>
            <p>{linked.milestones.length} milestone records for this plan.</p>
          </div>
        </div>
        {linked.milestones.length === 0 ? (
          <p className="dash-modal-note">No milestones are recorded for this plan.</p>
        ) : (
          <ul className="plan-task-list">
            {linked.milestones.map((milestone) => (
              <li key={milestone.id}>
                <span className="cell-id">{milestone.id}</span>
                <span className="plan-task-name">{milestone.name}</span>
                <span className="cell-muted">Planned {formatDate(milestone.plannedDate)}</span>
                <StatusBadge
                  status={milestone.status}
                  tone={MILESTONE_STATUS_TONES[milestone.status] || 'gray'}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="cad-card-head">
          <div>
            <h3>Linked Design Tasks</h3>
            <p>Tasks assigned to this plan, with their live status.</p>
          </div>
          <Link className="link-button" to={`/design-planning/tasks-progress?plan=${plan.id}`}>
            Open task list
          </Link>
        </div>
        {linked.tasks.length === 0 ? (
          <p className="dash-modal-note">No design tasks are linked to this plan yet.</p>
        ) : (
          <ul className="plan-task-list">
            {linked.tasks.map((task) => (
              <li key={task.id}>
                <Link className="cell-id" to={`/design-planning/design-tasks/${task.id}`}>
                  {task.id}
                </Link>
                <span className="plan-task-name">{task.name}</span>
                <span className="cell-muted">{task.engineer}</span>
                <span className="cell-muted">{formatDate(task.due)}</span>
                <StatusBadge status={task.status} tone={taskStatusTone(task.status)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </RecordDetailsPage>
  );
}
