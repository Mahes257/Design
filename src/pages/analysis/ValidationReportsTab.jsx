import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileText,
  History,
  Layers,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiGrid,
  ManageColumns,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  ANALYSIS_CATEGORY_FILTERS,
  REPORT_VIEWS,
  componentLabel,
  formatDate,
  isVerifiedEvidence,
  projectName,
  projectValidationSummary,
  statusTone,
} from '../../data/analysisData';
import exportCsv from '../../utils/exportCsv';
import { RevisionHistoryModal } from '../mechanical/mechanicalUi';
import { AnalysisActivityList, Fact, Toast, useToast } from './analysisUi';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

/* ==========================================================================
   Validation Reports — consolidated evidence reports plus project summary
   and the analysis evidence view.
   ========================================================================== */
export default function ValidationReportsTab() {
  const navigate = useNavigate();
  const {
    reports,
    analyses,
    approveReport,
    archiveReport,
    duplicateReport,
    submitReport,
    removeAnalysisAttachment,
  } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [evidenceTarget, setEvidenceTarget] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [summaryProject, setSummaryProject] = useState(projects[0]?.id || '');
  const [evidenceProject, setEvidenceProject] = useState('All');
  const [evidenceStatus, setEvidenceStatus] = useState('All');
  const [evidenceCategory, setEvidenceCategory] = useState('All');
  const projectAnalysisColumns = useTableColumnVisibility(
    '/engineering-analysis/legacy-reports#project-analysis',
    [
      { key: 'analysis', label: 'Analysis' },
      { key: 'type', label: 'Type' },
      { key: 'verification', label: 'Verification' },
    ],
  );
  const reportEvidenceColumns = useTableColumnVisibility(
    '/engineering-analysis/legacy-reports#evidence',
    [
      { key: 'analysis', label: 'Analysis' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
    ],
  );

  const rows = useMemo(
    () =>
      reports.map((report) => {
        const selected = report.analysisIds
          .map((id) => analyses.find((analysis) => analysis.id === id))
          .filter(Boolean);
        return {
          ...report,
          projectName: projectName(projects, report.projectId),
          analysisCount: report.analysisIds.length,
          verifiedCount: selected.filter((analysis) => isVerifiedEvidence(analysis)).length,
          selected,
        };
      }),
    [reports, analyses, projects],
  );

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = view === 'approved' ? rows.filter((row) => row.status === 'Approved') : rows;
    if (!query) return base;
    return base.filter((row) =>
      [row.id, row.title, row.projectName, row.preparedBy, row.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [rows, view, search]);

  const totalCount = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;

  const summary = useMemo(
    () => projectValidationSummary(summaryProject, analyses, reports),
    [summaryProject, analyses, reports],
  );

  const evidence = useMemo(
    () =>
      analyses.flatMap((analysis) =>
        (analysis.attachments || []).map((file) => ({
          key: `${analysis.id}-${file.name}`,
          analysisId: analysis.id,
          analysisTitle: analysis.title,
          projectId: analysis.projectId,
          projectName: projectName(projects, analysis.projectId),
          category: analysis.category,
          component: componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies),
          drawingRevision: analysis.drawingRevision,
          name: file.name,
          type: file.type,
          uploadedBy: file.uploadedBy,
          uploadedAt: file.uploadedAt,
          verificationStatus: analysis.verificationStatus,
          editable: ['Draft', 'In Progress', 'Changes Requested'].includes(analysis.verificationStatus),
        })),
      ),
    [analyses, projects, parts, assemblies],
  );

  const evidenceRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return evidence.filter((row) => {
      if (evidenceProject !== 'All' && row.projectId !== evidenceProject) return false;
      if (evidenceStatus !== 'All' && row.verificationStatus !== evidenceStatus) return false;
      if (evidenceCategory !== 'All' && row.category !== evidenceCategory) return false;
      if (!query) return true;
      return [row.analysisId, row.name, row.type, row.uploadedBy, row.analysisTitle]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [evidence, evidenceProject, evidenceStatus, evidenceCategory, search]);

  const reportColumns = [
    { key: 'id', label: 'Report ID', width: 108, render: (row) => <span className="cell-id">{row.id}</span> },
    {
      key: 'title',
      label: 'Report Title',
      width: 170,
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: 'projectName',
      label: 'Project',
      width: 118,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    { key: 'analysisCount', label: 'Analyses', width: 66, align: 'center' },
    {
      key: 'verifiedCount',
      label: 'Verified',
      width: 62,
      align: 'center',
      render: (row) => (
        <span className={row.verifiedCount === row.analysisCount ? 'cell-strong' : 'cell-muted'}>
          {row.verifiedCount}
        </span>
      ),
    },
    { key: 'preparedBy', label: 'Prepared By', width: 90 },
    { key: 'revision', label: 'Rev', width: 54, align: 'center', render: (row) => `Rev ${row.revision}` },
    {
      key: 'reportDate',
      label: 'Report Date',
      width: 84,
      render: (row) => <span className="cell-muted">{formatDate(row.reportDate)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} />,
    },
  ];

  const evidenceColumns = [
    { key: 'analysisId', label: 'Analysis ID', width: 94, render: (row) => <span className="cell-id">{row.analysisId}</span> },
    { key: 'category', label: 'Analysis Type', width: 102, render: (row) => <span className="chip chip-mint">{row.category}</span> },
    { key: 'projectName', label: 'Project', width: 98 },
    { key: 'component', label: 'Part / Assembly', width: 126, render: (row) => <span className="cell-muted cell-clamp">{row.component}</span> },
    { key: 'drawingRevision', label: 'Dwg Rev', width: 60, align: 'center' },
    { key: 'name', label: 'Evidence Name', width: 160, render: (row) => <span className="cell-strong cell-clamp" title={row.name}>{row.name}</span> },
    { key: 'type', label: 'Evidence Type', width: 108, render: (row) => <span className="cell-muted">{row.type}</span> },
    { key: 'uploadedBy', label: 'Uploaded By', width: 88 },
    { key: 'uploadedAt', label: 'Uploaded', width: 78, render: (row) => <span className="cell-muted">{formatDate(row.uploadedAt)}</span> },
    {
      key: 'verificationStatus',
      label: 'Verification',
      width: 96,
      render: (row) => <StatusBadge status={row.verificationStatus} tone={statusTone(row.verificationStatus)} />,
    },
  ];

  const reportCsv = [
    { key: 'id', label: 'Report ID' },
    { key: 'title', label: 'Report Title' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectName', label: 'Project' },
    { key: 'product', label: 'Product / Machine' },
    { key: 'analysisCount', label: 'Analysis Count' },
    { key: 'verifiedCount', label: 'Verified Evidence Count' },
    { key: 'preparedBy', label: 'Prepared By' },
    { key: 'reviewer', label: 'Technical Reviewer' },
    { key: 'revision', label: 'Revision' },
    { key: 'reportDate', label: 'Report Date' },
    { key: 'status', label: 'Status' },
  ];

  const downloadEvidence = (row) => {
    const manifest = [
      `Analysis evidence manifest (demonstration data)`,
      `Analysis: ${row.analysisId} — ${row.analysisTitle}`,
      `Project: ${row.projectId} — ${row.projectName}`,
      `Evidence: ${row.name} (${row.type})`,
      `Uploaded by: ${row.uploadedBy} on ${formatDate(row.uploadedAt)}`,
      `Verification status: ${row.verificationStatus}`,
      '',
      'This manifest is a local placeholder. The binary file is not stored in this frontend module.',
    ].join('\n');
    const blob = new Blob([manifest], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${row.analysisId}-${row.name.replace(/\.[^.]+$/, '')}-manifest.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Evidence manifest downloaded.');
  };

  const changeView = (next) => {
    if (next === 'new') {
      navigate('/engineering-analysis/legacy-reports/new');
      return;
    }
    setView(next);
    setSearch('');
    setPage(1);
  };

  return (
    <>
      <div className="mech-domain-bar" role="group" aria-label="Validation report views">
        {REPORT_VIEWS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`mech-domain-chip${view === entry.key ? ' is-active' : ''}`}
            aria-pressed={view === entry.key}
            onClick={() => changeView(entry.key)}
          >
            {entry.label}
            {entry.key === 'all' && rows.length > 0 && <span>{rows.length}</span>}
            {entry.key === 'approved' && <span>{rows.filter((row) => row.status === 'Approved').length}</span>}
          </button>
        ))}
      </div>

      {view === 'summary' && (
        <>
          <Card
            title="Project Validation Summary"
            subtitle="Derived from the analysis register and the validation reports linked to the selected project"
            icon={Layers}
            actions={
              <select
                className="dash-quick-filter"
                aria-label="Select project for validation summary"
                value={summaryProject}
                onChange={(event) => setSummaryProject(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.id} · {project.name}
                  </option>
                ))}
              </select>
            }
          >
            <div className="fact-grid">
              <Fact label="Project">{projectName(projects, summaryProject)}</Fact>
              <Fact label="Customer">{projects.find((project) => project.id === summaryProject)?.customer}</Fact>
              <Fact label="Total Analysis Records">{String(summary.total)}</Fact>
              <Fact label="Verified Analyses">{String(summary.verified)}</Fact>
              <Fact label="Pending Verification">{String(summary.pending)}</Fact>
              <Fact label="Changes Requested">{String(summary.changes)}</Fact>
              <Fact label="Missing Evidence">{String(summary.missing)}</Fact>
              <Fact label="Validation Reports">{String(summary.reports)}</Fact>
              <Fact label="Latest Report Revision">{summary.latestRevision}</Fact>
            </div>

            {summary.reportList.length === 0 ? (
              <p className="dash-modal-note">No validation reports recorded for this project yet.</p>
            ) : (
              <ul className="mech-link-list">
                {summary.reportList.map((report) => (
                  <li key={report.id}>
                    <span className="cell-id">{report.id}</span>
                    <span className="mech-link-name">{report.title}</span>
                    <span className="cell-muted">Rev {report.revision}</span>
                    <StatusBadge status={report.status} tone={statusTone(report.status)} />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => navigate(`/engineering-analysis/legacy-reports/${report.id}`)}
                    >
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Analysis Records for this Project" icon={ClipboardCheck}>
            <ManageColumns {...projectAnalysisColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mech-detail-table" aria-label="Project analyses">
                <thead>
                  <tr>
                    {projectAnalysisColumns.isVisible('analysis') && <th scope="col">Analysis</th>}
                    {projectAnalysisColumns.isVisible('type') && <th scope="col">Type</th>}
                    {projectAnalysisColumns.isVisible('verification') && (
                      <th scope="col">Verification</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {analyses
                    .filter((analysis) => analysis.projectId === summaryProject)
                    .map((analysis) => (
                      <tr key={analysis.id}>
                        {projectAnalysisColumns.isVisible('analysis') && (
                          <td>
                            <span className="cell-id">{analysis.id}</span>{' '}
                            <span className="cell-strong">{analysis.title}</span>
                          </td>
                        )}
                        {projectAnalysisColumns.isVisible('type') && (
                          <td className="cell-muted">{analysis.category}</td>
                        )}
                        {projectAnalysisColumns.isVisible('verification') && (
                          <td>
                            <StatusBadge
                              status={analysis.verificationStatus}
                              tone={statusTone(analysis.verificationStatus)}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {view === 'evidence' && (
        <>
          <Toolbar
            left={
              <div className="toolbar-filters">
                <select
                  className="dash-quick-filter"
                  aria-label="Filter evidence by project"
                  value={evidenceProject}
                  onChange={(event) => setEvidenceProject(event.target.value)}
                >
                  <option value="All">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.id} · {project.name}
                    </option>
                  ))}
                </select>
                <select
                  className="dash-quick-filter"
                  aria-label="Filter evidence by analysis category"
                  value={evidenceCategory}
                  onChange={(event) => setEvidenceCategory(event.target.value)}
                >
                  <option value="All">All Categories</option>
                  {ANALYSIS_CATEGORY_FILTERS.filter((category) => category.key !== 'all').map((category) => (
                    <option key={category.key} value={category.label}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <select
                  className="dash-quick-filter"
                  aria-label="Filter evidence by verification status"
                  value={evidenceStatus}
                  onChange={(event) => setEvidenceStatus(event.target.value)}
                >
                  <option value="All">All Statuses</option>
                  {['Draft', 'In Progress', 'Pending Review', 'Under Review', 'Changes Requested', 'Verified', 'Rejected', 'Superseded', 'Archived'].map(
                    (status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ),
                  )}
                </select>
                <Button
                  variant="ghost"
                  icon={RefreshCw}
                  onClick={() => {
                    setEvidenceProject('All');
                    setEvidenceStatus('All');
                    setEvidenceCategory('All');
                    setSearch('');
                  }}
                >
                  Refresh
                </Button>
              </div>
            }
            right={
              <SearchInput
                id="evidence-search"
                value={search}
                onChange={setSearch}
                placeholder="Search evidence, analysis..."
                ariaLabel="Search evidence"
              />
            }
            count={`${evidenceRows.length} evidence file(s)`}
          />

          <section className="table-card">
            <DataTable
              columns={evidenceColumns}
              rows={evidenceRows}
              getRowId={(row) => row.key}
              className="mech-register-table"
              rowActions={(row) => [
                { key: 'view', label: 'View analysis', icon: Eye },
                { key: 'download', label: 'Download evidence manifest', icon: Download },
                ...(row.editable ? [{ key: 'remove', label: 'Remove attachment', icon: Trash2, danger: true, divider: true }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/engineering-analysis/register/${row.analysisId}`);
                if (key === 'download') downloadEvidence(row);
                if (key === 'remove') {
                  const result = removeAnalysisAttachment(row.analysisId, row.name, 'Design Admin');
                  if (result.error) showToast(result.error, 'error');
                  else showToast(`${row.name} removed from ${row.analysisId}.`);
                }
              }}
              ariaLabel="Analysis evidence"
              emptyContent={
                <EmptyState
                  icon={FileText}
                  title="No evidence found"
                  message="No evidence files match the current filters."
                />
              }
            />
          </section>
        </>
      )}

      {view === 'revisions' && (
        <>
          <Toolbar
            left={
              <Button variant="ghost" icon={RefreshCw} onClick={() => setSearch('')}>
                Refresh
              </Button>
            }
            right={
              <SearchInput
                id="report-revision-search"
                value={search}
                onChange={setSearch}
                placeholder="Search report, project..."
                ariaLabel="Search report revisions"
              />
            }
            count={`${filteredReports.length} report(s)`}
          />
          <div className="anl-revision-grid">
            {filteredReports.map((report) => (
              <Card
                key={report.id}
                title={`${report.id} · ${report.title}`}
                subtitle={`${projectName(projects, report.projectId)} · current Rev ${report.revision}`}
                icon={History}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={() => navigate(`/engineering-analysis/legacy-reports/${report.id}`)}
                  >
                    View
                  </Button>
                }
              >
                <p className="anl-revision-sub">Revision history</p>
                <ul className="anl-revision-list">
                  {(report.revisions || []).map((entry) => (
                    <li key={`${report.id}-${entry.revision}`}>
                      <span className="chip mech-rev-chip">Rev {entry.revision}</span>
                      <span>{entry.note}</span>
                      <span className="cell-muted">
                        {formatDate(entry.date)} · {entry.by}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="anl-revision-sub">Activity</p>
                <AnalysisActivityList activity={report.activity || []} />
              </Card>
            ))}
          </div>
        </>
      )}

      {(view === 'all' || view === 'approved') && (
        <>
          <KpiGrid>
            <StatCard icon={FileText} label="Validation Reports" value={String(rows.length)} sub="All report records" tone="teal" />
            <StatCard icon={CheckCircle2} label="Approved Reports" value={String(rows.filter((row) => row.status === 'Approved').length)} sub="Approval reference recorded" tone="emerald" />
            <StatCard icon={Send} label="Pending Review" value={String(rows.filter((row) => row.status === 'Pending Review').length)} sub="Awaiting report reviewer" tone="orange" />
            <StatCard icon={Pencil} label="Draft Reports" value={String(rows.filter((row) => row.status === 'Draft').length)} sub="Still editable" tone="blue" />
          </KpiGrid>

          <Toolbar
            left={
              <Button
                variant="ghost"
                icon={RefreshCw}
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Refresh
              </Button>
            }
            right={
              <>
                <SearchInput
                  id="report-search"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder="Search report, project, preparer..."
                  ariaLabel="Search validation reports"
                />
                <Button variant="ghost" icon={Download} onClick={() => exportCsv('validation-reports', reportCsv, filteredReports)}>
                  Export
                </Button>
                <Button variant="secondary" icon={Plus} size="sm" onClick={() => navigate('/engineering-analysis/legacy-reports/new')}>
                  New Validation Report
                </Button>
              </>
            }
            count={pageInfo}
          />

          <section className="table-card">
            <DataTable
              columns={reportColumns}
              rows={pageRows}
              className="mech-register-table"
              recordHref={(row) => `/engineering-analysis/legacy-reports/${row.id}`}
              onRowClick={(row) => navigate(`/engineering-analysis/legacy-reports/${row.id}`)}
              rowActions={(row) => [
                { key: 'view', label: 'View report', icon: Eye },
                ...(['Draft', 'Changes Requested'].includes(row.status)
                  ? [{ key: 'edit', label: 'Edit draft', icon: Pencil }]
                  : []),
                { key: 'duplicate', label: 'Duplicate', icon: Copy },
                ...(['Draft', 'Changes Requested'].includes(row.status)
                  ? [{ key: 'submit', label: 'Submit for review', icon: Send }]
                  : []),
                ...(['Pending Review', 'Under Review'].includes(row.status) &&
                row.verifiedCount === row.analysisCount
                  ? [{ key: 'approve', label: 'Approve report', icon: CheckCircle2 }]
                  : []),
                { key: 'evidence', label: 'View evidence', icon: FileText },
                { key: 'revisions', label: 'View revision history', icon: History },
                { key: 'print', label: 'Export / Print', icon: Printer },
                { key: 'archive', label: 'Archive', icon: Archive, danger: true, divider: true },
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/engineering-analysis/legacy-reports/${row.id}`);
                if (key === 'edit') navigate(`/engineering-analysis/legacy-reports/${row.id}/edit`);
                if (key === 'duplicate') {
                  duplicateReport(row.id, row.preparedBy);
                  showToast(`${row.id} duplicated as a new draft.`);
                }
                if (key === 'submit') {
                  submitReport(row.id, row.preparedBy);
                  showToast(`${row.id} submitted for review.`);
                }
                if (key === 'approve') {
                  const result = approveReport(row.id, 'Design Admin');
                  if (result?.error) showToast(result.error, 'error');
                  else showToast(`${row.id} approved.`);
                }
                if (key === 'evidence') setEvidenceTarget(row);
                if (key === 'revisions') setRevisionTarget(row);
                if (key === 'print') {
                  exportCsv(`validation-report-${row.id}`, reportCsv, [row]);
                  showToast(`${row.id} exported as CSV.`);
                }
                if (key === 'archive') setPendingArchive(row);
              }}
              ariaLabel="Validation reports"
              emptyContent={
                <EmptyState
                  icon={FileText}
                  title={view === 'approved' ? 'No approved reports' : 'No validation reports found'}
                  message={
                    view === 'approved'
                      ? 'Reports appear here once their review is approved.'
                      : 'No reports match the current search.'
                  }
                />
              }
            />
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              pageInfo={pageInfo}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </section>
          <p className="mech-footnote">
            A validation report consolidates analysis evidence by reference. Report approval does not
            approve the underlying design, and only verified analyses count as verified evidence.
          </p>
        </>
      )}

      <Modal
        open={Boolean(evidenceTarget)}
        onClose={() => setEvidenceTarget(null)}
        title="Report Evidence"
        subtitle={evidenceTarget ? `${evidenceTarget.id} · ${evidenceTarget.title}` : undefined}
        maxWidth="max-w-2xl"
        footer={
          <Button variant="ghost" onClick={() => setEvidenceTarget(null)}>
            Close
          </Button>
        }
      >
        {evidenceTarget && (
          <>
            <p className="dash-modal-note">
              Selected analysis records and their verification status at the time of viewing. Verified
              records are eligible evidence; the rest are outstanding.
            </p>
            <ManageColumns {...reportEvidenceColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table table-pin-left" aria-label="Report analysis evidence">
                <thead>
                  <tr>
                    {reportEvidenceColumns.isVisible('analysis') && <th scope="col">Analysis</th>}
                    {reportEvidenceColumns.isVisible('category') && <th scope="col">Category</th>}
                    {reportEvidenceColumns.isVisible('status') && <th scope="col">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {evidenceTarget.selected.map((analysis) => (
                    <tr key={analysis.id}>
                      {reportEvidenceColumns.isVisible('analysis') && (
                        <td>
                          <span className="cell-id">{analysis.id}</span>{' '}
                          <span className="cell-strong">{analysis.title}</span>
                        </td>
                      )}
                      {reportEvidenceColumns.isVisible('category') && (
                        <td className="cell-muted">{analysis.category}</td>
                      )}
                      {reportEvidenceColumns.isVisible('status') && (
                        <td>
                          <StatusBadge
                            status={analysis.verificationStatus}
                            tone={statusTone(analysis.verificationStatus)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fact-grid">
              <Fact label="Analyses in report">{evidenceTarget.analysisCount}</Fact>
              <Fact label="Verified evidence">{evidenceTarget.verifiedCount}</Fact>
              <Fact label="Outstanding evidence">
                {evidenceTarget.analysisCount - evidenceTarget.verifiedCount}
              </Fact>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingArchive)}
        onClose={() => setPendingArchive(null)}
        title="Archive Validation Report"
        subtitle={pendingArchive ? `${pendingArchive.id} · ${pendingArchive.title}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              icon={Archive}
              onClick={() => {
                archiveReport(pendingArchive.id, 'Design Admin');
                showToast(`${pendingArchive.id} archived.`);
                setPendingArchive(null);
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The report keeps its revision history and evidence references. Archived reports can still be
          viewed but cannot be submitted or approved.
        </p>
      </Modal>

      <RevisionHistoryModal
        open={Boolean(revisionTarget)}
        onClose={() => setRevisionTarget(null)}
        title={revisionTarget ? `Report Revisions · ${revisionTarget.id}` : undefined}
        subtitle={revisionTarget ? `${revisionTarget.title} · current Rev ${revisionTarget.revision}` : undefined}
        revisions={revisionTarget?.revisions || []}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
