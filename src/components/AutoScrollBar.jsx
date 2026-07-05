import React, { useRef, useEffect, useState } from 'react';

const BARLINE_REGEX = /^(\|:|:\||\[\:|:\]|\|\||\|)$/;
const ACTIVE_LINE_CLASS = 'cd-chord-autoscroll-active';

const parseBeatsPerBar = (timeSignature) => {
  const match = String(timeSignature || '4/4').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return 4;
  const numerator = Number(match[1]);
  if (!Number.isFinite(numerator) || numerator <= 0) return 4;
  return Math.max(1, Math.min(12, numerator));
};

const countMeasuresFromLineText = (lineText) => {
  const normalizedTokens = String(lineText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!normalizedTokens.length) return 1;

  const hasBarline = normalizedTokens.some((token) => BARLINE_REGEX.test(token));
  if (hasBarline) {
    let measureCount = 0;
    let hasContentInMeasure = false;

    normalizedTokens.forEach((token) => {
      if (BARLINE_REGEX.test(token)) {
        if (hasContentInMeasure) {
          measureCount += 1;
          hasContentInMeasure = false;
        }
        return;
      }
      hasContentInMeasure = true;
    });

    if (hasContentInMeasure) {
      measureCount += 1;
    }

    return Math.max(1, measureCount);
  }

  // Jika tidak ada barline, 1 chord dianggap 1 bar.
  const chordLikeCount = normalizedTokens.filter((token) => {
    return /^-?[A-G][#b]?(?:maj|min|m|sus|dim|aug|add)?\d*(?:\/[A-G][#b]?)?(?:\.\.|-[A-G][#b]?)/i.test(token)
      || /^-?[A-G][#b]?(?:maj|min|m|sus|dim|aug|add)?\d*(?:\/[A-G][#b]?)?$/i.test(token);
  }).length;

  return Math.max(1, chordLikeCount);
};

const getScrollContainer = (lyricsDisplayRef) => {
  if (!lyricsDisplayRef?.current) return null;
  if (
    lyricsDisplayRef.current === document.body
    || lyricsDisplayRef.current.classList?.contains('karaoke-lyrics-page')
  ) {
    return window;
  }
  return lyricsDisplayRef.current;
};

const getCurrentScrollTop = (container) => {
  if (!container) return 0;
  if (container === window) return window.scrollY || document.documentElement.scrollTop || 0;
  return container.scrollTop || 0;
};

const scrollContainerTo = (container, top, behavior = 'auto') => {
  if (!container) return;
  const normalizedTop = Math.max(0, top);

  if (container === window) {
    window.scrollTo({ top: normalizedTop, behavior });
    return;
  }

  container.scrollTo({ top: normalizedTop, behavior });
};

const getStickyTempoOverlayHeight = (host) => {
  if (!host) return 0;
  const tempoRow = host.querySelector('.song-lyrics-fullscreen-tempo-led-row');
  if (!tempoRow) return 0;

  const style = window.getComputedStyle(tempoRow);
  const marginBottom = Number.parseFloat(style.marginBottom) || 0;
  return Math.ceil(tempoRow.getBoundingClientRect().height + marginBottom);
};

const getLinePreviewOffset = (lineElement, previousLinesToShow = 2) => {
  if (!lineElement) return 0;
  const rect = lineElement.getBoundingClientRect();
  const lineHeight = Number.parseFloat(window.getComputedStyle(lineElement).lineHeight) || rect.height || 24;
  return Math.max(0, Math.ceil(lineHeight * previousLinesToShow));
};

const getElementTopInContainer = (element, container) => {
  if (!element) return 0;
  if (container === window) {
    return element.getBoundingClientRect().top + getCurrentScrollTop(container);
  }
  return element.getBoundingClientRect().top - container.getBoundingClientRect().top + getCurrentScrollTop(container);
};

const computeLineScrollAmount = (lineElements, lineIndex, container) => {
  if (!Array.isArray(lineElements) || !lineElements.length || !container) return 50;

  const safeIndex = Math.min(Math.max(0, lineIndex), lineElements.length - 1);
  const currentLine = lineElements[safeIndex];
  const nextLine = lineElements[safeIndex + 1];

  if (currentLine && nextLine) {
    const currentTop = getElementTopInContainer(currentLine, container);
    const nextTop = getElementTopInContainer(nextLine, container);
    return Math.max(16, nextTop - currentTop);
  }

  if (currentLine) {
    const rect = currentLine.getBoundingClientRect();
    const lineHeightFromStyle = Number.parseFloat(window.getComputedStyle(currentLine).lineHeight) || 0;
    return Math.max(16, rect.height || lineHeightFromStyle || 50);
  }

  return 50;
};

const buildLineBeatPlan = (lyricsDisplayRef, beatsPerBar) => {
  const host = lyricsDisplayRef?.current;
  if (!host) return { lineElements: [], lineBeats: [] };

  const lineElements = Array.from(host.querySelectorAll('.cd .cd-chord'));
  const lineBeats = lineElements.map((el) => {
    const measures = countMeasuresFromLineText(el.textContent || '');
    return Math.max(1, measures * beatsPerBar);
  });

  return { lineElements, lineBeats };
};

const resolveCurrentLineIndex = (lineElements, container) => {
  if (!lineElements.length) return 0;
  const currentTop = getCurrentScrollTop(container) + 8;

  for (let i = 0; i < lineElements.length; i += 1) {
    const line = lineElements[i];
    if (!line) continue;

    const lineTop = container === window
      ? (line.getBoundingClientRect().top + getCurrentScrollTop(container))
      : (line.getBoundingClientRect().top - container.getBoundingClientRect().top + getCurrentScrollTop(container));

    if (lineTop >= currentTop) return i;
  }

  return Math.max(0, lineElements.length - 1);
};

const clearActiveLineIndicator = (lineElements, previousIndexRef) => {
  if (!Array.isArray(lineElements)) return;

  if (
    previousIndexRef
    && typeof previousIndexRef.current === 'number'
    && previousIndexRef.current >= 0
    && previousIndexRef.current < lineElements.length
  ) {
    lineElements[previousIndexRef.current]?.classList.remove(ACTIVE_LINE_CLASS);
    previousIndexRef.current = -1;
    return;
  }

  lineElements.forEach((line) => line?.classList.remove(ACTIVE_LINE_CLASS));
};

const setActiveLineIndicator = (lineElements, lineIndex, previousIndexRef) => {
  if (!Array.isArray(lineElements) || !lineElements.length) return;
  const safeIndex = Math.min(Math.max(0, lineIndex), lineElements.length - 1);

  if (
    previousIndexRef
    && typeof previousIndexRef.current === 'number'
    && previousIndexRef.current >= 0
    && previousIndexRef.current < lineElements.length
    && previousIndexRef.current !== safeIndex
  ) {
    lineElements[previousIndexRef.current]?.classList.remove(ACTIVE_LINE_CLASS);
  }

  lineElements[safeIndex]?.classList.add(ACTIVE_LINE_CLASS);

  if (previousIndexRef) {
    previousIndexRef.current = safeIndex;
  }
};

/**
 * AutoScrollBar - Kontrol auto scroll dengan beat indicator
 * 
 * Props:
 * - tempo: number (BPM default, default 80)
 * - active: boolean
 * - speed: number
 * - onToggle: function
 * - onSpeedChange: function
 * - lyricsDisplayRef: ref
 * - currentBeat: number
 * - setCurrentBeat: function
 */
export default function AutoScrollBar({
  tempo = 120,
  timeSignature = '4/4',
  active = false,
  speed = 120,
  onToggle,
  onSpeedChange,
  lyricsDisplayRef,
  currentBeat,
  setCurrentBeat,
  hideUi = false,
  forceSnapMode = false,
}) {
  const normalizeSpeed = (value) => Math.max(40, Math.min(240, Number(value) || 40));
  const [scrolling, setScrolling] = useState(active);
  const [scrollMode, setScrollMode] = useState('snap');
  const [currentSpeed, setCurrentSpeed] = useState(speed || tempo);
  const [beat, setBeat] = useState(currentBeat || 0);
  const [showMenu, setShowMenu] = useState(false);
  const frameRef = useRef(null);
  const beatTimeRef = useRef(null);
  const beatsInCurrentLineRef = useRef(0);
  const linePlanRef = useRef({ lineElements: [], lineBeats: [], currentLineIndex: 0 });
  const previousHighlightedLineIndexRef = useRef(-1);
  const beatRef = useRef(currentBeat || 0);
  const beatsPerBar = parseBeatsPerBar(timeSignature);
  const defaultTempo = normalizeSpeed(tempo || 120);
  const isDefaultTempo = currentSpeed === defaultTempo;

  useEffect(() => {
    setCurrentSpeed(speed || tempo);
  }, [speed, tempo]);

  useEffect(() => {
    setScrolling(active);
  }, [active]);

  useEffect(() => {
    if (forceSnapMode) {
      setScrollMode('snap');
      setShowMenu(false);
    }
  }, [forceSnapMode]);

  useEffect(() => {
    if (typeof currentBeat === 'number') {
      setBeat(currentBeat);
      beatRef.current = currentBeat;
    }
  }, [currentBeat]);

  const handleToggle = () => {
    if (typeof onToggle === 'function') {
      onToggle();
    } else {
      setScrolling((s) => !s);
    }
  };

  const handleSpeedChange = (nextSpeed) => {
    const normalized = normalizeSpeed(nextSpeed);
    setCurrentSpeed(normalized);
    if (typeof onSpeedChange === 'function') {
      onSpeedChange(normalized);
    }
  };

  const handleResetTempo = () => {
    handleSpeedChange(defaultTempo);
  };

  const jumpToLineIndex = (lineIndex, { forcePlan } = {}) => {
    const host = lyricsDisplayRef?.current;
    const container = getScrollContainer(lyricsDisplayRef);
    const currentPlan = forcePlan || buildLineBeatPlan(lyricsDisplayRef, beatsPerBar);
    if (!currentPlan.lineElements.length) return;

    const safeIndex = Math.min(Math.max(0, lineIndex), currentPlan.lineElements.length - 1);
    const targetLine = currentPlan.lineElements[safeIndex];

    linePlanRef.current = {
      ...currentPlan,
      currentLineIndex: safeIndex,
    };

    beatsInCurrentLineRef.current = 0;
    beatRef.current = 0;
    setBeat(0);
    if (typeof setCurrentBeat === 'function') {
      setCurrentBeat(0);
    }

    setActiveLineIndicator(currentPlan.lineElements, safeIndex, previousHighlightedLineIndexRef);

    if (targetLine && container) {
      const stickyOverlayOffset = getStickyTempoOverlayHeight(host);
      const previewOffset = getLinePreviewOffset(targetLine, 2);
      const topPadding = 8;
      const targetTop = getElementTopInContainer(targetLine, container)
        - stickyOverlayOffset
        - previewOffset
        - topPadding;
      scrollContainerTo(container, targetTop, 'auto');
    }
  };

  useEffect(() => {
    const host = lyricsDisplayRef?.current;
    if (!host) return;

    const handleLineClick = (event) => {
      const clickedLine = event.target?.closest?.('.cd .cd-chord');
      if (!clickedLine || !host.contains(clickedLine)) return;

      const plan = buildLineBeatPlan(lyricsDisplayRef, beatsPerBar);
      const clickedIndex = plan.lineElements.indexOf(clickedLine);
      if (clickedIndex < 0) return;

      jumpToLineIndex(clickedIndex, { forcePlan: plan });
    };

    host.addEventListener('click', handleLineClick);
    return () => {
      host.removeEventListener('click', handleLineClick);
    };
  }, [lyricsDisplayRef, beatsPerBar, setCurrentBeat]);

  useEffect(() => {
    if (scrolling) {
      beatTimeRef.current = performance.now();
      beatsInCurrentLineRef.current = 0;

      const container = getScrollContainer(lyricsDisplayRef);
      const linePlan = buildLineBeatPlan(lyricsDisplayRef, beatsPerBar);
      const currentLineIndex = resolveCurrentLineIndex(linePlan.lineElements, container);
      jumpToLineIndex(currentLineIndex, { forcePlan: linePlan });

      const scrollStep = () => {
        const now = performance.now();

        if (now - beatTimeRef.current > 60000 / currentSpeed) {
          const nextBeat = (beatRef.current + 1) % beatsPerBar;
          setBeat(nextBeat);
          beatRef.current = nextBeat;
          beatTimeRef.current = now;
          beatsInCurrentLineRef.current += 1;

          if (typeof setCurrentBeat === 'function') {
            setCurrentBeat(nextBeat);
          }

          const currentPlan = linePlanRef.current;
          const currentLineBeats = currentPlan.lineBeats[currentPlan.currentLineIndex] || beatsPerBar;

          if (container && scrollMode === 'smooth') {
            const fullLineScrollAmount = computeLineScrollAmount(
              currentPlan.lineElements,
              currentPlan.currentLineIndex,
              container
            );
            const scrollPerBeat = fullLineScrollAmount / Math.max(1, currentLineBeats);
            container.scrollBy({ top: scrollPerBeat, behavior: 'auto' });
          }

          if (beatsInCurrentLineRef.current >= currentLineBeats) {
            if (container && scrollMode !== 'smooth') {
              const scrollAmount = computeLineScrollAmount(
                currentPlan.lineElements,
                currentPlan.currentLineIndex,
                container
              );
              container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
            beatsInCurrentLineRef.current = 0;
            linePlanRef.current = {
              ...currentPlan,
              currentLineIndex: Math.min(
                currentPlan.currentLineIndex + 1,
                Math.max(0, currentPlan.lineBeats.length - 1)
              ),
            };
            setActiveLineIndicator(
              currentPlan.lineElements,
              linePlanRef.current.currentLineIndex,
              previousHighlightedLineIndexRef
            );
          }
        }

        frameRef.current = requestAnimationFrame(scrollStep);
      };

      frameRef.current = requestAnimationFrame(scrollStep);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearActiveLineIndicator(linePlanRef.current.lineElements, previousHighlightedLineIndexRef);
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearActiveLineIndicator(linePlanRef.current.lineElements, previousHighlightedLineIndexRef);
    };
  }, [scrolling, currentSpeed, lyricsDisplayRef, setCurrentBeat, beatsPerBar, scrollMode]);

  return (
    <div className={`auto-scroll-bar ${hideUi ? 'auto-scroll-bar-hidden' : ''}`}>
      {!hideUi && (
      <div className="auto-scroll-controls">
        {/* Play/Pause Toggle */}
        <button
          className={`auto-scroll-toggle ${scrolling ? 'active' : ''}`}
          onClick={handleToggle}
          title={scrolling ? 'Berhenti autoscroll' : 'Mulai autoscroll'}
          type="button"
        >
          {scrolling ? '⏸️' : '▶️'}
        </button>

        {/* Compact Tempo Control */}
        <div className="auto-scroll-tempo-compact">
          <input
            type="range"
            min={40}
            max={240}
            value={currentSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="auto-scroll-tempo-slider"
            title="Sesuaikan kecepatan (BPM)"
          />
          <input
            type="number"
            min={40}
            max={240}
            value={currentSpeed}
            onChange={(e) => handleSpeedChange(e.target.value)}
            className="auto-scroll-tempo-input-mini"
            title="BPM"
          />
        </div>

        {/* Menu Toggle (Mode & Reset) */}
        <div className="auto-scroll-menu-container">
          <button
            className="auto-scroll-menu-toggle"
            onClick={() => setShowMenu(!showMenu)}
            title="Opsi lanjut"
            type="button"
          >
            ⋮
          </button>

          {showMenu && (
            <div className="auto-scroll-menu-dropdown">
              <button
                className={`auto-scroll-menu-item ${scrollMode === 'smooth' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setScrollMode((mode) => (mode === 'snap' ? 'smooth' : 'snap'));
                }}
                title={scrollMode === 'snap' ? 'Smooth: scroll gradual' : 'Snap: scroll per baris'}
              >
                {scrollMode === 'snap' ? '◉ Snap' : '◉ Smooth'}
              </button>

              <button
                className="auto-scroll-menu-item auto-scroll-reset-mini"
                type="button"
                onClick={handleResetTempo}
                disabled={isDefaultTempo}
                title="Kembalikan ke tempo default"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Beat Indicator - Minimized */}
      {!hideUi && scrolling && (
        <div className="auto-scroll-beats-minimal">
          <div className="auto-scroll-beat-dots">
            {Array.from({ length: beatsPerBar }, (_, i) => i).map((i) => (
              <span
                key={i}
                className={`beat-dot ${beat === i ? 'active' : ''}`}
                aria-label={`Beat ${i + 1}`}
              >
                ●
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
