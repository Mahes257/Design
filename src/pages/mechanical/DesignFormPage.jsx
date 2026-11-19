import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Cog,
  FileText,
  Link2,
  Paperclip,
  Plus,
  Save,
  Upload,
  Users,
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
import { useMechanical } from '../../context/MechanicalContext';
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import { usePlanning } from '../../context/PlanningContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import { customerOrDepartment } from '../../data/projectConversion';
import {
  DESIGN_DOMAINS,
  DESIGN_SPEC_DEFAULTS,
  DESIGN_SPEC_FIELDS,
  DESIGN_STATUSES,
  PRIORITIES,
  REVISIONS,
  categoriesForDomain,
  projectName,
  techFieldsForDomain,
} from '../../data/mechanicalData';

function emptyTech(domain) {
  return techFieldsForDomain(domain).reduce((accumulator, field) => {
    accumulator[field.key] = '';
    return accumulator;
  }, {});
}

function formFromDesign(design) {
  return {
    projectId: design.projectId,
    conceptId: design.conceptId || '',
    designPlanId: design.designPlanId || '',
    name: design.name,
    domain: design.domain,
    category: design.category,
    description: design.description,
    scope: design.scope,
    owner: design.owner,
    engineer: design.engineer,
    reviewer: design.reviewer,
    created: design.created,
    target: design.target,
    revision: design.revision,
    priority: design.priority,
    status: design.status,
    technicalNotes: design.technicalNotes || '',
    cadRef: design.cadRef || '',
    ...DESIGN_SPEC_FIELDS.reduce((accumulator, field) => {
      accumulator[field.key] = design[field.key] || '';
      return accumulator;
    }, {}),
  };
}

function initialForm(projectId, domain, conceptId, planId) {
  return {
    projectId: projectId || '',
    conceptId: conceptId || '',
    designPlanId: planId || '',
    ...DESIGN_SPEC_DEFAULTS,
    name: '',
    domain,
    category: categoriesForDomain(domain)[0],
    description: '',
    scope: '',
    owner: 'R. Kulkarni',
    engineer: 'D. Rao',
    reviewer: 'N. Joshi',
    created: TODAY,
    target: '',
    revision: 'A',
    priority: 'Medium',
    status: 'Draft',
    technicalNotes: '',
    cadRef: '',
  };
}

function formatSize(bytes) {
  const kb = Math.max(1, Math.round(bytes / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/**
 * New / Edit Design Item — full-page creation form with domain-adaptive
 * technical fields, linked part/assembly selection and a supporting panel.
 */
export default function DesignFormPage() {
  const { designId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { designs, parts, assemblies, addDesign, updateDesign, nextDesignId } = useMechanical();
  const { concepts, comparisons } = useConcept();
  const { projects } = useProjects();
  const { plans } = usePlanning();

  const editing = useMemo(
    () => (designId ? designs.find((design) => design.id === designId) : null),
    [designId, designs],
  );

  const requestedDomain = searchParams.get('domain');
  const defaultDomain = DESIGN_DOMAINS.some((entry) => entry.label === requestedDomain)
    ? requestedDomain
    : 'Machine Design';
  const requestedProjectId = searchParams.get('projectId');
  const requestedConceptId = searchParams.get('conceptId');
  const initialProjectId = projects.some((row) => row.id === requestedProjectId)
    ? requestedProjectId
    : projects[0]?.id;
  const requestedConcept = concepts.find(
    (concept) => concept.id === requestedConceptId && concept.projectId === initialProjectId,
  );
  const initialConceptId =
    requestedConcept?.id ||
    comparisons.find((comparison) => comparison.projectId === initialProjectId)
      ?.selectedConceptId ||
    '';

  const [formId, setFormId] = useState(() => (editing ? editing.id : nextDesignId()));
  const [domain, setDomain] = useState(editing?.domain || defaultDomain);
  const [form, setForm] = useState(() =>
    editing
      ? formFromDesign({
          ...editing,
          conceptId:
            editing.conceptId ??
            comparisons.find((comparison) => comparison.projectId === editing.projectId)
              ?.selectedConceptId ??
            '',
        })
      : initialForm(
          initialProjectId,
          defaultDomain,
          initialConceptId,
          plans.find((plan) => plan.projectId === initialProjectId)?.id || '',
        ),
  );
  const [tech, setTech] = useState(() =>
    editing ? { ...emptyTech(editing.domain), ...(editing.tech || {}) } : emptyTech('Machine Design'),
  );
  const [linkedPartIds, setLinkedPartIds] = useState(() => editing?.linkedPartIds || []);
  const [linkedAssemblyIds, setLinkedAssemblyIds] = useState(() => editing?.linkedAssemblyIds || []);
  const [documents, setDocuments] = useState(() => editing?.documents || []);
  const [openSections, setOpenSections] = useState({
    info: true,
    ownership: true,
    scope: true,
    requirements: true,
    technical: true,
    links: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  if (designId && !editing) {
    return <Navigate to="/mechanical-design/design-register" replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const projectPlan =
    plans.find((plan) => plan.id === form.designPlanId) ||
    plans.find((plan) => plan.projectId === form.projectId);
  const fields = techFieldsForDomain(domain);
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const setTechField = (key, value) => setTech((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const changeDomain = (nextDomain) => {
    setDomain(nextDomain);
    setForm((previous) => ({
      ...previous,
      domain: nextDomain,
      category: categoriesForDomain(nextDomain)[0],
    }));
    setTech(emptyTech(nextDomain));
  };

  const validate = (forSave) => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project this design belongs to.';
    if (!form.name.trim()) next.name = 'A design name is required.';
    if (!form.owner) next.owner = 'Select the design owner.';
    if (!form.engineer) next.engineer = 'Select the assigned engineer.';
    if (forSave && !form.target) next.target = 'A target date is required.';
    if (forSave && form.target && form.target < form.created)
      next.target = 'Target date cannot be earlier than the created date.';
    if (forSave && !form.description.trim())
      next.description = 'Describe the design so it can be reviewed.';
    if (forSave && !form.scope.trim()) next.scope = 'State what this design covers.';
    return next;
  };

  const buildRecord = (status) => ({
    id: formId,
    name: form.name.trim(),
    projectId: form.projectId,
    conceptId: form.conceptId || '',
    domain,
    category: form.category,
    description: form.description.trim(),
    scope: form.scope.trim(),
    owner: form.owner,
    engineer: form.engineer,
    reviewer: form.reviewer,
    created: form.created,
    target: form.target,
    revision: form.revision,
    priority: form.priority,
    status,
    technicalNotes: form.technicalNotes.trim(),
    designPlanId: form.designPlanId || projectPlan?.id || '',
    ...DESIGN_SPEC_FIELDS.reduce((accumulator, field) => {
      accumulator[field.key] = String(form[field.key] || '').trim();
      return accumulator;
    }, {}),
    updatedAt: TODAY,
    linkedPartIds,
    linkedAssemblyIds,
    cadRef: form.cadRef.trim(),
    tech,
    documents,
  });

  const revisionEntry = (revision, note) => ({
    revision,
    date: TODAY,
    by: form.owner,
    note,
  });

  const persist = (status) => {
    if (editing) {
      const revisionChanged = form.revision !== editing.revision;
      const patch = buildRecord(status);
      updateDesign(formId, {
        ...patch,
        revisions: revisionChanged
          ? [...(editing.revisions || []), revisionEntry(form.revision, `Revision ${form.revision} saved.`)]
          : editing.revisions,
      }, {
        label: revisionChanged ? `Revision ${form.revision} saved` : 'Design updated',
        detail: revisionChanged
          ? `Revision ${form.revision} saved from the design form`
          : 'Design details updated',
      });
      return formId;
    }

    addDesign({
      ...buildRecord(status),
      revisions: [revisionEntry(form.revision, 'Initial design record created.')],
      activity: [],
    });
    return formId;
  };

  const saveDraft = () => {
    const next = validate(false);
    setErrors(next);
    if (!form.projectId || !form.name.trim()) {
      setBanner({
        tone: 'error',
        message: 'Add a project and design name before saving the draft.',
      });
      return;
    }
    const id = persist('Draft');
    if (!editing) {
      navigate(`/mechanical-design/design-register/${id}/edit`, { replace: true });
      setBanner({ tone: 'success', message: `Draft ${id} saved. Continue editing or save it to the register.` });
      return;
    }
    setBanner({ tone: 'success', message: `Draft changes saved for ${id}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (continueAfter) => {
    const next = validate(true);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({ info: true, ownership: true, scope: true, requirements: true, technical: true, links: true });
      setBanner({ tone: 'error', message: 'Complete the required design fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const status = form.status === 'Draft' ? 'In Design' : form.status;
    const id = persist(status);
    navigate(
      continueAfter
        ? `/mechanical-design/design-register/${id}`
        : '/mechanical-design/design-register',
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

  const linkedParts = parts.filter((part) => linkedPartIds.includes(part.id));
  const linkedAssemblies = assemblies.filter((assembly) => linkedAssemblyIds.includes(assembly.id));

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Mechanical Engineering Design', to: '/mechanical-design' },
            { label: 'Design Register', to: '/mechanical-design/design-register' },
            { label: editing ? `${formId} · Edit` : 'New Design Item' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Cog}
          title={editing ? 'Edit Design Item' : 'New Design Item'}
          subtitle={
            editing
              ? `Update ${formId} for ${project?.name || form.projectId}.`
              : 'Register a mechanical design record; the technical fields adapt to the selected engineering domain.'
          }
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/mechanical-design/design-register')}
            >
              Back to Design Register
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
              'Design Information',
              'Identification, project, domain and classification',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Design ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Select
                  id="design-project"
                  label="Project"
                  options={[
                    { value: '', label: 'Select a project' },
                    ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.projectId}
                  hint={errors.projectId}
                  aria-invalid={Boolean(errors.projectId)}
                  onChange={(event) => {
                    const nextProjectId = event.target.value;
                    const nextConceptId =
                      comparisons.find((comparison) => comparison.projectId === nextProjectId)
                        ?.selectedConceptId || '';
                    setForm((previous) => ({
                      ...previous,
                      projectId: nextProjectId,
                      conceptId: nextConceptId,
                      designPlanId:
                        plans.find((plan) => plan.projectId === nextProjectId)?.id || '',
                    }));
                    setLinkedPartIds([]);
                    setLinkedAssemblyIds([]);
                  }}
                />
                <div className="form-field">
                  <span className="form-label">Project Name</span>
                  <span className="form-static">
                    {project ? projectName(projects, form.projectId) : 'Not selected'}
                  </span>
                </div>
                <div className="form-field">
                  <span className="form-label">Source Request ID</span>
                  <span className="form-static">{project?.sourceRequestId || 'Manual project'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Design Plan ID</span>
                  <span className="form-static">{projectPlan?.id || 'No design plan'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Product</span>
                  <span className="form-static">{project?.product || 'Not captured'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Customer / Department</span>
                  <span className="form-static">{customerOrDepartment(project)}</span>
                </div>
                <Select
                  id="design-concept"
                  label="Selected Concept"
                  options={[
                    {
                      value: '',
                      label: concepts.some((concept) => concept.projectId === form.projectId)
                        ? 'No concept linked'
                        : 'No concepts for this project',
                    },
                    ...concepts
                      .filter((concept) => concept.projectId === form.projectId)
                      .map((concept) => ({
                        value: concept.id,
                        label: `${concept.id} · ${concept.name}`,
                      })),
                  ]}
                  value={form.conceptId || ''}
                  hint="Links this design to a concept selected in Conceptual Design."
                  onChange={(event) => setField('conceptId', event.target.value)}
                />
                <Select
                  id="design-domain"
                  label="Engineering Domain"
                  options={DESIGN_DOMAINS.map((row) => ({ value: row.label, label: row.label }))}
                  value={domain}
                  onChange={(event) => changeDomain(event.target.value)}
                />
                <Select
                  id="design-category"
                  label="Design Category"
                  options={categoriesForDomain(domain).map((category) => ({
                    value: category,
                    label: category,
                  }))}
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="design-name"
                    label="Design Name"
                    placeholder="e.g. Conveyor drive gear train"
                    value={form.name}
                    hint={errors.name}
                    aria-invalid={Boolean(errors.name)}
                    onChange={(event) => setField('name', event.target.value)}
                  />
                </div>
                <Select
                  id="design-priority"
                  label="Priority"
                  options={PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
                  value={form.priority}
                  onChange={(event) => setField('priority', event.target.value)}
                />
                <Select
                  id="design-status"
                  label="Design Status"
                  options={DESIGN_STATUSES.map((status) => ({ value: status, label: status }))}
                  value={form.status}
                  onChange={(event) => setField('status', event.target.value)}
                />
                <Select
                  id="design-revision"
                  label="Revision"
                  options={REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'ownership',
              Users,
              'Ownership & Schedule',
              'Design owner, assigned engineer, reviewer and dates',
              <div className="form-grid">
                <Select
                  id="design-owner"
                  label="Design Owner"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.owner}
                  hint={errors.owner}
                  aria-invalid={Boolean(errors.owner)}
                  onChange={(event) => setField('owner', event.target.value)}
                />
                <Select
                  id="design-engineer"
                  label="Assigned Engineer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.engineer}
                  hint={errors.engineer}
                  aria-invalid={Boolean(errors.engineer)}
                  onChange={(event) => setField('engineer', event.target.value)}
                />
                <Select
                  id="design-reviewer"
                  label="Technical Reviewer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.reviewer}
                  onChange={(event) => setField('reviewer', event.target.value)}
                />
                <Input
                  id="design-created"
                  label="Created Date"
                  type="date"
                  value={form.created}
                  onChange={(event) => setField('created', event.target.value)}
                />
                <Input
                  id="design-target"
                  label="Target Date"
                  type="date"
                  value={form.target}
                  hint={errors.target}
                  aria-invalid={Boolean(errors.target)}
                  onChange={(event) => setField('target', event.target.value)}
                />
                <div className="form-field">
                  <span className="form-label">Created On</span>
                  <span className="form-static">
                    {form.created ? formatDate(form.created) : 'Not set'}
                  </span>
                </div>
              </div>,
            )}

            {sectionCard(
              'scope',
              FileText,
              'Description & Scope',
              'What the design is, what it covers and the technical notes',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="design-description"
                    label="Description"
                    rows={3}
                    placeholder="The design intent, working principle and the problem it solves"
                    value={form.description}
                    hint={errors.description}
                    aria-invalid={Boolean(errors.description)}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="design-scope"
                    label="Design Scope"
                    rows={3}
                    placeholder="Included work, deliverables and what is explicitly excluded"
                    value={form.scope}
                    hint={errors.scope}
                    aria-invalid={Boolean(errors.scope)}
                    onChange={(event) => setField('scope', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="design-notes"
                    label="Technical Notes"
                    rows={3}
                    placeholder="Materials, standards, calculations and review notes"
                    value={form.technicalNotes}
                    onChange={(event) => setField('technicalNotes', event.target.value)}
                  />
                </div>
              </div>,
            )}

            {sectionCard(
              'requirements',
              ClipboardList,
              'Design Specification',
              'Objectives, parameters, limits and engineering assumptions captured for validation',
              <div className="form-grid">
                {DESIGN_SPEC_FIELDS.map((field) => (
                  <div className="form-grid-full" key={field.key}>
                    <Textarea
                      id={`design-${field.key}`}
                      label={field.label}
                      rows={2}
                      value={form[field.key] || ''}
                      onChange={(event) => setField(field.key, event.target.value)}
                    />
                  </div>
                ))}
                <p className="form-note form-grid-full">
                  These fields are recorded as engineering input. Nothing on this page is
                  calculated or verified automatically — validation happens in Engineering
                  Analysis.
                </p>
              </div>,
            )}

            {sectionCard(
              'technical',
              Cog,
              `${domain} Technical Fields`,
              'Fields change with the engineering domain selected above',
              <div className="form-grid">{fields.map((field) => renderTechField(field))}</div>,
            )}

            {sectionCard(
              'links',
              Link2,
              'Linked Records & CAD Reference',
              'Connect parts, assemblies and the CAD reference held in Drawing & CAD Management',
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="design-linked-parts">
                    Linked Part IDs
                  </label>
                  <select
                    id="design-linked-parts"
                    className="form-select mech-multi"
                    multiple
                    size={5}
                    value={linkedPartIds}
                    onChange={(event) =>
                      setLinkedPartIds([...event.target.selectedOptions].map((option) => option.value))
                    }
                  >
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.partNumber} · {part.name}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">Ctrl/Cmd-click to select multiple parts.</span>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="design-linked-assemblies">
                    Linked Assembly IDs
                  </label>
                  <select
                    id="design-linked-assemblies"
                    className="form-select mech-multi"
                    multiple
                    size={5}
                    value={linkedAssemblyIds}
                    onChange={(event) =>
                      setLinkedAssemblyIds(
                        [...event.target.selectedOptions].map((option) => option.value),
                      )
                    }
                  >
                    {assemblies.map((assembly) => (
                      <option key={assembly.id} value={assembly.id}>
                        {assembly.number} · {assembly.name}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">Ctrl/Cmd-click to select multiple assemblies.</span>
                </div>
                <div className="form-grid-full">
                  <Input
                    id="design-cad-ref"
                    label="CAD Reference (reference only)"
                    placeholder="e.g. CAD-041-014"
                    value={form.cadRef}
                    hint="CAD files live in Drawing & CAD Management — this module stores the reference only."
                    onChange={(event) => setField('cadRef', event.target.value)}
                  />
                </div>
              </div>,
            )}
          </div>

          <aside className="mech-form-aside">
            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <Paperclip aria-hidden="true" />
                <strong>Design Documents</strong>
                <span className="mech-aside-count">{documents.length}</span>
              </header>
              <div className="mech-aside-body">
                <label className="attachment-picker">
                  <Upload aria-hidden="true" />
                  <span>Choose files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.dwg,.dxf,.step,.stp,.xlsx,.docx,.png,.jpg,.jpeg"
                    onChange={(event) => {
                      const incoming = [...(event.target.files || [])].map((file) => ({
                        name: file.name,
                        size: file.size,
                      }));
                      if (incoming.length) setDocuments((previous) => [...previous, ...incoming]);
                      event.target.value = '';
                    }}
                  />
                </label>
                {documents.length === 0 ? (
                  <p className="mech-aside-note">
                    No documents attached. File names and sizes are recorded locally — nothing is
                    uploaded.
                  </p>
                ) : (
                  <ul className="mech-aside-files">
                    {documents.map((document, index) => (
                      <li key={`${document.name}-${index}`}>
                        <FileText aria-hidden="true" />
                        <span className="mech-aside-file-name">{document.name}</span>
                        <span className="mech-aside-file-size">{formatSize(document.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${document.name}`}
                          onClick={() =>
                            setDocuments((previous) =>
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

            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <Link2 aria-hidden="true" />
                <strong>Linked Records</strong>
              </header>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Selected Concept</span>
                  <span className="mech-aside-note">
                    {form.conceptId
                      ? `${form.conceptId} · ${
                          concepts.find((concept) => concept.id === form.conceptId)?.name || 'Concept'
                        }`
                      : 'No concept linked'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Parts ({linkedParts.length})</span>
                  {linkedParts.length === 0 ? (
                    <span className="mech-aside-note">No parts linked.</span>
                  ) : (
                    <ul className="mech-aside-list">
                      {linkedParts.map((part) => (
                        <li key={part.id}>
                          <span className="cell-id">{part.partNumber}</span>
                          {part.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Assemblies ({linkedAssemblies.length})</span>
                  {linkedAssemblies.length === 0 ? (
                    <span className="mech-aside-note">No assemblies linked.</span>
                  ) : (
                    <ul className="mech-aside-list">
                      {linkedAssemblies.map((assembly) => (
                        <li key={assembly.id}>
                          <span className="cell-id">{assembly.number}</span>
                          {assembly.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">CAD Reference</span>
                  <span className="mech-aside-note">{form.cadRef || 'Not set'}</span>
                </div>
              </div>
            </section>

            <section className="mech-aside-hint">
              <strong>Domain fields</strong>
              The technical section shows only the fields that apply to {domain}. Switch the domain
              to see the relevant set.
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => navigate('/mechanical-design/design-register')}
            >
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {form.status} · stored locally in this browser
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={() => submit(false)} icon={editing ? Save : Plus}>
              {editing ? 'Save' : 'Save Design'}
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
