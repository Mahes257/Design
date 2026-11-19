import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  Input,
  PageHeader,
  PageLayout,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import Modal from '../../components/common/Modal';
import { DASHBOARD, MODULES } from '../../config/navigation';
import { APP_USER } from '../../constants/brand';
import { TODAY, formatHandoverDate } from '../../data/designHandoverData';
import { finalApprovalRecord, openEngineeringChanges } from '../../data/designHandoverData';
import { buildReviewPrefill, handoverConversionEligibility } from '../../data/designHandoverConversion';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { useProjects } from '../../context/ProjectsContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useApprovals } from '../../context/ApprovalsContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import '../../styles/design-handover.css';

function initialForm() {
  return {
    projectId: '',
    designId: '',
    designRevision: '',
    itemType: 'Assembly',
    itemId: '',
    bomId: '',
    bomRevision: '',
    drawingIds: [],
    manufacturingId: '',
    inspectionId: '',
    processPlanId: '',
    engineeringReviewId: '',
    manufacturingReviewId: '',
    finalApprovalId: '',
    owner: APP_USER.name,
    targetDate: TODAY,
    notes: '',
    sourceReviewId: '',
    sourceReleaseId: '',
    sourceReviewPath: '',
    sourceRefs: null,
  };
}

function SourceReferenceValue({ label, value }) {
  return (
    <div className="dh-source-fact">
      <span>{label}</span>
      <strong>{value || 'Not Available'}</strong>
    </div>
  );
}

function ReviewStatus({ label, value }) {
  const unavailable = ['Not Available', 'Not Released'].includes(value);
  return (
    <div className="dh-review-status">
      <span>{label}</span>
      <StatusBadge status={value || 'Not Available'} tone={unavailable ? 'gray' : undefined} />
    </div>
  );
}

export default function NewHandoverPage() {
  const { handoverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);
  const module = MODULES.find((row) => row.key === 'design-handover');
  const { handovers, findHandoverForRevision, saveHandover } = useDesignHandover();
  const { projects } = useProjects();
  const { designs, parts, assemblies } = useMechanical();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { definitions, inspections, processPlans } = useManufacturing();
  const { reviews } = useApprovals();
  const { changes } = useEngineeringRelease();
  const record = handoverId ? handovers.find((row) => row.id === handoverId) : null;
  const query = new URLSearchParams(location.search);
  const sourceReviewId = record
    ? ''
    : query.get('fromReview') || location.state?.sourceReviewId || '';
  const sourceReview = sourceReviewId ? reviews.find((row) => row.id === sourceReviewId) : null;
  const sourceProject = projects.find((row) => row.id === sourceReview?.projectId);
  const sourceDesign = designs.find((row) => row.id === sourceReview?.designId);

  const prefill = useMemo(
    () => (sourceReview
      ? buildReviewPrefill({
          review: sourceReview,
          project: sourceProject,
          design: sourceDesign,
          parts,
          assemblies,
          boms,
          drawings,
          definitions,
          inspections,
          processPlans,
        })
      : null),
    [sourceReview, sourceProject, sourceDesign, parts, assemblies, boms, drawings, definitions, inspections, processPlans],
  );

  const [form, setForm] = useState(() => {
    if (record) return { ...initialForm(), ...record };
    if (prefill) return { ...initialForm(), ...prefill.form, owner: APP_USER.name };
    return initialForm();
  });
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const projectDesigns = useMemo(() => designs.filter((design) => design.projectId === form.projectId), [designs, form.projectId]);
  const projectParts = useMemo(() => parts.filter((part) => part.projectId === form.projectId), [parts, form.projectId]);
  const projectAssemblies = useMemo(() => assemblies.filter((assembly) => assembly.projectId === form.projectId), [assemblies, form.projectId]);
  const projectBoms = useMemo(() => boms.filter((bom) => bom.projectId === form.projectId), [boms, form.projectId]);
  const projectDrawings = useMemo(() => drawings.filter((drawing) => drawing.projectId === form.projectId), [drawings, form.projectId]);
  const projectDefinitions = useMemo(() => definitions.filter((row) => row.projectId === form.projectId), [definitions, form.projectId]);
  const projectInspections = useMemo(() => inspections.filter((row) => row.projectId === form.projectId), [inspections, form.projectId]);
  const projectPlans = useMemo(() => processPlans.filter((row) => row.projectId === form.projectId), [processPlans, form.projectId]);
  const projectReviews = useMemo(() => reviews.filter((row) => row.projectId === form.projectId), [reviews, form.projectId]);
  const finalReviewOptions = useMemo(
    () => projectReviews.filter((review) => finalApprovalRecord(review)),
    [projectReviews],
  );
  const openChanges = useMemo(
    () => openEngineeringChanges(changes, form.projectId),
    [changes, form.projectId],
  );

  const duplicateHandover = sourceReview
    ? findHandoverForRevision({
        projectId: sourceReview.projectId,
        designId: sourceReview.designId,
        designRevision: sourceReview.designRevision,
      })
    : null;
  const conversion = sourceReview
    ? handoverConversionEligibility({
        review: sourceReview,
        design: sourceDesign,
        project: sourceProject,
        changes,
      })
    : null;

  const crumbs = [
    { label: 'Dashboard', to: DASHBOARD.path },
    { label: module?.label || 'Design Release & Production Handover', to: '/design-handover' },
    { label: record ? `Edit ${record.id}` : 'Create Handover' },
  ];

  if (!module) return <Navigate to={DASHBOARD.path} replace />;
  if (handoverId && !record) return <Navigate to="/design-handover" replace />;
  if (record && !['Draft', 'Validation Failed', 'Ready for Release'].includes(record.status)) {
    return <Navigate to={`/design-handover/${record.id}`} replace />;
  }
  if (!record && sourceReview && duplicateHandover && !saving) {
    return (
      <Navigate
        to={`/design-handover/${duplicateHandover.id}`}
        replace
        state={{
          notice: `${duplicateHandover.id} already exists for ${sourceReview.designId} Rev ${sourceReview.designRevision}. No new handover was opened.`,
        }}
      />
    );
  }
  if (!record && sourceReview && conversion && !conversion.eligible) {
    return (
      <Navigate
        to={`/design-review/review/${sourceReview.id}`}
        replace
        state={{ notice: `Production handover is unavailable: ${conversion.reasons.join(' ')}` }}
      />
    );
  }

  const update = (patch) => setForm((previous) => ({ ...previous, ...patch }));

  const handleProject = (projectId) => {
    if (prefill) return;
    update({
      projectId,
      designId: '',
      designRevision: '',
      itemType: 'Assembly',
      itemId: '',
      bomId: '',
      bomRevision: '',
      drawingIds: [],
      manufacturingId: '',
      inspectionId: '',
      processPlanId: '',
      engineeringReviewId: '',
      manufacturingReviewId: '',
      finalApprovalId: '',
    });
  };

  const handleDesign = (designId) => {
    if (prefill) return;
    const design = designs.find((row) => row.id === designId);
    const assembly = projectAssemblies.find((row) => row.id === design?.assemblyId) || projectAssemblies[0];
    update({
      designId,
      designRevision: design?.revision || '',
      itemType: assembly ? 'Assembly' : 'Part',
      itemId: assembly?.id || projectParts[0]?.id || '',
    });
  };

  const handleBom = (bomId) => {
    const bom = projectBoms.find((row) => row.id === bomId);
    update({ bomId, bomRevision: bom?.revision || '' });
  };

  const toggleDrawing = (drawingId) => {
    update({
      drawingIds: form.drawingIds.includes(drawingId)
        ? form.drawingIds.filter((id) => id !== drawingId)
        : [...form.drawingIds, drawingId],
    });
  };

  const cancelTarget = record
    ? `/design-handover/${record.id}`
    : location.state?.returnTo || (sourceReview ? `/design-review/review/${sourceReview.id}` : '/design-handover');

  const persist = (intent) => {
    setError('');
    setSaving(true);
    const result = saveHandover({ ...form, id: record?.id });
    if (result.error) {
      setSaving(false);
      setConfirmOpen(false);
      setError(result.error);
      return;
    }
    navigate(`/design-handover/${result.id}`, {
      replace: true,
      state: {
        handoverSaved: result.id,
        saveIntent: intent,
        sourceReviewId: form.sourceReviewId || '',
      },
    });
  };

  const handleDraft = () => {
    if (!formRef.current?.reportValidity()) return;
    persist('draft');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setConfirmOpen(true);
  };

  const requireUserFields = !form.owner || !form.targetDate;

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={module.icon}
          title={record ? `Edit ${record.id}` : 'Create Handover'}
          subtitle={sourceReview
            ? `Prefilled from Design Review ${sourceReview.id}. Review every reference, complete the missing fields and save explicitly.`
            : 'Create a controlled handover from actual project, design, BOM, drawing, manufacturing and review records.'}
          actions={
            <>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(cancelTarget)} disabled={saving}>Cancel</Button>
              <Button variant="secondary" icon={Save} onClick={handleDraft} disabled={saving}>Save as Draft</Button>
              <Button icon={Save} type="submit" form="design-handover-form" disabled={saving}>Save Handover</Button>
            </>
          }
        />
      }
    >
      <form ref={formRef} id="design-handover-form" className="dh-form-page" onSubmit={handleSubmit}>
        {error && <div className="dh-feedback is-error" role="alert">{error}</div>}
        {prefill && (
          <div className="dh-prefill-banner" role="status">
            <div>
              <span className="dh-eyebrow">Prefilled from Design Review</span>
              <h3>{sourceReview.id} · {sourceReview.deliverableNumber} · Rev {sourceReview.revision}</h3>
              <p>This form is not saved. Nothing is created until you explicitly choose <strong>Save as Draft</strong> or <strong>Save Handover</strong>.</p>
            </div>
            <StatusBadge status="Unsaved" tone="blue" />
          </div>
        )}

        {prefill && (
          <Card>
            <div className="dh-form-section-head">
              <div>
                <h3>Source Design Review and release</h3>
                <p>Read-only references retrieved from the released Design Review record. The form does not approve, release or transfer anything.</p>
              </div>
              <StatusBadge status={prefill.statuses.release} tone={prefill.statuses.release === 'Released' ? 'green' : 'gray'} />
            </div>

            <div className="dh-source-fact-grid">
              <SourceReferenceValue label="Project number" value={prefill.facts.projectNumber} />
              <SourceReferenceValue label="Project reference ID" value={prefill.facts.projectReference} />
              <SourceReferenceValue label="Design number" value={prefill.facts.designNumber} />
              <SourceReferenceValue label="Design reference ID" value={prefill.facts.designReference} />
              <SourceReferenceValue label="Design revision" value={prefill.facts.revision} />
              <SourceReferenceValue label="Part / assembly number" value={prefill.facts.itemNumber} />
              <SourceReferenceValue label="Part / assembly reference ID" value={prefill.facts.itemReference} />
              <SourceReferenceValue label="Design review reference" value={prefill.facts.review} />
              <SourceReferenceValue label="Design release" value={prefill.facts.release} />
            </div>

            <div className="dh-review-status-grid">
              <ReviewStatus label="Engineering review" value={prefill.statuses.engineering} />
              <ReviewStatus label="Manufacturing review" value={prefill.statuses.manufacturing} />
              <ReviewStatus label="Client approval" value={prefill.statuses.client} />
              <ReviewStatus
                label="Final approval"
                value={sourceReview.finalApproval?.decision || (finalApprovalRecord(sourceReview) ? 'Approved' : 'Not Available')}
              />
              <ReviewStatus label="Design release" value={prefill.statuses.release} />
            </div>

            <div className="dh-source-linked-block">
              <h4>Related controlled records</h4>
              <dl className="dh-key-values">
                <div><dt>BOM revision</dt><dd>{prefill.availability.bom}</dd></div>
                <div><dt>Drawing revisions</dt><dd>{prefill.drawings.length ? prefill.drawings.map((drawing) => `${drawing.drawingNumber} Rev ${drawing.revision}`).join(' · ') : 'Not Available'}</dd></div>
                <div><dt>Manufacturing definition</dt><dd>{prefill.availability.manufacturing}</dd></div>
                <div><dt>Inspection requirements</dt><dd>{prefill.availability.inspection}</dd></div>
                <div><dt>Process plan</dt><dd>{prefill.availability.processPlan}</dd></div>
              </dl>
            </div>

            <div className="dh-source-links">
              <Link className="link-button" to={`/design-review/review/${sourceReview.id}`}>
                <ExternalLink aria-hidden="true" /> Open source Design Review {sourceReview.id}
              </Link>
              <span>Source references are retained on the handover. Handover-specific fields remain editable below.</span>
            </div>
          </Card>
        )}

        <Card>
          <div className="dh-form-section-head">
            <div>
              <h3>Handover scope</h3>
              <p>The project, design and exact revision must already exist. No approval or release status is assigned automatically.</p>
            </div>
            <div className="dh-form-head-badges">
              {prefill && <span className="dh-prefill-chip">Auto-populated</span>}
              <StatusBadge status={record?.status || 'Not saved'} tone={record ? undefined : 'gray'} />
            </div>
          </div>
          <div className="dh-form-grid">
            <Select
              label="Project"
              id="handover-project"
              value={form.projectId}
              onChange={(event) => handleProject(event.target.value)}
              options={[{ value: '', label: 'Select project' }, ...projects.map((project) => ({ value: project.id, label: `${project.id} · ${project.name}` }))]}
              required
              disabled={Boolean(prefill)}
            />
            <Select
              label="Mechanical design"
              id="handover-design"
              value={form.designId}
              onChange={(event) => handleDesign(event.target.value)}
              options={[{ value: '', label: form.projectId ? 'Select design' : 'Select a project first' }, ...projectDesigns.map((design) => ({ value: design.id, label: `${design.id} · ${design.name}` }))]}
              required
              disabled={Boolean(prefill) || !form.projectId}
            />
            <Input label="Design revision" id="handover-revision" value={form.designRevision} readOnly hint="The current controlled revision from the design record." required />
            <Select
              label="Part / assembly type"
              id="handover-item-type"
              value={form.itemType}
              onChange={(event) => update({ itemType: event.target.value, itemId: '' })}
              options={[{ value: 'Assembly', label: 'Assembly' }, { value: 'Part', label: 'Part' }, { value: 'Design', label: 'Design record' }]}
              disabled={Boolean(prefill)}
            />
            <Select
              label={form.itemType === 'Part' ? 'Part' : form.itemType === 'Assembly' ? 'Assembly' : 'Design'}
              id="handover-item"
              value={form.itemId}
              onChange={(event) => update({ itemId: event.target.value })}
              options={[
                { value: '', label: `Select ${form.itemType.toLowerCase()}` },
                ...(form.itemType === 'Part'
                  ? projectParts.map((part) => ({ value: part.id, label: `${part.id} · ${part.name}` }))
                  : form.itemType === 'Assembly'
                    ? projectAssemblies.map((assembly) => ({ value: assembly.id, label: `${assembly.id} · ${assembly.name}` }))
                    : projectDesigns.map((design) => ({ value: design.id, label: `${design.id} · ${design.name}` }))),
              ]}
              disabled={Boolean(prefill)}
            />
            <Input
              label="Handover owner"
              id="handover-owner"
              value={form.owner}
              onChange={(event) => update({ owner: event.target.value })}
              required
            />
            <Input
              label="Target handover date"
              id="handover-target"
              type="date"
              value={form.targetDate}
              onChange={(event) => update({ targetDate: event.target.value })}
              required
            />
            <Input label="Actual handover date" id="handover-actual" value={form.actualHandoverDate ? formatHandoverDate(form.actualHandoverDate) : ''} readOnly placeholder="Not recorded" hint="Only populated when an actual handover is recorded." />
          </div>
          {prefill && (
            <p className="dh-form-source-note">
              Project, mechanical design, revision and part / assembly are read-only source references from {sourceReview.id}.
              Handover owner and target date are not supplied by the review and remain editable.
            </p>
          )}
        </Card>

        <Card>
          <div className="dh-form-section-head">
            <div>
              <h3>Related controlled records</h3>
              <p>These references are taken directly from existing modules. Missing records remain visibly unselected.</p>
            </div>
            {prefill && <span className="dh-prefill-chip">Source-linked</span>}
          </div>
          <div className="dh-form-grid">
            <Select
              label="Related BOM revision"
              id="handover-bom"
              value={form.bomId}
              onChange={(event) => handleBom(event.target.value)}
              options={[{ value: '', label: 'No BOM selected' }, ...projectBoms.map((bom) => ({ value: bom.id, label: `${bom.id} Rev ${bom.revision} · ${bom.name}` }))]}
              hint={prefill && !prefill.bomRevisionMatches ? prefill.availability.bom : undefined}
            />
            <Input label="BOM revision" id="handover-bom-revision" value={form.bomRevision || ''} readOnly />
            <Select
              label="Manufacturing definition"
              id="handover-manufacturing"
              value={form.manufacturingId}
              onChange={(event) => update({ manufacturingId: event.target.value })}
              options={[{ value: '', label: 'No definition selected' }, ...projectDefinitions.map((row) => ({ value: row.id, label: `${row.id} · ${row.name} (${row.status})` }))]}
              hint={prefill && !form.manufacturingId ? 'Not Available from the review — select an existing definition if required.' : undefined}
            />
            <Select
              label="Inspection requirements"
              id="handover-inspection"
              value={form.inspectionId}
              onChange={(event) => update({ inspectionId: event.target.value })}
              options={[{ value: '', label: 'No inspection plan selected' }, ...projectInspections.map((row) => ({ value: row.id, label: `${row.id} · ${row.name} (${row.status})` }))]}
              hint={prefill && !form.inspectionId ? 'Not Available from the review — select an existing inspection plan if required.' : undefined}
            />
            <Select
              label="Process plan"
              id="handover-process"
              value={form.processPlanId}
              onChange={(event) => update({ processPlanId: event.target.value })}
              options={[{ value: '', label: 'No process plan selected' }, ...projectPlans.map((row) => ({ value: row.id, label: `${row.id} · ${row.name} (${row.status})` }))]}
              hint={prefill && !form.processPlanId ? 'Not Available from the review — select an existing process plan if required.' : undefined}
            />
            <Select
              label="Engineering review"
              id="handover-eng-review"
              value={form.engineeringReviewId}
              onChange={(event) => update({ engineeringReviewId: event.target.value })}
              options={[{ value: '', label: 'No engineering review selected' }, ...projectReviews.map((review) => ({ value: review.id, label: `${review.id} · ${review.deliverableNumber || review.deliverableName} · ${review.stageStates?.engineering?.status || review.status}` }))]}
            />
            <Select
              label="Manufacturing review"
              id="handover-mfg-review"
              value={form.manufacturingReviewId}
              onChange={(event) => update({ manufacturingReviewId: event.target.value })}
              options={[{ value: '', label: 'No manufacturing review selected' }, ...projectReviews.filter((review) => review.requiredStages?.includes('Manufacturing') || review.stageStates?.manufacturing?.status).map((review) => ({ value: review.id, label: `${review.id} · ${review.deliverableNumber || review.deliverableName} · ${review.stageStates?.manufacturing?.status || review.status}` }))]}
            />
            <Select
              label="Final approval evidence"
              id="handover-final-approval"
              value={form.finalApprovalId}
              onChange={(event) => update({ finalApprovalId: event.target.value })}
              options={[{ value: '', label: 'No final approval selected' }, ...finalReviewOptions.map((review) => ({ value: review.id, label: `${review.id} · ${review.deliverableNumber || review.deliverableName} · ${finalApprovalRecord(review)?.approver || review.reviewer || 'Approved'}` }))]}
            />
          </div>

          <div className="dh-form-subsection">
            <div className="dh-form-subsection-head">
              <div>
                <h4>Related drawing revisions</h4>
                <p>{projectDrawings.length} drawing record(s) available for this project.</p>
              </div>
            </div>
            {projectDrawings.length === 0 ? (
              <div className="dh-source-unavailable">No drawing records are available for this project.</div>
            ) : (
              <div className="dh-checkbox-grid">
                {projectDrawings.map((drawing) => (
                  <label key={drawing.id} className="dh-checkbox-card">
                    <input type="checkbox" checked={form.drawingIds.includes(drawing.id)} onChange={() => toggleDrawing(drawing.id)} />
                    <span>
                      <strong>{drawing.drawingNumber} Rev {drawing.revision}</strong>
                      <span>{drawing.title} · {drawing.approvalStatus}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="dh-form-section-head">
            <div>
              <h3>Handover notes and current blockers</h3>
              <p>Release is not assigned here. Prepare the package and run validation after saving.</p>
            </div>
          </div>
          <Textarea label="Notes" id="handover-notes" rows={4} value={form.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Record the controlled handover scope and any known constraints." />
          <div className="dh-form-status-row">
            <span className={`dh-requirement ${openChanges.length ? 'is-mandatory' : 'is-optional'}`}>{openChanges.length} open engineering change{openChanges.length === 1 ? '' : 's'}</span>
            <span className="dh-muted-note">Open changes are evaluated by Release Validation. They are never auto-approved here.</span>
          </div>
          {requireUserFields && <p className="dh-form-required-note">Handover owner and target date are required. This form has not been saved.</p>}
          <div className="dh-form-actions">
            <Button variant="secondary" onClick={() => navigate(cancelTarget)} disabled={saving}>Cancel</Button>
            <Button variant="secondary" icon={Save} onClick={handleDraft} disabled={saving}>Save as Draft</Button>
            <Button icon={Save} type="submit" disabled={saving}>Save Handover</Button>
          </div>
        </Card>
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => { if (!saving) setConfirmOpen(false); }}
        title="Save this handover?"
        subtitle="This creates the handover record. It does not approve, release or transfer the design."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={saving}>Keep editing</Button>
            <Button icon={Save} onClick={() => persist('handover')} disabled={saving}>Confirm Save Handover</Button>
          </>
        }
      >
        <dl className="dh-key-values">
          <div><dt>Project</dt><dd>{form.projectId || 'Not selected'}</dd></div>
          <div><dt>Design</dt><dd>{form.designId ? `${form.designId} Rev ${form.designRevision}` : 'Not selected'}</dd></div>
          <div><dt>Owner</dt><dd>{form.owner || 'Not recorded'}</dd></div>
          <div><dt>Target date</dt><dd>{form.targetDate ? formatHandoverDate(form.targetDate) : 'Not recorded'}</dd></div>
          {form.sourceReviewId && <div><dt>Source review</dt><dd>{form.sourceReviewId} · {form.sourceReleaseId || 'No release reference'}</dd></div>}
        </dl>
      </Modal>
    </PageLayout>
  );
}
