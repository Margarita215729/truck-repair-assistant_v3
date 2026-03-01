/**
 * Vendor Service — Client-side
 * Calls the /api/parts/search serverless function for live vendor pricing.
 * Also provides client-side constructed search URLs as fallback.
 * Includes AI-powered search when APIs are unavailable.
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';
import { invokeLLM } from './aiService';

const API_BASE = '/api/parts/search';

// ─── Constructed search URLs (client-side fallback, always available) ─

export function getSearchUrls(partNumber, partName) {
  const searchTerm = partNumber || partName || '';
  const fullTerm = [partNumber, partName].filter(Boolean).join(' ');
  const encoded = encodeURIComponent(fullTerm);
  const encodedPart = encodeURIComponent(searchTerm);

  return {
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    fleetpride: `https://www.fleetpride.com/search?q=${encodedPart}`,
    truckpro: `https://www.truckpro.com/search?q=${encodedPart}`,
    freightlinerParts: `https://parts.freightliner.com/search?q=${encodedPart}`,
    peterbiltParts: `https://www.peterbiltparts.com/search?q=${encodedPart}`,
    kenworthParts: `https://www.kenworth.com/parts/?q=${encodedPart}`,
    volvoTrucks: `https://www.volvotrucks.us/parts/?q=${encodedPart}`,
    mackParts: `https://www.macktrucks.com/parts/?q=${encodedPart}`,
  };
}

// Vendor display info
export const VENDOR_INFO = {
  googleShopping: { name: 'Google Shopping', icon: '🔍', color: 'text-white', bgColor: 'bg-white/10' },
  fleetpride: { name: 'FleetPride', icon: '🏪', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  truckpro: { name: 'TruckPro', icon: '🔩', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  freightlinerParts: { name: 'Freightliner Parts', icon: '🚛', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  peterbiltParts: { name: 'Peterbilt Parts', icon: '🚛', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  kenworthParts: { name: 'Kenworth Parts', icon: '🚛', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  volvoTrucks: { name: 'Volvo Trucks', icon: '🚛', color: 'text-blue-300', bgColor: 'bg-blue-500/10' },
  mackParts: { name: 'Mack Parts', icon: '🚛', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
};

// ─── Server-side vendor search via API route ─────────────────────────

/**
 * Search vendors for parts through the serverless API function.
 * Returns live prices from vendor APIs + constructed search URLs.
 *
 * @param {string} query - Part name or description
 * @param {Object} options - { partNumber, make, model, year, condition, limit }
 * @returns {{ fleetpride: VendorListing[], truckpro: VendorListing[], searchUrls: Object, meta: Object }}
 */
export async function searchVendors(query, options = {}) {
  try {
    // Get JWT for auth (optional — the endpoint doesn't require it but we include it)
    let headers = { 'Content-Type': 'application/json' };
    if (hasSupabaseConfig && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: query || '',
        partNumber: options.partNumber || '',
        make: options.make || '',
        model: options.model || '',
        year: options.year || '',
        condition: options.condition || 'all',
        limit: options.limit || 20,
      }),
    });

    if (!resp.ok) {
      console.warn('Vendor search API error:', resp.status);
      // Graceful fallback: return search URLs only
      return {
        fleetpride: [],
        truckpro: [],
        searchUrls: getSearchUrls(options.partNumber, query),
        meta: { query, partNumber: options.partNumber || '', totalResults: 0, sources: {} },
      };
    }

    return await resp.json();
  } catch (err) {
    console.warn('Vendor search failed:', err.message);
    return {
      fleetpride: [],
      truckpro: [],
      searchUrls: getSearchUrls(options.partNumber, query),
      meta: { query, partNumber: options.partNumber || '', totalResults: 0, sources: {} },
    };
  }
}

/**
 * Search vendors for a specific AI-suggested part.
 * Builds optimized query from part metadata + truck context.
 *
 * @param {Object} part - AI part recommendation (from DB or inline AI response)
 * @returns {Promise<Object>} Vendor search results
 */
export async function searchVendorsForPart(part) {
  return searchVendors(part.name, {
    partNumber: part.oem_part_number || part.part_number || '',
    make: part.truck_context?.make || (part.compatible_makes?.[0]) || '',
    model: part.truck_context?.model || '',
    year: part.truck_context?.year || '',
  });
}

/**
 * Aggregate all vendor listings into a single sorted array.
 */
export function aggregateListings(vendorResults) {
  const all = [
    ...(vendorResults?.fleetpride || []),
    ...(vendorResults?.truckpro || []),
  ];
  // Sort by price ascending
  return all.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
}

/**
 * AI-powered parts search — uses LLM when vendor APIs return no results.
 * Returns both online and offline (local store) purchase options.
 *
 * @param {string} query - Part name/description
 * @param {Object} options - { make, model, year }
 * @returns {Promise<{ results: AIPart[], searchUrls: Object }>}
 */
export async function aiSearchParts(query, options = {}) {
  try {
    const truckCtx = [options.year, options.make, options.model].filter(Boolean).join(' ');
    const response = await invokeLLM({
      prompt: `Find truck parts matching: "${query}"${truckCtx ? ` for a ${truckCtx}` : ''}.

For EACH part, provide:
- Common OEM and aftermarket part numbers
- Brands that make this part (Dorman, ACDelco, Gates, Motorcraft, etc.)
- Approximate price range (do NOT invent exact prices)
- Where to look: online (FleetPride, TruckPro, dealer parts websites) and offline (NAPA, TravelCenters of America, Pilot/Flying J)

CRITICAL RULES:
- Do NOT generate specific URLs — just store names.
- Price ranges should be approximate (e.g. "$45-$90").
- For inStock/availability, say "Check retailer" — do NOT guess.

Return 5-8 results.`,
      response_json_schema: {
        type: 'object',
        properties: {
          parts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                partNumber: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                priceRange: { type: 'string' },
                priceMin: { type: 'number' },
                priceMax: { type: 'number' },
                condition: { type: 'string' },
                brand: { type: 'string' },
                compatibility: { type: 'string' },
                onlineStores: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      estimatedPrice: { type: 'string', description: 'Approximate range, e.g. $45-$90' },
                      availability: { type: 'string', description: 'Check retailer' }
                    }
                  }
                },
                offlineStores: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      availability: { type: 'string' },
                      notes: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      add_context_from_internet: true,
    });

    const parts = (response?.parts || []).map((p, idx) => ({
      vendor: 'AI Search',
      title: p.title || query,
      partNumber: p.partNumber || '',
      price: p.priceMin || 0,
      priceMax: p.priceMax || 0,
      priceRange: p.priceRange || '',
      currency: 'USD',
      condition: p.condition || 'New/Used',
      imageUrl: '',
      itemUrl: '',
      shipping: 'Varies',
      location: '',
      sellerName: '',
      sellerRating: '',
      listingType: 'AI Suggestion',
      brand: p.brand || '',
      description: p.description || '',
      compatibility: p.compatibility || '',
      onlineStores: p.onlineStores || [],
      offlineStores: p.offlineStores || [],
      _isAI: true,
      _id: `ai-${idx}`,
    }));

    return {
      results: parts,
      searchUrls: getSearchUrls(parts[0]?.partNumber, query),
    };
  } catch (err) {
    console.warn('AI parts search failed:', err);
    return { results: [], searchUrls: getSearchUrls('', query) };
  }
}

/**
 * React Query key factories for vendor searches.
 */
export const vendorKeys = {
  search: (query, options) => ['vendor-search', query, options],
  aiSearch: (query, options) => ['ai-parts-search', query, options],
  part: (partId) => ['vendor-part', partId],
};

export default {
  searchVendors,
  searchVendorsForPart,
  aiSearchParts,
  getSearchUrls,
  aggregateListings,
  VENDOR_INFO,
  vendorKeys,
};
