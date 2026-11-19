import { GitPullRequest, ListChecks, Plus, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  KpiGrid,
  ModuleTabs,
  PageHeader,
  PageLayout,
  StatCard,
} from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import ChangeRegisterTab from './ChangeRegisterTab';
import EcrEcoTab from './EcrEcoTab';
import EngineeringReleaseTab from './EngineeringReleaseTab';
import { WORKFLOW_STEPS } from './engineeringReleaseUi';

const MODULE = MODULES.find((module) => module.key === 'engineering-release');

function WorkflowStrip({ activeTab }) {
  const active =
    activeTab?.key === 'ecr-register' ? 0 : activeTab?.key === 'eco-management' ? 3 : 8;
  return (
    <div className="approvals-workflow">
      <div className="approvals-workflow-track">
        {WORKFLOW_STEPS.map((step, index) => (
          <span
            key={step.key}
            className={`approvals-workflow-step${index === active ? ' is-active' : ''}${index < active ? ' is-complete' : ''}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step.label}
          </span>
        ))}
      </div>
      <p>
        ECR → Impact Assessment → ECR Decision → ECO Creation → ECO Review → Implementation → Revision Updated.
        Each revision is raised through its owning module and released snapshots remain preserved.
      </p>
    </div>
  );
}

export default function EngineeringReleaseModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { stats } = useEngineeringRelease();
  const tab = findModuleTab(MODULE, pathname);
  if (!tab) return <Navigate to={MODULE.base} replace />;

  const isBaseTab = normalizePath(pathname) === MODULE.base;

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: DASHBOARD.path },
            isBaseTab ? { label: MODULE.label } : { label: MODULE.label, to: MODULE.base },
            ...(isBaseTab ? [] : [{ label: tab.label }]),
          ]}
        />
      }
      header={
        <PageHeader
          icon={MODULE.icon}
          title={MODULE.label}
          subtitle={MODULE.description}
          actions={
            <div className="approvals-detail-actions">
              <Button icon={Plus} onClick={() => navigate(`${MODULE.base}?new=1`)}>
                New ECR
              </Button>
            </div>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      <WorkflowStrip activeTab={tab} />
      <KpiGrid className="approvals-kpi-grid">
        <StatCard icon={GitPullRequest} label="Open ECRs / ECOs" value={String(stats.open)} sub="Changes still in the controlled workflow" tone="orange" />
        <StatCard icon={ListChecks} label="ECO Review Queue" value={String(stats.pendingEcoReview)} sub="Awaiting an explicit ECO decision" tone="blue" />
        <StatCard icon={ShieldCheck} label="Ready for Release" value={String(stats.ready)} sub="Approved and revision-updated" tone="teal" />
        <StatCard icon={ShieldCheck} label="Closed Changes" value={String(stats.closed)} sub="Revision implementation complete" tone="emerald" />
      </KpiGrid>

      {tab.key === 'ecr-register' && <ChangeRegisterTab />}
      {tab.key === 'eco-management' && <EcrEcoTab />}
      {tab.key === 'revision-release-history' && <EngineeringReleaseTab />}

      <div className="approvals-audit-note">
        <ShieldCheck aria-hidden="true" />
        <span>Frontend-only workflow simulation. No ERP authorization, procurement transaction or production order is created.</span>
      </div>
    </PageLayout>
  );
}
