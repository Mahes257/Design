import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, FileText, Pencil, Printer, ShieldCheck } from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  ManageColumns,
  PageHeader,
  PageLayout,
  ViewPageBanner,
  StatusBadge,
} from '../../components/common';
import AttachmentList from '../../components/attachments/AttachmentList';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useSimulation } from '../../context/SimulationContext';
import { formatDate } from '../../data/projectData';
import {
  REVIEW_CHECKS,
  componentLabel,
  fieldsForCategory,
  resultSourceLabel,
  resultSourceNote,
  statusTone,
} from '../../data/analysisData';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { Fact, ReviewHistoryList } from './analysisUi';

/**
 * Structured Analysis Report generated from the saved analysis record and its
 * review. Values are reproduced, never computed; absent fields are shown as not
 * recorded. Printing uses the browser print dialog (genuine print / Save as PDF).
 */
export default function AnalysisReportPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { analyses, reviews } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { reports: validationReports, observations } = useSimulation();

  const analysis = analyses.find((row) => row.id === analysisId);
  if (!analysis) return <Navigate to="/analysis/reports" replace />;

  const review = reviews.find((row) => row.analysisId === analysisId) || null;
  const project = projects.find((row) => row.id === analysis.projectId);
  const linkedValidation = validationReports.find(
    (report) => report.id === analysis.validationReportRef,
  );
  const linkedObservation = observations.find((row) => row.id === analysis.relatedObservation);
  const componentName = componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies);
  const categoryFields = fieldsForCategory(analysis.category);
  const evidenceColumns = useTableColumnVisibility('/analysis/:analysisId/report', [
    { key: 'field', label: 'Category Field' },
    { key: 'value', label: 'Recorded Value' },
  ]);
  const checklistColumns = useTableColumnVisibility('/analysis/:analysisId/report#checklist', [
    { key: 'item', label: 'Verification Item' },
    { key: 'outcome', label: 'Outcome' },
  ]);

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={FileText}
        eyebrow={`${analysis.id} · Report`}
        title={`Analysis Report · ${analysis.id}`}
        subtitle={`${analysis.title} · Rev ${analysis.revision} · ${project?.name || analysis.projectId}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Engineering Analysis', to: '/analysis' },
              { label: 'Analysis Reports', to: '/analysis/reports' },
              { label: `${analysis.id} · Report` },
            ]}
          />
        }
        chips={
          <StatusBadge
            status={analysis.verificationStatus}
            tone={statusTone(analysis.verificationStatus)}
          />
        }
        meta={[
          ['Analysis', analysis.id],
          ['Title', analysis.title],
          ['Project', project?.name || analysis.projectId],
          ['Revision', `Rev ${analysis.revision}`],
          ['Engineer', analysis.engineer],
          ['Verification', analysis.verificationStatus],
        ]}
        actions={
          <>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/analysis/reports')}
              >
                Back to Reports
              </Button>
              <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/analysis/${analysis.id}`)}>
                Open Record
              </Button>
              <Button icon={Printer} onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
          </>
        }
      />
      <div className="analysis-report">
        <div className="analysis-report-banner">
          <div>
            <strong>Generated from saved data</strong>
            <p>
              This report reproduces the analysis record and its reviewer decisions. No solver is
              integrated; no result is recalculated or fabricated. Results remain evidence references
              supplied by the engineer.
            </p>
          </div>
          <StatusBadge status={analysis.verificationStatus} tone={statusTone(analysis.verificationStatus)} />
        </div>

        <Card title="1. Project and Design Details" icon={FileText}>
          <div className="fact-grid">
            <Fact label="Analysis ID">{analysis.id}</Fact>
            <Fact label="Analysis Title">{analysis.title}</Fact>
            <Fact label="Project">{project ? `${project.id} · ${project.name}` : analysis.projectId}</Fact>
            <Fact label="Design ID">{analysis.designId || 'Not recorded'}</Fact>
            <Fact label="Design Revision">{analysis.drawingRevision || '—'}</Fact>
            <Fact label="Part / Assembly">{componentName}</Fact>
            <Fact label="Analysis Category">{analysis.category}</Fact>
            <Fact label="Analysis Type">{analysis.analysisType}</Fact>
            <Fact label="Engineer">{analysis.engineer}</Fact>
            <Fact label="Technical Reviewer">{analysis.reviewer}</Fact>
            <Fact label="Created">{formatDate(analysis.created)}</Fact>
            <Fact label="Analysis Revision">Rev {analysis.revision}</Fact>
          </div>
        </Card>

        <Card title="2. Analysis Objective" icon={FileText}>
          <div className="mech-detail-sections">
            <section>
              <h3>Objective</h3>
              <p>{analysis.objective || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Problem Description</h3>
              <p>{analysis.description || 'Not recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="3. Related Validation Findings" icon={ShieldCheck}>
          <div className="fact-grid">
            <Fact label="Validation Report Reference">
              {analysis.validationReportRef || 'Not linked'}
            </Fact>
            <Fact label="Validation Report Status">
              {linkedValidation ? linkedValidation.status : '—'}
            </Fact>
            <Fact label="Related Observation / Issue">
              {analysis.relatedObservation || 'Not linked'}
            </Fact>
            <Fact label="Observation Status">
              {linkedObservation ? linkedObservation.status : '—'}
            </Fact>
          </div>
          {linkedValidation && (
            <p className="sim-note">
              Linked validation report: <strong>{linkedValidation.title}</strong>
              {linkedValidation.category ? ` · ${linkedValidation.category}` : ''}. Findings are held in
              the Simulation &amp; Validation module and are not duplicated here.
            </p>
          )}
          {linkedObservation && (
            <p className="sim-note">
              Linked observation: <strong>{linkedObservation.title}</strong> ·{' '}
              {linkedObservation.category} · {linkedObservation.severity} · {linkedObservation.status}.
            </p>
          )}
        </Card>

        <Card title="4. Inputs" icon={FileText}>
          <div className="mech-detail-sections">
            <section>
              <h3>Input Conditions</h3>
              <p>{analysis.inputConditions || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Applied Loads</h3>
              <p>{analysis.appliedLoads || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Operating Conditions</h3>
              <p>{analysis.operatingConditions || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Material Properties</h3>
              <p>{analysis.material || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Calculation Inputs</h3>
              <p>{analysis.calculationInputs || 'Not recorded.'}</p>
            </section>
          </div>
          <ManageColumns {...evidenceColumns.managerProps} />
          <div className="table-wrap">
            <table className="data-table mech-detail-table" aria-label="Category evidence fields">
              <thead>
                <tr>
                  {evidenceColumns.isVisible('field') && <th scope="col">Category Field</th>}
                  {evidenceColumns.isVisible('value') && <th scope="col">Recorded Value</th>}
                </tr>
              </thead>
              <tbody>
                {categoryFields.map((field) => (
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
        </Card>

        <Card title="5. Assumptions" icon={FileText}>
          <p className="mech-detail-pre">{analysis.assumptions || 'Not recorded.'}</p>
        </Card>

        <Card title="6. Methodology" icon={FileText}>
          <div className="mech-detail-sections">
            <section>
              <h3>Methodology</h3>
              <p>{analysis.methodology || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Boundary Conditions</h3>
              <p>{analysis.boundaryConditions || 'Not recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="7. Results" icon={FileText}>
          <div className="analysis-source-banner">
            <strong>Result source: {resultSourceLabel(analysis.resultSource)}</strong>
            <p>{resultSourceNote(analysis.resultSource)}</p>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Calculation Results</h3>
              <p>{analysis.calculationResults || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Result Summary</h3>
              <p>{analysis.resultSummary || 'Not recorded.'}</p>
            </section>
            <section>
              <h3>Technical Remarks</h3>
              <p>{analysis.technicalRemarks || analysis.notes || 'Not recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="8. Acceptance Criteria" icon={ShieldCheck}>
          <p className="mech-detail-pre">{analysis.acceptanceCriteria || 'Not recorded.'}</p>
        </Card>

        <Card title="9. Conclusions and Recommendations" icon={FileText}>
          <div className="mech-detail-sections">
            <section>
              <h3>Conclusions (recorded)</h3>
              <p>{analysis.resultSummary || 'No conclusion recorded.'}</p>
            </section>
            <section>
              <h3>Recommendations / Technical Remarks</h3>
              <p>{analysis.technicalRemarks || analysis.notes || 'No recommendations recorded.'}</p>
            </section>
          </div>
          <p className="sim-note">
            Conclusions and recommendations repeat the engineer's recorded text. No interpretation or
            new engineering judgement is generated by this report.
          </p>
        </Card>

        <Card title="10. Attachments" icon={FileText}>
          <AttachmentList analysis={analysis} emptyMessage="No attachments recorded." />
        </Card>

        <Card title="11. Review Decisions" icon={ShieldCheck}>
          {!review ? (
            <p className="dash-modal-note">This analysis has not entered review.</p>
          ) : (
            <>
              <div className="fact-grid">
                <Fact label="Review ID">{review.id}</Fact>
                <Fact label="Reviewer">{review.reviewer}</Fact>
                <Fact label="Decision">{review.decision || 'Pending'}</Fact>
                <Fact label="Review Date">{review.decisionDate ? formatDate(review.decisionDate) : '—'}</Fact>
                <Fact label="Review Status">{review.status}</Fact>
                <Fact label="Submitted">{formatDate(review.submittedDate)}</Fact>
              </div>
              <ManageColumns {...checklistColumns.managerProps} />
              <div className="table-wrap">
                <table className="data-table mech-detail-table" aria-label="Verification checklist">
                  <thead>
                    <tr>
                      {checklistColumns.isVisible('item') && <th scope="col">Verification Item</th>}
                      {checklistColumns.isVisible('outcome') && <th scope="col">Outcome</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {REVIEW_CHECKS.map((check) => (
                      <tr key={check.key}>
                        {checklistColumns.isVisible('item') && (
                          <td className="cell-strong">{check.label}</td>
                        )}
                        {checklistColumns.isVisible('outcome') && (
                          <td className="cell-muted">{review.checks?.[check.key] || 'Pending'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mech-detail-sections">
                <section>
                  <h3>Reviewer Comments</h3>
                  <p>{review.comments || 'Not recorded.'}</p>
                </section>
                <section>
                  <h3>Findings</h3>
                  <p>{review.findings || 'Not recorded.'}</p>
                </section>
                <section>
                  <h3>Corrective Actions</h3>
                  <p>{review.correctiveActions || 'Not recorded.'}</p>
                </section>
              </div>
              <h3 className="anl-subhead">Review History</h3>
              <ReviewHistoryList history={review.history} />
            </>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
