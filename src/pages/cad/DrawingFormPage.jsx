import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  Paperclip,
  Save,
  Shapes,
  Upload,
  X,
} from 'lucide-react';
import { Breadcrumb, Button, Input, Modal, PageHeader, PageLayout, Select, StatusBadge, Textarea } from '../../components/common';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  DRAWING_TYPES,
  DRAWING_UNITS,
  PROJECTION_METHODS,
  SHEET_SIZES,
  TODAY,
  assemblyLabel,
  cadStatusTone,
  designForProject,
  extensionOf,
  formatBytes,
  previewCapability,
} from '../../data/cadData';
import { AttachmentList, Toast, useToast } from './cadUi';

const FORMATS = ['SVG', 'PDF', 'DWG', 'DXF', 'DGN', 'SLDDRW', 'CATDrawing', 'IDW', 'PNG', 'JPG'];

function Section({ icon: Icon, title, subtitle, children, badge }) {
  return (
    <section className="form-section-card is-open">
      <div className="form-section-head">
        <span className="form-section-icon" aria-hidden="true"><Icon /></span>
        <span className="form-section-text"><strong>{title}</strong><span>{subtitle}</span></span>
        {badge != null && <span className="mech-aside-count">{badge}</span>}
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  );
}

export default function DrawingFormPage() {
  const { drawingId } = useParams();
  const navigate = useNavigate();
  const { drawings, files, nextDrawingId, addDrawing, updateDrawing } = useCad();
  const { designs, parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const editing = drawingId ? drawings.find((row) => row.id === drawingId) : null;
  const [formId] = useState(() => editing?.id || nextDrawingId());
  const [form, setForm] = useState(() => ({
    drawingNumber: editing?.drawingNumber || '',
    title: editing?.title || '',
    drawingType: editing?.drawingType || DRAWING_TYPES[0],
    projectId: editing?.projectId || projects[0]?.id || '',
    designId: editing?.designId || designForProject(editing?.projectId || projects[0]?.id || '')?.id || '',
    designRevision: editing?.designRevision || designForProject(editing?.projectId || projects[0]?.id || '')?.revision || '',
    partNumber: editing?.partNumber || '',
    partName: editing?.partName || '',
    assemblyId: editing?.assemblyId || '',
    revision: editing?.revision || 'A',
    format: editing?.format || 'SVG',
    scale: editing?.scale || '1:1',
    units: editing?.units || 'mm',
    sheetSize: editing?.sheetSize || 'A3',
    projectionMethod: editing?.projectionMethod || 'First angle',
    materialRef: editing?.materialRef || '',
    toleranceNotes: editing?.toleranceNotes || '',
    simulationRef: editing?.simulationRef || '',
    changeRef: editing?.changeRef || '',
    preparedBy: editing?.preparedBy || 'R. Kulkarni',
    reviewedBy: editing?.reviewedBy || 'N. Joshi',
    drawingDate: editing?.drawingDate || TODAY,
    description: editing?.description || '',
    cadFileIds: editing?.cadFileIds || [],
    bomRef: editing?.bomRef || '',
    mfgRef: editing?.mfgRef || '',
    attachments: editing?.attachments || [],
  }));
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(false);
  const attachmentRef = useRef(null);

  const projectDesigns = useMemo(() => designs.filter((design) => !form.projectId || design.projectId === form.projectId), [designs, form.projectId]);
  const projectParts = useMemo(() => parts.filter((part) => !form.projectId || part.projectId === form.projectId), [parts, form.projectId]);
  const projectAssemblies = useMemo(() => assemblies.filter((assembly) => !form.projectId || assembly.projectId === form.projectId), [assemblies, form.projectId]);
  const projectFiles = useMemo(() => files.filter((file) => !form.projectId || file.projectId === form.projectId), [files, form.projectId]);

  if (drawingId && !editing) return <Navigate to="/cad-management/drawings" replace />;
  if (editing && !['Draft', 'Changes Requested'].includes(editing.approvalStatus)) {
    return <Navigate to="/cad-management/drawings" replace />;
  }

  const setField = (key, value) => {
    setDirty(true);
    setErrors((previous) => ({ ...previous, [key]: '' }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const selectPart = (value) => {
    const part = parts.find((row) => row.partNumber === value);
    setDirty(true);
    setForm((previous) => ({ ...previous, partNumber: value, partName: part?.name || previous.partName, assemblyId: part?.parentAssemblyId || previous.assemblyId }));
  };

  const validate = () => {
    const next = {};
    if (!form.drawingNumber.trim()) next.drawingNumber = 'Drawing number is required.';
    else if (drawings.some((row) => row.drawingNumber.toLowerCase() === form.drawingNumber.trim().toLowerCase() && row.id !== formId)) {
      next.drawingNumber = 'This drawing number already exists in the register.';
    }
    if (!form.title.trim()) next.title = 'Drawing title is required.';
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.partNumber.trim()) next.partNumber = 'Part number is required.';
    if (!form.partName.trim()) next.partName = 'Part name is required.';
    if (!form.description.trim()) next.description = 'Describe what the drawing defines.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = (draft, destination) => {
    if (!validate()) {
      showToast('Fix the highlighted fields before saving.', 'error');
      return;
    }
    const attachments = form.attachments.map((row) => ({ ...row }));
    if (editing) {
      const updatedRevisions = editing.revisions.map((row) =>
        row.revision === editing.revision
          ? {
              ...row,
              meta: {
                title: form.title,
                drawingType: form.drawingType,
                description: form.description,
                format: form.format,
                cadFileIds: form.cadFileIds,
                attachments: attachments.map((item) => item.name),
                designId: form.designId,
                designRevision: form.designRevision,
                scale: form.scale,
                units: form.units,
                sheetSize: form.sheetSize,
                projectionMethod: form.projectionMethod,
                materialRef: form.materialRef,
                toleranceNotes: form.toleranceNotes,
                simulationRef: form.simulationRef,
                changeRef: form.changeRef,
              },
            }
          : row,
      );
      updateDrawing(formId, {
        ...form,
        revision: form.revision.toUpperCase(),
        approvalStatus: editing.approvalStatus,
        revisions: updatedRevisions,
        changeHistory: [
          ...(editing.changeHistory || []),
          { id: `CH-${Date.now()}`, at: TODAY, by: form.preparedBy, action: 'Metadata updated', description: `${form.drawingNumber} drawing metadata ${draft ? 'saved as draft' : 'updated'}.` },
        ],
      });
      showToast(`${form.drawingNumber} updated.`);
    } else {
      const record = {
        id: formId,
        ...form,
        revision: form.revision.toUpperCase(),
        approvalStatus: 'Draft',
        releaseStatus: 'Not released',
        releasedAt: '',
        releaseRef: '',
        attachments,
        approvals: [],
        statusHistory: [{ id: `${formId}-SH1`, status: 'Draft', at: TODAY, by: form.preparedBy, note: 'Drawing record created as a draft.' }],
        changeHistory: [{ id: `${formId}-CH1`, at: TODAY, by: form.preparedBy, action: 'Drawing created', description: `${form.drawingNumber} registered at Rev ${form.revision}.` }],
        revisions: [
          {
            revision: form.revision.toUpperCase(),
            previous: '',
            date: form.drawingDate,
            by: form.preparedBy,
            note: 'Initial drawing record.',
            status: 'Draft',
            meta: {
              title: form.title,
              drawingType: form.drawingType,
              description: form.description,
              format: form.format,
              cadFileIds: form.cadFileIds,
              attachments: attachments.map((row) => row.name),
              designId: form.designId,
              designRevision: form.designRevision,
              scale: form.scale,
              units: form.units,
              sheetSize: form.sheetSize,
              projectionMethod: form.projectionMethod,
              materialRef: form.materialRef,
              toleranceNotes: form.toleranceNotes,
              simulationRef: form.simulationRef,
              changeRef: form.changeRef,
            },
          },
        ],
      };
      addDrawing(record);
      showToast(`${form.drawingNumber} created as a draft drawing.`);
    }
    setDirty(false);
    if (destination === 'register') navigate('/cad-management/drawings');
    else {
      const previewable = attachments.some((row) => row.preview && row.assetPath);
      if (previewable) navigate(`/cad-management/viewer?drawing=${formId}`);
      else navigate('/cad-management/drawings');
    }
  };

  const addAttachment = (file) => {
    if (!file) return;
    const ext = extensionOf(file.name);
    if (!['svg', 'pdf', 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'dwg', 'dxf', 'txt', 'doc', 'docx'].includes(ext)) {
      setErrors((previous) => ({ ...previous, attachments: `${ext ? ext.toUpperCase() : 'This file type'} cannot be attached here.` }));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrors((previous) => ({ ...previous, attachments: 'Attachments are limited to 25 MB in this browser session.' }));
      return;
    }
    setErrors((previous) => ({ ...previous, attachments: '' }));
    setDirty(true);
    setForm((previous) => ({
      ...previous,
      attachments: [
        ...previous.attachments.filter((row) => row.name !== file.name),
        { name: file.name, type: ext.toUpperCase(), size: file.size, preview: false, sessionOnly: true },
      ],
    }));
    showToast('Attachment metadata added. Browser-selected attachments are session-only and cannot be previewed after a refresh.');
  };

  const requestCancel = () => {
    if (dirty) setCancelPrompt(true);
    else navigate('/cad-management/drawings');
  };

  const hasPreview = form.attachments.some((row) => row.preview && row.assetPath);

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Drawing & CAD Management', to: '/cad-management' },
            { label: 'Drawing Management', to: '/cad-management/drawings' },
            editing ? { label: `${editing.drawingNumber} · Edit` } : { label: 'New Drawing' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Shapes}
          title={editing ? `Edit Drawing ${editing.drawingNumber}` : 'Create Drawing Record'}
          subtitle="Register an engineering drawing, classify it, link its CAD files and record project and part mapping. Approval and release happen later in Revision & Release Management."
          actions={<Button variant="secondary" icon={ArrowLeft} onClick={requestCancel}>Back to Drawings</Button>}
        />
      }
    >
      <form className="project-form-page" onSubmit={(event) => { event.preventDefault(); persist(false, 'register'); }} noValidate>
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <Section icon={FileText} title="1. Drawing Identification" subtitle="Number, title, classification and revision">
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Drawing ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Record Status</span>
                  <span className="form-static"><StatusBadge status={editing ? editing.approvalStatus : 'Draft'} tone={cadStatusTone(editing ? editing.approvalStatus : 'Draft')} /></span>
                </div>
                <div className="form-grid-full">
                  <Input id="drawing-number" label="Drawing Number" value={form.drawingNumber} placeholder="e.g. DRG-MEC-041-001" hint={errors.drawingNumber} aria-invalid={Boolean(errors.drawingNumber)} onChange={(event) => setField('drawingNumber', event.target.value.toUpperCase())} />
                </div>
                <div className="form-grid-full">
                  <Input id="drawing-title" label="Drawing Title" value={form.title} placeholder="e.g. Conveyor drive assembly — general arrangement" hint={errors.title} onChange={(event) => setField('title', event.target.value)} />
                </div>
                <Select id="drawing-type" label="Drawing Type" options={DRAWING_TYPES.map((value) => ({ value, label: value }))} value={form.drawingType} onChange={(event) => setField('drawingType', event.target.value)} />
                <Select id="drawing-format" label="Drawing Format" options={FORMATS.map((value) => ({ value, label: value }))} value={form.format} onChange={(event) => setField('format', event.target.value)} hint="Native CAD drawing formats remain stored-only unless a converted preview is attached." />
                <Input id="drawing-scale" label="Scale" value={form.scale} placeholder="e.g. 1:1" onChange={(event) => setField('scale', event.target.value)} />
                <Select id="drawing-units" label="Units" options={DRAWING_UNITS.map((value) => ({ value, label: value }))} value={form.units} onChange={(event) => setField('units', event.target.value)} />
                <Select id="drawing-sheet-size" label="Sheet Size" options={SHEET_SIZES.map((value) => ({ value, label: value }))} value={form.sheetSize} onChange={(event) => setField('sheetSize', event.target.value)} />
                <Select id="drawing-projection" label="Projection Method" options={PROJECTION_METHODS.map((value) => ({ value, label: value }))} value={form.projectionMethod} onChange={(event) => setField('projectionMethod', event.target.value)} />
                <Input id="drawing-material-ref" label="Material Reference" value={form.materialRef} placeholder="e.g. EN19 / IS 2062 E250" onChange={(event) => setField('materialRef', event.target.value)} />
                <Input id="drawing-revision" label="Revision" value={form.revision} maxLength={3} disabled={Boolean(editing)} hint={editing ? 'Raise a revision from Revision & Release Management.' : undefined} onChange={(event) => setField('revision', event.target.value.toUpperCase())} />
                <Input id="drawing-date" label="Drawing Date" type="date" value={form.drawingDate} onChange={(event) => setField('drawingDate', event.target.value)} />
                <Select id="drawing-prepared" label="Prepared By" options={['R. Kulkarni', 'D. Rao', 'K. Pillai', 'V. Sharma', 'P. Deshmukh', 'A. Iyer', 'S. Menon', 'N. Joshi'].map((value) => ({ value, label: value }))} value={form.preparedBy} onChange={(event) => setField('preparedBy', event.target.value)} />
                <Select id="drawing-reviewed" label="Reviewed By" options={['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'].map((value) => ({ value, label: value }))} value={form.reviewedBy} onChange={(event) => setField('reviewedBy', event.target.value)} />
                <Textarea id="drawing-description" label="Drawing Description" rows={3} className="span-2" value={form.description} placeholder="What the drawing defines, key dimensions, tolerance or fabrication notes." hint={errors.description} onChange={(event) => setField('description', event.target.value)} />
                <Textarea id="drawing-tolerance-notes" label="Tolerance / Specification Notes" rows={2} className="span-2" value={form.toleranceNotes} placeholder="General tolerances, surface finish, GD&T or inspection notes" onChange={(event) => setField('toleranceNotes', event.target.value)} />
              </div>
            </Section>

            <Section icon={Layers} title="2. Project, Part & Assembly Mapping" subtitle="Engineering context and downstream references">
              <div className="form-grid">
                <Select id="drawing-project" label="Project" options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={form.projectId} hint={errors.projectId} onChange={(event) => { const design = designForProject(event.target.value); setField('projectId', event.target.value); setField('assemblyId', ''); setField('designId', design?.id || ''); setField('designRevision', design?.revision || ''); }} />
                <Select id="drawing-design" label="Mechanical Design" options={[{ value: '', label: 'No design reference' }, ...projectDesigns.map((design) => ({ value: design.id, label: `${design.id} · ${design.name}` }))]} value={form.designId} onChange={(event) => { setField('designId', event.target.value); setField('designRevision', designs.find((design) => design.id === event.target.value)?.revision || ''); }} />
                <Input id="drawing-design-revision" label="Design Revision" value={form.designRevision} placeholder="e.g. C" onChange={(event) => setField('designRevision', event.target.value.toUpperCase())} />
                <div className="form-field">
                  <label className="form-label" htmlFor="drawing-part">Part Number</label>
                  <input id="drawing-part" className="form-input" list="drawing-part-options" value={form.partNumber} placeholder="e.g. MEC-041-001" onChange={(event) => selectPart(event.target.value)} />
                  <datalist id="drawing-part-options">{projectParts.map((part) => <option key={part.id} value={part.partNumber}>{part.name}</option>)}</datalist>
                  {errors.partNumber && <span className="form-hint form-hint-error">{errors.partNumber}</span>}
                </div>
                <Input id="drawing-part-name" label="Part Name" value={form.partName} placeholder="e.g. Gearbox housing" hint={errors.partName} onChange={(event) => setField('partName', event.target.value)} />
                <Select id="drawing-assembly" label="Assembly" options={[{ value: '', label: 'No assembly' }, ...projectAssemblies.map((assembly) => ({ value: assembly.id, label: `${assembly.number} · ${assembly.name}` }))]} value={form.assemblyId} onChange={(event) => setField('assemblyId', event.target.value)} />
                <Input id="drawing-bom" label="BOM Reference" value={form.bomRef} placeholder="e.g. BOM-2026-001" hint="Mock reference only; this form does not create a BOM." onChange={(event) => setField('bomRef', event.target.value)} />
                <Input id="drawing-mfg" label="Manufacturing Design Reference" value={form.mfgRef} placeholder="e.g. MFG-041-001" hint="Mock reference only; this form does not create a manufacturing record." onChange={(event) => setField('mfgRef', event.target.value)} />
                <Input id="drawing-simulation-ref" label="Simulation / Validation Reference" value={form.simulationRef} placeholder="e.g. SIM-2026-001" onChange={(event) => setField('simulationRef', event.target.value)} />
                <Input id="drawing-change-ref" label="Engineering Change Reference" value={form.changeRef} placeholder="e.g. ECR-2026-001" onChange={(event) => setField('changeRef', event.target.value)} />
                <div className="form-field span-2">
                  <label className="form-label" htmlFor="drawing-cad-files">Related CAD Files</label>
                  <select
                    id="drawing-cad-files"
                    className="form-select cad-multiselect"
                    multiple
                    size={Math.min(6, Math.max(3, projectFiles.length))}
                    value={form.cadFileIds}
                    onChange={(event) => setField('cadFileIds', [...event.target.selectedOptions].map((option) => option.value))}
                  >
                    {projectFiles.map((file) => <option key={file.id} value={file.id}>{file.id} · {file.fileName} · Rev {file.revision}</option>)}
                  </select>
                  <span className="form-hint">Hold Ctrl / Cmd to select more than one CAD file. Links stay within this frontend.</span>
                </div>
              </div>
            </Section>

            <Section icon={Paperclip} title="3. Attachments" subtitle="Drawings, supporting images and technical notes" badge={form.attachments.length}>
              <AttachmentList
                files={form.attachments}
                onRemove={(name) => { setDirty(true); setForm((previous) => ({ ...previous, attachments: previous.attachments.filter((file) => file.name !== name) })); }}
              />
              <div className="cad-upload-actions">
                <label className="button button-secondary button-sm">
                  <Upload aria-hidden="true" /> Select Attachment
                  <input ref={attachmentRef} type="file" accept=".svg,.pdf,.png,.jpg,.jpeg,.bmp,.gif,.webp,.dwg,.dxf,.txt,.doc,.docx" className="sr-only" onChange={(event) => { addAttachment(event.target.files?.[0]); event.target.value = ''; }} />
                </label>
              </div>
              {errors.attachments && <p className="form-error" role="alert"><AlertTriangle aria-hidden="true" /> {errors.attachments}</p>}
              <p className="cad-note">PDF, SVG and image attachments can be previewed in the CAD Viewer when they carry a stored asset. Browser-selected attachments here are metadata only and are not retained after refresh; DWG and DXF never render in this build.</p>
            </Section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head"><Shapes aria-hidden="true" /><strong>Drawing Summary</strong></div>
              <div className="mech-aside-body">
                <div className="mech-aside-group"><span className="mech-aside-label">Drawing No.</span><span>{form.drawingNumber || 'Not entered'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Type</span><span>{form.drawingType}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{form.projectId || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Part</span><span>{form.partNumber ? `${form.partNumber} · ${form.partName}` : 'Not mapped'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Assembly</span><span>{form.assemblyId ? assemblyLabel(assemblies, form.assemblyId) : 'No assembly'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Revision</span><span>Rev {form.revision}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">CAD Links</span><span>{form.cadFileIds.length}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Attachments</span><span>{form.attachments.length}</span></div>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head"><CheckCircle2 aria-hidden="true" /><strong>Readiness</strong></div>
              <div className="mech-aside-body">
                <ul className="anl-checklist">
                  <li className={form.drawingNumber.trim() ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Drawing number entered</li>
                  <li className={form.title.trim() ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Title recorded</li>
                  <li className={form.projectId ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Project mapped</li>
                  <li className={form.partNumber.trim() ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Part mapped</li>
                  <li className={form.cadFileIds.length > 0 ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />CAD file linked</li>
                  <li className={form.attachments.length > 0 ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Attachment recorded</li>
                </ul>
                <p className="mech-aside-note">Saving keeps the drawing editable in Draft. Submit it for review from the Drawing Register.</p>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head"><AlertTriangle aria-hidden="true" /><strong>Controlled release</strong></div>
              <div className="mech-aside-body">
                <p className="mech-aside-note">A drawing cannot be released from this form. Approval and release are recorded in Revision &amp; Release Management. {hasPreview ? 'Attached SVG/PDF files can be opened in the viewer.' : 'No browser-previewable attachment is currently recorded.'}</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={requestCancel}>Cancel</Button>
            <span className="project-form-actions-note">{formId} · stored locally in this browser</span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={() => persist(true, 'register')}>Save as Draft</Button>
            <Button icon={Save} onClick={() => persist(false, 'register')}>Save</Button>
            <Button variant="secondary" icon={ArrowRight} onClick={() => persist(false, 'viewer')}>Save &amp; Continue</Button>
          </div>
        </div>
      </form>

      <Modal
        open={cancelPrompt}
        onClose={() => setCancelPrompt(false)}
        title="Discard unsaved drawing changes?"
        footer={<><Button variant="ghost" onClick={() => setCancelPrompt(false)}>Keep Editing</Button><Button onClick={() => navigate('/cad-management/drawings')}>Discard &amp; Leave</Button></>}
      >
        <p className="dash-modal-note">Anything typed since the last save will be lost.</p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
