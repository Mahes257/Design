import { Link, useParams } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { useBom } from '../../context/BomContext';
import { useProjects } from '../../context/ProjectsContext';
import { costLinesFromEstimate, statusTone } from '../../data/bomData';
import { formatDate } from '../../data/projectData';
import { money } from './bomUi';

/**
 * Cost estimate details — full-page record for one estimate ID. The cost lines
 * are the estimate's own stored components; nothing is recalculated into the
 * record or copied from another estimate.
 */
export default function CostEstimateDetailPage() {
  const { estimateId } = useParams();
  const { estimates, boms } = useBom();
  const { projects } = useProjects();

  const estimate = estimates.find((row) => row.id === estimateId);

  if (!estimate) {
    return (
      <RecordNotFound
        icon={Coins}
        title="Cost estimate not found"
        message={`No cost estimate with ID ${estimateId} exists in the current register.`}
        backTo="/bom-cost/cost"
        backLabel="Back to Cost Estimation"
      />
    );
  }

  const project = projects.find((row) => row.id === estimate.projectId);
  const bom = boms.find((row) => row.id === estimate.bomId);
  const lines = costLinesFromEstimate(estimate);

  const used = [
    'id', 'projectId', 'bomId', 'product', 'revision', 'materialCost', 'purchasedCost',
    'labourCost', 'processCost', 'manufacturingCost', 'otherCost', 'totalCost', 'currency',
    'preparedBy', 'date', 'status', 'notes',
  ];

  const sections = [
    {
      title: 'Estimate Identification',
      icon: Coins,
      fields: [
        { label: 'Estimate ID', value: estimate.id },
        { label: 'Product / Assembly', value: estimate.product },
        { label: 'Project', value: `${estimate.projectId} · ${project?.name || '—'}` },
        { label: 'BOM', value: bom ? `${bom.id} · ${bom.title || bom.name || ''}` : estimate.bomId || 'Not linked' },
        { label: 'Revision', value: estimate.revision ? `Rev ${estimate.revision}` : '—' },
        { label: 'Prepared By', value: estimate.preparedBy },
        { label: 'Estimate Date', value: formatDate(estimate.date) },
        { label: 'Status', value: estimate.status },
        { label: 'Currency', value: estimate.currency || 'INR' },
      ],
    },
    {
      title: 'Cost Breakdown',
      icon: Coins,
      fields: lines.map((line) => ({
        label: line.label,
        value: money(Number(line.qty || 0) * Number(line.unitCost || 0)),
      })),
    },
  ];

  const extra = remainingFields(estimate, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: Coins, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'BOM & Cost Estimation', to: '/bom-cost' },
        { label: 'Cost Planning & Estimation', to: '/bom-cost/cost' },
        { label: estimate.id },
      ]}
      icon={Coins}
      title={estimate.product}
      subtitle={`${estimate.id} · ${estimate.projectId} · ${estimate.status}`}
      recordRef={estimate.id}
      status={<StatusBadge status={estimate.status} tone={statusTone(estimate.status)} />}
      chips={
        <>
          <span className="chip">{money(estimate.totalCost)}</span>
          {estimate.revision && <span className="chip">Rev {estimate.revision}</span>}
        </>
      }
      meta={[
        ['Estimate ID', estimate.id],
        ['Project', `${estimate.projectId} · ${project?.name || '—'}`],
        ['BOM', estimate.bomId || 'Not linked'],
        ['Total Estimate', money(estimate.totalCost)],
        ['Prepared By', estimate.preparedBy],
        ['Estimate Date', formatDate(estimate.date)],
      ]}
      backTo="/bom-cost/cost"
      backLabel="Back to Cost Estimation"
      sections={sections}
      related={[
        {
          label: 'BOM',
          value: bom ? (
            <Link className="cell-link" to={`/bom-cost/bom/${bom.id}`}>
              {bom.id} · {bom.title || bom.name || 'BOM'}
            </Link>
          ) : (
            'Not linked'
          ),
        },
        {
          label: 'Project',
          value: (
            <Link className="cell-link" to={`/projects/all-projects/${estimate.projectId}`}>
              {estimate.projectId} · {project?.name || '—'}
            </Link>
          ),
        },
      ]}
      note="Cost estimates are frontend records. Amounts are the values stored on this estimate, not a certified commercial quotation."
    />
  );
}
