import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RotateCcw, Send, XCircle } from 'lucide-react';
import { Button, Card, Input, Select, StatusBadge, Textarea } from '../../components/common';
import { useConcept } from '../../context/ConceptContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  REVIEW_STATUSES,
  conceptIsApproved,
  conceptReviewStatus,
  reviewStatusTone,
} from '../../data/conceptData';

/**
 * Concept Review & Selection gate.
 *
 * Decisions are recorded explicitly by the reviewer: submitting for review,
 * approving, rejecting or returning for modification. Approval appends to the
 * decision history; nothing is approved automatically and a concept can only be
 * selected after an Approved review.
 */
export default function ConceptReviewPanel({ concept }) {
  const { updateConcept } = useConcept();
  const [reviewer, setReviewer] = useState('');
  const [reviewDate, setReviewDate] = useState(TODAY);
  const [decision, setDecision] = useState('Approved');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [corrections, setCorrections] = useState('');
  const [banner, setBanner] = useState(null);

  const review = concept.review || {};
  const status = conceptReviewStatus(concept);

  useEffect(() => {
    setReviewer(review.reviewer || '');
    setReviewDate(review.reviewDate || TODAY);
    setDecision(review.decision || 'Approved');
    setReason('');
    setComments(review.comments || '');
    setCorrections(review.corrections || '');
    setBanner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept.id]);

  const applyDecision = (nextStatus) => {
    if (!reviewer.trim()) {
      setBanner({ tone: 'error', message: 'Record the reviewer before changing the review status.' });
      return;
    }
    if (!reviewDate) {
      setBanner({ tone: 'error', message: 'Record the review date before changing the review status.' });
      return;
    }
    if (nextStatus !== 'Submitted for Review' && !reason.trim()) {
      setBanner({
        tone: 'error',
        message: 'Record the reason for the review decision.',
      });
      return;
    }
    if (nextStatus === 'Returned for Modification' && !corrections.trim()) {
      setBanner({
        tone: 'error',
        message: 'List the required corrections when returning a concept for modification.',
      });
      return;
    }

    const historyEntry = {
      at: TODAY,
      by: reviewer.trim(),
      status: nextStatus,
      decision: nextStatus === 'Submitted for Review' ? 'Submitted for Review' : decision,
      reason: reason.trim(),
      comments: comments.trim(),
      corrections: corrections.trim(),
    };

    const conceptStatus =
      nextStatus === 'Submitted for Review' || nextStatus === 'Under Review'
        ? 'Under Evaluation'
        : nextStatus === 'Approved'
          ? 'Shortlisted'
          : nextStatus === 'Rejected'
            ? 'Rejected'
            : 'In Development';

    updateConcept(concept.id, {
      status: conceptStatus,
      review: {
        ...review,
        status: nextStatus,
        reviewer: reviewer.trim(),
        reviewDate,
        decision: nextStatus === 'Submitted for Review' ? '' : decision,
        reason: reason.trim(),
        comments: comments.trim(),
        corrections: corrections.trim(),
        history: [...(review.history || []), historyEntry],
      },
    });

    setReason('');
    setBanner({
      tone: 'success',
      message:
        nextStatus === 'Submitted for Review'
          ? `${concept.id} submitted for review.`
          : `${concept.id} recorded as ${nextStatus}.`,
    });
  };

  return (
    <Card
      title="Concept Review & Selection Gate"
      subtitle="Review decisions are recorded by the reviewer; selection stays blocked until the review is Approved"
      icon={ClipboardCheck}
      actions={
        <>
          <StatusBadge status={status} tone={reviewStatusTone(status)} />
          {conceptIsApproved(concept) && (
            <span className="chip chip-mint">Eligible for selection</span>
          )}
        </>
      }
    >
      {banner && (
        <div className={`form-banner ${banner.tone}`} role="status">
          <span>{banner.message}</span>
        </div>
      )}

      <div className="form-grid">
        <Select
          id="review-reviewer"
          label="Reviewer"
          options={[
            { value: '', label: 'Select reviewer' },
            ...ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
          ]}
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
        />
        <Input
          id="review-date"
          label="Review Date"
          type="date"
          value={reviewDate}
          onChange={(event) => setReviewDate(event.target.value)}
        />
        <Select
          id="review-decision"
          label="Decision"
          options={[
            { value: '', label: 'No decision recorded' },
            ...REVIEW_STATUSES.filter((row) =>
              ['Approved', 'Rejected', 'Returned for Modification'].includes(row),
            ).map((row) => ({ value: row, label: row })),
          ]}
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
        />
        <div className="form-field">
          <span className="form-label">Approved For Selection</span>
          <span className="form-static">
            {conceptIsApproved(concept) ? 'Yes — review approved' : 'No — review not approved'}
          </span>
        </div>
        <div className="form-grid-full">
          <Textarea
            id="review-reason"
            label="Reason"
            rows={2}
            placeholder="Why this decision was made"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="form-grid-full">
          <Textarea
            id="review-comments"
            label="Review Comments"
            rows={2}
            placeholder="Reviewer comments for the concept owner"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
          />
        </div>
        <div className="form-grid-full">
          <Textarea
            id="review-corrections"
            label="Required Corrections"
            rows={2}
            placeholder="Corrections required before the concept can be re-reviewed"
            value={corrections}
            onChange={(event) => setCorrections(event.target.value)}
          />
        </div>
      </div>

      <div className="cd-review-actions">
        <div className="cd-review-buttons">
          <Button variant="ghost" icon={Send} onClick={() => applyDecision('Submitted for Review')}>
            Submit for Review
          </Button>
          <Button variant="secondary" icon={RotateCcw} onClick={() => applyDecision('Returned for Modification')}>
            Return for Modification
          </Button>
          <Button variant="secondary" icon={XCircle} onClick={() => applyDecision('Rejected')}>
            Reject
          </Button>
          <Button icon={CheckCircle2} onClick={() => applyDecision('Approved')}>
            Approve
          </Button>
        </div>
      </div>

      <div className="plan-review-history">
        <h3 className="dash-section-title">Decision History</h3>
        {(review.history || []).length === 0 ? (
          <p className="dash-note">No review decisions recorded for this concept yet.</p>
        ) : (
          <ul className="plan-comment-list">
            {[...review.history]
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`}>
                  <strong>
                    {entry.status} · {entry.by}
                  </strong>
                  <span className="cell-muted">{formatDate(entry.at)}</span>
                  {entry.reason && <p>Reason: {entry.reason}</p>}
                  {entry.comments && <p>Comments: {entry.comments}</p>}
                  {entry.corrections && <p>Corrections: {entry.corrections}</p>}
                </li>
              ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
