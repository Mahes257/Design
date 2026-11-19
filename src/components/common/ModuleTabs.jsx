import { Link } from 'react-router-dom';

/**
 * ModuleTabs — the horizontal submodule navigation rendered inside every
 * module page. Visual and behavioural port of the reference ERP's RFQ &
 * Quotations tab bar (rfq-tab-nav): pill tabs, 11px bold labels, solid green
 * active tab with a soft ring, horizontally scrollable when the row overflows.
 *
 * Tabs are real links, so each submodule has its own URL and a refresh or
 * direct link lands on the correct tab.
 */
export default function ModuleTabs({ module, activeTab }) {
  if (!module?.tabs?.length) return null;

  return (
    <nav className="module-tabs" aria-label={`${module.label} submodules`}>
      <div className="module-tabs-inner" role="tablist">
        {module.tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;

          return (
            <Link
              key={tab.key}
              to={tab.path}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={`module-tab${isActive ? ' is-active' : ''}`}
              title={tab.label}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
