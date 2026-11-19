import { Plus } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  ModuleTabs,
  PageHeader,
  PageLayout,
} from '../../components/common';
import { DASHBOARD, MODULES } from '../../config/navigation';
import QuotationCommercialTab from './QuotationCommercialTab';
import RequestRegisterTab from './RequestRegisterTab';
import TechnicalAssessmentTab from './TechnicalAssessmentTab';

const MODULE = MODULES.find((module) => module.key === 'customer-sales');

const TAB_SUBTITLES = {
  'request-register':
    'One register for customer, R&D / PDE, service and inter-department requirements.',
  'technical-assessment':
    'Review the requirement, resolve clarifications, assess feasibility and record the technical decision.',
  'quotation-commercial':
    'Quotation and commercial review for customer requests only. Other sources skip this stage.',
};

function activeTab(pathname) {
  if (!MODULE) return null;
  const path = pathname.replace(/\/+$/, '') || '/';
  const matches = MODULE.tabs.filter(
    (tab) => path === tab.path || path.startsWith(`${tab.path}/`),
  );
  return matches.sort((a, b) => b.path.length - a.path.length)[0] || MODULE.tabs[0];
}

/**
 * Module 01 — Enquiry & Request Management.
 *
 * Four horizontal tabs over one register. The legacy customer enquiry routes
 * and the existing quotation register keep working (see App routes).
 */
export default function EnquiryRequestModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!MODULE) return <Navigate to={DASHBOARD.path} replace />;

  const tab = activeTab(pathname);
  const isBaseTab = tab.path === MODULE.base;
  const crumbs = [
    { label: 'Dashboard', to: DASHBOARD.path },
    isBaseTab ? { label: MODULE.label } : { label: MODULE.label, to: MODULE.base },
    ...(isBaseTab ? [] : [{ label: tab.label }]),
  ];

  const headerAction =
    tab.key === 'request-register' ? (
      <Button icon={Plus} onClick={() => navigate('/customer-sales/create')}>
        Add New Request
      </Button>
    ) : (
      <Button variant="secondary" icon={Plus} onClick={() => navigate('/customer-sales')}>
        Request Register
      </Button>
    );


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
      {tab.key === 'request-register' && <RequestRegisterTab />}
      {tab.key === 'technical-assessment' && <TechnicalAssessmentTab />}
      {tab.key === 'quotation-commercial' && <QuotationCommercialTab />}
    </PageLayout>
  );
}
