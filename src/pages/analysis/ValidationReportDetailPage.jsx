import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  History,
  Layers,
  Pencil,
  Plus,
  Printer,
  Send,
  ShieldCheck,
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
  StatusBadge,
} from '../../components/common';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  componentLabel,
  isVerifiedEvidence,
  projectName,
  statusTone,
} from '../../data/analysisData';
import exportCsv from '../../utils/exportCsv';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { AnalysisActivityList, Fact, Toast, useToast } from './analysisUi';

const REPORT_CSV = [
  { key: 'id', label: 'Report ID' },
  { key: 'title', label: 'Report Title' },
  { key: 'projectId', label: 'Project ID' },
  { key: 'projectName', label: 'Project' },
  { key: 'product', label: 'Product / Machine' },
  { key: 'preparedBy', label: 'Prepared By' },
  { key: 'reviewer', label: 'Technical Reviewer' },
  { key: 'reportDate', label: 'Report Date' },
  { key: 'revision', label: 'Revision' },
  { key: 'status', label: 'Status' },
  { key: 'approvalRef', label: 'Approval Reference' },
];

function formatSize(bytes) {
  const kb = Math.max(1, Math.round((bytes || 0) / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export default function ValidationReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const {
    reports,
    analyses,
    approveReport,
    archiveReport,
    createReportRevision,
    submitReport,
  } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const report = reports.find((row) => row.id === reportId);
  const [confirm, setConfirm] = useState(null);
  const recordColumns = useTableColumnVisibility(
    '/engineering-analysis/legacy-reports/:reportId',
    [
      { key: 'analysis', label: 'Analysis' },
      { key: 'category', label: 'Category' },
      { key: 'component', label: 'Component' },
      { key: 'revision', label: 'Revision' },
      { key: 'status', label: 'Evidence Status' },
    ],
  );

  const selected = useMemo(
    () =>
      report
        ? report.analysisIds
            .map((id) => analyses.find((analysis) => analysis.id === id))
            .filter(Boolean)
        : [],
    [report, analyses],
  );

  if (!report) {
    return <Navigate to="/engineering-analysis/legacy-reports" replace />;
  }

  const verified = selected.filter((analysis) => isVerifiedEvidence(analysis));
  const outstanding = selected.filter((analysis) => !isVerifiedEvidence(analysis));
  const project = projects.find((row) => row.id === report.projectId);
  const editable = ['Draft', 'Changes Requested'].includes(report.status);
  const canSubmit = editable;
  const canApprove =
    ['Pending Review', 'Under Review'].includes(report.status) && outstanding.length === 0;
  const canRevise = ['Approved', 'Superseded'].includes(report.status);

  const exportReport = () => {
    exportCsv(`validation-report-${report.id}`, REPORT_CSV, [report]);
    showToast(`${report.id} exported as CSV.`);
  };

  const handleConfirm = () => {
    if (confirm === 'approve') {
      const result = approveReport(report.id, 'Design Admin');
      if (result?.error) {
        showToast(result.error, 'error');
        setConfirm(null);
        return;
      }
    }
    if (confirm === 'submit') submitReport(report.id, report.preparedBy);
    if (confirm === 'archive') archiveReport(report.id, 'Design Admin');
    if (confirm === 'revision') createReportRevision(report.id, 'Design Admin');
    if (confirm === 'print') {
      exportReport();
      window.print();
    }
    showToast(
      confirm === 'approve'
        ? `${report.id} approved.`
        : confirm === 'submit'
          ? `${report.id} submitted for review.`
          : confirm === 'archive'
            ? `${report.id} archived.`
            : confirm === 'revision'
              ? `New revision raised for ${report.id}.`
              : 'Report export prepared.',
    );
    setConfirm(null);
  };

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={Layers}
        eyebrow={report.id}
        title={report.title}
        subtitle={`Rev ${report.revision} · ${project?.name || report.projectId}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Engineering Analysis', to: '/engineering-analysis' },
              { label: 'Validation Reports', to: '/engineering-analysis/legacy-reports' },
              { label: report.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={report.status} tone={statusTone(report.status)} />
            <span className="chip">Rev {report.revision}</span>
          </>
        }
        meta={[
          ['Report', report.id],
          ['Project', report.projectId],
          ['Design', report.designId],
          ['Revision', `Rev ${report.revision}`],
          ['Prepared By', report.preparedBy],
          ['Report Date', formatDate(report.reportDate || report.createdAt)],
        ]}
        actions={
          <>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/engineering-analysis/legacy-reports')}
              >
                Back to Reports
              </Button>
              {editable && (
                <Button
                  icon={Pencil}
                  onClick={() => navigate(`/engineering-analysis/legacy-reports/${report.id}/edit`)}
                >
                  Edit Draft
                </Button>
              )}
              {canSubmit && (
                <Button icon={Send} onClick={() => setConfirm('submit')}>
                  Submit for Review
                </Button>
              )}
              {canApprove && (
                <Button icon={CheckCircle2} onClick={() => setConfirm('approve')}>
                  Approve Report
                </Button>
              )}
              {canRevise && (
                <Button icon={Plus} onClick={() => setConfirm('revision')}>
                  New Revision
                </Button>
              )}
              <Button variant="secondary" icon={Printer} onClick={() => setConfirm('print')}>
                Export / Print
              </Button>
              <Button variant="secondary" icon={Download} onClick={exportReport}>
                CSV
              </Button>
          </>
        }
      />
      <div className="mech-detail-stack">
        <Card title="Report Information" icon={FileText}>
          <div className="fact-grid">
            <Fact label="Report ID">{report.id}</Fact>
            <Fact label="Product / Machine">{report.product}</Fact>
            <Fact label="Prepared By">{report.preparedBy}</Fact>
            <Fact label="Technical Reviewer">{report.reviewer}</Fact>
            <Fact label="Report Date">{formatDate(report.reportDate)}</Fact>
            <Fact label="Revision">Rev {report.revision}</Fact>
            <Fact label="Status">{report.status}</Fact>
            <Fact label="Approval Reference">{report.approvalRef || 'Not approved'}</Fact>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Description</h3>
              <p>{report.description || 'No description recorded.'}</p>
            </section>
            <section>
              <h3>Categories Covered</h3>
              <p>
                {[...new Set(selected.map((analysis) => analysis.category))].join(', ') || 'None'}
              </p>
            </section>
            <section>
              <h3>Drawing Revisions</h3>
              <p>
                {[...new Set(selected.map((analysis) => analysis.drawingRevision))].join(', ') ||
                  'None'}
              </p>
            </section>
          </div>
        </Card>

        <Card title="Project Information" icon={ClipboardCheck}>
          <div className="fact-grid">
            <Fact label="Project">{project ? `${project.id} · ${project.name}` : report.projectId}</Fact>
            <Fact label="Customer">{project?.customer}</Fact>
            <Fact label="Project Status">{project?.status || '—'}</Fact>
            <Fact label="Project Name">{projectName(projects, report.projectId)}</Fact>
          </div>
        </Card>

        <Card title="Analysis Records (by reference)" icon={Layers}>
          <div className="anl-evidence-summary">
            <div className="anl-stat">
              <span className="anl-stat-label">Selected Analyses</span>
              <strong>{report.analysisIds.length}</strong>
            </div>
            <div className="anl-stat is-verified">
              <span className="anl-stat-label">Verified Evidence</span>
              <strong>{verified.length}</strong>
            </div>
            <div className="anl-stat is-outstanding">
              <span className="anl-stat-label">Outstanding Evidence</span>
              <strong>{outstanding.length}</strong>
            </div>
          </div>
          <ManageColumns {...recordColumns.managerProps} />
          <div className="table-wrap">
            <table className="data-table table-pin-left" aria-label="Analysis records in report">
              <thead>
                <tr>
                  {recordColumns.isVisible('analysis') && <th scope="col">Analysis</th>}
                  {recordColumns.isVisible('category') && <th scope="col">Category</th>}
                  {recordColumns.isVisible('component') && <th scope="col">Component</th>}
                  {recordColumns.isVisible('revision') && <th scope="col">Revision</th>}
                  {recordColumns.isVisible('status') && <th scope="col">Evidence Status</th>}
                </tr>
              </thead>
              <tbody>
                {selected.map((analysis) => (
                  <tr key={analysis.id}>
                    {recordColumns.isVisible('analysis') && (
                      <td>
                        <span className="cell-id">{analysis.id}</span>{' '}
                        <span className="cell-strong">{analysis.title}</span>
                      </td>
                    )}
                    {recordColumns.isVisible('category') && (
                      <td className="cell-muted">{analysis.category}</td>
                    )}
                    {recordColumns.isVisible('component') && (
                      <td className="cell-muted">
                        {componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies)}
                      </td>
                    )}
                    {recordColumns.isVisible('revision') && (
                      <td className="cell-muted">{analysis.drawingRevision}</td>
                    )}
                    {recordColumns.isVisible('status') && (
                      <td>
                        <StatusBadge
                          status={
                            isVerifiedEvidence(analysis)
                              ? 'Verified evidence'
                              : `${analysis.verificationStatus} · outstanding`
                          }
                          tone={isVerifiedEvidence(analysis) ? 'green' : 'orange'}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Validation Summary" icon={ShieldCheck}>
          <p className="mech-detail-pre">{report.summary || 'No validation summary recorded.'}</p>
        </Card>

        <Card title="Open Issues & Recommendations" icon={ClipboardCheck}>
          <div className="mech-detail-sections">
            <section>
              <h3>Open Issues</h3>
              <p>{report.openIssues || 'No open issues recorded.'}</p>
            </section>
            <section>
              <h3>Recommendations</h3>
              <p>{report.recommendations || 'No recommendations recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="Supporting Attachments" icon={FileText}>
          {(report.attachments || []).length === 0 ? (
            <p className="dash-modal-note">No attachments recorded for this report.</p>
          ) : (
            <ul className="mech-document-list">
              {report.attachments.map((file) => (
                <li key={file.name}>
                  <FileText aria-hidden="true" />
                  <span>{file.name}</span>
                  <span className="cell-muted">
                    {file.type} · {formatSize(file.size)} · {file.uploadedBy} ·{' '}
                    {formatDate(file.uploadedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Review & Approval" icon={ShieldCheck}>
          <div className="fact-grid">
            <Fact label="Technical Reviewer">{report.reviewer}</Fact>
            <Fact label="Report Status">{report.status}</Fact>
            <Fact label="Approval Reference">{report.approvalRef || '—'}</Fact>
            <Fact label="Prepared By">{report.preparedBy}</Fact>
          </div>
          {['Pending Review', 'Under Review'].includes(report.status) && outstanding.length > 0 && (
            <p className="dash-modal-note">
              Approval is blocked until every selected analysis is verified. Outstanding:{' '}
              {outstanding.map((analysis) => analysis.id).join(', ')}.
            </p>
          )}
          {canRevise && (
            <p className="dash-modal-note">
              This report is approved and locked. Use <strong>New Revision</strong> to raise a controlled
              change; the previous revision stays in the history.
            </p>
          )}
        </Card>

        <Card title="Revision History" icon={History}>
          <AnalysisActivityList
            activity={(report.revisions || []).map((entry) => ({
              id: `${entry.revision}-${entry.date}`,
              label: `Rev ${entry.revision}`,
              detail: entry.note,
              by: entry.by,
              at: entry.date,
            }))}
          />
        </Card>

        <Card title="Activity History" icon={History}>
          <AnalysisActivityList activity={report.activity || []} />
        </Card>

        <p className="mech-footnote">
          Report approval confirms the consolidated evidence was reviewed. It does not approve the
          underlying mechanical design or certify simulation results.
        </p>
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'approve'
            ? 'Approve Validation Report'
            : confirm === 'submit'
              ? 'Submit Report for Review'
              : confirm === 'archive'
                ? 'Archive Validation Report'
                : confirm === 'revision'
                  ? 'Raise New Report Revision'
                  : 'Export / Print Report'
        }
        subtitle={`${report.id} · Rev ${report.revision}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleConfirm}>
              Continue
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          {confirm === 'approve'
            ? 'Approval records an approval reference and status. The underlying analyses and design are unchanged.'
            : confirm === 'submit'
              ? 'Submission moves the report to Pending Review. It does not approve it.'
              : confirm === 'archive'
                ? 'The report and its history are retained and remain readable.'
                : confirm === 'revision'
                  ? 'A new revision is raised from the current content and set back to Draft for controlled editing.'
                  : 'A CSV of the report summary is exported and the print dialog is opened.'}
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
