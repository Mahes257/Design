/**
 * Local mock data for Module 09 — BOM & Cost Estimation.
 *
 * Three workspaces share one reference model:
 *   1. BOM Management — engineering BOMs, material requirements, purchased
 *      components, quantity calculations and assembly mapping.
 *   2. Cost Planning & Estimation — labour/process, rates, material and
 *      purchased cost, manufacturing cost, estimates and summary.
 *   3. BOM Revision & Release — revisions, comparison, change history, review,
 *      approval and simulated Purchase/Production handovers.
 *
 * All quantities and costs are demonstration estimates. Nothing here is a
 * certified engineering calculation, vendor quotation or accounting figure.
 */
import { PROJECTS, TODAY, addDays, formatDate } from './projectData';
import { ASSEMBLIES, DESIGNS, PARTS } from './mechanicalData';

export { TODAY, addDays, formatDate };

export const BOM_STATUSES = [
  'Draft',
  'In Progress',
  'Under Review',
  'Changes Requested',
  'Approved',
  'Released',
  'Superseded',
  'Withdrawn',
];

export const EDITABLE_BOM_STATUSES = ['Draft', 'In Progress', 'Changes Requested'];

export function isBomEditable(bom) {
  return Boolean(bom && EDITABLE_BOM_STATUSES.includes(bom.status));
}

export const COST_STATUSES = ['Draft', 'In Progress', 'Under Review', 'Approved', 'Finalized'];
export const REVISION_STATUSES = ['Draft', 'Under Review', 'Approved', 'Released', 'Superseded', 'Withdrawn'];
export const TRANSFER_STATUSES = ['Draft', 'Ready', 'Submitted', 'Acknowledged', 'Rejected', 'Failed'];

export const MAKE_BUY = ['Make', 'Buy', 'Make / Buy'];
export const UNITS = ['nos', 'kg', 'm', 'set', 'lot'];
export function designForProject(projectId) {
  return DESIGNS.find((design) => design.projectId === projectId)?.id || '';
}

export const BOM_TYPES = ['Engineering (EBOM)', 'Manufacturing (MBOM)', 'Assembly BOM', 'Service BOM', 'Phantom BOM'];

export const COST_CATEGORIES = [
  { key: 'materialCost', label: 'Material Cost' },
  { key: 'manufacturingCost', label: 'Manufacturing / Processing Cost' },
  { key: 'labourCost', label: 'Labour Cost' },
  { key: 'toolingCost', label: 'Tooling Cost' },
  { key: 'inspectionCost', label: 'Inspection / Quality Cost' },
  { key: 'outsourcedCost', label: 'Outsourced Process Cost' },
  { key: 'otherCost', label: 'Other Cost' },
];

/** Subtotal of the estimate cost lines (quantity × unit cost). */
export function estimateSubtotal(estimate) {
  if (!estimate) return 0;
  if (Array.isArray(estimate.costLines) && estimate.costLines.length > 0) {
    return estimate.costLines.reduce(
      (total, line) => total + Number(line.qty || 0) * Number(line.unitCost || 0),
      0,
    );
  }
  return COST_CATEGORIES.reduce((total, category) => total + Number(estimate[category.key] || 0), 0);
}

export function estimateTotal(estimate) {
  if (!estimate) return 0;
  const subtotal = estimateSubtotal(estimate);
  const additional = Number(estimate.additionalCost || 0);
  const contingency = subtotal * (Number(estimate.contingencyPct || 0) / 100);
  return subtotal + additional + contingency;
}

export function costLinesFromEstimate(estimate) {
  if (!estimate) return COST_CATEGORIES.map((category) => ({ ...category, qty: '1', unitCost: '0' }));
  if (Array.isArray(estimate.costLines) && estimate.costLines.length > 0) {
    return COST_CATEGORIES.map((category) => {
      const line = estimate.costLines.find((row) => row.key === category.key) || {};
      return { ...category, qty: String(line.qty ?? '1'), unitCost: String(line.unitCost ?? '0') };
    });
  }
  return COST_CATEGORIES.map((category) => ({
    ...category,
    qty: '1',
    unitCost: String(
      category.key === 'materialCost'
        ? Number(estimate.materialCost || 0) + Number(estimate.purchasedCost || 0)
        : estimate[category.key] ?? 0,
    ),
  }));
}

const STATUS_TONES = {
  Draft: 'gray',
  Ready: 'blue',
  'In Progress': 'blue',
  'Under Review': 'orange',
  Submitted: 'orange',
  'Changes Requested': 'red',
  Rejected: 'red',
  Failed: 'red',
  Approved: 'green',
  Released: 'green',
  Acknowledged: 'green',
  Finalized: 'green',
  Superseded: 'purple',
  Withdrawn: 'gray',
};

export function statusTone(status) {
  return STATUS_TONES[status] || 'gray';
}

export const ENGINEERS = ['D. Rao', 'S. Menon', 'K. Pillai', 'R. Kulkarni', 'V. Sharma', 'P. Deshmukh', 'A. Iyer', 'N. Joshi'];
export const REVIEWERS = ['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'];
export const REVIEWER_PERSONA = 'N. Joshi';

export const MATERIAL_CATALOG = [
  { code: 'MAT-CS-001', name: 'Structural steel', grade: 'IS 2062 E250 BR', specification: 'Hot rolled plate and sections', unit: 'kg', rate: 78 },
  { code: 'MAT-CS-002', name: 'Cast iron', grade: 'FG260', specification: 'Grey cast iron casting, stress relieved', unit: 'kg', rate: 96 },
  { code: 'MAT-AL-001', name: 'Aluminium', grade: 'LM6', specification: 'Aluminium casting, machined', unit: 'kg', rate: 310 },
  { code: 'MAT-AL-002', name: 'Aluminium', grade: '6061-T6', specification: 'Extruded / rolled bar', unit: 'kg', rate: 385 },
  { code: 'MAT-SS-001', name: 'Stainless steel', grade: 'SS 304', specification: 'Sheet and bar, 2B finish', unit: 'kg', rate: 265 },
  { code: 'MAT-SS-002', name: 'Stainless steel', grade: 'SS 316L', specification: 'Sheet and bar, pickled', unit: 'kg', rate: 340 },
  { code: 'MAT-AS-001', name: 'Alloy steel', grade: 'EN19', specification: 'Round bar, quenched and tempered', unit: 'kg', rate: 118 },
  { code: 'MAT-AS-002', name: 'Alloy steel', grade: '20MnCr5', specification: 'Forged bar, case hardening grade', unit: 'kg', rate: 142 },
  { code: 'MAT-SM-001', name: 'Sheet metal', grade: 'CRCA 1.5', specification: 'Cold rolled close annealed sheet', unit: 'kg', rate: 92 },
  { code: 'MAT-SM-002', name: 'Sheet metal', grade: 'CRCA 2.0', specification: 'Cold rolled close annealed sheet', unit: 'kg', rate: 89 },
  { code: 'MAT-BR-001', name: 'Bearing steel', grade: '100Cr6', specification: 'Bearing set, purchased', unit: 'set', rate: 18500 },
  { code: 'MAT-PI-001', name: 'Pipe', grade: 'CS A106 Gr B', specification: 'Seamless pipe, DN50', unit: 'm', rate: 640 },
];

export function materialByCode(code) {
  return MATERIAL_CATALOG.find((row) => row.code === code) || null;
}

export function partForNumber(partNumber) {
  return PARTS.find((row) => row.partNumber === partNumber) || null;
}

export function projectName(projects, projectId) {
  return (projects || PROJECTS).find((row) => row.id === projectId)?.name || projectId;
}

export function assemblyLabel(assemblies, assemblyId) {
  const assembly = (assemblies || ASSEMBLIES).find((row) => row.id === assemblyId);
  return assembly ? `${assembly.number} · ${assembly.name}` : 'Not linked';
}

export function nextId(prefix, records = []) {
  const numbers = records
    .map((row) => Number(String(row.id).split('-').pop()))
    .filter((value) => Number.isFinite(value));
  return `${prefix}-2026-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0')}`;
}

export function nextRevision(revision) {
  const steps = ['A', 'B', 'C', 'D', 'E', 'F'];
  const index = steps.indexOf(revision);
  if (index === -1) return 'A';
  return steps[index + 1] || `${revision}1`;
}

export function itemPart(item) {
  return PARTS.find((row) => row.partNumber === item.partNumber) || null;
}

export function bomItemTotal(item) {
  return Number(item.qty || 0) * Number(item.unitCost || 0);
}

export function purchasedRows(boms) {
  return boms.flatMap((bom) =>
    (bom.items || [])
      .filter((item) => item.makeBuy === 'Buy')
      .map((item, index) => {
        const part = itemPart(item);
        return {
          key: `${bom.id}-${item.id}`,
          componentCode: `PUR-${bom.id.slice(-3)}-${String(index + 1).padStart(2, '0')}`,
          name: item.name,
          partNumber: item.partNumber,
          specification: item.description || part?.dimensions || 'Purchased to drawing specification',
          manufacturer: item.manufacturer || 'Equivalent approved make (mock reference)',
          qty: item.qty,
          unit: item.uom,
          unitCost: Number(item.unitCost || 0),
          totalCost: bomItemTotal(item),
          projectId: bom.projectId,
          bomId: bom.id,
          bomStatus: bom.status,
          purchaseStatus:
            bom.status === 'Released' ? 'Ready for handover' : bom.status === 'Approved' ? 'Awaiting release' : 'Not ready',
        };
      }),
  );
}

export function bomMaterials(materials, bomId) {
  return materials.filter((row) => row.bomId === bomId);
}

export function materialRequirementCost(materials) {
  return materials.reduce((total, row) => total + Number(row.qty || 0) * Number(row.rate || 0), 0);
}

export function purchasedComponentCost(purchased) {
  return purchased.reduce((total, row) => total + Number(row.totalCost || 0), 0);
}

export function labourCost(items) {
  return items.reduce(
    (total, row) =>
      total + Number(row.hours || 0) * Number(row.labourRate || 0) + Number(row.processRate || 0),
    0,
  );
}

/* --------------------------------------------------------------- seed helpers */
function item(partNumber, qty, makeBuy, unitCost = 0, overrides = {}) {
  const part = partForNumber(partNumber);
  return {
    id: '',
    itemNumber: '',
    partNumber,
    name: overrides.name || part?.name || 'Purchased item',
    description: overrides.description || part?.dimensions || '',
    specification: overrides.specification || part?.materialGrade || '',
    referenceDrawing: overrides.referenceDrawing || (part ? `DRG-${part.partNumber}` : ''),
    remarks: overrides.remarks || '',
    qty,
    uom: overrides.uom || part?.uom || 'nos',
    material: overrides.material || part?.material || '—',
    partRevision: overrides.partRevision || part?.revision || 'A',
    makeBuy,
    unitCost,
    assemblyId: overrides.assemblyId || part?.parentAssemblyId || '',
  };
}

function customItem(partNumber, name, qty, makeBuy, unitCost, extra = {}) {
  return {
    id: '',
    itemNumber: '',
    partNumber,
    name,
    description: extra.description || 'Project-specific item (mock data)',
    specification: extra.specification || '',
    referenceDrawing: extra.referenceDrawing || '',
    remarks: extra.remarks || '',
    qty,
    uom: extra.uom || 'nos',
    material: extra.material || '—',
    partRevision: extra.partRevision || 'A',
    makeBuy,
    unitCost,
    assemblyId: extra.assemblyId || '',
  };
}

function withIds(items, bomNumber) {
  return items.map((row, index) => ({
    ...row,
    id: row.id || `BI-${bomNumber}-${String(index + 1).padStart(2, '0')}`,
    itemNumber: row.itemNumber || String((index + 1) * 10),
  }));
}

function statusHistory(status, engineer, date, reviewer = 'N. Joshi') {
  const paths = {
    Draft: ['Draft'],
    'In Progress': ['Draft', 'In Progress'],
    'Under Review': ['Draft', 'In Progress', 'Under Review'],
    'Changes Requested': ['Draft', 'In Progress', 'Under Review', 'Changes Requested'],
    Approved: ['Draft', 'In Progress', 'Under Review', 'Approved'],
    Released: ['Draft', 'In Progress', 'Under Review', 'Approved', 'Released'],
    Superseded: ['Draft', 'In Progress', 'Under Review', 'Approved', 'Released', 'Superseded'],
    Withdrawn: ['Draft', 'Withdrawn'],
  };
  return (paths[status] || ['Draft']).map((entry, index) => ({
    id: `SH-${index + 1}`,
    status: entry,
    at: addDays(date, index * 3),
    by: entry === 'Approved' || entry === 'Released' ? reviewer : engineer,
    note:
      entry === 'Draft'
        ? 'BOM created as a draft.'
        : entry === 'In Progress'
          ? 'BOM structure being compiled.'
          : entry === 'Under Review'
            ? 'Submitted for engineering review.'
            : entry === 'Changes Requested'
              ? 'Reviewer requested changes.'
              : entry === 'Approved'
                ? 'BOM approved for release.'
                : entry === 'Released'
                  ? 'BOM released to Purchase and Production.'
                  : 'BOM superseded by a later revision.',
  }));
}

function changeHistory(status, engineer, date, reviewer) {
  return [
    { id: 'CH-1', at: date, by: engineer, action: 'BOM created', description: 'Initial engineering BOM structure compiled.' },
    {
      id: 'CH-2',
      at: addDays(date, 4),
      by: engineer,
      action: 'Items added',
      description: 'BOM items and material references added from approved designs.',
    },
    ...(status === 'Draft' || status === 'In Progress'
      ? []
      : [
          {
            id: 'CH-3',
            at: addDays(date, 9),
            by: engineer,
            action: 'Submitted for review',
            description: 'BOM submitted for engineering and cost review.',
          },
        ]),
    ...(['Approved', 'Released', 'Superseded'].includes(status)
      ? [
          {
            id: 'CH-4',
            at: addDays(date, 12),
            by: reviewer,
            action: 'Approved',
            description: 'BOM approved after review of structure and references.',
          },
        ]
      : []),
    ...(status === 'Released'
      ? [
          {
            id: 'CH-5',
            at: addDays(date, 15),
            by: 'Design Admin',
            action: 'Released',
            description: 'Release records prepared for Purchase and Production handover (mock).',
          },
        ]
      : []),
  ];
}

function bomSeed(index, config) {
  const id = `BOM-2026-${String(index + 1).padStart(3, '0')}`;
  const items = withIds(config.items, id.slice(-3));
  const revision = config.revision || 'A';
  return {
    id,
    name: config.name,
    projectId: config.projectId,
    designId:
      config.designId ||
      DESIGNS.find((design) => design.projectId === config.projectId)?.id ||
      '',
    assemblyId: config.assemblyId || '',
    bomType: config.bomType || BOM_TYPES[0],
    notes: config.notes || config.description || '',
    manufacturingDefinitionId: config.manufacturingDefinitionId || '',
    drawingId: config.drawingId || '',
    revision,
    status: config.status,
    engineer: config.engineer,
    reviewer: config.reviewer || 'N. Joshi',
    date: config.date,
    dueDate: addDays(config.date, 45),
    description: config.description,
    items,
    materials: config.materials || [],
    revisions: config.revisions || [
      {
        revision,
        previous: '',
        date: config.date,
        by: config.engineer,
        note: 'Initial BOM revision issued.',
        status: config.status,
        items,
      },
    ],
    approvals: config.approvals || (['Approved', 'Released', 'Superseded'].includes(config.status)
      ? [
          {
            id: `AP-${id}-1`,
            reviewer: config.reviewer || 'N. Joshi',
            date: addDays(config.date, 12),
            decision: 'Approved',
            comments: 'Structure, quantities and references verified against approved designs.',
          },
        ]
      : []),
    statusHistory: statusHistory(config.status, config.engineer, config.date, config.reviewer),
    changeHistory: changeHistory(config.status, config.engineer, config.date, config.reviewer),
    releaseRef: config.status === 'Released' ? `REL-2026-${String(index + 1).padStart(3, '0')}` : '',
  };
}

const gearboxItems = [
  item('MEC-041-001', 1, 'Make', 0, { material: 'FG260' }),
  item('MEC-041-002', 1, 'Make', 0, { material: 'EN19' }),
  item('MEC-041-003', 1, 'Make', 0, { material: '20MnCr5' }),
  item('MEC-041-004', 2, 'Buy', 18500, { material: '100Cr6' }),
  item('MEC-041-007', 1, 'Buy', 42000, { material: 'EP fabric / rubber' }),
  customItem('PUR-041-011', 'Gear motor 45 kW', 1, 'Buy', 285000, {
    description: 'Flange mounted gear motor, 45 kW, 1,450 rpm',
    assemblyId: 'ASM-2026-002',
  }),
];

export const BOMS = [
  bomSeed(0, {
    name: 'Conveyor drive assembly BOM',
    projectId: 'PRJ-2026-041',
    assemblyId: 'ASM-2026-001',
    revision: 'C',
    status: 'Released',
    engineer: 'R. Kulkarni',
    date: '2026-09-16',
    description: 'Engineering BOM for the conveyor drive assembly including purchased drive components.',
    items: gearboxItems,
    revisions: [
      {
        revision: 'A',
        previous: '',
        date: '2026-09-16',
        by: 'R. Kulkarni',
        note: 'Initial BOM with housing, shaft and purchased bearing set.',
        status: 'Superseded',
        items: withIds(gearboxItems.slice(0, 4), '001'),
      },
      {
        revision: 'B',
        previous: 'A',
        date: '2026-10-04',
        by: 'R. Kulkarni',
        note: 'Added gear pair and conveyor belt requirement.',
        status: 'Superseded',
        items: withIds(gearboxItems.slice(0, 5), '001'),
      },
      {
        revision: 'C',
        previous: 'B',
        date: '2026-10-26',
        by: 'R. Kulkarni',
        note: 'Added gear motor purchase reference and confirmed quantities.',
        status: 'Released',
        items: withIds(gearboxItems, '001'),
      },
    ],
    releaseRef: 'REL-2026-001',
  }),
  bomSeed(1, {
    name: 'Conveyor frame assembly BOM',
    projectId: 'PRJ-2026-038',
    assemblyId: 'ASM-2026-005',
    revision: 'B',
    status: 'Approved',
    engineer: 'K. Pillai',
    date: '2026-09-22',
    description: 'Structural BOM for the base frame, bracing and base plates.',
    items: [
      item('FAB-038-001', 1, 'Make', 0),
      item('FAB-038-002', 4, 'Make', 0),
      item('FAB-038-003', 8, 'Make', 0),
      customItem('PUR-038-021', 'Anchor bolt set M24', 32, 'Buy', 420, {
        description: 'Galvanised anchor bolts with nuts and washers',
        uom: 'set',
        material: 'IS 1367',
      }),
    ],
    revisions: [
      {
        revision: 'A',
        previous: '',
        date: '2026-09-22',
        by: 'K. Pillai',
        note: 'Initial frame BOM.',
        status: 'Superseded',
        items: withIds([item('FAB-038-001', 1, 'Make', 0), item('FAB-038-002', 4, 'Make', 0)], '002'),
      },
      {
        revision: 'B',
        previous: 'A',
        date: '2026-10-12',
        by: 'K. Pillai',
        note: 'Added base plates and anchor bolt set.',
        status: 'Approved',
        items: withIds(
          [
            item('FAB-038-001', 1, 'Make', 0),
            item('FAB-038-002', 4, 'Make', 0),
            item('FAB-038-003', 8, 'Make', 0),
            customItem('PUR-038-021', 'Anchor bolt set M24', 32, 'Buy', 420, { uom: 'set' }),
          ],
          '002',
        ),
      },
    ],
  }),
  bomSeed(2, {
    name: 'Control panel enclosure BOM',
    projectId: 'PRJ-2026-036',
    assemblyId: 'ASM-2026-006',
    revision: 'A',
    status: 'Under Review',
    engineer: 'V. Sharma',
    date: '2026-10-14',
    description: 'Sheet metal enclosure BOM with door hardware and mounting brackets.',
    items: [
      item('SMT-036-001', 2, 'Make', 0),
      item('SMT-036-002', 1, 'Make', 0),
      item('SMT-036-003', 4, 'Make', 0),
      customItem('PUR-036-031', 'Enclosure gasket EPDM', 6, 'Buy', 860, { description: 'EPDM gasket, 6 m roll', uom: 'm' }),
      customItem('PUR-036-032', 'Cam lock set', 2, 'Buy', 1450, { description: 'Stainless cam lock with keys', uom: 'set' }),
    ],
    revisions: [
      {
        revision: 'A',
        previous: '',
        date: '2026-10-14',
        by: 'V. Sharma',
        note: 'Initial enclosure BOM issued for review.',
        status: 'Under Review',
        items: withIds([item('SMT-036-001', 2, 'Make', 0), item('SMT-036-002', 1, 'Make', 0)], '003'),
      },
    ],
  }),
  bomSeed(3, {
    name: 'Utility skid piping BOM',
    projectId: 'PRJ-2026-033',
    assemblyId: 'ASM-2026-007',
    revision: 'A',
    status: 'Draft',
    engineer: 'P. Deshmukh',
    date: '2026-11-03',
    description: 'Piping spools, supports and valves for the utility skid.',
    items: [
      item('PIP-033-001', 6, 'Make', 0),
      item('PIP-033-002', 9, 'Make', 0),
      customItem('PUR-033-041', 'Gate valve DN50', 2, 'Buy', 12500, { description: 'Cast steel gate valve, DN50, PN16' }),
      customItem('PUR-033-042', 'Flange gasket DN50', 12, 'Buy', 180, { description: 'Spiral wound gasket, DN50' }),
    ],
    revisions: [
      {
        revision: 'A',
        previous: '',
        date: '2026-11-03',
        by: 'P. Deshmukh',
        note: 'Draft piping BOM.',
        status: 'Draft',
        items: withIds([item('PIP-033-001', 6, 'Make', 0)], '004'),
      },
    ],
  }),
  bomSeed(4, {
    name: 'Drive shaft subassembly BOM',
    projectId: 'PRJ-2026-031',
    assemblyId: 'ASM-2026-002',
    revision: 'B',
    status: 'Changes Requested',
    engineer: 'D. Rao',
    date: '2026-09-29',
    description: 'Shaft, bearing and coupling BOM for the drive shaft subassembly.',
    items: [
      item('MEC-041-002', 1, 'Make', 0),
      item('MEC-041-004', 2, 'Buy', 18500),
      customItem('PUR-031-051', 'Coupling H7/js6', 1, 'Buy', 16800, { description: 'Flexible coupling with taper bush' }),
      customItem('MAT-AS-001', 'EN19 bar stock allowance', 32, 'Make', 0, { uom: 'kg', material: 'EN19' }),
    ],
    revisions: [
      {
        revision: 'A',
        previous: '',
        date: '2026-09-29',
        by: 'D. Rao',
        note: 'Initial shaft BOM.',
        status: 'Superseded',
        items: withIds([item('MEC-041-002', 1, 'Make', 0), item('MEC-041-004', 2, 'Buy', 18500)], '005'),
      },
      {
        revision: 'B',
        previous: 'A',
        date: '2026-10-19',
        by: 'D. Rao',
        note: 'Coupling reference updated; material allowance added.',
        status: 'Changes Requested',
        items: withIds(
          [
            item('MEC-041-002', 1, 'Make', 0),
            item('MEC-041-004', 2, 'Buy', 18500),
            customItem('PUR-031-051', 'Coupling H7/js6', 1, 'Buy', 16800),
            customItem('MAT-AS-001', 'EN19 bar stock allowance', 32, 'Make', 0, { uom: 'kg', material: 'EN19' }),
          ],
          '005',
        ),
      },
    ],
    approvals: [
      {
        id: 'AP-BOM-2026-005-1',
        reviewer: 'N. Joshi',
        date: '2026-10-24',
        decision: 'Changes Requested',
        comments: 'Confirm coupling fit and add material grade to the purchased components section.',
      },
    ],
  }),
  bomSeed(5, {
    name: 'Motor mount bracket BOM',
    projectId: 'PRJ-2026-029',
    revision: 'A',
    status: 'Released',
    engineer: 'N. Joshi',
    date: '2026-09-18',
    description: 'Single-part BOM with fasteners for the motor mount bracket.',
    items: [
      item('MEC-041-006', 1, 'Make', 0),
      customItem('PUR-029-061', 'Mounting bolt M16×60', 8, 'Buy', 210, { description: 'Grade 8.8 bolt with washer' }),
    ],
    revisions: [
      {
        revision: 'A',
        previous: '',
        date: '2026-09-18',
        by: 'N. Joshi',
        note: 'Initial released bracket BOM.',
        status: 'Released',
        items: withIds([item('MEC-041-006', 1, 'Make', 0), customItem('PUR-029-061', 'Mounting bolt M16×60', 8, 'Buy', 210)], '006'),
      },
    ],
    releaseRef: 'REL-2026-002',
  }),
  bomSeed(6, {
    name: 'Gearbox lubrication unit BOM',
    projectId: 'PRJ-2026-026',
    revision: 'A',
    status: 'In Progress',
    engineer: 'S. Menon',
    date: '2026-10-30',
    description: 'Lubrication pump, reservoir and piping BOM for the gearbox unit.',
    items: [
      customItem('PUR-026-071', 'Lubrication pump 6 l/min', 1, 'Buy', 38500, { description: 'Gear pump with relief valve' }),
      customItem('FAB-026-072', 'Oil reservoir 20 L', 1, 'Make', 0, { material: 'IS 2062 E250 BR', uom: 'nos' }),
      customItem('PUR-026-073', 'Suction strainer', 2, 'Buy', 1650, { description: '80 mesh suction strainer' }),
    ],
    revisions: [
      { revision: 'A', previous: '', date: '2026-10-30', by: 'S. Menon', note: 'Work-in-progress lubrication BOM.', status: 'In Progress', items: [] },
    ],
  }),
  bomSeed(7, {
    name: 'Hydraulic press frame BOM',
    projectId: 'PRJ-2026-024',
    revision: 'A',
    status: 'Draft',
    engineer: 'A. Iyer',
    date: '2026-11-06',
    description: 'Frame plates, columns and hydraulic cylinder references for the press frame.',
    items: [
      customItem('FAB-024-081', 'Press frame side plate', 2, 'Make', 0, { material: 'IS 2062 E350', uom: 'nos' }),
      customItem('FAB-024-082', 'Press column 300×300', 4, 'Make', 0, { material: 'IS 2062 E350', uom: 'nos' }),
      customItem('PUR-024-083', 'Hydraulic cylinder 250 T', 2, 'Buy', 185000, { description: 'Tie-rod cylinder, 250 T capacity' }),
    ],
    revisions: [
      { revision: 'A', previous: '', date: '2026-11-06', by: 'A. Iyer', note: 'Draft press frame BOM.', status: 'Draft', items: [] },
    ],
  }),
];

/* ------------------------------------------------------- material requirements */
const MATERIAL_REQUIREMENTS = [
  { id: 'MREQ-2026-001', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', partNumber: 'MEC-041-001', materialCode: 'MAT-CS-002', qty: 128, rate: 96 },
  { id: 'MREQ-2026-002', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', partNumber: 'MEC-041-002', materialCode: 'MAT-AS-001', qty: 26, rate: 118 },
  { id: 'MREQ-2026-003', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', partNumber: 'MEC-041-003', materialCode: 'MAT-AS-002', qty: 48, rate: 142 },
  { id: 'MREQ-2026-004', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', partNumber: 'FAB-038-001', materialCode: 'MAT-CS-001', qty: 640, rate: 78 },
  { id: 'MREQ-2026-005', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', partNumber: 'FAB-038-003', materialCode: 'MAT-CS-001', qty: 86, rate: 78 },
  { id: 'MREQ-2026-006', projectId: 'PRJ-2026-036', bomId: 'BOM-2026-003', partNumber: 'SMT-036-001', materialCode: 'MAT-SM-001', qty: 24, rate: 92 },
  { id: 'MREQ-2026-007', projectId: 'PRJ-2026-036', bomId: 'BOM-2026-003', partNumber: 'SMT-036-003', materialCode: 'MAT-SS-001', qty: 4, rate: 265 },
  { id: 'MREQ-2026-008', projectId: 'PRJ-2026-033', bomId: 'BOM-2026-004', partNumber: 'PIP-033-001', materialCode: 'MAT-PI-001', qty: 18, rate: 640 },
  { id: 'MREQ-2026-009', projectId: 'PRJ-2026-031', bomId: 'BOM-2026-005', partNumber: 'MEC-041-002', materialCode: 'MAT-AS-001', qty: 32, rate: 118 },
  { id: 'MREQ-2026-010', projectId: 'PRJ-2026-029', bomId: 'BOM-2026-006', partNumber: 'MEC-041-006', materialCode: 'MAT-AL-001', qty: 14, rate: 310 },
  { id: 'MREQ-2026-011', projectId: 'PRJ-2026-026', bomId: 'BOM-2026-007', partNumber: 'FAB-026-072', materialCode: 'MAT-CS-001', qty: 42, rate: 78 },
  { id: 'MREQ-2026-012', projectId: 'PRJ-2026-024', bomId: 'BOM-2026-008', partNumber: 'FAB-024-081', materialCode: 'MAT-CS-001', qty: 1_240, rate: 78 },
].map((row) => ({ ...row, unit: materialByCode(row.materialCode)?.unit || 'kg' }));

/* ---------------------------------------------------------- quantity calculations */
const QUANTITY_CALCULATIONS = [
  { id: 'QC-2026-001', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', partNumber: 'MEC-041-001', component: 'Gearbox housing casting', baseQty: 1, requiredQty: 1, unit: 'nos', allowance: 0, finalQty: 1, notes: 'One casting per assembly; no machining allowance on the casting quantity.' },
  { id: 'QC-2026-002', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', partNumber: 'MEC-041-004', component: 'Bearing set 32217', baseQty: 2, requiredQty: 2, unit: 'set', allowance: 0, finalQty: 2, notes: 'Two bearings per drive assembly; no spares included.' },
  { id: 'QC-2026-003', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', partNumber: 'MEC-041-007', component: 'Conveyor belt 1200 EP', baseQty: 42, requiredQty: 42, unit: 'm', allowance: 5, finalQty: 44.1, notes: '5% allowance for splicing and trimming (mock estimate).' },
  { id: 'QC-2026-004', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', partNumber: 'FAB-038-002', component: 'Diagonal brace', baseQty: 4, requiredQty: 4, unit: 'nos', allowance: 0, finalQty: 4, notes: 'Four braces per frame.' },
  { id: 'QC-2026-005', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', partNumber: 'FAB-038-003', component: 'Base plate 12 mm', baseQty: 8, requiredQty: 8, unit: 'nos', allowance: 0, finalQty: 8, notes: 'Eight foundation plates.' },
  { id: 'QC-2026-006', projectId: 'PRJ-2026-036', bomId: 'BOM-2026-003', partNumber: 'SMT-036-001', component: 'Enclosure side panel', baseQty: 2, requiredQty: 2, unit: 'nos', allowance: 10, finalQty: 2.2, notes: '10% material allowance for blanking and bend scrap (mock estimate).' },
  { id: 'QC-2026-007', projectId: 'PRJ-2026-033', bomId: 'BOM-2026-004', partNumber: 'PIP-033-001', component: 'Pipe spool DN50', baseQty: 6, requiredQty: 6, unit: 'nos', allowance: 0, finalQty: 6, notes: 'Six spools per skid.' },
  { id: 'QC-2026-008', projectId: 'PRJ-2026-031', bomId: 'BOM-2026-005', partNumber: 'MEC-041-002', component: 'Input shaft bar stock', baseQty: 26, requiredQty: 32, unit: 'kg', allowance: 15, finalQty: 36.8, notes: 'Bar stock allowance includes 15% machining loss (mock estimate).' },
].map((row) => ({ ...row, status: 'Draft', engineer: ENGINEERS[0], recordDate: '2026-10-05' }));

/* --------------------------------------------------------------- labour estimates */
const LABOUR_ESTIMATES = [
  { id: 'LAB-2026-001', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', component: 'Gearbox housing', process: 'Machining', operation: 'Bore and face machining', hours: 6, labourRate: 420, processRate: 0, engineer: 'D. Rao', notes: 'Two setups on boring mill.' },
  { id: 'LAB-2026-002', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', component: 'Input shaft', process: 'Machining', operation: 'Turning and journal grinding', hours: 4, labourRate: 420, processRate: 0, engineer: 'D. Rao', notes: 'Includes grinding after heat treatment.' },
  { id: 'LAB-2026-003', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', component: 'Drive assembly', process: 'Assembly', operation: 'Assemble and align drive', hours: 8, labourRate: 380, processRate: 2500, engineer: 'R. Kulkarni', notes: 'Process rate covers assembly stand and alignment equipment.' },
  { id: 'LAB-2026-004', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', component: 'Base frame', process: 'Fabrication', operation: 'Cut, fit up and weld', hours: 12, labourRate: 350, processRate: 1800, engineer: 'K. Pillai', notes: 'Fabrication bay and welding positioner.' },
  { id: 'LAB-2026-005', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', component: 'Base plates', process: 'Machining', operation: 'Mill faces and drill holes', hours: 3, labourRate: 400, processRate: 900, engineer: 'K. Pillai', notes: 'Eight plates per frame.' },
  { id: 'LAB-2026-006', projectId: 'PRJ-2026-036', bomId: 'BOM-2026-003', component: 'Enclosure panels', process: 'Sheet metal', operation: 'Blank, punch and bend', hours: 3.5, labourRate: 320, processRate: 1200, engineer: 'V. Sharma', notes: 'Press brake and turret punch.' },
  { id: 'LAB-2026-007', projectId: 'PRJ-2026-036', bomId: 'BOM-2026-003', component: 'Enclosure assembly', process: 'Assembly', operation: 'Fit door, hardware and gasket', hours: 4, labourRate: 320, processRate: 0, engineer: 'V. Sharma', notes: 'Final fit-up before dispatch.' },
  { id: 'LAB-2026-008', projectId: 'PRJ-2026-033', bomId: 'BOM-2026-004', component: 'Pipe spools', process: 'Welding', operation: 'Fit up and weld spools', hours: 9, labourRate: 360, processRate: 2200, engineer: 'P. Deshmukh', notes: 'WPS-004 welding procedure.' },
  { id: 'LAB-2026-009', projectId: 'PRJ-2026-031', bomId: 'BOM-2026-005', component: 'Input shaft', process: 'Machining', operation: 'Turn, keyway and grind', hours: 4, labourRate: 420, processRate: 0, engineer: 'D. Rao', notes: 'Same routing as drive shaft.' },
  { id: 'LAB-2026-010', projectId: 'PRJ-2026-029', bomId: 'BOM-2026-006', component: 'Motor mount bracket', process: 'Machining', operation: 'Machine mounting pads and bores', hours: 2, labourRate: 400, processRate: 600, engineer: 'N. Joshi', notes: 'Single fixture setup.' },
  { id: 'LAB-2026-011', projectId: 'PRJ-2026-024', bomId: 'BOM-2026-008', component: 'Press frame plates', process: 'Fabrication', operation: 'Cut and prepare plate edges', hours: 16, labourRate: 350, processRate: 2400, engineer: 'A. Iyer', notes: 'Heavy plate handling allowance.' },
];

/* ------------------------------------------------------------------ rate analysis */
const RATE_ANALYSIS = [
  { id: 'RATE-2026-001', category: 'Material', reference: 'IS 2062 E250 BR plate', unit: 'kg', baseRate: 72, additionalCharges: 6, effectiveDate: '2026-10-01', notes: 'Rate including cutting and handling allowance (mock).' },
  { id: 'RATE-2026-002', category: 'Material', reference: 'FG260 casting', unit: 'kg', baseRate: 86, additionalCharges: 10, effectiveDate: '2026-10-01', notes: 'Includes stress relieving.' },
  { id: 'RATE-2026-003', category: 'Material', reference: 'EN19 bar', unit: 'kg', baseRate: 108, additionalCharges: 10, effectiveDate: '2026-10-01', notes: 'Quenched and tempered bar.' },
  { id: 'RATE-2026-004', category: 'Machining', reference: 'CNC boring mill', unit: 'hour', baseRate: 420, additionalCharges: 0, effectiveDate: '2026-09-15', notes: 'Shop rate excluding tooling.' },
  { id: 'RATE-2026-005', category: 'Machining', reference: 'CNC lathe', unit: 'hour', baseRate: 400, additionalCharges: 0, effectiveDate: '2026-09-15', notes: 'Shop rate per hour.' },
  { id: 'RATE-2026-006', category: 'Fabrication', reference: 'Fabrication bay', unit: 'hour', baseRate: 350, additionalCharges: 25, effectiveDate: '2026-09-15', notes: 'Includes welding positioner.' },
  { id: 'RATE-2026-007', category: 'Welding', reference: 'GMAW welding', unit: 'hour', baseRate: 360, additionalCharges: 40, effectiveDate: '2026-09-15', notes: 'Consumables included.' },
  { id: 'RATE-2026-008', category: 'Sheet metal', reference: 'Press brake', unit: 'hour', baseRate: 320, additionalCharges: 15, effectiveDate: '2026-10-01', notes: 'Tooling setup charged separately when applicable.' },
  { id: 'RATE-2026-009', category: 'Assembly', reference: 'Assembly bay', unit: 'hour', baseRate: 380, additionalCharges: 0, effectiveDate: '2026-10-01', notes: 'Skilled fitter rate.' },
  { id: 'RATE-2026-010', category: 'Surface treatment', reference: 'Primer and paint', unit: 'sqm', baseRate: 240, additionalCharges: 30, effectiveDate: '2026-10-01', notes: 'Two-coat system, mock rate.' },
  { id: 'RATE-2026-011', category: 'Logistics', reference: 'Inbound freight', unit: 'lot', baseRate: 8500, additionalCharges: 0, effectiveDate: '2026-10-01', notes: 'Indicative freight for the project (mock).' },
];

/* ---------------------------------------------------------------- cost estimates */
const COST_ESTIMATES = [
  { id: 'CST-2026-001', projectId: 'PRJ-2026-041', bomId: 'BOM-2026-001', product: 'Conveyor drive assembly', materialCost: 66_700, purchasedCost: 385_250, labourCost: 6_260, processCost: 2_500, otherCost: 12_000, totalCost: 472_710, currency: 'INR', preparedBy: 'R. Kulkarni', date: '2026-10-28', status: 'Approved' },
  { id: 'CST-2026-002', projectId: 'PRJ-2026-038', bomId: 'BOM-2026-002', product: 'Conveyor frame assembly', materialCost: 62_000, purchasedCost: 13_440, labourCost: 5_700, processCost: 2_700, otherCost: 6_000, totalCost: 89_840, currency: 'INR', preparedBy: 'K. Pillai', date: '2026-10-15', status: 'Under Review' },
  { id: 'CST-2026-003', projectId: 'PRJ-2026-036', bomId: 'BOM-2026-003', product: 'Control panel enclosure', materialCost: 3_270, purchasedCost: 6_280, labourCost: 2_400, processCost: 1_200, otherCost: 1_500, totalCost: 14_650, currency: 'INR', preparedBy: 'V. Sharma', date: '2026-10-20', status: 'Draft' },
  { id: 'CST-2026-004', projectId: 'PRJ-2026-033', bomId: 'BOM-2026-004', product: 'Utility skid piping', materialCost: 11_520, purchasedCost: 30_100, labourCost: 3_240, processCost: 2_200, otherCost: 2_500, totalCost: 49_560, currency: 'INR', preparedBy: 'P. Deshmukh', date: '2026-11-05', status: 'Draft' },
  { id: 'CST-2026-005', projectId: 'PRJ-2026-031', bomId: 'BOM-2026-005', product: 'Drive shaft subassembly', materialCost: 3_776, purchasedCost: 53_800, labourCost: 1_680, processCost: 0, otherCost: 1_200, totalCost: 60_456, currency: 'INR', preparedBy: 'D. Rao', date: '2026-10-22', status: 'In Progress' },
  { id: 'CST-2026-006', projectId: 'PRJ-2026-029', bomId: 'BOM-2026-006', product: 'Motor mount bracket', materialCost: 4_340, purchasedCost: 1_680, labourCost: 800, processCost: 600, otherCost: 500, totalCost: 7_920, currency: 'INR', preparedBy: 'N. Joshi', date: '2026-09-24', status: 'Finalized' },
  { id: 'CST-2026-007', projectId: 'PRJ-2026-024', bomId: 'BOM-2026-008', product: 'Hydraulic press frame', materialCost: 99_120, purchasedCost: 370_000, labourCost: 5_600, processCost: 2_400, otherCost: 18_000, totalCost: 495_120, currency: 'INR', preparedBy: 'A. Iyer', date: '2026-11-08', status: 'Draft' },
];

/* -------------------------------------------------------------------- transfers */
const TRANSFERS = [
  { id: 'TRF-2026-001', bomId: 'BOM-2026-001', projectId: 'PRJ-2026-041', destination: 'Purchase', revision: 'C', date: '2026-10-30', status: 'Acknowledged', remarks: 'Material and purchased component requirements handed over (simulated).' },
  { id: 'TRF-2026-002', bomId: 'BOM-2026-001', projectId: 'PRJ-2026-041', destination: 'Production', revision: 'C', date: '2026-10-30', status: 'Submitted', remarks: 'Part list and material specifications sent (simulated).' },
  { id: 'TRF-2026-003', bomId: 'BOM-2026-006', projectId: 'PRJ-2026-029', destination: 'Purchase', revision: 'A', date: '2026-09-26', status: 'Acknowledged', remarks: 'Fastener purchase requirement handed over (simulated).' },
  { id: 'TRF-2026-004', bomId: 'BOM-2026-006', projectId: 'PRJ-2026-029', destination: 'Production', revision: 'A', date: '2026-09-26', status: 'Ready', remarks: 'Awaiting simulated production acknowledgement.' },
  { id: 'TRF-2026-005', bomId: 'BOM-2026-002', projectId: 'PRJ-2026-038', destination: 'Purchase', revision: 'B', date: '2026-10-16', status: 'Rejected', remarks: 'Mock rejection: base plate revision must be confirmed before handover.' },
];

export { MATERIAL_REQUIREMENTS, QUANTITY_CALCULATIONS, LABOUR_ESTIMATES, RATE_ANALYSIS, COST_ESTIMATES, TRANSFERS };

export function itemsForRevision(bom, revision) {
  const entry = (bom.revisions || []).find((row) => row.revision === revision);
  if (!entry) return bom.items || [];
  if (revision === bom.revision) return bom.items || [];
  return entry.items || [];
}

export function bomRevisionRows(boms) {
  return boms.flatMap((bom) =>
    (bom.revisions || []).map((entry) => ({
      key: `${bom.id}-${entry.revision}`,
      bomId: bom.id,
      bomName: bom.name,
      projectId: bom.projectId,
      revision: entry.revision,
      previous: entry.previous,
      date: entry.date,
      by: entry.by,
      note: entry.note,
      changeReason:
        entry.changeReason ||
        (entry.previous ? 'Engineering change recorded in the revision description.' : 'Initial BOM revision issued.'),
      status: entry.status,
      reviewStatus:
        entry.status === 'Draft'
          ? 'Not submitted'
          : entry.status === 'Under Review'
            ? 'Under review'
            : entry.status === 'Changes Requested'
              ? 'Changes requested'
              : ['Approved', 'Released', 'Superseded'].includes(entry.status)
                ? 'Reviewed'
                : entry.status,
      approvalStatus: ['Approved', 'Released', 'Superseded'].includes(entry.status)
        ? 'Approved'
        : entry.status === 'Changes Requested'
          ? 'Revision required'
          : 'Pending',
      releaseDate: entry.releasedAt || (entry.status === 'Released' ? entry.date : ''),
      current: entry.revision === bom.revision,
      itemCount: (entry.items || []).length,
      items: entry.items || [],
    })),
  );
}
