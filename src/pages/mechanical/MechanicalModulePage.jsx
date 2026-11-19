import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import DesignRegisterTab from './DesignRegisterTab';
import PartsAssembliesTab from './PartsAssembliesTab';
import DesignCalculationsTab from './DesignCalculationsTab';

const MODULE = MODULES.find((module) => module.key === 'mechanical');

const MODULE_DESCRIPTION =
  'Manage mechanical engineering designs, parts, assemblies and technical calculations across all engineering disciplines.';

/**
 * Module 05 — Mechanical Engineering Design.
 * Three submodules as horizontal, route-backed tabs inside one workspace;
 * the seven disciplines are filters inside the Design Register.
 */
export default function MechanicalModulePage() {
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

  const headerAction =
    tab.key === 'design-register' ? (
      <Button icon={Plus} onClick={() => navigate('/mechanical-design/design-register/new')}>
        New Design Item
      </Button>
    ) : tab.key === 'parts-assemblies' ? (
      <Button
        icon={Plus}
        onClick={() => navigate('/mechanical-design/parts-assemblies/parts/new')}
      >
        New Part
      </Button>
    ) : (
      <Button icon={Plus} onClick={() => navigate('/mechanical-design/design-calculations/new')}>
        New Calculation
      </Button>
    );

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={MODULE.icon}
          title={MODULE.label}
          subtitle={MODULE_DESCRIPTION}
          actions={headerAction}
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {tab.key === 'design-register' && <DesignRegisterTab />}
      {tab.key === 'parts-assemblies' && <PartsAssembliesTab />}
      {tab.key === 'design-calculations' && <DesignCalculationsTab />}
    </PageLayout>
  );
}
