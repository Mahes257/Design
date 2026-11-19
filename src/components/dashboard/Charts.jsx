/**
 * Hand-rolled SVG charts for the dashboard.
 * No charting dependency — the app stays on React + Tailwind + Lucide only.
 */

/** Donut chart with a centred total and a legend beside it. */
export function DonutChart({
  data = [],
  size = 168,
  thickness = 20,
  centerValue,
  centerLabel,
  ariaLabel,
  formatValue = (value) => value,
  onSelect,
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const safeTotal = total || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cursor = 0;
  const segments = data
    .filter((item) => item.value > 0)
    .map((item) => {
      const length = (item.value / safeTotal) * circumference;
      const segment = {
        ...item,
        length,
        rotation: (cursor / circumference) * 360 - 90,
      };
      cursor += length;
      return segment;
    });

  return (
    <div className="donut-wrap">
      <svg
        className="donut-chart"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel || 'Distribution chart'}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--dash-track)"
          strokeWidth={thickness}
        />
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={thickness}
            strokeDasharray={`${Math.max(segment.length - 3, 0)} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${segment.rotation} ${center} ${center})`}
            className={onSelect ? 'chart-selectable' : undefined}
            onClick={onSelect ? () => onSelect(segment) : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={onSelect ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(segment);
              }
            } : undefined}
            role={onSelect ? 'button' : undefined}
            aria-label={onSelect ? `${segment.label}: ${formatValue(segment.value)}. Open filtered report.` : undefined}
          >
            <title>{`${segment.label}: ${formatValue(segment.value)}`}</title>
          </circle>
        ))}
        <text className="donut-center-value" x={center} y={center - 2} textAnchor="middle">
          {centerValue ?? total}
        </text>
        <text className="donut-center-label" x={center} y={center + 16} textAnchor="middle">
          {centerLabel || 'Total'}
        </text>
      </svg>

      <ul className="donut-legend">
        {data.map((item) => (
          <li
            key={item.key}
            className={onSelect ? 'chart-selectable' : undefined}
            onClick={onSelect ? () => onSelect(item) : undefined}
            onKeyDown={onSelect ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item);
              }
            } : undefined}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? 'button' : undefined}
          >
            <span className="legend-dot" style={{ background: item.color }} aria-hidden="true" />
            <span className="legend-label">{item.label}</span>
            <span className="legend-value">
              {formatValue(item.value)}
              <span className="legend-pct">{Math.round((item.value / safeTotal) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bar list used for task status and discipline workload. */
export function BarList({ data = [], ariaLabel, formatValue = (value) => value, onSelect }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bar-list" role="img" aria-label={ariaLabel || 'Bar chart'}>
      {data.map((item) => (
        <div
          className={`bar-row${onSelect ? ' chart-selectable' : ''}`}
          key={item.key}
          title={`${item.label}: ${formatValue(item.value)}`}
          onClick={onSelect ? () => onSelect(item) : undefined}
          onKeyDown={onSelect ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(item);
            }
          } : undefined}
          tabIndex={onSelect ? 0 : undefined}
          role={onSelect ? 'button' : undefined}
        >
          <span className="bar-label">{item.label}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${Math.max((item.value / max) * 100, 3)}%`, background: item.color }}
            />
          </span>
          <span className="bar-value">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Line/area chart comparing planned and actual monthly design progress. */
export function ProgressLineChart({ data = [], ariaLabel }) {
  const width = 560;
  const height = 210;
  const pad = { top: 14, right: 12, bottom: 28, left: 34 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const x = (index) => pad.left + index * step;
  const y = (value) => pad.top + (1 - value / 100) * plotHeight;

  const linePath = (key) =>
    data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(point[key])}`).join(' ');

  const areaPath = `${linePath('actual')} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="line-chart-wrap">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={ariaLabel || 'Monthly progress chart'}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="chart-grid-line"
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="chart-axis-label" x={pad.left - 8} y={y(tick) + 3} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        <path className="chart-area" d={areaPath} />
        <path className="chart-line chart-line-planned" d={linePath('planned')} />
        <path className="chart-line chart-line-actual" d={linePath('actual')} />

        {data.map((point, index) => (
          <g key={point.month}>
            <circle className="chart-dot" cx={x(index)} cy={y(point.actual)} r={3.5} />
            <text className="chart-axis-label" x={x(index)} y={height - 8} textAnchor="middle">
              {point.month}
            </text>
          </g>
        ))}
      </svg>

      <ul className="chart-legend">
        <li>
          <span className="legend-dot" style={{ background: '#0B7A68' }} aria-hidden="true" />
          Actual progress
        </li>
        <li>
          <span className="legend-dot legend-dot-planned" aria-hidden="true" />
          Planned progress
        </li>
      </ul>
    </div>
  );
}
