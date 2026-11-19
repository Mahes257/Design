import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Link2, X } from 'lucide-react';
import { Button } from '../components/common';
import { useCustomerEnquiries } from './CustomerEnquiryContext';
import { useQuotationReview } from './QuotationReviewContext';
import { useProjects } from './ProjectsContext';
import { usePlanning } from './PlanningContext';
import { useConcept } from './ConceptContext';
import { useMechanical } from './MechanicalContext';
import { useAnalysis } from './AnalysisContext';
import { useManufacturing } from './ManufacturingContext';
import { useBom } from './BomContext';
import { useCad } from './CadContext';
import { useApprovals } from './ApprovalsContext';
import { useEngineeringRelease } from './EngineeringReleaseContext';
import { useTransfers } from './TransfersContext';
import { ENGINEERS, TODAY, addDays } from '../data/projectData';
import { createEmptyQuotationForm, PROJECT_DELIVERABLES, projectDomainForCategory, suggestedProjectName } from '../data/quotationReviewData';
import { newReviewChecklists } from '../data/approvalsData';

const STORAGE_KEY = 'md-workflow-conversions-v1';

function loadPersisted() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(parsed?.links) ? parsed.links : [];
  } catch {
    return [];
  }
}

const WorkflowConversionContext = createContext(null);

const TYPE_LABELS = {
  enquiry: 'Customer Enquiry',
  quotation: 'Quotation',
  project: 'Project',
  plan: 'Design Plan',
  task: 'Design Task',
  concept: 'Concept',
  design: 'Mechanical Design',
  analysis: 'Engineering Analysis',
  manufacturing: 'Manufacturing Definition',
  bom: 'BOM',
  drawing: 'Drawing',
  review: 'Design Review',
  change: 'Engineering Change',
  transfer: 'Transfer',
};

const TARGET_PATHS = {
  quotation: (id) => `/quotation-review/${id}`,
  project: (id) => `/projects/${id}`,
  plan: () => '/design-planning',
  task: () => '/design-planning/tasks-progress',
  design: () => '/mechanical-design/design-register',
  analysis: () => '/engineering-analysis',
  manufacturing: () => '/manufacturing-design/definition',
  bom: (id) => `/bom-cost/bom/${id}`,
  drawing: () => '/cad-management/drawings',
  review: (id) => `/design-review/review/${id}`,
  change: (id) => `/engineering-release?ecr=${id}`,
  transfer: (id) => `/transfers/${id}`,
};

function stamp() {
  const now = new Date();
  return `${TODAY}T${now.toTimeString().slice(0, 8)}`;
}

function suffix(id) {
  return String(id || '').split('-').pop();
}

export function WorkflowConversionProvider({ children }) {
  const navigate = useNavigate();
  const { enquiries, updateStatus: updateEnquiryStatus } = useCustomerEnquiries();
  const { quotations, addQuotation, markConverted } = useQuotationReview();
  const { projects, nextProjectId, addProject, addMember, team } = useProjects();
  const { plans, tasks, addPlan, addTask } = usePlanning();
  const { concepts, addConcept, updateConcept } = useConcept();
  const { designs, parts, addDesign, nextDesignId } = useMechanical();
  const { analyses, addAnalysis, nextAnalysisId } = useAnalysis();
  const { addRecord, nextId: nextMfgId } = useManufacturing();
  const { boms, addBom, nextBomId } = useBom();
  const { drawings, addDrawing, nextDrawingId } = useCad();
  const { reviews, addReview, nextReviewId } = useApprovals();
  const { changes, addChange, nextChangeId } = useEngineeringRelease();
  const { transfers, saveTransfer, nextTransferId } = useTransfers();

  const [links, setLinks] = useState(loadPersisted);
  const [dialog, setDialog] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ links }));
    } catch {
      // The session still works when storage is unavailable.
    }
  }, [links]);

  const linkedFrom = (type, id) => links.find((row) => row.sourceType === type && row.sourceId === id);
  const linkedTo = (type, id) => links.filter((row) => row.targetType === type && row.targetId === id);
  const hasTarget = (type, id, targetType) =>
    links.some((row) => row.sourceType === type && row.sourceId === id && row.targetType === targetType);

  const pushLink = (link) => {
    setLinks((previous) => [
      { id: `CV-${Date.now()}-${previous.length + 1}`, at: stamp(), by: 'N. Joshi', ...link },
      ...previous,
    ]);
  };

  const targetsFor = (type, record) => {
    if (!record) return [];
    const target = (key, label, enabled, reason = '') => ({ key, label, enabled, reason });
    if (type === 'enquiry') {
      const existingQuotation = quotations.some((row) => row.linkedEnquiryId === record.id) || Boolean(record.quotationRef);
      return [
        target('quotation', 'Create Quotation', ['Ready for Quotation', 'Quotation Prepared'].includes(record.status) && !existingQuotation && !hasTarget(type, record.id, 'quotation'), existingQuotation ? 'This enquiry already has a linked quotation.' : 'The enquiry must be Ready for Quotation first.'),
      ];
    }
    if (type === 'quotation') {
      return [target('project', 'Convert to Project', record.status === 'Accepted' && !record.convertedProjectId && !hasTarget(type, record.id, 'project'), 'Only an accepted quotation can initiate a project.')];
    }
    if (type === 'project') {
      return [target('plan', 'Create Design Plan', !hasTarget(type, record.id, 'plan'), 'A design plan is already linked to this project.')];
    }
    if (type === 'plan') {
      return [target('task', 'Create Design Task', !hasTarget(type, record.id, 'task'), 'A design task is already linked to this plan.')];
    }
    if (type === 'concept') {
      return [target('design', 'Open Mechanical Design', record.status === 'Selected' && !hasTarget(type, record.id, 'design'), record.status === 'Selected' ? 'A mechanical design is already linked to this concept.' : 'Select the concept before starting detailed design.')];
    }
    if (type === 'design') {
      return [
        target('analysis', 'Create Engineering Analysis', !hasTarget(type, record.id, 'analysis'), 'An analysis is already linked to this design.'),
        target('review', 'Submit Design Package for Review', ['Completed', 'Released'].includes(record.status) && !hasTarget(type, record.id, 'review'), 'Complete the mechanical design before submitting it for review.'),
      ];
    }
    if (type === 'analysis') {
      return [target('manufacturing', 'Create Manufacturing Definition', record.verificationStatus === 'Verified' && !hasTarget(type, record.id, 'manufacturing'), record.verificationStatus === 'Verified' ? 'A manufacturing definition is already linked.' : 'Verify the analysis before manufacturing design.')];
    }
    if (type === 'manufacturing') {
      return [target('bom', 'Create BOM', ['Approved', 'Released'].includes(record.status) && !hasTarget(type, record.id, 'bom'), ['Approved', 'Released'].includes(record.status) ? 'A BOM is already linked.' : 'Approve the manufacturing definition before creating the BOM.')];
    }
    if (type === 'bom') {
      return [
        target('drawing', 'Create Drawing Record', record.status === 'Released' && !hasTarget(type, record.id, 'drawing'), record.status === 'Released' ? 'A drawing is already linked to this BOM.' : 'Release the BOM before creating its drawing record.'),
        target('transfer', 'Create Purchase / Production Transfer', record.status === 'Released' && !hasTarget(type, record.id, 'transfer'), 'Release the BOM before creating a transfer.'),
        target('review', 'Submit Design Package for Review', ['Approved', 'Released'].includes(record.status) && !hasTarget(type, record.id, 'review'), 'Approve or release the BOM before design review.'),
      ];
    }
    if (type === 'drawing') {
      return [
        target('transfer', 'Create Purchase / Production Transfer', record.approvalStatus === 'Released' && !hasTarget(type, record.id, 'transfer'), 'Release the drawing before creating a transfer.'),
        target('review', 'Submit Drawing for Review', ['Approved', 'Released'].includes(record.approvalStatus) && !hasTarget(type, record.id, 'review'), 'Approve the drawing before submission.'),
      ];
    }
    if (type === 'review') {
      return [target('change', 'Raise Engineering Change (ECR)', ['Approved', 'Released'].includes(record.status) && !hasTarget(type, record.id, 'change'), 'The review must be approved before an ECR can be raised.')];
    }
    return [];
  };

  const openConversion = (type, record) => {
    setFeedback(null);
    const firstEnabled = targetsFor(type, record).find((row) => row.enabled);
    setDialog({ type, record, targetKey: firstEnabled?.key || '' });
  };

  const runConversion = (type, source, targetKey) => {
    const target = targetsFor(type, source).find((row) => row.key === targetKey);
    if (!target) return { error: 'This conversion is not available.' };
    if (!target.enabled) return { error: target.reason || 'This record is not eligible for conversion.' };
    if (hasTarget(type, source.id, targetKey)) return { error: 'This record has already been converted to that destination.' };

    try {
      if (targetKey === 'quotation') {
        const form = createEmptyQuotationForm(source);
        const result = addQuotation({ ...form, status: 'Draft', linkedEnquiryId: source.id });
        if (result?.error) return { error: result.error };
        if (source.status !== 'Quotation Prepared') {
          const statusResult = updateEnquiryStatus(source.id, 'Quotation Prepared', { quotationRef: result.id, note: `Quotation ${result.id} created from this enquiry.` });
          if (statusResult?.error) return { error: statusResult.error };
        }
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'quotation', targetId: result.id, label: 'Enquiry converted to quotation' });
        return { targetId: result.id, targetType: 'quotation', message: `${result.id} created from ${source.id}.` };
      }

      if (targetKey === 'project') {
        const projectId = nextProjectId();
        const domain = projectDomainForCategory(source.customerCategory || '');
        const project = {
          id: projectId, name: suggestedProjectName(source), reference: source.quotationRef,
          customer: source.customerName || 'Customer', product: source.productConfiguration.split('—')[0].trim() || source.productConfiguration,
          description: `Project initiated from accepted quotation ${source.quotationRef} (Rev ${source.revision}) against customer enquiry ${source.linkedEnquiryId}. ${source.preliminarySpecifications}`,
          domain, scope: `Engineering delivery for ${source.productConfiguration}. Technical basis accepted through quotation ${source.quotationRef}.`,
          technicalRequirements: source.preliminarySpecifications, constraints: source.materialAssumptions,
          expectedDeliverables: PROJECT_DELIVERABLES.join(', '), type: 'New Design', priority: source.priority || 'Medium',
          manager: 'R. Kulkarni', reviewer: source.review?.assignedReviewer || 'N. Joshi', analysisEngineer: 'A. Iyer',
          manufacturingEngineer: 'K. Pillai', engineers: [source.engineeringOwner, source.review?.assignedReviewer].filter(Boolean),
          members: [], deliverables: PROJECT_DELIVERABLES, start: TODAY, target: source.targetDeliveryEstimate || addDays(TODAY, 90),
          progress: 0, status: 'New Request', delayed: false, archived: false, attachments: 0, attachmentFiles: [],
          sourceEnquiryId: source.linkedEnquiryId, sourceQuotationId: source.quotationRef, sourceQuotationRevision: source.revision,
          sourceQuotationInternalId: source.id, cprReference: '', cprStatus: 'Not Started', cprOwner: '', cprReviewDate: '', cprNotes: '',
        };
        addProject(project);
        const highest = team.reduce((max, member) => Math.max(max, Number(String(member.id).split('-').pop()) || 100), 100);
        [{ name: project.manager, role: 'Project Manager' }, { name: source.review?.assignedReviewer, role: 'Technical Reviewer' }, { name: source.engineeringOwner, role: 'Design Engineer' }]
          .filter((member, index, list) => member.name && list.findIndex((row) => row.name === member.name) === index)
          .forEach((member, index) => addMember({ id: `TM-${highest + index + 1}`, name: member.name, role: member.role, discipline: domain, projectId, responsibilities: `${member.role} for ${project.name}`, allocation: member.role === 'Project Manager' ? 40 : 50 }));
        const marked = markConverted(source.id, projectId);
        if (marked?.error) return { error: marked.error };
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'project', targetId: projectId, label: 'Accepted quotation converted to project' });
        return { targetId: projectId, targetType: 'project', message: `${projectId} created from ${source.id}.` };
      }

      if (targetKey === 'plan') {
        const nextPlanNumber = plans.reduce((max, row) => Math.max(max, Number(suffix(row.id)) || 0), 0) + 1;
        const plan = { id: `DPL-2026-${String(nextPlanNumber).padStart(3, '0')}`, projectId: source.id, name: `${source.name} Design Plan`, owner: source.manager || ENGINEERS[0], start: TODAY, due: addDays(TODAY, 90), status: 'Draft', notes: `Created from project ${source.id}.` };
        addPlan(plan);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'plan', targetId: plan.id, label: 'Project converted to design plan' });
        return { targetId: plan.id, targetType: 'plan', message: `${plan.id} created from ${source.id}.` };
      }

      if (targetKey === 'task') {
        const design = designs.find((row) => row.projectId === source.projectId);
        const task = { id: `TSK-${2100 + tasks.length + 1}`, name: `${source.name.replace(/ Design Plan$/i, '')} Design Task`, projectId: source.projectId, designId: design?.id || '', discipline: 'Machine Design', engineer: source.owner || ENGINEERS[0], start: source.start || TODAY, due: source.due || addDays(TODAY, 21), priority: 'Medium', dependencies: [], progress: 0, status: 'Not Started', effort: 24, notes: `Created from design plan ${source.id}.` };
        addTask(task);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'task', targetId: task.id, label: 'Design plan converted to design task' });
        return { targetId: task.id, targetType: 'task', message: `${task.id} created from ${source.id}.` };
      }

      if (targetKey === 'design') {
        const id = nextDesignId();
        const design = { id, name: `${source.name} Mechanical Design`, projectId: source.projectId, conceptId: source.id, description: source.description || `Detailed design from ${source.name}.`, category: 'Mechanisms', domain: 'Machine Design', owner: source.createdBy || ENGINEERS[0], engineer: source.createdBy || ENGINEERS[0], reviewer: 'N. Joshi', priority: 'Medium', scope: source.preliminarySpecifications || source.designObjectives || '', target: addDays(TODAY, 60), status: 'In Design', revision: 'A', created: TODAY, revisions: [], documents: [], activity: [], linkedPartIds: [], linkedAssemblyIds: [], tech: { material: source.materialSelection || '', designNotes: source.technicalNotes || '', loadInfo: '', shaftDiameter: '', shaftLength: '', rotationalSpeed: '', gearRatio: '', bearingType: '', componentType: '' }, technicalNotes: source.technicalNotes || '', cadRef: '' };
        addDesign(design);
        updateConcept(source.id, { status: 'In Design' });
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'design', targetId: id, label: 'Selected concept converted to mechanical design' });
        return { targetId: id, targetType: 'design', message: `${id} created from ${source.id}.` };
      }

      if (targetKey === 'analysis') {
        const id = nextAnalysisId();
        const analysis = { id, title: `${source.name} Design Verification`, projectId: source.projectId, linkedType: 'design', linkedId: source.id, category: 'Stress & Strength', analysisType: 'Static stress check', description: `Verification of ${source.name} from mechanical design ${source.id}.`, engineer: source.engineer || ENGINEERS[0], reviewer: 'N. Joshi', priority: source.priority || 'Medium', target: addDays(TODAY, 30), created: TODAY, revision: 'A', revisions: [{ revision: 'A', date: TODAY, by: source.engineer || ENGINEERS[0], note: `Created from ${source.id}.` }], material: source.tech?.material || '', drawingRevision: source.revision || 'A', inputConditions: source.tech?.loadInfo || 'Input conditions to be confirmed.', boundaryConditions: 'To be defined by the analysis engineer.', assumptions: 'Linear elastic behaviour assumed until reviewed.', acceptanceCriteria: 'Factor of safety >= 2.0 against yield.', resultSummary: 'Analysis created; results pending.', verificationStatus: 'Draft', notes: `Created from mechanical design ${source.id}.`, attachments: [], activity: [], tech: { loadCaseId: `LC-${suffix(id)}`, loadType: 'Static', appliedLoad: source.tech?.loadInfo || '', strengthCriteria: 'Yield', allowableStressRef: '', factorOfSafetyRef: '', calcReportRef: '', stressValue: '' } };
        addAnalysis(analysis);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'analysis', targetId: id, label: 'Mechanical design converted to engineering analysis' });
        return { targetId: id, targetType: 'analysis', message: `${id} created from ${source.id}.` };
      }

      if (targetKey === 'manufacturing') {
        const id = nextMfgId('definition');
        const sourceTitle = source.name || source.title || source.id;
        const sourcePartId = source.partId || (source.linkedType === 'part' ? source.linkedId : '');
        const sourcePart = parts.find((row) => row.id === sourcePartId);
        const partNumber = sourcePart?.partNumber || source.drawingNo?.replace(/^DRG-/, '') || sourceTitle.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 24);
        const record = { id, kind: 'definition', name: `${sourceTitle} Manufacturing Definition`, projectId: source.projectId, projectName: projects.find((row) => row.id === source.projectId)?.name || '', partId: sourcePartId, assemblyId: source.assemblyId || '', partNumber, material: source.material || 'Material to be confirmed', analysisId: source.id, engineer: source.engineer || ENGINEERS[0], reviewer: 'N. Joshi', recordDate: TODAY, dueDate: addDays(TODAY, 30), revision: 'A', description: `Manufacturing definition from verified analysis ${source.id}.`, category: 'Fabrication', technical: { fabricationNotes: 'Derived from verified engineering analysis.', fitUpDetails: '', formingDetails: '', cuttingDetails: '', structuralComponents: source.title || '' }, inspectionType: 'Incoming inspection', points: [{ feature: '', method: '', unit: 'mm', frequency: '100%' }], characteristics: [{ name: '', criticality: 'Critical', dimension: '', toleranceRef: '' }], measurement: { method: '', equipment: '', unit: 'mm', instructions: '' }, acceptance: { min: '', max: '', description: '', standard: '' }, processType: 'Machining', sequence: [{ opNo: '', name: '', description: '', workstation: '', sequence: '', duration: '' }], instructions: [{ id: '', operation: '', details: '', requirements: '', refs: '' }], equipment: [{ name: '', type: '', specification: '', capacity: '', special: '' }], special: { safety: '', notes: '', handling: '', restrictions: '' }, notes: { description: '', engineeringRef: source.id, drawingRef: source.drawingRevision || '', additional: '' }, release: { packageId: '', releaseStatus: 'Not released', releaseDate: '', inspectionRef: '', processRevision: 'A' }, status: 'Draft', attachments: [], linkedDefinitionId: '', linkedInspectionId: '', drawingNo: source.drawingNo || '', drawingRevision: source.drawingRevision || 'A' };
        addRecord('definition', record);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'manufacturing', targetId: id, label: 'Verified analysis converted to manufacturing definition' });
        return { targetId: id, targetType: 'manufacturing', message: `${id} created from ${source.id}.` };
      }

      if (targetKey === 'bom') {
        const id = nextBomId();
        const partNumber = source.partNumber || source.drawingNo?.replace(/^DRG-/, '') || 'NEW-PART-001';
        const item = { id: `BI-${suffix(id)}-01`, partNumber, name: source.name, description: source.description || '', qty: 1, uom: 'nos', material: source.material || '', partRevision: source.revision || 'A', makeBuy: 'Make', unitCost: 0, assemblyId: source.assemblyId || '' };
        const bom = { id, name: `${projects.find((row) => row.id === source.projectId)?.name || source.name} BOM`, projectId: source.projectId, assemblyId: source.assemblyId || '', engineer: source.engineer || ENGINEERS[0], reviewer: 'N. Joshi', date: TODAY, dueDate: addDays(TODAY, 30), revision: 'A', description: `BOM created from manufacturing definition ${source.id}.`, status: 'Draft', attachments: [], items: [item], changeHistory: [{ id: `CH-${Date.now()}`, at: TODAY, by: source.engineer || ENGINEERS[0], action: 'BOM created', description: `Created from manufacturing definition ${source.id}.` }], statusHistory: [{ id: 'SH-1', status: 'Draft', at: TODAY, by: source.engineer || ENGINEERS[0], note: 'BOM created from manufacturing definition.' }], approvals: [], revisions: [{ revision: 'A', previous: '', date: TODAY, by: source.engineer || ENGINEERS[0], note: `Initial BOM from ${source.id}.`, status: 'Draft', items: [item] }] };
        addBom(bom);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'bom', targetId: id, label: 'Manufacturing definition converted to BOM' });
        return { targetId: id, targetType: 'bom', message: `${id} created from ${source.id}.` };
      }

      if (targetKey === 'drawing') {
        const id = nextDrawingId();
        const drawingNumber = `DRW-${suffix(source.id)}-A`;
        const record = { id, drawingNumber, title: `${source.name} Assembly Drawing`, drawingType: 'Assembly Drawing', projectId: source.projectId, partNumber: source.items?.[0]?.partNumber || '', partName: source.items?.[0]?.name || '', assemblyId: source.assemblyId || '', revision: 'A', format: 'SVG', preparedBy: source.engineer || ENGINEERS[0], reviewedBy: source.reviewer || 'N. Joshi', drawingDate: TODAY, description: `Drawing package created from released BOM ${source.id}.`, cadFileIds: [], bomRef: source.id, mfgRef: '', attachments: [], approvalStatus: 'Draft', releaseStatus: 'Not released', releasedAt: '', releaseRef: '', approvals: [], statusHistory: [{ id: `${id}-SH1`, status: 'Draft', at: TODAY, by: source.engineer || ENGINEERS[0], note: 'Drawing record created from BOM.' }], changeHistory: [{ id: `${id}-CH1`, at: TODAY, by: source.engineer || ENGINEERS[0], action: 'Drawing created', description: `Created from released BOM ${source.id}.` }], revisions: [{ revision: 'A', previous: '', date: TODAY, by: source.engineer || ENGINEERS[0], note: `Created from ${source.id}.`, status: 'Draft', meta: { title: `${source.name} Assembly Drawing`, drawingType: 'Assembly Drawing', description: '', format: 'SVG', cadFileIds: [], attachments: [] } }] };
        addDrawing(record);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'drawing', targetId: id, label: 'Released BOM converted to drawing record' });
        return { targetId: id, targetType: 'drawing', message: `${drawingNumber} created from ${source.id}.` };
      }

      if (targetKey === 'review') {
        const id = nextReviewId();
        const linkedBom = type === 'bom' ? source : boms.find((row) => row.projectId === source.projectId);
        const linkedDrawing = type === 'drawing' ? source : drawings.find((row) => row.projectId === source.projectId);
        const checklists = newReviewChecklists();
        const projectSuffix = source.projectId.split('-').pop();
        const review = { ...checklists, id, projectId: source.projectId, deliverableType: linkedDrawing ? 'Engineering Drawing' : 'Design Package', deliverableNumber: linkedDrawing?.drawingNumber || linkedBom?.id || source.id, deliverableName: linkedDrawing?.title || linkedBom?.name || source.name, revision: 'A', bomId: linkedBom?.id || '', bomRevision: linkedBom?.revision || '', drawingId: linkedDrawing?.id || '', drawingRevision: linkedDrawing?.revision || '', reviewDate: TODAY, partRef: linkedBom?.items?.[0]?.partNumber || '', priority: 'High', submittedBy: ENGINEERS[0], submittedAt: TODAY, dueDate: addDays(TODAY, 14), engineeringReviewer: 'N. Joshi', manufacturingReviewer: 'V. Sharma', clientRequired: false, clientReviewer: 'Client — A. Mehta', clientReference: `CL-2026-${projectSuffix}`, requiredStages: ['Engineering', 'Manufacturing'], currentStage: 'Draft', status: 'Draft', stageStates: { engineering: { status: 'Pending', reviewer: 'N. Joshi', decision: '', decidedAt: '', comments: '' }, manufacturing: { status: 'Pending', reviewer: 'V. Sharma', decision: '', decidedAt: '', comments: '' }, client: { status: 'Not Required', reviewer: 'Client — A. Mehta', decision: '', decidedAt: '', submittedAt: '', comments: '', requestedChanges: '' } }, designReview: { notes: `Design package submitted from ${source.id}.`, drawingReferences: [linkedDrawing?.drawingNumber || source.id], notesExtra: 'Only the submitted revision is under review.' }, technical: { requirements: [], linkedCalculations: [], analysisRefs: [], stressEvidence: 'No stress evidence reference recorded yet.', thermalEvidence: 'Not applicable or not yet recorded.', motionEvidence: 'Not applicable or not yet recorded.', materialSpecs: 'Material and specification references to be confirmed during engineering review.', assumptions: 'Input conditions and assumptions to be confirmed from the linked calculation.', acceptanceCriteria: 'Acceptance criteria to be confirmed against the design basis.', attachments: [] }, manufacturing: { feasibility: 'Manufacturing feasibility to be assessed by the manufacturing reviewer.', accessibility: 'Component accessibility to be assessed.', assemblyFeasibility: 'Assembly feasibility to be assessed.', constraints: 'Manufacturing constraints to be recorded.', specialRequirements: 'No special manufacturing requirements recorded yet.', dimensionalTolerances: 'To be reviewed against the submitted drawing.', geometricTolerances: 'To be reviewed against the submitted drawing.', fits: 'Fits and clearances to be reviewed.', criticalDimensions: 'Critical dimensions to be identified by the reviewer.', toleranceNotes: 'No tolerance notes recorded yet.', drawingRefs: 'Refer to the submitted revision only.', machining: 'Process suitability to be assessed.', fabrication: 'Process suitability to be assessed.', welding: 'Process suitability to be assessed.', sheetMetal: 'Process suitability to be assessed.', processes: [], equipment: [], processConstraints: 'To be recorded during manufacturing review.', inspectionPoints: 'Inspection points to be defined by the manufacturing reviewer.', criticalCharacteristics: 'Critical characteristics to be identified.', measurement: 'Measurement requirements to be defined.', acceptance: 'Acceptance criteria to be reviewed.', inspectionRefs: 'Inspection plan reference to be confirmed by Quality Control.', inspectionNotes: 'Inspection execution remains in the Quality Control module.' }, comments: [], attachments: [], clientSubmission: { notes: '', submittedAt: '', clientReviewer: 'Client — A. Mehta', clientReference: `CL-2026-${projectSuffix}`, attachments: [] }, clientHistory: [], clientComments: [], history: [], approvals: [], release: null, resubmissions: [], submissionNotes: `Created from ${source.id}.`, reviewInstructions: 'Review the submitted revision against the applicable checklists and accepted evidence.' };
        addReview(review);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'review', targetId: id, label: 'Design package converted to design review' });
        return { targetId: id, targetType: 'review', message: `${id} created from ${source.id}.` };
      }

      if (targetKey === 'change') {
        const bom = boms.find((row) => row.projectId === source.projectId && ['Approved', 'Released'].includes(row.status));
        const drawing = drawings.find((row) => row.projectId === source.projectId && !['Superseded', 'Withdrawn'].includes(row.approvalStatus));
        if (!bom || !drawing) return { error: 'A controlled BOM and drawing are required before raising an ECR.' };
        const id = nextChangeId();
        const result = addChange({ id, projectId: source.projectId, title: `Change from review ${source.id}`, changeReason: `Design review ${source.id} identified a required change.`, affectedParts: bom.items?.map((row) => row.partNumber).filter(Boolean).join(' · ') || bom.id, affectedAssemblies: bom.assemblyId || '', impact: 'Change impact to be assessed by the change board.', impactLevel: 'Medium', bomId: bom.id, drawingId: drawing.id, currentBomRevision: bom.revision, currentDrawingRevision: drawing.revision, currentRevision: drawing.revision, proposedBomRevision: 'B', proposedDrawingRevision: 'B', proposedRevision: 'B', reviewer: 'N. Joshi', raisedBy: 'N. Joshi', firstRelease: false });
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'change', targetId: result.id || id, label: 'Approved review raised an engineering change' });
        return { targetId: result.id || id, targetType: 'change', message: `${result.id || id} created from ${source.id}.` };
      }

      if (targetKey === 'transfer') {
        const id = nextTransferId();
        const isBom = type === 'bom';
        const deliverableType = isBom ? 'BOM' : 'Drawing';
        const deliverableNumber = isBom ? source.id : source.drawingNumber;
        const deliverableName = isBom ? source.name : source.title;
        const linkedReview = links.find((row) => row.sourceType === type && row.sourceId === source.id && row.targetType === 'review')
          || reviews.find((row) => row.projectId === source.projectId && ['Approved', 'Released'].includes(row.status));
        const materialRequirements = isBom
          ? (source.items || []).map((item, index) => ({ id: `MREQ-${suffix(id)}-${index + 1}`, materialCode: item.material || 'UNSPECIFIED', description: item.name || item.partNumber, qty: Number(item.qty) || 1, uom: item.uom || 'nos', unitCost: Number(item.unitCost) || 0, itemId: item.id }))
          : [];
        const record = {
          id,
          sourceId: source.id,
          projectId: source.projectId,
          deliverableType,
          deliverableName,
          deliverableNumber,
          revision: source.revision || 'A',
          reviewId: linkedReview?.targetId || linkedReview?.id || '',
          releaseId: isBom ? source.releaseRef || '' : source.releaseRef || '',
          releaseDate: TODAY,
          sourceModule: isBom ? 'BOM & Cost Estimation' : 'Drawing & CAD Management',
          destinations: ['Purchase'],
          destination: 'Purchase',
          priority: 'High',
          initiatedBy: 'N. Joshi',
          transferDate: TODAY,
          notes: `Transfer prepared from released ${deliverableType.toLowerCase()} ${source.id}.`,
          validation: null,
          manualStatus: 'Draft',
          attachments: [],
          contents: {
            bomItems: isBom ? source.items || [] : [],
            materialRequirements,
            drawingReferences: isBom ? [] : [`${deliverableNumber} Rev ${source.revision}`],
            manufacturingPackage: '',
            technicalNotes: `Controlled handover of ${deliverableNumber} Rev ${source.revision}.`,
            attachments: [],
          },
          purchase: { included: true, status: 'Not Prepared', requisitions: [], workflow: [], handover: null, acknowledgement: null, comments: [], progress: { requisition: 'Not Started', handover: 'Not Started', acknowledgement: 'Pending', workflow: 'Not Started', mockPurchase: 'Not Started', outstanding: '', remarks: '' } },
          production: { included: false, status: 'Not Prepared', package: null, handover: null, acknowledgement: null, comments: [], progress: { drawingRelease: 'Not Started', packagePreparation: 'Not Started', handover: 'Not Started', acknowledgement: 'Pending', readiness: 'Not Started', mockProduction: 'Not Started', outstanding: '', remarks: '' } },
          status: 'Draft',
        };
        saveTransfer(record);
        pushLink({ sourceType: type, sourceId: source.id, targetType: 'transfer', targetId: id, label: 'Released deliverable converted to transfer draft' });
        return { targetId: id, targetType: 'transfer', message: `${id} created from ${source.id}. Validate it before handover.` };
      }
    } catch (error) {
      return { error: error?.message || 'The conversion could not be completed.' };
    }
    return { error: 'This destination is not implemented.' };
  };

  const confirmConversion = () => {
    if (!dialog?.targetKey) return;
    const result = runConversion(dialog.type, dialog.record, dialog.targetKey);
    if (result.error) {
      setFeedback({ tone: 'error', message: result.error });
      return;
    }
    setFeedback({ tone: 'success', message: result.message, targetType: result.targetType, targetId: result.targetId });
    setDialog((previous) => (previous ? { ...previous, record: null } : previous));
  };

  const value = useMemo(
    () => ({
      links,
      typeLabels: TYPE_LABELS,
      targetsFor,
      openConversion,
      linkedFrom,
      linkedTo,
      hasTarget,
      runConversion,
    }),
    // The conversion functions close over the live provider state; rebuild when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, enquiries, quotations, projects, plans, tasks, concepts, designs, analyses, boms, drawings, reviews, changes, transfers],
  );

  const targets = dialog?.record ? targetsFor(dialog.type, dialog.record) : [];
  const selected = targets.find((row) => row.key === dialog?.targetKey) || targets.find((row) => row.enabled);

  return (
    <WorkflowConversionContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="workflow-convert-backdrop" role="presentation" onMouseDown={() => setDialog(null)}>
          <div className="workflow-convert-dialog" role="dialog" aria-modal="true" aria-labelledby="workflow-convert-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="workflow-convert-head">
              <div>
                <span className="workflow-convert-kicker">Workflow conversion</span>
                <h2 id="workflow-convert-title">{dialog.record?.id || 'Convert record'}</h2>
                <p>{TYPE_LABELS[dialog.type]} · {dialog.record?.status || dialog.record?.verificationStatus || dialog.record?.approvalStatus || ''}</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close conversion dialog" onClick={() => setDialog(null)}><X /></button>
            </div>
            {!dialog.record ? (
              <div className="workflow-convert-body">
                <div className={`workflow-convert-feedback is-${feedback?.tone || 'success'}`} role="status">{feedback?.message}</div>
                {feedback?.targetType && feedback?.targetId && TARGET_PATHS[feedback.targetType] && (
                  <Button icon={ArrowRightLeft} onClick={() => { const path = TARGET_PATHS[feedback.targetType]; setDialog(null); navigate(path(feedback.targetId)); }}>Open destination record</Button>
                )}
                <Button variant="secondary" onClick={() => setDialog(null)}>Close</Button>
              </div>
            ) : (
              <div className="workflow-convert-body">
                <p className="workflow-convert-note">This creates a real linked record, copies the source data, updates the source status and records the conversion in history. It cannot be repeated.</p>
                <div className="workflow-convert-options">
                  {targets.map((row) => (
                    <label key={row.key} className={`workflow-convert-option${row.enabled ? '' : ' is-disabled'}`}>
                      <input type="radio" name="conversion-target" value={row.key} disabled={!row.enabled} checked={dialog.targetKey === row.key} onChange={() => { setDialog((previous) => ({ ...previous, targetKey: row.key })); setFeedback(null); }} />
                      <span><strong>{row.label}</strong>{!row.enabled && <small>{row.reason}</small>}</span>
                    </label>
                  ))}
                </div>
                {feedback?.tone === 'error' && <div className="workflow-convert-feedback is-error" role="alert">{feedback.message}</div>}
                <div className="workflow-convert-actions">
                  <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
                  <Button icon={Link2} disabled={!selected?.enabled} onClick={confirmConversion}>Confirm conversion</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </WorkflowConversionContext.Provider>
  );
}

export function useWorkflowConversions() {
  const context = useContext(WorkflowConversionContext);
  if (!context) throw new Error('useWorkflowConversions must be used inside WorkflowConversionProvider');
  return context;
}

export function WorkflowLinks({ type, recordId }) {
  const { links, typeLabels, openConversion, targetsFor } = useWorkflowConversions();
  const incoming = links.filter((row) => row.targetType === type && row.targetId === recordId);
  const outgoing = links.filter((row) => row.sourceType === type && row.sourceId === recordId);
  if (incoming.length === 0 && outgoing.length === 0) return null;
  return (
    <section className="card workflow-links-card">
      <div className="card-head"><div><h3>Workflow Links</h3><p>Source, destination and conversion history for this record.</p></div></div>
      <div className="workflow-links-list">
        {incoming.map((row) => <div key={row.id} className="workflow-link-row"><span className="workflow-link-direction">From</span><strong>{row.sourceId}</strong><span>{typeLabels[row.sourceType]}</span><small>{row.label} · {row.at}</small></div>)}
        {outgoing.map((row) => <div key={row.id} className="workflow-link-row"><span className="workflow-link-direction">To</span><strong>{row.targetId}</strong><span>{typeLabels[row.targetType]}</span><small>{row.label} · {row.at}</small></div>)}
      </div>
    </section>
  );
}

export function ConvertRecordButton({ type, record, variant = 'primary', size, className = '' }) {
  const { openConversion, targetsFor } = useWorkflowConversions();
  const targets = targetsFor(type, record);
  if (!targets.length) return null;
  return (
    <Button variant={variant} size={size} icon={ArrowRightLeft} className={className} onClick={() => openConversion(type, record)}>
      {targets.some((row) => row.enabled) ? targets.find((row) => row.enabled)?.label : 'Convert'}
    </Button>
  );
}
