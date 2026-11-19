import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { APP_USER } from '../constants/brand';
import { TODAY } from '../data/projectData';
import {
  PACKAGE_CATEGORIES,
  PACKAGE_CATEGORY_BY_KEY,
  buildReleaseManifest,
  evaluateValidation,
  nextReference,
  packageCompleteness,
  selectedPackageItems,
  validationBlocking,
} from '../data/designHandoverData';
import { useProjects } from './ProjectsContext';
import { useMechanical } from './MechanicalContext';
import { useSimulation } from './SimulationContext';
import { useAnalysis } from './AnalysisContext';
import { useManufacturing } from './ManufacturingContext';
import { useBom } from './BomContext';
import { useCad } from './CadContext';
import { useApprovals } from './ApprovalsContext';
import { useEngineeringRelease } from './EngineeringReleaseContext';

const STORAGE_KEY = 'md-design-handover-state-v1';
const DesignHandoverContext = createContext(null);

const MODEL_EXTENSIONS = ['STEP', 'STP', 'IGES', 'IGS', 'STL', 'OBJ', 'SLDPRT', 'SLDASM', 'CATPART', 'CATPRODUCT', 'PRT', 'ASM', 'FBX', '3MF'];

function emptyState() {
  return { handovers: [], packages: [], releases: [], transfers: [] };
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      handovers: Array.isArray(parsed?.handovers) ? parsed.handovers : [],
      packages: Array.isArray(parsed?.packages) ? parsed.packages : [],
      releases: Array.isArray(parsed?.releases) ? parsed.releases : [],
      transfers: Array.isArray(parsed?.transfers) ? parsed.transfers : [],
    };
  } catch {
    return emptyState();
  }
}

const persisted = loadPersisted();
let eventSequence = 0;

function stamp() {
  eventSequence += 1;
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}.${String(eventSequence).padStart(3, '0')}`;
}

function historyEntry(record, action, detail, by = APP_USER.name) {
  return {
    id: `HH-${record.id}-${(record.history?.length || 0) + 1}-${Date.now()}`,
    at: stamp(),
    action,
    detail,
    by,
  };
}

function withHistory(record, action, detail, by) {
  return { ...record, history: [...(record.history || []), historyEntry(record, action, detail, by)] };
}

function uniqueSource(source, category) {
  return {
    category,
    sourceId: source.id,
    label: source.label,
    revision: source.revision || '',
    status: source.status || '',
    sourceModule: source.sourceModule || PACKAGE_CATEGORY_BY_KEY[category]?.sourceModule || '',
    detail: source.detail || '',
  };
}

function source(id, label, revision = '', status = '', sourceModule = '', detail = '') {
  return { id, label, revision, status, sourceModule, detail };
}

function buildCatalogs({
  handover,
  projects,
  designs,
  parts,
  assemblies,
  cadFiles,
  drawings,
  boms,
  definitions,
  inspections,
  processPlans,
  simulationReports,
  analysisReports,
  reviews,
  changes,
}) {
  const projectId = handover?.projectId;
  const design = designs.find((record) => record.id === handover?.designId) || null;
  const project = projects.find((record) => record.id === projectId) || null;
  const projectBoms = boms.filter((record) => record.projectId === projectId);
  const projectDrawings = drawings.filter((record) => record.projectId === projectId);
  const projectReviews = reviews.filter((record) => record.projectId === projectId);
  const finalApprovals = projectReviews.filter((record) => record.finalApproval?.decision === 'Approved' || ['Approved', 'Released'].includes(record.status));

  const sources = {
    'mechanical-design': design
      ? [source(design.id, `${design.id} · ${design.name}`, design.revision, design.status, 'Mechanical Engineering Design', design.category || design.domain || '')]
      : [],
    'design-revision': design
      ? [source(`${design.id}-${design.revision}`, `${design.id} · Revision ${design.revision}`, design.revision, design.status, 'Mechanical Engineering Design', design.name)]
      : [],
    'cad-models': cadFiles
      .filter((file) => file.projectId === projectId && MODEL_EXTENSIONS.includes(String(file.fileType || '').toUpperCase()) && !file.supersededBy)
      .map((file) => source(file.id, `${file.id} · ${file.fileName}`, file.revision, file.status, 'Drawing & CAD Management', file.partNumber || '')),
    drawings: projectDrawings.map((drawing) => source(drawing.id, `${drawing.drawingNumber} Rev ${drawing.revision} · ${drawing.title}`, drawing.revision, drawing.approvalStatus, 'Drawing & CAD Management', drawing.drawingType || '')),
    bom: projectBoms.map((bom) => source(bom.id, `${bom.id} Rev ${bom.revision} · ${bom.name}`, bom.revision, bom.status, 'BOM & Cost Estimation', bom.bomType || '')),
    'material-specifications': projectBoms.flatMap((bom) =>
      (bom.items || [])
        .filter((item) => item.material || item.materialCode)
        .map((item, index) => source(
          `${bom.id}:${item.id || index + 1}`,
          `${bom.id} Rev ${bom.revision} · ${item.material || item.materialCode} · ${item.partNumber || item.name || 'Material reference'}`,
          bom.revision,
          bom.status,
          'BOM & Cost Estimation',
          item.description || '',
        )),
    ),
    'manufacturing-definitions': definitions
      .filter((record) => record.projectId === projectId)
      .map((record) => source(record.id, `${record.id} · ${record.name}`, record.revision, record.status, 'Manufacturing Design', record.partNumber || '')),
    inspections: inspections
      .filter((record) => record.projectId === projectId)
      .map((record) => source(record.id, `${record.id} · ${record.name}`, record.revision, record.status, 'Manufacturing Design', record.partNumber || '')),
    'process-plans': processPlans
      .filter((record) => record.projectId === projectId)
      .map((record) => source(record.id, `${record.id} · ${record.name}`, record.revision, record.status, 'Manufacturing Design', record.partNumber || '')),
    'simulation-reports': simulationReports
      .filter((record) => record.projectId === projectId)
      .map((record) => source(record.id, `${record.id} · ${record.title}`, record.revision, record.status, 'Simulation & Design Validation', record.reportType || '')),
    'analysis-reports': analysisReports
      .filter((record) => record.projectId === projectId)
      .map((record) => source(record.id, `${record.id} · ${record.title}`, record.revision, record.status, 'Engineering Analysis', record.analysisType || '')),
    'engineering-review-records': projectReviews.map((record) => source(record.id, `${record.id} · ${record.deliverableName || record.deliverableNumber || 'Review'}`, record.revision, record.status, 'Design Review & Approval', record.stageStates?.engineering?.status || '')),
    'manufacturing-review-records': projectReviews
      .filter((record) => record.requiredStages?.includes('Manufacturing') || record.stageStates?.manufacturing?.status)
      .map((record) => source(record.id, `${record.id} · ${record.deliverableName || record.deliverableNumber || 'Review'}`, record.revision, record.stageStates?.manufacturing?.status || record.status, 'Design Review & Approval', record.reviewType || '')),
    'approval-evidence': finalApprovals.map((record) => source(record.id, `${record.id} · Final approval for ${record.deliverableNumber || record.deliverableName || 'design'}`, record.revision, record.finalApproval?.decision || record.status, 'Design Review & Approval', record.release?.releaseId || '')),
    'change-records': changes
      .filter((record) => record.projectId === projectId && (record.approvalStatus === 'Approved' || record.status === 'Released'))
      .map((record) => source(record.id, `${record.id} · ${record.title}`, record.proposedRevision || '', record.status, 'Engineering Change & Release', record.releaseId || '')),
  };

  return PACKAGE_CATEGORIES.map((category) => ({
    ...category,
    sources: (sources[category.key] || []).map((entry) => uniqueSource(entry, category.key)),
  }));
}

export function DesignHandoverProvider({ children }) {
  const { projects } = useProjects();
  const { designs, parts, assemblies } = useMechanical();
  const { reports: simulationReports } = useSimulation();
  const { reports: analysisReports } = useAnalysis();
  const { definitions, inspections, processPlans } = useManufacturing();
  const { boms } = useBom();
  const { files: cadFiles, drawings } = useCad();
  const { reviews } = useApprovals();
  const { changes } = useEngineeringRelease();
  const [state, setState] = useState(persisted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The current session continues in memory when storage is unavailable.
    }
  }, [state]);

  const value = useMemo(() => {
    const getHandover = (id) => state.handovers.find((row) => row.id === id) || null;
    const findHandoverForRevision = ({ projectId, designId, designRevision }) =>
      state.handovers.find(
        (row) =>
          row.projectId === projectId &&
          row.designId === designId &&
          row.designRevision === designRevision,
      ) || null;
    const getPackage = (handoverId) => state.packages.find((row) => row.handoverId === handoverId) || null;
    const getRelease = (handoverId) => state.releases.find((row) => row.handoverId === handoverId) || null;
    const transfersFor = (handoverId) => state.transfers.filter((row) => row.handoverId === handoverId);

    const catalogsFor = (handover) => buildCatalogs({
      handover,
      projects,
      designs,
      parts,
      assemblies,
      cadFiles,
      drawings,
      boms,
      definitions,
      inspections,
      processPlans,
      simulationReports,
      analysisReports,
      reviews,
      changes,
    });

    const nextHandoverId = () => nextReference('HND', state.handovers);
    const nextPackageId = () => nextReference('PKG', state.packages);
    const nextReleaseId = () => nextReference('DRL', state.releases);
    const nextTransferId = () => nextReference('XFR', state.transfers);

    const patchHandover = (id, updater) =>
      setState((previous) => ({
        ...previous,
        handovers: previous.handovers.map((row) => (row.id === id ? updater(row) : row)),
      }));

    const saveHandover = (record) => {
      if (!record.projectId || !record.designId || !record.designRevision) {
        return { error: 'Select a project and controlled design revision.' };
      }
      if (!record.owner || !record.targetDate) {
        return { error: 'Handover owner and target handover date are required.' };
      }
      const design = designs.find((row) => row.id === record.designId);
      if (!design) return { error: 'The selected design record no longer exists.' };
      if (design.revision !== record.designRevision) {
        return { error: `The selected design is now at Rev ${design.revision}; reload the form and select the controlled revision again.` };
      }
      const duplicate = state.handovers.find(
        (row) =>
          row.id !== record.id &&
          row.designId === record.designId &&
          row.designRevision === record.designRevision &&
          row.projectId === record.projectId &&
          row.status !== 'Cancelled',
      );
      if (duplicate) {
        return { error: `${duplicate.id} already covers ${record.designId} Rev ${record.designRevision}. Open the existing handover instead of creating a duplicate.` };
      }

      const existing = record.id ? getHandover(record.id) : null;
      if (existing && !['Draft', 'Validation Failed', 'Ready for Release'].includes(existing.status)) {
        return { error: 'This handover has been released or exported and can no longer be edited.' };
      }

      const id = existing?.id || nextHandoverId();
      const saved = {
        ...(existing || {}),
        ...record,
        id,
        designRevision: design.revision,
        status: existing?.status === 'Ready for Release' ? 'Ready for Release' : 'Draft',
        validation: existing?.validation || null,
        release: existing?.release || null,
        createdAt: existing?.createdAt || TODAY,
        updatedAt: TODAY,
      };
      const audited = withHistory(
        existing || { ...saved, history: [] },
        existing ? 'Handover draft updated' : 'Handover record created',
        `${saved.projectId} · ${saved.designId} Rev ${saved.designRevision}`,
        record.owner || APP_USER.name,
      );
      const finalRecord = { ...saved, history: audited.history };
      setState((previous) => ({
        ...previous,
        handovers: existing
          ? previous.handovers.map((row) => (row.id === id ? finalRecord : row))
          : [finalRecord, ...previous.handovers],
      }));
      return { id };
    };

    const deleteDraft = (id) => {
      const record = getHandover(id);
      if (!record) return { error: 'Handover not found.' };
      if (record.status !== 'Draft') return { error: 'Only a Draft handover can be deleted.' };
      setState((previous) => ({
        ...previous,
        handovers: previous.handovers.filter((row) => row.id !== id),
        packages: previous.packages.filter((row) => row.handoverId !== id),
      }));
      return {};
    };

    const createPackage = (handoverId, { preparedBy = APP_USER.name, notes = '' } = {}) => {
      const handover = getHandover(handoverId);
      if (!handover) return { error: 'Handover not found.' };
      if (getPackage(handoverId)) return { error: 'This handover already has a final design package.' };
      if (handover.release) return { error: 'A released handover package cannot be recreated.' };
      const packageRecord = {
        id: nextPackageId(),
        handoverId,
        version: '1.0',
        status: 'Draft',
        preparedBy,
        preparedDate: TODAY,
        notes,
        items: [],
        createdAt: TODAY,
        updatedAt: TODAY,
        history: [{ id: `PH-${Date.now()}`, at: stamp(), action: 'Final design package created', detail: `Package for ${handover.id}.`, by: preparedBy }],
      };
      setState((previous) => ({
        ...previous,
        packages: [packageRecord, ...previous.packages],
        handovers: previous.handovers.map((row) =>
          row.id === handoverId
            ? withHistory(row, 'Final design package created', `${packageRecord.id} v${packageRecord.version}`, preparedBy)
            : row,
        ),
      }));
      return { id: packageRecord.id };
    };

    const togglePackageItem = (handoverId, categoryKey, selected) => {
      const packageRecord = getPackage(handoverId);
      const handover = getHandover(handoverId);
      if (!packageRecord || !handover) return { error: 'Create the final design package first.' };
      if (packageRecord.status === 'Released') return { error: 'Released package selections are locked.' };
      const category = catalogsFor(handover).find((entry) => entry.key === categoryKey);
      if (!category) return { error: 'Unknown document category.' };
      const actual = category.sources.find((entry) => entry.sourceId === selected.sourceId);
      if (!actual) return { error: 'The selected source record is unavailable.' };
      const exists = (packageRecord.items || []).some(
        (item) => item.category === categoryKey && item.sourceId === actual.sourceId,
      );
      const items = exists
        ? packageRecord.items.filter((item) => !(item.category === categoryKey && item.sourceId === actual.sourceId))
        : [
            ...(packageRecord.items || []),
            {
              category: categoryKey,
              sourceId: actual.sourceId,
              label: actual.label,
              revision: actual.revision,
              status: actual.status,
              sourceModule: actual.sourceModule,
              selectedAt: TODAY,
              selectedBy: APP_USER.name,
            },
          ];
      setState((previous) => ({
        ...previous,
        packages: previous.packages.map((row) =>
          row.id === packageRecord.id
            ? {
                ...row,
                items,
                status: 'Draft',
                updatedAt: TODAY,
                history: [
                  ...(row.history || []),
                  { id: `PH-${Date.now()}`, at: stamp(), action: exists ? 'Source document removed' : 'Source document linked', detail: `${category.label} · ${actual.label}`, by: APP_USER.name },
                ],
              }
            : row,
        ),
        handovers: previous.handovers.map((row) =>
          row.id === handoverId
            ? withHistory(row, exists ? 'Package document removed' : 'Package document linked', `${category.label} · ${actual.label}`, APP_USER.name)
            : row,
        ),
      }));
      return {};
    };

    const savePackageDetails = (handoverId, { preparedBy, notes }) => {
      const packageRecord = getPackage(handoverId);
      if (!packageRecord) return { error: 'Package not found.' };
      if (packageRecord.status === 'Released') return { error: 'Released package details are locked.' };
      setState((previous) => ({
        ...previous,
        packages: previous.packages.map((row) =>
          row.id === packageRecord.id
            ? { ...row, preparedBy: preparedBy || row.preparedBy, notes, updatedAt: TODAY, history: [...(row.history || []), { id: `PH-${Date.now()}`, at: stamp(), action: 'Package details updated', detail: 'Prepared-by and package notes updated.', by: APP_USER.name }] }
            : row,
        ),
      }));
      return {};
    };

    const markPackagePrepared = (handoverId) => {
      const packageRecord = getPackage(handoverId);
      if (!packageRecord) return { error: 'Create the final design package first.' };
      if (packageRecord.status === 'Released') return { error: 'This package has already been released.' };
      const completeness = packageCompleteness(packageRecord);
      if (completeness.missingMandatory.length) {
        return { error: `Link every mandatory category first. Missing: ${completeness.missingMandatory.map((category) => category.label).join(', ')}.` };
      }
      setState((previous) => ({
        ...previous,
        packages: previous.packages.map((row) =>
          row.id === packageRecord.id
            ? withHistory({ ...row, status: 'Prepared', preparedDate: TODAY, updatedAt: TODAY }, 'Package marked Prepared', `${completeness.selectedMandatory}/${completeness.mandatoryTotal} mandatory categories linked`, row.preparedBy)
            : row,
        ),
        handovers: previous.handovers.map((row) =>
          row.id === handoverId
            ? withHistory(row, 'Final design package prepared', `${packageRecord.id} v${packageRecord.version}`, packageRecord.preparedBy)
            : row,
        ),
      }));
      return {};
    };

    const reopenPackage = (handoverId) => {
      const packageRecord = getPackage(handoverId);
      if (!packageRecord) return { error: 'Package not found.' };
      if (packageRecord.status === 'Released') return { error: 'A released package cannot be reopened.' };
      setState((previous) => ({
        ...previous,
        packages: previous.packages.map((row) =>
          row.id === packageRecord.id
            ? { ...row, status: 'Draft', updatedAt: TODAY, history: [...(row.history || []), { id: `PH-${Date.now()}`, at: stamp(), action: 'Package reopened', detail: 'Package returned to Draft for correction.', by: APP_USER.name }] }
            : row,
        ),
      }));
      return {};
    };

    const runValidation = (handoverId) => {
      const handover = getHandover(handoverId);
      if (!handover) return { error: 'Handover not found.' };
      if (handover.release) return { error: 'This handover has already been released.' };
      const packageRecord = getPackage(handoverId);
      const design = designs.find((row) => row.id === handover.designId);
      const project = projects.find((row) => row.id === handover.projectId);
      const validation = evaluateValidation({
        handover,
        packageRecord,
        project,
        design,
        boms,
        definitions,
        inspections,
        processPlans,
        reviews,
        changes,
      });
      const blocking = validationBlocking(validation);
      const nextStatus = blocking ? 'Validation Failed' : 'Ready for Release';
      setState((previous) => ({
        ...previous,
        handovers: previous.handovers.map((row) =>
          row.id === handoverId
            ? withHistory(
                { ...row, validation, status: nextStatus, updatedAt: TODAY },
                blocking ? 'Release validation failed' : 'Release validation passed',
                `${validation.results.filter((item) => item.result === 'Pass').length} pass · ${validation.results.filter((item) => item.result === 'Fail').length} fail · ${validation.results.filter((item) => item.result === 'Not Applicable').length} N/A`,
                APP_USER.name,
              )
            : row,
        ),
      }));
      return { validation, blocking, status: nextStatus };
    };

    const releaseDesign = (handoverId, { confirmed = false, releasedBy = APP_USER.name } = {}) => {
      if (!confirmed) return { error: 'Confirm the design release before continuing.' };
      const handover = getHandover(handoverId);
      if (!handover) return { error: 'Handover not found.' };
      if (handover.release) return { error: 'This design revision has already been released.' };
      const packageRecord = getPackage(handoverId);
      if (!packageRecord || packageRecord.status !== 'Prepared') {
        return { error: 'The final design package must be marked Prepared before release.' };
      }
      const design = designs.find((row) => row.id === handover.designId);
      const project = projects.find((row) => row.id === handover.projectId);
      const validation = evaluateValidation({
        handover,
        packageRecord,
        project,
        design,
        boms,
        definitions,
        inspections,
        processPlans,
        reviews,
        changes,
      });
      if (validationBlocking(validation)) {
        return { error: 'Release is blocked by failed mandatory validation checks. Run validation and resolve the failures.' };
      }
      const release = {
        id: nextReleaseId(),
        handoverId,
        projectId: handover.projectId,
        designId: handover.designId,
        designRevision: handover.designRevision,
        packageId: packageRecord.id,
        packageVersion: packageRecord.version,
        date: TODAY,
        releasedBy,
        status: 'Released',
        validationCheckedAt: validation.checkedAt,
        sourceReferences: (packageRecord.items || []).map((item) => ({
          category: item.category,
          sourceId: item.sourceId,
          label: item.label,
          revision: item.revision,
          status: item.status,
        })),
        history: [{ id: `RH-${Date.now()}`, at: stamp(), action: 'Design release recorded', detail: `${packageRecord.id} v${packageRecord.version}`, by: releasedBy }],
      };
      setState((previous) => ({
        ...previous,
        releases: [release, ...previous.releases],
        packages: previous.packages.map((row) =>
          row.id === packageRecord.id ? { ...row, status: 'Released', updatedAt: TODAY } : row,
        ),
        handovers: previous.handovers.map((row) =>
          row.id === handoverId
            ? withHistory(
                { ...row, validation, release, status: 'Released', actualHandoverDate: row.actualHandoverDate || '', updatedAt: TODAY },
                'Design released',
                `${release.id} · ${release.designId} Rev ${release.designRevision} · ${release.packageId} v${release.packageVersion}`,
                releasedBy,
              )
            : row,
        ),
      }));
      return { release };
    };

    const pushTransfer = ({ handover, release, packageRecord, method, status, remarks, preparedBy, destinationReference = '', downloaded = false }) => {
      const transfer = {
        id: nextTransferId(),
        handoverId: handover.id,
        handoverNumber: handover.id,
        projectId: handover.projectId,
        projectName: projects.find((row) => row.id === handover.projectId)?.name || handover.projectId,
        designId: handover.designId,
        designName: designs.find((row) => row.id === handover.designId)?.name || '',
        designRevision: handover.designRevision,
        packageId: packageRecord.id,
        packageVersion: packageRecord.version,
        releaseId: release.id,
        method,
        status,
        preparedBy: preparedBy || APP_USER.name,
        preparedDate: TODAY,
        exportDate: downloaded ? TODAY : '',
        actualTransferDate: '',
        destinationReference: destinationReference.trim(),
        remarks: remarks.trim(),
        manifestGenerated: downloaded,
        createdAt: stamp(),
      };
      setState((previous) => ({
        ...previous,
        transfers: [transfer, ...previous.transfers],
        handovers: previous.handovers.map((row) =>
          row.id === handover.id
            ? withHistory(
                { ...row, status: 'Export Prepared', updatedAt: TODAY },
                downloaded ? 'Manual export manifest generated' : 'Manual handover attempt recorded',
                `${transfer.id} · ${method} · ${status}`,
                transfer.preparedBy,
              )
            : row,
        ),
      }));
      return transfer;
    };

    const recordManualTransfer = (handoverId, { method, remarks = '', destinationReference = '', preparedBy = APP_USER.name } = {}) => {
      const handover = getHandover(handoverId);
      if (!handover) return { error: 'Handover not found.' };
      const release = getRelease(handoverId);
      const packageRecord = getPackage(handoverId);
      if (!release || !packageRecord) return { error: 'The design must be released before a handover attempt is recorded.' };
      if (!method) return { error: 'Select a manual transfer method.' };
      const transfer = pushTransfer({
        handover,
        release,
        packageRecord,
        method,
        status: 'Integration Pending',
        remarks: remarks || 'Direct ERP Production import is unavailable; manual handover remains pending.',
        preparedBy,
        destinationReference,
        downloaded: false,
      });
      return { transfer };
    };

    const exportManifest = (handoverId, { preparedBy = APP_USER.name, download = true } = {}) => {
      const handover = getHandover(handoverId);
      if (!handover) return { error: 'Handover not found.' };
      const release = getRelease(handoverId);
      const packageRecord = getPackage(handoverId);
      if (!release || !packageRecord) return { error: 'Release the design before exporting a package manifest.' };
      const catalogs = catalogsFor(handover);
      const manifest = buildReleaseManifest({
        handover,
        packageRecord,
        project: projects.find((row) => row.id === handover.projectId),
        design: designs.find((row) => row.id === handover.designId),
        release,
        catalogs,
        preparedBy,
      });
      if (download) {
        try {
          const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${handover.id}-design-package-manifest.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch {
          const failed = pushTransfer({
            handover,
            release,
            packageRecord,
            method: 'Manual Export — JSON manifest',
            status: 'Export Failed',
            remarks: 'The browser could not generate the manifest download.',
            preparedBy,
          });
          return { error: 'The browser blocked the file download. The failed attempt was retained in Transfer History.', transfer: failed };
        }
      }
      const transfer = pushTransfer({
        handover,
        release,
        packageRecord,
        method: 'Manual Export — JSON manifest',
        status: 'Ready for Export',
        remarks: 'Manifest generated locally. Production acknowledgement has not been received.',
        preparedBy,
        downloaded: download,
      });
      return { manifest, transfer };
    };

    const retryTransfer = (transferId) => {
      const attempt = state.transfers.find((row) => row.id === transferId);
      if (!attempt) return { error: 'Transfer attempt not found.' };
      return exportManifest(attempt.handoverId, { preparedBy: APP_USER.name, download: true });
    };

    return {
      handovers: state.handovers,
      packages: state.packages,
      releases: state.releases,
      transfers: state.transfers,
      nextHandoverId,
      nextPackageId,
      nextReleaseId,
      getHandover,
      findHandoverForRevision,
      getPackage,
      getRelease,
      transfersFor,
      catalogsFor,
      saveHandover,
      deleteDraft,
      createPackage,
      togglePackageItem,
      savePackageDetails,
      markPackagePrepared,
      reopenPackage,
      runValidation,
      releaseDesign,
      recordManualTransfer,
      exportManifest,
      retryTransfer,
      stats: {
        total: state.handovers.length,
        ready: state.handovers.filter((row) => row.status === 'Ready for Release').length,
        released: state.handovers.filter((row) => Boolean(row.release)).length,
        exportPrepared: state.handovers.filter((row) => row.status === 'Export Prepared').length,
        pending: state.transfers.filter((row) => row.status === 'Integration Pending').length,
      },
    };
  }, [state, projects, designs, parts, assemblies, simulationReports, analysisReports, definitions, inspections, processPlans, boms, cadFiles, drawings, reviews, changes]);

  return <DesignHandoverContext.Provider value={value}>{children}</DesignHandoverContext.Provider>;
}

export function useDesignHandover() {
  const context = useContext(DesignHandoverContext);
  if (!context) throw new Error('useDesignHandover must be used inside DesignHandoverProvider');
  return context;
}
