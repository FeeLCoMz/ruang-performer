import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AIAutofillModal from '../modules/ai-autofill/AIAutofillModal.jsx';

describe('AIAutofillModal', () => {
  it('does not render the lyrics recommendation option', () => {
    const markup = renderToStaticMarkup(
      <AIAutofillModal
        aiResult={{ artist: 'Artist', lyrics: 'Some lyric preview' }}
        aiConfirmFields={{}}
        setAiConfirmFields={() => {}}
        onApply={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).not.toContain('Lirik');
  });

  it('does not render chord reference links', () => {
    const markup = renderToStaticMarkup(
      <AIAutofillModal
        aiResult={{
          artist: 'Artist',
          chordLinks: [
            { title: 'Chordify', site: 'chordify.net', url: 'https://chordify.net' },
            { title: 'Google Search', site: 'google.com', url: 'https://google.com' },
          ],
        }}
        aiConfirmFields={{}}
        setAiConfirmFields={() => {}}
        onApply={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).not.toContain('Referensi chord');
    expect(markup).not.toContain('Chordify');
    expect(markup).not.toContain('Google Search');
  });

  it('shows a cleaned up section title for selectable fields', () => {
    const markup = renderToStaticMarkup(
      <AIAutofillModal
        aiResult={{ artist: 'Artist', key: 'G' }}
        aiConfirmFields={{}}
        setAiConfirmFields={() => {}}
        onApply={() => {}}
        onClose={() => {}}
      />,
    );

    expect(markup).toContain('Data yang bisa diisi');
  });
});
