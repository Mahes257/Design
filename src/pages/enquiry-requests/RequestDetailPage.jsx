import {
  Activity,
  ArrowLeft,
  ArrowRightLeft,
  Calculator,
  ClipboardList,
  ClipboardPen,
  DraftingCompass,
  FileText,
  FolderKanban,
  History,
  Layers,
  Package,
  Pencil,
  ScrollText,
  SearchCheck,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { DASHBOARD } from '../../config/navigation';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import {
  LOCKED_STATUSES,
  SOURCE_FIELDS,
  assessmentReadiness,
  conversionEligibility,
  formatDate,
  formatStamp,
  quotationEligibility,
  requesterLabel,
} from '../../data/enquiryRequestData';
import { formatBytes } from '../../data/customerEnquiryData';
import {
  RequestPriority,
  RequestSource,
  RequestStatus,
  useRequestConversion,
} from './enquiryRequestUi';

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

function Fact({ label, children }) {
  const empty = children === null || children === undefined || children === '';
  return (
    <div className={`fact${empty ? ' is-empty' : ''}`}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{empty ? 'Not captured' : children}</span>
    </div>
  );
}

function ProjectLink({ projectId }) {
  if (!projectId) return 'Not created';
  return (
    <Link className="qr-inline-link" to={`/projects/all-projects/${projectId}`}>
      {projectId}
    </Link>
  );
}

function ActivityTimeline({ entries }) {
  return (
    <ol className="mech-timeline">
      {entries.map((entry) => (
        <li key={entry.id}>
          <span className="mech-timeline-dot" aria-hidden="true">
            <Activity />
          </span>
          <span className="mech-timeline-body">
            <span className="mech-timeline-head">
              <strong>{entry.label}</strong>
              <span>{formatStamp(entry.at)}</span>
            </span>
            {entry.detail ? <span className="mech-timeline-note">{entry.detail}</span> : null}
            <span className="mech-timeline-by">
              {entry.by || 'Not recorded'}
              {entry.ref ? ` · ${entry.ref}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function RequestDetailPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requests } = useEnquiryRequests();
  const { openConvert, convertDialog } = useRequestConversion();
  const record = requests.find((row) => row.id === requestId);

  if (!record) return <Navigate to="/customer-sales" replace />;

  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'overview';
  const changeTab = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next);
  };

  const eligibility = conversionEligibility(record);
  const quotation = quotationEligibility(record);
  const readiness = assessmentReadiness(record);
  const commercial = record.commercial;
  const sourceFields = SOURCE_FIELDS[record.source] || [];
  const assessment = record.assessment || {};

  const documents = [
    ...(record.documents || []).map((document) => ({
      ...document,
      origin: 'Request attachment',
    })),
    ...(commercial?.technical?.documents || []).map((document) => ({
      ...document,
      origin: 'Quotation document',
    })),
    ...(commercial?.acceptance?.documents || []).map((document) => ({
      ...document,
      origin: 'Customer acceptance',
    })),
  ].filter((document, index, list) => {
    const key = document.id || document.name;
    return list.findIndex((row) => (row.id || row.name) === key) === index;
  });

  const activity = [
    ...(record.history || []).map((entry) => ({
      id: `history-${entry.id}`,
      at: entry.at,
      label: entry.action,
      detail: entry.detail,
      by: entry.by,
      ref: entry.status,
    })),
    ...(assessment.decisionHistory || []).map((entry) => ({
      id: `decision-${entry.id}`,
      at: entry.at,
      label: `Technical decision · ${entry.decision}`,
      detail: entry.comments,
      by: entry.by,
      ref: entry.decision,
    })),
    ...(commercial?.stageHistory || []).map((entry) => ({
      id: `commercial-${entry.id}`,
      at: entry.at,
      label: `Quotation stage · ${entry.stage}`,
      detail: entry.note,
      by: entry.by,
      ref: entry.stage,
    })),
    ...(record.conversion?.at &&
    !(record.history || []).some((entry) =>
      /converted to project/i.test(String(entry.action || '')),
    )
      ? [
          {
            id: `conversion-${record.conversion.projectId}`,
            at: record.conversion.at,
            label: 'Converted to project',
            detail: `Linked project ${record.conversion.projectId} created from this request.`,
            by: record.conversion.by,
            ref: record.conversion.projectId,
          },
        ]
      : []),
  ].sort((first, second) => String(second.at || '').localeCompare(String(first.at || '')));

  const documentColumns = [
    {
      key: 'name',
      label: 'File Name',
      render: (row) => <span className="cell-strong">{row.name}</span>,
    },
    {
      key: 'type',
      label: 'File Type',
      width: 150,
      render: (row) => row.type || 'Not recorded',
    },
    {
      key: 'category',
      label: 'Category',
      width: 180,
      render: (row) => row.category || row.origin,
    },
    {
      key: 'size',
      label: 'Size',
      width: 96,
      render: (row) => (row.size ? formatBytes(row.size) : '—'),
    },
    {
      key: 'uploadedBy',
      label: 'Uploaded By',
      width: 140,
      render: (row) => row.uploadedBy || '—',
    },
    {
      key: 'uploadedAt',
      label: 'Uploaded',
      width: 126,
      render: (row) => formatDate(row.uploadedAt),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (row) => row.notes || '—',
    },
  ];

  const emptyLinkedRecord = (icon, title, message, action) => (
    <Card icon={icon} title={title} subtitle="Records explicitly linked to this request">
      <EmptyState icon={icon} title={`No ${title.toLowerCase()}`} message={message} action={action} />
    </Card>
  );

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        eyebrow={record.id}
        title={record.title}
        subtitle={`${record.source} request · raised ${formatDate(record.requestDate)}`}
        icon={ClipboardList}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: DASHBOARD.path },
              { label: 'Enquiry & Request Management', to: '/customer-sales' },
              { label: 'Request Register', to: '/customer-sales' },
              { label: record.id },
            ]}
          />
        }
        chips={
          <>
            <RequestStatus status={record.status} />
            <RequestPriority priority={record.priority} />
            <span className="chip">{record.category}</span>
            {record.linkedProjectId && (
              <span className="chip chip-mint">Project {record.linkedProjectId}</span>
            )}
          </>
        }
        actions={
          <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/customer-sales')}>
                Back to Register
              </Button>
              <Button
                variant="secondary"
                icon={SearchCheck}
                onClick={() => navigate(`/customer-sales/assessment/${record.id}`)}
              >
                Technical Assessment
              </Button>
              {record.source === 'Customer' && (
                <Button
                  variant="secondary"
                  icon={ClipboardPen}
                  onClick={() => navigate(`/customer-sales/commercial/${record.id}`)}
                >
                  Quotation &amp; Commercial
                </Button>
              )}
              {record.linkedProjectId ? (
                <Button
                  variant="secondary"
                  icon={FolderKanban}
                  onClick={() => navigate(`/projects/all-projects/${record.linkedProjectId}`)}
                >
                  Open Project
                </Button>
              ) : (
                eligibility.eligible && (
                  <Button icon={ArrowRightLeft} onClick={() => openConvert(record)}>
                    Convert to Project
                  </Button>
                )
              )}
              <Button
                icon={Pencil}
                disabled={LOCKED_STATUSES.includes(record.status)}
                onClick={() => navigate(`/customer-sales/create/${record.id}/edit`)}
              >
                Edit Request
              </Button>
          </>
        }
        meta={[
          ['Requester', requesterLabel(record)],
          ['Assigned To', record.assignedTo || 'Unassigned'],
          ['Request Date', formatDate(record.requestDate)],
          ['Required Date', formatDate(record.requiredDate)],
          ['Project Reference', record.projectReference || 'Not linked'],
          ['Product Reference', record.productReference || 'Not captured'],
          ['Created Date', formatDate(record.createdAt)],
        ]}
      />

      <div className="mech-detail-card">
        <Tabs items={TABS} activeKey={activeTab} onChange={changeTab} ariaLabel="Request details sections" />
        <div className="mech-detail-body">
          {activeTab === 'overview' && (
            <>
              <div className="mech-badge-row">
                <RequestStatus status={record.status} />
                <RequestPriority priority={record.priority} />
                <RequestSource source={record.source} />
                <span className="chip chip-mint">{record.category}</span>
                {record.linkedProjectId && (
                  <span className="chip">Project {record.linkedProjectId}</span>
                )}
              </div>

              <div className="fact-grid">
                <Fact label="Request Number">{record.id}</Fact>
                <Fact label="Request Title">{record.title}</Fact>
                <Fact label="Request Source">{record.source}</Fact>
                <Fact label="Request Category">{record.category}</Fact>
                <Fact label="Requester / Department">{requesterLabel(record)}</Fact>
                <Fact label="Assigned To">{record.assignedTo}</Fact>
                <Fact label="Priority">{record.priority}</Fact>
                <Fact label="Request Status">{record.status}</Fact>
                <Fact label="Request Date">{formatDate(record.requestDate)}</Fact>
                <Fact label="Required Date">{formatDate(record.requiredDate)}</Fact>
                <Fact label="Project Reference">{record.projectReference}</Fact>
                <Fact label="Product Reference">{record.productReference}</Fact>
                <Fact label="Created Date">{formatDate(record.createdAt)}</Fact>
                <Fact label="Last Updated">{formatDate(record.updatedAt)}</Fact>
              </div>

              <div className="mech-detail-sections">
                <section>
                  <h3>Description / Objective</h3>
                  <p className="mech-detail-pre">{record.description || 'No description recorded.'}</p>
                </section>
                <section>
                  <h3>Additional Remarks</h3>
                  <p className="mech-detail-pre">{record.remarks || 'No additional remarks recorded.'}</p>
                </section>
              </div>

              <div className="mech-detail-sections">
                <section>
                  <h3>Technical Assessment</h3>
                  <dl className="detail-list detail-compact">
                    <div>
                      <dt>Reviewer</dt>
                      <dd>{assessment.reviewer || 'Not assigned'}</dd>
                    </div>
                    <div>
                      <dt>Review Date</dt>
                      <dd>{assessment.reviewDate ? formatDate(assessment.reviewDate) : 'Not reviewed'}</dd>
                    </div>
                    <div>
                      <dt>Decision</dt>
                      <dd>
                        {assessment.decision || 'Pending'}
                        {assessment.decisionBy ? ` · ${assessment.decisionBy}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Technical Feasibility</dt>
                      <dd>{assessment.feasibility?.technical || 'Not assessed'}</dd>
                    </div>
                    <div>
                      <dt>Clarification</dt>
                      <dd>
                        {assessment.clarificationRequired || 'No'} ·{' '}
                        {assessment.clarificationStatus || 'Not Required'}
                      </dd>
                    </div>
                    <div>
                      <dt>Assessment Readiness</dt>
                      <dd>
                        {readiness.ready
                          ? 'Requirements complete'
                          : `Outstanding: ${readiness.blockers.join(', ')}`}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <h3>Downstream Workflow</h3>
                  <dl className="detail-list detail-compact">
                    <div>
                      <dt>Linked Project</dt>
                      <dd>
                        <ProjectLink projectId={record.linkedProjectId} />
                      </dd>
                    </div>
                    <div>
                      <dt>Converted At</dt>
                      <dd>{record.conversion?.at ? formatStamp(record.conversion.at) : 'Not converted'}</dd>
                    </div>
                    <div>
                      <dt>Converted By</dt>
                      <dd>{record.conversion?.by || 'Not recorded'}</dd>
                    </div>
                    <div>
                      <dt>Conversion Status</dt>
                      <dd>{eligibility.eligible ? 'Eligible for project creation' : eligibility.reason}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              {record.source === 'Customer' && commercial && (
                <div className="mech-detail-sections">
                  <section>
                    <h3>Quotation &amp; Commercial</h3>
                    <dl className="detail-list detail-compact">
                      <div>
                        <dt>Quotation Stage</dt>
                        <dd>{commercial.stage || 'Not started'}</dd>
                      </div>
                      <div>
                        <dt>Quotation Number</dt>
                        <dd>{commercial.technical?.quotationNumber || 'Not issued'}</dd>
                      </div>
                      <div>
                        <dt>Price</dt>
                        <dd>{commercial.commercialReview?.price || 'Not recorded'}</dd>
                      </div>
                      <div>
                        <dt>Customer Decision</dt>
                        <dd>{commercial.acceptance?.decision || 'Pending'}</dd>
                      </div>
                    </dl>
                    {!quotation.eligible && <p className="mech-detail-note">{quotation.reason}</p>}
                  </section>
                </div>
              )}
            </>
          )}

          {activeTab === 'technical' && (
            <>
              <p className="mech-detail-note">
                Fields shown are the {record.source} request set. Empty values are saved as blank;
                fields from other request sources are not shown.
              </p>
              <dl className="detail-list er-tech-list">
                {sourceFields.map((definition) => {
                  const value = record.sourceFields?.[definition.key];
                  return (
                    <div key={definition.key}>
                      <dt>{definition.label}</dt>
                      <dd className={value ? 'er-multiline' : 'cell-muted'}>
                        {value || 'Not captured'}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </>
          )}

          {activeTab === 'parts' &&
            emptyLinkedRecord(
              Package,
              'Linked Parts',
              'Request records do not store direct part links. Parts created downstream are managed against the linked project and its engineering designs.',
              record.linkedProjectId ? (
                <Button
                  variant="secondary"
                  icon={FolderKanban}
                  onClick={() => navigate(`/projects/all-projects/${record.linkedProjectId}`)}
                >
                  Open {record.linkedProjectId}
                </Button>
              ) : undefined,
            )}

          {activeTab === 'assemblies' &&
            emptyLinkedRecord(
              Layers,
              'Linked Assemblies',
              'Request records do not store assembly structures. Assemblies are managed in Parts & Assemblies against engineering designs.',
              record.linkedProjectId ? (
                <Button
                  variant="secondary"
                  icon={FolderKanban}
                  onClick={() => navigate(`/projects/all-projects/${record.linkedProjectId}`)}
                >
                  Open {record.linkedProjectId}
                </Button>
              ) : undefined,
            )}

          {activeTab === 'calculations' &&
            emptyLinkedRecord(
              Calculator,
              'Calculations',
              'Request records do not store engineering calculations. Calculations are linked to designs and their parts in the Mechanical Engineering Design module.',
            )}

          {activeTab === 'documents' && (
            <>
              <Card
                icon={FileText}
                title="Request Documents"
                subtitle="Document metadata recorded against this request and its quotation"
              >
                <DataTable
                  columns={documentColumns}
                  rows={documents}
                  ariaLabel="Request documents"
                  emptyContent={
                    <EmptyState
                      icon={FileText}
                      title="No documents recorded"
                      message="No document metadata is attached to this request. Files added during request creation or quotation preparation appear here."
                    />
                  }
                />
                {documents.length > 0 && (
                  <p className="mech-detail-note">
                    Attachment metadata only — file preview and download are not stored in this
                    module.
                  </p>
                )}
              </Card>

              <Card
                icon={DraftingCompass}
                title="CAD / Drawing References"
                subtitle="CAD records linked to this request"
              >
                <EmptyState
                  icon={DraftingCompass}
                  title="No CAD reference linked"
                  message="Requests do not carry direct CAD links. Drawings and models are managed in Drawing & CAD Management against engineering designs."
                />
              </Card>
            </>
          )}

          {activeTab === 'revisions' && (
            <Card
              icon={History}
              title="Revision History"
              subtitle="Revision records saved for this request"
            >
              <EmptyState
                icon={History}
                title="No revision history"
                message="Requests do not maintain separate revision records. Status and workflow changes are recorded in Activity History."
              />
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card
              icon={ScrollText}
              title="Activity History"
              subtitle="Request, assessment, quotation and conversion events"
            >
              {activity.length ? (
                <ActivityTimeline entries={activity} />
              ) : (
                <EmptyState
                  icon={ScrollText}
                  title="No activity recorded"
                  message="No workflow event has been recorded for this request yet."
                />
              )}
            </Card>
          )}
        </div>
      </div>

      {convertDialog}
    </PageLayout>
  );
}
