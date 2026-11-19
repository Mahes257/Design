import { useState } from 'react';
import {
  ArrowRightLeft,
  ClipboardCheck,
  Factory,
  FileCheck2,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';
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
import { useTransfers } from '../../context/TransfersContext';
import TransferRegisterTab from './TransferRegisterTab';
import PurchaseTransferTab from './PurchaseTransferTab';
import ProductionTransferTab from './ProductionTransferTab';
import TransferTrackingTab from './TransferTrackingTab';
import TransferHistoryTab from './TransferHistoryTab';

const MODULE = MODULES.find((module) => module.key === 'transfers');

const STEPS = ['Approved Deliverables', 'Transfer Validation', 'Purchase / Production Handover', 'Acknowledgement', 'Transfer History'];

function WorkflowStrip({ activeTab }) {
  return (
    <div className="approvals-workflow transfers-workflow">
      <div className="approvals-workflow-track">
        {STEPS.map((step, index) => (
          <span
            key={step}
            className={`approvals-workflow-step${(activeTab?.key === 'transfer-register' && index === 0) || (activeTab?.key === 'purchase-transfer' && index === 2) || (activeTab?.key === 'production-transfer' && index === 2) || (activeTab?.key === 'transfer-tracking' && index === 3) || (activeTab?.key === 'transfer-history' && index === 4) ? ' is-active' : ''}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step}
          </span>
        ))}
      </div>
      <p>
        Approved and released revisions are validated before a controlled mock handover. Purchase and Production are acknowledged independently;
        neither acknowledgement completes the other. Actual procurement and manufacturing remain in the existing ERP.
      </p>
    </div>
  );
}

export default function TransfersModulePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { stats, resetTransfers } = useTransfers();
  const [resetOpen, setResetOpen] = useState(false);
  if (!MODULE) return <Navigate to={DASHBOARD.path} replace />;
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
          title="Engineering Release &amp; Transfer"
          subtitle="Hand approved engineering BOMs, drawings and manufacturing packages to Purchase and Production, and track acknowledgement and progress."
          actions={
            <div className="transfers-header-actions">
              <Button variant="secondary" icon={RotateCcw} onClick={() => setResetOpen(true)}>
                Reset Seed Data
              </Button>
              <Button icon={Plus} onClick={() => navigate('/transfers/new')}>
                New Transfer
              </Button>
            </div>
          }
        />
      }
      tabs={<ModuleTabs module={MODULE} activeTab={tab} />}
    >
      <WorkflowStrip activeTab={tab} />
      <KpiGrid className="approvals-kpi-grid transfers-kpi-grid">
        <StatCard icon={PackageCheck} label="Packages Transferred" value={String(stats.packagesTransferred)} sub="Transfer records with a recorded handover" tone="emerald" />
        <StatCard icon={ShoppingCart} label="Requisitions Raised" value={String(stats.requisitionsRaised)} sub="Mock material requisitions prepared" tone="blue" />
        <StatCard icon={Factory} label="Production Open" value={String(stats.productionOpen)} sub="Production handovers awaiting close-out" tone="orange" />
        <StatCard icon={FileCheck2} label="Released Drawings" value={String(stats.releasedDrawings)} sub="Released drawings eligible for Production" tone="purple" />
      </KpiGrid>

      {tab.key === 'transfer-register' && <TransferRegisterTab />}
      {tab.key === 'purchase-transfer' && <PurchaseTransferTab />}
      {tab.key === 'production-transfer' && <ProductionTransferTab />}
      {tab.key === 'transfer-tracking' && <TransferTrackingTab />}
      {tab.key === 'transfer-history' && <TransferHistoryTab />}

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Engineering Release &amp; Transfer data"
        subtitle="Restore the seeded transfer register"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button
              icon={RotateCcw}
              onClick={() => {
                resetTransfers();
                setResetOpen(false);
              }}
            >
              Reset Seed Data
            </Button>
          </>
        }
      >
        <p className="approvals-note">
          This restores the original mock transfers, handovers, acknowledgements, requisitions, packages, workflow records and history. No other
          module is changed and no ERP transaction is created or removed.
        </p>
      </Modal>

      <div className="transfers-module-note">
        <ArrowRightLeft aria-hidden="true" />
        <span>
          Frontend-only controlled handover records. Module 11 does not execute procurement or manufacturing and does not write to the ERP
          Purchase or Production modules.
        </span>
      </div>
    </PageLayout>
  );
}
