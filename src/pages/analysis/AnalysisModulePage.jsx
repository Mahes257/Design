import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, ModuleTabs, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import AnalysisRegisterTab from './AnalysisRegisterTab';
import AnalysisReportsTab from './AnalysisReportsTab';
import ReviewVerificationTab from './ReviewVerificationTab';

const MODULE = MODULES.find((module) => module.key === 'engineering-analysis');

export const ANALYSIS_DESCRIPTION =
  'Manage detailed engineering analysis based on mechanical designs, validation findings and engineering requirements.';

/**
 * Module 07 — Engineering Analysis.
 * Three route-backed tabs: register, review & verification and analysis reports.
 * The register stores evidence and references only; no solver runs in this app.
 */
export default function AnalysisModulePage() {
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
          subtitle={ANALYSIS_DESCRIPTION}
          actions={
            <Button icon={Plus} onClick={() => navigate('/analysis/new')}>
              New Analysis
            </Button>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {tab.key === 'analysis-register' && <AnalysisRegisterTab />}
      {tab.key === 'review-verification' && <ReviewVerificationTab />}
      {tab.key === 'analysis-reports' && <AnalysisReportsTab />}
    </PageLayout>
  );
}
