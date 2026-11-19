import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  Link2,
  Paperclip,
  Plus,
  Save,
  Send,
  Trash2,
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
import { useManufacturing } from '../../context/ManufacturingContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useAnalysis } from '../../context/AnalysisContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import { TODAY, addDays } from '../../data/projectData';
import {
  DRAWING_REVISIONS,
  ENGINEERS,
  INSPECTION_TYPES,
  MANUFACTURING_CATEGORIES,
  PROCESS_TYPES,
  RECORD_KINDS,
  REVIEWERS,
  fieldsForCategory,
} from '../../data/manufacturingData';
import { Toast, useToast } from './manufacturingUi';
import InspectionItemsTable from './InspectionItemsTable';
import { blankInspectionItem, itemsFromRecord } from './inspectionItems';

const KIND_META = {
  definition: {
    title: 'Manufacturing Definition',
    newTitle: 'New Manufacturing Definition',
    icon: Factory,
  },
  inspection: {
    title: 'Inspection & Quality Requirements',
    newTitle: 'New Inspection Requirement',
    icon: ClipboardCheck,
  },
  process: {
    title: 'Process Planning & Instructions',
    newTitle: 'New Process Plan',
    icon: ClipboardList,
  },
};

const EMPTY_POINT = { feature: '', method: '', unit: 'mm', frequency: '100%' };
const EMPTY_CHARACTERISTIC = { name: '', criticality: 'Critical', dimension: '', toleranceRef: '' };
const EMPTY_OPERATION = {
  opNo: '',
  name: '',
  description: '',
  workstation: '',
  sequence: '',
  duration: '',
  tooling: '',
  setup: '',
  parameters: '',
  safetyQuality: '',
  inspectionCheckpoint: '',
};
const EMPTY_INSTRUCTION = { id: '', operation: '', details: '', requirements: '', refs: '' };
const EMPTY_EQUIPMENT = { name: '', type: '', specification: '', capacity: '', special: '' };

function blankForm(kind, nextId) {
  return {
    id: nextId,
    name: '',
    projectId: '',
    designId: '',
    partId: '',
    assemblyId: '',
    material: '',
    analysisId: '',
    linkedDefinitionId: '',
    linkedInspectionId: '',
    engineer: ENGINEERS[0],
    reviewer: REVIEWERS[0],
    recordDate: TODAY,
    dueDate: addDays(TODAY, 30),
    revision: 'A',
    description: '',
    category: MANUFACTURING_CATEGORIES[0].label,
    technical: {},
    manufacturingMethod: '',
    manufacturingNotes: '',
    criticalFeatures: '',
    requiredCapabilities: '',
    specialProcesses: '',
    equipmentToolingRefs: '',
    linkedBomId: '',
    linkedDrawingId: '',
    inspectionType: INSPECTION_TYPES[0],
    characteristic: '',
    dimension: '',
    tolerance: '',
    unit: 'mm',
    inspectionMethod: '',
    instrument: '',
    frequency: '',
    acceptanceCriteria: '',
    criticalToQuality: 'No',
    evidenceRef: '',
    requirementNotes: '',
    inspectionItems: [blankInspectionItem()],
    points: [{ ...EMPTY_POINT }],
    characteristics: [{ ...EMPTY_CHARACTERISTIC }],
    measurement: { method: '', equipment: '', unit: 'mm', instructions: '' },
    acceptance: { min: '', max: '', description: '', standard: '' },
    processType: PROCESS_TYPES[0],
    operationNotes: '',
    sequence: [{ ...EMPTY_OPERATION }],
    instructions: [{ ...EMPTY_INSTRUCTION }],
    equipment: [{ ...EMPTY_EQUIPMENT }],
    special: { safety: '', notes: '', handling: '', restrictions: '' },
    notes: { description: '', engineeringRef: '', drawingRef: '', additional: '' },
    release: { packageId: '', releaseStatus: 'Not released', releaseDate: '', inspectionRef: '', processRevision: 'A' },
    status: 'Draft',
    attachments: [],
  };
}

function Section({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <section className="form-section-card is-open">
      <div className="form-section-head">
        <span className="form-section-icon" aria-hidden="true">
          <Icon />
        </span>
        <span className="form-section-text">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </span>
        {badge != null && <span className="mech-aside-count">{badge}</span>}
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  );
}

/** Ordered operation editor with operation-level manufacturing detail. */
function OperationEditor({ rows, onChange, onAdd, onRemove, onMove, errors }) {
  return (
    <div className="mfg-operation-list">
      {rows.map((row, index) => (
        <section className="mfg-operation-card" key={`operation-${index}`}>
          <header className="mfg-operation-head">
            <span className="mfg-operation-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{row.name || `Operation ${index + 1}`}</strong>
            <div className="mfg-operation-tools">
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move operation ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move operation ${index + 1} down`}
                disabled={index === rows.length - 1}
                onClick={() => onMove(index, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove operation ${index + 1}`}
                onClick={() => onRemove(index)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </header>
          <div className="form-grid">
            <Input
              id={`op-${index}-no`}
              label="Operation No."
              value={row.opNo || ''}
              onChange={(event) => onChange(index, 'opNo', event.target.value)}
            />
            <Input
              id={`op-${index}-name`}
              label="Operation Name"
              value={row.name || ''}
              onChange={(event) => onChange(index, 'name', event.target.value)}
            />
            <div className="form-grid-full">
              <Textarea
                id={`op-${index}-description`}
                label="Operation Description"
                rows={2}
                value={row.description || ''}
                onChange={(event) => onChange(index, 'description', event.target.value)}
              />
            </div>
            <Input
              id={`op-${index}-workstation`}
              label="Work Center / Equipment Reference"
              value={row.workstation || ''}
              onChange={(event) => onChange(index, 'workstation', event.target.value)}
            />
            <Input
              id={`op-${index}-time`}
              label="Estimated Operation Time"
              placeholder="e.g. 2.0 h (user estimate)"
              value={row.duration || ''}
              onChange={(event) => onChange(index, 'duration', event.target.value)}
            />
            <Input
              id={`op-${index}-tooling`}
              label="Tooling Requirements"
              value={row.tooling || ''}
              onChange={(event) => onChange(index, 'tooling', event.target.value)}
            />
            <Input
              id={`op-${index}-setup`}
              label="Setup Instructions"
              value={row.setup || ''}
              onChange={(event) => onChange(index, 'setup', event.target.value)}
            />
            <Input
              id={`op-${index}-parameters`}
              label="Process Parameters"
              value={row.parameters || ''}
              onChange={(event) => onChange(index, 'parameters', event.target.value)}
            />
            <Input
              id={`op-${index}-checkpoint`}
              label="Required Inspection Checkpoint"
              value={row.inspectionCheckpoint || ''}
              onChange={(event) => onChange(index, 'inspectionCheckpoint', event.target.value)}
            />
            <div className="form-grid-full">
              <Textarea
                id={`op-${index}-safety`}
                label="Safety / Quality Notes"
                rows={2}
                value={row.safetyQuality || ''}
                onChange={(event) => onChange(index, 'safetyQuality', event.target.value)}
              />
            </div>
          </div>
        </section>
      ))}
      {errors?.sequence && <p className="form-error">{errors.sequence}</p>}
      <Button variant="secondary" size="sm" icon={Plus} onClick={() => onAdd({ ...EMPTY_OPERATION })}>
        Add operation
      </Button>
    </div>
  );
}

/** Small repeatable row editor used by inspection points and process steps. */
function RowList({ title, rows, fields, onChange, onAdd, onRemove, addLabel, template }) {
  return (
    <div className="mfg-repeat">
      {rows.map((row, index) => (
        <div
          className="mfg-repeat-row"
          key={`${title}-${index}`}
          style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) 32px` }}
        >
          {fields.map((field) => (
            <input
              key={field.key}
              className="form-input"
              value={row[field.key] ?? ''}
              placeholder={field.placeholder}
              aria-label={`${title} ${index + 1} ${field.label}`}
              onChange={(event) => onChange(index, field.key, event.target.value)}
            />
          ))}
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remove ${title} row ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        onClick={() => onAdd({ ...template })}
      >
        {addLabel}
      </Button>
    </div>
  );
}

export default function ManufacturingFormPage() {
  const { kind, recordId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { recordsFor, nextId, addRecord, updateRecord } = useManufacturing();
  const { designs, parts, assemblies } = useMechanical();
  const { analyses } = useAnalysis();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const meta = KIND_META[kind] || KIND_META.definition;
  const registerPath = `/manufacturing-design/${RECORD_KINDS[kind]?.base || 'definition'}`;
  const records = recordsFor(kind);
  const editing = recordId ? records.find((row) => row.id === recordId) : null;

  const [formId] = useState(() => editing?.id || nextId(kind));

  const requestedProjectId = searchParams.get('projectId');
  const requestedPartId = searchParams.get('partId');
  const requestedAssemblyId = searchParams.get('assemblyId');
  const requestedDefinitionId =
    searchParams.get('linkedDefinitionId') || searchParams.get('definitionId') || '';
  const requestedInspectionId =
    searchParams.get('linkedInspectionId') || searchParams.get('inspectionId') || '';
  const requestedAnalysisId = searchParams.get('analysisId') || '';
  const requestedPart = parts.find(
    (part) =>
      part.id === requestedPartId &&
      (!requestedProjectId || part.projectId === requestedProjectId),
  );
  const initialProjectId =
    requestedPart?.projectId ||
    (projects.some((project) => project.id === requestedProjectId)
      ? requestedProjectId
      : projects[0]?.id) ||
    '';
  const initialPart = requestedPart?.projectId === initialProjectId ? requestedPart : null;
  const initialAssembly =
    assemblies.find(
      (assembly) =>
        assembly.id === requestedAssemblyId && assembly.projectId === initialProjectId,
    ) ||
    assemblies.find(
      (assembly) => assembly.id === initialPart?.parentAssemblyId && assembly.projectId === initialProjectId,
    ) ||
    null;
  const initialDefinition = recordsFor('definition').find(
    (record) =>
      record.id === requestedDefinitionId &&
      record.projectId === initialProjectId &&
      (!initialPart || record.partId === initialPart.id),
  );
  const initialInspection = recordsFor('inspection').find(
    (record) =>
      record.id === requestedInspectionId &&
      record.projectId === initialProjectId &&
      (!initialPart || record.partId === initialPart.id),
  );
  const initialAnalysis = analyses.find(
    (analysis) =>
      analysis.id === requestedAnalysisId &&
      analysis.verificationStatus === 'Verified' &&
      analysis.projectId === initialProjectId &&
      (!initialPart || analysis.linkedId === initialPart.id || analysis.linkedId === initialAssembly?.id),
  );

  const [form, setForm] = useState(() => {
    if (!editing) {
      const requestedCategory = searchParams.get('category');
      const base = blankForm(kind, formId);
      const linkedInspectionId =
        initialInspection?.id || initialDefinition?.linkedInspectionId || '';
      return {
        ...base,
        projectId: initialProjectId,
        partId: initialPart?.id || '',
        assemblyId: initialAssembly?.id || '',
        material: initialPart?.material || '',
        analysisId: initialAnalysis?.id || '',
        linkedDefinitionId: initialDefinition?.id || '',
        linkedInspectionId,
        release: { ...base.release, inspectionRef: linkedInspectionId },
        category:
          requestedCategory && MANUFACTURING_CATEGORIES.some((row) => row.label === requestedCategory)
            ? requestedCategory
            : MANUFACTURING_CATEGORIES[0].label,
      };
    }
    return {
      ...blankForm(kind, editing.id),
      ...editing,
      material:
        editing.material ||
        parts.find((part) => part.id === editing.partId)?.material ||
        '',
      analysisId: editing.analysisId || '',
      linkedDefinitionId: editing.linkedDefinitionId || '',
      linkedInspectionId: editing.linkedInspectionId || '',
      technical: editing.technical || {},
      inspectionItems: (() => {
        const mapped = itemsFromRecord(editing);
        return mapped.length ? mapped : [blankInspectionItem()];
      })(),
      points: editing.points?.length ? editing.points : [{ ...EMPTY_POINT }],
      characteristics: editing.characteristics?.length
        ? editing.characteristics
        : [{ ...EMPTY_CHARACTERISTIC }],
      acceptance: editing.acceptance || { min: '', max: '', description: '', standard: '' },
      measurement: editing.measurement || { method: '', equipment: '', unit: 'mm', instructions: '' },
      sequence: editing.sequence?.length ? editing.sequence : [{ ...EMPTY_OPERATION }],
      instructions: editing.instructions?.length ? editing.instructions : [{ ...EMPTY_INSTRUCTION }],
      equipment: editing.equipment?.length ? editing.equipment : [{ ...EMPTY_EQUIPMENT }],
      special: editing.special || { safety: '', notes: '', handling: '', restrictions: '' },
      notes: editing.notes || { description: '', engineeringRef: '', drawingRef: '', additional: '' },
      release: editing.release || blankForm(kind, formId).release,
      dueDate: editing.dueDate || addDays(TODAY, 30),
    };
  });
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(false);

  const projectParts = useMemo(
    () => parts.filter((part) => !form.projectId || part.projectId === form.projectId),
    [parts, form.projectId],
  );
  const projectDesigns = useMemo(
    () => designs.filter((design) => !form.projectId || design.projectId === form.projectId),
    [designs, form.projectId],
  );
  const selectedPart = parts.find((part) => part.id === form.partId) || null;
  const selectedAssembly = assemblies.find((assembly) => assembly.id === form.assemblyId) || null;
  const linkedDrawing = drawings.find((drawing) => drawing.id === form.linkedDrawingId);
  const drawingNo = linkedDrawing?.drawingNumber || (selectedPart ? `DRG-${selectedPart.partNumber}` : '');
  const drawingRevision = linkedDrawing?.revision || selectedPart?.revision || form.revision;
  const projectDefinitions = recordsFor('definition').filter(
    (record) =>
      record.projectId === form.projectId && (!form.partId || record.partId === form.partId),
  );
  const projectInspections = recordsFor('inspection').filter(
    (record) =>
      record.projectId === form.projectId && (!form.partId || record.partId === form.partId),
  );
  const projectBoms = boms.filter((bom) => bom.projectId === form.projectId);
  const linkedDrawings = drawings.filter(
    (drawing) =>
      drawing.projectId === form.projectId &&
      (!selectedPart?.partNumber || drawing.partNumber === selectedPart.partNumber),
  );
  const verifiedAnalyses = analyses.filter(
    (analysis) =>
      analysis.projectId === form.projectId &&
      analysis.verificationStatus === 'Verified' &&
      (analysis.linkedId === form.partId ||
        (form.assemblyId && analysis.linkedId === form.assemblyId)),
  );

  if (recordId && !editing) return <Navigate to={registerPath} replace />;
  if (editing && ['Approved', 'Released', 'Superseded'].includes(editing.status)) {
    return <Navigate to={`${registerPath}/${editing.id}`} replace />;
  }

  const touch = () => setDirty(true);

  const setField = (key, value) => {
    touch();
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const setTechnical = (key, value) => {
    touch();
    setForm((previous) => ({ ...previous, technical: { ...previous.technical, [key]: value } }));
  };

  const setNested = (group, key, value) => {
    touch();
    setForm((previous) => ({
      ...previous,
      [group]: { ...(previous[group] || {}), [key]: value },
    }));
  };

  const setRows = (group, rows) => {
    touch();
    setForm((previous) => ({ ...previous, [group]: rows }));
  };

  const updateRow = (group, index, key, value) => {
    const rows = (form[group] || []).map((row, rowIndex) =>
      rowIndex === index ? { ...row, [key]: value } : row,
    );
    setRows(group, rows);
  };

  const setInspectionItems = (updater) => {
    touch();
    setForm((previous) => ({ ...previous, inspectionItems: updater(previous.inspectionItems || []) }));
  };

  const updateInspectionItem = (id, key, value) => {
    setInspectionItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const addInspectionItem = () => setInspectionItems((items) => [...items, blankInspectionItem()]);

  const removeInspectionItem = (id) =>
    setInspectionItems((items) => items.filter((item) => item.id !== id));

  const clearInspectionItems = () => setInspectionItems(() => []);

  const addRow = (group, template) => setRows(group, [...(form[group] || []), { ...template }]);
  const removeRow = (group, index) =>
    setRows(group, (form[group] || []).filter((_, rowIndex) => rowIndex !== index));

  const moveRow = (group, index, delta) => {
    const rows = [...(form[group] || [])];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    touch();
    setRows(
      group,
      rows.map((row, rowIndex) => ({ ...row, sequence: String(rowIndex + 1) })),
    );
  };

  const handleFiles = (fileList) => {
    const files = [...(fileList || [])].map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      uploadedBy: form.engineer,
      uploadedAt: TODAY,
    }));
    if (files.length === 0) return;
    touch();
    setForm((previous) => ({ ...previous, attachments: [...previous.attachments, ...files] }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Record name is required.';
    if (!form.projectId) next.projectId = 'Select the associated project.';
    if (!form.partId) next.partId = 'Select the associated part.';
    if (!form.material.trim()) next.material = 'Record the material or stock specification.';
    if (!form.dueDate) next.dueDate = 'Due date is required.';
    if (kind === 'definition' && !form.category) next.category = 'Select a manufacturing category.';
    if (kind === 'definition' && !form.manufacturingMethod.trim()) {
      next.manufacturingMethod = 'Record the manufacturing method.';
    }
    if (kind === 'inspection' && !form.inspectionType) next.inspectionType = 'Select an inspection type.';
    if (kind === 'process' && !form.processType) next.processType = 'Select a process type.';
    if (kind === 'process' && !form.sequence.some((operation) => operation.name?.trim())) {
      next.sequence = 'Define at least one operation with a name.';
    }
    const duplicate = recordsFor(kind).find(
      (row) =>
        row.id !== formId &&
        row.projectId === form.projectId &&
        row.partId === form.partId &&
        String(row.name).trim().toLowerCase() === form.name.trim().toLowerCase(),
    );
    if (form.name.trim() && duplicate) {
      next.name = `A record with this name already exists for this component (${duplicate.id}).`;
    }
    if (kind === 'process' && !form.linkedDefinitionId) {
      next.linkedDefinitionId = 'Link the manufacturing definition this process plan implements.';
    }
    if (kind === 'process' && !form.linkedInspectionId) {
      next.linkedInspectionId = 'Link the inspection requirements that govern this process.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const payload = () => ({
    ...form,
    id: formId,
    kind,
    projectName: projects.find((project) => project.id === form.projectId)?.name || '',
    partNumber: selectedPart?.partNumber || '',
    material: form.material.trim() || selectedPart?.material || '',
    assemblyId: form.assemblyId || selectedPart?.parentAssemblyId || '',
    drawingNo,
    drawingRevision,
    release:
      kind === 'process'
        ? {
            ...form.release,
            inspectionRef: form.linkedInspectionId || form.release.inspectionRef,
            processRevision: form.revision,
          }
        : form.release,
    status: form.status,
    updatedBy: form.engineer,
    updatedAt: TODAY,
  });

  const persist = (status, destination) => {
    if (!validate()) {
      showToast('Complete the required fields before saving.', 'error');
      return null;
    }
    const data = payload();
    const record = {
      ...data,
      status,
      reviews:
        status === 'Under Review' && !(editing?.reviews || []).some((entry) => entry.decision === 'Pending decision')
          ? [
              ...(editing?.reviews || []),
              {
                id: `RV-${data.revision}-${(editing?.reviews?.length || 0) + 1}`,
                revision: data.revision,
                reviewer: data.reviewer,
                date: TODAY,
                decision: 'Pending decision',
                comments: 'Submitted for manufacturing review.',
              },
            ]
          : editing?.reviews || [],
      statusHistory:
        status === (editing?.status || 'Draft')
          ? editing?.statusHistory || [
              { id: `SH-${formId}-1`, status: 'Draft', at: TODAY, by: form.engineer, note: 'Record created as a draft.' },
            ]
          : [
              ...(editing?.statusHistory ||
                (status === 'Under Review'
                  ? [{ id: `SH-${formId}-0`, status: 'Draft', at: TODAY, by: form.engineer, note: 'Record created as a draft.' }]
                  : [])),
              {
                id: `SH-${formId}-${(editing?.statusHistory?.length || 0) + 1}`,
                status,
                at: TODAY,
                by: form.engineer,
                note:
                  status === 'Under Review'
                    ? 'Submitted for engineering review.'
                    : status === 'Draft'
                      ? 'Saved as draft.'
                      : 'Saved as an in-preparation manufacturing record.',
              },
            ],
    };

    if (editing) updateRecord(kind, editing.id, record);
    else addRecord(kind, { ...record, createdBy: form.engineer, createdAt: TODAY });

    setDirty(false);
    showToast(`${formId} saved${status === 'Draft' ? ' as draft' : ''}.`);
    if (destination === 'detail') navigate(`${registerPath}/${formId}`);
    else if (destination === 'register') navigate(registerPath);
    return formId;
  };

  const submitForReview = () => {
    if (!validate()) {
      showToast('Complete the required fields before submitting.', 'error');
      return;
    }
    persist('Under Review', 'detail');
  };

  const requestCancel = () => {
    if (dirty) setCancelPrompt(true);
    else navigate(registerPath);
  };

  const technicalFields = kind === 'definition' ? fieldsForCategory(form.category) : [];

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Manufacturing Design', to: '/manufacturing-design' },
            { label: meta.title, to: registerPath },
            { label: editing ? `${formId} · Edit` : 'New Record' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={meta.icon}
          title={editing ? `Edit ${meta.title}` : meta.newTitle}
          subtitle="Define manufacturing, inspection or process requirements by reference. Saving does not release the record to production."
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={requestCancel}>
              Back to Register
            </Button>
          }
        />
      }
    >
      <form
        className="project-form-page"
        onSubmit={(event) => {
          event.preventDefault();
          persist(form.status === 'Draft' ? 'Draft' : form.status, 'register');
        }}
        noValidate
      >
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <Section
              icon={FileText}
              title={`1. ${meta.title} Information`}
              subtitle="Identification, ownership and dates"
            >
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">Reference ID</span>
                  <span className="form-static">{formId}</span>
                </div>
                <Input
                  id="mfg-record-date"
                  label="Record Date"
                  type="date"
                  value={form.recordDate}
                  onChange={(event) => setField('recordDate', event.target.value)}
                />
                <div className="form-grid-full">
                  <Input
                    id="mfg-name"
                    label="Record Name"
                    placeholder="e.g. Gearbox housing bore and face machining"
                    value={form.name}
                    hint={errors.name}
                    aria-invalid={Boolean(errors.name)}
                    onChange={(event) => setField('name', event.target.value)}
                  />
                </div>
                <div className="form-grid-full">
                  <Textarea
                    id="mfg-description"
                    label="Description"
                    rows={3}
                    placeholder="What this record defines, and which drawing or requirement it supports"
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>
                <Select
                  id="mfg-revision"
                  label="Record Revision"
                  options={DRAWING_REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` }))}
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                />
                <Input
                  id="mfg-due-date"
                  label="Due Date"
                  type="date"
                  value={form.dueDate}
                  hint={errors.dueDate}
                  aria-invalid={Boolean(errors.dueDate)}
                  onChange={(event) => setField('dueDate', event.target.value)}
                />
                <div className="form-field">
                  <span className="form-label">Current Status</span>
                  <span className="form-static">{editing?.status || 'Draft'}</span>
                </div>
              </div>
            </Section>

            <Section
              icon={Link2}
              title="2. Project & Component References"
              subtitle="References only — master data stays with its owning module"
            >
              <div className="form-grid">
                <Select
                  id="mfg-project"
                  label="Project"
                  options={[
                    { value: '', label: 'Select project' },
                    ...projects.map((project) => ({
                      value: project.id,
                      label: `${project.id} · ${project.name}`,
                    })),
                  ]}
                  value={form.projectId}
                  hint={errors.projectId}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      projectId: event.target.value,
                      designId: '',
                      partId: '',
                      assemblyId: '',
                      material: '',
                      analysisId: '',
                      linkedDefinitionId: '',
                      linkedInspectionId: '',
                    }));
                  }}
                />
                <Select
                  id="mfg-design"
                  label="Mechanical Design Reference (Module 05)"
                  options={[
                    { value: '', label: 'No design reference' },
                    ...projectDesigns.map((design) => ({
                      value: design.id,
                      label: `${design.id} · Rev ${design.revision} · ${design.name}`,
                    })),
                  ]}
                  value={form.designId || ''}
                  onChange={(event) => setField('designId', event.target.value)}
                />
                <Select
                  id="mfg-engineer"
                  label="Responsible Engineer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.engineer}
                  onChange={(event) => setField('engineer', event.target.value)}
                />
                <Select
                  id="mfg-part"
                  label="Part Number"
                  options={[
                    { value: '', label: 'Select part' },
                    ...projectParts.map((part) => ({
                      value: part.id,
                      label: `${part.partNumber} · ${part.name}`,
                    })),
                  ]}
                  value={form.partId}
                  hint={errors.partId}
                  onChange={(event) => {
                    const part = parts.find((row) => row.id === event.target.value);
                    setForm((previous) => ({
                      ...previous,
                      partId: event.target.value,
                      assemblyId: part?.parentAssemblyId || '',
                      material: part?.material || '',
                      analysisId: '',
                      linkedDefinitionId: '',
                      linkedInspectionId: '',
                    }));
                  }}
                />
                <Select
                  id="mfg-assembly"
                  label="Assembly"
                  options={[
                    { value: '', label: 'No assembly reference' },
                    ...assemblies.map((assembly) => ({
                      value: assembly.id,
                      label: `${assembly.number} · ${assembly.name}`,
                    })),
                  ]}
                  value={form.assemblyId}
                  onChange={(event) => {
                    setField('assemblyId', event.target.value);
                    setField('analysisId', '');
                  }}
                />
                <Input
                  id="mfg-material"
                  label="Material Specification"
                  placeholder="e.g. Cast iron FG260, stress relieved"
                  value={form.material}
                  hint={errors.material}
                  aria-invalid={Boolean(errors.material)}
                  onChange={(event) => setField('material', event.target.value)}
                />
                {kind === 'definition' && (
                  <Input
                    id="mfg-method"
                    label="Manufacturing Method"
                    placeholder="e.g. CNC machining from casting"
                    value={form.manufacturingMethod}
                    hint={errors.manufacturingMethod}
                    aria-invalid={Boolean(errors.manufacturingMethod)}
                    onChange={(event) => setField('manufacturingMethod', event.target.value)}
                  />
                )}
                {kind !== 'inspection' && (
                  <Select
                    id="mfg-linked-bom"
                    label="BOM Reference (Module 09)"
                    options={[
                      {
                        value: '',
                        label: projectBoms.length ? 'No BOM reference' : 'No BOM for this project',
                      },
                      ...projectBoms.map((bom) => ({
                        value: bom.id,
                        label: `${bom.id} · Rev ${bom.revision} · ${bom.name}`,
                      })),
                    ]}
                    value={form.linkedBomId || ''}
                    onChange={(event) => setField('linkedBomId', event.target.value)}
                  />
                )}
                <Select
                  id="mfg-linked-drawing"
                  label="CAD Drawing Reference (Module 10)"
                  options={[
                    {
                      value: '',
                      label: linkedDrawings.length
                        ? 'No drawing reference'
                        : 'No drawing for this component',
                    },
                    ...linkedDrawings.map((drawing) => ({
                      value: drawing.id,
                      label: `${drawing.drawingNumber} · Rev ${drawing.revision} · ${drawing.title}`,
                    })),
                  ]}
                  value={form.linkedDrawingId || ''}
                  onChange={(event) => setField('linkedDrawingId', event.target.value)}
                />
                {kind === 'definition' && (
                  <Select
                    id="mfg-analysis"
                    label="Verified Analysis Reference"
                    options={[
                      {
                        value: '',
                        label: verifiedAnalyses.length
                          ? 'No analysis reference'
                          : 'No verified analysis for this component',
                      },
                      ...verifiedAnalyses.map((analysis) => ({
                        value: analysis.id,
                        label: `${analysis.id} · ${analysis.category} · ${analysis.analysisType}`,
                      })),
                    ]}
                    value={form.analysisId || ''}
                    hint="Only verified analyses for the selected project and component are listed."
                    onChange={(event) => setField('analysisId', event.target.value)}
                  />
                )}
                {kind === 'definition' && (
                  <Select
                    id="mfg-linked-inspection"
                    label="Linked Inspection Requirement"
                    options={[
                      {
                        value: '',
                        label: projectInspections.length
                          ? 'No inspection requirement linked'
                          : 'No inspection requirement for this part',
                      },
                      ...projectInspections.map((inspection) => ({
                        value: inspection.id,
                        label: `${inspection.id} · ${inspection.name}`,
                      })),
                    ]}
                    value={form.linkedInspectionId || ''}
                    onChange={(event) => setField('linkedInspectionId', event.target.value)}
                  />
                )}
                {kind === 'inspection' && (
                  <Select
                    id="mfg-linked-definition"
                    label="Manufacturing Definition"
                    options={[
                      {
                        value: '',
                        label: projectDefinitions.length
                          ? 'No definition linked'
                          : 'No definition for this part',
                      },
                      ...projectDefinitions.map((definition) => ({
                        value: definition.id,
                        label: `${definition.id} · ${definition.name}`,
                      })),
                    ]}
                    value={form.linkedDefinitionId || ''}
                    hint="The inspection plan references, but never edits, the manufacturing definition."
                    onChange={(event) => setField('linkedDefinitionId', event.target.value)}
                  />
                )}
                {kind === 'process' && (
                  <Select
                    id="mfg-linked-definition"
                    label="Manufacturing Definition"
                    options={[
                      {
                        value: '',
                        label: projectDefinitions.length
                          ? 'Select definition'
                          : 'No definition for this part',
                      },
                      ...projectDefinitions.map((definition) => ({
                        value: definition.id,
                        label: `${definition.id} · ${definition.name}`,
                      })),
                    ]}
                    value={form.linkedDefinitionId || ''}
                    hint={errors.linkedDefinitionId}
                    aria-invalid={Boolean(errors.linkedDefinitionId)}
                    onChange={(event) => {
                      const definition = projectDefinitions.find(
                        (row) => row.id === event.target.value,
                      );
                      setForm((previous) => ({
                        ...previous,
                        linkedDefinitionId: event.target.value,
                        linkedInspectionId:
                          definition?.linkedInspectionId || previous.linkedInspectionId,
                        release: {
                          ...previous.release,
                          inspectionRef:
                            definition?.linkedInspectionId || previous.release.inspectionRef,
                        },
                      }));
                    }}
                  />
                )}
                {kind === 'process' && (
                  <Select
                    id="mfg-linked-inspection"
                    label="Inspection Requirements"
                    options={[
                      {
                        value: '',
                        label: projectInspections.length
                          ? 'Select inspection requirement'
                          : 'No inspection requirement for this part',
                      },
                      ...projectInspections.map((inspection) => ({
                        value: inspection.id,
                        label: `${inspection.id} · ${inspection.name}`,
                      })),
                    ]}
                    value={form.linkedInspectionId || ''}
                    hint={errors.linkedInspectionId}
                    aria-invalid={Boolean(errors.linkedInspectionId)}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        linkedInspectionId: event.target.value,
                        release: {
                          ...previous.release,
                          inspectionRef: event.target.value,
                        },
                      }))
                    }
                  />
                )}
                <div className="form-field">
                  <span className="form-label">Drawing Number</span>
                  <span className="form-static">{drawingNo || 'Select a part'}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">Drawing Revision</span>
                  <span className="form-static">{drawingRevision}</span>
                </div>
                <Select
                  id="mfg-reviewer"
                  label="Technical Reviewer"
                  options={REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
                  value={form.reviewer}
                  onChange={(event) => setField('reviewer', event.target.value)}
                />
              </div>
            </Section>

            {kind === 'definition' && (
              <>
                <Section icon={Factory} title="3. Manufacturing Category" subtitle="Select the category this definition belongs to">
                  <div className="form-grid">
                    <Select
                      id="mfg-category"
                      label="Category"
                      options={MANUFACTURING_CATEGORIES.map((category) => ({
                        value: category.label,
                        label: category.label,
                      }))}
                      value={form.category}
                      hint={errors.category}
                      onChange={(event) => setField('category', event.target.value)}
                    />
                    <div className="form-field">
                      <span className="form-label">Category Fields</span>
                      <span className="form-static">
                        {fieldsForCategory(form.category).length} category-specific fields
                      </span>
                    </div>
                  </div>
                </Section>
                <Section
                  icon={Factory}
                  title={`4. ${form.category} Details`}
                  subtitle="Only the selected category's fields are shown"
                >
                  <div className="form-grid">
                    {technicalFields.map((field) => {
                      const value = form.technical?.[field.key] ?? '';
                      const label = field.unit ? `${field.label} (${field.unit})` : field.label;
                      const id = `mfg-tech-${field.key}`;
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
                            onChange={(event) => setTechnical(field.key, event.target.value)}
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
                              value={value}
                              onChange={(event) => setTechnical(field.key, event.target.value)}
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
                          value={value}
                          onChange={(event) => setTechnical(field.key, event.target.value)}
                        />
                      );
                    })}
                  </div>
                  <p className="anl-field-note">
                    These fields record manufacturing requirements and references. They do not compute or
                    certify engineering values.
                  </p>
                </Section>
                <Section
                  icon={Factory}
                  title="5. Manufacturing Requirements"
                  subtitle="Method, critical features, capabilities, special processes and tooling"
                >
                  <div className="form-grid">
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-manufacturing-notes"
                        label="Manufacturing Notes"
                        rows={2}
                        placeholder="Process sequence, handling or shop constraints recorded by the user"
                        value={form.manufacturingNotes}
                        onChange={(event) => setField('manufacturingNotes', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-critical-features"
                        label="Critical Features"
                        rows={2}
                        placeholder="Features whose non-conformance affects fit, function or safety"
                        value={form.criticalFeatures}
                        onChange={(event) => setField('criticalFeatures', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-required-capabilities"
                        label="Required Manufacturing Capabilities"
                        rows={2}
                        placeholder="e.g. boring envelope, 5-axis capability, qualified welding"
                        value={form.requiredCapabilities}
                        onChange={(event) => setField('requiredCapabilities', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-special-processes"
                        label="Special Processes"
                        rows={2}
                        placeholder="e.g. heat treatment, NDT, surface treatment — user entered"
                        value={form.specialProcesses}
                        onChange={(event) => setField('specialProcesses', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-equipment-tooling"
                        label="Required Equipment / Tooling References"
                        rows={2}
                        placeholder="Machine, fixture, jig or tooling identifiers and references"
                        value={form.equipmentToolingRefs}
                        onChange={(event) => setField('equipmentToolingRefs', event.target.value)}
                      />
                    </div>
                  </div>
                  <p className="anl-field-note">
                    Materials, methods and special-process requirements are entered by the user. This
                    workspace does not generate or certify manufacturing specifications.
                  </p>
                </Section>
              </>
            )}

            {kind === 'inspection' && (
              <>
                <Section icon={ClipboardCheck} title="3. Inspection Requirements" subtitle="Type, part and drawing reference">
                  <div className="form-grid">
                    <Select
                      id="mfg-inspection-type"
                      label="Inspection Type"
                      options={INSPECTION_TYPES.map((type) => ({ value: type, label: type }))}
                      value={form.inspectionType}
                      hint={errors.inspectionType}
                      onChange={(event) => setField('inspectionType', event.target.value)}
                    />
                    <div className="form-field">
                      <span className="form-label">Applicable Part</span>
                      <span className="form-static">
                        {selectedPart ? `${selectedPart.partNumber} · ${selectedPart.name}` : 'Select a part'}
                      </span>
                    </div>
                    <div className="form-field">
                      <span className="form-label">Drawing Reference</span>
                      <span className="form-static">{drawingNo || 'Select a part'}</span>
                    </div>
                    <div className="form-field">
                      <span className="form-label">Drawing Revision</span>
                      <span className="form-static">{drawingRevision}</span>
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-requirement-notes"
                        label="Requirement Notes"
                        rows={2}
                        value={form.requirementNotes}
                        onChange={(event) => setField('requirementNotes', event.target.value)}
                      />
                    </div>
                  </div>
                </Section>
                <Section
                  icon={ClipboardCheck}
                  title="4. Inspection Points & Critical Characteristics"
                  subtitle="One row per inspection point — feature, method, equipment, frequency, characteristic, tolerance and instructions"
                  badge={form.inspectionItems.length}
                >
                  <InspectionItemsTable
                    items={form.inspectionItems}
                    onChange={updateInspectionItem}
                    onAdd={addInspectionItem}
                    onRemove={removeInspectionItem}
                    onClear={clearInspectionItems}
                  />
                </Section>
              </>
            )}

            {kind === 'process' && (
              <>
                <Section icon={ClipboardList} title="3. Manufacturing Sequence" subtitle="Ordered operations, work centers, tooling, setup, parameters and checkpoints" badge={form.sequence.length}>
                  <div className="form-grid">
                    <Select
                      id="mfg-process-type"
                      label="Process Type"
                      options={PROCESS_TYPES.map((type) => ({ value: type, label: type }))}
                      value={form.processType}
                      hint={errors.processType}
                      onChange={(event) => setField('processType', event.target.value)}
                    />
                    <div className="form-field">
                      <span className="form-label">Routing Basis</span>
                      <span className="form-static">Drawing revision and inspection plan only</span>
                    </div>
                  </div>
                  <OperationEditor
                    rows={form.sequence}
                    errors={errors}
                    onChange={(index, key, value) => updateRow('sequence', index, key, value)}
                    onAdd={(row) => addRow('sequence', row)}
                    onRemove={(index) => removeRow('sequence', index)}
                    onMove={(index, delta) => moveRow('sequence', index, delta)}
                  />
                  <p className="anl-field-note">
                    Operations are ordered top to bottom and renumbered as they move. Estimated times
                    are user-entered planning estimates, not production records.
                  </p>
                </Section>
                <Section icon={FileText} title="4. Process Instructions" subtitle="Operation, instructions, requirements and references">
                  <RowList
                    title="Instruction"
                    rows={form.instructions}
                    template={EMPTY_INSTRUCTION}
                    fields={[
                      { key: 'operation', label: 'operation', placeholder: 'Operation' },
                      { key: 'details', label: 'details', placeholder: 'Detailed instructions' },
                      { key: 'requirements', label: 'requirements', placeholder: 'Technical requirements' },
                      { key: 'refs', label: 'references', placeholder: 'Reference documents' },
                    ]}
                    onChange={(index, key, value) => updateRow('instructions', index, key, value)}
                    onAdd={(row) => addRow('instructions', row)}
                    onRemove={(index) => removeRow('instructions', index)}
                    addLabel="Add instruction"
                  />
                </Section>
                <Section icon={Factory} title="5. Equipment Requirements" subtitle="Equipment, specification, capacity and special requirements">
                  <RowList
                    title="Equipment"
                    rows={form.equipment}
                    template={EMPTY_EQUIPMENT}
                    fields={[
                      { key: 'name', label: 'equipment name', placeholder: 'Equipment name' },
                      { key: 'type', label: 'equipment type', placeholder: 'Equipment type' },
                      { key: 'specification', label: 'specification', placeholder: 'Specification' },
                      { key: 'capacity', label: 'capacity', placeholder: 'Capacity' },
                    ]}
                    onChange={(index, key, value) => updateRow('equipment', index, key, value)}
                    onAdd={(row) => addRow('equipment', row)}
                    onRemove={(index) => removeRow('equipment', index)}
                    addLabel="Add equipment"
                  />
                </Section>
                <Section icon={ClipboardCheck} title="6. Special Instructions" subtitle="Safety, handling, special notes and restrictions">
                  <div className="form-grid">
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-special-safety"
                        label="Safety Instructions"
                        rows={2}
                        value={form.special.safety}
                        onChange={(event) => setNested('special', 'safety', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-special-notes"
                        label="Special Manufacturing Notes"
                        rows={2}
                        value={form.special.notes}
                        onChange={(event) => setNested('special', 'notes', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-special-handling"
                        label="Handling Requirements"
                        rows={2}
                        value={form.special.handling}
                        onChange={(event) => setNested('special', 'handling', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-special-restrictions"
                        label="Technical Restrictions"
                        rows={2}
                        value={form.special.restrictions}
                        onChange={(event) => setNested('special', 'restrictions', event.target.value)}
                      />
                    </div>
                  </div>
                </Section>
                <Section icon={FileText} title="7. Technical Notes" subtitle="Description, engineering reference, drawing reference and notes">
                  <div className="form-grid">
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-note-description"
                        label="Technical Description"
                        rows={2}
                        value={form.notes.description}
                        onChange={(event) => setNested('notes', 'description', event.target.value)}
                      />
                    </div>
                    <Input
                      id="mfg-note-engineering"
                      label="Engineering Reference"
                      value={form.notes.engineeringRef}
                      onChange={(event) => setNested('notes', 'engineeringRef', event.target.value)}
                    />
                    <Input
                      id="mfg-note-drawing"
                      label="Drawing Reference"
                      value={form.notes.drawingRef}
                      onChange={(event) => setNested('notes', 'drawingRef', event.target.value)}
                    />
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-operation-notes"
                        label="Operation / Quality Notes"
                        rows={2}
                        value={form.operationNotes}
                        onChange={(event) => setField('operationNotes', event.target.value)}
                      />
                    </div>
                    <div className="form-grid-full">
                      <Textarea
                        id="mfg-note-additional"
                        label="Additional Notes"
                        rows={2}
                        value={form.notes.additional}
                        onChange={(event) => setNested('notes', 'additional', event.target.value)}
                      />
                    </div>
                  </div>
                </Section>
                <Section icon={Send} title="8. Manufacturing Package Release" subtitle="Package references and release status">
                  <div className="form-grid">
                    <Input
                      id="mfg-release-package"
                      label="Package ID"
                      value={form.release.packageId}
                      onChange={(event) => setNested('release', 'packageId', event.target.value)}
                    />
                    <Input
                      id="mfg-release-inspection"
                      label="Inspection Requirement Reference"
                      value={form.release.inspectionRef}
                      onChange={(event) => setNested('release', 'inspectionRef', event.target.value)}
                    />
                    <div className="form-field">
                      <span className="form-label">Release Status</span>
                      <span className="form-static">{form.release.releaseStatus}</span>
                    </div>
                    <div className="form-field">
                      <span className="form-label">Release Date</span>
                      <span className="form-static">{form.release.releaseDate || 'Not released'}</span>
                    </div>
                  </div>
                  <p className="anl-field-note">
                    Package release is performed from the record detail after approval. It does not start
                    production; production execution is owned by the Production module.
                  </p>
                </Section>
              </>
            )}

            <Section icon={Paperclip} title="Attachments" subtitle="Shop-floor references, marked drawings and check sheets" badge={form.attachments.length}>
              <label className="attachment-picker">
                <Paperclip aria-hidden="true" />
                <span>Select files (stored as local metadata only)</span>
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
              {form.attachments.length > 0 && (
                <ul className="mech-document-list anl-attachment-list">
                  {form.attachments.map((file) => (
                    <li key={file.name}>
                      <FileText aria-hidden="true" />
                      <span>{file.name}</span>
                      <span className="cell-muted">{file.type}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => {
                          touch();
                          setForm((previous) => ({
                            ...previous,
                            attachments: previous.attachments.filter((entry) => entry.name !== file.name),
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head">
                <Factory aria-hidden="true" />
                <strong>Record Context</strong>
              </div>
              <div className="mech-aside-body">
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Project</span>
                  <span>{form.projectId || 'Not selected'}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Component</span>
                  <span>{selectedPart ? selectedPart.partNumber : 'Select a part'}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Assembly</span>
                  <span>{selectedAssembly ? selectedAssembly.number : 'Not linked'}</span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Material</span>
                  <span>{form.material || selectedPart?.material || 'Not recorded'}</span>
                </div>
                {kind === 'definition' && (
                  <div className="mech-aside-group">
                    <span className="mech-aside-label">Verified Analysis</span>
                    <span>{form.analysisId || 'Not linked'}</span>
                  </div>
                )}
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Drawing</span>
                  <span>
                    {drawingNo || '—'} · Rev {drawingRevision}
                  </span>
                </div>
                <div className="mech-aside-group">
                  <span className="mech-aside-label">Reviewer</span>
                  <span>{form.reviewer}</span>
                </div>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head">
                <CheckCircle2 aria-hidden="true" />
                <strong>Readiness</strong>
              </div>
              <div className="mech-aside-body">
                <ul className="anl-checklist">
                  <li className={form.name.trim() ? 'is-done' : ''}>
                    <CheckCircle2 aria-hidden="true" />
                    Record name recorded
                  </li>
                  <li className={form.projectId && form.partId ? 'is-done' : ''}>
                    <CheckCircle2 aria-hidden="true" />
                    Project and part referenced
                  </li>
                  <li className={form.material.trim() ? 'is-done' : ''}>
                    <CheckCircle2 aria-hidden="true" />
                    Material or stock recorded
                  </li>
                  {kind === 'definition' && (
                    <li className={form.analysisId ? 'is-done' : ''}>
                      <CheckCircle2 aria-hidden="true" />
                      Verified analysis referenced
                    </li>
                  )}
                  {kind === 'process' && (
                    <li
                      className={
                        form.linkedDefinitionId && form.linkedInspectionId ? 'is-done' : ''
                      }
                    >
                      <CheckCircle2 aria-hidden="true" />
                      Definition and inspection requirement linked
                    </li>
                  )}
                  <li className={form.dueDate ? 'is-done' : ''}>
                    <CheckCircle2 aria-hidden="true" />
                    Target due date set
                  </li>
                  <li
                    className={
                      kind === 'definition'
                        ? technicalFields.some((field) => form.technical?.[field.key])
                          ? 'is-done'
                          : ''
                        : kind === 'inspection'
                          ? form.characteristics.some((entry) => entry.name)
                            ? 'is-done'
                            : ''
                          : form.sequence.some((entry) => entry.name)
                            ? 'is-done'
                            : ''
                    }
                  >
                    <CheckCircle2 aria-hidden="true" />
                    {kind === 'definition'
                      ? 'Category details recorded'
                      : kind === 'inspection'
                        ? 'Critical characteristic defined'
                        : 'Manufacturing sequence defined'}
                  </li>
                  <li className={form.attachments.length > 0 ? 'is-done' : ''}>
                    <CheckCircle2 aria-hidden="true" />
                    Supporting file attached
                  </li>
                </ul>
                <p className="mech-aside-note">
                  Saving keeps the record in Draft or In Preparation. Submission is a separate review step;
                  release is a separate controlled action.
                </p>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head">
                <Link2 aria-hidden="true" />
                <strong>Workflow Boundaries</strong>
              </div>
              <div className="mech-aside-body">
                <p className="mech-aside-note">
                  {kind === 'inspection'
                    ? 'This plan defines what must be inspected. Actual inspection execution, measured results and quality clearance belong to Quality Control.'
                    : kind === 'process'
                      ? 'This plan defines how the part is made. Production execution and shop-floor status belong to Production.'
                      : 'This definition records manufacturing requirements by reference. Design ownership and drawing revisions stay with their own modules.'}
                </p>
                <p className="mech-aside-note">
                  Design review and release authorization are owned by Design Review &amp; Approval.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={requestCancel}>
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {editing?.status || 'Draft'} · stored locally in this browser
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={() => persist('Draft', 'register')}>
              Save as Draft
            </Button>
            <Button
              icon={Save}
              onClick={() => persist(editing && editing.status !== 'Draft' ? editing.status : 'In Preparation', 'register')}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              icon={ArrowRight}
              onClick={() => persist(editing && editing.status !== 'Draft' ? editing.status : 'In Preparation', 'detail')}
            >
              Save &amp; Continue
            </Button>
            <Button icon={Send} onClick={submitForReview}>
              Submit for Review
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
            <Button onClick={() => navigate(registerPath)}>Discard &amp; Leave</Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Anything typed since the last save will be lost. Save as Draft first if you want to keep it.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
