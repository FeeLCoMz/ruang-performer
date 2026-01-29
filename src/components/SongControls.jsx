import React from 'react';

export function TransposeControl({ transpose, setTranspose, highlightChords, setHighlightChords, TransposeBar }) {
  return (
      <TransposeBar
        transpose={transpose}
        setTranspose={setTranspose}
        highlightChords={highlightChords}
        setHighlightChords={setHighlightChords}
      />

  );
}

export function AutoScrollControl({ tempo, AutoScrollBar }) {
  return (
      <AutoScrollBar tempo={tempo} />
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
