/**
 * Analytics Utility
 * Track user behavior, events, and custom metrics
 */

// Google Analytics tracking ID (set via environment variable)
const GA_ID = 'G-XXXXXXXXXX'; // Replace with your GA measurement ID

export function initializeAnalytics() {
  // Load Google Analytics script
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, {
      'anonymize_ip': true,
      'allow_google_signals': false
    });
  }
}

/**
 * Track custom events
 * @param {string} eventName - Event name
 * @param {object} eventData - Event data object
 */
export function trackEvent(eventName, eventData = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
  }
}

/**
 * Track page view
 * @param {string} pagePath - Page path
 * @param {string} pageTitle - Page title
 */
export function trackPageView(pagePath, pageTitle) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
}

/**
 * Track song actions
 */
export function trackSongAction(action, songTitle) {
  trackEvent('song_action', {
    action: action, // 'view', 'add', 'edit', 'delete', 'transpose'
    song_title: songTitle
  });
}

/**
 * Track setlist actions
 */
export function trackSetlistAction(action, setlistName) {
  trackEvent('setlist_action', {
    action: action, // 'view', 'create', 'edit', 'delete'
    setlist_name: setlistName
  });
}

/**
 * Track band actions
 */
export function trackBandAction(action, bandName) {
  trackEvent('band_action', {
    action: action, // 'view', 'create', 'edit', 'delete'
    band_name: bandName
  });
}

/**
 * Track authentication events
 */
export function trackAuthEvent(eventType, success = true) {
  trackEvent('auth_event', {
    event_type: eventType, // 'login', 'logout', 'signup', 'password_reset'
    success: success
  });
}

/**
 * Track errors
 */
export function trackError(errorMessage, errorType = 'unknown') {
  trackEvent('app_error', {
    error_message: errorMessage,
    error_type: errorType
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(featureName) {
  trackEvent('feature_usage', {
    feature_name: featureName
  });
}

/**
 * Track performance metrics
 */
export function trackPerformanceMetric(metricName, value) {
  trackEvent('performance_metric', {
    metric_name: metricName,
    value: value
  });
}
