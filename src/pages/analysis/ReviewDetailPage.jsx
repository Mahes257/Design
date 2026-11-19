import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Newspaper,
  RotateCcw,
  Save,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  ManageColumns,
  Modal,
  PageHeader,
  PageLayout,
  ViewPageBanner,
  Select,
  StatusBadge,
} from '../../components/common';
import AttachmentList from '../../components/attachments/AttachmentList';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  ANALYSIS_REVIEWERS,
  REVIEW_CHECKS,
  componentLabel,
  fieldsForCategory,
  statusTone,
} from '../../data/analysisData';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { AnalysisActivityList, Fact, ReviewHistoryList, Toast, useToast } from './analysisUi';

export default function ReviewDetailPage() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const {
    reviews,
    analyses,
    reviewerPersona,
    recordReviewDecision,
    reassignReviewer,
    saveReviewChecks,
  } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const evidenceColumns = useTableColumnVisibility('/analysis/review/:reviewId', [
    { key: 'field', label: 'Category Field' },
    { key: 'value', label: 'Recorded Value' },
  ]);

  const review = reviews.find((row) => row.id === reviewId);
  const [comments, setComments] = useState(review?.comments || '');
  const [checks, setChecks] = useState(() => ({ ...(review?.checks || {}) }));
  const [findings, setFindings] = useState(review?.findings || '');
  const [correctiveActions, setCorrectiveActions] = useState(review?.correctiveActions || '');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignForm, setReassignForm] = useState({ reviewer: review?.reviewer || '', comments: '' });

  if (!review) {
    return <Navigate to="/analysis/review" replace />;
  }

  const analysis = analyses.find((row) => row.id === review.analysisId) || null;
  const project = projects.find((row) => row.id === analysis?.projectId);
  const closed = ['Verified', 'Rejected', 'Cancelled'].includes(review.status);

  const saveChecks = () => {
    const result = saveReviewChecks(
      review.id,
      { checks, findings, correctiveActions, comments },
      reviewerPersona,
    );
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Verification checklist saved.');
  };

  const decide = (decision) => {
    const result = recordReviewDecision(review.id, {
      decision,
      comments,
      by: reviewerPersona,
    });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${review.id} recorded as ${result.status}.`);
  };

  const confirmReassign = () => {
    if (!reassignForm.reviewer) return;
    reassignReviewer(review.id, reassignForm.reviewer, reviewerPersona, reassignForm.comments);
    showToast(`${review.id} reassigned to ${reassignForm.reviewer}.`);
    setReassignOpen(false);
  };

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={ShieldCheck}
        eyebrow={review.id}
        title={analysis ? analysis.title : review.analysisId}
        subtitle={`${review.analysisId} · submitted by ${review.submittedBy} on ${formatDate(review.submittedDate)}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Engineering Analysis', to: '/analysis' },
              { label: 'Review & Verification', to: '/analysis/review' },
              { label: review.id },
            ]}
          />
        }
        chips={<StatusBadge status={review.status} tone={statusTone(review.status)} />}
        meta={[
          ['Review ID', review.id],
          ['Analysis', review.analysisId],
          ['Reviewer', review.reviewer],
          ['Submitted By', review.submittedBy],
          ['Submitted On', formatDate(review.submittedDate)],
          ['Project', project ? `${project.id} · ${project.name}` : project?.id || '—'],
        ]}
        actions={
          <>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/analysis/review')}
              >
                Back to Reviews
              </Button>
              {analysis && (
                <Button
                  variant="secondary"
                  icon={ClipboardCheck}
                  onClick={() => navigate(`/analysis/${analysis.id}`)}
                >
                  Open Analysis
                </Button>
              )}
              {!closed && (
                <Button
                  variant="secondary"
                  icon={Users}
                  onClick={() => {
                    setReassignForm({ reviewer: review.reviewer, comments: '' });
                    setReassignOpen(true);
                  }}
                >
                  Reassign
                </Button>
              )}
          </>
        }
      />
      <div className="anl-review-layout">
        <div className="anl-review-main">
          <Card title="Analysis Information" icon={ClipboardCheck}>
            <div className="fact-grid">
              <Fact label="Analysis ID">{review.analysisId}</Fact>
              <Fact label="Analysis Type">{analysis?.analysisType}</Fact>
              <Fact label="Category">{analysis?.category}</Fact>
              <Fact label="Project">
                {project ? `${project.id} · ${project.name}` : analysis?.projectId}
              </Fact>
              <Fact label="Part / Assembly">
                {analysis
                  ? componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies)
                  : '—'}
              </Fact>
              <Fact label="Drawing Revision">{analysis?.drawingRevision}</Fact>
              <Fact label="Engineer">{analysis?.engineer}</Fact>
              <Fact label="Analysis Revision">Rev {analysis?.revision}</Fact>
              <Fact label="Priority">{analysis?.priority}</Fact>
            </div>
          </Card>

          <Card title="Technical Evidence" icon={FileText}>
            <div className="mech-detail-sections">
              <section>
                <h3>Input Conditions</h3>
                <p>{analysis?.inputConditions || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Material</h3>
                <p>{analysis?.material || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Assumptions</h3>
                <p>{analysis?.assumptions || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Boundary Conditions</h3>
                <p>{analysis?.boundaryConditions || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Acceptance Criteria</h3>
                <p>{analysis?.acceptanceCriteria || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Result Summary</h3>
                <p>{analysis?.resultSummary || 'Not recorded.'}</p>
              </section>
            </div>

            {analysis && (
              <>
              <ManageColumns {...evidenceColumns.managerProps} />
              <div className="table-wrap anl-evidence-block">
                <table className="data-table mech-detail-table" aria-label="Category evidence fields">
                  <thead>
                    <tr>
                      {evidenceColumns.isVisible('field') && <th scope="col">Category Field</th>}
                      {evidenceColumns.isVisible('value') && <th scope="col">Recorded Value</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fieldsForCategory(analysis.category).map((field) => (
                      <tr key={field.key}>
                        {evidenceColumns.isVisible('field') && (
                          <td className="cell-strong">{field.label}</td>
                        )}
                        {evidenceColumns.isVisible('value') && (
                          <td className="cell-muted">
                            {analysis.tech?.[field.key]
                              ? `${analysis.tech[field.key]}${field.unit ? ` ${field.unit}` : ''}`
                              : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            <p className="anl-subhead">Attachments</p>
            {analysis ? (
              <AttachmentList
                analysis={analysis}
                emptyMessage="No supporting evidence attached to this analysis."
              />
            ) : (
              <p className="dash-modal-note">No supporting evidence attached to this analysis.</p>
            )}
          </Card>

          <Card title="Verification Checklist" icon={ShieldCheck}>
            <div className="form-grid">
              {REVIEW_CHECKS.map((check) => (
                <Select
                  key={check.key}
                  id={`review-check-${check.key}`}
                  label={check.label}
                  options={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Verified', label: 'Verified' },
                    { value: 'Issue Found', label: 'Issue Found' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  value={checks[check.key] || 'Pending'}
                  disabled={closed}
                  onChange={(event) =>
                    setChecks((previous) => ({ ...previous, [check.key]: event.target.value }))
                  }
                />
              ))}
              <div className="form-grid-full">
                <label className="form-label" htmlFor="review-findings">Findings</label>
                <textarea
                  id="review-findings"
                  className="form-input"
                  rows={3}
                  disabled={closed}
                  value={findings}
                  placeholder="What the verification found, including gaps in the evidence"
                  onChange={(event) => setFindings(event.target.value)}
                />
              </div>
              <div className="form-grid-full">
                <label className="form-label" htmlFor="review-corrective-actions">
                  Corrective Actions
                </label>
                <textarea
                  id="review-corrective-actions"
                  className="form-input"
                  rows={3}
                  disabled={closed}
                  value={correctiveActions}
                  placeholder="Actions the engineer must take before a new decision"
                  onChange={(event) => setCorrectiveActions(event.target.value)}
                />
              </div>
            </div>
            <div className="anl-action-buttons">
              <Button variant="secondary" icon={Save} disabled={closed} onClick={saveChecks}>
                Save Checklist
              </Button>
            </div>
            <p className="mech-aside-note">
              The checklist records the reviewer's verification. It never changes the analysis or
              completes an approval on its own.
            </p>
          </Card>

          <Card title="Review Information" icon={ShieldCheck}>
            <div className="fact-grid">
              <Fact label="Review ID">{review.id}</Fact>
              <Fact label="Submitted By">{review.submittedBy}</Fact>
              <Fact label="Submission Date">{formatDate(review.submittedDate)}</Fact>
              <Fact label="Assigned Reviewer">{review.reviewer}</Fact>
              <Fact label="Review Due Date">
                {review.dueDate ? formatDate(review.dueDate) : 'Not set'}
              </Fact>
              <Fact label="Review Priority">{review.priority}</Fact>
              <Fact label="Review Status">{review.status}</Fact>
              <Fact label="Verification Decision">{review.decision || 'Pending'}</Fact>
              <Fact label="Decision Date">
                {review.decisionDate ? formatDate(review.decisionDate) : '—'}
              </Fact>
            </div>
            {review.comments && <p className="mech-detail-pre">{review.comments}</p>}
            {review.evidenceRefs?.length > 0 && (
              <>
                <p className="anl-subhead">Supporting Evidence References</p>
                <ul className="anl-ref-list">
                  {review.evidenceRefs.map((reference) => (
                    <li key={reference}>
                      <FileText aria-hidden="true" />
                      {reference}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card title="Review History" icon={RotateCcw}>
            <ReviewHistoryList history={review.history} />
          </Card>

          {analysis && (
            <Card title="Analysis Activity" icon={ClipboardCheck}>
              <AnalysisActivityList activity={analysis.activity || []} />
            </Card>
          )}
        </div>

        <aside className="anl-review-aside">
          <section className="card anl-action-panel">
            <header className="mech-aside-head">
              <ShieldCheck aria-hidden="true" />
              <strong>Review Action Panel</strong>
            </header>
            <div className="mech-aside-body">
              <div className="mech-aside-group">
                <span className="mech-aside-label">Signed-in reviewer</span>
                <span className="mech-aside-note">{reviewerPersona}</span>
              </div>
              {closed ? (
                <p className="mech-aside-note">
                  This review is closed as <strong>{review.status}</strong>. Decisions are preserved in
                  the review history.
                </p>
              ) : (
                <>
                  <div className="form-field">
                    <label className="form-label" htmlFor="review-action-comments">
                      Reviewer Comments
                    </label>
                    <textarea
                      id="review-action-comments"
                      className="form-input"
                      rows={4}
                      placeholder="What did you check? For changes or rejection, state what is required."
                      value={comments}
                      onChange={(event) => setComments(event.target.value)}
                    />
                  </div>
                  <div className="anl-action-buttons">
                    <Button icon={CheckCircle2} onClick={() => decide('Approve')}>
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      icon={RotateCcw}
                      disabled={!comments.trim()}
                      onClick={() => decide('Return for Correction')}
                    >
                      Return for Correction
                    </Button>
                    <Button
                      variant="secondary"
                      icon={Newspaper}
                      disabled={!comments.trim()}
                      onClick={() => decide('Hold')}
                    >
                      Hold
                    </Button>
                    <Button
                      variant="secondary"
                      icon={X}
                      disabled={!comments.trim()}
                      onClick={() => decide('Reject')}
                    >
                      Reject
                    </Button>
                  </div>
                  <p className="mech-aside-note">
                    Comments are required for return-for-correction, hold and reject decisions. Every decision is
                    appended to the review history — previous decisions are never overwritten.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="mech-aside-hint">
            <strong>Evidence only</strong>
            Verification confirms the evidence package and acceptance criteria were reviewed. It does
            not certify simulation accuracy or release the design.
          </section>
        </aside>
      </div>

      <Modal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title="Reassign Reviewer"
        subtitle={`${review.id} · ${review.analysisId}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button icon={Users} disabled={!reassignForm.reviewer} onClick={confirmReassign}>
              Reassign
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-grid-full">
            <Select
              id="review-reassign-select"
              label="New Reviewer"
              options={ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
              value={reassignForm.reviewer}
              onChange={(event) => setReassignForm((p) => ({ ...p, reviewer: event.target.value }))}
            />
          </div>
          <div className="form-grid-full">
            <div className="form-field">
              <label className="form-label" htmlFor="review-reassign-reason">
                Reason
              </label>
              <textarea
                id="review-reassign-reason"
                className="form-input"
                rows={2}
                value={reassignForm.comments}
                onChange={(event) => setReassignForm((p) => ({ ...p, comments: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
