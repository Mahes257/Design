import { useState } from 'react';
import { ClipboardCheck, Clock3, GitPullRequest, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  KpiGrid,
  Modal,
  ModuleTabs,
  PageHeader,
  PageLayout,
  StatCard,
} from '../../components/common';
import { DASHBOARD, MODULES, findModuleTab, normalizePath } from '../../config/navigation';
import { useApprovals } from '../../context/ApprovalsContext';
import { reviewStats } from '../../data/approvalsData';
import ReviewRegisterTab from './ReviewRegisterTab';
import EngineeringReviewTab from './EngineeringReviewTab';
import ManufacturingReviewTab from './ManufacturingReviewTab';
import ReleaseHistoryTab from './ReleaseHistoryTab';

const MODULE = MODULES.find((module) => module.key === 'approvals');

const WORKFLOW = [
  'Review Register',
  'Engineering Review',
  'Manufacturing Review',
  'Approval & Review History',
];

function WorkflowStrip({ activeTab }) {
  return (
    <div className="approvals-workflow">
      <div className="approvals-workflow-track">
        {WORKFLOW.map((step, index) => (
          <span key={step} className={`approvals-workflow-step${activeTab?.label === step ? ' is-active' : ''}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step}
          </span>
        ))}
      </div>
      <p>
        Mandatory review stages run in order. Final approval is an explicit design-authority action and is blocked until
        every required stage is complete. Only a finally approved exact revision can be recommended for controlled release.
      </p>
    </div>
  );
}

export default function ApprovalsModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { reviews, resetApprovals } = useApprovals();
  const [resetOpen, setResetOpen] = useState(false);
  const tab = findModuleTab(MODULE, pathname);
  if (!tab) return <Navigate to={MODULE.base} replace />;

  const isBaseTab = normalizePath(pathname) === MODULE.base;
  const stats = reviewStats(reviews);

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
              <Button variant="secondary" icon={RotateCcw} onClick={() => setResetOpen(true)}>Reset Seed Data</Button>
              <Button icon={Plus} onClick={() => navigate('/design-review/new')}>
                New Review
              </Button>
            </div>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      <WorkflowStrip activeTab={tab} />
      <KpiGrid className="approvals-kpi-grid">
        <StatCard icon={Clock3} label="Pending Reviews" value={String(stats.pending)} sub="Active submissions awaiting a decision" tone="orange" />
        <StatCard icon={ClipboardCheck} label="In Review" value={String(stats.inReview)} sub="Engineering, manufacturing or client stage" tone="blue" />
        <StatCard icon={GitPullRequest} label="Changes Requested" value={String(stats.changes)} sub="Corrected revision required" tone="red" />
        <StatCard icon={ShieldCheck} label="Approved Releases" value={String(stats.releases)} sub="Controlled local release records" tone="emerald" />
      </KpiGrid>

      {tab.key === 'review-register' && <ReviewRegisterTab />}
      {tab.key === 'engineering-review' && <EngineeringReviewTab />}
      {tab.key === 'manufacturing-review' && <ManufacturingReviewTab />}
      {tab.key === 'release-history' && <ReleaseHistoryTab />}

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Design Review & Approval data"
        subtitle="Restore the 12 seeded reviews"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button icon={RotateCcw} onClick={() => { resetApprovals(); setResetOpen(false); }}>Reset Seed Data</Button>
          </>
        }
      >
        <p className="approvals-note">This replaces every local review, decision, comment, checklist update, resubmission and release record with the original mock dataset. Other modules are not changed.</p>
      </Modal>
    </PageLayout>
  );
}
