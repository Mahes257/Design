import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  MessageSquarePlus,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
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
  Textarea,
  Toolbar,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useTransfers } from '../../context/TransfersContext';
import {
  PROJECTS,
  PURCHASE_STATUSES,
  TODAY,
  WORKFLOW_STAGES,
  WORKFLOW_STATUSES,
  formatDate,
  projectLabel,
  sourceFor,
  transferStatusTone,
} from '../../data/transfersData';
import exportCsv from '../../utils/exportCsv';
import {
  AcknowledgementDialog,
  AttachmentDialog,
  CommentDialog,
  CommentsPanel,
  DestinationBadges,
  HandoverDialog,
  SectionNav,
  Toast,
  TransferStatus,
  TransferTimeline,
  ValidationResults,
  formatBytes,
  useToast,
  useTransferTable,
} from './transfersUi';

const SECTIONS = [
  { key: 'bom', label: 'BOM Transfer' },
  { key: 'requisition', label: 'Material Requisition' },
  { key: 'status', label: 'Purchase Status' },
  { key: 'workflow', label: 'CPP / CPR / TV / CPO Workflow' },
  { key: 'handover', label: 'Purchase Handover Details' },
];

function purchaseTransfers(transfers) {
  return transfers.filter((row) => row.destinations?.includes('Purchase'));
}

function transferBomRows(transfers) {
  return purchaseTransfers(transfers)
    .map((row) => {
      const source = sourceFor(row);
      const isBom = row.deliverableType === 'BOM';
      const bomNumber = isBom ? row.deliverableNumber : source?.bomNumber || row.purchase?.requisitions?.[0]?.bomNumber || '';
      const bomRevision = isBom ? row.revision : source?.bomRevision || row.purchase?.requisitions?.[0]?.bomRevision || '';
      const items = source?.bomItems || [];
      return {
        ...row,
        source,
        bomNumber,
        bomRevision,
        assembly: source?.assembly || source?.deliverableName || '—',
        totalItems: isBom ? source?.totalItems || items.length : items.length,
        buyItems: items.filter((item) => item.category === 'Buy').length,
        makeItems: items.filter((item) => item.category === 'Make').length,
        purchaseStatus: row.purchase?.status || 'Not Prepared',
      };
    })
    .filter((row) => row.bomNumber);
}

function useDetailState() {
  const [target, setTarget] = useState(null);
  const [kind, setKind] = useState('');
  const open = (row, nextKind) => {
    setTarget(row);
    setKind(nextKind);
  };
  return { target, kind, open, close: () => setTarget(null) };
}

function DetailDialog({ target, kind, onClose, attachment, setAttachment }) {
  if (!target) return null;
  const handover = target.purchase?.handover;
  const acknowledgement = target.purchase?.acknowledgement;
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title={
        kind === 'source'
          ? 'Source release reference'
          : kind === 'validation'
            ? 'Purchase transfer validation'
            : kind === 'handover'
              ? 'Purchase handover details'
              : 'BOM transfer details'
      }
      subtitle={`${target.id} · ${target.deliverableNumber} Rev ${target.revision}`}
      maxWidth="max-w-2xl"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {kind === 'validation' ? (
        <ValidationResults validation={target.validation} />
      ) : kind === 'source' ? (
        <>
          <div className="fact-grid">
            <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(target.projectId)}</span></div>
            <div className="fact"><span className="fact-label">Deliverable</span><span className="fact-value">{target.source?.deliverableNumber || target.deliverableNumber}</span></div>
            <div className="fact"><span className="fact-label">Exact revision</span><span className="fact-value">Rev {target.revision}</span></div>
            <div className="fact"><span className="fact-label">Review</span><span className="fact-value">{target.reviewId}</span></div>
            <div className="fact"><span className="fact-label">Release</span><span className="fact-value">{target.releaseId}</span></div>
            <div className="fact"><span className="fact-label">Released</span><span className="fact-value">{formatDate(target.releaseDate)}</span></div>
            <div className="fact"><span className="fact-label">Source module</span><span className="fact-value">{target.sourceModule}</span></div>
            <div className="fact"><span className="fact-label">BOM</span><span className="fact-value">{target.bomNumber} Rev {target.bomRevision}</span></div>
          </div>
          <div className="approvals-note-block"><ShieldCheck aria-hidden="true" /><p>The exact release and revision are locked to this transfer. A new revision must be released and transferred separately.</p></div>
          <div className="transfers-attachments">
            <strong>Release attachments</strong>
            {target.attachments?.length ? target.attachments.map((row) => (
              <button key={row.name} type="button" className="transfers-attachment" onClick={() => setAttachment(row)}>
                <FileText aria-hidden="true" /><span>{row.name}</span><small>{formatBytes(row.size)}</small>
              </button>
            )) : <span className="cell-muted">No attachments recorded.</span>}
          </div>
        </>
      ) : kind === 'handover' ? (
        handover ? (
          <>
            <div className="fact-grid">
              <div className="fact"><span className="fact-label">Transfer</span><span className="fact-value">{target.id}</span></div>
              <div className="fact"><span className="fact-label">Handover reference</span><span className="fact-value">{handover.id}</span></div>
              <div className="fact"><span className="fact-label">Handover date</span><span className="fact-value">{formatDate(handover.date)}</span></div>
              <div className="fact"><span className="fact-label">Receiving owner</span><span className="fact-value">{handover.owner}</span></div>
              <div className="fact"><span className="fact-label">Prepared by</span><span className="fact-value">{handover.preparedBy}</span></div>
              <div className="fact"><span className="fact-label">Acknowledgement</span><span className="fact-value">{acknowledgement?.status || 'Pending'}</span></div>
              <div className="fact"><span className="fact-label">Acknowledged by</span><span className="fact-value">{acknowledgement?.owner || '—'}</span></div>
              <div className="fact"><span className="fact-label">BOM revision</span><span className="fact-value">{handover.snapshot?.bomRevision || target.bomRevision}</span></div>
            </div>
            {acknowledgement?.comments && <div className="approvals-note-block"><MessageSquarePlus aria-hidden="true" /><p>{acknowledgement.comments}</p></div>}
            <div className="transfers-content-lines">
              <strong>Supporting documents</strong>
              {handover.documents?.length ? handover.documents.map((doc) => <span key={doc}>{doc}</span>) : <span className="cell-muted">No documents recorded.</span>}
            </div>
          </>
        ) : <p className="cell-muted">No Purchase handover has been recorded for this transfer.</p>
      ) : (
        <>
          <div className="transfers-content-summary">
            <span><strong>{target.totalItems}</strong> total items</span>
            <span><strong>{target.buyItems}</strong> buy</span>
            <span><strong>{target.makeItems}</strong> make</span>
            <span><strong>{target.bomRevision}</strong> BOM revision</span>
          </div>
          <ManageColumns {...purchaseBomColumns.managerProps} />
          <div className="table-wrap transfers-dialog-table">
            <table className="data-table transfers-compact-table" aria-label="BOM transfer items">
              <thead>
                <tr>
                  {purchaseBomColumns.isVisible('partNumber') && <th>Part Number</th>}
                  {purchaseBomColumns.isVisible('description') && <th>Description</th>}
                  {purchaseBomColumns.isVisible('qty') && <th>Qty</th>}
                  {purchaseBomColumns.isVisible('unit') && <th>Unit</th>}
                  {purchaseBomColumns.isVisible('category') && <th>Category</th>}
                  {purchaseBomColumns.isVisible('material') && <th>Material</th>}
                  {purchaseBomColumns.isVisible('drawing') && <th>Drawing</th>}
                  {purchaseBomColumns.isVisible('notes') && <th>Purchase Notes</th>}
                </tr>
              </thead>
              <tbody>
                {(target.source?.bomItems || []).map((item) => (
                  <tr key={item.id}>
                    {purchaseBomColumns.isVisible('partNumber') && <td className="cell-id">{item.partNumber}</td>}
                    {purchaseBomColumns.isVisible('description') && <td>{item.description}</td>}
                    {purchaseBomColumns.isVisible('qty') && <td>{item.qty}</td>}
                    {purchaseBomColumns.isVisible('unit') && <td>{item.unit}</td>}
                    {purchaseBomColumns.isVisible('category') && <td>{item.category}</td>}
                    {purchaseBomColumns.isVisible('material') && <td>{item.materialReference}</td>}
                    {purchaseBomColumns.isVisible('drawing') && <td>{item.drawingReference}</td>}
                    {purchaseBomColumns.isVisible('notes') && <td>{item.purchaseNotes}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="transfers-content-lines">
            <strong>Material requirements</strong>
            {(target.source?.materials || []).map((material) => <span key={material.id}>{material.materialCode} · {material.description} · {material.qty} {material.unit}</span>)}
          </div>
        </>
      )}
    </Modal>
  );
}

function BomTransferSection({ onOpenDetail }) {
  const { transfers } = useTransfers();
  const rows = useMemo(() => transferBomRows(transfers), [transfers]);
  const table = useTransferTable(rows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.revision !== 'All' && row.bomRevision !== filters.revision) return false;
    if (filters.status !== 'All' && row.purchaseStatus !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.projectId, row.bomNumber, row.bomRevision, row.assembly, row.purchaseStatus].join(' ').toLowerCase().includes(query);
  }, { initialFilters: { projectId: 'All', revision: 'All', status: 'All' } });

  return (
    <>
      <Toolbar
        left={
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={table.reset}>Refresh</Button>
            <Button variant="ghost" icon={Filter} onClick={() => table.setFiltersOpen((open) => !open)}>{table.filtersOpen ? 'Hide Filters' : 'Show Filters'}</Button>
          </>
        }
        right={<SearchInput id="purchase-bom-search" value={table.search} onChange={table.setSearch} placeholder="Search BOM, project, assembly…" ariaLabel="Search BOM transfers" />}
        count={table.pageInfo}
      />
      {table.filtersOpen && (
        <div className="approvals-filter-panel transfers-filter-panel">
          <div className="approvals-filter-grid">
            <Select id="purchase-bom-project" label="Project" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={table.draftFilters.projectId} onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))} />
            <Select id="purchase-bom-revision" label="BOM Revision" options={[{ value: 'All', label: 'All Revisions' }, ...[...new Set(rows.map((row) => row.bomRevision))].sort().map((value) => ({ value, label: `Rev ${value}` }))]} value={table.draftFilters.revision} onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, revision: event.target.value }))} />
            <Select id="purchase-bom-status" label="Purchase Status" options={[{ value: 'All', label: 'All Statuses' }, ...PURCHASE_STATUSES.map((value) => ({ value, label: value }))]} value={table.draftFilters.status} onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, status: event.target.value }))} />
            <div className="filter-actions"><Button onClick={table.applyFilters}>Apply Filters</Button><Button variant="ghost" onClick={table.reset}>Reset</Button></div>
          </div>
        </div>
      )}
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', sortable: true, width: 126, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'bomNumber', label: 'BOM Number', sortable: true, width: 138, render: (row) => <span className="cell-strong">{row.bomNumber}</span> },
            { key: 'bomRevision', label: 'BOM Revision', width: 105, render: (row) => <span className="approvals-exact-rev">Rev {row.bomRevision}</span> },
            { key: 'assembly', label: 'Assembly', width: 220 },
            { key: 'totalItems', label: 'Total Items', width: 95, align: 'center' },
            { key: 'buyItems', label: 'Buy Items', width: 90, align: 'center' },
            { key: 'makeItems', label: 'Make Items', width: 95, align: 'center' },
            { key: 'transferDate', label: 'Transfer Date', sortable: true, width: 120, render: (row) => formatDate(row.transferDate) },
            { key: 'purchaseStatus', label: 'Purchase Status', width: 180, render: (row) => <StatusBadge status={row.purchaseStatus} tone={transferStatusTone(row.purchaseStatus)} /> },
          ]}
          rows={table.pageRows}
          sortKey={table.sortKey}
          sortDirection={table.sortDirection}
          onSort={table.toggleSort}
          rowActions={() => [
            { key: 'bom', label: 'View BOM details', icon: Eye },
            { key: 'source', label: 'View source release', icon: FileText },
            { key: 'validation', label: 'View transfer validation', icon: ShieldCheck },
            { key: 'handover', label: 'View handover details', icon: PackageCheck },
          ]}
          onRowAction={(key, row) => onOpenDetail(row, key)}
          ariaLabel="BOM transfer register"
          emptyContent={<EmptyState icon={PackageCheck} title="No BOM transfers" message="No Purchase transfers with BOM information match the filters." />}
        />
        <Pagination page={table.page} totalPages={Math.max(1, Math.ceil(table.sorted.length / table.pageSize))} pageSize={table.pageSize} pageSizeOptions={[5, 10, 25]} pageInfo={table.pageInfo} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
      </section>
    </>
  );
}

function RequisitionDialog({ open, onClose, transfers, initial, onSave }) {
  const sourceTransfers = purchaseTransfers(transfers).filter((row) => !row.cancellation && !row.failure);
  const [transferId, setTransferId] = useState(initial?.transferId || sourceTransfers[0]?.id || '');
  const [form, setForm] = useState({
    materialCode: initial?.materialCode || '',
    description: initial?.description || '',
    specification: initial?.specification || '',
    qty: initial?.qty || '',
    unit: initial?.unit || '',
    requiredDate: initial?.requiredDate || '',
    supplier: initial?.supplier || '',
    remarks: initial?.remarks || '',
  });
  const [error, setError] = useState('');
  const selectedTransfer = sourceTransfers.find((row) => row.id === transferId);
  const source = sourceFor(selectedTransfer);
  const materials = source?.materials || [];

  if (!open) return null;

  const chooseMaterial = (code) => {
    const material = materials.find((row) => row.materialCode === code || row.id === code);
    setForm((previous) => ({
      ...previous,
      materialCode: code,
      description: material?.description || previous.description,
      specification: material?.specification || previous.specification,
      qty: material?.qty || previous.qty,
      unit: material?.unit || previous.unit,
      requiredDate: material?.requiredDate || previous.requiredDate,
      supplier: material?.supplier || previous.supplier,
      remarks: material?.remarks || previous.remarks,
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Material Requisition Draft' : 'Create Material Requisition Draft'}
      subtitle="Frontend mock handover record — not an ERP requisition"
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={Plus}
            onClick={() => {
              if (!transferId || !form.materialCode || !form.description || !form.qty) {
                setError('Transfer, material, description and quantity are required.');
                return;
              }
              const result = onSave(selectedTransfer, {
                ...initial,
                ...form,
                id: initial?.id || '',
                status: initial?.status || 'Draft',
                transferId,
                author: 'N. Joshi',
              });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Save Draft
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select
          id="requisition-transfer"
          label="Transfer / Project"
          options={sourceTransfers.map((row) => ({ value: row.id, label: `${row.id} · ${row.projectId} · ${row.deliverableNumber}` }))}
          value={transferId}
          onChange={(event) => {
            setTransferId(event.target.value);
            setForm((previous) => ({ ...previous, materialCode: '' }));
          }}
          className="span-2"
        />
        <div className="fact"><span className="fact-label">Source BOM</span><span className="fact-value">{source?.bomNumber || selectedTransfer?.deliverableNumber || '—'} Rev {source?.bomRevision || selectedTransfer?.revision || '—'}</span></div>
        <div className="fact"><span className="fact-label">Requisition reference</span><span className="fact-value">{initial?.id || 'Auto-generated on save'}</span></div>
        <Select
          id="requisition-material"
          label="Material Requirement"
          options={[{ value: '', label: 'Select a material requirement' }, ...materials.map((row) => ({ value: row.materialCode, label: `${row.materialCode} · ${row.description}` }))]}
          value={form.materialCode}
          onChange={(event) => chooseMaterial(event.target.value)}
        />
        <Select
          id="requisition-supplier"
          label="Preferred Supplier Reference"
          options={[{ value: '', label: 'No preferred supplier' }, ...[...new Set(materials.map((row) => row.supplier).filter(Boolean))].map((value) => ({ value, label: value }))]}
          value={form.supplier}
          onChange={(event) => setForm((previous) => ({ ...previous, supplier: event.target.value }))}
        />
        <div className="form-field span-2">
          <label className="form-label" htmlFor="requisition-description">Material Description</label>
          <input id="requisition-description" className="form-input" value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
        </div>
        <div className="form-field span-2">
          <label className="form-label" htmlFor="requisition-specification">Specification</label>
          <input id="requisition-specification" className="form-input" value={form.specification} onChange={(event) => setForm((previous) => ({ ...previous, specification: event.target.value }))} />
        </div>
        <div className="form-field"><label className="form-label" htmlFor="requisition-qty">Required Quantity</label><input id="requisition-qty" className="form-input" type="number" min="0" step="0.1" value={form.qty} onChange={(event) => setForm((previous) => ({ ...previous, qty: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="requisition-unit">Unit</label><input id="requisition-unit" className="form-input" value={form.unit} onChange={(event) => setForm((previous) => ({ ...previous, unit: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="requisition-required">Required Date</label><input id="requisition-required" className="form-input" type="date" value={form.requiredDate} onChange={(event) => setForm((previous) => ({ ...previous, requiredDate: event.target.value }))} /></div>
        <div className="form-field span-2"><label className="form-label" htmlFor="requisition-remarks">Remarks</label><textarea id="requisition-remarks" className="form-input" rows={2} value={form.remarks} onChange={(event) => setForm((previous) => ({ ...previous, remarks: event.target.value }))} /></div>
        <div className="approvals-note-block span-2"><ShoppingCart aria-hidden="true" /><p>This is a material requisition draft stored in Module 11 only. It does not create an ERP Purchase requisition, RFQ, purchase order or supplier communication.</p></div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function MaterialRequisitionSection() {
  const { transfers, saveRequisition, updateRequisitionStatus } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const [editor, setEditor] = useState(null);
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(
    () =>
      purchaseTransfers(transfers).flatMap((transfer) =>
        (transfer.purchase?.requisitions || []).map((requisition) => ({
          ...requisition,
          transferId: transfer.id,
          transfer,
          projectName: projectLabel(requisition.projectId || transfer.projectId),
        })),
      ),
    [transfers],
  );

  const filtered = rows.filter((row) => {
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
    if (!search.trim()) return true;
    return [row.id, row.projectId, row.bomNumber, row.bomRevision, row.materialCode, row.description, row.specification, row.sourceId].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`;

  const handleStatus = (row, status) => {
    const result = updateRequisitionStatus(row.transferId, row.id, status);
    if (result.error) showToast(result.error, 'error');
    else showToast(`Requisition ${status.toLowerCase()}.`);
  };

  return (
    <>
      <Toolbar
        left={
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={() => { setSearch(''); setStatusFilter('All'); setProjectFilter('All'); }}>Refresh</Button>
            <Select id="requisition-status-filter" options={[{ value: 'All', label: 'All Statuses' }, ...['Draft', 'Validated', 'Prepared', 'Requisition Raised (Mock)'].map((value) => ({ value, label: value }))]} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter requisitions by status" />
            <Select id="requisition-project-filter" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setPage(1); }} aria-label="Filter requisitions by project" />
          </>
        }
        right={
          <>
            <SearchInput id="requisition-search" value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search requisition, material, BOM…" ariaLabel="Search material requisitions" />
            <Button icon={Plus} onClick={() => setEditor({ initial: null })}>Create Requisition Draft</Button>
          </>
        }
        count={pageInfo}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Requisition Reference', width: 150, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 180, render: (row) => row.projectName },
            { key: 'bomNumber', label: 'Source BOM', width: 130 },
            { key: 'bomRevision', label: 'BOM Revision', width: 100, render: (row) => `Rev ${row.bomRevision}` },
            { key: 'materialCode', label: 'Material Code', width: 120 },
            { key: 'description', label: 'Material Description', width: 210 },
            { key: 'qty', label: 'Required Quantity', width: 130, render: (row) => `${row.qty} ${row.unit}` },
            { key: 'requiredDate', label: 'Required Date', width: 120, render: (row) => formatDate(row.requiredDate) },
            { key: 'supplier', label: 'Preferred Supplier Reference', width: 220, render: (row) => row.supplier || '—' },
            { key: 'status', label: 'Status', width: 160, render: (row) => <StatusBadge status={row.status} tone={transferStatusTone(row.status)} /> },
          ]}
          rows={pageRows}
          onRowClick={(row) => setDetails(row)}
          rowActions={(row) => [
            { key: 'view', label: 'View details', icon: Eye },
            ...(row.status === 'Draft' ? [{ key: 'edit', label: 'Edit draft', icon: Pencil }] : []),
            ...(['Draft', 'Validated'].includes(row.status) ? [{ key: 'validate', label: 'Validate requisition', icon: ShieldCheck }] : []),
            ...(row.status === 'Validated' ? [{ key: 'prepare', label: 'Mark as Prepared', icon: ClipboardCheck }] : []),
            ...(row.status === 'Prepared' ? [{ key: 'raise', label: 'Raise mock requisition', icon: ShoppingCart, divider: true }] : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') setDetails(row);
            if (key === 'edit') setEditor({ initial: row });
            if (key === 'validate') handleStatus(row, 'Validated');
            if (key === 'prepare') handleStatus(row, 'Prepared');
            if (key === 'raise') handleStatus(row, 'Requisition Raised (Mock)');
          }}
          ariaLabel="Material requisitions"
          emptyContent={<EmptyState icon={ClipboardCheck} title="No requisitions" message="No material requisitions match the current filters." />}
        />
        <Pagination page={currentPage} totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))} pageSize={pageSize} pageSizeOptions={[5, 10, 25]} pageInfo={pageInfo} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </section>

      <RequisitionDialog
        key={editor ? `requisition-${editor.initial?.id || 'new'}` : 'requisition-closed'}
        open={Boolean(editor)}
        transfers={transfers}
        initial={editor?.initial}
        onClose={() => setEditor(null)}
        onSave={(transfer, req) => {
          const result = saveRequisition(transfer.id, req);
          if (!result.error) showToast('Requisition draft saved locally.');
          return result;
        }}
      />

      <Modal open={Boolean(details)} onClose={() => setDetails(null)} title="Material Requisition Details" subtitle={details ? `${details.id} · ${details.projectId}` : ''} maxWidth="max-w-xl" footer={<Button variant="ghost" onClick={() => setDetails(null)}>Close</Button>}>
        {details && (
          <div className="fact-grid">
            <div className="fact"><span className="fact-label">Requisition</span><span className="fact-value">{details.id}</span></div>
            <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(details.projectId)}</span></div>
            <div className="fact"><span className="fact-label">Source BOM</span><span className="fact-value">{details.bomNumber} Rev {details.bomRevision}</span></div>
            <div className="fact"><span className="fact-label">Material</span><span className="fact-value">{details.materialCode} · {details.description}</span></div>
            <div className="fact"><span className="fact-label">Specification</span><span className="fact-value">{details.specification}</span></div>
            <div className="fact"><span className="fact-label">Quantity</span><span className="fact-value">{details.qty} {details.unit}</span></div>
            <div className="fact"><span className="fact-label">Required date</span><span className="fact-value">{formatDate(details.requiredDate)}</span></div>
            <div className="fact"><span className="fact-label">Preferred supplier</span><span className="fact-value">{details.supplier || '—'}</span></div>
            <div className="fact"><span className="fact-label">Status</span><span className="fact-value"><StatusBadge status={details.status} tone={transferStatusTone(details.status)} /></span></div>
            <div className="fact"><span className="fact-label">Remarks</span><span className="fact-value">{details.remarks || '—'}</span></div>
          </div>
        )}
      </Modal>
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function PurchaseStatusDialog({ open, transfer, onClose, onSubmit }) {
  const [status, setStatus] = useState(transfer?.purchase?.status || 'In Purchase Processing (Mock)');
  const [remarks, setRemarks] = useState(transfer?.purchase?.progress?.remarks || '');
  const [error, setError] = useState('');
  if (!open || !transfer) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update Mock Purchase Status"
      subtitle={`${transfer.id} · ${transfer.deliverableNumber}`}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={ShoppingCart}
            onClick={() => {
              const result = onSubmit({ status, remarks });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Record Status
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Select id="purchase-mock-status" label="Purchase status" options={PURCHASE_STATUSES.map((value) => ({ value, label: value }))} value={status} onChange={(event) => setStatus(event.target.value)} />
        <Textarea id="purchase-mock-remarks" label="Remarks" className="span-2" rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Mock progress note. No ERP transaction is created." />
        <div className="approvals-note-block span-2"><ShoppingCart aria-hidden="true" /><p>Status is local to Module 11. Actual procurement progress remains in the ERP Purchase module.</p></div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function PurchaseStatusSection() {
  const { transfers, updatePurchaseStatus } = useTransfers();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const [target, setTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const rows = purchaseTransfers(transfers).map((row) => ({
    ...row,
    requisitionRefs: (row.purchase?.requisitions || []).map((req) => req.id).join(', ') || '—',
    lastUpdated: row.updatedAt || row.transferDate,
    remarks: row.purchase?.progress?.remarks || '',
  }));
  const filtered = rows.filter((row) => {
    if (statusFilter !== 'All' && row.purchase.status !== statusFilter) return false;
    if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
    if (!search.trim()) return true;
    return [row.id, row.projectId, row.deliverableNumber, row.purchase.status, row.requisitionRefs].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });
  return (
    <>
      <Toolbar
        left={<>
          <Select id="purchase-status-filter" options={[{ value: 'All', label: 'All Statuses' }, ...PURCHASE_STATUSES.map((value) => ({ value, label: value }))]} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter purchase status" />
          <Select id="purchase-status-project" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter purchase status by project" />
        </>}
        right={<SearchInput id="purchase-status-search" value={search} onChange={setSearch} placeholder="Search transfer, BOM, requisition…" ariaLabel="Search purchase status" />}
        count={`${filtered.length} Purchase transfer(s)`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'deliverableNumber', label: 'BOM Number', width: 135 },
            { key: 'revision', label: 'Revision', width: 85, render: (row) => `Rev ${row.revision}` },
            { key: 'requisitionRefs', label: 'Requisition Reference', width: 180 },
            { key: 'purchaseStatus', label: 'Current Status', width: 190, render: (row) => <StatusBadge status={row.purchase.status} tone={transferStatusTone(row.purchase.status)} /> },
            { key: 'lastUpdated', label: 'Last Updated', width: 125, render: (row) => formatDate(row.lastUpdated) },
            { key: 'remarks', label: 'Remarks', width: 260 },
          ]}
          rows={filtered}
          onRowClick={(row) => setTarget(row)}
          rowActions={(row) => [
            { key: 'view', label: 'View transfer details', icon: Eye },
            { key: 'update', label: 'Update mock status', icon: ShoppingCart },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/transfers/${row.id}`);
            if (key === 'update') setTarget(row);
          }}
          ariaLabel="Purchase status"
          emptyContent={<EmptyState icon={ShoppingCart} title="No Purchase status records" message="No Purchase transfers match the filters." />}
        />
      </section>
      <PurchaseStatusDialog
        key={target?.id || 'purchase-status-closed'}
        open={Boolean(target)}
        transfer={target}
        onClose={() => setTarget(null)}
        onSubmit={(config) => {
          const result = updatePurchaseStatus(target.id, { ...config, by: 'N. Joshi' });
          if (!result.error) showToast('Mock Purchase status updated.');
          return result;
        }}
      />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function WorkflowDialog({ open, row, onClose, onSubmit }) {
  const [status, setStatus] = useState(row?.status || 'Pending');
  const [owner, setOwner] = useState(row?.owner || 'Purchase — Sourcing cell');
  const [targetDate, setTargetDate] = useState(row?.targetDate || '');
  const [completionDate, setCompletionDate] = useState(row?.completionDate || '');
  const [remarks, setRemarks] = useState(row?.remarks || '');
  const [attachments, setAttachments] = useState((row?.attachments || []).join(', '));
  const [error, setError] = useState('');
  if (!open || !row) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${row.stage} Workflow Record`}
      subtitle={`${row.reference} · ${row.transferId}`}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={ClipboardCheck}
            onClick={() => {
              if (!owner.trim()) {
                setError('An assigned owner is required.');
                return;
              }
              const result = onSubmit({
                status,
                owner,
                targetDate,
                completionDate: status === 'Completed' ? completionDate || TODAY : completionDate,
                remarks,
                attachments: attachments.split(',').map((value) => value.trim()).filter(Boolean),
              });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Save Workflow Update
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="fact"><span className="fact-label">Reference</span><span className="fact-value">{row.reference}</span></div>
        <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(row.projectId)}</span></div>
        <div className="fact"><span className="fact-label">Related transfer</span><span className="fact-value">{row.transferId}</span></div>
        <div className="fact"><span className="fact-label">Related BOM</span><span className="fact-value">{row.bomNumber} Rev {row.revision}</span></div>
        <Select id={`workflow-${row.id}-status`} label="Current Status" options={WORKFLOW_STATUSES.map((value) => ({ value, label: value }))} value={status} onChange={(event) => setStatus(event.target.value)} />
        <Select id={`workflow-${row.id}-owner`} label="Assigned Owner" options={['Purchase — Sourcing cell', 'Purchase — Procurement desk', 'Purchase — Vendor development'].map((value) => ({ value, label: value }))} value={owner} onChange={(event) => setOwner(event.target.value)} />
        <div className="form-field"><label className="form-label" htmlFor={`workflow-${row.id}-target`}>Target Date</label><input id={`workflow-${row.id}-target`} className="form-input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>
        <div className="form-field"><label className="form-label" htmlFor={`workflow-${row.id}-completion`}>Completion Date</label><input id={`workflow-${row.id}-completion`} className="form-input" type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} /></div>
        <div className="form-field span-2"><label className="form-label" htmlFor={`workflow-${row.id}-remarks`}>Remarks</label><textarea id={`workflow-${row.id}-remarks`} className="form-input" rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></div>
        <div className="form-field span-2"><label className="form-label" htmlFor={`workflow-${row.id}-attachments`}>Supporting Attachments</label><input id={`workflow-${row.id}-attachments`} className="form-input" value={attachments} onChange={(event) => setAttachments(event.target.value)} placeholder="Comma-separated mock references" /></div>
        <div className="approvals-note-block span-2"><ClipboardCheck aria-hidden="true" /><p>The stage labels CPP, CPR, TV and CPO are retained as requested. No actual Purchase transaction is created.</p></div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function WorkflowSection() {
  const { transfers, updateWorkflow } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const [target, setTarget] = useState(null);
  const [stageFilter, setStageFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const rows = purchaseTransfers(transfers).flatMap((transfer) =>
    (transfer.purchase?.workflow || []).map((row) => ({ ...row, transfer, projectName: projectLabel(row.projectId) })),
  );
  const filtered = rows.filter((row) => {
    if (stageFilter !== 'All' && row.stage !== stageFilter) return false;
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    return true;
  });
  return (
    <>
      <div className="transfers-workflow-intro">
        <div><span className="transfers-kicker">CPP · CPR · TV · CPO</span><h3>Purchase workflow tracking</h3><p>Track the labels exactly as provided. These are configurable local mock records, not actual Purchase workflow transactions.</p></div>
        <div>{WORKFLOW_STAGES.map((stage) => <span key={stage} className="transfers-workflow-chip">{stage}</span>)}</div>
      </div>
      <Toolbar
        left={<>
          <Select id="workflow-stage-filter" options={[{ value: 'All', label: 'All Stages' }, ...WORKFLOW_STAGES.map((value) => ({ value, label: value }))]} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} aria-label="Filter workflow stage" />
          <Select id="workflow-status-filter" options={[{ value: 'All', label: 'All Statuses' }, ...WORKFLOW_STATUSES.map((value) => ({ value, label: value }))]} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter workflow status" />
        </>}
        count={`${filtered.length} workflow records`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'reference', label: 'Reference Number', width: 140, render: (row) => <span className="cell-id">{row.reference}</span> },
            { key: 'stage', label: 'Stage', width: 70, render: (row) => <span className="transfers-workflow-chip">{row.stage}</span> },
            { key: 'projectId', label: 'Project', width: 180, render: (row) => row.projectName },
            { key: 'transferId', label: 'Related Transfer', width: 120 },
            { key: 'bomNumber', label: 'Related BOM', width: 130 },
            { key: 'revision', label: 'Revision', width: 80, render: (row) => `Rev ${row.revision}` },
            { key: 'status', label: 'Current Status', width: 145, render: (row) => <StatusBadge status={row.status} tone={transferStatusTone(row.status)} /> },
            { key: 'owner', label: 'Assigned Owner', width: 190 },
            { key: 'targetDate', label: 'Target Date', width: 115, render: (row) => formatDate(row.targetDate) },
            { key: 'completionDate', label: 'Completion Date', width: 125, render: (row) => formatDate(row.completionDate) },
            { key: 'remarks', label: 'Remarks', width: 230 },
          ]}
          rows={filtered}
          onRowClick={(row) => setTarget(row)}
          rowActions={() => [{ key: 'update', label: 'Update workflow record', icon: Pencil }]}
          onRowAction={(key, row) => { if (key === 'update') setTarget(row); }}
          ariaLabel="CPP CPR TV CPO workflow"
          emptyContent={<EmptyState icon={ClipboardCheck} title="No workflow records" message="No purchase workflow records match the selected filters." />}
        />
      </section>
      <WorkflowDialog
        key={target?.id || 'workflow-closed'}
        open={Boolean(target)}
        row={target}
        onClose={() => setTarget(null)}
        onSubmit={(updates) => {
          const result = updateWorkflow(target.transferId, target.id, updates);
          if (!result.error) showToast(`${target.stage} workflow updated.`);
          return result;
        }}
      />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function HandoverSection() {
  const { transfers, prepareHandover, acknowledgeTransfer, addComment } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const rows = purchaseTransfers(transfers);
  const [selectedId, setSelectedId] = useState(rows[0]?.id || '');
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  if (!selected) return <EmptyState icon={ShoppingCart} title="No Purchase transfers" message="No Purchase destination records are available." />;
  const side = selected.purchase;
  const handover = side?.handover;

  return (
    <>
      <Toolbar
        left={<Select id="purchase-handover-select" label="Purchase transfer" options={rows.map((row) => ({ value: row.id, label: `${row.id} · ${row.projectId} · ${row.deliverableNumber}` }))} value={selected.id} onChange={(event) => setSelectedId(event.target.value)} />}
        right={<Link className="btn-secondary" to={`/transfers/${selected.id}`}>View Full Transfer</Link>}
        count={`${side?.status || 'Not Prepared'} · ${handover ? 'Handover recorded' : 'No handover'}`}
      />
      <div className="transfers-detail-grid">
        <div className="transfers-detail-main">
          <Card title="Purchase handover details" subtitle={`${selected.id} · destination Purchase`}>
            <div className="fact-grid">
              <div className="fact"><span className="fact-label">Transfer ID</span><span className="fact-value">{selected.id}</span></div>
              <div className="fact"><span className="fact-label">Purchase destination</span><span className="fact-value">Purchase</span></div>
              <div className="fact"><span className="fact-label">BOM reference</span><span className="fact-value">{sourceFor(selected)?.bomNumber || selected.deliverableNumber}</span></div>
              <div className="fact"><span className="fact-label">Exact BOM revision</span><span className="fact-value">Rev {sourceFor(selected)?.bomRevision || selected.revision}</span></div>
              <div className="fact"><span className="fact-label">Requisition references</span><span className="fact-value">{(side?.requisitions || []).map((row) => row.id).join(', ') || '—'}</span></div>
              <div className="fact"><span className="fact-label">Prepared by</span><span className="fact-value">{handover?.preparedBy || '—'}</span></div>
              <div className="fact"><span className="fact-label">Handover date</span><span className="fact-value">{handover ? formatDate(handover.date) : '—'}</span></div>
              <div className="fact"><span className="fact-label">Acknowledgement status</span><span className="fact-value">{side?.acknowledgement?.status || 'Pending'}</span></div>
            </div>
            <div className="transfers-content-lines">
              <strong>Transfer contents</strong>
              <span>{selected.source?.bomItems?.length || 0} BOM items</span>
              <span>{selected.source?.materials?.length || 0} material requirements</span>
              <span>{selected.attachments?.length || 0} supporting document reference(s)</span>
            </div>
            <div className="transfers-side-actions">
              {!handover ? <Button icon={PackageCheck} onClick={() => setHandoverOpen(true)}>Prepare Handover</Button> : <Button icon={CheckCircle2} variant="secondary" onClick={() => setAckOpen(true)}>Record Mock Acknowledgement</Button>}
              <Button variant="ghost" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
              <Link className="btn-ghost" to={`/transfers/${selected.id}`}><History aria-hidden="true" /> View Transfer History</Link>
            </div>
            {side?.acknowledgement?.comments && <div className="approvals-note-block"><MessageSquarePlus aria-hidden="true" /><p>{side.acknowledgement.comments}</p></div>}
          </Card>
          <Card title="Purchase comments" subtitle="Transfer conversation"><CommentsPanel comments={side?.comments || []} /></Card>
        </div>
        <aside className="transfers-detail-aside">
          <Card title="Handover snapshot" subtitle="Exact submitted revision">
            {handover ? (
              <div className="fact-grid">
                <div className="fact"><span className="fact-label">Handover reference</span><span className="fact-value">{handover.id}</span></div>
                <div className="fact"><span className="fact-label">Revision</span><span className="fact-value">Rev {handover.snapshot?.revision || selected.revision}</span></div>
                <div className="fact"><span className="fact-label">Release</span><span className="fact-value">{handover.snapshot?.releaseId || selected.releaseId}</span></div>
                <div className="fact"><span className="fact-label">BOM revision</span><span className="fact-value">Rev {handover.snapshot?.bomRevision || selected.revision}</span></div>
                <div className="fact"><span className="fact-label">Owner</span><span className="fact-value">{handover.owner}</span></div>
                <div className="fact"><span className="fact-label">Handover notes</span><span className="fact-value">{handover.notes || '—'}</span></div>
              </div>
            ) : <p className="cell-muted">No Purchase handover recorded.</p>}
            <div className="transfers-attachments">
              <strong>Supporting documents</strong>
              {(handover?.documents || []).length ? handover.documents.map((doc) => <span key={doc} className="transfers-attachment is-static"><FileText aria-hidden="true" /> {doc}</span>) : <span className="cell-muted">No handover documents.</span>}
            </div>
          </Card>
          <Card title="Activity" subtitle="Latest transfer events"><TransferTimeline history={selected.history || []} limit={6} /></Card>
        </aside>
      </div>
      <HandoverDialog
        open={handoverOpen}
        transfer={selected}
        destination="Purchase"
        onClose={() => setHandoverOpen(false)}
        onSubmit={(config) => {
          const result = prepareHandover(selected.id, 'Purchase', config);
          if (!result.error) showToast('Purchase handover recorded locally.');
          return result;
        }}
      />
      <AcknowledgementDialog
        open={ackOpen}
        transfer={selected}
        destination="Purchase"
        onClose={() => setAckOpen(false)}
        onSubmit={(config) => {
          const result = acknowledgeTransfer(selected.id, 'Purchase', config);
          if (!result.error) showToast('Purchase acknowledgement recorded locally.');
          return result;
        }}
      />
      <CommentDialog
        open={commentOpen}
        transfer={selected}
        onClose={() => setCommentOpen(false)}
        onSubmit={(config) => {
          const result = addComment(selected.id, { ...config, stage: 'Purchase' });
          if (!result.error) showToast('Purchase comment added.');
          return result;
        }}
      />
      <AttachmentDialog attachment={attachment} onClose={() => setAttachment(null)} />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

export default function PurchaseTransferTab() {
  const purchaseBomColumns = useTableColumnVisibility('/transfers#purchase-bom-items', [
    { key: 'partNumber', label: 'Part Number' },
    { key: 'description', label: 'Description' },
    { key: 'qty', label: 'Qty' },
    { key: 'unit', label: 'Unit' },
    { key: 'category', label: 'Category' },
    { key: 'material', label: 'Material' },
    { key: 'drawing', label: 'Drawing' },
    { key: 'notes', label: 'Purchase Notes' },
  ]);
  const { transfers } = useTransfers();
  const [section, setSection] = useState('bom');
  const detail = useDetailState();
  const [attachment, setAttachment] = useState(null);
  const purchase = purchaseTransfers(transfers);
  const bomRows = transferBomRows(transfers);
  const requisitions = purchase.flatMap((row) => row.purchase?.requisitions || []);
  const workflow = purchase.flatMap((row) => row.purchase?.workflow || []);
  const handovers = purchase.filter((row) => row.purchase?.handover);
  const counts = { bom: bomRows.length, requisition: requisitions.length, status: purchase.length, workflow: workflow.length, handover: handovers.length };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />
      {section === 'bom' && <BomTransferSection onOpenDetail={detail.open} />}
      {section === 'requisition' && <MaterialRequisitionSection />}
      {section === 'status' && <PurchaseStatusSection />}
      {section === 'workflow' && <WorkflowSection />}
      {section === 'handover' && <HandoverSection />}
      <DetailDialog target={detail.target} kind={detail.kind} onClose={detail.close} attachment={attachment} setAttachment={setAttachment} />
      <AttachmentDialog attachment={attachment} onClose={() => setAttachment(null)} />
    </>
  );
}
