import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Filter,
  FolderKanban,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  Button,
  DataTable,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
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
import { useProjects } from '../../context/ProjectsContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import { currentStageLabel, customerOrDepartment } from '../../data/projectConversion';
import {
  ENGINEERS,
  PROJECT_DOMAINS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  formatDate,
  projectIsActive,
  projectIsDelayed,
  projectStatusTone,
  TODAY,
} from '../../data/projectData';
import exportCsv from '../../utils/exportCsv';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const CPR_STATUSES = ['Not Started', 'Draft', 'Submitted for Review', 'Approved', 'On Hold'];

const EMPTY_FILTERS = {
  status: 'All',
  domain: 'All',
  manager: 'All',
  priority: 'All',
  from: '',
  to: '',
};

export default function AllProjectsTab() {
  const navigate = useNavigate();
  const { projects, updateProject, duplicateProject, archiveProject, deleteProject } = useProjects();
  const { targetsFor, openConversion } = useWorkflowConversions();

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState('target');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeProjects = projects.filter((project) => !project.archived);
  const archivedCount = projects.filter((project) => project.archived).length;

  const kpis = [
    {
      key: 'total',
      label: 'Total Projects',
      value: String(activeProjects.length),
      sub: 'In the project register',
      icon: FolderKanban,
      tone: 'teal',
    },
    {
      key: 'active',
      label: 'Active Projects',
      value: String(activeProjects.filter(projectIsActive).length),
      sub: 'In planning, design or review',
      icon: Activity,
      tone: 'blue',
    },
    {
      key: 'delayed',
      label: 'Delayed Projects',
      value: String(activeProjects.filter(projectIsDelayed).length),
      sub: 'Past planned milestones',
      icon: TriangleAlert,
      tone: 'red',
    },
    {
      key: 'completed',
      label: 'Completed Projects',
      value: String(activeProjects.filter((project) => project.status === 'Completed').length),
      sub: 'Closed and handed over',
      icon: CheckCircle2,
      tone: 'emerald',
    },
  ];

  const managers = useMemo(
    () => [...new Set(activeProjects.map((project) => project.manager))].sort(),
    [activeProjects],
  );

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: 'Project ID',
        sortable: true,
        width: 132,
        render: (row) => <span className="cell-id">{row.id}</span>,
      },
      {
        key: 'name',
        label: 'Project Name',
        sortable: true,
        width: 230,
        render: (row) => (
          <span className="cell-strong">
            {row.name}
            {row.archived && <span className="chip chip-archived">Archived</span>}
          </span>
        ),
      },
      {
        key: 'sourceRequestId',
        label: 'Source Request ID',
        sortable: true,
        width: 140,
        render: (row) =>
          row.sourceRequestId ? (
            <Link className="qr-inline-link" to={`/customer-sales/requests/${row.sourceRequestId}`}>
              {row.sourceRequestId}
            </Link>
          ) : (
            <span className="cell-muted">Manual</span>
          ),
      },
      {
        key: 'customer',
        label: 'Customer / Department',
        width: 190,
        render: (row) => (
          <span className="cell-strong">{customerOrDepartment(row)}</span>
        ),
      },
      { key: 'product', label: 'Product / Machine', width: 190 },
      {
        key: 'type',
        label: 'Project Type',
        sortable: true,
        width: 165,
        render: (row) => <span className="chip chip-mint">{row.type || 'New Design'}</span>,
      },
      { key: 'manager', label: 'Project Manager', width: 150 },
      {
        key: 'start',
        label: 'Start Date',
        sortable: true,
        width: 118,
        render: (row) => <span className="cell-muted">{formatDate(row.start)}</span>,
      },
      {
        key: 'target',
        label: 'Target Date',
        sortable: true,
        width: 122,
        render: (row) => (
          <span
            className={`cell-muted${
              row.target < TODAY && row.status !== 'Completed' ? ' is-overdue' : ''
            }`}
          >
            {formatDate(row.target)}
          </span>
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        width: 96,
        render: (row) => (
          <span className={`priority-pill priority-${row.priority.toLowerCase()}`}>{row.priority}</span>
        ),
      },
      {
        key: 'progress',
        label: 'Progress',
        sortable: true,
        width: 152,
        render: (row) => (
          <span className="progress-cell">
            <span className="progress-track">
              <span
                className={`progress-fill tone-${
                  row.status === 'Completed'
                    ? 'green'
                    : row.status === 'Cancelled' || row.status === 'On Hold'
                      ? 'gray'
                      : projectIsDelayed(row)
                        ? 'red'
                        : 'teal'
                }`}
                style={{ width: `${row.progress}%` }}
              />
            </span>
            <span className="progress-value">{row.progress}%</span>
          </span>
        ),
      },
      {
        key: 'stage',
        label: 'Current Stage',
        width: 210,
        render: (row) => (
          <span className="project-stage-cell">{currentStageLabel(row)}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 178,
        render: (row) => <StatusBadge status={row.status} tone={projectStatusTone(row.status)} />,
      },
    ],
    [],
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (project.archived !== showArchived) return false;
      if (filters.status !== 'All' && project.status !== filters.status) return false;
      if (filters.domain !== 'All' && project.domain !== filters.domain) return false;
      if (filters.manager !== 'All' && project.manager !== filters.manager) return false;
      if (filters.priority !== 'All' && project.priority !== filters.priority) return false;
      if (filters.from && project.target < filters.from) return false;
      if (filters.to && project.target > filters.to) return false;
      if (!query) return true;
      return [
        project.id,
        project.name,
        project.customer,
        project.product,
        project.domain,
        project.manager,
        project.status,
        project.sourceRequestId,
        project.sourceRequestRequester,
        project.department,
        project.type,
        project.sourceEnquiryId,
        project.sourceQuotationId,
        project.cprReference,
        project.cprOwner,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [projects, search, filters, showArchived]);

  const sortedProjects = useMemo(() => {
    const rows = [...filteredProjects];
    rows.sort((left, right) => {
      const a = String(left[sortKey] ?? '');
      const b = String(right[sortKey] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return rows;
  }, [filteredProjects, sortKey, sortDirection]);

  const totalCount = sortedProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;

  const hasFilters =
    Boolean(search) ||
    Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key]);

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

  const startEdit = (project) => {
    setEditing(project);
    setEditDraft({
      name: project.name,
      customer: project.customer,
      product: project.product,
      domain: project.domain,
      manager: project.manager,
      priority: project.priority,
      start: project.start,
      target: project.target,
      progress: String(project.progress),
      status: project.status,
      sourceEnquiryId: project.sourceEnquiryId || '',
      sourceQuotationId: project.sourceQuotationId || '',
      cprReference: project.cprReference || '',
      cprStatus: project.cprStatus || 'Not Started',
      cprOwner: project.cprOwner || '',
      cprReviewDate: project.cprReviewDate || '',
      cprNotes: project.cprNotes || '',
    });
  };

  const saveEdit = (event) => {
    event.preventDefault();
    if (!editing || !editDraft) return;
    updateProject(editing.id, {
      ...editDraft,
      progress: Number(editDraft.progress) || 0,
      delayed: editDraft.status !== 'Completed' && editDraft.target < TODAY,
    });
    setEditing(null);
    setEditDraft(null);
  };

  const csvColumns = [
    { key: 'id', label: 'Project ID' },
    { key: 'name', label: 'Project Name' },
    { key: 'customer', label: 'Customer' },
    { key: 'product', label: 'Product / Machine' },
    { key: 'domain', label: 'Engineering Domain' },
    { key: 'manager', label: 'Project Manager' },
    { key: 'start', label: 'Start Date', value: (row) => formatDate(row.start) },
    { key: 'target', label: 'Target Date', value: (row) => formatDate(row.target) },
    { key: 'priority', label: 'Priority' },
    { key: 'progress', label: 'Progress %' },
    { key: 'status', label: 'Status' },
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
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => {
                resetAll();
                setShowArchived(false);
              }}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              icon={Archive}
              className={showArchived ? 'is-active' : ''}
              onClick={() => {
                setShowArchived((value) => !value);
                setPage(1);
              }}
            >
              Archived ({archivedCount})
            </Button>
          </>
        }
        right={
          <>
            <SearchInput
              id="project-register-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search project, customer, manager..."
              ariaLabel="Search projects"
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
                    exportCsv('project-register', csvColumns, sortedProjects);
                    close();
                  }}
                >
                  Export CSV
                </DropdownItem>
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
              id="project-filter-status"
              label="Project Status"
              options={[
                { value: 'All', label: 'All Statuses' },
                ...[...PROJECT_STATUSES, 'Draft', 'On Hold', 'Cancelled'].map((status) => ({
                  value: status,
                  label: status,
                })),
              ]}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            />
            <Select
              id="project-filter-domain"
              label="Engineering Domain"
              options={[
                { value: 'All', label: 'All Domains' },
                ...PROJECT_DOMAINS.map((domain) => ({ value: domain, label: domain })),
              ]}
              value={draftFilters.domain}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, domain: event.target.value }))
              }
            />
            <Select
              id="project-filter-manager"
              label="Project Manager"
              options={[
                { value: 'All', label: 'All Managers' },
                ...managers.map((manager) => ({ value: manager, label: manager })),
              ]}
              value={draftFilters.manager}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, manager: event.target.value }))
              }
            />
            <Select
              id="project-filter-priority"
              label="Priority"
              options={[
                { value: 'All', label: 'All Priorities' },
                ...PROJECT_PRIORITIES.map((priority) => ({ value: priority, label: priority })),
              ]}
              value={draftFilters.priority}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, priority: event.target.value }))
              }
            />
            <Input
              id="project-filter-from"
              label="Target From"
              type="date"
              value={draftFilters.from}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, from: event.target.value }))
              }
            />
            <Input
              id="project-filter-to"
              label="Target To"
              type="date"
              value={draftFilters.to}
              onChange={(event) =>
                setDraftFilters((previous) => ({ ...previous, to: event.target.value }))
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
          className="project-register-table"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={toggleSort}
          recordHref={(row) => `/projects/all-projects/${row.id}`}
          onRowClick={(row) => navigate(`/projects/all-projects/${row.id}`)}
          rowActions={(row) => {
            const isDraft = row.status === 'Draft';
            return [
              { key: 'view', label: 'View project', icon: Eye },
              { key: 'edit', label: isDraft ? 'Edit draft' : 'Edit project', icon: Pencil },
              ...(isDraft
                ? [{ key: 'continue', label: 'Continue draft', icon: ArrowRightLeft }]
                : []),
              { key: 'workflow', label: 'View workflow', icon: Activity },
              ...(targetsFor('project', row).some((target) => target.enabled)
                ? [{ key: 'convert', label: 'Create design plan', icon: ArrowRightLeft }]
                : []),
              { key: 'duplicate', label: 'Duplicate project', icon: Copy, divider: true },
              { key: 'archive', label: 'Archive project', icon: Archive },
              ...(isDraft
                ? [{ key: 'delete', label: 'Delete draft', icon: Trash2, danger: true }]
                : []),
            ];
          }}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/projects/all-projects/${row.id}`);
            if (key === 'edit') {
              if (row.status === 'Draft') navigate(`/projects/new-project/${row.id}`);
              else startEdit(row);
            }
            if (key === 'continue') navigate(`/projects/new-project/${row.id}`);
            if (key === 'workflow') navigate(`/projects/all-projects/${row.id}#project-stages`);
            if (key === 'convert') openConversion('project', row);
            if (key === 'duplicate') duplicateProject(row.id);
            if (key === 'archive') archiveProject(row.id);
            if (key === 'delete') setDeleteTarget(row);
          }}
          ariaLabel="Project register"
          emptyContent={
            <EmptyState
              icon={FolderKanban}
              title={showArchived ? 'No Archived Projects' : 'No Projects Found'}
              message={
                showArchived
                  ? 'Projects you archive will be listed here.'
                  : 'No projects match the current search or filter selection.'
              }
              action={
                !showArchived && (
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
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete project draft"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                deleteProject(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete Draft
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Only Draft projects can be deleted. The source request stays in the request register and
          can be converted again. Created projects must be archived instead of deleted.
        </p>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Project"
        subtitle={editing ? `${editing.id} · ${editing.customer}` : undefined}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="project-edit-form">
              Save Changes
            </Button>
          </>
        }
      >
        {editDraft && (
          <form id="project-edit-form" onSubmit={saveEdit}>
            <div className="form-grid">
              <Input
                id="edit-name"
                label="Project name"
                value={editDraft.name}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, name: event.target.value }))
                }
              />
              <Input
                id="edit-customer"
                label="Customer"
                value={editDraft.customer}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, customer: event.target.value }))
                }
              />
              <Input
                id="edit-product"
                label="Product / machine"
                value={editDraft.product}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, product: event.target.value }))
                }
              />
              <Select
                id="edit-domain"
                label="Engineering domain"
                options={PROJECT_DOMAINS.map((domain) => ({ value: domain, label: domain }))}
                value={editDraft.domain}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, domain: event.target.value }))
                }
              />
              <Select
                id="edit-manager"
                label="Project manager"
                options={managers.map((manager) => ({ value: manager, label: manager }))}
                value={editDraft.manager}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, manager: event.target.value }))
                }
              />
              <Select
                id="edit-priority"
                label="Priority"
                options={PROJECT_PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
                value={editDraft.priority}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, priority: event.target.value }))
                }
              />
              <Input
                id="edit-start"
                label="Start date"
                type="date"
                value={editDraft.start}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, start: event.target.value }))
                }
              />
              <Input
                id="edit-target"
                label="Target date"
                type="date"
                value={editDraft.target}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, target: event.target.value }))
                }
              />
              <Input
                id="edit-progress"
                label="Progress (%)"
                type="number"
                min="0"
                max="100"
                value={editDraft.progress}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, progress: event.target.value }))
                }
              />
              <Select
                id="edit-status"
                label="Project status"
                options={[...PROJECT_STATUSES, 'Draft', 'On Hold', 'Cancelled'].map((status) => ({
                  value: status,
                  label: status,
                }))}
                value={editDraft.status}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, status: event.target.value }))
                }
              />
              <Input
                id="edit-enquiry-id"
                label="Enquiry ID"
                value={editDraft.sourceEnquiryId}
                onChange={(event) =>
                  setEditDraft((previous) => ({
                    ...previous,
                    sourceEnquiryId: event.target.value,
                  }))
                }
              />
              <Input
                id="edit-quotation-id"
                label="Accepted quotation ID"
                value={editDraft.sourceQuotationId}
                onChange={(event) =>
                  setEditDraft((previous) => ({
                    ...previous,
                    sourceQuotationId: event.target.value,
                  }))
                }
              />
              <Input
                id="edit-cpr-reference"
                label="CPR reference"
                value={editDraft.cprReference}
                onChange={(event) =>
                  setEditDraft((previous) => ({
                    ...previous,
                    cprReference: event.target.value,
                  }))
                }
              />
              <Select
                id="edit-cpr-status"
                label="CPR status"
                options={CPR_STATUSES.map((status) => ({ value: status, label: status }))}
                value={editDraft.cprStatus}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, cprStatus: event.target.value }))
                }
              />
              <Select
                id="edit-cpr-owner"
                label="CPR owner"
                options={[
                  { value: '', label: 'Unassigned' },
                  ...ENGINEERS.map((name) => ({ value: name, label: name })),
                ]}
                value={editDraft.cprOwner}
                onChange={(event) =>
                  setEditDraft((previous) => ({ ...previous, cprOwner: event.target.value }))
                }
              />
              <Input
                id="edit-cpr-review-date"
                label="CPR review date"
                type="date"
                value={editDraft.cprReviewDate}
                onChange={(event) =>
                  setEditDraft((previous) => ({
                    ...previous,
                    cprReviewDate: event.target.value,
                  }))
                }
              />
              <div className="form-grid-full">
                <Textarea
                  id="edit-cpr-notes"
                  label="CPR details / notes"
                  rows={2}
                  value={editDraft.cprNotes}
                  onChange={(event) =>
                    setEditDraft((previous) => ({ ...previous, cprNotes: event.target.value }))
                  }
                />
              </div>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
