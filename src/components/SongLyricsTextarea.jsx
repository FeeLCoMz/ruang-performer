import React, { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { history, historyKeymap, defaultKeymap, indentWithTab, undo, redo } from "@codemirror/commands";
import { search, searchKeymap, openSearchPanel } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { lyricsHighlighting, lyricsEditorTheme } from "../utils/lyricsHighlightExtension.js";
import { lyricsCompletionSource } from "../utils/lyricsCompletion.js";
const PLACEHOLDER =
  "Masukkan lirik dan chord...\nContoh:\n[C]Amazing grace how [F]sweet the [C]sound";

// Aplikasi selalu memakai mode gelap.
const THEME_MODE = "dark";

/**
 * SongLyricsTextarea
 * CodeMirror-backed lyrics/chord editor. Keeps the legacy `.song-lyrics-textarea`
 * class and exposes the underlying editable element as `lyricsDisplayRef.current`
 * so the toolbar helpers (selection transforms, section/patch insertion, piano
 * insert) keep working unchanged.
 *
 * CodeMirror owns undo/redo and selection, so Ctrl+Z / Ctrl+Shift+Z work natively
 * instead of fighting React controlled state.
 *
 * The editor is deliberately UNCONTROLLED after mount (see `value` handling
 * below). That is load-bearing, not an oversight.
 */
export default function SongLyricsTextarea({
  lyricsDisplayRef,
  editedLyrics,
  setEditedLyrics,
  autoFocus = true,
  onSelectionChange,
  disabled = false,
}) {
  const viewRef = useRef(null);
  const cmRef = useRef(null);

  /**
   * The text this editor itself last reported upward.
   *
   * `value` has to be passed (the library defaults it to '' and would otherwise
   * wipe the doc), but it must never be treated as a live document: the parent
   * echoes every keystroke straight back, and re-seeking the caret on that echo
   * is what snapped the cursor to the start of the document on every keystroke.
   * While the incoming value is just an echo of our own edit, ignore it; only an
   * EXTERNAL change (loading a song, piano insert, transpose, format) differs
   * from it and should be applied.
   */
  const lastEmittedRef = useRef(editedLyrics ?? '');

  // Latest props in refs, so the extensions below can be built ONCE. Rebuilding
  // them per render made @uiw/react-codemirror dispatch a StateEffect.reconfigure
  // on every keystroke, which is what made typing feel heavy.
  const onChangeRef = useRef(setEditedLyrics);
  onChangeRef.current = setEditedLyrics;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  /**
   * Report the caret/selection to the parent so the preview can follow along.
   * Reads the latest callback from a ref, so the extension list never has to be
   * rebuilt when the parent passes a new function identity.
   */
  const publishSelection = (view) => {
    const handler = onSelectionChangeRef.current;
    if (typeof handler !== "function" || !view) return;
    const { from, to } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    handler({
      start: from,
      end: to,
      // 1-based line the caret is on, so consumers can sync without
      // recomputing it from character offsets.
      lineNumber: line.number,
    });
  };

  const extensions = useMemo(
    () => [
      history(),
      search({ top: true }),
      // Inline syntax help: offers [Section] tags, Patch:/Modulation: metadata
      // and MIDI cue templates as the user types, replacing the help modal.
      autocompletion({
        override: [lyricsCompletionSource],
        activateOnTyping: true,
        closeOnBlur: true,
      }),
      // Enter keeps the default newline behaviour; no custom Enter binding here.
      // searchKeymap provides Ctrl+F / Ctrl+H / F3 navigation.
      Prec.high(
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          indentWithTab,
        ])
      ),
      lyricsHighlighting,
      lyricsEditorTheme,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        "aria-label": "Editor lirik dan chord",
      }),
      // Selection publishing lives in an extension rather than the `onUpdate`
      // prop so it does not force the extension list to be rebuilt per render.
      EditorView.updateListener.of((viewUpdate) => {
        if (viewUpdate.selectionSet || viewUpdate.docChanged || viewUpdate.viewportChanged) {
          publishSelection(viewUpdate.view);
        }
      }),
    ],
    // Intentionally empty: these extensions are built once for the editor's
    // lifetime. `disabled` is applied through the `editable` prop and the change
    // handler reads the latest callback from a ref, so nothing here needs
    // rebuilding — see the reconfigure note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Expose a textarea-compatible facade over the CodeMirror view. The existing
  // toolbar helpers (align/wrap bars, section & GM-patch insert, piano insert)
  // were written against a real <textarea>, so they need selectionStart /
  // selectionEnd / setSelectionRange / focus / value to keep working unchanged.
  const attachFacade = (view) => {
    if (!view || !lyricsDisplayRef) return;

    const facade = {
      __codemirror: view,
      get value() {
        return view.state.doc.toString();
      },
      get selectionStart() {
        return view.state.selection.main.from;
      },
      set selectionStart(pos) {
        const safe = Math.max(0, Math.min(Number(pos) || 0, view.state.doc.length));
        const anchor = Math.min(view.state.selection.main.anchor, safe);
        view.dispatch({ selection: { anchor, head: safe } });
      },
      get selectionEnd() {
        return view.state.selection.main.to;
      },
      set selectionEnd(pos) {
        const safe = Math.max(0, Math.min(Number(pos) || 0, view.state.doc.length));
        const anchor = view.state.selection.main.anchor;
        view.dispatch({ selection: { anchor, head: safe } });
      },
      setSelectionRange(start, end = start) {
        const max = view.state.doc.length;
        const from = Math.max(0, Math.min(Number(start) || 0, max));
        const to = Math.max(0, Math.min(Number(end) || 0, max));
        view.dispatch({ selection: { anchor: from, head: to } });
      },
      focus() {
        view.focus();
      },
      blur() {
        view.contentDOM?.blur?.();
      },
      /** Open CodeMirror's built-in find/replace panel. */
      openSearchPanel() {
        openSearchPanel(view);
      },
      /** Step back one edit. Returns false when there is nothing to undo. */
      undo() {
        return undo({ state: view.state, dispatch: view.dispatch });
      },
      /** Step forward one edit. Returns false when there is nothing to redo. */
      redo() {
        return redo({ state: view.state, dispatch: view.dispatch });
      },
      /**
       * 1-based line number the caret sits on, plus the visible line range.
       * Used to keep the preview scrolled to whatever is being edited.
       */
      getCursorLineInfo() {
        const { state } = view;
        const head = state.selection.main.head;
        const line = state.doc.lineAt(head);
        const viewport = view.viewport || { from: 0, to: state.doc.length };
        const topLine = state.doc.lineAt(viewport.from).number;
        const bottomLine = state.doc.lineAt(Math.min(viewport.to, state.doc.length)).number;
        return {
          lineNumber: line.number,
          lineFrom: line.from,
          lineTo: line.to,
          firstVisibleLine: topLine,
          lastVisibleLine: bottomLine,
          totalLines: state.doc.lines,
        };
      },
    };

    lyricsDisplayRef.current = facade;
  };

  return (
    <div className="song-lyrics-textarea-editor" data-theme={THEME_MODE}>
      <CodeMirror
        ref={cmRef}
        // Guarded controlled value: see `lastEmittedRef` above. This keeps the
        // doc in sync with external edits without letting the parent's echo of
        // our own typing move the caret.
        value={editedLyrics !== lastEmittedRef.current ? editedLyrics ?? '' : lastEmittedRef.current}
        onChange={(value) => {
          lastEmittedRef.current = value;
          onChangeRef.current?.(value);
        }}
        onCreateEditor={(view, state) => {
          viewRef.current = view;
          // Attach deterministically here rather than in a passive effect: the
          // underlying view only exists after the library's own layout effect,
          // so an effect keyed on nothing could run before it and leave the
          // facade unset.
          attachFacade(view);
          publishSelection(view);
          void state;
          if (autoFocus) {
            view.focus();
          }
        }}
        extensions={extensions}
        basicSetup={false}
        autoFocus={false}
        theme="none"
        placeholder={PLACEHOLDER}
        className="song-lyrics-textarea song-lyrics-codemirror"
        // No `height` prop: the responsive CSS owns the editor height, so the
        // mobile breakpoints can shrink it. A hardcoded 500px here overrode them.
        editable={!disabled}
      />
    </div>
  );
}
