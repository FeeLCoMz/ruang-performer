# Batch Processing Songs - Implementation Guide

## Feature Overview

**Batch Processing Songs** allows users to search and update metadata for multiple songs in a setlist simultaneously, saving time when importing large song collections.

## What's New

### 1. Backend API: `/api/ai/batch-search`

**Location:** `api/ai/batch-search.js`

**Endpoint:** `POST /api/ai/batch-search`

**Request Format:**

```json
{
  "songs": [
    {
      "songId": "unique-id",
      "title": "Song Title",
      "artist": "Artist Name"
    },
    ...
  ]
}
```

**Response Format:**

```json
{
  "success": true,
  "totalProcessed": 5,
  "results": [
    {
      "songId": "unique-id",
      "title": "Song Title",
      "artist": "Artist Name",
      "key": "G",
      "tempo": "120",
      "style": "Pop",
      "youtubeId": "dQw4w9WgXcQ",
      "chordLinks": ["https://..."],
      "error": null
    },
    ...
  ]
}
```

**Features:**

- Processes up to 50 songs per request
- Sequential processing with 500ms delay between requests (rate limiting)
- Returns metadata: key, tempo, style, YouTube video ID, chord links
- Per-song error handling with detailed error messages
- Reuses existing search logic from `song-search.js`

### 2. Frontend Component: `BatchProcessingModal`

**Location:** `src/components/BatchProcessingModal.jsx`

**Features:**

1. **Song Selection Phase:**

   - Display all songs in current setlist
   - Checkboxes for individual song selection
   - "Select All" button for quick selection
   - "Clear All" button to deselect
   - Shows selection count: "Dipilih: X/Y"

2. **Processing Phase:**

   - Real-time progress bar
   - Shows: "Memproses... X/Y lagu"
   - Sequential API calls with rate limiting

3. **Results Phase:**
   - Display results with green highlight for successful searches
   - Show red highlight for failed searches with error message
   - Checkbox selection for applying results
   - Quick links to YouTube and chord websites
   - "Apply X Results" button to update songs

### 3. Integration into App.jsx

**Changes Made:**

1. **Import:**

   ```javascript
   import BatchProcessingModal from "./components/BatchProcessingModal";
   ```

2. **State:**

   ```javascript
   const [showBatchProcessing, setShowBatchProcessing] = useState(false);
   ```

3. **Button in Song View:**

   - Added 🔄 button in songs view header (next to 📝 bulk add)
   - Only visible when setlist is selected
   - Tooltip: "Update metadata untuk multiple lagu sekaligus"

4. **Handler Function:**

   ```javascript
   const handleApplyBatchResults = async (results) => {
     // Updates songs with batch results
     // Syncs to database via PUT /api/songs/{id}
     // Shows success toast: "✅ X lagu berhasil diupdate"
   };
   ```

5. **Modal Rendering:**
   ```jsx
   {
     !performanceMode && showBatchProcessing && currentSetList && (
       <BatchProcessingModal
         songs={songs}
         currentSetList={setLists.find((sl) => sl.id === currentSetList)}
         onClose={() => setShowBatchProcessing(false)}
         onApplySuggestions={handleApplyBatchResults}
       />
     );
   }
   ```

## User Workflow

1. **Open Setlist** - Select a setlist from setlists view or dropdown
2. **Click 🔄 Button** - Opens BatchProcessingModal
3. **Select Songs** - Choose which songs to process (or "Select All")
4. **Click "Cari Metadata"** - API processes selected songs
5. **Review Results** - Shows key, tempo, style, YouTube video, chord links
6. **Apply Results** - Selects which results to apply (default: all)
7. **Click "Terapkan"** - Updates songs in database and UI
8. **Success Message** - Toast shows "✅ X lagu berhasil diupdate"

## API Integration Points

### YouTube Search

- Uses `VITE_YOUTUBE_API_KEY` environment variable
- Returns video ID for direct YouTube link

### Gemini Metadata Extraction

- Uses `VITE_GOOGLE_API_KEY` environment variable
- Prompts: Extract key, tempo, style from song description
- Fallback: Returns null if API unavailable

### Chord Links

- Searches multiple chord databases
- Returns array of links (e.g., Ultimate Guitar, Chordify, etc.)

## Rate Limiting

- **Per-Song Delay:** 500ms between API calls
- **Max Batch Size:** 50 songs per request
- **Timeout:** 5s per YouTube API call, adjustable per API

## Error Handling

- **Per-Song Errors:** Shows error message in result item
- **Network Errors:** Displays in modal and prevents applying failed results
- **Validation:** Requires title and artist (shows error if missing)
- **API Failures:** User can retry or apply only successful results

## Database Sync

- Each song update: `PUT /api/songs/{songId}`
- Includes: `key`, `tempo`, `style`, `youtubeId`
- Sets `updatedAt` timestamp
- Happens after user clicks "Apply"

## Performance Notes

- **UI Responsiveness:** Progress bar updates every song
- **No Blocking:** Modal shows progress without freezing UI
- **Batch Optimization:** 500ms delay prevents API rate limits
- **Memory:** Results stored in component state during modal lifecycle

## Future Enhancements

1. **Batch Import Settings:**

   - Checkbox options: "Skip if already has key", "Overwrite existing"
   - Auto-apply option to skip results review

2. **Search Filtering:**

   - "Missing Key Only" - process only songs without key
   - "Missing Tempo Only" - process only songs without tempo

3. **Export Results:**

   - Export batch results as JSON/CSV
   - Preview before applying

4. **Undo Functionality:**

   - Keep backup of previous values
   - Undo button to restore original metadata

5. **Custom Search:**
   - Allow editing song title/artist before search
   - Retry individual songs with different search terms

## Files Modified

1. **src/App.jsx**

   - Added import: `BatchProcessingModal`
   - Added state: `showBatchProcessing`
   - Added button: 🔄 in song view header
   - Added handler: `handleApplyBatchResults`
   - Added modal rendering

2. **api/ai/index.js**

   - Added import: `batchSearchHandler`
   - Added route: `/batch-search` POST handler

3. **api/ai/batch-search.js** (NEW)

   - 196-line batch processing handler
   - Reuses `searchSingleSong` logic
   - Handles up to 50 songs per request

4. **src/components/BatchProcessingModal.jsx** (NEW)
   - 420-line React component
   - Three-phase UI: Selection → Processing → Results
   - Checkbox-based selection
   - Real-time progress tracking

## Testing Checklist

- [ ] Open setlist and click 🔄 button
- [ ] Select songs and click "Cari Metadata"
- [ ] Verify progress bar updates
- [ ] Check results display correctly
- [ ] Apply results and verify database update
- [ ] Test "Select All" / "Clear All" buttons
- [ ] Test error handling (invalid API keys)
- [ ] Test with various setlist sizes (10, 50, 100+ songs)
- [ ] Verify toast notification shows correct count

## Known Limitations

1. **YouTube API:** Requires valid API key, rate limited by Google
2. **Gemini API:** Requires valid API key, context window limits
3. **Network:** Requires internet connection
4. **Rate Limiting:** 500ms delay means 100 songs ≈ 50 seconds
5. **Exact Matching:** Metadata accuracy depends on search result quality

## Troubleshooting

**"Batch processing gagal" error:**

- Check internet connection
- Verify YouTube API key in environment
- Check API rate limits have not been exceeded

**No results returned:**

- Verify song titles and artists are spelled correctly
- Check API credentials are valid
- Try smaller batch size

**Modal won't close:**

- Click modal close button (✕)
- Check browser console for errors
- Refresh page if stuck

## Related Features

- **Bulk Add Songs** - Import multiple song titles from text
- **Song Search** - Single song metadata search
- **Setlist Management** - Organize songs into setlists
- **Auto Transposition** - Automatically adjust song keys
