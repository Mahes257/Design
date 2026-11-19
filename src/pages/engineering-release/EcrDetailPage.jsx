import { Link, useParams } from 'react-router-dom';
import { GitPullRequest } from 'lucide-react';
import { StatusBadge } from '../../components/common';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useProjects } from '../../context/ProjectsContext';
import { useMechanical } from '../../context/MechanicalContext';
import { formatDate } from '../../data/projectData';
import { engineeringTone } from '../../data/engineeringReleaseData';

/**
 * Engineering Change Request details — full-page record for one ECR ID. The
 * linked ECO, design and revision targets are read from the release context.
 */
export default function EcrDetailPage() {
  const { changeId } = useParams();
  const { changes, ecos } = useEngineeringRelease();
  const { projects } = useProjects();
  const { designs } = useMechanical();

  const change = changes.find((row) => row.id === changeId);

  if (!change) {
    return (
      <RecordNotFound
        icon={GitPullRequest}
        title="Engineering change request not found"
        message={`No ECR with ID ${changeId} exists in the current register.`}
        backTo="/engineering-release"
        backLabel="Back to ECR Register"
      />
    );
  }

  const project = projects.find((row) => row.id === change.projectId);
  const design = designs.find((row) => row.id === change.designId);
  const eco = ecos.find((row) => row.id === change.ecoId || row.sourceEcrId === change.id);

  const used = [
    'id', 'title', 'changeDescription', 'description', 'projectId', 'designId', 'changeType',
    'priority', 'requestedBy', 'raisedBy', 'requestedDate', 'raisedAt', 'ecrDecision', 'status',
    'impact', 'initialAssessment', 'affectedParts', 'proposedBomRevision',
    'proposedDrawingRevision', 'assessmentNotes', 'assessedBy', 'ecoId', 'history', 'approvals',
    'attachments',
  ];

  const sections = [
    {
      title: 'Change Request',
      icon: GitPullRequest,
      fields: [
        { label: 'ECR Number', value: change.id },
        { label: 'Title', value: change.title || change.changeDescription },
        { label: 'Change Type', value: change.changeType },
        { label: 'Priority', value: change.priority },
        { label: 'Requested By', value: change.requestedBy || change.raisedBy },
        { label: 'Requested Date', value: formatDate(change.requestedDate || change.raisedAt) },
        { label: 'ECR Decision', value: change.ecrDecision || 'Pending' },
        { label: 'Workflow Status', value: change.status },
      ],
    },
    {
      title: 'Affected Engineering Records',
      icon: GitPullRequest,
      fields: [
        { label: 'Project', value: `${change.projectId} · ${project?.name || '—'}` },
        { label: 'Design', value: design ? `${design.id} · ${design.name}` : change.designId || 'Not linked' },
        { label: 'Affected Parts / Assemblies', value: change.affectedParts, wide: true },
        { label: 'Proposed BOM Revision', value: change.proposedBomRevision || 'Not stated' },
        { label: 'Proposed Drawing Revision', value: change.proposedDrawingRevision || 'Not stated' },
      ],
    },
    {
      title: 'Impact Assessment',
      icon: GitPullRequest,
      fields: [
        { label: 'Impact', value: change.impact || change.initialAssessment, wide: true },
        { label: 'Assessment Notes', value: change.assessmentNotes, wide: true },
        { label: 'Assessed By', value: change.assessedBy || 'Not recorded' },
      ],
    },
  ];

  const extra = remainingFields(change, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: GitPullRequest, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Engineering Change & Release', to: '/engineering-release' },
        { label: 'ECR Register', to: '/engineering-release' },
        { label: change.id },
      ]}
      icon={GitPullRequest}
      title={change.title || change.changeDescription || change.id}
      subtitle={`${change.id} · ${change.projectId} · ${change.changeType || 'Change request'}`}
      recordRef={change.id}
      status={<StatusBadge status={change.status} tone={engineeringTone(change.status)} />}
      chips={
        <>
          <StatusBadge
            status={change.ecrDecision || 'Pending'}
            tone={engineeringTone(change.ecrDecision)}
          />
          {change.priority && <span className="chip">{change.priority}</span>}
          {eco && <span className="chip">{eco.id}</span>}
        </>
      }
      meta={[
        ['ECR Number', change.id],
        ['Project', `${change.projectId} · ${project?.name || '—'}`],
        ['Requested By', change.requestedBy || change.raisedBy || '—'],
        ['Requested Date', formatDate(change.requestedDate || change.raisedAt)],
        ['Decision', change.ecrDecision || 'Pending'],
        ['Linked ECO', eco?.id || 'Not raised'],
      ]}
      backTo="/engineering-release"
      backLabel="Back to ECR Register"
      sections={sections}
      related={[
        {
          label: 'Project',
          value: (
            <Link className="cell-link" to={`/projects/all-projects/${change.projectId}`}>
              {change.projectId} · {project?.name || '—'}
            </Link>
          ),
        },
        {
          label: 'Design',
          value: design ? (
            <Link className="cell-link" to={`/mechanical-design/design-register/${design.id}`}>
              {design.id} · {design.name}
            </Link>
          ) : (
            'Not linked'
          ),
        },
        {
          label: 'Linked ECO',
          value: eco ? `${eco.id} · ${eco.status}` : 'No ECO raised from this ECR',
        },
      ]}
      history={(change.history || []).map((entry, index) => ({
        label: entry.action || entry.status || `Entry ${index + 1}`,
        detail: entry.description || entry.note,
        by: entry.by,
        at: entry.at ? formatDate(entry.at) : '',
      }))}
      note="Submitting or approving an ECR never changes a released revision. Revision changes are performed only through the linked ECO."
    />
  );
}
