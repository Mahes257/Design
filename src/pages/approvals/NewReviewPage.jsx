import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, FilePlus2, Paperclip, Save, Send, Trash2 } from 'lucide-react';
import { Breadcrumb, Button, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD, MODULES } from '../../config/navigation';
import { useApprovals } from '../../context/ApprovalsContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  DELIVERABLE_TYPES,
  ENGINEERS,
  ENGINEERING_REVIEWERS,
  MANUFACTURING_REVIEWERS,
  PRIORITIES,
  REVIEW_PURPOSES,
  REVIEW_TYPES,
  TODAY,
  addDays,
  newReviewChecklists,
  nextRevision,
} from '../../data/approvalsData';
import { Toast, useToast } from './approvalsUi';

const MODULE = MODULES.find((module) => module.key === 'approvals');

const DEFAULT_FORM = {
  id: '',
  projectId: '',
  designId: '',
  designRevision: '',
  reviewType: 'Design Review',
  reviewPurpose: REVIEW_PURPOSES[0],
  requestedBy: 'R. Kulkarni',
  deliverableType: '',
  deliverableNumber: '',
  deliverableName: '',
  revision: 'A',
  partRef: '',
  priority: 'High',
  submittedBy: 'R. Kulkarni',
  submittedAt: TODAY,
  reviewDate: TODAY,
  plannedReviewDate: addDays(TODAY, 14),
  dueDate: addDays(TODAY, 14),
  bomId: '',
  bomRevision: '',
  drawingId: '',
  drawingRevision: '',
  engineeringReviewer: 'N. Joshi',
  manufacturingReviewer: 'V. Sharma',
  clientApproval: false,
  manufacturingStage: true,
  submissionNotes: '',
  reviewInstructions: 'Review the submitted revision against the applicable checklists and accepted evidence.',
};

const BLANK_TECHNICAL = {
  requirements: [],
  linkedCalculations: [],
  analysisRefs: [],
  stressEvidence: 'No stress evidence reference recorded yet.',
  thermalEvidence: 'Not applicable or not yet recorded.',
  motionEvidence: 'Not applicable or not yet recorded.',
  materialSpecs: 'Material and specification references to be confirmed during engineering review.',
  assumptions: 'Input conditions and assumptions to be confirmed from the linked calculation.',
  acceptanceCriteria: 'Acceptance criteria to be confirmed against the design basis.',
  attachments: [],
};

const BLANK_MANUFACTURING = {
  feasibility: 'Manufacturing feasibility to be assessed by the manufacturing reviewer.',
  accessibility: 'Component accessibility to be assessed.',
  assemblyFeasibility: 'Assembly feasibility to be assessed.',
  constraints: 'Manufacturing constraints to be recorded.',
  specialRequirements: 'No special manufacturing requirements recorded yet.',
  dimensionalTolerances: 'To be reviewed against the submitted drawing.',
  geometricTolerances: 'To be reviewed against the submitted drawing.',
  fits: 'Fits and clearances to be reviewed.',
  criticalDimensions: 'Critical dimensions to be identified by the reviewer.',
  toleranceNotes: 'No tolerance notes recorded yet.',
  drawingRefs: 'Refer to the submitted revision only.',
  machining: 'Process suitability to be assessed.',
  fabrication: 'Process suitability to be assessed.',
  welding: 'Process suitability to be assessed.',
  sheetMetal: 'Process suitability to be assessed.',
  processes: [],
  equipment: [],
  processConstraints: 'To be recorded during manufacturing review.',
  inspectionPoints: 'Inspection points to be defined by the manufacturing reviewer.',
  criticalCharacteristics: 'Critical characteristics to be identified.',
  measurement: 'Measurement requirements to be defined.',
  acceptance: 'Acceptance criteria to be reviewed.',
  inspectionRefs: 'Inspection plan reference to be confirmed by Quality Control.',
  inspectionNotes: 'Inspection execution remains in the Quality Control module.',
};

function typeLabel(type) {
  return type || 'this deliverable';
}

export default function NewReviewPage() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const { reviews, saveReview, nextReviewId } = useApprovals();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { designs } = useMechanical();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();
  const existing = reviewId ? reviews.find((review) => review.id === reviewId) : null;
  const suggestedId = useMemo(() => nextReviewId(), [nextReviewId]);
  const initialProjectId = existing?.projectId || projects[0]?.id || '';
  const initialBom = boms.find((row) => row.id === existing?.bomId) || boms.find((row) => row.projectId === initialProjectId) || null;
  const initialDrawing =
    drawings.find((row) => row.id === existing?.drawingId) ||
    drawings.find((row) => row.projectId === initialProjectId && !['Superseded', 'Withdrawn'].includes(row.approvalStatus)) ||
    null;

  const [form, setForm] = useState(() => {
    if (!existing) {
      return {
        ...DEFAULT_FORM,
        id: suggestedId,
        projectId: initialProjectId,
        designId: designs.find((design) => design.projectId === initialProjectId)?.id || '',
        designRevision: designs.find((design) => design.projectId === initialProjectId)?.revision || '',
        revision: 'A',
        bomId: initialBom?.id || '',
        bomRevision: initialBom?.revision || '',
        drawingId: initialDrawing?.id || '',
        drawingRevision: initialDrawing?.revision || '',
        clientApproval: false,
      };
    }
    return {
      ...DEFAULT_FORM,
      id: existing.id,
      projectId: existing.projectId,
      designId: existing.designId || designs.find((design) => design.projectId === existing.projectId)?.id || '',
      designRevision: existing.designRevision || designs.find((design) => design.projectId === existing.projectId)?.revision || '',
      reviewType: existing.reviewType || 'Design Review',
      reviewPurpose: existing.reviewPurpose || REVIEW_PURPOSES[0],
      requestedBy: existing.requestedBy || existing.submittedBy,
      deliverableType: existing.deliverableType,
      deliverableNumber: existing.deliverableNumber,
      deliverableName: existing.deliverableName,
      revision: existing.revision,
      partRef: existing.partRef || '',
      priority: existing.priority,
      submittedBy: existing.submittedBy,
      submittedAt: existing.submittedAt || TODAY,
      reviewDate: existing.reviewDate || existing.submittedAt || TODAY,
      plannedReviewDate: existing.plannedReviewDate || existing.dueDate || addDays(TODAY, 14),
      dueDate: existing.dueDate,
      bomId: existing.bomId || initialBom?.id || '',
      bomRevision: existing.bomRevision || initialBom?.revision || '',
      drawingId: existing.drawingId || initialDrawing?.id || '',
      drawingRevision: existing.drawingRevision || initialDrawing?.revision || '',
      engineeringReviewer: existing.engineeringReviewer,
      manufacturingReviewer: existing.manufacturingReviewer,
      clientApproval: existing.clientRequired,
      manufacturingStage: existing.requiredStages.includes('Manufacturing'),
      submissionNotes: existing.submissionNotes || '',
      reviewInstructions: existing.reviewInstructions || DEFAULT_FORM.reviewInstructions,
    };
  });
  const [attachments, setAttachments] = useState(existing?.attachments || []);
  const [errors, setErrors] = useState({});

  if (existing && existing.status !== 'Draft') {
    return <Navigate to={`/design-review/review/${existing.id}`} replace />;
  }

  const projectBoms = boms.filter((row) => row.projectId === form.projectId);
  const projectDrawings = drawings.filter(
    (row) => row.projectId === form.projectId && !['Superseded', 'Withdrawn'].includes(row.approvalStatus),
  );

  const setProject = (projectId) => {
    const bom = boms.find((row) => row.projectId === projectId) || null;
    const drawing =
      drawings.find((row) => row.projectId === projectId && !['Superseded', 'Withdrawn'].includes(row.approvalStatus)) || null;
    setForm((previous) => ({
      ...previous,
      projectId,
      designId: designs.find((design) => design.projectId === projectId)?.id || '',
      designRevision: designs.find((design) => design.projectId === projectId)?.revision || '',
      bomId: bom?.id || '',
      bomRevision: bom?.revision || '',
      drawingId: drawing?.id || '',
      drawingRevision: drawing?.revision || '',
    }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next.projectId;
      delete next.bomRevision;
      delete next.drawingRevision;
      return next;
    });
  };

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const requiredStages = ['Engineering', ...(form.manufacturingStage ? ['Manufacturing'] : []), ...(form.clientApproval ? ['Client'] : [])];

  const validate = () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Project is required.';
    if (!form.reviewType) next.reviewType = 'Review type is required.';
    if (!form.reviewPurpose) next.reviewPurpose = 'Review purpose is required.';
    if (!form.requestedBy) next.requestedBy = 'Review requester is required.';
    if (!form.deliverableType) next.deliverableType = 'Deliverable type is required.';
    if (!form.deliverableNumber.trim()) next.deliverableNumber = 'Deliverable number is required.';
    else if (reviews.some((review) => review.id !== form.id
      && review.projectId === form.projectId
      && review.deliverableNumber.toLowerCase() === form.deliverableNumber.trim().toLowerCase()
      && review.revision.toLowerCase() === form.revision.trim().toLowerCase())) {
      next.deliverableNumber = 'A review already exists for this deliverable and exact revision.';
    }
    if (!form.revision.trim()) next.revision = 'Revision is required.';
    if (!form.bomId || !form.bomRevision) next.bomRevision = 'Select the exact BOM revision under review.';
    if (!form.drawingId || !form.drawingRevision) next.drawingRevision = 'Select the exact drawing revision under review.';
    if (!form.reviewDate) next.reviewDate = 'Review date is required.';
    if (!form.submittedBy) next.submittedBy = 'Submitter is required.';
    if (!form.engineeringReviewer) next.engineeringReviewer = 'Assigned engineering reviewer is required.';
    if (form.manufacturingStage && !form.manufacturingReviewer) next.manufacturingReviewer = 'Assigned manufacturing reviewer is required.';
    if (!requiredStages.length) next.stages = 'Select at least one applicable review stage.';
    if (!form.plannedReviewDate) next.plannedReviewDate = 'Planned review date is required.';
    if (!form.dueDate) next.dueDate = 'Review due date is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildRecord = () => {
    const checklists = newReviewChecklists();
    const projectSuffix = form.projectId.split('-').pop();
    return {
      ...(existing || {}),
      id: existing?.id || form.id,
      projectId: form.projectId,
      designId: form.designId,
      designRevision: form.designRevision,
      reviewType: form.reviewType,
      reviewPurpose: form.reviewPurpose,
      requestedBy: form.requestedBy,
      assignedReviewers: [form.engineeringReviewer, form.manufacturingStage ? form.manufacturingReviewer : '', form.clientApproval ? (existing?.clientReviewer || 'Client — A. Mehta') : ''].filter(Boolean),
      plannedReviewDate: form.plannedReviewDate,
      reviewNotes: form.submissionNotes,
      deliverableType: form.deliverableType,
      deliverableNumber: form.deliverableNumber.trim().toUpperCase(),
      deliverableName: form.deliverableName.trim() || `${form.deliverableNumber.trim().toUpperCase()} ${typeLabel(form.deliverableType)}`,
      revision: form.revision.trim().toUpperCase(),
      bomId: form.bomId,
      bomRevision: form.bomRevision,
      drawingId: form.drawingId,
      drawingRevision: form.drawingRevision,
      reviewDate: form.reviewDate || TODAY,
      partRef: form.partRef.trim(),
      priority: form.priority,
      submittedBy: form.submittedBy,
      submittedAt: form.submittedAt || TODAY,
      dueDate: form.dueDate || addDays(TODAY, 14),
      engineeringReviewer: form.engineeringReviewer,
      manufacturingReviewer: form.manufacturingReviewer,
      clientRequired: form.clientApproval,
      clientReviewer: existing?.clientReviewer || 'Client — A. Mehta',
      clientReference: existing?.clientReference || `CL-2026-${projectSuffix}`,
      requiredStages,
      currentStage: 'Draft',
      status: 'Draft',
      stageStates: {
        engineering: { status: 'Pending', reviewer: form.engineeringReviewer, decision: '', decidedAt: '', comments: '' },
        manufacturing: form.manufacturingStage
          ? { status: 'Pending', reviewer: form.manufacturingReviewer, decision: '', decidedAt: '', comments: '' }
          : { status: 'Not Required', reviewer: form.manufacturingReviewer, decision: '', decidedAt: '', comments: '' },
        client: form.clientApproval
          ? { status: 'Not Submitted', reviewer: existing?.clientReviewer || 'Client — A. Mehta', decision: '', decidedAt: '', submittedAt: '', comments: '', requestedChanges: '' }
          : { status: 'Not Required', reviewer: existing?.clientReviewer || 'Client — A. Mehta', decision: '', decidedAt: '', submittedAt: '', comments: '', requestedChanges: '' },
      },
      designReview: {
        notes: form.submissionNotes || 'Submission registered for engineering review.',
        drawingReferences: [form.deliverableNumber.trim().toUpperCase()],
        notesExtra: 'Only the submitted revision is under review.',
      },
      designChecklist: checklists.designChecklist,
      technicalChecklist: checklists.technicalChecklist,
      engineeringChecklist: checklists.engineeringChecklist,
      manufacturingChecklist: checklists.manufacturingChecklist,
      technical: BLANK_TECHNICAL,
      manufacturing: BLANK_MANUFACTURING,
      comments: [],
      attachments,
      clientSubmission: { notes: '', submittedAt: '', clientReviewer: existing?.clientReviewer || 'Client — A. Mehta', clientReference: `CL-2026-${projectSuffix}`, attachments: [] },
      clientHistory: [],
      clientComments: [],
      history: [],
      approvals: [],
      finalApproval: null,
      release: null,
      resubmissions: [],
      submissionNotes: form.submissionNotes,
      reviewInstructions: form.reviewInstructions,
    };
  };

  const save = (submit) => {
    if (!validate()) {
      showToast('Fix the highlighted fields before continuing.', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const record = buildRecord();
    saveReview(record, { submit });
    showToast(submit ? `${record.id} submitted for review.` : `${record.id} saved as a draft.`);
    navigate(`/design-review/review/${record.id}`);
  };

  const deliverableOptions = [...new Set(reviews.map((review) => review.deliverableNumber))];
  const revisionHint = form.revision ? nextRevision(form.revision.toUpperCase()) : 'A';

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: DASHBOARD.path },
            { label: MODULE.label, to: MODULE.base },
            { label: existing ? `Edit ${existing.id}` : 'New Review' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={ClipboardCheck}
          title={existing ? 'Edit Draft Review' : 'New Design Review'}
          subtitle="Register a design deliverable with its exact BOM and drawing revisions, assign reviewers and choose the applicable approval stages."
          actions={<Button variant="ghost" onClick={() => navigate('/design-review')}>Back to Register</Button>}
        />
      }
    >
      <form className="approvals-form" onSubmit={(event) => event.preventDefault()} noValidate>
        <section className="card approvals-form-section">
          <div className="approvals-form-head">
            <div><span className="approvals-form-step">01</span><h3>General Information</h3><p>Identify the deliverable and exact revision entering review.</p></div>
            <span className="approvals-count-chip">Review ID · {form.id}</span>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="review-id">Review ID</label>
              <input id="review-id" className="form-input" value={form.id} readOnly aria-readonly="true" />
              <span className="form-hint">Auto-generated mock reference.</span>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-project">Project <span className="req">*</span></label>
              <select id="review-project" className={`form-select${errors.projectId ? ' is-invalid' : ''}`} value={form.projectId} onChange={(event) => setProject(event.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.id} · {project.name}</option>)}
              </select>
              {errors.projectId && <span className="form-error">{errors.projectId}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-type">Review Type <span className="req">*</span></label>
              <select id="review-type" className="form-select" value={form.reviewType} onChange={(event) => setField('reviewType', event.target.value)}>
                {REVIEW_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-purpose">Review Purpose <span className="req">*</span></label>
              <select id="review-purpose" className="form-select" value={form.reviewPurpose} onChange={(event) => setField('reviewPurpose', event.target.value)}>
                {REVIEW_PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-design">Mechanical Design</label>
              <select id="review-design" className="form-select" value={form.designId} onChange={(event) => {
                const design = designs.find((row) => row.id === event.target.value);
                setField('designId', event.target.value);
                setField('designRevision', design?.revision || '');
              }}>
                <option value="">No design reference</option>
                {designs.filter((design) => !form.projectId || design.projectId === form.projectId).map((design) => (
                  <option key={design.id} value={design.id}>{design.id} · {design.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-design-revision">Design Revision</label>
              <input id="review-design-revision" className="form-input" value={form.designRevision} maxLength={4} onChange={(event) => setField('designRevision', event.target.value.toUpperCase())} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-requested-by">Review Requested By <span className="req">*</span></label>
              <select id="review-requested-by" className={`form-select${errors.requestedBy ? ' is-invalid' : ''}`} value={form.requestedBy} onChange={(event) => setField('requestedBy', event.target.value)}>
                {ENGINEERS.map((engineer) => <option key={engineer} value={engineer}>{engineer}</option>)}
              </select>
              {errors.requestedBy && <span className="form-error">{errors.requestedBy}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-deliverable-type">Deliverable Type <span className="req">*</span></label>
              <select id="review-deliverable-type" className={`form-select${errors.deliverableType ? ' is-invalid' : ''}`} value={form.deliverableType} onChange={(event) => setField('deliverableType', event.target.value)}>
                <option value="">Select deliverable type</option>
                {DELIVERABLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {errors.deliverableType && <span className="form-error">{errors.deliverableType}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-deliverable-number">Deliverable Number <span className="req">*</span></label>
              <input id="review-deliverable-number" className={`form-input${errors.deliverableNumber ? ' is-invalid' : ''}`} list="deliverable-number-options" value={form.deliverableNumber} onChange={(event) => setField('deliverableNumber', event.target.value.toUpperCase())} placeholder="e.g. DRG-MEC-041-003" />
              <datalist id="deliverable-number-options">{deliverableOptions.map((value) => <option key={value} value={value} />)}</datalist>
              {errors.deliverableNumber && <span className="form-error">{errors.deliverableNumber}</span>}
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor="review-deliverable-name">Deliverable Name</label>
              <input id="review-deliverable-name" className="form-input" value={form.deliverableName} onChange={(event) => setField('deliverableName', event.target.value)} placeholder="Engineering description of the submitted deliverable" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-revision">Revision <span className="req">*</span></label>
              <input id="review-revision" className={`form-input approvals-revision-input${errors.revision ? ' is-invalid' : ''}`} value={form.revision} maxLength={4} onChange={(event) => setField('revision', event.target.value.toUpperCase())} />
              <span className="form-hint">Next revision suggestion: {revisionHint}. A new revision must be reviewed again.</span>
              {errors.revision && <span className="form-error">{errors.revision}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-part">Part / Assembly Reference</label>
              <input id="review-part" className="form-input" value={form.partRef} onChange={(event) => setField('partRef', event.target.value)} placeholder="e.g. ASM-2026-001 or MEC-041-001" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-bom">BOM Revision <span className="req">*</span></label>
              <select
                id="review-bom"
                className={`form-select${errors.bomRevision ? ' is-invalid' : ''}`}
                value={form.bomId}
                onChange={(event) => {
                  const bom = projectBoms.find((row) => row.id === event.target.value);
                  setForm((previous) => ({
                    ...previous,
                    bomId: event.target.value,
                    bomRevision: bom?.revision || '',
                  }));
                  setErrors((previous) => {
                    const next = { ...previous };
                    delete next.bomRevision;
                    return next;
                  });
                }}
              >
                <option value="">Select BOM revision</option>
                {projectBoms.map((bom) => (
                  <option key={bom.id} value={bom.id}>{bom.id} · Rev {bom.revision} · {bom.status}</option>
                ))}
              </select>
              {errors.bomRevision && <span className="form-error">{errors.bomRevision}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-drawing">Drawing Revision <span className="req">*</span></label>
              <select
                id="review-drawing"
                className={`form-select${errors.drawingRevision ? ' is-invalid' : ''}`}
                value={form.drawingId}
                onChange={(event) => {
                  const drawing = projectDrawings.find((row) => row.id === event.target.value);
                  setForm((previous) => ({
                    ...previous,
                    drawingId: event.target.value,
                    drawingRevision: drawing?.revision || '',
                  }));
                  setErrors((previous) => {
                    const next = { ...previous };
                    delete next.drawingRevision;
                    return next;
                  });
                }}
              >
                <option value="">Select drawing revision</option>
                {projectDrawings.map((drawing) => (
                  <option key={drawing.id} value={drawing.id}>
                    {drawing.id} · {drawing.drawingNumber} · Rev {drawing.revision} · {drawing.approvalStatus}
                  </option>
                ))}
              </select>
              {errors.drawingRevision && <span className="form-error">{errors.drawingRevision}</span>}
            </div>
            <div className="form-field span-2">
              <p className="approvals-note">
                The review is tied to these exact revisions. Engineering release is blocked if either revision changes
                or is not approved/released in its own module.
              </p>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-priority">Review Priority</label>
              <select id="review-priority" className="form-select" value={form.priority} onChange={(event) => setField('priority', event.target.value)}>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="card approvals-form-section">
          <div className="approvals-form-head">
            <div><span className="approvals-form-step">02</span><h3>Submission Information</h3><p>Assign the submitter, due date and responsible reviewers.</p></div>
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="review-submitter">Submitted By <span className="req">*</span></label>
              <select id="review-submitter" className={`form-select${errors.submittedBy ? ' is-invalid' : ''}`} value={form.submittedBy} onChange={(event) => setField('submittedBy', event.target.value)}>
                {ENGINEERS.map((engineer) => <option key={engineer} value={engineer}>{engineer}</option>)}
              </select>
              {errors.submittedBy && <span className="form-error">{errors.submittedBy}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-submitted-at">Submission Date</label>
              <input id="review-submitted-at" type="date" className="form-input" value={form.submittedAt} onChange={(event) => setField('submittedAt', event.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-date">Review Date <span className="req">*</span></label>
              <input id="review-date" type="date" className={`form-input${errors.reviewDate ? ' is-invalid' : ''}`} value={form.reviewDate} onChange={(event) => setField('reviewDate', event.target.value)} />
              {errors.reviewDate && <span className="form-error">{errors.reviewDate}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-planned">Planned Review Date <span className="req">*</span></label>
              <input id="review-planned" type="date" className={`form-input${errors.plannedReviewDate ? ' is-invalid' : ''}`} value={form.plannedReviewDate} onChange={(event) => { setField('plannedReviewDate', event.target.value); setField('dueDate', event.target.value); }} />
              {errors.plannedReviewDate && <span className="form-error">{errors.plannedReviewDate}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-due">Review Due Date <span className="req">*</span></label>
              <input id="review-due" type="date" className={`form-input${errors.dueDate ? ' is-invalid' : ''}`} value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} />
              {errors.dueDate && <span className="form-error">{errors.dueDate}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-eng-reviewer">Assigned Engineering Reviewer <span className="req">*</span></label>
              <select id="review-eng-reviewer" className={`form-select${errors.engineeringReviewer ? ' is-invalid' : ''}`} value={form.engineeringReviewer} onChange={(event) => setField('engineeringReviewer', event.target.value)}>
                {ENGINEERING_REVIEWERS.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
              </select>
              {errors.engineeringReviewer && <span className="form-error">{errors.engineeringReviewer}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-mfg-reviewer">Assigned Manufacturing Reviewer</label>
              <select id="review-mfg-reviewer" className={`form-select${errors.manufacturingReviewer ? ' is-invalid' : ''}`} value={form.manufacturingReviewer} onChange={(event) => setField('manufacturingReviewer', event.target.value)} disabled={!form.manufacturingStage}>
                {MANUFACTURING_REVIEWERS.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
              </select>
              {errors.manufacturingReviewer && <span className="form-error">{errors.manufacturingReviewer}</span>}
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="review-client-required">Client or Admin Approval Required</label>
              <select id="review-client-required" className="form-select" value={form.clientApproval ? 'Yes' : 'No'} onChange={(event) => setField('clientApproval', event.target.value === 'Yes')}>
                <option value="No">No — internal release only</option>
                <option value="Yes">Yes — conditional client or admin gate</option>
              </select>
              <span className="form-hint">The conditional stage is not forced on every deliverable.</span>
            </div>
          </div>
        </section>

        <section className="card approvals-form-section">
          <div className="approvals-form-head">
            <div><span className="approvals-form-step">03</span><h3>Review Information</h3><p>Describe the submission and configure the required workflow.</p></div>
          </div>
          <div className="form-grid">
            <div className="form-field span-2">
              <label className="form-label" htmlFor="review-submission-notes">Submission Notes</label>
              <textarea id="review-submission-notes" className="form-textarea" rows={3} value={form.submissionNotes} onChange={(event) => setField('submissionNotes', event.target.value)} placeholder="Summary of the submitted revision and what reviewers should focus on." />
            </div>
            <div className="form-field span-2">
              <span className="form-label">Applicable Review Stages <span className="req">*</span></span>
              <div className="approvals-stage-options">
                <label className="approvals-stage-option is-locked">
                  <input type="checkbox" checked readOnly disabled />
                  <span><strong>Engineering Review</strong><small>Required for every design review workflow.</small></span>
                </label>
                <label className="approvals-stage-option">
                  <input type="checkbox" checked={form.manufacturingStage} onChange={(event) => setField('manufacturingStage', event.target.checked)} />
                  <span><strong>Manufacturing Review</strong><small>Manufacturability, tolerances, process and inspection.</small></span>
                </label>
                <label className="approvals-stage-option">
                  <input type="checkbox" checked={form.clientApproval} onChange={(event) => setField('clientApproval', event.target.checked)} />
                  <span><strong>Client or Admin Approval</strong><small>Conditional approval by either the client or an authorized admin. Only one approval is required.</small></span>
                </label>
              </div>
              <span className="form-hint">Workflow for {typeLabel(form.deliverableType)}: {requiredStages.map((stage) => (stage === 'Client' ? 'Client or Admin Approval' : stage)).join(' → ')} → Release (when fully approved).</span>
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor="review-instructions">Review Instructions</label>
              <textarea id="review-instructions" className="form-textarea" rows={3} value={form.reviewInstructions} onChange={(event) => setField('reviewInstructions', event.target.value)} />
            </div>
            <div className="form-field span-2">
              <span className="form-label">Attachments</span>
              <label className="approvals-file-drop" htmlFor="review-attachments">
                <Paperclip aria-hidden="true" />
                <span><strong>Attach submission files</strong><small>File metadata is stored locally. Browser-selected files cannot be previewed after a refresh.</small></span>
                <input
                  id="review-attachments"
                  type="file"
                  multiple
                  className="approvals-file-input"
                  onChange={(event) => {
                    const next = Array.from(event.target.files || []).map((file) => ({
                      name: file.name,
                      type: file.name.split('.').pop()?.toUpperCase() || 'Document',
                      size: file.size,
                      assetPath: '',
                    }));
                    setAttachments((previous) => [...previous, ...next]);
                    event.target.value = '';
                  }}
                />
              </label>
              {attachments.length > 0 && (
                <ul className="approvals-form-attachments">
                  {attachments.map((attachment, index) => (
                    <li key={`${attachment.name}-${index}`}>
                      <FilePlus2 aria-hidden="true" />
                      <span><strong>{attachment.name}</strong><small>{attachment.type} · {attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : 'Reference only'}</small></span>
                      <button type="button" className="icon-btn" aria-label={`Remove ${attachment.name}`} onClick={() => setAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {Object.keys(errors).length > 0 && (
            <div className="approvals-form-error" role="alert">
              <AlertTriangle aria-hidden="true" />
              <span>Complete the required fields and select at least one applicable review stage.</span>
            </div>
          )}
        </section>

        <div className="approvals-form-actions">
          <div className="approvals-form-actions-note">
            <strong>{form.id}</strong>
            <span>Drafts do not enter the approval workflow. Submit for Review starts the Engineering stage.</span>
          </div>
          <div className="approvals-form-actions-buttons">
            <Button variant="ghost" onClick={() => navigate('/design-review')}>Cancel</Button>
            <Button variant="secondary" icon={Save} onClick={() => save(false)}>Save as Draft</Button>
            <Button icon={Send} onClick={() => save(true)}>Submit for Review</Button>
          </div>
        </div>
      </form>
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
