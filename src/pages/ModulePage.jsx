import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Download,
  Eye,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  DataTable,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
  KpiGrid,
  Modal,
  ModuleTabs,
  PageHeader,
  PageLayout,
  Pagination,
  SearchInput,
  SegmentedTabs,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  Toolbar,
} from '../components/common';
import { DASHBOARD, findModule, findModuleTab, normalizePath } from '../config/navigation';
import {
  buildModuleKpis,
  buildModuleRows,
  buildOwnerOptions,
  buildStatusOptions,
  buildViewerMeta,
} from '../data/mockDesignData';
import exportCsv from '../utils/exportCsv';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const SEGMENT_KEYS = ['In Design', 'In Review', 'Approved'];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ==========================================================================
   Module page — breadcrumb, module header, horizontal submodule tabs and the
   selected submodule's content in the same workspace.
   ========================================================================== */
export default function ModulePage() {
  const { pathname } = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const module = findModule(pathname);
  const tab = module ? findModuleTab(module, pathname) : null;

  // Unknown module or submodule URLs fall back to a real workspace rather than
  // rendering an empty shell.
  if (!module) return <Navigate to={DASHBOARD.path} replace />;
  if (!tab) return <Navigate to={module.base} replace />;

  const kpis = buildModuleKpis(module, tab);
  const contentKind = tab.kind === 'form' || tab.kind === 'viewer' ? tab.kind : 'list';
  const isBaseTab = normalizePath(pathname) === module.base;

  const crumbs = [
    { label: 'Dashboard', to: DASHBOARD.path },
    isBaseTab ? { label: module.label } : { label: module.label, to: module.base },
    ...(isBaseTab ? [] : [{ label: tab.label }]),
  ];

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={module.icon}
          title={module.label}
          subtitle={module.description}
          actions={
            <>
              <span className="chip chip-mint">Shell preview</span>
              <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                {module.cta}
              </Button>
            </>
          }
        />
      }
      tabs={<ModuleTabs module={module} activeTab={tab} />}
    >
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard key={kpi.key} icon={kpi.icon} label={kpi.label} value={kpi.value} tone={kpi.tone} />
        ))}
      </KpiGrid>

      <p className="page-subtitle" style={{ margin: '0 0 14px' }}>
        {tab.label} · sample workspace data for the {module.label} module
      </p>

      {contentKind === 'viewer' && <ViewerWorkspace module={module} tab={tab} />}
      {contentKind === 'form' && <FormWorkspace module={module} tab={tab} />}
      {contentKind === 'list' && <ListWorkspace key={tab.key} module={module} tab={tab} />}

      <CreateRecordModal open={createOpen} onClose={() => setCreateOpen(false)} module={module} />
    </PageLayout>
  );
}

/* ==========================================================================
   List submodule — segmented status filter, toolbar, filters and table.
   ========================================================================== */
function ListWorkspace({ module, tab }) {
  const rows = useMemo(() => buildModuleRows(module, tab), [module, tab]);
  const [segment, setSegment] = useState('All');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ status: 'All', owner: 'All' });
  const [filters, setFilters] = useState({ status: 'All', owner: 'All' });
  const [sortKey, setSortKey] = useState('due');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleKeys, setVisibleKeys] = useState(['id', 'title', 'owner', 'due', 'status']);
  const [detail, setDetail] = useState(null);

  const statusOptions = useMemo(() => buildStatusOptions(rows), [rows]);
  const ownerOptions = useMemo(() => buildOwnerOptions(rows), [rows]);

  const allColumns = useMemo(
    () => [
      {
        key: 'id',
        label: 'Reference',
        sortable: true,
        width: 130,
        render: (row) => <span className="cell-id">{row.id}</span>,
      },
      {
        key: 'title',
        label: 'Item',
        sortable: true,
        render: (row) => <span className="cell-strong">{row.title}</span>,
      },
      { key: 'owner', label: 'Owner' },
      {
        key: 'due',
        label: 'Due Date',
        sortable: true,
        width: 130,
        render: (row) => <span className="cell-muted">{formatDate(row.due)}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        width: 150,
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  const columns = allColumns.filter((column) => visibleKeys.includes(column.key));

  const segments = [
    { key: 'All', label: 'All', count: rows.length },
    ...SEGMENT_KEYS.map((key) => ({
      key,
      label: key,
      count: rows.filter((row) => row.status === key).length,
    })),
  ];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (segment !== 'All' && row.status !== segment) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (filters.owner !== 'All' && row.owner !== filters.owner) return false;
      if (!query) return true;
      return [row.id, row.title, row.owner, row.status].join(' ').toLowerCase().includes(query);
    });
  }, [rows, segment, filters, search]);

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
    Boolean(search) || segment !== 'All' || filters.status !== 'All' || filters.owner !== 'All';

  const resetAll = () => {
    setSearch('');
    setSegment('All');
    setFilters({ status: 'All', owner: 'All' });
    setDraftFilters({ status: 'All', owner: 'All' });
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

  return (
    <>
      <SegmentedTabs
        items={segments}
        activeKey={segment}
        onChange={(key) => {
          setSegment(key);
          setSelectedIds([]);
          setPage(1);
        }}
        ariaLabel={`${tab.label} status`}
      />

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
          </>
        }
        right={
          <>
            <SearchInput
              id={`${module.key}-${tab.key}-search`}
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={`Search ${tab.label.toLowerCase()}...`}
              ariaLabel={`Search ${tab.label}`}
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
                    exportCsv(`${module.key}-${tab.key}`, columns, sortedRows);
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
                  {allColumns.map((column) => (
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
                    <button type="button" onClick={() => setVisibleKeys(allColumns.map((c) => c.key))}>
                      Show all
                    </button>
                    <button type="button" onClick={() => setVisibleKeys(['id'])}>
                      Hide all
                    </button>
                  </div>
                </>
              )}
            </Dropdown>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <Select
              id={`${module.key}-${tab.key}-status`}
              label="Status"
              options={statusOptions}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            />
            <Select
              id={`${module.key}-${tab.key}-owner`}
              label="Owner"
              options={ownerOptions}
              value={draftFilters.owner}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, owner: event.target.value }))
              }
            />
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
                  setDraftFilters({ status: 'All', owner: 'All' });
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
          selectable
          selectedIds={selectedIds}
          onSelectAll={(checked) => setSelectedIds(checked ? pageRows.map((row) => row.id) : [])}
          onToggleRow={toggleRow}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          rowActions={() => [{ key: 'view', label: 'View record', icon: Eye }]}
          onRowAction={(key, row) => {
            if (key === 'view') setDetail(row);
          }}
          ariaLabel={tab.label}
          emptyContent={
            <EmptyState
              icon={module.icon}
              title={`No ${tab.label} records`}
              message="No records match the current search, status or owner filters."
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

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.title || tab.label}
        subtitle={detail ? `${detail.id} · ${module.label}` : undefined}
        maxWidth="max-w-lg"
        footer={
          <Button variant="ghost" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <dl className="detail-list">
            <div>
              <dt>Reference</dt>
              <dd>{detail.id}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>{detail.owner}</dd>
            </div>
            <div>
              <dt>Discipline</dt>
              <dd>{detail.discipline}</dd>
            </div>
            <div>
              <dt>Revision</dt>
              <dd>{detail.revision}</dd>
            </div>
            <div>
              <dt>Due Date</dt>
              <dd>{formatDate(detail.due)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={detail.status} />
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </>
  );
}

/* ==========================================================================
   Viewer submodule — CAD workspace placeholder with drawing metadata.
   ========================================================================== */
function ViewerWorkspace({ module, tab }) {
  const meta = buildViewerMeta(module, tab);
  const ViewerIcon = tab.key === '3d-viewer' ? Box : Layers;

  return (
    <Card className="viewer-card" bodyClassName="p-0">
      <div className="viewer-toolbar">
        <span className="viewer-title">{tab.label}</span>
        <span className="chip chip-mint">Viewer placeholder</span>
        <span className="chip">{module.label}</span>
      </div>
      <div className="viewer-frame">
        <ViewerIcon aria-hidden="true" />
        <strong>{tab.label}</strong>
        <span>The CAD viewing workspace arrives with the Drawing &amp; CAD module build.</span>
      </div>
      <dl className="viewer-meta detail-list">
        {meta.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/* ==========================================================================
   Form submodule — creation form layout (frontend only).
   ========================================================================== */
function FormWorkspace({ module, tab }) {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card title={tab.label} subtitle={`${module.label} · intake form`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <p className="form-note">
          Frontend-only preview — records are not persisted until this module is built.
        </p>

        <div className="form-grid">
          <Input id="np-name" label="Project name" placeholder="e.g. Conveyor Drive Assembly" />
          <Input id="np-code" label="Project code" placeholder="PRJ-2026-014" />
          <Select
            id="np-discipline"
            label="Primary discipline"
            defaultValue="Mechanical"
            options={[
              { value: 'Mechanical', label: 'Mechanical' },
              { value: 'Sheet Metal', label: 'Sheet Metal' },
              { value: 'Piping', label: 'Piping' },
              { value: 'Analysis', label: 'Analysis' },
            ]}
          />
          <Input id="np-owner" label="Lead designer" defaultValue="Design Admin" />
          <Input id="np-client" label="Client" placeholder="Client name" />
          <Input id="np-date" label="Target completion" type="date" defaultValue="2026-12-15" />
          <div className="form-grid-full">
            <Textarea
              id="np-scope"
              label="Scope"
              rows={3}
              placeholder="Deliverables, applicable standards and design constraints"
            />
          </div>
        </div>

        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={() => navigate(module.base)}>
            Cancel
          </Button>
          <Button type="submit" icon={Plus}>
            Create Project
          </Button>
        </div>

        {submitted && (
          <p className="form-success" role="status">
            Preview only — this form is not wired to a backend in the current build.
          </p>
        )}
      </form>
    </Card>
  );
}

/* ==========================================================================
   Header primary action — quick create dialog shared by every module.
   ========================================================================== */
function CreateRecordModal({ open, onClose, module }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={module.cta}
      subtitle={`${module.label} · quick create`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Plus} onClick={onClose}>
            Create
          </Button>
        </>
      }
    >
      <p className="form-note">Frontend-only shell — nothing is saved.</p>
      <div className="form-grid">
        <Input id="cr-name" label="Name" placeholder={`New ${module.label.toLowerCase()} record`} />
        <Input id="cr-owner" label="Owner" defaultValue="Design Admin" />
        <Input id="cr-due" label="Due date" type="date" />
        <Select
          id="cr-status"
          label="Status"
          defaultValue="In Design"
          options={[
            { value: 'In Design', label: 'In Design' },
            { value: 'In Review', label: 'In Review' },
            { value: 'Approved', label: 'Approved' },
          ]}
        />
      </div>
    </Modal>
  );
}
