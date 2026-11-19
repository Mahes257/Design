import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import SimulationWorkspaceTab from './SimulationWorkspaceTab';
import SimulationReportsTab from './SimulationReportsTab';

const MODULE = MODULES.find((module) => module.key === 'analysis');

const MODULE_DESCRIPTION =
  'Inspect mechanical design models in 3D, record inspection observations and prepare manual design validation reports for engineering analysis.';

/**
 * Module 06 — Simulation & Design Validation.
 * Exactly two horizontal, route-backed tabs. 3D viewing is geometry inspection
 * only; the application contains no numerical solver and never fakes results.
 */
export default function SimulationModulePage() {
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
          subtitle={MODULE_DESCRIPTION}
          actions={
            <Button
              icon={Plus}
              onClick={() => navigate('/engineering-analysis/reports/new')}
            >
              New Validation Report
            </Button>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {tab.key === 'simulation-workspace' && <SimulationWorkspaceTab />}
      {tab.key === 'validation-reports' && <SimulationReportsTab />}
    </PageLayout>
  );
}
