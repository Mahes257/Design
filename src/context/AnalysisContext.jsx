import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cleanupOrphanedAttachments, deleteAttachment } from '../services/attachmentStorage';
import {
  ANALYSES,
  CURRENT_REVIEWER,
  REVIEWS,
  TODAY,
  VALIDATION_REPORTS,
  decisionStatus,
  isVerifiedEvidence,
  normalizeCategory,
  nextAnalysisId,
  nextReportId,
  nextReviewId,
  nextRevision,
} from '../data/analysisData';

/**
 * Engineering Analysis state (Module 06).
 *
 * One shared store for analysis records, review records and validation reports
 * so the three submodules agree on statuses and history. Mirrored into
 * localStorage (`md-analysis-state-v1`); frontend only.
 */
const AnalysisContext = createContext(null);

const STORAGE_KEY = 'md-analysis-state-v1';

const EMPTY_CHECKS = {
  inputVerification: 'Pending',
  assumptionVerification: 'Pending',
  methodologyReview: 'Pending',
  calculationVerification: 'Pending',
  resultReview: 'Pending',
  acceptanceCriteriaCheck: 'Pending',
};

/** Bring earlier records onto the current category vocabulary and fields. */
function normalizeAnalysis(analysis) {
  return {
    designId: '',
    objective: '',
    validationReportRef: '',
    relatedObservation: '',
    appliedLoads: '',
    operatingConditions: '',
    methodology: '',
    calculationInputs: '',
    calculationResults: '',
    technicalRemarks: '',
    resultSource: '',
    ...analysis,
    category: normalizeCategory(analysis.category),
  };
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.analyses) || parsed.analyses.length === 0) return null;
    return {
      analyses: parsed.analyses.map(normalizeAnalysis),
      reviews: (Array.isArray(parsed.reviews) ? parsed.reviews : REVIEWS).map((review) => ({
        checks: { ...EMPTY_CHECKS, ...(review.checks || {}) },
        findings: '',
        correctiveActions: '',
        ...review,
      })),
      reports: Array.isArray(parsed.reports) ? parsed.reports : VALIDATION_REPORTS,
    };
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

function nowStamp() {
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;
}

function pushActivity(record, label, detail, by) {
  return [
    ...(record.activity || []),
    {
      id: `ACT-${record.id}-${(record.activity?.length || 0) + 1}`,
      label,
      detail,
      by,
      at: TODAY,
    },
  ];
}

export function AnalysisProvider({ children }) {
  const [analyses, setAnalyses] = useState(() =>
    (persistedState?.analyses || ANALYSES).map(normalizeAnalysis),
  );
  const [reviews, setReviews] = useState(() =>
    (persistedState?.reviews || REVIEWS).map((review) => ({
      checks: { ...EMPTY_CHECKS, ...(review.checks || {}) },
      findings: '',
      correctiveActions: '',
      ...review,
    })),
  );
  const [reports, setReports] = useState(() => persistedState?.reports || VALIDATION_REPORTS);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ analyses, reviews, reports }));
    } catch {
      // storage unavailable — the session still works in memory
    }
  }, [analyses, reviews, reports]);

  // Drop binary attachments that no saved analysis references (abandoned
  // uploads, interrupted writes and chunk ranges with no metadata).
  useEffect(() => {
    const saved = (persistedState?.analyses || ANALYSES).map(normalizeAnalysis);
    cleanupOrphanedAttachments(saved).catch(() => 0);
  }, []);

  const value = useMemo(
    () => ({
      analyses,
      reviews,
      reports,
      reviewerPersona: CURRENT_REVIEWER,

      nextAnalysisId: () => nextAnalysisId(analyses),
      nextReviewId: () => nextReviewId(reviews),
      nextReportId: () => nextReportId(reports),

      addAnalysis: (analysis) =>
        setAnalyses((previous) => [
          {
            ...analysis,
            activity: [
              ...(analysis.activity || []),
              {
                id: `ACT-${analysis.id}-1`,
                label: 'Analysis created',
                detail: 'Record registered in the analysis register',
                by: analysis.engineer,
                at: TODAY,
              },
            ],
          },
          ...previous,
        ]),

      updateAnalysis: (id, patch) =>
        setAnalyses((previous) =>
          previous.map((analysis) =>
            analysis.id === id
              ? {
                  ...analysis,
                  ...patch,
                  activity: patch.activity || analysis.activity,
                }
              : analysis,
          ),
        ),

      duplicateAnalysis: (id, by) =>
        setAnalyses((previous) => {
          const source = previous.find((analysis) => analysis.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextAnalysisId(previous),
            title: `${source.title} (Copy)`,
            verificationStatus: 'Draft',
            revision: 'A',
            created: TODAY,
            target: '',
            reviews: [],
            attachments: [],
            revisions: [
              { revision: 'A', date: TODAY, by: by || source.engineer, note: `Duplicated from ${source.id} Rev ${source.revision}.` },
            ],
            activity: [
              {
                id: `ACT-DUP-${source.id}`,
                label: 'Analysis duplicated',
                detail: `Copied from ${source.id} Rev ${source.revision}`,
                by: by || source.engineer,
                at: TODAY,
              },
            ],
          };
          return [copy, ...previous];
        }),

      archiveAnalysis: (id, by) =>
        setAnalyses((previous) =>
          previous.map((analysis) =>
            analysis.id === id
              ? {
                  ...analysis,
                  verificationStatus: 'Archived',
                  activity: pushActivity(analysis, 'Archived', 'Record archived from the analysis register', by),
                }
              : analysis,
          ),
        ),

      /** Submit an analysis for review; creates or re-opens its review record. */
      submitAnalysisForReview: (analysisId, { by, reviewer, dueDate, comments, evidenceRefs }) => {
        const analysis = analyses.find((row) => row.id === analysisId);
        if (!analysis) return { error: 'Analysis not found.' };
        if (!['Draft', 'In Progress', 'Changes Requested', 'Rejected'].includes(analysis.verificationStatus)) {
          return { error: 'Only a draft, in-progress, rejected or changes-requested analysis can be submitted.' };
        }

        let reviewId = '';
        setReviews((previous) => {
          const existing = previous.find((review) => review.analysisId === analysisId && review.status === 'Changes Requested');
          if (existing) {
            reviewId = existing.id;
            return previous.map((review) =>
              review.id === existing.id
                ? {
                    ...review,
                    status: 'Pending Review',
                    submittedBy: by,
                    reviewer: reviewer || review.reviewer,
                    submittedDate: TODAY,
                    dueDate: dueDate || review.dueDate,
                    comments: comments || review.comments,
                    evidenceRefs: evidenceRefs || review.evidenceRefs,
                    history: [
                      ...review.history,
                      {
                        id: `RH-${review.id}-${review.history.length + 1}`,
                        previousStatus: 'Changes Requested',
                        newStatus: 'Pending Review',
                        action: 'Resubmitted for review',
                        user: by,
                        at: nowStamp(),
                        comments: comments || '',
                      },
                    ],
                  }
                : review,
            );
          }
          reviewId = nextReviewId(previous);
          return [
            {
              id: reviewId,
              analysisId,
              submittedBy: by,
              reviewer: reviewer || analysis.reviewer,
              submittedDate: TODAY,
              dueDate: dueDate || '',
              priority: analysis.priority,
              status: 'Pending Review',
              comments: comments || '',
              decision: '',
              decisionDate: '',
              evidenceRefs: evidenceRefs || (analysis.attachments || []).map((file) => file.name),
              checks: { ...EMPTY_CHECKS },
              findings: '',
              correctiveActions: '',
              history: [
                {
                  id: 'RH-1',
                  previousStatus: analysis.verificationStatus,
                  newStatus: 'Pending Review',
                  action: 'Submitted for review',
                  user: by,
                  at: nowStamp(),
                  comments: comments || '',
                },
              ],
            },
            ...previous,
          ];
        });

        setAnalyses((previous) =>
          previous.map((row) =>
            row.id === analysisId
              ? {
                  ...row,
                  verificationStatus: 'Pending Review',
                  reviewer: reviewer || row.reviewer,
                  activity: pushActivity(row, 'Submitted for review', `Sent to ${reviewer || row.reviewer}`, by),
                }
              : row,
          ),
        );

        return { reviewId };
      },

      /** Reviewer decision; the linked analysis is updated in the same step. */
      recordReviewDecision: (reviewId, { decision, comments, by }) => {
        const review = reviews.find((row) => row.id === reviewId);
        if (!review) return { error: 'Review not found.' };
        const normalizedDecision =
          decision === 'Approve' ? 'Approve' : decision === 'Return for Correction' ? 'Return for Correction' : decision;
        if (
          !['Approve', 'Reject', 'Return for Correction', 'Hold', 'Verify', 'Request Changes'].includes(
            normalizedDecision,
          )
        ) {
          return { error: 'Unknown review action.' };
        }
        if (
          normalizedDecision !== 'Approve' &&
          normalizedDecision !== 'Verify' &&
          !String(comments || '').trim()
        ) {
          return { error: 'Comments are required for reject, return-for-correction and hold decisions.' };
        }
        if (review.status === 'Verified' || review.status === 'Cancelled') {
          return { error: 'This review has already been closed.' };
        }
        const effectiveDecision = normalizedDecision === 'Verify' ? 'Approve' : normalizedDecision;
        const decidedStatus =
          normalizedDecision === 'Verify'
            ? 'Verified'
            : normalizedDecision === 'Request Changes'
              ? 'Changes Requested'
              : decisionStatus(effectiveDecision);

        setReviews((previous) =>
          previous.map((row) =>
            row.id === reviewId
              ? {
                  ...row,
                  status: decidedStatus,
                  decision: effectiveDecision,
                  decisionDate: TODAY,
                  comments: comments || row.comments,
                  checks: { ...EMPTY_CHECKS, ...(row.checks || {}) },
                  history: [
                    ...row.history,
                    {
                      id: `RH-${row.id}-${row.history.length + 1}`,
                      previousStatus: row.status,
                      newStatus: decidedStatus,
                      action: effectiveDecision,
                      user: by,
                      at: nowStamp(),
                      comments: comments || '',
                    },
                  ],
                }
              : row,
          ),
        );

        setAnalyses((previous) =>
          previous.map((row) =>
            row.id === review.analysisId
              ? {
                  ...row,
                  verificationStatus: decidedStatus,
                  activity: pushActivity(row, decidedStatus, comments || `${decision} by reviewer`, by),
                }
              : row,
          ),
        );

        return { status: decidedStatus };
      },

      /** Save the verification checklist, findings and corrective actions. */
      saveReviewChecks: (reviewId, { checks, findings, correctiveActions, comments }, by) => {
        const review = reviews.find((row) => row.id === reviewId);
        if (!review) return { error: 'Review not found.' };
        if (['Verified', 'Rejected', 'Cancelled'].includes(review.status)) {
          return { error: 'This review is closed; its checklist cannot be changed.' };
        }
        setReviews((previous) =>
          previous.map((row) =>
            row.id === reviewId
              ? {
                  ...row,
                  checks: { ...EMPTY_CHECKS, ...(row.checks || {}), ...(checks || {}) },
                  findings: findings ?? row.findings,
                  correctiveActions: correctiveActions ?? row.correctiveActions,
                  comments: comments ?? row.comments,
                  history: [
                    ...row.history,
                    {
                      id: `RH-${row.id}-${row.history.length + 1}`,
                      previousStatus: row.status,
                      newStatus: row.status,
                      action: 'Verification checklist updated',
                      user: by,
                      at: nowStamp(),
                      comments: comments || 'Checklist saved',
                    },
                  ],
                }
              : row,
          ),
        );
        return {};
      },

      reassignReviewer: (reviewId, reviewer, by, comments) => {
        setReviews((previous) =>
          previous.map((row) =>
            row.id === reviewId
              ? {
                  ...row,
                  reviewer,
                  history: [
                    ...row.history,
                    {
                      id: `RH-${row.id}-${row.history.length + 1}`,
                      previousStatus: row.status,
                      newStatus: row.status,
                      action: 'Reassign reviewer',
                      user: by,
                      at: nowStamp(),
                      comments: `${row.reviewer} → ${reviewer}${comments ? ` · ${comments}` : ''}`,
                    },
                  ],
                }
              : row,
          ),
        );
        setAnalyses((previous) =>
          previous.map((row) =>
            row.id === reviews.find((review) => review.id === reviewId)?.analysisId
              ? { ...row, reviewer, activity: pushActivity(row, 'Reviewer reassigned', `Assigned to ${reviewer}`, by) }
              : row,
          ),
        );
      },

      /**
       * Remove one attachment reference and delete its stored binary content.
       * Only allowed while the analysis is still editable.
       */
      removeAnalysisAttachment: (analysisId, target, by) => {
        const analysis = analyses.find((row) => row.id === analysisId);
        if (!analysis) return { error: 'Analysis not found.' };
        if (!['Draft', 'In Progress', 'Changes Requested'].includes(analysis.verificationStatus)) {
          return { error: 'Evidence on a submitted or verified analysis cannot be removed.' };
        }
        const matches = (file) => {
          if (target && typeof target === 'object') {
            if (target.attachmentId) return file.attachmentId === target.attachmentId;
            return file.name === target.name;
          }
          return file.attachmentId === target || file.name === target;
        };
        const removed = (analysis.attachments || []).filter(matches);
        if (removed.length === 0) return { error: 'Attachment not found on this analysis.' };
        setAnalyses((previous) =>
          previous.map((row) =>
            row.id === analysisId
              ? {
                  ...row,
                  attachments: (row.attachments || []).filter((file) => !matches(file)),
                  activity: pushActivity(
                    row,
                    'Evidence removed',
                    removed.map((file) => file.name).join(', '),
                    by,
                  ),
                }
              : row,
          ),
        );
        removed.forEach((file) => {
          if (file.attachmentId) deleteAttachment(file.attachmentId).catch(() => 0);
        });
        return {};
      },

      addReport: (report) =>
        setReports((previous) => [
          {
            ...report,
            activity: [
              ...(report.activity || []),
              {
                id: `ACT-${report.id}-1`,
                label: 'Report created',
                detail: 'Draft validation report created',
                by: report.preparedBy,
                at: TODAY,
              },
            ],
          },
          ...previous,
        ]),

      updateReport: (id, patch) =>
        setReports((previous) =>
          previous.map((report) => (report.id === id ? { ...report, ...patch } : report)),
        ),

      duplicateReport: (id, by) =>
        setReports((previous) => {
          const source = previous.find((report) => report.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextReportId(previous),
            title: `${source.title} (Copy)`,
            status: 'Draft',
            revision: 'A',
            reportDate: TODAY,
            approvalRef: '',
            revisions: [
              { revision: 'A', date: TODAY, by: by || source.preparedBy, note: `Duplicated from ${source.id} Rev ${source.revision}.` },
            ],
            activity: [
              {
                id: `ACT-DUP-${source.id}`,
                label: 'Report duplicated',
                detail: `Copied from ${source.id} Rev ${source.revision}`,
                by: by || source.preparedBy,
                at: TODAY,
              },
            ],
          };
          return [copy, ...previous];
        }),

      submitReport: (id, by) =>
        setReports((previous) =>
          previous.map((report) =>
            report.id === id
              ? {
                  ...report,
                  status: 'Pending Review',
                  activity: pushActivity(report, 'Submitted for review', `Sent to ${report.reviewer}`, by),
                }
              : report,
          ),
        ),

      approveReport: (id, by) => {
        const report = reports.find((row) => row.id === id);
        if (!report) return { error: 'Validation report not found.' };
        if (!['Pending Review', 'Under Review'].includes(report.status)) {
          return { error: 'Only a pending validation report can be approved.' };
        }
        const evidence = report.analysisIds
          .map((analysisId) => analyses.find((analysis) => analysis.id === analysisId))
          .filter(Boolean);
        if (
          evidence.length !== report.analysisIds.length ||
          evidence.some((analysis) => !isVerifiedEvidence(analysis))
        ) {
          return {
            error:
              'All selected analyses must be verified before this validation report can be approved.',
          };
        }
        setReports((previous) =>
          previous.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status: 'Approved',
                  approvalRef:
                    row.approvalRef ||
                    `APR-${String(row.projectId).replace(/^PRJ-/, '')}-${String(reports.length + 1).padStart(3, '0')}`,
                  activity: pushActivity(row, 'Approved', 'Approval reference recorded', by),
                }
              : row,
          ),
        );
        return {};
      },

      archiveReport: (id, by) =>
        setReports((previous) =>
          previous.map((report) =>
            report.id === id
              ? {
                  ...report,
                  status: 'Archived',
                  activity: pushActivity(report, 'Archived', 'Report archived', by),
                }
              : report,
          ),
        ),

      /** Controlled change: approved reports are superseded by a new revision. */
      createReportRevision: (id, by) =>
        setReports((previous) =>
          previous.map((report) =>
            report.id === id
              ? {
                  ...report,
                  revision: nextRevision(report.revision),
                  status: 'Draft',
                  reportDate: TODAY,
                  approvalRef: '',
                  revisions: [
                    ...(report.revisions || []),
                    {
                      revision: nextRevision(report.revision),
                      date: TODAY,
                      by,
                      note: `New revision raised from Rev ${report.revision}.`,
                    },
                  ],
                  activity: pushActivity(report, 'Revision raised', `Rev ${report.revision} → Rev ${nextRevision(report.revision)}`, by),
                }
              : report,
          ),
        ),
    }),
    [analyses, reviews, reports],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis must be used inside an AnalysisProvider');
  return context;
}
