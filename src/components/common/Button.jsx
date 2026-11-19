/**
 * Button — the three ERP button families in one reusable component.
 *   primary   → gradient emerald action button (Create / New)
 *   secondary → white button with green outline
 *   ghost     → compact toolbar button (Show Filters / Refresh / Export)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  className = '',
  type = 'button',
  ...rest
}) {
  const baseClass =
    variant === 'primary' ? 'erp-btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost';
  const classes = [baseClass, size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {Icon && variant === 'primary' ? (
        <span className="erp-btn-icon">
          <Icon aria-hidden="true" />
        </span>
      ) : (
        Icon && <Icon aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

/** Compact icon-only control used inside table rows and dropdown triggers. */
export function IconButton({ icon: Icon, label, className = '', type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={`icon-btn ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
