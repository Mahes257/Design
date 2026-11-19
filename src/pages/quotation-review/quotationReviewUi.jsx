import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button, Modal, Select, StatusBadge, Textarea } from '../../components/common';
import {
  ENGINEERS,
  QUOTATION_WORKFLOW,
  formatRevision,
  quotationPriorityTone,
  quotationReadiness,
  quotationStatusTone,
  statusActions,
} from '../../data/quotationReviewData';

const SECTION_TABS = [
  { key: 'overview', label: 'Quotation Overview', suffix: '' },
  { key: 'feasibility', label: 'Technical Feasibility', suffix: '/feasibility' },
  { key: 'costs', label: 'Preliminary Cost Estimate', suffix: '/cost-estimate' },
  { key: 'review', label: 'Quotation Review', suffix: '/review' },
  { key: 'history', label: 'Quotation History', suffix: '/history' },
];

export function QuotationStatus({ status }) {
  return <StatusBadge status={status} tone={quotationStatusTone(status)} />;
}

export function QuotationPriority({ priority }) {
  return <StatusBadge status={priority} tone={quotationPriorityTone(priority)} />;
}

export function FeasibilityBadge({ value }) {
  if (!value) return <span className="cell-muted">Not assessed</span>;
  const tone =
    value === 'Feasible' ? 'green' : value === 'Feasible with conditions' ? 'orange' : 'red';
  return <StatusBadge status={value} tone={tone} />;
}

export function RevisionChip({ revision }) {
  return <span className="qr-revision">{formatRevision(revision)}</span>;
}

export function QuotationSectionTabs({ quotationId, active }) {
  return (
    <nav className="module-tabs qr-section-tabs" aria-label="Quotation sections">
      <div className="module-tabs-inner" role="tablist">
        {SECTION_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              to={`/quotation-review/${quotationId}${tab.suffix}`}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={`module-tab${isActive ? ' is-active' : ''}`}
              title={tab.label}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Fact({ label, value, children }) {
  return (
    <div className="qr-fact">
      <span>{label}</span>
      <strong>{children ?? (value || '—')}</strong>
    </div>
  );
}

export function FactGrid({ children, columns = 2 }) {
  return <div className={`qr-fact-grid cols-${columns}`}>{children}</div>;
}

export function TextBlock({ label, value, className = '' }) {
  return (
    <div className={`qr-text-block ${className}`.trim()}>
      <span>{label}</span>
      <p>{value || '—'}</p>
    </div>
  );
}

export function QuotationWorkflowStrip({ counts = null, activeIndex = null, compact = false }) {
  return (
    <section className={`qr-workflow${compact ? ' is-compact' : ''}`}>
      <div className="qr-workflow-head">
        <div>
          <span className="qr-kicker">Engineering lifecycle · quotation</span>
          <h2>Customer Enquiry → Technical Review → Quotation Preparation → Customer Acceptance</h2>
          <p>
            Technical feasibility is confirmed before sales release. Only an accepted quotation can
            initiate a project.
          </p>
        </div>
        <span className="chip chip-mint">Frontend workflow</span>
      </div>
      <div className="qr-workflow-steps">
        {QUOTATION_WORKFLOW.map((step, index) => (
          <div
            key={step.key}
            className={`qr-workflow-step${activeIndex === index ? ' is-active' : ''}${
              activeIndex != null && activeIndex > index ? ' is-complete' : ''
            }`}
          >
            <span className="qr-workflow-number">{step.number}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
              {counts && <small>{counts[step.key] ?? 0} records</small>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function QuotationReadinessPanel({ record, onAction, actionLabel = 'Update Status' }) {
  const readiness = quotationReadiness(record);
  return (
    <div className="qr-readiness">
      <div className="qr-readiness-head">
        <div>
          <span className="qr-kicker">Technical acceptance gate</span>
          <strong>{readiness.ready ? 'Ready for technical acceptance' : 'Technical review incomplete'}</strong>
        </div>
        {readiness.ready ? (
          <span className="qr-readiness-state is-ready">
            <CheckCircle2 aria-hidden="true" /> Ready
          </span>
        ) : (
          <span className="qr-readiness-state is-blocked">
            <ShieldAlert aria-hidden="true" /> Action needed
          </span>
        )}
      </div>
      <ul className="qr-readiness-checks">
        {readiness.checks.map((check) => (
          <li key={check.key} className={check.pass ? 'is-pass' : 'is-blocked'}>
            {check.pass ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <span className="qr-check-dot" aria-hidden="true" />
            )}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
      {!readiness.ready && (
        <div className="qr-blocker-note">
          <strong>Resolve before technical acceptance</strong>
          <p>{readiness.blockers.join(' · ')}</p>
        </div>
      )}
      {onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function QuotationTimeline({ history = [] }) {
  if (!history.length) return <p className="cell-muted">No quotation history has been recorded.</p>;
  return (
    <ol className="qr-timeline">
      {[...history].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="qr-timeline-dot" aria-hidden="true" />
          <div className="qr-timeline-body">
            <div className="qr-timeline-head">
              <strong>{entry.action}</strong>
              <span>{String(entry.at || '').replace('T', ' · ')}</span>
            </div>
            <span className="qr-timeline-meta">
              {entry.by}
              {entry.status ? ` · ${entry.status}` : ''}
            </span>
            {entry.detail && <p>{entry.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function QuotationStatusDialog({ record, open, onClose, onSubmit }) {
  const actions = statusActions(record || {});
  const firstEnabled = actions.find((action) => !action.disabled) || actions[0];
  const [nextStatus, setNextStatus] = useState(firstEnabled?.value || '');
  const [reviewer, setReviewer] = useState(record?.review?.assignedReviewer || '');
  const [by, setBy] = useState(record?.salesContact || 'N. Joshi');
  const [note, setNote] = useState('');
  const [customerReference, setCustomerReference] = useState(record?.customerReference || '');
  const [error, setError] = useState('');

  if (!record) return null;

  const selected = actions.find((action) => action.value === nextStatus) || firstEnabled;
  const reviewStage = ['Technical Review', 'Technically Accepted', 'Changes Requested'].includes(
    nextStatus,
  );
  const customerStage = ['Customer Submitted', 'Accepted', 'Rejected', 'Expired'].includes(
    nextStatus,
  );
  const readiness = quotationReadiness({
    ...record,
    review: { ...record.review, assignedReviewer: reviewer || record.review?.assignedReviewer },
  });
  const noteLabel =
    nextStatus === 'Changes Requested'
      ? 'Requested changes'
      : nextStatus === 'Rejected'
        ? 'Rejection reason'
        : nextStatus === 'Expired'
          ? 'Expiry note'
          : nextStatus === 'Customer Submitted'
            ? 'Submission note'
            : reviewStage
              ? 'Technical review comments'
              : 'Decision note';

  const submit = () => {
    const result = onSubmit({
      status: nextStatus,
      reviewer,
      by,
      note,
      customerReference,
    });
    if (result?.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update quotation status"
      subtitle={`${record.quotationRef} · ${formatRevision(record.revision)} · ${record.status}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || selected.disabled}>
            {selected?.label || 'Update Status'}
          </Button>
        </>
      }
    >
      <div className="qr-dialog-form">
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <Select
          id="qr-status-next"
          label="Next status"
          value={nextStatus}
          onChange={(event) => {
            setNextStatus(event.target.value);
            setError('');
          }}
          options={actions.map((action) => ({
            value: action.value,
            label: `${action.label} · ${action.value}${action.disabled ? ' · blocked' : ''}`,
          }))}
          disabled={actions.length === 0}
        />

        {selected?.disabled && (
          <div className="qr-blocker-note">
            <strong>This transition is blocked</strong>
            <p>{selected.reason}</p>
          </div>
        )}

        {reviewStage && (
          <Select
            id="qr-status-reviewer"
            label="Technical reviewer"
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            options={[
              { value: '', label: 'Select reviewer' },
              ...ENGINEERS.map((name) => ({ value: name, label: name })),
            ]}
            hint="The assigned reviewer is recorded in the quotation review."
          />
        )}

        {nextStatus === 'Technically Accepted' && !readiness.ready && (
          <div className="qr-blocker-note">
            <strong>Technical basis is not complete</strong>
            <p>{readiness.blockers.join(' · ')}</p>
          </div>
        )}

        {nextStatus === 'Customer Submitted' && (
          <div className="form-field">
            <label className="form-label" htmlFor="qr-status-customer-ref">
              Customer reference / PO
            </label>
            <input
              id="qr-status-customer-ref"
              className="form-input"
              value={customerReference}
              placeholder="Customer quotation reference"
              onChange={(event) => setCustomerReference(event.target.value)}
            />
          </div>
        )}

        <Textarea
          id="qr-status-note"
          label={noteLabel}
          rows={3}
          value={note}
          placeholder={
            nextStatus === 'Changes Requested'
              ? 'Describe the technical changes required before the quotation can be accepted.'
              : nextStatus === 'Rejected'
                ? 'Record why the customer rejected the quotation.'
                : 'Add the decision or handoff note for the quotation history.'
          }
          onChange={(event) => setNote(event.target.value)}
        />

        <Select
          id="qr-status-by"
          label="Action by"
          value={by}
          onChange={(event) => setBy(event.target.value)}
          options={ENGINEERS.map((name) => ({ value: name, label: name }))}
        />

        {customerStage && (
          <p className="qr-dialog-note">
            Customer pricing, GST and the actual sales transaction remain in the existing Sales
            ERP. This action records only the engineering quotation decision.
          </p>
        )}
      </div>
    </Modal>
  );
}
