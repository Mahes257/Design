import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  ClipboardPen,
  FileSearch,
  FileText,
  Receipt,
  Save,
  Send,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Select, StatusBadge, Textarea } from '../../components/common';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import { useQuotationReview } from '../../context/QuotationReviewContext';
import { formatMoney } from '../../data/quotationReviewData';
import { formatDate, formatStamp } from '../../data/customerEnquiryData';
import {
  ATTACHMENT_SIZE_LIMIT_NOTICE,
  QUOTATION_STAGES,
  QUOTATION_STAGE_TONES,
  hydrateCommercial,
  nextQuotationNumber,
  quotationEligibility,
  quotationStageError,
  requesterLabel,
} from '../../data/enquiryRequestData';
import { AttachmentPicker, RequestSource, RequestStatus } from './enquiryRequestUi';

const STAGE_ORDER = QUOTATION_STAGES;

function stageIndex(stage) {
  return Math.max(0, STAGE_ORDER.indexOf(stage || 'Draft'));
}

function totalCost(cost) {
  return ['estimatedCost', 'materialCost', 'engineeringCost', 'otherCost'].reduce(
    (sum, key) => sum + (Number(String(cost?.[key] || '').replace(/,/g, '')) || 0),
    0,
  );
}

function newCommercialDraft(record, requests, quotations) {
  return {
    cost: {
      reference: '',
      estimatedCost: '',
      materialCost: '',
      engineeringCost: '',
      otherCost: '',
      bomReference: '',
      notes: '',
    },
    technical: {
      quotationNumber: nextQuotationNumber(requests, quotations),
      revision: 'A',
      date: record.requestDate,
      scope: record.title,
      specifications: record.description,
      delivery: '',
      terms: '',
      documents: [],
    },
    commercialReview: {
      reviewer: '',
      price: '',
      taxes: '',
      paymentTerms: '',
      deliveryTerms: '',
      validity: '',
      remarks: '',
      status: 'Not Started',
    },
    submission: { date: '', reference: '', by: '', document: '', remarks: '' },
    acceptance: { decision: '', date: '', poReference: '', remarks: '', documents: [] },
    stage: 'Draft',
    stageHistory: [],
  };
}

function CommercialWorkspace({ record }) {
  const navigate = useNavigate();
  const { requests, saveCommercial, moveQuotationStage } = useEnquiryRequests();
  const { quotations } = useQuotationReview();
  const [draft, setDraft] = useState(() =>
    record.commercial
      ? hydrateCommercial(record.commercial)
      : newCommercialDraft(record, requests, quotations),
  );
  const [message, setMessage] = useState(null);
  const [acceptanceForm, setAcceptanceForm] = useState({
    decision: 'Accepted',
    date: '',
    poReference: '',
    remarks: '',
  });

  // Re-sync with the stored quotation after a save or stage change.
  useEffect(() => {
    if (record.commercial) setDraft(hydrateCommercial(record.commercial));
  }, [record.commercial, record.updatedAt]);

  const stage = draft.stage || 'Draft';
  const eligibility = quotationEligibility(record);
  const estimate = totalCost(draft.cost);
  const total = Number(String(draft.commercialReview.price || '').replace(/,/g, '')) || 0;

  const setSection = (section, key, value) => {
    setDraft((previous) => ({ ...previous, [section]: { ...previous[section], [key]: value } }));
    setMessage(null);
  };

  const save = () => {
    const result = saveCommercial(record.id, draft, { create: !record.commercial });
    if (result?.error) {
      setMessage({ tone: 'error', text: result.error });
      return false;
    }
    setMessage({ tone: 'success', text: 'Quotation and commercial information saved.' });
    return true;
  };

  const advance = (nextStage, payload = {}) => {
    if (!save()) return;
    const result = moveQuotationStage(record.id, nextStage, {
      by: draft.commercialReview.reviewer || 'Sales',
      commercial: draft,
      ...payload,
    });
    if (result?.error) setMessage({ tone: 'error', text: result.error });
    else setMessage({ tone: 'success', text: `Quotation moved to ${nextStage}.` });
  };

  const nextStage = STAGE_ORDER[stageIndex(stage) + 1];
  const stageBlock = nextStage ? quotationStageError(draft, nextStage) : '';
  const canAdvance = Boolean(nextStage) && !stageBlock && !['Accepted', 'Rejected'].includes(stage);

  return (
    <div className="er-commercial">
      <header className="er-panel-head">
        <div>
          <span className="er-kicker">Quotation &amp; commercial review</span>
          <h2>
            {record.id} · {record.title}
          </h2>
          <div className="er-badge-row">
            <RequestSource source={record.source} />
            <RequestStatus status={record.status} />
            {record.commercial && <StatusBadge status={stage} tone={QUOTATION_STAGE_TONES[stage]} />}
            <span className="chip">{requesterLabel(record)}</span>
          </div>
        </div>
        <div className="er-panel-actions">
          <Button
            variant="secondary"
            icon={FileSearch}
            onClick={() => navigate(`/customer-sales/requests/${record.id}`)}
          >
            Open Request
          </Button>
          <Button icon={Save} onClick={save}>
            Save Quotation
          </Button>
        </div>
      </header>

      {!eligibility.eligible && (
        <div className="er-blocker">
          <strong>Quotation work is not available</strong>
          <p>{eligibility.reason}</p>
        </div>
      )}

      {message && (
        <div className={`form-banner ${message.tone === 'error' ? 'error' : ''}`} role="status">
          <span>{message.text}</span>
        </div>
      )}

      <ol className="er-stage-track" aria-label="Quotation stages">
        {STAGE_ORDER.map((stageName, index) => {
          const current = stageIndex(stage);
          const state = index < current ? 'is-done' : index === current ? 'is-current' : '';
          return (
            <li key={stageName} className={state}>
              <span className="er-stage-number">{String(index + 1).padStart(2, '0')}</span>
              <strong>{stageName}</strong>
            </li>
          );
        })}
      </ol>

      <div className="er-commercial-grid">
        <section className="card er-section">
          <div className="er-section-head">
            <h3>
              <Calculator aria-hidden="true" /> A · Cost Estimation Reference
            </h3>
            <span className="er-section-note">Reuses the BOM &amp; Cost Estimation figures</span>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="er-cost-ref">
                Cost Estimation Reference
              </label>
              <input
                id="er-cost-ref"
                className="form-input"
                value={draft.cost.reference}
                placeholder="e.g. CE-2026-014"
                onChange={(event) => setSection('cost', 'reference', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-cost-bom">
                BOM Reference
              </label>
              <input
                id="er-cost-bom"
                className="form-input"
                value={draft.cost.bomReference}
                placeholder="e.g. BOM-2026-004"
                onChange={(event) => setSection('cost', 'bomReference', event.target.value)}
              />
              <span className="form-hint">
                Prepared in <Link to="/bom-cost/cost">BOM &amp; Cost Estimation</Link>; no duplicate
                cost system is created.
              </span>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-cost-estimated">
                Estimated Cost
              </label>
              <input
                id="er-cost-estimated"
                className="form-input"
                inputMode="decimal"
                value={draft.cost.estimatedCost}
                onChange={(event) => setSection('cost', 'estimatedCost', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-cost-material">
                Material Cost
              </label>
              <input
                id="er-cost-material"
                className="form-input"
                inputMode="decimal"
                value={draft.cost.materialCost}
                onChange={(event) => setSection('cost', 'materialCost', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-cost-engineering">
                Development / Engineering Cost
              </label>
              <input
                id="er-cost-engineering"
                className="form-input"
                inputMode="decimal"
                value={draft.cost.engineeringCost}
                onChange={(event) => setSection('cost', 'engineeringCost', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-cost-other">
                Other Applicable Costs
              </label>
              <input
                id="er-cost-other"
                className="form-input"
                inputMode="decimal"
                value={draft.cost.otherCost}
                onChange={(event) => setSection('cost', 'otherCost', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-cost-notes"
                label="Cost Estimation Notes"
                rows={2}
                value={draft.cost.notes}
                onChange={(event) => setSection('cost', 'notes', event.target.value)}
              />
            </div>
            <div className="form-field form-grid-full">
              <span className="form-label">Indicative Cost Total</span>
              <span className="er-cost-total">{formatMoney(estimate)}</span>
            </div>
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>
              <ClipboardPen aria-hidden="true" /> B · Technical Quotation
            </h3>
            <span className="er-section-note">Revision history is preserved on every save</span>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="er-quotation-number">
                Quotation Number *
              </label>
              <input
                id="er-quotation-number"
                className="form-input"
                value={draft.technical.quotationNumber}
                onChange={(event) => setSection('technical', 'quotationNumber', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-quotation-revision">
                Quotation Revision
              </label>
              <select
                id="er-quotation-revision"
                className="form-select"
                value={draft.technical.revision}
                onChange={(event) => setSection('technical', 'revision', event.target.value)}
              >
                {['A', 'B', 'C', 'D', 'E'].map((revision) => (
                  <option key={revision} value={revision}>
                    Rev {revision}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-quotation-date">
                Quotation Date
              </label>
              <input
                id="er-quotation-date"
                type="date"
                className="form-input"
                value={draft.technical.date}
                onChange={(event) => setSection('technical', 'date', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-quotation-scope"
                label="Product / Scope Description *"
                rows={2}
                value={draft.technical.scope}
                onChange={(event) => setSection('technical', 'scope', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-quotation-specs"
                label="Technical Specifications *"
                rows={3}
                value={draft.technical.specifications}
                onChange={(event) => setSection('technical', 'specifications', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-quotation-delivery"
                label="Delivery Expectations *"
                rows={2}
                value={draft.technical.delivery}
                onChange={(event) => setSection('technical', 'delivery', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-quotation-terms"
                label="Technical Terms *"
                rows={2}
                value={draft.technical.terms}
                onChange={(event) => setSection('technical', 'terms', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <AttachmentPicker
                label="Supporting Documents"
                documents={draft.technical.documents}
                onChange={(documents) => setSection('technical', 'documents', documents)}
              />
            </div>
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>
              <Receipt aria-hidden="true" /> C · Commercial Review
            </h3>
            <span className="chip">{draft.commercialReview.status || 'Not Started'}</span>
          </div>
          <div className="form-grid">
            <Select
              id="er-commercial-reviewer"
              label="Commercial Reviewer"
              value={draft.commercialReview.reviewer || ''}
              options={[
                { value: '', label: 'Select reviewer' },
                ...['R. Kulkarni', 'A. Iyer', 'S. Menon', 'P. Deshmukh', 'N. Joshi'].map((name) => ({
                  value: name,
                  label: name,
                })),
              ]}
              onChange={(event) => setSection('commercialReview', 'reviewer', event.target.value)}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="er-commercial-price">
                Price *
              </label>
              <input
                id="er-commercial-price"
                className="form-input"
                inputMode="decimal"
                value={draft.commercialReview.price}
                onChange={(event) => setSection('commercialReview', 'price', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-commercial-taxes">
                Taxes
              </label>
              <input
                id="er-commercial-taxes"
                className="form-input"
                value={draft.commercialReview.taxes}
                placeholder="e.g. GST 18% extra"
                onChange={(event) => setSection('commercialReview', 'taxes', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-commercial-payment">
                Payment Terms *
              </label>
              <input
                id="er-commercial-payment"
                className="form-input"
                value={draft.commercialReview.paymentTerms}
                placeholder="e.g. 30% advance, balance before dispatch"
                onChange={(event) => setSection('commercialReview', 'paymentTerms', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-commercial-delivery-terms">
                Delivery Terms *
              </label>
              <input
                id="er-commercial-delivery-terms"
                className="form-input"
                value={draft.commercialReview.deliveryTerms}
                placeholder="e.g. Ex-works, 8 weeks from PO"
                onChange={(event) => setSection('commercialReview', 'deliveryTerms', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-commercial-validity">
                Validity Period *
              </label>
              <input
                id="er-commercial-validity"
                className="form-input"
                value={draft.commercialReview.validity}
                placeholder="e.g. 30 days"
                onChange={(event) => setSection('commercialReview', 'validity', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-commercial-remarks"
                label="Commercial Remarks"
                rows={2}
                value={draft.commercialReview.remarks}
                onChange={(event) => setSection('commercialReview', 'remarks', event.target.value)}
              />
            </div>
            {total > 0 && (
              <div className="form-field form-grid-full">
                <span className="form-label">Quoted Value</span>
                <span className="er-cost-total">{formatMoney(total)}</span>
              </div>
            )}
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>
              <Send aria-hidden="true" /> D · Quotation Submission
            </h3>
            <span className="er-section-note">Recorded when the quotation reaches the customer</span>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="er-submission-date">
                Submission Date *
              </label>
              <input
                id="er-submission-date"
                type="date"
                className="form-input"
                value={draft.submission.date}
                onChange={(event) => setSection('submission', 'date', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-submission-reference">
                Submission Reference *
              </label>
              <input
                id="er-submission-reference"
                className="form-input"
                value={draft.submission.reference}
                placeholder="e.g. MAIL-2026-1187"
                onChange={(event) => setSection('submission', 'reference', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-submission-by">
                Submitted By *
              </label>
              <input
                id="er-submission-by"
                className="form-input"
                value={draft.submission.by}
                onChange={(event) => setSection('submission', 'by', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-submission-document">
                Quotation Document
              </label>
              <input
                id="er-submission-document"
                className="form-input"
                value={draft.submission.document}
                placeholder="e.g. QTN-2026-019-RevA.pdf"
                onChange={(event) => setSection('submission', 'document', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-submission-remarks"
                label="Submission Remarks"
                rows={2}
                value={draft.submission.remarks}
                onChange={(event) => setSection('submission', 'remarks', event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="card er-section">
          <div className="er-section-head">
            <h3>
              <ThumbsUp aria-hidden="true" /> E · Customer Acceptance / Rejection
            </h3>
            <span className="er-section-note">Only an accepted quotation can create a project</span>
          </div>
          <div className="form-grid">
            <Select
              id="er-acceptance-decision"
              label="Customer Decision"
              value={draft.acceptance.decision || ''}
              options={[
                { value: '', label: 'Awaiting customer decision' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
              onChange={(event) => {
                setAcceptanceForm((previous) => ({ ...previous, decision: event.target.value }));
                setSection('acceptance', 'decision', event.target.value);
              }}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="er-acceptance-date">
                Decision Date
              </label>
              <input
                id="er-acceptance-date"
                type="date"
                className="form-input"
                value={acceptanceForm.date || draft.acceptance.date}
                onChange={(event) =>
                  setAcceptanceForm((previous) => ({ ...previous, date: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="er-acceptance-po">
                Customer PO Reference
              </label>
              <input
                id="er-acceptance-po"
                className="form-input"
                value={acceptanceForm.poReference || draft.acceptance.poReference}
                onChange={(event) =>
                  setAcceptanceForm((previous) => ({ ...previous, poReference: event.target.value }))
                }
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="er-acceptance-remarks"
                label="Acceptance / Rejection Remarks"
                rows={2}
                value={acceptanceForm.remarks || draft.acceptance.remarks}
                onChange={(event) =>
                  setAcceptanceForm((previous) => ({ ...previous, remarks: event.target.value }))
                }
              />
            </div>
            <div className="form-grid-full">
              <AttachmentPicker
                label="Supporting Documents"
                documents={draft.acceptance.documents}
                onChange={(documents) => setSection('acceptance', 'documents', documents)}
              />
            </div>
          </div>
          <p className="er-section-note">{ATTACHMENT_SIZE_LIMIT_NOTICE}</p>
        </section>
      </div>

      <section className="card er-commercial-actions">
        <div>
          <h3>Quotation workflow</h3>
          <p>
            {['Accepted', 'Rejected'].includes(stage)
              ? `The customer has ${stage.toLowerCase()} this quotation.`
              : nextStage
                ? `Next stage: ${nextStage}. ${stageBlock || 'All requirements for this stage are complete.'}`
                : 'The quotation is complete.'}
          </p>
        </div>
        <div className="er-panel-actions">
          {!record.commercial && (
            <Button variant="secondary" icon={ClipboardPen} onClick={save}>
              Create Quotation Draft
            </Button>
          )}
          {record.commercial && stage === 'Submitted to Customer' && (
            <>
              <Button
                variant="ghost"
                icon={ThumbsDown}
                onClick={() =>
                  advance('Rejected', {
                    acceptanceDate: acceptanceForm.date,
                    remarks: acceptanceForm.remarks,
                  })
                }
              >
                Record Rejection
              </Button>
              <Button
                icon={ThumbsUp}
                onClick={() =>
                  advance('Accepted', {
                    acceptanceDate: acceptanceForm.date,
                    poReference: acceptanceForm.poReference,
                    remarks: acceptanceForm.remarks,
                  })
                }
              >
                Record Customer Acceptance
              </Button>
            </>
          )}
          {record.commercial && nextStage && !['Accepted', 'Rejected'].includes(stage) && (
            <Button icon={Send} disabled={!canAdvance} onClick={() => advance(nextStage)}>
              Move to {nextStage}
            </Button>
          )}
          {record.linkedProjectId && (
            <Button
              variant="secondary"
              icon={CheckCircle2}
              onClick={() => navigate(`/projects/${record.linkedProjectId}`)}
            >
              Open {record.linkedProjectId}
            </Button>
          )}
        </div>
      </section>

      <section className="card er-stage-history">
        <h3>Quotation Stage History</h3>
        {draft.stageHistory?.length ? (
          <ol>
            {[...draft.stageHistory].reverse().map((row) => (
              <li key={row.id}>
                <strong>{row.stage}</strong>
                <span>
                  {row.by} · {formatStamp(row.at)}
                </span>
                <p>{row.note}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="cell-muted">No quotation stage changes recorded yet.</p>
        )}
      </section>
    </div>
  );
}

function CommercialLink({ row, active }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={`er-queue-item${active ? ' is-active' : ''}`}
      onClick={() => navigate(`/customer-sales/commercial/${row.id}`)}
    >
      <span className="er-queue-top">
        <strong>{row.id}</strong>
        <RequestStatus status={row.status} />
      </span>
      <span className="er-queue-title">{row.title}</span>
      <span className="er-queue-meta">
        <span className="chip">{row.commercial?.technical?.quotationNumber || 'No quotation yet'}</span>
        <small>{formatDate(row.requestDate)}</small>
      </span>
    </button>
  );
}

export default function QuotationCommercialTab() {
  const { requestId } = useParams();
  const { requests } = useEnquiryRequests();
  const { quotations } = useQuotationReview();

  const candidates = useMemo(
    () =>
      requests
        .filter((row) => row.source === 'Customer')
        .filter((row) =>
          [
            'Accepted',
            'Quotation in Progress',
            'Submitted to Customer',
            'Quotation Accepted',
            'Quotation Rejected',
            'Converted to Project',
          ].includes(row.status),
        ),
    [requests],
  );

  const selected = candidates.find((row) => row.id === requestId) || candidates[0] || null;

  return (
    <div className="er-assessment-layout">
      <aside className="card er-assessment-list">
        <div className="er-list-head">
          <div>
            <span className="er-kicker">Customer requests</span>
            <h2>Quotation workspace</h2>
          </div>
          <span className="chip chip-mint">{candidates.length}</span>
        </div>
        <ul className="er-queue">
          {candidates.map((row) => (
            <li key={row.id}>
              <CommercialLink row={row} active={row.id === selected?.id} />
            </li>
          ))}
          {candidates.length === 0 && (
            <li>
              <p className="cell-muted er-empty-note">
                No customer request has been technically accepted yet. R&amp;D / PDE, Service and
                Inter-Department requests never enter this quotation workflow.
              </p>
            </li>
          )}
        </ul>
        <div className="er-existing-quotations">
          <h3>
            <FileText aria-hidden="true" /> Existing quotation register
          </h3>
          <p>{quotations.length} quotation record(s) kept from the previous module.</p>
          <ul>
            {quotations.slice(0, 6).map((quotation) => (
              <li key={quotation.id}>
                <Link to={`/quotation-review/${quotation.id}`}>
                  <strong>{quotation.quotationRef || quotation.id}</strong>
                  <span>
                    Rev {quotation.revision} · {quotation.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="er-link" to="/quotation-review/new">
            Create quotation in the existing register
          </Link>
        </div>
      </aside>

      <div className="er-assessment-main">
        {selected ? (
          <CommercialWorkspace key={selected.id} record={selected} />
        ) : (
          <div className="card">
            <p className="cell-muted er-empty-note">
              Accept a customer request in Technical Assessment to start its quotation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
