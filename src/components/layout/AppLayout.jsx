import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { findPageMeta } from '../../config/navigation';

const SIDEBAR_KEY = 'md-sidebar-open';

function getInitialSidebarOpen() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== '0';
  } catch {
    return true;
  }
}

/**
 * AppLayout (MainLayout) — the shared ERP shell:
 *   sidebar (collapsible, persisted) + topbar + routed page content.
 */
export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );

  /* Responsive rail: below 768px the sidebar becomes an overlay drawer. */
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const onChange = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  /* Persist the desktop open/collapsed choice, exactly like the theme. */
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '1' : '0');
    } catch {
      // storage unavailable — the choice still applies for this session
    }
  }, [sidebarOpen]);

  /* Reset scroll and close the mobile drawer on navigation. */
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  /* Lock page scrolling while the mobile drawer is open. */
  useEffect(() => {
    if (!isMobile || !mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, mobileOpen]);

  const expanded = isMobile ? mobileOpen : sidebarOpen;

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value);
      return;
    }
    setSidebarOpen((value) => !value);
  }, [isMobile]);

  const go = useCallback(
    (path) => {
      navigate(path);
      if (isMobile) setMobileOpen(false);
    },
    [navigate, isMobile],
  );

  const meta = useMemo(() => findPageMeta(pathname), [pathname]);
  const title = meta?.title || 'Dashboard';

  return (
    <div className="app-shell">
      <Sidebar
        pathname={pathname}
        expanded={expanded}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onNavigate={go}
      />

      {isMobile && mobileOpen && (
        <div
          className="sb-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="app-main">
        <Header
          title={title}
          pathname={pathname}
          isMobile={isMobile}
          onOpenSidebar={() => setMobileOpen(true)}
          onSignOut={() => go('/dashboard')}
          onNavigate={go}
        />
        <div className="app-workspace">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
