import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

function buildPageWindow(page, totalPages) {
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, page + 2);
  if (end - start < 4 && totalPages > 5) {
    if (start === 1) end = Math.min(totalPages, start + 4);
    else start = Math.max(1, end - 4);
  }
  const numbers = [];
  for (let n = start; n <= end; n += 1) numbers.push(n);
  return numbers;
}

/**
 * Pagination — page info + rows-per-page on the left, 36px page buttons on the
 * right (first / previous / numbered window / next / last).
 */
export default function Pagination({
  page = 1,
  totalPages = 1,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  pageInfo = '',
  onPageChange,
  onPageSizeChange,
}) {
  const safeTotal = Math.max(1, totalPages);
  const pages = buildPageWindow(page, safeTotal);

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-left">
        {pageInfo && <span className="pg-info">{pageInfo}</span>}
        <span className="pg-rows">
          Rows:{' '}
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </span>
      </div>
      <div className="pagination-right">
        <div className="pg-btns">
          <button type="button" title="First" disabled={page <= 1} onClick={() => onPageChange?.(1)}>
            <ChevronsLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Previous"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          {pages.map((number) => (
            <button
              key={number}
              type="button"
              className={page === number ? 'active' : ''}
              aria-current={page === number ? 'page' : undefined}
              onClick={() => onPageChange?.(number)}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            title="Next"
            disabled={page >= safeTotal}
            onClick={() => onPageChange?.(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Last"
            disabled={page >= safeTotal}
            onClick={() => onPageChange?.(safeTotal)}
          >
            <ChevronsRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
