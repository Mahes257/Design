import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  Pencil,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  DataTable,
  Modal,
  PageLayout,
  Select,
  StatusBadge,
  ViewPageBanner,
  Textarea,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useSimulation } from '../../context/SimulationContext';
import { formatDate } from '../../data/projectData';
import {
  ISSUE_STATUSES,
  REPORT_DECISIONS,
  formatBytes,
  reportStatusTone,
  severityTone,
} from '../../data/simulationData';
import { Fact, Toast, useToast } from '../mechanical/mechanicalUi';

export default function ValidationReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { designs } = useMechanical();
  const {
    reports,
    observations,
    models,
    submitReport,
    recordDecision,
    duplicateReport,
    createReportRevision,
  } = useSimulation();
  const { toast, showToast, clearToast } = useToast();

  const report = reports.find((row) => row.id === reportId);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState('Validated');
  const [comments, setComments] = useState('');

  if (!report) return <Navigate to="/engineering-analysis/reports" replace />;

  const design = designs.find((row) => row.id === report.designId);
  const model = models.find((row) => row.id === report.modelId);
  const linkedObservations = (report.observationIds || [])
    .map((id) => observations.find((row) => row.id === id))
    .filter(Boolean);
  const canEdit = ['Draft', 'Corrections Required'].includes(report.status);

  const issueColumns = [
    { key: 'title', label: 'Issue', render: (row) => <span className="cell-strong cell-clamp">{row.title}</span> },
    { key: 'component', label: 'Component', render: (row) => <span className="cell-muted cell-clamp">{row.component || '—'}</span> },
    { key: 'severity', label: 'Severity', width: 96, render: (row) => <StatusBadge status={row.severity} tone={severityTone(row.severity)} /> },
    { key: 'rootCause', label: 'Root Cause', render: (row) => <span className="cell-muted cell-clamp">{row.rootCause || '—'}</span> },
    { key: 'correction', label: 'Correction', render: (row) => <span className="cell-muted cell-clamp">{row.correction || '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      width: 108,
      render: (row) => (
        <StatusBadge status={row.status} tone={ISSUE_STATUSES.includes(row.status) && row.status === 'Resolved' ? 'emerald' : undefined} />
      ),
    },
  ];

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={ClipboardList}
        eyebrow={report.id}
        title={report.title}
        subtitle={`${report.projectId} · ${report.designId} · Rev ${report.revision} · manual inspection report`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Simulation & Design Validation', to: '/engineering-analysis' },
              { label: 'Validation Reports', to: '/engineering-analysis/reports' },
              { label: report.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={report.status} tone={reportStatusTone(report.status)} />
            <span className="chip">{report.reportType}</span>
            <span className="chip">Rev {report.revision}</span>
          </>
        }
        meta={[
          ['Project', report.projectId],
          ['Design', report.designId],
          ['Validation Category', report.category],
          ['Design Revision', `Rev ${report.revision}`],
          ['Report Type', report.reportType],
        ]}
        actions={
          <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/engineering-analysis/reports')}>
                Back to Reports
              </Button>
              {canEdit && (
                <Button
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => navigate(`/engineering-analysis/reports/${report.id}/edit`)}
                >
                  Edit
                </Button>
              )}
              {canEdit && (
                <Button
                  icon={Send}
                  onClick={() => {
                    submitReport(report.id, report.preparedBy);
                    showToast(`${report.id} submitted for review.`);
                  }}
                >
                  Submit for Review
                </Button>
              )}
              {['Under Review', 'Corrections Required'].includes(report.status) && (
                <Button icon={ShieldAlert} onClick={() => setDecisionOpen(true)}>
                  Record Decision
                </Button>
              )}
          </>
        }
      />
      <div className="sim-report-detail">
        <Card className="sim-panel">
          <header className="sim-panel-head">
            <strong>Report Information</strong>
            <span className="cell-muted">{report.reportType}</span>
          </header>
          <div className="sim-panel-body">
            <div className="fact-grid">
              <Fact label="Report ID">{report.id}</Fact>
              <Fact label="Project">{report.projectId}</Fact>
              <Fact label="Design">{report.designId}{design ? ` · ${design.name}` : ''}</Fact>
              <Fact label="Design Revision">Rev {report.revision}</Fact>
              <Fact label="Validation Category">{report.category || 'Not classified'}</Fact>
              <Fact label="Model File Reference">{model ? `${model.id} · ${model.fileName}` : report.modelId || 'None'}</Fact>
              <Fact label="Input Model">{report.inputModel || 'Not recorded'}</Fact>
              <Fact label="Component / Assembly">{report.component || 'Not specified'}</Fact>
              <Fact label="Severity">{report.severity}</Fact>
              <Fact label="Validation Result">{report.validationResult || 'Not concluded'}</Fact>
              <Fact label="Report Date">{formatDate(report.reportDate)}</Fact>
              <Fact label="Prepared By">{report.preparedBy}</Fact>
              <Fact label="Reviewed By">{report.reviewedBy || '—'}</Fact>
              <Fact label="Issues">
                {(report.issues || []).length} ·{' '}
                {(report.issues || []).filter((issue) => !['Resolved', 'Accepted'].includes(issue.status)).length} open
              </Fact>
            </div>
            <div className="mech-detail-sections">
              <section>
                <h3>Validation Objective</h3>
                <p>{report.objective || 'No objective recorded.'}</p>
              </section>
              <section>
                <h3>Methodology</h3>
                <p>{report.methodology || 'No methodology recorded.'}</p>
              </section>
              <section>
                <h3>Boundary Conditions &amp; Assumptions</h3>
                <p>
                  <strong>Boundary conditions:</strong> {report.boundaryConditions || 'Not recorded.'}
                </p>
                <p>
                  <strong>Assumptions:</strong> {report.assumptions || 'Not recorded.'}
                </p>
              </section>
              <section>
                <h3>Problem Description</h3>
                <p>{report.problemDescription || 'No problem description recorded.'}</p>
              </section>
              <section>
                <h3>Observed Issue</h3>
                <p>{report.observedIssue || 'No observed issue recorded.'}</p>
              </section>
              <section>
                <h3>Expected Result / Actual Observation</h3>
                <p>
                  <strong>Expected:</strong> {report.expectedResult || 'Not recorded.'}
                </p>
                <p>
                  <strong>Actual:</strong> {report.actualObservation || 'Not recorded.'}
                </p>
              </section>
              <section>
                <h3>Possible Root Cause</h3>
                <p>{report.rootCause || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Recommended Correction</h3>
                <p>{report.correction || 'Not recorded.'}</p>
              </section>
              <section>
                <h3>Reviewer Comments</h3>
                <p>{report.reviewerComments || 'No reviewer comments recorded.'}</p>
              </section>
              <section>
                <h3>Manual Inspection Note</h3>
                <p>
                  {report.observations ||
                    'This report records manual inspection and design validation only. No numerical simulation results were produced by this application.'}
                </p>
              </section>
            </div>
          </div>
        </Card>

        <Card className="sim-panel">
          <header className="sim-panel-head">
            <strong>Report Issues</strong>
            <span className="cell-muted">{(report.issues || []).length} total</span>
          </header>
          <div className="sim-panel-body">
            <DataTable
              columns={issueColumns}
              rows={report.issues || []}
              ariaLabel="Report issues"
              emptyContent={<p className="dash-modal-note">No issues recorded in this report.</p>}
            />
          </div>
        </Card>

        <Card className="sim-panel">
          <header className="sim-panel-head">
            <strong>Evidence &amp; Linked Records</strong>
          </header>
          <div className="sim-panel-body">
            <div className="sim-evidence-grid">
              <div>
                <h3>Screenshots</h3>
                {(report.screenshots || []).length === 0 && <p className="dash-modal-note">No screenshots attached.</p>}
                <ul className="sim-file-list">
                  {(report.screenshots || []).map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <FileText aria-hidden="true" />
                      <span>{file.name}</span>
                      <span className="cell-muted">{formatBytes(file.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Attachments</h3>
                {(report.attachments || []).length === 0 && <p className="dash-modal-note">No attachments.</p>}
                <ul className="sim-file-list">
                  {(report.attachments || []).map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <FileText aria-hidden="true" />
                      <span>{file.name}</span>
                      <span className="cell-muted">{formatBytes(file.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Linked Observations</h3>
                {linkedObservations.length === 0 && <p className="dash-modal-note">No observations linked.</p>}
                <ul className="sim-ref-list">
                  {linkedObservations.map((row) => (
                    <li key={row.id}>
                      <span className="cell-id">{row.id}</span>
                      <span>{row.title}</span>
                      <StatusBadge status={row.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="sim-note">
              External simulation result files are evidence supplied by the engineer. This application
              never claims to have calculated them.
            </p>
          </div>
        </Card>

        <Card className="sim-panel">
          <header className="sim-panel-head">
            <strong>Decision History</strong>
            <span className="cell-muted">{(report.decisionHistory || []).length} decisions</span>
          </header>
          <div className="sim-panel-body">
            {(report.decisionHistory || []).length === 0 ? (
              <p className="dash-modal-note">
                No reviewer decision recorded yet. Validating a report does not automatically mark the
                design validated.
              </p>
            ) : (
              <ol className="mech-timeline">
                {[...(report.decisionHistory || [])].reverse().map((entry) => (
                  <li key={entry.id}>
                    <span className="mech-timeline-dot" aria-hidden="true">
                      <CheckCircle2 />
                    </span>
                    <span className="mech-timeline-body">
                      <span className="mech-timeline-head">
                        <strong>{entry.decision}</strong>
                        <span>{formatDate(entry.at)}</span>
                      </span>
                      <span className="mech-timeline-note">{entry.comments || 'No comments.'}</span>
                      <span className="mech-timeline-by">{entry.by}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="sim-detail-actions">
              <Button variant="secondary" icon={Copy} onClick={() => { duplicateReport(report.id, report.preparedBy); showToast('Report duplicated as a draft.'); }}>
                Duplicate Report
              </Button>
              {!canEdit && (
                <Button
                  variant="secondary"
                  icon={FileText}
                  onClick={() => {
                    const id = createReportRevision(report.id, report.preparedBy);
                    showToast(`New draft created from ${report.id}.`);
                    navigate(`/engineering-analysis/reports/${id}/edit`);
                  }}
                >
                  New Revision Draft
                </Button>
              )}
              <Link className="sim-link" to={`/mechanical-design/design-register/${report.designId}`}>
                Open linked mechanical design
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="Record reviewer decision"
        subtitle={`${report.id} · ${report.title}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={ShieldAlert}
              onClick={() => {
                if (decision !== 'Validated' && !comments.trim()) {
                  showToast('Add comments explaining the decision.', 'error');
                  return;
                }
                recordDecision(report.id, {
                  decision,
                  comments: comments.trim(),
                  by: report.reviewedBy || 'N. Joshi',
                });
                showToast(`Decision recorded: ${decision}.`);
                setDecisionOpen(false);
              }}
            >
              Record Decision
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            id="vdr-decision"
            label="Decision"
            options={REPORT_DECISIONS.map((value) => ({ value, label: value }))}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
          />
          <div className="form-grid-full">
            <Textarea
              id="vdr-decision-comments"
              label="Reviewer Comments"
              rows={3}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </div>
        </div>
        <p className="dash-modal-note">
          The decision applies to this report only. The mechanical design status is not changed and no
          engineering analysis result is created.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
