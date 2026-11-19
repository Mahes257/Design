import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Link2,
  Paperclip,
  Plus,
  Save,
  ShieldCheck,
  Users,
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
  Textarea,
} from '../../components/common';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useSimulation } from '../../context/SimulationContext';
import AttachmentManager from '../../components/attachments/AttachmentManager';
import { deleteAttachmentsByRecord } from '../../services/attachmentStorage';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import { MATERIALS, REVISIONS } from '../../data/mechanicalData';
import {
  ANALYSIS_CATEGORIES,
  ANALYSIS_REVIEWERS,
  ANALYSIS_TYPES,
  RESULT_SOURCES,
  categoryForLabel,
  componentLabel,
  fieldsForCategory,
  isAnalysisEditable,
  projectName,
} from '../../data/analysisData';

function emptyTech(category) {
  return fieldsForCategory(category).reduce((accumulator, field) => {
    accumulator[field.key] = '';
    return accumulator;
  }, {});
}

function initialForm(
  projectId,
  category,
  linkedType = 'part',
  linkedId = '',
  drawingRevision = 'Rev A',
) {
  return {
    title: '',
    projectId: projectId || '',
    designId: '',
    linkedType,
    linkedId,
    drawingRevision,
    category,
    analysisType: ANALYSIS_TYPES[0],
    objective: '',
    validationReportRef: '',
    relatedObservation: '',
    description: '',
    appliedLoads: '',
    operatingConditions: '',
    methodology: '',
    calculationInputs: '',
    calculationResults: '',
    technicalRemarks: '',
    resultSource: '',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    inputConditions: '',
    material: '',
    assumptions: '',
    boundaryConditions: '',
    acceptanceCriteria: '',
    resultSummary: '',
    priority: 'Medium',
    created: TODAY,
    target: '',
    revision: 'A',
    notes: '',
  };
}

/**
 * New / Edit Analysis — full-page form with category-adaptive technical fields,
 * evidence attachments and the review assignment.
 */
export default function AnalysisFormPage() {
  const { analysisId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { analyses, addAnalysis, updateAnalysis, nextAnalysisId } = useAnalysis();
  const { parts, assemblies, designs } = useMechanical();
  const { projects } = useProjects();
  const { reports: validationReports, observations } = useSimulation();

  const editing = useMemo(
    () => (analysisId ? analyses.find((analysis) => analysis.id === analysisId) : null),
    [analysisId, analyses],
  );

  const requestedCategory = categoryForLabel(searchParams.get('category'));
  const defaultCategory = requestedCategory?.label || 'Stress & Strength';
  const requestedProjectId = searchParams.get('projectId');
  const requestedLinkedType = searchParams.get('linkedType') === 'assembly' ? 'assembly' : 'part';
  const requestedLinkedId = searchParams.get('linkedId') || '';
  const requestedRecord = (requestedLinkedType === 'assembly' ? assemblies : parts).find(
    (row) => row.id === requestedLinkedId,
  );
  const initialProjectId = projects.some((row) => row.id === requestedProjectId)
    ? requestedProjectId
    : requestedRecord?.projectId || projects[0]?.id;
  const initialLinkedRecord =
    requestedRecord?.projectId === initialProjectId ? requestedRecord : null;
  const initialDrawingRevision = initialLinkedRecord?.revision
    ? `Rev ${initialLinkedRecord.revision}`
    : 'Rev A';

  const [formId] = useState(() => (editing ? editing.id : nextAnalysisId()));
  const [form, setForm] = useState(() =>
    editing
      ? {
          title: editing.title,
          projectId: editing.projectId,
          designId: editing.designId || '',
          linkedType: editing.linkedType,
          linkedId: editing.linkedId,
          drawingRevision: editing.drawingRevision,
          category: editing.category,
          analysisType: editing.analysisType,
          objective: editing.objective || '',
          validationReportRef: editing.validationReportRef || '',
          relatedObservation: editing.relatedObservation || '',
          description: editing.description,
          appliedLoads: editing.appliedLoads || '',
          operatingConditions: editing.operatingConditions || '',
          methodology: editing.methodology || '',
          calculationInputs: editing.calculationInputs || '',
          calculationResults: editing.calculationResults || '',
          technicalRemarks: editing.technicalRemarks || '',
          resultSource: editing.resultSource || '',
          engineer: editing.engineer,
          reviewer: editing.reviewer,
          inputConditions: editing.inputConditions,
          material: editing.material,
          assumptions: editing.assumptions,
          boundaryConditions: editing.boundaryConditions,
          acceptanceCriteria: editing.acceptanceCriteria,
          resultSummary: editing.resultSummary,
          priority: editing.priority,
          created: editing.created,
          target: editing.target,
          revision: editing.revision,
          notes: editing.notes,
        }
      : initialForm(
          initialProjectId,
          defaultCategory,
          requestedLinkedType,
          initialLinkedRecord?.id || '',
          initialDrawingRevision,
        ),
  );
  const [tech, setTech] = useState(() =>
    editing
      ? { ...emptyTech(editing.category), ...(editing.tech || {}) }
      : emptyTech(defaultCategory),
  );
  const [attachments, setAttachments] = useState(() => editing?.attachments || []);
  const [openSections, setOpenSections] = useState({
    info: true,
    refs: true,
    category: true,
    inputs: true,
    material: true,
    boundary: true,
    method: true,
    criteria: true,
    results: true,
    attachments: true,
    assignment: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(false);

  if (analysisId && !editing) {
    return <Navigate to="/analysis" replace />;
  }
  if (editing && !isAnalysisEditable(editing)) {
    return <Navigate to={`/analysis/${editing.id}`} replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const fields = fieldsForCategory(form.category);
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const setTechField = (key, value) => setTech((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const changeCategory = (label) => {
    setForm((previous) => ({ ...previous, category: label }));
    setTech(emptyTech(label));
  };

  const projectDesigns = designs.filter((row) => row.projectId === form.projectId);
  const projectReports = validationReports.filter((row) => row.projectId === form.projectId);
  const projectObservations = observations.filter((row) => row.projectId === form.projectId);

  const componentRecords = form.linkedType === 'assembly' ? assemblies : parts;
  const componentOptions = componentRecords
    .filter((row) => row.projectId === form.projectId)
    .map((row) =>
      form.linkedType === 'assembly'
        ? { value: row.id, label: `${row.number} · ${row.name}` }
        : { value: row.id, label: `${row.partNumber} · ${row.name}` },
    );

  const validate = (forSave) => {
    const next = {};
    if (!form.title.trim()) next.title = 'An analysis title is required.';
    if (!form.projectId) next.projectId = 'Select the project this analysis supports.';
    if (!form.analysisType) next.analysisType = 'Select the analysis type.';
    if (!form.engineer) next.engineer = 'Select the assigned engineer.';
    if (!form.reviewer) next.reviewer = 'Select the technical reviewer.';
    if (!form.linkedId) {
      next.linkedId = 'Select a part or assembly from the shared mechanical register.';
    }
    if (!form.drawingRevision) next.drawingRevision = 'Select the drawing revision studied.';
    if (forSave && !form.target) next.target = 'A target date is required.';
    if (forSave && form.target && form.target < form.created)
      next.target = 'Target date cannot be earlier than the created date.';
    if (forSave && !form.description.trim())
      next.description = 'Describe the study and what evidence it records.';
    if (forSave && !form.acceptanceCriteria.trim())
      next.acceptanceCriteria = 'State the acceptance criteria used by the reviewer.';
    if (forSave && !form.objective.trim())
      next.objective = 'State the analysis objective.';
    if (forSave && !form.methodology.trim())
      next.methodology = 'Describe the methodology used for the analysis.';
    if (forSave && !form.resultSource)
      next.resultSource = 'Select where the recorded result came from.';
    return next;
  };

  const buildRecord = (verificationStatus) => ({
    id: formId,
    title: form.title.trim(),
    projectId: form.projectId,
    designId: form.designId,
    linkedType: form.linkedType,
    linkedId: form.linkedId,
    drawingRevision: form.drawingRevision,
    category: form.category,
    analysisType: form.analysisType,
    objective: form.objective.trim(),
    validationReportRef: form.validationReportRef,
    relatedObservation: form.relatedObservation,
    description: form.description.trim(),
    appliedLoads: form.appliedLoads.trim(),
    operatingConditions: form.operatingConditions.trim(),
    methodology: form.methodology.trim(),
    calculationInputs: form.calculationInputs.trim(),
    calculationResults: form.calculationResults.trim(),
    technicalRemarks: form.technicalRemarks.trim(),
    resultSource: form.resultSource,
    engineer: form.engineer,
    reviewer: form.reviewer,
    inputConditions: form.inputConditions.trim(),
    material: form.material.trim(),
    assumptions: form.assumptions.trim(),
    boundaryConditions: form.boundaryConditions.trim(),
    acceptanceCriteria: form.acceptanceCriteria.trim(),
    resultSummary: form.resultSummary.trim(),
    priority: form.priority,
    created: form.created,
    target: form.target,
    revision: form.revision,
    notes: form.notes.trim(),
    attachments,
    verificationStatus,
    tech,
  });

  const persist = (status) => {
    if (editing) {
      const revisionChanged = form.revision !== editing.revision;
      updateAnalysis(formId, {
        ...buildRecord(status),
        revisions: revisionChanged
          ? [
              ...(editing.revisions || []),
              { revision: form.revision, date: TODAY, by: form.engineer, note: `Revision ${form.revision} saved.` },
            ]
          : editing.revisions,
        activity: [
          ...(editing.activity || []),
          {
            id: `ACT-${formId}-${(editing.activity?.length || 0) + 1}`,
            label: revisionChanged ? `Revision ${form.revision} saved` : 'Analysis updated',
            detail: 'Record updated from the analysis form',
            by: form.engineer,
            at: TODAY,
          },
        ],
      });
      return formId;
    }

    addAnalysis({
      ...buildRecord(status),
      revisions: [
        { revision: form.revision, date: TODAY, by: form.engineer, note: 'Initial analysis record created.' },
      ],
      activity: [],
    });
    return formId;
  };

  const saveDraft = () => {
    const next = validate(false);
    setErrors(next);
    if (!form.title.trim() || !form.projectId || !form.linkedId) {
      setBanner({
        tone: 'error',
        message: 'Add a project, analysis title and linked part or assembly before saving the draft.',
      });
      return;
    }
    const id = persist('Draft');
    if (!editing) {
      navigate(`/analysis/${id}/edit`, { replace: true });
      setBanner({
        tone: 'success',
        message: `Draft ${id} saved. Add the evidence, then submit it from the register.`,
      });
      return;
    }
    setBanner({ tone: 'success', message: `Draft changes saved for ${id}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (continueAfter) => {
    const next = validate(true);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({
        info: true,
        refs: true,
        category: true,
        inputs: true,
        material: true,
        boundary: true,
        method: true,
        criteria: true,
        results: true,
        attachments: true,
        assignment: true,
      });
      setBanner({ tone: 'error', message: 'Complete the required analysis fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const status =
      editing && !['Draft', 'In Progress'].includes(editing.verificationStatus)
        ? editing.verificationStatus
        : form.target
          ? 'In Progress'
          : 'Draft';
    const id = persist(status);
    navigate(
      continueAfter ? `/analysis/${id}` : '/analysis',
    );
  };

  const requestCancel = () => setCancelPrompt(true);

  /** Leaving an unsaved new analysis also clears binaries uploaded for it. */
  const discardAndLeave = () => {
    if (!editing) deleteAttachmentsByRecord(formId).catch(() => 0);
    navigate('/analysis');
  };

  const sectionCard = (key, icon, title, subtitle, body, badge) => {
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
          {badge != null && <span className="mech-aside-count">{badge}</span>}
          <ChevronDown className="form-section-chevron" aria-hidden="true" />
        </button>
        {open && <div className="form-section-body">{body}</div>}
      </section>
    );
  };

  const renderTechField = (field) => {
    const value = tech[field.key] ?? '';
    const label = field.unit ? `${field.label} (${field.unit})` : field.label;
    const id = `tech-${field.key}`;
    if (field.type === 'select') {
      return (
        <Select
          key={field.key}
          id={id}
          label={label}
          options={[
            { value: '', label: 'Select' },
            ...field.options.map((option) => ({ value: option, label: option })),
          ]}
          value={value}
          onChange={(event) => setTechField(field.key, event.target.value)}
        />
      );
    }
    if (field.type === 'textarea') {
      return (
        <div className="form-grid-full" key={field.key}>
          <Textarea
            id={id}
            label={label}
            rows={2}
            placeholder={field.placeholder}
            value={value}
            onChange={(event) => setTechField(field.key, event.target.value)}
          />
        </div>
      );
    }
    return (
      <Input
        key={field.key}
        id={id}
        label={label}
        type={field.type === 'number' ? 'number' : 'text'}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => setTechField(field.key, event.target.value)}
      />
    );
  };

  const evidenceCount = attachments.length;
  const checklist = [
    {
      key: 'component',
      label: 'Part or assembly and drawing revision linked',
      done: Boolean(form.linkedId && form.drawingRevision),
    },
    { key: 'inputs', label: 'Input conditions recorded', done: Boolean(form.inputConditions.trim()) },
    { key: 'boundary', label: 'Boundary conditions recorded', done: Boolean(form.boundaryConditions.trim()) },
    { key: 'criteria', label: 'Acceptance criteria recorded', done: Boolean(form.acceptanceCriteria.trim()) },
    { key: 'results', label: 'Result evidence referenced', done: Boolean(form.resultSummary.trim()) },
    { key: 'files', label: 'Supporting evidence attached', done: evidenceCount > 0 },
  ];

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Engineering Analysis', to: '/analysis' },
            { label: 'Analysis Register', to: '/analysis' },
            { label: editing ? `${formId} · Edit` : 'New Analysis' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Activity}
          title={editing ? 'Edit Analysis' : 'New Analysis'}
          subtitle="Record the study, its inputs and the engineering evidence references; review happens in the Review & Verification workspace."
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/analysis')}
            >
              Back to Analysis Register
            </Button>
          }
        />
      }
    >
      <form
        className="project-form-page"
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
        noValidate
      >
        {banner && (
          <div className={`form-banner ${banner.tone}`} role="status">
            {banner.tone === 'success' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            <span>{banner.message}</span>
          </div>
        )}

        <div className="mech-form-layout">
          <div className="mech-form-main">
            {sectionCard(
              'info',
              ClipboardCheck,
              '1. Analysis Information',
              'Identification, description and dates',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Analysis ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Select
                  id="analysis-priority"
                  label="Priority"
                  options={['Critical', 'High', 'Medium', 'Low'].map((priority) => ({
                    value: priority,
                    label: priority,
                  }))}
                  value={form.priority}
                  onChange={(event) => setField('priority', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="analysis-title"
                    label="Analysis Title"
                    placeholder="e.g. Gearbox housing static stress review"
                    value={form.title}
                    hint={errors.title}
                    aria-invalid={Boolean(errors.title)}
                    onChange={(event) => setField('title', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-objective"
                    label="Analysis Objective"
                    rows={2}
                    placeholder="What decision or verification does this analysis support?"
                    value={form.objective}
                    hint={errors.objective}
                    aria-invalid={Boolean(errors.objective)}
                    onChange={(event) => setField('objective', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-description"
                    label="Problem Description"
                    rows={3}
                    placeholder="What is being studied, and which evidence this record consolidates"
                    value={form.description}
                    hint={errors.description}
                    aria-invalid={Boolean(errors.description)}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
                <Input
                  id="analysis-created"
                  label="Created Date"
                  type="date"
                  value={form.created}
                  onChange={(event) => setField('created', event.target.value)}
                />
                <Input
                  id="analysis-target"
                  label="Target Date"
                  type="date"
                  value={form.target}
                  hint={errors.target}
                  aria-invalid={Boolean(errors.target)}
                  onChange={(event) => setField('target', event.target.value)}
                />
                <Select
                  id="analysis-revision"
                  label="Revision"
                  options={REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'refs',
              Link2,
              '2. Project & Component References',
              'Project, part or assembly and the drawing revision studied',
              <div className="form-grid">
                <Select
                  id="analysis-project"
                  label="Project"
                  options={[
                    { value: '', label: 'Select a project' },
                    ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.projectId}
                  hint={errors.projectId}
                  aria-invalid={Boolean(errors.projectId)}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      projectId: event.target.value,
                      linkedId: '',
                      drawingRevision: 'Rev A',
                    }));
                  }}
                />
                <div className="form-field">
                  <span className="form-label">Project Name</span>
                  <span className="form-static">
                    {project ? projectName(projects, form.projectId) : 'Not selected'}
                  </span>
                </div>
                <Select
                  id="analysis-linked-type"
                  label="Component Reference Type"
                  options={[
                    { value: 'part', label: 'Part' },
                    { value: 'assembly', label: 'Assembly' },
                  ]}
                  value={form.linkedType}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      linkedType: event.target.value,
                      linkedId: '',
                      drawingRevision: 'Rev A',
                    }));
                  }}
                />
                <Select
                  id="analysis-linked-id"
                  label={form.linkedType === 'assembly' ? 'Assembly' : 'Part'}
                  options={[
                    {
                      value: '',
                      label: componentOptions.length ? 'Select a record' : 'No records for this project',
                    },
                    ...componentOptions,
                  ]}
                  value={form.linkedId}
                  hint={errors.linkedId}
                  aria-invalid={Boolean(errors.linkedId)}
                  onChange={(event) => {
                    const linkedRecord = componentRecords.find(
                      (row) => row.id === event.target.value,
                    );
                    setForm((previous) => ({
                      ...previous,
                      linkedId: event.target.value,
                      drawingRevision: linkedRecord?.revision
                        ? `Rev ${linkedRecord.revision}`
                        : 'Rev A',
                    }));
                  }}
                />
                <Select
                  id="analysis-drawing-revision"
                  label="Drawing Revision"
                  options={REVISIONS.map((revision) => ({ value: `Rev ${revision}`, label: `Rev ${revision}` }))}
                  value={form.drawingRevision}
                  hint={errors.drawingRevision || 'Drawing files stay in Drawing & CAD Management.'}
                  aria-invalid={Boolean(errors.drawingRevision)}
                  onChange={(event) => setField('drawingRevision', event.target.value)}
                />
                <div className="form-field">
                  <span className="form-label">Customer</span>
                  <span className="form-static">{project?.customer || '—'}</span>
                </div>
                <Select
                  id="analysis-design"
                  label="Design ID"
                  options={[
                    { value: '', label: projectDesigns.length ? 'Select a design' : 'No designs for this project' },
                    ...projectDesigns.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.designId}
                  onChange={(event) => setField('designId', event.target.value)}
                />
                <Select
                  id="analysis-validation-ref"
                  label="Validation Report Reference"
                  options={[
                    { value: '', label: projectReports.length ? 'No linked validation report' : 'No reports for this project' },
                    ...projectReports.map((row) => ({ value: row.id, label: `${row.id} · ${row.title}` })),
                  ]}
                  value={form.validationReportRef}
                  onChange={(event) => setField('validationReportRef', event.target.value)}
                />
                <Select
                  id="analysis-observation-ref"
                  label="Related Observation / Issue"
                  options={[
                    { value: '', label: projectObservations.length ? 'No linked observation' : 'No observations for this project' },
                    ...projectObservations.map((row) => ({ value: row.id, label: `${row.id} · ${row.title}` })),
                  ]}
                  value={form.relatedObservation}
                  onChange={(event) => setField('relatedObservation', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'category',
              FlaskConical,
              '3. Analysis Category',
              'Category, analysis type and the technical fields that belong to it',
              <div className="form-grid">
                <Select
                  id="analysis-category"
                  label="Analysis Category"
                  options={ANALYSIS_CATEGORIES.map((category) => ({
                    value: category.label,
                    label: category.label,
                  }))}
                  value={form.category}
                  onChange={(event) => changeCategory(event.target.value)}
                />
                <Select
                  id="analysis-type"
                  label="Analysis Type"
                  options={ANALYSIS_TYPES.map((type) => ({ value: type, label: type }))}
                  value={form.analysisType}
                  hint={errors.analysisType}
                  aria-invalid={Boolean(errors.analysisType)}
                  onChange={(event) => setField('analysisType', event.target.value)}
                />
                <div className="form-grid-full">
                  <p className="anl-field-note">
                    Fields below are specific to {form.category}. Values are recorded evidence and
                    references — they are never computed by this workspace.
                  </p>
                </div>
                {fields.map((field) => renderTechField(field))}
              </div>,
            )}

            {sectionCard(
              'inputs',
              FileText,
              '4. Input Conditions',
              'Loads, duty conditions or operating inputs the analysis used',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-inputs"
                    label="Input Conditions"
                    rows={3}
                    placeholder="Rated load, duty cycle, operating point and any other input condition"
                    value={form.inputConditions}
                    onChange={(event) => setField('inputConditions', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-applied-loads"
                    label="Applied Loads"
                    rows={2}
                    placeholder="Forces, moments, pressures, temperatures or flow rates with their sources"
                    value={form.appliedLoads}
                    onChange={(event) => setField('appliedLoads', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-operating-conditions"
                    label="Operating Conditions"
                    rows={2}
                    placeholder="Speed, duty cycle, ambient conditions, operating envelope"
                    value={form.operatingConditions}
                    onChange={(event) => setField('operatingConditions', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-calc-inputs"
                    label="Calculation Inputs"
                    rows={2}
                    placeholder="Recorded input values and the sheet, standard or reference they came from"
                    value={form.calculationInputs}
                    onChange={(event) => setField('calculationInputs', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'material',
              ShieldCheck,
              '5. Material & Assumptions',
              'Material reference and the assumptions the evidence relies on',
              <div className="form-grid">
                <Input
                  id="analysis-material"
                  label="Material"
                  list="analysis-material-options"
                  placeholder="Select or type a material reference"
                  value={form.material}
                  onChange={(event) => setField('material', event.target.value)}
                />
                <datalist id="analysis-material-options">
                  {MATERIALS.map((material) => (
                    <option key={material} value={material} />
                  ))}
                </datalist>
                <div className="form-field">
                  <span className="form-label">Assembly / Mixed Materials</span>
                  <span className="form-static">
                    {form.linkedType === 'assembly' ? 'Assembly — mixed materials possible' : 'Single part'}
                  </span>
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-assumptions"
                    label="Assumptions"
                    rows={3}
                    placeholder="Simplifications, linear elastic assumptions, steady-state basis, exclusions"
                    value={form.assumptions}
                    onChange={(event) => setField('assumptions', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'boundary',
              Activity,
              '6. Boundary Conditions',
              'Supports, restraints and applied conditions used in the study',
              <Textarea
                id="analysis-boundary"
                label="Boundary Conditions"
                rows={4}
                placeholder="Restraints, contacts, applied loads and environmental conditions"
                value={form.boundaryConditions}
                onChange={(event) => setField('boundaryConditions', event.target.value)}
              />,
            )}

            {sectionCard(
              'method',
              FileText,
              '7. Methodology',
              'How the recorded analysis was performed and what evidence supports it',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-methodology"
                    label="Methodology"
                    rows={3}
                    placeholder="Method, standard or calculation approach used — recorded, not executed here"
                    value={form.methodology}
                    hint={errors.methodology}
                    aria-invalid={Boolean(errors.methodology)}
                    onChange={(event) => setField('methodology', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <p className="anl-field-note">
                    This module stores the method and its evidence references. It does not run the
                    method, solve equations or generate results.
                  </p>
                </div>
              </div>,
            )}

            {sectionCard(
              'criteria',
              ShieldCheck,
              '8. Acceptance Criteria',
              'What the reviewer will check the recorded evidence against',
              <Textarea
                id="analysis-criteria"
                label="Acceptance Criteria"
                rows={3}
                placeholder="Allowable values, required factor of safety, standard clause or project requirement"
                value={form.acceptanceCriteria}
                hint={errors.acceptanceCriteria}
                aria-invalid={Boolean(errors.acceptanceCriteria)}
                onChange={(event) => setField('acceptanceCriteria', event.target.value)}
              />,
            )}

            {sectionCard(
              'results',
              FileText,
              '9. Results & Conclusions',
              'Summary of the evidence and where the results are recorded',
              <>
                <Select
                  id="analysis-result-source"
                  label="Result Source"
                  options={[
                    { value: '', label: 'Select the result source' },
                    ...RESULT_SOURCES.map((source) => ({ value: source.value, label: source.label })),
                  ]}
                  value={form.resultSource}
                  hint={errors.resultSource}
                  aria-invalid={Boolean(errors.resultSource)}
                  onChange={(event) => setField('resultSource', event.target.value)}
                />
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-calc-results"
                    label="Calculation Results"
                    rows={3}
                    placeholder="Recorded values and where they are held (manual calculation, imported report, external solver output)"
                    value={form.calculationResults}
                    onChange={(event) => setField('calculationResults', event.target.value)}
                  />
                </div>
                <Textarea
                  id="analysis-results"
                  label="Result Summary"
                  rows={4}
                  placeholder="State what the evidence shows and reference the report or result file"
                  value={form.resultSummary}
                  onChange={(event) => setField('resultSummary', event.target.value)}
                />
                <p className="mech-aside-hint anl-inline-hint">
                  Do not enter certified results here. Record the report, solver output or calculation
                  reference that holds them; this module does not run or validate simulations.
                </p>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-remarks"
                    label="Technical Remarks"
                    rows={3}
                    placeholder="Conclusions, recommendations, open questions or follow-up evidence needed"
                    value={form.technicalRemarks}
                    onChange={(event) => setField('technicalRemarks', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="analysis-notes"
                    label="Internal Notes"
                    rows={2}
                    placeholder="Working notes kept with the record"
                    value={form.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                  />
                </div>
              </>,
            )}

            {sectionCard(
              'attachments',
              Paperclip,
              '10. Supporting Attachments',
              'Stored in this browser — upload, preview and download the original files',
              <AttachmentManager
                analysisId={formId}
                value={attachments}
                onChange={setAttachments}
                uploadedBy={form.engineer}
              />,
              attachments.length,
            )}

            {sectionCard(
              'assignment',
              Users,
              '11. Assignment & Review',
              'Engineer, technical reviewer and the review target',
              <div className="form-grid">
                <Select
                  id="analysis-engineer"
                  label="Assigned Engineer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.engineer}
                  hint={errors.engineer}
                  aria-invalid={Boolean(errors.engineer)}
                  onChange={(event) => setField('engineer', event.target.value)}
                />
                <Select
                  id="analysis-reviewer"
                  label="Technical Reviewer"
                  options={ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
                  value={form.reviewer}
                  hint={errors.reviewer}
                  aria-invalid={Boolean(errors.reviewer)}
                  onChange={(event) => setField('reviewer', event.target.value)}
                />
                <div className="form-field">
                  <span className="form-label">Current Status</span>
                  <span className="form-static">
                    {editing ? editing.verificationStatus : 'Draft'} · submission handled from the register
                  </span>
                </div>
                <div className="form-field">
                  <span className="form-label">Created On</span>
                  <span className="form-static">{form.created ? formatDate(form.created) : 'Not set'}</span>
                </div>
              </div>,
            )}
          </div>

          <aside className="mech-form-aside">
            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <ClipboardCheck aria-hidden="true" />
                <strong>Analysis Context</strong>
              </header>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Project</span>
                  <span className="mech-aside-note">
                    {project ? `${project.id} · ${project.name}` : 'Not selected'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Part / Assembly</span>
                  <span className="mech-aside-note">
                    {form.linkedId
                      ? componentLabel(form.linkedType, form.linkedId, parts, assemblies)
                      : 'Not selected'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Category</span>
                  <span className="mech-aside-note">{form.category}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Drawing Revision</span>
                  <span className="mech-aside-note">{form.drawingRevision}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Reviewer</span>
                  <span className="mech-aside-note">{form.reviewer}</span>
                </div>
              </div>
            </section>

            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <ShieldCheck aria-hidden="true" />
                <strong>Review Readiness</strong>
              </header>
              <div className="mech-aside-body">
                <ul className="anl-checklist">
                  {checklist.map((item) => (
                    <li key={item.key} className={item.done ? 'is-done' : ''}>
                      {item.done ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                      {item.label}
                    </li>
                  ))}
                </ul>
                <p className="mech-aside-note">
                  Saving keeps the record in Draft / In Progress. Submission for review is a separate
                  step in the Analysis Register.
                </p>
              </div>
            </section>

            <section className="mech-aside-hint">
              <strong>Evidence rules</strong>
              Simulation results stay in the solver or report they came from. This record stores the
              reference, drawing revision and reviewer decision only.
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={requestCancel}>
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {editing ? editing.verificationStatus : 'Draft'} · stored locally in this browser
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={() => submit(false)} icon={editing ? Save : Plus}>
              {editing ? 'Save' : 'Save Analysis'}
            </Button>
            <Button variant="secondary" icon={ArrowRight} onClick={() => submit(true)}>
              Save &amp; Continue
            </Button>
          </div>
        </div>
      </form>

      <Modal
        open={cancelPrompt}
        onClose={() => setCancelPrompt(false)}
        title="Discard unsaved changes?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelPrompt(false)}>
              Keep Editing
            </Button>
            <Button onClick={discardAndLeave}>Discard &amp; Leave</Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Anything typed since the last save will be lost. Save as Draft first if you want to keep it.
        </p>
      </Modal>
    </PageLayout>
  );
}
