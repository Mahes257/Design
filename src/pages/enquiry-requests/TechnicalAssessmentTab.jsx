import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  MessageSquarePlus,
  Search,
  SearchCheck,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Select, Textarea } from '../../components/common';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import {
  ASSESSMENT_FEASIBILITY_FIELDS,
  CLARIFICATION_STATUSES,
  TECHNICAL_DECISIONS,
  TECHNICAL_REVIEWERS,
  assessmentReadiness,
  conversionEligibility,
  formatDate,
  hydrateAssessment,
  requesterLabel,
} from '../../data/enquiryRequestData';
import {
  AttachmentPicker,
  DocumentList,
  RequestSource,
  RequestStatus,
  RequestPriority,
  useRequestConversion,
} from './enquiryRequestUi';

const ASSESSABLE_STATUSES = [
  'Submitted',
  'Under Initial Review',
  'Clarification Required',
  'Under Feasibility Assessment',
  'Returned for Clarification',
  'Accepted',
  'Rejected',
  'Quotation in Progress',
  'Submitted to Customer',
  'Quotation Accepted',
  'Quotation Rejected',
];

function AssessmentWorkspace({ record }) {
  const navigate = useNavigate();
  const {
    startReview,
    saveAssessment,
    raiseClarification,
    respondClarification,
    recordDecision,
  } = useEnquiryRequests();
  const { openConvert, convertDialog } = useRequestConversion();
  const [assessment, setAssessment] = useState(() => hydrateAssessment(record.assessment));
  const [message, setMessage] = useState(null);
  const [decision, setDecision] = useState('');
  const [decisionComments, setDecisionComments] = useState('');
  const [respondedBy, setRespondedBy] = useState('Requester');

  // Keep the workspace in step with the stored assessment after workflow actions.
  useEffect(() => {
    setAssessment(hydrateAssessment(record.assessment));
  }, [record.assessment, record.status]);

  const readiness = assessmentReadiness({ ...record, assessment });
  const eligibility = conversionEligibility(record);
  const locked = ['Converted to Project', 'Closed'].includes(record.status);

  const setField = (key, value) => {
    setAssessment((previous) => ({ ...previous, [key]: value }));
    setMessage(null);
  };
  const setFeasibility = (key, value) => {
    setAssessment((previous) => ({
      ...previous,
      feasibility: { ...previous.feasibility, [key]: value },
    }));
    setMessage(null);
  };

  const persist = () => saveAssessment(record.id, assessment, { by: assessment.reviewer || 'N. Joshi' });

  const feedback = (result, success) => {
    if (result?.error) setMessage({ tone: 'error', text: result.error });
    else setMessage({ tone: 'success', text: success });
  };

  return (
    <div className="er-assessment">
      <header className="er-panel-head">
        <div>
          <span className="er-kicker">Technical assessment workspace</span>
          <h2>
            {record.id} · {record.title}
          </h2>
          <div className="er-badge-row">
            <RequestSource source={record.source} />
            <RequestStatus status={record.status} />
            <RequestPriority priority={record.priority} />
            <span className="chip">{record.category}</span>
          </div>
        </div>
        <div className="er-panel-actions">
          {record.status === 'Submitted' && (
            <Button
              icon={SearchCheck}
              onClick={() => feedback(startReview(record.id), 'Initial review started.')}
            >
              Start Initial Review
            </Button>
          )}
          <Button variant="secondary" icon={ClipboardCheck} onClick={() => navigate(`/customer-sales/requests/${record.id}`)}>
            Open Request
          </Button>
        </div>
      </header>

      {message && (
        <div className={`form-banner ${message.tone === 'error' ? 'error' : ''}`} role="status">
          <span>{message.text}</span>
        </div>
      )}

      <div className="er-assessment-grid">
        <section className="card er-section">
          <div className="er-section-head">
            <h3>A · Initial Review</h3>
            <span className="er-section-note">Request intake and reviewer assignment</span>
          </div>
          <dl className="detail-list er-fact-list">
            <dt>Request ID</dt>
            <dd>{record.id}</dd>
            <dt>Request Source</dt>
            <dd>{record.source}</dd>
            <dt>Request Summary</dt>
            <dd>{record.description || '—'}</dd>
            <dt>Submitted By</dt>
            <dd>{requesterLabel(record)}</dd>
          </dl>
          <div className="form-grid">
            <Select
              id="er-assess-reviewer"
              label="Assigned Technical Reviewer"
              value={assessment.reviewer || ''}
              disabled={locked}
              options={[
                { value: '', label: 'Select reviewer' },
                ...TECHNICAL_REVIEWERS.map((name) => ({ value: name, label: name })),
              ]}
              onChange={(event) => setField('reviewer', event.target.value)}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="er-assess-review-date">
                Review Date
              </label>
              <input
                id="er-assess-review-date"
                type="date"
                className="form-input"
                value={assessment.reviewDate || ''}
                disabled={locked}
                onChange={(event) => setField('reviewDate', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-assess-comments"
                label="Initial Review Comments"
                rows={3}
                value={assessment.reviewComments || ''}
                disabled={locked}
                placeholder="What was reviewed, and is the requirement clear enough to assess?"
                onChange={(event) => setField('reviewComments', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>B · Requirement Clarification</h3>
            <span className="chip">
              {assessment.clarificationStatus || 'Not Required'}
            </span>
          </div>
          <div className="form-grid">
            <Select
              id="er-clarification-required"
              label="Clarification Required"
              value={assessment.clarificationRequired || 'No'}
              disabled={locked}
              options={[
                { value: 'No', label: 'No' },
                { value: 'Yes', label: 'Yes' },
              ]}
              onChange={(event) => setField('clarificationRequired', event.target.value)}
            />
            <Select
              id="er-clarification-status"
              label="Clarification Status"
              value={assessment.clarificationStatus || 'Not Required'}
              disabled={locked}
              options={CLARIFICATION_STATUSES.map((value) => ({ value, label: value }))}
              hint="Set by raising a clarification and recording its response"
              onChange={(event) => setField('clarificationStatus', event.target.value)}
            />
            <div className="form-grid-full">
              <Textarea
                id="er-clarification-questions"
                label="Clarification Questions"
                rows={3}
                value={assessment.clarificationQuestions || ''}
                disabled={locked}
                onChange={(event) => setField('clarificationQuestions', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-clarification-response"
                label="Clarification Response"
                rows={3}
                value={assessment.clarificationResponse || ''}
                disabled={locked}
                onChange={(event) => setField('clarificationResponse', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <AttachmentPicker
                label="Supporting Attachments"
                documents={assessment.clarificationDocuments}
                disabled={locked}
                onChange={(documents) => setField('clarificationDocuments', documents)}
              />
            </div>
          </div>
          <div className="er-inline-actions">
            <Button
              variant="secondary"
              icon={MessageSquarePlus}
              disabled={locked}
              onClick={() => {
                const saved = persist();
                if (saved?.error) return feedback(saved);
                const result = raiseClarification(record.id, {
                  questions: assessment.clarificationQuestions,
                  reviewer: assessment.reviewer,
                });
                feedback(result, 'Clarification raised and sent to the requester.');
              }}
            >
              Raise Clarification
            </Button>
            <Select
              id="er-response-by"
              label="Responded By"
              value={respondedBy}
              disabled={assessment.clarificationStatus !== 'Open'}
              options={[
                requesterLabel(record),
                record.assessment?.reviewer,
                'Customer',
                'Requester',
              ]
                .filter(Boolean)
                .filter((value, index, list) => list.indexOf(value) === index)
                .map((value) => ({ value, label: value }))}
              onChange={(event) => setRespondedBy(event.target.value)}
            />
            <Button
              icon={CheckCircle2}
              disabled={assessment.clarificationStatus !== 'Open'}
              onClick={() =>
                feedback(
                  respondClarification(record.id, {
                    response: assessment.clarificationResponse,
                    respondedBy,
                  }),
                  'Clarification response recorded; request returned to review.',
                )
              }
            >
              Record Response
            </Button>
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>C · Feasibility Assessment</h3>
            <span className="er-section-note">Mandatory before a request can be accepted</span>
          </div>
          <div className="form-grid">
            {ASSESSMENT_FEASIBILITY_FIELDS.map((definition) => {
              const value = assessment.feasibility?.[definition.key] || '';
              const id = `er-feasibility-${definition.key}`;
              const label = `${definition.label}${definition.required ? ' *' : ''}`;
              const wrapperClass = definition.full ? 'form-grid-full' : undefined;
              if (definition.type === 'select') {
                return (
                  <Select
                    key={definition.key}
                    id={id}
                    label={label}
                    value={value}
                    disabled={locked}
                    options={[
                      { value: '', label: `Select ${definition.label.toLowerCase()}` },
                      ...definition.options.map((option) => ({ value: option, label: option })),
                    ]}
                    onChange={(event) => setFeasibility(definition.key, event.target.value)}
                  />
                );
              }
              if (definition.type === 'textarea') {
                return (
                  <div key={definition.key} className={wrapperClass}>
                    <Textarea
                      id={id}
                      label={label}
                      rows={definition.rows || 2}
                      value={value}
                      disabled={locked}
                      onChange={(event) => setFeasibility(definition.key, event.target.value)}
                    />
                  </div>
                );
              }
              return (
                <div key={definition.key} className="form-field">
                  <label className="form-label" htmlFor={id}>
                    {label}
                  </label>
                  <input
                    id={id}
                    className="form-input"
                    value={value}
                    disabled={locked}
                    placeholder={definition.placeholder}
                    onChange={(event) => setFeasibility(definition.key, event.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>D · Technical Decision</h3>
            <span className={`er-gate ${readiness.ready ? 'is-ready' : 'is-blocked'}`}>
              {readiness.ready ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
              {readiness.ready ? 'Assessment complete' : `${readiness.blockers.length} requirement(s) outstanding`}
            </span>
          </div>

          <ul className="er-checklist">
            {readiness.checks.map((check) => (
              <li key={check.key} className={check.pass ? 'is-pass' : 'is-open'}>
                {check.pass ? <CheckCircle2 aria-hidden="true" /> : <span className="er-dot" aria-hidden="true" />}
                {check.label}
              </li>
            ))}
          </ul>
          {!readiness.ready && (
            <div className="er-blocker">
              <strong>Accept is blocked until these are complete</strong>
              <p>{readiness.blockers.join(' · ')}</p>
            </div>
          )}

          <div className="form-grid">
            <Select
              id="er-decision"
              label="Technical Decision"
              value={decision}
              disabled={locked}
              options={[
                { value: '', label: 'Select a decision' },
                ...TECHNICAL_DECISIONS.map((value) => ({ value, label: value })),
              ]}
              onChange={(event) => {
                setDecision(event.target.value);
                setMessage(null);
              }}
            />
            <div className="form-field">
              <span className="form-label">Decision By</span>
              <span className="form-static">{assessment.reviewer || 'Assign a reviewer above'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Decision Date</span>
              <span className="form-static">
                {record.assessment?.decisionDate ? formatDate(record.assessment.decisionDate) : 'Set on decision'}
              </span>
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-decision-comments"
                label="Reviewer Comments"
                rows={3}
                value={decisionComments}
                disabled={locked}
                placeholder="Decision basis. A rejection reason or clarification request is mandatory."
                onChange={(event) => {
                  setDecisionComments(event.target.value);
                  setMessage(null);
                }}
              />
            </div>
          </div>

          <div className="er-inline-actions">
            <Button
              variant="secondary"
              icon={ClipboardCheck}
              disabled={locked}
              onClick={() => feedback(persist(), 'Assessment saved. No decision was recorded.')}
            >
              Save Assessment
            </Button>
            <Button
              icon={CheckCircle2}
              disabled={locked || !readiness.ready}
              onClick={() =>
                feedback(
                  recordDecision(record.id, {
                    decision: 'Accepted',
                    comments: decisionComments,
                  }),
                  'Request accepted. It is now eligible for the downstream workflow.',
                )
              }
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              icon={XCircle}
              disabled={locked}
              onClick={() =>
                feedback(
                  recordDecision(record.id, { decision: 'Rejected', comments: decisionComments }),
                  'Request rejected with the recorded reason.',
                )
              }
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              icon={ArrowRightLeft}
              disabled={locked}
              onClick={() =>
                feedback(
                  recordDecision(record.id, {
                    decision: 'Returned for Clarification',
                    comments: decisionComments,
                  }),
                  'Request returned for clarification; existing information is retained.',
                )
              }
            >
              Return for Clarification
            </Button>
          </div>

          {record.assessment?.decision && (
            <div className="er-decision-summary">
              <strong>
                Current decision: {record.assessment.decision} · {record.assessment.decisionBy}
              </strong>
              <span>{formatDate(record.assessment.decisionDate)}</span>
              <p>{record.assessment.decisionComments}</p>
            </div>
          )}

          <div className="er-decision-history">
            <h4>Decision History</h4>
            {record.assessment?.decisionHistory?.length ? (
              <ol>
                {[...record.assessment.decisionHistory].reverse().map((row) => (
                  <li key={row.id}>
                    <strong>{row.decision}</strong>
                    <span>
                      {row.by} · {formatDate(row.at)}
                    </span>
                    <p>{row.comments}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cell-muted">No technical decision has been recorded yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="card er-downstream">
        <div>
          <span className="er-kicker">Downstream workflow</span>
          <h3>{eligibility.eligible ? 'Eligible for project creation' : 'Project creation not available'}</h3>
          <p>{eligibility.reason}</p>
        </div>
        <div className="er-downstream-actions">
          {eligibility.linkedProjectId && (
            <Button variant="secondary" icon={ArrowRightLeft} onClick={() => navigate(`/projects/${eligibility.linkedProjectId}`)}>
              Open {eligibility.linkedProjectId}
            </Button>
          )}
          <Button icon={ArrowRightLeft} disabled={!eligibility.eligible} onClick={() => openConvert(record)}>
            Convert to Project
          </Button>
          {record.source === 'Customer' && (
            <Button
              variant="ghost"
              icon={Gauge}
              onClick={() => navigate(`/customer-sales/commercial/${record.id}`)}
            >
              Quotation &amp; Commercial
            </Button>
          )}
        </div>
      </section>

      {convertDialog}
    </div>
  );
}

export default function TechnicalAssessmentTab() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { requests } = useEnquiryRequests();
  const [search, setSearch] = useState('');

  const queue = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests
      .filter((row) => ASSESSABLE_STATUSES.includes(row.status) || row.status === 'Converted to Project')
      .filter((row) =>
        !query
          ? true
          : [row.id, row.title, requesterLabel(row)]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(query)),
      )
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }, [requests, search]);

  const selected = requests.find((row) => row.id === requestId) || queue[0] || null;

  return (
    <div className="er-assessment-layout">
      <aside className="card er-assessment-list">
        <div className="er-list-head">
          <div>
            <span className="er-kicker">Assessment queue</span>
            <h2>Requests in review</h2>
          </div>
          <span className="chip chip-mint">{queue.length}</span>
        </div>
        <div className="er-list-search">
          <Search aria-hidden="true" />
          <input
            className="form-input"
            value={search}
            placeholder="Search request or requester"
            aria-label="Search assessment queue"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <ul className="er-queue">
          {queue.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`er-queue-item${row.id === selected?.id ? ' is-active' : ''}`}
                onClick={() => navigate(`/customer-sales/assessment/${row.id}`)}
              >
                <span className="er-queue-top">
                  <strong>{row.id}</strong>
                  <RequestStatus status={row.status} />
                </span>
                <span className="er-queue-title">{row.title}</span>
                <span className="er-queue-meta">
                  <RequestSource source={row.source} />
                  <small>{formatDate(row.requestDate)}</small>
                </span>
              </button>
            </li>
          ))}
          {queue.length === 0 && (
            <li>
              <EmptyState
                icon={SearchCheck}
                title="No requests in review"
                message="Submitted requests appear here for technical assessment."
              />
            </li>
          )}
        </ul>
      </aside>

      <div className="er-assessment-main">
        {selected ? (
          <AssessmentWorkspace key={selected.id} record={selected} />
        ) : (
          <div className="card">
            <EmptyState
              icon={SearchCheck}
              title="Select a request"
              message="Choose a submitted request from the queue to start the technical assessment."
            />
          </div>
        )}
      </div>
    </div>
  );
}
