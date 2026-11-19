import {
  Activity,
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Folder,
  GitBranch,
  Layers,
  ListChecks,
  Wrench,
} from 'lucide-react';
import { Button, KpiGrid, StatCard } from '../../components/common';
import { BarList, DonutChart } from '../../components/dashboard/Charts';
import { StackedBarChart } from './ReportCharts';
import {
  formatReportCurrency,
  formatReportDate,
  formatReportMonth,
  formatReportNumber,
  rangeDates,
} from '../../data/reportingAnalyticsData';
import exportCsv from '../../utils/exportCsv';
import { DataNote, ReportCard, ReportEmpty } from './ReportUi';

const MONTH_SERIES = [
  { key: 'projects', label: 'Project starts', color: '#0B7A68' },
  { key: 'designs', label: 'Design registrations', color: '#2563EB' },
  { key: 'reviews', label: 'Review submissions', color: '#7C3AED' },
];

function Empty() {
  return <ReportEmpty title="No records in this view" message="No Module 01–13 records match the selected date range, project or department." />;
}

function DashboardSummary({ data }) {
  const passFail = data.charts.designStatus;
  return (
    <div className="insight-summary-strip report-summary-strip">
      <div className="insight-summary-item">
        <span>Engineering portfolio</span>
        <strong>{formatReportNumber(data.totalProjects)}</strong>
        <small>{formatReportNumber(data.totalDesigns)} design records across the selected scope</small>
      </div>
      <div className="insight-summary-item">
        <span>Review pipeline</span>
        <strong>{formatReportNumber(data.totalReviews)}</strong>
        <small>{formatReportNumber(data.pendingApprovals)} reviews not yet released or rejected</small>
      </div>
      <div className="insight-summary-item">
        <span>Controlled deliverables</span>
        <strong>{formatReportNumber(data.totalDrawings + data.totalCadFiles)}</strong>
        <small>{formatReportNumber(data.totalCadFiles)} CAD files · {formatReportNumber(data.totalDrawings)} drawings</small>
      </div>
      <div className="insight-summary-item">
        <span>Design status coverage</span>
        <strong>{passFail.filter((row) => ['Approved', 'Released'].includes(row.label)).reduce((sum, row) => sum + row.value, 0)}</strong>
        <small>Approved or released designs; remaining {passFail.filter((row) => !['Approved', 'Released'].includes(row.label)).reduce((sum, row) => sum + row.value, 0)}</small>
      </div>
    </div>
  );
}

export default function ReportsDashboard({ data, filters, onNavigate }) {
  const { from, to } = rangeDates(filters);
  const monthlyRows = data.charts.monthly.map((row) => ({
    key: row.month,
    label: formatReportMonth(row.month),
    values: [row.projectStarts, row.designRegistrations, row.reviewSubmissions],
    meta: `${row.cadUploads} CAD upload${row.cadUploads === 1 ? '' : 's'} · ${row.drawingIssues} drawing${row.drawingIssues === 1 ? '' : 's'} issued`,
  }));

  const kpis = [
    {
      key: 'total-projects',
      label: 'Total Projects',
      value: formatReportNumber(data.totalProjects),
      sub: 'Module 02 project records',
      icon: Folder,
      tone: 'teal',
      onClick: () => onNavigate('project-progress'),
    },
    {
      key: 'active-projects',
      label: 'Active Projects',
      value: formatReportNumber(data.activeProjects),
      sub: 'Status other than Completed / Cancelled',
      icon: Activity,
      tone: 'blue',
      onClick: () => onNavigate('project-progress'),
    },
    {
      key: 'completed-projects',
      label: 'Completed Projects',
      value: formatReportNumber(data.completedProjects),
      sub: 'Recorded project status',
      icon: CheckCircle2,
      tone: 'emerald',
      onClick: () => onNavigate('project-progress', { status: 'Completed' }),
    },
    {
      key: 'delayed-projects',
      label: 'Delayed Projects',
      value: formatReportNumber(data.delayedProjects),
      sub: 'Actual delayed flag in project record',
      icon: AlertTriangle,
      tone: 'red',
      onClick: () => onNavigate('project-progress', { delay: 'Delayed' }),
    },
    {
      key: 'designs',
      label: 'Mechanical Designs',
      value: formatReportNumber(data.totalDesigns),
      sub: 'Module 05 design register',
      icon: Layers,
      tone: 'teal',
      onClick: () => onNavigate('design-status'),
    },
    {
      key: 'designs-review',
      label: 'Designs Under Review',
      value: formatReportNumber(data.designsUnderReview),
      sub: 'Design status = Under Review',
      icon: FileText,
      tone: 'purple',
      onClick: () => onNavigate('design-status', { status: 'Under Review' }),
    },
    {
      key: 'designs-approved',
      label: 'Approved Designs',
      value: formatReportNumber(data.approvedDesigns),
      sub: 'Approved or Released',
      icon: CheckCircle2,
      tone: 'emerald',
      onClick: () => onNavigate('design-status'),
    },
    {
      key: 'designs-released',
      label: 'Released Designs',
      value: formatReportNumber(data.releasedDesigns),
      sub: 'Release record or Released status',
      icon: ClipboardCheck,
      tone: 'emerald',
      onClick: () => onNavigate('design-status', { release: 'Released' }),
    },
    {
      key: 'eng-reviews',
      label: 'Pending Engineering Reviews',
      value: formatReportNumber(data.pendingEngineeringReviews),
      sub: 'Engineering stage Under Review',
      icon: Clock,
      tone: 'amber',
      onClick: () => onNavigate('review-approval', { pendingStage: 'Engineering' }),
    },
    {
      key: 'mfg-reviews',
      label: 'Pending Manufacturing Reviews',
      value: formatReportNumber(data.pendingManufacturingReviews),
      sub: 'Manufacturing stage Pending / Under Review',
      icon: Wrench,
      tone: 'amber',
      onClick: () => onNavigate('review-approval', { pendingStage: 'Manufacturing' }),
    },
    {
      key: 'cad-files',
      label: 'Total CAD Files',
      value: formatReportNumber(data.totalCadFiles),
      sub: 'Registered CAD repository files',
      icon: Box,
      tone: 'blue',
      onClick: () => onNavigate('cad-drawing'),
    },
    {
      key: 'drawings',
      label: 'Total Drawings',
      value: formatReportNumber(data.totalDrawings),
      sub: 'Drawing register records',
      icon: FileText,
      tone: 'blue',
      onClick: () => onNavigate('cad-drawing'),
    },
    {
      key: 'boms',
      label: 'BOM Records',
      value: formatReportNumber(data.totalBoms),
      sub: 'Module 09 BOM register',
      icon: ListChecks,
      tone: 'purple',
      onClick: () => onNavigate('bom-cost'),
    },
    {
      key: 'mfg-definitions',
      label: 'Manufacturing Definitions',
      value: formatReportNumber(data.totalManufacturingDefinitions),
      sub: 'Module 08 definitions',
      icon: Wrench,
      tone: 'sky',
      onClick: () => onNavigate('manufacturing'),
    },
    {
      key: 'changes',
      label: 'Pending Engineering Changes',
      value: formatReportNumber(data.pendingEngineeringChanges),
      sub: 'Open ECR records',
      icon: GitBranch,
      tone: 'orange',
      onClick: () => onNavigate('engineering-change', { open: 'Open', type: 'ECR' }),
    },
    {
      key: 'handovers',
      label: 'Released Design Handovers',
      value: formatReportNumber(data.releasedHandovers),
      sub: 'Controlled handover releases',
      icon: ClipboardCheck,
      tone: 'emerald',
      onClick: () => onNavigate('manufacturing', { handover: 'Released' }),
    },
  ];

  const dateLabel = from || to
    ? `${formatReportDate(from || 'Not set', 'Open')} to ${formatReportDate(to || 'Not set', 'Open')}`
    : 'All recorded dates';
  const scopeLabel = `${filters.project === 'All' ? 'All projects' : filters.project} · ${filters.department === 'All' ? 'All departments' : filters.department}`;

  const exportSummary = () => {
    const rows = [
      ...kpis.map((item) => ({ section: 'KPI', metric: item.label, value: item.value, detail: item.sub })),
      ...data.charts.projectStatus.map((item) => ({ section: 'Project status', metric: item.label, value: item.value, detail: '' })),
      ...data.charts.designStatus.map((item) => ({ section: 'Design status', metric: item.label, value: item.value, detail: '' })),
      ...data.charts.reviewStatus.map((item) => ({ section: 'Review status', metric: item.label, value: item.value, detail: '' })),
      ...data.charts.cadFormats.map((item) => ({ section: 'CAD formats', metric: item.label, value: item.value, detail: '' })),
      ...data.charts.changeStatus.map((item) => ({ section: 'Engineering changes', metric: item.label, value: item.value, detail: '' })),
      ...monthlyRows.map((item) => ({ section: 'Monthly activity', metric: item.label, value: item.values.join(' / '), detail: item.meta })),
    ];
    exportCsv(
      'module14-analytics-dashboard.csv',
      [
        { key: 'section', label: 'Report section' },
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
        { key: 'detail', label: 'Detail' },
      ],
      rows,
    );
  };

  return (
    <>
      <div className="insight-scope-line report-scope-line">
        <span>
          <strong>Cross-module engineering overview</strong>
          <em>{scopeLabel} · {dateLabel}. Metrics are calculated live from source records; no analytics records are stored.</em>
        </span>
        <span className="insight-scope-meta">Module 14 · Dashboard</span>
      </div>

      <KpiGrid className="reports-kpi-grid report-dashboard-kpis">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
            onClick={kpi.onClick}
          />
        ))}
      </KpiGrid>

      <div className="report-section-heading">
        <div>
          <h2>Portfolio signals</h2>
          <p>Actual distributions and activity from the shared module records.</p>
        </div>
        <Button variant="secondary" icon={Download} onClick={exportSummary}>Export dashboard summary</Button>
      </div>

      <DashboardSummary data={data} />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Project status distribution" subtitle="Project record status; select a segment to open the filtered project report.">
          {data.charts.projectStatus.length ? (
            <DonutChart
              data={data.charts.projectStatus}
              centerValue={data.totalProjects}
              centerLabel="Projects"
              ariaLabel="Project status distribution"
              formatValue={formatReportNumber}
              onSelect={(item) => onNavigate('project-progress', { status: item.label })}
            />
          ) : <Empty />}
        </ReportCard>

        <ReportCard title="Design status distribution" subtitle="Mechanical design record status; select a segment to filter the design report.">
          {data.charts.designStatus.length ? (
            <DonutChart
              data={data.charts.designStatus}
              centerValue={data.totalDesigns}
              centerLabel="Designs"
              ariaLabel="Design status distribution"
              formatValue={formatReportNumber}
              onSelect={(item) => onNavigate('design-status', { status: item.label })}
            />
          ) : <Empty />}
        </ReportCard>

        <ReportCard
          title="Monthly project activity"
          subtitle="Project starts, design registrations and review submissions by recorded month. CAD uploads and drawing issue counts are shown per month."
          wide
        >
          {monthlyRows.length ? (
            <StackedBarChart
              data={monthlyRows}
              series={MONTH_SERIES}
              ariaLabel="Monthly project, design and review activity"
              formatValue={formatReportNumber}
            />
          ) : <Empty />}
        </ReportCard>

        <ReportCard title="Engineering approval status" subtitle="Overall review workflow status. Select a status to open the approval report.">
          {data.charts.reviewStatus.length ? (
            <DonutChart
              data={data.charts.reviewStatus}
              centerValue={data.totalReviews}
              centerLabel="Reviews"
              ariaLabel="Engineering approval status"
              formatValue={formatReportNumber}
              onSelect={(item) => onNavigate('review-approval', { status: item.label })}
            />
          ) : <Empty />}
        </ReportCard>

        <ReportCard title="CAD and drawing activity" subtitle="Registered CAD files by format and drawing approval state.">
          <div className="report-double-chart">
            <div>
              <h3 className="report-mini-title">CAD file formats</h3>
              {data.charts.cadFormats.length ? (
                <BarList
                  data={data.charts.cadFormats}
                  ariaLabel="CAD file format distribution"
                  formatValue={formatReportNumber}
                  onSelect={(item) => onNavigate('cad-drawing', { format: item.label })}
                />
              ) : <Empty />}
            </div>
            <div>
              <h3 className="report-mini-title">Drawing approval status</h3>
              {data.charts.drawingStatus.length ? (
                <BarList
                  data={data.charts.drawingStatus}
                  ariaLabel="Drawing approval status"
                  formatValue={formatReportNumber}
                  onSelect={(item) => onNavigate('cad-drawing', { status: item.label })}
                />
              ) : <Empty />}
            </div>
          </div>
        </ReportCard>

        <ReportCard title="BOM and cost summary" subtitle="Only costs already recorded on a BOM estimate are summed. Missing estimates are not treated as zero.">
          <div className="report-cost-summary">
            <div><span>BOM records</span><strong>{formatReportNumber(data.totalBoms)}</strong><small>In current scope</small></div>
            <div><span>Estimated BOMs</span><strong>{formatReportNumber(data.charts.estimateCount)}</strong><small>Cost estimate record exists</small></div>
            <div><span>Recorded estimate total</span><strong>{formatReportCurrency(data.charts.totalEstimatedCost)}</strong><small>Sum of actual estimate totals</small></div>
            <div><span>BOMs without cost record</span><strong>{formatReportNumber(Math.max(data.totalBoms - data.charts.estimateCount, 0))}</strong><small>Not reported as zero</small></div>
          </div>
          {data.charts.cost.length ? (
            <BarList
              data={data.charts.cost.slice(0, 6)}
              ariaLabel="Recorded BOM estimate totals"
              formatValue={formatReportCurrency}
              onSelect={() => onNavigate('bom-cost')}
            />
          ) : <Empty />}
        </ReportCard>

        <ReportCard title="Engineering change status" subtitle="Actual ECR and ECO records. Rejected and released records remain distinct.">
          {data.charts.changeStatus.length ? (
            <DonutChart
              data={data.charts.changeStatus}
              centerValue={data.totalChangeRecords}
              centerLabel="Change records"
              ariaLabel="Engineering change status distribution"
              formatValue={formatReportNumber}
              onSelect={(item) => onNavigate('engineering-change', { status: item.label })}
            />
          ) : <Empty />}
        </ReportCard>

        <ReportCard title="Project delay overview" subtitle="Uses the recorded delayed flag and completion status; no schedule percentage is inferred." wide>
          <div className="report-double-chart">
            {data.charts.delayStatus.length ? (
              <BarList
                data={data.charts.delayStatus}
                ariaLabel="Project delay overview"
                formatValue={formatReportNumber}
                onSelect={(item) => onNavigate('project-progress', item.label === 'Delayed' ? { delay: 'Delayed' } : {})}
              />
            ) : <Empty />}
            <div className="report-delay-note">
              <AlertTriangle aria-hidden="true" />
              <div>
                <strong>{data.delayedProjects} delayed project{data.delayedProjects === 1 ? '' : 's'}</strong>
                <p>Delay status comes directly from the project record. Actual completion dates are absent in the source data and are shown as Not recorded in the project report.</p>
              </div>
            </div>
          </div>
        </ReportCard>
      </div>

      <DataNote>
        Dashboard values are calculated from the current Module 01–13 contexts. Clicking KPI cards and available chart segments opens the corresponding report with the selected filter. No dashboard record, statistic or status is written back to localStorage.
      </DataNote>
    </>
  );
}

