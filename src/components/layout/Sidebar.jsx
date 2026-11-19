import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ChevronDown,
  Clock3,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';
import { BRAND_NAME, BRAND_SUBLABEL, BrandMark } from '../../constants/brand';
import {
  DASHBOARD,
  LIFECYCLE_GROUPS,
  findLifecycleGroup,
  findLifecycleItem,
  normalizePath,
} from '../../config/navigation';
import Button from '../common/Button';
import Modal from '../common/Modal';

/**
 * Sidebar — brand, menu search and the manufacturing lifecycle navigation.
 *
 * Groups are collapsible; each child is a real route. Existing module URLs are
 * preserved and the new lifecycle destinations resolve to shared placeholder
 * dashboards. Submodule tabs stay inside their module page.
 */
export default function Sidebar({
  pathname,
  expanded,
  isMobile,
  mobileOpen,
  onToggle,
  onNavigate,
}) {
  const path = normalizePath(pathname);
  const isDashboard = path === '/' || path === DASHBOARD.path;
  const activeGroup = useMemo(() => findLifecycleGroup(path), [path]);
  const activeItem = useMemo(() => findLifecycleItem(path), [path]);

  const [menuSearch, setMenuSearch] = useState('');
  const [openGroups, setOpenGroups] = useState(
    () => new Set([activeGroup?.key || LIFECYCLE_GROUPS[0].key]),
  );
  const [tooltip, setTooltip] = useState(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  /* A route change ends a menu search and reveals the active lifecycle group. */
  useEffect(() => {
    setMenuSearch('');
    if (!activeGroup?.key) return;

    setOpenGroups((current) => {
      if (current.has(activeGroup.key)) return current;
      return new Set(current).add(activeGroup.key);
    });
  }, [pathname, activeGroup?.key]);

  const query = menuSearch.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!query) return LIFECYCLE_GROUPS;

    return LIFECYCLE_GROUPS.map((group) => {
      if (group.path) {
        const matches =
          group.label.toLowerCase().includes(query) ||
          group.searchTerms?.some((term) => term.includes(query));
        return matches ? group : null;
      }

      const groupMatches = group.label.toLowerCase().includes(query);
      const items = groupMatches
        ? group.items
        : group.items.filter((item) => item.label.toLowerCase().includes(query));

      return items.length ? { ...group, items } : null;
    }).filter(Boolean);
  }, [query]);

  const showTip = (event, label) => {
    if (isMobile || expanded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, x: rect.right + 12, y: rect.top + rect.height / 2 });
  };

  const hideTip = () => setTooltip(null);

  const go = (to) => {
    onNavigate(to);
    if (query) setMenuSearch('');
  };

  const toggleGroup = (group) => {
    /* On the collapsed desktop rail, a group click first reveals the sidebar. */
    if (!expanded && !isMobile) {
      onToggle();
      setOpenGroups(new Set([group.key]));
      return;
    }

    /* Search results are forced open; a click returns to normal accordion use. */
    if (query) {
      setMenuSearch('');
      setOpenGroups((current) => new Set(current).add(group.key));
      return;
    }

    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group.key)) next.delete(group.key);
      else next.add(group.key);
      return next;
    });
  };

  const toggleLabel = isMobile
    ? 'Close Sidebar'
    : expanded
      ? 'Collapse Sidebar'
      : 'Expand Sidebar';
  const toggleShowsClose = isMobile ? mobileOpen : expanded;

  return (
    <>
      <aside
        id="app-sidebar"
        className={`app-sidebar${expanded ? ' expanded' : ''}${isMobile ? ' app-sidebar--mobile' : ''}${
          isMobile && mobileOpen ? ' is-open' : ''
        }`}
        aria-label="Sidebar navigation"
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="sb-top">
          {/* Brand */}
          <div className="sb-logo">
            <BrandMark />
            <span className="sb-label sb-brand-text">
              <span className="sb-logo-text">{BRAND_NAME}</span>
              <span className="sb-logo-sub">{BRAND_SUBLABEL}</span>
            </span>
          </div>

          {/* Menu search */}
          <div className="sb-search">
            <div className="sb-search-wrap">
              <Search className="sb-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="sb-search-input"
                placeholder="Search menu..."
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                aria-label="Search menu"
              />
            </div>
          </div>

          {/* Navigation — lifecycle groups with route-backed children */}
          <nav className="sb-nav" aria-label="Primary">
            <button
              type="button"
              className={`sb-nav-item${isDashboard ? ' is-active' : ''}`}
              onClick={() => go(DASHBOARD.path)}
              onMouseEnter={(event) => showTip(event, DASHBOARD.label)}
              onMouseLeave={hideTip}
              aria-current={isDashboard ? 'page' : undefined}
              aria-label={DASHBOARD.label}
            >
              <DASHBOARD.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="sb-label">{DASHBOARD.label}</span>
            </button>

            {visibleGroups.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = query ? true : openGroups.has(group.key);
              const isActiveGroup = activeGroup?.key === group.key;
              const childrenId = `sb-group-${group.key}`;

              if (group.path) {
                return (
                  <button
                    key={group.key}
                    type="button"
                    className={`sb-nav-item${isActiveGroup ? ' is-active' : ''}`}
                    onClick={() => go(group.path)}
                    onMouseEnter={(event) => showTip(event, group.label)}
                    onMouseLeave={hideTip}
                    aria-current={isActiveGroup ? 'page' : undefined}
                    aria-label={group.label}
                    title={group.label}
                  >
                    <GroupIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="sb-label">{group.label}</span>
                  </button>
                );
              }

              return (
                <div
                  key={group.key}
                  className="sb-group"
                  data-open={isOpen}
                >
                  <button
                    type="button"
                    className={`sb-nav-item sb-group-header${isActiveGroup ? ' is-parent-active' : ''}`}
                    onClick={() => toggleGroup(group)}
                    onMouseEnter={(event) => showTip(event, group.label)}
                    onMouseLeave={hideTip}
                    aria-expanded={isOpen}
                    aria-controls={childrenId}
                    aria-label={`${group.label}, ${group.items.length} ${
                      group.items.length === 1 ? 'item' : 'items'
                    }`}
                    title={group.label}
                  >
                    <GroupIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="sb-label sb-label--flex">{group.label}</span>
                    <span className="sb-group-count sb-label" aria-hidden="true">
                      {group.items.length}
                    </span>
                    <span className="sb-chevron-btn" aria-hidden="true">
                      <ChevronDown
                        className={`sb-group-chevron${isOpen ? ' rotated' : ''}`}
                      />
                    </span>
                  </button>

                  <div className="sb-group-children" id={childrenId}>
                    <div className="sb-group-children-inner">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = activeItem?.key === item.key;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={`sb-subitem${isActive ? ' is-active' : ''}`}
                            onClick={() => go(item.path)}
                            aria-current={isActive ? 'page' : undefined}
                            title={item.label}
                          >
                            <ItemIcon aria-hidden="true" />
                            <span className="sb-subitem-label">{item.label}</span>
                            {item.isPlaceholder && (
                              <span className="sb-subitem-badge">Soon</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {query && visibleGroups.length === 0 && (
              <p className="sb-empty">No menu item matches “{menuSearch}”.</p>
            )}
          </nav>
        </div>

        {/* Bottom utilities */}
        <div className="sb-bottom">
          <button
            type="button"
            onClick={onToggle}
            className="sb-nav-item"
            onMouseEnter={(event) => showTip(event, toggleLabel)}
            onMouseLeave={hideTip}
            aria-label={toggleLabel}
            aria-expanded={isMobile ? mobileOpen : expanded}
            aria-controls="app-sidebar"
          >
            {toggleShowsClose ? (
              <PanelLeftClose className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span className="sb-label">{toggleLabel}</span>
          </button>

          <button
            type="button"
            className="sb-nav-item"
            onClick={() => go('/design-review')}
            onMouseEnter={(event) => showTip(event, 'Pending Approvals')}
            onMouseLeave={hideTip}
            aria-label="Pending Approvals (0)"
            title="No pending approvals in the frontend-only build"
          >
            <Clock3 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sb-label">Pending Approvals</span>
            <span className="sb-notif-circle is-zero" aria-hidden="true">
              <span className="sb-notif-count">0</span>
            </span>
          </button>

          <button
            type="button"
            className="sb-nav-item"
            onClick={() => setNotificationsOpen(true)}
            onMouseEnter={(event) => showTip(event, 'Notifications')}
            onMouseLeave={hideTip}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sb-label">Notifications</span>
          </button>

          <button
            type="button"
            className="sb-nav-item sb-nav-item--danger"
            onClick={() => setSignOutOpen(true)}
            onMouseEnter={(event) => showTip(event, 'Sign Out')}
            onMouseLeave={hideTip}
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sb-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {!expanded &&
        !isMobile &&
        tooltip &&
        createPortal(
          <span className="sb-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.label}
          </span>,
          document.body,
        )}

      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
        subtitle="Design reviews, approvals and change requests"
        maxWidth="max-w-sm"
        footer={
          <Button
            variant="ghost"
            onClick={() => {
              setNotificationsOpen(false);
              go('/design-review');
            }}
          >
            Go to Pending Reviews
          </Button>
        }
      >
        <p style={{ margin: 0 }}>
          No notifications yet. This frontend-only build has no backend feed to subscribe to.
        </p>
      </Modal>

      <Modal
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out?"
        subtitle="Mechanical Design · VISHAK TECH"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={LogOut}
              onClick={() => {
                setSignOutOpen(false);
                onNavigate(DASHBOARD.path);
              }}
            >
              Sign Out
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          This layout is a frontend-only build, so no session is stored. Signing out returns the
          workspace to the Dashboard.
        </p>
      </Modal>
    </>
  );
}
