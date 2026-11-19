import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Cog,
  DraftingCompass,
  Factory,
  FileCheck2,
  FolderKanban,
  Gauge,
  IndianRupee,
  Layers,
  Lightbulb,
  Link2,
  Ruler,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';

/**
 * Local mock data for the Mechanical Design workspace.
 *
 * Deterministic per (module, submodule): the same tab always renders the same
 * rows, while different tabs show different content so the tab navigation is
 * visibly working. No API, no persistence — this is shell data only.
 */

const ITEM_POOL = [
  'assembly drawing set',
  'gearbox housing',
  'bracket weldment',
  'bearing fit stack-up',
  'sheet metal enclosure',
  'piping isometric',
  'motor mount bracket',
  'control panel layout',
  'shaft tolerance study',
  'base frame fabrication',
  'coupling selection',
  'inspection plan',
];

const OWNERS = ['Design Admin', 'R. Kulkarni', 'S. Menon', 'A. Iyer', 'P. Deshmukh'];

const DISCIPLINES = ['Mechanical', 'Analysis', 'Sheet Metal', 'Piping', 'Drafting', 'BOM'];

const STATUS_CYCLE = ['In Design', 'In Review', 'Approved', 'Pending Review'];

const DUE_BASE = new Date('2026-11-20T00:00:00Z');

const KPI_DEFINITIONS = {
  projects: [
    { label: 'Active Projects', tone: 'teal', icon: FolderKanban },
    { label: 'Milestones Due', tone: 'amber', icon: CalendarClock },
    { label: 'Pending Reviews', tone: 'orange', icon: ClipboardCheck },
    { label: 'Team Members', tone: 'blue', icon: Users },
  ],
  planning: [
    { label: 'Planned Tasks', tone: 'teal', icon: ClipboardList },
    { label: 'In Progress', tone: 'blue', icon: Activity },
    { label: 'Resource Conflicts', tone: 'amber', icon: TriangleAlert },
    { label: 'Avg. Utilisation', tone: 'purple', icon: Gauge },
  ],
  conceptual: [
    { label: 'Concepts Open', tone: 'teal', icon: Lightbulb },
    { label: 'Feasibility Studies', tone: 'blue', icon: ClipboardList },
    { label: 'Awaiting Selection', tone: 'amber', icon: Clock3 },
    { label: 'Proposals Issued', tone: 'purple', icon: FileCheck2 },
  ],
  mechanical: [
    { label: 'Parts in Design', tone: 'teal', icon: Cog },
    { label: 'Assemblies', tone: 'blue', icon: Layers },
    { label: 'Calculations Pending', tone: 'amber', icon: Calculator },
    { label: 'Drawings Released', tone: 'purple', icon: DraftingCompass },
  ],
  analysis: [
    { label: 'Studies Open', tone: 'teal', icon: Activity },
    { label: 'FEA Runs', tone: 'blue', icon: Gauge },
    { label: 'Failed Checks', tone: 'red', icon: TriangleAlert },
    { label: 'Validation Reports', tone: 'green', icon: FileCheck2 },
  ],
  manufacturing: [
    { label: 'Machining Jobs', tone: 'teal', icon: Factory },
    { label: 'Drawings Issued', tone: 'blue', icon: DraftingCompass },
    { label: 'Inspection Points', tone: 'amber', icon: ClipboardCheck },
    { label: 'Work Instructions', tone: 'purple', icon: ClipboardList },
  ],
  bom: [
    { label: 'BOM Lines', tone: 'teal', icon: Boxes },
    { label: 'Awaiting Cost', tone: 'amber', icon: Calculator },
    { label: 'Costed Items', tone: 'green', icon: IndianRupee },
    { label: 'Open Revisions', tone: 'purple', icon: Layers },
  ],
  cad: [
    { label: 'Drawings Registered', tone: 'teal', icon: DraftingCompass },
    { label: 'Open Revisions', tone: 'amber', icon: Layers },
    { label: 'Transmittals', tone: 'blue', icon: ArrowRightLeft },
    { label: 'Pending Checks', tone: 'orange', icon: ClipboardCheck },
  ],
  approvals: [
    { label: 'Pending Reviews', tone: 'amber', icon: Clock3 },
    { label: 'In Review', tone: 'blue', icon: ClipboardCheck },
    { label: 'Changes Requested', tone: 'red', icon: TriangleAlert },
    { label: 'Approved Releases', tone: 'green', icon: CheckCircle2 },
  ],
  transfers: [
    { label: 'Packages Transferred', tone: 'teal', icon: ArrowRightLeft },
    { label: 'Requisitions Raised', tone: 'blue', icon: ClipboardList },
    { label: 'Production Open', tone: 'amber', icon: Factory },
    { label: 'Released Drawings', tone: 'purple', icon: DraftingCompass },
  ],
  reports: [
    { label: 'Reports Available', tone: 'teal', icon: BarChart3 },
    { label: 'Scheduled', tone: 'blue', icon: CalendarClock },
    { label: 'Delayed Items', tone: 'amber', icon: TriangleAlert },
    { label: 'Exports This Month', tone: 'purple', icon: FileCheck2 },
  ],
  settings: [
    { label: 'Engineering Domains', tone: 'teal', icon: Settings },
    { label: 'Drawing Standards', tone: 'blue', icon: Ruler },
    { label: 'Roles Defined', tone: 'purple', icon: ShieldCheck },
    { label: 'Integrations', tone: 'amber', icon: Link2 },
  ],
};

/** Stable string hash → deterministic mock values per module/tab. */
function hashKey(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100003;
  }
  return hash;
}

/** Seven mock records for one submodule. */
export function buildModuleRows(module, tab) {
  const seed = hashKey(`${module.key}:${tab.key}`);

  return Array.from({ length: 7 }, (_, index) => {
    const due = new Date(DUE_BASE);
    due.setUTCDate(due.getUTCDate() + ((seed + index * 5) % 30));

    return {
      id: `${module.kpiPrefix}-${1000 + ((seed + index * 137) % 8000)}`,
      title: `${tab.label} — ${ITEM_POOL[(seed + index * 3) % ITEM_POOL.length]}`,
      owner: OWNERS[(seed + index * 2) % OWNERS.length],
      discipline: DISCIPLINES[(seed + index) % DISCIPLINES.length],
      due: due.toISOString().slice(0, 10),
      status: STATUS_CYCLE[(seed + index) % STATUS_CYCLE.length],
      revision: `R${(seed + index) % 4}`,
    };
  });
}

/** Four KPI tiles for the active submodule (values change with the tab). */
export function buildModuleKpis(module, tab) {
  const seed = hashKey(`${module.key}:${tab.key}`);
  const definitions = KPI_DEFINITIONS[module.key] || KPI_DEFINITIONS.projects;
  const values = [13 + (seed % 12), 6 + (seed % 7), 2 + (seed % 5), 5 + (seed % 9)];

  return definitions.map((definition, index) => ({
    ...definition,
    key: `${tab.key}-${index}`,
    value: String(values[index]),
  }));
}

/** Drawing metadata shown beside the CAD viewer placeholders. */
export function buildViewerMeta(module, tab) {
  const seed = hashKey(`${module.key}:${tab.key}`);

  return [
    { label: 'Drawing No.', value: `${module.kpiPrefix}-${1000 + (seed % 900)}` },
    { label: 'Revision', value: `R${seed % 4}` },
    { label: 'Sheet', value: `${1 + (seed % 3)} of ${3 + (seed % 5)}` },
    { label: 'Units', value: seed % 2 === 0 ? 'Millimetres' : 'Inches' },
    { label: 'Scale', value: '1:2' },
    { label: 'Last Updated', value: '12 Nov 2026' },
  ];
}

/** Category options used by the list filter panel. */
export function buildOwnerOptions(rows) {
  const owners = Array.from(new Set(rows.map((row) => row.owner)));
  return [{ value: 'All', label: 'All Owners' }, ...owners.map((owner) => ({ value: owner, label: owner }))];
}

export function buildStatusOptions(rows) {
  const statuses = Array.from(new Set(rows.map((row) => row.status)));
  return [{ value: 'All', label: 'All Statuses' }, ...statuses.map((status) => ({ value: status, label: status }))];
}
