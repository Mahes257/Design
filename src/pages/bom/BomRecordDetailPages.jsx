import { Link, useParams } from 'react-router-dom';
import { Boxes, ClipboardList } from 'lucide-react';
import RecordDetailsPage, {
  RecordNotFound,
  remainingFields,
} from '../../components/common/RecordDetails';
import { useBom } from '../../context/BomContext';
import { useProjects } from '../../context/ProjectsContext';
import { materialByCode } from '../../data/bomData';
import { money } from './bomUi';

/**
 * Material requirement details — full-page record for one MREQ ID. Cost is
 * derived from that record's own quantity and rate, exactly as the register
 * shows it.
 */
export function MaterialDetailPage() {
  const { materialId } = useParams();
  const { materials, boms } = useBom();
  const { projects } = useProjects();

  const material = materials.find((row) => row.id === materialId);

  if (!material) {
    return (
      <RecordNotFound
        icon={Boxes}
        title="Material requirement not found"
        message={`No material requirement with ID ${materialId} exists in the current BOM registers.`}
        backTo="/bom-cost/bom"
        backLabel="Back to Material BOM"
      />
    );
  }

  const project = projects.find((row) => row.id === material.projectId);
  const bom = boms.find((row) => row.id === material.bomId);
  const catalog = materialByCode(material.materialCode);

  const used = ['id', 'materialCode', 'materialName', 'grade', 'qty', 'unit', 'rate', 'cost', 'partNumber', 'projectId', 'bomId', 'editable'];

  const sections = [
    {
      title: 'Material Requirement',
      icon: Boxes,
      fields: [
        { label: 'Requirement ID', value: material.id },
        { label: 'Material Code', value: material.materialCode },
        { label: 'Material', value: catalog?.name || material.materialName || '—' },
        { label: 'Grade / Specification', value: catalog?.grade || material.grade || '—' },
        { label: 'Quantity', value: `${material.qty} ${material.unit || catalog?.unit || ''}`.trim() },
        { label: 'Rate', value: money(material.rate) },
        { label: 'Estimated Cost', value: money((Number(material.qty) || 0) * (Number(material.rate) || 0)) },
      ],
    },
  ];

  const extra = remainingFields(material, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: Boxes, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'BOM & Cost Estimation', to: '/bom-cost' },
        { label: 'BOM Management', to: '/bom-cost/bom' },
        { label: material.id },
      ]}
      icon={Boxes}
      title={catalog?.name || material.materialName || material.materialCode}
      subtitle={`${material.id} · ${material.bomId} · ${material.partNumber}`}
      recordRef={material.id}
      chips={
        <>
          <span className="chip">{material.materialCode}</span>
          <span className="chip">{`${material.qty} ${material.unit || ''}`.trim()}</span>
        </>
      }
      meta={[
        ['Requirement ID', material.id],
        ['BOM', material.bomId],
        ['Part', material.partNumber],
        ['Project', `${material.projectId} · ${project?.name || '—'}`],
        ['Quantity', `${material.qty} ${material.unit || ''}`.trim()],
        ['Estimated Cost', money((Number(material.qty) || 0) * (Number(material.rate) || 0))],
      ]}
      backTo="/bom-cost/bom"
      backLabel="Back to Material BOM"
      sections={sections}
      related={[
        {
          label: 'BOM',
          value: bom ? (
            <Link className="cell-link" to={`/bom-cost/bom/${bom.id}`}>
              {bom.id} · {bom.title || bom.name || 'BOM'}
            </Link>
          ) : (
            material.bomId || 'Not linked'
          ),
        },
        {
          label: 'Project',
          value: (
            <Link className="cell-link" to={`/projects/all-projects/${material.projectId}`}>
              {material.projectId} · {project?.name || '—'}
            </Link>
          ),
        },
      ]}
      note="Material requirements belong to a BOM. Editing or deleting one is controlled by that BOM's editable status."
    />
  );
}

/**
 * Quantity calculation details — full-page record for one QC ID.
 */
export function QuantityDetailPage() {
  const { calcId } = useParams();
  const { quantities, boms } = useBom();
  const { projects } = useProjects();

  const quantity = quantities.find((row) => row.id === calcId);

  if (!quantity) {
    return (
      <RecordNotFound
        icon={ClipboardList}
        title="Quantity calculation not found"
        message={`No quantity calculation with ID ${calcId} exists in the current BOM registers.`}
        backTo="/bom-cost/bom"
        backLabel="Back to Quantity Calculations"
      />
    );
  }

  const project = projects.find((row) => row.id === quantity.projectId);
  const bom = boms.find((row) => row.id === quantity.bomId);

  const used = ['id', 'projectId', 'bomId', 'partNumber', 'component', 'baseQty', 'requiredQty', 'unit', 'allowance', 'finalQty', 'notes', 'status', 'engineer', 'recordDate'];

  const sections = [
    {
      title: 'Quantity Calculation',
      icon: ClipboardList,
      fields: [
        { label: 'Calculation ID', value: quantity.id },
        { label: 'Component', value: quantity.component },
        { label: 'Part Number', value: quantity.partNumber },
        { label: 'Base Quantity', value: `${quantity.baseQty} ${quantity.unit || ''}`.trim() },
        { label: 'Required Quantity', value: `${quantity.requiredQty} ${quantity.unit || ''}`.trim() },
        { label: 'Allowance', value: `${quantity.allowance || 0}%` },
        { label: 'Final Quantity', value: `${quantity.finalQty} ${quantity.unit || ''}`.trim() },
        { label: 'Status', value: quantity.status },
        { label: 'Engineer', value: quantity.engineer },
        { label: 'Record Date', value: quantity.recordDate },
        { label: 'Notes', value: quantity.notes, wide: true },
      ],
    },
  ];

  const extra = remainingFields(quantity, used);
  if (extra.length > 0) {
    sections.push({ title: 'Additional Information', icon: ClipboardList, fields: extra });
  }

  return (
    <RecordDetailsPage
      breadcrumbItems={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'BOM & Cost Estimation', to: '/bom-cost' },
        { label: 'BOM Management', to: '/bom-cost/bom' },
        { label: quantity.id },
      ]}
      icon={ClipboardList}
      title={quantity.component}
      subtitle={`${quantity.id} · ${quantity.bomId} · ${quantity.partNumber}`}
      recordRef={quantity.id}
      chips={
        <>
          <span className="chip">{`${quantity.finalQty} ${quantity.unit || ''}`.trim()}</span>
          {quantity.allowance ? <span className="chip">{quantity.allowance}% allowance</span> : null}
        </>
      }
      meta={[
        ['Calculation ID', quantity.id],
        ['BOM', quantity.bomId],
        ['Part', quantity.partNumber],
        ['Project', `${quantity.projectId} · ${project?.name || '—'}`],
        ['Final Quantity', `${quantity.finalQty} ${quantity.unit || ''}`.trim()],
        ['Status', quantity.status],
      ]}
      backTo="/bom-cost/bom"
      backLabel="Back to Quantity Calculations"
      sections={sections}
      related={[
        {
          label: 'BOM',
          value: bom ? (
            <Link className="cell-link" to={`/bom-cost/bom/${bom.id}`}>
              {bom.id} · {bom.title || bom.name || 'BOM'}
            </Link>
          ) : (
            quantity.bomId || 'Not linked'
          ),
        },
        {
          label: 'Project',
          value: (
            <Link className="cell-link" to={`/projects/all-projects/${quantity.projectId}`}>
              {quantity.projectId} · {project?.name || '—'}
            </Link>
          ),
        },
      ]}
      note="Quantities and allowances are frontend estimates belonging to this BOM, not certified engineering calculations."
    />
  );
}

export default MaterialDetailPage;
