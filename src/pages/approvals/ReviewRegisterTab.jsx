import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  ClipboardCheck,
  Download,
  Eye,
  FilePlus2,
  Filter,
  History,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useApprovals } from '../../context/ApprovalsContext';
import { useProjects } from '../../context/ProjectsContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import {
  CLIENT_REVIEWERS,
  DELIVERABLE_TYPES,
  clientApprovalActor,
  stageDisplayName,
  ENGINEERING_REVIEWERS,
  MANUFACTURING_REVIEWERS,
  REVIEW_STATUSES,
  REVIEW_TYPES,
  STAGES,
  formatDate,
  formatBytes,
  reviewStatusTone,
} from '../../data/approvalsData';
import exportCsv from '../../utils/exportCsv';
import {
  ApprovalFilters,
  ApprovalTimeline,
  AttachmentPreviewModal,
  Fact,
  HistoryDialog,
  RevisionDialog,
  SectionNav,
  Toast,
  WorkflowTrack,
  useTable,
  useToast,
} from './approvalsUi';

const SECTIONS = [
  { key: 'all', label: 'All Reviews' },
  { key: 'pending', label: 'Pending Reviews' },
  { key: 'assigned', label: 'Assigned Reviews' },
  { key: 'new', label: 'New Review' },
  { key: 'details', label: 'Review Details' },
];

const ALL_REVIEWERS = [...new Set([...ENGINEERING_REVIEWERS, ...MANUFACTURING_REVIEWERS, ...CLIENT_REVIEWERS])];

const CSV_COLUMNS = [
  { key: 'id', label: 'Review ID' },
  { key: 'reviewType', label: 'Review Type' },
  { key: 'reviewPurpose', label: 'Review Purpose' },
  { key: 'projectId', label: 'Project' },
  { key: 'designId', label: 'Mechanical Design' },
  { key: 'designRevision', label: 'Design Revision' },
  { key: 'deliverableType', label: 'Deliverable Type' },
  { key: 'deliverableNumber', label: 'Deliverable Number' },
  { key: 'revision', label: 'Revision' },
  { key: 'bomRevision', label: 'BOM Revision' },
  { key: 'drawingRevision', label: 'Drawing Revision' },
  { key: 'reviewDate', label: 'Review Date' },
  { key: 'submittedBy', label: 'Submitted By' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'assignedReviewers', label: 'Assigned Reviewers' },
  { key: 'plannedReviewDate', label: 'Planned Review Date' },
  { key: 'submittedAt', label: 'Submitted Date' },
  { key: 'reviewer', label: 'Reviewer' },
  { key: 'priority', label: 'Priority' },
  { key: 'currentStage', label: 'Current Stage' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
];

function currentReviewer(review) {
  if (review.currentStage === 'Manufacturing Review') return review.manufacturingReviewer;
  if (review.currentStage === 'Client Approval') {
    return clientApprovalActor(review)?.reviewer || 'Client or Admin';
  }
  return review.engineeringReviewer;
}

export default function ReviewRegisterTab() {
  const navigate = useNavigate();
  const { reviews, submitReview, reviewerPersona } = useApprovals();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('all');
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [attachmentsTarget, setAttachmentsTarget] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [selectedId, setSelectedId] = useState(reviews.find((row) => row.status !== 'Draft')?.id || reviews[0]?.id || '');

  const rows = useMemo(
    () =>
      reviews.map((review) => ({
        ...review,
        reviewer: currentReviewer(review),
      })),
    [reviews],
  );

  const table = useTable(rows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.reviewType !== 'All' && row.reviewType !== filters.reviewType) return false;
    if (filters.type !== 'All' && row.deliverableType !== filters.type) return false;
    if (filters.reviewer !== 'All' && ![row.engineeringReviewer, row.manufacturingReviewer, row.clientReviewer].includes(filters.reviewer)) return false;
    if (filters.stage !== 'All' && row.currentStage !== filters.stage) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.projectId, row.designId, row.reviewType, row.reviewPurpose, row.requestedBy, row.assignedReviewers?.join(' '), row.deliverableType, row.deliverableNumber, row.deliverableName, row.revision, row.bomRevision, row.drawingRevision, row.submittedBy, row.reviewer, row.status, row.currentStage]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const scopeRows = useMemo(() => {
    if (section === 'pending') {
      return rows.filter((row) => !['Draft', 'Released', 'Rejected', 'Changes Requested'].includes(row.status));
    }
    if (section === 'assigned') {
      return rows.filter(
        (row) =>
          [row.engineeringReviewer, row.manufacturingReviewer, row.clientReviewer].includes(reviewerPersona),
      );
    }
    return rows;
  }, [rows, section, reviewerPersona]);

  const scopedIds = new Set(scopeRows.map((row) => row.id));
  const tableRows = table.sorted.filter((row) => scopedIds.has(row.id));
  const pageSize = table.pageSize;
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const currentPage = Math.min(table.page, totalPages);
  const pageRows = tableRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${tableRows.length ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(currentPage * pageSize, tableRows.length)} of ${tableRows.length}`;

  const selected = reviews.find((row) => row.id === selectedId) || rows[0] || null;
  const drafts = reviews.filter((row) => row.status === 'Draft');
  const counts = {
    all: reviews.length,
    pending: rows.filter((row) => !['Draft', 'Released', 'Rejected', 'Changes Requested'].includes(row.status)).length,
    assigned: reviews.filter((row) => [row.engineeringReviewer, row.manufacturingReviewer, row.clientReviewer].includes(reviewerPersona)).length,
    new: drafts.length,
  };

  const exportCurrent = () => {
    exportCsv('design-review-register', CSV_COLUMNS, tableRows);
    showToast('CSV export prepared.');
  };

  const actionsFor = (row) => [
    { key: 'view', label: 'View review details', icon: Eye },
    { key: 'revision', label: 'View submitted revision', icon: History },
    ...(row.attachments?.length ? [{ key: 'attachments', label: 'View attachments', icon: Paperclip }] : []),
    ...(row.status === 'Ready for Final Approval'
      ? [{ key: 'final', label: 'Open final approval history', icon: ShieldCheck }]
      : []),
    ...(targetsFor('review', row).some((target) => target.enabled)
      ? [{ key: 'convert', label: 'Raise engineering change', icon: ArrowRightLeft }]
      : []),
    ...(row.status === 'Draft'
      ? [
          { key: 'edit', label: 'Edit draft', icon: Pencil },
          { key: 'submit', label: 'Submit for review', icon: Send, divider: true },
        ]
      : []),
  ];

  const handleAction = (key, row) => {
    if (key === 'view') navigate(`/design-review/review/${row.id}`);
    if (key === 'revision') setRevisionTarget(row);
    if (key === 'attachments') setAttachmentsTarget(row);
    if (key === 'final') navigate('/design-review/releases');
    if (key === 'convert') openConversion('review', row);
    if (key === 'edit') navigate(`/design-review/review/${row.id}/edit`);
    if (key === 'submit') {
      const result = submitReview(row.id);
      if (result.error) showToast(result.error, 'error');
      else showToast(`${row.id} submitted for review.`);
    }
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />

      {(section === 'all' || section === 'pending' || section === 'assigned') && (
        <>
          <KpiGrid className="approvals-kpi-grid">
            <StatCard icon={ClipboardCheck} label={section === 'all' ? 'All Reviews' : section === 'pending' ? 'Pending Reviews' : 'Assigned Reviews'} value={String(scopeRows.length)} sub={section === 'assigned' ? `Assigned to ${reviewerPersona}` : 'Current review register scope'} tone="teal" />
            <StatCard icon={Eye} label="Open Reviews" value={String(scopeRows.filter((row) => row.status !== 'Draft').length)} sub="Submitted submissions" tone="blue" />
            <StatCard icon={Send} label="Drafts" value={String(scopeRows.filter((row) => row.status === 'Draft').length)} sub="Not in the approval workflow" tone="orange" />
            <StatCard icon={History} label="Released Revisions" value={String(scopeRows.filter((row) => row.status === 'Released').length)} sub="Controlled exact revisions" tone="emerald" />
          </KpiGrid>

          <Toolbar
            left={
              <>
                <Button variant="ghost" icon={RefreshCw} onClick={table.reset}>Refresh</Button>
                <Button variant="secondary" size="sm" icon={Filter} onClick={() => table.setFiltersOpen((open) => !open)}>
                  {table.filtersOpen ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </>
            }
            right={
              <>
                <SearchInput id="approval-register-search" value={table.search} onChange={table.setSearch} placeholder="Search review, deliverable, project…" ariaLabel="Search reviews" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportCurrent}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => navigate('/design-review/new')}>New Review</Button>
              </>
            }
            count={pageInfo}
          />
          <ApprovalFilters
            table={table}
            projects={projects}
            reviewers={ALL_REVIEWERS}
            stages={STAGES}
            statuses={REVIEW_STATUSES}
            reviewTypes={REVIEW_TYPES}
          />

          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Review ID', width: 100, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'reviewType', label: 'Review Type', width: 142, sortable: true },
                { key: 'projectId', label: 'Project', width: 100, sortable: true },
                { key: 'designId', label: 'Design', width: 118, sortable: true, render: (row) => row.designId ? <span className="cell-project"><span>{row.designId}</span><span className="cell-muted">Rev {row.designRevision}</span></span> : '—' },
                { key: 'deliverableNumber', label: 'Part / Assembly / Deliverable', width: 200, sortable: true, render: (row) => <span className="cell-project"><span className="cell-strong approvals-clip">{row.partRef || row.deliverableNumber}</span><span className="cell-muted approvals-clip">{row.deliverableNumber} · Rev {row.revision}</span></span> },
                { key: 'reviewPurpose', label: 'Purpose', width: 210, sortable: true, render: (row) => <span className="approvals-clip" title={row.reviewPurpose}>{row.reviewPurpose}</span> },
                { key: 'requestedBy', label: 'Requested By', width: 104, sortable: true },
                { key: 'assignedReviewers', label: 'Assigned Reviewers', width: 188, render: (row) => <span className="approvals-clip" title={row.assignedReviewers?.join(', ')}>{row.assignedReviewers?.join(', ') || '—'}</span> },
                { key: 'plannedReviewDate', label: 'Planned Review', width: 102, sortable: true, render: (row) => formatDate(row.plannedReviewDate) },
                { key: 'priority', label: 'Priority', width: 78, sortable: true },
                { key: 'currentStage', label: 'Current Stage', width: 158, sortable: true, render: (row) => <span className="approvals-stage-chip">{stageDisplayName(row.currentStage)}</span> },
                { key: 'status', label: 'Status', width: 142, sortable: true, render: (row) => <StatusBadge status={row.status} tone={reviewStatusTone(row.status)} /> },
              ]}
              rows={pageRows}
              className="mech-register-table approvals-register-table"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              recordHref={(row) => `/design-review/review/${row.id}`}
              onRowClick={(row) => navigate(`/design-review/review/${row.id}`)}
              rowActions={actionsFor}
              onRowAction={handleAction}
              ariaLabel="Design review register"
              emptyContent={<EmptyState icon={ClipboardCheck} title="No reviews" message="No review records match the current section, search and filters." />}
            />
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageInfo={pageInfo}
              onPageChange={table.setPage}
              onPageSizeChange={(size) => { table.setPageSize(size); table.setPage(1); }}
              pageSizeOptions={[5, 10, 25]}
            />
          </section>
          <p className="mech-footnote">
            A review ID belongs to one deliverable revision. Approvals are local simulation records only; they do not
            provide backend authorization or a legally binding approval.
          </p>
        </>
      )}

      {section === 'new' && (
        <>
          <div className="approvals-callout">
            <span className="approvals-callout-icon"><FilePlus2 aria-hidden="true" /></span>
            <div>
              <strong>Start a design review</strong>
              <p>Register the deliverable, choose applicable stages and assign reviewers. Drafts stay outside the workflow until submitted.</p>
            </div>
            <Button icon={Plus} onClick={() => navigate('/design-review/new')}>New Review</Button>
          </div>
          <section className="table-card">
            <div className="approvals-card-head">
              <div><strong>Draft reviews</strong><span className="cell-muted">Drafts are editable and never enter the approval workflow automatically.</span></div>
            </div>
            <DataTable
              columns={[
                { key: 'id', label: 'Review ID', width: 110, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'projectId', label: 'Project', width: 110 },
                { key: 'deliverableType', label: 'Deliverable Type', width: 150 },
                { key: 'deliverableNumber', label: 'Deliverable Number', width: 180, render: (row) => <span className="cell-strong">{row.deliverableNumber}</span> },
                { key: 'revision', label: 'Revision', width: 80, render: (row) => `Rev ${row.revision}` },
                { key: 'bomRevision', label: 'BOM Revision', width: 146, render: (row) => row.bomRevision ? `${row.bomId} · Rev ${row.bomRevision}` : '—' },
                { key: 'drawingRevision', label: 'Drawing Revision', width: 158, render: (row) => row.drawingRevision ? `${row.drawingId} · Rev ${row.drawingRevision}` : '—' },
                { key: 'submittedBy', label: 'Submitted By', width: 120 },
                { key: 'status', label: 'Status', width: 100, render: (row) => <StatusBadge status={row.status} tone="gray" /> },
              ]}
              rows={drafts}
              rowActions={(row) => [
                { key: 'edit', label: 'Edit draft', icon: Pencil },
                { key: 'submit', label: 'Submit for review', icon: Send },
              ]}
              onRowAction={(key, row) => {
                if (key === 'edit') navigate(`/design-review/review/${row.id}/edit`);
                if (key === 'submit') {
                  const result = submitReview(row.id);
                  if (result.error) showToast(result.error, 'error');
                  else showToast(`${row.id} submitted for review.`);
                }
              }}
              recordHref={(row) => `/design-review/review/${row.id}`}
              onRowClick={(row) => navigate(`/design-review/review/${row.id}`)}
              ariaLabel="Draft reviews"
              emptyContent={<EmptyState icon={FilePlus2} title="No drafts" message="Create a review and save it as a draft to see it here." />}
            />
          </section>
        </>
      )}

      {section === 'details' && (
        <>
          <div className="approvals-detail-bar">
            <div className="form-field">
              <label className="form-label" htmlFor="approval-detail-select">Review</label>
              <select id="approval-detail-select" className="form-select" value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>
                {rows.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.deliverableNumber} Rev {row.revision} · {row.status}</option>)}
              </select>
            </div>
            {selected && (
              <div className="approvals-detail-actions">
                <Button icon={Eye} onClick={() => navigate(`/design-review/review/${selected.id}`)}>Open Full Review</Button>
                <Button variant="secondary" icon={History} onClick={() => setRevisionTarget(selected)}>View Revision</Button>
              </div>
            )}
          </div>

          {selected && (
            <div className="approvals-detail-layout">
              <section className="card approvals-detail-main">
                <div className="approvals-card-head">
                  <div>
                    <span className="cell-id">{selected.id}</span>
                    <strong>{selected.deliverableNumber} · Rev {selected.revision}</strong>
                    <p>{selected.deliverableName}</p>
                  </div>
                  <div className="approvals-inline-badges">
                    <StatusBadge status={selected.status} tone={reviewStatusTone(selected.status)} />
                    <span className="approvals-stage-chip">{stageDisplayName(selected.currentStage)}</span>
                  </div>
                </div>
                <WorkflowTrack review={selected} />
                <div className="fact-grid approvals-pad">
                  <Fact label="Project">{selected.projectId}</Fact>
                  <Fact label="Deliverable Type">{selected.deliverableType}</Fact>
                  <Fact label="BOM Revision">{selected.bomId ? `${selected.bomId} · Rev ${selected.bomRevision}` : 'Not linked'}</Fact>
                  <Fact label="Drawing Revision">{selected.drawingId ? `${selected.drawingId} · Rev ${selected.drawingRevision}` : 'Not linked'}</Fact>
                  <Fact label="Part / Assembly">{selected.partRef || 'Not linked'}</Fact>
                  <Fact label="Priority">{selected.priority}</Fact>
                  <Fact label="Submitted By">{selected.submittedBy}</Fact>
                  <Fact label="Review Date">{formatDate(selected.reviewDate || selected.submittedAt)}</Fact>
                  <Fact label="Submission Date">{formatDate(selected.submittedAt)}</Fact>
                  <Fact label="Due Date">{formatDate(selected.dueDate)}</Fact>
                  <Fact label="Engineering Reviewer">{selected.engineeringReviewer}</Fact>
                  <Fact label="Manufacturing Reviewer">{selected.requiredStages.includes('Manufacturing') ? selected.manufacturingReviewer : 'Not required'}</Fact>
                  <Fact label="Client or Admin Approval">{selected.clientRequired ? selected.clientReviewer : 'Not required'}</Fact>
                </div>
              </section>
              <aside className="approvals-detail-side">
                <section className="card approvals-side-card">
                  <h4>Review progress</h4>
                  <div className="fact-grid">
                    <Fact label="Engineering Checklist">{selected.designChecklist.filter((item) => item.result === 'Pass').length}/{selected.designChecklist.length} passed</Fact>
                    <Fact label="Technical Checklist">{selected.technicalChecklist.filter((item) => item.result === 'Pass').length}/{selected.technicalChecklist.length} passed</Fact>
                    <Fact label="Attachments">{selected.attachments.length}</Fact>
                    <Fact label="Comments">{selected.comments.length}</Fact>
                  </div>
                  <div className="approvals-side-actions">
                    <Button variant="ghost" size="sm" icon={History} onClick={() => setHistoryTarget(selected)}>Decision History</Button>
                    {selected.attachments.length > 0 && <Button variant="ghost" size="sm" icon={Paperclip} onClick={() => setAttachmentsTarget(selected)}>Attachments</Button>}
                  </div>
                </section>
                <section className="card approvals-side-card">
                  <h4>Latest decision</h4>
                  <ApprovalTimeline history={selected.history || []} limit={3} compact />
                </section>
              </aside>
            </div>
          )}
        </>
      )}

      <Modal
        open={Boolean(attachmentsTarget)}
        onClose={() => setAttachmentsTarget(null)}
        title="Review Attachments"
        subtitle={attachmentsTarget?.id}
        maxWidth="max-w-lg"
        footer={<Button variant="ghost" onClick={() => setAttachmentsTarget(null)}>Close</Button>}
      >
        <ul className="approvals-attachments">
          {(attachmentsTarget?.attachments || []).map((attachment) => (
            <li key={attachment.name}>
              <Paperclip aria-hidden="true" />
              <div>
                <strong>{attachment.name}</strong>
                <span>{attachment.type} · {formatBytes(attachment.size)}</span>
              </div>
              <Button variant="ghost" size="sm" icon={Eye} onClick={() => { setAttachmentPreview(attachment); setAttachmentsTarget(null); }}>View</Button>
            </li>
          ))}
        </ul>
      </Modal>

      <AttachmentPreviewModal attachment={attachmentPreview} onClose={() => setAttachmentPreview(null)} />
      <RevisionDialog review={revisionTarget} onClose={() => setRevisionTarget(null)} />
      <HistoryDialog review={historyTarget} onClose={() => setHistoryTarget(null)} />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
