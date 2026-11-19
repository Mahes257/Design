import { ArrowLeft, ArrowRightLeft, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, PageHeader, PageLayout, StatusBadge, ViewPageBanner } from '../../components/common';
import { DASHBOARD, MODULES } from '../../config/navigation';
import { useTransfers } from '../../context/TransfersContext';
import TransferDetailView from './TransferDetailView';

const MODULE = MODULES.find((module) => module.key === 'transfers');

export default function TransferDetailPage() {
  const { transferId } = useParams();
  const { transfers } = useTransfers();
  const transfer = transfers.find((row) => row.id === transferId);

  if (!transfer) {
    return (
      <PageLayout
        breadcrumb={<Breadcrumb items={[{ label: 'Dashboard', to: DASHBOARD.path }, { label: MODULE.label, to: MODULE.base }, { label: 'Transfer not found' }]} />}
        header={<PageHeader icon={MODULE.icon} title="Transfer not found" subtitle="The requested transfer record does not exist in this local dataset." />}
      >
        <div className="transfers-empty-page">
          <FileText aria-hidden="true" />
          <h2>{transferId}</h2>
          <p>This transfer may have been removed with a local dataset reset.</p>
          <Link className="erp-btn-primary" to="/transfers">Back to Transfer Register</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={ArrowRightLeft}
        eyebrow={transfer.id}
        title={transfer.deliverableName || `Transfer ${transfer.id}`}
        subtitle={`${transfer.deliverableNumber} · Rev ${transfer.revision}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: DASHBOARD.path },
              { label: MODULE.label, to: MODULE.base },
              { label: 'Transfer Details' },
              { label: transfer.id },
            ]}
          />
        }
        chips={<StatusBadge status={transfer.status} />}
        meta={[
          ['Transfer ID', transfer.id],
          ['Deliverable', transfer.deliverableNumber],
          ['Deliverable Name', transfer.deliverableName],
          ['Revision', `Rev ${transfer.revision}`],
          ['Project', transfer.projectId],
          ['Destination', (transfer.destinations || []).join(' · ')],
        ]}
        actions={
          <Link className="btn-secondary" to="/transfers">
            <ArrowLeft aria-hidden="true" /> Back to Register
          </Link>
        }
      />
      <TransferDetailView transfer={transfer} />
    </PageLayout>
  );
}
