import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DELETABLE_STATUSES,
  LOCKED_STATUSES,
  decideRequestStatus,
  hydrateCommercial,
  hydrateRequest,
  mergeCommercial,
  nextRequestId,
  quotationStageError,
  seedRequests,
  validateRequestForm,
} from '../data/enquiryRequestData';

/**
 * Module 01 — Enquiry & Request Management state.
 *
 * One persisted register for all four request sources. Existing customer
 * enquiries are migrated from `md-customer-enquiry-state-v1` on first load so
 * no record is lost; the module never overwrites or resets that legacy store.
 */
const STORAGE_KEY = 'md-enquiry-request-state-v1';
const LEGACY_KEY = 'md-customer-enquiry-state-v1';

const EnquiryRequestContext = createContext(null);

function pad(value) {
  return String(value).padStart(2, '0');
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function stamp() {
  const date = new Date();
  return `${today()}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function entry(record, { action, by = 'N. Joshi', detail = '', status, at = stamp() }) {
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
  const at = event.at || stamp();
  return {
    ...record,
    updatedAt: at,
    history: [...(record.history || []), entry(record, { ...event, at })],
  };
}

function readLegacyEnquiries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (Array.isArray(parsed?.enquiries) && parsed.enquiries.length > 0) {
      return parsed.enquiries;
    }
  } catch {
    // fall through to seeded enquiries
  }
  return null;
}

function loadRequests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed?.requests) && parsed.requests.length > 0) {
      return parsed.requests.map(hydrateRequest).filter(Boolean);
    }
  } catch {
    // fall through to migration / seed
  }
  return seedRequests(readLegacyEnquiries() || undefined);
}

export function EnquiryRequestProvider({ children }) {
  const [requests, setRequests] = useState(loadRequests);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ requests }));
    } catch {
      // Storage can be unavailable; the register still works for this session.
    }
  }, [requests]);

  const value = useMemo(() => {
    const getRequest = (id) => requests.find((record) => record.id === id);

    const patchRequest = (id, updater) =>
      setRequests((previous) =>
        previous.map((record) => (record.id === id ? hydrateRequest(updater(record)) : record)),
      );

    const addRequest = (form, { submit = false, by = 'Design Admin' } = {}) => {
      const errors = validateRequestForm(form, submit ? 'full' : 'draft');
      if (Object.keys(errors).length > 0) return { error: 'Complete the required fields.', errors };

      const id = nextRequestId(requests);
      const now = stamp();
      const status = submit ? 'Submitted' : 'Draft';
      const base = hydrateRequest({
        ...form,
        id,
        status,
        requester: form.sourceFields?.customerName || '',
        createdAt: now,
        updatedAt: now,
        history: [],
      });
      const saved = withHistory(base, {
        action: submit ? 'Request submitted' : 'Request created',
        by,
        detail: submit
          ? `${form.source} request submitted to mechanical design for technical assessment.`
          : 'Draft request created in the enquiry & request register.',
        status,
        at: now,
      });
      setRequests((previous) => [saved, ...previous]);
      return { id };
    };

    const updateRequest = (id, form, { by = 'Design Admin' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (LOCKED_STATUSES.includes(record.status)) {
        return { error: `${record.status} requests cannot be edited.` };
      }
      const errors = validateRequestForm(form, 'full');
      if (Object.keys(errors).length > 0) return { error: 'Complete the required fields.', errors };

      patchRequest(id, (row) =>
        withHistory(
          {
            ...row,
            ...form,
            id: row.id,
            status: row.status,
            assessment: row.assessment,
            commercial: row.commercial,
            createdAt: row.createdAt,
            documents: form.documents ?? row.documents,
            requester: form.sourceFields?.customerName || row.requester || '',
          },
          {
            action: 'Request details updated',
            by,
            detail: 'Request information and source-specific fields were updated.',
            status: row.status,
          },
        ),
      );
      return {};
    };

    const deleteRequest = (id, { by = 'Design Admin' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (!DELETABLE_STATUSES.includes(record.status)) {
        return {
          error: `Only Draft or Rejected requests can be deleted. ${record.id} is ${record.status}.`,
        };
      }
      if (record.linkedProjectId) {
        return { error: 'A converted request cannot be deleted.' };
      }
      setRequests((previous) => previous.filter((row) => row.id !== id));
      return {};
    };

    const startReview = (id, { by = 'N. Joshi' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (record.status !== 'Submitted') {
        return { error: `Review can only start on a Submitted request (current: ${record.status}).` };
      }
      patchRequest(id, (row) =>
        withHistory(
          {
            ...row,
            status: 'Under Initial Review',
            assessment: {
              ...row.assessment,
              reviewer: row.assessment.reviewer || row.assignedTo || by,
              reviewDate: row.assessment.reviewDate || today(),
            },
          },
          {
            action: 'Initial review started',
            by: row.assessment.reviewer || by,
            detail: 'Request accepted into the technical review queue.',
            status: 'Under Initial Review',
          },
        ),
      );
      return {};
    };

    const saveAssessment = (id, assessmentPatch, { by = 'N. Joshi' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (LOCKED_STATUSES.includes(record.status)) {
        return { error: `${record.status} requests cannot be re-assessed.` };
      }
      patchRequest(id, (row) =>
        withHistory(
          {
            ...row,
            assessment: {
              ...row.assessment,
              ...assessmentPatch,
              feasibility: { ...row.assessment.feasibility, ...(assessmentPatch.feasibility || {}) },
            },
          },
          {
            action: 'Technical assessment saved',
            by,
            detail: 'Assessment information saved without changing the request decision.',
            status: row.status,
          },
        ),
      );
      return {};
    };

    const raiseClarification = (id, { questions, reviewer, by = 'N. Joshi' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (!['Under Initial Review', 'Under Feasibility Assessment', 'Returned for Clarification'].includes(record.status)) {
        return { error: 'A clarification can only be raised while the request is under technical review.' };
      }
      if (!String(questions || '').trim()) return { error: 'Enter the clarification questions.' };

      patchRequest(id, (row) =>
        withHistory(
          {
            ...row,
            status: 'Clarification Required',
            assessment: {
              ...row.assessment,
              reviewer: reviewer || row.assessment.reviewer,
              reviewDate: row.assessment.reviewDate || today(),
              clarificationRequired: 'Yes',
              clarificationQuestions: String(questions).trim(),
              clarificationStatus: 'Open',
              clarificationRaisedAt: today(),
            },
          },
          {
            action: 'Clarification raised',
            by: reviewer || by,
            detail: String(questions).trim(),
            status: 'Clarification Required',
          },
        ),
      );
      return {};
    };

    const respondClarification = (id, { response, respondedBy = 'Requester' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (record.assessment.clarificationStatus !== 'Open') {
        return { error: 'There is no open clarification on this request.' };
      }
      if (!String(response || '').trim()) return { error: 'Enter the clarification response.' };

      patchRequest(id, (row) =>
        withHistory(
          {
            ...row,
            status: 'Under Initial Review',
            assessment: {
              ...row.assessment,
              clarificationResponse: String(response).trim(),
              clarificationStatus: 'Responded',
              clarificationRespondedAt: today(),
            },
          },
          {
            action: 'Clarification responded',
            by: respondedBy,
            detail: String(response).trim(),
            status: 'Under Initial Review',
          },
        ),
      );
      return {};
    };

    const recordDecision = (id, { decision, comments, by = 'N. Joshi' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };

      const statusForDecision = decideRequestStatus(decision);
      const error = (() => {
        if (!['Accepted', 'Rejected', 'Returned for Clarification'].includes(decision)) {
          return 'Select a technical decision.';
        }
        if (record.status === statusForDecision) {
          return `The request is already ${decision.toLowerCase()}.`;
        }
        if (LOCKED_STATUSES.includes(record.status)) {
          return `${record.status} requests cannot be re-decided.`;
        }
        if (
          ![
            'Under Initial Review',
            'Under Feasibility Assessment',
            'Returned for Clarification',
            'Clarification Required',
          ].includes(record.status)
        ) {
          return `A decision can only be recorded while the request is under technical assessment (current: ${record.status}).`;
        }
        if (decision === 'Accepted') {
          const blockers = [];
          const assessment = record.assessment;
          if (!assessment.reviewer) blockers.push('technical reviewer assigned');
          if (!assessment.reviewDate) blockers.push('review date recorded');
          if (!assessment.reviewComments?.trim()) blockers.push('initial review comments recorded');
          if (assessment.clarificationStatus === 'Open') {
            blockers.push('clarifications closed');
          }
          const feasibility = assessment.feasibility || {};
          if (!feasibility.technical) blockers.push('technical feasibility');
          if (!feasibility.resources) blockers.push('resource availability');
          if (!feasibility.complexity) blockers.push('design complexity');
          if (!String(feasibility.materials || '').trim()) blockers.push('material requirements');
          if (!String(feasibility.effort || '').trim()) blockers.push('estimated effort');
          if (blockers.length) {
            return `Complete the mandatory assessment first: ${blockers.join(', ')}.`;
          }
        }
        if (!record.assessment.reviewer) return 'Assign a technical reviewer before recording a decision.';
        if (!record.assessment.reviewDate) return 'Record the review date before a decision.';
        if (decision !== 'Accepted' && !String(comments || '').trim()) {
          return decision === 'Rejected'
            ? 'A rejection reason is required.'
            : 'Explain what clarification is required before returning the request.';
        }
        return '';
      })();

      if (error) return { error };

      patchRequest(id, (row) => {
        const at = today();
        const decisionRecord = {
          id: `${row.id}-DEC-${(row.assessment.decisionHistory?.length || 0) + 1}`,
          decision,
          by: row.assessment.reviewer || by,
          at,
          comments:
            String(comments || '').trim() ||
            (decision === 'Accepted'
              ? 'Assessment complete; request accepted.'
              : decision === 'Rejected'
                ? 'Request rejected.'
                : 'Returned for clarification.'),
        };
        return withHistory(
          {
            ...row,
            status: statusForDecision,
            assessment: {
              ...row.assessment,
              decision,
              decisionBy: decisionRecord.by,
              decisionDate: at,
              decisionComments:
                String(comments || '').trim() ||
                (decision === 'Accepted'
                  ? 'Assessment complete; request accepted.'
                  : decision === 'Rejected'
                    ? 'Request rejected.'
                    : 'Returned for clarification.'),
              decisionHistory: [...(row.assessment.decisionHistory || []), decisionRecord],
              ...(decision === 'Returned for Clarification'
                ? {
                    clarificationRequired: 'Yes',
                    clarificationStatus: 'Open',
                    clarificationQuestions:
                      String(comments || '').trim() || row.assessment.clarificationQuestions,
                    clarificationRaisedAt: at,
                  }
                : {}),
            },
          },
          {
            action: `Technical decision — ${decision}`,
            by: decisionRecord.by,
            detail: decisionRecord.comments,
            status: statusForDecision,
          },
        );
      });
      return {};
    };

    const saveCommercial = (id, patch, { by = 'Sales', create = false } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (record.source !== 'Customer') {
        return { error: 'Quotation and commercial review applies to customer requests only.' };
      }
      if (!['Accepted', 'Quotation in Progress', 'Submitted to Customer', 'Quotation Accepted', 'Quotation Rejected'].includes(record.status)) {
        return { error: 'The customer request must be technically accepted before quotation work.' };
      }

      patchRequest(id, (row) => {
        return withHistory(
          {
            ...row,
            commercial: mergeCommercial(row.commercial, patch),
            status: create && row.status === 'Accepted' ? 'Quotation in Progress' : row.status,
          },
          {
            action: create ? 'Quotation created' : 'Quotation information updated',
            by,
            detail: 'Cost estimation, technical quotation or commercial terms updated.',
            status: create && row.status === 'Accepted' ? 'Quotation in Progress' : row.status,
          },
        );
      });
      return {};
    };

    const moveQuotationStage = (id, stage, payload = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (!record.commercial && !payload.commercial) {
        return { error: 'Create the quotation before advancing it.' };
      }
      const commercial = mergeCommercial(record.commercial, payload.commercial);

      const stageError = quotationStageError(commercial, stage);
      if (stageError) return { error: stageError };

      const by = payload.by || 'Sales';
      const nextStatus = {
        'Technical Review': 'Quotation in Progress',
        'Commercial Review': 'Quotation in Progress',
        'Submitted to Customer': 'Submitted to Customer',
        Accepted: 'Quotation Accepted',
        Rejected: 'Quotation Rejected',
      }[stage];
      if (!nextStatus) return { error: 'Select a valid quotation stage.' };

      if (stage === 'Accepted' && !String(payload.acceptanceDate || '').trim()) {
        return { error: 'Record the customer decision date.' };
      }
      if (stage === 'Rejected' && !String(payload.remarks || '').trim()) {
        return { error: 'Record why the customer rejected the quotation.' };
      }

      patchRequest(id, (row) => {
        const current = mergeCommercial(row.commercial, payload.commercial);
        const at = stamp();
        const acceptance =
          stage === 'Accepted' || stage === 'Rejected'
            ? {
                ...current.acceptance,
                decision: stage,
                date: payload.acceptanceDate || today(),
                poReference: String(payload.poReference || current.acceptance.poReference || '').trim(),
                remarks: String(payload.remarks || current.acceptance.remarks || '').trim(),
              }
            : current.acceptance;

        return withHistory(
          {
            ...row,
            status: nextStatus,
            commercial: {
              ...current,
              stage,
              acceptance,
              commercialReview:
                stage === 'Commercial Review'
                  ? { ...current.commercialReview, status: 'Under Review' }
                  : stage === 'Submitted to Customer'
                    ? { ...current.commercialReview, status: 'Approved' }
                    : current.commercialReview,
              stageHistory: [
                ...(current.stageHistory || []),
                {
                  id: `${row.id}-QS-${(current.stageHistory?.length || 0) + 1}`,
                  stage,
                  at,
                  by,
                  note:
                    String(payload.note || '').trim() ||
                    (stage === 'Submitted to Customer'
                      ? `Quotation ${current.technical.quotationNumber} Rev ${current.technical.revision} submitted to the customer.`
                      : stage === 'Accepted'
                        ? 'Customer accepted the quotation.'
                        : stage === 'Rejected'
                          ? 'Customer rejected the quotation.'
                          : `Quotation moved to ${stage}.`),
                },
              ],
            },
          },
          {
            action: `Quotation — ${stage}`,
            by,
            detail:
              String(payload.note || '').trim() ||
              (stage === 'Accepted'
                ? 'Customer accepted the quotation; project creation is now available.'
                : stage === 'Rejected'
                  ? 'Customer rejected the quotation.'
                  : `Quotation moved to ${stage}.`),
            status: nextStatus,
          },
        );
      });
      return {};
    };

    const markConverted = (id, projectId, { by = 'Design Admin' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (record.linkedProjectId) {
        return { error: `A project has already been created: ${record.linkedProjectId}.` };
      }
      if (!projectId) return { error: 'Project reference is required.' };
      const at = stamp();
      patchRequest(id, (row) =>
        withHistory(
          {
            ...row,
            status: 'Converted to Project',
            linkedProjectId: projectId,
            conversion: { projectId, at, by },
          },
          {
            action: 'Converted to project',
            by,
            detail: `${projectId} created from ${row.id}.`,
            status: 'Converted to Project',
            at,
          },
        ),
      );
      return {};
    };

    const attachDocument = (id, documentRecord, { by = 'N. Joshi', target = 'request' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (!documentRecord?.name) return { error: 'Select a file to attach.' };
      if (LOCKED_STATUSES.includes(record.status)) {
        return { error: `Documents cannot be added to a ${record.status} request.` };
      }
      const doc = {
        ...documentRecord,
        id: `DOC-${id}-${Date.now()}`,
        uploadedAt: stamp(),
        uploadedBy: documentRecord.uploadedBy || by,
      };

      patchRequest(id, (row) => {
        const history = {
          action: 'Supporting document attached',
          by: doc.uploadedBy,
          detail: `${doc.name} · ${doc.category}`,
          status: row.status,
        };
        if (target === 'clarification') {
          return withHistory(
            {
              ...row,
              assessment: {
                ...row.assessment,
                clarificationDocuments: [
                  ...(row.assessment.clarificationDocuments || []),
                  doc,
                ],
              },
            },
            history,
          );
        }
        return withHistory(
          { ...row, documents: [...(row.documents || []), doc] },
          history,
        );
      });
      return {};
    };

    const removeDocument = (id, documentId, { target = 'request' } = {}) => {
      const record = getRequest(id);
      if (!record) return { error: 'Request not found.' };
      if (LOCKED_STATUSES.includes(record.status)) {
        return { error: `Documents cannot be removed from a ${record.status} request.` };
      }
      patchRequest(id, (row) =>
        withHistory(
          target === 'clarification'
            ? {
                ...row,
                assessment: {
                  ...row.assessment,
                  clarificationDocuments: (row.assessment.clarificationDocuments || []).filter(
                    (doc) => doc.id !== documentId,
                  ),
                },
              }
            : { ...row, documents: (row.documents || []).filter((doc) => doc.id !== documentId) },
          {
            action: 'Supporting document removed',
            by: 'N. Joshi',
            detail: documentId,
            status: row.status,
          },
        ),
      );
      return {};
    };

    const resetRequests = () => setRequests(seedRequests());

    return {
      requests,
      getRequest,
      nextRequestId: () => nextRequestId(requests),
      addRequest,
      updateRequest,
      deleteRequest,
      startReview,
      saveAssessment,
      raiseClarification,
      respondClarification,
      recordDecision,
      saveCommercial,
      moveQuotationStage,
      markConverted,
      attachDocument,
      removeDocument,
      resetRequests,
    };
  }, [requests]);

  return <EnquiryRequestContext.Provider value={value}>{children}</EnquiryRequestContext.Provider>;
}

export function useEnquiryRequests() {
  const context = useContext(EnquiryRequestContext);
  if (!context) {
    throw new Error('useEnquiryRequests must be used inside an EnquiryRequestProvider');
  }
  return context;
}
