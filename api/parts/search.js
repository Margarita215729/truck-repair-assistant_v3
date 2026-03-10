/**
 * Vercel Serverless Function — Repair Parts Search
 *
 * This route no longer calls external vendor APIs (eBay, FinditParts).
 * It returns an honest empty result set with structured metadata,
 * indicating that live pricing is currently unavailable.
 *
 * POST /api/parts/search
 * Body: { query, partNumber, make, model, year, condition, limit }
 * Returns: { listings: [], searchUrls: {...}, meta: {...} }
 */

// Constructed Search URLs (stable public search patterns)

function buildSearchUrls(partNumber, query) {
  const searchTermFull = [partNumber, query].filter(Boolean).join(' ');
  const encoded = encodeURIComponent(searchTermFull);

  return {
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=6028`,
    amazon: `https://www.amazon.com/s?k=${encoded}+truck+parts`,
  };
}

// Main Handler

export default async function handler(req, res) {
  const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_BASE_URL,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  try {
    const { query, partNumber } = req.body || {};

    if (!query && !partNumber) {
      return res.status(400).json({ error: 'Either query or partNumber is required' });
    }

    const searchUrls = buildSearchUrls(partNumber, query);

    return res.status(200).json({
      listings: [],
      searchUrls,
      meta: {
        query: query || '',
        partNumber: partNumber || '',
        totalResults: 0,
        livePricingAvailable: false,
        error: 'Live pricing is currently unavailable.',
      },
    });
  } catch (err) {
    console.error('Parts search handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
