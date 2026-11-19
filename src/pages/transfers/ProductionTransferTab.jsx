import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Factory,
  FileCheck2,
  FileText,
  History,
  MessageSquarePlus,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { useTransfers } from '../../context/TransfersContext';
import {
  PACKAGE_STATUSES,
  PROJECTS,
  READINESS_STATUSES,
  TODAY,
  formatDate,
  projectLabel,
  sourceFor,
  transferStatusTone,
} from '../../data/transfersData';
import {
  AcknowledgementDialog,
  AttachmentDialog,
  CommentDialog,
  CommentsPanel,
  SectionNav,
  Toast,
  TransferStatus,
  TransferTimeline,
  formatBytes,
  useToast,
  useTransferTable,
} from './transfersUi';

const SECTIONS = [
  { key: 'drawing', label: 'Drawing Release' },
  { key: 'package', label: 'Manufacturing Package' },
  { key: 'handover', label: 'Production Handover' },
  { key: 'documents', label: 'Production Documents' },
  { key: 'readiness', label: 'Production Readiness' },
];

const productionTransfers = (transfers) => transfers.filter((row) => row.destinations?.includes('Production'));

function drawingRows(transfers) {
  return productionTransfers(transfers)
    .filter((row) => row.deliverableType === 'Drawing')
    .map((row) => {
      const source = sourceFor(row);
      return {
        ...row,
        source,
        drawingNumber: row.deliverableNumber,
        drawingTitle: row.deliverableName,
        drawingType: source?.drawingType || 'Drawing',
        drawingRevision: row.revision,
        cadFileId: source?.cadFileId || 'Not linked',
        productionEligibility: source?.productionEligible ? 'Eligible' : 'Not eligible',
        handoverStatus: row.production?.status || 'Not Prepared',
      };
    });
}

function DrawingDialog({ target, onClose, onAttach }) {
  if (!target) return null;
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title="Released drawing details"
      subtitle={`${target.drawingNumber} Rev ${target.drawingRevision}`}
      maxWidth="max-w-xl"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="fact-grid">
        <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(target.projectId)}</span></div>
        <div className="fact"><span className="fact-label">Drawing title</span><span className="fact-value">{target.drawingTitle}</span></div>
        <div className="fact"><span className="fact-label">Drawing type</span><span className="fact-value">{target.drawingType}</span></div>
        <div className="fact"><span className="fact-label">Exact released revision</span><span className="fact-value">Rev {target.drawingRevision}</span></div>
        <div className="fact"><span className="fact-label">CAD file reference</span><span className="fact-value">{target.cadFileId}</span></div>
        <div className="fact"><span className="fact-label">Source release</span><span className="fact-value">{target.releaseId}</span></div>
        <div className="fact"><span className="fact-label">Release date</span><span className="fact-value">{formatDate(target.releaseDate)}</span></div>
        <div className="fact"><span className="fact-label">Production eligibility</span><span className="fact-value">{target.productionEligibility}</span></div>
        <div className="fact"><span className="fact-label">Manufacturing package</span><span className="fact-value">{target.source?.manufacturingPackageId || '—'} Rev {target.source?.packageRevision || '—'}</span></div>
        <div className="fact"><span className="fact-label">Related BOM</span><span className="fact-value">{target.source?.bomNumber || '—'} Rev {target.source?.bomRevision || '—'}</span></div>
      </div>
      <div className="approvals-note-block"><ShieldCheck aria-hidden="true" /><p>Only this released revision is referenced. A newer revision requires its own approval, release and transfer; it never overwrites this handover.</p></div>
      <div className="transfers-attachments">
        <strong>Drawing attachments</strong>
        {target.source?.attachments?.length ? target.source.attachments.map((row) => (
          <button key={row.name} type="button" className="transfers-attachment" onClick={() => onAttach(row)}>
            <FileText aria-hidden="true" /><span>{row.name}</span><small>{formatBytes(row.size)}</small>
          </button>
        )) : <span className="cell-muted">No drawing attachment recorded.</span>}
      </div>
    </Modal>
  );
}

function DrawingReleaseSection({ onAttach }) {
  const { transfers } = useTransfers();
  const [target, setTarget] = useState(null);
  const rows = useMemo(() => drawingRows(transfers), [transfers]);
  const table = useTransferTable(rows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.type !== 'All' && row.drawingType !== filters.type) return false;
    if (filters.revision !== 'All' && row.drawingRevision !== filters.revision) return false;
    if (filters.status !== 'All' && row.handoverStatus !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.projectId, row.drawingNumber, row.drawingTitle, row.drawingRevision, row.releaseId, row.handoverStatus].join(' ').toLowerCase().includes(query);
  }, { initialFilters: { projectId: 'All', type: 'All', revision: 'All', status: 'All' } });

  return (
    <>
      <Toolbar
        left={<>
          <Button variant="ghost" icon={RefreshCw} onClick={table.reset}>Refresh</Button>
          <Select id="drawing-project-filter" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={table.filters.projectId} onChange={(event) => { const next = { ...table.filters, projectId: event.target.value }; table.setDraftFilters(next); table.setFilters(next); }} aria-label="Filter drawings by project" />
          <Select id="drawing-type-filter" options={[{ value: 'All', label: 'All Drawing Types' }, ...[...new Set(rows.map((row) => row.drawingType))].map((value) => ({ value, label: value }))]} value={table.filters.type} onChange={(event) => { const next = { ...table.filters, type: event.target.value }; table.setDraftFilters(next); table.setFilters(next); }} aria-label="Filter by drawing type" />
          <Select id="drawing-revision-filter" options={[{ value: 'All', label: 'All Revisions' }, ...[...new Set(rows.map((row) => row.drawingRevision))].map((value) => ({ value, label: `Rev ${value}` }))]} value={table.filters.revision} onChange={(event) => { const next = { ...table.filters, revision: event.target.value }; table.setDraftFilters(next); table.setFilters(next); }} aria-label="Filter by drawing revision" />
          <Select id="drawing-status-filter" options={[{ value: 'All', label: 'All Handover Statuses' }, ...[...new Set(rows.map((row) => row.handoverStatus))].map((value) => ({ value, label: value }))]} value={table.filters.status} onChange={(event) => { const next = { ...table.filters, status: event.target.value }; table.setDraftFilters(next); table.setFilters(next); }} aria-label="Filter by release handover status" />
        </>}
        right={<SearchInput id="drawing-release-search" value={table.search} onChange={table.setSearch} placeholder="Search drawing, release, project…" ariaLabel="Search released drawings" />}
        count={table.pageInfo}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'drawingNumber', label: 'Drawing Number', width: 160, render: (row) => <span className="cell-strong">{row.drawingNumber}</span> },
            { key: 'drawingTitle', label: 'Drawing Title', width: 245 },
            { key: 'drawingRevision', label: 'Drawing Revision', width: 125, render: (row) => <span className="approvals-exact-rev">Rev {row.drawingRevision}</span> },
            { key: 'releaseId', label: 'Source Release ID', width: 160, render: (row) => <span className="cell-id">{row.releaseId}</span> },
            { key: 'releaseDate', label: 'Release Date', width: 120, render: (row) => formatDate(row.releaseDate) },
            { key: 'productionEligibility', label: 'Production Eligibility', width: 150, render: (row) => <StatusBadge status={row.productionEligibility} tone={row.productionEligibility === 'Eligible' ? 'green' : 'gray'} /> },
            { key: 'handoverStatus', label: 'Handover Status', width: 170, render: (row) => <TransferStatus status={row.handoverStatus} /> },
          ]}
          rows={table.pageRows}
          sortKey={table.sortKey}
          sortDirection={table.sortDirection}
          onSort={table.toggleSort}
          rowActions={() => [
            { key: 'view', label: 'View drawing details', icon: Eye },
            { key: 'cad', label: 'View CAD file reference', icon: FileCheck2 },
            { key: 'revision', label: 'View exact released revision', icon: History },
            { key: 'attachments', label: 'View attachments', icon: FileText },
          ]}
          onRowAction={(key, row) => {
            if (key === 'attachments') {
              if (row.source?.attachments?.[0]) onAttach(row.source.attachments[0]);
              else setTarget(row);
            } else setTarget(row);
          }}
          ariaLabel="Drawing release register"
          emptyContent={<EmptyState icon={FileCheck2} title="No released drawings" message="No Production transfer drawings match the filters." />}
        />
        <Pagination page={table.page} totalPages={Math.max(1, Math.ceil(table.sorted.length / table.pageSize))} pageSize={table.pageSize} pageSizeOptions={[5, 10, 25]} pageInfo={table.pageInfo} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
      </section>
      <DrawingDialog target={target} onClose={() => setTarget(null)} onAttach={onAttach} />
    </>
  );
}

function PackageDialog({ open, transfer, packageRecord, onClose, onSave }) {
  const source = sourceFor(transfer);
  const [form, setForm] = useState({
    revision: packageRecord?.revision || source?.packageRevision || 'A',
    preparedBy: packageRecord?.preparedBy || 'V. Sharma',
    manufacturingInstructions: (packageRecord?.manufacturingInstructions || ['Machine to the released drawing revision.', 'Inspect critical dimensions before release to assembly.']).join('\n'),
    processPlanning: packageRecord?.processPlanning || 'Process plan to be confirmed.',
    machining: packageRecord?.machining || 'Machining details from the released drawing.',
    fabrication: packageRecord?.fabrication || 'Not applicable.',
    welding: packageRecord?.welding || 'Not applicable.',
    sheetMetal: packageRecord?.sheetMetal || 'Not applicable.',
    tolerances: packageRecord?.tolerances || 'General tolerance ISO 2768-m unless stated otherwise.',
    inspection: packageRecord?.inspection || 'First-piece and final dimensional inspection.',
    technicalNotes: packageRecord?.technicalNotes || 'Use the exact released drawing revision.',
    attachments: (packageRecord?.attachments || []).join(', '),
  });
  const [error, setError] = useState('');
  if (!open || !transfer) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={packageRecord ? 'Edit Manufacturing Package' : 'Create Manufacturing Package Draft'}
      subtitle={`${transfer.id} · ${source?.drawingReferences?.[0] || transfer.deliverableNumber} Rev ${transfer.revision}`}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            icon={Plus}
            onClick={() => {
              if (!form.manufacturingInstructions.trim() || !form.inspection.trim()) {
                setError('Manufacturing instructions and inspection requirements are required.');
                return;
              }
              const result = onSave({
                ...form,
                manufacturingInstructions: form.manufacturingInstructions.split('\n').map((row) => row.trim()).filter(Boolean),
                attachments: form.attachments.split(',').map((row) => row.trim()).filter(Boolean),
                drawingReferences: packageRecord?.drawingReferences || source?.drawingReferences || (source ? [`${source.deliverableNumber} Rev ${source.revision}`] : []),
              });
              if (result?.error) setError(result.error);
              else onClose();
            }}
          >
            Save Package
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="fact"><span className="fact-label">Package ID</span><span className="fact-value">{packageRecord?.id || 'Auto-generated on save'}</span></div>
        <div className="fact"><span className="fact-label">Related drawing</span><span className="fact-value">{source?.drawingReferences?.[0] || `${transfer.deliverableNumber} Rev ${transfer.revision}`}</span></div>
        <div className="form-field"><label className="form-label" htmlFor="package-revision">Package Revision</label><input id="package-revision" className="form-input" value={form.revision} onChange={(event) => setForm((previous) => ({ ...previous, revision: event.target.value }))} /></div>
        <Select id="package-prepared-by" label="Prepared By" options={['V. Sharma', 'N. Joshi', 'A. Iyer', 'P. Deshmukh'].map((value) => ({ value, label: value }))} value={form.preparedBy} onChange={(event) => setForm((previous) => ({ ...previous, preparedBy: event.target.value }))} />
        <div className="form-field span-2"><label className="form-label" htmlFor="package-instructions">Manufacturing Instructions (one per line)</label><textarea id="package-instructions" className="form-input" rows={3} value={form.manufacturingInstructions} onChange={(event) => setForm((previous) => ({ ...previous, manufacturingInstructions: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="package-process">Process Planning Details</label><textarea id="package-process" className="form-input" rows={2} value={form.processPlanning} onChange={(event) => setForm((previous) => ({ ...previous, processPlanning: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="package-machining">Machining Details</label><textarea id="package-machining" className="form-input" rows={2} value={form.machining} onChange={(event) => setForm((previous) => ({ ...previous, machining: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="package-fabrication">Fabrication Details</label><textarea id="package-fabrication" className="form-input" rows={2} value={form.fabrication} onChange={(event) => setForm((previous) => ({ ...previous, fabrication: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="package-welding">Welding Details</label><textarea id="package-welding" className="form-input" rows={2} value={form.welding} onChange={(event) => setForm((previous) => ({ ...previous, welding: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="package-sheet">Sheet Metal Details</label><textarea id="package-sheet" className="form-input" rows={2} value={form.sheetMetal} onChange={(event) => setForm((previous) => ({ ...previous, sheetMetal: event.target.value }))} /></div>
        <div className="form-field"><label className="form-label" htmlFor="package-tolerances">Tolerances and Fits</label><textarea id="package-tolerances" className="form-input" rows={2} value={form.tolerances} onChange={(event) => setForm((previous) => ({ ...previous, tolerances: event.target.value }))} /></div>
        <div className="form-field span-2"><label className="form-label" htmlFor="package-inspection">Inspection Requirements</label><textarea id="package-inspection" className="form-input" rows={2} value={form.inspection} onChange={(event) => setForm((previous) => ({ ...previous, inspection: event.target.value }))} /></div>
        <div className="form-field span-2"><label className="form-label" htmlFor="package-notes">Technical Notes</label><textarea id="package-notes" className="form-input" rows={2} value={form.technicalNotes} onChange={(event) => setForm((previous) => ({ ...previous, technicalNotes: event.target.value }))} /></div>
        <div className="form-field span-2"><label className="form-label" htmlFor="package-attachments">Supporting Attachments</label><input id="package-attachments" className="form-input" value={form.attachments} onChange={(event) => setForm((previous) => ({ ...previous, attachments: event.target.value }))} placeholder="Comma-separated document references" /></div>
        <div className="approvals-note-block span-2"><Factory aria-hidden="true" /><p>The package is an engineering handover document. It does not create a production order or manufacturing execution record.</p></div>
        {error && <p className="form-error span-2" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function PackageViewDialog({ target, onClose }) {
  if (!target?.production?.package) return null;
  const pkg = target.production.package;
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title="Manufacturing Package"
      subtitle={`${pkg.id} Rev ${pkg.revision} · ${pkg.status}`}
      maxWidth="max-w-2xl"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="fact-grid">
        <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(pkg.projectId)}</span></div>
        <div className="fact"><span className="fact-label">Related drawing</span><span className="fact-value">{pkg.drawingReferences?.join(', ')}</span></div>
        <div className="fact"><span className="fact-label">Drawing revision</span><span className="fact-value">Rev {pkg.drawingRevision}</span></div>
        <div className="fact"><span className="fact-label">Related BOM</span><span className="fact-value">{pkg.bomNumber || '—'}</span></div>
        <div className="fact"><span className="fact-label">Prepared by</span><span className="fact-value">{pkg.preparedBy}</span></div>
        <div className="fact"><span className="fact-label">Last updated</span><span className="fact-value">{formatDate(pkg.updatedAt)}</span></div>
      </div>
      <div className="transfers-package-grid">
        {[
          ['Manufacturing instructions', pkg.manufacturingInstructions?.join(' · ')],
          ['Process planning', pkg.processPlanning],
          ['Machining', pkg.machining],
          ['Fabrication', pkg.fabrication],
          ['Welding', pkg.welding],
          ['Sheet metal', pkg.sheetMetal],
          ['Tolerances and fits', pkg.tolerances],
          ['Inspection requirements', pkg.inspection],
          ['Technical notes', pkg.technicalNotes],
        ].map(([label, value]) => (
          <div key={label}><span>{label}</span><p>{value || '—'}</p></div>
        ))}
      </div>
      <div className="transfers-content-lines"><strong>Supporting attachments</strong>{(pkg.attachments || []).map((row) => <span key={row}>{row}</span>)}</div>
    </Modal>
  );
}

function ManufacturingPackageSection({ onAttach }) {
  const { transfers, savePackage, validatePackage, markPackageReady } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const [editor, setEditor] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const rows = productionTransfers(transfers).map((transfer) => {
    const source = sourceFor(transfer);
    return {
      ...transfer,
      source,
      packageRecord: transfer.production?.package || null,
      packageId: transfer.production?.package?.id || 'No package',
      packageStatus: transfer.production?.package?.status || 'Not Prepared',
      relatedDrawing: source?.drawingReferences?.[0] || `${transfer.deliverableNumber} Rev ${transfer.revision}`,
      packageRevision: transfer.production?.package?.revision || '—',
      preparedBy: transfer.production?.package?.preparedBy || '—',
      updatedAt: transfer.production?.package?.updatedAt || '',
    };
  });
  const filtered = rows.filter((row) => {
    if (statusFilter !== 'All' && row.packageStatus !== statusFilter) return false;
    if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
    if (!search.trim()) return true;
    return [row.id, row.projectId, row.deliverableNumber, row.packageId, row.relatedDrawing, row.packageStatus].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <>
      <Toolbar
        left={<>
          <Select id="package-project-filter" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter packages by project" />
          <Select id="package-status-filter" options={[{ value: 'All', label: 'All Statuses' }, ...PACKAGE_STATUSES.map((value) => ({ value, label: value }))]} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter packages by status" />
        </>}
        right={<SearchInput id="package-search" value={search} onChange={setSearch} placeholder="Search package, drawing, project…" ariaLabel="Search manufacturing packages" />}
        count={`${filtered.length} package record(s)`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'packageId', label: 'Package ID', width: 145, render: (row) => <span className="cell-id">{row.packageId}</span> },
            { key: 'projectId', label: 'Project', width: 125 },
            { key: 'relatedDrawing', label: 'Related Drawing', width: 220 },
            { key: 'revision', label: 'Drawing Revision', width: 115, render: (row) => `Rev ${row.revision}` },
            { key: 'source', label: 'Related BOM', width: 130, render: (row) => row.source?.bomNumber || '—' },
            { key: 'packageRevision', label: 'Package Revision', width: 120, render: (row) => `Rev ${row.packageRevision}` },
            { key: 'preparedBy', label: 'Prepared By', width: 120 },
            { key: 'packageStatus', label: 'Package Status', width: 160, render: (row) => <StatusBadge status={row.packageStatus} tone={transferStatusTone(row.packageStatus)} /> },
            { key: 'updatedAt', label: 'Last Updated', width: 120, render: (row) => formatDate(row.updatedAt) },
          ]}
          rows={filtered}
          onRowClick={(row) => (row.packageRecord ? setViewTarget(row) : setEditor(row))}
          rowActions={(row) => [
            ...(row.packageRecord ? [{ key: 'view', label: 'View package', icon: Eye }] : [{ key: 'create', label: 'Create package draft', icon: Plus }]),
            ...(row.packageRecord && !['Ready for Handover'].includes(row.packageStatus) ? [{ key: 'edit', label: 'Edit draft', icon: Pencil }] : []),
            ...(row.packageRecord ? [{ key: 'validate', label: 'Validate package', icon: ShieldCheck }] : []),
            ...(row.packageStatus === 'Validated' ? [{ key: 'ready', label: 'Mark Ready for Handover', icon: CheckCircle2 }] : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') setViewTarget(row);
            if (key === 'create' || key === 'edit') setEditor(row);
            if (key === 'validate') {
              const result = validatePackage(row.id);
              if (result.error) showToast(result.error, 'error');
              else if (result.invalid) showToast('Package validation failed. Resolve the listed checks.', 'error');
              else showToast('Manufacturing package validated.');
            }
            if (key === 'ready') {
              const result = markPackageReady(row.id);
              if (result.error) showToast(result.error, 'error');
              else showToast('Package marked Ready for Handover.');
            }
          }}
          ariaLabel="Manufacturing packages"
          emptyContent={<EmptyState icon={PackageCheck} title="No packages" message="No manufacturing packages match the filters." />}
        />
      </section>

      <PackageDialog
        key={`${editor?.id || 'new'}-${editor?.packageRecord?.id || 'package'}`}
        open={Boolean(editor)}
        transfer={editor}
        packageRecord={editor?.packageRecord}
        onClose={() => setEditor(null)}
        onSave={(data) => {
          const result = savePackage(editor.id, data, { create: !editor.packageRecord });
          if (!result.error) showToast(editor.packageRecord ? 'Manufacturing package updated.' : 'Manufacturing package draft created.');
          return result;
        }}
      />
      <PackageViewDialog target={viewTarget} onClose={() => setViewTarget(null)} />
      <div className="transfers-tip"><Wrench aria-hidden="true" /><span>Package validation checks drawing references, manufacturing instructions, inspection requirements, attachments and blocked readiness items. Handover still requires a separate Production acknowledgement.</span></div>
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function ProductionHandoverSection() {
  const { transfers, prepareHandover, validateTransfer, acknowledgeTransfer, addComment } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const rows = productionTransfers(transfers);
  const [selectedId, setSelectedId] = useState(rows[0]?.id || '');
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  if (!selected) return <EmptyState icon={Factory} title="No Production transfers" message="No Production destination records are available." />;
  const side = selected.production;
  const handover = side?.handover;
  return (
    <>
      <Toolbar
        left={<Select id="production-handover-select" label="Production transfer" options={rows.map((row) => ({ value: row.id, label: `${row.id} · ${row.projectId} · ${row.deliverableNumber}` }))} value={selected.id} onChange={(event) => setSelectedId(event.target.value)} />}
        right={<Link className="btn-secondary" to={`/transfers/${selected.id}`}>View Full Transfer</Link>}
        count={`${side?.status || 'Not Prepared'} · ${handover ? 'Handover recorded' : 'No handover'}`}
      />
      <Card title="Production handover" subtitle="Controlled engineering handover — not a production order">
        <div className="fact-grid">
          <div className="fact"><span className="fact-label">Handover ID</span><span className="fact-value">{handover?.id || 'Not recorded'}</span></div>
          <div className="fact"><span className="fact-label">Project</span><span className="fact-value">{projectLabel(selected.projectId)}</span></div>
          <div className="fact"><span className="fact-label">Drawing references</span><span className="fact-value">{selected.source?.drawingReferences?.join(', ') || selected.deliverableNumber}</span></div>
          <div className="fact"><span className="fact-label">Exact drawing revisions</span><span className="fact-value">Rev {selected.revision}</span></div>
          <div className="fact"><span className="fact-label">Manufacturing package</span><span className="fact-value">{side?.package?.id || '—'} Rev {side?.package?.revision || '—'}</span></div>
          <div className="fact"><span className="fact-label">Related BOM</span><span className="fact-value">{selected.source?.bomNumber || '—'}</span></div>
          <div className="fact"><span className="fact-label">Transfer date</span><span className="fact-value">{formatDate(selected.transferDate)}</span></div>
          <div className="fact"><span className="fact-label">Prepared by</span><span className="fact-value">{handover?.preparedBy || '—'}</span></div>
          <div className="fact"><span className="fact-label">Production owner</span><span className="fact-value">{handover?.owner || '—'}</span></div>
          <div className="fact"><span className="fact-label">Acknowledgement</span><span className="fact-value">{side?.acknowledgement?.status || 'Pending'}</span></div>
        </div>
        <div className="transfers-content-lines">
          <strong>Handover notes</strong><span>{handover?.notes || 'No Production handover notes recorded.'}</span>
          <strong>Supporting documents</strong>{(handover?.documents || []).map((doc) => <span key={doc}>{doc}</span>)}
        </div>
        <div className="transfers-side-actions">
          {!handover ? <Button icon={PackageCheck} onClick={() => setHandoverOpen(true)}>Prepare Production Handover</Button> : <Button variant="secondary" icon={CheckCircle2} onClick={() => setAckOpen(true)}>Record Mock Acknowledgement</Button>}
          <Button variant="ghost" icon={ShieldCheck} onClick={() => { const result = validateTransfer(selected.id, { checkedBy: 'N. Joshi' }); if (result.error) showToast(result.error, 'error'); else if (result.blocking) showToast('Handover validation failed. Resolve mandatory checks.', 'error'); else showToast('Handover validation passed.'); }}>Validate Handover</Button>
          <Button variant="ghost" icon={MessageSquarePlus} onClick={() => setCommentOpen(true)}>Add Comment</Button>
          <Link className="btn-ghost" to={`/transfers/${selected.id}`}><History aria-hidden="true" /> View Handover Details</Link>
        </div>
        {side?.acknowledgement?.comments && <div className="approvals-note-block"><MessageSquarePlus aria-hidden="true" /><p>{side.acknowledgement.comments}</p></div>}
      </Card>
      <Card title="Production comments" subtitle="Destination-specific conversation"><CommentsPanel comments={side?.comments || []} /></Card>
      <HandoverDialog open={handoverOpen} transfer={selected} destination="Production" onClose={() => setHandoverOpen(false)} onSubmit={(config) => { const result = prepareHandover(selected.id, 'Production', config); if (!result.error) showToast('Production handover recorded locally.'); return result; }} />
      <AcknowledgementDialog open={ackOpen} transfer={selected} destination="Production" onClose={() => setAckOpen(false)} onSubmit={(config) => { const result = acknowledgeTransfer(selected.id, 'Production', config); if (!result.error) showToast('Production acknowledgement recorded locally.'); return result; }} />
      <CommentDialog open={commentOpen} transfer={selected} onClose={() => setCommentOpen(false)} onSubmit={(config) => { const result = addComment(selected.id, { ...config, stage: 'Production' }); if (!result.error) showToast('Production comment added.'); return result; }} />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function ProductionDocumentsSection({ onAttach }) {
  const { transfers } = useTransfers();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const rows = productionTransfers(transfers).flatMap((transfer) => {
    const pkg = transfer.production?.package;
    const seeded = pkg?.documents || [];
    const fallback = (pkg?.attachments || []).map((name, index) => ({
      number: pkg.id ? `${pkg.id}-DOC-${index + 1}` : transfer.deliverableNumber,
      name,
      category: /draw|drg/i.test(name) ? 'Released Drawings' : 'Supporting Attachments',
      revision: pkg.revision || transfer.revision,
      source: 'Module 11 package',
      releaseStatus: 'Available',
      attachment: name,
    }));
    const rowsForPackage = seeded.length ? seeded : fallback;
    return rowsForPackage.map((doc, index) => ({
      ...doc,
      key: `${transfer.id}-${doc.number}-${index}`,
      transferId: transfer.id,
      projectId: transfer.projectId,
      attachmentRecord: (transfer.attachments || []).find((row) => row.name === doc.attachment) || (doc.attachment ? { name: doc.attachment, type: 'PDF', size: 0 } : null),
    }));
  });
  const filtered = rows.filter((row) => {
    if (category !== 'All' && row.category !== category) return false;
    if (!search.trim()) return true;
    return [row.number, row.name, row.category, row.revision, row.source, row.transferId].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });
  return (
    <>
      <Toolbar
        left={<Select id="documents-category-filter" options={[{ value: 'All', label: 'All Categories' }, ...[...new Set(rows.map((row) => row.category))].map((value) => ({ value, label: value }))]} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter production documents by category" />}
        right={<SearchInput id="production-doc-search" value={search} onChange={setSearch} placeholder="Search document, transfer, revision…" ariaLabel="Search production documents" />}
        count={`${filtered.length} document(s)`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'number', label: 'Document Number', width: 155, render: (row) => <span className="cell-id">{row.number}</span> },
            { key: 'name', label: 'Document Name', width: 260 },
            { key: 'category', label: 'Category', width: 185 },
            { key: 'revision', label: 'Revision', width: 90, render: (row) => `Rev ${row.revision}` },
            { key: 'source', label: 'Source', width: 170 },
            { key: 'releaseStatus', label: 'Release Status', width: 130, render: (row) => <StatusBadge status={row.releaseStatus} tone={row.releaseStatus === 'Released' ? 'green' : 'blue'} /> },
            { key: 'attachment', label: 'Attachment Availability', width: 185, render: (row) => row.attachment ? <Button variant="ghost" size="sm" icon={FileText} onClick={() => row.attachmentRecord && onAttach(row.attachmentRecord)}>{row.attachment}</Button> : <span className="cell-muted">Metadata only</span> },
          ]}
          rows={filtered}
          ariaLabel="Production documents"
          emptyContent={<EmptyState icon={FileText} title="No production documents" message="No handover documents match the current filters." />}
        />
      </section>
    </>
  );
}

function ProductionReadinessSection() {
  const { transfers, updateReadiness, validatePackage, markPackageReady } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const rows = productionTransfers(transfers).filter((row) => row.production?.package);
  const [selectedId, setSelectedId] = useState(rows[0]?.id || '');
  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  const pkg = selected?.production?.package;
  if (!selected || !pkg) return <EmptyState icon={CheckCircle2} title="No manufacturing package" message="Create and validate a manufacturing package before assessing Production readiness." />;
  const counts = {
    ready: pkg.readiness.filter((row) => row.status === 'Ready').length,
    blocked: pkg.readiness.filter((row) => row.status === 'Blocked').length,
    outstanding: pkg.readiness.filter((row) => !['Ready', 'Not Applicable'].includes(row.status)).length,
  };
  return (
    <>
      <Toolbar
        left={<Select id="readiness-transfer-select" label="Manufacturing Package" options={rows.map((row) => ({ value: row.id, label: `${row.id} · ${row.production.package.id} Rev ${row.production.package.revision}` }))} value={selected.id} onChange={(event) => setSelectedId(event.target.value)} />}
        right={<>
          <Button variant="secondary" icon={ShieldCheck} onClick={() => { const result = validatePackage(selected.id); if (result.error) showToast(result.error, 'error'); else if (result.invalid) showToast('Readiness validation found blocking items.', 'error'); else showToast('Package validation passed.'); }}>Validate Package</Button>
          <Button icon={CheckCircle2} onClick={() => { const result = markPackageReady(selected.id); if (result.error) showToast(result.error, 'error'); else showToast('Package marked Ready for Handover.'); }}>Mark Ready</Button>
        </>}
        count={`${counts.ready} ready · ${counts.outstanding} outstanding · ${counts.blocked} blocked`}
      />
      <Card title="Production readiness checklist" subtitle="Engineering handover readiness only; production has not started">
        <div className="transfers-readiness-head">
          <div><strong>{pkg.id} Rev {pkg.revision}</strong><span>{projectLabel(pkg.projectId)} · {pkg.drawingReferences?.join(', ')}</span></div>
          <StatusBadge status={pkg.status} tone={transferStatusTone(pkg.status)} />
        </div>
        <div className="transfers-readiness-list">
          {pkg.readiness.map((item) => (
            <div key={item.key} className={`transfers-readiness-row is-${item.status.toLowerCase().replaceAll(' ', '-')}`}>
              <span className="transfers-readiness-icon" aria-hidden="true">{item.status === 'Ready' ? <CheckCircle2 /> : item.status === 'Blocked' ? <XIcon /> : <ClipboardCheck />}</span>
              <div><strong>{item.label}</strong><span>{item.status === 'Not Applicable' ? 'Not applicable to this package.' : `Current state: ${item.status}`}</span></div>
              <Select
                id={`readiness-${item.key}`}
                options={READINESS_STATUSES.map((value) => ({ value, label: value }))}
                value={item.status}
                disabled={item.key === 'handover'}
                onChange={(event) => {
                  const result = updateReadiness(selected.id, item.key, event.target.value);
                  if (result.error) showToast(result.error, 'error');
                }}
                aria-label={`${item.label} readiness`}
              />
            </div>
          ))}
        </div>
        <div className="transfers-readiness-note"><strong>Readiness does not mean production has started.</strong> It means the engineering drawing, package, material references, inspection requirements and attachments are ready to be handed over.</div>
      </Card>
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function XIcon() {
  return <span className="transfers-x-icon">!</span>;
}

export default function ProductionTransferTab() {
  const { transfers } = useTransfers();
  const [section, setSection] = useState('drawing');
  const [attachment, setAttachment] = useState(null);
  const rows = productionTransfers(transfers);
  const drawings = drawingRows(transfers);
  const packages = rows.filter((row) => row.production?.package);
  const handovers = rows.filter((row) => row.production?.handover);
  const documents = packages.flatMap((row) => row.production.package.documents || []);
  const counts = { drawing: drawings.length, package: packages.length, handover: handovers.length, documents: documents.length, readiness: packages.length };
  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />
      {section === 'drawing' && <DrawingReleaseSection onAttach={setAttachment} />}
      {section === 'package' && <ManufacturingPackageSection onAttach={setAttachment} />}
      {section === 'handover' && <ProductionHandoverSection />}
      {section === 'documents' && <ProductionDocumentsSection onAttach={setAttachment} />}
      {section === 'readiness' && <ProductionReadinessSection />}
      <AttachmentDialog attachment={attachment} onClose={() => setAttachment(null)} />
    </>
  );
}
