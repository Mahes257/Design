import { useMemo } from 'react';
import { BarChart3, CalendarDays, FileText, Layers, PackageOpen, Wrench } from 'lucide-react';
import { BarList, DonutChart } from '../../components/dashboard/Charts';
import {
  applyReportFilters,
  formatReportCurrency,
  formatReportDate,
  formatReportMonth,
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

function list(value, fallback = 'None') {
  if (Array.isArray(value) && value.length) return value.join(', ');
  return fallback;
}

function useProjectRows(model, filters) {
  return useMemo(
    () => applyReportFilters(model.projects, filters, {
      dateKey: 'startDate',
      statusKey: 'status',
      ownerKey: 'owner',
      delayKey: 'delayStatus',
      departmentKey: 'department',
    }),
    [model.projects, filters],
  );
}

export function ProjectProgressTab({ model, filters }) {
  const rows = useProjectRows(model, filters);
  const monthCounts = countRows(rows, (row) => formatReportMonth(row.startDate?.slice(0, 7)));
  const statusData = statusSeries(rows, 'status');
  const departmentData = countRows(rows, 'department');

  const columns = [
    {
      key: 'projectId',
      label: 'Project No.',
      sortable: false,
      render: (row) => <ReferenceLink to={`/projects/all-projects/${row.projectId}`}>{row.projectId}</ReferenceLink>,
    },
    { key: 'projectName', label: 'Project name' },
    { key: 'customer', label: 'Customer' },
    { key: 'owner', label: 'Project owner' },
    { key: 'department', label: 'Department' },
    { key: 'startDate', label: 'Start date', render: (row) => formatReportDate(row.startDate) },
    { key: 'targetDate', label: 'Target date', render: (row) => formatReportDate(row.targetDate) },
    { key: 'actualCompletionDate', label: 'Actual completion', render: (row) => <MissingValue>{formatReportDate(row.actualCompletionDate, 'Not recorded')}</MissingValue> },
    { key: 'status', label: 'Project status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'currentStage', label: 'Current engineering stage' },
    {
      key: 'recordedProgress',
      label: 'Recorded progress',
      align: 'right',
      render: (row) => row.recordedProgress == null ? <MissingValue /> : `${row.recordedProgress}%`,
      exportValue: (row) => row.recordedProgress == null ? 'Not recorded' : `${row.recordedProgress}%`,
    },
    {
      key: 'relatedDesigns',
      label: 'Designs',
      render: (row) => list(row.relatedDesigns.map((item) => item.id), 'None'),
      exportValue: (row) => list(row.relatedDesigns.map((item) => item.id), 'None'),
    },
    {
      key: 'relatedBoms',
      label: 'BOMs',
      render: (row) => list(row.relatedBoms.map((item) => item.id), 'None'),
      exportValue: (row) => list(row.relatedBoms.map((item) => item.id), 'None'),
    },
    {
      key: 'relatedDrawings',
      label: 'Drawings',
      render: (row) => list(row.relatedDrawings.map((item) => item.drawingNumber), 'None'),
      exportValue: (row) => list(row.relatedDrawings.map((item) => item.drawingNumber), 'None'),
    },
    { key: 'approvalStatus', label: 'Approval status', render: (row) => <StatusCell status={row.approvalStatus} /> },
    { key: 'handoverStatus', label: 'Handover status', render: (row) => <StatusCell status={row.handoverStatus} /> },
    { key: 'delayStatus', label: 'Delay status', render: (row) => <StatusCell status={row.delayStatus} /> },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'Projects in scope', value: formatReportNumber(rows.length), sub: 'Current filtered records' },
          { label: 'Active', value: formatReportNumber(rows.filter((row) => !['Completed', 'Cancelled'].includes(row.status)).length), sub: 'Not Completed / Cancelled' },
          { label: 'Completed', value: formatReportNumber(rows.filter((row) => row.status === 'Completed').length), sub: 'Recorded status' },
          { label: 'Delayed', value: formatReportNumber(rows.filter((row) => row.delayStatus === 'Delayed').length), sub: 'Recorded delayed flag', tone: 'red' },
          { label: 'With handover', value: formatReportNumber(rows.filter((row) => row.handoverStatus !== 'No handover').length), sub: 'Any handover record' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Project status distribution" subtitle="Filtered project records by their stored status.">
          {statusData.length ? (
            <DonutChart data={statusData} centerValue={rows.length} centerLabel="Projects" formatValue={formatReportNumber} ariaLabel="Filtered project status" />
          ) : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Project starts by month" subtitle="Recorded project start dates only; no activity is inferred.">
          {monthCounts.length ? (
            <BarList data={monthCounts} formatValue={formatReportNumber} ariaLabel="Project starts by month" />
          ) : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Projects by department" subtitle="Engineering department stored on each project." wide>
          {departmentData.length ? (
            <BarList data={departmentData} formatValue={formatReportNumber} ariaLabel="Projects by department" />
          ) : <ReportEmpty />}
        </ReportCard>
      </div>

      <ReportTable
        title="Project progress report"
        subtitle="Source: Module 02 project records joined to design, BOM, drawing, approval and handover records."
        columns={columns}
        rows={rows}
        filename="module14-project-progress.csv"
        ariaLabel="Project progress report"
      />

      <DataNote>
        Current engineering stage is a read-only display of the latest available review stage, release or design state. Recorded progress is the value already stored on the project; it is not recalculated by this report. Actual completion dates are not present in the retained project records and are shown as Not recorded.
      </DataNote>
    </>
  );
}

export function DesignStatusTab({ model, filters }) {
  const rows = useMemo(
    () => applyReportFilters(model.designs, filters, {
      dateKey: 'created',
      statusKey: 'status',
      approvalKey: 'reviewStatus',
      revisionKey: 'revision',
      ownerKey: 'owner',
      releaseKey: 'releaseStatus',
      departmentKey: 'department',
    }),
    [model.designs, filters],
  );
  const statusData = statusSeries(rows, 'status');
  const projectData = countRows(rows, 'projectName');
  const departmentData = countRows(rows, 'department');
  const designIds = new Set(rows.map((row) => row.id));
  const revisions = model.designRevisions
    .filter((row) => designIds.has(row.designId))
    .filter((row) => !filters.search || row.searchText?.includes(filters.search.toLowerCase()) || `${row.designNumber} ${row.revision} ${row.owner}`.toLowerCase().includes(filters.search.toLowerCase()));

  const columns = [
    {
      key: 'id',
      label: 'Design No.',
      render: (row) => <ReferenceLink to={`/mechanical-design/design-register/${row.id}`}>{row.id}</ReferenceLink>,
    },
    { key: 'cadRef', label: 'CAD reference' },
    { key: 'designName', label: 'Design name' },
    { key: 'projectName', label: 'Project' },
    { key: 'itemLabel', label: 'Part / assembly', render: (row) => list([...(row.linkedPartIds || []), ...(row.linkedAssemblyIds || [])], 'Not recorded'), exportValue: (row) => list([...(row.linkedPartIds || []), ...(row.linkedAssemblyIds || [])], 'Not recorded') },
    { key: 'owner', label: 'Design owner' },
    { key: 'engineer', label: 'Design engineer' },
    { key: 'revision', label: 'Revision' },
    { key: 'status', label: 'Design status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'engineeringReviewStatus', label: 'Engineering review', render: (row) => <StatusCell status={row.engineeringReviewStatus} /> },
    { key: 'manufacturingReviewStatus', label: 'Manufacturing review', render: (row) => <StatusCell status={row.manufacturingReviewStatus} /> },
    { key: 'finalApprovalStatus', label: 'Final approval', render: (row) => <StatusCell status={row.finalApprovalStatus} /> },
    { key: 'releaseStatus', label: 'Release status', render: (row) => <StatusCell status={row.releaseStatus} /> },
    { key: 'bomIds', label: 'Related BOM', render: (row) => list(row.bomIds, 'None'), exportValue: (row) => list(row.bomIds, 'None') },
    { key: 'cadFiles', label: 'CAD files', render: (row) => formatReportNumber(row.cadFiles.length), exportValue: (row) => row.cadFiles.map((item) => item.id).join(', ') || 'None' },
    { key: 'drawings', label: 'Drawings', render: (row) => list(row.drawings.map((item) => `${item.drawingNumber} Rev ${item.revision}`), 'None'), exportValue: (row) => list(row.drawings.map((item) => `${item.drawingNumber} Rev ${item.revision}`), 'None') },
    { key: 'created', label: 'Created', render: (row) => formatReportDate(row.created) },
    { key: 'lastUpdated', label: 'Last updated', render: (row) => <MissingValue>{formatReportDate(row.lastUpdated, 'Not recorded')}</MissingValue> },
  ];

  const revisionColumns = [
    { key: 'designId', label: 'Design', render: (row) => <ReferenceLink to={`/mechanical-design/design-register/${row.designId}`}>{row.designNumber}</ReferenceLink> },
    { key: 'projectName', label: 'Project' },
    { key: 'revision', label: 'Revision' },
    { key: 'date', label: 'Revision date', render: (row) => formatReportDate(row.date) },
    { key: 'by', label: 'Issued by' },
    { key: 'note', label: 'Revision note' },
    { key: 'status', label: 'Recorded status', render: (row) => <StatusCell status={row.status} /> },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'Designs in scope', value: formatReportNumber(rows.length), sub: 'Filtered design records' },
          { label: 'Under review', value: formatReportNumber(rows.filter((row) => row.status === 'Under Review').length), sub: 'Design status Under Review', tone: 'purple' },
          { label: 'Approved / released', value: formatReportNumber(rows.filter((row) => ['Approved', 'Released'].includes(row.status)).length), sub: 'Design status' },
          { label: 'Requires revision', value: formatReportNumber(rows.filter((row) => ['Changes Requested', 'Revision Required', 'Rejected'].includes(row.status)).length), sub: 'Changes requested / revision required / rejected', tone: 'red' },
          { label: 'Controlled releases', value: formatReportNumber(rows.filter((row) => row.isReleased).length), sub: 'Release record or Released status' },
          { label: 'Pending review links', value: formatReportNumber(rows.filter((row) => row.reviewStatus === 'No review record').length), sub: 'No matching review record' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Designs by status" subtitle="Mechanical design statuses in the current filtered scope.">
          {statusData.length ? <DonutChart data={statusData} centerValue={rows.length} centerLabel="Designs" formatValue={formatReportNumber} ariaLabel="Designs by status" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Designs by project" subtitle="Actual design counts grouped by linked project.">
          {projectData.length ? <BarList data={projectData} formatValue={formatReportNumber} ariaLabel="Designs by project" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Designs by department" subtitle="Design domain recorded on the design record." wide>
          {departmentData.length ? <BarList data={departmentData} formatValue={formatReportNumber} ariaLabel="Designs by department" /> : <ReportEmpty />}
        </ReportCard>
      </div>

      <ReportTable
        title="Design status report"
        subtitle="Source: Module 05 mechanical designs joined to Module 09 BOM, Module 10 CAD/drawings and Module 11 reviews."
        columns={columns}
        rows={rows}
        filename="module14-design-status.csv"
        ariaLabel="Design status report"
      />

      <ReportTable
        title="Design revision history"
        subtitle="Actual revision entries stored on the filtered design records. A revision shown here is not automatically a release."
        columns={revisionColumns}
        rows={revisions}
        filename="module14-design-revision-history.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Design revision history"
      />

      <DataNote>
        Release status is “Released” only where a controlled release record exists or the source design record already has Released status. Approval and review states use the matching Module 11 review; no approval is inferred from a design status.
      </DataNote>
    </>
  );
}

export function CadDrawingTab({ model, filters }) {
  const cadRows = useMemo(
    () => applyReportFilters(model.cadFiles, filters, {
      dateKey: 'uploadedAt',
      statusKey: 'status',
      revisionKey: 'revision',
      ownerKey: 'uploadedBy',
      formatKey: 'fileType',
      departmentKey: 'department',
    }),
    [model.cadFiles, filters],
  );
  const drawingRows = useMemo(
    () => applyReportFilters(model.drawings, filters, {
      dateKey: 'drawingDate',
      statusKey: 'approvalStatus',
      revisionKey: 'revision',
      ownerKey: 'preparedBy',
      formatKey: 'format',
      releaseKey: 'releaseStatus',
      departmentKey: 'department',
    }),
    [model.drawings, filters],
  );

  const formatData = countRows(cadRows, 'fileType');
  const drawingStatus = statusSeries(drawingRows, 'approvalStatus');
  const cadRevision = countRows(cadRows, 'revision');
  const drawingRevision = countRows(drawingRows, 'revision');

  const cadColumns = [
    { key: 'id', label: 'CAD file', render: (row) => <ReferenceLink to={`/cad-management/repository?file=${row.id}`}>{row.id}</ReferenceLink> },
    { key: 'fileName', label: 'File name' },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'fileType', label: 'Format' },
    { key: 'classification', label: '2D / 3D classification', render: (row) => <StatusCell status={row.classification} /> },
    { key: 'category', label: 'Recorded category' },
    { key: 'revision', label: 'Revision' },
    { key: 'uploadedAt', label: 'Uploaded', render: (row) => formatReportDate(row.uploadedAt) },
    { key: 'uploadedBy', label: 'Uploaded by' },
    { key: 'status', label: 'File status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'linkStatus', label: 'Drawing link', render: (row) => row.linkedDrawings.length ? <StatusCell status="Linked to drawing" /> : <MissingValue>No drawing reference</MissingValue> },
  ];

  const drawingColumns = [
    { key: 'drawingNumber', label: 'Drawing number', render: (row) => <ReferenceLink to={`/cad-management/drawings/${row.id}`}>{row.drawingNumber}</ReferenceLink> },
    { key: 'title', label: 'Title' },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'drawingType', label: 'Drawing type' },
    { key: 'format', label: 'Format' },
    { key: 'revision', label: 'Revision' },
    { key: 'drawingDate', label: 'Drawing date', render: (row) => formatReportDate(row.drawingDate) },
    { key: 'approvalStatus', label: 'Approval status', render: (row) => <StatusCell status={row.approvalStatus} /> },
    { key: 'releaseStatus', label: 'Release status', render: (row) => <StatusCell status={row.releaseStatus} /> },
    { key: 'releasedAt', label: 'Released date', render: (row) => <MissingValue>{formatReportDate(row.releasedAt, 'Not recorded')}</MissingValue> },
    { key: 'cadLinkStatus', label: 'CAD links' },
    { key: 'bomRef', label: 'BOM reference', render: (row) => row.bomRef || <MissingValue /> },
    { key: 'preparedBy', label: 'Prepared by' },
    { key: 'reviewedBy', label: 'Reviewed by' },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'CAD files', value: formatReportNumber(cadRows.length), sub: 'Registered files in filtered scope' },
          { label: '2D classified', value: formatReportNumber(cadRows.filter((row) => row.classification === '2D drawing').length), sub: 'Recorded category, not drawing validation' },
          { label: '3D / model classified', value: formatReportNumber(cadRows.filter((row) => row.classification === '3D / model').length), sub: 'Recorded category, not CAD validity' },
          { label: 'Drawings', value: formatReportNumber(drawingRows.length), sub: 'Drawing register records' },
          { label: 'Released drawings', value: formatReportNumber(drawingRows.filter((row) => row.releaseStatus === 'Released').length), sub: 'Release status in drawing record' },
          { label: 'Drawings without CAD link', value: formatReportNumber(drawingRows.filter((row) => !row.linkedFiles.length).length), sub: 'No linked CAD file ID', tone: drawingRows.some((row) => !row.linkedFiles.length) ? 'red' : 'emerald' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="CAD file formats" subtitle="Actual recorded file formats. Classification reflects the source category, not a validity check.">
          {formatData.length ? <DonutChart data={formatData} centerValue={cadRows.length} centerLabel="CAD files" formatValue={formatReportNumber} ariaLabel="CAD file formats" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Drawing approval status" subtitle="Drawing register approval status in the current filtered view.">
          {drawingStatus.length ? <BarList data={drawingStatus} formatValue={formatReportNumber} ariaLabel="Drawing approval status" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="CAD revision summary" subtitle="Files by revision identifier. Revision presence does not imply release.">
          {cadRevision.length ? <BarList data={cadRevision} formatValue={formatReportNumber} ariaLabel="CAD revision summary" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Drawing revision summary" subtitle="Drawing records by revision identifier.">
          {drawingRevision.length ? <BarList data={drawingRevision} formatValue={formatReportNumber} ariaLabel="Drawing revision summary" /> : <ReportEmpty />}
        </ReportCard>
      </div>

      <ReportTable
        title="CAD file report"
        subtitle="Source: Module 10 CAD repository. File linking is resolved through actual drawing CAD-file references."
        columns={cadColumns}
        rows={cadRows}
        filename="module14-cad-files.csv"
        ariaLabel="CAD file report"
      />

      <ReportTable
        title="Drawing register report"
        subtitle="Source: Module 10 drawing register, including revision, approval and release states."
        columns={drawingColumns}
        rows={drawingRows}
        filename="module14-drawings.csv"
        ariaLabel="Drawing register report"
      />

      <DataNote>
        A file is classified from its recorded repository category. The application does not validate that every uploaded file is a usable CAD model. “No drawing reference” means no drawing record currently contains that CAD file ID; “No linked CAD file” means a drawing has no CAD file IDs.
      </DataNote>
    </>
  );
}

export function BomCostTab({ model, filters }) {
  const rows = useMemo(
    () => applyReportFilters(model.boms, filters, {
      dateKey: 'date',
      statusKey: 'status',
      revisionKey: 'revision',
      ownerKey: 'engineer',
      departmentKey: 'department',
    }),
    [model.boms, filters],
  );
  const bomIds = new Set(rows.map((row) => row.id));
  const itemRows = useMemo(
    () => applyReportFilters(model.bomItems, filters, {
      statusKey: 'bomStatus',
      revisionKey: 'bomRevision',
      departmentKey: 'department',
      dateKey: '',
    }).filter((row) => bomIds.has(row.bomId)),
    [model.bomItems, filters, rows],
  );
  const materialRows = model.bomMaterials.filter((row) => bomIds.has(row.bomId));
  const statusData = statusSeries(rows, 'status');
  const costData = countRows(rows.filter((row) => row.totalCost != null), (row) => `${row.projectId} · ${row.projectName}`)
    .map((item) => ({ ...item, value: rows.filter((row) => `${row.projectId} · ${row.projectName}` === item.label).reduce((sum, row) => sum + (row.totalCost || 0), 0) }))
    .sort((left, right) => right.value - left.value);
  const estimatedRows = rows.filter((row) => row.estimate);

  const columns = [
    { key: 'id', label: 'BOM number', render: (row) => <ReferenceLink to={`/bom-cost/bom/${row.id}`}>{row.id}</ReferenceLink> },
    { key: 'name', label: 'BOM name' },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'revision', label: 'BOM revision' },
    { key: 'bomType', label: 'BOM type' },
    { key: 'itemCount', label: 'Items', align: 'right' },
    { key: 'materialCount', label: 'Materials', align: 'right' },
    { key: 'materialCost', label: 'Material cost', align: 'right', render: (row) => <MissingValue>{formatReportCurrency(row.materialCost)}</MissingValue>, exportValue: (row) => formatReportCurrency(row.materialCost) },
    { key: 'manufacturingCost', label: 'Manufacturing cost', align: 'right', render: (row) => <MissingValue>{formatReportCurrency(row.manufacturingCost)}</MissingValue>, exportValue: (row) => formatReportCurrency(row.manufacturingCost) },
    { key: 'totalCost', label: 'Total cost', align: 'right', render: (row) => <MissingValue>{formatReportCurrency(row.totalCost)}</MissingValue>, exportValue: (row) => formatReportCurrency(row.totalCost) },
    { key: 'status', label: 'BOM status', render: (row) => <StatusCell status={row.status} /> },
    { key: 'revisionStatus', label: 'Revision status', render: (row) => <StatusCell status={row.revisionStatus} /> },
    { key: 'completeness', label: 'BOM completeness', render: (row) => row.completenessNotes.length ? <span className="report-warning-text">{row.completeness}</span> : row.completeness },
    { key: 'costStatus', label: 'Cost estimate', render: (row) => row.estimate ? <span>{row.estimate.id} · {formatReportDate(row.estimate.date)}</span> : <MissingValue>No cost estimate</MissingValue>, exportValue: (row) => row.estimate ? `${row.estimate.id} (${row.estimate.date})` : 'No cost estimate' },
  ];

  const itemColumns = [
    { key: 'bomId', label: 'BOM', render: (row) => <ReferenceLink to={`/bom-cost/bom/${row.bomId}`}>{row.bomId}</ReferenceLink> },
    { key: 'bomRevision', label: 'Revision' },
    { key: 'projectName', label: 'Project' },
    { key: 'designNumber', label: 'Design' },
    { key: 'itemNumber', label: 'Item no.' },
    { key: 'partNumber', label: 'Part number' },
    { key: 'name', label: 'Part / assembly' },
    { key: 'assemblyId', label: 'Assembly' },
    { key: 'material', label: 'Material' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'uom', label: 'UOM' },
    { key: 'unitCost', label: 'Unit cost', align: 'right', render: (row) => row.unitCost > 0 ? formatReportCurrency(row.unitCost) : <MissingValue>Not recorded</MissingValue>, exportValue: (row) => row.unitCost > 0 ? formatReportCurrency(row.unitCost) : 'Not recorded' },
    { key: 'materialCost', label: 'Item material cost', align: 'right', render: (row) => <MissingValue>{formatReportCurrency(row.materialCost)}</MissingValue>, exportValue: (row) => formatReportCurrency(row.materialCost) },
    { key: 'referenceDrawing', label: 'Reference drawing', render: (row) => row.referenceDrawing || <MissingValue /> },
  ];

  const materialColumns = [
    { key: 'bomId', label: 'BOM' },
    { key: 'bomRevision', label: 'BOM revision' },
    { key: 'projectName', label: 'Project' },
    { key: 'materialCode', label: 'Material' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'unit', label: 'UOM' },
    { key: 'rate', label: 'Recorded rate', align: 'right', render: (row) => row.rate == null ? <MissingValue>Not recorded</MissingValue> : formatReportCurrency(row.rate), exportValue: (row) => row.rate == null ? 'Not recorded' : formatReportCurrency(row.rate) },
    { key: 'amount', label: 'Calculated amount', align: 'right', render: (row) => row.amount == null ? <MissingValue>Not calculated</MissingValue> : formatReportCurrency(row.amount), exportValue: (row) => row.amount == null ? 'Not calculated' : formatReportCurrency(row.amount) },
    { key: 'partNumbers', label: 'Part references', render: (row) => row.partNumbers.join(', ') || <MissingValue /> },
  ];

  return (
    <>
      <ReportKpis
        items={[
          { label: 'BOM records', value: formatReportNumber(rows.length), sub: 'Filtered BOM records' },
          { label: 'Released BOMs', value: formatReportNumber(rows.filter((row) => row.status === 'Released').length), sub: 'Recorded BOM status' },
          { label: 'BOM items', value: formatReportNumber(itemRows.length), sub: 'Actual item rows in filtered BOMs' },
          { label: 'Structurally complete', value: formatReportNumber(rows.filter((row) => !row.completenessNotes.length).length), sub: 'Project, design, revision and item fields present' },
          { label: 'Estimated BOMs', value: formatReportNumber(estimatedRows.length), sub: 'Cost estimate record exists' },
          { label: 'Recorded cost total', value: formatReportCurrency(estimatedRows.reduce((sum, row) => sum + (row.totalCost || 0), 0)), sub: 'Only actual estimate totals' },
          { label: 'BOMs without cost', value: formatReportNumber(rows.length - estimatedRows.length), sub: 'Missing cost is not zero', tone: rows.length - estimatedRows.length ? 'red' : 'emerald' },
        ]}
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="BOM status distribution" subtitle="BOM statuses from Module 09.">
          {statusData.length ? <DonutChart data={statusData} centerValue={rows.length} centerLabel="BOMs" formatValue={formatReportNumber} ariaLabel="BOM status distribution" /> : <ReportEmpty />}
        </ReportCard>
        <ReportCard title="Recorded cost by project" subtitle="Sum of actual cost-estimate totals. Missing estimates are excluded, not treated as zero.">
          {costData.length ? <BarList data={costData} formatValue={formatReportCurrency} ariaLabel="Recorded cost by project" /> : <ReportEmpty title="No recorded cost estimates" message="No BOM in the current filters has a recorded total cost." />}
        </ReportCard>
        <ReportCard title="Cost estimate records" subtitle="Actual estimate status for the filtered BOMs." wide>
          {estimatedRows.length ? (
            <div className="report-mini-table-list">
              {estimatedRows.map((row) => (
                <div key={row.id}>
                  <strong>{row.id}</strong>
                  <span>{row.estimate?.id || 'Estimate'} · {row.costStatus}</span>
                  <b>{formatReportCurrency(row.totalCost)}</b>
                </div>
              ))}
            </div>
          ) : <ReportEmpty title="No cost estimates" message="No matching BOM has a cost estimate." />}
        </ReportCard>
      </div>

      <ReportTable
        title="BOM and cost summary"
        subtitle="Source: Module 09 BOM records and their recorded cost estimates. Costs are not recalculated from missing item prices."
        columns={columns}
        rows={rows}
        filename="module14-bom-cost-summary.csv"
        ariaLabel="BOM and cost summary"
      />

      <ReportTable
        title="BOM item detail"
        subtitle="Part, assembly, material, quantity and unit cost actually recorded on BOM lines."
        columns={itemColumns}
        rows={itemRows}
        filename="module14-bom-items.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="BOM item detail"
      />

      <div className="insight-analytics-grid report-analytics-grid">
        <ReportCard title="Cost comparison between revisions" subtitle="Only BOMs with more than one recorded estimate can be compared." wide>
          {rows.some((row) => row.estimates.length > 1) ? (
            <ReportEmpty title="Revision comparison available below the BOM estimate limit" message="No comparison algorithm is used beyond recorded estimate totals." />
          ) : (
            <ReportEmpty
              title="No multi-revision cost comparison available"
              message="Each retained BOM has zero or one cost estimate record. A meaningful revision-to-revision cost comparison cannot be produced from unavailable estimates."
            />
          )}
        </ReportCard>
      </div>

      <ReportTable
        title="Material-wise summary"
        subtitle="Aggregated BOM material lines. Rates and amounts remain blank where the source rate is missing."
        columns={materialColumns}
        rows={materialRows}
        filename="module14-bom-materials.csv"
        getRowId={(row) => row.rowKey}
        ariaLabel="Material-wise BOM summary"
      />

      <DataNote>
        Unit costs of zero are shown as Not recorded because the source record uses zero as an unpopulated value. Total BOM costs come only from actual estimate totalCost fields. The report never multiplies missing quantities or prices to manufacture a cost.
      </DataNote>
    </>
  );
}
