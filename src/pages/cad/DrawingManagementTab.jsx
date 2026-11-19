import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Download,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Layers,
  MonitorDown,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Shapes,
  Trash2,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import {
  DRAWING_STATUSES,
  DRAWING_TYPES,
  assemblyLabel,
  cadStatusTone,
  formatBytes,
  projectName,
} from '../../data/cadData';
import exportCsv from '../../utils/exportCsv';
import { CadFilters, Fact, FileTypeBadge, SectionNav, Toast, useTable, useToast } from './cadUi';
import { OpenInCadDialog } from './OpenInCadSoftware';

const SECTIONS = [
  { key: 'register', label: 'Drawing Register' },
  { key: 'classification', label: 'Number & Classification' },
  { key: 'attachments', label: 'Drawing Attachments' },
];

const CSV_COLUMNS = [
  { key: 'id', label: 'Drawing ID' },
  { key: 'drawingNumber', label: 'Drawing Number' },
  { key: 'title', label: 'Drawing Title' },
  { key: 'drawingType', label: 'Drawing Type' },
  { key: 'projectId', label: 'Project' },
  { key: 'partNumber', label: 'Part Number' },
  { key: 'assemblyName', label: 'Assembly' },
  { key: 'revision', label: 'Revision' },
  { key: 'format', label: 'Drawing Format' },
  { key: 'preparedBy', label: 'Prepared By' },
  { key: 'drawingDate', label: 'Drawing Date' },
  { key: 'approvalStatus', label: 'Approval Status' },
  { key: 'releaseStatus', label: 'Release Status' },
];

export default function DrawingManagementTab() {
  const navigate = useNavigate();
  const { drawings, files, submitDrawing, removeDrawing } = useCad();
  const { assemblies } = useMechanical();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('register');
  const [openCadTarget, setOpenCadTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(
    () =>
      drawings.map((drawing) => ({
        ...drawing,
        assemblyName: drawing.assemblyId ? assemblyLabel(assemblies, drawing.assemblyId) : 'Not linked',
        project: projectName(projects, drawing.projectId),
        relatedFiles: files.filter((file) => drawing.cadFileIds?.includes(file.id)),
        hasPreview: drawing.attachments?.some((row) => row.preview && row.assetPath),
      })),
    [drawings, assemblies, projects, files],
  );

  const table = useTable(rows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.status !== 'All' && row.approvalStatus !== filters.status) return false;
    if (filters.type !== 'All' && row.drawingType !== filters.type) return false;
    if (filters.partNumber && !row.partNumber.toLowerCase().includes(filters.partNumber.toLowerCase())) return false;
    if (filters.from && row.drawingDate < filters.from) return false;
    if (filters.to && row.drawingDate > filters.to) return false;
    if (!query) return true;
    return [row.id, row.drawingNumber, row.title, row.drawingType, row.projectId, row.partNumber, row.partName, row.assemblyName, row.revision, row.preparedBy, row.approvalStatus, row.releaseStatus]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const allAttachments = rows.flatMap((drawing) =>
    (drawing.attachments || []).map((attachment) => ({ ...attachment, drawingId: drawing.id, drawingNumber: drawing.drawingNumber, revision: drawing.revision, hasAsset: Boolean(attachment.assetPath) })),
  );

  const openViewer = (drawing) => {
    if (!drawing.hasPreview) {
      showToast('No browser-renderable attachment is attached to this drawing. DWG/DXF remain stored only.', 'error');
      return;
    }
    navigate(`/cad-management/viewer?drawing=${drawing.id}`);
  };

  const viewDetails = (drawing) => {
    navigate(`/cad-management/drawings/${drawing.id}`);
  };

  // Open in CAD Software always receives the exact selected original attachment.
  const openInCad = (drawing) => {
    const attachment = drawing.attachments?.find((row) => row.assetPath) || drawing.attachments?.[0];
    setOpenCadTarget({
      fileName: attachment?.name || `${drawing.drawingNumber}.${(drawing.format || '').toLowerCase()}`,
      assetPath: attachment?.assetPath || '',
      recordRef: drawing.drawingNumber,
      sourceModule: 'Drawing & CAD Management → Drawing Management',
      context: [
        { label: 'Project ID', value: drawing.projectId },
        { label: 'Revision', value: drawing.revision ? `Rev ${drawing.revision}` : '' },
        { label: 'Attachment', value: attachment?.name || '' },
      ].filter((row) => row.value),
    });
  };

  const counts = {
    register: drawings.length,
    classification: new Set(drawings.map((row) => row.drawingType)).size,
    attachments: allAttachments.length,
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />

      {section === 'register' && (
        <>
          <KpiGrid>
            <StatCard icon={FileText} label="Drawing Records" value={String(drawings.length)} sub="Separate engineering drawing register" tone="teal" />
            <StatCard icon={Send} label="Under Review" value={String(drawings.filter((row) => ['Submitted', 'Under Review'].includes(row.approvalStatus)).length)} sub="Submitted for technical review" tone="orange" />
            <StatCard icon={Shapes} label="Approved" value={String(drawings.filter((row) => row.approvalStatus === 'Approved').length)} sub="Approved, not yet released" tone="blue" />
            <StatCard icon={FolderOpen} label="Released" value={String(drawings.filter((row) => row.approvalStatus === 'Released').length)} sub="Controlled released documents" tone="emerald" />
          </KpiGrid>

          <Toolbar
            left={
              <>
                <Button variant="ghost" icon={RefreshCw} onClick={table.reset}>Refresh</Button>
                <Button variant="secondary" size="sm" icon={Filter} onClick={() => table.setFiltersOpen((open) => !open)}>
                  {table.filtersOpen ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </>
            }
            right={
              <>
                <SearchInput id="drawing-search" value={table.search} onChange={table.setSearch} placeholder="Search drawing, part, project…" ariaLabel="Search drawings" />
                <Button variant="secondary" size="sm" icon={Download} onClick={() => { exportCsv('drawing-register', CSV_COLUMNS, table.sorted); showToast('CSV export prepared.'); }}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => navigate('/cad-management/drawings/new')}>New Drawing</Button>
              </>
            }
            count={table.pageInfo}
          />
          <CadFilters table={table} projects={projects} statuses={DRAWING_STATUSES} types={DRAWING_TYPES} typeLabel="Drawing Type" />

          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Drawing ID', width: 96, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'drawingNumber', label: 'Drawing Number', width: 128, sortable: true, render: (row) => <span className="cell-strong">{row.drawingNumber}</span> },
                { key: 'title', label: 'Drawing Title', width: 230, sortable: true, render: (row) => <span className="cad-clip" title={row.title}>{row.title}</span> },
                { key: 'drawingType', label: 'Type', width: 148, sortable: true },
                { key: 'projectId', label: 'Project', width: 110, render: (row) => <span className="cell-project"><span className="cell-id">{row.projectId}</span><span className="cell-muted cad-clip">{row.project}</span></span> },
                { key: 'partNumber', label: 'Part', width: 128, render: (row) => <span className="cell-project"><span>{row.partNumber}</span><span className="cell-muted cad-clip">{row.partName}</span></span> },
                { key: 'assemblyName', label: 'Assembly', width: 112, render: (row) => <span className="cell-muted cad-clip">{row.assemblyName}</span> },
                { key: 'revision', label: 'Rev', width: 46, align: 'center', sortable: true },
                { key: 'format', label: 'Format', width: 66, align: 'center' },
                { key: 'preparedBy', label: 'Prepared By', width: 92, sortable: true },
                { key: 'drawingDate', label: 'Date', width: 82, sortable: true },
                { key: 'approvalStatus', label: 'Approval', width: 108, render: (row) => <StatusBadge status={row.approvalStatus} tone={cadStatusTone(row.approvalStatus)} /> },
                { key: 'releaseStatus', label: 'Release', width: 96, render: (row) => <StatusBadge status={row.releaseStatus} tone={cadStatusTone(row.releaseStatus)} /> },
              ]}
              rows={table.pageRows}
              className="mech-register-table cad-register-table"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              recordHref={(row) => `/cad-management/drawings/${row.id}`}
              onRowClick={viewDetails}
              rowActions={(row) => [
                { key: 'view', label: 'View drawing details', icon: Eye },
                ...(row.hasPreview ? [{ key: 'viewer', label: 'Open in CAD Viewer', icon: Layers }] : []),
                { key: 'openCad', label: 'Open in CAD Software', icon: MonitorDown },
                ...(['Draft', 'Changes Requested'].includes(row.approvalStatus) ? [{ key: 'edit', label: 'Edit drawing', icon: Pencil }] : []),
                ...(['Draft', 'Changes Requested'].includes(row.approvalStatus) ? [{ key: 'submit', label: 'Submit for review', icon: Send }] : []),
                ...(targetsFor('drawing', row).some((target) => target.enabled)
                  ? [{ key: 'convert', label: 'Submit for design review', icon: ArrowRightLeft }]
                  : []),
                ...(row.approvalStatus === 'Draft' ? [{ key: 'delete', label: 'Delete draft', icon: Trash2, danger: true, divider: true }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') viewDetails(row);
                if (key === 'viewer') openViewer(row);
                if (key === 'openCad') openInCad(row);
                if (key === 'edit') navigate(`/cad-management/drawings/${row.id}/edit`);
                if (key === 'submit') {
                  const result = submitDrawing(row.id, row.preparedBy);
                  if (result.error) showToast(result.error, 'error');
                  else showToast(`${row.drawingNumber} submitted for technical review.`);
                }
                if (key === 'convert') openConversion('drawing', row);
                if (key === 'delete') setDeleteTarget(row);
              }}
              ariaLabel="Drawing register"
              emptyContent={<EmptyState icon={FileText} title="No drawings" message="No drawings match the current search and filters." />}
            />
            <Pagination
              page={table.page}
              totalPages={Math.max(1, Math.ceil(table.sorted.length / table.pageSize))}
              pageSize={table.pageSize}
              pageInfo={table.pageInfo}
              onPageChange={table.setPage}
              onPageSizeChange={(size) => { table.setPageSize(size); table.setPage(1); }}
              pageSizeOptions={[5, 10, 25]}
            />
          </section>
          <p className="mech-footnote">
            Drawing records are separate from CAD files but stay linked through the drawing's CAD file references. Approval and release are controlled in Revision &amp; Release Management.
          </p>
        </>
      )}

      {section === 'classification' && (
        <>
          <div className="card cad-card-head cad-card-head-pad">
            <div>
              <h3>Drawing number &amp; classification</h3>
              <p>Drawing numbers are entered by the user. This application does not impose an automatic numbering standard; seed numbers follow the existing engineering convention.</p>
            </div>
            <Button icon={Plus} onClick={() => navigate('/cad-management/drawings/new')}>New Drawing</Button>
          </div>
          <div className="cad-category-grid">
            {DRAWING_TYPES.map((type) => {
              const items = rows.filter((row) => row.drawingType === type);
              return (
                <section key={type} className="card cad-category-card">
                  <div className="cad-card-head">
                    <div><h3>{type}</h3><p>{items.length} drawing{items.length === 1 ? '' : 's'}</p></div>
                    <span className="cad-count-badge">{items.length}</span>
                  </div>
                  {items.length === 0 ? <p className="cell-muted">No drawings of this type.</p> : (
                    <ul className="cad-category-list">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button type="button" className="link-button" onClick={() => viewDetails(item)}>
                            <FileTypeBadge extension={item.format} /> {item.drawingNumber}
                          </button>
                          <span className="cell-muted">Rev {item.revision} · {item.approvalStatus}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          <section className="table-card">
            <div className="cad-card-head cad-card-head-pad"><div><h3>Number register</h3><p>Every drawing number, its title, format and current revision.</p></div></div>
            <DataTable
              columns={[
                { key: 'drawingNumber', label: 'Drawing Number', width: 140, render: (row) => <span className="cell-id">{row.drawingNumber}</span> },
                { key: 'title', label: 'Title', width: 300, render: (row) => <span className="cad-clip">{row.title}</span> },
                { key: 'drawingType', label: 'Classification', width: 170 },
                { key: 'format', label: 'Format', width: 70 },
                { key: 'revision', label: 'Revision', width: 74, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'preparedBy', label: 'Prepared By', width: 100 },
                { key: 'approvalStatus', label: 'Status', width: 118, render: (row) => <StatusBadge status={row.approvalStatus} tone={cadStatusTone(row.approvalStatus)} /> },
              ]}
              rows={rows}
              recordHref={(row) => `/cad-management/drawings/${row.id}`}
              onRowClick={viewDetails}
              className="mech-register-table"
              ariaLabel="Drawing classification register"
            />
          </section>
        </>
      )}

      {section === 'attachments' && (
        <>
          <KpiGrid>
            <StatCard icon={Paperclip} label="Attachments" value={String(allAttachments.length)} sub="Across all drawing records" tone="teal" />
            <StatCard icon={Eye} label="Preview Available" value={String(allAttachments.filter((row) => row.preview && row.assetPath).length)} sub="SVG or PDF attachments" tone="emerald" />
            <StatCard icon={FileText} label="Stored Only" value={String(allAttachments.filter((row) => !(row.preview && row.assetPath)).length)} sub="DWG / DXF / records without bytes" tone="orange" />
            <StatCard icon={FolderOpen} label="Drawings Covered" value={String(new Set(allAttachments.map((row) => row.drawingId)).size)} sub="Drawings with attachments" tone="blue" />
          </KpiGrid>
          <section className="table-card">
            <div className="cad-card-head cad-card-head-pad">
              <div><h3>Drawing attachments</h3><p>Attachment metadata with honest preview capability for each file type.</p></div>
              <Button variant="ghost" icon={RefreshCw} onClick={() => showToast('Attachment list refreshed from local state.')}>Refresh</Button>
            </div>
            <DataTable
              columns={[
                { key: 'name', label: 'Attachment', width: 280, render: (row) => <span className="cad-file-name"><FileTypeBadge extension={row.type} /><span className="cell-strong cad-clip">{row.name}</span></span> },
                { key: 'drawingNumber', label: 'Drawing', width: 140, render: (row) => <span><span className="cell-id">{row.drawingNumber}</span><span className="cell-muted cad-block">Rev {row.revision}</span></span> },
                { key: 'type', label: 'Type', width: 70 },
                { key: 'size', label: 'Size', width: 80, align: 'right', render: (row) => formatBytes(row.size) },
                { key: 'preview', label: 'Preview', width: 132, render: (row) => (row.preview && row.assetPath ? 'Available' : 'Unavailable') },
              ]}
              rows={allAttachments}
              rowActions={(row) => [
                { key: 'details', label: 'View drawing details', icon: Eye },
                ...(row.preview && row.assetPath ? [{ key: 'viewer', label: 'Open attachment in viewer', icon: Layers }] : []),
                { key: 'openCad', label: 'Open in CAD Software', icon: MonitorDown },
              ]}
              onRowAction={(key, row) => {
                if (key === 'details') viewDetails(rows.find((item) => item.id === row.drawingId));
                if (key === 'viewer') navigate(`/cad-management/viewer?drawing=${row.drawingId}`);
                if (key === 'openCad') {
                  setOpenCadTarget({
                    fileName: row.name,
                    assetPath: row.assetPath || '',
                    recordRef: row.drawingNumber,
                    sourceModule: 'Drawing & CAD Management → Drawing Attachments',
                    context: [
                      { label: 'Drawing', value: row.drawingNumber },
                      { label: 'Revision', value: row.revision ? `Rev ${row.revision}` : '' },
                      { label: 'Attachment', value: row.name },
                    ].filter((item) => item.value),
                  });
                }
              }}
              recordHref={(row) => `/cad-management/drawings/${row.drawingId}`}
              onRowClick={(row) => viewDetails(rows.find((item) => item.id === row.drawingId))}
              className="mech-register-table"
              ariaLabel="Drawing attachments"
            />
          </section>
          <p className="mech-footnote">Open a PDF or SVG attachment in the CAD Viewer. DWG and DXF attachments are listed with their real size and preview status; they are not rendered or replaced with images.</p>
        </>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Drawing Draft"
        subtitle={deleteTarget?.drawingNumber}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button icon={Trash2} onClick={() => { removeDrawing(deleteTarget.id); showToast(`${deleteTarget.drawingNumber} draft deleted.`); setDeleteTarget(null); }}>Delete Draft</Button>
          </>
        }
      >
        <p className="dash-modal-note">Only a draft drawing can be deleted. Released drawings are controlled records and should be superseded, not removed.</p>
      </Modal>

      <OpenInCadDialog
        open={Boolean(openCadTarget)}
        onClose={() => setOpenCadTarget(null)}
        fileName={openCadTarget?.fileName}
        assetPath={openCadTarget?.assetPath}
        recordRef={openCadTarget?.recordRef}
        sourceModule={openCadTarget?.sourceModule}
        sourceRef={openCadTarget?.recordRef}
        context={openCadTarget?.context}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
