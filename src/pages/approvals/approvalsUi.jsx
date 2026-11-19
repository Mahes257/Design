import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Eye, FileText, X } from 'lucide-react';
import { Button, Modal, Select, StatusBadge, Textarea } from '../../components/common';
import {
  CHECKLIST_RESULTS,
  CHECKLIST_SEVERITIES,
  CLIENT_REVIEWERS,
  CLIENT_STAGE_LABEL,
  clientApprovalSummary,
  stageDisplayName,
  ENGINEERING_REVIEWERS,
  MANUFACTURING_REVIEWERS,
  reviewStatusTone,
  stageTone,
} from '../../data/approvalsData';
import { formatBytes } from '../../data/approvalsData';

export { Fact, Toast, useToast } from '../mechanical/mechanicalUi';
export { formatDate } from '../../data/projectData';

export function SectionNav({ sections, active, onChange, counts = {} }) {
  return (
    <div className="mech-domain-bar approvals-section-bar is-segmented">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={`mech-domain-chip${active === section.key ? ' is-active' : ''}`}
          onClick={() => onChange(section.key)}
        >
          {section.label}
          {counts[section.key] != null && <span>{counts[section.key]}</span>}
        </button>
      ))}
    </div>
  );
}

export const EMPTY_FILTERS = {
  projectId: 'All',
  reviewType: 'All',
  type: 'All',
  reviewer: 'All',
  stage: 'All',
  status: 'All',
};

export function useTable(rows, filterRow, initialSort = 'dueDate') {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => filterRow(row, filters, query));
  }, [rows, filters, search, filterRow]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((left, right) => {
      const a = String(left[sortKey] ?? '');
      const b = String(right[sortKey] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return list;
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${sorted.length ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(currentPage * pageSize, sorted.length)} of ${sorted.length}`;

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    filters,
    applyFilters: () => {
      setFilters(draftFilters);
      setPage(1);
      setFiltersOpen(false);
    },
    reset: () => {
      setSearch('');
      setFilters(EMPTY_FILTERS);
      setDraftFilters(EMPTY_FILTERS);
      setPage(1);
    },
    sortKey,
    sortDirection,
    toggleSort: (key) => {
      if (sortKey === key) setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
      else {
        setSortKey(key);
        setSortDirection('asc');
      }
    },
    page,
    setPage,
    pageSize,
    setPageSize,
    pageRows,
    sorted,
    pageInfo,
  };
}

export function ApprovalFilters({ table, projects, reviewers, stages, statuses, reviewTypes = [] }) {
  if (!table.filtersOpen) return null;
  const update = (key, value) => table.setDraftFilters((previous) => ({ ...previous, [key]: value }));
  return (
    <div className="approvals-filter-panel">
      <div className="approvals-filter-grid">
        <Select
          id="approval-filter-project"
          label="Project"
          options={[{ value: 'All', label: 'All Projects' }, ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]}
          value={table.draftFilters.projectId}
          onChange={(event) => update('projectId', event.target.value)}
        />
        {reviewTypes.length > 0 && (
          <Select
            id="approval-filter-review-type"
            label="Review Type"
            options={[{ value: 'All', label: 'All Review Types' }, ...reviewTypes.map((value) => ({ value, label: value }))]}
            value={table.draftFilters.reviewType || 'All'}
            onChange={(event) => update('reviewType', event.target.value)}
          />
        )}
        <Select
          id="approval-filter-type"
          label="Deliverable Type"
          options={[{ value: 'All', label: 'All Types' }, ...['Engineering Drawing', 'Engineering BOM', 'Design Package', 'Engineering Analysis'].map((value) => ({ value, label: value }))]}
          value={table.draftFilters.type}
          onChange={(event) => update('type', event.target.value)}
        />
        <Select
          id="approval-filter-reviewer"
          label="Reviewer"
          options={[{ value: 'All', label: 'All Reviewers' }, ...reviewers.map((value) => ({ value, label: value }))]}
          value={table.draftFilters.reviewer}
          onChange={(event) => update('reviewer', event.target.value)}
        />
        <Select
          id="approval-filter-stage"
          label="Current Stage"
          options={[{ value: 'All', label: 'All Stages' }, ...stages.map((value) => ({ value, label: value }))]}
          value={table.draftFilters.stage}
          onChange={(event) => update('stage', event.target.value)}
        />
        <Select
          id="approval-filter-status"
          label="Status"
          options={[{ value: 'All', label: 'All Statuses' }, ...statuses.map((value) => ({ value, label: value }))]}
          value={table.draftFilters.status}
          onChange={(event) => update('status', event.target.value)}
        />
        <div className="filter-actions">
          <Button onClick={table.applyFilters}>Apply Filters</Button>
          <Button variant="ghost" onClick={table.reset}>Reset</Button>
        </div>
      </div>
    </div>
  );
}

export function StageBadge({ status }) {
  return <StatusBadge status={status} tone={stageTone(status)} />;
}

export function ReviewStatus({ status }) {
  return <StatusBadge status={status} tone={reviewStatusTone(status)} />;
}

export function ChecklistEditor({ items = [], onUpdate, ariaLabel = 'Review checklist' }) {
  if (!items.length) return <p className="cell-muted">No checklist items recorded.</p>;
  return (
    <div className="approvals-checklist">
      {items.map((item) => (
        <div key={item.id} className="approvals-check-row">
          <div className="approvals-check-main">
            {item.category && <span className="approvals-count-chip">{item.category}</span>}
            <strong>{item.item}</strong>
            <span>{item.requirement}</span>
            {item.evidence && <span className="approvals-evidence">{item.evidence}</span>}
          </div>
          <div className="approvals-check-meta">
            <Select
              id={`${ariaLabel}-${item.id}-result`}
              options={CHECKLIST_RESULTS.map((value) => ({ value, label: value }))}
              value={item.result}
              onChange={(event) => onUpdate(item, { result: event.target.value })}
              aria-label={`${item.item} result`}
            />
            <Select
              id={`${ariaLabel}-${item.id}-severity`}
              options={CHECKLIST_SEVERITIES.map((value) => ({ value, label: value === '—' ? 'Severity —' : value }))}
              value={item.severity || '—'}
              onChange={(event) => onUpdate(item, { severity: event.target.value })}
              aria-label={`${item.item} severity`}
            />
            <Select
              id={`${ariaLabel}-${item.id}-reviewer`}
              options={[...new Set([...ENGINEERING_REVIEWERS, ...MANUFACTURING_REVIEWERS, ...CLIENT_REVIEWERS])].map((value) => ({ value, label: value }))}
              value={item.reviewer}
              onChange={(event) => onUpdate(item, { reviewer: event.target.value })}
              aria-label={`${item.item} reviewer`}
            />
            <input
              className="form-input approvals-check-comment"
              placeholder="Reviewer observation"
              value={item.observation || ''}
              onChange={(event) => onUpdate(item, { observation: event.target.value })}
              aria-label={`${item.item} observation`}
            />
            <input
              className="form-input approvals-check-comment"
              placeholder="Comments"
              value={item.comments || ''}
              onChange={(event) => onUpdate(item, { comments: event.target.value })}
              aria-label={`${item.item} comments`}
            />
            <input
              className="form-input"
              placeholder="Evidence / linked document"
              value={item.evidence || ''}
              onChange={(event) => onUpdate(item, { evidence: event.target.value })}
              aria-label={`${item.item} evidence`}
            />
            <input
              className="form-input"
              placeholder="Corrective action"
              value={item.correctiveAction || ''}
              onChange={(event) => onUpdate(item, { correctiveAction: event.target.value })}
              aria-label={`${item.item} corrective action`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApprovalTimeline({ history = [], limit, compact = false }) {
  const entries = limit ? history.slice(-limit) : history;
  if (!entries.length) return <p className="cell-muted">No approval activity recorded.</p>;
  return (
    <ul className={`approvals-timeline${compact ? ' is-compact' : ''}`}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="approvals-timeline-dot" aria-hidden="true" />
          <div>
            <div className="approvals-timeline-head">
              <strong>{entry.action}</strong>
              <span>{entry.at}</span>
            </div>
            <span className="approvals-timeline-stage">{stageDisplayName(entry.stage)} · {entry.by} · {entry.role}</span>
            <p>{entry.previousStatus} → {entry.newStatus}{entry.comments ? ` · ${entry.comments}` : ''}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DecisionDialog({
  open,
  onClose,
  title,
  subtitle,
  actions,
  defaultDecision,
  reviewerLabel = 'Reviewer',
  reviewerOptions = ENGINEERING_REVIEWERS,
  defaultReviewer,
  onSubmit,
  children,
}) {
  const [decision, setDecision] = useState(defaultDecision || actions?.[0]?.value || 'Approve');
  const [reviewer, setReviewer] = useState(defaultReviewer || reviewerOptions[0] || '');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDecision(defaultDecision || actions?.[0]?.value || 'Approve');
    setReviewer(defaultReviewer || reviewerOptions[0] || '');
    setComments('');
    setError('');
  }, [open, defaultDecision, defaultReviewer, reviewerOptions, actions]);

  const reset = () => {
    setDecision(defaultDecision || actions?.[0]?.value || 'Approve');
    setReviewer(defaultReviewer || reviewerOptions[0] || '');
    setComments('');
    setError('');
  };

  const close = () => {
    reset();
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            icon={decision === 'Reject' ? X : CheckCircle2}
            onClick={() => {
              if (decision !== 'Approve' && !comments.trim()) {
                setError('Comments are required for this decision.');
                return;
              }
              const result = onSubmit?.({ decision, reviewer, comments, requestedChanges: comments });
              if (result?.error) {
                setError(result.error);
                return;
              }
              close();
            }}
          >
            Record Decision
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          label="Decision"
          id="approval-decision"
          options={actions}
          value={decision}
          onChange={(event) => { setDecision(event.target.value); setError(''); }}
        />
        <Select
          label={reviewerLabel}
          id="approval-decision-reviewer"
          options={reviewerOptions.map((value) => ({ value, label: value }))}
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
        />
        {children}
        <Textarea
          label={decision === 'Approve' ? 'Approval Comments' : 'Reason / Requested Changes (required)'}
          id="approval-decision-comments"
          rows={4}
          value={comments}
          onChange={(event) => { setComments(event.target.value); setError(''); }}
          placeholder={decision === 'Approve' ? 'Optional approval note.' : 'Explain the rejection reason or the changes required before resubmission.'}
          className="span-2"
        />
        <p className="approvals-note span-2">This decision is recorded locally for the demo. It is not a backend authorization or a legally binding approval.</p>
        {error && <p className="form-error span-2" role="alert"><AlertTriangle aria-hidden="true" /> {error}</p>}
      </div>
    </Modal>
  );
}

export function CommentDialog({ open, onClose, stage, onSubmit, defaultAuthor = 'N. Joshi', defaultRole = 'Engineering Reviewer', checklistItems = [] }) {
  const [author, setAuthor] = useState(defaultAuthor);
  const [role, setRole] = useState(defaultRole);
  const [text, setText] = useState('');
  const [checklistItem, setChecklistItem] = useState('');
  const [attachment, setAttachment] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setText('');
    setError('');
    setAttachment('');
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Review Comment"
      subtitle={stage}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            onClick={() => {
              if (!text.trim()) {
                setError('Write a comment before saving.');
                return;
              }
              const result = onSubmit({ text, author, role, stage, checklistItem, attachment });
              if (result?.error) setError(result.error);
              else close();
            }}
          >
            Save Comment
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select label="Author" id="comment-author" options={[...new Set([...ENGINEERING_REVIEWERS, ...CLIENT_REVIEWERS, 'R. Kulkarni', 'D. Rao', 'V. Sharma'])].map((value) => ({ value, label: value }))} value={author} onChange={(event) => setAuthor(event.target.value)} />
        <Select
          label="Reviewer Role"
          id="comment-role"
          options={['Engineering Reviewer', 'Manufacturing Reviewer', 'Client Reviewer', 'Design Engineer', 'Design Authority'].map((value) => ({ value, label: value }))}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        {checklistItems.length > 0 && (
          <Select
            label="Related Checklist Item"
            id="comment-checklist"
            className="span-2"
            options={[{ value: '', label: 'No checklist item' }, ...checklistItems.map((item) => ({ value: item.item, label: item.item }))]}
            value={checklistItem}
            onChange={(event) => setChecklistItem(event.target.value)}
          />
        )}
        <Textarea label="Comment" id="comment-text" className="span-2" rows={4} value={text} onChange={(event) => { setText(event.target.value); setError(''); }} placeholder="Record the engineering, manufacturing or client review comment." />
        <div className="form-field span-2">
          <label className="form-label" htmlFor="comment-attachment">Attachment Reference</label>
          <input id="comment-attachment" className="form-input" value={attachment} onChange={(event) => setAttachment(event.target.value)} placeholder="Optional reference, e.g. CMT-EVIDENCE-02.pdf" />
        </div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp']);

export function AttachmentPreviewModal({ attachment, onClose }) {
  const ext = String(attachment?.name || '').split('.').pop()?.toLowerCase();
  const previewable = Boolean(attachment?.assetPath) && (ext === 'svg' || ext === 'pdf' || IMAGE_TYPES.has(ext));
  return (
    <Modal
      open={Boolean(attachment)}
      onClose={onClose}
      title="Attachment"
      subtitle={attachment?.name}
      maxWidth="max-w-2xl"
      footer={
        attachment?.assetPath ? (
          <Button
            icon={Download}
            onClick={() => {
              const anchor = document.createElement('a');
              anchor.href = attachment.assetPath;
              anchor.download = attachment.name;
              document.body.appendChild(anchor);
              anchor.click();
              document.body.removeChild(anchor);
            }}
          >
            Download
          </Button>
        ) : <Button variant="ghost" onClick={onClose}>Close</Button>
      }
    >
      {attachment && (
        <>
          <div className="fact-grid">
            <div className="fact"><span className="fact-label">File name</span><span className="fact-value">{attachment.name}</span></div>
            <div className="fact"><span className="fact-label">Type</span><span className="fact-value">{attachment.type || ext?.toUpperCase()}</span></div>
            <div className="fact"><span className="fact-label">Size</span><span className="fact-value">{formatBytes(attachment.size)}</span></div>
          </div>
          {ext === 'svg' && previewable && <div className="approvals-attachment-preview"><img src={attachment.assetPath} alt={attachment.name} /></div>}
          {IMAGE_TYPES.has(ext) && previewable && <div className="approvals-attachment-preview"><img src={attachment.assetPath} alt={attachment.name} /></div>}
          {ext === 'pdf' && previewable && <div className="approvals-attachment-preview is-pdf"><iframe title={attachment.name} src={attachment.assetPath} /></div>}
          {!previewable && (
            <div className="approvals-attachment-note">
              <FileText aria-hidden="true" />
              <div>
                <strong>No in-browser preview attached</strong>
                <p>This mock attachment has metadata only. It is not replaced with a fabricated preview image.</p>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export function RevisionDialog({ review, onClose }) {
  return (
    <Modal
      open={Boolean(review)}
      onClose={onClose}
      title="Submitted Revision"
      subtitle={review ? `${review.deliverableNumber} · Rev ${review.revision}` : ''}
      maxWidth="max-w-xl"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {review && (
        <>
          <div className="fact-grid">
            <div className="fact"><span className="fact-label">Review ID</span><span className="fact-value">{review.id}</span></div>
            <div className="fact"><span className="fact-label">Deliverable</span><span className="fact-value">{review.deliverableName}</span></div>
            <div className="fact"><span className="fact-label">Deliverable No.</span><span className="fact-value">{review.deliverableNumber}</span></div>
            <div className="fact"><span className="fact-label">Exact revision</span><span className="fact-value">Rev {review.revision}</span></div>
            <div className="fact"><span className="fact-label">Submitted by</span><span className="fact-value">{review.submittedBy}</span></div>
            <div className="fact"><span className="fact-label">Submitted</span><span className="fact-value">{review.submittedAt || 'Draft not submitted'}</span></div>
            <div className="fact"><span className="fact-label">Priority</span><span className="fact-value">{review.priority}</span></div>
            <div className="fact"><span className="fact-label">Current status</span><span className="fact-value"><ReviewStatus status={review.status} /></span></div>
            <div className="fact"><span className="fact-label">Revision date</span><span className="fact-value">{review.submittedAt || '—'}</span></div>
            <div className="fact"><span className="fact-label">Change note</span><span className="fact-value">{review.submissionNotes || 'No submission notes recorded.'}</span></div>
          </div>
          <div className="approvals-note-block">
            <Eye aria-hidden="true" />
            <p>This panel identifies the exact submitted revision. Earlier approvals never carry forward automatically to a new revision.</p>
          </div>
        </>
      )}
    </Modal>
  );
}

export function HistoryDialog({ review, onClose }) {
  return (
    <Modal
      open={Boolean(review)}
      onClose={onClose}
      title="Review History"
      subtitle={review ? `${review.id} · ${review.deliverableNumber} Rev ${review.revision}` : ''}
      maxWidth="max-w-2xl"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {review && <ApprovalTimeline history={review.history || []} />}
    </Modal>
  );
}

export function WorkflowTrack({ review }) {
  if (!review) return null;
  const stages = review.requiredStages || [];
  const steps = [
    { key: 'Engineering', label: 'Engineering', status: review.stageStates?.engineering?.status },
    { key: 'Manufacturing', label: 'Manufacturing', status: stages.includes('Manufacturing') ? review.stageStates?.manufacturing?.status : 'Not Required' },
    { key: 'Client', label: CLIENT_STAGE_LABEL, status: review.clientRequired ? (review.stageStates?.client?.status === 'Approved' ? clientApprovalSummary(review) : review.stageStates?.client?.status) : 'Not Required' },
    { key: 'Final', label: 'Final Approval', status: review.finalApproval?.decision || (review.status === 'Ready for Final Approval' ? 'Pending' : 'Not Ready') },
    { key: 'Release', label: 'Release', status: review.release ? 'Released' : review.status },
  ];
  return (
    <div className="approvals-track">
      {steps.map((step, index) => (
        <div key={step.key} className={`approvals-track-step${step.status === 'Approved' || step.status === 'Released' ? ' is-done' : ''}${step.status === 'Not Required' ? ' is-skipped' : ''}`}>
          <span className="approvals-track-index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{step.label}</strong>
            <span>{step.status || 'Pending'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
