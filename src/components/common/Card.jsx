/**
 * Card / SectionCard — the white panel used across the ERP pages.
 * Pass `icon` for the dashboard-style section header (icon + title + subtitle).
 */
export default function Card({
  icon: HeaderIcon,
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = '',
  ...rest
}) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {(title || actions) && (
        <div className="card-header">
          <div className="card-header-text">
            {title && (
              <h2 className="card-title">
                {HeaderIcon && <HeaderIcon aria-hidden="true" />}
                {title}
              </h2>
            )}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-header-actions">{actions}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
