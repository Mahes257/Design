/** EmptyState — centred icon, title, message and optional action. */
export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {Icon && (
        <span className="empty-state-icon" aria-hidden="true">
          <Icon />
        </span>
      )}
      {title && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
