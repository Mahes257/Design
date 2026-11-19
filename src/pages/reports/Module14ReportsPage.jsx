import { useEffect, useMemo, useState } from 'react';
import { Info, Printer } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  Card,
  ModuleTabs,
  PageHeader,
  PageLayout,
} from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import { useProjects } from '../../context/ProjectsContext';
import { usePlanning } from '../../context/PlanningContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useCad } from '../../context/CadContext';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useBom } from '../../context/BomContext';
import { useApprovals } from '../../context/ApprovalsContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { useTransfers } from '../../context/TransfersContext';
import {
  EMPTY_REPORT_FILTERS,
  buildDashboardData,
  buildReportingData,
  optionsForTab,
} from '../../data/reportingAnalyticsData';
import ReportsDashboard from './ReportsDashboard';
import ReportsTabViews from './ReportsTabViews';
import { ReportFilterBar } from './ReportUi';

const MODULE = MODULES.find((module) => module.key === 'reports');

function queryFilters(search) {
  const params = new URLSearchParams(search);
  const values = {};
  params.forEach((value, key) => {
    if (key in EMPTY_REPORT_FILTERS) values[key] = value;
  });
  return values;
}

export default function Module14ReportsPage() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const tab = findModuleTab(MODULE, pathname);

  const { projects, team, milestones } = useProjects();
  const { plans, tasks } = usePlanning();
  const { designs, parts, assemblies } = useMechanical();
  const { files, drawings } = useCad();
  const { definitions, inspections, processPlans } = useManufacturing();
  const { boms, estimates, materials, quantities } = useBom();
  const { reviews } = useApprovals();
  const { changes, ecos } = useEngineeringRelease();
  const { handovers, packages, releases: handoverReleases, transfers: handoverTransfers } = useDesignHandover();
  const { transfers } = useTransfers();

  const modelResult = useMemo(() => {
    try {
      return {
        model: buildReportingData({
          projects,
          team,
          milestones,
          plans,
          tasks,
          designs,
          parts,
          assemblies,
          files,
          drawings,
          definitions,
          inspections,
          processPlans,
          boms,
          estimates,
          materials,
          quantities,
          reviews,
          changes,
          ecos,
          handovers,
          packages,
          handoverReleases,
          handoverTransfers,
          transfers,
        }),
        error: '',
      };
    } catch (error) {
      return { model: null, error: error?.message || 'The reporting source model could not be built.' };
    }
  }, [
    projects, team, milestones, plans, tasks, designs, parts, assemblies,
    files, drawings, definitions, inspections, processPlans, boms, estimates,
    materials, quantities, reviews, changes, ecos, handovers, packages,
    handoverReleases, handoverTransfers, transfers,
  ]);

  const [filters, setFilters] = useState(() => ({ ...EMPTY_REPORT_FILTERS, ...queryFilters(search) }));

  useEffect(() => {
    setFilters({ ...EMPTY_REPORT_FILTERS, ...queryFilters(search) });
  }, [tab?.key, search]);

  if (!tab) return <Navigate to={MODULE.base} replace />;

  const isBaseTab = normalizePath(pathname) === MODULE.base;
  const model = modelResult.model;
  const options = model ? optionsForTab(tab.key, model) : {};
  const dashboard = tab.key === 'dashboard' && model
    ? buildDashboardData(model, filters)
    : null;

  const onNavigate = (tabKey, query = {}) => {
    const target = MODULE.tabs.find((item) => item.key === tabKey);
    if (!target) return;
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '' && value !== 'All') params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    navigate(`${target.path}${suffix}`);
  };

  const resetFilters = () => setFilters({ ...EMPTY_REPORT_FILTERS });

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
          title="Reports &amp; Analytics"
          subtitle={tab.description}
          actions={
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print / PDF
            </Button>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {modelResult.error ? (
        <Card title="Reporting data could not be assembled" subtitle="No report was generated from incomplete source data.">
          <div className="insight-empty">
            <Info aria-hidden="true" />
            <div>
              <strong>Source model error</strong>
              <p>{modelResult.error}</p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <ReportFilterBar
            tabKey={tab.key}
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            options={options}
            projectOptions={options.projects || []}
            departmentOptions={options.departments || []}
          />
          {tab.key === 'dashboard' ? (
            <ReportsDashboard data={dashboard} filters={filters} onNavigate={onNavigate} />
          ) : (
            <ReportsTabViews
              tabKey={tab.key}
              model={model}
              filters={filters}
              onNavigate={onNavigate}
            />
          )}
        </>
      )}
    </PageLayout>
  );
}
