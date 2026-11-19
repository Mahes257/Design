import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, History, X } from 'lucide-react';
import { Modal } from '../../components/common';
import { formatDate } from '../../data/mechanicalData';

/** Small feedback toast used by list actions (duplicate, archive, save). */
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return { toast, showToast, clearToast: () => setToast(null) };
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`mech-toast${toast.tone === 'error' ? ' is-error' : ''}`} role="status">
      <CheckCircle2 aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" aria-label="Dismiss message" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

/** Definition row used inside view modals and detail lists. */
export function Fact({ label, children }) {
  return (
    <div className={`fact${children ? '' : ' is-empty'}`}>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{children || '—'}</span>
    </div>
  );
}

/** Shared revision history dialog for designs, parts, assemblies and calcs. */
export function RevisionHistoryModal({ open, onClose, title, subtitle, revisions = [] }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Revision History'}
      subtitle={subtitle}
      maxWidth="max-w-lg"
      footer={
        <button type="button" className="erp-btn-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      {revisions.length === 0 ? (
        <p className="dash-modal-note">No revisions recorded yet.</p>
      ) : (
        <ol className="mech-timeline">
          {[...revisions].reverse().map((entry) => (
            <li key={`${entry.revision}-${entry.date}`}>
              <span className="mech-timeline-dot" aria-hidden="true">
                <History />
              </span>
              <span className="mech-timeline-body">
                <span className="mech-timeline-head">
                  <strong>Rev {entry.revision}</strong>
                  <span>{formatDate(entry.date)}</span>
                </span>
                <span className="mech-timeline-note">{entry.note}</span>
                <span className="mech-timeline-by">{entry.by}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

/** Activity history list shared by the design detail page. */
export function ActivityList({ activity = [] }) {
  if (activity.length === 0) {
    return <p className="dash-modal-note">No activity recorded yet.</p>;
  }
  return (
    <ol className="mech-timeline">
      {[...activity].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="mech-timeline-dot" aria-hidden="true">
            <History />
          </span>
          <span className="mech-timeline-body">
            <span className="mech-timeline-head">
              <strong>{entry.label}</strong>
              <span>{formatDate(entry.at)}</span>
            </span>
            <span className="mech-timeline-note">{entry.detail}</span>
            <span className="mech-timeline-by">{entry.by}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
