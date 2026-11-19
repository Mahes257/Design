import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import useClickOutside from '../../hooks/useClickOutside';

/**
 * Dropdown — a menu anchored to its trigger.
 *
 * `trigger` is a render prop receiving { open, toggle }.
 * `children` is a render prop receiving { close } so items can dismiss the menu.
 *
 * `portal` renders the menu into document.body with fixed positioning. List
 * tables use it so row action menus are never clipped by the table's
 * horizontal scroll container; the menu is re-positioned on scroll/resize and
 * flips above the trigger when there is not enough space below.
 */
export default function Dropdown({ trigger, children, align = 'right', portal = false }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useClickOutside(wrapRef, close, open && !portal);

  const place = useCallback(() => {
    const anchor = wrapRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const measuredHeight = menuRef.current?.offsetHeight || 200;
    const menuWidth = menuRef.current?.offsetWidth || 190;
    const menuHeight = Math.min(measuredHeight, Math.max(120, window.innerHeight - 16));
    // Flip above the trigger when the menu would not fit below it, then clamp
    // to the viewport so the menu is never rendered off screen.
    const openUp =
      rect.bottom + gap + menuHeight > window.innerHeight && rect.top - gap - menuHeight > 0;
    const preferredTop = openUp ? rect.top - gap - menuHeight : rect.bottom + gap;
    const clampedTop = Math.max(8, Math.min(preferredTop, window.innerHeight - menuHeight - 8));
    const next = {
      top: Math.round(clampedTop),
      bottom: 'auto',
      maxHeight: Math.round(menuHeight),
      overflowY: 'auto',
    };
    if (align === 'left') {
      next.left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      next.right = 'auto';
    } else {
      next.right = Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - menuWidth - 8));
      next.left = 'auto';
    }
    setPosition(next);
  }, [align]);

  useLayoutEffect(() => {
    if (!open || !portal) return;
    place();
  }, [open, portal, place]);

  useEffect(() => {
    if (!open || !portal) return undefined;
    const onScrollOrResize = () => place();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, portal, place]);

  useEffect(() => {
    if (!open || !portal) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, portal]);

  const menu = (
    <div
      ref={menuRef}
      className={`dropdown-menu${align === 'left' ? ' align-left' : ''}${portal ? ' is-portal' : ''}`}
      role="menu"
      style={portal ? { position: 'fixed', ...(position || { visibility: 'hidden' }) } : undefined}
    >
      {children({ close })}
    </div>
  );

  return (
    <div className="dropdown" ref={wrapRef}>
      {trigger({ open, toggle: () => setOpen((value) => !value), close })}
      {open && (portal ? createPortal(menu, document.body) : menu)}
    </div>
  );
}

export function DropdownItem({ icon: Icon, children, onClick, danger = false, disabled = false, role = 'menuitem' }) {
  return (
    <button
      type="button"
      role={role}
      className={`dropdown-item${danger ? ' is-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="dropdown-sep" role="separator" />;
}

/**
 * ActionMenu — the ⋮ row menu used by every list table.
 * Items: { key, label, icon?, danger?, divider? }
 * The menu is portalled so table overflow containers cannot clip it.
 */
export function ActionMenu({ items = [], onSelect, label = 'Row actions' }) {
  return (
    <Dropdown
      portal
      trigger={({ open, toggle }) => (
        <button
          type="button"
          className="icon-btn"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
        >
          <MoreVertical aria-hidden="true" />
        </button>
      )}
    >
      {({ close }) =>
        items.map((item, index) => (
          <Fragment key={item.key || `action-${index}`}>
            {item.divider && <DropdownSeparator />}
            <DropdownItem
              icon={item.icon}
              danger={item.danger}
              onClick={() => {
                close();
                onSelect?.(item.key);
              }}
            >
              {item.label}
            </DropdownItem>
          </Fragment>
        ))
      }
    </Dropdown>
  );
}
