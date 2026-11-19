import './view-page-banner.css';

/**
 * ViewPageBanner — the standard Apple Emerald Glass banner for every record
 * View/Detail page in the ERP.
 *
 * Use it as the first element inside `<PageLayout className="vpb-page">`:
 * the page shell hides its now-empty sticky slot, so the banner scrolls with
 * the record content exactly like the reference request view.
 *
 * Props (all optional except title):
 *   breadcrumbs — a <Breadcrumb> element; links and labels are preserved
 *   icon        — module record icon rendered in the glass tile
 *   eyebrow     — record number / identifier line above the title
 *   title       — record title or name
 *   subtitle    — short context line
 *   chips       — status, priority and other existing record badges
 *   actions     — existing action buttons and links (handlers untouched)
 *   meta        — [[label, value], ...] pairs rendered in the frosted card
 */
export default function ViewPageBanner({
  breadcrumbs,
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  chips,
  actions,
  meta = [],
}) {
  const metaItems = (meta || []).filter(Boolean);

  return (
    <section className="vpb-banner" aria-label="Record summary">
      {breadcrumbs ? <div className="vpb-crumbs">{breadcrumbs}</div> : null}

      <div className="vpb-banner-main">
        <div className="vpb-banner-heading">
          {Icon ? (
            <span className="vpb-banner-icon" aria-hidden="true">
              <Icon />
            </span>
          ) : null}
          <div className="vpb-banner-text">
            {eyebrow ? <p className="vpb-banner-eyebrow">{eyebrow}</p> : null}
            <h1 className="vpb-banner-title">{title}</h1>
            {subtitle ? <p className="vpb-banner-subtitle">{subtitle}</p> : null}
            {chips ? <div className="vpb-banner-pills">{chips}</div> : null}
          </div>
        </div>

        {actions ? <div className="vpb-banner-actions">{actions}</div> : null}
      </div>

      {metaItems.length > 0 && (
        <dl className="vpb-banner-meta">
          {metaItems.map((item) => {
            const label = Array.isArray(item) ? item[0] : item.label;
            const value = Array.isArray(item) ? item[1] : item.value;
            return (
              <div key={label} className="vpb-banner-meta-item">
                <dt>{label}</dt>
                <dd>
                  {value === null || value === undefined || value === ''
                    ? 'Not captured'
                    : value}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
