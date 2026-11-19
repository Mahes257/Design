import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useTransfers } from '../../context/TransfersContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import {
  DESTINATIONS,
  ELIGIBLE_SOURCES,
  PROJECTS,
  SOURCE_DELIVERABLES,
  TRANSFER_STATUSES,
  destinationLabel,
  formatDate,
  isDestinationSelected,
  projectLabel,
} from '../../data/transfersData';
import exportCsv from '../../utils/exportCsv';
import TransferDetailView from './TransferDetailView';
import {
  AttachmentDialog,
  CancelDialog,
  DestinationBadges,
  SectionNav,
  Toast,
  TransferStatus,
  ValidationResults,
  formatBytes,
  useToast,
  useTransferTable,
} from './transfersUi';

const SECTIONS = [
  { key: 'all', label: 'All Transfers' },
  { key: 'new', label: 'New Transfer' },
  { key: 'approved', label: 'Approved Deliverables' },
  { key: 'pending', label: 'Pending Transfers' },
  { key: 'details', label: 'Transfer Details' },
  { key: 'validation', label: 'Transfer Validation' },
];

const EMPTY_FILTERS = { projectId: 'All', type: 'All', destination: 'All', status: 'All' };

const BASE_COLUMNS = [
  { key: 'id', label: 'Transfer ID', sortable: true, width: 108, render: (row) => <span className="cell-id">{row.id}</span> },
  { key: 'projectId', label: 'Project', sortable: true, width: 124, render: (row) => <span className="transfers-project-cell"><strong>{row.projectId}</strong><small>{projectLabel(row.projectId).split(' · ')[1]}</small></span> },
  { key: 'deliverableType', label: 'Type', width: 104 },
  { key: 'deliverableNumber', label: 'Deliverable Number', sortable: true, width: 148, render: (row) => <span className="cell-strong">{row.deliverableNumber}</span> },
  { key: 'revision', label: 'Revision', width: 70, render: (row) => <span className="approvals-exact-rev">Rev {row.revision}</span> },
  { key: 'destination', label: 'Destination', width: 114, render: (row) => <DestinationBadges destinations={row.destinations} compact /> },
  { key: 'releaseId', label: 'Source Release ID', width: 140, render: (row) => <span className="cell-id">{row.releaseId}</span> },
  { key: 'transferDate', label: 'Transfer Date', sortable: true, width: 104, render: (row) => formatDate(row.transferDate) },
  { key: 'status', label: 'Status', width: 150, render: (row) => <TransferStatus status={row.status} /> },
];

function TransferList({ rows, scope, onView, onCancel }) {
  const { validateTransfer } = useTransfers();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { toast, showToast, clearToast } = useToast();
  const table = useTransferTable(rows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.type !== 'All' && row.deliverableType !== filters.type) return false;
    if (filters.destination !== 'All' && !row.destinations.includes(filters.destination)) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.projectId, row.deliverableType, row.deliverableNumber, row.deliverableName, row.revision, row.releaseId, row.initiatedBy, row.status]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }, { initialFilters: EMPTY_FILTERS });

  const exportRows = table.sorted;

  return (
    <>
      <Toolbar
        left={
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={table.reset}>Refresh</Button>
            <Button variant={table.filtersOpen ? 'secondary' : 'ghost'} icon={Filter} onClick={() => table.setFiltersOpen((open) => !open)}>
              {table.filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {(table.search || Object.entries(table.filters).some(([, value]) => value !== 'All')) && (
              <Button variant="ghost" icon={X} onClick={table.reset}>Clear</Button>
            )}
          </>
        }
        right={
          <>
            <SearchInput id={`transfer-${scope}-search`} value={table.search} onChange={table.setSearch} placeholder="Search transfer, deliverable, project…" ariaLabel="Search transfers" />
            <Button
              variant="ghost"
              icon={Download}
              onClick={() => {
                exportCsv(`transfers-${scope}`, BASE_COLUMNS, exportRows);
                showToast('CSV export prepared.');
              }}
            >
              Export
            </Button>
            <Link className="erp-btn-primary" to="/transfers/new"><Plus aria-hidden="true" /> New Transfer</Link>
          </>
        }
        count={table.pageInfo}
      />

      {table.filtersOpen && (
        <div className="approvals-filter-panel transfers-filter-panel">
          <div className="approvals-filter-grid">
            <Select
              id={`transfer-${scope}-project`}
              label="Project"
              options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]}
              value={table.draftFilters.projectId}
              onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))}
            />
            <Select
              id={`transfer-${scope}-type`}
              label="Deliverable Type"
              options={[{ value: 'All', label: 'All Types' }, ...['BOM', 'Drawing', 'Manufacturing Package'].map((value) => ({ value, label: value }))]}
              value={table.draftFilters.type}
              onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, type: event.target.value }))}
            />
            <Select
              id={`transfer-${scope}-destination`}
              label="Destination"
              options={[{ value: 'All', label: 'All Destinations' }, ...DESTINATIONS.map((value) => ({ value, label: value }))]}
              value={table.draftFilters.destination}
              onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, destination: event.target.value }))}
            />
            <Select
              id={`transfer-${scope}-status`}
              label="Status"
              options={[{ value: 'All', label: 'All Statuses' }, ...TRANSFER_STATUSES.map((value) => ({ value, label: value }))]}
              value={table.draftFilters.status}
              onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, status: event.target.value }))}
            />
            <div className="filter-actions">
              <Button onClick={table.applyFilters}>Apply Filters</Button>
              <Button variant="ghost" onClick={table.reset}>Reset</Button>
            </div>
          </div>
        </div>
      )}

      <section className="table-card">
        <DataTable
          className="transfers-register-table"
          columns={BASE_COLUMNS}
          rows={table.pageRows}
          sortKey={table.sortKey}
          sortDirection={table.sortDirection}
          onSort={table.toggleSort}
          recordHref={(row) => `/transfers/${row.id}`}
          onRowClick={onView}
          rowActions={(row) => [
            { key: 'view', label: 'View transfer details', icon: Eye },
            { key: 'validate', label: 'Validate transfer', icon: ShieldCheck },
            ...(targetsFor('transfer', row).some((target) => target.enabled)
              ? [{ key: 'convert', label: 'Raise production query', icon: ArrowRightLeft }]
              : []),
            ...(!['Cancelled', 'Failed', 'Completed (Mock)'].includes(row.status)
              ? [{ key: 'cancel', label: 'Cancel transfer', icon: X, danger: true, divider: true }]
              : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') onView(row);
            if (key === 'cancel') onCancel(row);
            if (key === 'convert') openConversion('transfer', row);
            if (key === 'validate') {
              const result = validateTransfer(row.id);
              if (result.error) showToast(result.error, 'error');
              else if (result.blocking) showToast('Validation failed — mandatory checks block handover.', 'error');
              else showToast(`${row.id} validated.`);
            }
          }}
          ariaLabel="Transfer register"
          emptyContent={<EmptyState icon={PackageCheck} title="No transfer records" message="No transfers match the current search and filters." action={<Button variant="ghost" onClick={table.reset}>Clear Filters</Button>} />}
        />
        <Pagination
          page={table.page}
          totalPages={Math.max(1, Math.ceil(table.sorted.length / table.pageSize))}
          pageSize={table.pageSize}
          pageSizeOptions={[5, 10, 25]}
          pageInfo={table.pageInfo}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      </section>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function NewTransferSection() {
  const { transfers } = useTransfers();
  const drafts = transfers.filter((row) => row.status === 'Draft');
  return (
    <div className="transfers-new-section">
      <Card title="Create a controlled transfer" subtitle="Full-page form with eligibility, destination and validation checks">
        <div className="transfers-new-grid">
          <div className="transfers-new-copy">
            <span className="transfers-kicker">New transfer</span>
            <h2>Hand over an approved, released revision</h2>
            <p>
              Select a released BOM, drawing or manufacturing package, capture the exact revision and choose Purchase, Production or both. Save as
              draft, validate the record, then create the transfer.
            </p>
            <div className="transfers-new-actions">
              <Link className="erp-btn-primary" to="/transfers/new"><Plus aria-hidden="true" /> Open New Transfer Form</Link>
              <Link className="btn-secondary" to="/transfers">View Transfer Register</Link>
            </div>
          </div>
          <div className="transfers-new-rules">
            <h3>Entry rules</h3>
            <ul>
              <li>Source review and release references are mandatory.</li>
              <li>The exact approved revision is locked to the transfer.</li>
              <li>Purchase accepts eligible BOM/drawing releases.</li>
              <li>Production accepts released drawings and validated packages.</li>
              <li>Unapproved or unreleased revisions cannot be selected.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Saved drafts" subtitle="Drafts do not enter the handover workflow">
        {drafts.length ? (
          <div className="transfers-draft-list">
            {drafts.map((row) => (
              <div key={row.id} className="transfers-draft-row">
                <div>
                  <strong>{row.id}</strong>
                  <span>{row.deliverableNumber} Rev {row.revision} · {destinationLabel(row.destinations)}</span>
                </div>
                <TransferStatus status={row.status} />
                <Link className="btn-ghost" to={`/transfers/${row.id}/edit`}>Edit Draft</Link>
                <Link className="btn-ghost" to={`/transfers/${row.id}`}>View</Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="cell-muted">No draft transfers. Use New Transfer to create one.</p>
        )}
      </Card>
    </div>
  );
}

function ApprovedDeliverablesSection({ onCreate }) {
  const { transfers } = useTransfers();
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('All');
  const [type, setType] = useState('All');
  const [releaseTarget, setReleaseTarget] = useState(null);

  const rows = useMemo(
    () =>
      SOURCE_DELIVERABLES.filter((row) => {
        if (projectId !== 'All' && row.projectId !== projectId) return false;
        if (type !== 'All' && row.deliverableType !== type) return false;
        if (!search.trim()) return true;
        return [row.projectId, row.deliverableType, row.deliverableNumber, row.deliverableName, row.revision, row.reviewId, row.releaseId]
          .join(' ')
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      }).map((row) => {
        const related = transfers.filter((transfer) => transfer.deliverableNumber === row.deliverableNumber && transfer.revision === row.revision);
        return { ...row, related, transferStatus: related[0]?.status || 'Not Transferred' };
      }),
    [projectId, search, transfers, type],
  );

  return (
    <>
      <Card title="Approved deliverables" subtitle="Only approved and released revisions enter the transfer workflow">
        <Toolbar
          left={
            <>
              <Select id="approved-project-filter" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Filter approved deliverables by project" />
              <Select id="approved-type-filter" options={[{ value: 'All', label: 'All Types' }, ...['BOM', 'Drawing', 'Manufacturing Package'].map((value) => ({ value, label: value }))]} value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter approved deliverables by type" />
            </>
          }
          right={<SearchInput id="approved-deliverable-search" value={search} onChange={setSearch} placeholder="Search deliverable, release, project…" ariaLabel="Search approved deliverables" />}
          count={`${rows.length} approved release${rows.length === 1 ? '' : 's'}`}
        />
        <ManageColumns {...registerColumns.managerProps} />
        <div className="table-wrap">
          <table className="data-table table-fixed-cols" aria-label="Approved deliverables">
            <thead>
              <tr>
                {registerColumns.isVisible('project') && <th>Project</th>}
                {registerColumns.isVisible('type') && <th>Deliverable Type</th>}
                {registerColumns.isVisible('number') && <th>Deliverable Number</th>}
                {registerColumns.isVisible('revision') && <th>Exact Approved Revision</th>}
                {registerColumns.isVisible('review') && <th>Review ID</th>}
                {registerColumns.isVisible('release') && <th>Release ID</th>}
                {registerColumns.isVisible('releaseDate') && <th>Release Date</th>}
                {registerColumns.isVisible('purchase') && <th>Purchase Eligibility</th>}
                {registerColumns.isVisible('production') && <th>Production Eligibility</th>}
                {registerColumns.isVisible('status') && <th>Transfer Status</th>}
                {registerColumns.isVisible('actions') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  {registerColumns.isVisible('project') && <td><span className="transfers-project-cell"><strong>{row.projectId}</strong><small>{projectLabel(row.projectId).split(' · ')[1]}</small></span></td>}
                  {registerColumns.isVisible('type') && <td>{row.deliverableType}</td>}
                  {registerColumns.isVisible('number') && <td className="cell-strong">{row.deliverableNumber}</td>}
                  {registerColumns.isVisible('revision') && <td><span className="approvals-exact-rev">Rev {row.revision}</span></td>}
                  {registerColumns.isVisible('review') && <td className="cell-id">{row.reviewId}</td>}
                  {registerColumns.isVisible('release') && <td className="cell-id">{row.releaseId}</td>}
                  {registerColumns.isVisible('releaseDate') && <td>{formatDate(row.releaseDate)}</td>}
                  {registerColumns.isVisible('purchase') && <td>{row.purchaseEligible ? <StatusBadge status="Eligible" tone="green" /> : <StatusBadge status="Not eligible" tone="gray" />}</td>}
                  {registerColumns.isVisible('production') && <td>{row.productionEligible ? <StatusBadge status="Eligible" tone="green" /> : <StatusBadge status="Not eligible" tone="gray" />}</td>}
                  {registerColumns.isVisible('status') && <td><TransferStatus status={row.transferStatus} /></td>}
                  {registerColumns.isVisible('actions') && (
                  <td>
                    <div className="transfers-row-actions">
                      <Button variant="ghost" size="sm" icon={Eye} onClick={() => setReleaseTarget(row)}>Release</Button>
                      <Button variant="secondary" size="sm" icon={Plus} onClick={() => onCreate(row.id)}>Transfer</Button>
                    </div>
                  </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={registerColumns.visibleCount}><EmptyState icon={FileCheck2} title="No approved deliverables" message="No released deliverables match the selected filters." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="approvals-note transfers-source-note">
        Source records are read-only reference fixtures tied to the design release register. A source release is never edited or replaced by this module.
        {ELIGIBLE_SOURCES.length} of {SOURCE_DELIVERABLES.length} reference releases are transfer-eligible.
      </p>

      <Modal
        open={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        title="Source release reference"
        subtitle={releaseTarget ? `${releaseTarget.deliverableNumber} Rev ${releaseTarget.revision}` : ''}
        maxWidth="max-w-xl"
        footer={<Button variant="ghost" onClick={() => setReleaseTarget(null)}>Close</Button>}
      >
        {releaseTarget && (
          <>
            <div className="fact-grid">
              <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(releaseTarget.projectId)}</span></div>
              <div className="fact"><span className="fact-label">Review</span><span className="fact-value">{releaseTarget.reviewId}</span></div>
              <div className="fact"><span className="fact-label">Release</span><span className="fact-value">{releaseTarget.releaseId}</span></div>
              <div className="fact"><span className="fact-label">Released</span><span className="fact-value">{formatDate(releaseTarget.releaseDate)}</span></div>
              <div className="fact"><span className="fact-label">Release owner</span><span className="fact-value">{releaseTarget.releaseOwner}</span></div>
              <div className="fact"><span className="fact-label">Source module</span><span className="fact-value">{releaseTarget.sourceModule}</span></div>
            </div>
            <div className="approvals-note-block"><ShieldCheck aria-hidden="true" /><p>Approval and release references are locked. A newer revision requires its own approval, release and transfer record.</p></div>
            <div className="transfers-attachments">
              <strong>Release attachments</strong>
              {releaseTarget.attachments?.length ? releaseTarget.attachments.map((row) => (
                <div className="transfers-attachment is-static" key={row.name}><FileText aria-hidden="true" /><span>{row.name}</span><small>{formatBytes(row.size)}</small></div>
              )) : <span className="cell-muted">No attachments recorded.</span>}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function ValidationSection() {
  const { transfers, validateTransfer } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const [selectedId, setSelectedId] = useState(transfers[0]?.id || '');
  const selected = transfers.find((row) => row.id === selectedId) || transfers[0];

  return (
    <>
      <Card title="Transfer validation" subtitle="Common and destination-specific gates">
        <Toolbar
          left={<Select id="validation-transfer-select" label="Transfer" options={transfers.map((row) => ({ value: row.id, label: `${row.id} · ${row.deliverableNumber} Rev ${row.revision}` }))} value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)} />}
          right={
            <Button
              icon={ShieldCheck}
              onClick={() => {
                const result = validateTransfer(selected.id);
                if (result.error) showToast(result.error, 'error');
                else if (result.blocking) showToast('Mandatory checks failed; handover is blocked.', 'error');
                else showToast('Validation passed for all mandatory checks.');
              }}
            >
              Validate Selected Transfer
            </Button>
          }
          count={selected ? `${selected.id} · ${selected.status}` : ''}
        />
      </Card>
      {selected && (
        <>
          <div className="fact-grid transfers-validation-facts">
            <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(selected.projectId)}</span></div>
            <div className="fact"><span className="fact-label">Deliverable</span><span className="fact-value">{selected.deliverableNumber} Rev {selected.revision}</span></div>
            <div className="fact"><span className="fact-label">Destination</span><span className="fact-value"><DestinationBadges destinations={selected.destinations} compact /></span></div>
            <div className="fact"><span className="fact-label">Source release</span><span className="fact-value">{selected.releaseId}</span></div>
          </div>
          <ValidationResults validation={selected.validation} />
          <div className="transfers-validation-explain">
            <p><strong>Valid</strong> checks passed. <strong>Warning</strong> does not block handover but must be reviewed. <strong>Not Applicable</strong> is outside the selected destination scope. Any failed <strong>Mandatory</strong> check blocks transfer creation or handover for the affected destination.</p>
          </div>
        </>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function DetailsSection({ selectedId, setSelectedId }) {
  const { transfers } = useTransfers();
  const selected = transfers.find((row) => row.id === selectedId) || transfers[0];
  return (
    <>
      <Toolbar
        left={<Select id="details-transfer-select" label="Transfer details" options={transfers.map((row) => ({ value: row.id, label: `${row.id} · ${row.deliverableNumber} Rev ${row.revision}` }))} value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)} />}
        right={<Link className="btn-secondary" to={selected ? `/transfers/${selected.id}` : '/transfers'}>Open Full Page</Link>}
        count={selected ? `${selected.status} · ${destinationLabel(selected.destinations)}` : ''}
      />
      {selected && <TransferDetailView transfer={selected} embedded />}
    </>
  );
}

export default function TransferRegisterTab() {
  const registerColumns = useTableColumnVisibility('/transfers#deliverables', [
    { key: 'project', label: 'Project' },
    { key: 'type', label: 'Deliverable Type' },
    { key: 'number', label: 'Deliverable Number' },
    { key: 'revision', label: 'Exact Approved Revision' },
    { key: 'review', label: 'Review ID' },
    { key: 'release', label: 'Release ID' },
    { key: 'releaseDate', label: 'Release Date' },
    { key: 'purchase', label: 'Purchase Eligibility' },
    { key: 'production', label: 'Production Eligibility' },
    { key: 'status', label: 'Transfer Status' },
    { key: 'actions', label: 'Actions' },
  ], { mandatory: ['actions'] });
  const navigate = useNavigate();
  const { transfers, cancelTransfer } = useTransfers();
  const [section, setSection] = useState('all');
  const [selectedId, setSelectedId] = useState(transfers[0]?.id || '');
  const [cancelTarget, setCancelTarget] = useState(null);
  const { toast, showToast, clearToast } = useToast();

  const pendingRows = useMemo(
    () => transfers.filter((row) => ['Draft', 'Validation Pending', 'Invalid', 'Ready for Transfer', 'Awaiting Handover', 'Awaiting Acknowledgement', 'Partially Acknowledged'].includes(row.status)),
    [transfers],
  );

  const counts = {
    all: transfers.length,
    new: transfers.filter((row) => row.status === 'Draft').length,
    approved: SOURCE_DELIVERABLES.length,
    pending: pendingRows.length,
    details: undefined,
    validation: transfers.filter((row) => !row.validation).length,
  };

  const viewTransfer = (row) => {
    setSelectedId(row.id);
    setSection('details');
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />

      {section === 'all' && <TransferList rows={transfers} scope="all" onView={viewTransfer} onCancel={setCancelTarget} />}
      {section === 'new' && <NewTransferSection />}
      {section === 'approved' && <ApprovedDeliverablesSection onCreate={(sourceId) => navigate(`/transfers/new?source=${sourceId}`)} />}
      {section === 'pending' && <TransferList rows={pendingRows} scope="pending" onView={viewTransfer} onCancel={setCancelTarget} />}
      {section === 'details' && <DetailsSection selectedId={selectedId} setSelectedId={setSelectedId} />}
      {section === 'validation' && <ValidationSection />}

      <CancelDialog
        open={Boolean(cancelTarget)}
        transfer={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSubmit={(config) => {
          const result = cancelTransfer(cancelTarget.id, config);
          if (!result.error) showToast('Transfer cancelled; history retained.');
          return result;
        }}
      />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
