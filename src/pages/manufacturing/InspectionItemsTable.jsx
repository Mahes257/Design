import { useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button, ManageColumns, Modal } from '../../components/common';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { INSPECTION_ITEM_COLUMNS } from './inspectionItems';

/**
 * Unified inspection table used by the inspection requirement create, view and
 * edit pages. S.No is derived from the displayed row order; rows keep their own
 * stable ids, so deleting or reordering never reuses or renumbers an id.
 */
export default function InspectionItemsTable({
  items = [],
  readOnly = false,
  onChange,
  onAdd,
  onRemove,
  onClear,
}) {
  const [clearOpen, setClearOpen] = useState(false);
  const columnsVisibility = useTableColumnVisibility(
    'manufacturing.inspection-items',
    INSPECTION_ITEM_COLUMNS,
  );

  const visibleColumns = columnsVisibility.visibleColumns;

  const totalColumns = visibleColumns.length + (readOnly ? 1 : 2);

  return (
    <div className="insp-items">
      {!readOnly && (
        <div className="insp-items-toolbar">
          <span className="insp-items-count">
            {items.length} {items.length === 1 ? 'row' : 'rows'}
          </span>
          <div className="insp-items-actions">
            <div className="insp-columns">
              <ManageColumns {...columnsVisibility.managerProps} bar={false} />
            </div>
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => onAdd?.()}>
              Add Row
            </Button>
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setClearOpen(true)}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      <div className="insp-table-wrap">
        <table className="insp-table">
          <thead>
            <tr>
              <th scope="col" className="insp-col-sno">
                S.No
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ minWidth: `${column.width}px` }}
                  className={column.key === 'notes' ? 'insp-col-notes' : undefined}
                >
                  {column.label}
                </th>
              ))}
              {!readOnly && (
                <th scope="col" className="insp-col-action">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="insp-empty" colSpan={totalColumns}>
                  No inspection points or critical characteristics recorded yet.
                  {!readOnly && ' Use Add Row to capture them.'}
                </td>
              </tr>
            )}
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className="insp-sno">{index + 1}</td>
                {visibleColumns.map((column) => (
                  <td key={column.key} className={`insp-cell insp-cell-${column.key}`}>
                    {readOnly ? (
                      <span className={item[column.key] ? undefined : 'insp-blank'}>
                        {item[column.key] || '—'}
                      </span>
                    ) : column.type === 'select' ? (
                      <select
                        className="insp-input insp-select"
                        value={item[column.key] ?? ''}
                        aria-label={`${column.label} row ${index + 1}`}
                        onChange={(event) => onChange?.(item.id, column.key, event.target.value)}
                      >
                        <option value="">—</option>
                        {column.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="insp-input"
                        value={item[column.key] ?? ''}
                        placeholder={column.placeholder}
                        aria-label={`${column.label} row ${index + 1}`}
                        onChange={(event) => onChange?.(item.id, column.key, event.target.value)}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="insp-cell insp-cell-action">
                    <button
                      type="button"
                      className="icon-btn insp-delete"
                      aria-label={`Delete row ${index + 1}`}
                      title={`Delete row ${index + 1}`}
                      onClick={() => onRemove?.(item.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <Modal
          open={clearOpen}
          onClose={() => setClearOpen(false)}
          title="Clear inspection rows"
          subtitle="This clears the inspection table for this record only."
          footer={
            <>
              <Button variant="ghost" onClick={() => setClearOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onClear?.();
                  setClearOpen(false);
                }}
              >
                Clear All Rows
              </Button>
            </>
          }
        >
          <p className="dash-modal-note">
            All {items.length} inspection row{items.length === 1 ? '' : 's'} will be removed from
            the table. Nothing is saved until you save the record.
          </p>
        </Modal>
      )}
    </div>
  );
}
