import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Download, Edit, ExternalLink, PackageCheck, Send } from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  DataTable,
  PageHeader,
  PageLayout,
  ViewPageBanner,
  StatusBadge,
} from '../../components/common';
import { DASHBOARD, MODULES } from '../../config/navigation';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { useProjects } from '../../context/ProjectsContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useApprovals } from '../../context/ApprovalsContext';
import {
  PACKAGE_CATEGORIES,
  formatHandoverDate,
  packageCompleteness,
  selectedPackageItems,
  validationSummary,
} from '../../data/designHandoverData';
import { CompletenessBar, ReleaseCard, ValidationSummaryCard } from './designHandoverUi';
import '../../styles/design-handover.css';

export default function HandoverDetailPage() {
  const { handoverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getHandover, getPackage, getRelease, transfersFor } = useDesignHandover();
  const { projects } = useProjects();
  const { designs } = useMechanical();
  const { reviews } = useApprovals();
  const module = MODULES.find((row) => row.key === 'design-handover');
  const handover = getHandover(handoverId);
  const notice = location.state?.notice;
  const savedMessage = location.state?.handoverSaved;

  if (!module) return <Navigate to={DASHBOARD.path} replace />;
  if (!handover) return <Navigate to="/design-handover" replace />;

  const project = projects.find((row) => row.id === handover.projectId);
  const design = designs.find((row) => row.id === handover.designId);
  const packageRecord = getPackage(handover.id);
  const release = getRelease(handover.id);
  const attempts = transfersFor(handover.id);
  const completeness = packageCompleteness(packageRecord);
  const summary = validationSummary(handover.validation);
  const engineeringReview = reviews.find((row) => row.id === handover.engineeringReviewId);
  const manufacturingReview = reviews.find((row) => row.id === handover.manufacturingReviewId);

  const documentRows = packageRecord
    ? PACKAGE_CATEGORIES.flatMap((category) =>
        selectedPackageItems(packageRecord, category.key).map((item) => ({
          ...item,
          categoryLabel: category.label,
          mandatory: category.mandatory,
        })),
      )
    : [];

  const documentColumns = [
    { key: 'category', label: 'Category', render: (row) => <span>{row.categoryLabel}<span className="cell-sub">{row.mandatory ? 'Mandatory' : 'Optional'}</span></span> },
    { key: 'label', label: 'Actual source record', render: (row) => row.label },
    { key: 'module', label: 'Source module', render: (row) => row.sourceModule },
    { key: 'revision', label: 'Revision', render: (row) => row.revision || '—' },
    { key: 'status', label: 'Source status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const attemptColumns = [
    { key: 'id', label: 'Attempt', render: (row) => <span className="cell-strong">{row.id}</span> },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'prepared', label: 'Prepared', render: (row) => `${row.preparedBy} · ${formatHandoverDate(row.preparedDate)}` },
    { key: 'export', label: 'Export date', render: (row) => row.exportDate ? formatHandoverDate(row.exportDate) : '—' },
    { key: 'destination', label: 'Destination reference', render: (row) => row.destinationReference || '—' },
    { key: 'remarks', label: 'Remarks', render: (row) => <span className="dh-evidence-cell">{row.remarks || '—'}</span> },
  ];

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={module.icon}
        eyebrow={handover.id}
        title={project?.name || `Handover ${handover.id}`}
        subtitle={`${handover.projectId} · ${handover.designId} Rev ${handover.designRevision} · ${handover.itemId || handover.itemType}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: DASHBOARD.path },
              { label: module.label, to: '/design-handover' },
              { label: handover.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={handover.status} />
            <span className="chip">{handover.itemType}</span>
            {handover.bomId && <span className="chip">BOM {handover.bomId}</span>}
          </>
        }
        meta={[
          ['Handover ID', handover.id],
          ['Project', handover.projectId],
          ['Design', `${handover.designId} · Rev ${handover.designRevision}`],
          ['Owner', handover.owner],
          ['Target Date', formatHandoverDate(handover.targetDate)],
          ['Actual Handover', handover.actualHandoverDate ? formatHandoverDate(handover.actualHandoverDate) : 'Not recorded'],
        ]}
        actions={
          <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/design-handover')}>Register</Button>
              {handover.sourceReviewId && (
                <Button variant="secondary" icon={ExternalLink} onClick={() => navigate(`/design-review/review/${handover.sourceReviewId}`)}>Design Review</Button>
              )}
              {['Draft', 'Validation Failed', 'Ready for Release'].includes(handover.status) && (
                <Button variant="ghost" icon={Edit} onClick={() => navigate(`/design-handover/${handover.id}/edit`)}>Edit</Button>
              )}
              <Button variant="secondary" icon={PackageCheck} onClick={() => navigate('/design-handover/package')}>Package</Button>
              <Button icon={ClipboardCheck} onClick={() => navigate('/design-handover/validation')}>Validation</Button>
          </>
        }
      />
      {savedMessage && (
        <div className="dh-feedback is-success" role="status">
          {savedMessage} saved {location.state?.saveIntent === 'draft' ? 'as a draft' : 'as a handover'} and no approval or transfer was created.
        </div>
      )}
      {notice && <div className="dh-feedback" role="status">{notice}</div>}

      <div className="dh-detail-status">
        <StatusBadge status={handover.status} />
        <span>Owner {handover.owner}</span>
        <span>Target {formatHandoverDate(handover.targetDate)}</span>
        <span>Actual handover {handover.actualHandoverDate ? formatHandoverDate(handover.actualHandoverDate) : 'not recorded'}</span>
      </div>

      <div className="dh-detail-grid">
        <Card>
          <span className="dh-eyebrow">Handover record</span>
          <h3>{project?.name || 'Project record unavailable'}</h3>
          <dl className="dh-key-values">
            <div><dt>Project</dt><dd>{handover.projectId}</dd></div>
            <div><dt>Mechanical design</dt><dd>{handover.designId} · {design?.name || 'Design record unavailable'}</dd></div>
            <div><dt>Design revision</dt><dd>Rev {handover.designRevision}</dd></div>
            <div><dt>Part / assembly</dt><dd>{handover.itemType} · {handover.itemId || 'Not selected'}</dd></div>
            <div><dt>BOM revision</dt><dd>{handover.bomId ? `${handover.bomId} Rev ${handover.bomRevision}` : 'Not selected'}</dd></div>
            <div><dt>Drawings</dt><dd>{handover.drawingIds?.length ? handover.drawingIds.join(', ') : 'Not selected'}</dd></div>
            <div><dt>Manufacturing definition</dt><dd>{handover.manufacturingId || 'Not selected'}</dd></div>
            <div><dt>Inspection requirements</dt><dd>{handover.inspectionId || 'Not selected'}</dd></div>
            <div><dt>Process plan</dt><dd>{handover.processPlanId || 'Not selected'}</dd></div>
            <div><dt>Engineering review</dt><dd>{engineeringReview ? `${engineeringReview.id} · ${engineeringReview.stageStates?.engineering?.status || engineeringReview.status}` : 'Not selected'}</dd></div>
            <div><dt>Manufacturing review</dt><dd>{manufacturingReview ? `${manufacturingReview.id} · ${manufacturingReview.stageStates?.manufacturing?.status || manufacturingReview.status}` : 'Not selected'}</dd></div>
            <div><dt>Final approval</dt><dd>{handover.finalApprovalId || 'Not selected'}</dd></div>
            {handover.sourceReviewId && <div><dt>Source design review</dt><dd>{handover.sourceReviewId} · {handover.sourceReleaseId || 'Release reference not recorded'}</dd></div>}
            {handover.sourceRefs?.designRevision && <div><dt>Source revision</dt><dd>{handover.sourceRefs.designId} Rev {handover.sourceRefs.designRevision}</dd></div>}
            <div><dt>Notes</dt><dd>{handover.notes || '—'}</dd></div>
          </dl>
        </Card>

        <div className="dh-detail-side">
          <Card>
            <div className="dh-subhead">
              <div><span className="dh-eyebrow">Final design package</span><h3>{packageRecord ? `${packageRecord.id} v${packageRecord.version}` : 'Not created'}</h3></div>
              {packageRecord && <StatusBadge status={packageRecord.status} />}
            </div>
            {packageRecord ? (
              <>
                <CompletenessBar packageRecord={packageRecord} />
                <p className="dh-muted-note">Prepared by {packageRecord.preparedBy} · {formatHandoverDate(packageRecord.preparedDate)}</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/design-handover/package')}>Open Package Builder</Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate('/design-handover/package')}>Create Final Package</Button>
            )}
          </Card>
          <Card>
            <div className="dh-subhead">
              <div><span className="dh-eyebrow">Release validation</span><h3>{handover.validation ? `${summary.pass} pass · ${summary.fail} fail` : 'Not run'}</h3></div>
              {handover.validation && <StatusBadge status={summary.mandatoryFailures ? 'Blocked' : 'Ready'} />}
            </div>
            <p className="dh-muted-note">{handover.validation ? `Checked ${formatHandoverDate(handover.validation.checkedAt)} by ${handover.validation.checkedBy}` : 'No validation result is recorded.'}</p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/design-handover/validation')}>Open Validation</Button>
          </Card>
          {release && <ReleaseCard release={release} />}
        </div>
      </div>

      <Card>
        <div className="dh-subhead">
          <div><span className="dh-eyebrow">Release readiness</span><h3>Checklist result</h3></div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/design-handover/validation')}>View Full Checklist</Button>
        </div>
        <ValidationSummaryCard validation={handover.validation} />
      </Card>

      <Card>
        <div className="dh-subhead">
          <div><span className="dh-eyebrow">Final design package</span><h3>Linked documents and source references</h3></div>
          <span className="dh-chip">{documentRows.length} linked · {completeness.percent}% mandatory</span>
        </div>
        <DataTable columns={documentColumns} rows={documentRows} ariaLabel="Package document references" emptyContent={<span className="cell-muted">No document source has been linked yet.</span>} />
      </Card>

      <Card>
        <div className="dh-subhead">
          <div><span className="dh-eyebrow">Production handover</span><h3>Transfer attempts</h3></div>
          {release && <Button size="sm" variant="secondary" icon={Send} onClick={() => navigate('/design-handover/send')}>Open Send to Production</Button>}
        </div>
        <DataTable columns={attemptColumns} rows={attempts} ariaLabel="Handover transfer attempts" emptyContent={<span className="cell-muted">No export or manual handover attempt has been recorded.</span>} />
      </Card>

      <Card>
        <div className="dh-subhead">
          <div><span className="dh-eyebrow">Audit</span><h3>Handover history</h3></div>
          <Download aria-hidden="true" />
        </div>
        <ol className="dh-audit-list">
          {(handover.history || []).slice().reverse().map((entry) => (
            <li key={entry.id}>
              <span className="dh-audit-dot" aria-hidden="true" />
              <div><strong>{entry.action}</strong><p>{entry.detail}</p><span>{entry.by} · {entry.at}</span></div>
            </li>
          ))}
        </ol>
      </Card>
    </PageLayout>
  );
}
