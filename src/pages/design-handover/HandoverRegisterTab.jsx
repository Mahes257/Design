import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  DataTable,
  Modal,
  SearchInput,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { useProjects } from '../../context/ProjectsContext';
import { useMechanical } from '../../context/MechanicalContext';
import { useApprovals } from '../../context/ApprovalsContext';
import { formatHandoverDate } from '../../data/designHandoverData';

export default function HandoverRegisterTab() {
  const navigate = useNavigate();
  const { handovers, deleteDraft } = useDesignHandover();
  const { projects } = useProjects();
  const { designs } = useMechanical();
  const { reviews } = useApprovals();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState('');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return handovers.filter((handover) => {
      if (status !== 'All' && handover.status !== status) return false;
      if (!term) return true;
      const project = projects.find((row) => row.id === handover.projectId)?.name || '';
      const design = designs.find((row) => row.id === handover.designId)?.name || '';
      return [handover.id, handover.projectId, project, handover.designId, design, handover.owner, handover.bomId]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [handovers, search, status, projects, designs]);

  const columns = [
    {
      key: 'id',
      label: 'Handover No.',
      render: (row) => <span className="cell-strong">{row.id}</span>,
    },
    {
      key: 'project',
      label: 'Project',
      render: (row) => (
        <span>
          <strong>{row.projectId}</strong>
          <span className="cell-sub">{projects.find((project) => project.id === row.projectId)?.name || 'Project not found'}</span>
        </span>
      ),
    },
    {
      key: 'design',
      label: 'Design / Revision',
      render: (row) => (
        <span>
          <strong>{row.designId}</strong>
          <span className="cell-sub">Rev {row.designRevision} · {designs.find((design) => design.id === row.designId)?.name || 'Design unavailable'}</span>
        </span>
      ),
    },
    {
      key: 'item',
      label: 'Part / Assembly',
      render: (row) => (
        <span>
          <strong>{row.itemId || '—'}</strong>
          <span className="cell-sub">{row.itemType}</span>
        </span>
      ),
    },
    {
      key: 'bom',
      label: 'BOM Revision',
      render: (row) => (row.bomId ? `${row.bomId} Rev ${row.bomRevision || '—'}` : '—'),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      render: (row) => {
        const engineering = reviews.find((review) => review.id === row.engineeringReviewId);
        const manufacturing = reviews.find((review) => review.id === row.manufacturingReviewId);
        return (
          <span className="dh-review-pair">
            <span>Eng: {engineering?.stageStates?.engineering?.status || 'Not selected'}</span>
            <span>Mfg: {manufacturing?.stageStates?.manufacturing?.status || 'Not selected'}</span>
          </span>
        );
      },
    },
    {
      key: 'owner',
      label: 'Owner',
      render: (row) => (
        <span>
          {row.owner}
          <span className="cell-sub">Target {formatHandoverDate(row.targetDate)}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <span className="dh-row-actions">
          <button type="button" className="icon-btn" title="View details" aria-label={`View ${row.id}`} onClick={() => navigate(`/design-handover/${row.id}`)}>
            <Eye aria-hidden="true" />
          </button>
          {row.status === 'Draft' && (
            <>
              <button type="button" className="icon-btn" title="Edit draft" aria-label={`Edit ${row.id}`} onClick={() => navigate(`/design-handover/${row.id}/edit`)}>
                <Pencil aria-hidden="true" />
              </button>
              <button type="button" className="icon-btn is-danger" title="Delete draft" aria-label={`Delete ${row.id}`} onClick={() => setDeleteTarget(row)}>
                <Trash2 aria-hidden="true" />
              </button>
            </>
          )}
        </span>
      ),
    },
  ];

  const confirmDelete = () => {
    const result = deleteDraft(deleteTarget.id);
    setFeedback(result.error || `${deleteTarget.id} deleted.`);
    setDeleteTarget(null);
  };

  return (
    <div className="dh-tab-stack">
      <div className="dh-section-heading">
        <div>
          <h2>Handover Register</h2>
          <p>Controlled handover records prepared from existing design, BOM, manufacturing and review records.</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/design-handover/new')}>Create Handover</Button>
      </div>

      {feedback && <div className="dh-feedback" role="status">{feedback}</div>}

      <Toolbar
        left={
          <select className="form-select dh-filter" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter handover status">
            {['All', 'Draft', 'Validation Failed', 'Ready for Release', 'Released', 'Export Prepared'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        }
        right={<SearchInput value={search} onChange={setSearch} placeholder="Search handover, project, design…" />}
        count={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
      />

      <DataTable
        columns={columns}
        rows={rows}
        recordHref={(row) => `/design-handover/${row.id}`}
        onRowClick={(row) => navigate(`/design-handover/${row.id}`)}
        ariaLabel="Design handover register"
        emptyContent={
          <div className="dh-empty-cell">
            <strong>No handover records yet.</strong>
            <span>Create the first handover from an approved design revision.</span>
            <Button size="sm" icon={Plus} onClick={() => navigate('/design-handover/new')}>Create Handover</Button>
          </div>
        }
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete draft handover?"
        subtitle={deleteTarget ? `${deleteTarget.id} · ${deleteTarget.designId} Rev ${deleteTarget.designRevision}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={confirmDelete}>Delete Draft</Button>
          </>
        }
      >
        <p className="dh-modal-copy">This removes only the local draft handover and its package. Existing source records are not changed.</p>
      </Modal>
    </div>
  );
}
