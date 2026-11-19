import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  QUOTATION_REVIEWS,
  hydrateQuotation,
  isQuotationEditable,
  nextQuotationId,
  quotationTransitionError,
} from '../data/quotationReviewData';

const STORAGE_KEY = 'md-quotation-review-state-v1';
const QuotationReviewContext = createContext(null);

function localDate() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localStamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${localDate()}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function makeHistory(record, { action, by = 'N. Joshi', detail = '', status, at = localStamp() }) {
  return {
    id: `${record.id}-H${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    at,
    action,
    by,
    detail,
    status: status || record.status,
  };
}

function withHistory(record, event) {
  const at = event.at || localStamp();
  return {
    ...record,
    updatedAt: at,
    history: [...(record.history || []), makeHistory(record, { ...event, at })],
  };
}

function loadQuotations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed?.quotations) && parsed.quotations.length > 0) {
      return parsed.quotations.map(hydrateQuotation).filter(Boolean);
    }
  } catch {
    // fall through to seeded quotations
  }
  return QUOTATION_REVIEWS.map(hydrateQuotation).filter(Boolean);
}

export function QuotationReviewProvider({ children }) {
  const [quotations, setQuotations] = useState(loadQuotations);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ quotations }));
    } catch {
      // Storage can be unavailable; the module still works for this session.
    }
  }, [quotations]);

  const value = useMemo(() => {
    const getQuotation = (id) => quotations.find((record) => record.id === id);

    const addQuotation = (record) => {
      if (!record?.linkedEnquiryId) return { error: 'Select a customer enquiry.' };
      if (
        record.status === 'Technical Review' &&
        !record.review?.assignedReviewer
      ) {
        return { error: 'Assign a technical reviewer before starting review.' };
      }

      const now = localStamp();
      const id = nextQuotationId(quotations);
      let saved = hydrateQuotation({
        ...record,
        id,
        quotationRef: id,
        createdAt: now,
        updatedAt: now,
        history: [],
      });
      saved = withHistory(saved, {
        action: 'Quotation created',
        by: record.salesContact || 'Sales',
        detail: `Linked to ${record.linkedEnquiryId} · ${record.productConfiguration || 'configuration pending'}`,
        status: saved.status,
        at: now,
      });
      if (saved.status === 'Technical Review') {
        saved = withHistory(saved, {
          action: 'Technical review started',
          by: saved.review?.assignedReviewer || 'N. Joshi',
          detail: 'Quotation submitted for technical feasibility review.',
          status: saved.status,
        });
      }
      setQuotations((previous) => [saved, ...previous]);
      return { id: saved.id };
    };

    const updateQuotation = (id, patch) => {
      const record = getQuotation(id);
      if (!record) return { error: 'Quotation not found.' };
      if (!isQuotationEditable(record)) {
        return { error: `${record.status} quotations are locked and cannot be edited.` };
      }

      setQuotations((previous) =>
        previous.map((row) => {
          if (row.id !== id) return row;
          const next = hydrateQuotation({
            ...row,
            ...patch,
            id: row.id,
            quotationRef: row.quotationRef,
            status: row.status,
            createdAt: row.createdAt,
            convertedProjectId: row.convertedProjectId,
            history: row.history,
          });
          return withHistory(next, {
            action: 'Quotation details updated',
            by: patch.salesContact || row.salesContact || 'N. Joshi',
            detail: 'Configuration, feasibility, estimates or review assignment updated.',
            status: row.status,
          });
        }),
      );
      return {};
    };

    const updateStatus = (id, nextStatus, payload = {}) => {
      const record = getQuotation(id);
      if (!record) return { error: 'Quotation not found.' };
      const error = quotationTransitionError(record, nextStatus, payload);
      if (error) return { error };

      const by = payload.by || record.salesContact || 'N. Joshi';
      const note = String(payload.note || '').trim();
      const reviewer = String(payload.reviewer || record.review?.assignedReviewer || '').trim();
      const today = localDate();

      setQuotations((previous) =>
        previous.map((row) => {
          if (row.id !== id) return row;
          const isReviewOutcome =
            nextStatus === 'Technically Accepted' || nextStatus === 'Changes Requested';
          const review = {
            ...row.review,
            assignedReviewer: reviewer || row.review?.assignedReviewer || '',
            assignedOn:
              reviewer && !row.review?.assignedOn ? today : row.review?.assignedOn || today,
            ...(nextStatus === 'Technical Review'
              ? { outcome: '', reviewedOn: '' }
              : {}),
            ...(isReviewOutcome
              ? {
                  reviewedOn: today,
                  outcome: nextStatus,
                  comments: note || row.review?.comments || '',
                }
              : {}),
          };

          const next = hydrateQuotation({
            ...row,
            status: nextStatus,
            review,
            convertedProjectId: row.convertedProjectId,
            ...(nextStatus === 'Customer Submitted'
              ? {
                  submittedToCustomerAt: today,
                  customerReference:
                    String(payload.customerReference || '').trim() || row.customerReference,
                }
              : {}),
            ...(nextStatus === 'Accepted' ||
            nextStatus === 'Rejected' ||
            nextStatus === 'Expired'
              ? {
                  decisionAt: today,
                  decisionNote: note || row.decisionNote || '',
                }
              : {}),
          });

          const actionMap = {
            'Technical Review': 'Technical review started',
            'Technically Accepted': 'Technical basis accepted',
            'Changes Requested': 'Changes requested',
            'Ready for Sales': 'Released to sales',
            'Customer Submitted': 'Quotation submitted to customer',
            Accepted: 'Customer accepted quotation',
            Rejected: 'Customer rejected quotation',
            Expired: 'Quotation expired',
          };

          return withHistory(next, {
            action: actionMap[nextStatus] || `Status updated to ${nextStatus}`,
            by:
              isReviewOutcome || nextStatus === 'Technical Review'
                ? reviewer || by
                : by,
            detail:
              note ||
              (nextStatus === 'Customer Submitted'
                ? `Customer reference ${next.customerReference || 'pending'}.`
                : nextStatus === 'Accepted'
                  ? 'Customer accepted the quotation. Project initiation is now available.'
                  : 'Quotation workflow advanced.'),
            status: nextStatus,
          });
        }),
      );
      return {};
    };

    const markConverted = (id, projectId) => {
      const record = getQuotation(id);
      if (!record) return { error: 'Quotation not found.' };
      if (record.status !== 'Accepted') {
        return { error: 'Only an accepted quotation can initiate a project.' };
      }
      if (record.convertedProjectId) {
        return { error: `A project has already been created: ${record.convertedProjectId}.` };
      }
      if (!projectId) return { error: 'Project reference is required.' };

      setQuotations((previous) =>
        previous.map((row) =>
          row.id === id
            ? withHistory(
                {
                  ...row,
                  convertedProjectId: projectId,
                  updatedAt: localStamp(),
                },
                {
                  action: 'Project initiated',
                  by: 'N. Joshi',
                  detail: `Accepted quotation ${row.quotationRef} created project ${projectId}.`,
                  status: row.status,
                },
              )
            : row,
        ),
      );
      return {};
    };

    const resetQuotations = () =>
      setQuotations(QUOTATION_REVIEWS.map(hydrateQuotation).filter(Boolean));

    return {
      quotations,
      getQuotation,
      nextQuotationId: () => nextQuotationId(quotations),
      addQuotation,
      updateQuotation,
      updateStatus,
      markConverted,
      resetQuotations,
    };
  }, [quotations]);

  return (
    <QuotationReviewContext.Provider value={value}>{children}</QuotationReviewContext.Provider>
  );
}

export function useQuotationReview() {
  const context = useContext(QuotationReviewContext);
  if (!context) {
    throw new Error('useQuotationReview must be used inside a QuotationReviewProvider');
  }
  return context;
}
