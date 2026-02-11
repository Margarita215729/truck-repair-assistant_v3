/**
 * Vendor Service — Client-side
 * Calls the /api/parts/search serverless function for live vendor pricing.
 * Also provides client-side constructed search URLs as fallback.
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const API_BASE = '/api/parts/search';

// ─── Constructed search URLs (client-side fallback, always available) ─

export function getSearchUrls(partNumber, partName) {
  const searchTerm = partNumber || partName || '';
  const fullTerm = [partNumber, partName].filter(Boolean).join(' ');
  const encoded = encodeURIComponent(fullTerm);
  const encodedPart = encodeURIComponent(searchTerm);

  return {
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=6028`,
    rockauto: partNumber
      ? `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(partNumber)}`
      : `https://www.rockauto.com/en/partsearch/?partnum=${encodedPart}`,
    amazon: `https://www.amazon.com/s?k=${encoded}+truck+parts`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    finditparts: `https://www.finditparts.com/search?q=${encodedPart}`,
    fleetpride: `https://www.fleetpride.com/search?q=${encodedPart}`,
    truckpro: `https://www.truckpro.com/search?q=${encodedPart}`,
  };
}

// Vendor display info
export const VENDOR_INFO = {
  ebay: { name: 'eBay Motors', icon: '🛒', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  rockauto: { name: 'RockAuto', icon: '🔧', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  amazon: { name: 'Amazon', icon: '📦', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  googleShopping: { name: 'Google Shopping', icon: '🔍', color: 'text-white', bgColor: 'bg-white/10' },
  finditparts: { name: 'FinditParts', icon: '🚛', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  fleetpride: { name: 'FleetPride', icon: '🏪', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  truckpro: { name: 'TruckPro', icon: '🔩', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
};

// ─── Server-side vendor search via API route ─────────────────────────

/**
 * Search vendors for parts through the serverless API function.
 * Returns live prices from eBay + FinditParts + constructed URLs.
 *
 * @param {string} query - Part name or description
 * @param {Object} options - { partNumber, make, model, year, condition, limit }
 * @returns {{ ebay: VendorListing[], finditparts: VendorListing[], searchUrls: Object, meta: Object }}
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
        ebay: [],
        finditparts: [],
        searchUrls: getSearchUrls(options.partNumber, query),
        meta: { query, partNumber: options.partNumber || '', totalResults: 0, sources: {} },
      };
    }

    return await resp.json();
  } catch (err) {
    console.warn('Vendor search failed:', err.message);
    return {
      ebay: [],
      finditparts: [],
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
    ...(vendorResults?.ebay || []),
    ...(vendorResults?.finditparts || []),
  ];
  // Sort by price ascending
  return all.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
}

/**
 * React Query key factories for vendor searches.
 */
export const vendorKeys = {
  search: (query, options) => ['vendor-search', query, options],
  part: (partId) => ['vendor-part', partId],
};

export default {
  searchVendors,
  searchVendorsForPart,
  getSearchUrls,
  aggregateListings,
  VENDOR_INFO,
  vendorKeys,
};
