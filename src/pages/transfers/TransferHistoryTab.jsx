import { useState } from 'react';
import {
  ArrowRight,
  Ban,
  Eye,
  FileClock,
  FileText,
  History,
  PackageCheck,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  SearchInput,
  Select,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useTransfers } from '../../context/TransfersContext';
import {
  PROJECTS,
  SOURCE_DELIVERABLES,
  TRANSFER_STATUSES,
  formatDate,
  projectLabel,
  sourceFor,
  transferStatusTone,
} from '../../data/transfersData';
import {
  DestinationBadges,
  SectionNav,
  TransferStatus,
} from './transfersUi';

const SECTIONS = [
  { key: 'all', label: 'All Transfer History' },
  { key: 'purchase', label: 'Purchase Transfer History' },
  { key: 'production', label: 'Production Transfer History' },
  { key: 'revisions', label: 'Revision History' },
  { key: 'releases', label: 'Release History' },
  { key: 'failed', label: 'Failed / Cancelled Transfers' },
];

function useTextFilter(rows, textFields) {
  const [search, setSearch] = useState('');
  return {
    search,
    setSearch,
    rows: rows.filter((row) => {
      if (!search.trim()) return true;
      return textFields(row).join(' ').toLowerCase().includes(search.trim().toLowerCase());
    }),
  };
}

function AllHistorySection() {
  const { transfers } = useTransfers();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('All');
  const [destination, setDestination] = useState('All');
  const [status, setStatus] = useState('All');
  const helper = useTextFilter(transfers, (row) => [row.id, row.projectId, row.deliverableNumber, row.deliverableName, row.revision, row.destination, row.initiatedBy, row.releaseId, row.status]);
  const rows = helper.rows.filter((row) => {
    if (projectId !== 'All' && row.projectId !== projectId) return false;
    if (destination !== 'All' && !row.destinations.includes(destination)) return false;
    if (status !== 'All' && row.status !== status) return false;
    return true;
  });
  return (
    <>
      <Toolbar
        left={<>
          <Select id="history-project" options={[{ value: 'All', label: 'All Projects' }, ...PROJECTS.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))]} value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Filter history by project" />
          <Select id="history-destination" options={[{ value: 'All', label: 'All Destinations' }, { value: 'Purchase', label: 'Purchase' }, { value: 'Production', label: 'Production' }]} value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Filter history by destination" />
          <Select id="history-status" options={[{ value: 'All', label: 'All Final Statuses' }, ...TRANSFER_STATUSES.map((value) => ({ value, label: value }))]} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter history by final status" />
        </>}
        right={<SearchInput id="transfer-history-search" value={helper.search} onChange={helper.setSearch} placeholder="Search transfer, project, deliverable…" ariaLabel="Search transfer history" />}
        count={`${rows.length} transfer record(s)`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'deliverable', label: 'Deliverable', width: 220, render: (row) => <span className="transfers-history-deliverable"><strong>{row.deliverableNumber}</strong><small>{row.deliverableName}</small></span> },
            { key: 'revision', label: 'Revision', width: 85, render: (row) => <span className="approvals-exact-rev">Rev {row.revision}</span> },
            { key: 'destination', label: 'Destination', width: 145, render: (row) => <DestinationBadges destinations={row.destinations} compact /> },
            { key: 'transferDate', label: 'Transfer Date', width: 120, render: (row) => formatDate(row.transferDate) },
            { key: 'initiatedBy', label: 'Initiated By', width: 125 },
            { key: 'status', label: 'Final Status', width: 170, render: (row) => <TransferStatus status={row.status} /> },
            { key: 'updated', label: 'Last Updated', width: 125, render: (row) => formatDate(row.updatedAt || row.transferDate) },
          ]}
          rows={rows}
          recordHref={(row) => `/transfers/${row.id}`}
          onRowClick={(row) => navigate(`/transfers/${row.id}`)}
          rowActions={() => [{ key: 'view', label: 'View transfer history', icon: Eye }]}
          onRowAction={(key, row) => { if (key === 'view') navigate(`/transfers/${row.id}`); }}
          ariaLabel="All transfer history"
          emptyContent={<EmptyState icon={History} title="No history records" message="No transfer records match the current filters." />}
        />
      </section>
    </>
  );
}

function PartyHistorySection({ destination }) {
  const { transfers } = useTransfers();
  const navigate = useNavigate();
  const rows = transfers.filter((row) => row.destinations?.includes(destination)).map((row) => {
    const side = destination === 'Purchase' ? row.purchase : row.production;
    const source = sourceFor(row);
    return {
      ...row,
      side,
      bomNumber: source?.bomNumber || row.deliverableNumber,
      bomRevision: source?.bomRevision || row.revision,
      requisitionRef: (side?.requisitions || []).map((req) => req.id).join(', ') || '—',
      package: side?.package?.id || '—',
      handoverDate: side?.handover?.date || '',
      acknowledgement: side?.acknowledgement?.status || 'Pending',
      mockStatus: side?.status || 'Not Prepared',
      comments: side?.acknowledgement?.comments || side?.progress?.remarks || '',
    };
  });
  const helper = useTextFilter(rows, (row) => [row.id, row.projectId, row.deliverableNumber, row.bomNumber, row.package, row.mockStatus, row.acknowledgement]);
  return (
    <>
      <Toolbar
        left={<span className="transfers-history-caption">{destination} destination records, including pending and completed mock handovers.</span>}
        right={<SearchInput id={`${destination}-history-search`} value={helper.search} onChange={helper.setSearch} placeholder={`Search ${destination.toLowerCase()} history…`} ariaLabel={`Search ${destination} transfer history`} />}
        count={`${helper.rows.length} record(s)`}
      />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            destination === 'Purchase'
              ? { key: 'bom', label: 'BOM', width: 135, render: (row) => row.bomNumber }
              : { key: 'drawing', label: 'Drawing Number', width: 160, render: (row) => row.deliverableNumber },
            destination === 'Purchase'
              ? { key: 'bomRevision', label: 'BOM Revision', width: 115, render: (row) => `Rev ${row.bomRevision}` }
              : { key: 'revision', label: 'Drawing Revision', width: 125, render: (row) => `Rev ${row.revision}` },
            ...(destination === 'Purchase'
              ? [{ key: 'requisition', label: 'Requisition Reference', width: 180, render: (row) => row.requisitionRef }]
              : [{ key: 'package', label: 'Manufacturing Package', width: 155, render: (row) => row.package }]),
            { key: 'handoverDate', label: `${destination} Handover Date`, width: 160, render: (row) => row.handoverDate ? formatDate(row.handoverDate) : '—' },
            { key: 'acknowledgement', label: 'Acknowledgement', width: 160, render: (row) => <StatusBadge status={row.acknowledgement} tone={transferStatusTone(row.acknowledgement === 'Pending' ? 'Acknowledgement Pending' : row.acknowledgement)} /> },
            { key: 'mockStatus', label: 'Current Mock Status', width: 195, render: (row) => <TransferStatus status={row.mockStatus} /> },
            { key: 'comments', label: `${destination} Comments`, width: 280, render: (row) => row.comments || '—' },
          ]}
          rows={helper.rows}
          recordHref={(row) => `/transfers/${row.id}`}
          onRowClick={(row) => navigate(`/transfers/${row.id}`)}
          rowActions={() => [{ key: 'view', label: 'View full history', icon: Eye }]}
          onRowAction={(key, row) => { if (key === 'view') navigate(`/transfers/${row.id}`); }}
          ariaLabel={`${destination} transfer history`}
          emptyContent={<EmptyState icon={PackageCheck} title={`No ${destination} history`} message={`No ${destination.toLowerCase()} transfer records exist.`} />}
        />
      </section>
    </>
  );
}

function RevisionHistorySection() {
  const { transfers } = useTransfers();
  const rows = transfers.flatMap((transfer) =>
    (transfer.revisionHistory || []).map((revision) => ({
      ...revision,
      key: revision.id || `${transfer.id}-${revision.newRevision}`,
      transferId: transfer.id,
      projectId: transfer.projectId,
      deliverableNumber: transfer.deliverableNumber,
      currentStatus: transfer.status,
    })),
  );
  const helper = useTextFilter(rows, (row) => [row.transferId, row.projectId, row.deliverableNumber, row.previousRevision, row.newRevision, row.releaseId, row.changeDescription, row.status]);
  return (
    <>
      <div className="transfers-history-callout">
        <History aria-hidden="true" />
        <p>A newer revision never overwrites an older transferred revision. Each revision record keeps its previous revision, release reference and change description.</p>
      </div>
      <Toolbar right={<SearchInput id="revision-history-search" value={helper.search} onChange={helper.setSearch} placeholder="Search revision, release, change…" ariaLabel="Search revision history" />} count={`${helper.rows.length} revision record(s)`} />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'transferId', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.transferId}</span> },
            { key: 'deliverableNumber', label: 'Deliverable Number', width: 165 },
            { key: 'previousRevision', label: 'Previous Revision', width: 140, render: (row) => row.previousRevision ? `Rev ${row.previousRevision}` : '—' },
            { key: 'newRevision', label: 'New Revision', width: 125, render: (row) => <span className="approvals-exact-rev">Rev {row.newRevision}</span> },
            { key: 'at', label: 'Revision Date', width: 125, render: (row) => formatDate(row.at) },
            { key: 'releaseId', label: 'Source Release ID', width: 165, render: (row) => <span className="cell-id">{row.releaseId}</span> },
            { key: 'status', label: 'Transfer Status', width: 180, render: (row) => <TransferStatus status={row.currentStatus} /> },
            { key: 'changeDescription', label: 'Change Description', width: 330 },
          ]}
          rows={helper.rows}
          ariaLabel="Revision history"
          emptyContent={<EmptyState icon={History} title="No revision history" message="No transfer revision events are recorded." />}
        />
      </section>
    </>
  );
}

function ReleaseHistorySection() {
  const { transfers } = useTransfers();
  const rows = SOURCE_DELIVERABLES.map((source) => ({
    ...source,
    relatedTransfer: transfers.find((row) => row.releaseId === source.releaseId)?.id || '—',
  }));
  const helper = useTextFilter(rows, (row) => [row.releaseId, row.projectId, row.deliverableNumber, row.deliverableName, row.revision, row.reviewId, row.releaseOwner, row.relatedTransfer]);
  return (
    <>
      <Toolbar right={<SearchInput id="release-history-search" value={helper.search} onChange={helper.setSearch} placeholder="Search release, review, deliverable…" ariaLabel="Search release history" />} count={`${helper.rows.length} source release(s)`} />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'releaseId', label: 'Source Release ID', width: 165, render: (row) => <span className="cell-id">{row.releaseId}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'deliverable', label: 'Deliverable', width: 235, render: (row) => <span className="transfers-history-deliverable"><strong>{row.deliverableNumber}</strong><small>{row.deliverableName}</small></span> },
            { key: 'revision', label: 'Exact Revision', width: 110, render: (row) => <span className="approvals-exact-rev">Rev {row.revision}</span> },
            { key: 'reviewId', label: 'Approval Reference', width: 145, render: (row) => <span className="cell-id">{row.reviewId}</span> },
            { key: 'releaseDate', label: 'Release Date', width: 120, render: (row) => formatDate(row.releaseDate) },
            { key: 'releaseOwner', label: 'Release Owner', width: 150 },
            { key: 'relatedTransfer', label: 'Related Transfer ID', width: 160, render: (row) => row.relatedTransfer !== '—' ? <Link className="cell-id" to={`/transfers/${row.relatedTransfer}`}>{row.relatedTransfer}</Link> : '—' },
          ]}
          rows={helper.rows}
          ariaLabel="Release history"
          emptyContent={<EmptyState icon={ShieldCheck} title="No releases" message="No source release records are available." />}
        />
      </section>
    </>
  );
}

function FailedHistorySection() {
  const { transfers } = useTransfers();
  const navigate = useNavigate();
  const rows = transfers.filter((row) => row.cancellation || row.failure || ['Cancelled', 'Failed'].includes(row.status));
  const helper = useTextFilter(rows, (row) => [row.id, row.projectId, row.deliverableNumber, row.status, row.cancellation?.reason, row.failure?.reason]);
  return (
    <>
      <div className="transfers-history-callout is-warning">
        <Ban aria-hidden="true" />
        <p>Cancelled and failed transfers remain in history with their original source release. No historical record is deleted.</p>
      </div>
      <Toolbar right={<SearchInput id="failed-history-search" value={helper.search} onChange={helper.setSearch} placeholder="Search transfer, reason, project…" ariaLabel="Search failed and cancelled transfers" />} count={`${helper.rows.length} archived record(s)`} />
      <section className="table-card">
        <DataTable
          columns={[
            { key: 'id', label: 'Transfer ID', width: 125, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 130 },
            { key: 'deliverableNumber', label: 'Deliverable', width: 175 },
            { key: 'revision', label: 'Revision', width: 90, render: (row) => `Rev ${row.revision}` },
            { key: 'destination', label: 'Destination', width: 140, render: (row) => <DestinationBadges destinations={row.destinations} compact /> },
            { key: 'reason', label: 'Failure / Cancellation Reason', width: 390, render: (row) => row.cancellation?.reason || row.failure?.reason || '—' },
            { key: 'recordedBy', label: 'Recorded By', width: 130, render: (row) => row.cancellation?.by || row.failure?.by || '—' },
            { key: 'date', label: 'Date', width: 160, render: (row) => (row.cancellation?.at || row.failure?.at)?.replace('T', ' ') || '—' },
            { key: 'status', label: 'Current Status', width: 130, render: (row) => <TransferStatus status={row.status} /> },
          ]}
          rows={helper.rows}
          recordHref={(row) => `/transfers/${row.id}`}
          onRowClick={(row) => navigate(`/transfers/${row.id}`)}
          rowActions={() => [{ key: 'view', label: 'View retained record', icon: Eye }]}
          onRowAction={(key, row) => { if (key === 'view') navigate(`/transfers/${row.id}`); }}
          ariaLabel="Failed and cancelled transfers"
          emptyContent={<EmptyState icon={FileText} title="No failed or cancelled transfers" message="No archived cancellation or failure records." />}
        />
      </section>
    </>
  );
}

export default function TransferHistoryTab() {
  const { transfers } = useTransfers();
  const [section, setSection] = useState('all');
  const counts = {
    all: transfers.length,
    purchase: transfers.filter((row) => row.destinations?.includes('Purchase')).length,
    production: transfers.filter((row) => row.destinations?.includes('Production')).length,
    revisions: transfers.reduce((count, row) => count + (row.revisionHistory?.length || 0), 0),
    releases: SOURCE_DELIVERABLES.length,
    failed: transfers.filter((row) => row.status === 'Cancelled' || row.status === 'Failed').length,
  };
  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />
      {section === 'all' && <AllHistorySection />}
      {section === 'purchase' && <PartyHistorySection destination="Purchase" />}
      {section === 'production' && <PartyHistorySection destination="Production" />}
      {section === 'revisions' && <RevisionHistorySection />}
      {section === 'releases' && <ReleaseHistorySection />}
      {section === 'failed' && <FailedHistorySection />}
    </>
  );
}
