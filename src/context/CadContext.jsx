import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CAD_FILES,
  DRAWINGS,
  HANDOVERS,
  REVIEWER_PERSONA,
  TODAY,
  TRANSMITTALS,
  conversionSummary,
  defaultSourceApplication,
  designForProject,
  extensionOf,
  nextId,
  nextRevision,
} from '../data/cadData';

/**
 * Drawing & CAD Management state (Module 10).
 *
 * Frontend only: records, reviews, releases, transmittals and handovers are
 * local browser state. Browser-selected files live in an in-memory map only —
 * refreshing the page clears those temporary object URLs, by design.
 */
const CadContext = createContext(null);
const STORAGE_KEY = 'md-cad-state-v1';

function normalizeFile(file) {
  const ext = file.originalExtension || extensionOf(file.fileName);
  const design = designForProject(file.projectId);
  const conversion = conversionSummary(file.fileName, Boolean(file.previewFileId));
  return {
    ...file,
    fileType: file.fileType || ext.toUpperCase(),
    originalExtension: ext,
    designId: file.designId || design?.id || '',
    designRevision: file.designRevision || design?.revision || '',
    sourceApplication: file.sourceApplication || defaultSourceApplication(file.fileName),
    units: file.units || 'mm',
    scale: file.scale || '1:1',
    coordinateReference: file.coordinateReference || 'Model origin',
    conversionStatus: file.conversionStatus || conversion.status,
    conversionFormat: file.conversionFormat || conversion.format,
    previewNote: file.previewNote || conversion.note,
    versionNumber: file.versionNumber || 1,
    previousFileId: file.previousFileId || '',
    supersededBy: file.supersededBy || '',
    previewFileId: file.previewFileId || '',
  };
}

function normalizeDrawing(drawing) {
  const design = designForProject(drawing.projectId);
  const designId = drawing.designId || design?.id || '';
  const designRevision = drawing.designRevision || design?.revision || '';
  return {
    ...drawing,
    designId,
    designRevision,
    scale: drawing.scale || '1:1',
    units: drawing.units || 'mm',
    sheetSize: drawing.sheetSize || 'A3',
    projectionMethod: drawing.projectionMethod || 'First angle',
    materialRef: drawing.materialRef || '',
    toleranceNotes: drawing.toleranceNotes || '',
    simulationRef: drawing.simulationRef || '',
    changeRef: drawing.changeRef || '',
    revisions: (drawing.revisions || []).map((entry) => ({
      ...entry,
      meta: {
        ...entry.meta,
        designId: entry.meta?.designId || designId,
        designRevision: entry.meta?.designRevision || designRevision,
        scale: entry.meta?.scale || drawing.scale || '1:1',
        units: entry.meta?.units || drawing.units || 'mm',
        sheetSize: entry.meta?.sheetSize || drawing.sheetSize || 'A3',
        projectionMethod: entry.meta?.projectionMethod || drawing.projectionMethod || 'First angle',
        materialRef: entry.meta?.materialRef || drawing.materialRef || '',
        toleranceNotes: entry.meta?.toleranceNotes || drawing.toleranceNotes || '',
        simulationRef: entry.meta?.simulationRef || drawing.simulationRef || '',
        changeRef: entry.meta?.changeRef || drawing.changeRef || '',
      },
    })),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.files) || parsed.files.length === 0) return null;
    return {
      files: parsed.files.map(normalizeFile),
      drawings: (parsed.drawings || DRAWINGS).map(normalizeDrawing),
      transmittals: parsed.transmittals || TRANSMITTALS,
      handovers: parsed.handovers || HANDOVERS,
    };
  } catch {
    return null;
  }
}

const persisted = load();

function stamp(entry) {
  return { id: `CH-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, at: TODAY, ...entry };
}

export function CadProvider({ children }) {
  const [state, setState] = useState(
    () =>
      persisted || {
        files: CAD_FILES.map(normalizeFile),
        drawings: DRAWINGS.map(normalizeDrawing),
        transmittals: TRANSMITTALS,
        handovers: HANDOVERS,
      },
  );
  const [localFiles, setLocalFiles] = useState({});
  const [pendingUpload, setPendingUpload] = useState(null);
  const localFilesRef = useRef(localFiles);
  localFilesRef.current = localFiles;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — session works in memory
    }
  }, [state]);

  useEffect(() => () => {
    Object.values(localFilesRef.current).forEach((entry) => {
      if (entry?.url) URL.revokeObjectURL(entry.url);
    });
  }, []);

  const value = useMemo(() => {
    const setList = (key, updater) => setState((previous) => ({ ...previous, [key]: updater(previous[key]) }));
    const patchDrawing = (id, patch) =>
      setList('drawings', (list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    const drawingById = (id) => state.drawings.find((row) => row.id === id);

    const history = (drawing, action, description) => [
      ...(drawing.changeHistory || []),
      stamp({ by: 'Design Admin', action, description }),
    ];
    const statusEntry = (drawing, status, by, note) => [
      ...(drawing.statusHistory || []),
      { id: `SH-${drawing.id}-${(drawing.statusHistory?.length || 0) + 1}`, status, at: TODAY, by, note },
    ];
    const markRevision = (drawing, status) =>
      (drawing.revisions || []).map((entry) => (entry.revision === drawing.revision ? { ...entry, status } : entry));

    return {
      ...state,
      localFiles,
      pendingUpload,
      stageUpload: (file) => setPendingUpload(file),
      clearPendingUpload: () => setPendingUpload(null),
      nextFileId: () => nextId('CAD', state.files),
      nextDrawingId: () => nextId('DRW', state.drawings),
      nextTransmittalId: () => nextId('TRN', state.transmittals),
      nextHandoverId: () => nextId('HND', state.handovers),

      addFile: (record, file) => {
        if (file) {
          const url = URL.createObjectURL(file);
          setLocalFiles((previous) => {
            if (previous[record.id]?.url) URL.revokeObjectURL(previous[record.id].url);
            return { ...previous, [record.id]: { url, name: file.name, size: file.size, file } };
          });
        }
        setList('files', (list) => [{ ...record, changeHistory: record.changeHistory || [] }, ...list]);
      },
      updateFile: (id, patch) => setList('files', (list) => list.map((row) => (row.id === id ? normalizeFile({ ...row, ...patch }) : row))),
      createFileVersion: (id, record, file, by) => {
        const source = state.files.find((row) => row.id === id);
        if (!source) return { error: 'CAD file not found.' };
        if (source.supersededBy) return { error: 'This file already has a newer controlled version.' };
        const newId = nextId('CAD', state.files);
        const requestedRevision = String(record?.revision || '').trim().toUpperCase();
        const revision = requestedRevision || nextRevision(source.revision);
        if (revision === source.revision) return { error: 'A controlled new version needs a different revision identifier.' };
        if (file) {
          const url = URL.createObjectURL(file);
          setLocalFiles((previous) => {
            if (previous[newId]?.url) URL.revokeObjectURL(previous[newId].url);
            return { ...previous, [newId]: { url, name: file.name, size: file.size, file } };
          });
        }
        const nextRecord = normalizeFile({
          ...source,
          ...record,
          id: newId,
          revision,
          previousFileId: id,
          versionNumber: (source.versionNumber || 1) + 1,
          supersededBy: '',
          previewFileId: '',
          uploadedAt: TODAY,
          uploadedBy: by || record?.uploadedBy || source.uploadedBy,
          uploadHistory: [
            ...(source.uploadHistory || []),
            { id: `${newId}-UP`, at: TODAY, by, action: 'New version uploaded', description: `Controlled version ${(source.versionNumber || 1) + 1} of ${source.fileName}; previous record ${source.id} retained.` },
          ],
          changeHistory: [
            ...(source.changeHistory || []),
            { id: `${newId}-CH`, at: TODAY, by, action: 'New file version', description: `${source.id} Rev ${source.revision} superseded by ${newId} Rev ${revision}.` },
          ],
        });
        setList('files', (list) => list.map((row) => row.id === id
          ? normalizeFile({
              ...row,
              status: 'Archived',
              supersededBy: newId,
              uploadHistory: [
                ...(row.uploadHistory || []),
                { id: `${id}-SUP`, at: TODAY, by, action: 'Superseded by new version', description: `Retained unchanged; ${newId} Rev ${revision} is the current version.` },
              ],
            })
          : row));
        setList('files', (list) => [nextRecord, ...list]);
        return { id: newId, revision };
      },
      removeFile: (id) => {
        setLocalFiles((previous) => {
          if (previous[id]?.url) URL.revokeObjectURL(previous[id].url);
          const next = { ...previous };
          delete next[id];
          return next;
        });
        setList('files', (list) => list.filter((row) => row.id !== id));
      },

      addDrawing: (record) => setList('drawings', (list) => [record, ...list]),
      updateDrawing: patchDrawing,
      removeDrawing: (id) => setList('drawings', (list) => list.filter((row) => row.id !== id)),

      submitDrawing: (id, by) => {
        const drawing = drawingById(id);
        if (!drawing) return { error: 'Drawing not found.' };
        if (!['Draft', 'Changes Requested'].includes(drawing.approvalStatus)) {
          return { error: 'Only a draft or changes-requested drawing can be submitted for review.' };
        }
        patchDrawing(id, {
          approvalStatus: 'Under Review',
          revisions: markRevision(drawing, 'Under Review'),
          statusHistory: statusEntry(drawing, 'Under Review', by, 'Submitted for technical review.'),
          changeHistory: history(drawing, 'Review submitted', 'Drawing submitted for technical review.'),
        });
        return {};
      },

      recordDrawingDecision: (id, { decision, comments, by = REVIEWER_PERSONA }) => {
        const drawing = drawingById(id);
        if (!drawing) return { error: 'Drawing not found.' };
        if (!['Submitted', 'Under Review'].includes(drawing.approvalStatus)) {
          return { error: 'A review decision can only be recorded for a submitted or under-review drawing.' };
        }
        if (!['Approved', 'Request Changes', 'Reject'].includes(decision)) return { error: 'Unknown decision.' };
        if (decision !== 'Approved' && !String(comments || '').trim()) {
          return { error: 'Comments are required when requesting changes or rejecting.' };
        }
        const status = decision === 'Approved' ? 'Approved' : decision === 'Request Changes' ? 'Changes Requested' : 'Withdrawn';
        patchDrawing(id, {
          approvalStatus: status,
          revisions: markRevision(drawing, decision === 'Approved' ? 'Approved' : status === 'Withdrawn' ? 'Withdrawn' : 'Under Review'),
          approvals: [
            ...(drawing.approvals || []),
            {
              id: `AP-${id}-${(drawing.approvals?.length || 0) + 1}`,
              reviewer: by,
              date: TODAY,
              decision: decision === 'Request Changes' ? 'Changes Requested' : decision,
              comments: comments || 'Drawing reviewed and approved.',
            },
          ],
          statusHistory: statusEntry(drawing, status, by, comments || 'Drawing approved after technical review.'),
          changeHistory: history(drawing, decision, comments || 'Technical review completed.'),
        });
        return {};
      },

      createRevision: (id, by, note, reason) => {
        const drawing = drawingById(id);
        if (!drawing) return { error: 'Drawing not found.' };
        if (!['Approved', 'Released', 'Superseded'].includes(drawing.approvalStatus)) {
          return { error: 'A revision can only be raised from an approved or released drawing.' };
        }
        const revision = nextRevision(drawing.revision);
        patchDrawing(id, {
          revision,
          approvalStatus: 'Draft',
          releaseStatus: 'Not released',
          releasedAt: '',
          releaseRef: '',
          approvals: [],
          revisions: [
            ...(drawing.revisions || []).map((entry) =>
              entry.revision === drawing.revision ? { ...entry, status: 'Superseded' } : entry,
            ),
            {
              revision,
              previous: drawing.revision,
              date: TODAY,
              by,
              note: note || 'New controlled drawing revision.',
              changeReason: reason || 'Controlled drawing change.',
              status: 'Draft',
              meta: {
                title: drawing.title,
                drawingType: drawing.drawingType,
                description: drawing.description,
                format: drawing.format,
                cadFileIds: drawing.cadFileIds,
                attachments: drawing.attachments.map((row) => row.name),
                designId: drawing.designId,
                designRevision: drawing.designRevision,
                scale: drawing.scale,
                units: drawing.units,
                sheetSize: drawing.sheetSize,
                projectionMethod: drawing.projectionMethod,
                materialRef: drawing.materialRef,
                toleranceNotes: drawing.toleranceNotes,
                simulationRef: drawing.simulationRef,
                changeRef: drawing.changeRef,
              },
            },
          ],
          statusHistory: statusEntry(drawing, 'Draft', by, `Revision ${revision} raised from Rev ${drawing.revision}.`),
          changeHistory: history(drawing, 'Revision created', `Rev ${drawing.revision} → Rev ${revision}. ${note || ''}${reason ? ` Reason: ${reason}` : ''}`),
        });
        return { revision };
      },

      releaseDrawing: (id, by, releaseRef) => {
        const drawing = drawingById(id);
        if (!drawing) return { error: 'Drawing not found.' };
        if (drawing.approvalStatus !== 'Approved') return { error: 'Only an approved drawing can be released.' };
        patchDrawing(id, {
          approvalStatus: 'Released',
          releaseStatus: 'Released',
          releasedAt: TODAY,
          releaseBy: by,
          releaseRef: releaseRef || `REL-DRG-${drawing.drawingNumber.slice(-7)}`,
          revisions: markRevision(drawing, 'Released'),
          statusHistory: statusEntry(drawing, 'Released', by, 'Released as a controlled document.'),
          changeHistory: history(drawing, 'Released', 'Drawing released after approval.'),
        });
        return {};
      },

      addTransmittal: (row) => setList('transmittals', (list) => [row, ...list]),
      updateTransmittalStatus: (id, status, remarks) =>
        setList('transmittals', (list) => list.map((row) => (row.id === id ? { ...row, status, remarks: remarks ?? row.remarks } : row))),
      removeTransmittal: (id) => setList('transmittals', (list) => list.filter((row) => row.id !== id)),

      addHandover: (row) => {
        const drawing = drawingById(row.drawingId);
        if (!drawing) return { error: 'Select a drawing for the handover reference.' };
        if (!['Approved', 'Released'].includes(drawing.approvalStatus)) {
          return { error: 'Only an approved or released drawing revision can be handed over.' };
        }
        if (row.revision !== drawing.revision) {
          return { error: 'The handover must use the current approved or released drawing revision.' };
        }
        setList('handovers', (list) => [{ ...row, drawingStatus: drawing.approvalStatus }, ...list]);
        return {};
      },
      updateHandoverStatus: (id, status) =>
        setList('handovers', (list) => list.map((row) => (row.id === id ? { ...row, status } : row))),
      removeHandover: (id) => setList('handovers', (list) => list.filter((row) => row.id !== id)),
    };
  }, [state, localFiles, pendingUpload]);

  return <CadContext.Provider value={value}>{children}</CadContext.Provider>;
}

export function useCad() {
  const context = useContext(CadContext);
  if (!context) throw new Error('useCad must be used inside a CadProvider');
  return context;
}
