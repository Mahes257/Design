import { Upload } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import CadRepositoryTab from './CadRepositoryTab';
import DrawingManagementTab from './DrawingManagementTab';
import CadViewerTab from './CadViewerTab';
import CadRevisionReleaseTab from './CadRevisionReleaseTab';

const MODULE = MODULES.find((module) => module.key === 'cad');

export const CAD_DESCRIPTION =
  'Register CAD files and engineering drawings, inspect supported formats in the browser and control revisions, approvals and transmittals.';

const WORKFLOW = [
  { label: 'CAD File Repository', tab: 'cad-repository' },
  { label: 'Drawing Management', tab: 'drawing-management' },
  { label: 'CAD Viewer', tab: 'cad-viewer' },
  { label: 'Revision & Release', tab: 'revision-release' },
  { label: 'Purchase / Production' },
];

function WorkflowStrip({ activeTab }) {
  return (
    <div className="mfg-workflow">
      <div className="mfg-workflow-track">
        {WORKFLOW.map((step, index) => (
          <span key={step.label} className={`mfg-flow-step${step.tab === activeTab?.key ? ' is-active' : ''}`}>
            <span className="mfg-flow-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="mfg-flow-label">{step.label}</span>
          </span>
        ))}
      </div>
      <p className="mfg-workflow-note">
        Files are registered first, drawings reference them, the viewer renders only verified browser formats, and
        revision control gates release. Purchase and Production are represented by handover records — nothing leaves
        this browser.
      </p>
    </div>
  );
}

export default function CadManagementModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const projectMatch = pathname.match(/^\/cad-management\/project\/([^/]+)\/?$/);
  const projectId = projectMatch ? decodeURIComponent(projectMatch[1]) : '';
  const tab = projectId
    ? MODULE.tabs.find((row) => row.key === 'cad-repository')
    : findModuleTab(MODULE, pathname);
  if (!tab) return <Navigate to={MODULE.base} replace />;

  const isBaseTab = normalizePath(pathname) === MODULE.base;
  const crumbs = [
    { label: 'Dashboard', to: DASHBOARD.path },
    isBaseTab ? { label: MODULE.label } : { label: MODULE.label, to: MODULE.base },
    ...(projectId
      ? [
          { label: 'CAD File Repository', to: '/cad-management/repository' },
          { label: `Project ${projectId}` },
        ]
      : isBaseTab
        ? []
        : [{ label: tab.label }]),
  ];
  const registerPath = projectId ? `/cad-management/files/new?project=${encodeURIComponent(projectId)}` : '/cad-management/files/new';

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={MODULE.icon}
          title={MODULE.label}
          subtitle={CAD_DESCRIPTION}
          actions={
            <Button icon={Upload} onClick={() => navigate(registerPath)}>
              Upload CAD File
            </Button>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      <WorkflowStrip activeTab={tab} />
      {tab.key === 'cad-repository' && <CadRepositoryTab />}
      {tab.key === 'drawing-management' && <DrawingManagementTab />}
      {tab.key === 'cad-viewer' && <CadViewerTab />}
      {tab.key === 'revision-release' && <CadRevisionReleaseTab />}
    </PageLayout>
  );
}
