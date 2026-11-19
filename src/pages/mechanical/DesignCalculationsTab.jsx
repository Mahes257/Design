import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Calculator,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Filter,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
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
  Textarea,
  Toolbar,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, formatDate } from '../../data/projectData';
import {
  CALCULATION_TYPES,
  CALC_STATUSES,
  DESIGN_DOMAIN_FILTERS,
  buildMechanicalKpis,
  linkedRecordLabel,
  projectName,
  statusTone,
} from '../../data/mechanicalData';
import exportCsv from '../../utils/exportCsv';
import { RevisionHistoryModal, Toast, useToast } from './mechanicalUi';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const EMPTY_FILTERS = {
  projectId: 'All',
  domain: 'All',
  calcType: 'All',
  preparedBy: 'All',
  status: 'All',
  from: '',
  to: '',
};

/* ==========================================================================
   Design Calculations — inputs, assumptions, results and verification.
   ========================================================================== */
export default function DesignCalculationsTab() {
  const navigate = useNavigate();
  const {
    calculations,
    parts,
    assemblies,
    designs,
    duplicateCalculation,
    archiveCalculation,
    updateCalculation,
    verifyCalculation,
  } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decision, setDecision] = useState('Verified');
  const [decisionComment, setDecisionComment] = useState('');

  const rows = useMemo(
    () =>
      calculations.map((calculation) => ({
        ...calculation,
        projectName: projectName(projects, calculation.projectId),
        linkedLabel: linkedRecordLabel(calculation, parts, assemblies, designs),
      })),
    [calculations, projects, parts, assemblies, designs],
  );

  const kpis = useMemo(() => {
    const summary = buildMechanicalKpis({
      designs: [],
      parts: [],
      assemblies: [],
      calculations: rows,
    }).calculations;
    return [
      { key: 'total', label: 'Total Calculations', value: String(summary.total), sub: 'Across every discipline', icon: Calculator, tone: 'teal' },
      { key: 'draft', label: 'Draft Calculations', value: String(summary.draft), sub: 'Not submitted yet', icon: Pencil, tone: 'gray' },
      { key: 'pending', label: 'Pending Verification', value: String(summary.pending), sub: 'Waiting on the verifier', icon: Send, tone: 'orange' },
      { key: 'verified', label: 'Verified Calculations', value: String(summary.verified), sub: 'Checked and accepted', icon: ShieldCheck, tone: 'emerald' },
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
      if (filters.domain !== 'All' && row.domain !== filters.domain) return false;
      if (filters.calcType !== 'All' && row.calcType !== filters.calcType) return false;
      if (filters.preparedBy !== 'All' && row.preparedBy !== filters.preparedBy) return false;
      if (filters.status !== 'All' && row.verificationStatus !== filters.status) return false;
      if (filters.from && row.calcDate < filters.from) return false;
      if (filters.to && row.calcDate > filters.to) return false;
      if (!query) return true;
      return [row.id, row.title, row.projectName, row.domain, row.calcType, row.linkedLabel]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search, filters]);

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

  const columns = [
    {
      key: 'id',
      label: 'Calculation ID',
      sortable: true,
      width: 100,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'title',
      label: 'Calculation Title',
      sortable: true,
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
      width: 116,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    {
      key: 'domain',
      label: 'Domain',
      sortable: true,
      width: 104,
      render: (row) => <span className="chip chip-mint">{row.domain}</span>,
    },
    {
      key: 'linkedLabel',
      label: 'Part / Assembly',
      width: 112,
      render: (row) => (
        <span className="cell-muted cell-clamp" title={row.linkedLabel}>
          {row.linkedLabel}
        </span>
      ),
    },
    {
      key: 'calcType',
      label: 'Calculation Type',
      sortable: true,
      width: 116,
      render: (row) => <span className="mech-type-chip">{row.calcType}</span>,
    },
    { key: 'preparedBy', label: 'Prepared By', width: 90 },
    { key: 'revision', label: 'Rev', width: 60, align: 'center', render: (row) => `Rev ${row.revision}` },
    {
      key: 'calcDate',
      label: 'Calc Date',
      sortable: true,
      width: 86,
      render: (row) => <span className="cell-muted">{formatDate(row.calcDate)}</span>,
    },
    {
      key: 'verificationStatus',
      label: 'Verification',
      width: 108,
      render: (row) => (
        <StatusBadge status={row.verificationStatus} tone={statusTone(row.verificationStatus)} />
      ),
    },
  ];

  const csvColumns = [
    { key: 'id', label: 'Calculation ID' },
    { key: 'title', label: 'Calculation Title' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectName', label: 'Project', value: (row) => projectName(projects, row.projectId) },
    { key: 'domain', label: 'Domain' },
    { key: 'calcType', label: 'Calculation Type' },
    { key: 'linkedId', label: 'Part / Assembly' },
    { key: 'preparedBy', label: 'Prepared By' },
    { key: 'verifiedBy', label: 'Verified By' },
    { key: 'revision', label: 'Revision' },
    { key: 'calcDate', label: 'Calculation Date', value: (row) => formatDate(row.calcDate) },
    { key: 'verificationStatus', label: 'Verification Status' },
  ];

  const openDecision = (row, initial) => {
    setDecisionTarget(row);
    setDecision(initial);
    setDecisionComment('');
  };

  const applyDecision = () => {
    if (!decisionTarget) return;
    verifyCalculation(decisionTarget.id, decision, decisionComment, 'Design Admin');
    showToast(`${decisionTarget.id} marked ${decision.toLowerCase()}.`);
    setDecisionTarget(null);
    setDecisionComment('');
  };

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
              id="calc-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search calculation, type, engineer..."
              ariaLabel="Search calculations"
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
                    exportCsv('mechanical-calculations', csvColumns, sortedRows);
                    close();
                  }}
                >
                  Export CSV
                </DropdownItem>
              )}
            </Dropdown>
            <Button
              variant="secondary"
              icon={Plus}
              size="sm"
              onClick={() => navigate('/mechanical-design/design-calculations/new')}
            >
              New Calculation
            </Button>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <Select
              id="calc-filter-project"
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
              id="calc-filter-domain"
              label="Engineering Domain"
              options={DESIGN_DOMAIN_FILTERS.map((domain) => ({
                value: domain.key === 'all' ? 'All' : domain.label,
                label: domain.label,
              }))}
              value={draftFilters.domain}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, domain: event.target.value }))
              }
            />
            <Select
              id="calc-filter-type"
              label="Calculation Type"
              options={[
                { value: 'All', label: 'All Types' },
                ...CALCULATION_TYPES.map((type) => ({ value: type, label: type })),
              ]}
              value={draftFilters.calcType}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, calcType: event.target.value }))
              }
            />
            <Select
              id="calc-filter-prepared"
              label="Prepared By"
              options={[
                { value: 'All', label: 'All Engineers' },
                ...ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
              ]}
              value={draftFilters.preparedBy}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, preparedBy: event.target.value }))
              }
            />
            <Select
              id="calc-filter-status"
              label="Verification Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...CALC_STATUSES.map((status) => ({ value: status, label: status })),
              ]}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            />
            <div className="form-field">
              <label className="form-label" htmlFor="calc-filter-from">
                Date From
              </label>
              <input
                id="calc-filter-from"
                type="date"
                className="form-input"
                value={draftFilters.from}
                onChange={(event) =>
                  setDraftFilters((previous) => ({ ...previous, from: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="calc-filter-to">
                Date To
              </label>
              <input
                id="calc-filter-to"
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
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          recordHref={(row) => `/mechanical-design/design-calculations/${row.id}`}
          onRowClick={(row) => navigate(`/mechanical-design/design-calculations/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'View calculation', icon: Eye },
            { key: 'edit', label: 'Edit calculation', icon: Pencil },
            { key: 'duplicate', label: 'Duplicate calculation', icon: Copy },
            ...(['Draft', 'Changes Requested', 'Rejected'].includes(row.verificationStatus)
              ? [{ key: 'submit', label: 'Submit for verification', icon: Send }]
              : []),
            ...(row.verificationStatus === 'Pending Verification'
              ? [
                  { key: 'approve', label: 'Approve verification', icon: CheckCircle2 },
                  { key: 'reject', label: 'Reject verification', icon: X },
                ]
              : []),
            { key: 'revisions', label: 'View revision history', icon: History },
            {
              key: 'archive',
              label: 'Archive calculation',
              icon: Archive,
              danger: true,
              divider: true,
            },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/mechanical-design/design-calculations/${row.id}`);
            if (key === 'edit')
              navigate(`/mechanical-design/design-calculations/${row.id}/edit`);
            if (key === 'duplicate') {
              duplicateCalculation(row.id);
              showToast(`${row.id} duplicated as a new draft.`);
            }
            if (key === 'submit') {
              updateCalculation(row.id, { verificationStatus: 'Pending Verification' });
              showToast(`${row.id} submitted for verification.`);
            }
            if (key === 'approve') openDecision(row, 'Verified');
            if (key === 'reject') openDecision(row, 'Rejected');
            if (key === 'revisions') setRevisionTarget(row);
            if (key === 'archive') setPendingArchive(row);
          }}
          ariaLabel="Calculation register"
          emptyContent={
            <EmptyState
              icon={Calculator}
              title="No Calculations Found"
              message="No calculations match the current search or filter selection."
              action={
                hasFilters && (
                  <Button variant="ghost" icon={X} onClick={resetAll}>
                    Clear Filters
                  </Button>
                )
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
        The register records inputs, method references, assumptions and results for review. It does
        not run simulations and does not replace dedicated engineering calculation software.
      </p>

      <Modal
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Verification Decision"
        subtitle={decisionTarget ? `${decisionTarget.id} · ${decisionTarget.title}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionTarget(null)}>
              Cancel
            </Button>
            <Button icon={ShieldCheck} onClick={applyDecision}>
              Record {decision}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            id="calc-decision"
            label="Decision"
            options={[
              { value: 'Verified', label: 'Verified' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'Changes Requested', label: 'Changes Requested' },
            ]}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
          />
          <div className="form-grid-full">
            <Textarea
              id="calc-decision-comment"
              label="Verification Comment"
              rows={3}
              placeholder="What was checked, and any condition attached to the decision"
              value={decisionComment}
              onChange={(event) => setDecisionComment(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingArchive)}
        onClose={() => setPendingArchive(null)}
        title="Archive Calculation"
        subtitle={pendingArchive ? `${pendingArchive.id} · ${pendingArchive.title}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              icon={Archive}
              onClick={() => {
                archiveCalculation(pendingArchive.id);
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
          The calculation keeps its verification trail and revision history, and is marked
          Superseded in the register.
        </p>
      </Modal>

      <RevisionHistoryModal
        open={Boolean(revisionTarget)}
        onClose={() => setRevisionTarget(null)}
        title={revisionTarget ? `Revision History · ${revisionTarget.id}` : undefined}
        subtitle={revisionTarget ? `${revisionTarget.title} · current Rev ${revisionTarget.revision}` : undefined}
        revisions={revisionTarget?.revisions || []}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
