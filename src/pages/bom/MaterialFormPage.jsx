import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, CheckCircle2, Save, X } from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  PageHeader,
  PageLayout,
  Select,
  Textarea,
} from '../../components/common';
import { useBom } from '../../context/BomContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { MATERIAL_CATALOG, isBomEditable, materialByCode } from '../../data/bomData';
import { Toast, money, useToast } from './bomUi';

export default function MaterialFormPage() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const { boms, materials, nextMaterialId, addMaterial, updateMaterial } = useBom();
  const { parts } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const editing = materialId ? materials.find((row) => row.id === materialId) : null;
  const editableBoms = boms.filter(isBomEditable);
  const editingBom = editing ? boms.find((bom) => bom.id === editing.bomId) : null;
  const [formId] = useState(() => editing?.id || nextMaterialId());
  const [form, setForm] = useState(() => ({
    projectId: editing?.projectId || editableBoms[0]?.projectId || projects[0]?.id || '',
    bomId: editing?.bomId || editableBoms[0]?.id || '',
    partNumber: editing?.partNumber || '',
    materialCode: editing?.materialCode || MATERIAL_CATALOG[0].code,
    qty: String(editing?.qty ?? ''),
    rate: String(editing?.rate ?? MATERIAL_CATALOG[0].rate),
    notes: editing?.notes || '',
  }));
  const [errors, setErrors] = useState({});

  if (materialId && !editing) return <Navigate to="/bom-cost/bom" replace />;
  if (editing && !isBomEditable(editingBom)) return <Navigate to="/bom-cost/bom" replace />;

  const catalog = materialByCode(form.materialCode) || {};
  const projectBoms = editableBoms.filter((bom) => bom.projectId === form.projectId);
  const selectedBom = boms.find((bom) => bom.id === form.bomId);
  const projectParts = parts.filter((part) => !selectedBom || part.projectId === selectedBom.projectId);

  const setField = (key, value) => {
    setErrors((previous) => ({ ...previous, [key]: '' }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const save = (destination) => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.bomId) next.bomId = 'Select the BOM this material supports.';
    else if (!isBomEditable(boms.find((bom) => bom.id === form.bomId))) {
      next.bomId = 'This BOM is locked. Select an editable BOM or create a new revision first.';
    }
    if (!form.materialCode) next.materialCode = 'Select a material.';
    if (!form.qty || Number(form.qty) <= 0) next.qty = 'Enter a quantity greater than zero.';
    if (!form.partNumber.trim()) next.partNumber = 'Link the requirement to a part number.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      showToast('Fix the highlighted fields before saving.', 'error');
      return;
    }
    const payload = {
      projectId: form.projectId,
      bomId: form.bomId,
      partNumber: form.partNumber,
      materialCode: form.materialCode,
      qty: Number(form.qty),
      rate: Number(form.rate),
      unit: catalog.unit || 'kg',
      notes: form.notes,
    };
    const result = editing
      ? updateMaterial(formId, payload)
      : addMaterial({ ...payload, id: formId });
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${formId} ${editing ? 'updated' : 'created'}.`);
    if (destination === 'register') navigate('/bom-cost/bom');
  };

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'BOM & Cost Estimation', to: '/bom-cost' },
            { label: 'BOM Management', to: '/bom-cost/bom' },
            { label: editing ? `${formId} · Edit` : 'New Material Requirement' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Boxes}
          title={editing ? `Edit Material Requirement ${formId}` : 'New Material Requirement'}
          subtitle="Record the material needed for an engineering BOM item. Rates are mock planning estimates, not Purchase prices."
          actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/bom-cost/bom')}>Back to Register</Button>}
        />
      }
    >
      <form className="project-form-page" onSubmit={(event) => { event.preventDefault(); save('register'); }} noValidate>
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <section className="form-section-card is-open">
              <div className="form-section-head">
                <span className="form-section-icon" aria-hidden="true"><Boxes /></span>
                <span className="form-section-text"><strong>Material Requirement</strong><span>Material, quantity and linked engineering references</span></span>
              </div>
              <div className="form-section-body">
                <div className="form-grid">
                  <div className="form-field"><span className="form-label">Requirement ID</span><span className="form-static">{formId}</span></div>
                  <div className="form-field"><span className="form-label">Unit</span><span className="form-static">{catalog.unit || '—'}</span></div>
                  <Select id="material-project" label="Project" options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={form.projectId} hint={errors.projectId} onChange={(event) => { setField('projectId', event.target.value); setField('bomId', ''); }} />
                  <Select id="material-bom" label="BOM Number" options={[{ value: '', label: 'Select BOM' }, ...projectBoms.map((bom) => ({ value: bom.id, label: `${bom.id} · ${bom.name}` }))]} value={form.bomId} hint={errors.bomId} onChange={(event) => setField('bomId', event.target.value)} />
                  <Select
                    id="material-code"
                    label="Material Code"
                    options={MATERIAL_CATALOG.map((row) => ({ value: row.code, label: `${row.code} · ${row.name} (${row.grade})` }))}
                    value={form.materialCode}
                    hint={errors.materialCode}
                    onChange={(event) => {
                      const next = materialByCode(event.target.value);
                      setForm((previous) => ({ ...previous, materialCode: event.target.value, rate: String(next?.rate ?? previous.rate) }));
                    }}
                  />
                  <div className="form-field"><span className="form-label">Material Name</span><span className="form-static">{catalog.name || '—'}</span></div>
                  <div className="form-field"><span className="form-label">Material Grade</span><span className="form-static">{catalog.grade || '—'}</span></div>
                  <div className="form-field"><span className="form-label">Specification</span><span className="form-static">{catalog.specification || '—'}</span></div>
                  <Input id="material-part" label="Linked Part Number" list="material-part-options" value={form.partNumber} hint={errors.partNumber} onChange={(event) => setField('partNumber', event.target.value)} />
                  <Input id="material-qty" label="Required Quantity" type="number" min="0" step="0.01" value={form.qty} hint={errors.qty} onChange={(event) => setField('qty', event.target.value)} />
                  <Input id="material-rate" label="Estimated Unit Rate" type="number" min="0" value={form.rate} onChange={(event) => setField('rate', event.target.value)} />
                  <div className="form-field"><span className="form-label">Estimated Material Cost</span><span className="form-static">{money(Number(form.qty || 0) * Number(form.rate || 0))}</span></div>
                  <div className="form-grid-full"><Textarea id="material-notes" label="Notes" rows={3} value={form.notes} placeholder="Allowance, stock reference or calculation note" onChange={(event) => setField('notes', event.target.value)} /></div>
                </div>
                <datalist id="material-part-options">
                  {projectParts.map((part) => <option key={part.id} value={part.partNumber}>{part.name}</option>)}
                </datalist>
              </div>
            </section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head"><CheckCircle2 aria-hidden="true" /><strong>Requirement Summary</strong></div>
              <div className="mech-aside-body">
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{form.projectId || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">BOM</span><span>{form.bomId ? `${form.bomId} · Rev ${selectedBom?.revision}` : 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Material</span><span>{catalog.name ? `${catalog.name} · ${catalog.grade}` : 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Quantity</span><span>{form.qty ? `${form.qty} ${catalog.unit || ''}` : '—'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Estimated Cost</span><span>{money(Number(form.qty || 0) * Number(form.rate || 0))}</span></div>
              </div>
            </section>
            <section className="mech-aside-card">
              <div className="mech-aside-head"><Boxes aria-hidden="true" /><strong>Mock Estimate</strong></div>
              <div className="mech-aside-body"><p className="mech-aside-note">This material requirement feeds the cost estimate only. Actual procurement pricing is owned by the Purchase module.</p></div>
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={() => navigate('/bom-cost/bom')}>Cancel</Button>
            <span className="project-form-actions-note">{formId} · stored locally in this browser</span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={() => save('stay')}>Save</Button>
            <Button icon={Save} onClick={() => save('register')}>Save &amp; Continue</Button>
          </div>
        </div>
      </form>
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
