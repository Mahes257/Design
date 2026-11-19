import { useRef, useState } from 'react';
import { Columns3 } from 'lucide-react';
import Button from './Button';
import useClickOutside from '../../hooks/useClickOutside';
import './manage-columns.css';

/**
 * ManageColumns — the CRM-style column picker shared by every ERP table.
 *
 * Pass the object returned by useTableColumnVisibility as `managerProps`:
 *   <ManageColumns {...visibility.managerProps} />
 *
 * Every column is listed in its original order with a checkbox. Checked means
 * visible, and changes are applied immediately (the table filters headers and
 * cells from the same state). Closes on outside click or Escape.
 */
export default function ManageColumns({
  tableId,
  columns = [],
  hidden = [],
  mandatory = [],
  onToggle,
  onShowAll,
  onReset,
  bar = true,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  useClickOutside(anchorRef, () => setOpen(false), open);

  if (!Array.isArray(columns) || columns.length < 2) return null;

  const mandatorySet = new Set(mandatory);
  const hiddenSet = new Set(hidden);
  const visibleCount = columns.filter(
    (column) => mandatorySet.has(column.key) || !hiddenSet.has(column.key),
  ).length;
  const allVisible = columns.every(
    (column) => mandatorySet.has(column.key) || !hiddenSet.has(column.key),
  );

  const control = (
    <div className="mc-anchor" ref={anchorRef}>
      <Button
        variant="secondary"
        size="sm"
        icon={Columns3}
        className="mc-trigger"
        data-manage-columns-button=""
        data-table-id={tableId}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Manage Columns
      </Button>
      {open && (
        <div className="mc-panel" role="dialog" aria-label="Manage columns">
          <div className="mc-panel-head">
            <span className="mc-panel-title">Columns</span>
            <span className="mc-panel-count">
              {visibleCount}/{columns.length} shown
            </span>
          </div>
          <div className="mc-panel-list">
            {columns.map((column) => {
              const isMandatory = mandatorySet.has(column.key);
              const checked = isMandatory || !hiddenSet.has(column.key);
              return (
                <label
                  key={column.key}
                  className={`mc-option${isMandatory ? ' is-mandatory' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isMandatory}
                    onChange={() => onToggle?.(column.key)}
                  />
                  <span className="mc-option-label" title={column.label}>
                    {column.label}
                  </span>
                  {isMandatory && <em className="mc-lock">Fixed</em>}
                </label>
              );
            })}
          </div>
          <div className="mc-panel-foot">
            <button
              type="button"
              className="mc-link"
              disabled={allVisible}
              onClick={() => onShowAll?.()}
            >
              Select all
            </button>
            <button type="button" className="mc-link" onClick={() => onReset?.()}>
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!bar) return control;

  return <div className={`mc-bar ${className}`.trim()}>{control}</div>;
}
