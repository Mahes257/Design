import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Cog,
  FilePlus2,
  FolderKanban,
  ListChecks,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '../../components/common';
import { useProjects } from '../../context/ProjectsContext';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import {
  ENGINEERS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TODAY,
  addDays,
  daysBetween,
  formatDate,
} from '../../data/projectData';

const DOMAIN_OPTIONS = [
  'Machine Design',
  'Product Design',
  'Fabrication Design',
  'Sheet Metal Design',
  'Piping Design',
  'Equipment Design',
  'Automotive Components',
  'Other',
];

const CPR_STATUSES = [
  'Not Started',
  'Draft',
  'Submitted for Review',
  'Approved',
  'On Hold',
];

const DELIVERABLES = [
  'Concept Design',
  '2D Drawings',
  '3D CAD Models',
  'Engineering Calculations',
  'Analysis Reports',
  'Manufacturing Drawings',
  'Engineering BOM',
  'Cost Estimation',
  'Technical Documentation',
];

const ATTACHMENT_GROUPS = [
  {
    key: 'customer-drawings',
    label: 'Customer Drawings',
    hint: 'GA drawings · Interface drawings · Envelope sheets',
  },
  {
    key: 'reference-cad',
    label: 'Reference CAD Files',
    hint: 'STEP · IGES · Native CAD references',
  },
  {
    key: 'specifications',
    label: 'Technical Specifications',
    hint: 'Customer specifications · Standards · Datasheets',
  },
  {
    key: 'pdf',
    label: 'PDF Documents',
    hint: 'Approved reports · Purchase documents · Meeting minutes',
  },
  {
    key: 'images',
    label: 'Reference Images',
    hint: 'Site photos · Product samples · Sketches',
  },
  {
    key: 'supporting',
    label: 'Other Supporting Documents',
    hint: 'Calculations · Checklists · Correspondence',
  },
];

function initialForm() {
  return {
    name: '',
    reference: '',
    customer: '',
    department: '',
    product: '',
    sourceEnquiryId: '',
    sourceQuotationId: '',
    sourceQuotationInternalId: '',
    sourceQuotationRevision: '',
    status: 'New Request',
    description: '',
    domain: 'Machine Design',
    type: 'New Design',
    priority: 'Medium',
    scope: '',
    technicalRequirements: '',
    constraints: '',
    expectedDeliverables: '',
    start: TODAY,
    target: addDays(TODAY, 90),
    manager: 'R. Kulkarni',
    reviewer: 'N. Joshi',
    analysisEngineer: 'A. Iyer',
    manufacturingEngineer: 'K. Pillai',
    engineers: [],
    members: [],
    deliverables: [],
    attachments: [],
    cprReference: '',
    cprStatus: 'Not Started',
    cprOwner: '',
    cprReviewDate: '',
    cprNotes: '',
  };
}

function formFromProject(project) {
  return {
    name: project.name || '',
    reference: project.reference || '',
    customer: project.customer || '',
    department: project.department || '',
    product: project.product || '',
    sourceEnquiryId: project.sourceEnquiryId || '',
    sourceQuotationId: project.sourceQuotationId || '',
    sourceQuotationInternalId: project.sourceQuotationInternalId || '',
    sourceQuotationRevision: project.sourceQuotationRevision || '',
    status: project.status || 'Draft',
    description: project.description || '',
    domain: project.domain || 'Machine Design',
    type: project.type || 'New Design',
    priority: project.priority || 'Medium',
    scope: project.scope || '',
    technicalRequirements: project.technicalRequirements || '',
    constraints: project.constraints || '',
    expectedDeliverables: project.expectedDeliverables || '',
    start: project.start || TODAY,
    target: project.target || addDays(TODAY, 90),
    manager: project.manager || 'R. Kulkarni',
    reviewer: project.reviewer || 'N. Joshi',
    analysisEngineer: project.analysisEngineer || 'A. Iyer',
    manufacturingEngineer: project.manufacturingEngineer || 'K. Pillai',
    engineers: Array.isArray(project.engineers) ? project.engineers : [],
    members: Array.isArray(project.members) ? project.members : [],
    deliverables: Array.isArray(project.deliverables) ? project.deliverables : [],
    attachments: (project.attachmentFiles || []).map((file, index) => ({
      id: `saved-${index}-${file.name}`,
      category: file.category,
      name: file.name,
      size: file.size,
    })),
    cprReference: project.cprReference || '',
    cprStatus: project.cprStatus || 'Not Started',
    cprOwner: project.cprOwner || '',
    cprReviewDate: project.cprReviewDate || '',
    cprNotes: project.cprNotes || '',
  };
}

function bumpId(id) {
  const parts = id.split('-');
  const numeric = Number(parts[parts.length - 1]);
  if (!Number.isFinite(numeric)) return id;
  return [...parts.slice(0, -1), String(numeric + 1).padStart(3, '0')].join('-');
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function teamDiscipline(domain) {
  if (domain === 'Sheet Metal Design') return 'Sheet Metal';
  if (domain === 'Piping Design') return 'Piping';
  return 'Mechanical';
}

/**
 * New Project form — two-column create layout:
 *   left  · sections A–E, then the action row
 *   right · project attachments panel (six categories)
 * Files are only listed in local state; nothing is uploaded anywhere.
 */
export default function NewProjectForm({ project = null } = {}) {
  const navigate = useNavigate();
  const { team, projects, addProject, updateProject, addMember, nextProjectId } = useProjects();
  const { markConverted } = useEnquiryRequests();

  const draftMode = Boolean(project) && project.status === 'Draft';
  const [projectId, setProjectId] = useState(() => project?.id || nextProjectId());
  const [form, setForm] = useState(() => (project ? formFromProject(project) : initialForm()));
  const [initialSnapshot] = useState(() =>
    JSON.stringify(project ? formFromProject(project) : initialForm()),
  );
  const lastSavedRef = useRef(initialSnapshot);
  const [openSections, setOpenSections] = useState({
    info: true,
    cpr: true,
    engineering: true,
    schedule: true,
    team: true,
    deliverables: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [memberDraft, setMemberDraft] = useState('V. Sharma');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saveState, setSaveState] = useState(draftMode ? 'saved' : '');
  const [confirmCreate, setConfirmCreate] = useState(false);
  const finalizedRef = useRef(false);

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const toggleInList = (key, value) =>
    setForm((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((item) => item !== value)
        : [...previous[key], value],
    }));

  const durationLabel = useMemo(() => {
    if (!form.start || !form.target) return '—';
    const days = daysBetween(form.start, form.target);
    if (days < 0) return 'Check dates';
    if (days === 0) return 'Same day';
    return `${days} days · ${Math.round((days / 7) * 10) / 10} weeks`;
  }, [form.start, form.target]);

  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const isDirty = JSON.stringify(form) !== initialSnapshot;
  const totalAttachments = form.attachments.length;

  const validateAll = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Project name is required.';
    if (!form.customer.trim() && !form.department.trim()) {
      next.customer = 'Customer or department is required.';
    }
    if (!form.manager) next.manager = 'Select a project manager.';
    if (!form.start) next.start = 'Planned start date is required.';
    if (!form.target) next.target = 'Target completion date is required.';
    if (form.start && form.target && form.target < form.start) {
      next.target = 'Target date cannot be earlier than the start date.';
    }
    return next;
  };

  const buildRecord = (status, values = form) => ({
    ...(project || {}),
    id: projectId,
    name: values.name.trim(),
    reference: values.reference.trim() || project?.reference || '',
    customer: values.customer.trim(),
    department: values.department.trim(),
    product: values.product.trim() || values.name.trim(),
    sourceEnquiryId: values.sourceEnquiryId.trim(),
    sourceQuotationId: values.sourceQuotationId.trim(),
    sourceQuotationInternalId: values.sourceQuotationInternalId.trim(),
    sourceQuotationRevision: values.sourceQuotationRevision.trim(),
    cprReference: values.cprReference.trim(),
    cprStatus: values.cprStatus,
    cprOwner: values.cprOwner,
    cprReviewDate: values.cprReviewDate,
    cprNotes: values.cprNotes.trim(),
    description: values.description.trim(),
    domain: values.domain,
    scope: values.scope.trim(),
    technicalRequirements: values.technicalRequirements.trim(),
    constraints: values.constraints.trim(),
    expectedDeliverables: values.expectedDeliverables.trim(),
    type: values.type,
    priority: values.priority,
    manager: values.manager,
    reviewer: values.reviewer,
    analysisEngineer: values.analysisEngineer,
    manufacturingEngineer: values.manufacturingEngineer,
    engineers: values.engineers,
    members: values.members,
    deliverables: values.deliverables,
    start: values.start || TODAY,
    target: values.target || addDays(TODAY, 90),
    progress: 0,
    status: status || values.status || 'New Request',
    delayed: false,
    archived: false,
    attachments: values.attachments.length,
    attachmentFiles: values.attachments.map(({ category, name, size }) => ({ category, name, size })),
  });

  // Draft auto-save: every edit of an existing draft is persisted shortly after typing.
  useEffect(() => {
    if (!draftMode) return undefined;
    const serialized = JSON.stringify(form);
    if (serialized === lastSavedRef.current) return undefined;
    setSaveState('saving');
    const timer = setTimeout(() => {
      updateProject(project.id, buildRecord('Draft'), { silent: true });
      lastSavedRef.current = serialized;
      setSaveState('saved');
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, draftMode, project?.id]);

  // Leaving the draft before the debounce fires must not lose the latest edits.
  const latestFormRef = useRef(form);
  latestFormRef.current = form;
  useEffect(() => {
    if (!draftMode) return undefined;
    return () => {
      if (finalizedRef.current) return;
      const values = latestFormRef.current;
      if (JSON.stringify(values) === lastSavedRef.current) return;
      updateProject(project.id, buildRecord('Draft', values), { silent: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftMode, project?.id]);

  const persistTeam = (record) => {
    if (team.some((member) => member.projectId === record.id)) return;
    const rows = [
      { name: record.manager, role: 'Project Manager' },
      ...record.engineers.map((name) => ({ name, role: 'Design Engineer' })),
      { name: record.reviewer, role: 'Technical Reviewer' },
      { name: record.analysisEngineer, role: 'Design Engineer' },
      { name: record.manufacturingEngineer, role: 'Design Engineer' },
      ...record.members.map((name) => ({ name, role: 'Team Member' })),
    ].filter((row, index, list) => row.name && list.findIndex((item) => item.name === row.name) === index);

    const highest = team.reduce((max, row) => {
      const numeric = Number(String(row.id).split('-').pop());
      return Number.isFinite(numeric) && numeric > max ? numeric : max;
    }, 100);

    rows.forEach((row, index) => {
      addMember({
        id: `TM-${highest + index + 1}`,
        name: row.name,
        role: row.role,
        discipline: teamDiscipline(record.domain),
        projectId: record.id,
        responsibilities:
          row.role === 'Project Manager'
            ? 'Project planning, customer interface and design sign-off'
            : `Assigned to ${record.name}`,
        allocation: row.role === 'Project Manager' ? 40 : 50,
      });
    });
  };

  const persistProject = (status) => {
    const record = buildRecord(status);
    if (project) {
      updateProject(project.id, record, { silent: true });
    } else {
      addProject(record);
    }
    persistTeam(record);
    return record;
  };

  const resetForm = () => {
    setForm(initialForm());
    setErrors({});
  };

  const showError = (message, nextErrors) => {
    setErrors(nextErrors);
    setBanner({ tone: 'error', message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Project name is required to identify the draft.';
    if (!form.customer.trim() && !form.department.trim()) {
      next.customer = 'Customer or department is required for the draft record.';
    }
    if (Object.keys(next).length > 0) {
      showError('Add a project name and customer or department before saving the draft.', next);
      return;
    }

    const record = persistProject('Draft');
    lastSavedRef.current = JSON.stringify(form);
    setSaveState('saved');
    setBanner({
      tone: 'success',
      message: project
        ? `Draft ${record.id} saved. Status remains Draft until Create Project is confirmed.`
        : `Draft ${record.id} saved with Draft status. It is listed in Project List and can be edited or submitted later.`,
      draftId: project ? undefined : record.id,
    });
    if (!project) {
      resetForm();
      setProjectId(bumpId(record.id));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveProject = (mode) => {
    const next = validateAll();
    if (Object.keys(next).length > 0) {
      showError('Complete the required project fields before saving.', next);
      return;
    }

    const nextStatus = draftMode
      ? 'New Request'
      : form.status === 'Draft'
        ? 'New Request'
        : form.status || 'New Request';

    // A request can only own one project: an existing draft is promoted in place.
    if (project && projects.some((row) => row.id === project.id && row.status !== 'Draft')) {
      showError('This project has already been created.', {});
      return;
    }

    finalizedRef.current = true;
    const record = persistProject(nextStatus);

    if (record.sourceRequestId) {
      const result = markConverted(record.sourceRequestId, record.id);
      if (result?.error) {
        showError(result.error, {});
        return;
      }
    }

    navigate(`/projects/all-projects/${record.id}`);
  };

  const requestCancel = () => {
    if (draftMode) {
      // Leaving a draft keeps it: persist the latest edits before returning.
      updateProject(project.id, buildRecord('Draft'), { silent: true });
      navigate('/projects');
      return;
    }
    if (isDirty) {
      setConfirmCancel(true);
      return;
    }
    navigate('/projects/all-projects');
  };

  const addFiles = (category, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setForm((previous) => ({
      ...previous,
      attachments: [
        ...previous.attachments,
        ...files.map((file, index) => ({
          id: `${Date.now()}-${index}-${file.name}`,
          category,
          name: file.name,
          size: file.size,
        })),
      ],
    }));
  };

  const removeAttachment = (id) =>
    setForm((previous) => ({
      ...previous,
      attachments: previous.attachments.filter((file) => file.id !== id),
    }));

  const addTeamMember = () => {
    const name = memberDraft;
    if (!name) return;
    setForm((previous) =>
      previous.members.includes(name)
        ? previous
        : { ...previous, members: [...previous.members, name] },
    );
  };

  const sectionCard = (key, icon, title, subtitle, body) => {
    const Icon = icon;
    const open = openSections[key];
    return (
      <section className={`form-section-card${open ? ' is-open' : ''}`} key={key}>
        <button
          type="button"
          className="form-section-head"
          aria-expanded={open}
          onClick={() => toggleSection(key)}
        >
          <span className="form-section-icon" aria-hidden="true">
            <Icon />
          </span>
          <span className="form-section-text">
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </span>
          <ChevronDown className="form-section-chevron" aria-hidden="true" />
        </button>
        {open && <div className="form-section-body">{body}</div>}
      </section>
    );
  };

  return (
    <>
      {banner && (
        <div className={`form-banner ${banner.tone}`} role="status">
          {banner.tone === 'success' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
          <span>
            {banner.message}
            {banner.draftId && (
              <button
                type="button"
                className="form-banner-action"
                onClick={() => navigate('/projects/all-projects')}
              >
                Open Project List <ArrowRight aria-hidden="true" />
              </button>
            )}
          </span>
        </div>
      )}

      <form
        className="np-layout"
        onSubmit={(event) => {
          event.preventDefault();
          if (draftMode) {
            const next = validateAll();
            if (Object.keys(next).length > 0) {
              showError('Complete the required project fields before creating the project.', next);
              return;
            }
            setConfirmCreate(true);
            return;
          }
          saveProject('save');
        }}
        noValidate
      >
        <div className="np-main">
          {project?.sourceRequestId && (
            <section className="np-source-banner">
              <div className="np-source-main">
                <span className={`status-pill ${draftMode ? 'tone-gray' : 'tone-green'}`}>
                  {project.status}
                </span>
                <div>
                  <strong>Source Request {project.sourceRequestId}</strong>
                  <span>
                    {project.sourceRequestSource || project.source || 'Request'}
                    {project.sourceRequestCategory ? ` · ${project.sourceRequestCategory}` : ''}
                    {project.sourceRequestRequester ? ` · ${project.sourceRequestRequester}` : ''}
                  </span>
                </div>
              </div>
              <div className="np-source-actions">
                {draftMode && (
                  <span className={`np-save-state is-${saveState || 'saved'}`} role="status">
                    {saveState === 'saving' ? 'Saving…' : 'All changes saved'}
                  </span>
                )}
                <Link className="qr-inline-link" to={`/customer-sales/requests/${project.sourceRequestId}`}>
                  Open Source Request
                </Link>
              </div>
            </section>
          )}

          {sectionCard(
            'info',
            FolderKanban,
            'Project Information',
            'Identification, customer and product details',
            <div className="form-grid">
              <div className="form-field">
                <span className="form-label">Project ID</span>
                <span className="form-static">{projectId}</span>
              </div>
              <Input
                id="np-project-name"
                label="Project Name"
                placeholder="e.g. Conveyor Drive Assembly"
                value={form.name}
                hint={errors.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setField('name', event.target.value)}
              />
              <Input
                id="np-reference"
                label="Project Reference"
                placeholder="Customer / internal reference"
                value={form.reference}
                onChange={(event) => setField('reference', event.target.value)}
              />
              <Input
                id="np-customer"
                label="Customer"
                placeholder="Customer name"
                value={form.customer}
                hint={errors.customer}
                aria-invalid={Boolean(errors.customer)}
                onChange={(event) => setField('customer', event.target.value)}
              />
              <Input
                id="np-department"
                label="Department"
                placeholder="Requesting department (internal requests)"
                value={form.department}
                onChange={(event) => setField('department', event.target.value)}
              />
              <Input
                id="np-product"
                label="Product / Machine Name"
                placeholder="e.g. Belt Conveyor Drive Unit"
                value={form.product}
                onChange={(event) => setField('product', event.target.value)}
              />
              <Input
                id="np-enquiry-id"
                label="Enquiry ID"
                placeholder="e.g. ENQ-2026-043"
                value={form.sourceEnquiryId}
                onChange={(event) => setField('sourceEnquiryId', event.target.value)}
              />
              <Input
                id="np-quotation-id"
                label="Accepted Quotation ID"
                placeholder="e.g. QTN-2026-018"
                value={form.sourceQuotationId}
                onChange={(event) => setField('sourceQuotationId', event.target.value)}
              />
              <Select
                id="np-status"
                label="Project Status"
                options={['Draft', ...PROJECT_STATUSES, 'On Hold', 'Cancelled'].map((status) => ({
                  value: status,
                  label: status,
                }))}
                value={form.status}
                onChange={(event) => setField('status', event.target.value)}
              />
              <div className="form-grid-full">
                <Textarea
                  id="np-description"
                  label="Project Description"
                  rows={3}
                  placeholder="What is being designed, for which application and under what constraints"
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                />
              </div>
              <p className="form-note form-grid-full">
                Enquiry and quotation references are optional for internal projects and are preserved
                automatically when a project is initiated from an accepted quotation.
              </p>
            </div>,
          )}

          {sectionCard(
            'cpr',
            ClipboardCheck,
            'CPR Details',
            'Integration-ready project readiness information for the future CPR module',
            <div className="form-grid">
              <Input
                id="np-cpr-reference"
                label="CPR Reference"
                placeholder="e.g. CPR-2026-014"
                value={form.cprReference}
                onChange={(event) => setField('cprReference', event.target.value)}
              />
              <Select
                id="np-cpr-status"
                label="CPR Status"
                options={CPR_STATUSES.map((status) => ({ value: status, label: status }))}
                value={form.cprStatus}
                onChange={(event) => setField('cprStatus', event.target.value)}
              />
              <Select
                id="np-cpr-owner"
                label="CPR Owner"
                options={[
                  { value: '', label: 'Assign CPR owner' },
                  ...ENGINEERS.map((engineer) => ({ value: engineer, label: engineer })),
                ]}
                value={form.cprOwner}
                onChange={(event) => setField('cprOwner', event.target.value)}
              />
              <Input
                id="np-cpr-review-date"
                label="CPR Review Date"
                type="date"
                value={form.cprReviewDate}
                onChange={(event) => setField('cprReviewDate', event.target.value)}
              />
              <div className="form-grid-full">
                <Textarea
                  id="np-cpr-notes"
                  label="CPR Details / Notes"
                  rows={3}
                  placeholder="Record project readiness inputs, dependencies and review notes for future CPR integration"
                  value={form.cprNotes}
                  onChange={(event) => setField('cprNotes', event.target.value)}
                />
              </div>
              <p className="form-note form-grid-full np-cpr-note">
                <ClipboardCheck aria-hidden="true" />
                Placeholder CPR section: fields are stored with the project record and are ready for
                the future CPR module. No CPR workflow or external integration is created in this task.
              </p>
            </div>,
          )}

          {sectionCard(
            'engineering',
            Cog,
            'Engineering Information',
            'Domain, scope, technical requirements and constraints',
            <div className="form-grid">
              <Select
                id="np-domain"
                label="Engineering Domain"
                options={DOMAIN_OPTIONS.map((domain) => ({ value: domain, label: domain }))}
                value={form.domain}
                onChange={(event) => setField('domain', event.target.value)}
              />
              <Select
                id="np-type"
                label="Project Type"
                options={PROJECT_TYPES.map((type) => ({ value: type, label: type }))}
                value={form.type}
                onChange={(event) => setField('type', event.target.value)}
              />
              <Select
                id="np-priority"
                label="Priority"
                options={PROJECT_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: priority,
                }))}
                value={form.priority}
                onChange={(event) => setField('priority', event.target.value)}
              />
              <div className="form-grid-full">
                <Textarea
                  id="np-scope"
                  label="Project Scope"
                  rows={3}
                  placeholder="Design envelope, standards, exclusions and interfaces"
                  value={form.scope}
                  onChange={(event) => setField('scope', event.target.value)}
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="np-technical-requirements"
                  label="Technical Requirements"
                  rows={3}
                  placeholder="Load cases, duty class, tolerances, codes and calculation basis"
                  value={form.technicalRequirements}
                  onChange={(event) => setField('technicalRequirements', event.target.value)}
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="np-constraints"
                  label="Engineering Constraints"
                  rows={2}
                  placeholder="Site limits, existing interfaces, material availability, manufacturing capability"
                  value={form.constraints}
                  onChange={(event) => setField('constraints', event.target.value)}
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="np-expected-deliverables"
                  label="Expected Deliverables"
                  rows={2}
                  placeholder="What the customer expects at handover — select the exact pack in the Deliverables section"
                  value={form.expectedDeliverables}
                  onChange={(event) => setField('expectedDeliverables', event.target.value)}
                />
              </div>
            </div>,
          )}

          {sectionCard(
            'schedule',
            CalendarDays,
            'Project Schedule',
            'Planned dates and automatically calculated duration',
            <div className="form-grid">
              <Input
                id="np-start"
                label="Planned Start Date"
                type="date"
                value={form.start}
                hint={errors.start}
                aria-invalid={Boolean(errors.start)}
                onChange={(event) => setField('start', event.target.value)}
              />
              <Input
                id="np-target"
                label="Target Completion Date"
                type="date"
                value={form.target}
                hint={errors.target}
                aria-invalid={Boolean(errors.target)}
                onChange={(event) => setField('target', event.target.value)}
              />
              <div className="form-field">
                <span className="form-label">Estimated Duration</span>
                <span className="form-static">{durationLabel}</span>
              </div>
            </div>,
          )}

          {sectionCard(
            'team',
            Users,
            'Project Team',
            'Manager, reviewers, engineers and additional members',
            <>
              <div className="form-grid form-grid-4">
                <Select
                  id="np-manager"
                  label="Project Manager"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.manager}
                  hint={errors.manager}
                  aria-invalid={Boolean(errors.manager)}
                  onChange={(event) => setField('manager', event.target.value)}
                />
                <Select
                  id="np-reviewer"
                  label="Technical Reviewer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.reviewer}
                  onChange={(event) => setField('reviewer', event.target.value)}
                />
                <Select
                  id="np-analysis-engineer"
                  label="Analysis Engineer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.analysisEngineer}
                  onChange={(event) => setField('analysisEngineer', event.target.value)}
                />
                <Select
                  id="np-manufacturing-engineer"
                  label="Manufacturing Engineer"
                  options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
                  value={form.manufacturingEngineer}
                  onChange={(event) => setField('manufacturingEngineer', event.target.value)}
                />
              </div>

              <div className="form-grid np-team-lists">
                <div className="form-grid-full">
                  <span className="form-label">
                    Design Engineers
                    <span className="form-label-count">{form.engineers.length} selected</span>
                  </span>
                  <div className="check-grid">
                    {ENGINEERS.map((engineer) => (
                      <label
                        key={engineer}
                        className={`check-chip${form.engineers.includes(engineer) ? ' is-checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.engineers.includes(engineer)}
                          onChange={() => toggleInList('engineers', engineer)}
                        />
                        {engineer}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-grid-full">
                  <span className="form-label">
                    Additional Team Members
                    <span className="form-label-count">{form.members.length} added</span>
                  </span>
                  <div className="np-member-add">
                    <select
                      id="np-member-picker"
                      className="form-select"
                      aria-label="Select team member to add"
                      value={memberDraft}
                      onChange={(event) => setMemberDraft(event.target.value)}
                    >
                      {ENGINEERS.map((engineer) => (
                        <option key={engineer} value={engineer}>
                          {engineer}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={Plus}
                      onClick={addTeamMember}
                    >
                      Add Member
                    </Button>
                  </div>
                  {form.members.length === 0 ? (
                    <p className="np-empty-note">No additional members added yet.</p>
                  ) : (
                    <ul className="np-member-chips">
                      {form.members.map((member) => (
                        <li key={member} className="np-member-chip">
                          {member}
                          <button
                            type="button"
                            aria-label={`Remove ${member}`}
                            onClick={() =>
                              setForm((previous) => ({
                                ...previous,
                                members: previous.members.filter((name) => name !== member),
                              }))
                            }
                          >
                            <X aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>,
          )}

          {sectionCard(
            'deliverables',
            ListChecks,
            'Deliverables',
            'Select the design pack to be produced for this project',
            <>
              <div className="deliverable-grid">
                {DELIVERABLES.map((deliverable) => {
                  const selected = form.deliverables.includes(deliverable);
                  return (
                    <label
                      key={deliverable}
                      className={`deliverable-option${selected ? ' is-checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleInList('deliverables', deliverable)}
                      />
                      <span>{deliverable}</span>
                      {selected && <Check className="deliverable-check" aria-hidden="true" />}
                    </label>
                  );
                })}
              </div>
              <p className="form-note">
                {form.deliverables.length} of {DELIVERABLES.length} deliverables selected
                {form.deliverables.length > 0 ? ` · ${form.deliverables.join(', ')}` : ''}
              </p>
            </>,
          )}

          <div className="project-form-actions np-actions">
            <div className="project-form-actions-left">
              <Button type="button" variant="ghost" icon={X} onClick={requestCancel}>
                {draftMode ? 'Cancel / Return' : 'Cancel'}
              </Button>
              <span className="project-form-actions-note">
                {projectId} · {draftMode ? 'Draft · auto-saved locally' : 'saved locally in this browser'}
              </span>
            </div>
            <div className="project-form-footer-right">
              <Button type="button" variant="secondary" icon={Save} onClick={saveDraft}>
                {draftMode ? 'Save Draft' : 'Save as Draft'}
              </Button>
              {draftMode ? (
                <>
                  <Button type="button" variant="ghost" icon={ArrowRight} onClick={saveDraft}>
                    Continue Editing
                  </Button>
                  <Button type="submit" icon={Check}>
                    Create Project
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit" icon={Check}>
                    Save
                  </Button>
                  <Button type="button" icon={ArrowRight} onClick={() => saveProject('continue')}>
                    Save &amp; Continue
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="np-aside">
          <section className="form-section-card np-attachments">
            <div className="np-attach-head">
              <span className="form-section-icon" aria-hidden="true">
                <Paperclip />
              </span>
              <span className="form-section-text">
                <strong>Project Attachments</strong>
                <span>Customer inputs, references and supporting documents</span>
              </span>
              <span className="np-attach-count">{totalAttachments}</span>
            </div>
            <div className="np-attach-body">
              <p className="np-attach-note">
                {totalAttachments === 0
                  ? 'No files attached yet.'
                  : `${totalAttachments} file${totalAttachments === 1 ? '' : 's'} attached in this session.`}{' '}
                Files stay in the browser — nothing is uploaded.
              </p>

              {ATTACHMENT_GROUPS.map((group) => {
                const files = form.attachments.filter((file) => file.category === group.key);
                return (
                  <div className="np-attach-group" key={group.key}>
                    <div className="np-attach-group-head">
                      <span className="np-attach-title">
                        {group.label}
                        <span className="form-label-count">{files.length}</span>
                      </span>
                      <label className="attachment-picker np-attach-pick">
                        <Upload aria-hidden="true" />
                        Choose Files
                        <input
                          type="file"
                          multiple
                          onChange={(event) => {
                            addFiles(group.key, event.target.files);
                            event.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <p className="np-attach-hint">{group.hint}</p>
                    {files.length > 0 && (
                      <ul className="np-attach-files">
                        {files.map((file) => (
                          <li className="np-attach-file" key={file.id}>
                            <FilePlus2 aria-hidden="true" />
                            <span className="np-attach-file-name" title={file.name}>
                              {file.name}
                            </span>
                            <span className="np-attach-file-size">{formatSize(file.size)}</span>
                            <button
                              type="button"
                              className="np-attach-remove"
                              aria-label={`Remove ${file.name}`}
                              onClick={() => removeAttachment(file.id)}
                            >
                              <Trash2 aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="np-side-note">
            <CalendarDays aria-hidden="true" />
            <div>
              <strong>Planned window</strong>
              <span>
                {formatDate(form.start)} → {formatDate(form.target)} · {durationLabel}
              </span>
            </div>
          </section>
        </aside>
      </form>

      <Modal
        open={confirmCreate}
        onClose={() => setConfirmCreate(false)}
        title="Create project from this draft?"
        subtitle={`${projectId} · ${form.name || 'Untitled project'}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCreate(false)}>
              Keep Editing
            </Button>
            <Button
              icon={Check}
              onClick={() => {
                setConfirmCreate(false);
                saveProject('save');
              }}
            >
              Create Project
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The existing draft {projectId} will become a live project record with status{' '}
          <strong>New Request</strong>. No second project is created and the source request{' '}
          {project?.sourceRequestId ? ` (${project.sourceRequestId})` : ''} is linked to this project.
        </p>
      </Modal>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Discard unsaved changes?"
        subtitle={`${projectId} has not been saved yet`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep Editing
            </Button>
            <Button
              icon={X}
              onClick={() => {
                setConfirmCancel(false);
                navigate('/projects/all-projects');
              }}
            >
              Discard &amp; Leave
            </Button>
          </>
        }
      >
        <p className="dash-modal-note">
          The project details and {totalAttachments} attachment
          {totalAttachments === 1 ? '' : 's'} entered on this page will be lost. Save as Draft to
          keep them in Project List.
        </p>
      </Modal>
    </>
  );
}
