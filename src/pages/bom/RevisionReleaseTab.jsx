import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  GitCompare,
  History,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  ManageColumns,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  Toolbar,
} from '../../components/common';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useBom } from '../../context/BomContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate, TODAY } from '../../data/bomData';
import {
  REVIEWER_PERSONA,
  bomItemTotal,
  bomMaterials,
  bomRevisionRows,
  itemsForRevision,
  projectName,
  statusTone,
} from '../../data/bomData';
import exportCsv from '../../utils/exportCsv';
import { Fact, SectionNav, Toast, money, useTable, useToast } from './bomUi';

const SECTIONS = [
  { key: 'revisions', label: 'BOM Revision Register' },
  { key: 'comparison', label: 'Revision Comparison' },
  { key: 'changes', label: 'Change History' },
  { key: 'review', label: 'Review & Approval' },
  { key: 'approved', label: 'Approved BOMs' },
  { key: 'purchase', label: 'Release to Purchase' },
  { key: 'production', label: 'Release to Production' },
  { key: 'transfers', label: 'Transfer History' },
];

const DEST_LABEL = { Purchase: 'Purchase', Production: 'Production' };

export default function RevisionReleaseTab() {
  const navigate = useNavigate();
  const {
    boms,
    materials,
    transfers,
    recordBomDecision,
    releaseBom,
    createRevision,
    addTransfer,
    updateTransferStatus,
    removeTransfer,
  } = useBom();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('revisions');
  const diffColumns = useTableColumnVisibility('/bom-cost#revision-compare', [
    { key: 'change', label: 'Change' },
    { key: 'partNumber', label: 'Part Number' },
    { key: 'item', label: 'Item' },
    { key: 'baseQty', label: 'Base Quantity' },
    { key: 'targetQty', label: 'Target Quantity' },
    { key: 'material', label: 'Material' },
    { key: 'makeBuy', label: 'Make / Buy' },
  ]);
  const snapshotColumns = useTableColumnVisibility('/bom-cost#revision-snapshot', [
    { key: 'itemNo', label: 'Item No.' },
    { key: 'partNumber', label: 'Part Number' },
    { key: 'name', label: 'Part Name' },
    { key: 'qty', label: 'Qty' },
    { key: 'uom', label: 'UOM' },
    { key: 'material', label: 'Material' },
    { key: 'rev', label: 'Part Rev' },
    { key: 'makeBuy', label: 'Make / Buy' },
  ]);
  const [decision, setDecision] = useState(null);
  const [decisionForm, setDecisionForm] = useState({ decision: 'Approved', comments: '' });
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionView, setRevisionView] = useState(null);
  const [compareBom, setCompareBom] = useState('BOM-2026-001');
  const [baseRevision, setBaseRevision] = useState('B');
  const [targetRevision, setTargetRevision] = useState('C');

  const revisionRows = useMemo(
    () =>
      bomRevisionRows(boms).map((row) => ({
        ...row,
        id: row.key,
        projectName: projectName(projects, row.projectId),
      })),
    [boms, projects],
  );

  const revisionTable = useTable(revisionRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.bomId, row.bomName, row.revision, row.note, row.changeReason, row.by, row.reviewStatus, row.approvalStatus, row.status].join(' ').toLowerCase().includes(query);
  });

  const changeRows = useMemo(
    () =>
      boms.flatMap((bom) =>
        (bom.changeHistory || []).map((entry) => ({
          ...entry,
          key: `${bom.id}-${entry.id}`,
          bomId: bom.id,
          projectId: bom.projectId,
          projectName: projectName(projects, bom.projectId),
        })),
      ),
    [boms, projects],
  );
  const changeTable = useTable(changeRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.bomId, row.action, row.description, row.by].join(' ').toLowerCase().includes(query);
  });

  const reviewRows = useMemo(
    () =>
      boms
        .filter((bom) => ['Under Review', 'Changes Requested'].includes(bom.status))
        .map((bom) => ({ ...bom, projectName: projectName(projects, bom.projectId) })),
    [boms, projects],
  );
  const reviewTable = useTable(reviewRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.id, row.name, row.projectName, row.engineer, row.status].join(' ').toLowerCase().includes(query);
  });

  const approvedRows = useMemo(
    () =>
      boms
        .filter((bom) => ['Approved', 'Released'].includes(bom.status))
        .map((bom) => ({ ...bom, projectName: projectName(projects, bom.projectId) })),
    [boms, projects],
  );
  const approvedTable = useTable(approvedRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.name, row.projectName, row.releaseRef].join(' ').toLowerCase().includes(query);
  });

  const transferTable = useTable(transfers, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.bomId, row.destination, row.remarks, row.status].join(' ').toLowerCase().includes(query);
  });

  const getTransfer = (bomId, destination, revision) =>
    transfers.find(
      (row) =>
        row.bomId === bomId && row.destination === destination && row.revision === revision,
    );

  const releaseRows = (destination) =>
    boms
      .filter((bom) => ['Approved', 'Released'].includes(bom.status))
      .map((bom) => {
        const transfer = getTransfer(bom.id, destination, bom.revision);
        return {
          ...bom,
          projectName: projectName(projects, bom.projectId),
          materialCount: bomMaterials(materials, bom.id).length,
          purchasedCount: bom.items.filter((item) => item.makeBuy === 'Buy').length,
          partCount: bom.items.length,
          materialQty: bomMaterials(materials, bom.id).reduce((total, row) => total + Number(row.qty || 0), 0),
          transferStatus: transfer?.status || 'Draft',
          transferId: transfer?.id || '',
          manufacturingRef: `MFG-${bom.projectId.slice(-3)}-${bom.id.slice(-3)}`,
        };
      });

  const purchaseTable = useTable(releaseRows('Purchase'), (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.id, row.name, row.projectName, row.releaseRef].join(' ').toLowerCase().includes(query);
  });
  const productionTable = useTable(releaseRows('Production'), (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.id, row.name, row.projectName].join(' ').toLowerCase().includes(query);
  });

  const comparison = useMemo(() => {
    const bom = boms.find((row) => row.id === compareBom) || boms[0];
    const effectiveBase = (bom.revisions || []).some((entry) => entry.revision === baseRevision)
      ? baseRevision
      : bom.revisions?.[0]?.revision || bom.revision;
    const effectiveTarget = (bom.revisions || []).some((entry) => entry.revision === targetRevision)
      ? targetRevision
      : bom.revision;
    const baseItems = itemsForRevision(bom, effectiveBase);
    const targetItems = itemsForRevision(bom, effectiveTarget);
    const baseMap = new Map(baseItems.map((item) => [item.partNumber, item]));
    const targetMap = new Map(targetItems.map((item) => [item.partNumber, item]));
    const added = targetItems.filter((item) => !baseMap.has(item.partNumber));
    const removed = baseItems.filter((item) => !targetMap.has(item.partNumber));
    const modified = targetItems
      .filter((item) => baseMap.has(item.partNumber))
      .map((item) => ({ item, before: baseMap.get(item.partNumber) }))
      .filter(({ item, before }) => Number(item.qty) !== Number(before.qty) || item.material !== before.material || item.makeBuy !== before.makeBuy || item.partRevision !== before.partRevision);
    return { bom, baseItems, targetItems, added, removed, modified, effectiveBase, effectiveTarget };
  }, [boms, compareBom, baseRevision, targetRevision]);

  const prepareTransfer = (bom, destination) => {
    if (!['Approved', 'Released'].includes(bom.status)) {
      showToast(`Approve the BOM before preparing a ${destination} handover.`, 'error');
      return;
    }
    const existing = getTransfer(bom.id, destination, bom.revision);
    if (existing && !['Rejected', 'Failed'].includes(existing.status)) {
      showToast(`A ${destination} handover already exists for ${bom.id} Rev ${bom.revision}.`, 'error');
      return;
    }
    addTransfer({
      id: `TRF-2026-${String(transfers.length + 1).padStart(3, '0')}`,
      bomId: bom.id,
      projectId: bom.projectId,
      destination,
      revision: bom.revision,
      date: TODAY,
      status: 'Ready',
      remarks: `Release prepared for ${destination} (simulated handover).`,
    });
    showToast(`${destination} release prepared for ${bom.id}.`);
  };

  const exportTransfers = () => {
    exportCsv('bom-transfers', [
      { key: 'id', label: 'Transfer ID' },
      { key: 'bomId', label: 'BOM Number' },
      { key: 'projectId', label: 'Project' },
      { key: 'destination', label: 'Destination' },
      { key: 'revision', label: 'Revision' },
      { key: 'date', label: 'Transfer Date' },
      { key: 'status', label: 'Status' },
      { key: 'remarks', label: 'Remarks' },
    ], transferTable.sorted);
    showToast('CSV export prepared.');
  };

  const transferActions = (row) => [
    ...(row.transferStatus === 'Draft'
      ? [{ key: 'prepare', label: 'Prepare handover', icon: Truck }]
      : []),
    ...(['Rejected', 'Failed'].includes(row.transferStatus)
      ? [{ key: 'prepare', label: 'Prepare new handover', icon: Truck }]
      : []),
    ...(row.transferStatus === 'Ready' ? [{ key: 'submit', label: 'Submit handover', icon: Send }] : []),
    ...(row.transferStatus === 'Submitted' ? [{ key: 'ack', label: 'Simulate acknowledgement', icon: CheckCircle2 }] : []),
  ];

  const handleTransferAction = (key, row, destination) => {
    if (key === 'prepare') prepareTransfer(row, destination);
    if (key === 'submit') {
      updateTransferStatus(row.transferId, 'Submitted');
      showToast(`${row.transferId} submitted (simulated).`);
    }
    if (key === 'ack') {
      updateTransferStatus(row.transferId, 'Acknowledged');
      showToast(`${row.transferId} acknowledged (simulated).`);
    }
  };

  const openDecision = (bom) => {
    setDecision(bom);
    setDecisionForm({ decision: 'Approved', comments: '' });
  };

  const saveDecision = () => {
    const result = recordBomDecision(decision.id, {
      decision: decisionForm.decision,
      comments: decisionForm.comments,
      by: REVIEWER_PERSONA,
    });
    if (result.error) showToast(result.error, 'error');
    else {
      showToast(`${decision.id} ${decisionForm.decision === 'Approved' ? 'approved' : decisionForm.decision === 'Reject' ? 'withdrawn' : 'changes requested'}.`);
      setDecision(null);
    }
  };

  return (
    <>
      <SectionNav
        sections={SECTIONS}
        active={section}
        onChange={setSection}
        counts={{ revisions: revisionRows.length, review: reviewRows.length, approved: approvedRows.length, transfers: transfers.length }}
      />

      {section === 'revisions' && (
        <>
          <KpiGrid>
            <StatCard icon={History} label="Revisions" value={String(revisionRows.length)} sub="Across all BOMs" tone="teal" />
            <StatCard icon={ClipboardCheck} label="BOMs" value={String(boms.length)} sub="Engineering structures" tone="blue" />
            <StatCard icon={ShieldCheck} label="Released Revisions" value={String(revisionRows.filter((row) => row.status === 'Released').length)} sub="Controlled release records" tone="emerald" />
            <StatCard icon={RefreshCw} label="Superseded" value={String(revisionRows.filter((row) => row.status === 'Superseded').length)} sub="Historic revisions retained" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={revisionTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="revision-search" value={revisionTable.search} onChange={revisionTable.setSearch} placeholder="Search BOM, revision..." ariaLabel="Search BOM revisions" />
                <Button variant="secondary" size="sm" icon={Download} onClick={() => { exportCsv('bom-revisions', [{ key: 'bomId', label: 'BOM Number' }, { key: 'revision', label: 'Revision' }, { key: 'previous', label: 'Previous' }, { key: 'date', label: 'Date' }, { key: 'by', label: 'Prepared By' }, { key: 'note', label: 'Change Description' }, { key: 'changeReason', label: 'Change Reason' }, { key: 'itemCount', label: 'Updated Line Items' }, { key: 'reviewStatus', label: 'Review Status' }, { key: 'approvalStatus', label: 'Approval Status' }, { key: 'releaseDate', label: 'Release Date' }, { key: 'status', label: 'Status' }], revisionTable.sorted); showToast('CSV export prepared.'); }}>Export</Button>
              </>
            }
            count={revisionTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'bomId', label: 'BOM Number', width: 96, sortable: true },
                { key: 'bomName', label: 'BOM Name', width: 140, render: (row) => <span className="cell-strong bom-clip">{row.bomName}</span> },
                { key: 'revision', label: 'Revision', width: 64, align: 'center', render: (row) => <span className="bom-rev-chip">{row.revision}{row.current ? ' · current' : ''}</span> },
                { key: 'previous', label: 'Previous', width: 64, align: 'center' },
                { key: 'note', label: 'Change Description', width: 180, render: (row) => <span className="cell-muted bom-clip">{row.note || '—'}</span> },
                { key: 'changeReason', label: 'Change Reason', width: 140, render: (row) => <span className="cell-muted bom-clip">{row.changeReason || '—'}</span> },
                { key: 'itemCount', label: 'Items', width: 50, align: 'center' },
                { key: 'by', label: 'Prepared By', width: 88 },
                { key: 'reviewStatus', label: 'Review', width: 92 },
                { key: 'approvalStatus', label: 'Approval', width: 92, render: (row) => <StatusBadge status={row.approvalStatus} tone={row.approvalStatus === 'Approved' ? 'green' : row.approvalStatus === 'Revision required' ? 'red' : 'orange'} /> },
                { key: 'releaseDate', label: 'Released', width: 88, render: (row) => row.releaseDate ? formatDate(row.releaseDate) : 'Not released' },
                { key: 'date', label: 'Revision Date', width: 88, render: (row) => formatDate(row.date) },
                { key: 'status', label: 'Status', width: 90, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
              ]}
              rows={revisionTable.pageRows}
              className="mech-register-table"
              sortKey={revisionTable.sortKey}
              sortDirection={revisionTable.sortDirection}
              onSort={revisionTable.toggleSort}
              rowActions={(row) => [
                { key: 'view', label: 'View BOM', icon: Eye },
                { key: 'history', label: 'View revision snapshot', icon: History },
                { key: 'compare', label: 'Compare revisions', icon: GitCompare },
                ...(row.current && ['Approved', 'Released'].includes(boms.find((bom) => bom.id === row.bomId)?.status)
                  ? [{ key: 'new', label: 'Create new revision', icon: Plus }]
                  : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/bom-cost/bom/${row.bomId}`);
                if (key === 'history') setRevisionView(row);
                if (key === 'compare') {
                  setCompareBom(row.bomId);
                  setTargetRevision(row.revision);
                  setSection('comparison');
                }
                if (key === 'new') {
                  setRevisionTarget(boms.find((bom) => bom.id === row.bomId));
                  setRevisionNote('');
                  setRevisionReason('');
                }
              }}
              ariaLabel="BOM revision register"
              emptyContent={<EmptyState icon={History} title="No revisions" message="BOM revisions appear here." />}
            />
            <Pagination page={revisionTable.page} totalPages={Math.max(1, Math.ceil(revisionTable.sorted.length / revisionTable.pageSize))} pageSize={revisionTable.pageSize} pageInfo={revisionTable.pageInfo} onPageChange={revisionTable.setPage} onPageSizeChange={(size) => { revisionTable.setPageSize(size); revisionTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'comparison' && (
        <>
          <section className="table-card bom-compare-controls">
            <Select id="compare-bom" label="BOM" options={boms.map((bom) => ({ value: bom.id, label: `${bom.id} · ${bom.name}` }))} value={compareBom} onChange={(event) => { setCompareBom(event.target.value); setBaseRevision(''); setTargetRevision(''); }} />
            <Select id="compare-base" label="Base Revision" options={(comparison.bom.revisions || []).map((entry) => ({ value: entry.revision, label: `Rev ${entry.revision} · ${formatDate(entry.date)}` }))} value={comparison.effectiveBase} onChange={(event) => setBaseRevision(event.target.value)} />
            <Select id="compare-target" label="Compare Revision" options={(comparison.bom.revisions || []).map((entry) => ({ value: entry.revision, label: `Rev ${entry.revision} · ${formatDate(entry.date)}` }))} value={comparison.effectiveTarget} onChange={(event) => setTargetRevision(event.target.value)} />
            <div className="bom-compare-summary">
              <span className="bom-diff is-added">+{comparison.added.length} added</span>
              <span className="bom-diff is-removed">−{comparison.removed.length} removed</span>
              <span className="bom-diff is-modified">{comparison.modified.length} modified</span>
            </div>
          </section>
          <section className="table-card">
            <ManageColumns {...diffColumns.managerProps} />
            <table className="data-table bom-diff-table">
              <thead>
                <tr>
                  {diffColumns.isVisible('change') && <th scope="col">Change</th>}
                  {diffColumns.isVisible('partNumber') && <th scope="col">Part Number</th>}
                  {diffColumns.isVisible('item') && <th scope="col">Item</th>}
                  {diffColumns.isVisible('baseQty') && <th scope="col">Base Quantity</th>}
                  {diffColumns.isVisible('targetQty') && <th scope="col">Target Quantity</th>}
                  {diffColumns.isVisible('material') && <th scope="col">Material</th>}
                  {diffColumns.isVisible('makeBuy') && <th scope="col">Make / Buy</th>}
                </tr>
              </thead>
              <tbody>
                {comparison.added.map((item) => (
                  <tr key={`add-${item.partNumber}`} className="bom-diff-row is-added">
                    {diffColumns.isVisible('change') && <td><span className="bom-diff is-added">Added</span></td>}
                    {diffColumns.isVisible('partNumber') && <td>{item.partNumber}</td>}
                    {diffColumns.isVisible('item') && <td>{item.name}</td>}
                    {diffColumns.isVisible('baseQty') && <td>—</td>}
                    {diffColumns.isVisible('targetQty') && <td>{item.qty} {item.uom}</td>}
                    {diffColumns.isVisible('material') && <td>{item.material}</td>}
                    {diffColumns.isVisible('makeBuy') && <td>{item.makeBuy}</td>}
                  </tr>
                ))}
                {comparison.removed.map((item) => (
                  <tr key={`rem-${item.partNumber}`} className="bom-diff-row is-removed">
                    {diffColumns.isVisible('change') && <td><span className="bom-diff is-removed">Removed</span></td>}
                    {diffColumns.isVisible('partNumber') && <td>{item.partNumber}</td>}
                    {diffColumns.isVisible('item') && <td>{item.name}</td>}
                    {diffColumns.isVisible('baseQty') && <td>{item.qty} {item.uom}</td>}
                    {diffColumns.isVisible('targetQty') && <td>—</td>}
                    {diffColumns.isVisible('material') && <td>{item.material}</td>}
                    {diffColumns.isVisible('makeBuy') && <td>{item.makeBuy}</td>}
                  </tr>
                ))}
                {comparison.modified.map(({ item, before }) => (
                  <tr key={`mod-${item.partNumber}`} className="bom-diff-row is-modified">
                    {diffColumns.isVisible('change') && <td><span className="bom-diff is-modified">Modified</span></td>}
                    {diffColumns.isVisible('partNumber') && <td>{item.partNumber}</td>}
                    {diffColumns.isVisible('item') && <td>{item.name}</td>}
                    {diffColumns.isVisible('baseQty') && <td>{before.qty} {before.uom}</td>}
                    {diffColumns.isVisible('targetQty') && <td>{item.qty} {item.uom}</td>}
                    {diffColumns.isVisible('material') && <td>{before.material !== item.material ? `${before.material} → ${item.material}` : item.material}</td>}
                    {diffColumns.isVisible('makeBuy') && <td>{before.makeBuy !== item.makeBuy ? `${before.makeBuy} → ${item.makeBuy}` : item.makeBuy}</td>}
                  </tr>
                ))}
                {comparison.added.length + comparison.removed.length + comparison.modified.length === 0 && (
                  <tr><td colSpan={diffColumns.visibleCount} className="cell-muted">No item differences between these revisions.</td></tr>
                )}
              </tbody>
            </table>
            <div className="bom-compare-notes">
              <strong>Revision notes</strong>
              {(comparison.bom.revisions || [])
                .filter((entry) => [comparison.effectiveBase, comparison.effectiveTarget].includes(entry.revision))
                .map((entry) => (
                  <p key={entry.revision}>Rev {entry.revision}: {entry.note}</p>
                ))}
            </div>
          </section>
        </>
      )}

      {section === 'changes' && (
        <>
          <KpiGrid>
            <StatCard icon={History} label="Change Records" value={String(changeRows.length)} sub="BOM creation to release" tone="teal" />
            <StatCard icon={ClipboardCheck} label="Approvals" value={String(changeRows.filter((row) => row.action === 'Approved').length)} sub="Approval actions recorded" tone="emerald" />
            <StatCard icon={Truck} label="Releases" value={String(changeRows.filter((row) => row.action === 'Released').length)} sub="Release actions recorded" tone="blue" />
            <StatCard icon={RefreshCw} label="Revisions" value={String(changeRows.filter((row) => row.action === 'Revision created').length)} sub="Controlled revision actions" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={changeTable.reset}>Refresh</Button>}
            right={<SearchInput id="change-search" value={changeTable.search} onChange={changeTable.setSearch} placeholder="Search change history..." ariaLabel="Search change history" />}
            count={changeTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'at', label: 'Date', width: 88, render: (row) => formatDate(row.at) },
                { key: 'bomId', label: 'BOM', width: 96 },
                { key: 'projectName', label: 'Project', width: 132, render: (row) => <span className="cell-muted bom-clip">{row.projectName}</span> },
                { key: 'by', label: 'User', width: 92 },
                { key: 'action', label: 'Action', width: 128 },
                { key: 'description', label: 'Description', width: 300, render: (row) => <span className="cell-muted bom-clip">{row.description}</span> },
              ]}
              rows={changeTable.pageRows}
              className="mech-register-table"
              ariaLabel="BOM change history"
              emptyContent={<EmptyState icon={History} title="No changes" message="BOM changes are recorded here." />}
            />
            <Pagination page={changeTable.page} totalPages={Math.max(1, Math.ceil(changeTable.sorted.length / changeTable.pageSize))} pageSize={changeTable.pageSize} pageInfo={changeTable.pageInfo} onPageChange={changeTable.setPage} onPageSizeChange={(size) => { changeTable.setPageSize(size); changeTable.setPage(1); }} pageSizeOptions={[10, 25]} />
          </section>
        </>
      )}

      {section === 'review' && (
        <>
          <KpiGrid>
            <StatCard icon={ClipboardCheck} label="Pending Reviews" value={String(reviewRows.filter((row) => row.status === 'Under Review').length)} sub="Awaiting a decision" tone="orange" />
            <StatCard icon={RefreshCw} label="Changes Requested" value={String(reviewRows.filter((row) => row.status === 'Changes Requested').length)} sub="Returned to engineering" tone="red" />
            <StatCard icon={ShieldCheck} label="Assigned to Me" value={String(reviewRows.filter((row) => row.reviewer === REVIEWER_PERSONA).length)} sub={`Reviewer ${REVIEWER_PERSONA}`} tone="blue" />
            <StatCard icon={CheckCircle2} label="Approved BOMs" value={String(approvedRows.length)} sub="Approved or released" tone="emerald" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={reviewTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="review-search" value={reviewTable.search} onChange={reviewTable.setSearch} placeholder="Search BOM review..." ariaLabel="Search BOM reviews" />
                <Button variant="secondary" size="sm" icon={ClipboardCheck} onClick={() => navigate('/design-review')}>Open Module 11 Reviews</Button>
              </>
            }
            count={reviewTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'BOM Number', width: 96 },
                { key: 'name', label: 'BOM Name', width: 180, render: (row) => <span className="cell-strong bom-clip">{row.name}</span> },
                { key: 'projectName', label: 'Project', width: 126, render: (row) => <span className="cell-muted bom-clip">{row.projectName}</span> },
                { key: 'revision', label: 'Rev', width: 52, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'reviewer', label: 'Assigned Reviewer', width: 112 },
                { key: 'engineer', label: 'Prepared By', width: 96 },
                { key: 'status', label: 'Status', width: 104, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
              ]}
              rows={reviewTable.pageRows}
              className="mech-register-table"
              rowActions={(row) => [
                { key: 'review', label: 'Open review', icon: ClipboardCheck },
                { key: 'view', label: 'View BOM', icon: Eye },
              ]}
              onRowAction={(key, row) => {
                if (key === 'review') openDecision(row);
                if (key === 'view') navigate(`/bom-cost/bom/${row.id}`);
              }}
              onRowClick={(row) => openDecision(row)}
              ariaLabel="BOM review queue"
              emptyContent={<EmptyState icon={ClipboardCheck} title="No pending reviews" message="Submitted BOMs appear in this queue." />}
            />
            <Pagination page={reviewTable.page} totalPages={Math.max(1, Math.ceil(reviewTable.sorted.length / reviewTable.pageSize))} pageSize={reviewTable.pageSize} pageInfo={reviewTable.pageInfo} onPageChange={reviewTable.setPage} onPageSizeChange={(size) => { reviewTable.setPageSize(size); reviewTable.setPage(1); }} pageSizeOptions={[10, 25]} />
          </section>
        </>
      )}

      {section === 'approved' && (
        <>
          <KpiGrid>
            <StatCard icon={ShieldCheck} label="Approved BOMs" value={String(approvedRows.filter((row) => row.status === 'Approved').length)} sub="Awaiting release" tone="blue" />
            <StatCard icon={PackageCheck} label="Released BOMs" value={String(approvedRows.filter((row) => row.status === 'Released').length)} sub="Released to downstream" tone="emerald" />
            <StatCard icon={Truck} label="Release References" value={String(approvedRows.filter((row) => row.releaseRef).length)} sub="Controlled release records" tone="teal" />
            <StatCard icon={ClipboardCheck} label="Total Approved Value" value={money(approvedRows.reduce((total, bom) => total + bomMaterials(materials, bom.id).reduce((sum, row) => sum + Number(row.qty) * Number(row.rate), 0) + bom.items.filter((item) => item.makeBuy === 'Buy').reduce((sum, item) => sum + bomItemTotal(item), 0), 0))} sub="Material + purchased estimate" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={approvedTable.reset}>Refresh</Button>}
            right={<SearchInput id="approved-search" value={approvedTable.search} onChange={approvedTable.setSearch} placeholder="Search approved BOM..." ariaLabel="Search approved BOMs" />}
            count={approvedTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'BOM Number', width: 96 },
                { key: 'name', label: 'BOM Name', width: 160, render: (row) => <span className="cell-strong bom-clip">{row.name}</span> },
                { key: 'projectName', label: 'Project', width: 126, render: (row) => <span className="cell-muted bom-clip">{row.projectName}</span> },
                { key: 'revision', label: 'Rev', width: 50, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'approvedBy', label: 'Approved By', width: 100, render: (row) => row.approvals?.at(-1)?.reviewer || '—' },
                { key: 'approvedAt', label: 'Approval Date', width: 94, render: (row) => row.approvals?.at(-1)?.date ? formatDate(row.approvals.at(-1).date) : '—' },
                { key: 'releaseRef', label: 'Release', width: 96, render: (row) => row.releaseRef || 'Not released' },
                { key: 'status', label: 'Status', width: 88, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
              ]}
              rows={approvedTable.pageRows}
              className="mech-register-table"
              rowActions={(row) => [
                { key: 'view', label: 'View BOM', icon: Eye },
                ...(row.status === 'Approved' ? [{ key: 'release', label: 'Release BOM', icon: PackageCheck }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/bom-cost/bom/${row.id}`);
                if (key === 'release') {
                  const result = releaseBom(row.id, 'Design Admin');
                  showToast(result?.error || `${row.id} released.`, result?.error ? 'error' : 'success');
                }
              }}
              ariaLabel="Approved BOM register"
              emptyContent={<EmptyState icon={ShieldCheck} title="No approved BOMs" message="Approved BOMs appear here." />}
            />
            <Pagination page={approvedTable.page} totalPages={Math.max(1, Math.ceil(approvedTable.sorted.length / approvedTable.pageSize))} pageSize={approvedTable.pageSize} pageInfo={approvedTable.pageInfo} onPageChange={approvedTable.setPage} onPageSizeChange={(size) => { approvedTable.setPageSize(size); approvedTable.setPage(1); }} pageSizeOptions={[10, 25]} />
          </section>
        </>
      )}

      {(section === 'purchase' || section === 'production') && (
        <>
          <KpiGrid>
            <StatCard icon={Truck} label={`${DEST_LABEL[section === 'purchase' ? 'Purchase' : 'Production']} Releases`} value={String((section === 'purchase' ? purchaseTable : productionTable).sorted.length)} sub="From approved and released BOMs" tone="teal" />
            <StatCard icon={PackageCheck} label="Released BOMs" value={String(boms.filter((bom) => bom.status === 'Released').length)} sub="Fully released structures" tone="emerald" />
            <StatCard icon={ClipboardCheck} label="Handed Over" value={String(transfers.filter((row) => row.destination === DEST_LABEL[section === 'purchase' ? 'Purchase' : 'Production'] && row.status === 'Acknowledged').length)} sub="Simulated acknowledgements" tone="blue" />
            <StatCard icon={RefreshCw} label="Pending Handover" value={String(transfers.filter((row) => row.destination === DEST_LABEL[section === 'purchase' ? 'Purchase' : 'Production'] && ['Ready', 'Submitted'].includes(row.status)).length)} sub="Ready or submitted" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={(section === 'purchase' ? purchaseTable : productionTable).reset}>Refresh</Button>}
            right={<SearchInput id={`release-${section}-search`} value={(section === 'purchase' ? purchaseTable : productionTable).search} onChange={(section === 'purchase' ? purchaseTable : productionTable).setSearch} placeholder="Search BOM, project..." ariaLabel="Search releases" />}
            count={(section === 'purchase' ? purchaseTable : productionTable).pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={section === 'purchase'
                ? [
                    { key: 'id', label: 'BOM Number', width: 96 },
                    { key: 'projectName', label: 'Project', width: 130, render: (row) => <span className="cell-muted bom-clip">{row.projectName}</span> },
                    { key: 'revision', label: 'BOM Rev', width: 62, align: 'center' },
                    { key: 'materialCount', label: 'Materials', width: 76, align: 'center' },
                    { key: 'materialQty', label: 'Req. Qty', width: 72, align: 'right' },
                    { key: 'purchasedCount', label: 'Purchased', width: 80, align: 'center' },
                    { key: 'releaseRef', label: 'Release Ref', width: 100, render: (row) => row.releaseRef || '—' },
                    { key: 'transferStatus', label: 'Transfer', width: 100, render: (row) => <StatusBadge status={row.transferStatus} tone={statusTone(row.transferStatus)} /> },
                  ]
                : [
                    { key: 'id', label: 'BOM Number', width: 96 },
                    { key: 'projectName', label: 'Project', width: 130, render: (row) => <span className="cell-muted bom-clip">{row.projectName}</span> },
                    { key: 'revision', label: 'BOM Rev', width: 62, align: 'center' },
                    { key: 'partCount', label: 'Part List', width: 72, align: 'center' },
                    { key: 'manufacturingRef', label: 'Mfg Reference', width: 116 },
                    { key: 'releaseRef', label: 'Release Ref', width: 100, render: (row) => row.releaseRef || '—' },
                    { key: 'transferStatus', label: 'Transfer', width: 100, render: (row) => <StatusBadge status={row.transferStatus} tone={statusTone(row.transferStatus)} /> },
                  ]}
              rows={(section === 'purchase' ? purchaseTable : productionTable).pageRows}
              className="mech-register-table"
              rowActions={(row) => transferActions(row)}
              onRowAction={(key, row) => handleTransferAction(key, row, DEST_LABEL[section === 'purchase' ? 'Purchase' : 'Production'])}
              recordHref={(row) => `/bom-cost/bom/${row.bomId || row.id}`}
              onRowClick={(row) => navigate(`/bom-cost/bom/${row.id}`)}
              ariaLabel={section === 'purchase' ? 'Release to purchase' : 'Release to production'}
              emptyContent={<EmptyState icon={Truck} title="No releases" message="Approved BOMs can be prepared for handover." />}
            />
            <Pagination page={(section === 'purchase' ? purchaseTable : productionTable).page} totalPages={Math.max(1, Math.ceil((section === 'purchase' ? purchaseTable : productionTable).sorted.length / (section === 'purchase' ? purchaseTable : productionTable).pageSize))} pageSize={(section === 'purchase' ? purchaseTable : productionTable).pageSize} pageInfo={(section === 'purchase' ? purchaseTable : productionTable).pageInfo} onPageChange={(section === 'purchase' ? purchaseTable : productionTable).setPage} onPageSizeChange={(size) => { const table = section === 'purchase' ? purchaseTable : productionTable; table.setPageSize(size); table.setPage(1); }} pageSizeOptions={[10, 25]} />
          </section>
          <p className="mech-footnote">
            Handovers are simulated local state. No Purchase or Production record is actually created by this module.
          </p>
        </>
      )}

      {section === 'transfers' && (
        <>
          <KpiGrid>
            <StatCard icon={Truck} label="Transfers" value={String(transfers.length)} sub="Simulated handovers" tone="teal" />
            <StatCard icon={CheckCircle2} label="Acknowledged" value={String(transfers.filter((row) => row.status === 'Acknowledged').length)} sub="Mock acknowledgement" tone="emerald" />
            <StatCard icon={Send} label="Submitted" value={String(transfers.filter((row) => row.status === 'Submitted').length)} sub="Awaiting acknowledgement" tone="orange" />
            <StatCard icon={XCircle} label="Rejected / Failed" value={String(transfers.filter((row) => ['Rejected', 'Failed'].includes(row.status)).length)} sub="Not accepted downstream" tone="red" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={transferTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="transfer-search" value={transferTable.search} onChange={transferTable.setSearch} placeholder="Search transfer, BOM..." ariaLabel="Search transfers" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportTransfers}>Export</Button>
              </>
            }
            count={transferTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Transfer ID', width: 92 },
                { key: 'bomId', label: 'BOM Number', width: 96 },
                { key: 'projectId', label: 'Project', width: 100 },
                { key: 'destination', label: 'Destination', width: 96 },
                { key: 'revision', label: 'Rev', width: 50, align: 'center' },
                { key: 'date', label: 'Transfer Date', width: 88, render: (row) => formatDate(row.date) },
                { key: 'status', label: 'Status', width: 100, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
                { key: 'remarks', label: 'Remarks', width: 240, render: (row) => <span className="cell-muted bom-clip">{row.remarks}</span> },
              ]}
              rows={transferTable.pageRows}
              className="mech-register-table"
              rowActions={(row) => [
                ...(row.status === 'Submitted' ? [{ key: 'ack', label: 'Acknowledge (mock)', icon: CheckCircle2 }] : []),
                ...(row.status === 'Submitted' ? [{ key: 'reject', label: 'Reject (mock)', icon: XCircle, danger: true }] : []),
                ...(['Draft', 'Ready'].includes(row.status) ? [{ key: 'delete', label: 'Remove transfer', icon: XCircle, danger: true }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'ack') { updateTransferStatus(row.id, 'Acknowledged'); showToast(`${row.id} acknowledged (simulated).`); }
                if (key === 'reject') { updateTransferStatus(row.id, 'Rejected'); showToast(`${row.id} rejected (simulated).`); }
                if (key === 'delete') { removeTransfer(row.id); showToast(`${row.id} removed.`); }
              }}
              ariaLabel="Transfer history"
              emptyContent={<EmptyState icon={Truck} title="No transfers" message="Prepared handovers appear here." />}
            />
            <Pagination page={transferTable.page} totalPages={Math.max(1, Math.ceil(transferTable.sorted.length / transferTable.pageSize))} pageSize={transferTable.pageSize} pageInfo={transferTable.pageInfo} onPageChange={transferTable.setPage} onPageSizeChange={(size) => { transferTable.setPageSize(size); transferTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title="BOM Review Decision"
        subtitle={decision ? `${decision.id} · Rev ${decision.revision}` : ''}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>Cancel</Button>
            <Button icon={CheckCircle2} onClick={saveDecision}>{decisionForm.decision}</Button>
          </>
        }
      >
        {decision && (
          <>
            <div className="fact-grid">
              <Fact label="BOM">{decision.name}</Fact>
              <Fact label="Project">{decision.projectId}</Fact>
              <Fact label="Prepared By">{decision.engineer}</Fact>
              <Fact label="Assigned Reviewer">{decision.reviewer}</Fact>
              <Fact label="Status">{decision.status}</Fact>
              <Fact label="BOM Items">{String(decision.items.length)}</Fact>
            </div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <Select
                id="review-decision"
                label="Decision"
                options={[
                  { value: 'Approved', label: 'Approve' },
                  { value: 'Request Changes', label: 'Request Changes' },
                  { value: 'Reject', label: 'Reject / Withdraw' },
                ]}
                value={decisionForm.decision}
                onChange={(event) => setDecisionForm((previous) => ({ ...previous, decision: event.target.value }))}
              />
              <div className="form-field">
                <span className="form-label">Approval Record</span>
                <span className="form-static">{decision.approvals?.length ? `${decision.approvals.length} prior decision(s)` : 'No prior decisions'}</span>
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="review-comments"
                  label="Review Comments"
                  rows={3}
                  value={decisionForm.comments}
                  hint={decisionForm.decision !== 'Approved' ? 'Comments are required for changes or rejection.' : ''}
                  onChange={(event) => setDecisionForm((previous) => ({ ...previous, comments: event.target.value }))}
                />
              </div>
            </div>
            {decision.approvals?.length > 0 && (
              <ul className="bom-approval-list">
                {decision.approvals.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.decision}</strong> · {entry.reviewer} · {formatDate(entry.date)}
                    <span>{entry.comments}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(revisionView)}
        onClose={() => setRevisionView(null)}
        title="BOM Revision Snapshot"
        subtitle={revisionView ? `${revisionView.bomId} · Rev ${revisionView.revision}` : ''}
        maxWidth="max-w-3xl"
        footer={<Button variant="ghost" onClick={() => setRevisionView(null)}>Close</Button>}
      >
        {revisionView && (
          <>
            <div className="fact-grid">
              <Fact label="Previous Revision">{revisionView.previous ? `Rev ${revisionView.previous}` : 'Initial revision'}</Fact>
              <Fact label="Prepared By">{revisionView.by}</Fact>
              <Fact label="Revision Date">{formatDate(revisionView.date)}</Fact>
              <Fact label="Review Status">{revisionView.reviewStatus}</Fact>
              <Fact label="Approval Status">{revisionView.approvalStatus}</Fact>
              <Fact label="Release Date">{revisionView.releaseDate ? formatDate(revisionView.releaseDate) : 'Not released'}</Fact>
              <Fact label="Updated Line Items">{revisionView.itemCount}</Fact>
              <Fact label="Status">{revisionView.status}</Fact>
            </div>
            <div className="form-grid" style={{ marginTop: '12px' }}>
              <div className="form-grid-full"><div className="form-field"><span className="form-label">Change Description</span><span className="form-static">{revisionView.note || '—'}</span></div></div>
              <div className="form-grid-full"><div className="form-field"><span className="form-label">Change Reason</span><span className="form-static">{revisionView.changeReason || '—'}</span></div></div>
            </div>
            <ManageColumns {...snapshotColumns.managerProps} />
            <div className="bom-detail-items" style={{ marginTop: '12px', overflowX: 'auto' }}>
              <table className="data-table mfg-mini-table">
                <thead>
                  <tr>
                    {snapshotColumns.isVisible('itemNo') && <th>Item No.</th>}
                    {snapshotColumns.isVisible('partNumber') && <th>Part Number</th>}
                    {snapshotColumns.isVisible('name') && <th>Part Name</th>}
                    {snapshotColumns.isVisible('qty') && <th>Qty</th>}
                    {snapshotColumns.isVisible('uom') && <th>UOM</th>}
                    {snapshotColumns.isVisible('material') && <th>Material</th>}
                    {snapshotColumns.isVisible('rev') && <th>Part Rev</th>}
                    {snapshotColumns.isVisible('makeBuy') && <th>Make / Buy</th>}
                  </tr>
                </thead>
                <tbody>
                  {(revisionView.items || []).map((item, index) => (
                    <tr key={item.id}>
                      {snapshotColumns.isVisible('itemNo') && <td>{item.itemNumber || String((index + 1) * 10)}</td>}
                      {snapshotColumns.isVisible('partNumber') && <td>{item.partNumber}</td>}
                      {snapshotColumns.isVisible('name') && <td>{item.name}</td>}
                      {snapshotColumns.isVisible('qty') && <td>{item.qty}</td>}
                      {snapshotColumns.isVisible('uom') && <td>{item.uom}</td>}
                      {snapshotColumns.isVisible('material') && <td>{item.material}</td>}
                      {snapshotColumns.isVisible('rev') && <td>{item.partRevision}</td>}
                      {snapshotColumns.isVisible('makeBuy') && <td>{item.makeBuy}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dash-modal-note">This revision snapshot is retained as issued. Any later change creates a new revision; released item lines are not edited in place.</p>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(revisionTarget)}
        onClose={() => setRevisionTarget(null)}
        title="Create BOM Revision"
        subtitle={revisionTarget ? `${revisionTarget.id} · current Rev ${revisionTarget.revision}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevisionTarget(null)}>Cancel</Button>
            <Button
              icon={Plus}
              onClick={() => {
                if (!revisionNote.trim() || !revisionReason.trim()) {
                  showToast('Enter both the change description and change reason.', 'error');
                  return;
                }
                const result = createRevision(revisionTarget.id, revisionTarget.engineer, revisionNote, revisionReason);
                showToast(result.error || `${revisionTarget.id} moved to Rev ${result.revision}.`, result.error ? 'error' : 'success');
                setRevisionTarget(null);
              }}
            >
              Create Revision
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-grid-full">
            <Textarea
              id="revision-note"
              label="Change Description"
              rows={3}
              value={revisionNote}
              placeholder="What changed in the BOM structure or line items"
              onChange={(event) => setRevisionNote(event.target.value)}
            />
          </div>
          <div className="form-grid-full">
            <Textarea
              id="revision-reason"
              label="Change Reason"
              rows={2}
              value={revisionReason}
              placeholder="Why the change is required (engineering, quality, cost, customer request)"
              onChange={(event) => setRevisionReason(event.target.value)}
            />
          </div>
        </div>
        <p className="dash-modal-note">
          The current revision is retained in history and its released items are never overwritten. The new revision
          starts as Draft and requires review and approval again.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
