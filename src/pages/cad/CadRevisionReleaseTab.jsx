import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  GitBranch,
  History,
  Layers,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
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
  StatusBadge,
  Toolbar,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { Textarea } from '../../components/common/Input';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  CAD_ENGINEERS,
  HANDOVER_STATUSES,
  REVIEWER_PERSONA,
  TODAY,
  TRANSMITTAL_STATUSES,
  assemblyLabel,
  cadStatusTone,
  formatDate,
  projectName,
} from '../../data/cadData';
import exportCsv from '../../utils/exportCsv';
import { Fact, SectionNav, Toast, useToast } from './cadUi';

const SECTIONS = [
  { key: 'revisions', label: 'Revision Register' },
  { key: 'comparison', label: 'Revision Comparison' },
  { key: 'history', label: 'Change History' },
  { key: 'review', label: 'Review & Approval' },
  { key: 'transmittals', label: 'Drawing Transmittals' },
  { key: 'released', label: 'Released History' },
  { key: 'handover', label: 'Purchase / Production Handover' },
];

const META_FIELDS = [
  ['title', 'Drawing Title'],
  ['drawingType', 'Drawing Type'],
  ['description', 'Description'],
  ['format', 'Drawing Format'],
  ['scale', 'Scale'],
  ['units', 'Units'],
  ['sheetSize', 'Sheet Size'],
  ['projectionMethod', 'Projection Method'],
  ['materialRef', 'Material Reference'],
  ['toleranceNotes', 'Tolerance / Specification Notes'],
  ['cadFileIds', 'Related CAD Files'],
  ['attachments', 'Attachments'],
  ['designId', 'Mechanical Design'],
  ['designRevision', 'Design Revision'],
  ['simulationRef', 'Simulation / Validation Reference'],
  ['changeRef', 'Engineering Change Reference'],
];

function metaValue(meta, key) {
  const value = meta?.[key];
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return value || '—';
}

function diffRows(previous, current) {
  return META_FIELDS.map(([key, label]) => {
    const before = metaValue(previous, key);
    const after = metaValue(current, key);
    let change = 'Unchanged';
    if (before !== after) {
      const beforeEmpty = before === '—';
      const afterEmpty = after === '—';
      change = beforeEmpty ? 'Added' : afterEmpty ? 'Removed' : 'Modified';
    }
    return { key, label, before, after, change };
  });
}

function RevisionStatusPill({ status }) {
  return <StatusBadge status={status} tone={cadStatusTone(status)} />;
}

export default function CadRevisionReleaseTab() {
  const navigate = useNavigate();
  const {
    drawings,
    files,
    transmittals,
    handovers,
    updateDrawing,
    submitDrawing,
    recordDrawingDecision,
    createRevision,
    releaseDrawing,
    addTransmittal,
    updateTransmittalStatus,
    removeTransmittal,
    addHandover,
    updateHandoverStatus,
    removeHandover,
    nextTransmittalId,
    nextHandoverId,
  } = useCad();
  const { assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('revisions');
  const metadataColumns = useTableColumnVisibility('/cad/drawings/revisions#metadata-diff', [
    { key: 'field', label: 'Field' },
    { key: 'before', label: 'Prior Revision' },
    { key: 'after', label: 'Current Revision' },
    { key: 'change', label: 'Change' },
  ]);
  const [revisionSearch, setRevisionSearch] = useState('');
  const [revisionPage, setRevisionPage] = useState(1);
  const [revisionStatus, setRevisionStatus] = useState('All');
  const [detailTarget, setDetailTarget] = useState(null);
  const [newRevisionTarget, setNewRevisionTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [transmittalModal, setTransmittalModal] = useState(false);
  const [transmittalForm, setTransmittalForm] = useState(null);
  const [handoverModal, setHandoverModal] = useState(false);
  const [handoverForm, setHandoverForm] = useState(null);
  const [compareDrawingId, setCompareDrawingId] = useState(drawings[0]?.id || '');
  const [fromRev, setFromRev] = useState('');
  const [toRev, setToRev] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState('All');
  const [handoverFilter, setHandoverFilter] = useState('All');

  const revisionRows = useMemo(
    () =>
      drawings.flatMap((drawing) =>
        (drawing.revisions || []).map((revision) => ({
          ...revision,
          id: `${drawing.drawingNumber}-R${revision.revision}`,
          drawingId: drawing.id,
          drawingNumber: drawing.drawingNumber,
          title: drawing.title,
          projectId: drawing.projectId,
          partNumber: drawing.partNumber,
          currentRevision: drawing.revision,
          isCurrent: revision.revision === drawing.revision,
          changeReason: revision.changeReason || (revision.previous ? 'Design change recorded during the controlled revision.' : 'Initial drawing issue.'),
          releaseDate: revision.releasedAt || (revision.revision === drawing.revision && ['Released', 'Superseded'].includes(revision.status) ? drawing.releasedAt : '') || '',
          reviewStatus: ['Approved', 'Released', 'Superseded'].includes(revision.status) ? 'Reviewed' : revision.status === 'Changes Requested' ? 'Changes requested' : revision.status === 'Under Review' ? 'Under review' : 'Not submitted',
          approvalStatus: ['Approved', 'Released', 'Superseded'].includes(revision.status) ? 'Approved' : revision.status === 'Changes Requested' ? 'Revision required' : 'Pending',
        })),
      ),
    [drawings],
  );

  const filteredRevisions = revisionRows.filter((row) => {
    if (revisionStatus !== 'All' && row.status !== revisionStatus) return false;
    const query = revisionSearch.trim().toLowerCase();
    if (!query) return true;
    return [row.id, row.drawingNumber, row.title, row.projectId, row.partNumber, row.note, row.by, row.status]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const revisionsPerPage = 10;
  const revisionPages = Math.max(1, Math.ceil(filteredRevisions.length / revisionsPerPage));
  const revisionPageSafe = Math.min(revisionPage, revisionPages);
  const revisionPageRows = filteredRevisions.slice((revisionPageSafe - 1) * revisionsPerPage, revisionPageSafe * revisionsPerPage);
  const revisionPageInfo = `Showing ${filteredRevisions.length ? (revisionPageSafe - 1) * revisionsPerPage + 1 : 0}-${Math.min(revisionPageSafe * revisionsPerPage, filteredRevisions.length)} of ${filteredRevisions.length}`;

  const compareDrawing = drawings.find((row) => row.id === compareDrawingId);
  const compareRevisions = compareDrawing?.revisions || [];
  const priorRevision = compareRevisions.find((row) => row.revision === fromRev) || compareRevisions.at(-2) || compareRevisions[0];
  const currentRevision = compareRevisions.find((row) => row.revision === toRev) || compareRevisions.at(-1);
  const comparison = priorRevision && currentRevision ? diffRows(priorRevision.meta, currentRevision.meta) : [];
  const changedCount = comparison.filter((row) => row.change !== 'Unchanged').length;

  const changeEvents = useMemo(() => {
    const drawingEvents = drawings.flatMap((drawing) =>
      (drawing.changeHistory || []).map((entry) => ({
        ...entry,
        related: drawing.drawingNumber,
        drawingId: drawing.id,
        kind: entry.action,
      })),
    );
    const transmittalEvents = transmittals.map((row) => ({
      id: `TH-${row.id}`,
      at: row.issueDate,
      by: row.preparedBy,
      action: 'Transmittal',
      description: `${row.id} — ${row.recipient} (${row.status}). ${row.purpose}.`,
      related: drawings.find((drawing) => drawing.id === row.drawingId)?.drawingNumber || row.drawingId,
      kind: 'Transmittal',
    }));
    return [...drawingEvents, ...transmittalEvents].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [drawings, transmittals]);
  const historyKinds = ['All', ...new Set(changeEvents.map((row) => row.kind))];
  const filteredEvents = changeEvents.filter((row) => {
    if (historyType !== 'All' && row.kind !== historyType) return false;
    const query = historySearch.trim().toLowerCase();
    if (!query) return true;
    return [row.action, row.by, row.description, row.related, row.at].join(' ').toLowerCase().includes(query);
  });

  const pendingReviews = drawings.filter((row) => ['Submitted', 'Under Review'].includes(row.approvalStatus));
  const approvedDrawings = drawings.filter((row) => row.approvalStatus === 'Approved');
  const releasedDrawings = drawings.filter((row) => row.approvalStatus === 'Released');
  const transferableDrawings = drawings.filter((row) =>
    ['Approved', 'Released'].includes(row.approvalStatus),
  );
  const approvalHistory = drawings
    .flatMap((drawing) => (drawing.approvals || []).map((entry) => ({ ...entry, drawingNumber: drawing.drawingNumber, projectId: drawing.projectId })))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const eligibleForRevision = drawings.filter((row) => ['Approved', 'Released', 'Superseded'].includes(row.approvalStatus));

  const counts = {
    revisions: revisionRows.length,
    comparison: drawings.filter((row) => (row.revisions?.length || 0) > 1).length,
    history: changeEvents.length,
    review: pendingReviews.length,
    transmittals: transmittals.length,
    released: releasedDrawings.length,
    handover: handovers.length,
  };

  const openNewRevision = (drawing) => {
    setNewRevisionTarget({
      drawingId: drawing?.id || eligibleForRevision[0]?.id || '',
      by: 'R. Kulkarni',
      note: '',
      reason: '',
      error: '',
    });
  };

  const startTransmittal = () => {
    setTransmittalForm({
      projectId: projects[0]?.id || '',
      drawingId: releasedDrawings[0]?.id || '',
      recipient: '',
      purpose: '',
      issueDate: TODAY,
      preparedBy: 'R. Kulkarni',
      status: 'Prepared',
      remarks: '',
      error: '',
    });
    setTransmittalModal(true);
  };

  const startHandover = (drawing = null) => {
    const selected = drawing?.id ? drawing : transferableDrawings[0];
    setHandoverForm({
      destination: 'Purchase',
      projectId: selected?.projectId || projects[0]?.id || '',
      drawingId: selected?.id || '',
      bomRef: '',
      purpose: '',
      partOrAssembly: selected
        ? selected.assemblyId
          ? assemblyLabel(assemblies, selected.assemblyId)
          : `${selected.partNumber} · ${selected.partName}`
        : '',
      mfgRef: '',
      date: TODAY,
      status: 'Draft',
      remarks: '',
      error: '',
    });
    setHandoverModal(true);
  };

  const selectedHandoverDrawing = drawings.find((row) => row.id === handoverForm?.drawingId);
  const handoverRows = useMemo(
    () =>
      handovers.map((row) => ({
        ...row,
        drawingNumber: row.drawingNumber || drawings.find((drawing) => drawing.id === row.drawingId)?.drawingNumber || row.drawingId,
        drawingStatus: row.drawingStatus || drawings.find((drawing) => drawing.id === row.drawingId)?.approvalStatus || '—',
      })),
    [handovers, drawings],
  );

  const exportRevisions = () => {
    exportCsv('drawing-revisions', [
      { key: 'id', label: 'Revision ID' },
      { key: 'drawingNumber', label: 'Drawing Number' },
      { key: 'title', label: 'Drawing Title' },
      { key: 'projectId', label: 'Project' },
      { key: 'partNumber', label: 'Part Number' },
      { key: 'currentRevision', label: 'Current Revision' },
      { key: 'previous', label: 'Previous Revision' },
      { key: 'date', label: 'Revision Date' },
      { key: 'note', label: 'Change Description' },
      { key: 'changeReason', label: 'Change Reason' },
      { key: 'by', label: 'Prepared By' },
      { key: 'reviewStatus', label: 'Review Status' },
      { key: 'approvalStatus', label: 'Approval Status' },
      { key: 'releaseDate', label: 'Release Date' },
      { key: 'status', label: 'Revision Status' },
    ], filteredRevisions);
    showToast('CSV export prepared.');
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />

      {section === 'revisions' && (
        <>
          <KpiGrid>
            <StatCard icon={GitBranch} label="Revision Records" value={String(revisionRows.length)} sub="Historical and current revisions" tone="teal" />
            <StatCard icon={History} label="Superseded" value={String(revisionRows.filter((row) => row.status === 'Superseded').length)} sub="Retained for audit and comparison" tone="orange" />
            <StatCard icon={CheckCircle2} label="Approved Revisions" value={String(revisionRows.filter((row) => row.status === 'Approved').length)} sub="Technical review completed" tone="blue" />
            <StatCard icon={ShieldCheck} label="Released Revisions" value={String(revisionRows.filter((row) => row.status === 'Released').length)} sub="Controlled issue state" tone="emerald" />
          </KpiGrid>
          <Toolbar
            left={
              <>
                <Button variant="ghost" icon={RefreshCw} onClick={() => { setRevisionSearch(''); setRevisionStatus('All'); }}>Refresh</Button>
                <Select
                  id="revision-status-filter"
                  options={[{ value: 'All', label: 'All Revision Statuses' }, ...['Draft', 'Under Review', 'Approved', 'Released', 'Superseded', 'Withdrawn'].map((value) => ({ value, label: value }))]}
                  value={revisionStatus}
                  onChange={(event) => { setRevisionStatus(event.target.value); setRevisionPage(1); }}
                />
              </>
            }
            right={
              <>
                <SearchInput id="revision-search" value={revisionSearch} onChange={(value) => { setRevisionSearch(value); setRevisionPage(1); }} placeholder="Search drawing, revision, change…" ariaLabel="Search revisions" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportRevisions}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => openNewRevision()}>New Revision</Button>
              </>
            }
            count={revisionPageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Revision ID', width: 148, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'drawingNumber', label: 'Drawing Number', width: 128, render: (row) => <span className="cell-strong">{row.drawingNumber}</span> },
                { key: 'title', label: 'Drawing Title', width: 220, render: (row) => <span className="cad-clip" title={row.title}>{row.title}</span> },
                { key: 'projectId', label: 'Project', width: 100 },
                { key: 'partNumber', label: 'Part Number', width: 100 },
                { key: 'currentRevision', label: 'Current', width: 64, align: 'center', render: (row) => <span className={row.isCurrent ? 'cad-current-chip' : 'cell-muted'}>Rev {row.currentRevision}</span> },
                { key: 'previous', label: 'Previous', width: 66, align: 'center', render: (row) => (row.previous ? `Rev ${row.previous}` : '—') },
                { key: 'date', label: 'Date', width: 86, render: (row) => formatDate(row.date) },
                { key: 'note', label: 'Change Description', width: 220, render: (row) => <span className="cad-clip" title={row.note}>{row.note}</span> },
                { key: 'changeReason', label: 'Change Reason', width: 180, render: (row) => <span className="cad-clip" title={row.changeReason}>{row.changeReason}</span> },
                { key: 'by', label: 'Prepared By', width: 94 },
                { key: 'reviewStatus', label: 'Review', width: 104 },
                { key: 'approvalStatus', label: 'Approval', width: 118, render: (row) => <RevisionStatusPill status={row.approvalStatus} /> },
                { key: 'releaseDate', label: 'Release Date', width: 100, render: (row) => (row.releaseDate ? formatDate(row.releaseDate) : row.status === 'Superseded' ? 'Not recorded' : 'Not released') },
                { key: 'status', label: 'Status', width: 108, render: (row) => <RevisionStatusPill status={row.status} /> },
              ]}
              rows={revisionPageRows}
              className="mech-register-table cad-register-table"
              rowActions={(row) => [
                { key: 'view', label: 'View revision', icon: Eye },
                { key: 'compare', label: 'Compare with previous', icon: ArrowRightLeft },
                { key: 'drawing', label: 'Open drawing register', icon: Layers },
                ...(row.isCurrent && ['Approved'].includes(row.status) ? [{ key: 'release', label: 'Release drawing', icon: ShieldCheck, divider: true }] : []),
                ...(row.isCurrent && ['Approved', 'Released'].includes(row.status) ? [{ key: 'handover', label: 'Prepare engineering handover', icon: PackageCheck }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') setDetailTarget(row);
                if (key === 'compare') {
                  setCompareDrawingId(row.drawingId);
                  setFromRev(row.previous);
                  setToRev(row.revision);
                  setSection('comparison');
                }
                if (key === 'drawing') navigate('/cad-management/drawings');
                if (key === 'release') {
                  const drawing = drawings.find((entry) => entry.id === row.drawingId);
                  if (drawing) setReleaseTarget(drawing);
                }
                if (key === 'handover') {
                  const drawing = drawings.find((entry) => entry.id === row.drawingId);
                  if (drawing) startHandover(drawing);
                }
              }}
              onRowClick={(row) => setDetailTarget(row)}
              ariaLabel="Drawing revision register"
              emptyContent={<EmptyState icon={GitBranch} title="No revisions" message="No revision records match the current filters." />}
            />
            <Pagination
              page={revisionPageSafe}
              totalPages={revisionPages}
              pageSize={revisionsPerPage}
              pageInfo={revisionPageInfo}
              onPageChange={setRevisionPage}
              onPageSizeChange={() => setRevisionPage(1)}
              pageSizeOptions={[10]}
            />
          </section>
          <section className="card cad-release-callouts">
            <div><strong>Approved and ready to release</strong><span>{approvedDrawings.length ? approvedDrawings.map((row) => row.drawingNumber).join(', ') : 'No approved drawings awaiting release.'}</span></div>
            {approvedDrawings.length > 0 && <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => setReleaseTarget(approvedDrawings[0])}>Release approved drawing</Button>}
          </section>
        </>
      )}

      {section === 'comparison' && (
        <>
          <KpiGrid>
            <StatCard icon={ArrowRightLeft} label="Comparable Drawings" value={String(counts.comparison)} sub="Drawings with more than one revision" tone="teal" />
            <StatCard icon={GitBranch} label="Revision Pair" value={priorRevision && currentRevision ? `Rev ${priorRevision.revision} → ${currentRevision.revision}` : '—'} sub={compareDrawing?.drawingNumber || 'Select a drawing'} tone="blue" />
            <StatCard icon={History} label="Metadata Changes" value={String(changedCount)} sub="Added, removed or modified fields" tone="orange" />
            <StatCard icon={ShieldCheck} label="Comparison Scope" value="Metadata" sub="No geometry or pixel comparison" tone="emerald" />
          </KpiGrid>
          <div className="cad-compare-controls card">
            <Select
              id="compare-drawing"
              label="Drawing"
              options={drawings.map((row) => ({ value: row.id, label: `${row.drawingNumber} · ${row.title}` }))}
              value={compareDrawingId}
              onChange={(event) => { setCompareDrawingId(event.target.value); setFromRev(''); setToRev(''); }}
            />
            <Select
              id="compare-from"
              label="Previous Revision"
              options={(compareRevisions.map((row) => ({ value: row.revision, label: `Rev ${row.revision} · ${row.date}` })))}
              value={priorRevision?.revision || ''}
              onChange={(event) => setFromRev(event.target.value)}
            />
            <Select
              id="compare-to"
              label="Current Revision"
              options={(compareRevisions.map((row) => ({ value: row.revision, label: `Rev ${row.revision} · ${row.date}` })))}
              value={currentRevision?.revision || ''}
              onChange={(event) => setToRev(event.target.value)}
            />
            <div className="cad-compare-note">
              <p><strong>Metadata-only comparison.</strong> Values are compared from the stored revision snapshots. No drawing geometry, pixels or rendered overlays are compared.</p>
              <p className="cell-muted">{compareDrawing?.description}</p>
            </div>
          </div>

          {priorRevision && currentRevision && priorRevision.revision === currentRevision.revision && (
            <p className="cad-note">Select two different revisions to see changes; the current pair is the same revision.</p>
          )}

          <section className="table-card">
            <div className="cad-card-head cad-card-head-pad">
              <div>
                <h3>Metadata changes</h3>
                <p>{compareDrawing?.drawingNumber} · Rev {priorRevision?.revision} → Rev {currentRevision?.revision} · {changedCount} changed field{changedCount === 1 ? '' : 's'}</p>
              </div>
              <div className="cad-diff-legend"><span className="cad-diff-badge is-added">Added</span><span className="cad-diff-badge is-modified">Modified</span><span className="cad-diff-badge is-removed">Removed</span></div>
            </div>
            <ManageColumns {...metadataColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table cad-diff-table" aria-label="Revision metadata comparison">
                <thead>
                  <tr>
                    {metadataColumns.isVisible('field') && <th scope="col">Field</th>}
                    {metadataColumns.isVisible('before') && <th scope="col">Rev {priorRevision?.revision}</th>}
                    {metadataColumns.isVisible('after') && <th scope="col">Rev {currentRevision?.revision}</th>}
                    {metadataColumns.isVisible('change') && <th scope="col">Change</th>}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.key} className={row.change !== 'Unchanged' ? 'is-changed' : ''}>
                      {metadataColumns.isVisible('field') && <td className="cell-strong">{row.label}</td>}
                      {metadataColumns.isVisible('before') && <td className={row.change === 'Added' ? 'cell-muted' : ''}>{row.before}</td>}
                      {metadataColumns.isVisible('after') && <td className={row.change === 'Removed' ? 'cell-muted' : ''}>{row.after}</td>}
                      {metadataColumns.isVisible('change') && <td><span className={`cad-diff-badge is-${row.change.toLowerCase()}`}>{row.change}</span></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="cad-notes-grid">
            <section className="card cad-side-card">
              <h4>Revision notes — Rev {priorRevision?.revision}</h4>
              <p>{priorRevision?.note || 'No note recorded.'}</p>
              <span className="cell-muted">{priorRevision?.by} · {formatDate(priorRevision?.date)} · {priorRevision?.status}</span>
            </section>
            <section className="card cad-side-card">
              <h4>Revision notes — Rev {currentRevision?.revision}</h4>
              <p>{currentRevision?.note || 'No note recorded.'}</p>
              <span className="cell-muted">{currentRevision?.by} · {formatDate(currentRevision?.date)} · {currentRevision?.status}</span>
            </section>
          </div>
        </>
      )}

      {section === 'history' && (
        <>
          <KpiGrid>
            <StatCard icon={History} label="History Events" value={String(changeEvents.length)} sub="Drawing, revision and transmittal events" tone="teal" />
            <StatCard icon={GitBranch} label="Revision Events" value={String(changeEvents.filter((row) => row.kind === 'Revision created').length)} sub="Revision raises across drawings" tone="blue" />
            <StatCard icon={CheckCircle2} label="Approval Events" value={String(changeEvents.filter((row) => ['Approved', 'Released', 'Reject', 'Request Changes'].includes(row.kind)).length)} sub="Review and release decisions" tone="emerald" />
            <StatCard icon={Send} label="Transmittals" value={String(changeEvents.filter((row) => row.kind === 'Transmittal').length)} sub="Controlled distribution events" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={() => { setHistorySearch(''); setHistoryType('All'); }}>Refresh</Button>}
            right={
              <>
                <Select
                  id="history-type"
                  options={historyKinds.map((value) => ({ value, label: value === 'All' ? 'All Event Types' : value }))}
                  value={historyType}
                  onChange={(event) => setHistoryType(event.target.value)}
                />
                <SearchInput id="history-search" value={historySearch} onChange={setHistorySearch} placeholder="Search action, user, record…" ariaLabel="Search change history" />
              </>
            }
            count={`${filteredEvents.length} events`}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'at', label: 'Date', width: 96, render: (row) => formatDate(row.at) },
                { key: 'action', label: 'Action', width: 148, render: (row) => <span className="cell-strong">{row.action}</span> },
                { key: 'by', label: 'User', width: 120 },
                { key: 'description', label: 'Description', width: 420, render: (row) => <span className="cad-clip">{row.description}</span> },
                { key: 'related', label: 'Related Record', width: 150, render: (row) => <span className="cell-id">{row.related}</span> },
              ]}
              rows={filteredEvents.map((row) => ({ ...row, id: row.id || `${row.kind}-${row.at}-${row.related}` }))}
              className="mech-register-table"
              ariaLabel="Drawing change history"
              emptyContent={<EmptyState icon={History} title="No history" message="No change events match the current filters." />}
            />
          </section>
          <p className="mech-footnote">History is maintained in the browser for this demonstration. It records user actions on local records and does not represent an audited document-control log.</p>
        </>
      )}

      {section === 'review' && (
        <>
          <KpiGrid>
            <StatCard icon={ClipboardCheck} label="Pending Reviews" value={String(pendingReviews.length)} sub="Submitted or under review" tone="orange" />
            <StatCard icon={CheckCircle2} label="Approval Decisions" value={String(approvalHistory.length)} sub="Recorded review decisions" tone="emerald" />
            <StatCard icon={ShieldCheck} label="Approved Drawings" value={String(approvedDrawings.length)} sub="Eligible for controlled release" tone="blue" />
            <StatCard icon={History} label="Changes Requested" value={String(drawings.filter((row) => row.approvalStatus === 'Changes Requested').length)} sub="Returned to the drawing owner" tone="teal" />
          </KpiGrid>

          <div className="cad-review-grid">
            <section className="card cad-review-queue">
              <div className="cad-card-head cad-card-head-pad">
                <div><h3>Pending technical reviews</h3><p>Approval must be completed before a drawing can be released.</p></div>
                <span className="cad-count-badge">{pendingReviews.length}</span>
              </div>
              {pendingReviews.length === 0 ? <p className="cad-empty-inline">No drawings are waiting for review.</p> : (
                <ul className="cad-review-list">
                  {pendingReviews.map((drawing) => (
                    <li key={drawing.id}>
                      <div className="cad-review-main">
                        <span className="cell-id">{drawing.drawingNumber}</span>
                        <strong>{drawing.title}</strong>
                        <span className="cell-muted">{drawing.projectId} · {projectName(projects, drawing.projectId)} · Rev {drawing.revision}</span>
                        <span className="cell-muted">Assigned reviewer: {drawing.reviewedBy || REVIEWER_PERSONA}</span>
                      </div>
                      <div className="cad-review-actions">
                        <StatusBadge status={drawing.approvalStatus} tone={cadStatusTone(drawing.approvalStatus)} />
                        <Button variant="secondary" size="sm" icon={Check} onClick={() => setReviewTarget({ drawing, decision: 'Approved', reviewer: drawing.reviewedBy || REVIEWER_PERSONA, comments: '', error: '' })}>Approve</Button>
                        <Button variant="ghost" size="sm" icon={X} onClick={() => setReviewTarget({ drawing, decision: 'Request Changes', reviewer: drawing.reviewedBy || REVIEWER_PERSONA, comments: '', error: '' })}>Request Changes</Button>
                        <Button variant="ghost" size="sm" onClick={() => setReviewTarget({ drawing, decision: 'Reject', reviewer: drawing.reviewedBy || REVIEWER_PERSONA, comments: '', error: '' })}>Reject</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="card cad-review-side">
              <h4>Review checklist</h4>
              <ul className="cad-checklist">
                <li>Drawing number, revision and part references are correct</li>
                <li>Attached files match the drawing being reviewed</li>
                <li>Comments are recorded for every rejection or change request</li>
                <li>Approved drawings are released only from Revision Register</li>
                <li>Released drawings can then be issued by transmittal</li>
              </ul>
              <h4>Reviewer</h4>
              <p>{REVIEWER_PERSONA} · Engineering review (mock user)</p>
            </aside>
          </div>

          <section className="table-card">
            <div className="cad-card-head cad-card-head-pad"><div><h3>Approval history</h3><p>All local review decisions, newest first.</p></div></div>
            <DataTable
              columns={[
                { key: 'date', label: 'Date', width: 96, render: (row) => formatDate(row.date) },
                { key: 'drawingNumber', label: 'Drawing', width: 140, render: (row) => <span className="cell-id">{row.drawingNumber}</span> },
                { key: 'projectId', label: 'Project', width: 100 },
                { key: 'reviewer', label: 'Reviewer', width: 110 },
                { key: 'decision', label: 'Decision', width: 142, render: (row) => <StatusBadge status={row.decision} tone={cadStatusTone(row.decision === 'Changes Requested' ? 'Changes Requested' : row.decision)} /> },
                { key: 'comments', label: 'Comments', width: 360, render: (row) => <span className="cad-clip">{row.comments}</span> },
              ]}
              rows={approvalHistory}
              className="mech-register-table"
              ariaLabel="Approval history"
              emptyContent={<EmptyState icon={ClipboardCheck} title="No decisions yet" message="Approve or request changes on a pending drawing." />}
            />
          </section>
        </>
      )}

      {section === 'transmittals' && (
        <>
          <KpiGrid>
            <StatCard icon={Send} label="Transmittals" value={String(transmittals.length)} sub="Controlled distribution records" tone="teal" />
            <StatCard icon={CheckCircle2} label="Acknowledged" value={String(transmittals.filter((row) => row.status === 'Acknowledged').length)} sub="Recipient confirmation" tone="emerald" />
            <StatCard icon={FileCheck2} label="Issued" value={String(transmittals.filter((row) => row.status === 'Issued').length)} sub="Sent, awaiting acknowledgement" tone="blue" />
            <StatCard icon={X} label="Rejected / Cancelled" value={String(transmittals.filter((row) => ['Rejected', 'Cancelled'].includes(row.status)).length)} sub="Not accepted by recipient" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={() => showToast('Transmittal register refreshed.')}>Refresh</Button>}
            right={<Button icon={Plus} size="sm" onClick={startTransmittal}>New Transmittal</Button>}
            count={`${transmittals.length} records`}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Transmittal No.', width: 112, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'projectId', label: 'Project', width: 106 },
                { key: 'drawingId', label: 'Drawing', width: 140, render: (row) => { const drawing = drawings.find((entry) => entry.id === row.drawingId); return <span><span className="cell-strong">{drawing?.drawingNumber || row.drawingId}</span><span className="cell-muted cad-block">Rev {drawing?.revision || '—'}</span></span>; } },
                { key: 'recipient', label: 'Recipient', width: 190, render: (row) => <span className="cad-clip">{row.recipient}</span> },
                { key: 'purpose', label: 'Purpose', width: 220, render: (row) => <span className="cad-clip">{row.purpose}</span> },
                { key: 'issueDate', label: 'Issue Date', width: 94, render: (row) => formatDate(row.issueDate) },
                { key: 'preparedBy', label: 'Prepared By', width: 100 },
                { key: 'status', label: 'Status', width: 120, render: (row) => <StatusBadge status={row.status} tone={cadStatusTone(row.status)} /> },
                { key: 'remarks', label: 'Remarks', width: 250, render: (row) => <span className="cell-muted cad-clip">{row.remarks || '—'}</span> },
              ]}
              rows={transmittals}
              className="mech-register-table cad-register-table"
              rowActions={(row) => [
                ...(row.status === 'Draft' ? [{ key: 'issue', label: 'Mark as issued', icon: Send }] : []),
                ...(row.status === 'Prepared' ? [{ key: 'issued', label: 'Mark as issued', icon: Send }] : []),
                ...(row.status === 'Issued' ? [{ key: 'ack', label: 'Mark acknowledged', icon: CheckCircle2 }, { key: 'reject', label: 'Mark rejected', icon: X }] : []),
                ...(['Draft', 'Prepared', 'Issued'].includes(row.status) ? [{ key: 'cancel', label: 'Cancel transmittal', icon: X }] : []),
                ...(['Draft', 'Cancelled'].includes(row.status) ? [{ key: 'delete', label: 'Delete record', icon: Trash2, danger: true, divider: true }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'issue' || key === 'issued') { updateTransmittalStatus(row.id, 'Issued'); showToast(`${row.id} marked issued.`); }
                if (key === 'ack') { updateTransmittalStatus(row.id, 'Acknowledged'); showToast(`${row.id} acknowledged.`); }
                if (key === 'reject') { updateTransmittalStatus(row.id, 'Rejected', 'Recipient rejected the transmittal.'); showToast(`${row.id} marked rejected.`); }
                if (key === 'cancel') { updateTransmittalStatus(row.id, 'Cancelled'); showToast(`${row.id} cancelled.`); }
                if (key === 'delete') { removeTransmittal(row.id); showToast(`${row.id} deleted.`); }
              }}
              ariaLabel="Drawing transmittals"
              emptyContent={<EmptyState icon={Send} title="No transmittals" message="Prepare a transmittal for a released drawing." />}
            />
          </section>
          <p className="mech-footnote">Transmittals are mock distribution records. No email is sent and no document leaves this browser.</p>
        </>
      )}

      {section === 'released' && (
        <>
          <KpiGrid>
            <StatCard icon={ShieldCheck} label="Released Drawings" value={String(releasedDrawings.length)} sub="Approved and issued as controlled" tone="emerald" />
            <StatCard icon={FileCheck2} label="Released Revisions" value={String(revisionRows.filter((row) => row.status === 'Released').length)} sub="Revision records in released state" tone="blue" />
            <StatCard icon={Send} label="Transmittal Coverage" value={String(new Set(transmittals.map((row) => row.drawingId)).size)} sub="Released drawings issued downstream" tone="teal" />
            <StatCard icon={PackageCheck} label="Handover Records" value={String(handovers.length)} sub="Simulated Purchase / Production handovers" tone="orange" />
          </KpiGrid>
          <section className="table-card">
            <div className="cad-card-head cad-card-head-pad"><div><h3>Released drawing history</h3><p>Approved and released drawings. Released revisions are immutable in this mock.</p></div></div>
            <DataTable
              columns={[
                { key: 'drawingNumber', label: 'Drawing Number', width: 140, render: (row) => <span className="cell-strong">{row.drawingNumber}</span> },
                { key: 'title', label: 'Drawing Title', width: 280, render: (row) => <span className="cad-clip">{row.title}</span> },
                { key: 'projectId', label: 'Project', width: 104 },
                { key: 'revision', label: 'Revision', width: 76, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'reviewedBy', label: 'Approved By', width: 106 },
                { key: 'approvedAt', label: 'Approval Date', width: 112, render: (row) => formatDate(row.approvals?.at(-1)?.date || row.drawingDate) },
                { key: 'releasedAt', label: 'Release Date', width: 104, render: (row) => formatDate(row.releasedAt) },
                { key: 'releaseStatus', label: 'Release Status', width: 118, render: (row) => <StatusBadge status={row.releaseStatus} tone={cadStatusTone(row.releaseStatus)} /> },
              ]}
              rows={releasedDrawings}
              className="mech-register-table"
              onRowClick={(row) => setDetailTarget({ ...row.revisions.at(-1), drawingId: row.id, drawingNumber: row.drawingNumber, title: row.title, projectId: row.projectId, partNumber: row.partNumber, currentRevision: row.revision, isCurrent: true })}
              rowActions={(row) => [
                { key: 'view', label: 'View released revision', icon: Eye },
                { key: 'viewer', label: 'Open drawing in CAD Viewer', icon: Layers },
                { key: 'transmittal', label: 'Prepare transmittal', icon: Send },
                { key: 'handover', label: 'Prepare engineering handover', icon: PackageCheck },
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') setDetailTarget({ ...row.revisions.at(-1), drawingId: row.id, drawingNumber: row.drawingNumber, title: row.title, projectId: row.projectId, partNumber: row.partNumber, currentRevision: row.revision, isCurrent: true });
                if (key === 'viewer') navigate(`/cad-management/viewer?drawing=${row.id}`);
                if (key === 'transmittal') { setSection('transmittals'); startTransmittal(); }
                if (key === 'handover') startHandover(row);
              }}
              ariaLabel="Released drawing history"
              emptyContent={<EmptyState icon={ShieldCheck} title="No released drawings" message="Approve and release a drawing to populate this history." />}
            />
          </section>
          {releasedDrawings.length > 0 && (
            <div className="cad-notes-grid">
              {releasedDrawings.map((drawing) => (
                <section key={drawing.id} className="card cad-side-card">
                  <h4>{drawing.drawingNumber} · Rev {drawing.revision}</h4>
                  <p>{drawing.title}</p>
                  <div className="fact-grid">
                    <Fact label="Release Reference">{drawing.releaseRef || '—'}</Fact>
                    <Fact label="Released At">{formatDate(drawing.releasedAt)}</Fact>
                    <Fact label="Approved By">{drawing.approvals?.at(-1)?.reviewer || drawing.reviewedBy || '—'}</Fact>
                    <Fact label="Release Status"><StatusBadge status={drawing.releaseStatus} tone={cadStatusTone(drawing.releaseStatus)} /></Fact>
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {section === 'handover' && (
        <>
          <KpiGrid>
            <StatCard icon={ShoppingCart} label="Purchase Handovers" value={String(handovers.filter((row) => row.destination === 'Purchase').length)} sub="Simulated procurement references" tone="teal" />
            <StatCard icon={PackageCheck} label="Production Handovers" value={String(handovers.filter((row) => row.destination === 'Production').length)} sub="Simulated manufacturing references" tone="blue" />
            <StatCard icon={CheckCircle2} label="Acknowledged" value={String(handovers.filter((row) => row.status === 'Acknowledged').length)} sub="Recipient references accepted" tone="emerald" />
            <StatCard icon={History} label="Pending Transfer" value={String(handovers.filter((row) => ['Draft', 'Ready', 'Submitted'].includes(row.status)).length)} sub="Not acknowledged yet" tone="orange" />
          </KpiGrid>
          <div className="card cad-handover-controls">
            <div className="cad-mode-switch" role="group" aria-label="Handover destination filter">
              {['All', 'Purchase', 'Production'].map((value) => (
                <button key={value} type="button" className={handoverFilter === value ? 'is-active' : ''} onClick={() => setHandoverFilter(value)}>{value}</button>
              ))}
            </div>
            <Button icon={Plus} size="sm" onClick={startHandover}>New Handover Reference</Button>
          </div>
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Handover Ref', width: 112, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'destination', label: 'Destination', width: 108, render: (row) => <span className="cad-destination">{row.destination}</span> },
                { key: 'drawingNumber', label: 'Drawing Number', width: 140, render: (row) => <span className="cell-strong">{row.drawingNumber}</span> },
                { key: 'projectId', label: 'Project', width: 100 },
                { key: 'revision', label: 'Revision', width: 76, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'drawingStatus', label: 'Drawing Status', width: 108, render: (row) => <StatusBadge status={row.drawingStatus} tone={cadStatusTone(row.drawingStatus)} /> },
                { key: 'scope', label: 'Part / Assembly / Purpose', width: 250, render: (row) => <span className="cad-clip">{row.destination === 'Purchase' ? row.purpose : row.partOrAssembly}</span> },
                { key: 'bomRef', label: 'BOM Reference', width: 112 },
                { key: 'mfgRef', label: 'Mfg Reference', width: 112, render: (row) => row.mfgRef || '—' },
                { key: 'date', label: 'Date', width: 92, render: (row) => formatDate(row.date) },
                { key: 'status', label: 'Transfer Status', width: 122, render: (row) => <StatusBadge status={row.status} tone={cadStatusTone(row.status)} /> },
                { key: 'remarks', label: 'Remarks', width: 210, render: (row) => <span className="cell-muted cad-clip">{row.remarks || '—'}</span> },
              ]}
              rows={handoverRows.filter((row) => handoverFilter === 'All' || row.destination === handoverFilter)}
              className="mech-register-table cad-register-table"
              rowActions={(row) => [
                ...(row.status === 'Draft' ? [{ key: 'ready', label: 'Mark ready', icon: Check }] : []),
                ...(row.status === 'Ready' ? [{ key: 'submit', label: 'Mark submitted', icon: Send }] : []),
                ...(row.status === 'Submitted' ? [{ key: 'ack', label: 'Mark acknowledged', icon: CheckCircle2 }, { key: 'reject', label: 'Mark rejected', icon: X }] : []),
                { key: 'delete', label: 'Delete reference', icon: Trash2, danger: true, divider: true },
              ]}
              onRowAction={(key, row) => {
                if (key === 'ready') { updateHandoverStatus(row.id, 'Ready'); showToast(`${row.id} marked ready.`); }
                if (key === 'submit') { updateHandoverStatus(row.id, 'Submitted'); showToast(`${row.id} marked submitted (simulated).`); }
                if (key === 'ack') { updateHandoverStatus(row.id, 'Acknowledged'); showToast(`${row.id} acknowledged (simulated).`); }
                if (key === 'reject') { updateHandoverStatus(row.id, 'Rejected'); showToast(`${row.id} marked rejected.`); }
                if (key === 'delete') { removeHandover(row.id); showToast(`${row.id} deleted.`); }
              }}
              ariaLabel="Purchase and production handover references"
              emptyContent={<EmptyState icon={PackageCheck} title="No handover records" message="Create a simulated handover reference for a released drawing." />}
            />
          </section>
          <div className="cad-notes-grid">
            <section className="card cad-side-card">
              <h4>Purchase handover fields</h4>
              <p>Drawing reference, project, revision, related BOM reference, document purpose and transfer status. No purchase requisition or order is created.</p>
            </section>
            <section className="card cad-side-card">
              <h4>Production handover fields</h4>
              <p>Drawing number, revision, part/assembly, manufacturing drawing reference, related BOM and transfer status. No production order is created.</p>
            </section>
          </div>
          <p className="mech-footnote">
            These records represent the intended destination for approved or released engineering documents. Each
            handover stores the exact drawing revision it was prepared from; nothing is transferred to Purchase or
            Production by this module.
          </p>
        </>
      )}

      {/* -------------------------------------------------- revision detail */}
      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title="Revision Details"
        subtitle={detailTarget ? `${detailTarget.drawingNumber} · Rev ${detailTarget.revision}` : ''}
        maxWidth="max-w-2xl"
        footer={<Button variant="ghost" onClick={() => setDetailTarget(null)}>Close</Button>}
      >
        {detailTarget && (
          <>
            <div className="fact-grid">
              <Fact label="Revision ID">{detailTarget.id}</Fact>
              <Fact label="Drawing Number">{detailTarget.drawingNumber}</Fact>
              <Fact label="Drawing Title">{detailTarget.title}</Fact>
              <Fact label="Project">{detailTarget.projectId} · {projectName(projects, detailTarget.projectId)}</Fact>
              <Fact label="Part Number">{detailTarget.partNumber}</Fact>
              <Fact label="Current Revision">Rev {detailTarget.currentRevision}</Fact>
              <Fact label="Previous Revision">{detailTarget.previous ? `Rev ${detailTarget.previous}` : 'Initial revision'}</Fact>
              <Fact label="Revision Date">{formatDate(detailTarget.date)}</Fact>
              <Fact label="Prepared By">{detailTarget.by}</Fact>
              <Fact label="Revision Status"><RevisionStatusPill status={detailTarget.status} /></Fact>
              <Fact label="Review Status">{detailTarget.reviewStatus}</Fact>
              <Fact label="Approval Status"><RevisionStatusPill status={detailTarget.approvalStatus} /></Fact>
              <Fact label="Release Date">{detailTarget.releaseDate ? formatDate(detailTarget.releaseDate) : detailTarget.status === 'Superseded' ? 'Not recorded' : 'Not released'}</Fact>
            </div>
            <div className="cad-detail-section">
              <h4>Change description</h4>
              <p>{detailTarget.note || 'No change note recorded.'}</p>
              <h4>Change reason</h4>
              <p>{detailTarget.changeReason || 'No change reason recorded.'}</p>
            </div>
            <div className="cad-detail-section">
              <h4>Metadata snapshot</h4>
              <div className="fact-grid">
                <Fact label="Title">{detailTarget.meta.title}</Fact>
                <Fact label="Type">{detailTarget.meta.drawingType}</Fact>
                <Fact label="Format">{detailTarget.meta.format}</Fact>
                <Fact label="Scale / Units">{`${detailTarget.meta.scale || '—'} · ${detailTarget.meta.units || '—'}`}</Fact>
                <Fact label="Sheet / Projection">{`${detailTarget.meta.sheetSize || '—'} · ${detailTarget.meta.projectionMethod || '—'}`}</Fact>
                <Fact label="Material Reference">{detailTarget.meta.materialRef || '—'}</Fact>
                <Fact label="Description">{detailTarget.meta.description}</Fact>
                <Fact label="Tolerance Notes">{detailTarget.meta.toleranceNotes || '—'}</Fact>
                <Fact label="CAD Files">{detailTarget.meta.cadFileIds?.join(', ') || '—'}</Fact>
                <Fact label="Attachments">{detailTarget.meta.attachments?.join(', ') || '—'}</Fact>
              </div>
            </div>
            <p className="cad-note">This is the stored metadata snapshot for the revision. It is not a rendered copy of the drawing.</p>
          </>
        )}
      </Modal>

      {/* --------------------------------------------------- new revision */}
      <Modal
        open={Boolean(newRevisionTarget)}
        onClose={() => setNewRevisionTarget(null)}
        title="Raise Drawing Revision"
        subtitle="Creates a new draft revision from the current approved or released revision"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewRevisionTarget(null)}>Cancel</Button>
            <Button icon={GitBranch} onClick={() => {
              if (!newRevisionTarget.drawingId) { setNewRevisionTarget((previous) => ({ ...previous, error: 'Select a drawing.' })); return; }
              if (!newRevisionTarget.note.trim() || !newRevisionTarget.reason.trim()) { setNewRevisionTarget((previous) => ({ ...previous, error: 'Enter both the change description and change reason.' })); return; }
              const result = createRevision(newRevisionTarget.drawingId, newRevisionTarget.by, newRevisionTarget.note, newRevisionTarget.reason);
              if (result.error) { setNewRevisionTarget((previous) => ({ ...previous, error: result.error })); return; }
              showToast(`Revision ${result.revision} created as a draft.`);
              setNewRevisionTarget(null);
            }}>Create Revision</Button>
          </>
        }
      >
        {newRevisionTarget && (
          <div className="form-grid">
            <Select
              label="Drawing"
              id="revision-drawing"
              className="span-2"
              options={[{ value: '', label: 'Select an approved or released drawing' }, ...eligibleForRevision.map((row) => ({ value: row.id, label: `${row.drawingNumber} · Rev ${row.revision} · ${row.approvalStatus}` }))]}
              value={newRevisionTarget.drawingId}
              onChange={(event) => setNewRevisionTarget((previous) => ({ ...previous, drawingId: event.target.value, error: '' }))}
            />
            <Select
              label="Prepared By"
              id="revision-by"
              options={CAD_ENGINEERS.map((value) => ({ value, label: value }))}
              value={newRevisionTarget.by}
              onChange={(event) => setNewRevisionTarget((previous) => ({ ...previous, by: event.target.value }))}
            />
            <div className="form-field">
              <span className="form-label">Next Revision</span>
              <span className="form-static">{drawings.find((row) => row.id === newRevisionTarget.drawingId)?.revision || '—'} → {(() => { const current = drawings.find((row) => row.id === newRevisionTarget.drawingId)?.revision; const steps = ['A', 'B', 'C', 'D', 'E', 'F']; const index = steps.indexOf(current); return current ? (steps[index + 1] || `${current}1`) : '—'; })()}</span>
            </div>
            <Textarea label="Change Summary" id="revision-note" className="span-2" rows={3} value={newRevisionTarget.note} onChange={(event) => setNewRevisionTarget((previous) => ({ ...previous, note: event.target.value }))} placeholder="Describe what changed in this revision." />
            <Textarea label="Change Reason" id="revision-reason" className="span-2" rows={2} value={newRevisionTarget.reason} onChange={(event) => setNewRevisionTarget((previous) => ({ ...previous, reason: event.target.value }))} placeholder="Why the change is required (design, quality, manufacturing, customer)." />
            <p className="cad-note span-2">The new revision starts as Draft with no approvals. The previous current revision becomes Superseded in the register.</p>
            {newRevisionTarget.error && <p className="form-error span-2" role="alert">{newRevisionTarget.error}</p>}
          </div>
        )}
      </Modal>

      {/* --------------------------------------------------- review dialog */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Technical Review Decision"
        subtitle={reviewTarget?.drawing?.drawingNumber}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button onClick={() => {
              if (reviewTarget.decision !== 'Approved' && !reviewTarget.comments.trim()) {
                setReviewTarget((previous) => ({ ...previous, error: 'Comments are required for this decision.' }));
                return;
              }
              const result = recordDrawingDecision(reviewTarget.drawing.id, {
                decision: reviewTarget.decision,
                comments: reviewTarget.comments,
                by: reviewTarget.reviewer,
              });
              if (result.error) { setReviewTarget((previous) => ({ ...previous, error: result.error })); return; }
              showToast(`${reviewTarget.drawing.drawingNumber} — ${reviewTarget.decision === 'Request Changes' ? 'changes requested' : reviewTarget.decision.toLowerCase()}.`);
              setReviewTarget(null);
            }}>Record Decision</Button>
          </>
        }
      >
        {reviewTarget && (
          <div className="form-grid">
            <Select
              label="Decision"
              id="review-decision"
              className="span-2"
              options={[{ value: 'Approved', label: 'Approve drawing' }, { value: 'Request Changes', label: 'Request changes' }, { value: 'Reject', label: 'Reject / withdraw drawing' }]}
              value={reviewTarget.decision}
              onChange={(event) => setReviewTarget((previous) => ({ ...previous, decision: event.target.value, error: '' }))}
            />
            <Select
              label="Reviewer"
              id="reviewer"
              options={[...new Set([REVIEWER_PERSONA, 'A. Iyer', 'S. Menon', 'K. Pillai'])].map((value) => ({ value, label: value }))}
              value={reviewTarget.reviewer}
              onChange={(event) => setReviewTarget((previous) => ({ ...previous, reviewer: event.target.value }))}
            />
            <div className="form-field">
              <span className="form-label">Drawing</span>
              <span className="form-static">{reviewTarget.drawing.title} · Rev {reviewTarget.drawing.revision}</span>
            </div>
            <Textarea
              label={reviewTarget.decision === 'Approved' ? 'Review comments' : 'Comments (required)'}
              id="review-comments"
              className="span-2"
              rows={4}
              value={reviewTarget.comments}
              onChange={(event) => setReviewTarget((previous) => ({ ...previous, comments: event.target.value }))}
              placeholder={reviewTarget.decision === 'Approved' ? 'Optional approval note.' : 'Explain the required correction or rejection reason.'}
            />
            <p className="cad-note span-2">Approval only allows release; it does not release the drawing automatically. Rejection withdraws the drawing in this mock workflow.</p>
            {reviewTarget.error && <p className="form-error span-2" role="alert">{reviewTarget.error}</p>}
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------------- release dialog */}
      <Modal
        open={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        title="Release Drawing"
        subtitle={releaseTarget?.drawingNumber}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReleaseTarget(null)}>Cancel</Button>
            <Button icon={ShieldCheck} onClick={() => {
              const result = releaseDrawing(releaseTarget.id, 'Design Admin');
              if (result.error) { showToast(result.error, 'error'); return; }
              showToast(`${releaseTarget.drawingNumber} released as a controlled document.`);
              setReleaseTarget(null);
            }}>Confirm Release</Button>
          </>
        }
      >
        {releaseTarget && (
          <>
            <p className="dash-modal-note">
              {releaseTarget.drawingNumber} · Rev {releaseTarget.revision} — {releaseTarget.title}
            </p>
            <p className="dash-modal-note">
              Approval is recorded by {releaseTarget.approvals?.at(-1)?.reviewer || releaseTarget.reviewedBy || 'the assigned reviewer'}.
              Release marks the revision as Released and creates a local release reference. No file is transmitted.
            </p>
          </>
        )}
      </Modal>

      {/* ------------------------------------------------- transmittal form */}
      <Modal
        open={transmittalModal}
        onClose={() => setTransmittalModal(false)}
        title="New Drawing Transmittal"
        subtitle={`${nextTransmittalId()} · simulated distribution record`}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransmittalModal(false)}>Cancel</Button>
            <Button icon={Send} onClick={() => {
              if (!transmittalForm.drawingId) { setTransmittalForm((previous) => ({ ...previous, error: 'Select a drawing.' })); return; }
              if (!transmittalForm.recipient.trim()) { setTransmittalForm((previous) => ({ ...previous, error: 'Recipient is required.' })); return; }
              if (!transmittalForm.purpose.trim()) { setTransmittalForm((previous) => ({ ...previous, error: 'Purpose is required.' })); return; }
              const drawing = drawings.find((row) => row.id === transmittalForm.drawingId);
              const record = {
                id: nextTransmittalId(),
                projectId: drawing.projectId,
                drawingId: drawing.id,
                recipient: transmittalForm.recipient.trim(),
                purpose: transmittalForm.purpose.trim(),
                issueDate: transmittalForm.issueDate,
                preparedBy: transmittalForm.preparedBy,
                status: transmittalForm.status,
                remarks: transmittalForm.remarks,
              };
              addTransmittal(record);
              updateDrawing(drawing.id, {
                changeHistory: [...(drawing.changeHistory || []), { id: `CH-${Date.now()}`, at: TODAY, by: transmittalForm.preparedBy, action: 'Transmittal', description: `${record.id} prepared for ${record.recipient}.` }],
              });
              showToast(`${record.id} prepared.`);
              setTransmittalModal(false);
            }}>Save Transmittal</Button>
          </>
        }
      >
        {transmittalForm && (
          <div className="form-grid">
            <Select
              label="Project"
              id="transmittal-project"
              options={projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))}
              value={transmittalForm.projectId}
              onChange={(event) => { const projectId = event.target.value; setTransmittalForm((previous) => ({ ...previous, projectId, drawingId: drawings.find((row) => row.projectId === projectId)?.id || '' })); }}
            />
            <Select
              label="Drawing Number"
              id="transmittal-drawing"
              options={drawings.filter((row) => row.projectId === transmittalForm.projectId).map((row) => ({ value: row.id, label: `${row.drawingNumber} · Rev ${row.revision} · ${row.approvalStatus}` }))}
              value={transmittalForm.drawingId}
              onChange={(event) => setTransmittalForm((previous) => ({ ...previous, drawingId: event.target.value, error: '' }))}
            />
            <Select
              label="Drawing Revision"
              id="transmittal-revision"
              options={[{ value: drawings.find((row) => row.id === transmittalForm.drawingId)?.revision || '', label: `Rev ${drawings.find((row) => row.id === transmittalForm.drawingId)?.revision || '—'}` }]}
              value={drawings.find((row) => row.id === transmittalForm.drawingId)?.revision || ''}
              onChange={() => {}}
              disabled
            />
            <Select
              label="Transmittal Status"
              id="transmittal-status"
              options={TRANSMITTAL_STATUSES.map((value) => ({ value, label: value }))}
              value={transmittalForm.status}
              onChange={(event) => setTransmittalForm((previous) => ({ ...previous, status: event.target.value }))}
            />
            <div className="form-field span-2">
              <label className="form-label" htmlFor="transmittal-recipient">Recipient</label>
              <input id="transmittal-recipient" className="form-input" value={transmittalForm.recipient} onChange={(event) => setTransmittalForm((previous) => ({ ...previous, recipient: event.target.value, error: '' }))} placeholder="e.g. Purchase — Sourcing cell" />
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor="transmittal-purpose">Purpose</label>
              <input id="transmittal-purpose" className="form-input" value={transmittalForm.purpose} onChange={(event) => setTransmittalForm((previous) => ({ ...previous, purpose: event.target.value, error: '' }))} placeholder="e.g. For procurement of drive components" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="transmittal-date">Issue Date</label>
              <input id="transmittal-date" type="date" className="form-input" value={transmittalForm.issueDate} onChange={(event) => setTransmittalForm((previous) => ({ ...previous, issueDate: event.target.value }))} />
            </div>
            <Select
              label="Prepared By"
              id="transmittal-by"
              options={CAD_ENGINEERS.map((value) => ({ value, label: value }))}
              value={transmittalForm.preparedBy}
              onChange={(event) => setTransmittalForm((previous) => ({ ...previous, preparedBy: event.target.value }))}
            />
            <Textarea label="Remarks" id="transmittal-remarks" className="span-2" rows={2} value={transmittalForm.remarks} onChange={(event) => setTransmittalForm((previous) => ({ ...previous, remarks: event.target.value }))} />
            {transmittalForm.error && <p className="form-error span-2" role="alert">{transmittalForm.error}</p>}
            <p className="cad-note span-2">A transmittal is a local record only. No email is sent and no external system is updated.</p>
          </div>
        )}
      </Modal>

      {/* --------------------------------------------------- handover form */}
      <Modal
        open={handoverModal}
        onClose={() => setHandoverModal(false)}
        title="New Handover Reference"
        subtitle={`${nextHandoverId()} · simulated Purchase / Production handover`}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHandoverModal(false)}>Cancel</Button>
            <Button icon={PackageCheck} onClick={() => {
              if (!handoverForm.drawingId) { setHandoverForm((previous) => ({ ...previous, error: 'Select an approved or released drawing.' })); return; }
              if (handoverForm.destination === 'Purchase' && !handoverForm.purpose.trim()) { setHandoverForm((previous) => ({ ...previous, error: 'Document purpose is required for a purchase handover.' })); return; }
              if (handoverForm.destination === 'Production' && !handoverForm.partOrAssembly.trim()) { setHandoverForm((previous) => ({ ...previous, error: 'Part or assembly is required for a production handover.' })); return; }
              const drawing = drawings.find((row) => row.id === handoverForm.drawingId);
              if (!drawing || !['Approved', 'Released'].includes(drawing.approvalStatus)) {
                setHandoverForm((previous) => ({ ...previous, error: 'Only an approved or released drawing revision can be handed over.' }));
                return;
              }
              const result = addHandover({
                id: nextHandoverId(),
                destination: handoverForm.destination,
                projectId: handoverForm.projectId,
                drawingId: drawing.id,
                drawingNumber: drawing.drawingNumber,
                revision: drawing.revision,
                drawingStatus: drawing.approvalStatus,
                bomRef: handoverForm.bomRef || drawing.bomRef,
                purpose: handoverForm.purpose,
                partOrAssembly: handoverForm.partOrAssembly,
                mfgRef: handoverForm.mfgRef || drawing.mfgRef,
                date: handoverForm.date,
                status: handoverForm.status,
                remarks: handoverForm.remarks,
              });
              if (result.error) {
                setHandoverForm((previous) => ({ ...previous, error: result.error }));
                return;
              }
              showToast('Handover reference created locally (not transmitted).');
              setSection('handover');
              setHandoverModal(false);
            }}>Save Reference</Button>
          </>
        }
      >
        {handoverForm && (
          <div className="form-grid">
            <Select
              label="Destination"
              id="handover-destination"
              options={[{ value: 'Purchase', label: 'Purchase handover' }, { value: 'Production', label: 'Production handover' }]}
              value={handoverForm.destination}
              onChange={(event) => setHandoverForm((previous) => ({ ...previous, destination: event.target.value, error: '' }))}
            />
            <Select
              label="Project"
              id="handover-project"
              options={projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))}
              value={handoverForm.projectId}
              onChange={(event) => { const projectId = event.target.value; setHandoverForm((previous) => ({ ...previous, projectId, drawingId: transferableDrawings.find((row) => row.projectId === projectId)?.id || '' })); }}
            />
            <Select
              label="Drawing"
              id="handover-drawing"
              options={transferableDrawings.filter((row) => row.projectId === handoverForm.projectId).map((row) => ({ value: row.id, label: `${row.drawingNumber} · Rev ${row.revision} · ${row.approvalStatus}` }))}
              value={handoverForm.drawingId}
              onChange={(event) => {
                const drawing = transferableDrawings.find((row) => row.id === event.target.value);
                setHandoverForm((previous) => ({
                  ...previous,
                  drawingId: event.target.value,
                  partOrAssembly: drawing
                    ? drawing.assemblyId
                      ? assemblyLabel(assemblies, drawing.assemblyId)
                      : `${drawing.partNumber} · ${drawing.partName}`
                    : previous.partOrAssembly,
                  error: '',
                }));
              }}
            />
            <div className="form-field">
              <span className="form-label">Drawing Revision</span>
              <span className="form-static">Rev {selectedHandoverDrawing?.revision || '—'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Drawing Status</span>
              <span className="form-static">{selectedHandoverDrawing?.approvalStatus || '—'}</span>
            </div>
            {handoverForm.destination === 'Purchase' ? (
              <div className="form-field span-2">
                <label className="form-label" htmlFor="handover-purpose">Document Purpose</label>
                <input id="handover-purpose" className="form-input" value={handoverForm.purpose} onChange={(event) => setHandoverForm((previous) => ({ ...previous, purpose: event.target.value, error: '' }))} placeholder="e.g. Procurement of drive components" />
              </div>
            ) : (
              <div className="form-field span-2">
                <label className="form-label" htmlFor="handover-part">Part / Assembly</label>
                <input id="handover-part" className="form-input" value={handoverForm.partOrAssembly} onChange={(event) => setHandoverForm((previous) => ({ ...previous, partOrAssembly: event.target.value, error: '' }))} placeholder="e.g. ASM-2026-001 · Conveyor drive assembly" />
              </div>
            )}
            <div className="form-field">
              <label className="form-label" htmlFor="handover-bom">Related BOM Reference</label>
              <input id="handover-bom" className="form-input" value={handoverForm.bomRef} onChange={(event) => setHandoverForm((previous) => ({ ...previous, bomRef: event.target.value }))} placeholder={selectedHandoverDrawing?.bomRef || 'BOM reference'} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="handover-mfg">Manufacturing Reference</label>
              <input id="handover-mfg" className="form-input" value={handoverForm.mfgRef} onChange={(event) => setHandoverForm((previous) => ({ ...previous, mfgRef: event.target.value }))} placeholder={selectedHandoverDrawing?.mfgRef || 'MFG reference'} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="handover-date">Date</label>
              <input id="handover-date" type="date" className="form-input" value={handoverForm.date} onChange={(event) => setHandoverForm((previous) => ({ ...previous, date: event.target.value }))} />
            </div>
            <Select
              label="Transfer Status"
              id="handover-status"
              options={HANDOVER_STATUSES.map((value) => ({ value, label: value }))}
              value={handoverForm.status}
              onChange={(event) => setHandoverForm((previous) => ({ ...previous, status: event.target.value }))}
            />
            <Textarea label="Remarks" id="handover-remarks" className="span-2" rows={2} value={handoverForm.remarks} onChange={(event) => setHandoverForm((previous) => ({ ...previous, remarks: event.target.value }))} />
            {handoverForm.error && <p className="form-error span-2" role="alert">{handoverForm.error}</p>}
            <p className="cad-note span-2">This creates a mock handover record only. It does not call Purchase or Production and does not create any order.</p>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
