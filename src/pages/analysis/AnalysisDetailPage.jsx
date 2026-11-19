import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ClipboardCheck,
  Factory,
  FileText,
  FlaskConical,
  History,
  Link2,
  Pencil,
  Printer,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ManageColumns,
  Modal,
  PageLayout,
  Select,
  StatusBadge,
  StatusBadge as Badge,
  ViewPageBanner,
} from '../../components/common';
import AttachmentList from '../../components/attachments/AttachmentList';
import { useAnalysis } from '../../context/AnalysisContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  ANALYSIS_REVIEWERS,
  canSubmitAnalysis,
  componentLabel,
  fieldsForCategory,
  isAnalysisEditable,
  isVerifiedEvidence,
  priorityTone,
  resultSourceLabel,
  resultSourceNote,
  projectName,
  statusTone,
} from '../../data/analysisData';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { AnalysisActivityList, Fact, ReviewHistoryList, Toast, useToast } from './analysisUi';

const SECTION_ANCHORS = [
  'Analysis Overview',
  'Project Information',
  'Part / Assembly References',
  'Analysis Category',
  'Input Conditions',
  'Material & Assumptions',
  'Boundary Conditions',
  'Acceptance Criteria',
  'Result Summary',
  'Attachments',
  'Review History',
  'Revision History',
  'Activity History',
];

export default function AnalysisDetailPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { analyses, reviews, submitAnalysisForReview } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const categoryColumns = useTableColumnVisibility('/analysis/:analysisId', [
    { key: 'field', label: 'Category Field' },
    { key: 'value', label: 'Recorded Value' },
  ]);

  const analysis = analyses.find((row) => row.id === analysisId);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    reviewer: analysis?.reviewer || '',
    dueDate: '',
    comments: '',
  });

  const review = useMemo(
    () => reviews.find((row) => row.analysisId === analysisId) || null,
    [reviews, analysisId],
  );

  if (!analysis) {
    return <Navigate to="/analysis" replace />;
  }

  const project = projects.find((row) => row.id === analysis.projectId);
  const categoryFields = fieldsForCategory(analysis.category);
  const linkedLabel = componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies);
  const manufacturingParams = new URLSearchParams({
    projectId: analysis.projectId,
    analysisId: analysis.id,
  });
  if (analysis.linkedType === 'assembly') {
    manufacturingParams.set('assemblyId', analysis.linkedId);
  } else {
    manufacturingParams.set('partId', analysis.linkedId);
  }
  const manufacturingLink = `/manufacturing-design/definition/new?${manufacturingParams.toString()}`;

  const confirmSubmit = () => {
    const result = submitAnalysisForReview(analysis.id, {
      by: analysis.engineer,
      reviewer: submitForm.reviewer,
      dueDate: submitForm.dueDate,
      comments: submitForm.comments,
    });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    setSubmitOpen(false);
    showToast(`${analysis.id} submitted for review.`);
  };

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={Activity}
        eyebrow={analysis.id}
        title={analysis.title}
        subtitle={`${analysis.category} · ${analysis.drawingRevision} · ${project?.name || analysis.projectId}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Engineering Analysis', to: '/analysis' },
              { label: 'Analysis Register', to: '/analysis' },
              { label: analysis.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge
              status={analysis.verificationStatus}
              tone={statusTone(analysis.verificationStatus)}
            />
            <span className="chip">Rev {analysis.revision}</span>
          </>
        }
        meta={[
          ['Analysis Title', analysis.title],
          ['Project', analysis.projectId],
          ['Linked Record', `${analysis.linkedType} · ${analysis.linkedId}`],
          ['Analysis Engineer', analysis.engineer],
          ['Reviewer', analysis.reviewer],
          ['Target Date', analysis.target],
        ]}
        actions={
          <>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/analysis')}
              >
                Back to Register
              </Button>
              <Button
                variant="secondary"
                icon={Printer}
                onClick={() => navigate(`/analysis/${analysis.id}/report`)}
              >
                Analysis Report
              </Button>
              {review && (
                <Button
                  variant="secondary"
                  icon={ShieldCheck}
                  onClick={() => navigate(`/analysis/review/${review.id}`)}
                >
                  Open Review
                </Button>
              )}
              {isAnalysisEditable(analysis) && (
                <Button
                  icon={Pencil}
                  onClick={() => navigate(`/analysis/${analysis.id}/edit`)}
                >
                  Edit Analysis
                </Button>
              )}
              {canSubmitAnalysis(analysis) && (
                <Button
                  icon={Send}
                  onClick={() => {
                    setSubmitForm({ reviewer: analysis.reviewer, dueDate: '', comments: '' });
                    setSubmitOpen(true);
                  }}
                >
                  Submit for Review
                </Button>
              )}
              {isVerifiedEvidence(analysis) && (
                <Button
                  variant="secondary"
                  icon={Factory}
                  onClick={() => navigate(manufacturingLink)}
                >
                  Create Manufacturing Definition
                </Button>
              )}
          </>
        }
      />
      <div className="mech-detail-stack">
        <nav className="anl-section-nav" aria-label="Analysis detail sections">
          {SECTION_ANCHORS.map((label, index) => (
            <span key={label} className="anl-section-chip">
              {index + 1}. {label}
            </span>
          ))}
        </nav>

        <Card title="1. Analysis Overview" icon={ClipboardCheck}>
          <div className="req-view-badges">
            <StatusBadge
              status={analysis.verificationStatus}
              tone={statusTone(analysis.verificationStatus)}
            />
            <Badge status={analysis.priority} tone={priorityTone(analysis.priority)} />
            <span className="chip chip-mint">{analysis.category}</span>
            <span className="chip mech-rev-chip">Analysis Rev {analysis.revision}</span>
            <span className="chip mech-rev-chip">{analysis.drawingRevision}</span>
          </div>
          <div className="fact-grid">
            <Fact label="Analysis ID">{analysis.id}</Fact>
            <Fact label="Analysis Type">{analysis.analysisType}</Fact>
            <Fact label="Design ID">{analysis.designId || 'Not recorded'}</Fact>
            <Fact label="Validation Report Ref">{analysis.validationReportRef || 'Not linked'}</Fact>
            <Fact label="Related Observation">{analysis.relatedObservation || 'Not linked'}</Fact>
            <Fact label="Engineer">{analysis.engineer}</Fact>
            <Fact label="Technical Reviewer">{analysis.reviewer}</Fact>
            <Fact label="Created">{formatDate(analysis.created)}</Fact>
            <Fact label="Target">{analysis.target ? formatDate(analysis.target) : 'Not set'}</Fact>
            <Fact label="Attachments">{(analysis.attachments || []).length}</Fact>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Analysis Objective</h3>
              <p>{analysis.objective || 'No objective recorded.'}</p>
            </section>
            <section>
              <h3>Problem Description</h3>
              <p>{analysis.description || 'No description recorded.'}</p>
            </section>
            <section>
              <h3>Technical Remarks</h3>
              <p>{analysis.technicalRemarks || analysis.notes || 'No technical remarks recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="2. Project Information" icon={Link2}>
          <div className="fact-grid">
            <Fact label="Project">{project ? `${project.id} · ${project.name}` : analysis.projectId}</Fact>
            <Fact label="Customer">{project?.customer}</Fact>
            <Fact label="Project Status">{project?.status || '—'}</Fact>
            <Fact label="Project Manager">{project?.manager || '—'}</Fact>
            <Fact label="Project Name (resolved)">{projectName(projects, analysis.projectId)}</Fact>
          </div>
        </Card>

        <Card title="3. Part / Assembly References" icon={FileText}>
          <div className="fact-grid">
            <Fact label="Reference Type">{analysis.linkedType === 'assembly' ? 'Assembly' : 'Part'}</Fact>
            <Fact label="Linked Record">{linkedLabel}</Fact>
            <Fact label="Drawing Revision">{analysis.drawingRevision}</Fact>
            <Fact label="CAD Reference">
              Drawing &amp; CAD Management holds the file; this record references the revision only.
            </Fact>
          </div>
        </Card>

        <Card title="4. Analysis Category" icon={FlaskConical}>
          <div className="fact-grid">
            <Fact label="Category">{analysis.category}</Fact>
            <Fact label="Analysis Type">{analysis.analysisType}</Fact>
          </div>
          <ManageColumns {...categoryColumns.managerProps} />
          <div className="table-wrap">
            <table className="data-table mech-detail-table" aria-label="Category-specific fields">
              <thead>
                <tr>
                  {categoryColumns.isVisible('field') && <th scope="col">Category Field</th>}
                  {categoryColumns.isVisible('value') && <th scope="col">Recorded Value</th>}
                </tr>
              </thead>
              <tbody>
                {categoryFields.map((field) => (
                  <tr key={field.key}>
                    {categoryColumns.isVisible('field') && (
                      <td className="cell-strong">{field.label}</td>
                    )}
                    {categoryColumns.isVisible('value') && (
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
        </Card>

        <Card title="5. Input Conditions" icon={FileText}>
          <div className="mech-detail-sections">
            <section>
              <h3>Input Conditions</h3>
              <p>{analysis.inputConditions || 'No input conditions recorded.'}</p>
            </section>
            <section>
              <h3>Applied Loads</h3>
              <p>{analysis.appliedLoads || 'No applied loads recorded.'}</p>
            </section>
            <section>
              <h3>Operating Conditions</h3>
              <p>{analysis.operatingConditions || 'No operating conditions recorded.'}</p>
            </section>
            <section>
              <h3>Calculation Inputs</h3>
              <p>{analysis.calculationInputs || 'No calculation inputs recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="7A. Methodology" icon={FileText}>
          <p className="mech-detail-pre">{analysis.methodology || 'No methodology recorded.'}</p>
          <p className="mech-footnote">
            Method and evidence reference only. The application does not execute the methodology.
          </p>
        </Card>

        <Card title="6. Material & Assumptions" icon={ShieldCheck}>
          <div className="fact-grid">
            <Fact label="Material">{analysis.material}</Fact>
            <Fact label="Linked Record">{linkedLabel}</Fact>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Assumptions</h3>
              <p>{analysis.assumptions || 'No assumptions recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="7. Boundary Conditions" icon={Activity}>
          <p className="mech-detail-pre">
            {analysis.boundaryConditions || 'No boundary conditions recorded.'}
          </p>
        </Card>

        <Card title="8. Acceptance Criteria" icon={ShieldCheck}>
          <p className="mech-detail-pre">
            {analysis.acceptanceCriteria || 'No acceptance criteria recorded.'}
          </p>
        </Card>

        <Card title="9. Result Summary" icon={FileText}>
          <div className="analysis-source-banner">
            <strong>Result source: {resultSourceLabel(analysis.resultSource)}</strong>
            <p>{resultSourceNote(analysis.resultSource)}</p>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Calculation Results</h3>
              <p>{analysis.calculationResults || 'No calculation results recorded.'}</p>
            </section>
            <section>
              <h3>Result Summary</h3>
              <p>{analysis.resultSummary || 'No result summary recorded.'}</p>
            </section>
          </div>
          <p className="mech-footnote">
            Recorded evidence statement only. This workspace does not compute or certify stress,
            thermal, modal, fatigue or tolerance results.
          </p>
        </Card>

        <Card title="10. Attachments" icon={FileText}>
          <AttachmentList
            analysis={analysis}
            emptyMessage="No evidence attached. Attach the report or reference used by the reviewer."
          />
        </Card>

        <Card
          title="11. Review History"
          icon={ShieldCheck}
          actions={
            review ? (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={() => navigate(`/analysis/review/${review.id}`)}
              >
                Open {review.id}
              </Button>
            ) : null
          }
        >
          {review ? (
            <>
              <div className="fact-grid">
                <Fact label="Review ID">{review.id}</Fact>
                <Fact label="Review Status">{review.status}</Fact>
                <Fact label="Assigned Reviewer">{review.reviewer}</Fact>
                <Fact label="Submitted">{formatDate(review.submittedDate)}</Fact>
                <Fact label="Decision">{review.decision || 'Not decided yet'}</Fact>
                <Fact label="Decision Date">
                  {review.decisionDate ? formatDate(review.decisionDate) : '—'}
                </Fact>
              </div>
              {review.comments && <p className="mech-detail-pre">{review.comments}</p>}
              <div className="mech-detail-sections">
                <section>
                  <h3>Findings</h3>
                  <p>{review.findings || 'Not recorded.'}</p>
                </section>
                <section>
                  <h3>Corrective Actions</h3>
                  <p>{review.correctiveActions || 'Not recorded.'}</p>
                </section>
              </div>
              <ReviewHistoryList history={review.history} />
            </>
          ) : (
            <p className="dash-modal-note">
              This analysis has not been submitted for review yet. Submission creates a review record
              and moves the analysis to Pending Review.
            </p>
          )}
        </Card>

        <div className="workflow-detail-action"><ConvertRecordButton type="analysis" record={analysis} /></div>

        <Card title="12. Revision History" icon={History}>
          <AnalysisActivityList
            activity={(analysis.revisions || []).map((entry) => ({
              id: `${entry.revision}-${entry.date}`,
              label: `Rev ${entry.revision}`,
              detail: entry.note,
              by: entry.by,
              at: entry.date,
            }))}
          />
        </Card>

        <Card title="13. Activity History" icon={History}>
          <AnalysisActivityList activity={analysis.activity || []} />
        </Card>

        <p className="mech-footnote">
          Engineering evidence workspace — not a simulation tool. Verified analysis records are not
          released designs, and reviewers record decisions against the evidence supplied.
        </p>
      </div>

      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Submit Analysis for Review"
        subtitle={`${analysis.id} · ${analysis.title}`}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button icon={Send} disabled={!submitForm.reviewer} onClick={confirmSubmit}>
              Submit for Review
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            id="detail-submit-reviewer"
            label="Assigned Reviewer"
            options={ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
            value={submitForm.reviewer}
            onChange={(event) => setSubmitForm((p) => ({ ...p, reviewer: event.target.value }))}
          />
          <div className="form-field">
            <label className="form-label" htmlFor="detail-submit-due">
              Review Due Date
            </label>
            <input
              id="detail-submit-due"
              type="date"
              className="form-input"
              value={submitForm.dueDate}
              onChange={(event) => setSubmitForm((p) => ({ ...p, dueDate: event.target.value }))}
            />
          </div>
          <div className="form-grid-full">
            <div className="form-field">
              <label className="form-label" htmlFor="detail-submit-comments">
                Submission Note
              </label>
              <textarea
                id="detail-submit-comments"
                className="form-input"
                rows={3}
                placeholder="Point the reviewer at the key evidence first"
                value={submitForm.comments}
                onChange={(event) => setSubmitForm((p) => ({ ...p, comments: event.target.value }))}
              />
            </div>
          </div>
        </div>
        <p className="dash-modal-note">
          Submission does not verify the analysis. The reviewer records the decision in Review &amp;
          Verification.
        </p>
      </Modal>

      <WorkflowLinks type="analysis" recordId={analysis.id} />
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
