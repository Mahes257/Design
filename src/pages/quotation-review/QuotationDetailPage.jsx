import { useMemo, useState } from 'react';
import {
  Navigate,
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Factory,
  FileSearch,
  FolderKanban,
  IndianRupee,
  Pencil,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  Input,
  KpiGrid,
  Modal,
  PageHeader,
  PageLayout,
  Select,
  StatCard,
  StatusBadge,
  ViewPageBanner,
} from '../../components/common';
import { useCustomerEnquiries } from '../../context/CustomerEnquiryContext';
import { useProjects } from '../../context/ProjectsContext';
import { useQuotationReview } from '../../context/QuotationReviewContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { TODAY, formatDate } from '../../data/customerEnquiryData';
import {
  ENGINEERS,
  PROJECT_DELIVERABLES,
  formatEffort,
  formatMoney,
  formatRevision,
  isQuotationConvertible,
  isQuotationEditable,
  projectDomainForCategory,
  quotationReadiness,
  quotationStageIndex,
  statusActions,
  suggestedProjectName,
} from '../../data/quotationReviewData';
import {
  Fact,
  FactGrid,
  FeasibilityBadge,
  QuotationPriority,
  QuotationReadinessPanel,
  QuotationSectionTabs,
  QuotationStatus,
  QuotationStatusDialog,
  QuotationTimeline,
  QuotationWorkflowStrip,
  RevisionChip,
  TextBlock,
} from './quotationReviewUi';

function tabFromPath(pathname) {
  if (pathname.endsWith('/feasibility')) return 'feasibility';
  if (pathname.endsWith('/cost-estimate')) return 'costs';
  if (pathname.endsWith('/review')) return 'review';
  if (pathname.endsWith('/history')) return 'history';
  return 'overview';
}

function teamDiscipline(domain) {
  if (domain === 'Sheet Metal Design') return 'Sheet Metal';
  if (domain === 'Piping Design') return 'Piping';
  return 'Mechanical';
}

export default function QuotationDetailPage() {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { getQuotation, updateStatus, markConverted } = useQuotationReview();
  const { enquiries } = useCustomerEnquiries();
  const { projects, team, addProject, addMember, nextProjectId } = useProjects();

  const record = getQuotation(quotationId);
  const enquiry = enquiries.find((item) => item.id === record?.linkedEnquiryId) || null;
  const linkedProject =
    projects.find(
      (project) =>
        project.id === record?.convertedProjectId ||
        (record?.convertedProjectId && project.id === record.convertedProjectId),
    ) || null;
  const convertedProject =
    linkedProject ||
    projects.find((project) => project.sourceQuotationId === record?.quotationRef) ||
    null;

  const [statusOpen, setStatusOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionErrors, setConversionErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [projectDraft, setProjectDraft] = useState({
    name: '',
    manager: 'R. Kulkarni',
    start: TODAY,
    target: TODAY,
  });

  const readiness = useMemo(() => (record ? quotationReadiness(record) : null), [record]);

  if (!record) return <Navigate to="/quotation-review" replace />;

  const tab = tabFromPath(pathname);
  const actions = statusActions(record);
  const canEdit = isQuotationEditable(record);
  const canConvert = isQuotationConvertible(record) && !convertedProject;

  const handleStatus = (payload) => {
    const result = updateStatus(record.id, payload.status, payload);
    if (result.error) return result;
    setNotice(`Quotation status updated to ${payload.status}.`);
    return {};
  };

  const openConversion = () => {
    setProjectDraft({
      name: suggestedProjectName(record),
      manager: 'R. Kulkarni',
      start: TODAY,
      target: record.targetDeliveryEstimate || TODAY,
    });
    setConversionErrors({});
    setConversionOpen(true);
  };

  const convertToProject = () => {
    const next = {};
    if (!projectDraft.name.trim()) next.name = 'Project name is required.';
    if (!projectDraft.manager) next.manager = 'Select a project manager.';
    if (!projectDraft.start) next.start = 'Project start date is required.';
    if (!projectDraft.target) next.target = 'Target completion date is required.';
    if (projectDraft.start && projectDraft.target && projectDraft.target < projectDraft.start) {
      next.target = 'Target date cannot be earlier than the start date.';
    }
    if (Object.keys(next).length > 0) {
      setConversionErrors(next);
      return;
    }
    if (!canConvert) {
      setConversionErrors({ form: 'Only an accepted quotation can initiate a project.' });
      return;
    }

    const projectId = nextProjectId();
    const domain = projectDomainForCategory(
      record.customerCategory || enquiry?.category || '',
    );
    const project = {
      id: projectId,
      name: projectDraft.name.trim(),
      reference: record.quotationRef,
      customer: record.customerName || enquiry?.customerName || 'Customer',
      product: record.productConfiguration.split('—')[0].trim() || record.productConfiguration,
      description: `Project initiated from accepted quotation ${record.quotationRef} (${formatRevision(
        record.revision,
      )}) against customer enquiry ${record.linkedEnquiryId}. ${record.preliminarySpecifications}`,
      domain,
      scope: `Engineering delivery for ${record.productConfiguration}. Technical basis accepted through quotation ${record.quotationRef}.`,
      technicalRequirements: record.preliminarySpecifications,
      constraints: record.materialAssumptions,
      expectedDeliverables: PROJECT_DELIVERABLES.join(', '),
      type: 'New Design',
      priority: record.priority,
      manager: projectDraft.manager,
      reviewer: record.review?.assignedReviewer || 'N. Joshi',
      analysisEngineer: 'A. Iyer',
      manufacturingEngineer: 'K. Pillai',
      engineers: [record.engineeringOwner, record.review?.assignedReviewer]
        .filter(Boolean)
        .filter((name, index, list) => list.indexOf(name) === index && name !== projectDraft.manager),
      members: [],
      deliverables: PROJECT_DELIVERABLES,
      start: projectDraft.start,
      target: projectDraft.target,
      progress: 0,
      status: 'New Request',
      delayed: false,
      archived: false,
      attachments: 0,
      attachmentFiles: [],
      sourceEnquiryId: record.linkedEnquiryId,
      sourceQuotationId: record.quotationRef,
      sourceQuotationRevision: record.revision,
      sourceQuotationInternalId: record.id,
      cprReference: '',
      cprStatus: 'Not Started',
      cprOwner: '',
      cprReviewDate: '',
      cprNotes: '',
    };

    addProject(project);

    const members = [
      {
        name: projectDraft.manager,
        role: 'Project Manager',
        responsibilities: 'Project planning, customer interface and design sign-off',
        allocation: 40,
      },
      {
        name: record.review?.assignedReviewer,
        role: 'Technical Reviewer',
        responsibilities: `Technical review for project ${project.name}`,
        allocation: 30,
      },
      {
        name: record.engineeringOwner,
        role: 'Design Engineer',
        responsibilities: `Engineering delivery for ${project.name}`,
        allocation: 60,
      },
    ].filter(
      (member, index, list) =>
        member.name && list.findIndex((item) => item.name === member.name) === index,
    );

    const highest = team.reduce((max, member) => {
      const numeric = Number(String(member.id).split('-').pop());
      return Number.isFinite(numeric) && numeric > max ? numeric : max;
    }, 100);

    members.forEach((member, index) => {
      addMember({
        id: `TM-${highest + index + 1}`,
        name: member.name,
        role: member.role,
        discipline: teamDiscipline(domain),
        projectId,
        responsibilities: member.responsibilities,
        allocation: member.allocation,
      });
    });

    const markResult = markConverted(record.id, projectId);
    if (markResult.error) {
      setConversionErrors({ form: markResult.error });
      return;
    }

    setConversionOpen(false);
    navigate(`/projects/${projectId}`, { state: { createdProjectId: projectId } });
  };

  return (
    <PageLayout tabs={<QuotationSectionTabs quotationId={record.id} active={tab} />}>
      <ViewPageBanner
        icon={FileSearch}
        eyebrow={record.quotationRef}
        title={`${record.customerName} quotation · ${formatRevision(record.revision)}`}
        subtitle={`Linked to ${record.linkedEnquiryId} · ${record.status}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Quotation & Technical Review', to: '/quotation-review' },
              { label: record.quotationRef },
              ...(tab === 'overview'
                ? []
                : [
                    {
                      label:
                        tab === 'feasibility'
                          ? 'Technical Feasibility'
                          : tab === 'costs'
                            ? 'Preliminary Cost Estimate'
                            : tab === 'review'
                              ? 'Quotation Review'
                              : 'Quotation History',
                    },
                  ]),
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={record.status} />
            {record.priority && <span className="chip">{record.priority}</span>}
            <span className="chip">Rev {record.revision}</span>
          </>
        }
        meta={[
          ['Quotation Number', record.quotationRef],
          ['Customer', record.customerName],
          ['Linked Enquiry', record.linkedEnquiryId],
          ['Revision', formatRevision(record.revision)],
          ['Sales Contact', record.salesContact || 'Not captured'],
          ['Target Delivery', record.targetDeliveryEstimate ? formatDate(record.targetDeliveryEstimate) : 'Not captured'],
        ]}
        actions={
          <>
            <div className="qr-header-actions">
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/quotation-review')}
              >
                Register
              </Button>
              {canEdit && (
                <Button
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => navigate(`/quotation-review/${record.id}/edit`)}
                >
                  Edit
                </Button>
              )}
              {actions.length > 0 && (
                <Button variant="secondary" onClick={() => setStatusOpen(true)}>
                  Update Status
                </Button>
              )}
              {record.status === 'Accepted' && convertedProject && (
                <Button
                  icon={FolderKanban}
                  onClick={() => navigate(`/projects/${convertedProject.id}`)}
                >
                  Open Project
                </Button>
              )}
              {canConvert && <ConvertRecordButton type="quotation" record={record} />}
            </div>
          </>
        }
      />
      {notice && (
        <div className="form-banner success qr-notice" role="status">
          <BadgeCheck aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <section className="qr-detail-hero">
        <div className="qr-detail-hero-main">
          <div className="qr-detail-ref-row">
            <span className="qr-hero-ref">{record.quotationRef}</span>
            <RevisionChip revision={record.revision} />
            <QuotationStatus status={record.status} />
          </div>
          <h2>{record.productConfiguration}</h2>
          <p>
            <Link className="qr-inline-link" to={`/customer-enquiries/${record.linkedEnquiryId}`}>
              {record.linkedEnquiryId}
            </Link>{' '}
            · {record.customerName}
            {record.customerContact ? ` · ${record.customerContact}` : ''}
          </p>
          <div className="qr-hero-tags">
            <span className="chip chip-mint">{record.customerCategory || 'Machine package'}</span>
            <QuotationPriority priority={record.priority} />
            <span className="chip">Quoted {formatDate(record.quotationDate)}</span>
          </div>
        </div>
        <div className="qr-detail-hero-stats">
          <div>
            <span>Target delivery</span>
            <strong>{formatDate(record.targetDeliveryEstimate)}</strong>
          </div>
          <div>
            <span>Engineering effort</span>
            <strong>{formatEffort(record.engineeringEffort)}</strong>
          </div>
          <div>
            <span>Technical reviewer</span>
            <strong>{record.review?.assignedReviewer || 'Unassigned'}</strong>
          </div>
          <div>
            <span>Linked project</span>
            <strong>
              {convertedProject ? (
                <Link className="qr-inline-link" to={`/projects/${convertedProject.id}`}>
                  {convertedProject.id}
                </Link>
              ) : (
                'Not initiated'
              )}
            </strong>
          </div>
        </div>
      </section>

      <QuotationWorkflowStrip compact activeIndex={quotationStageIndex(record)} />

      {tab === 'overview' && (
        <div className="qr-detail-grid">
          <div className="qr-detail-main">
            <Card icon={ClipboardList} title="Quotation Overview" subtitle="Registration and handoff facts">
              <FactGrid columns={2}>
                <Fact label="Customer Enquiry ID">
                  <Link className="qr-inline-link" to={`/customer-enquiries/${record.linkedEnquiryId}`}>
                    {record.linkedEnquiryId}
                  </Link>
                </Fact>
                <Fact label="Customer" value={record.customerName} />
                <Fact label="Customer Contact" value={record.customerContact} />
                <Fact label="Product Category" value={record.customerCategory} />
                <Fact label="Quotation Reference" value={record.quotationRef} />
                <Fact label="Revision" value={formatRevision(record.revision)} />
                <Fact label="Quotation Date" value={formatDate(record.quotationDate)} />
                <Fact label="Target Delivery Estimate" value={formatDate(record.targetDeliveryEstimate)} />
                <Fact label="Sales Contact" value={record.salesContact} />
                <Fact label="Engineering Owner" value={record.engineeringOwner} />
                <Fact label="Technical Reviewer" value={record.review?.assignedReviewer || 'Unassigned'} />
                <Fact label="Review Assigned On" value={formatDate(record.review?.assignedOn)} />
              </FactGrid>
            </Card>

            <Card icon={Factory} title="Product Configuration & Technical Basis" subtitle="Preliminary configuration and specifications">
              <TextBlock label="Product / Machine Configuration" value={record.productConfiguration} />
              <TextBlock label="Preliminary Technical Specifications" value={record.preliminarySpecifications} />
              <TextBlock label="Technical Comments" value={record.technicalComments} />
            </Card>

            <Card icon={ClipboardCheck} title="Review Snapshot" subtitle="Latest technical decision">
              <FactGrid columns={2}>
                <Fact label="Review Outcome" value={record.review?.outcome || 'Not reviewed'} />
                <Fact label="Reviewed On" value={formatDate(record.review?.reviewedOn)} />
              </FactGrid>
              <TextBlock label="Review Comments" value={record.review?.comments} />
              <Link className="qr-inline-link qr-card-link" to={`/quotation-review/${record.id}/review`}>
                Open technical review <ArrowRight aria-hidden="true" />
              </Link>
            </Card>
          </div>

          <aside className="qr-detail-aside">
            <QuotationReadinessPanel
              record={record}
              onAction={actions.length > 0 ? () => setStatusOpen(true) : null}
              actionLabel="Open Status Workflow"
            />

            <Card icon={FolderKanban} title="Project Handoff" subtitle="Module 03 project initiation">
              {record.status === 'Accepted' ? (
                convertedProject ? (
                  <>
                    <p className="qr-side-copy">
                      This accepted quotation has been converted into project {convertedProject.id}.
                      The original enquiry and quotation references are retained on the project.
                    </p>
                    <Button
                      size="sm"
                      icon={FolderKanban}
                      onClick={() => navigate(`/projects/${convertedProject.id}`)}
                    >
                      Open Project
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="qr-side-copy">
                      The customer accepted this quotation. Initiate the design project with the
                      enquiry and quotation references preserved.
                    </p>
                    <Button size="sm" icon={FolderKanban} onClick={openConversion}>
                      Initiate Project
                    </Button>
                  </>
                )
              ) : (
                <p className="qr-side-copy">
                  Project conversion becomes available only after the customer acceptance status is
                  recorded.
                </p>
              )}
            </Card>

            <Card icon={ShieldCheck} title="Workflow Guardrail" subtitle="Accepted quotations only">
              <p className="qr-side-copy">
                Technical review cannot reach acceptance until feasibility, assumptions, effort,
                costs, delivery and reviewer assignment are complete. Commercial pricing and GST
                remain outside this module.
              </p>
            </Card>
          </aside>
        </div>
      )}

      {tab === 'feasibility' && (
        <div className="qr-detail-grid">
          <div className="qr-detail-main">
            <Card icon={Factory} title="Design Feasibility" subtitle="Engineering assessment and conditions">
              <FactGrid columns={2}>
                <Fact label="Assessment">
                  <FeasibilityBadge value={record.designFeasibility} />
                </Fact>
                <Fact label="Owner" value={record.engineeringOwner} />
              </FactGrid>
              <TextBlock label="Design Feasibility Notes" value={record.designFeasibilityNotes} />
            </Card>

            <Card icon={Factory} title="Manufacturing Feasibility" subtitle="Fabrication and production assessment">
              <FactGrid columns={2}>
                <Fact label="Assessment">
                  <FeasibilityBadge value={record.manufacturingFeasibility} />
                </Fact>
                <Fact label="Reviewer" value={record.review?.assignedReviewer || 'Unassigned'} />
              </FactGrid>
              <TextBlock
                label="Manufacturing Feasibility Notes"
                value={record.manufacturingFeasibilityNotes}
              />
            </Card>

            <Card icon={ClipboardList} title="Material Assumptions & BOM Basis" subtitle="Preliminary engineering assumptions">
              <TextBlock label="Material Assumptions" value={record.materialAssumptions} />
              <FactGrid columns={2}>
                <Fact label="Preliminary BOM Reference" value={record.preliminaryBomRef} />
                <Fact label="Estimated Engineering Effort" value={formatEffort(record.engineeringEffort)} />
              </FactGrid>
              <TextBlock label="Technical Comments" value={record.technicalComments} />
            </Card>
          </div>
          <aside className="qr-detail-aside">
            <QuotationReadinessPanel
              record={record}
              onAction={actions.length > 0 ? () => setStatusOpen(true) : null}
              actionLabel="Open Status Workflow"
            />
            <Card icon={FileSearch} title="Preliminary Specification" subtitle="Basis used for feasibility">
              <p className="qr-side-copy">{record.preliminarySpecifications || 'No technical basis recorded.'}</p>
            </Card>
          </aside>
        </div>
      )}

      {tab === 'costs' && (
        <div className="qr-cost-layout">
          <KpiGrid className="qr-cost-kpis">
            <StatCard
              icon={Coins}
              label="Preliminary Material Cost"
              value={formatMoney(record.materialCost)}
              sub="Engineering estimate · excluding GST"
              tone="emerald"
            />
            <StatCard
              icon={Wallet}
              label="Preliminary Manufacturing Cost"
              value={formatMoney(record.manufacturingCost)}
              sub="Fabrication and assembly estimate"
              tone="blue"
            />
            <StatCard
              icon={Users}
              label="Estimated Engineering Effort"
              value={formatEffort(record.engineeringEffort)}
              sub="Design and review hours"
              tone="purple"
            />
          </KpiGrid>

          <div className="qr-detail-grid">
            <div className="qr-detail-main">
              <Card icon={IndianRupee} title="Preliminary Cost Basis" subtitle="Technical estimate context">
                <FactGrid columns={2}>
                  <Fact label="Material Assumptions" value={record.materialAssumptions} />
                  <Fact label="Preliminary BOM Reference" value={record.preliminaryBomRef} />
                  <Fact label="Target Delivery Estimate" value={formatDate(record.targetDeliveryEstimate)} />
                  <Fact label="Engineering Owner" value={record.engineeringOwner} />
                </FactGrid>
                <TextBlock label="Technical Comments" value={record.technicalComments} />
                <p className="qr-form-note">
                  These are preliminary engineering estimates for technical review. Commercial
                  pricing, margin, GST and customer-facing quotation transactions remain in the
                  Sales ERP.
                </p>
              </Card>
            </div>
            <aside className="qr-detail-aside">
              <Card icon={CalendarDays} title="Delivery Estimate" subtitle="Preliminary target">
                <div className="qr-date-callout">
                  <span>Target delivery</span>
                  <strong>{formatDate(record.targetDeliveryEstimate)}</strong>
                  <p>Subject to supplier availability and customer acceptance.</p>
                </div>
              </Card>
              <QuotationReadinessPanel
                record={record}
                onAction={actions.length > 0 ? () => setStatusOpen(true) : null}
                actionLabel="Open Status Workflow"
              />
            </aside>
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="qr-detail-grid">
          <div className="qr-detail-main">
            <Card icon={BadgeCheck} title="Quotation Review" subtitle="Technical assignment, decision and comments">
              <FactGrid columns={2}>
                <Fact label="Current Status">
                  <QuotationStatus status={record.status} />
                </Fact>
                <Fact label="Review Assignment" value={record.review?.assignedReviewer || 'Unassigned'} />
                <Fact label="Assigned On" value={formatDate(record.review?.assignedOn)} />
                <Fact label="Reviewed On" value={formatDate(record.review?.reviewedOn)} />
                <Fact label="Review Outcome" value={record.review?.outcome || 'Not recorded'} />
                <Fact label="Reviewer" value={record.review?.assignedReviewer || 'Unassigned'} />
              </FactGrid>
              <TextBlock label="Review Comments" value={record.review?.comments} />
              <TextBlock label="Technical Comments" value={record.technicalComments} />
              {actions.length > 0 && (
                <Button size="sm" onClick={() => setStatusOpen(true)}>
                  Update Review / Status
                </Button>
              )}
            </Card>

            <Card icon={ClipboardList} title="Customer Decision & Handoff" subtitle="Sales release and acceptance">
              <FactGrid columns={2}>
                <Fact label="Customer Reference" value={record.customerReference || 'Not recorded'} />
                <Fact
                  label="Submitted to Customer"
                  value={formatDate(record.submittedToCustomerAt)}
                />
                <Fact label="Customer Decision" value={formatDate(record.decisionAt)} />
                <Fact label="Decision Note" value={record.decisionNote || '—'} />
              </FactGrid>
              {record.status === 'Accepted' && (
                <div className="qr-accepted-strip">
                  <BadgeCheck aria-hidden="true" />
                  <span>
                    Technically accepted and customer approved. Project initiation is available
                    from the header.
                  </span>
                </div>
              )}
            </Card>
          </div>
          <aside className="qr-detail-aside">
            <QuotationReadinessPanel
              record={record}
              onAction={actions.length > 0 ? () => setStatusOpen(true) : null}
              actionLabel="Open Status Workflow"
            />
            <Card icon={Users} title="Handoff Team" subtitle="Engineering and sales owners">
              <FactGrid columns={1}>
                <Fact label="Sales Contact" value={record.salesContact} />
                <Fact label="Engineering Owner" value={record.engineeringOwner} />
                <Fact label="Technical Reviewer" value={record.review?.assignedReviewer || 'Unassigned'} />
              </FactGrid>
            </Card>
          </aside>
        </div>
      )}

      {tab === 'history' && (
        <Card icon={FileSearch} title="Quotation History" subtitle="Configuration, review, sales and decision events">
          <QuotationTimeline history={record.history} />
        </Card>
      )}

      {statusOpen && (
        <QuotationStatusDialog
          record={record}
          open
          onClose={() => setStatusOpen(false)}
          onSubmit={handleStatus}
        />
      )}

      <Modal
        open={conversionOpen}
        onClose={() => setConversionOpen(false)}
        title="Initiate project from accepted quotation"
        subtitle={`${record.quotationRef} · ${formatRevision(record.revision)}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConversionOpen(false)}>
              Cancel
            </Button>
            <Button icon={FolderKanban} onClick={convertToProject}>
              Create Project
            </Button>
          </>
        }
      >
        <div className="qr-dialog-form">
          {conversionErrors.form && (
            <div className="form-error" role="alert">
              {conversionErrors.form}
            </div>
          )}
          <div className="qr-conversion-summary">
            <FactGrid columns={2}>
              <Fact label="Project ID" value={nextProjectId()} />
              <Fact label="Customer Enquiry" value={record.linkedEnquiryId} />
              <Fact label="Quotation Reference" value={record.quotationRef} />
              <Fact label="Quotation Revision" value={formatRevision(record.revision)} />
            </FactGrid>
          </div>
          <Input
            id="qr-project-name"
            label="Project Name"
            value={projectDraft.name}
            onChange={(event) =>
              setProjectDraft((previous) => ({ ...previous, name: event.target.value }))
            }
            hint={conversionErrors.name}
          />
          <Select
            id="qr-project-manager"
            label="Project Manager"
            value={projectDraft.manager}
            onChange={(event) =>
              setProjectDraft((previous) => ({ ...previous, manager: event.target.value }))
            }
            options={ENGINEERS.map((name) => ({ value: name, label: name }))}
            hint={conversionErrors.manager}
          />
          <div className="form-grid">
            <Input
              id="qr-project-start"
              label="Planned Start Date"
              type="date"
              value={projectDraft.start}
              onChange={(event) =>
                setProjectDraft((previous) => ({ ...previous, start: event.target.value }))
              }
              hint={conversionErrors.start}
            />
            <Input
              id="qr-project-target"
              label="Target Completion Date"
              type="date"
              value={projectDraft.target}
              onChange={(event) =>
                setProjectDraft((previous) => ({ ...previous, target: event.target.value }))
              }
              hint={conversionErrors.target}
            />
          </div>
          <p className="qr-dialog-note">
            This creates a local Project Management record with the original enquiry ID and
            quotation ID retained. The quotation remains Accepted and records the conversion in its
            history. No commercial transaction is created.
          </p>
        </div>
      </Modal>
      <WorkflowLinks type="quotation" recordId={record.id} />
    </PageLayout>
  );
}
