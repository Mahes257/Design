import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ListTodo,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  PageHeader,
  PageLayout,
  Select,
  Textarea,
} from '../../components/common';
import { usePlanning } from '../../context/PlanningContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, TODAY, addDays, daysBetween, formatDate } from '../../data/projectData';
import {
  DESIGN_DISCIPLINES,
  TASK_STATUSES,
  dependencyCreatesCycle,
  durationDays,
  nextTaskId,
} from '../../data/planningData';

function initialForm(projectId, designId = '', planId = '') {
  return {
    name: '',
    projectId: projectId || '',
    planId,
    designId,
    discipline: 'Machine Design',
    engineer: 'D. Rao',
    supportingTeam: [],
    start: TODAY,
    due: addDays(TODAY, 21),
    priority: 'Medium',
    progress: '0',
    status: 'Not Started',
    effort: '24',
    dependencies: [],
    notes: '',
    completionNotes: '',
    attachments: [],
    comments: [],
  };
}

function formFromTask(task) {
  return {
    name: task.name,
    projectId: task.projectId,
    planId: task.planId || '',
    designId: task.designId || '',
    discipline: task.discipline,
    engineer: task.engineer,
    supportingTeam: [...(task.supportingTeam || [])],
    start: task.start,
    due: task.due,
    priority: task.priority,
    progress: String(task.progress),
    status: task.status,
    effort: String(task.effort || 24),
    dependencies: [...(task.dependencies || [])],
    notes: task.notes || '',
    completionNotes: task.completionNotes || '',
    attachments: [...(task.attachments || [])],
    comments: [...(task.comments || [])],
  };
}

function bumpId(id) {
  const parts = id.split('-');
  const numeric = Number(parts[parts.length - 1]);
  if (!Number.isFinite(numeric)) return id;
  return [...parts.slice(0, -1), String(numeric + 1)].join('-');
}

/**
 * New / Edit Design Task — full-page form with task details, schedule,
 * dependencies and progress, plus the actions at the end of the form.
 */
export default function DesignTaskFormPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { tasks, plans, addTask, updateTask } = usePlanning();
  const { designs } = useMechanical();
  const { projects } = useProjects();

  const editing = useMemo(
    () => (taskId ? tasks.find((task) => task.id === taskId) : null),
    [taskId, tasks],
  );

  const [formId, setFormId] = useState(() => (editing ? editing.id : nextTaskId(tasks)));
  const [form, setForm] = useState(() =>
    editing
      ? formFromTask(editing)
      : initialForm(
          projects[0]?.id,
          designs.find((design) => design.projectId === projects[0]?.id)?.id || '',
          plans.find((plan) => plan.projectId === projects[0]?.id)?.id || '',
        ),
  );
  const [openSections, setOpenSections] = useState({ info: true, schedule: true, notes: true });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');

  // The new and edit routes share this component. When navigation reuses the
  // instance (for example from the post-create "Open task" action), reload the
  // selected task instead of leaving the previous, reset form on screen.
  useEffect(() => {
    if (!editing || editing.id === formId) return;
    setFormId(editing.id);
    setForm(formFromTask(editing));
    setErrors({});
    setBanner(null);
    setOpenSections({ info: true, schedule: true, notes: true });
  }, [editing, formId]);

  if (taskId && !editing) {
    return <Navigate to="/design-planning/tasks-progress" replace />;
  }

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const project = projects.find((row) => row.id === form.projectId);
  const projectTasks = tasks.filter(
    (task) => task.projectId === form.projectId && task.id !== formId,
  );
  const projectDesigns = designs.filter((design) => design.projectId === form.projectId);

  const duration = form.start && form.due && form.due >= form.start
    ? durationDays(form.start, form.due)
    : 0;

  const projectPlans = plans.filter((plan) => plan.projectId === form.projectId);

  const toggleDependency = (id) =>
    setForm((previous) => ({
      ...previous,
      dependencies: previous.dependencies.includes(id)
        ? previous.dependencies.filter((value) => value !== id)
        : [...previous.dependencies, id],
    }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Task name is required.';
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.start) next.start = 'Start date is required.';
    if (!form.due) next.due = 'Due date is required.';
    if (form.start && form.due && form.due < form.start) {
      next.due = 'Due date must be on or after the start date.';
    }
    if (form.dependencies.length && dependencyCreatesCycle(tasks, formId, form.dependencies)) {
      next.dependencies = 'Dependencies cannot form a loop back to this task.';
    }
    const conflicting = form.dependencies
      .map((id) => tasks.find((task) => task.id === id))
      .filter((task) => task && task.due && form.start && task.due > form.start);
    if (!next.dependencies && conflicting.length) {
      next.dependencies = `Dependency ${conflicting[0].id} is planned to finish on ${formatDate(
        conflicting[0].due,
      )}, after this task starts on ${formatDate(
        form.start,
      )}. Move the dates or remove the dependency.`;
    }
    if (form.status === 'Completed' && !form.completionNotes.trim()) {
      next.completionNotes =
        'Record the completion notes before marking the task Completed.';
    }
    return next;
  };

  const buildRecord = (status, progress) => ({
    id: formId,
    name: form.name.trim(),
    projectId: form.projectId,
    planId: form.planId || '',
    designId: form.designId || '',
    discipline: form.discipline,
    engineer: form.engineer,
    supportingTeam: form.supportingTeam,
    completionNotes: form.completionNotes.trim(),
    attachments: form.attachments,
    comments: form.comments,
    start: form.start,
    due: form.due,
    priority: form.priority,
    dependencies: form.dependencies,
    progress,
    status,
    effort: Math.max(1, Number(form.effort) || 1),
    notes: form.notes.trim(),
  });

  const resetForm = () => {
    setForm(
      initialForm(
        projects[0]?.id,
        designs.find((design) => design.projectId === projects[0]?.id)?.id || '',
        plans.find((plan) => plan.projectId === projects[0]?.id)?.id || '',
      ),
    );
    setErrors({});
  };

  const saveDraft = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Task name is required.';
    if (!form.projectId) next.projectId = 'Select a project.';
    if (form.start && form.due && form.due < form.start) {
      next.due = 'Due date must be on or after the start date.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setBanner({ tone: 'error', message: 'Add a task name and project before saving the draft.' });
      return;
    }

    if (editing) {
      updateTask(formId, buildRecord('Not Started', 0));
      setForm((previous) => ({ ...previous, status: 'Not Started', progress: '0' }));
      setBanner({ tone: 'success', message: `${formId} saved as a draft task.` });
      return;
    }

    const record = buildRecord('Not Started', 0);
    addTask(record);
    setBanner({
      tone: 'success',
      message: `Draft task ${record.id} saved to the design task register.`,
      taskId: record.id,
      newRecord: true,
    });
    resetForm();
    setFormId(bumpId(record.id));
  };

  const submit = (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({ info: true, schedule: true, notes: true });
      setBanner({ tone: 'error', message: 'Complete the required task fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const progress = Math.min(100, Math.max(0, Number(form.progress) || 0));

    if (editing) {
      updateTask(formId, buildRecord(form.status, progress));
      setBanner({ tone: 'success', message: `${formId} updated successfully.` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const record = buildRecord(form.status, progress);
    addTask(record);
    setBanner({
      tone: 'success',
      message: `Task ${record.id} created for ${project?.name || record.projectId}.`,
      taskId: record.id,
      newRecord: true,
    });
    resetForm();
    setFormId(bumpId(record.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sectionCard = (key, icon, title, subtitle, body) => {
    const Icon = icon;
    const open = openSections[key];
    return (
      <section className={`form-section-card${open ? ' is-open' : ''}`} key={key}>
        <button
          type="button"
          className="form-section-head"
          aria-expanded={open}
          onClick={() => toggleSection(key)}
        >
          <span className="form-section-icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="form-section-text">
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </span>
          <ChevronDown className="form-section-chevron" aria-hidden="true" />
        </button>
        {open && <div className="form-section-body">{body}</div>}
      </section>
    );
  };

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Design Planning', to: '/design-planning' },
            { label: 'Tasks & Progress', to: '/design-planning/tasks-progress' },
            { label: editing ? `${formId} · Edit` : 'New Task' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={ListTodo}
          title={editing ? 'Edit Task' : 'Create Task'}
          subtitle={
            editing
              ? `Update the planned task and progress for ${project?.name || form.projectId}.`
              : 'Plan a task with its category, assigned engineer, dates, dependencies and progress.'
          }
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/design-planning/tasks-progress')}
            >
              Back to Tasks & Progress
            </Button>
          }
        />
      }
    >
      <form className="project-form-page" onSubmit={submit} noValidate>
        {banner && (
          <div className={`form-banner ${banner.tone}`} role="status">
            {banner.tone === 'success' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            <span>
              {banner.message}
              {banner.newRecord && (
                <button
                  type="button"
                  className="form-banner-action"
                  onClick={() => navigate(`/design-planning/design-tasks/${banner.taskId}/edit`)}
                >
                  Open task <ArrowRight aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        )}

        {sectionCard(
          'info',
          ListTodo,
          'Task Information',
          'Identification, project, discipline and ownership',
          <div className="form-grid">
            <div className="form-field">
              <span className="form-label">Task ID</span>
              <span className="form-static">{formId}</span>
            </div>
            <Select
              id="task-project"
              label="Project ID"
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
              ]}
              value={form.projectId}
              hint={errors.projectId}
              aria-invalid={Boolean(errors.projectId)}
              onChange={(event) => {
                const nextProjectId = event.target.value;
                setForm((previous) => ({
                  ...previous,
                  projectId: nextProjectId,
                  planId: plans.find((plan) => plan.projectId === nextProjectId)?.id || '',
                  designId:
                    designs.find((design) => design.projectId === nextProjectId)?.id || '',
                  dependencies: [],
                }));
              }}
            />
            <div className="form-field">
              <span className="form-label">Project Domain</span>
              <span className="form-static">{project?.domain || 'Not selected'}</span>
            </div>
            <div className="form-grid-full">
              <Select
                id="task-plan"
                label="Design Plan (Plan ID)"
                options={[
                  { value: '', label: 'No design plan linked' },
                  ...projectPlans.map((plan) => ({
                    value: plan.id,
                    label: `${plan.id} · ${plan.name} · ${plan.status}`,
                  })),
                ]}
                value={form.planId || ''}
                hint="Tasks are counted against this design plan's progress."
                onChange={(event) => setField('planId', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <span className="form-label">
                Supporting Team
                <span className="form-label-count">{form.supportingTeam.length} selected</span>
              </span>
              <div className="check-grid">
                {ENGINEERS.filter((engineer) => engineer !== form.engineer).map((engineer) => (
                  <label
                    key={engineer}
                    className={`check-chip${form.supportingTeam.includes(engineer) ? ' is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.supportingTeam.includes(engineer)}
                      onChange={() =>
                        setForm((previous) => ({
                          ...previous,
                          supportingTeam: previous.supportingTeam.includes(engineer)
                            ? previous.supportingTeam.filter((name) => name !== engineer)
                            : [...previous.supportingTeam, engineer],
                        }))
                      }
                    />
                    {engineer}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-grid-full">
              <Select
                id="task-design"
                label="Linked Design Record"
                options={[
                  {
                    value: '',
                    label: projectDesigns.length
                      ? 'No design record linked'
                      : 'No design records for this project',
                  },
                  ...projectDesigns.map((design) => ({
                    value: design.id,
                    label: `${design.id} · ${design.name} · Rev ${design.revision}`,
                  })),
                ]}
                value={form.designId || ''}
                hint="Links this planning task to the design record in Mechanical Engineering Design."
                onChange={(event) => setField('designId', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Input
                id="task-name"
                label="Task Name"
                placeholder="e.g. Detail part modelling and assembly"
                value={form.name}
                hint={errors.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setField('name', event.target.value)}
              />
            </div>
            <Select
              id="task-discipline"
              label="Task Category"
              options={DESIGN_DISCIPLINES.map((discipline) => ({
                value: discipline,
                label: discipline,
              }))}
              value={form.discipline}
              onChange={(event) => setField('discipline', event.target.value)}
            />
            <Select
              id="task-engineer"
              label="Assigned Engineer"
              options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
              value={form.engineer}
              onChange={(event) => setField('engineer', event.target.value)}
            />
            <Select
              id="task-priority"
              label="Priority"
              options={['Critical', 'High', 'Medium', 'Low'].map((priority) => ({
                value: priority,
                label: priority,
              }))}
              value={form.priority}
              onChange={(event) => setField('priority', event.target.value)}
            />
            <Select
              id="task-status"
              label="Status"
              options={TASK_STATUSES.map((status) => ({ value: status, label: status }))}
              value={form.status}
              onChange={(event) => {
                const status = event.target.value;
                setField('status', status);
                if (status === 'Completed') setField('progress', '100');
                if (['Not Started', 'Assigned'].includes(status)) setField('progress', '0');
              }}
            />
          </div>,
        )}

        {sectionCard(
          'schedule',
          CalendarClock,
          'Schedule & Dependencies',
          'Planned dates, duration, effort, progress and predecessor tasks',
          <div className="form-grid">
            <Input
              id="task-start"
              label="Start Date"
              type="date"
              value={form.start}
              hint={errors.start}
              aria-invalid={Boolean(errors.start)}
              onChange={(event) => setField('start', event.target.value)}
            />
            <Input
              id="task-due"
              label="Due Date"
              type="date"
              value={form.due}
              hint={errors.due}
              aria-invalid={Boolean(errors.due)}
              onChange={(event) => setField('due', event.target.value)}
            />
            <div className="form-field">
              <span className="form-label">Duration</span>
              <span className="form-static">
                {duration > 0
                  ? `${duration} days · ${Math.round((daysBetween(form.start, form.due) / 7) * 10) / 10} weeks`
                  : '—'}
              </span>
            </div>
            <Input
              id="task-effort"
              label="Estimated Effort (hours)"
              type="number"
              min="1"
              max="400"
              value={form.effort}
              onChange={(event) => setField('effort', event.target.value)}
            />
            <div className="form-field">
              <span className="form-label">
                Progress
                <span className="form-label-count">{Math.min(100, Math.max(0, Number(form.progress) || 0))}%</span>
              </span>
              <input
                id="task-progress"
                className="form-range"
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.progress}
                onChange={(event) => setField('progress', event.target.value)}
              />
            </div>
            <div className="form-field">
              <span className="form-label">Planned Finish</span>
              <span className="form-static">{form.due ? formatDate(form.due) : 'Not scheduled'}</span>
            </div>
            <div className="form-grid-full">
              <span className="form-label">
                Dependencies
                <span className="form-label-count">{form.dependencies.length} selected</span>
              </span>
              {projectTasks.length === 0 ? (
                <p className="form-note">
                  This project has no other design tasks yet, so there is nothing to depend on.
                </p>
              ) : (
                <>
                  {errors.dependencies && (
                    <span className="form-hint form-hint-error">{errors.dependencies}</span>
                  )}
                  <div className="check-grid">
                  {projectTasks.map((task) => (
                    <label
                      key={task.id}
                      className={`check-chip${form.dependencies.includes(task.id) ? ' is-checked' : ''}`}
                      title={task.name}
                    >
                      <input
                        type="checkbox"
                        checked={form.dependencies.includes(task.id)}
                        onChange={() => toggleDependency(task.id)}
                      />
                        {task.id} · {task.name}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>,
        )}

        {sectionCard(
          'notes',
          ListTodo,
          'Task Notes & Documents',
          'Working notes, completion record, attachments and comments',
          <div className="form-grid">
            <div className="form-grid-full">
              <Textarea
                id="task-notes"
                label="Notes"
                rows={3}
                placeholder="Assumptions, review comments or handover notes"
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="task-completion-notes"
                label="Completion Notes"
                rows={2}
                placeholder="What was delivered when the task was completed"
                value={form.completionNotes}
                hint={errors.completionNotes}
                onChange={(event) => setField('completionNotes', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <span className="form-label">
                Attachments
                <span className="form-label-count">{form.attachments.length} file(s)</span>
              </span>
              <label className="file-drop">
                <Paperclip aria-hidden="true" />
                <span>Attach task documents (drawings, calculations, reports)</span>
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(event) => {
                    const rows = [...(event.target.files || [])].map((file) => ({
                      name: file.name,
                      size: file.size,
                    }));
                    if (rows.length) {
                      setForm((previous) => ({
                        ...previous,
                        attachments: [...previous.attachments, ...rows],
                      }));
                    }
                  }}
                />
              </label>
              {form.attachments.length > 0 && (
                <ul className="attachment-list">
                  {form.attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <Paperclip aria-hidden="true" />
                      <span>{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setForm((previous) => ({
                            ...previous,
                            attachments: previous.attachments.filter((_, row) => row !== index),
                          }))
                        }
                      >
                        <X aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="form-grid-full">
              <span className="form-label">
                Comments
                <span className="form-label-count">{form.comments.length}</span>
              </span>
              {form.comments.length === 0 ? (
                <p className="form-note">No comments recorded for this task yet.</p>
              ) : (
                <ul className="plan-comment-list">
                  {form.comments.map((comment) => (
                    <li key={comment.id}>
                      <strong>{comment.by || form.engineer}</strong>
                      <span className="cell-muted">{formatDate(comment.at)}</span>
                      <p>{comment.text}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="plan-comment-add">
                <Textarea
                  id="task-comment"
                  label="Add Comment"
                  rows={2}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon={MessageSquare}
                  onClick={() => {
                    if (!commentDraft.trim()) return;
                    setForm((previous) => ({
                      ...previous,
                      comments: [
                        ...previous.comments,
                        {
                          id: `${formId}-C${previous.comments.length + 1}`,
                          at: TODAY,
                          by: form.engineer,
                          text: commentDraft.trim(),
                        },
                      ],
                    }));
                    setCommentDraft('');
                  }}
                >
                  Add Comment
                </Button>
              </div>
            </div>
          </div>,
        )}

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => navigate('/design-planning/tasks-progress')}
            >
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {form.status} · {form.engineer}
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save Draft
            </Button>
            <Button type="submit" icon={editing ? Save : Plus}>
              {editing ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
