# 🤖 AI Assistant Feature Documentation

## Overview

The AI Assistant feature helps users quickly find and fill in song metadata (Key, Tempo, Style, YouTube Video ID) by searching across multiple external APIs and music databases.

**Status:** ✅ Frontend Complete | ⏳ Backend API Integration | ⏳ Environment Variables

---

## Features

### 1. **Smart Song Search**

- Search by song title and artist name
- Returns: Key, Tempo, Style, YouTube Video ID
- Provides links to multiple chord databases

### 2. **Selective Application**

- Users choose which suggestions to apply
- Doesn't overwrite existing form values
- Green highlight for selected suggestions

### 3. **Chord Database Links**

- **Chordtela** - Popular in Indonesia
- **Ultimate Guitar** - Global database
- **Chordify** - Interactive chord discovery

### 4. **Smart Auto-Selection**

- Automatically selects suggestions that don't conflict with existing form data
- Respects user's current values

---

## Architecture

### Frontend Components

#### `AIAssistantModal.jsx` (300+ lines)

**Location:** `src/components/AIAssistantModal.jsx`

**Props:**

```javascript
{
  formData: {
    title: string,    // Song title
    artist: string,   // Artist name
    key?: string,     // Current key (if any)
    tempo?: string,   // Current tempo (if any)
    style?: string,   // Current style (if any)
    youtubeId?: string // Current YouTube ID (if any)
  },
  onClose: () => void,                           // Close modal callback
  onApplySuggestions: (suggestions) => void      // Apply suggestions callback
}
```

**State Management:**

```javascript
{
  loading: boolean,        // Search in progress
  error: string,          // Error message if search failed
  suggestions: object,    // Search results
  selectedSuggestions: {} // User's selections (checkboxes)
}
```

**Key Functions:**

1. **searchSongInfo()**

   - Calls `/api/ai/search-song` endpoint
   - Sends title and artist
   - Receives suggestions and chord links
   - Auto-selects non-conflicting suggestions

2. **handleToggleSuggestion(field)**

   - Toggle checkbox for individual field
   - Updates selectedSuggestions state

3. **handleApply()**
   - Builds object with only selected suggestions
   - Calls onApplySuggestions callback
   - Closes modal

**UI States:**

- **Initial:** Search form with fields display
- **Loading:** Spinner and disabled search button
- **Results:** Checkboxes for each field, chord links
- **Error:** Error message with retry option

#### Integration in `SongForm.jsx`

**Lines 3:** Import AIAssistantModal

```javascript
import AIAssistantModal from "./AIAssistantModal";
```

**Line 64:** State for modal visibility

```javascript
const [showAIAssistant, setShowAIAssistant] = useState(false);
```

**Lines 136-148:** Handler for applying suggestions

```javascript
const handleApplyAISuggestions = (suggestions) => {
  const updated = { ...formData };
  if (suggestions.key) updated.key = suggestions.key;
  if (suggestions.tempo) updated.tempo = suggestions.tempo;
  if (suggestions.style) updated.style = suggestions.style;
  if (suggestions.youtubeId) updated.youtubeId = suggestions.youtubeId;
  setFormData(updated);
  setShowAIAssistant(false);
};
```

**Lines 962-980:** AI Button in form header

```javascript
<button
  type="button"
  className="btn btn-sm btn-primary"
  onClick={() => setShowAIAssistant(true)}
  disabled={!formData.title && !formData.artist}
  title="Cari informasi lagu dengan AI"
>
  🤖 AI
</button>
```

**Lines 2033-2039:** Modal rendering

```javascript
{
  showAIAssistant && (
    <AIAssistantModal
      formData={formData}
      onClose={() => setShowAIAssistant(false)}
      onApplySuggestions={handleApplyAISuggestions}
    />
  );
}
```

### Backend Endpoint

#### `POST /api/ai/song-search`

**Location:** `api/ai/song-search.js`

**Request:**

```json
{
  "title": "Hallelujah",
  "artist": "Leonard Cohen"
}
```

**Response Success (200):**

```json
{
  "key": "C Major",
  "tempo": "72 BPM",
  "style": "Rock/Ballad",
  "youtubeId": "y8AWYpI1-qo",
  "chordLinks": [
    {
      "title": "Chordtela",
      "site": "chordtela.com",
      "url": "https://www.chordtela.com/..."
    },
    {
      "title": "Ultimate Guitar",
      "site": "ultimate-guitar.com",
      "url": "https://www.ultimate-guitar.com/..."
    },
    {
      "title": "Chordify",
      "site": "chordify.net",
      "url": "https://www.chordify.net/..."
    }
  ]
}
```

**Response Error (400/500):**

```json
{
  "error": "Error message",
  "message": "Additional details if applicable"
}
```

**Error Handling:**

- Returns 405 if method is not POST
- Returns 400 if title or artist missing
- Returns 500 if API call fails
- Includes descriptive error messages

### API Integrations

The backend can integrate with multiple music APIs:

#### 1. **YouTube Data API**

- **Purpose:** Find official music video
- **Returns:** videoId for embedding
- **Required:** VITE_YOUTUBE_API_KEY
- **Endpoint:** youtube.googleapis.com/youtube/v3/search
- **Query:** `{title} {artist}`

#### 2. **Genius API** (Future)

- **Purpose:** Fetch song metadata, artist info
- **Returns:** Key, BPM, genre, lyrics metadata
- **Required:** VITE_GENIUS_API_KEY
- **Endpoint:** api.genius.com/search
- **Query:** `{title} {artist}`

#### 3. **Last.fm API** (Future)

- **Purpose:** Additional metadata, popularity
- **Returns:** Genre, BPM, similar songs
- **Required:** VITE_LASTFM_API_KEY
- **Endpoint:** ws.audioscrobbler.com/2.0/

#### 4. **Chordify Integration** (Links Only)

- Generates search links without API calls
- User opens in new tab
- No API key needed

---

## Setup Instructions

### 1. Environment Variables

Create or update `.env.local` file with:

```env
# YouTube Data API
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here

# Genius API (optional)
VITE_GENIUS_API_KEY=your_genius_access_token_here

# Last.fm API (optional)
VITE_LASTFM_API_KEY=your_lastfm_api_key_here
```

**How to get API keys:**

**YouTube Data API:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable YouTube Data API v3
4. Create API key (Credentials → Create Credentials → API Key)
5. Restrict to YouTube Data API v3
6. Copy key to .env.local

**Genius API:**

1. Go to [Genius API](https://genius.com/api-clients)
2. Create/Login to account
3. Generate access token
4. Copy token to .env.local

**Last.fm API:**

1. Go to [Last.fm API](https://www.last.fm/api)
2. Create application
3. Get API key
4. Copy key to .env.local

### 2. Restart Development Server

After setting environment variables:

```bash
npm run dev
# or
yarn dev
```

---

## Usage Flow

### Step 1: Open Song Form

- Click "Tambah Lagu Baru" or edit existing song

### Step 2: Fill Title & Artist

- Enter song title and artist name
- The 🤖 AI button becomes enabled

### Step 3: Click AI Button

- Opens AIAssistantModal
- Shows current form values

### Step 4: Search for Metadata

- Click "🔍 Cari Informasi Lagu"
- System searches YouTube, Genius, Last.fm
- Results appear with checkboxes

### Step 5: Select Suggestions

- Check which suggestions to apply
- Green highlight indicates selected items
- Can toggle individual items

### Step 6: Apply Suggestions

- Click "✓ Terapkan Saran"
- Form fields auto-fill with selected values
- Modal closes automatically
- You can still edit values manually

### Step 7: Review and Save

- Verify all fields are correct
- Edit any values if needed
- Click "💾 Simpan Lagu" to save

---

## Data Flow Diagram

```
User Input (Title + Artist)
    ↓
[🤖 AI Button Click]
    ↓
AIAssistantModal Opens
    ↓
User clicks "🔍 Cari"
    ↓
POST /api/ai/song-search
    ↓
Backend APIs Called:
  ├─ YouTube API → videoId
  ├─ Genius API → metadata
  ├─ Last.fm API → genre/BPM
  └─ Chord link generation
    ↓
Results Returned → Modal Display
    ↓
User Selects Suggestions
    ↓
[✓ Terapkan Saran Click]
    ↓
onApplySuggestions() → SongForm
    ↓
Form Fields Updated
    ↓
User Saves Song
```

---

## Error Handling

### Common Errors & Solutions

| Error                       | Cause                        | Solution                                      |
| --------------------------- | ---------------------------- | --------------------------------------------- |
| "Title and artist required" | Form fields empty            | Fill title and artist                         |
| "API key not set"           | Environment variable missing | Add VITE_YOUTUBE_API_KEY to .env.local        |
| "Failed to search song"     | Network issue or API error   | Check internet, retry, check API status       |
| "No results found"          | Song not in database         | Try different title/artist spelling           |
| 500 Internal Server Error   | Backend error                | Check server logs, restart development server |

### Frontend Error Display

Modal shows error message in red box:

```
⚠️ Error: Terjadi kesalahan saat mencari informasi
```

User can:

- Adjust title/artist spelling
- Click "🔍 Cari Informasi Lagu" to retry
- Cancel modal and continue

---

## Testing Checklist

### Component Integration

- [ ] AI button appears in SongForm header
- [ ] Button disabled when title/artist empty
- [ ] Button enabled when title/artist filled
- [ ] Click opens AIAssistantModal

### Modal Functionality

- [ ] Modal shows current form values
- [ ] "🔍 Cari Informasi Lagu" button works
- [ ] Loading spinner appears during search
- [ ] Results display correctly
- [ ] Checkboxes can be toggled
- [ ] Selected items highlighted in green

### API Integration

- [ ] YouTube video found for common songs
- [ ] Chord links are valid and open
- [ ] Error handling for failed API calls
- [ ] Timeout handling (>5 seconds)

### Form Application

- [ ] "✓ Terapkan Saran" applies selected values
- [ ] Only selected fields are updated
- [ ] Existing form values not overwritten
- [ ] Modal closes after applying
- [ ] Form maintains other values

### User Experience

- [ ] Modal is responsive on mobile
- [ ] Modal closes when clicking X
- [ ] Modal closes on overlay click
- [ ] Smooth animations
- [ ] Clear error messages
- [ ] Loading states visible

---

## Performance Optimization (Optional)

### Caching Suggestions

**Goal:** Avoid repeated API calls for same song

**Implementation:**

```javascript
// In AIAssistantModal or utility
const cacheSongSearch = (title, artist, results) => {
  const cacheKey = `${title}|${artist}`.toLowerCase();
  localStorage.setItem(
    `songSearch_${cacheKey}`,
    JSON.stringify({
      results,
      timestamp: Date.now(),
    })
  );
};

const getCachedSearch = (title, artist) => {
  const cacheKey = `${title}|${artist}`.toLowerCase();
  const cached = localStorage.getItem(`songSearch_${cacheKey}`);
  if (!cached) return null;

  const { results, timestamp } = JSON.parse(cached);
  const cacheAge = Date.now() - timestamp;

  // Cache valid for 7 days
  if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
    return results;
  }

  return null;
};
```

### Rate Limiting

**Goal:** Prevent API overload

**Implementation:**

```javascript
let lastSearchTime = 0;
const SEARCH_COOLDOWN = 2000; // 2 seconds

const searchSongInfo = async () => {
  const now = Date.now();
  if (now - lastSearchTime < SEARCH_COOLDOWN) {
    setError("Tunggu beberapa detik sebelum mencari lagi");
    return;
  }
  lastSearchTime = now;

  // ... rest of search logic
};
```

---

## Future Enhancements

1. **Lyric Search**

   - Integrate with Genius API for lyrics
   - Display snippet in modal
   - Link to full lyrics page

2. **Chord Detection**

   - Analyze YouTube video with Chordify API
   - Auto-detect song key
   - Auto-detect tempo

3. **Smart Suggestions**

   - Learn user preferences over time
   - Suggest most relevant fields first
   - Confidence scores for suggestions

4. **Bulk Search**

   - Search metadata for multiple songs at once
   - Batch update setlist

5. **Edit History**

   - Show what AI suggested vs. what user chose
   - Help improve suggestions over time
   - Revert to original AI suggestion

6. **Offline Support**
   - Cache popular songs
   - Work without internet
   - Sync when back online

---

## Code References

- **Modal Component:** [src/components/AIAssistantModal.jsx](../src/components/AIAssistantModal.jsx)
- **SongForm Integration:** [src/components/SongForm.jsx](../src/components/SongForm.jsx#L3) (Line 3)
- **Backend Handler:** [api/ai/song-search.js](../api/ai/song-search.js)
- **API Router:** [api/ai/index.js](../api/ai/index.js)

---

## Support

**Issues?** Check:

1. Environment variables set correctly
2. API keys valid and not revoked
3. Network connection working
4. Browser console for JavaScript errors
5. Server logs for backend errors

**Questions?** See:

- YouTube Data API docs: [https://developers.google.com/youtube/v3](https://developers.google.com/youtube/v3)
- Genius API docs: [https://genius.com/api-clients](https://genius.com/api-clients)
- Last.fm API docs: [http://www.last.fm/api](http://www.last.fm/api)
