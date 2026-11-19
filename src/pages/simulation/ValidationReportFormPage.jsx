import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  PageHeader,
  PageLayout,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useSimulation } from '../../context/SimulationContext';
import { ENGINEERS, TODAY } from '../../data/projectData';
import {
  ISSUE_STATUSES,
  SEVERITIES,
  VALIDATION_CATEGORIES,
  VALIDATION_RESULTS,
  VALIDATION_TYPES,
  severityTone,
} from '../../data/simulationData';

const EMPTY_ISSUE = {
  title: '',
  description: '',
  component: '',
  severity: 'Minor',
  evidence: '',
  rootCause: '',
  correction: '',
  status: 'Open',
};

function emptyForm(projectId, design, revision) {
  return {
    title: '',
    projectId: projectId || '',
    designId: design?.id || '',
    revision: revision || design?.revision || '',
    modelId: '',
    category: VALIDATION_CATEGORIES[0],
    reportType: VALIDATION_TYPES[0],
    component: '',
    objective: '',
    inputModel: '',
    methodology: '',
    boundaryConditions: '',
    assumptions: '',
    problemDescription: '',
    observedIssue: '',
    severity: 'Minor',
    expectedResult: '',
    actualObservation: '',
    rootCause: '',
    correction: '',
    reviewerComments: '',
    validationResult: '',
    reportDate: TODAY,
    preparedBy: 'D. Rao',
    reviewedBy: 'N. Joshi',
    observationIds: [],
    attachments: [],
    screenshots: [],
    issues: [],
  };
}

function formFromReport(report) {
  return {
    ...report,
    issues: (report.issues || []).map((issue) => ({ ...EMPTY_ISSUE, ...issue })),
    attachments: report.attachments || [],
    screenshots: report.screenshots || [],
  };
}

const fileMeta = (file, by) => ({ name: file.name, size: file.size, type: file.type || 'file', by, at: TODAY });

export default function ValidationReportFormPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { designs } = useMechanical();
  const { projects } = useProjects();
  const { reports, models, observations, addReport, updateReport, nextReportId } = useSimulation();

  const editing = useMemo(
    () => (reportId ? reports.find((report) => report.id === reportId) : null),
    [reportId, reports],
  );

  const defaultProjectId = projects[0]?.id || '';
  const defaultDesign = designs.find((design) => design.projectId === defaultProjectId);

  const [formId] = useState(() => (editing ? editing.id : nextReportId()));
  const [form, setForm] = useState(() =>
    editing ? formFromReport(editing) : emptyForm(defaultProjectId, defaultDesign, defaultDesign?.revision),
  );
  const [openSections, setOpenSections] = useState({
    report: true,
    findings: true,
    issues: true,
    evidence: true,
    review: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  if (reportId && !editing) {
    return <Navigate to="/engineering-analysis/reports" replace />;
  }
  if (editing && !['Draft', 'Corrections Required'].includes(editing.status)) {
    return <Navigate to={`/engineering-analysis/reports/${reportId}`} replace />;
  }

  const design = designs.find((row) => row.id === form.designId);
  const revisions = design?.revisions?.length
    ? design.revisions.map((entry) => entry.revision)
    : [design?.revision || 'A'];
  const designModels = models.filter(
    (model) => model.designId === form.designId && (!form.revision || model.revision === form.revision),
  );
  const designObservations = observations.filter((row) => row.designId === form.designId);

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const setIssue = (index, key, value) =>
    setForm((previous) => ({
      ...previous,
      issues: previous.issues.map((issue, position) =>
        position === index ? { ...issue, [key]: value } : issue,
      ),
    }));

  const addIssue = () =>
    setForm((previous) => ({
      ...previous,
      issues: [
        ...previous.issues,
        { ...EMPTY_ISSUE, id: `${formId}-I${previous.issues.length + 1}` },
      ],
    }));

  const removeIssue = (index) =>
    setForm((previous) => ({
      ...previous,
      issues: previous.issues.filter((issue, position) => position !== index),
    }));

  const addFiles = (key, files) => {
    if (!files?.length) return;
    setForm((previous) => ({
      ...previous,
      [key]: [...previous[key], ...[...files].map((file) => fileMeta(file, previous.preparedBy))],
    }));
  };

  const validate = () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project.';
    if (!form.designId) next.designId = 'Select the mechanical design.';
    if (!form.revision) next.revision = 'Select the design revision.';
    if (!form.title.trim()) next.title = 'A report title is required.';
    if (!form.objective.trim()) next.objective = 'State the validation objective.';
    if (!form.observedIssue.trim() && form.issues.length === 0)
      next.observedIssue = 'Record the observed issue, or add it as a report issue.';
    if (form.issues.some((issue) => !issue.title.trim())) next.issues = 'Every issue needs a title.';
    return next;
  };

  const buildRecord = (status) => ({
    ...form,
    id: formId,
    title: form.title.trim(),
    objective: form.objective.trim(),
    observedIssue: form.observedIssue.trim(),
    issues: form.issues.map((issue, index) => ({
      ...issue,
      id: issue.id || `${formId}-I${index + 1}`,
      title: issue.title.trim(),
    })),
    status,
  });

  const persist = (status) => {
    const record = buildRecord(status);
    if (editing) {
      updateReport(formId, record);
    } else {
      addReport({ ...record, decisionHistory: [], activity: [] });
    }
    return formId;
  };

  const save = (mode) => {
    if (mode === 'submit') {
      const next = validate();
      setErrors(next);
      if (Object.keys(next).length > 0) {
        setBanner({ tone: 'error', message: 'Complete the required report fields before submitting.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    if (!form.title.trim() || !form.designId) {
      setErrors(validate());
      setBanner({ tone: 'error', message: 'Add a design and report title before saving.' });
      return;
    }
    const id = persist(mode === 'submit' ? 'Draft' : 'Draft');
    if (mode === 'submit') {
      navigate(`/engineering-analysis/reports/${id}`);
      return;
    }
    navigate(`/engineering-analysis/reports/${id}`);
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
            { label: 'Simulation & Design Validation', to: '/engineering-analysis' },
            { label: 'Validation Reports', to: '/engineering-analysis/reports' },
            { label: editing ? `${formId} · Edit` : 'New Report' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={ClipboardList}
          title={editing ? 'Edit Validation Report' : 'New Validation Report'}
          subtitle="Manual inspection and design validation — no numerical simulation is performed by this application."
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/engineering-analysis/reports')}>
              Back to Reports
            </Button>
          }
        />
      }
    >
      <form
        className="project-form-page"
        onSubmit={(event) => {
          event.preventDefault();
          save('draft');
        }}
        noValidate
      >
        {banner && (
          <div className={`form-banner ${banner.tone}`} role="status">
            {banner.tone === 'success' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            <span>{banner.message}</span>
          </div>
        )}

        <div className="sim-report-layout">
          <div className="mech-form-main">
            {sectionCard(
              'report',
              ClipboardList,
              'Report Information',
              'Identification, project, design, revision and model reference',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Report ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Select
                  id="vdr-project"
                  label="Project"
                  options={[
                    { value: '', label: 'Select project' },
                    ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.projectId}
                  hint={errors.projectId}
                  onChange={(event) => {
                    const projectId = event.target.value;
                    const nextDesign = designs.find((row) => row.projectId === projectId);
                    setForm((previous) => ({
                      ...previous,
                      projectId,
                      designId: nextDesign?.id || '',
                      revision: nextDesign?.revision || '',
                      modelId: '',
                    }));
                  }}
                />
                <Select
                  id="vdr-design"
                  label="Mechanical Design"
                  options={[
                    { value: '', label: 'Select design' },
                    ...designs
                      .filter((row) => row.projectId === form.projectId)
                      .map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.designId}
                  hint={errors.designId}
                  onChange={(event) => {
                    const next = designs.find((row) => row.id === event.target.value);
                    setForm((previous) => ({
                      ...previous,
                      designId: event.target.value,
                      revision: next?.revision || '',
                      modelId: '',
                    }));
                  }}
                />
                <Select
                  id="vdr-revision"
                  label="Design Revision"
                  options={revisions.map((value) => ({ value, label: `Rev ${value}` }))}
                  value={form.revision}
                  hint={errors.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
                <Select
                  id="vdr-model"
                  label="Model File Reference"
                  options={[
                    { value: '', label: 'No model reference' },
                    ...designModels.map((model) => ({
                      value: model.id,
                      label: `${model.id} · ${model.fileName}`,
                    })),
                  ]}
                  value={form.modelId}
                  hint="References a model uploaded in the Simulation Workspace."
                  onChange={(event) => setField('modelId', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="vdr-title"
                    label="Report Title"
                    value={form.title}
                    hint={errors.title}
                    aria-invalid={Boolean(errors.title)}
                    onChange={(event) => setField('title', event.target.value)}
                  />
                </div>
                <Select
                  id="vdr-category"
                  label="Validation Category"
                  options={VALIDATION_CATEGORIES.map((value) => ({ value, label: value }))}
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                />
                <Select
                  id="vdr-type"
                  label="Method / Inspection Type"
                  options={VALIDATION_TYPES.map((value) => ({ value, label: value }))}
                  value={form.reportType}
                  onChange={(event) => setField('reportType', event.target.value)}
                />
                <Input
                  id="vdr-component"
                  label="Component / Assembly"
                  value={form.component}
                  onChange={(event) => setField('component', event.target.value)}
                />
                <Input
                  id="vdr-date"
                  label="Report Date"
                  type="date"
                  value={form.reportDate}
                  onChange={(event) => setField('reportDate', event.target.value)}
                />
                <Select
                  id="vdr-prepared"
                  label="Prepared By"
                  options={ENGINEERS.map((name) => ({ value: name, label: name }))}
                  value={form.preparedBy}
                  onChange={(event) => setField('preparedBy', event.target.value)}
                />
                <Select
                  id="vdr-reviewed"
                  label="Reviewed By"
                  options={ENGINEERS.map((name) => ({ value: name, label: name }))}
                  value={form.reviewedBy}
                  onChange={(event) => setField('reviewedBy', event.target.value)}
                />
                <Select
                  id="vdr-result"
                  label="Validation Result"
                  options={VALIDATION_RESULTS.map((value) => ({
                    value,
                    label: value || 'Not concluded',
                  }))}
                  value={form.validationResult}
                  hint="Recorded by the reviewer; saving never validates the design."
                  onChange={(event) => setField('validationResult', event.target.value)}
                />
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-objective"
                    label="Validation Objective"
                    rows={2}
                    value={form.objective}
                    hint={errors.objective}
                    onChange={(event) => setField('objective', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Input
                    id="vdr-input-model"
                    label="Input Model"
                    placeholder="CAD file, revision and conversion reference used for the check"
                    value={form.inputModel}
                    onChange={(event) => setField('inputModel', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'findings',
              AlertTriangle,
              'Findings',
              'Problem description, expected result, observed behaviour and recommendation',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-methodology"
                    label="Methodology"
                    rows={2}
                    placeholder="How the inspection/check was performed. Rendering alone is not simulation."
                    value={form.methodology}
                    onChange={(event) => setField('methodology', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-boundary"
                    label="Boundary Conditions"
                    rows={2}
                    placeholder="Only genuine solver/check boundary conditions — state 'not applicable' for manual inspection"
                    value={form.boundaryConditions}
                    onChange={(event) => setField('boundaryConditions', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-assumptions"
                    label="Engineering Assumptions"
                    rows={2}
                    value={form.assumptions}
                    onChange={(event) => setField('assumptions', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-problem"
                    label="Problem Description"
                    rows={2}
                    value={form.problemDescription}
                    onChange={(event) => setField('problemDescription', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-observed"
                    label="Observed Issue"
                    rows={2}
                    value={form.observedIssue}
                    hint={errors.observedIssue}
                    onChange={(event) => setField('observedIssue', event.target.value)}
                  />
                </div>
                <Select
                  id="vdr-severity"
                  label="Severity"
                  options={SEVERITIES.map((value) => ({ value, label: value }))}
                  value={form.severity}
                  onChange={(event) => setField('severity', event.target.value)}
                />
                <Input
                  id="vdr-expected"
                  label="Expected Result"
                  value={form.expectedResult}
                  onChange={(event) => setField('expectedResult', event.target.value)}
                />
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-actual"
                    label="Actual Observation"
                    rows={2}
                    value={form.actualObservation}
                    onChange={(event) => setField('actualObservation', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-rootcause"
                    label="Possible Root Cause"
                    rows={2}
                    value={form.rootCause}
                    onChange={(event) => setField('rootCause', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-correction"
                    label="Recommended Correction"
                    rows={2}
                    value={form.correction}
                    onChange={(event) => setField('correction', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <label className="form-label" htmlFor="vdr-observations">
                    Linked Observations
                  </label>
                  <select
                    id="vdr-observations"
                    className="form-select mech-multi"
                    multiple
                    size={4}
                    value={form.observationIds}
                    onChange={(event) =>
                      setField('observationIds', [...event.target.selectedOptions].map((option) => option.value))
                    }
                  >
                    {designObservations.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.id} · {row.title}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">Ctrl/Cmd-click to link recorded observations.</span>
                </div>
              </div>,
            )}

            {sectionCard(
              'issues',
              FileText,
              'Report Issues',
              'Each issue keeps its own component, severity, evidence, cause, correction and status',
              <>
                {errors.issues && (
                  <div className="form-banner error" role="status">
                    <AlertTriangle aria-hidden="true" />
                    <span>{errors.issues}</span>
                  </div>
                )}
                <div className="sim-issue-list">
                  {form.issues.map((issue, index) => (
                    <article className="sim-issue-card" key={issue.id || index}>
                      <header>
                        <strong>Issue {index + 1}</strong>
                        <StatusBadge status={issue.severity} tone={severityTone(issue.severity)} />
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Remove issue ${index + 1}`}
                          onClick={() => removeIssue(index)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </header>
                      <div className="form-grid">
                        <div className="form-grid-full">
                          <Input
                            id={`vdr-issue-title-${index}`}
                            label="Issue Title"
                            value={issue.title}
                            onChange={(event) => setIssue(index, 'title', event.target.value)}
                          />
                        </div>
                        <div className="form-grid-full">
                          <Textarea
                            id={`vdr-issue-description-${index}`}
                            label="Description"
                            rows={2}
                            value={issue.description}
                            onChange={(event) => setIssue(index, 'description', event.target.value)}
                          />
                        </div>
                        <Input
                          id={`vdr-issue-component-${index}`}
                          label="Component"
                          value={issue.component}
                          onChange={(event) => setIssue(index, 'component', event.target.value)}
                        />
                        <Select
                          id={`vdr-issue-severity-${index}`}
                          label="Severity"
                          options={SEVERITIES.map((value) => ({ value, label: value }))}
                          value={issue.severity}
                          onChange={(event) => setIssue(index, 'severity', event.target.value)}
                        />
                        <div className="form-grid-full">
                          <Textarea
                            id={`vdr-issue-evidence-${index}`}
                            label="Evidence"
                            rows={2}
                            placeholder="Screenshot, drawing reference or measurement note"
                            value={issue.evidence}
                            onChange={(event) => setIssue(index, 'evidence', event.target.value)}
                          />
                        </div>
                        <div className="form-grid-full">
                          <Textarea
                            id={`vdr-issue-root-${index}`}
                            label="Root Cause"
                            rows={2}
                            value={issue.rootCause}
                            onChange={(event) => setIssue(index, 'rootCause', event.target.value)}
                          />
                        </div>
                        <div className="form-grid-full">
                          <Textarea
                            id={`vdr-issue-correction-${index}`}
                            label="Recommended Correction"
                            rows={2}
                            value={issue.correction}
                            onChange={(event) => setIssue(index, 'correction', event.target.value)}
                          />
                        </div>
                        <Select
                          id={`vdr-issue-status-${index}`}
                          label="Issue Status"
                          options={ISSUE_STATUSES.map((value) => ({ value, label: value }))}
                          value={issue.status}
                          onChange={(event) => setIssue(index, 'status', event.target.value)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
                <Button icon={Plus} variant="secondary" onClick={addIssue}>
                  Add Issue
                </Button>
              </>,
            )}

            {sectionCard(
              'evidence',
              Upload,
              'Evidence',
              'Screenshots and supporting documents attached to this report',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Supporting Screenshots</span>
                  <label className="attachment-picker">
                    <Camera aria-hidden="true" />
                    <span>Attach screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => addFiles('screenshots', event.target.files)}
                    />
                  </label>
                  <ul className="sim-file-list">
                    {form.screenshots.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <FileText aria-hidden="true" />
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setField('screenshots', form.screenshots.filter((_, position) => position !== index))
                          }
                        >
                          <X aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="form-field">
                  <span className="form-label">Attachments</span>
                  <label className="attachment-picker">
                    <Upload aria-hidden="true" />
                    <span>Attach document</span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(event) => addFiles('attachments', event.target.files)}
                    />
                  </label>
                  <ul className="sim-file-list">
                    {form.attachments.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <FileText aria-hidden="true" />
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setField('attachments', form.attachments.filter((_, position) => position !== index))
                          }
                        >
                          <X aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="sim-note form-grid-full">
                  Attached simulation result files are external evidence only. This application did not
                  calculate them and makes no numerical claim about them.
                </p>
              </div>,
            )}

            {sectionCard(
              'review',
              Check,
              'Review',
              'Reviewer comments and decision reference',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="vdr-reviewer-comments"
                    label="Reviewer Comments"
                    rows={3}
                    value={form.reviewerComments}
                    onChange={(event) => setField('reviewerComments', event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <span className="form-label">Decisions</span>
                  <span className="form-static">
                    {(form.decisionHistory || []).length} recorded · status{' '}
                    <StatusBadge status={form.status || 'Draft'} />
                  </span>
                  <span className="form-hint">
                    Reviewer decisions are recorded from the report detail page.
                  </span>
                </div>
              </div>,
            )}
          </div>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => navigate('/engineering-analysis/reports')}
            >
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {editing?.status || 'Draft'} · manual inspection report
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={() => save('draft')}>
              Save Draft
            </Button>
            <Button icon={Send} onClick={() => save('submit')}>
              Save &amp; Continue
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
