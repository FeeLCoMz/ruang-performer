// YouTube utility functions

/**
 * Extracts the YouTube video ID from a URL or input string.
 * @param {string} input - YouTube URL or ID
 * @returns {string} - The extracted video ID or the original input if not matched
 */
export function extractYouTubeId(input) {
  if (!input) return '';
  const maybeId = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(maybeId)) return maybeId;

  try {
    const url = new URL(maybeId.includes('http') ? maybeId : `https://${maybeId}`);
    if (url.searchParams && url.searchParams.get('v')) return url.searchParams.get('v');
    if (url.hostname && url.pathname) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    }
  } catch (e) {
    const m = maybeId.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  }
  return input;
}
