import { Link, useNavigate, useParams } from 'react-router-dom';
import { Package, Pencil } from 'lucide-react';
import { Button, StatusBadge } from '../../components/common';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import { statusTone } from '../../data/mechanicalData';

/**
 * Part details — full-page record for one part ID. The part, its parent
 * assembly and its revision notes come from MechanicalContext; the project comes
 * from ProjectsContext. Every value is the stored record's own field.
 */
export default function PartDetailPage() {
  const { partId } = useParams();
  const navigate = useNavigate();
  const { parts, assemblies } = useMechanical();
  const { projects } = useProjects();

  const part = parts.find((row) => row.id === partId);

  if (!part) {
    return (
      <RecordNotFound
        icon={Package}
        title="Part not found"
        message={`No part with ID ${partId} exists in the current register.`}
        backTo="/mechanical-design/parts-assemblies"
        backLabel="Back to Parts & Assemblies"
      />
    );
  }

  const project = projects.find((row) => row.id === part.projectId);
  const parentAssembly = assemblies.find((row) => row.id === part.parentAssemblyId);
  const childAssemblies = assemblies.filter((row) => row.parentAssemblyId === part.id);

  const used = [
    'id', 'partNumber', 'name', 'projectId', 'domain', 'category', 'parentAssemblyId',
    'material', 'materialGrade', 'dimensions', 'length', 'width', 'height', 'diameter',
    'thickness', 'weight', 'uom', 'quantity', 'revision', 'owner', 'status', 'notes',
    'description', 'technicalNotes', 'cadRef', 'revisions',
  ];

  const sections = [
    {
      title: 'Identification',
      icon: Package,
      fields: [
        { label: 'Part ID', value: part.id },
        { label: 'Part Number', value: part.partNumber },
        { label: 'Part Name', value: part.name },
        { label: 'Category', value: part.category },
        { label: 'Engineering Domain', value: part.domain },
        { label: 'Project', value: `${part.projectId} · ${project?.name || 'Unknown project'}` },
        { label: 'Parent Assembly', value: parentAssembly ? `${parentAssembly.number} · ${parentAssembly.name}` : 'Not linked' },
        { label: 'CAD Reference', value: part.cadRef || 'Not recorded' },
      ],
    },
    {
      title: 'Material & Geometry',
      icon: Package,
      fields: [
        { label: 'Material', value: part.material },
        { label: 'Material Grade', value: part.materialGrade },
        { label: 'Overall Dimensions', value: part.dimensions },
        { label: 'Length', value: part.length ? `${part.length} mm` : '—' },
        { label: 'Width', value: part.width ? `${part.width} mm` : '—' },
        { label: 'Height', value: part.height ? `${part.height} mm` : '—' },
        { label: 'Diameter', value: part.diameter ? `Ø${part.diameter} mm` : '—' },
        { label: 'Thickness', value: part.thickness ? `${part.thickness} mm` : '—' },
        { label: 'Weight', value: part.weight ? `${part.weight} kg` : '—' },
      ],
    },
    {
      title: 'Quantity & Revision Control',
      icon: Package,
      fields: [
        { label: 'Quantity', value: part.quantity },
        { label: 'Unit of Measurement', value: part.uom },
        { label: 'Revision', value: `Rev ${part.revision}` },
        { label: 'Design Owner', value: part.owner },
        { label: 'Design Status', value: part.status },
      ],
    },
    {
      title: 'Description & Notes',
      icon: Package,
      fields: [
        { label: 'Part Description', value: part.description || part.notes, wide: true },
        { label: 'Technical Notes', value: part.technicalNotes, wide: true },
      ],
    },
  ];

  const extra = remainingFields(part, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: Package, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Mechanical Engineering Design', to: '/mechanical-design' },
        { label: 'Parts & Assemblies', to: '/mechanical-design/parts-assemblies' },
        { label: part.partNumber },
      ]}
      icon={Package}
      title={part.name}
      subtitle={`${part.partNumber} · ${part.projectId} · ${part.category}`}
      recordRef={part.partNumber}
      status={<StatusBadge status={part.status} tone={statusTone(part.status)} />}
      chips={
        <>
          <span className="chip">{part.domain}</span>
          <span className="chip">Rev {part.revision}</span>
        </>
      }
      meta={[
        ['Part Number', part.partNumber],
        ['Project', `${part.projectId} · ${project?.name || '—'}`],
        ['Material', `${part.material} (${part.materialGrade})`],
        ['Design Owner', part.owner],
        ['Quantity', `${part.quantity} ${part.uom}`],
        ['Revision', `Rev ${part.revision}`],
      ]}
      backTo="/mechanical-design/parts-assemblies"
      backLabel="Back to Parts & Assemblies"
      actions={
        <Button
          icon={Pencil}
          onClick={() => navigate(`/mechanical-design/parts-assemblies/parts/${part.id}/edit`)}
        >
          Edit Part
        </Button>
      }
      sections={sections}
      related={[
        {
          label: 'Project',
          value: (
            <Link className="cell-link" to={`/projects/all-projects/${part.projectId}`}>
              {part.projectId} · {project?.name || 'Unknown project'}
            </Link>
          ),
        },
        {
          label: 'Parent Assembly',
          value: parentAssembly ? (
            <Link
              className="cell-link"
              to={`/mechanical-design/parts-assemblies/assemblies/${parentAssembly.id}`}
            >
              {parentAssembly.number} · {parentAssembly.name}
            </Link>
          ) : (
            'Not linked'
          ),
        },
        {
          label: 'Child Assemblies',
          value:
            childAssemblies.length > 0
              ? childAssemblies.map((row) => row.number).join(', ')
              : 'None',
        },
        { label: 'CAD Reference', value: part.cadRef || 'Not recorded' },
      ]}
      history={(part.revisions || []).map((entry) => ({
        label: `Rev ${entry.revision}`,
        detail: entry.note,
        by: entry.by,
        at: entry.date ? formatDate(entry.date) : '',
      }))}
      note="Part records are stored in this browser. Revisions listed here are the revision notes already recorded on the part."
    />
  );
}
