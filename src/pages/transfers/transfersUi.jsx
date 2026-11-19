import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Info,
  MessageSquarePlus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button, Modal, Select, StatusBadge, Textarea } from '../../components/common';
import { ACK_STATUSES, DESTINATIONS, formatBytes, transferStatusTone } from '../../data/transfersData';

export { Fact, Toast, useToast } from '../mechanical/mechanicalUi';
export { formatDate } from '../../data/projectData';
export { formatBytes } from '../../data/transfersData';

export function SectionNav({ sections, active, onChange, counts = {} }) {
  return (
    <div className="mech-domain-bar transfers-section-bar">
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

export function TransferStatus({ status }) {
  return <StatusBadge status={status} tone={transferStatusTone(status)} />;
}

export function ResultBadge({ result }) {
  return <StatusBadge status={result} tone={transferStatusTone(result)} />;
}

export function DestinationBadges({ destinations = [], compact = false }) {
  return (
    <span className={`transfers-destinations${compact ? ' is-compact' : ''}`}>
      {DESTINATIONS.map((destination) =>
        destinations.includes(destination) ? (
          <span key={destination} className={`transfers-destination is-${destination.toLowerCase()}`}>
            {destination}
          </span>
        ) : null,
      )}
      {!destinations.length && <span className="cell-muted">—</span>}
    </span>
  );
}

export function useTransferTable(rows, filterRow, { initialSort = 'transferDate', initialFilters = {} } = {}) {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState('desc');
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
    setSearch: (value) => {
      setSearch(value);
      setPage(1);
    },
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    filters,
    setFilters: (next) => {
      setFilters(next);
      setPage(1);
    },
    applyFilters: () => {
      setFilters(draftFilters);
      setFiltersOpen(false);
      setPage(1);
    },
    reset: () => {
      setSearch('');
      setFilters(initialFilters);
      setDraftFilters(initialFilters);
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
    page: currentPage,
    setPage,
    pageSize,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
    pageRows,
    sorted,
    pageInfo,
  };
}

export function ValidationResults({ validation, compact = false }) {
  if (!validation) {
    return (
      <div className="transfers-validation-empty">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Transfer not validated</strong>
          <p>Run the common and destination-specific checks before preparing a handover.</p>
        </div>
      </div>
    );
  }
  const results = validation.results || [];
  const counts = {
    valid: results.filter((row) => row.result === 'Valid').length,
    invalid: results.filter((row) => row.result === 'Invalid').length,
    warning: results.filter((row) => row.result === 'Warning').length,
    na: results.filter((row) => row.result === 'Not Applicable').length,
  };

  return (
    <div className={`transfers-validation${compact ? ' is-compact' : ''}`}>
      <div className="transfers-validation-head">
        <div>
          <strong>Validation results</strong>
          <span>
            Checked {validation.checkedAt} by {validation.checkedBy}
          </span>
        </div>
        <div className="transfers-validation-counts">
          <span className="is-valid">{counts.valid} valid</span>
          <span className="is-warning">{counts.warning} warning</span>
          <span className={counts.invalid ? 'is-invalid' : ''}>{counts.invalid} invalid</span>
          <span>{counts.na} N/A</span>
        </div>
      </div>
      <div className="transfers-validation-list">
        {results.map((row) => (
          <div key={row.key} className={`transfers-validation-row is-${row.result.toLowerCase().replaceAll(' ', '-')}`}>
            <span className="transfers-validation-icon" aria-hidden="true">
              {row.result === 'Valid' ? <CheckCircle2 /> : row.result === 'Invalid' ? <X /> : row.result === 'Warning' ? <AlertTriangle /> : <Info />}
            </span>
            <div className="transfers-validation-copy">
              <strong>
                {row.label}
                {row.mandatory && <span className="transfers-mandatory">Mandatory</span>}
              </strong>
              <span>{row.note}</span>
            </div>
            <span className="transfers-validation-scope">{row.scope}</span>
            <ResultBadge result={row.result} />
          </div>
        ))}
      </div>
      {counts.invalid > 0 && (
        <p className="transfers-validation-stop" role="alert">
          <AlertTriangle aria-hidden="true" /> Mandatory failures block the affected destination. Correct the source release or transfer contents before handover.
        </p>
      )}
    </div>
  );
}

export function TransferTimeline({ history = [], limit }) {
  const entries = limit ? history.slice(-limit) : history;
  if (!entries.length) return <p className="cell-muted">No transfer activity recorded.</p>;
  return (
    <ul className="approvals-timeline transfers-timeline">
      {[...entries].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="approvals-timeline-dot" aria-hidden="true" />
          <div>
            <div className="approvals-timeline-head">
              <strong>{entry.action}</strong>
              <span>{entry.at?.replace('T', ' ')}</span>
            </div>
            <span className="approvals-timeline-stage">
              {entry.stage} · {entry.by} · {entry.role}
            </span>
            <p>
              {entry.previousStatus || 'New'} → {entry.newStatus || '—'}
              {entry.comments ? ` · ${entry.comments}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CommentsPanel({ comments = [], empty = 'No transfer comments recorded.' }) {
  if (!comments.length) return <p className="cell-muted">{empty}</p>;
  return (
    <div className="transfers-comments">
      {comments.map((comment) => (
        <article key={comment.id} className="transfers-comment">
          <header>
            <strong>{comment.author}</strong>
            <span>{comment.role} · {comment.at?.replace('T', ' ')}</span>
            {comment.stage && <span className="approvals-stage-chip">{comment.stage}</span>}
          </header>
          <p>{comment.text}</p>
          {comment.attachment && <span className="transfers-comment-file"><FileText aria-hidden="true" /> {comment.attachment}</span>}
        </article>
      ))}
    </div>
  );
}

const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp']);

export function AttachmentDialog({ attachment, onClose }) {
  const ext = String(attachment?.name || '').split('.').pop()?.toLowerCase();
  const previewable = Boolean(attachment?.assetPath) && (ext === 'svg' || ext === 'pdf' || IMAGE_TYPES.has(ext));
  return (
    <Modal
      open={Boolean(attachment)}
      onClose={onClose}
      title="Transfer attachment"
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
        ) : (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        )
      }
    >
      {attachment && (
        <>
          <div className="fact-grid">
            <div className="fact"><span className="fact-label">File name</span><span className="fact-value">{attachment.name}</span></div>
            <div className="fact"><span className="fact-label">Type</span><span className="fact-value">{attachment.type || ext?.toUpperCase()}</span></div>
            <div className="fact"><span className="fact-label">Size</span><span className="fact-value">{formatBytes(attachment.size)}</span></div>
          </div>
          {ext === 'pdf' && previewable && <div className="approvals-attachment-preview is-pdf"><iframe title={attachment.name} src={attachment.assetPath} /></div>}
          {ext === 'svg' && previewable && <div className="approvals-attachment-preview"><img src={attachment.assetPath} alt={attachment.name} /></div>}
          {IMAGE_TYPES.has(ext) && previewable && <div className="approvals-attachment-preview"><img src={attachment.assetPath} alt={attachment.name} /></div>}
          {!previewable && (
            <div className="approvals-attachment-note">
              <FileText aria-hidden="true" />
              <div>
                <strong>Metadata only</strong>
                <p>This local transfer fixture does not include an in-browser file. No fabricated preview is shown.</p>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export function HandoverDialog({ open, onClose, transfer, destination, onSubmit }) {
  const side = destination === 'Purchase' ? transfer?.purchase : transfer?.production;
  const [owner, setOwner] = useState('');
  const [date, setDate] = useState('');
  const [preparedBy, setPreparedBy] = useState('N. Joshi');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setOwner('');
    setDate('');
    setNotes('');
    setError('');
    onClose?.();
  };

  if (!transfer) return null;
  const defaultOwner = destination === 'Purchase' ? 'Purchase — Sourcing cell' : 'Production — Assembly bay';

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Prepare ${destination} Handover`}
      subtitle={`${transfer.id} · ${transfer.deliverableNumber} Rev ${transfer.revision}`}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            icon={ShieldCheck}
            onClick={() => {
              const resolvedOwner = owner || defaultOwner;
              if (!resolvedOwner) {
                setError('Select or enter the receiving owner.');
                return;
              }
              const result = onSubmit?.({ owner: resolvedOwner, date: date || undefined, preparedBy, notes });
              if (result?.error) setError(result.error);
              else close();
            }}
          >
            Record Handover
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          id="transfer-handover-owner"
          label={`${destination} owner`}
          options={(destination === 'Purchase'
            ? ['Purchase — Sourcing cell', 'Purchase — Procurement desk', 'Purchase — Vendor development']
            : ['Production — Assembly bay', 'Production — Fabrication shop', 'Production — Machining cell']
          ).map((value) => ({ value, label: value }))}
          value={owner || defaultOwner}
          onChange={(event) => setOwner(event.target.value)}
        />
        <Select
          id="transfer-handover-prepared"
          label="Prepared by"
          options={['N. Joshi', 'R. Kulkarni', 'A. Iyer', 'K. Pillai'].map((value) => ({ value, label: value }))}
          value={preparedBy}
          onChange={(event) => setPreparedBy(event.target.value)}
        />
        <div className="form-field">
          <label className="form-label" htmlFor="transfer-handover-date">Handover date</label>
          <input id="transfer-handover-date" className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="form-field span-2">
          <label className="form-label" htmlFor="transfer-handover-notes">Handover notes</label>
          <textarea id="transfer-handover-notes" className="form-input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Receiving owner, package/requisition references and any controlled-copy instructions." />
        </div>
        <div className="approvals-note-block span-2">
          <Info aria-hidden="true" />
          <p>
            This creates a local mock {destination.toLowerCase()} handover reference only. No ERP purchase requisition, purchase order or production order is created.
          </p>
        </div>
        {side?.handover && <p className="form-error span-2" role="alert">A handover is already recorded: {side.handover.id}. Record the acknowledgement instead.</p>}
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function AcknowledgementDialog({ open, onClose, transfer, destination, onSubmit }) {
  const side = destination === 'Purchase' ? transfer?.purchase : transfer?.production;
  const [status, setStatus] = useState('Acknowledged');
  const [owner, setOwner] = useState('');
  const [date, setDate] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setStatus('Acknowledged');
    setComments('');
    setError('');
    onClose?.();
  };

  if (!transfer) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={`${destination} Acknowledgement`}
      subtitle={`${transfer.id} · ${side?.handover?.id || 'No handover'}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            icon={CheckCircle2}
            onClick={() => {
              if (status !== 'Acknowledged' && !comments.trim()) {
                setError('Comments are required for a remark, rejection or hold.');
                return;
              }
              const result = onSubmit?.({ status, owner: owner || side?.handover?.owner, date: date || undefined, comments });
              if (result?.error) setError(result.error);
              else close();
            }}
          >
            Record Mock Acknowledgement
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          id={`${destination}-ack-status`}
          label="Acknowledgement status"
          options={ACK_STATUSES.map((value) => ({ value, label: value }))}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setError('');
          }}
        />
        <Select
          id={`${destination}-ack-owner`}
          label={`${destination} owner`}
          options={[side?.handover?.owner, 'N. Joshi', 'V. Sharma', 'A. Iyer'].filter(Boolean).map((value) => ({ value, label: value }))}
          value={owner || side?.handover?.owner || ''}
          onChange={(event) => setOwner(event.target.value)}
        />
        <div className="form-field">
          <label className="form-label" htmlFor={`${destination}-ack-date`}>Acknowledgement date</label>
          <input id={`${destination}-ack-date`} className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <Textarea
          id={`${destination}-ack-comments`}
          label={status === 'Acknowledged' ? 'Comments (optional)' : 'Reason / remarks (required)'}
          className="span-2"
          rows={3}
          value={comments}
          onChange={(event) => {
            setComments(event.target.value);
            setError('');
          }}
          placeholder={status === 'Acknowledged' ? 'Optional receiving note.' : 'Explain the remark, rejection or hold.'}
        />
        <div className="approvals-note-block span-2">
          <Info aria-hidden="true" />
          <p>
            Acknowledgement is recorded locally against the {destination.toLowerCase()} handover only. It does not acknowledge the other destination and does not represent an actual ERP transaction.
          </p>
        </div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function CommentDialog({ open, onClose, transfer, onSubmit }) {
  const [stage, setStage] = useState('General');
  const [author, setAuthor] = useState('N. Joshi');
  const [role, setRole] = useState('Transfer Coordinator');
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setText('');
    setAttachment('');
    setError('');
    onClose?.();
  };

  if (!transfer) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Transfer Comment"
      subtitle={`${transfer.id} · ${transfer.deliverableNumber} Rev ${transfer.revision}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button
            icon={MessageSquarePlus}
            onClick={() => {
              if (!text.trim()) {
                setError('Write a comment before saving.');
                return;
              }
              const result = onSubmit?.({ stage, author, role, text, attachment });
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
        <Select
          id="transfer-comment-stage"
          label="Related area"
          options={['General', 'Purchase', 'Production', 'Validation', 'Handover'].map((value) => ({ value, label: value }))}
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        />
        <Select
          id="transfer-comment-role"
          label="Role"
          options={['Transfer Coordinator', 'Design Engineer', 'Design Authority', 'Purchase Owner', 'Production Owner'].map((value) => ({ value, label: value }))}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <Select
          id="transfer-comment-author"
          label="Author"
          options={['N. Joshi', 'R. Kulkarni', 'A. Iyer', 'S. Menon', 'V. Sharma', 'P. Deshmukh', 'K. Pillai'].map((value) => ({ value, label: value }))}
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
        <div className="form-field">
          <label className="form-label" htmlFor="transfer-comment-attachment">Attachment reference</label>
          <input id="transfer-comment-attachment" className="form-input" value={attachment} onChange={(event) => setAttachment(event.target.value)} placeholder="e.g. HANDOVER-NOTE-02.pdf" />
        </div>
        <Textarea
          id="transfer-comment-text"
          label="Comment"
          className="span-2"
          rows={4}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          placeholder="Record the transfer, validation, handover or revision note."
        />
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function CancelDialog({ open, onClose, transfer, onSubmit }) {
  const [reason, setReason] = useState('');
  const [by, setBy] = useState('N. Joshi');
  const [error, setError] = useState('');

  const close = () => {
    setReason('');
    setError('');
    onClose?.();
  };

  if (!transfer) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Cancel Transfer"
      subtitle={`${transfer.id} · ${transfer.deliverableNumber} Rev ${transfer.revision}`}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Keep Transfer</Button>
          <Button
            variant="danger"
            icon={X}
            onClick={() => {
              if (!reason.trim()) {
                setError('A cancellation reason is required.');
                return;
              }
              const result = onSubmit?.({ reason, by });
              if (result?.error) setError(result.error);
              else close();
            }}
          >
            Cancel Transfer
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          id="transfer-cancel-by"
          label="Recorded by"
          options={['N. Joshi', 'R. Kulkarni', 'A. Iyer', 'K. Pillai'].map((value) => ({ value, label: value }))}
          value={by}
          onChange={(event) => setBy(event.target.value)}
        />
        <Textarea
          id="transfer-cancel-reason"
          label="Cancellation reason (required)"
          className="span-2"
          rows={4}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError('');
          }}
          placeholder="Explain why the transfer is cancelled. The source release and all history are retained."
        />
        <p className="approvals-note span-2">Cancelling does not delete the transfer, source release or prior handover information. It remains in transfer history.</p>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function DetailItem({ label, children }) {
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{children || '—'}</span>
    </div>
  );
}

export function ActionIconLabel({ children }) {
  return <span className="transfers-action-label"><Eye aria-hidden="true" /> {children}</span>;
}
