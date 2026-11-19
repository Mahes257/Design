/**
 * Tabs + SegmentedTabs — the reference ERP's two tab treatments.
 *
 *   <Tabs>          underline tabs with optional count chips
 *   <SegmentedTabs> rounded pill group on a slate track
 */
export default function Tabs({ items = [], activeKey, onChange, ariaLabel = 'Tabs' }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={activeKey === item.key}
          className={`tab${activeKey === item.key ? ' active' : ''}`}
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
          {item.count != null && <span className="tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SegmentedTabs({ items = [], activeKey, onChange, ariaLabel = 'Status' }) {
  return (
    <div className="segmented-control" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={activeKey === item.key}
          className={`segmented-option${activeKey === item.key ? ' active' : ''}`}
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
          {item.count != null && <span className="tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
