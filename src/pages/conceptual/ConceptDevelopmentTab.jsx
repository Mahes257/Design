import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  CopyPlus,
  Download,
  Eye,
  Filter,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  Trophy,
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
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import { usePlanning } from '../../context/PlanningContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import {
  CONCEPT_STATUSES,
  DESIGN_APPROACHES,
  buildConceptKpis,
  conceptReviewStatus,
  conceptSelectionStatus,
  conceptStatusTone,
  formatDate,
  projectLabel,
  reviewStatusTone,
  revisionCopy,
} from '../../data/conceptData';
import exportCsv from '../../utils/exportCsv';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const EMPTY_FILTERS = { projectId: 'All', status: 'All', approach: 'All' };

/* ==========================================================================
   Concept Register — every design concept developed under a project.
   ========================================================================== */
export default function ConceptDevelopmentTab() {
  const navigate = useNavigate();
  const { concepts, comparisons, addConcept, nextConceptId, removeConcept } = useConcept();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { plans } = usePlanning();

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingRevision, setPendingRevision] = useState(null);

  const project = (id) => projects.find((row) => row.id === id);
  const projectName = (id) => project(id)?.name || 'Unassigned';

  const rows = useMemo(
    () =>
      concepts.map((concept) => {
        const linkedPlan =
          plans.find((plan) => plan.id === concept.designPlanId) ||
          plans.find((plan) => plan.projectId === concept.projectId);
        return {
          ...concept,
          projectName: projectName(concept.projectId),
          designPlanId: concept.designPlanId || linkedPlan?.id || '',
          owner: concept.owner || concept.createdBy,
          reviewStatus: conceptReviewStatus(concept),
          selectionStatus: conceptSelectionStatus(
            concept,
            comparisons.find((row) => row.projectId === concept.projectId),
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [concepts, projects, plans, comparisons],
  );

  const kpis = useMemo(() => {
    const summary = buildConceptKpis(rows);
    return [
      {
        key: 'total',
        label: 'Total Concepts',
        value: String(summary.total),
        sub: `Across ${summary.projects} projects`,
        icon: Lightbulb,
        tone: 'teal',
      },
      {
        key: 'evaluation',
        label: 'Under Evaluation',
        value: String(summary.evaluation),
        sub: 'In development, evaluation or shortlist',
        icon: Filter,
        tone: 'purple',
      },
      {
        key: 'selected',
        label: 'Selected Concepts',
        value: String(summary.selected),
        sub: 'Linked to mechanical engineering design',
        icon: Lightbulb,
        tone: 'emerald',
      },
      {
        key: 'projects',
        label: 'Projects with Concepts',
        value: String(summary.projects),
        sub: 'Concept development started',
        icon: Lightbulb,
        tone: 'blue',
      },
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (filters.approach !== 'All' && row.approach !== filters.approach) return false;
      if (!query) return true;
      return [row.id, row.name, row.projectName, row.approach, row.createdBy, row.status]
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
      label: 'Concept ID',
      sortable: true,
      width: 104,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'projectId',
      label: 'Project ID',
      sortable: true,
      width: 138,
      render: (row) => (
        <Link className="cell-id" to={`/projects/all-projects/${row.projectId}`}>
          {row.projectId}
        </Link>
      ),
    },
    {
      key: 'projectName',
      label: 'Project Name',
      sortable: true,
      width: 175,
      render: (row) => (
        <span className="cell-muted cell-clamp" title={row.projectName}>
          {row.projectName}
        </span>
      ),
    },
    {
      key: 'designPlanId',
      label: 'Design Plan ID',
      width: 122,
      render: (row) =>
        row.designPlanId ? (
          <Link
            className="cell-id"
            to={`/design-planning/design-plans/${row.designPlanId}/edit`}
          >
            {row.designPlanId}
          </Link>
        ) : (
          <span className="cell-muted">No plan</span>
        ),
    },
    {
      key: 'name',
      label: 'Concept Name',
      sortable: true,
      width: 180,
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'productCategory',
      label: 'Product / Machine Category',
      sortable: true,
      width: 175,
      render: (row) => <span className="cell-clamp">{row.productCategory}</span>,
    },
    {
      key: 'approach',
      label: 'Design Approach',
      sortable: true,
      width: 150,
      render: (row) => <span className="chip chip-mint">{row.approach}</span>,
    },
    {
      key: 'revision',
      label: 'Revision',
      width: 80,
      render: (row) => <span className="chip chip-mint">Rev {row.revision}</span>,
    },
    { key: 'owner', label: 'Concept Owner', sortable: true, width: 120 },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      width: 96,
      render: (row) => <span className="cell-muted">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'reviewStatus',
      label: 'Review Status',
      width: 150,
      render: (row) => (
        <StatusBadge status={row.reviewStatus} tone={reviewStatusTone(row.reviewStatus)} />
      ),
    },
    {
      key: 'selectionStatus',
      label: 'Selection Status',
      width: 165,
      render: (row) => <span className="cell-muted">{row.selectionStatus}</span>,
    },
    {
      key: 'status',
      label: 'Concept Status',
      width: 130,
      render: (row) => <StatusBadge status={row.status} tone={conceptStatusTone(row.status)} />,
    },
  ];

  const csvColumns = [
    { key: 'id', label: 'Concept ID' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectName', label: 'Project' },
    { key: 'name', label: 'Concept Name' },
    { key: 'productCategory', label: 'Product / Machine Category' },
    { key: 'approach', label: 'Design Approach' },
    { key: 'revision', label: 'Revision' },
    { key: 'designPlanId', label: 'Design Plan ID' },
    { key: 'owner', label: 'Concept Owner' },
    { key: 'createdAt', label: 'Created On', value: (row) => formatDate(row.createdAt) },
    { key: 'reviewStatus', label: 'Review Status' },
    { key: 'selectionStatus', label: 'Selection Status' },
    { key: 'status', label: 'Concept Status' },
  ];

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
              id="concept-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search concept, project, approach..."
              ariaLabel="Search concepts"
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
                    exportCsv('concepts', csvColumns, sortedRows);
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
              onClick={() => navigate('/conceptual-design/concept-creation')}
            >
              New Concept
            </Button>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <Select
              id="concept-filter-project"
              label="Project"
              options={[
                { value: 'All', label: 'All Projects' },
                ...projects.map((row) => ({ value: row.id, label: projectLabel(row) })),
              ]}
              value={draftFilters.projectId}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))
              }
            />
            <Select
              id="concept-filter-status"
              label="Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...CONCEPT_STATUSES.map((status) => ({ value: status, label: status })),
              ]}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            />
            <Select
              id="concept-filter-approach"
              label="Design Approach"
              options={[
                { value: 'All', label: 'All Approaches' },
                ...DESIGN_APPROACHES.map((approach) => ({ value: approach, label: approach })),
              ]}
              value={draftFilters.approach}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, approach: event.target.value }))
              }
            />
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
          className="concept-register-table"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          recordHref={(row) =>
            `/conceptual-design/concept-details?concept=${encodeURIComponent(row.id)}`
          }
          onRowClick={(row) =>
            navigate(`/conceptual-design/concept-details?concept=${encodeURIComponent(row.id)}`)
          }
          rowActions={(row) => [
            { key: 'view', label: 'View concept details', icon: Eye },
            { key: 'edit', label: 'Edit concept', icon: Pencil },
            { key: 'revision', label: 'Duplicate as new revision', icon: CopyPlus },
            { key: 'compare', label: 'Compare alternatives', icon: Scale, divider: true },
            { key: 'select', label: 'Select concept', icon: Trophy },
            ...(targetsFor('concept', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Open mechanical design', icon: ArrowRightLeft }]
              : []),
            { key: 'delete', label: 'Delete concept', icon: Trash2, danger: true, divider: true },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') {
              navigate(`/conceptual-design/concept-details?concept=${encodeURIComponent(row.id)}`);
            }
            if (key === 'edit') navigate(`/conceptual-design/concept-creation/${row.id}/edit`);
            if (key === 'revision') setPendingRevision(row);
            if (key === 'compare')
              navigate(
                `/conceptual-design/concept-details?concept=${encodeURIComponent(row.id)}&view=comparison`,
              );
            if (key === 'select')
              navigate(
                `/conceptual-design/concept-details?concept=${encodeURIComponent(row.id)}&view=selection`,
              );
            if (key === 'convert') openConversion('concept', row);
            if (key === 'delete') setPendingDelete(row);
          }}
          ariaLabel="Concept register"
          emptyContent={
            <EmptyState
              icon={Lightbulb}
              title="No Concepts Found"
              message="No concepts match the current search or filter selection. Create one with New Concept."
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

      <Modal
        open={Boolean(pendingRevision)}
        onClose={() => setPendingRevision(null)}
        title="Duplicate as New Revision"
        subtitle={pendingRevision ? `${pendingRevision.id} · Rev ${pendingRevision.revision}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRevision(null)}>
              Cancel
            </Button>
            <Button
              icon={CopyPlus}
              onClick={() => {
                const source = pendingRevision;
                const copy = revisionCopy(source, nextConceptId());
                addConcept(copy);
                setPendingRevision(null);
                navigate(`/conceptual-design/concept-creation/${copy.id}/edit`);
              }}
            >
              Create Revision
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          A new concept record is created with its own Concept ID and the next revision letter.
          The original concept, its review history and any recorded selection stay unchanged.
        </p>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Concept"
        subtitle={pendingDelete ? `${pendingDelete.id} · ${pendingDelete.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                if (pendingDelete) removeConcept(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The concept is removed from this register. Reviews and comparison records that already
          reference it keep their stored history.
        </p>
      </Modal>
    </>
  );
}
