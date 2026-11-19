import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Factory,
  History,
  MessageSquarePlus,
  Paperclip,
  Ruler,
  ShieldX,
  Undo2,
  Wrench,
} from 'lucide-react';
import { Button, EmptyState, StatusBadge } from '../../components/common';
import { useApprovals } from '../../context/ApprovalsContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/analysisData';
import {
  MANUFACTURING_REVIEWERS,
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
  { key: 'manufacturability', label: 'Manufacturability' },
  { key: 'checklist', label: 'Manufacturing Checklist' },
  { key: 'tolerances', label: 'Tolerances & Fits' },
  { key: 'process', label: 'Process Suitability' },
  { key: 'inspection', label: 'Inspection Requirements' },
  { key: 'comments', label: 'Manufacturing Comments' },
];

function resultTone(result) {
  return result === 'Pass' ? 'green' : result === 'Fail' ? 'red' : result === 'Pending' ? 'orange' : 'gray';
}

export default function ManufacturingReviewTab() {
  const { reviews, manufacturingDecision, addComment, updateChecklistResult } = useApprovals();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('manufacturability');
  const [selectedId, setSelectedId] = useState(() =>
    reviews.find((review) => review.status === 'Under Manufacturing Review')?.id ||
    reviews.find((review) => review.requiredStages.includes('Manufacturing') && review.status !== 'Draft')?.id ||
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
        (review) => review.requiredStages.includes('Manufacturing') && review.status !== 'Draft',
      ),
    [reviews],
  );
  const activeQueue = queue.filter((review) => review.status === 'Under Manufacturing Review');
  const selected =
    queue.find((review) => review.id === selectedId) ||
    activeQueue[0] ||
    queue.find((review) => review.status === 'Under Engineering Review') ||
    queue[0] ||
    null;
  const project = projects.find((row) => row.id === selected?.projectId);
  const canDecide = selected?.status === 'Under Manufacturing Review';
  const pendingChecks = (selected?.manufacturingChecklist || []).filter(
    (item) => !['Pass', 'Not Applicable', 'N/A'].includes(item.result),
  ).length;
  const canApprove = canDecide && pendingChecks === 0;
  const comments = (selected?.comments || []).filter((comment) => comment.stage === 'Manufacturing Review');

  const recordDecision = (payload) => {
    const result = manufacturingDecision(selected.id, payload);
    if (!result.error) showToast(`${selected.id} manufacturing decision recorded: ${payload.decision}.`);
    return result;
  };

  return (
    <>
      <div className="approvals-context-bar">
        <div className="approvals-context-select">
          <label htmlFor="manufacturing-review-select">Manufacturing review</label>
          <select
            id="manufacturing-review-select"
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
          <span><strong>{activeQueue.length}</strong> manufacturing action</span>
          <span><strong>{queue.filter((review) => review.stageStates.manufacturing.status === 'Approved').length}</strong> manufacturing approved</span>
        </div>
      </div>

      {!selected ? (
        <EmptyState icon={Factory} title="No manufacturing reviews" message="Manufacturing review records appear here when that stage is applicable." />
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
                <StageBadge status={selected.stageStates.manufacturing.status} />
              </div>
            </div>
            <div className="approvals-review-actions">
              <Button size="sm" icon={CheckCircle2} disabled={!canApprove} onClick={() => setDecisionMode('Approve')}>Approve Manufacturing Review</Button>
              <Button size="sm" variant="secondary" icon={ShieldX} disabled={!canDecide} onClick={() => setDecisionMode('Reject')}>Reject</Button>
              <Button size="sm" variant="secondary" icon={Undo2} disabled={!canDecide} onClick={() => setDecisionMode('Request Changes')}>Request Changes</Button>
              <Button size="sm" variant="ghost" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
              <Button size="sm" variant="ghost" icon={Eye} onClick={() => setRevisionTarget(selected)}>View Revision</Button>
              <Button size="sm" variant="ghost" icon={History} onClick={() => setHistoryTarget(selected)}>History</Button>
            </div>
          </div>

          {!canDecide && (
            <div className="approvals-banner is-muted">
              <span>Manufacturing decisions are available only while this review is in the Under Manufacturing Review stage.</span>
            </div>
          )}

          {canDecide && pendingChecks > 0 && (
            <div className="approvals-banner is-muted">
              <span>
                {pendingChecks} manufacturing checklist item{pendingChecks === 1 ? '' : 's'} remain pending or failed.
                Record every item as Pass or Not Applicable before approving. Material availability must remain Pending unless verified information has been entered.
              </span>
            </div>
          )}

          <WorkflowTrack review={selected} />
          <SectionNav sections={SECTIONS} active={section} onChange={setSection} />

          {section === 'manufacturability' && (
            <div className="approvals-two-col">
              <section className="card approvals-panel">
                <div className="approvals-card-head">
                  <div><strong>Manufacturability</strong><p>Manufacturing feasibility, accessibility, assembly and constraints.</p></div>
                  <Factory aria-hidden="true" />
                </div>
                <div className="fact-grid approvals-pad">
                  <Fact label="Manufacturing Feasibility">{selected.manufacturing.feasibility}</Fact>
                  <Fact label="Component Accessibility">{selected.manufacturing.accessibility}</Fact>
                  <Fact label="Assembly Feasibility">{selected.manufacturing.assemblyFeasibility}</Fact>
                  <Fact label="Manufacturing Constraints">{selected.manufacturing.constraints}</Fact>
                  <Fact label="Special Manufacturing Requirements">{selected.manufacturing.specialRequirements}</Fact>
                </div>

              </section>
              <aside className="approvals-side-stack">
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Review context</strong></div></div>
                  <div className="approvals-pad">
                    <Fact label="Project">{selected.projectId} · {project?.name || ''}</Fact>
                    <Fact label="BOM Revision">{selected.bomId ? `${selected.bomId} · Rev ${selected.bomRevision}` : 'Not linked'}</Fact>
                    <Fact label="Drawing Revision">{selected.drawingId ? `${selected.drawingId} · Rev ${selected.drawingRevision}` : 'Not linked'}</Fact>
                    <Fact label="Part / Assembly">{selected.partRef || 'Not linked'}</Fact>
                    <Fact label="Submitted By">{selected.submittedBy}</Fact>
                    <Fact label="Review Date">{formatDate(selected.reviewDate || selected.submittedAt)}</Fact>
                    <Fact label="Manufacturing Reviewer">{selected.manufacturingReviewer}</Fact>
                    <Fact label="Submission Date">{formatDate(selected.submittedAt)}</Fact>
                    <Fact label="Due Date">{formatDate(selected.dueDate)}</Fact>
                  </div>
                </section>
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Manufacturing decision</strong></div></div>
                  <div className="approvals-pad">
                    <Fact label="Decision">{selected.stageStates.manufacturing.decision || 'Pending'}</Fact>
                    <Fact label="Decision date">{selected.stageStates.manufacturing.decidedAt ? formatDate(selected.stageStates.manufacturing.decidedAt) : '—'}</Fact>
                    {selected.stageStates.manufacturing.comments && <p className="approvals-decision-note">{selected.stageStates.manufacturing.comments}</p>}
                  </div>
                </section>
              </aside>
            </div>
          )}

          {section === 'checklist' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>Manufacturing Review Checklist</strong><p>Eleven controlled manufacturing categories. Only verified information should be marked Pass.</p></div>
                <span className="approvals-count-chip">{selected.manufacturingChecklist.filter((item) => item.result === 'Pass').length}/{selected.manufacturingChecklist.length} passed</span>
              </div>
              <div className="approvals-pad">
                {[...new Set(selected.manufacturingChecklist.map((item) => item.category || 'General'))].map((category) => (
                  <div key={category} className="approvals-subsection">
                    <h4>{category}</h4>
                    <ChecklistEditor
                      items={selected.manufacturingChecklist.filter((item) => (item.category || 'General') === category)}
                      ariaLabel={`Manufacturing checklist ${category}`}
                      onUpdate={(item, patch) => updateChecklistResult(selected.id, 'manufacturingChecklist', item.id, patch)}
                    />
                  </div>
                ))}
              </div>
              <p className="mech-footnote approvals-pad-x">Material availability and production capability are not assumed. Record only verified supplier or shop information; otherwise leave the item Pending.</p>
            </section>
          )}

          {section === 'tolerances' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>Tolerances & Fits</strong><p>Reviewed dimensional and geometric tolerances, fits, clearances and critical dimensions.</p></div>
                <Ruler aria-hidden="true" />
              </div>
              <div className="fact-grid approvals-pad">
                <Fact label="Dimensional Tolerances">{selected.manufacturing.dimensionalTolerances}</Fact>
                <Fact label="Geometric Tolerances">{selected.manufacturing.geometricTolerances}</Fact>
                <Fact label="Fits and Clearances">{selected.manufacturing.fits}</Fact>
                <Fact label="Critical Dimensions">{selected.manufacturing.criticalDimensions}</Fact>
                <Fact label="Tolerance Notes">{selected.manufacturing.toleranceNotes}</Fact>
                <Fact label="Drawing References">{selected.manufacturing.drawingRefs}</Fact>
              </div>
              <div className="approvals-note-block">
                <Ruler aria-hidden="true" />
                <p>Tolerance values are recorded against the submitted drawing revision. A new revision must be reviewed again; earlier manufacturing approval does not carry forward.</p>
              </div>
            </section>
          )}

          {section === 'process' && (
            <div className="approvals-two-col">
              <section className="card approvals-panel">
                <div className="approvals-card-head">
                  <div><strong>Process Suitability</strong><p>Machining, fabrication, welding and sheet-metal process assessment.</p></div>
                  <Wrench aria-hidden="true" />
                </div>
                <div className="fact-grid approvals-pad">
                  <Fact label="Machining Suitability">{selected.manufacturing.machining}</Fact>
                  <Fact label="Fabrication Suitability">{selected.manufacturing.fabrication}</Fact>
                  <Fact label="Welding Suitability">{selected.manufacturing.welding}</Fact>
                  <Fact label="Sheet Metal Suitability">{selected.manufacturing.sheetMetal}</Fact>
                  <Fact label="Process Constraints">{selected.manufacturing.processConstraints}</Fact>
                </div>
                <div className="approvals-subsection">
                  <h4>Required manufacturing processes</h4>
                  <div className="approvals-tag-row">
                    {selected.manufacturing.processes.map((process) => <span key={process} className="approvals-tag">{process}</span>)}
                  </div>
                  <h4>Equipment requirements</h4>
                  <div className="approvals-tag-row">
                    {selected.manufacturing.equipment.map((equipment) => <span key={equipment} className="approvals-tag">{equipment}</span>)}
                  </div>
                </div>
              </section>
              <aside className="approvals-side-stack">
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Attachments</strong></div></div>
                  {selected.attachments.length === 0 ? <p className="cell-muted approvals-pad">No attachments.</p> : (
                    <ul className="approvals-attachments approvals-pad">
                      {selected.attachments.map((attachment) => (
                        <li key={attachment.name}>
                          <Paperclip aria-hidden="true" />
                          <div><strong>{attachment.name}</strong><span>{attachment.type} · {formatBytes(attachment.size)}</span></div>
                          <Button variant="ghost" size="sm" icon={Eye} onClick={() => setPreviewAttachment(attachment)}>View</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </aside>
            </div>
          )}

          {section === 'inspection' && (
            <section className="card approvals-panel">
              <div className="approvals-card-head">
                <div><strong>Inspection Requirements</strong><p>Inspection points and acceptance requirements for the manufacturing review.</p></div>
                <ClipboardCheck aria-hidden="true" />
              </div>
              <div className="fact-grid approvals-pad">
                <Fact label="Inspection Points">{selected.manufacturing.inspectionPoints}</Fact>
                <Fact label="Critical Characteristics">{selected.manufacturing.criticalCharacteristics}</Fact>
                <Fact label="Measurement Requirements">{selected.manufacturing.measurement}</Fact>
                <Fact label="Acceptance Criteria">{selected.manufacturing.acceptance}</Fact>
                <Fact label="Inspection Plan References">{selected.manufacturing.inspectionRefs}</Fact>
                <Fact label="Inspection Notes">{selected.manufacturing.inspectionNotes}</Fact>
              </div>
              <div className="approvals-note-block">
                <ClipboardCheck aria-hidden="true" />
                <p>Inspection execution and quality results are not recorded here. Those remain in the existing Quality Control module.</p>
              </div>
            </section>
          )}

          {section === 'comments' && (
            <div className="approvals-two-col">
              <section className="card approvals-panel">
                <div className="approvals-card-head">
                  <div><strong>Manufacturing Comments</strong><p>Reviewer comments, constraints, recommended changes and unresolved issues.</p></div>
                  <Button size="sm" variant="secondary" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
                </div>
                {comments.length === 0 ? (
                  <EmptyState icon={MessageSquarePlus} title="No manufacturing comments" message="Record manufacturing constraints or recommended changes for this revision." />
                ) : (
                  <ul className="approvals-comment-list">
                    {comments.map((comment) => (
                      <li key={comment.id}>
                        <div className="approvals-comment-head">
                          <div><strong>{comment.author}</strong><span>{comment.role} · {comment.at}</span></div>
                          <span className="approvals-count-chip">{comment.responseStatus}</span>
                        </div>
                        <p>{comment.text}</p>
                        <div className="approvals-comment-meta">
                          <span>Stage: {comment.stage}</span>
                          {comment.checklistItem && <span>Checklist: {comment.checklistItem}</span>}
                          {comment.attachment && <span>Attachment: {comment.attachment}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <aside className="approvals-side-stack">
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Manufacturing checklist</strong></div></div>
                  <div className="approvals-pad">
                    <ul className="approvals-check-summary">
                      {selected.manufacturingChecklist.map((item) => (
                        <li key={item.id}>
                          <div><strong>{item.item}</strong><span>{item.comments || item.requirement}</span></div>
                          <StatusBadge status={item.result} tone={resultTone(item.result)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
                <section className="card approvals-panel">
                  <div className="approvals-card-head"><div><strong>Decision timeline</strong></div></div>
                  <div className="approvals-pad"><ApprovalTimeline history={selected.history} limit={6} compact /></div>
                </section>
              </aside>
            </div>
          )}

          <div className="approvals-audit-note">
            <Link to={`/design-review/review/${selected.id}`}>Open the full review record</Link>
            <span>Manufacturing approval advances to the client gate only when client approval is required; otherwise the exact revision becomes release-eligible.</span>
          </div>
        </>
      )}

      {selected && decisionMode && (
        <DecisionDialog
          key={`${selected.id}-${decisionMode}`}
          open
          onClose={() => setDecisionMode('')}
          title={`${decisionMode} Manufacturing Review`}
          subtitle={`${selected.id} · ${selected.deliverableNumber} Rev ${selected.revision}`}
          actions={[
            { value: 'Approve', label: 'Approve Manufacturing Review' },
            { value: 'Reject', label: 'Reject' },
            { value: 'Request Changes', label: 'Request Changes' },
          ]}
          defaultDecision={decisionMode}
          reviewerLabel="Manufacturing Reviewer"
          reviewerOptions={MANUFACTURING_REVIEWERS}
          defaultReviewer={selected.manufacturingReviewer}
          onSubmit={recordDecision}
        >
          <p className="approvals-note span-2">Manufacturing approval is valid only for the exact submitted revision. A corrected revision restarts all required stages.</p>
        </DecisionDialog>
      )}

      {selected && (
        <CommentDialog
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          stage="Manufacturing Review"
          defaultAuthor={selected.manufacturingReviewer}
          defaultRole="Manufacturing Reviewer"
          checklistItems={selected.manufacturingChecklist}
          onSubmit={(payload) => {
            const result = addComment(selected.id, payload);
            if (!result.error) showToast('Manufacturing comment recorded.');
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
