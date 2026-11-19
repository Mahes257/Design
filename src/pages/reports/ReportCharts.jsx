import { formatDate } from '../../data/reportsData';

function valueLabel(value, formatter) {
  return formatter ? formatter(value) : String(value);
}

/** Category-wise horizontal bars with a shared scale and part-value tooltips. */
export function StackedBarChart({
  data = [],
  series = [],
  formatValue = (value) => value,
  ariaLabel,
}) {
  const max = Math.max(
    ...data.map((row) => row.values.reduce((sum, value) => sum + (Number(value) || 0), 0)),
    1,
  );

  return (
    <div className="report-stacked" role="img" aria-label={ariaLabel || 'Stacked bar chart'}>
      <div className="report-stacked-legend">
        {series.map((item) => (
          <span key={item.key || item.label}>
            <i style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      <div className="report-stacked-rows">
        {data.map((row) => {
          const total = row.values.reduce((sum, value) => sum + (Number(value) || 0), 0);
          return (
            <div className="report-stacked-row" key={row.key}>
              <div className="report-stacked-label">
                <strong title={row.label}>{row.label}</strong>
                {row.meta && <small>{row.meta}</small>}
              </div>
              <div
                className="report-stacked-track"
                title={`${row.label}: ${valueLabel(total, formatValue)}`}
              >
                {row.values.map((value, index) => {
                  const numeric = Number(value) || 0;
                  if (!numeric) return null;
                  const item = series[index] || { label: `Series ${index + 1}`, color: '#94A3B8' };
                  return (
                    <span
                      className="report-stacked-segment"
                      key={item.key || item.label}
                      style={{
                        width: `${(numeric / max) * 100}%`,
                        background: item.color,
                      }}
                      title={`${row.label} · ${item.label}: ${valueLabel(numeric, formatValue)}`}
                    />
                  );
                })}
              </div>
              <span className="report-stacked-value">{valueLabel(total, formatValue)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function layoutTreemap(items, x, y, width, height, output = []) {
  if (!items.length) return output;
  if (items.length === 1) {
    output.push({ ...items[0], x, y, width, height });
    return output;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return output;

  let running = 0;
  let splitIndex = 1;
  let bestDistance = Infinity;
  for (let index = 1; index < items.length; index += 1) {
    running += items[index - 1].value;
    const distance = Math.abs(running - total / 2);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index;
    }
  }

  const first = items.slice(0, splitIndex);
  const second = items.slice(splitIndex);
  const firstValue = first.reduce((sum, item) => sum + item.value, 0);
  const ratio = Math.min(Math.max(firstValue / total, 0.06), 0.94);

  if (width >= height) {
    layoutTreemap(first, x, y, width * ratio, height, output);
    layoutTreemap(second, x + width * ratio, y, width * (1 - ratio), height, output);
  } else {
    layoutTreemap(first, x, y, width, height * ratio, output);
    layoutTreemap(second, x, y + height * ratio, width, height * (1 - ratio), output);
  }
  return output;
}

/** Proportionally sized tiles for part-to-whole value distribution. */
export function TreemapChart({ data = [], formatValue = (value) => value, ariaLabel }) {
  const sorted = [...data].filter((item) => item.value > 0).sort((left, right) => right.value - left.value);
  const width = 600;
  const height = 286;
  const tiles = layoutTreemap(sorted, 0, 0, width, height);
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="report-treemap" role="img" aria-label={ariaLabel || 'Treemap chart'}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" aria-hidden="true">
        {tiles.map((tile) => {
          const x = tile.x + 3;
          const y = tile.y + 3;
          const tileWidth = Math.max(tile.width - 6, 1);
          const tileHeight = Math.max(tile.height - 6, 1);
          const share = total ? (tile.value / total) * 100 : 0;
          return (
            <g key={tile.key} className="report-treemap-tile">
              <rect
                x={x}
                y={y}
                width={tileWidth}
                height={tileHeight}
                rx="7"
                fill={tile.color}
              >
                <title>{`${tile.label}: ${formatValue(tile.value)} (${Math.round(share)}%)`}</title>
              </rect>
              {tileWidth > 74 && tileHeight > 38 && (
                <>
                  <text
                    x={x + 11}
                    y={y + 20}
                    className="report-treemap-label"
                  >
                    {tile.label.length > 24 ? `${tile.label.slice(0, 22)}…` : tile.label}
                  </text>
                  <text
                    x={x + 11}
                    y={y + 36}
                    className="report-treemap-value"
                  >
                    {formatValue(tile.value)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="report-treemap-legend">
        {sorted.slice(0, 5).map((item) => (
          <span key={item.key} title={`${item.label}: ${formatValue(item.value)}`}>
            <i style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Stage-progression funnel with counts and share of the entered population. */
export function FunnelChart({ data = [], formatValue = (value) => value, ariaLabel }) {
  const width = 600;
  const rowHeight = 58;
  const height = Math.max(218, data.length * rowHeight);
  const max = Math.max(...data.map((step) => step.value), 1);
  const startValue = data[0]?.value || 1;
  const center = 142;
  const maxWidth = 230;

  return (
    <div className="report-funnel" role="img" aria-label={ariaLabel || 'Funnel chart'}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" aria-hidden="true">
        {data.map((step, index) => {
          const topWidth = maxWidth * (step.value / max);
          const nextValue = data[index + 1]?.value ?? step.value;
          const bottomWidth = maxWidth * (nextValue / max);
          const top = index * rowHeight + 8;
          const bottom = top + rowHeight - 16;
          const points = [
            `${center - topWidth / 2},${top}`,
            `${center + topWidth / 2},${top}`,
            `${center + bottomWidth / 2},${bottom}`,
            `${center - bottomWidth / 2},${bottom}`,
          ].join(' ');
          const share = startValue ? Math.round((step.value / startValue) * 100) : 0;
          return (
            <g key={step.key || step.label}>
              <polygon points={points} fill={step.color} opacity={1 - index * 0.08}>
                <title>{`${step.label}: ${formatValue(step.value)} (${share}%)`}</title>
              </polygon>
              <text x={300} y={top + 17} className="report-funnel-label">
                {step.label}
              </text>
              <text x={300} y={top + 34} className="report-funnel-sub">
                {share}% of submitted reviews
              </text>
              <text
                x={width - 8}
                y={top + 23}
                textAnchor="end"
                className="report-funnel-value"
              >
                {formatValue(step.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Engineer × project workload matrix using a single-hue intensity scale. */
export function HeatmapChart({ data, formatValue = (value) => value, ariaLabel }) {
  if (!data?.rows?.length || !data?.columns?.length) return null;
  const { rows, columns, cells, max } = data;
  const cellValue = (row, column) =>
    cells.find((cell) => cell.row === row && cell.column === column)?.value || 0;

  return (
    <div className="report-heatmap" role="img" aria-label={ariaLabel || 'Workload heatmap'}>
      <div className="report-heatmap-scroll">
        <div
          className="report-heatmap-grid"
          style={{ gridTemplateColumns: `150px repeat(${columns.length}, minmax(58px, 1fr))` }}
        >
          <span className="report-heatmap-corner" aria-hidden="true" />
          {columns.map((column) => (
            <span className="report-heatmap-column" key={column.key} title={column.label}>
              {column.label}
            </span>
          ))}
          {rows.map((row) => (
            <div className="report-heatmap-row" key={row.key} style={{ display: 'contents' }}>
              <span className="report-heatmap-row-label" title={row.label}>
                {row.label}
              </span>
              {columns.map((column) => {
                const value = cellValue(row.key, column.key);
                const intensity = value ? 0.18 + (value / max) * 0.68 : 0;
                return (
                  <span
                    className={`report-heatmap-cell${value ? '' : ' is-zero'}`}
                    key={`${row.key}-${column.key}`}
                    style={{
                      background: value ? `rgba(11, 122, 104, ${intensity.toFixed(2)})` : undefined,
                      color: intensity > 0.48 ? '#ffffff' : undefined,
                    }}
                    title={`${row.label} × ${column.label}: ${formatValue(value)} task${value === 1 ? '' : 's'}`}
                  >
                    {formatValue(value)}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="report-heatmap-legend">
        <span>Lower workload</span>
        <i className="report-heatmap-scale" aria-hidden="true" />
        <span>Higher workload</span>
        <em>Maximum {formatValue(max)} tasks</em>
      </div>
    </div>
  );
}

/** Compact progress rows for percentage completion measures. */
export function ProgressBars({ data = [], formatValue = (value) => `${value}%`, ariaLabel }) {
  return (
    <div className="report-progress" role="img" aria-label={ariaLabel || 'Completion progress'}>
      {data.map((item) => {
        const value = Math.max(0, Math.min(100, Number(item.value) || 0));
        return (
          <div className="report-progress-item" key={item.key}>
            <div className="report-progress-head">
              <span title={item.label}>{item.label}</span>
              <strong>{formatValue(value)}</strong>
            </div>
            <div
              className="report-progress-track"
              role="progressbar"
              aria-label={item.label}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(value)}
              title={`${item.label}: ${formatValue(value)}`}
            >
              <i style={{ width: `${value}%`, background: item.color }} />
            </div>
            {item.meta && <small>{item.meta}</small>}
          </div>
        );
      })}
    </div>
  );
}

/** Line chart for planned versus actual cumulative percentages with point tooltips. */
export function ProgressTrendChart({ data = [], ariaLabel }) {
  const width = 600;
  const height = 224;
  const pad = { top: 16, right: 18, bottom: 32, left: 38 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const pointGap = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const x = (index) => pad.left + (data.length > 1 ? index * pointGap : plotWidth / 2);
  const y = (value) => pad.top + (1 - value / 100) * plotHeight;
  const path = (key) =>
    data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(point[key])}`).join(' ');
  const area = data.length
    ? `${path('actual')} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`
    : '';

  return (
    <div className="report-line" role="img" aria-label={ariaLabel || 'Progress trend chart'}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" aria-hidden="true">
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              className="chart-grid-line"
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="chart-axis-label"
              x={pad.left - 8}
              y={y(tick) + 3}
              textAnchor="end"
            >
              {tick}%
            </text>
          </g>
        ))}
        {area && <path d={area} fill="#0B7A68" opacity="0.08" />}
        <path
          d={path('planned')}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.8"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
        <path
          d={path('actual')}
          fill="none"
          stroke="#0B7A68"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((point, index) => (
          <g key={point.key || point.month}>
            <circle
              cx={x(index)}
              cy={y(point.planned)}
              r="3"
              fill="#ffffff"
              stroke="#94A3B8"
              strokeWidth="1.6"
            >
              <title>{`${point.month} · Planned: ${point.planned}%`}</title>
            </circle>
            <circle
              cx={x(index)}
              cy={y(point.actual)}
              r="3.8"
              fill="#ffffff"
              stroke="#0B7A68"
              strokeWidth="2.2"
            >
              <title>{`${point.month} · Actual: ${point.actual}%`}</title>
            </circle>
            <text
              className="chart-axis-label"
              x={x(index)}
              y={height - 9}
              textAnchor="middle"
            >
              {point.month}
            </text>
          </g>
        ))}
      </svg>
      <div className="report-line-legend">
        <span><i style={{ background: '#0B7A68' }} aria-hidden="true" /> Actual completion</span>
        <span><i className="is-planned" aria-hidden="true" /> Planned due curve</span>
      </div>
    </div>
  );
}

function dayValue(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

/** Date-range timeline for recorded change request activity. */
export function FlowTimeline({ data = [], bounds, legend = [], ariaLabel }) {
  if (!data.length || !bounds) return null;
  const start = dayValue(bounds.start);
  const end = dayValue(bounds.end);
  const span = Math.max(end - start, 24 * 60 * 60 * 1000);

  return (
    <div className="report-flow" role="img" aria-label={ariaLabel || 'Activity timeline'}>
      <div className="report-flow-axis">
        <span>{formatDate(bounds.start)}</span>
        <span>{formatDate(bounds.end)}</span>
      </div>
      {data.map((item) => {
        const itemStart = dayValue(item.start);
        const itemEnd = Math.max(dayValue(item.end), itemStart + 24 * 60 * 60 * 1000);
        const left = Math.min(Math.max(((itemStart - start) / span) * 100, 0), 99);
        const width = Math.max(Math.min(((itemEnd - itemStart) / span) * 100, 100 - left), 1.6);
        return (
          <div className="report-flow-row" key={item.key}>
            <span className="report-flow-label" title={`${item.reference} · ${item.label}`}>
              <strong>{item.reference}</strong>
              <small>{item.label}</small>
            </span>
            <span
              className="report-flow-track"
              title={`${item.reference} · ${item.label}\n${formatDate(item.start)} → ${formatDate(item.end)}\n${item.status}`}
            >
              <i
                className="report-flow-range"
                style={{ left: `${left}%`, width: `${width}%`, background: item.color }}
              />
            </span>
            <span className="report-flow-meta">
              {formatDate(item.start)} → {formatDate(item.end)}
              <small>{item.status}</small>
            </span>
          </div>
        );
      })}
      {legend.length > 0 && (
        <div className="report-flow-legend">
          {legend.map((item) => (
            <span key={item.label}>
              <i style={{ background: item.color }} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
