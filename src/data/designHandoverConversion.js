/**
 * Design Review → Production Handover conversion helpers.
 *
 * This module only reads existing records and builds a draft form payload.
 * It never creates, approves or releases anything.
 */
import { finalApprovalRecord, openEngineeringChanges } from './designHandoverData';

const RESOLVED_FINAL = new Set(['Approved']);

function sameValue(a, b) {
  return Boolean(a) && Boolean(b) && String(a) === String(b);
}

/**
 * Find unresolved engineering changes that can be connected to this review's
 * exact project, design, BOM, drawing or controlled revision. A change without
 * any matching reference is not treated as applicable.
 */
export function applicableOpenChanges(review, changes = []) {
  if (!review) return [];
  return openEngineeringChanges(changes, review.projectId).filter((change) => {
    const sameDesign = sameValue(change.designId, review.designId);
    const sameBom = sameValue(change.bomId, review.bomId);
    const sameDrawing =
      sameValue(change.drawingId, review.drawingId) ||
      (change.impactedDrawings || []).some((id) => sameValue(id, review.drawingId));
    const sameRevision =
      sameValue(change.currentRevision, review.designRevision) ||
      sameValue(change.designRevision, review.designRevision);
    return sameDesign || sameBom || sameDrawing || sameRevision;
  });
}

export function handoverConversionEligibility({ review, design, project, changes = [] }) {
  const reasons = [];
  if (!review) {
    return { eligible: false, reasons: ['Design review record not found.'], openChanges: [] };
  }
  if (!project) reasons.push('The linked project record no longer exists.');
  if (!design) reasons.push('The linked mechanical design record no longer exists.');

  if (review.stageStates?.engineering?.status !== 'Approved') {
    reasons.push(`Engineering Review is ${review.stageStates?.engineering?.status || 'not recorded'}; it must be approved.`);
  }
  if (review.requiredStages?.includes('Manufacturing') && review.stageStates?.manufacturing?.status !== 'Approved') {
    reasons.push(`Manufacturing Review is ${review.stageStates?.manufacturing?.status || 'not recorded'}; it must be approved.`);
  }
  if (review.clientRequired && review.stageStates?.client?.status !== 'Approved') {
    reasons.push(`Client or Admin Approval is ${review.stageStates?.client?.status || 'not recorded'}; it must be approved.`);
  }
  if (!RESOLVED_FINAL.has(review.finalApproval?.decision) && !finalApprovalRecord(review)) {
    reasons.push('Final Approval is not completed.');
  }
  if (!review.release?.releaseId) {
    reasons.push('The design revision has not been released.');
  }
  if (design && review.designRevision && design.revision !== review.designRevision) {
    reasons.push(`The design is now Rev ${design.revision}; the released review covers Rev ${review.designRevision}.`);
  }

  const openChanges = applicableOpenChanges(review, changes);
  if (openChanges.length > 0) {
    reasons.push(
      `An unresolved engineering change affects this revision: ${openChanges
        .map((change) => `${change.id} (${change.status})`)
        .join(', ')}.`,
    );
  }

  return { eligible: reasons.length === 0, reasons, openChanges };
}

function uniqueRecord(records) {
  return records.length === 1 ? records[0] : null;
}

function relatedManufacturing(records, projectId, drawing, partRef) {
  const projectRecords = records.filter((record) => record.projectId === projectId);
  if (drawing?.drawingNumber) {
    const byDrawing = projectRecords.filter(
      (record) =>
        record.drawingNo === drawing.drawingNumber &&
        (!record.drawingRevision || record.drawingRevision === drawing.revision),
    );
    if (byDrawing.length) return uniqueRecord(byDrawing);
  }
  if (partRef) {
    const byPart = projectRecords.filter(
      (record) => record.partNumber === partRef || record.assemblyId === partRef,
    );
    if (byPart.length) return uniqueRecord(byPart);
  }
  return null;
}

function drawingMatchesReference(drawing, references = []) {
  if (!references.length) return false;
  return references.some((reference) => {
    const text = String(reference || '');
    if (!text.toLowerCase().includes(String(drawing.drawingNumber || '').toLowerCase())) return false;
    return new RegExp(`\\bRev(?:ision)?\\s*${String(drawing.revision || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
  });
}

function relevantDrawings(review, projectDrawings) {
  const references = review.designReview?.drawingReferences || [];
  const selected = [];
  const add = (drawing) => {
    if (drawing && !selected.some((row) => row.id === drawing.id)) selected.push(drawing);
  };

  const linked = projectDrawings.find(
    (drawing) => drawing.id === review.drawingId && drawing.revision === review.drawingRevision,
  );
  add(linked);
  projectDrawings.forEach((drawing) => {
    if (drawingMatchesReference(drawing, references)) add(drawing);
  });
  return selected;
}

export function buildReviewPrefill({
  review,
  project,
  design,
  parts = [],
  assemblies = [],
  boms = [],
  drawings = [],
  definitions = [],
  inspections = [],
  processPlans = [],
}) {
  const projectDrawings = drawings.filter((drawing) => drawing.projectId === review?.projectId);
  const reviewDrawings = relevantDrawings(review, projectDrawings);
  const linkedDrawing = reviewDrawings.find((drawing) => drawing.id === review?.drawingId) || null;
  const bom = boms.find((row) => row.id === review?.bomId) || null;
  const bomRevisionMatches = Boolean(
    bom && review?.bomRevision && bom.revision === review.bomRevision,
  );
  const part = parts.find(
    (row) => sameValue(row.id, review?.partRef) || sameValue(row.partNumber, review?.partRef),
  );
  const assembly =
    assemblies.find((row) => sameValue(row.id, review?.partRef)) ||
    assemblies.find((row) => sameValue(row.id, design?.assemblyId)) ||
    assemblies.find((row) => (design?.linkedAssemblyIds || []).includes(row.id));
  const itemType = assembly ? 'Assembly' : part ? 'Part' : 'Design';
  const item = assembly || part || design;
  const definition = relatedManufacturing(definitions, review?.projectId, linkedDrawing, review?.partRef);
  const inspection = relatedManufacturing(inspections, review?.projectId, linkedDrawing, review?.partRef);
  const processPlan = relatedManufacturing(processPlans, review?.projectId, linkedDrawing, review?.partRef);

  const form = {
    projectId: review?.projectId || '',
    designId: design?.id || '',
    designRevision: review?.designRevision || design?.revision || '',
    itemType,
    itemId: item?.id || design?.id || '',
    bomId: bomRevisionMatches ? bom.id : '',
    bomRevision: bomRevisionMatches ? review.bomRevision : '',
    drawingIds: reviewDrawings.map((drawing) => drawing.id),
    manufacturingId: definition?.id || '',
    inspectionId: inspection?.id || '',
    processPlanId: processPlan?.id || '',
    engineeringReviewId: review?.id || '',
    manufacturingReviewId: review?.requiredStages?.includes('Manufacturing') ? review?.id || '' : '',
    finalApprovalId: finalApprovalRecord(review) ? review?.id || '' : '',
    owner: '',
    targetDate: '',
    notes: review
      ? `Prefilled from Design Review ${review.id}${review.release?.releaseId ? ` and controlled release ${review.release.releaseId}` : ''}. Verify the source references before saving this handover.`
      : '',
    sourceReviewId: review?.id || '',
    sourceReleaseId: review?.release?.releaseId || '',
    sourceReviewPath: review?.id ? `/design-review/review/${review.id}` : '',
    sourceRefs: review
      ? {
          projectId: review.projectId,
          designId: review.designId || design?.id || '',
          designRevision: review.designRevision || design?.revision || '',
          itemId: item?.id || '',
          bomId: review.bomId || '',
          bomRevision: review.bomRevision || '',
          drawingIds: reviewDrawings.map((drawing) => drawing.id),
          manufacturingId: definition?.id || '',
          inspectionId: inspection?.id || '',
          processPlanId: processPlan?.id || '',
        }
      : null,
  };

  return {
    form,
    project,
    design,
    item,
    bom,
    bomRevisionMatches,
    drawings: reviewDrawings,
    linkedDrawing,
    definition,
    inspection,
    processPlan,
    statuses: {
      engineering: review?.stageStates?.engineering?.status || 'Not Available',
      manufacturing: review?.requiredStages?.includes('Manufacturing')
        ? review?.stageStates?.manufacturing?.status || 'Not Available'
        : 'Not Required',
      client: review?.clientRequired
        ? review?.stageStates?.client?.status || 'Not Available'
        : 'Not Required',
      final: review?.finalApproval?.decision || 'Not Available',
      release: review?.release?.status || 'Not Released',
    },
    facts: {
      projectNumber: project?.id || 'Not Available',
      projectReference: project?.reference || 'Not Available',
      designNumber: design?.cadRef || design?.id || 'Not Available',
      designReference: design?.id || 'Not Available',
      revision: review?.designRevision || design?.revision || 'Not Available',
      itemNumber: assembly?.number || part?.partNumber || item?.id || 'Not Available',
      itemReference: item?.id || 'Not Available',
      review: review?.id || 'Not Available',
      release: review?.release?.releaseId || 'Not Available',
    },
    availability: {
      manufacturing: definition
        ? `${definition.id} · ${definition.name}`
        : 'Not Available — no single linked manufacturing definition was found.',
      inspection: inspection
        ? `${inspection.id} · ${inspection.name}`
        : 'Not Available — no single linked inspection plan was found.',
      processPlan: processPlan
        ? `${processPlan.id} · ${processPlan.name}`
        : 'Not Available — no single linked process plan was found.',
      bom: bom
        ? bomRevisionMatches
          ? `${bom.id} Rev ${bom.revision}`
          : `Not Available — review covers Rev ${review?.bomRevision || '—'}; BOM is now Rev ${bom.revision}.`
        : 'Not Available — no linked BOM record was found.',
    },
  };
}
