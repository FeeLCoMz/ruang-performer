import React from 'react';

/**
 * Loading Skeleton Component
 * Shows animated skeleton placeholders while content loads
 */

export function SongCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-text skeleton-title"></div>
        <div className="skeleton-text skeleton-subtitle"></div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-text skeleton-line"></div>
        <div className="skeleton-text skeleton-line"></div>
        <div className="skeleton-text skeleton-line short"></div>
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-button"></div>
        <div className="skeleton-button"></div>
      </div>
    </div>
  );
}

export function SongListSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-grid">
      {Array(count).fill(0).map((_, i) => (
        <SongCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SongDetailSkeleton() {
  return (
    <div className="skeleton-detail">
      <div className="skeleton-header-section">
        <div className="skeleton-text skeleton-title"></div>
        <div className="skeleton-text skeleton-subtitle"></div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-text skeleton-line"></div>
        <div className="skeleton-text skeleton-line"></div>
        <div className="skeleton-text skeleton-line"></div>
        <div className="skeleton-text skeleton-line short"></div>
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="skeleton-list-item">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-text skeleton-line"></div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {Array(count).fill(0).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}
