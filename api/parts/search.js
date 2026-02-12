/**
 * Vercel Serverless Function — Parts Vendor Search
 * Aggregates live pricing from eBay Browse API, FinditParts API,
 * and generates constructed search URLs for RockAuto, Amazon, Google Shopping.
 *
 * POST /api/parts/search
 * Body: { query, partNumber, make, model, year, condition, limit }
 * Returns: { ebay: VendorListing[], finditparts: VendorListing[], searchUrls: {...} }
 */

// ─── eBay OAuth Token Cache ──────────────────────────────────────────

let ebayTokenCache = { token: null, expiresAt: 0 };

async function getEbayAccessToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Return cached token if still valid (with 5-min buffer)
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

// ─── eBay Browse API Search ──────────────────────────────────────────

async function searchEbay({ query, partNumber, make, model, year, condition, limit = 20 }) {
  const token = await getEbayAccessToken();
  if (!token) return [];

  // Build search query — prefer part number, fall back to textual query
  const searchTerms = partNumber
    ? `${partNumber} ${query || ''}`.trim()
    : `${query || ''} truck`.trim();

  if (!searchTerms) return [];

  const params = new URLSearchParams({
    q: searchTerms,
    category_ids: '6028', // Truck Parts & Accessories
    limit: String(Math.min(limit, 50)),
    sort: 'price',
  });

  // Condition filter
  if (condition && condition !== 'all') {
    const conditionMap = {
      new: 'NEW',
      used: 'USED',
      refurbished: 'REFURBISHED',
    };
    if (conditionMap[condition]) {
      params.append('filter', `conditions:{${conditionMap[condition]}}`);
    }
  }

  // Compatibility filter for make/model/year
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
    return (data.itemSummaries || []).map(item => ({
      vendor: 'eBay',
      title: item.title,
      partNumber: partNumber || '',
      price: parseFloat(item.price?.value) || 0,
      currency: item.price?.currency || 'USD',
      condition: item.condition || 'Unknown',
      imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '',
      itemUrl: item.itemWebUrl || item.itemHref || '',
      shipping: item.shippingOptions?.[0]?.shippingCost?.value
        ? `$${item.shippingOptions[0].shippingCost.value}`
        : 'See listing',
      location: item.itemLocation?.postalCode || item.itemLocation?.country || '',
      sellerName: item.seller?.username || '',
      sellerRating: item.seller?.feedbackPercentage
        ? `${item.seller.feedbackPercentage}%`
        : '',
      listingType: item.buyingOptions?.includes('FIXED_PRICE') ? 'Buy It Now' : 'Auction',
    }));
  } catch (err) {
    console.error('eBay search error:', err);
    return [];
  }
}

// ─── FinditParts API Search ──────────────────────────────────────────

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
    return (data.results || data.parts || data.data || []).map(item => ({
      vendor: 'FinditParts',
      title: item.name || item.description || item.title || '',
      partNumber: item.part_number || item.partNumber || partNumber || '',
      price: parseFloat(item.price || item.retail_price || 0),
      currency: 'USD',
      condition: item.condition || 'New',
      imageUrl: item.image_url || item.imageUrl || item.image || '',
      itemUrl: item.url || item.product_url || `https://www.finditparts.com/search?q=${encodeURIComponent(searchQuery)}`,
      shipping: item.shipping || 'See listing',
      location: '',
      sellerName: 'FinditParts',
      sellerRating: '',
      listingType: 'Buy Now',
      brand: item.brand || item.manufacturer || '',
      inStock: item.in_stock ?? item.available ?? null,
    }));
  } catch (err) {
    console.error('FinditParts search error:', err);
    return [];
  }
}

// ─── Constructed Search URLs ─────────────────────────────────────────

function buildSearchUrls(partNumber, query) {
  const searchTermParts = partNumber || query || '';
  const searchTermFull = [partNumber, query].filter(Boolean).join(' ');
  const encoded = encodeURIComponent(searchTermFull);
  const encodedParts = encodeURIComponent(searchTermParts);

  return {
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=6028`,
    rockauto: partNumber
      ? `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(partNumber)}`
      : `https://www.rockauto.com/en/partsearch/?partnum=${encodedParts}`,
    amazon: `https://www.amazon.com/s?k=${encoded}+truck+parts`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    finditparts: `https://www.finditparts.com/search?q=${encodedParts}`,
    fleetpride: `https://www.fleetpride.com/search?q=${encodedParts}`,
    truckpro: `https://www.truckpro.com/search?q=${encodedParts}`,
  };
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

    // Run eBay and FinditParts searches in parallel
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

    // Always generate constructed search URLs (zero cost, always available)
    const searchUrls = buildSearchUrls(partNumber, query);

    return res.status(200).json({
      ebay: ebayResults,
      finditparts: finditResults,
      searchUrls,
      meta: {
        query: query || '',
        partNumber: partNumber || '',
        totalResults: ebayResults.length + finditResults.length,
        sources: {
          ebay: ebayResults.length > 0,
          finditparts: finditResults.length > 0,
        },
      },
    });
  } catch (err) {
    console.error('Parts search handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
