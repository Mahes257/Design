import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  ClipboardList,
  ClipboardPen,
  Filter,
  FolderKanban,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  SearchCheck,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  Toolbar,
} from '../../components/common';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import {
  DELETABLE_STATUSES,
  LOCKED_STATUSES,
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  REQUEST_SOURCES,
  REQUEST_STATUSES,
  conversionEligibility,
  formatDate,
  requesterLabel,
} from '../../data/enquiryRequestData';
import {
  RequestPriority,
  RequestSource,
  RequestStatus,
  RequesterCell,
  useRequestConversion,
} from './enquiryRequestUi';

const EMPTY_FILTERS = { source: 'All', category: 'All', status: 'All', priority: 'All', from: '' };

export default function RequestRegisterTab() {
  const navigate = useNavigate();
  const { requests, nextRequestId, deleteRequest } = useEnquiryRequests();
  const { openConvert, convertDialog } = useRequestConversion();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const stats = useMemo(() => {
    const count = (statuses) => requests.filter((row) => statuses.includes(row.status)).length;
    return {
      total: requests.length,
      assessment: count([
        'Submitted',
        'Under Initial Review',
        'Clarification Required',
        'Under Feasibility Assessment',
        'Returned for Clarification',
      ]),
      accepted: count(['Accepted', 'Quotation in Progress', 'Submitted to Customer', 'Quotation Accepted']),
      customers: requests.filter((row) => row.source === 'Customer').length,
    };
  }, [requests]);

  const hasFilters = useMemo(
    () => Object.entries(filters).some(([, value]) => value && value !== 'All'),
    [filters],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((row) => {
      if (filters.source !== 'All' && row.source !== filters.source) return false;
      if (filters.category !== 'All' && row.category !== filters.category) return false;
      if (filters.status !== 'All' && row.status !== filters.status) return false;
      if (filters.priority !== 'All' && row.priority !== filters.priority) return false;
      if (filters.from && String(row.requestDate || '') < filters.from) return false;
      if (!query) return true;
      return [row.id, row.title, requesterLabel(row), row.category, row.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${filtered.length} of ${requests.length} requests`;

  const resetFilters = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const columns = [
    {
      key: 'id',
      label: 'Request ID',
      sortable: true,
      width: 118,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'title',
      label: 'Request Title',
      sortable: true,
      width: 260,
      render: (row) => (
        <span className="er-title-cell">
          <strong>{row.title}</strong>
          <span>{row.description ? `${row.description.slice(0, 78)}…` : '—'}</span>
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Request Source',
      sortable: true,
      width: 132,
      render: (row) => <RequestSource source={row.source} />,
    },
    {
      key: 'category',
      label: 'Request Category',
      sortable: true,
      width: 160,
      render: (row) => <span className="chip chip-mint">{row.category}</span>,
    },
    {
      key: 'requester',
      label: 'Requester / Department',
      width: 180,
      render: (row) => <RequesterCell record={row} />,
    },
    {
      key: 'reference',
      label: 'Product / Project Ref.',
      width: 160,
      render: (row) => (
        <span className="er-ref-cell">
          <span>{row.productReference || '—'}</span>
          <small>{row.projectReference || '—'}</small>
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      width: 92,
      render: (row) => <RequestPriority priority={row.priority} />,
    },
    {
      key: 'requestDate',
      label: 'Request Date',
      sortable: true,
      width: 112,
      render: (row) => <span className="cell-muted">{formatDate(row.requestDate)}</span>,
    },
    {
      key: 'requiredDate',
      label: 'Required Date',
      sortable: true,
      width: 112,
      render: (row) => <span className="cell-muted">{formatDate(row.requiredDate)}</span>,
    },
    {
      key: 'status',
      label: 'Current Status',
      sortable: true,
      width: 180,
      render: (row) => <RequestStatus status={row.status} />,
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      sortable: true,
      width: 124,
      render: (row) => row.assignedTo || <span className="cell-muted">Unassigned</span>,
    },
  ];

  return (
    <>
      <KpiGrid className="ce-kpi-grid">
        <StatCard icon={Inbox} label="Total Requests" value={String(stats.total)} sub="All four request sources" tone="blue" />
        <StatCard icon={SearchCheck} label="Under Assessment" value={String(stats.assessment)} sub="Initial review, clarification or feasibility" tone="purple" />
        <StatCard icon={FolderKanban} label="Accepted / Quoted" value={String(stats.accepted)} sub="Ready for downstream workflow" tone="emerald" />
        <StatCard icon={ClipboardList} label="Customer Requests" value={String(stats.customers)} sub="Customer enquiry and RFQ records" tone="orange" />
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
              <Button variant="ghost" icon={X} onClick={resetFilters}>
                Clear
              </Button>
            )}
            <Button variant="ghost" icon={RefreshCw} onClick={resetFilters}>
              Refresh
            </Button>
          </>
        }
        right={
          <>
            <SearchInput
              id="er-register-search"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search request ID, title or requester..."
              ariaLabel="Search requests"
            />
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => navigate('/customer-sales/create')}>
              Add New Request
            </Button>
          </>
        }
        count={pageInfo}
      />

      {filtersOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <Select
              id="er-filter-source"
              label="Request Source"
              value={draftFilters.source}
              onChange={(event) => setDraftFilters((previous) => ({ ...previous, source: event.target.value }))}
              options={[{ value: 'All', label: 'All Sources' }, ...REQUEST_SOURCES.map((value) => ({ value, label: value }))]}
            />
            <Select
              id="er-filter-category"
              label="Category"
              value={draftFilters.category}
              onChange={(event) => setDraftFilters((previous) => ({ ...previous, category: event.target.value }))}
              options={[{ value: 'All', label: 'All Categories' }, ...REQUEST_CATEGORIES.map((value) => ({ value, label: value }))]}
            />
            <Select
              id="er-filter-status"
              label="Status"
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((previous) => ({ ...previous, status: event.target.value }))}
              options={[{ value: 'All', label: 'All Statuses' }, ...REQUEST_STATUSES.map((value) => ({ value, label: value }))]}
            />
            <Select
              id="er-filter-priority"
              label="Priority"
              value={draftFilters.priority}
              onChange={(event) => setDraftFilters((previous) => ({ ...previous, priority: event.target.value }))}
              options={[{ value: 'All', label: 'All Priorities' }, ...REQUEST_PRIORITIES.map((value) => ({ value, label: value }))]}
            />
            <div className="form-field">
              <label className="form-label" htmlFor="er-filter-from">
                Request Date From
              </label>
              <input
                id="er-filter-from"
                className="form-input"
                type="date"
                value={draftFilters.from}
                onChange={(event) => setDraftFilters((previous) => ({ ...previous, from: event.target.value }))}
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
                  resetFilters();
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
          className="er-register-table"
          columns={columns}
          rows={pageRows}
          sortKey={undefined}
          rowActions={(row) => {
            const eligibility = conversionEligibility(row);
            const deletable = DELETABLE_STATUSES.includes(row.status) && !row.linkedProjectId;
            return [
              { key: 'view', label: 'View request', icon: ClipboardList },
              {
                key: 'edit',
                label: LOCKED_STATUSES.includes(row.status) ? 'Edit request (locked)' : 'Edit request',
                icon: Pencil,
              },
              { key: 'assess', label: 'Technical assessment', icon: SearchCheck },
              ...(row.source === 'Customer'
                ? [{ key: 'quote', label: 'Quotation & commercial review', icon: ClipboardPen }]
                : []),
              {
                key: 'convert',
                label: row.linkedProjectId
                  ? `Linked project ${row.linkedProjectId}`
                  : eligibility.eligible
                    ? 'Convert to project'
                    : 'Convert to project (blocked)',
                icon: ArrowRightLeft,
                divider: true,
              },
              ...(deletable ? [{ key: 'delete', label: 'Delete request', icon: Trash2, danger: true }] : []),
            ];
          }}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/customer-sales/requests/${row.id}`);
            if (key === 'edit') navigate(`/customer-sales/create/${row.id}/edit`);
            if (key === 'assess') navigate(`/customer-sales/assessment/${row.id}`);
            if (key === 'quote') navigate(`/customer-sales/commercial/${row.id}`);
            if (key === 'convert') openConvert(row);
            if (key === 'delete') {
              setDeleteError('');
              setDeleteTarget(row);
            }
          }}
          recordHref={(row) => `/customer-sales/requests/${row.id}`}
          onRowClick={(row) => navigate(`/customer-sales/requests/${row.id}`)}
          ariaLabel="Enquiry and request register"
          emptyContent={
            <EmptyState
              icon={Inbox}
              title="No requests found"
              message="No requests match the current search and filters."
              action={hasFilters && <Button variant="ghost" onClick={resetFilters}>Clear Filters</Button>}
            />
          }
        />
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25]}
          pageInfo={pageInfo}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <section className="ce-register-note">
        <Inbox aria-hidden="true" />
        <div>
          <strong>One register for every request source</strong>
          <p>
            Next available request ID: <strong>{nextRequestId()}</strong>. Customer, R&amp;D / PDE,
            Service and Inter-Department requests share this register; use the source filter to
            work within one intake stream.
          </p>
        </div>
      </section>

      {convertDialog}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete request"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.title}` : undefined}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                const result = deleteRequest(deleteTarget.id);
                if (result?.error) {
                  setDeleteError(result.error);
                  return;
                }
                setDeleteTarget(null);
              }}
            >
              Delete Request
            </Button>
          </>
        }
      >
        <div className="er-dialog-note is-warning">
          <TriangleAlert aria-hidden="true" />
          <p>
            Only draft or rejected requests can be deleted. Accepted, assessed and converted
            requests must stay in the register as an audit trail.
          </p>
        </div>
        {deleteError && (
          <p className="form-error" role="alert">
            {deleteError}
          </p>
        )}
      </Modal>
    </>
  );
}
