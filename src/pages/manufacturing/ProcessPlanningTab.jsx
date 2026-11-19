import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Download,
  Eye,
  Filter,
  History,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
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
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  ENGINEERS,
  PROCESS_TYPES,
  RECORD_STATUSES,
  isEditable,
  mfgKpis,
  statusTone,
} from '../../data/manufacturingData';
import exportCsv from '../../utils/exportCsv';
import {
  Fact,
  RegisterFilters,
  StatusHistoryList,
  Toast,
  useRegister,
  useToast,
} from './manufacturingUi';

const CSV_COLUMNS = [
  { key: 'id', label: 'Process Plan ID' },
  { key: 'name', label: 'Process Plan Name' },
  { key: 'projectId', label: 'Project ID' },
  { key: 'projectName', label: 'Project' },
  { key: 'designId', label: 'Mechanical Design' },
  { key: 'partNumber', label: 'Part Number' },
  { key: 'material', label: 'Material / Stock' },
  { key: 'linkedDefinitionId', label: 'Manufacturing Definition' },
  { key: 'linkedInspectionId', label: 'Inspection Plan' },
  { key: 'assemblyName', label: 'Assembly' },
  { key: 'processType', label: 'Process Type' },
  { key: 'operationSummary', label: 'Operation Sequence' },
  { key: 'engineer', label: 'Responsible Engineer' },
  { key: 'revision', label: 'Revision' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
];

export default function ProcessPlanningTab() {
  const navigate = useNavigate();
  const { processPlans, submitRecord, removeRecord } = useManufacturing();
  const { assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [submitTarget, setSubmitTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(
    () =>
      processPlans.map((record) => ({
        ...record,
        projectName:
          projects.find((project) => project.id === record.projectId)?.name || record.projectName,
        assemblyName:
          assemblies.find((assembly) => assembly.id === record.assemblyId)?.name || 'Not linked',
        operationCount: record.sequence?.length || 0,
        operationSummary: (record.sequence || [])
          .map((operation) => operation.name)
          .filter(Boolean)
          .join(' → '),
      })),
    [processPlans, projects, assemblies],
  );

  const filterRow = (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.type !== 'All' && row.processType !== filters.type) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (filters.engineer !== 'All' && row.engineer !== filters.engineer) return false;
    if (filters.from && row.dueDate && row.dueDate < filters.from) return false;
    if (filters.to && row.dueDate && row.dueDate > filters.to) return false;
    if (!query) return true;
    return [
      row.id,
      row.name,
      row.processType,
      row.projectId,
      row.projectName,
      row.partNumber,
      row.assemblyName,
      row.engineer,
      row.status,
      ...(row.sequence || []).map((operation) => operation.name),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  };

  const register = useRegister(rows, filterRow);
  const kpis = mfgKpis(rows);

  const columns = [
    {
      key: 'id',
      label: 'Process Plan ID',
      width: 104,
      sortable: true,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'name',
      label: 'Process Plan',
      width: 172,
      sortable: true,
      render: (row) => (
        <span className="cell-strong mfg-name-cell">
          {row.name}
          <span className="cell-muted mfg-subline">{row.operationSummary || 'No operations defined'}</span>
        </span>
      ),
    },
    {
      key: 'operationCount',
      label: 'Operations',
      width: 76,
      align: 'center',
      render: (row) => <span className="mfg-count-chip">{row.operationCount}</span>,
    },
    {
      key: 'projectName',
      label: 'Project',
      width: 110,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    { key: 'partNumber', label: 'Part Number', width: 86 },
    {
      key: 'assemblyName',
      label: 'Assembly',
      width: 118,
      render: (row) => <span className="cell-muted mfg-clip">{row.assemblyName}</span>,
    },
    { key: 'processType', label: 'Process Type', width: 100 },
    { key: 'engineer', label: 'Engineer', width: 80, sortable: true },
    { key: 'revision', label: 'Rev', width: 52, align: 'center', render: (row) => `Rev ${row.revision}` },
    {
      key: 'status',
      label: 'Status',
      width: 94,
      render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} />,
    },
  ];

  const handleSubmit = () => {
    const result = submitRecord('process', submitTarget.id, submitTarget.engineer);
    showToast(result.error || `${submitTarget.id} submitted for review.`, result.error ? 'error' : 'success');
    setSubmitTarget(null);
  };

  const selectedRows = register.sortedRows.filter((row) => register.selectedIds.includes(row.id));

  return (
    <>
      <KpiGrid>
        <StatCard icon={ClipboardList} label="Total Records" value={String(kpis.total)} sub="All process plans" tone="teal" />
        <StatCard icon={Pencil} label="In Preparation" value={String(kpis.inProgress)} sub="Plans being prepared" tone="blue" />
        <StatCard icon={Send} label="Under Review" value={String(kpis.pending)} sub="Awaiting plan review" tone="orange" />
        <StatCard icon={ShieldCheck} label="Released" value={String(kpis.released)} sub="Released process plans" tone="emerald" />
      </KpiGrid>

      <Toolbar
        left={
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={register.resetFilters}>
              Refresh
            </Button>
            {register.selectedIds.length > 0 && (
              <Dropdown
                trigger={({ open, toggle }) => (
                  <Button variant="secondary" onClick={toggle} aria-expanded={open}>
                    Bulk Actions ({register.selectedIds.length})
                  </Button>
                )}
              >
                {({ close }) => (
                  <DropdownItem
                    icon={Download}
                    onClick={() => {
                      exportCsv('process-plans-selection', CSV_COLUMNS, selectedRows);
                      close();
                    }}
                  >
                    Export selected
                  </DropdownItem>
                )}
              </Dropdown>
            )}
          </>
        }
        right={
          <>
            <SearchInput
              id="mfg-process-search"
              value={register.search}
              onChange={register.setSearch}
              placeholder="Search plan, part, assembly, operation..."
              ariaLabel="Search process plans"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Filter}
              onClick={() => register.setFiltersOpen((open) => !open)}
            >
              {register.filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => exportCsv('process-plans', CSV_COLUMNS, register.sortedRows)}
            >
              Export
            </Button>
          </>
        }
        count={register.pageInfo}
      />

      <RegisterFilters
        open={register.filtersOpen}
        draftFilters={register.draftFilters}
        setDraftFilters={register.setDraftFilters}
        applyFilters={register.applyFilters}
        resetFilters={register.resetFilters}
        typeLabel="Process Type"
        typeOptions={PROCESS_TYPES}
        projects={projects}
        engineers={ENGINEERS}
        statuses={RECORD_STATUSES}
      />

      <section className="table-card">
        <DataTable
          columns={columns}
          rows={register.pageRows}
          className="mech-register-table"
          selectable
          selectedIds={register.selectedIds}
          onSelectAll={(checked) =>
            register.setSelectedIds(checked ? register.pageRows.map((row) => row.id) : [])
          }
          onToggleRow={register.toggleRow}
          sortKey={register.sortKey}
          sortDirection={register.sortDirection}
          onSort={register.toggleSort}
          rowActions={(row) => [
            { key: 'view', label: 'View plan', icon: Eye },
            ...(isEditable(row) ? [{ key: 'edit', label: 'Edit plan', icon: Pencil }] : []),
            ...(isEditable(row) ? [{ key: 'submit', label: 'Submit for review', icon: Send }] : []),
            { key: 'history', label: 'Status history', icon: History },
            ...(isEditable(row)
              ? [{ key: 'delete', label: 'Delete plan', icon: Trash2, danger: true, divider: true }]
              : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/manufacturing-design/process/${row.id}`);
            if (key === 'edit') navigate(`/manufacturing-design/process/${row.id}/edit`);
            if (key === 'submit') setSubmitTarget(row);
            if (key === 'history') setHistoryTarget(row);
            if (key === 'delete') setDeleteTarget(row);
          }}
          recordHref={(row) => `/manufacturing-design/process/${row.id}`}
          onRowClick={(row) => navigate(`/manufacturing-design/process/${row.id}`)}
          ariaLabel="Process planning register"
          emptyContent={
            <EmptyState
              icon={ClipboardList}
              title="No process plans"
              message="No plans match the current filters or search."
            />
          }
        />
        <Pagination
          page={register.page}
          totalPages={Math.max(1, Math.ceil(register.totalCount / register.pageSize))}
          pageSize={register.pageSize}
          pageInfo={register.pageInfo}
          onPageChange={register.setPage}
          onPageSizeChange={(size) => {
            register.setPageSize(size);
            register.setPage(1);
          }}
          pageSizeOptions={[5, 10, 25]}
        />
      </section>

      <p className="mech-footnote">
        Process plans reference drawings and inspection requirements; they do not execute manufacturing.
        Production execution belongs to Production, and inspection results belong to Quality Control.
      </p>

      <Modal
        open={Boolean(submitTarget)}
        onClose={() => setSubmitTarget(null)}
        title="Submit Process Plan"
        subtitle={submitTarget ? `${submitTarget.id} · ${submitTarget.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button icon={Send} onClick={handleSubmit}>
              Submit for Review
            </Button>
          </>
        }
      >
        {submitTarget && (
          <>
            <div className="fact-grid">
              <Fact label="Reviewer">{submitTarget.reviewer}</Fact>
              <Fact label="Process Type">{submitTarget.processType}</Fact>
              <Fact label="Operations">{String(submitTarget.sequence.length)}</Fact>
              <Fact label="Status">{submitTarget.status}</Fact>
            </div>
            <p className="dash-modal-note">
              Submission does not release the manufacturing package and does not authorize production.
            </p>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title="Status History"
        subtitle={historyTarget ? `${historyTarget.id} · ${historyTarget.name}` : ''}
        footer={
          <Button variant="ghost" onClick={() => setHistoryTarget(null)}>
            Close
          </Button>
        }
      >
        {historyTarget && <StatusHistoryList history={historyTarget.statusHistory} />}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Process Plan"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                removeRecord('process', deleteTarget.id);
                showToast(`${deleteTarget.id} deleted.`);
                setDeleteTarget(null);
              }}
            >
              Delete Plan
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Only editable plans can be deleted. Released plans remain as controlled history and can only be
          superseded by a new revision.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
