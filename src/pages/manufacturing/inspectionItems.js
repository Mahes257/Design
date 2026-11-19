/**
 * Unified inspection row model shared by the inspection requirement creation,
 * detail and edit pages.
 *
 * Modern records store `record.inspectionItems` (one editable row per inspection
 * point). Older records keep `points`, `characteristics`, `measurement` and
 * `acceptance`; `itemsFromRecord()` maps them into the same table without
 * touching the stored legacy fields, so nothing saved by an older version is lost.
 */

export const INSPECTION_ITEM_COLUMNS = [
  {
    key: 'feature',
    label: 'Inspection Point / Feature',
    placeholder: 'Feature or location',
    width: 190,
  },
  { key: 'method', label: 'Measurement Method', placeholder: 'e.g. Bore gauge', width: 150 },
  {
    key: 'equipment',
    label: 'Measuring Equipment',
    placeholder: 'e.g. Micrometer 75–100 mm',
    width: 170,
  },
  { key: 'unit', label: 'Measurement Unit', placeholder: 'mm', width: 110 },
  { key: 'frequency', label: 'Frequency', placeholder: 'e.g. 100%', width: 130 },
  {
    key: 'characteristic',
    label: 'Characteristic Name',
    placeholder: 'e.g. Main bore diameter',
    width: 170,
  },
  {
    key: 'criticality',
    label: 'Criticality',
    placeholder: 'Critical',
    width: 110,
    type: 'select',
    options: ['Critical', 'Major', 'Minor'],
  },
  {
    key: 'dimension',
    label: 'Applicable Dimension',
    placeholder: 'e.g. Ø180 H7',
    width: 150,
  },
  {
    key: 'toleranceRef',
    label: 'Tolerance Reference',
    placeholder: 'e.g. Drawing sheet 3 / ISO 286-2',
    width: 180,
  },
  {
    key: 'notes',
    label: 'Instructions / Notes',
    placeholder: 'Inspection instructions',
    width: 200,
  },
];

export const INSPECTION_ITEM_FIELDS = INSPECTION_ITEM_COLUMNS.map((column) => column.key);

let itemCounter = 0;

/** Stable internal row id — kept separately from the displayed S.No. */
export function newInspectionItemId() {
  itemCounter += 1;
  return `IIT-${Date.now().toString(36)}-${itemCounter.toString(36)}`;
}

export function blankInspectionItem(seed = {}) {
  return {
    id: seed.id || newInspectionItemId(),
    feature: '',
    method: '',
    equipment: '',
    unit: 'mm',
    frequency: '',
    characteristic: '',
    criticality: 'Critical',
    dimension: '',
    toleranceRef: '',
    notes: '',
    ...seed,
  };
}

function normalizeItem(item) {
  return blankInspectionItem({
    ...item,
    criticality: item?.criticality || 'Critical',
  });
}

/** Normalize rows loaded from storage so every row has an id and all columns. */
export function normalizeInspectionItems(items) {
  return (Array.isArray(items) ? items : []).map(normalizeItem);
}

/**
 * Map one record into unified rows.
 * - `inspectionItems` (new structure) always wins, so reopening a saved record
 *   never duplicates rows or merges stale legacy arrays again.
 * - Otherwise the legacy `points` / `characteristics` / `measurement` groups are
 *   zipped row by row, with record-level values applied to the first row only
 *   where that row is still blank.
 * - Legacy acceptance data is intentionally not mapped: it is retained in the
 *   stored record but no longer shown in the UI.
 */
export function itemsFromRecord(record) {
  if (!record) return [];
  if (Array.isArray(record.inspectionItems)) {
    return normalizeInspectionItems(record.inspectionItems);
  }

  const points = Array.isArray(record.points) ? record.points : [];
  const characteristics = Array.isArray(record.characteristics) ? record.characteristics : [];
  const measurement = record.measurement || {};
  const rowCount = Math.max(points.length, characteristics.length);
  const rows = [];

  for (let index = 0; index < rowCount; index += 1) {
    const point = points[index] || {};
    const characteristic = characteristics[index] || {};
    rows.push(
      normalizeItem({
        feature: point.feature || '',
        method: point.method || '',
        unit: point.unit || '',
        frequency: point.frequency || '',
        characteristic: characteristic.name || '',
        criticality: characteristic.criticality || '',
        dimension: characteristic.dimension || '',
        toleranceRef: characteristic.toleranceRef || '',
      }),
    );
  }

  const recordLevel = {
    feature: record.characteristic || '',
    method: record.inspectionMethod || measurement.method || '',
    equipment: record.instrument || measurement.equipment || '',
    unit: record.unit || measurement.unit || '',
    frequency: record.frequency || '',
    dimension: record.dimension || '',
    toleranceRef: record.tolerance || '',
    notes: measurement.instructions || '',
  };
  const hasRecordLevel = Object.values(recordLevel).some((value) => Boolean(value));

  if (rows.length === 0) {
    if (!hasRecordLevel) return [];
    return [normalizeItem(recordLevel)];
  }

  const first = rows[0];
  const merged = { ...first };
  Object.entries(recordLevel).forEach(([key, value]) => {
    if (!merged[key] && value) merged[key] = value;
  });
  rows[0] = merged;
  return rows;
}
