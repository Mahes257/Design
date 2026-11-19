import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CHANGES,
  ECOS,
  ENGINEERING_RELEASES,
  HANDOVER_STATUSES,
  TODAY,
  buildSeedEcos,
  changeStats,
  nextChangeId,
  nextEcoId,
  nextReleaseId,
  nextRevision,
  normalizeChange,
  normalizeEco,
  releaseEligibility,
} from '../data/engineeringReleaseData';
import { useBom } from './BomContext';
import { useCad } from './CadContext';
import { useManufacturing } from './ManufacturingContext';
import { useMechanical } from './MechanicalContext';

/**
 * Engineering Change & Release state (Module 12).
 *
 * ECRs and ECOs are separate controlled records. Revision changes are created
 * through the owning module contexts (BOM, drawing, manufacturing, design) so
 * released records are preserved rather than overwritten.
 */
const EngineeringReleaseContext = createContext(null);
const STORAGE_KEY = 'md-engineering-release-state-v1';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.changes) || !Array.isArray(parsed?.releases)) return null;
    const changes = parsed.changes.map(normalizeChange);
    return {
      changes,
      ecos: Array.isArray(parsed.ecos) ? parsed.ecos.map(normalizeEco) : buildSeedEcos(changes),
      releases: parsed.releases,
    };
  } catch {
    return null;
  }
}

const persisted = loadPersisted();
let sequence = 0;

function stamp() {
  sequence += 1;
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}.${String(sequence).padStart(3, '0')}`;
}

function event(record, stage, action, by, comments, statusAfter, extra = {}) {
  return {
    id: `EH-${record.id}-${(record.history?.length || 0) + 1}-${Date.now()}-${sequence}`,
    at: stamp(),
    stage,
    action,
    by,
    comments: comments || '',
    statusAfter,
    ...extra,
  };
}

function withHistory(record, entry) {
  return { ...record, history: [...(record.history || []), entry] };
}

function documents(...values) {
  return values.flat().filter(Boolean);
}

export function EngineeringReleaseProvider({ children }) {
  const { boms, createRevision: createBomRevision } = useBom();
  const { drawings, createRevision: createDrawingRevision } = useCad();
  const { definitions, inspections, processPlans, createRevision: createManufacturingRevision } = useManufacturing();
  const { designs, updateDesign } = useMechanical();
  const [state, setState] = useState(
    () => persisted || { changes: CHANGES.map(normalizeChange), ecos: ECOS, releases: ENGINEERING_RELEASES },
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Session-only fallback.
    }
  }, [state]);

  const value = useMemo(() => {
    const findChange = (id) => state.changes.find((row) => row.id === id);
    const findEco = (id) => state.ecos.find((row) => row.id === id);
    const ecoForChange = (change) =>
      state.ecos.find((row) => row.id === change?.ecoId || row.sourceEcrId === change?.id);

    const patchChange = (id, updater) =>
      setState((previous) => ({
        ...previous,
        changes: previous.changes.map((row) => (row.id === id ? updater(row) : row)),
      }));

    const patchEco = (id, updater) =>
      setState((previous) => ({
        ...previous,
        ecos: previous.ecos.map((row) => (row.id === id ? updater(row) : row)),
      }));

    const manufacturingRecords = [
      ...definitions.map((row) => ({ ...row, kind: 'definition', kindLabel: 'Manufacturing Definition' })),
      ...inspections.map((row) => ({ ...row, kind: 'inspection', kindLabel: 'Inspection Plan' })),
      ...processPlans.map((row) => ({ ...row, kind: 'process', kindLabel: 'Process Plan' })),
    ];

    return {
      changes: state.changes,
      ecrs: state.changes,
      ecos: state.ecos,
      releases: state.releases,
      manufacturingRecords,
      stats: {
        ...changeStats(state.changes, state.releases),
        ecos: state.ecos.length,
        pendingEcoReview: state.ecos.filter((row) => row.status === 'ECO Review').length,
        implementing: state.ecos.filter((row) => row.status === 'Change Implementation').length,
        closed: state.changes.filter((row) => ['Change Closed', 'Released'].includes(row.status)).length,
      },
      nextChangeId: () => nextChangeId(state.changes),
      nextEcoId: () => nextEcoId(state.ecos),
      nextReleaseId: () => nextReleaseId(state.releases),

      getChange: findChange,
      getEco: findEco,
      ecoForChange,
      releaseEligibility: (change) => releaseEligibility(change, boms, drawings, state.releases),

      /* --------------------------------------------------------------- ECR */
      addChange: (input, { asDraft = false } = {}) => {
        const id = input.id || nextChangeId(state.changes);
        if (state.changes.some((row) => row.id === id)) return { error: `${id} already exists.` };
        const record = normalizeChange({
          ...input,
          id,
          status: asDraft ? 'Draft' : 'ECR Submitted',
          approvalStatus: 'Pending',
          revisionUpdated: false,
          releaseId: '',
          raisedAt: input.raisedAt || TODAY,
          requestedDate: input.requestedDate || TODAY,
          history: [],
        });
        const created = withHistory(
          record,
          event(
            record,
            'ECR',
            asDraft ? 'ECR draft created' : 'Change request raised',
            record.requestedBy || record.raisedBy || 'Design Admin',
            record.changeReason,
            record.status,
          ),
        );
        setState((previous) => ({ ...previous, changes: [created, ...previous.changes] }));
        return { id: created.id };
      },

      updateEcr: (id, patch) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        if (!['Draft', 'ECR Submitted'].includes(change.status)) {
          return { error: 'Only a draft or submitted ECR can be edited. Later stages are controlled.' };
        }
        const next = normalizeChange({ ...change, ...patch, id: change.id });
        if (!String(next.changeTitle || next.title || '').trim()) return { error: 'Change title is required.' };
        if (!String(next.changeReason || '').trim()) return { error: 'Change reason is required.' };
        patchChange(id, (row) => ({
          ...next,
          history: [
            ...(row.history || []),
            event(row, 'ECR', 'ECR details updated', patch.requestedBy || row.requestedBy || row.raisedBy, 'Register fields updated before submission.', row.status),
          ],
        }));
        return {};
      },

      submitEcr: (id, { by = 'Design Admin' } = {}) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        if (change.status !== 'Draft') return { error: 'Only a draft ECR can be submitted.' };
        if (!change.projectId || !String(change.title || change.changeTitle || '').trim()) return { error: 'Project and change title are required.' };
        if (!String(change.changeReason || '').trim()) return { error: 'Change reason is required.' };
        if (!change.affectedParts) return { error: 'Record the affected part or assembly.' };
        if (!change.bomId || !change.drawingId) return { error: 'Link the impacted BOM and drawing.' };
        patchChange(id, (row) =>
          withHistory(
            { ...row, status: 'ECR Submitted', submittedAt: TODAY, submittedBy: by },
            event(row, 'ECR', 'ECR submitted for impact assessment', by, row.changeReason, 'ECR Submitted'),
          ),
        );
        return {};
      },

      saveImpact: (id, patch) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        if (!['ECR Submitted', 'Impact Assessment'].includes(change.status)) {
          return { error: 'Impact assessment is locked after the ECR decision.' };
        }
        if (!String(patch.impact || patch.initialAssessment || '').trim()) {
          return { error: 'Record the initial impact assessment.' };
        }
        if (!String(patch.affectedParts || '').trim()) return { error: 'Affected parts or assemblies are required.' };
        if (!patch.proposedBomRevision || !patch.proposedDrawingRevision) {
          return { error: 'Record the proposed BOM and drawing revisions.' };
        }
        const assessment = patch.impact || patch.initialAssessment;
        patchChange(id, (row) =>
          withHistory(
            {
              ...row,
              ...patch,
              initialAssessment: assessment,
              impact: assessment,
              status: 'Impact Assessment',
              impactAssessedAt: row.impactAssessedAt || TODAY,
            },
            event(row, 'Impact Assessment', 'Impact assessment saved', patch.assessedBy || row.requestedBy || row.raisedBy, patch.assessmentNotes || assessment, 'Impact Assessment'),
          ),
        );
        return {};
      },

      decideEcr: (id, { decision, reviewer = 'N. Joshi', comments = '' } = {}) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        if (change.status !== 'Impact Assessment') return { error: 'Record the impact assessment before deciding the ECR.' };
        if (!['Approve', 'Reject'].includes(decision)) return { error: 'Unknown ECR decision.' };
        if (decision === 'Reject' && !String(comments || '').trim()) return { error: 'A rejection reason is required.' };
        const approved = decision === 'Approve';
        patchChange(id, (row) =>
          withHistory(
            {
              ...row,
              ecrDecision: approved ? 'Approved' : 'Rejected',
              ecrApprovedBy: approved ? reviewer : '',
              ecrApprovedAt: approved ? TODAY : '',
              ecrDecisionComments: comments || (approved ? 'ECR approved for ECO preparation.' : ''),
              status: approved ? 'ECR Approved' : 'ECR Rejected',
            },
            event(row, 'ECR Decision', approved ? 'ECR approved' : 'ECR rejected', reviewer, comments || 'Approved for ECO preparation.', approved ? 'ECR Approved' : 'ECR Rejected'),
          ),
        );
        return {};
      },

      /* --------------------------------------------------------------- ECO */
      createEco: (ecrId, payload = {}) => {
        const ecr = findChange(ecrId);
        if (!ecr) return { error: 'Source ECR not found.' };
        if (ecr.status !== 'ECR Approved') return { error: 'An ECO can only be created from an approved ECR.' };
        if (ecoForChange(ecr)) return { error: `${ecr.id} already has a linked ECO.` };
        const id = payload.id || nextEcoId(state.ecos);
        if (state.ecos.some((row) => row.id === id)) return { error: `${id} already exists.` };
        const eco = normalizeEco({
          ...payload,
          id,
          sourceEcrId: ecr.id,
          projectId: ecr.projectId,
          designId: payload.designId || ecr.designId || '',
          affectedParts: payload.affectedParts || ecr.affectedParts || '',
          affectedAssemblies: payload.affectedAssemblies || ecr.affectedAssemblies || '',
          currentRevision: payload.currentRevision || ecr.designRevision || ecr.currentRevision || '',
          proposedRevision: payload.proposedRevision || ecr.proposedRevision || '',
          changeDescription: payload.changeDescription || ecr.changeDescription || ecr.changeReason || '',
          technicalImpact: payload.technicalImpact || ecr.initialAssessment || ecr.impact || '',
          manufacturingImpact: payload.manufacturingImpact || '',
          bomImpact: payload.bomImpact || `${ecr.bomId || 'BOM'} · Rev ${ecr.currentBomRevision || '—'} → ${ecr.proposedBomRevision || '—'}`,
          drawingImpact: payload.drawingImpact || `${ecr.drawingId || 'Drawing'} · Rev ${ecr.currentDrawingRevision || '—'} → ${ecr.proposedDrawingRevision || '—'}`,
          assignedEngineer: payload.assignedEngineer || ecr.requestedBy || ecr.raisedBy || '',
          impactedBomId: ecr.bomId || '',
          impactedDrawingIds: ecr.impactedDrawings?.length ? ecr.impactedDrawings : ecr.drawingId ? [ecr.drawingId] : [],
          proposedBomRevision: ecr.proposedBomRevision || '',
          proposedDrawingRevision: ecr.proposedDrawingRevision || '',
          manufacturingDocumentRefs: ecr.impactedManufacturingDocuments || [],
          supportingDocuments: ecr.supportingDocuments || [],
          status: 'ECO Created',
          approvalStatus: 'Pending',
          createdBy: payload.createdBy || ecr.requestedBy || ecr.raisedBy || 'Design Admin',
          createdAt: TODAY,
          history: [],
        });
        const created = withHistory(
          eco,
          event(eco, 'ECO', 'ECO created from approved ECR', eco.createdBy, `${ecr.id} · ${eco.changeDescription}`, 'ECO Created'),
        );
        setState((previous) => ({
          ...previous,
          ecos: [created, ...previous.ecos],
          changes: previous.changes.map((row) =>
            row.id === ecrId
              ? withHistory(
                  { ...row, ecoId: created.id, status: 'ECO Created' },
                  event(row, 'ECO', `ECO ${created.id} created`, created.createdBy, 'Approved ECR converted into an engineering change order.', 'ECO Created'),
                )
              : row,
          ),
        }));
        return { id: created.id, eco: created };
      },

      saveEco: (id, patch) => {
        const eco = findEco(id);
        if (!eco) return { error: 'ECO not found.' };
        if (eco.status !== 'ECO Created') return { error: 'An ECO can only be edited before review submission.' };
        if (!String(patch.assignedEngineer || eco.assignedEngineer || '').trim()) return { error: 'Assign an engineer to the ECO.' };
        if (!String(patch.proposedRevision || eco.proposedRevision || '').trim()) return { error: 'Record the proposed design revision.' };
        patchEco(id, (row) =>
          withHistory(
            { ...row, ...patch },
            event(row, 'ECO', 'ECO details updated', patch.createdBy || row.createdBy, 'Technical and implementation planning updated.', row.status),
          ),
        );
        return {};
      },

      submitEco: (id, { by = 'Design Admin' } = {}) => {
        const eco = findEco(id);
        if (!eco) return { error: 'ECO not found.' };
        if (eco.status !== 'ECO Created') return { error: 'Only a created ECO can be submitted for review.' };
        const required = [
          ['technicalImpact', 'technical impact'],
          ['manufacturingImpact', 'manufacturing impact'],
          ['bomImpact', 'BOM impact'],
          ['drawingImpact', 'drawing impact'],
          ['riskValidation', 'risk and validation requirements'],
          ['assignedEngineer', 'assigned engineer'],
          ['proposedRevision', 'proposed design revision'],
          ['effectiveDate', 'effective date'],
        ];
        const missing = required.filter(([key, label]) => !String(eco[key] || '').trim()).map(([, label]) => label);
        if (missing.length) return { error: `Complete the ECO before review: ${missing.join(', ')}.` };
        patchEco(id, (row) =>
          withHistory(
            { ...row, status: 'ECO Review', approvalStatus: 'Under Review', submittedBy: by, submittedAt: TODAY },
            event(row, 'ECO Review', 'ECO submitted for review', by, row.changeDescription, 'ECO Review'),
          ),
        );
        patchChange(eco.sourceEcrId, (row) => ({
          ...row,
          status: 'ECO Review',
          history: [...(row.history || []), event(row, 'ECO Review', `${eco.id} submitted for review`, by, 'Engineering change order submitted for approval.', 'ECO Review')],
        }));
        return {};
      },

      decideEco: (id, { decision, reviewer = 'N. Joshi', comments = '', effectiveDate } = {}) => {
        const eco = findEco(id);
        if (!eco) return { error: 'ECO not found.' };
        if (eco.status !== 'ECO Review') return { error: 'Only an ECO under review can be decided.' };
        if (!['Approve', 'Reject'].includes(decision)) return { error: 'Unknown ECO decision.' };
        if (decision === 'Reject' && !String(comments || '').trim()) return { error: 'A rejection reason is required.' };
        const approved = decision === 'Approve';
        if (approved && !String(effectiveDate || eco.effectiveDate || '').trim()) {
          return { error: 'Record the ECO effective date before approval.' };
        }
        const status = approved ? 'ECO Approved' : 'ECO Rejected';
        patchEco(id, (row) =>
          withHistory(
            {
              ...row,
              status,
              approvalStatus: approved ? 'Approved' : 'Rejected',
              reviewedBy: reviewer,
              reviewedAt: TODAY,
              effectiveDate: effectiveDate || row.effectiveDate,
              decisionComments: comments || (approved ? 'ECO approved for controlled implementation.' : ''),
            },
            event(row, 'ECO Approval', approved ? 'ECO approved' : 'ECO rejected', reviewer, comments || 'Approved for controlled implementation.', status),
          ),
        );
        patchChange(eco.sourceEcrId, (row) =>
          withHistory(
            {
              ...row,
              status,
              approvalStatus: approved ? 'Approved' : 'Rejected',
              reviewer,
              ecoApprovedAt: approved ? TODAY : row.ecoApprovedAt,
              decisionComments: comments || (approved ? 'ECO approved.' : ''),
            },
            event(row, 'ECO Approval', approved ? `${eco.id} approved` : `${eco.id} rejected`, reviewer, comments || 'Approved for controlled implementation.', status),
          ),
        );
        return {};
      },

      startImplementation: (id, { by = 'Design Admin' } = {}) => {
        const eco = findEco(id);
        if (!eco) return { error: 'ECO not found.' };
        if (eco.status !== 'ECO Approved') return { error: 'The ECO must be approved before implementation starts.' };
        patchEco(id, (row) =>
          withHistory(
            { ...row, status: 'Change Implementation', implementationStartedAt: TODAY, implementationStartedBy: by },
            event(row, 'Implementation', 'Change implementation started', by, row.implementationNotes || 'Approved ECO moved into implementation.', 'Change Implementation'),
          ),
        );
        patchChange(eco.sourceEcrId, (row) => ({
          ...row,
          status: 'Change Implementation',
          history: [...(row.history || []), event(row, 'Implementation', `${eco.id} implementation started`, by, 'Approved ECO moved into implementation.', 'Change Implementation')],
        }));
        return {};
      },

      applyRevisionUpdate: (id, patch = {}) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        const eco = ecoForChange(change);
        if (!eco) return { error: 'A linked ECO is required before revisions can be created.' };
        if (eco.status !== 'Change Implementation') return { error: 'Start the approved ECO implementation before creating revisions.' };
        const by = patch.by || eco.assignedEngineer || 'Design Admin';
        const bomId = patch.bomId || eco.impactedBomId || change.bomId;
        const drawingIds = patch.impactedDrawingIds || eco.impactedDrawingIds || change.impactedDrawings || [];
        const designId = patch.designId || eco.designId || change.designId;
        const targetDesignRevision = String(patch.proposedRevision || eco.proposedRevision || change.proposedRevision || '').trim().toUpperCase();
        const targetBomRevision = String(patch.proposedBomRevision || eco.proposedBomRevision || change.proposedBomRevision || '').trim().toUpperCase();
        const targetDrawingRevision = String(patch.proposedDrawingRevision || eco.proposedDrawingRevision || change.proposedDrawingRevision || '').trim().toUpperCase();

        const design = designId ? designs.find((row) => row.id === designId) : null;
        const bom = boms.find((row) => row.id === bomId);
        const drawing = drawings.find((row) => row.id === (drawingIds[0] || change.drawingId));
        const manufacturingRefs = eco.manufacturingDocumentRefs || change.impactedManufacturingDocuments || [];

        if (!design && !bom && !drawing && manufacturingRefs.length === 0) return { error: 'No affected design source is linked to this change.' };
        if (designId && !design) return { error: `Mechanical design ${designId} was not found.` };
        if (bomId && !bom) return { error: `BOM ${bomId} was not found.` };
        if (drawingIds.length && !drawing) return { error: 'The impacted drawing was not found.' };

        if (design) {
          if (!['Approved', 'Released', 'In Design'].includes(design.status)) {
            return { error: `Design ${design.id} is ${design.status}; a new controlled revision can only follow an approved or in-design baseline.` };
          }
          if (!targetDesignRevision) return { error: 'Proposed design revision is required.' };
          if (targetDesignRevision !== nextRevision(design.revision)) {
            return { error: `The supported design workflow creates Rev ${nextRevision(design.revision)} from ${design.id} Rev ${design.revision}. Adjust the proposed revision.` };
          }
        }
        if (bom) {
          if (!['Approved', 'Released', 'Superseded'].includes(bom.status)) {
            return { error: `BOM ${bom.id} is ${bom.status}; it must be approved or released before a new revision can be raised.` };
          }
          if (!targetBomRevision) return { error: 'Proposed BOM revision is required.' };
          if (targetBomRevision !== nextRevision(bom.revision)) {
            return { error: `The BOM workflow creates Rev ${nextRevision(bom.revision)} from ${bom.id} Rev ${bom.revision}. Adjust the proposed BOM revision.` };
          }
        }
        if (drawing) {
          if (!['Approved', 'Released', 'Superseded'].includes(drawing.approvalStatus)) {
            return { error: `Drawing ${drawing.drawingNumber} is ${drawing.approvalStatus}; it must be approved or released before a new revision can be raised.` };
          }
          if (!targetDrawingRevision) return { error: 'Proposed drawing revision is required.' };
          if (targetDrawingRevision !== nextRevision(drawing.revision)) {
            return { error: `The drawing workflow creates Rev ${nextRevision(drawing.revision)} from ${drawing.drawingNumber} Rev ${drawing.revision}. Adjust the proposed drawing revision.` };
          }
        }
        const invalidMfg = manufacturingRefs
          .map((ref) => manufacturingRecords.find((row) => row.id === ref.id && row.kind === ref.kind))
          .filter((row) => !row || !['Approved', 'Released', 'Superseded'].includes(row.status));
        if (invalidMfg.length) {
          return { error: 'Every impacted manufacturing record must exist and be approved or released before a new revision is raised.' };
        }

        const updates = [];
        const failures = [];

        if (design) {
          const previous = design.revision;
          updateDesign(
            design.id,
            {
              revision: targetDesignRevision,
              status: 'In Design',
              revisions: [
                ...(design.revisions || []),
                { revision: targetDesignRevision, date: TODAY, by, note: patch.revisionNote || `Controlled revision from ${eco.id}: ${eco.changeDescription || change.changeReason}` },
              ],
            },
            { label: 'Controlled revision created', detail: `${eco.id}: Rev ${previous} → Rev ${targetDesignRevision}. Previous revision preserved.` },
          );
          updates.push({ type: 'Design', id: design.id, previous, revision: targetDesignRevision, at: TODAY, by, status: 'In Design' });
        }
        if (bom) {
          const previous = bom.revision;
          const result = createBomRevision(bom.id, by, `${eco.id} · ${eco.changeDescription || change.changeReason}`, eco.changeDescription || change.changeReason);
          if (result.error) failures.push(result.error);
          else updates.push({ type: 'BOM', id: bom.id, previous, revision: result.revision || targetBomRevision, at: TODAY, by, status: 'Draft' });
        }
        if (drawing) {
          const previous = drawing.revision;
          const result = createDrawingRevision(drawing.id, by, `${eco.id} · ${eco.changeDescription || change.changeReason}`, eco.changeDescription || change.changeReason);
          if (result.error) failures.push(result.error);
          else updates.push({ type: 'Drawing', id: drawing.id, previous, revision: result.revision || targetDrawingRevision, at: TODAY, by, status: 'Draft' });
        }
        manufacturingRefs.forEach((ref) => {
          const source = manufacturingRecords.find((row) => row.id === ref.id && row.kind === ref.kind);
          if (!source) return;
          const previous = source.revision;
          const result = createManufacturingRevision(ref.kind, ref.id, by);
          if (result.error) failures.push(result.error);
          else updates.push({ type: ref.kindLabel || 'Manufacturing document', id: ref.id, previous, revision: result.revision, at: TODAY, by, status: 'Draft' });
        });

        if (failures.length) return { error: failures.join(' ') };

        const summary = updates.map((row) => `${row.type} ${row.id}: ${row.previous} → ${row.revision}`).join(' · ');
        patchChange(id, (row) =>
          withHistory(
            {
              ...row,
              currentRevision: design?.revision || row.currentRevision,
              proposedRevision: targetDesignRevision || row.proposedRevision,
              revisionUpdated: true,
              revisionUpdatedAt: TODAY,
              revisionUpdates: updates,
              status: 'Revision Updated',
              designRevision: targetDesignRevision || row.designRevision,
            },
            event(row, 'Revision Update', 'Controlled source revisions created', by, `${summary}. Previous revisions remain preserved in their owning modules.`, 'Revision Updated', { previousRevision: design?.revision || '', newRevision: targetDesignRevision }),
          ),
        );
        patchEco(eco.id, (row) =>
          withHistory(
            { ...row, status: 'Revision Updated', revisionUpdatedAt: TODAY, revisionUpdates: updates },
            event(row, 'Revision Update', 'Revision implementation recorded', by, summary, 'Revision Updated', { previousRevision: design?.revision || '', newRevision: targetDesignRevision }),
          ),
        );
        return { updates };
      },

      closeChange: (id, { by = 'Design Admin' } = {}) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        const eco = ecoForChange(change);
        if (!eco) return { error: 'A linked ECO is required before closure.' };
        if (!['Revision Updated', 'Released'].includes(eco.status)) {
          return { error: 'The revision must be updated before the change can be closed.' };
        }
        if (!change.revisionUpdated) return { error: 'Create the controlled revisions before closure.' };
        patchChange(id, (row) =>
          withHistory(
            { ...row, status: 'Change Closed', closedAt: TODAY },
            event(row, 'Closure', 'Change closed', by, 'ECO implementation and revision updates are complete.', 'Change Closed'),
          ),
        );
        patchEco(eco.id, (row) =>
          withHistory(
            { ...row, status: 'Change Closed', closedAt: TODAY },
            event(row, 'Closure', 'Change closed', by, 'All mandatory change actions are complete.', 'Change Closed'),
          ),
        );
        return {};
      },

      removeDraft: (id) => {
        const change = findChange(id);
        if (!change) return { error: 'ECR not found.' };
        if (change.status !== 'Draft') return { error: 'Only draft ECR records can be deleted.' };
        if (ecoForChange(change)) return { error: 'An ECR with a linked ECO cannot be deleted.' };
        setState((previous) => ({ ...previous, changes: previous.changes.filter((row) => row.id !== id) }));
        return {};
      },

      /* ----------------------------------------------------------- Release */
      releaseChange: (id, payload) => {
        const change = findChange(id);
        if (!change) return { error: 'Change request not found.' };
        const eligibility = releaseEligibility(change, boms, drawings, state.releases);
        if (!eligibility.eligible) return { error: eligibility.reasons[0] || 'This change is not eligible for release.' };
        const destinations = payload.destinations || [];
        if (!destinations.some((destination) => ['Purchase', 'Production'].includes(destination))) {
          return { error: 'Select at least one handover destination.' };
        }
        if (!String(payload.manufacturingPackage || '').trim()) {
          return { error: 'Record the manufacturing package reference before release.' };
        }
        const released = {
          id: nextReleaseId(state.releases),
          changeId: change.id,
          ecoId: change.ecoId || '',
          projectId: change.projectId,
          changeReason: change.changeReason,
          releaseType: change.firstRelease ? 'First Release' : 'Revision Change',
          firstRelease: Boolean(change.firstRelease),
          currentRevision: change.currentRevision,
          proposedRevision: change.proposedRevision,
          bom: {
            id: eligibility.bom.id,
            name: eligibility.bom.name,
            currentRevision: change.currentBomRevision,
            releasedRevision: change.currentBomRevision || eligibility.bom.revision,
            approvedRevision: change.proposedBomRevision,
            sourceStatus: eligibility.bom.status,
          },
          drawing: {
            id: eligibility.drawing.id,
            number: eligibility.drawing.drawingNumber,
            title: eligibility.drawing.title,
            currentRevision: change.currentDrawingRevision,
            releasedRevision: change.currentDrawingRevision || eligibility.drawing.revision,
            approvedRevision: change.proposedDrawingRevision,
            sourceStatus: eligibility.drawing.approvalStatus,
          },
          manufacturingPackage: payload.manufacturingPackage.trim(),
          approvalStatus: 'Approved',
          approvedBy: change.reviewer,
          approvedAt: change.ecoApprovedAt,
          releasedBy: payload.releasedBy || 'Design Authority',
          releasedAt: TODAY,
          notes: payload.notes || '',
          purchaseHandover: {
            required: destinations.includes('Purchase'),
            status: destinations.includes('Purchase') ? 'Prepared' : 'Not Required',
            reference: destinations.includes('Purchase') ? `PUR-HO-${TODAY.replace(/-/g, '')}` : '',
            date: destinations.includes('Purchase') ? TODAY : '',
            owner: destinations.includes('Purchase') ? 'Purchase — Sourcing cell' : '',
            notes: destinations.includes('Purchase') ? 'Handover prepared locally.' : '',
          },
          productionHandover: {
            required: destinations.includes('Production'),
            status: destinations.includes('Production') ? 'Prepared' : 'Not Required',
            reference: destinations.includes('Production') ? `PRD-HO-${TODAY.replace(/-/g, '')}` : '',
            date: destinations.includes('Production') ? TODAY : '',
            owner: destinations.includes('Production') ? 'Production — Engineering support' : '',
            notes: destinations.includes('Production') ? 'Handover prepared locally.' : '',
          },
          history: [
            {
              id: `RH-${change.id}-1`,
              at: stamp(),
              action: 'Engineering release created',
              by: payload.releasedBy || 'Design Authority',
              comments: `${change.firstRelease ? 'First release' : 'Revision change'} · source releases preserved.`,
            },
          ],
        };
        setState((previous) => ({
          changes: previous.changes.map((row) =>
            row.id === id
              ? withHistory(
                  { ...row, status: 'Released', releaseId: released.id, releasedAt: TODAY },
                  event(row, 'Engineering Release', `Released ${released.id}`, released.releasedBy, `${released.releaseType} · BOM Rev ${change.proposedBomRevision} · Drawing Rev ${change.proposedDrawingRevision}`, 'Released'),
                )
              : row,
          ),
          ecos: previous.ecos.map((row) =>
            row.id === released.ecoId
              ? withHistory(
                  { ...row, status: 'Released', releaseId: released.id, releasedAt: TODAY },
                  event(row, 'Engineering Release', `Released ${released.id}`, released.releasedBy, 'Controlled release snapshot created after revision approval.', 'Released'),
                )
              : row,
          ),
          releases: [released, ...previous.releases],
        }));
        return { release: released };
      },

      updateHandover: (releaseId, side, patch) => {
        const release = state.releases.find((row) => row.id === releaseId);
        if (!release) return { error: 'Release record not found.' };
        if (!['purchase', 'production'].includes(side)) return { error: 'Unknown handover destination.' };
        if (!HANDOVER_STATUSES.includes(patch.status) || patch.status === 'Not Required') {
          return { error: 'Choose a valid handover status.' };
        }
        if (['On Hold', 'Rejected'].includes(patch.status) && !String(patch.notes || '').trim()) {
          return { error: 'Add a note for a held or rejected handover.' };
        }
        setState((previous) => ({
          ...previous,
          releases: previous.releases.map((row) => {
            if (row.id !== releaseId) return row;
            const handoverKey = `${side}Handover`;
            const current = row[handoverKey];
            return {
              ...row,
              [handoverKey]: {
                ...current,
                required: true,
                status: patch.status,
                reference: patch.reference || current.reference,
                date: patch.date || TODAY,
                owner: patch.owner || current.owner,
                notes: patch.notes || current.notes,
              },
              history: [
                ...(row.history || []),
                {
                  id: `RH-${releaseId}-${(row.history?.length || 0) + 1}`,
                  at: stamp(),
                  action: `${side === 'purchase' ? 'Purchase' : 'Production'} handover — ${patch.status}`,
                  by: patch.owner || 'Design Authority',
                  comments: patch.notes || '',
                },
              ],
            };
          }),
        }));
        return {};
      },

      projectName(projects, projectId) {
        return projects.find((row) => row.id === projectId)?.name || projectId;
      },

      supportingDocumentRefs: documents,
    };
  }, [state, boms, drawings, designs, definitions, inspections, processPlans]);

  return <EngineeringReleaseContext.Provider value={value}>{children}</EngineeringReleaseContext.Provider>;
}

export function useEngineeringRelease() {
  const context = useContext(EngineeringReleaseContext);
  if (!context) throw new Error('useEngineeringRelease must be used inside EngineeringReleaseProvider');
  return context;
}
