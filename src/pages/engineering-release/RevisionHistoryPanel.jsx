import { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { DataTable, EmptyState, SearchInput, Select, StatusBadge, Toolbar } from '../../components/common';
import { useBom } from '../../context/BomContext';
import { useCad } from '../../context/CadContext';
import { useEngineeringRelease } from '../../context/EngineeringReleaseContext';
import { useManufacturing } from '../../context/ManufacturingContext';
import { useMechanical } from '../../context/MechanicalContext';
import { engineeringTone, formatDate } from '../../data/engineeringReleaseData';

function changeDocuments(change, eco) {
  return [...new Set([
    change?.bomId || eco?.impactedBomId,
    ...(change?.impactedDrawings || (change?.drawingId ? [change.drawingId] : [])),
    ...(eco?.impactedDrawingIds || []),
    ...(change?.impactedManufacturingDocuments || []).map((row) => row.id),
    ...(eco?.supportingDocuments || []),
  ].filter(Boolean))];
}

/**
 * Builds the unified history strictly from stored ECR/ECO events, revision
 * registers, manufacturing status history and release snapshots. No event or
 * date is synthesized.
 */
function useHistoryRows() {
  const { changes, ecos, releases } = useEngineeringRelease();
  const { designs } = useMechanical();
  const { boms } = useBom();
  const { drawings } = useCad();
  const { definitions, inspections, processPlans } = useManufacturing();

  return useMemo(() => {
    const rows = [];
    const linkedProjectIds = new Set([...changes.map((row) => row.projectId), ...ecos.map((row) => row.projectId)]);
    const linkedBomIds = new Set(changes.map((row) => row.bomId).filter(Boolean));
    ecos.forEach((row) => row.impactedBomId && linkedBomIds.add(row.impactedBomId));
    const linkedDrawingIds = new Set();
    changes.forEach((row) => {
      (row.impactedDrawings || (row.drawingId ? [row.drawingId] : [])).forEach((id) => linkedDrawingIds.add(id));
    });
    ecos.forEach((row) => (row.impactedDrawingIds || []).forEach((id) => linkedDrawingIds.add(id)));
    const linkedDesignIds = new Set([...changes.map((row) => row.designId), ...ecos.map((row) => row.designId)].filter(Boolean));
    const linkedMfgIds = new Set();
    changes.forEach((row) => (row.impactedManufacturingDocuments || []).forEach((ref) => linkedMfgIds.add(ref.id)));
    ecos.forEach((row) => (row.manufacturingDocumentRefs || []).forEach((ref) => linkedMfgIds.add(ref.id)));

    changes.forEach((change) => {
      const eco = ecos.find((row) => row.sourceEcrId === change.id || row.id === change.ecoId);
      (change.history || []).forEach((entry) => {
        rows.push({
          id: `ECR-${change.id}-${entry.id}`,
          reference: change.id,
          projectId: change.projectId,
          source: entry.stage || 'ECR',
          previousRevision: entry.previousRevision || '',
          newRevision: entry.newRevision || '',
          summary: `${entry.action}${entry.comments ? ` — ${entry.comments}` : ''}`,
          owner: entry.by || '',
          at: entry.at,
          status: entry.statusAfter || change.status,
          documents: changeDocuments(change, eco),
        });
      });
    });

    ecos.forEach((eco) => {
      const change = changes.find((row) => row.id === eco.sourceEcrId);
      (eco.history || []).forEach((entry) => {
        rows.push({
          id: `ECO-${eco.id}-${entry.id}`,
          reference: eco.id,
          projectId: eco.projectId,
          source: entry.stage || 'ECO',
          previousRevision: entry.previousRevision || '',
          newRevision: entry.newRevision || '',
          summary: `${entry.action}${entry.comments ? ` — ${entry.comments}` : ''}`,
          owner: entry.by || '',
          at: entry.at,
          status: entry.statusAfter || eco.status,
          documents: changeDocuments(change, eco),
        });
      });
    });

    designs
      .filter((design) => linkedProjectIds.has(design.projectId) || linkedDesignIds.has(design.id))
      .forEach((design) => {
        (design.revisions || []).forEach((entry, index) => {
          const previous = entry.previous || design.revisions[index - 1]?.revision || '';
          rows.push({
            id: `DESIGN-${design.id}-${entry.revision}-${entry.date}`,
            reference: design.id,
            projectId: design.projectId,
            source: 'Design Revision',
            previousRevision: previous,
            newRevision: entry.revision,
            summary: entry.note || 'Design revision recorded.',
            owner: entry.by || '',
            at: entry.date,
            status: entry.revision === design.revision ? design.status : 'Superseded',
            documents: [design.cadRef].filter(Boolean),
          });
        });
      });

    boms
      .filter((bom) => linkedBomIds.has(bom.id))
      .forEach((bom) => {
        (bom.revisions || []).forEach((entry) => {
          rows.push({
            id: `BOM-${bom.id}-${entry.revision}-${entry.date}`,
            reference: bom.id,
            projectId: bom.projectId,
            source: 'BOM Revision',
            previousRevision: entry.previous || '',
            newRevision: entry.revision,
            summary: entry.note || entry.changeReason || 'BOM revision recorded.',
            owner: entry.by || '',
            at: entry.date,
            status: entry.status || (entry.revision === bom.revision ? bom.status : ''),
            documents: [bom.id],
          });
        });
      });

    drawings
      .filter((drawing) => linkedDrawingIds.has(drawing.id))
      .forEach((drawing) => {
        (drawing.revisions || []).forEach((entry) => {
          rows.push({
            id: `DRAWING-${drawing.id}-${entry.revision}-${entry.date}`,
            reference: drawing.drawingNumber || drawing.id,
            projectId: drawing.projectId,
            source: 'Drawing Revision',
            previousRevision: entry.previous || '',
            newRevision: entry.revision,
            summary: entry.note || entry.changeReason || 'Drawing revision recorded.',
            owner: entry.by || '',
            at: entry.date,
            status: entry.status || drawing.approvalStatus,
            documents: [drawing.id, ...(entry.cadFileIds || [])],
          });
        });
      });

    [...definitions, ...inspections, ...processPlans]
      .filter((record) => linkedMfgIds.has(record.id))
      .forEach((record) => {
        (record.statusHistory || [])
          .filter((entry) => /revision/i.test(entry.note || ''))
          .forEach((entry) => {
            const match = String(entry.note || '').match(/Rev\s+([A-Z0-9.]+)\s*→\s*Rev\s+([A-Z0-9.]+)/i);
            rows.push({
              id: `MFG-${record.id}-${entry.id}`,
              reference: record.id,
              projectId: record.projectId,
              source: 'Manufacturing Revision',
              previousRevision: match?.[1] || '',
              newRevision: match?.[2] || record.revision,
              summary: entry.note,
              owner: entry.by || '',
              at: entry.at,
              status: entry.status || record.status,
              documents: [record.linkedBomId, record.linkedDrawingId].filter(Boolean),
            });
          });
      });

    releases.forEach((release) => {
      rows.push({
        id: `RELEASE-${release.id}`,
        reference: release.id,
        projectId: release.projectId,
        source: 'Engineering Release',
        previousRevision: release.currentRevision || '',
        newRevision: release.proposedRevision || '',
        summary: `${release.releaseType} · ${release.manufacturingPackage || 'Engineering release snapshot'}`,
        owner: release.releasedBy || '',
        at: release.releasedAt,
        status: 'Released',
        documents: [release.bom?.id, release.drawing?.id, release.ecoId].filter(Boolean),
      });
      (release.history || []).forEach((entry) => {
        rows.push({
          id: `${release.id}-${entry.id}`,
          reference: release.id,
          projectId: release.projectId,
          source: 'Release Event',
          previousRevision: '',
          newRevision: release.proposedRevision || '',
          summary: `${entry.action}${entry.comments ? ` — ${entry.comments}` : ''}`,
          owner: entry.by || release.releasedBy || '',
          at: entry.at,
          status: 'Released',
          documents: [release.bom?.id, release.drawing?.id].filter(Boolean),
        });
      });
    });

    return rows
      .filter((row) => row.at)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [changes, ecos, releases, designs, boms, drawings, definitions, inspections, processPlans]);
}

export default function RevisionHistoryPanel() {
  const rows = useHistoryRows();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');

  const sources = [...new Set(rows.map((row) => row.source))].sort();
  const filtered = rows.filter((row) => {
    if (sourceFilter !== 'All' && row.source !== sourceFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [row.reference, row.projectId, row.source, row.summary, row.owner, row.status, row.documents.join(' ')]
      .join(' ').toLowerCase().includes(query);
  });

  return (
    <section className="card approvals-panel">
      <div className="approvals-card-head">
        <div>
          <strong>Revision & Release History</strong>
          <p>Unified trace from stored ECR/ECO events, source revision registers, manufacturing revision history and release snapshots.</p>
        </div>
        <span className="approvals-count-chip"><History aria-hidden="true" /> {filtered.length} events</span>
      </div>
      <Toolbar
        left={
          <>
            <Select
              id="history-source-filter"
              className="approvals-toolbar-select"
              options={[{ value: 'All', label: 'All Event Sources' }, ...sources.map((value) => ({ value, label: value }))]}
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              aria-label="Filter history by event source"
            />
            <span className="toolbar-count">{rows.length} stored events</span>
          </>
        }
        right={<SearchInput id="history-search" value={search} onChange={setSearch} placeholder="Search reference, event, owner, document…" ariaLabel="Search revision and release history" />}
      />
      <DataTable
        columns={[
          { key: 'at', label: 'Event Date', width: 118, render: (row) => formatDate(row.at) },
          { key: 'reference', label: 'Record Reference', width: 132, render: (row) => <span className="cell-id">{row.reference}</span> },
          { key: 'source', label: 'Event', width: 132 },
          { key: 'previousRevision', label: 'Previous Rev', width: 92, render: (row) => row.previousRevision ? `Rev ${row.previousRevision}` : '—' },
          { key: 'newRevision', label: 'New Rev', width: 84, render: (row) => row.newRevision ? `Rev ${row.newRevision}` : '—' },
          { key: 'summary', label: 'Change Summary', width: 330, render: (row) => <span className="approvals-clamp">{row.summary}</span> },
          { key: 'owner', label: 'Responsible User', width: 120 },
          { key: 'status', label: 'Status', width: 130, render: (row) => <StatusBadge status={row.status} tone={engineeringTone(row.status)} /> },
          { key: 'documents', label: 'Linked Documents', width: 190, render: (row) => <span className="approvals-clip">{row.documents.join(', ') || '—'}</span> },
        ]}
        rows={filtered}
        className="mech-register-table"
        ariaLabel="Unified engineering revision and release history"
        emptyContent={<EmptyState icon={Search} title="No history events" message="History appears only from stored change, revision and release records." />}
      />
      <p className="mech-footnote">
        This view does not create history. Events and dates are read from stored ECR/ECO actions and the revision
        registers in Modules 05, 08, 09, 10 and 12.
      </p>
    </section>
  );
}
