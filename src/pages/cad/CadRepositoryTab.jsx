import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  FolderOpen,
  FolderTree,
  Layers,
  MonitorDown,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
  Upload,
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
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import Input, { Select, Textarea } from '../../components/common/Input';
import { useCad } from '../../context/CadContext';
import { ACCEPTED_CAD_EXTENSIONS, CAPABILITY_STATUS, capabilityRows } from '../../data/cadCapability';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  CAD_CATEGORIES,
  CAD_STATUSES,
  CAD_UNITS,
  COORDINATE_REFERENCES,
  SOURCE_APPLICATIONS,
  assemblyLabel,
  cadStatusTone,
  canPreview,
  conversionSummary,
  extensionOf,
  formatBytes,
  nextRevision,
  previewCapability,
  projectName,
} from '../../data/cadData';
import exportCsv from '../../utils/exportCsv';
import { CadFilters, Fact, FileTypeBadge, SectionNav, Toast, useTable, useToast } from './cadUi';
import { OpenInCadDialog } from './OpenInCadSoftware';
import { UNASSIGNED_GROUP_KEY, buildProjectGroups, projectStatusTone } from './cadProjectGroups';

const SECTIONS = [
  { key: 'register', label: 'CAD File Register' },
  { key: 'categories', label: 'File Categories' },
  { key: 'mapping', label: 'Project / Part / Assembly Mapping' },
  { key: 'capability', label: 'Format Capability' },
];

const ACCEPTED = `${ACCEPTED_CAD_EXTENSIONS},.doc,.docx,.xls,.xlsx,.csv,.txt`;
const ALLOWED = new Set([...ACCEPTED_CAD_EXTENSIONS.split(',').map((value) => value.replace('.', '')), 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt']);
const MAX_BYTES = 25 * 1024 * 1024;

const CSV_COLUMNS = [
  { key: 'id', label: 'File ID' },
  { key: 'fileName', label: 'File Name' },
  { key: 'fileType', label: 'File Type' },
  { key: 'category', label: 'Category' },
  { key: 'projectId', label: 'Project' },
  { key: 'designId', label: 'Mechanical Design' },
  { key: 'designRevision', label: 'Design Revision' },
  { key: 'partNumber', label: 'Part Number' },
  { key: 'partName', label: 'Part Name' },
  { key: 'assemblyName', label: 'Assembly' },
  { key: 'revision', label: 'Revision' },
  { key: 'sourceApplication', label: 'Source CAD Application' },
  { key: 'units', label: 'Units' },
  { key: 'scale', label: 'Scale' },
  { key: 'coordinateReference', label: 'Coordinate Reference' },
  { key: 'conversionStatus', label: 'Preview / Conversion Status' },
  { key: 'size', label: 'File Size (bytes)' },
  { key: 'uploadedBy', label: 'Uploaded By' },
  { key: 'uploadedAt', label: 'Uploaded Date' },
  { key: 'status', label: 'Status' },
];

export default function CadRepositoryTab() {
  const formatColumns = useTableColumnVisibility('/cad/drawings#format-capability', [
    { key: 'format', label: 'Format' },
    { key: 'classification', label: 'Classification' },
    { key: 'verified', label: 'Sample Verified' },
    { key: 'renderer', label: 'Renderer / Conversion' },
    { key: 'behaviour', label: 'Browser Behaviour' },
  ]);
  const navigate = useNavigate();
  const { files, drawings, localFiles, removeFile, updateFile, nextFileId, createFileVersion } = useCad();
  const { assemblies, designs } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const { projectId: routeProjectId } = useParams();
  const isProjectView = Boolean(routeProjectId);
  const [section, setSection] = useState('register');
  const [projectStatusFilter, setProjectStatusFilter] = useState('All');
  const [previewFilter, setPreviewFilter] = useState('All');
  const [viewTarget, setViewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [versionTarget, setVersionTarget] = useState(null);
  const [openCadTarget, setOpenCadTarget] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [versionNote, setVersionNote] = useState('');
  const [versionRevision, setVersionRevision] = useState('');
  const versionRef = useRef(null);

  const rows = useMemo(
    () =>
      files.map((file) => ({
        ...file,
        assemblyName: file.assemblyId ? assemblyLabel(assemblies, file.assemblyId) : 'Not linked',
        designName: designs.find((design) => design.id === file.designId)?.name || 'Not linked',
        project: projectName(projects, file.projectId),
        relatedDrawings: drawings.filter((drawing) => drawing.cadFileIds?.includes(file.id)).length,
        local: Boolean(localFiles[file.id]),
      })),
    [files, assemblies, projects, drawings, localFiles, designs],
  );

  const projectGroups = useMemo(() => buildProjectGroups(files, projects), [files, projects]);
  const activeGroup = isProjectView
    ? projectGroups.find((group) => group.key === routeProjectId) || null
    : null;

  const projectRows = useMemo(
    () => (activeGroup ? rows.filter((row) => (row.projectId || UNASSIGNED_GROUP_KEY) === activeGroup.key) : []),
    [rows, activeGroup],
  );

  const filteredGroups = useMemo(
    () =>
      projectGroups.filter((group) => {
        if (projectStatusFilter !== 'All' && group.projectStatus !== projectStatusFilter) return false;
        if (previewFilter === 'Available' && group.previewCount === 0) return false;
        if (previewFilter === 'Unavailable' && group.previewCount === group.fileCount) return false;
        return true;
      }),
    [projectGroups, projectStatusFilter, previewFilter],
  );

  const mainTable = useTable(
    filteredGroups,
    (group, _filters, query) => {
      if (!query) return true;
      return [group.projectId, group.name, group.customer, group.projectStatus, group.categories.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(query);
    },
    'projectNumber',
  );

  const projectTable = useTable(projectRows, (row, filters, query) => {
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (filters.type !== 'All' && row.category !== filters.type) return false;
    if (filters.partNumber && !row.partNumber.toLowerCase().includes(filters.partNumber.toLowerCase())) return false;
    if (filters.from && row.uploadedAt < filters.from) return false;
    if (filters.to && row.uploadedAt > filters.to) return false;
    if (!query) return true;
    return [row.id, row.fileName, row.fileType, row.category, row.projectId, row.partNumber, row.partName, row.assemblyName, row.designId, row.designName, row.designRevision, row.sourceApplication, row.units, row.scale, row.coordinateReference, row.revision, row.uploadedBy, row.status]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const projectStatuses = useMemo(
    () => [...new Set(projectGroups.filter((group) => !group.isUnassigned).map((group) => group.projectStatus))].sort(),
    [projectGroups],
  );

  const counts = {
    register: files.length,
    categories: new Set(files.map((row) => row.category)).size,
    mapping: new Set(files.map((row) => `${row.projectId}|${row.assemblyId}`)).size,
    capability: capabilityRows().flatMap((group) => group.rows).filter((row) => row.supported).length,
  };

  const download = (file) => {
    const path = localFiles[file.id]?.url || file.assetPath;
    if (!path) {
      showToast('No file bytes are attached to this record. Use the upload form to attach a local file.', 'error');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.download = file.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    showToast('Download started.');
  };

  const openViewer = (file) => {
    if (!canPreview(file)) {
      showToast(`${file.fileType} has no verified browser preview; the file stays downloadable.`, 'error');
      return;
    }
    navigate(`/cad-management/viewer?file=${file.id}`);
  };

  const categoryCount = (category) => files.filter((row) => row.category === category).length;

  const mappingGroups = useMemo(() => {
    const groups = new Map();
    files.forEach((file) => {
      const key = `${file.projectId}|${file.assemblyId || 'none'}`;
      if (!groups.has(key)) groups.set(key, { projectId: file.projectId, assemblyId: file.assemblyId, files: [] });
      groups.get(key).files.push(file);
    });
    return [...groups.values()];
  }, [files]);

  return (
    <>
      {!isProjectView && <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />}

      {section === 'register' && !isProjectView && (
        <>
          <KpiGrid>
            <StatCard icon={FolderTree} label="Total Projects" value={String(projectGroups.filter((group) => !group.isUnassigned).length)} sub="Projects holding at least one CAD file" tone="teal" />
            <StatCard icon={FolderOpen} label="Total CAD Files" value={String(files.length)} sub="Grouped under their linked project" tone="blue" />
            <StatCard icon={Eye} label="Projects with Preview" value={String(projectGroups.filter((group) => !group.isUnassigned && group.previewCount > 0).length)} sub="At least one file renders in the browser" tone="emerald" />
            <StatCard icon={EyeOff} label="Projects without Preview" value={String(projectGroups.filter((group) => !group.isUnassigned && group.previewCount < group.fileCount).length)} sub="Holds at least one stored-only file" tone="orange" />
          </KpiGrid>

          <Toolbar
            left={
              <>
                <Button variant="ghost" icon={RefreshCw} onClick={() => { mainTable.reset(); setProjectStatusFilter('All'); setPreviewFilter('All'); }}>Refresh</Button>
                <select className="form-input cad-project-filter" aria-label="Filter by project status" value={projectStatusFilter} onChange={(event) => { setProjectStatusFilter(event.target.value); mainTable.setPage(1); }}>
                  <option value="All">All project statuses</option>
                  {projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className="form-input cad-project-filter" aria-label="Filter by preview availability" value={previewFilter} onChange={(event) => { setPreviewFilter(event.target.value); mainTable.setPage(1); }}>
                  <option value="All">All preview states</option>
                  <option value="Available">Preview available</option>
                  <option value="Unavailable">Preview unavailable</option>
                </select>
              </>
            }
            right={
              <>
                <SearchInput id="cad-project-search" value={mainTable.search} onChange={mainTable.setSearch} placeholder="Search project number or name…" ariaLabel="Search projects" />
                <Button icon={Plus} size="sm" onClick={() => navigate('/cad-management/files/new')}>Register File</Button>
              </>
            }
            count={mainTable.pageInfo}
          />

          <section className="table-card">
            <DataTable
              columns={[
                { key: 'projectNumber', label: 'Project Number', width: 132, sortable: true, render: (group) => (group.isUnassigned ? <span className="cell-muted">{group.projectNumber}</span> : <button type="button" className="link-button cell-id" onClick={(event) => { event.stopPropagation(); navigate(`/cad-management/project/${group.key}`); }}>{group.projectId}</button>) },
                { key: 'name', label: 'Project Name', width: 220, sortable: true, render: (group) => <span className="cell-strong cad-clip">{group.name}</span> },
                { key: 'customer', label: 'Customer', width: 170, render: (group) => <span className="cell-muted cad-clip">{group.customer || 'Not recorded'}</span> },
                { key: 'fileCount', label: 'Total CAD Files', width: 112, align: 'center', sortable: true, render: (group) => <span className="cell-strong">{group.fileCount}</span> },
                { key: 'categories', label: 'File Categories / Types', width: 240, render: (group) => <span className="cell-muted cad-clip">{group.categories.join(', ')}</span> },
                { key: 'lastUpdated', label: 'Last Updated', width: 110, sortable: true, render: (group) => group.lastUpdated || '—' },
                { key: 'projectStatus', label: 'Status', width: 140, render: (group) => <StatusBadge status={group.projectStatus} tone={projectStatusTone(group.projectStatus)} /> },
              ]}
              rows={mainTable.pageRows}
              className="mech-register-table cad-register-table"
              sortKey={mainTable.sortKey}
              sortDirection={mainTable.sortDirection}
              onSort={mainTable.toggleSort}
              onRowClick={(group) => navigate(`/cad-management/project/${group.key}`)}
              recordHref={(group) => `/cad-management/project/${group.key}`}
              rowActions={(group) => [
                { key: 'open', label: group.isUnassigned ? 'Open unassigned files' : 'Open project CAD files', icon: FolderOpen },
                ...(group.isUnassigned ? [] : [{ key: 'register', label: 'Register CAD file for this project', icon: Plus }]),
              ]}
              onRowAction={(key, group) => {
                if (key === 'open') navigate(`/cad-management/project/${group.key}`);
                if (key === 'register') navigate(`/cad-management/files/new?project=${group.projectId}`);
              }}
              ariaLabel="CAD projects register"
              emptyContent={<EmptyState icon={FolderTree} title="No projects" message="No project matches the current search and filters." />}
            />
            <Pagination
              page={mainTable.page}
              totalPages={Math.max(1, Math.ceil(mainTable.sorted.length / mainTable.pageSize))}
              pageSize={mainTable.pageSize}
              pageInfo={mainTable.pageInfo}
              onPageChange={mainTable.setPage}
              onPageSizeChange={(size) => { mainTable.setPageSize(size); mainTable.setPage(1); }}
              pageSizeOptions={[5, 10, 25]}
            />
          </section>
          <p className="mech-footnote">
            Each row is one project linked through the CAD record's stored project relationship. Files without a project are kept
            together under Unassigned CAD Files. Open a project to see its individual CAD records, previews and downloads.
          </p>
        </>
      )}

      {section === 'register' && isProjectView && (
        <>
          {!activeGroup ? (
            <EmptyState
              icon={FolderTree}
              title="Project not found"
              message={`No CAD files or project record were found for ${routeProjectId}.`}
              action={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/cad-management/repository')}>Back to Projects</Button>}
            />
          ) : (
            <>
              <section className="card cad-project-head">
                <div className="cad-project-head-main">
                  <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/cad-management/repository')}>Back to Projects</Button>
                  <h2 className="cad-project-title">
                    {activeGroup.isUnassigned ? 'Unassigned CAD Files' : `Project: ${activeGroup.projectId} – ${activeGroup.name}`}
                  </h2>
                  <p className="cad-project-meta">
                    {activeGroup.isUnassigned ? 'CAD files without a project mapping' : `${activeGroup.name} · ${activeGroup.customer || 'Customer not recorded'}`}
                    <span className="cad-count-badge">{activeGroup.fileCount} CAD file{activeGroup.fileCount === 1 ? '' : 's'}</span>
                  </p>
                </div>
                <div className="cad-project-head-actions">
                  <StatusBadge status={activeGroup.projectStatus} tone={projectStatusTone(activeGroup.projectStatus)} />
                  {!activeGroup.isUnassigned && (
                    <Button icon={Plus} onClick={() => navigate(`/cad-management/files/new?project=${activeGroup.projectId}`)}>Register File</Button>
                  )}
                </div>
              </section>

              <KpiGrid>
                <StatCard icon={FolderOpen} label="CAD Files in Project" value={String(activeGroup.fileCount)} sub="Only files linked to this project" tone="teal" />
                <StatCard icon={Eye} label="Preview Available" value={String(activeGroup.previewCount)} sub="Verified browser rendering" tone="emerald" />
                <StatCard icon={EyeOff} label="Preview Unavailable" value={String(activeGroup.fileCount - activeGroup.previewCount)} sub="Stored and downloadable only" tone="orange" />
                <StatCard icon={Tags} label="File Categories" value={String(activeGroup.categories.length)} sub="Categories used in this project" tone="blue" />
              </KpiGrid>

              <Toolbar
                left={
                  <>
                    <Button variant="ghost" icon={RefreshCw} onClick={projectTable.reset}>Refresh</Button>
                    <Button variant="secondary" size="sm" icon={Filter} onClick={() => projectTable.setFiltersOpen((open) => !open)}>
                      {projectTable.filtersOpen ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                  </>
                }
                right={
                  <>
                    <SearchInput id="cad-project-file-search" value={projectTable.search} onChange={projectTable.setSearch} placeholder="Search files in this project…" ariaLabel="Search files in this project" />
                    <Button variant="secondary" size="sm" icon={Download} onClick={() => { exportCsv(`cad-project-${activeGroup.key}`, CSV_COLUMNS, projectTable.sorted); showToast('CSV export prepared.'); }}>Export</Button>
                  </>
                }
                count={projectTable.pageInfo}
              />
              <CadFilters table={projectTable} projects={[]} statuses={CAD_STATUSES} types={CAD_CATEGORIES} typeLabel="File Category" />

              <section className="table-card">
                <DataTable
                  columns={[
                    { key: 'id', label: 'CAD Number / File ID', width: 112, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
                    { key: 'fileName', label: 'File Name', width: 230, sortable: true, render: (row) => <span className="cad-file-name"><FileTypeBadge extension={row.fileType} /><span className="cell-strong"><span className="cad-clip">{row.fileName}</span>{row.local && <span className="cad-chip">session</span>}</span></span> },
                    { key: 'category', label: 'Category', width: 132, sortable: true },
                    { key: 'partNumber', label: 'Part', width: 132, render: (row) => <span className="cell-project"><span>{row.partNumber}</span><span className="cell-muted cad-clip">{row.partName}</span></span> },
                    { key: 'assemblyName', label: 'Assembly', width: 118, render: (row) => <span className="cell-muted cad-clip">{row.assemblyName}</span> },
                    { key: 'designName', label: 'Design', width: 130, render: (row) => <span className="cell-muted cad-clip">{row.designName}</span> },
                    { key: 'sourceApplication', label: 'Source', width: 118, render: (row) => <span className="cell-muted cad-clip">{row.sourceApplication}</span> },
                    { key: 'units', label: 'Units / Scale', width: 82, render: (row) => `${row.units} · ${row.scale}` },
                    { key: 'revision', label: 'Rev', width: 48, align: 'center', sortable: true },
                    { key: 'size', label: 'Size', width: 66, align: 'right', render: (row) => formatBytes(row.size) },
                    { key: 'uploadedBy', label: 'Uploaded By', width: 96, sortable: true },
                    { key: 'uploadedAt', label: 'Uploaded', width: 88, sortable: true },
                    { key: 'status', label: 'Preview Status', width: 118, render: (row) => <StatusBadge status={row.status} tone={cadStatusTone(row.status)} /> },
                  ]}
                  rows={projectTable.pageRows}
                  className="mech-register-table cad-register-table"
                  sortKey={projectTable.sortKey}
                  sortDirection={projectTable.sortDirection}
                  onSort={projectTable.toggleSort}
                  onRowClick={(row) => navigate(`/cad-management/repository/${row.id}`)}
                  recordHref={(row) => `/cad-management/repository/${row.id}`}
                  rowActions={(row) => [
                    { key: 'view', label: 'View details', icon: Eye },
                    ...(canPreview(row) ? [{ key: 'viewer', label: 'Open in CAD Viewer', icon: Layers }] : []),
                    { key: 'openCad', label: 'Open in CAD Software', icon: MonitorDown },
                    { key: 'download', label: 'Download file', icon: Download },
                    { key: 'edit', label: 'Edit metadata', icon: Pencil },
                    { key: 'version', label: 'Upload controlled new version', icon: Upload },
                    { key: 'delete', label: 'Delete record', icon: Trash2, danger: true, divider: true },
                  ]}
                  onRowAction={(key, row) => {
                    if (key === 'view') navigate(`/cad-management/repository/${row.id}`);
                    if (key === 'viewer') openViewer(row);
                    if (key === 'openCad') setOpenCadTarget(row);
                    if (key === 'download') download(row);
                    if (key === 'edit') setEditTarget({ ...row });
                    if (key === 'version') {
                      setVersionTarget(row);
                      setVersionFile(null);
                      setVersionRevision(nextRevision(row.revision));
                      setVersionNote('');
                    }
                    if (key === 'delete') setDeleteTarget(row);
                  }}
                  ariaLabel="Project CAD file register"
                  emptyContent={<EmptyState icon={FolderOpen} title="No CAD files" message="No files in this project match the current search and filters." />}
                />
                <Pagination
                  page={projectTable.page}
                  totalPages={Math.max(1, Math.ceil(projectTable.sorted.length / projectTable.pageSize))}
                  pageSize={projectTable.pageSize}
                  pageInfo={projectTable.pageInfo}
                  onPageChange={projectTable.setPage}
                  onPageSizeChange={(size) => { projectTable.setPageSize(size); projectTable.setPage(1); }}
                  pageSizeOptions={[5, 10, 25]}
                />
              </section>
              <p className="mech-footnote">
                This list is filtered by the stored project relationship, so no file from another project appears here. Browse back
                to Projects for the complete grouped register. Browser-selected bytes live in memory and are cleared on refresh.
              </p>
            </>
          )}
        </>
      )}

      {section === 'categories' && (
        <>
          <KpiGrid>
            <StatCard icon={Layers} label="3D Model Files" value={String(files.filter((row) => /3D|Assembly Model|Part Model/.test(row.category)).length)} sub="Assembly, part and reference models" tone="teal" />
            <StatCard icon={FileText} label="2D Drawing Files" value={String(files.filter((row) => row.category === '2D CAD Drawing').length)} sub="Vector, PDF and CAD drawing sources" tone="emerald" />
            <StatCard icon={FolderOpen} label="Reference & Documents" value={String(files.filter((row) => ['Reference Model', 'Technical Document', 'Supporting Attachment'].includes(row.category)).length)} sub="Reference models and technical packs" tone="blue" />
            <StatCard icon={Tags} label="Categories Used" value={String(new Set(files.map((row) => row.category)).size)} sub={`${CAD_CATEGORIES.length} supported categories`} tone="orange" />
          </KpiGrid>

          <div className="cad-category-grid">
            {CAD_CATEGORIES.map((category) => {
              const items = files.filter((row) => row.category === category);
              return (
                <section key={category} className="card cad-category-card">
                  <div className="cad-card-head">
                    <div>
                      <h3>{category}</h3>
                      <p>{categoryCount(category)} registered file{categoryCount(category) === 1 ? '' : 's'}</p>
                    </div>
                    <span className="cad-count-badge">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="cell-muted">No files in this category yet.</p>
                  ) : (
                    <ul className="cad-category-list">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button type="button" className="link-button" onClick={() => setViewTarget(item)}>
                            <FileTypeBadge extension={item.fileType} /> {item.fileName}
                          </button>
                          <span className="cell-muted">{item.id} · Rev {item.revision}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button variant="ghost" size="sm" icon={Plus} onClick={() => navigate('/cad-management/files/new')}>Register in this category</Button>
                </section>
              );
            })}
          </div>
          <p className="mech-footnote">Category is engineering metadata; it does not change what the browser can render. Preview availability is derived from the actual file extension.</p>
        </>
      )}

      {section === 'mapping' && (
        <>
          <KpiGrid>
            <StatCard icon={FolderTree} label="Projects Mapped" value={String(new Set(files.map((row) => row.projectId)).size)} sub="Projects with CAD files" tone="teal" />
            <StatCard icon={Layers} label="Assemblies Mapped" value={String(new Set(files.map((row) => row.assemblyId).filter(Boolean)).size)} sub="Parent assemblies referenced" tone="blue" />
            <StatCard icon={FolderOpen} label="Mapped Files" value={String(files.length)} sub="Files with project/part context" tone="emerald" />
            <StatCard icon={FileText} label="Drawing Links" value={String(drawings.reduce((total, row) => total + (row.cadFileIds?.length || 0), 0))} sub="Drawing-to-CAD references" tone="orange" />
          </KpiGrid>

          <section className="card cad-map-card">
            <div className="cad-card-head cad-card-head-pad">
              <div>
                <h3>Project → assembly → CAD file</h3>
                <p>Mock engineering hierarchy shared with Drawing Management and Revision &amp; Release.</p>
              </div>
            </div>
            {mappingGroups.map((group) => (
              <details key={`${group.projectId}-${group.assemblyId}`} className="cad-map-group" open={group === mappingGroups[0]}>
                <summary>
                  <span className="cell-id">{group.projectId}</span>
                  <strong>{projectName(projects, group.projectId)}</strong>
                  <span className="cell-muted">{group.assemblyId ? assemblyLabel(assemblies, group.assemblyId) : 'No assembly linked'}</span>
                  <span className="cad-count-badge">{group.files.length}</span>
                </summary>
                <div className="cad-map-body">
                  {group.files.map((file) => (
                    <div key={file.id} className="cad-map-row">
                      <div>
                        <span className="cell-id">{file.id}</span>
                        <span className="cad-map-name"><FileTypeBadge extension={file.fileType} /> {file.fileName}</span>
                        <span className="cell-muted">{file.partNumber} · {file.partName} · Rev {file.revision}</span>
                      </div>
                      <div className="cad-map-links">
                        {drawings.filter((drawing) => drawing.cadFileIds?.includes(file.id)).map((drawing) => (
                          <button key={drawing.id} type="button" className="link-button" onClick={() => navigate(`/cad-management/viewer?drawing=${drawing.id}`)}>
                            {drawing.drawingNumber}
                          </button>
                        ))}
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setViewTarget(file)}>Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </section>
        </>
      )}

      {section === 'capability' && (
        <>
          <KpiGrid>
            <StatCard icon={Eye} label="Direct / Converted" value={String(counts.capability)} sub="Format entries with a renderer" tone="emerald" />
            <StatCard icon={EyeOff} label="External Conversion" value={String(capabilityRows().flatMap((group) => group.rows).filter((row) => row.status === 'external').length)} sub="Original retained; preview unavailable" tone="orange" />
            <StatCard icon={Tags} label="Verified Samples" value={String(capabilityRows().flatMap((group) => group.rows).filter((row) => row.tested).length)} sub="Actual sample loaded in this build" tone="blue" />
            <StatCard icon={FileText} label="Format Entries" value={String(capabilityRows().flatMap((group) => group.rows).length)} sub="Neutral, native and 2D formats" tone="teal" />
          </KpiGrid>
          <p className="mech-footnote">
            Direct Rendering means a real browser parser/loader is bundled. Converted Rendering is used only when a converted
            preview is attached. Native CAD formats are not claimed to render here; they require external conversion and retain
            the original file. A format is marked sample-verified only after an actual sample was opened in the CAD Viewer.
          </p>
          {capabilityRows().map((group) => (
            <section key={group.key} className="table-card" style={{ marginBottom: '14px' }}>
              <div className="cad-card-head cad-card-head-pad">
                <div><h3>{group.title}</h3><p>{group.rows.length} format records</p></div>
              </div>
              <ManageColumns {...formatColumns.managerProps} />
              <div className="table-wrap">
                <table className="data-table table-pin-left">
                  <thead>
                    <tr>
                      {formatColumns.isVisible('format') && <th>Format</th>}
                      {formatColumns.isVisible('classification') && <th>Classification</th>}
                      {formatColumns.isVisible('verified') && <th>Sample Verified</th>}
                      {formatColumns.isVisible('renderer') && <th>Renderer / Conversion</th>}
                      {formatColumns.isVisible('behaviour') && <th>Browser Behaviour</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={`${group.key}-${row.ext}`}>
                        {formatColumns.isVisible('format') && <td className="cell-strong">{row.ext}</td>}
                        {formatColumns.isVisible('classification') && <td><StatusBadge status={CAPABILITY_STATUS[row.status]?.label || row.status} tone={CAPABILITY_STATUS[row.status]?.tone === 'amber' ? 'orange' : CAPABILITY_STATUS[row.status]?.tone || 'gray'} /></td>}
                        {formatColumns.isVisible('verified') && <td>{row.tested ? 'Yes — loaded sample' : row.supported ? 'No sample in this build' : 'Not applicable'}</td>}
                        {formatColumns.isVisible('renderer') && <td className="cell-muted">{row.renderer || 'External converter required'}</td>}
                        {formatColumns.isVisible('behaviour') && <td className="cell-muted">{row.reason}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}

      <Modal
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title="CAD File Details"
        subtitle={viewTarget?.fileName}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setViewTarget(null)}>Close</Button>
            {viewTarget && <Button variant="secondary" icon={MonitorDown} onClick={() => { const target = viewTarget; setViewTarget(null); setOpenCadTarget(target); }}>Open in CAD Software</Button>}
            {viewTarget && canPreview(viewTarget) && <Button variant="secondary" icon={Layers} onClick={() => { const target = viewTarget; setViewTarget(null); openViewer(target); }}>Open in Viewer</Button>}
            {viewTarget && <Button icon={Download} onClick={() => download(viewTarget)}>Download</Button>}
          </>
        }
      >
        {viewTarget && (
          <>
            <div className="fact-grid">
              <Fact label="File ID">{viewTarget.id}</Fact>
              <Fact label="File Name">{viewTarget.fileName}</Fact>
              <Fact label="File Type">{viewTarget.fileType}</Fact>
              <Fact label="Original Extension">.{viewTarget.originalExtension || extensionOf(viewTarget.fileName)}</Fact>
              <Fact label="Category">{viewTarget.category}</Fact>
              <Fact label="File Size">{formatBytes(viewTarget.size)}</Fact>
              <Fact label="Revision">Rev {viewTarget.revision} · v{viewTarget.versionNumber || 1}</Fact>
              <Fact label="Source Application">{viewTarget.sourceApplication || 'Not recorded'}</Fact>
              <Fact label="Units / Scale">{`${viewTarget.units || 'mm'} · ${viewTarget.scale || '1:1'}`}</Fact>
              <Fact label="Coordinate Reference">{viewTarget.coordinateReference || 'Not recorded'}</Fact>
              <Fact label="Design">{viewTarget.designId ? `${viewTarget.designId} · Rev ${viewTarget.designRevision || '—'}` : 'Not linked'}</Fact>
              <Fact label="Conversion">{viewTarget.conversionStatus || 'Not recorded'}</Fact>
              <Fact label="Preview / Conversion Format">{viewTarget.conversionFormat || 'None'}</Fact>
              <Fact label="Uploaded By">{viewTarget.uploadedBy}</Fact>
              <Fact label="Uploaded Date">{viewTarget.uploadedAt}</Fact>
              <Fact label="Project">{viewTarget.projectId} · {projectName(projects, viewTarget.projectId)}</Fact>
              <Fact label="Part">{viewTarget.partNumber} · {viewTarget.partName}</Fact>
              <Fact label="Parent Assembly">{viewTarget.assemblyId ? assemblyLabel(assemblies, viewTarget.assemblyId) : 'Not linked'}</Fact>
              <Fact label="Status"><StatusBadge status={viewTarget.status} tone={cadStatusTone(viewTarget.status)} /></Fact>
              <Fact label="Previous Version">{viewTarget.previousFileId || 'Initial version'}</Fact>
              <Fact label="Superseded By">{viewTarget.supersededBy || 'Current version'}</Fact>
              <Fact label="BOM Reference">{viewTarget.bomRef || 'Not linked'}</Fact>
              <Fact label="Manufacturing Reference">{viewTarget.manufacturingRef || 'Not linked'}</Fact>
              <Fact label="Simulation Reference">{viewTarget.simulationRef || 'Not linked'}</Fact>
              <Fact label="Change Reference">{viewTarget.changeRef || 'Not linked'}</Fact>
            </div>
            <div className="cad-detail-section">
              <h4>Description</h4>
              <p>{viewTarget.description || 'No description recorded.'}</p>
            </div>
            <div className="cad-detail-section">
              <h4>Preview capability</h4>
              <p className={canPreview(viewTarget) ? 'cad-preview-ok' : 'cad-preview-no'}>
                {canPreview(viewTarget) ? `Available — ${previewCapability(viewTarget.fileName).label}` : `Unavailable — ${previewCapability(viewTarget.fileName).reason}`}
              </p>
              <p className="cad-note">{viewTarget.previewNote || 'No conversion is attached. The original file is retained.'}</p>
            </div>
            <div className="cad-detail-section">
              <h4>Project / part mapping</h4>
              <ul className="cad-detail-links">
                <li><span>Project</span><button type="button" className="link-button" onClick={() => navigate('/projects')}>{viewTarget.projectId} · {projectName(projects, viewTarget.projectId)}</button></li>
                <li><span>Part</span><span>{viewTarget.partNumber} · {viewTarget.partName}</span></li>
                <li><span>Assembly</span><span>{viewTarget.assemblyId ? assemblyLabel(assemblies, viewTarget.assemblyId) : 'Not linked'}</span></li>
                {drawings.filter((drawing) => drawing.cadFileIds?.includes(viewTarget.id)).map((drawing) => (
                  <li key={drawing.id}><span>Drawing</span><button type="button" className="link-button" onClick={() => { setViewTarget(null); navigate(`/cad-management/viewer?drawing=${drawing.id}`); }}>{drawing.drawingNumber} · Rev {drawing.revision}</button></li>
                ))}
              </ul>
            </div>
            <div className="cad-detail-section">
              <h4>Upload history</h4>
              <ul className="cad-history">
                {(viewTarget.uploadHistory || []).map((entry) => (
                  <li key={entry.id}>
                    <span className="cad-history-dot" aria-hidden="true" />
                    <div><strong>{entry.action}</strong><span>{entry.at} · {entry.by}</span><p>{entry.description}</p></div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="cad-note">{localFiles[viewTarget.id] ? 'This record has browser-memory file bytes for this session.' : 'No file bytes are held in memory for this record; only metadata and any bundled sample asset are available.'}</p>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit File Metadata"
        subtitle={editTarget?.id}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={() => {
              updateFile(editTarget.id, {
                category: editTarget.category,
                revision: editTarget.revision,
                description: editTarget.description,
                status: editTarget.status,
                projectId: editTarget.projectId,
                designId: editTarget.designId,
                designRevision: editTarget.designRevision,
                assemblyId: editTarget.assemblyId,
                sourceApplication: editTarget.sourceApplication,
                units: editTarget.units,
                scale: editTarget.scale,
                coordinateReference: editTarget.coordinateReference,
              });
              showToast(`${editTarget.id} metadata updated.`);
              setEditTarget(null);
            }}>Save Changes</Button>
          </>
        }
      >
        {editTarget && (
          <div className="form-grid">
            <Input label="File Name" id="edit-file-name" value={editTarget.fileName} disabled hint="The original filename is immutable in this mock." />
            <Select label="File Category" id="edit-file-category" options={CAD_CATEGORIES.map((value) => ({ value, label: value }))} value={editTarget.category} onChange={(event) => setEditTarget((previous) => ({ ...previous, category: event.target.value }))} />
            <Input label="Revision" id="edit-file-revision" value={editTarget.revision} maxLength={3} onChange={(event) => setEditTarget((previous) => ({ ...previous, revision: event.target.value.toUpperCase() }))} />
            <Select label="File Status" id="edit-file-status" options={CAD_STATUSES.map((value) => ({ value, label: value }))} value={editTarget.status} onChange={(event) => setEditTarget((previous) => ({ ...previous, status: event.target.value }))} />
            <Select label="Project" id="edit-file-project" options={[{ value: '', label: 'No project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]} value={editTarget.projectId} onChange={(event) => setEditTarget((previous) => ({ ...previous, projectId: event.target.value }))} />
            <Select label="Mechanical Design" id="edit-file-design" options={[{ value: '', label: 'No design reference' }, ...designs.map((design) => ({ value: design.id, label: `${design.id} · ${design.name}` }))]} value={editTarget.designId} onChange={(event) => setEditTarget((previous) => ({ ...previous, designId: event.target.value, designRevision: designs.find((design) => design.id === event.target.value)?.revision || previous.designRevision }))} />
            <Input label="Design Revision" id="edit-file-design-revision" value={editTarget.designRevision || ''} maxLength={3} onChange={(event) => setEditTarget((previous) => ({ ...previous, designRevision: event.target.value.toUpperCase() }))} />
            <Select label="Parent Assembly" id="edit-file-assembly" options={[{ value: '', label: 'No assembly' }, ...assemblies.filter((assembly) => !editTarget.projectId || assembly.projectId === editTarget.projectId).map((assembly) => ({ value: assembly.id, label: `${assembly.number} · ${assembly.name}` }))]} value={editTarget.assemblyId || ''} onChange={(event) => setEditTarget((previous) => ({ ...previous, assemblyId: event.target.value }))} />
            <Select label="Source CAD Application" id="edit-file-source" options={SOURCE_APPLICATIONS.map((value) => ({ value, label: value }))} value={editTarget.sourceApplication} onChange={(event) => setEditTarget((previous) => ({ ...previous, sourceApplication: event.target.value }))} />
            <Select label="Units" id="edit-file-units" options={CAD_UNITS.map((value) => ({ value, label: value }))} value={editTarget.units} onChange={(event) => setEditTarget((previous) => ({ ...previous, units: event.target.value }))} />
            <Input label="Scale" id="edit-file-scale" value={editTarget.scale || ''} placeholder="e.g. 1:1" onChange={(event) => setEditTarget((previous) => ({ ...previous, scale: event.target.value }))} />
            <Select label="Coordinate Reference" id="edit-file-coordinate" options={COORDINATE_REFERENCES.map((value) => ({ value, label: value }))} value={editTarget.coordinateReference} onChange={(event) => setEditTarget((previous) => ({ ...previous, coordinateReference: event.target.value }))} />
            <Textarea label="Description" id="edit-file-description" rows={3} value={editTarget.description} onChange={(event) => setEditTarget((previous) => ({ ...previous, description: event.target.value }))} className="span-2" />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(versionTarget)}
        onClose={() => setVersionTarget(null)}
        title="Upload Controlled New Version"
        subtitle={versionTarget ? `${versionTarget.id} · ${versionTarget.fileName} · current Rev ${versionTarget.revision}` : ''}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVersionTarget(null)}>Cancel</Button>
            <Button
              icon={Upload}
              onClick={() => {
                if (!versionFile) { showToast('Select the new file before creating a version.', 'error'); return; }
                if (!versionRevision.trim()) { showToast('Enter the new revision identifier.', 'error'); return; }
                const ext = extensionOf(versionFile.name);
                if (!ALLOWED.has(ext)) { showToast(`${ext.toUpperCase()} is not an accepted file format.`, 'error'); return; }
                if (versionFile.size > MAX_BYTES) { showToast(`This file exceeds the ${formatBytes(MAX_BYTES)} browser session limit.`, 'error'); return; }
                const capability = previewCapability(versionFile.name);
                const conversion = conversionSummary(versionFile.name);
                const result = createFileVersion(versionTarget.id, {
                  fileName: versionFile.name,
                  fileType: ext.toUpperCase(),
                  originalExtension: ext,
                  conversionStatus: conversion.status,
                  conversionFormat: conversion.format,
                  previewNote: conversion.note,
                  size: versionFile.size,
                  revision: versionRevision.toUpperCase(),
                  status: capability.supported ? 'Preview Available' : 'Preview Unavailable',
                  description: versionNote || versionTarget.description,
                  remarks: versionNote ? `New version: ${versionNote}` : versionTarget.remarks,
                  uploadedBy: 'R. Kulkarni',
                  assetPath: '',
                  sessionFile: true,
                  category: versionTarget.category,
                  projectId: versionTarget.projectId,
                  partNumber: versionTarget.partNumber,
                  partName: versionTarget.partName,
                  assemblyId: versionTarget.assemblyId,
                }, versionFile, 'R. Kulkarni');
                if (result.error) { showToast(result.error, 'error'); return; }
                showToast(`${versionTarget.id} retained; ${result.id} Rev ${result.revision} created.`);
                setVersionTarget(null);
              }}
            >
              Create Version
            </Button>
          </>
        }
      >
        {versionTarget && (
          <div className="form-grid">
            <div className="form-grid-full">
              <p className="cad-note">The original file and metadata are retained unchanged. This creates a separate repository record and marks the current record as Archived / superseded.</p>
            </div>
            <div className="form-grid-full">
              <label className="form-label" htmlFor="new-version-file">New File</label>
              <input id="new-version-file" ref={versionRef} type="file" accept={ACCEPTED} className="form-input" onChange={(event) => setVersionFile(event.target.files?.[0] || null)} />
              {versionFile && <span className="form-hint">{versionFile.name} · {formatBytes(versionFile.size)} · {extensionOf(versionFile.name).toUpperCase()}</span>}
            </div>
            <Input label="New Revision" id="new-version-revision" value={versionRevision} maxLength={3} onChange={(event) => setVersionRevision(event.target.value.toUpperCase())} />
            <div className="form-field"><span className="form-label">Previous Revision</span><span className="form-static">Rev {versionTarget.revision}</span></div>
            <div className="form-grid-full">
              <label className="form-label" htmlFor="new-version-note">Version Notes</label>
              <textarea id="new-version-note" className="form-input" rows={3} value={versionNote} placeholder="What changed in this file version" onChange={(event) => setVersionNote(event.target.value)} />
            </div>
            <div className="form-field"><span className="form-label">Preview</span><span className="form-static">{versionFile ? previewCapability(versionFile.name).label : 'Select a file'}</span></div>
            <div className="form-field"><span className="form-label">Next File ID</span><span className="form-static">{nextFileId()}</span></div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete CAD File Record"
        subtitle={deleteTarget?.id}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button icon={Trash2} onClick={() => { removeFile(deleteTarget.id); showToast(`${deleteTarget.id} removed from the local register.`); setDeleteTarget(null); }}>Delete Record</Button>
          </>
        }
      >
        <p className="dash-modal-note">
          This removes the mock metadata record and any browser-memory file bytes. The bundled demonstration file is not deleted.
          Released drawings that reference this file keep their own revision history.
        </p>
      </Modal>

      <OpenInCadDialog
        open={Boolean(openCadTarget)}
        onClose={() => setOpenCadTarget(null)}
        fileName={openCadTarget?.fileName}
        assetPath={openCadTarget?.assetPath}
        localEntry={openCadTarget ? localFiles[openCadTarget.id] : null}
        recordRef={openCadTarget?.id}
        sourceModule="Drawing & CAD Management → CAD File Repository"
        sourceRef={openCadTarget?.id}
        context={
          openCadTarget
            ? [
                { label: 'Project ID', value: openCadTarget.projectId },
                { label: 'Part', value: `${openCadTarget.partNumber || ''} · ${openCadTarget.partName || ''}` },
                { label: 'Revision', value: openCadTarget.revision ? `Rev ${openCadTarget.revision}` : '' },
              ]
            : []
        }
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
