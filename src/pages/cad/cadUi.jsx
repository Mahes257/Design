import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Select } from '../../components/common';
import { formatBytes } from '../../data/cadData';

export { Fact, Toast, useToast } from '../mechanical/mechanicalUi';

export { formatBytes };

export function money(value, currency = 'INR') {
  return `${currency} ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function SectionNav({ sections, active, onChange, counts = {} }) {
  return (
    <div className="mech-domain-bar cad-section-bar is-segmented">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={`mech-domain-chip${active === section.key ? ' is-active' : ''}`}
          onClick={() => onChange(section.key)}
        >
          {section.label}
          {counts[section.key] != null && <span>{counts[section.key]}</span>}
        </button>
      ))}
    </div>
  );
}

export const EMPTY_FILTERS = { projectId: 'All', status: 'All', type: 'All', partNumber: '', from: '', to: '' };

export function useTable(rows, filterRow, initialSort = 'id') {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => filterRow(row, filters, query));
  }, [rows, filters, search, filterRow]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((left, right) => {
      const a = String(left[sortKey] ?? '');
      const b = String(right[sortKey] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
    return list;
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${sorted.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    sorted.length,
  )} of ${sorted.length}`;

  return {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    draftFilters,
    setDraftFilters,
    filters,
    applyFilters: () => {
      setFilters(draftFilters);
      setPage(1);
      setFiltersOpen(false);
    },
    reset: () => {
      setSearch('');
      setFilters(EMPTY_FILTERS);
      setDraftFilters(EMPTY_FILTERS);
      setSelectedIds([]);
      setPage(1);
    },
    sortKey,
    sortDirection,
    toggleSort: (key) => {
      if (sortKey === key) setSortDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
      else {
        setSortKey(key);
        setSortDirection('asc');
      }
    },
    page,
    setPage,
    pageSize,
    setPageSize,
    pageRows,
    sorted,
    pageInfo,
    selectedIds,
    setSelectedIds,
  };
}

export function CadFilters({ table, projects, statuses, types, typeLabel = 'Category / Type', partLabel = 'Part Number' }) {
  if (!table.filtersOpen) return null;
  return (
    <div className="cad-filters-panel">
      <div className="cad-filters-grid">
        <Select
          id="cad-filter-project"
          label="Project"
          options={[{ value: 'All', label: 'All Projects' }, ...projects.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))]}
          value={table.draftFilters.projectId}
          onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, projectId: event.target.value }))}
        />
        <Select
          id="cad-filter-status"
          label="Status"
          options={[{ value: 'All', label: 'All Statuses' }, ...statuses.map((s) => ({ value: s, label: s }))]}
          value={table.draftFilters.status}
          onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, status: event.target.value }))}
        />
        {types && (
          <Select
            id="cad-filter-type"
            label={typeLabel}
            options={[{ value: 'All', label: 'All Types' }, ...types.map((s) => ({ value: s, label: s }))]}
            value={table.draftFilters.type}
            onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, type: event.target.value }))}
          />
        )}
        <div className="form-field">
          <label className="form-label" htmlFor="cad-filter-part">{partLabel}</label>
          <input
            id="cad-filter-part"
            className="form-input"
            placeholder="e.g. MEC-041-001"
            value={table.draftFilters.partNumber}
            onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, partNumber: event.target.value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="cad-filter-from">Date From</label>
          <input
            id="cad-filter-from"
            type="date"
            className="form-input"
            value={table.draftFilters.from}
            onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, from: event.target.value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="cad-filter-to">Date To</label>
          <input
            id="cad-filter-to"
            type="date"
            className="form-input"
            value={table.draftFilters.to}
            onChange={(event) => table.setDraftFilters((previous) => ({ ...previous, to: event.target.value }))}
          />
        </div>
        <div className="filter-actions">
          <Button onClick={table.applyFilters}>Apply Filters</Button>
          <Button variant="ghost" onClick={table.reset}>Reset</Button>
        </div>
      </div>
    </div>
  );
}

export function FileTypeBadge({ extension }) {
  return <span className={`cad-filetype cad-filetype-${String(extension || '').toLowerCase()}`}>{extension || '—'}</span>;
}

export function AttachmentList({ files = [], onRemove }) {
  if (!files.length) return <p className="dash-modal-note">No attachments recorded.</p>;
  return (
    <ul className="mech-document-list">
      {files.map((file) => (
        <li key={file.name}>
          <span className="cad-filetype">{file.type}</span>
          <span>{file.name}</span>
          <span className="cell-muted">
            {formatBytes(file.size)} · {file.preview ? 'preview available' : 'no in-app preview'}
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

/** Draw once for the whole module; the detail modals reuse these labels. */
export const CAPABILITY_HELP = [
  ['SVG', 'Interactive vector rendering (zoom, pan, layers, sheets)'],
  ['PDF', 'Browser-native PDF engine (page navigation inside the PDF frame)'],
  ['PNG / JPG / BMP / GIF', 'Browser image rendering with zoom and pan'],
  ['OBJ / STL / GLB / GLTF / PLY', 'Three.js mesh loading with orbit, pan, zoom and model tree'],
  ['DWG / DXF / DGN / STEP / STP / IGES / SLDPRT / SLDASM', 'Stored and downloadable only — no verified browser renderer in this build'],
];
