import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Cog,
  DraftingCompass,
  Factory,
  FileCheck2,
  FileText,
  FolderKanban,
  Layers,
  Lightbulb,
  ListChecks,
  Paperclip,
  Pencil,
  RefreshCw,
  Truck,
  Users,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  DataTable,
  EmptyState,
  Modal,
  ModuleTabs,
  PageHeader,
  PageLayout,
  ViewPageBanner,
  StatusBadge,
  Tabs,
} from '../../components/common';
import { MODULES } from '../../config/navigation';
import { useProjects } from '../../context/ProjectsContext';
import { usePlanning } from '../../context/PlanningContext';
import { useConcept } from '../../context/ConceptContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useAnalysis } from '../../context/AnalysisContext';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useApprovals } from '../../context/ApprovalsContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useTransfers } from '../../context/TransfersContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import {
  buildProjectStages,
  customerOrDepartment,
  projectStageModulePath,
  projectStageRecordPath,
} from '../../data/projectConversion';
import {
  buildProjectActivity,
  buildProjectDocuments,
  buildProjectRequirements,
  buildProjectTasks,
  daysBetween,
  formatDate,
  milestoneIsOverdue,
  milestoneStatusTone,
  projectIsDelayed,
  projectStatusTone,
} from '../../data/projectData';

const PROJECT_MODULE = MODULES.find((module) => module.key === 'projects');
const DETAILS_TAB = PROJECT_MODULE?.tabs.find((tab) => tab.key === 'project-details');

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Project Details' },
  { key: 'stages', label: 'Engineering Stages' },
  { key: 'records', label: 'Linked Records' },
  { key: 'documents', label: 'Documents' },
  { key: 'activity', label: 'Activity History' },
];

const STAGE_ICONS = {
  planning: ClipboardList,
  conceptual: Lightbulb,
  mechanical: Cog,
  validation: Activity,
  analysis: BarChart3,
  manufacturing: Factory,
  bom: Layers,
  cad: DraftingCompass,
  review: ClipboardCheck,
  change: RefreshCw,
  release: Truck,
};

const ACTIVITY_ICONS = {
  project: FolderKanban,
  task: ClipboardList,
  drawing: DraftingCompass,
  review: FileCheck2,
  handover: Truck,
};

const ATTACHMENT_LABELS = {
  'customer-drawings': 'Customer Drawings',
  'reference-cad': 'Reference CAD',
  specifications: 'Technical Specifications',
  pdf: 'PDF Documents',
  images: 'Reference Images',
  supporting: 'Supporting Documents',
};

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status) {
  return String(status || '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '');
}

function SummaryFact({ label, children }) {
  return (
    <div className="project-summary-field">
      <span className="project-summary-label">{label}</span>
      <span className="project-summary-value">{children || '—'}</span>
    </div>
  );
}

/**
 * Project Details & Progress — tabbed project workspace modelled on the
 * Mechanical Design detail page. Engineering stages are derived from linked
 * workflow records and every stage opens its real record or module.
 */
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, team, milestones } = useProjects();
  const { plans } = usePlanning();
  const { concepts } = useConcept();
  const { designs } = useMechanical();
  const { analyses } = useAnalysis();
  const { recordsFor } = useManufacturing();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { reviews } = useApprovals();
  const { changes } = useEngineeringRelease();
  const { transfers } = useTransfers();
  const [stageModal, setStageModal] = useState(null);

  const project = projects.find((item) => item.id === projectId);

  const requirements = useMemo(() => (project ? buildProjectRequirements(project) : []), [project]);
  const tasks = useMemo(() => (project ? buildProjectTasks(project) : []), [project]);
  const documents = useMemo(() => (project ? buildProjectDocuments(project) : []), [project]);
  const activity = useMemo(() => (project ? buildProjectActivity(project) : []), [project]);
  const projectTeam = useMemo(
    () => team.filter((member) => member.projectId === projectId),
    [team, projectId],
  );
  const projectMilestones = useMemo(
    () => milestones.filter((milestone) => milestone.projectId === projectId),
    [milestones, projectId],
  );
  const stages = useMemo(() => {
    if (!project) return [];
    const forProject = (rows) =>
      (Array.isArray(rows) ? rows : []).filter((row) => row.projectId === projectId);
    return buildProjectStages(project, {
      plans: forProject(plans),
      concepts: forProject(concepts),
      designs: forProject(designs),
      analyses: forProject(analyses),
      manufacturing: forProject(recordsFor('definition')),
      boms: forProject(boms),
      drawings: forProject(drawings),
      reviews: forProject(reviews),
      changes: forProject(changes),
      transfers: forProject(transfers),
    });
  }, [project, projectId, plans, concepts, designs, analyses, recordsFor, boms, drawings, reviews, changes, transfers]);

  useEffect(() => {
    if (project) sessionStorage.setItem('md-last-project-id', project.id);
  }, [project]);

  if (!project) return <Navigate to="/projects" replace />;

  const requestedTab = searchParams.get('tab') || (hash === '#project-stages' ? 'stages' : 'overview');
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'overview';
  const changeTab = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next);
  };

  const duration = daysBetween(project.start, project.target);
  const overdueMilestones = projectMilestones.filter(milestoneIsOverdue).length;
  const completedMilestones = projectMilestones.filter(
    (milestone) => milestone.status === 'Completed',
  ).length;
  const settledStages = stages.filter((stage) => ['Approved', 'Completed'].includes(stage.status)).length;
  const activeStage = [...stages]
    .reverse()
    .find((stage) => ['In Progress', 'Under Review'].includes(stage.status));
  const linkedRecords = stages.flatMap((stage) =>
    stage.records.map((record) => ({
      ...record,
      stage: stage.label,
      module: stage.module,
      stageKey: stage.key,
      href: projectStageRecordPath(stage.key, record),
    })),
  );

  const openStage = (stage) => {
    if (stage.records.length === 1) {
      navigate(projectStageRecordPath(stage.key, stage.records[0]));
      return;
    }
    setStageModal(stage);
  };

  const openStageModule = (stage) => {
    setStageModal(null);
    navigate(projectStageModulePath(stage.key));
  };

  const factRows = [
    [
      'Enquiry ID',
      project.sourceEnquiryId ? (
        <Link
          key="source-enquiry"
          className="qr-inline-link"
          to={`/customer-enquiries/${project.sourceEnquiryId}`}
        >
          {project.sourceEnquiryId}
        </Link>
      ) : (
        'Not linked'
      ),
    ],
    [
      'Quotation ID',
      project.sourceQuotationId ? (
        <Link
          key="source-quotation"
          className="qr-inline-link"
          to={`/quotation-review/${
            project.sourceQuotationInternalId || project.sourceQuotationId
          }`}
        >
          {project.sourceQuotationId}
          {project.sourceQuotationRevision ? ` · Rev ${project.sourceQuotationRevision}` : ''}
        </Link>
      ) : (
        'Not linked'
      ),
    ],
    ['Customer / Department', customerOrDepartment(project)],
    ['Source Request ID', project.sourceRequestId || 'Manual project'],
    ['Product / Machine', project.product],
    ['Engineering Domain', project.domain],
    ['Project Type', project.type],
    ['Project Manager', project.manager],
    ['Technical Reviewer', project.reviewer],
    ['Start Date', formatDate(project.start)],
    ['Target Date', formatDate(project.target)],
    ['Duration', `${duration} days`],
    ['Attachments', String(project.attachments || 0)],
  ];

  const requirementColumns = [
    {
      key: 'title',
      label: 'Requirement',
      render: (row) => <span className="cell-strong">{row.title}</span>,
    },
    { key: 'category', label: 'Category', width: 160 },
    {
      key: 'priority',
      label: 'Priority',
      width: 110,
      render: (row) => (
        <span className={`priority-pill priority-${row.priority.toLowerCase()}`}>{row.priority}</span>
      ),
    },
    { key: 'owner', label: 'Owner', width: 150 },
    {
      key: 'status',
      label: 'Status',
      width: 150,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const taskColumns = [
    { key: 'id', label: 'Task ID', width: 120, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'title', label: 'Design Task', render: (row) => <span className="cell-strong">{row.title}</span> },
    { key: 'discipline', label: 'Discipline', width: 120 },
    { key: 'engineer', label: 'Assigned Engineer', width: 150 },
    {
      key: 'due',
      label: 'Due Date',
      width: 126,
      render: (row) => <span className="cell-muted">{formatDate(row.due)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const teamColumns = [
    { key: 'name', label: 'Team Member', width: 160, render: (row) => <span className="cell-strong">{row.name}</span> },
    { key: 'role', label: 'Role', width: 170 },
    { key: 'discipline', label: 'Discipline', width: 120 },
    { key: 'responsibilities', label: 'Responsibilities' },
    {
      key: 'allocation',
      label: 'Allocation',
      width: 130,
      render: (row) => <span className="progress-value">{row.allocation}%</span>,
    },
  ];

  const milestoneColumns = [
    {
      key: 'name',
      label: 'Milestone',
      render: (row) => (
        <span className="cell-strong">
          {row.name}
          {milestoneIsOverdue(row) && <span className="chip chip-overdue">Overdue</span>}
        </span>
      ),
    },
    { key: 'owner', label: 'Owner', width: 150 },
    {
      key: 'planned',
      label: 'Planned Date',
      width: 130,
      render: (row) => <span className="cell-muted">{formatDate(row.planned)}</span>,
    },
    {
      key: 'actual',
      label: 'Actual Date',
      width: 130,
      render: (row) => <span className="cell-muted">{formatDate(row.actual)}</span>,
    },
    {
      key: 'progress',
      label: 'Progress',
      width: 140,
      render: (row) => (
        <span className="progress-cell">
          <span className="progress-track">
            <span className="progress-fill" style={{ width: `${row.progress}%` }} />
          </span>
          <span className="progress-value">{row.progress}%</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 130,
      render: (row) => <StatusBadge status={row.status} tone={milestoneStatusTone(row.status)} />,
    },
  ];

  const documentColumns = [
    { key: 'name', label: 'Document', render: (row) => <span className="cell-strong">{row.name}</span> },
    { key: 'type', label: 'Type', width: 130 },
    { key: 'revision', label: 'Revision', width: 100 },
    {
      key: 'date',
      label: 'Issued',
      width: 130,
      render: (row) => <span className="cell-muted">{formatDate(row.date)}</span>,
    },
    {
      key: 'size',
      label: 'Size',
      width: 100,
      render: (row) => <span className="cell-muted">{row.size} MB</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const attachmentRows = (project.attachmentFiles || []).map((file, index) => ({
    ...file,
    id: `${file.name}-${index}`,
  }));

  const attachmentColumns = [
    {
      key: 'name',
      label: 'Attachment',
      render: (row) => (
        <span className="cell-strong">
          <Paperclip size={13} aria-hidden="true" /> {row.name}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: 210,
      render: (row) => ATTACHMENT_LABELS[row.category] || 'Supporting Documents',
    },
    {
      key: 'size',
      label: 'Size',
      width: 100,
      render: (row) => <span className="cell-muted">{formatFileSize(row.size)}</span>,
    },
  ];

  const linkedRecordColumns = [
    {
      key: 'id',
      label: 'Record',
      width: 150,
      render: (row) => (
        <Link className="qr-inline-link cell-strong" to={row.href}>
          {row.id}
        </Link>
      ),
    },
    {
      key: 'title',
      label: 'Record Name',
      render: (row) => row.title || '—',
    },
    { key: 'stage', label: 'Engineering Stage', width: 220 },
    { key: 'module', label: 'Module', width: 200 },
    {
      key: 'status',
      label: 'Status',
      width: 140,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: '',
      width: 78,
      render: (row) => (
        <Link className="project-record-open" to={row.href}>
          Open <ArrowRight size={12} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <PageLayout tabs={<ModuleTabs module={PROJECT_MODULE} activeTab={DETAILS_TAB} />}>
      <ViewPageBanner
        icon={FolderKanban}
        eyebrow={project.id}
        title={project.name}
        subtitle={`${customerOrDepartment(project)} · ${project.product}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Project Management', to: '/projects' },
              { label: 'Project Details & Progress' },
              { label: project.name },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={project.status} tone={projectStatusTone(project.status)} />
            {projectIsDelayed(project) && <span className="chip chip-overdue">Delayed</span>}
            <span className={`priority-pill priority-${project.priority.toLowerCase()}`}>
              {project.priority}
            </span>
            <span className="chip chip-mint">{project.domain}</span>
          </>
        }
        meta={[
          ['Project Number', project.id],
          ['Customer / Department', customerOrDepartment(project)],
          ['Project Manager', project.manager],
          ['Start Date', formatDate(project.start)],
          ['Target Date', formatDate(project.target)],
          ['Overall Progress', `${project.progress}%`],
        ]}
        actions={
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/projects')}>
              Back to Projects
            </Button>
            <Button
              icon={Pencil}
              onClick={() => navigate(`/projects/new-project/${project.id}`)}
            >
              Edit Project
            </Button>
            <ConvertRecordButton type="project" record={project} size="sm" />
          </>
        }
      />
      <section className="project-summary-card" aria-label="Project summary">
        <div className="project-summary-top">
          <span className="project-summary-icon" aria-hidden="true">
            <FolderKanban />
          </span>
          <div className="project-summary-identity">
            <strong>{project.name}</strong>
            <span>
              {project.id} · {project.reference || 'No reference'}
            </span>
          </div>
          <div className="project-summary-badges">
            <StatusBadge status={project.status} tone={projectStatusTone(project.status)} />
            <span className={`priority-pill priority-${project.priority.toLowerCase()}`}>
              {project.priority}
            </span>
            <span className="chip chip-mint">{project.domain}</span>
          </div>
        </div>
        <div className="project-summary-grid">
          <SummaryFact label="Project Number">{project.id}</SummaryFact>
          <SummaryFact label="Project Name">{project.name}</SummaryFact>
          <SummaryFact label="Customer">{customerOrDepartment(project)}</SummaryFact>
          <SummaryFact label="Project Manager">{project.manager}</SummaryFact>
          <SummaryFact label="Project Owner">{project.owner || 'Not captured'}</SummaryFact>
          <SummaryFact label="Start Date">{formatDate(project.start)}</SummaryFact>
          <SummaryFact label="Target Date">{formatDate(project.target)}</SummaryFact>
          <SummaryFact label="Priority">{project.priority}</SummaryFact>
          <SummaryFact label="Project Status">
            <StatusBadge status={project.status} tone={projectStatusTone(project.status)} />
          </SummaryFact>
          <SummaryFact label="Overall Progress">
            <span className="project-summary-progress">
              <span className="progress-track">
                <span
                  className={`progress-fill tone-${
                    project.status === 'Completed'
                      ? 'green'
                      : projectIsDelayed(project)
                        ? 'red'
                        : 'teal'
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </span>
              <strong>{project.progress}%</strong>
            </span>
          </SummaryFact>
        </div>
      </section>

      <div className="mech-detail-card project-detail-card">
        <Tabs items={TABS} activeKey={activeTab} onChange={changeTab} ariaLabel="Project details sections" />
        <div className="mech-detail-body">
          {activeTab === 'overview' && (
            <>
              <div className="mech-badge-row">
                <StatusBadge status={project.status} tone={projectStatusTone(project.status)} />
                <span className={`priority-pill priority-${project.priority.toLowerCase()}`}>
                  {project.priority} priority
                </span>
                <span className="chip chip-mint">{project.domain}</span>
                <span className="chip">{project.type}</span>
                {projectIsDelayed(project) && <span className="chip chip-overdue">Delayed</span>}
              </div>

              <div className="project-overview-grid">
                <div className="project-overview-main">
                  <section>
                    <h3>Project Description</h3>
                    <p>{project.description || 'No description recorded.'}</p>
                  </section>
                  <section>
                    <h3>Objectives</h3>
                    <p>{project.objectives || 'No separate objectives recorded for this project.'}</p>
                  </section>
                  <section>
                    <h3>Scope</h3>
                    <p>{project.scope || 'Scope to be confirmed.'}</p>
                  </section>
                  <section>
                    <h3>Deliverables</h3>
                    {project.deliverables?.length ? (
                      <div className="detail-chip-row">
                        {project.deliverables.map((deliverable) => (
                          <span className="chip chip-mint" key={deliverable}>
                            {deliverable}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>No deliverables recorded.</p>
                    )}
                  </section>
                </div>

                <aside className="project-overview-side">
                  <div className="project-mini-facts">
                    <SummaryFact label="Project Owner">{project.owner || 'Not captured'}</SummaryFact>
                    <SummaryFact label="Project Manager">{project.manager}</SummaryFact>
                    <SummaryFact label="Customer">{customerOrDepartment(project)}</SummaryFact>
                    <SummaryFact label="Start Date">{formatDate(project.start)}</SummaryFact>
                    <SummaryFact label="Target Date">{formatDate(project.target)}</SummaryFact>
                    <SummaryFact label="Duration">{duration} days</SummaryFact>
                    <SummaryFact label="Team">
                      {projectTeam.length} member{projectTeam.length === 1 ? '' : 's'}
                    </SummaryFact>
                    <SummaryFact label="Milestones">
                      {completedMilestones} of {projectMilestones.length} completed
                      {overdueMilestones > 0 ? ` · ${overdueMilestones} overdue` : ''}
                    </SummaryFact>
                  </div>
                  <div className="project-overview-progress">
                    <div>
                      <span>Overall Progress</span>
                      <strong>{project.progress}%</strong>
                    </div>
                    <span className="progress-track">
                      <span className="progress-fill" style={{ width: `${project.progress}%` }} />
                    </span>
                  </div>
                </aside>
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              <div className="project-details-columns">
                <section className="project-details-section">
                  <h3>Project Identification</h3>
                  <dl className="detail-list detail-compact">
                    <div><dt>Project Number</dt><dd>{project.id}</dd></div>
                    <div><dt>Project Name</dt><dd>{project.name}</dd></div>
                    <div><dt>Project Reference</dt><dd>{project.reference || '—'}</dd></div>
                    <div><dt>Customer / Department</dt><dd>{customerOrDepartment(project)}</dd></div>
                    <div><dt>Product / Machine</dt><dd>{project.product}</dd></div>
                    <div><dt>Engineering Domain</dt><dd>{project.domain}</dd></div>
                    <div><dt>Project Type</dt><dd>{project.type}</dd></div>
                    <div><dt>Priority</dt><dd>{project.priority}</dd></div>
                    <div><dt>Project Status</dt><dd><StatusBadge status={project.status} tone={projectStatusTone(project.status)} /></dd></div>
                    <div><dt>Overall Progress</dt><dd>{project.progress}%</dd></div>
                  </dl>
                </section>
                <section className="project-details-section">
                  <h3>Ownership, Schedule &amp; References</h3>
                  <dl className="detail-list detail-compact">
                    {factRows.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                    <div><dt>Project Owner</dt><dd>{project.owner || 'Not captured'}</dd></div>
                    <div><dt>CPR Reference</dt><dd>{project.cprReference || 'Not captured'}</dd></div>
                    <div><dt>CPR Status</dt><dd>{project.cprStatus || 'Not Started'}</dd></div>
                    <div><dt>CPR Owner</dt><dd>{project.cprOwner || 'Unassigned'}</dd></div>
                    <div><dt>CPR Review Date</dt><dd>{formatDate(project.cprReviewDate)}</dd></div>
                  </dl>
                </section>
              </div>

              <Card icon={ListChecks} title="Requirements" subtitle="Captured functional and engineering requirements">
                <DataTable columns={requirementColumns} rows={requirements} ariaLabel="Project requirements" />
              </Card>

              <Card icon={ClipboardList} title="Design Tasks" subtitle="Work packages raised for this project">
                <DataTable columns={taskColumns} rows={tasks} ariaLabel="Project design tasks" />
              </Card>

              <Card icon={Users} title="Project Team" subtitle="Assigned engineers, reviewers and responsibilities">
                <DataTable
                  columns={teamColumns}
                  rows={projectTeam}
                  ariaLabel="Project team"
                  emptyContent={<p className="dash-note">No team assignments recorded for this project yet.</p>}
                />
              </Card>

              <Card icon={Layers} title="Milestones" subtitle="Planned versus actual delivery dates">
                <DataTable
                  columns={milestoneColumns}
                  rows={projectMilestones}
                  ariaLabel="Project milestones"
                  emptyContent={<p className="dash-note">No milestones planned for this project yet.</p>}
                />
              </Card>
            </>
          )}

          {activeTab === 'stages' && (
            <div className="project-workflow">
              <div className="project-workflow-head">
                <div>
                  <span className="project-workflow-eyebrow">Engineering workflow</span>
                  <h3>Project delivery stages</h3>
                  <p>
                    Every status is derived from the linked workflow records. A stage only becomes
                    approved when its records are approved, and complete when they are released or closed.
                  </p>
                </div>
                <div className="project-workflow-metrics">
                  <strong>
                    {settledStages}/{stages.length}
                  </strong>
                  <span>stages approved or complete</span>
                  {activeStage && <em>Current focus · {activeStage.label}</em>}
                </div>
              </div>

              <div className="project-stage-rail" role="list" aria-label="Engineering stage sequence">
                {stages.map((stage, index) => {
                  const Icon = STAGE_ICONS[stage.key] || Layers;
                  return (
                    <div
                      className={`project-stage-rail-node is-${statusClass(stage.status)}`}
                      key={stage.key}
                      role="listitem"
                    >
                      <span className="project-stage-rail-dot">
                        <Icon size={11} aria-hidden="true" />
                      </span>
                      <span className="project-stage-rail-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="project-stage-rail-label">{stage.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="project-stage-grid">
                {stages.map((stage, index) => {
                  const Icon = STAGE_ICONS[stage.key] || Layers;
                  const state = statusClass(stage.status);
                  return (
                    <button
                      type="button"
                      key={stage.key}
                      className={`project-stage-card is-${state}`}
                      onClick={() => openStage(stage)}
                      aria-label={`${stage.label}: ${stage.status}. ${stage.linked} linked record${stage.linked === 1 ? '' : 's'}. Open stage.`}
                    >
                      <span className="project-stage-card-top">
                        <span className="project-stage-icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="project-stage-index">{String(index + 1).padStart(2, '0')}</span>
                        <StatusBadge status={stage.status} />
                      </span>
                      <span className="project-stage-heading">
                        <strong>{stage.label}</strong>
                        <span>{stage.module}</span>
                      </span>
                      <span className="project-stage-description">{stage.description}</span>
                      <span className="project-stage-record-row">
                        {stage.records.length ? (
                          <>
                            {stage.records.slice(0, 2).map((record) => (
                              <span className="project-stage-record" key={record.id}>
                                {record.id}
                              </span>
                            ))}
                            {stage.records.length > 2 && (
                              <span className="project-stage-record">+{stage.records.length - 2} more</span>
                            )}
                          </>
                        ) : (
                          <span className="project-stage-empty">No linked record</span>
                        )}
                      </span>
                      {stage.records.length > 0 && (
                        <span
                          className="project-stage-progress"
                          aria-label={`${stage.settled} of ${stage.records.length} records approved or complete`}
                        >
                          <span className="progress-track">
                            <span className="progress-fill" style={{ width: `${stage.progress}%` }} />
                          </span>
                        </span>
                      )}
                      <span className="project-stage-footer">
                        <span>
                          {stage.linked === 0
                            ? 'Browse module'
                            : `${stage.settled}/${stage.linked} record${stage.linked === 1 ? '' : 's'} settled`}
                        </span>
                        <span className="project-stage-go">
                          {stage.records.length === 1 ? 'Open record' : stage.records.length ? 'Choose record' : 'Open module'}
                          <ArrowRight size={13} aria-hidden="true" />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <Card
              icon={Layers}
              title="Linked Records"
              subtitle="Workflow records connected to this project across engineering modules"
            >
              <DataTable
                columns={linkedRecordColumns}
                rows={linkedRecords}
                ariaLabel="Project linked records"
                onRowClick={(row) => navigate(row.href)}
                emptyContent={
                  <EmptyState
                    icon={Layers}
                    title="No linked records"
                    message="No engineering workflow record is linked to this project yet. Open Engineering Stages to browse the module for this project."
                  />
                }
              />
            </Card>
          )}

          {activeTab === 'documents' && (
            <>
              <Card icon={DraftingCompass} title="Documents" subtitle="Drawings, BOMs and reports issued for the project">
                <DataTable
                  columns={documentColumns}
                  rows={documents}
                  ariaLabel="Project documents"
                  emptyContent={<p className="dash-note">No project documents recorded yet.</p>}
                />
              </Card>
              <Card icon={Paperclip} title="Project Attachments" subtitle="Files registered with the project">
                <DataTable
                  columns={attachmentColumns}
                  rows={attachmentRows}
                  ariaLabel="Project attachments"
                  emptyContent={
                    <p className="dash-note">No project attachments recorded for this project yet.</p>
                  }
                />
              </Card>
            </>
          )}

          {activeTab === 'activity' && (
            <Card icon={FileText} title="Activity History" subtitle="Project, drawing, review and handover events">
              {activity.length ? (
                <ol className="timeline">
                  {activity.map((event) => {
                    const Icon = ACTIVITY_ICONS[event.type] || FolderKanban;
                    return (
                      <li key={event.id} className={`timeline-item timeline-${event.type}`}>
                        <span className="timeline-marker" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="timeline-body">
                          <span className="timeline-title">{event.label}</span>
                          <span className="timeline-detail">{event.detail}</span>
                        </span>
                        <span className="timeline-time">{event.time}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="dash-note">No project history recorded yet.</p>
              )}
            </Card>
          )}
        </div>
      </div>

      <WorkflowLinks type="project" recordId={project.id} />

      <Modal
        open={Boolean(stageModal)}
        onClose={() => setStageModal(null)}
        title={stageModal?.label}
        subtitle={
          stageModal
            ? `${stageModal.module} · ${project.id} · ${stageModal.linked} linked record${
                stageModal.linked === 1 ? '' : 's'
              }`
            : ''
        }
        maxWidth="max-w-lg"
        footer={
          <Button variant="secondary" onClick={() => setStageModal(null)}>
            Close
          </Button>
        }
      >
        {stageModal && stageModal.records.length === 0 && (
          <EmptyState
            icon={Layers}
            title="No linked records for this project"
            message={`${stageModal.label} has no record linked to ${project.id}. Open the ${stageModal.module} module to review the existing registers.`}
            action={
              <Button icon={ArrowRight} onClick={() => openStageModule(stageModal)}>
                Open {stageModal.module}
              </Button>
            }
          />
        )}
        {stageModal && stageModal.records.length > 0 && (
          <>
            <p className="dash-note">
              This stage has {stageModal.records.length} linked records for {project.id}. Choose
              the record to open its detail view.
            </p>
            <div className="project-stage-record-list">
              {stageModal.records.map((record) => (
                <Link
                  key={record.id}
                  className="project-stage-record-link"
                  to={projectStageRecordPath(stageModal.key, record)}
                >
                  <span>
                    <strong>{record.id}</strong>
                    <small>{record.title || stageModal.module}</small>
                  </span>
                  <StatusBadge status={record.status} />
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </>
        )}
      </Modal>
    </PageLayout>
  );
}
