import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Boxes,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  Eye,
  Filter,
  FolderTree,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
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
import { useBom } from '../../context/BomContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { useWorkflowConversions } from '../../context/WorkflowConversionContext';
import { formatDate } from '../../data/bomData';
import {
  BOM_STATUSES,
  MATERIAL_CATALOG,
  assemblyLabel,
  bomMaterials,
  isBomEditable,
  materialRequirementCost,
  projectName,
  purchasedRows,
  statusTone,
} from '../../data/bomData';
import exportCsv from '../../utils/exportCsv';
import { Fact, FilterPanel, SectionNav, Toast, money, useTable, useToast } from './bomUi';

const SECTIONS = [
  { key: 'engineering', label: 'Engineering BOM' },
  { key: 'materials', label: 'Material BOM' },
  { key: 'purchased', label: 'Purchased Components' },
  { key: 'quantities', label: 'Quantity Calculation' },
  { key: 'mapping', label: 'Part & Assembly Mapping' },
];

const BOM_CSV = [
  { key: 'id', label: 'BOM Number' },
  { key: 'name', label: 'BOM Name' },
  { key: 'projectId', label: 'Project ID' },
  { key: 'projectName', label: 'Project' },
  { key: 'assemblyName', label: 'Assembly' },
  { key: 'revision', label: 'Revision' },
  { key: 'itemCount', label: 'Items' },
  { key: 'engineer', label: 'Responsible Engineer' },
  { key: 'date', label: 'BOM Date' },
  { key: 'status', label: 'Status' },
];

export default function BomManagementTab() {
  const navigate = useNavigate();
  const { boms, materials, quantities, removeMaterial, removeQuantity, submitBom, removeBom, duplicateBom } = useBom();
  const { assemblies, parts, designs } = useMechanical();
  const { targetsFor, openConversion } = useWorkflowConversions();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('engineering');
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const bomRows = useMemo(
    () =>
      boms.map((bom) => ({
        ...bom,
        projectName: projectName(projects, bom.projectId),
        designName: designs.find((design) => design.id === bom.designId)?.name || '—',
        assemblyName: assemblyLabel(assemblies, bom.assemblyId),
        itemCount: bom.items.length,
        materialCost: materialRequirementCost(bomMaterials(materials, bom.id)),
      })),
    [boms, projects, assemblies, materials, designs],
  );

  const bomTable = useTable(bomRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (filters.engineer !== 'All' && row.engineer !== filters.engineer) return false;
    if (filters.from && row.date < filters.from) return false;
    if (filters.to && row.date > filters.to) return false;
    if (!query) return true;
    return [row.id, row.name, row.projectId, row.projectName, row.designName, row.assemblyName, row.bomType, row.engineer, row.status]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const materialRows = useMemo(
    () =>
      materials.map((row) => {
        const bom = boms.find((entry) => entry.id === row.bomId);
        const catalog = MATERIAL_CATALOG.find((entry) => entry.code === row.materialCode) || {};
        return {
          ...row,
          materialName: catalog.name || '—',
          grade: catalog.grade || '—',
          specification: catalog.specification || '—',
          projectName: projectName(projects, row.projectId),
          partName: parts.find((part) => part.partNumber === row.partNumber)?.name || '',
          cost: Number(row.qty || 0) * Number(row.rate || 0),
          bomRevision: bom?.revision || '—',
          bomStatus: bom?.status || '—',
          editable: isBomEditable(bom),
        };
      }),
    [materials, boms, projects, parts],
  );

  const materialTable = useTable(materialRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.id, row.materialCode, row.materialName, row.grade, row.partNumber, row.projectName, row.bomId]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const purchased = useMemo(() => purchasedRows(boms).map((row) => ({ ...row, id: row.key })), [boms]);
  const purchasedTable = useTable(purchased, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.componentCode, row.name, row.partNumber, row.specification, row.bomId, row.purchaseStatus]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const quantityRows = useMemo(
    () =>
      quantities.map((row) => {
        const bom = boms.find((entry) => entry.id === row.bomId);
        return {
          ...row,
          bomStatus: bom?.status || '—',
          editable: isBomEditable(bom),
        };
      }),
    [quantities, boms],
  );

  const quantityTable = useTable(quantityRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.id, row.bomId, row.partNumber, row.component, row.notes].join(' ').toLowerCase().includes(query);
  });

  const bomKpis = {
    total: boms.length,
    review: boms.filter((row) => row.status === 'Under Review').length,
    approved: boms.filter((row) => row.status === 'Approved').length,
    released: boms.filter((row) => row.status === 'Released').length,
  };

  const counts = {
    engineering: boms.length,
    materials: materials.length,
    purchased: purchased.length,
    quantities: quantities.length,
  };

  const exportCurrent = () => {
    if (section === 'engineering') exportCsv('engineering-bom', BOM_CSV, bomTable.sorted);
    else if (section === 'materials') {
      exportCsv('material-bom', [
        { key: 'id', label: 'Requirement ID' },
        { key: 'materialCode', label: 'Material Code' },
        { key: 'materialName', label: 'Material Name' },
        { key: 'grade', label: 'Grade' },
        { key: 'qty', label: 'Required Quantity' },
        { key: 'unit', label: 'Unit' },
        { key: 'rate', label: 'Unit Rate' },
        { key: 'cost', label: 'Estimated Cost' },
        { key: 'partNumber', label: 'Part Number' },
      ], materialTable.sorted);
    } else if (section === 'purchased') {
      exportCsv('purchased-components', [
        { key: 'componentCode', label: 'Component Code' },
        { key: 'name', label: 'Component' },
        { key: 'partNumber', label: 'Part Number' },
        { key: 'qty', label: 'Quantity' },
        { key: 'unit', label: 'Unit' },
        { key: 'unitCost', label: 'Unit Cost' },
        { key: 'totalCost', label: 'Estimated Total' },
        { key: 'purchaseStatus', label: 'Purchase Readiness' },
      ], purchasedTable.sorted);
    } else {
      exportCsv('quantity-calculations', [
        { key: 'id', label: 'Calculation Reference' },
        { key: 'bomId', label: 'BOM Number' },
        { key: 'partNumber', label: 'Part Number' },
        { key: 'component', label: 'Component' },
        { key: 'baseQty', label: 'Base Quantity' },
        { key: 'requiredQty', label: 'Required Quantity' },
        { key: 'allowance', label: 'Allowance %' },
        { key: 'finalQty', label: 'Final Quantity' },
        { key: 'unit', label: 'Unit' },
      ], quantityTable.sorted);
    }
    showToast('CSV export prepared.');
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={counts} />

      {section === 'engineering' && (
        <>
          <KpiGrid>
            <StatCard icon={Boxes} label="Total BOMs" value={String(bomKpis.total)} sub="All engineering BOMs" tone="teal" />
            <StatCard icon={ClipboardList} label="Under Review" value={String(bomKpis.review)} sub="Awaiting approval" tone="orange" />
            <StatCard icon={ShieldCheck} label="Approved" value={String(bomKpis.approved)} sub="Approved, not released" tone="blue" />
            <StatCard icon={PackageCheck} label="Released" value={String(bomKpis.released)} sub="Handed to downstream" tone="emerald" />
          </KpiGrid>

          <Toolbar
            left={
              <>
                <Button variant="ghost" icon={RefreshCw} onClick={bomTable.reset}>Refresh</Button>
                <Button variant="secondary" icon={Filter} size="sm" onClick={() => bomTable.setFiltersOpen((open) => !open)}>
                  {bomTable.filtersOpen ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </>
            }
            right={
              <>
                <SearchInput id="bom-search" value={bomTable.search} onChange={bomTable.setSearch} placeholder="Search BOM, project, assembly..." ariaLabel="Search engineering BOMs" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportCurrent}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => navigate('/bom-cost/bom/new')}>New BOM</Button>
              </>
            }
            count={bomTable.pageInfo}
          />
          <FilterPanel table={bomTable} projects={projects} statuses={BOM_STATUSES} />

          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'BOM Number', width: 96, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'name', label: 'BOM Name', width: 158, sortable: true, render: (row) => <span className="cell-strong bom-clip">{row.name}</span> },
                { key: 'projectName', label: 'Project', width: 118, render: (row) => <span className="cell-project"><span className="cell-id">{row.projectId}</span><span className="cell-muted">{row.projectName}</span></span> },
                { key: 'designName', label: 'Design', width: 110, render: (row) => <span className="cell-muted bom-clip">{row.designName}</span> },
                { key: 'bomType', label: 'BOM Type', width: 104, render: (row) => <span className="cell-muted bom-clip">{row.bomType}</span> },
                { key: 'assemblyName', label: 'Assembly', width: 110, render: (row) => <span className="cell-muted bom-clip">{row.assemblyName}</span> },
                { key: 'itemCount', label: 'Items', width: 54, align: 'center' },
                { key: 'revision', label: 'Rev', width: 50, align: 'center', render: (row) => `Rev ${row.revision}` },
                { key: 'engineer', label: 'Engineer', width: 82, sortable: true },
                { key: 'date', label: 'Date', width: 82, sortable: true, render: (row) => formatDate(row.date) },
                { key: 'status', label: 'Status', width: 92, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
              ]}
              rows={bomTable.pageRows}
              className="mech-register-table"
              sortKey={bomTable.sortKey}
              sortDirection={bomTable.sortDirection}
              onSort={bomTable.toggleSort}
              rowActions={(row) => [
                { key: 'view', label: 'View BOM', icon: Eye },
                ...(['Draft', 'In Progress', 'Changes Requested'].includes(row.status)
                  ? [{ key: 'edit', label: 'Edit BOM', icon: Pencil }]
                  : []),
                ...(['Draft', 'In Progress', 'Changes Requested', 'Withdrawn'].includes(row.status)
                  ? [{ key: 'submit', label: 'Submit for review', icon: Send }]
                  : []),
                { key: 'duplicate', label: 'Duplicate as Draft', icon: Copy },
                ...(targetsFor('bom', row).some((target) => target.enabled)
                  ? [{ key: 'convert', label: 'Convert BOM', icon: ArrowRightLeft }]
                  : []),
                ...(['Draft', 'In Progress'].includes(row.status)
                  ? [{ key: 'delete', label: 'Delete BOM', icon: Trash2, danger: true, divider: true }]
                  : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/bom-cost/bom/${row.id}`);
                if (key === 'edit') navigate(`/bom-cost/bom/${row.id}/edit`);
                if (key === 'submit') {
                  submitBom(row.id, row.engineer);
                  showToast(`${row.id} submitted for review.`);
                }
                if (key === 'duplicate') {
                  const result = duplicateBom(row.id, row.engineer || 'BOM Engineer');
                  if (result?.id) {
                    showToast(`${row.id} duplicated as draft ${result.id}.`);
                    navigate(`/bom-cost/bom/${result.id}/edit`);
                  }
                }
                if (key === 'convert') openConversion('bom', row);
                if (key === 'delete') setDeleteTarget({ kind: 'bom', row });
              }}
              recordHref={(row) => `/bom-cost/bom/${row.id}`}
              onRowClick={(row) => navigate(`/bom-cost/bom/${row.id}`)}
              ariaLabel="Engineering BOM register"
              emptyContent={<EmptyState icon={Boxes} title="No BOMs" message="No engineering BOMs match the current filters." />}
            />
            <Pagination
              page={bomTable.page}
              totalPages={Math.max(1, Math.ceil(bomTable.sorted.length / bomTable.pageSize))}
              pageSize={bomTable.pageSize}
              pageInfo={bomTable.pageInfo}
              onPageChange={bomTable.setPage}
              onPageSizeChange={(size) => { bomTable.setPageSize(size); bomTable.setPage(1); }}
              pageSizeOptions={[5, 10, 25]}
            />
          </section>
          <p className="mech-footnote">
            BOM quantities and costs are engineering estimates. Purchase prices, vendor quotations and production
            consumption are owned by Purchase and Production.
          </p>
        </>
      )}

      {section === 'materials' && (
        <>
          <KpiGrid>
            <StatCard icon={Boxes} label="Material Requirements" value={String(materials.length)} sub="Line items across BOMs" tone="teal" />
            <StatCard icon={ClipboardList} label="Estimated Material Cost" value={money(materialRows.reduce((total, row) => total + row.cost, 0))} sub="Mock estimate at recorded rates" tone="emerald" />
            <StatCard icon={PackageCheck} label="Projects Covered" value={String(new Set(materials.map((row) => row.projectId)).size)} sub="Material requirement projects" tone="blue" />
            <StatCard icon={RefreshCw} label="Material Groups" value={String(new Set(materials.map((row) => row.materialCode)).size)} sub="Distinct material codes" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={materialTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="material-search" value={materialTable.search} onChange={materialTable.setSearch} placeholder="Search material, grade, part..." ariaLabel="Search materials" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportCurrent}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => navigate('/bom-cost/material/new')}>New Material</Button>
              </>
            }
            count={materialTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Requirement', width: 90, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'materialCode', label: 'Material Code', width: 92 },
                { key: 'materialName', label: 'Material', width: 108, render: (row) => <span className="cell-strong">{row.materialName}</span> },
                { key: 'grade', label: 'Grade', width: 108 },
                { key: 'qty', label: 'Qty', width: 56, align: 'right' },
                { key: 'unit', label: 'Unit', width: 44 },
                { key: 'rate', label: 'Rate', width: 68, align: 'right', render: (row) => money(row.rate) },
                { key: 'cost', label: 'Est. Cost', width: 94, align: 'right', render: (row) => money(row.cost) },
                { key: 'partNumber', label: 'Linked Part', width: 92 },
                { key: 'projectId', label: 'Project', width: 92 },
              ]}
              rows={materialTable.pageRows}
              className="mech-register-table"
              sortKey={materialTable.sortKey}
              sortDirection={materialTable.sortDirection}
              onSort={materialTable.toggleSort}
              recordHref={(row) => `/bom-cost/material/${row.id}`}
              onRowClick={(row) => navigate(`/bom-cost/material/${row.id}`)}
              rowActions={(row) => [
                { key: 'view', label: 'View material', icon: Eye },
                ...(row.editable
                  ? [
                      { key: 'edit', label: 'Edit material', icon: Pencil },
                      { key: 'delete', label: 'Delete requirement', icon: Trash2, danger: true, divider: true },
                    ]
                  : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/bom-cost/material/${row.id}`);
                if (key === 'edit') navigate(`/bom-cost/material/${row.id}/edit`);
                if (key === 'delete') setDeleteTarget({ kind: 'material', row });
              }}
              ariaLabel="Material BOM register"
              emptyContent={<EmptyState icon={Boxes} title="No material requirements" message="Add a material requirement to get started." />}
            />
            <Pagination page={materialTable.page} totalPages={Math.max(1, Math.ceil(materialTable.sorted.length / materialTable.pageSize))} pageSize={materialTable.pageSize} pageInfo={materialTable.pageInfo} onPageChange={materialTable.setPage} onPageSizeChange={(size) => { materialTable.setPageSize(size); materialTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'purchased' && (
        <>
          <KpiGrid>
            <StatCard icon={ShoppingCart} label="Purchased Components" value={String(purchased.length)} sub="Buy items across all BOMs" tone="teal" />
            <StatCard icon={PackageCheck} label="Estimated Cost" value={money(purchased.reduce((total, row) => total + row.totalCost, 0))} sub="Mock estimate, not a quotation" tone="emerald" />
            <StatCard icon={ClipboardList} label="Ready for Handover" value={String(purchased.filter((row) => row.purchaseStatus === 'Ready for handover').length)} sub="From released BOMs" tone="blue" />
            <StatCard icon={ShieldCheck} label="Awaiting Release" value={String(purchased.filter((row) => row.purchaseStatus === 'Awaiting release').length)} sub="Approved BOMs not yet released" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={purchasedTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="purchased-search" value={purchasedTable.search} onChange={purchasedTable.setSearch} placeholder="Search component, part, BOM..." ariaLabel="Search purchased components" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportCurrent}>Export</Button>
              </>
            }
            count={purchasedTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'componentCode', label: 'Component Code', width: 96 },
                { key: 'name', label: 'Component', width: 142, render: (row) => <span className="cell-strong bom-clip">{row.name}</span> },
                { key: 'partNumber', label: 'Part Number', width: 98 },
                { key: 'specification', label: 'Specification', width: 150, render: (row) => <span className="cell-muted bom-clip">{row.specification}</span> },
                { key: 'qty', label: 'Qty', width: 48, align: 'right' },
                { key: 'unit', label: 'Unit', width: 40 },
                { key: 'unitCost', label: 'Unit Cost', width: 82, align: 'right', render: (row) => money(row.unitCost) },
                { key: 'totalCost', label: 'Est. Total', width: 94, align: 'right', render: (row) => money(row.totalCost) },
                { key: 'purchaseStatus', label: 'Readiness', width: 112, render: (row) => <span className="bom-ready-chip">{row.purchaseStatus}</span> },
              ]}
              rows={purchasedTable.pageRows}
              className="mech-register-table"
              sortKey={purchasedTable.sortKey}
              sortDirection={purchasedTable.sortDirection}
              onSort={purchasedTable.toggleSort}
              rowActions={(row) => [
                { key: 'view', label: 'Open BOM', icon: Eye },
              ]}
              onRowAction={(key, row) => { if (key === 'view') navigate(`/bom-cost/bom/${row.bomId}`); }}
              onRowClick={(row) => navigate(`/bom-cost/bom/${row.bomId}`)}
              ariaLabel="Purchased components register"
              emptyContent={<EmptyState icon={ShoppingCart} title="No purchased components" message="Buy items on an engineering BOM appear here." />}
            />
            <Pagination page={purchasedTable.page} totalPages={Math.max(1, Math.ceil(purchasedTable.sorted.length / purchasedTable.pageSize))} pageSize={purchasedTable.pageSize} pageInfo={purchasedTable.pageInfo} onPageChange={purchasedTable.setPage} onPageSizeChange={(size) => { purchasedTable.setPageSize(size); purchasedTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
          <p className="mech-footnote">
            These are engineering purchase requirements only. Vendor selection, RFQ and purchase orders stay in the
            existing Purchase module.
          </p>
        </>
      )}

      {section === 'quantities' && (
        <>
          <KpiGrid>
            <StatCard icon={ClipboardList} label="Calculations" value={String(quantities.length)} sub="Local mock quantity records" tone="teal" />
            <StatCard icon={Boxes} label="Projects" value={String(new Set(quantities.map((row) => row.projectId)).size)} sub="Projects with calculations" tone="blue" />
            <StatCard icon={PackageCheck} label="Materials Covered" value={String(new Set(quantities.map((row) => row.partNumber)).size)} sub="Distinct part references" tone="emerald" />
            <StatCard icon={RefreshCw} label="With Allowance" value={String(quantities.filter((row) => Number(row.allowance) > 0).length)} sub="Records using wastage allowance" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={quantityTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="quantity-search" value={quantityTable.search} onChange={quantityTable.setSearch} placeholder="Search calculation, BOM, part..." ariaLabel="Search quantity calculations" />
                <Button variant="secondary" size="sm" icon={Download} onClick={exportCurrent}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => navigate('/bom-cost/quantity/new')}>New Calculation</Button>
              </>
            }
            count={quantityTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Calculation Ref', width: 96, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'projectId', label: 'Project', width: 100 },
                { key: 'bomId', label: 'BOM', width: 92 },
                { key: 'partNumber', label: 'Part Number', width: 92 },
                { key: 'component', label: 'Component', width: 150, render: (row) => <span className="cell-strong bom-clip">{row.component}</span> },
                { key: 'baseQty', label: 'Base', width: 50, align: 'right' },
                { key: 'requiredQty', label: 'Required', width: 62, align: 'right' },
                { key: 'allowance', label: 'Allow. %', width: 58, align: 'right' },
                { key: 'finalQty', label: 'Final Qty', width: 66, align: 'right' },
                { key: 'unit', label: 'Unit', width: 42 },
                { key: 'bomStatus', label: 'BOM Status', width: 88 },
              ]}
              rows={quantityTable.pageRows}
              className="mech-register-table"
              sortKey={quantityTable.sortKey}
              sortDirection={quantityTable.sortDirection}
              onSort={quantityTable.toggleSort}
              recordHref={(row) => `/bom-cost/quantity/${row.id}`}
              onRowClick={(row) => navigate(`/bom-cost/quantity/${row.id}`)}
              rowActions={(row) => [
                { key: 'view', label: 'View calculation', icon: Eye },
                ...(row.editable
                  ? [
                      { key: 'edit', label: 'Edit calculation', icon: Pencil },
                      { key: 'delete', label: 'Delete calculation', icon: Trash2, danger: true, divider: true },
                    ]
                  : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/bom-cost/quantity/${row.id}`);
                if (key === 'edit') navigate(`/bom-cost/quantity/${row.id}/edit`);
                if (key === 'delete') setDeleteTarget({ kind: 'quantity', row });
              }}
              ariaLabel="Quantity calculation register"
              emptyContent={<EmptyState icon={ClipboardList} title="No calculations" message="Create a quantity calculation to get started." />}
            />
            <Pagination page={quantityTable.page} totalPages={Math.max(1, Math.ceil(quantityTable.sorted.length / quantityTable.pageSize))} pageSize={quantityTable.pageSize} pageInfo={quantityTable.pageInfo} onPageChange={quantityTable.setPage} onPageSizeChange={(size) => { quantityTable.setPageSize(size); quantityTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
          <p className="mech-footnote">
            Quantities are illustrative frontend records. Allowance and wastage values are mock estimates, not
            certified engineering calculations.
          </p>
        </>
      )}

      {section === 'mapping' && (
        <>
          <KpiGrid>
            <StatCard icon={FolderTree} label="Assemblies Mapped" value={String(new Set(boms.map((row) => row.assemblyId).filter(Boolean)).size)} sub="Assemblies referenced by BOMs" tone="teal" />
            <StatCard icon={Boxes} label="Mapped Items" value={String(boms.reduce((total, row) => total + row.items.length, 0))} sub="BOM items linked to parts" tone="blue" />
            <StatCard icon={ClipboardList} label="BOMs" value={String(boms.length)} sub="Engineering structures" tone="emerald" />
            <StatCard icon={PackageCheck} label="Make Items" value={String(boms.reduce((total, row) => total + row.items.filter((item) => item.makeBuy === 'Make').length, 0))} sub="Items manufactured in-house" tone="orange" />
          </KpiGrid>
          <section className="table-card bom-tree-card">
            <div className="bom-tree-head">
              <strong>Part &amp; Assembly Mapping</strong>
              <span className="cell-muted">Project → assembly → BOM → items (mock hierarchy)</span>
            </div>
            {boms.map((bom) => (
              <details key={bom.id} className="bom-tree-group" open={bom.id === boms[0].id}>
                <summary>
                  <ChevronRight aria-hidden="true" />
                  <span className="cell-id">{bom.projectId}</span>
                  <strong>{bom.name}</strong>
                  <span className="cell-muted">{assemblyLabel(assemblies, bom.assemblyId)}</span>
                  <StatusBadge status={bom.status} tone={statusTone(bom.status)} />
                </summary>
                <ul className="bom-tree-list">
                  <li className="bom-tree-bom">
                    <button type="button" className="link-button" onClick={() => navigate(`/bom-cost/bom/${bom.id}`)}>
                      {bom.id} · Rev {bom.revision}
                    </button>
                    <span className="cell-muted">{bom.items.length} items</span>
                  </li>
                  {bom.items.map((row) => (
                    <li key={row.id}>
                      <span className="bom-tree-branch" aria-hidden="true" />
                      <span className="cell-id">{row.partNumber}</span>
                      <span>{row.name}</span>
                      <span className="cell-muted">{row.makeBuy} · Qty {row.qty} {row.uom} · Rev {row.partRevision}</span>
                      <span className="cell-muted">{row.material}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        </>
      )}

      <Modal
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.kind === 'material' ? 'Material Requirement' : 'Quantity Calculation'}
        subtitle={viewTarget?.row?.id}
        maxWidth="max-w-lg"
        footer={<Button variant="ghost" onClick={() => setViewTarget(null)}>Close</Button>}
      >
        {viewTarget?.kind === 'material' && (
          <div className="fact-grid">
            <Fact label="Material Code">{viewTarget.row.materialCode}</Fact>
            <Fact label="Material">{viewTarget.row.materialName}</Fact>
            <Fact label="Grade">{viewTarget.row.grade}</Fact>
            <Fact label="Specification">{viewTarget.row.specification}</Fact>
            <Fact label="Required Quantity">{`${viewTarget.row.qty} ${viewTarget.row.unit}`}</Fact>
            <Fact label="Estimated Unit Rate">{money(viewTarget.row.rate)}</Fact>
            <Fact label="Estimated Material Cost">{money(viewTarget.row.cost)}</Fact>
            <Fact label="Linked Part">{viewTarget.row.partNumber}</Fact>
            <Fact label="Project">{`${viewTarget.row.projectId} · ${viewTarget.row.projectName}`}</Fact>
            <Fact label="BOM">{`${viewTarget.row.bomId} · Rev ${viewTarget.row.bomRevision}`}</Fact>
            <Fact label="BOM Status">{viewTarget.row.bomStatus}</Fact>
          </div>
        )}
        {viewTarget?.kind === 'quantity' && (
          <div className="fact-grid">
            <Fact label="Calculation Reference">{viewTarget.row.id}</Fact>
            <Fact label="Project">{viewTarget.row.projectId}</Fact>
            <Fact label="BOM Number">{viewTarget.row.bomId}</Fact>
            <Fact label="BOM Status">{viewTarget.row.bomStatus}</Fact>
            <Fact label="Part Number">{viewTarget.row.partNumber}</Fact>
            <Fact label="Component">{viewTarget.row.component}</Fact>
            <Fact label="Base Quantity">{viewTarget.row.baseQty}</Fact>
            <Fact label="Required Quantity">{viewTarget.row.requiredQty}</Fact>
            <Fact label="Allowance / Wastage">{`${viewTarget.row.allowance}%`}</Fact>
            <Fact label="Final Quantity">{`${viewTarget.row.finalQty} ${viewTarget.row.unit}`}</Fact>
            <Fact label="Engineer Notes">{viewTarget.row.notes}</Fact>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Record"
        subtitle={deleteTarget?.row?.id}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              icon={Trash2}
              onClick={() => {
                if (deleteTarget.kind === 'bom') removeBom(deleteTarget.row.id);
                if (deleteTarget.kind === 'material') removeMaterial(deleteTarget.row.id);
                if (deleteTarget.kind === 'quantity') removeQuantity(deleteTarget.row.id);
                showToast(`${deleteTarget.row.id} deleted.`);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          Deleting removes the local mock record. Released or approved BOMs should be superseded, not deleted;
          their material and quantity records remain locked to the released revision.
        </p>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
