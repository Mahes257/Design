import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Lightbulb,
  Cog,
  Activity,
  Factory,
  Boxes,
  DraftingCompass,
  ClipboardCheck,
  ArrowRightLeft,
  PackageCheck,
  BarChart3,
  Settings,
  Handshake,
  MessagesSquare,
  ShieldCheck,
  FileSearch,
  GitPullRequest,
  FlaskConical,
} from 'lucide-react';

/**
 * Mechanical Design navigation model.
 *
 * The sidebar shows ONLY the implemented main modules. Every module owns its submodules
 * as horizontal, route-backed tabs rendered inside the module page (the same
 * pattern as the reference ERP's RFQ & Quotations page), not as sidebar
 * children.
 *
 * A module's first tab lives on the module's base route (e.g. /projects); every
 * other tab appends its slug (e.g. /projects/new-project), so direct URLs and
 * refreshes work.
 */
function defineModule({ key, label, base, icon, description, cta, kpiPrefix, tabs }) {
  return {
    key,
    label,
    base,
    icon,
    description,
    cta,
    kpiPrefix,
    tabs: tabs.map((tab) => ({
      ...tab,
      path: tab.slug ? `${base}/${tab.slug}` : base,
    })),
  };
}

export const MODULES = [
  {
    key: 'customer-sales',
    label: 'Enquiry & Request Management',
    base: '/customer-sales',
    icon: Handshake,
    description:
      'Receive and manage customer, R&D / PDE, service and inter-department requests through one register, technical assessment and customer quotation workflow.',
    cta: 'Add New Request',
    kpiPrefix: 'REQ',
    tabs: [
      {
        key: 'request-register',
        label: 'Request Register',
        path: '/customer-sales',
      },
      {
        key: 'technical-assessment',
        label: 'Technical Assessment',
        path: '/customer-sales/assessment',
      },
      {
        key: 'quotation-commercial',
        label: 'Quotation & Commercial Review',
        path: '/customer-sales/commercial',
      },
    ],
  },
  defineModule({
    key: 'customer-enquiries',
    label: 'Customer Enquiry / Requirement',
    base: '/customer-enquiries',
    icon: MessagesSquare,
    description: 'Capture and qualify customer requirements before quotation or engineering project creation.',
    cta: 'New Enquiry',
    kpiPrefix: 'ENQ',
    tabs: [],
  }),
  defineModule({
    key: 'quotation-review',
    label: 'Quotation & Technical Review',
    base: '/quotation-review',
    icon: FileSearch,
    description:
      'Track technical feasibility, preliminary estimating and quotation preparation before customer acceptance.',
    cta: 'New Quotation',
    kpiPrefix: 'QTN',
    tabs: [],
  }),
  defineModule({
    key: 'projects',
    label: 'Project Management',
    base: '/projects',
    icon: FolderKanban,
    description: 'Plan, staff and track mechanical design projects from kick-off to closure.',
    cta: 'Create Project',
    kpiPrefix: 'PRJ',
    tabs: [
      { key: 'projects', label: 'Projects' },
      { key: 'project-details', label: 'Project Details & Progress', slug: 'project-details' },
    ],
  }),
  defineModule({
    key: 'planning',
    label: 'Design Planning',
    base: '/design-planning',
    icon: ClipboardList,
    description: 'Create project design plans and track assigned engineering tasks, milestones and progress.',
    cta: 'Create Design Plan',
    kpiPrefix: 'PLN',
    tabs: [
      { key: 'design-plans', label: 'Design Plans' },
      { key: 'tasks-progress', label: 'Tasks & Progress', slug: 'tasks-progress' },
    ],
  }),
  defineModule({
    key: 'conceptual',
    label: 'Conceptual Design',
    base: '/conceptual-design',
    icon: Lightbulb,
    description: 'Capture, compare, review and select product concepts before detailed mechanical design.',
    cta: 'New Concept',
    kpiPrefix: 'CON',
    tabs: [
      { key: 'concept-register', label: 'Concept Register' },
      { key: 'concept-details', label: 'Concept Details', slug: 'concept-details' },
    ],
  }),
  defineModule({
    key: 'mechanical',
    label: 'Mechanical Engineering Design',
    base: '/mechanical-design',
    icon: Cog,
    description: 'Detailed machine, product, fabrication and assembly design under one workspace.',
    cta: 'New Design Item',
    kpiPrefix: 'MEC',
    tabs: [
      { key: 'design-register', label: 'Design Register', slug: 'design-register' },
      { key: 'parts-assemblies', label: 'Parts & Assemblies', slug: 'parts-assemblies' },
      { key: 'design-calculations', label: 'Design Calculations', slug: 'design-calculations' },
    ],
  }),
  defineModule({
    key: 'analysis',
    label: 'Simulation & Design Validation',
    base: '/engineering-analysis',
    icon: Activity,
    description:
      'Inspect mechanical design models in 3D, record inspection observations and prepare manual design validation reports.',
    cta: 'New Validation Report',
    kpiPrefix: 'VDR',
    tabs: [
      { key: 'simulation-workspace', label: 'Simulation Workspace' },
      {
        key: 'validation-reports',
        label: 'Simulation & Validation Reports',
        slug: 'reports',
      },
    ],
  }),
  defineModule({
    key: 'engineering-analysis',
    label: 'Engineering Analysis',
    base: '/analysis',
    icon: FlaskConical,
    description:
      'Manage detailed engineering analysis records, reviewer verification and structured analysis reports linked to designs, validation findings and observations.',
    cta: 'New Analysis',
    kpiPrefix: 'ANL',
    tabs: [
      { key: 'analysis-register', label: 'Analysis Register' },
      { key: 'review-verification', label: 'Review & Verification', slug: 'review' },
      { key: 'analysis-reports', label: 'Analysis Reports', slug: 'reports' },
    ],
  }),
  defineModule({
    key: 'manufacturing',
    label: 'Manufacturing Design',
    base: '/manufacturing-design',
    icon: Factory,
    description: 'Define manufacturing requirements, inspection criteria and production instructions.',
    cta: 'New Record',
    kpiPrefix: 'MFG',
    tabs: [
      { key: 'manufacturing-definition', label: 'Manufacturing Definition', slug: 'definition' },
      {
        key: 'inspection-quality',
        label: 'Inspection & Quality Requirements',
        slug: 'inspection',
      },
      {
        key: 'process-planning',
        label: 'Process Planning & Instructions',
        slug: 'process',
      },
    ],
  }),
  defineModule({
    key: 'bom',
    label: 'BOM & Cost Estimation',
    base: '/bom-cost',
    icon: Boxes,
    description: 'Prepare engineering BOMs, estimate manufacturing cost and release approved BOM information.',
    cta: 'New BOM',
    kpiPrefix: 'BOM',
    tabs: [
      { key: 'bom-management', label: 'BOM Management', slug: 'bom' },
      { key: 'cost-planning', label: 'Cost Planning & Estimation', slug: 'cost' },
      { key: 'revision-release', label: 'BOM Revision & Release', slug: 'releases' },
    ],
  }),
  defineModule({
    key: 'cad',
    label: 'Drawing & CAD Management',
    base: '/cad-management',
    icon: DraftingCompass,
    description: 'Register CAD files and drawings, inspect supported formats in the browser and control revisions, approvals and transmittals.',
    cta: 'Upload CAD File',
    kpiPrefix: 'CAD',
    tabs: [
      { key: 'cad-repository', label: 'CAD File Repository', slug: 'repository' },
      { key: 'drawing-management', label: 'Drawing Management', slug: 'drawings' },
      { key: 'cad-viewer', label: 'CAD Viewer', slug: 'viewer' },
      { key: 'revision-release', label: 'Revision & Release Management', slug: 'releases' },
    ],
  }),
  defineModule({
    key: 'approvals',
    label: 'Design Review & Approval',
    base: '/design-review',
    icon: ClipboardCheck,
    description: 'Manage engineering and manufacturing reviews, controlled final approval and the complete review decision history.',
    cta: 'New Review',
    kpiPrefix: 'REV',
    tabs: [
      { key: 'review-register', label: 'Review Register', slug: '' },
      { key: 'engineering-review', label: 'Engineering Review', slug: 'engineering' },
      { key: 'manufacturing-review', label: 'Manufacturing Review', slug: 'manufacturing' },
      { key: 'release-history', label: 'Approval & Review History', slug: 'releases' },
    ],
  }),
  defineModule({
    key: 'engineering-release',
    label: 'Engineering Change & Release',
    base: '/engineering-release',
    icon: GitPullRequest,
    description: 'Control engineering change requests, ECO approval, controlled source revisions and engineering release history.',
    cta: 'New ECR',
    kpiPrefix: 'ECR',
    tabs: [
      { key: 'ecr-register', label: 'ECR Register', slug: '' },
      { key: 'eco-management', label: 'ECO Management', slug: 'ecr-eco' },
      { key: 'revision-release-history', label: 'Revision & Release History', slug: 'release' },
    ],
  }),
  defineModule({
    key: 'design-handover',
    label: 'Design Release & Production Handover',
    base: '/design-handover',
    icon: PackageCheck,
    description: 'Validate approved design deliverables, prepare the final design package, release the controlled revision and manage the manual Production handover.',
    cta: 'Create Handover',
    kpiPrefix: 'HND',
    tabs: [
      { key: 'handover-register', label: 'Handover Register' },
      { key: 'final-design-package', label: 'Final Design Package', slug: 'package' },
      { key: 'release-validation', label: 'Release Validation', slug: 'validation' },
      { key: 'send-to-production', label: 'Send to Production', slug: 'send' },
      { key: 'transfer-history', label: 'Transfer History', slug: 'history' },
    ],
  }),
  /**
   * Engineering Release & Transfer (/transfers) is an internal workflow target,
   * not a sidebar module: BOM and drawing conversions create transfer records
   * here, and projects and reports read them. It is intentionally absent from
   * LIFECYCLE_GROUPS so its tabs, page title and breadcrumbs resolve without
   * adding a sidebar entry.
   */
  defineModule({
    key: 'transfers',
    label: 'Engineering Release & Transfer',
    base: '/transfers',
    icon: ArrowRightLeft,
    description:
      'Hand approved engineering BOMs, drawings and manufacturing packages to Purchase and Production, and track acknowledgement and progress.',
    cta: 'New Transfer',
    kpiPrefix: 'XFR',
    tabs: [
      { key: 'transfer-register', label: 'Transfer Register' },
      { key: 'purchase-transfer', label: 'Purchase Transfer', slug: 'purchase' },
      { key: 'production-transfer', label: 'Production Transfer', slug: 'production' },
      { key: 'transfer-tracking', label: 'Transfer Tracking', slug: 'tracking' },
      { key: 'transfer-history', label: 'Transfer History', slug: 'history' },
    ],
  }),
  defineModule({
    key: 'reports',
    label: 'Reports & Analytics',
    base: '/reports',
    icon: BarChart3,
    description: 'Live engineering reporting across projects, designs, CAD, BOM, cost, approvals, changes, manufacturing and workload.',
    cta: 'Reports',
    kpiPrefix: 'RPT',
    tabs: [
      { key: 'dashboard', label: 'Analytics Dashboard', slug: 'dashboard' },
      { key: 'project-progress', label: 'Project Progress Reports', slug: 'project-progress' },
      { key: 'design-status', label: 'Design Status Reports', slug: 'design-status' },
      { key: 'cad-drawing', label: 'CAD & Drawing Reports', slug: 'cad-drawing' },
      { key: 'bom-cost', label: 'BOM & Cost Reports', slug: 'bom-cost' },
      { key: 'review-approval', label: 'Engineering Review & Approval Reports', slug: 'review-approval' },
      { key: 'engineering-change', label: 'Engineering Change Reports', slug: 'engineering-change' },
      { key: 'manufacturing', label: 'Manufacturing Reports', slug: 'manufacturing' },
      { key: 'workload-delay', label: 'Workload & Delay Reports', slug: 'workload-delay' },
    ],
  }),
  defineModule({
    key: 'settings',
    label: 'Settings',
    base: '/settings',
    icon: Settings,
    description: 'Engineering rules, approvals, finance, numbering, documents and organisation preferences.',
    cta: 'New Setting',
    kpiPrefix: 'SET',
    tabs: [],
  }),
];

export const DASHBOARD = {
  key: 'dashboard',
  label: 'Dashboard',
  path: '/dashboard',
  icon: LayoutDashboard,
};

/** One navigation entry for an existing module page. */
function moduleItem(moduleKey) {
  const module = MODULES.find((entry) => entry.key === moduleKey);
  if (!module) throw new Error(`Unknown module in lifecycle navigation: ${moduleKey}`);

  return {
    key: module.key,
    label: module.label,
    path: module.base,
    icon: module.icon,
    module,
    isPlaceholder: false,
  };
}

/**
 * The sidebar's manufacturing lifecycle model. Existing modules keep their
 * current URLs; only the grouping and navigation labels change. Destinations
 * without an implementation yet use the shared placeholder dashboard.
 */
export const LIFECYCLE_GROUPS = [
  {
    key: 'customer-sales',
    label: 'Enquiry & Request Management',
    icon: Handshake,
    path: '/customer-sales',
    matchPaths: ['/customer-sales', '/customer-enquiries', '/quotation-review'],
    searchTerms: [
      'customer',
      'sales',
      'enquiry',
      'request',
      'requirement',
      'quotation',
      'technical review',
      'service',
      'r&d',
      'inter-department',
    ],
  },
  {
    key: 'project-engineering',
    label: 'Project & Engineering',
    icon: Cog,
    items: [
      moduleItem('projects'),
      moduleItem('planning'),
      moduleItem('conceptual'),
      moduleItem('mechanical'),
      moduleItem('analysis'),
      moduleItem('engineering-analysis'),
      moduleItem('manufacturing'),
      moduleItem('bom'),
      moduleItem('cad'),
    ],
  },
  {
    key: 'approval-release',
    label: 'Engineering Approval & Release',
    icon: ClipboardCheck,
    items: [
      moduleItem('approvals'),
      moduleItem('engineering-release'),
      moduleItem('design-handover'),
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    icon: ShieldCheck,
    items: [moduleItem('reports'), moduleItem('settings')],
  },
];

/** The lifecycle entry addressed by a path, or null. */
export function findLifecycleItem(pathname) {
  const path = normalizePath(pathname);
  let match = null;

  for (const group of LIFECYCLE_GROUPS) {
    if (
      group.path &&
      group.matchPaths?.some(
        (ownedPath) => path === ownedPath || path.startsWith(`${ownedPath}/`),
      )
    ) {
      return {
        key: group.key,
        label: group.label,
        path: group.path,
        icon: group.icon,
        module: null,
        isPlaceholder: false,
      };
    }

    for (const item of group.items || []) {
      const ownsPath = item.isPlaceholder
        ? path === item.path
        : path === item.path || path.startsWith(`${item.path}/`);

      if (ownsPath && (!match || item.path.length > match.path.length)) match = item;
    }
  }

  return match;
}

/** The lifecycle group that owns the current path, or null. */
export function findLifecycleGroup(pathname) {
  const item = findLifecycleItem(pathname);
  if (!item) return null;
  return (
    LIFECYCLE_GROUPS.find(
      (group) => group.key === item.key || group.items?.includes(item),
    ) || null
  );
}

/** Normalise a pathname for lookup (strip trailing slashes). */
export function normalizePath(pathname) {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

/** The module that owns a path (longest base match), or null. */
export function findModule(pathname) {
  const path = normalizePath(pathname);
  let match = null;

  for (const module of MODULES) {
    if (path === module.base || path.startsWith(`${module.base}/`)) {
      if (!match || module.base.length > match.base.length) match = module;
    }
  }

  return match;
}

/**
 * The module tab addressed by a path, or null for an unknown submodule.
 * The module's own base URL opens its first tab, so both
 * `/mechanical-design` and `/mechanical-design/machine-design` resolve to the
 * Machine Design workspace.
 */
export function findModuleTab(module, pathname) {
  if (!module) return null;
  const path = normalizePath(pathname);
  if (path === module.base) return module.tabs[0] || null;
  return module.tabs.find((tab) => tab.path === path) || null;
}

/**
 * Resolve the current route to its page context (topbar title, breadcrumbs).
 * Returns null for unknown paths.
 */
export function findPageMeta(pathname) {
  const path = normalizePath(pathname);

  if (path === '/' || path === DASHBOARD.path) {
    return {
      title: DASHBOARD.label,
      icon: DASHBOARD.icon,
      module: null,
      tab: null,
      crumbs: [{ label: DASHBOARD.label }],
    };
  }

  const module = findModule(path);
  if (!module) return null;

  const tab = findModuleTab(module, path);
  const isBaseTab = path === module.base || !tab;

  return {
    title: module.label,
    icon: module.icon,
    module,
    tab,
    crumbs: [
      { label: 'Dashboard', to: DASHBOARD.path },
      isBaseTab ? { label: module.label } : { label: module.label, to: module.base },
      ...(isBaseTab ? [] : [{ label: tab.label }]),
    ],
  };
}

/** Flattened lifecycle entries, useful for navigation audits and search. */
export const SIDEBAR_ITEMS = LIFECYCLE_GROUPS.flatMap((group) =>
  group.path ? [group] : group.items,
);
