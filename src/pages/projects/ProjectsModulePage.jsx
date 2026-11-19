import { Plus, SlidersHorizontal } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  ModuleTabs,
  PageHeader,
  PageLayout,
} from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import AllProjectsTab from './AllProjectsTab';

const MODULE = MODULES.find((module) => module.key === 'projects');

const TAB_SUBTITLES = {
  projects:
    'Manage the project register, search and filter projects, and create or edit engineering projects.',
};

/**
 * Module 03 — Project Management.
 *
 * Two route-backed sections: Projects (register) and Project Details &
 * Progress. Creating a project opens the dedicated full-page form at
 * /projects/new-project.
 */
export default function ProjectsModulePage() {
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
          subtitle={TAB_SUBTITLES[tab.key]}
          actions={
            <>
              <Button
                variant="secondary"
                icon={SlidersHorizontal}
                onClick={() => navigate('/settings/project-templates')}
              >
                Project Templates
              </Button>
              <Button icon={Plus} onClick={() => navigate('/projects/new-project')}>
                Create Project
              </Button>
            </>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {tab.key === 'projects' && <AllProjectsTab />}
    </PageLayout>
  );
}
