import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb — the reference ERP trail style:
 *   Dashboard › Group › Current page
 * Items: [{ label, to? }]. The last item is the current page.
 */
export default function Breadcrumb({ items = [], className = '' }) {
  if (!items.length) return null;

  return (
    <nav className={`breadcrumb ${className}`.trim()} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;

        if (isLast) {
          return (
            <span key={`${item.label}-${index}`} className="bc-step">
              {!isFirst && <ChevronRight className="bc-sep" aria-hidden="true" />}
              <span className="bc-current" aria-current="page">
                {item.label}
              </span>
            </span>
          );
        }

        return (
          <span key={`${item.label}-${index}`} className="bc-step">
            {!isFirst && <ChevronRight className="bc-sep" aria-hidden="true" />}
            {item.to ? (
              <Link className="bc-link" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
