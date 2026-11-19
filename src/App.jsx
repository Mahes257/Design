import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ConceptProvider } from './context/ConceptContext';
import { MechanicalProvider } from './context/MechanicalContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { SimulationProvider } from './context/SimulationContext';
import { ManufacturingProvider } from './context/ManufacturingContext';
import { BomProvider } from './context/BomContext';
import { CadProvider } from './context/CadContext';
import { ApprovalsProvider } from './context/ApprovalsContext';
import { EngineeringReleaseProvider } from './context/EngineeringReleaseContext';
import { TransfersProvider } from './context/TransfersContext';
import { DesignHandoverProvider } from './context/DesignHandoverContext';
import { PlanningProvider } from './context/PlanningContext';
import { ProjectsProvider } from './context/ProjectsContext';
import { SettingsProvider } from './context/SettingsContext';
import { WorkflowConversionProvider } from './context/WorkflowConversionContext';
import { CustomerEnquiryProvider } from './context/CustomerEnquiryContext';
import { EnquiryRequestProvider } from './context/EnquiryRequestContext';
import { QuotationReviewProvider } from './context/QuotationReviewContext';
import { MODULES } from './config/navigation';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import NewProjectPage from './pages/projects/NewProjectPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import ProjectDetailsIndexPage from './pages/projects/ProjectDetailsIndexPage';
import ProjectsModulePage from './pages/projects/ProjectsModulePage';
import PlanningModulePage from './pages/planning/PlanningModulePage';
import DesignPlanFormPage from './pages/planning/DesignPlanFormPage';
import DesignPlanDetailPage from './pages/planning/DesignPlanDetailPage';
import DesignTaskFormPage from './pages/planning/DesignTaskFormPage';
import DesignTaskDetailPage from './pages/planning/DesignTaskDetailPage';
import ConceptualModulePage from './pages/conceptual/ConceptualModulePage';
import ConceptFormPage from './pages/conceptual/ConceptFormPage';
import MechanicalModulePage from './pages/mechanical/MechanicalModulePage';
import DesignFormPage from './pages/mechanical/DesignFormPage';
import DesignDetailPage from './pages/mechanical/DesignDetailPage';
import PartFormPage from './pages/mechanical/PartFormPage';
import PartDetailPage from './pages/mechanical/PartDetailPage';
import AssemblyFormPage from './pages/mechanical/AssemblyFormPage';
import AssemblyDetailPage from './pages/mechanical/AssemblyDetailPage';
import CalculationFormPage from './pages/mechanical/CalculationFormPage';
import CalculationDetailPage from './pages/mechanical/CalculationDetailPage';
import SimulationModulePage from './pages/simulation/SimulationModulePage';
import SimulationValidationReportFormPage from './pages/simulation/ValidationReportFormPage';
import SimulationValidationReportDetailPage from './pages/simulation/ValidationReportDetailPage';
import LegacyAnalysisPage from './pages/simulation/LegacyAnalysisPage';
import AnalysisModulePage from './pages/analysis/AnalysisModulePage';
import AnalysisReportPage from './pages/analysis/AnalysisReportPage';
import AnalysisFormPage from './pages/analysis/AnalysisFormPage';
import AnalysisDetailPage from './pages/analysis/AnalysisDetailPage';
import ReviewDetailPage from './pages/analysis/ReviewDetailPage';
import ValidationReportFormPage from './pages/analysis/ValidationReportFormPage';
import ValidationReportDetailPage from './pages/analysis/ValidationReportDetailPage';
import ManufacturingModulePage from './pages/manufacturing/ManufacturingModulePage';
import ManufacturingFormPage from './pages/manufacturing/ManufacturingFormPage';
import ManufacturingDetailPage from './pages/manufacturing/ManufacturingDetailPage';
import BomCostModulePage from './pages/bom/BomCostModulePage';
import BomFormPage from './pages/bom/BomFormPage';
import BomDetailPage from './pages/bom/BomDetailPage';
import CostEstimateDetailPage from './pages/bom/CostEstimateDetailPage';
import { MaterialDetailPage, QuantityDetailPage } from './pages/bom/BomRecordDetailPages';
import MaterialFormPage from './pages/bom/MaterialFormPage';
import QuantityFormPage from './pages/bom/QuantityFormPage';
import CostEstimateFormPage from './pages/bom/CostEstimateFormPage';
import CadManagementModulePage from './pages/cad/CadManagementModulePage';
import CadFileFormPage from './pages/cad/CadFileFormPage';
import CadFileDetailPage from './pages/cad/CadFileDetailPage';
import DrawingFormPage from './pages/cad/DrawingFormPage';
import DrawingDetailPage from './pages/cad/DrawingDetailPage';
import ApprovalsModulePage from './pages/approvals/ApprovalsModulePage';
import NewReviewPage from './pages/approvals/NewReviewPage';
import EcrDetailPage from './pages/engineering-release/EcrDetailPage';
import ApprovalReviewDetailPage from './pages/approvals/ReviewDetailPage';
import TransfersModulePage from './pages/transfers/TransfersModulePage';
import EngineeringReleaseModulePage from './pages/engineering-release/EngineeringReleaseModulePage';
import NewTransferPage from './pages/transfers/NewTransferPage';
import TransferDetailPage from './pages/transfers/TransferDetailPage';
import DesignHandoverModulePage from './pages/design-handover/DesignHandoverModulePage';
import NewHandoverPage from './pages/design-handover/NewHandoverPage';
import HandoverDetailPage from './pages/design-handover/HandoverDetailPage';
import Module14ReportsPage from './pages/reports/Module14ReportsPage';
import SettingsModulePage from './pages/settings/SettingsModulePage';
import EnquiryRequestModulePage from './pages/enquiry-requests/EnquiryRequestModulePage';
import RequestFormPage from './pages/enquiry-requests/RequestFormPage';
import RequestDetailPage from './pages/enquiry-requests/RequestDetailPage';
import QuotationFormPage from './pages/quotation-review/QuotationFormPage';
import QuotationDetailPage from './pages/quotation-review/QuotationDetailPage';

/**
 * Mechanical Design ERP — frontend shell only.
 *
 * The sidebar links to 13 module routes (plus Dashboard). Each module page
 * renders its submodules as horizontal tabs, and every tab has its own URL
 * (`/mechanical-design/machine-design`) so direct links and refreshes work.
 *
 * Project Management (Module 02), Design Planning (Module 03) and Conceptual
 * Design (Module 04) have their own workspace pages. New Project, concepts and
 * design proposals are full-page routes, not submodule tabs, and every project
 * opens its own details/setup workspace. Design Planning also owns full-page
 * requirement and design task forms. Every other module uses the shared module
 * page.
 */
const BESPOKE_MODULES = ['customer-sales', 'customer-enquiries', 'quotation-review', 'projects', 'planning', 'conceptual', 'mechanical', 'analysis', 'manufacturing', 'bom', 'cad', 'approvals', 'engineering-release', 'design-handover', 'transfers', 'reports', 'settings'];
const GENERIC_MODULES = MODULES.filter((module) => !BESPOKE_MODULES.includes(module.key));
const REPORT_TABS = MODULES.find((module) => module.key === 'reports')?.tabs || [];

/** Backward-compatible redirect for the previous customer enquiry routes. */
function LegacyEnquiryRedirect({ mode = 'view' }) {
  const { enquiryId } = useParams();
  const target =
    mode === 'edit'
      ? `/customer-sales/create/${enquiryId}/edit`
      : `/customer-sales/requests/${enquiryId}`;
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ProjectsProvider>
        <EnquiryRequestProvider>
        <CustomerEnquiryProvider>
        <QuotationReviewProvider>
        <PlanningProvider>
        <ConceptProvider>
        <MechanicalProvider>
        <AnalysisProvider>
        <SimulationProvider>
        <ManufacturingProvider>
        <BomProvider>
        <CadProvider>
        <ApprovalsProvider>
        <EngineeringReleaseProvider>
        <DesignHandoverProvider>
        <TransfersProvider>
        <WorkflowConversionProvider>
        <SettingsProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/customer-sales" element={<EnquiryRequestModulePage />} />
            <Route path="/customer-sales/create" element={<RequestFormPage />} />
            <Route path="/customer-sales/assessment" element={<EnquiryRequestModulePage />} />
            <Route path="/customer-sales/assessment/:requestId" element={<EnquiryRequestModulePage />} />
            <Route path="/customer-sales/commercial" element={<EnquiryRequestModulePage />} />
            <Route path="/customer-sales/commercial/:requestId" element={<EnquiryRequestModulePage />} />
            <Route path="/customer-sales/create/:requestId/edit" element={<RequestFormPage />} />
            <Route path="/customer-sales/requests/:requestId" element={<RequestDetailPage />} />
            <Route path="/customer-sales/quotations" element={<Navigate to="/customer-sales/commercial" replace />} />
            <Route path="/customer-enquiries" element={<Navigate to="/customer-sales" replace />} />
            <Route path="/customer-enquiries/new" element={<Navigate to="/customer-sales/create" replace />} />
            <Route path="/customer-enquiries/:enquiryId/edit" element={<LegacyEnquiryRedirect mode="edit" />} />
            <Route path="/customer-enquiries/:enquiryId/*" element={<LegacyEnquiryRedirect />} />
            <Route path="/customer-enquiries/:enquiryId" element={<LegacyEnquiryRedirect />} />
            <Route path="/customer-enquiry" element={<Navigate to="/customer-sales" replace />} />

            <Route path="/quotation-review" element={<Navigate to="/customer-sales/quotations" replace />} />
            <Route path="/quotation-review/new" element={<QuotationFormPage />} />
            <Route path="/quotation-review/:quotationId/edit" element={<QuotationFormPage />} />
            <Route path="/quotation-review/:quotationId/feasibility" element={<QuotationDetailPage />} />
            <Route path="/quotation-review/:quotationId/cost-estimate" element={<QuotationDetailPage />} />
            <Route path="/quotation-review/:quotationId/review" element={<QuotationDetailPage />} />
            <Route path="/quotation-review/:quotationId/history" element={<QuotationDetailPage />} />
            <Route path="/quotation-review/:quotationId" element={<QuotationDetailPage />} />

            <Route path="/projects" element={<ProjectsModulePage />} />
            <Route path="/projects/project-details" element={<ProjectDetailsIndexPage />} />
            <Route path="/projects/all-projects" element={<Navigate to="/projects" replace />} />
            <Route path="/projects/project-team" element={<Navigate to="/projects" replace />} />
            <Route path="/projects/milestones" element={<Navigate to="/projects" replace />} />
            <Route path="/projects/project-status" element={<Navigate to="/projects" replace />} />
            <Route path="/projects/new-project" element={<NewProjectPage />} />
            <Route path="/projects/new-project/:projectId" element={<NewProjectPage />} />
            <Route path="/projects/all-projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

            <Route path="/design-planning" element={<PlanningModulePage />} />
            <Route path="/design-planning/tasks-progress" element={<PlanningModulePage />} />
            <Route path="/design-planning/design-plans/new" element={<DesignPlanFormPage />} />
                        <Route path="/design-planning/design-plans/:planId/edit"
              element={<DesignPlanFormPage />}
            />
            <Route
              path="/design-planning/design-plans/:planId"
              element={<DesignPlanDetailPage />}
            />
            <Route path="/design-planning/design-tasks/new" element={<DesignTaskFormPage />} />
                        <Route path="/design-planning/design-tasks/:taskId/edit"
              element={<DesignTaskFormPage />}
            />
            <Route
              path="/design-planning/design-tasks/:taskId"
              element={<DesignTaskDetailPage />}
            />
            <Route path="/design-planning/:submodule" element={<Navigate to="/design-planning" replace />} />

            <Route path="/conceptual-design" element={<ConceptualModulePage />} />
            <Route path="/conceptual-design/concept-details" element={<ConceptualModulePage />} />
            <Route path="/conceptual-design/concept-creation" element={<ConceptFormPage />} />
            <Route
              path="/conceptual-design/concept-creation/:conceptId/edit"
              element={<ConceptFormPage />}
            />
            <Route path="/conceptual-design/:submodule" element={<Navigate to="/conceptual-design" replace />} />

            <Route path="/mechanical-design" element={<MechanicalModulePage />} />
            <Route path="/mechanical-design/design-register" element={<MechanicalModulePage />} />
            <Route path="/mechanical-design/parts-assemblies" element={<MechanicalModulePage />} />
            <Route
              path="/mechanical-design/design-calculations"
              element={<MechanicalModulePage />}
            />
            <Route
              path="/mechanical-design/design-register/new"
              element={<DesignFormPage />}
            />
            <Route
              path="/mechanical-design/design-register/:designId/edit"
              element={<DesignFormPage />}
            />
            <Route
              path="/mechanical-design/design-register/:designId"
              element={<DesignDetailPage />}
            />
            <Route path="/mechanical-design/parts-assemblies/parts/new" element={<PartFormPage />} />
            <Route
              path="/mechanical-design/parts-assemblies/parts/:partId/edit"
              element={<PartFormPage />}
            />
            <Route
              path="/mechanical-design/parts-assemblies/parts/:partId"
              element={<PartDetailPage />}
            />
            <Route
              path="/mechanical-design/parts-assemblies/assemblies/new"
              element={<AssemblyFormPage />}
            />
            <Route
              path="/mechanical-design/parts-assemblies/assemblies/:assemblyId/edit"
              element={<AssemblyFormPage />}
            />
            <Route
              path="/mechanical-design/parts-assemblies/assemblies/:assemblyId"
              element={<AssemblyDetailPage />}
            />
            <Route
              path="/mechanical-design/design-calculations/new"
              element={<CalculationFormPage />}
            />
            <Route
              path="/mechanical-design/design-calculations/:calcId/edit"
              element={<CalculationFormPage />}
            />
            <Route
              path="/mechanical-design/design-calculations/:calcId"
              element={<CalculationDetailPage />}
            />
            <Route path="/mechanical-design/:submodule" element={<MechanicalModulePage />} />

            {/* Module 07 — Engineering Analysis (new /analysis workspace; legacy routes preserved). */}
            <Route path="/analysis" element={<AnalysisModulePage />} />
            <Route path="/analysis/review" element={<AnalysisModulePage />} />
            <Route path="/analysis/reports" element={<AnalysisModulePage />} />
            <Route path="/analysis/new" element={<AnalysisFormPage />} />
            <Route path="/analysis/review/:reviewId" element={<ReviewDetailPage />} />
            <Route path="/analysis/:analysisId/edit" element={<AnalysisFormPage />} />
            <Route path="/analysis/:analysisId/report" element={<AnalysisReportPage />} />
            <Route path="/analysis/:analysisId" element={<AnalysisDetailPage />} />

            <Route path="/engineering-analysis" element={<SimulationModulePage />} />
            <Route path="/engineering-analysis/reports" element={<SimulationModulePage />} />
            <Route
              path="/engineering-analysis/reports/new"
              element={<SimulationValidationReportFormPage />}
            />
            <Route
              path="/engineering-analysis/reports/:reportId/edit"
              element={<SimulationValidationReportFormPage />}
            />
            <Route
              path="/engineering-analysis/reports/:reportId"
              element={<SimulationValidationReportDetailPage />}
            />

            {/* Preserved engineering-analysis registers and reports (pre-Module 06). */}
            <Route path="/engineering-analysis/register" element={<LegacyAnalysisPage mode="register" />} />
            <Route path="/engineering-analysis/register/new" element={<AnalysisFormPage />} />
            <Route
              path="/engineering-analysis/register/:analysisId/edit"
              element={<AnalysisFormPage />}
            />
            <Route
              path="/engineering-analysis/register/:analysisId"
              element={<AnalysisDetailPage />}
            />
            <Route path="/engineering-analysis/review" element={<LegacyAnalysisPage mode="review" />} />
            <Route path="/engineering-analysis/review/:reviewId" element={<ReviewDetailPage />} />
            <Route path="/engineering-analysis/legacy-reports" element={<LegacyAnalysisPage mode="reports" />} />
            <Route
              path="/engineering-analysis/legacy-reports/:reportId/edit"
              element={<ValidationReportFormPage />}
            />
            <Route
              path="/engineering-analysis/legacy-reports/:reportId"
              element={<ValidationReportDetailPage />}
            />
            <Route path="/engineering-analysis/:submodule" element={<Navigate to="/engineering-analysis" replace />} />

            <Route path="/manufacturing-design" element={<ManufacturingModulePage />} />
            <Route path="/manufacturing-design/definition" element={<ManufacturingModulePage />} />
            <Route path="/manufacturing-design/inspection" element={<ManufacturingModulePage />} />
            <Route path="/manufacturing-design/process" element={<ManufacturingModulePage />} />
            <Route path="/manufacturing-design/:kind/new" element={<ManufacturingFormPage />} />
            <Route
              path="/manufacturing-design/:kind/:recordId/edit"
              element={<ManufacturingFormPage />}
            />
            <Route
              path="/manufacturing-design/:kind/:recordId"
              element={<ManufacturingDetailPage />}
            />
            <Route path="/manufacturing-design/:submodule" element={<ManufacturingModulePage />} />

            <Route path="/bom-cost" element={<BomCostModulePage />} />
            <Route path="/bom-cost/bom" element={<BomCostModulePage />} />
            <Route path="/bom-cost/bom/new" element={<BomFormPage />} />
            <Route path="/bom-cost/bom/:bomId/edit" element={<BomFormPage />} />
            <Route path="/bom-cost/bom/:bomId" element={<BomDetailPage />} />
            <Route path="/bom-cost/cost" element={<BomCostModulePage />} />
            <Route path="/bom-cost/estimate/new" element={<CostEstimateFormPage />} />
            <Route path="/bom-cost/estimate/:estimateId/edit" element={<CostEstimateFormPage />} />
            <Route path="/bom-cost/estimate/:estimateId" element={<CostEstimateDetailPage />} />
            <Route path="/bom-cost/material/new" element={<MaterialFormPage />} />
            <Route path="/bom-cost/material/:materialId/edit" element={<MaterialFormPage />} />
            <Route path="/bom-cost/material/:materialId" element={<MaterialDetailPage />} />
            <Route path="/bom-cost/quantity/new" element={<QuantityFormPage />} />
            <Route path="/bom-cost/quantity/:calcId/edit" element={<QuantityFormPage />} />
            <Route path="/bom-cost/quantity/:calcId" element={<QuantityDetailPage />} />
            <Route path="/bom-cost/releases" element={<BomCostModulePage />} />
            <Route path="/bom-cost/:submodule" element={<BomCostModulePage />} />

            <Route path="/cad-management" element={<CadManagementModulePage />} />
            <Route path="/cad-management/repository" element={<CadManagementModulePage />} />
            <Route path="/cad-management/drawings" element={<CadManagementModulePage />} />
            <Route path="/cad-management/viewer" element={<CadManagementModulePage />} />
            <Route path="/cad-management/releases" element={<CadManagementModulePage />} />
            <Route path="/cad-management/files/new" element={<CadFileFormPage />} />
            <Route path="/cad-management/repository/:fileId" element={<CadFileDetailPage />} />
            <Route path="/cad-management/project/:projectId" element={<CadManagementModulePage />} />
            <Route path="/cad-management/drawings/new" element={<DrawingFormPage />} />
            <Route path="/cad-management/drawings/:drawingId/edit" element={<DrawingFormPage />} />
            <Route path="/cad-management/drawings/:drawingId" element={<DrawingDetailPage />} />
            <Route path="/cad-management/:submodule" element={<CadManagementModulePage />} />

            <Route path="/design-review" element={<ApprovalsModulePage />} />
            <Route path="/design-review/engineering" element={<ApprovalsModulePage />} />
            <Route path="/design-review/manufacturing" element={<ApprovalsModulePage />} />
            <Route path="/design-review/client" element={<Navigate to="/design-review/releases" replace />} />
            <Route path="/design-review/releases" element={<ApprovalsModulePage />} />
            <Route path="/design-review/new" element={<NewReviewPage />} />
            <Route path="/design-review/review/:reviewId/edit" element={<NewReviewPage />} />
            <Route path="/design-review/review/:reviewId" element={<ApprovalReviewDetailPage />} />
            <Route path="/approvals/*" element={<Navigate to="/design-review" replace />} />

            <Route path="/engineering-release" element={<EngineeringReleaseModulePage />} />
            <Route path="/engineering-release/ecr-eco" element={<EngineeringReleaseModulePage />} />
            <Route path="/engineering-release/release" element={<EngineeringReleaseModulePage />} />
            <Route path="/engineering-release/ecr/:changeId" element={<EcrDetailPage />} />
            <Route path="/engineering-release/eco" element={<Navigate to="/engineering-release/ecr-eco" replace />} />
            <Route path="/engineering-change" element={<Navigate to="/engineering-release" replace />} />

            <Route path="/design-handover" element={<DesignHandoverModulePage />} />
            <Route path="/design-handover/package" element={<DesignHandoverModulePage />} />
            <Route path="/design-handover/validation" element={<DesignHandoverModulePage />} />
            <Route path="/design-handover/send" element={<DesignHandoverModulePage />} />
            <Route path="/design-handover/history" element={<DesignHandoverModulePage />} />
            <Route path="/design-handover/new" element={<NewHandoverPage />} />
            <Route path="/design-handover/:handoverId/edit" element={<NewHandoverPage />} />
            <Route path="/design-handover/:handoverId" element={<HandoverDetailPage />} />

            <Route path="/transfers" element={<TransfersModulePage />} />
            <Route path="/transfers/purchase" element={<TransfersModulePage />} />
            <Route path="/transfers/production" element={<TransfersModulePage />} />
            <Route path="/transfers/tracking" element={<TransfersModulePage />} />
            <Route path="/transfers/history" element={<TransfersModulePage />} />
            <Route path="/transfers/new" element={<NewTransferPage />} />
            <Route path="/transfers/:transferId/edit" element={<NewTransferPage />} />
            <Route path="/transfers/:transferId" element={<TransferDetailPage />} />

            <Route path="/reports" element={<Module14ReportsPage />} />
            {REPORT_TABS.map((tab) => (
              <Route key={`reports-${tab.key}`} path={tab.path} element={<Module14ReportsPage />} />
            ))}

            <Route path="/settings" element={<SettingsModulePage />} />
            <Route path="/settings/:sectionKey/edit" element={<SettingsModulePage />} />
            <Route path="/settings/:sectionKey" element={<SettingsModulePage />} />

            {GENERIC_MODULES.map((module) => (
              <Route key={module.base} path={module.base} element={<ModulePage />} />
            ))}
            {GENERIC_MODULES.map((module) => (
              <Route
                key={`${module.base}-submodule`}
                path={`${module.base}/:submodule`}
                element={<ModulePage />}
              />
            ))}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
        </SettingsProvider>
        </WorkflowConversionProvider>
        </TransfersProvider>
        </DesignHandoverProvider>
        </EngineeringReleaseProvider>
        </ApprovalsProvider>
        </CadProvider>
        </BomProvider>
        </ManufacturingProvider>
        </SimulationProvider>
        </AnalysisProvider>
        </MechanicalProvider>
        </ConceptProvider>
        </PlanningProvider>
                </QuotationReviewProvider>
      </CustomerEnquiryProvider>
        </EnquiryRequestProvider>
      </ProjectsProvider>
    </BrowserRouter>
  );
}
