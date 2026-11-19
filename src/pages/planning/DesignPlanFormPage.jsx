import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  Flag,
  FolderKanban,
  ListTodo,
  Paperclip,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  Modal,
  PageHeader,
  PageLayout,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import { usePlanning } from '../../context/PlanningContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, TODAY, addDays, formatDate } from '../../data/projectData';
import { customerOrDepartment } from '../../data/projectConversion';
import {
  MILESTONE_STATUSES,
  MILESTONE_STATUS_TONES,
  MILESTONE_TEMPLATES,
  PLAN_PRIORITIES,
  PLAN_STATUSES,
  PLAN_STATUS_TONES,
  nextMilestoneId,
} from '../../data/planningData';

function initialForm(project) {
  return {
    projectId: project?.id || '',
    name: project ? `${project.name} Design Plan` : '',
    owner: project?.manager || ENGINEERS[0],
    engineers: [],
    responsibilities: '',
    start: project?.start || TODAY,
    due: project?.target || addDays(TODAY, 90),
    priority: project?.priority || 'Medium',
    status: 'Draft',
    objectives: project?.description || '',
    scope: '',
    functionalRequirements: '',
    technicalRequirements: project?.technicalRequirements || '',
    constraints: '',
    operatingConditions: '',
    deliverables: '',
    assumptions: '',
    risks: '',
    dependencies: '',
    remarks: '',
    attachments: [],
  };
}

function formFromPlan(plan) {
  return {
    projectId: plan.projectId || '',
    name: plan.name || '',
    owner: plan.owner || ENGINEERS[0],
    engineers: [...(plan.engineers || [])],
    responsibilities: plan.responsibilities || '',
    start: plan.start || TODAY,
    due: plan.due || addDays(TODAY, 90),
    priority: plan.priority || 'Medium',
    status: plan.status || 'Draft',
    objectives: plan.objectives || '',
    scope: plan.scope || '',
    functionalRequirements: plan.functionalRequirements || '',
    technicalRequirements: plan.technicalRequirements || '',
    constraints: plan.constraints || '',
    operatingConditions: plan.operatingConditions || '',
    deliverables: plan.deliverables || '',
    assumptions: plan.assumptions || '',
    risks: plan.risks || '',
    dependencies: plan.dependencies || '',
    remarks: plan.remarks || plan.notes || '',
    attachments: [...(plan.attachments || [])],
  };
}

function emptyMilestone(planId, projectId, owner) {
  return {
    planId,
    projectId,
    name: '',
    description: '',
    plannedDate: '',
    actualDate: '',
    owner,
    status: 'Planned',
    remarks: '',
  };
}

/**
 * Create / edit a design plan — project information is read from the project
 * record, the design scope and planning details are captured here, and the
 * plan's milestones are managed inline once the plan exists.
 *
 * Editing a Draft auto-saves through the Planning context, so refreshing or
 * leaving the page keeps the same record instead of creating a duplicate.
 */
export default function DesignPlanFormPage() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    plans,
    tasks,
    milestones,
    addPlan,
    updatePlan,
    nextPlanId,
    addMilestone,
    updateMilestone,
    removeMilestone,
  } = usePlanning();
  const { projects, team } = useProjects();

  const editing = useMemo(
    () => (planId ? plans.find((plan) => plan.id === planId) : null),
    [planId, plans],
  );

  const requestedProject =
    projects.find((row) => row.id === searchParams.get('project')) || projects[0];

  const [formId] = useState(() => (editing ? editing.id : nextPlanId()));
  const [form, setForm] = useState(() =>
    editing ? formFromPlan(editing) : initialForm(requestedProject),
  );
  const [initialSnapshot] = useState(() =>
    JSON.stringify(editing ? formFromPlan(editing) : initialForm(requestedProject)),
  );
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saveState, setSaveState] = useState(editing?.status === 'Draft' ? 'saved' : '');
  const [openSections, setOpenSections] = useState({
    project: true,
    scope: true,
    planning: true,
    milestones: true,
  });
  const [milestoneDialog, setMilestoneDialog] = useState(null);
  const [milestoneError, setMilestoneError] = useState('');
  const [confirmCreate, setConfirmCreate] = useState(false);

  const lastSavedRef = useRef(initialSnapshot);
  const latestFormRef = useRef(form);
  latestFormRef.current = form;
  const finalizedRef = useRef(false);

  const draftMode = Boolean(editing) && editing.status === 'Draft';

  if (planId && !editing) {
    return <Navigate to="/design-planning" replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const planMilestones = milestones.filter((row) => row.planId === formId);
  const planTasks = tasks.filter((task) => task.planId === formId || task.projectId === form.projectId);

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const buildRecord = (status, values = form) => ({
    id: formId,
    projectId: values.projectId,
    name: values.name.trim(),
    owner: values.owner,
    engineers: values.engineers,
    responsibilities: values.responsibilities.trim(),
    start: values.start,
    due: values.due,
    priority: values.priority,
    status,
    objectives: values.objectives.trim(),
    scope: values.scope.trim(),
    functionalRequirements: values.functionalRequirements.trim(),
    technicalRequirements: values.technicalRequirements.trim(),
    constraints: values.constraints.trim(),
    operatingConditions: values.operatingConditions.trim(),
    deliverables: values.deliverables.trim(),
    assumptions: values.assumptions.trim(),
    risks: values.risks.trim(),
    dependencies: values.dependencies.trim(),
    remarks: values.remarks.trim(),
    attachments: values.attachments,
    updatedAt: new Date().toISOString(),
  });

  // Draft auto-save: edits to an existing draft plan persist shortly after typing.
  useEffect(() => {
    if (!draftMode) return undefined;
    const serialized = JSON.stringify(form);
    if (serialized === lastSavedRef.current) return undefined;
    setSaveState('saving');
    const timer = setTimeout(() => {
      updatePlan(formId, buildRecord('Draft'));
      lastSavedRef.current = serialized;
      setSaveState('saved');
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, draftMode, formId]);

  // Leaving before the debounce fires must not lose the latest draft edits.
  useEffect(() => {
    if (!draftMode) return undefined;
    return () => {
      if (finalizedRef.current) return;
      const values = latestFormRef.current;
      if (JSON.stringify(values) === lastSavedRef.current) return;
      updatePlan(formId, buildRecord('Draft', values));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftMode, formId]);

  const validate = () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project this plan belongs to.';
    if (!form.name.trim()) next.name = 'Design plan title is required.';
    if (!form.owner) next.owner = 'Select the design owner.';
    if (!form.start) next.start = 'Planned start date is required.';
    if (!form.due) next.due = 'Target completion date is required.';
    if (form.start && form.due && form.due < form.start) {
      next.due = 'Target completion cannot be earlier than the planned start.';
    }
    return next;
  };

  const showError = (message, nextErrors = {}) => {
    setErrors(nextErrors);
    setBanner({ tone: 'error', message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persist = (status, values = form) => {
    const record = buildRecord(status, values);
    if (editing) updatePlan(formId, record);
    else addPlan(record);
    lastSavedRef.current = JSON.stringify(values);
    setSaveState('saved');
    return record;
  };

  const saveDraft = () => {
    if (!form.projectId || !form.name.trim()) {
      showError('Add the project and design plan title before saving a draft.', {
        ...(form.projectId ? {} : { projectId: 'Select the project this plan belongs to.' }),
        ...(form.name.trim() ? {} : { name: 'Design plan title is required.' }),
      });
      return;
    }
    persist('Draft');
    setBanner({ tone: 'success', message: `Draft ${formId} saved. Continue later from the Design Plans register.` });
    if (!editing) navigate(`/design-planning/design-plans/${formId}/edit`, { replace: true });
  };

  const submit = (event) => {
    event.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) {
      showError('Complete the required plan fields before saving.', next);
      return;
    }
    if (draftMode) {
      setConfirmCreate(true);
      return;
    }
    finalizedRef.current = true;
    persist(form.status === 'Draft' ? 'Active' : form.status);
    setBanner({ tone: 'success', message: `${formId} saved.` });
    navigate('/design-planning');
  };

  const activate = () => {
    const next = validate();
    if (Object.keys(next).length > 0) {
      showError('Complete the required plan fields before activating the plan.', next);
      return;
    }
    finalizedRef.current = true;
    persist('Active');
    navigate('/design-planning');
  };

  const addAttachment = (files) => {
    const rows = [...files].map((file) => ({ name: file.name, size: file.size }));
    if (rows.length) setForm((previous) => ({ ...previous, attachments: [...previous.attachments, ...rows] }));
  };

  const openMilestone = (milestone = null) => {
    setMilestoneError('');
    setMilestoneDialog(
      milestone
        ? { ...milestone }
        : {
            id: nextMilestoneId(milestones),
            ...emptyMilestone(formId, form.projectId, form.owner),
            isNew: true,
          },
    );
  };

  const saveMilestone = () => {
    const draft = milestoneDialog;
    if (!draft?.name?.trim()) {
      setMilestoneError('Milestone name is required.');
      return;
    }
    if (!draft.plannedDate) {
      setMilestoneError('Planned date is required.');
      return;
    }
    if (draft.actualDate && draft.actualDate < draft.plannedDate) {
      setMilestoneError('Actual date cannot be earlier than the planned date.');
      return;
    }
    if (draft.status === 'Completed' && !draft.actualDate) {
      setMilestoneError('Record the actual date before marking the milestone completed.');
      return;
    }
    const record = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      remarks: draft.remarks.trim(),
      planId: formId,
      projectId: form.projectId,
      updatedAt: new Date().toISOString(),
    };
    if (draft.isNew) addMilestone(record);
    else updateMilestone(record.id, record);
    setMilestoneDialog(null);
    setMilestoneError('');
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
            { label: 'Design Plans', to: '/design-planning' },
            { label: editing ? `${formId} · ${draftMode ? 'Continue Draft' : 'Edit'}` : 'Create Design Plan' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={ClipboardList}
          title={
            draftMode
              ? 'Continue Design Plan Draft'
              : editing
                ? 'Edit Design Plan'
                : 'Create Design Plan'
          }
          subtitle={
            editing
              ? `${formId} · ${project?.name || form.projectId} · project information is read from the project record`
              : 'Define the design scope, activities, milestones and ownership for an existing project.'
          }
          actions={
            <>
              {editing && <StatusBadge status={editing.status} tone={PLAN_STATUS_TONES[editing.status] || 'gray'} />}
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/design-planning')}>
                Back to Design Plans
              </Button>
              {editing && (
                <Button
                  variant="ghost"
                  icon={ListTodo}
                  onClick={() => navigate(`/design-planning/tasks-progress?plan=${formId}`)}
                >
                  Open Tasks
                </Button>
              )}
            </>
          }
        />
      }
    >
      <form className="project-form-page" onSubmit={submit} noValidate>
        {banner && (
          <div className={`form-banner ${banner.tone}`} role="status">
            {banner.tone === 'success' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            <span>{banner.message}</span>
          </div>
        )}

        {editing && (
          <section className="np-source-banner plan-ref-banner">
            <div className="np-source-main">
              <span className={`status-pill tone-${draftMode ? 'gray' : 'green'}`}>
                {editing.status}
              </span>
              <div>
                <strong>
                  {formId} · {editing.name}
                </strong>
                <span>
                  Project {form.projectId}
                  {project?.sourceRequestId ? ` · Source Request ${project.sourceRequestId}` : ''}
                </span>
              </div>
            </div>
            <div className="np-source-actions">
              {draftMode && (
                <span className={`np-save-state is-${saveState || 'saved'}`} role="status">
                  {saveState === 'saving' ? 'Saving…' : 'All changes saved'}
                </span>
              )}
              <Link className="qr-inline-link" to={`/projects/all-projects/${form.projectId}`}>
                View Project
              </Link>
            </div>
          </section>
        )}

        {sectionCard(
          'project',
          FolderKanban,
          'Project Information',
          'Filled automatically from the project record',
          <div className="form-grid">
            <Select
              id="plan-project"
              label="Project ID"
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
              ]}
              value={form.projectId}
              hint={errors.projectId}
              aria-invalid={Boolean(errors.projectId)}
              onChange={(event) => {
                const nextProject = projects.find((row) => row.id === event.target.value);
                setForm((previous) => ({
                  ...previous,
                  projectId: event.target.value,
                  name:
                    !previous.name || previous.name === `${project?.name || ''} Design Plan`
                      ? nextProject
                        ? `${nextProject.name} Design Plan`
                        : ''
                      : previous.name,
                  owner: nextProject?.manager || previous.owner,
                  priority: nextProject?.priority || previous.priority,
                  start: nextProject?.start || previous.start,
                  due: nextProject?.target || previous.due,
                  objectives: previous.objectives || nextProject?.description || '',
                  technicalRequirements:
                    previous.technicalRequirements || nextProject?.technicalRequirements || '',
                }));
              }}
            />
            <div className="form-field">
              <span className="form-label">Project Name</span>
              <span className="form-static">{project?.name || 'Not selected'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Source Request ID</span>
              <span className="form-static">
                {project?.sourceRequestId ? (
                  <Link className="qr-inline-link" to={`/customer-sales/requests/${project.sourceRequestId}`}>
                    {project.sourceRequestId}
                  </Link>
                ) : (
                  'Manual project'
                )}
              </span>
            </div>
            <div className="form-field">
              <span className="form-label">Product</span>
              <span className="form-static">{project?.product || '—'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Customer / Department</span>
              <span className="form-static">{customerOrDepartment(project)}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Project Manager</span>
              <span className="form-static">{project?.manager || '—'}</span>
            </div>
          </div>,
        )}

        {sectionCard(
          'scope',
          Target,
          'Design Scope',
          'What the design must achieve before detailed engineering starts',
          <div className="form-grid">
            <div className="form-grid-full">
              <Input
                id="plan-name"
                label="Design Plan Title"
                placeholder="e.g. Conveyor Drive Assembly Design Plan"
                value={form.name}
                hint={errors.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setField('name', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="plan-objectives"
                label="Design Objectives"
                rows={3}
                placeholder="What the design must deliver for the project"
                value={form.objectives}
                onChange={(event) => setField('objectives', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="plan-scope"
                label="Design Scope"
                rows={3}
                placeholder="Included and excluded engineering scope"
                value={form.scope}
                onChange={(event) => setField('scope', event.target.value)}
              />
            </div>
            <Textarea
              id="plan-functional"
              label="Functional Requirements"
              rows={3}
              value={form.functionalRequirements}
              onChange={(event) => setField('functionalRequirements', event.target.value)}
            />
            <Textarea
              id="plan-technical"
              label="Technical Requirements"
              rows={3}
              value={form.technicalRequirements}
              onChange={(event) => setField('technicalRequirements', event.target.value)}
            />
            <Textarea
              id="plan-constraints"
              label="Design Constraints"
              rows={3}
              value={form.constraints}
              onChange={(event) => setField('constraints', event.target.value)}
            />
            <Textarea
              id="plan-operating"
              label="Operating Conditions"
              rows={3}
              value={form.operatingConditions}
              onChange={(event) => setField('operatingConditions', event.target.value)}
            />
            <Textarea
              id="plan-deliverables"
              label="Expected Deliverables"
              rows={3}
              placeholder="Models, drawings, BOM, analysis reports, documentation"
              value={form.deliverables}
              onChange={(event) => setField('deliverables', event.target.value)}
            />
            <Textarea
              id="plan-assumptions"
              label="Assumptions"
              rows={3}
              value={form.assumptions}
              onChange={(event) => setField('assumptions', event.target.value)}
            />
            <div className="form-grid-full">
              <Textarea
                id="plan-risks"
                label="Risks"
                rows={2}
                value={form.risks}
                onChange={(event) => setField('risks', event.target.value)}
              />
            </div>
          </div>,
        )}

        {sectionCard(
          'planning',
          CalendarClock,
          'Planning Details',
          'Ownership, schedule, dependencies and supporting documents',
          <div className="form-grid">
            <Select
              id="plan-owner"
              label="Design Owner"
              options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
              value={form.owner}
              hint={errors.owner}
              aria-invalid={Boolean(errors.owner)}
              onChange={(event) => setField('owner', event.target.value)}
            />
            <Select
              id="plan-priority"
              label="Priority"
              options={PLAN_PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
              value={form.priority}
              onChange={(event) => setField('priority', event.target.value)}
            />
            <Input
              id="plan-start"
              label="Planned Start Date"
              type="date"
              value={form.start}
              hint={errors.start}
              aria-invalid={Boolean(errors.start)}
              onChange={(event) => setField('start', event.target.value)}
            />
            <Input
              id="plan-due"
              label="Target Completion Date"
              type="date"
              value={form.due}
              hint={errors.due}
              aria-invalid={Boolean(errors.due)}
              onChange={(event) => setField('due', event.target.value)}
            />
            <Select
              id="plan-status"
              label="Plan Status"
              options={PLAN_STATUSES.map((status) => ({ value: status, label: status }))}
              value={form.status}
              disabled={draftMode}
              hint={draftMode ? 'Draft plans become Active when the plan is created.' : undefined}
              onChange={(event) => setField('status', event.target.value)}
            />
            <div className="form-field">
              <span className="form-label">Department</span>
              <span className="form-static">
                {project?.department || team.find((member) => member.name === form.owner)?.discipline || '—'}
              </span>
            </div>
            <div className="form-grid-full">
              <span className="form-label">
                Assigned Engineers
                <span className="form-label-count">{form.engineers.length} selected</span>
              </span>
              <div className="check-grid">
                {ENGINEERS.map((engineer) => (
                  <label
                    key={engineer}
                    className={`check-chip${form.engineers.includes(engineer) ? ' is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.engineers.includes(engineer)}
                      onChange={() =>
                        setForm((previous) => ({
                          ...previous,
                          engineers: previous.engineers.includes(engineer)
                            ? previous.engineers.filter((name) => name !== engineer)
                            : [...previous.engineers, engineer],
                        }))
                      }
                    />
                    {engineer}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-grid-full">
              <Textarea
                id="plan-responsibilities"
                label="Responsibilities"
                rows={3}
                placeholder="Who owns which part of the design work"
                value={form.responsibilities}
                onChange={(event) => setField('responsibilities', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="plan-dependencies"
                label="Dependencies"
                rows={2}
                placeholder="Upstream inputs, customer approvals, supplier data or linked plans"
                value={form.dependencies}
                onChange={(event) => setField('dependencies', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="plan-remarks"
                label="Remarks"
                rows={2}
                value={form.remarks}
                onChange={(event) => setField('remarks', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <span className="form-label">
                Supporting Attachments
                <span className="form-label-count">{form.attachments.length} file(s)</span>
              </span>
              <label className="file-drop">
                <Paperclip aria-hidden="true" />
                <span>Attach plan documents (PDF, DOCX, XLSX, DWG)</span>
                <input
                  type="file"
                  multiple
                  onChange={(event) => addAttachment(event.target.files || [])}
                  hidden
                />
              </label>
              {form.attachments.length > 0 && (
                <ul className="attachment-list">
                  {form.attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <Paperclip aria-hidden="true" />
                      <span>{file.name}</span>
                      <span className="cell-muted">{Math.max(1, Math.round((file.size || 0) / 1024))} KB</span>
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
          </div>,
        )}

        {sectionCard(
          'milestones',
          Flag,
          'Milestones',
          'Manual engineering checkpoints — never completed automatically',
          editing ? (
            <>
              {planMilestones.length === 0 ? (
                <p className="dash-note">No milestones recorded for this design plan yet.</p>
              ) : (
                <div className="plan-milestone-list">
                  {planMilestones
                    .slice()
                    .sort((left, right) => String(left.plannedDate).localeCompare(String(right.plannedDate)))
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
                        <select
                          className="inline-status-select"
                          aria-label={`Milestone status for ${milestone.id}`}
                          value={milestone.status}
                          onChange={(event) => {
                            const status = event.target.value;
                            updateMilestone(milestone.id, {
                              status,
                              actualDate:
                                status === 'Completed' && !milestone.actualDate
                                  ? TODAY
                                  : milestone.actualDate,
                            });
                          }}
                        >
                          {MILESTONE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <StatusBadge
                          status={milestone.status}
                          tone={MILESTONE_STATUS_TONES[milestone.status] || 'gray'}
                        />
                        <Button variant="ghost" icon={Save} onClick={() => openMilestone(milestone)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          icon={Trash2}
                          onClick={() => removeMilestone(milestone.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                </div>
              )}
              <Button variant="secondary" icon={Plus} onClick={() => openMilestone()}>
                Add Milestone
              </Button>
            </>
          ) : (
            <p className="dash-note">
              Save the plan as a draft first — milestones are stored against the saved plan record.
            </p>
          ),
        )}

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={() => navigate('/design-planning')}>
              {draftMode ? 'Cancel / Return' : 'Cancel'}
            </Button>
            <span className="project-form-actions-note">
              {formId} · {form.status} · {planTasks.length} task(s) · {planMilestones.length} milestone(s)
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              {draftMode ? 'Save Draft' : 'Save as Draft'}
            </Button>
            {draftMode ? (
              <>
                <Button variant="ghost" icon={ArrowRight} onClick={saveDraft}>
                  Continue Editing
                </Button>
                <Button type="submit" icon={Check}>
                  Create Plan
                </Button>
              </>
            ) : editing ? (
              <Button type="submit" icon={Save}>
                Save Changes
              </Button>
            ) : (
              <Button type="submit" icon={Check}>
                Create Design Plan
              </Button>
            )}
          </div>
        </div>
      </form>

      <Modal
        open={Boolean(milestoneDialog)}
        onClose={() => setMilestoneDialog(null)}
        title={milestoneDialog?.isNew ? 'Add Milestone' : 'Edit Milestone'}
        subtitle={milestoneDialog ? `${milestoneDialog.id} · ${formId}` : undefined}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMilestoneDialog(null)}>
              Cancel
            </Button>
            <Button icon={Check} onClick={saveMilestone}>
              Save Milestone
            </Button>
          </>
        }
      >
        {milestoneDialog && (
          <>
            {milestoneError && (
              <div className="form-banner error" role="alert">
                <X aria-hidden="true" />
                <span>{milestoneError}</span>
              </div>
            )}
            <div className="form-grid">
              {milestoneDialog.isNew && (
                <div className="form-grid-full">
                  <Select
                    id="milestone-template"
                    label="Standard Milestone"
                    options={[
                      { value: '', label: 'Custom milestone' },
                      ...MILESTONE_TEMPLATES.map((template) => ({
                        value: template.name,
                        label: template.name,
                      })),
                    ]}
                    value=""
                    onChange={(event) => {
                      const template = MILESTONE_TEMPLATES.find((row) => row.name === event.target.value);
                      if (!template) return;
                      setMilestoneDialog((previous) => ({
                        ...previous,
                        name: template.name,
                        description: template.description,
                      }));
                    }}
                  />
                </div>
              )}
              <div className="form-grid-full">
                <Input
                  id="milestone-name"
                  label="Milestone Name"
                  value={milestoneDialog.name}
                  onChange={(event) =>
                    setMilestoneDialog((previous) => ({ ...previous, name: event.target.value }))
                  }
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="milestone-description"
                  label="Description"
                  rows={2}
                  value={milestoneDialog.description}
                  onChange={(event) =>
                    setMilestoneDialog((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <Input
                id="milestone-planned"
                label="Planned Date"
                type="date"
                value={milestoneDialog.plannedDate}
                onChange={(event) =>
                  setMilestoneDialog((previous) => ({
                    ...previous,
                    plannedDate: event.target.value,
                  }))
                }
              />
              <Input
                id="milestone-actual"
                label="Actual Date"
                type="date"
                value={milestoneDialog.actualDate}
                onChange={(event) =>
                  setMilestoneDialog((previous) => ({
                    ...previous,
                    actualDate: event.target.value,
                  }))
                }
              />
              <Select
                id="milestone-owner"
                label="Responsible Person"
                options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                value={milestoneDialog.owner}
                onChange={(event) =>
                  setMilestoneDialog((previous) => ({ ...previous, owner: event.target.value }))
                }
              />
              <Select
                id="milestone-status"
                label="Status"
                options={MILESTONE_STATUSES.map((status) => ({ value: status, label: status }))}
                value={milestoneDialog.status}
                onChange={(event) =>
                  setMilestoneDialog((previous) => ({
                    ...previous,
                    status: event.target.value,
                    actualDate:
                      event.target.value === 'Completed' && !previous.actualDate
                        ? TODAY
                        : previous.actualDate,
                  }))
                }
              />
              <div className="form-grid-full">
                <Textarea
                  id="milestone-remarks"
                  label="Remarks"
                  rows={2}
                  value={milestoneDialog.remarks}
                  onChange={(event) =>
                    setMilestoneDialog((previous) => ({
                      ...previous,
                      remarks: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={confirmCreate}
        onClose={() => setConfirmCreate(false)}
        title="Create the design plan?"
        subtitle={`${formId} · ${form.name || 'Untitled plan'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCreate(false)}>
              Keep Editing
            </Button>
            <Button
              icon={Check}
              onClick={() => {
                setConfirmCreate(false);
                activate();
              }}
            >
              Create Plan
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The existing draft {formId} becomes an Active design plan for project {form.projectId}. No
          second plan is created, and the project, tasks and milestones stay linked to this record.
        </p>
      </Modal>
    </PageLayout>
  );
}

