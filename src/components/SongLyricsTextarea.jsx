import React, { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap, openSearchPanel } from "@codemirror/search";
import { lyricsHighlighting, lyricsEditorTheme } from "../utils/lyricsHighlightExtension.js";

const PLACEHOLDER =
  "Masukkan lirik dan chord...\nContoh:\n[C]Amazing grace how [F]sweet the [C]sound";

const THEME_STORAGE_KEY = "ruangperformer_theme";

const readThemeMode = () => {
  if (typeof document === "undefined") return "light";
  if (document.body.classList.contains("dark-mode")) return "dark";
  if (document.body.classList.contains("light-mode")) return "light";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

/**
 * SongLyricsTextarea
 * CodeMirror-backed lyrics/chord editor. Keeps the legacy `.song-lyrics-textarea`
 * class and exposes the underlying editable element as `lyricsDisplayRef.current`
 * so the toolbar helpers (selection transforms, section/patch insertion, piano
 * insert) keep working unchanged.
 *
 * CodeMirror owns undo/redo and selection, so Ctrl+Z / Ctrl+Shift+Z work natively
 * instead of fighting React controlled state.
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
  const themeMode = readThemeMode();

  const extensions = useMemo(
    () => [
      history(),
      search({ top: true }),
      // Enter keeps the default newline behaviour; no custom Enter binding here.
      // searchKeymap provides Ctrl+F / Ctrl+H / F3 navigation.
      Prec.high(keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab])),
      lyricsHighlighting,
      lyricsEditorTheme,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        "aria-label": "Editor lirik dan chord",
      }),
    ],
    []
  );

  // Expose a textarea-compatible facade over the CodeMirror view. The existing
  // toolbar helpers (align/wrap bars, section & GM-patch insert, piano insert)
  // were written against a real <textarea>, so they need selectionStart /
  // selectionEnd / setSelectionRange / focus / value to keep working unchanged.
  useEffect(() => {
    const view = cmRef.current?.view;
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
    };

    lyricsDisplayRef.current = facade;
  }, [lyricsDisplayRef, editedLyrics]);

  const publishSelection = (view) => {
    if (typeof onSelectionChange !== "function" || !view) return;
    const { from, to } = view.state.selection.main;
    onSelectionChange({ start: from, end: to });
  };

  const handleUpdate = (viewUpdate) => {
    if (viewUpdate.selectionSet || viewUpdate.docChanged) {
      publishSelection(viewUpdate.view);
    }
  };

  return (
    <div className="song-lyrics-textarea-editor" data-theme={themeMode}>
      <CodeMirror
        ref={cmRef}
        value={editedLyrics ?? ""}
        onChange={(value) => setEditedLyrics?.(value)}
        onUpdate={handleUpdate}
        onCreateEditor={(view, state) => {
          viewRef.current = view;
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
        height="500px"
        editable={!disabled}
      />
    </div>
  );
}
