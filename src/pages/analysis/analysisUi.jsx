import { History } from 'lucide-react';
import { formatDate } from '../../data/analysisData';
import { Fact } from '../mechanical/mechanicalUi';

export { Fact };
export { Toast, useToast } from '../mechanical/mechanicalUi';

/** Status-change timeline used by review history and analysis activity lists. */
export function ReviewHistoryList({ history = [] }) {
  if (history.length === 0) {
    return <p className="dash-modal-note">No review history recorded yet.</p>;
  }
  return (
    <ol className="mech-timeline">
      {[...history].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="mech-timeline-dot" aria-hidden="true">
            <History />
          </span>
          <span className="mech-timeline-body">
            <span className="mech-timeline-head">
              <strong>{entry.action}</strong>
              <span>{entry.at ? formatDate(entry.at.slice(0, 10)) : ''}</span>
            </span>
            <span className="mech-timeline-note">
              {entry.previousStatus ? `${entry.previousStatus} → ${entry.newStatus}` : entry.newStatus}
              {entry.comments ? ` · ${entry.comments}` : ''}
            </span>
            <span className="mech-timeline-by">{entry.user}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Activity list for analysis and report records. */
export function AnalysisActivityList({ activity = [] }) {
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
              <span>{entry.at ? formatDate(entry.at) : ''}</span>
            </span>
            <span className="mech-timeline-note">{entry.detail}</span>
            <span className="mech-timeline-by">{entry.by}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
