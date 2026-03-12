/**
 * Vercel Serverless Function — Repair Parts Search (AI-powered)
 *
 * Pipeline:
 *   1. Brave Web Search — searches truck-parts vendor sites for real product pages
 *   2. GPT-4o-mini — normalises raw search results into structured VendorListing cards
 *
 * If any step fails, the API returns an error — no degraded/synthetic data.
 *
 * POST /api/parts/search
 * Body: { query, partNumber, make, model, year, condition, limit }
 * Returns: { listings: VendorListing[], meta }
 */

import { createClient } from '@supabase/supabase-js';

// ─── Supabase singleton ──────────────────────────────────────────────
let _supabase;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing Supabase config');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ─── Domain → tier mapping (mirrors client-side VENDOR_INFO) ────────
const DOMAIN_TIER = {
  'parts.freightliner.com': 1, 'www.peterbiltparts.com': 1, 'www.kenworth.com': 1,
  'www.volvotrucks.us': 1, 'www.macktrucks.com': 1, 'parts.cummins.com': 1,
  'www.fleetpride.com': 2, 'www.truckpro.com': 2, 'www.finditparts.com': 2,
  'www.rockauto.com': 3,
  'www.ebay.com': 4, 'www.amazon.com': 4,
};

function tierFromUrl(url) {
  try { return DOMAIN_TIER[new URL(url).hostname] || 4; } catch { return 4; }
}

function vendorFromUrl(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '').replace(/^parts\./, '');
    const map = {
      'freightliner.com': 'Freightliner', 'peterbiltparts.com': 'Peterbilt',
      'kenworth.com': 'Kenworth', 'volvotrucks.us': 'Volvo Trucks',
      'macktrucks.com': 'Mack Trucks', 'cummins.com': 'Cummins',
      'fleetpride.com': 'FleetPride', 'truckpro.com': 'TruckPro',
      'finditparts.com': 'FinditParts', 'rockauto.com': 'RockAuto',
      'ebay.com': 'eBay', 'amazon.com': 'Amazon',
    };
    return map[h] || h;
  } catch { return 'Unknown'; }
}

// ─── Brave Search ───────────────────────────────────────────────────
async function searchBrave(query, num = 10) {
  const API_KEY = process.env.BRAVE_API_KEY;

  if (!API_KEY) {
    throw new Error('Brave Search is not configured (missing BRAVE_API_KEY).');
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(Math.min(num, 20)));

  const resp = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': API_KEY,
    },
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    console.error('Brave search error:', { status: resp.status, body: errBody.slice(0, 300) });
    throw new Error(`Brave search failed: HTTP ${resp.status}`);
  }

  const data = await resp.json();
  return (data.web?.results || []).map(item => ({
    title: item.title || '',
    link: item.url || '',
    snippet: item.description || '',
    image: item.thumbnail?.src || null,
    price: null,
    availability: null,
    condition: null,
  }));
}

// ─── AI normalisation via GPT-4o-mini ───────────────────────────────
async function normaliseWithAI(cseResults, query, partNumber, make, model, year) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN || cseResults.length === 0) {
    throw new Error('AI normalisation is not configured (missing GITHUB_TOKEN) or no CSE results.');
  }

  const systemPrompt = `You are a truck parts data normaliser. Given raw search results for truck parts, extract structured product listings.

Rules:
- Only include results that are actual product listings (parts for sale), skip informational pages
- Extract price as a number (USD). If the snippet mentions a price like "$123.45", extract 123.45. If no price found, use 0
- Determine condition: "New", "Remanufactured", "Used", or "Unknown"
- Determine availability: "In Stock", "Out of Stock", "Check Availability", or "Unknown"
- The itemUrl MUST be exactly the original link from the search result — do NOT modify or fabricate URLs
- partNumber should be extracted from the title/snippet if visible, otherwise empty string

Return a JSON array of objects with these exact fields:
{ "title": string, "price": number, "vendor": string, "condition": string, "availability": string, "partNumber": string, "imageUrl": string|null, "itemUrl": string, "sourceTier": number (1=OEM, 2=Specialist, 3=Aftermarket, 4=Marketplace) }

Return ONLY the JSON array, no markdown, no explanation.`;

  const userPrompt = `Search context: "${query}"${partNumber ? `, Part Number: ${partNumber}` : ''}${make ? `, Truck: ${make} ${model || ''} ${year || ''}` : ''}

Raw search results:
${cseResults.map((r, i) => `[${i + 1}] Title: ${r.title}
   URL: ${r.link}
   Snippet: ${r.snippet}
   Structured price: ${r.price || 'none'}
   Structured availability: ${r.availability || 'none'}
   Structured condition: ${r.condition || 'none'}
   Image: ${r.image || 'none'}`).join('\n\n')}`;

  try {
    const resp = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      throw new Error(`AI normalisation failed: HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    // Accept either { listings: [...] } or raw array
    const listings = Array.isArray(parsed) ? parsed : (parsed.listings || parsed.results || []);

    // Validate: only keep items whose itemUrl matches one of the original CSE links
    const validUrls = new Set(cseResults.map(r => r.link));
    return listings
      .filter(l => l.itemUrl && validUrls.has(l.itemUrl))
      .map(l => ({
        title: String(l.title || '').slice(0, 200),
        price: typeof l.price === 'number' && l.price >= 0 ? l.price : 0,
        vendor: String(l.vendor || vendorFromUrl(l.itemUrl)).slice(0, 50),
        condition: String(l.condition || 'Unknown').slice(0, 30),
        availability: String(l.availability || 'Unknown').slice(0, 30),
        partNumber: String(l.partNumber || '').slice(0, 50),
        imageUrl: l.imageUrl || null,
        itemUrl: l.itemUrl,
        sourceTier: tierFromUrl(l.itemUrl),
        sourceType: 'cse_ai',
      }));
  } catch (err) {
    throw new Error(`AI normalisation failed: ${err.message}`);
  }
}

// ─── Main handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_BASE_URL,
    'https://truck-repair-assistantv3-main.vercel.app',
    'https://truck-repair-assistant-v3.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { data: { user }, error: authError } = await getSupabase().auth.getUser(
      authHeader.split(' ')[1]
    );
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  try {
    const { query, partNumber, make, model, year, limit } = req.body || {};

    if (!query && !partNumber) {
      return res.status(400).json({ error: 'Either query or partNumber is required' });
    }

    // Build search string
    const searchParts = [partNumber, query, make, model].filter(Boolean);
    const searchString = searchParts.join(' ') + ' truck part';
    const maxResults = Math.min(Number(limit) || 10, 10);

    // Step 1: Brave Web Search
    const cseResults = await searchBrave(searchString, maxResults);

    if (cseResults.length === 0) {
      console.warn('Brave search returned 0 results for query:', searchString);
      return res.status(200).json({
        listings: [],
        meta: {
          query: query || '',
          partNumber: partNumber || '',
          searchQuery: searchString,
          totalResults: 0,
          livePricingAvailable: false,
          source: 'none',
        },
      });
    }

    // Step 2: AI normalisation
    const listings = await normaliseWithAI(cseResults, query, partNumber, make, model, year);

    // Sort by source tier (OEM first), then by price
    listings.sort((a, b) => (a.sourceTier - b.sourceTier) || ((a.price ?? Infinity) - (b.price ?? Infinity)));

    return res.status(200).json({
      listings,
      meta: {
        query: query || '',
        partNumber: partNumber || '',
        searchQuery: searchString,
        totalResults: listings.length,
        livePricingAvailable: listings.length > 0,
        source: listings[0]?.sourceType || 'none',
        cseResultCount: cseResults.length,
      },
    });
  } catch (err) {
    console.error('Parts search handler error:', err);
    return res.status(500).json({
      listings: [],
      meta: {
        query: req.body?.query || '',
        partNumber: req.body?.partNumber || '',
        totalResults: 0,
        livePricingAvailable: false,
      },
      error: err.message || 'Search temporarily unavailable',
    });
  }
}
