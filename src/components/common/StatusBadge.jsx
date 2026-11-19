/**
 * StatusBadge — one semantic tone per workflow state, matching the reference
 * ERP's status pill colours. Pass `tone` to override the automatic mapping.
 *
 *   green  success / approved / released
 *   blue   in design / in progress
 *   purple design review
 *   orange pending / waiting
 *   red    rejected / delayed
 *   gray   draft / on hold / closed
 */
const TONE_BY_STATUS = {
  approved: 'green',
  released: 'green',
  completed: 'green',
  'as-built': 'green',
  'in design': 'blue',
  'in progress': 'blue',
  active: 'blue',
  'design review': 'purple',
  'in review': 'purple',
  'under review': 'purple',
  pending: 'orange',
  'pending review': 'orange',
  'pending approval': 'orange',
  'on hold': 'gray',
  draft: 'gray',
  closed: 'gray',
  archived: 'gray',
  delayed: 'red',
  overdue: 'red',
  rejected: 'red',
  'changes requested': 'red',
};

export function statusTone(status) {
  if (!status) return 'gray';
  return TONE_BY_STATUS[String(status).trim().toLowerCase()] || 'gray';
}

export default function StatusBadge({ status, tone, className = '' }) {
  if (!status) return <span className="cell-muted">—</span>;
  const resolved = tone || statusTone(status);

  return <span className={`status-pill tone-${resolved} ${className}`.trim()}>{status}</span>;
}
