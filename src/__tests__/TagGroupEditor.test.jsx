import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import TagGroupEditor from '../pages/admin/tag-detection/TagGroupEditor.jsx';
import { parseKeywordList, getTagGroup } from '../config/chordDisplayTagGroups.js';
import { addKeywordToDraft, removeKeywordFromDraft } from '../pages/admin/tag-detection/tagAudit.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Editor grup tag dengan state draft sungguhan, meniru perilaku hook
 * useChordDisplayTags: tambah/hapus keyword mengubah DRAFT, bukan daftar aktif.
 */
function Harness({ group, initial }) {
  const [draft, setDraft] = useState(initial);
  return (
    <TagGroupEditor
      group={group}
      draft={draft}
      errors={undefined}
      activeKeywords={parseKeywordList(initial).map((row) => row.value)}
      isOverridden={false}
      fallbackCount={3}
      diff={undefined}
      conflicts={[]}
      onChange={setDraft}
      onAddKeyword={(keyword) => {
        const result = addKeywordToDraft(draft, keyword, parseKeywordList);
        if (!result.ok) return result;
        setDraft(result.draft);
        return { ok: true };
      }}
      onRemoveKeyword={(keyword) => setDraft(removeKeywordFromDraft(draft, keyword, parseKeywordList))}
      onSave={() => {}}
      onReset={() => {}}
    />
  );
}

const typeInto = (input, value) => {
  // React membaca nilai dari event; setter native + input event adalah cara
  // mengisi input terkontrol di luar testing-library.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};

const chips = (container) => [...container.querySelectorAll('.admin-tag-chip')]
  .filter((node) => !node.classList.contains('is-more'))
  .map((node) => node.firstChild.textContent.trim());

describe('TagGroupEditor: chip mengikuti draft', () => {
  const group = getTagGroup('sections') || { id: 'sections', label: 'Struktur Lagu', icon: '🎬', description: '' };
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('chip menampilkan isi draft, bukan daftar aktif', async () => {
    await act(async () => {
      root.render(<Harness group={group} initial={'intro\nverse'} />);
    });

    expect(chips(container)).toEqual(['intro', 'verse']);

    await act(async () => {
      typeInto(container.querySelector('input[type="text"]'), 'bridge');
      container.querySelector('form').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
      );
    });

    // Keyword baru langsung terlihat sebagai chip, sebelum disimpan.
    expect(chips(container)).toEqual(['intro', 'verse', 'bridge']);
    expect(container.querySelector('textarea').value).toBe('intro\nverse\nbridge');
  });

  test('tombol × menghapus satu keyword tanpa menyentuh yang lain', async () => {
    await act(async () => {
      root.render(<Harness group={group} initial={'intro\nverse\nchorus'} />);
    });

    const removeVerse = container.querySelector('button[aria-label="Hapus kata kunci verse"]');
    expect(removeVerse).toBeTruthy();

    await act(async () => {
      removeVerse.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });

    expect(chips(container)).toEqual(['intro', 'chorus']);
    expect(container.querySelector('textarea').value).toBe('intro\nchorus');
  });

  test('input tambah menampilkan alasan saat keyword tidak valid atau duplikat', async () => {
    await act(async () => {
      root.render(<Harness group={group} initial={'intro'} />);
    });

    const input = container.querySelector('input[type="text"]');

    await act(async () => {
      typeInto(input, 'intro');
    });
    await act(async () => {
      container.querySelector('form').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    expect(container.querySelector('.admin-tag-add-error')?.textContent)
      .toBe('Kata kunci sudah ada di daftar');
    expect(chips(container)).toEqual(['intro']);
  });
});
