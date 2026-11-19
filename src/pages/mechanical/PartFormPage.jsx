import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
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
  Textarea,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  DESIGN_DOMAINS,
  MATERIALS,
  PART_CATEGORIES,
  PART_STATUSES,
  REVISIONS,
  UOM_OPTIONS,
  assemblyPath,
  domainForLabel,
  isPartNumberUnique,
  projectName,
} from '../../data/mechanicalData';

function initialForm(projectId) {
  return {
    partNumber: '',
    name: '',
    projectId: projectId || '',
    designId: '',
    description: '',
    domain: 'Machine Design',
    category: 'Machined part',
    parentAssemblyId: '',
    material: 'IS 2062 E250 BR',
    materialGrade: '',
    dimensions: '',
    length: '',
    width: '',
    height: '',
    diameter: '',
    thickness: '',
    weight: '',
    uom: 'nos',
    quantity: '1',
    revision: 'A',
    owner: 'R. Kulkarni',
    status: 'Draft',
    notes: '',
    cadRef: '',
  };
}

/**
 * New / Edit Part — full-page creation form shared by every engineering domain.
 */
export default function PartFormPage() {
  const { partId } = useParams();
  const navigate = useNavigate();
  const { parts, assemblies, designs, addPart, updatePart, nextPartId } = useMechanical();
  const { projects } = useProjects();

  const editing = useMemo(
    () => (partId ? parts.find((part) => part.id === partId) : null),
    [partId, parts],
  );

  const [formId, setFormId] = useState(() => (editing ? editing.id : nextPartId()));
  const [form, setForm] = useState(() =>
    editing
      ? {
          partNumber: editing.partNumber,
          name: editing.name,
          projectId: editing.projectId,
          designId: editing.designId || '',
          description: editing.description || '',
          domain: editing.domain,
          category: editing.category,
          parentAssemblyId: editing.parentAssemblyId || '',
          material: editing.material,
          materialGrade: editing.materialGrade,
          dimensions: editing.dimensions,
          length: String(editing.length || ''),
          width: String(editing.width || ''),
          height: String(editing.height || ''),
          diameter: String(editing.diameter || ''),
          thickness: String(editing.thickness || ''),
          weight: String(editing.weight || ''),
          uom: editing.uom,
          quantity: String(editing.quantity),
          revision: editing.revision,
          owner: editing.owner,
          status: editing.status,
          notes: editing.notes,
          cadRef: editing.cadRef,
        }
      : initialForm(projects[0]?.id),
  );
  const [documents, setDocuments] = useState(() => editing?.documents || []);
  const [openSections, setOpenSections] = useState({ info: true, material: true, ownership: true, notes: true });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  if (partId && !editing) {
    return <Navigate to="/mechanical-design/parts-assemblies" replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const parent = assemblies.find((assembly) => assembly.id === form.parentAssemblyId);
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const buildCase = (value) => String(value || '').trim();

  const validate = (forSave) => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project this part belongs to.';
    if (!form.name.trim()) next.name = 'A part name is required.';
    if (!buildCase(form.partNumber)) next.partNumber = 'A part number is required.';
    if (buildCase(form.partNumber) && !isPartNumberUnique(parts, form.partNumber, formId)) {
      next.partNumber = 'Part numbers must be unique across the shared part register.';
    }
    if (!form.owner) next.owner = 'Select the design owner.';
    if (forSave && !form.material) next.material = 'Select the material.';
    if (forSave && Number(form.quantity) < 1) next.quantity = 'Quantity must be at least 1.';
    return next;
  };

  const dimensionSummary = () => {
    if (form.dimensions.trim()) return form.dimensions.trim();
    const values = [form.length, form.width, form.height, form.thickness]
      .map((value) => Number(value) || 0)
      .filter((value) => value > 0);
    const diameter = Number(form.diameter) || 0;
    const parts = diameter > 0 ? [`Ø${diameter}`, ...values] : values;
    return parts.length ? `${parts.join(' × ')} mm` : '';
  };

  const buildRecord = (status) => ({
    id: formId,
    partNumber: form.partNumber.trim(),
    name: form.name.trim(),
    projectId: form.projectId,
    designId: form.designId || '',
    description: form.description.trim(),
    domain: form.domain,
    category: form.category,
    parentAssemblyId: form.parentAssemblyId,
    material: form.material,
    materialGrade: form.materialGrade.trim() || form.material,
    dimensions: dimensionSummary(),
    length: Number(form.length) || 0,
    width: Number(form.width) || 0,
    height: Number(form.height) || 0,
    diameter: Number(form.diameter) || 0,
    thickness: Number(form.thickness) || 0,
    weight: Number(form.weight) || 0,
    uom: form.uom,
    quantity: Math.max(1, Number(form.quantity) || 1),
    revision: form.revision,
    owner: form.owner,
    status,
    notes: form.notes.trim(),
    cadRef: form.cadRef.trim(),
    documents,
  });

  const persist = (status) => {
    if (editing) {
      const revisionChanged = form.revision !== editing.revision;
      updatePart(formId, {
        ...buildRecord(status),
        revisions: revisionChanged || !editing.revisions?.length
          ? [
              ...(editing.revisions || []),
              { revision: form.revision, date: TODAY, by: form.owner, note: `Revision ${form.revision} saved.` },
            ]
          : editing.revisions,
      });
    } else {
      addPart({
        ...buildRecord(status),
        revisions: [{ revision: form.revision, date: TODAY, by: form.owner, note: 'Initial part record created.' }],
      });
    }
    return formId;
  };

  const saveDraft = () => {
    const next = validate(false);
    setErrors(next);
    if (!form.projectId || !form.name.trim() || !form.partNumber.trim()) {
      setBanner({ tone: 'error', message: 'Add a project, part number and part name before saving the draft.' });
      return;
    }
    if (!isPartNumberUnique(parts, form.partNumber, formId)) {
      setBanner({
        tone: 'error',
        message: `Part number ${form.partNumber.trim()} is already used in the shared register.`,
      });
      return;
    }
    const id = persist('Draft');
    if (!editing) {
      navigate(`/mechanical-design/parts-assemblies/parts/${id}/edit`, { replace: true });
      setBanner({ tone: 'success', message: `Draft ${id} saved. Complete the part, then save it to the register.` });
      return;
    }
    setBanner({ tone: 'success', message: `Draft changes saved for ${id}.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (continueAfter) => {
    const next = validate(true);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({ info: true, material: true, ownership: true, notes: true });
      setBanner({ tone: 'error', message: 'Complete the required part fields before saving.' });
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
            { label: editing ? `${formId} · Edit` : 'New Part' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Package}
          title={editing ? 'Edit Part' : 'New Part'}
          subtitle={
            editing
              ? `Update ${formId} · ${form.partNumber}`
              : 'Create a part record in the shared register used by every engineering discipline.'
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
              'Part Identification',
              'Part number, project, discipline and assembly assignment',
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Part ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Input
                  id="part-number"
                  label="Part Number"
                  placeholder="e.g. MEC-041-002"
                  value={form.partNumber}
                  hint={errors.partNumber}
                  aria-invalid={Boolean(errors.partNumber)}
                  onChange={(event) => setField('partNumber', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="part-name"
                    label="Part Name"
                    placeholder="e.g. Input shaft"
                    value={form.name}
                    hint={errors.name}
                    aria-invalid={Boolean(errors.name)}
                    onChange={(event) => setField('name', event.target.value)}
                  />
                </div>
                <Select
                  id="part-project"
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
                  id="part-domain"
                  label="Engineering Domain"
                  options={DESIGN_DOMAINS.map((domain) => ({ value: domain.label, label: domain.label }))}
                  value={form.domain}
                  onChange={(event) => setField('domain', event.target.value)}
                />
                <Select
                  id="part-category"
                  label="Part Category"
                  options={PART_CATEGORIES.map((category) => ({ value: category, label: category }))}
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                />
                <Select
                  id="part-assembly"
                  label="Parent Assembly"
                  options={[
                    { value: '', label: 'Not assigned' },
                    ...assemblies.map((assembly) => ({
                      value: assembly.id,
                      label: `${assembly.number} · ${assembly.name}`,
                    })),
                  ]}
                  value={form.parentAssemblyId}
                  hint="Assigning a part here also places it in the assembly structure."
                  onChange={(event) => setField('parentAssemblyId', event.target.value)}
                />
                <Select
                  id="part-design"
                  label="Design Reference"
                  options={[
                    { value: '', label: 'Not linked' },
                    ...designs.map((design) => ({
                      value: design.id,
                      label: `${design.id} · ${design.name}`,
                    })),
                  ]}
                  value={form.designId}
                  hint="Links the part to the mechanical design it belongs to."
                  onChange={(event) => setField('designId', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'material',
              Box,
              'Material & Dimensions',
              'Material, grade and the dimensions relevant to this part',
              <div className="form-grid">
                <Select
                  id="part-material"
                  label="Material"
                  options={MATERIALS.map((material) => ({ value: material, label: material }))}
                  value={form.material}
                  hint={errors.material}
                  aria-invalid={Boolean(errors.material)}
                  onChange={(event) => setField('material', event.target.value)}
                />
                <Input
                  id="part-grade"
                  label="Material Grade"
                  placeholder="e.g. E250 BR"
                  value={form.materialGrade}
                  onChange={(event) => setField('materialGrade', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="part-dimensions"
                    label="Dimensions"
                    placeholder="e.g. Ø85 × 640 mm"
                    value={form.dimensions}
                    onChange={(event) => setField('dimensions', event.target.value)}
                  />
                </div>
                <Input
                  id="part-length"
                  label="Length (mm)"
                  type="number"
                  value={form.length}
                  onChange={(event) => setField('length', event.target.value)}
                />
                <Input
                  id="part-width"
                  label="Width (mm)"
                  type="number"
                  value={form.width}
                  onChange={(event) => setField('width', event.target.value)}
                />
                <Input
                  id="part-height"
                  label="Height (mm)"
                  type="number"
                  value={form.height}
                  onChange={(event) => setField('height', event.target.value)}
                />
                <Input
                  id="part-diameter"
                  label="Diameter (mm)"
                  type="number"
                  value={form.diameter}
                  onChange={(event) => setField('diameter', event.target.value)}
                />
                <Input
                  id="part-thickness"
                  label="Thickness (mm)"
                  type="number"
                  value={form.thickness}
                  onChange={(event) => setField('thickness', event.target.value)}
                />
                <Input
                  id="part-weight"
                  label="Weight (kg)"
                  type="number"
                  value={form.weight}
                  onChange={(event) => setField('weight', event.target.value)}
                />
                <Select
                  id="part-uom"
                  label="Unit of Measurement"
                  options={UOM_OPTIONS.map((uom) => ({ value: uom, label: uom }))}
                  value={form.uom}
                  onChange={(event) => setField('uom', event.target.value)}
                />
                <Input
                  id="part-quantity"
                  label="Quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  hint={errors.quantity}
                  aria-invalid={Boolean(errors.quantity)}
                  onChange={(event) => setField('quantity', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'ownership',
              Package,
              'Ownership & Status',
              'Revision, owner and lifecycle state',
              <div className="form-grid">
                <Select
                  id="part-owner"
                  label="Design Owner"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.owner}
                  hint={errors.owner}
                  aria-invalid={Boolean(errors.owner)}
                  onChange={(event) => setField('owner', event.target.value)}
                />
                <Select
                  id="part-status"
                  label="Design Status"
                  options={PART_STATUSES.map((status) => ({ value: status, label: status }))}
                  value={form.status}
                  onChange={(event) => setField('status', event.target.value)}
                />
                <Select
                  id="part-revision"
                  label="Revision"
                  options={REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
              </div>,
            )}

            {sectionCard(
              'notes',
              FileText,
              'Description & Notes',
              'Part description, technical notes and the reference held in Drawing & CAD Management',
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="part-description"
                    label="Part Description"
                    rows={2}
                    placeholder="Form, function and interface of the part"
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="part-notes"
                    label="Technical Notes"
                    rows={3}
                    placeholder="Tolerances, finishes, standards and manufacturing notes"
                    value={form.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Input
                    id="part-cad-ref"
                    label="CAD Reference (reference only)"
                    placeholder="e.g. CAD-041-016"
                    value={form.cadRef}
                    onChange={(event) => setField('cadRef', event.target.value)}
                  />
                </div>
              </div>,
            )}
          </div>

          <aside className="mech-form-aside">
            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <Package aria-hidden="true" />
                <strong>Part Context</strong>
              </header>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Project</span>
                  <span className="mech-aside-note">
                    {project ? `${project.id} · ${project.name}` : 'Not selected'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Assembly path</span>
                  <span className="mech-aside-note">
                    {parent
                      ? assemblyPath(assemblies, parent.id)
                          .map((node) => node.name)
                          .join(' → ')
                      : 'No parent assembly'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Dimensions</span>
                  <span className="mech-aside-note">
                    {[
                      form.length && `L ${form.length}`,
                      form.width && `W ${form.width}`,
                      form.height && `H ${form.height}`,
                      form.diameter && `Ø ${form.diameter}`,
                      form.thickness && `T ${form.thickness}`,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Not entered'}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Weight</span>
                  <span className="mech-aside-note">
                    {form.weight ? `${form.weight} kg` : 'Not entered'}
                  </span>
                </div>
              </div>
            </section>

            <section className="card mech-aside-card">
              <header className="mech-aside-head">
                <FileText aria-hidden="true" />
                <strong>Supporting Documents</strong>
                <span className="mech-aside-count">{documents.length}</span>
              </header>
              <div className="mech-aside-body">
                <label className="attachment-picker">
                  <Plus aria-hidden="true" />
                  <span>Choose files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.dwg,.dxf,.step,.xlsx,.docx,.png,.jpg"
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
                    No documents attached. Names and sizes are recorded locally.
                  </p>
                ) : (
                  <ul className="mech-aside-files">
                    {documents.map((document, index) => (
                      <li key={`${document.name}-${index}`}>
                        <FileText aria-hidden="true" />
                        <span className="mech-aside-file-name">{document.name}</span>
                        <span className="mech-aside-file-size">
                          {Math.max(1, Math.round(document.size / 1024))} KB
                        </span>
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

            <section className="mech-aside-hint">
              <strong>Revision</strong>
              Saving with a new revision records a revision entry automatically. Created{' '}
              {formatDate(TODAY)} by {form.owner}.
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
              {formId} · {form.status} · {form.domain}
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button onClick={() => submit(false)} icon={editing ? Save : Plus}>
              {editing ? 'Save' : 'Save Part'}
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
