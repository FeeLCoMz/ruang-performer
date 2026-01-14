# 🔧 AI Assistant Troubleshooting Guide

## Error: "Gagal mencari informasi lagu"

The error you're seeing means the API request failed. Here are the most common causes and how to fix them:

---

## 🔍 Diagnostic Steps

### Step 1: Check Environment Variables

**Most Common Cause:** `VITE_YOUTUBE_API_KEY` is not set

```bash
# Check if .env.local exists
cat .env.local

# You should see:
# VITE_YOUTUBE_API_KEY=AIzaSyD...
```

**If Missing:**

1. Create `.env.local` in project root (same folder as `package.json`)
2. Add: `VITE_YOUTUBE_API_KEY=your_actual_key_here`
3. Save file
4. Restart dev server: `npm run dev`
5. Clear browser cache (Ctrl+Shift+Del)

### Step 2: Check Browser Console

Open DevTools (F12) and look for detailed error messages:

```javascript
// Good: You should see this when search works
Song search debug info: { youtubeKeyMissing: false }

// Bad: You might see
YouTube API returned 403
YouTube API returned 401
YouTube search error: Invalid API key
```

### Step 3: Check Server Console

In your terminal where `npm run dev` is running, look for:

```
YouTube API returned 401  ← Invalid/expired key
YouTube API returned 403  ← Key has no permission
YouTube search error: ...  ← Network or parsing error
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: API Key Not Set

**Error in Console:**

```
⚠️ YouTube API key belum diatur. Baca ENV_SETUP.md untuk setup.
```

**Solution:**

1. Get API key from: [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create `.env.local` with:
   ```env
   VITE_YOUTUBE_API_KEY=AIzaSyD_your_actual_key_here
   ```
3. Restart server
4. Clear browser cache

### Issue 2: Invalid API Key (401/403)

**Error in Console:**

```
YouTube API returned 401
YouTube API returned 403
```

**Solution:**

1. Your YouTube API key is invalid or expired
2. Go to [Google Cloud Console](https://console.cloud.google.com)
3. Check if key is still active (not deleted/disabled)
4. Re-generate a new key:
   - Go to Credentials
   - Create new API Key
   - Restrict to YouTube Data API v3
   - Copy and replace in `.env.local`
5. Restart server

### Issue 3: API Key Has Wrong Permissions

**Error in Console:**

```
YouTube API returned 403
```

**Solution:**

1. Key may not be restricted to YouTube Data API
2. Go to [Google Cloud Console](https://console.cloud.google.com)
3. Click on your key
4. Under "API restrictions":
   - Select "YouTube Data API v3"
   - Save
5. Restart server

### Issue 4: No Results Found

**Error in Console:**

```
Tidak ada hasil ditemukan untuk lagu ini.
```

**This is NOT an error** - it means:

- Song not on YouTube
- Or song name spelled wrong
- Or very obscure song

**Solution:**

- Try a different, more popular song
- Check spelling of title and artist
- Try just the song title without artist

### Issue 5: Network/Timeout Error

**Error in Console:**

```
YouTube search error: Failed to fetch
YouTube search error: Timeout
```

**Solution:**

1. Check internet connection
2. Try again in a moment
3. Check YouTube API status: [https://status.cloud.google.com](https://status.cloud.google.com)
4. Try a different song

---

## 🧪 Testing

### Test 1: Verify API Key Works

```bash
# Replace YOUR_KEY with your actual API key
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=imagine+john+lennon&key=YOUR_KEY"

# Should return JSON with video results
# If error: your key is invalid
```

### Test 2: Check Network Request

1. Open DevTools (F12)
2. Go to Network tab
3. Click 🤖 AI button and search
4. Find request to `/api/ai/search-song`
5. Check:
   - **Status:** Should be 200
   - **Response:** Should have youtubeId (if YouTube is working)

```json
{
  "key": null,
  "tempo": null,
  "style": null,
  "youtubeId": "y8AWYpI1-qo",  // ← Should be here for found videos
  "chordLinks": [...],
  "debug": {
    "youtubeKeyMissing": false  // ← Should be false
  }
}
```

### Test 3: Test with Popular Song

Try with a famous song that ALWAYS works:

```
Title:  Imagine
Artist: John Lennon
```

If this works but other songs don't → Issue is with song availability

If this doesn't work → Issue is with API key setup

---

## 📋 Pre-Debugging Checklist

Before reporting an issue, check:

- [ ] `.env.local` file exists in project root
- [ ] `VITE_YOUTUBE_API_KEY` is set in `.env.local`
- [ ] Dev server was restarted after `.env.local` changes
- [ ] Browser cache was cleared (Ctrl+Shift+Del)
- [ ] You're testing with a popular song (Imagine, Hallelujah, etc.)
- [ ] DevTools console is open to see debug messages
- [ ] API key is not expired/deleted

---

## 🔍 Advanced Debugging

### Enable Verbose Logging

Add this to the AI search function temporarily:

```javascript
// In AIAssistantModal.jsx, after getting response
console.log("Full API Response:", data);
console.log("Debug Info:", data.debug);
```

Then check browser console for full details.

### Check API Key Directly

```bash
# Terminal command to verify key works
YOUTUBE_API_KEY="your_key_here"
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=imagine&key=$YOUTUBE_API_KEY" | jq .

# Should return valid JSON with video results
```

### Monitor Server Logs

While using the app, watch the terminal where `npm run dev` runs:

```
// Look for these messages:
✓ API request received
YouTube API called...
YouTube API returned 200  ← Good
YouTube API returned 401  ← Bad key
YouTube API returned 403  ← No permission
```

---

## 📞 When to Get Help

**Before asking for help, gather:**

1. **Error message from browser console** (F12 → Console)
2. **API Response** (F12 → Network → `/api/ai/search-song`)
3. **Server logs** (terminal where `npm run dev` runs)
4. **Steps to reproduce:**
   ```
   1. I clicked 🤖 AI button
   2. I entered title: "..."
   3. I entered artist: "..."
   4. I clicked search
   5. Error occurred: "..."
   ```
5. **Have you followed** [ENV_SETUP.md](../ENV_SETUP.md)?

---

## ✅ Quick Fix Summary

If you get "Gagal mencari informasi lagu":

```bash
# 1. Create .env.local
echo 'VITE_YOUTUBE_API_KEY=AIzaSyD_your_actual_key' > .env.local

# 2. Restart server (Ctrl+C, then run):
npm run dev

# 3. Clear browser cache (Ctrl+Shift+Del in browser)

# 4. Test again with "Imagine" + "John Lennon"
```

---

## 📚 Related Documentation

- **Setup Guide:** [ENV_SETUP.md](../ENV_SETUP.md)
- **Feature Guide:** [AI_ASSISTANT.md](../AI_ASSISTANT.md)
- **Quick Reference:** [AI_ASSISTANT_QUICK_REF.md](../AI_ASSISTANT_QUICK_REF.md)

---

## 🎯 Solutions Summary

| Symptom                           | Cause               | Fix                 |
| --------------------------------- | ------------------- | ------------------- |
| "⚠️ YouTube API key belum diatur" | No API key          | Add to `.env.local` |
| "Gagal mencari informasi lagu"    | Invalid/expired key | Re-generate key     |
| "Tidak ada hasil ditemukan"       | Song not found      | Try popular song    |
| Network timeout                   | Slow connection     | Check internet      |
| Wrong video found                 | Bad spelling        | Check title/artist  |

---

**Last Updated:** 2024  
**Status:** Up to Date

Make sure you've completed the full setup in [ENV_SETUP.md](../ENV_SETUP.md) before troubleshooting further!
