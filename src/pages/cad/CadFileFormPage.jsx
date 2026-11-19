import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderOpen,
  Image,
  Layers,
  Paperclip,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { Breadcrumb, Button, Input, Modal, PageHeader, PageLayout, Select, StatusBadge, Textarea } from '../../components/common';
import { useCad } from '../../context/CadContext';
import { ACCEPTED_CAD_EXTENSIONS } from '../../data/cadCapability';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  CAD_CATEGORIES,
  CAD_UNITS,
  COORDINATE_REFERENCES,
  SOURCE_APPLICATIONS,
  TODAY,
  assemblyLabel,
  cadStatusTone,
  conversionSummary,
  defaultSourceApplication,
  designForProject,
  extensionOf,
  formatBytes,
  previewCapability,
} from '../../data/cadData';
import { Toast, useToast } from './cadUi';

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([...ACCEPTED_CAD_EXTENSIONS.split(',').map((value) => value.replace('.', '')), 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt']);
const ACCEPTED = `${ACCEPTED_CAD_EXTENSIONS},.doc,.docx,.xls,.xlsx,.csv,.txt`;

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

export default function CadFileFormPage() {
  const navigate = useNavigate();
  const { nextFileId, addFile, pendingUpload, clearPendingUpload } = useCad();
  const { designs, parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get('project') || '';
  const requestedProject = projects.find((project) => project.id === requestedProjectId) || null;
  const initialProjectId = requestedProject?.id || '';
  const initialProjectDesign = initialProjectId ? designForProject(initialProjectId) : null;
  const projectReturnPath = initialProjectId ? `/cad-management/project/${initialProjectId}` : '/cad-management/repository';
  const [formId] = useState(() => nextFileId());
  const initialFile = pendingUpload || null;
  const [file, setFile] = useState(initialFile);
  const [form, setForm] = useState(() => ({
    fileName: initialFile?.name || '',
    category: initialFile ? (['obj', 'stl', 'glb', 'gltf', 'ply', 'step', 'stp', 'iges', 'igs', 'fbx', '3mf', 'sldprt', 'sldasm'].includes(extensionOf(initialFile.name)) ? '3D CAD Model' : '2D CAD Drawing') : '2D CAD Drawing',
    projectId: initialProjectId || projects[0]?.id || '',
    designId: initialProjectDesign?.id || designForProject(projects[0]?.id || '')?.id || '',
    designRevision: initialProjectDesign?.revision || designForProject(projects[0]?.id || '')?.revision || '',
    partNumber: '',
    partName: '',
    assemblyId: '',
    revision: 'A',
    sourceApplication: initialFile ? defaultSourceApplication(initialFile.name) : 'Neutral exchange / other',
    units: 'mm',
    scale: '1:1',
    coordinateReference: 'Model origin',
    bomRef: '',
    manufacturingRef: '',
    simulationRef: '',
    changeRef: '',
    description: '',
    uploadedBy: 'R. Kulkarni',
    remarks: '',
  }));
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(Boolean(initialFile));
  const [cancelPrompt, setCancelPrompt] = useState(false);
  const fileRef = useRef(null);

  const projectParts = useMemo(() => parts.filter((part) => !form.projectId || part.projectId === form.projectId), [parts, form.projectId]);
  const projectAssemblies = useMemo(() => assemblies.filter((assembly) => !form.projectId || assembly.projectId === form.projectId), [assemblies, form.projectId]);
  const projectDesigns = useMemo(() => designs.filter((design) => !form.projectId || design.projectId === form.projectId), [designs, form.projectId]);
  const capability = file ? previewCapability(file.name) : null;
  const previewUrl = useMemo(() => (file && capability?.supported && capability.mode !== '3d' ? URL.createObjectURL(file) : ''), [file, capability]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const setField = (key, value) => {
    setDirty(true);
    setErrors((previous) => ({ ...previous, [key]: '' }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const selectPart = (value) => {
    const part = parts.find((row) => row.partNumber === value);
    setDirty(true);
    setForm((previous) => ({
      ...previous,
      partNumber: value,
      partName: part?.name || previous.partName,
      assemblyId: part?.parentAssemblyId || previous.assemblyId,
    }));
  };

  const selectProject = (projectId) => {
    const design = designForProject(projectId);
    setField('projectId', projectId);
    setField('assemblyId', '');
    setField('designId', design?.id || '');
    setField('designRevision', design?.revision || '');
  };

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    const ext = extensionOf(nextFile.name);
    if (!ALLOWED.has(ext)) {
      setErrors((previous) => ({ ...previous, file: `${ext ? ext.toUpperCase() : 'This file type'} is not accepted. Choose a CAD, drawing, image or document file.` }));
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setErrors((previous) => ({ ...previous, file: `This file is ${formatBytes(nextFile.size)}. The browser session limit is 25 MB.` }));
      return;
    }
    setErrors((previous) => ({ ...previous, file: '' }));
    setDirty(true);
    setFile(nextFile);
    setForm((previous) => ({
      ...previous,
      fileName: previous.fileName && previous.fileName !== initialFile?.name ? previous.fileName : nextFile.name,
      category: ['obj', 'stl', 'glb', 'gltf', 'ply', 'fbx', '3mf', 'step', 'stp', 'iges', 'igs', 'brep', 'sldprt', 'sldasm', 'catpart', 'catproduct', 'prt', 'asm', 'ipt', 'iam', 'ipn', 'f3d', 'f3z', 'x_t', 'x_b', 'sat', 'sab', 'jt'].includes(ext) ? '3D CAD Model' : ['svg', 'pdf', 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'].includes(ext) ? '2D CAD Drawing' : previous.category,
      sourceApplication: defaultSourceApplication(nextFile.name),
    }));
  };

  const validate = () => {
    const next = {};
    if (!form.fileName.trim()) next.fileName = 'File name is required.';
    if (!form.category) next.category = 'Select a file category.';
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.partNumber.trim()) next.partNumber = 'Part number is required for engineering mapping.';
    if (!form.partName.trim()) next.partName = 'Part name is required.';
    if (!form.uploadedBy) next.uploadedBy = 'Select who is registering the file.';
    if (!file) next.file = 'Select a local file to register in this browser session.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = (draft, destination) => {
    if (!draft && !validate()) {
      showToast('Fix the highlighted fields before saving.', 'error');
      return;
    }
    if (draft && !form.projectId) {
      setErrors({ projectId: 'Select a project before saving a draft.' });
      showToast('Select a project before saving a draft.', 'error');
      return;
    }
    if (draft && !file && !form.fileName.trim()) {
      showToast('Select a local file or enter a file name before saving a draft.', 'error');
      return;
    }
    if (!file && !draft) {
      showToast('Select a local file before registering it.', 'error');
      return;
    }
    const ext = extensionOf(file?.name || form.fileName);
    const capabilityForFile = previewCapability(file?.name || form.fileName);
    const conversion = conversionSummary(file?.name || form.fileName);
    const status = draft ? 'Draft' : capabilityForFile.supported ? 'Preview Available' : 'Preview Unavailable';
    const record = {
      id: formId,
      fileName: form.fileName.trim() || file.name,
      fileType: ext.toUpperCase(),
      originalExtension: ext,
      category: form.category,
      projectId: form.projectId,
      designId: form.designId,
      designRevision: form.designRevision,
      partNumber: form.partNumber.trim(),
      partName: form.partName.trim(),
      assemblyId: form.assemblyId,
      revision: form.revision.toUpperCase(),
      sourceApplication: form.sourceApplication,
      units: form.units,
      scale: form.scale,
      coordinateReference: form.coordinateReference,
      bomRef: form.bomRef,
      manufacturingRef: form.manufacturingRef,
      simulationRef: form.simulationRef,
      changeRef: form.changeRef,
      conversionStatus: conversion.status,
      conversionFormat: conversion.format,
      previewNote: conversion.note,
      versionNumber: 1,
      size: file?.size || 0,
      uploadedBy: form.uploadedBy,
      uploadedAt: TODAY,
      status,
      assetPath: '',
      description: form.description,
      remarks: form.remarks,
      sessionFile: true,
      uploadHistory: [
        { id: `${formId}-UP`, at: TODAY, by: form.uploadedBy, action: draft ? 'Draft saved' : 'File uploaded', description: `${file?.name || form.fileName} selected in browser memory and saved as ${status}.` },
      ],
      changeHistory: [
        { id: `${formId}-CH`, at: TODAY, by: form.uploadedBy, action: 'File registered', description: `${form.fileName || file.name} added to the CAD repository.` },
      ],
    };
    addFile(record, file || null);
    clearPendingUpload();
    setDirty(false);
    showToast(`${formId} registered. Browser memory holds the file until refresh.`);
    if (destination === 'viewer' && previewCapability(record.fileName).supported) {
      navigate(`/cad-management/viewer?file=${formId}`);
    } else {
      navigate(record.projectId ? `/cad-management/project/${record.projectId}` : '/cad-management/repository');
    }
  };

  const requestCancel = () => {
    if (dirty) setCancelPrompt(true);
    else navigate(projectReturnPath);
  };

  const projectRecord = projects.find((project) => project.id === form.projectId) || null;

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Drawing & CAD Management', to: '/cad-management' },
            { label: 'CAD File Repository', to: '/cad-management/repository' },
            ...(initialProjectId ? [{ label: `Project ${initialProjectId}`, to: `/cad-management/project/${initialProjectId}` }] : []),
            { label: 'Register CAD File' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={FolderOpen}
          title="Register CAD File"
          subtitle="Attach a local engineering file, record its metadata and map it to a project, part and assembly. The file is never uploaded to a server."
          actions={<Button variant="secondary" icon={ArrowLeft} onClick={requestCancel}>{initialProjectId ? 'Back to Project' : 'Back to Repository'}</Button>}
        />
      }
    >
      <form className="project-form-page" onSubmit={(event) => { event.preventDefault(); save(false, 'repository'); }} noValidate>
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <Section icon={Paperclip} title="1. File" subtitle="Local browser selection, validation and format capability" badge={file ? file.type || extensionOf(file.name).toUpperCase() : null}>
              <button type="button" className="cad-dropzone cad-dropzone-sm" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}>
                <Upload aria-hidden="true" />
                <strong>{file ? 'Replace selected file' : 'Drop a file here or browse'}</strong>
                <span>{file ? `${file.name} · ${formatBytes(file.size)}` : 'SVG, PDF, images, OBJ, STL, GLB, GLTF, PLY, and stored-only DWG, DXF, STEP, IGES, SolidWorks'}</span>
              </button>
              <input ref={fileRef} type="file" accept={ACCEPTED} className="cad-visually-hidden" onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
              <div className="cad-upload-actions">
                <Button variant="ghost" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>Choose File</Button>
                {file && <Button variant="ghost" size="sm" icon={X} onClick={() => { setFile(null); setDirty(true); }}>Clear File</Button>}
              </div>
              {errors.file && <p className="form-error" role="alert"><AlertTriangle aria-hidden="true" /> {errors.file}</p>}
              {initialFile && <p className="cad-note">This file was staged from the repository upload area and is held in browser memory.</p>}
              <p className="cad-note">The file stays in this tab's memory. Refreshing the page clears the temporary file and its preview; the metadata record remains.</p>
            </Section>

            <Section icon={FileText} title="2. File Metadata" subtitle="Identification, engineering mapping and ownership">
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">File ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Initial Status</span>
                  <span className="form-static"><StatusBadge status={file ? (capability?.supported ? 'Preview Available' : 'Preview Unavailable') : 'Draft'} tone={cadStatusTone(file ? (capability?.supported ? 'Preview Available' : 'Preview Unavailable') : 'Draft')} /></span>
                </div>
                <div className="form-grid-full">
                  <Input id="cad-file-name" label="File Name" value={form.fileName} placeholder="e.g. DRG-MEC-041-001_Conveyor-Drive-GA.svg" hint={errors.fileName} aria-invalid={Boolean(errors.fileName)} onChange={(event) => setField('fileName', event.target.value)} />
                </div>
                <Select id="cad-file-category" label="File Category" options={[{ value: '', label: 'Select category' }, ...CAD_CATEGORIES.map((value) => ({ value, label: value }))]} value={form.category} hint={errors.category} onChange={(event) => setField('category', event.target.value)} />
                <Select id="cad-file-project" label="Project Number" options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={form.projectId} hint={errors.projectId} onChange={(event) => selectProject(event.target.value)} />
                <div className="form-field">
                  <span className="form-label">Project Name</span>
                  <span className="form-static">{projectRecord?.name || 'Select a project'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Customer</span>
                  <span className="form-static">{projectRecord?.customer || 'Not available'}</span>
                </div>
                <Select id="cad-file-design" label="Mechanical Design" options={[{ value: '', label: 'No design reference' }, ...projectDesigns.map((design) => ({ value: design.id, label: `${design.id} · ${design.name}` }))]} value={form.designId} onChange={(event) => { setField('designId', event.target.value); setField('designRevision', designs.find((design) => design.id === event.target.value)?.revision || ''); }} />
                <Input id="cad-file-design-revision" label="Design Revision" value={form.designRevision} placeholder="e.g. C" onChange={(event) => setField('designRevision', event.target.value.toUpperCase())} />
                <div className="form-field">
                  <label className="form-label" htmlFor="cad-file-part">Part Number</label>
                  <input id="cad-file-part" className="form-input" list="cad-new-part-options" value={form.partNumber} placeholder="e.g. MEC-041-001" onChange={(event) => selectPart(event.target.value)} />
                  <datalist id="cad-new-part-options">{projectParts.map((part) => <option key={part.id} value={part.partNumber}>{part.name}</option>)}</datalist>
                  {errors.partNumber && <span className="form-hint form-hint-error">{errors.partNumber}</span>}
                </div>
                <Input id="cad-file-part-name" label="Part Name" value={form.partName} placeholder="e.g. Gearbox housing" hint={errors.partName} onChange={(event) => setField('partName', event.target.value)} />
                <Select id="cad-file-assembly" label="Parent Assembly" options={[{ value: '', label: 'No assembly' }, ...projectAssemblies.map((assembly) => ({ value: assembly.id, label: `${assembly.number} · ${assembly.name}` }))]} value={form.assemblyId} onChange={(event) => setField('assemblyId', event.target.value)} />
                <Input id="cad-file-revision" label="Revision" value={form.revision} maxLength={3} onChange={(event) => setField('revision', event.target.value.toUpperCase())} />
                <Select id="cad-source-app" label="Source CAD Application" options={SOURCE_APPLICATIONS.map((value) => ({ value, label: value }))} value={form.sourceApplication} onChange={(event) => setField('sourceApplication', event.target.value)} />
                <Select id="cad-units" label="Units" options={CAD_UNITS.map((value) => ({ value, label: value }))} value={form.units} onChange={(event) => setField('units', event.target.value)} />
                <Input id="cad-scale" label="Scale" value={form.scale} placeholder="e.g. 1:1" onChange={(event) => setField('scale', event.target.value)} />
                <Select id="cad-coordinate-reference" label="Coordinate Reference" options={COORDINATE_REFERENCES.map((value) => ({ value, label: value }))} value={form.coordinateReference} onChange={(event) => setField('coordinateReference', event.target.value)} />
                <Input id="cad-bom-ref" label="BOM Reference" value={form.bomRef} placeholder="e.g. BOM-2026-001" onChange={(event) => setField('bomRef', event.target.value)} />
                <Input id="cad-manufacturing-ref" label="Manufacturing Reference" value={form.manufacturingRef} placeholder="e.g. MFG-041-001" onChange={(event) => setField('manufacturingRef', event.target.value)} />
                <Input id="cad-simulation-ref" label="Simulation / Validation Reference" value={form.simulationRef} placeholder="e.g. SIM-2026-001" onChange={(event) => setField('simulationRef', event.target.value)} />
                <Input id="cad-change-ref" label="Engineering Change Reference" value={form.changeRef} placeholder="e.g. ECR-2026-001" onChange={(event) => setField('changeRef', event.target.value)} />
                <Select id="cad-file-uploader" label="Uploaded By" options={['R. Kulkarni', 'D. Rao', 'K. Pillai', 'V. Sharma', 'P. Deshmukh', 'A. Iyer', 'S. Menon', 'N. Joshi'].map((value) => ({ value, label: value }))} value={form.uploadedBy} hint={errors.uploadedBy} onChange={(event) => setField('uploadedBy', event.target.value)} />
                <Textarea id="cad-file-description" label="Description" rows={3} className="span-2" value={form.description} placeholder="What this file contains and where it is used." onChange={(event) => setField('description', event.target.value)} />
                <Textarea id="cad-file-remarks" label="Remarks" rows={2} className="span-2" value={form.remarks} placeholder="Optional notes for the repository record." onChange={(event) => setField('remarks', event.target.value)} />
              </div>
            </Section>

            <Section icon={Layers} title="3. Preview & Validation" subtitle="What this browser can actually render for the selected format">
              {!file ? (
                <p className="cell-muted">Select a file to see its format capability and available browser preview.</p>
              ) : (
                <>
                  <div className="fact-grid">
                    <div className="fact"><span className="fact-label">Detected Format</span><span className="fact-value">{extensionOf(file.name).toUpperCase() || 'Unknown'}</span></div>
                    <div className="fact"><span className="fact-label">File Size</span><span className="fact-value">{formatBytes(file.size)}</span></div>
                    <div className="fact"><span className="fact-label">MIME Type</span><span className="fact-value">{file.type || 'Not reported by browser'}</span></div>
                    <div className="fact"><span className="fact-label">Preview Capability</span><span className="fact-value">{capability?.label}</span></div>
                  </div>
                  <p className={capability?.supported ? 'cad-preview-ok' : 'cad-preview-no'}>{capability?.reason}</p>
                  {capability?.mode === '2d-svg' && previewUrl && (
                    <div className="cad-form-preview"><img src={previewUrl} alt={`Preview of ${file.name}`} /></div>
                  )}
                  {capability?.mode === '2d-image' && previewUrl && (
                    <div className="cad-form-preview"><img src={previewUrl} alt={`Preview of ${file.name}`} /></div>
                  )}
                  {capability?.mode === '2d-pdf' && previewUrl && (
                    <div className="cad-form-preview is-pdf"><iframe title="PDF upload preview" src={previewUrl} /></div>
                  )}
                  {capability?.mode === '3d' && (
                    <p className="cad-note">3D mesh recognised. The saved record opens in the Three.js CAD Viewer; a preview is not rendered inside this form.</p>
                  )}
                  {!capability?.supported && <p className="cad-note">The file will be registered with status Preview Unavailable and remain downloadable. No substitute image is shown.</p>}
                </>
              )}
            </Section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head"><FolderOpen aria-hidden="true" /><strong>Registration Summary</strong></div>
              <div className="mech-aside-body">
                <div className="mech-aside-group"><span className="mech-aside-label">File ID</span><span>{formId}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">File</span><span className="cad-wrap">{form.fileName || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Category</span><span>{form.category || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{form.projectId ? `${form.projectId} · ${projectRecord?.name || 'Project'}` : 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Part</span><span>{form.partNumber ? `${form.partNumber} · ${form.partName}` : 'Not mapped'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Assembly</span><span>{form.assemblyId ? assemblyLabel(assemblies, form.assemblyId) : 'No assembly'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Revision</span><span>Rev {form.revision}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Size</span><span>{file ? formatBytes(file.size) : '—'}</span></div>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head"><CheckCircle2 aria-hidden="true" /><strong>Readiness</strong></div>
              <div className="mech-aside-body">
                <ul className="anl-checklist">
                  <li className={file ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Local file selected</li>
                  <li className={form.fileName.trim() ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />File name recorded</li>
                  <li className={form.projectId ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Project mapped</li>
                  <li className={form.partNumber.trim() ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Part mapped</li>
                  <li className={form.assemblyId ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Parent assembly linked</li>
                </ul>
                <p className="mech-aside-note">Registration does not upload anything. Browser-selected bytes are temporary and disappear on refresh.</p>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head"><Image aria-hidden="true" /><strong>Preview policy</strong></div>
              <div className="mech-aside-body">
                <p className="mech-aside-note">Only verified browser formats are previewable. Unsupported CAD formats are stored, downloadable and clearly labelled. No cloud viewer or server conversion is used.</p>
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
            <Button variant="secondary" icon={Save} onClick={() => save(true, 'register')}>Save as Draft</Button>
            <Button icon={Save} onClick={() => save(false, 'register')}>Save</Button>
            <Button variant="secondary" icon={ArrowRight} onClick={() => save(false, 'viewer')}>Save &amp; Continue</Button>
          </div>
        </div>
      </form>

      <Modal
        open={cancelPrompt}
        onClose={() => setCancelPrompt(false)}
        title="Discard unsaved registration?"
        footer={<><Button variant="ghost" onClick={() => setCancelPrompt(false)}>Keep Editing</Button><Button onClick={() => navigate(projectReturnPath)}>Discard &amp; Leave</Button></>}
      >
        <p className="dash-modal-note">The selected local file and anything typed since the last save will be discarded.</p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
