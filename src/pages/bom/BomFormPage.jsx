import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers,
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
import { useBom } from '../../context/BomContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import { addDays, formatDate, TODAY } from '../../data/bomData';
import { BOM_STATUSES, BOM_TYPES, ENGINEERS, MAKE_BUY, REVIEWERS, UNITS, assemblyLabel, designForProject, statusTone } from '../../data/bomData';
import { StatusBadge } from '../../components/common';
import { AttachmentList, Toast, money, useToast } from './bomUi';

function Section({ icon: Icon, title, subtitle, badge, children }) {
  return (
    <section className="form-section-card is-open">
      <div className="form-section-head">
        <span className="form-section-icon" aria-hidden="true"><Icon /></span>
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

const EMPTY_ITEM = {
  id: '',
  itemNumber: '',
  partNumber: '',
  name: '',
  description: '',
  specification: '',
  referenceDrawing: '',
  remarks: '',
  qty: '1',
  uom: 'nos',
  material: '',
  partRevision: 'A',
  makeBuy: 'Make',
  unitCost: '0',
  assemblyId: '',
};

function itemsWithIds(items, bomId) {
  return items.map((row, index) => ({
    ...row,
    id: row.id || `BI-${bomId.slice(-3)}-${String(index + 1).padStart(2, '0')}`,
    itemNumber: row.itemNumber || String((index + 1) * 10),
  }));
}

export default function BomFormPage() {
  const { bomId } = useParams();
  const navigate = useNavigate();
  const { boms, nextBomId, addBom, updateBom, saveBomItems, submitBom } = useBom();
  const { designs, parts, assemblies } = useMechanical();
  const { definitions } = useManufacturing();
  const { drawings } = useCad();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const editing = bomId ? boms.find((row) => row.id === bomId) : null;
  const [formId] = useState(() => editing?.id || nextBomId());
  const [form, setForm] = useState(() => ({
    id: formId,
    name: editing?.name || '',
    projectId: editing?.projectId || projects[0]?.id || '',
    designId: editing?.designId || designForProject(editing?.projectId || projects[0]?.id || ''),
    assemblyId: editing?.assemblyId || '',
    bomType: editing?.bomType || BOM_TYPES[0],
    notes: editing?.notes || editing?.description || '',
    manufacturingDefinitionId: editing?.manufacturingDefinitionId || '',
    drawingId: editing?.drawingId || '',
    engineer: editing?.engineer || ENGINEERS[0],
    reviewer: editing?.reviewer || REVIEWERS[0],
    date: editing?.date || TODAY,
    dueDate: editing?.dueDate || addDays(TODAY, 30),
    revision: editing?.revision || 'A',
    description: editing?.description || '',
    status: editing?.status || 'Draft',
    attachments: editing?.attachments || [
      { name: 'assembly-drawing.pdf', type: 'Drawing', size: 248_000, uploadedBy: editing?.engineer || ENGINEERS[0], uploadedAt: TODAY },
    ],
  }));
  const [items, setItems] = useState(() =>
    (editing?.items?.length ? editing.items : [{ ...EMPTY_ITEM }]).map((row) => ({
      ...EMPTY_ITEM,
      ...row,
      qty: String(row.qty ?? '1'),
      unitCost: String(row.unitCost ?? '0'),
    })),
  );
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(false);

  const projectParts = useMemo(() => parts.filter((part) => !form.projectId || part.projectId === form.projectId), [parts, form.projectId]);
  const projectAssemblies = useMemo(() => assemblies.filter((assembly) => !form.projectId || assembly.projectId === form.projectId), [assemblies, form.projectId]);
  const projectDesigns = useMemo(() => designs.filter((design) => !form.projectId || design.projectId === form.projectId), [designs, form.projectId]);
  const projectDefinitions = useMemo(
    () => definitions.filter((definition) => !form.projectId || definition.projectId === form.projectId),
    [definitions, form.projectId],
  );
  const selectedPartNumber = items.find((row) => row.partNumber)?.partNumber;
  const selectedPart = parts.find((part) => part.partNumber === selectedPartNumber);
  const projectDrawings = useMemo(
    () =>
      drawings.filter(
        (drawing) =>
          (!form.projectId || drawing.projectId === form.projectId) &&
          (!selectedPart || drawing.partNumber === selectedPart.partNumber),
      ),
    [drawings, form.projectId, selectedPart],
  );
  const duplicateParts = useMemo(() => {
    const counts = new Map();
    items.forEach((row) => {
      const key = `${row.partNumber}|${row.assemblyId || form.assemblyId}|${row.partRevision}`;
      if (row.partNumber) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  }, [items, form.assemblyId]);
  const totals = useMemo(
    () => ({
      parts: items.filter((row) => row.partNumber).length,
      buy: items.filter((row) => row.makeBuy === 'Buy').length,
      make: items.filter((row) => row.makeBuy === 'Make').length,
      cost: items.reduce((total, row) => total + Number(row.qty || 0) * Number(row.unitCost || 0), 0),
    }),
    [items],
  );

  if (bomId && !editing) return <Navigate to="/bom-cost/bom" replace />;
  if (editing && !['Draft', 'In Progress', 'Changes Requested'].includes(editing.status)) {
    return <Navigate to={`/bom-cost/bom/${editing.id}`} replace />;
  }

  const setField = (key, value) => {
    setDirty(true);
    setErrors((previous) => ({ ...previous, [key]: '' }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const setItem = (index, key, value) => {
    setDirty(true);
    setItems((previous) =>
      previous.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [key]: value };
        if (key === 'partNumber') {
          const part = projectParts.find((row) => row.partNumber === value);
          if (part) {
            next.name = part.name;
            next.description = part.dimensions || '';
            next.material = part.material || '';
            next.specification = part.materialGrade || part.dimensions || '';
            next.referenceDrawing = next.referenceDrawing || `DRG-${part.partNumber}`;
            next.partRevision = part.revision || 'A';
            next.uom = part.uom || row.uom;
            next.assemblyId = part.parentAssemblyId || form.assemblyId;
          }
        }
        return next;
      }),
    );
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'BOM name is required.';
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.assemblyId) next.assemblyId = 'Select the product or assembly this BOM belongs to.';
    const rows = items.filter((row) => row.partNumber || row.name);
    if (rows.length === 0) next.items = 'Add at least one BOM item.';
    const badRow = rows.findIndex((row) => !row.partNumber.trim() || Number(row.qty) <= 0);
    if (badRow !== -1) next.items = `Item ${badRow + 1} needs a part number and a quantity greater than zero.`;
    const badCostRow = rows.findIndex((row) => Number(row.unitCost) < 0);
    if (badCostRow !== -1) next.items = `Item ${badCostRow + 1} unit cost cannot be negative.`;
    const itemNumbers = rows.map((row) => String(row.itemNumber || '').trim()).filter(Boolean);
    if (new Set(itemNumbers).size !== itemNumbers.length) next.items = 'Item numbers must be unique within the BOM.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = (status, destination) => {
    if (!validate()) {
      showToast('Fix the highlighted fields before saving.', 'error');
      return;
    }
    const rows = itemsWithIds(
      items
        .filter((row) => row.partNumber || row.name)
        .map((row) => {
          const part = projectParts.find((entry) => entry.partNumber === row.partNumber);
          return {
            ...row,
            qty: Number(row.qty),
            unitCost: Number(row.unitCost),
            assemblyId: row.assemblyId || part?.parentAssemblyId || form.assemblyId || '',
          };
        }),
      formId,
    );
    const payload = { ...form, id: formId, status, items: rows, updatedAt: TODAY };
    if (editing) {
      updateBom(formId, { ...payload, changeHistory: editing.changeHistory });
      saveBomItems(formId, rows, form.engineer);
      showToast(`${formId} ${status === 'Draft' ? 'saved as draft' : 'saved'}.`);
    } else {
      addBom({
        ...payload,
        changeHistory: [{ id: `CH-${Date.now()}`, at: TODAY, by: form.engineer, action: 'BOM created', description: `${rows.length} BOM item(s) compiled from approved parts.` }],
        statusHistory: [{ id: 'SH-1', status, at: TODAY, by: form.engineer, note: status === 'Draft' ? 'BOM created as a draft.' : 'BOM structure saved.' }],
        approvals: [],
        revisions: [
          {
            revision: form.revision,
            previous: '',
            date: form.date,
            by: form.engineer,
            note: 'Initial BOM revision issued.',
            status,
            items: rows,
          },
        ],
      });
      showToast(`${formId} created as ${status}.`);
    }
    setDirty(false);
    if (destination === 'detail') navigate(`/bom-cost/bom/${formId}`);
    else if (!editing) navigate(`/bom-cost/bom/${formId}`);
  };

  const submitForReview = () => {
    if (!validate()) {
      showToast('Fix the highlighted fields before submitting.', 'error');
      return;
    }
    persist('Under Review', 'detail');
    if (editing) {
      submitBom(formId, form.engineer);
      showToast(`${formId} submitted for review.`);
      navigate(`/bom-cost/bom/${formId}`);
    }
  };

  const requestCancel = () => {
    if (dirty) setCancelPrompt(true);
    else navigate(editing ? `/bom-cost/bom/${formId}` : '/bom-cost/bom');
  };

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'BOM & Cost Estimation', to: '/bom-cost' },
            { label: 'BOM Management', to: '/bom-cost/bom' },
            { label: editing ? `${formId} · Edit` : 'New BOM' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Layers}
          title={editing ? `Edit BOM ${formId}` : 'Create Engineering BOM'}
          subtitle="Compile the engineering structure from approved parts, assemblies and purchased references. Costs shown are mock estimates."
          actions={<Button variant="secondary" icon={ArrowLeft} onClick={requestCancel}>Back to Register</Button>}
        />
      }
    >
      <form className="project-form-page" onSubmit={(event) => { event.preventDefault(); persist(form.status === 'Draft' ? 'Draft' : 'In Progress', 'detail'); }} noValidate>
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <Section icon={FileText} title="1. BOM Information" subtitle="Identification, project, ownership and status">
              <div className="form-grid">
                <div className="form-field">
                  <span className="form-label">BOM Number</span>
                  <span className="form-static">{formId}</span>
                </div>
                <div className="form-field">
                  <span className="form-label">BOM Status</span>
                  <span className="form-static"><StatusBadge status={form.status} tone={statusTone(form.status)} /></span>
                </div>
                <div className="form-field">
                  <span className="form-label">Revision</span>
                  <span className="form-static">Rev {form.revision}</span>
                </div>
                <Input id="bom-date" label="BOM Date" type="date" value={form.date} onChange={(event) => setField('date', event.target.value)} />
                <div className="form-grid-full">
                  <Input id="bom-name" label="BOM Name" placeholder="e.g. Conveyor drive assembly BOM" value={form.name} hint={errors.name} aria-invalid={Boolean(errors.name)} onChange={(event) => setField('name', event.target.value)} />
                </div>
                <div className="form-grid-full">
                  <Textarea id="bom-description" label="Description" rows={2} placeholder="Scope of this BOM and the assembly it controls" value={form.description} onChange={(event) => setField('description', event.target.value)} />
                </div>
                <Select id="bom-type" label="BOM Type" options={BOM_TYPES.map((value) => ({ value, label: value }))} value={form.bomType} onChange={(event) => setField('bomType', event.target.value)} />
                <Textarea id="bom-notes" label="Notes" rows={2} value={form.notes} placeholder="Assumptions, exclusions or basis of the BOM" onChange={(event) => setField('notes', event.target.value)} />
                <Select id="bom-project" label="Project" options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={form.projectId} hint={errors.projectId} onChange={(event) => { setField('projectId', event.target.value); setField('designId', designForProject(event.target.value)); setField('assemblyId', ''); setField('manufacturingDefinitionId', ''); setField('drawingId', ''); setItems((previous) => previous.map((row) => ({ ...row, assemblyId: '' }))); }} />
                <Select id="bom-design" label="Mechanical Design (Module 05)" options={[{ value: '', label: 'No design reference' }, ...projectDesigns.map((design) => ({ value: design.id, label: `${design.id} · Rev ${design.revision} · ${design.name}` }))]} value={form.designId} onChange={(event) => setField('designId', event.target.value)} />
                <Select id="bom-assembly" label="Product / Assembly" options={[{ value: '', label: 'Select assembly' }, ...projectAssemblies.map((assembly) => ({ value: assembly.id, label: `${assembly.number} · ${assembly.name}` }))]} value={form.assemblyId} hint={errors.assemblyId} onChange={(event) => setField('assemblyId', event.target.value)} />
                <Select id="bom-manufacturing-definition" label="Manufacturing Definition (Module 08)" options={[{ value: '', label: 'No manufacturing definition' }, ...projectDefinitions.map((definition) => ({ value: definition.id, label: `${definition.id} · ${definition.name}` }))]} value={form.manufacturingDefinitionId} onChange={(event) => setField('manufacturingDefinitionId', event.target.value)} />
                <Select id="bom-drawing" label="CAD Drawing Reference (Module 10)" options={[{ value: '', label: 'No drawing reference' }, ...projectDrawings.map((drawing) => ({ value: drawing.id, label: `${drawing.drawingNumber} · Rev ${drawing.revision} · ${drawing.title}` }))]} value={form.drawingId} onChange={(event) => setField('drawingId', event.target.value)} />
                <Select id="bom-engineer" label="Responsible Engineer" options={ENGINEERS.map((value) => ({ value, label: value }))} value={form.engineer} onChange={(event) => setField('engineer', event.target.value)} />
                <Select id="bom-reviewer" label="Assigned Reviewer" options={REVIEWERS.map((value) => ({ value, label: value }))} value={form.reviewer} onChange={(event) => setField('reviewer', event.target.value)} />
                <Input id="bom-due-date" label="Target Release Date" type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} />
                {editing && <Select id="bom-status" label="Record Status" options={BOM_STATUSES.filter((status) => ['Draft', 'In Progress', 'Changes Requested'].includes(status)).map((status) => ({ value: status, label: status }))} value={form.status} onChange={(event) => setField('status', event.target.value)} />}
              </div>
            </Section>

            <Section icon={ClipboardList} title="2. BOM Items" subtitle="Parts, materials, quantities and make / buy classification" badge={items.length}>
              <datalist id="bom-part-options">
                {projectParts.map((part) => <option key={part.id} value={part.partNumber}>{part.name}</option>)}
              </datalist>
              {errors.items && <p className="form-hint bom-form-error"><AlertTriangle aria-hidden="true" /> {errors.items}</p>}
              {duplicateParts.length > 0 && (
                <p className="form-hint"><AlertTriangle aria-hidden="true" /> Repeated part/assembly/revision rows detected. This is allowed for hierarchical assemblies; confirm the quantities are intentional.</p>
              )}
              <div className="bom-item-list">
                <div className="bom-item-head" aria-hidden="true">
                  <span>Item No.</span><span>Part Number</span><span>Part Name / Description</span><span>Assembly</span><span>Qty</span><span>UOM</span><span>Material</span><span>Specification</span><span>Part Rev</span><span>Make / Buy</span><span>Ref. Drawing</span><span>Unit Cost</span><span>Line Total</span><span>Remarks</span><span /><span /><span />
                </div>
                {items.map((row, index) => (
                  <div className="bom-item-row" key={row.id || `item-${index}`}>
                    <input className="form-input" value={row.itemNumber || String((index + 1) * 10)} aria-label={`Item ${index + 1} item number`} onChange={(event) => setItem(index, 'itemNumber', event.target.value)} />
                    <input className="form-input" list="bom-part-options" value={row.partNumber} placeholder="Part number" aria-label={`Item ${index + 1} part number`} onChange={(event) => setItem(index, 'partNumber', event.target.value)} />
                    <input className="form-input" value={row.name} placeholder="Part name / description" aria-label={`Item ${index + 1} name`} onChange={(event) => setItem(index, 'name', event.target.value)} />
                    <select className="form-select" value={row.assemblyId || ''} aria-label={`Item ${index + 1} assembly`} onChange={(event) => setItem(index, 'assemblyId', event.target.value)}>
                      <option value="">{form.assemblyId ? 'Use BOM assembly' : 'No assembly'}</option>
                      {projectAssemblies.map((assembly) => <option key={assembly.id} value={assembly.id}>{assembly.number}</option>)}
                    </select>
                    <input className="form-input" type="number" min="0" step="0.01" value={row.qty} aria-label={`Item ${index + 1} quantity`} onChange={(event) => setItem(index, 'qty', event.target.value)} />
                    <select className="form-select" value={row.uom} aria-label={`Item ${index + 1} unit`} onChange={(event) => setItem(index, 'uom', event.target.value)}>
                      {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    <input className="form-input" value={row.material} placeholder="Material" aria-label={`Item ${index + 1} material`} onChange={(event) => setItem(index, 'material', event.target.value)} />
                    <input className="form-input" value={row.specification} placeholder="Specification" aria-label={`Item ${index + 1} specification`} onChange={(event) => setItem(index, 'specification', event.target.value)} />
                    <input className="form-input" value={row.partRevision} aria-label={`Item ${index + 1} part revision`} onChange={(event) => setItem(index, 'partRevision', event.target.value)} />
                    <select className="form-select" value={row.makeBuy} aria-label={`Item ${index + 1} make or buy`} onChange={(event) => setItem(index, 'makeBuy', event.target.value)}>
                      {MAKE_BUY.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <input className="form-input" value={row.referenceDrawing} placeholder="Drawing reference" aria-label={`Item ${index + 1} reference drawing`} onChange={(event) => setItem(index, 'referenceDrawing', event.target.value)} />
                    <input className="form-input" type="number" min="0" value={row.unitCost} aria-label={`Item ${index + 1} estimated unit cost`} onChange={(event) => setItem(index, 'unitCost', event.target.value)} />
                    <span className="bom-item-total">{money(Number(row.qty || 0) * Number(row.unitCost || 0))}</span>
                    <input className="form-input" value={row.remarks} placeholder="Remarks" aria-label={`Item ${index + 1} remarks`} onChange={(event) => setItem(index, 'remarks', event.target.value)} />
                    <button type="button" className="icon-btn" aria-label={`Move item ${index + 1} up`} disabled={index === 0} onClick={() => { setDirty(true); setItems((previous) => { const rows = [...previous]; [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; return rows.map((entry, rowIndex) => ({ ...entry, itemNumber: String((rowIndex + 1) * 10) })); }); }}>
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Move item ${index + 1} down`} disabled={index === items.length - 1} onClick={() => { setDirty(true); setItems((previous) => { const rows = [...previous]; [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]]; return rows.map((entry, rowIndex) => ({ ...entry, itemNumber: String((rowIndex + 1) * 10) })); }); }}>
                      <ArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Remove item ${index + 1}`} onClick={() => { setDirty(true); setItems((previous) => (previous.length === 1 ? [{ ...EMPTY_ITEM }] : previous.filter((_, rowIndex) => rowIndex !== index))); }}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => { setDirty(true); setItems((previous) => [...previous, { ...EMPTY_ITEM }]); }}>
                Add BOM Item
              </Button>
              <p className="form-hint">
                Type an approved part number to pull its name, material, revision and assembly. Each item can be
                mapped to a project assembly; items without one use the BOM assembly. Unit cost is an estimate used
                only for mock costing — it is not a Purchase price.
              </p>
            </Section>

            <Section icon={Paperclip} title="3. Attachments" subtitle="Drawing, specification and reference files (stored locally)">
              <AttachmentList
                files={form.attachments}
                onRemove={(name) => { setDirty(true); setForm((previous) => ({ ...previous, attachments: previous.attachments.filter((file) => file.name !== name) })); }}
              />
              <label className="button button-secondary button-sm bom-upload">
                <Paperclip aria-hidden="true" /> Add Attachment
                <input
                  type="file"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setDirty(true);
                    setForm((previous) => ({
                      ...previous,
                      attachments: [...previous.attachments, { name: file.name, type: 'Supporting', size: file.size, uploadedBy: form.engineer, uploadedAt: TODAY }],
                    }));
                  }}
                />
              </label>
            </Section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head"><Layers aria-hidden="true" /><strong>BOM Summary</strong></div>
              <div className="mech-aside-body">
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{form.projectId || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Assembly</span><span>{form.assemblyId ? assemblyLabel(assemblies, form.assemblyId) : 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">BOM Items</span><span>{totals.parts} lines</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Make / Buy</span><span>{totals.make} make · {totals.buy} buy</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Estimated Item Cost</span><span>{money(totals.cost)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Target Release</span><span>{formatDate(form.dueDate)}</span></div>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head"><CheckCircle2 aria-hidden="true" /><strong>Readiness</strong></div>
              <div className="mech-aside-body">
                <ul className="anl-checklist">
                  <li className={form.name.trim() ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />BOM name recorded</li>
                  <li className={form.projectId ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Project selected</li>
                  <li className={form.assemblyId ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Product / assembly linked</li>
                  <li className={totals.parts > 0 ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />BOM items added</li>
                  <li className={form.attachments.length > 0 ? 'is-done' : ''}><CheckCircle2 aria-hidden="true" />Supporting file attached</li>
                </ul>
                <p className="mech-aside-note">
                  Saving keeps this BOM editable. Approval and release are controlled from BOM Revision &amp; Release.
                </p>
              </div>
            </section>

            <section className="mech-aside-card">
              <div className="mech-aside-head"><AlertTriangle aria-hidden="true" /><strong>Mock Estimates</strong></div>
              <div className="mech-aside-body">
                <p className="mech-aside-note">
                  All quantities and costs in this module are illustrative frontend estimates. They do not represent
                  certified engineering calculations, vendor quotations or accounting costs.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={requestCancel}>Cancel</Button>
            <span className="project-form-actions-note">{formId} · {form.status} · stored locally in this browser</span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={() => persist('Draft', 'register')}>Save as Draft</Button>
            <Button icon={Save} onClick={() => persist(editing && editing.status !== 'Draft' ? editing.status : 'In Progress', 'register')}>Save</Button>
            <Button variant="secondary" icon={ArrowRight} onClick={() => persist(editing && editing.status !== 'Draft' ? editing.status : 'In Progress', 'detail')}>Save &amp; Continue</Button>
            <Button icon={Send} onClick={submitForReview}>Submit for Review</Button>
          </div>
        </div>
      </form>

      <Modal
        open={cancelPrompt}
        onClose={() => setCancelPrompt(false)}
        title="Discard unsaved changes?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelPrompt(false)}>Keep Editing</Button>
            <Button onClick={() => navigate(editing ? `/bom-cost/bom/${formId}` : '/bom-cost/bom')}>Discard &amp; Leave</Button>
          </>
        }
      >
        <p className="dash-modal-note">Anything typed since the last save will be lost.</p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
