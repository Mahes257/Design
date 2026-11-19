/**
 * PageHeader — icon + title + subtitle on the left, actions on the right.
 * Mirrors the reference ERP's pr-page-header block.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, className = '' }) {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="page-header-title">
        <h1>
          {Icon && <Icon aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
