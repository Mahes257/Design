import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  FilePlus2,
  FileText,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  Card,
  Input,
  PageHeader,
  PageLayout,
  Select,
  Textarea,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { DASHBOARD, MODULES } from '../../config/navigation';
import { useTransfers } from '../../context/TransfersContext';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useApprovals } from '../../context/ApprovalsContext';
import {
  DESTINATIONS,
  PROJECTS,
  SOURCE_DELIVERABLES,
  TODAY,
  TRANSFER_PEOPLE,
  TRANSFER_PRIORITIES,
  destinationLabel,
  formatDate,
  makeValidation,
  projectLabel,
  sourceEligibleFor,
  sourceEligibilityMessage,
  sourceFor,
  validationBlocking,
} from '../../data/transfersData';
import { Toast, ValidationResults, formatBytes, useToast } from './transfersUi';

const MODULE = MODULES.find((module) => module.key === 'transfers');

function emptySide(destination) {
  return {
    included: true,
    status: 'Not Prepared',
    ...(destination === 'Purchase'
      ? { requisitions: [], workflow: [], handover: null, acknowledgement: null, comments: [], progress: { requisition: 'Not Started', handover: 'Not Started', acknowledgement: 'Pending', workflow: 'Not Started', mockPurchase: 'Not Started', outstanding: '', remarks: '' } }
      : { package: null, handover: null, acknowledgement: null, comments: [], progress: { drawingRelease: 'Not Started', packagePreparation: 'Not Started', handover: 'Not Started', acknowledgement: 'Pending', readiness: 'Not Started', mockProduction: 'Not Started', outstanding: '', remarks: '' } }),
  };
}

function buildRecord({ existing, id, source, projectId, transferDate, priority, initiatedBy, notes, destinations, attachments, technicalNotes, validation, status }) {
  const now = {
    ...(existing || {}),
    id,
    sourceId: source.id,
    projectId,
    deliverableType: source.deliverableType,
    deliverableName: source.deliverableName,
    deliverableNumber: source.deliverableNumber,
    revision: source.revision,
    reviewId: source.reviewId,
    releaseId: source.releaseId,
    releaseDate: source.releaseDate,
    sourceModule: source.sourceModule,
    destinations,
    destination: destinationLabel(destinations),
    priority,
    initiatedBy,
    transferDate,
    notes,
    validation,
    manualStatus: status === 'Draft' ? 'Draft' : '',
    attachments,
    contents: {
      bomItems: source.bomItems || [],
      materialRequirements: source.materials || [],
      drawingReferences: source.drawingReferences || (source.deliverableType === 'Drawing' ? [`${source.deliverableNumber} Rev ${source.revision}`] : []),
      manufacturingPackage: source.manufacturingPackageId || (source.deliverableType === 'Manufacturing Package' ? `${source.deliverableNumber} Rev ${source.revision}` : ''),
      technicalNotes: technicalNotes || notes || 'Controlled handover of the exact released revision.',
      attachments,
    },
    purchase: destinations.includes('Purchase') ? { ...(existing?.purchase || emptySide('Purchase')), included: true } : { ...emptySide('Purchase'), included: false, handover: null, acknowledgement: null },
    production: destinations.includes('Production') ? { ...(existing?.production || emptySide('Production')), included: true } : { ...emptySide('Production'), included: false, package: null, handover: null, acknowledgement: null },
  };
  return { ...now, status };
}

function FieldReadonly({ label, children }) {
  return (
    <div className="form-field">
      <span className="form-label">{label}</span>
      <div className="transfers-readonly-field">{children || '—'}</div>
    </div>
  );
}

export default function NewTransferPage() {
  const bomItemColumns = useTableColumnVisibility('/transfers/new#bom-items', [
    { key: 'partNumber', label: 'Part Number' },
    { key: 'description', label: 'Description' },
    { key: 'qty', label: 'Qty' },
    { key: 'unit', label: 'Unit' },
    { key: 'category', label: 'Category' },
    { key: 'material', label: 'Material Reference' },
    { key: 'drawing', label: 'Drawing Reference' },
  ]);
  const { transferId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { transfers, nextTransferId, saveTransfer } = useTransfers();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { reviews } = useApprovals();
  const { toast, showToast, clearToast } = useToast();

  const availableSources = useMemo(() => {
    const liveBoms = boms
      .filter((bom) => bom.status === 'Released' && bom.releaseRef)
      .map((bom) => {
        const review = reviews.find((row) => row.release?.bomId === bom.id && row.release?.bomRevision === bom.revision);
        const bomItems = (bom.items || []).map((item, index) => ({
          id: item.id || `BI-${bom.id}-${index + 1}`,
          partNumber: item.partNumber || '—',
          description: item.name || item.description || '—',
          qty: item.qty ?? 0,
          unit: item.unit || item.uom || 'nos',
          category: item.makeBuy || item.category || 'Make',
          materialReference: item.material || item.materialReference || '—',
          drawingReference: item.drawingReference || `${bom.id} Rev ${bom.revision}`,
          purchaseNotes: item.purchaseNotes || '',
        }));
        const materials = bomItems
          .filter((item) => item.materialReference && item.materialReference !== '—')
          .map((item, index) => ({
            id: `MREQ-${bom.id}-${index + 1}`,
            materialCode: item.materialReference,
            description: item.materialReference,
            specification: item.materialReference,
            qty: item.qty,
            unit: item.unit,
            requiredDate: bom.dueDate || TODAY,
            supplier: 'Approved supplier — mock reference',
            remarks: `Derived from BOM item ${item.partNumber}.`,
          }));
        return {
          id: `SRC-LIVE-${bom.id}`,
          projectId: bom.projectId,
          deliverableType: 'BOM',
          deliverableNumber: bom.id,
          deliverableName: bom.name,
          revision: bom.revision,
          reviewId: review?.id || '',
          releaseId: bom.releaseRef,
          releaseDate: review?.release?.releaseDate || bom.releasedAt || TODAY,
          sourceModule: 'Module 11 — Design Review & Approval',
          releaseOwner: 'Design Authority',
          purchaseEligible: true,
          productionEligible: false,
          assembly: bom.assemblyId || '',
          bomRevision: bom.revision,
          totalItems: bomItems.length,
          buyItems: bomItems.filter((item) => item.category === 'Buy').length,
          makeItems: bomItems.filter((item) => item.category === 'Make').length,
          bomItems,
          materials,
          attachments: (bom.attachments || []).map((row) => ({ name: row.name, type: row.type || 'File', size: row.size || 0 })),
        };
      });
    const liveDrawings = drawings
      .filter((drawing) => (drawing.releaseStatus === 'Released' || drawing.approvalStatus === 'Released') && drawing.releaseRef)
      .map((drawing) => {
        const review = reviews.find((row) => row.release?.drawingId === drawing.id && row.release?.drawingRevision === drawing.revision);
        const linkedBom = liveBoms.find(
          (bom) => bom.deliverableNumber === review?.bomId && bom.revision === review?.bomRevision,
        );
        return {
          id: `SRC-LIVE-${drawing.id}`,
          projectId: drawing.projectId,
          deliverableType: 'Drawing',
          deliverableNumber: drawing.drawingNumber || drawing.id,
          deliverableName: drawing.title,
          revision: drawing.revision,
          reviewId: review?.id || '',
          releaseId: drawing.releaseRef,
          releaseDate: review?.release?.releaseDate || drawing.releasedAt || TODAY,
          sourceModule: 'Module 11 — Design Review & Approval',
          releaseOwner: 'Design Authority',
          purchaseEligible: true,
          productionEligible: true,
          drawingType: drawing.drawingType || 'Drawing',
          cadFileId: drawing.cadFileIds?.[0] || '',
          bomNumber: review?.bomId || '',
          bomRevision: review?.bomRevision || '',
          manufacturingPackageId: drawing.mfgRef || '',
          packageRevision: drawing.mfgRef ? drawing.revision : '',
          bomItems: linkedBom?.bomItems || [],
          materials: linkedBom?.materials || [],
          attachments: (drawing.attachments || []).map((row) => ({ name: row.name, type: row.type || 'File', size: row.size || 0 })),
        };
      });
    const live = [...liveBoms, ...liveDrawings];
    const seeded = SOURCE_DELIVERABLES.filter(
      (row) => !live.some(
        (entry) =>
          entry.deliverableType === row.deliverableType &&
          entry.deliverableNumber === row.deliverableNumber &&
          entry.revision === row.revision,
      ),
    );
    return [...live, ...seeded];
  }, [boms, drawings, reviews]);

  const findSource = (id) => availableSources.find((row) => row.id === id) || null;

  const existing = transferId ? transfers.find((row) => row.id === transferId) : null;
  const initialSource = existing ? findSource(existing.sourceId) || sourceFor(existing) : findSource(searchParams.get('source'));

  const [sourceType, setSourceType] = useState(initialSource?.deliverableType || 'BOM');
  const [sourceId, setSourceId] = useState(initialSource?.id || '');
  const [projectId, setProjectId] = useState(existing?.projectId || initialSource?.projectId || '');
  const [transferDate, setTransferDate] = useState(existing?.transferDate || TODAY);
  const [priority, setPriority] = useState(existing?.priority || 'High');
  const [initiatedBy, setInitiatedBy] = useState(existing?.initiatedBy || 'N. Joshi');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [destinations, setDestinations] = useState(existing?.destinations || (initialSource ? DESTINATIONS.filter((destination) => (destination === 'Purchase' ? initialSource.purchaseEligible : initialSource.productionEligible)) : ['Purchase']));
  const [technicalNotes, setTechnicalNotes] = useState(existing?.contents?.technicalNotes || '');
  const [referenceText, setReferenceText] = useState('');
  const [extraFiles, setExtraFiles] = useState([]);
  const [validation, setValidation] = useState(existing?.validation || null);
  const [created, setCreated] = useState(false);
  const [errors, setErrors] = useState([]);

  const source = findSource(sourceId) || sourceFor({ sourceId }) || null;
  const typeSources = useMemo(
    () => availableSources.filter((row) => row.deliverableType === sourceType),
    [availableSources, sourceType],
  );
  const transferIdValue = existing?.id || nextTransferId();

  const attachments = useMemo(() => {
    const refs = referenceText.split('\n').map((row) => row.trim()).filter(Boolean);
    return [
      ...(source?.attachments || []),
      ...refs.map((name) => ({ name, type: 'Reference', size: 0 })),
      ...extraFiles,
    ];
  }, [source, referenceText, extraFiles]);

  if (existing && existing.status !== 'Draft') {
    return <Navigate to={`/transfers/${existing.id}`} replace />;
  }

  const chooseSource = (id) => {
    const nextSource = findSource(id);
    setSourceId(id);
    setValidation(null);
    setErrors([]);
    if (nextSource) {
      setProjectId(nextSource.projectId);
      const eligible = DESTINATIONS.filter((destination) => (destination === 'Purchase' ? nextSource.purchaseEligible : nextSource.productionEligible));
      setDestinations(eligible);
    }
  };

  const recordFor = (status) =>
    buildRecord({
      existing,
      id: transferIdValue,
      source,
      projectId,
      transferDate,
      priority,
      initiatedBy,
      notes,
      destinations,
      attachments,
      technicalNotes,
      validation,
      status,
    });

  const eligibilityExtra = () => {
    if (!source || !destinations.length) return [];
    const invalidDestinations = destinations.filter((destination) =>
      !sourceEligibleFor(source, [destination]),
    );
    return [
      {
        key: 'destination-eligibility',
        label: 'Selected deliverable is eligible for the chosen destination',
        scope: 'Common',
        mandatory: true,
        result: invalidDestinations.length ? 'Invalid' : 'Valid',
        note: invalidDestinations.length
          ? `${source.deliverableNumber} Rev ${source.revision} is not eligible for ${invalidDestinations.join(' / ')}.`
          : `${source.deliverableNumber} Rev ${source.revision} is eligible for ${destinationLabel(destinations)}.`,
      },
    ];
  };

  const validateForm = () => {
    const nextErrors = [];
    if (!projectId) nextErrors.push('Project is mandatory.');
    if (!sourceType) nextErrors.push('Deliverable type is mandatory.');
    if (!source) nextErrors.push('Select an approved and released deliverable number.');
    if (!source?.revision) nextErrors.push('Exact approved revision is mandatory.');
    if (!source?.releaseId) nextErrors.push('Source release reference is mandatory.');
    if (!destinations.length) nextErrors.push('Select at least one destination.');
    if (source && destinations.length && !destinations.every((destination) => sourceEligibleFor(source, [destination]))) {
      nextErrors.push(sourceEligibilityMessage(source, destinations));
    }
    setErrors(nextErrors.filter(Boolean));
    if (nextErrors.length) {
      setValidation(null);
      return null;
    }
    const nextValidation = makeValidation(source, destinations, {
      checkedAt: TODAY,
      checkedBy: initiatedBy === 'N. Joshi' ? 'N. Joshi' : 'N. Joshi',
      extra: eligibilityExtra(),
    });
    setValidation(nextValidation);
    return nextValidation;
  };

  const handleDraft = () => {
    if (!source || !destinations.length) {
      setErrors(['Select an approved source deliverable and at least one destination before saving a draft.']);
      return;
    }
    saveTransfer(recordFor('Draft'));
    setCreated(true);
    showToast('Transfer draft saved. It has not entered the handover workflow.');
    window.setTimeout(() => navigate(`/transfers/${transferIdValue}`), 350);
  };

  const handleValidate = () => {
    const nextValidation = validateForm();
    if (!nextValidation) {
      showToast('Complete the required transfer fields before validation.', 'error');
      return;
    }
    if (validationBlocking(nextValidation)) {
      showToast('Validation failed. Resolve the mandatory checks before creating the transfer.', 'error');
      return;
    }
    showToast('Validation passed. The transfer can be created.');
  };

  const handleCreate = () => {
    const nextValidation = validateForm();
    if (!nextValidation) {
      showToast('Complete the required transfer fields before creating the transfer.', 'error');
      return;
    }
    if (validationBlocking(nextValidation)) {
      showToast('Validation failed. Transfer creation is blocked.', 'error');
      return;
    }
    saveTransfer(recordFor('Ready for Transfer'));
    setCreated(true);
    showToast('Transfer created and ready for destination handover.');
    window.setTimeout(() => navigate(`/transfers/${transferIdValue}`), 350);
  };

  const toggleDestination = (destination) => {
    if (source && !sourceEligibleFor(source, [destination])) return;
    setValidation(null);
    setDestinations((previous) =>
      previous.includes(destination) ? previous.filter((value) => value !== destination) : [...previous, destination],
    );
  };

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: DASHBOARD.path },
            { label: MODULE.label, to: MODULE.base },
            { label: existing ? 'Edit Draft Transfer' : 'New Transfer' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={ArrowRightLeft}
          title={existing ? 'Edit Draft Transfer' : 'New Transfer'}
          subtitle="Prepare a controlled mock handover from an approved and released engineering revision. No ERP transaction is created."
          actions={
            <Link className="btn-secondary" to="/transfers">
              <ArrowLeft aria-hidden="true" /> Back to Register
            </Link>
          }
        />
      }
    >
      <form
        className="transfers-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleCreate();
        }}
      >
        <div className="transfers-form-top">
          <div>
            <span className="transfers-kicker">Transfer intake · frontend only</span>
            <h2>{transferIdValue}</h2>
            <p>Approved release → validation → destination handover. Only released revisions from the design register can be selected.</p>
          </div>
          <div className="transfers-form-top-actions">
            <Button variant="ghost" icon={Ban} type="button" onClick={() => navigate('/transfers')}>Cancel</Button>
            <Button variant="secondary" icon={Save} type="button" onClick={handleDraft}>Save as Draft</Button>
            <Button variant="secondary" icon={ShieldCheck} type="button" onClick={handleValidate}>Validate Transfer</Button>
            <Button icon={FilePlus2} type="submit">Create Transfer</Button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="transfers-form-errors" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>Transfer cannot be created yet</strong>
              <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          </div>
        )}

        <Card title="General information" subtitle="Transfer ownership and internal priority">
          <div className="form-grid transfers-form-grid">
            <FieldReadonly label="Transfer ID (auto-generated)">{transferIdValue}</FieldReadonly>
            <FieldReadonly label="Project">{projectId ? projectLabel(projectId) : 'Select a released source deliverable'}</FieldReadonly>
            <Input id="transfer-date" label="Transfer Date" type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} required />
            <Select id="transfer-priority" label="Transfer Priority" options={TRANSFER_PRIORITIES.map((value) => ({ value, label: value }))} value={priority} onChange={(event) => setPriority(event.target.value)} />
            <Select id="transfer-initiated-by" label="Transfer Initiated By" options={TRANSFER_PEOPLE.map((value) => ({ value, label: value }))} value={initiatedBy} onChange={(event) => setInitiatedBy(event.target.value)} />
            <div className="form-field span-2">
              <label className="form-label" htmlFor="transfer-notes">Transfer Notes</label>
              <textarea id="transfer-notes" className="form-input" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Scope of handover, special instructions, destination expectations." />
            </div>
          </div>
        </Card>

        <Card title="Source deliverable" subtitle="Approved and released revisions only">
          <div className="form-grid transfers-form-grid">
            <Select
              id="transfer-source-type"
              label="Deliverable Type"
              options={['BOM', 'Drawing', 'Manufacturing Package'].map((value) => ({ value, label: value }))}
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value);
                setSourceId('');
                setProjectId('');
                setDestinations([]);
                setValidation(null);
              }}
            />
            <Select
              id="transfer-source-id"
              label="Deliverable Number"
              options={[
                { value: '', label: 'Select a released deliverable number' },
                ...typeSources.map((row) => ({ value: row.id, label: `${row.deliverableNumber} · ${row.deliverableName} · Rev ${row.revision}` })),
              ]}
              value={sourceId}
              onChange={(event) => chooseSource(event.target.value)}
            />
            <FieldReadonly label="Exact Approved Revision">{source ? `Rev ${source.revision}` : '—'}</FieldReadonly>
            <FieldReadonly label="Source Review ID">{source?.reviewId || '—'}</FieldReadonly>
            <FieldReadonly label="Source Release ID">{source?.releaseId || '—'}</FieldReadonly>
            <FieldReadonly label="Source Module">{source?.sourceModule || '—'}</FieldReadonly>
            <FieldReadonly label="Release Date">{source ? formatDate(source.releaseDate) : '—'}</FieldReadonly>
            <FieldReadonly label="Eligibility">
              {source ? (
                <span className="approvals-inline-badges">
                  <span className={`transfers-eligibility-pill${source.purchaseEligible ? ' is-yes' : ''}`}>Purchase {source.purchaseEligible ? 'eligible' : 'not eligible'}</span>
                  <span className={`transfers-eligibility-pill${source.productionEligible ? ' is-yes' : ''}`}>Production {source.productionEligible ? 'eligible' : 'not eligible'}</span>
                </span>
              ) : 'Select a source'}
            </FieldReadonly>
          </div>

          <div className="transfers-source-attachments">
            <strong>Supporting documents from the release</strong>
            {source?.attachments?.length ? (
              source.attachments.map((row) => (
                <span key={row.name} className="transfers-attachment is-static"><FileText aria-hidden="true" /> {row.name} <small>{formatBytes(row.size)}</small></span>
              ))
            ) : (
              <span className="cell-muted">Select a released source to load its document references.</span>
            )}
          </div>

          <div className="form-grid transfers-form-grid">
            <div className="form-field span-2">
              <label className="form-label" htmlFor="transfer-attachment-refs">Additional attachment references</label>
              <textarea id="transfer-attachment-refs" className="form-input" rows={2} value={referenceText} onChange={(event) => setReferenceText(event.target.value)} placeholder="One reference per line, e.g. HANDOVER-COVER-01.pdf" />
            </div>
            <div className="form-field span-2">
              <label className="form-label" htmlFor="transfer-files">Supporting files (local metadata only)</label>
              <input
                id="transfer-files"
                className="form-input transfers-file-input"
                type="file"
                multiple
                onChange={(event) => {
                  const files = [...event.target.files].map((file) => ({ name: file.name, type: file.type || 'File', size: file.size }));
                  setExtraFiles(files);
                }}
              />
              <span className="form-hint">Files are recorded as local metadata only; no file content is uploaded or stored.</span>
            </div>
          </div>
        </Card>

        <Card title="Destination" subtitle="Purchase and Production are handed over independently">
          <div className="transfers-destination-options">
            {DESTINATIONS.map((destination) => {
              const eligible = source ? sourceEligibleFor(source, [destination]) : true;
              const checked = destinations.includes(destination);
              return (
                <label key={destination} className={`transfers-destination-option${checked ? ' is-checked' : ''}${!eligible ? ' is-disabled' : ''}`}>
                  <input type="checkbox" checked={checked} disabled={!eligible} onChange={() => toggleDestination(destination)} />
                  <span className={`transfers-destination-mark is-${destination.toLowerCase()}`}>{destination.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <strong>{destination}</strong>
                    <small>{eligible ? (destination === 'Purchase' ? 'BOM, drawings and procurement references' : 'Released drawings and manufacturing packages') : 'Source release is not eligible'}</small>
                  </span>
                </label>
              );
            })}
            <div className="transfers-destination-note">
              <strong>Selected: {destinations.length === 2 ? 'Both' : destinations[0] || 'None'}</strong>
              <span>Each selected destination records its own handover and acknowledgement.</span>
            </div>
          </div>
          {source && destinations.length > 0 && !destinations.every((destination) => sourceEligibleFor(source, [destination])) && (
            <p className="form-error" role="alert">{sourceEligibilityMessage(source, destinations)}</p>
          )}
        </Card>

        <Card title="Transfer contents" subtitle="Prepared from the exact released revision">
          {source?.deliverableType === 'BOM' && (
            <>
              <div className="transfers-content-summary">
                <span><strong>{source.totalItems}</strong> total items</span>
                <span><strong>{source.buyItems}</strong> buy items</span>
                <span><strong>{source.makeItems}</strong> make items</span>
                <span><strong>{source.materials?.length || 0}</strong> material requirements</span>
              </div>
              <ManageColumns {...bomItemColumns.managerProps} />
              <div className="table-wrap transfers-form-table">
                <table className="data-table transfers-compact-table" aria-label="BOM items for transfer">
                  <thead>
                    <tr>
                      {bomItemColumns.isVisible('partNumber') && <th>Part Number</th>}
                      {bomItemColumns.isVisible('description') && <th>Description</th>}
                      {bomItemColumns.isVisible('qty') && <th>Qty</th>}
                      {bomItemColumns.isVisible('unit') && <th>Unit</th>}
                      {bomItemColumns.isVisible('category') && <th>Category</th>}
                      {bomItemColumns.isVisible('material') && <th>Material Reference</th>}
                      {bomItemColumns.isVisible('drawing') && <th>Drawing Reference</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {source.bomItems.map((item) => (
                      <tr key={item.id}>
                        {bomItemColumns.isVisible('partNumber') && <td className="cell-id">{item.partNumber}</td>}
                        {bomItemColumns.isVisible('description') && <td>{item.description}</td>}
                        {bomItemColumns.isVisible('qty') && <td>{item.qty}</td>}
                        {bomItemColumns.isVisible('unit') && <td>{item.unit}</td>}
                        {bomItemColumns.isVisible('category') && <td>{item.category}</td>}
                        {bomItemColumns.isVisible('material') && <td>{item.materialReference}</td>}
                        {bomItemColumns.isVisible('drawing') && <td>{item.drawingReference}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {source?.deliverableType === 'Drawing' && (
            <div className="transfers-content-lines">
              <strong>Drawing references</strong>
              <span>{source.deliverableNumber} Rev {source.revision} · {source.drawingType}</span>
              {source.manufacturingPackageId && <span>Manufacturing package {source.manufacturingPackageId} Rev {source.packageRevision}</span>}
              {source.bomNumber && <span>Related BOM {source.bomNumber} Rev {source.bomRevision}</span>}
            </div>
          )}
          {source?.deliverableType === 'Manufacturing Package' && (
            <div className="transfers-content-lines">
              <strong>Manufacturing package</strong>
              <span>{source.deliverableNumber} Rev {source.revision}</span>
              {source.drawingReferences?.map((row) => <span key={row}>{row}</span>)}
            </div>
          )}
          {!source && <p className="cell-muted">Select a released source deliverable to prepare its transfer contents.</p>}
          <div className="form-grid transfers-form-grid transfers-form-content-notes">
            <div className="form-field span-2">
              <label className="form-label" htmlFor="transfer-technical-notes">Technical Notes</label>
              <textarea id="transfer-technical-notes" className="form-input" rows={3} value={technicalNotes} onChange={(event) => setTechnicalNotes(event.target.value)} placeholder="Controlled-copy instructions, destination-specific technical notes, exclusions." />
            </div>
            <FieldReadonly label="Attachment References">{attachments.length ? attachments.map((row) => row.name).join(', ') : 'No attachment references'}</FieldReadonly>
          </div>
        </Card>

        <Card title="Validation summary" subtitle="Run validation before creating the transfer">
          <div className="transfers-form-validation">
            <Button variant="secondary" icon={ShieldCheck} type="button" onClick={handleValidate}>Validate Transfer</Button>
            <span>Mandatory failures block creation. Warnings remain visible for the receiving owner.</span>
          </div>
          <ValidationResults validation={validation} />
        </Card>

        <div className="transfers-form-footer">
          <Link className="btn-ghost" to="/transfers">Cancel</Link>
          <div>
            <Button variant="secondary" icon={Save} type="button" onClick={handleDraft}>Save as Draft</Button>
            <Button icon={CheckCircle2} type="submit" disabled={created}>Create Transfer</Button>
          </div>
        </div>
      </form>
      <Toast toast={toast} onClose={clearToast} />
    </PageLayout>
  );
}
