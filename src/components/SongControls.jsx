import React from 'react';

export function TransposeControl({ transpose, setTranspose, highlightChords, setHighlightChords, TransposeBar }) {
  return (
    <div className="song-control-group">
      <label className="song-control-label">Transpose</label>
      <TransposeBar
        transpose={transpose}
        setTranspose={setTranspose}
        highlightChords={highlightChords}
        setHighlightChords={setHighlightChords}
      />
    </div>
  );
}

export function AutoScrollControl({ tempo, AutoScrollBar }) {
  return (
    <div className="song-control-group">
      <label className="song-control-label">Auto Scroll</label>
      <AutoScrollBar tempo={tempo} />
    </div>
  );
}

export default function SongControls({ transpose, setTranspose, highlightChords, setHighlightChords, tempo, TransposeBar, AutoScrollBar }) {
  return (
    <div className="song-detail-controls">
      <TransposeControl
        transpose={transpose}
        setTranspose={setTranspose}
        highlightChords={highlightChords}
        setHighlightChords={setHighlightChords}
        TransposeBar={TransposeBar}
      />
      <AutoScrollControl tempo={tempo} AutoScrollBar={AutoScrollBar} />
    </div>
  );
}
