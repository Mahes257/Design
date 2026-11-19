import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Cog,
  FileSearch,
  Save,
  Users,
  X,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  PageHeader,
  PageLayout,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/common';
import { useCustomerEnquiries } from '../../context/CustomerEnquiryContext';
import { useQuotationReview } from '../../context/QuotationReviewContext';
import { TODAY, formatDate } from '../../data/customerEnquiryData';
import {
  ENGINEERS,
  FEASIBILITY_OPTIONS,
  PROJECT_DELIVERABLES,
  QUOTATION_PRIORITIES,
  QUOTATION_REVISIONS,
  createEmptyQuotationForm,
  formatRevision,
  isQuotationEditable,
  quotationToForm,
} from '../../data/quotationReviewData';

const EMPTY_ERRORS = {};

export default function QuotationFormPage() {
  const navigate = useNavigate();
  const { quotationId } = useParams();
  const [searchParams] = useSearchParams();
  const { enquiries } = useCustomerEnquiries();
  const { quotations, nextQuotationId, addQuotation, updateQuotation } = useQuotationReview();

  const editing = useMemo(
    () => (quotationId ? quotations.find((record) => record.id === quotationId) : null),
    [quotationId, quotations],
  );

  const queryEnquiryId = searchParams.get('enquiryId') || '';
  const queryEnquiry = enquiries.find((record) => record.id === queryEnquiryId) || null;

  const [form, setForm] = useState(() =>
    editing ? quotationToForm(editing) : createEmptyQuotationForm(queryEnquiry),
  );
  const [openSections, setOpenSections] = useState({
    identity: true,
    configuration: true,
    feasibility: true,
    estimates: true,
  });
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [banner, setBanner] = useState(null);

  const selectedEnquiry = enquiries.find((record) => record.id === form.linkedEnquiryId) || null;
  const displayReference = editing?.quotationRef || nextQuotationId();
  const enquiryOptions = useMemo(() => {
    const options = enquiries.map((record) => ({
      value: record.id,
      label: `${record.id} · ${record.subject} · ${record.status}`,
    }));
    if (form.linkedEnquiryId && !enquiries.some((record) => record.id === form.linkedEnquiryId)) {
      options.unshift({
        value: form.linkedEnquiryId,
        label: `${form.linkedEnquiryId} · linked enquiry snapshot`,
      });
    }
    return options;
  }, [enquiries, form.linkedEnquiryId]);

  if (quotationId && !editing) return <Navigate to="/quotation-review" replace />;
  if (editing && !isQuotationEditable(editing)) {
    return <Navigate to={`/quotation-review/${editing.id}`} replace />;
  }

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const toggleSection = (key) =>
    setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));

  const enquirySnapshot = selectedEnquiry || {
    id: editing?.linkedEnquiryId || '',
    subject: editing?.enquirySubject || '',
    customerName: editing?.customerName || '',
    contactName: editing?.customerContact || '',
    contactEmail: editing?.customerEmail || '',
    category: editing?.customerCategory || '',
    status: '',
    priority: editing?.priority || 'Medium',
  };

  const handleEnquiryChange = (id) => {
    const enquiry = enquiries.find((record) => record.id === id) || null;
    setForm((previous) => {
      const isDifferent = previous.linkedEnquiryId !== id;
      const generatedSpecs = enquiry
        ? [
            enquiry.description,
            enquiry.specs?.application,
            enquiry.specs?.capacity,
            enquiry.specs?.dimensions,
            enquiry.specs?.standards,
          ]
            .filter(Boolean)
            .join('\n\n')
        : '';
      return {
        ...previous,
        linkedEnquiryId: id,
        productConfiguration:
          isDifferent && !previous.productConfiguration
            ? enquiry?.subject || ''
            : isDifferent
              ? enquiry?.subject || previous.productConfiguration
              : previous.productConfiguration,
        preliminarySpecifications:
          isDifferent && !previous.preliminarySpecifications
            ? generatedSpecs
            : isDifferent
              ? generatedSpecs || previous.preliminarySpecifications
              : previous.preliminarySpecifications,
        materialAssumptions:
          isDifferent && !previous.materialAssumptions
            ? enquiry?.specs?.materials || ''
            : previous.materialAssumptions,
        targetDeliveryEstimate:
          previous.targetDeliveryEstimate || enquiry?.targetDeliveryDate || '',
        priority: enquiry?.priority || previous.priority,
        salesContact: enquiry?.salesContact || previous.salesContact,
        engineeringOwner: enquiry?.engineeringContact || previous.engineeringOwner,
      };
    });
    setErrors((previous) => ({ ...previous, linkedEnquiryId: undefined }));
  };

  const buildRecord = () => ({
    linkedEnquiryId: form.linkedEnquiryId,
    enquirySubject: enquirySnapshot.subject || '',
    customerName: enquirySnapshot.customerName || '',
    customerContact: enquirySnapshot.contactName || '',
    customerEmail: enquirySnapshot.contactEmail || '',
    customerCategory: enquirySnapshot.category || '',
    quotationDate: form.quotationDate,
    revision: form.revision,
    priority: form.priority,
    targetDeliveryEstimate: form.targetDeliveryEstimate,
    salesContact: form.salesContact,
    engineeringOwner: form.engineeringOwner,
    productConfiguration: form.productConfiguration.trim(),
    preliminarySpecifications: form.preliminarySpecifications.trim(),
    designFeasibility: form.designFeasibility,
    designFeasibilityNotes: form.designFeasibilityNotes.trim(),
    manufacturingFeasibility: form.manufacturingFeasibility,
    manufacturingFeasibilityNotes: form.manufacturingFeasibilityNotes.trim(),
    materialAssumptions: form.materialAssumptions.trim(),
    preliminaryBomRef: form.preliminaryBomRef.trim(),
    engineeringEffort: Number(form.engineeringEffort) || 0,
    materialCost: Number(form.materialCost) || 0,
    manufacturingCost: Number(form.manufacturingCost) || 0,
    technicalComments: form.technicalComments.trim(),
    review: {
      ...(editing?.review || {}),
      assignedReviewer: form.reviewer.trim(),
      assignedOn: form.reviewer.trim() ? form.reviewAssignedOn || TODAY : '',
      ...(editing?.status === 'Technical Review'
        ? {
            outcome: editing?.review?.outcome || '',
            reviewedOn: editing?.review?.reviewedOn || '',
          }
        : {}),
    },
    customerReference: editing?.customerReference || '',
    submittedToCustomerAt: editing?.submittedToCustomerAt || '',
    decisionAt: editing?.decisionAt || '',
    convertedProjectId: editing?.convertedProjectId || '',
  });

  const validateCommon = () => {
    const next = {};
    if (!form.linkedEnquiryId) next.linkedEnquiryId = 'Select the customer enquiry.';
    if (!form.productConfiguration.trim()) {
      next.productConfiguration = 'Describe the product or machine configuration.';
    }
    if (!form.quotationDate) next.quotationDate = 'Quotation date is required.';
    if (!form.revision) next.revision = 'Select the quotation revision.';
    return next;
  };

  const validateForReview = () => {
    const next = validateCommon();
    if (!form.preliminarySpecifications.trim()) {
      next.preliminarySpecifications = 'Record the preliminary technical specifications.';
    }
    if (!form.designFeasibility) {
      next.designFeasibility = 'Record the design feasibility assessment.';
    }
    if (!form.manufacturingFeasibility) {
      next.manufacturingFeasibility = 'Record the manufacturing feasibility assessment.';
    }
    if (!form.materialAssumptions.trim()) {
      next.materialAssumptions = 'Record the material assumptions.';
    }
    if (!form.preliminaryBomRef.trim()) {
      next.preliminaryBomRef = 'Add the preliminary BOM reference.';
    }
    if (!(Number(form.engineeringEffort) > 0)) {
      next.engineeringEffort = 'Enter the estimated engineering effort in hours.';
    }
    if (form.materialCost === '' || Number(form.materialCost) < 0) {
      next.materialCost = 'Enter the preliminary material cost.';
    }
    if (form.manufacturingCost === '' || Number(form.manufacturingCost) < 0) {
      next.manufacturingCost = 'Enter the preliminary manufacturing cost.';
    }
    if (!form.targetDeliveryEstimate) {
      next.targetDeliveryEstimate = 'Record the target delivery estimate.';
    }
    if (!form.reviewer.trim()) next.reviewer = 'Assign a technical reviewer.';
    return next;
  };

  const showErrors = (next, message) => {
    setErrors(next);
    setBanner({ tone: 'error', message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = () => {
    const next = validateCommon();
    if (Object.keys(next).length > 0) {
      showErrors(next, 'Complete the identification fields before saving the draft.');
      return;
    }
    const result = addQuotation(buildRecord());
    if (result.error) {
      showErrors({}, result.error);
      return;
    }
    navigate(`/quotation-review/${result.id}`);
  };

  const saveChanges = () => {
    if (!editing) return;
    const next = validateCommon();
    if (Object.keys(next).length > 0) {
      showErrors(next, 'Complete the identification fields before saving.');
      return;
    }
    const result = updateQuotation(editing.id, buildRecord());
    if (result.error) {
      showErrors({}, result.error);
      return;
    }
    navigate(`/quotation-review/${editing.id}`);
  };

  const startReview = () => {
    const next = validateForReview();
    if (Object.keys(next).length > 0) {
      showErrors(next, 'Complete the technical basis before starting technical review.');
      return;
    }
    if (editing) {
      const updated = updateQuotation(editing.id, buildRecord());
      if (updated.error) {
        showErrors({}, updated.error);
        return;
      }
      navigate(`/quotation-review/${editing.id}`);
      return;
    }
    const result = addQuotation({ ...buildRecord(), status: 'Technical Review' });
    if (result.error) {
      showErrors({}, result.error);
      return;
    }
    navigate(`/quotation-review/${result.id}`);
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
            { label: 'Quotation & Technical Review', to: '/quotation-review' },
            { label: editing ? `Edit ${editing.quotationRef}` : 'New Quotation' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={FileSearch}
          title={editing ? `Edit ${editing.quotationRef}` : 'New Quotation'}
          subtitle={
            editing
              ? 'Update the technical configuration, feasibility basis, preliminary estimate or review assignment.'
              : 'Link a customer enquiry, prepare the technical quotation basis and assign the feasibility review.'
          }
          actions={
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={() =>
                navigate(editing ? `/quotation-review/${editing.id}` : '/quotation-review')
              }
            >
              Back
            </Button>
          }
        />
      }
    >
      {banner && (
        <div className={`form-banner ${banner.tone}`} role="status">
          <X aria-hidden="true" />
          <span>{banner.message}</span>
        </div>
      )}

      <form
        className="qr-form-layout"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (editing) saveChanges();
          else startReview();
        }}
      >
        <div className="qr-form-main">
          {sectionCard(
            'identity',
            ClipboardList,
            'Quotation Identification',
            'Customer enquiry, reference, revision and ownership',
            <>
              <div className="form-grid">
                <div className="form-grid-full">
                  <Select
                    id="qr-enquiry"
                    label="Customer Enquiry ID"
                    value={form.linkedEnquiryId}
                    onChange={(event) => handleEnquiryChange(event.target.value)}
                    options={[
                      { value: '', label: 'Select a customer enquiry' },
                      ...enquiryOptions,
                    ]}
                    hint={errors.linkedEnquiryId}
                    aria-invalid={Boolean(errors.linkedEnquiryId)}
                  />
                </div>
                <div className="form-field">
                  <span className="form-label">Quotation Reference</span>
                  <span className="form-static">{displayReference}</span>
                </div>
                <Select
                  id="qr-revision"
                  label="Quotation Revision"
                  value={form.revision}
                  onChange={(event) => setField('revision', event.target.value)}
                  options={QUOTATION_REVISIONS.map((value) => ({
                    value,
                    label: formatRevision(value),
                  }))}
                  hint={errors.revision}
                />
                <Input
                  id="qr-date"
                  label="Quotation Date"
                  type="date"
                  value={form.quotationDate}
                  onChange={(event) => setField('quotationDate', event.target.value)}
                  hint={errors.quotationDate}
                />
                <Select
                  id="qr-priority"
                  label="Priority"
                  value={form.priority}
                  onChange={(event) => setField('priority', event.target.value)}
                  options={QUOTATION_PRIORITIES.map((value) => ({ value, label: value }))}
                />
                <Select
                  id="qr-sales-contact"
                  label="Sales Contact"
                  value={form.salesContact}
                  onChange={(event) => setField('salesContact', event.target.value)}
                  options={ENGINEERS.map((value) => ({ value, label: value }))}
                />
                <Select
                  id="qr-engineering-owner"
                  label="Engineering Owner"
                  value={form.engineeringOwner}
                  onChange={(event) => setField('engineeringOwner', event.target.value)}
                  options={ENGINEERS.map((value) => ({ value, label: value }))}
                />
              </div>

              {selectedEnquiry ? (
                <div className="qr-enquiry-context">
                  <div>
                    <span className="qr-kicker">Linked customer enquiry</span>
                    <strong>
                      <Link to={`/customer-enquiries/${selectedEnquiry.id}`}>
                        {selectedEnquiry.id}
                      </Link>{' '}
                      · {selectedEnquiry.subject}
                    </strong>
                    <p>
                      {selectedEnquiry.customerName} · {selectedEnquiry.category} ·{' '}
                      {selectedEnquiry.quantity} {selectedEnquiry.unit} · target{' '}
                      {formatDate(selectedEnquiry.targetDeliveryDate)}
                    </p>
                  </div>
                  <StatusBadge status={selectedEnquiry.status} />
                </div>
              ) : (
                <p className="form-note">
                  Select an enquiry to carry its customer, contact and technical requirement into
                  this quotation.
                </p>
              )}
            </>,
          )}

          {sectionCard(
            'configuration',
            Cog,
            'Product Configuration & Technical Basis',
            'Machine configuration and preliminary specifications',
            <div className="form-grid">
              <div className="form-grid-full">
                <Textarea
                  id="qr-configuration"
                  label="Product / Machine Configuration"
                  rows={3}
                  value={form.productConfiguration}
                  onChange={(event) => setField('productConfiguration', event.target.value)}
                  placeholder="Describe the supplied machine, package or configuration"
                  hint={errors.productConfiguration}
                  aria-invalid={Boolean(errors.productConfiguration)}
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="qr-specifications"
                  label="Preliminary Technical Specifications"
                  rows={5}
                  value={form.preliminarySpecifications}
                  onChange={(event) => setField('preliminarySpecifications', event.target.value)}
                  placeholder="Interface requirements, duty, standards, inspection and preliminary technical basis"
                  hint={errors.preliminarySpecifications}
                  aria-invalid={Boolean(errors.preliminarySpecifications)}
                />
              </div>
            </div>,
          )}

          {sectionCard(
            'feasibility',
            BadgeCheck,
            'Technical Feasibility',
            'Design and manufacturing assessment, material assumptions and BOM basis',
            <div className="form-grid">
              <Select
                id="qr-design-feasibility"
                label="Design Feasibility"
                value={form.designFeasibility}
                onChange={(event) => setField('designFeasibility', event.target.value)}
                options={[
                  { value: '', label: 'Not assessed' },
                  ...FEASIBILITY_OPTIONS.map((value) => ({ value, label: value })),
                ]}
                hint={errors.designFeasibility}
              />
              <Select
                id="qr-manufacturing-feasibility"
                label="Manufacturing Feasibility"
                value={form.manufacturingFeasibility}
                onChange={(event) => setField('manufacturingFeasibility', event.target.value)}
                options={[
                  { value: '', label: 'Not assessed' },
                  ...FEASIBILITY_OPTIONS.map((value) => ({ value, label: value })),
                ]}
                hint={errors.manufacturingFeasibility}
              />
              <div className="form-grid-full">
                <Textarea
                  id="qr-design-notes"
                  label="Design Feasibility Notes"
                  rows={2}
                  value={form.designFeasibilityNotes}
                  onChange={(event) => setField('designFeasibilityNotes', event.target.value)}
                  placeholder="Conditions, open technical risks or design changes required"
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="qr-manufacturing-notes"
                  label="Manufacturing Feasibility Notes"
                  rows={2}
                  value={form.manufacturingFeasibilityNotes}
                  onChange={(event) => setField('manufacturingFeasibilityNotes', event.target.value)}
                  placeholder="Fabrication route, vendor capability, tolerances or process risks"
                />
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="qr-material-assumptions"
                  label="Material Assumptions"
                  rows={3}
                  value={form.materialAssumptions}
                  onChange={(event) => setField('materialAssumptions', event.target.value)}
                  placeholder="Grades, finishes, bought-out items and assumptions used for the estimate"
                  hint={errors.materialAssumptions}
                />
              </div>
              <Input
                id="qr-bom-ref"
                label="Preliminary BOM Reference"
                value={form.preliminaryBomRef}
                onChange={(event) => setField('preliminaryBomRef', event.target.value)}
                placeholder="e.g. BOM-2026-043-A"
                hint={errors.preliminaryBomRef}
              />
              <div className="form-field">
                <span className="form-label">Engineering Deliverables Basis</span>
                <span className="form-static">{PROJECT_DELIVERABLES.length} standard deliverables</span>
              </div>
              <div className="form-grid-full">
                <Textarea
                  id="qr-technical-comments"
                  label="Technical Comments"
                  rows={3}
                  value={form.technicalComments}
                  onChange={(event) => setField('technicalComments', event.target.value)}
                  placeholder="Technical notes to the reviewer or sales team"
                />
              </div>
            </div>,
          )}

          {sectionCard(
            'estimates',
            Users,
            'Preliminary Estimate & Review Assignment',
            'Engineering effort, preliminary costs, delivery and technical reviewer',
            <div className="form-grid">
              <Input
                id="qr-effort"
                label="Estimated Engineering Effort (hours)"
                type="number"
                min="0"
                value={form.engineeringEffort}
                onChange={(event) => setField('engineeringEffort', event.target.value)}
                hint={errors.engineeringEffort}
              />
              <Input
                id="qr-target"
                label="Target Delivery Estimate"
                type="date"
                value={form.targetDeliveryEstimate}
                onChange={(event) => setField('targetDeliveryEstimate', event.target.value)}
                hint={errors.targetDeliveryEstimate}
              />
              <Input
                id="qr-material-cost"
                label="Preliminary Material Cost (INR)"
                type="number"
                min="0"
                value={form.materialCost}
                onChange={(event) => setField('materialCost', event.target.value)}
                hint={errors.materialCost}
              />
              <Input
                id="qr-manufacturing-cost"
                label="Preliminary Manufacturing Cost (INR)"
                type="number"
                min="0"
                value={form.manufacturingCost}
                onChange={(event) => setField('manufacturingCost', event.target.value)}
                hint={errors.manufacturingCost}
              />
              <Select
                id="qr-reviewer"
                label="Review Assignment"
                value={form.reviewer}
                onChange={(event) => setField('reviewer', event.target.value)}
                options={[
                  { value: '', label: 'Assign a technical reviewer' },
                  ...ENGINEERS.map((value) => ({ value, label: value })),
                ]}
                hint={errors.reviewer}
              />
              <Input
                id="qr-review-date"
                label="Review Assigned On"
                type="date"
                value={form.reviewAssignedOn}
                onChange={(event) => setField('reviewAssignedOn', event.target.value)}
              />
            </div>,
          )}

          <p className="form-note qr-form-note">
            <CalendarDays aria-hidden="true" />
            Preliminary material and manufacturing costs are engineering estimates only. Commercial
            price build-up, GST and customer quotation transactions remain in the Sales ERP.
          </p>

          <div className="project-form-actions qr-form-actions">
            <div className="project-form-actions-left">
              <Button
                type="button"
                variant="ghost"
                icon={X}
                onClick={() =>
                  navigate(editing ? `/quotation-review/${editing.id}` : '/quotation-review')
                }
              >
                Cancel
              </Button>
              <span className="project-form-actions-note">
                {displayReference} · saved locally in this browser
              </span>
            </div>
            <div className="project-form-footer-right">
              {!editing && (
                <Button type="button" variant="secondary" icon={Save} onClick={saveDraft}>
                  Save Draft
                </Button>
              )}
              {editing && (
                <Button type="button" variant="secondary" icon={Save} onClick={saveChanges}>
                  Save Changes
                </Button>
              )}
              <Button type="submit" icon={editing ? Check : ArrowRight}>
                {editing ? 'Save & Close' : 'Create & Start Review'}
              </Button>
            </div>
          </div>
        </div>

        <aside className="qr-form-aside">
          <section className="qr-side-card">
            <span className="qr-kicker">Quotation status</span>
            <strong>{editing ? editing.status : 'Draft on save'}</strong>
            <p>
              Status changes and technical review decisions are recorded from the quotation detail
              page. A new quotation can be saved as a draft or sent straight to technical review.
            </p>
          </section>

          <section className="qr-side-card">
            <span className="qr-kicker">Technical review gate</span>
            <ul className="qr-side-list">
              <li>Enquiry linked</li>
              <li>Configuration and preliminary specifications</li>
              <li>Design and manufacturing feasibility</li>
              <li>Material assumptions and preliminary BOM</li>
              <li>Engineering effort and preliminary costs</li>
              <li>Reviewer assigned</li>
            </ul>
          </section>

          <section className="qr-side-card is-muted">
            <span className="qr-kicker">Project handoff</span>
            <strong>Only accepted quotations convert</strong>
            <p>
              Accepted records can initiate Module 03 with the original enquiry and quotation
              references retained.
            </p>
          </section>
        </aside>
      </form>
    </PageLayout>
  );
}
