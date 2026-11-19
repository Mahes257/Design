import { useState } from 'react';
import {
  ClipboardList,
  FileCheck2,
  Info,
  Save,
  Send,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Textarea } from '../../components/common';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import { APP_USER } from '../../constants/brand';
import {
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  REQUEST_SOURCES,
  SOURCE_FIELDS,
  SOURCE_META,
  TECHNICAL_REVIEWERS,
  createEmptyRequestForm,
  requestToForm,
  validateRequestForm,
} from '../../data/enquiryRequestData';
import { AttachmentPicker } from './enquiryRequestUi';

const BASE_TITLES = {
  Customer: 'Customer Requirement',
  'R&D / PDE': 'Development Request',
  Service: 'Service Request',
  'Inter-Department': 'Internal Request',
};

function SourceField({ definition, value, error, onChange }) {
  const common = {
    id: `er-field-${definition.key}`,
    label: `${definition.label}${definition.required ? ' *' : ''}`,
    value,
    hint: error || (definition.required ? 'Required' : 'Optional'),
    'aria-invalid': Boolean(error),
    onChange: (event) => onChange(definition.key, event.target.value),
  };

  if (definition.type === 'textarea') {
    return (
      <div className={definition.full ? 'form-grid-full' : undefined}>
        <Textarea {...common} rows={definition.rows || 3} placeholder={definition.placeholder} />
      </div>
    );
  }
  if (definition.type === 'select') {
    return (
      <Select
        {...common}
        options={[
          { value: '', label: `Select ${definition.label.toLowerCase()}` },
          ...definition.options.map((option) => ({ value: option, label: option })),
        ]}
      />
    );
  }
  return <Input {...common} type={definition.type || 'text'} placeholder={definition.placeholder} />;
}

/**
 * One common request form for all four sources. The source-specific section is
 * rendered from the selected source, and values from every source are kept in
 * the form so switching sources does not lose what was already typed.
 */
export default function RequestForm({ record = null, onSaved, onCancel, embedded = false }) {
  const navigate = useNavigate();
  const { addRequest, updateRequest } = useEnquiryRequests();
  const editing = Boolean(record);
  const [form, setForm] = useState(() =>
    record ? requestToForm(record) : createEmptyRequestForm(),
  );
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [bannerTone, setBannerTone] = useState('error');

  const setField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setBanner('');
  };

  const setSourceField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      sourceFields: { ...previous.sourceFields, [key]: value },
    }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setBanner('');
  };

  const save = (submit) => {
    const mode = editing || submit ? 'full' : 'draft';
    const next = validateRequestForm(form, mode);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setBannerTone('error');
      setBanner(
        submit || editing
          ? 'Complete the required request fields before saving.'
          : 'Add a request title, source and category to save a draft.',
      );
      return;
    }

    if (editing) {
      const result = updateRequest(record.id, form, { by: APP_USER.name });
      if (result?.error) {
        setErrors(result.errors || {});
        setBannerTone('error');
        setBanner(result.error);
        return;
      }
      onSaved?.(record.id);
      return;
    }

    const result = addRequest(form, { submit, by: APP_USER.name });
    if (result?.error) {
      setErrors(result.errors || {});
      setBannerTone('error');
      setBanner(result.error);
      return;
    }
    setBannerTone('success');
    setBanner(
      submit
        ? `Request ${result.id} submitted for technical assessment.`
        : `Draft ${result.id} saved to the request register.`,
    );
    onSaved?.(result.id);
  };

  const meta = SOURCE_META[form.source];
  const sourceFields = SOURCE_FIELDS[form.source] || [];

  return (
    <form
      className={`er-request-form${embedded ? ' is-embedded' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        save(!editing);
      }}
      noValidate
    >
      {banner && (
        <div className={`form-banner ${bannerTone === 'error' ? 'error' : ''}`} role="status">
          {bannerTone === 'error' ? <X aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}
          <span>{banner}</span>
        </div>
      )}

      <Card
        icon={ClipboardList}
        title="Request Information"
        subtitle="Common fields captured for every request source"
      >
        <div className="form-grid">
          <div className="form-field">
            <span className="form-label">Request ID</span>
            <span className="form-static er-static-id">
              {record?.id || 'Generated on save (REQ-2026-xxx)'}
            </span>
          </div>
          <Select
            id="er-source"
            label="Request Source *"
            value={form.source}
            options={REQUEST_SOURCES.map((source) => ({ value: source, label: source }))}
            hint={errors.source || 'Controls the source-specific fields below'}
            aria-invalid={Boolean(errors.source)}
            onChange={(event) => setField('source', event.target.value)}
          />
          <div className="form-grid-full">
            <Input
              id="er-title"
              label="Request Title *"
              value={form.title}
              placeholder={`e.g. ${BASE_TITLES[form.source]} for a new assembly`}
              hint={errors.title || 'Short, specific description of the requirement'}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => setField('title', event.target.value)}
            />
          </div>
          <Select
            id="er-category"
            label="Request Category *"
            value={form.category}
            options={REQUEST_CATEGORIES.map((category) => ({ value: category, label: category }))}
            hint={errors.category}
            aria-invalid={Boolean(errors.category)}
            onChange={(event) => setField('category', event.target.value)}
          />
          <Select
            id="er-priority"
            label="Priority"
            value={form.priority}
            options={REQUEST_PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
            onChange={(event) => setField('priority', event.target.value)}
          />
          <Input
            id="er-request-date"
            label="Request Date *"
            type="date"
            value={form.requestDate}
            hint={errors.requestDate}
            aria-invalid={Boolean(errors.requestDate)}
            onChange={(event) => setField('requestDate', event.target.value)}
          />
          <Input
            id="er-required-date"
            label="Required Date *"
            type="date"
            value={form.requiredDate}
            hint={errors.requiredDate || 'Must be on or after the request date'}
            aria-invalid={Boolean(errors.requiredDate)}
            onChange={(event) => setField('requiredDate', event.target.value)}
          />
          <Input
            id="er-product"
            label="Product Reference"
            value={form.productReference}
            placeholder="Product, machine or equipment reference"
            onChange={(event) => setField('productReference', event.target.value)}
          />
          <Input
            id="er-project"
            label="Project Reference"
            value={form.projectReference}
            placeholder="Related project, where applicable"
            onChange={(event) => setField('projectReference', event.target.value)}
          />
          <Select
            id="er-assigned"
            label="Assigned To"
            value={form.assignedTo}
            options={[
              { value: '', label: 'Assign during review' },
              ...TECHNICAL_REVIEWERS.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(event) => setField('assignedTo', event.target.value)}
          />
          <div className="form-grid-full">
            <Textarea
              id="er-description"
              label="Request Description *"
              rows={4}
              value={form.description}
              placeholder="What is required, why it is required and any constraints the design team must know."
              hint={errors.description}
              aria-invalid={Boolean(errors.description)}
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card
        icon={Info}
        title={`${form.source} Requirements`}
        subtitle={meta?.description}
      >
        <p className="er-section-note">
          Fields marked <strong>*</strong> are mandatory. Switching the request source keeps values
          already entered for the other sources.
        </p>
        <div className="form-grid">
          {sourceFields.map((definition) => (
            <SourceField
              key={definition.key}
              definition={definition}
              value={form.sourceFields?.[definition.key] || ''}
              error={errors[definition.key]}
              onChange={setSourceField}
            />
          ))}
        </div>
      </Card>

      <Card
        icon={FileCheck2}
        title="Attachments & Remarks"
        subtitle="Supporting documents follow the existing local attachment pattern"
      >
        <div className="form-grid">
          <div className="form-grid-full">
            <AttachmentPicker
              label="Request Attachments"
              documents={form.documents || []}
              onChange={(documents) => setField('documents', documents)}
            />
          </div>
          <div className="form-grid-full">
            <Textarea
              id="er-remarks"
              label="Additional Remarks"
              rows={3}
              value={form.remarks}
              placeholder="Any additional information for the design team."
              onChange={(event) => setField('remarks', event.target.value)}
            />
          </div>
        </div>
      </Card>

      <div className="project-form-actions">
        <div className="project-form-actions-left">
          <Button
            type="button"
            variant="ghost"
            icon={X}
            onClick={() => (onCancel ? onCancel() : navigate('/customer-sales'))}
          >
            Cancel
          </Button>
          <span className="project-form-actions-note">
            {record?.id || 'New request'} · {form.source} · {form.priority} priority
          </span>
        </div>
        <div className="project-form-footer-right er-form-actions">
          {!editing && (
            <Button type="button" variant="secondary" icon={Save} onClick={() => save(false)}>
              Save Draft
            </Button>
          )}
          <Button type="submit" icon={editing ? Save : Send}>
            {editing ? 'Save Changes' : 'Submit Request'}
          </Button>
        </div>
      </div>
    </form>
  );
}
