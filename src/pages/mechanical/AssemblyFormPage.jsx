import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Layers,
  Upload,
  Package,
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
  StatusBadge,
  Textarea,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  ASSEMBLY_STATUSES,
  DESIGN_DOMAINS,
  REVISIONS,
  assemblyParts,
  assemblyPath,
  assemblyTreePartCount,
  projectName,
  statusTone,
  wouldCreateCycle,
} from '../../data/mechanicalData';

function initialForm(projectId, parentAssemblyId) {
  return {
    number: '',
    name: '',
    projectId: projectId || '',
    designId: '',
    domain: 'Machine Design',
    parentAssemblyId: parentAssemblyId || '',
    description: '',
    revision: 'A',
    owner: 'R. Kulkarni',
    status: 'Draft',
    notes: '',
  };
}

/**
 * New / Edit Assembly — full-page form with parent selection that prevents
 * circular assembly relationships.
 */
export default function AssemblyFormPage() {
  const { assemblyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { assemblies, parts, designs, addAssembly, updateAssembly, nextAssemblyId } = useMechanical();
  const { projects } = useProjects();

  const editing = useMemo(
    () => (assemblyId ? assemblies.find((assembly) => assembly.id === assemblyId) : null),
    [assemblyId, assemblies],
  );

  const [formId, setFormId] = useState(() => (editing ? editing.id : nextAssemblyId()));
  const [form, setForm] = useState(() => {
    if (editing) {
      return {
        number: editing.number,
        name: editing.name,
        projectId: editing.projectId,
        designId: editing.designId || '',
        domain: editing.domain,
        parentAssemblyId: editing.parentAssemblyId || '',
        description: editing.description,
        revision: editing.revision,
        owner: editing.owner,
        status: editing.status,
        notes: editing.notes,
      };
    }
    const parent = searchParams.get('parent') || '';
    const parentAssembly = assemblies.find((row) => row.id === parent);
    return initialForm(parentAssembly?.projectId || projects[0]?.id, parent);
  });
  const [attachments, setAttachments] = useState(() => editing?.attachments || []);
  const [openSections, setOpenSections] = useState({ info: true, content: true });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  if (assemblyId && !editing) {
    return <Navigate to="/mechanical-design/parts-assemblies" replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const parent = assemblies.find((row) => row.id === form.parentAssemblyId);
  const directParts = editing ? assemblyParts(parts, editing.id) : [];
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const parentOptions = assemblies.filter(
    (assembly) => assembly.id !== formId && !wouldCreateCycle(assemblies, formId, assembly.id),
  );

  const validate = (forSave) => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project this assembly belongs to.';
    if (!form.number.trim()) next.number = 'An assembly number is required.';
    if (!form.name.trim()) next.name = 'An assembly name is required.';
    if (!form.owner) next.owner = 'Select the assembly owner.';
    if (form.parentAssemblyId && wouldCreateCycle(assemblies, formId, form.parentAssemblyId)) {
      next.parentAssemblyId = 'This parent would create a circular assembly relationship.';
    }
    if (forSave && !form.description.trim())
      next.description = 'Describe what the assembly contains.';
    return next;
  };

  const buildRecord = (status) => ({
    id: formId,
    number: form.number.trim(),
    name: form.name.trim(),
    projectId: form.projectId,
    designId: form.designId || '',
    domain: form.domain,
    parentAssemblyId: form.parentAssemblyId,
    description: form.description.trim(),
    revision: form.revision,
    owner: form.owner,
    status,
    notes: form.notes.trim(),
    attachments,
  });

  const persist = (status) => {
    if (editing) {
      const revisionChanged = form.revision !== editing.revision;
      updateAssembly(formId, {
        ...buildRecord(status),
        revisions: revisionChanged
          ? [
              ...(editing.revisions || []),
              { revision: form.revision, date: TODAY, by: form.owner, note: `Revision ${form.revision} saved.` },
            ]
          : editing.revisions,
      });
    } else {
      addAssembly({
        ...buildRecord(status),
        revisions: [
          { revision: form.revision, date: TODAY, by: form.owner, note: 'Initial assembly record created.' },
        ],
      });
    }
    return formId;
  };

  const saveDraft = () => {
    const next = validate(false);
    setErrors(next);
    if (!form.projectId || !form.number.trim() || !form.name.trim()) {
      setBanner({ tone: 'error', message: 'Add a project, assembly number and name before saving the draft.' });
      return;
    }
    const id = persist('Draft');
    if (!editing) {
      navigate(`/mechanical-design/parts-assemblies/assemblies/${id}/edit`, { replace: true });
      setBanner({ tone: 'success', message: `Draft ${id} saved. Add components from the assembly structure.` });
      return;
    }
    setBanner({ tone: 'success', message: `Draft changes saved for ${id}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (continueAfter) => {
    const next = validate(true);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({ info: true, content: true });
      setBanner({ tone: 'error', message: 'Complete the required assembly fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const status = form.status === 'Draft' ? 'In Design' : form.status;
    persist(status);
    navigate(
      continueAfter
        ? '/mechanical-design/parts-assemblies?view=structure'
        : '/mechanical-design/parts-assemblies',
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
            { label: 'Parts & Assemblies', to: '/mechanical-design/parts-assemblies' },
            { label: editing ? `${formId} · Edit` : 'New Assembly' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Layers}
          title={editing ? 'Edit Assembly' : 'New Assembly'}
          subtitle={
            editing
              ? `Update ${formId} · ${form.number}`
              : 'Create an assembly or subassembly; components are assigned from the assembly structure.'
          }
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() => navigate('/mechanical-design/parts-assemblies')}
            >
              Back to Parts &amp; Assemblies
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
              'Assembly Information',
              'Identification, project, discipline and parent assembly',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Assembly ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Input
                  id="assembly-number"
                  label="Assembly Number"
                  placeholder="e.g. ASM-041-110"
                  value={form.number}
                  hint={errors.number}
                  aria-invalid={Boolean(errors.number)}
                  onChange={(event) => setField('number', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="assembly-name"
                    label="Assembly Name"
                    placeholder="e.g. Drive assembly"
                    value={form.name}
                    hint={errors.name}
                    aria-invalid={Boolean(errors.name)}
                    onChange={(event) => setField('name', event.target.value)}
                  />
                </div>
                <Select
                  id="assembly-project"
                  label="Project"
                  options={[
                    { value: '', label: 'Select a project' },
                    ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
                  ]}
                  value={form.projectId}
                  hint={errors.projectId}
                  aria-invalid={Boolean(errors.projectId)}
                  onChange={(event) => setField('projectId', event.target.value)}
                />
                <Select
                  id="assembly-domain"
                  label="Engineering Domain"
                  options={DESIGN_DOMAINS.map((domain) => ({ value: domain.label, label: domain.label }))}
                  value={form.domain}
                  onChange={(event) => setField('domain', event.target.value)}
                />
                <Select
                  id="assembly-parent"
                  label="Parent Assembly"
                  options={[
                    { value: '', label: 'Top-level assembly' },
                    ...parentOptions.map((assembly) => ({
                      value: assembly.id,
                      label: `${assembly.number} · ${assembly.name}`,
                    })),
                  ]}
                  value={form.parentAssemblyId}
                  hint={
                    errors.parentAssemblyId ||
                    'Subassemblies are excluded from the list to prevent circular structures.'
                  }
                  aria-invalid={Boolean(errors.parentAssemblyId)}
                  onChange={(event) => setField('parentAssemblyId', event.target.value)}
                />
                <Select
                  id="assembly-design"
                  label="Design Reference"
                  options={[
                    { value: '', label: 'Not linked' },
                    ...designs.map((design) => ({
                      value: design.id,
                      label: `${design.id} · ${design.name}`,
                    })),
                  ]}
                  value={form.designId}
                  hint="Links this assembly to the mechanical design it belongs to."
                  onChange={(event) => setField('designId', event.target.value)}
                />
                <Select
                  id="assembly-owner"
                  label="Owner"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.owner}
                  hint={errors.owner}
                  aria-invalid={Boolean(errors.owner)}
                  onChange={(event) => setField('owner', event.target.value)}
                />
                <Select
                  id="assembly-status"
                  label="Status"
                  options={ASSEMBLY_STATUSES.map((status) => ({ value: status, label: status }))}
                  value={form.status}
                  onChange={(event) => setField('status', event.target.value)}
                />
                <Select
                  id="assembly-revision"
                  label="Revision"
                  options={REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'content',
              FileText,
              'Assembly Description',
              'What the assembly contains and any technical notes',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="assembly-description"
                    label="Assembly Description"
                    rows={3}
                    placeholder="Main components, function and how the assembly is put together"
                    value={form.description}
                    hint={errors.description}
                    aria-invalid={Boolean(errors.description)}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="assembly-notes"
                    label="Technical Notes"
                    rows={3}
                    placeholder="Tolerances, interface notes and open items"
                    value={form.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <label className="attachment-picker">
                    <Upload aria-hidden="true" />
                    <span>Attach Supporting Files</span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        const files = [...event.target.files].map((file) => ({
                          name: file.name,
                          size: file.size,
                          type: file.type || 'file',
                        }));
                        setAttachments((previous) => [...previous, ...files]);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {attachments.length > 0 ? (
                    <ul className="mech-aside-list">
                      {attachments.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                          <span className="cell-id">{file.name}</span>
                          <span className="cell-muted">
                            {Math.max(1, Math.round((file.size || 0) / 1024))} KB
                          </span>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() =>
                              setAttachments((previous) =>
                                previous.filter((entry, position) => position !== index),
                              )
                            }
                          >
                            <X aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="form-hint">No supporting files attached.</p>
                  )}
                </div>
              </div>,
            )}
          </div>

          <aside className="mech-form-aside">
            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <Layers aria-hidden="true" />
                <strong>Assembly Context</strong>
              </header>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Project</span>
                  <span className="mech-aside-note">
                    {project ? `${project.id} · ${projectName(projects, form.projectId)}` : 'Not selected'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Structure path</span>
                  <span className="mech-aside-note">
                    {parent
                      ? [...assemblyPath(assemblies, parent.id).map((node) => node.name), form.name || 'This assembly'].join(' → ')
                      : form.name || 'Top-level assembly'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Components in tree</span>
                  <span className="mech-aside-note">
                    {editing ? assemblyTreePartCount(assemblies, parts, editing.id) : 0}
                  </span>
                </div>
              </div>
            </section>

            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <Package aria-hidden="true" />
                <strong>Direct Components</strong>
                <span className="mech-aside-count">{directParts.length}</span>
              </header>
              <div className="mech-aside-body">
                {directParts.length === 0 ? (
                  <p className="mech-aside-note">
                    {editing
                      ? 'No parts assigned yet. Add existing parts from the Assembly Structure tab.'
                      : 'Save the assembly first, then add parts from the Assembly Structure tab.'}
                  </p>
                ) : (
                  <ul className="mech-aside-list">
                    {directParts.map((part) => (
                      <li key={part.id}>
                        <span className="cell-id">{part.partNumber}</span>
                        {part.name}
                        <span className="cell-muted"> × {part.quantity}</span>
                        <StatusBadge status={part.status} tone={statusTone(part.status)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="mech-aside-hint">
              <strong>Hierarchy rule</strong>
              An assembly cannot become a child of itself or of one of its own subassemblies. Parent
              options already exclude those records.
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => navigate('/mechanical-design/parts-assemblies')}
            >
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {form.status} · created {formatDate(TODAY)}
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={() => submit(false)} icon={editing ? Save : Plus}>
              {editing ? 'Save' : 'Save Assembly'}
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
