import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Button,
  DataTable,
  Modal,
  StatusBadge,
} from '../../components/common';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import {
  PACKAGE_CATEGORIES,
  formatHandoverDate,
  packageCompleteness,
  pendingValidationRows,
  validationBlocking,
  validationSummary,
} from '../../data/designHandoverData';
import { HandoverSelector, NoHandovers, ReleaseCard, ValidationSummaryCard } from './designHandoverUi';

export default function ReleaseValidationTab() {
  const navigate = useNavigate();
  const { handovers, getPackage, getRelease, runValidation, releaseDesign } = useDesignHandover();
  const [handoverId, setHandoverId] = useState(handovers[0]?.id || '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (handoverId && handovers.some((row) => row.id === handoverId)) return;
    setHandoverId(handovers[0]?.id || '');
  }, [handovers, handoverId]);

  const handover = handovers.find((row) => row.id === handoverId) || null;
  const packageRecord = handover ? getPackage(handover.id) : null;
  const release = handover ? getRelease(handover.id) : null;
  const validation = handover?.validation || null;
  const summary = validationSummary(validation);
  const blocking = validationBlocking(validation);
  const completeness = packageCompleteness(packageRecord);
  const packageReady = packageRecord?.status === 'Prepared' && completeness.missingMandatory.length === 0;
  const canRelease = Boolean(handover && validation && !blocking && packageReady && !release);
  const rows = validation?.results || pendingValidationRows();

  const columns = useMemo(() => [
    {
      key: 'item',
      label: 'Validation item',
      render: (row) => (
        <span>
          <strong>{row.label}</strong>
          <span className="cell-sub">{row.mandatory ? 'Mandatory' : 'Optional'}</span>
        </span>
      ),
    },
    {
      key: 'requirement',
      label: 'Requirement',
      render: (row) => <span className={`dh-req-pill ${row.mandatory ? 'is-mandatory' : 'is-optional'}`}>{row.mandatory ? 'Mandatory' : 'Optional'}</span>,
    },
    {
      key: 'result',
      label: 'Result',
      render: (row) => <StatusBadge status={row.result} />,
    },
    {
      key: 'evidence',
      label: 'Evidence / source record',
      render: (row) => <span className="dh-evidence-cell">{row.evidence}</span>,
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (row) => <span className="dh-evidence-cell">{row.remarks || '—'}</span>,
    },
  ], []);

  if (handovers.length === 0) {
    return <NoHandovers message="Create a handover and its final design package, then run release validation." />;
  }

  const handleValidate = () => {
    const result = runValidation(handover.id);
    setFeedback(result.error ? { tone: 'error', text: result.error } : {
      tone: result.blocking ? 'error' : 'success',
      text: result.blocking
        ? `Validation failed: ${validationSummary(result.validation).mandatoryFailures} mandatory check(s) are blocking release.`
        : `Validation passed: ${validationSummary(result.validation).pass} checks passed and no mandatory failure remains.`,
    });
  };

  const handleRelease = () => {
    const result = releaseDesign(handover.id, { confirmed: true });
    setConfirmOpen(false);
    if (result.error) {
      setFeedback({ tone: 'error', text: result.error });
      return;
    }
    setFeedback({ tone: 'success', text: `${result.release.id} released ${handover.designId} Rev ${handover.designRevision} with package ${result.release.packageId} v${result.release.packageVersion}.` });
  };

  return (
    <div className="dh-tab-stack">
      <div className="dh-section-heading">
        <div>
          <h2>Release Validation</h2>
          <p>Each check reads the actual source records. Missing evidence fails; it is never treated as approved.</p>
        </div>
        <div className="dh-heading-actions">
          <Button variant="secondary" icon={RefreshCw} onClick={handleValidate} disabled={Boolean(release)}>Run Validation</Button>
          <Button variant="ghost" onClick={() => navigate('/design-handover/package')}>Open Package</Button>
        </div>
      </div>

      <HandoverSelector handovers={handovers} value={handoverId} onChange={(id) => { setHandoverId(id); setFeedback(null); }} />
      {feedback && <div className={`dh-feedback is-${feedback.tone}`} role="status">{feedback.text}</div>}

      <ValidationSummaryCard validation={validation} onOpenPackage={() => navigate('/design-handover/package')} />

      <div className="dh-validation-layout">
        <div className="dh-validation-main">
          <div className="dh-subhead">
            <div>
              <h3>Release checklist</h3>
              <p>{validation ? `Checked ${formatHandoverDate(validation.checkedAt)} by ${validation.checkedBy} · package ${validation.packageId || 'not recorded'} v${validation.packageVersion || '—'}` : 'No validation result recorded yet.'}</p>
            </div>
            <div className="dh-summary-pills">
              <span className="tone-green">{summary.pass} Pass</span>
              <span className="tone-red">{summary.fail} Fail</span>
              <span className="tone-gray">{summary.notApplicable} N/A</span>
            </div>
          </div>
          <DataTable columns={columns} rows={rows} ariaLabel="Release validation checklist" />
        </div>

        <aside className="dh-validation-side">
          <div className="dh-side-card">
            <span className="dh-eyebrow">Release gate</span>
            <h3>Final design release</h3>
            <dl className="dh-key-values">
              <div><dt>Project</dt><dd>{handover.projectId}</dd></div>
              <div><dt>Design</dt><dd>{handover.designId} Rev {handover.designRevision}</dd></div>
              <div><dt>Package</dt><dd>{packageRecord ? `${packageRecord.id} v${packageRecord.version}` : 'Not created'}</dd></div>
              <div><dt>Approval</dt><dd>{handover.finalApprovalId || 'Not selected'}</dd></div>
            </dl>
            {!packageReady && !release && (
              <p className="dh-inline-alert">The package must be Prepared with all {PACKAGE_CATEGORIES.filter((category) => category.mandatory).length} mandatory categories linked.</p>
            )}
            {blocking && <p className="dh-inline-alert">Mandatory validation failures currently block release.</p>}
            {canRelease ? (
              <Button icon={ShieldCheck} onClick={() => setConfirmOpen(true)}>Release Design</Button>
            ) : (
              <Button icon={ShieldCheck} disabled>{release ? 'Design Released' : 'Release Blocked'}</Button>
            )}
            {release && <p className="dh-muted-note">This handover already has a controlled release record.</p>}
          </div>
          {release && <ReleaseCard release={release} />}
          <div className="dh-side-card is-note">
            <ClipboardCheck aria-hidden="true" />
            <h3>Correction loop</h3>
            <p>Correct a missing package category or source approval, mark the package Prepared again, then rerun validation. The previous validation result remains in the handover audit history.</p>
          </div>
        </aside>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm final design release"
        subtitle={`${handover.id} · ${handover.projectId}`}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button icon={ShieldCheck} onClick={handleRelease}>Confirm & Release</Button>
          </>
        }
      >
        <div className="dh-confirm-grid">
          <div><span>Project</span><strong>{handover.projectId}</strong></div>
          <div><span>Design</span><strong>{handover.designId}</strong></div>
          <div><span>Revision</span><strong>Rev {handover.designRevision}</strong></div>
          <div><span>Package</span><strong>{packageRecord?.id} v{packageRecord?.version}</strong></div>
          <div><span>Final approval</span><strong>{handover.finalApprovalId}</strong></div>
          <div><span>Released by</span><strong>Design Admin</strong></div>
        </div>
        <p className="dh-modal-copy">This records a browser-local controlled release. It does not overwrite the source revision or transfer anything to ERP Production.</p>
      </Modal>
    </div>
  );
}
