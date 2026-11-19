import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Download, FileJson, Send, ShieldAlert } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  Modal,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { useProjects } from '../../context/ProjectsContext';
import { useMechanical } from '../../context/MechanicalContext';
import { TRANSFER_METHODS, formatHandoverDate } from '../../data/designHandoverData';
import { HandoverSelector, NoHandovers } from './designHandoverUi';

export default function SendToProductionTab() {
  const navigate = useNavigate();
  const { handovers, getPackage, getRelease, transfersFor, exportManifest, recordManualTransfer } = useDesignHandover();
  const { projects } = useProjects();
  const { designs } = useMechanical();
  const [handoverId, setHandoverId] = useState(handovers[0]?.id || '');
  const [method, setMethod] = useState(TRANSFER_METHODS[1]);
  const [preparedBy, setPreparedBy] = useState('Design Admin');
  const [destinationReference, setDestinationReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [confirmExport, setConfirmExport] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (handoverId && handovers.some((row) => row.id === handoverId)) return;
    setHandoverId(handovers[0]?.id || '');
  }, [handovers, handoverId]);

  const handover = handovers.find((row) => row.id === handoverId) || null;
  const packageRecord = handover ? getPackage(handover.id) : null;
  const release = handover ? getRelease(handover.id) : null;
  const attempts = handover ? transfersFor(handover.id) : [];
  const project = projects.find((row) => row.id === handover?.projectId);
  const design = designs.find((row) => row.id === handover?.designId);

  const attemptColumns = useMemo(() => [
    { key: 'id', label: 'Attempt', render: (row) => <span className="cell-strong">{row.id}</span> },
    { key: 'method', label: 'Method', render: (row) => row.method },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'prepared', label: 'Prepared', render: (row) => <span>{row.preparedBy}<span className="cell-sub">{formatHandoverDate(row.preparedDate)}</span></span> },
    { key: 'export', label: 'Export date', render: (row) => row.exportDate ? formatHandoverDate(row.exportDate) : '—' },
    { key: 'destination', label: 'Destination ref.', render: (row) => row.destinationReference || '—' },
    { key: 'remarks', label: 'Remarks', render: (row) => <span className="dh-evidence-cell">{row.remarks || '—'}</span> },
  ], []);

  if (handovers.length === 0) {
    return <NoHandovers message="Create and release a handover before preparing the Production export." />;
  }

  const handleExport = () => {
    const result = exportManifest(handover.id, { preparedBy, download: true });
    setConfirmExport(false);
    if (result.error) {
      setFeedback({ tone: 'error', text: result.error });
      return;
    }
    setFeedback({ tone: 'success', text: `${result.transfer.id} recorded as Ready for Export. The JSON manifest was downloaded; this is not a verified ERP transfer.` });
  };

  const handleManualAttempt = (event) => {
    event.preventDefault();
    const result = recordManualTransfer(handover.id, { method, remarks, destinationReference, preparedBy });
    if (result.error) {
      setFeedback({ tone: 'error', text: result.error });
      return;
    }
    setFeedback({ tone: 'success', text: `${result.transfer.id} recorded as Integration Pending. No transfer-success status was claimed.` });
    setRemarks('');
  };

  return (
    <div className="dh-tab-stack">
      <div className="dh-section-heading">
        <div>
          <h2>Send to Production</h2>
          <p>Prepare a controlled manual handover manifest for the existing ERP Production module.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/design-handover/history')}>View Transfer History</Button>
      </div>

      <HandoverSelector handovers={handovers} value={handoverId} onChange={(id) => { setHandoverId(id); setFeedback(null); }} />
      {feedback && <div className={`dh-feedback is-${feedback.tone}`} role="status">{feedback.text}</div>}

      {!release ? (
        <div className="dh-blocked-panel">
          <ShieldAlert aria-hidden="true" />
          <div>
            <h3>Handover is not released</h3>
            <p>Only a controlled design release can prepare a Production handover. Current status: <StatusBadge status={handover.status} />.</p>
            <Button size="sm" variant="secondary" onClick={() => navigate('/design-handover/validation')}>Open Release Validation</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="dh-integration-card">
            <div className="dh-integration-icon"><AlertTriangle aria-hidden="true" /></div>
            <div>
              <span className="dh-eyebrow">ERP integration finding</span>
              <h3>Direct ERP Production transfer is unavailable</h3>
              <p>
                The inspected ERP exposes authenticated Work Order, Drawing and Model APIs, but no design-package import or handover endpoint.
                This module therefore supports verified manual export only. Direct transfer remains <strong>Integration Pending</strong>.
              </p>
            </div>
            <StatusBadge status="Integration Pending" />
          </div>

          <div className="dh-send-grid">
            <section className="dh-panel">
              <span className="dh-eyebrow">Released handover</span>
              <h3>{handover.id}</h3>
              <dl className="dh-key-values">
                <div><dt>Project</dt><dd>{handover.projectId} · {project?.name || 'Project record unavailable'}</dd></div>
                <div><dt>Design</dt><dd>{handover.designId} · {design?.name || 'Design record unavailable'}</dd></div>
                <div><dt>Released revision</dt><dd>Rev {handover.designRevision}</dd></div>
                <div><dt>Package</dt><dd>{packageRecord?.id} v{packageRecord?.version} · {packageRecord?.status}</dd></div>
                <div><dt>Release reference</dt><dd>{release.id}</dd></div>
                <div><dt>Released</dt><dd>{formatHandoverDate(release.date)} · {release.releasedBy}</dd></div>
              </dl>
              <div className="dh-export-actions">
                <Button icon={Download} onClick={() => setConfirmExport(true)}>Download Package Manifest</Button>
                <Button variant="ghost" disabled title="No verified ERP Production import endpoint was found">Direct ERP Transfer Unavailable</Button>
              </div>
            </section>

            <section className="dh-panel">
              <span className="dh-eyebrow">Manual handover attempt</span>
              <h3>Record pending handover</h3>
              <form className="dh-form-grid" onSubmit={handleManualAttempt}>
                <Select label="Transfer method" id="manual-method" value={method} onChange={(event) => setMethod(event.target.value)} options={TRANSFER_METHODS.map((option) => ({ value: option, label: option }))} required />
                <Input label="Prepared by" id="manual-prepared-by" value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} required />
                <Input label="Prepared date" id="manual-prepared-date" value={formatHandoverDate(new Date().toISOString().slice(0, 10))} readOnly />
                <Input label="Destination reference (if received)" id="manual-destination" value={destinationReference} onChange={(event) => setDestinationReference(event.target.value)} placeholder="Leave blank until Production provides one" hint="The application does not generate an ERP reference." />
                <Textarea label="Remarks" id="manual-remarks" rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Record the actual manual handover position" />
                <Button type="submit" icon={Send}>Record Attempt — Integration Pending</Button>
              </form>
            </section>
          </div>

          <section className="dh-panel">
            <div className="dh-subhead">
              <div>
                <h3>Attempts for this handover</h3>
                <p>Every export and manual attempt is retained; retries create a new row and never overwrite history.</p>
              </div>
              <FileJson aria-hidden="true" />
            </div>
            <DataTable columns={attemptColumns} rows={attempts} ariaLabel="Handover transfer attempts" emptyContent={<span className="cell-muted">No export or handover attempt recorded yet.</span>} />
          </section>
        </>
      )}

      <Modal
        open={confirmExport}
        onClose={() => setConfirmExport(false)}
        title="Download design package manifest?"
        subtitle={`${handover?.id} · ${handover?.designId} Rev ${handover?.designRevision}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmExport(false)}>Cancel</Button>
            <Button icon={Download} onClick={handleExport}>Confirm & Download</Button>
          </>
        }
      >
        <p className="dh-modal-copy">
          This generates a local JSON manifest from the actual linked package records. It records a new <strong>Ready for Export</strong> attempt.
          It does not send data to ERP Production and must not be reported as a successful direct transfer.
        </p>
      </Modal>
    </div>
  );
}
