import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Coins,
  Download,
  Eye,
  Factory,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  Input,
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
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate, TODAY } from '../../data/bomData';
import {
  COST_CATEGORIES,
  ENGINEERS,
  MATERIAL_CATALOG,
  assemblyLabel,
  bomMaterials,
  bomItemTotal,
  labourCost,
  materialRequirementCost,
  projectName,
  purchasedRows,
  statusTone,
} from '../../data/bomData';
import exportCsv from '../../utils/exportCsv';
import { Fact, SectionNav, Toast, money, useTable, useToast } from './bomUi';

const SECTIONS = [
  { key: 'labour', label: 'Labour / Process Estimate' },
  { key: 'rates', label: 'Rate Analysis' },
  { key: 'material', label: 'Material Cost' },
  { key: 'purchased', label: 'Purchased Component Cost' },
  { key: 'manufacturing', label: 'Manufacturing Cost' },
  { key: 'estimates', label: 'Cost Estimation' },
  { key: 'summary', label: 'Cost Summary' },
];

const EMPTY_LABOUR = {
  projectId: 'PRJ-2026-041',
  bomId: '',
  component: '',
  process: 'Machining',
  operation: '',
  hours: '',
  labourRate: '420',
  processRate: '0',
  engineer: 'D. Rao',
  notes: '',
};

const EMPTY_RATE = {
  category: 'Material',
  reference: '',
  unit: 'kg',
  baseRate: '',
  additionalCharges: '0',
  effectiveDate: TODAY,
  notes: '',
};

export default function CostPlanningTab() {
  const navigate = useNavigate();
  const { boms, materials, labour, rates, estimates, addLabour, updateLabour, removeLabour, addRate, updateRate, removeRate, updateEstimate, removeEstimate } = useBom();
  const { assemblies } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState('labour');
  const revisionCostColumns = useTableColumnVisibility('/bom-cost#cost-by-revision', [
    { key: 'bom', label: 'BOM' },
    { key: 'revision', label: 'Revision' },
    { key: 'estimate', label: 'Estimate' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Estimated Total' },
    { key: 'variance', label: 'Variance' },
  ]);
  const [labourModal, setLabourModal] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [labourForm, setLabourForm] = useState(EMPTY_LABOUR);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);

  const materialRows = useMemo(
    () =>
      materials.map((row) => {
        const catalog = MATERIAL_CATALOG.find((entry) => entry.code === row.materialCode) || {};
        return {
          ...row,
          materialName: catalog.name || '—',
          projectName: projectName(projects, row.projectId),
          cost: Number(row.qty || 0) * Number(row.rate || 0),
        };
      }),
    [materials, projects],
  );

  const purchased = useMemo(() => purchasedRows(boms), [boms]);
  const labourRows = useMemo(
    () => labour.map((row) => ({ ...row, cost: Number(row.hours || 0) * Number(row.labourRate || 0) + Number(row.processRate || 0) })),
    [labour],
  );
  const estimateRows = useMemo(
    () => estimates.map((row) => ({ ...row, projectName: projectName(projects, row.projectId) })),
    [estimates, projects],
  );
  const revisionComparison = useMemo(() => {
    const latest = new Map();
    estimates
      .filter((row) => row.bomId && row.revision)
      .forEach((row) => {
        const key = `${row.bomId}|${row.revision}`;
        const existing = latest.get(key);
        if (!existing || String(row.date) >= String(existing.date)) latest.set(key, row);
      });
    const grouped = [...latest.values()].sort(
      (a, b) => a.bomId.localeCompare(b.bomId) || a.revision.localeCompare(b.revision),
    );
    return grouped.map((row) => {
      const previous = grouped.find(
        (entry) => entry.bomId === row.bomId && entry.revision < row.revision,
      );
      return {
        ...row,
        previousTotal: previous ? Number(previous.totalCost || 0) : null,
        delta: previous ? Number(row.totalCost || 0) - Number(previous.totalCost || 0) : null,
      };
    });
  }, [estimates]);

  const labourTable = useTable(labourRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.id, row.component, row.process, row.operation, row.engineer, row.bomId].join(' ').toLowerCase().includes(query);
  });
  const rateTable = useTable(rates, (row, filters, query) => {
    if (!query) return true;
    return [row.id, row.category, row.reference, row.notes].join(' ').toLowerCase().includes(query);
  });
  const estimateTable = useTable(estimateRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (filters.status !== 'All' && row.status !== filters.status) return false;
    if (!query) return true;
    return [row.id, row.product, row.bomId, row.revision, row.projectName, row.preparedBy].join(' ').toLowerCase().includes(query);
  });
  const materialTable = useTable(materialRows, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.materialCode, row.materialName, row.bomId, row.partNumber, row.projectName].join(' ').toLowerCase().includes(query);
  });
  const purchasedTable = useTable(purchased, (row, filters, query) => {
    if (filters.projectId !== 'All' && row.projectId !== filters.projectId) return false;
    if (!query) return true;
    return [row.componentCode, row.name, row.partNumber, row.bomId].join(' ').toLowerCase().includes(query);
  });

  const manufacturingRows = useMemo(
    () =>
      boms.map((bom) => {
        const bomMaterialCost = materialRequirementCost(bomMaterials(materials, bom.id));
        const bomPurchasedCost = bom.items.filter((item) => item.makeBuy === 'Buy').reduce((total, item) => total + bomItemTotal(item), 0);
        const bomLabour = labour.filter((row) => row.bomId === bom.id);
        const bomLabourCost = bomLabour.reduce((total, row) => total + Number(row.hours || 0) * Number(row.labourRate || 0), 0);
        const bomProcessCost = bomLabour.reduce((total, row) => total + Number(row.processRate || 0), 0);
        const other = Math.round((bomMaterialCost + bomPurchasedCost + bomLabourCost + bomProcessCost) * 0.03);
        return {
          ...bom,
          projectName: projectName(projects, bom.projectId),
          assemblyName: assemblyLabel(assemblies, bom.assemblyId),
          materialCost: bomMaterialCost,
          purchasedCost: bomPurchasedCost,
          labourCost: bomLabourCost,
          processCost: bomProcessCost,
          otherCost: other,
          totalCost: bomMaterialCost + bomPurchasedCost + bomLabourCost + bomProcessCost + other,
        };
      }),
    [boms, materials, labour, projects, assemblies],
  );

  const totals = useMemo(
    () => ({
      material: estimates.reduce((total, row) => total + Number(row.materialCost || 0), 0),
      purchased: estimates.reduce((total, row) => total + Number(row.purchasedCost || 0), 0),
      labour: estimates.reduce((total, row) => total + Number(row.labourCost || 0), 0),
      process: estimates.reduce((total, row) => total + Number(row.processCost || 0), 0),
      other: estimates.reduce((total, row) => total + Number(row.otherCost || 0), 0),
      total: estimates.reduce((total, row) => total + Number(row.totalCost || 0), 0),
    }),
    [estimates],
  );

  const costByAssembly = useMemo(() => {
    const map = new Map();
    manufacturingRows.forEach((row) => {
      const key = row.assemblyName || 'Unassigned assembly';
      map.set(key, (map.get(key) || 0) + row.totalCost);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [manufacturingRows]);

  const costByMaterial = useMemo(() => {
    const map = new Map();
    materialRows.forEach((row) => {
      const key = row.materialName || 'Other material';
      map.set(key, (map.get(key) || 0) + row.cost);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [materialRows]);

  const openLabourModal = (row) => {
    setLabourForm(row ? {
      projectId: row.projectId,
      bomId: row.bomId,
      component: row.component,
      process: row.process,
      operation: row.operation,
      hours: String(row.hours),
      labourRate: String(row.labourRate),
      processRate: String(row.processRate),
      engineer: row.engineer,
      notes: row.notes,
    } : EMPTY_LABOUR);
    setLabourModal(row || {});
  };

  const saveLabour = () => {
    if (!labourForm.component.trim() || !labourForm.operation.trim() || !labourForm.hours) {
      showToast('Component, operation and hours are required.', 'error');
      return;
    }
    const payload = {
      ...labourForm,
      hours: Number(labourForm.hours),
      labourRate: Number(labourForm.labourRate),
      processRate: Number(labourForm.processRate),
    };
    if (labourModal.id) updateLabour(labourModal.id, payload);
    else addLabour({ ...payload, id: `LAB-2026-${String(labour.length + 1).padStart(3, '0')}` });
    showToast('Labour / process estimate saved.');
    setLabourModal(null);
  };

  const openRateModal = (row) => {
    setRateForm(row ? {
      category: row.category,
      reference: row.reference,
      unit: row.unit,
      baseRate: String(row.baseRate),
      additionalCharges: String(row.additionalCharges),
      effectiveDate: row.effectiveDate,
      notes: row.notes,
    } : EMPTY_RATE);
    setRateModal(row || {});
  };

  const saveRate = () => {
    if (!rateForm.reference.trim() || !rateForm.baseRate) {
      showToast('Rate reference and base rate are required.', 'error');
      return;
    }
    const payload = {
      ...rateForm,
      baseRate: Number(rateForm.baseRate),
      additionalCharges: Number(rateForm.additionalCharges),
    };
    if (rateModal.id) updateRate(rateModal.id, payload);
    else addRate({ ...payload, id: `RATE-2026-${String(rates.length + 1).padStart(3, '0')}` });
    showToast('Rate analysis record saved.');
    setRateModal(null);
  };

  const kpis = {
    labour: labourCost(labour),
    material: materialRequirementCost(materials),
    purchased: purchased.reduce((total, row) => total + row.totalCost, 0),
    estimate: totals.total,
  };

  return (
    <>
      <SectionNav sections={SECTIONS} active={section} onChange={setSection} counts={{ estimates: estimates.length, labour: labour.length, rates: rates.length }} />

      {section === 'labour' && (
        <>
          <KpiGrid>
            <StatCard icon={Factory} label="Labour Rows" value={String(labour.length)} sub="Process estimates" tone="teal" />
            <StatCard icon={Coins} label="Estimated Labour Cost" value={money(kpis.labour)} sub="Hours × recorded rates (mock)" tone="emerald" />
            <StatCard icon={ClipboardList} label="Projects Covered" value={String(new Set(labour.map((row) => row.projectId)).size)} sub="Labour estimate projects" tone="blue" />
            <StatCard icon={Settings2} label="Processes" value={String(new Set(labour.map((row) => row.process)).size)} sub="Distinct process types" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={labourTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="labour-search" value={labourTable.search} onChange={labourTable.setSearch} placeholder="Search process, component..." ariaLabel="Search labour estimates" />
                <Button variant="secondary" size="sm" icon={Download} onClick={() => { exportCsv('labour-estimates', [{ key: 'id', label: 'Estimate ID' }, { key: 'component', label: 'Component' }, { key: 'process', label: 'Process' }, { key: 'hours', label: 'Hours' }, { key: 'cost', label: 'Estimated Cost' }], labourTable.sorted); showToast('CSV export prepared.'); }}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => openLabourModal(null)}>New Labour Estimate</Button>
              </>
            }
            count={labourTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Estimate ID', width: 88, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'projectId', label: 'Project', width: 96 },
                { key: 'bomId', label: 'BOM', width: 92 },
                { key: 'component', label: 'Component', width: 132, render: (row) => <span className="cell-strong bom-clip">{row.component}</span> },
                { key: 'process', label: 'Process', width: 92 },
                { key: 'operation', label: 'Operation', width: 138, render: (row) => <span className="bom-clip">{row.operation}</span> },
                { key: 'hours', label: 'Hours', width: 54, align: 'right' },
                { key: 'labourRate', label: 'Labour Rate', width: 78, align: 'right', render: (row) => money(row.labourRate) },
                { key: 'processRate', label: 'Process Rate', width: 84, align: 'right', render: (row) => money(row.processRate) },
                { key: 'cost', label: 'Est. Cost', width: 88, align: 'right', render: (row) => money(row.cost) },
              ]}
              rows={labourTable.pageRows}
              className="mech-register-table"
              rowActions={(row) => [
                { key: 'edit', label: 'Edit estimate', icon: Pencil },
                { key: 'delete', label: 'Delete estimate', icon: Trash2, danger: true, divider: true },
              ]}
              onRowAction={(key, row) => {
                if (key === 'edit') openLabourModal(row);
                if (key === 'delete') { removeLabour(row.id); showToast(`${row.id} deleted.`); }
              }}
              ariaLabel="Labour and process estimates"
              emptyContent={<EmptyState icon={Factory} title="No labour estimates" message="Add an estimate to price the process." />}
            />
            <Pagination page={labourTable.page} totalPages={Math.max(1, Math.ceil(labourTable.sorted.length / labourTable.pageSize))} pageSize={labourTable.pageSize} pageInfo={labourTable.pageInfo} onPageChange={labourTable.setPage} onPageSizeChange={(size) => { labourTable.setPageSize(size); labourTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'rates' && (
        <>
          <KpiGrid>
            <StatCard icon={Settings2} label="Rate Records" value={String(rates.length)} sub="Material, process and logistics rates" tone="teal" />
            <StatCard icon={Coins} label="Rate Categories" value={String(new Set(rates.map((row) => row.category)).size)} sub="Distinct categories" tone="blue" />
            <StatCard icon={ClipboardList} label="Material Rates" value={String(rates.filter((row) => row.category === 'Material').length)} sub="Material rate references" tone="emerald" />
            <StatCard icon={Factory} label="Process Rates" value={String(rates.filter((row) => row.category !== 'Material').length)} sub="Manufacturing and service rates" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={rateTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="rate-search" value={rateTable.search} onChange={rateTable.setSearch} placeholder="Search rate reference..." ariaLabel="Search rates" />
                <Button icon={Plus} size="sm" onClick={() => openRateModal(null)}>New Rate</Button>
              </>
            }
            count={rateTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Rate Ref', width: 96 },
                { key: 'category', label: 'Rate Category', width: 112 },
                { key: 'reference', label: 'Material / Process', width: 176, render: (row) => <span className="cell-strong">{row.reference}</span> },
                { key: 'unit', label: 'Unit', width: 56 },
                { key: 'baseRate', label: 'Base Rate', width: 84, align: 'right', render: (row) => money(row.baseRate) },
                { key: 'additionalCharges', label: 'Additional', width: 86, align: 'right', render: (row) => money(row.additionalCharges) },
                { key: 'effective', label: 'Effective', width: 90, render: (row) => formatDate(row.effectiveDate) },
                { key: 'notes', label: 'Notes', width: 190, render: (row) => <span className="cell-muted bom-clip">{row.notes}</span> },
              ]}
              rows={rateTable.pageRows}
              className="mech-register-table"
              rowActions={(row) => [
                { key: 'edit', label: 'Edit rate', icon: Pencil },
                { key: 'delete', label: 'Delete rate', icon: Trash2, danger: true, divider: true },
              ]}
              onRowAction={(key, row) => {
                if (key === 'edit') openRateModal(row);
                if (key === 'delete') { removeRate(row.id); showToast(`${row.id} deleted.`); }
              }}
              ariaLabel="Rate analysis register"
              emptyContent={<EmptyState icon={Settings2} title="No rates" message="Add rate analysis records to price estimates." />}
            />
            <Pagination page={rateTable.page} totalPages={Math.max(1, Math.ceil(rateTable.sorted.length / rateTable.pageSize))} pageSize={rateTable.pageSize} pageInfo={rateTable.pageInfo} onPageChange={rateTable.setPage} onPageSizeChange={(size) => { rateTable.setPageSize(size); rateTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'material' && (
        <>
          <KpiGrid>
            <StatCard icon={Boxes} label="Material Cost Rows" value={String(materialRows.length)} sub="From material BOM requirements" tone="teal" />
            <StatCard icon={Coins} label="Estimated Material Cost" value={money(kpis.material)} sub="Quantity × recorded rate (mock)" tone="emerald" />
            <StatCard icon={ClipboardList} label="Projects" value={String(new Set(materialRows.map((row) => row.projectId)).size)} sub="Projects with material cost" tone="blue" />
            <StatCard icon={Settings2} label="Materials" value={String(new Set(materialRows.map((row) => row.materialCode)).size)} sub="Distinct material codes" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={materialTable.reset}>Refresh</Button>}
            right={<SearchInput id="cost-material-search" value={materialTable.search} onChange={materialTable.setSearch} placeholder="Search material, BOM, part..." ariaLabel="Search material cost" />}
            count={materialTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'projectId', label: 'Project', width: 96 },
                { key: 'bomId', label: 'BOM Number', width: 96 },
                { key: 'materialCode', label: 'Material Code', width: 96 },
                { key: 'materialName', label: 'Material', width: 130, render: (row) => <span className="cell-strong">{row.materialName}</span> },
                { key: 'qty', label: 'Required Qty', width: 82, align: 'right' },
                { key: 'unit', label: 'Unit', width: 44 },
                { key: 'rate', label: 'Unit Rate', width: 82, align: 'right', render: (row) => money(row.rate) },
                { key: 'cost', label: 'Estimated Cost', width: 108, align: 'right', render: (row) => money(row.cost) },
              ]}
              rows={materialTable.pageRows}
              className="mech-register-table"
              ariaLabel="Material cost overview"
              emptyContent={<EmptyState icon={Boxes} title="No material cost" message="Material BOM requirements drive this view." />}
            />
            <Pagination page={materialTable.page} totalPages={Math.max(1, Math.ceil(materialTable.sorted.length / materialTable.pageSize))} pageSize={materialTable.pageSize} pageInfo={materialTable.pageInfo} onPageChange={materialTable.setPage} onPageSizeChange={(size) => { materialTable.setPageSize(size); materialTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'purchased' && (
        <>
          <KpiGrid>
            <StatCard icon={ShoppingCart} label="Purchased Components" value={String(purchased.length)} sub="Buy items in all BOMs" tone="teal" />
            <StatCard icon={Coins} label="Estimated Purchased Cost" value={money(kpis.purchased)} sub="Mock estimates, not quotations" tone="emerald" />
            <StatCard icon={ClipboardList} label="Projects" value={String(new Set(purchased.map((row) => row.projectId)).size)} sub="Projects with purchased cost" tone="blue" />
            <StatCard icon={BarChart3} label="Cost Reference" value="Estimate only" sub="Purchase owns actual prices" tone="orange" />
          </KpiGrid>
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={purchasedTable.reset}>Refresh</Button>}
            right={<SearchInput id="cost-purchased-search" value={purchasedTable.search} onChange={purchasedTable.setSearch} placeholder="Search component..." ariaLabel="Search purchased cost" />}
            count={purchasedTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'projectId', label: 'Project', width: 96 },
                { key: 'componentCode', label: 'Component Code', width: 100 },
                { key: 'name', label: 'Component', width: 160, render: (row) => <span className="cell-strong bom-clip">{row.name}</span> },
                { key: 'qty', label: 'Qty', width: 48, align: 'right' },
                { key: 'unitCost', label: 'Unit Cost', width: 88, align: 'right', render: (row) => money(row.unitCost) },
                { key: 'totalCost', label: 'Estimated Total', width: 110, align: 'right', render: (row) => money(row.totalCost) },
                { key: 'bomId', label: 'Cost Reference', width: 104 },
              ]}
              rows={purchasedTable.pageRows}
              className="mech-register-table"
              ariaLabel="Purchased component cost"
              emptyContent={<EmptyState icon={ShoppingCart} title="No purchased cost" message="Buy items on BOMs appear here." />}
            />
            <Pagination page={purchasedTable.page} totalPages={Math.max(1, Math.ceil(purchasedTable.sorted.length / purchasedTable.pageSize))} pageSize={purchasedTable.pageSize} pageInfo={purchasedTable.pageInfo} onPageChange={purchasedTable.setPage} onPageSizeChange={(size) => { purchasedTable.setPageSize(size); purchasedTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'manufacturing' && (
        <>
          <KpiGrid>
            <StatCard icon={Factory} label="Manufacturing Cost" value={money(manufacturingRows.reduce((total, row) => total + row.totalCost, 0))} sub="Material + purchased + labour + process" tone="teal" />
            <StatCard icon={Coins} label="Material" value={money(manufacturingRows.reduce((total, row) => total + row.materialCost, 0))} sub="From material BOM" tone="emerald" />
            <StatCard icon={ShoppingCart} label="Purchased" value={money(manufacturingRows.reduce((total, row) => total + row.purchasedCost, 0))} sub="Buy items" tone="blue" />
            <StatCard icon={BarChart3} label="Labour + Process" value={money(manufacturingRows.reduce((total, row) => total + row.labourCost + row.processCost, 0))} sub="Estimated conversion cost" tone="orange" />
          </KpiGrid>
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'BOM', width: 92 },
                { key: 'name', label: 'Product / Assembly', width: 180, render: (row) => <span className="cell-strong bom-clip">{row.name}</span> },
                { key: 'assemblyName', label: 'Assembly', width: 130, render: (row) => <span className="cell-muted bom-clip">{row.assemblyName}</span> },
                { key: 'materialCost', label: 'Material', width: 96, align: 'right', render: (row) => money(row.materialCost) },
                { key: 'purchasedCost', label: 'Purchased', width: 96, align: 'right', render: (row) => money(row.purchasedCost) },
                { key: 'labourCost', label: 'Labour', width: 88, align: 'right', render: (row) => money(row.labourCost) },
                { key: 'processCost', label: 'Process', width: 88, align: 'right', render: (row) => money(row.processCost) },
                { key: 'otherCost', label: 'Other', width: 78, align: 'right', render: (row) => money(row.otherCost) },
                { key: 'totalCost', label: 'Total', width: 104, align: 'right', render: (row) => <strong>{money(row.totalCost)}</strong> },
              ]}
              rows={manufacturingRows}
              className="mech-register-table"
              ariaLabel="Manufacturing cost breakdown"
              emptyContent={<EmptyState icon={Factory} title="No manufacturing cost" message="Create a BOM to see the cost breakdown." />}
            />
          </section>
          <p className="mech-footnote">Other charges are a 3% mock allowance. All values are illustrative frontend estimates.</p>
        </>
      )}

      {section === 'estimates' && (
        <>
          <KpiGrid>
            <StatCard icon={ClipboardList} label="Estimates" value={String(estimates.length)} sub="Cost estimation register" tone="teal" />
            <StatCard icon={Coins} label="Total Estimated" value={money(totals.total)} sub="All recorded estimates" tone="emerald" />
            <StatCard icon={BarChart3} label="Approved / Final" value={String(estimates.filter((row) => ['Approved', 'Finalized'].includes(row.status)).length)} sub="Estimates accepted" tone="blue" />
            <StatCard icon={Settings2} label="In Preparation" value={String(estimates.filter((row) => ['Draft', 'In Progress', 'Under Review'].includes(row.status)).length)} sub="Open estimates" tone="orange" />
          </KpiGrid>
          {revisionComparison.length > 0 && (
            <section className="table-card" style={{ marginBottom: '14px' }}>
              <div className="card-head">
                <div><h3 className="card-title">Cost by BOM Revision</h3><p className="card-subtitle">Latest saved estimate per BOM revision. Variance is calculated against the previous saved revision.</p></div>
              </div>
              <ManageColumns {...revisionCostColumns.managerProps} />
              <div className="table-wrap">
                <table className="data-table mfg-mini-table">
                  <thead>
                    <tr>
                      {revisionCostColumns.isVisible('bom') && <th>BOM</th>}
                      {revisionCostColumns.isVisible('revision') && <th>Revision</th>}
                      {revisionCostColumns.isVisible('estimate') && <th>Estimate</th>}
                      {revisionCostColumns.isVisible('status') && <th>Status</th>}
                      {revisionCostColumns.isVisible('total') && <th className="is-right">Estimated Total</th>}
                      {revisionCostColumns.isVisible('variance') && <th className="is-right">Variance</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {revisionComparison.map((row) => (
                      <tr key={`${row.bomId}-${row.revision}`}>
                        {revisionCostColumns.isVisible('bom') && <td className="cell-id">{row.bomId}</td>}
                        {revisionCostColumns.isVisible('revision') && <td>Rev {row.revision}</td>}
                        {revisionCostColumns.isVisible('estimate') && <td>{row.id}</td>}
                        {revisionCostColumns.isVisible('status') && <td><StatusBadge status={row.status} tone={statusTone(row.status)} /></td>}
                        {revisionCostColumns.isVisible('total') && <td className="is-right">{money(row.totalCost, row.currency)}</td>}
                        {revisionCostColumns.isVisible('variance') && <td className="is-right">{row.delta == null ? 'No prior revision' : `${row.delta >= 0 ? '+' : ''}${money(row.delta, row.currency)}`}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <Toolbar
            left={<Button variant="ghost" icon={RefreshCw} onClick={estimateTable.reset}>Refresh</Button>}
            right={
              <>
                <SearchInput id="estimate-search" value={estimateTable.search} onChange={estimateTable.setSearch} placeholder="Search estimate, product, BOM..." ariaLabel="Search cost estimates" />
                <Button variant="secondary" size="sm" icon={Download} onClick={() => { exportCsv('cost-estimates', [{ key: 'id', label: 'Estimate ID' }, { key: 'projectId', label: 'Project' }, { key: 'product', label: 'Product / Assembly' }, { key: 'bomId', label: 'BOM' }, { key: 'revision', label: 'BOM Revision' }, { key: 'materialCost', label: 'Material Cost' }, { key: 'manufacturingCost', label: 'Manufacturing / Processing' }, { key: 'labourCost', label: 'Labour Cost' }, { key: 'toolingCost', label: 'Tooling Cost' }, { key: 'inspectionCost', label: 'Inspection / Quality' }, { key: 'outsourcedCost', label: 'Outsourced Process' }, { key: 'otherCost', label: 'Other Costs' }, { key: 'subtotal', label: 'Subtotal' }, { key: 'additionalCost', label: 'Additional Cost' }, { key: 'contingencyPct', label: 'Contingency %' }, { key: 'totalCost', label: 'Total Estimated Cost' }, { key: 'status', label: 'Status' }], estimateTable.sorted); showToast('CSV export prepared.'); }}>Export</Button>
                <Button icon={Plus} size="sm" onClick={() => navigate('/bom-cost/estimate/new')}>New Estimate</Button>
              </>
            }
            count={estimateTable.pageInfo}
          />
          <section className="table-card">
            <DataTable
              columns={[
                { key: 'id', label: 'Estimate ID', width: 88, render: (row) => <span className="cell-id">{row.id}</span> },
                { key: 'projectName', label: 'Project', width: 120, render: (row) => <span className="cell-project"><span className="cell-id">{row.projectId}</span><span className="cell-muted">{row.projectName}</span></span> },
                { key: 'product', label: 'Product / Assembly', width: 150, render: (row) => <span className="cell-strong bom-clip">{row.product}</span> },
                { key: 'bomId', label: 'BOM', width: 88 },
                { key: 'revision', label: 'Rev', width: 46, align: 'center', render: (row) => (row.revision ? `Rev ${row.revision}` : '—') },
                { key: 'materialCost', label: 'Material', width: 84, align: 'right', render: (row) => money(row.materialCost) },
                { key: 'manufacturingCost', label: 'Mfg / Process', width: 88, align: 'right', render: (row) => money(row.manufacturingCost ?? row.processCost) },
                { key: 'labourCost', label: 'Labour', width: 78, align: 'right', render: (row) => money(row.labourCost) },
                { key: 'otherCost', label: 'Other', width: 72, align: 'right', render: (row) => money(row.otherCost) },
                { key: 'totalCost', label: 'Total', width: 100, align: 'right', render: (row) => <strong>{money(row.totalCost)}</strong> },
                { key: 'status', label: 'Status', width: 88, render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
              ]}
              rows={estimateTable.pageRows}
              className="mech-register-table"
              recordHref={(row) => `/bom-cost/estimate/${row.id}`}
              onRowClick={(row) => navigate(`/bom-cost/estimate/${row.id}`)}
              rowActions={(row) => [
                { key: 'view', label: 'View estimate', icon: Eye },
                ...(['Draft', 'In Progress'].includes(row.status) ? [{ key: 'edit', label: 'Edit estimate', icon: Pencil }] : []),
                ...(['Draft', 'In Progress'].includes(row.status) ? [{ key: 'submit', label: 'Submit for approval', icon: Send }] : []),
                ...(row.status === 'Under Review' ? [{ key: 'approve', label: 'Approve estimate', icon: ShieldCheck }] : []),
                ...(row.status === 'Approved' ? [{ key: 'finalize', label: 'Finalize estimate', icon: ClipboardList }] : []),
                ...(['Draft', 'In Progress'].includes(row.status) ? [{ key: 'delete', label: 'Delete estimate', icon: Trash2, danger: true, divider: true }] : []),
              ]}
              onRowAction={(key, row) => {
                if (key === 'view') navigate(`/bom-cost/estimate/${row.id}`);
                if (key === 'edit') navigate(`/bom-cost/estimate/${row.id}/edit`);
                if (key === 'submit') { updateEstimate(row.id, { status: 'Under Review' }); showToast(`${row.id} submitted for approval.`); }
                if (key === 'approve') { updateEstimate(row.id, { status: 'Approved' }); showToast(`${row.id} approved.`); }
                if (key === 'finalize') { updateEstimate(row.id, { status: 'Finalized' }); showToast(`${row.id} finalized.`); }
                if (key === 'delete') { removeEstimate(row.id); showToast(`${row.id} deleted.`); }
              }}
              ariaLabel="Cost estimation register"
              emptyContent={<EmptyState icon={ClipboardList} title="No estimates" message="Create a cost estimate to get started." />}
            />
            <Pagination page={estimateTable.page} totalPages={Math.max(1, Math.ceil(estimateTable.sorted.length / estimateTable.pageSize))} pageSize={estimateTable.pageSize} pageInfo={estimateTable.pageInfo} onPageChange={estimateTable.setPage} onPageSizeChange={(size) => { estimateTable.setPageSize(size); estimateTable.setPage(1); }} pageSizeOptions={[5, 10, 25]} />
          </section>
        </>
      )}

      {section === 'summary' && (
        <>
          <KpiGrid>
            <StatCard icon={Coins} label="Total Estimated Project Cost" value={money(totals.total)} sub="All estimates, mock values" tone="teal" />
            <StatCard icon={Boxes} label="Material Cost" value={money(totals.material)} sub="Material BOM estimate" tone="emerald" />
            <StatCard icon={ShoppingCart} label="Purchased Cost" value={money(totals.purchased)} sub="Buy component estimate" tone="blue" />
            <StatCard icon={Factory} label="Labour + Process" value={money(totals.labour + totals.process)} sub={`Other ${money(totals.other)}`} tone="orange" />
          </KpiGrid>
          <div className="bom-summary-grid">
            <section className="table-card bom-summary-card">
              <h3>Cost by Assembly</h3>
              <div className="bom-bars">
                {costByAssembly.map((row) => {
                  const max = Math.max(...costByAssembly.map((entry) => entry.value), 1);
                  return (
                    <div key={row.label} className="bom-bar-row">
                      <span className="bom-bar-label">{row.label}</span>
                      <span className="bom-bar-track"><span style={{ width: `${(row.value / max) * 100}%` }} /></span>
                      <span className="bom-bar-value">{money(row.value)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="table-card bom-summary-card">
              <h3>Cost by Material Category</h3>
              <div className="bom-bars">
                {costByMaterial.map((row) => {
                  const max = Math.max(...costByMaterial.map((entry) => entry.value), 1);
                  return (
                    <div key={row.label} className="bom-bar-row">
                      <span className="bom-bar-label">{row.label}</span>
                      <span className="bom-bar-track"><span style={{ width: `${(row.value / max) * 100}%` }} /></span>
                      <span className="bom-bar-value">{money(row.value)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <p className="mech-footnote">
            All cost values are frontend mock estimates. They are not vendor quotations, purchase prices or
            accounting costs.
          </p>
        </>
      )}

      <Modal
        open={Boolean(labourModal)}
        onClose={() => setLabourModal(null)}
        title={labourModal?.id ? 'Edit Labour / Process Estimate' : 'New Labour / Process Estimate'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLabourModal(null)}>Cancel</Button>
            <Button onClick={saveLabour}>Save Estimate</Button>
          </>
        }
      >
        <div className="form-grid">
          <Select id="labour-form-project" label="Project" options={projects.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} value={labourForm.projectId} onChange={(event) => setLabourForm((previous) => ({ ...previous, projectId: event.target.value }))} />
          <Select id="labour-form-bom" label="BOM" options={[{ value: '', label: 'Select BOM' }, ...boms.filter((bom) => bom.projectId === labourForm.projectId).map((bom) => ({ value: bom.id, label: `${bom.id} · ${bom.name}` }))]} value={labourForm.bomId} onChange={(event) => setLabourForm((previous) => ({ ...previous, bomId: event.target.value }))} />
          <Input id="labour-form-component" label="Component" value={labourForm.component} onChange={(event) => setLabourForm((previous) => ({ ...previous, component: event.target.value }))} />
          <Select id="labour-form-process" label="Process" options={['Machining', 'Fabrication', 'Welding', 'Sheet metal', 'Assembly', 'Surface treatment'].map((value) => ({ value, label: value }))} value={labourForm.process} onChange={(event) => setLabourForm((previous) => ({ ...previous, process: event.target.value }))} />
          <div className="form-grid-full"><Input id="labour-form-operation" label="Operation" value={labourForm.operation} onChange={(event) => setLabourForm((previous) => ({ ...previous, operation: event.target.value }))} /></div>
          <Input id="labour-form-hours" label="Estimated Labour Hours" type="number" value={labourForm.hours} onChange={(event) => setLabourForm((previous) => ({ ...previous, hours: event.target.value }))} />
          <Input id="labour-form-labour-rate" label="Labour Rate" type="number" value={labourForm.labourRate} onChange={(event) => setLabourForm((previous) => ({ ...previous, labourRate: event.target.value }))} />
          <Input id="labour-form-process-rate" label="Process Rate" type="number" value={labourForm.processRate} onChange={(event) => setLabourForm((previous) => ({ ...previous, processRate: event.target.value }))} />
          <Select id="labour-form-engineer" label="Responsible Engineer" options={ENGINEERS.map((value) => ({ value, label: value }))} value={labourForm.engineer} onChange={(event) => setLabourForm((previous) => ({ ...previous, engineer: event.target.value }))} />
          <div className="form-grid-full"><Textarea id="labour-form-notes" label="Notes" rows={2} value={labourForm.notes} onChange={(event) => setLabourForm((previous) => ({ ...previous, notes: event.target.value }))} /></div>
          <div className="form-field"><span className="form-label">Estimated Cost</span><span className="form-static">{money(Number(labourForm.hours || 0) * Number(labourForm.labourRate || 0) + Number(labourForm.processRate || 0))}</span></div>
        </div>
      </Modal>

      <Modal
        open={Boolean(rateModal)}
        onClose={() => setRateModal(null)}
        title={rateModal?.id ? 'Edit Rate Analysis' : 'New Rate Analysis'}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRateModal(null)}>Cancel</Button>
            <Button onClick={saveRate}>Save Rate</Button>
          </>
        }
      >
        <div className="form-grid">
          <Select id="rate-form-category" label="Rate Category" options={['Material', 'Machining', 'Fabrication', 'Welding', 'Sheet metal', 'Assembly', 'Surface treatment', 'Logistics'].map((value) => ({ value, label: value }))} value={rateForm.category} onChange={(event) => setRateForm((previous) => ({ ...previous, category: event.target.value }))} />
          <Input id="rate-form-reference" label="Material / Process" value={rateForm.reference} onChange={(event) => setRateForm((previous) => ({ ...previous, reference: event.target.value }))} />
          <Input id="rate-form-unit" label="Unit" value={rateForm.unit} onChange={(event) => setRateForm((previous) => ({ ...previous, unit: event.target.value }))} />
          <Input id="rate-form-base" label="Base Rate" type="number" value={rateForm.baseRate} onChange={(event) => setRateForm((previous) => ({ ...previous, baseRate: event.target.value }))} />
          <Input id="rate-form-additional" label="Additional Charges" type="number" value={rateForm.additionalCharges} onChange={(event) => setRateForm((previous) => ({ ...previous, additionalCharges: event.target.value }))} />
          <Input id="rate-form-effective" label="Effective Date" type="date" value={rateForm.effectiveDate} onChange={(event) => setRateForm((previous) => ({ ...previous, effectiveDate: event.target.value }))} />
          <div className="form-grid-full"><Textarea id="rate-form-notes" label="Notes" rows={2} value={rateForm.notes} onChange={(event) => setRateForm((previous) => ({ ...previous, notes: event.target.value }))} /></div>
        </div>
      </Modal>

      <Modal
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title="Cost Estimate"
        subtitle={viewTarget ? `${viewTarget.id} · ${viewTarget.product}` : ''}
        maxWidth="max-w-lg"
        footer={<Button variant="ghost" onClick={() => setViewTarget(null)}>Close</Button>}
      >
        {viewTarget && (
          <div className="fact-grid">
            <Fact label="Project">{`${viewTarget.projectId} · ${viewTarget.projectName}`}</Fact>
            <Fact label="BOM / Revision">{`${viewTarget.bomId} · Rev ${viewTarget.revision || '—'}`}</Fact>
            {COST_CATEGORIES.map((category) => (
              <Fact key={category.key} label={category.label}>{money(viewTarget[category.key])}</Fact>
            ))}
            <Fact label="Subtotal">{money(viewTarget.subtotal ?? viewTarget.totalCost)}</Fact>
            <Fact label="Additional Cost">{money(viewTarget.additionalCost)}</Fact>
            <Fact label="Contingency">{`${viewTarget.contingencyPct || 0}%`}</Fact>
            <Fact label="Total Estimated Cost">{money(viewTarget.totalCost)}</Fact>
            <Fact label="Assumptions">{viewTarget.assumptions || '—'}</Fact>
            <Fact label="Notes">{viewTarget.notes || '—'}</Fact>
            <Fact label="Currency">{viewTarget.currency}</Fact>
            <Fact label="Prepared By">{viewTarget.preparedBy}</Fact>
            <Fact label="Estimate Date">{formatDate(viewTarget.date)}</Fact>
            <Fact label="Status">{viewTarget.status}</Fact>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}

