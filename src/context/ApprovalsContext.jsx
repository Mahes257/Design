import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_APPROVERS,
  CLIENT_REVIEWERS,
  REVIEWS,
  REVIEWER_PERSONA,
  TODAY,
  addDays,
  deriveWorkflow,
  finalApprovedBy,
  isReleaseEligible,
  nextReviewId,
  nextRevision,
  releaseSourceStatus,
  withDerived,
} from '../data/approvalsData';
import { useBom } from './BomContext';
import { useCad } from './CadContext';

/**
 * Design Review & Approval state (Module 11).
 *
 * All decisions, releases, comments and checkout-style revision histories are
 * browser-local mock records. They are not backend authorizations and do not
 * transfer anything to Purchase or Production.
 */
const ApprovalsContext = createContext(null);
const STORAGE_KEY = 'md-approvals-state-v1';

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.reviews) || parsed.reviews.length === 0) return null;
    const seedById = new Map(REVIEWS.map((row) => [row.id, row]));
    return {
      reviews: parsed.reviews.map((row) => {
        const seed = seedById.get(row.id);
        return withDerived({
          ...row,
          bomId: row.bomId || seed?.bomId || '',
          bomRevision: row.bomRevision || seed?.bomRevision || '',
          drawingId: row.drawingId || seed?.drawingId || '',
          drawingRevision: row.drawingRevision || seed?.drawingRevision || '',
          reviewDate: row.reviewDate || seed?.reviewDate || row.submittedAt || TODAY,
        });
      }),
    };
  } catch {
    return null;
  }
}

const persisted = loadPersistedState();
let sequence = 0;

function nowStamp() {
  sequence += 1;
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}.${String(sequence).padStart(3, '0')}`;
}

function event(review, config) {
  return {
    id: `EV-${review.id}-${(review.history?.length || 0) + 1}-${Date.now()}`,
    at: nowStamp(),
    ...config,
  };
}

function withHistory(review, entry) {
  return { ...review, history: [...(review.history || []), entry] };
}

function roleForStage(stage) {
  if (stage === 'Engineering Review') return 'Engineering Reviewer';
  if (stage === 'Manufacturing Review') return 'Manufacturing Reviewer';
  if (stage === 'Client Approval') return 'Client or Admin Approver';
  return 'Design Authority';
}

export function ApprovalsProvider({ children }) {
  const { boms, releaseBom } = useBom();
  const { drawings, releaseDrawing } = useCad();
  const [reviews, setReviews] = useState(() => persisted?.reviews || REVIEWS);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ reviews }));
    } catch {
      // storage unavailable — the session works in memory
    }
  }, [reviews]);

  const value = useMemo(() => {
    const find = (id) => reviews.find((row) => row.id === id);
    const patchReview = (id, updater) =>
      setReviews((previous) => previous.map((row) => (row.id === id ? withDerived(updater(row)) : row)));

    const actionHistory = (review, config) =>
      event(review, {
        stage: config.stage,
        action: config.action,
        previousStatus: config.previousStatus || review.status,
        newStatus: config.newStatus,
        by: config.by,
        role: config.role || roleForStage(config.stage),
        comments: config.comments || '',
      });

    return {
      reviews,
      reviewerPersona: REVIEWER_PERSONA,
      nextReviewId: () => nextReviewId(reviews),

      addReview: (record) => {
        setReviews((previous) => [{ ...record, status: 'Draft', currentStage: 'Draft' }, ...previous]);
      },

      updateReview: (id, patch) => patchReview(id, (review) => ({ ...review, ...patch })),

      saveReview: (record, { submit = false } = {}) => {
        setReviews((previous) => {
          const existing = previous.find((row) => row.id === record.id);
          let saved = existing ? { ...existing, ...record } : { ...record };
          if (submit) {
            const stageStates = {
              ...saved.stageStates,
              engineering: { ...saved.stageStates.engineering, status: 'Under Review' },
            };
            saved = withDerived({
              ...saved,
              status: 'Under Engineering Review',
              currentStage: 'Engineering Review',
              stageStates,
              submittedAt: saved.submittedAt || TODAY,
            });
            saved = withHistory(saved, {
              id: `EV-${saved.id}-submitted-${Date.now()}`,
              at: nowStamp(),
              stage: 'Review Register',
              action: 'Submitted for review',
              previousStatus: 'Draft',
              newStatus: saved.status,
              by: saved.submittedBy,
              role: 'Submitter',
              comments: saved.submissionNotes || 'Submitted for review.',
            });
          } else {
            saved = { ...saved, status: 'Draft', currentStage: 'Draft', release: null };
          }
          return existing ? previous.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...previous];
        });
        return { id: record.id };
      },

      submitReview: (id) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (review.status !== 'Draft') return { error: 'Only a draft review can be submitted.' };
        if (!review.requiredStages?.length) return { error: 'Select at least one applicable review stage.' };
        if (!review.stageStates?.engineering || review.stageStates.engineering.status === 'Not Required') {
          return { error: 'Engineering review is required for this workflow.' };
        }
        const engineering = { ...review.stageStates.engineering, status: 'Under Review' };
        const updated = withDerived({
          ...review,
          status: 'Under Engineering Review',
          currentStage: 'Engineering Review',
          submittedAt: review.submittedAt || TODAY,
          stageStates: { ...review.stageStates, engineering },
        });
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Review Register',
                    action: 'Submitted for review',
                    previousStatus: 'Draft',
                    newStatus: updated.status,
                    by: review.submittedBy,
                    role: 'Submitter',
                    comments: review.submissionNotes || 'Submitted for review.',
                  }),
                )
              : row,
          ),
        );
        return {};
      },

      engineeringDecision: (id, { decision, comments, reviewer }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (review.status !== 'Under Engineering Review') return { error: 'Engineering review is not the active stage.' };
        if (!['Approve', 'Reject', 'Request Changes'].includes(decision)) return { error: 'Unknown engineering decision.' };
        if (decision !== 'Approve' && !String(comments || '').trim()) {
          return { error: 'A reason is required when rejecting or requesting changes.' };
        }
        if (decision === 'Approve') {
          const unresolved = (review.engineeringChecklist || []).filter((item) => !['Pass', 'Not Applicable', 'N/A'].includes(item.result));
          if (unresolved.length > 0) return { error: `${unresolved.length} engineering checklist item(s) are incomplete or failed. Complete them before approval.` };
        }
        const status = decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Changes Requested';
        const engineering = {
          ...review.stageStates.engineering,
          status,
          decision,
          decidedAt: TODAY,
          reviewer: reviewer || review.stageStates.engineering.reviewer,
          comments: comments || 'Engineering review approved.',
        };
        const manufacturing = review.requiredStages.includes('Manufacturing')
          ? { ...review.stageStates.manufacturing, status: decision === 'Approve' && review.stageStates.manufacturing.status === 'Pending' ? 'Under Review' : review.stageStates.manufacturing.status }
          : review.stageStates.manufacturing;
        const updatedBase = {
          ...review,
          engineeringReviewer: engineering.reviewer,
          stageStates: { ...review.stageStates, engineering, manufacturing },
          approvals: [
            ...(review.approvals || []),
            { id: `AP-${id}-ENG-${(review.approvals?.length || 0) + 1}`, stage: 'Engineering Review', decision, reviewer: engineering.reviewer, at: TODAY, comments: comments || '' },
          ],
        };
        const updated = withDerived(updatedBase);
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Engineering Review',
                    action: decision === 'Request Changes' ? 'Changes requested' : decision,
                    previousStatus: review.status,
                    newStatus: updated.status,
                    by: engineering.reviewer,
                    role: 'Engineering Reviewer',
                    comments: comments || '',
                  }),
                )
              : row,
          ),
        );
        return {};
      },

      manufacturingDecision: (id, { decision, comments, reviewer }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (review.status !== 'Under Manufacturing Review') return { error: 'Manufacturing review is not the active stage.' };
        if (!['Approve', 'Reject', 'Request Changes'].includes(decision)) return { error: 'Unknown manufacturing decision.' };
        if (decision !== 'Approve' && !String(comments || '').trim()) {
          return { error: 'A reason is required when rejecting or requesting changes.' };
        }
        if (review.stageStates.engineering.status !== 'Approved') {
          return { error: 'Engineering review must be approved before manufacturing can complete.' };
        }
        if (decision === 'Approve') {
          const unresolved = (review.manufacturingChecklist || []).filter((item) => !['Pass', 'Not Applicable', 'N/A'].includes(item.result));
          if (unresolved.length > 0) return { error: `${unresolved.length} manufacturing checklist item(s) are incomplete or failed. Complete them before approval.` };
        }
        const status = decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Changes Requested';
        const manufacturing = {
          ...review.stageStates.manufacturing,
          status,
          decision,
          decidedAt: TODAY,
          reviewer: reviewer || review.stageStates.manufacturing.reviewer,
          comments: comments || 'Manufacturing review approved.',
        };
        const updatedBase = {
          ...review,
          manufacturingReviewer: manufacturing.reviewer,
          stageStates: { ...review.stageStates, manufacturing },
          approvals: [
            ...(review.approvals || []),
            { id: `AP-${id}-MFG-${(review.approvals?.length || 0) + 1}`, stage: 'Manufacturing Review', decision, reviewer: manufacturing.reviewer, at: TODAY, comments: comments || '' },
          ],
        };
        const updated = withDerived(updatedBase);
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Manufacturing Review',
                    action: decision === 'Request Changes' ? 'Changes requested' : decision,
                    previousStatus: review.status,
                    newStatus: updated.status,
                    by: manufacturing.reviewer,
                    role: 'Manufacturing Reviewer',
                    comments: comments || '',
                  }),
                )
              : row,
          ),
        );
        return {};
      },

      recordClientSubmission: (id, { notes, reviewer, by }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (!review.clientRequired) return { error: 'Client approval is not required for this review.' };
        if (review.status !== 'Pending Client Submission') return { error: 'This review is not ready for client submission.' };
        if (review.stageStates.engineering.status !== 'Approved' || (review.requiredStages.includes('Manufacturing') && review.stageStates.manufacturing.status !== 'Approved')) {
          return { error: 'All internal approvals must be complete before client submission.' };
        }
        const client = {
          ...review.stageStates.client,
          status: 'Submitted to Client',
          submittedAt: TODAY,
          reviewer: reviewer || review.stageStates.client.reviewer,
          comments: notes || 'Submitted to client for review.',
        };
        const updatedBase = {
          ...review,
          clientReviewer: client.reviewer,
          clientSubmission: {
            notes: notes || '',
            submittedAt: TODAY,
            clientReviewer: client.reviewer,
            clientReference: review.clientReference,
            attachments: review.attachments || [],
          },
          clientHistory: [
            ...(review.clientHistory || []),
            { revision: review.revision, submittedAt: TODAY, decision: 'Awaiting client review', comments: notes || 'Submitted to client.', resubmissionRef: '', previousRevision: (review.clientHistory || []).at(-1)?.revision || '' },
          ],
          stageStates: { ...review.stageStates, client },
        };
        const updated = withDerived(updatedBase);
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Client Approval',
                    action: 'Submitted to client',
                    previousStatus: review.status,
                    newStatus: updated.status,
                    by: by || review.submittedBy,
                    role: 'Submitter',
                    comments: notes || 'Submitted to client for review.',
                  }),
                )
              : row,
          ),
        );
        return {};
      },

      startClientReview: (id) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (review.status !== 'Submitted to Client') return { error: 'This review has not been submitted to the client.' };
        const client = { ...review.stageStates.client, status: 'Under Client Review' };
        const updated = withDerived({ ...review, stageStates: { ...review.stageStates, client } });
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Client Approval',
                    action: 'Client review started',
                    previousStatus: review.status,
                    newStatus: updated.status,
                    by: client.reviewer,
                    role: 'Client Reviewer',
                    comments: 'Client review started (local simulation).',
                  }),
                )
              : row,
          ),
        );
        return {};
      },

      clientDecision: (id, { decision, comments, reviewer, requestedChanges, actorRole = 'Client' }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (!review.clientRequired) return { error: 'Client or Admin Approval is not required for this review.' };
        if (!['Client', 'Admin'].includes(actorRole)) return { error: 'Unknown approver role.' };
        if (!['Approve', 'Reject', 'Request Changes'].includes(decision)) return { error: 'Unknown approval decision.' };
        if (review.stageStates.client.status === 'Approved') {
          return { error: 'Client or Admin Approval is already complete; a second approval is not required.' };
        }
        if (!['Pending Client Submission', 'Not Submitted', 'Submitted to Client', 'Under Client Review'].includes(review.status)) {
          return { error: 'The review is not waiting for Client or Admin Approval.' };
        }
        const allowedReviewers = actorRole === 'Admin' ? ADMIN_APPROVERS : CLIENT_REVIEWERS;
        const actingReviewer = reviewer || (actorRole === 'Admin' ? ADMIN_APPROVERS[0] : CLIENT_REVIEWERS[0]);
        if (!allowedReviewers.includes(actingReviewer)) {
          return { error: `${actingReviewer} is not an authorized ${actorRole} approver.` };
        }
        if (decision !== 'Approve' && !String(comments || '').trim()) {
          return { error: 'A reason is required for rejection or changes requested.' };
        }
        if (decision === 'Approve' && (review.stageStates.engineering.status !== 'Approved' || (review.requiredStages.includes('Manufacturing') && review.stageStates.manufacturing.status !== 'Approved'))) {
          return { error: 'Outstanding internal approvals must be completed before client approval can be recorded.' };
        }
        const status = decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Changes Requested';
        const client = {
          ...review.stageStates.client,
          status,
          decision,
          actorRole,
          decidedAt: TODAY,
          reviewer: actingReviewer,
          comments: comments || `${actorRole} approved the submitted revision.`,
          requestedChanges: requestedChanges || '',
        };
        const updatedHistory = (review.clientHistory || []).map((entry, index, list) =>
          index === list.length - 1
            ? { ...entry, decision: decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : 'Changes Requested', comments: comments || entry.comments, decidedAt: TODAY }
            : entry,
        );
        const updatedBase = {
          ...review,
          clientReviewer: client.reviewer,
          stageStates: { ...review.stageStates, client },
          clientHistory: updatedHistory,
          clientApprovalActor: { role: actorRole, reviewer: actingReviewer, at: TODAY, decision },
          approvals: [
            ...(review.approvals || []),
            { id: `AP-${id}-CLI-${(review.approvals?.length || 0) + 1}`, stage: 'Client Approval', decision, actorRole, reviewer: actingReviewer, at: TODAY, comments: comments || '' },
          ],
        };
        const updated = withDerived(updatedBase);
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Client Approval',
                    action: decision === 'Request Changes' ? `Changes requested by ${actorRole}` : decision === 'Approve' ? `Approved by ${actorRole}` : `Rejected by ${actorRole}`,
                    previousStatus: review.status,
                    newStatus: updated.status,
                    by: actingReviewer,
                    role: actorRole === 'Admin' ? 'Design Admin' : 'Client Reviewer',
                    comments: comments || '',
                  }),
                )
              : row,
          ),
        );
        return {};
      },

      finalDecision: (id, { decision, comments, approver, releaseRecommendation }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (review.status !== 'Ready for Final Approval') {
          return { error: 'Final approval is available only after every mandatory review stage is complete.' };
        }
        if (!['Approved', 'Rejected', 'Revision Required'].includes(decision)) return { error: 'Unknown final approval decision.' };
        if (decision !== 'Approved' && !String(comments || '').trim()) {
          return { error: 'Comments are required for rejection or a revision-required decision.' };
        }
        const finalApproval = {
          decision,
          approver: approver || 'Design Authority',
          at: TODAY,
          comments: comments || 'Final approval recorded after all mandatory review stages.',
          releaseRecommendation: releaseRecommendation || (decision === 'Approved'
            ? 'Recommended for controlled release subject to linked BOM and drawing checks.'
            : 'Not recommended for release until the required revision actions are complete.'),
        };
        const updatedBase = {
          ...review,
          finalApproval,
          approvals: [
            ...(review.approvals || []),
            { id: `AP-${id}-FINAL-${(review.approvals?.length || 0) + 1}`, stage: 'Final Approval', decision, reviewer: finalApproval.approver, at: TODAY, comments: finalApproval.comments },
          ],
        };
        const updated = withDerived(updatedBase);
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Final Approval',
                    action: decision === 'Revision Required' ? 'Final approval deferred — revision required' : `Final approval ${decision.toLowerCase()}`,
                    previousStatus: review.status,
                    newStatus: updated.status,
                    by: finalApproval.approver,
                    role: 'Design Authority',
                    comments: finalApproval.comments,
                  }),
                )
              : row,
          ),
        );
        return { finalApproval };
      },

      releaseReview: (id, by = 'Design Authority') => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        const source = releaseSourceStatus(review, boms, drawings);
        if (!isReleaseEligible(review, boms, drawings)) {
          return {
            error: source.ready
              ? 'Only a fully approved revision with all required stages complete can be released.'
              : source.errors[0],
          };
        }
        const count = reviews.filter((row) => row.release).length + 1;
        const approver = finalApprovedBy(review);
        const release = {
          releaseId: `REL-REV-2026-${String(count).padStart(3, '0')}`,
          revision: review.revision,
          bomId: review.bomId,
          bomRevision: review.bomRevision,
          drawingId: review.drawingId,
          drawingRevision: review.drawingRevision,
          approvedBy: approver?.by || 'Design Authority',
          approvedAt: approver?.at || TODAY,
          releaseDate: TODAY,
          releasedBy: by,
          status: 'Released',
        };
        const linkedDrawing = drawings.find((row) => row.id === review.drawingId);
        if (linkedDrawing && linkedDrawing.approvalStatus === 'Approved') {
          const drawingResult = releaseDrawing(review.drawingId, by, release.releaseId);
          if (drawingResult?.error) return drawingResult;
        }
        const linkedBom = boms.find((row) => row.id === review.bomId);
        if (linkedBom && linkedBom.status === 'Approved') {
          const bomResult = releaseBom(review.bomId, by, release.releaseId);
          if (bomResult?.error) return bomResult;
        }
        const updatedBase = { ...review, release };
        const updated = withDerived(updatedBase);
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(
                  updated,
                  actionHistory(updated, {
                    stage: 'Release',
                    action: 'Released',
                    previousStatus: review.status,
                    newStatus: 'Released',
                    by,
                    role: 'Design Authority',
                    comments: `Controlled release ${release.releaseId} created for ${review.deliverableNumber} Rev ${review.revision}; BOM ${review.bomId} Rev ${review.bomRevision}; drawing ${review.drawingId} Rev ${review.drawingRevision}. Not a Purchase or Production transfer.`,
                  }),
                )
              : row,
          ),
        );
        return { release };
      },

      resubmitReview: (id, { revision, by, notes }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (!['Changes Requested', 'Rejected'].includes(review.status)) {
          return { error: 'Only a changes-requested or rejected review can be resubmitted.' };
        }
        const newRevision = revision || nextRevision(review.revision);
        if (!newRevision.trim()) return { error: 'A new revision is required.' };
        if (newRevision === review.revision) return { error: 'The new revision must differ from the previous revision.' };
        const newId = nextReviewId(reviews);
        const resetChecklist = (items) =>
          items.map((item) => ({ ...item, result: 'Pending', comments: '', reviewer: item.reviewer }));
        const required = review.requiredStages;
        const clone = {
          ...review,
          id: newId,
          revision: newRevision.toUpperCase(),
          previousReviewId: review.id,
          originalReviewId: review.originalReviewId || review.id,
          submittedAt: TODAY,
          reviewDate: TODAY,
          dueDate: addDays(TODAY, 14),
          status: 'Under Engineering Review',
          currentStage: 'Engineering Review',
          release: null,
          finalApproval: null,
          approvals: [],
          comments: [],
          clientComments: [],
          clientHistory: [],
          clientSubmission: { notes: '', submittedAt: '', clientReviewer: review.clientReviewer, clientReference: review.clientReference, attachments: [] },
          designChecklist: resetChecklist(review.designChecklist || []),
          technicalChecklist: resetChecklist(review.technicalChecklist || []),
          engineeringChecklist: resetChecklist(review.engineeringChecklist || []),
          manufacturingChecklist: resetChecklist(review.manufacturingChecklist || []),
          stageStates: {
            engineering: { status: 'Under Review', reviewer: review.engineeringReviewer, decision: '', decidedAt: '', comments: '' },
            manufacturing: required.includes('Manufacturing')
              ? { status: 'Pending', reviewer: review.manufacturingReviewer, decision: '', decidedAt: '', comments: '' }
              : { status: 'Not Required', reviewer: review.manufacturingReviewer, decision: '', decidedAt: '', comments: '' },
            client: review.clientRequired
              ? { status: 'Not Submitted', reviewer: review.clientReviewer, decision: '', decidedAt: '', submittedAt: '', comments: '', requestedChanges: '' }
              : { status: 'Not Required', reviewer: review.clientReviewer, decision: '', decidedAt: '', submittedAt: '', comments: '', requestedChanges: '' },
          },
          resubmissions: [],
          submissionNotes: notes || `Resubmission of ${review.id} from Rev ${review.revision} to Rev ${newRevision.toUpperCase()}.`,
          history: [
            {
              id: `EV-${newId}-0`,
              at: nowStamp(),
              stage: 'Review Register',
              action: 'Resubmitted for review',
              previousStatus: review.status,
              newStatus: 'Under Engineering Review',
              by: by || review.submittedBy,
              role: 'Submitter',
              comments: notes || `Rev ${review.revision} → Rev ${newRevision.toUpperCase()}. Earlier decisions preserved on ${review.id}.`,
            },
          ],
        };
        const updatedNew = withDerived(clone);
        setReviews((previous) => [
          updatedNew,
          ...previous.map((row) =>
            row.id === id
              ? {
                  ...row,
                  resubmissions: [
                    ...(row.resubmissions || []),
                    {
                      id: `RS-${id}-${(row.resubmissions?.length || 0) + 1}`,
                      previousRevision: row.revision,
                      newRevision: newRevision.toUpperCase(),
                      at: TODAY,
                      by: by || row.submittedBy,
                      previousDecision: row.status,
                      currentStatus: 'Under Engineering Review',
                      linkedReviewId: newId,
                      note: notes || 'Corrected revision resubmitted for all required stages.',
                    },
                  ],
                }
              : row,
          ),
        ]);
        return { reviewId: newId, revision: newRevision.toUpperCase() };
      },

      addComment: (id, { text, author, role, stage, checklistItem, attachment }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (!String(text || '').trim()) return { error: 'Comment text is required.' };
        const comment = {
          id: `CMT-${id}-${(review.comments?.length || 0) + 1}-${Date.now()}`,
          at: nowStamp(),
          author: author || REVIEWER_PERSONA,
          role: role || roleForStage(stage),
          stage,
          text: text.trim(),
          checklistItem: checklistItem || '',
          attachment: attachment || '',
          responseStatus: 'Open',
        };
        const updated = { ...review, comments: [...(review.comments || []), comment] };
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(updated, {
                  ...event(updated, {
                    stage,
                    action: 'Comment added',
                    previousStatus: review.status,
                    newStatus: review.status,
                    by: comment.author,
                    role: comment.role,
                    comments: comment.text,
                  }),
                })
              : row,
          ),
        );
        return { comment };
      },

      updateChecklistResult: (id, checklistKey, itemId, patch) => {
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? {
                  ...row,
                  [checklistKey]: (row[checklistKey] || []).map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
                }
              : row,
          ),
        );
      },

      addClientComment: (id, { text, author, revision }) => {
        const review = find(id);
        if (!review) return { error: 'Review not found.' };
        if (!String(text || '').trim()) return { error: 'Client comment text is required.' };
        const comment = {
          id: `CC-${id}-${(review.clientComments?.length || 0) + 1}-${Date.now()}`,
          author: author || review.clientReviewer,
          role: 'Client Reviewer',
          stage: 'Client Approval',
          at: nowStamp(),
          text: text.trim(),
          revision: revision || review.revision,
          responseStatus: 'Open',
        };
        const updated = { ...review, clientComments: [...(review.clientComments || []), comment] };
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? withHistory(updated, {
                  ...event(updated, {
                    stage: 'Client Approval',
                    action: 'Client comment added',
                    previousStatus: review.status,
                    newStatus: review.status,
                    by: comment.author,
                    role: 'Client Reviewer',
                    comments: comment.text,
                  }),
                })
              : row,
          ),
        );
        return { comment };
      },

      updateClientCommentStatus: (id, commentId, responseStatus) => {
        setReviews((previous) =>
          previous.map((row) =>
            row.id === id
              ? {
                  ...row,
                  clientComments: (row.clientComments || []).map((comment) => (comment.id === commentId ? { ...comment, responseStatus } : comment)),
                }
              : row,
          ),
        );
      },

      resetApprovals: () => setReviews(REVIEWS),
    };
  }, [reviews, boms, drawings]);

  return <ApprovalsContext.Provider value={value}>{children}</ApprovalsContext.Provider>;
}

export function useApprovals() {
  const context = useContext(ApprovalsContext);
  if (!context) throw new Error('useApprovals must be used inside an ApprovalsProvider');
  return context;
}
