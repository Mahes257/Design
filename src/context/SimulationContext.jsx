import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { TODAY } from '../data/projectData';
import {
  SIMULATION_MODELS,
  SIMULATION_OBSERVATIONS,
  VALIDATION_DOCUMENTS,
  nextModelId,
  nextObservationId,
  nextValidationReportId,
} from '../data/simulationData';

/**
 * Simulation & Design Validation state (Module 06).
 *
 * Frontend only. Model records, observations and reports are persisted in
 * localStorage. Uploaded file bytes live in an in-memory object-URL map for the
 * current browser session only — a refresh keeps the record (and states clearly
 * that the bytes are no longer available) but never pretends a model rendered.
 */
const SimulationContext = createContext(null);
const STORAGE_KEY = 'md-simulation-state-v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.models)) return null;
    return {
      models: parsed.models,
      observations: parsed.observations || SIMULATION_OBSERVATIONS,
      reports: parsed.reports || VALIDATION_DOCUMENTS,
    };
  } catch {
    return null;
  }
}

const persisted = load();

const stamp = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

export function SimulationProvider({ children }) {
  const [state, setState] = useState(
    () =>
      persisted || {
        models: SIMULATION_MODELS,
        observations: SIMULATION_OBSERVATIONS,
        reports: VALIDATION_DOCUMENTS,
      },
  );
  const [localFiles, setLocalFiles] = useState({});
  const localFilesRef = useRef(localFiles);
  localFilesRef.current = localFiles;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — session works in memory
    }
  }, [state]);

  useEffect(
    () => () => {
      Object.values(localFilesRef.current).forEach((entry) => {
        if (entry?.url) URL.revokeObjectURL(entry.url);
      });
    },
    [],
  );

  const value = useMemo(() => {
    const setList = (key, updater) => setState((previous) => ({ ...previous, [key]: updater(previous[key]) }));

    const report = (id) => state.reports.find((row) => row.id === id);
    const pushActivity = (row, label, detail, by) => [
      ...(row.activity || []),
      { id: stamp('ACT'), label, detail, by: by || row.preparedBy || 'Design Admin', at: TODAY },
    ];

    return {
      ...state,
      localFiles,

      nextModelId: () => nextModelId(state.models),
      nextObservationId: () => nextObservationId(state.observations),
      nextReportId: () => nextValidationReportId(state.reports),

      addModel: (record, file) => {
        if (file) {
          const url = URL.createObjectURL(file);
          setLocalFiles((previous) => {
            if (previous[record.id]?.url) URL.revokeObjectURL(previous[record.id].url);
            return { ...previous, [record.id]: { url, name: file.name, size: file.size, file } };
          });
        }
        setList('models', (list) => [record, ...list]);
        return record.id;
      },
      updateModel: (id, patch) =>
        setList('models', (list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row))),

      /** Attach a converted preview to the original record (original kept as-is). */
      attachPreview: (id, file, record = {}) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setLocalFiles((previous) => ({
          ...previous,
          [id]: { ...(previous[id] || {}), previewUrl: url, previewName: file.name, previewSize: file.size },
        }));
        setList('models', (list) =>
          list.map((row) =>
            row.id === id
              ? {
                  ...row,
                  ...record,
                  previewFileName: file.name,
                  previewSize: file.size,
                  previewAttachedAt: TODAY,
                }
              : row,
          ),
        );
      },

      removePreview: (id) => {
        setLocalFiles((previous) => {
          const entry = previous[id];
          if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
          return { ...previous, [id]: entry ? { ...entry, previewUrl: '', previewName: '' } : entry };
        });
        setList('models', (list) =>
          list.map((row) =>
            row.id === id
              ? { ...row, previewFileName: '', previewSize: 0, previewAttachedAt: '', previewFormat: '' }
              : row,
          ),
        );
      },
      removeModel: (id) => {
        setLocalFiles((previous) => {
          if (previous[id]?.url) URL.revokeObjectURL(previous[id].url);
          const next = { ...previous };
          delete next[id];
          return next;
        });
        setList('models', (list) => list.filter((row) => row.id !== id));
      },

      addObservation: (record) =>
        setList('observations', (list) => [
          {
            ...record,
            history: [
              {
                id: stamp('OBSH'),
                action: 'Recorded',
                by: record.reportedBy,
                at: record.reportedAt || TODAY,
                note: 'Observation recorded during 3D inspection.',
              },
            ],
          },
          ...list,
        ]),
      updateObservation: (id, patch, note = 'Observation updated') =>
        setList('observations', (list) =>
          list.map((row) =>
            row.id === id
              ? {
                  ...row,
                  ...patch,
                  history: [...(row.history || []), { id: stamp('OBSH'), action: 'Updated', by: patch.reportedBy || row.reportedBy, at: TODAY, note }],
                }
              : row,
          ),
        ),
      setObservationStatus: (id, status, by) =>
        setList('observations', (list) =>
          list.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status,
                  history: [
                    ...(row.history || []),
                    { id: stamp('OBSH'), action: 'Status changed', by: by || row.reportedBy, at: TODAY, note: status },
                  ],
                }
              : row,
          ),
        ),
      removeObservation: (id) => setList('observations', (list) => list.filter((row) => row.id !== id)),

      addReport: (record) =>
        setList('reports', (list) => [
          {
            ...record,
            activity: [
              ...(record.activity || []),
              { id: stamp('ACT'), label: 'Report created', detail: 'Validation report drafted', by: record.preparedBy, at: TODAY },
            ],
          },
          ...list,
        ]),
      updateReport: (id, patch) =>
        setList('reports', (list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row))),

      /** Only drafts can be removed; submitted reports keep their decision history. */
      removeReport: (id) =>
        setList('reports', (list) =>
          list.filter((row) => !(row.id === id && row.status === 'Draft')),
        ),

      duplicateReport: (id, by) =>
        setList('reports', (list) => {
          const source = list.find((row) => row.id === id);
          if (!source) return list;
          return [
            {
              ...source,
              id: nextValidationReportId(list),
              title: `${source.title} (Copy)`,
              status: 'Draft',
              reportDate: TODAY,
              validationResult: '',
              decisionHistory: [],
              issues: (source.issues || []).map((issue, index) => ({
                ...issue,
                id: `${nextValidationReportId(list)}-I${index + 1}`,
                status: 'Open',
              })),
              activity: [
                { id: stamp('ACT'), label: 'Report duplicated', detail: `Copied from ${source.id}`, by: by || source.preparedBy, at: TODAY },
              ],
            },
            ...list,
          ];
        }),

      submitReport: (id, by) =>
        setList('reports', (list) =>
          list.map((row) =>
            row.id === id && ['Draft', 'Corrections Required'].includes(row.status)
              ? {
                  ...row,
                  status: 'Under Review',
                  activity: pushActivity(row, 'Submitted for review', `Sent to ${row.reviewedBy || 'reviewer'}`, by),
                }
              : row,
          ),
        ),

      /** Reviewer decision; never automatically validates a design record. */
      recordDecision: (id, { decision, comments, by }) =>
        setList('reports', (list) =>
          list.map((row) =>
            row.id === id && ['Under Review', 'Corrections Required'].includes(row.status)
              ? {
                  ...row,
                  status: decision,
                  reviewerComments: comments || row.reviewerComments,
                  decisionHistory: [
                    ...(row.decisionHistory || []),
                    { id: stamp('DEC'), decision, comments: comments || '', by: by || row.reviewedBy, at: TODAY },
                  ],
                  activity: pushActivity(row, decision, comments || `Decision recorded: ${decision}`, by),
                }
              : row,
          ),
        ),

      /** Controlled revision: a validated/rejected report can be reissued as a new draft. */
      createReportRevision: (id, by) =>
        setList('reports', (list) => {
          const source = list.find((row) => row.id === id);
          if (!source) return list;
          return [
            {
              ...source,
              id: nextValidationReportId(list),
              title: `${source.title} (Rev draft)`,
              status: 'Draft',
              reportDate: TODAY,
              validationResult: '',
              decisionHistory: [],
              activity: [
                { id: stamp('ACT'), label: 'Revision created', detail: `New draft from ${source.id}`, by: by || source.preparedBy, at: TODAY },
              ],
            },
            ...list,
          ];
        }),
    };
  }, [state, localFiles]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used inside SimulationProvider');
  return context;
}
