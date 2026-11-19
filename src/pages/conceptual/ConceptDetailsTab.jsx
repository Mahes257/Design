import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Cog,
  FileText,
  GitBranch,
  Lightbulb,
  Paperclip,
  Pencil,
  Plus,
  Shapes,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  Select,
  StatusBadge,
} from '../../components/common';
import { useConcept } from '../../context/ConceptContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  conceptIsApproved,
  conceptReviewStatus,
  conceptSelectionStatus,
  conceptStatusTone,
  formatDate,
  reviewStatusTone,
} from '../../data/conceptData';
import ConceptReviewPanel from './ConceptReviewPanel';
import ConceptSelectionTab from './ConceptSelectionTab';
import FeasibilityStudyTab from './FeasibilityStudyTab';

function DetailRow({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || 'Not captured'}</dd>
    </div>
  );
}

/**
 * Concept Details — one project-linked workspace for information, requirements,
 * alternatives, comparison, attachments, revisions, review and selection.
 */
export default function ConceptDetailsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { concepts, comparisons, studies, layoutFiles } = useConcept();
  const { projects } = useProjects();

  const requestedConceptId = searchParams.get('concept') || '';
  const requestedProjectId = searchParams.get('project') || '';

  const initialProjectId =
    concepts.find((concept) => concept.id === requestedConceptId)?.projectId ||
    requestedProjectId ||
    projects.find((project) => concepts.some((concept) => concept.projectId === project.id))?.id ||
    projects[0]?.id ||
    '';

  const [projectId, setProjectId] = useState(initialProjectId);
  const [conceptId, setConceptId] = useState(
    () =>
      concepts.find((concept) => concept.id === requestedConceptId)?.id ||
      concepts.find((concept) => concept.projectId === initialProjectId)?.id ||
      '',
  );

  // The register opens this section with ?concept=CON-…. Keep the selector in
  // step when navigation reuses the page.
  useEffect(() => {
    const requested = concepts.find((concept) => concept.id === requestedConceptId);
    if (!requested) return;
    setConceptId((previous) => (previous === requested.id ? previous : requested.id));
    setProjectId((previous) =>
      previous === requested.projectId ? previous : requested.projectId,
    );
  }, [concepts, requestedConceptId]);

  // Register actions open this workspace at the comparison or selection section.
  useEffect(() => {
    const view = searchParams.get('view');
    if (!view) return undefined;
    const targetId = view === 'review' ? 'concept-review' : 'concept-comparison';
    const timer = setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchParams, conceptId]);

  const project = projects.find((row) => row.id === projectId);
  const projectConcepts = useMemo(
    () => concepts.filter((concept) => concept.projectId === projectId),
    [concepts, projectId],
  );
  const concept = concepts.find((row) => row.id === conceptId) || null;
  const comparison = comparisons.find((row) => row.projectId === projectId);
  const selectedConcept =
    concepts.find((row) => row.id === comparison?.selectedConceptId) || null;
  const study = concept
    ? studies.find((row) => row.conceptId === concept.id) || null
    : null;
  const conceptSketches = concept
    ? layoutFiles.filter((file) => file.conceptId === concept.id)
    : [];
  const alternatives = projectConcepts.filter((row) => row.id !== conceptId);

  const openConcept = (id) => {
    const next = concepts.find((row) => row.id === id);
    if (!next) return;
    setConceptId(next.id);
    setProjectId(next.projectId);
    setSearchParams({ concept: next.id }, { replace: true });
  };

  const changeProject = (nextProjectId) => {
    const firstConcept = concepts.find((row) => row.projectId === nextProjectId);
    setProjectId(nextProjectId);
    setConceptId(firstConcept?.id || '');
    if (firstConcept) {
      setSearchParams({ concept: firstConcept.id }, { replace: true });
    } else {
      setSearchParams({ project: nextProjectId }, { replace: true });
    }
  };

  const changeConcept = (nextConceptId) => {
    if (!nextConceptId) {
      setConceptId('');
      setSearchParams({ project: projectId }, { replace: true });
      return;
    }
    openConcept(nextConceptId);
  };

  const mechanicalLink = selectedConcept
    ? `/mechanical-design/design-register/new?projectId=${encodeURIComponent(
        selectedConcept.projectId,
      )}&conceptId=${encodeURIComponent(selectedConcept.id)}`
    : '';

  return (
    <>
      <Card
        title="Concept Workspace"
        subtitle="Choose a project and concept; every record below stays linked to this project reference"
        icon={Lightbulb}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/conceptual-design/concept-creation')}
          >
            New Concept
          </Button>
        }
      >
        <div className="form-grid">
          <Select
            id="details-project"
            label="Project Reference"
            options={[
              { value: '', label: 'Select a project' },
              ...projects.map((row) => ({ value: row.id, label: `${row.id} · ${row.name}` })),
            ]}
            value={projectId}
            onChange={(event) => changeProject(event.target.value)}
          />
          <Select
            id="details-concept"
            label="Concept"
            options={[
              { value: '', label: projectConcepts.length ? 'Select a concept' : 'No concepts yet' },
              ...projectConcepts.map((row) => ({
                value: row.id,
                label: `${row.id} · ${row.name}`,
              })),
            ]}
            value={conceptId}
            onChange={(event) => changeConcept(event.target.value)}
          />
          <div className="form-field">
            <span className="form-label">Customer</span>
            <span className="form-static">{project?.customer || 'Not selected'}</span>
          </div>
          <div className="form-field">
            <span className="form-label">Selected Concept</span>
            <span className="form-static">
              {selectedConcept ? `${selectedConcept.id} · ${selectedConcept.name}` : 'Not selected'}
            </span>
          </div>
        </div>
      </Card>

      {!concept ? (
        <EmptyState
          icon={Lightbulb}
          title={projectConcepts.length ? 'Select a Concept' : 'No Concepts for This Project'}
          message={
            projectConcepts.length
              ? 'Choose a concept to open its requirements, specifications, alternatives, comparison and review records.'
              : 'Create the first concept for this project, then add further alternatives for comparison.'
          }
          action={
            <Button
              icon={Plus}
              onClick={() =>
                navigate(
                  `/conceptual-design/concept-creation${
                    projectId ? `?project=${encodeURIComponent(projectId)}` : ''
                  }`,
                )
              }
            >
              New Concept
            </Button>
          }
        />
      ) : (
        <>
          <Card
            title="Concept Information"
            subtitle={`${concept.name} · ${concept.id}`}
            icon={Lightbulb}
            actions={
              <>
                <StatusBadge
                  status={concept.status}
                  tone={conceptStatusTone(concept.status)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Pencil}
                  onClick={() =>
                    navigate(`/conceptual-design/concept-creation/${concept.id}/edit`)
                  }
                >
                  Edit Concept
                </Button>
              </>
            }
          >
            <div className="fact-grid">
              <div className="fact">
                <span className="fact-label">Concept ID</span>
                <span className="fact-value">{concept.id}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Project Reference</span>
                <span className="fact-value">
                  {project?.id || concept.projectId} · {project?.name || 'Project'}
                </span>
              </div>
              <div className="fact">
                <span className="fact-label">Product / Machine Category</span>
                <span className="fact-value">{concept.productCategory}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Design Approach</span>
                <span className="fact-value">{concept.approach}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Revision</span>
                <span className="fact-value">Rev {concept.revision}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Created By / On</span>
                <span className="fact-value">
                  {concept.createdBy} · {formatDate(concept.createdAt)}
                </span>
              </div>
              <div className="fact">
                <span className="fact-label">Design Plan ID</span>
                <span className="fact-value">{concept.designPlanId || 'Not linked'}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Concept Owner</span>
                <span className="fact-value">{concept.owner || concept.createdBy}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Source Request</span>
                <span className="fact-value">{project?.sourceRequestId || 'Manual project'}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Customer / Department</span>
                <span className="fact-value">
                  {project?.customer || project?.department || 'Not captured'}
                </span>
              </div>
              <div className="fact">
                <span className="fact-label">Review Status</span>
                <span className="fact-value">
                  <StatusBadge
                    status={conceptReviewStatus(concept)}
                    tone={reviewStatusTone(conceptReviewStatus(concept))}
                  />
                </span>
              </div>
              <div className="fact">
                <span className="fact-label">Selection Status</span>
                <span className="fact-value">
                  {conceptSelectionStatus(concept, comparison)}
                </span>
              </div>
              <div className="fact">
                <span className="fact-label">Feasibility Outcome</span>
                <span className="fact-value">{study?.status || 'Not reviewed'}</span>
              </div>
              <div className="fact">
                <span className="fact-label">Attachments</span>
                <span className="fact-value">
                  {concept.attachments.length + conceptSketches.length} files
                </span>
              </div>
            </div>
            <p className="dash-note">{concept.description || 'No description captured.'}</p>
          </Card>

          <div className="dash-grid-2">
            <Card
              title="Design Requirements"
              subtitle="Customer requirements and design objectives for this concept"
              icon={ClipboardList}
            >
              <dl className="detail-list detail-compact">
                <DetailRow label="Customer Requirements">
                  {concept.customerRequirements}
                </DetailRow>
                <DetailRow label="Design Objectives">{concept.designObjectives}</DetailRow>
                <DetailRow label="Functional Requirements">
                  {concept.functionalRequirements}
                </DetailRow>
                <DetailRow label="Operating Conditions">
                  {concept.operatingConditions}
                </DetailRow>
                <DetailRow label="Description">{concept.description}</DetailRow>
              </dl>
            </Card>

            <Card
              title="Specifications & Materials"
              subtitle="Preliminary technical direction and evaluation notes"
              icon={FileText}
            >
              <dl className="detail-list detail-compact">
                <DetailRow label="Preliminary Specifications">
                  {concept.preliminarySpecifications}
                </DetailRow>
                <DetailRow label="Preliminary Material Selection">
                  {concept.materialSelection}
                </DetailRow>
                <DetailRow label="Material Options">{concept.materialOptions}</DetailRow>
                <DetailRow label="Design Constraints">{concept.designConstraints}</DetailRow>
                <DetailRow label="Size & Space Constraints">
                  {concept.sizeConstraints}
                </DetailRow>
                <DetailRow label="Expected Performance">
                  {concept.expectedPerformance}
                </DetailRow>
                <DetailRow label="Estimated Complexity">{concept.complexity}</DetailRow>
                <DetailRow label="Technical Assumptions">
                  {concept.technicalAssumptions}
                </DetailRow>
                <DetailRow label="Risks">{concept.risks}</DetailRow>
                <DetailRow label="Remarks">{concept.remarks}</DetailRow>
                <DetailRow label="Advantages">{concept.advantages}</DetailRow>
                <DetailRow label="Limitations">{concept.limitations}</DetailRow>
                <DetailRow label="Technical Feasibility Notes">
                  {concept.technicalNotes}
                </DetailRow>
              </dl>
            </Card>
          </div>

          <Card
            title="Alternative Concepts"
            subtitle={`${alternatives.length} other alternative${
              alternatives.length === 1 ? '' : 's'
            } for ${project?.name || concept.projectId}`}
            icon={Shapes}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                onClick={() =>
                  navigate(
                    `/conceptual-design/concept-creation?project=${encodeURIComponent(
                      concept.projectId,
                    )}`,
                  )
                }
              >
                Add Alternative
              </Button>
            }
          >
            {alternatives.length === 0 ? (
              <p className="dash-note">
                No alternative concepts exist for this project yet. Add another concept from New
                Concept to compare directions.
              </p>
            ) : (
              <div className="concept-detail-alt-list">
                {alternatives.map((alternative) => (
                  <button
                    type="button"
                    className="concept-detail-alt"
                    key={alternative.id}
                    onClick={() => openConcept(alternative.id)}
                  >
                    <span className="concept-detail-alt-head">
                      <span>
                        <strong>{alternative.name}</strong>
                        <span className="concept-detail-alt-meta">
                          Alternative {alternative.id} · {alternative.approach} · Rev{' '}
                          {alternative.revision} · {alternative.productCategory}
                        </span>
                      </span>
                      <StatusBadge
                        status={alternative.status}
                        tone={conceptStatusTone(alternative.status)}
                      />
                    </span>
                    <span className="concept-detail-alt-copy">
                      {alternative.description || 'No description captured.'}
                    </span>
                    <span className="concept-detail-alt-copy">
                      Specifications: {alternative.preliminarySpecifications || 'Not captured.'} ·
                      Material: {alternative.materialSelection || 'Not captured.'}
                    </span>
                    <span className="concept-detail-alt-copy">
                      Advantages: {alternative.advantages || 'None captured.'}
                    </span>
                    <span className="concept-detail-alt-copy is-limitation">
                      Disadvantages: {alternative.limitations || 'None captured.'}
                    </span>
                    <span className="concept-detail-alt-copy is-limitation">
                      Risks: {alternative.risks || 'None captured.'}
                    </span>
                    <span className="concept-detail-alt-link">
                      Open details <ArrowRight aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div id="concept-review">
            <ConceptReviewPanel concept={concept} />
          </div>

          <div id="concept-comparison">
            <ConceptSelectionTab projectId={projectId} hideProjectSelector />
          </div>

          <div className="dash-grid-2">
            <Card
              title="Sketches & Attachments"
              subtitle="Concept attachments and reference sketches"
              icon={Paperclip}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Pencil}
                  onClick={() =>
                    navigate(`/conceptual-design/concept-creation/${concept.id}/edit`)
                  }
                >
                  Manage
                </Button>
              }
            >
              {concept.attachments.length === 0 && conceptSketches.length === 0 ? (
                <p className="dash-note">No sketches or attachments recorded for this concept.</p>
              ) : (
                <ul className="concept-detail-file-list">
                  {concept.attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <Paperclip aria-hidden="true" />
                      <span>
                        <strong>{file.name}</strong>
                        <span>
                          Concept attachment
                          {file.size ? ` · ${Math.max(1, Math.round(file.size / 1024))} KB` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                  {conceptSketches.map((file) => (
                    <li key={file.id}>
                      <FileText aria-hidden="true" />
                      <span>
                        <strong>{file.name}</strong>
                        <span>
                          {file.version} · {file.category} · {formatDate(file.uploadedAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="Revision History"
              subtitle="Recorded changes to this concept"
              icon={GitBranch}
            >
              {concept.revisions.length === 0 ? (
                <p className="dash-note">No revisions recorded.</p>
              ) : (
                <ol className="concept-revision-list">
                  {[...concept.revisions].reverse().map((revision) => (
                    <li key={`${revision.revision}-${revision.date}`}>
                      <span className="concept-revision-dot" aria-hidden="true" />
                      <span>
                        <strong>Rev {revision.revision}</strong>
                        <span>
                          {formatDate(revision.date)} · {revision.by}
                        </span>
                        <span>{revision.note}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="concept-review-divider">
            <ClipboardCheck aria-hidden="true" />
            Reviewer comments, approval and selection
          </div>

          <FeasibilityStudyTab
            projectId={projectId}
            conceptId={concept.id}
            hideSelectors
          />

          <Card
            title="Selected Concept & Mechanical Engineering Design"
            subtitle="The approved concept carried into detailed mechanical engineering design"
            icon={Cog}
            actions={
              selectedConcept && (
                <Button
                  size="sm"
                  icon={Cog}
                  onClick={() => navigate(mechanicalLink)}
                >
                  Start Mechanical Design
                </Button>
              )
            }
          >
            {!selectedConcept ? (
              <p className="dash-note">
                No concept has been selected for this project. Record a comparison decision above
                to link an approved concept to Mechanical Engineering Design.
              </p>
            ) : (
              <div className="concept-detail-selected">
                <div className="fact-grid">
                  <div className="fact">
                    <span className="fact-label">Selected Concept</span>
                    <span className="fact-value">
                      {selectedConcept.id} · {selectedConcept.name}
                    </span>
                  </div>
                  <div className="fact">
                    <span className="fact-label">Project Reference</span>
                    <span className="fact-value">{selectedConcept.projectId}</span>
                  </div>
                  <div className="fact">
                    <span className="fact-label">Selection Status</span>
                    <span className="fact-value">
                      {comparison?.status || 'Selection recorded'}
                    </span>
                  </div>
                  <div className="fact">
                    <span className="fact-label">Reviewed By</span>
                    <span className="fact-value">
                      {study?.reviewer || comparison?.decidedBy || 'Not recorded'}
                    </span>
                  </div>
                  <div className="fact">
                    <span className="fact-label">Review Outcome</span>
                    <span className="fact-value">{study?.status || 'Not reviewed'}</span>
                  </div>
                  <div className="fact">
                    <span className="fact-label">Revision</span>
                    <span className="fact-value">Rev {selectedConcept.revision}</span>
                  </div>
                </div>
                <div className="concept-detail-selected-footer">
                  <span>
                    <CheckCircle2 aria-hidden="true" />
                    {selectedConcept.id === concept.id
                      ? 'This concept is the current selection.'
                      : `This project is currently linked to ${selectedConcept.id}.`}
                  </span>
                  <Button
                    variant="secondary"
                    icon={Cog}
                    onClick={() => navigate(mechanicalLink)}
                  >
                    Open in Mechanical Engineering Design
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
