# 👨‍💻 AI Assistant - Developer's Guide

For developers who want to understand, modify, or extend the AI Assistant feature.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                    │
│                                                             │
│  SongForm.jsx                                              │
│  ├─ 🤖 AI Button (onClick: setShowAIAssistant(true))      │
│  └─ AIAssistantModal Component Rendering                 │
└──────────────────────────┬──────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │ AIAssistantModal  │
                │   Component       │
                │ (360 lines)       │
                └─────────┬─────────┘
                          │
         State Management │ API Calls
         ├─ loading      │ fetch('/api/ai/song-search')
         ├─ error        │
         ├─ suggestions  │
         └─ selected     │
                          │
        ┌─────────────────▼──────────────────┐
        │    Backend API Layer               │
        │                                    │
        │  /api/ai/song-search (POST)       │
        │  - api/ai/song-search.js          │
        │  - Handler: 89 lines               │
        └─────────┬──────────────────────────┘
                  │
        ┌─────────▼────────────────────┐
        │   External APIs              │
        │                              │
        │  ├─ YouTube Data API v3     │
        │  ├─ Genius API (optional)   │
        │  └─ Last.fm API (optional)  │
        │                              │
        │  Returns:                    │
        │  ├─ youtubeId               │
        │  ├─ key (from analysis)     │
        │  ├─ tempo                   │
        │  ├─ style                   │
        │  └─ chordLinks (local)      │
        └──────────────────────────────┘
```

---

## Component Deep Dive

### AIAssistantModal.jsx (360 lines)

**Purpose:** Provide user interface for song metadata search

**Key Structure:**

```javascript
const AIAssistantModal = ({ formData, onClose, onApplySuggestions }) => {
  // State for managing modal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState({});

  // Three main functions
  const searchSongInfo = async () => { ... }
  const handleToggleSuggestion = (field) => { ... }
  const handleApply = () => { ... }

  // UI Rendering (two stages)
  return suggestions ? <ResultsUI /> : <SearchUI />
}
```

**Props:**

```typescript
interface Props {
  formData: {
    title: string;
    artist: string;
    key?: string;
    tempo?: string;
    style?: string;
    youtubeId?: string;
  };
  onClose: () => void;
  onApplySuggestions: (suggestions: object) => void;
}
```

**State Flow:**

```
Initial State
    ↓
  [searchSongInfo] → loading=true
    ↓
API Response Received
    ↓
  setSuggestions(data) → loading=false
    ↓
Display Results
    ↓
User toggles checkboxes → selectedSuggestions updates
    ↓
  [handleApply] → onApplySuggestions(selected)
    ↓
Modal Closes → onClose()
```

**Key Functions:**

1. **searchSongInfo()**

```javascript
// 1. Validate input
// 2. Set loading=true
// 3. Fetch from /api/ai/song-search
// 4. Receive { key, tempo, style, youtubeId, chordLinks }
// 5. Auto-select non-conflicting suggestions
// 6. Display results
```

2. **handleToggleSuggestion(field)**

```javascript
// Toggle specific field in selectedSuggestions
setSelectedSuggestions((prev) => ({
  ...prev,
  [field]: !prev[field],
}));
```

3. **handleApply()**

```javascript
// Build object with only selected suggestions
// Call onApplySuggestions callback
// Close modal via onClose()
```

**Styling:**

- All inline styles in `styles` object at bottom
- CSS variables for theming (--bg-color, --text-color, etc.)
- Responsive grid/flex layout
- Dark/light mode support via CSS variables

---

### SongForm.jsx Integration Points

**Import:**

```javascript
import AIAssistantModal from "./AIAssistantModal";
```

**State:**

```javascript
const [showAIAssistant, setShowAIAssistant] = useState(false);
```

**Handler:**

```javascript
const handleApplyAISuggestions = (suggestions) => {
  setFormData((prev) => {
    const updated = { ...prev };
    if (suggestions.key) updated.key = suggestions.key;
    if (suggestions.tempo) updated.tempo = suggestions.tempo;
    if (suggestions.style) updated.style = suggestions.style;
    if (suggestions.youtubeId) updated.youtubeId = suggestions.youtubeId;
    return updated;
  });
  setShowAIAssistant(false);
};
```

**Button:**

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

**Modal Rendering:**

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

---

## Backend API Handler

### POST /api/ai/song-search

**File:** `api/ai/song-search.js` (89 lines)

**Handler Function:**

```javascript
export default async function handler(req, res) {
  // 1. Check method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Get parameters
  const { title, artist } = req.body;

  // 3. Validate input
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist required' });
  }

  // 4. Build response object
  const results = {
    key: null,
    tempo: null,
    style: null,
    youtubeId: null,
    chordLinks: []
  };

  // 5. Search YouTube (if API key set)
  // ... YouTube API call ...

  // 6. Generate chord links (always available)
  results.chordLinks = [ ... ]

  // 7. Optional: Search Genius (if API key set)
  // ... Genius API call ...

  // 8. Return results
  return res.status(200).json(results);
}
```

**Error Handling:**

```javascript
try {
  // API call
} catch (err) {
  console.error("Error:", err);
  return res.status(500).json({
    error: "Failed to search song information",
    message: err.message,
  });
}
```

**Integration in Router:**

```javascript
// In api/ai/index.js
if (req.url.includes("/song-search") && req.method === "POST") {
  return songSearchHandler(req, res);
}
```

---

## API Integrations

### YouTube Data API v3

**Purpose:** Find official music videos

**API Call Structure:**

```javascript
const youtubeResponse = await fetch(
  `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet&` +
    `type=video&` +
    `maxResults=1&` +
    `q=${encodeURIComponent(`${title} ${artist}`)}&` +
    `key=${process.env.VITE_YOUTUBE_API_KEY}`
);
```

**Response Format:**

```json
{
  "items": [
    {
      "id": {
        "videoId": "y8AWYpI1-qo"
      },
      "snippet": {
        "title": "Leonard Cohen - Hallelujah",
        "channelTitle": "Leonard Cohen"
      }
    }
  ]
}
```

**Parsing:**

```javascript
const data = await youtubeResponse.json();
if (data?.items?.length > 0) {
  results.youtubeId = data.items[0].id.videoId;
}
```

### Genius API (Optional)

**Purpose:** Get detailed song information

**Not yet implemented but prepared for:**

```javascript
if (process.env.VITE_GENIUS_API_KEY) {
  const geniusResponse = await fetch(
    `https://api.genius.com/search?` +
      `q=${encodeURIComponent(`${title} ${artist}`)}&` +
      `access_token=${process.env.VITE_GENIUS_API_KEY}`
  );
  // Parse response
}
```

### Last.fm API (Optional)

**Purpose:** Get genre and BPM information

**Not yet implemented but prepared for:**

```javascript
if (process.env.VITE_LASTFM_API_KEY) {
  const lastfmResponse = await fetch(
    `http://ws.audioscrobbler.com/2.0/?` +
      `method=track.search&` +
      `track=${encodeURIComponent(title)}&` +
      `artist=${encodeURIComponent(artist)}&` +
      `api_key=${process.env.VITE_LASTFM_API_KEY}&` +
      `format=json`
  );
  // Parse response
}
```

### Chord Links (Local)

**Purpose:** Provide direct links to chord databases

**Generation:**

```javascript
results.chordLinks = [
  {
    title: 'Chordtela',
    site: 'chordtela.com',
    url: `https://www.chordtela.com/chord-...?q=${encodeURIComponent(...)}`
  },
  // More links...
];
```

---

## Adding New API Integration

### Step 1: Create API Wrapper Function

```javascript
// In api/ai/song-search.js

async function searchGenomeAPI(title, artist, apiKey) {
  try {
    const response = await fetch(
      `https://api.example.com/search?` +
        `q=${encodeURIComponent(`${title} ${artist}`)}&` +
        `key=${apiKey}`,
      { timeout: 5000 }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      // Extract relevant fields
      key: data.key,
      tempo: data.tempo,
    };
  } catch (err) {
    console.error("Genome API error:", err);
    return null; // Graceful failure
  }
}
```

### Step 2: Call in Main Handler

```javascript
export default async function handler(req, res) {
  // ... existing code ...

  // Add new API call
  if (process.env.VITE_GENOME_API_KEY) {
    try {
      const genomeData = await searchGenomeAPI(
        title,
        artist,
        process.env.VITE_GENOME_API_KEY
      );

      if (genomeData) {
        if (genomeData.key) results.key = genomeData.key;
        if (genomeData.tempo) results.tempo = genomeData.tempo;
      }
    } catch (err) {
      console.error("Genome integration error:", err);
    }
  }

  return res.status(200).json(results);
}
```

### Step 3: Document in ENV_SETUP.md

```markdown
### VITE_GENOME_API_KEY

**How to get:**

1. Visit example.com/api
2. Create account
3. Generate key
4. Copy to .env.local
```

---

## Error Handling Strategy

### Frontend (AIAssistantModal.jsx)

```javascript
try {
  const response = await fetch("/api/ai/song-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, artist }),
  });

  if (!response.ok) {
    throw new Error("Gagal mencari informasi lagu");
  }

  const data = await response.json();
  setSuggestions(data);
} catch (err) {
  setError(err.message || "Terjadi kesalahan");
  console.error("Search error:", err);
} finally {
  setLoading(false);
}
```

### Backend (api/ai/song-search.js)

```javascript
// Validate early
if (!title || !artist) {
  return res.status(400).json({
    error: "Title and artist required",
  });
}

// Wrap API calls in try-catch
try {
  const response = await fetch(url);
  // Process response
} catch (err) {
  console.error(`API error: ${err}`);
  // Continue with next API or return partial results
}

// Return descriptive errors
return res.status(500).json({
  error: "Failed to search song information",
  message: err.message,
});
```

---

## Testing the Feature

### Unit Testing (Example with Jest)

```javascript
// AIAssistantModal.test.jsx
describe("AIAssistantModal", () => {
  it("renders search form initially", () => {
    render(
      <AIAssistantModal
        formData={{ title: "", artist: "" }}
        onClose={() => {}}
        onApplySuggestions={() => {}}
      />
    );
    expect(screen.getByText(/Cari Informasi Lagu/)).toBeInTheDocument();
  });

  it("shows error when title/artist empty", async () => {
    const { getByText } = render(<AIAssistantModal {...props} />);
    fireEvent.click(getByText("Cari Informasi Lagu"));
    expect(getByText(/Masukkan judul/)).toBeInTheDocument();
  });

  it("applies selected suggestions", async () => {
    const onApply = jest.fn();
    render(
      <AIAssistantModal
        formData={{ title: "Test", artist: "Artist" }}
        onClose={() => {}}
        onApplySuggestions={onApply}
      />
    );
    // Simulate API response
    // Toggle checkbox
    // Click apply
    expect(onApply).toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
// Test the full flow
1. Open SongForm
2. Click 🤖 AI button
3. Modal opens
4. Enter title and artist
5. Click "Cari Informasi Lagu"
6. Wait for results
7. Select suggestions
8. Click "Terapkan Saran"
9. Verify form fields updated
10. Save and verify
```

### Manual Testing Scenarios

```
Scenario 1: Popular Song
├─ Input: "Imagine" + "John Lennon"
├─ Expected: All fields filled
└─ Verify: Results display, apply works

Scenario 2: Network Error
├─ Simulate: Disconnect network
├─ Expected: Error message
└─ Verify: Can retry, error clears

Scenario 3: No Results
├─ Input: "Unknown Song" + "Unknown Artist"
├─ Expected: Empty results
└─ Verify: Chord links still available
```

---

## Performance Optimization

### Current Performance

- Search time: 1-3 seconds
- Network payload: ~500 bytes request, 2-5 KB response
- Frontend: <100ms for UI updates

### Optimization Opportunities

#### 1. Implement Caching

```javascript
// Cache results in localStorage
const cacheKey = `songSearch_${title}|${artist}`.toLowerCase();

function getCachedResult(title, artist) {
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  const age = Date.now() - timestamp;

  // Cache valid for 7 days
  if (age < 7 * 24 * 60 * 60 * 1000) {
    return data;
  }

  return null;
}

function setCacheResult(title, artist, data) {
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    })
  );
}
```

#### 2. Implement Rate Limiting

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
  // ... search logic
};
```

#### 3. Debounce User Input

```javascript
// For future: add search field that debounces
const [searchInput, setSearchInput] = useState("");

const debouncedSearch = useCallback(
  debounce((title, artist) => {
    searchSongInfo(title, artist);
  }, 500),
  []
);

const handleTitleChange = (e) => {
  setSearchInput(e.target.value);
  debouncedSearch(e.target.value, formData.artist);
};
```

---

## Debugging Tips

### Chrome DevTools

1. **Network Tab**

   - Watch POST to /api/ai/song-search
   - Check request payload
   - Check response JSON
   - Monitor timing

2. **Console**

   - Check for JavaScript errors
   - Look for API key warnings
   - Watch fetch responses

3. **Sources**
   - Set breakpoint in searchSongInfo()
   - Step through execution
   - Inspect variables

### Common Issues

| Issue               | Debug                                 |
| ------------------- | ------------------------------------- |
| API key not found   | Check .env.local, restart server      |
| No search results   | Check YouTube API quota               |
| Slow response       | Monitor network tab, check API status |
| Modal not rendering | Check showAIAssistant state           |
| Form not updating   | Check handleApplyAISuggestions logic  |

---

## Extending the Feature

### Add New Suggestion Field

```javascript
// 1. In API response, add field:
results.myNewField = value;

// 2. In AIAssistantModal, add checkbox:
<input
  type="checkbox"
  id="suggestionNewField"
  checked={selectedSuggestions.myNewField || false}
  onChange={() => handleToggleSuggestion("myNewField")}
  disabled={!suggestions.myNewField}
/>;

// 3. In SongForm handler, apply:
if (suggestions.myNewField) updated.myNewField = suggestions.myNewField;
```

### Add New API Integration

See "Adding New API Integration" section above.

### Change UI/Styling

```javascript
// Modify styles object in AIAssistantModal.jsx
const styles = {
  modal: {
    // ... modify properties ...
  },
};
```

---

## Version History

| Version         | Date | Changes            |
| --------------- | ---- | ------------------ |
| 1.0.0           | 2024 | Initial release    |
| 1.1.0 (planned) | TBD  | Lyrics integration |
| 1.2.0 (planned) | TBD  | Offline caching    |
| 2.0.0 (planned) | TBD  | Batch processing   |

---

## Support & Maintenance

### Regular Maintenance

- Monitor API quotas
- Update API integrations if changed
- Review error logs monthly
- Update dependencies

### Common Maintenance Tasks

**Update YouTube API quota check:**

```javascript
// Add quota monitoring
const checkQuota = async () => {
  const response = await fetch(`https://youtubeanalytics.googleapis.com/...`);
  // Log usage
};
```

**Update Error Messages:**
Modify error strings in AIAssistantModal.jsx around lines 18-30

---

## Resources

- [YouTube Data API Docs](https://developers.google.com/youtube/v3)
- [Genius API Docs](https://genius.com/api-clients)
- [Last.fm API Docs](http://www.last.fm/api)
- [React Hooks Documentation](https://react.dev/reference/react)
- [Fetch API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

## Contact

For questions about the AI Assistant implementation, refer to:

- This guide
- AI_ASSISTANT.md
- Code comments in AIAssistantModal.jsx and song-search.js

---

**Last Updated:** 2024  
**Difficulty:** Intermediate (React hooks + APIs)  
**Time to Learn:** 30-45 minutes
