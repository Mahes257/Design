import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import ManufacturingDefinitionTab from './ManufacturingDefinitionTab';
import InspectionRequirementsTab from './InspectionRequirementsTab';
import ProcessPlanningTab from './ProcessPlanningTab';

const MODULE = MODULES.find((module) => module.key === 'manufacturing');

export const MANUFACTURING_DESCRIPTION =
  'Define manufacturing requirements, inspection criteria and production instructions.';

const NEW_ROUTE = {
  'manufacturing-definition': '/manufacturing-design/definition/new',
  'inspection-quality': '/manufacturing-design/inspection/new',
  'process-planning': '/manufacturing-design/process/new',
};

const WORKFLOW = [
  'Mechanical Engineering Design',
  'Engineering Analysis',
  'Manufacturing Definition',
  'Inspection & Quality Requirements',
  'Process Planning & Instructions',
  'Design Review & Approval',
  'Production',
  'Quality Control',
];

/** Workflow reference strip: modules stay separate owners; this is a mock linkage. */
function WorkflowStrip({ activeTab }) {
  const activeLabel = activeTab?.label;
  return (
    <div className="mfg-workflow">
      <div className="mfg-workflow-track">
        {WORKFLOW.map((step, index) => {
          const active = step === activeLabel;
          return (
            <span key={step} className={`mfg-flow-step${active ? ' is-active' : ''}`}>
              <span className="mfg-flow-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="mfg-flow-label">{step}</span>
            </span>
          );
        })}
      </div>
      <p className="mfg-workflow-note">
        Manufacturing Design owns manufacturing requirements and process documentation. Parts, drawings,
        analysis evidence and release authorization remain owned by their own modules; these links are
        mock references only.
      </p>
    </div>
  );
}

/**
 * Module 08 — Manufacturing Design.
 * Exactly three horizontal, route-backed submodules; categories and technical
 * sections live inside each register and its full-page forms.
 */
export default function ManufacturingModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const tab = findModuleTab(MODULE, pathname);
  if (!tab) return <Navigate to={MODULE.base} replace />;

  const isBaseTab = normalizePath(pathname) === MODULE.base;

  const crumbs = [
    { label: 'Dashboard', to: DASHBOARD.path },
    isBaseTab ? { label: MODULE.label } : { label: MODULE.label, to: MODULE.base },
    ...(isBaseTab ? [] : [{ label: tab.label }]),
  ];

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={MODULE.icon}
          title={MODULE.label}
          subtitle={MANUFACTURING_DESCRIPTION}
          actions={
            <Button icon={Plus} onClick={() => navigate(NEW_ROUTE[tab.key] || '/manufacturing-design/definition/new')}>
              New Record
            </Button>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      <WorkflowStrip activeTab={tab} />
      {tab.key === 'manufacturing-definition' && <ManufacturingDefinitionTab />}
      {tab.key === 'inspection-quality' && <InspectionRequirementsTab />}
      {tab.key === 'process-planning' && <ProcessPlanningTab />}
    </PageLayout>
  );
}
