/**
 * StatCard — the ERP KPI tile: 42px tinted icon, 26px value, 12px label,
 * optional caption. `active` renders the selected mint state with a green ring.
 */
const TONES = {
  teal: { color: '#0A4F44', bg: 'rgba(10,79,68,0.08)' },
  amber: { color: '#D97706', bg: 'rgba(217,119,6,0.10)' },
  emerald: { color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  red: { color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  purple: { color: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  blue: { color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  orange: { color: '#EA580C', bg: 'rgba(234,88,12,0.10)' },
  sky: { color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' },
  gray: { color: '#6B7280', bg: 'rgba(100,116,139,0.10)' },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'teal',
  color,
  bg,
  active = false,
  onClick,
}) {
  const palette = TONES[tone] || TONES.teal;
  const interactive = typeof onClick === 'function';

  return (
    <div
      className={`kpi-card${active ? ' active' : ''}${interactive ? ' is-clickable' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? active : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span
        className="kpi-icon"
        style={{ color: color || palette.color, backgroundColor: bg || palette.bg }}
        aria-hidden="true"
      >
        <Icon />
      </span>
      <div className="kpi-body">
        <div className="kpi-value" title={String(value ?? '')}>
          {value}
        </div>
        <div className="kpi-label" title={label}>
          {label}
        </div>
        {sub && (
          <div className="kpi-sub" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export function KpiGrid({ children, className = '' }) {
  return <div className={`kpi-grid ${className}`.trim()}>{children}</div>;
}
