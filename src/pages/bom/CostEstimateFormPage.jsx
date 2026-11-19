import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Coins, Save, X } from 'lucide-react';
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
import {
  COST_CATEGORIES,
  COST_STATUSES,
  ENGINEERS,
  TODAY,
  assemblyLabel,
  bomItemTotal,
  bomMaterials,
  costLinesFromEstimate,
  materialRequirementCost,
} from '../../data/bomData';
import { Toast, money, useToast } from './bomUi';

const blankLines = () => COST_CATEGORIES.map((category) => ({ ...category, qty: '1', unitCost: '' }));

export default function CostEstimateFormPage() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const { boms, materials, estimates, nextEstimateId, addEstimate, updateEstimate } = useBom();
  const { projects } = useProjects();
  const { assemblies } = useMechanical();
  const { toast, showToast, clearToast } = useToast();
  const editing = estimateId ? estimates.find((row) => row.id === estimateId) : null;
  const [formId] = useState(() => editing?.id || nextEstimateId());
  const initialBom = boms.find((bom) => bom.id === editing?.bomId);
  const [form, setForm] = useState(() => ({
    projectId: editing?.projectId || initialBom?.projectId || boms[0]?.projectId || '',
    bomId: editing?.bomId || '',
    revision: editing?.revision || initialBom?.revision || '',
    product: editing?.product || '',
    currency: editing?.currency || 'INR',
    preparedBy: editing?.preparedBy || ENGINEERS[0],
    date: editing?.date || TODAY,
    status: editing?.status || 'Draft',
    assumptions: editing?.assumptions || '',
    notes: editing?.notes || '',
    additionalCost: String(editing?.additionalCost ?? '0'),
    contingencyPct: String(editing?.contingencyPct ?? '0'),
    costLines: editing ? costLinesFromEstimate(editing) : blankLines(),
  }));
  const [errors, setErrors] = useState({});

  if (estimateId && !editing) return <Navigate to="/bom-cost/cost" replace />;

  const projectBoms = boms.filter((bom) => bom.projectId === form.projectId);
  const selectedBom = boms.find((bom) => bom.id === form.bomId);
  const revisionOptions = selectedBom?.revisions?.length
    ? selectedBom.revisions.map((row) => row.revision)
    : selectedBom
      ? [selectedBom.revision]
      : [];

  const calculated = useMemo(() => {
    const lines = form.costLines.map((line) => {
      const qty = Number(line.qty);
      const unitCost = Number(line.unitCost);
      const missing = String(line.qty).trim() === '' || String(line.unitCost).trim() === '';
      return { ...line, qty, unitCost, missing, total: missing ? 0 : qty * unitCost };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const contingency = subtotal * (Number(form.contingencyPct || 0) / 100);
    const additionalCost = Number(form.additionalCost || 0);
    return {
      lines,
      subtotal,
      contingency,
      additionalCost,
      total: subtotal + additionalCost + contingency,
      missingCount: lines.filter((line) => line.missing).length,
      enteredCount: lines.filter((line) => !line.missing && line.unitCost > 0).length,
    };
  }, [form.costLines, form.contingencyPct, form.additionalCost]);

  const setField = (key, value) => {
    setErrors((previous) => ({ ...previous, [key]: '' }));
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const setLine = (index, key, value) => {
    setForm((previous) => ({
      ...previous,
      costLines: previous.costLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    }));
  };

  const applyBomFigures = (bomId) => {
    const bom = boms.find((row) => row.id === bomId);
    if (!bom) {
      setForm((previous) => ({ ...previous, bomId, revision: '', product: '' }));
      return;
    }
    const material = materialRequirementCost(bomMaterials(materials, bom.id));
    const purchased = bom.items
      .filter((item) => item.makeBuy === 'Buy')
      .reduce((sum, item) => sum + bomItemTotal(item), 0);
    setForm((previous) => ({
      ...previous,
      bomId,
      revision: bom.revision,
      product: bom.name.replace(/ BOM$/, ''),
      costLines: previous.costLines.map((line) =>
        line.key === 'materialCost'
          ? { ...line, qty: '1', unitCost: String(Math.round(material + purchased)) }
          : line,
      ),
    }));
    showToast('BOM reference figures loaded into the material line. Review and edit before saving.');
  };

  const save = (status, destination) => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select a project.';
    if (!form.bomId) next.bomId = 'Select the source BOM.';
    if (!form.revision) next.revision = 'Select the BOM revision this estimate prices.';
    if (!form.product.trim()) next.product = 'Product or assembly name is required.';
    const invalidLine = calculated.lines.find(
      (line) => Number(line.qty) < 0 || Number(line.unitCost) < 0,
    );
    if (invalidLine) next.lines = `${invalidLine.label} quantity and unit cost cannot be negative.`;
    if (!next.lines && calculated.lines.every((line) => !line.unitCost)) {
      next.lines = 'Enter at least one cost line. Zero-value estimates are allowed only as drafts.';
      if (status === 'Draft') delete next.lines;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      showToast('Fix the highlighted fields before saving.', 'error');
      return;
    }
    const categoryTotals = Object.fromEntries(
      calculated.lines.map((line) => [line.key, Number((line.qty * line.unitCost).toFixed(2))]),
    );
    const payload = {
      projectId: form.projectId,
      bomId: form.bomId,
      revision: form.revision,
      product: form.product,
      materialCost: categoryTotals.materialCost || 0,
      purchasedCost: 0,
      manufacturingCost: categoryTotals.manufacturingCost || 0,
      labourCost: categoryTotals.labourCost || 0,
      toolingCost: categoryTotals.toolingCost || 0,
      inspectionCost: categoryTotals.inspectionCost || 0,
      outsourcedCost: categoryTotals.outsourcedCost || 0,
      otherCost: categoryTotals.otherCost || 0,
      processCost: categoryTotals.manufacturingCost || 0,
      costLines: calculated.lines.map((line) => ({
        key: line.key,
        label: line.label,
        qty: line.qty,
        unitCost: line.unitCost,
      })),
      additionalCost: calculated.additionalCost,
      contingencyPct: Number(form.contingencyPct || 0),
      subtotal: calculated.subtotal,
      estimatedTotal: calculated.total,
      totalCost: calculated.total,
      currency: form.currency,
      preparedBy: form.preparedBy,
      date: form.date,
      status,
      assumptions: form.assumptions,
      notes: form.notes,
    };
    if (editing) updateEstimate(formId, payload);
    else addEstimate({ ...payload, id: formId });
    showToast(`${formId} ${status === 'Draft' ? 'saved as draft' : 'saved'}.`);
    if (destination === 'register') navigate('/bom-cost/cost');
  };

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'BOM & Cost Estimation', to: '/bom-cost' },
            { label: 'Cost Planning & Estimation', to: '/bom-cost/cost' },
            { label: editing ? `${formId} · Edit` : 'New Cost Estimate' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Coins}
          title={editing ? `Edit Cost Estimate ${formId}` : 'New Cost Estimate'}
          subtitle="Prepare a planning estimate against a specific BOM revision. Every total is calculated from the quantities and unit costs you enter."
          actions={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/bom-cost/cost')}>Back to Register</Button>}
        />
      }
    >
      <form className="project-form-page" onSubmit={(event) => { event.preventDefault(); save(form.status, 'stay'); }} noValidate>
        <div className="mech-form-layout">
          <div className="mech-form-main">
            <section className="form-section-card is-open">
              <div className="form-section-head">
                <span className="form-section-icon" aria-hidden="true"><Coins /></span>
                <span className="form-section-text"><strong>Estimate Information</strong><span>Source BOM, revision and ownership</span></span>
              </div>
              <div className="form-section-body">
                <div className="form-grid">
                  <div className="form-field"><span className="form-label">Estimate ID</span><span className="form-static">{formId}</span></div>
                  <Input id="estimate-date" label="Estimate Date" type="date" value={form.date} onChange={(event) => setField('date', event.target.value)} />
                  <Select id="estimate-project" label="Project" options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={form.projectId} hint={errors.projectId} onChange={(event) => { setField('projectId', event.target.value); setField('bomId', ''); setField('revision', ''); }} />
                  <Select id="estimate-bom" label="BOM Number" options={[{ value: '', label: 'Select BOM' }, ...projectBoms.map((bom) => ({ value: bom.id, label: `${bom.id} · ${bom.name}` }))]} value={form.bomId} hint={errors.bomId} onChange={(event) => applyBomFigures(event.target.value)} />
                  <Select id="estimate-revision" label="BOM Revision" options={[{ value: '', label: selectedBom ? 'Select revision' : 'Select a BOM first' }, ...revisionOptions.map((revision) => ({ value: revision, label: `Rev ${revision}` }))]} value={form.revision} hint={errors.revision} onChange={(event) => setField('revision', event.target.value)} />
                  <Input id="estimate-product" label="Product / Assembly" value={form.product} hint={errors.product} onChange={(event) => setField('product', event.target.value)} />
                  <Select id="estimate-prepared" label="Prepared By" options={ENGINEERS.map((value) => ({ value, label: value }))} value={form.preparedBy} onChange={(event) => setField('preparedBy', event.target.value)} />
                  <Select id="estimate-currency" label="Currency" options={[{ value: 'INR', label: 'INR — Indian Rupee' }, { value: 'USD', label: 'USD — US Dollar' }, { value: 'EUR', label: 'EUR — Euro' }]} value={form.currency} onChange={(event) => setField('currency', event.target.value)} />
                  <Select id="estimate-status" label="Estimate Status" options={COST_STATUSES.map((status) => ({ value: status, label: status }))} value={form.status} onChange={(event) => setField('status', event.target.value)} />
                  <div className="form-field"><span className="form-label">Assembly</span><span className="form-static">{selectedBom ? assemblyLabel(assemblies, selectedBom.assemblyId) : 'Select a BOM'}</span></div>
                </div>
                {selectedBom && (
                  <p className="form-hint">
                    {selectedBom.id} · Rev {selectedBom.revision} · {selectedBom.items.length} items. Selecting a BOM loads its
                    existing material and purchased reference figures into the material line; every value remains editable and no
                    supplier price is fetched.
                  </p>
                )}
              </div>
            </section>

            <section className="form-section-card is-open">
              <div className="form-section-head">
                <span className="form-section-icon" aria-hidden="true"><Coins /></span>
                <span className="form-section-text"><strong>Cost Breakdown</strong><span>Entered quantities and unit costs; line totals and estimate totals are calculated</span></span>
              </div>
              <div className="form-section-body">
                {errors.lines && <p className="form-hint bom-form-error"><AlertTriangle aria-hidden="true" /> {errors.lines}</p>}
                <div className="bom-cost-lines" role="table" aria-label="Cost estimate lines">
                  <div className="bom-cost-line is-head" role="row">
                    <span>Cost Category</span><span>Source</span><span>Quantity</span><span>Unit Cost</span><span>Cost per Line</span>
                  </div>
                  {calculated.lines.map((line, index) => (
                    <div className="bom-cost-line" role="row" key={line.key}>
                      <span className="bom-cost-category">{line.label}</span>
                      <span className={`bom-cost-source ${line.missing ? 'is-missing' : ''}`}>{line.missing ? 'Missing value' : 'Entered'}</span>
                      <input className="form-input" type="number" min="0" step="0.01" value={line.qty} aria-label={`${line.label} quantity`} onChange={(event) => setLine(index, 'qty', event.target.value)} />
                      <input className="form-input" type="number" min="0" step="0.01" value={line.unitCost} aria-label={`${line.label} unit cost`} onChange={(event) => setLine(index, 'unitCost', event.target.value)} />
                      <span className="bom-cost-line-total">
                        {line.missing ? '—' : money(line.total, form.currency)}
                        <small>Calculated</small>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bom-cost-summary">
                  <div><span>Subtotal</span><strong>{money(calculated.subtotal, form.currency)}</strong><small>Calculated</small></div>
                  <label><span>Additional Cost</span><input className="form-input" type="number" min="0" value={form.additionalCost} onChange={(event) => setField('additionalCost', event.target.value)} /><small>Entered</small></label>
                  <label><span>Contingency %</span><input className="form-input" type="number" min="0" max="100" step="0.1" value={form.contingencyPct} onChange={(event) => setField('contingencyPct', event.target.value)} /><small>{money(calculated.contingency, form.currency)} calculated</small></label>
                  <div className="bom-cost-grand-total"><span>Estimated Total</span><strong>{money(calculated.total, form.currency)}</strong><small>Calculated</small></div>
                </div>
                {calculated.missingCount > 0 && (
                  <p className="form-hint"><AlertTriangle aria-hidden="true" /> {calculated.missingCount} cost line(s) have missing values and are excluded from the total until completed.</p>
                )}
                <div className="form-grid">
                  <div className="form-grid-full"><Textarea id="estimate-assumptions" label="Estimation Assumptions" rows={3} value={form.assumptions} placeholder="Batch size, make/buy basis, rates referenced, exclusions" onChange={(event) => setField('assumptions', event.target.value)} /></div>
                  <div className="form-grid-full"><Textarea id="estimate-notes" label="Notes" rows={3} value={form.notes} placeholder="Any additional context for reviewers" onChange={(event) => setField('notes', event.target.value)} /></div>
                </div>
              </div>
            </section>
          </div>

          <aside className="mech-form-aside">
            <section className="mech-aside-card">
              <div className="mech-aside-head"><Coins aria-hidden="true" /><strong>Estimate Summary</strong></div>
              <div className="mech-aside-body">
                <div className="mech-aside-group"><span className="mech-aside-label">Project</span><span>{form.projectId || 'Not selected'}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">BOM / Revision</span><span>{form.bomId ? `${form.bomId} · Rev ${form.revision || '—'}` : 'Not selected'}</span></div>
                {calculated.lines.filter((line) => line.unitCost > 0).map((line) => (
                  <div className="mech-aside-group" key={line.key}><span className="mech-aside-label">{line.label}</span><span>{money(line.total, form.currency)}</span></div>
                ))}
                <div className="mech-aside-group"><span className="mech-aside-label">Subtotal</span><span>{money(calculated.subtotal, form.currency)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Contingency</span><span>{money(calculated.contingency, form.currency)}</span></div>
                <div className="mech-aside-group"><span className="mech-aside-label">Additional</span><span>{money(calculated.additionalCost, form.currency)}</span></div>
                <div className="mech-aside-group bom-aside-total"><span className="mech-aside-label">Total Estimated</span><span>{money(calculated.total, form.currency)}</span></div>
              </div>
            </section>
            <section className="mech-aside-card">
              <div className="mech-aside-head"><CheckCircle2 aria-hidden="true" /><strong>Planning Only</strong></div>
              <div className="mech-aside-body">
                <p className="mech-aside-note">No vendor quotation, purchase order or accounting cost is created. Saving this estimate does not start procurement.</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={() => navigate('/bom-cost/cost')}>Cancel</Button>
            <span className="project-form-actions-note">{formId} · {form.status} · stored locally in this browser</span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={() => save('Draft', 'register')}>Save as Draft</Button>
            <Button icon={Save} onClick={() => save(form.status, 'stay')}>Save</Button>
            <Button variant="secondary" icon={Save} onClick={() => save(form.status, 'register')}>Save &amp; Continue</Button>
          </div>
        </div>
      </form>
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
