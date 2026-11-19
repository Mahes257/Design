import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ListChecks,
  Plus,
  Scale,
  Save,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  KpiGrid,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import { TODAY, formatDate } from '../../data/projectData';
import {
  DEFAULT_CRITERIA,
  buildComparisonRows,
  conceptIsApproved,
  conceptReviewStatus,
  conceptStatusTone,
  reviewStatusTone,
  weightedScore,
} from '../../data/conceptData';

function blankComparison(projectId) {
  return {
    projectId,
    criteria: DEFAULT_CRITERIA.map((criterion) => ({ ...criterion })),
    scores: {},
    reasons: {},
    selectedConceptId: '',
    summary: '',
    decidedBy: '',
    decidedOn: '',
    status: 'In comparison',
  };
}

/**
 * Concept Selection — configurable weighted comparison of the concepts defined
 * for one project, with live ranking and a recorded selection summary.
 */
export default function ConceptSelectionTab({
  projectId: fixedProjectId = '',
  hideProjectSelector = false,
}) {
  const { concepts, comparisons, saveComparison, updateConcept } = useConcept();
  const { projects } = useProjects();

  const projectWithConcepts = projects.find((project) =>
    concepts.some((concept) => concept.projectId === project.id),
  );
  const initialProjectId = fixedProjectId || projectWithConcepts?.id || projects[0]?.id || '';
  const [internalProjectId, setInternalProjectId] = useState(initialProjectId);
  const projectId = fixedProjectId || internalProjectId;
  const [draft, setDraft] = useState(() => {
    const saved = comparisons.find((row) => row.projectId === initialProjectId);
    return saved
      ? {
          ...saved,
          criteria: saved.criteria.map((criterion) => ({ ...criterion })),
          reasons: saved.reasons || {},
        }
      : blankComparison(projectId);
  });
  const [newCriterion, setNewCriterion] = useState('');
  const [banner, setBanner] = useState(null);

  const projectConcepts = useMemo(
    () => concepts.filter((concept) => concept.projectId === projectId),
    [concepts, projectId],
  );

  useEffect(() => {
    const saved = comparisons.find((row) => row.projectId === projectId);
    setDraft(
      saved
        ? {
            ...saved,
            criteria: saved.criteria.map((criterion) => ({ ...criterion })),
            scores: JSON.parse(JSON.stringify(saved.scores || {})),
            reasons: { ...(saved.reasons || {}) },
          }
        : blankComparison(projectId),
    );
    setBanner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const matrixColumns = useTableColumnVisibility('conceptual.selection#matrix', [
    { key: 'criterion', label: 'Criterion' },
    { key: 'weight', label: 'Weight %' },
    ...projectConcepts.map((concept) => ({ key: `concept-${concept.id}`, label: concept.name })),
  ]);

  const criteria = draft.criteria;
  const totalWeight = criteria.reduce((total, criterion) => total + (Number(criterion.weight) || 0), 0);
  const ranked = useMemo(
    () => buildComparisonRows(criteria, draft.scores, projectConcepts),
    [criteria, draft.scores, projectConcepts],
  );
  const leader = ranked[0];

  const setCriterion = (id, patch) =>
    setDraft((previous) => ({
      ...previous,
      criteria: previous.criteria.map((criterion) =>
        criterion.id === id ? { ...criterion, ...patch } : criterion,
      ),
    }));

  const addCriterion = () => {
    const label = newCriterion.trim();
    if (!label) return;
    setDraft((previous) => ({
      ...previous,
      criteria: [
        ...previous.criteria,
        { id: `c-custom-${Date.now()}`, label, weight: 10 },
      ],
    }));
    setNewCriterion('');
  };

  const removeCriterion = (id) =>
    setDraft((previous) => ({
      ...previous,
      criteria: previous.criteria.filter((criterion) => criterion.id !== id),
    }));

  const setScore = (conceptId, criterionId, value) =>
    setDraft((previous) => ({
      ...previous,
      scores: {
        ...previous.scores,
        [conceptId]: { ...(previous.scores[conceptId] || {}), [criterionId]: value },
      },
    }));

  const selectConcept = (conceptId) => {
    const target = projectConcepts.find((concept) => concept.id === conceptId);
    if (!conceptIsApproved(target)) {
      setBanner({
        tone: 'error',
        message: `${target?.name || conceptId} must be Approved in the concept review before it can be selected.`,
      });
      return;
    }
    setBanner(null);
    setDraft((previous) => ({
      ...previous,
      selectedConceptId: conceptId,
      status: 'Selection recorded',
      decidedOn: TODAY,
    }));
  };

  const save = () => {
    if (draft.selectedConceptId) {
      const selected = projectConcepts.find((concept) => concept.id === draft.selectedConceptId);
      if (!conceptIsApproved(selected)) {
        setBanner({
          tone: 'error',
          message: 'The review must be approved before the concept selection can be saved.',
        });
        return;
      }
    }
    const record = {
      ...draft,
      projectId,
      scores: draft.scores,
      reasons: draft.reasons || {},
      decidedOn: draft.selectedConceptId ? draft.decidedOn || TODAY : draft.decidedOn,
      status: draft.selectedConceptId ? 'Selection recorded' : 'In comparison',
      updatedAt: TODAY,
    };
    saveComparison(record);

    if (record.selectedConceptId) {
      projectConcepts.forEach((concept) => {
        if (concept.id === record.selectedConceptId) {
          updateConcept(concept.id, { status: 'Selected' });
        } else if (concept.status === 'Selected') {
          updateConcept(concept.id, { status: 'Shortlisted' });
        }
      });
    }

    setDraft(record);
    setBanner({
      tone: 'success',
      message: record.selectedConceptId
        ? `Comparison saved. ${projectConcepts.find((c) => c.id === record.selectedConceptId)?.name} is recorded as the selected concept.`
        : 'Comparison saved without a selection.',
    });
  };

  const kpis = [
    {
      key: 'alternatives',
      label: 'Alternatives Compared',
      value: String(projectConcepts.length),
      sub: 'Concepts in this project',
      icon: Scale,
      tone: 'teal',
    },
    {
      key: 'criteria',
      label: 'Comparison Criteria',
      value: String(criteria.length),
      sub: `Total weight ${totalWeight}%`,
      icon: ListChecks,
      tone: 'blue',
    },
    {
      key: 'leader',
      label: 'Highest Weighted Score',
      value: leader ? `${leader.score}` : '—',
      sub: leader ? leader.concept.name : 'No scores entered',
      icon: Trophy,
      tone: 'emerald',
    },
    {
      key: 'selected',
      label: 'Selected Concept',
      value: draft.selectedConceptId ? 'Recorded' : 'None',
      sub: draft.selectedConceptId
        ? `${draft.selectedConceptId} · ${
            projectConcepts.find((concept) => concept.id === draft.selectedConceptId)?.name || ''
          }`
        : 'No concept selected yet',
      icon: Check,
      tone: 'purple',
    },
  ];

  return (
    <>
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </KpiGrid>

      <Card
        title="Concept Comparison Workspace"
        subtitle="Score each concept 0–10 against weighted criteria; the weighted score is calculated live"
        icon={Scale}
        actions={
          <Button icon={Save} size="sm" onClick={save}>
            Save Comparison
          </Button>
        }
      >
        <div className="form-grid cd-selector-row">
          {!hideProjectSelector && (
            <Select
              id="selection-project"
              label="Project"
              options={projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` }))}
              value={projectId}
              onChange={(event) => setInternalProjectId(event.target.value)}
            />
          )}
          <div className="form-field">
            <span className="form-label">Concepts in Comparison</span>
            <span className="form-static">{projectConcepts.length} alternatives</span>
          </div>
          <div className="form-field">
            <span className="form-label">Total Criteria Weight</span>
            <span className={`form-static${totalWeight === 100 ? '' : ' is-warning'}`}>
              {totalWeight}% {totalWeight === 100 ? '' : '· normalised'}
            </span>
          </div>
          <div className="form-field">
            <span className="form-label">Comparison Status</span>
            <span className="form-static">{draft.status || 'In comparison'}</span>
          </div>
        </div>

        {projectConcepts.length < 2 ? (
          <EmptyState
            icon={Scale}
            title="At least two concepts are needed"
            message="Add another concept for this project from New Concept before comparing alternatives."
          />
        ) : (
          <>
            <div className="cd-matrix-wrap">
              <ManageColumns {...matrixColumns.managerProps} />
              <table className="cd-matrix" aria-label="Concept comparison matrix">
                <thead>
                  <tr>
                    {matrixColumns.isVisible('criterion') && (
                      <th scope="col" className="cd-matrix-criterion">
                        Criterion
                      </th>
                    )}
                    {matrixColumns.isVisible('weight') && (
                      <th scope="col" className="cd-matrix-weight">
                        Weight %
                      </th>
                    )}
                    {projectConcepts
                      .filter((concept) => matrixColumns.isVisible(`concept-${concept.id}`))
                      .map((concept) => (
                      <th key={concept.id} scope="col">
                        <span className="cd-matrix-concept">{concept.name}</span>
                        <span className="cd-matrix-concept-meta">
                          {concept.id} · {concept.approach}
                        </span>
                        {draft.selectedConceptId === concept.id && (
                          <StatusBadge status="Selected" tone="green" />
                        )}
                      </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((criterion) => (
                    <tr key={criterion.id}>
                      {matrixColumns.isVisible('criterion') && (
                      <th scope="row" className="cd-matrix-criterion">
                        <input
                          className="form-input cd-criterion-name"
                          value={criterion.label}
                          aria-label={`Criterion name ${criterion.label}`}
                          onChange={(event) =>
                            setCriterion(criterion.id, { label: event.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="cd-criterion-remove"
                          aria-label={`Remove ${criterion.label}`}
                          onClick={() => removeCriterion(criterion.id)}
                        >
                          <X aria-hidden="true" />
                        </button>
                      </th>
                      )}
                      {matrixColumns.isVisible('weight') && (
                      <td className="cd-matrix-weight">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-input cd-weight-input"
                          value={criterion.weight}
                          aria-label={`Weight for ${criterion.label}`}
                          onChange={(event) =>
                            setCriterion(criterion.id, {
                              weight: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                            })
                          }
                        />
                      </td>
                      )}
                      {projectConcepts
                        .filter((concept) => matrixColumns.isVisible(`concept-${concept.id}`))
                        .map((concept) => (
                        <td key={concept.id}>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            className="form-input cd-score-input"
                            value={draft.scores[concept.id]?.[criterion.id] ?? ''}
                            aria-label={`${concept.name} score for ${criterion.label}`}
                            placeholder="0"
                            onChange={(event) =>
                              setScore(
                                concept.id,
                                criterion.id,
                                Math.max(0, Math.min(10, Number(event.target.value) || 0)),
                              )
                            }
                          />
                        </td>
                        ))}
                    </tr>
                  ))}
                  <tr className="cd-matrix-total">
                    {matrixColumns.isVisible('criterion') && (
                      <th scope="row">Weighted score (0–100)</th>
                    )}
                    {matrixColumns.isVisible('weight') && (
                      <td className="cd-matrix-weight">{totalWeight}%</td>
                    )}
                    {projectConcepts
                      .filter((concept) => matrixColumns.isVisible(`concept-${concept.id}`))
                      .map((concept) => (
                        <td key={concept.id}>
                          <strong>{weightedScore(criteria, draft.scores, concept.id)}</strong>
                        </td>
                      ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="cd-criterion-add">
              <Input
                id="selection-new-criterion"
                label="Add a comparison criterion"
                placeholder="e.g. Spare part availability"
                value={newCriterion}
                onChange={(event) => setNewCriterion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCriterion();
                  }
                }}
              />
              <Button variant="secondary" icon={Plus} onClick={addCriterion}>
                Add Criterion
              </Button>
            </div>

            <div className="cd-ranking">
              <h3 className="cd-ranking-title">Ranking</h3>
              <ol className="cd-rank-list">
                {ranked.map((row, index) => (
                  <li key={row.concept.id} className="cd-rank-item">
                    <span className="cd-rank-position">{index + 1}</span>
                    <span className="cd-rank-body">
                      <span className="cd-rank-name">
                        {row.concept.name}
                        <StatusBadge
                          status={row.concept.status}
                          tone={conceptStatusTone(row.concept.status)}
                        />
                        <StatusBadge
                          status={`Review: ${conceptReviewStatus(row.concept)}`}
                          tone={reviewStatusTone(conceptReviewStatus(row.concept))}
                        />
                      </span>
                      <span className="cd-rank-bar">
                        <span style={{ width: `${row.score}%` }} />
                      </span>
                    </span>
                    <span className="cd-rank-score">{row.score}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={draft.selectedConceptId === row.concept.id ? Check : Trophy}
                      className={draft.selectedConceptId === row.concept.id ? 'is-active' : ''}
                      onClick={() => selectConcept(row.concept.id)}
                    >
                      {draft.selectedConceptId === row.concept.id ? 'Selected' : 'Select'}
                    </Button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="cd-justifications">
              <h3 className="cd-ranking-title">Selection Justifications</h3>
              <p className="cd-note">
                Record supporting reasons for each alternative. Scores inform the comparison; they
                never select a concept on their own.
              </p>
              <div className="cd-justification-grid">
                {projectConcepts.map((concept) => (
                  <Textarea
                    key={concept.id}
                    id={`justification-${concept.id}`}
                    label={`${concept.name} · ${concept.id}`}
                    rows={2}
                    placeholder="Supporting reasons, conditions or trade-offs for this alternative"
                    value={draft.reasons?.[concept.id] || ''}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        reasons: { ...(previous.reasons || {}), [concept.id]: event.target.value },
                      }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="cd-selection-summary">
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="selection-summary"
                    label="Comparison Summary"
                    rows={3}
                    placeholder="Why this concept wins, which criteria drove the decision and what conditions apply"
                    value={draft.summary}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, summary: event.target.value }))
                    }
                  />
                </div>
                <Input
                  id="selection-decided-by"
                  label="Decided By"
                  placeholder="Selecting engineer"
                  value={draft.decidedBy}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, decidedBy: event.target.value }))
                  }
                />
                <Input
                  id="selection-decided-on"
                  label="Decision Date"
                  type="date"
                  value={draft.decidedOn || ''}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, decidedOn: event.target.value }))
                  }
                />
              </div>

              <div className="cd-review-actions">
                {banner && (
                  <p className={`cd-save-note${banner.tone === 'error' ? ' is-error' : ''}`}>
                    {banner.message}
                  </p>
                )}
                <div className="cd-review-buttons">
                  <Button
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => {
                      setDraft((previous) => ({
                        ...previous,
                        selectedConceptId: '',
                        status: 'In comparison',
                        decidedOn: '',
                      }));
                      setBanner({ tone: 'success', message: 'Selection cleared in this draft.' });
                    }}
                  >
                    Clear Selection
                  </Button>
                  <Button icon={Save} onClick={save}>
                    Save Comparison
                  </Button>
                </div>
              </div>
            </div>

            <p className="cd-note">
              Selecting a concept records the preferred direction only. It does not approve
              engineering, release drawings or authorise production.
              {leader && draft.selectedConceptId === leader.concept.id
                ? ' The current selection also has the highest weighted score.'
                : ''}
              {leader &&
              draft.selectedConceptId &&
              draft.selectedConceptId !== leader.concept.id
                ? ' The recorded selection is not the highest weighted score — state the justification in the comparison summary.'
                : ''}
            </p>
          </>
        )}
      </Card>
    </>
  );
}
