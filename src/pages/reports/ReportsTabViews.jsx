import {
  BomCostTab,
  CadDrawingTab,
  DesignStatusTab,
  ProjectProgressTab,
} from './ReportsProjectTabs';
import {
  EngineeringChangeTab,
  ManufacturingTab,
  ReviewApprovalTab,
  WorkloadDelayTab,
} from './ReportsEngineeringTabs';

export default function ReportsTabViews({ tabKey, model, filters, onNavigate }) {
  switch (tabKey) {
    case 'project-progress':
      return <ProjectProgressTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'design-status':
      return <DesignStatusTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'cad-drawing':
      return <CadDrawingTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'bom-cost':
      return <BomCostTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'review-approval':
      return <ReviewApprovalTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'engineering-change':
      return <EngineeringChangeTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'manufacturing':
      return <ManufacturingTab model={model} filters={filters} onNavigate={onNavigate} />;
    case 'workload-delay':
      return <WorkloadDelayTab model={model} filters={filters} onNavigate={onNavigate} />;
    default:
      return null;
  }
}
