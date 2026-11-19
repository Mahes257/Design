import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import BomManagementTab from './BomManagementTab';
import CostPlanningTab from './CostPlanningTab';
import RevisionReleaseTab from './RevisionReleaseTab';

const MODULE = MODULES.find((module) => module.key === 'bom');

export const BOM_DESCRIPTION =
  'Prepare engineering BOMs, estimate manufacturing cost and release approved BOM information.';

const WORKFLOW = [
  { label: 'Engineering Design' },
  { label: 'EBOM', tab: 'bom-management' },
  { label: 'Cost Estimation', tab: 'cost-planning' },
  { label: 'BOM Review', tab: 'revision-release' },
  { label: 'Approved Release' },
];

function WorkflowStrip({ activeTab }) {
  return (
    <div className="mfg-workflow">
      <div className="mfg-workflow-track">
        {WORKFLOW.map((step, index) => {
          const active = step.tab === activeTab?.key;
          return (
            <span key={step.label} className={`mfg-flow-step${active ? ' is-active' : ''}`}>
              <span className="mfg-flow-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="mfg-flow-label">{step.label}</span>
            </span>
          );
        })}
      </div>
      <p className="mfg-workflow-note">
        The EBOM is built in BOM Management, priced in Cost Estimation and approved through BOM Review before
        release. Released revisions stay locked, while Purchase and Production handovers remain simulated local state.
      </p>
    </div>
  );
}

export default function BomCostModulePage() {
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
          subtitle={BOM_DESCRIPTION}
          actions={
            <Button icon={Plus} onClick={() => navigate('/bom-cost/bom/new')}>
              New BOM
            </Button>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      <WorkflowStrip activeTab={tab} />
      {tab.key === 'bom-management' && <BomManagementTab />}
      {tab.key === 'cost-planning' && <CostPlanningTab />}
      {tab.key === 'revision-release' && <RevisionReleaseTab />}
    </PageLayout>
  );
}
