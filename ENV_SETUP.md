# 🚀 Environment Setup Guide

This guide explains how to set up environment variables for the AI Assistant feature.

## Quick Start

1. Create a `.env.local` file in the project root (same level as `package.json`)
2. Add the API keys from the sections below
3. Restart the development server (`npm run dev` or `yarn dev`)

## Required Environment Variables

### VITE_YOUTUBE_API_KEY (Required for Video Search)

**What it does:** Finds official music videos on YouTube

**How to get it:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Enter project name (e.g., "Chord Pro")
4. Click "Create"
5. Wait for project to be created, then click "Select Project"
6. Search for "YouTube Data API v3" in search bar
7. Click the API from results
8. Click "Enable"
9. Click "Create Credentials" (top right button)
10. Choose "API Key"
11. Copy the key that appears

**Add to .env.local:**

```env
VITE_YOUTUBE_API_KEY=AIzaSyD...your_key_here...
```

**Usage:** Automatically fetches YouTube video IDs when searching for songs

---

## Optional Environment Variables

### VITE_GENIUS_API_KEY (Optional - For Song Metadata)

**What it does:** Gets detailed song information like metadata and popularity

**How to get it:**

1. Go to [Genius API](https://genius.com/api-clients)
2. Click "Sign up" or "Log In"
3. Create account or login
4. Click "Create API Client"
5. Fill in required fields
6. Accept terms
7. Generate access token (you'll see it on the screen)
8. Copy the access token

**Add to .env.local:**

```env
VITE_GENIUS_API_KEY=your_genius_access_token_here
```

**Usage:** Enhances search results with additional song metadata

---

### VITE_LASTFM_API_KEY (Optional - For Genre & BPM)

**What it does:** Gets genre, BPM, and similar songs

**How to get it:**

1. Go to [Last.fm API](https://www.last.fm/api)
2. Click "Get a free API account"
3. Create account or login
4. Click "Create an API account"
5. Generate API key
6. Copy the key

**Add to .env.local:**

```env
VITE_LASTFM_API_KEY=your_lastfm_api_key_here
```

**Usage:** Provides additional metadata for better song information

---

## Complete .env.local Example

```env
# Required - YouTube video search
VITE_YOUTUBE_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrst

# Optional - Song metadata
VITE_GENIUS_API_KEY=abc123xyz789def456ghi789jkl012mno

# Optional - Genre and BPM
VITE_LASTFM_API_KEY=abc123def456ghi789jkl012mno345pqr
```

## Verification

After setting up environment variables:

1. **Restart Dev Server**

   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Test the Feature**

   - Open the app at http://localhost:5174
   - Create a new song
   - Enter title and artist
   - Click 🤖 AI button
   - Click "🔍 Cari Informasi Lagu"
   - Should see search results

3. **Check for Errors**
   - Open browser DevTools (F12)
   - Look for error messages in Console
   - Check if API keys are being used (Network tab)

## Troubleshooting

### "API key not set" Error

**Cause:** Environment variable missing
**Solution:**

- Add VITE_YOUTUBE_API_KEY to .env.local
- Restart dev server
- Clear browser cache

### "API key invalid" Error

**Cause:** Copied key incorrectly
**Solution:**

- Double-check key has no extra spaces
- Re-copy from Google Cloud Console
- Ensure API is enabled in Google Cloud

### No results found

**Cause:** Song not in database or wrong spelling
**Solution:**

- Try exact song title and artist name
- Check spelling carefully
- Try with just artist name
- Some songs may not be indexed

### YouTube Video Not Found

**Cause:**

- No official video on YouTube
- Indie/small artist
- Video may be blocked in region

**Solution:**

- Try searching manually in YouTube
- Use a different song for testing
- Check if video exists with different title

### Timeout Error

**Cause:** API taking too long (>5 seconds)
**Solution:**

- Check internet connection
- Try again in a moment
- Check if APIs are down (Check status pages)

## API Status Pages

Monitor these if experiencing issues:

- **Google Cloud:** [https://status.cloud.google.com/](https://status.cloud.google.com/)
- **Genius:** Check their website for status
- **Last.fm:** [https://www.last.fm/about/status](https://www.last.fm/about/status)

## Security Notes

⚠️ **Important:** Never commit `.env.local` to Git!

1. Add to `.gitignore` (already done in this project)
2. Never share your API keys
3. If key is leaked, regenerate it immediately
4. Use environment-specific keys if possible

---

## Development vs Production

### Development (.env.local)

```env
VITE_YOUTUBE_API_KEY=your_dev_key
```

### Production (.env.production or deployment platform)

```env
VITE_YOUTUBE_API_KEY=your_production_key
```

For production deployment, set environment variables in:

- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- GitHub Pages: Secrets (if using Actions)

---

## Next Steps

After setup:

1. ✅ Environment variables configured
2. ✅ Dev server restarted
3. ✅ Feature tested
4. 📝 Add Genius API key (optional)
5. 📝 Add Last.fm API key (optional)
6. 🚀 Deploy to production

---

## Reference

- **Environment Variables Documentation:** [AI_ASSISTANT.md](AI_ASSISTANT.md)
- **Feature Documentation:** [BULK_ADD_SONGS.md](BULK_ADD_SONGS.md)
- **Main README:** [README.md](README.md)
