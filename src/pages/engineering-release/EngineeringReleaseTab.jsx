import { useMemo, useState } from 'react';
import {
  Factory,
  FileCheck2,
  PackageCheck,
  Send,
  ShoppingCart,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  Select,
  StatCard,
  StatusBadge,
} from '../../components/common';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  HANDOVER_STATUSES,
  engineeringTone,
  formatDate,
} from '../../data/engineeringReleaseData';
import RevisionHistoryPanel from './RevisionHistoryPanel';
import { Fact, Toast, useToast } from './engineeringReleaseUi';

function projectLabel(projects, projectId) {
  const project = projects.find((row) => row.id === projectId);
  return project ? `${projectId} · ${project.name}` : projectId;
}

export default function EngineeringReleaseTab() {
  const { changes, releases, releaseEligibility, releaseChange, updateHandover } = useEngineeringRelease();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseForm, setReleaseForm] = useState({ destinations: ['Purchase', 'Production'], manufacturingPackage: '', releasedBy: 'Design Authority', notes: '' });
  const [handoverTarget, setHandoverTarget] = useState(null);
  const [handoverForm, setHandoverForm] = useState({ status: 'Prepared', reference: '', owner: '', notes: '' });
  const [error, setError] = useState('');

  const readinessRows = useMemo(
    () => changes.map((change) => ({ id: change.id, change, readiness: releaseEligibility(change) })),
    [changes, releaseEligibility],
  );
  const eligible = readinessRows.filter((row) => row.readiness.eligible);
  const blocked = readinessRows.filter(
    (row) =>
      !row.readiness.eligible &&
      !row.readiness.existingRelease &&
      row.change.approvalStatus === 'Approved' &&
      row.change.revisionUpdated,
  );

  const openRelease = (change) => {
    const readiness = releaseEligibility(change);
    setReleaseTarget({ change, readiness });
    setReleaseForm({
      destinations: ['Purchase', 'Production'],
      manufacturingPackage: `MFG-${change.projectId.split('-').pop()} Rev ${change.proposedRevision} · Engineering package`,
      releasedBy: 'Design Authority',
      notes: '',
    });
    setError('');
  };

  const createRelease = () => {
    if (!releaseTarget) return;
    const result = releaseChange(releaseTarget.change.id, releaseForm);
    if (result.error) {
      setError(result.error);
      return;
    }
    showToast(`${result.release.id} created for ${releaseTarget.change.id}.`);
    setReleaseTarget(null);
  };

  const openHandover = (release, side) => {
    const current = release[`${side}Handover`];
    if (!current) return;
    setHandoverTarget({ release, side });
    setHandoverForm({
      status: current.status === 'Not Required' ? 'Prepared' : current.status,
      reference: current.reference || '',
      owner: current.owner || '',
      notes: current.notes || '',
    });
    setError('');
  };

  const saveHandover = () => {
    if (!handoverTarget) return;
    const result = updateHandover(handoverTarget.release.id, handoverTarget.side, handoverForm);
    if (result.error) {
      setError(result.error);
      return;
    }
    showToast(`${handoverTarget.side === 'purchase' ? 'Purchase' : 'Production'} handover updated.`);
    setHandoverTarget(null);
  };

  const purchaseCount = releases.filter((row) => row.purchaseHandover?.status === 'Acknowledged').length;
  const productionCount = releases.filter((row) => row.productionHandover?.status === 'Acknowledged').length;

  return (
    <>
      <RevisionHistoryPanel />

      <KpiGrid className="approvals-kpi-grid">
        <StatCard icon={PackageCheck} label="Release Ready" value={String(eligible.length)} sub="Approved, revision-updated changes" tone="teal" />
        <StatCard icon={FileCheck2} label="Released Packages" value={String(releases.length)} sub="Controlled snapshots preserved" tone="emerald" />
        <StatCard icon={ShoppingCart} label="Purchase Acknowledged" value={String(purchaseCount)} sub="Mock purchase handovers" tone="blue" />
        <StatCard icon={Factory} label="Production Acknowledged" value={String(productionCount)} sub="Mock production handovers" tone="purple" />
      </KpiGrid>

      <section className="table-card">
        <div className="approvals-card-head">
          <div><strong>Ready for Engineering Release</strong><p>Only ECO-approved changes with completed revision updates and approved source baselines are eligible.</p></div>
          <span className="approvals-count-chip">{eligible.length} eligible</span>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'Change ID', width: 108, render: (row) => <span className="cell-id">{row.change.id}</span> },
            { key: 'projectId', label: 'Project', width: 104, render: (row) => row.change.projectId },
            { key: 'title', label: 'Change', width: 210, render: (row) => <span className="cell-project"><span className="cell-strong approvals-clip">{row.change.title}</span><span className="cell-muted approvals-clip">{row.change.affectedParts}</span></span> },
            { key: 'revisions', label: 'Current → Proposed', width: 142, render: (row) => <span className="approvals-exact-rev">{row.change.currentRevision} → {row.change.proposedRevision}</span> },
            { key: 'bom', label: 'BOM Revision', width: 150, render: (row) => `${row.readiness.bom?.id} · Rev ${row.change.proposedBomRevision}` },
            { key: 'drawing', label: 'Drawing Revision', width: 160, render: (row) => `${row.readiness.drawing?.drawingNumber} · Rev ${row.change.proposedDrawingRevision}` },
            { key: 'type', label: 'Release Type', width: 108, render: (row) => row.change.firstRelease ? 'First Release' : 'Revision Change' },
            { key: 'approval', label: 'Approval', width: 100, render: (row) => <StatusBadge status={row.change.approvalStatus} tone={engineeringTone(row.change.approvalStatus)} /> },
          ]}
          rows={eligible}
          rowActions={(row) => [{ key: 'release', label: 'Release approved revision', icon: ShieldCheck }]}
          onRowAction={(key, row) => { if (key === 'release') openRelease(row.change); }}
          ariaLabel="Changes eligible for engineering release"
          emptyContent={<EmptyState icon={ShieldCheck} title="No release-ready changes" message="A change becomes eligible after ECO approval, revision update and approved source baselines." />}
        />
      </section>

      {blocked.length > 0 && (
        <section className="table-card">
          <div className="approvals-card-head">
            <div><strong>Release Eligibility Checks</strong><p>Approved and revision-updated changes still blocked from transfer.</p></div>
            <span className="approvals-count-chip">{blocked.length} blocked</span>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'Change ID', width: 108, render: (row) => <span className="cell-id">{row.change.id}</span> },
              { key: 'projectId', label: 'Project', width: 104, render: (row) => row.change.projectId },
              { key: 'title', label: 'Change', width: 220, render: (row) => row.change.title },
              { key: 'revisions', label: 'Current → Proposed', width: 142, render: (row) => <span className="approvals-exact-rev">{row.change.currentRevision} → {row.change.proposedRevision}</span> },
              { key: 'reasons', label: 'Release Blockers', render: (row) => <span className="cell-muted">{row.readiness.reasons.join(' ')}</span> },
            ]}
            rows={blocked}
            ariaLabel="Changes blocked from engineering release"
          />
        </section>
      )}

      <section className="table-card">
        <div className="approvals-card-head">
          <div><strong>Engineering Release Register</strong><p>Released BOM, drawing and manufacturing package snapshots with Purchase and Production handover status.</p></div>
          <span className="approvals-count-chip">{releases.length} releases</span>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'Release ID', width: 124, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'changeId', label: 'Change ID', width: 104 },
            { key: 'projectId', label: 'Project', width: 104 },
            { key: 'releaseType', label: 'Release Type', width: 108 },
            { key: 'revisions', label: 'Current → Released', width: 136, render: (row) => <span className="approvals-exact-rev">{row.currentRevision} → {row.proposedRevision}</span> },
            { key: 'bom', label: 'BOM Snapshot', width: 170, render: (row) => <span className="cell-project"><span>{row.bom.id} · Rev {row.bom.approvedRevision}</span><span className="cell-muted">Source {row.bom.sourceStatus} · Released Rev {row.bom.releasedRevision}</span></span> },
            { key: 'drawing', label: 'Drawing Snapshot', width: 178, render: (row) => <span className="cell-project"><span>{row.drawing.number} · Rev {row.drawing.approvedRevision}</span><span className="cell-muted">Source {row.drawing.sourceStatus} · Released Rev {row.drawing.releasedRevision}</span></span> },
            { key: 'purchase', label: 'Purchase Handover', width: 146, render: (row) => <StatusBadge status={row.purchaseHandover?.status || 'Not Required'} tone={engineeringTone(row.purchaseHandover?.status)} /> },
            { key: 'production', label: 'Production Handover', width: 150, render: (row) => <StatusBadge status={row.productionHandover?.status || 'Not Required'} tone={engineeringTone(row.productionHandover?.status)} /> },
            { key: 'releasedAt', label: 'Released', width: 100, render: (row) => formatDate(row.releasedAt) },
          ]}
          rows={releases}
          rowActions={(row) => [
            ...(row.purchaseHandover?.required ? [{ key: 'purchase', label: 'Update Purchase handover', icon: ShoppingCart }] : []),
            ...(row.productionHandover?.required ? [{ key: 'production', label: 'Update Production handover', icon: Factory }] : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'purchase') openHandover(row, 'purchase');
            if (key === 'production') openHandover(row, 'production');
          }}
          ariaLabel="Engineering release register"
          emptyContent={<EmptyState icon={FileCheck2} title="No releases" message="Approved and revision-updated changes will appear here after release." />}
        />
      </section>
      <p className="mech-footnote">
        Each release is an immutable local snapshot of the approved proposed revisions. The current released BOM and
        drawing remain preserved, and Purchase / Production acknowledgement is tracked independently.
      </p>

      <Modal
        open={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        title="Create Engineering Release"
        subtitle={releaseTarget ? `${releaseTarget.change.id} · ${releaseTarget.change.title}` : ''}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReleaseTarget(null)}>Cancel</Button>
            <Button icon={ShieldCheck} onClick={createRelease}>Release Approved Revision</Button>
          </>
        }
      >
        {releaseTarget && (
          <div className="form-grid">
            <div className="fact-grid span-2">
              <Fact label="Project">{projectLabel(projects, releaseTarget.change.projectId)}</Fact>
              <Fact label="Release Type">{releaseTarget.change.firstRelease ? 'First Release' : 'Revision Change'}</Fact>
              <Fact label="Current Revision">{releaseTarget.change.currentRevision}</Fact>
              <Fact label="Proposed Revision">{releaseTarget.change.proposedRevision}</Fact>
              <Fact label="BOM Snapshot">{releaseTarget.readiness.bom.id} · Rev {releaseTarget.change.proposedBomRevision}</Fact>
              <Fact label="Drawing Snapshot">{releaseTarget.readiness.drawing.drawingNumber} · Rev {releaseTarget.change.proposedDrawingRevision}</Fact>
              <Fact label="BOM Source">{releaseTarget.readiness.bom.status} · preserved at Rev {releaseTarget.readiness.bom.revision}</Fact>
              <Fact label="Drawing Source">{releaseTarget.readiness.drawing.approvalStatus} · preserved at Rev {releaseTarget.readiness.drawing.revision}</Fact>
            </div>
            <div className="form-field span-2">
              <span className="form-label">Handover Destinations</span>
              <div className="approvals-stage-options">
                <label className="approvals-stage-option">
                  <input type="checkbox" checked={releaseForm.destinations.includes('Purchase')} onChange={(event) => setReleaseForm((previous) => ({ ...previous, destinations: event.target.checked ? [...previous.destinations, 'Purchase'] : previous.destinations.filter((value) => value !== 'Purchase') }))} />
                  <span><strong>Purchase</strong><small>Prepare a mock procurement handover.</small></span>
                </label>
                <label className="approvals-stage-option">
                  <input type="checkbox" checked={releaseForm.destinations.includes('Production')} onChange={(event) => setReleaseForm((previous) => ({ ...previous, destinations: event.target.checked ? [...previous.destinations, 'Production'] : previous.destinations.filter((value) => value !== 'Production') }))} />
                  <span><strong>Production</strong><small>Prepare a mock manufacturing handover.</small></span>
                </label>
              </div>
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor="release-package">Manufacturing Package Reference</label>
              <input id="release-package" className="form-input" value={releaseForm.manufacturingPackage} onChange={(event) => setReleaseForm((previous) => ({ ...previous, manufacturingPackage: event.target.value }))} placeholder="e.g. MFG-2026-002 Rev C · Fabrication and inspection package" />
            </div>
            <Select label="Released By" id="release-by" options={['Design Authority', 'N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'].map((value) => ({ value, label: value }))} value={releaseForm.releasedBy} onChange={(event) => setReleaseForm((previous) => ({ ...previous, releasedBy: event.target.value }))} />
            <div className="form-field span-2">
              <label className="form-label" htmlFor="release-notes">Release Notes</label>
              <textarea id="release-notes" className="form-textarea" rows={3} value={releaseForm.notes} onChange={(event) => setReleaseForm((previous) => ({ ...previous, notes: event.target.value }))} placeholder="Record the approved revision and handover intent." />
            </div>
            {error && <p className="form-error span-2" role="alert">{error}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(handoverTarget)}
        onClose={() => setHandoverTarget(null)}
        title={`Update ${handoverTarget?.side === 'purchase' ? 'Purchase' : 'Production'} Handover`}
        subtitle={handoverTarget ? `${handoverTarget.release.id} · ${handoverTarget.release.changeId}` : ''}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHandoverTarget(null)}>Cancel</Button>
            <Button icon={Send} onClick={saveHandover}>Save Handover Status</Button>
          </>
        }
      >
        {handoverTarget && (
          <div className="form-grid">
            <Select
              label="Handover Status"
              id="handover-status"
              options={HANDOVER_STATUSES.filter((status) => status !== 'Not Required').map((status) => ({ value: status, label: status }))}
              value={handoverForm.status}
              onChange={(event) => { setHandoverForm((previous) => ({ ...previous, status: event.target.value })); setError(''); }}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="handover-reference">Handover Reference</label>
              <input id="handover-reference" className="form-input" value={handoverForm.reference} onChange={(event) => setHandoverForm((previous) => ({ ...previous, reference: event.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="handover-owner">Owner</label>
              <input id="handover-owner" className="form-input" value={handoverForm.owner} onChange={(event) => setHandoverForm((previous) => ({ ...previous, owner: event.target.value }))} />
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor="handover-notes">Notes</label>
              <textarea id="handover-notes" className="form-textarea" rows={3} value={handoverForm.notes} onChange={(event) => setHandoverForm((previous) => ({ ...previous, notes: event.target.value }))} />
            </div>
            <div className="approvals-note span-2">
              Purchase and Production are tracked independently. This status is local simulation data and does not create an ERP transaction.
            </div>
            {error && <p className="form-error span-2" role="alert">{error}</p>}
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
