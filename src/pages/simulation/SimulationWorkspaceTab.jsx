import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Box,
  Camera,
  ChevronDown,
  Download,
  Eraser,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Info,
  Link2,
  Loader2,
  MonitorDown,
  Plus,
  RefreshCw,
  Save,
  ScanEye,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useSimulation } from '../../context/SimulationContext';
import { TODAY, formatDate } from '../../data/projectData';
import {
  ACCEPTED_CAD_EXTENSIONS,
  CAPABILITY_STATUS,
  cadCapability,
  capabilityRows,
} from '../../data/cadCapability';
import {
  MAX_MODEL_BYTES,
  OBSERVATION_CATEGORIES,
  OBSERVATION_STATUSES,
  SEVERITIES,
  formatBytes,
  observationStatusTone,
  severityTone,
} from '../../data/simulationData';
import Viewer2D from '../cad/viewer/Viewer2D';
import Viewer3D from '../cad/viewer/Viewer3D';
import { OpenInCadDialog } from '../cad/OpenInCadSoftware';
import { Toast, useToast } from '../mechanical/mechanicalUi';

const EMPTY_METADATA = {
  units: 'mm',
  scale: '1:1',
  sourceTool: '',
  coordinateSystem: '',
  notes: '',
};

/** Query parameters that commonly carry credentials or signed access. */
const SENSITIVE_URL_PARAMS = [
  'token',
  'access_token',
  'id_token',
  'auth',
  'apikey',
  'api_key',
  'key',
  'sig',
  'signature',
  'password',
  'session',
  'sessionid',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
];

/**
 * Validate a pasted URL and strip credential-like query parameters before it
 * is stored. Credentials, negative parameters and inline user info are never
 * persisted.
 */
function cleanUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return { error: 'Paste a CAD viewer or model URL first.' };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { error: 'This is not a valid absolute URL. Include https:// and the full address.' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { error: 'Only http:// and https:// URLs can be previewed.' };
  }
  if (parsed.username || parsed.password) {
    return {
      error:
        'This URL contains credentials. Remove the username/password and use a public link — credentials are never stored.',
    };
  }
  const removed = [];
  [...parsed.searchParams.keys()].forEach((key) => {
    if (SENSITIVE_URL_PARAMS.includes(key.toLowerCase())) {
      removed.push(key);
      parsed.searchParams.delete(key);
    }
  });
  return { url: parsed.toString(), removed };
}

/** Classify a URL as a direct CAD file, an unsupported file or a web viewer. */
function classifyCadUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: 'viewer', fileName: url, extension: '' };
  }
  const last = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
  if (!last || !/\.[a-z0-9]{1,8}$/i.test(last)) {
    return { kind: 'viewer', fileName: parsed.hostname, extension: '' };
  }
  const extension = last.split('.').pop().toLowerCase();
  const capability = cadCapability(last);
  return { kind: 'file', fileName: last, extension, capability };
}

function attachmentMeta(file, by = 'Design Engineer') {
  return { name: file.name, size: file.size, type: file.type || 'file', by, at: TODAY };
}

function CapabilityBadge({ fileName, previewFileName }) {
  const capability = cadCapability(previewFileName || fileName);
  const status = previewFileName ? CAPABILITY_STATUS.converted : CAPABILITY_STATUS[capability.status] || CAPABILITY_STATUS.unsupported;
  return (
    <span className={`chip chip-${status.tone === 'red' ? 'red' : status.tone === 'amber' ? 'amber' : status.tone === 'blue' ? 'blue' : 'mint'}`}>
      {status.label}
    </span>
  );
}

function ObservationModal({
  open,
  onClose,
  onSave,
  observation,
  defaults,
  designs,
  projects,
  models,
  parts,
  assemblies,
}) {
  const [form, setForm] = useState(() => ({
    title: '',
    description: '',
    component: '',
    category: OBSERVATION_CATEGORIES[0],
    severity: 'Minor',
    location: '',
    status: 'Open',
    remarks: '',
    projectId: defaults?.projectId || '',
    designId: defaults?.designId || '',
    revision: defaults?.revision || '',
    modelId: defaults?.modelId || '',
    partId: defaults?.partId || '',
    assemblyId: defaults?.assemblyId || '',
    screenshot: null,
    attachment: null,
    ...(observation || {}),
  }));

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const design = designs.find((row) => row.id === form.designId);

  const attach = (key, file) => {
    if (!file) return;
    setField(key, attachmentMeta(file, form.reportedBy || 'Design Engineer'));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={observation ? `Edit observation · ${observation.id}` : 'New inspection observation'}
      subtitle={design ? `${design.id} · Rev ${form.revision || design.revision}` : 'Select the project and design this observation belongs to'}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={Save}
            onClick={() => {
              if (!form.title.trim() || !form.designId) return;
              onSave(form);
            }}
          >
            {observation ? 'Save Observation' : 'Record Observation'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Input
          id="obs-title"
          label="Title"
          value={form.title}
          onChange={(event) => setField('title', event.target.value)}
        />
        <Select
          id="obs-severity"
          label="Severity"
          options={SEVERITIES.map((severity) => ({ value: severity, label: severity }))}
          value={form.severity}
          onChange={(event) => setField('severity', event.target.value)}
        />
        <Select
          id="obs-project"
          label="Project"
          options={[
            { value: '', label: 'Select project' },
            ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
          ]}
          value={form.projectId}
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
          id="obs-design"
          label="Mechanical Design"
          options={[
            { value: '', label: 'Select design' },
            ...designs
              .filter((row) => !form.projectId || row.projectId === form.projectId)
              .map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
          ]}
          value={form.designId}
          onChange={(event) => {
            const next = designs.find((row) => row.id === event.target.value);
            setForm((previous) => ({
              ...previous,
              designId: event.target.value,
              projectId: next?.projectId || previous.projectId,
              revision: next?.revision || '',
              modelId: '',
            }));
          }}
        />
        <Select
          id="obs-revision"
          label="Design Revision"
          options={(design?.revisions || [{ revision: design?.revision || 'A' }]).map((entry) => ({
            value: entry.revision,
            label: `Rev ${entry.revision}`,
          }))}
          value={form.revision}
          onChange={(event) => setField('revision', event.target.value)}
        />
        <Select
          id="obs-model"
          label="Uploaded / Linked CAD File"
          options={[
            { value: '', label: 'No model reference' },
            ...models
              .filter((row) => !form.designId || row.designId === form.designId)
              .map((row) => ({ value: row.id, label: `${row.id} · ${row.fileName}` })),
          ]}
          value={form.modelId}
          onChange={(event) => setField('modelId', event.target.value)}
        />
        <Select
          id="obs-part"
          label="Part Reference"
          options={[
            { value: '', label: 'Not specific to a part' },
            ...parts
              .filter((row) => !form.projectId || row.projectId === form.projectId)
              .map((row) => ({ value: row.id, label: `${row.partNumber} · ${row.name}` })),
          ]}
          value={form.partId}
          onChange={(event) => setField('partId', event.target.value)}
        />
        <Select
          id="obs-assembly"
          label="Assembly Reference"
          options={[
            { value: '', label: 'Not specific to an assembly' },
            ...assemblies
              .filter((row) => !form.projectId || row.projectId === form.projectId)
              .map((row) => ({ value: row.id, label: `${row.number} · ${row.name}` })),
          ]}
          value={form.assemblyId}
          onChange={(event) => setField('assemblyId', event.target.value)}
        />
        <Input
          id="obs-component"
          label="Component Reference"
          placeholder="e.g. Bearing cover, bolt circle Ø145"
          value={form.component}
          onChange={(event) => setField('component', event.target.value)}
        />
        <Input
          id="obs-location"
          label="Location / Reference"
          placeholder="e.g. Drive end, drawing DRW-041-021 Rev C"
          value={form.location}
          onChange={(event) => setField('location', event.target.value)}
        />
        <Select
          id="obs-category"
          label="Issue Category"
          options={OBSERVATION_CATEGORIES.map((category) => ({ value: category, label: category }))}
          value={form.category}
          onChange={(event) => setField('category', event.target.value)}
        />
        <Select
          id="obs-status"
          label="Status"
          options={OBSERVATION_STATUSES.map((status) => ({ value: status, label: status }))}
          value={form.status}
          onChange={(event) => setField('status', event.target.value)}
        />
        <div className="form-grid-full">
          <Textarea
            id="obs-description"
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        </div>
        <div className="form-grid-full">
          <Textarea
            id="obs-remarks"
            label="Remarks"
            rows={2}
            value={form.remarks}
            onChange={(event) => setField('remarks', event.target.value)}
          />
        </div>
        <div className="form-field">
          <span className="form-label">Screenshot</span>
          <label className="attachment-picker">
            <Camera aria-hidden="true" />
            <span>{form.screenshot?.name || 'Attach screenshot'}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => attach('screenshot', event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="form-field">
          <span className="form-label">Supporting Attachment</span>
          <label className="attachment-picker">
            <FileText aria-hidden="true" />
            <span>{form.attachment?.name || 'Attach supporting document'}</span>
            <input
              type="file"
              className="sr-only"
              onChange={(event) => attach('attachment', event.target.files?.[0])}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}

export default function SimulationWorkspaceTab() {
  const repositoryColumns = useTableColumnVisibility('simulation.workspace#repository-files', [
    { key: 'file', label: 'File' },
    { key: 'format', label: 'Format' },
    { key: 'revision', label: 'Revision' },
    { key: 'rendering', label: 'Rendering' },
    { key: 'action', label: 'Action' },
  ], { mandatory: ['action'] });
  const { projects } = useProjects();
  const { designs, parts, assemblies } = useMechanical();
  const { files: cadFiles, localFiles: cadLocalFiles } = useCad();
  const {
    models,
    observations,
    localFiles,
    addModel,
    updateModel,
    removeModel,
    attachPreview,
    removePreview,
    addObservation,
    updateObservation,
    nextModelId,
    nextObservationId,
  } = useSimulation();
  const { toast, showToast, clearToast } = useToast();

  const [searchParams] = useSearchParams();
  const requestedDesign = designs.find((row) => row.id === searchParams.get('design'));
  const initialProjectId =
    projects.find((row) => row.id === searchParams.get('project'))?.id ||
    requestedDesign?.projectId ||
    projects[0]?.id ||
    '';
  const initialDesign = requestedDesign || designs.find((row) => row.projectId === initialProjectId);

  const [projectId, setProjectId] = useState(initialProjectId);
  const projectDesigns = designs.filter((design) => design.projectId === projectId);
  const [designId, setDesignId] = useState(initialDesign?.id || '');
  const design = designs.find((row) => row.id === designId);
  const [revision, setRevision] = useState(initialDesign?.revision || '');
  const revisions = design?.revisions?.length
    ? design.revisions.map((entry) => entry.revision)
    : [design?.revision || 'A'];

  const [partId, setPartId] = useState('');
  const [assemblyId, setAssemblyId] = useState('');
  const projectParts = parts.filter((row) => row.projectId === projectId);
  const projectAssemblies = assemblies.filter((row) => row.projectId === projectId);

  const designModels = models.filter(
    (model) => model.designId === designId && (!revision || model.revision === revision),
  );
  const [modelId, setModelId] = useState('');
  const model = models.find((row) => row.id === modelId) || null;
  const localFile = model ? localFiles[model.id] : null;
  const capability = model
    ? cadCapability(model.previewFileName || model.fileName)
    : null;

  const viewerSource = (() => {
    if (!model) return '';
    if (model.source === 'url') return model.url || '';
    if (localFile?.previewUrl) return localFile.previewUrl;
    if (localFile?.url) return localFile.url;
    return model.assetPath || '';
  })();
  const viewerName = model?.previewFileName || model?.fileName || '';

  const [uploadFile, setUploadFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState(EMPTY_METADATA);
  const [uploadError, setUploadError] = useState('');
  const [uploadWarning, setUploadWarning] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlNotice, setUrlNotice] = useState('');
  const [urlReloadKey, setUrlReloadKey] = useState(0);
  const [embedState, setEmbedState] = useState('idle');

  const [observationModal, setObservationModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewChoice, setPreviewChoice] = useState(null);
  const [repoOpen, setRepoOpen] = useState(false);
  const [registryOpen, setRegistryOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] = useState(null);
  const [openCadTarget, setOpenCadTarget] = useState(null);

  const selectProject = (value) => {
    const nextDesign = designs.find((row) => row.projectId === value);
    setProjectId(value);
    setDesignId(nextDesign?.id || '');
    setRevision(nextDesign?.revision || '');
    setPartId('');
    setAssemblyId('');
    setModelId('');
  };
  const selectDesign = (value) => {
    const next = designs.find((row) => row.id === value);
    setDesignId(value);
    setProjectId(next?.projectId || projectId);
    setRevision(next?.revision || '');
    setPartId('');
    setAssemblyId('');
    setModelId('');
  };

  const designObservations = observations.filter(
    (row) => row.designId === designId && (!revision || row.revision === revision),
  );

  const repositoryFiles = useMemo(
    () =>
      cadFiles.filter((file) => file.projectId === projectId),
    [cadFiles, projectId],
  );

  const pickUpload = (file) => {
    setUploadError('');
    setUploadWarning('');
    if (!file) {
      setUploadFile(null);
      return;
    }
    const cap = cadCapability(file.name);
    if (file.size > MAX_MODEL_BYTES) {
      setUploadFile(null);
      setUploadError(`${formatBytes(file.size)} exceeds the ${formatBytes(MAX_MODEL_BYTES)} upload limit.`);
      return;
    }
    setUploadFile(file);
    if (!cap.supported) setUploadWarning(cap.reason);
  };

  const upload = () => {
    if (!uploadFile || !projectId || !designId) {
      setUploadError('Select a project, design and CAD file before uploading.');
      return;
    }
    const cap = cadCapability(uploadFile.name);
    const previewCap = previewFile ? cadCapability(previewFile.name) : null;
    if (previewFile && !previewCap?.supported) {
      setUploadError('The converted preview must itself be a renderable format (PDF, SVG, DXF, image, GLB or glTF).');
      return;
    }
    const id = nextModelId();
    addModel(
      {
        id,
        projectId,
        designId,
        revision,
        partId,
        assemblyId,
        fileName: uploadFile.name,
        format: uploadFile.name.split('.').pop().toLowerCase(),
        size: uploadFile.size,
        uploadedBy: 'D. Rao',
        uploadedAt: TODAY,
        metadata: { ...uploadMeta },
        notes: '',
        observations: [],
        source: 'upload',
        originalPreserved: true,
        capabilityStatus: cap.status,
        capabilityMode: cap.mode,
        capabilityLabel: cap.label,
        renderer: cap.renderer,
        unsupportedReason: cap.supported ? '' : cap.reason,
        previewFileName: previewFile?.name || '',
        previewSize: previewFile?.size || 0,
        previewFormat: previewFile ? previewFile.name.split('.').pop().toLowerCase() : '',
        previewAttachedAt: previewFile ? TODAY : '',
      },
      uploadFile,
    );
    if (previewFile) {
      attachPreview(id, previewFile, {
        previewFormat: previewFile.name.split('.').pop().toLowerCase(),
      });
    }
    setModelId(id);
    setUploadFile(null);
    setPreviewFile(null);
    setUploadMeta(EMPTY_METADATA);
    setUploadWarning('');
    showToast(
      cap.supported
        ? `${uploadFile.name} uploaded and ready to inspect.`
        : `${uploadFile.name} registered as an original file. ${previewFile ? 'Converted preview attached.' : 'Attach a converted preview to view it.'}`,
      cap.supported ? 'success' : 'error',
    );
  };

  const previewFromUrl = async () => {
    setUrlError('');
    setUrlNotice('');
    if (!designId || !projectId) {
      setUrlError('Select a project and mechanical design before previewing a URL.');
      return;
    }
    const cleaned = cleanUrl(urlInput);
    if (cleaned.error) {
      setUrlError(cleaned.error);
      return;
    }
    const { url, removed } = cleaned;
    const classification = classifyCadUrl(url);
    const cap = classification.capability || null;
    if (classification.kind === 'file' && cap?.supported) {
      try {
        const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
        if (!response.ok) {
          setUrlError(`This URL is unavailable (HTTP ${response.status}). Check the link, sharing or expiry.`);
          return;
        }
        const mime = (response.headers.get('content-type') || '').toLowerCase();
        if (
          mime.includes('text/html') &&
          !['html', 'htm', 'pdf', 'svg'].includes(classification.extension)
        ) {
          setUrlError(
            'This URL returns a web page rather than a CAD file. The link may need sign-in, has expired, or points at a viewer page.',
          );
          return;
        }
      } catch {
        // Cross-origin hosts without CORS headers cannot be probed; the viewer
        // reports the load failure after its own fetch instead.
      }
    }
    const existing = models.find(
      (row) => row.source === 'url' && row.url === url && row.designId === designId && row.revision === revision,
    );
    if (removed.length) {
      setUrlNotice(`Removed credential-like parameters before storing: ${removed.join(', ')}.`);
    }
    if (existing) {
      updateModel(existing.id, {
        urlKind: classification.kind,
        fileName: classification.fileName,
        format: classification.extension || 'url',
        capabilityStatus:
          classification.kind === 'viewer' ? 'external' : cap?.status || 'unsupported',
        capabilityMode: cap?.mode || 'none',
        capabilityLabel: cap?.label || 'External CAD viewer',
        renderer: cap?.renderer || 'Embedded external viewer (provider dependent)',
        unsupportedReason:
          classification.kind === 'viewer'
            ? 'External browser CAD application — embedded preview depends on the provider allowing iframes.'
            : cap?.reason || '',
      });
      setModelId(existing.id);
      setUrlReloadKey((value) => value + 1);
      setEmbedState(classification.kind === 'viewer' ? 'loading' : 'idle');
      return;
    }
    const id = nextModelId();
    addModel(
      {
        id,
        projectId,
        designId,
        revision,
        partId,
        assemblyId,
        fileName: classification.fileName,
        format: classification.extension || 'url',
        size: 0,
        uploadedBy: 'D. Rao',
        uploadedAt: TODAY,
        metadata: { ...uploadMeta, sourceTool: uploadMeta.sourceTool || 'External URL' },
        notes: 'URL reference — no file downloaded or duplicated.',
        observations: [],
        source: 'url',
        url,
        urlKind: classification.kind,
        capabilityStatus:
          classification.kind === 'viewer' ? 'external' : cap?.status || 'unsupported',
        capabilityMode: cap?.mode || 'none',
        capabilityLabel: cap?.label || 'External CAD viewer',
        renderer: cap?.renderer || 'Embedded external viewer (provider dependent)',
        unsupportedReason:
          classification.kind === 'viewer'
            ? 'External browser CAD application — embedded preview depends on the provider allowing iframes.'
            : cap?.reason || '',
      },
      null,
    );
    setModelId(id);
    setUrlReloadKey(0);
    setEmbedState('loading');
    showToast(
      classification.kind === 'viewer'
        ? 'External viewer URL registered. Attempting embedded preview.'
        : cap?.supported
          ? 'Direct CAD file URL registered. Loading preview.'
          : 'URL registered, but this file type has no in-app renderer.',
      classification.kind === 'viewer' || cap?.supported ? 'success' : 'error',
    );
  };

  const openRepositoryFile = (file) => {
    const existing = models.find((row) => row.cadFileId === file.id && row.designId === designId);
    if (existing) {
      setModelId(existing.id);
      setRepoOpen(false);
      return;
    }
    const cap = cadCapability(file.fileName);
    const id = nextModelId();
    addModel(
      {
        id,
        cadFileId: file.id,
        projectId,
        designId,
        revision: revision || file.revision,
        partId: '',
        assemblyId: file.assemblyId || '',
        fileName: file.fileName,
        format: file.fileName.split('.').pop().toLowerCase(),
        size: file.size,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        metadata: {
          units: 'mm',
          scale: '1:1',
          sourceTool: 'Module 10 CAD repository',
          coordinateSystem: '',
          notes: file.description || '',
        },
        notes: 'Linked from the Drawing & CAD Management repository — no duplicate upload.',
        observations: [],
        source: 'repository',
        assetPath: file.assetPath || '',
        sheets: file.sheets || [],
        capabilityStatus: cap.status,
        capabilityMode: cap.mode,
        capabilityLabel: cap.label,
        renderer: cap.renderer,
        unsupportedReason: cap.supported ? '' : cap.reason,
        previewFileName: '',
        previewSize: 0,
      },
      null,
    );
    setModelId(id);
    setRepoOpen(false);
    showToast(`${file.id} linked into the simulation workspace.`);
  };

  /**
   * Shared "Open in CAD Software" target for a simulation record. Only the
   * actual selected original file reference is passed — never a converted
   * preview, and never a URL record, which stays an external link.
   */
  const openInCadTargetFor = (target) => {
    if (!target || target.source === 'url') return null;
    const sessionEntry = localFiles[target.id] || null;
    return {
      id: target.id,
      fileName: target.fileName,
      assetPath: target.assetPath || '',
      localEntry: sessionEntry,
      recordRef: target.id,
      sourceModule: 'Engineering Analysis → Simulation Workspace',
      sourceRef: target.id,
      context: [
        { label: 'Project ID', value: target.projectId },
        { label: 'Design ID', value: target.designId },
        { label: 'Simulation revision', value: target.revision ? `Rev ${target.revision}` : '' },
        { label: 'Part ID', value: target.partId },
        { label: 'Assembly ID', value: target.assemblyId },
        { label: 'CAD file record', value: target.cadFileId || '' },
        {
          label: 'File reference',
          value: target.assetPath
            ? 'Stored original file'
            : sessionEntry?.url
              ? 'Browser session upload'
              : 'Not stored',
        },
      ].filter((row) => row.value),
    };
  };

  const downloadOriginal = (target) => {    const url = localFiles[target.id]?.url || target.assetPath || target.url;
    if (!url) {
      showToast('The original bytes are not available in this browser session; only the record is stored.', 'error');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = target.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setDownloadTarget(null);
  };

  const saveObservation = (form) => {
    if (observationModal?.mode === 'edit') {
      updateObservation(observationModal.id, form, 'Observation details updated.');
      showToast(`${observationModal.id} updated.`);
    } else {
      addObservation({
        ...form,
        id: nextObservationId(),
        reportedBy: 'D. Rao',
        reportedAt: TODAY,
        modelId: form.modelId || modelId,
      });
      showToast('Observation recorded.');
    }
    setObservationModal(null);
  };

  const modelColumns = [
    { key: 'id', label: 'Record ID', width: 108, render: (row) => <span className="cell-id">{row.id}</span> },
    {
      key: 'fileName',
      label: 'File',
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.fileName}>
          {row.fileName}
        </span>
      ),
    },
    { key: 'format', label: 'Format', width: 76, render: (row) => <span className="chip">{(row.format || '').toUpperCase()}</span> },
    {
      key: 'capability',
      label: 'Rendering',
      width: 160,
      render: (row) =>
        row.urlKind === 'viewer' ? (
          <span className="chip chip-amber">External viewer</span>
        ) : (
          <CapabilityBadge fileName={row.fileName} previewFileName={row.previewFileName} />
        ),
    },
    {
      key: 'size',
      label: 'Size',
      width: 82,
      render: (row) => (row.source === 'url' ? <span className="cell-muted">Remote</span> : formatBytes(row.size)),
    },
    { key: 'uploadedAt', label: 'Date', width: 96, render: (row) => formatDate(row.uploadedAt) },
    { key: 'uploadedBy', label: 'By', width: 96 },
    {
      key: 'source',
      label: 'Source',
      width: 96,
      render: (row) => (
        <span className="cell-muted">
          {row.source === 'repository' ? 'Module 10' : row.source === 'url' ? 'URL' : 'Upload'}
        </span>
      ),
    },
  ];

  const observationColumns = [
    { key: 'id', label: 'Observation', width: 112, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'title', label: 'Title', render: (row) => <span className="cell-strong cell-clamp">{row.title}</span> },
    { key: 'category', label: 'Category' },
    { key: 'component', label: 'Component', render: (row) => <span className="cell-muted cell-clamp">{row.component || '—'}</span> },
    { key: 'severity', label: 'Severity', width: 96, render: (row) => <StatusBadge status={row.severity} tone={severityTone(row.severity)} /> },
    { key: 'status', label: 'Status', width: 104, render: (row) => <StatusBadge status={row.status} tone={observationStatusTone(row.status)} /> },
    { key: 'reportedAt', label: 'Recorded', width: 96, render: (row) => formatDate(row.reportedAt) },
  ];

  return (
    <>
      <div className="sim-selection">
        <Select
          id="sim-project"
          label="Project"
          options={projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))}
          value={projectId}
          onChange={(event) => selectProject(event.target.value)}
        />
        <Select
          id="sim-design"
          label="Mechanical Design"
          options={[
            { value: '', label: projectDesigns.length ? 'Select design' : 'No designs for this project' },
            ...projectDesigns.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
          ]}
          value={designId}
          onChange={(event) => selectDesign(event.target.value)}
        />
        <Select
          id="sim-revision"
          label="Design Revision"
          options={revisions.map((value) => ({ value, label: `Rev ${value}` }))}
          value={revision}
          onChange={(event) => {
            setRevision(event.target.value);
            setModelId('');
          }}
        />
        <Select
          id="sim-part"
          label="Part / Assembly"
          options={[
            { value: '', label: 'Assembly / whole design' },
            ...projectAssemblies.map((row) => ({ value: `as:${row.id}`, label: `${row.number} · ${row.name}` })),
            ...projectParts.map((row) => ({ value: `pt:${row.id}`, label: `${row.partNumber} · ${row.name}` })),
          ]}
          value={assemblyId ? `as:${assemblyId}` : partId ? `pt:${partId}` : ''}
          onChange={(event) => {
            const value = event.target.value;
            setAssemblyId(value.startsWith('as:') ? value.slice(3) : '');
            setPartId(value.startsWith('pt:') ? value.slice(3) : '');
          }}
        />
      </div>

      <div className="sim-grid">
        <Card className="sim-panel">
          <header className="sim-panel-head">
            <strong>CAD File Source</strong>
            <span className="cell-muted">Upload or link</span>
          </header>
          <div className="sim-panel-body">
            <Button variant="secondary" icon={FolderOpen} onClick={() => setRepoOpen(true)}>
              Open Existing CAD File (Module 10)
            </Button>
            <p className="sim-note">
              Existing repository files stay owned by Drawing &amp; CAD Management; selecting one
              links it here without duplicating the upload.
            </p>

            <label className="attachment-picker">
              <Upload aria-hidden="true" />
              <span>{uploadFile ? uploadFile.name : 'Upload a 2D drawing or 3D CAD file'}</span>
              <input
                type="file"
                accept={ACCEPTED_CAD_EXTENSIONS}
                className="sr-only"
                onChange={(event) => pickUpload(event.target.files?.[0])}
              />
            </label>
            {uploadFile && (
              <p className="form-hint">
                {formatBytes(uploadFile.size)} · {uploadFile.name.split('.').pop().toUpperCase()} ·{' '}
                {cadCapability(uploadFile.name).label}
              </p>
            )}
            {uploadWarning && (
              <div className="form-banner error" role="status">
                <AlertTriangle aria-hidden="true" />
                <span>{uploadWarning}</span>
              </div>
            )}
            {uploadError && (
              <div className="form-banner error" role="status">
                <AlertTriangle aria-hidden="true" />
                <span>{uploadError}</span>
              </div>
            )}
            <div className="form-grid">
              <Input
                id="sim-upload-units"
                label="Units"
                value={uploadMeta.units}
                onChange={(event) => setUploadMeta((previous) => ({ ...previous, units: event.target.value }))}
              />
              <Input
                id="sim-upload-scale"
                label="Scale"
                value={uploadMeta.scale}
                onChange={(event) => setUploadMeta((previous) => ({ ...previous, scale: event.target.value }))}
              />
              <Input
                id="sim-upload-tool"
                label="Source Tool"
                placeholder="e.g. SolidWorks, CATIA, Creo"
                value={uploadMeta.sourceTool}
                onChange={(event) => setUploadMeta((previous) => ({ ...previous, sourceTool: event.target.value }))}
              />
              <Input
                id="sim-upload-origin"
                label="Coordinate Reference"
                value={uploadMeta.coordinateSystem}
                onChange={(event) =>
                  setUploadMeta((previous) => ({ ...previous, coordinateSystem: event.target.value }))
                }
              />
              <div className="form-grid-full">
                <Textarea
                  id="sim-upload-notes"
                  label="Model Metadata Notes"
                  rows={2}
                  placeholder="Tessellation, export settings, units and coordinate notes"
                  value={uploadMeta.notes}
                  onChange={(event) => setUploadMeta((previous) => ({ ...previous, notes: event.target.value }))}
                />
              </div>
              <div className="form-grid-full">
                <label className="attachment-picker">
                  <FileText aria-hidden="true" />
                  <span>{previewFile ? `Preview: ${previewFile.name}` : 'Attach converted preview (optional)'}</span>
                  <input
                    type="file"
                    accept=".pdf,.svg,.dxf,.png,.jpg,.jpeg,.webp,.glb,.gltf,.stl,.obj,.ply,.step,.stp,.iges,.igs,.3mf,.fbx"
                    className="sr-only"
                    onChange={(event) => setPreviewFile(event.target.files?.[0] || null)}
                  />
                </label>
                <span className="form-hint">
                  For native CAD or DWG files that this frontend cannot parse, export a GLB/glTF or
                  PDF/SVG/DXF preview from the CAD tool and attach it here. The original file is kept
                  unchanged and the preview is labelled converted.
                </span>
              </div>
            </div>
            <Button icon={Upload} onClick={upload} disabled={!uploadFile}>
              Upload CAD File
            </Button>
            <p className="sim-note">
              Files are held in this browser session only. Registered files, their metadata and the
              original filename are persisted; browser storage cannot keep large binaries.
            </p>

            <div className={`sim-url-section${urlOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="sim-url-head"
                aria-expanded={urlOpen}
                onClick={() => setUrlOpen((value) => !value)}
              >
                <Link2 aria-hidden="true" />
                <strong>Through URL</strong>
                <span>External CAD viewer or model URL</span>
                <ChevronDown aria-hidden="true" />
              </button>
              <div className={`sim-url-collapse${urlOpen ? ' is-open' : ''}`} aria-hidden={!urlOpen}>
                <div className="sim-url-collapse-inner" inert={!urlOpen}>
                <div className="sim-url-body">
                  <Input
                    id="sim-url"
                    label="URL"
                    placeholder="Paste external CAD viewer or model URL"
                    value={urlInput}
                    onChange={(event) => {
                      setUrlInput(event.target.value);
                      setUrlError('');
                      setUrlNotice('');
                    }}
                    hint={
                      urlError ||
                      'Direct file URLs (STEP, STL, OBJ, GLB, PDF, DXF…) render in the viewer. Browser CAD apps are embedded only when the provider allows it.'
                    }
                    aria-invalid={Boolean(urlError)}
                  />
                  <div className="sim-url-actions">
                    <Button icon={Eye} onClick={previewFromUrl} disabled={!urlInput.trim()}>
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      icon={Eraser}
                      onClick={() => {
                        setUrlInput('');
                        setUrlError('');
                        setUrlNotice('');
                        setEmbedState('idle');
                        if (model?.source === 'url') setModelId('');
                        showToast('URL preview cleared. Stored URL records are kept.');
                      }}
                    >
                      Clear URL
                    </Button>
                  </div>
                  {urlError && (
                    <div className="form-banner error" role="status">
                      <AlertTriangle aria-hidden="true" />
                      <span>{urlError}</span>
                    </div>
                  )}
                  {urlNotice && (
                    <div className="form-banner error" role="status">
                      <AlertTriangle aria-hidden="true" />
                      <span>{urlNotice}</span>
                    </div>
                  )}
                  <p className="sim-note">
                    Credentials, session tokens and signed query parameters are never stored. The URL
                    is saved with the selected project, design, revision and part/assembly.
                  </p>
                </div>
                </div>
              </div>
            </div>

            <Button variant="ghost" icon={Info} onClick={() => setRegistryOpen((value) => !value)}>
              {registryOpen ? 'Hide' : 'Show'} format capability registry
            </Button>
          </div>
        </Card>

        <Card className="sim-panel sim-viewer-panel">
          <header className="sim-panel-head">
            <strong>
              {model?.urlKind === 'viewer'
                ? 'External CAD Viewer'
                : capability?.kind === '2d'
                  ? '2D Drawing Viewer'
                  : '3D Model Viewer'}
            </strong>
            {model && <span className="cell-id">{model.id}</span>}
            {model && model.source !== 'url' && (
              <div className="sim-panel-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={MonitorDown}
                  onClick={() => setOpenCadTarget(openInCadTargetFor(model))}
                >
                  Open in CAD Software
                </Button>
              </div>
            )}
          </header>
          <div className="sim-panel-body">
            {!model && <p className="dash-modal-note">Select or upload a CAD file to inspect it.</p>}
            {model && (
              <>
                <div className="sim-model-line">
                  <strong>{viewerName}</strong>
                  <span className="cell-muted">
                    {(model.urlKind === 'viewer'
                      ? 'External viewer'
                      : (model.previewFormat || model.format || '').toUpperCase())}{' '}
                    ·{' '}
                    {model.source === 'url'
                      ? 'remote'
                      : formatBytes(model.previewFileName ? model.previewSize || model.size : model.size)}{' '}
                    · Rev {model.revision}
                  </span>
                  {model.urlKind === 'viewer' ? (
                    <span className="chip chip-amber">External viewer</span>
                  ) : (
                    <CapabilityBadge fileName={model.fileName} previewFileName={model.previewFileName} />
                  )}
                </div>
                {model.previewFileName && (
                  <p className="sim-note">
                    Showing the converted preview <strong>{model.previewFileName}</strong>. The original{' '}
                    <strong>{model.fileName}</strong> is preserved and remains the authoritative file.
                  </p>
                )}
                {model.source === 'url' && (
                  <div className="sim-url-viewer-bar">
                    <span className="cell-id">
                      {model.urlKind === 'viewer' ? 'External viewer URL' : 'Direct CAD file URL'}
                    </span>
                    <span className="cell-muted cell-clamp" title={model.url}>
                      {model.url}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => {
                        setEmbedState('loading');
                        setUrlReloadKey((value) => value + 1);
                      }}
                    >
                      Reload
                    </Button>
                    <a
                      className="sim-link"
                      href={model.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <ExternalLink aria-hidden="true" /> Open in new tab
                    </a>
                  </div>
                )}
                {model.urlKind === 'viewer' && (
                  <div className="sim-embed">
                    {embedState === 'loading' && (
                      <p className="sim-note">
                        <Loader2 aria-hidden="true" className="sim-spin" /> Requesting embedded preview…
                      </p>
                    )}
                    <iframe
                      key={`${model.id}-${urlReloadKey}`}
                      title={`External CAD viewer — ${model.fileName}`}
                      src={model.url}
                      className="sim-embed-frame"
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                      onLoad={() => setEmbedState('loaded')}
                      onError={() => setEmbedState('blocked')}
                    />
                    <div className="sim-embed-note">
                      <strong>Embedded preview is provider-controlled</strong>
                      <p>
                        This CAD application does not allow embedded preview.
                      </p>
                      <p className="cell-muted">
                        That message applies whenever the frame above stays blank: providers can send
                        X-Frame-Options, CSP frame-ancestors or authentication requirements that no
                        browser can bypass. No credentials or session tokens are requested or stored.
                      </p>
                      <Button
                        variant="secondary"
                        icon={ExternalLink}
                        onClick={() => window.open(model.url, '_blank', 'noopener,noreferrer')}
                      >
                        Open External CAD Viewer
                      </Button>
                    </div>
                  </div>
                )}
                {model.urlKind !== 'viewer' && !viewerSource && (
                  <div className="sim-viewer-blocked" role="status">
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <strong>No file bytes are available in this session</strong>
                      <p>
                        The record and metadata are stored, but this browser session does not hold the
                        file. Re-upload the file or link a Module 10 sample to render it.
                      </p>
                      <Button variant="secondary" icon={Download} onClick={() => setDownloadTarget(model)}>
                        Download original
                      </Button>
                    </div>
                  </div>
                )}
                {viewerSource && capability?.supported && capability?.kind === '2d' && (
                  <Viewer2D
                    key={`${model.id}-${urlReloadKey}`}
                    file={{ id: model.id, fileName: viewerName }}
                    sources={
                      model.sheets?.length
                        ? model.sheets.map((sheet) => ({
                            name: sheet.name || 'Sheet',
                            url: sheet.assetPath,
                            assetPath: sheet.assetPath,
                          }))
                        : [{ name: viewerName, url: viewerSource, assetPath: viewerSource }]
                    }
                    onNotify={(message, tone) => showToast(message, tone)}
                  />
                )}
                {viewerSource && capability?.supported && capability?.kind === '3d' && (
                  <Viewer3D
                    key={`${model.id}-${urlReloadKey}`}
                    file={{ id: model.id, fileName: viewerName, partName: model.parts }}
                    source={{ name: viewerName, url: viewerSource }}
                    onNotify={(message, tone) => showToast(message, tone)}
                  />
                )}
                {model.urlKind !== 'viewer' && viewerSource && !capability?.supported && (
                  <div className="sim-viewer-blocked" role="status">
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <strong>No in-app rendering path for this format</strong>
                      <p>{model.unsupportedReason || capability?.reason}</p>
                      <p className="cell-muted">
                        {model.source === 'url'
                          ? 'The external URL is stored as a reference only; no file is downloaded or duplicated. Open it in its native CAD tool or attach a converted preview.'
                          : 'The original file is kept as a record and can be downloaded or opened in its native CAD tool. Attach a converted GLB/glTF or PDF/SVG/DXF preview to render it here.'}
                      </p>
                      <div className="sim-detail-actions">
                        {model.source === 'url' ? (
                          <Button
                            variant="secondary"
                            icon={ExternalLink}
                            onClick={() => window.open(model.url, '_blank', 'noopener,noreferrer')}
                          >
                            Open external URL
                          </Button>
                        ) : (
                          <Button variant="secondary" icon={Download} onClick={() => setDownloadTarget(model)}>
                            Download original
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          icon={Upload}
                          onClick={() => {
                            setPreviewChoice(null);
                            setPreviewTarget(model);
                          }}
                        >
                          Attach converted preview
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <dl className="sim-meta">
                  <div>
                    <dt>Units</dt>
                    <dd>{model.metadata?.units || '—'}</dd>
                  </div>
                  <div>
                    <dt>Scale</dt>
                    <dd>{model.metadata?.scale || '—'}</dd>
                  </div>
                  <div>
                    <dt>Source tool</dt>
                    <dd>{model.metadata?.sourceTool || '—'}</dd>
                  </div>
                  <div>
                    <dt>Coordinate reference</dt>
                    <dd>{model.metadata?.coordinateSystem || '—'}</dd>
                  </div>
                  <div>
                    <dt>Part / Assembly</dt>
                    <dd>
                      {parts.find((row) => row.id === model.partId)?.partNumber ||
                        assemblies.find((row) => row.id === (model.assemblyId || assemblyId))?.number ||
                        model.parts ||
                        'Assembly level'}
                    </dd>
                  </div>
                  <div>
                    <dt>Uploaded</dt>
                    <dd>
                      {formatDate(model.uploadedAt)} · {model.uploadedBy}
                    </dd>
                  </div>
                  <div>
                    <dt>Rendering</dt>
                    <dd>{model.renderer || capability?.renderer || '—'}</dd>
                  </div>
                  {model.metadata?.notes && (
                    <div className="sim-meta-full">
                      <dt>Metadata notes</dt>
                      <dd>{model.metadata.notes}</dd>
                    </div>
                  )}
                </dl>
                <div className="sim-detail-actions">
                  {model.previewFileName ? (
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => {
                        removePreview(model.id);
                        showToast('Converted preview detached. Original file kept.');
                      }}
                    >
                      Detach preview
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      icon={Upload}
                      onClick={() => {
                        setPreviewChoice(null);
                        setPreviewTarget(model);
                      }}
                    >
                      Attach converted preview
                    </Button>
                  )}
                  <Button variant="ghost" icon={Download} onClick={() => setDownloadTarget(model)}>
                    Download original
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {registryOpen && (
        <Card className="sim-panel">
          <header className="sim-panel-head">
            <strong>Format Capability Registry</strong>
            <span className="cell-muted">Only verified rendering paths are marked direct</span>
          </header>
          <div className="sim-panel-body">
            {capabilityRows().map((group) => (
              <div key={group.key} className="sim-registry-group">
                <h3>{group.title}</h3>
                <div className="sim-registry-grid">
                  {group.rows.map((row) => (
                    <div key={row.ext} className="sim-registry-row">
                      <strong>{row.ext}</strong>
                      <span className={`chip chip-${row.status === 'direct' ? 'mint' : row.status === 'external' ? 'amber' : 'red'}`}>
                        {CAPABILITY_STATUS[row.status]?.label || row.status}
                      </span>
                      <span className="cell-muted">{row.renderer || row.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="sim-panel">
        <header className="sim-panel-head">
          <strong>CAD File Register</strong>
          <span className="cell-muted">
            {designId ? `${designModels.length} record${designModels.length === 1 ? '' : 's'} for this design revision` : 'Select a design'}
          </span>
        </header>
        <div className="sim-panel-body">
          <DataTable
            columns={modelColumns}
            rows={designModels}
            onRowClick={(row) => setModelId(row.id)}
            rowActions={(row) => [
              { key: 'view', label: 'Open in viewer', icon: Eye },
              ...(row.source === 'url'
                ? [{ key: 'external', label: 'Open URL in new tab', icon: ExternalLink }]
                : [
                    { key: 'openCad', label: 'Open in CAD Software', icon: MonitorDown },
                    { key: 'download', label: 'Download original', icon: Download },
                  ]),
              { key: 'delete', label: 'Remove record', icon: Trash2, danger: true, divider: true },
            ]}
            onRowAction={(key, row) => {
              if (key === 'view') {
                setModelId(row.id);
                setEmbedState(row.urlKind === 'viewer' ? 'loading' : 'idle');
              }
              if (key === 'external') window.open(row.url, '_blank', 'noopener,noreferrer');
              if (key === 'openCad') setOpenCadTarget(openInCadTargetFor(row));
              if (key === 'download') setDownloadTarget(row);
              if (key === 'delete') setDeleteTarget(row);
            }}
            emptyContent={
              <EmptyState
                icon={Box}
                title="No CAD Files Linked"
                message="Upload a 2D/3D file or link an existing Drawing & CAD Management file to inspect it here."
              />
            }
            ariaLabel="Simulation CAD file register"
          />
        </div>
      </Card>

      <Card className="sim-panel">
        <header className="sim-panel-head">
          <strong>Inspection Observations</strong>
          <div className="sim-panel-actions">
            <Button icon={Plus} size="sm" onClick={() => setObservationModal({ mode: 'new' })} disabled={!designId}>
              New Observation
            </Button>
          </div>
        </header>
        <div className="sim-panel-body">
          <DataTable
            columns={observationColumns}
            rows={designObservations}
            onRowClick={(row) => setObservationModal({ mode: 'edit', id: row.id, row })}
            rowActions={(row) => [
              { key: 'edit', label: 'Edit observation', icon: Save },
              { key: 'view', label: 'View detail', icon: Eye },
            ]}
            onRowAction={(key, row) => {
              if (key === 'edit' || key === 'view') setObservationModal({ mode: 'edit', id: row.id, row });
            }}
            emptyContent={
              <EmptyState
                icon={ScanEye}
                title="No Observations Recorded"
                message="Record what the inspection found — geometry, tolerances, fit or access issues."
              />
            }
            ariaLabel="Inspection observations"
          />
        </div>
      </Card>

      <ObservationModal
        key={observationModal?.id || observationModal?.mode || 'closed'}
        open={Boolean(observationModal)}
        onClose={() => setObservationModal(null)}
        onSave={saveObservation}
        observation={observationModal?.row || null}
        defaults={{ projectId, designId, revision, modelId, partId, assemblyId }}
        designs={designs}
        projects={projects}
        models={models}
        parts={parts}
        assemblies={assemblies}
      />

      <Modal
        open={repoOpen}
        onClose={() => setRepoOpen(false)}
        title="Open existing CAD file"
        subtitle="Drawing & CAD Management repository — files are linked, not duplicated"
        maxWidth="max-w-3xl"
        footer={
          <Button variant="ghost" onClick={() => setRepoOpen(false)}>
            Close
          </Button>
        }
      >
        {repositoryFiles.length === 0 ? (
          <p className="dash-modal-note">No CAD repository files are recorded for this project.</p>
        ) : (
          <>
          <ManageColumns {...repositoryColumns.managerProps} />
          <div className="table-wrap">
            <table className="data-table table-fixed-cols">
              <thead>
                <tr>
                  {repositoryColumns.isVisible('file') && <th>File</th>}
                  {repositoryColumns.isVisible('format') && <th>Format</th>}
                  {repositoryColumns.isVisible('revision') && <th>Revision</th>}
                  {repositoryColumns.isVisible('rendering') && <th>Rendering</th>}
                  {repositoryColumns.isVisible('action') && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {repositoryFiles.map((file) => {
                  const cap = cadCapability(file.fileName);
                  return (
                    <tr key={file.id}>
                      {repositoryColumns.isVisible('file') && (
                        <td>
                          <span className="cell-id">{file.id}</span>
                          <span className="cell-muted cell-clamp">{file.fileName}</span>
                        </td>
                      )}
                      {repositoryColumns.isVisible('format') && (
                        <td>{(file.fileName.split('.').pop() || '').toUpperCase()}</td>
                      )}
                      {repositoryColumns.isVisible('revision') && <td>Rev {file.revision}</td>}
                      {repositoryColumns.isVisible('rendering') && (
                        <td>
                          <CapabilityBadge fileName={file.fileName} />
                        </td>
                      )}
                      {repositoryColumns.isVisible('action') && (
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={FolderOpen}
                            disabled={!cap.supported && !file.assetPath}
                            onClick={() => openRepositoryFile(file)}
                          >
                            Open
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        title="Attach converted preview"
        subtitle={previewTarget ? `${previewTarget.id} · ${previewTarget.fileName}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Upload}
              disabled={!previewChoice || !cadCapability(previewChoice.name).supported}
              onClick={() => {
                attachPreview(previewTarget.id, previewChoice, {
                  previewFormat: previewChoice.name.split('.').pop().toLowerCase(),
                });
                showToast('Converted preview attached. Original file preserved.');
                setPreviewTarget(null);
              }}
            >
              Attach Preview
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Export a GLB/glTF (3D) or PDF/SVG/DXF (2D) preview from the native CAD tool, then attach it
          here. The preview is a representation only — the original uploaded file remains the
          authoritative record and is never overwritten.
        </p>
        {previewChoice && !cadCapability(previewChoice.name).supported && (
          <div className="form-banner error" role="status">
            <AlertTriangle aria-hidden="true" />
            <span>{cadCapability(previewChoice.name).reason}</span>
          </div>
        )}
        <label className="attachment-picker">
          <Upload aria-hidden="true" />
          <span>{previewChoice ? previewChoice.name : 'Choose converted preview file'}</span>
          <input
            type="file"
            accept=".pdf,.svg,.dxf,.png,.jpg,.jpeg,.webp,.glb,.gltf,.stl,.obj,.ply,.step,.stp,.iges,.igs,.3mf,.fbx"
            className="sr-only"
            onChange={(event) => setPreviewChoice(event.target.files?.[0] || null)}
          />
        </label>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove CAD file record"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.fileName}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                removeModel(deleteTarget.id);
                if (modelId === deleteTarget.id) setModelId('');
                setDeleteTarget(null);
                showToast('CAD file record removed.');
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          This removes the simulation workspace record and its session file reference. The original
          file in Drawing &amp; CAD Management and any observations or reports are kept.
        </p>
      </Modal>

      <Modal
        open={Boolean(downloadTarget)}
        onClose={() => setDownloadTarget(null)}
        title="Download original file"
        subtitle={downloadTarget ? `${downloadTarget.fileName}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDownloadTarget(null)}>
              Cancel
            </Button>
            <Button icon={Download} onClick={() => downloadOriginal(downloadTarget)}>
              Download
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          {localFiles[downloadTarget?.id]?.url || downloadTarget?.assetPath
            ? 'The stored original file is downloaded unchanged. Converted previews are separate files.'
            : 'No file bytes are held in this browser session. The record and metadata are preserved, but the binary must be re-uploaded or downloaded from Module 10.'}
        </p>
      </Modal>

      <OpenInCadDialog
        open={Boolean(openCadTarget)}
        onClose={() => setOpenCadTarget(null)}
        fileName={openCadTarget?.fileName}
        assetPath={openCadTarget?.assetPath}
        localEntry={openCadTarget?.localEntry}
        recordRef={openCadTarget?.recordRef}
        sourceModule={openCadTarget?.sourceModule}
        sourceRef={openCadTarget?.sourceRef}
        context={openCadTarget?.context}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
