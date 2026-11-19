import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CUSTOMER_ENQUIRIES,
  hydrateEnquiry,
  nextEnquiryId,
  transitionError,
} from '../data/customerEnquiryData';

const STORAGE_KEY = 'md-customer-enquiry-state-v1';
const CustomerEnquiryContext = createContext(null);

function localStamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function historyEntry(record, { action, by = 'N. Joshi', detail = '', status, at = localStamp() }) {
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
    history: [...(record.history || []), historyEntry(record, { ...event, at })],
  };
}

function loadEnquiries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed?.enquiries) && parsed.enquiries.length > 0) {
      return parsed.enquiries.map(hydrateEnquiry).filter(Boolean);
    }
  } catch {
    // fall through to the seeded enquiries
  }
  return CUSTOMER_ENQUIRIES.map(hydrateEnquiry).filter(Boolean);
}

export function CustomerEnquiryProvider({ children }) {
  const [enquiries, setEnquiries] = useState(loadEnquiries);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enquiries }));
    } catch {
      // Storage can be unavailable; the register still works for this session.
    }
  }, [enquiries]);

  const value = useMemo(() => {
    const getEnquiry = (id) => enquiries.find((record) => record.id === id);

    const patchEnquiry = (id, updater) =>
      setEnquiries((previous) =>
        previous.map((record) => (record.id === id ? hydrateEnquiry(updater(record)) : record)),
      );

    const addEnquiry = (record) => {
      const now = localStamp();
      const saved = hydrateEnquiry({
        ...record,
        createdAt: now,
        updatedAt: now,
        history: [],
        documents: record.documents || [],
        clarifications: record.clarifications || [],
      });
      const withEvent = withHistory(saved, {
        action: record.status === 'Submitted' ? 'Enquiry submitted' : 'Enquiry created',
        by: record.salesContact || 'Sales',
        detail:
          record.status === 'Submitted'
            ? 'Created and sent to engineering for technical review.'
            : 'Draft created in the customer enquiry register.',
        status: record.status,
        at: now,
      });
      setEnquiries((previous) => [withEvent, ...previous]);
      return { id: withEvent.id };
    };

    const updateEnquiry = (id, patch) => {
      const record = getEnquiry(id);
      if (!record) return { error: 'Enquiry not found.' };
      if (record.status === 'Closed') return { error: 'A closed enquiry cannot be edited.' };
      patchEnquiry(id, (row) =>
        withHistory(
          {
            ...row,
            ...patch,
            id: row.id,
            status: row.status,
            createdAt: row.createdAt,
            documents: row.documents,
            clarifications: row.clarifications,
          },
          {
            action: 'Enquiry details updated',
            by: patch.engineeringContact || row.engineeringContact || 'N. Joshi',
            detail: 'Customer, requirement or technical specification fields were updated.',
            status: row.status,
          },
        ),
      );
      return {};
    };

    const updateStatus = (id, nextStatus, { by = 'N. Joshi', note = '', quotationRef = '' } = {}) => {
      const record = getEnquiry(id);
      if (!record) return { error: 'Enquiry not found.' };
      const error = transitionError(record, nextStatus, { quotationRef });
      if (error) return { error };

      patchEnquiry(id, (row) => {
        const next = {
          ...row,
          status: nextStatus,
          quotationRef:
            nextStatus === 'Quotation Prepared'
              ? quotationRef.trim() || row.quotationRef
              : nextStatus === 'Closed'
                ? row.quotationRef
                : row.quotationRef,
          ...(nextStatus === 'Closed'
            ? { closedAt: localStamp(), closedBy: by }
            : {}),
        };
        const action =
          nextStatus === 'Quotation Prepared'
            ? 'Quotation prepared'
            : nextStatus === 'Ready for Quotation'
              ? 'Ready for quotation'
              : nextStatus === 'Closed'
                ? 'Enquiry closed'
                : `Status updated to ${nextStatus}`;
        return withHistory(next, {
          action,
          by,
          detail:
            note.trim() ||
            (nextStatus === 'Quotation Prepared'
              ? `Quotation reference ${next.quotationRef}.`
              : nextStatus === 'Ready for Quotation'
                ? 'Technical requirements complete; enquiry is suitable for quotation.'
                : ''),
          status: nextStatus,
        });
      });
      return {};
    };

    const attachDocument = (id, documentRecord) => {
      const record = getEnquiry(id);
      if (!record) return { error: 'Enquiry not found.' };
      if (!documentRecord?.name) return { error: 'Select a customer document to attach.' };
      if (record.status === 'Closed') return { error: 'Documents cannot be added to a closed enquiry.' };
      const doc = {
        ...documentRecord,
        id: `DOC-${id}-${Date.now()}`,
        uploadedAt: localStamp(),
        uploadedBy: documentRecord.uploadedBy || 'N. Joshi',
      };
      patchEnquiry(id, (row) =>
        withHistory(
          { ...row, documents: [...(row.documents || []), doc] },
          {
            action: 'Customer document attached',
            by: doc.uploadedBy,
            detail: `${doc.name} · ${doc.category}`,
            status: row.status,
          },
        ),
      );
      return {};
    };

    const removeDocument = (id, documentId) => {
      const record = getEnquiry(id);
      if (!record) return { error: 'Enquiry not found.' };
      const doc = (record.documents || []).find((item) => item.id === documentId);
      if (!doc) return { error: 'Document not found.' };
      if (record.status === 'Closed') return { error: 'Documents cannot be removed from a closed enquiry.' };
      patchEnquiry(id, (row) =>
        withHistory(
          { ...row, documents: (row.documents || []).filter((item) => item.id !== documentId) },
          {
            action: 'Customer document removed',
            by: 'N. Joshi',
            detail: doc.name,
            status: row.status,
          },
        ),
      );
      return {};
    };

    const raiseClarification = (id, clarification) => {
      const record = getEnquiry(id);
      if (!record) return { error: 'Enquiry not found.' };
      if (!['Submitted', 'Under Technical Review', 'Clarification Required'].includes(record.status)) {
        return { error: 'Clarifications can be raised after the enquiry is submitted.' };
      }
      if (!clarification?.topic?.trim() || !clarification?.question?.trim()) {
        return { error: 'Add a clarification topic and question.' };
      }
      patchEnquiry(id, (row) => {
        const sequence = (row.clarifications || []).length + 1;
        const item = {
          id: `CL-${row.id}-${String(sequence).padStart(2, '0')}`,
          topic: clarification.topic.trim(),
          question: clarification.question.trim(),
          raisedOn: localStamp().slice(0, 10),
          raisedBy: clarification.raisedBy || row.engineeringContact || 'N. Joshi',
          status: 'Open',
          response: '',
          respondedBy: '',
          respondedOn: '',
        };
        return withHistory(
          {
            ...row,
            status: 'Clarification Required',
            clarifications: [...(row.clarifications || []), item],
          },
          {
            action: 'Clarification raised',
            by: item.raisedBy,
            detail: item.topic,
            status: 'Clarification Required',
          },
        );
      });
      return {};
    };

    const respondClarification = (id, clarificationId, { response, respondedBy = 'Sales' }) => {
      const record = getEnquiry(id);
      if (!record) return { error: 'Enquiry not found.' };
      if (record.status !== 'Clarification Required') {
        return { error: 'Only an enquiry in Clarification Required can accept a clarification response.' };
      }
      if (!response?.trim()) return { error: 'Enter the customer clarification response.' };
      const clarification = (record.clarifications || []).find((item) => item.id === clarificationId);
      if (!clarification) return { error: 'Clarification not found.' };
      if (clarification.status !== 'Open') return { error: 'This clarification has already been answered.' };

      patchEnquiry(id, (row) => {
        const clarifications = (row.clarifications || []).map((item) =>
          item.id === clarificationId
            ? {
                ...item,
                status: 'Responded',
                response: response.trim(),
                respondedBy,
                respondedOn: localStamp().slice(0, 10),
              }
            : item,
        );
        const stillOpen = clarifications.some((item) => item.status === 'Open');
        const nextStatus = stillOpen ? 'Clarification Required' : 'Under Technical Review';
        return withHistory(
          { ...row, clarifications, status: nextStatus },
          {
            action: 'Clarification responded',
            by: respondedBy,
            detail: stillOpen
              ? `${clarification.topic} answered; other clarifications remain open.`
              : `${clarification.topic} answered; technical review resumed.`,
            status: nextStatus,
          },
        );
      });
      return {};
    };

    const resetEnquiries = () => setEnquiries(CUSTOMER_ENQUIRIES.map(hydrateEnquiry).filter(Boolean));

    return {
      enquiries,
      getEnquiry,
      nextEnquiryId: () => nextEnquiryId(enquiries),
      addEnquiry,
      updateEnquiry,
      updateStatus,
      attachDocument,
      removeDocument,
      raiseClarification,
      respondClarification,
      resetEnquiries,
    };
  }, [enquiries]);

  return <CustomerEnquiryContext.Provider value={value}>{children}</CustomerEnquiryContext.Provider>;
}

export function useCustomerEnquiries() {
  const context = useContext(CustomerEnquiryContext);
  if (!context) {
    throw new Error('useCustomerEnquiries must be used inside a CustomerEnquiryProvider');
  }
  return context;
}
