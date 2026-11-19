import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
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
  INSPECTION_TYPES,
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
  { key: 'id', label: 'Inspection ID' },
  { key: 'characteristic', label: 'Characteristic to Inspect' },
  { key: 'dimension', label: 'Dimension / Tolerance' },
  { key: 'unit', label: 'Measurement Unit' },
  { key: 'inspectionMethod', label: 'Inspection Method' },
  { key: 'instrument', label: 'Instrument / Equipment' },
  { key: 'frequency', label: 'Inspection Frequency' },
  { key: 'acceptanceCriteria', label: 'Acceptance Criteria' },
  { key: 'criticalToQuality', label: 'Critical to Quality' },
  { key: 'evidenceRef', label: 'Required Evidence / Drawing' },
  { key: 'requirementNotes', label: 'Notes' },
  { key: 'projectId', label: 'Project ID' },
  { key: 'projectName', label: 'Project' },
  { key: 'designId', label: 'Mechanical Design' },
  { key: 'partNumber', label: 'Part Number' },
  { key: 'drawingRevision', label: 'Design Revision' },
  { key: 'inspectionType', label: 'Inspection Type' },
  { key: 'linkedDefinitionId', label: 'Manufacturing Definition' },
  { key: 'engineer', label: 'Responsible Engineer' },
  { key: 'status', label: 'Status' },
  { key: 'revision', label: 'Revision' },
];

export default function InspectionRequirementsTab() {
  const navigate = useNavigate();
  const { inspections, submitRecord, removeRecord } = useManufacturing();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [submitTarget, setSubmitTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(
    () =>
      inspections.map((record) => ({
        ...record,
        projectName:
          projects.find((project) => project.id === record.projectId)?.name || record.projectName,
        characteristicCount: record.characteristics?.length || 0,
        partName: parts.find((part) => part.id === record.partId)?.name || '',
        assemblyName:
          assemblies.find((assembly) => assembly.id === record.assemblyId)?.number || '',
      })),
    [inspections, projects, parts, assemblies],
  );

  const filterRow = (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.type !== 'All' && row.inspectionType !== filters.type) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (filters.engineer !== 'All' && row.engineer !== filters.engineer) return false;
    if (filters.from && row.dueDate && row.dueDate < filters.from) return false;
    if (filters.to && row.dueDate && row.dueDate > filters.to) return false;
    if (!query) return true;
    return [
      row.id,
      row.name,
      row.inspectionType,
      row.projectId,
      row.projectName,
      row.partNumber,
      row.drawingNo,
      row.characteristic,
      row.dimension,
      row.tolerance,
      row.inspectionMethod,
      row.instrument,
      row.frequency,
      row.acceptanceCriteria,
      row.criticalToQuality,
      row.evidenceRef,
      row.requirementNotes,
      row.engineer,
      row.status,
      ...(row.points || []).map((point) => point.feature),
      ...(row.characteristics || []).map((entry) => entry.name),
      ...(row.inspectionItems || []).flatMap((item) => [
        item.feature,
        item.method,
        item.equipment,
        item.characteristic,
        item.criticality,
        item.dimension,
        item.toleranceRef,
        item.notes,
      ]),
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
      label: 'Requirement No.',
      width: 102,
      sortable: true,
      render: (row) => <span className="cell-id">{row.id}</span>,
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
      key: 'drawingRevision',
      label: 'Revision',
      width: 64,
      align: 'center',
      render: (row) => `Rev ${row.drawingRevision}`,
    },
    {
      key: 'partNumber',
      label: 'Part / Assembly',
      width: 110,
      render: (row) => (
        <span className="cell-project">
          <span>{row.partNumber}</span>
          <span className="cell-muted">{row.assemblyName || row.partName || 'No assembly'}</span>
        </span>
      ),
    },
    {
      key: 'characteristic',
      label: 'Characteristic',
      width: 142,
      sortable: true,
      render: (row) => <span className="cell-strong mfg-name-cell">{row.characteristic || row.name}</span>,
    },
    {
      key: 'dimension',
      label: 'Dimension / Tolerance',
      width: 128,
      render: (row) => (
        <span className="cell-project">
          <span>{row.dimension || '—'}</span>
          <span className="cell-muted">{row.tolerance || row.unit || ''}</span>
        </span>
      ),
    },
    { key: 'inspectionMethod', label: 'Method', width: 104 },
    { key: 'instrument', label: 'Instrument', width: 112, render: (row) => <span className="mfg-clip">{row.instrument || '—'}</span> },
    { key: 'frequency', label: 'Frequency', width: 90 },
    {
      key: 'criticalToQuality',
      label: 'CTQ',
      width: 54,
      align: 'center',
      render: (row) => (
        <span className={`mfg-ctq${row.criticalToQuality === 'Yes' ? ' is-critical' : ''}`}>
          {row.criticalToQuality || 'No'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} />,
    },
  ];

  const handleSubmit = () => {
    const result = submitRecord('inspection', submitTarget.id, submitTarget.engineer);
    showToast(result.error || `${submitTarget.id} submitted for review.`, result.error ? 'error' : 'success');
    setSubmitTarget(null);
  };

  const selectedRows = register.sortedRows.filter((row) => register.selectedIds.includes(row.id));

  return (
    <>
      <KpiGrid>
        <StatCard icon={ClipboardCheck} label="Total Records" value={String(kpis.total)} sub="All inspection requirements" tone="teal" />
        <StatCard icon={Pencil} label="In Preparation" value={String(kpis.inProgress)} sub="Plans being prepared" tone="blue" />
        <StatCard icon={Send} label="Under Review" value={String(kpis.pending)} sub="Awaiting plan review" tone="orange" />
        <StatCard icon={ShieldCheck} label="Released" value={String(kpis.released)} sub="Released inspection requirements" tone="emerald" />
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
                      exportCsv('inspection-requirements-selection', CSV_COLUMNS, selectedRows);
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
              id="mfg-inspection-search"
              value={register.search}
              onChange={register.setSearch}
              placeholder="Search inspection, part, characteristic..."
              ariaLabel="Search inspection requirements"
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
              onClick={() => exportCsv('inspection-requirements', CSV_COLUMNS, register.sortedRows)}
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
        typeLabel="Inspection Type"
        typeOptions={INSPECTION_TYPES}
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
            if (key === 'view') navigate(`/manufacturing-design/inspection/${row.id}`);
            if (key === 'edit') navigate(`/manufacturing-design/inspection/${row.id}/edit`);
            if (key === 'submit') setSubmitTarget(row);
            if (key === 'history') setHistoryTarget(row);
            if (key === 'delete') setDeleteTarget(row);
          }}
          recordHref={(row) => `/manufacturing-design/inspection/${row.id}`}
          onRowClick={(row) => navigate(`/manufacturing-design/inspection/${row.id}`)}
          ariaLabel="Inspection requirements register"
          emptyContent={
            <EmptyState
              icon={ClipboardCheck}
              title="No inspection requirements"
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
        This register defines inspection requirements only. Measured results, defect recording and quality
        clearance stay in the Quality Control module; release authorization stays with Design Review &amp;
        Approval.
      </p>

      <Modal
        open={Boolean(submitTarget)}
        onClose={() => setSubmitTarget(null)}
        title="Submit Inspection Requirement"
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
              <Fact label="Inspection Type">{submitTarget.inspectionType}</Fact>
              <Fact label="Inspection Points">
                {String(submitTarget.inspectionItems?.length ?? submitTarget.points?.length ?? 0)}
              </Fact>
              <Fact label="Status">{submitTarget.status}</Fact>
            </div>
            <p className="dash-modal-note">
              Submitting inspection requirements does not execute inspection or approve the part for production.
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
        title="Delete Inspection Requirement"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.name}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={Trash2}
              onClick={() => {
                removeRecord('inspection', deleteTarget.id);
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
          Only editable plans can be deleted. Released plans remain as controlled history.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
