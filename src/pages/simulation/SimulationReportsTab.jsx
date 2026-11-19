import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, Eye, FileText, Pencil, Send, Trash2 } from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useSimulation } from '../../context/SimulationContext';
import { REPORT_STATUSES, VALIDATION_CATEGORIES, reportStatusTone } from '../../data/simulationData';
import { formatDate } from '../../data/projectData';
import exportCsv from '../../utils/exportCsv';
import { Toast, useToast } from '../mechanical/mechanicalUi';

export default function SimulationReportsTab() {
  const navigate = useNavigate();
  const { reports, duplicateReport, createReportRevision, removeReport, submitReport } = useSimulation();
  const { designs } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [projectId, setProjectId] = useState('All');
  const [category, setCategory] = useState('All');
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const rows = useMemo(
    () =>
      reports.map((report) => {
        const design = designs.find((row) => row.id === report.designId);
        const issues = report.issues || [];
        return {
          ...report,
          projectName: projects.find((row) => row.id === report.projectId)?.name || '',
          designName: design?.name || '',
          issueCount: issues.length,
          openIssues: issues.filter((issue) => !['Resolved', 'Accepted'].includes(issue.status)).length,
        };
      }),
    [reports, designs, projects],
  );

  const filtered = rows.filter((row) => {
    if (status !== 'All' && row.status !== status) return false;
    if (projectId !== 'All' && row.projectId !== projectId) return false;
    if (category !== 'All' && row.category !== category) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [row.id, row.title, row.designId, row.projectId, row.preparedBy, row.reviewedBy, row.reportType, row.category]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const kpis = [
    { key: 'total', label: 'Validation Reports', value: String(reports.length), sub: 'Manual inspection reports', icon: FileText, tone: 'teal' },
    {
      key: 'review',
      label: 'Under Review',
      value: String(reports.filter((row) => row.status === 'Under Review').length),
      sub: 'Awaiting reviewer decision',
      icon: Send,
      tone: 'blue',
    },
    {
      key: 'validated',
      label: 'Validated',
      value: String(reports.filter((row) => row.status === 'Validated').length),
      sub: 'Reviewer-validated reports',
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      key: 'open',
      label: 'Unresolved Issues',
      value: String(rows.reduce((total, row) => total + row.openIssues, 0)),
      sub: 'Across all reports',
      icon: Copy,
      tone: 'amber',
    },
  ];

  const columns = [
    { key: 'id', label: 'Report ID', width: 116, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'title', label: 'Report Title', render: (row) => <span className="cell-strong cell-clamp" title={row.title}>{row.title}</span> },
    {
      key: 'projectId',
      label: 'Project / Design',
      width: 150,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.designId} · Rev {row.revision}</span>
        </span>
      ),
    },
    { key: 'reportType', label: 'Type', width: 172, render: (row) => <span className="cell-muted cell-clamp">{row.reportType}</span> },
    {
      key: 'issues',
      label: 'Issues',
      width: 92,
      align: 'center',
      render: (row) => (
        <span className="cell-muted">
          {row.issueCount} · {row.openIssues} open
        </span>
      ),
    },
    {
      key: 'attachments',
      label: 'Evidence',
      width: 86,
      align: 'center',
      render: (row) => (row.attachments?.length || 0) + (row.screenshots?.length || 0),
    },
    { key: 'reportDate', label: 'Date', width: 96, render: (row) => formatDate(row.reportDate) },
    { key: 'preparedBy', label: 'Prepared By', width: 110 },
    { key: 'status', label: 'Status', width: 128, render: (row) => <StatusBadge status={row.status} tone={reportStatusTone(row.status)} /> },
  ];

  return (
    <>
      <KpiGrid>
        {kpis.map(({ key, ...kpi }) => (
          <StatCard key={key} {...kpi} />
        ))}
      </KpiGrid>

      <Toolbar
        left={
          <Button variant="ghost" icon={FileText} onClick={() => setCsvOpen(true)}>
            Export Summary
          </Button>
        }
        right={
          <span className="cell-muted">
            Manual inspection reports — no numerical solver results are generated by this application.
          </span>
        }
      />

      <section className="table-card sim-reports-card">
        <div className="table-card-head">
          <div className="table-card-title">
            <h2>Simulation &amp; Validation Reports</h2>
            <p>
              Manual inspection and design validation reports. No numerical FEA, CFD or other
              solver results are produced by this application.
            </p>
          </div>
          <div className="table-card-tools">
            <SearchInput
              id="vdr-search"
              placeholder="Search report, design or engineer…"
              value={search}
              onChange={(value) => setSearch(value)}
            />
            <Select
              options={[
                { value: 'All', label: 'All statuses' },
                ...REPORT_STATUSES.map((value) => ({ value, label: value })),
              ]}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            />
            <Select
              options={[
                { value: 'All', label: 'All projects' },
                ...projects.map((row) => ({ value: row.id, label: row.id })),
              ]}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            />
            <Select
              options={[
                { value: 'All', label: 'All categories' },
                ...VALIDATION_CATEGORIES.map((value) => ({ value, label: value })),
              ]}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          recordHref={(row) => `/engineering-analysis/reports/${row.id}`}
          onRowClick={(row) => navigate(`/engineering-analysis/reports/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'View report', icon: Eye },
            ...(['Draft', 'Corrections Required'].includes(row.status)
              ? [{ key: 'edit', label: 'Edit report', icon: Pencil }]
              : []),
            ...(['Draft', 'Corrections Required'].includes(row.status)
              ? [{ key: 'submit', label: 'Submit for review', icon: Send }]
              : []),
            { key: 'duplicate', label: 'Duplicate report', icon: Copy },
            { key: 'revision', label: 'New revision draft', icon: FileText },
            { key: 'delete', label: 'Remove draft', icon: Trash2, danger: true, divider: true },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/engineering-analysis/reports/${row.id}`);
            if (key === 'edit') navigate(`/engineering-analysis/reports/${row.id}/edit`);
            if (key === 'submit') setDecisionTarget({ mode: 'submit', row });
            if (key === 'duplicate') setDuplicateTarget(row);
            if (key === 'revision') {
              if (row.status === 'Draft') {
                showToast('A draft report can be edited directly; revisions apply to submitted reports.', 'error');
                return;
              }
              const id = createReportRevision(row.id, row.preparedBy);
              showToast(`New draft created from ${row.id}.`);
              navigate(`/engineering-analysis/reports/${id}/edit`);
            }
            if (key === 'delete') setDuplicateTarget({ ...row, deleting: true });
          }}
          emptyContent={
            <EmptyState
              icon={FileText}
              title="No Validation Reports"
              message="Create a report from an inspection model to record issues, evidence and reviewer decisions."
            />
          }
          ariaLabel="Simulation and validation reports"
        />
      </section>

      <Modal
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Submit report for review"
        subtitle={decisionTarget ? `${decisionTarget.row.id} · ${decisionTarget.row.title}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Send}
              onClick={() => {
                submitReport(decisionTarget.row.id, decisionTarget.row.preparedBy);
                showToast(`${decisionTarget.row.id} submitted for review.`);
                setDecisionTarget(null);
              }}
            >
              Submit for Review
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The report moves to Under Review. Submitting a report does not validate the design and
          does not create any simulation result.
        </p>
      </Modal>

      <Modal
        open={Boolean(duplicateTarget) && !duplicateTarget?.deleting}
        onClose={() => setDuplicateTarget(null)}
        title="Duplicate report"
        subtitle={duplicateTarget ? duplicateTarget.id : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDuplicateTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Copy}
              onClick={() => {
                duplicateReport(duplicateTarget.id, 'D. Rao');
                showToast('Validation report duplicated as a draft.');
                setDuplicateTarget(null);
              }}
            >
              Duplicate
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          A new draft report is created with its own ID; the source report and its decision history
          stay untouched.
        </p>
      </Modal>

      <Modal
        open={Boolean(duplicateTarget?.deleting)}
        onClose={() => setDuplicateTarget(null)}
        title="Remove draft report"
        subtitle={duplicateTarget ? `${duplicateTarget.id} · ${duplicateTarget.title}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDuplicateTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                if (duplicateTarget.status !== 'Draft') {
                  showToast('Only draft reports can be removed; submitted reports keep their history.', 'error');
                  setDuplicateTarget(null);
                  return;
                }
                removeReport(duplicateTarget.id);
                showToast('Draft report removed.');
                setDuplicateTarget(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Removing a draft deletes the report record from this browser. Submitted and validated
          reports are never deleted, preserving their decision history.
        </p>
      </Modal>

      <Modal open={csvOpen} onClose={() => setCsvOpen(false)} title="Export report summary" footer={<Button onClick={() => setCsvOpen(false)}>Close</Button>}>
        <p className="dash-modal-note">Export the current filtered report list as CSV.</p>
        <Button
          icon={FileText}
          onClick={() => {
            exportCsv(
              'simulation-validation-reports',
              [
                { key: 'id', label: 'Report ID' },
                { key: 'title', label: 'Title' },
                { key: 'projectId', label: 'Project ID' },
                { key: 'designId', label: 'Design ID' },
                { key: 'revision', label: 'Revision' },
                { key: 'reportType', label: 'Type' },
                { key: 'status', label: 'Status' },
                { key: 'reportDate', label: 'Report Date' },
                { key: 'preparedBy', label: 'Prepared By' },
                { key: 'reviewedBy', label: 'Reviewed By' },
              ],
              filtered,
            );
            setCsvOpen(false);
          }}
        >
          Download CSV
        </Button>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

