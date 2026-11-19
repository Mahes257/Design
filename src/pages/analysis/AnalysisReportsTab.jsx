import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Eye, FileText, Printer, Search } from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  ANALYSIS_CATEGORY_FILTERS,
  analysisKpis,
  componentLabel,
  statusTone,
} from '../../data/analysisData';

/**
 * Analysis Reports — one row per analysis record, opening the structured
 * evidence report generated from the saved record. No values are calculated
 * here; the report reproduces recorded fields and reviewer decisions only.
 */
export default function AnalysisReportsTab() {
  const navigate = useNavigate();
  const { analyses, reviews } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');

  const reviewByAnalysis = useMemo(
    () => new Map(reviews.map((review) => [review.analysisId, review])),
    [reviews],
  );

  const rows = useMemo(
    () =>
      analyses.map((analysis) => ({
        ...analysis,
        projectName: projects.find((project) => project.id === analysis.projectId)?.name || '',
        componentName: componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies),
        review: reviewByAnalysis.get(analysis.id) || null,
      })),
    [analyses, projects, parts, assemblies, reviewByAnalysis],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== 'All' && row.category !== category) return false;
      if (status !== 'All' && row.verificationStatus !== status) return false;
      if (!query) return true;
      return [
        row.id,
        row.title,
        row.projectId,
        row.projectName,
        row.designId,
        row.validationReportRef,
        row.analysisType,
        row.category,
        row.engineer,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search, category, status]);

  const summary = analysisKpis(analyses);

  const columns = [
    { key: 'id', label: 'Analysis ID', width: 104, render: (row) => <span className="cell-id">{row.id}</span> },
    {
      key: 'title',
      label: 'Analysis Title',
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.title}>
          {row.title}
        </span>
      ),
    },
    { key: 'projectId', label: 'Project', width: 112, render: (row) => <span className="cell-id">{row.projectId}</span> },
    {
      key: 'designId',
      label: 'Design',
      width: 108,
      render: (row) => <span className="cell-muted">{row.designId || '—'}</span>,
    },
    {
      key: 'validationReportRef',
      label: 'Validation Ref',
      width: 124,
      render: (row) => <span className="cell-muted cell-clamp">{row.validationReportRef || '—'}</span>,
    },
    {
      key: 'review',
      label: 'Reviewer Decision',
      width: 128,
      render: (row) =>
        row.review?.decision ? (
          <span className="cell-muted">{row.review.decision}</span>
        ) : (
          <span className="cell-muted">Pending</span>
        ),
    },
    {
      key: 'verificationStatus',
      label: 'Status',
      width: 116,
      render: (row) => (
        <StatusBadge status={row.verificationStatus} tone={statusTone(row.verificationStatus)} />
      ),
    },
  ];

  return (
    <>
      <KpiGrid>
        <StatCard
          icon={FileText}
          label="Analysis Reports"
          value={String(analyses.length)}
          sub="Structured reports from saved records"
          tone="teal"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Verified"
          value={String(summary.verified)}
          sub="Reviewer-approved evidence"
          tone="emerald"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Awaiting Review"
          value={String(summary.pending)}
          sub="Not yet report-ready for sign-off"
          tone="orange"
        />
        <StatCard
          icon={FileText}
          label="Draft / In Progress"
          value={String(analyses.filter((row) => ['Draft', 'In Progress'].includes(row.verificationStatus)).length)}
          sub="Recorded engineering work"
          tone="blue"
        />
      </KpiGrid>

      <Toolbar
        left={
          <span className="cell-muted">
            Reports reproduce saved inputs, references and review decisions. No solver is run and no
            result is calculated by this application.
          </span>
        }
        right={
          <>
            <SearchInput
              id="analysis-report-search"
              value={search}
              onChange={setSearch}
              placeholder="Search analysis, project, validation reference…"
              ariaLabel="Search analysis reports"
            />
            <Select
              options={[
                { value: 'All', label: 'All categories' },
                ...ANALYSIS_CATEGORY_FILTERS.filter((entry) => entry.key !== 'all').map((entry) => ({
                  value: entry.label,
                  label: entry.label,
                })),
              ]}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <Select
              options={[
                { value: 'All', label: 'All statuses' },
                ...['Draft', 'In Progress', 'Pending Review', 'Under Review', 'Changes Requested', 'On Hold', 'Verified', 'Rejected', 'Archived'].map(
                  (value) => ({ value, label: value }),
                ),
              ]}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            />
          </>
        }
        count={`${filtered.length} report${filtered.length === 1 ? '' : 's'}`}
      />

      <section className="table-card">
        <DataTable
          columns={columns}
          rows={filtered}
          className="mech-register-table"
          recordHref={(row) => `/analysis/${row.id}`}
          onRowClick={(row) => navigate(`/analysis/${row.id}/report`)}
          rowActions={(row) => [
            { key: 'report', label: 'Open analysis report', icon: FileText },
            { key: 'view', label: 'View analysis record', icon: Eye },
            { key: 'print', label: 'Print report', icon: Printer },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/analysis/${row.id}`);
            if (key === 'report' || key === 'print') navigate(`/analysis/${row.id}/report`);
          }}
          emptyContent={
            <EmptyState
              icon={Search}
              title="No Analysis Reports"
              message="No analysis records match the current search or filters. Create an analysis to produce its report."
              action={
                <Button icon={FileText} onClick={() => navigate('/analysis/new')}>
                  New Analysis
                </Button>
              }
            />
          }
          ariaLabel="Analysis reports"
        />
      </section>

      <p className="mech-footnote">
        A structured report reflects the saved record exactly. Approval or rejection is recorded by a
        reviewer and is never applied automatically.
      </p>
    </>
  );
}
