import React, { useEffect, useRef, useState } from 'react';
/**
 * EditorMenuBar
 *
 * A menu bar in the shape a text editor uses: a row of labelled menus, each
 * opening a dropdown of related commands.
 *
 * Why this shape:
 *   - Nothing is hidden behind a disclosure toggle any more. The old design put
 *     history/search/piano behind an "Alat" drawer, so the commands a user
 *     needed most were the ones they could not see.
 *   - Every command is reachable in two clicks and grouped by what it acts on
 *     (Berkas / Riwayat / Format / Sisip / Tampilan), which is the grouping a
 *     user already knows from any editor.
 *   - The menus, the items, the separators and the shortcut hints are all styled
 *     the same way, so the bar reads as one control instead of a pile of
 *     differently-shaped buttons.
 *
 * Menus are driven by declarative item lists so a caller cannot accidentally
 * render an item that looks different from its neighbours.
 */

const CLOSE_DELAY_MS = 120;

export default function EditorMenuBar({ menus = [], ariaLabel = 'Menu editor' }) {
  const [openIndex, setOpenIndex] = useState(null);
  const rootRef = useRef(null);
  const closeTimer = useRef(null);

  // Close on outside click, Escape, or focus leaving the bar entirely.
  useEffect(() => {
    if (openIndex === null) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpenIndex(null);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenIndex(null);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openIndex]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openMenu = (index) => {
    clearTimeout(closeTimer.current);
    setOpenIndex(index);
  };

  /** Small grace period so travelling to the dropdown does not close it. */
  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIndex(null), CLOSE_DELAY_MS);
  };

  const cancelClose = () => clearTimeout(closeTimer.current);

  return (
    <div className="ed-menubar" ref={rootRef} role="menubar" aria-label={ariaLabel}>
      {menus.map((menu, index) => {
        const isOpen = openIndex === index;

        return (
          <div className="ed-menu" key={menu.key || menu.label}>
            <button
              type="button"
              className={`ed-menu-trigger${isOpen ? ' is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              aria-controls={`ed-menu-${menu.key || index}`}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              onMouseEnter={() => openIndex !== null && openMenu(index)}
              onMouseLeave={scheduleClose}
              title={menu.title || menu.label}
            >
              {menu.icon && <span className="ed-menu-icon" aria-hidden="true">{menu.icon}</span>}
              {menu.label}
              <span className="ed-menu-caret" aria-hidden="true">▾</span>
            </button>

            {isOpen && (
              <div
                id={`ed-menu-${menu.key || index}`}
                className="ed-dropdown"
                role="menu"
                aria-label={menu.label}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                {menu.header && <div className="ed-dropdown-header">{menu.header}</div>}

                {(menu.items || []).map((item, itemIndex) => {
                  if (!item) return null;
                  if (item.type === 'separator') {
                    return <div className="ed-dropdown-sep" key={`sep-${itemIndex}`} role="separator" />;
                  }
                  if (item.type === 'label') {
                    return (
                      <div className="ed-dropdown-label" key={`label-${itemIndex}`}>
                        {item.label}
                      </div>
                    );
                  }
                  if (item.type === 'custom') {
                    return (
                      <div className="ed-dropdown-custom" key={`custom-${itemIndex}`}>
                        {item.render}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.key || item.label}
                      type="button"
                      role="menuitem"
                      className={`ed-dropdown-item${item.active ? ' is-active' : ''}`}
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.keepOpen !== true) setOpenIndex(null);
                        item.onSelect?.();
                      }}
                      title={item.disabled && item.disabledHint ? item.disabledHint : item.title || item.label}
                    >
                      <span className="ed-dropdown-item-icon" aria-hidden="true">
                        {item.icon || ''}
                      </span>
                      {/* Label and hint are separate elements so the label reads
                          as its own string (screen readers and tests both see
                          "Pecah Bar", not "Pecah Bar4 bar/baris"). The hint is
                          supplementary, so it is announced after a separator. */}
                      <span className="ed-dropdown-item-label">{item.label}</span>
                      {item.hint && (
                        <span className="ed-dropdown-item-hint">{item.hint}</span>
                      )}
                      {item.shortcut && <kbd className="ed-dropdown-item-kbd">{item.shortcut}</kbd>}
                      {item.active && <span className="ed-dropdown-item-check" aria-hidden="true">✓</span>}
                    </button>
                  );
                })}

                {menu.footer && <div className="ed-dropdown-footer">{menu.footer}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
