import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Factory,
  FileCheck2,
  MessageSquarePlus,
  ShoppingCart,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiGrid,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { BarList, DonutChart } from '../../components/dashboard/Charts';
import { useTransfers } from '../../context/TransfersContext';
import {
  ACK_STATUSES,
  PROJECTS,
  TODAY,
  addDays,
  formatDate,
  projectLabel,
  sourceFor,
  transferDashboard,
  transferStatusTone,
} from '../../data/transfersData';
import {
  AcknowledgementDialog,
  SectionNav,
  Toast,
  TransferStatus,
  useToast,
} from './transfersUi';

const SECTIONS = [
  { key: 'purchase-ack', label: 'Purchase Acknowledgement' },
  { key: 'production-ack', label: 'Production Acknowledgement' },
  { key: 'purchase-progress', label: 'Purchase Progress' },
  { key: 'production-progress', label: 'Production Progress' },
  { key: 'pending', label: 'Pending Acknowledgements' },
  { key: 'dashboard', label: 'Transfer Status Dashboard' },
];

const ackTone = (status) => transferStatusTone(status === 'Pending' ? 'Acknowledgement Pending' : status);

function AcknowledgementSection({ destination }) {
  const { transfers, acknowledgeTransfer } = useTransfers();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  const [target, setTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  const rows = transfers
    .filter((row) => row.destinations?.includes(destination) && (destination === 'Purchase' ? row.purchase?.handover : row.production?.handover))
    .map((row) => {
      const side = destination === 'Purchase' ? row.purchase : row.production;
      const source = sourceFor(row);
      return {
        ...row,
        side,
        handoverRef: side?.handover?.id,
        owner: side?.handover?.owner,
        acknowledgementStatus: side?.acknowledgement?.status || 'Pending',
        acknowledgementDate: side?.acknowledgement?.date || '',
        comments: side?.acknowledgement?.comments || '',
        bomNumber: source?.bomNumber || (row.deliverableType === 'BOM' ? row.deliverableNumber : row.purchase?.requisitions?.[0]?.bomNumber || '—'),
        packageId: side?.package?.id || '—',
      };
    });
  const filtered = rows.filter((row) => {
    if (statusFilter !== 'All' && row.acknowledgementStatus !== statusFilter) return false;
    if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
    if (!search.trim()) return true;
    return [row.id, row.projectId, row.deliverableNumber, row.handoverRef, row.owner, row.bomNumber, row.packageId, row.acknowledgementStatus].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <>
      <Toolbar
        left={<>
          <Select id={`${destination}-ack-project`} options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label={`Filter ${destination} acknowledgements by project`} />
          <Select id={`${destination}-ack-status-filter`} options={[{ value: 'All', label: 'All Statuses' }, ...['Pending', ...ACK_STATUSES].map((value) => ({ value, label: value }))]} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={`Filter ${destination} acknowledgement status`} />
        </>}
        right={<SearchInput id={`${destination}-ack-search`} value={search} onChange={setSearch} placeholder={`Search ${destination.toLowerCase()} acknowledgement…`} ariaLabel={`Search ${destination} acknowledgements`} />}
        count={`${filtered.length} handover(s)`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'handoverRef', label: `${destination} Handover Reference`, width: 195, render: (row) => <span className="cell-id">{row.handoverRef}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            destination === 'Purchase'
              ? { key: 'bomNumber', label: 'BOM Number', width: 135, render: (row) => row.bomNumber }
              : { key: 'deliverableNumber', label: 'Drawing Number', width: 160, render: (row) => row.deliverableNumber },
            { key: 'revision', label: 'Revision', width: 90, render: (row) => <span className="approvals-exact-rev">Rev {row.revision}</span> },
            ...(destination === 'Production' ? [{ key: 'packageId', label: 'Manufacturing Package', width: 145 }] : []),
            { key: 'owner', label: `${destination} Owner`, width: 195 },
            { key: 'acknowledgementStatus', label: 'Acknowledgement Status', width: 180, render: (row) => <StatusBadge status={row.acknowledgementStatus} tone={ackTone(row.acknowledgementStatus)} /> },
            { key: 'acknowledgementDate', label: 'Acknowledgement Date', width: 150, render: (row) => row.acknowledgementDate ? formatDate(row.acknowledgementDate) : '—' },
            { key: 'comments', label: 'Comments', width: 240 },
          ]}
          rows={filtered}
          recordHref={(row) => `/transfers/${row.id}`}
          onRowClick={(row) => setTarget(row)}
          rowActions={(row) => [
            { key: 'ack', label: row.acknowledgementStatus === 'Pending' ? 'Record mock acknowledgement' : 'Update mock acknowledgement', icon: CheckCircle2 },
            { key: 'view', label: 'View transfer', icon: Eye },
          ]}
          onRowAction={(key, row) => {
            if (key === 'ack') setTarget(row);
            if (key === 'view') navigate(`/transfers/${row.id}`);
          }}
          ariaLabel={`${destination} acknowledgements`}
          emptyContent={<EmptyState icon={CheckCircle2} title={`No ${destination} acknowledgements`} message={`No ${destination.toLowerCase()} handovers are recorded yet.`} />}
        />
      </section>
      <AcknowledgementDialog
        open={Boolean(target)}
        transfer={target}
        destination={destination}
        onClose={() => setTarget(null)}
        onSubmit={(config) => {
          const result = acknowledgeTransfer(target.id, destination, config);
          if (!result.error) showToast(`${destination} acknowledgement recorded locally.`);
          return result;
        }}
      />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function ProgressSection({ destination }) {
  const { transfers } = useTransfers();
  const rows = transfers.filter((row) => row.destinations?.includes(destination)).map((row) => {
    const side = destination === 'Purchase' ? row.purchase : row.production;
    return { ...row, side, p: side?.progress || {} };
  });
  return (
    <>
      <div className="transfers-progress-intro">
        <div><span className="transfers-kicker">{destination} tracking</span><h3>{destination} progress</h3><p>{destination === 'Purchase' ? 'Requisition preparation, handover, acknowledgement and CPP / CPR / TV / CPO tracking.' : 'Drawing release, manufacturing package preparation, handover, acknowledgement and engineering readiness.'}</p></div>
        <TransferStatus status={destination === 'Purchase' ? 'In Purchase Processing (Mock)' : 'In Production Processing (Mock)'} />
      </div>
      <section className="table-card">
        <DataTable
          ariaLabel={`${destination} progress`}
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'deliverableNumber', label: destination === 'Purchase' ? 'BOM / Deliverable' : 'Drawing / Package', width: 185 },
            destination === 'Purchase'
              ? { key: 'requisition', label: 'Requisition Preparation', width: 170, render: (row) => <StatusBadge status={row.p.requisition || 'Not Started'} tone={transferStatusTone(row.p.requisition)} /> }
              : { key: 'drawingRelease', label: 'Drawing Release', width: 150, render: (row) => <StatusBadge status={row.p.drawingRelease || 'Not Started'} tone={transferStatusTone(row.p.drawingRelease)} /> },
            destination === 'Purchase'
              ? { key: 'workflow', label: 'CPP / CPR / TV / CPO', width: 165, render: (row) => <StatusBadge status={row.p.workflow || 'Not Started'} tone={transferStatusTone(row.p.workflow)} /> }
              : { key: 'packagePreparation', label: 'Manufacturing Package Preparation', width: 220, render: (row) => <StatusBadge status={row.p.packagePreparation || 'Not Started'} tone={transferStatusTone(row.p.packagePreparation)} /> },
            { key: 'handover', label: 'Handover Recorded', width: 150, render: (row) => <StatusBadge status={row.p.handover || 'Not Started'} tone={transferStatusTone(row.p.handover)} /> },
            { key: 'acknowledgement', label: 'Acknowledgement', width: 175, render: (row) => <StatusBadge status={row.p.acknowledgement || 'Pending'} tone={ackTone(row.p.acknowledgement)} /> },
            destination === 'Purchase'
              ? { key: 'mockPurchase', label: 'Mock Purchase Progress', width: 190, render: (row) => <StatusBadge status={row.p.mockPurchase || 'Not Started'} tone={transferStatusTone(row.p.mockPurchase)} /> }
              : { key: 'readiness', label: 'Production Readiness', width: 165, render: (row) => <StatusBadge status={row.p.readiness || 'Not Started'} tone={transferStatusTone(row.p.readiness)} /> },
            { key: 'outstanding', label: 'Outstanding Items', width: 240, render: (row) => row.p.outstanding || 'None' },
            { key: 'remarks', label: 'Remarks', width: 260, render: (row) => row.p.remarks || '—' },
          ]}
          rows={rows}
          emptyContent={<EmptyState icon={destination === 'Purchase' ? ShoppingCart : Factory} title={`No ${destination} progress`} message={`No transfers have selected ${destination} as a destination.`} />}
        />
      </section>
    </>
  );
}

function PendingAcknowledgementsSection() {
  const { transfers, acknowledgeTransfer } = useTransfers();
  const { toast, showToast, clearToast } = useToast();
  const [target, setTarget] = useState(null);
  const [destinationFilter, setDestinationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const cutoff = addDays(TODAY, -3);

  const rows = transfers.flatMap((row) =>
    (['Purchase', 'Production']).flatMap((destination) => {
      if (!row.destinations?.includes(destination)) return [];
      const side = destination === 'Purchase' ? row.purchase : row.production;
      if (!side?.handover) return [];
      const status = side.acknowledgement?.status || 'Pending';
      if (['Acknowledged', 'Acknowledged with Remarks'].includes(status)) return [];
      return [{
        key: `${row.id}-${destination}`,
        transfer: row,
        destination,
        transferId: row.id,
        projectId: row.projectId,
        handoverRef: side.handover.id,
        owner: side.handover.owner,
        status,
        date: side.handover.date,
        overdue: side.handover.date < cutoff,
        clarification: ['Rejected', 'On Hold'].includes(status),
        comments: side.acknowledgement?.comments || side.handover.notes || '',
      }];
    }),
  );
  const filtered = rows.filter((row) => {
    if (destinationFilter !== 'All' && row.destination !== destinationFilter) return false;
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    if (!search.trim()) return true;
    return [row.transferId, row.projectId, row.handoverRef, row.owner, row.status].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <>
      <Toolbar
        left={<>
          <Select id="pending-ack-destination" options={[{ value: 'All', label: 'Both Destinations' }, { value: 'Purchase', label: 'Purchase' }, { value: 'Production', label: 'Production' }]} value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)} aria-label="Filter pending acknowledgements by destination" />
          <Select id="pending-ack-status" options={[{ value: 'All', label: 'All Pending Statuses' }, ...['Pending', 'Rejected', 'On Hold'].map((value) => ({ value, label: value }))]} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter pending acknowledgement status" />
        </>}
        right={<SearchInput id="pending-ack-search" value={search} onChange={setSearch} placeholder="Search transfer, handover, owner…" ariaLabel="Search pending acknowledgements" />}
        count={`${filtered.length} pending destination acknowledgement(s)`}
      />
      <div className="transfers-pending-summary">
        <span><strong>{filtered.filter((row) => row.destination === 'Purchase').length}</strong> Purchase pending</span>
        <span><strong>{filtered.filter((row) => row.destination === 'Production').length}</strong> Production pending</span>
        <span><strong>{filtered.filter((row) => row.overdue).length}</strong> overdue</span>
        <span><strong>{filtered.filter((row) => row.clarification).length}</strong> clarification required</span>
      </div>
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'transferId', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.transferId}</span> },
            { key: 'destination', label: 'Destination', width: 110, render: (row) => <span className={`transfers-destination is-${row.destination.toLowerCase()}`}>{row.destination}</span> },
            { key: 'handoverRef', label: 'Handover Reference', width: 160, render: (row) => <span className="cell-id">{row.handoverRef}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'owner', label: 'Receiving Owner', width: 195 },
            { key: 'status', label: 'Status', width: 125, render: (row) => <StatusBadge status={row.status} tone={ackTone(row.status)} /> },
            { key: 'date', label: 'Handover Date', width: 120, render: (row) => formatDate(row.date) },
            { key: 'flags', label: 'Attention', width: 175, render: (row) => <div className="approvals-inline-badges">{row.overdue && <StatusBadge status="Overdue" tone="red" />}{row.clarification && <StatusBadge status="Clarification" tone="orange" />}{!row.overdue && !row.clarification && <span className="cell-muted">Awaiting receiver</span>}</div> },
            { key: 'comments', label: 'Comments', width: 230 },
          ]}
          rows={filtered}
          onRowClick={(row) => setTarget({ transfer: row.transfer, destination: row.destination })}
          rowActions={(row) => [{ key: 'ack', label: `Record ${row.destination} acknowledgement`, icon: CheckCircle2 }]}
          onRowAction={(key, row) => { if (key === 'ack') setTarget({ transfer: row.transfer, destination: row.destination }); }}
          ariaLabel="Pending acknowledgements"
          emptyContent={<EmptyState icon={CheckCircle2} title="No pending acknowledgements" message="All recorded handovers have a final acknowledgement." />}
        />
      </section>
      <AcknowledgementDialog
        open={Boolean(target)}
        transfer={target?.transfer}
        destination={target?.destination || 'Purchase'}
        onClose={() => setTarget(null)}
        onSubmit={(config) => {
          const result = acknowledgeTransfer(target.transfer.id, target.destination, config);
          if (!result.error) showToast('Acknowledgement recorded locally.');
          return result;
        }}
      />
      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

function DashboardSection() {
  const { transfers } = useTransfers();
  const dashboard = useMemo(() => transferDashboard(transfers), [transfers]);
  const colors = ['#0d9488', '#2563eb', '#f59e0b', '#7c3aed', '#dc2626', '#64748b', '#0891b2'];
  const distribution = dashboard.distribution.map((row, index) => ({ ...row, key: row.label, color: colors[index % colors.length] }));
  const projectBars = dashboard.projects.map((row, index) => ({ key: row.projectId, label: row.projectId, value: row.total, color: colors[index % colors.length] }));
  return (
    <>
      <KpiGrid className="transfers-dashboard-kpis">
        <StatCard icon={FileCheck2} label="Total Transfers" value={String(dashboard.total)} sub="All local transfer records" tone="teal" />
        <StatCard icon={ShoppingCart} label="Purchase Transfers" value={String(dashboard.purchaseTransfers)} sub="Purchase destination selected" tone="blue" />
        <StatCard icon={Factory} label="Production Transfers" value={String(dashboard.productionTransfers)} sub="Production destination selected" tone="purple" />
        <StatCard icon={Clock3} label="Acknowledgements Pending" value={String(dashboard.pending)} sub="Destination handovers awaiting receiver" tone="orange" />
        <StatCard icon={CheckCircle2} label="Acknowledged Transfers" value={String(dashboard.acknowledgedTransfers)} sub="All selected destinations acknowledged" tone="emerald" />
        <StatCard icon={AlertTriangle} label="Transfers On Hold" value={String(dashboard.onHold)} sub="Destination acknowledgement on hold" tone="red" />
        <StatCard icon={CheckCircle2} label="Completed Mock Handovers" value={String(dashboard.completed)} sub="Acknowledged or completed local records" tone="emerald" />
      </KpiGrid>
      <div className="transfers-dashboard-grid">
        <Card title="Status distribution" subtitle="Calculated from current transfer records">
          <DonutChart data={distribution} centerValue={dashboard.total} centerLabel="Transfers" ariaLabel="Transfer status distribution" />
        </Card>
        <Card title="Transfers by project" subtitle="Purchase and Production destination counts">
          <BarList data={projectBars} ariaLabel="Transfers by project" />
        </Card>
      </div>
      <Card title="Project-wise summary" subtitle="Destination and pending acknowledgement counts">
        <ManageColumns {...summaryColumns.managerProps} />
        <div className="table-wrap">
          <table className="data-table table-pin-left" aria-label="Project-wise transfer summary">
            <thead>
              <tr>
                {summaryColumns.isVisible('project') && <th>Project</th>}
                {summaryColumns.isVisible('total') && <th>Total Transfers</th>}
                {summaryColumns.isVisible('purchase') && <th>Purchase</th>}
                {summaryColumns.isVisible('production') && <th>Production</th>}
                {summaryColumns.isVisible('pending') && <th>Acknowledgement Pending</th>}
              </tr>
            </thead>
            <tbody>
              {dashboard.projects.map((row) => (
                <tr key={row.projectId}>
                  {summaryColumns.isVisible('project') && <td><span className="transfers-project-cell"><strong>{row.projectId}</strong><small>{row.project}</small></span></td>}
                  {summaryColumns.isVisible('total') && <td>{row.total}</td>}
                  {summaryColumns.isVisible('purchase') && <td>{row.purchase}</td>}
                  {summaryColumns.isVisible('production') && <td>{row.production}</td>}
                  {summaryColumns.isVisible('pending') && <td>{row.pending}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="transfers-tip"><MessageSquarePlus aria-hidden="true" /><span>Purchase and Production acknowledgements are independent. A transfer is not fully acknowledged until every selected destination has its required acknowledgement recorded.</span></div>
    </>
  );
}

export default function TransferTrackingTab() {
  const summaryColumns = useTableColumnVisibility('/transfers/tracking#project-summary', [
    { key: 'project', label: 'Project' },
    { key: 'total', label: 'Total Transfers' },
    { key: 'purchase', label: 'Purchase' },
    { key: 'production', label: 'Production' },
    { key: 'pending', label: 'Acknowledgement Pending' },
  ]);
  const { transfers } = useTransfers();
  const [section, setSection] = useState('purchase-ack');
  const purchaseAcks = transfers.filter((row) => row.destinations?.includes('Purchase') && row.purchase?.handover);
  const productionAcks = transfers.filter((row) => row.destinations?.includes('Production') && row.production?.handover);
  const pending = transfers.reduce(
    (count, row) =>
      count +
      (['Purchase', 'Production'].filter((destination) => {
        const side = destination === 'Purchase' ? row.purchase : row.production;
        return row.destinations?.includes(destination) && side?.handover && !['Acknowledged', 'Acknowledged with Remarks'].includes(side?.acknowledgement?.status);
      }).length),
    0,
  );
  const counts = {
    'purchase-ack': purchaseAcks.length,
    'production-ack': productionAcks.length,
    'purchase-progress': transfers.filter((row) => row.destinations?.includes('Purchase')).length,
    'production-progress': transfers.filter((row) => row.destinations?.includes('Production')).length,
    pending,
    dashboard: undefined,
  };
  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />
      {section === 'purchase-ack' && <AcknowledgementSection destination="Purchase" />}
      {section === 'production-ack' && <AcknowledgementSection destination="Production" />}
      {section === 'purchase-progress' && <ProgressSection destination="Purchase" />}
      {section === 'production-progress' && <ProgressSection destination="Production" />}
      {section === 'pending' && <PendingAcknowledgementsSection />}
      {section === 'dashboard' && <DashboardSection />}
    </>
  );
}
