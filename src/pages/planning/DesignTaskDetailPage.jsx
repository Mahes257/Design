import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, ListTodo, Pencil } from 'lucide-react';
import { Button, StatusBadge } from '../../components/common';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { usePlanning } from '../../context/PlanningContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import { formatDate } from '../../data/projectData';
import {
  priorityTone,
  taskCategoryModule,
  taskIsOverdue,
  taskStatusTone,
} from '../../data/planningData';

/**
 * Design Task details — full-page record for one task ID, read from
 * PlanningContext (task, its plan and its dependency tasks) plus the project and
 * design records it references.
 */
export default function DesignTaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { tasks, plans } = usePlanning();
  const { designs } = useMechanical();
  const { projects } = useProjects();
  const { targetsFor, openConversion } = useWorkflowConversions();

  const task = tasks.find((row) => row.id === taskId);

  if (!task) {
    return (
      <RecordNotFound
        icon={ListTodo}
        title="Design task not found"
        message={`No design task with ID ${taskId} exists in the current register.`}
        backTo="/design-planning/tasks-progress"
        backLabel="Back to Design Tasks"
      />
    );
  }

  const project = projects.find((row) => row.id === task.projectId);
  const plan = plans.find((row) => row.id === task.planId);
  const design = designs.find((row) => row.id === task.designId);
  const dependencies = (task.dependencies || []).map((id) => {
    const dependency = tasks.find((row) => row.id === id);
    return dependency ? `${id} · ${dependency.name}` : id;
  });
  const overdue = taskIsOverdue(task);
  const conversionAvailable = targetsFor('task', task).some((target) => target.enabled);

  const used = [
    'id', 'name', 'projectId', 'planId', 'designId', 'discipline', 'engineer', 'effort',
    'start', 'due', 'progress', 'status', 'priority', 'dependencies', 'supportingTeam',
    'notes', 'completionNotes', 'attachments', 'comments',
  ];

  const sections = [
    {
      title: 'Assignment',
      icon: ListTodo,
      fields: [
        { label: 'Task ID', value: task.id },
        { label: 'Project', value: `${task.projectId} · ${project?.name || project?.id || '—'}` },
        { label: 'Design Plan', value: plan ? `${plan.id} · ${plan.name}` : task.planId || 'Not linked' },
        { label: 'Design Record', value: design ? `${design.id} · ${design.name}` : task.designId || 'Not linked' },
        { label: 'Task Category', value: task.discipline },
        { label: 'Engineering Module', value: taskCategoryModule(task.discipline).label },
        { label: 'Assigned Engineer', value: task.engineer },
        { label: 'Supporting Team', value: (task.supportingTeam || []).join(', ') || '—' },
      ],
    },
    {
      title: 'Schedule & Progress',
      icon: ListTodo,
      fields: [
        { label: 'Start Date', value: formatDate(task.start) },
        { label: 'Due Date', value: formatDate(task.due) },
        { label: 'Estimated Effort', value: task.effort ? `${task.effort} h` : '—' },
        { label: 'Progress', value: `${task.progress}%` },
        { label: 'Status', value: task.status },
        { label: 'Priority', value: task.priority },
        { label: 'Overdue', value: overdue ? 'Yes — due date has passed' : 'No' },
      ],
    },
    {
      title: 'Dependencies & Notes',
      icon: ListTodo,
      fields: [
        { label: 'Dependencies', value: dependencies.join(', ') || 'None', wide: true },
        { label: 'Task Notes', value: task.notes, wide: true },
        { label: 'Completion Notes', value: task.completionNotes, wide: true },
        {
          label: 'Comments',
          value: (task.comments || [])
            .map((comment) => `${comment.by || 'Team'}: ${comment.text}`)
            .join(' | ') || 'No comments recorded',
          wide: true,
        },
      ],
    },
  ];

  const extra = remainingFields(task, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: ListTodo, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Design Planning', to: '/design-planning' },
        { label: 'Tasks & Progress', to: '/design-planning/tasks-progress' },
        { label: task.id },
      ]}
      icon={ListTodo}
      title={task.name}
      subtitle={`${task.id} · ${task.projectId} · ${task.discipline}`}
      recordRef={task.id}
      status={<StatusBadge status={task.status} tone={taskStatusTone(task.status)} />}
      chips={
        <>
          <StatusBadge status={task.priority} tone={priorityTone(task.priority)} />
          <span className="chip">{task.discipline}</span>
          {overdue && <span className="chip">Overdue</span>}
        </>
      }
      meta={[
        ['Task ID', task.id],
        ['Project', `${task.projectId} · ${project?.name || '—'}`],
        ['Assigned Engineer', task.engineer],
        ['Due Date', formatDate(task.due)],
        ['Progress', `${task.progress}%`],
        ['Priority', task.priority],
      ]}
      backTo="/design-planning/tasks-progress"
      backLabel="Back to Design Tasks"
      actions={
        <>
          {conversionAvailable && (
            <Button
              variant="secondary"
              icon={ArrowRightLeft}
              onClick={() => openConversion('task', task)}
            >
              Convert Task
            </Button>
          )}
          <Button
            icon={Pencil}
            onClick={() => navigate(`/design-planning/design-tasks/${task.id}/edit`)}
          >
            Edit Task
          </Button>
        </>
      }
      sections={sections}
      attachments={(task.attachments || []).map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))}
      related={[
        { label: 'Project', value: `${task.projectId} · ${project?.name || '—'}` },
        { label: 'Design Plan', value: plan ? `${plan.id} · ${plan.name}` : 'Not linked' },
        {
          label: 'Mechanical Design',
          value: design ? `${design.id} · ${design.name}` : 'Not linked',
        },
      ]}
      note="The task register is shared by every engineering module; this task's status and progress are the values stored in the browser."
    />
  );
}
