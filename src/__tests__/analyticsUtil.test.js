import { describe, test, expect, beforeEach } from '@jest/globals';
import { trackEvent, trackSongAction, trackSetlistAction, trackError } from '../utils/analyticsUtil.js';

describe('analyticsUtil', () => {
  beforeEach(() => {
    // Mock gtag
    window.dataLayer = [];
    window.gtag = jest.fn();
  });

  test('trackEvent calls gtag with correct parameters', () => {
    trackEvent('test_event', { test_param: 'value' });

    expect(window.gtag).toHaveBeenCalledWith('event', 'test_event', {
      test_param: 'value'
    });
  });

  test('trackSongAction includes song_title', () => {
    trackSongAction('view', 'Test Song');

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'song_action',
      expect.objectContaining({
        action: 'view',
        song_title: 'Test Song'
      })
    );
  });

  test('trackSetlistAction includes setlist_name', () => {
    trackSetlistAction('create', 'My Setlist');

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'setlist_action',
      expect.objectContaining({
        action: 'create',
        setlist_name: 'My Setlist'
      })
    );
  });

  test('trackError includes error details', () => {
    trackError('Test error message', 'network');

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'app_error',
      expect.objectContaining({
        error_message: 'Test error message',
        error_type: 'network'
      })
    );
  });

  test('trackEvent handles missing gtag gracefully', () => {
    window.gtag = undefined;
    
    expect(() => {
      trackEvent('test_event', {});
    }).not.toThrow();
  });
});
