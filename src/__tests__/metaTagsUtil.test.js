import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';

describe('metaTagsUtil', () => {
  beforeEach(() => {
    // Clear meta tags before each test
    document.querySelectorAll('meta').forEach(tag => {
      if (tag.getAttribute('name') || tag.getAttribute('property')) {
        tag.remove();
      }
    });
  });

  test('updatePageMeta creates or updates meta tags', () => {
    updatePageMeta({
      title: 'Test Page',
      description: 'Test Description',
      type: 'article'
    });

    expect(document.title).toContain('Test Page');
    
    const descriptionTag = document.querySelector('meta[name="description"]');
    expect(descriptionTag).not.toBeNull();
    expect(descriptionTag.getAttribute('content')).toBe('Test Description');
  });

  test('updatePageMeta updates OG tags', () => {
    updatePageMeta({
      title: 'OG Test',
      description: 'OG Description',
      type: 'website'
    });

    const ogTypeTag = document.querySelector('meta[property="og:type"]');
    expect(ogTypeTag?.getAttribute('content')).toBe('website');

    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    expect(ogTitleTag?.getAttribute('content')).toBe('OG Test');
  });

  test('pageMetadata has required keys', () => {
    expect(pageMetadata).toHaveProperty('home');
    expect(pageMetadata).toHaveProperty('songs');
    expect(pageMetadata).toHaveProperty('setlists');
    expect(pageMetadata).toHaveProperty('bands');
    expect(pageMetadata).toHaveProperty('practice');
    expect(pageMetadata).toHaveProperty('gigs');
  });

  test('pageMetadata items have title and description', () => {
    Object.values(pageMetadata).forEach(metadata => {
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('description');
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
    });
  });
});
