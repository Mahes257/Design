import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, ChevronDown, LogOut, Menu, Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useClickOutside from '../../hooks/useClickOutside';
import { APP_USER } from '../../constants/brand';

/**
 * Header — the ERP topbar: gradient background, page title, calendar and theme
 * controls, notifications and the user profile menu.
 */
export default function Header({ title, pathname, isMobile, onOpenSidebar, onSignOut, onNavigate }) {
  const { isDark, toggleTheme } = useTheme();
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userRef = useRef(null);
  const notifRef = useRef(null);

  useClickOutside(userRef, () => setUserOpen(false), userOpen);
  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen);

  // Close any open topbar menu when the route changes.
  useEffect(() => {
    setUserOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  return (
    <header className="app-topbar">
      {isMobile && (
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Menu style={{ width: 20, height: 20 }} aria-hidden="true" />
        </button>
      )}

      <span className="app-topbar-title">{title}</span>

      <div className="app-topbar-actions">
        <Link
          to="/design-planning/tasks-progress"
          className="topbar-icon-btn topbar-calendar-btn"
          aria-label="Design tasks"
          title="Design tasks"
        >
          <CalendarDays style={{ width: 16, height: 16 }} aria-hidden="true" />
          <span className="topbar-calendar-count" aria-hidden="true">
            0
          </span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className="topbar-icon-btn"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDark}
        >
          {isDark ? (
            <Sun style={{ width: 16, height: 16 }} aria-hidden="true" />
          ) : (
            <Moon style={{ width: 16, height: 16 }} aria-hidden="true" />
          )}
        </button>

        <div className="dropdown" ref={notifRef}>
          <button
            type="button"
            className="topbar-icon-btn"
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((value) => !value)}
          >
            <Bell style={{ width: 16, height: 16 }} aria-hidden="true" />
          </button>
          {notifOpen && (
            <div className="dropdown-menu" style={{ width: 280 }} role="menu">
              <div className="dropdown-label">Notifications</div>
              <p style={{ margin: 0, padding: '6px 10px 12px', fontSize: 12, color: '#94a3b8' }}>
                No notifications yet. Design reviews, approvals and change requests will appear
                here.
              </p>
            </div>
          )}
        </div>

        <span className="topbar-sep" aria-hidden="true" />

        <div className="topbar-user-wrap" ref={userRef}>
          <button
            type="button"
            className="topbar-user-btn"
            onClick={() => setUserOpen((value) => !value)}
            aria-expanded={userOpen}
            aria-haspopup="menu"
          >
            <span className="topbar-user-avatar">{APP_USER.initials}</span>
            <span className="topbar-user-name hidden sm:inline">{APP_USER.name}</span>
            <ChevronDown className="topbar-user-chevron" aria-hidden="true" />
          </button>

          {userOpen && (
            <div className="topbar-user-menu" role="menu">
              <button
                type="button"
                className="topbar-user-menu-item"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false);
                  onNavigate('/settings');
                }}
              >
                <Settings aria-hidden="true" /> Settings
              </button>
              <button
                type="button"
                className="topbar-user-menu-item text-danger"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false);
                  onSignOut();
                }}
              >
                <LogOut aria-hidden="true" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
