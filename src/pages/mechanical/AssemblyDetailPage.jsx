import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layers, Pencil } from 'lucide-react';
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
 * Assembly details — full-page record for one assembly ID, including the parts
 * and subassemblies that actually reference it.
 */
export default function AssemblyDetailPage() {
  const { assemblyId } = useParams();
  const navigate = useNavigate();
  const { assemblies, parts } = useMechanical();
  const { projects } = useProjects();

  const assembly = assemblies.find((row) => row.id === assemblyId);

  if (!assembly) {
    return (
      <RecordNotFound
        icon={Layers}
        title="Assembly not found"
        message={`No assembly with ID ${assemblyId} exists in the current register.`}
        backTo="/mechanical-design/parts-assemblies"
        backLabel="Back to Parts & Assemblies"
      />
    );
  }

  const project = projects.find((row) => row.id === assembly.projectId);
  const parent = assemblies.find((row) => row.id === assembly.parentAssemblyId);
  const children = assemblies.filter((row) => row.parentAssemblyId === assembly.id);
  const assemblyParts = parts.filter((row) => row.parentAssemblyId === assembly.id);

  const used = [
    'id', 'number', 'name', 'projectId', 'domain', 'parentAssemblyId', 'description',
    'revision', 'owner', 'status', 'notes', 'revisions',
  ];

  const sections = [
    {
      title: 'Identification',
      icon: Layers,
      fields: [
        { label: 'Assembly ID', value: assembly.id },
        { label: 'Assembly Number', value: assembly.number },
        { label: 'Assembly Name', value: assembly.name },
        { label: 'Engineering Domain', value: assembly.domain },
        { label: 'Project', value: `${assembly.projectId} · ${project?.name || 'Unknown project'}` },
        { label: 'Parent Assembly', value: parent ? `${parent.number} · ${parent.name}` : 'Top-level assembly' },
        { label: 'Revision', value: `Rev ${assembly.revision}` },
        { label: 'Design Owner', value: assembly.owner },
        { label: 'Status', value: assembly.status },
      ],
    },
    {
      title: 'Description & Notes',
      icon: Layers,
      fields: [
        { label: 'Description', value: assembly.description, wide: true },
        { label: 'Notes', value: assembly.notes, wide: true },
      ],
    },
    {
      title: 'Structure Summary',
      icon: Layers,
      fields: [
        { label: 'Direct Parts', value: String(assemblyParts.length) },
        { label: 'Direct Subassemblies', value: String(children.length) },
        {
          label: 'Direct Part Numbers',
          value: assemblyParts.map((row) => row.partNumber).join(', ') || 'None',
          wide: true,
        },
        {
          label: 'Subassemblies',
          value: children.map((row) => `${row.number} · ${row.name}`).join(', ') || 'None',
          wide: true,
        },
      ],
    },
  ];

  const extra = remainingFields(assembly, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: Layers, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Mechanical Engineering Design', to: '/mechanical-design' },
        { label: 'Parts & Assemblies', to: '/mechanical-design/parts-assemblies' },
        { label: assembly.number },
      ]}
      icon={Layers}
      title={assembly.name}
      subtitle={`${assembly.number} · ${assembly.projectId} · ${assembly.domain}`}
      recordRef={assembly.number}
      status={<StatusBadge status={assembly.status} tone={statusTone(assembly.status)} />}
      chips={
        <>
          <span className="chip">{assembly.domain}</span>
          <span className="chip">Rev {assembly.revision}</span>
          <span className="chip">{assemblyParts.length + children.length} direct components</span>
        </>
      }
      meta={[
        ['Assembly Number', assembly.number],
        ['Project', `${assembly.projectId} · ${project?.name || '—'}`],
        ['Design Owner', assembly.owner],
        ['Revision', `Rev ${assembly.revision}`],
        ['Direct Parts', String(assemblyParts.length)],
        ['Subassemblies', String(children.length)],
      ]}
      backTo="/mechanical-design/parts-assemblies"
      backLabel="Back to Parts & Assemblies"
      actions={
        <Button
          icon={Pencil}
          onClick={() =>
            navigate(`/mechanical-design/parts-assemblies/assemblies/${assembly.id}/edit`)
          }
        >
          Edit Assembly
        </Button>
      }
      sections={sections}
      related={[
        {
          label: 'Project',
          value: (
            <Link className="cell-link" to={`/projects/all-projects/${assembly.projectId}`}>
              {assembly.projectId} · {project?.name || 'Unknown project'}
            </Link>
          ),
        },
        {
          label: 'Parent Assembly',
          value: parent ? (
            <Link
              className="cell-link"
              to={`/mechanical-design/parts-assemblies/assemblies/${parent.id}`}
            >
              {parent.number} · {parent.name}
            </Link>
          ) : (
            'Top-level assembly'
          ),
        },
      ]}
      history={(assembly.revisions || []).map((entry) => ({
        label: `Rev ${entry.revision}`,
        detail: entry.note,
        by: entry.by,
        at: entry.date ? formatDate(entry.date) : '',
      }))}
      note="Assembly structure comes from the parts and subassemblies that reference this assembly in the mechanical design register."
    />
  );
}
