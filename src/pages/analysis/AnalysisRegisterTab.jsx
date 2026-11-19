import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArrowRightLeft,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Button,
  DataTable,
  Dropdown,
  DropdownItem,
  EmptyState,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import AttachmentList from '../../components/attachments/AttachmentList';
import { useAnalysis } from '../../context/AnalysisContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  ANALYSIS_CATEGORY_FILTERS,
  ANALYSIS_ENGINEERS,
  ANALYSIS_REVIEWERS,
  ANALYSIS_STATUSES,
  ANALYSIS_TYPES,
  PRIORITIES,
  REVISIONS,
  analysisKpis,
  canSubmitAnalysis,
  componentLabel,
  projectName,
  statusTone,
} from '../../data/analysisData';
import exportCsv from '../../utils/exportCsv';
import { RevisionHistoryModal } from '../mechanical/mechanicalUi';
import { Fact, Toast, useToast } from './analysisUi';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const EMPTY_FILTERS = {
  projectId: 'All',
  analysisType: 'All',
  engineer: 'All',
  reviewer: 'All',
  status: 'All',
  priority: 'All',
  revision: 'All',
  from: '',
  to: '',
};

const ALL_COLUMNS = [
  { key: 'id', label: 'Analysis ID', width: 96, sortable: true },
  { key: 'projectId', label: 'Project ID', width: 112 },
  { key: 'designId', label: 'Design ID', width: 108 },
  { key: 'title', label: 'Analysis Title', width: 176, sortable: true },
  { key: 'analysisType', label: 'Analysis Type', width: 132, sortable: true },
  { key: 'drawingRevision', label: 'Design Revision', width: 92, align: 'center' },
  { key: 'validationReportRef', label: 'Validation Report Ref', width: 132 },
  { key: 'engineer', label: 'Engineer', width: 92, sortable: true },
  { key: 'created', label: 'Created Date', width: 96, sortable: true },
  { key: 'verificationStatus', label: 'Status', width: 116 },
];

const CSV_COLUMNS = [
  { key: 'id', label: 'Analysis ID' },
  { key: 'title', label: 'Analysis Title' },
  { key: 'projectId', label: 'Project ID' },
  { key: 'projectName', label: 'Project' },
  { key: 'designId', label: 'Design ID' },
  { key: 'componentLabel', label: 'Part / Assembly' },
  { key: 'validationReportRef', label: 'Validation Report Reference' },
  { key: 'drawingRevision', label: 'Drawing Revision' },
  { key: 'category', label: 'Analysis Category' },
  { key: 'analysisType', label: 'Analysis Type' },
  { key: 'engineer', label: 'Engineer' },
  { key: 'reviewer', label: 'Technical Reviewer' },
  { key: 'priority', label: 'Priority' },
  { key: 'target', label: 'Target Date' },
  { key: 'revision', label: 'Revision' },
  { key: 'verificationStatus', label: 'Verification Status' },
];

/* ==========================================================================
   Analysis Register — one register, seven analysis categories.
   ========================================================================== */
export default function AnalysisRegisterTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    analyses,
    archiveAnalysis,
    duplicateAnalysis,
    submitAnalysisForReview,
    removeAnalysisAttachment,
  } = useAnalysis();
  const { parts, assemblies } = useMechanical();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const requestedCategory = ANALYSIS_CATEGORY_FILTERS.find(
    (category) => category.label === searchParams.get('category'),
  );
  const [categoryFilter, setCategoryFilter] = useState(requestedCategory?.key || 'all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleKeys, setVisibleKeys] = useState(ALL_COLUMNS.map((column) => column.key));
  const [pendingArchive, setPendingArchive] = useState(null);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [attachmentTarget, setAttachmentTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submitForm, setSubmitForm] = useState({ reviewer: '', dueDate: '', comments: '' });

  const rows = useMemo(
    () =>
      analyses.map((analysis) => ({
        ...analysis,
        projectName: projectName(projects, analysis.projectId),
        componentLabel: componentLabel(analysis.linkedType, analysis.linkedId, parts, assemblies),
      })),
    [analyses, projects, parts, assemblies],
  );

  const activeCategory = ANALYSIS_CATEGORY_FILTERS.find((category) => category.key === categoryFilter);

  const categoryRows = useMemo(() => {
    if (categoryFilter === 'all') return rows;
    return rows.filter((row) => row.category === activeCategory?.label);
  }, [rows, categoryFilter, activeCategory]);

  const kpis = useMemo(() => {
    const summary = analysisKpis(categoryRows);
    return [
      { key: 'total', label: 'Total Analyses', value: String(summary.total), sub: activeCategory?.label || 'All categories', icon: ClipboardCheck, tone: 'teal' },
      { key: 'progress', label: 'In Progress', value: String(summary.inProgress), sub: 'Active analysis work', icon: Pencil, tone: 'blue' },
      { key: 'pending', label: 'Pending Review', value: String(summary.pending), sub: 'Submitted, awaiting reviewer', icon: Send, tone: 'orange' },
      { key: 'verified', label: 'Verified Analyses', value: String(summary.verified), sub: 'Evidence accepted by reviewer', icon: ShieldCheck, tone: 'emerald' },
    ];
  }, [categoryRows, activeCategory]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categoryRows.filter((row) => {
      if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
      if (filters.analysisType !== 'All' && row.analysisType !== filters.analysisType) return false;
      if (filters.engineer !== 'All' && row.engineer !== filters.engineer) return false;
      if (filters.reviewer !== 'All' && row.reviewer !== filters.reviewer) return false;
      if (filters.status !== 'All' && row.verificationStatus !== filters.status) return false;
      if (filters.priority !== 'All' && row.priority !== filters.priority) return false;
      if (filters.revision !== 'All' && row.revision !== filters.revision) return false;
      if (filters.from && row.target && row.target < filters.from) return false;
      if (filters.to && row.target && row.target > filters.to) return false;
      if (!query) return true;
      return [
        row.id,
        row.title,
        row.projectName,
        row.componentLabel,
        row.category,
        row.designId,
        row.validationReportRef,
        row.analysisType,
        row.engineer,
        row.reviewer,
        row.verificationStatus,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [categoryRows, search, filters]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((left, right) => {
      const a = String(left[sortKey] ?? '');
      const b = String(right[sortKey] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return list;
  }, [filteredRows, sortKey, sortDirection]);

  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;

  const resetAll = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setSelectedIds([]);
    setPage(1);
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const toggleRow = (id) =>
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );

  const columns = ALL_COLUMNS.filter((column) => visibleKeys.includes(column.key)).map((column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    sortable: column.sortable,
    align: column.align,
    render: (row) => {
      if (column.key === 'id') return <span className="cell-id">{row.id}</span>;
      if (column.key === 'title')
        return (
          <span className="cell-strong cell-clamp" title={row.title}>
            {row.title}
          </span>
        );
      if (column.key === 'projectName')
        return (
          <span className="cell-project">
            <span className="cell-id">{row.projectId}</span>
            <span className="cell-muted">{row.projectName}</span>
          </span>
        );
      if (column.key === 'designId')
        return <span className="cell-muted">{row.designId || '—'}</span>;
      if (column.key === 'projectId')
        return (
          <span className="cell-project">
            <span className="cell-id">{row.projectId}</span>
            <span className="cell-muted cell-clamp">{row.projectName}</span>
          </span>
        );
      if (column.key === 'analysisType')
        return (
          <span className="cell-muted cell-clamp" title={row.analysisType}>
            {row.analysisType}
          </span>
        );
      if (column.key === 'validationReportRef')
        return <span className="cell-muted cell-clamp">{row.validationReportRef || '—'}</span>;
      if (column.key === 'created')
        return <span className="cell-muted">{row.created ? formatDate(row.created) : '—'}</span>;
      if (column.key === 'drawingRevision')
        return <span className="chip mech-rev-chip">{row.drawingRevision}</span>;
      if (column.key === 'target')
        return <span className="cell-muted">{row.target ? formatDate(row.target) : '—'}</span>;
      if (column.key === 'verificationStatus')
        return <StatusBadge status={row.verificationStatus} tone={statusTone(row.verificationStatus)} />;
      return row[column.key];
    },
  }));

  const openSubmit = (row) => {
    setSubmitTarget(row);
    setSubmitForm({ reviewer: row.reviewer, dueDate: '', comments: '' });
  };

  const confirmSubmit = () => {
    const result = submitAnalysisForReview(submitTarget.id, {
      by: submitTarget.engineer,
      reviewer: submitForm.reviewer,
      dueDate: submitForm.dueDate,
      comments: submitForm.comments,
    });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    setSubmitTarget(null);
    showToast(`${submitTarget.id} submitted for review.`);
  };

  const bulkIds = selectedIds.filter((id) => sortedRows.some((row) => row.id === id));

  return (
    <>
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </KpiGrid>

      <div className="mech-domain-bar is-segmented" role="group" aria-label="Analysis categories">
        {ANALYSIS_CATEGORY_FILTERS.map((category) => {
          const count =
            category.key === 'all'
              ? rows.length
              : rows.filter((row) => row.category === category.label).length;
          return (
            <button
              key={category.key}
              type="button"
              className={`mech-domain-chip${categoryFilter === category.key ? ' is-active' : ''}`}
              aria-pressed={categoryFilter === category.key}
              onClick={() => {
                setCategoryFilter(category.key);
                setPage(1);
                setSelectedIds([]);
              }}
            >
              {category.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <Toolbar
        left={
          <>
            <Button
              variant="ghost"
              icon={Filter}
              onClick={() => {
                setDraftFilters(filters);
                setFiltersOpen((open) => !open);
              }}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => {
                resetAll();
                setCategoryFilter('all');
              }}
            >
              Refresh
            </Button>
            {bulkIds.length > 0 && (
              <Dropdown
                trigger={({ open, toggle }) => (
                  <Button variant="secondary" onClick={toggle} aria-expanded={open}>
                    Bulk Actions ({bulkIds.length})
                  </Button>
                )}
              >
                {({ close }) => (
                  <>
                    <DropdownItem
                      icon={Download}
                      onClick={() => {
                        exportCsv(
                          'analysis-register-selection',
                          CSV_COLUMNS,
                          sortedRows.filter((row) => bulkIds.includes(row.id)),
                        );
                        close();
                      }}
                    >
                      Export selected
                    </DropdownItem>
                    <DropdownItem
                      icon={Archive}
                      danger
                      onClick={() => {
                        setPendingArchive({ ids: bulkIds, bulk: true });
                        close();
                      }}
                    >
                      Archive selected
                    </DropdownItem>
                  </>
                )}
              </Dropdown>
            )}
          </>
        }
        right={
          <>
            <SearchInput
              id="analysis-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search analysis, project, engineer..."
              ariaLabel="Search analyses"
            />
            <Dropdown
              trigger={({ open, toggle }) => (
                <Button variant="ghost" icon={Download} onClick={toggle} aria-expanded={open}>
                  Export
                </Button>
              )}
            >
              {({ close }) => (
                <DropdownItem
                  icon={Download}
                  onClick={() => {
                    exportCsv('analysis-register', CSV_COLUMNS, sortedRows);
                    close();
                  }}
                >
                  Export CSV
                </DropdownItem>
              )}
            </Dropdown>
            <Dropdown
              trigger={({ open, toggle }) => (
                <Button variant="ghost" icon={SlidersHorizontal} onClick={toggle} aria-expanded={open}>
                  Columns
                </Button>
              )}
            >
              {() => (
                <>
                  <div className="dropdown-columns-head">
                    <span>Visible columns</span>
                    <button type="button" onClick={() => setVisibleKeys(ALL_COLUMNS.map((c) => c.key))}>
                      Show all
                    </button>
                  </div>
                  {ALL_COLUMNS.map((column) => (
                    <label key={column.key} className="dropdown-column-toggle">
                      <input
                        type="checkbox"
                        checked={visibleKeys.includes(column.key)}
                        onChange={() =>
                          setVisibleKeys((previous) =>
                            previous.includes(column.key)
                              ? previous.filter((key) => key !== column.key)
                              : [...previous, column.key],
                          )
                        }
                      />
                      {column.label}
                    </label>
                  ))}
                </>
              )}
            </Dropdown>
            <Button
              variant="secondary"
              icon={Plus}
              size="sm"
              onClick={() =>
                navigate(
                  categoryFilter === 'all'
                    ? '/analysis/new'
                    : `/analysis/new?category=${encodeURIComponent(activeCategory.label)}`,
                )
              }
            >
              New Analysis
            </Button>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filters-panel">
          <div className="filters-grid">
            <Select
              id="anl-filter-project"
              label="Project"
              options={[
                { value: 'All', label: 'All Projects' },
                ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` })),
              ]}
              value={draftFilters.projectId}
              onChange={(event) => setDraftFilters((p) => ({ ...p, projectId: event.target.value }))}
            />
            <Select
              id="anl-filter-type"
              label="Analysis Type"
              options={[
                { value: 'All', label: 'All Types' },
                ...ANALYSIS_TYPES.map((type) => ({ value: type, label: type })),
              ]}
              value={draftFilters.analysisType}
              onChange={(event) => setDraftFilters((p) => ({ ...p, analysisType: event.target.value }))}
            />
            <Select
              id="anl-filter-engineer"
              label="Engineer"
              options={[
                { value: 'All', label: 'All Engineers' },
                ...ANALYSIS_ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
              ]}
              value={draftFilters.engineer}
              onChange={(event) => setDraftFilters((p) => ({ ...p, engineer: event.target.value }))}
            />
            <Select
              id="anl-filter-reviewer"
              label="Technical Reviewer"
              options={[
                { value: 'All', label: 'All Reviewers' },
                ...ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer })),
              ]}
              value={draftFilters.reviewer}
              onChange={(event) => setDraftFilters((p) => ({ ...p, reviewer: event.target.value }))}
            />
            <Select
              id="anl-filter-status"
              label="Verification Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...ANALYSIS_STATUSES.map((status) => ({ value: status, label: status })),
              ]}
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((p) => ({ ...p, status: event.target.value }))}
            />
            <Select
              id="anl-filter-priority"
              label="Priority"
              options={[
                { value: 'All', label: 'All Priorities' },
                ...PRIORITIES.map((priority) => ({ value: priority, label: priority })),
              ]}
              value={draftFilters.priority}
              onChange={(event) => setDraftFilters((p) => ({ ...p, priority: event.target.value }))}
            />
            <Select
              id="anl-filter-revision"
              label="Drawing Revision"
              options={[
                { value: 'All', label: 'All Revisions' },
                ...REVISIONS.map((revision) => ({ value: `Rev ${revision}`, label: `Rev ${revision}` })),
              ]}
              value={draftFilters.revision}
              onChange={(event) => setDraftFilters((p) => ({ ...p, revision: event.target.value }))}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="anl-filter-from">
                Target Date From
              </label>
              <input
                id="anl-filter-from"
                type="date"
                className="form-input"
                value={draftFilters.from}
                onChange={(event) => setDraftFilters((p) => ({ ...p, from: event.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="anl-filter-to">
                Target Date To
              </label>
              <input
                id="anl-filter-to"
                type="date"
                className="form-input"
                value={draftFilters.to}
                onChange={(event) => setDraftFilters((p) => ({ ...p, to: event.target.value }))}
              />
            </div>
            <div className="filter-actions">
              <Button
                onClick={() => {
                  setFilters(draftFilters);
                  setPage(1);
                  setFiltersOpen(false);
                }}
              >
                Apply Filters
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraftFilters(EMPTY_FILTERS);
                  resetAll();
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="table-card">
        <DataTable
          columns={columns}
          rows={pageRows}
          className="mech-register-table"
          selectable
          selectedIds={selectedIds}
          onSelectAll={(checked) => setSelectedIds(checked ? pageRows.map((row) => row.id) : [])}
          onToggleRow={toggleRow}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          recordHref={(row) => `/analysis/${row.id}`}
          onRowClick={(row) => navigate(`/analysis/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'View details', icon: Eye },
            { key: 'report', label: 'Open analysis report', icon: FileText },
            { key: 'edit', label: 'Edit analysis', icon: Pencil },
            { key: 'duplicate', label: 'Duplicate', icon: Copy },
            ...(targetsFor('analysis', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Create manufacturing definition', icon: ArrowRightLeft }]
              : []),
            ...(canSubmitAnalysis(row)
              ? [{ key: 'submit', label: 'Submit for review', icon: Send }]
              : []),
            { key: 'attachments', label: 'View attachments', icon: Paperclip },
            { key: 'revisions', label: 'View revision history', icon: History },
            {
              key: 'archive',
              label: 'Archive',
              icon: Archive,
              danger: true,
              divider: true,
            },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/analysis/${row.id}`);
            if (key === 'report') navigate(`/analysis/${row.id}/report`);
            if (key === 'edit') navigate(`/analysis/${row.id}/edit`);
            if (key === 'duplicate') {
              duplicateAnalysis(row.id, row.engineer);
              showToast(`${row.id} duplicated as a new draft.`);
            }
            if (key === 'convert') openConversion('analysis', row);
            if (key === 'submit') openSubmit(row);
            if (key === 'attachments') setAttachmentTarget(row);
            if (key === 'revisions') setRevisionTarget(row);
            if (key === 'archive') setPendingArchive({ ids: [row.id], bulk: false, row });
          }}
          ariaLabel="Analysis register"
          emptyContent={
            <EmptyState
              icon={ClipboardCheck}
              title="No Analyses Found"
              message={
                categoryFilter === 'all'
                  ? 'No analyses match the current search or filter selection.'
                  : `No ${activeCategory?.label} analyses match the current filters.`
              }
              action={
                <Button variant="ghost" icon={X} onClick={resetAll}>
                  Clear Filters
                </Button>
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
        Demonstration data only. Analysis records store engineering references and evidence — this
        module does not run simulations or certify results, and a verified analysis is not a released
        design.
      </p>

      {/* Submit for review */}
      <Modal
        open={Boolean(submitTarget)}
        onClose={() => setSubmitTarget(null)}
        title="Submit Analysis for Review"
        subtitle={submitTarget ? `${submitTarget.id} · ${submitTarget.title}` : undefined}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button icon={Send} disabled={!submitForm.reviewer} onClick={confirmSubmit}>
              Submit for Review
            </Button>
          </>
        }
      >
        {submitTarget && (
          <>
            <div className="form-grid">
              <Select
                id="anl-submit-reviewer"
                label="Assigned Reviewer"
                options={ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
                value={submitForm.reviewer}
                onChange={(event) => setSubmitForm((p) => ({ ...p, reviewer: event.target.value }))}
              />
              <div className="form-field">
                <label className="form-label" htmlFor="anl-submit-due">
                  Review Due Date
                </label>
                <input
                  id="anl-submit-due"
                  type="date"
                  className="form-input"
                  value={submitForm.dueDate}
                  onChange={(event) => setSubmitForm((p) => ({ ...p, dueDate: event.target.value }))}
                />
              </div>
              <div className="form-grid-full">
                <div className="form-field">
                  <label className="form-label" htmlFor="anl-submit-comments">
                    Submission Note
                  </label>
                  <textarea
                    id="anl-submit-comments"
                    className="form-input"
                    rows={3}
                    placeholder="What should the reviewer check first?"
                    value={submitForm.comments}
                    onChange={(event) => setSubmitForm((p) => ({ ...p, comments: event.target.value }))}
                  />
                </div>
              </div>
            </div>
            <p className="dash-modal-note">
              {(submitTarget.attachments || []).length} evidence file(s) will be referenced. Submission
              moves the record to Pending Review — it does not verify it.
            </p>
          </>
        )}
      </Modal>

      {/* Attachments */}
      <Modal
        open={Boolean(attachmentTarget)}
        onClose={() => setAttachmentTarget(null)}
        title="Supporting Attachments"
        subtitle={attachmentTarget ? `${attachmentTarget.id} · ${attachmentTarget.title}` : undefined}
        maxWidth="max-w-xl"
        footer={
          <Button variant="ghost" onClick={() => setAttachmentTarget(null)}>
            Close
          </Button>
        }
      >
        {attachmentTarget && (
          <AttachmentList
            analysis={attachmentTarget}
            editable={['Draft', 'In Progress', 'Changes Requested'].includes(
              attachmentTarget.verificationStatus,
            )}
            onRemove={(row) => removeAnalysisAttachment(attachmentTarget.id, row.name, 'Design Admin')}
            emptyMessage="No attachments recorded for this analysis."
          />
        )}
      </Modal>

      {/* Archive confirmation */}
      <Modal
        open={Boolean(pendingArchive)}
        onClose={() => setPendingArchive(null)}
        title={pendingArchive?.bulk ? 'Archive Selected Analyses' : 'Archive Analysis'}
        subtitle={
          pendingArchive?.bulk
            ? `${pendingArchive.ids.length} analysis record(s)`
            : pendingArchive?.row
              ? `${pendingArchive.row.id} · ${pendingArchive.row.title}`
              : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              icon={Archive}
              onClick={() => {
                pendingArchive.ids.forEach((id) => archiveAnalysis(id, 'Design Admin'));
                showToast(
                  pendingArchive.bulk
                    ? `${pendingArchive.ids.length} analyses archived.`
                    : `${pendingArchive.ids[0]} archived.`,
                );
                setSelectedIds([]);
                setPendingArchive(null);
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Archived analyses keep their evidence references, reviews and revision history. They remain
          readable but cannot be submitted for review.
        </p>
      </Modal>

      <RevisionHistoryModal
        open={Boolean(revisionTarget)}
        onClose={() => setRevisionTarget(null)}
        title={revisionTarget ? `Analysis Revisions · ${revisionTarget.id}` : undefined}
        subtitle={revisionTarget ? `${revisionTarget.title} · current Rev ${revisionTarget.revision}` : undefined}
        revisions={revisionTarget?.revisions || []}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
