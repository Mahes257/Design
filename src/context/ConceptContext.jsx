import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  COMPARISONS,
  CONCEPTS,
  DEFAULT_CRITERIA,
  FEASIBILITY_STUDIES,
  LAYOUT_FILES,
  PROPOSALS,
  TODAY,
  nextId,
  normalizeConceptRecord,
} from '../data/conceptData';
import { PROJECTS } from '../data/projectData';

/**
 * Conceptual Design state (Module 05).
 *
 * Concepts, comparison matrices, feasibility/review studies and the retained
 * sketch records live above the seven sections so a concept created on the
 * full-page form is immediately available to requirements, alternatives,
 * comparison, review and history. Mirrored into localStorage
 * (`md-concept-state-v1`); frontend only.
 */
const ConceptContext = createContext(null);

const STORAGE_KEY = 'md-concept-state-v1';

/** Fill the project-linked fields used by the seven concept sections. */
function normalizeConcept(concept) {
  const project = PROJECTS.find((row) => row.id === concept.projectId);
  const revision = concept.revision || 'A';
  const revisions =
    Array.isArray(concept.revisions) && concept.revisions.length
      ? concept.revisions
      : [
          {
            revision,
            date: concept.createdAt || TODAY,
            by: concept.createdBy || 'System',
            note: 'Initial concept record',
          },
        ];

  return normalizeConceptRecord({
    ...concept,
    productCategory: concept.productCategory || project?.product || project?.domain || 'Mechanical product',
    customerRequirements: concept.customerRequirements || concept.description || '',
    designObjectives: concept.designObjectives || concept.advantages || '',
    preliminarySpecifications: concept.preliminarySpecifications || concept.technicalNotes || '',
    materialSelection: concept.materialSelection || '',
    reviewerComments: concept.reviewerComments || '',
    attachments: Array.isArray(concept.attachments) ? concept.attachments : [],
    revision,
    revisions,
  });
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.concepts) || parsed.concepts.length === 0) return null;

    return {
      concepts: parsed.concepts.map(normalizeConcept),
      layoutFiles: Array.isArray(parsed.layoutFiles) ? parsed.layoutFiles : LAYOUT_FILES,
      studies: Array.isArray(parsed.studies) ? parsed.studies : FEASIBILITY_STUDIES,
      comparisons: Array.isArray(parsed.comparisons) ? parsed.comparisons : COMPARISONS,
      proposals: Array.isArray(parsed.proposals) ? parsed.proposals : PROPOSALS,
    };
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

export function ConceptProvider({ children }) {
  const [concepts, setConcepts] = useState(
    () => persistedState?.concepts || CONCEPTS.map(normalizeConcept),
  );
  const [layoutFiles, setLayoutFiles] = useState(() => persistedState?.layoutFiles || LAYOUT_FILES);
  const [studies, setStudies] = useState(() => persistedState?.studies || FEASIBILITY_STUDIES);
  const [comparisons, setComparisons] = useState(
    () => persistedState?.comparisons || COMPARISONS,
  );
  const [proposals, setProposals] = useState(() => persistedState?.proposals || PROPOSALS);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ concepts, layoutFiles, studies, comparisons, proposals }),
      );
    } catch {
      // storage unavailable or full — the session still works in memory
    }
  }, [concepts, layoutFiles, studies, comparisons, proposals]);

  const value = useMemo(
    () => ({
      concepts,
      layoutFiles,
      studies,
      comparisons,
      proposals,
      nextConceptId: () => nextId(concepts, 'CON-2026'),
      nextLayoutFileId: () => nextId(layoutFiles, 'LAY-2026'),
      nextStudyId: () => nextId(studies, 'FSB-2026'),
      nextProposalId: () => nextId(proposals, 'PROP-2026'),

      addConcept: (concept) =>
        setConcepts((previous) => [normalizeConcept(concept), ...previous]),
      updateConcept: (id, patch) =>
        setConcepts((previous) =>
          previous.map((concept) => (concept.id === id ? { ...concept, ...patch } : concept)),
        ),
      removeConcept: (id) =>
        setConcepts((previous) => previous.filter((concept) => concept.id !== id)),

      addLayoutFile: (file) => setLayoutFiles((previous) => [file, ...previous]),
      removeLayoutFile: (id) =>
        setLayoutFiles((previous) => previous.filter((file) => file.id !== id)),

      saveStudy: (study) =>
        setStudies((previous) => {
          const exists = previous.some((row) => row.id === study.id && study.id);
          if (exists) {
            return previous.map((row) => (row.id === study.id ? { ...row, ...study } : row));
          }
          return [{ ...study }, ...previous];
        }),

      saveComparison: (comparison) =>
        setComparisons((previous) => {
          const exists = previous.some((row) => row.projectId === comparison.projectId);
          if (exists) {
            return previous.map((row) =>
              row.projectId === comparison.projectId ? { ...row, ...comparison } : row,
            );
          }
          return [
            {
              id: `CMP-2026-${String(previous.length + 1).padStart(3, '0')}`,
              criteria: DEFAULT_CRITERIA,
              scores: {},
              selectedConceptId: '',
              summary: '',
              decidedBy: '',
              decidedOn: '',
              status: 'In comparison',
              ...comparison,
            },
            ...previous,
          ];
        }),

      addProposal: (proposal) => setProposals((previous) => [proposal, ...previous]),
      updateProposal: (id, patch) =>
        setProposals((previous) =>
          previous.map((proposal) =>
            proposal.id === id ? { ...proposal, ...patch } : proposal,
          ),
        ),
    }),
    [concepts, layoutFiles, studies, comparisons, proposals],
  );

  return <ConceptContext.Provider value={value}>{children}</ConceptContext.Provider>;
}

export function useConcept() {
  const context = useContext(ConceptContext);
  if (!context) throw new Error('useConcept must be used inside a ConceptProvider');
  return context;
}
