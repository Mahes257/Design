import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus, Send, ShieldCheck } from 'lucide-react';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, normalizePath } from '../../config/navigation';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import HandoverRegisterTab from './HandoverRegisterTab';
import FinalDesignPackageTab from './FinalDesignPackageTab';
import ReleaseValidationTab from './ReleaseValidationTab';
import SendToProductionTab from './SendToProductionTab';
import TransferHistoryTab from './TransferHistoryTab';
import { ModuleStat } from './designHandoverUi';
import '../../styles/design-handover.css';

const TAB_COMPONENTS = {
  'handover-register': HandoverRegisterTab,
  'final-design-package': FinalDesignPackageTab,
  'release-validation': ReleaseValidationTab,
  'send-to-production': SendToProductionTab,
  'transfer-history': TransferHistoryTab,
};

export default function DesignHandoverModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { stats } = useDesignHandover();
  const module = MODULES.find((row) => row.key === 'design-handover');
  const activeTab = module?.tabs.find((tab) => normalizePath(tab.path) === normalizePath(pathname));

  if (!module) return <Navigate to={DASHBOARD.path} replace />;
  if (!activeTab) return <Navigate to={module.base} replace />;
  const ActiveTab = TAB_COMPONENTS[activeTab.key];

  const crumbs = [
    { label: 'Dashboard', to: DASHBOARD.path },
    normalizePath(pathname) === module.base ? { label: module.label } : { label: module.label, to: module.base },
    ...(normalizePath(pathname) === module.base ? [] : [{ label: activeTab.label }]),
  ];

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={module.icon}
          title={module.label}
          subtitle={module.description}
          actions={
            <>
              <Button variant="secondary" icon={ClipboardCheck} onClick={() => navigate('/design-handover/validation')}>Release Validation</Button>
              <Button icon={Plus} onClick={() => navigate('/design-handover/new')}>Create Handover</Button>
            </>
          }
        />
      }
      tabs={<ModuleTabs module={module} activeTab={activeTab} />}
    >
      <div className="dh-stats">
        <ModuleStat label="Handover records" value={stats.total} tone="blue" hint="Actual browser-local records" />
        <ModuleStat label="Ready for release" value={stats.ready} tone="green" hint="Mandatory validation passed" />
        <ModuleStat label="Released designs" value={stats.released} tone="teal" hint="Controlled local releases" />
        <ModuleStat label="Integration pending" value={stats.pending} tone="orange" hint="Manual handover remains pending" />
      </div>

      <div className="dh-context-strip">
        <span><ShieldCheck aria-hidden="true" /> Release is blocked by failed mandatory validation.</span>
        <span><Send aria-hidden="true" /> No verified ERP Production import endpoint was found; exports remain manual.</span>
      </div>

      <ActiveTab />
    </PageLayout>
  );
}
