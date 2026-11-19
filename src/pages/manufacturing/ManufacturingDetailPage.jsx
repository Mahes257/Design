import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  History,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  Modal,
  PageLayout,
  StatusBadge,
  ViewPageBanner,
  Textarea,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useManufacturing } from '../../context/ManufacturingContext';
import { ConvertRecordButton, WorkflowLinks } from '../../context/WorkflowConversionContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useAnalysis } from '../../context/AnalysisContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useProjects } from '../../context/ProjectsContext';
import { useSimulation } from '../../context/SimulationContext';
import { formatDate } from '../../data/projectData';
import {
  RECORD_KINDS,
  fieldsForCategory,
  isEditable,
  packageReadiness,
  statusTone,
} from '../../data/manufacturingData';
import {
  AttachmentList,
  Fact,
  ReviewHistoryList,
  StatusHistoryList,
  Toast,
  useToast,
} from './manufacturingUi';
import InspectionItemsTable from './InspectionItemsTable';
import { itemsFromRecord } from './inspectionItems';

const KIND_META = {
  definition: { icon: Factory, title: 'Manufacturing Definition' },
  inspection: { icon: ClipboardCheck, title: 'Inspection & Quality Requirements' },
  process: { icon: ClipboardList, title: 'Process Planning & Instructions' },
};

function MiniTable({ columns, rows, empty, tableId }) {
  const visibility = useTableColumnVisibility(
    tableId || `manufacturing.mini::${columns.map((column) => column.key).join('-')}`,
    columns,
  );
  if (!rows || rows.length === 0) {
    return <p className="dash-modal-note">{empty}</p>;
  }
  return (
    <>
      <ManageColumns {...visibility.managerProps} />
      <div className="table-wrap">
        <table className="data-table mfg-mini-table">
          <thead>
            <tr>
              {columns
                .filter((column) => visibility.isVisible(column.key))
                .map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || row.opNo || row.name || index}>
                {columns
                  .filter((column) => visibility.isVisible(column.key))
                  .map((column) => (
                    <td key={column.key}>{row[column.key] || '—'}</td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ManufacturingDetailPage() {
  const { kind, recordId } = useParams();
  const technicalColumns = useTableColumnVisibility(
    'manufacturing.definition/:recordId#technical',
    [
      { key: 'field', label: 'Category Field' },
      { key: 'requirement', label: 'Recorded Requirement' },
    ],
  );
  const navigate = useNavigate();
  const {
    recordsFor,
    submitRecord,
    approveRecord,
    requestRevisionRecord,
    releaseRecord,
    createRevision,
  } = useManufacturing();
  const { designs, parts, assemblies } = useMechanical();
  const { analyses } = useAnalysis();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { reports: simulationReports, observations: simulationObservations } = useSimulation();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const [confirm, setConfirm] = useState(null);
  const [revisionComments, setRevisionComments] = useState('');

  const meta = KIND_META[kind] || KIND_META.definition;
  const registerPath = `/manufacturing-design/${RECORD_KINDS[kind]?.base || 'definition'}`;
  const record = recordsFor(kind).find((row) => row.id === recordId);

  if (!record) return <Navigate to={registerPath} replace />;

  const project = projects.find((row) => row.id === record.projectId);
  const part = parts.find((row) => row.id === record.partId);
  const assembly = assemblies.find((row) => row.id === record.assemblyId);
  const design = designs.find((row) => row.id === record.designId);
  const analysis = analyses.find((row) => row.id === record.analysisId);
  const linkedBom = boms.find((row) => row.id === record.linkedBomId);
  const linkedDrawing = drawings.find((row) => row.id === record.linkedDrawingId);
  const editable = isEditable(record);
  const canApprove = record.status === 'Under Review';
  const packageState =
    kind === 'process'
      ? packageReadiness(record, recordsFor('definition'), recordsFor('inspection'))
      : { ready: true, issues: [] };
  const canRelease = record.status === 'Approved' && packageState.ready;
  const canRevise = ['Approved', 'Released', 'Superseded'].includes(record.status);

  const downstreamLink = (target) => {
    const params = new URLSearchParams({
      projectId: record.projectId,
      partId: record.partId,
      linkedDefinitionId: record.id,
    });
    if (record.assemblyId) params.set('assemblyId', record.assemblyId);
    if (record.linkedInspectionId) params.set('linkedInspectionId', record.linkedInspectionId);
    return `/manufacturing-design/${target}/new?${params.toString()}`;
  };

  const handleConfirm = () => {
    if (confirm === 'submit') {
      const result = submitRecord(kind, record.id, record.engineer);
      showToast(result.error || `${record.id} submitted for review.`, result.error ? 'error' : 'success');
    }
    if (confirm === 'approve') {
      const result = approveRecord(kind, record.id, 'N. Joshi');
      showToast(result.error || `${record.id} approved.`, result.error ? 'error' : 'success');
    }
    if (confirm === 'revision-required') {
      const result = requestRevisionRecord(kind, record.id, 'N. Joshi', revisionComments);
      showToast(
        result.error || `${record.id} returned for revision.`,
        result.error ? 'error' : 'success',
      );
      if (!result.error) setRevisionComments('');
    }
    if (confirm === 'release') {
      const result = releaseRecord(kind, record.id, 'Design Admin');
      showToast(result.error || `${record.id} released to production.`, result.error ? 'error' : 'success');
    }
    if (confirm === 'revision') {
      const result = createRevision(kind, record.id, record.engineer);
      showToast(result.error || `${record.id} moved to Rev ${result.revision} as a draft.`, result.error ? 'error' : 'success');
    }
    setConfirm(null);
  };

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={meta.icon}
        eyebrow={record.id}
        title={record.name}
        subtitle={`${meta.title} · Rev ${record.revision} · ${project?.name || record.projectId} · ${record.partNumber}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Manufacturing Design', to: '/manufacturing-design' },
              { label: meta.title, to: registerPath },
              { label: record.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge status={record.status} tone={statusTone(record.status)} />
            <span className="chip">{kind}</span>
            <span className="chip">Rev {record.revision}</span>
          </>
        }
        meta={[
          ['Record Name', record.name],
          ['Project', record.projectId],
          ['Part', record.partNumber],
          ['Responsible Engineer', record.engineer],
          ['Technical Reviewer', record.reviewer],
          ['Due Date', record.dueDate],
        ]}
        actions={
          <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(registerPath)}>
                Back to Register
              </Button>
              {editable && (
                <Button icon={Pencil} onClick={() => navigate(`${registerPath}/${record.id}/edit`)}>
                  Edit
                </Button>
              )}
              {kind === 'definition' && ['Approved', 'Released'].includes(record.status) && (
                <>
                  <Button
                    variant="secondary"
                    icon={ClipboardCheck}
                    onClick={() => navigate(downstreamLink('inspection'))}
                  >
                    New Inspection Requirement
                  </Button>
                  <Button
                    variant="secondary"
                    icon={ClipboardList}
                    onClick={() => navigate(downstreamLink('process'))}
                  >
                    New Process Plan
                  </Button>
                </>
              )}
              <ConvertRecordButton type="manufacturing" record={record} size="sm" />
              {editable && (
                <Button icon={Send} onClick={() => setConfirm('submit')}>
                  Submit for Review
                </Button>
              )}
              {canApprove && (
                <>
                  <Button icon={CheckCircle2} onClick={() => setConfirm('approve')}>
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    icon={RotateCcw}
                    onClick={() => setConfirm('revision-required')}
                  >
                    Request Revision
                  </Button>
                </>
              )}
              {canRelease && (
                <Button icon={ShieldCheck} onClick={() => setConfirm('release')}>
                  Release
                </Button>
              )}
              {canRevise && (
                <Button icon={Plus} onClick={() => setConfirm('revision')}>
                  New Revision
                </Button>
              )}
          </>
        }
      />
      <div className="mech-detail-stack">
        <Card title="General Information" icon={FileText}>
          <div className="fact-grid">
            <Fact label="Reference ID">{record.id}</Fact>
            <Fact label={kind === 'definition' ? 'Category' : kind === 'inspection' ? 'Inspection Type' : 'Process Type'}>
              {kind === 'definition' ? record.category : kind === 'inspection' ? record.inspectionType : record.processType}
            </Fact>
            <Fact label="Revision">Rev {record.revision}</Fact>
            <Fact label="Status">{record.status}</Fact>
            <Fact label="Responsible Engineer">{record.engineer}</Fact>
            <Fact label="Technical Reviewer">{record.reviewer}</Fact>
            <Fact label="Record Date">{formatDate(record.recordDate)}</Fact>
            <Fact label="Due Date">{formatDate(record.dueDate)}</Fact>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Description</h3>
              <p>{record.description || 'No description recorded.'}</p>
            </section>
            <section>
              <h3>Ownership</h3>
              <p>
                This record owns manufacturing requirements and instructions only. Parts, drawings and
                revisions stay with Mechanical Engineering Design and Drawing &amp; CAD Management.
              </p>
            </section>
          </div>
        </Card>

        <Card title="Project &amp; Part References" icon={Link2}>
          <div className="fact-grid">
            <Fact label="Project">{project ? `${project.id} · ${project.name}` : record.projectId}</Fact>
            <Fact label="Customer">{project?.customer}</Fact>
            <Fact label="Mechanical Design (Module 05)">
              {design ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate(`/mechanical-design/design-register/${design.id}`)}
                >
                  {design.id} · Rev {design.revision}
                </button>
              ) : (
                'Not linked'
              )}
            </Fact>
            <Fact label="Part Number">{part ? `${part.partNumber} · ${part.name}` : record.partNumber}</Fact>
            <Fact label="Assembly">{assembly ? `${assembly.number} · ${assembly.name}` : 'Not linked'}</Fact>
            <Fact label="Material Specification">{record.material || part?.material}</Fact>
            <Fact label="Manufacturing Method">{record.manufacturingMethod || 'Not recorded'}</Fact>
            <Fact label="Design Revision">Rev {record.drawingRevision}</Fact>
            <Fact label="Drawing Number">
              {linkedDrawing ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate('/cad-management/drawings')}
                >
                  {linkedDrawing.drawingNumber} · Rev {linkedDrawing.revision}
                </button>
              ) : (
                record.drawingNo || 'Not linked'
              )}
            </Fact>
            <Fact label="BOM Reference (Module 09)">
              {linkedBom ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate(`/bom-cost/bom/${linkedBom.id}`)}
                >
                  {linkedBom.id} · Rev {linkedBom.revision}
                </button>
              ) : (
                'Not linked'
              )}
            </Fact>
            {kind === 'definition' && (
              <Fact label="Verified Analysis">
                {analysis ? (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => navigate(`/analysis/${analysis.id}`)}
                  >
                    {analysis.id} · {analysis.category}
                  </button>
                ) : (
                  'Not linked'
                )}
              </Fact>
            )}
          </div>
          {record.linkedDefinitionId && (
            <p className="anl-inline-hint">
              Linked manufacturing definition:{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => navigate(`/manufacturing-design/definition/${record.linkedDefinitionId}`)}
              >
                {record.linkedDefinitionId}
              </button>
            </p>
          )}
          {record.linkedInspectionId && (
            <p className="anl-inline-hint">
              Linked inspection requirement:{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => navigate(`/manufacturing-design/inspection/${record.linkedInspectionId}`)}
              >
                {record.linkedInspectionId}
              </button>
            </p>
          )}
        </Card>

        <Card title="Validation Reports &amp; Observations" icon={ShieldCheck}>
          {(() => {
            const related = simulationReports.filter((row) => row.projectId === record.projectId);
            const openObservations = simulationObservations.filter(
              (row) => row.projectId === record.projectId && !['Resolved', 'Accepted as-is'].includes(row.status),
            );
            if (related.length === 0) {
              return (
                <p className="dash-modal-note">
                  No Module 06 validation reports reference this project yet. This module does not
                  create or calculate simulation results.
                </p>
              );
            }
            return (
              <>
                <ul className="sim-ref-list">
                  {related.map((row) => {
                    const unresolved = (row.issues || []).filter(
                      (issue) => !['Resolved', 'Accepted'].includes(issue.status),
                    ).length;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => navigate(`/engineering-analysis/reports/${row.id}`)}
                        >
                          {row.id} · {row.title}
                        </button>
                        <StatusBadge status={row.status} />
                        <span className="cell-muted">
                          Rev {row.revision} · {unresolved} unresolved issue{unresolved === 1 ? '' : 's'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="anl-inline-hint">
                  {openObservations.length} open inspection observation
                  {openObservations.length === 1 ? '' : 's'} recorded in the simulation workspace for
                  this project. Evidence is referenced, never recalculated here.
                </p>
              </>
            );
          })()}
        </Card>

        {kind === 'definition' && (
          <Card title="Manufacturing Requirements" icon={Factory}>
            <div className="mech-detail-sections">
              <section>
                <h3>Manufacturing Notes</h3>
                <p>{record.manufacturingNotes || record.description || 'No manufacturing notes recorded.'}</p>
              </section>
              <section>
                <h3>Critical Features</h3>
                <p>{record.criticalFeatures || 'No critical features recorded.'}</p>
              </section>
              <section>
                <h3>Required Manufacturing Capabilities</h3>
                <p>{record.requiredCapabilities || 'No capability requirements recorded.'}</p>
              </section>
              <section>
                <h3>Special Processes</h3>
                <p>{record.specialProcesses || 'No special processes recorded.'}</p>
              </section>
              <section>
                <h3>Required Equipment / Tooling References</h3>
                <p>{record.equipmentToolingRefs || 'No equipment or tooling references recorded.'}</p>
              </section>
            </div>
          </Card>
        )}

        {kind === 'definition' && (
          <Card title="Technical Details" icon={Factory}>
            <ManageColumns {...technicalColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mfg-mini-table">
                <thead>
                  <tr>
                    {technicalColumns.isVisible('field') && <th scope="col">Category Field</th>}
                    {technicalColumns.isVisible('requirement') && <th scope="col">Recorded Requirement</th>}
                  </tr>
                </thead>
                <tbody>
                  {fieldsForCategory(record.category).map((field) => (
                    <tr key={field.key}>
                      {technicalColumns.isVisible('field') && <td>{field.label}</td>}
                      {technicalColumns.isVisible('requirement') && (
                        <td className="cell-muted">{record.technical?.[field.key] || '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {kind === 'inspection' && (
          <>
            <Card title="A. Inspection Requirements" icon={ClipboardCheck}>
              <div className="fact-grid">
                <Fact label="Inspection Type">{record.inspectionType}</Fact>
                <Fact label="Applicable Part">
                  {part ? `${part.partNumber} · ${part.name}` : record.partNumber}
                </Fact>
                <Fact label="Drawing Reference">{record.drawingNo}</Fact>
                <Fact label="Drawing Revision">{record.drawingRevision}</Fact>
              </div>
              <p className="anl-field-note">{record.description || 'No inspection description recorded.'}</p>
              <div className="mech-detail-sections">
                <section>
                  <h3>Requirement Notes</h3>
                  <p>{record.requirementNotes || 'No requirement notes recorded.'}</p>
                </section>
              </div>
            </Card>

            <Card title="B. Inspection Points & Critical Characteristics" icon={ClipboardList}>
              <InspectionItemsTable items={itemsFromRecord(record)} readOnly />
            </Card>

            <Card title="C. Inspection Plan History" icon={History}>
              <MiniTable
                columns={[
                  { key: 'revision', label: 'Revision' },
                  { key: 'by', label: 'Updated By' },
                  { key: 'date', label: 'Updated Date' },
                  { key: 'note', label: 'Change Description' },
                  { key: 'status', label: 'Status' },
                ]}
                rows={(record.planHistory || []).map((entry) => ({ ...entry, revision: `Rev ${entry.revision}` }))}
                tableId="manufacturing.inspection#plan-history"
                empty="No plan history recorded."
              />
            </Card>
          </>
        )}

        {kind === 'process' && (
          <>
            <Card title="A. Manufacturing Sequence" icon={ClipboardList}>
              <MiniTable
                columns={[
                  { key: 'sequence', label: 'Seq.' },
                  { key: 'opNo', label: 'Op No.' },
                  { key: 'name', label: 'Operation Name' },
                  { key: 'description', label: 'Operation Description' },
                  { key: 'workstation', label: 'Work Center / Equipment' },
                  { key: 'tooling', label: 'Tooling' },
                  { key: 'setup', label: 'Setup Instructions' },
                  { key: 'parameters', label: 'Process Parameters' },
                  { key: 'safetyQuality', label: 'Safety / Quality Notes' },
                  { key: 'inspectionCheckpoint', label: 'Inspection Checkpoint' },
                  { key: 'duration', label: 'Est. Time' },
                ]}
                rows={record.sequence}
                tableId="manufacturing.process#sequence"
                empty="No operations defined."
              />
            </Card>

            <Card title="B. Process Instructions" icon={FileText}>
              <MiniTable
                columns={[
                  { key: 'id', label: 'Instruction ID' },
                  { key: 'operation', label: 'Operation' },
                  { key: 'details', label: 'Detailed Instructions' },
                  { key: 'requirements', label: 'Technical Requirements' },
                  { key: 'refs', label: 'Reference Documents' },
                ]}
                rows={record.instructions}
                tableId="manufacturing.process#instructions"
                empty="No process instructions recorded."
              />
            </Card>

            <Card title="C. Equipment Requirements" icon={Factory}>
              <MiniTable
                columns={[
                  { key: 'name', label: 'Equipment' },
                  { key: 'type', label: 'Type' },
                  { key: 'specification', label: 'Specification' },
                  { key: 'capacity', label: 'Capacity' },
                  { key: 'special', label: 'Special Requirements' },
                ]}
                rows={record.equipment}
                tableId="manufacturing.process#equipment"
                empty="No equipment requirements recorded."
              />
            </Card>

            <Card title="D. Special Instructions" icon={ShieldCheck}>
              <div className="fact-grid">
                <Fact label="Safety Instructions">{record.special?.safety}</Fact>
                <Fact label="Special Manufacturing Notes">{record.special?.notes}</Fact>
                <Fact label="Handling Requirements">{record.special?.handling}</Fact>
                <Fact label="Technical Restrictions">{record.special?.restrictions}</Fact>
              </div>
            </Card>

            <Card title="E. Technical Notes" icon={FileText}>
              <div className="fact-grid">
                <Fact label="Operation / Quality Notes">{record.operationNotes || 'Not recorded'}</Fact>
              </div>
              <div className="fact-grid">
                <Fact label="Technical Description">{record.notes?.description}</Fact>
                <Fact label="Engineering Reference">{record.notes?.engineeringRef}</Fact>
                <Fact label="Drawing Reference">{record.notes?.drawingRef}</Fact>
                <Fact label="Additional Notes">{record.notes?.additional}</Fact>
              </div>
            </Card>

            <Card
              title="F. Manufacturing Package Release"
              icon={Send}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ShieldCheck}
                  onClick={() => navigate('/engineering-release/release')}
                >
                  Engineering Release
                </Button>
              }
            >
              <div className="fact-grid">
                <Fact label="Package ID">{record.release?.packageId}</Fact>
                <Fact label="Project">{record.projectId}</Fact>
                <Fact label="Part / Assembly">
                  {part?.partNumber || record.partNumber} · {assembly?.number || 'No assembly'}
                </Fact>
                <Fact label="Drawing Revision">{record.drawingRevision}</Fact>
                <Fact label="Process Plan Revision">Rev {record.release?.processRevision || record.revision}</Fact>
                <Fact label="Inspection Plan Reference">{record.release?.inspectionRef}</Fact>
                <Fact label="Package Readiness">{packageState.ready ? 'Ready' : 'Blocked'}</Fact>
                <Fact label="Release Status">{record.release?.releaseStatus}</Fact>
                <Fact label="Release Date">
                  {record.release?.releaseDate ? formatDate(record.release.releaseDate) : 'Not released'}
                </Fact>
              </div>
              {!packageState.ready && (
                <p className="anl-field-note">
                  Release is blocked until the package is complete: {packageState.issues.join(' ')}
                </p>
              )}
            </Card>
          </>
        )}

        <Card title="Attachments" icon={FileText}>
          <AttachmentList files={record.attachments || []} />
        </Card>

        <Card
          title="Review History"
          icon={CheckCircle2}
          actions={
            <Button
              variant="ghost"
              size="sm"
              icon={ClipboardCheck}
              onClick={() => navigate('/design-review/manufacturing')}
            >
              Manufacturing Review
            </Button>
          }
        >
          <ReviewHistoryList reviews={record.reviews || []} />
          <p className="anl-field-note">
            Module 08 review decisions stay with this manufacturing document. Package-level engineering
            and manufacturing review is controlled in Design Review &amp; Approval.
          </p>
        </Card>

        <Card title="Status History" icon={History}>
          <StatusHistoryList history={record.statusHistory || []} />
        </Card>

        <Card title="Created / Updated" icon={Users}>
          <div className="fact-grid">
            <Fact label="Created By">{record.createdBy || record.engineer}</Fact>
            <Fact label="Created At">{formatDate(record.createdAt)}</Fact>
            <Fact label="Updated By">{record.updatedBy || record.engineer}</Fact>
            <Fact label="Updated At">{formatDate(record.updatedAt)}</Fact>
          </div>
          <p className="anl-field-note">
            Approved and released records are read-only. Use New Revision to raise a controlled change; the
            previous revision stays in the history.
          </p>
        </Card>

        <p className="mech-footnote">
          This view is manufacturing documentation. It does not certify production, record measured results or
          authorize design release.
        </p>
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'approve'
            ? 'Approve Record'
            : confirm === 'revision-required'
              ? 'Return for Revision'
              : confirm === 'release'
                ? 'Release Manufacturing Record'
                : confirm === 'revision'
                  ? 'Raise New Revision'
                  : 'Submit for Review'
        }
        subtitle={`${record.id} · Rev ${record.revision}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button icon={CheckCircle2} onClick={handleConfirm}>
              Continue
            </Button>
          </>
        }
      >
        {confirm === 'revision-required' && (
          <div className="form-field">
            <label className="form-label" htmlFor="mfg-revision-comments">
              Revision Required
            </label>
            <Textarea
              id="mfg-revision-comments"
              rows={3}
              placeholder="State what must be corrected before resubmission"
              value={revisionComments}
              onChange={(event) => setRevisionComments(event.target.value)}
            />
          </div>
        )}
        <p className="dash-modal-note">
          {confirm === 'approve'
            ? 'Approval records a review decision. It does not release the record or authorize production.'
            : confirm === 'revision-required'
              ? 'The record moves to Revision Required. It cannot be approved until it is corrected and resubmitted.'
              : confirm === 'release'
                ? 'Release marks the manufacturing package as released to production. Design release authorization remains with Design Review & Approval.'
                : confirm === 'revision'
                  ? 'A new revision is created from the current content and set back to Draft. Earlier revisions remain in the history.'
                  : 'Submission moves the record to Under Review. It is not an approval.'}
        </p>
      </Modal>

      <WorkflowLinks type="manufacturing" recordId={record.id} />
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
