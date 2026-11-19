import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FlaskConical,
  Save,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  KpiGrid,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
} from '../../components/common';
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import { TODAY, formatDate } from '../../data/projectData';
import {
  FEASIBILITY_AREAS,
  FEASIBILITY_RATINGS,
  FEASIBILITY_STATUSES,
  defaultStudy,
  feasibilityRatingTone,
  feasibilityStatusTone,
} from '../../data/conceptData';

const AREA_ICONS = {
  technical: FlaskConical,
  operational: ClipboardCheck,
  material: CheckCircle2,
  cost: CircleAlert,
};

/**
 * Concept review and feasibility — technical, operational, material and cost
 * assessment per concept, plus risks, constraints, assumptions and reviewer
 * comments. Stored in the concept workspace so selection can rely on it.
 */
export default function FeasibilityStudyTab({
  projectId: fixedProjectId = '',
  conceptId: fixedConceptId = '',
  hideSelectors = false,
}) {
  const { concepts, studies, saveStudy, nextStudyId } = useConcept();
  const { projects } = useProjects();

  const initialProject =
    fixedProjectId ||
    projects.find((project) => concepts.some((concept) => concept.projectId === project.id))?.id ||
    projects[0]?.id ||
    '';

  const [internalProjectId, setInternalProjectId] = useState(initialProject);
  const projectId = fixedProjectId || internalProjectId;
  const [internalConceptId, setInternalConceptId] = useState(
    () =>
      fixedConceptId ||
      concepts.find((concept) => concept.projectId === initialProject)?.id ||
      '',
  );
  const conceptId = fixedConceptId || internalConceptId;
  const [banner, setBanner] = useState(null);

  const projectConcepts = useMemo(
    () => concepts.filter((concept) => concept.projectId === projectId),
    [concepts, projectId],
  );

  const savedStudy = useMemo(
    () => studies.find((study) => study.conceptId === conceptId) || null,
    [studies, conceptId],
  );

  const [draft, setDraft] = useState(() => savedStudy || defaultStudy(projectId, conceptId));

  // Reload the editor whenever the selected concept changes.
  useEffect(() => {
    const study = studies.find((row) => row.conceptId === conceptId);
    setDraft(study || defaultStudy(projectId, conceptId));
    setBanner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptId, projectId]);

  const concept = concepts.find((row) => row.id === conceptId);
  const project = projects.find((row) => row.id === projectId);

  const setArea = (key, patch) =>
    setDraft((previous) => ({
      ...previous,
      areas: { ...previous.areas, [key]: { ...previous.areas[key], ...patch } },
    }));

  const save = () => {
    if (!conceptId) {
      setBanner({ tone: 'error', message: 'Select a concept before saving the feasibility study.' });
      return;
    }
    const record = {
      ...draft,
      id: draft.id || nextStudyId(),
      projectId,
      conceptId,
      updatedAt: TODAY,
    };
    saveStudy(record);
    setDraft(record);
    setBanner({
      tone: 'success',
      message: `Feasibility study ${record.id} saved for ${concept?.name || conceptId}.`,
    });
  };

  const reset = () => {
    setDraft(savedStudy || defaultStudy(projectId, conceptId));
    setBanner(null);
  };

  const counts = {
    total: studies.length,
    feasible: studies.filter((study) => study.status === 'Feasible').length,
    conditional: studies.filter((study) => study.status === 'Conditionally Feasible').length,
    study: studies.filter((study) => ['Under Study', 'Pending'].includes(study.status)).length,
  };

  const kpis = [
    {
      key: 'total',
      label: 'Feasibility Studies',
      value: String(counts.total),
      sub: 'Concepts assessed for feasibility',
      icon: FlaskConical,
      tone: 'teal',
    },
    {
      key: 'feasible',
      label: 'Feasible',
      value: String(counts.feasible),
      sub: 'Cleared for concept selection',
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      key: 'conditional',
      label: 'Conditionally Feasible',
      value: String(counts.conditional),
      sub: 'Open conditions to be closed',
      icon: ShieldAlert,
      tone: 'orange',
    },
    {
      key: 'open',
      label: 'Under Study',
      value: String(counts.study),
      sub: 'Pending or still being assessed',
      icon: TriangleAlert,
      tone: 'purple',
    },
  ];

  const studyRows = studies.map((study) => ({
    ...study,
    projectName: projects.find((row) => row.id === study.projectId)?.name || 'Unassigned',
    conceptName: concepts.find((row) => row.id === study.conceptId)?.name || study.conceptId,
  }));

  const studyColumns = [
    {
      key: 'id',
      label: 'Study ID',
      width: 110,
      render: (row) => <span className="cell-id">{row.id}</span>,
    },
    {
      key: 'projectName',
      label: 'Project',
      width: 190,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    {
      key: 'conceptName',
      label: 'Concept',
      width: 210,
      render: (row) => <span className="cell-strong cell-clamp">{row.conceptName}</span>,
    },
    {
      key: 'status',
      label: 'Feasibility Status',
      width: 160,
      render: (row) => (
        <StatusBadge status={row.status} tone={feasibilityStatusTone(row.status)} />
      ),
    },
    { key: 'reviewer', label: 'Reviewer', width: 130 },
    {
      key: 'reviewedOn',
      label: 'Reviewed On',
      width: 118,
      render: (row) => <span className="cell-muted">{formatDate(row.reviewedOn)}</span>,
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
        title="Review & Feasibility Workspace"
        subtitle="Assess one concept at a time; ratings and reviewer comments are stored with the review"
        icon={FlaskConical}
        actions={
          concept && (
            <>
              <span className="chip">{concept.id}</span>
              <StatusBadge status={draft.status} tone={feasibilityStatusTone(draft.status)} />
            </>
          )
        }
      >
        <div className="form-grid cd-selector-row">
          {hideSelectors ? (
            <div className="form-field">
              <span className="form-label">Project</span>
              <span className="form-static">{projectId || 'Not selected'}</span>
            </div>
          ) : (
            <Select
              id="feasibility-project"
              label="Project"
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
              ]}
              value={projectId}
              onChange={(event) => {
                const nextProject = event.target.value;
                setInternalProjectId(nextProject);
                setInternalConceptId(
                  concepts.find((row) => row.projectId === nextProject)?.id || '',
                );
              }}
            />
          )}
          {hideSelectors ? (
            <div className="form-field">
              <span className="form-label">Concept</span>
              <span className="form-static">{concept ? `${concept.id} · ${concept.name}` : 'Not selected'}</span>
            </div>
          ) : (
            <Select
              id="feasibility-concept"
              label="Concept"
              options={[
                { value: '', label: projectConcepts.length ? 'Select a concept' : 'No concepts yet' },
                ...projectConcepts.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
              ]}
              value={conceptId}
              onChange={(event) => setInternalConceptId(event.target.value)}
            />
          )}
          <div className="form-field">
            <span className="form-label">Customer</span>
            <span className="form-static">{project?.customer || 'Not selected'}</span>
          </div>
          <div className="form-field">
            <span className="form-label">Study Reference</span>
            <span className="form-static">{draft.id || 'New study'}</span>
          </div>
        </div>

        {!conceptId ? (
          <EmptyState
            icon={FlaskConical}
            title="No concept selected"
            message="Create a concept from New Concept for this project, then return to assess and review it."
          />
        ) : (
          <>
            <div className="cd-aspect-grid">
              {FEASIBILITY_AREAS.map((area) => {
                const Icon = AREA_ICONS[area.key] || FlaskConical;
                const value = draft.areas[area.key] || { rating: 'Not assessed', notes: '' };
                return (
                  <section className="cd-aspect-card" key={area.key}>
                    <header className="cd-aspect-head">
                      <span className="cd-aspect-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="cd-aspect-title">
                        <strong>{area.label}</strong>
                        <span>{area.hint}</span>
                      </span>
                    </header>
                    <div className="cd-aspect-body">
                      <div className="cd-aspect-rating">
                        <Select
                          id={`feasibility-${area.key}-rating`}
                          label="Assessment"
                          options={FEASIBILITY_RATINGS.map((rating) => ({
                            value: rating,
                            label: rating,
                          }))}
                          value={value.rating}
                          onChange={(event) => setArea(area.key, { rating: event.target.value })}
                        />
                        <StatusBadge
                          status={value.rating}
                          tone={feasibilityRatingTone(value.rating)}
                        />
                      </div>
                      <Textarea
                        id={`feasibility-${area.key}-notes`}
                        label="Assessment Notes"
                        rows={3}
                        placeholder="Findings, numbers and the reason for the rating"
                        value={value.notes}
                        onChange={(event) => setArea(area.key, { notes: event.target.value })}
                      />
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="cd-triple">
              <Textarea
                id="feasibility-risks"
                label="Risks"
                rows={3}
                placeholder="Technical, supply, cost and schedule risks"
                value={draft.risks}
                onChange={(event) => setDraft((previous) => ({ ...previous, risks: event.target.value }))}
              />
              <Textarea
                id="feasibility-constraints"
                label="Constraints"
                rows={3}
                placeholder="Envelope, codes, vendor capability, interfaces"
                value={draft.constraints}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, constraints: event.target.value }))
                }
              />
              <Textarea
                id="feasibility-assumptions"
                label="Assumptions"
                rows={3}
                placeholder="What must stay true for this study to hold"
                value={draft.assumptions}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, assumptions: event.target.value }))
                }
              />
            </div>

            <div className="cd-review">
              <div className="form-grid">
                <Select
                  id="feasibility-status"
                  label="Feasibility Status"
                  options={FEASIBILITY_STATUSES.map((status) => ({ value: status, label: status }))}
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, status: event.target.value }))
                  }
                />
                <Input
                  id="feasibility-reviewer"
                  label="Reviewer"
                  placeholder="Reviewing engineer"
                  value={draft.reviewer}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, reviewer: event.target.value }))
                  }
                />
                <Input
                  id="feasibility-reviewed-on"
                  label="Review Date"
                  type="date"
                  value={draft.reviewedOn || ''}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, reviewedOn: event.target.value }))
                  }
                />
                <div className="form-field">
                  <span className="form-label">Last Updated</span>
                  <span className="form-static">
                    {draft.updatedAt ? formatDate(draft.updatedAt) : 'Not saved yet'}
                  </span>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-grid-full">
                  <Textarea
                    id="feasibility-comments"
                    label="Review Comments"
                    rows={3}
                    placeholder="Decision, conditions to close and what happens next"
                    value={draft.reviewComments}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, reviewComments: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="cd-review-actions">
                {banner && (
                  <p className={`cd-save-note${banner.tone === 'error' ? ' is-error' : ''}`}>
                    {banner.message}
                  </p>
                )}
                <div className="cd-review-buttons">
                  <Button variant="ghost" onClick={reset}>
                    Reset Changes
                  </Button>
                  <Button icon={Save} onClick={save}>
                    Save Concept Review
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card
        title="Review & Feasibility Register"
        subtitle="Every concept review recorded in this workspace"
        icon={ClipboardCheck}
      >
        <DataTable
          columns={studyColumns}
          rows={studyRows}
          ariaLabel="Feasibility register"
          emptyContent={
            <EmptyState
              icon={FlaskConical}
              title="No studies yet"
              message="Save a feasibility study to see it listed here."
            />
          }
        />
      </Card>
    </>
  );
}
