import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  FolderKanban,
  Paperclip,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button, Modal, StatusBadge } from '../../components/common';
import { useProjects } from '../../context/ProjectsContext';
import { APP_USER } from '../../constants/brand';
import { projectDraftFromRequest, projectForRequest } from '../../data/projectConversion';
import { formatBytes, formatDate } from '../../data/customerEnquiryData';
import {
  SOURCE_META,
  conversionEligibility,
  requestStatusTone,
  requesterLabel,
  sourceTone,
} from '../../data/enquiryRequestData';

export function RequestStatus({ status }) {
  return <StatusBadge status={status} tone={requestStatusTone(status)} />;
}

export function RequestSource({ source }) {
  return <StatusBadge status={source} tone={sourceTone(source)} />;
}

export function RequestPriority({ priority }) {
  const tone = { Critical: 'red', High: 'orange', Medium: 'blue', Low: 'gray' }[priority];
  return <StatusBadge status={priority} tone={tone} />;
}

export function RequesterCell({ record }) {
  const primary = requesterLabel(record);
  const secondary =
    record.source === 'Customer'
      ? record.sourceFields?.contactPerson
      : record.source === 'Inter-Department'
        ? record.sourceFields?.requesterName
        : record.sourceFields?.rdReference ||
          record.sourceFields?.serviceReference ||
          record.sourceFields?.departmentReference;
  return (
    <span className="ce-customer-cell">
      <strong>{primary}</strong>
      {secondary ? <span>{secondary}</span> : null}
    </span>
  );
}

/** Attachments list shared by the request detail and assessment sections. */
export function DocumentList({ documents = [], onRemove, emptyLabel = 'No attachments recorded.' }) {
  if (!documents.length) return <p className="cell-muted">{emptyLabel}</p>;
  return (
    <ul className="er-doc-list">
      {documents.map((doc) => (
        <li key={doc.id}>
          <span className="er-doc-icon">
            <FileText aria-hidden="true" />
          </span>
          <div className="er-doc-body">
            <strong>{doc.name}</strong>
            <span>
              {doc.category}
              {doc.size ? ` · ${formatBytes(doc.size)}` : ''}
              {doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ''}
            </span>
            {doc.notes ? <small>{doc.notes}</small> : null}
          </div>
          {onRemove && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${doc.name}`}
              onClick={() => onRemove(doc.id)}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Local-only attachment picker used by the request, assessment and quotation forms. */
export function AttachmentPicker({ documents = [], onChange, label = 'Attachments', disabled = false }) {
  const [category, setCategory] = useState('Supporting Document');
  const addFiles = (fileList) => {
    const picked = Array.from(fileList || []).map((file, index) => ({
      id: `DOC-LOCAL-${Date.now()}-${index}`,
      name: file.name,
      category,
      type: file.type || 'Unknown',
      size: file.size || 0,
      uploadedAt: new Date().toISOString().slice(0, 16),
      uploadedBy: APP_USER.name,
      notes: '',
    }));
    if (picked.length) onChange([...documents, ...picked]);
  };

  return (
    <div className="er-attachments">
      <div className="er-attachments-head">
        <span className="form-label">{label}</span>
        <span className="er-attachment-note">
          <Paperclip aria-hidden="true" /> Metadata only — files are not uploaded.
        </span>
      </div>
      {!disabled && (
        <div className="er-attachment-actions">
          <select
            className="form-select"
            value={category}
            aria-label="Attachment category"
            onChange={(event) => setCategory(event.target.value)}
          >
            {[
              'Supporting Document',
              'Customer Drawing',
              'Technical Specification',
              'Reference Document',
              'Service Report',
              'Commercial Document',
            ].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label className="btn-secondary btn-sm er-file-btn">
            Choose Files
            <input
              type="file"
              multiple
              className="er-file-input"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      )}
      <DocumentList
        documents={documents}
        onRemove={
          disabled
            ? undefined
            : (id) => onChange(documents.filter((doc) => doc.id !== id))
        }
      />
    </div>
  );
}

/**
 * Request-to-project conversion.
 *
 * One source request owns at most one project. The first conversion creates a
 * Draft project with the request fields mapped across and opens the full-page
 * project form. Later attempts reopen that draft instead of creating another.
 * The request itself is updated (linked project + Converted status) only when
 * Create Project is confirmed in Module 02.
 */
export function useRequestConversion() {
  const navigate = useNavigate();
  const { projects, nextProjectId, addProject } = useProjects();
  const [dialog, setDialog] = useState(null);
  const [result, setResult] = useState(null);

  const existing = dialog ? projectForRequest(projects, dialog.id) : null;

  const eligibility = useMemo(() => {
    if (!dialog) return null;
    if (existing) {
      return {
        eligible: true,
        existing,
        reason: `Project ${existing.id} already exists for this request (${existing.status}). Continuing opens that record — no duplicate is created.`,
      };
    }
    return conversionEligibility(dialog);
  }, [dialog, existing]);

  const openConvert = (record) => {
    setResult(null);
    setDialog(record);
  };

  const convert = () => {
    if (!dialog) return;

    if (existing) {
      setDialog(null);
      navigate(
        existing.status === 'Draft'
          ? `/projects/new-project/${existing.id}`
          : `/projects/all-projects/${existing.id}`,
      );
      return;
    }

    if (dialog.linkedProjectId) {
      setDialog(null);
      navigate(`/projects/all-projects/${dialog.linkedProjectId}`);
      return;
    }

    const check = conversionEligibility(dialog);
    if (!check.eligible) {
      setResult({ tone: 'error', message: check.reason });
      return;
    }

    const projectId = nextProjectId();
    addProject(projectDraftFromRequest(dialog, projectId));
    setDialog(null);
    navigate(`/projects/new-project/${projectId}`);
  };

  const node = dialog ? (
    <Modal
      open
      onClose={() => setDialog(null)}
      title="Convert Request to Project"
      subtitle={`${dialog.id} · ${dialog.title}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button icon={ArrowRightLeft} disabled={!eligibility?.eligible} onClick={convert}>
            {existing
              ? existing.status === 'Draft'
                ? 'Continue Project Draft'
                : 'Open Existing Project'
              : 'Create Project Draft'}
          </Button>
        </>
      }
    >
      <div
        className={`er-convert-state is-${eligibility?.eligible ? 'ready' : 'blocked'}`}
      >
        {eligibility?.eligible ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <ShieldAlert aria-hidden="true" />
        )}
        <div>
          <strong>
            {existing
              ? 'Project already linked'
              : eligibility?.eligible
                ? 'Eligible for project conversion'
                : 'Conversion blocked'}
          </strong>
          <p>{eligibility?.reason}</p>
        </div>
      </div>
      <dl className="detail-list er-convert-facts">
        <dt>Request</dt>
        <dd>{dialog.title}</dd>
        <dt>Source</dt>
        <dd>{SOURCE_META[dialog.source]?.label || dialog.source}</dd>
        <dt>Requester</dt>
        <dd>{requesterLabel(dialog)}</dd>
        <dt>Category</dt>
        <dd>{dialog.category}</dd>
        <dt>Status</dt>
        <dd>{dialog.status}</dd>
        <dt>Attachments</dt>
        <dd>{(dialog.documents || []).length} file reference(s) copied</dd>
        {existing && (
          <>
            <dt>Existing Project</dt>
            <dd>
              {existing.id} · {existing.status}
            </dd>
          </>
        )}
      </dl>
      <p className="er-dialog-note">
        A project Draft is created immediately with the request information copied across, then
        opened in the full-page project form for review. The project stays Draft until Create
        Project is confirmed, and the request is only marked converted at that point.
      </p>
      {result && (
        <div className={`form-banner ${result.tone === 'error' ? 'error' : ''}`} role="status">
          {result.tone === 'error' ? <X aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>{result.message}</span>
        </div>
      )}
    </Modal>
  ) : null;

  return { openConvert, convertDialog: node };
}
