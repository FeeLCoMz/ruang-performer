# PerformerHub - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Installation
```bash
# Clone the repository
cd ronz-chord-pro

# Install dependencies
npm install

# Start development server
npm run dev
```
Dev server berjalan di: `http://localhost:5173`

---

## 📋 Essential Configuration

### .env Setup
```bash
# Copy template
cp .env.example .env

# Configure (if needed):
API_URL=http://localhost:3000
DB_PATH=./db/schema.sql
JWT_SECRET=your-secret-key
APP_NAME=PerformerHub
APP_ENV=development
```

### Google Analytics (Optional)
Edit `src/utils/analyticsUtil.js`:
```javascript
const GA_ID = 'G-YOUR_MEASUREMENT_ID'; // Get from Google Analytics
```

---

## 🎯 Key Features

| Feature | How to Use | File |
|---------|-----------|------|
| **Navigation** | Sidebar (desktop) + Hamburger (mobile) | `src/components/Sidebar.jsx` |
| **Dark Mode** | Toggle button in header | Stored in localStorage |
| **Add Song** | Click "Tambah Lagu" button | `src/pages/SongAddEditPage.jsx` |
| **Create Setlist** | Go to Setlist → "Buat Setlist" | `src/pages/SetlistPage.jsx` |
| **Transpose** | In song view, use transpose bar | `src/components/TransposeBar.jsx` |
| **Tap Tempo** | Click BPM button | `src/components/TapTempo.jsx` |
| **Offline Mode** | Auto-cached, works without internet | `public/sw.js` |

---

## 📱 Responsive Design

| Device | Breakpoint | Behavior |
|--------|-----------|----------|
| **Mobile** | < 600px | Full-width, hamburger menu |
| **Small Tablet** | 600-768px | Single column |
| **Tablet** | 768-1024px | 2-column grid |
| **Desktop** | 1024px+ | Sidebar + 3+ column grid |

---

## 🛠️ Development Tips

### Add New Page
1. Create file in `src/pages/YourPage.jsx`
2. Add route in `src/App.jsx`
3. Update `metaTagsUtil.js` if needed
4. Use `lazy()` for code splitting

### Add New Component
1. Create in `src/components/YourComponent.jsx`
2. Use `.modal-input` class for forms
3. Add to appropriate page
4. Test on mobile

### Update Styling
1. Add to `src/App.css`
2. Use CSS variables for colors
3. Test breakpoints: 1200, 1024, 768, 600px
4. Check dark mode compatibility

### Track Analytics
```javascript
import { trackSongAction } from '../utils/analyticsUtil.js';

// Track user actions
trackSongAction('view', 'Song Name');
trackSongAction('edit', 'Song Name');
trackSongAction('delete', 'Song Name');
```

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Add New Test
Create file in `src/__tests__/yourFeature.test.js`:
```javascript
describe('Your Feature', () => {
  test('should do something', () => {
    expect(true).toBe(true);
  });
});
```

---

## 🚀 Deployment

### Build for Production
```bash
npm run build      # Creates dist/ folder
npm run preview    # Test production build locally
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

---

## 🐛 Troubleshooting

### Port 5173 Already in Use
```bash
# Kill process on port 5173
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### Service Worker Issues
```javascript
// Clear all caches in browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
caches.keys().then(names => names.forEach(n => caches.delete(n)));
```

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

---

## 📚 Important Files to Know

```
src/
├── App.jsx              ← Main application component
├── App.css              ← All styling (no separate CSS files)
├── main.jsx             ← Entry point
├── pages/               ← Page components (lazy loaded)
├── components/          ← Reusable components
├── utils/               ← Utility functions
│   ├── analyticsUtil.js
│   ├── metaTagsUtil.js
│   └── webVitalsUtil.js
└── __tests__/           ← Test files

public/
├── sw.js                ← Service Worker (offline support)
├── manifest.json        ← PWA configuration
└── favicon.svg          ← App icon

index.html              ← HTML template
vite.config.js          ← Build configuration
package.json            ← Dependencies & scripts
.env.example            ← Environment template
```

---

## 📊 Performance Monitoring

### View Web Vitals
1. Open Browser DevTools Console
2. Look for performance messages
3. Check Google Analytics dashboard (24-48h delay)

### Check Service Worker
1. DevTools → Application → Service Workers
2. Should show "Activated and running"
3. Check caches in Application tab

### Check Cache Status
```javascript
// In browser console
caches.keys().then(names => console.log('Caches:', names));
```

---

## 🔗 Useful Links

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Web Vitals](https://web.dev/vitals/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Google Analytics](https://analytics.google.com)

---


## ✨ Best Practices & Examples

- ✅ Always use page-container layout
- ✅ Use CSS variables for colors
- ✅ Test on mobile (768px breakpoint)
- ✅ Use lazy loading for pages
- ✅ Track important user actions
- ✅ Test offline functionality
- ✅ Keep bundle size small
- ✅ Document new features

---

### 🚦 Permission Example
**Frontend:**
```jsx
import { usePermission } from '../hooks/usePermission';
const { can } = usePermission(bandId, userBandInfo);
if (can('edit_setlist')) {
  // Show edit button
}
```
**Backend:**
```js
if (!userHasPermission(userId, 'edit_setlist')) {
  return res.status(403).json({ error: 'You do not have permission to edit this setlist.' });
}
```

---

### 🛡️ Error Handling Example
**Frontend:**
```jsx
{error && <div className="error-text">{error}</div>}
// Use <ErrorBoundary> for global error fallback
```
**Backend:**
```js
try {
  // ...
} catch (err) {
  res.status(400).json({ error: err.message || 'Input tidak valid' });
}
```

---

### 🧪 Testing Example
**Frontend (Vitest):**
```js
import { canPerformAction } from '../utils/permissionUtils';
test('owner can edit setlist', () => {
  expect(canPerformAction('edit_setlist', 'owner')).toBe(true);
});
```
**Backend (Jest):**
```js
const { userHasPermission } = require('../utils/permissionUtils');
test('admin can delete band', () => {
  expect(userHasPermission('admin', 'delete_band')).toBe(true);
});
```

---

## 📞 Common Commands Cheat Sheet

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build production
npm run preview          # Preview build locally
npm test                 # Run tests

# Utilities (if configured)
npm run lint             # Check code quality
npm run format           # Format code
npm run analyze          # Analyze bundle size
```

---

## 🎓 Learning Path

1. **Week 1:** Understand page structure & components
2. **Week 2:** Learn routing & state management
3. **Week 3:** Implement analytics tracking
4. **Week 4:** Deploy & monitor performance

---

## 🎯 Quick Wins for Contributors

- [ ] Add page-specific SEO meta tags
- [x] Create new skeleton loader
- [ ] Add custom event tracking
- [ ] Optimize image assets
- [ ] Improve error messages
- [ ] Add keyboard shortcuts
- [ ] Enhance accessibility (a11y)
- [ ] Add loading indicators

---

**Last Updated:** February 2, 2026  
**Version:** 2.0.10  
**Status:** ✅ Production Ready

Need help? Check `FEATURES.md` for detailed documentation!
