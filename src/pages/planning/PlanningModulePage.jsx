import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  ModuleTabs,
  PageHeader,
  PageLayout,
} from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import DesignPlansTab from './DesignPlansTab';
import TasksProgressTab from './TasksProgressTab';

const MODULE = MODULES.find((module) => module.key === 'planning');

const TAB_SUBTITLES = {
  'design-plans':
    'Create and manage project design plans, ownership, schedule and delivery status.',
  'tasks-progress':
    'Assign engineers, set deadlines, manage dependencies and track task progress.',
};

/**
 * Module 04 — Design Planning.
 *
 * Two route-backed sections: Design Plans and Tasks & Progress. Task creation
 * and editing use their full-page routes; all records are project-linked and
 * stored in the browser.
 */
export default function PlanningModulePage() {
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
    tab.key === 'design-plans' ? (
      <Button icon={Plus} onClick={() => navigate('/design-planning/design-plans/new')}>
        Create Design Plan
      </Button>
    ) : null;

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={MODULE.icon}
          title={MODULE.label}
          subtitle={TAB_SUBTITLES[tab.key]}
          actions={headerAction}
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {tab.key === 'design-plans' && <DesignPlansTab />}
      {tab.key === 'tasks-progress' && <TasksProgressTab />}
    </PageLayout>
  );
}
