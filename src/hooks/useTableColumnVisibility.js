import { useCallback, useMemo, useState } from 'react';
import {
  clearHiddenColumns,
  readHiddenColumns,
  writeHiddenColumns,
} from '../utils/tableColumnPreferences';

/**
 * useTableColumnVisibility — shared column show/hide state for one table.
 *
 * tableId   stable, unique preference id (never an array index or random id)
 * columns   [{ key, label }] in display order
 * options.mandatory  column keys that must always stay visible
 *
 * Returns `isVisible(key)` for filtering headers/cells plus `managerProps` for
 * the shared <ManageColumns /> control. Hidden keys are stored per table, so
 * every table keeps its own selection across refreshes.
 */
export default function useTableColumnVisibility(tableId, columns = [], options = {}) {
  const { mandatory = [] } = options;
  const [storedHidden, setStoredHidden] = useState(() => readHiddenColumns(tableId));

  // Compare by key signature so inline column arrays stay cheap and safe.
  const columnList = Array.isArray(columns) ? columns : [];
  const signature = columnList.map((column) => column.key).join('|');
  const keys = useMemo(() => (signature ? signature.split('|') : []), [signature]);

  const mandatoryKeys = useMemo(() => new Set(mandatory), [mandatory.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only keys that still exist are honoured; stale or unknown keys never break
  // the table and never hide a column that was added later.
  const hidden = useMemo(
    () => storedHidden.filter((key) => keys.includes(key)),
    [storedHidden, keys],
  );

  const commit = useCallback(
    (nextHidden) => {
      setStoredHidden(nextHidden);
      writeHiddenColumns(tableId, nextHidden);
    },
    [tableId],
  );

  const isVisible = useCallback(
    (key) => mandatoryKeys.has(key) || !hidden.includes(key),
    [hidden, mandatoryKeys],
  );

  const toggle = useCallback(
    (key) => {
      if (mandatoryKeys.has(key)) return;
      const currentlyHidden = hidden.includes(key);
      if (!currentlyHidden) {
        const visibleOthers = keys.filter(
          (entry) => entry !== key && !hidden.includes(entry),
        );
        // Never let a table end up with no columns at all.
        if (visibleOthers.length === 0) return;
      }
      const next = currentlyHidden
        ? hidden.filter((entry) => entry !== key)
        : [...hidden, key];
      commit(next);
    },
    [commit, hidden, keys, mandatoryKeys],
  );

  const showAll = useCallback(() => commit([]), [commit]);
  const reset = useCallback(() => {
    clearHiddenColumns(tableId);
    setStoredHidden([]);
  }, [tableId]);

  const visibleColumns = columnList.filter((column) => isVisible(column.key));

  return {
    isVisible,
    visibleColumns,
    visibleCount: visibleColumns.length,
    hidden,
    toggle,
    showAll,
    reset,
    managerProps: {
      tableId,
      columns: columnList,
      hidden,
      mandatory,
      onToggle: toggle,
      onShowAll: showAll,
      onReset: reset,
      canHideLast: false,
    },
  };
}
