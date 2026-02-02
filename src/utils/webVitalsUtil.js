/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals and other performance metrics
 */

import { trackPerformanceMetric } from './analyticsUtil.js';

/**
 * Initialize Web Vitals monitoring
 */
export function initializeWebVitals() {
  // Largest Contentful Paint (LCP)
  observeLCP();
  
  // First Input Delay (FID) / Interaction to Next Paint (INP)
  observeINP();
  
  // Cumulative Layout Shift (CLS)
  observeCLS();
  
  // First Paint (FP) and First Contentful Paint (FCP)
  observePaint();
}

/**
 * Observe Largest Contentful Paint (LCP)
 * Measures when the largest content element becomes visible
 */
function observeLCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      const lcpValue = lastEntry.renderTime || lastEntry.loadTime;
      console.log('LCP (Largest Contentful Paint):', lcpValue);
      trackPerformanceMetric('LCP', Math.round(lcpValue));
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (err) {
    console.warn('LCP observation not supported:', err);
  }
}

/**
 * Observe Interaction to Next Paint (INP) / First Input Delay (FID)
 * Measures responsiveness to user interactions
 */
function observeINP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        const delay = entry.processingStart - entry.startTime;
        const duration = entry.duration;
        const totalTime = delay + duration;
        
        console.log('INP (Interaction to Next Paint):', totalTime);
        trackPerformanceMetric('INP', Math.round(totalTime));
      });
    });
    
    observer.observe({ entryTypes: ['first-input', 'event'] });
  } catch (err) {
    console.warn('INP observation not supported:', err);
  }
}

/**
 * Observe Cumulative Layout Shift (CLS)
 * Measures visual stability
 */
function observeCLS() {
  let clsValue = 0;
  
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log('CLS (Cumulative Layout Shift):', clsValue);
          trackPerformanceMetric('CLS', parseFloat(clsValue.toFixed(3)));
        }
      });
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (err) {
    console.warn('CLS observation not supported:', err);
  }
}

/**
 * Observe First Paint (FP) and First Contentful Paint (FCP)
 */
function observePaint() {
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-paint') {
          console.log('FP (First Paint):', entry.startTime);
          trackPerformanceMetric('FP', Math.round(entry.startTime));
        } else if (entry.name === 'first-contentful-paint') {
          console.log('FCP (First Contentful Paint):', entry.startTime);
          trackPerformanceMetric('FCP', Math.round(entry.startTime));
        }
      });
    });
    
    observer.observe({ entryTypes: ['paint'] });
  } catch (err) {
    console.warn('Paint observation not supported:', err);
  }
}

/**
 * Get Navigation Timing metrics
 */
export function getNavigationMetrics() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }
  
  const perf = window.performance.timing;
  const pageLoadTime = perf.loadEventEnd - perf.navigationStart;
  const connectTime = perf.responseEnd - perf.requestStart;
  const renderTime = perf.domComplete - perf.domLoading;
  
  return {
    pageLoadTime,
    connectTime,
    renderTime,
    dns: perf.domainLookupEnd - perf.domainLookupStart,
    tcp: perf.connectEnd - perf.connectStart,
    ttfb: perf.responseStart - perf.navigationStart
  };
}

/**
 * Report metrics to analytics
 */
export function reportNavigationMetrics() {
  const metrics = getNavigationMetrics();
  if (metrics) {
    trackPerformanceMetric('pageLoadTime', metrics.pageLoadTime);
    trackPerformanceMetric('connectTime', metrics.connectTime);
    trackPerformanceMetric('renderTime', metrics.renderTime);
  }
}
