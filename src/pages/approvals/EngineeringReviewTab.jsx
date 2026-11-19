import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Eye,
  History,
  MessageSquarePlus,
  Paperclip,
  ShieldX,
  Undo2,
} from 'lucide-react';
import { Button, EmptyState, ManageColumns, Select, StatusBadge } from '../../components/common';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useApprovals } from '../../context/ApprovalsContext';
import { useProjects } from '../../context/ProjectsContext';
import { ANALYSES, formatDate } from '../../data/analysisData';
import {
  ENGINEERING_REVIEWERS,
  formatBytes,
  reviewStatusTone,
  stageTone,
} from '../../data/approvalsData';
import {
  ApprovalTimeline,
  AttachmentPreviewModal,
  ChecklistEditor,
  CommentDialog,
  DecisionDialog,
  Fact,
  HistoryDialog,
  RevisionDialog,
  SectionNav,
  StageBadge,
  Toast,
  WorkflowTrack,
  useToast,
} from './approvalsUi';

const SECTIONS = [
  { key: 'design', label: 'Design Review' },
  { key: 'technical', label: 'Technical Validation' },
  { key: 'checklist', label: 'Engineering Checklist' },
  { key: 'evidence', label: 'Calculation & Analysis Evidence' },
  { key: 'comments', label: 'Engineering Comments' },
];

function resultTone(result) {
  return result === 'Pass' ? 'green' : result === 'Fail' ? 'red' : result === 'Pending' ? 'orange' : 'gray';
}

function ChecklistSummary({ items = [] }) {
  return (
    <ul className="approvals-check-summary">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <strong>{item.item}</strong>
            <span>{item.requirement}</span>
            {item.comments && <small>{item.comments}</small>}
          </div>
          <StatusBadge status={item.result} tone={resultTone(item.result)} />
        </li>
      ))}
    </ul>
  );
}

export default function EngineeringReviewTab() {
  const { reviews, engineeringDecision, addComment, updateChecklistResult } = useApprovals();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('design');
  const linkedEvidenceColumns = useTableColumnVisibility('/approvals/review/:reviewId#evidence', [
    { key: 'analysisId', label: 'Analysis ID' },
    { key: 'type', label: 'Analysis Type' },
    { key: 'project', label: 'Project' },
    { key: 'linked', label: 'Part / Assembly' },
    { key: 'drawing', label: 'Drawing Revision' },
    { key: 'engineer', label: 'Engineer' },
    { key: 'status', label: 'Verification Status' },
    { key: 'attachments', label: 'Evidence Attachments' },
  ]);
  const [selectedId, setSelectedId] = useState(() =>
    reviews.find((review) => review.requiredStages.includes('Engineering') && review.status === 'Under Engineering Review')?.id ||
    reviews.find((review) => review.requiredStages.includes('Engineering') && review.status !== 'Draft')?.id ||
    '',
  );
  const [decisionMode, setDecisionMode] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const queue = useMemo(
    () =>
      reviews.filter(
        (review) => review.requiredStages.includes('Engineering') && review.status !== 'Draft',
      ),
    [reviews],
  );

  const activeQueue = queue.filter((review) =>
    ['Under Engineering Review', 'Changes Requested', 'Rejected'].includes(review.status) || review.currentStage === 'Engineering Review',
  );
  const selected =
    queue.find((review) => review.id === selectedId) ||
    activeQueue.find((review) => review.status === 'Under Engineering Review') ||
    queue[0] ||
    null;

  const project = projects.find((row) => row.id === selected?.projectId);
  const canDecide = selected?.status === 'Under Engineering Review';
  const engineeringChecklist = selected?.engineeringChecklist || [];
  const pendingChecks = engineeringChecklist.filter(
    (item) => !['Pass', 'Not Applicable', 'N/A'].includes(item.result),
  ).length;
  const canApprove = canDecide && pendingChecks === 0;
  const evidence = (selected?.technical?.analysisRefs || [])
    .map((reference) => ANALYSES.find((analysis) => analysis.id === reference || reference.includes(analysis.id)))
    .filter(Boolean);
  const engineeringComments = (selected?.comments || []).filter((comment) => comment.stage === 'Engineering Review');

  const recordDecision = (payload) => {
    const result = engineeringDecision(selected.id, payload);
    if (!result.error) {
      showToast(`${selected.id} engineering decision recorded: ${payload.decision}.`);
    }
    return result;
  };

  return (
    <>
      <div className="approvals-context-bar">
        <div className="approvals-context-select">
          <label htmlFor="engineering-review-select">Engineering review</label>
          <select
            id="engineering-review-select"
            className="form-select"
            value={selected?.id || ''}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {queue.map((review) => (
              <option key={review.id} value={review.id}>
                {review.id} · {review.deliverableNumber} Rev {review.revision} · {review.status}
              </option>
            ))}
          </select>
        </div>
        <div className="approvals-context-stats">
          <span><strong>{activeQueue.length}</strong> engineering action</span>
          <span><strong>{queue.filter((review) => review.status === 'Approved').length}</strong> engineering approved</span>
        </div>
      </div>

      {!selected ? (
        <EmptyState icon={ClipboardList} title="No engineering reviews" message="Submit a design review to begin engineering review." />
      ) : (
        <>
          <div className="approvals-review-head">
            <div className="approvals-review-title">
              <span className="cell-id">{selected.id}</span>
              <h3>{selected.deliverableNumber} · Rev {selected.revision}</h3>
              <p>{selected.deliverableName} · {project?.name || selected.projectId}</p>
              <div className="approvals-inline-badges">
                <StatusBadge status={selected.status} tone={reviewStatusTone(selected.status)} />
                <span className="approvals-stage-chip">{selected.currentStage}</span>
                <StatusBadge status={selected.priority} tone={selected.priority === 'Critical' ? 'red' : selected.priority === 'High' ? 'orange' : 'blue'} />
              </div>
            </div>
            <div className="approvals-review-actions">
              <Button size="sm" icon={CheckCircle2} disabled={!canApprove} onClick={() => setDecisionMode('Approve')}>Approve Engineering Review</Button>
              <Button size="sm" variant="secondary" icon={ShieldX} disabled={!canDecide} onClick={() => setDecisionMode('Reject')}>Reject</Button>
              <Button size="sm" variant="secondary" icon={Undo2} disabled={!canDecide} onClick={() => setDecisionMode('Request Changes')}>Request Changes</Button>
              <Button size="sm" variant="ghost" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
              <Button size="sm" variant="ghost" icon={Eye} onClick={() => setRevisionTarget(selected)}>View Revision</Button>
              <Button size="sm" variant="ghost" icon={History} onClick={() => setHistoryTarget(selected)}>Review History</Button>
            </div>
          </div>

          {!canDecide && (
            <div className="approvals-banner is-muted">
              <span>Engineering actions are available only while this review is in the Under Engineering Review stage.</span>
            </div>
          )}

          {canDecide && pendingChecks > 0 && (
            <div className="approvals-banner is-muted">
              <span>
                {pendingChecks} engineering checklist item{pendingChecks === 1 ? '' : 's'} remain pending.
                Record every item as Pass, Fail or Not Applicable before approving the engineering review. A Fail result requires a corrective action before approval.
              </span>
            </div>
          )}

          <WorkflowTrack review={selected} />
          <SectionNav sections={SECTIONS} active={section} onChange={setSection} />

          {section === 'design' && (
            <div className="approvals-two-col">
              <section className="card approvals-panel">
                <div className="approvals-card-head">
                  <div><strong>Design Review</strong><p>Inspect design correctness, drawing references, dimensions and revision information.</p></div>
                  <StageBadge status={selected.stageStates.engineering.status} />
                </div>
                <div className="fact-grid approvals-pad">
                  <Fact label="Review ID">{selected.id}</Fact>
                  <Fact label="Project">{selected.projectId} · {project?.name || ''}</Fact>
                  <Fact label="Deliverable Type">{selected.deliverableType}</Fact>
                  <Fact label="Deliverable Number">{selected.deliverableNumber}</Fact>
                  <Fact label="Revision">Rev {selected.revision}</Fact>
                  <Fact label="BOM Revision">{selected.bomId ? `${selected.bomId} · Rev ${selected.bomRevision}` : 'Not linked'}</Fact>
                  <Fact label="Drawing Revision">{selected.drawingId ? `${selected.drawingId} · Rev ${selected.drawingRevision}` : 'Not linked'}</Fact>
                  <Fact label="Part / Assembly">{selected.partRef || 'Not linked'}</Fact>
                  <Fact label="Submitted By">{selected.submittedBy}</Fact>
                  <Fact label="Review Date">{formatDate(selected.reviewDate || selected.submittedAt)}</Fact>
                  <Fact label="Assigned Reviewer">{selected.engineeringReviewer}</Fact>
                  <Fact label="Submission Date">{formatDate(selected.submittedAt)}</Fact>
                  <Fact label="Due Date">{formatDate(selected.dueDate)}</Fact>
                  <Fact label="Drawing References">
                    <span className="approvals-ref-list">{selected.designReview.drawingReferences.join(' · ')}</span>
                  </Fact>
                  <Fact label="Priority">{selected.priority}</Fact>
                </div>
                <div className="approvals-text-block">
                  <h4>Review Notes</h4>
                  <p>{selected.designReview.notes}</p>
                  <h4>Review Instructions</h4>
                  <p>{selected.reviewInstructions}</p>
                </div>
                <div className="approvals-subsection">
                  <h4>Attachments</h4>
                  {selected.attachments.length === 0 ? (
                    <p className="cell-muted">No attachments recorded for this submission.</p>
                  ) : (
                    <ul className="approvals-attachments">
                      {selected.attachments.map((attachment) => (
                        <li key={attachment.name}>
                          <Paperclip aria-hidden="true" />
                          <div><strong>{attachment.name}</strong><span>{attachment.type} · {formatBytes(attachment.size)}</span></div>
                          <Button variant="ghost" size="sm" icon={Eye} onClick={() => setPreviewAttachment(attachment)}>View</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
              <aside className="approvals-side-stack">
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Design checklist</strong><p>Recorded review results for this revision.</p></div></div>
                  <div className="approvals-pad"><ChecklistSummary items={selected.designChecklist} /></div>
                </section>
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Engineering decision</strong></div></div>
                  <div className="approvals-pad">
                    <Fact label="Decision">{selected.stageStates.engineering.decision || 'Pending'}</Fact>
                    <Fact label="Reviewer">{selected.stageStates.engineering.reviewer}</Fact>
                    <Fact label="Decision date">{selected.stageStates.engineering.decidedAt ? formatDate(selected.stageStates.engineering.decidedAt) : '—'}</Fact>
                    {selected.stageStates.engineering.comments && <p className="approvals-decision-note">{selected.stageStates.engineering.comments}</p>}
                  </div>
                </section>
              </aside>
            </div>
          )}

          {section === 'technical' && (
            <div className="approvals-two-col">
              <section className="card approvals-panel">
                <div className="approvals-card-head">
                  <div><strong>Technical Validation</strong><p>Requirements, evidence references, assumptions and acceptance criteria.</p></div>
                  <Activity aria-hidden="true" />
                </div>
                <div className="fact-grid approvals-pad">
                  <Fact label="Technical requirements">
                    <span className="approvals-ref-list">{selected.technical.requirements.join(' · ')}</span>
                  </Fact>
                  <Fact label="Linked design calculations">
                    <span className="approvals-ref-list">{selected.technical.linkedCalculations.join(' · ')}</span>
                  </Fact>
                  <Fact label="Analysis references">
                    <span className="approvals-ref-list">{selected.technical.analysisRefs.join(' · ')}</span>
                  </Fact>
                  <Fact label="Material & specification refs">{selected.technical.materialSpecs}</Fact>
                  <Fact label="Stress & strength evidence">{selected.technical.stressEvidence}</Fact>
                  <Fact label="Thermal evidence">{selected.technical.thermalEvidence}</Fact>
                  <Fact label="Motion / kinematics evidence">{selected.technical.motionEvidence}</Fact>
                  <Fact label="Assumptions & input conditions">{selected.technical.assumptions}</Fact>
                  <Fact label="Acceptance criteria">{selected.technical.acceptanceCriteria}</Fact>
                </div>
                <div className="approvals-note-block">
                  <Calculator aria-hidden="true" />
                  <p>Evidence is referenced from the linked calculation and Engineering Analysis records. This review does not recompute calculations or generate certified FEA results.</p>
                </div>
              </section>
              <aside className="approvals-side-stack">
                <section className="card approvals-panel">
                  <div className="approvals-card-head">
                    <div><strong>Technical checklist</strong><p>Validation checks recorded by the reviewer. Changes persist locally.</p></div>
                    <span className="approvals-count-chip">{selected.technicalChecklist.filter((item) => item.result === 'Pass').length}/{selected.technicalChecklist.length} passed</span>
                  </div>
                  <div className="approvals-pad">
                    <ChecklistEditor
                      items={selected.technicalChecklist}
                      ariaLabel="Technical checklist"
                      onUpdate={(item, patch) => updateChecklistResult(selected.id, 'technicalChecklist', item.id, patch)}
                    />
                  </div>
                </section>
              </aside>
            </div>
          )}

          {section === 'checklist' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>Engineering Review Checklist</strong><p>Eleven controlled review categories for the submitted revision. Changes persist locally.</p></div>
                <span className="approvals-count-chip">{engineeringChecklist.filter((item) => item.result === 'Pass').length}/{engineeringChecklist.length} passed</span>
              </div>
              <div className="approvals-pad">
                {[...new Set(engineeringChecklist.map((item) => item.category || 'General'))].map((category) => (
                  <div key={category} className="approvals-subsection">
                    <h4>{category}</h4>
                    <ChecklistEditor
                      items={engineeringChecklist.filter((item) => (item.category || 'General') === category)}
                      ariaLabel={`Engineering checklist ${category}`}
                      onUpdate={(item, patch) => updateChecklistResult(selected.id, 'engineeringChecklist', item.id, patch)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === 'evidence' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>Calculation & Analysis Evidence</strong><p>Linked records from the Engineering Analysis register. Values are references, not regenerated results.</p></div>
              </div>
              {evidence.length === 0 ? (
                <EmptyState icon={Calculator} title="No linked analysis evidence" message="This review references calculation or analysis evidence that is not present in the mock Engineering Analysis register." />
              ) : (
                <>
                <ManageColumns {...linkedEvidenceColumns.managerProps} />
                <div className="table-wrap">
                  <table className="data-table approvals-evidence-table table-pin-left" aria-label="Linked engineering analysis evidence">
                    <thead>
                      <tr>
                        {linkedEvidenceColumns.isVisible('analysisId') && <th>Analysis ID</th>}
                        {linkedEvidenceColumns.isVisible('type') && <th>Analysis Type</th>}
                        {linkedEvidenceColumns.isVisible('project') && <th>Project</th>}
                        {linkedEvidenceColumns.isVisible('linked') && <th>Part / Assembly</th>}
                        {linkedEvidenceColumns.isVisible('drawing') && <th>Drawing Revision</th>}
                        {linkedEvidenceColumns.isVisible('engineer') && <th>Engineer</th>}
                        {linkedEvidenceColumns.isVisible('status') && <th>Verification Status</th>}
                        {linkedEvidenceColumns.isVisible('attachments') && <th>Evidence Attachments</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {evidence.map((analysis) => (
                        <tr key={analysis.id}>
                          {linkedEvidenceColumns.isVisible('analysisId') && <td><span className="cell-id">{analysis.id}</span></td>}
                          {linkedEvidenceColumns.isVisible('type') && <td>{analysis.analysisType}</td>}
                          {linkedEvidenceColumns.isVisible('project') && <td>{analysis.projectId}</td>}
                          {linkedEvidenceColumns.isVisible('linked') && <td>{analysis.linkedId}</td>}
                          {linkedEvidenceColumns.isVisible('drawing') && <td>{analysis.drawingRevision}</td>}
                          {linkedEvidenceColumns.isVisible('engineer') && <td>{analysis.engineer}</td>}
                          {linkedEvidenceColumns.isVisible('status') && <td><StatusBadge status={analysis.verificationStatus} tone={stageTone(analysis.verificationStatus === 'Verified' ? 'Approved' : analysis.verificationStatus)} /></td>}
                          {linkedEvidenceColumns.isVisible('attachments') && <td>
                            {analysis.attachments.length === 0 ? <span className="cell-muted">No evidence attached</span> : (
                              <div className="approvals-evidence-links">
                                {analysis.attachments.map((attachment) => (
                                  <button key={attachment.name} type="button" className="link-button" onClick={() => setPreviewAttachment({ ...attachment, type: attachment.type, size: attachment.size })}>
                                    {attachment.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
              <p className="mech-footnote approvals-pad-x">This module displays linked evidence references only. It does not generate calculations or certify FEA results.</p>
            </section>
          )}

          {section === 'comments' && (
            <div className="approvals-two-col">
              <section className="card approvals-panel">
                <div className="approvals-card-head">
                  <div><strong>Engineering Comments</strong><p>Comments preserve author, reviewer role, timestamp, checklist item and attachment reference.</p></div>
                  <Button size="sm" variant="secondary" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
                </div>
                {engineeringComments.length === 0 ? (
                  <EmptyState icon={MessageSquarePlus} title="No engineering comments" message="Add a comment to record the engineering review discussion." />
                ) : (
                  <ul className="approvals-comment-list">
                    {engineeringComments.map((comment) => (
                      <li key={comment.id}>
                        <div className="approvals-comment-head">
                          <div><strong>{comment.author}</strong><span>{comment.role} · {comment.at}</span></div>
                          <span className="approvals-count-chip">{comment.responseStatus}</span>
                        </div>
                        <p>{comment.text}</p>
                        <div className="approvals-comment-meta">
                          <span>Stage: {comment.stage}</span>
                          {comment.checklistItem && <span>Checklist: {comment.checklistItem}</span>}
                          {comment.attachment && <button type="button" className="link-button" onClick={() => setPreviewAttachment({ name: comment.attachment, type: 'Reference', size: 0 })}>{comment.attachment}</button>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <aside className="approvals-side-stack">
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Decision timeline</strong></div></div>
                  <div className="approvals-pad"><ApprovalTimeline history={selected.history} limit={6} compact /></div>
                </section>
              </aside>
            </div>
          )}

          <div className="approvals-audit-note">
            <Link to={`/design-review/review/${selected.id}`}>Open the full review record</Link>
            <span>Engineering decisions and comments are locally recorded simulation data, not backend authorization.</span>
          </div>
        </>
      )}

      {selected && decisionMode && (
        <DecisionDialog
          key={`${selected.id}-${decisionMode}`}
          open
          onClose={() => setDecisionMode('')}
          title={`${decisionMode} Engineering Review`}
          subtitle={`${selected.id} · ${selected.deliverableNumber} Rev ${selected.revision}`}
          actions={[
            { value: 'Approve', label: 'Approve Engineering Review' },
            { value: 'Reject', label: 'Reject' },
            { value: 'Request Changes', label: 'Request Changes' },
          ]}
          defaultDecision={decisionMode}
          reviewerLabel="Engineering Reviewer"
          reviewerOptions={ENGINEERING_REVIEWERS}
          defaultReviewer={selected.engineeringReviewer}
          onSubmit={recordDecision}
        >
          <p className="approvals-note span-2">Approval advances the review to Manufacturing Review only when that stage is applicable. Otherwise it moves to the client gate or final release eligibility.</p>
        </DecisionDialog>
      )}

      {selected && (
        <CommentDialog
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          stage="Engineering Review"
          defaultAuthor={selected.engineeringReviewer}
          defaultRole="Engineering Reviewer"
          checklistItems={[...selected.designChecklist, ...selected.technicalChecklist]}
          onSubmit={(payload) => {
            const result = addComment(selected.id, payload);
            if (!result.error) showToast('Engineering comment recorded.');
            return result;
          }}
        />
      )}

      <RevisionDialog review={revisionTarget} onClose={() => setRevisionTarget(null)} />
      <HistoryDialog review={historyTarget} onClose={() => setHistoryTarget(null)} />
      <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
