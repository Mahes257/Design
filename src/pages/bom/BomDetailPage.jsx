import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Eye,
  GitCompare,
  History,
  Layers,
  PackageCheck,
  Pencil,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  ManageColumns,
  Modal,
  PageLayout,
  Select,
  StatusBadge,
  ViewPageBanner,
  Textarea,
} from '../../components/common';
import { useBom } from '../../context/BomContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { formatDate } from '../../data/bomData';
import {
  REVIEWER_PERSONA,
  assemblyLabel,
  bomItemTotal,
  bomMaterials,
  materialRequirementCost,
  projectName,
  purchasedRows,
  statusTone,
} from '../../data/bomData';
import { Fact, Toast, money, useToast } from './bomUi';

const EDITABLE = ['Draft', 'In Progress', 'Changes Requested'];

export default function BomDetailPage() {
  const { bomId } = useParams();
  const navigate = useNavigate();
  const { boms, materials, transfers, submitBom, recordBomDecision, releaseBom } = useBom();
  const { assemblies, designs } = useMechanical();
  const { definitions } = useManufacturing();
  const { drawings } = useCad();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ decision: 'Approved', comments: '' });
  const [itemView, setItemView] = useState(null);
  const itemColumns = useTableColumnVisibility('/bom-cost/bom/:bomId#items', [
    { key: 'itemNo', label: 'Item No.' },
    { key: 'partNumber', label: 'Part Number' },
    { key: 'name', label: 'Part Name / Description' },
    { key: 'assembly', label: 'Assembly' },
    { key: 'qty', label: 'Qty' },
    { key: 'uom', label: 'UOM' },
    { key: 'material', label: 'Material' },
    { key: 'spec', label: 'Specification' },
    { key: 'rev', label: 'Rev' },
    { key: 'makeBuy', label: 'Make / Buy' },
    { key: 'drawing', label: 'Ref. Drawing' },
    { key: 'estTotal', label: 'Est. Total' },
    { key: 'details', label: 'Details' },
  ], { mandatory: ['details'] });
  const materialColumns = useTableColumnVisibility('/bom-cost/bom/:bomId#materials', [
    { key: 'requirement', label: 'Requirement' },
    { key: 'material', label: 'Material' },
    { key: 'qty', label: 'Qty' },
    { key: 'rate', label: 'Unit Rate' },
    { key: 'cost', label: 'Est. Cost' },
    { key: 'part', label: 'Linked Part' },
  ]);
  const purchasedColumns = useTableColumnVisibility('/bom-cost/bom/:bomId#purchased', [
    { key: 'code', label: 'Component Code' },
    { key: 'component', label: 'Component' },
    { key: 'partNumber', label: 'Part Number' },
    { key: 'qty', label: 'Qty' },
    { key: 'unitCost', label: 'Unit Cost' },
    { key: 'total', label: 'Est. Total' },
    { key: 'readiness', label: 'Purchase Readiness' },
  ]);

  const bom = boms.find((row) => row.id === bomId);
  const mats = useMemo(() => (bom ? bomMaterials(materials, bom.id) : []), [bom, materials]);
  const purchased = useMemo(() => (bom ? purchasedRows([bom]) : []), [bom]);

  if (!bom) return <Navigate to="/bom-cost/bom" replace />;

  const materialCost = materialRequirementCost(mats);
  const purchasedCost = purchased.reduce((total, row) => total + row.totalCost, 0);
  const transferRows = transfers.filter((row) => row.bomId === bom.id);
  const editable = EDITABLE.includes(bom.status);
  const canSubmit = EDITABLE.includes(bom.status);
  const canRelease = bom.status === 'Approved';
  const canReview = bom.status === 'Under Review';
  const canRevise = ['Approved', 'Released', 'Superseded'].includes(bom.status);
  const handoverReadiness =
    bom.status === 'Released'
      ? 'Released for handover'
      : bom.status === 'Approved'
        ? 'Approved — ready to prepare'
        : 'Not available until approval';
  const manufacturingRef = `MFG-${bom.projectId.slice(-3)}-${bom.id.slice(-3)}`;
  const design = designs.find((row) => row.id === bom.designId);
  const manufacturingDefinition = definitions.find((row) => row.id === bom.manufacturingDefinitionId);
  const drawing = drawings.find((row) => row.id === bom.drawingId);

  const handleDecision = () => {
    const result = recordBomDecision(bom.id, { ...decisionForm, by: REVIEWER_PERSONA });
    showToast(result.error || `${bom.id} review decision recorded.`, result.error ? 'error' : 'success');
    if (!result.error) setDecisionOpen(false);
  };

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={Layers}
        eyebrow={bom.id}
        title={bom.name}
        subtitle={`Rev ${bom.revision} · ${projectName(projects, bom.projectId)}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'BOM & Cost Estimation', to: '/bom-cost' },
              { label: 'BOM Management', to: '/bom-cost/bom' },
              { label: bom.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={bom.status} tone={statusTone(bom.status)} />
            <span className="chip">Rev {bom.revision}</span>
          </>
        }
        meta={[
          ['BOM Title', bom.name],
          ['Project', `${bom.projectId} · ${projectName(projects, bom.projectId)}`],
          ['Mechanical Design', design ? `${design.id} · ${design.name}` : 'Not linked'],
          ['Responsible Engineer', bom.engineer],
          ['BOM Date', formatDate(bom.date)],
          ['Items', (bom.items || []).length],
        ]}
        actions={
          <>
            <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/bom-cost/bom')}>Back</Button>
              <ConvertRecordButton type="bom" record={bom} size="sm" />
              {editable && <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/bom-cost/bom/${bom.id}/edit`)}>Edit BOM</Button>}
              {canSubmit && <Button icon={Send} onClick={() => { submitBom(bom.id, bom.engineer); showToast(`${bom.id} submitted for review.`); }}>Submit for Review</Button>}
              {canReview && <Button icon={ClipboardCheck} onClick={() => { setDecisionForm({ decision: 'Approved', comments: '' }); setDecisionOpen(true); }}>Review Decision</Button>}
              {canRelease && <Button icon={PackageCheck} onClick={() => { releaseBom(bom.id, 'Design Admin'); showToast(`${bom.id} released (simulated handover).`); }}>Release BOM</Button>}
              {canRevise && <Button variant="secondary" icon={History} onClick={() => { showToast('Use Create new revision in the revision register so the change reason is recorded.'); navigate('/bom-cost/releases'); }}>New Revision</Button>}
            </>
          </>
        }
      />
      <div className="mfg-detail-grid bom-detail-grid">
        <div className="mfg-detail-main bom-detail-main">
          <section className="dash-card">
            <div className="dash-card-head"><h2><Layers aria-hidden="true" /> BOM Summary</h2><StatusBadge status={bom.status} tone={statusTone(bom.status)} /></div>
            <div className="fact-grid">
              <Fact label="BOM Number">{bom.id}</Fact>
              <Fact label="BOM Title">{bom.name}</Fact>
              <Fact label="BOM Type">{bom.bomType || '—'}</Fact>
              <Fact label="Project">{`${bom.projectId} · ${projectName(projects, bom.projectId)}`}</Fact>
              <Fact label="Mechanical Design">{design ? `${design.id} · ${design.name} · Rev ${design.revision}` : 'No design reference'}</Fact>
              <Fact label="Product / Assembly">{assemblyLabel(assemblies, bom.assemblyId)}</Fact>
              <Fact label="BOM Revision">{`Rev ${bom.revision}`}</Fact>
              <Fact label="Manufacturing Definition">{manufacturingDefinition ? `${manufacturingDefinition.id} · ${manufacturingDefinition.name}` : 'Not linked'}</Fact>
              <Fact label="CAD Drawing">{drawing ? `${drawing.drawingNumber} · Rev ${drawing.revision}` : 'Not linked'}</Fact>
              <Fact label="Responsible Engineer">{bom.engineer}</Fact>
              <Fact label="Assigned Reviewer">{bom.reviewer}</Fact>
              <Fact label="BOM Date">{formatDate(bom.date)}</Fact>
              <Fact label="Target Release">{formatDate(bom.dueDate)}</Fact>
              <Fact label="Release Reference">{bom.releaseRef || 'Not released'}</Fact>
              <Fact label="Manufacturing Handover">{handoverReadiness}</Fact>
              <Fact label="Manufacturing Reference">{manufacturingRef}</Fact>
            </div>
            <p className="dash-modal-note">{bom.description}</p>
            {bom.notes && bom.notes !== bom.description && <p className="dash-modal-note"><strong>Notes:</strong> {bom.notes}</p>}
            {!editable && (
              <p className="dash-modal-note">
                <ShieldCheck aria-hidden="true" /> Rev {bom.revision} is {bom.status.toLowerCase()}. Approved and
                released content is locked; use New Revision so the controlled history is never overwritten.
              </p>
            )}
          </section>

          <section className="dash-card">
            <div className="dash-card-head">
              <h2><ClipboardList aria-hidden="true" /> BOM Items ({bom.items.length})</h2>
              {editable && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => navigate(`/bom-cost/bom/${bom.id}/edit`)}>Edit Items</Button>}
            </div>
            <ManageColumns {...itemColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mfg-mini-table bom-detail-items table-fixed-cols">
                <thead>
                  <tr>
                    {itemColumns.isVisible('itemNo') && <th scope="col">Item No.</th>}
                    {itemColumns.isVisible('partNumber') && <th scope="col">Part Number</th>}
                    {itemColumns.isVisible('name') && <th scope="col">Part Name / Description</th>}
                    {itemColumns.isVisible('assembly') && <th scope="col">Assembly</th>}
                    {itemColumns.isVisible('qty') && <th scope="col">Qty</th>}
                    {itemColumns.isVisible('uom') && <th scope="col">UOM</th>}
                    {itemColumns.isVisible('material') && <th scope="col">Material</th>}
                    {itemColumns.isVisible('spec') && <th scope="col">Specification</th>}
                    {itemColumns.isVisible('rev') && <th scope="col">Rev</th>}
                    {itemColumns.isVisible('makeBuy') && <th scope="col">Make / Buy</th>}
                    {itemColumns.isVisible('drawing') && <th scope="col">Ref. Drawing</th>}
                    {itemColumns.isVisible('estTotal') && <th scope="col">Est. Total</th>}
                    {itemColumns.isVisible('details') && <th scope="col">Details</th>}
                  </tr>
                </thead>
                <tbody>
                  {bom.items.map((row) => (
                    <tr key={row.id}>
                      {itemColumns.isVisible('itemNo') && <td>{row.itemNumber || '—'}</td>}
                      {itemColumns.isVisible('partNumber') && <td className="cell-id">{row.partNumber}</td>}
                      {itemColumns.isVisible('name') && <td>{row.name}</td>}
                      {itemColumns.isVisible('assembly') && <td>{assemblyLabel(assemblies, row.assemblyId || bom.assemblyId)}</td>}
                      {itemColumns.isVisible('qty') && <td>{row.qty}</td>}
                      {itemColumns.isVisible('uom') && <td>{row.uom}</td>}
                      {itemColumns.isVisible('material') && <td>{row.material}</td>}
                      {itemColumns.isVisible('spec') && <td>{row.specification || '—'}</td>}
                      {itemColumns.isVisible('rev') && <td>{row.partRevision}</td>}
                      {itemColumns.isVisible('makeBuy') && <td>{row.makeBuy}</td>}
                      {itemColumns.isVisible('drawing') && <td>{row.referenceDrawing || '—'}</td>}
                      {itemColumns.isVisible('estTotal') && <td>{money(bomItemTotal(row))}</td>}
                      {itemColumns.isVisible('details') && <td><Button variant="ghost" size="sm" icon={Eye} onClick={() => setItemView(row)}>View</Button></td>}
                    </tr>
                  ))}
                  {bom.items.length === 0 && <tr><td colSpan={itemColumns.visibleCount} className="cell-muted">No BOM items recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2><Coins aria-hidden="true" /> Material Requirements ({mats.length})</h2><span className="bom-ready-chip">{money(materialCost)}</span></div>
            <ManageColumns {...materialColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mfg-mini-table">
                <thead>
                  <tr>
                    {materialColumns.isVisible('requirement') && <th scope="col">Requirement</th>}
                    {materialColumns.isVisible('material') && <th scope="col">Material</th>}
                    {materialColumns.isVisible('qty') && <th scope="col">Qty</th>}
                    {materialColumns.isVisible('rate') && <th scope="col">Unit Rate</th>}
                    {materialColumns.isVisible('cost') && <th scope="col">Est. Cost</th>}
                    {materialColumns.isVisible('part') && <th scope="col">Linked Part</th>}
                  </tr>
                </thead>
                <tbody>
                  {mats.map((row) => (
                    <tr key={row.id}>
                      {materialColumns.isVisible('requirement') && <td className="cell-id">{row.id}</td>}
                      {materialColumns.isVisible('material') && <td>{row.materialCode}</td>}
                      {materialColumns.isVisible('qty') && <td>{row.qty} {row.unit}</td>}
                      {materialColumns.isVisible('rate') && <td>{money(row.rate)}</td>}
                      {materialColumns.isVisible('cost') && <td>{money(Number(row.qty) * Number(row.rate))}</td>}
                      {materialColumns.isVisible('part') && <td>{row.partNumber}</td>}
                    </tr>
                  ))}
                  {mats.length === 0 && <tr><td colSpan={materialColumns.visibleCount} className="cell-muted">No material requirements linked.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2><Truck aria-hidden="true" /> Purchased Components ({purchased.length})</h2><span className="bom-ready-chip">{money(purchasedCost)}</span></div>
            <ManageColumns {...purchasedColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mfg-mini-table">
                <thead>
                  <tr>
                    {purchasedColumns.isVisible('code') && <th scope="col">Component Code</th>}
                    {purchasedColumns.isVisible('component') && <th scope="col">Component</th>}
                    {purchasedColumns.isVisible('partNumber') && <th scope="col">Part Number</th>}
                    {purchasedColumns.isVisible('qty') && <th scope="col">Qty</th>}
                    {purchasedColumns.isVisible('unitCost') && <th scope="col">Unit Cost</th>}
                    {purchasedColumns.isVisible('total') && <th scope="col">Est. Total</th>}
                    {purchasedColumns.isVisible('readiness') && <th scope="col">Purchase Readiness</th>}
                  </tr>
                </thead>
                <tbody>
                  {purchased.map((row) => (
                    <tr key={row.key}>
                      {purchasedColumns.isVisible('code') && <td className="cell-id">{row.componentCode}</td>}
                      {purchasedColumns.isVisible('component') && <td>{row.name}</td>}
                      {purchasedColumns.isVisible('partNumber') && <td>{row.partNumber}</td>}
                      {purchasedColumns.isVisible('qty') && <td>{row.qty} {row.unit}</td>}
                      {purchasedColumns.isVisible('unitCost') && <td>{money(row.unitCost)}</td>}
                      {purchasedColumns.isVisible('total') && <td>{money(row.totalCost)}</td>}
                      {purchasedColumns.isVisible('readiness') && <td>{row.purchaseStatus}</td>}
                    </tr>
                  ))}
                  {purchased.length === 0 && <tr><td colSpan={purchasedColumns.visibleCount} className="cell-muted">No purchased items in this BOM.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2><GitCompare aria-hidden="true" /> Revision &amp; Status History</h2></div>
            <div className="bom-detail-columns">
              <div>
                <h3 className="bom-detail-subhead">Revisions</h3>
                <ul className="mech-timeline">
                  {(bom.revisions || []).map((entry) => (
                    <li key={entry.revision}>
                      <span className="mech-timeline-dot" aria-hidden="true" />
                      <div>
                        <strong>Rev {entry.revision}{entry.revision === bom.revision ? ' · current' : ''}{entry.releasedAt ? ' · released' : ''}</strong>
                        <span className="cell-muted">{formatDate(entry.date)} · {entry.by} · {entry.items?.length || 0} items</span>
                        <p>{entry.note}</p>
                        {entry.changeReason && <p className="cell-muted">Reason: {entry.changeReason}</p>}
                      </div>
                      <StatusBadge status={entry.status} tone={statusTone(entry.status)} />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="bom-detail-subhead">Status History</h3>
                <ul className="mech-timeline">
                  {(bom.statusHistory || []).map((entry) => (
                    <li key={entry.id}>
                      <span className="mech-timeline-dot" aria-hidden="true" />
                      <div>
                        <strong>{entry.status}</strong>
                        <span className="cell-muted">{formatDate(entry.at)} · {entry.by}</span>
                        <p>{entry.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="dash-card">
            <div className="dash-card-head"><h2><History aria-hidden="true" /> Change History</h2></div>
            <ul className="mech-timeline">
              {(bom.changeHistory || []).slice().reverse().map((entry) => (
                <li key={entry.id}>
                  <span className="mech-timeline-dot" aria-hidden="true" />
                  <div><strong>{entry.action}</strong><span className="cell-muted">{formatDate(entry.at)} · {entry.by}</span><p>{entry.description}</p></div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="mfg-detail-aside">
          <section className="mech-aside-card">
            <div className="mech-aside-head"><Coins aria-hidden="true" /><strong>Cost Reference</strong></div>
            <div className="mech-aside-body">
              <div className="mech-aside-group"><span className="mech-aside-label">Material Estimate</span><span>{money(materialCost)}</span></div>
              <div className="mech-aside-group"><span className="mech-aside-label">Purchased Estimate</span><span>{money(purchasedCost)}</span></div>
              <div className="mech-aside-group"><span className="mech-aside-label">Combined Reference</span><span>{money(materialCost + purchasedCost)}</span></div>
              <p className="mech-aside-note">Mock estimates only. Labour, process and final estimation are managed in Cost Planning &amp; Estimation.</p>
              <Button variant="secondary" size="sm" icon={Coins} onClick={() => navigate('/bom-cost/cost')}>Open Cost Planning</Button>
            </div>
          </section>

          <section className="mech-aside-card">
            <div className="mech-aside-head"><ShieldCheck aria-hidden="true" /><strong>Approval History</strong></div>
            <div className="mech-aside-body">
              {bom.approvals?.length ? (
                <ul className="bom-approval-list">
                  {bom.approvals.map((entry) => (
                    <li key={entry.id}><strong>{entry.decision}</strong> · {entry.reviewer} · {formatDate(entry.date)}<span>{entry.comments}</span></li>
                  ))}
                </ul>
              ) : <p className="mech-aside-note">No review decisions recorded yet.</p>}
            </div>
          </section>

          <section className="mech-aside-card">
            <div className="mech-aside-head"><Truck aria-hidden="true" /><strong>Handovers</strong></div>
            <div className="mech-aside-body">
              {transferRows.length ? (
                <ul className="bom-approval-list">
                  {transferRows.map((row) => (
                    <li key={row.id}><strong>{row.destination}</strong> · {row.id}<span><StatusBadge status={row.status} tone={statusTone(row.status)} /> · {formatDate(row.date)}</span></li>
                  ))}
                </ul>
              ) : <p className="mech-aside-note">No Purchase or Production handover prepared.</p>}
              <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => navigate('/bom-cost/releases')}>Open Revision &amp; Release</Button>
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={Boolean(itemView)}
        onClose={() => setItemView(null)}
        title="BOM Item Details"
        subtitle={itemView ? `${itemView.partNumber} · ${itemView.name}` : ''}
        maxWidth="max-w-lg"
        footer={<Button variant="ghost" onClick={() => setItemView(null)}>Close</Button>}
      >
        {itemView && (
          <div className="fact-grid">
            <Fact label="BOM">{`${bom.id} · Rev ${bom.revision}`}</Fact>
            <Fact label="Project">{`${bom.projectId} · ${projectName(projects, bom.projectId)}`}</Fact>
            <Fact label="Item Number">{itemView.itemNumber || '—'}</Fact>
            <Fact label="Part Number">{itemView.partNumber}</Fact>
            <Fact label="Part Name">{itemView.name}</Fact>
            <Fact label="Component Description">{itemView.description || '—'}</Fact>
            <Fact label="Quantity">{`${itemView.qty} ${itemView.uom}`}</Fact>
            <Fact label="Material">{itemView.material}</Fact>
            <Fact label="Specification">{itemView.specification || '—'}</Fact>
            <Fact label="Reference Drawing">{itemView.referenceDrawing || '—'}</Fact>
            <Fact label="Remarks">{itemView.remarks || '—'}</Fact>
            <Fact label="Part Revision">{itemView.partRevision}</Fact>
            <Fact label="Make / Buy">{itemView.makeBuy}</Fact>
            <Fact label="Estimated Unit Cost">{money(itemView.unitCost)}</Fact>
            <Fact label="Estimated Item Total">{money(bomItemTotal(itemView))}</Fact>
            <Fact label="Assembly">{assemblyLabel(assemblies, itemView.assemblyId || bom.assemblyId)}</Fact>
          </div>
        )}
      </Modal>

      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="BOM Review Decision"
        subtitle={`${bom.id} · Rev ${bom.revision}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleDecision}>{decisionForm.decision}</Button>
          </>
        }
      >
        <div className="form-grid">
          <Select id="detail-decision" label="Decision" options={[{ value: 'Approved', label: 'Approve' }, { value: 'Request Changes', label: 'Request Changes' }, { value: 'Reject', label: 'Reject / Withdraw' }]} value={decisionForm.decision} onChange={(event) => setDecisionForm((previous) => ({ ...previous, decision: event.target.value }))} />
          <div className="form-field"><span className="form-label">Reviewer</span><span className="form-static">{REVIEWER_PERSONA}</span></div>
          <div className="form-grid-full">
            <Textarea id="detail-comments" label="Review Comments" rows={3} value={decisionForm.comments} hint={decisionForm.decision !== 'Approved' ? 'Comments are required for changes or rejection.' : ''} onChange={(event) => setDecisionForm((previous) => ({ ...previous, comments: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <WorkflowLinks type="bom" recordId={bom.id} />
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
