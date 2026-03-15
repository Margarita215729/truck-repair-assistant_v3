/**
 * Vendor Service — Client-side
 * Calls the /api/parts/search serverless function for live vendor pricing.
 * Returns a unified listings[] array with normalized VendorListing objects.
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

// ─── Server-side vendor search via API route ─────────────────────────

/**
 * Search vendors for parts through the serverless API function.
 * Returns unified listings from the AI-powered search pipeline.
 *
 * @param {string} query - Part name or description
 * @param {Object} options - { partNumber, vinLast6, make, model, year, condition, limit }
 * @returns {{ listings: VendorListing[], meta: Object }}
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
        vinLast6: options.vinLast6 || '',
        make: options.make || '',
        model: options.model || '',
        year: options.year || '',
        condition: options.condition || 'all',
        limit: options.limit || 20,
      }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const message = body?.meta?.error || body?.error || `Vendor search failed (HTTP ${resp.status})`;
      throw new Error(message);
    }

    return await resp.json();
  } catch (err) {
    throw err;
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
  return all.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
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

// ─── Vendor display info ─────────────────────────────────────────────

export const VENDOR_INFO = {
  fleetpride:  { name: 'FleetPride',  icon: '🏭' },
  finditparts: { name: 'FinditParts', icon: '🔍' },
  rockauto:    { name: 'RockAuto',    icon: '🔧' },
  ebay:        { name: 'eBay',        icon: '🛒' },
};

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
  aggregateListings,
  groupByTier,
  filterBySourceType,
  hasListings,
  VENDOR_INFO,
  SOURCE_TIER_LABELS,
  vendorKeys,
};
