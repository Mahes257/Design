import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GitPullRequest,
  Pencil,
  Plus,
  Rocket,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button, DataTable, EmptyState, Modal, SearchInput, Select, StatusBadge, Toolbar } from '../../components/common';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  CHANGE_REVIEWERS,
  ECO_STATUSES,
  TODAY,
  engineeringTone,
  formatDate,
  nextRevision,
} from '../../data/engineeringReleaseData';
import { ChangeWorkflow, Fact, SectionNav, Toast, useToast } from './engineeringReleaseUi';

const SECTIONS = [
  { key: 'details', label: 'ECO Details' },
  { key: 'review', label: 'Review & Approval' },
  { key: 'implementation', label: 'Implementation & Revision' },
  { key: 'history', label: 'History' },
];

const blankEco = () => ({
  technicalImpact: '',
  manufacturingImpact: '',
  bomImpact: '',
  drawingImpact: '',
  costImpact: '',
  riskValidation: '',
  implementationNotes: '',
  assignedEngineer: 'N. Joshi',
  effectiveDate: '',
  supportingDocuments: [],
  proposedRevision: '',
  proposedBomRevision: '',
  proposedDrawingRevision: '',
});

export default function EcrEcoTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    ecos,
    changes,
    nextEcoId,
    createEco,
    saveEco,
    submitEco,
    decideEco,
    startImplementation,
    applyRevisionUpdate,
    closeChange,
  } = useEngineeringRelease();
  const { designs } = useMechanical();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('details');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [createOpen, setCreateOpen] = useState(searchParams.get('newEco') === '1');
  const [editing, setEditing] = useState(false);
  const [selectedEcrId, setSelectedEcrId] = useState('');
  const [ecoForm, setEcoForm] = useState(blankEco);
  const [decision, setDecision] = useState({ reviewer: CHANGE_REVIEWERS[0], comments: '' });
  const [formError, setFormError] = useState('');

  const selectedId = searchParams.get('eco') || searchParams.get('change');
  const selected = ecos.find((row) => row.id === selectedId)
    || ecos.find((row) => row.sourceEcrId === selectedId)
    || ecos[0]
    || null;
  const selectedEcr = selected ? changes.find((row) => row.id === selected.sourceEcrId) : null;
  const formEcr = changes.find((row) => row.id === selectedEcrId) || null;
  const eligibleEcrs = changes.filter(
    (row) => row.status === 'ECR Approved' && !ecos.some((eco) => eco.sourceEcrId === row.id),
  );

  useEffect(() => {
    if (searchParams.get('newEco') === '1') {
      openCreate();
      const next = new URLSearchParams(searchParams);
      next.delete('newEco');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!selected) return;
    setDecision({ reviewer: selected.reviewedBy || CHANGE_REVIEWERS[0], comments: '' });
    setFormError('');
  }, [selected?.id]);

  const projectLabel = (projectId) => {
    const project = projects.find((row) => row.id === projectId);
    return project ? `${projectId} · ${project.name}` : projectId;
  };
  const designLabel = (eco) => {
    const design = designs.find((row) => row.id === eco?.designId) || designs.find((row) => row.projectId === eco?.projectId);
    return design ? `${design.id} · ${design.name}` : eco?.designId || 'Not linked';
  };

  const openCreate = () => {
    const ecr = eligibleEcrs[0] || null;
    setEditing(false);
    setSelectedEcrId(ecr?.id || '');
    setEcoForm(seedForm(ecr));
    setFormError('');
    setCreateOpen(true);
  };

  function seedForm(ecr) {
    if (!ecr) return blankEco();
    return {
      ...blankEco(),
      technicalImpact: ecr.initialAssessment || ecr.impact || '',
      manufacturingImpact: ecr.assessmentNotes || '',
      bomImpact: `${ecr.bomId || 'BOM'} · Rev ${ecr.currentBomRevision || '—'} → ${ecr.proposedBomRevision || '—'}`,
      drawingImpact: `${ecr.drawingId || 'Drawing'} · Rev ${ecr.currentDrawingRevision || '—'} → ${ecr.proposedDrawingRevision || '—'}`,
      riskValidation: ecr.initialAssessment || '',
      assignedEngineer: ecr.requestedBy || ecr.raisedBy || 'N. Joshi',
      proposedRevision: ecr.proposedRevision || '',
      proposedBomRevision: ecr.proposedBomRevision || '',
      proposedDrawingRevision: ecr.proposedDrawingRevision || '',
      supportingDocuments: ecr.supportingDocuments || [],
    };
  }

  const chooseEcr = (ecrId) => {
    setSelectedEcrId(ecrId);
    setEcoForm(seedForm(changes.find((row) => row.id === ecrId)));
    setFormError('');
  };

  const openEdit = () => {
    if (!selected) return;
    setEditing(true);
    setSelectedEcrId(selected.sourceEcrId);
    setEcoForm({
      ...blankEco(),
      ...selected,
      supportingDocuments: selected.supportingDocuments || [],
    });
    setFormError('');
    setCreateOpen(true);
  };

  const saveEcoForm = () => {
    const ecr = changes.find((row) => row.id === selectedEcrId);
    if (!editing && !ecr) {
      setFormError('Select an approved ECR.');
      return;
    }
    if (!ecoForm.assignedEngineer?.trim()) {
      setFormError('Assign an engineer to the ECO.');
      return;
    }
    if (!ecoForm.proposedRevision?.trim()) {
      setFormError('Record the proposed design revision.');
      return;
    }
    if (editing && selected) {
      const result = saveEco(selected.id, { ...ecoForm, affectedParts: selected.affectedParts });
      if (result.error) {
        setFormError(result.error);
        return;
      }
      showToast(`${selected.id} updated.`);
      setCreateOpen(false);
      return;
    }
    if (!ecr) return;
    const result = createEco(ecr.id, { ...ecoForm, createdBy: ecoForm.assignedEngineer });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    showToast(`${result.id} created from ${ecr.id}.`);
    setCreateOpen(false);
    setSearchParams({ eco: result.id }, { replace: true });
  };

  const addDocuments = (event) => {
    const names = [...event.target.files].map((file) => file.name);
    setEcoForm((previous) => ({ ...previous, supportingDocuments: [...new Set([...(previous.supportingDocuments || []), ...names])] }));
  };

  const submitReview = () => {
    if (!selected) return;
    const result = submitEco(selected.id, { by: selected.assignedEngineer });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${selected.id} submitted for engineering review.`);
    setSection('review');
  };

  const recordDecision = (approve) => {
    if (!selected) return;
    const result = decideEco(selected.id, {
      decision: approve ? 'Approve' : 'Reject',
      reviewer: decision.reviewer,
      comments: decision.comments,
      effectiveDate: selected.effectiveDate,
    });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(approve ? `${selected.id} approved.` : `${selected.id} rejected; the source ECR remains preserved.`);
    setSection(approve ? 'implementation' : 'history');
  };

  const beginImplementation = () => {
    if (!selected) return;
    const result = startImplementation(selected.id, { by: selected.assignedEngineer });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${selected.id} implementation started.`);
  };

  const createRevisions = () => {
    if (!selected) return;
    const result = applyRevisionUpdate(selected.sourceEcrId, { by: selected.assignedEngineer });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${result.updates.length} controlled revision(s) created through their owning modules.`);
  };

  const close = () => {
    if (!selected) return;
    const result = closeChange(selected.sourceEcrId, { by: selected.assignedEngineer });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${selected.sourceEcrId} closed after revision implementation.`);
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ecos.filter((row) => {
      if (statusFilter !== 'All' && row.status !== statusFilter) return false;
      if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
      if (!query) return true;
      return [
        row.id,
        row.sourceEcrId,
        row.projectId,
        row.affectedParts,
        row.assignedEngineer,
        row.changeDescription,
        row.approvalStatus,
        row.status,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [ecos, search, statusFilter, projectFilter]);

  const projectBoms = boms.filter((row) => row.projectId === selected?.projectId);
  const proposedBom = projectBoms.find((row) => row.id === (selected?.impactedBomId || selectedEcr?.bomId)) || null;
  const proposedDrawing = drawings.find((row) => row.id === (selected?.impactedDrawingIds?.[0] || selectedEcr?.drawingId)) || null;
  const bomUpdate = selected?.revisionUpdates?.find((row) => row.type === 'BOM');
  const drawingUpdate = selected?.revisionUpdates?.find((row) => row.type === 'Drawing');
  const designUpdate = selected?.revisionUpdates?.find((row) => row.type === 'Design');

  return (
    <>
      <Toolbar
        left={
          <>
            <Select
              id="eco-status-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All ECO Statuses' }, ...ECO_STATUSES.map((value) => ({ value, label: value }))]}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter ECOs by status"
            />
            <Select
              id="eco-project-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All Projects' }, ...projects.map((row) => ({ value: row.id, label: row.id }))]}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              aria-label="Filter ECOs by project"
            />
            <span className="toolbar-count">{rows.length} ECOs</span>
          </>
        }
        right={
          <>
            <SearchInput id="eco-search" value={search} onChange={setSearch} placeholder="Search ECO, ECR, engineer…" ariaLabel="Search engineering change orders" />
            <Button icon={Plus} size="sm" onClick={openCreate}>Create ECO</Button>
          </>
        }
      />

      <section className="table-card">
        <div className="approvals-card-head">
          <div><strong>Engineering Change Order Register</strong><p>Every ECO is linked to an approved ECR. Review, implementation and revisions remain explicit controlled actions.</p></div>
          <span className="approvals-count-chip"><ClipboardCheck aria-hidden="true" /> {ecos.length} ECOs</span>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'ECO Number', width: 108, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'sourceEcrId', label: 'Source ECR', width: 108, render: (row) => <span className="cell-id">{row.sourceEcrId}</span> },
            { key: 'projectId', label: 'Project', width: 104 },
            { key: 'designId', label: 'Design', width: 190, render: (row) => <span className="cell-project"><span className="cell-strong approvals-clip">{designLabel(row)}</span><span className="cell-muted">Rev {row.currentRevision} → {row.proposedRevision}</span></span> },
            { key: 'affectedParts', label: 'Affected Parts / Assemblies', width: 200, render: (row) => <span className="approvals-clip">{row.affectedParts}</span> },
            { key: 'assignedEngineer', label: 'Assigned Engineer', width: 124 },
            { key: 'approvalStatus', label: 'Review / Approval', width: 132, render: (row) => <StatusBadge status={row.approvalStatus} tone={engineeringTone(row.approvalStatus)} /> },
            { key: 'effectiveDate', label: 'Effective Date', width: 104, render: (row) => row.effectiveDate ? formatDate(row.effectiveDate) : '—' },
            { key: 'status', label: 'Workflow Status', width: 152, sortable: true, render: (row) => <StatusBadge status={row.status} tone={engineeringTone(row.status)} /> },
          ]}
          rows={rows}
          className="mech-register-table"
          recordHref={(row) => `/engineering-release/ecr-eco?eco=${encodeURIComponent(row.id)}`}
          onRowClick={(row) => setSearchParams({ eco: row.id }, { replace: true })}
          rowActions={(row) => [
            { key: 'open', label: 'Open ECO', icon: FileCheck2 },
            ...(row.status === 'ECO Review' ? [{ key: 'review', label: 'Open review decision', icon: ShieldCheck }] : []),
          ]}
          onRowAction={(key, row) => {
            setSearchParams({ eco: row.id }, { replace: true });
            if (key === 'review') setSection('review');
          }}
          ariaLabel="Engineering change order register"
          emptyContent={<EmptyState icon={ClipboardCheck} title="No ECOs" message="Create an ECO from an approved ECR." />}
        />
      </section>

      {selected ? (
        <>
          <div className="approvals-detail-bar">
            <div className="form-field">
              <label className="form-label" htmlFor="eco-select">Change Order</label>
              <select id="eco-select" className="form-select" value={selected.id} onChange={(event) => setSearchParams({ eco: event.target.value }, { replace: true })}>
                {ecos.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.sourceEcrId} · {row.status}</option>)}
              </select>
            </div>
            <div className="approvals-detail-actions">
              <StatusBadge status={selected.approvalStatus} tone={engineeringTone(selected.approvalStatus)} />
              <StatusBadge status={selected.status} tone={engineeringTone(selected.status)} />
              {selected.status === 'ECO Created' && <Button variant="secondary" icon={Pencil} onClick={openEdit}>Edit ECO</Button>}
              {selected.status === 'ECO Created' && <Button icon={ClipboardCheck} onClick={submitReview}>Submit for Review</Button>}
              {['Revision Updated', 'Released'].includes(selected.status) && <Button variant="secondary" icon={FileCheck2} onClick={() => navigate('/engineering-release/release')}>Release History</Button>}
            </div>
          </div>

          <ChangeWorkflow change={selected} />

          <section className="card approvals-panel">
            <div className="approvals-card-head">
              <div>
                <span className="cell-id">{selected.id} ← {selected.sourceEcrId}</span>
                <strong>{selected.changeDescription || selectedEcr?.title}</strong>
                <p>{projectLabel(selected.projectId)} · assigned to {selected.assignedEngineer || 'unassigned'}</p>
              </div>
              <StatusBadge status={selected.status} tone={engineeringTone(selected.status)} />
            </div>
            <div className="fact-grid approvals-pad">
              <Fact label="Source ECR">{selected.sourceEcrId}</Fact>
              <Fact label="Project">{projectLabel(selected.projectId)}</Fact>
              <Fact label="Design">{designLabel(selected)}</Fact>
              <Fact label="Affected Parts / Assemblies">{selected.affectedParts || 'Not recorded'}</Fact>
              <Fact label="Current Revision">{selected.currentRevision || '—'}</Fact>
              <Fact label="Proposed Revision">{selected.proposedRevision || '—'}</Fact>
              <Fact label="Review / Approval">{selected.approvalStatus}</Fact>
              <Fact label="Effective Date">{selected.effectiveDate ? formatDate(selected.effectiveDate) : 'Not recorded'}</Fact>
            </div>
          </section>

          <SectionNav
            sections={SECTIONS}
            active={section}
            onChange={setSection}
            counts={{
              review: selected.status === 'ECO Review' ? 1 : 0,
              implementation: selected.revisionUpdates?.length || 0,
              history: selected.history?.length || 0,
            }}
          />

          {section === 'details' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head"><div><strong>Change Impact</strong><p>Technical, manufacturing and documentation impact recorded for this ECO.</p></div></div>
              <div className="approvals-text-block approvals-pad">
                <h4>Change Description</h4><p>{selected.changeDescription || 'Not recorded.'}</p>
                <h4>Technical Impact</h4><p>{selected.technicalImpact || 'Not recorded.'}</p>
                <h4>Manufacturing Impact</h4><p>{selected.manufacturingImpact || 'Not recorded.'}</p>
                <h4>BOM Impact</h4><p>{selected.bomImpact || 'Not recorded.'}</p>
                <h4>Drawing Impact</h4><p>{selected.drawingImpact || 'Not recorded.'}</p>
                <h4>Cost Impact</h4><p>{selected.costImpact || 'Not available.'}</p>
                <h4>Risk / Validation Requirements</h4><p>{selected.riskValidation || 'Not recorded.'}</p>
                <h4>Implementation Notes</h4><p>{selected.implementationNotes || 'Not recorded.'}</p>
                <h4>Supporting Documents</h4><p>{(selected.supportingDocuments || []).join(', ') || 'None recorded.'}</p>
              </div>
              <div className="fact-grid approvals-pad">
                <Fact label="Impacted BOM">{selected.impactedBomId || selectedEcr?.bomId || '—'} · Rev {selected.proposedBomRevision || '—'}</Fact>
                <Fact label="Impacted Drawings">{(selected.impactedDrawingIds || []).join(', ') || selectedEcr?.drawingId || '—'}</Fact>
                <Fact label="Proposed BOM Revision">{selected.proposedBomRevision || '—'}</Fact>
                <Fact label="Proposed Drawing Revision">{selected.proposedDrawingRevision || '—'}</Fact>
                <Fact label="Impacted Manufacturing Documents">{(selected.manufacturingDocumentRefs || []).map((row) => `${row.id} (${row.kind})`).join(', ') || '—'}</Fact>
                <Fact label="Decision">{selected.decisionComments || 'No review decision recorded.'}</Fact>
              </div>
            </section>
          )}

          {section === 'review' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>ECO Review & Approval</strong><p>Approval is never automatic. A rejection reason is mandatory and preserves the source ECR.</p></div>
                <StatusBadge status={selected.approvalStatus} tone={engineeringTone(selected.approvalStatus)} />
              </div>
              <div className="approvals-pad">
                {selected.status === 'ECO Review' ? (
                  <div className="form-grid">
                    <Select label="Reviewer" id="eco-reviewer" options={CHANGE_REVIEWERS.map((value) => ({ value, label: value }))} value={decision.reviewer} onChange={(event) => setDecision((previous) => ({ ...previous, reviewer: event.target.value }))} />
                    <div className="form-field">
                      <label className="form-label" htmlFor="eco-decision-date">Decision Date</label>
                      <input id="eco-decision-date" className="form-input" value={formatDate(TODAY)} readOnly />
                    </div>
                    <div className="form-field span-2">
                      <label className="form-label" htmlFor="eco-comments">Approval Comments / Rejection Reason</label>
                      <textarea id="eco-comments" className="form-textarea" rows={4} value={decision.comments} onChange={(event) => setDecision((previous) => ({ ...previous, comments: event.target.value }))} placeholder="Record the ECO decision basis. A rejection reason is required." />
                    </div>
                    <div className="approvals-detail-actions span-2">
                      <Button icon={CheckCircle2} onClick={() => recordDecision(true)}>Approve ECO</Button>
                      <Button variant="secondary" icon={XCircle} onClick={() => recordDecision(false)}>Reject ECO</Button>
                    </div>
                  </div>
                ) : (
                  <div className="fact-grid">
                    <Fact label="Approval Status">{selected.approvalStatus}</Fact>
                    <Fact label="Reviewer">{selected.reviewedBy || 'Not assigned'}</Fact>
                    <Fact label="Reviewed At">{selected.reviewedAt ? formatDate(selected.reviewedAt) : '—'}</Fact>
                    <Fact label="Decision">{selected.decisionComments || 'No decision recorded.'}</Fact>
                  </div>
                )}
              </div>
            </section>
          )}

          {section === 'implementation' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>Controlled Implementation</strong><p>Create the next source revisions through their owning modules. Previous revisions are preserved.</p></div>
                <StatusBadge status={selected.status} tone={engineeringTone(selected.status)} />
              </div>
              <div className="approvals-pad">
                <div className="fact-grid">
                  <Fact label="Design Revision">{designUpdate ? `${designUpdate.previous} → ${designUpdate.revision}` : `${selected.currentRevision || '—'} → ${selected.proposedRevision || '—'}`}</Fact>
                  <Fact label="BOM Revision">{bomUpdate ? `${bomUpdate.id} · ${bomUpdate.previous} → ${bomUpdate.revision}` : proposedBom ? `${proposedBom.id} · Rev ${proposedBom.revision} → ${selected.proposedBomRevision || '—'}` : selected.impactedBomId || '—'}</Fact>
                  <Fact label="Drawing Revision">{drawingUpdate ? `${drawingUpdate.id} · ${drawingUpdate.previous} → ${drawingUpdate.revision}` : proposedDrawing ? `${proposedDrawing.drawingNumber} · Rev ${proposedDrawing.revision} → ${selected.proposedDrawingRevision || '—'}` : '—'}</Fact>
                  <Fact label="Manufacturing Documents">{(selected.manufacturingDocumentRefs || []).length}</Fact>
                </div>
                <div className="approvals-note">
                  New BOM, drawing and manufacturing revisions are created as controlled drafts through Modules 08–10. Release stays blocked until those new revisions are approved in the owning module.
                </div>
                <div className="approvals-detail-actions">
                  {selected.status === 'ECO Approved' && <Button icon={Rocket} onClick={beginImplementation}>Start Implementation</Button>}
                  {selected.status === 'Change Implementation' && <Button icon={Save} onClick={createRevisions}>Create Controlled Revisions</Button>}
                  {['Revision Updated', 'Released'].includes(selected.status) && <Button icon={ShieldCheck} onClick={close}>Close Change</Button>}
                </div>
                {selected.revisionUpdates?.length > 0 && (
                  <DataTable
                    columns={[
                      { key: 'type', label: 'Source Type', width: 150 },
                      { key: 'id', label: 'Record', width: 130 },
                      { key: 'previous', label: 'Previous Rev', width: 100, render: (row) => `Rev ${row.previous || '—'}` },
                      { key: 'revision', label: 'New Rev', width: 90, render: (row) => `Rev ${row.revision}` },
                      { key: 'by', label: 'Created By', width: 110 },
                      { key: 'at', label: 'Date', width: 100, render: (row) => formatDate(row.at) },
                    ]}
                    rows={selected.revisionUpdates}
                    ariaLabel="Controlled revisions created by this ECO"
                  />
                )}
              </div>
            </section>
          )}

          {section === 'history' && (
            <>
              <section className="card approvals-panel">
                <div className="approvals-card-head"><div><strong>ECO History</strong><p>Creation, review, approval, implementation, revision and closure events.</p></div></div>
                <ul className="approvals-timeline approvals-pad">
                  {(selected.history || []).map((entry) => (
                    <li key={entry.id}>
                      <span className="approvals-timeline-dot" aria-hidden="true" />
                      <div>
                        <div className="approvals-timeline-head"><strong>{entry.action}</strong><span>{entry.at}</span></div>
                        <span className="approvals-timeline-stage">{entry.stage} · {entry.by}{entry.statusAfter ? ` · ${entry.statusAfter}` : ''}</span>
                        {entry.comments && <p>{entry.comments}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card approvals-panel">
                <div className="approvals-card-head"><div><strong>Source ECR History</strong><p>Decision history of the linked engineering change request.</p></div></div>
                <ul className="approvals-timeline approvals-pad">
                  {(selectedEcr?.history || []).map((entry) => (
                    <li key={entry.id}>
                      <span className="approvals-timeline-dot" aria-hidden="true" />
                      <div>
                        <div className="approvals-timeline-head"><strong>{entry.action}</strong><span>{entry.at}</span></div>
                        <span className="approvals-timeline-stage">{entry.stage} · {entry.by}{entry.statusAfter ? ` · ${entry.statusAfter}` : ''}</span>
                        {entry.comments && <p>{entry.comments}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      ) : (
        <EmptyState icon={ClipboardCheck} title="No engineering change orders" message="Approve an ECR, then create its ECO from this register." />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editing ? `Edit ${selected?.id}` : 'Create Engineering Change Order'}
        subtitle={editing ? 'Update technical and implementation requirements before review' : `${nextEcoId()} · from an approved ECR`}
        maxWidth="max-w-4xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button icon={editing ? Save : Plus} onClick={saveEcoForm}>{editing ? 'Save ECO' : 'Create ECO'}</Button>
          </>
        }
      >
        <div className="form-grid">
          {!editing && (
            <div className="form-field span-2">
              <label className="form-label" htmlFor="eco-source-ecr">Approved Source ECR <span className="req">*</span></label>
              <select id="eco-source-ecr" className="form-select" value={selectedEcrId} onChange={(event) => chooseEcr(event.target.value)}>
                <option value="">Select approved ECR</option>
                {eligibleEcrs.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.title} · {row.projectId}</option>)}
              </select>
              {!eligibleEcrs.length && <span className="form-hint">No approved ECR is waiting for an ECO. Approve an ECR first.</span>}
            </div>
          )}
          {formEcr && (
            <div className="fact-grid span-2">
              <Fact label="Source ECR">{formEcr.id}</Fact>
              <Fact label="Project">{projectLabel(formEcr.projectId)}</Fact>
              <Fact label="Design">{designLabel({ projectId: formEcr.projectId, designId: formEcr.designId })}</Fact>
              <Fact label="Affected Parts / Assemblies">{formEcr.affectedParts || '—'}</Fact>
            </div>
          )}
          <div className="form-field span-2">
            <label className="form-label" htmlFor="eco-description">Change Description</label>
            <textarea id="eco-description" className="form-textarea" rows={3} value={ecoForm.changeDescription || selectedEcr?.changeDescription || selectedEcr?.changeReason || ''} onChange={(event) => setEcoForm((previous) => ({ ...previous, changeDescription: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-current-rev">Current Revision</label>
            <input id="eco-current-rev" className="form-input" value={ecoForm.currentRevision || selectedEcr?.designRevision || selectedEcr?.currentRevision || ''} onChange={(event) => setEcoForm((previous) => ({ ...previous, currentRevision: event.target.value.toUpperCase() }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-proposed-rev">Proposed Design Revision <span className="req">*</span></label>
            <input id="eco-proposed-rev" className="form-input" value={ecoForm.proposedRevision} onChange={(event) => setEcoForm((previous) => ({ ...previous, proposedRevision: event.target.value.toUpperCase() }))} />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="eco-technical">Technical Impact</label>
            <textarea id="eco-technical" className="form-textarea" rows={3} value={ecoForm.technicalImpact} onChange={(event) => setEcoForm((previous) => ({ ...previous, technicalImpact: event.target.value }))} />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="eco-manufacturing">Manufacturing Impact</label>
            <textarea id="eco-manufacturing" className="form-textarea" rows={3} value={ecoForm.manufacturingImpact} onChange={(event) => setEcoForm((previous) => ({ ...previous, manufacturingImpact: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-bom-impact">BOM Impact</label>
            <textarea id="eco-bom-impact" className="form-textarea" rows={2} value={ecoForm.bomImpact} onChange={(event) => setEcoForm((previous) => ({ ...previous, bomImpact: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-drawing-impact">Drawing Impact</label>
            <textarea id="eco-drawing-impact" className="form-textarea" rows={2} value={ecoForm.drawingImpact} onChange={(event) => setEcoForm((previous) => ({ ...previous, drawingImpact: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-cost-impact">Cost Impact (if available)</label>
            <input id="eco-cost-impact" className="form-input" value={ecoForm.costImpact} onChange={(event) => setEcoForm((previous) => ({ ...previous, costImpact: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-effective">Effective Date</label>
            <input id="eco-effective" type="date" className="form-input" value={ecoForm.effectiveDate} onChange={(event) => setEcoForm((previous) => ({ ...previous, effectiveDate: event.target.value }))} />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="eco-risk">Risk / Validation Requirements</label>
            <textarea id="eco-risk" className="form-textarea" rows={3} value={ecoForm.riskValidation} onChange={(event) => setEcoForm((previous) => ({ ...previous, riskValidation: event.target.value }))} />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="eco-implementation">Implementation Notes</label>
            <textarea id="eco-implementation" className="form-textarea" rows={3} value={ecoForm.implementationNotes} onChange={(event) => setEcoForm((previous) => ({ ...previous, implementationNotes: event.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-engineer">Assigned Engineer</label>
            <select id="eco-engineer" className="form-select" value={ecoForm.assignedEngineer} onChange={(event) => setEcoForm((previous) => ({ ...previous, assignedEngineer: event.target.value }))}>
              {CHANGE_REVIEWERS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-bom-proposed">Proposed BOM Revision</label>
            <input id="eco-bom-proposed" className="form-input" value={ecoForm.proposedBomRevision} onChange={(event) => setEcoForm((previous) => ({ ...previous, proposedBomRevision: event.target.value.toUpperCase() }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-drawing-proposed">Proposed Drawing Revision</label>
            <input id="eco-drawing-proposed" className="form-input" value={ecoForm.proposedDrawingRevision} onChange={(event) => setEcoForm((previous) => ({ ...previous, proposedDrawingRevision: event.target.value.toUpperCase() }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="eco-documents">Supporting Documents</label>
            <input id="eco-documents" type="file" multiple className="form-input" onChange={addDocuments} />
            {(ecoForm.supportingDocuments || []).length > 0 && <span className="form-hint">{ecoForm.supportingDocuments.join(' · ')}</span>}
          </div>
          {formError && <p className="form-error span-2" role="alert">{formError}</p>}
        </div>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
