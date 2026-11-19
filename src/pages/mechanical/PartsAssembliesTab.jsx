import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Archive,
  Boxes,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Filter,
  History,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  SegmentedTabs,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import {
  DESIGN_DOMAIN_FILTERS,
  assemblyParts,
  assemblyTreePartCount,
  buildMechanicalKpis,
  childAssemblies,
  projectName,
  statusTone,
} from '../../data/mechanicalData';
import exportCsv from '../../utils/exportCsv';
import { Fact, RevisionHistoryModal, Toast, useToast } from './mechanicalUi';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const PART_FILTERS = { projectId: 'All', domain: 'All', status: 'All', owner: 'All' };

const ASSEMBLY_FILTERS = { projectId: 'All', domain: 'All', status: 'All' };

function formatWeight(weight) {
  if (!weight) return '—';
  return `${weight} kg`;
}

/* ==========================================================================
   Parts & Assemblies — one shared register for every discipline.
   ========================================================================== */
export default function PartsAssembliesTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    parts,
    assemblies,
    archivePart,
    duplicatePart,
    archiveAssembly,
    duplicateAssembly,
    setPartQuantity,
    assignPartToAssembly,
  } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [section, setSection] = useState(() =>
    searchParams.get('view') === 'structure' ? 'structure' : 'parts',
  );
  const [search, setSearch] = useState('');
  const [partFilters, setPartFilters] = useState(PART_FILTERS);
  const [assemblyFilters, setAssemblyFilters] = useState(ASSEMBLY_FILTERS);
  const [partPage, setPartPage] = useState(1);
  const [assemblyPage, setAssemblyPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [partView, setPartView] = useState(null);
  const [assemblyView, setAssemblyView] = useState(null);
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [componentTarget, setComponentTarget] = useState(null);
  const [addPartTarget, setAddPartTarget] = useState(null);
  const [addForm, setAddForm] = useState({ partId: '', quantity: '1' });
  const [expanded, setExpanded] = useState(() => new Set(assemblies.map((row) => row.id)));
  const [structureFilter, setStructureFilter] = useState('All');

  const kpis = useMemo(() => {
    const summary = buildMechanicalKpis({ designs: [], parts, assemblies, calculations: [] }).parts;
    return [
      { key: 'parts', label: 'Total Parts', value: String(summary.total), sub: 'Across every discipline', icon: Package, tone: 'teal' },
      { key: 'assemblies', label: 'Total Assemblies', value: String(summary.assemblies), sub: 'Including subassemblies', icon: Layers, tone: 'blue' },
      { key: 'active', label: 'Active Components', value: String(summary.active), sub: 'Draft, in design or under review', icon: Boxes, tone: 'purple' },
      { key: 'review', label: 'Parts Pending Review', value: String(summary.pendingReview), sub: 'Awaiting technical review', icon: Eye, tone: 'orange' },
    ];
  }, [parts, assemblies]);

  const partRows = useMemo(
    () =>
      parts.map((part) => ({
        ...part,
        projectName: projectName(projects, part.projectId),
        parentLabel:
          assemblies.find((assembly) => assembly.id === part.parentAssemblyId)?.number || '—',
      })),
    [parts, projects, assemblies],
  );

  const assemblyRows = useMemo(
    () =>
      assemblies.map((assembly) => ({
        ...assembly,
        projectName: projectName(projects, assembly.projectId),
        parentLabel:
          assemblies.find((row) => row.id === assembly.parentAssemblyId)?.number || '—',
        componentCount: assemblyTreePartCount(assemblies, parts, assembly.id),
      })),
    [assemblies, parts, projects],
  );

  const visibleParts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return partRows.filter((row) => {
      if (partFilters.projectId !== 'All' && row.projectId !== partFilters.projectId) return false;
      if (partFilters.domain !== 'All' && row.domain !== partFilters.domain) return false;
      if (partFilters.status !== 'All' && row.status !== partFilters.status) return false;
      if (partFilters.owner !== 'All' && row.owner !== partFilters.owner) return false;
      if (!query) return true;
      return [row.partNumber, row.name, row.projectName, row.material, row.parentLabel, row.owner]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [partRows, partFilters, search]);

  const visibleAssemblies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assemblyRows.filter((row) => {
      if (assemblyFilters.projectId !== 'All' && row.projectId !== assemblyFilters.projectId)
        return false;
      if (assemblyFilters.domain !== 'All' && row.domain !== assemblyFilters.domain) return false;
      if (assemblyFilters.status !== 'All' && row.status !== assemblyFilters.status) return false;
      if (!query) return true;
      return [row.number, row.name, row.projectName, row.owner, row.parentLabel]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [assemblyRows, assemblyFilters, search]);

  const pageSlice = (list, page) => {
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    return {
      rows: list.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      currentPage,
      totalPages,
      info: `Showing ${list.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
        currentPage * pageSize,
        list.length,
      )} of ${list.length}`,
    };
  };

  const partPaging = pageSlice(visibleParts, partPage);
  const assemblyPaging = pageSlice(visibleAssemblies, assemblyPage);

  const partColumns = [
    { key: 'partNumber', label: 'Part Number', width: 88, sortable: true, render: (row) => <span className="cell-id">{row.partNumber}</span> },
    { key: 'name', label: 'Part Name', width: 132, render: (row) => <span className="cell-strong cell-clamp" title={row.name}>{row.name}</span> },
    {
      key: 'projectName',
      label: 'Project',
      width: 102,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    { key: 'domain', label: 'Domain', width: 92, render: (row) => <span className="chip chip-mint">{row.domain}</span> },
    { key: 'material', label: 'Material', width: 86, render: (row) => <span className="cell-muted cell-clamp" title={row.material}>{row.material}</span> },
    { key: 'parentLabel', label: 'Parent Assembly', width: 124, render: (row) => <span className="cell-muted">{row.parentLabel}</span> },
    { key: 'dimensions', label: 'Dimensions', width: 116, render: (row) => <span className="cell-muted cell-clamp" title={row.dimensions}>{row.dimensions}</span> },
    { key: 'weight', label: 'Weight', width: 56, align: 'right', render: (row) => formatWeight(row.weight) },
    { key: 'quantity', label: 'Qty', width: 42, align: 'center' },
    { key: 'revision', label: 'Rev', width: 60, align: 'center', render: (row) => `Rev ${row.revision}` },
    { key: 'status', label: 'Status', width: 88, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
  ];

  const assemblyColumns = [
    { key: 'number', label: 'Assembly Number', width: 116, render: (row) => <span className="cell-id">{row.number}</span> },
    { key: 'name', label: 'Assembly Name', width: 164, render: (row) => <span className="cell-strong cell-clamp" title={row.name}>{row.name}</span> },
    {
      key: 'projectName',
      label: 'Project',
      width: 120,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    { key: 'domain', label: 'Domain', width: 104, render: (row) => <span className="chip chip-mint">{row.domain}</span> },
    { key: 'parentLabel', label: 'Parent Assembly', width: 112, render: (row) => <span className="cell-muted">{row.parentLabel}</span> },
    { key: 'componentCount', label: 'Components', width: 88, align: 'center' },
    { key: 'revision', label: 'Rev', width: 60, align: 'center', render: (row) => `Rev ${row.revision}` },
    { key: 'owner', label: 'Owner', width: 84 },
    { key: 'status', label: 'Status', width: 92, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
  ];

  const partCsv = [
    { key: 'partNumber', label: 'Part Number' },
    { key: 'name', label: 'Part Name' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectName', label: 'Project', value: (row) => projectName(projects, row.projectId) },
    { key: 'domain', label: 'Domain' },
    { key: 'category', label: 'Category' },
    { key: 'material', label: 'Material' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'revision', label: 'Revision' },
    { key: 'status', label: 'Status' },
  ];

  const assemblyCsv = [
    { key: 'number', label: 'Assembly Number' },
    { key: 'name', label: 'Assembly Name' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'domain', label: 'Domain' },
    { key: 'parentAssemblyId', label: 'Parent Assembly' },
    { key: 'revision', label: 'Revision' },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status' },
  ];

  const partParent = (part) =>
    assemblies.find((assembly) => assembly.id === part.parentAssemblyId) || null;

  const toggleExpanded = (id) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addPartToAssembly = () => {
    if (!addForm.partId || !addPartTarget) return;
    assignPartToAssembly(addForm.partId, addPartTarget.id, Number(addForm.quantity) || 1);
    const part = parts.find((row) => row.id === addForm.partId);
    showToast(`${part?.name || 'Part'} added to ${addPartTarget.number}.`);
    setAddPartTarget(null);
    setAddForm({ partId: '', quantity: '1' });
  };

  const removePartFromAssembly = (part, assembly) => {
    assignPartToAssembly(part.id, '');
    showToast(`${part.name} removed from ${assembly.number}.`);
  };

  const structureRoots = assemblies.filter(
    (assembly) => !assembly.parentAssemblyId || !assemblies.some((row) => row.id === assembly.parentAssemblyId),
  );

  const renderStructure = (assembly, depth = 0) => {
    const children = childAssemblies(assemblies, assembly.id);
    const ownParts = assemblyParts(parts, assembly.id);
    const isOpen = expanded.has(assembly.id);
    const total = assemblyTreePartCount(assemblies, parts, assembly.id);

    return (
      <li key={assembly.id} className="mech-tree-node">
        <div className="mech-tree-row" style={{ paddingLeft: `${depth * 18 + 8}px` }}>
          <button
            type="button"
            className="mech-tree-toggle"
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${assembly.name}`}
            aria-expanded={isOpen}
            onClick={() => toggleExpanded(assembly.id)}
          >
            {children.length > 0 || ownParts.length > 0 ? (
              isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />
            ) : (
              <span className="mech-tree-leaf" />
            )}
          </button>
          <span className="mech-tree-icon" aria-hidden="true">
            <Layers />
          </span>
          <span className="mech-tree-body">
            <span className="mech-tree-title">
              {assembly.number} · {assembly.name}
            </span>
            <span className="mech-tree-meta">
              {assembly.projectId} · {assembly.domain} · {total} component{total === 1 ? '' : 's'}
            </span>
          </span>
          <span className="chip mech-rev-chip">Rev {assembly.revision}</span>
          <StatusBadge status={assembly.status} tone={statusTone(assembly.status)} />
          <span className="mech-tree-actions">
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => {
                setAddPartTarget(assembly);
                setAddForm({ partId: '', quantity: '1' });
              }}
            >
              Add Part
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => setAssemblyView(assembly)}
            >
              Details
            </Button>
          </span>
        </div>

        {isOpen && (
          <ul className="mech-tree-children">
            {children.map((child) => renderStructure(child, depth + 1))}
            {ownParts.map((part) => (
              <li key={part.id} className="mech-tree-part">
                <div className="mech-tree-row" style={{ paddingLeft: `${(depth + 1) * 18 + 8}px` }}>
                  <span className="mech-tree-leaf" aria-hidden="true" />
                  <span className="mech-tree-icon is-part" aria-hidden="true">
                    <Package />
                  </span>
                  <span className="mech-tree-body">
                    <span className="mech-tree-title">
                      {part.partNumber} · {part.name}
                    </span>
                    <span className="mech-tree-meta">
                      {part.material} · {part.dimensions} · Rev {part.revision}
                    </span>
                  </span>
                  <label className="mech-qty">
                    <span>Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={part.quantity}
                      aria-label={`Quantity of ${part.name}`}
                      onChange={(event) => setPartQuantity(part.id, event.target.value)}
                    />
                  </label>
                  <StatusBadge status={part.status} tone={statusTone(part.status)} />
                  <span className="mech-tree-actions">
                    <button
                      type="button"
                      className="mech-icon-btn"
                      aria-label={`Remove ${part.name} from ${assembly.name}`}
                      onClick={() => removePartFromAssembly(part, assembly)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </li>
            ))}
            {children.length === 0 && ownParts.length === 0 && (
              <li className="mech-tree-empty" style={{ paddingLeft: `${(depth + 1) * 18 + 40}px` }}>
                No components yet — add a part or create a subassembly.
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  const filteredRoots =
    structureFilter === 'All'
      ? structureRoots
      : structureRoots.filter((root) => root.projectId === structureFilter);

  return (
    <>
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </KpiGrid>

      <SegmentedTabs
        items={[
          { key: 'parts', label: 'All Parts', count: parts.length },
          { key: 'assemblies', label: 'Assemblies', count: assemblies.length },
          { key: 'structure', label: 'Assembly Structure' },
        ]}
        activeKey={section}
        onChange={(key) => {
          setSection(key);
          setSearch('');
        }}
        ariaLabel="Parts and assemblies sections"
      />

      {section !== 'structure' && (
        <Toolbar
          left={
            <div className="toolbar-filters">
              <select
                className="dash-quick-filter"
                aria-label="Filter by project"
                value={section === 'parts' ? partFilters.projectId : assemblyFilters.projectId}
                onChange={(event) => {
                  const value = event.target.value;
                  if (section === 'parts') {
                    setPartFilters((previous) => ({ ...previous, projectId: value }));
                    setPartPage(1);
                  } else {
                    setAssemblyFilters((previous) => ({ ...previous, projectId: value }));
                    setAssemblyPage(1);
                  }
                }}
              >
                <option value="All">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.id} · {project.name}
                  </option>
                ))}
              </select>
              <select
                className="dash-quick-filter"
                aria-label="Filter by engineering domain"
                value={section === 'parts' ? partFilters.domain : assemblyFilters.domain}
                onChange={(event) => {
                  const value = event.target.value;
                  if (section === 'parts') setPartFilters((previous) => ({ ...previous, domain: value }));
                  else setAssemblyFilters((previous) => ({ ...previous, domain: value }));
                }}
              >
                {DESIGN_DOMAIN_FILTERS.map((domain) => (
                  <option key={domain.key} value={domain.key === 'all' ? 'All' : domain.label}>
                    {domain.key === 'all' ? 'All Domains' : domain.label}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                icon={RefreshCw}
                onClick={() => {
                  setSearch('');
                  if (section === 'parts') {
                    setPartFilters(PART_FILTERS);
                    setPartPage(1);
                  } else {
                    setAssemblyFilters(ASSEMBLY_FILTERS);
                    setAssemblyPage(1);
                  }
                }}
              >
                Refresh
              </Button>
            </div>
          }
          right={
            <>
              <SearchInput
                id={`mech-${section}-search`}
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPartPage(1);
                  setAssemblyPage(1);
                }}
                placeholder={section === 'parts' ? 'Search part, material, owner...' : 'Search assembly, owner...'}
                ariaLabel={`Search ${section}`}
              />
              <Dropdown
                trigger={({ open, toggle }) => (
                  <Button variant="ghost" icon={Download} onClick={toggle} aria-expanded={open}>
                    Export
                  </Button>
                )}
              >
                {({ close }) => (
                  <DropdownItem
                    icon={Download}
                    onClick={() => {
                      if (section === 'parts') exportCsv('mechanical-parts', partCsv, visibleParts);
                      else exportCsv('mechanical-assemblies', assemblyCsv, visibleAssemblies);
                      close();
                    }}
                  >
                    Export CSV
                  </DropdownItem>
                )}
              </Dropdown>
              <Button
                variant="secondary"
                icon={Plus}
                size="sm"
                onClick={() =>
                  navigate(
                    section === 'parts'
                      ? '/mechanical-design/parts-assemblies/parts/new'
                      : '/mechanical-design/parts-assemblies/assemblies/new',
                  )
                }
              >
                {section === 'parts' ? 'New Part' : 'New Assembly'}
              </Button>
            </>
          }
          count={section === 'parts' ? partPaging.info : assemblyPaging.info}
        />
      )}

      {section === 'parts' && (
        <section className="table-card">
          <DataTable
            columns={partColumns}
            rows={partPaging.rows}
            className="mech-register-table"
            recordHref={(row) => `/mechanical-design/parts-assemblies/parts/${row.id}`}
            onRowClick={(row) => navigate(`/mechanical-design/parts-assemblies/parts/${row.id}`)}
            rowActions={() => [
              { key: 'view', label: 'View part', icon: Eye },
              { key: 'edit', label: 'Edit part', icon: Pencil },
              { key: 'duplicate', label: 'Duplicate part', icon: Copy },
              { key: 'analysis', label: 'Create engineering analysis', icon: Activity },
              { key: 'revisions', label: 'View revision history', icon: History },
              { key: 'archive', label: 'Archive part', icon: Archive, danger: true, divider: true },
            ]}
            onRowAction={(key, row) => {
              if (key === 'view')
                navigate(`/mechanical-design/parts-assemblies/parts/${row.id}`);
              if (key === 'edit')
                navigate(`/mechanical-design/parts-assemblies/parts/${row.id}/edit`);
              if (key === 'duplicate') {
                duplicatePart(row.id);
                showToast(`${row.partNumber} duplicated as a new draft.`);
              }
              if (key === 'analysis')
                navigate(
                  `/analysis/new?projectId=${encodeURIComponent(row.projectId)}&linkedType=part&linkedId=${encodeURIComponent(row.id)}`,
                );
              if (key === 'revisions') setRevisionTarget({ ...row, kind: 'part' });
              if (key === 'archive') setPendingArchive({ ...row, kind: 'part' });
            }}
            ariaLabel="Part register"
            emptyContent={
              <EmptyState
                icon={Package}
                title="No Parts Found"
                message="No parts match the current search or filter selection."
                action={
                  <Button
                    variant="ghost"
                    icon={X}
                    onClick={() => {
                      setPartFilters(PART_FILTERS);
                      setSearch('');
                    }}
                  >
                    Clear Filters
                  </Button>
                }
              />
            }
          />
          <Pagination
            page={partPaging.currentPage}
            totalPages={partPaging.totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            pageInfo={partPaging.info}
            onPageChange={setPartPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPartPage(1);
            }}
          />
        </section>
      )}

      {section === 'assemblies' && (
        <section className="table-card">
          <DataTable
            columns={assemblyColumns}
            rows={assemblyPaging.rows}
            className="mech-register-table"
            recordHref={(row) => `/mechanical-design/parts-assemblies/assemblies/${row.id}`}
            onRowClick={(row) =>
              navigate(`/mechanical-design/parts-assemblies/assemblies/${row.id}`)
            }
            rowActions={() => [
              { key: 'view', label: 'View assembly', icon: Eye },
              { key: 'edit', label: 'Edit assembly', icon: Pencil },
              { key: 'manage', label: 'Manage components', icon: Layers },
              { key: 'structure', label: 'View structure', icon: Layers },
              { key: 'duplicate', label: 'Duplicate assembly', icon: Copy },
              { key: 'analysis', label: 'Create engineering analysis', icon: Activity },
              { key: 'revisions', label: 'View revision history', icon: History },
              { key: 'archive', label: 'Archive assembly', icon: Archive, danger: true, divider: true },
            ]}
            onRowAction={(key, row) => {
              if (key === 'view')
                navigate(`/mechanical-design/parts-assemblies/assemblies/${row.id}`);
              if (key === 'edit')
                navigate(`/mechanical-design/parts-assemblies/assemblies/${row.id}/edit`);
              if (key === 'manage') setComponentTarget(row);
              if (key === 'structure') {
                setSection('structure');
                setExpanded((previous) => new Set([...previous, row.id]));
              }
              if (key === 'duplicate') {
                duplicateAssembly(row.id);
                showToast(`${row.number} duplicated as a new draft.`);
              }
              if (key === 'analysis')
                navigate(
                  `/analysis/new?projectId=${encodeURIComponent(row.projectId)}&linkedType=assembly&linkedId=${encodeURIComponent(row.id)}`,
                );
              if (key === 'revisions') setRevisionTarget({ ...row, id: row.number, kind: 'assembly', name: row.name, revision: row.revision });
              if (key === 'archive') setPendingArchive({ ...row, id: row.number, kind: 'assembly', targetId: row.id });
            }}
            ariaLabel="Assembly register"
            emptyContent={
              <EmptyState
                icon={Layers}
                title="No Assemblies Found"
                message="No assemblies match the current search or filter selection."
              />
            }
          />
          <Pagination
            page={assemblyPaging.currentPage}
            totalPages={assemblyPaging.totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            pageInfo={assemblyPaging.info}
            onPageChange={setAssemblyPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setAssemblyPage(1);
            }}
          />
        </section>
      )}

      {section === 'structure' && (
        <Card
          title="Assembly Structure"
          subtitle="Expand a node to see its subassemblies and parts; quantities are editable in place"
          icon={Layers}
          actions={
            <>
              <select
                className="dash-quick-filter"
                aria-label="Filter structure by project"
                value={structureFilter}
                onChange={(event) => setStructureFilter(event.target.value)}
              >
                <option value="All">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.id} · {project.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                icon={RefreshCw}
                onClick={() => setExpanded(new Set(assemblies.map((row) => row.id)))}
              >
                Expand All
              </Button>
              <Button variant="ghost" icon={X} onClick={() => setExpanded(new Set())}>
                Collapse All
              </Button>
              <Button
                variant="secondary"
                icon={Plus}
                size="sm"
                onClick={() => navigate('/mechanical-design/parts-assemblies/assemblies/new')}
              >
                New Assembly
              </Button>
            </>
          }
        >
          {filteredRoots.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No assemblies for this project"
              message="Create an assembly to start building the product structure."
            />
          ) : (
            <ul className="mech-tree">
              {filteredRoots.map((root) => renderStructure(root))}
            </ul>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(partView)}
        onClose={() => setPartView(null)}
        title={partView ? partView.name : 'Part'}
        subtitle={partView ? `${partView.partNumber} · ${partView.projectId} · ${partView.projectName}` : undefined}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPartView(null)}>
              Close
            </Button>
            <Button
              icon={Pencil}
              onClick={() => {
                const id = partView.id;
                setPartView(null);
                navigate(`/mechanical-design/parts-assemblies/parts/${id}/edit`);
              }}
            >
              Edit Part
            </Button>
          </>
        }
      >
        {partView && (
          <>
            <div className="req-view-badges">
              <StatusBadge status={partView.status} tone={statusTone(partView.status)} />
              <span className="chip chip-mint">{partView.domain}</span>
              <span className="chip mech-rev-chip">Rev {partView.revision}</span>
            </div>
            <div className="fact-grid">
              <Fact label="Part Number">{partView.partNumber}</Fact>
              <Fact label="Category">{partView.category}</Fact>
              <Fact label="Material">{partView.material}</Fact>
              <Fact label="Material Grade">{partView.materialGrade}</Fact>
              <Fact label="Dimensions">{partView.dimensions}</Fact>
              <Fact label="Weight">{formatWeight(partView.weight)}</Fact>
              <Fact label="Quantity">{`${partView.quantity} ${partView.uom}`}</Fact>
              <Fact label="Parent Assembly">{partParent(partView)?.number || 'Not assigned'}</Fact>
              <Fact label="Design Owner">{partView.owner}</Fact>
              <Fact label="CAD Reference">{partView.cadRef}</Fact>
            </div>
            <div className="fact-stack">
              <Fact label="Technical Notes">{partView.notes}</Fact>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(assemblyView)}
        onClose={() => setAssemblyView(null)}
        title={assemblyView ? assemblyView.name : 'Assembly'}
        subtitle={assemblyView ? `${assemblyView.number} · ${assemblyView.projectId}` : undefined}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssemblyView(null)}>
              Close
            </Button>
            <Button
              icon={Layers}
              onClick={() => {
                setAssemblyView(null);
                setComponentTarget(assemblyView);
              }}
            >
              Manage Components
            </Button>
          </>
        }
      >
        {assemblyView && (
          <>
            <div className="req-view-badges">
              <StatusBadge status={assemblyView.status} tone={statusTone(assemblyView.status)} />
              <span className="chip chip-mint">{assemblyView.domain}</span>
              <span className="chip mech-rev-chip">Rev {assemblyView.revision}</span>
            </div>
            <div className="fact-grid">
              <Fact label="Assembly Number">{assemblyView.number}</Fact>
              <Fact label="Project">
                {assemblyView.projectId} · {projectName(projects, assemblyView.projectId)}
              </Fact>
              <Fact label="Parent Assembly">
                {assemblies.find((row) => row.id === assemblyView.parentAssemblyId)?.number ||
                  'Top-level assembly'}
              </Fact>
              <Fact label="Owner">{assemblyView.owner}</Fact>
              <Fact label="Components">
                {assemblyTreePartCount(assemblies, parts, assemblyView.id)}
              </Fact>
              <Fact label="Subassemblies">
                {childAssemblies(assemblies, assemblyView.id).length}
              </Fact>
            </div>
            <div className="fact-stack">
              <Fact label="Description">{assemblyView.description}</Fact>
              <Fact label="Technical Notes">{assemblyView.notes}</Fact>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(componentTarget)}
        onClose={() => setComponentTarget(null)}
        title={componentTarget ? `Components · ${componentTarget.number}` : 'Components'}
        subtitle={componentTarget ? `${componentTarget.name} · Rev ${componentTarget.revision}` : undefined}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComponentTarget(null)}>
              Close
            </Button>
            <Button
              icon={Plus}
              onClick={() => {
                setAddPartTarget(componentTarget);
                setAddForm({ partId: '', quantity: '1' });
              }}
            >
              Add Existing Part
            </Button>
          </>
        }
      >
        {componentTarget && (
          <>
            <p className="dash-modal-note">
              Parts directly inside this assembly. Subassemblies appear in the Assembly Structure
              tab, where the full tree can be expanded.
            </p>
            {assemblyParts(parts, componentTarget.id).length === 0 ? (
              <p className="dash-modal-note">No parts assigned to this assembly yet.</p>
            ) : (
              <ul className="mech-component-list">
                {assemblyParts(parts, componentTarget.id).map((part) => (
                  <li key={part.id}>
                    <span className="mech-component-name">
                      <strong>{part.partNumber}</strong>
                      {part.name}
                    </span>
                    <label className="mech-qty">
                      <span>Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={part.quantity}
                        aria-label={`Quantity of ${part.name}`}
                        onChange={(event) => setPartQuantity(part.id, event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="mech-icon-btn"
                      aria-label={`Remove ${part.name}`}
                      onClick={() => removePartFromAssembly(part, componentTarget)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(addPartTarget)}
        onClose={() => setAddPartTarget(null)}
        title="Add Existing Part"
        subtitle={addPartTarget ? `Assign a part to ${addPartTarget.number}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddPartTarget(null)}>
              Cancel
            </Button>
            <Button icon={Plus} disabled={!addForm.partId} onClick={addPartToAssembly}>
              Add Part
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-grid-full">
            <Select
              id="add-part-select"
              label="Part"
              options={[
                { value: '', label: 'Select a part' },
                ...parts.map((part) => ({
                  value: part.id,
                  label: `${part.partNumber} · ${part.name}${
                    part.parentAssemblyId && part.parentAssemblyId !== addPartTarget?.id
                      ? ' (moves from another assembly)'
                      : ''
                  }`,
                })),
              ]}
              value={addForm.partId}
              onChange={(event) =>
                setAddForm((previous) => ({ ...previous, partId: event.target.value }))
              }
            />
          </div>
          <Input
            id="add-part-qty"
            label="Quantity"
            type="number"
            min="1"
            value={addForm.quantity}
            onChange={(event) =>
              setAddForm((previous) => ({ ...previous, quantity: event.target.value }))
            }
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingArchive)}
        onClose={() => setPendingArchive(null)}
        title={pendingArchive?.kind === 'assembly' ? 'Archive Assembly' : 'Archive Part'}
        subtitle={pendingArchive ? `${pendingArchive.partNumber || pendingArchive.number} · ${pendingArchive.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              icon={Archive}
              onClick={() => {
                if (pendingArchive.kind === 'assembly') archiveAssembly(pendingArchive.targetId);
                else archivePart(pendingArchive.id);
                showToast(`${pendingArchive.name} archived.`);
                setPendingArchive(null);
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The record keeps its assembly relationships and revision history; it is marked Archived
          and can still be viewed.
        </p>
      </Modal>

      <RevisionHistoryModal
        open={Boolean(revisionTarget)}
        onClose={() => setRevisionTarget(null)}
        title={revisionTarget ? `${revisionTarget.kind === 'assembly' ? 'Assembly' : 'Part'} Revisions · ${revisionTarget.id}` : undefined}
        subtitle={revisionTarget ? `${revisionTarget.name} · current Rev ${revisionTarget.revision}` : undefined}
        revisions={revisionTarget?.revisions || []}
      />

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
