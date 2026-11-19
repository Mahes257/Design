import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  History,
  Paperclip,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Breadcrumb, Button, Modal, PageLayout, Select, StatusBadge, Textarea, ViewPageBanner } from '../../components/common';
import { DASHBOARD, MODULES } from '../../config/navigation';
import { useApprovals } from '../../context/ApprovalsContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { handoverConversionEligibility } from '../../data/designHandoverConversion';
import {
  ADMIN_APPROVERS,
  CLIENT_REVIEWERS,
  CLIENT_STAGE_LABEL,
  clientApprovalActor,
  clientApprovalSummary,
  stageDisplayName,
  formatBytes,
  formatDate,
  isReleaseEligible,
  releaseSourceStatus,
  reviewStatusTone,
  stageTone,
} from '../../data/approvalsData';
import {
  ApprovalTimeline,
  AttachmentPreviewModal,
  Fact,
  HistoryDialog,
  RevisionDialog,
  StageBadge,
  Toast,
  WorkflowTrack,
  useToast,
} from './approvalsUi';
import './review-detail-readability.css';

const MODULE = MODULES.find((module) => module.key === 'approvals');

export default function ReviewDetailPage() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { reviews, submitReview, clientDecision } = useApprovals();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { projects } = useProjects();
  const { designs } = useMechanical();
  const { changes } = useEngineeringRelease();
  const { findHandoverForRevision } = useDesignHandover();
  const { toast, showToast, clearToast } = useToast();
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientRole, setClientRole] = useState('Client');
  const [clientApprover, setClientApprover] = useState(CLIENT_REVIEWERS[0]);
  const [clientChoice, setClientChoice] = useState('Approve');
  const [clientComments, setClientComments] = useState('');
  const [clientError, setClientError] = useState('');

  const review = reviews.find((row) => row.id === reviewId);
  const notice = location.state?.notice;
  if (!review) return <Navigate to="/design-review" replace />;

  const project = projects.find((row) => row.id === review.projectId);
  const isDraft = review.status === 'Draft';
  const source = releaseSourceStatus(review, boms, drawings);
  const eligible = isReleaseEligible(review, boms, drawings);
  const reviewDesign = designs.find((row) => row.id === review.designId);
  const conversion = handoverConversionEligibility({ review, design: reviewDesign, project, changes });
  const existingHandover = findHandoverForRevision({
    projectId: review.projectId,
    designId: review.designId,
    designRevision: review.designRevision,
  });
  const canOpenHandover = Boolean(existingHandover) || conversion.eligible;
  const handoverLabel = existingHandover ? 'Open Production Handover' : 'Convert to Production Handover';
  const openHandover = () => {
    if (existingHandover) {
      navigate(`/design-handover/${existingHandover.id}`, {
        state: {
          notice: `${existingHandover.id} already exists for ${review.designId} Rev ${review.designRevision}. Open the existing handover instead of creating a duplicate.`,
        },
      });
      return;
    }
    if (!conversion.eligible) return;
    navigate(`/design-handover/new?fromReview=${review.id}`, {
      state: {
        sourceReviewId: review.id,
        returnTo: `/design-review/review/${review.id}`,
      },
    });
  };
  const clientActor = clientApprovalActor(review);
  const clientSummary = clientApprovalSummary(review);
  const clientStageStatus = review.stageStates.client.status;
  const clientActionable =
    review.clientRequired &&
    !['Approved', 'Rejected', 'Changes Requested', 'Not Required'].includes(clientStageStatus) &&
    review.stageStates.engineering.status === 'Approved' &&
    (!review.requiredStages.includes('Manufacturing') || review.stageStates.manufacturing.status === 'Approved');
  const openClientDecision = () => {
    setClientRole('Client');
    setClientApprover(CLIENT_REVIEWERS[0]);
    setClientChoice('Approve');
    setClientComments('');
    setClientError('');
    setClientOpen(true);
  };
  const stageCards = [
    { key: 'engineering', label: 'Engineering Review', status: review.stageStates.engineering.status, reviewer: review.engineeringReviewer, at: review.stageStates.engineering.decidedAt, note: review.stageStates.engineering.comments, required: review.requiredStages.includes('Engineering'), tab: '/design-review/engineering' },
    { key: 'manufacturing', label: 'Manufacturing Review', status: review.requiredStages.includes('Manufacturing') ? review.stageStates.manufacturing.status : 'Not Required', reviewer: review.manufacturingReviewer, at: review.stageStates.manufacturing.decidedAt, note: review.stageStates.manufacturing.comments, required: review.requiredStages.includes('Manufacturing'), tab: '/design-review/manufacturing' },
    { key: 'client', label: CLIENT_STAGE_LABEL, status: review.clientRequired ? clientStageStatus : 'Not Required', reviewer: clientActor ? `${clientActor.role} · ${clientActor.reviewer}` : (review.clientRequired ? 'Client or Admin' : review.clientReviewer), at: review.stageStates.client.decidedAt, note: review.clientRequired ? clientSummary : review.stageStates.client.comments, required: review.clientRequired, tab: '/design-review/releases' },
    { key: 'final', label: 'Final Approval', status: review.finalApproval?.decision || (review.status === 'Ready for Final Approval' ? 'Pending' : 'Not Ready'), reviewer: review.finalApproval?.approver || 'Design Authority', at: review.finalApproval?.at, note: review.finalApproval?.comments, required: true, tab: '/design-review/releases' },
  ];

  return (
    <PageLayout className="vpb-page approvals-review-detail-page">
      <ViewPageBanner
        icon={ClipboardCheck}
        eyebrow={review.id}
        title={review.deliverableName}
        subtitle={`${review.deliverableNumber} · Rev ${review.revision} · ${review.deliverableType} · ${project?.name || review.projectId}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: DASHBOARD.path },
              { label: MODULE.label, to: MODULE.base },
              { label: review.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={review.status} tone={reviewStatusTone(review.status)} />
            <span className="approvals-stage-chip">{stageDisplayName(review.currentStage)}</span>
            <StatusBadge status={review.priority} tone={review.priority === 'Critical' ? 'red' : review.priority === 'High' ? 'orange' : 'blue'} />
            {review.release && <StatusBadge status={review.release.releaseId} tone="green" />}
          </>
        }
        meta={[
          ['Review Number', review.id],
          ['Review Type', review.reviewType],
          ['Project', `${review.projectId} · ${project?.name || ''}`],
          ['Reviewer', review.engineeringReviewer],
          ['Review Date', formatDate(review.reviewDate || review.submittedAt)],
          ['Submitted By', review.submittedBy],
        ]}
        actions={
          <>
            <div className="approvals-detail-actions">
              {isDraft && <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/design-review/review/${review.id}/edit`)}>Edit Draft</Button>}
              {isDraft && (
                <Button icon={Send} onClick={() => {
                  const result = submitReview(review.id);
                  if (result.error) showToast(result.error, 'error');
                  else showToast(`${review.id} submitted for review.`);
                }}>Submit for Review</Button>
              )}
              <ConvertRecordButton type="review" record={review} size="sm" />
              <Button
                variant="secondary"
                icon={Truck}
                onClick={openHandover}
                disabled={!canOpenHandover}
                title={!canOpenHandover ? conversion.reasons.join(' ') : undefined}
              >
                {handoverLabel}
              </Button>
              <Button variant="ghost" icon={Eye} onClick={() => setRevisionOpen(true)}>View Revision</Button>
              <Button variant="ghost" icon={History} onClick={() => setHistoryOpen(true)}>Review History</Button>
            </div>
            {review.status === 'Ready for Final Approval' && <Button icon={ShieldCheck} onClick={() => navigate('/design-review/releases')}>Record Final Approval</Button>}
            {eligible && <Button icon={ShieldCheck} onClick={() => navigate('/design-review/releases')}>Release Exact Revision</Button>}
            {['Changes Requested', 'Rejected'].includes(review.status) && (
              <Button variant="secondary" icon={RotateCcw} onClick={() => navigate('/design-review/releases')}>Resubmit Corrected Revision</Button>
            )}
            <Link className="link-button" to="/design-review">Back to register</Link>
          </>
        }
      />

      {notice && (
        <div className="approvals-banner is-muted">
          <span>{notice}</span>
        </div>
      )}

      {isDraft && (
        <div className="approvals-banner is-muted">
          <span>This is a draft review. It has not entered the approval workflow and cannot be released.</span>
        </div>
      )}

      {existingHandover ? (
        <div className="approvals-banner is-muted">
          <span>{existingHandover.id} already exists for {review.designId} Rev {review.designRevision}. The action opens that record and does not create another handover.</span>
        </div>
      ) : !conversion.eligible ? (
        <div className="approvals-banner is-muted">
          <span>Production handover is unavailable: {conversion.reasons.join(' ')}</span>
        </div>
      ) : (
        <div className="approvals-banner is-success">
          <span>Approvals and controlled release are complete. Convert to open a prefilled Module 13 handover form; nothing is saved until you review and save it.</span>
        </div>
      )}

      {review.status === 'Approved' && !review.release && !eligible && source.errors.length > 0 && (
        <div className="approvals-banner is-muted">
          <span>Engineering release is blocked: {source.errors.join(' ')}</span>
        </div>
      )}

      <WorkflowTrack review={review} />

      <div className="approvals-stage-grid">
        {stageCards.map((stage) => (
          <section key={stage.key} className={`card approvals-stage-card${stage.required ? '' : ' is-skipped'}`}>
            <div className="approvals-stage-card-head">
              <div><span>{stage.label}</span><strong>{stage.required ? stage.reviewer : 'Stage not applicable'}</strong></div>
              <StageBadge status={stage.status} />
            </div>
            <div className="fact-grid">
              <Fact label="Decision">{stage.status}</Fact>
              <Fact label="Decision Date">{stage.at ? formatDate(stage.at) : '—'}</Fact>
            </div>
            {stage.note && <p className="approvals-decision-note">{stage.note}</p>}
            {stage.key === 'client' && clientActionable && (
              <Button size="sm" icon={ShieldCheck} onClick={openClientDecision}>Record Client or Admin Approval</Button>
            )}
            {stage.required && <Link className="link-button" to={stage.tab}>Open {stage.label}</Link>}
          </section>
        ))}
      </div>

      <div className="approvals-detail-layout">
        <div className="approvals-detail-main">
          <section className="card approvals-panel">
            <div className="approvals-card-head"><div><strong>Review Record</strong><p>Submission identity and assignment details.</p></div></div>
            <div className="fact-grid approvals-pad">
              <Fact label="Review ID">{review.id}</Fact>
              <Fact label="Review Type">{review.reviewType}</Fact>
              <Fact label="Review Purpose">{review.reviewPurpose}</Fact>
              <Fact label="Project">{review.projectId} · {project?.name || ''}</Fact>
              <Fact label="Mechanical Design">{review.designId ? `${review.designId} · Rev ${review.designRevision}` : 'Not linked'}</Fact>
              <Fact label="Requested By">{review.requestedBy || review.submittedBy}</Fact>
              <Fact label="Assigned Reviewers">{review.assignedReviewers?.join(', ') || 'Not assigned'}</Fact>
              <Fact label="Planned Review Date">{formatDate(review.plannedReviewDate)}</Fact>
              <Fact label="Deliverable Type">{review.deliverableType}</Fact>
              <Fact label="Deliverable Number">{review.deliverableNumber}</Fact>
              <Fact label="Deliverable Name">{review.deliverableName}</Fact>
              <Fact label="Revision">Rev {review.revision}</Fact>
              <Fact label="BOM Revision">{review.bomId ? `${review.bomId} · Rev ${review.bomRevision}` : 'Not linked'}</Fact>
              <Fact label="BOM Status">{source.bom?.status || 'Not found'}</Fact>
              <Fact label="Drawing Revision">{review.drawingId ? `${review.drawingId} · Rev ${review.drawingRevision}` : 'Not linked'}</Fact>
              <Fact label="Drawing Status">{source.drawing?.approvalStatus || 'Not found'}</Fact>
              <Fact label="Part / Assembly">{review.partRef || 'Not linked'}</Fact>
              <Fact label="Priority">{review.priority}</Fact>
              <Fact label="Submitted By">{review.submittedBy}</Fact>
              <Fact label="Review Date">{formatDate(review.reviewDate || review.submittedAt)}</Fact>
              <Fact label="Submission Date">{formatDate(review.submittedAt)}</Fact>
              <Fact label="Review Due Date">{formatDate(review.dueDate)}</Fact>
              <Fact label="Final Approval">{review.finalApproval ? `${review.finalApproval.decision} · ${review.finalApproval.approver} · ${formatDate(review.finalApproval.at)}` : 'Not recorded'}</Fact>
              <Fact label="Release Recommendation">{review.finalApproval?.releaseRecommendation || 'Not available until final approval.'}</Fact>
              <Fact label="Applicable Stages">{review.requiredStages.join(' → ')}</Fact>
              <Fact label="Engineering Reviewer">{review.engineeringReviewer}</Fact>
              <Fact label="Manufacturing Reviewer">{review.requiredStages.includes('Manufacturing') ? review.manufacturingReviewer : 'Not required'}</Fact>
              <Fact label="Client or Admin Approver">{review.clientRequired ? (clientActor ? `${clientActor.role} · ${clientActor.reviewer}` : 'Client or Admin (pending)') : 'Not required'}</Fact>
              <Fact label="Client Reference">{review.clientReference || 'Not recorded'}</Fact>
            </div>
            <div className="approvals-text-block">
              <h4>Submission Notes</h4>
              <p>{review.submissionNotes || 'No submission notes recorded.'}</p>
              <h4>Review Instructions</h4>
              <p>{review.reviewInstructions || 'No review instructions recorded.'}</p>
            </div>
          </section>

          <section className="card approvals-panel">
            <div className="approvals-card-head"><div><strong>Checklist Progress</strong><p>Recorded review results for the submitted revision.</p></div></div>
            <div className="approvals-checklist-progress">
              {[
                { label: 'Engineering review checklist', items: review.engineeringChecklist || [] },
                { label: 'Manufacturing review checklist', items: review.requiredStages.includes('Manufacturing') ? review.manufacturingChecklist : [] },
              ].map((group) => (
                <div key={group.label}>
                  <div><strong>{group.label}</strong><span>{group.items.length ? `${group.items.filter((item) => item.result === 'Pass').length}/${group.items.length} passed` : 'Not applicable'}</span></div>
                  <div className="approvals-progress-bar"><span style={{ width: `${group.items.length ? (group.items.filter((item) => item.result === 'Pass').length / group.items.length) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="card approvals-panel">
            <div className="approvals-card-head">
              <div><strong>Review Comments</strong><p>All engineering, manufacturing and client comments recorded against this revision.</p></div>
              <span className="approvals-count-chip">{review.comments.length + review.clientComments.length}</span>
            </div>
            {review.comments.length === 0 && review.clientComments.length === 0 ? (
              <p className="cell-muted approvals-pad">No review comments recorded.</p>
            ) : (
              <ul className="approvals-comment-list">
                {[...review.comments, ...review.clientComments].map((comment) => (
                  <li key={comment.id}>
                    <div className="approvals-comment-head">
                      <div><strong>{comment.author}</strong><span>{comment.role} · {comment.stage} · {comment.at}</span></div>
                      <span className="approvals-count-chip">{comment.responseStatus || 'Open'}</span>
                    </div>
                    <p>{comment.text}</p>
                    {comment.checklistItem && <div className="approvals-comment-meta"><span>Checklist: {comment.checklistItem}</span>{comment.attachment && <span>Attachment: {comment.attachment}</span>}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="approvals-detail-side">
          <section className="card approvals-panel">
            <div className="approvals-card-head"><div><strong>Attachments</strong></div></div>
            {review.attachments.length === 0 ? <p className="cell-muted approvals-pad">No attachments.</p> : (
              <ul className="approvals-attachments approvals-pad">
                {review.attachments.map((attachment) => (
                  <li key={attachment.name}>
                    <Paperclip aria-hidden="true" />
                    <div><strong>{attachment.name}</strong><span>{attachment.type} · {formatBytes(attachment.size)}</span></div>
                    <Button variant="ghost" size="sm" icon={Eye} onClick={() => setPreviewAttachment(attachment)}>View</Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card approvals-panel">
            <div className="approvals-card-head"><div><strong>Decision Timeline</strong></div></div>
            <div className="approvals-pad"><ApprovalTimeline history={review.history} compact /></div>
          </section>

          {review.release && (
            <section className="card approvals-panel approvals-release-card">
              <div className="approvals-card-head"><div><strong>Controlled Release</strong></div><FileCheck2 aria-hidden="true" /></div>
              <div className="approvals-pad">
                <Fact label="Release ID">{review.release.releaseId}</Fact>
                <Fact label="Exact Revision">Rev {review.release.revision}</Fact>
                <Fact label="BOM Revision">{review.release.bomId} · Rev {review.release.bomRevision}</Fact>
                <Fact label="Drawing Revision">{review.release.drawingId} · Rev {review.release.drawingRevision}</Fact>
                <Fact label="Released By">{review.release.releasedBy}</Fact>
                <Fact label="Release Date">{formatDate(review.release.releaseDate)}</Fact>
                <Fact label="Final Approved By">{review.release.approvedBy}</Fact>
                <p className="approvals-decision-note">Release ends this module's responsibility. No Purchase or Production transfer has occurred.</p>
              </div>
            </section>
          )}

          {review.resubmissions?.length > 0 && (
            <section className="card approvals-panel">
              <div className="approvals-card-head"><div><strong>Resubmissions</strong></div></div>
              <ul className="approvals-resub-list approvals-pad">
                {review.resubmissions.map((row) => (
                  <li key={row.id}>
                    <RotateCcw aria-hidden="true" />
                    <div>
                      <strong>Rev {row.previousRevision} → Rev {row.newRevision}</strong>
                      <span>{formatDate(row.at)} · {row.by}</span>
                      <Link className="link-button" to={`/design-review/review/${row.linkedReviewId}`}>{row.linkedReviewId}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {review.previousReviewId && (
            <section className="card approvals-panel">
              <div className="approvals-card-head"><div><strong>Linked Review</strong></div></div>
              <div className="approvals-pad">
                <p className="cell-muted">This review is a resubmission of an earlier submission. Earlier decisions remain preserved on the linked record.</p>
                <Link className="link-button" to={`/design-review/review/${review.previousReviewId}`}>{review.previousReviewId}</Link>
              </div>
            </section>
          )}
        </aside>
      </div>

      <div className="approvals-audit-note">
        <CheckCircle2 aria-hidden="true" />
        <span>All approvals on this page are frontend-only simulation records. They do not provide backend authorization or legally binding approval.</span>
      </div>

      <Modal
        open={clientOpen}
        onClose={() => setClientOpen(false)}
        title="Client or Admin Approval"
        subtitle={`${review.id} · ${review.deliverableNumber} Rev ${review.revision}`}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClientOpen(false)}>Cancel</Button>
            <Button
              icon={ShieldCheck}
              onClick={() => {
                const result = clientDecision(review.id, {
                  decision: clientChoice,
                  comments: clientComments,
                  reviewer: clientApprover,
                  actorRole: clientRole,
                });
                if (result.error) {
                  setClientError(result.error);
                  return;
                }
                setClientOpen(false);
                showToast(`${review.id}: ${clientRole} decision recorded.`);
              }}
            >
              Record Decision
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field span-2">
            <p className="approvals-note">
              Either an authorized Client or an authorized Admin completes this single stage. One approval satisfies the
              requirement; the other role is not asked to approve again.
            </p>
          </div>
          <Select
            id="client-approval-role"
            label="Approver Role"
            options={[{ value: 'Client', label: 'Client' }, { value: 'Admin', label: 'Admin' }]}
            value={clientRole}
            onChange={(event) => {
              const role = event.target.value;
              setClientRole(role);
              setClientApprover(role === 'Admin' ? ADMIN_APPROVERS[0] : CLIENT_REVIEWERS[0]);
              setClientError('');
            }}
          />
          <Select
            id="client-approval-approver"
            label={clientRole === 'Admin' ? 'Authorized Admin' : 'Authorized Client'}
            options={(clientRole === 'Admin' ? ADMIN_APPROVERS : CLIENT_REVIEWERS).map((value) => ({ value, label: value }))}
            value={clientApprover}
            onChange={(event) => setClientApprover(event.target.value)}
          />
          <Select
            id="client-approval-decision"
            label="Decision"
            options={[
              { value: 'Approve', label: 'Approve' },
              { value: 'Request Changes', label: 'Request Changes' },
              { value: 'Reject', label: 'Reject' },
            ]}
            value={clientChoice}
            onChange={(event) => setClientChoice(event.target.value)}
          />
          <div className="form-field span-2">
            <Textarea
              id="client-approval-comments"
              label="Comments"
              rows={3}
              value={clientComments}
              placeholder={clientChoice === 'Approve' ? 'Optional approval note' : 'A reason is required'}
              onChange={(event) => setClientComments(event.target.value)}
            />
          </div>
          {clientError && <p className="form-error span-2" role="alert">{clientError}</p>}
        </div>
      </Modal>

      <RevisionDialog review={revisionOpen ? review : null} onClose={() => setRevisionOpen(false)} />
      <HistoryDialog review={historyOpen ? review : null} onClose={() => setHistoryOpen(false)} />
      <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      <WorkflowLinks type="review" recordId={review.id} />
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
