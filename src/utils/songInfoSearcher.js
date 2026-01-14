import axios from 'axios';

/**
 * Search for song information from various sources
 * Uses Genius API for metadata and YouTube Data API for video info
 */
export async function searchSongInfo(title, artist) {
  try {
    const results = {
      key: null,
      tempo: null,
      style: null,
      youtubeId: null,
      chordLinks: []
    };

    // Search for song metadata using Genius API
    const geniusApiKey = process.env.VITE_GENIUS_API_KEY;
    if (geniusApiKey) {
      try {
        const geniusResponse = await axios.get('https://api.genius.com/search', {
          params: {
            q: `${title} ${artist}`,
            access_token: geniusApiKey
          },
          timeout: 5000
        });

        if (geniusResponse.data?.response?.hits?.length > 0) {
          const song = geniusResponse.data.response.hits[0].result;
          
          // Extract metadata if available
          // Note: Genius doesn't provide key/tempo/style directly in API
          // We would need to parse the song page or use other sources
        }
      } catch (err) {
        console.error('Genius API error:', err.message);
        // Continue with other sources
      }
    }

    // Search for YouTube video ID
    const youtubeApiKey = process.env.VITE_YOUTUBE_API_KEY;
    if (youtubeApiKey) {
      try {
        const youtubeResponse = await axios.get(
          'https://www.googleapis.com/youtube/v3/search',
          {
            params: {
              part: 'snippet',
              type: 'video',
              q: `${title} ${artist}`,
              maxResults: 1,
              key: youtubeApiKey
            },
            timeout: 5000
          }
        );

        if (youtubeResponse.data?.items?.length > 0) {
          const videoId = youtubeResponse.data.items[0].id.videoId;
          results.youtubeId = videoId;
        }
      } catch (err) {
        console.error('YouTube API error:', err.message);
        // Continue - YouTube search failed, that's OK
      }
    }

    // Search for chord sources
    const chordSources = [
      {
        name: 'Chordtela',
        site: 'chordtela.com',
        url: `https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=${encodeURIComponent(`${title} ${artist}`)}`
      },
      {
        name: 'Ultimate Guitar',
        site: 'ultimate-guitar.com',
        url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(`${title} ${artist}`)}`
      },
      {
        name: 'Chordify',
        site: 'chordify.net',
        url: `https://www.chordify.net/search?q=${encodeURIComponent(`${title} ${artist}`)}`
      }
    ];

    results.chordLinks = chordSources;

    // Try to get additional metadata from other sources
    // Using Last.fm API if available
    const lastfmApiKey = process.env.VITE_LASTFM_API_KEY;
    if (lastfmApiKey) {
      try {
        const lastfmResponse = await axios.get('http://ws.audioscrobbler.com/2.0/', {
          params: {
            method: 'track.search',
            track: title,
            artist: artist,
            api_key: lastfmApiKey,
            format: 'json',
            limit: 1
          },
          timeout: 5000
        });

        if (lastfmResponse.data?.results?.trackmatches?.track?.length > 0) {
          const track = lastfmResponse.data.results.trackmatches.track[0];
          
          // Last.fm provides listeners, images, but not key/tempo
          // We'd need to make another call or use another API
          // For now, we're just demonstrating the pattern
        }
      } catch (err) {
        console.error('Last.fm API error:', err.message);
      }
    }

    // Generate suggestions based on the artist/title patterns
    // This is a simple heuristic - in production, you'd want more sophisticated logic
    if (!results.key) {
      results.key = getKeyByArtistGenre(artist, title);
    }

    if (!results.tempo) {
      results.tempo = getTempoByGenre(title, artist);
    }

    if (!results.style) {
      results.style = getStyleByArtist(artist);
    }

    return results;
  } catch (error) {
    console.error('Error searching song info:', error);
    throw error;
  }
}

/**
 * Heuristic: Guess key based on artist patterns
 * In production, this would be based on actual song data
 */
function getKeyByArtistGenre(artist, title) {
  // These are just examples - in production you'd use actual song data
  const commonKeys = ['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm'];
  
  // Simple hash-based selection for consistency
  const hash = (artist + title).charCodeAt(0) % commonKeys.length;
  return null; // Don't return guesses - only return actual data
}

/**
 * Heuristic: Guess tempo based on song characteristics
 */
function getTempoByGenre(title, artist) {
  // These are just examples
  const tempos = ['60', '90', '120', '140', '160'];
  const hash = (artist + title).charCodeAt(0) % tempos.length;
  return null; // Don't return guesses - only return actual data
}

/**
 * Heuristic: Guess style based on artist
 */
function getStyleByArtist(artist) {
  // These are just examples
  const styles = ['Pop', 'Rock', 'Jazz', 'Blues', 'Gospel', 'Indie'];
  const hash = artist.charCodeAt(0) % styles.length;
  return null; // Don't return guesses - only return actual data
}
