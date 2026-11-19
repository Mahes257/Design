import { useMemo, useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import StatusBadge from './StatusBadge';

/**
 * RecordPreview — the quick preview used by every list table's Actions menu.
 *
 * It renders the ACTUAL selected record: no sample or invented values. Fields
 * are taken from the record itself (or an explicit `fields` list) and missing
 * values read "Not available". The footer links to the record's complete View
 * Details page.
 */

const LABEL_OVERRIDES = {
  id: 'Record ID',
  projectId: 'Project',
  designId: 'Design',
  bomId: 'BOM',
  drawingId: 'Drawing',
  reviewId: 'Review',
  transferId: 'Transfer',
  handoverId: 'Handover',
  partNumber: 'Part Number',
  drawingNumber: 'Drawing Number',
  quotationRef: 'Quotation Reference',
  linkedEnquiryId: 'Customer Enquiry',
  uom: 'UOM',
  qty: 'Quantity',
  rev: 'Revision',
  createdAt: 'Created',
  updatedAt: 'Last Updated',
  dueDate: 'Due Date',
  targetDate: 'Target Date',
};

/** Keys that hold child collections or deeply nested workflow state. */
const SKIP_KEYS = new Set([
  'history',
  'activity',
  'revisions',
  'changeHistory',
  'statusHistory',
  'items',
  'approvals',
  'attachments',
  'attachmentFiles',
  'stageStates',
  'tech',
  'contents',
  'purchase',
  'production',
  'validation',
  'points',
  'characteristics',
  'sequence',
  'instructions',
  'equipment',
  'stageStates',
  'checklist',
  'engineeringChecklist',
  'manufacturingChecklist',
]);

const MAX_FIELDS = 14;

/** The fields an ERP user expects first in a quick preview. */
const PRIORITY = [
  'id',
  'name',
  'title',
  'projectId',
  'projectName',
  'designId',
  'designName',
  'bomId',
  'drawingNumber',
  'partNumber',
  'reviewId',
  'status',
  'approvalStatus',
  'verificationStatus',
  'releaseStatus',
  'revision',
  'priority',
  'engineer',
  'owner',
  'preparedBy',
  'reviewer',
  'customer',
  'customerName',
  'date',
  'created',
  'createdAt',
  'updatedAt',
  'dueDate',
  'target',
  'description',
];

function humanize(key) {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isLongText(value) {
  return typeof value === 'string' && value.length > 180;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'entry' : 'entries'}`;
  if (typeof value === 'object') return null;
  return String(value);
}

/** Build preview fields from the record's own scalar values. */
export function derivePreviewFields(record, limit = MAX_FIELDS) {
  if (!record || typeof record !== 'object') return [];
  const rows = [];
  Object.entries(record).forEach(([key, value]) => {
    if (SKIP_KEYS.has(key)) return;
    // Preview shows the record's real values; empty fields are omitted so the
    // quick view is not a wall of "Not available" rows.
    if (value === null || value === undefined || value === '') return;
    const shown = displayValue(value);
    if (shown === null) return;
    const priority = PRIORITY.indexOf(key);
    rows.push({
      key,
      label: humanize(key),
      value: shown,
      wide: isLongText(value),
      rank: priority === -1 ? PRIORITY.length : priority,
    });
  });
  rows.sort((a, b) => a.rank - b.rank);
  return rows.slice(0, limit);
}

export function RecordPreviewDialog({
  record,
  open,
  onClose,
  title,
  subtitle,
  fields,
  viewHref,
  viewLabel = 'Open full details',
  statusKey = 'status',
  onView,
}) {
  const rows = useMemo(() => {
    if (!record) return [];
    if (typeof fields === 'function') return fields(record) || [];
    if (Array.isArray(fields)) return fields;
    return derivePreviewFields(record);
  }, [record, fields]);

  if (!record) return null;

  const recordId =
    record.id || record.drawingNumber || record.partNumber || record.quotationRef || 'Record';
  const status = record[statusKey] || record.approvalStatus || record.verificationStatus;

  return (
    <Modal
      open={open ?? Boolean(record)}
      onClose={onClose}
      title={title || String(recordId)}
      subtitle={subtitle}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onView ? (
            <Button icon={ArrowRight} onClick={onView}>
              {viewLabel}
            </Button>
          ) : (
            viewHref && (
              <Button icon={ArrowRight} onClick={() => { onClose?.(); window.location.assign(viewHref); }}>
                {viewLabel}
              </Button>
            )
          )}
        </>
      }
    >
      <div className="record-preview">
        <div className="record-preview-head">
          <span className="record-preview-ref">{recordId}</span>
          <StatusBadge status={status} />
        </div>
        <p className="record-preview-note">
          Quick preview of the selected record. Values come directly from this record; open the
          full details page for the complete history and linked records.
        </p>
        <dl className="record-preview-grid">
          {rows.map((row) => (
            <div
              key={row.key || row.label}
              className={row.wide ? 'record-preview-field is-wide' : 'record-preview-field'}
            >
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}

/**
 * useRecordPreview — keeps the dialog state and the menu entry for a table.
 *
 *   const preview = useRecordPreview({ viewHref: (row) => `/route/${row.id}` });
 *   rowActions={(row) => [{ view... }, preview.item, ...]}
 *   onRowAction={(key, row) => { if (preview.handle(key, row)) return; ... }}
 *   {preview.dialog}
 */
export function useRecordPreview(config = {}) {
  const [record, setRecord] = useState(null);

  return {
    item: { key: 'preview', label: 'Preview', icon: Eye },
    handle(key, row) {
      if (key !== 'preview') return false;
      setRecord(row);
      return true;
    },
    dialog: (
      <RecordPreviewDialog
        record={record}
        onClose={() => setRecord(null)}
        title={config.title ? config.title(record) : undefined}
        subtitle={config.subtitle ? config.subtitle(record) : undefined}
        fields={config.fields}
        viewHref={record && config.viewHref ? config.viewHref(record) : undefined}
        viewLabel={config.viewLabel}
      />
    ),
  };
}
