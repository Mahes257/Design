import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowRightLeft,
  Copy,
  GitBranch,
  Send,
  Stamp,
  Download,
  Eye,
  Filter,
  History,
  Pencil,
  Plus,
  RefreshCw,
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
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  DESIGN_DOMAIN_FILTERS,
  DESIGN_STATUSES,
  PRIORITIES,
  REVISIONS,
  buildMechanicalKpis,
  priorityTone,
  projectName,
  statusTone,
} from '../../data/mechanicalData';
import exportCsv from '../../utils/exportCsv';
import { RevisionHistoryModal, Toast, useToast } from './mechanicalUi';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const EMPTY_FILTERS = {
  projectId: 'All',
  status: 'All',
  owner: 'All',
  priority: 'All',
  revision: 'All',
  from: '',
  to: '',
};

const ALL_COLUMNS = [
  { key: 'id', label: 'Design ID', width: 96, sortable: true },
  { key: 'projectId', label: 'Project ID', width: 128, sortable: true },
  { key: 'projectName', label: 'Project Name', width: 150 },
  { key: 'conceptId', label: 'Selected Concept', width: 118 },
  { key: 'name', label: 'Design Name', width: 160, sortable: true },
  { key: 'product', label: 'Product', width: 150 },
  { key: 'engineer', label: 'Design Engineer', width: 120, sortable: true },
  { key: 'revision', label: 'Revision', width: 78, align: 'center', sortable: true },
  { key: 'created', label: 'Created', width: 92, sortable: true },
  { key: 'updatedAt', label: 'Last Updated', width: 100, sortable: true },
  { key: 'status', label: 'Design Status', width: 112 },
];

/* ==========================================================================
   Design Register — one register, seven engineering disciplines.
   ========================================================================== */
export default function DesignRegisterTab() {
  const navigate = useNavigate();
  const {
    designs,
    archiveDesign,
    duplicateDesign,
    createDesignRevision,
    submitDesignForValidation,
  } = useMechanical();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [domainFilter, setDomainFilter] = useState('all');
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
  const [newRevisionTarget, setNewRevisionTarget] = useState(null);
  const [newRevisionNote, setNewRevisionNote] = useState('');
  const [submitTarget, setSubmitTarget] = useState(null);

  const rows = useMemo(
    () =>
      designs.map((design) => {
        const project = projects.find((row) => row.id === design.projectId);
        return {
          ...design,
          projectName: projectName(projects, design.projectId),
          product: project?.product || '',
          updatedAt: design.updatedAt || design.created,
        };
      }),
    [designs, projects],
  );

  const activeDomain = DESIGN_DOMAIN_FILTERS.find((domain) => domain.key === domainFilter);

  const domainRows = useMemo(() => {
    if (domainFilter === 'all') return rows;
    return rows.filter((row) => row.domain === activeDomain?.label);
  }, [rows, domainFilter, activeDomain]);

  const kpis = useMemo(() => {
    const summary = buildMechanicalKpis({
      designs: domainRows,
      parts: [],
      assemblies: [],
      calculations: [],
    }).designs;
    return [
      { key: 'total', label: 'Total Designs', value: String(summary.total), sub: activeDomain?.label || 'All disciplines', icon: Filter, tone: 'teal' },
      { key: 'progress', label: 'Designs In Progress', value: String(summary.inProgress), sub: 'Active detail design', icon: Pencil, tone: 'blue' },
      { key: 'review', label: 'Designs Under Review', value: String(summary.review), sub: 'Submitted or in review', icon: Eye, tone: 'purple' },
      { key: 'approved', label: 'Approved Designs', value: String(summary.approved), sub: 'Approved or released', icon: Archive, tone: 'emerald' },
    ];
  }, [domainRows, activeDomain]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return domainRows.filter((row) => {
      if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (filters.owner !== 'All' && row.owner !== filters.owner) return false;
      if (filters.priority !== 'All' && row.priority !== filters.priority) return false;
      if (filters.revision !== 'All' && row.revision !== filters.revision) return false;
      if (filters.from && row.target < filters.from) return false;
      if (filters.to && row.target > filters.to) return false;
      if (!query) return true;
      return [
        row.id,
        row.name,
        row.projectId,
        row.projectName,
        row.conceptId,
        row.domain,
        row.category,
        row.owner,
        row.engineer,
        row.product,
        row.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [domainRows, search, filters]);

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

  const hasFilters =
    Boolean(search) || Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key]);

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
      if (column.key === 'name')
        return (
          <span className="cell-strong cell-clamp" title={row.name}>
            {row.name}
          </span>
        );
      if (column.key === 'projectId')
        return (
          <Link className="cell-id" to={`/projects/all-projects/${row.projectId}`}>
            {row.projectId}
          </Link>
        );
      if (column.key === 'projectName')
        return (
          <span className="cell-muted cell-clamp" title={row.projectName}>
            {row.projectName}
          </span>
        );
      if (column.key === 'product')
        return <span className="cell-muted cell-clamp">{row.product || '—'}</span>;
      if (column.key === 'created') return <span className="cell-muted">{formatDate(row.created)}</span>;
      if (column.key === 'updatedAt')
        return <span className="cell-muted">{formatDate(row.updatedAt)}</span>;
      if (column.key === 'conceptId')
        return row.conceptId ? <span className="cell-id">{row.conceptId}</span> : <span className="cell-muted">—</span>;
      if (column.key === 'domain') return <span className="chip chip-mint">{row.domain}</span>;
      if (column.key === 'revision')
        return <span className="chip mech-rev-chip">Rev {row.revision}</span>;
      if (column.key === 'priority')
        return <StatusBadge status={row.priority} tone={priorityTone(row.priority)} />;
      if (column.key === 'target') return <span className="cell-muted">{formatDate(row.target)}</span>;
      if (column.key === 'status')
        return <StatusBadge status={row.status} tone={statusTone(row.status)} />;
      return row[column.key] ?? '—';
    },
  }));

  const csvColumns = [
    { key: 'id', label: 'Design ID' },
    { key: 'name', label: 'Design Name' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectName', label: 'Project' },
    { key: 'conceptId', label: 'Selected Concept' },
    { key: 'domain', label: 'Engineering Domain' },
    { key: 'category', label: 'Design Category' },
    { key: 'owner', label: 'Design Owner' },
    { key: 'engineer', label: 'Assigned Engineer' },
    { key: 'revision', label: 'Revision' },
    { key: 'priority', label: 'Priority' },
    { key: 'target', label: 'Target Date', value: (row) => formatDate(row.target) },
    { key: 'status', label: 'Design Status' },
  ];

  const archiveMany = (ids) => {
    ids.forEach((id) => archiveDesign(id));
    setSelectedIds([]);
    showToast(`${ids.length} design${ids.length === 1 ? '' : 's'} archived.`);
  };

  return (
    <>
      <div className="mech-domain-bar is-segmented" role="tablist" aria-label="Engineering domain">
        {DESIGN_DOMAIN_FILTERS.map((domain) => {
          const count =
            domain.key === 'all'
              ? rows.length
              : rows.filter((row) => row.domain === domain.label).length;
          return (
            <button
              key={domain.key}
              type="button"
              role="tab"
              aria-selected={domainFilter === domain.key}
              className={`mech-domain-chip${domainFilter === domain.key ? ' is-active' : ''}`}
              onClick={() => {
                setDomainFilter(domain.key);
                setSelectedIds([]);
                setPage(1);
              }}
            >
              {domain.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

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

      <Toolbar
        left={
          <>
            <Button
              variant="ghost"
              icon={Filter}
              className={filtersOpen ? 'is-active' : ''}
              aria-expanded={filtersOpen}
              onClick={() => {
                setDraftFilters(filters);
                setFiltersOpen((value) => !value);
              }}
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {hasFilters && (
              <Button variant="ghost" icon={X} onClick={resetAll}>
                Clear
              </Button>
            )}
            <Button variant="ghost" icon={RefreshCw} onClick={resetAll}>
              Refresh
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  icon={Archive}
                  onClick={() => setPendingArchive({ ids: selectedIds, bulk: true })}
                >
                  Archive ({selectedIds.length})
                </Button>
                <Button
                  variant="ghost"
                  icon={Download}
                  onClick={() =>
                    exportCsv(
                      'mechanical-designs-selected',
                      csvColumns,
                      rows.filter((row) => selectedIds.includes(row.id)),
                    )
                  }
                >
                  Export Selected
                </Button>
              </>
            )}
          </>
        }
        right={
          <>
            <SearchInput
              id="design-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search design, project, owner..."
              ariaLabel="Search designs"
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
                    exportCsv('mechanical-designs', csvColumns, sortedRows);
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
                  <div className="dropdown-label">Visible columns</div>
                  {ALL_COLUMNS.map((column) => (
                    <label key={column.key} className="dropdown-check">
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
                  <div className="dropdown-footer">
                    <button
                      type="button"
                      onClick={() => setVisibleKeys(ALL_COLUMNS.map((column) => column.key))}
                    >
                      Show all
                    </button>
                    <button type="button" onClick={() => setVisibleKeys(['id', 'name'])}>
                      Hide all
                    </button>
                  </div>
                </>
              )}
            </Dropdown>
            <Button
              variant="secondary"
              icon={Plus}
              size="sm"
              onClick={() =>
                navigate(
                  activeDomain
                    ? `/mechanical-design/design-register/new?domain=${encodeURIComponent(activeDomain.label)}`
                    : '/mechanical-design/design-register/new',
                )
              }
            >
              New Design Item
            </Button>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <Select
              id="design-filter-project"
              label="Project"
              options={[
                { value: 'All', label: 'All Projects' },
                ...projects.map((project) => ({
                  value: project.id,
                  label: `${project.id} · ${project.name}`,
                })),
              ]}
              value={draftFilters.projectId}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))
              }
            />
            <Select
              id="design-filter-status"
              label="Design Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...DESIGN_STATUSES.map((status) => ({ value: status, label: status })),
              ]}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            />
            <Select
              id="design-filter-owner"
              label="Design Owner"
              options={[
                { value: 'All', label: 'All Owners' },
                ...ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
              ]}
              value={draftFilters.owner}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, owner: event.target.value }))
              }
            />
            <Select
              id="design-filter-priority"
              label="Priority"
              options={[
                { value: 'All', label: 'All Priorities' },
                ...PRIORITIES.map((priority) => ({ value: priority, label: priority })),
              ]}
              value={draftFilters.priority}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, priority: event.target.value }))
              }
            />
            <Select
              id="design-filter-revision"
              label="Revision"
              options={[
                { value: 'All', label: 'All Revisions' },
                ...REVISIONS.map((revision) => ({ value: revision, label: `Rev ${revision}` })),
              ]}
              value={draftFilters.revision}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, revision: event.target.value }))
              }
            />
            <div className="form-field">
              <label className="form-label" htmlFor="design-filter-from">
                Target Date From
              </label>
              <input
                id="design-filter-from"
                type="date"
                className="form-input"
                value={draftFilters.from}
                onChange={(event) =>
                  setDraftFilters((previous) => ({ ...previous, from: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="design-filter-to">
                Target Date To
              </label>
              <input
                id="design-filter-to"
                type="date"
                className="form-input"
                value={draftFilters.to}
                onChange={(event) =>
                  setDraftFilters((previous) => ({ ...previous, to: event.target.value }))
                }
              />
            </div>
            <div className="filter-actions">
              <Button
                onClick={() => {
                  setFilters(draftFilters);
                  setSelectedIds([]);
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
          recordHref={(row) => `/mechanical-design/design-register/${row.id}`}
          onRowClick={(row) => navigate(`/mechanical-design/design-register/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'View design', icon: Eye },
            { key: 'edit', label: 'Edit design', icon: Pencil },
            ...(row.status === 'Draft'
              ? [{ key: 'continue', label: 'Continue draft', icon: Stamp }]
              : []),
            ...(['Draft', 'In Design', 'Changes Requested'].includes(row.status)
              ? [{ key: 'submit', label: 'Submit for validation', icon: Send }]
              : []),
            { key: 'newRevision', label: 'Create revision', icon: GitBranch },
            ...(targetsFor('design', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Convert design', icon: ArrowRightLeft }]
              : []),
            { key: 'duplicate', label: 'Duplicate design', icon: Copy },
            { key: 'revisions', label: 'View revision history', icon: History },
            {
              key: 'archive',
              label: 'Archive design',
              icon: Archive,
              danger: true,
              divider: true,
            },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/mechanical-design/design-register/${row.id}`);
            if (key === 'edit' || key === 'continue')
              navigate(`/mechanical-design/design-register/${row.id}/edit`);
            if (key === 'submit') setSubmitTarget(row);
            if (key === 'newRevision') {
              setNewRevisionNote('');
              setNewRevisionTarget(row);
            }
            if (key === 'convert') openConversion('design', row);
            if (key === 'duplicate') {
              duplicateDesign(row.id);
              showToast(`${row.id} duplicated as a new draft.`);
            }
            if (key === 'revisions') setRevisionTarget(row);
            if (key === 'archive') setPendingArchive({ ids: [row.id], bulk: false });
          }}
          ariaLabel="Design register"
          emptyContent={
            <EmptyState
              icon={Filter}
              title="No Designs Found"
              message={
                domainFilter === 'all'
                  ? 'No designs match the current search or filter selection.'
                  : `No ${activeDomain?.label} designs match the current filters.`
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
        CAD references in this register are links to Drawing &amp; CAD Management ({'CAD-xxx'}).
        Design files and binaries are managed there, never in this module.
      </p>

      <Modal
        open={Boolean(pendingArchive)}
        onClose={() => setPendingArchive(null)}
        title={pendingArchive?.bulk ? 'Archive Selected Designs' : 'Archive Design'}
        subtitle={
          pendingArchive?.bulk
            ? `${pendingArchive.ids.length} record${pendingArchive.ids.length === 1 ? '' : 's'}`
            : pendingArchive?.ids[0]
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              icon={Archive}
              onClick={() => {
                archiveMany(pendingArchive.ids);
                setPendingArchive(null);
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Archived designs stay in the register with the Archived status and can still be viewed.
          Parts, assemblies and calculations are not changed.
        </p>
      </Modal>

      <Modal
        open={Boolean(submitTarget)}
        onClose={() => setSubmitTarget(null)}
        title="Submit design for validation"
        subtitle={submitTarget ? `${submitTarget.id} · ${submitTarget.name} · Rev ${submitTarget.revision}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Send}
              onClick={() => {
                submitDesignForValidation(submitTarget.id, submitTarget.engineer || submitTarget.owner);
                setSubmitTarget(null);
                showToast(`${submitTarget.id} submitted for validation.`);
              }}
            >
              Submit
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The design status changes to Submitted and the record is logged in the activity history.
          Nothing is approved or verified by this action — validation happens in Engineering
          Analysis, and simulation records stay linked to this design and revision.
        </p>
      </Modal>

      <Modal
        open={Boolean(newRevisionTarget)}
        onClose={() => setNewRevisionTarget(null)}
        title="Create design revision"
        subtitle={
          newRevisionTarget
            ? `${newRevisionTarget.id} · current Rev ${newRevisionTarget.revision}`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewRevisionTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={GitBranch}
              onClick={() => {
                const revision = createDesignRevision(newRevisionTarget.id, {
                  changeDescription: newRevisionNote.trim(),
                  preparedBy: newRevisionTarget.engineer || newRevisionTarget.owner,
                });
                setNewRevisionTarget(null);
                showToast(`${newRevisionTarget.id} moved to Rev ${revision}.`);
                navigate(`/mechanical-design/design-register/${newRevisionTarget.id}/edit`);
              }}
            >
              Create Revision
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          A new revision is added on top of the existing history and the design returns to In Design.
          Earlier revisions, linked parts, assemblies and calculations are never overwritten.
        </p>
        <div className="form-grid">
          <div className="form-grid-full">
            <label className="form-label" htmlFor="new-revision-note">
              Change Description
            </label>
            <textarea
              id="new-revision-note"
              className="form-textarea"
              rows={3}
              placeholder="What changes in this revision"
              value={newRevisionNote}
              onChange={(event) => setNewRevisionNote(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <RevisionHistoryModal
        open={Boolean(revisionTarget)}
        onClose={() => setRevisionTarget(null)}
        title={revisionTarget ? `Revision History · ${revisionTarget.id}` : undefined}
        subtitle={revisionTarget ? `${revisionTarget.name} · current Rev ${revisionTarget.revision}` : undefined}
        revisions={revisionTarget?.revisions || []}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
