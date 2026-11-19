import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Layers,
  Paperclip,
  Plus,
  Save,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Modal,
  PageHeader,
  PageLayout,
  Select,
  StatusBadge,
  Textarea,
  Input,
} from '../../components/common';
import { useAnalysis } from '../../context/AnalysisContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import { REVISIONS } from '../../data/mechanicalData';
import {
  ANALYSIS_REVIEWERS,
  isVerifiedEvidence,
  projectName,
  statusTone,
} from '../../data/analysisData';

function formatSize(bytes) {
  const kb = Math.max(1, Math.round((bytes || 0) / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function initialForm(projectId, revision) {
  return {
    title: '',
    projectId: projectId || '',
    product: '',
    description: '',
    preparedBy: 'D. Rao',
    reviewer: 'N. Joshi',
    reportDate: TODAY,
    revision: revision || 'A',
    summary: '',
    openIssues: '',
    recommendations: '',
  };
}

/**
 * New / Edit Validation Report — full-page form that selects existing analysis
 * records and separates verified evidence from outstanding evidence.
 */
export default function ValidationReportFormPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { reports, analyses, addReport, updateReport, nextReportId } = useAnalysis();
  const { projects } = useProjects();

  const editing = useMemo(
    () => (reportId ? reports.find((report) => report.id === reportId) : null),
    [reportId, reports],
  );

  const [formId] = useState(() => (editing ? editing.id : nextReportId()));
  const [form, setForm] = useState(() =>
    editing
      ? {
          title: editing.title,
          projectId: editing.projectId,
          product: editing.product,
          description: editing.description,
          preparedBy: editing.preparedBy,
          reviewer: editing.reviewer,
          reportDate: editing.reportDate,
          revision: editing.revision,
          summary: editing.summary,
          openIssues: editing.openIssues,
          recommendations: editing.recommendations,
        }
      : initialForm(projects[0]?.id),
  );
  const [selectedIds, setSelectedIds] = useState(() => editing?.analysisIds || []);
  const [attachments, setAttachments] = useState(() => editing?.attachments || []);
  const [openSections, setOpenSections] = useState({
    info: true,
    project: true,
    selection: true,
    evidence: true,
    summary: true,
    issues: true,
    attachments: true,
    review: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [cancelPrompt, setCancelPrompt] = useState(false);

  if (reportId && !editing) {
    return <Navigate to="/engineering-analysis/legacy-reports" replace />;
  }
  if (editing && !['Draft', 'Changes Requested'].includes(editing.status)) {
    return <Navigate to={`/engineering-analysis/legacy-reports/${editing.id}`} replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const projectAnalyses = useMemo(
    () => analyses.filter((analysis) => analysis.projectId === form.projectId),
    [analyses, form.projectId],
  );
  const selected = selectedIds
    .map((id) => analyses.find((analysis) => analysis.id === id))
    .filter(Boolean);
  const verified = selected.filter((analysis) => isVerifiedEvidence(analysis));
  const outstanding = selected.filter((analysis) => !isVerifiedEvidence(analysis));

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const toggleAnalysis = (id) =>
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );

  const validate = (forSave) => {
    const next = {};
    if (!form.title.trim()) next.title = 'A report title is required.';
    if (!form.projectId) next.projectId = 'Select the project this report covers.';
    if (!form.preparedBy) next.preparedBy = 'Select who prepared the report.';
    if (!form.reviewer) next.reviewer = 'Select the report reviewer.';
    if (forSave && !form.product.trim()) next.product = 'State the product or machine covered.';
    if (forSave && selectedIds.length === 0)
      next.selected = 'Select at least one existing analysis record.';
    if (forSave && !form.summary.trim())
      next.summary = 'Add a validation summary; state what the evidence supports.';
    return next;
  };

  const buildRecord = (status) => ({
    id: formId,
    title: form.title.trim(),
    projectId: form.projectId,
    product: form.product.trim(),
    description: form.description.trim(),
    analysisIds: selectedIds,
    preparedBy: form.preparedBy,
    reviewer: form.reviewer,
    reportDate: form.reportDate,
    revision: form.revision,
    summary: form.summary.trim(),
    openIssues: form.openIssues.trim(),
    recommendations: form.recommendations.trim(),
    status,
    approvalRef: editing?.approvalRef || '',
    attachments,
  });

  const persist = (status) => {
    if (editing) {
      updateReport(formId, {
        ...buildRecord(status),
        revisions: editing.revisions,
        activity: [
          ...(editing.activity || []),
          {
            id: `ACT-${formId}-${(editing.activity?.length || 0) + 1}`,
            label: 'Report updated',
            detail: 'Report details updated from the form',
            by: form.preparedBy,
            at: TODAY,
          },
        ],
      });
      return formId;
    }
    addReport({
      ...buildRecord(status),
      revisions: [
        { revision: form.revision, date: TODAY, by: form.preparedBy, note: 'Initial validation report created.' },
      ],
      activity: [],
    });
    return formId;
  };

  const saveDraft = () => {
    const next = validate(false);
    setErrors(next);
    if (!form.title.trim() || !form.projectId) {
      setBanner({ tone: 'error', message: 'Add a project and report title before saving the draft.' });
      return;
    }
    const id = persist('Draft');
    if (!editing) {
      navigate(`/engineering-analysis/legacy-reports/${id}/edit`, { replace: true });
      setBanner({
        tone: 'success',
        message: `Draft ${id} saved. Select evidence and submit it for review when ready.`,
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
        project: true,
        selection: true,
        evidence: true,
        summary: true,
        issues: true,
        attachments: true,
        review: true,
      });
      setBanner({ tone: 'error', message: 'Complete the required report fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const id = persist(editing?.status === 'Changes Requested' ? 'Changes Requested' : 'Draft');
    navigate(
      continueAfter ? `/engineering-analysis/legacy-reports/${id}` : '/engineering-analysis/legacy-reports',
    );
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
            { label: 'Engineering Analysis', to: '/engineering-analysis' },
            { label: 'Validation Reports', to: '/engineering-analysis/legacy-reports' },
            { label: editing ? `${formId} · Edit` : 'New Validation Report' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Layers}
          title={editing ? 'Edit Validation Report' : 'New Validation Report'}
          subtitle="Consolidate existing analysis records by reference — verified evidence is separated from outstanding evidence."
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/engineering-analysis/legacy-reports')}
            >
              Back to Validation Reports
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
              FileText,
              '1. Report Information',
              'Identification, product and report date',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Report ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Input
                  id="report-date"
                  label="Report Date"
                  type="date"
                  value={form.reportDate}
                  onChange={(event) => setField('reportDate', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="report-title"
                    label="Report Title"
                    placeholder="e.g. Conveyor drive validation report"
                    value={form.title}
                    hint={errors.title}
                    aria-invalid={Boolean(errors.title)}
                    onChange={(event) => setField('title', event.target.value)}
                  />
                </div>
                <Input
                  id="report-product"
                  label="Product / Machine"
                  placeholder="e.g. Conveyor drive assembly"
                  value={form.product}
                  hint={errors.product}
                  aria-invalid={Boolean(errors.product)}
                  onChange={(event) => setField('product', event.target.value)}
                />
                <Select
                  id="report-revision"
                  label="Report Revision"
                  options={REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
                <div className="form-grid-full">
                  <Textarea
                    id="report-description"
                    label="Report Description"
                    rows={2}
                    placeholder="What this validation report consolidates and why"
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'project',
              ClipboardCheck,
              '2. Project Selection',
              'The report and its evidence belong to one project',
              <div className="form-grid">
                <Select
                  id="report-project"
                  label="Project"
                  options={[
                    { value: '', label: 'Select a project' },
                    ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.projectId}
                  hint={errors.projectId}
                  aria-invalid={Boolean(errors.projectId)}
                  onChange={(event) => {
                    setField('projectId', event.target.value);
                    setSelectedIds([]);
                  }}
                />
                <div className="form-field">
                  <span className="form-label">Project Name</span>
                  <span className="form-static">
                    {project ? projectName(projects, form.projectId) : 'Not selected'}
                  </span>
                </div>
                <div className="form-field">
                  <span className="form-label">Customer</span>
                  <span className="form-static">{project?.customer || '—'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Analysis Records in Project</span>
                  <span className="form-static">{projectAnalyses.length}</span>
                </div>
              </div>,
            )}

            {sectionCard(
              'selection',
              Layers,
              '3. Analysis Record Selection',
              'Only existing analysis records can be referenced; nothing is duplicated',
              <>
                <div className="anl-pick-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ShieldCheck}
                    onClick={() =>
                      setSelectedIds(
                        projectAnalyses
                          .filter((analysis) => isVerifiedEvidence(analysis))
                          .map((analysis) => analysis.id),
                      )
                    }
                  >
                    Select verified only
                  </Button>
                  <Button variant="ghost" size="sm" icon={X} onClick={() => setSelectedIds([])}>
                    Clear selection
                  </Button>
                </div>
                {projectAnalyses.length === 0 ? (
                  <p className="dash-modal-note">
                    No analysis records exist for this project yet. Create one first in the Analysis
                    Register.
                  </p>
                ) : (
                  <div className="anl-pick-list">
                    {projectAnalyses.map((analysis) => (
                      <label
                        key={analysis.id}
                        className={`anl-pick-item${selectedIds.includes(analysis.id) ? ' is-selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(analysis.id)}
                          onChange={() => toggleAnalysis(analysis.id)}
                        />
                        <span className="anl-pick-body">
                          <span className="anl-pick-title">
                            <span className="cell-id">{analysis.id}</span> {analysis.title}
                          </span>
                          <span className="anl-pick-meta">
                            {analysis.category} · {analysis.analysisType} · {analysis.drawingRevision} ·
                            Rev {analysis.revision}
                          </span>
                        </span>
                        <StatusBadge
                          status={analysis.verificationStatus}
                          tone={statusTone(analysis.verificationStatus)}
                        />
                      </label>
                    ))}
                  </div>
                )}
                {errors.selected && <p className="mech-inline-error">{errors.selected}</p>}
              </>,
            )}

            {sectionCard(
              'evidence',
              ShieldCheck,
              '4. Evidence Summary',
              'Verified evidence is eligible for the report; other records are outstanding',
              <>
                <div className="anl-evidence-summary">
                  <div className="anl-stat">
                    <span className="anl-stat-label">Selected Analyses</span>
                    <strong>{selectedIds.length}</strong>
                  </div>
                  <div className="anl-stat is-verified">
                    <span className="anl-stat-label">Verified Evidence</span>
                    <strong>{verified.length}</strong>
                  </div>
                  <div className="anl-stat is-outstanding">
                    <span className="anl-stat-label">Outstanding Evidence</span>
                    <strong>{outstanding.length}</strong>
                  </div>
                </div>
                <div className="anl-evidence-columns">
                  <div>
                    <p className="anl-subhead">Verified evidence</p>
                    {verified.length === 0 ? (
                      <p className="dash-modal-note">No verified analyses selected yet.</p>
                    ) : (
                      <ul className="anl-ref-list">
                        {verified.map((analysis) => (
                          <li key={analysis.id}>
                            <Check aria-hidden="true" />
                            <span className="cell-id">{analysis.id}</span>
                            {analysis.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="anl-subhead">Outstanding evidence</p>
                    {outstanding.length === 0 ? (
                      <p className="dash-modal-note">No unverified records selected.</p>
                    ) : (
                      <ul className="anl-ref-list is-outstanding">
                        {outstanding.map((analysis) => (
                          <li key={analysis.id}>
                            <X aria-hidden="true" />
                            <span className="cell-id">{analysis.id}</span>
                            {analysis.title}
                            <StatusBadge
                              status={analysis.verificationStatus}
                              tone={statusTone(analysis.verificationStatus)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>,
            )}

            {sectionCard(
              'summary',
              FileText,
              '5. Validation Summary',
              'What the selected evidence supports — and what it does not',
              <Textarea
                id="report-summary"
                label="Validation Summary"
                rows={5}
                placeholder="State which evidence is verified, what it covers and any limits of the validation."
                value={form.summary}
                hint={errors.summary}
                aria-invalid={Boolean(errors.summary)}
                onChange={(event) => setField('summary', event.target.value)}
              />,
            )}

            {sectionCard(
              'issues',
              ClipboardCheck,
              '6. Open Issues & Recommendations',
              'Outstanding items and the recommended next actions',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="report-issues"
                    label="Open Issues"
                    rows={3}
                    placeholder="Pending evidence, rejected analyses or gaps that block validation"
                    value={form.openIssues}
                    onChange={(event) => setField('openIssues', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="report-recommendations"
                    label="Recommendations"
                    rows={3}
                    placeholder="What should happen next before design release"
                    value={form.recommendations}
                    onChange={(event) => setField('recommendations', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'attachments',
              Paperclip,
              '7. Supporting Attachments',
              'Local file names and sizes only',
              <>
                <label className="attachment-picker">
                  <Upload aria-hidden="true" />
                  <span>Choose report files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.docx,.csv,.txt,.png,.jpg,.jpeg"
                    onChange={(event) => {
                      const incoming = [...(event.target.files || [])].map((file) => ({
                        name: file.name,
                        size: file.size,
                        type: file.type || 'Document',
                        uploadedBy: form.preparedBy,
                        uploadedAt: TODAY,
                      }));
                      if (incoming.length) setAttachments((previous) => [...previous, ...incoming]);
                      event.target.value = '';
                    }}
                  />
                </label>
                {attachments.length === 0 ? (
                  <p className="mech-aside-note">No report attachments added.</p>
                ) : (
                  <ul className="mech-aside-files anl-attachment-list">
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <FileText aria-hidden="true" />
                        <span className="mech-aside-file-name">{file.name}</span>
                        <span className="mech-aside-file-size">{formatSize(file.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setAttachments((previous) =>
                              previous.filter((_, position) => position !== index),
                            )
                          }
                        >
                          <X aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>,
            )}

            {sectionCard(
              'review',
              Users,
              '8. Review Assignment',
              'Who prepared the report and who reviews it',
              <div className="form-grid">
                <Select
                  id="report-prepared-by"
                  label="Prepared By"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.preparedBy}
                  hint={errors.preparedBy}
                  aria-invalid={Boolean(errors.preparedBy)}
                  onChange={(event) => setField('preparedBy', event.target.value)}
                />
                <Select
                  id="report-reviewer"
                  label="Technical Reviewer"
                  options={ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
                  value={form.reviewer}
                  hint={errors.reviewer}
                  aria-invalid={Boolean(errors.reviewer)}
                  onChange={(event) => setField('reviewer', event.target.value)}
                />
                <div className="form-field">
                  <span className="form-label">Report Status</span>
                  <span className="form-static">
                    {editing ? editing.status : 'Draft'} · submission handled from the report register
                  </span>
                </div>
                <div className="form-field">
                  <span className="form-label">Report Date</span>
                  <span className="form-static">
                    {form.reportDate ? formatDate(form.reportDate) : 'Not set'}
                  </span>
                </div>
              </div>,
            )}
          </div>

          <aside className="mech-form-aside">
            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <Layers aria-hidden="true" />
                <strong>Report Context</strong>
              </header>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Project</span>
                  <span className="mech-aside-note">
                    {project ? `${project.id} · ${project.name}` : 'Not selected'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Categories covered</span>
                  <span className="mech-aside-note">
                    {[...new Set(selected.map((analysis) => analysis.category))].join(', ') ||
                      'None selected'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Drawing revisions</span>
                  <span className="mech-aside-note">
                    {[...new Set(selected.map((analysis) => analysis.drawingRevision))].join(', ') ||
                      'None selected'}
                  </span>
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
                <strong>Evidence Counts</strong>
              </header>
              <div className="mech-aside-body">
                <div className="anl-evidence-summary is-stacked">
                  <div className="anl-stat">
                    <span className="anl-stat-label">Selected</span>
                    <strong>{selectedIds.length}</strong>
                  </div>
                  <div className="anl-stat is-verified">
                    <span className="anl-stat-label">Verified</span>
                    <strong>{verified.length}</strong>
                  </div>
                  <div className="anl-stat is-outstanding">
                    <span className="anl-stat-label">Outstanding</span>
                    <strong>{outstanding.length}</strong>
                  </div>
                </div>
                <p className="mech-aside-note">
                  A report may list outstanding evidence, but it never counts as verified evidence.
                </p>
              </div>
            </section>

            <section className="mech-aside-hint">
              <strong>Controlled change</strong>
              An approved report cannot be edited. Raise a new revision from the report register when a
              controlled change is required.
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={() => setCancelPrompt(true)}>
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {editing ? editing.status : 'Draft'} · stored locally in this browser
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={() => submit(false)} icon={editing ? Save : Plus}>
              {editing ? 'Save' : 'Save Report'}
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
            <Button onClick={() => navigate('/engineering-analysis/legacy-reports')}>Discard &amp; Leave</Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Anything typed since the last save will be lost. Save as Draft first to keep it.
        </p>
      </Modal>
    </PageLayout>
  );
}
