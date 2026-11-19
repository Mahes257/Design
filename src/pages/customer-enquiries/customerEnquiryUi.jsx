import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  MessageSquarePlus,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import {
  Button,
  Input,
  Modal,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import {
  DOCUMENT_CATEGORIES,
  ENGINEERING_CONTACTS,
  formatBytes,
  nextStatusActions,
  priorityTone,
  statusTone,
} from '../../data/customerEnquiryData';

export { Toast, useToast } from '../mechanical/mechanicalUi';

export function EnquiryStatus({ status }) {
  return <StatusBadge status={status} tone={statusTone(status)} />;
}

export function EnquiryPriority({ priority }) {
  return <StatusBadge status={priority} tone={priorityTone(priority)} />;
}

const SECTION_TABS = [
  { key: 'overview', label: 'Enquiry Details', suffix: '' },
  { key: 'requirements', label: 'Requirement Specifications', suffix: '/requirements' },
  { key: 'documents', label: 'Customer Documents', suffix: '/documents' },
  { key: 'clarifications', label: 'Technical Clarifications', suffix: '/clarifications' },
  { key: 'history', label: 'Enquiry History', suffix: '/history' },
];

export function EnquirySectionTabs({ enquiryId, active }) {
  return (
    <nav className="module-tabs ce-section-tabs" aria-label="Enquiry sections">
      <div className="module-tabs-inner" role="tablist">
        {SECTION_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              to={`/customer-enquiries/${enquiryId}${tab.suffix}`}
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
    <div className="ce-fact">
      <span>{label}</span>
      <strong>{children ?? (value || '—')}</strong>
    </div>
  );
}

export function FactGrid({ children, columns = 2 }) {
  return <div className={`ce-fact-grid cols-${columns}`}>{children}</div>;
}

export function TextBlock({ label, value }) {
  return (
    <div className="ce-text-block">
      <span>{label}</span>
      <p>{value || '—'}</p>
    </div>
  );
}

export function QuotationReadinessPanel({ readiness, onUpdateStatus, compact = false }) {
  return (
    <div className={`ce-readiness${compact ? ' is-compact' : ''}`}>
      <div className="ce-readiness-head">
        <div>
          <span className="ce-kicker">Quotation gate</span>
          <strong>{readiness.ready ? 'Suitable for quotation' : 'Not ready for quotation'}</strong>
        </div>
        {readiness.ready ? (
          <span className="ce-readiness-state is-ready"><CheckCircle2 aria-hidden="true" /> Ready</span>
        ) : (
          <span className="ce-readiness-state is-blocked"><ShieldAlert aria-hidden="true" /> Action needed</span>
        )}
      </div>
      <ul className="ce-readiness-checks">
        {readiness.checks.map((check) => (
          <li key={check.key} className={check.pass ? 'is-pass' : 'is-blocked'}>
            {check.pass ? <CheckCircle2 aria-hidden="true" /> : <span className="ce-check-dot" aria-hidden="true" />}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
      {!readiness.ready && (
        <div className="ce-blocker-note">
          <strong>Resolve before release</strong>
          <p>{readiness.blockers.join(' · ')}</p>
        </div>
      )}
      {onUpdateStatus && (
        <Button size="sm" onClick={onUpdateStatus}>
          Update Enquiry Status
        </Button>
      )}
    </div>
  );
}

export function EnquiryTimeline({ history = [] }) {
  if (!history.length) return <p className="cell-muted">No enquiry history has been recorded.</p>;
  return (
    <ol className="ce-timeline">
      {[...history].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="ce-timeline-dot" aria-hidden="true" />
          <div className="ce-timeline-body">
            <div className="ce-timeline-head">
              <strong>{entry.action}</strong>
              <span>{String(entry.at || '').replace('T', ' · ')}</span>
            </div>
            <span className="ce-timeline-meta">{entry.by}{entry.status ? ` · ${entry.status}` : ''}</span>
            {entry.detail && <p>{entry.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StatusUpdateDialog({ record, open, onClose, onSubmit }) {
  const actions = nextStatusActions(record || {});
  const firstEnabled = actions.find((action) => !action.disabled) || actions[0];
  const [nextStatus, setNextStatus] = useState(firstEnabled?.value || '');
  const [by, setBy] = useState(record?.engineeringContact || 'N. Joshi');
  const [note, setNote] = useState('');
  const [quotationRef, setQuotationRef] = useState(record?.quotationRef || '');
  const [error, setError] = useState('');
  const selected = actions.find((action) => action.value === nextStatus);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update Enquiry Status"
      subtitle={record ? `${record.id} · ${record.subject}` : undefined}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!selected || selected.disabled}
            onClick={() => {
              const result = onSubmit({ status: nextStatus, by, note, quotationRef });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Update Status
          </Button>
        </>
      }
    >
      {actions.length === 0 ? (
        <div className="ce-dialog-note">
          <MessageSquarePlus aria-hidden="true" />
          <p>
            This enquiry is in <strong>{record?.status}</strong>. Respond to the open technical
            clarifications to return it to technical review.
          </p>
        </div>
      ) : (
        <div className="form-grid">
          <Select
            id="ce-status-next"
            label="Next status"
            value={nextStatus}
            onChange={(event) => {
              setNextStatus(event.target.value);
              setError('');
            }}
            options={actions.map((action) => ({
              value: action.value,
              label: `${action.label}${action.disabled ? ' · blocked' : ''}`,
            }))}
          />
          <Select
            id="ce-status-by"
            label="Updated by"
            value={by}
            onChange={(event) => setBy(event.target.value)}
            options={[...new Set([...(record?.engineeringContact ? [record.engineeringContact] : []), ...ENGINEERING_CONTACTS])].map((name) => ({ value: name, label: name }))}
          />
          {nextStatus === 'Quotation Prepared' && (
            <div className="form-grid-full">
              <Input
                id="ce-status-quotation-ref"
                label="Quotation reference"
                value={quotationRef}
                placeholder="e.g. QTN-2026-019"
                onChange={(event) => {
                  setQuotationRef(event.target.value);
                  setError('');
                }}
                hint="Required before the enquiry can be marked Quotation Prepared."
              />
            </div>
          )}
          <div className="form-grid-full">
            <Textarea
              id="ce-status-note"
              label="Workflow note"
              rows={3}
              value={note}
              placeholder={selected?.description || 'Add a note for the enquiry history.'}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {selected?.disabled && selected.reason && (
            <p className="form-error span-2" role="alert">{selected.reason}</p>
          )}
          {error && <p className="form-error span-2" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

export function ClarificationDialog({ record, open, onClose, onSubmit }) {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [raisedBy, setRaisedBy] = useState(record?.engineeringContact || 'N. Joshi');
  const [error, setError] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise Technical Clarification"
      subtitle={record ? `${record.id} · ${record.subject}` : undefined}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={MessageSquarePlus}
            onClick={() => {
              const result = onSubmit({ topic, question, raisedBy });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Raise Clarification
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-grid-full">
          <Input
            id="ce-clarification-topic"
            label="Topic"
            value={topic}
            placeholder="e.g. Paint shade confirmation"
            onChange={(event) => {
              setTopic(event.target.value);
              setError('');
            }}
          />
        </div>
        <Select
          id="ce-clarification-by"
          label="Raised by"
          value={raisedBy}
          onChange={(event) => setRaisedBy(event.target.value)}
          options={[...new Set([record?.engineeringContact, ...ENGINEERING_CONTACTS].filter(Boolean))].map((name) => ({ value: name, label: name }))}
        />
        <div className="form-grid-full">
          <Textarea
            id="ce-clarification-question"
            label="Question to customer"
            rows={4}
            value={question}
            placeholder="What information is required before the technical review can proceed?"
            onChange={(event) => {
              setQuestion(event.target.value);
              setError('');
            }}
          />
        </div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function ClarificationResponseDialog({ record, clarification, open, onClose, onSubmit }) {
  const [response, setResponse] = useState('');
  const [respondedBy, setRespondedBy] = useState(record?.contactName || record?.salesContact || 'Sales');
  const [error, setError] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Clarification Response"
      subtitle={clarification ? `${clarification.id} · ${clarification.topic}` : undefined}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={CheckCircle2}
            onClick={() => {
              const result = onSubmit({ response, respondedBy });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Save Response
          </Button>
        </>
      }
    >
      {clarification && (
        <div className="ce-dialog-question">
          <span>Customer clarification request</span>
          <p>{clarification.question}</p>
        </div>
      )}
      <div className="form-grid">
        <Select
          id="ce-response-by"
          label="Responded by"
          value={respondedBy}
          onChange={(event) => setRespondedBy(event.target.value)}
          options={[...new Set([record?.contactName, record?.salesContact, 'Sales', 'Customer'].filter(Boolean))].map((name) => ({ value: name, label: name }))}
        />
        <div className="form-grid-full">
          <Textarea
            id="ce-response-text"
            label="Customer response"
            rows={4}
            value={response}
            placeholder="Record the customer response or confirmed technical information."
            onChange={(event) => {
              setResponse(event.target.value);
              setError('');
            }}
          />
        </div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export function DocumentUploadDialog({ record, open, onClose, onSubmit }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Attach Customer Document"
      subtitle={record ? `${record.id} · ${record.subject}` : undefined}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={Upload}
            disabled={!file}
            onClick={() => {
              const result = onSubmit({
                name: file?.name,
                category,
                type: file?.type || 'Unknown',
                size: file?.size || 0,
                notes,
                uploadedBy: record?.engineeringContact || 'N. Joshi',
              });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Attach Document
          </Button>
        </>
      }
    >
      <div className="ce-upload-note">
        <FileText aria-hidden="true" />
        <p>Local demo storage keeps document metadata in this browser. File content is not uploaded.</p>
      </div>
      <div className="ce-file-picker">
        <input
          ref={fileRef}
          type="file"
          className="ce-file-input"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError('');
          }}
          aria-label="Select customer document"
        />
        <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
          Choose File
        </Button>
        <span>{file ? `${file.name} · ${formatBytes(file.size)}` : 'PDF, drawing, spreadsheet or reference file'}</span>
      </div>
      <div className="form-grid">
        <Select
          id="ce-document-category"
          label="Document category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={DOCUMENT_CATEGORIES.map((value) => ({ value, label: value }))}
        />
        <div className="form-grid-full">
          <Input
            id="ce-document-notes"
            label="Notes"
            value={notes}
            placeholder="Revision, context or reference note"
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
