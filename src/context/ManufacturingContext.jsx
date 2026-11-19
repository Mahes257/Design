import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INSPECTION_REQUIREMENTS,
  MANUFACTURING_DEFINITIONS,
  PROCESS_PLANS,
  TODAY,
  nextMfgId,
  nextRevision,
  packageReadiness,
  partForNumber,
} from '../data/manufacturingData';
import { ANALYSES } from '../data/analysisData';

/**
 * Manufacturing Design state (Module 08).
 *
 * One store for the three registers so the definition, inspection and process
 * records agree on references and statuses. Mirrored into localStorage
 * (`md-manufacturing-state-v1`). Frontend only: no API, database or production
 * execution, and no inspection results are recorded here.
 */
const ManufacturingContext = createContext(null);

const STORAGE_KEY = 'md-manufacturing-state-v1';

const STATE_KEY = {
  definition: 'definitions',
  inspection: 'inspections',
  process: 'processPlans',
};

function verifiedAnalysisFor(record) {
  return ANALYSES.find(
    (analysis) =>
      analysis.verificationStatus === 'Verified' &&
      analysis.projectId === record.projectId &&
      (analysis.linkedId === record.partId ||
        (record.assemblyId && analysis.linkedId === record.assemblyId)),
  );
}

/** Statuses used before the Module 08 preparation workflow was aligned. */
const LEGACY_STATUS_MAP = {
  'In Progress': 'In Preparation',
  'Pending Review': 'Under Review',
  'Changes Requested': 'Revision Required',
};

function migrateStatus(status) {
  return LEGACY_STATUS_MAP[status] || status;
}

/** Keep one malformed persisted record from discarding the whole register. */
function mapSafe(list, normalize) {
  return (Array.isArray(list) ? list : []).map((record) => {
    try {
      return normalize(record);
    } catch {
      return record;
    }
  });
}

/**
 * Older inspection descriptions were generated with a sentence that referenced
 * the removed acceptance section. Reword only that generated sentence; text a
 * user typed is left exactly as saved.
 */
function rewriteLegacyAcceptanceMention(text) {
  return String(text || '')
    .replace(
      /^(.*plan for .*), covering inspection points, critical characteristics and acceptance criteria\.$/,
      '$1, covering inspection points, critical characteristics and measurement requirements.',
    )
    .replace(
      /^(.*plan for .*), covering inspection points, critical characteristics, measurement requirements and acceptance criteria\.$/,
      '$1, covering inspection points, critical characteristics and measurement requirements.',
    );
}

/** Add references introduced after records were first persisted. */
function normalizeState(value) {
  const definitions = mapSafe(value.definitions, (record) => ({
    ...record,
    status: migrateStatus(record.status),
    designId: record.designId || '',
    material: record.material || partForNumber(record.partNumber)?.material || '',
    analysisId: record.analysisId ?? verifiedAnalysisFor(record)?.id ?? '',
    manufacturingMethod: record.manufacturingMethod || '',
    manufacturingNotes: record.manufacturingNotes || record.description || '',
    criticalFeatures: record.criticalFeatures || '',
    requiredCapabilities: record.requiredCapabilities || '',
    specialProcesses: record.specialProcesses || '',
    equipmentToolingRefs: record.equipmentToolingRefs || '',
    linkedBomId: record.linkedBomId || '',
    linkedDrawingId: record.linkedDrawingId || '',
    statusHistory: (record.statusHistory || []).map((entry) => ({
      ...entry,
      status: migrateStatus(entry.status),
    })),
  }));
  const inspections = mapSafe(value.inspections, (record) => {
    const firstPoint = (record.points || [])[0] || {};
    const firstCharacteristic = (record.characteristics || [])[0] || {};
    return {
      ...record,
      description: rewriteLegacyAcceptanceMention(record.description),
      inspectionItems: Array.isArray(record.inspectionItems)
        ? record.inspectionItems.map((item, index) => ({
            ...item,
            id: item.id || `IIT-${record.id}-${index + 1}`,
            feature: item.feature || '',
            method: item.method || '',
            equipment: item.equipment || '',
            unit: item.unit || '',
            frequency: item.frequency || '',
            characteristic: item.characteristic || '',
            criticality: item.criticality || '',
            dimension: item.dimension || '',
            toleranceRef: item.toleranceRef || '',
            notes: item.notes || '',
          }))
        : undefined,
      status: migrateStatus(record.status),
      designId: record.designId || '',
      material: record.material || partForNumber(record.partNumber)?.material || '',
      characteristic:
        record.characteristic || firstPoint.feature || firstCharacteristic.name || '',
      dimension: record.dimension || firstCharacteristic.dimension || '',
      tolerance: record.tolerance || firstCharacteristic.toleranceRef || '',
      unit: record.unit || firstPoint.unit || record.measurement?.unit || 'mm',
      inspectionMethod: record.inspectionMethod || firstPoint.method || record.measurement?.method || '',
      instrument:
        record.instrument || record.measurement?.equipment || '',
      frequency: record.frequency || firstPoint.frequency || '',
      acceptanceCriteria:
        record.acceptanceCriteria || record.acceptance?.description || '',
      criticalToQuality:
        record.criticalToQuality ||
        (firstCharacteristic.criticality === 'Critical' ? 'Yes' : 'No'),
      evidenceRef: record.evidenceRef || record.drawingNo || '',
      requirementNotes: rewriteLegacyAcceptanceMention(
        record.requirementNotes || record.description || '',
      ),
      statusHistory: (record.statusHistory || []).map((entry) => ({
        ...entry,
        status: migrateStatus(entry.status),
      })),
    };
  });
  const processPlans = mapSafe(value.processPlans, (record) => {
    const definition = definitions.find(
      (row) => row.projectId === record.projectId && row.partId === record.partId,
    );
    return {
      ...record,
      status: migrateStatus(record.status),
      designId: record.designId || '',
      material: record.material || partForNumber(record.partNumber)?.material || '',
      linkedDefinitionId: record.linkedDefinitionId ?? definition?.id ?? '',
      linkedBomId: record.linkedBomId || '',
      linkedDrawingId: record.linkedDrawingId || '',
      operationNotes: record.operationNotes || '',
      sequence: (record.sequence || []).map((operation, index) => ({
        ...operation,
        sequence: operation.sequence || String(index + 1),
        tooling: operation.tooling || '',
        setup: operation.setup || '',
        parameters: operation.parameters || '',
        safetyQuality: operation.safetyQuality || '',
        inspectionCheckpoint: operation.inspectionCheckpoint || '',
      })),
      statusHistory: (record.statusHistory || []).map((entry) => ({
        ...entry,
        status: migrateStatus(entry.status),
      })),
    };
  });
  return { definitions, inspections, processPlans };
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.definitions) || parsed.definitions.length === 0) return null;
    return normalizeState({
      definitions: parsed.definitions,
      inspections: Array.isArray(parsed.inspections) ? parsed.inspections : INSPECTION_REQUIREMENTS,
      processPlans: Array.isArray(parsed.processPlans) ? parsed.processPlans : PROCESS_PLANS,
    });
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

function stamp() {
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;
}

function pushStatus(record, status, by, note) {
  return [
    ...(record.statusHistory || []),
    {
      id: `SH-${record.id}-${(record.statusHistory?.length || 0) + 1}`,
      status,
      at: TODAY,
      by,
      note,
    },
  ];
}

export function ManufacturingProvider({ children }) {
  const [state, setState] = useState(
    () =>
      persistedState ||
      normalizeState({
        definitions: MANUFACTURING_DEFINITIONS,
        inspections: INSPECTION_REQUIREMENTS,
        processPlans: PROCESS_PLANS,
      }),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable — the session still works in memory.
    }
  }, [state]);

  const value = useMemo(() => {
    const recordsFor = (kind) => state[STATE_KEY[kind]] || [];

    const patchRecord = (kind, id, patch) =>
      setState((previous) => ({
        ...previous,
        [STATE_KEY[kind]]: previous[STATE_KEY[kind]].map((record) =>
          record.id === id
            ? { ...record, ...patch, updatedBy: patch.updatedBy || record.updatedBy, updatedAt: TODAY }
            : record,
        ),
      }));

    return {
      definitions: state.definitions,
      inspections: state.inspections,
      processPlans: state.processPlans,
      recordsFor,
      nextId: (kind) => nextMfgId(kind, recordsFor(kind)),

      addRecord: (kind, record) =>
        setState((previous) => ({
          ...previous,
          [STATE_KEY[kind]]: [{ ...record, createdAt: TODAY, createdBy: record.engineer }, ...previous[STATE_KEY[kind]]],
        })),

      updateRecord: patchRecord,

      removeRecord: (kind, id) =>
        setState((previous) => ({
          ...previous,
          [STATE_KEY[kind]]: previous[STATE_KEY[kind]].filter((record) => record.id !== id),
        })),

      submitRecord: (kind, id, by) => {
        const record = recordsFor(kind).find((row) => row.id === id);
        if (!record) return { error: 'Record not found.' };
        if (!['Draft', 'In Preparation', 'Revision Required', 'Rejected'].includes(record.status)) {
          return { error: 'Only a draft, in-progress, changes-requested or rejected record can be submitted.' };
        }
        patchRecord(kind, id, {
          status: 'Under Review',
          statusHistory: pushStatus(record, 'Under Review', by, 'Submitted for review.'),
          reviews: [
            ...(record.reviews || []),
            {
              id: `RV-${record.revision}-${(record.reviews?.length || 0) + 1}`,
              revision: record.revision,
              reviewer: record.reviewer,
              date: TODAY,
              decision: 'Pending decision',
              comments: 'Submitted for manufacturing review.',
            },
          ],
          updatedBy: by,
        });
        return {};
      },

      approveRecord: (kind, id, by) => {
        const record = recordsFor(kind).find((row) => row.id === id);
        if (!record || record.status !== 'Under Review') {
          return { error: 'Only a record under review can be approved.' };
        }
        patchRecord(kind, id, {
          status: 'Approved',
          statusHistory: pushStatus(record, 'Approved', by, 'Approved for manufacturing release.'),
          reviews: [
            ...(record.reviews || []).filter((entry) => entry.decision !== 'Pending decision'),
            {
              id: `RV-${record.revision}-APR`,
              revision: record.revision,
              reviewer: by,
              date: TODAY,
              decision: 'Approved',
              comments: 'Approved against drawing, references and shop capability.',
            },
          ],
          updatedBy: by,
        });
        return {};
      },

      requestRevisionRecord: (kind, id, by, comments = '') => {
        const record = recordsFor(kind).find((row) => row.id === id);
        if (!record || record.status !== 'Under Review') {
          return { error: 'Only a record under review can be returned for revision.' };
        }
        if (!String(comments || '').trim()) {
          return { error: 'Record the revision required before returning the document.' };
        }
        patchRecord(kind, id, {
          status: 'Revision Required',
          statusHistory: pushStatus(record, 'Revision Required', by, comments.trim()),
          reviews: [
            ...(record.reviews || []).filter((entry) => entry.decision !== 'Pending decision'),
            {
              id: `RV-${record.revision}-REV`,
              revision: record.revision,
              reviewer: by,
              date: TODAY,
              decision: 'Revision Required',
              comments: comments.trim(),
            },
          ],
          updatedBy: by,
        });
        return {};
      },

      releaseRecord: (kind, id, by) => {
        const record = recordsFor(kind).find((row) => row.id === id);
        if (!record || record.status !== 'Approved') {
          return { error: 'Only an approved record can be released.' };
        }
        if (kind === 'process') {
          const readiness = packageReadiness(record, state.definitions, state.inspections);
          if (!readiness.ready) {
            return {
              error: `Manufacturing package is not release-ready: ${readiness.issues.join(' ')}`,
            };
          }
        }
        patchRecord(kind, id, {
          status: 'Released',
          release: {
            ...(record.release || {}),
            releaseStatus: 'Released',
            releaseDate: TODAY,
          },
          statusHistory: pushStatus(record, 'Released', by, 'Released to production.'),
          updatedBy: by,
        });
        return {};
      },

      /** Controlled change: locked records are superseded by a new draft revision. */
      createRevision: (kind, id, by) => {
        const record = recordsFor(kind).find((row) => row.id === id);
        if (!record || !['Approved', 'Released', 'Superseded'].includes(record.status)) {
          return { error: 'A revision can only be raised from an approved or released record.' };
        }
        const revision = nextRevision(record.revision);
        patchRecord(kind, id, {
          revision,
          status: 'Draft',
          reviews: [],
          release: {
            ...(record.release || {}),
            releaseStatus: 'Not released',
            releaseDate: '',
            processRevision: revision,
          },
          statusHistory: [
            ...(record.statusHistory || []),
            {
              id: `SH-${record.id}-REV`,
              status: 'Draft',
              at: TODAY,
              by,
              note: `New revision raised: Rev ${record.revision} → Rev ${revision}. Previous revision preserved.`,
            },
          ],
          updatedBy: by,
        });
        return { revision };
      },

      removeAttachment: (kind, id, fileName, by) => {
        const record = recordsFor(kind).find((row) => row.id === id);
        if (!record) return { error: 'Record not found.' };
        if (!['Draft', 'In Preparation', 'Revision Required', 'Rejected'].includes(record.status)) {
          return { error: 'Attachments on a submitted or released record cannot be removed.' };
        }
        patchRecord(kind, id, {
          attachments: (record.attachments || []).filter((file) => file.name !== fileName),
          updatedBy: by,
        });
        return {};
      },

      statusStamp: stamp,
    };
  }, [state]);

  return <ManufacturingContext.Provider value={value}>{children}</ManufacturingContext.Provider>;
}

export function useManufacturing() {
  const context = useContext(ManufacturingContext);
  if (!context) throw new Error('useManufacturing must be used inside a ManufacturingProvider');
  return context;
}
