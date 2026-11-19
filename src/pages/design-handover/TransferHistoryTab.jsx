import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import {
  Button,
  DataTable,
  Modal,
  SearchInput,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { formatHandoverDate } from '../../data/designHandoverData';

export default function TransferHistoryTab() {
  const navigate = useNavigate();
  const { transfers, retryTransfer } = useDesignHandover();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [retryTarget, setRetryTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      if (status !== 'All' && transfer.status !== status) return false;
      if (!term) return true;
      return [
        transfer.id,
        transfer.handoverNumber,
        transfer.projectId,
        transfer.projectName,
        transfer.designId,
        transfer.designName,
        transfer.packageId,
        transfer.preparedBy,
        transfer.status,
        transfer.method,
        transfer.destinationReference,
      ].join(' ').toLowerCase().includes(term);
    });
  }, [transfers, search, status]);

  const columns = [
    { key: 'id', label: 'Attempt / Handover', render: (row) => <span><strong>{row.id}</strong><span className="cell-sub">{row.handoverNumber}</span></span> },
    { key: 'project', label: 'Project', render: (row) => <span><strong>{row.projectId}</strong><span className="cell-sub">{row.projectName}</span></span> },
    { key: 'design', label: 'Design / Released revision', render: (row) => <span><strong>{row.designId}</strong><span className="cell-sub">Rev {row.designRevision} · {row.designName}</span></span> },
    { key: 'package', label: 'Package', render: (row) => `${row.packageId} v${row.packageVersion}` },
    { key: 'method', label: 'Transfer method', render: (row) => <span className="dh-evidence-cell">{row.method}</span> },
    { key: 'status', label: 'Transfer status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'prepared', label: 'Prepared by / date', render: (row) => <span>{row.preparedBy}<span className="cell-sub">{formatHandoverDate(row.preparedDate)}</span></span> },
    { key: 'exportDate', label: 'Actual export date', render: (row) => row.exportDate ? formatHandoverDate(row.exportDate) : '—' },
    { key: 'actualTransferDate', label: 'Actual transfer date', render: (row) => row.actualTransferDate ? formatHandoverDate(row.actualTransferDate) : 'Not verified' },
    { key: 'destination', label: 'Destination reference', render: (row) => row.destinationReference || '—' },
    { key: 'remarks', label: 'Failure / pending reason', render: (row) => <span className="dh-evidence-cell">{row.remarks || '—'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="dh-row-actions">
          <button type="button" className="icon-btn" title="Open handover" aria-label={`Open ${row.handoverNumber}`} onClick={() => navigate(`/design-handover/${row.handoverNumber}`)}>
            <span aria-hidden="true">↗</span>
          </button>
          <button type="button" className="icon-btn" title="Retry export" aria-label={`Retry ${row.id}`} onClick={() => setRetryTarget(row)}>
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  const handleRetry = () => {
    const result = retryTransfer(retryTarget.id);
    setRetryTarget(null);
    if (result.error) {
      setFeedback({ tone: 'error', text: result.error });
      return;
    }
    setFeedback({ tone: 'success', text: `${result.transfer.id} added. The previous attempt ${retryTarget.id} remains unchanged in the audit history.` });
  };

  return (
    <div className="dh-tab-stack">
      <div className="dh-section-heading">
        <div>
          <h2>Transfer History</h2>
          <p>Permanent audit register of every manual export, pending handover and failed attempt. No verified direct ERP transfer is claimed.</p>
        </div>
      </div>

      {feedback && <div className={`dh-feedback is-${feedback.tone}`} role="status">{feedback.text}</div>}

      <Toolbar
        left={
          <select className="form-select dh-filter" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter transfer status">
            {['All', 'Ready for Export', 'Integration Pending', 'Export Failed'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        }
        right={<SearchInput value={search} onChange={setSearch} placeholder="Search attempt, handover, project…" />}
        count={`${rows.length} attempt${rows.length === 1 ? '' : 's'}`}
      />

      <DataTable
        columns={columns}
        rows={rows}
        ariaLabel="Design to Production transfer history"
        onRowClick={(row) => navigate(`/design-handover/${row.handoverNumber}`)}
        emptyContent={<div className="dh-empty-cell"><strong>No transfer attempts yet.</strong><span>Download a released package manifest or record a manual handover attempt.</span></div>}
      />

      <Modal
        open={Boolean(retryTarget)}
        onClose={() => setRetryTarget(null)}
        title="Retry export attempt"
        subtitle={retryTarget ? `${retryTarget.id} · ${retryTarget.handoverNumber}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRetryTarget(null)}>Cancel</Button>
            <Button icon={RotateCcw} onClick={handleRetry}>Confirm Retry</Button>
          </>
        }
      >
        <p className="dh-modal-copy">
          A retry generates a fresh manifest and creates a new transfer attempt. The previous row is preserved unchanged.
          The resulting status remains manual — <strong>Ready for Export</strong> — and is not a verified ERP transfer.
        </p>
      </Modal>
    </div>
  );
}
