/**
 * Table column preferences — namespaced localStorage persistence.
 *
 * One entry per table, keyed by a stable table id (route + table name), holding
 * only the list of hidden column keys. Storing hidden keys (rather than visible
 * ones) means a column added later is visible by default, and a column removed
 * from the definition is simply ignored when the table renders.
 */

const STORAGE_PREFIX = 'design-erp.table-columns.v1.';

function safeStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function tableColumnsStorageKey(tableId) {
  return `${STORAGE_PREFIX}${tableId}`;
}

/** Reads the stored hidden-column keys for a table; never throws. */
export function readHiddenColumns(tableId) {
  if (!tableId) return [];
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(tableColumnsStorageKey(tableId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed?.hidden;
    if (!Array.isArray(list)) return [];
    return list.filter((key) => typeof key === 'string' && key.length > 0);
  } catch {
    return [];
  }
}

/** Persists the hidden-column keys for a table; storage failures are ignored. */
export function writeHiddenColumns(tableId, hiddenKeys) {
  if (!tableId) return;
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(tableColumnsStorageKey(tableId), JSON.stringify([...hiddenKeys]));
  } catch {
    /* quota or privacy mode — visibility still works for this session */
  }
}

/** Removes a table's saved preferences so it falls back to full visibility. */
export function clearHiddenColumns(tableId) {
  if (!tableId) return;
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(tableColumnsStorageKey(tableId));
  } catch {
    /* ignore */
  }
}

/**
 * Builds the stable preference id for a table.
 * `scope` is usually the current route; `name` is the table's own label.
 */
export function resolveTableId(scope, name) {
  // Collapse record ids in the route (/bom-cost/bom/BOM-2026-001 → /bom-cost/bom/:id)
  // so a table keeps one set of preferences across records.
  const safeScope =
    String(scope || 'app')
      .replace(/\/+$/, '')
      .split('/')
      .map((segment) => (/\d/.test(segment) ? ':id' : segment))
      .join('/') || 'app';
  const safeName = String(name || 'table')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safeScope}::${safeName || 'table'}`;
}
