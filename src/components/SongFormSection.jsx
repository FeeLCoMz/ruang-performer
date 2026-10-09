import React from "react";

/**
 * SongFormSection
 * Collapsible form section used across the song editor. Keeps the header markup,
 * badge, and toggle behaviour consistent so every panel opens the same way.
 *
 * Props:
 *   - id: stable id used for aria-controls
 *   - icon, title, subtitle
 *   - badge: optional node (count, status pill)
 *   - isOpen, onToggle
 *   - actions: optional node rendered on the right of the header
 *   - incomplete: marks the section as still needing input while collapsed
 */
export default function SongFormSection({
  id,
  icon,
  title,
  subtitle,
  badge = null,
  isOpen,
  onToggle,
  actions = null,
  incomplete = false,
  children,
}) {
  const panelId = `${id}-panel`;
  const headerId = `${id}-header`;

  return (
    <section className={`song-form-section${isOpen ? " is-open" : ""}${incomplete ? " is-incomplete" : ""}`}>
      <div className="song-form-section-header">
        <button
          type="button"
          id={headerId}
          className="song-form-section-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="song-form-section-chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
          <span className="song-form-section-icon" aria-hidden="true">{icon}</span>
          <span className="song-form-section-titles">
            <span className="song-form-section-title">{title}</span>
            {subtitle && <span className="song-form-section-subtitle">{subtitle}</span>}
          </span>
          {badge}
        </button>
        {actions && <div className="song-form-section-actions">{actions}</div>}
      </div>

      {isOpen && (
        <div id={panelId} role="region" aria-labelledby={headerId} className="song-form-section-body">
          {children}
        </div>
      )}
    </section>
  );
}
