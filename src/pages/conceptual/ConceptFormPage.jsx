import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Lightbulb,
  ListChecks,
  Paperclip,
  Plus,
  Save,
  Upload,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  ModuleTabs,
  PageHeader,
  PageLayout,
  Select,
  Textarea,
} from '../../components/common';
import { MODULES } from '../../config/navigation';
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import { usePlanning } from '../../context/PlanningContext';
import { ENGINEERS, TODAY, formatDate } from '../../data/projectData';
import { customerOrDepartment } from '../../data/projectConversion';
import {
  CONCEPT_COMPLEXITIES,
  CONCEPT_STATUSES,
  DESIGN_APPROACHES,
  projectLabel,
} from '../../data/conceptData';

const CONCEPT_MODULE = MODULES.find((module) => module.key === 'conceptual');
const REGISTER_TAB = CONCEPT_MODULE?.tabs.find((tab) => tab.key === 'concept-register');

function initialForm(project, plan) {
  return {
    projectId: project?.id || '',
    name: '',
    productCategory: project?.product || project?.domain || '',
    approach: 'Function-first / mechanism-led',
    description: '',
    customerRequirements: '',
    designObjectives: '',
    preliminarySpecifications: '',
    functionalRequirements: '',
    operatingConditions: '',
    materialSelection: '',
    materialOptions: '',
    designConstraints: '',
    sizeConstraints: '',
    expectedPerformance: '',
    complexity: 'Medium',
    technicalAssumptions: '',
    risks: '',
    remarks: '',
    designPlanId: plan?.id || '',
    owner: project?.manager || 'R. Kulkarni',
    advantages: '',
    limitations: '',
    technicalNotes: '',
    createdBy: 'R. Kulkarni',
    status: 'Draft',
  };
}

function formFromConcept(concept) {
  return {
    projectId: concept.projectId,
    name: concept.name,
    productCategory: concept.productCategory,
    approach: concept.approach,
    description: concept.description,
    customerRequirements: concept.customerRequirements || '',
    designObjectives: concept.designObjectives || '',
    preliminarySpecifications: concept.preliminarySpecifications || '',
    functionalRequirements: concept.functionalRequirements || '',
    operatingConditions: concept.operatingConditions || '',
    materialSelection: concept.materialSelection || '',
    materialOptions: concept.materialOptions || '',
    designConstraints: concept.designConstraints || '',
    sizeConstraints: concept.sizeConstraints || '',
    expectedPerformance: concept.expectedPerformance || '',
    complexity: concept.complexity || 'Medium',
    technicalAssumptions: concept.technicalAssumptions || '',
    risks: concept.risks || '',
    remarks: concept.remarks || '',
    designPlanId: concept.designPlanId || '',
    owner: concept.owner || concept.createdBy || 'R. Kulkarni',
    advantages: concept.advantages,
    limitations: concept.limitations,
    technicalNotes: concept.technicalNotes,
    createdBy: concept.createdBy,
    status: concept.status,
  };
}

function nextRevision(revision = 'A') {
  const current = String(revision || 'A').toUpperCase();
  return String.fromCharCode(Math.min(90, current.charCodeAt(0) + 1));
}

function bumpId(id) {
  const parts = id.split('-');
  const numeric = Number(parts[parts.length - 1]);
  if (!Number.isFinite(numeric)) return id;
  return [...parts.slice(0, -1), String(numeric + 1).padStart(3, '0')].join('-');
}

function formatSize(bytes) {
  if (!bytes) return '—';
  const kb = Math.max(1, Math.round(bytes / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/**
 * Concept Creation — full-page project-linked form covering requirements,
 * objectives, specifications, sketches/attachments, material direction and
 * evaluation notes.
 */
export default function ConceptFormPage() {
  const { conceptId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { concepts, addConcept, updateConcept, nextConceptId } = useConcept();
  const { projects } = useProjects();
  const { plans } = usePlanning();
  const requestedProjectId = searchParams.get('project') || '';
  const requestedPlanId = searchParams.get('plan') || '';
  const requestedProject = projects.find((project) => project.id === requestedProjectId) || projects[0];
  const requestedPlan =
    plans.find((plan) => plan.id === requestedPlanId) ||
    plans.find((plan) => plan.projectId === requestedProject?.id);

  const editing = useMemo(
    () => (conceptId ? concepts.find((concept) => concept.id === conceptId) : null),
    [conceptId, concepts],
  );

  const [formId, setFormId] = useState(() => (editing ? editing.id : nextConceptId()));
  const [form, setForm] = useState(() =>
    editing ? formFromConcept(editing) : initialForm(requestedProject, requestedPlan),
  );
  const [attachments, setAttachments] = useState(() =>
    editing ? [...(editing.attachments || [])] : [],
  );
  const [createdOn] = useState(editing ? editing.createdAt : TODAY);
  const [openSections, setOpenSections] = useState({
    info: true,
    requirements: true,
    evaluation: true,
    files: true,
  });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const fileInputRef = useRef(null);

  // New and edit share this component. Re-sync when navigation reuses it.
  useEffect(() => {
    if (!editing || editing.id === formId) return;
    setFormId(editing.id);
    setForm(formFromConcept(editing));
    setAttachments([...(editing.attachments || [])]);
    setErrors({});
    setBanner(null);
    setOpenSections({ info: true, requirements: true, evaluation: true, files: true });
  }, [editing, formId]);

  if (conceptId && !editing) {
    return <Navigate to="/conceptual-design" replace />;
  }

  const project = projects.find((row) => row.id === form.projectId);
  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const addFiles = (fileList) => {
    const incoming = [...(fileList || [])].map((file) => ({
      name: file.name,
      size: file.size,
    }));
    if (incoming.length > 0) setAttachments((previous) => [...previous, ...incoming]);
  };

  const validate = () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project this concept belongs to.';
    if (!form.name.trim()) next.name = 'Give the concept a distinctive name.';
    if (!form.description.trim()) next.description = 'Describe the concept so it can be compared.';
    if (!form.createdBy) next.createdBy = 'Select who created the concept.';
    return next;
  };

  const buildRecord = (status) => {
    const isEditing = Boolean(editing);
    const revision = isEditing ? nextRevision(editing.revision) : 'A';
    const revisionEntry = {
      revision,
      date: TODAY,
      by: form.createdBy,
      note: isEditing ? 'Concept details revised.' : 'Initial concept created.',
    };
    const revisions = isEditing
      ? [...(editing.revisions || []), revisionEntry]
      : [revisionEntry];

    return {
      id: formId,
      projectId: form.projectId,
      name: form.name.trim(),
      productCategory: form.productCategory.trim(),
      approach: form.approach,
      description: form.description.trim(),
      customerRequirements: form.customerRequirements.trim(),
      designObjectives: form.designObjectives.trim(),
      preliminarySpecifications: form.preliminarySpecifications.trim(),
      functionalRequirements: form.functionalRequirements.trim(),
      operatingConditions: form.operatingConditions.trim(),
      materialSelection: form.materialSelection.trim(),
      materialOptions: form.materialOptions.trim(),
      designConstraints: form.designConstraints.trim(),
      sizeConstraints: form.sizeConstraints.trim(),
      expectedPerformance: form.expectedPerformance.trim(),
      complexity: form.complexity,
      technicalAssumptions: form.technicalAssumptions.trim(),
      risks: form.risks.trim(),
      remarks: form.remarks.trim(),
      designPlanId:
        form.designPlanId || plans.find((plan) => plan.projectId === form.projectId)?.id || '',
      owner: form.owner || form.createdBy,
      advantages: form.advantages.trim(),
      limitations: form.limitations.trim(),
      technicalNotes: form.technicalNotes.trim(),
      attachments,
      createdBy: form.createdBy,
      createdAt: createdOn,
      revision,
      revisions,
      reviewerComments: editing?.reviewerComments || '',
      status,
    };
  };

  const saveDraft = () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Select the project this concept belongs to.';
    if (!form.name.trim()) next.name = 'Give the concept a distinctive name.';
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setBanner({ tone: 'error', message: 'Add a project and concept name before saving the draft.' });
      return;
    }

    if (editing) {
      updateConcept(formId, buildRecord('Draft'));
      setField('status', 'Draft');
      setBanner({ tone: 'success', message: `${formId} updated as a draft.` });
      return;
    }

    const record = buildRecord('Draft');
    addConcept(record);
    setForm(initialForm(projects[0]));
    setAttachments([]);
    setFormId(bumpId(record.id));
    setErrors({});
    setBanner({
      tone: 'success',
      message: `Draft ${record.id} saved to the Concept Register.`,
      conceptId: record.id,
      newRecord: true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setOpenSections({ info: true, requirements: true, evaluation: true, files: true });
      setBanner({ tone: 'error', message: 'Complete the required concept fields before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const status = form.status === 'Draft' ? 'In Development' : form.status;
    if (editing) {
      updateConcept(formId, buildRecord(status));
    } else {
      addConcept(buildRecord(status));
    }
    navigate('/conceptual-design');
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
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Conceptual Design', to: '/conceptual-design' },
            { label: 'Concept Creation', to: '/conceptual-design/concept-creation' },
            { label: editing ? `${formId} · Edit` : 'New Concept' },
          ]}
        />
      }
      tabs={<ModuleTabs module={CONCEPT_MODULE} activeTab={REGISTER_TAB} />}
      header={
        <PageHeader
          icon={Lightbulb}
          title={editing ? 'Edit Concept' : 'Create Concept'}
          subtitle={
            editing
              ? `Update the concept for ${project?.name || form.projectId}.`
              : 'Capture a project concept with requirements, objectives, preliminary specifications, sketches and material direction.'
          }
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/conceptual-design')}>
              Back to Concept Register
            </Button>
          }
        />
      }
    >
      <form className="project-form-page" onSubmit={submit} noValidate>
        {banner && (
          <div className={`form-banner ${banner.tone}`} role="status">
            {banner.tone === 'success' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
            <span>
              {banner.message}
              {banner.newRecord && (
                <button
                  type="button"
                  className="form-banner-action"
                  onClick={() =>
                    navigate(`/conceptual-design/concept-creation/${banner.conceptId}/edit`)
                  }
                >
                  Open concept <ArrowRight aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
        )}

        {sectionCard(
          'info',
          ClipboardList,
          'Concept Information',
          'Project reference, identification, category and ownership',
          <div className="form-grid">
            <div className="form-field">
              <span className="form-label">Concept ID</span>
              <span className="form-static">{formId}</span>
            </div>
            <Select
              id="concept-project"
              label="Project Reference"
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map((row) => ({ value: row.id, label: projectLabel(row) })),
              ]}
              value={form.projectId}
              hint={errors.projectId}
              aria-invalid={Boolean(errors.projectId)}
              onChange={(event) => {
                const nextProject = projects.find((row) => row.id === event.target.value);
                setForm((previous) => ({
                  ...previous,
                  projectId: event.target.value,
                  productCategory:
                    nextProject?.product || nextProject?.domain || previous.productCategory,
                  designPlanId:
                    plans.find((plan) => plan.projectId === event.target.value)?.id || '',
                  owner: nextProject?.manager || previous.owner,
                }));
              }}
            />
            <div className="form-field">
              <span className="form-label">Project Name</span>
              <span className="form-static">{project?.name || 'Not selected'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Source Request ID</span>
              <span className="form-static">{project?.sourceRequestId || 'Manual project'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Product</span>
              <span className="form-static">{project?.product || '—'}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Customer / Department</span>
              <span className="form-static">{customerOrDepartment(project)}</span>
            </div>
            <div className="form-field">
              <span className="form-label">Design Plan ID</span>
              <span className="form-static">
                {form.designPlanId || 'No design plan for this project'}
              </span>
            </div>
            <div className="form-field">
              <span className="form-label">Created On</span>
              <span className="form-static">{formatDate(createdOn)}</span>
            </div>
            <Select
              id="concept-owner"
              label="Concept Owner"
              options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
              value={form.owner}
              onChange={(event) => setField('owner', event.target.value)}
            />
            <div className="form-grid-full">
              <Input
                id="concept-name"
                label="Concept Name"
                placeholder="e.g. Twin helical gearbox drive"
                value={form.name}
                hint={errors.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setField('name', event.target.value)}
              />
            </div>
            <Input
              id="concept-category"
              label="Product / Machine Category"
              placeholder="e.g. Conveyor drive / Sheet metal enclosure"
              value={form.productCategory}
              onChange={(event) => setField('productCategory', event.target.value)}
            />
            <Select
              id="concept-approach"
              label="Design Approach"
              options={DESIGN_APPROACHES.map((approach) => ({ value: approach, label: approach }))}
              value={form.approach}
              onChange={(event) => setField('approach', event.target.value)}
            />
            <Select
              id="concept-created-by"
              label="Created By"
              options={ENGINEERS.map((engineer) => ({ value: engineer, label: engineer }))}
              value={form.createdBy}
              hint={errors.createdBy}
              aria-invalid={Boolean(errors.createdBy)}
              onChange={(event) => setField('createdBy', event.target.value)}
            />
            <Select
              id="concept-status"
              label="Status"
              options={CONCEPT_STATUSES.map((status) => ({ value: status, label: status }))}
              value={form.status}
              onChange={(event) => setField('status', event.target.value)}
            />
          </div>,
        )}

        {sectionCard(
          'requirements',
          ListChecks,
          'Design Requirements',
          'Customer requirements, objectives, preliminary specifications and material direction',
          <div className="form-grid">
            <div className="form-grid-full">
              <Textarea
                id="concept-customer-requirements"
                label="Customer Requirements"
                rows={3}
                placeholder="Functional duty, interfaces, standards, performance limits and customer constraints"
                value={form.customerRequirements}
                onChange={(event) => setField('customerRequirements', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-objectives"
                label="Design Objectives"
                rows={3}
                placeholder="What the concept must optimise: efficiency, cost, serviceability, reuse or lead time"
                value={form.designObjectives}
                onChange={(event) => setField('designObjectives', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-specifications"
                label="Preliminary Specifications"
                rows={3}
                placeholder="Ratings, envelope, ratios, loads, tolerances and preliminary technical targets"
                value={form.preliminarySpecifications}
                onChange={(event) => setField('preliminarySpecifications', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-functional"
                label="Functional Requirements"
                rows={3}
                placeholder="Functions the concept must perform, interfaces and duty requirements"
                value={form.functionalRequirements}
                onChange={(event) => setField('functionalRequirements', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-operating-conditions"
                label="Operating Conditions"
                rows={2}
                placeholder="Duty cycle, environment, temperature, load spectrum and site conditions"
                value={form.operatingConditions}
                onChange={(event) => setField('operatingConditions', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-material-selection"
                label="Preliminary Material Selection"
                rows={2}
                placeholder="Proposed materials, grades, finishes and availability notes"
                value={form.materialSelection}
                onChange={(event) => setField('materialSelection', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-material-options"
                label="Material Options"
                rows={2}
                placeholder="Alternative grades or substitutes with availability and cost notes"
                value={form.materialOptions}
                onChange={(event) => setField('materialOptions', event.target.value)}
              />
            </div>
            <Textarea
              id="concept-constraints"
              label="Design Constraints"
              rows={3}
              placeholder="Codes, standards, interfaces, vendor limits and customer constraints"
              value={form.designConstraints}
              onChange={(event) => setField('designConstraints', event.target.value)}
            />
            <Textarea
              id="concept-size-constraints"
              label="Size & Space Constraints"
              rows={3}
              placeholder="Envelope, footprint, transport limits and installation clearance"
              value={form.sizeConstraints}
              onChange={(event) => setField('sizeConstraints', event.target.value)}
            />
            <Textarea
              id="concept-performance"
              label="Expected Performance"
              rows={3}
              placeholder="Target capacity, efficiency, accuracy, cycle time or life"
              value={form.expectedPerformance}
              onChange={(event) => setField('expectedPerformance', event.target.value)}
            />
            <Select
              id="concept-complexity"
              label="Estimated Complexity"
              options={CONCEPT_COMPLEXITIES.map((value) => ({ value, label: value }))}
              value={form.complexity}
              onChange={(event) => setField('complexity', event.target.value)}
            />
            <div className="form-grid-full">
              <Textarea
                id="concept-assumptions"
                label="Technical Assumptions"
                rows={2}
                placeholder="Assumptions the concept relies on that must stay true"
                value={form.technicalAssumptions}
                onChange={(event) => setField('technicalAssumptions', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-risks"
                label="Risks"
                rows={2}
                placeholder="Technical, supply, cost and schedule risks for this concept"
                value={form.risks}
                onChange={(event) => setField('risks', event.target.value)}
              />
            </div>
            <div className="form-grid-full">
              <Textarea
                id="concept-remarks"
                label="Remarks"
                rows={2}
                value={form.remarks}
                onChange={(event) => setField('remarks', event.target.value)}
              />
            </div>
            <p className="form-note form-grid-full">
              Each concept record is one alternative. Creating additional concepts against the same
              Project Reference builds the Concept Alternatives set for comparison.
            </p>
          </div>,
        )}

        {sectionCard(
          'evaluation',
          FileText,
          'Concept Description & Evaluation',
          'How the concept works, advantages, limitations and technical feasibility notes',
          <div className="form-grid">
            <div className="form-grid-full">
              <Textarea
                id="concept-description"
                label="Description"
                rows={4}
                placeholder="Working principle, main components, packaging and how the concept meets the requirement"
                value={form.description}
                hint={errors.description}
                aria-invalid={Boolean(errors.description)}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
            <Textarea
              id="concept-advantages"
              label="Advantages"
              rows={3}
              placeholder="Efficiency, cost, reuse, serviceability and manufacturing benefits"
              value={form.advantages}
              onChange={(event) => setField('advantages', event.target.value)}
            />
            <Textarea
              id="concept-limitations"
              label="Limitations"
              rows={3}
              placeholder="Envelope, lead time, efficiency, tooling and vendor constraints"
              value={form.limitations}
              onChange={(event) => setField('limitations', event.target.value)}
            />
            <div className="form-grid-full">
              <Textarea
                id="concept-technical-notes"
                label="Technical Feasibility Notes"
                rows={3}
                placeholder="Ratios, ratings, materials, standards and preliminary calculations"
                value={form.technicalNotes}
                onChange={(event) => setField('technicalNotes', event.target.value)}
              />
            </div>
          </div>,
        )}

        {sectionCard(
          'files',
          Paperclip,
          'Concept Sketches & Attachments',
          'Reference images, sketches, PDFs and supporting documents — metadata only',
          <>
            <div className="attachment-picker-row">
              <label className="attachment-picker">
                <Upload aria-hidden="true" />
                <span>Choose files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.dwg,.dxf,.step,.stp,.xlsx,.docx,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
              </label>
              <span className="attachment-count">
                {attachments.length} file{attachments.length === 1 ? '' : 's'} attached
              </span>
            </div>

            {attachments.length === 0 ? (
              <p className="cd-note">
                No concept sketches yet. Files are recorded by name and size only — nothing is
                uploaded.
              </p>
            ) : (
              <ul className="attachment-chips">
                {attachments.map((attachment, index) => (
                  <li className="attachment-chip" key={`${attachment.name}-${index}`}>
                    <Paperclip aria-hidden="true" />
                    <span>{attachment.name}</span>
                    <span className="attachment-size">{formatSize(attachment.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() =>
                        setAttachments((previous) =>
                          previous.filter((_, position) => position !== index),
                        )
                      }
                    >
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>,
        )}

        <div className="project-form-actions">
          <div className="project-form-actions-left">
            <Button variant="ghost" icon={X} onClick={() => navigate('/conceptual-design')}>
              Cancel
            </Button>
            <span className="project-form-actions-note">
              {formId} · {form.status} · {editing ? `Rev ${editing.revision}` : 'New revision'}
            </span>
          </div>
          <div className="project-form-footer-right">
            <Button variant="secondary" icon={Save} onClick={saveDraft}>
              Save as Draft
            </Button>
            <Button type="submit" icon={editing ? Save : Plus}>
              {editing ? 'Save Changes' : 'Create Concept'}
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
