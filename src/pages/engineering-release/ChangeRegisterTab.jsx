import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  GitPullRequest,
  Pencil,
  Plus,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  Modal,
  SearchInput,
  Select,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useApprovals } from '../../context/ApprovalsContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  CHANGE_CATEGORIES,
  CHANGE_PRIORITIES,
  ECR_STATUSES,
  TODAY,
  engineeringTone,
  formatDate,
  nextRevision,
} from '../../data/engineeringReleaseData';
import { Fact, Toast, useToast } from './engineeringReleaseUi';

const blankForm = () => ({
  projectId: '',
  designId: '',
  designRevision: '',
  title: '',
  changeDescription: '',
  changeReason: '',
  changeCategory: 'Design Correction',
  changePriority: 'Medium',
  requestedBy: 'N. Joshi',
  requestedDate: TODAY,
  supportingDocuments: [],
  bomId: '',
  drawingId: '',
  impactedDrawings: [],
  manufacturingRefs: [],
  affectedParts: '',
  affectedAssemblies: '',
  initialAssessment: '',
  impactLevel: 'Medium',
  currentRevision: '',
  proposedRevision: '',
  currentBomRevision: '',
  proposedBomRevision: '',
  currentDrawingRevision: '',
  proposedDrawingRevision: '',
  firstRelease: false,
  sourceReviewId: '',
});

function nextId(value) {
  return nextRevision(value || 'A');
}

export default function ChangeRegisterTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    changes,
    ecos,
    manufacturingRecords,
    nextChangeId,
    addChange,
    updateEcr,
    submitEcr,
    saveImpact,
    decideEcr,
    removeDraft,
  } = useEngineeringRelease();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { designs } = useMechanical();
  const { projects } = useProjects();
  const { reviews } = useApprovals();
  const { toast, showToast, clearToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState('');
  const [viewTarget, setViewTarget] = useState(null);
  const [assessment, setAssessment] = useState({ impact: '', affectedParts: '', proposedBomRevision: '', proposedDrawingRevision: '', assessmentNotes: '' });
  const [ecrDecision, setEcrDecision] = useState({ reviewer: 'N. Joshi', comments: '' });

  const openNew = () => {
    const project = projects[0] || null;
    const design = designs.find((row) => row.projectId === project?.id) || null;
    const bom = boms.find((row) => row.projectId === project?.id && ['Approved', 'Released'].includes(row.status)) || null;
    const drawing = drawings.find((row) => row.projectId === project?.id && ['Approved', 'Released'].includes(row.approvalStatus)) || null;
    const base = {
      ...blankForm(),
      projectId: project?.id || '',
      designId: design?.id || '',
      designRevision: design?.revision || '',
      bomId: bom?.id || '',
      drawingId: drawing?.id || '',
      impactedDrawings: drawing ? [drawing.id] : [],
      currentRevision: design?.revision || drawing?.revision || '',
      proposedRevision: nextId(design?.revision || drawing?.revision || 'A'),
      currentBomRevision: bom?.revision || '',
      proposedBomRevision: bom ? nextId(bom.revision) : '',
      currentDrawingRevision: drawing?.revision || '',
      proposedDrawingRevision: drawing ? nextId(drawing.revision) : '',
      affectedParts: drawing ? `${drawing.partNumber} · ${drawing.partName}` : '',
      affectedAssemblies: drawing?.assemblyId || '',
    };
    setEditingId('');
    setForm(base);
    setFormError('');
    setFormOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openNew();
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
    const ecrParam = searchParams.get('ecr') || searchParams.get('change');
    if (ecrParam) {
      const target = changes.find((row) => row.id === ecrParam);
      if (target) setViewTarget(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!viewTarget) return;
    setAssessment({
      impact: viewTarget.initialAssessment || viewTarget.impact || '',
      affectedParts: viewTarget.affectedParts || '',
      proposedBomRevision: viewTarget.proposedBomRevision || '',
      proposedDrawingRevision: viewTarget.proposedDrawingRevision || '',
      assessmentNotes: viewTarget.assessmentNotes || '',
      assessedBy: viewTarget.requestedBy || viewTarget.raisedBy || 'N. Joshi',
    });
    setEcrDecision({ reviewer: 'N. Joshi', comments: '' });
  }, [viewTarget?.id]);

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFormError('');
  };

  const changeProject = (projectId) => {
    const design = designs.find((row) => row.projectId === projectId) || null;
    const bom = boms.find((row) => row.projectId === projectId && ['Approved', 'Released'].includes(row.status)) || null;
    const drawing = drawings.find((row) => row.projectId === projectId && ['Approved', 'Released'].includes(row.approvalStatus)) || null;
    setForm((previous) => ({
      ...previous,
      projectId,
      designId: design?.id || '',
      designRevision: design?.revision || '',
      bomId: bom?.id || '',
      drawingId: drawing?.id || '',
      impactedDrawings: drawing ? [drawing.id] : [],
      currentRevision: design?.revision || drawing?.revision || '',
      proposedRevision: nextId(design?.revision || drawing?.revision || 'A'),
      currentBomRevision: bom?.revision || '',
      proposedBomRevision: bom ? nextId(bom.revision) : '',
      currentDrawingRevision: drawing?.revision || '',
      proposedDrawingRevision: drawing ? nextId(drawing.revision) : '',
      affectedParts: drawing ? `${drawing.partNumber} · ${drawing.partName}` : '',
      affectedAssemblies: drawing?.assemblyId || '',
      manufacturingRefs: [],
      sourceReviewId: '',
    }));
  };

  const changeDesign = (designId) => {
    const design = designs.find((row) => row.id === designId);
    setForm((previous) => ({
      ...previous,
      designId,
      designRevision: design?.revision || '',
      currentRevision: design?.revision || previous.currentRevision,
      proposedRevision: design ? nextId(design.revision) : previous.proposedRevision,
    }));
  };

  const changeBom = (bomId) => {
    const bom = boms.find((row) => row.id === bomId);
    setForm((previous) => ({
      ...previous,
      bomId,
      currentBomRevision: bom?.revision || '',
      proposedBomRevision: bom ? nextId(bom.revision) : '',
    }));
  };

  const changeDrawing = (drawingId) => {
    const drawing = drawings.find((row) => row.id === drawingId);
    setForm((previous) => ({
      ...previous,
      drawingId,
      impactedDrawings: drawingId ? [drawingId] : [],
      currentDrawingRevision: drawing?.revision || '',
      proposedDrawingRevision: drawing ? nextId(drawing.revision) : '',
      affectedParts: drawing ? `${drawing.partNumber} · ${drawing.partName}` : previous.affectedParts,
      affectedAssemblies: drawing?.assemblyId || previous.affectedAssemblies,
    }));
  };

  const changeSourceReview = (reviewId) => {
    const review = reviews.find((row) => row.id === reviewId);
    const design = review?.designId ? designs.find((row) => row.id === review.designId) : designs.find((row) => row.projectId === review?.projectId);
    const bom = review?.bomId ? boms.find((row) => row.id === review.bomId) : boms.find((row) => row.projectId === review?.projectId && ['Approved', 'Released'].includes(row.status));
    const drawing = review?.drawingId ? drawings.find((row) => row.id === review.drawingId) : drawings.find((row) => row.projectId === review?.projectId && ['Approved', 'Released'].includes(row.approvalStatus));
    setForm((previous) => ({
      ...previous,
      sourceReviewId: reviewId,
      projectId: review?.projectId || previous.projectId,
      designId: design?.id || previous.designId,
      designRevision: design?.revision || previous.designRevision,
      bomId: bom?.id || previous.bomId,
      drawingId: drawing?.id || previous.drawingId,
      impactedDrawings: drawing ? [drawing.id] : previous.impactedDrawings,
      currentRevision: design?.revision || previous.currentRevision,
      proposedRevision: design ? nextId(design.revision) : previous.proposedRevision,
      currentBomRevision: bom?.revision || previous.currentBomRevision,
      proposedBomRevision: bom ? nextId(bom.revision) : previous.proposedBomRevision,
      currentDrawingRevision: drawing?.revision || previous.currentDrawingRevision,
      proposedDrawingRevision: drawing ? nextId(drawing.revision) : previous.proposedDrawingRevision,
    }));
  };

  const toggleDrawing = (drawingId) => {
    setForm((previous) => {
      const selected = previous.impactedDrawings.includes(drawingId)
        ? previous.impactedDrawings.filter((id) => id !== drawingId)
        : [...previous.impactedDrawings, drawingId];
      const primary = drawings.find((row) => row.id === selected[0]);
      return {
        ...previous,
        impactedDrawings: selected,
        drawingId: selected[0] || '',
        currentDrawingRevision: primary?.revision || '',
        proposedDrawingRevision: primary ? nextId(primary.revision) : '',
      };
    });
  };

  const toggleManufacturing = (key) => {
    setForm((previous) => {
      const exists = previous.manufacturingRefs.some((row) => `${row.kind}:${row.id}` === key);
      return {
        ...previous,
        manufacturingRefs: exists
          ? previous.manufacturingRefs.filter((row) => `${row.kind}:${row.id}` !== key)
          : [...previous.manufacturingRefs, manufacturingRecords.find((row) => `${row.kind}:${row.id}` === key)].filter(Boolean),
      };
    });
  };

  const addDocuments = (event) => {
    const names = [...event.target.files].map((file) => file.name);
    setForm((previous) => ({ ...previous, supportingDocuments: [...new Set([...previous.supportingDocuments, ...names])] }));
  };

  const buildRecord = () => ({
    ...form,
    title: form.title.trim(),
    changeDescription: form.changeDescription.trim() || form.changeReason.trim(),
    changeReason: form.changeReason.trim(),
    initialAssessment: form.initialAssessment.trim(),
    affectedParts: form.affectedParts.trim(),
    affectedAssemblies: form.affectedAssemblies.trim(),
    impactedDrawings: form.impactedDrawings,
    impactedManufacturingDocuments: form.manufacturingRefs.map((row) => ({
      kind: row.kind,
      id: row.id,
      label: `${row.id} · ${row.kindLabel}`,
      revision: row.revision,
    })),
    designRevision: form.designRevision,
    currentRevision: form.currentRevision,
    proposedRevision: form.proposedRevision.trim().toUpperCase(),
    currentBomRevision: form.currentBomRevision,
    proposedBomRevision: form.proposedBomRevision.trim().toUpperCase(),
    currentDrawingRevision: form.currentDrawingRevision,
    proposedDrawingRevision: form.proposedDrawingRevision.trim().toUpperCase(),
    raisedBy: form.requestedBy,
    raisedAt: form.requestedDate,
    changePriority: form.changePriority,
    impactLevel: form.changePriority,
    reviewer: 'N. Joshi',
  });

  const validate = (record) => {
    if (!record.projectId) return 'Project is required.';
    if (!record.title) return 'Change title is required.';
    if (!record.changeReason) return 'Change reason is required.';
    if (!record.changeCategory) return 'Change category is required.';
    if (!record.requestedBy) return 'Requested by is required.';
    if (!record.requestedDate) return 'Requested date is required.';
    if (!record.affectedParts) return 'Record the affected part or assembly.';
    if (!record.bomId || !record.impactedDrawings.length) return 'Link the impacted BOM and at least one drawing.';
    if (!record.proposedRevision || !record.proposedBomRevision || !record.proposedDrawingRevision) return 'Record the proposed design, BOM and drawing revisions.';
    return '';
  };

  const save = (submit) => {
    const record = buildRecord();
    const invalid = validate(record);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    if (editingId) {
      const result = updateEcr(editingId, record);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      showToast(`${editingId} updated.`);
      setFormOpen(false);
      return;
    }
    const result = addChange(record, { asDraft: !submit });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setFormOpen(false);
    showToast(submit ? `${result.id} created and submitted.` : `${result.id} saved as a draft.`);
    navigate(`/engineering-release?ecr=${result.id}`);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      ...blankForm(),
      ...row,
      title: row.title || '',
      changeDescription: row.changeDescription || '',
      initialAssessment: row.initialAssessment || '',
      impactedDrawings: row.impactedDrawings?.length ? row.impactedDrawings : row.drawingId ? [row.drawingId] : [],
      manufacturingRefs: (row.impactedManufacturingDocuments || [])
        .map((ref) => manufacturingRecords.find((item) => item.id === ref.id && item.kind === ref.kind) || ref)
        .filter(Boolean),
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = (row) => {
    const result = submitEcr(row.id, { by: row.requestedBy });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${row.id} submitted for impact assessment.`);
  };

  const deleteDraft = (row) => {
    const result = removeDraft(row.id);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${row.id} draft removed.`);
  };

  const saveAssessment = (row) => {
    const result = saveImpact(row.id, assessment);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${row.id} impact assessment saved.`);
  };

  const recordEcrDecision = (row, approve) => {
    const result = decideEcr(row.id, {
      decision: approve ? 'Approve' : 'Reject',
      reviewer: ecrDecision.reviewer,
      comments: ecrDecision.comments,
    });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(approve ? `${row.id} approved; an ECO can now be raised.` : `${row.id} rejected and preserved in the register.`);
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return changes.filter((row) => {
      if (statusFilter !== 'All' && row.status !== statusFilter) return false;
      if (projectFilter !== 'All' && row.projectId !== projectFilter) return false;
      if (categoryFilter !== 'All' && row.changeCategory !== categoryFilter) return false;
      if (priorityFilter !== 'All' && (row.changePriority || row.impactLevel) !== priorityFilter) return false;
      if (!query) return true;
      return [
        row.id,
        row.projectId,
        row.designId,
        row.title,
        row.changeDescription,
        row.changeReason,
        row.changeCategory,
        row.affectedParts,
        row.affectedAssemblies,
        row.requestedBy,
        row.raisedBy,
        row.bomId,
        row.drawingId,
        row.status,
      ].join(' ').toLowerCase().includes(query);
    });
  }, [changes, search, statusFilter, projectFilter, categoryFilter, priorityFilter]);

  const projectLabel = (projectId) => projects.find((row) => row.id === projectId)?.name || projectId;
  const designLabel = (row) => {
    const design = designs.find((item) => item.id === row.designId) || designs.find((item) => item.projectId === row.projectId);
    return design ? `${design.id} · ${design.name}` : row.designId || 'Not linked';
  };
  const designRevision = (row) => {
    const design = designs.find((item) => item.id === row.designId) || designs.find((item) => item.projectId === row.projectId);
    return row.designRevision || design?.revision || row.currentRevision || '—';
  };
  const linkedEco = (row) => ecos.find((eco) => eco.sourceEcrId === row.id || eco.id === row.ecoId);
  const projectDesigns = designs.filter((row) => row.projectId === form.projectId);
  const projectBoms = boms.filter((row) => row.projectId === form.projectId);
  const projectDrawings = drawings.filter((row) => row.projectId === form.projectId);
  const projectManufacturing = manufacturingRecords.filter(
    (row) => row.projectId === form.projectId && ['Approved', 'Released', 'Superseded'].includes(row.status),
  );
  const approvedReviews = reviews.filter((row) => ['Approved', 'Released'].includes(row.status));
  const activeView = viewTarget ? changes.find((row) => row.id === viewTarget.id) || viewTarget : null;
  const statusOptions = [...new Set([...ECR_STATUSES, ...changes.map((row) => row.status)])];

  return (
    <>
      <Toolbar
        left={
          <>
            <Select
              id="ecr-status-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All ECR Statuses' }, ...statusOptions.map((value) => ({ value, label: value }))]}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter ECRs by status"
            />
            <Select
              id="ecr-project-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All Projects' }, ...projects.map((row) => ({ value: row.id, label: row.id }))]}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              aria-label="Filter ECRs by project"
            />
            <Select
              id="ecr-category-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All Categories' }, ...CHANGE_CATEGORIES.map((value) => ({ value, label: value }))]}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter ECRs by category"
            />
            <Select
              id="ecr-priority-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All Priorities' }, ...CHANGE_PRIORITIES.map((value) => ({ value, label: value }))]}
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter ECRs by priority"
            />
            <span className="toolbar-count">{rows.length} ECRs</span>
          </>
        }
        right={
          <>
            <SearchInput id="ecr-search" value={search} onChange={setSearch} placeholder="Search ECR, project, design, part…" ariaLabel="Search engineering change requests" />
            <Button icon={Plus} size="sm" onClick={openNew}>New ECR</Button>
          </>
        }
      />

      <section className="table-card">
        <div className="approvals-card-head">
          <div><strong>Engineering Change Request Register</strong><p>Change requests are assessed and decided before a linked ECO can be raised.</p></div>
          <span className="approvals-count-chip"><GitPullRequest aria-hidden="true" /> {changes.length} ECRs</span>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'ECR Number', width: 110, sortable: true, render: (row) => <span className="cell-id">{row.id}</span> },
            { key: 'projectId', label: 'Project', width: 104, sortable: true },
            { key: 'designId', label: 'Mechanical Design', width: 210, render: (row) => <span className="cell-project"><span className="cell-strong">{designLabel(row)}</span><span className="cell-muted">Rev {designRevision(row)}</span></span> },
            { key: 'affectedParts', label: 'Part / Assembly', width: 190, render: (row) => <span className="cell-project"><span className="approvals-clip">{row.affectedParts}</span><span className="cell-muted approvals-clip">{row.affectedAssemblies}</span></span> },
            { key: 'title', label: 'Change Title', width: 220, sortable: true, render: (row) => <span className="cell-project"><span className="cell-strong approvals-clip">{row.title}</span><span className="cell-muted approvals-clip">{row.changeCategory}</span></span> },
            { key: 'changePriority', label: 'Priority', width: 82, render: (row) => row.changePriority || row.impactLevel },
            { key: 'requestedBy', label: 'Requested By', width: 110 },
            { key: 'requestedDate', label: 'Requested', width: 98, render: (row) => formatDate(row.requestedDate || row.raisedAt) },
            { key: 'ecrDecision', label: 'ECR Decision', width: 108, render: (row) => <StatusBadge status={row.ecrDecision || 'Pending'} tone={engineeringTone(row.ecrDecision)} /> },
            { key: 'eco', label: 'Linked ECO', width: 104, render: (row) => linkedEco(row)?.id || '—' },
            { key: 'status', label: 'Status', width: 142, sortable: true, render: (row) => <StatusBadge status={row.status} tone={engineeringTone(row.status)} /> },
          ]}
          rows={rows}
          className="mech-register-table"
          onRowClick={(row) => navigate(`/engineering-release/ecr/${row.id}`)}
          recordHref={(row) => `/engineering-release/ecr/${row.id}`}
          rowActions={(row) => [
            { key: 'view', label: 'View ECR details', icon: Eye },
            ...(['Draft', 'ECR Submitted'].includes(row.status) ? [{ key: 'edit', label: 'Edit ECR', icon: Pencil }] : []),
            ...(row.status === 'Draft' ? [{ key: 'submit', label: 'Submit ECR', icon: Send }] : []),
            ...(row.status === 'Draft' ? [{ key: 'delete', label: 'Delete draft', icon: Trash2 }] : []),
          ]}
          onRowAction={(key, row) => {
            if (key === 'view') navigate(`/engineering-release/ecr/${row.id}`);
            if (key === 'edit') openEdit(row);
            if (key === 'submit') submit(row);
            if (key === 'delete') deleteDraft(row);
          }}
          ariaLabel="Engineering change request register"
          emptyContent={<EmptyState icon={GitPullRequest} title="No ECRs" message="No engineering change requests match the current filters." />}
        />
      </section>
      <p className="mech-footnote">
        ECRs reference existing project, design, BOM, drawing and manufacturing records. Submitting or approving an ECR
        never changes a released revision.
      </p>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? `Edit ${editingId}` : 'New Engineering Change Request'}
        subtitle={editingId ? 'Edit the register fields before submission' : `${nextChangeId()} · ECR`}
        maxWidth="max-w-4xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            {!editingId && <Button variant="secondary" icon={FileText} onClick={() => save(false)}>Save Draft</Button>}
            <Button icon={GitPullRequest} onClick={() => save(!editingId)}>{editingId ? 'Save Changes' : 'Create & Submit'}</Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-project">Project <span className="req">*</span></label>
            <select id="ecr-project" className="form-select" value={form.projectId} onChange={(event) => changeProject(event.target.value)}>
              <option value="">Select project</option>
              {projects.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-source-review">Source Approved Review</label>
            <select id="ecr-source-review" className="form-select" value={form.sourceReviewId} onChange={(event) => changeSourceReview(event.target.value)}>
              <option value="">No linked design review</option>
              {approvedReviews.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.deliverableNumber} · {row.status}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-design">Mechanical Design</label>
            <select id="ecr-design" className="form-select" value={form.designId} onChange={(event) => changeDesign(event.target.value)}>
              <option value="">Select design</option>
              {projectDesigns.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.name} · Rev {row.revision}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-design-rev">Current Design Revision</label>
            <input id="ecr-design-rev" className="form-input" value={form.designRevision} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-title">Change Title <span className="req">*</span></label>
            <input id="ecr-title" className="form-input" value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="Short description of the required change" />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-category">Change Category <span className="req">*</span></label>
            <select id="ecr-category" className="form-select" value={form.changeCategory} onChange={(event) => setField('changeCategory', event.target.value)}>
              {CHANGE_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="ecr-description">Change Description <span className="req">*</span></label>
            <textarea id="ecr-description" className="form-textarea" rows={3} value={form.changeDescription} onChange={(event) => setField('changeDescription', event.target.value)} />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="ecr-reason">Change Reason <span className="req">*</span></label>
            <textarea id="ecr-reason" className="form-textarea" rows={3} value={form.changeReason} onChange={(event) => setField('changeReason', event.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-priority">Change Priority</label>
            <select id="ecr-priority" className="form-select" value={form.changePriority} onChange={(event) => setField('changePriority', event.target.value)}>
              {CHANGE_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-requested-by">Requested By <span className="req">*</span></label>
            <input id="ecr-requested-by" className="form-input" value={form.requestedBy} onChange={(event) => setField('requestedBy', event.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-requested-date">Requested Date <span className="req">*</span></label>
            <input id="ecr-requested-date" type="date" className="form-input" value={form.requestedDate} onChange={(event) => setField('requestedDate', event.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-impact-level">Impact Level</label>
            <select id="ecr-impact-level" className="form-select" value={form.impactLevel} onChange={(event) => setField('impactLevel', event.target.value)}>
              {CHANGE_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="ecr-parts">Part / Assembly <span className="req">*</span></label>
            <input id="ecr-parts" className="form-input" value={form.affectedParts} onChange={(event) => setField('affectedParts', event.target.value)} />
            <input className="form-input" value={form.affectedAssemblies} onChange={(event) => setField('affectedAssemblies', event.target.value)} placeholder="Affected assembly reference" aria-label="Affected assembly" />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-bom">Impacted BOM</label>
            <select id="ecr-bom" className="form-select" value={form.bomId} onChange={(event) => changeBom(event.target.value)}>
              <option value="">Select BOM</option>
              {projectBoms.map((row) => <option key={row.id} value={row.id}>{row.id} · Rev {row.revision} · {row.status}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-drawing">Primary Impacted Drawing</label>
            <select id="ecr-drawing" className="form-select" value={form.drawingId} onChange={(event) => changeDrawing(event.target.value)}>
              <option value="">Select drawing</option>
              {projectDrawings.map((row) => <option key={row.id} value={row.id}>{row.id} · {row.drawingNumber} · Rev {row.revision}</option>)}
            </select>
          </div>
          <div className="form-field span-2">
            <span className="form-label">Additional Impacted Drawings</span>
            <div className="approvals-stage-options">
              {projectDrawings.filter((row) => ['Approved', 'Released', 'Superseded'].includes(row.approvalStatus)).map((row) => (
                <label key={row.id} className="approvals-stage-option">
                  <input type="checkbox" checked={form.impactedDrawings.includes(row.id)} onChange={() => toggleDrawing(row.id)} />
                  <span><strong>{row.id} · {row.drawingNumber}</strong><small>Rev {row.revision} · {row.approvalStatus}</small></span>
                </label>
              ))}
              {!projectDrawings.length && <span className="cell-muted">No drawings are linked to this project.</span>}
            </div>
          </div>
          <div className="form-field span-2">
            <span className="form-label">Impacted Manufacturing Documents</span>
            <div className="approvals-stage-options">
              {projectManufacturing.map((row) => (
                <label key={`${row.kind}:${row.id}`} className="approvals-stage-option">
                  <input type="checkbox" checked={form.manufacturingRefs.some((item) => item.kind === row.kind && item.id === row.id)} onChange={() => toggleManufacturing(`${row.kind}:${row.id}`)} />
                  <span><strong>{row.id} · {row.kindLabel}</strong><small>Rev {row.revision} · {row.status}</small></span>
                </label>
              ))}
              {!projectManufacturing.length && <span className="cell-muted">No approved manufacturing records are linked to this project.</span>}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-current">Current Design Revision</label>
            <input id="ecr-current" className="form-input" value={form.currentRevision} onChange={(event) => setField('currentRevision', event.target.value.toUpperCase())} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-proposed">Proposed Design Revision</label>
            <input id="ecr-proposed" className="form-input" value={form.proposedRevision} onChange={(event) => setField('proposedRevision', event.target.value.toUpperCase())} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-bom-current">Current BOM Revision</label>
            <input id="ecr-bom-current" className="form-input" value={form.currentBomRevision} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-bom-proposed">Proposed BOM Revision</label>
            <input id="ecr-bom-proposed" className="form-input" value={form.proposedBomRevision} onChange={(event) => setField('proposedBomRevision', event.target.value.toUpperCase())} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-drawing-current">Current Drawing Revision</label>
            <input id="ecr-drawing-current" className="form-input" value={form.currentDrawingRevision} readOnly />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="ecr-drawing-proposed">Proposed Drawing Revision</label>
            <input id="ecr-drawing-proposed" className="form-input" value={form.proposedDrawingRevision} onChange={(event) => setField('proposedDrawingRevision', event.target.value.toUpperCase())} />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="ecr-assessment">Initial Assessment</label>
            <textarea id="ecr-assessment" className="form-textarea" rows={3} value={form.initialAssessment} onChange={(event) => setField('initialAssessment', event.target.value)} placeholder="Preliminary assessment of design, manufacturing and documentation impact." />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="ecr-documents">Supporting Documents</label>
            <input id="ecr-documents" type="file" multiple className="form-input" onChange={addDocuments} />
            {form.supportingDocuments.length > 0 && <span className="form-hint">{form.supportingDocuments.join(' · ')}</span>}
          </div>
          {formError && <p className="form-error span-2" role="alert">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title={activeView?.id || 'ECR Details'}
        subtitle={activeView?.title || ''}
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setViewTarget(null)}>Close</Button>
            {activeView && ['Draft', 'ECR Submitted'].includes(activeView.status) && <Button variant="secondary" icon={Pencil} onClick={() => { const row = activeView; setViewTarget(null); openEdit(row); }}>Edit</Button>}
            {activeView?.status === 'Draft' && <Button icon={Send} onClick={() => submit(activeView)}>Submit ECR</Button>}
          </>
        }
      >
        {activeView && (
          <>
            <div className="fact-grid">
              <Fact label="Project">{activeView.projectId} · {projectLabel(activeView.projectId)}</Fact>
              <Fact label="Mechanical Design">{designLabel(activeView)}</Fact>
              <Fact label="Current Design Revision">{designRevision(activeView)}</Fact>
              <Fact label="Part / Assembly">{activeView.affectedParts || 'Not recorded'}</Fact>
              <Fact label="Change Category">{activeView.changeCategory}</Fact>
              <Fact label="Change Priority">{activeView.changePriority || activeView.impactLevel}</Fact>
              <Fact label="Requested By">{activeView.requestedBy || activeView.raisedBy}</Fact>
              <Fact label="Requested Date">{formatDate(activeView.requestedDate || activeView.raisedAt)}</Fact>
              <Fact label="Status">{activeView.status}</Fact>
              <Fact label="ECR Decision">{activeView.ecrDecision || 'Pending'}</Fact>
              <Fact label="Linked ECO">{linkedEco(activeView)?.id || 'Not created'}</Fact>
              <Fact label="Source Review">{activeView.sourceReviewId || 'Not linked'}</Fact>
            </div>
            <div className="approvals-text-block">
              <h4>Change Description</h4><p>{activeView.changeDescription || activeView.changeReason}</p>
              <h4>Change Reason</h4><p>{activeView.changeReason}</p>
              <h4>Initial Assessment</h4><p>{activeView.initialAssessment || 'Not recorded.'}</p>
              <h4>Impacted Records</h4>
              <p>BOM: {activeView.bomId || '—'} · Rev {activeView.currentBomRevision || '—'} → {activeView.proposedBomRevision || '—'}</p>
              <p>Drawings: {(activeView.impactedDrawings || [activeView.drawingId]).filter(Boolean).join(', ') || '—'}</p>
              <p>Manufacturing: {(activeView.impactedManufacturingDocuments || []).map((row) => `${row.id} (${row.kind})`).join(', ') || '—'}</p>
              <p>Supporting documents: {(activeView.supportingDocuments || []).join(', ') || '—'}</p>
            </div>

            {['ECR Submitted', 'Impact Assessment'].includes(activeView.status) && (
              <section className="approvals-subsection">
                <h4>Impact Assessment & ECR Decision</h4>
                <div className="form-grid">
                  <div className="form-field span-2">
                    <label className="form-label" htmlFor="ecr-impact">Impact Assessment</label>
                    <textarea id="ecr-impact" className="form-textarea" rows={3} value={assessment.impact} onChange={(event) => setAssessment((previous) => ({ ...previous, impact: event.target.value }))} disabled={activeView.status === 'Impact Assessment'} />
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label" htmlFor="ecr-impact-parts">Affected Parts / Assemblies</label>
                    <input id="ecr-impact-parts" className="form-input" value={assessment.affectedParts} onChange={(event) => setAssessment((previous) => ({ ...previous, affectedParts: event.target.value }))} disabled={activeView.status === 'Impact Assessment'} />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="ecr-impact-bom">Proposed BOM Revision</label>
                    <input id="ecr-impact-bom" className="form-input" value={assessment.proposedBomRevision} onChange={(event) => setAssessment((previous) => ({ ...previous, proposedBomRevision: event.target.value.toUpperCase() }))} disabled={activeView.status === 'Impact Assessment'} />
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="ecr-impact-drawing">Proposed Drawing Revision</label>
                    <input id="ecr-impact-drawing" className="form-input" value={assessment.proposedDrawingRevision} onChange={(event) => setAssessment((previous) => ({ ...previous, proposedDrawingRevision: event.target.value.toUpperCase() }))} disabled={activeView.status === 'Impact Assessment'} />
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label" htmlFor="ecr-impact-notes">Assessment Notes</label>
                    <textarea id="ecr-impact-notes" className="form-textarea" rows={2} value={assessment.assessmentNotes} onChange={(event) => setAssessment((previous) => ({ ...previous, assessmentNotes: event.target.value }))} disabled={activeView.status === 'Impact Assessment'} />
                  </div>
                  {activeView.status === 'ECR Submitted' && (
                    <div className="approvals-detail-actions span-2">
                      <Button icon={ClipboardCheck} onClick={() => saveAssessment(activeView)}>Save Impact Assessment</Button>
                    </div>
                  )}
                </div>
                {activeView.status === 'Impact Assessment' && (
                  <div className="form-grid">
                    <Select label="ECR Reviewer" id="ecr-reviewer" options={['N. Joshi', 'A. Iyer', 'S. Menon', 'K. Pillai'].map((value) => ({ value, label: value }))} value={ecrDecision.reviewer} onChange={(event) => setEcrDecision((previous) => ({ ...previous, reviewer: event.target.value }))} />
                    <div className="form-field">
                      <label className="form-label" htmlFor="ecr-decision-date">Decision Date</label>
                      <input id="ecr-decision-date" className="form-input" value={formatDate(TODAY)} readOnly />
                    </div>
                    <div className="form-field span-2">
                      <label className="form-label" htmlFor="ecr-decision-comments">Decision Comments / Rejection Reason</label>
                      <textarea id="ecr-decision-comments" className="form-textarea" rows={3} value={ecrDecision.comments} onChange={(event) => setEcrDecision((previous) => ({ ...previous, comments: event.target.value }))} />
                    </div>
                    <div className="approvals-detail-actions span-2">
                      <Button icon={CheckCircle2} onClick={() => recordEcrDecision(activeView, true)}>Approve ECR</Button>
                      <Button variant="secondary" icon={XCircle} onClick={() => recordEcrDecision(activeView, false)}>Reject ECR</Button>
                    </div>
                  </div>
                )}
              </section>
            )}
            <h4>ECR History</h4>
            <ul className="approvals-timeline">
              {(activeView.history || []).map((entry) => (
                <li key={entry.id}>
                  <span className="approvals-timeline-dot" aria-hidden="true" />
                  <div>
                    <div className="approvals-timeline-head"><strong>{entry.action}</strong><span>{entry.at}</span></div>
                    <span className="approvals-timeline-stage">{entry.stage} · {entry.by}{entry.statusAfter ? ` · ${entry.statusAfter}` : ''}</span>
                    {entry.comments && <p>{entry.comments}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
