import { useMemo } from 'react';
import { BarList, DonutChart } from '../../components/dashboard/Charts';
import {
  applyReportFilters,
  formatReportDate,
  formatReportNumber,
  seriesFromCounts,
  statusSeries,
} from '../../data/reportingAnalyticsData';
import { StackedBarChart } from './ReportCharts';
import {
  DataNote,
  MissingValue,
  ReferenceLink,
  ReportCard,
  ReportEmpty,
  ReportKpis,
  ReportTable,
  StatusCell,
} from './ReportUi';

function countRows(rows, accessor) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = typeof accessor === 'function' ? accessor(row) : row?.[accessor];
    if (value == null || value === '') return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return seriesFromCounts(counts);
}

function aggregate(rows, key, initial, update) {
  const map = new Map();
  rows.forEach((row) => {
    const value = typeof key === 'function' ? key(row) : row?.[key];
    if (!value) return;
    const current = map.get(value) || { ...initial, rowKey: value };
    update(current, row);
    map.set(value, current);
  });
  return [...map.values()];
}

const REVIEW_STAGES = ['Approved', 'Pending', 'Under Review', 'Changes Requested', 'Rejected', 'Not Submitted', 'Not Required'];

export function ReviewApprovalTab({ model, filters }) {
  const rows = useMemo(
    () => applyReportFilters(model.reviews, filters, {
      dateKey: 'submittedAt',
      statusKey: 'status',
      revisionKey: 'designRevision',
      stageKey: 'currentStage',
      ownerKey: (row) => row.ownerNames,
      departmentKey: 'department',
    }),
    [model.reviews, filters],
  );
  const statusData = statusSeries(rows, 'status');
  const projectData = countRows(rows, 'projectName');
  const stageRows = [
    { key: 'engineering', label: 'Engineering Review', values: REVIEW_STAGES.map((status) => rows.filter((row) => row.engineeringStatus === status).length) },
    { key: 'manufacturing', label: 'Manufacturing Review', values: REVIEW_STAGES.map((status) => rows.filter((row) => row.manufacturingStatus === status).length) },
    { key: 'client', label: 'Client Approval', values: REVIEW_STAGES.map((status) => rows.filter((row) => row.clientApprovalStatus === status).length) },
  ].filter((row) => row.values.some(Boolean));
  const stageSeries = REVIEW_STAGES.map((status, index) => ({
    key: status,
    label: status,
    color: ['#16A34A', '#D97706', '#7C3AED', '#EA580C', '#DC2626', '#0EA5E9', '#CBD5E1'][index],
  }));

  const columns = [
    { key: 'id', label: 'Review reference', render: (row) => <ReferenceLink to={`/design-review/review/${row.id}`}>{row.id}</ReferenceLink> },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'designRevision', label: 'Design revision' },
    { key: 'deliverableNumber', label: 'Deliverable' },
    { key: 'engineeringReviewer', label: 'Engineering reviewer' },
    { key: 'manufacturingReviewer', label: 'Manufacturing reviewer' },
    { key: 'clientReviewer', label: 'Client approval' },
    { key: 'status', label: 'Review status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'engineeringStatus', label: 'Engineering status', render: (row) => <StatusCell status={row.engineeringStatus} /> },
    { key: 'manufacturingStatus', label: 'Manufacturing status', render: (row) => <StatusCell status={row.manufacturingStatus} /> },
    { key: 'clientApprovalStatus', label: 'Client status', render: (row) => <StatusCell status={row.clientApprovalStatus} /> },
    { key: 'finalApprovalStatus', label: 'Final approval', render: (row) => <StatusCell status={row.finalApprovalStatus} /> },
    { key: 'reviewDate', label: 'Review date', render: (row) => formatReportDate(row.reviewDate) },
    { key: 'decisionDate', label: 'Decision date', render: (row) => <MissingValue>{formatReportDate(row.decisionDate, 'Not decided')}</MissingValue> },
    {
      key: 'turnaroundDays',
      label: 'Turnaround',
      align: 'right',
      render: (row) => row.turnaroundDays == null ? <MissingValue>Open {row.waitingDays ?? '—'} day(s)</MissingValue> : `${row.turnaroundDays} day(s)`,
      exportValue: (row) => row.turnaroundDays == null ? `Open ${row.waitingDays ?? ''} day(s)` : `${row.turnaroundDays} day(s)`,
    },
    {
      key: 'pendingActions',
      label: 'Pending actions',
      render: (row) => row.pendingActions.length ? row.pendingActions.join('; ') : 'None recorded',
      exportValue: (row) => row.pendingActions.join('; ') || 'None recorded',
    },
    { key: 'releaseReadiness', label: 'Release readiness', render: (row) => <StatusCell status={row.releaseReadiness} /> },
    { key: 'remarks', label: 'Latest remarks' },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'Reviews in scope', value: formatReportNumber(rows.length), sub: 'Filtered Module 11 records' },
          { label: 'Engineering pending', value: formatReportNumber(rows.filter((row) => row.engineeringStatus === 'Under Review').length), sub: 'Under Review', tone: 'purple' },
          { label: 'Manufacturing pending', value: formatReportNumber(rows.filter((row) => ['Under Review', 'Pending'].includes(row.manufacturingStatus)).length), sub: 'Under Review / Pending', tone: 'amber' },
          { label: 'Client pending', value: formatReportNumber(rows.filter((row) => ['Under Client Review', 'Not Submitted', 'Submitted to Client'].includes(row.clientApprovalStatus)).length), sub: 'Client approval required', tone: 'amber' },
          { label: 'Released', value: formatReportNumber(rows.filter((row) => row.status === 'Released').length), sub: 'Review status Released' },
          { label: 'Rejected / changes', value: formatReportNumber(rows.filter((row) => ['Rejected', 'Changes Requested'].includes(row.status)).length), sub: 'Actual negative decisions', tone: 'red' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Review status distribution" subtitle="Overall Module 11 workflow status in the current scope.">
          {statusData.length ? <DonutChart data={statusData} centerValue={rows.length} centerLabel="Reviews" formatValue={formatReportNumber} ariaLabel="Review status distribution" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Reviews by project" subtitle="Actual review records grouped by project.">
          {projectData.length ? <BarList data={projectData} formatValue={formatReportNumber} ariaLabel="Reviews by project" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Approval stage status" subtitle="Engineering, manufacturing and client stage states. Not Required is a real source state." wide>
          {stageRows.length ? <StackedBarChart data={stageRows} series={stageSeries} formatValue={formatReportNumber} ariaLabel="Approval stage status" /> : <ReportEmpty />}
        </ReportCard>
      </div>

      <ReportTable
        title="Engineering review and approval report"
        subtitle="Source: Module 11 review records with exact design revision, stage reviewers, decisions and controlled release."
        columns={columns}
        rows={rows}
        filename="module14-review-approval.csv"
        ariaLabel="Engineering review and approval report"
      />

      <DataNote>
        Turnaround is calculated only from actual submitted and decided dates. Open reviews show elapsed days, not a forecast. Final approval and release readiness are taken from the stored final approval and release records; no approval is inferred.
      </DataNote>
    </>
  );
}

export function EngineeringChangeTab({ model, filters }) {
  const rows = useMemo(
    () => applyReportFilters(model.changes, filters, {
      dateKey: 'createdDate',
      statusKey: 'status',
      approvalKey: 'approvalStatus',
      revisionKey: 'affectedRevision',
      typeKey: 'changeType',
      ownerKey: 'owner',
      openKey: 'closureStatus',
      departmentKey: 'department',
    }),
    [model.changes, filters],
  );
  const statusData = statusSeries(rows, 'status');
  const typeData = statusSeries(rows, 'changeType');
  const impactData = statusSeries(rows, 'impactLevel');
  const visibleIds = new Set(rows.map((row) => row.rowKey));
  const historyRows = model.changeHistory.filter((row) => visibleIds.has(row.changeId));

  const columns = [
    { key: 'rowKey', label: 'Change number', render: (row) => row.changeType === 'ECR' ? <ReferenceLink to="/engineering-release/ecr-eco">{row.id}</ReferenceLink> : <span>{row.id}</span> },
    { key: 'changeType', label: 'Type', render: (row) => <StatusCell status={row.changeType} /> },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'affectedRevision', label: 'Affected revision' },
    { key: 'changeReason', label: 'Change reason' },
    { key: 'requestedBy', label: 'Requested by' },
    { key: 'approvalStatus', label: 'Approval status', render: (row) => <StatusCell status={row.approvalStatus} /> },
    { key: 'implementationStatus', label: 'Implementation', render: (row) => <StatusCell status={row.implementationStatus} /> },
    { key: 'verificationStatus', label: 'Verification', render: (row) => <StatusCell status={row.verificationStatus} /> },
    { key: 'closureStatus', label: 'Closure', render: (row) => <StatusCell status={row.closureStatus} /> },
    { key: 'impactLevel', label: 'Impact' },
    { key: 'createdDate', label: 'Created', render: (row) => formatReportDate(row.createdDate) },
    { key: 'closedDate', label: 'Closed', render: (row) => <MissingValue>{formatReportDate(row.closedDate, 'Not recorded')}</MissingValue> },
    { key: 'sourceEcrId', label: 'Source ECR', render: (row) => row.sourceEcrId || <MissingValue>Not applicable</MissingValue> },
  ];

  const historyColumns = [
    { key: 'changeId', label: 'Change' },
    { key: 'action', label: 'Action' },
    { key: 'stage', label: 'Stage' },
    { key: 'by', label: 'By' },
    { key: 'at', label: 'At', render: (row) => formatReportDate(row.at) },
    { key: 'statusAfter', label: 'Status after', render: (row) => row.statusAfter ? <StatusCell status={row.statusAfter} /> : <MissingValue /> },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'ECR records', value: formatReportNumber(rows.filter((row) => row.changeType === 'ECR').length), sub: 'Actual ECR records' },
          { label: 'ECO records', value: formatReportNumber(rows.filter((row) => row.changeType === 'ECO').length), sub: 'Actual ECO records' },
          { label: 'Open ECRs', value: formatReportNumber(rows.filter((row) => row.changeType === 'ECR' && row.closureStatus === 'Open').length), sub: 'Not released / rejected / closed', tone: 'amber' },
          { label: 'Approved', value: formatReportNumber(rows.filter((row) => row.approvalStatus === 'Approved').length), sub: 'Recorded approval status' },
          { label: 'Revision updated', value: formatReportNumber(rows.filter((row) => row.implementationStatus === 'Revision updated' || row.status === 'Revision Updated').length), sub: 'Actual revision update recorded' },
          { label: 'Rejected', value: formatReportNumber(rows.filter((row) => String(row.status).toLowerCase().includes('rejected') || row.approvalStatus === 'Rejected').length), sub: 'Recorded rejection', tone: 'red' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Engineering changes by status" subtitle="Actual ECR and ECO status records; rejected records remain visible.">
          {statusData.length ? <DonutChart data={statusData} centerValue={rows.length} centerLabel="Changes" formatValue={formatReportNumber} ariaLabel="Engineering change status" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="ECR and ECO records" subtitle="The two controlled record types are reported separately and are not merged into one change.">
          {typeData.length ? <DonutChart data={typeData} centerValue={rows.length} centerLabel="Records" formatValue={formatReportNumber} ariaLabel="ECR and ECO distribution" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Revision impact" subtitle="Impact level recorded on ECRs and change category recorded on ECOs." wide>
          {impactData.length ? <BarList data={impactData} formatValue={formatReportNumber} ariaLabel="Engineering change impact" /> : <ReportEmpty />}
        </ReportCard>
      </div>

      <ReportTable
        title="Engineering change report"
        subtitle="Source: Module 12 ECR and ECO records. ECR is conditional for a design; no Not Applicable placeholder is reported as a change."
        columns={columns}
        rows={rows}
        filename="module14-engineering-changes.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Engineering change report"
      />

      <ReportTable
        title="Change activity history"
        subtitle="Actual history events recorded by the engineering change workflow, limited to the filtered change records."
        columns={historyColumns}
        rows={historyRows}
        filename="module14-change-history.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Engineering change history"
      />

      <DataNote>
        ECR and ECO totals are separate record counts. “Revision Updated” is an actual record status, not a verification claim. Verification and closed dates remain Not recorded where the source has no value. No change is treated as applicable unless an actual ECR/ECO record exists.
      </DataNote>
    </>
  );
}

export function ManufacturingTab({ model, filters }) {
  const rows = useMemo(
    () => applyReportFilters(model.manufacturing, filters, {
      dateKey: 'recordDate',
      statusKey: 'status',
      approvalKey: 'manufacturingReviewStatus',
      revisionKey: 'revision',
      ownerKey: (row) => [row.engineer, row.createdBy].filter(Boolean),
      handoverKey: 'handoverStatus',
      departmentKey: 'department',
    }),
    [model.manufacturing, filters],
  );
  const statusData = statusSeries(rows, 'status');
  const inspectionData = countRows(rows.filter((row) => row.inspection), 'inspectionRequirements');
  const processData = countRows(rows.filter((row) => row.processPlanRecord), (row) => row.processPlanRecord.status || 'Not recorded');
  const handoverFilters = { ...filters, status: 'All', approval: 'All', revision: 'All', owner: 'All' };
  const handoverRows = useMemo(
    () => applyReportFilters(model.handovers, handoverFilters, {
      dateKey: 'createdAt',
      statusKey: 'status',
      handoverKey: 'handoverStatus',
      departmentKey: 'department',
    }),
    [model.handovers, handoverFilters],
  );

  const columns = [
    { key: 'rowKey', label: 'Definition', render: (row) => <ReferenceLink to={`/manufacturing-design/definition/${row.id}`}>{row.id}</ReferenceLink> },
    { key: 'name', label: 'Manufacturing definition' },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'itemNumber', label: 'Part / assembly' },
    { key: 'manufacturingProcess', label: 'Manufacturing process' },
    { key: 'inspectionRequirements', label: 'Inspection requirement' },
    { key: 'qualityRequirements', label: 'Quality requirement' },
    { key: 'processPlan', label: 'Process plan' },
    { key: 'workInstructions', label: 'Work instructions' },
    { key: 'manufacturingReviewStatus', label: 'Manufacturing review', render: (row) => <StatusCell status={row.manufacturingReviewStatus} /> },
    { key: 'handoverId', label: 'Production handover', render: (row) => row.handoverId ? <ReferenceLink to={`/design-handover/${row.handoverId}`}>{row.handoverId}</ReferenceLink> : <MissingValue>No handover</MissingValue> },
    { key: 'packageStatus', label: 'Package status', render: (row) => <StatusCell status={row.packageStatus} /> },
    { key: 'releaseStatus', label: 'Release status', render: (row) => <StatusCell status={row.releaseStatus} /> },
    { key: 'transferStatus', label: 'Transfer status', render: (row) => <StatusCell status={row.transferStatus} /> },
    { key: 'status', label: 'Definition status', render: (row) => <StatusCell status={row.status} /> },
  ];

  const handoverColumns = [
    { key: 'rowKey', label: 'Handover', render: (row) => <ReferenceLink to={`/design-handover/${row.id}`}>{row.id}</ReferenceLink> },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'designRevision', label: 'Revision' },
    { key: 'status', label: 'Handover status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'packageStatus', label: 'Package', render: (row) => <StatusCell status={row.packageStatus} /> },
    { key: 'releaseStatus', label: 'Release', render: (row) => <StatusCell status={row.releaseStatus} /> },
    { key: 'transferId', label: 'Transfer', render: (row) => row.transferId ? <ReferenceLink to={`/transfers/${row.transferId}`}>{row.transferId}</ReferenceLink> : <MissingValue>No transfer</MissingValue> },
    { key: 'transferStatus', label: 'Transfer status', render: (row) => <StatusCell status={row.transferStatus} /> },
    { key: 'actualTransferDate', label: 'Actual transfer', render: (row) => <MissingValue>{formatReportDate(row.actualTransferDate, 'Not recorded')}</MissingValue> },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'Definitions', value: formatReportNumber(rows.length), sub: 'Filtered Module 08 definitions' },
          { label: 'Released definitions', value: formatReportNumber(rows.filter((row) => row.status === 'Released').length), sub: 'Recorded definition status' },
          { label: 'Inspections linked', value: formatReportNumber(rows.filter((row) => row.inspection).length), sub: 'Inspection record resolved from source references' },
          { label: 'Process plans linked', value: formatReportNumber(rows.filter((row) => row.processPlanRecord).length), sub: 'Process plan resolved from source references' },
          { label: 'Handovers', value: formatReportNumber(handoverRows.length), sub: 'Module 13 records in scope' },
          { label: 'Released handovers', value: formatReportNumber(handoverRows.filter((row) => row.releaseStatus === 'Released').length), sub: 'Actual release record' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Manufacturing definition status" subtitle="Module 08 definition/revision status.">
          {statusData.length ? <DonutChart data={statusData} centerValue={rows.length} centerLabel="Definitions" formatValue={formatReportNumber} ariaLabel="Manufacturing definition status" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Inspection requirement status" subtitle="Status of inspection records linked to the filtered manufacturing definitions.">
          {inspectionData.length ? <BarList data={inspectionData} formatValue={formatReportNumber} ariaLabel="Inspection requirement status" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Process plan status" subtitle="Status of process plans linked to the filtered definitions.">
          {processData.length ? <BarList data={processData} formatValue={formatReportNumber} ariaLabel="Process plan status" /> : <ReportEmpty />}
        </ReportCard>
      </div>

      <ReportTable
        title="Manufacturing definition report"
        subtitle="Source: Module 08 definition, inspection and process-plan records joined to Module 13 handover, package, release and transfer records."
        columns={columns}
        rows={rows}
        filename="module14-manufacturing.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Manufacturing definition report"
      />

      <ReportTable
        title="Production handover and transfer preparation"
        subtitle="Engineering preparation only. Transfer status is recorded preparation/handover state, not shop-floor execution."
        columns={handoverColumns}
        rows={handoverRows}
        filename="module14-handover-preparation.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Production handover preparation"
      />

      <DataNote>
        This report covers engineering and manufacturing preparation. It does not report production execution, shop-floor progress, finished goods, dispatch or delivery. A linked inspection/process plan is resolved only from matching source references; missing links remain visible.
      </DataNote>
    </>
  );
}

export function WorkloadDelayTab({ model, filters }) {
  const scopedFilters = { ...filters, status: 'All' };
  const projects = useMemo(
    () => applyReportFilters(model.workload.schedule, scopedFilters, {
      ownerKey: 'owner',
      delayKey: 'delayStatus',
      departmentKey: 'department',
      dateKey: 'targetDate',
    }),
    [model.workload.schedule, scopedFilters],
  );
  const designs = useMemo(
    () => applyReportFilters(model.designs, scopedFilters, {
      ownerKey: 'owner',
      departmentKey: 'department',
      dateKey: 'target',
    }),
    [model.designs, scopedFilters],
  );
  const allReviews = useMemo(
    () => applyReportFilters(model.reviews, scopedFilters, {
      ownerKey: (row) => row.ownerNames,
      departmentKey: 'department',
      dateKey: 'submittedAt',
    }),
    [model.reviews, scopedFilters],
  );
  const reviews = allReviews.filter((row) => !['Released', 'Rejected', 'Draft'].includes(row.status));
  const pendingTasks = useMemo(
    () => applyReportFilters(model.workload.pendingTasks, filters, {
      statusKey: 'status',
      ownerKey: 'owner',
      departmentKey: 'department',
      dateKey: 'due',
    }),
    [model.workload.pendingTasks, filters],
  );

  const projectOwnerRows = aggregate(projects, 'owner', { owner: '', projects: 0, active: 0, completed: 0, delayed: 0, designs: 0, pendingTasks: 0 }, (current, row) => {
    current.owner = row.owner;
    current.projects += 1;
    if (!['Completed', 'Cancelled'].includes(row.status)) current.active += 1;
    if (row.status === 'Completed') current.completed += 1;
    if (row.delayStatus === 'Delayed') current.delayed += 1;
    current.designs += designs.filter((design) => design.owner === row.owner).length;
    current.pendingTasks += pendingTasks.filter((task) => task.engineer === row.owner).length;
  }).sort((left, right) => right.projects - left.projects);

  const designOwnerRows = aggregate(designs, 'owner', { owner: '', designs: 0, approved: 0, inProgress: 0, changes: 0, released: 0 }, (current, row) => {
    current.owner = row.owner;
    current.designs += 1;
    if (['Approved', 'Released'].includes(row.status)) current.approved += 1;
    if (['In Design', 'Under Review', 'Submitted'].includes(row.status)) current.inProgress += 1;
    if (['Changes Requested', 'Revision Required', 'Rejected'].includes(row.status)) current.changes += 1;
    if (row.isReleased) current.released += 1;
  }).sort((left, right) => right.designs - left.designs);

  const reviewerMap = new Map();
  allReviews.filter((row) => row.status !== 'Draft').forEach((row) => {
    [...new Set(row.ownerNames || [])].forEach((reviewer) => {
      const current = reviewerMap.get(reviewer) || {
        rowKey: reviewer,
        reviewer,
        assigned: 0,
        pending: 0,
        approved: 0,
        changes: 0,
      };
      current.assigned += 1;
      if (['Released', 'Rejected', 'Approved'].includes(row.status)) current.approved += 1;
      else current.pending += 1;
      if (row.status === 'Changes Requested') current.changes += 1;
      reviewerMap.set(reviewer, current);
    });
  });
  const reviewerRows = [...reviewerMap.values()].sort((left, right) => right.assigned - left.assigned);

  const departmentRows = aggregate(
    [
      ...projects.map((row) => ({ ...row, _kind: 'project', _status: row.status })),
      ...designs.map((row) => ({ ...row, _kind: 'design', _status: row.status })),
      ...pendingTasks.map((row) => ({ ...row, _kind: 'task', _status: row.status })),
      ...reviews.map((row) => ({ ...row, _kind: 'review', _status: row.status })),
    ],
    'department',
    { department: '', projects: 0, designs: 0, tasks: 0, openTasks: 0, overdueTasks: 0, pendingReviews: 0 },
    (current, row) => {
      current.department = row.department;
      if (row._kind === 'project') current.projects += 1;
      if (row._kind === 'design') current.designs += 1;
      if (row._kind === 'task') {
        current.tasks += 1;
        current.openTasks += 1;
        if (row.overdue) current.overdueTasks += 1;
      }
      if (row._kind === 'review') current.pendingReviews += 1;
    },
  ).sort((left, right) => (right.projects + right.designs + right.tasks) - (left.projects + left.designs + left.tasks));

  const projectOwnerChart = projectOwnerRows.map((row) => ({ key: row.owner, label: row.owner, value: row.projects, color: '#0B7A68' }));
  const designOwnerChart = designOwnerRows.map((row) => ({ key: row.owner, label: row.owner, value: row.designs, color: '#2563EB' }));
  const reviewerChart = reviewerRows.map((row) => ({ key: row.reviewer, label: row.reviewer, value: row.pending, color: '#D97706' }));
  const departmentChart = departmentRows.map((row) => ({ key: row.department, label: row.department, value: row.openTasks, color: '#7C3AED' }));

  const projectOwnerColumns = [
    { key: 'owner', label: 'Project owner' },
    { key: 'projects', label: 'Projects', align: 'right' },
    { key: 'active', label: 'Active', align: 'right' },
    { key: 'completed', label: 'Completed', align: 'right' },
    { key: 'delayed', label: 'Delayed', align: 'right' },
    { key: 'designs', label: 'Designs owned', align: 'right' },
    { key: 'pendingTasks', label: 'Pending tasks', align: 'right' },
  ];

  const designOwnerColumns = [
    { key: 'owner', label: 'Design owner' },
    { key: 'designs', label: 'Designs', align: 'right' },
    { key: 'approved', label: 'Approved', align: 'right' },
    { key: 'inProgress', label: 'In progress / review', align: 'right' },
    { key: 'changes', label: 'Changes required', align: 'right' },
    { key: 'released', label: 'Released', align: 'right' },
  ];

  const reviewerColumns = [
    { key: 'reviewer', label: 'Reviewer' },
    { key: 'assigned', label: 'Reviews assigned', align: 'right' },
    { key: 'pending', label: 'Pending', align: 'right' },
    { key: 'approved', label: 'Approved / released', align: 'right' },
    { key: 'changes', label: 'Changes requested', align: 'right' },
  ];

  const departmentColumns = [
    { key: 'department', label: 'Department' },
    { key: 'projects', label: 'Projects', align: 'right' },
    { key: 'designs', label: 'Designs', align: 'right' },
    { key: 'tasks', label: 'Open tasks shown', align: 'right' },
    { key: 'openTasks', label: 'Open tasks', align: 'right' },
    { key: 'overdueTasks', label: 'Overdue tasks', align: 'right' },
    { key: 'pendingReviews', label: 'Pending approvals', align: 'right' },
  ];

  const taskColumns = [
    { key: 'id', label: 'Task' },
    { key: 'name', label: 'Task name' },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'owner', label: 'Engineer' },
    { key: 'department', label: 'Discipline / department' },
    { key: 'status', label: 'Status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'priority', label: 'Priority' },
    { key: 'progress', label: 'Recorded progress', align: 'right', render: (row) => `${row.progress ?? 0}%` },
    { key: 'due', label: 'Due date', render: (row) => formatReportDate(row.due) },
    { key: 'daysPastDue', label: 'Days past due', align: 'right', render: (row) => row.overdue ? row.daysPastDue : <MissingValue>—</MissingValue> },
  ];

  const approvalColumns = [
    { key: 'id', label: 'Review', render: (row) => <ReferenceLink to={`/design-review/review/${row.id}`}>{row.id}</ReferenceLink> },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'currentStage', label: 'Current stage' },
    { key: 'status', label: 'Status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'submittedAt', label: 'Submitted', render: (row) => formatReportDate(row.submittedAt) },
    { key: 'waitingDays', label: 'Waiting days', align: 'right' },
    { key: 'pendingActions', label: 'Pending actions', render: (row) => row.pendingActions.join('; ') || 'None recorded', exportValue: (row) => row.pendingActions.join('; ') || 'None recorded' },
  ];

  const scheduleColumns = [
    { key: 'projectId', label: 'Project', render: (row) => <ReferenceLink to={`/projects/all-projects/${row.projectId}`}>{row.projectId}</ReferenceLink> },
    { key: 'projectName', label: 'Project name' },
    { key: 'owner', label: 'Project owner' },
    { key: 'status', label: 'Status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'targetDate', label: 'Target date', render: (row) => formatReportDate(row.targetDate) },
    { key: 'actualCompletionDate', label: 'Actual completion', render: (row) => <MissingValue>{formatReportDate(row.actualCompletionDate, 'Not recorded')}</MissingValue> },
    { key: 'delayStatus', label: 'Delay status', render: (row) => <StatusCell status={row.delayStatus} /> },
    { key: 'targetVarianceDays', label: 'Days to target', align: 'right', render: (row) => row.targetVarianceDays == null ? <MissingValue /> : row.targetVarianceDays },
    { key: 'completionState', label: 'Schedule observation' },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'Project owners', value: formatReportNumber(projectOwnerRows.length), sub: 'Distinct project managers in scope' },
          { label: 'Design owners', value: formatReportNumber(designOwnerRows.length), sub: 'Distinct design owners in scope' },
          { label: 'Reviewers', value: formatReportNumber(reviewerRows.length), sub: 'Assigned engineering / manufacturing reviewers' },
          { label: 'Open tasks', value: formatReportNumber(pendingTasks.length), sub: 'Actual tasks not Completed', tone: 'amber' },
          { label: 'Overdue tasks', value: formatReportNumber(pendingTasks.filter((row) => row.overdue).length), sub: 'Due date before today, not Completed', tone: 'red' },
          { label: 'Pending approvals', value: formatReportNumber(reviews.length), sub: 'Reviews not Released / Rejected' },
          { label: 'Delayed projects', value: formatReportNumber(projects.filter((row) => row.delayStatus === 'Delayed').length), sub: 'Recorded delayed flag', tone: 'red' },
          { label: 'Actual completion dates', value: formatReportNumber(projects.filter((row) => row.actualCompletionDate).length), sub: 'Available in source records', tone: 'amber' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Project owner workload" subtitle="Projects assigned to each recorded project manager.">
          {projectOwnerChart.length ? <BarList data={projectOwnerChart} formatValue={formatReportNumber} ariaLabel="Project owner workload" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Design owner workload" subtitle="Mechanical designs grouped by recorded design owner.">
          {designOwnerChart.length ? <BarList data={designOwnerChart} formatValue={formatReportNumber} ariaLabel="Design owner workload" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Reviewer pending workload" subtitle="Pending reviews grouped by first assigned reviewer. Reviewer assignments are taken from the review record.">
          {reviewerChart.length ? <BarList data={reviewerChart} formatValue={formatReportNumber} ariaLabel="Reviewer workload" /> : <ReportEmpty title="No pending reviewer workload" message="No pending review is assigned in the current filters." />}
        </ReportCard>
        <ReportCard title="Department open tasks" subtitle="Open task count by the discipline recorded on the task.">
          {departmentChart.length ? <BarList data={departmentChart} formatValue={formatReportNumber} ariaLabel="Department workload" /> : <ReportEmpty />}
        </ReportCard>
      </div>

      <div className="insight-analytics-grid report-analytics-grid report-workload-tables">
        <ReportTable
          className="insight-card-wide"
          title="Project owner workload"
          subtitle="Recorded ownership, not inferred assignment."
          columns={projectOwnerColumns}
          rows={projectOwnerRows}
          filename="module14-project-owner-workload.csv"
          getRowId={(row) => row.owner}
          ariaLabel="Project owner workload"
        />
        <ReportTable
          className="insight-card-wide"
          title="Design owner workload"
          subtitle="Design ownership and status."
          columns={designOwnerColumns}
          rows={designOwnerRows}
          filename="module14-design-owner-workload.csv"
          getRowId={(row) => row.owner}
          ariaLabel="Design owner workload"
        />
        <ReportTable
          className="insight-card-wide"
          title="Reviewer workload"
          subtitle="Review assignment count and current decision state."
          columns={reviewerColumns}
          rows={reviewerRows}
          filename="module14-reviewer-workload.csv"
          getRowId={(row) => row.reviewer}
          ariaLabel="Reviewer workload"
        />
        <ReportTable
          className="insight-card-wide"
          title="Department workload"
          subtitle="Project, design and open-task distribution by recorded department/discipline."
          columns={departmentColumns}
          rows={departmentRows}
          filename="module14-department-workload.csv"
          getRowId={(row) => row.department}
          ariaLabel="Department workload"
        />
      </div>

      <ReportTable
        title="Pending tasks and overdue activities"
        subtitle="Actual Design Planning tasks not yet Completed. Overdue means the stored due date is before today."
        columns={taskColumns}
        rows={pendingTasks}
        filename="module14-overdue-tasks.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Pending and overdue tasks"
      />

      <ReportTable
        title="Pending approvals and review waiting time"
        subtitle="Reviews not Released or Rejected; waiting days are calculated from the actual submission date to today."
        columns={approvalColumns}
        rows={reviews}
        filename="module14-pending-approvals.csv"
        getRowId={(row) => row.id}
        ariaLabel="Pending approvals and waiting time"
      />

      <ReportTable
        title="Target date versus actual date"
        subtitle="Project targets and any actual completion date stored on the project. Missing actual completion is not substituted with the target."
        columns={scheduleColumns}
        rows={projects}
        filename="module14-target-vs-actual.csv"
        getRowId={(row) => row.projectId}
        ariaLabel="Target versus actual dates"
      />

      <DataNote>
        Workload is counted only from ownership fields already present on projects, designs, reviews and tasks. No task is assigned by this report. Actual task completion dates are not present in the retained planning records, so target-versus-actual is shown only where a project completion date exists; otherwise it is explicitly Not recorded.
      </DataNote>
    </>
  );
}
