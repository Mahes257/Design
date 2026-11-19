import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleAlert, CircleDashed, PackageCheck } from 'lucide-react';
import { Button, EmptyState, StatusBadge } from '../../components/common';
import { PACKAGE_CATEGORIES, formatHandoverDate, packageCompleteness, validationSummary } from '../../data/designHandoverData';

export function HandoverSelector({ handovers, value, onChange, label = 'Handover record' }) {
  return (
    <div className="dh-selector-row">
      <label className="dh-selector-label" htmlFor="dh-handover-select">
        {label}
      </label>
      <select
        id="dh-handover-select"
        className="form-select dh-selector"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {handovers.length === 0 && <option value="">No handover records</option>}
        {handovers.map((handover) => (
          <option key={handover.id} value={handover.id}>
            {handover.id} · {handover.designId} Rev {handover.designRevision} · {handover.status}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NoHandovers({ message = 'Create a handover record before preparing its final design package.' }) {
  return (
    <EmptyState
      icon={PackageCheck}
      title="No handover record selected"
      message={message}
      action={<Link className="erp-btn-primary" to="/design-handover/new"><span className="erp-btn-icon">＋</span>Create Handover</Link>}
    />
  );
}

export function ModuleStat({ label, value, tone = 'blue', hint }) {
  return (
    <div className={`dh-stat dh-stat-${tone}`}>
      <span className="dh-stat-value">{value}</span>
      <span className="dh-stat-label">{label}</span>
      {hint && <span className="dh-stat-hint">{hint}</span>}
    </div>
  );
}

export function CompletenessBar({ packageRecord }) {
  if (!packageRecord) return null;
  const completeness = packageCompleteness(packageRecord);
  return (
    <div className="dh-completeness">
      <div className="dh-completeness-head">
        <span>Package completeness</span>
        <strong>{completeness.selectedMandatory}/{completeness.mandatoryTotal} mandatory categories</strong>
      </div>
      <div className="dh-progress" role="progressbar" aria-valuenow={completeness.percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${completeness.percent}%` }} />
      </div>
      <div className="dh-completeness-foot">
        <span>{completeness.percent}% mandatory coverage</span>
        <span>{completeness.selectedOptional} optional categor{completeness.selectedOptional === 1 ? 'y' : 'ies'} linked</span>
      </div>
      {completeness.missingMandatory.length > 0 && (
        <p className="dh-inline-alert">
          <CircleAlert aria-hidden="true" />
          Missing: {completeness.missingMandatory.map((category) => category.label).join(', ')}
        </p>
      )}
    </div>
  );
}

export function ValidationSummaryCard({ validation, onOpenPackage }) {
  const summary = validationSummary(validation);
  const pending = !validation;
  const blocked = summary.mandatoryFailures > 0;
  return (
    <div className={`dh-readiness-card ${pending ? 'is-pending' : blocked ? 'is-blocked' : 'is-ready'}`}>
      <div className="dh-readiness-icon">
        {pending ? <CircleDashed aria-hidden="true" /> : blocked ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      </div>
      <div className="dh-readiness-body">
        <div className="dh-readiness-top">
          <h3>{pending ? 'Validation not run' : blocked ? 'Release blocked' : 'Ready for controlled release'}</h3>
          <StatusBadge status={pending ? 'Pending' : blocked ? 'Blocked' : 'Ready'} tone={pending ? 'orange' : blocked ? 'red' : 'green'} />
        </div>
        <p>
          {pending
            ? 'Run the release validation to evaluate the actual linked records. No check is treated as passed until it is evaluated.'
            : blocked
              ? `${summary.mandatoryFailures} mandatory check${summary.mandatoryFailures === 1 ? '' : 's'} failed. Release remains blocked until the source evidence is corrected.`
              : 'All mandatory checks pass. Confirm the package and release details before recording the controlled release.'}
        </p>
        <div className="dh-readiness-counts">
          <span><strong>{summary.pass}</strong> Pass</span>
          <span><strong>{summary.fail}</strong> Fail</span>
          <span><strong>{summary.notApplicable}</strong> N/A</span>
          <span><strong>{summary.pending}</strong> Pending</span>
        </div>
        {blocked && (
          <div className="dh-blocking-list">
            <strong>Why release is blocked</strong>
            <ul>
              {validation.results.filter((item) => item.mandatory && item.result === 'Fail').map((item) => (
                <li key={item.key}>{item.label} — {item.remarks || item.evidence}</li>
              ))}
            </ul>
          </div>
        )}
        {blocked && onOpenPackage && (
          <Button variant="secondary" size="sm" onClick={onOpenPackage} icon={ArrowRight}>
            Open package corrections
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReleaseCard({ release }) {
  if (!release) return null;
  return (
    <div className="dh-release-card">
      <div>
        <span className="dh-eyebrow">Controlled design release</span>
        <h3>{release.id}</h3>
        <p>Released {formatHandoverDate(release.date)} by {release.releasedBy}</p>
      </div>
      <div className="dh-release-grid">
        <div><span>Design revision</span><strong>{release.designId} Rev {release.designRevision}</strong></div>
        <div><span>Package</span><strong>{release.packageId} v{release.packageVersion}</strong></div>
        <div><span>Status</span><StatusBadge status={release.status} tone="green" /></div>
      </div>
    </div>
  );
}

export function CategoryLabel({ category }) {
  return (
    <span className="dh-category-label">
      {category.label}
      <span className={`dh-requirement ${category.mandatory ? 'is-mandatory' : 'is-optional'}`}>
        {category.mandatory ? 'Mandatory' : 'Optional'}
      </span>
    </span>
  );
}

export function packageCategoryMeta(categoryKey) {
  return PACKAGE_CATEGORIES.find((category) => category.key === categoryKey);
}
