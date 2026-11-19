import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Calculator,
  Cog,
  FileText,
  History,
  Layers,
  Package,
  Pencil,
  ScrollText,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageLayout,
  StatusBadge,
  Tabs,
  ViewPageBanner,
} from '../../components/common';
import { useMechanical } from '../../context/MechanicalContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import {
  DESIGN_SPEC_FIELDS,
  assemblyTreePartCount,
  priorityTone,
  statusTone,
  techFieldsForDomain,
} from '../../data/mechanicalData';
import { ActivityList, Fact } from './mechanicalUi';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'technical', label: 'Technical Details' },
  { key: 'parts', label: 'Linked Parts' },
  { key: 'assemblies', label: 'Linked Assemblies' },
  { key: 'calculations', label: 'Calculations' },
  { key: 'documents', label: 'Documents / CAD' },
  { key: 'revisions', label: 'Revision History' },
  { key: 'activity', label: 'Activity History' },
];

export default function DesignDetailPage() {
  const { designId } = useParams();
  const navigate = useNavigate();
  const { designs, parts, assemblies, calculations } = useMechanical();
  const { concepts } = useConcept();
  const { projects } = useProjects();
  const [tab, setTab] = useState('overview');

  const design = designs.find((row) => row.id === designId);

  const linkedParts = useMemo(
    () => (design ? parts.filter((part) => design.linkedPartIds?.includes(part.id)) : []),
    [design, parts],
  );
  const linkedAssemblies = useMemo(
    () =>
      design ? assemblies.filter((assembly) => design.linkedAssemblyIds?.includes(assembly.id)) : [],
    [design, assemblies],
  );
  const linkedCalculations = useMemo(
    () =>
      design
        ? calculations.filter(
            (calculation) =>
              calculation.linkedId === design.id ||
              (calculation.linkedType === 'part' &&
                design.linkedPartIds?.includes(calculation.linkedId)),
          )
        : [],
    [design, calculations],
  );

  if (!design) {
    return <Navigate to="/mechanical-design/design-register" replace />;
  }

  const project = projects.find((row) => row.id === design.projectId);
  const concept = concepts.find((row) => row.id === design.conceptId);
  const techFields = techFieldsForDomain(design.domain);

  const partColumns = [
    { key: 'partNumber', label: 'Part Number', width: 120, render: (row) => <span className="cell-id">{row.partNumber}</span> },
    { key: 'name', label: 'Part Name', render: (row) => <span className="cell-strong">{row.name}</span> },
    { key: 'category', label: 'Category' },
    { key: 'material', label: 'Material' },
    { key: 'quantity', label: 'Qty', align: 'center' },
    { key: 'revision', label: 'Revision', align: 'center', render: (row) => `Rev ${row.revision}` },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} /> },
  ];

  const calculationColumns = [
    { key: 'id', label: 'Calculation ID', width: 116, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'title', label: 'Title', render: (row) => <span className="cell-strong cell-clamp">{row.title}</span> },
    { key: 'calcType', label: 'Type' },
    { key: 'preparedBy', label: 'Prepared By' },
    { key: 'revision', label: 'Rev', align: 'center', render: (row) => `Rev ${row.revision}` },
    { key: 'verificationStatus', label: 'Verification', render: (row) => <StatusBadge status={row.verificationStatus} tone={statusTone(row.verificationStatus)} /> },
  ];

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={Cog}
        eyebrow={design.id}
        title={design.name}
        subtitle={`${design.projectId} · ${project?.name || 'Unassigned'} · Rev ${design.revision}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Mechanical Engineering Design', to: '/mechanical-design' },
              { label: 'Design Register', to: '/mechanical-design/design-register' },
              { label: design.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={design.status} tone={statusTone(design.status)} />
            <span className="chip">{design.domain}</span>
            <span className="chip mech-rev-chip">Rev {design.revision}</span>
          </>
        }
        meta={[
          ['Project', `${design.projectId} · ${project?.name || 'Unassigned'}`],
          ['Design Owner', design.owner],
          ['Design Engineer', design.engineer],
          ['Technical Reviewer', design.reviewer],
          ['Target Date', formatDate(design.target)],
          ['CAD Reference', design.cadRef],
        ]}
        actions={
          <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/mechanical-design/design-register')}>
                Back to Register
              </Button>
              <Button
                variant="secondary"
                icon={Activity}
                onClick={() =>
                  navigate(`/engineering-analysis?project=${design.projectId}&design=${design.id}`)
                }
              >
                Simulation Workspace
              </Button>
              <Button icon={Pencil} onClick={() => navigate(`/mechanical-design/design-register/${design.id}/edit`)}>
                Edit Design
              </Button>
              <ConvertRecordButton type="design" record={design} size="sm" />
          </>
        }
      />
      <div className="mech-detail-card">
        <Tabs items={TABS} activeKey={tab} onChange={setTab} ariaLabel="Design details sections" />

        <div className="mech-detail-body">
          {tab === 'overview' && (
            <>
              <div className="mech-badge-row">
                <StatusBadge status={design.status} tone={statusTone(design.status)} />
                <StatusBadge status={design.priority} tone={priorityTone(design.priority)} />
                <span className="chip chip-mint">{design.domain}</span>
                <span className="chip">{design.category}</span>
                <span className="chip mech-rev-chip">Rev {design.revision}</span>
              </div>

              <div className="fact-grid">
                <Fact label="Design ID">{design.id}</Fact>
                <Fact label="Project">
                  {design.projectId} · {project?.name}
                </Fact>
                <Fact label="Selected Concept">
                  {design.conceptId
                    ? `${design.conceptId}${concept ? ` · ${concept.name}` : ''}`
                    : 'Not linked'}
                </Fact>
                <Fact label="Customer / Department">
                  {project?.customer || project?.department || 'Not captured'}
                </Fact>
                <Fact label="Source Request">{project?.sourceRequestId || 'Manual project'}</Fact>
                <Fact label="Design Plan">{design.designPlanId || 'Not linked'}</Fact>
                <Fact label="Product">{project?.product}</Fact>
                <Fact label="Design Owner">{design.owner}</Fact>
                <Fact label="Assigned Engineer">{design.engineer}</Fact>
                <Fact label="Technical Reviewer">{design.reviewer}</Fact>
                <Fact label="Created">{formatDate(design.created)}</Fact>
                <Fact label="Last Updated">{formatDate(design.updatedAt || design.created)}</Fact>
                <Fact label="Target">{formatDate(design.target)}</Fact>
                <Fact label="Linked Parts">{linkedParts.length}</Fact>
                <Fact label="Linked Assemblies">{linkedAssemblies.length}</Fact>
                <Fact label="Calculations">{linkedCalculations.length}</Fact>
                <Fact label="CAD Reference">{design.cadRef}</Fact>
              </div>

              <div className="mech-detail-sections">
                <section>
                  <h3>Description</h3>
                  <p>{design.description || 'No description recorded.'}</p>
                </section>
                <section>
                  <h3>Design Scope</h3>
                  <p>{design.scope || 'No scope recorded.'}</p>
                </section>
                <section>
                  <h3>Technical Notes</h3>
                  <p>{design.technicalNotes || 'No technical notes recorded.'}</p>
                </section>
              </div>

              <div className="mech-detail-sections">
                <section>
                  <h3>Design Specification</h3>
                  <p className="mech-detail-note">
                    Recorded engineering input for this design. Values are entered by the design
                    engineer; nothing here is calculated or verified automatically.
                  </p>
                  <dl className="detail-list detail-compact">
                    {DESIGN_SPEC_FIELDS.map((field) => (
                      <div key={field.key}>
                        <dt>{field.label}</dt>
                        <dd>{design[field.key] || 'Not captured'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                {(design.attachments || []).length > 0 && (
                  <section>
                    <h3>Supporting Attachments</h3>
                    <ul className="plan-comment-list">
                      {design.attachments.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                          <strong>{file.name}</strong>
                          <span className="cell-muted">
                            {Math.max(1, Math.round((file.size || 0) / 1024))} KB
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </>
          )}

          {tab === 'technical' && (
            <>
              <p className="mech-detail-note">
                Fields shown are the {design.domain} technical set. Other domains use their own
                relevant fields.
              </p>
              <div className="fact-grid">
                {techFields.map((field) => (
                  <Fact key={field.key} label={field.unit ? `${field.label} (${field.unit})` : field.label}>
                    {design.tech?.[field.key]}
                  </Fact>
                ))}
              </div>
            </>
          )}

          {tab === 'parts' && (
            <Card title="Linked Parts" subtitle="Parts recorded against this design" icon={Package}>
              <DataTable
                columns={partColumns}
                rows={linkedParts}
                ariaLabel="Linked parts"
                emptyContent={
                  <EmptyState
                    icon={Package}
                    title="No linked parts"
                    message="Link parts from the design form, or create them in Parts & Assemblies."
                  />
                }
              />
            </Card>
          )}

          {tab === 'assemblies' && (
            <Card
              title="Linked Assemblies"
              subtitle="Assembly structures that contain this design"
              icon={Layers}
            >
              {linkedAssemblies.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No linked assemblies"
                  message="Link an assembly from the design form to show the product structure here."
                />
              ) : (
                <ul className="mech-link-list">
                  {linkedAssemblies.map((assembly) => (
                    <li key={assembly.id}>
                      <span className="cell-id">{assembly.number}</span>
                      <span className="mech-link-name">{assembly.name}</span>
                      <span className="cell-muted">
                        {assemblyTreePartCount(assemblies, parts, assembly.id)} components · Rev{' '}
                        {assembly.revision}
                      </span>
                      <StatusBadge status={assembly.status} tone={statusTone(assembly.status)} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'calculations' && (
            <Card
              title="Design Calculations"
              subtitle="Calculations linked to this design or its parts"
              icon={Calculator}
            >
              <DataTable
                columns={calculationColumns}
                rows={linkedCalculations}
                ariaLabel="Linked calculations"
                onRowClick={(row) =>
                  navigate(`/mechanical-design/design-calculations/${row.id}`)
                }
                emptyContent={
                  <EmptyState
                    icon={Calculator}
                    title="No calculations linked"
                    message="Create a calculation from Design Calculations and reference this design or one of its parts."
                  />
                }
              />
            </Card>
          )}

          {tab === 'documents' && (
            <Card
              title="Documents & CAD References"
              subtitle="References only — CAD files are managed in Drawing & CAD Management"
              icon={FileText}
            >
              <div className="mech-doc-grid">
                <div className="mech-doc-card">
                  <span className="mech-doc-label">CAD Reference</span>
                  <strong>{design.cadRef || 'Not set'}</strong>
                  <span className="mech-doc-note">
                    Open Drawing &amp; CAD Management to view the drawing/model.
                  </span>
                </div>
                <div className="mech-doc-card">
                  <span className="mech-doc-label">Recorded Documents</span>
                  <strong>{(design.documents || []).length}</strong>
                  <span className="mech-doc-note">Attached by name and size in this module.</span>
                </div>
              </div>

              {(design.documents || []).length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents recorded"
                  message="Add file references from the design form. Binary files stay in CAD management."
                />
              ) : (
                <ul className="mech-document-list">
                  {design.documents.map((document) => (
                    <li key={document.name}>
                      <FileText aria-hidden="true" />
                      <span>{document.name}</span>
                      <span className="cell-muted">
                        {Math.max(1, Math.round(document.size / 1024))} KB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'revisions' && (
            <Card title="Revision History" subtitle="Every revision saved for this design" icon={History}>
              <ActivityList
                activity={(design.revisions || []).map((entry) => ({
                  id: `${entry.revision}-${entry.date}`,
                  label: `Rev ${entry.revision}`,
                  detail: entry.note,
                  by: entry.by,
                  at: entry.date,
                }))}
              />
            </Card>
          )}

          {tab === 'activity' && (
            <Card title="Activity History" subtitle="Record ownership and lifecycle events" icon={ScrollText}>
              <ActivityList activity={design.activity || []} />
            </Card>
          )}
        </div>
      </div>
      <WorkflowLinks type="design" recordId={design.id} />
    </PageLayout>
  );
}
