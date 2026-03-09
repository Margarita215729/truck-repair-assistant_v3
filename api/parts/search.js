/**
 * Vercel Serverless Function — Repair Parts Search
 * Aggregates live pricing from eBay Browse API, FinditParts API,
 * and generates constructed search URLs for OEM, authorized, aftermarket, and marketplace sources.
 *
 * All results are normalized into a unified VendorListing shape with
 * sourceType / sourceTier for trust-hierarchy ranking.
 *
 * POST /api/parts/search
 * Body: { query, partNumber, make, model, year, condition, limit }
 * Returns: { listings: VendorListing[], searchUrls: {...}, meta: {...} }
 */

// ─── Source trust tier definitions ───────────────────────────────────

const SOURCE_TIERS = {
  manufacturer: 1,
  authorized_dealer: 2,
  specialist_vendor: 2,
  aftermarket_vendor: 3,
  marketplace: 4,
  search_link: 4,
};

// ─── Normalize a raw eBay result into VendorListing ──────────────────

function normalizeEbayListing(item, partNumber) {
  return {
    sourceKey: 'ebay',
    vendor: 'eBay',
    title: item.title,
    partNumber: partNumber || '',
    brand: '',
    sourceType: 'marketplace',
    sourceTier: 4,
    isOEM: false,
    isAuthorized: false,
    fitmentConfidence: partNumber ? 'medium' : 'low',
    counterfeitRisk: 'medium',
    price: parseFloat(item.price?.value) || 0,
    priceMax: null,
    currency: item.price?.currency || 'USD',
    condition: item.condition || 'Unknown',
    availability: 'unknown',
    shipping: item.shippingOptions?.[0]?.shippingCost?.value
      ? `$${item.shippingOptions[0].shippingCost.value}`
      : 'See listing',
    imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '',
    itemUrl: item.itemWebUrl || item.itemHref || '',
    sellerName: item.seller?.username || '',
    sellerRating: item.seller?.feedbackPercentage
      ? `${item.seller.feedbackPercentage}%`
      : '',
    location: item.itemLocation?.postalCode || item.itemLocation?.country || '',
    listingType: item.buyingOptions?.includes('FIXED_PRICE') ? 'Buy It Now' : 'Auction',
    fitmentNote: 'Verify fitment and seller before purchase',
  };
}

// ─── Normalize a raw FinditParts result into VendorListing ───────────

function normalizeFinditPartsListing(item, partNumber, searchQuery) {
  return {
    sourceKey: 'finditparts',
    vendor: 'FinditParts',
    title: item.name || item.description || item.title || '',
    partNumber: item.part_number || item.partNumber || partNumber || '',
    brand: item.brand || item.manufacturer || '',
    sourceType: 'specialist_vendor',
    sourceTier: 2,
    isOEM: false,
    isAuthorized: true,
    fitmentConfidence: partNumber ? 'medium' : 'low',
    counterfeitRisk: 'low',
    price: parseFloat(item.price || item.retail_price || 0),
    priceMax: null,
    currency: 'USD',
    condition: item.condition || 'New',
    availability: (item.in_stock ?? item.available) ? 'in_stock' : 'unknown',
    shipping: item.shipping || 'See listing',
    imageUrl: item.image_url || item.imageUrl || item.image || '',
    itemUrl: item.url || item.product_url || `https://www.finditparts.com/search?q=${encodeURIComponent(searchQuery)}`,
    sellerName: 'FinditParts',
    sellerRating: '',
    location: '',
    listingType: 'Buy Now',
    fitmentNote: null,
  };
}

// ─── eBay OAuth Token Cache ──────────────────────────────────────────

// NOTE: In-memory cache is per-instance on serverless (Vercel). Each cold start
// fetches a new token. For high-traffic, consider an external store (e.g. KV).
let ebayTokenCache = { token: null, expiresAt: 0 };

async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (ebayTokenCache.token && Date.now() < ebayTokenCache.expiresAt - 300_000) {
    return ebayTokenCache.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  if (!resp.ok) {
    console.error('eBay OAuth failed:', resp.status, await resp.text());
    return null;
  }

  const data = await resp.json();
  ebayTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  return data.access_token;
}

// ─── eBay Browse API Search (returns normalized listings) ────────────

async function searchEbay({ query, partNumber, make, model, year, condition, limit = 20 }) {
  const token = await getEbayAccessToken();
  if (!token) return [];

  const searchTerms = partNumber
    ? `${partNumber} ${query || ''}`.trim()
    : `${query || ''} truck`.trim();

  if (!searchTerms) return [];

  const params = new URLSearchParams({
    q: searchTerms,
    category_ids: '6028',
    limit: String(Math.min(limit, 50)),
    sort: 'price',
  });

  if (condition && condition !== 'all') {
    const conditionMap = { new: 'NEW', used: 'USED', refurbished: 'REFURBISHED' };
    if (conditionMap[condition]) {
      params.append('filter', `conditions:{${conditionMap[condition]}}`);
    }
  }

  if (make || model || year) {
    const compatParts = [];
    if (year) compatParts.push(`Year:${year}`);
    if (make) compatParts.push(`Make:${make}`);
    if (model) compatParts.push(`Model:${model}`);
    params.append('compatibility_filter', compatParts.join(','));
  }

  try {
    const resp = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!resp.ok) {
      console.warn('eBay search failed:', resp.status);
      return [];
    }

    const data = await resp.json();
    return (data.itemSummaries || []).map(item => normalizeEbayListing(item, partNumber));
  } catch (err) {
    console.error('eBay search error:', err);
    return [];
  }
}

// ─── FinditParts API Search (returns normalized listings) ────────────

async function searchFinditParts({ query, partNumber, limit = 20 }) {
  const apiKey = process.env.FINDITPARTS_API_KEY;
  if (!apiKey) return [];

  const searchQuery = partNumber || query;
  if (!searchQuery) return [];

  try {
    const resp = await fetch(
      `https://api.finditparts.com/v1/parts/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!resp.ok) {
      console.warn('FinditParts search failed:', resp.status);
      return [];
    }

    const data = await resp.json();
    return (data.results || data.parts || data.data || []).map(item =>
      normalizeFinditPartsListing(item, partNumber, searchQuery)
    );
  } catch (err) {
    console.error('FinditParts search error:', err);
    return [];
  }
}

// ─── Ranking: sort listings by trust hierarchy then relevance ────────

function rankListings(listings, partNumber) {
  return [...listings].sort((a, b) => {
    // 1. Source tier (lower = more trusted)
    if (a.sourceTier !== b.sourceTier) return a.sourceTier - b.sourceTier;
    // 2. Exact part number match
    const aExact = partNumber && a.partNumber && a.partNumber.toUpperCase() === partNumber.toUpperCase();
    const bExact = partNumber && b.partNumber && b.partNumber.toUpperCase() === partNumber.toUpperCase();
    if (aExact !== bExact) return aExact ? -1 : 1;
    // 3. Fitment confidence
    const fitOrder = { high: 0, medium: 1, low: 2 };
    const aFit = fitOrder[a.fitmentConfidence] ?? 2;
    const bFit = fitOrder[b.fitmentConfidence] ?? 2;
    if (aFit !== bFit) return aFit - bFit;
    // 4. Availability
    if (a.availability === 'in_stock' && b.availability !== 'in_stock') return -1;
    if (b.availability === 'in_stock' && a.availability !== 'in_stock') return 1;
    // 5. Counterfeit risk (lower = better)
    const riskOrder = { low: 0, medium: 1, high: 2 };
    const aRisk = riskOrder[a.counterfeitRisk] ?? 1;
    const bRisk = riskOrder[b.counterfeitRisk] ?? 1;
    if (aRisk !== bRisk) return aRisk - bRisk;
    // 6. Price ascending as final tiebreaker
    return (a.price || Infinity) - (b.price || Infinity);
  });
}

// ─── Constructed Search URLs ─────────────────────────────────────────

function buildSearchUrls(partNumber, query, make) {
  const searchTermParts = partNumber || query || '';
  const searchTermFull = [partNumber, query].filter(Boolean).join(' ');
  const encoded = encodeURIComponent(searchTermFull);
  const encodedParts = encodeURIComponent(searchTermParts);

  const urls = {
    // Tier 1: OEM / Manufacturer
    freightlinerParts: `https://parts.freightliner.com/search?q=${encodedParts}`,
    peterbiltParts: `https://www.peterbiltparts.com/search?q=${encodedParts}`,
    kenworthParts: `https://www.kenworth.com/parts/?q=${encodedParts}`,
    volvoTrucks: `https://www.volvotrucks.us/parts/?q=${encodedParts}`,
    mackParts: `https://www.macktrucks.com/parts/?q=${encodedParts}`,
    // Tier 2: Authorized / Specialist
    fleetpride: `https://www.fleetpride.com/search?q=${encodedParts}`,
    truckpro: `https://www.truckpro.com/search?q=${encodedParts}`,
    finditparts: `https://www.finditparts.com/search?q=${encodedParts}`,
    // Tier 3: Aftermarket
    rockauto: partNumber
      ? `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(partNumber)}`
      : `https://www.rockauto.com/en/partsearch/?partnum=${encodedParts}`,
    // Tier 4: Marketplace / Broad
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=6028`,
    amazon: `https://www.amazon.com/s?k=${encoded}+truck+parts`,
  };

  // Filter OEM URLs by make — promote matched OEM to first position
  if (make) {
    const makeLower = make.toLowerCase();
    const oemMap = {
      freightliner: 'freightlinerParts',
      peterbilt: 'peterbiltParts',
      kenworth: 'kenworthParts',
      volvo: 'volvoTrucks',
      mack: 'mackParts',
    };
    const matchedKey = Object.entries(oemMap).find(([k]) => makeLower.includes(k))?.[1];
    if (matchedKey && urls[matchedKey]) {
      // Rebuild urls with the matched OEM vendor first, remove others
      const matchedUrl = urls[matchedKey];
      const oemKeys = new Set(Object.values(oemMap));
      const filtered = {};
      filtered[matchedKey] = matchedUrl;
      for (const [k, v] of Object.entries(urls)) {
        if (!oemKeys.has(k)) filtered[k] = v;
      }
      return filtered;
    }
  }

  return urls;
}

// ─── Main Handler ────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS — restricted origins
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

  // JWT auth — verify user is logged in
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
    const { query, partNumber, make, model, year, condition, limit } = req.body || {};

    if (!query && !partNumber) {
      return res.status(400).json({ error: 'Either query or partNumber is required' });
    }

    const searchParams = { query, partNumber, make, model, year, condition, limit };

    // Run all vendor searches in parallel
    const [ebayResults, finditResults] = await Promise.all([
      searchEbay(searchParams).catch(err => {
        console.warn('eBay search failed:', err.message);
        return [];
      }),
      searchFinditParts(searchParams).catch(err => {
        console.warn('FinditParts search failed:', err.message);
        return [];
      }),
    ]);

    // Merge all normalized listings
    const allListings = [...finditResults, ...ebayResults];

    // Rank by trust hierarchy
    const rankedListings = rankListings(allListings, partNumber);

    // Always generate constructed search URLs (zero cost, always available)
    const searchUrls = buildSearchUrls(partNumber, query, make);

    return res.status(200).json({
      listings: rankedListings,
      searchUrls,
      meta: {
        query: query || '',
        partNumber: partNumber || '',
        totalResults: rankedListings.length,
        sources: {
          ebay: ebayResults.length > 0,
          finditparts: finditResults.length > 0,
          fleetpride: false,
          truckpro: false,
        },
      },
    });
  } catch (err) {
    console.error('Parts search handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
