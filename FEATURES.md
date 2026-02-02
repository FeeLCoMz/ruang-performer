# PerformerHub - Advanced Features Documentation

## 🎯 Latest Features Added (v2.0.10)

### 1. Google Analytics & Event Tracking

**File:** `src/utils/analyticsUtil.js`

Analytics utility untuk track user behavior dan custom events.

**Available Functions:**
- `initializeAnalytics()` - Initialize GA script
- `trackEvent(eventName, eventData)` - Track custom events
- `trackPageView(pagePath, pageTitle)` - Track page views
- `trackSongAction(action, songTitle)` - Track song interactions
- `trackSetlistAction(action, setlistName)` - Track setlist interactions
- `trackBandAction(action, bandName)` - Track band interactions
- `trackAuthEvent(eventType, success)` - Track auth events
- `trackError(errorMessage, errorType)` - Track application errors
- `trackFeatureUsage(featureName)` - Track feature usage

**Setup:**
1. Get GA measurement ID from Google Analytics
2. Replace `G-XXXXXXXXXX` in `analyticsUtil.js` with your measurement ID
3. Events auto-tracked in your GA dashboard

**Example Usage:**
```javascript
import { trackSongAction } from '../utils/analyticsUtil.js';

// Track when user views a song
trackSongAction('view', 'Hallelujah');

// Track when user adds new song
trackSongAction('add', 'My Original Song');
```

---

### 2. Web Vitals Monitoring

**File:** `src/utils/webVitalsUtil.js`

Automatic monitoring of Core Web Vitals and performance metrics.

**Metrics Tracked:**
- **LCP (Largest Contentful Paint)** - Page load performance (target: < 2.5s)
- **INP (Interaction to Next Paint)** - Responsiveness (target: < 200ms)
- **CLS (Cumulative Layout Shift)** - Visual stability (target: < 0.1)
- **FCP (First Contentful Paint)** - Content visibility
- **FP (First Paint)** - Initial rendering
- **TTFB (Time to First Byte)** - Server response time

**Automatic Integration:**
- Already initialized in `src/main.jsx`
- Metrics automatically sent to Google Analytics
- Performance data visible in GA dashboard

**Manual Access:**
```javascript
import { getNavigationMetrics, reportNavigationMetrics } from '../utils/webVitalsUtil.js';

const metrics = getNavigationMetrics();
console.log('Page Load Time:', metrics.pageLoadTime);
```

---

### 3. Enhanced Service Worker (Offline Support)

**File:** `public/sw.js`

Advanced caching strategy with different approaches for different resource types.

**Caching Strategies:**

| Resource Type | Strategy | Cache Name | Purpose |
|---|---|---|---|
| Static assets (CSS, JS, fonts) | Cache-first | `performerhub-static-v1` | Quick load, rarely change |
| HTML pages | Network-first | `performerhub-v1` | Always get fresh content |
| API calls | Network-first | `performerhub-api-v1` | Real-time data |
| External resources | Network-only | N/A | Don't cache (YouTube, etc) |

**Features:**
- Automatic cache cleanup on activation
- Intelligent fallback handling
- Support for cache clearing via message
- Offline error responses

**Browser Console:**
```javascript
// Clear all caches manually
navigator.serviceWorker.controller.postMessage({ 
  type: 'CLEAR_CACHE' 
});
```

---

### 4. Performance-Optimized HTML

**File:** `index.html`

Optimizations for faster page load:

- **Preconnect:** To Google Fonts server
- **DNS Prefetch:** For external services (Google Analytics, YouTube)
- **Favicon:** SVG for scalability
- **PWA Manifest:** For mobile installation
- **Structured Data:** For search engine understanding

---

### 5. Loading Skeleton Components

**File:** `src/components/LoadingSkeleton.jsx`

Reusable skeleton components for smooth loading states.

**Available Components:**
- `SongCardSkeleton` - Skeleton for song card
- `SongListSkeleton` - Grid of skeletons
- `SongDetailSkeleton` - Detail page skeleton
- `ListItemSkeleton` - Single list item skeleton
- `ListSkeleton` - Multiple list items

**Example Usage:**
```javascript
import { SongListSkeleton } from '../components/LoadingSkeleton.jsx';

function MyComponent() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <SongListSkeleton count={6} />;
  }
  
  return <div>Content</div>;
}
```

---

### 6. Meta Tags Management

**File:** `src/utils/metaTagsUtil.js`

Dynamic meta tag management for SEO and social sharing.

**Functions:**
- `updatePageMeta(config)` - Update all meta tags
- `pageMetadata` - Pre-configured metadata for each page

**Example:**
```javascript
import { updatePageMeta, pageMetadata } from '../utils/metaTagsUtil.js';

// Update meta tags for songs page
updatePageMeta(pageMetadata.songs);

// Custom meta tags
updatePageMeta({
  title: 'My Custom Song',
  description: 'About my amazing song',
  image: '/song-image.jpg'
});
```

---

### 7. Unit Tests

**Files:**
- `src/__tests__/metaTagsUtil.test.js` - Meta tags utility tests
- `src/__tests__/analyticsUtil.test.js` - Analytics utility tests
- `src/__tests__/chordUtils.test.js` - Chord utilities tests

**Run Tests:**
```bash
npm test
```

---

## 📊 Performance Metrics

### Bundle Size Optimization
- **Code Splitting:** Lazy-loaded pages (~40-50% reduction)
- **Service Worker Caching:** Reduced server requests
- **Preload Strategy:** Critical resources loaded first

### Load Time Improvements
- **LCP Target:** < 2.5 seconds
- **FCP Target:** < 1.8 seconds
- **INP Target:** < 200ms

---

## 🔒 Privacy & Security

- **Google Analytics:** Anonymized IP tracking
- **No Google Signals:** User behavior not tracked across sites
- **Service Worker:** Secure caching, no sensitive data stored
- **Offline Mode:** Works without internet connection

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set correct Google Analytics Measurement ID
- [ ] Update environment variables in `.env`
- [ ] Test offline functionality in DevTools
- [ ] Verify Web Vitals in GA dashboard
- [ ] Check PWA manifest and icons
- [ ] Run `npm test` to verify tests pass
- [ ] Test on mobile devices and slow networks

---

## 📝 Configuration

### Google Analytics ID
Located in `src/utils/analyticsUtil.js`:
```javascript
const GA_ID = 'G-XXXXXXXXXX'; // Replace with your ID
```

### Cache Strategy
Customize in `public/sw.js`:
- Modify `CACHE_NAME` version for cache busting
- Adjust timeout intervals as needed
- Customize offline fallback responses

### Web Vitals
View metrics in:
- Browser DevTools Console
- Google Analytics Dashboard (Analytics > Web > Core Web Vitals)

---

## 🐛 Troubleshooting

**Service Worker not registering:**
- Check browser console for errors
- Verify `/sw.js` is accessible
- Clear browser cache and hard refresh

**Web Vitals not showing:**
- Check Network tab for `gtag` script loading
- Verify GA Measurement ID is correct
- Wait for Google Analytics to process data (24-48 hours)

**Offline mode not working:**
- Ensure Service Worker is registered
- Check DevTools Application > Service Workers
- Test with DevTools Offline mode enabled

---

## 📚 Additional Resources

- [Google Analytics Docs](https://developers.google.com/analytics)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Checklist](https://web.dev/pwa-checklist/)

---

**Last Updated:** February 2, 2026
**Version:** 2.0.10
