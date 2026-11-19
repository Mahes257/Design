import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpDown, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { ActionMenu } from './Dropdown';
import { RecordPreviewDialog } from './RecordPreview';
import ManageColumns from './ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { resolveTableId } from '../../utils/tableColumnPreferences';

/**
 * DataTable — the shared ERP list table.
 *
 * columns:   [{ key, label, sortable?, align?, width?, render?(row) }]
 * rows:      array of records
 * selectable/selectedIds/onToggleRow/onSelectAll — optional row selection
 * rowActions(row) → [{ key, label, icon?, danger?, divider? }] + onRowAction(key, row)
 * onRowClick(row) — makes the whole row open its detail view
 *
 * Layout: the table lives in a horizontally scrollable `.table-wrap`. The
 * selection column and the first data column are pinned to the left, the
 * Actions column is pinned to the right, so only the middle data columns
 * scroll. Column widths, sorting, selection and actions are unchanged.
 *
 * Manage Columns: every table carries its own "Manage Columns" control. The
 * picker lists the columns the page passes in, applies show/hide to headers
 * and cells immediately, and persists the selection per table (route + label).
 * The Actions column is structural and is never hidden by the picker.
 *
 * Actions menu: every table gets the standard order — View, Preview, Edit,
 * module conversions, divider, Delete. A Preview item is inserted after View
 * automatically. Preview opens the record's dedicated full-page details route
 * when the table declares one (`recordHref`), otherwise it falls back to the
 * row's own open behaviour. The quick-preview dialog remains only for child
 * tables that have no record page of their own. Destructive items are always
 * moved to the end, behind a divider.
 */
export function standardActions(items = []) {
  if (!Array.isArray(items) || items.length === 0) return items;
  if (items.some((item) => item.key === 'preview')) return items;
  const viewIndex = items.findIndex((item) => item.key === 'view');
  const next = [...items];
  next.splice(viewIndex >= 0 ? viewIndex + 1 : 0, 0, {
    key: 'preview',
    label: 'Preview',
    icon: Eye,
  });
  const nonDanger = next.filter((item) => !item.danger);
  const danger = next.filter((item) => item.danger);
  if (danger.length === 0) return next;
  return [...nonDanger, { ...danger[0], divider: true }, ...danger.slice(1)];
}

export default function DataTable({
  columns = [],
  rows = [],
  getRowId = (row) => row.id,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onSelectAll,
  sortKey,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  rowActions,
  onRowAction,
  emptyContent,
  className = '',
  ariaLabel = 'Data table',
  previewTitle,
  previewSubtitle,
  previewFields,
  recordHref,
  tableId,
  mandatoryColumns = [],
  showColumnManager = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [previewRow, setPreviewRow] = useState(null);
  const [xScrolled, setXScrolled] = useState(false);
  const tableKey =
    tableId ||
    resolveTableId(
      location.pathname,
      `${ariaLabel} ${columns.map((column) => column.key).join(' ')}`,
    );
  const columnVisibility = useTableColumnVisibility(tableKey, columns, {
    mandatory: mandatoryColumns,
  });
  const visibleColumns = columnVisibility.isVisible
    ? columns.filter((column) => columnVisibility.isVisible(column.key))
    : columns;
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(getRowId(row)));
  const columnCount = visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const tableClassName = [
    'data-table',
    onRowClick ? 'has-row-click' : '',
    selectable ? 'is-selectable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {showColumnManager && columns.length > 1 && (
        <ManageColumns {...columnVisibility.managerProps} />
      )}
    <div
      className={`table-wrap ${className}${xScrolled ? ' is-x-scrolled' : ''}`.trim()}
      onScroll={(event) => setXScrolled(event.currentTarget.scrollLeft > 0)}
    >
      <table className={tableClassName} aria-label={ariaLabel}>
        <thead>
          <tr>
            {selectable && (
              <th className="col-check" scope="col">
                <span className="table-check-wrap">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => onSelectAll?.(event.target.checked)}
                    aria-label="Select all rows"
                  />
                </span>
              </th>
            )}
            {visibleColumns.map((column, index) => {
              const isSorted = sortKey === column.key;
              const headerClasses = [
                index === 0 ? 'col-pin' : '',
                column.sortable && onSort ? 'is-sortable' : '',
                isSorted ? 'is-sorted' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={headerClasses || undefined}
                  style={{ textAlign: column.align || 'left', width: column.width }}
                  aria-sort={
                    isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
                >
                  <span className="th-inner">
                    {column.label}
                    {column.sortable && onSort && (
                      <>
                        {isSorted && sortDirection === 'asc' && (
                          <ChevronUp className="sort-icon" aria-hidden="true" />
                        )}
                        {isSorted && sortDirection === 'desc' && (
                          <ChevronDown className="sort-icon" aria-hidden="true" />
                        )}
                        {!isSorted && <ArrowUpDown className="sort-icon" aria-hidden="true" />}
                      </>
                    )}
                  </span>
                </th>
              );
            })}
            {rowActions && (
              <th className="col-actions" scope="col">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>{emptyContent || <span className="cell-muted">No records found.</span>}</td>
            </tr>
          ) : (
            rows.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds.includes(rowId);
              const actions = standardActions(
                typeof rowActions === 'function' ? rowActions(row) : rowActions,
              );

              return (
                <tr
                  key={rowId}
                  className={[isSelected ? 'is-selected' : '', onRowClick ? 'is-clickable' : '']
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onClick={
                    onRowClick
                      ? (event) => {
                          // Interactive cells keep their own behaviour.
                          if (event.target.closest('button, a, input, label, [role="menu"]')) return;
                          onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {selectable && (
                    <td className="col-check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleRow?.(rowId)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </td>
                  )}
                  {visibleColumns.map((column, index) => (
                    <td
                      key={column.key}
                      className={index === 0 ? 'col-pin' : undefined}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {column.render ? column.render(row) : (row[column.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="col-actions">
                      <ActionMenu
                        items={actions || []}
                        onSelect={(key) => {
                          if (key === 'preview') {
                            const href = recordHref?.(row);
                            if (href) {
                              navigate(href);
                              return;
                            }
                            if (onRowClick) {
                              onRowClick(row);
                              return;
                            }
                            setPreviewRow(row);
                            return;
                          }
                          onRowAction?.(key, row);
                        }}
                        label={`Actions for ${rowId}`}
                      />
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <RecordPreviewDialog
        record={previewRow}
        onClose={() => setPreviewRow(null)}
        title={previewRow && previewTitle ? previewTitle(previewRow) : undefined}
        subtitle={previewRow && previewSubtitle ? previewSubtitle(previewRow) : undefined}
        fields={previewFields}
        onView={
          onRowClick
            ? () => {
                const row = previewRow;
                setPreviewRow(null);
                if (row) onRowClick(row);
              }
            : undefined
        }
      />
    </div>
    </>
  );
}
