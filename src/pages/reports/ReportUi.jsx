import { useMemo, useState } from 'react';
import { Download, Info, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  SearchInput,
  StatusBadge,
} from '../../components/common';
import exportCsv from '../../utils/exportCsv';
import { EMPTY_REPORT_FILTERS, toCsvColumns } from '../../data/reportingAnalyticsData';

const FILTER_LABELS = {
  search: 'Search',
  project: 'Project',
  department: 'Department',
  status: 'Status',
  approval: 'Approval',
  revision: 'Revision',
  owner: 'Owner',
  from: 'From date',
  to: 'To date',
  format: 'Format',
  type: 'Change type',
  stage: 'Stage',
  delay: 'Delay status',
  release: 'Release',
  pendingStage: 'Pending stage',
  open: 'Open / closed',
  handover: 'Handover',
  range: 'Date range',
};

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
];

export const REPORT_FILTER_CONFIG = {
  dashboard: { dashboard: true },
  'project-progress': { status: true, owner: true, delay: true, date: true },
  'design-status': { status: true, approval: true, revision: true, owner: true, release: true, date: true },
  'cad-drawing': { status: true, revision: true, owner: true, format: true, release: true, date: true },
  'bom-cost': { status: true, revision: true, owner: true, date: true },
  'review-approval': { status: true, revision: true, owner: true, stage: true, pendingStages: true, date: true },
  'engineering-change': { status: true, approval: true, revision: true, type: true, owner: true, open: true, date: true },
  manufacturing: { status: true, approval: true, revision: true, owner: true, handover: true, date: true },
  'workload-delay': { status: true, owner: true },
};

function FilterSelect({ label, value, onChange, options, allLabel = 'All', id }) {
  return (
    <label className="insight-field report-filter-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="All">{allLabel}</option>
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

export function ReportFilterBar({ tabKey, filters, onChange, onReset, options, projectOptions, departmentOptions }) {
  const [expanded, setExpanded] = useState(false);
  const config = REPORT_FILTER_CONFIG[tabKey] || {};
  const activeCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'range') return value !== 'all';
    if (key === 'from' || key === 'to' || key === 'search') return Boolean(value);
    return value && value !== 'All';
  }).length;

  const set = (key, value) => onChange({ ...filters, [key]: value });

  const extraFields = [
    config.approval && options.approvals?.length ? (
      <FilterSelect key="approval" id="report-filter-approval" label="Approval" value={filters.approval} onChange={(value) => set('approval', value)} options={options.approvals} allLabel="All approvals" />
    ) : null,
    config.revision && options.revisions?.length ? (
      <FilterSelect key="revision" id="report-filter-revision" label="Revision" value={filters.revision} onChange={(value) => set('revision', value)} options={options.revisions} allLabel="All revisions" />
    ) : null,
    config.owner && options.owners?.length ? (
      <FilterSelect key="owner" id="report-filter-owner" label="Owner" value={filters.owner} onChange={(value) => set('owner', value)} options={options.owners} allLabel="All owners" />
    ) : null,
    config.format && options.formats?.length ? (
      <FilterSelect key="format" id="report-filter-format" label="Format" value={filters.format} onChange={(value) => set('format', value)} options={options.formats} allLabel="All formats" />
    ) : null,
    config.type && options.types?.length ? (
      <FilterSelect key="type" id="report-filter-type" label="Change type" value={filters.type} onChange={(value) => set('type', value)} options={options.types} allLabel="ECR + ECO" />
    ) : null,
    config.stage && options.stages?.length ? (
      <FilterSelect key="stage" id="report-filter-stage" label="Current stage" value={filters.stage} onChange={(value) => set('stage', value)} options={options.stages} allLabel="All stages" />
    ) : null,
    config.delay && options.delays?.length ? (
      <FilterSelect key="delay" id="report-filter-delay" label="Delay status" value={filters.delay} onChange={(value) => set('delay', value)} options={options.delays} allLabel="All delay states" />
    ) : null,
    config.release && options.releases?.length ? (
      <FilterSelect key="release" id="report-filter-release" label="Release" value={filters.release} onChange={(value) => set('release', value)} options={options.releases} allLabel="All release states" />
    ) : null,
    config.open && options.opens?.length ? (
      <FilterSelect key="open" id="report-filter-open" label="Open / closed" value={filters.open} onChange={(value) => set('open', value)} options={options.opens} allLabel="Open + closed" />
    ) : null,
    config.handover && options.handovers?.length ? (
      <FilterSelect key="handover" id="report-filter-handover" label="Handover / package" value={filters.handover} onChange={(value) => set('handover', value)} options={options.handovers} allLabel="All handover states" />
    ) : null,
    config.pendingStages && options.pendingStages?.length ? (
      <FilterSelect key="pendingStage" id="report-filter-pending-stage" label="Pending stage" value={filters.pendingStage} onChange={(value) => set('pendingStage', value)} options={options.pendingStages} allLabel="All pending stages" />
    ) : null,
  ].filter(Boolean);

  return (
    <>
      <section className="insight-filter-card report-filter-card" aria-label="Report filters">
        <SearchInput
          className="report-filter-search"
          value={filters.search}
          onChange={(value) => set('search', value)}
          placeholder="Search report records..."
          ariaLabel="Search report records"
        />
        <FilterSelect
          id="report-filter-project"
          label="Project"
          value={filters.project}
          onChange={(value) => set('project', value)}
          options={projectOptions}
          allLabel="All projects"
        />
        <FilterSelect
          id="report-filter-department"
          label="Department"
          value={filters.department}
          onChange={(value) => set('department', value)}
          options={departmentOptions}
          allLabel="All departments"
        />
        {config.dashboard ? (
          <label className="insight-field report-filter-field" htmlFor="report-filter-range">
            <span>Date range</span>
            <select
              id="report-filter-range"
              value={filters.range}
              onChange={(event) => onChange({ ...filters, range: event.target.value, from: '', to: '' })}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {options.statuses?.length ? (
              <FilterSelect
                id="report-filter-status"
                label="Status"
                value={filters.status}
                onChange={(value) => set('status', value)}
                options={options.statuses}
                allLabel="All statuses"
              />
            ) : null}
            {config.date ? (
              <>
                <label className="insight-field report-filter-field report-filter-date" htmlFor="report-filter-from">
                  <span>From</span>
                  <input id="report-filter-from" type="date" value={filters.from} onChange={(event) => set('from', event.target.value)} />
                </label>
                <label className="insight-field report-filter-field report-filter-date" htmlFor="report-filter-to">
                  <span>To</span>
                  <input id="report-filter-to" type="date" value={filters.to} onChange={(event) => set('to', event.target.value)} />
                </label>
              </>
            ) : null}
          </>
        )}
        <div className="report-filter-actions">
          {extraFields.length ? (
            <Button
              variant="ghost"
              icon={SlidersHorizontal}
              className={expanded ? 'is-active' : ''}
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide Filters' : 'More Filters'}
            </Button>
          ) : null}
          <button type="button" className="insight-icon-button" title="Reset filters" aria-label="Reset filters" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </section>
      {expanded && extraFields.length ? (
        <section className="insight-filter-panel report-extra-filters" aria-label="Additional report filters">
          <div className="insight-filter-grid">
            {extraFields}
          </div>
        </section>
      ) : null}
      <div className="report-filter-status" aria-live="polite">
        <span>{activeCount ? `${activeCount} active filter${activeCount === 1 ? '' : 's'}` : 'No filters applied'}</span>
        {filters.project !== 'All' ? <small>Project scope: {filters.project}</small> : null}
      </div>
    </>
  );
}

export function ReferenceLink({ to, children, title }) {
  if (!to) return <span className="cell-muted">Not recorded</span>;
  return <Link className="report-reference-link" to={to} title={title}>{children}</Link>;
}

export function ReportTable({
  title,
  subtitle,
  columns,
  rows,
  filename,
  getRowId = (row) => row.rowKey || row.id,
  onRowClick,
  emptyMessage = 'No records match the current filters.',
  ariaLabel,
  actions = null,
  className = '',
}) {
  const [exported, setExported] = useState(null);
  const exportable = useMemo(() => toCsvColumns(columns), [columns]);
  const handleExport = () => {
    if (!rows.length) return;
    exportCsv(filename, exportable, rows);
    setExported({ rows: rows.length, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  };
  return (
    <Card
      title={title}
      subtitle={subtitle}
      className={`report-table-card ${className}`.trim()}
      bodyClassName="report-table-body"
      actions={
        <>
          {actions}
          <Button variant="secondary" icon={Download} onClick={handleExport} disabled={!rows.length}>
            Export CSV
          </Button>
        </>
      }
    >
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={getRowId}
        onRowClick={onRowClick}
        ariaLabel={ariaLabel || title}
        emptyContent={
          <EmptyState
            title="No matching records"
            message={emptyMessage}
          />
        }
      />
      <div className="report-table-foot">
        <span>{rows.length.toLocaleString('en-IN')} record{rows.length === 1 ? '' : 's'} in this filtered view</span>
        {exported ? (
          <span className="report-export-status" role="status">
            CSV exported · {exported.rows.toLocaleString('en-IN')} row{exported.rows === 1 ? '' : 's'} · {exported.at}
          </span>
        ) : (
          <span>CSV uses the current filters. Missing values export as “Not recorded”.</span>
        )}
      </div>
    </Card>
  );
}

export function ReportKpis({ items }) {
  return (
    <div className="insight-stats-grid report-kpi-grid">
      {items.map((item) => (
        <div className={`insight-stat${item.tone ? ` tone-${item.tone}` : ''}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.sub ? <small>{item.sub}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function ReportCard({ title, subtitle, children, wide = false, actions = null, className = '' }) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      actions={actions}
      className={`insight-card${wide ? ' insight-card-wide' : ''} ${className}`.trim()}
      bodyClassName="insight-card-body"
    >
      {children}
    </Card>
  );
}

export function ReportEmpty({ title = 'No records available', message = 'No source records match the current filters.' }) {
  return <EmptyState title={title} message={message} />;
}

export function DataNote({ children }) {
  return (
    <p className="insight-footnote report-data-note">
      <Info aria-hidden="true" />
      {children}
    </p>
  );
}

export function StatusCell({ status }) {
  return <StatusBadge status={status || 'Not recorded'} />;
}

export function MissingValue({ children = 'Not recorded' }) {
  return <span className="cell-muted">{children}</span>;
}

export function FilterResetButton({ onClick }) {
  return (
    <Button variant="ghost" icon={RotateCcw} onClick={onClick}>
      Reset
    </Button>
  );
}

export function activeFilterSummary(filters) {
  return Object.entries(filters)
    .filter(([key, value]) => {
      if (key === 'range') return value !== 'all';
      return value && value !== 'All';
    })
    .map(([key, value]) => `${FILTER_LABELS[key] || key}: ${value}`)
    .join(' · ');
}

export const FILTER_DEFAULTS = EMPTY_REPORT_FILTERS;
