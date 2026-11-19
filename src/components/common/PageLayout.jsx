/**
 * PageLayout — the page shell every Mechanical Design screen renders.
 *
 * Keeps the page's top control section (breadcrumb, title, actions, submodule
 * tabs) pinned under the app topbar while the content below scrolls, exactly
 * like the reference ERP's module pages.
 */
export default function PageLayout({ breadcrumb, header, tabs, children, className = '' }) {
  return (
    <div className={`erp-page ${className}`.trim()}>
      <div className="erp-page-static-header">
        {breadcrumb}
        {header}
        {tabs}
      </div>
      <div className="erp-page-content">{children}</div>
    </div>
  );
}
