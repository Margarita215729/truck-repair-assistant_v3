/**
 * Local Supply Service — Frontend client for /api/local-supply-search.
 *
 * Finds nearby auto parts stores (NAPA, O'Reilly, AutoZone, etc.)
 * and normalises results into ServiceResult models.
 */

import { createServiceResult } from '../utils/researchModels';
import { getLocalSupplyLinks } from '../utils/queryBuilder';
import { supabase } from '../api/supabaseClient';

const SEARCH_TIMEOUT = 6000; // 6 seconds

/**
 * Search for nearby auto parts stores.
 *
 * @param {Object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {string} [params.partName]
 * @param {string} [params.partNumber]
 * @param {number} [params.radius=25000] — metres
 * @returns {Promise<{ stores: ServiceResult[], storeLocators: Object[], error?: string }>}
 */
export async function searchLocalSupplyStores({ lat, lng, partName, partNumber, radius = 25000 }) {
  const storeLocators = getLocalSupplyLinks();

  if (!lat || !lng) {
    return { stores: [], storeLocators, error: 'Location required' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

    const response = await fetch('/api/local-supply-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ lat, lng, partName, partNumber, radius }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn('local-supply-search HTTP error:', response.status);
      return { stores: [], storeLocators, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return { stores: [], storeLocators, error: data.error };
    }

    const stores = (data.stores || []).map(raw =>
      createServiceResult({
        name: raw.name,
        address: raw.address,
        phone: raw.phone,
        lat: raw.lat,
        lng: raw.lng,
        rating: raw.rating,
        reviewCount: raw.reviewCount,
        openNow: raw.openNow,
        url: raw.website,
        placeId: raw.placeId,
        distance: raw.distance,
        sourceClass: 'local_store_network',
      }, 'parts_store'),
    );

    return { stores, storeLocators, error: null };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('Local supply search timed out');
      return { stores: [], storeLocators, error: 'Timeout' };
    }
    console.warn('Local supply search failed:', err.message);
    return { stores: [], storeLocators, error: err.message };
  }
}
