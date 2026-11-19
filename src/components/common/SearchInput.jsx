import { Search } from 'lucide-react';

/** Search control used in every list toolbar. */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  id,
  ariaLabel = 'Search',
  className = '',
}) {
  return (
    <div className={`search-field ${className}`.trim()}>
      <Search className="search-icon" aria-hidden="true" />
      <input
        id={id}
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        autoComplete="off"
      />
    </div>
  );
}
