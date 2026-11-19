import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import Button from './Button';
import Card from './Card';
import PageHeader from './PageHeader';
import PageLayout from './PageLayout';
import ViewPageBanner from './ViewPageBanner';

/**
 * RecordDetailsPage — the shared full-page record details frame.
 *
 * This is the single layout every module uses for its View / Preview page:
 *   breadcrumb → module + record title + status + actions
 *   → record reference strip with the module's key facts
 *   → information sections → attachments → related records → history → footer.
 *
 * It only renders values handed to it by the module page, and those pages read
 * the actual record from its context by route ID. Nothing here invents fields,
 * attachments, relations or history entries.
 */

const LABEL_OVERRIDES = {
  id: 'Record ID',
  partNumber: 'Part Number',
  drawingNumber: 'Drawing Number',
  projectId: 'Project',
  designId: 'Design',
  bomId: 'BOM',
  planId: 'Design Plan',
  taskId: 'Design Task',
  assemblyId: 'Assembly',
  ecrId: 'ECR',
  ecoId: 'ECO',
  cadFileId: 'CAD File',
  uom: 'UOM',
  qty: 'Quantity',
  rev: 'Revision',
  createdAt: 'Created',
  updatedAt: 'Last Updated',
};

export function humanizeField(key) {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function displayFieldValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? `${value.length} entries` : '—';
  if (typeof value === 'object') return null;
  return String(value);
}

/**
 * Remaining scalar fields of the record that a page did not list explicitly.
 * Keeps module pages short without hiding real populated values.
 */
export function remainingFields(record, usedKeys = [], skipKeys = []) {
  if (!record) return [];
  const skip = new Set([...usedKeys, ...skipKeys]);
  const rows = [];
  Object.entries(record).forEach(([key, value]) => {
    if (skip.has(key)) return;
    const shown = displayFieldValue(value);
    if (shown === null || shown === '—') return;
    if (value && typeof value === 'object') return;
    rows.push({ key, label: humanizeField(key), value: shown });
  });
  return rows;
}

export function Fact({ label, value, wide = false }) {
  return (
    <div className={`fact${wide ? ' is-wide' : ''}`}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">
        {value === null || value === undefined || value === '' ? '—' : value}
      </span>
    </div>
  );
}

function DetailSection({ section }) {
  const wideFields = section.fields.filter((field) => field.wide);
  const inlineFields = section.fields.filter((field) => !field.wide);
  return (
    <Card title={section.title} icon={section.icon || FileText}>
      {inlineFields.length > 0 && (
        <div className="fact-grid">
          {inlineFields.map((field) => (
            <Fact key={field.label} label={field.label} value={field.value} />
          ))}
        </div>
      )}
      {wideFields.length > 0 && (
        <div className="fact-stack">
          {wideFields.map((field) => (
            <div key={field.label} className="fact is-wide">
              <span className="fact-label">{field.label}</span>
              <span className="fact-value">{field.value || '—'}</span>
            </div>
          ))}
        </div>
      )}
      {section.children}
    </Card>
  );
}

/**
 * RecordNotFound — the honest state for an ID that does not resolve to a record
 * (deleted record, stale link or a mistyped URL). It never renders another
 * record's data.
 */
export function RecordNotFound({ icon, title = 'Record not found', message, backTo, backLabel = 'Back to Register' }) {
  const navigate = useNavigate();
  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            ...(backTo ? [{ label: backLabel.replace(/^Back to /, ''), to: backTo }] : []),
            { label: 'Not found' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={icon}
          title={title}
          subtitle={
            message ||
            'This record is not available in the current register. It may have been deleted, or the link may be out of date.'
          }
          actions={
            backTo && (
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(backTo)}>
                {backLabel}
              </Button>
            )
          }
        />
      }
    >
      <Card title="What you can do next" icon={FileText}>
        <p className="dash-modal-note">
          Return to the register and open the record from its row. No substitute or sample record is
          shown here.
        </p>
      </Card>
    </PageLayout>
  );
}

export default function RecordDetailsPage({
  breadcrumbItems = [],
  icon,
  title,
  subtitle,
  recordRef,
  status,
  chips,
  meta = [],
  actions,
  backTo,
  backLabel = 'Back to Register',
  sections = [],
  attachments,
  related,
  history,
  footer,
  note,
  children,
}) {
  const navigate = useNavigate();

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={icon}
        eyebrow={recordRef}
        title={title}
        subtitle={subtitle}
        breadcrumbs={<Breadcrumb items={breadcrumbItems} />}
        chips={
          <>
            {status}
            {chips}
          </>
        }
        meta={meta}
        actions={
          <>
            {backTo && (
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(backTo)}>
                {backLabel}
              </Button>
            )}
            {actions}
          </>
        }
      />

      <div className="mech-detail-stack">
        {sections.map((section) => (
          <DetailSection key={section.title} section={section} />
        ))}

        {attachments?.length > 0 && (
          <Card title="Attachments" icon={FileText}>
            <ul className="mech-document-list">
              {attachments.map((attachment) => (
                <li key={`${attachment.name}-${attachment.type || ''}`}>
                  <FileText aria-hidden="true" />
                  <span>{attachment.name}</span>
                  {attachment.type && <span className="cell-muted">{attachment.type}</span>}
                  {attachment.size != null && (
                    <span className="cell-muted">
                      {Math.max(1, Math.round(attachment.size / 1024))} KB
                    </span>
                  )}
                  {attachment.action}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {related?.length > 0 && (
          <Card title="Related Records" icon={FileText}>
            <div className="fact-grid">
              {related.map((item) => (
                <Fact key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </Card>
        )}

        {history?.length > 0 && (
          <Card title="History" icon={FileText}>
            <ul className="plan-task-list">
              {history.map((entry, index) => (
                <li key={`${entry.at || entry.label || 'entry'}-${index}`}>
                  <span className="cell-id">{entry.label || 'Entry'}</span>
                  <span className="plan-task-name">{entry.detail || '—'}</span>
                  <span className="cell-muted">{entry.by || ''}</span>
                  <span className="cell-muted">{entry.at || ''}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {children}

        {note && <p className="mech-footnote">{note}</p>}

        {footer && <div className="record-detail-footer">{footer}</div>}
      </div>
    </PageLayout>
  );
}
