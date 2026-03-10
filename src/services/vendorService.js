/**
 * Vendor Service — Client-side
 * Calls the /api/parts/search serverless function for live vendor pricing.
 * Returns a unified listings[] array with normalized VendorListing objects.
 * Also provides client-side constructed search URLs as fallback.
 */
import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

const API_BASE = '/api/parts/search';

// ─── Source tier labels (matches backend SOURCE_TIERS) ───────────────

export const SOURCE_TIER_LABELS = {
  1: 'OEM / Manufacturer',
  2: 'Authorized Dealer / Specialist',
  3: 'Aftermarket Vendor',
  4: 'Marketplace / Search',
};

// ─── Constructed search URLs (client-side fallback, always available) ─

export function getSearchUrls(partNumber, partName, make) {
  const searchTerm = partNumber || partName || '';
  const fullTerm = [partNumber, partName].filter(Boolean).join(' ');
  const encoded = encodeURIComponent(fullTerm);
  const encodedPart = encodeURIComponent(searchTerm);

  return {
    // Tier 1: OEM / Manufacturer
    freightlinerParts: `https://parts.freightliner.com/search?q=${encodedPart}`,
    peterbiltParts: `https://www.peterbiltparts.com/search?q=${encodedPart}`,
    kenworthParts: `https://www.kenworth.com/parts/?q=${encodedPart}`,
    volvoTrucks: `https://www.volvotrucks.us/parts/?q=${encodedPart}`,
    mackParts: `https://www.macktrucks.com/parts/?q=${encodedPart}`,
    // Tier 2: Authorized / Specialist
    fleetpride: `https://www.fleetpride.com/search?q=${encodedPart}`,
    truckpro: `https://www.truckpro.com/search?q=${encodedPart}`,
    finditparts: `https://www.finditparts.com/search?q=${encodedPart}`,
    // Tier 3: Aftermarket
    rockauto: partNumber
      ? `https://www.rockauto.com/en/partsearch/?partnum=${encodeURIComponent(partNumber)}`
      : `https://www.rockauto.com/en/partsearch/?partnum=${encodedPart}`,
    // Tier 4: Marketplace
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=6028`,
    amazon: `https://www.amazon.com/s?k=${encoded}+truck+parts`,
  };
}

// Vendor display info — keyed by sourceKey or search URL key
export const VENDOR_INFO = {
  // Tier 1: OEM / Manufacturer
  freightlinerParts: { name: 'Freightliner Parts', icon: '🚛', color: 'text-blue-400', bgColor: 'bg-blue-500/10', tier: 1 },
  peterbiltParts: { name: 'Peterbilt Parts', icon: '🚛', color: 'text-red-400', bgColor: 'bg-red-500/10', tier: 1 },
  kenworthParts: { name: 'Kenworth Parts', icon: '🚛', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', tier: 1 },
  volvoTrucks: { name: 'Volvo Trucks', icon: '🚛', color: 'text-blue-300', bgColor: 'bg-blue-500/10', tier: 1 },
  mackParts: { name: 'Mack Parts', icon: '🚛', color: 'text-amber-400', bgColor: 'bg-amber-500/10', tier: 1 },
  // Tier 2: Authorized / Specialist
  fleetpride: { name: 'FleetPride', icon: '🏪', color: 'text-purple-400', bgColor: 'bg-purple-500/10', tier: 2 },
  truckpro: { name: 'TruckPro', icon: '🔩', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', tier: 2 },
  finditparts: { name: 'FinditParts', icon: '🔧', color: 'text-green-400', bgColor: 'bg-green-500/10', tier: 2 },
  // Tier 3: Aftermarket
  rockauto: { name: 'RockAuto', icon: '🔩', color: 'text-orange-400', bgColor: 'bg-orange-500/10', tier: 3 },
  // Tier 4: Marketplace
  ebay: { name: 'eBay', icon: '🛒', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', tier: 4 },
  amazon: { name: 'Amazon', icon: '📦', color: 'text-orange-300', bgColor: 'bg-orange-500/10', tier: 4 },
  googleShopping: { name: 'Google Shopping', icon: '🔍', color: 'text-white', bgColor: 'bg-white/10', tier: 4 },
};

// ─── Server-side vendor search via API route ─────────────────────────

/**
 * Search vendors for parts through the serverless API function.
 * Returns unified listings from vendor APIs + constructed search URLs.
 *
 * @param {string} query - Part name or description
 * @param {Object} options - { partNumber, make, model, year, condition, limit }
 * @returns {{ listings: VendorListing[], searchUrls: Object, meta: Object }}
 */
export async function searchVendors(query, options = {}) {
  try {
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
      return {
        listings: [],
        searchUrls: getSearchUrls(options.partNumber, query, options.make),
        meta: { query, partNumber: options.partNumber || '', totalResults: 0, sources: {} },
      };
    }

    return await resp.json();
  } catch (err) {
    console.warn('Vendor search failed:', err.message);
    return {
      listings: [],
      searchUrls: getSearchUrls(options.partNumber, query, options.make),
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
 * Backend already returns unified listings[], this is a compatibility shim
 * that works with both old and new response shapes.
 */
export function aggregateListings(vendorResults) {
  // New shape: unified listings array
  if (vendorResults?.listings) {
    return [...vendorResults.listings];
  }
  // Legacy fallback (should not happen after migration)
  const all = [
    ...(vendorResults?.fleetpride || []),
    ...(vendorResults?.truckpro || []),
    ...(vendorResults?.ebay || []),
    ...(vendorResults?.finditparts || []),
  ];
  return all.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
}

/**
 * Group listings by source tier for tiered display.
 */
export function groupByTier(listings) {
  const grouped = { 1: [], 2: [], 3: [], 4: [] };
  for (const listing of listings) {
    const tier = listing.sourceTier || 4;
    if (!grouped[tier]) grouped[tier] = [];
    grouped[tier].push(listing);
  }
  return grouped;
}

/**
 * Filter listings by source type.
 */
export function filterBySourceType(listings, sourceType) {
  if (!sourceType || sourceType === 'all') return listings;
  return listings.filter(l => l.sourceType === sourceType);
}

/**
 * Check if vendor results have any live listings.
 */
export function hasListings(vendorResults) {
  return vendorResults?.listings?.length > 0;
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
  groupByTier,
  filterBySourceType,
  hasListings,
  VENDOR_INFO,
  SOURCE_TIER_LABELS,
  vendorKeys,
};
