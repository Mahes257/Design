import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowRightLeft,
  ClipboardCheck,
  Download,
  Eye,
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
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import { formatDate } from '../../data/projectData';
import {
  ENGINEERS,
  MANUFACTURING_CATEGORIES,
  MANUFACTURING_CATEGORY_FILTERS,
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
  { key: 'id', label: 'Reference ID' },
  { key: 'name', label: 'Record Name' },
  { key: 'category', label: 'Category' },
  { key: 'projectId', label: 'Project ID' },
  { key: 'projectName', label: 'Project' },
  { key: 'designId', label: 'Mechanical Design' },
  { key: 'partNumber', label: 'Part Number' },
  { key: 'assemblyId', label: 'Assembly' },
  { key: 'revision', label: 'Revision' },
  { key: 'material', label: 'Material Specification' },
  { key: 'manufacturingMethod', label: 'Manufacturing Method' },
  { key: 'criticalFeatures', label: 'Critical Features' },
  { key: 'requiredCapabilities', label: 'Required Capabilities' },
  { key: 'specialProcesses', label: 'Special Processes' },
  { key: 'equipmentToolingRefs', label: 'Equipment / Tooling' },
  { key: 'analysisId', label: 'Verified Analysis Reference' },
  { key: 'drawingNo', label: 'Drawing Number' },
  { key: 'drawingRevision', label: 'Drawing Revision' },
  { key: 'engineer', label: 'Responsible Engineer' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'status', label: 'Status' },
];

export default function ManufacturingDefinitionTab() {
  const navigate = useNavigate();
  const { definitions, submitRecord, removeRecord } = useManufacturing();
  const { parts, assemblies } = useMechanical();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [submitTarget, setSubmitTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(
    () =>
      definitions.map((record) => ({
        ...record,
        partText: record.partNumber,
        projectName:
          projects.find((project) => project.id === record.projectId)?.name || record.projectName,
        partName: parts.find((part) => part.id === record.partId)?.name || '',
        assemblyName: assemblies.find((assembly) => assembly.id === record.assemblyId)?.name || '',
        partAssembly: `${record.partNumber || 'Not linked'}${
          record.assemblyId ? ` · ${assemblies.find((assembly) => assembly.id === record.assemblyId)?.number || record.assemblyId}` : ''
        }`,
      })),
    [definitions, projects, parts, assemblies],
  );

  const activeCategory = MANUFACTURING_CATEGORY_FILTERS.find((row) => row.key === categoryFilter);

  const categoryRows = useMemo(() => {
    if (categoryFilter === 'all') return rows;
    return rows.filter((row) => row.category === activeCategory?.label);
  }, [rows, categoryFilter, activeCategory]);

  const filterRow = (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (filters.engineer !== 'All' && row.engineer !== filters.engineer) return false;
    if (filters.from && row.dueDate && row.dueDate < filters.from) return false;
    if (filters.to && row.dueDate && row.dueDate > filters.to) return false;
    if (!query) return true;
    return [
      row.id,
      row.name,
      row.category,
      row.projectName,
      row.partNumber,
      row.partName,
      row.partAssembly,
      row.material,
      row.manufacturingMethod,
      row.manufacturingNotes,
      row.criticalFeatures,
      row.requiredCapabilities,
      row.specialProcesses,
      row.equipmentToolingRefs,
      row.drawingNo,
      row.engineer,
      row.status,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  };

  const register = useRegister(categoryRows, filterRow);
  const kpis = mfgKpis(categoryRows);

  const columns = [
    {
      key: 'id',
      label: 'Definition No.',
      width: 100,
      sortable: true,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'name',
      label: 'Manufacturing Definition',
      width: 170,
      sortable: true,
      render: (row) => (
        <span className="cell-strong mfg-name-cell">
          {row.name}
          <span className="cell-muted mfg-subline">{row.category}</span>
        </span>
      ),
    },
    {
      key: 'projectName',
      label: 'Project',
      width: 112,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    {
      key: 'partAssembly',
      label: 'Part / Assembly',
      width: 116,
      render: (row) => (
        <span className="cell-project">
          <span>{row.partNumber || 'Not linked'}</span>
          <span className="cell-muted">{row.assemblyName || 'No assembly'}</span>
        </span>
      ),
    },
    { key: 'revision', label: 'Revision', width: 62, align: 'center', render: (row) => `Rev ${row.revision}` },
    { key: 'material', label: 'Material', width: 118, render: (row) => <span className="mfg-clip">{row.material || '—'}</span> },
    {
      key: 'manufacturingMethod',
      label: 'Method',
      width: 120,
      render: (row) => <span className="cell-muted mfg-clip">{row.manufacturingMethod || 'Not recorded'}</span>,
    },
    { key: 'engineer', label: 'Engineer', width: 84, sortable: true },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} />,
    },
  ];

  const handleSubmit = () => {
    const result = submitRecord('definition', submitTarget.id, submitTarget.engineer);
    showToast(
      result.error || `${submitTarget.id} submitted for review.`,
      result.error ? 'error' : 'success',
    );
    setSubmitTarget(null);
  };

  const handleDelete = () => {
    removeRecord('definition', deleteTarget.id);
    showToast(`${deleteTarget.id} deleted from the manufacturing register.`);
    setDeleteTarget(null);
  };

  const selectedRows = register.sortedRows.filter((row) => register.selectedIds.includes(row.id));

  return (
    <>
      <div className="mech-domain-bar is-segmented" role="tablist" aria-label="Manufacturing category">
        {MANUFACTURING_CATEGORY_FILTERS.map((category) => {
          const count =
            category.key === 'all'
              ? rows.length
              : rows.filter((row) => row.category === category.label).length;
          return (
            <button
              key={category.key}
              type="button"
              role="tab"
              aria-selected={categoryFilter === category.key}
              className={`mech-domain-chip${categoryFilter === category.key ? ' is-active' : ''}`}
              onClick={() => {
                setCategoryFilter(category.key);
                register.setSelectedIds([]);
                register.setPage(1);
              }}
            >
              {category.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <KpiGrid>
        <StatCard
          icon={ClipboardCheck}
          label="Total Records"
          value={String(kpis.total)}
          sub={activeCategory?.label || 'All manufacturing records'}
          tone="teal"
        />
        <StatCard icon={Pencil} label="In Preparation" value={String(kpis.inProgress)} sub="Records being prepared" tone="blue" />
        <StatCard icon={Send} label="Under Review" value={String(kpis.pending)} sub="Submitted for review" tone="orange" />
        <StatCard icon={ShieldCheck} label="Released" value={String(kpis.released)} sub="Approved and released records" tone="emerald" />
      </KpiGrid>

      <Toolbar
        left={
          <>
            <Button
              variant="secondary"
              icon={Archive}
              size="sm"
              onClick={() => register.setFiltersOpen((open) => !open)}
            >
              {register.filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => {
                setCategoryFilter('all');
                register.resetFilters();
              }}
            >
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
                      exportCsv('manufacturing-definition-selection', CSV_COLUMNS, selectedRows);
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
              id="mfg-definition-search"
              value={register.search}
              onChange={register.setSearch}
              placeholder="Search reference, name, part, drawing..."
              ariaLabel="Search manufacturing definitions"
            />
            <Button
              variant="secondary"
              icon={Download}
              size="sm"
              onClick={() => exportCsv('manufacturing-definitions', CSV_COLUMNS, register.sortedRows)}
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
        resetFilters={() => {
          setCategoryFilter('all');
          register.resetFilters();
        }}
        typeLabel="Category"
        typeOptions={MANUFACTURING_CATEGORIES.map((row) => row.label)}
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
            { key: 'view', label: 'View record', icon: Eye },
            ...(isEditable(row) ? [{ key: 'edit', label: 'Edit record', icon: Pencil }] : []),
            ...(isEditable(row) ? [{ key: 'submit', label: 'Submit for review', icon: Send }] : []),
            { key: 'history', label: 'Status history', icon: History },
            ...(targetsFor('manufacturing', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Create BOM', icon: ArrowRightLeft }]
              : []),
            ...(isEditable(row)
              ? [{ key: 'delete', label: 'Delete record', icon: Trash2, danger: true, divider: true }]
              : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/manufacturing-design/definition/${row.id}`);
            if (key === 'edit') navigate(`/manufacturing-design/definition/${row.id}/edit`);
            if (key === 'submit') setSubmitTarget(row);
            if (key === 'history') setHistoryTarget(row);
            if (key === 'convert') openConversion('manufacturing', row);
            if (key === 'delete') setDeleteTarget(row);
          }}
          recordHref={(row) => `/manufacturing-design/definition/${row.id}`}
          onRowClick={(row) => navigate(`/manufacturing-design/definition/${row.id}`)}
          ariaLabel="Manufacturing definition register"
          emptyContent={
            <EmptyState
              icon={ClipboardCheck}
              title="No manufacturing records"
              message="No records match the current category, filters or search."
            />
          }
        />
        <Pagination
          page={register.page}
          totalPages={Math.max(1, Math.ceil(register.totalCount / register.pageSize))}
          pageInfo={register.pageInfo}
          onPageChange={register.setPage}
          pageSize={register.pageSize}
          onPageSizeChange={(size) => {
            register.setPageSize(size);
            register.setPage(1);
          }}
          pageSizeOptions={[5, 10, 25]}
        />
      </section>

      <p className="mech-footnote">
        Manufacturing definitions record requirements and references only. Parts, drawings and revisions
        remain owned by Mechanical Engineering Design and Drawing &amp; CAD Management.
      </p>

      <Modal
        open={Boolean(submitTarget)}
        onClose={() => setSubmitTarget(null)}
        title="Submit Manufacturing Definition"
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
              <Fact label="Assigned Reviewer">{submitTarget.reviewer}</Fact>
              <Fact label="Revision">Rev {submitTarget.revision}</Fact>
              <Fact label="Drawing">
                {submitTarget.drawingNo} · Rev {submitTarget.drawingRevision}
              </Fact>
              <Fact label="Status">{submitTarget.status}</Fact>
            </div>
            <p className="dash-modal-note">
              Submission moves the record to Under Review. It does not release the record to production;
              release is a separate controlled step.
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
        title="Delete Manufacturing Record"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button icon={Trash2} onClick={handleDelete}>
              Delete Record
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Only draft, in-progress, changes-requested or rejected records can be deleted. Approved and released
          records stay in the register as controlled history and must be superseded by a new revision.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
