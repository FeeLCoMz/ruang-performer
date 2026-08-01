import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AIAutofillModal from '../components/AIAutofillModal.jsx';

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

  it('renders chordify links alongside google search links', () => {
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

    expect(markup).toContain('Chordify');
    expect(markup).toContain('Google Search');
  });
});
