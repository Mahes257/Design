import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ACK_STATUSES,
  SOURCE_DELIVERABLES,
  TODAY,
  TRANSFERS,
  makePackage,
  makeValidation,
  nextRequisitionId,
  nextTransferId,
  projectName,
  sourceFor,
  transferStats,
  validationBlocking,
  withDerivedStatus,
} from '../data/transfersData';

/**
 * Module 11 state.
 *
 * All records are browser-local mock handovers. No Procurement requisition,
 * Purchase order or Production order is created in the ERP.
 */
const TransfersContext = createContext(null);
const STORAGE_KEY = 'md-transfers-state-v1';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.transfers) || parsed.transfers.length === 0) return null;
    return parsed.transfers;
  } catch {
    return null;
  }
}

const persisted = loadPersisted();
let eventSequence = 0;

function timestamp() {
  eventSequence += 1;
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}.${String(eventSequence).padStart(3, '0')}`;
}

function addHistory(record, config) {
  return {
    ...record,
    history: [
      ...(record.history || []),
      {
        id: `TH-${record.id}-${(record.history?.length || 0) + 1}-${Date.now()}`,
        at: timestamp(),
        stage: config.stage,
        action: config.action,
        previousStatus: config.previousStatus || record.status,
        newStatus: config.newStatus || record.status,
        by: config.by || 'N. Joshi',
        role: config.role || 'Transfer Coordinator',
        comments: config.comments || '',
      },
    ],
  };
}

function updateDestinations(record, updater) {
  const next = updater(record);
  return withDerivedStatus(next);
}

function destinationSide(record, destination) {
  return destination === 'Purchase' ? record.purchase : record.production;
}

function handoverPrefix(destination) {
  return destination === 'Purchase' ? 'PUR' : 'PRD';
}

function documentNames(record, destination) {
  const names = (record.attachments || []).map((row) => row.name);
  if (destination === 'Purchase') {
    names.push(...(record.purchase?.requisitions || []).map((row) => row.id));
  } else {
    names.push(...(record.production?.package?.documents || []).map((row) => row.number || row.name));
    names.push(...(record.production?.package?.attachments || []));
  }
  return [...new Set(names.filter(Boolean))];
}

export function TransfersProvider({ children }) {
  const [transfers, setTransfers] = useState(() => persisted || TRANSFERS);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ transfers }));
    } catch {
      // Local storage can be unavailable; the session still works in memory.
    }
  }, [transfers]);

  const value = useMemo(() => {
    const find = (id) => transfers.find((row) => row.id === id);
    const patch = (id, updater) =>
      setTransfers((previous) => previous.map((row) => (row.id === id ? withDerivedStatus(updater(row)) : row)));

    const recordEvent = (id, config) => patch(id, (record) => addHistory(record, config));

    const saveTransfer = (record) => {
      setTransfers((previous) => {
        const exists = previous.some((row) => row.id === record.id);
        const saved = withDerivedStatus({
          ...record,
          updatedAt: timestamp(),
        });
        if (exists) return previous.map((row) => (row.id === saved.id ? saved : row));
        return [
          addHistory(saved, {
            stage: 'Transfer Register',
            action: record.status === 'Draft' ? 'Draft saved' : 'Transfer created',
            previousStatus: '',
            newStatus: saved.status,
            by: record.initiatedBy,
            comments: record.notes || 'Transfer record created.',
          }),
          ...previous,
        ];
      });
      return record.id;
    };

    return {
      transfers,
      sources: SOURCE_DELIVERABLES,
      stats: transferStats(transfers),
      nextTransferId: () => nextTransferId(transfers),
      nextRequisitionId: () => nextRequisitionId(transfers),
      resetTransfers: () => setTransfers(TRANSFERS),

      getTransfer: find,
      getSource: (record) => sourceFor(record),

      saveTransfer,

      deleteDraft: (id) =>
        setTransfers((previous) => previous.filter((row) => !(row.id === id && row.status === 'Draft'))),

      validateTransfer: (id, { checkedBy = 'N. Joshi' } = {}) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (record.cancellation) return { error: 'Cancelled transfers cannot be revalidated.' };
        const sourceRow = sourceFor(record);
        if (!sourceRow) return { error: 'The source deliverable reference is missing.' };
        const extra = [];
        if (record.destinations.includes('Production') && record.production?.package) {
          const pkg = record.production.package;
          if (pkg.status === 'Blocked') {
            extra.push({
              key: 'package-ready',
              label: 'Manufacturing package is validated',
              scope: 'Production',
              mandatory: true,
              result: 'Invalid',
              note: 'The manufacturing package is blocked. Resolve the package validation before transfer.',
            });
          }
        }
        const validation = makeValidation(sourceRow, record.destinations, { checkedAt: TODAY, checkedBy, extra });
        const blocking = validationBlocking(validation);
        const updated = {
          ...record,
          validation,
          manualStatus: '',
          updatedAt: timestamp(),
        };
        const derived = withDerivedStatus(updated);
        patch(id, (row) =>
          addHistory(
            {
              ...row,
              validation,
              manualStatus: '',
              updatedAt: timestamp(),
            },
            {
              stage: 'Validation',
              action: blocking ? 'Validation failed' : 'Transfer validated',
              previousStatus: row.status,
              newStatus: derived.status,
              by: checkedBy,
              comments: blocking ? 'Mandatory validation checks failed.' : 'All mandatory validation checks passed.',
            },
          ),
        );
        return { validation, status: derived.status, blocking };
      },

      prepareHandover: (id, destination, config = {}) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (!record.destinations.includes(destination)) return { error: `${destination} is not a selected destination.` };
        if (record.cancellation) return { error: 'Cancelled transfers cannot be handed over.' };
        if (record.failure) return { error: 'Failed transfers cannot be handed over.' };
        if (record.status === 'Draft') return { error: 'Validate the draft transfer before preparing a handover.' };
        const sourceRow = sourceFor(record);
        const validation = record.validation || makeValidation(sourceRow, record.destinations, { checkedAt: TODAY });
        if (validationBlocking(validation)) return { error: 'Resolve the failed validation checks before preparing a handover.' };
        const side = destinationSide(record, destination);

        if (destination === 'Production') {
          const pkg = side.package;
          if (!pkg) return { error: 'Create and validate a manufacturing package before Production handover.' };
          if (!['Validated', 'Ready for Handover'].includes(pkg.status)) {
            return { error: 'The manufacturing package must be validated and marked Ready for Handover first.' };
          }
        }

        const existing = transfers.flatMap((row) => [row.purchase?.handover?.id, row.production?.handover?.id]).filter(Boolean);
        const sequence = String(
          Math.max(
            0,
            ...existing.map((reference) => Number(String(reference).split('-').pop())).filter(Number.isFinite),
          ) + 1,
        ).padStart(3, '0');
        const handoverRecord = {
          id: `${handoverPrefix(destination)}-HO-2026-${sequence}`,
          date: config.date || TODAY,
          owner: config.owner || (destination === 'Purchase' ? 'Purchase — Sourcing cell' : 'Production — Assembly bay'),
          preparedBy: config.preparedBy || 'N. Joshi',
          notes: config.notes || '',
          documents: documentNames(record, destination),
          snapshot: {
            projectId: record.projectId,
            deliverableNumber: record.deliverableNumber,
            revision: record.revision,
            releaseId: record.releaseId,
            destination,
            ...(destination === 'Purchase'
              ? { bomNumber: sourceRow?.bomNumber || record.deliverableNumber, bomRevision: sourceRow?.bomRevision || record.revision }
              : { packageId: side.package?.id || '', packageRevision: side.package?.revision || '' }),
          },
        };

        patch(id, (row) => {
          const nextSide = {
            ...destinationSide(row, destination),
            handover: handoverRecord,
            status: 'Acknowledgement Pending',
            progress: {
              ...destinationSide(row, destination).progress,
              handover: 'Recorded',
              acknowledgement: 'Pending',
            },
          };
          const next = {
            ...row,
            validation,
            manualStatus: '',
            updatedAt: timestamp(),
            ...(destination === 'Purchase' ? { purchase: nextSide } : { production: nextSide }),
          };
          const derived = withDerivedStatus(next);
          return addHistory(
            { ...next, status: derived.status },
            {
              stage: destination,
              action: `${destination} handover recorded`,
              previousStatus: row.status,
              newStatus: derived.status,
              by: handoverRecord.preparedBy,
              comments: `${handoverRecord.id} · ${handoverRecord.owner}`,
            },
          );
        });
        return { handover: handoverRecord };
      },

      acknowledgeTransfer: (id, destination, { status, owner, date, comments = '' } = {}) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (!ACK_STATUSES.includes(status)) return { error: 'Choose a valid acknowledgement status.' };
        const side = destinationSide(record, destination);
        if (!side?.handover) return { error: 'Record a handover before adding an acknowledgement.' };
        if (status !== 'Acknowledged' && !String(comments || '').trim()) {
          return { error: 'Comments are required for acknowledgements with remarks, rejection or hold.' };
        }
        const previous = side.acknowledgement?.status || 'Pending';
        const acknowledgement = {
          status,
          owner: owner || side.handover.owner,
          date: date || TODAY,
          comments: comments.trim(),
          previousStatus: previous,
          newStatus: status,
          recordedLocally: true,
        };
        patch(id, (row) => {
          const currentSide = destinationSide(row, destination);
          const nextSide = {
            ...currentSide,
            acknowledgement,
            status: ['Rejected', 'On Hold'].includes(status) ? 'On Hold' : 'Acknowledged',
            progress: {
              ...currentSide.progress,
              acknowledgement: status,
            },
          };
          const next = {
            ...row,
            ...(destination === 'Purchase' ? { purchase: nextSide } : { production: nextSide }),
            manualStatus: '',
            updatedAt: timestamp(),
          };
          const derived = withDerivedStatus(next);
          return addHistory(
            { ...next, status: derived.status },
            {
              stage: destination,
              action: `Mock acknowledgement — ${status}`,
              previousStatus: previous,
              newStatus: status,
              by: acknowledgement.owner,
              role: `${destination} Owner`,
              comments: comments || 'Handover acknowledged locally (mock).',
            },
          );
        });
        return {};
      },

      addComment: (id, { stage = 'General', text, author = 'N. Joshi', role = 'Transfer Coordinator', attachment = '' }) => {
        if (!String(text || '').trim()) return { error: 'Write a comment before saving.' };
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        const comment = {
          id: `TC-${id}-${(record.comments?.length || 0) + 1}`,
          at: timestamp(),
          stage,
          author,
          role,
          text: text.trim(),
          attachment,
        };
        patch(id, (row) =>
          addHistory(
            { ...row, comments: [...(row.comments || []), comment] },
            {
              stage,
              action: 'Comment added',
              by: author,
              role,
              comments: text.trim(),
            },
          ),
        );
        return {};
      },

      cancelTransfer: (id, { reason, by = 'N. Joshi' }) => {
        if (!String(reason || '').trim()) return { error: 'A cancellation reason is required.' };
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (record.cancellation) return { error: 'This transfer is already cancelled.' };
        patch(id, (row) => {
          const cancellation = { reason: reason.trim(), by, at: timestamp() };
          const next = {
            ...row,
            cancellation,
            manualStatus: 'Cancelled',
            updatedAt: timestamp(),
            purchase: { ...row.purchase, status: 'Cancelled' },
            production: { ...row.production, status: 'Cancelled' },
          };
          return addHistory(
            { ...next, status: 'Cancelled' },
            {
              stage: 'Transfer Register',
              action: 'Transfer cancelled',
              previousStatus: row.status,
              newStatus: 'Cancelled',
              by,
              comments: cancellation.reason,
            },
          );
        });
        return {};
      },

      saveRequisition: (id, requisition) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        const sourceRow = sourceFor(record);
        const generated = {
          ...requisition,
          id: requisition.id || nextRequisitionId(transfers),
          status: requisition.status || 'Draft',
          createdAt: requisition.createdAt || TODAY,
          verifiedAt: requisition.verifiedAt || '',
          raisedAt: requisition.raisedAt || '',
          sourceId: record.sourceId,
          projectId: record.projectId,
          bomNumber: sourceRow?.bomNumber || (record.deliverableType === 'BOM' ? record.deliverableNumber : record.purchase?.requisitions?.[0]?.bomNumber || ''),
          bomRevision: sourceRow?.bomRevision || record.revision,
        };
        patch(id, (row) => {
          const existing = (row.purchase?.requisitions || []).some((entry) => entry.id === generated.id);
          const requisitions = existing
            ? row.purchase.requisitions.map((entry) => (entry.id === generated.id ? generated : entry))
            : [...(row.purchase?.requisitions || []), generated];
          const purchase = { ...row.purchase, requisitions };
          if (purchase.status === 'Not Prepared') purchase.status = 'Draft';
          return addHistory(
            { ...row, purchase },
            {
              stage: 'Purchase',
              action: existing ? 'Requisition draft updated' : 'Requisition draft created',
              by: requisition.author || 'N. Joshi',
              comments: `${generated.id} · ${generated.description || generated.materialCode || 'Material requisition'}`,
            },
          );
        });
        return { id: generated.id };
      },

      updateRequisitionStatus: (id, requisitionId, status) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (!['Validated', 'Prepared', 'Requisition Raised (Mock)'].includes(status)) return { error: 'Unknown requisition action.' };
        patch(id, (row) => {
          const requisitions = (row.purchase?.requisitions || []).map((entry) =>
            entry.id === requisitionId
              ? {
                  ...entry,
                  status,
                  verifiedAt: status === 'Validated' ? TODAY : entry.verifiedAt,
                  raisedAt: status === 'Requisition Raised (Mock)' ? TODAY : entry.raisedAt,
                }
              : entry,
          );
          const purchase = {
            ...row.purchase,
            requisitions,
            status:
              status === 'Requisition Raised (Mock)'
                ? 'Requisition Raised (Mock)'
                : row.purchase.status === 'Not Prepared' || row.purchase.status === 'Draft'
                  ? 'Ready for Handover'
                  : row.purchase.status,
            progress: {
              ...row.purchase.progress,
              requisition:
                status === 'Requisition Raised (Mock)' ? 'Requisition Raised (Mock)' : status === 'Prepared' ? 'Prepared' : 'Validated',
            },
          };
          return addHistory(
            { ...row, purchase },
            {
              stage: 'Purchase',
              action: status === 'Validated' ? 'Requisition validated' : status === 'Prepared' ? 'Requisition marked prepared' : 'Mock requisition raised',
              by: 'N. Joshi',
              comments: `${requisitionId} → ${status}`,
            },
          );
        });
        return {};
      },

      updatePurchaseStatus: (id, { status, remarks = '', by = 'N. Joshi' }) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (!record.purchase?.included) return { error: 'Purchase is not a destination for this transfer.' };
        patch(id, (row) => {
          const purchase = {
            ...row.purchase,
            status,
            progress: { ...row.purchase.progress, mockPurchase: status, remarks: remarks || row.purchase.progress.remarks },
          };
          return addHistory(
            { ...row, purchase },
            {
              stage: 'Purchase',
              action: 'Purchase status updated',
              previousStatus: row.purchase.status,
              newStatus: status,
              by,
              comments: remarks || `Mock purchase status set to ${status}.`,
            },
          );
        });
        return {};
      },

      updateProductionStatus: (id, { status, remarks = '', by = 'N. Joshi' }) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        if (!record.production?.included) return { error: 'Production is not a destination for this transfer.' };
        patch(id, (row) => {
          const production = {
            ...row.production,
            status,
            progress: { ...row.production.progress, mockProduction: status, remarks: remarks || row.production.progress.remarks },
          };
          return addHistory(
            { ...row, production },
            {
              stage: 'Production',
              action: 'Production status updated',
              previousStatus: row.production.status,
              newStatus: status,
              by,
              comments: remarks || `Mock production status set to ${status}.`,
            },
          );
        });
        return {};
      },

      updateWorkflow: (id, workflowId, updates) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        patch(id, (row) => {
          const workflow = (row.purchase?.workflow || []).map((entry) =>
            entry.id === workflowId
              ? {
                  ...entry,
                  ...updates,
                  completionDate: updates.status === 'Completed' ? updates.completionDate || TODAY : updates.completionDate ?? entry.completionDate,
                }
              : entry,
          );
          return addHistory(
            { ...row, purchase: { ...row.purchase, workflow } },
            {
              stage: 'Purchase',
              action: `${workflow.find((entry) => entry.id === workflowId)?.stage || 'Workflow'} updated`,
              by: updates.owner || 'N. Joshi',
              comments: `Status: ${updates.status || workflow.find((entry) => entry.id === workflowId)?.status}`,
            },
          );
        });
        return {};
      },

      savePackage: (id, patchData = {}, { create = false } = {}) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        const sourceRow = sourceFor(record);
        const usedPackageIds = transfers
          .flatMap((row) => [row.production?.package?.id])
          .filter(Boolean)
          .map((reference) => Number(String(reference).split('-').pop()))
          .filter(Number.isFinite);
        const nextPackageId = `MFG-2026-${String(Math.max(0, ...usedPackageIds) + 1).padStart(3, '0')}`;
        patch(id, (row) => {
          const existing = row.production?.package;
          const nextPackage = existing
            ? { ...existing, ...patchData, status: 'Draft', updatedAt: TODAY }
            : makePackage(sourceRow, {
                id: nextPackageId,
                status: 'Draft',
                preparedBy: patchData.preparedBy || 'N. Joshi',
                ...patchData,
              });
          const production = { ...row.production, package: nextPackage, status: nextPackage.status === 'Blocked' ? 'On Hold' : 'Draft' };
          return addHistory(
            { ...row, production },
            {
              stage: 'Production',
              action: create ? 'Manufacturing package draft created' : 'Manufacturing package updated',
              by: nextPackage.preparedBy || 'N. Joshi',
              comments: `${nextPackage.id} Rev ${nextPackage.revision}`,
            },
          );
        });
        return {};
      },

      validatePackage: (id) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        const pkg = record.production?.package;
        if (!pkg) return { error: 'Create a manufacturing package first.' };
        const results = [
          { key: 'pkg-drawing', label: 'Drawing references available', result: pkg.drawingReferences?.length ? 'Valid' : 'Invalid', note: pkg.drawingReferences?.join(', ') || 'No drawing reference.' },
          { key: 'pkg-instructions', label: 'Manufacturing instructions available', result: pkg.manufacturingInstructions?.length ? 'Valid' : 'Invalid', note: `${pkg.manufacturingInstructions?.length || 0} instruction line(s).` },
          { key: 'pkg-inspection', label: 'Inspection requirements documented', result: pkg.inspection?.trim() ? 'Valid' : 'Invalid', note: pkg.inspection || 'Inspection requirements missing.' },
          { key: 'pkg-attachments', label: 'Technical attachments available', result: pkg.attachments?.length ? 'Valid' : 'Warning', note: pkg.attachments?.join(', ') || 'No package attachments recorded.' },
          { key: 'pkg-readiness', label: 'No blocked readiness item', result: pkg.readiness?.some((entry) => entry.status === 'Blocked') ? 'Invalid' : 'Valid', note: pkg.readiness?.filter((entry) => entry.status === 'Blocked').map((entry) => entry.label).join(', ') || 'No blocked readiness items.' },
        ];
        const invalid = results.some((entry) => entry.result === 'Invalid');
        const nextStatus = invalid ? 'Blocked' : 'Validated';
        patch(id, (row) => {
          const production = {
            ...row.production,
            package: { ...pkg, status: nextStatus, validation: { checkedAt: TODAY, results }, updatedAt: TODAY },
            status: invalid ? 'On Hold' : row.production.status,
          };
          return addHistory(
            { ...row, production },
            {
              stage: 'Production',
              action: invalid ? 'Manufacturing package validation failed' : 'Manufacturing package validated',
              by: 'N. Joshi',
              comments: invalid ? 'Resolve the failed package checks.' : 'Package content checks passed.',
            },
          );
        });
        return { invalid, results };
      },

      markPackageReady: (id) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        const pkg = record.production?.package;
        if (!pkg) return { error: 'Create a manufacturing package first.' };
        const blockingReadiness = (pkg.readiness || []).filter(
          (entry) => !['Ready', 'Not Applicable'].includes(entry.status) && entry.key !== 'handover',
        );
        if (blockingReadiness.length) return { error: 'Complete the outstanding readiness items first.' };
        if (!pkg.drawingReferences?.length || !pkg.manufacturingInstructions?.length || !pkg.inspection?.trim()) {
          return { error: 'Validate the package content before marking it ready.' };
        }
        patch(id, (row) => {
          const readiness = (pkg.readiness || []).map((entry) =>
            entry.key === 'handover' ? { ...entry, status: 'Ready' } : entry,
          );
          const production = {
            ...row.production,
            package: { ...pkg, status: 'Ready for Handover', readiness, updatedAt: TODAY },
            status: 'Ready for Handover',
            progress: { ...row.production.progress, packagePreparation: 'Ready for Handover', readiness: 'Ready' },
          };
          return addHistory(
            { ...row, production },
            {
              stage: 'Production',
              action: 'Manufacturing package marked Ready for Handover',
              by: pkg.preparedBy,
              comments: `${pkg.id} Rev ${pkg.revision}`,
            },
          );
        });
        return {};
      },

      updateReadiness: (id, itemKey, status) => {
        const record = find(id);
        if (!record) return { error: 'Transfer not found.' };
        const pkg = record.production?.package;
        if (!pkg) return { error: 'Create a manufacturing package first.' };
        const readiness = pkg.readiness.map((entry) => (entry.key === itemKey ? { ...entry, status } : entry));
        const blocked = readiness.some((entry) => entry.status === 'Blocked');
        patch(id, (row) => {
          const production = {
            ...row.production,
            package: { ...pkg, readiness, status: blocked ? 'Blocked' : pkg.status === 'Ready for Handover' ? 'In Progress' : pkg.status, updatedAt: TODAY },
            progress: { ...row.production.progress, readiness: blocked ? 'Blocked' : 'In Progress' },
          };
          return addHistory(
            { ...row, production },
            {
              stage: 'Production',
              action: 'Production readiness updated',
              by: 'N. Joshi',
              comments: `${pkg.readiness.find((entry) => entry.key === itemKey)?.label}: ${status}`,
            },
          );
        });
        return {};
      },

      projectName,
      statsFor: () => transferStats(transfers),
    };
  }, [transfers]);

  return <TransfersContext.Provider value={value}>{children}</TransfersContext.Provider>;
}

export function useTransfers() {
  const context = useContext(TransfersContext);
  if (!context) throw new Error('useTransfers must be used inside TransfersProvider');
  return context;
}
