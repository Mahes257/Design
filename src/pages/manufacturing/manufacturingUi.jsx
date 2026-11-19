import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, History, X } from 'lucide-react';
import { Button, Select } from '../../components/common';
import { formatDate } from '../../data/manufacturingData';
import { Toast, useToast } from '../mechanical/mechanicalUi';

export { Fact, RevisionHistoryModal, Toast, useToast } from '../mechanical/mechanicalUi';

export function formatSize(bytes) {
  const kb = Math.max(1, Math.round((bytes || 0) / 1024));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/** Status history reused by every industrial detail page. */
export function StatusHistoryList({ history = [] }) {
  if (history.length === 0) {
    return <p className="dash-modal-note">No status history recorded.</p>;
  }
  return (
    <ol className="mech-timeline">
      {[...history].reverse().map((entry) => (
        <li key={entry.id || `${entry.status}-${entry.at}`}>
          <span className="mech-timeline-dot" aria-hidden="true">
            <History />
          </span>
          <span className="mech-timeline-body">
            <span className="mech-timeline-head">
              <strong>{entry.status}</strong>
              <span>{formatDate(entry.at)}</span>
            </span>
            <span className="mech-timeline-note">{entry.note}</span>
            <span className="mech-timeline-by">{entry.by}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Review decisions recorded against a manufacturing record. */
export function ReviewHistoryList({ reviews = [] }) {
  if (reviews.length === 0) {
    return <p className="dash-modal-note">No review decisions recorded.</p>;
  }
  return (
    <ol className="mech-timeline">
      {[...reviews].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="mech-timeline-dot" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <span className="mech-timeline-body">
            <span className="mech-timeline-head">
              <strong>
                Rev {entry.revision} · {entry.decision}
              </strong>
              <span>{formatDate(entry.date)}</span>
            </span>
            <span className="mech-timeline-note">{entry.comments}</span>
            <span className="mech-timeline-by">{entry.reviewer}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function AttachmentList({ files = [], onRemove }) {
  if (files.length === 0) {
    return <p className="dash-modal-note">No attachments recorded.</p>;
  }
  return (
    <ul className="mech-document-list">
      {files.map((file) => (
        <li key={file.name}>
          <FileText aria-hidden="true" />
          <span>{file.name}</span>
          <span className="cell-muted">
            {file.type} · {formatSize(file.size)} · {file.uploadedBy || 'Design Admin'} ·{' '}
            {formatDate(file.uploadedAt)}
          </span>
          {onRemove && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => onRemove(file.name)}>
              Remove
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export const EMPTY_FILTERS = {
  projectId: 'All',
  type: 'All',
  status: 'All',
  engineer: 'All',
  from: '',
  to: '',
};

/** Shared register state: search, filters, sorting, paging and row selection. */
export function useRegister(rows, filterRow) {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => filterRow(row, filters, query));
  }, [rows, filters, search, filterRow]);

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((left, right) => {
      const a = String(left[sortKey] ?? '');
      const b = String(right[sortKey] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return list;
  }, [filteredRows, sortKey, sortDirection]);

  const totalCount = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setPage(1);
    setSelectedIds([]);
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const toggleRow = (id) =>
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setFiltersOpen(false);
  };

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    filters,
    applyFilters,
    resetFilters,
    sortKey,
    sortDirection,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageRows,
    sortedRows,
    selectedIds,
    setSelectedIds,
    toggleRow,
    pageInfo,
    totalCount,
  };
}

/** Filters panel shared by the three registers. */
export function RegisterFilters({
  open,
  draftFilters,
  setDraftFilters,
  applyFilters,
  resetFilters,
  typeLabel,
  typeOptions,
  projects,
  engineers,
  statuses,
}) {
  if (!open) return null;
  return (
    <div className="filters-panel">
      <div className="filters-grid">
        <Select
          id="mfg-filter-project"
          label="Project"
          options={[
            { value: 'All', label: 'All Projects' },
            ...projects.map((project) => ({
              value: project.id,
              label: `${project.id} · ${project.name}`,
            })),
          ]}
          value={draftFilters.projectId}
          onChange={(event) =>
            setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))
          }
        />
        {typeOptions && (
          <Select
            id="mfg-filter-type"
            label={typeLabel || 'Type'}
            options={[{ value: 'All', label: `All ${typeLabel || 'Types'}` }, ...typeOptions.map((value) => ({ value, label: value }))]}
            value={draftFilters.type}
            onChange={(event) =>
              setDraftFilters((previous) => ({ ...previous, type: event.target.value }))
            }
          />
        )}
        <Select
          id="mfg-filter-engineer"
          label="Responsible Engineer"
          options={[
            { value: 'All', label: 'All Engineers' },
            ...engineers.map((value) => ({ value, label: value })),
          ]}
          value={draftFilters.engineer}
          onChange={(event) =>
            setDraftFilters((previous) => ({ ...previous, engineer: event.target.value }))
          }
        />
        <Select
          id="mfg-filter-status"
          label="Status"
          options={[{ value: 'All', label: 'All Statuses' }, ...statuses.map((value) => ({ value, label: value }))]}
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters((previous) => ({ ...previous, status: event.target.value }))
          }
        />
        <div className="form-field">
          <label className="form-label" htmlFor="mfg-filter-from">
            Due Date From
          </label>
          <input
            id="mfg-filter-from"
            type="date"
            className="form-input"
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((previous) => ({ ...previous, from: event.target.value }))
            }
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="mfg-filter-to">
            Due Date To
          </label>
          <input
            id="mfg-filter-to"
            type="date"
            className="form-input"
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((previous) => ({ ...previous, to: event.target.value }))
            }
          />
        </div>
        <div className="filter-actions">
          <Button onClick={applyFilters}>Apply Filters</Button>
          <Button variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
