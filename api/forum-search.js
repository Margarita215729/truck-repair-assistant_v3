/**
 * Vercel Serverless Function — Forum Search via Google Custom Search API
 * Searches curated truck repair forums for real community discussions.
 *
 * POST /api/forum-search
 * Body: { query: string, num?: number }
 * Returns: { results: ForumResult[], query: string }
 *
 * Free tier: 100 queries/day via Google Custom Search JSON API.
 * CSE must be configured to target truck repair forums.
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GOOGLE_CSE_API_KEY || process.env.VITE_GOOGLE_CSE_API_KEY;
  const CSE_ID = process.env.GOOGLE_CSE_ID || process.env.VITE_GOOGLE_CSE_ID;

  if (!API_KEY || !CSE_ID) {
    return res.status(200).json({
      results: [],
      query: req.body?.query || '',
      error: 'Forum search not configured — set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID',
    });
  }

  try {
    const { query, num = 5 } = req.body || {};

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing "query" in request body' });
    }

    const clampedNum = Math.min(Math.max(1, num), 10); // API max is 10

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('cx', CSE_ID);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(clampedNum));

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google CSE error:', response.status, errText);

      // Graceful degradation — return empty results, not 500
      if (response.status === 429) {
        return res.status(200).json({
          results: [],
          query,
          error: 'Daily forum search quota exceeded (100/day free tier)',
        });
      }

      return res.status(200).json({
        results: [],
        query,
        error: `Google CSE returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Transform Google CSE items into a simplified format
    const results = (data.items || []).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      source: extractSource(item.displayLink || item.link || ''),
      date: item.pagemap?.metatags?.[0]?.['article:published_time']
        || item.pagemap?.metatags?.[0]?.['og:updated_time']
        || null,
    }));

    return res.status(200).json({ results, query });
  } catch (error) {
    console.error('Forum search error:', error);
    return res.status(200).json({
      results: [],
      query: req.body?.query || '',
      error: 'Forum search temporarily unavailable',
    });
  }
}

/**
 * Extract a friendly source name from a URL
 */
function extractSource(displayLink) {
  const map = {
    'www.truckersreport.com': 'TruckersReport',
    'truckersreport.com': 'TruckersReport',
    'www.reddit.com': 'Reddit',
    'reddit.com': 'Reddit',
    'www.thedieselstop.com': 'TheDieselStop',
    'thedieselstop.com': 'TheDieselStop',
    'www.justanswer.com': 'JustAnswer',
    'justanswer.com': 'JustAnswer',
    'mechanics.stackexchange.com': 'Mechanics SE',
  };
  return map[displayLink] || displayLink;
}
