import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  BOMS,
  COST_ESTIMATES,
  EDITABLE_BOM_STATUSES,
  LABOUR_ESTIMATES,
  MATERIAL_REQUIREMENTS,
  QUANTITY_CALCULATIONS,
  RATE_ANALYSIS,
  TODAY,
  TRANSFERS,
  isBomEditable,
  nextId,
  nextRevision,
  costLinesFromEstimate,
  designForProject,
} from '../data/bomData';

/**
 * BOM & Cost Estimation state (Module 08).
 *
 * Shared store for BOMs, material requirements, quantity calculations, labour
 * and rate rows, cost estimates and simulated handovers. Frontend only:
 * approvals, releases and acknowledgements are local UI state and never call
 * Purchase, Production or any API.
 */
const BomContext = createContext(null);
const STORAGE_KEY = 'md-bom-state-v1';

function cloneItems(items = []) {
  return items.map((row) => ({ ...row }));
}

/** Keep the current editable revision aligned without touching released history. */
function normalizeItem(item, index) {
  return {
    ...item,
    itemNumber: item.itemNumber || String((index + 1) * 10),
    specification: item.specification || '',
    referenceDrawing: item.referenceDrawing || '',
    remarks: item.remarks || '',
  };
}

function normalizeEstimate(estimate, boms = []) {
  return {
    ...estimate,
    revision:
      estimate.revision ||
      boms.find((bom) => bom.id === estimate.bomId)?.revision ||
      '',
    additionalCost: Number(estimate.additionalCost || 0),
    contingencyPct: Number(estimate.contingencyPct || 0),
    assumptions: estimate.assumptions || '',
    notes: estimate.notes || '',
    costLines: costLinesFromEstimate(estimate).map((line) => ({
      key: line.key,
      label: line.label,
      qty: Number(line.qty || 0),
      unitCost: Number(line.unitCost || 0),
    })),
  };
}

function normalizeBom(bom) {
  return {
    ...bom,
    designId: bom.designId || designForProject(bom.projectId),
    bomType: bom.bomType || 'Engineering (EBOM)',
    notes: bom.notes || bom.description || '',
    manufacturingDefinitionId: bom.manufacturingDefinitionId || '',
    drawingId: bom.drawingId || '',
    items: (bom.items || []).map(normalizeItem),
    revisions: (bom.revisions || []).map((entry) => {
      const frozen = ['Released', 'Superseded'].includes(entry.status);
      return entry.revision === bom.revision && !frozen
        ? { ...entry, items: cloneItems(bom.items) }
        : { ...entry, items: cloneItems(entry.items) };
    }),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.boms) || parsed.boms.length === 0) return null;
    return {
      boms: parsed.boms.map(normalizeBom),
      materials: parsed.materials || MATERIAL_REQUIREMENTS,
      quantities: parsed.quantities || QUANTITY_CALCULATIONS,
      labour: parsed.labour || LABOUR_ESTIMATES,
      rates: parsed.rates || RATE_ANALYSIS,
      estimates: (parsed.estimates || COST_ESTIMATES).map((estimate) =>
        normalizeEstimate(estimate, parsed.boms || BOMS),
      ),
      transfers: parsed.transfers || TRANSFERS,
    };
  } catch {
    return null;
  }
}

const persisted = load();

function change(entry) {
  return { id: `CH-${Date.now()}`, at: TODAY, ...entry };
}

export function BomProvider({ children }) {
  const [state, setState] = useState(
    () =>
      persisted || {
        boms: BOMS.map(normalizeBom),
        materials: MATERIAL_REQUIREMENTS,
        quantities: QUANTITY_CALCULATIONS,
        labour: LABOUR_ESTIMATES,
        rates: RATE_ANALYSIS,
        estimates: COST_ESTIMATES.map((estimate) => normalizeEstimate(estimate, BOMS)),
        transfers: TRANSFERS,
      },
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — session works in memory
    }
  }, [state]);

  const value = useMemo(() => {
    const setList = (key, updater) => setState((previous) => ({ ...previous, [key]: updater(previous[key]) }));

    const patchBom = (id, patch) =>
      setList('boms', (list) => list.map((bom) => (bom.id === id ? { ...bom, ...patch, updatedAt: TODAY } : bom)));

    return {
      ...state,
      nextBomId: () => nextId('BOM', state.boms),
      nextMaterialId: () => nextId('MREQ', state.materials),
      nextQuantityId: () => nextId('QC', state.quantities),
      nextLabourId: () => nextId('LAB', state.labour),
      nextRateId: () => nextId('RATE', state.rates),
      nextEstimateId: () => nextId('CST', state.estimates),

      duplicateBom: (id, by) => {
        const source = state.boms.find((row) => row.id === id);
        if (!source) return { error: 'BOM not found.' };
        const newId = nextId('BOM', state.boms);
        const items = cloneItems(source.items).map((item, index) => ({
          ...item,
          id: `BI-${newId.slice(-3)}-${String(index + 1).padStart(2, '0')}`,
          itemNumber: String((index + 1) * 10),
        }));
        const duplicate = {
          ...source,
          id: newId,
          name: `${source.name.replace(/ BOM$/, '')} BOM (copy)`,
          revision: 'A',
          status: 'Draft',
          date: TODAY,
          releaseRef: '',
          items,
          approvals: [],
          revisions: [
            {
              revision: 'A',
              previous: '',
              date: TODAY,
              by,
              note: `Duplicated from ${source.id} Rev ${source.revision}.`,
              status: 'Draft',
              items: cloneItems(items),
            },
          ],
          statusHistory: [
            {
              id: `SH-${newId}-1`,
              status: 'Draft',
              at: TODAY,
              by,
              note: `Duplicate draft created from ${source.id} Rev ${source.revision}.`,
            },
          ],
          changeHistory: [
            {
              id: `CH-${Date.now()}`,
              at: TODAY,
              by,
              action: 'BOM duplicated',
              description: `Created from ${source.id} Rev ${source.revision}. Source record unchanged.`,
            },
          ],
        };
        setList('boms', (list) => [duplicate, ...list]);
        return { id: newId };
      },

      addBom: (bom) =>
        setList('boms', (list) => [
          {
            ...bom,
            items: cloneItems(bom.items),
            revisions: (bom.revisions || []).map((entry) => ({
              ...entry,
              items: cloneItems(entry.items),
            })),
            changeHistory: bom.changeHistory || [],
          },
          ...list,
        ]),
      updateBom: (id, patch) => {
        const bom = state.boms.find((row) => row.id === id);
        if (!bom) return { error: 'BOM not found.' };
        if (!isBomEditable(bom)) {
          return { error: 'Approved, released or superseded BOMs are locked. Create a new revision to make changes.' };
        }
        patchBom(id, patch);
        return {};
      },
      removeBom: (id) => {
        const bom = state.boms.find((row) => row.id === id);
        if (!bom) return { error: 'BOM not found.' };
        if (!['Draft', 'In Progress'].includes(bom.status)) {
          return { error: 'Only draft or in-progress BOMs can be deleted.' };
        }
        setList('boms', (list) => list.filter((row) => row.id !== id));
        return {};
      },
      saveBomItems: (id, items, by) =>
        setList('boms', (list) =>
          list.map((bom) => {
            if (bom.id !== id || !isBomEditable(bom)) return bom;
            const nextItems = cloneItems(items);
            return {
              ...bom,
              items: nextItems,
              revisions: (bom.revisions || []).map((entry) =>
                entry.revision === bom.revision
                  ? { ...entry, items: cloneItems(nextItems) }
                  : entry,
              ),
              changeHistory: [
                ...(bom.changeHistory || []),
                change({ by, action: 'BOM items updated', description: 'BOM item structure saved from the BOM form.' }),
              ],
            };
          }),
        ),

      submitBom: (id, by) => {
        const bom = state.boms.find((row) => row.id === id);
        if (!bom) return { error: 'BOM not found.' };
        if (![...EDITABLE_BOM_STATUSES, 'Withdrawn'].includes(bom.status)) {
          return { error: 'Only an editable or withdrawn BOM can be submitted for review.' };
        }
        setList('boms', (list) =>
          list.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status: 'Under Review',
                  revisions: (row.revisions || []).map((entry) =>
                    entry.revision === row.revision
                      ? { ...entry, status: 'Under Review', items: cloneItems(row.items) }
                      : entry,
                  ),
                  statusHistory: [
                    ...(row.statusHistory || []),
                    { id: `SH-${id}-SUB`, status: 'Under Review', at: TODAY, by, note: 'Submitted for BOM review.' },
                  ],
                  changeHistory: [
                    ...(row.changeHistory || []),
                    change({ by, action: 'Submitted for review', description: 'BOM submitted for review and approval.' }),
                  ],
                }
              : row,
          ),
        );
        return {};
      },

      recordBomDecision: (id, { decision, comments, by }) => {
        const bom = state.boms.find((row) => row.id === id);
        if (!bom) return { error: 'BOM not found.' };
        if (!['Under Review', 'Changes Requested'].includes(bom.status)) {
          return { error: 'A review decision can only be recorded while the BOM is under review.' };
        }
        if (!['Approved', 'Reject', 'Request Changes'].includes(decision)) return { error: 'Unknown decision.' };
        if (decision !== 'Approved' && !String(comments || '').trim()) {
          return { error: 'Comments are required when rejecting or requesting changes.' };
        }
        const nextStatus = decision === 'Approved' ? 'Approved' : decision === 'Reject' ? 'Withdrawn' : 'Changes Requested';
        patchBom(id, {
          status: nextStatus,
          revisions: (bom.revisions || []).map((entry) =>
            entry.revision === bom.revision
              ? {
                  ...entry,
                  status: nextStatus === 'Approved' ? 'Approved' : nextStatus === 'Withdrawn' ? 'Withdrawn' : 'Under Review',
                  items: cloneItems(bom.items),
                }
              : entry,
          ),
          approvals: [
            ...(bom.approvals || []),
            {
              id: `AP-${id}-${(bom.approvals?.length || 0) + 1}`,
              reviewer: by,
              date: TODAY,
              decision: decision === 'Request Changes' ? 'Changes Requested' : decision,
              comments: comments || 'Approved after BOM review.',
            },
          ],
          statusHistory: [
            ...(bom.statusHistory || []),
            { id: `SH-${id}-${(bom.statusHistory?.length || 0) + 1}`, status: nextStatus, at: TODAY, by, note: comments || 'BOM approved.' },
          ],
          changeHistory: [
            ...(bom.changeHistory || []),
            change({ by, action: decision, description: comments || 'BOM review completed.' }),
          ],
        });
        return {};
      },

      releaseBom: (id, by, releaseRef) => {
        const bom = state.boms.find((row) => row.id === id);
        if (!bom) return { error: 'BOM not found.' };
        if (bom.status !== 'Approved') return { error: 'Only an approved BOM can be released.' };
        const releasedItems = cloneItems(bom.items);
        setList('boms', (list) =>
          list.map((row) =>
            row.id === id && row.status === 'Approved'
              ? {
                  ...row,
                  items: cloneItems(releasedItems),
                  status: 'Released',
                  releaseRef: releaseRef || row.releaseRef || `REL-2026-${String(list.length + 1).padStart(3, '0')}`,
                  revisions: (row.revisions || []).map((entry) =>
                    entry.revision === row.revision
                      ? { ...entry, status: 'Released', releasedAt: TODAY, items: cloneItems(releasedItems) }
                      : { ...entry, status: 'Superseded' },
                  ),
                  statusHistory: [
                    ...(row.statusHistory || []),
                    { id: `SH-${id}-REL`, status: 'Released', at: TODAY, by, note: 'Released for Purchase and Production handover.' },
                  ],
                  changeHistory: [
                    ...(row.changeHistory || []),
                    change({ by, action: 'Released', description: 'BOM released for downstream handover (simulated).' }),
                  ],
                }
              : row,
          ),
        );
        return {};
      },

      createRevision: (id, by, note, reason) => {
        const bom = state.boms.find((row) => row.id === id);
        if (!bom) return { error: 'BOM not found.' };
        if (!['Approved', 'Released', 'Superseded'].includes(bom.status)) {
          return { error: 'A revision can only be raised from an approved or released BOM.' };
        }
        const revision = nextRevision(bom.revision);
        patchBom(id, {
          revision,
          status: 'Draft',
          releaseRef: '',
          approvals: [],
          items: cloneItems(bom.items),
          revisions: [
            ...(bom.revisions || []).map((entry) =>
              entry.revision === bom.revision
                ? {
                    ...entry,
                    status: 'Superseded',
                    items: cloneItems(bom.items),
                    ...(entry.status === 'Released'
                      ? {
                          releasedAt:
                            entry.releasedAt ||
                            bom.statusHistory?.find((item) => item.status === 'Released')?.at ||
                            entry.date,
                        }
                      : {}),
                  }
                : entry,
            ),
            {
              revision,
              previous: bom.revision,
              date: TODAY,
              by,
              note: note || 'New BOM revision raised for a controlled change.',
              changeReason: reason || 'Controlled BOM change.',
              status: 'Draft',
              items: cloneItems(bom.items),
            },
          ],
          statusHistory: [
            ...(bom.statusHistory || []),
            { id: `SH-${id}-REV`, status: 'Draft', at: TODAY, by, note: `Revision ${revision} created from Rev ${bom.revision}.` },
          ],
          changeHistory: [
            ...(bom.changeHistory || []),
            change({ by, action: 'Revision created', description: `Rev ${bom.revision} → Rev ${revision}. ${note || ''}` }),
          ],
        });
        return { revision };
      },

      addMaterial: (row) => {
        const bom = state.boms.find((entry) => entry.id === row.bomId);
        if (!bom) return { error: 'Select a valid BOM for this material requirement.' };
        if (!isBomEditable(bom)) {
          return { error: 'This BOM is locked. Raise a new revision before changing its material requirements.' };
        }
        setList('materials', (list) => [row, ...list]);
        return {};
      },
      updateMaterial: (id, patch) => {
        const row = state.materials.find((entry) => entry.id === id);
        const bom = row ? state.boms.find((entry) => entry.id === (patch.bomId || row.bomId)) : null;
        if (!row || !bom) return { error: 'Material requirement or BOM not found.' };
        if (!isBomEditable(bom)) {
          return { error: 'This BOM is locked. Raise a new revision before changing its material requirements.' };
        }
        setList('materials', (list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
        return {};
      },
      removeMaterial: (id) => {
        const row = state.materials.find((entry) => entry.id === id);
        const bom = row ? state.boms.find((entry) => entry.id === row.bomId) : null;
        if (!row || !bom) return { error: 'Material requirement or BOM not found.' };
        if (!isBomEditable(bom)) {
          return { error: 'This BOM is locked. Raise a new revision before changing its material requirements.' };
        }
        setList('materials', (list) => list.filter((entry) => entry.id !== id));
        return {};
      },

      addQuantity: (row) => {
        const bom = state.boms.find((entry) => entry.id === row.bomId);
        if (!bom) return { error: 'Select a valid BOM for this quantity calculation.' };
        if (!isBomEditable(bom)) {
          return { error: 'This BOM is locked. Raise a new revision before changing its quantity calculations.' };
        }
        setList('quantities', (list) => [row, ...list]);
        return {};
      },
      updateQuantity: (id, patch) => {
        const row = state.quantities.find((entry) => entry.id === id);
        const bom = row ? state.boms.find((entry) => entry.id === (patch.bomId || row.bomId)) : null;
        if (!row || !bom) return { error: 'Quantity calculation or BOM not found.' };
        if (!isBomEditable(bom)) {
          return { error: 'This BOM is locked. Raise a new revision before changing its quantity calculations.' };
        }
        setList('quantities', (list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
        return {};
      },
      removeQuantity: (id) => {
        const row = state.quantities.find((entry) => entry.id === id);
        const bom = row ? state.boms.find((entry) => entry.id === row.bomId) : null;
        if (!row || !bom) return { error: 'Quantity calculation or BOM not found.' };
        if (!isBomEditable(bom)) {
          return { error: 'This BOM is locked. Raise a new revision before changing its quantity calculations.' };
        }
        setList('quantities', (list) => list.filter((entry) => entry.id !== id));
        return {};
      },

      addLabour: (row) => setList('labour', (list) => [row, ...list]),
      updateLabour: (id, patch) => setList('labour', (list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row))),
      removeLabour: (id) => setList('labour', (list) => list.filter((row) => row.id !== id)),

      addRate: (row) => setList('rates', (list) => [row, ...list]),
      updateRate: (id, patch) => setList('rates', (list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row))),
      removeRate: (id) => setList('rates', (list) => list.filter((row) => row.id !== id)),

      addEstimate: (row) => setList('estimates', (list) => [row, ...list]),
      updateEstimate: (id, patch) => setList('estimates', (list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row))),
      removeEstimate: (id) => setList('estimates', (list) => list.filter((row) => row.id !== id)),

      addTransfer: (row) => setList('transfers', (list) => [row, ...list]),
      updateTransferStatus: (id, status) =>
        setList('transfers', (list) => list.map((row) => (row.id === id ? { ...row, status } : row))),
      removeTransfer: (id) => setList('transfers', (list) => list.filter((row) => row.id !== id)),
    };
  }, [state]);

  return <BomContext.Provider value={value}>{children}</BomContext.Provider>;
}

export function useBom() {
  const context = useContext(BomContext);
  if (!context) throw new Error('useBom must be used inside a BomProvider');
  return context;
}
