import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import PageHeader from './PageHeader';
import PageLayout from './PageLayout';

/**
 * RecordViewHero — the record reference/status/key-facts strip that sits under
 * the page header on every View Details page, matching the reference quotation
 * view. `meta` accepts [label, value] pairs.
 */
export function RecordViewHero({ recordRef, status, chips, meta = [] }) {
  if (!recordRef && !status && !chips && meta.length === 0) return null;
  return (
    <section className="record-view-hero" aria-label="Record summary">
      <div className="record-view-hero-head">
        {recordRef && <span className="record-view-ref">{recordRef}</span>}
        {status}
        {chips}
      </div>
      {meta.length > 0 && (
        <dl className="record-view-meta">
          {meta.map((item) => {
            const label = Array.isArray(item) ? item[0] : item.label;
            const value = Array.isArray(item) ? item[1] : item.value;
            return (
              <div key={label} className="record-view-meta-item">
                <dt>{label}</dt>
                <dd>
                  {value === null || value === undefined || value === '' ? 'Not available' : value}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

/**
 * RecordViewPage — the standardized View Details page used by every module.
 *
 * It reproduces the reference quotation view's information hierarchy:
 *   breadcrumb → title + status + header actions → record reference/hero strip
 *   with key facts → section cards (module content) → related sections.
 *
 * Module pages keep their own real fields, cards, tabs and actions; only the
 * page frame, hero and spacing are shared so every module looks the same.
 */
export default function RecordViewPage({
  breadcrumb,
  icon,
  title,
  subtitle,
  recordRef,
  status,
  chips,
  meta = [],
  actions,
  tabs,
  backTo,
  children,
  className = '',
}) {
  const navigate = useNavigate();

  return (
    <PageLayout
      breadcrumb={breadcrumb}
      tabs={tabs}
      className={className}
      header={
        <PageHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          actions={
            <>
              {backTo && (
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate(backTo.to)}
                >
                  {backTo.label || 'Back to List'}
                </Button>
              )}
              {actions}
            </>
          }
        />
      }
    >
      {(recordRef || status || chips || meta.length > 0) && (
        <section className="record-view-hero" aria-label="Record summary">
          <div className="record-view-hero-head">
            {recordRef && <span className="record-view-ref">{recordRef}</span>}
            {status}
            {chips}
          </div>
          {meta.length > 0 && (
            <dl className="record-view-meta">
              {meta.map((item) => {
                const label = Array.isArray(item) ? item[0] : item.label;
                const value = Array.isArray(item) ? item[1] : item.value;
                return (
                  <div key={label} className="record-view-meta-item">
                    <dt>{label}</dt>
                    <dd>{value === null || value === undefined || value === '' ? 'Not available' : value}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>
      )}
      {children}
    </PageLayout>
  );
}
