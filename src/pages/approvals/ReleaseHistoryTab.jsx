import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  History,
  Paperclip,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button, DataTable, EmptyState, KpiGrid, Modal, Pagination, SearchInput, Select, StatCard, StatusBadge, Textarea } from '../../components/common';
import { useApprovals } from '../../context/ApprovalsContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  DELIVERABLE_TYPES,
  clientApprovalActor,
  formatDate,
  isReleaseEligible,
  nextRevision,
  releaseSourceStatus,
  resubmissionRows,
  reviewOutcome,
  reviewStatusTone,
  stageDisplayName,
  stageTone,
} from '../../data/approvalsData';
import exportCsv from '../../utils/exportCsv';
import {
  ApprovalTimeline,
  AttachmentPreviewModal,
  DecisionDialog,
  Fact,
  HistoryDialog,
  RevisionDialog,
  SectionNav,
  Toast,
  useToast,
} from './approvalsUi';

const SECTIONS = [
  { key: 'final', label: 'Final Approval' },
  { key: 'releases', label: 'Approved Releases' },
  { key: 'rejected', label: 'Rejected Reviews' },
  { key: 'changes', label: 'Changes Requested' },
  { key: 'resubmissions', label: 'Resubmission History' },
  { key: 'decisions', label: 'Submission & Audit History' },
  { key: 'revisions', label: 'Exact Revision Tracking' },
];

function ResubmitModal({ review, onClose, onSubmit }) {
  const [revision, setRevision] = useState(nextRevision(review.revision));
  const [by, setBy] = useState(review.submittedBy);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal
      open
      onClose={onClose}
      title="Resubmit Corrected Revision"
      subtitle={`${review.id} · current Rev ${review.revision} · ${review.status}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={RotateCcw} onClick={() => {
            if (!revision.trim()) {
              setError('Enter the corrected revision.');
              return;
            }
            if (!notes.trim()) {
              setError('Describe the correction made before resubmitting.');
              return;
            }
            const result = onSubmit({ revision: revision.trim(), by, notes: notes.trim() });
            if (result?.error) setError(result.error);
            else onClose();
          }}>Create New Review Event</Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="resubmit-revision">New Revision</label>
          <input id="resubmit-revision" className="form-input" value={revision} onChange={(event) => { setRevision(event.target.value.toUpperCase()); setError(''); }} maxLength={4} />
        </div>
        <Select
          label="Submitted By"
          id="resubmit-by"
          options={[review.submittedBy, 'R. Kulkarni', 'D. Rao', 'K. Pillai', 'A. Iyer', 'S. Menon'].filter((value, index, list) => list.indexOf(value) === index).map((value) => ({ value, label: value }))}
          value={by}
          onChange={(event) => setBy(event.target.value)}
        />
        <Textarea
          label="Correction / Change Description"
          id="resubmit-notes"
          className="span-2"
          rows={4}
          value={notes}
          onChange={(event) => { setNotes(event.target.value); setError(''); }}
          placeholder="Explain the correction made in response to the previous decision."
        />
        <div className="approvals-note span-2">
          This creates a new review ID linked to {review.id}, preserves the earlier decision and restarts every applicable approval stage. Nothing is auto-approved.
        </div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function ReleaseConfirmModal({ review, onClose, onConfirm }) {
  const [error, setError] = useState('');
  const { boms } = useBom();
  const { drawings } = useCad();
  const source = releaseSourceStatus(review, boms, drawings);
  const manufacturing = review.requiredStages.includes('Manufacturing') ? review.stageStates.manufacturing.status : 'Not Required';
  const client = review.clientRequired ? review.stageStates.client.status : 'Not Required';
  return (
    <Modal
      open
      onClose={onClose}
      title="Create Controlled Release"
      subtitle={`${review.id} · ${review.deliverableNumber} Rev ${review.revision}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={ShieldCheck} disabled={!source.ready} onClick={() => {
            const result = onConfirm();
            if (result?.error) setError(result.error);
            else onClose();
          }}>Confirm Release</Button>
        </>
      }
    >
      <div className="approvals-release-confirm">
        <div className="approvals-release-stamp">
          <ShieldCheck aria-hidden="true" />
          <div><strong>All applicable required stages approved</strong><span>Exact revision: <b>Rev {review.revision}</b></span></div>
        </div>
        <div className="fact-grid">
          <Fact label="Project">{review.projectId}</Fact>
          <Fact label="Deliverable">{review.deliverableType}</Fact>
          <Fact label="Deliverable Number">{review.deliverableNumber}</Fact>
          <Fact label="BOM Revision">{review.bomId} · Rev {review.bomRevision}</Fact>
          <Fact label="BOM Status">{source.bom?.status || 'Not found'}</Fact>
          <Fact label="Drawing Revision">{review.drawingId} · Rev {review.drawingRevision}</Fact>
          <Fact label="Drawing Status">{source.drawing?.approvalStatus || 'Not found'}</Fact>
          <Fact label="Engineering">{review.stageStates.engineering.status}</Fact>
          <Fact label="Manufacturing">{manufacturing}</Fact>
          <Fact label="Client or Admin Approval">{client}</Fact>
        </div>
        {!source.ready && <p className="form-error" role="alert">{source.errors.join(' ')}</p>}
        <p className="approvals-note">This creates a local controlled release record only. It does not call Purchase or Production and does not transfer the deliverable to the Engineering Release & Transfer module.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export default function ReleaseHistoryTab() {
  const { reviews, releaseReview, resubmitReview, finalDecision } = useApprovals();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('releases');
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [finalTarget, setFinalTarget] = useState(null);
  const [finalMode, setFinalMode] = useState('');
  const [releaseDetail, setReleaseDetail] = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const [releaseSearch, setReleaseSearch] = useState('');
  const [releaseProject, setReleaseProject] = useState('All');
  const [releaseType, setReleaseType] = useState('All');
  const [releaseRevision, setReleaseRevision] = useState('All');
  const [releaseStatus, setReleaseStatus] = useState('All');
  const [releasePage, setReleasePage] = useState(1);
  const [releasePageSize, setReleasePageSize] = useState(10);

  const [decisionSearch, setDecisionSearch] = useState('');
  const [decisionStage, setDecisionStage] = useState('All');
  const [decisionOrder, setDecisionOrder] = useState('desc');
  const [decisionPage, setDecisionPage] = useState(1);
  const [decisionPageSize, setDecisionPageSize] = useState(15);

  const [revisionSearch, setRevisionSearch] = useState('');
  const [revisionType, setRevisionType] = useState('All');

  const released = useMemo(
    () =>
      reviews
        .filter((review) => review.release)
        .map((review) => ({
          ...review,
          releaseId: review.release.releaseId,
          exactRevision: review.revision,
          bomId: review.release.bomId || review.bomId,
          bomRevision: review.release.bomRevision || review.bomRevision,
          drawingId: review.release.drawingId || review.drawingId,
          drawingRevision: review.release.drawingRevision || review.drawingRevision,
          clientStatus: review.clientRequired ? review.stageStates.client.status : 'Not Required',
          finalApprovedBy: review.release.approvedBy,
          approvalDate: review.release.approvedAt,
          releaseDate: review.release.releaseDate,
          releaseStatus: review.release.status,
          reviewerDisplay: review.engineeringReviewer,
        }))
        .sort((left, right) => String(right.releaseDate).localeCompare(String(left.releaseDate))),
    [reviews],
  );
  const readyForFinal = reviews.filter((review) => review.status === 'Ready for Final Approval');
  const eligible = reviews.filter((review) => isReleaseEligible(review, boms, drawings));
  const rejected = reviews.filter((review) => review.status === 'Rejected');
  const changes = reviews.filter((review) => review.status === 'Changes Requested');
  const resubmissions = resubmissionRows(reviews).sort((left, right) => String(right.at).localeCompare(String(left.at)));

  const decisions = useMemo(() => {
    const rows = reviews.flatMap((review) =>
      (review.history || []).map((entry) => ({
        ...entry,
        rowId: `${review.id}-${entry.id}`,
        reviewId: review.id,
        projectId: review.projectId,
        deliverableType: review.deliverableType,
        deliverableNumber: review.deliverableNumber,
        revision: review.revision,
      })),
    );
    rows.sort((left, right) => {
      const order = String(left.at).localeCompare(String(right.at));
      return decisionOrder === 'asc' ? order : -order;
    });
    return rows;
  }, [reviews, decisionOrder]);

  const filteredReleases = useMemo(() => {
    const query = releaseSearch.trim().toLowerCase();
    return released.filter((row) => {
      if (releaseProject !== 'All' && row.projectId !== releaseProject) return false;
      if (releaseType !== 'All' && row.deliverableType !== releaseType) return false;
      if (releaseRevision !== 'All' && row.revision !== releaseRevision) return false;
      if (releaseStatus !== 'All' && row.releaseStatus !== releaseStatus) return false;
      if (!query) return true;
      return [row.releaseId, row.id, row.projectId, row.deliverableType, row.deliverableNumber, row.revision, row.finalApprovedBy, row.reviewerDisplay].join(' ').toLowerCase().includes(query);
    });
  }, [released, releaseSearch, releaseProject, releaseType, releaseRevision, releaseStatus]);

  const releasePages = Math.max(1, Math.ceil(filteredReleases.length / releasePageSize));
  const releaseCurrentPage = Math.min(releasePage, releasePages);
  const releaseRows = filteredReleases.slice((releaseCurrentPage - 1) * releasePageSize, releaseCurrentPage * releasePageSize);
  const releaseInfo = `Showing ${filteredReleases.length ? (releaseCurrentPage - 1) * releasePageSize + 1 : 0}-${Math.min(releaseCurrentPage * releasePageSize, filteredReleases.length)} of ${filteredReleases.length}`;

  const filteredDecisions = useMemo(() => {
    const query = decisionSearch.trim().toLowerCase();
    return decisions.filter((row) => {
      if (decisionStage !== 'All' && row.stage !== decisionStage) return false;
      if (!query) return true;
      return [row.reviewId, row.deliverableNumber, row.revision, row.stage, row.action, row.by, row.comments, row.projectId].join(' ').toLowerCase().includes(query);
    });
  }, [decisions, decisionSearch, decisionStage]);
  const decisionPages = Math.max(1, Math.ceil(filteredDecisions.length / decisionPageSize));
  const decisionCurrentPage = Math.min(decisionPage, decisionPages);
  const decisionRows = filteredDecisions.slice((decisionCurrentPage - 1) * decisionPageSize, decisionCurrentPage * decisionPageSize);
  const decisionInfo = `Showing ${filteredDecisions.length ? (decisionCurrentPage - 1) * decisionPageSize + 1 : 0}-${Math.min(decisionCurrentPage * decisionPageSize, filteredDecisions.length)} of ${filteredDecisions.length}`;

  const revisionRows = useMemo(() => {
    const query = revisionSearch.trim().toLowerCase();
    return [...reviews]
      .filter((review) => {
        if (revisionType !== 'All' && review.deliverableType !== revisionType) return false;
        if (!query) return true;
        return [review.id, review.deliverableNumber, review.deliverableName, review.revision, review.projectId, review.submittedBy].join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => `${left.deliverableNumber}${left.revision}`.localeCompare(`${right.deliverableNumber}${right.revision}`, undefined, { numeric: true }));
  }, [reviews, revisionSearch, revisionType]);

  const releaseCsv = () => {
    exportCsv(
      'approved-design-releases',
      [
        { key: 'releaseId', label: 'Release ID' },
        { key: 'projectId', label: 'Project' },
        { key: 'deliverableType', label: 'Deliverable Type' },
        { key: 'deliverableNumber', label: 'Deliverable Number' },
        { key: 'revision', label: 'Exact Approved Revision' },
        { key: 'bomRevision', label: 'BOM Revision' },
        { key: 'drawingRevision', label: 'Drawing Revision' },
        { key: 'reviewerDisplay', label: 'Engineering Reviewer' },
        { key: 'manufacturingReviewer', label: 'Manufacturing Reviewer' },
        { key: 'clientStatus', label: 'Client or Admin Approval Status' },
        { key: 'finalApprovedBy', label: 'Final Approved By' },
        { key: 'approvalDate', label: 'Approval Date' },
        { key: 'releaseDate', label: 'Release Date' },
        { key: 'releaseStatus', label: 'Release Status' },
      ],
      filteredReleases,
    );
    showToast('Release CSV export prepared.');
  };

  const counts = {
    releases: released.length,
    rejected: rejected.length,
    changes: changes.length,
    resubmissions: resubmissions.length,
    decisions: decisions.length,
    revisions: reviews.length,
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />

      {section === 'final' && (
        <>
          <section className="card approvals-panel">
            <div className="approvals-card-head">
              <div><strong>Ready for Final Approval</strong><p>All mandatory stages are complete. Final approval remains an explicit design-authority action and is not recorded automatically.</p></div>
              <span className="approvals-count-chip">{readyForFinal.length} awaiting decision</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', label: 'Review ID', width: 104, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'reviewType', label: 'Review Type', width: 148 },
                { key: 'projectId', label: 'Project', width: 104 },
                { key: 'deliverableNumber', label: 'Deliverable', width: 200, render: (row) => <span className="cell-project"><span className="cell-strong">{row.deliverableNumber}</span><span className="cell-muted approvals-clip">{row.deliverableName}</span></span> },
                { key: 'revision', label: 'Rev', width: 58, render: (row) => `Rev ${row.revision}` },
                { key: 'engineering', label: 'Engineering', width: 116, render: (row) => <StatusBadge status={row.stageStates.engineering.status} tone={stageTone(row.stageStates.engineering.status)} /> },
                { key: 'manufacturing', label: 'Manufacturing', width: 122, render: (row) => <StatusBadge status={row.requiredStages.includes('Manufacturing') ? row.stageStates.manufacturing.status : 'Not Required'} tone={stageTone(row.requiredStages.includes('Manufacturing') ? row.stageStates.manufacturing.status : 'Not Required')} /> },
                { key: 'assignedReviewers', label: 'Reviewers', width: 200, render: (row) => <span className="approvals-clip">{row.assignedReviewers?.join(', ')}</span> },
                { key: 'outcome', label: 'Outcome', width: 100, render: (row) => <StatusBadge status={reviewOutcome(row)} tone="blue" /> },
              ]}
              rows={readyForFinal}
              rowActions={(row) => [{ key: 'approve', label: 'Record final approval decision', icon: ShieldCheck }, { key: 'history', label: 'View audit history', icon: History }]}
              onRowAction={(key, row) => {
                if (key === 'approve') { setFinalTarget(row); setFinalMode('Approved'); }
                if (key === 'history') setHistoryTarget(row);
              }}
              ariaLabel="Reviews ready for final approval"
              emptyContent={<EmptyState icon={ShieldCheck} title="No reviews ready for final approval" message="A review appears here only after every mandatory engineering and manufacturing stage is complete." />}
            />
          </section>
          <p className="mech-footnote">Final approval records a local mock decision, approver and date. It does not represent a legally binding electronic signature.</p>
        </>
      )}

      {section === 'releases' && (
        <>
          <KpiGrid className="approvals-kpi-grid">
            <StatCard icon={ShieldCheck} label="Eligible for Release" value={String(eligible.length)} sub="Fully approved exact revisions" tone="teal" />
            <StatCard icon={FileCheck2} label="Released Records" value={String(released.length)} sub="Controlled local release records" tone="emerald" />
            <StatCard icon={XCircle} label="Rejected Reviews" value={String(rejected.length)} sub="Closed submissions" tone="red" />
            <StatCard icon={ClipboardCheck} label="With Changes" value={String(changes.length)} sub="Awaiting corrected resubmission" tone="orange" />
          </KpiGrid>

          <section className="card approvals-panel">
            <div className="approvals-card-head">
              <div><strong>Ready for Controlled Release</strong><p>Only fully approved reviews whose linked BOM and drawing revisions are also approved or released appear here. Release records all three exact revisions.</p></div>
              <span className="approvals-count-chip">{eligible.length} eligible</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', label: 'Review ID', width: 104, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'projectId', label: 'Project', width: 104 },
                { key: 'deliverableType', label: 'Deliverable Type', width: 138 },
                { key: 'deliverableNumber', label: 'Deliverable', width: 190, render: (row) => <span className="cell-project"><span className="cell-strong">{row.deliverableNumber}</span><span className="cell-muted approvals-clip">{row.deliverableName}</span></span> },
                { key: 'revision', label: 'Exact Rev', width: 76, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'bomRevision', label: 'BOM Revision', width: 146, render: (row) => row.bomRevision ? `${row.bomId} · Rev ${row.bomRevision}` : '—' },
                { key: 'drawingRevision', label: 'Drawing Revision', width: 158, render: (row) => row.drawingRevision ? `${row.drawingId} · Rev ${row.drawingRevision}` : '—' },
                { key: 'engineering', label: 'Engineering', width: 112, render: (row) => <StatusBadge status={row.stageStates.engineering.status} tone={stageTone(row.stageStates.engineering.status)} /> },
                { key: 'manufacturing', label: 'Manufacturing', width: 118, render: (row) => <StatusBadge status={row.requiredStages.includes('Manufacturing') ? row.stageStates.manufacturing.status : 'Not Required'} tone={stageTone(row.requiredStages.includes('Manufacturing') ? row.stageStates.manufacturing.status : 'Not Required')} /> },
                { key: 'client', label: 'Client', width: 112, render: (row) => <StatusBadge status={row.clientRequired ? row.stageStates.client.status : 'Not Required'} tone={stageTone(row.clientRequired ? row.stageStates.client.status : 'Not Required')} /> },
              ]}
              rows={eligible}
              onRowClick={(row) => setRevisionTarget(row)}
              rowActions={(row) => [{ key: 'release', label: 'Create controlled release', icon: ShieldCheck }, { key: 'history', label: 'View approval history', icon: History }, { key: 'revision', label: 'View exact revision', icon: Eye }]}
              onRowAction={(key, row) => {
                if (key === 'release') setReleaseTarget(row);
                if (key === 'history') setHistoryTarget(row);
                if (key === 'revision') setRevisionTarget(row);
              }}
              ariaLabel="Reviews eligible for controlled release"
              emptyContent={<EmptyState icon={ShieldCheck} title="No release-eligible reviews" message="A review becomes eligible only when all required stages are approved and the exact BOM and drawing revisions are approved or released." />}
            />
          </section>

          <div className="list-toolbar">
            <div className="toolbar-left">
              <Select id="release-filter-project" className="approvals-toolbar-select" options={[{ value: 'All', label: 'All Projects' }, ...projects.map((row) => ({ value: row.id, label: row.id }))]} value={releaseProject} onChange={(event) => { setReleaseProject(event.target.value); setReleasePage(1); }} aria-label="Filter releases by project" />
              <Select id="release-filter-type" className="approvals-toolbar-select" options={[{ value: 'All', label: 'All Types' }, ...DELIVERABLE_TYPES.map((value) => ({ value, label: value }))]} value={releaseType} onChange={(event) => { setReleaseType(event.target.value); setReleasePage(1); }} aria-label="Filter releases by deliverable type" />
              <Select id="release-filter-revision" className="approvals-toolbar-select" options={[{ value: 'All', label: 'All Revisions' }, ...[...new Set(released.map((row) => row.revision))].sort().map((value) => ({ value, label: `Rev ${value}` }))]} value={releaseRevision} onChange={(event) => { setReleaseRevision(event.target.value); setReleasePage(1); }} aria-label="Filter releases by revision" />
              <Select id="release-filter-status" className="approvals-toolbar-select" options={[{ value: 'All', label: 'All Release Statuses' }, { value: 'Released', label: 'Released' }]} value={releaseStatus} onChange={(event) => { setReleaseStatus(event.target.value); setReleasePage(1); }} aria-label="Filter releases by release status" />
            </div>
            <div className="toolbar-right">
              <SearchInput id="release-search" value={releaseSearch} onChange={(value) => { setReleaseSearch(value); setReleasePage(1); }} placeholder="Search release, deliverable, approver…" ariaLabel="Search approved releases" />
              <Button variant="secondary" size="sm" icon={Download} onClick={releaseCsv}>Export</Button>
              <span className="toolbar-count">{releaseInfo}</span>
            </div>
          </div>

          <section className="table-card">
            <DataTable
              columns={[
                { key: 'releaseId', label: 'Release ID', width: 138, render: (row) => <span className="cell-id">{row.releaseId}</span> },
                { key: 'projectId', label: 'Project', width: 104 },
                { key: 'deliverableType', label: 'Deliverable Type', width: 132 },
                { key: 'deliverableNumber', label: 'Deliverable', width: 178, render: (row) => <span className="cell-strong">{row.deliverableNumber}</span> },
                { key: 'revision', label: 'Exact Rev', width: 76, align: 'center', render: (row) => <span className="approvals-exact-rev">Rev {row.revision}</span> },
                { key: 'sourceRevisions', label: 'BOM / Drawing Rev', width: 190, render: (row) => <span className="approvals-clip">{row.bomRevision && row.drawingRevision ? `${row.bomId} Rev ${row.bomRevision} · ${row.drawingId} Rev ${row.drawingRevision}` : '—'}</span> },
                { key: 'reviewerDisplay', label: 'Engineering Reviewer', width: 126 },
                { key: 'manufacturingReviewer', label: 'Manufacturing Reviewer', width: 132, render: (row) => row.requiredStages.includes('Manufacturing') ? row.manufacturingReviewer : 'Not Required' },
                { key: 'clientStatus', label: 'Client or Admin Approval', width: 150, render: (row) => <StatusBadge status={row.clientStatus} tone={stageTone(row.clientStatus)} /> },
                { key: 'finalApprovedBy', label: 'Final Approved By', width: 128 },
                { key: 'approvalDate', label: 'Approval Date', width: 102, render: (row) => formatDate(row.approvalDate) },
                { key: 'releaseDate', label: 'Release Date', width: 100, render: (row) => formatDate(row.releaseDate) },
                { key: 'releaseStatus', label: 'Release Status', width: 100, render: (row) => <StatusBadge status={row.releaseStatus} tone="green" /> },
              ]}
              rows={releaseRows}
              onRowClick={(row) => setReleaseDetail(row)}
              rowActions={(row) => [{ key: 'details', label: 'View release details', icon: Eye }, { key: 'history', label: 'View approval history', icon: History }, { key: 'revision', label: 'View exact released revision', icon: FileCheck2 }]}
              onRowAction={(key, row) => {
                if (key === 'details') setReleaseDetail(row);
                if (key === 'history') setHistoryTarget(row);
                if (key === 'revision') setRevisionTarget(row);
              }}
              ariaLabel="Approved releases"
              emptyContent={<EmptyState icon={FileCheck2} title="No releases" message="Controlled releases appear here after an eligible revision is released." />}
            />
            <Pagination page={releaseCurrentPage} totalPages={releasePages} pageSize={releasePageSize} pageInfo={releaseInfo} onPageChange={setReleasePage} onPageSizeChange={(size) => { setReleasePageSize(size); setReleasePage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
          <p className="mech-footnote">Release records end this module's responsibility. No Purchase or Production transfer is performed or implied.</p>
        </>
      )}

      {section === 'rejected' && (
        <section className="table-card">
          <div className="approvals-card-head">
            <div><strong>Rejected Reviews</strong><p>Rejection reasons and resubmission status are preserved for each rejected submission.</p></div>
            <span className="approvals-count-chip">{rejected.length} rejected</span>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'Review ID', width: 104, render: (row) => <span className="cell-id">{row.id}</span> },
              { key: 'projectId', label: 'Project', width: 104 },
              { key: 'deliverableNumber', label: 'Deliverable', width: 190, render: (row) => <span className="cell-project"><span className="cell-strong">{row.deliverableNumber}</span><span className="cell-muted approvals-clip">{row.deliverableName}</span></span> },
              { key: 'revision', label: 'Revision', width: 76, render: (row) => `Rev ${row.revision}` },
              { key: 'stage', label: 'Rejection Stage', width: 160, render: (row) => stageDisplayName(row.currentStage) },
              { key: 'reason', label: 'Rejection Reason', width: 300, render: (row) => (row.stageStates.engineering.status === 'Rejected' ? row.stageStates.engineering.comments : row.stageStates.manufacturing.status === 'Rejected' ? row.stageStates.manufacturing.comments : row.stageStates.client.comments) },
              { key: 'reviewer', label: 'Reviewer', width: 130, render: (row) => (row.stageStates.engineering.status === 'Rejected' ? row.engineeringReviewer : row.currentStage === 'Client Approval' ? (clientApprovalActor(row)?.reviewer || 'Client or Admin') : row.manufacturingReviewer) },
              { key: 'decidedAt', label: 'Decision Date', width: 104, render: (row) => formatDate(row.stageStates.engineering.status === 'Rejected' ? row.stageStates.engineering.decidedAt : row.stageStates.manufacturing.status === 'Rejected' ? row.stageStates.manufacturing.decidedAt : row.stageStates.client.decidedAt) },
              { key: 'resubmission', label: 'Resubmission Status', width: 150, render: (row) => row.resubmissions?.length ? `Linked to ${row.resubmissions.at(-1).linkedReviewId}` : 'Not resubmitted' },
            ]}
            rows={rejected}
            rowActions={(row) => [{ key: 'history', label: 'View review history', icon: History }, { key: 'resubmit', label: 'Resubmit corrected revision', icon: RotateCcw }]}
            onRowAction={(key, row) => {
              if (key === 'history') setHistoryTarget(row);
              if (key === 'resubmit') setResubmitTarget(row);
            }}
            ariaLabel="Rejected reviews"
            emptyContent={<EmptyState icon={XCircle} title="No rejected reviews" message="Rejected submissions appear here with their reasons preserved." />}
          />
        </section>
      )}

      {section === 'changes' && (
        <section className="table-card">
          <div className="approvals-card-head">
            <div><strong>Changes Requested</strong><p>Corrections requested from the submitter. Earlier decisions are preserved when a new revision is submitted.</p></div>
            <span className="approvals-count-chip">{changes.length} open</span>
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'Review ID', width: 104, render: (row) => <span className="cell-id">{row.id}</span> },
              { key: 'deliverableNumber', label: 'Deliverable', width: 200, render: (row) => <span className="cell-project"><span className="cell-strong">{row.deliverableNumber}</span><span className="cell-muted approvals-clip">{row.deliverableName}</span></span> },
              { key: 'revision', label: 'Revision', width: 76, render: (row) => `Rev ${row.revision}` },
              { key: 'reviewer', label: 'Requesting Reviewer', width: 150, render: (row) => (row.stageStates.manufacturing.status === 'Changes Requested' ? row.manufacturingReviewer : row.clientRequired ? row.clientReviewer : row.engineeringReviewer) },
              { key: 'requested', label: 'Requested Changes', width: 300, render: (row) => (row.stageStates.engineering.status === 'Changes Requested' ? row.stageStates.engineering.comments : row.stageStates.manufacturing.status === 'Changes Requested' ? row.stageStates.manufacturing.comments : row.stageStates.client.comments) },
              { key: 'decidedAt', label: 'Decision Date', width: 104, render: (row) => formatDate(row.stageStates.engineering.status === 'Changes Requested' ? row.stageStates.engineering.decidedAt : row.stageStates.manufacturing.status === 'Changes Requested' ? row.stageStates.manufacturing.decidedAt : row.stageStates.client.decidedAt) },
              { key: 'submitter', label: 'Assigned Submitter', width: 120, render: (row) => row.submittedBy },
              { key: 'resubmission', label: 'Resubmission Status', width: 150, render: (row) => row.resubmissions?.length ? `Linked to ${row.resubmissions.at(-1).linkedReviewId}` : 'Awaiting resubmission' },
            ]}
            rows={changes}
            rowActions={(row) => [{ key: 'history', label: 'View decision history', icon: History }, { key: 'resubmit', label: 'Resubmit corrected revision', icon: RotateCcw }]}
            onRowAction={(key, row) => {
              if (key === 'history') setHistoryTarget(row);
              if (key === 'resubmit') setResubmitTarget(row);
            }}
            ariaLabel="Reviews with changes requested"
            emptyContent={<EmptyState icon={ClipboardCheck} title="No changes requested" message="Reviews that need correction appear here." />}
          />
        </section>
      )}

      {section === 'resubmissions' && (
        <section className="table-card">
          <div className="approvals-card-head">
            <div><strong>Resubmission History</strong><p>Each corrected revision creates a new linked review event and restarts all applicable stages.</p></div>
            <span className="approvals-count-chip">{resubmissions.length} resubmissions</span>
          </div>
          <DataTable
            columns={[
              { key: 'originalReviewId', label: 'Original Review ID', width: 128, render: (row) => <span className="cell-id">{row.originalReviewId}</span> },
              { key: 'deliverableNumber', label: 'Deliverable', width: 176, render: (row) => <span className="cell-strong">{row.deliverableNumber}</span> },
              { key: 'previousRevision', label: 'Previous Revision', width: 110, render: (row) => `Rev ${row.previousRevision}` },
              { key: 'newRevision', label: 'New Revision', width: 96, render: (row) => <span className="approvals-exact-rev">Rev {row.newRevision}</span> },
              { key: 'at', label: 'Resubmission Date', width: 118, render: (row) => formatDate(row.at) },
              { key: 'by', label: 'Submitted By', width: 110 },
              { key: 'previousDecision', label: 'Previous Decision', width: 134, render: (row) => <StatusBadge status={row.previousDecision} tone={reviewStatusTone(row.previousDecision)} /> },
              { key: 'currentLinkedStatus', label: 'Current Status', width: 148, render: (row) => <StatusBadge status={row.currentLinkedStatus} tone={reviewStatusTone(row.currentLinkedStatus)} /> },
              { key: 'linkedReviewId', label: 'Linked Review ID', width: 120, render: (row) => <span className="cell-id">{row.linkedReviewId}</span> },
            ]}
            rows={resubmissions}
            onRowClick={(row) => {
              const target = reviews.find((review) => review.id === row.linkedReviewId);
              if (target) setRevisionTarget(target);
            }}
            ariaLabel="Resubmission history"
            emptyContent={<EmptyState icon={RotateCcw} title="No resubmissions" message="Corrected revision submissions will be recorded here with their linked review IDs." />}
          />
        </section>
      )}

      {section === 'decisions' && (
        <>
          <div className="list-toolbar">
            <div className="toolbar-left">
              <Select id="decision-filter-stage" className="approvals-toolbar-select" options={[{ value: 'All', label: 'All Stages' }, ...['Review Register', 'Engineering Review', 'Manufacturing Review', 'Client Approval', 'Final Approval', 'Release'].map((value) => ({ value, label: value === 'Client Approval' ? 'Client or Admin Approval' : value }))]} value={decisionStage} onChange={(event) => { setDecisionStage(event.target.value); setDecisionPage(1); }} aria-label="Filter decisions by stage" />
              <Select id="decision-order" className="approvals-toolbar-select" options={[{ value: 'desc', label: 'Newest First' }, { value: 'asc', label: 'Oldest First' }]} value={decisionOrder} onChange={(event) => setDecisionOrder(event.target.value)} aria-label="Decision history order" />
            </div>
            <div className="toolbar-right">
              <SearchInput id="decision-search" value={decisionSearch} onChange={(value) => { setDecisionSearch(value); setDecisionPage(1); }} placeholder="Search decisions, reviewer, reason…" ariaLabel="Search decision history" />
              <span className="toolbar-count">{decisionInfo}</span>
            </div>
          </div>
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'at', label: 'Timestamp', width: 142, render: (row) => <span className="cell-muted">{row.at}</span> },
                { key: 'reviewId', label: 'Review ID', width: 104, render: (row) => <span className="cell-id">{row.reviewId}</span> },
                { key: 'deliverableNumber', label: 'Deliverable', width: 152, render: (row) => <span className="cell-strong">{row.deliverableNumber}</span> },
                { key: 'revision', label: 'Revision', width: 68, render: (row) => `Rev ${row.revision}` },
                { key: 'stage', label: 'Stage', width: 132 },
                { key: 'action', label: 'Action', width: 142 },
                { key: 'previousStatus', label: 'Previous Status', width: 134 },
                { key: 'newStatus', label: 'New Status', width: 144, render: (row) => <StatusBadge status={row.newStatus} tone={reviewStatusTone(row.newStatus)} /> },
                { key: 'by', label: 'Performed By', width: 116 },
                { key: 'role', label: 'Role', width: 132 },
                { key: 'comments', label: 'Comments / Reason', width: 280 },
              ]}
              rows={decisionRows}
              className="mech-register-table"
              ariaLabel="Approval decision history"
              emptyContent={<EmptyState icon={History} title="No decision events" message="Approval decisions and comments will appear in this chronological register." />}
            />
            <Pagination page={decisionCurrentPage} totalPages={decisionPages} pageSize={decisionPageSize} pageInfo={decisionInfo} onPageChange={setDecisionPage} onPageSizeChange={(size) => { setDecisionPageSize(size); setDecisionPage(1); }} pageSizeOptions={[10, 15, 25]} />
          </section>
        </>
      )}

      {section === 'revisions' && (
        <section className="table-card">
          <div className="approvals-card-head">
            <div><strong>Exact Revision Tracking</strong><p>Identify exactly which revision received each approval and whether that exact revision was released.</p></div>
            <span className="approvals-count-chip">{revisionRows.length} revisions</span>
          </div>
          <div className="list-toolbar approvals-toolbar-inset">
            <div className="toolbar-left">
              <Select id="revision-filter-type" className="approvals-toolbar-select" options={[{ value: 'All', label: 'All Deliverable Types' }, ...DELIVERABLE_TYPES.map((value) => ({ value, label: value }))]} value={revisionType} onChange={(event) => setRevisionType(event.target.value)} aria-label="Filter exact revisions by deliverable type" />
            </div>
            <div className="toolbar-right">
              <SearchInput id="revision-search" value={revisionSearch} onChange={setRevisionSearch} placeholder="Search deliverable, revision, author…" ariaLabel="Search exact revisions" />
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'deliverableNumber', label: 'Deliverable Number', width: 156, render: (row) => <span className="cell-strong">{row.deliverableNumber}</span> },
              { key: 'revision', label: 'Revision', width: 72, render: (row) => <span className="approvals-exact-rev">Rev {row.revision}</span> },
              { key: 'bomRevision', label: 'BOM Revision', width: 146, render: (row) => row.bomRevision ? `${row.bomId} · Rev ${row.bomRevision}` : '—' },
              { key: 'drawingRevision', label: 'Drawing Revision', width: 158, render: (row) => row.drawingRevision ? `${row.drawingId} · Rev ${row.drawingRevision}` : '—' },
              { key: 'reviewDate', label: 'Review Date', width: 100, render: (row) => formatDate(row.reviewDate || row.submittedAt) },
              { key: 'submittedAt', label: 'Revision Date', width: 100, render: (row) => formatDate(row.submittedAt) },
              { key: 'submittedBy', label: 'Revision Author', width: 106 },
              { key: 'submissionNotes', label: 'Change Description', width: 240, render: (row) => <span className="approvals-clamp">{row.submissionNotes || 'No change description recorded.'}</span> },
              { key: 'status', label: 'Review Status', width: 150, render: (row) => <StatusBadge status={row.status} tone={reviewStatusTone(row.status)} /> },
              { key: 'engineering', label: 'Engineering Decision', width: 144, render: (row) => <StatusBadge status={row.stageStates.engineering.status} tone={stageTone(row.stageStates.engineering.status)} /> },
              { key: 'manufacturing', label: 'Manufacturing Decision', width: 156, render: (row) => <StatusBadge status={row.requiredStages.includes('Manufacturing') ? row.stageStates.manufacturing.status : 'Not Required'} tone={stageTone(row.requiredStages.includes('Manufacturing') ? row.stageStates.manufacturing.status : 'Not Required')} /> },
              { key: 'client', label: 'Client Decision', width: 132, render: (row) => <StatusBadge status={row.clientRequired ? row.stageStates.client.status : 'Not Required'} tone={stageTone(row.clientRequired ? row.stageStates.client.status : 'Not Required')} /> },
              { key: 'outcome', label: 'Outcome', width: 108, render: (row) => <StatusBadge status={reviewOutcome(row)} tone={reviewOutcome(row) === 'Approved' ? 'green' : reviewOutcome(row) === 'Rejected' ? 'red' : reviewOutcome(row) === 'Revision Required' ? 'orange' : 'blue'} /> },
              { key: 'finalApprover', label: 'Final Approver', width: 124, render: (row) => row.finalApproval?.approver || 'Not recorded' },
              { key: 'finalAt', label: 'Decision Date', width: 102, render: (row) => row.finalApproval?.at ? formatDate(row.finalApproval.at) : '—' },
              { key: 'recommendation', label: 'Release Recommendation', width: 240, render: (row) => <span className="approvals-clamp">{row.finalApproval?.releaseRecommendation || 'Not available'}</span> },
              { key: 'release', label: 'Release Status', width: 132, render: (row) => row.release ? <StatusBadge status="Released" tone="green" /> : <StatusBadge status="Not Released" tone="gray" /> },
            ]}
            rows={revisionRows}
            onRowClick={(row) => setRevisionTarget(row)}
            rowActions={(row) => [{ key: 'revision', label: 'View exact revision', icon: Eye }, { key: 'history', label: 'View decision history', icon: History }]}
            onRowAction={(key, row) => {
              if (key === 'revision') setRevisionTarget(row);
              if (key === 'history') setHistoryTarget(row);
            }}
            ariaLabel="Exact revision tracking"
            emptyContent={<EmptyState icon={FileCheck2} title="No revisions" message="No deliverable revisions match the current filter." />}
          />
        </section>
      )}

      {finalTarget && (
        <DecisionDialog
          key={`${finalTarget.id}-${finalMode}`}
          open
          onClose={() => setFinalTarget(null)}
          title="Final Approval Decision"
          subtitle={`${finalTarget.id} · ${finalTarget.deliverableNumber} Rev ${finalTarget.revision}`}
          actions={[
            { value: 'Approve', label: 'Approve for controlled release' },
            { value: 'Reject', label: 'Reject' },
            { value: 'Request Changes', label: 'Revision Required' },
          ]}
          defaultDecision="Approve"
          reviewerLabel="Approver"
          reviewerOptions={['Design Authority', 'N. Joshi', 'A. Iyer', 'S. Menon']}
          defaultReviewer="Design Authority"
          onSubmit={({ decision, reviewer, comments }) => {
            const finalValue = decision === 'Approve' ? 'Approved' : decision === 'Request Changes' ? 'Revision Required' : 'Rejected';
            const result = finalDecision(finalTarget.id, {
              decision: finalValue,
              comments,
              approver: reviewer,
              releaseRecommendation: finalValue === 'Approved'
                ? 'Recommended for controlled release after exact BOM and drawing revision checks.'
                : 'Not recommended for release. Corrective action and a new revision are required.',
            });
            if (!result.error) {
              showToast(`${finalTarget.id} final decision recorded: ${finalValue}.`);
              setFinalTarget(null);
            }
            return result;
          }}
        >
          <div className="approvals-note span-2">
            Mandatory stages: {finalTarget.requiredStages.join(' → ')}. Engineering: {finalTarget.stageStates.engineering.status}.
            Manufacturing: {finalTarget.requiredStages.includes('Manufacturing') ? finalTarget.stageStates.manufacturing.status : 'Not Required'}.
          </div>
        </DecisionDialog>
      )}

      {releaseTarget && (
        <ReleaseConfirmModal
          review={releaseTarget}
          onClose={() => setReleaseTarget(null)}
          onConfirm={() => {
            const result = releaseReview(releaseTarget.id, 'Design Authority');
            if (!result.error) showToast(`${result.release.releaseId} created for ${releaseTarget.deliverableNumber} Rev ${releaseTarget.revision}.`);
            return result;
          }}
        />
      )}

      {resubmitTarget && (
        <ResubmitModal
          review={resubmitTarget}
          onClose={() => setResubmitTarget(null)}
          onSubmit={(payload) => {
            const result = resubmitReview(resubmitTarget.id, payload);
            if (!result.error) showToast(`${result.reviewId} created for Rev ${result.revision}; all required stages restarted.`);
            return result;
          }}
        />
      )}

      <Modal
        open={Boolean(releaseDetail)}
        onClose={() => setReleaseDetail(null)}
        title="Controlled Release Record"
        subtitle={releaseDetail ? `${releaseDetail.release.releaseId} · ${releaseDetail.deliverableNumber} Rev ${releaseDetail.revision}` : ''}
        maxWidth="max-w-2xl"
        footer={<Button variant="ghost" onClick={() => setReleaseDetail(null)}>Close</Button>}
      >
        {releaseDetail && (
          <>
            <div className="fact-grid">
              <Fact label="Release ID">{releaseDetail.release.releaseId}</Fact>
              <Fact label="Project">{releaseDetail.projectId}</Fact>
              <Fact label="Deliverable Type">{releaseDetail.deliverableType}</Fact>
              <Fact label="Deliverable Number">{releaseDetail.deliverableNumber}</Fact>
              <Fact label="Exact Approved Revision">Rev {releaseDetail.release.revision}</Fact>
              <Fact label="BOM Revision">{releaseDetail.release.bomId} · Rev {releaseDetail.release.bomRevision}</Fact>
              <Fact label="Drawing Revision">{releaseDetail.release.drawingId} · Rev {releaseDetail.release.drawingRevision}</Fact>
              <Fact label="Approval Status">Approved and released (local record)</Fact>
              <Fact label="Final Approved By">{releaseDetail.release.approvedBy}</Fact>
              <Fact label="Approval Date">{formatDate(releaseDetail.release.approvedAt)}</Fact>
              <Fact label="Release Date">{formatDate(releaseDetail.release.releaseDate)}</Fact>
              <Fact label="Released By">{releaseDetail.release.releasedBy}</Fact>
              <Fact label="Release Status">{releaseDetail.release.status}</Fact>
              <Fact label="Client or Admin Approval">{releaseDetail.clientRequired ? releaseDetail.stageStates.client.status : 'Not Required'}</Fact>
            </div>
            <div className="approvals-subsection">
              <h4>Supporting attachments</h4>
              {releaseDetail.attachments.length === 0 ? <p className="cell-muted">No attachment references recorded.</p> : (
                <ul className="approvals-attachments">
                  {releaseDetail.attachments.map((attachment) => (
                    <li key={attachment.name}>
                      <Paperclip aria-hidden="true" />
                      <div><strong>{attachment.name}</strong><span>{attachment.type}</span></div>
                      <Button variant="ghost" size="sm" icon={Eye} onClick={() => { setPreviewAttachment(attachment); setReleaseDetail(null); }}>View</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="approvals-note-block">
              <ShieldCheck aria-hidden="true" />
              <p>This local release record is available to the Engineering Release &amp; Transfer module as a candidate. No Purchase or Production transfer has occurred.</p>
            </div>
          </>
        )}
      </Modal>

      <RevisionDialog review={revisionTarget} onClose={() => setRevisionTarget(null)} />
      <HistoryDialog review={historyTarget} onClose={() => setHistoryTarget(null)} />
      <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
