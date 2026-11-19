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
import ConceptDevelopmentTab from './ConceptDevelopmentTab';
import ConceptDetailsTab from './ConceptDetailsTab';

const MODULE = MODULES.find((module) => module.key === 'conceptual');

const TAB_SUBTITLES = {
  'concept-register':
    'Search and filter project-linked concepts; create, view and edit the concept register.',
  'concept-details':
    'Concept requirements, preliminary specifications, alternatives, comparison, review, attachments and selection.',
};

/**
 * Module 05 — Conceptual Design.
 *
 * Exactly two route-backed sections: Concept Register for the listing and
 * Concept Details for the complete concept workspace. Concept creation remains
 * a full-page action from the register.
 */
export default function ConceptualModulePage() {
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
            tab.key === 'concept-register' ? (
              <Button icon={Plus} onClick={() => navigate('/conceptual-design/concept-creation')}>
                New Concept
              </Button>
            ) : null
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      {tab.key === 'concept-register' && <ConceptDevelopmentTab />}
      {tab.key === 'concept-details' && <ConceptDetailsTab />}
    </PageLayout>
  );
}
