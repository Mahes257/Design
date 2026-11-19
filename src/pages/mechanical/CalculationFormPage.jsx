import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Info,
  Link2,
  Plus,
  Save,
  ShieldCheck,
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
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  CALCULATION_TYPES,
  CALC_STATUSES,
  DESIGN_DOMAINS,
  REVISIONS,
  projectName,
  statusTone,
} from '../../data/mechanicalData';

const LINK_TYPES = [
  { value: 'design', label: 'Design' },
  { value: 'part', label: 'Part' },
  { value: 'assembly', label: 'Assembly' },
];

function blankRow(keyPrefix, index) {
  return { key: `${keyPrefix}-${index}`, label: '', value: '', unit: '' };
}

function initialForm(projectId) {
  return {
    title: '',
    projectId: projectId || '',
    domain: 'Machine Design',
    linkedType: 'design',
    linkedId: '',
    calcType: 'Shaft Design',
    description: '',
    assumptions: '',
    formulaRef: '',
    resultUnits: '',
    notes: '',
    preparedBy: 'R. Kulkarni',
    verifiedBy: '',
    calcDate: TODAY,
    revision: 'A',
    verificationStatus: 'Draft',
  };
}

/**
 * New / Edit Calculation — records inputs, method, assumptions and result rows.
 * The module does not compute results; every value is entered and reviewed.
 */
export default function CalculationFormPage() {
  const { calcId } = useParams();
  const navigate = useNavigate();
  const {
    calculations,
    designs,
    parts,
    assemblies,
    addCalculation,
    updateCalculation,
    nextCalculationId,
  } = useMechanical();
  const { projects } = useProjects();

  const editing = useMemo(
    () => (calcId ? calculations.find((row) => row.id === calcId) : null),
    [calcId, calculations],
  );

  const [formId, setFormId] = useState(() => (editing ? editing.id : nextCalculationId()));
  const [form, setForm] = useState(() =>
    editing
      ? {
          title: editing.title,
          projectId: editing.projectId,
          domain: editing.domain,
          linkedType: editing.linkedType,
          linkedId: editing.linkedId,
          calcType: editing.calcType,
          description: editing.description,
          assumptions: editing.assumptions,
          formulaRef: editing.formulaRef,
          resultUnits: editing.resultUnits,
          notes: editing.notes,
          preparedBy: editing.preparedBy,
          verifiedBy: editing.verifiedBy,
          calcDate: editing.calcDate,
          revision: editing.revision,
          verificationStatus: editing.verificationStatus,
        }
      : initialForm(projects[0]?.id),
  );
  const [inputs, setInputs] = useState(() =>
    editing && editing.inputs?.length
      ? editing.inputs
      : [
          { key: 'in-1', label: '', value: '', unit: '' },
          { key: 'in-2', label: '', value: '', unit: '' },
        ],
  );
  const [results, setResults] = useState(() =>
    editing && editing.results?.length ? editing.results : [{ key: 'res-1', label: '', value: '', unit: '' }],
  );
  const [attachments, setAttachments] = useState(() => editing?.attachments || []);
  const [openSections, setOpenSections] = useState({
    info: true,
    references: true,
    inputs: true,
    method: true,
    results: true,
    notes: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  if (calcId && !editing) {
    return <Navigate to="/mechanical-design/design-calculations" replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const linkOptions = useMemo(() => {
    if (form.linkedType === 'part') {
      return parts
        .filter((part) => part.projectId === form.projectId)
        .map((part) => ({ value: part.id, label: `${part.partNumber} · ${part.name}` }));
    }
    if (form.linkedType === 'assembly') {
      return assemblies
        .filter((assembly) => assembly.projectId === form.projectId)
        .map((assembly) => ({ value: assembly.id, label: `${assembly.number} · ${assembly.name}` }));
    }
    return designs
      .filter((design) => design.projectId === form.projectId)
      .map((design) => ({ value: design.id, label: `${design.id} · ${design.name}` }));
  }, [form.linkedType, form.projectId, parts, assemblies, designs]);

  const setRow = (setter, index, key, value) =>
    setter((previous) =>
      previous.map((row, position) => (position === index ? { ...row, [key]: value } : row)),
    );

  const validate = (forSave) => {
    const next = {};
    if (!form.title.trim()) next.title = 'A calculation title is required.';
    if (!form.projectId) next.projectId = 'Select the project this calculation supports.';
    if (!form.calcType) next.calcType = 'Select a calculation type.';
    if (!form.preparedBy) next.preparedBy = 'Select who prepared the calculation.';
    if (forSave && !form.linkedId) {
      next.linkedId = 'Select the design, part or assembly this calculation supports.';
    }
    if (forSave && !form.description.trim())
      next.description = 'Describe what is being calculated.';
    if (forSave && !inputs.some((row) => row.label.trim() && String(row.value).trim())) {
      next.inputs = 'Record at least one input parameter with a value.';
    }
    if (forSave && !results.some((row) => row.label.trim() && String(row.value).trim())) {
      next.results = 'Record at least one result row.';
    }
    if (forSave && !form.formulaRef.trim())
      next.formulaRef = 'Add the formula or method reference used.';
    return next;
  };

  const buildRecord = (verificationStatus) => ({
    id: formId,
    title: form.title.trim(),
    projectId: form.projectId,
    domain: form.domain,
    linkedType: form.linkedType,
    linkedId: form.linkedId,
    calcType: form.calcType,
    description: form.description.trim(),
    inputs: inputs.filter((row) => row.label.trim()),
    assumptions: form.assumptions.trim(),
    formulaRef: form.formulaRef.trim(),
    results: results.filter((row) => row.label.trim()),
    resultUnits: form.resultUnits.trim(),
    notes: form.notes.trim(),
    preparedBy: form.preparedBy,
    verifiedBy: form.verifiedBy,
    calcDate: form.calcDate,
    revision: form.revision,
    verificationStatus,
    attachments,
  });

  const persist = (verificationStatus) => {
    if (editing) {
      const revisionChanged = form.revision !== editing.revision;
      updateCalculation(formId, {
        ...buildRecord(verificationStatus),
        revisions: revisionChanged
          ? [
              ...(editing.revisions || []),
              { revision: form.revision, date: TODAY, by: form.preparedBy, note: `Revision ${form.revision} saved.` },
            ]
          : editing.revisions,
      });
    } else {
      addCalculation({
        ...buildRecord(verificationStatus),
        revisions: [
          { revision: form.revision, date: TODAY, by: form.preparedBy, note: 'Initial calculation record created.' },
        ],
        verification: [],
      });
    }
    return formId;
  };

  const saveDraft = () => {
    const next = validate(false);
    setErrors(next);
    if (!form.title.trim() || !form.projectId || !form.linkedId) {
      setBanner({
        tone: 'error',
        message: 'Add a title, project and linked design, part or assembly before saving the draft.',
      });
      return;
    }
    const id = persist('Draft');
    if (!editing) {
      navigate(`/mechanical-design/design-calculations/${id}/edit`, { replace: true });
      setBanner({ tone: 'success', message: `Draft ${id} saved. Complete the inputs and results, then save it.` });
      return;
    }
    setBanner({ tone: 'success', message: `Draft changes saved for ${id}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (continueAfter) => {
    const next = validate(true);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({ info: true, references: true, inputs: true, method: true, results: true, notes: true });
      setBanner({ tone: 'error', message: 'Complete the required calculation fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Saving never auto-verifies: existing status is kept, new records stay Draft.
    const status = editing ? form.verificationStatus : 'Draft';
    const id = persist(status);
    navigate(
      continueAfter ? `/mechanical-design/design-calculations/${id}` : '/mechanical-design/design-calculations',
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
            { label: 'Mechanical Engineering Design', to: '/mechanical-design' },
            { label: 'Design Calculations', to: '/mechanical-design/design-calculations' },
            { label: editing ? `${formId} · Edit` : 'New Calculation' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Calculator}
          title={editing ? 'Edit Calculation' : 'New Calculation'}
          subtitle="Record the inputs, method reference, assumptions and results so the verifier can review the calculation."
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/mechanical-design/design-calculations')}
            >
              Back to Calculations
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
              ClipboardList,
              'Calculation Information',
              'Title, project, discipline, type and ownership',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Calculation ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Select
                  id="calc-project"
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
                    setField('linkedId', '');
                  }}
                />
                <Select
                  id="calc-domain"
                  label="Engineering Domain"
                  options={DESIGN_DOMAINS.map((domain) => ({ value: domain.label, label: domain.label }))}
                  value={form.domain}
                  onChange={(event) => setField('domain', event.target.value)}
                />
                <Select
                  id="calc-type"
                  label="Calculation Type"
                  options={CALCULATION_TYPES.map((type) => ({ value: type, label: type }))}
                  value={form.calcType}
                  onChange={(event) => setField('calcType', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="calc-title"
                    label="Calculation Title"
                    placeholder="e.g. Input shaft torque and diameter check"
                    value={form.title}
                    hint={errors.title}
                    aria-invalid={Boolean(errors.title)}
                    onChange={(event) => setField('title', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="calc-description"
                    label="Calculation Description"
                    rows={2}
                    placeholder="What is being checked and why it matters for this design"
                    value={form.description}
                    hint={errors.description}
                    aria-invalid={Boolean(errors.description)}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'references',
              Link2,
              'Project & Component References',
              'Link the calculation to a design, part or assembly',
              <div className="form-grid">
                <Select
                  id="calc-linked-type"
                  label="Reference Type"
                  options={LINK_TYPES}
                  value={form.linkedType}
                  onChange={(event) => {
                    setField('linkedType', event.target.value);
                    setField('linkedId', '');
                  }}
                />
                <Select
                  id="calc-linked-id"
                  label="Linked Record"
                  options={[
                    { value: '', label: linkOptions.length ? 'Select a record' : 'No records for this project' },
                    ...linkOptions,
                  ]}
                  value={form.linkedId}
                  hint={errors.linkedId}
                  aria-invalid={Boolean(errors.linkedId)}
                  onChange={(event) => setField('linkedId', event.target.value)}
                />
                <div className="form-field">
                  <span className="form-label">Customer</span>
                  <span className="form-static">{project?.customer || 'Not selected'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Project Name</span>
                  <span className="form-static">{project ? projectName(projects, form.projectId) : '—'}</span>
                </div>
              </div>,
            )}

            {sectionCard(
              'inputs',
              Calculator,
              'Input Parameters',
              'Add each parameter with its value and unit',
              <>
                <div className="mech-param-table">
                  <div className="mech-param-head">
                    <span>Parameter</span>
                    <span>Value</span>
                    <span>Unit</span>
                    <span />
                  </div>
                  {inputs.map((row, index) => (
                    <div className="mech-param-row" key={row.key}>
                      <input
                        className="form-input"
                        aria-label={`Input parameter ${index + 1}`}
                        placeholder="e.g. Rated power"
                        value={row.label}
                        onChange={(event) => setRow(setInputs, index, 'label', event.target.value)}
                      />
                      <input
                        className="form-input"
                        aria-label={`Input value ${index + 1}`}
                        placeholder="e.g. 45"
                        value={row.value}
                        onChange={(event) => setRow(setInputs, index, 'value', event.target.value)}
                      />
                      <input
                        className="form-input"
                        aria-label={`Input unit ${index + 1}`}
                        placeholder="e.g. kW"
                        value={row.unit}
                        onChange={(event) => setRow(setInputs, index, 'unit', event.target.value)}
                      />
                      <button
                        type="button"
                        className="mech-icon-btn"
                        aria-label={`Remove input parameter ${index + 1}`}
                        disabled={inputs.length === 1}
                        onClick={() => setInputs((previous) => previous.filter((_, position) => position !== index))}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.inputs && <p className="mech-inline-error">{errors.inputs}</p>}
                <Button
                  variant="ghost"
                  icon={Plus}
                  onClick={() =>
                    setInputs((previous) => [...previous, blankRow('in', previous.length + 1)])
                  }
                >
                  Add Parameter
                </Button>
              </>,
            )}

            {sectionCard(
              'method',
              ShieldCheck,
              'Units, Assumptions & Method',
              'Units, assumptions and the formula or method reference',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="calc-assumptions"
                    label="Assumptions"
                    rows={3}
                    placeholder="Load cases, boundary conditions, factors and simplifications"
                    value={form.assumptions}
                    onChange={(event) => setField('assumptions', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="calc-formula"
                    label="Formula / Method Reference"
                    rows={3}
                    placeholder="e.g. T = 9550 × P / n — standard torsion formula for a solid circular shaft"
                    value={form.formulaRef}
                    hint={errors.formulaRef}
                    aria-invalid={Boolean(errors.formulaRef)}
                    onChange={(event) => setField('formulaRef', event.target.value)}
                  />
                </div>
                <Input
                  id="calc-result-units"
                  label="Result Units"
                  placeholder="e.g. N·m, mm"
                  value={form.resultUnits}
                  onChange={(event) => setField('resultUnits', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'results',
              Calculator,
              'Results',
              'Record the calculated results — this module does not compute them',
              <>
                <div className="mech-param-table">
                  <div className="mech-param-head">
                    <span>Result</span>
                    <span>Value</span>
                    <span>Unit</span>
                    <span />
                  </div>
                  {results.map((row, index) => (
                    <div className="mech-param-row" key={row.key}>
                      <input
                        className="form-input"
                        aria-label={`Result label ${index + 1}`}
                        placeholder="e.g. Design torque"
                        value={row.label}
                        onChange={(event) => setRow(setResults, index, 'label', event.target.value)}
                      />
                      <input
                        className="form-input"
                        aria-label={`Result value ${index + 1}`}
                        placeholder="e.g. 526"
                        value={row.value}
                        onChange={(event) => setRow(setResults, index, 'value', event.target.value)}
                      />
                      <input
                        className="form-input"
                        aria-label={`Result unit ${index + 1}`}
                        placeholder="e.g. N·m"
                        value={row.unit}
                        onChange={(event) => setRow(setResults, index, 'unit', event.target.value)}
                      />
                      <button
                        type="button"
                        className="mech-icon-btn"
                        aria-label={`Remove result row ${index + 1}`}
                        disabled={results.length === 1}
                        onClick={() => setResults((previous) => previous.filter((_, position) => position !== index))}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.results && <p className="mech-inline-error">{errors.results}</p>}
                <Button
                  variant="ghost"
                  icon={Plus}
                  onClick={() =>
                    setResults((previous) => [...previous, blankRow('res', previous.length + 1)])
                  }
                >
                  Add Result
                </Button>
              </>,
            )}

            {sectionCard(
              'notes',
              FileText,
              'Engineer Notes & Verification',
              'Notes, dates, revision and verification state',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="calc-notes"
                    label="Engineer Notes"
                    rows={3}
                    placeholder="Interpretation of the results, margins and follow-up actions"
                    value={form.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                  />
                </div>
                <Select
                  id="calc-prepared-by"
                  label="Prepared By"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.preparedBy}
                  hint={errors.preparedBy}
                  aria-invalid={Boolean(errors.preparedBy)}
                  onChange={(event) => setField('preparedBy', event.target.value)}
                />
                <Select
                  id="calc-verified-by"
                  label="Verified By"
                  options={[
                    { value: '', label: 'Not verified yet' },
                    ...ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
                  ]}
                  value={form.verifiedBy}
                  onChange={(event) => setField('verifiedBy', event.target.value)}
                />
                <Input
                  id="calc-date"
                  label="Calculation Date"
                  type="date"
                  value={form.calcDate}
                  onChange={(event) => setField('calcDate', event.target.value)}
                />
                <Select
                  id="calc-revision"
                  label="Revision"
                  options={REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
                <Select
                  id="calc-verification"
                  label="Verification Status"
                  options={CALC_STATUSES.map((status) => ({ value: status, label: status }))}
                  value={form.verificationStatus}
                  hint="Saving never verifies a calculation automatically."
                  onChange={(event) => setField('verificationStatus', event.target.value)}
                />
              </div>,
            )}
          </div>

          <aside className="mech-form-aside">
            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <ShieldCheck aria-hidden="true" />
                <strong>Verification</strong>
                <StatusBadge status={form.verificationStatus} tone={statusTone(form.verificationStatus)} />
              </header>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Prepared By</span>
                  <span className="mech-aside-note">{form.preparedBy || '—'}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Verified By</span>
                  <span className="mech-aside-note">{form.verifiedBy || 'Not verified yet'}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Calculation Date</span>
                  <span className="mech-aside-note">
                    {form.calcDate ? formatDate(form.calcDate) : 'Not set'}
                  </span>
                </div>
                <p className="mech-aside-note">
                  Verification decisions are recorded from the Design Calculations register so the
                  trail stays with the calculation.
                </p>
              </div>
            </section>

            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <FileText aria-hidden="true" />
                <strong>Supporting Attachments</strong>
                <span className="mech-aside-count">{attachments.length}</span>
              </header>
              <div className="mech-aside-body">
                <label className="attachment-picker">
                  <Upload aria-hidden="true" />
                  <span>Choose files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.docx,.png,.jpg,.dwg"
                    onChange={(event) => {
                      const incoming = [...(event.target.files || [])].map((file) => ({
                        name: file.name,
                        size: file.size,
                      }));
                      if (incoming.length) setAttachments((previous) => [...previous, ...incoming]);
                      event.target.value = '';
                    }}
                  />
                </label>
                {attachments.length === 0 ? (
                  <p className="mech-aside-note">
                    No attachments. Calculation sheets are referenced by name and size only.
                  </p>
                ) : (
                  <ul className="mech-aside-files">
                    {attachments.map((attachment, index) => (
                      <li key={`${attachment.name}-${index}`}>
                        <FileText aria-hidden="true" />
                        <span className="mech-aside-file-name">{attachment.name}</span>
                        <span className="mech-aside-file-size">
                          {Math.max(1, Math.round(attachment.size / 1024))} KB
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${attachment.name}`}
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
              </div>
            </section>

            <section className="mech-aside-hint">
              <Info aria-hidden="true" />
              <span>
                <strong>Recorded, not computed</strong>
                Results and units are entered by the engineer. This register does not run formulas,
                simulations or validation of engineering values.
              </span>
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => navigate('/mechanical-design/design-calculations')}
            >
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {form.verificationStatus} · Rev {form.revision}
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={() => submit(false)} icon={editing ? Save : Plus}>
              {editing ? 'Save' : 'Save Calculation'}
            </Button>
            <Button variant="secondary" icon={ArrowRight} onClick={() => submit(true)}>
              Save &amp; Continue
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
