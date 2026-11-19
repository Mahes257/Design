import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle2, Save, X } from 'lucide-react';
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
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, UNITS, isBomEditable } from '../../data/bomData';
import { Toast, useToast } from './bomUi';

export default function QuantityFormPage() {
  const { calcId } = useParams();
  const navigate = useNavigate();
  const { boms, quantities, nextQuantityId, addQuantity, updateQuantity } = useBom();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const editing = calcId ? quantities.find((row) => row.id === calcId) : null;
  const editableBoms = boms.filter(isBomEditable);
  const editingBom = editing ? boms.find((bom) => bom.id === editing.bomId) : null;
  const [formId] = useState(() => editing?.id || nextQuantityId());
  const [form, setForm] = useState(() => ({
    projectId: editing?.projectId || editableBoms[0]?.projectId || '',
    bomId: editing?.bomId || editableBoms[0]?.id || '',
    partNumber: editing?.partNumber || '',
    component: editing?.component || '',
    baseQty: String(editing?.baseQty ?? '1'),
    requiredQty: String(editing?.requiredQty ?? '1'),
    unit: editing?.unit || 'nos',
    allowance: String(editing?.allowance ?? '0'),
    finalQty: String(editing?.finalQty ?? '1'),
    engineer: editing?.engineer || ENGINEERS[0],
    notes: editing?.notes || '',
  }));
  const [errors, setErrors] = useState({});

  if (calcId && !editing) return <Navigate to="/bom-cost/bom" replace />;
  if (editing && !isBomEditable(editingBom)) return <Navigate to="/bom-cost/bom" replace />;

  const projectBoms = editableBoms.filter((bom) => bom.projectId === form.projectId);
  const selectedBom = boms.find((bom) => bom.id === form.bomId);
  const calculatedFinal = (Number(form.requiredQty || 0) * (1 + Number(form.allowance || 0) / 100)).toFixed(2);

  const setField = (key, value) => {
    setErrors((previous) => ({ ...previous, [key]: '' }));
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      if (['requiredQty', 'allowance'].includes(key)) {
        next.finalQty = (Number(next.requiredQty || 0) * (1 + Number(next.allowance || 0) / 100)).toFixed(2);
      }
      return next;
    });
  };

  const save = (destination) => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.bomId) next.bomId = 'Select a BOM.';
    else if (!isBomEditable(boms.find((bom) => bom.id === form.bomId))) {
      next.bomId = 'This BOM is locked. Select an editable BOM or create a new revision first.';
    }
    if (!form.component.trim()) next.component = 'Component description is required.';
    if (!form.partNumber.trim()) next.partNumber = 'Part number is required.';
    if (!form.baseQty || Number(form.baseQty) <= 0) next.baseQty = 'Base quantity must be greater than zero.';
    if (!form.requiredQty || Number(form.requiredQty) <= 0) next.requiredQty = 'Required quantity must be greater than zero.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      showToast('Fix the highlighted fields before saving.', 'error');
      return;
    }
    const payload = {
      projectId: form.projectId,
      bomId: form.bomId,
      partNumber: form.partNumber,
      component: form.component,
      baseQty: Number(form.baseQty),
      requiredQty: Number(form.requiredQty),
      unit: form.unit,
      allowance: Number(form.allowance),
      finalQty: Number(form.finalQty),
      engineer: form.engineer,
      notes: form.notes,
    };
    const result = editing
      ? updateQuantity(formId, payload)
      : addQuantity({ ...payload, id: formId, status: 'Draft', recordDate: new Date().toISOString().slice(0, 10) });
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
            { label: editing ? `${formId} · Edit` : 'New Quantity Calculation' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Calculator}
          title={editing ? `Edit Quantity Calculation ${formId}` : 'New Quantity Calculation'}
          subtitle="Record the calculated material or component quantity with allowance. Figures are illustrative mock estimates."
          actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/bom-cost/bom')}>Back to Register</Button>}
        />
      }
    >
      <form className="project-form-page" onSubmit={(event) => { event.preventDefault(); save('register'); }} noValidate>
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <section className="form-section-card is-open">
              <div className="form-section-head">
                <span className="form-section-icon" aria-hidden="true"><Calculator /></span>
                <span className="form-section-text"><strong>Calculation Detail</strong><span>Reference, quantity basis and allowance</span></span>
              </div>
              <div className="form-section-body">
                <div className="form-grid">
                  <div className="form-field"><span className="form-label">Calculation Reference</span><span className="form-static">{formId}</span></div>
                  <div className="form-field"><span className="form-label">Source</span><span className="form-static">Local mock record</span></div>
                  <Select id="quantity-project" label="Project" options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={form.projectId} hint={errors.projectId} onChange={(event) => { setField('projectId', event.target.value); setField('bomId', ''); }} />
                  <Select id="quantity-bom" label="BOM Number" options={[{ value: '', label: 'Select BOM' }, ...projectBoms.map((bom) => ({ value: bom.id, label: `${bom.id} · ${bom.name}` }))]} value={form.bomId} hint={errors.bomId} onChange={(event) => setField('bomId', event.target.value)} />
                  <div className="form-grid-full">
                    <Select
                      id="quantity-part"
                      label="Part Number"
                      options={[{ value: '', label: 'Select part' }, ...(selectedBom?.items || []).map((row) => ({ value: row.partNumber, label: `${row.partNumber} · ${row.name}` }))]}
                      value={form.partNumber}
                      hint={errors.partNumber}
                      onChange={(event) => {
                        const item = selectedBom?.items.find((row) => row.partNumber === event.target.value);
                        setForm((previous) => ({ ...previous, partNumber: event.target.value, component: item?.name || previous.component, unit: item?.uom || previous.unit }));
                      }}
                    />
                  </div>
                  <div className="form-grid-full"><Input id="quantity-component" label="Component" value={form.component} hint={errors.component} onChange={(event) => setField('component', event.target.value)} /></div>
                  <Input id="quantity-base" label="Base Quantity" type="number" min="0" step="0.01" value={form.baseQty} hint={errors.baseQty} onChange={(event) => setField('baseQty', event.target.value)} />
                  <Input id="quantity-required" label="Required Quantity" type="number" min="0" step="0.01" value={form.requiredQty} hint={errors.requiredQty} onChange={(event) => setField('requiredQty', event.target.value)} />
                  <Select id="quantity-unit" label="Unit" options={UNITS.map((unit) => ({ value: unit, label: unit }))} value={form.unit} onChange={(event) => setField('unit', event.target.value)} />
                  <Input id="quantity-allowance" label="Allowance / Wastage (%)" type="number" min="0" step="0.1" value={form.allowance} onChange={(event) => setField('allowance', event.target.value)} />
                  <Input id="quantity-final" label="Final Quantity" type="number" step="0.01" value={form.finalQty} onChange={(event) => setField('finalQty', event.target.value)} />
                  <div className="form-field"><span className="form-label">Calculated Final (mock)</span><span className="form-static">{calculatedFinal} {form.unit}</span></div>
                  <Select id="quantity-engineer" label="Responsible Engineer" options={ENGINEERS.map((value) => ({ value, label: value }))} value={form.engineer} onChange={(event) => setField('engineer', event.target.value)} />
                  <div className="form-grid-full"><Textarea id="quantity-notes" label="Engineer Notes" rows={3} value={form.notes} placeholder="Calculation basis, allowance reasoning or reference" onChange={(event) => setField('notes', event.target.value)} /></div>
                </div>
              </div>
            </section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head"><CheckCircle2 aria-hidden="true" /><strong>Quantity Summary</strong></div>
              <div className="mech-aside-body">
                <div className="mech-aside-group"><span className="mech-aside-label">BOM</span><span>{form.bomId || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Part</span><span>{form.partNumber || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Base → Required</span><span>{form.baseQty} → {form.requiredQty} {form.unit}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Allowance</span><span>{form.allowance || 0}%</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Final Quantity</span><span>{form.finalQty} {form.unit}</span></div>
              </div>
            </section>
            <section className="mech-aside-card">
              <div className="mech-aside-head"><Calculator aria-hidden="true" /><strong>Illustrative Only</strong></div>
              <div className="mech-aside-body"><p className="mech-aside-note">Allowance is a planning estimate and is not a certified engineering calculation or a production consumption figure.</p></div>
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
