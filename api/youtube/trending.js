import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyToken(req, res)) return;

  const apiKey = process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'VITE_YOUTUBE_API_KEY not configured' });
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('maxResults', '12');
    url.searchParams.set('videoCategoryId', '10');
    url.searchParams.set('regionCode', 'ID');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'YouTube API error',
        details: errorData.error?.message || response.statusText
      });
    }

    const data = await response.json();
    const trending = (data.items || []).map((item) => {
      const snippet = item.snippet || {};
      const thumbnails = snippet.thumbnails || {};
      const thumbnail = thumbnails.high || thumbnails.medium || thumbnails.default || {};
      return {
        videoId: item.id,
        title: snippet.title || '',
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || '',
        viewCount: item.statistics?.viewCount || null,
        thumbnailUrl: thumbnail.url || '',
        description: snippet.description || ''
      };
    });

    return res.status(200).json({ trending });
  } catch (error) {
    console.error('YouTube trending error:', error);
    return res.status(500).json({ error: 'Failed to fetch YouTube trending', message: error.message });
  }
}
