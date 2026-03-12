/**
 * Vercel Serverless Function — Forum Search via Brave Web Search API
 * Searches for truck repair forum discussions and community content.
 *
 * POST /api/forum-search
 * Body: { query: string, num?: number }
 * Returns: { results: ForumResult[], query: string }
 *
 * Free tier: 2000 queries/month via Brave Search API.
 */

import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

const ALLOWED_ORIGINS = [
  'https://tra.tools',
  'https://truck-repair-assistantv3-main.vercel.app',
  'https://truck-repair-assistant-v3.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.NEXT_PUBLIC_BASE_URL,
].filter(Boolean);

export default async function handler(req, res) {
  // CORS — restricted origins
  const origin = req.headers.origin || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const API_KEY = process.env.BRAVE_API_KEY;

  if (!API_KEY) {
    return res.status(200).json({
      results: [],
      query: req.body?.query || '',
      error: 'Forum search not configured — set BRAVE_API_KEY',
    });
  }

  try {
    const { query, num = 5 } = req.body || {};

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing "query" in request body' });
    }

    const clampedNum = Math.min(Math.max(1, num), 20);

    // Add forum-oriented terms to improve relevance
    const forumQuery = `${query} forum discussion`;
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', forumQuery);
    url.searchParams.set('count', String(clampedNum));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Brave Search error:', response.status);

      if (response.status === 429) {
        return res.status(200).json({
          results: [],
          query,
          error: 'Forum search rate limit exceeded',
        });
      }

      return res.status(200).json({
        results: [],
        query,
        error: `Brave Search returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Transform Brave results into a simplified format
    const results = (data.web?.results || []).map((item) => ({
      title: item.title || '',
      link: item.url || '',
      snippet: item.description || '',
      source: extractSource(new URL(item.url).hostname),
      date: item.age || null,
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
