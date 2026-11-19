import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ASSEMBLIES,
  CALCULATIONS,
  DESIGNS,
  PARTS,
  buildDesignActivity,
  nextAssemblyId,
  nextCalculationId,
  nextDesignId,
  nextPartId,
  nextRevision,
  normalizeDesignRecord,
  uniquePartNumber,
  wouldCreateCycle,
} from '../data/mechanicalData';
import { COMPARISONS } from '../data/conceptData';

/** Attach the project's selected concept when an older design lacks one. */
function normalizeDesign(design) {
  const selectedConceptId =
    COMPARISONS.find((comparison) => comparison.projectId === design.projectId)
      ?.selectedConceptId || '';
  return normalizeDesignRecord({
    ...design,
    conceptId: design.conceptId ?? selectedConceptId,
  });
}

/**
 * Mechanical Engineering Design state (Module 05).
 *
 * One shared store for designs, parts, assemblies and calculations so the three
 * submodules and every detail/form page agree on the same records. Mirrored into
 * localStorage (`md-mechanical-state-v1`); frontend only.
 */
const MechanicalContext = createContext(null);

const STORAGE_KEY = 'md-mechanical-state-v1';

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.designs) || parsed.designs.length === 0) return null;
    return {
      designs: parsed.designs.map(normalizeDesign),
      parts: Array.isArray(parsed.parts) ? parsed.parts : PARTS,
      assemblies: Array.isArray(parsed.assemblies) ? parsed.assemblies : ASSEMBLIES,
      calculations: Array.isArray(parsed.calculations) ? parsed.calculations : CALCULATIONS,
    };
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

export function MechanicalProvider({ children }) {
  const [designs, setDesigns] = useState(
    () => persistedState?.designs || DESIGNS.map(normalizeDesign),
  );
  const [parts, setParts] = useState(() => persistedState?.parts || PARTS);
  const [assemblies, setAssemblies] = useState(() => persistedState?.assemblies || ASSEMBLIES);
  const [calculations, setCalculations] = useState(
    () => persistedState?.calculations || CALCULATIONS,
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ designs, parts, assemblies, calculations }),
      );
    } catch {
      // storage unavailable or full — the session still works in memory
    }
  }, [designs, parts, assemblies, calculations]);

  const value = useMemo(
    () => ({
      designs,
      parts,
      assemblies,
      calculations,

      nextDesignId: () => nextDesignId(designs),
      nextPartId: () => nextPartId(parts),
      nextAssemblyId: () => nextAssemblyId(assemblies),
      nextCalculationId: () => nextCalculationId(calculations),

      addDesign: (design) =>
        setDesigns((previous) => [
          normalizeDesign({
            ...design,
            activity: [
              ...(design.activity || []),
              buildDesignActivity(design, 'Design created', 'Record registered in the design register'),
            ],
          }),
          ...previous,
        ]),

      updateDesign: (id, patch, activity) =>
        setDesigns((previous) =>
          previous.map((design) =>
            design.id === id
              ? {
                  ...design,
                  ...patch,
                  updatedAt: new Date().toISOString().slice(0, 10),
                  activity: activity
                    ? [...(design.activity || []), buildDesignActivity(design, activity.label, activity.detail)]
                    : design.activity,
                }
              : design,
          ),
        ),

      duplicateDesign: (id) =>
        setDesigns((previous) => {
          const source = previous.find((design) => design.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextDesignId(previous),
            name: `${source.name} (Copy)`,
            revision: 'A',
            status: 'Draft',
            created: new Date().toISOString().slice(0, 10),
            revisions: [
              {
                revision: 'A',
                date: new Date().toISOString().slice(0, 10),
                by: source.owner,
                note: `Duplicated from ${source.id} Rev ${source.revision}.`,
              },
            ],
            activity: [
              {
                id: `ACT-DUP-${source.id}`,
                label: 'Design duplicated',
                detail: `Copied from ${source.id} Rev ${source.revision}`,
                by: source.owner,
                at: new Date().toISOString().slice(0, 10),
              },
            ],
          };
          return [copy, ...previous];
        }),

      /** Submit the design for validation without approving it. */
      submitDesignForValidation: (id, by = 'Design Admin') =>
        setDesigns((previous) =>
          previous.map((design) =>
            design.id === id
              ? {
                  ...design,
                  status: 'Submitted',
                  updatedAt: new Date().toISOString().slice(0, 10),
                  activity: [
                    ...(design.activity || []),
                    {
                      id: `ACT-SUB-${design.id}-${Date.now()}`,
                      label: 'Submitted for validation',
                      detail: `Rev ${design.revision} submitted for engineering validation and review`,
                      by,
                      at: new Date().toISOString().slice(0, 10),
                    },
                  ],
                }
              : design,
          ),
        ),

      /** Create the next revision; earlier revisions stay in the history. */
      createDesignRevision: (id, { changeDescription = '', preparedBy = '' } = {}) => {
        let createdRevision = '';
        setDesigns((previous) =>
          previous.map((design) => {
            if (design.id !== id) return design;
            const revision = nextRevision(design.revision);
            createdRevision = revision;
            const date = new Date().toISOString().slice(0, 10);
            const by = preparedBy || design.engineer || design.owner || 'Design Admin';
            return {
              ...design,
              revision,
              status: 'In Design',
              updatedAt: date,
              revisions: [
                ...(design.revisions || []),
                {
                  revision,
                  date,
                  by,
                  note: changeDescription || `Revision ${revision} created from Rev ${design.revision}.`,
                },
              ],
              activity: [
                ...(design.activity || []),
                {
                  id: `ACT-REV-${design.id}-${revision}`,
                  label: `Revision ${revision} created`,
                  detail: changeDescription || `New revision from Rev ${design.revision}`,
                  by,
                  at: date,
                },
              ],
            };
          }),
        );
        return createdRevision;
      },

      archiveDesign: (id) =>
        setDesigns((previous) =>
          previous.map((design) =>
            design.id === id
              ? {
                  ...design,
                  status: 'Archived',
                  activity: [
                    ...(design.activity || []),
                    buildDesignActivity(design, 'Archived', 'Record archived from the design register'),
                  ],
                }
              : design,
          ),
        ),

      addPart: (part) => setParts((previous) => [part, ...previous]),
      updatePart: (id, patch) =>
        setParts((previous) =>
          previous.map((part) => (part.id === id ? { ...part, ...patch } : part)),
        ),
      duplicatePart: (id) =>
        setParts((previous) => {
          const source = previous.find((part) => part.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextPartId(previous),
            partNumber: uniquePartNumber(previous, `${source.partNumber}-C`),
            name: `${source.name} (Copy)`,
            revision: 'A',
            status: 'Draft',
            revisions: [
              {
                revision: 'A',
                date: new Date().toISOString().slice(0, 10),
                by: source.owner,
                note: `Duplicated from ${source.id}.`,
              },
            ],
          };
          return [copy, ...previous];
        }),
      archivePart: (id) =>
        setParts((previous) =>
          previous.map((part) => (part.id === id ? { ...part, status: 'Archived' } : part)),
        ),
      assignPartToAssembly: (partId, assemblyId, quantity) =>
        setParts((previous) =>
          previous.map((part) =>
            part.id === partId
              ? {
                  ...part,
                  parentAssemblyId: assemblyId,
                  quantity: quantity === undefined ? part.quantity : quantity,
                }
              : part,
          ),
        ),
      setPartQuantity: (partId, quantity) =>
        setParts((previous) =>
          previous.map((part) =>
            part.id === partId ? { ...part, quantity: Math.max(1, Number(quantity) || 1) } : part,
          ),
        ),

      addAssembly: (assembly) => setAssemblies((previous) => [assembly, ...previous]),
      updateAssembly: (id, patch) =>
        setAssemblies((previous) =>
          previous.map((assembly) => (assembly.id === id ? { ...assembly, ...patch } : assembly)),
        ),
      /** Returns an error string when the parent would create a cycle. */
      setAssemblyParent: (assemblyId, parentId) => {
        if (wouldCreateCycle(assemblies, assemblyId, parentId)) {
          return 'That parent would create a circular assembly relationship.';
        }
        setAssemblies((previous) =>
          previous.map((assembly) =>
            assembly.id === assemblyId ? { ...assembly, parentAssemblyId: parentId } : assembly,
          ),
        );
        return '';
      },
      duplicateAssembly: (id) =>
        setAssemblies((previous) => {
          const source = previous.find((assembly) => assembly.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextAssemblyId(previous),
            number: `${source.number}-C`,
            name: `${source.name} (Copy)`,
            revision: 'A',
            status: 'Draft',
            parentAssemblyId: '',
            revisions: [
              {
                revision: 'A',
                date: new Date().toISOString().slice(0, 10),
                by: source.owner,
                note: `Duplicated from ${source.id}.`,
              },
            ],
          };
          return [copy, ...previous];
        }),
      archiveAssembly: (id) =>
        setAssemblies((previous) =>
          previous.map((assembly) =>
            assembly.id === id ? { ...assembly, status: 'Archived' } : assembly,
          ),
        ),

      addCalculation: (calculation) =>
        setCalculations((previous) => [calculation, ...previous]),
      updateCalculation: (id, patch) =>
        setCalculations((previous) =>
          previous.map((calculation) =>
            calculation.id === id ? { ...calculation, ...patch } : calculation,
          ),
        ),
      duplicateCalculation: (id) =>
        setCalculations((previous) => {
          const source = previous.find((calculation) => calculation.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextCalculationId(previous),
            title: `${source.title} (Copy)`,
            revision: 'A',
            verificationStatus: 'Draft',
            verifiedBy: '',
            verification: [],
            revisions: [
              {
                revision: 'A',
                date: new Date().toISOString().slice(0, 10),
                by: source.preparedBy,
                note: `Duplicated from ${source.id}.`,
              },
            ],
          };
          return [copy, ...previous];
        }),
      archiveCalculation: (id) =>
        setCalculations((previous) =>
          previous.map((calculation) =>
            calculation.id === id
              ? { ...calculation, verificationStatus: 'Superseded' }
              : calculation,
          ),
        ),
      verifyCalculation: (id, decision, comment, by) =>
        setCalculations((previous) =>
          previous.map((calculation) =>
            calculation.id === id
              ? {
                  ...calculation,
                  verificationStatus: decision,
                  verifiedBy: decision === 'Verified' ? by : calculation.verifiedBy,
                  verification: [
                    ...(calculation.verification || []),
                    {
                      date: new Date().toISOString().slice(0, 10),
                      by,
                      decision,
                      comment,
                    },
                  ],
                }
              : calculation,
          ),
        ),
    }),
    [designs, parts, assemblies, calculations],
  );

  return <MechanicalContext.Provider value={value}>{children}</MechanicalContext.Provider>;
}

export function useMechanical() {
  const context = useContext(MechanicalContext);
  if (!context) throw new Error('useMechanical must be used inside a MechanicalProvider');
  return context;
}
