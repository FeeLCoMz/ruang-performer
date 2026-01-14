# 🚨 QUICK FIX: AI Search Error

## Error Message

```
Error: Gagal mencari informasi lagu
```

---

## 🔴 Most Likely Cause

**Your `VITE_YOUTUBE_API_KEY` is not set or is invalid**

---

## ✅ Quick Fix (5 minutes)

### Step 1: Create `.env.local` File

In the project root (same folder as `package.json`), create a file named `.env.local` with:

```env
VITE_YOUTUBE_API_KEY=AIzaSyD_YOUR_ACTUAL_KEY_HERE
```

### Step 2: Get Your API Key

If you don't have one yet:

1. Go to: [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create API key in Credentials
5. Copy the key
6. Paste into `.env.local`

**Detailed guide:** [ENV_SETUP.md](ENV_SETUP.md)

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C)
# Then:
npm run dev
```

### Step 4: Clear Cache & Test

1. Press `Ctrl+Shift+Del` in browser (clear cache)
2. Open app fresh
3. Try 🤖 AI button with "Imagine" + "John Lennon"
4. Should work now!

---

## 🔍 Verify It's Working

After restart, look for this in browser console (F12):

✅ **Good:**

```
Song search debug info: {youtubeKeyMissing: false}
```

❌ **Bad:**

```
⚠️ YouTube API key belum diatur
```

---

## 📞 Still Not Working?

1. **Check .env.local exists** - `cat .env.local` in terminal
2. **API key format** - Should start with `AIzaSyD...`
3. **Restarted server?** - Yes, `npm run dev` again
4. **Cleared browser cache?** - Yes, Ctrl+Shift+Del
5. **Read full guide** - [AI_TROUBLESHOOTING.md](AI_TROUBLESHOOTING.md)

---

**That's it! 🎉 Your AI Assistant should work now.**

Need detailed help? → [AI_TROUBLESHOOTING.md](AI_TROUBLESHOOTING.md)
