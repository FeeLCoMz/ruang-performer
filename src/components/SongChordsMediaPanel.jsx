import React from "react";
import YouTubeViewer from "./YouTubeViewer.jsx";
import TimeMarkers from "./TimeMarkers.jsx";

/**
 * SongChordsMediaPanel
 * Komponen media panel (YouTube, time markers)
 */
export default function SongChordsMediaPanel({
  mediaPanelExpanded,
  setMediaPanelExpanded,
  youtubeId,
  youtubeRef,
  timeMarkers,
  showTimeMarkers,
  setShowTimeMarkers,
  performanceMode,
  canEdit,
  handleTimeMarkerUpdate,
}) {
  return (
    <div className="media-panel">
      <div className="media-panel-header">
        <div className="media-panel-header-content">
          <div>
            <h3 className="media-panel-title">
              <span className="media-panel-icon">📺</span>
              Video & Time Markers
            </h3>
          </div>
          <button
            className="media-panel-toggle"
            onClick={() => setMediaPanelExpanded(!mediaPanelExpanded)}
            aria-label={mediaPanelExpanded ? "Sembunyikan panel" : "Tampilkan panel"}
          >
            {mediaPanelExpanded ? "▲" : "▶"}
          </button>
        </div>
      </div>
      {mediaPanelExpanded && (
        <div className="media-panel-content media-panel-grid">
          {/* YouTube Video Section - Left */}
          <div className="media-section media-video-section">
            <div className="media-section-header">
              <span className="media-section-icon">🎥</span>
              <span className="media-section-label">YouTube Video</span>
            </div>
            <div className="media-section-body">
              {youtubeId ? (
                <YouTubeViewer ref={youtubeRef} videoId={youtubeId} />
              ) : (
                <div className="media-empty-state">
                  <span className="media-empty-icon">📹</span>
                  <p className="media-empty-text">Tidak ada video YouTube</p>
                  <p className="media-empty-hint">Tambahkan YouTube URL di edit song</p>
                </div>
              )}
            </div>
          </div>
          {/* Time Markers Section - Right */}
          <div className="media-section media-markers-section">
            <div className="media-section-header media-section-header-flex">
              <div>
                <span className="media-section-icon">⏱️</span>
                <span className="media-section-label">Time Markers</span>
                {timeMarkers.length > 0 && (
                  <span className="media-section-badge">{timeMarkers.length}</span>
                )}
              </div>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setShowTimeMarkers(!showTimeMarkers)}
                aria-label={showTimeMarkers ? "Sembunyikan time marker" : "Tampilkan time marker"}
                title={showTimeMarkers ? "Sembunyikan time marker" : "Tampilkan time marker"}
              >
                {showTimeMarkers ? "▼" : "▶"}
              </button>
            </div>
            {showTimeMarkers && (
              <div className="media-section-body">
                <TimeMarkers
                  timeMarkers={timeMarkers}
                  readonly={performanceMode || !canEdit}
                  onUpdate={handleTimeMarkerUpdate}
                  onSeek={(time, opts) => {
                    if (
                      opts &&
                      opts.pause &&
                      youtubeRef.current &&
                      youtubeRef.current.handlePause
                    ) {
                      youtubeRef.current.handlePause();
                      return;
                    }
                    if (
                      typeof time === "number" &&
                      youtubeRef.current &&
                      youtubeRef.current.handleSeek
                    ) {
                      youtubeRef.current.handleSeek(time);
                    }
                  }}
                  getCurrentYouTubeTime={() => {
                    if (youtubeRef.current && typeof youtubeRef.current.currentTime === "number") {
                      return youtubeRef.current.currentTime;
                    }
                    return 0;
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
